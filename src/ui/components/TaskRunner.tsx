import { useEffect, useRef, useState } from 'react'
import type { Task } from '../../domain/types'
import { matchMisconception } from '../../engine/progress'
import { misconceptionInfo } from '../../engine/misconceptions'
import { sfx } from '../../sound'
import { prewarmSpeak, speak, stopSpeaking, ttsAvailable } from '../../tts'
import { Icon, isObjektIcon, ObjektIcon } from './Icon'
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
}

const parseNumeric = (raw: string): number => Number(raw.replace('−', '-').replace(',', '.'))

/* Uppgiftsinnehållet (svarsknappar, feedback-kort, kladd-etiketter) ligger på
   LJUSA kort — texten måste därför ALLTID vara mörk, även i bosstrider där
   skärmens --ink är ljus (annars blir svaren osynliga, ljus-på-ljust). */
const ON_CARD_INK = '#35302E'
const ON_CARD_MUTED = '#6E6656'

export function TaskRunner({ task, mode, withScratch = true, onComplete, onNext, onScratchHandle }: TaskRunnerProps) {
  const [value, setValue] = useState('')
  const [phase, setPhase] = useState<'svara' | 'feedback'>('svara')
  const [answered, setAnswered] = useState(false)
  const [lastResult, setLastResult] = useState<TaskResult>()
  const startedAt = useRef(Date.now())
  const scratchRef = useRef<ScratchPadHandle>()

  // Ny uppgift → nollställ.
  useEffect(() => {
    setValue('')
    setPhase('svara')
    setAnswered(false)
    setLastResult(undefined)
    startedAt.current = Date.now()
    scratchRef.current?.clear()
    stopSpeaking()
    prewarmSpeak(task.spokenPrompt ?? task.prompt) // molnrösten: ljudet klart innan knapptrycket
  }, [task])

  const needsNegative = task.answer.kind === 'numeric' && task.answer.value < 0
  const needsDecimal = task.answer.kind === 'numeric' && !Number.isInteger(task.answer.value)

  const finish = (correct: boolean, given: number | string): void => {
    if (answered) return
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
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', maxWidth: 560 }}>
          <p style={{
            fontSize: task.prompt.length > 60 ? 19 : 26, fontWeight: 900, textAlign: 'center',
            margin: 0, lineHeight: 1.4, letterSpacing: 0.3,
            // I strid är texten ljus över arenan → stark mörk skugga; annars mjuk.
            textShadow: mode === 'prov'
              ? '0 2px 7px rgba(0,0,0,.85), 0 0 3px rgba(0,0,0,.6)'
              : '0 1px 2px rgba(255,247,235,.6)',
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

        {inFeedback && lastResult && (
          <div className={lastResult.correct ? 'pop' : 'shake'} style={{
            background: lastResult.correct ? 'color-mix(in srgb, var(--mint) 16%, var(--card))' : 'color-mix(in srgb, var(--coral) 14%, var(--card))',
            border: `2px solid ${lastResult.correct ? 'var(--mint)' : 'var(--coral)'}`,
            borderRadius: 16, padding: '12px 18px', maxWidth: 520, textAlign: 'center', color: ON_CARD_INK,
          }}>
            <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 4 }}>
              {lastResult.correct ? 'Rätt!' : 'Inte riktigt — men nu lär vi oss!'}
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
