import { useEffect, useMemo, useState } from 'react'
import type { DifficultyLevel, Task } from '../../domain/types'
import { momentById } from '../../domain/curriculum'
import { momentIntro } from '../../domain/intros'
import { generateTask } from '../../generators'
import { freshSeed } from '../../generators/rng'
import { prewarmSpeak, speak, stopSpeaking, ttsAvailable } from '../../tts'
import { useStore } from '../store'
import { Pi } from './Pi'
import { Icon } from './Icon'
import { TaskVisualView } from './TaskVisualView'
import { TaskRunner } from './TaskRunner'

/* ============================================================
   "Pi visar först" — introduktionen till ett nytt moment.

   Tre steg, "jag gör – vi gör – du gör" (granskningen okt 2026):
   1. IDÉN: ett handskrivet begreppskort (domain/intros.ts) med en fast
      bild — VAD begreppet är, inte bara hur man räknar. För de yngsta
      läses det upp automatiskt; de läser inte flytande.
   2. JAG GÖR: två lösta exempel (worked examples) med förklaringen och,
      där det finns, lösningsbilden (tallinjehopp).
   3. VI GÖR: en uppgift barnet löser själv med Pis hjälp — ledtrådssteget
      finns kvar, och svaret bokförs ALDRIG (introduktionen är ingen
      prövning och ska inte påverka barnets nivå).
   Därefter "du gör" i passet. Äldre barn (åk 4+) kan hoppa över med
   "Jag kan redan" — en tioåring ska inte tvingas genom det självklara.
   ============================================================ */

const EXAMPLE_COUNT = 2
type Stage = 'idea' | 'examples' | 'together'

const formatAnswer = (task: Task): string =>
  task.answer.kind === 'numeric'
    ? `${String(task.answer.value).replace('.', ',').replace('-', '−')}${task.answer.unit ? ` ${task.answer.unit}` : ''}`
    : task.answer.choices.find((c) => c.correct)?.text ?? ''

export function PiVisar({ momentId, onDone }: { momentId: string; onDone(): void }) {
  const { activeChild } = useStore()
  const year = activeChild?.schoolYear ?? '3'
  const youngest = year === 'F' || year === '1'
  const canSkip = year === '4' || year === '5' || year === '6'
  const moment = momentById(momentId)
  const intro = momentIntro(momentId)

  // Exempel + "vi gör"-uppgift: låg nivå (2–3) och olika uppgifter — det
  // ska vara enkelt och tydligt, inte en prövning.
  const tasks = useMemo<Task[]>(() => {
    if (!moment.generatorId) return []
    const out: Task[] = []
    const seen = new Set<string>()
    for (let i = 0; i < 20 && out.length < EXAMPLE_COUNT + 1; i++) {
      const task = generateTask(moment.generatorId, (2 + (out.length % 2)) as DifficultyLevel, freshSeed())
      if (!seen.has(task.prompt)) {
        seen.add(task.prompt)
        out.push(task)
      }
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [momentId])
  const examples = tasks.slice(0, EXAMPLE_COUNT)
  const together = tasks[EXAMPLE_COUNT]

  const [stage, setStage] = useState<Stage>(intro ? 'idea' : 'examples')
  const [step, setStep] = useState(0)

  // Kantfall: moment utan generator kan inte visas — hoppa över introt.
  useEffect(() => {
    if (examples.length === 0) onDone()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examples.length])

  // Idékortet läses upp av sig självt för de yngsta (förskoleklass, åk 1).
  const ideaSpoken = intro ? `Nytt äventyr: ${moment.title}. ${youngest && intro.say ? intro.say : intro.idea}` : ''
  useEffect(() => {
    if (stage !== 'idea' || !intro) return
    prewarmSpeak(ideaSpoken)
    if (!youngest || !ttsAvailable()) return
    const t = window.setTimeout(() => speak(ideaSpoken), 600)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage])
  useEffect(() => () => stopSpeaking(), [])

  // Molnrösten: förvärm exemplets uppläsning så knappen svarar direkt.
  useEffect(() => {
    const t = examples[step]
    if (stage === 'examples' && t) prewarmSpeak(`${t.spokenPrompt ?? t.prompt}. ${t.explanation}`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, step])

  if (examples.length === 0) return null

  const bubble = stage === 'idea'
    ? <>Nytt äventyr: <strong>{moment.title}</strong>! Först berättar jag vad det handlar om.</>
    : stage === 'examples'
      ? <>{step === 0 ? 'Nu visar jag två exempel' : 'Ett exempel till'} — titta hur jag tänker.</>
      : <>Nu gör vi en <strong>tillsammans</strong>. Du svarar — jag hjälper dig om det behövs!</>

  const skip = canSkip && stage !== 'together' && (
    <button className="chip" onClick={() => { stopSpeaking(); onDone() }}>Jag kan redan ▶</button>
  )

  if (stage === 'together' && together) {
    return (
      <div className="screen-fade" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <PiBubble>{bubble}</PiBubble>
        {/* Samma uppgiftsvy som i passet, men svaret bokförs inte (onComplete gör inget). */}
        <TaskRunner task={together} mode="ovning" withScratch={false} onComplete={() => undefined} onNext={onDone} />
      </div>
    )
  }

  const task = examples[step]
  return (
    // Egen scroll, samma mönster som TaskRunner: body scrollar aldrig, så ett
    // högt exempel (graf + svar + förklaring på iPad) klippte annars bort
    // knappen vidare — barnet kom inte vidare (förälderns foto, okt 2026).
    // margin:auto på innerdiven centrerar kort innehåll; justifyContent:center
    // hade gjort toppen oåtkomlig vid overflow.
    <div className="screen-fade" style={{
      flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch',
      display: 'flex', flexDirection: 'column',
    }}>
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 14, padding: '10px 20px 24px', margin: 'auto', width: '100%',
    }}>
      <PiBubble>{bubble}</PiBubble>

      {stage === 'idea' && intro ? (
        <div className="card" style={{ maxWidth: 560, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '18px 20px' }}>
          <span className="chip" style={{ color: 'var(--muted)' }}>Idén</span>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <p style={{ fontSize: 20, fontWeight: 800, textAlign: 'center', margin: 0, lineHeight: 1.45, color: 'var(--ink)' }}>
              {intro.idea}
            </p>
            {ttsAvailable() && (
              <button className="chip" onClick={() => speak(ideaSpoken)} aria-label="Läs upp"><Icon name="ljud" size={16} /></button>
            )}
          </div>
          {intro.visual && intro.visual.kind !== 'ingen' && <TaskVisualView visual={intro.visual} />}
        </div>
      ) : (
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
          }}>{formatAnswer(task)}</div>
          {/* Pi visar vägen: tallinjehoppen växer fram ett i taget. */}
          {task.solution && <TaskVisualView key={`sol-${step}`} visual={task.solution} />}
          <p style={{
            margin: 0, fontSize: 15, fontWeight: 700, textAlign: 'center', maxWidth: 460,
            background: '#FFF8E6', border: '2px solid #F2E3B8', borderRadius: 12, padding: '10px 14px', color: 'var(--sun-ink)',
          }}>Pi tänker: {task.explanation}</p>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
        {stage === 'idea' ? (
          <button className="btn btn-primary" onClick={() => { stopSpeaking(); setStage('examples') }}>Visa ett exempel ▶</button>
        ) : step + 1 < examples.length ? (
          <button className="btn btn-primary" onClick={() => setStep(step + 1)}>Visa ett exempel till ▶</button>
        ) : together ? (
          <button className="btn btn-ok" onClick={() => setStage('together')}>Nu gör vi en tillsammans! ▶</button>
        ) : (
          <button className="btn btn-ok" onClick={onDone}>Nu provar jag själv!</button>
        )}
        {skip}
      </div>
    </div>
    </div>
  )
}

function PiBubble({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center' }}>
      <Pi mood="glad" size={64} />
      <div style={{
        background: 'var(--card)', border: '2px solid var(--line)', borderRadius: 16,
        borderBottomLeftRadius: 4, padding: '10px 16px', maxWidth: 420, fontWeight: 700, fontSize: 15,
        color: 'var(--ink)',
      }}>{children}</div>
    </div>
  )
}
