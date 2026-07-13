import type { ChatContext, ChatMessage, ChatProvider, ChatReply } from './adapter'
import {
  KEY_ERROR_LINE, OFFLINE_LINE, QUOTA_LINE, REFUSAL_LINE,
  buildClassifyPrompt, buildSystemPrompt, parseClassification,
} from './prompts'

/* ============================================================
   Leverantörer: Gemini och Claude, direkt från enheten.

   Nyckeln kommer från föräldraläget och bor ENBART i enhetens
   lokala lagring — aldrig i koden, aldrig i repot, aldrig i
   backupfiler (den strippas vid export). Båda API:erna stöder
   CORS-anrop från webbläsare.

   Flödet per meddelande (docs/GUARDRAILS.md, lager 2–3):
   1. Klassificera meddelandet (billigt anrop): on-topic?
   2. Off-topic → fast vänligt svar, loggas som avböjt.
   3. On-topic → huvudanrop med den låsta systemprompten.
   ============================================================ */

const GEMINI_MODEL = 'gemini-2.5-flash'
const CLAUDE_MODEL = 'claude-haiku-4-5-20251001'
const MAX_HISTORY = 12 // meddelanden som skickas med (kostnad + fokus)
const REQUEST_TIMEOUT_MS = 15_000 // barn ska aldrig stirra på "Pi funderar …" i evighet

const dataUrlToBase64 = (dataUrl: string): string => dataUrl.split(',')[1] ?? ''

/** Typat chattfel så olika orsaker kan få olika barnvänliga svar. */
export class ChatError extends Error {
  constructor(
    public kind: 'nyckel' | 'kvot' | 'natverk',
    detail: string,
  ) {
    super(detail)
  }
}

export const statusToKind = (status: number): ChatError['kind'] =>
  status === 400 || status === 401 || status === 403 ? 'nyckel' : status === 429 ? 'kvot' : 'natverk'

/** Barnvänligt svar per felorsak — nyckelfel ska inte låtsas vara nätfel. */
export function errorToLine(err: unknown): string {
  if (err instanceof ChatError) {
    if (err.kind === 'nyckel') return KEY_ERROR_LINE
    if (err.kind === 'kvot') return QUOTA_LINE
  }
  return OFFLINE_LINE
}

/** Läs ut leverantörens felmeddelande ur svarskroppen (för förälderns test). */
async function errorDetail(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: { message?: string } }
    return data.error?.message ?? res.statusText
  } catch {
    return res.statusText
  }
}

/** fetch med hård tidsgräns — hängda anrop blir vänliga offline-svar. */
async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    window.clearTimeout(timer)
  }
}

/* ---------- Gemini ---------- */

async function geminiGenerate(apiKey: string, system: string | null, turns: { role: 'user' | 'model'; text: string; imagePng?: string }[]): Promise<string> {
  const body = {
    ...(system ? { system_instruction: { parts: [{ text: system }] } } : {}),
    contents: turns.map((t) => ({
      role: t.role,
      parts: [
        { text: t.text },
        ...(t.imagePng ? [{ inline_data: { mime_type: 'image/png', data: dataUrlToBase64(t.imagePng) } }] : []),
      ],
    })),
    generationConfig: {
      maxOutputTokens: 400,
      temperature: 0.6,
      // Gemini 2.5 "tänker" internt som standard och tankearbetet räknas
      // mot tokentaket — utan detta blir svaret ofta HELT TOMT (ser ut
      // som nätfel). Pi behöver inte tänka djupt: stäng av.
      thinkingConfig: { thinkingBudget: 0 },
    },
  }
  const res = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
  )
  if (!res.ok) throw new ChatError(statusToKind(res.status), `Gemini ${res.status}: ${await errorDetail(res)}`)
  const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('').trim()
  if (!text) throw new ChatError('natverk', 'Tomt svar från Gemini')
  return text
}

/* ---------- Claude ---------- */

async function claudeGenerate(apiKey: string, system: string | null, turns: { role: 'user' | 'model'; text: string; imagePng?: string }[]): Promise<string> {
  const body = {
    model: CLAUDE_MODEL,
    max_tokens: 250,
    temperature: 0.6,
    ...(system ? { system } : {}),
    messages: turns.map((t) => ({
      role: t.role === 'model' ? 'assistant' : 'user',
      content: t.imagePng
        ? [
            { type: 'image', source: { type: 'base64', media_type: 'image/png', data: dataUrlToBase64(t.imagePng) } },
            { type: 'text', text: t.text },
          ]
        : t.text,
    })),
  }
  const res = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      // Medvetet: direktanrop från enheten — nyckeln är förälderns egen
      // och bor lokalt. Proxy-uppgraderingen beskrivs i docs/GUARDRAILS.md.
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new ChatError(statusToKind(res.status), `Claude ${res.status}: ${await errorDetail(res)}`)
  const data = (await res.json()) as { content?: { type: string; text?: string }[] }
  const text = data.content?.filter((c) => c.type === 'text').map((c) => c.text ?? '').join('').trim()
  if (!text) throw new ChatError('natverk', 'Tomt svar från Claude')
  return text
}

/* ---------- Gemensam provider ovanpå båda ---------- */

type Generate = typeof geminiGenerate

function makeProvider(name: string, generate: Generate, apiKey: string): ChatProvider {
  return {
    name,
    ready: () => apiKey.length > 0,
    async send(context: ChatContext, history: ChatMessage[]): Promise<ChatReply> {
      const latest = history[history.length - 1]
      if (!latest || latest.role !== 'child') {
        return { text: OFFLINE_LINE, refusedOffTopic: false }
      }
      try {
        // Lager 2: ämnesfiltret — eget litet anrop utan historik.
        const verdict = await generate(apiKey, null, [
          { role: 'user', text: buildClassifyPrompt(latest.text) },
        ])
        if (parseClassification(verdict) === 'off-topic') {
          return { text: REFUSAL_LINE, refusedOffTopic: true }
        }
        // Lager 3: huvudanropet med den låsta systemprompten.
        const turns = history.slice(-MAX_HISTORY).map((m) => ({
          role: m.role === 'child' ? ('user' as const) : ('model' as const),
          text: m.text,
          imagePng: m.imagePngDataUrl,
        }))
        const text = await generate(apiKey, buildSystemPrompt(context), turns)
        return { text, refusedOffTopic: false }
      } catch (err) {
        console.warn('Chattfel:', err) // felsökningsspår för föräldern (Safari-konsolen)
        return { text: errorToLine(err), refusedOffTopic: false }
      }
    },
  }
}

export const createGeminiProvider = (apiKey: string): ChatProvider =>
  makeProvider('gemini', geminiGenerate, apiKey)

export const createClaudeProvider = (apiKey: string): ChatProvider =>
  makeProvider('claude', claudeGenerate, apiKey)

/**
 * Förälderns anslutningstest: ett minimalt anrop som visar det RIKTIGA
 * felet (status + leverantörens meddelande) i stället för barnspråk.
 */
export async function pingProvider(provider: 'gemini' | 'claude', apiKey: string): Promise<{ ok: boolean; detail: string }> {
  const generate = provider === 'claude' ? claudeGenerate : geminiGenerate
  try {
    const reply = await generate(apiKey, null, [{ role: 'user', text: 'Svara med exakt ett ord: OK' }])
    return { ok: true, detail: `Svar från ${provider === 'claude' ? 'Claude' : 'Gemini'}: "${reply.slice(0, 60)}"` }
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : String(err) }
  }
}
