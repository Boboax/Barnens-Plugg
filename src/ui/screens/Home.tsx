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
import { Avatar } from '../components/Avatar'
import { Icon, type IconName } from '../components/Icon'
import { Pi } from '../components/Pi'
import { RealmMap } from '../components/RealmMap'
import { SoundToggle } from '../components/SoundToggle'
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

/** Medaljongens ton per status (färgkodning barnet lär sig snabbt). */
const NODE_BG: Record<NodeState, string> = {
  done: 'var(--mint)',
  star: 'var(--mint)',
  now: 'var(--sun)',
  oppen: '#FFDF94',
  boss: 'var(--boss)',
  locked: '#D8D4C8',
  coming: '#D8D4C8',
}

/* Nodmärket är en MÅLAD ikon i mässingsringens hål — samma konststil som
   rikeskartan (ingen platt SVG-glyf längre). Ikonen berättar status:
   kristall = klar, stjärna = stjärnnivå, flagga = du står här, penna = träna,
   svärd = boss, lås = låst, grodd = kommer snart. */
const STATE_ICON: Record<NodeState, IconName> = {
  done: 'kristall',
  star: 'stjarna',
  now: 'flagga',
  oppen: 'penna',
  boss: 'svards',
  locked: 'las',
  coming: 'grodd',
}

/* Kartans fasta geometri: HORISONTELL resa — varje moment får en kolumn,
   noderna växlar övre/nedre rad och en ritad väg slingrar vänster→höger
   mellan cirkelcentrumen. Barnet börjar till vänster, framsteg åt höger. */
const COL_W = 150            // bredd per nod (px)
const MAP_H = 300            // designhöjd — vägens SVG skalas med behållaren
const nodeCx = (i: number): number => i * COL_W + COL_W / 2
const nodeCy = (i: number): number => (i % 2 === 0 ? 0.66 * MAP_H : 0.34 * MAP_H)

/** Vägen genom de första `upTo + 1` noderna. */
function windingPath(n: number, upTo = n - 1): string {
  let d = `M${nodeCx(0)},${nodeCy(0)}`
  for (let i = 1; i <= upTo; i++) {
    const [x0, y0] = [nodeCx(i - 1), nodeCy(i - 1)]
    const [x1, y1] = [nodeCx(i), nodeCy(i)]
    // Vågig kurva: kontrollpunkter förskjutna i x ger mjuka backar upp/ned.
    d += ` C${x0 + 52},${y0} ${x1 - 52},${y1} ${x1},${y1}`
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
  const worldBg = `${import.meta.env.BASE_URL}art/world/${worldId}.webp`
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
      el.scrollIntoView({ inline: 'center', block: 'nearest' })
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
    <div className="screen-fade" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Genomgående snidad trä-HUD över HELA skärmen (båda kolumnerna). */}
      <div className="wood-bar" style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
        padding: '12px 18px', flexShrink: 0, position: 'relative', zIndex: 5,
      }}>
        <span style={{ display: 'flex', gap: 8 }}>
          <button className="chip" onClick={store.leaveChild}>← Byt spelare</button>
          <SoundToggle />
        </span>
        {/* Titelskylt: snidad plakett som hänger ned över kartan (jfr förlagan).
            Elementets proportion matchar bildens (600×328) → ingen förvrängning.
            Texten sitter mitt på träytan (plakettens trä är vertikalt centrerat i
            bilden) och är graverad guldtext för lyster. */}
        <span className="display" style={{
          position: 'absolute', left: '50%', top: 0, transform: 'translateX(-50%)',
          width: 240, aspectRatio: '600 / 328',
          backgroundImage: 'var(--tex-plaque)', backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxSizing: 'border-box',
          zIndex: 6, pointerEvents: 'none', whiteSpace: 'nowrap',
        }}>
          <span style={{
            fontWeight: 900, fontSize: (inRealm ? 17 : (world.name.length > 16 ? 12.5 : 15)), letterSpacing: 0.4,
            background: 'linear-gradient(180deg, #FFF3CC 0%, #F3C24A 52%, #C68C2E 100%)',
            WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
            WebkitTextStroke: '0.6px rgba(60,38,8,.55)',
            filter: 'drop-shadow(0 1px 1px rgba(0,0,0,.7))',
          }}>
            {inRealm ? 'Matteriket' : world.name}
          </span>
        </span>
        <span className="chip"><Icon name="eld" size={15} /> {child.streak.days} {child.streak.days === 1 ? 'dag' : 'dagar'} i rad</span>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(260px, 330px)', gap: 0 }}>
      {/* Kartan. Världsvyn har nu en målad liggande bakgrund (cover) i stället
          för ritad himmel+siluetter; texten görs alltid ljus där ovanpå. */}
      <div style={{
        padding: '14px 18px', display: 'flex', flexDirection: 'column',
        minWidth: 0, minHeight: 0, position: 'relative', overflow: 'hidden',
        background: inRealm
          ? '#1B1F30'
          : `url(${worldBg}) center / cover no-repeat, ${theme.sky}`,
        // Ljus text över målningen (nodtexter/rubrik använder variablerna).
        ...(!inRealm ? ({ '--ink': '#F6EFDF', '--muted': '#D9CDB4', '--sun-ink': '#FFE39A' } as React.CSSProperties) : {}),
      }}>
        {/* Mjuk mörkscrim upptill+nedtill så banner och nodtexter är läsbara. */}
        {!inRealm && (
          <div aria-hidden="true" style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
            background: 'linear-gradient(180deg, rgba(20,16,28,.45) 0%, rgba(20,16,28,0) 22%, rgba(20,16,28,0) 55%, rgba(20,16,28,.5) 100%)',
          }} />
        )}

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

        {/* Vägen — HORISONTELL resa: scrolla i sidled, nod med bildtext under.
            Ritytan har EXAKT bredden moments*COL_W i px, och stig-SVG:n renderas
            i samma px-skala (1 enhet = 1 px, ingen uttänjning). Då följer stigen
            nodernas centrum precis. margin:auto centrerar korta världar och
            låter långa scrolla (flex-säkert, till skillnad från justify center). */}
        <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', display: 'flex', alignItems: 'center', position: 'relative', zIndex: 2 }}>
          {(() => {
            const canvasW = moments.length * COL_W
            const states = moments.map((m) => nodeState(m, child.skills[m.id], m.id === currentId))
            const lastOpen = states.reduce((acc, s, i) => (s !== 'locked' && s !== 'coming' ? i : acc), 0)
            const dark = theme.horizon === 'grotta'
            return (
              <div style={{ position: 'relative', height: MAP_H, width: canvasW, flexShrink: 0, margin: '0 auto' }}>
                {/* Stigen: guldtrampstenar dit barnet nått, blek antydan bortom. */}
                <svg
                  viewBox={`0 0 ${canvasW} ${MAP_H}`}
                  width={canvasW}
                  height={MAP_H}
                  aria-hidden="true"
                  style={{ position: 'absolute', left: 0, top: 0, zIndex: 0, pointerEvents: 'none' }}
                >
                  <path d={windingPath(moments.length)} stroke={theme.pathUnder} strokeWidth={20} fill="none"
                    strokeLinecap="round" opacity={0.3} />
                  <path d={windingPath(moments.length)} stroke={theme.pathColor} strokeWidth={7} fill="none"
                    strokeLinecap="round" strokeDasharray="0.1 18" opacity={0.25} />
                  <path d={windingPath(moments.length, lastOpen)} stroke={theme.pathUnder} strokeWidth={20} fill="none"
                    strokeLinecap="round" opacity={0.55} />
                  <path d={windingPath(moments.length, lastOpen)} stroke={theme.pathColor} strokeWidth={8.5} fill="none"
                    strokeLinecap="round" strokeDasharray="0.1 16" />
                </svg>

                {moments.map((moment, i) => {
                  const state = states[i]
                  const isStar = state === 'star'
                  const dim = state === 'locked' || state === 'coming'
                  const clickable = state === 'now' || state === 'oppen' || state === 'boss' || state === 'done' || isStar
                  const onClick = (): void => {
                    if (secondsLeft <= 0) return store.go('time-up')
                    if (state === 'boss') store.startBattle(moment.id, 'boss')
                    else if (state === 'done') store.startBattle(moment.id, 'star')
                    else if (state === 'now' || state === 'oppen') store.startSession(moment.id)
                  }
                  // Ringens centrum ligger EXAKT på (nodeCx, nodeCy) → stigen träffar
                  // mitt i ringen. Bildtexten är absolut placerad under och flyttar
                  // därför aldrig ringen ur led (tidigare bugg: hela stapeln centrerades).
                  const size = state === 'now' ? 68 : 58
                  const medallion = Math.round(size * 0.6)
                  const iconSize = Math.round(size * 0.44)
                  return (
                    <button
                      key={moment.id}
                      ref={moment.id === currentId ? scrollToCurrent : undefined}
                      onClick={onClick}
                      disabled={!clickable}
                      style={{
                        position: 'absolute', zIndex: 2,
                        left: nodeCx(i), top: nodeCy(i), transform: 'translate(-50%, -50%)',
                        width: size, height: size, fontFamily: 'inherit',
                        opacity: dim ? 0.85 : 1,
                      }}
                    >
                      <span
                        className={`map-node${state === 'now' ? ' pulse-glow' : state === 'boss' ? ' float-soft' : ''}`}
                        style={{
                          position: 'relative', width: size, height: size, flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          // 'now' får sitt pulserande sken via .pulse-glow (följer ringens
                          // runda form); övriga får statisk skugga/glöd här.
                          filter: state === 'now'
                            ? undefined
                            : state === 'boss'
                              ? 'drop-shadow(0 0 7px rgba(150,110,210,.85)) drop-shadow(0 3px 4px rgba(0,0,0,.45))'
                              : 'drop-shadow(0 3px 4px rgba(0,0,0,.45))',
                        }}
                      >
                        {/* Medaljong i ringens hål — statusfärgad, målad ikon ovanpå. */}
                        <span style={{
                          width: medallion, height: medallion, borderRadius: '50%',
                          background: `radial-gradient(circle at 34% 28%, rgba(255,255,255,.55), rgba(255,255,255,0) 58%), ${NODE_BG[state]}`,
                          boxShadow: 'inset 0 -2px 5px rgba(0,0,0,.3)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Icon name={STATE_ICON[state]} size={iconSize}
                            style={dim ? { filter: 'grayscale(.5) drop-shadow(0 1px 1px rgba(0,0,0,.3))' } : undefined} />
                        </span>
                        {/* Snidad mässingsring ovanpå (hålet är genomskinligt). */}
                        <img src={`${import.meta.env.BASE_URL}art/tex/nodering.webp`} alt="" aria-hidden="true"
                          style={{
                            position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none',
                            filter: dim ? 'grayscale(.7) brightness(.85)' : undefined,
                          }} />
                        {isStar && (
                          <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden="true"
                            style={{ position: 'absolute', top: -7, right: -7, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.4))' }}>
                            <path d="M12,3 L18,9 L12,21 L6,9 Z" fill="#8FD4F0" />
                            <path d="M12,3 L18,9 L12,9 Z" fill="#C8ECFA" />
                            <path d="M12,3 L6,9 L12,9 Z" fill="#5FB8E8" />
                          </svg>
                        )}
                        {state === 'now' && (
                          <span style={{ position: 'absolute', top: -32, left: '50%', transform: 'translateX(-50%)' }}>
                            <Pi mood="glad" size={32} />
                          </span>
                        )}
                      </span>
                      {/* Bildtext under noden — absolut, påverkar inte ringens läge. */}
                      <span style={{
                        position: 'absolute', top: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)',
                        width: COL_W - 8, textAlign: 'center', lineHeight: 1.15, pointerEvents: 'none',
                        textShadow: dark
                          ? '0 1px 3px rgba(20,18,40,.95), 0 0 8px rgba(20,18,40,.8)'
                          : '0 1px 3px rgba(20,18,30,.9), 0 0 8px rgba(20,18,30,.7)',
                      }}>
                        <span style={{ display: 'block', fontWeight: 800, fontSize: 13, color: state === 'now' || state === 'oppen' ? 'var(--sun-ink)' : 'var(--ink)' }}>
                          {moment.title}
                        </span>
                        <span style={{ display: 'block', fontWeight: 600, fontSize: 11, color: 'var(--muted)' }}>
                          {state === 'coming' ? 'kommer snart'
                            : state === 'boss' ? `Utmana ${world.boss.name}!`
                            : state === 'done' ? 'klar! 💎'
                            : isStar ? 'stjärnnivå klarad!'
                            : state === 'locked' ? 'låst'
                            : state === 'oppen' ? 'tryck för att träna!'
                            : ''}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
            )
          })()}
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

      {/* Sidopanelen — mörk stenvägg (samma som kartan) så de ramade
          panelerna vilar mot mörkt i stället för att krocka med ljust. */}
      <aside style={{
        padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', minHeight: 0,
        background: 'linear-gradient(rgba(20,16,26,0.6), rgba(20,16,26,0.75)), var(--tex-stone, none) center / 300px repeat, #241C24',
        boxShadow: 'inset 0 0 90px rgba(0,0,0,0.55)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar child={child} size={46} />
          <span className="display" style={{ fontWeight: 900, fontSize: 17, color: '#FBF3DE', textShadow: '0 1px 3px rgba(0,0,0,.7)' }}>Hej {child.name}! 👋</span>
        </div>

        <div className="panel">
          <div style={{ fontWeight: 900, fontSize: 15, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 7 }}><Icon name="bok" size={20} /> Dagens pass · ca 15 min</div>
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
            <div className="panel" key={reward.id}>
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
          <div className="panel">
            <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 7 }}><Icon name="blixt" size={18} /> Blixtpass · 1 minut</div>
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

        <div className="panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13.5, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 7 }}><Icon name="timglas" size={18} /> Tid kvar idag</span>
          <span style={{ fontWeight: 900, color: minutesLeft <= 5 ? 'var(--coral)' : 'var(--primary)', fontSize: 17 }}>
            {minutesLeft} min
          </span>
        </div>

        <div style={{ marginTop: 'auto', alignSelf: 'center', opacity: 0.9 }}>
          <Pi mood="glad" size={64} />
        </div>
      </aside>
      </div>
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
