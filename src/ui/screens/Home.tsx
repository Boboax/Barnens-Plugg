import { useMemo, useRef, useState } from 'react'
import type { ChildProfile, Moment, SkillState } from '../../domain/types'
import { momentsInWorld, momentById } from '../../domain/curriculum'
import { WORLDS, worldById } from '../../domain/worlds'
import { hasGenerator } from '../../generators'
import { currentMomentId } from '../../engine/progress'
import { dueForReview } from '../../engine/spaced-repetition'
import { rewardProgress } from '../../engine/rewards'
import { Pi } from '../components/Pi'
import { todayISO, useStore } from '../store'

/* ============================================================
   Hemskärmen — resan genom Matteriket.

   Vänster: världens väg med noder (stjärnor, flagga, boss, lås).
   Höger: Dagens pass, belöningsmål och tid kvar.
   Den gula knappen är alltid nästa steg.
   ============================================================ */

type NodeState = 'done' | 'star' | 'now' | 'boss' | 'locked' | 'coming'

function nodeState(moment: Moment, skill: SkillState | undefined, isCurrent: boolean): NodeState {
  if (!hasGenerator(moment.generatorId)) return 'coming'
  if (!skill) return 'locked'
  if (skill.mastery === 'star') return 'star'
  if (skill.mastery === 'mastered') return 'done'
  if (skill.mastery === 'boss-ready') return 'boss'
  if (isCurrent || skill.mastery === 'in-progress' || skill.mastery === 'needs-review') return 'now'
  if (skill.mastery === 'available') return 'now'
  return 'locked'
}

const NODE_STYLE: Record<NodeState, { bg: string; label: string }> = {
  done: { bg: 'var(--mint)', label: '★' },
  star: { bg: 'var(--mint)', label: '★' },
  now: { bg: 'var(--sun)', label: '🚩' },
  boss: { bg: 'var(--boss)', label: '⚔️' },
  locked: { bg: '#D8D4C8', label: '🔒' },
  coming: { bg: '#D8D4C8', label: '🌱' },
}

export function Home() {
  const store = useStore()
  const child = store.activeChild
  if (!child) return null
  return <HomeInner child={child} />
}

function HomeInner({ child }: { child: ChildProfile }) {
  const store = useStore()
  const currentId = useMemo(() => currentMomentId(child), [child])
  const currentMoment = currentId ? momentById(currentId) : undefined
  const [worldId, setWorldId] = useState(currentMoment?.worldId ?? WORLDS[0].id)
  const world = worldById(worldId)
  const moments = momentsInWorld(worldId)

  const masteredInWorld = moments.filter((m) => {
    const s = child.skills[m.id]
    return s?.mastery === 'mastered' || s?.mastery === 'star'
  }).length
  const chapter = world.chapters[Math.min(masteredInWorld, world.chapters.length - 1)]

  const due = dueForReview(child.skills, todayISO()).length
  const secondsLeft = store.secondsLeftToday(child)
  const minutesLeft = Math.ceil(secondsLeft / 60)

  const rewards = store.household.rewards.filter((r) => r.childId === child.id && !r.redeemedAt)

  // Scrolla kartan till barnets aktuella nod vid första visningen.
  const hasScrolled = useRef(false)
  const scrollToCurrent = (el: HTMLButtonElement | null): void => {
    if (el && !hasScrolled.current) {
      hasScrolled.current = true
      el.scrollIntoView({ block: 'center' })
    }
  }

  const startTraining = (): void => {
    if (secondsLeft <= 0) return store.go('time-up')
    store.go('session')
  }

  return (
    <div className="screen-fade" style={{ minHeight: '100%', display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(260px, 330px)', gap: 0 }}>
      {/* Kartan */}
      <div style={{ padding: '14px 18px', background: 'linear-gradient(180deg, #EAF6EE 0%, var(--bg) 85%)', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button className="chip" onClick={store.leaveChild}>← Byt spelare</button>
          <span style={{ fontWeight: 900, fontSize: 17 }}>{world.emoji} {world.name}</span>
          <span className="chip">🔥 {child.streak.days} {child.streak.days === 1 ? 'dag' : 'dagar'} i rad</span>
        </div>

        <div style={{
          margin: '10px 0 4px', background: '#FFF8E6', border: '2px solid #F2E3B8', borderRadius: 12,
          padding: '8px 13px', fontSize: 13.5, fontWeight: 700, color: 'var(--sun-ink)', lineHeight: 1.45,
        }}>📜 {chapter}</div>

        {/* Vägen */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 6px' }}>
          <div style={{ display: 'flex', flexDirection: 'column-reverse', gap: 18, maxWidth: 460, margin: '0 auto' }}>
            {moments.map((moment, i) => {
              const skill = child.skills[moment.id]
              const state = nodeState(moment, skill, moment.id === currentId)
              const style = NODE_STYLE[state]
              const isStar = state === 'star'
              const clickable = state === 'now' || state === 'boss' || state === 'done' || isStar
              const onClick = (): void => {
                if (secondsLeft <= 0) return store.go('time-up')
                if (state === 'boss') store.startBattle(moment.id, 'boss')
                else if (state === 'done') store.startBattle(moment.id, 'star')
                else if (state === 'now' && moment.id === currentId) store.go('session')
              }
              return (
                <button
                  key={moment.id}
                  ref={moment.id === currentId ? scrollToCurrent : undefined}
                  onClick={onClick}
                  disabled={!clickable}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14, fontFamily: 'inherit', textAlign: 'left',
                    alignSelf: i % 2 === 0 ? 'flex-start' : 'flex-end',
                    opacity: state === 'locked' || state === 'coming' ? 0.65 : 1,
                  }}
                >
                  <span style={{
                    position: 'relative', width: state === 'now' ? 62 : 52, height: state === 'now' ? 62 : 52,
                    borderRadius: '50%', background: style.bg, color: '#fff', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: state === 'now' ? 24 : 20, fontWeight: 900,
                    boxShadow: state === 'now'
                      ? '0 0 0 4px #fff, 0 0 0 9px rgba(255,201,77,.35), 0 4px 0 rgba(0,0,0,.15)'
                      : state === 'boss'
                        ? '0 0 0 5px rgba(140,107,200,.28), 0 4px 0 rgba(0,0,0,.15)'
                        : '0 4px 0 rgba(0,0,0,.12)',
                  }}>
                    {style.label}
                    {isStar && <span style={{ position: 'absolute', top: -8, right: -8, fontSize: 17 }}>💎</span>}
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontWeight: 800, fontSize: 14, color: state === 'now' ? 'var(--sun-ink)' : 'var(--ink)' }}>
                      {moment.title}
                    </span>
                    <span style={{ display: 'block', fontWeight: 600, fontSize: 12, color: 'var(--muted)' }}>
                      {state === 'coming' ? 'kommer snart'
                        : state === 'boss' ? `Utmana ${world.boss.name}!`
                        : state === 'done' ? 'klar! (tryck för stjärnnivån 💎)'
                        : isStar ? 'stjärnnivå klarad!'
                        : state === 'locked' ? 'kräver tidigare moment'
                        : moment.description}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Världsväxlare */}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', paddingTop: 6 }}>
          {WORLDS.map((w) => (
            <button
              key={w.id}
              className="chip"
              onClick={() => setWorldId(w.id)}
              style={worldId === w.id ? { borderColor: 'var(--primary)', color: 'var(--primary)' } : { color: 'var(--muted)' }}
            >{w.emoji} {w.name.split(' ')[0]}</button>
          ))}
        </div>
      </div>

      {/* Sidopanelen */}
      <aside style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 38, height: 38, borderRadius: '50%', background: child.color, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 17,
          }}>{child.name.charAt(0).toUpperCase()}</span>
          <span style={{ fontWeight: 900, fontSize: 17 }}>Hej {child.name}! 👋</span>
        </div>

        <div className="card">
          <div style={{ fontWeight: 900, fontSize: 15, marginBottom: 6 }}>📚 Dagens pass · ca 15 min</div>
          <Row label="Uppvärmning: repetition" tag={due > 0 ? `${due} moment` : 'kort'} tagColor="rep" />
          <Row label={currentMoment ? currentMoment.title : 'Fritt läge'} tag="nytt" tagColor="new" />
          <Row label="Blandade uppgifter" tag="mix" tagColor="rep" />
          <button className="btn btn-primary" style={{ width: '100%', marginTop: 10 }} onClick={startTraining}>
            Starta passet ▶
          </button>
        </div>

        {rewards.map((reward) => {
          const progress = rewardProgress(reward, child)
          return (
            <div className="card" key={reward.id} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ fontSize: 24 }}>{reward.emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 900, fontSize: 13.5 }}>{reward.title}</div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 700 }}>
                  {progress.earned ? '🎉 Klar! Visa för en vuxen!' : progress.label}
                </div>
                <div className="pbar" style={{ marginTop: 5 }}>
                  <i style={{ width: `${progress.ratio * 100}%`, background: 'var(--sun)' }} />
                </div>
              </div>
            </div>
          )
        })}

        <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13.5, fontWeight: 800 }}>⏱ Tid kvar idag</span>
          <span style={{ fontWeight: 900, color: minutesLeft <= 5 ? 'var(--coral)' : 'var(--primary)', fontSize: 17 }}>
            {minutesLeft} min
          </span>
        </div>

        <div style={{ marginTop: 'auto', alignSelf: 'center', opacity: 0.9 }}>
          <Pi mood="glad" size={64} />
        </div>
      </aside>
    </div>
  )
}

function Row({ label, tag, tagColor }: { label: string; tag: string; tagColor: 'rep' | 'new' }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
      padding: '7px 0', borderBottom: '1.5px dashed var(--line)', fontSize: 13, fontWeight: 700,
    }}>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      <span style={{
        fontSize: 10.5, fontWeight: 800, padding: '2px 8px', borderRadius: 99, flexShrink: 0,
        background: tagColor === 'rep' ? '#E4F4EC' : '#FFF1D6',
        color: tagColor === 'rep' ? '#1F7A50' : '#8A6100',
      }}>{tag}</span>
    </div>
  )
}
