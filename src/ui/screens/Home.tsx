import { useMemo, useRef, useState } from 'react'
import type { ChildProfile, Moment, SkillState } from '../../domain/types'
import { momentsInWorld, momentById } from '../../domain/curriculum'
import { WORLDS, worldById } from '../../domain/worlds'
import { hasGenerator } from '../../generators'
import { currentMomentId, bossPendingWorldId, worldMomentsComplete } from '../../engine/progress'
import { dueForReview } from '../../engine/spaced-repetition'
import { rewardProgress } from '../../engine/rewards'
import { blixtTarget, unlockedBlixtTests, blixtLevel, blixtTier, blixtMaxTier, blixtConfig, blixtCleared, pendingBlixtKind, type BlixtConfig } from '../../engine/blixt'
import { sfx } from '../../sound'
import { Avatar } from '../components/Avatar'
import { Icon, type IconName, BelongIcon, isBelongIcon } from '../components/Icon'
import { Pi } from '../components/Pi'
import { RealmMap } from '../components/RealmMap'
import { Ambience } from '../components/Ambience'
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
type NodeState = 'done' | 'star' | 'now' | 'oppen' | 'redo' | 'locked' | 'coming'

/** Stigen består av momentnoder + inflätade (upplåsta) blixtnoder. */
type PathItem =
  | { type: 'moment'; moment: Moment; state: NodeState }
  | { type: 'blixt'; cfg: BlixtConfig }

function nodeState(moment: Moment, skill: SkillState | undefined, isCurrent: boolean): NodeState {
  if (!hasGenerator(moment.generatorId)) return 'coming'
  if (!skill) return 'locked'
  if (skill.mastery === 'star') return 'star'
  if (skill.mastery === 'mastered') return 'done'
  if (skill.mastery === 'boss-ready') return 'redo' // redo för Pis kunskapskoll (ingen boss)
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
  redo: 'var(--sun)',
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
  redo: 'stjarna', // redo att visa vad du kan för Pi
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
  // Väntar en världsboss? (alla moment klara men världen inte erövrad) — då är
  // BOSSEN nästa steg, inte ett nytt moment. Styr "Du är här", vy och knapp.
  const pendingBossWorldId = useMemo(() => bossPendingWorldId(child), [child])
  const pendingBossWorld = pendingBossWorldId ? worldById(pendingBossWorldId) : undefined
  // Väntar en flyt-grind (blixt som måste klaras innan nästa moment)?
  const pendingBlixt = useMemo(() => pendingBlixtKind(child), [child])
  const currentMoment = currentId ? momentById(currentId) : undefined
  const currentSkill = currentId ? child.skills[currentId] : undefined
  // Har barnet FAKTISKT tränat på det rekommenderade momentet? (styr knapptexten)
  // attempts, inte mastery: diagnosen sätter frontmomentet till in-progress utan
  // att barnet spelat, så vi vill inte säga "Fortsätt" redan dag ett.
  const hasStarted = (currentSkill?.attempts ?? 0) > 0
  // Boss/blixt är nästa steg först när inget moment finns kvar att träna.
  const bossIsNextStep = !!pendingBossWorldId && !currentId
  const blixtIsNextStep = !!pendingBlixt && !currentId && !bossIsNextStep
  const blixtWorldId = blixtIsNextStep && pendingBlixt
    ? momentById(blixtConfig(pendingBlixt).unlockMomentId).worldId : undefined
  const currentWorld = currentMoment ? worldById(currentMoment.worldId)
    : pendingBossWorld ?? (blixtWorldId ? worldById(blixtWorldId) : undefined)
  // "Du är här" och startvyn: bossvärld > flyt-grindens värld > aktuellt moment.
  const focusWorldId = pendingBossWorldId ?? blixtWorldId ?? currentMoment?.worldId ?? WORLDS[0].id
  const [worldId, setWorldId] = useState(focusWorldId)
  const world = worldById(worldId)
  const theme = worldTheme(worldId)
  const worldBg = `${import.meta.env.BASE_URL}art/world/${worldId}.webp`
  const moments = momentsInWorld(worldId)

  const masteredInWorld = moments.filter((m) => {
    const s = child.skills[m.id]
    return s?.mastery === 'mastered' || s?.mastery === 'star'
  }).length
  // Berättelseremsan: sista kapitlet ("… bossen besegrad, vägen öppnas") får
  // ENDAST visas när bossen faktiskt är erövrad. Är alla moment klara men bossen
  // kvar visar vi i stället en tydlig bossmaning (annars ljuger banderollen om
  // att bossen är slagen — precis buggen på fotot).
  const worldConquered = child.conqueredWorlds?.includes(worldId) ?? false
  const worldAllMomentsDone = worldMomentsComplete(child.skills, worldId)
  const lastChapter = world.chapters.length - 1
  const chapter = worldConquered
    ? world.chapters[lastChapter]
    : worldAllMomentsDone
      ? `Alla moment i ${world.name} är klara — ${world.boss.name} vaknar! Dags att möta bossen.`
      : world.chapters[Math.min(masteredInWorld, lastChapter - 1)]

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
    // Inget moment kvar att träna → gula knappen tar till nästa grind:
    // världsboss eller flyt-blixt. Annars vanligt pass (motorn väljer momentet).
    if (bossIsNextStep && pendingBossWorldId) store.startWorldBoss(pendingBossWorldId)
    else if (blixtIsNextStep && pendingBlixt) store.startBlixt(pendingBlixt)
    else store.startSession()
  }

  // Öppna i den AKTUELLA världens karta (fokusvärlden) — inte hela riket.
  // Så landar man tillbaka i rätt värld efter att ha klarat/lämnat en nod, i
  // stället för att bollas ut till den stora översikten. Hela riket är ett
  // knapptryck bort ("Hela Matteriket").
  const [view, setView] = useState<'riket' | 'varld'>('varld')
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
        padding: 'calc(12px + env(safe-area-inset-top)) 18px 12px', flexShrink: 0, position: 'relative', zIndex: 5,
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
          width: 'min(210px, 38vw)', aspectRatio: '600 / 328',
          backgroundImage: 'var(--tex-plaque)', backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxSizing: 'border-box', padding: '0 13%',
          zIndex: 6, pointerEvents: 'none', whiteSpace: 'nowrap',
        }}>
          {/* Fast guldfärg (INTE background-clip:text) — Safari renderar inget
              när background-clip:text kombineras med overflow, vilket gjorde
              skylten tom. Mörk skugga ger ändå gravyrkänsla mot träet. */}
          <span style={{
            fontWeight: 900, letterSpacing: 0.4,
            fontSize: (inRealm ? 17 : (world.name.length > 18 ? 11 : world.name.length > 14 ? 12.5 : 15)),
            color: '#FFE7A8',
            textShadow: '0 1px 2px rgba(45,26,4,.95), 0 0 3px rgba(45,26,4,.7)',
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
            // Behåll ett konstant mörkt golv (~20 %) även i mitten så ljus
            // nodtext aldrig hamnar ljus-mot-ljus över en solig del av målningen.
            background: 'linear-gradient(180deg, rgba(20,16,28,.5) 0%, rgba(20,16,28,.2) 24%, rgba(20,16,28,.2) 60%, rgba(20,16,28,.56) 100%)',
          }} />
        )}

        {inRealm ? (
          <div style={{ flex: 1, position: 'relative', margin: '10px -18px -14px' }}>
            <RealmMap child={child} currentWorldId={focusWorldId} onPick={enterWorld} />
          </div>
        ) : (
          <>
        {/* Rörligt liv över den målade världen (fjärilar, fåglar, löv …). */}
        <Ambience scene={worldId} />
        {/* Berättelseremsan sitter NEDANFÖR den hängande skylten (marginTop
            rensar skyltens överhäng, så tavlan aldrig ligger framför rutan).
            Pergamentstil i stället för platt färgruta så den smälter in i
            den målade världen. */}
        <div style={{
          margin: '64px 0 4px', borderRadius: 12,
          background: 'linear-gradient(rgba(246,236,212,.95), rgba(230,213,176,.95)), var(--tex-parchment, none) center / cover',
          border: '2px solid #7A6544',
          padding: '8px 14px', fontSize: 13.5, fontWeight: 700, color: '#3E3016', lineHeight: 1.45,
          position: 'relative', zIndex: 3, display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: '0 3px 10px rgba(0,0,0,.35)',
        }}><Icon name="rulle" size={18} style={{ flexShrink: 0 }} /> {chapter}</div>

        {/* Vägen — HORISONTELL resa: scrolla i sidled, nod med bildtext under.
            Ritytan har EXAKT bredden moments*COL_W i px, och stig-SVG:n renderas
            i samma px-skala (1 enhet = 1 px, ingen uttänjning). Då följer stigen
            nodernas centrum precis. margin:auto centrerar korta världar och
            låter långa scrolla (flex-säkert, till skillnad från justify center). */}
        <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', display: 'flex', alignItems: 'center', position: 'relative', zIndex: 2 }}>
          {(() => {
            const BOSS_END_W = 156 // extra bredd i slutet där världsbossen lurar
            // Stigen = momentnoder MED upplåsta blixtnoder inflätade efter sitt
            // upplåsningsmoment. Blixt är valfria (aldrig grind) men syns på vägen.
            const worldBlixt = unlockedBlixtTests(child).filter((b) => momentById(b.unlockMomentId).worldId === worldId)
            const pathItems: PathItem[] = []
            for (const m of moments) {
              pathItems.push({ type: 'moment', moment: m, state: nodeState(m, child.skills[m.id], m.id === currentId) })
              for (const b of worldBlixt) if (b.unlockMomentId === m.id) pathItems.push({ type: 'blixt', cfg: b })
            }
            const nodesW = pathItems.length * COL_W
            const canvasW = nodesW + BOSS_END_W
            const isOpen = (it: PathItem): boolean => it.type === 'blixt' || (it.state !== 'locked' && it.state !== 'coming')
            const lastOpen = pathItems.reduce((acc, it, i) => (isOpen(it) ? i : acc), 0)
            const dark = theme.horizon === 'grotta'
            // Världsbossen "lurar" i slutet tills alla moment är klara → besegrad.
            const genTotal = moments.filter((m) => hasGenerator(m.generatorId)).length
            const worldDone = moments.filter((m) => {
              const s = child.skills[m.id]
              return s?.mastery === 'mastered' || s?.mastery === 'star'
            }).length
            const worldComplete = genTotal > 0 && worldDone >= genTotal
            // Världsbossen får utmanas när alla moment är klara; besegrad när erövrad.
            const conquered = child.conqueredWorlds?.includes(worldId) ?? false
            const bossReady = worldComplete && !conquered
            const li = pathItems.length - 1
            const [bx, by] = [nodesW + BOSS_END_W / 2, MAP_H / 2]
            // Slutsträckan fram till bossen (guld om världen är klar, annars blek).
            const bossLeg = pathItems.length > 0
              ? `M${nodeCx(li)},${nodeCy(li)} Q${(nodeCx(li) + bx) / 2 + 20},${(nodeCy(li) + by) / 2} ${bx},${by}`
              : ''
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
                  <path d={windingPath(pathItems.length)} stroke={theme.pathUnder} strokeWidth={20} fill="none"
                    strokeLinecap="round" opacity={0.3} />
                  <path d={windingPath(pathItems.length)} stroke={theme.pathColor} strokeWidth={7} fill="none"
                    strokeLinecap="round" strokeDasharray="0.1 18" opacity={0.25} />
                  <path d={windingPath(pathItems.length, lastOpen)} stroke={theme.pathUnder} strokeWidth={20} fill="none"
                    strokeLinecap="round" opacity={0.55} />
                  <path d={windingPath(pathItems.length, lastOpen)} stroke={theme.pathColor} strokeWidth={8.5} fill="none"
                    strokeLinecap="round" strokeDasharray="0.1 16" />
                  {/* Sista sträckan ut till världsbossen. */}
                  {bossLeg && <path d={bossLeg} stroke={theme.pathUnder} strokeWidth={20} fill="none" strokeLinecap="round" opacity={worldComplete ? 0.55 : 0.3} />}
                  {bossLeg && <path d={bossLeg} stroke={worldComplete ? theme.pathColor : '#E05436'} strokeWidth={worldComplete ? 8.5 : 6} fill="none" strokeLinecap="round" strokeDasharray="0.1 16" opacity={worldComplete ? 1 : 0.5} />}
                </svg>

                {pathItems.map((item, i) => {
                  // Blixtnod: valfri flyt-runda på stigen (aldrig grind).
                  if (item.type === 'blixt') {
                    const cfg = item.cfg
                    const level = blixtLevel(cfg.kind, child)
                    const rec = child.blixt?.[cfg.kind]
                    const cleared = blixtCleared(cfg.kind, child)
                    const isPending = pendingBlixt === cfg.kind && blixtIsNextStep
                    const short = cfg.kind === 'tabeller' ? 'tabeller' : cfg.kind === 'add-sub-0-20' ? '0–20' : '0–10'
                    const bsize = isPending ? 70 : 58
                    return (
                      <button
                        key={`blixt-${cfg.kind}`}
                        ref={isPending ? scrollToCurrent : undefined}
                        onClick={() => { if (secondsLeft <= 0) return store.go('time-up'); store.startBlixt(cfg.kind) }}
                        aria-label={`Blixtpass ${cfg.title}`}
                        style={{
                          position: 'absolute', zIndex: 2, left: nodeCx(i), top: nodeCy(i),
                          transform: 'translate(-50%, -50%)', width: bsize, height: bsize, fontFamily: 'inherit',
                        }}
                      >
                        <span className={`map-node${isPending ? ' pulse-glow' : ''}`} style={{
                          position: 'relative', width: bsize, height: bsize, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          filter: isPending ? undefined : 'drop-shadow(0 3px 4px rgba(0,0,0,.45))',
                        }}>
                          <span style={{
                            width: Math.round(bsize * 0.6), height: Math.round(bsize * 0.6), borderRadius: '50%', overflow: 'hidden',
                            background: `radial-gradient(circle at 34% 28%, rgba(255,255,255,.6), rgba(255,255,255,0) 58%), ${cleared ? 'var(--mint)' : 'var(--sun)'}`,
                            boxShadow: 'inset 0 -2px 5px rgba(0,0,0,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <Icon name="blixt" size={Math.round(bsize * 0.44)} />
                          </span>
                          <img src={`${import.meta.env.BASE_URL}art/tex/nodering.webp`} alt="" aria-hidden="true"
                            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />
                          {cleared && (
                            <svg viewBox="0 0 24 24" width={18} height={18} aria-hidden="true"
                              style={{ position: 'absolute', top: 0, right: 0, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.4))' }}>
                              <circle cx="12" cy="12" r="11" fill="var(--mint)" stroke="#fff" strokeWidth="2" />
                              <path d="M7,12.5 L10.5,16 L17,8.5" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </span>
                        <span style={{
                          position: 'absolute', top: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)',
                          width: COL_W - 8, textAlign: 'center', lineHeight: 1.15, pointerEvents: 'none',
                          textShadow: dark ? '0 1px 3px rgba(20,18,40,.95), 0 0 8px rgba(20,18,40,.8)' : '0 1px 3px rgba(20,18,30,.9), 0 0 8px rgba(20,18,30,.7)',
                        }}>
                          <span style={{ display: 'block', fontWeight: 800, fontSize: 12.5, color: cleared ? 'var(--mint)' : 'var(--sun-ink)' }}>Blixt {short}</span>
                          <span style={{ display: 'block', fontWeight: 600, fontSize: 11, color: 'var(--muted)' }}>
                            {cleared ? `klarad ✓${rec ? ` · rek ${rec.best}` : ''}`
                              : isPending ? 'klara för att gå vidare!'
                              : `nivå ${level}`}
                          </span>
                        </span>
                      </button>
                    )
                  }
                  const { moment, state } = item
                  const isStar = state === 'star'
                  const dim = state === 'locked' || state === 'coming'
                  const clickable = state === 'now' || state === 'oppen' || state === 'redo' || state === 'done' || isStar
                  const onClick = (): void => {
                    if (secondsLeft <= 0) return store.go('time-up')
                    if (state === 'redo') store.startBattle(moment.id, 'check') // Pis vänliga kunskapskoll
                    else if (state === 'done') store.startBattle(moment.id, 'star') // diamantnivån
                    // Nodtryck = FOKUSERAD träning på just det momentet (inte hela passet).
                    else if (state === 'now' || state === 'oppen') store.startSession(moment.id, true)
                  }
                  // Ringens centrum ligger EXAKT på (nodeCx, nodeCy) → stigen träffar
                  // mitt i ringen. Bildtexten är absolut placerad under och flyttar
                  // därför aldrig ringen ur led (tidigare bugg: hela stapeln centrerades).
                  // "redo" (dags för Pi-koll) och "now" är de aktiva noderna → lite större.
                  const size = state === 'redo' || state === 'now' ? 70 : 58
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
                        className={`map-node${state === 'now' || state === 'redo' ? ' pulse-glow' : ''}`}
                        style={{
                          position: 'relative', width: size, height: size, flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          // 'now'/'redo' får pulserande sken via .pulse-glow (följer ringen);
                          // övriga får statisk skugga.
                          filter: state === 'now' || state === 'redo'
                            ? undefined
                            : 'drop-shadow(0 3px 4px rgba(0,0,0,.45))',
                        }}
                      >
                        {/* Medaljong i ringens hål: statusfärgad målad ikon. Bossmonstret
                            visas INTE längre per nod — det bor bara hos världsbossen i slutet. */}
                        <span style={{
                          width: medallion, height: medallion, borderRadius: '50%', overflow: 'hidden',
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
                        <span style={{ display: 'block', fontWeight: 800, fontSize: 13, color: state === 'now' || state === 'oppen' || state === 'redo' ? 'var(--sun-ink)' : 'var(--ink)' }}>
                          {moment.title}
                        </span>
                        <span style={{ display: 'block', fontWeight: 600, fontSize: 11, color: 'var(--muted)' }}>
                          {state === 'coming' ? 'kommer snart'
                            : state === 'redo' ? 'visa vad du kan!'
                            : state === 'done' ? 'prova diamanten!'
                            : isStar ? 'stjärnnivå klarad!'
                            : state === 'locked' ? 'låst'
                            : state === 'now' ? 'börja här!'
                            : state === 'oppen' ? 'tryck för att träna!'
                            : ''}
                        </span>
                      </span>
                    </button>
                  )
                })}

                {/* Världsbossen i slutet: den STORA striden. Väktare (sover) tills
                    alla noder är klara → då vaknar den och går att utmana (rött sken,
                    tryckbar) → besegrad när världen är erövrad. */}
                {genTotal > 0 && (
                  <button
                    disabled={!bossReady}
                    onClick={() => { if (secondsLeft <= 0) return store.go('time-up'); store.startWorldBoss(worldId) }}
                    aria-label={bossReady ? `Utmana ${world.boss.name}` : undefined}
                    style={{
                      position: 'absolute', left: bx, top: by, transform: 'translate(-50%, -50%)', zIndex: 2,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: BOSS_END_W - 8,
                      fontFamily: 'inherit', background: 'none', border: 'none',
                      pointerEvents: bossReady ? 'auto' : 'none',
                    }}
                  >
                    <img
                      src={`${import.meta.env.BASE_URL}art/boss/${world.boss.id}${conquered ? '-besegrad' : ''}.webp`}
                      alt="" aria-hidden="true"
                      onError={(e) => { e.currentTarget.style.display = 'none' }}
                      className={conquered ? undefined : 'float-soft'}
                      style={{
                        height: 104, width: 'auto', maxWidth: BOSS_END_W - 12, objectFit: 'contain',
                        filter: conquered
                          ? 'drop-shadow(0 4px 6px rgba(0,0,0,.5))'
                          : `drop-shadow(0 0 ${bossReady ? 12 : 9}px rgba(224,84,52,${bossReady ? 0.95 : 0.7})) drop-shadow(0 4px 6px rgba(0,0,0,.5))`,
                        opacity: conquered ? 0.92 : 1,
                      }}
                    />
                    <span style={{
                      textAlign: 'center', lineHeight: 1.12,
                      textShadow: dark ? '0 1px 3px rgba(20,18,40,.95), 0 0 8px rgba(20,18,40,.8)' : '0 1px 3px rgba(20,18,30,.9), 0 0 8px rgba(20,18,30,.7)',
                    }}>
                      <span style={{ display: 'block', fontWeight: 800, fontSize: 12.5, color: conquered ? 'var(--mint)' : 'var(--sun-ink)' }}>
                        {world.boss.name}
                      </span>
                      <span style={{ display: 'block', fontWeight: 700, fontSize: 11, color: 'var(--muted)' }}>
                        {conquered ? 'erövrad! ✓' : bossReady ? 'Möt bossen!' : 'väktare'}
                      </span>
                    </span>
                  </button>
                )}
              </div>
            )
          })()}
        </div>

        {/* Tillbaka till översikten över hela riket. */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 6, position: 'relative', zIndex: 3 }}>
          <button className="chip" onClick={() => setView('riket')} style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="karta" size={17} /> Hela Matteriket
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
          <span className="display" style={{ fontWeight: 900, fontSize: 17, color: '#FBF3DE', textShadow: '0 1px 3px rgba(0,0,0,.7)' }}>Hej {child.name}!</span>
        </div>

        <div className="panel">
          <div style={{ fontWeight: 900, fontSize: 15, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 7 }}><Icon name="bok" size={20} /> Dagens pass · ca 15 min</div>
          <Row label="Uppvärmning: repetition" tag={due > 0 ? `${due} moment` : 'kort'} tagColor="rep" />
          <Row label={currentMoment ? currentMoment.title : 'Fritt läge'} tag={hasStarted ? 'pågår' : 'nytt'} tagColor="new" />
          <Row label="Blandade uppgifter" tag="mix" tagColor="rep" />

          {/* Pi pekar tydligt ut nästa steg — barnet ska aldrig behöva undra
              var det ska trycka. Knappen tar alltid till RÄTT övning. */}
          <div style={{
            display: 'flex', gap: 8, alignItems: 'center', marginTop: 10,
            background: 'linear-gradient(rgba(246,236,212,.96), rgba(230,213,176,.96)), var(--tex-parchment, none) center / cover',
            border: '2px solid #7A6544', borderRadius: 12, padding: '8px 10px', color: '#3E3016',
          }}>
            <Pi mood={bossIsNextStep || blixtIsNextStep ? 'hejar' : 'glad'} size={34} />
            <span style={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.35 }}>
              {bossIsNextStep && pendingBossWorld
                ? <>Alla moment i <b>{pendingBossWorld.name}</b> är klara! Nu vaknar <b>{pendingBossWorld.boss.name}</b>. Tryck så tar jag dig till bossstriden!</>
                : blixtIsNextStep && pendingBlixt
                ? <>Dags för <b>blixtpasset {blixtConfig(pendingBlixt).title}</b>! Visa ditt flyt så öppnas vägen vidare. Tryck så kör vi!</>
                : currentMoment
                ? <>{hasStarted ? 'Vi fortsätter med' : 'Nästa'}: <b>{currentMoment.title}</b>{currentWorld ? <> i {currentWorld.name}</> : null}. Tryck på knappen så tar jag dig dit!</>
                : <>Tryck på knappen så börjar vi träna tillsammans!</>}
            </span>
          </div>

          <button className="btn btn-primary" style={{ width: '100%', marginTop: 10 }} onClick={startTraining}>
            {bossIsNextStep && pendingBossWorld ? `Möt ${pendingBossWorld.boss.name}! ⚔`
              : blixtIsNextStep ? 'Kör blixtpasset! ⚡'
              : hasStarted ? 'Fortsätt passet ▶' : 'Starta passet ▶'}
          </button>
        </div>

        {rewards.map((reward) => {
          const progress = rewardProgress(reward, child)
          const left = progress.total - progress.done
          return (
            <div className="panel" key={reward.id}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                {isBelongIcon(reward.emoji)
                  ? <BelongIcon name={reward.emoji} size={40} />
                  : <span style={{ fontSize: 30 }}>{reward.emoji}</span>}
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
                <div className="pop" style={{ marginTop: 8, fontWeight: 900, fontSize: 13.5, color: 'var(--mint)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="pokal" size={18} /> Du klarade det! Visa för en vuxen så får du din belöning!
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
                    <div style={{ display: 'flex', gap: 4, marginTop: 7 }}>
                      {Array.from({ length: progress.total }).map((_, i) => (
                        <Icon key={i} name="stjarna" size={18}
                          style={{ opacity: i < progress.done ? 1 : 0.3, filter: i < progress.done ? undefined : 'grayscale(1)' }} />
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
              const level = blixtLevel(test.kind, child)
              const atTop = blixtTier(test.kind, child) >= blixtMaxTier(test.kind)
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
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="blixt" size={15} /> {test.title}</span>
                    {/* Svårighetstrappan: börjar lätt, stiger när minutmålet nås. */}
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--muted)' }}>
                      Nivå {level}{atTop ? ' · toppnivå! ⭐' : ' · blir svårare när du klarar målet'}
                    </span>
                  </span>
                  <span style={{ fontSize: 11.5, color: hitTarget ? 'var(--mint)' : 'var(--muted)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                    {record ? <><Icon name="pokal" size={13} /> {record.best}</> : 'nytt!'} {hitTarget ? '· mål nått' : `· mål ${target}`}
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
      {/* Pi förklarar hur noderna fungerar — en gång per barn. */}
      {!child.seenMapIntro && <MapIntro onDone={() => store.markMapIntroSeen()} />}
    </div>
  )
}

/* Pis engångsförklaring av kartans noder: träna → bossen vaknar → besegra
   bossen → noden blir klar → nästa öppnas. Så barnet förstår hur man tar
   sig vidare. */
function MapIntro({ onDone }: { onDone(): void }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, background: 'rgba(15,12,20,.72)',
    }}>
      <div className="card bounce-in" style={{ maxWidth: 440, width: '100%', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 12, padding: '22px' }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}><Pi mood="glad" size={84} /></div>
        <h2 className="display" style={{ fontSize: 22, fontWeight: 900, margin: 0, color: 'var(--ink)' }}>Så funkar äventyret!</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left', fontSize: 13.5, fontWeight: 700, color: 'var(--ink)' }}>
          <Legend icon="penna" bg="#FFDF94">Tryck på en nod och <b>träna</b> momentet.</Legend>
          <Legend icon="kristall" bg="var(--mint)">Klara <b>Pis vänliga koll</b> så blir noden <b>klar</b> ✓.</Legend>
          <Legend icon="svards" bg="var(--boss)">När <b>alla</b> noder i världen är klara <b>vaknar världsbossen</b>.</Legend>
          <Legend icon="las" bg="#D8D4C8"><b>Besegra bossen</b> så öppnas <b>nästa värld</b>!</Legend>
        </div>
        <button className="btn btn-primary" onClick={onDone} style={{ marginTop: 4 }}>Jag fattar! ▶</button>
      </div>
    </div>
  )
}

function Legend({ icon, bg, children }: { icon: IconName; bg: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{
        width: 34, height: 34, borderRadius: '50%', flexShrink: 0, background: bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 -2px 4px rgba(0,0,0,.25)',
      }}>
        <Icon name={icon} size={18} />
      </span>
      <span>{children}</span>
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
