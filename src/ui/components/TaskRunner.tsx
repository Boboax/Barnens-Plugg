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
const pick = (pool: string[]): string => pool[Math.floor(Math.random() * pool.length)]

export function TaskRunner({ task, mode, withScratch = true, onComplete, onNext, onScratchHandle, firstTask = false }: TaskRunnerProps) {
  const [value, setValue] = useState('')
  const [phase, setPhase] = useState<'svara' | 'feedback'>('svara')
  const [answered, setAnswered] = useState(false)
  const [lastResult, setLastResult] = useState<TaskResult>()
  const [coachLine, setCoachLine] = useState('')
  const startedAt = useRef(Date.now())
  const scratchRef = useRef<ScratchPadHandle>()
  // Ref-vakt: state (`answered`) hinner inte uppdateras mellan två tryck i
  // samma frame — ivrig dubbelknackning kunde registrera dubbla svar.
  const finishedRef = useRef(false)

  // Ny uppgift → nollställ.
  useEffect(() => {
    setValue('')
    setPhase('svara')
    setAnswered(false)
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
      setPhase('feedback')
      setCoachLine(pick(correct ? PI_CHEERS : PI_ENCOURAGE)) // Pis tillrop
      if (correct) sfx.ratt()
      else sfx.fel()
    } else if (mode === 'diagnos') {
      sfx.klick() // neutral bekräftelse — diagnosen avslöjar aldrig rätt/fel
    }
    onComplete(result)
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
            <button
              className="chip"
              onClick={() => speak(task.spokenPrompt ?? task.prompt)}
              aria-label="Läs upp uppgiften"
              style={{ flexShrink: 0 }}
            ><Icon name="ljud" size={17} /></button>
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
            {!inFeedback && (
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
          !inFeedback && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: task.answer.choices.some((c) => c.text.length > 14) ? '1fr' : 'repeat(2, minmax(130px, 1fr))',
              gap: 10, width: '100%', maxWidth: 480,
            }}>
              {task.answer.choices.map((choice) => (
                <button
                  key={choice.text}
                  data-testid="choice"
                  onClick={() => finish(choice.correct, choice.text)}
                  disabled={answered}
                  style={{
                    background: 'var(--card)', border: '2.5px solid var(--line)', borderRadius: 14,
                    padding: '13px 10px', fontSize: 18, fontWeight: 900, boxShadow: '0 3px 0 var(--line)',
                    fontFamily: 'inherit', color: ON_CARD_INK,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >{isObjektIcon(choice.text) ? <ObjektIcon name={choice.text} size={44} /> : choice.text}</button>
              ))}
            </div>
          )
        )}

        {/* Första uppgiften: en liten Pi visar VAR man svarar (försvinner sen). */}
        {mode === 'ovning' && firstTask && !answered && !inFeedback && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: ON_CARD_INK, fontWeight: 700, fontSize: 13.5 }}>
            <Pi mood="glad" size={40} />
            <span>{task.answer.kind === 'numeric' ? 'Skriv talet och tryck på ✓' : 'Tryck på svaret du tror är rätt!'}</span>
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
