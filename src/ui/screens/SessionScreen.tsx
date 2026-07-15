import { useEffect, useMemo, useRef, useState } from 'react'
import type { AnswerRecord, SessionPlan, Task } from '../../domain/types'
import { momentById } from '../../domain/curriculum'
import { worldTheme } from '../worldThemes'
import { composeSession, taskForPart } from '../../engine/session'
import { chatReadyFor } from '../../chat'
import type { ScratchPadHandle } from '../components/ScratchPad'
import { sfx } from '../../sound'
import { fireConfetti } from '../fx/confetti'
import { ChatPanel } from '../components/ChatPanel'
import { Icon, HeroImg } from '../components/Icon'
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
    const plan = composeSession(child, todayISO(), store.sessionMomentId)
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
  const [chatOpen, setChatOpen] = useState(false)
  const scratchHandle = useRef<ScratchPadHandle>()
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
        title="Allt är klart här!"
        text="Det finns inget nytt att träna just nu — kika på kartan eller kom tillbaka imorgon."
        onDone={() => store.go('home')}
      />
    )
  }

  const slot = slots[index]
  const done = index >= slots.length

  const handleComplete = (result: TaskResult): void => {
    const streak = result.correct ? combo + 1 : 0
    store.recordAnswer(task, result.correct, result.elapsedMs, CONTEXT[slot.kind], result.given, result.scratchPng, streak)
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
        title={ratio >= 0.8 ? 'Superjobbat!' : 'Bra kämpat!'}
        text={`${correctCount} av ${slots.length} rätt. ${ratio >= 0.8 ? 'Du är på väg att bemästra det här!' : 'Varje försök gör dig starkare — imorgon tar vi det igen!'}`}
        onDone={() => store.go('home')}
        celebrate={ratio >= 0.8}
      />
    )
  }

  const moment = momentById(slot.momentId)
  const showIntro = slot.kind === 'nytt' && slot.momentId === introMomentId && !introDone
  const chatAvailable = chatReadyFor(child)
  // Världstema bakom uppgiften: den målade världsbilden syns runt kanterna,
  // men en varm pergamentslöja är tät i mitten så uppgiftstexten är knivskarp.
  // Bakgrunden byter värld i takt med att man rör sig mellan moment i passet.
  const theme = worldTheme(moment.worldId)
  const worldBg = `${import.meta.env.BASE_URL}art/world/${moment.worldId}.webp`

  return (
    <div className="screen-fade" style={{
      // env(safe-area-inset-top): annars hamnar Avsluta-raden under iOS-klockan
      // i hemskärmsläge (viewport-fit=cover). Bakgrunden fyller ändå kant till kant.
      minHeight: '100%', display: 'flex', flexDirection: 'column',
      padding: 'calc(10px + env(safe-area-inset-top)) 16px 16px',
      position: 'relative', overflow: 'hidden',
      background: `url(${worldBg}) center / cover no-repeat, ${theme.sky}`,
    }}>
      {/* Pergamentslöja: tät i mitten (läsbarhet), tunnare mot kanten där
          världsscenen ramar in uppgiften. */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse 82% 78% at 50% 46%, rgba(245,238,222,.94) 0%, rgba(245,238,222,.9) 42%, rgba(245,238,222,.5) 82%, rgba(244,236,218,.16) 100%)',
      }} />
      <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <button className="chip" onClick={() => store.go('home')}>✕ Avsluta</button>
        <div className="pbar" style={{ flex: 1 }}>
          <i style={{ width: `${(index / slots.length) * 100}%` }} />
        </div>
        {combo >= 3 && !showIntro && (
          <span key={combo} className="chip pop-big" style={{ borderColor: 'var(--sun)', color: 'var(--sun-ink)', background: '#FFF1D6', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Icon name="eld" size={14} /> {combo} i rad!
          </span>
        )}
        <span className="chip" style={{ color: 'var(--muted)' }}>
          {showIntro ? 'Pi visar först' : `${PART_LABEL[slot.kind]} · ${moment.title}`}
        </span>
      </div>
      {showIntro ? (
        <PiVisar momentId={slot.momentId} onDone={() => setIntroDone(true)} />
      ) : (
      <TaskRunner
        key={`${index}-${task.ref.seed}`}
        task={task}
        mode="ovning"
        firstTask={index === 0}
        onComplete={handleComplete}
        onNext={advance}
        onScratchHandle={(h) => { scratchHandle.current = h }}
      />
      )}
      </div>

      {/* Mattekompisen Pi — bara i övningspass, aldrig i strider. */}
      {chatAvailable && !showIntro && !chatOpen && (
        <button
          onClick={() => { sfx.whoosh(); setChatOpen(true) }}
          aria-label="Prata med Mattekompisen Pi"
          className="float-soft"
          style={{
            position: 'absolute', right: 16, bottom: 14, zIndex: 15,
            width: 62, height: 62, borderRadius: '50%', background: 'var(--card)',
            border: '3px solid var(--primary)', boxShadow: '0 4px 12px rgba(40,30,80,.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        ><Pi mood="glad" size={40} /></button>
      )}
      {chatAvailable && chatOpen && (
        <ChatPanel
          context={{
            childName: child.name,
            childAge: new Date().getFullYear() - child.birthYear,
            momentTitle: moment.title,
            currentTaskPrompt: task.prompt,
          }}
          getScratch={() => scratchHandle.current?.snapshot()}
          onClose={() => setChatOpen(false)}
        />
      )}
    </div>
  )
}

export function EndCard({ title, text, onDone, buttonText = 'Till kartan ▶', celebrate = false }: {
  title: string; text: string; onDone(): void; buttonText?: string; celebrate?: boolean
}) {
  const store = useStore()
  const hero = store.activeChild?.hero
  // Firandet (fanfar + fyrverkeri) avfyras exakt en gång när kortet visas.
  // En andra, lättare våg strax efter så segern känns rejält episk.
  useEffect(() => {
    if (!celebrate) return
    sfx.fanfar()
    fireConfetti({ power: 1.15 })
    const t = window.setTimeout(() => fireConfetti({ count: 90, power: 0.9 }), 650)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div className="screen-fade" style={{
      minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: 12, padding: 30, textAlign: 'center',
      position: 'relative', overflow: 'hidden',
      // Vid seger byts det lugna pergamentet mot en dramatisk mörk-gyllene
      // scen så strålar, gnistor och guldkonfetti lyser — text blir ljus.
      ...(celebrate ? {
        background: 'radial-gradient(ellipse 92% 82% at 50% 42%, #4A3418 0%, #2A1C0C 52%, #150E05 100%)',
        ...({ '--ink': '#FBF3DE', '--muted': '#E7D3AC' } as React.CSSProperties),
      } : {}),
    }}>
      {celebrate && (
        <>
          {/* Långsamt roterande gyllene strålkrans bakom hjälten. */}
          <div aria-hidden="true" style={{
            position: 'absolute', left: '50%', top: '42%', width: '160vmax', height: '160vmax',
            transform: 'translate(-50%,-50%)', pointerEvents: 'none', zIndex: 0, opacity: 0.55,
            background: 'repeating-conic-gradient(from 0deg at 50% 50%, rgba(255,214,120,.17) 0deg 7deg, rgba(255,214,120,0) 7deg 15deg)',
            maskImage: 'radial-gradient(circle at 50% 50%, #000 0%, #000 28%, transparent 60%)',
            WebkitMaskImage: 'radial-gradient(circle at 50% 50%, #000 0%, #000 28%, transparent 60%)',
            animation: 'ray-spin 46s linear infinite',
          }} />
          {/* Varm glöd i mitten. */}
          <div aria-hidden="true" style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
            background: 'radial-gradient(ellipse 55% 46% at 50% 40%, rgba(255,201,77,.3), rgba(255,201,77,0) 70%)',
          }} />
          {/* Svävande gnistor. */}
          {Array.from({ length: 12 }).map((_, i) => {
            const s = i * 43
            return <span key={i} className="glint" style={{
              left: `${8 + (s * 3) % 84}%`, top: `${12 + (s * 7) % 64}%`,
              width: 8 + (s % 7), height: 8 + (s % 7), zIndex: 1,
              ['--glow' as string]: i % 2 ? '#FFE7A8' : '#FFC94D',
              ['--dur' as string]: `${2 + (s % 4) * 0.6}s`, animationDelay: `${-(s % 5) * 0.4}s`,
            } as React.CSSProperties} />
          })}
        </>
      )}
      <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        {/* Vid seger firar barnets egen hjälte (om vald), annars Pi. */}
        {celebrate && hero
          ? <div className="bounce-in" style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
              <HeroImg kind={hero} variant="figur" style={{ height: 200, width: 'auto', maxWidth: 170, filter: 'drop-shadow(0 8px 14px rgba(0,0,0,.6)) drop-shadow(0 0 26px rgba(255,201,77,.45))' }} />
              <Pi mood="hejar" size={70} />
            </div>
          : <div className="bounce-in"><Pi mood="hejar" size={110} /></div>}
        <h2 className={`pop-big${celebrate ? ' display' : ''}`} style={{
          fontSize: celebrate ? 30 : 26, fontWeight: 900, margin: 0, animationDelay: '0.15s',
          ...(celebrate ? { color: '#FFE7A8', textShadow: '0 2px 4px rgba(45,26,4,.9), 0 0 16px rgba(255,201,77,.5)' } : {}),
        }}>{title}</h2>
        <p style={{ color: 'var(--muted)', fontWeight: 700, maxWidth: 440, margin: 0 }}>{text}</p>
        <button className="btn btn-primary" onClick={onDone} style={{ marginTop: 4 }}>{buttonText}</button>
      </div>
    </div>
  )
}
