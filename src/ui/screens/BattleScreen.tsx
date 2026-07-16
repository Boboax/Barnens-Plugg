import { useEffect, useMemo, useState } from 'react'
import type { Boss, Moment, Task } from '../../domain/types'
import { momentById } from '../../domain/curriculum'
import { worldById } from '../../domain/worlds'
import {
  CHECK_CORRECT_TO_WIN, CHECK_TASK_COUNT,
  WORLDBOSS_SHIELDS_TO_WIN, WORLDBOSS_TASK_COUNT,
  STAR_CORRECT_TO_WIN, STAR_TASK_COUNT,
  composeCheckTasks, composeWorldBossTasks, composeStarTasks,
} from '../../engine/session'
import { sfx } from '../../sound'
import { fireConfetti } from '../fx/confetti'
import { Icon } from '../components/Icon'
import { Pi } from '../components/Pi'
import { TaskRunner, type TaskResult } from '../components/TaskRunner'
import { worldTheme } from '../worldThemes'
import { EndCard } from './SessionScreen'
import { useStore } from '../store'

/* ============================================================
   Tre slags "prov" — alla utan klocka, fel straffas aldrig,
   kladdytan alltid tillåten (som papper i skolan), nya frön varje gång:

   - 'check': nodens vänliga kunskapskoll ("Visa vad du kan för Pi").
     Pi hejar, du samlar stjärnor. Vinst → noden klar, nästa öppnas.
   - 'boss': VÄRLDSBOSSEN — den stora, sällsynta klimaxstriden i slutet
     av en värld. Bossmonster, sköldar, dramatik.
   - 'star': diamantnivån (nivå 8–10) efter att en nod är klar.
   ============================================================ */

/* Bossfiguren: målad bild (per boss.id) med svävande idle, skakning vid
   träff och besegrad-pose när sista skölden knäcks. Reserv: bossens emoji. */
function BossFigure({ boss, state }: { boss: Boss; state: 'idle' | 'traffad' | 'besegrad' }) {
  const [broken, setBroken] = useState(false)
  const base = import.meta.env.BASE_URL
  const src = state === 'besegrad' ? `${base}art/boss/${boss.id}-besegrad.webp` : `${base}art/boss/${boss.id}.webp`
  const anim = state === 'traffad' ? 'shake-hard' : state === 'besegrad' ? 'pop-big' : 'float-soft'
  if (broken) return <span className={anim} style={{ fontSize: 84, lineHeight: 1, display: 'inline-block' }}>{boss.emoji}</span>
  return (
    <img
      src={src} alt={boss.name} className={anim} onError={() => setBroken(true)}
      style={{
        height: 240, width: 'auto', objectFit: 'contain', display: 'block',
        filter: state === 'besegrad'
          ? 'drop-shadow(0 6px 10px rgba(0,0,0,.45))'
          : 'drop-shadow(0 6px 10px rgba(0,0,0,.45)) drop-shadow(0 0 14px rgba(255,180,60,.35))',
      }}
    />
  )
}

export function BattleScreen({ kind }: { kind: 'check' | 'boss' | 'star' }) {
  const store = useStore()
  const child = store.activeChild
  const momentId = store.battleMomentId
  const worldBossId = store.battleWorldId

  const tasks = useMemo<Task[]>(() => {
    if (kind === 'boss') return worldBossId ? composeWorldBossTasks(worldBossId) : []
    if (!momentId) return []
    return kind === 'check' ? composeCheckTasks(momentId) : composeStarTasks(momentId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [momentId, worldBossId, kind])

  const [index, setIndex] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [flash, setFlash] = useState<'hit' | 'miss' | null>(null)
  const [finished, setFinished] = useState(false)
  const [introDone, setIntroDone] = useState(false)

  const worldId = kind === 'boss' ? worldBossId : (momentId ? momentById(momentId).worldId : undefined)
  if (!child || !worldId || tasks.length === 0) return null
  const world = worldById(worldId)
  const boss = world.boss
  const moment: Moment | undefined = kind !== 'boss' && momentId ? momentById(momentId) : undefined

  // Diamantnivån förklaras en gång när den dyker upp.
  if (kind === 'star' && moment && !child.seenStarIntro && !introDone) {
    return <StarIntro moment={moment} onStart={() => { store.markStarIntroSeen(); setIntroDone(true) }} />
  }

  const friendly = kind === 'check'
  const total = kind === 'boss' ? WORLDBOSS_TASK_COUNT : kind === 'check' ? CHECK_TASK_COUNT : STAR_TASK_COUNT
  const needed = kind === 'boss' ? WORLDBOSS_SHIELDS_TO_WIN : kind === 'check' ? CHECK_CORRECT_TO_WIN : STAR_CORRECT_TO_WIN
  const won = correct >= needed

  const handleComplete = (result: TaskResult): void => {
    store.recordAnswer(tasks[index], result.correct, result.elapsedMs, kind === 'star' ? 'stjarna' : 'boss', result.given, result.scratchPng)
    const nextCorrect = correct + (result.correct ? 1 : 0)
    setCorrect(nextCorrect)
    setFlash(result.correct ? 'hit' : 'miss')
    if (result.correct) friendly ? sfx.ratt() : sfx.skold()
    else friendly ? sfx.klick() : sfx.bossFniss()
    window.setTimeout(() => {
      setFlash(null)
      const next = index + 1
      if (next >= tasks.length || nextCorrect >= needed) {
        const victory = nextCorrect >= needed
        if (kind === 'check') store.finishCheck(momentId!, victory)
        else if (kind === 'boss') store.finishWorldBoss(worldId, victory)
        else store.finishStar(momentId!, victory)
        setFinished(true)
      } else setIndex(next)
    }, 900)
  }

  if (finished) {
    if (kind === 'check') {
      return won
        ? <CheckWin moment={moment!} onDiamond={() => store.startBattle(momentId!, 'star')} onHome={() => store.go('home')} />
        : <EndCard title="Nästan!" text={`${correct} av ${total} rätt — du behövde ${needed}. Träna momentet lite till, så fixar du det nästa gång!`} onDone={() => store.go('home')} buttonText="Tillbaka och träna" />
    }
    if (kind === 'boss') {
      return won
        ? <EndCard title={`${boss.name} är besegrad!`} text={`"${boss.defeatLine}" — ${world.name} är erövrad! Nästa äventyr väntar.`} onDone={() => store.go('home')} celebrate />
        : <EndCard title={`${boss.name} står emot … än!`} text={`${correct} av ${total} rätt — du behövde ${needed}. Träna dina moment lite till och kom tillbaka starkare!`} onDone={() => store.go('home')} buttonText="Tillbaka till kartan" />
    }
    return won
      ? <EndCard title="Diamantnivån klarad!" text={`Du klarade de allra svåraste uppgifterna i ${moment!.title}. Diamanten är din!`} onDone={() => store.go('home')} celebrate />
      : <EndCard title="Nästan vid diamanten!" text={`${correct} av ${total} rätt — du behövde ${needed}. Diamanten väntar — prova igen när du vill!`} onDone={() => store.go('home')} buttonText="Tillbaka till kartan" />
  }

  const filled = Math.min(correct, needed)
  const theme = worldTheme(worldId)
  const bgImg = `${import.meta.env.BASE_URL}art/${friendly ? 'world' : 'arena'}/${worldId}.webp`

  return (
    <div className="screen-fade" style={{
      minHeight: '100%', display: 'flex', flexDirection: 'column',
      padding: 'calc(10px + env(safe-area-inset-top)) 16px 16px',
      background: `url(${bgImg}) center / cover no-repeat, ${theme.sky}`,
      position: 'relative', overflow: 'hidden',
      ...({ '--ink': '#F6EFDF', '--muted': '#E6DAC0', '--sun-ink': '#FFE39A' } as React.CSSProperties),
    }}>
      {/* Scrim: varm och mild för kollen, dramatiskt mörk för världsbossen. */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: friendly
          ? 'linear-gradient(180deg, rgba(52,34,10,.58) 0%, rgba(52,34,10,.4) 30%, rgba(52,34,10,.4) 66%, rgba(52,34,10,.62) 100%)'
          : 'linear-gradient(180deg, rgba(15,12,22,.58) 0%, rgba(15,12,22,.24) 20%, rgba(15,12,22,.24) 70%, rgba(15,12,22,.62) 100%)',
      }} />
      {kind === 'star' && (
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
          background: 'radial-gradient(ellipse 72% 62% at 50% 44%, rgba(120,205,240,.25) 0%, rgba(30,60,110,.12) 45%, rgba(20,30,60,0) 72%)',
        }}>
          {Array.from({ length: 14 }).map((_, i) => {
            const seed = i * 37
            return <span key={i} className="glint" style={{
              left: `${8 + (seed * 3) % 84}%`, top: `${10 + (seed * 7) % 78}%`,
              width: 7 + (seed % 8), height: 7 + (seed % 8),
              ['--glow' as string]: i % 3 === 0 ? '#C8ECFA' : '#8FD4F0',
              ['--dur' as string]: `${2 + (seed % 4) * 0.6}s`, animationDelay: `${-(seed % 5) * 0.4}s`,
            } as React.CSSProperties} />
          })}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 6, flexWrap: 'wrap', position: 'relative', zIndex: 3 }}>
        <button className="chip" onClick={() => store.go('home')}>{friendly ? 'Avbryt' : 'Fly (försök igen senare)'}</button>
        <span style={{ fontWeight: 900, fontSize: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name={kind === 'boss' ? 'svards' : kind === 'star' ? 'kristall' : 'stjarna'} size={18} />
          {kind === 'boss' ? boss.name : kind === 'star' ? `Diamant: ${moment!.title}` : `Visa vad du kan: ${moment!.title}`}
        </span>
        <span className="chip" style={{ color: 'var(--muted)' }}>{friendly ? 'Pi hejar på dig!' : 'Pi vilar under striden'}</span>
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
          <TaskRunner key={`${index}-${tasks[index].ref.seed}`} task={tasks[index]} mode="prov" onComplete={handleComplete} />
        </div>

        {/* Höger: Pi (kollen) eller bossen/kristallen. */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <div className="card" style={{ fontSize: 12.5, fontWeight: 800, textAlign: 'center', padding: '8px 12px', color: '#3A302A' }}>
            {friendly
              ? (flash === 'hit' ? <><Icon name="stjarna" size={15} style={{ marginRight: 5 }} />Bra jobbat!</> : flash === 'miss' ? 'Nästan — fortsätt!' : 'Visa vad du lärt dig!')
              : (flash === 'hit' ? <><Icon name="skold" size={15} style={{ marginRight: 5 }} />En sköld knäcktes!</> : flash === 'miss' ? '"Hihi! Inte den här gången!"' : `"${boss.taunt}"`)}
          </div>
          <div className={friendly ? undefined : 'boss-enter'} style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {flash === 'hit' && !friendly && (
              <>
                <span key={`flash-${correct}`} className="hit-flash" />
                {Array.from({ length: 8 }).map((_, s) => (
                  <span key={`shard-${correct}-${s}`} className="shard-spoke" style={{ transform: `rotate(${s * 45}deg)` }}>
                    <i style={{ animationDelay: `${s * 0.012}s` }} />
                  </span>
                ))}
              </>
            )}
            {friendly
              ? <Pi mood={flash === 'hit' || won ? 'hejar' : flash === 'miss' ? 'funderar' : 'glad'} size={132} />
              : kind === 'boss'
                ? <BossFigure boss={boss} state={won ? 'besegrad' : flash === 'hit' ? 'traffad' : 'idle'} />
                : <span className={flash === 'hit' ? 'shake-hard' : flash === 'miss' ? 'pop-big' : 'float-soft'} style={{ display: 'inline-block', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,.45))' }}><Icon name="kristall" size={92} /></span>}
          </div>
          {/* Framsteg: stjärnor för kollen, sköldar för boss/diamant. */}
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 200 }}>
            {Array.from({ length: needed }).map((_, i) => (
              <Icon key={i} name={friendly ? 'stjarna' : 'skold'} size={22}
                style={{ opacity: friendly ? (i < filled ? 1 : 0.28) : (i < needed - filled ? 1 : 0.25), filter: (friendly ? i < filled : i < needed - filled) ? undefined : 'grayscale(1)', transition: 'opacity .3s, filter .3s' }} />
            ))}
          </div>
          <div style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--muted)', textAlign: 'center', maxWidth: 200 }}>
            {friendly
              ? `Samla ${needed} stjärnor så är noden klar!`
              : `Varje rätt svar knäcker en sköld — knäck ${needed} så ${kind === 'boss' ? 'faller bossen' : 'är diamanten din'}!`}
          </div>
        </div>
      </div>
    </div>
  )
}

/* Nodens seger: momentet klart. Pi hejar och REKOMMENDERAR diamanten innan
   man går vidare (en frivillig extrautmaning), men "Gå vidare" finns alltid. */
function CheckWin({ moment, onDiamond, onHome }: { moment: Moment; onDiamond(): void; onHome(): void }) {
  useEffect(() => {
    sfx.fanfar()
    fireConfetti({ power: 1 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div className="screen-fade" style={{
      minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 14, padding: 30, textAlign: 'center', position: 'relative', overflow: 'hidden',
      background: 'radial-gradient(ellipse 92% 82% at 50% 42%, #2E5A3E 0%, #1C3A28 55%, #0F2018 100%)',
      ...({ '--ink': '#EAFBF1', '--muted': '#C6E6D2' } as React.CSSProperties),
    }}>
      <div className="bounce-in"><Pi mood="hejar" size={116} /></div>
      <h2 className="pop-big display" style={{ fontSize: 27, fontWeight: 900, margin: 0, color: '#BFF3D2', textShadow: '0 2px 6px rgba(0,25,12,.8)' }}>
        {moment.title} är klart!
      </h2>
      <p style={{ color: 'var(--ink)', fontWeight: 700, margin: 0, maxWidth: 440, lineHeight: 1.5 }}>
        Grymt jobbat — du klarade Pis koll! Noden lyser nu grön och nästa nod öppnas på kartan.
      </p>
      {/* Diamant-rekommendation innan man går vidare. */}
      <div className="card" style={{ maxWidth: 440, display: 'flex', gap: 10, alignItems: 'center', textAlign: 'left', color: '#2A3A2E' }}>
        <span className="float-soft" style={{ display: 'inline-block', flexShrink: 0, filter: 'drop-shadow(0 0 10px rgba(143,212,240,.7))' }}>
          <Icon name="kristall" size={40} />
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.4 }}>
          <b>Vågar du diamantnivån?</b> De allra klurigaste uppgifterna — en extra utmaning innan du går vidare. Ingen klocka, fel gör inget.
        </span>
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button className="btn btn-primary" onClick={onDiamond} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Icon name="kristall" size={16} /> Testa diamanten!
        </button>
        <button className="btn btn-quiet" onClick={onHome}>Gå vidare</button>
      </div>
    </div>
  )
}

/* Pi förklarar diamantnivån första gången den dyker upp. */
function StarIntro({ moment, onStart }: { moment: Moment; onStart: () => void }) {
  return (
    <div className="screen-fade" style={{
      minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 14, padding: 30, textAlign: 'center', position: 'relative', overflow: 'hidden',
      background: 'radial-gradient(ellipse 92% 82% at 50% 42%, #16324F 0%, #0E1F36 55%, #081019 100%)',
      ...({ '--ink': '#EAF6FF', '--muted': '#AFC9DE' } as React.CSSProperties),
    }}>
      {Array.from({ length: 12 }).map((_, i) => {
        const s = i * 37
        return <span key={i} className="glint" aria-hidden="true" style={{
          left: `${8 + (s * 3) % 84}%`, top: `${10 + (s * 7) % 74}%`,
          width: 7 + (s % 7), height: 7 + (s % 7), zIndex: 1,
          ['--glow' as string]: i % 3 === 0 ? '#C8ECFA' : '#8FD4F0',
          ['--dur' as string]: `${2 + (s % 4) * 0.6}s`, animationDelay: `${-(s % 5) * 0.4}s`,
        } as React.CSSProperties} />
      })}
      <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, maxWidth: 470 }}>
        <div className="bounce-in" style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
          <span className="float-soft" style={{ display: 'inline-block', filter: 'drop-shadow(0 0 16px rgba(143,212,240,.7))' }}>
            <Icon name="kristall" size={82} />
          </span>
          <Pi mood="glad" size={68} />
        </div>
        <h2 className="pop-big display" style={{ fontSize: 28, fontWeight: 900, margin: 0, color: '#C8ECFA', textShadow: '0 2px 6px rgba(0,20,40,.85)' }}>
          Diamantnivån!
        </h2>
        <p style={{ color: 'var(--ink)', fontWeight: 700, margin: 0, lineHeight: 1.5 }}>
          Snyggt jobbat — du har klarat <b>{moment.title}</b>! Nu öppnas <b>diamantnivån</b>: de allra klurigaste
          uppgifterna, för dig som vill utmana dig själv lite extra. Ingen klocka, och fel gör ingenting.
          Klara {STAR_CORRECT_TO_WIN} av {STAR_TASK_COUNT} så är diamanten din!
        </p>
        <button className="btn btn-primary" onClick={onStart}>Jag är redo ▶</button>
      </div>
    </div>
  )
}
