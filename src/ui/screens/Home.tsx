import { useMemo, useRef, useState } from 'react'
import type { ChildProfile, Moment, SkillState } from '../../domain/types'
import { momentsInWorld, momentById } from '../../domain/curriculum'
import { WORLDS, worldById } from '../../domain/worlds'
import { hasGenerator } from '../../generators'
import { currentMomentId } from '../../engine/progress'
import { dueForReview } from '../../engine/spaced-repetition'
import { rewardProgress } from '../../engine/rewards'
import { blixtTarget, unlockedBlixtTests } from '../../engine/blixt'
import { sfx } from '../../sound'
import { Pi } from '../components/Pi'
import { RealmMap } from '../components/RealmMap'
import { SoundToggle } from '../components/SoundToggle'
import { WorldScenery } from '../components/WorldScenery'
import { Sprite } from '../components/WorldSprites'
import { worldTheme } from '../worldThemes'
import { todayISO, useStore } from '../store'

/* ============================================================
   Hemskärmen — resan genom Matteriket.

   Vänster: världens väg med noder (stjärnor, flagga, boss, lås).
   Höger: Dagens pass, belöningsmål och tid kvar.
   Den gula knappen är alltid nästa steg.
   ============================================================ */

/** 'now' = motorns aktiva moment (Pi står här); 'oppen' = upplåst och valbart. */
type NodeState = 'done' | 'star' | 'now' | 'oppen' | 'boss' | 'locked' | 'coming'

function nodeState(moment: Moment, skill: SkillState | undefined, isCurrent: boolean): NodeState {
  if (!hasGenerator(moment.generatorId)) return 'coming'
  if (!skill) return 'locked'
  if (skill.mastery === 'star') return 'star'
  if (skill.mastery === 'mastered') return 'done'
  if (skill.mastery === 'boss-ready') return 'boss'
  if (isCurrent) return 'now'
  if (skill.mastery === 'in-progress' || skill.mastery === 'needs-review' || skill.mastery === 'available') return 'oppen'
  return 'locked'
}

/** Nodernas märkesfärg. Glyferna ritas som SVG (spelkänsla, inga emojis). */
const NODE_BG: Record<NodeState, string> = {
  done: 'var(--mint)',
  star: 'var(--mint)',
  now: 'var(--sun)',
  oppen: '#FFDF94',
  boss: 'var(--boss)',
  locked: '#D8D4C8',
  coming: '#D8D4C8',
}

function NodeGlyph({ state, size = 24 }: { state: NodeState; size?: number }) {
  const ink = state === 'oppen' ? 'var(--sun-ink)' : '#FFFFFF'
  const paths: Record<NodeState, React.ReactNode> = {
    done: <path d="M12,2 L14.9,8.6 L22,9.3 L16.7,14 L18.3,21 L12,17.3 L5.7,21 L7.3,14 L2,9.3 L9.1,8.6 Z" fill={ink} />,
    star: <path d="M12,2 L14.9,8.6 L22,9.3 L16.7,14 L18.3,21 L12,17.3 L5.7,21 L7.3,14 L2,9.3 L9.1,8.6 Z" fill={ink} />,
    now: ( // flagga: Pi står här
      <>
        <path d="M7,3 L7,21" stroke={ink} strokeWidth="2.4" strokeLinecap="round" />
        <path d="M8,4 L19,7.5 L8,11 Z" fill={ink} />
      </>
    ),
    oppen: <path d="M8,5 L19,12 L8,19 Z" fill={ink} />,
    boss: ( // korsade svärd
      <>
        <path d="M5,4 L16,15 M19,18 L16,15" stroke={ink} strokeWidth="2.6" strokeLinecap="round" />
        <path d="M19,4 L8,15 M5,18 L8,15" stroke={ink} strokeWidth="2.6" strokeLinecap="round" />
        <path d="M13.5,17.5 L18.5,12.5 M10.5,17.5 L5.5,12.5" stroke={ink} strokeWidth="2" strokeLinecap="round" />
      </>
    ),
    locked: (
      <>
        <rect x="6" y="10" width="12" height="9" rx="2.4" fill={ink} />
        <path d="M8.5,10 L8.5,7.5 A3.5,3.5 0 0,1 15.5,7.5 L15.5,10" stroke={ink} strokeWidth="2.4" fill="none" />
      </>
    ),
    coming: ( // grodd: kommer snart
      <>
        <path d="M12,21 L12,12" stroke={ink} strokeWidth="2.4" strokeLinecap="round" />
        <path d="M12,13 Q6,13 5,7 Q11,7 12,13 Z" fill={ink} />
        <path d="M12,11 Q18,11 19,5 Q13,5 12,11 Z" fill={ink} opacity="0.85" />
      </>
    ),
  }
  return <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" style={{ display: 'block' }}>{paths[state]}</svg>
}

/* Kartans fasta geometri: varje moment får en rad, noderna växlar
   vänster/höger och en ritad väg slingrar mellan cirkelcentrumen. */
const ROW_H = 96
const MAP_W = 460 // designbredd — vägens SVG skalas med behållaren
const nodeCx = (i: number): number => (i % 2 === 0 ? 30 : 0.45 * MAP_W + 30)
const nodeCy = (i: number, n: number): number => (n - 1 - i) * ROW_H + ROW_H / 2

/** Vägen genom de första `upTo + 1` noderna (n = radantal för y-beräkningen). */
function windingPath(n: number, upTo = n - 1): string {
  let d = `M${nodeCx(0)},${nodeCy(0, n)}`
  for (let i = 1; i <= upTo; i++) {
    const [x0, y0] = [nodeCx(i - 1), nodeCy(i - 1, n)]
    const [x1, y1] = [nodeCx(i), nodeCy(i, n)]
    d += ` C${x0},${y0 - 42} ${x1},${y1 + 42} ${x1},${y1}`
  }
  return d
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
  const theme = worldTheme(worldId)
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
    sfx.whoosh()
    store.startSession() // motorn väljer momentet
  }

  // Riket först: barnet ser hela kartan och zoomar in i en värld.
  const [view, setView] = useState<'riket' | 'varld'>('riket')
  const enterWorld = (id: string): void => {
    setWorldId(id)
    hasScrolled.current = false // scrolla till aktuell nod i den nya världen
    setView('varld')
  }

  const inRealm = view === 'riket'

  return (
    // height (inte minHeight): kartan scrollar i sin egen yta så att
    // sidopanel och världsväxlare alltid syns — som i ett riktigt spel.
    <div className="screen-fade" style={{ height: '100%', display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(260px, 330px)', gap: 0 }}>
      {/* Kartan */}
      <div style={{
        padding: '14px 18px', background: inRealm ? '#1B1F30' : theme.sky, display: 'flex', flexDirection: 'column',
        minWidth: 0, minHeight: 0, position: 'relative', overflow: 'hidden',
        // Grottan är mörk — ljus text där (nodtexterna använder variablerna).
        ...(!inRealm && theme.horizon === 'grotta' ? ({ '--ink': '#F3EFFF', '--muted': '#BDB4DC', '--sun-ink': '#FFD98A' } as React.CSSProperties) : {}),
      }}>
        {!inRealm && <WorldScenery theme={theme} />}
        {/* Snidad trä-HUD: sträcker sig kant till kant (negativa marginaler
            matchar containerns padding 14px 18px). Mässingskant nedtill. */}
        <div className="wood-bar" style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          position: 'relative', zIndex: 3, margin: '-14px -18px 0', padding: '12px 18px',
        }}>
          <span style={{ display: 'flex', gap: 8 }}>
            <button className="chip" onClick={store.leaveChild}>← Byt spelare</button>
            <SoundToggle />
          </span>
          <span className="display" style={{ fontWeight: 900, fontSize: 18, color: '#FFF3D6', textShadow: '0 1px 3px rgba(0,0,0,.6)' }}>
            {inRealm ? '🗺 Matteriket' : `${world.emoji} ${world.name}`}
          </span>
          <span className="chip">🔥 {child.streak.days} {child.streak.days === 1 ? 'dag' : 'dagar'} i rad</span>
        </div>

        {inRealm ? (
          <div style={{ flex: 1, position: 'relative', margin: '10px -18px -14px' }}>
            <RealmMap child={child} currentWorldId={currentMoment?.worldId ?? worldId} onPick={enterWorld} />
          </div>
        ) : (
          <>
        <div style={{
          margin: '10px 0 4px', background: theme.banner.bg, border: `2px solid ${theme.banner.border}`, borderRadius: 12,
          padding: '8px 13px', fontSize: 13.5, fontWeight: 700, color: theme.banner.ink, lineHeight: 1.45,
          position: 'relative', zIndex: 3,
        }}>📜 {chapter}</div>

        {/* Vägen — fast rutnät med slingrande stig och sprites längs kanten. */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 6px', position: 'relative', zIndex: 2 }}>
          <div style={{ position: 'relative', maxWidth: MAP_W, margin: '0 auto', height: moments.length * ROW_H }}>
            {/* Stigen: guldtrampstenar dit barnet nått, blek antydan bortom. */}
            {(() => {
              const states = moments.map((m) => nodeState(m, child.skills[m.id], m.id === currentId))
              const lastOpen = states.reduce((acc, s, i) => (s !== 'locked' && s !== 'coming' ? i : acc), 0)
              return (
                <svg
                  viewBox={`0 0 ${MAP_W} ${moments.length * ROW_H}`}
                  preserveAspectRatio="none"
                  aria-hidden="true"
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}
                >
                  {/* Hela sträckan: knappt synlig — man anar vart resan bär. */}
                  <path d={windingPath(moments.length)} stroke={theme.pathUnder} strokeWidth={20} fill="none"
                    strokeLinecap="round" opacity={0.3} />
                  <path d={windingPath(moments.length)} stroke={theme.pathColor} strokeWidth={7} fill="none"
                    strokeLinecap="round" strokeDasharray="0.1 18" opacity={0.25} />
                  {/* Upplåst sträcka: full lyster. */}
                  <path d={windingPath(moments.length, lastOpen)} stroke={theme.pathUnder} strokeWidth={20} fill="none"
                    strokeLinecap="round" opacity={0.55} />
                  <path d={windingPath(moments.length, lastOpen)} stroke={theme.pathColor} strokeWidth={8.5} fill="none"
                    strokeLinecap="round" strokeDasharray="0.1 16" />
                </svg>
              )
            })()}

            {/* Natur längs vägen — deterministiskt utplacerad, aldrig över noderna. */}
            {moments.map((moment, i) => (
              <span
                key={`sprite-${moment.id}`}
                aria-hidden="true"
                style={{
                  position: 'absolute', zIndex: 1, pointerEvents: 'none',
                  top: (moments.length - 1 - i) * ROW_H + 14 + ((i * 53) % 38),
                  ...(i % 2 === 0 ? { left: `${68 + ((i * 37) % 16)}%` } : { left: `${1 + ((i * 29) % 9)}%` }),
                }}
              >
                <Sprite
                  name={theme.sprites[(i * 3 + 1) % theme.sprites.length]}
                  size={30 + ((i * 17) % 22)}
                  flip={i % 3 === 0}
                  tone={(i % 2) as 0 | 1}
                />
              </span>
            ))}

            {moments.map((moment, i) => {
              const skill = child.skills[moment.id]
              const state = nodeState(moment, skill, moment.id === currentId)
              const isStar = state === 'star'
              const clickable = state === 'now' || state === 'oppen' || state === 'boss' || state === 'done' || isStar
              const onClick = (): void => {
                if (secondsLeft <= 0) return store.go('time-up')
                if (state === 'boss') store.startBattle(moment.id, 'boss')
                else if (state === 'done') store.startBattle(moment.id, 'star')
                else if (state === 'now' || state === 'oppen') store.startSession(moment.id)
              }
              return (
                <button
                  key={moment.id}
                  ref={moment.id === currentId ? scrollToCurrent : undefined}
                  onClick={onClick}
                  disabled={!clickable}
                  style={{
                    position: 'absolute', zIndex: 2,
                    top: (moments.length - 1 - i) * ROW_H, height: ROW_H,
                    left: i % 2 === 0 ? 0 : '45%', width: '55%',
                    display: 'flex', alignItems: 'center', gap: 14, fontFamily: 'inherit', textAlign: 'left',
                    opacity: state === 'locked' || state === 'coming' ? 0.72 : 1,
                  }}
                >
                  <span
                    className={`map-node${state === 'now' ? ' pulse-ring' : state === 'boss' ? ' float-soft' : ''}`}
                    style={{
                      position: 'relative', width: state === 'now' ? 62 : 52, height: state === 'now' ? 62 : 52,
                      borderRadius: '50%', flexShrink: 0,
                      // Glansig spelknapp: ljus reflex uppe till vänster + grundfärgen.
                      background: `radial-gradient(circle at 33% 28%, rgba(255,255,255,.5), rgba(255,255,255,0) 55%), ${NODE_BG[state]}`,
                      border: '3px solid rgba(255,255,255,.85)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: state === 'now'
                        ? '0 0 0 6px rgba(255,201,77,.35), 0 4px 0 rgba(0,0,0,.18)'
                        : state === 'boss'
                          ? '0 0 0 5px rgba(140,107,200,.3), 0 4px 0 rgba(0,0,0,.18)'
                          : state === 'oppen'
                            ? '0 0 0 3px var(--sun), 0 4px 0 rgba(0,0,0,.14)'
                            : '0 4px 0 rgba(0,0,0,.14)',
                    }}
                  >
                    <NodeGlyph state={state} size={state === 'now' ? 28 : 24} />
                    {isStar && (
                      <svg viewBox="0 0 24 24" width={18} height={18} aria-hidden="true"
                        style={{ position: 'absolute', top: -9, right: -9, filter: 'drop-shadow(0 1px 1px rgba(0,0,0,.25))' }}>
                        <path d="M12,3 L18,9 L12,21 L6,9 Z" fill="#8FD4F0" />
                        <path d="M12,3 L18,9 L12,9 Z" fill="#C8ECFA" />
                        <path d="M12,3 L6,9 L12,9 Z" fill="#5FB8E8" />
                      </svg>
                    )}
                    {state === 'now' && (
                      <span style={{ position: 'absolute', top: -30, left: '50%', transform: 'translateX(-50%)' }}>
                        <Pi mood="glad" size={30} />
                      </span>
                    )}
                  </span>
                  <span style={{
                    minWidth: 0,
                    // Mjuk halo bakom texten — läsbart även över mörk skog/bergssiluett.
                    textShadow: theme.horizon === 'grotta'
                      ? '0 1px 3px rgba(20,18,40,.9), 0 0 8px rgba(20,18,40,.7)'
                      : '0 1px 2px rgba(255,255,255,.9), 0 0 8px rgba(255,255,255,.75)',
                  }}>
                    <span style={{ display: 'block', fontWeight: 800, fontSize: 14, color: state === 'now' || state === 'oppen' ? 'var(--sun-ink)' : 'var(--ink)' }}>
                      {moment.title}
                    </span>
                    <span style={{ display: 'block', fontWeight: 600, fontSize: 12, color: 'var(--muted)' }}>
                      {state === 'coming' ? 'kommer snart'
                        : state === 'boss' ? `Utmana ${world.boss.name}!`
                        : state === 'done' ? 'klar! (tryck för stjärnnivån 💎)'
                        : isStar ? 'stjärnnivå klarad!'
                        : state === 'locked' ? 'kräver tidigare moment'
                        : state === 'oppen' ? 'upplåst — tryck för att träna!'
                        : moment.description}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Tillbaka till översikten över hela riket. */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 6, position: 'relative', zIndex: 3 }}>
          <button className="chip" onClick={() => setView('riket')} style={{ fontWeight: 800 }}>
            🗺 Hela Matteriket
          </button>
        </div>
          </>
        )}
      </div>

      {/* Sidopanelen */}
      <aside style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', minHeight: 0 }}>
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
          const left = progress.total - progress.done
          return (
            <div className="card" key={reward.id} style={{ borderTop: '4px solid var(--sun)' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 30 }}>{reward.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Belöning</div>
                  <div style={{ fontWeight: 900, fontSize: 15 }}>{reward.title}</div>
                </div>
                {!progress.earned && (
                  <span style={{
                    background: '#FFF1D6', color: 'var(--sun-ink)', borderRadius: 12, padding: '4px 10px',
                    fontWeight: 900, fontSize: 13, textAlign: 'center', lineHeight: 1.2, flexShrink: 0,
                  }}>
                    {left}<br /><span style={{ fontSize: 9.5, fontWeight: 800 }}>kvar</span>
                  </span>
                )}
              </div>
              {progress.earned ? (
                <div className="pop" style={{ marginTop: 8, fontWeight: 900, fontSize: 13.5, color: 'var(--mint)' }}>
                  🎉 Du klarade det! Visa för en vuxen så får du din belöning!
                </div>
              ) : (
                <>
                  <div style={{ marginTop: 6, fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>
                    {progress.requirement}
                  </div>
                  {progress.nextSteps.length > 0 && (
                    <div style={{ marginTop: 2, fontSize: 11.5, fontWeight: 700, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      Nästa: {progress.nextSteps[0]}{progress.nextSteps.length > 1 ? ` · sen ${progress.nextSteps.length - 1} till` : ' — sista!'}
                    </div>
                  )}
                  {/* Nedräkning: stjärnor när målet är litet, mätare annars. */}
                  {progress.total <= 10 ? (
                    <div style={{ display: 'flex', gap: 4, marginTop: 7, fontSize: 17 }}>
                      {Array.from({ length: progress.total }).map((_, i) => (
                        <span key={i} style={{ opacity: i < progress.done ? 1 : 0.25, filter: i < progress.done ? undefined : 'grayscale(1)' }}>⭐</span>
                      ))}
                    </div>
                  ) : (
                    <div className="pbar" style={{ marginTop: 7, height: 12 }}>
                      <i style={{ width: `${Math.max(4, progress.ratio * 100)}%`, background: 'var(--sun)' }} />
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })}

        {unlockedBlixtTests(child).length > 0 && (
          <div className="card">
            <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 4 }}>⚡ Blixtpass · 1 minut</div>
            {unlockedBlixtTests(child).map((test) => {
              const record = child.blixt?.[test.kind]
              const target = blixtTarget(test.kind, store.household.blixtTargets)
              const hitTarget = (record?.best ?? 0) >= target
              return (
                <button
                  key={test.kind}
                  onClick={() => { if (secondsLeft <= 0) return store.go('time-up'); store.startBlixt(test.kind) }}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%',
                    padding: '8px 0', borderBottom: '1.5px dashed var(--line)', fontSize: 13, fontWeight: 800,
                    fontFamily: 'inherit', color: 'var(--ink)', textAlign: 'left', gap: 8,
                  }}
                >
                  <span>{test.emoji} {test.title}</span>
                  <span style={{ fontSize: 11.5, color: hitTarget ? 'var(--mint)' : 'var(--muted)', flexShrink: 0 }}>
                    {record ? `🏅 ${record.best}` : 'nytt!'} {hitTarget ? '🎯' : `· mål ${target}`}
                  </span>
                </button>
              )
            })}
          </div>
        )}

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
