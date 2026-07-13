/* ============================================================
   Talsyntes (Web Speech API) med svensk röst.

   Avgörande för de yngsta som inte läser flytande än — varje
   uppgift har en uppläsningsknapp.

   Röstkvaliteten styrs av vad enheten har installerat: iOS
   levererar en komprimerad standardröst (robotig), men en
   "förbättrad" variant kan laddas ner gratis i Inställningar →
   Tillgänglighet → Talat innehåll → Röster → Svenska.
   Appen rankar automatiskt den bästa tillgängliga rösten, och
   föräldraläget har en väljare med provlyssning. Valet sparas
   per enhet (röster skiljer sig mellan enheter).
   ============================================================ */

const VOICE_LS_KEY = 'barnens-plugg-rost'

/** Specialvärde i röstvalet: Geminis moln-TTS (mänsklig kvalitet). */
export const CLOUD_VOICE = 'moln'

let cachedVoices: SpeechSynthesisVoice[] | undefined

// Röstlistan laddas asynkront i vissa webbläsare.
if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoices = undefined
  }
}

/**
 * Kvalitetspoäng: förbättrade/premiumröster högst, kända
 * lågkvalitetsvarianter ("compact", "eloquence") lägst.
 */
function voiceScore(v: SpeechSynthesisVoice): number {
  const name = v.name.toLowerCase()
  let score = 0
  if (/premium|enhanced|förbättrad|natural/.test(name)) score += 100
  if (/siri/.test(name)) score += 80
  if (v.localService) score += 10 // funkar offline
  if (v.lang === 'sv-SE') score += 5
  if (/compact|eloquence/.test(name)) score -= 60
  return score
}

/** Alla svenska röster på enheten, bäst först. */
export function swedishVoices(): SpeechSynthesisVoice[] {
  if (!ttsAvailable()) return []
  if (!cachedVoices) {
    cachedVoices = (window.speechSynthesis.getVoices() ?? [])
      .filter((v) => v.lang.toLowerCase().startsWith('sv'))
      .sort((a, b) => voiceScore(b) - voiceScore(a))
  }
  return cachedVoices
}

/** Förälderns röstval för den här enheten (voiceURI), eller null = auto. */
export function preferredVoiceURI(): string | null {
  try { return localStorage.getItem(VOICE_LS_KEY) } catch { return null }
}

export function setPreferredVoice(voiceURI: string | null): void {
  try {
    if (voiceURI) localStorage.setItem(VOICE_LS_KEY, voiceURI)
    else localStorage.removeItem(VOICE_LS_KEY)
  } catch { /* privat läge */ }
}

function pickVoice(): SpeechSynthesisVoice | null {
  const voices = swedishVoices()
  if (voices.length === 0) return null
  const preferred = preferredVoiceURI()
  if (preferred) {
    const match = voices.find((v) => v.voiceURI === preferred)
    if (match) return match
  }
  return voices[0] // bäst rankade
}

export const ttsAvailable = (): boolean =>
  typeof window !== 'undefined' && 'speechSynthesis' in window

/** Gör matematiska symboler uppläsbara. */
const toSpoken = (text: string): string =>
  text
    .replaceAll('+', ' plus ')
    .replaceAll('−', ' minus ')
    .replaceAll('×', ' gånger ')
    .replaceAll(' / ', ' delat med ')
    .replaceAll('=', ' är lika med ')
    .replaceAll('__', ' vad ')
    .replaceAll('%', ' procent')

/* ============================================================
   Moln-TTS via Gemini — mänsklig röstkvalitet.

   Använder samma API-nyckel som chatten (bor enbart på enheten).
   Genererat ljud cachas i minnet så återkommande fraser inte
   kostar nya anrop. Vid fel/offline: automatiskt tillbaka till
   enhetens lokala röst — uppläsningsknappen fungerar alltid.
   ============================================================ */

// Kandidater hämtas i första hand från nyckelns egen modellista
// (samma skäl som chatten: Google stänger äldre modeller för nya nycklar).
const TTS_FALLBACK_MODELS = ['gemini-2.5-flash-tts', 'gemini-2.5-flash-preview-tts']
let workingTtsModel: string | null = null

async function ttsCandidates(): Promise<string[]> {
  if (workingTtsModel) return [workingTtsModel]
  try {
    const { listGeminiModels } = await import('./chat/providers')
    const models = await listGeminiModels(cloudApiKey!)
    const ids = models
      .filter((m) => m.tts)
      .sort((a, b) => b.version - a.version || a.id.length - b.id.length)
      .map((m) => m.id)
    for (const known of TTS_FALLBACK_MODELS) if (!ids.includes(known)) ids.push(known)
    return ids.slice(0, 3)
  } catch {
    return [...TTS_FALLBACK_MODELS]
  }
}
const TTS_VOICE = 'Leda' // varm, ungdomlig — passar Pi
const TTS_TIMEOUT_MS = 10_000

let cloudApiKey: string | null = null
let audioCtx: AudioContext | null = null
let currentSource: AudioBufferSourceNode | null = null
let speakToken = 0
const audioCache = new Map<string, AudioBuffer>()
const AUDIO_CACHE_MAX = 60

/** Kopplas till hushållets Gemini-nyckel (null = moln-TTS av). */
export function configureCloudTts(geminiApiKey: string | null): void {
  cloudApiKey = geminiApiKey
}

export const cloudTtsAvailable = (): boolean => cloudApiKey !== null

function ensureAudioCtx(): AudioContext | null {
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  if (!audioCtx) audioCtx = new AC()
  if (audioCtx.state === 'suspended') void audioCtx.resume()
  return audioCtx
}

/** Gemini-TTS svarar med rå PCM (16-bit, 24 kHz mono) i base64. */
function pcmToAudioBuffer(ctx: AudioContext, base64: string, sampleRate: number): AudioBuffer {
  const raw = atob(base64)
  const bytes = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  const samples = new Int16Array(bytes.buffer)
  const buffer = ctx.createBuffer(1, samples.length, sampleRate)
  const channel = buffer.getChannelData(0)
  for (let i = 0; i < samples.length; i++) channel[i] = samples[i] / 32768
  return buffer
}

async function fetchCloudAudio(text: string): Promise<AudioBuffer> {
  const ctx = ensureAudioCtx()
  if (!ctx || !cloudApiKey) throw new Error('moln-TTS ej konfigurerad')
  const cached = audioCache.get(text)
  if (cached) return cached

  const models = await ttsCandidates()
  let lastError: Error = new Error('okänt TTS-fel')
  for (const model of models) {
    try {
      const controller = new AbortController()
      const timer = window.setTimeout(() => controller.abort(), TTS_TIMEOUT_MS)
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(cloudApiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text }] }],
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: TTS_VOICE } } },
            },
          }),
        },
      )
      window.clearTimeout(timer)
      if (!res.ok) throw new Error(`TTS ${model}: ${res.status}`)
      const data = (await res.json()) as {
        candidates?: { content?: { parts?: { inlineData?: { mimeType?: string; data?: string } }[] } }[]
      }
      const inline = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData
      if (!inline?.data) throw new Error(`TTS ${model}: tomt ljudsvar`)
      const rate = Number(/rate=(\d+)/.exec(inline.mimeType ?? '')?.[1] ?? 24000)
      const buffer = pcmToAudioBuffer(ctx, inline.data, rate)
      workingTtsModel = model
      if (audioCache.size >= AUDIO_CACHE_MAX) {
        const oldest = audioCache.keys().next().value
        if (oldest !== undefined) audioCache.delete(oldest)
      }
      audioCache.set(text, buffer)
      return buffer
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
    }
  }
  throw lastError
}

function speakLocal(text: string, voiceURI?: string): void {
  if (!ttsAvailable()) return
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'sv-SE'
  const voice =
    voiceURI && voiceURI !== CLOUD_VOICE
      ? swedishVoices().find((v) => v.voiceURI === voiceURI) ?? pickVoice()
      : pickVoice()
  if (voice) utterance.voice = voice
  utterance.rate = 0.92 // något lugnare för barn
  window.speechSynthesis.speak(utterance)
}

/** Läs upp en text på svenska — moln-röst om vald, annars lokal. */
export function speak(text: string, voiceURI?: string): void {
  stopSpeaking()
  const spoken = toSpoken(text)
  const wanted = voiceURI ?? preferredVoiceURI() ?? undefined
  const useCloud = wanted === CLOUD_VOICE && cloudTtsAvailable()

  if (!useCloud) {
    speakLocal(spoken, wanted)
    return
  }
  const token = ++speakToken
  void fetchCloudAudio(spoken)
    .then((buffer) => {
      if (token !== speakToken) return // barnet gick vidare — släng
      const ctx = ensureAudioCtx()
      if (!ctx) return
      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.connect(ctx.destination)
      source.start()
      currentSource = source
    })
    .catch((err) => {
      console.warn('Moln-TTS föll tillbaka till lokal röst:', err)
      if (token === speakToken) speakLocal(spoken)
    })
}

/** Provlyssning i föräldraläget. */
export function speakSample(voiceURI?: string): void {
  speak('Hej! Så här låter jag. Vad är 47 + 25?', voiceURI)
}

export function stopSpeaking(): void {
  speakToken++
  if (ttsAvailable()) window.speechSynthesis.cancel()
  if (currentSource) {
    try { currentSource.stop() } catch { /* redan stoppad */ }
    currentSource = null
  }
}
