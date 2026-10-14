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
  // Cacha ALDRIG en tom lista — iOS fyller på röstlistan sent (ibland
  // först efter att något talat), och en cachad tomma skulle aldrig läka.
  if (!cachedVoices || cachedVoices.length === 0) {
    cachedVoices = (window.speechSynthesis.getVoices() ?? [])
      .filter((v) => v.lang.toLowerCase().startsWith('sv'))
      .sort((a, b) => voiceScore(b) - voiceScore(a))
  }
  return cachedVoices
}

/**
 * Väck iOS röstlista: Safari rapporterar tomt tills något talat.
 * Anropas i en tryckgest (iOS kräver gest för första talet) — en
 * ljudlös mikroyttring som avbryts direkt räcker för att fylla listan.
 */
export function kickVoiceList(): void {
  if (!ttsAvailable()) return
  try {
    const kick = new SpeechSynthesisUtterance('hej')
    kick.volume = 0
    kick.rate = 2
    window.speechSynthesis.speak(kick)
    window.setTimeout(() => window.speechSynthesis.cancel(), 150)
  } catch { /* ofarligt */ }
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
/** Googles gratiskvot för röst är liten. Svarar molnet "för många anrop"
    (429) vilar molnrösten en stund och den lokala rösten läser direkt —
    annars väntade varje filmscen tio sekunder på ett anrop som ändå nekas. */
let cloudPausedUntil = 0
const CLOUD_PAUSE_MS = 5 * 60_000
class QuotaError extends Error {}
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
function base64ToBytes(base64: string): Uint8Array {
  const raw = atob(base64)
  const bytes = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return bytes
}

function rememberAudio(text: string, buffer: AudioBuffer): void {
  if (audioCache.size >= AUDIO_CACHE_MAX) {
    const oldest = audioCache.keys().next().value
    if (oldest !== undefined) audioCache.delete(oldest)
  }
  audioCache.set(text, buffer)
}

function pcmBytesToAudioBuffer(ctx: AudioContext, bytes: Uint8Array, sampleRate: number): AudioBuffer {
  const samples = new Int16Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 2))
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
  const stored = await readStoredAudio(text)
  if (stored) {
    const buffer = pcmBytesToAudioBuffer(ctx, stored.pcm, stored.rate)
    rememberAudio(text, buffer)
    return buffer
  }

  if (Date.now() < cloudPausedUntil) throw new QuotaError('molnrösten vilar (kvot)')
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
      if (res.status === 429) {
        cloudPausedUntil = Date.now() + CLOUD_PAUSE_MS
        throw new QuotaError(`TTS ${model}: kvoten slut`)
      }
      if (!res.ok) throw new Error(`TTS ${model}: ${res.status}`)
      const data = (await res.json()) as {
        candidates?: { content?: { parts?: { inlineData?: { mimeType?: string; data?: string } }[] } }[]
      }
      const inline = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData
      if (!inline?.data) throw new Error(`TTS ${model}: tomt ljudsvar`)
      const rate = Number(/rate=(\d+)/.exec(inline.mimeType ?? '')?.[1] ?? 24000)
      const pcm = base64ToBytes(inline.data)
      const buffer = pcmBytesToAudioBuffer(ctx, pcm, rate)
      workingTtsModel = model
      rememberAudio(text, buffer)
      void storeAudio(text, pcm, rate)
      return buffer
    } catch (err) {
      if (err instanceof QuotaError) throw err
      lastError = err instanceof Error ? err : new Error(String(err))
    }
  }
  throw lastError
}

function speakLocal(text: string, voiceURI?: string, onEnd?: () => void): void {
  if (!ttsAvailable()) { onEnd?.(); return }
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'sv-SE'
  const voice =
    voiceURI && voiceURI !== CLOUD_VOICE
      ? swedishVoices().find((v) => v.voiceURI === voiceURI) ?? pickVoice()
      : pickVoice()
  if (voice) utterance.voice = voice
  utterance.rate = 0.92 // något lugnare för barn
  if (onEnd) {
    utterance.onend = onEnd
    utterance.onerror = onEnd
  }
  window.speechSynthesis.speak(utterance)
}

/**
 * Förvärm molnrösten: hämta ljudet till cachen i bakgrunden redan när
 * uppgiften VISAS, så att uppläsningsknappen spelar direkt vid tryck.
 * (Molnljudet genereras i ett svep — utan förvärmning väntar barnet
 * hela genereringstiden efter knapptrycket.) Gör inget vid lokal röst.
 */
export function prewarmSpeak(text: string): void {
  if (!wantsCloud(preferredVoiceURI() ?? undefined)) return
  const spoken = toSpoken(text)
  if (audioCache.has(spoken)) return
  void fetchCloudAudio(spoken).catch(() => { /* tyst — knappen faller ändå tillbaka till lokal röst */ })
}

/** Molnrösten används när föräldern valt den — och även på "Automatiskt"
    när en Gemini-nyckel finns: bästa tillgängliga rösten ÄR då molnrösten
    (förälderns iakttagelse okt 2026: filmerna lät mekaniska med iPadens
    standardröst). Ett uttryckligt val av en lokal röst respekteras. */
const wantsCloud = (wanted: string | undefined): boolean =>
  cloudTtsAvailable() && (wanted === CLOUD_VOICE || !wanted)

/** Läs upp en text på svenska — moln-röst om vald, annars lokal.
    onEnd anropas när uppläsningen är klar (inte om den avbryts av
    stopSpeaking/ny uppläsning) — filmerna väntar in rösten med den. */
export function speak(text: string, voiceURI?: string, onEnd?: () => void): void {
  stopSpeaking()
  const spoken = toSpoken(text)
  const wanted = voiceURI ?? preferredVoiceURI() ?? undefined
  const token = ++speakToken
  const done = (): void => { if (token === speakToken) onEnd?.() }

  if (!wantsCloud(wanted)) {
    speakLocal(spoken, wanted, done)
    return
  }
  void fetchCloudAudio(spoken)
    .then((buffer) => {
      if (token !== speakToken) return // barnet gick vidare — släng
      const ctx = ensureAudioCtx()
      if (!ctx) { done(); return }
      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.connect(ctx.destination)
      source.onended = done
      source.start()
      currentSource = source
    })
    .catch((err) => {
      console.warn('Moln-TTS föll tillbaka till lokal röst:', err)
      if (token === speakToken) speakLocal(spoken, undefined, done)
    })
}

/**
 * Lås upp ljudet för uppläsning — anropas DIREKT i en tryckgest (t.ex.
 * filmens ▶). iPad släpper bara fram ljud som startas i själva gesten;
 * filmen läser upp sina scener en stund efteråt (från en effekt och
 * timers), och då förblev både Web Audio och talsyntesen tysta (Alberts
 * film, okt 2026). En tyst mikrobit i gesten räcker för resten av besöket.
 */
export function primeAudio(): void {
  try {
    const ctx = typeof window !== 'undefined' ? ensureAudioCtx() : null
    if (ctx) {
      const b = ctx.createBuffer(1, 1, 22050)
      const src = ctx.createBufferSource()
      src.buffer = b
      src.connect(ctx.destination)
      src.start()
    }
  } catch { /* ofarligt */ }
  if (ttsAvailable()) {
    try {
      const u = new SpeechSynthesisUtterance(' ')
      u.volume = 0
      window.speechSynthesis.speak(u)
    } catch { /* ofarligt */ }
  }
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

/* ============================================================
   Sparad molnröst (IndexedDB) — filmerna offline med AI-rösten.

   Minnescachen ovan glöms när appen stängs, så varje filmscen kostade ett
   nytt anrop och en väntan. Ljudet sparas därför på enheten (rå PCM, ca
   48 kB per sekund — alla filmer ryms på några tiotal MB) under rösten +
   texten. Ingenting om barnet sparas eller skickas: bara filmernas och
   uppgifternas fasta texter. Nyckeln bor kvar i hushållets lagring.
   ============================================================ */

const TTS_DB = 'barnens-plugg-tts'
const TTS_STORE = 'ljud'
const storeKey = (text: string): string => `${TTS_VOICE}|${text}`
let ttsDb: Promise<IDBDatabase | null> | null = null

function openTtsDb(): Promise<IDBDatabase | null> {
  if (ttsDb) return ttsDb
  ttsDb = new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') { resolve(null); return }
      const req = indexedDB.open(TTS_DB, 1)
      req.onupgradeneeded = () => req.result.createObjectStore(TTS_STORE)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
    } catch { resolve(null) }
  })
  return ttsDb
}

async function readStoredAudio(text: string): Promise<{ pcm: Uint8Array; rate: number } | null> {
  const db = await openTtsDb()
  if (!db) return null
  return new Promise((resolve) => {
    try {
      const req = db.transaction(TTS_STORE, 'readonly').objectStore(TTS_STORE).get(storeKey(text))
      req.onsuccess = () => {
        const v = req.result as { pcm: ArrayBuffer; rate: number } | undefined
        resolve(v ? { pcm: new Uint8Array(v.pcm), rate: v.rate } : null)
      }
      req.onerror = () => resolve(null)
    } catch { resolve(null) }
  })
}

async function storeAudio(text: string, pcm: Uint8Array, rate: number): Promise<void> {
  const db = await openTtsDb()
  if (!db) return
  try {
    const copy = pcm.slice().buffer
    db.transaction(TTS_STORE, 'readwrite').objectStore(TTS_STORE).put({ pcm: copy, rate }, storeKey(text))
  } catch { /* full lagring — rösten hämtas då från molnet nästa gång */ }
}

/** Finns texten redan sparad med molnrösten? */
export async function cloudAudioStored(text: string): Promise<boolean> {
  return (await readStoredAudio(toSpoken(text))) !== null
}

/** Hämtar och sparar molnrösten för alla texter (föräldraläget: "Förbered
    filmerna"). En i taget, så att nyckelns kvot inte överbelastas. Tar
    Googles gratiskvot slut avbryts hämtningen — det som hunnit sparas
    finns kvar, och nästa tryck fortsätter där det slutade. */
export async function prepareCloudAudio(
  texts: string[],
  onProgress: (done: number, total: number) => void,
): Promise<{ done: number; quota: boolean }> {
  let done = 0
  for (const text of texts) {
    const spoken = toSpoken(text)
    try {
      if (!(await readStoredAudio(spoken))) await fetchCloudAudio(spoken)
      done++
    } catch (err) {
      if (err instanceof QuotaError) { onProgress(done, texts.length); return { done, quota: true } }
    }
    onProgress(done, texts.length)
  }
  return { done, quota: false }
}
