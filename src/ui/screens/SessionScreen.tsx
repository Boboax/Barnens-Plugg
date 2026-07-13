import { useMemo, useRef, useState } from 'react'
import type { AnswerRecord, SessionPlan, Task } from '../../domain/types'
import { momentById } from '../../domain/curriculum'
import { composeSession, taskForPart } from '../../engine/session'
import { Pi } from '../components/Pi'
import { TaskRunner, type TaskResult } from '../components/TaskRunner'
import { todayISO, useStore } from '../store'

/* ============================================================
   Dagens pass: uppvärmning (repetition) → nytt → blandat.

   Repetitionens resultat räknas per moment: klarar barnet
   ≥ 75 % hålls repetitionsschemat, annars öppnas momentet igen.
   ============================================================ */

interface Slot {
  kind: SessionPlan['parts'][number]['kind']
  momentId: string
  /** index inom sin del, för repetitionsutvärdering */
  partKey: string
}

const PART_LABEL: Record<Slot['kind'], string> = {
  uppvarmning: 'Uppvärmning',
  nytt: 'Nytt',
  blandat: 'Blandat',
}

const CONTEXT: Record<Slot['kind'], AnswerRecord['context']> = {
  uppvarmning: 'repetition',
  nytt: 'ovning',
  blandat: 'ovning',
}

export function SessionScreen() {
  const store = useStore()
  const child = store.activeChild
  // Passet planeras EN gång vid start (medvetet: profilen uppdateras under passet).
  const slots = useMemo<Slot[]>(() => {
    if (!child) return []
    const plan = composeSession(child, todayISO())
    const out: Slot[] = []
    for (const part of plan.parts) {
      for (let i = 0; i < part.taskCount; i++) {
        out.push({ kind: part.kind, momentId: part.momentId, partKey: `${part.kind}:${part.momentId}` })
      }
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [index, setIndex] = useState(0)
  const [task, setTask] = useState<Task | null>(() =>
    child && slots.length > 0 ? taskForPart(child, slots[0].momentId, slots[0].kind) : null,
  )
  const [correctCount, setCorrectCount] = useState(0)
  // Repetitionsresultat per moment: [rätt, totalt]
  const reviewTally = useRef(new Map<string, [number, number]>())
  const reviewsFinished = useRef(new Set<string>())

  if (!child) return null

  if (slots.length === 0 || !task) {
    return (
      <EndCard
        title="Allt är klart här! 🎉"
        text="Det finns inget nytt att träna just nu — kika på kartan eller kom tillbaka imorgon."
        onDone={() => store.go('home')}
      />
    )
  }

  const slot = slots[index]
  const done = index >= slots.length

  const handleComplete = (result: TaskResult): void => {
    store.recordAnswer(task, result.correct, result.elapsedMs, CONTEXT[slot.kind], result.given, result.scratchPng)
    if (result.correct) setCorrectCount((n) => n + 1)
    if (slot.kind === 'uppvarmning') {
      const tally = reviewTally.current.get(slot.momentId) ?? [0, 0]
      reviewTally.current.set(slot.momentId, [tally[0] + (result.correct ? 1 : 0), tally[1] + 1])
    }
  }

  const advance = (): void => {
    // Avsluta repetitionsutvärderingen när momentets uppvärmning är slut.
    const next = index + 1
    if (slot.kind === 'uppvarmning' && !reviewsFinished.current.has(slot.momentId)) {
      const isLastOfPart = next >= slots.length || slots[next].partKey !== slot.partKey
      if (isLastOfPart) {
        const [right, total] = reviewTally.current.get(slot.momentId) ?? [0, 0]
        store.finishReview(slot.momentId, total > 0 && right / total >= 0.75)
        reviewsFinished.current.add(slot.momentId)
      }
    }
    if (next >= slots.length) {
      setIndex(next)
      return
    }
    setIndex(next)
    setTask(taskForPart(child, slots[next].momentId, slots[next].kind))
  }

  if (done) {
    const ratio = correctCount / slots.length
    return (
      <EndCard
        title={ratio >= 0.8 ? 'Superjobbat! 🌟' : 'Bra kämpat! 💪'}
        text={`${correctCount} av ${slots.length} rätt. ${ratio >= 0.8 ? 'Du är på väg att bemästra det här!' : 'Varje försök gör dig starkare — imorgon tar vi det igen!'}`}
        onDone={() => store.go('home')}
      />
    )
  }

  const moment = momentById(slot.momentId)

  return (
    <div className="screen-fade" style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', padding: '10px 16px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <button className="chip" onClick={() => store.go('home')}>✕ Avsluta</button>
        <div className="pbar" style={{ flex: 1 }}>
          <i style={{ width: `${(index / slots.length) * 100}%` }} />
        </div>
        <span className="chip" style={{ color: 'var(--muted)' }}>
          {PART_LABEL[slot.kind]} · {moment.title}
        </span>
      </div>
      <TaskRunner
        key={`${index}-${task.ref.seed}`}
        task={task}
        mode="ovning"
        onComplete={handleComplete}
        onNext={advance}
      />
    </div>
  )
}

export function EndCard({ title, text, onDone, buttonText = 'Till kartan ▶' }: {
  title: string; text: string; onDone(): void; buttonText?: string
}) {
  return (
    <div className="screen-fade" style={{
      minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: 12, padding: 30, textAlign: 'center',
    }}>
      <Pi mood="hejar" size={110} />
      <h2 style={{ fontSize: 26, fontWeight: 900, margin: 0 }}>{title}</h2>
      <p style={{ color: 'var(--muted)', fontWeight: 700, maxWidth: 420, margin: 0 }}>{text}</p>
      <button className="btn btn-primary" onClick={onDone}>{buttonText}</button>
    </div>
  )
}
