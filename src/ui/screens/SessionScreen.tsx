import { useEffect, useMemo, useRef, useState } from 'react'
import type { AnswerRecord, SessionPlan, Task } from '../../domain/types'
import { momentById } from '../../domain/curriculum'
import { composeSession, taskForPart } from '../../engine/session'
import { sfx } from '../../sound'
import { fireConfetti } from '../fx/confetti'
import { Pi } from '../components/Pi'
import { PiVisar } from '../components/PiVisar'
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
  const [combo, setCombo] = useState(0)
  // "Pi visar först": lösta exempel innan ett helt nytt moment övas.
  const [introDone, setIntroDone] = useState(false)
  const introMomentId = useMemo(() => {
    if (!child) return undefined
    const firstNew = slots.find((s) => s.kind === 'nytt')
    if (!firstNew) return undefined
    const skill = child.skills[firstNew.momentId]
    return (skill?.attempts ?? 0) === 0 ? firstNew.momentId : undefined
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
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
    if (result.correct) {
      setCorrectCount((n) => n + 1)
      const next = combo + 1
      setCombo(next)
      // Combofirande vid 3, 5, 8, 12 … — belönar uthållig noggrannhet.
      if (next === 3 || next === 5 || next === 8 || (next >= 12 && next % 4 === 0)) {
        sfx.combo(next)
        fireConfetti({ count: 30 + next * 6 })
      }
    } else {
      setCombo(0)
    }
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
        celebrate={ratio >= 0.8}
      />
    )
  }

  const moment = momentById(slot.momentId)
  const showIntro = slot.kind === 'nytt' && slot.momentId === introMomentId && !introDone

  return (
    <div className="screen-fade" style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', padding: '10px 16px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <button className="chip" onClick={() => store.go('home')}>✕ Avsluta</button>
        <div className="pbar" style={{ flex: 1 }}>
          <i style={{ width: `${(index / slots.length) * 100}%` }} />
        </div>
        {combo >= 3 && !showIntro && (
          <span key={combo} className="chip pop-big" style={{ borderColor: 'var(--sun)', color: 'var(--sun-ink)', background: '#FFF1D6' }}>
            🔥 {combo} i rad!
          </span>
        )}
        <span className="chip" style={{ color: 'var(--muted)' }}>
          {showIntro ? '🐧 Pi visar först' : `${PART_LABEL[slot.kind]} · ${moment.title}`}
        </span>
      </div>
      {showIntro ? (
        <PiVisar momentId={slot.momentId} onDone={() => setIntroDone(true)} />
      ) : (
      <TaskRunner
        key={`${index}-${task.ref.seed}`}
        task={task}
        mode="ovning"
        onComplete={handleComplete}
        onNext={advance}
      />
      )}
    </div>
  )
}

export function EndCard({ title, text, onDone, buttonText = 'Till kartan ▶', celebrate = false }: {
  title: string; text: string; onDone(): void; buttonText?: string; celebrate?: boolean
}) {
  // Firandet (fanfar + konfetti) avfyras exakt en gång när kortet visas.
  useEffect(() => {
    if (celebrate) {
      sfx.fanfar()
      fireConfetti({ count: 130 })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div className="screen-fade" style={{
      minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: 12, padding: 30, textAlign: 'center',
    }}>
      <div className="bounce-in"><Pi mood="hejar" size={110} /></div>
      <h2 className="pop-big" style={{ fontSize: 26, fontWeight: 900, margin: 0, animationDelay: '0.15s' }}>{title}</h2>
      <p style={{ color: 'var(--muted)', fontWeight: 700, maxWidth: 420, margin: 0 }}>{text}</p>
      <button className="btn btn-primary" onClick={onDone}>{buttonText}</button>
    </div>
  )
}
