import type { ChatContext, ChatMessage, ChatProvider, ChatReply, ChatSendOptions } from './adapter'
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

/**
 * Gemini-modeller: hårdkodade namn ruttnar (Google stänger äldre modeller
 * för nya nycklar — "no longer available to new users"). Därför frågar vi
 * ListModels-API:et vilka modeller NYCKELN faktiskt har och väljer bästa
 * flash-modellen dynamiskt. Kända namn ligger kvar som sista utväg.
 */
const GEMINI_FALLBACK_IDS = ['gemini-3.5-flash', 'gemini-3-flash', 'gemini-2.5-flash']
let workingGeminiModel: string | null = null

export interface GeminiModelInfo {
  id: string
  version: number
  tts: boolean
}

let modelListCache: { key: string; models: GeminiModelInfo[] } | null = null

/** Modeller som nyckeln har tillgång till (cachas per nyckel). */
export async function listGeminiModels(apiKey: string): Promise<GeminiModelInfo[]> {
  if (modelListCache?.key === apiKey) return modelListCache.models
  const res = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000&key=${encodeURIComponent(apiKey)}`,
    { method: 'GET' },
  )
  if (!res.ok) throw new ChatError(statusToKind(res.status), `Gemini ListModels ${res.status}: ${await errorDetail(res)}`)
  const data = (await res.json()) as { models?: { name?: string; supportedGenerationMethods?: string[] }[] }
  const models = (data.models ?? [])
    .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
    .map((m) => {
      const id = (m.name ?? '').replace(/^models\//, '')
      return {
        id,
        version: Number(/gemini-(\d+(?:\.\d+)?)/.exec(id)?.[1] ?? 0),
        tts: /tts/.test(id),
      }
    })
    .filter((m) => m.version > 0)
  modelListCache = { key: apiKey, models }
  return models
}

/** Klassificeringsmodell: snabbaste lite-varianten om nyckeln har en. */
export function pickClassifyModel(models: GeminiModelInfo[]): string | null {
  const lites = models
    .filter((m) => !m.tts && /flash/.test(m.id) && /lite/.test(m.id) && !/image|live|audio|embed/.test(m.id))
    .sort((a, b) => b.version - a.version || a.id.length - b.id.length)
  return lites[0]?.id ?? null
}

/**
 * Bästa chattkandidaterna för Pi: SNABBAST FÖRST. Pis svar är korta
 * (≤60 ord) och hårt styrda av systemprompten — flash-lite räcker gott
 * och svarar mycket snabbare än fullstora flash (som från 3.5 är en
 * stor "frontier"-modell). Inom samma generation: lite före standard.
 */
export function pickChatModels(models: GeminiModelInfo[]): string[] {
  const score = (m: GeminiModelInfo): number =>
    m.version * 100 +
    (/lite/.test(m.id) ? 25 : 0) - // lite = byggd för låg latens
    (/preview|exp/.test(m.id) ? 10 : 0) -
    m.id.length * 0.01
  const ids = models
    .filter((m) => !m.tts && /flash/.test(m.id) && !/image|live|audio|embed/.test(m.id))
    .sort((a, b) => score(b) - score(a))
    .map((m) => m.id)
  for (const known of GEMINI_FALLBACK_IDS) if (!ids.includes(known)) ids.push(known)
  return ids.slice(0, 4)
}

/** Rätt generationConfig per modellgeneration (API:t bröts mellan 2.5 → 3 → 3.5). */
function geminiConfigFor(id: string): Record<string, unknown> {
  const v = Number(/gemini-(\d+(?:\.\d+)?)/.exec(id)?.[1] ?? 0)
  if (v >= 3.5) return { maxOutputTokens: 400, thinkingConfig: { thinkingLevel: 'MINIMAL' } }
  if (v >= 3) return { maxOutputTokens: 800, thinkingConfig: { thinkingLevel: 'LOW' } }
  return { maxOutputTokens: 400, temperature: 0.6, thinkingConfig: { thinkingBudget: 0 } }
}

export const lastGeminiModelUsed = (): string | null => workingGeminiModel

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

async function geminiAttempt(
  apiKey: string,
  modelId: string,
  config: Record<string, unknown>,
  system: string | null,
  contents: unknown[],
  onDelta?: (chunk: string) => void,
): Promise<string> {
  const body = {
    ...(system ? { system_instruction: { parts: [{ text: system }] } } : {}),
    contents,
    generationConfig: config,
  }
  const payload = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }

  if (onDelta) {
    try {
      // Streaming: barnet ser orden medan de skrivs — upplevd latens < 1 s.
      const res = await fetchWithTimeout(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`,
        payload,
      )
      if (!res.ok) throw new ChatError(statusToKind(res.status), `${modelId} ${res.status}: ${await errorDetail(res)}`)
      if (!res.body) throw new ChatError('natverk', `${modelId}: ingen ström`)
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      let full = ''
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        let sep: number
        while ((sep = buf.indexOf('\n\n')) !== -1) {
          const event = buf.slice(0, sep)
          buf = buf.slice(sep + 2)
          for (const line of event.split('\n')) {
            if (!line.startsWith('data:')) continue
            const json = line.slice(5).trim()
            if (!json || json === '[DONE]') continue
            try {
              const data = JSON.parse(json) as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
              const chunk = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
              if (chunk) {
                full += chunk
                onDelta(chunk)
              }
            } catch { /* halv rad — vänta på mer */ }
          }
        }
      }
      if (!full.trim()) throw new ChatError('natverk', `${modelId}: tomt streamsvar`)
      return full.trim()
    } catch (err) {
      // Hemskärmsappen på iPad/Safari saknar ibland fetch-strömning (res.body
      // är null, eller strömmen bryts) — då kastas ett 'natverk'-fel trots att
      // nyckeln fungerar. Föräldralägets test lyckas för att det aldrig strömmar.
      // Fall därför tillbaka till ETT vanligt anrop nedan (samma som testet) och
      // leverera hela svaret på en gång. Äkta nyckel-/kvotfel ska INTE sväljas.
      if (err instanceof ChatError && err.kind !== 'natverk') throw err
    }
  }

  const res = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${encodeURIComponent(apiKey)}`,
    payload,
  )
  if (!res.ok) throw new ChatError(statusToKind(res.status), `${modelId} ${res.status}: ${await errorDetail(res)}`)
  const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('').trim()
  if (!text) throw new ChatError('natverk', `${modelId}: tomt svar`)
  onDelta?.(text) // ström saknades → leverera hela svaret till (den grindade) strömmen
  return text
}

interface GenerateOpts {
  /** Litet svarstak (t.ex. ämnesfiltrets JA/NEJ) — snabbare och billigare. */
  maxTokens?: number
  /** Föredra en lite-modell (snabbast) — används av ämnesfiltret. */
  preferLite?: boolean
  /** Strömma svaret bit för bit (Gemini) — första orden inom en sekund. */
  onDelta?: (chunk: string) => void
}

async function geminiGenerate(apiKey: string, system: string | null, turns: { role: 'user' | 'model'; text: string; imagePng?: string }[], opts: GenerateOpts = {}): Promise<string> {
  const contents = turns.map((t) => ({
    role: t.role,
    parts: [
      { text: t.text },
      ...(t.imagePng ? [{ inline_data: { mime_type: 'image/png', data: dataUrlToBase64(t.imagePng) } }] : []),
    ],
  }))

  // Kandidater från nyckelns egen modellista; kända namn som sista utväg.
  let candidates: string[]
  let liteModel: string | null = null
  try {
    const models = await listGeminiModels(apiKey)
    candidates = pickChatModels(models)
    liteModel = pickClassifyModel(models)
  } catch (err) {
    if (err instanceof ChatError && err.kind === 'nyckel') throw err
    candidates = [...GEMINI_FALLBACK_IDS]
  }
  if (workingGeminiModel && candidates.includes(workingGeminiModel)) {
    candidates = [workingGeminiModel, ...candidates.filter((c) => c !== workingGeminiModel)]
  }
  if (opts.preferLite && liteModel) {
    candidates = [liteModel, ...candidates.filter((c) => c !== liteModel)]
  }

  const attempts: string[] = []
  let worstKind: ChatError['kind'] = 'natverk'
  for (const modelId of candidates) {
    const config = { ...geminiConfigFor(modelId), ...(opts.maxTokens ? { maxOutputTokens: opts.maxTokens } : {}) }
    try {
      const text = await geminiAttempt(apiKey, modelId, config, system, contents, opts.onDelta)
      if (!opts.preferLite) workingGeminiModel = modelId
      return text
    } catch (err) {
      const chatErr = err instanceof ChatError ? err : new ChatError('natverk', String(err))
      // Ogiltig nyckel drabbar alla modeller lika — avbryt direkt.
      if (/API key not valid/i.test(chatErr.message)) throw chatErr
      // 400 kan vara en avvisad thinking-parameter på just den här
      // modellgenerationen — prova en gång till med neutral config.
      if (chatErr.kind === 'nyckel') {
        try {
          const text = await geminiAttempt(apiKey, modelId, { maxOutputTokens: 2048 }, system, contents, opts.onDelta)
          workingGeminiModel = modelId
          return text
        } catch (retryErr) {
          const retryChatErr = retryErr instanceof ChatError ? retryErr : new ChatError('natverk', String(retryErr))
          attempts.push(retryChatErr.message)
          worstKind = retryChatErr.kind
          continue
        }
      }
      attempts.push(chatErr.message)
      worstKind = chatErr.kind
    }
  }
  throw new ChatError(worstKind, attempts.join(' | '))
}

/* ---------- Claude ---------- */

async function claudeGenerate(apiKey: string, system: string | null, turns: { role: 'user' | 'model'; text: string; imagePng?: string }[], opts: GenerateOpts = {}): Promise<string> {
  const body = {
    model: CLAUDE_MODEL,
    max_tokens: opts.maxTokens ?? 250,
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
    async send(context: ChatContext, history: ChatMessage[], sendOpts?: ChatSendOptions): Promise<ChatReply> {
      const latest = history[history.length - 1]
      if (!latest || latest.role !== 'child') {
        return { text: OFFLINE_LINE, refusedOffTopic: false }
      }
      const turns = history.slice(-MAX_HISTORY).map((m) => ({
        role: m.role === 'child' ? ('user' as const) : ('model' as const),
        text: m.text,
        imagePng: m.imagePngDataUrl,
      }))
      try {
        // Huvudanropet startar DIREKT och strömmas. Ämnesfiltret körs
        // PARALLELLT och fungerar som GRIND för strömmen: inga ord når
        // skärmen förrän filtret sagt on-topic (latens = max, inte summa).
        const verdictPromise: Promise<'on-topic' | 'off-topic'> = sendOpts?.skipFilter
          ? Promise.resolve('on-topic')
          : generate(apiKey, null, [{ role: 'user', text: buildClassifyPrompt(latest.text) }], { maxTokens: 10, preferLite: true })
              .then(parseClassification)
              .catch(() => 'on-topic' as const) // filterfel: släpp igenom — huvudprompten är själv sträng

        let released = sendOpts?.skipFilter ?? false
        let held = ''
        const gatedDelta = sendOpts?.onDelta
          ? (chunk: string): void => {
              if (released) sendOpts.onDelta!(chunk)
              else held += chunk
            }
          : undefined
        void verdictPromise.then((v) => {
          if (v === 'on-topic' && gatedDelta && sendOpts?.onDelta) {
            released = true
            if (held) {
              sendOpts.onDelta(held)
              held = ''
            }
          }
        })

        const answerPromise = generate(apiKey, buildSystemPrompt(context), turns, { onDelta: gatedDelta })
        const [verdict, answer] = await Promise.all([
          verdictPromise,
          answerPromise.then((v) => ({ ok: true as const, v })).catch((e: unknown) => ({ ok: false as const, e })),
        ])
        if (verdict === 'off-topic') {
          return { text: REFUSAL_LINE, refusedOffTopic: true }
        }
        if (answer.ok) {
          return { text: answer.v, refusedOffTopic: false }
        }
        throw answer.e
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
    const model = provider === 'claude' ? CLAUDE_MODEL : lastGeminiModelUsed() ?? 'gemini'
    return { ok: true, detail: `Svar via ${model}: "${reply.slice(0, 60)}"` }
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : String(err) }
  }
}
