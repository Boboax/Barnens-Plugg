import { useMemo, useState } from 'react'
import type { Boss, Task } from '../../domain/types'
import { momentById } from '../../domain/curriculum'
import { worldById } from '../../domain/worlds'
import {
  BOSS_SHIELDS_TO_WIN, BOSS_TASK_COUNT, STAR_CORRECT_TO_WIN, STAR_TASK_COUNT,
  composeBossTasks, composeStarTasks,
} from '../../engine/session'
import { sfx } from '../../sound'
import { Icon } from '../components/Icon'
import { TaskRunner, type TaskResult } from '../components/TaskRunner'
import { worldTheme } from '../worldThemes'
import { EndCard } from './SessionScreen'
import { useStore } from '../store'

/* ============================================================
   Bosstriden (mästarprovet) och stjärnnivån.

   Sköldarna är bossens, inte barnets: rätt svar knäcker en sköld,
   fel svar skadar ingenting. Chatten och ledtrådarna är låsta,
   men kladdytan är alltid tillåten — som papper i skolan.
   Nya uppgifter varje försök. Att fly är alltid okej.
   ============================================================ */

/* Bossfiguren: målad bild (per boss.id) med svävande idle, skakning vid
   träff och besegrad-pose när sista skölden knäcks. Faller tillbaka till
   bossens emoji för bossar som ännu saknar konst. */
function BossFigure({ boss, state }: { boss: Boss; state: 'idle' | 'traffad' | 'besegrad' }) {
  const [broken, setBroken] = useState(false)
  const base = import.meta.env.BASE_URL
  const src = state === 'besegrad'
    ? `${base}art/boss/${boss.id}-besegrad.webp`
    : `${base}art/boss/${boss.id}.webp`
  const anim = state === 'traffad' ? 'shake-hard' : state === 'besegrad' ? 'pop-big' : 'float-soft'
  if (broken) {
    return <span className={anim} style={{ fontSize: 84, lineHeight: 1, display: 'inline-block' }}>{boss.emoji}</span>
  }
  return (
    <img
      src={src}
      alt={boss.name}
      className={anim}
      onError={() => setBroken(true)}
      style={{
        height: 240, width: 'auto', objectFit: 'contain', display: 'block',
        filter: state === 'besegrad'
          ? 'drop-shadow(0 6px 10px rgba(0,0,0,.45))'
          : 'drop-shadow(0 6px 10px rgba(0,0,0,.45)) drop-shadow(0 0 14px rgba(255,180,60,.35))',
      }}
    />
  )
}

export function BattleScreen({ kind }: { kind: 'boss' | 'star' }) {
  const store = useStore()
  const child = store.activeChild
  const momentId = store.battleMomentId
  const tasks = useMemo<Task[]>(
    () => (momentId ? (kind === 'boss' ? composeBossTasks(momentId) : composeStarTasks(momentId)) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [momentId, kind],
  )
  const [index, setIndex] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [flash, setFlash] = useState<'hit' | 'miss' | null>(null)
  const [finished, setFinished] = useState(false)

  if (!child || !momentId) return null
  const moment = momentById(momentId)
  const world = worldById(moment.worldId)
  const boss = world.boss

  const total = kind === 'boss' ? BOSS_TASK_COUNT : STAR_TASK_COUNT
  const needed = kind === 'boss' ? BOSS_SHIELDS_TO_WIN : STAR_CORRECT_TO_WIN
  const won = correct >= needed

  const handleComplete = (result: TaskResult): void => {
    store.recordAnswer(tasks[index], result.correct, result.elapsedMs, kind === 'boss' ? 'boss' : 'stjarna', result.given, result.scratchPng)
    const nextCorrect = correct + (result.correct ? 1 : 0)
    setCorrect(nextCorrect)
    setFlash(result.correct ? 'hit' : 'miss')
    if (result.correct) sfx.skold()
    else sfx.bossFniss()
    window.setTimeout(() => {
      setFlash(null)
      const next = index + 1
      const battleOver = next >= tasks.length || nextCorrect >= needed
      if (battleOver) {
        const victory = nextCorrect >= needed
        if (kind === 'boss') store.finishBoss(momentId, victory)
        else store.finishStar(momentId, victory)
        setFinished(true)
      } else {
        setIndex(next)
      }
    }, 900)
  }

  if (finished) {
    return won ? (
      <EndCard
        title={kind === 'boss' ? `${boss.name} är besegrad!` : 'Stjärnnivån klarad!'}
        text={kind === 'boss' ? `"${boss.defeatLine}" — Momentet ${moment.title} är ditt. Vägen fortsätter!` : `Du klarade de allra svåraste uppgifterna i ${moment.title}. Diamanten är din!`}
        onDone={() => store.go('home')}
        celebrate
      />
    ) : (
      <EndCard
        title={kind === 'boss' ? `${boss.name} står kvar … än!` : 'Nästan vid diamanten!'}
        text={`${correct} av ${total} rätt — du behövde ${needed}. Träna lite till, så tar du det nästa gång. Bossen väntar!`}
        onDone={() => store.go('home')}
        buttonText="Tillbaka och träna"
      />
    )
  }

  const shieldsLeft = Math.max(0, needed - correct)
  const theme = worldTheme(moment.worldId)
  const arenaBg = `${import.meta.env.BASE_URL}art/arena/${moment.worldId}.webp`

  return (
    <div className="screen-fade" style={{
      minHeight: '100%', display: 'flex', flexDirection: 'column', padding: '10px 16px 16px',
      // Målad boss-arena (cover) bakom striden; ljus text ovanpå. Reserv: theme.sky.
      background: `url(${arenaBg}) center / cover no-repeat, ${theme.sky}`,
      position: 'relative', overflow: 'hidden',
      ...({ '--ink': '#F6EFDF', '--muted': '#D9CDB4', '--sun-ink': '#FFE39A' } as React.CSSProperties),
    }}>
      {/* Dramatisk mörkscrim så rubrik/HUD är läsbara mot arenan. */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'linear-gradient(180deg, rgba(15,12,22,.55) 0%, rgba(15,12,22,.22) 20%, rgba(15,12,22,.22) 70%, rgba(15,12,22,.6) 100%)',
      }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 6, flexWrap: 'wrap', position: 'relative', zIndex: 3 }}>
        <button className="chip" onClick={() => store.go('home')}>Fly (försök igen senare)</button>
        <span style={{ fontWeight: 900, fontSize: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name={kind === 'boss' ? 'svards' : 'kristall'} size={18} />
          {kind === 'boss' ? boss.name : `Stjärnnivå: ${moment.title}`}
        </span>
        <span className="chip" style={{ color: 'var(--muted)' }}>Pi vilar under striden</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(180px, 230px)', gap: 12, flex: 1, minHeight: 0, position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ display: 'flex', gap: 5, justifyContent: 'center', marginBottom: 4 }}>
            {Array.from({ length: total }).map((_, i) => (
              <span key={i} style={{
                width: 11, height: 11, borderRadius: '50%',
                background: i < index ? 'var(--primary)' : i === index ? 'var(--sun)' : '#E4DECE',
                boxShadow: i === index ? '0 0 0 3px rgba(255,201,77,.4)' : undefined,
              }} />
            ))}
          </div>
          <div style={{ textAlign: 'center', fontSize: 12.5, fontWeight: 800, color: 'var(--muted)', marginBottom: 4 }}>
            Fråga {index + 1} av {total}
          </div>
          {/* Kladdytan är tillåten på prov — precis som papper i skolan. */}
          <TaskRunner
            key={`${index}-${tasks[index].ref.seed}`}
            task={tasks[index]}
            mode="prov"
            onComplete={handleComplete}
          />
        </div>

        {/* Bossen */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {/* Egen mörk ink: kortet har ljus pergamentbotten, men skärmens
              ljusa --ink skulle annars göra texten osynlig här. */}
          <div className="card" style={{ fontSize: 12.5, fontWeight: 800, textAlign: 'center', padding: '8px 12px', color: '#3A302A' }}>
            {flash === 'hit'
              ? <><Icon name="skold" size={15} style={{ marginRight: 5 }} />En sköld knäcktes!</>
              : flash === 'miss' ? '"Hihi! Inte den här gången!"' : `"${boss.taunt}"`}
          </div>
          {/* Arenan: bossen gör entré, blixt + gnistskärvor vid träff. */}
          <div className="boss-enter" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {flash === 'hit' && (
              <>
                <span key={`flash-${correct}`} className="hit-flash" />
                {Array.from({ length: 8 }).map((_, s) => (
                  <span key={`shard-${correct}-${s}`} className="shard-spoke" style={{ transform: `rotate(${s * 45}deg)` }}>
                    <i style={{ animationDelay: `${s * 0.012}s` }} />
                  </span>
                ))}
              </>
            )}
            {kind === 'boss'
              ? <BossFigure boss={boss} state={won ? 'besegrad' : flash === 'hit' ? 'traffad' : 'idle'} />
              : (
                <span
                  className={flash === 'hit' ? 'shake-hard' : flash === 'miss' ? 'pop-big' : 'float-soft'}
                  style={{ display: 'inline-block', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,.45))' }}
                >
                  <Icon name="kristall" size={92} />
                </span>
              )}
          </div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 200 }}>
            {Array.from({ length: needed }).map((_, i) => (
              <Icon key={i} name="skold" size={22}
                style={{ opacity: i < shieldsLeft ? 1 : 0.25, filter: i < shieldsLeft ? undefined : 'grayscale(1)', transition: 'opacity .3s, filter .3s' }} />
            ))}
          </div>
          <div style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--muted)', textAlign: 'center', maxWidth: 200 }}>
            Varje rätt svar knäcker en sköld — knäck {needed} så {kind === 'boss' ? 'faller bossen' : 'är diamanten din'}!
          </div>
        </div>
      </div>
    </div>
  )
}
