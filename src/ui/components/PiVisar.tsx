import { useEffect, useMemo, useState } from 'react'
import type { DifficultyLevel, Task } from '../../domain/types'
import { momentById } from '../../domain/curriculum'
import { generateTask } from '../../generators'
import { freshSeed } from '../../generators/rng'
import { prewarmSpeak, speak, ttsAvailable } from '../../tts'
import { Pi } from './Pi'
import { Icon } from './Icon'
import { TaskVisualView } from './TaskVisualView'

/* ============================================================
   "Pi visar först" — lösta exempel innan barnet övar själv.

   Kognitionsforskningen (worked examples, cognitive load theory)
   är tydlig: nybörjare lär sig bäst av att först SE ett löst
   exempel, sedan öva. Visas första gången ett moment tränas:
   två exempel på låg nivå, med svaret framme och förklaringen
   som Pis "tänk så här".
   ============================================================ */

const EXAMPLE_COUNT = 2

export function PiVisar({ momentId, onDone }: { momentId: string; onDone(): void }) {
  const moment = momentById(momentId)
  const examples = useMemo<Task[]>(() => {
    if (!moment.generatorId) return []
    const out: Task[] = []
    // Låg nivå (2–3) och unika uppgifter — exempel ska vara enkla och tydliga.
    const seen = new Set<string>()
    for (let i = 0; i < 12 && out.length < EXAMPLE_COUNT; i++) {
      const task = generateTask(moment.generatorId, (2 + (out.length % 2)) as DifficultyLevel, freshSeed())
      if (!seen.has(task.prompt)) {
        seen.add(task.prompt)
        out.push(task)
      }
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [momentId])
  const [step, setStep] = useState(0)

  // Kantfall: moment utan generator kan inte visas — hoppa över introt.
  useEffect(() => {
    if (examples.length === 0) onDone()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examples.length])

  // Molnrösten: förvärm exemplets uppläsning så knappen svarar direkt.
  useEffect(() => {
    const t = examples[step]
    if (t) prewarmSpeak(`${t.spokenPrompt ?? t.prompt}. ${t.explanation}`)
  }, [examples, step])

  if (examples.length === 0) return null

  const task = examples[step]
  const answerText =
    task.answer.kind === 'numeric'
      ? `${String(task.answer.value).replace('.', ',').replace('-', '−')}${task.answer.unit ? ` ${task.answer.unit}` : ''}`
      : task.answer.choices.find((c) => c.correct)?.text ?? ''

  return (
    <div className="screen-fade" style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: 14, padding: '10px 20px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Pi mood="glad" size={64} />
        <div style={{
          background: 'var(--card)', border: '2px solid var(--line)', borderRadius: 16,
          borderBottomLeftRadius: 4, padding: '10px 16px', maxWidth: 420, fontWeight: 700, fontSize: 15,
        }}>
          Nytt äventyr: <strong>{moment.title}</strong>! Jag visar {EXAMPLE_COUNT === 2 && step === 0 ? 'två exempel' : 'ett till'} först — titta hur jag tänker.
        </div>
      </div>

      <div className="card" style={{ maxWidth: 560, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '18px 20px' }}>
        <span className="chip" style={{ color: 'var(--muted)' }}>Exempel {step + 1} av {examples.length}</span>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <p style={{ fontSize: task.prompt.length > 60 ? 18 : 24, fontWeight: 900, textAlign: 'center', margin: 0, lineHeight: 1.4 }}>
            {task.prompt}
          </p>
          {ttsAvailable() && (
            <button className="chip" onClick={() => speak(`${task.spokenPrompt ?? task.prompt}. ${task.explanation}`)} aria-label="Läs upp"><Icon name="ljud" size={16} /></button>
          )}
        </div>
        <TaskVisualView visual={task.visual} />
        <div className="pop" style={{
          fontSize: 26, fontWeight: 900, color: 'var(--mint)',
          border: '3px solid var(--mint)', borderRadius: 14, padding: '4px 22px', background: 'var(--card)',
        }}>{answerText}</div>
        <p style={{
          margin: 0, fontSize: 15, fontWeight: 700, textAlign: 'center', maxWidth: 460,
          background: '#FFF8E6', border: '2px solid #F2E3B8', borderRadius: 12, padding: '10px 14px', color: 'var(--sun-ink)',
        }}>Pi tänker: {task.explanation}</p>
      </div>

      {step + 1 < examples.length ? (
        <button className="btn btn-primary" onClick={() => setStep(step + 1)}>Visa ett exempel till ▶</button>
      ) : (
        <button className="btn btn-ok" onClick={onDone}>Nu provar jag själv!</button>
      )}
    </div>
  )
}
