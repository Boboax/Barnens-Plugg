import { useEffect, useRef, useState } from 'react'
import type { Task } from '../../domain/types'
import {
  BLIXT_SECONDS, BLIXT_UNTIMED_COUNT, BLIXT_UNTIMED_PASS,
  blixtConfig, blixtTarget, blixtTask, blixtTimed,
} from '../../engine/blixt'
import { sfx } from '../../sound'
import { fireConfetti } from '../fx/confetti'
import { Keypad } from '../components/Keypad'
import { Pi } from '../components/Pi'
import { Icon } from '../components/Icon'
import { useStore } from '../store'

/* ============================================================
   Blixtpasset — flyt-träning, nu en KRAV-grind (måste klaras för
   att gå vidare), men aldrig straffande: obegränsade omförsök.

   Från åk 1: skolans minuttest (60 s, synlig klocka).
   FK: ingen synlig klocka — en liten mängd frågor, "gör så snabbt
   du kan". Tiden mäts i det tysta (för föräldern), barnet ser den ej.
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
  const roundStartedAt = useRef(Date.now())
  const resultSaved = useRef(false)
  const clearedBefore = useRef(false)

  // Tidssatt för åk 1+; FK kör utan klocka (fast antal frågor).
  const timed = child ? blixtTimed(child.schoolYear) : true

  // Nedräkning (bara i tidssatt läge).
  useEffect(() => {
    if (phase !== 'running' || !timed) return
    const interval = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) { window.clearInterval(interval); setPhase('done'); return 0 }
        if (s <= 6) sfx.tick()
        return s - 1
      })
    }, 1000)
    return () => window.clearInterval(interval)
  }, [phase, timed])

  // Spara resultatet exakt en gång när rundan är slut — och fira om klarat.
  useEffect(() => {
    if (phase === 'done' && kind && !resultSaved.current) {
      resultSaved.current = true
      const cleared = timed
        ? correct >= blixtTarget(kind, store.household.blixtTargets)
        : correct >= BLIXT_UNTIMED_PASS
      const elapsedMs = Date.now() - roundStartedAt.current
      store.recordBlixtResult(kind, correct, cleared, timed ? undefined : elapsedMs)
      if (cleared) { sfx.rekord(); fireConfetti({ count: 110 }) } else { sfx.ratt() }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  if (!child || !kind) return null
  const cfg = blixtConfig(kind)
  const target = blixtTarget(kind, store.household.blixtTargets)
  const previousBest = child.blixt?.[kind]?.best ?? 0
  const alreadyCleared = child.blixt?.[kind]?.cleared ?? false

  const start = (): void => {
    clearedBefore.current = child.blixt?.[kind]?.cleared ?? false
    resultSaved.current = false
    sfx.whoosh()
    setPhase('running')
    setCorrect(0)
    setAttempted(0)
    setSecondsLeft(BLIXT_SECONDS)
    setValue('')
    setTask(blixtTask(kind, child))
    taskStartedAt.current = Date.now()
    roundStartedAt.current = Date.now()
  }

  const submit = (): void => {
    if (!task || task.answer.kind !== 'numeric' || value === '') return
    const given = Number(value.replace('−', '-').replace(',', '.'))
    const isCorrect = Math.abs(given - task.answer.value) < 1e-9
    store.recordAnswer(task, isCorrect, Date.now() - taskStartedAt.current, 'blixt', given)
    const nextAttempted = attempted + 1
    setCorrect((n) => n + (isCorrect ? 1 : 0))
    setAttempted(nextAttempted)
    setFlash(isCorrect ? 'ratt' : 'fel')
    window.setTimeout(() => setFlash(null), 250)
    setValue('')
    // FK: rundan tar slut efter ett fast antal frågor (ingen klocka).
    if (!timed && nextAttempted >= BLIXT_UNTIMED_COUNT) { setPhase('done'); return }
    setTask(blixtTask(kind, child))
    taskStartedAt.current = Date.now()
  }

  if (phase === 'intro') {
    return (
      <Center>
        <Icon name="blixt" size={54} />
        <h2 style={h2}>Blixtpass: {cfg.title}</h2>
        <p style={pStyle}>
          {timed
            ? 'En minut — så många rätt du hinner! Fel kostar ingenting, de räknas bara inte.'
            : `Gör så snabbt du kan! ${BLIXT_UNTIMED_COUNT} frågor — klara ${BLIXT_UNTIMED_PASS} rätt så öppnas vägen vidare. Ingen klocka, fel gör inget.`}
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          <span className="chip" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name="pokal" size={14} /> Ditt rekord: {previousBest || '–'}</span>
          <span className="chip">{timed ? `Mål: ${target}` : `Klara: ${BLIXT_UNTIMED_PASS} av ${BLIXT_UNTIMED_COUNT}`}</span>
          {alreadyCleared && <span className="chip" style={{ color: 'var(--mint)' }}>✓ redan klarad</span>}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-quiet" onClick={() => store.go('home')}>← Tillbaka</button>
          <button className="btn btn-primary" onClick={start}>Kör!</button>
        </div>
      </Center>
    )
  }

  if (phase === 'done') {
    const cleared = timed ? correct >= target : correct >= BLIXT_UNTIMED_PASS
    const newlyOpened = cleared && !clearedBefore.current
    return (
      <Center>
        <Pi mood="hejar" size={100} />
        <h2 style={h2}>
          {timed
            ? `${correct} rätt på en minut${correct > previousBest ? ' — NYTT REKORD!' : '!'}`
            : `${correct} av ${attempted} rätt!`}
        </h2>
        <p style={pStyle}>
          {cleared
            ? newlyOpened
              ? 'Grymt — du klarade flyt-provet! Vägen vidare är öppen. ✓'
              : 'Klarat igen — snyggt flyt! Vill du slå ditt rekord?'
            : timed
              ? `${Math.max(0, target - correct)} kvar till målet (${target}). Träna lite till och försök igen — du är på väg!`
              : `Nästan! Klara ${BLIXT_UNTIMED_PASS} rätt så öppnas vägen. Försök igen när du vill — det gör inget att det tar tid.`}
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-quiet" onClick={() => store.go('home')}>Till kartan</button>
          <button className="btn btn-primary" onClick={start}>{cleared ? 'En gång till!' : 'Försök igen!'}</button>
        </div>
      </Center>
    )
  }

  const progress = timed ? secondsLeft / BLIXT_SECONDS : attempted / BLIXT_UNTIMED_COUNT

  return (
    <div className="screen-fade" style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 'calc(12px + env(safe-area-inset-top)) 16px 16px', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', maxWidth: 620 }}>
        <Icon name="blixt" size={20} />
        <div className="pbar" style={{ flex: 1, height: 14 }}>
          <i style={{ width: `${progress * 100}%`, background: timed && secondsLeft <= 10 ? 'var(--coral)' : 'var(--sun)', transition: timed ? 'width 1s linear' : 'width .2s' }} />
        </div>
        <span style={{ fontWeight: 900, fontSize: 20, fontVariantNumeric: 'tabular-nums', minWidth: 44, textAlign: 'right' }}>
          {timed ? `${secondsLeft}s` : `${attempted}/${BLIXT_UNTIMED_COUNT}`}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 14, fontWeight: 800, fontSize: 14, color: 'var(--muted)' }}>
        <span>{correct} rätt</span>
        <span>{timed ? `mål ${target}` : `klara ${BLIXT_UNTIMED_PASS}`}</span>
        {previousBest > 0 && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="pokal" size={13} /> rekord {previousBest}</span>}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <p style={{ fontSize: 48, fontWeight: 900, margin: 0, letterSpacing: 1 }}>{task?.prompt.replace(' = ?', ' =')}</p>
        <div style={{
          minWidth: 160, minHeight: 64, display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `3px dashed ${flash === 'ratt' ? 'var(--mint)' : flash === 'fel' ? 'var(--coral)' : 'var(--primary)'}`,
          borderRadius: 16, padding: '4px 20px', fontSize: 38, fontWeight: 900,
          color: 'var(--primary)', background: 'var(--card)', transition: 'border-color 0.15s',
        }}>{value || ' '}</div>
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
      background: 'radial-gradient(ellipse 120% 60% at 50% 8%, #FFEFC9 0%, var(--bg) 58%)',
    }}>{children}</div>
  )
}
