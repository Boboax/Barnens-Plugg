import { useEffect, useRef, useState } from 'react'
import { lessonFor, sceneDurationMs, sceneSpoken } from '../../../domain/lessons'
import { prewarmSpeak, primeAudio, speak, stopSpeaking, ttsAvailable } from '../../../tts'
import { LESSON_VISUALS } from './visuals'
import '../../../styles/lessons.css'

/* Spelaren för en minilektion: en "film" i scener. Varje scen läses upp
   med barnets valda röst, undertexten står kvar på en ljus platta (barn
   som inte hör, eller läser hellre själva) och bilden animeras fram.

   Filmen startar på barnets tryck — dels för att iPad bara tillåter
   uppläsning efter en gest, dels för att barnet ska vara med när det
   börjar. Paus, bakåt, framåt och "se igen" finns alltid: en film man
   inte kan spola tillbaka i blir ett hinder, inte en hjälp. */

/** Paus efter att rösten läst klart, innan nästa scen. */
const SCENE_PAUSE_MS = 900
/** Reservtid utöver den beräknade lästiden (molnrösten hämtas först). */
const SPEECH_GRACE_MS = 8000

export function hasLesson(momentId: string): boolean {
  return !!lessonFor(momentId) && !!LESSON_VISUALS[momentId]
}

export function LessonPlayer({ momentId }: { momentId: string }) {
  const lesson = lessonFor(momentId)
  const Visual = LESSON_VISUALS[momentId]
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [started, setStarted] = useState(false)
  const [ended, setEnded] = useState(false)
  const scenes = lesson?.scenes ?? []
  const scene = scenes[step]
  // Scenen vars uppläsning redan startats i själva trycket (▶ / bakåt /
  // framåt) — iPad släpper bara fram ljud som börjar i gesten. Effekten
  // nedan kopplar då bara på "klar"-signalen i stället för att läsa igen.
  const startedInGesture = useRef<number | null>(null)
  const onSpeechEnd = useRef<(() => void) | null>(null)
  const speakInGesture = (i: number): void => {
    const sc = scenes[i]
    if (!sc || !ttsAvailable()) return
    startedInGesture.current = i
    onSpeechEnd.current = null
    speak(sceneSpoken(sc), undefined, () => onSpeechEnd.current?.())
  }

  // Molnrösten: förvärm de två första scenerna, sedan alltid nästa — inte
  // alla på en gång, Googles gratiskvot klarar bara några anrop i minuten.
  useEffect(() => {
    scenes.slice(0, 2).forEach((s) => prewarmSpeak(sceneSpoken(s)))
    return () => stopSpeaking()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [momentId])
  useEffect(() => {
    const next = scenes[step + 1]
    if (next) prewarmSpeak(sceneSpoken(next))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  // Nästa scen kommer när rösten läst klart (plus en liten paus att titta)
  // — inte efter en gissad lästid: molnrösten tar en stund att hämta och
  // läser i sin egen takt, och då klipptes den av eller lämnade tystnad.
  // Animationen får alltid sin minsta tid, och en reservklocka för det fall
  // att talsyntesen aldrig säger "klar" (händer på iPad).
  useEffect(() => {
    if (!playing || !scene) return
    const started = Date.now()
    let finished = false
    const timers: number[] = []
    const advance = (): void => {
      if (finished) return
      finished = true
      if (step + 1 < scenes.length) setStep(step + 1)
      else { setPlaying(false); setEnded(true) }
    }
    const afterSpeech = (): void => {
      const elapsed = Date.now() - started
      // "Klar" långt innan meningen hunnit läsas = talsyntesen gav upp (ingen
      // röst laddad, avbrott). Då går scenen på beräknad lästid i stället för
      // att filmen rusar igenom alla scener på några sekunder.
      const readMs = sceneSpoken(scene).length * 60
      if (elapsed < readMs * 0.35) {
        timers.push(window.setTimeout(advance, Math.max(SCENE_PAUSE_MS, sceneDurationMs(scene) - elapsed)))
        return
      }
      const minLeft = Math.max(0, (scene.minMs ?? 0) - elapsed)
      timers.push(window.setTimeout(advance, Math.max(SCENE_PAUSE_MS, minLeft)))
    }
    if (ttsAvailable()) {
      if (startedInGesture.current === step) {
        startedInGesture.current = null
        onSpeechEnd.current = afterSpeech
      } else {
        speak(sceneSpoken(scene), undefined, afterSpeech)
      }
      timers.push(window.setTimeout(advance, sceneDurationMs(scene) + SPEECH_GRACE_MS))
    } else {
      timers.push(window.setTimeout(advance, sceneDurationMs(scene)))
    }
    return () => { finished = true; onSpeechEnd.current = null; timers.forEach((t) => window.clearTimeout(t)) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, playing])

  if (!lesson || !Visual || !scene) return null

  const play = (): void => {
    primeAudio() // i själva trycket — annars förblir rösten tyst på iPad
    const from = ended ? 0 : step
    speakInGesture(from)
    setStarted(true)
    if (ended) { setEnded(false); setStep(0) }
    setPlaying(true)
  }
  const pause = (): void => { stopSpeaking(); setPlaying(false) }
  const goTo = (i: number): void => {
    primeAudio()
    stopSpeaking()
    const to = Math.max(0, Math.min(scenes.length - 1, i))
    if (playing) speakInGesture(to)
    setEnded(false)
    setStarted(true)
    setStep(to)
  }

  return (
    <div className="lesson">
      <div className="lesson__stage">
        <svg className="lesson-svg" viewBox="0 0 320 200" role="img" aria-label={scene.text}>
          <Visual step={step} />
        </svg>
        {!started && (
          <button className="lesson__big-play" onClick={play} aria-label="Spela filmen">
            <PlayIcon size={34} />
          </button>
        )}
      </div>
      <p className="lesson__subtitle" aria-live="polite">{scene.text}</p>
      <div className="lesson__controls">
        <button className="lesson__btn" onClick={() => goTo(step - 1)} disabled={step === 0} aria-label="Föregående">
          <StepIcon back />
        </button>
        {playing ? (
          <button className="lesson__btn lesson__btn--main" onClick={pause} aria-label="Pausa"><PauseIcon /></button>
        ) : ended ? (
          <button className="lesson__btn lesson__btn--main" onClick={play} aria-label="Se igen"><ReplayIcon /></button>
        ) : (
          <button className="lesson__btn lesson__btn--main" onClick={play} aria-label="Spela"><PlayIcon size={20} /></button>
        )}
        <button className="lesson__btn" onClick={() => goTo(step + 1)} disabled={step + 1 >= scenes.length} aria-label="Nästa">
          <StepIcon />
        </button>
        <div className="lesson__dots" aria-hidden="true">
          {scenes.map((_, i) => (
            <span key={i} className={i === step ? 'is-on' : i < step ? 'is-done' : ''} />
          ))}
        </div>
      </div>
    </div>
  )
}

function PlayIcon({ size = 20 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true"><path d="M5 3 L17 10 L5 17 Z" fill="currentColor" /></svg>
}
function PauseIcon() {
  return <svg width={20} height={20} viewBox="0 0 20 20" aria-hidden="true"><rect x={4} y={3} width={4.5} height={14} rx={1.5} fill="currentColor" /><rect x={11.5} y={3} width={4.5} height={14} rx={1.5} fill="currentColor" /></svg>
}
function ReplayIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 20 20" aria-hidden="true">
      <path d="M10 3.5 A6.5 6.5 0 1 1 3.5 10" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" />
      <path d="M10 0.5 L14 3.5 L10 6.5 Z" fill="currentColor" />
    </svg>
  )
}
function StepIcon({ back = false }: { back?: boolean }) {
  return (
    <svg width={18} height={18} viewBox="0 0 20 20" aria-hidden="true" style={back ? { transform: 'scaleX(-1)' } : undefined}>
      <path d="M4 4 L13 10 L4 16 Z" fill="currentColor" /><rect x={14} y={4} width={3} height={12} rx={1} fill="currentColor" />
    </svg>
  )
}
