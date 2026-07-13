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

/** Läs upp en text på svenska. */
export function speak(text: string, voiceURI?: string): void {
  if (!ttsAvailable()) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(toSpoken(text))
  utterance.lang = 'sv-SE'
  const voice = voiceURI ? swedishVoices().find((v) => v.voiceURI === voiceURI) ?? pickVoice() : pickVoice()
  if (voice) utterance.voice = voice
  utterance.rate = 0.92 // något lugnare för barn
  window.speechSynthesis.speak(utterance)
}

/** Provlyssning i föräldraläget. */
export function speakSample(voiceURI?: string): void {
  speak('Hej! Så här låter jag. Vad är 47 + 25?', voiceURI)
}

export function stopSpeaking(): void {
  if (ttsAvailable()) window.speechSynthesis.cancel()
}
