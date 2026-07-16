import { useEffect, useMemo, useRef, useState } from 'react'
import { nextDiagnosisTask, diagnosisBackbone, searchState, DIAGNOSIS_MAX_MS } from '../../engine/diagnosis'
import { Pi } from '../components/Pi'
import { TaskRunner, type TaskResult } from '../components/TaskRunner'
import { useStore } from '../store'

/* ============================================================
   Startdiagnosen — "Vi lär känna varandra".

   Inga rätt/fel visas. Adaptiv trappstegsmetod (staircase) i bakgrunden:
   börjar lätt, blir svårare tills barnets tak hittas. Ett sammanhängande
   pass med mjuk 10-minuters-gräns — ingen fast provmängd.
   ============================================================ */

export function DiagnosisScreen() {
  const store = useStore()
  const child = store.activeChild
  const [started, setStarted] = useState(false)
  const [passDone, setPassDone] = useState(false)
  const startRef = useRef(Date.now())

  // Uppgiften genereras EN gång per prob och ligger sedan stilla.
  // (Utan memo skulle varje omritning — t.ex. tidräknarens tick — dra ett
  // nytt frö och byta siffror mitt framför barnet.)
  const probeCount = child?.diagnosis.probes.length ?? 0
  const next = useMemo(
    () => (child && !child.diagnosis.done ? nextDiagnosisTask(child) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [child?.id, probeCount, child?.diagnosis.done],
  )

  // Kantfall: sökningen konvergerade i ett tidigare (avbrutet) pass.
  const strandedConverged = Boolean(child && !child.diagnosis.done && next === null && !passDone)
  useEffect(() => {
    if (strandedConverged) {
      store.finishDiagnosisPass(true)
      setPassDone(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strandedConverged])

  if (!child) return null
  const { diagnosis } = child

  if (diagnosis.done && !passDone) {
    return (
      <Card>
        <Pi mood="hejar" size={100} />
        <h2 style={h2}>Nu känner jag dig, {child.name}!</h2>
        <p style={p}>Jag vet precis var vi ska börja. Kom så drar vi ut på äventyret i Matteriket!</p>
        <button className="btn btn-primary" onClick={() => store.go('home')}>Till kartan ▶</button>
      </Card>
    )
  }

  if (passDone) {
    return (
      <Card>
        <Pi mood="hejar" size={100} />
        <h2 style={h2}>Nu känner jag dig, {child.name}!</h2>
        <p style={p}>Jag hittade precis rätt nivå för dig. Äventyret i Matteriket väntar!</p>
        <button className="btn btn-primary" onClick={() => store.go('home')}>Till kartan ▶</button>
      </Card>
    )
  }

  if (!started) {
    return (
      <Card>
        <Pi mood="glad" size={110} />
        <h2 style={h2}>Hej {child.name}! Jag är Pi.</h2>
        <p style={p}>
          Ska vi lära känna varandra? Jag visar kluringar som börjar lätt och blir klurigare
          allt eftersom — tills jag vet precis var vi ska börja. Vissa blir svåra, och det är
          precis som det ska. Man kan inte svara fel på att lära känna någon!
        </p>
        <button className="btn btn-primary" onClick={() => { startRef.current = Date.now(); setStarted(true) }}>Nu kör vi! ▶</button>
      </Card>
    )
  }

  if (!next) return null // hanteras av useMemo ovan

  const handleComplete = (result: TaskResult): void => {
    store.recordAnswer(next.task, result.correct, result.elapsedMs, 'diagnos', result.given, result.scratchPng)
    store.recordDiagnosisProbe(next.momentId, next.task.ref.level, result.correct)
    // Avgör lokalt om diagnosen är klar (profilen uppdateras asynkront):
    // taket hittat (tillräckligt många vändpunkter) ELLER den mjuka tidsgränsen.
    const probes = [...child.diagnosis.probes, { momentId: next.momentId, correct: result.correct, level: next.task.ref.level }]
    const s = searchState({ ...child.diagnosis, probes }, diagnosisBackbone(), child.schoolYear)
    const timeUp = Date.now() - startRef.current >= DIAGNOSIS_MAX_MS
    if (s.converged || timeUp) {
      store.finishDiagnosisPass(s.converged)
      setPassDone(true)
    }
    // annars: nästa prob räknas fram automatiskt när probeCount ändras.
  }

  // Vänlig, neutral framdriftskänsla (avslöjar aldrig rätt/fel). Ökar med
  // antalet frågor men taket 92 % så den inte ser "klar" ut i förtid.
  const progress = Math.min(0.92, probeCount / 22)

  return (
    <div className="screen-fade" style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', padding: 'calc(10px + env(safe-area-inset-top)) 16px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <button className="chip" onClick={store.leaveChild}>✕ Paus</button>
        <div className="pbar" style={{ flex: 1 }}>
          <i style={{ width: `${progress * 100}%`, background: 'var(--sun)' }} />
        </div>
        <span className="chip" style={{ color: 'var(--muted)' }}>Vi lär känna varandra</span>
      </div>
      <TaskRunner
        key={`${probeCount}-${next.task.ref.seed}`}
        task={next.task}
        mode="diagnos"
        onComplete={handleComplete}
      />
    </div>
  )
}

const h2: React.CSSProperties = { fontSize: 26, fontWeight: 900, margin: 0, textAlign: 'center' }
const p: React.CSSProperties = { color: 'var(--muted)', fontWeight: 700, maxWidth: 440, margin: 0, textAlign: 'center' }

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="screen-fade" style={{
      minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: 14, padding: 30,
      background: 'radial-gradient(circle at 50% 12%, #FFEFC9 0%, var(--bg) 60%)',
    }}>{children}</div>
  )
}
