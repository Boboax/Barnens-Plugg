import { useEffect, useRef, useState } from 'react'
import type { Task } from '../../domain/types'
import { matchMisconception } from '../../engine/progress'
import { misconceptionInfo } from '../../engine/misconceptions'
import { sfx } from '../../sound'
import { prewarmSpeak, speak, stopSpeaking, ttsAvailable } from '../../tts'
import { Icon, isObjektIcon, ObjektIcon } from './Icon'
import { Pi } from './Pi'
import { Keypad } from './Keypad'
import { ScratchPad, type ScratchPadHandle } from './ScratchPad'
import { TaskVisualView } from './TaskVisualView'
import { useStore } from '../store'

/* ============================================================
   Uppgiftslöparen — visar en uppgift, tar emot svaret och
   (i övningsläge) ger omedelbar, förklarande återkoppling.

   Lägen:
   - ovning: rätt/fel visas direkt, fel ger pedagogisk förklaring
   - prov:   neutral bekräftelse, inga förklaringar (bosstrid m.m.)
   - diagnos: helt neutralt — inga rätt/fel alls
   ============================================================ */

export interface TaskResult {
  correct: boolean
  elapsedMs: number
  given: number | string
  scratchPng?: string
}

interface TaskRunnerProps {
  task: Task
  mode: 'ovning' | 'prov' | 'diagnos'
  withScratch?: boolean
  /** Anropas direkt när svaret ges (alla lägen). */
  onComplete(result: TaskResult): void
  /** Övningsläget: anropas när barnet trycker "Nästa" efter feedbacken. */
  onNext?(): void
  /** Ger föräldern till komponenten åtkomst till kladdytan (chatten: "visa min uträkning"). */
  onScratchHandle?(handle: ScratchPadHandle): void
  /** Visa en liten Pi-nudge ("tryck på ett svar") — sätts bara på första uppgiften. */
  firstTask?: boolean
  /** Om satt visas "Prata med Pi 💬" i ledtrådssteget (bara barn med chatt på).
      Chatten öppnas ALDRIG automatiskt — det här är ett frivilligt knapptryck. */
  onOpenChat?(): void
}

const parseNumeric = (raw: string): number => Number(raw.replace('−', '-').replace(',', '.'))

/* Uppgiftsinnehållet (svarsknappar, feedback-kort, kladd-etiketter) ligger på
   LJUSA kort — texten måste därför ALLTID vara mörk, även i bosstrider där
   skärmens --ink är ljus (annars blir svaren osynliga, ljus-på-ljust). */
const ON_CARD_INK = '#35302E'
const ON_CARD_MUTED = '#6E6656'

/* Pis peppande tillrop (rätt) och trygga uppmuntran (fel). Appens EGNA
   deterministiska strängar — inte AI-chatten. Growth mindset: vi berömmer
   ansträngning och strategi ("bra kämpat"), aldrig "vad smart du är". */
const PI_CHEERS = ['Rätt!', 'Bra jobbat!', 'Snyggt räknat!', 'Precis rätt!', 'Ja — du fixade det!', 'Starkt jobbat!']
const PI_ENCOURAGE = ['Bra kämpat! Nu lär vi oss.', 'Nästan — vi tar det tillsammans!', 'Bra försök! Kolla här.', 'Oj, en klurig! Nu tittar vi.']
/* Pis små skämt — varm, fnissig ton, aldrig ironisk. Visas i stället för ett
   vanligt tillrop i ~15 % av de rätta svaren (bara i övningsläge) för lite
   mikrovariation och personlighet. Max ~60 tecken. */
const PI_JOKES = [
  'Visste du att jag älskar udda tal? Lite tokiga — som jag!',
  'Sju är mitt turtal. Åtta blev sur, fråga inte varför.',
  'Nollan är min kompis. Den ser rund och glad ut!',
  'Jag räknar får när jag inte kan sova. Igår kom jag till 428.',
  'Trianglar är bäst. De har alltid en spetsig idé!',
  'Jag gillar tior — de är så runda och nöjda.',
  'Minus är bara plus som går baklänges. Klurigt, va?',
  'En gång åt jag en hel tallinje. Den smakade mest siffror.',
  'Femman gör high-five med sig själv. Fem fingrar!',
  'Jag viskar gångertabellen till stjärnorna om kvällen.',
]
const pick = (pool: string[]): string => pool[Math.floor(Math.random() * pool.length)]

export function TaskRunner({ task, mode, withScratch = true, onComplete, onNext, onScratchHandle, firstTask = false, onOpenChat }: TaskRunnerProps) {
  // FK (~6 år) läser inte flytande → stor, tydlig uppläsningsknapp med etikett.
  const { activeChild } = useStore()
  const fk = activeChild?.schoolYear === 'F'
  const [value, setValue] = useState('')
  // 'retry' = ledtrådssteget efter första felsvaret (bara övningsläget). Barnet
  // får hjälp att komma rätt och ETT nytt försök innan facit visas.
  const [phase, setPhase] = useState<'svara' | 'retry' | 'feedback'>('svara')
  const [answered, setAnswered] = useState(false)
  const [attempt, setAttempt] = useState(1)
  const [hintLine, setHintLine] = useState('')
  const [wrongChoice, setWrongChoice] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<TaskResult>()
  const [coachLine, setCoachLine] = useState('')
  const startedAt = useRef(Date.now())
  const scratchRef = useRef<ScratchPadHandle>()
  // Ref-vakt: state (`answered`) hinner inte uppdateras mellan två tryck i
  // samma frame — ivrig dubbelknackning kunde registrera dubbla svar.
  const finishedRef = useRef(false)

  // Ny uppgift → nollställ (inkl. ledtrådsstegets tillstånd).
  useEffect(() => {
    setValue('')
    setPhase('svara')
    setAnswered(false)
    setAttempt(1)
    setHintLine('')
    setWrongChoice(null)
    finishedRef.current = false
    setLastResult(undefined)
    setCoachLine('')
    startedAt.current = Date.now()
    scratchRef.current?.clear()
    stopSpeaking()
    prewarmSpeak(task.spokenPrompt ?? task.prompt) // molnrösten: ljudet klart innan knapptrycket
  }, [task])

  const needsNegative = task.answer.kind === 'numeric' && task.answer.value < 0
  const needsDecimal = task.answer.kind === 'numeric' && !Number.isInteger(task.answer.value)
  // Tvåvalsfrågor (t.ex. Ja/Nej) får INGET omförsök — andra knappen är per
  // definition rätt (ren gissning, noll lärande). Går direkt till facit.
  const twoChoice = task.answer.kind === 'choice' && task.answer.choices.length === 2
  const retryEligible = mode === 'ovning' && !twoChoice

  /** Ledtråd FÖRE facit: missuppfattningsspecifik om motorn känner igen felet,
      annars en processledtråd efter uppgiftstyp. Leder mot metoden — aldrig svaret. */
  const buildHint = (given: number | string): string => {
    const tag = matchMisconception(task, given)
    if (tag && tag !== 'okand') return misconceptionInfo(tag).childHint
    if (task.visual.kind !== 'ingen') return 'Titta på bilden igen — den visar svaret. Räkna en gång till!'
    if (task.answer.kind === 'choice') return 'Läs alla svaren en gång till innan du väljer.'
    return 'Räkna en gång till, lugnt och fint. Du klarar det!'
  }

  const finish = (correct: boolean, given: number | string): void => {
    if (answered || finishedRef.current) return
    finishedRef.current = true
    setAnswered(true)
    const result: TaskResult = {
      correct,
      elapsedMs: Date.now() - startedAt.current,
      given,
      scratchPng: scratchRef.current?.snapshot(),
    }
    setLastResult(result)
    if (mode === 'ovning') {
      if (correct) {
        setPhase('feedback')
        // Rätt på omförsöket firas varmt; annars vanligt tillrop (~15 % skämt).
        setCoachLine(attempt === 2 ? 'Där satt den! 💪' : (Math.random() < 0.15 ? pick(PI_JOKES) : pick(PI_CHEERS)))
        sfx.ratt()
      } else if (attempt === 1 && retryEligible) {
        // Första felsvaret → ledtråd + ETT nytt försök (facit hålls tillbaka).
        setPhase('retry')
        setHintLine(buildHint(given))
        if (typeof given === 'string') setWrongChoice(given) // gråa den valda felknappen
        sfx.fel()
      } else {
        // Andra felsvaret (eller tvåvalsfråga) → facit, som förut.
        setPhase('feedback')
        setCoachLine(pick(PI_ENCOURAGE))
        sfx.fel()
      }
    } else if (mode === 'diagnos') {
      sfx.klick() // neutral bekräftelse — diagnosen avslöjar aldrig rätt/fel
    }
    // ENDAST första försöket bokförs i motorn (rating, missuppfattningar,
    // repetitionsutvärdering). Omförsöket är ett rent pedagogiskt UI-lager —
    // orubblig princip 5: framsteg styrs av appkod, opåverkat av omförsöket.
    if (attempt === 1) onComplete(result)
  }

  /** "Försök igen!" — tillbaka till svarsläget för ett andra (obokfört) försök. */
  const goRetry = (): void => {
    setAttempt(2)
    setAnswered(false)
    finishedRef.current = false
    setValue('')
    setPhase('svara')
    stopSpeaking()
  }

  const submitNumeric = (): void => {
    if (task.answer.kind !== 'numeric' || answered) return
    const given = parseNumeric(value)
    if (Number.isNaN(given)) return
    finish(Math.abs(given - task.answer.value) < 1e-9, given)
  }

  const misconceptionHint = (): string | undefined => {
    if (!lastResult || lastResult.correct) return undefined
    const tag = matchMisconception(task, lastResult.given)
    return tag && tag !== 'okand' ? misconceptionInfo(tag).childHint : undefined
  }

  const inFeedback = phase === 'feedback' && lastResult !== undefined

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: withScratch ? 'minmax(0, 1.3fr) minmax(220px, 1fr)' : '1fr',
      gap: 14, flex: 1, minHeight: 0,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', justifyContent: 'center', minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', maxWidth: 560 }}>
          {/* Frågan sitter ALLTID på en egen ljus pergamentplatta med mörk text.
              Läsbarheten får aldrig bero på bakgrunden bakom (arena, sol, natt) —
              se regeln i CLAUDE.md om text över målade bakgrunder. */}
          <p style={{
            fontSize: task.prompt.length > 60 ? 19 : 26, fontWeight: 900, textAlign: 'center',
            margin: 0, lineHeight: 1.35, letterSpacing: 0.3,
            color: ON_CARD_INK,
            background: 'linear-gradient(180deg, rgba(251,244,226,.98), rgba(240,230,205,.98))',
            border: '2px solid #C9B489', borderRadius: 14, padding: '10px 20px',
            boxShadow: '0 2px 8px rgba(45,30,10,.32)',
          }}>{task.prompt}</p>
          {ttsAvailable() && (
            fk ? (
              // Stor tryckyta + synlig etikett för den som inte läser flytande.
              <button
                className="chip"
                onClick={() => speak(task.spokenPrompt ?? task.prompt)}
                aria-label="Läs upp uppgiften"
                style={{ flexShrink: 0, minHeight: 44, padding: '0 14px', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: 15 }}
              ><Icon name="ljud" size={24} /> Lyssna</button>
            ) : (
              <button
                className="chip"
                onClick={() => speak(task.spokenPrompt ?? task.prompt)}
                aria-label="Läs upp uppgiften"
                style={{ flexShrink: 0 }}
              ><Icon name="ljud" size={17} /></button>
            )
          )}
        </div>

        <TaskVisualView visual={task.visual} />

        {task.answer.kind === 'numeric' ? (
          <>
            <div style={{
              minWidth: 120, border: '3px dashed var(--primary)', borderRadius: 14, padding: '6px 18px',
              fontSize: 28, fontWeight: 900, textAlign: 'center', color: 'var(--primary)', background: 'var(--card)',
            }}>
              {value || '\u00A0'}
              {task.answer.unit && <span style={{ fontSize: 16, color: ON_CARD_MUTED, marginLeft: 6 }}>{task.answer.unit}</span>}
            </div>
            {phase === 'svara' && (
              <Keypad
                value={value}
                onChange={setValue}
                onSubmit={submitNumeric}
                allowNegative={needsNegative}
                allowDecimal={needsDecimal}
                disabled={answered}
              />
            )}
          </>
        ) : (
          phase === 'svara' && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: task.answer.choices.some((c) => c.text.length > 14) ? '1fr' : 'repeat(2, minmax(130px, 1fr))',
              gap: 10, width: '100%', maxWidth: 480,
            }}>
              {task.answer.choices.map((choice) => {
                // Vid omförsök: gråa den felknapp barnet redan valt.
                const spent = choice.text === wrongChoice
                return (
                  <button
                    key={choice.text}
                    data-testid="choice"
                    onClick={() => finish(choice.correct, choice.text)}
                    disabled={answered || spent}
                    style={{
                      background: 'var(--card)', border: '2.5px solid var(--line)', borderRadius: 14,
                      padding: '13px 10px', fontSize: 18, fontWeight: 900, boxShadow: '0 3px 0 var(--line)',
                      fontFamily: 'inherit', color: ON_CARD_INK,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      opacity: spent ? 0.4 : 1,
                    }}
                  >{isObjektIcon(choice.text) ? <ObjektIcon name={choice.text} size={44} /> : choice.text}</button>
                )
              })}
            </div>
          )
        )}

        {/* Första uppgiften: en liten Pi visar VAR man svarar (försvinner sen). */}
        {mode === 'ovning' && firstTask && phase === 'svara' && !answered && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: ON_CARD_INK, fontWeight: 700, fontSize: 13.5 }}>
            <Pi mood="glad" size={40} />
            <span>{task.answer.kind === 'numeric' ? 'Skriv talet och tryck på ✓' : 'Tryck på svaret du tror är rätt!'}</span>
          </div>
        )}

        {/* Ledtrådssteget: Pi kliver in AUTOMATISKT med en metodledtråd (aldrig
            facit) och barnet får ett nytt försök. Uppläsning på tryck, aldrig
            autoplay. "Prata med Pi" bara för barn med chatten på (frivilligt). */}
        {phase === 'retry' && (
          <div className="pop" style={{
            background: 'color-mix(in srgb, var(--sun) 18%, var(--card))',
            border: '2px solid var(--sun)', borderRadius: 16, padding: '12px 18px',
            maxWidth: 520, textAlign: 'center', color: ON_CARD_INK,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, justifyContent: 'center', marginBottom: 8 }}>
              <Pi mood="funderar" size={44} />
              <span style={{ fontSize: 15.5, fontWeight: 700, lineHeight: 1.35, textAlign: 'left' }}>{hintLine}</span>
              {ttsAvailable() && (
                <button className="chip" onClick={() => speak(hintLine)} aria-label="Läs upp ledtråden"
                  style={fk ? { flexShrink: 0, minHeight: 44, padding: '0 12px', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 800 } : { flexShrink: 0 }}>
                  <Icon name="ljud" size={fk ? 22 : 16} />{fk ? ' Lyssna' : ''}
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={goRetry}>Försök igen! ▶</button>
              {onOpenChat && (
                <button className="btn btn-quiet" onClick={onOpenChat}>Prata med Pi 💬</button>
              )}
            </div>
          </div>
        )}

        {inFeedback && lastResult && (
          <div className={lastResult.correct ? 'pop' : 'shake'} style={{
            background: lastResult.correct ? 'color-mix(in srgb, var(--mint) 16%, var(--card))' : 'color-mix(in srgb, var(--coral) 14%, var(--card))',
            border: `2px solid ${lastResult.correct ? 'var(--mint)' : 'var(--coral)'}`,
            borderRadius: 16, padding: '12px 18px', maxWidth: 520, textAlign: 'center', color: ON_CARD_INK,
          }}>
            {/* Pi hejar (rätt) eller funderar tillsammans (fel) med varierat tillrop. */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 4 }}>
              <Pi mood={lastResult.correct ? 'hejar' : 'funderar'} size={44} />
              <span style={{ fontSize: 20, fontWeight: 900 }}>
                {coachLine || (lastResult.correct ? 'Rätt!' : 'Nu lär vi oss!')}
              </span>
            </div>
            {!lastResult.correct && (
              <>
                {misconceptionHint() && <p style={{ margin: '4px 0', fontWeight: 700, color: ON_CARD_INK }}>{misconceptionHint()}</p>}
                <p style={{ margin: '4px 0', fontSize: 15, color: ON_CARD_INK }}>{task.explanation}</p>
                <p style={{ margin: '4px 0 0', fontSize: 14, fontWeight: 800, color: ON_CARD_MUTED, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                  Rätt svar: {task.answer.kind === 'numeric'
                    ? `${String(task.answer.value).replace('.', ',').replace('-', '−')}${task.answer.unit ? ` ${task.answer.unit}` : ''}`
                    : (() => {
                        const t = task.answer.choices.find((c) => c.correct)?.text ?? ''
                        return isObjektIcon(t) ? <ObjektIcon name={t} size={28} /> : t
                      })()}
                </p>
              </>
            )}
            <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={onNext}>
              Nästa ▶
            </button>
          </div>
        )}
      </div>

      {withScratch && (
        <div style={{ minHeight: 220 }}>
          <ScratchPad onReady={(h) => { scratchRef.current = h; onScratchHandle?.(h) }} />
        </div>
      )}
    </div>
  )
}
