/* ============================================================
   Talsyntes (Web Speech API) med svensk röst.

   Avgörande för de yngsta som inte läser flytande än —
   varje uppgift har en uppläsningsknapp.
   ============================================================ */

let cachedVoice: SpeechSynthesisVoice | null | undefined

function swedishVoice(): SpeechSynthesisVoice | null {
  if (cachedVoice !== undefined) return cachedVoice
  const voices = window.speechSynthesis?.getVoices() ?? []
  cachedVoice =
    voices.find((v) => v.lang === 'sv-SE' && v.localService) ??
    voices.find((v) => v.lang === 'sv-SE') ??
    voices.find((v) => v.lang.startsWith('sv')) ??
    null
  return cachedVoice
}

// Röstlistan laddas asynkront i vissa webbläsare.
if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoice = undefined
  }
}

export const ttsAvailable = (): boolean =>
  typeof window !== 'undefined' && 'speechSynthesis' in window

/** Läs upp en text på svenska. Ersätter matematiska symboler med ord. */
export function speak(text: string): void {
  if (!ttsAvailable()) return
  const spoken = text
    .replaceAll('+', ' plus ')
    .replaceAll('−', ' minus ')
    .replaceAll('×', ' gånger ')
    .replaceAll(' / ', ' delat med ')
    .replaceAll('=', ' är lika med ')
    .replaceAll('__', ' vad ')
    .replaceAll('%', ' procent')
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(spoken)
  utterance.lang = 'sv-SE'
  const voice = swedishVoice()
  if (voice) utterance.voice = voice
  utterance.rate = 0.92 // något lugnare för barn
  window.speechSynthesis.speak(utterance)
}

export function stopSpeaking(): void {
  if (ttsAvailable()) window.speechSynthesis.cancel()
}
