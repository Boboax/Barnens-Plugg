import { useEffect, useMemo, useState } from 'react'
import { nextDiagnosisTask, PROBES_PER_PASS, diagnosisBackbone, searchState } from '../../engine/diagnosis'
import { Pi } from '../components/Pi'
import { Icon } from '../components/Icon'
import { TaskRunner, type TaskResult } from '../components/TaskRunner'
import { useStore } from '../store'

/* ============================================================
   Startdiagnosen — "Vi lär känna varandra".

   Inga rätt/fel visas. Adaptiv binärsökning i bakgrunden.
   För yngre barn: tre korta pass över flera dagar.
   ============================================================ */

export function DiagnosisScreen() {
  const store = useStore()
  const child = store.activeChild
  const [started, setStarted] = useState(false)
  const [probesThisPass, setProbesThisPass] = useState(0)
  const [passDone, setPassDone] = useState(false)

  // Uppgiften genereras EN gång per prob och ligger sedan stilla.
  // (Utan memo skulle varje omritning — t.ex. tidräknarens tick var 5:e
  // sekund — dra ett nytt frö och byta siffror mitt framför barnet.)
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
        <Pi mood={diagnosis.done ? 'hejar' : 'glad'} size={100} />
        <h2 style={h2}>Bra jobbat idag!</h2>
        <p style={p}>
          {diagnosis.done
            ? 'Nu känner jag dig! Äventyret i Matteriket väntar.'
            : `Vi ses snart för nästa lär-känna-pass (${diagnosis.passesDone} av ${diagnosis.passesTotal} klara).`}
        </p>
        {diagnosis.done ? (
          <button className="btn btn-primary" onClick={() => store.go('home')}>Till kartan ▶</button>
        ) : (
          <button className="btn btn-primary" onClick={store.leaveChild}>Klart för idag ✔</button>
        )}
      </Card>
    )
  }

  if (!started) {
    return (
      <Card>
        <Pi mood="glad" size={110} />
        <h2 style={h2}>Hej {child.name}! Jag är Pi.</h2>
        <p style={p}>
          Ska vi lära känna varandra? Jag visar några kluringar — vissa är lätta, vissa är svåra,
          och det är precis som det ska. Man kan inte svara fel på att lära känna någon!
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          {Array.from({ length: diagnosis.passesTotal }).map((_, i) => (
            <span key={i} className="chip" style={{ display: 'flex', alignItems: 'center', gap: 5, ...(i < diagnosis.passesDone ? { background: 'var(--mint)', color: '#fff', borderColor: 'var(--mint)' } : i === diagnosis.passesDone ? { borderColor: 'var(--sun)', color: 'var(--sun-ink)' } : {}) }}>
              {i < diagnosis.passesDone ? '✓' : <Icon name={i === diagnosis.passesDone ? 'flagga' : 'grodd'} size={13} />} Pass {i + 1}
            </span>
          ))}
        </div>
        <button className="btn btn-primary" onClick={() => setStarted(true)}>Nu kör vi! ▶</button>
      </Card>
    )
  }

  if (!next) return null // hanteras av useEffect ovan

  const handleComplete = (result: TaskResult): void => {
    store.recordAnswer(next.task, result.correct, result.elapsedMs, 'diagnos', result.given, result.scratchPng)
    store.recordDiagnosisProbe(next.momentId, next.task.ref.level, result.correct)
    // Avgör lokalt om passet är slut (profilen uppdateras asynkront).
    const probes = [...child.diagnosis.probes, { momentId: next.momentId, correct: result.correct, level: next.task.ref.level }]
    const converged = searchState({ ...child.diagnosis, probes }, diagnosisBackbone(), child.schoolYear).converged
    const count = probesThisPass + 1
    if (converged || count >= PROBES_PER_PASS) {
      store.finishDiagnosisPass(converged)
      setPassDone(true)
    } else {
      setProbesThisPass(count)
    }
  }

  return (
    <div className="screen-fade" style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', padding: 'calc(10px + env(safe-area-inset-top)) 16px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <button className="chip" onClick={store.leaveChild}>✕ Paus</button>
        <div className="pbar" style={{ flex: 1 }}>
          <i style={{ width: `${(probesThisPass / PROBES_PER_PASS) * 100}%`, background: 'var(--sun)' }} />
        </div>
        <span className="chip" style={{ color: 'var(--muted)' }}>Vi lär känna varandra</span>
      </div>
      <TaskRunner
        key={`${probesThisPass}-${next.task.ref.seed}`}
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
