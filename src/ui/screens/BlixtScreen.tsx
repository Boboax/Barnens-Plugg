import { useEffect, useRef, useState } from 'react'
import type { Task } from '../../domain/types'
import { BLIXT_SECONDS, blixtConfig, blixtTarget, blixtTask } from '../../engine/blixt'
import { sfx } from '../../sound'
import { fireConfetti } from '../fx/confetti'
import { Keypad } from '../components/Keypad'
import { Pi } from '../components/Pi'
import { useStore } from '../store'

/* ============================================================
   Blixtpasset — skolans minuttest som tävling mot sig själv.

   60 sekunder, så många rätt som möjligt. Fel svar kostar inget
   (räknas bara inte). Skolans mål visas som en ribba på vägen,
   rekordet är det man jagar. Snabbt flöde: svara → nästa direkt.
   ============================================================ */

type Phase = 'intro' | 'running' | 'done'

export function BlixtScreen() {
  const store = useStore()
  const child = store.activeChild
  const kind = store.blixtKind
  const [phase, setPhase] = useState<Phase>('intro')
  const [task, setTask] = useState<Task | null>(null)
  const [value, setValue] = useState('')
  const [secondsLeft, setSecondsLeft] = useState(BLIXT_SECONDS)
  const [correct, setCorrect] = useState(0)
  const [attempted, setAttempted] = useState(0)
  const [flash, setFlash] = useState<'ratt' | 'fel' | null>(null)
  const taskStartedAt = useRef(Date.now())
  const resultSaved = useRef(false)
  // Rekordet FÖRE sprinten — profilen uppdateras när resultatet sparas,
  // så jämförelsen måste utgå från det gamla värdet.
  const bestBefore = useRef(0)

  // Nedräkningen.
  useEffect(() => {
    if (phase !== 'running') return
    const interval = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          window.clearInterval(interval)
          setPhase('done')
          return 0
        }
        if (s <= 6) sfx.tick() // sista sekunderna tickar
        return s - 1
      })
    }, 1000)
    return () => window.clearInterval(interval)
  }, [phase])

  // Spara resultatet exakt en gång när tiden är slut — och fira!
  useEffect(() => {
    if (phase === 'done' && kind && !resultSaved.current) {
      resultSaved.current = true
      store.recordBlixtResult(kind, correct)
      const target = blixtTarget(kind, store.household.blixtTargets)
      if (correct > bestBefore.current || correct >= target) {
        sfx.rekord()
        fireConfetti({ count: 110 })
      } else {
        sfx.ratt()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  if (!child || !kind) return null
  const cfg = blixtConfig(kind)
  const target = blixtTarget(kind, store.household.blixtTargets)
  const previousBest = child.blixt?.[kind]?.best ?? 0

  const start = (): void => {
    bestBefore.current = child.blixt?.[kind]?.best ?? 0
    resultSaved.current = false
    sfx.whoosh()
    setPhase('running')
    setCorrect(0)
    setAttempted(0)
    setSecondsLeft(BLIXT_SECONDS)
    setValue('')
    setTask(blixtTask(kind, child))
    taskStartedAt.current = Date.now()
  }

  const submit = (): void => {
    if (!task || task.answer.kind !== 'numeric' || value === '') return
    const given = Number(value.replace('−', '-').replace(',', '.'))
    const isCorrect = Math.abs(given - task.answer.value) < 1e-9
    store.recordAnswer(task, isCorrect, Date.now() - taskStartedAt.current, 'blixt', given)
    setCorrect((n) => n + (isCorrect ? 1 : 0))
    setAttempted((n) => n + 1)
    setFlash(isCorrect ? 'ratt' : 'fel')
    window.setTimeout(() => setFlash(null), 250)
    setValue('')
    setTask(blixtTask(kind, child))
    taskStartedAt.current = Date.now()
  }

  if (phase === 'intro') {
    return (
      <Center>
        <span style={{ fontSize: 54 }}>{cfg.emoji}</span>
        <h2 style={h2}>Blixtpass: {cfg.title}</h2>
        <p style={pStyle}>
          En minut — så många rätt du hinner! Fel kostar ingenting, de räknas bara inte.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          <span className="chip">🏅 Ditt rekord: {previousBest || '–'}</span>
          <span className="chip">🎯 Skolans mål: {target}</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-quiet" onClick={() => store.go('home')}>← Tillbaka</button>
          <button className="btn btn-primary" onClick={start}>Kör! ⚡</button>
        </div>
      </Center>
    )
  }

  if (phase === 'done') {
    const newRecord = correct > bestBefore.current
    const hitTarget = correct >= target
    return (
      <Center>
        <Pi mood="hejar" size={100} />
        <h2 style={h2}>
          {correct} rätt på en minut{newRecord ? ' — NYTT REKORD! 🏅' : '!'}
        </h2>
        <p style={pStyle}>
          {hitTarget
            ? `Du klarade skolans mål (${target})! 🎯🎉`
            : `${target - correct} kvar till skolans mål (${target}) — du är på väg!`}
          {attempted > correct ? ` (${attempted - correct} fel räknades inte — helt okej!)` : ''}
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-quiet" onClick={() => store.go('home')}>Till kartan</button>
          <button className="btn btn-primary" onClick={start}>En gång till! ⚡</button>
        </div>
      </Center>
    )
  }

  const progress = secondsLeft / BLIXT_SECONDS

  return (
    <div className="screen-fade" style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 16px 16px', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', maxWidth: 620 }}>
        <span style={{ fontSize: 20 }}>{cfg.emoji}</span>
        <div className="pbar" style={{ flex: 1, height: 14 }}>
          <i style={{ width: `${progress * 100}%`, background: secondsLeft <= 10 ? 'var(--coral)' : 'var(--sun)', transition: 'width 1s linear' }} />
        </div>
        <span style={{ fontWeight: 900, fontSize: 20, fontVariantNumeric: 'tabular-nums', minWidth: 44, textAlign: 'right' }}>{secondsLeft}s</span>
      </div>
      <div style={{ display: 'flex', gap: 14, fontWeight: 800, fontSize: 14, color: 'var(--muted)' }}>
        <span>✅ {correct} rätt</span>
        <span>🎯 mål {target}</span>
        {previousBest > 0 && <span>🏅 rekord {previousBest}</span>}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <p style={{ fontSize: 48, fontWeight: 900, margin: 0, letterSpacing: 1 }}>{task?.prompt.replace(' = ?', ' =')}</p>
        <div style={{
          minWidth: 160, minHeight: 64, display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `3px dashed ${flash === 'ratt' ? 'var(--mint)' : flash === 'fel' ? 'var(--coral)' : 'var(--primary)'}`,
          borderRadius: 16, padding: '4px 20px', fontSize: 38, fontWeight: 900,
          color: 'var(--primary)', background: 'var(--card)', transition: 'border-color 0.15s',
        }}>{value || '\u00A0'}</div>
        <Keypad value={value} onChange={setValue} onSubmit={submit} size="stor" />
      </div>
    </div>
  )
}

const h2: React.CSSProperties = { fontSize: 26, fontWeight: 900, margin: 0, textAlign: 'center' }
const pStyle: React.CSSProperties = { color: 'var(--muted)', fontWeight: 700, maxWidth: 440, margin: 0, textAlign: 'center' }

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div className="screen-fade" style={{
      minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: 14, padding: 30,
    }}>{children}</div>
  )
}
