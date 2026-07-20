import { useEffect, useRef, useState } from 'react'
import type { ChildProfile } from '../../domain/types'
import { momentsInWorld } from '../../domain/curriculum'
import { WORLDS } from '../../domain/worlds'
import { hasGenerator } from '../../generators'
import { sfx } from '../../sound'
import { Pi } from './Pi'
import { Ambience } from './Ambience'
import { CloudSvg, Sprite, type SpriteName } from './WorldSprites'
import { worldTheme } from '../worldThemes'

/* ============================================================
   Riket — den stora startkartan över hela Matteriket.

   Kartan är en AI-målad fantasykarta (public/art/riket.webp,
   genererad av föräldern via Gemini — se prompterna i chatt-
   historiken). Regionknappar, framsteg och Pi ligger som eget
   interaktivt lager ovanpå. Om målningen saknas/inte hunnit
   laddas ritas en enklare SVG-version — kartan är aldrig tom.
   Barnet trycker på en region och kartan zoomar in till
   världens väg.
   ============================================================ */

interface Region {
  worldId: string
  /** Centrum i procent — i den MÅLADE kartans geografi. */
  art: { x: number; y: number }
  /** Centrum i procent — i SVG-reservens geografi. */
  svg: { x: number; y: number }
  /** Regionens signatursprites (används i knappmärket + reserven). */
  sprites: [SpriteName, SpriteName]
}

/* Koordinaterna följer den aktuella målningens geografi:
   talstenarna (dal), glaciären (bråk), granskogen (gånger), runskogen
   med drakskelettet (mönster), pyramidöknen (former), skeppshavet
   (diagram) och kristallgrottan (samband). */
const REGIONS: Region[] = [
  { worldId: 'talens-dal', art: { x: 12, y: 50 }, svg: { x: 17, y: 76 }, sprites: ['lovtrad', 'blomma'] },
  { worldId: 'multiplikationsskogen', art: { x: 36, y: 66 }, svg: { x: 42, y: 84 }, sprites: ['gran', 'svamp'] },
  { worldId: 'brakberget', art: { x: 30, y: 17 }, svg: { x: 20, y: 42 }, sprites: ['snogran', 'sten'] },
  { worldId: 'monsterskogen', art: { x: 50, y: 55 }, svg: { x: 50, y: 55 }, sprites: ['snurrtrad', 'orb'] },
  { worldId: 'formernas-berg', art: { x: 76, y: 47 }, svg: { x: 74, y: 30 }, sprites: ['kristall', 'sten'] },
  { worldId: 'diagramoarna', art: { x: 74, y: 14 }, svg: { x: 84, y: 74 }, sprites: ['palm', 'segelbat'] },
  { worldId: 'sambandsgrottan', art: { x: 80, y: 82 }, svg: { x: 50, y: 16 }, sprites: ['stalagmit', 'kristall'] },
]

/** Målningens proportioner — knappkoordinaterna gäller inom den. */
const ART_RATIO = '1024 / 559'

/** Resvägen genom riket i SVG-reserven, i läroplansordning (1000×640). */
function realmTrail(): string {
  const pts = WORLDS.map((w) => {
    const r = REGIONS.find((r) => r.worldId === w.id)!
    return [r.svg.x * 10, r.svg.y * 6.4] as const
  })
  let d = `M${pts[0][0]},${pts[0][1]}`
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1]
    const [x1, y1] = pts[i]
    // Mjuk båge med liten utböjning vinkelrätt mot sträckan.
    const mx = (x0 + x1) / 2 + (y1 - y0) * 0.18
    const my = (y0 + y1) / 2 - (x1 - x0) * 0.18
    d += ` Q${mx},${my} ${x1},${y1}`
  }
  return d
}

/** Resväg i den MÅLADE kartans koordinater (art-procent → 1024×559), i
    läroplansordning. `upTo` begränsar hur långt stigen ritas (nuvarande
    region), så vi kan rita en tydlig "hittills"-del och en blek framtid. */
function artTrail(upTo: number): string {
  const pts = WORLDS.map((w) => {
    const r = REGIONS.find((r) => r.worldId === w.id)!
    return [(r.art.x / 100) * 1024, (r.art.y / 100) * 559] as const
  })
  const end = Math.max(0, Math.min(upTo, pts.length - 1))
  let d = `M${pts[0][0]},${pts[0][1]}`
  for (let i = 1; i <= end; i++) {
    const [x0, y0] = pts[i - 1]
    const [x1, y1] = pts[i]
    const mx = (x0 + x1) / 2 + (y1 - y0) * 0.16
    const my = (y0 + y1) / 2 - (x1 - x0) * 0.16
    d += ` Q${mx},${my} ${x1},${y1}`
  }
  return d
}

function worldProgress(child: ChildProfile, worldId: string): { done: number; total: number } {
  const moments = momentsInWorld(worldId).filter((m) => hasGenerator(m.generatorId))
  const done = moments.filter((m) => {
    const s = child.skills[m.id]
    return s?.mastery === 'mastered' || s?.mastery === 'star'
  }).length
  return { done, total: moments.length }
}

interface RealmMapProps {
  child: ChildProfile
  currentWorldId: string
  onPick(worldId: string): void
}

/* Stämningspartiklar utplacerade vid kartans olika trakter (deterministiskt,
   ingen slump → stabilt mellan omritningar). Ligger mellan målning (z0) och
   regionknappar (z2). Respekterar prefers-reduced-motion via global CSS. */
type Emitter = { x: number; y: number; glow: string; kind: 'mote' | 'glint' | 'flake'; n: number }
const AMBIENT_EMITTERS: Emitter[] = [
  { x: 36, y: 64, glow: '#FFE27A', kind: 'mote', n: 5 },   // Tabellernas skog — eldflugor
  { x: 49, y: 52, glow: '#C6A2F5', kind: 'mote', n: 5 },   // Algoritmens glänta — violetta motes
  { x: 80, y: 80, glow: '#8FE8F0', kind: 'mote', n: 5 },   // Sambandsgrottan — kristallmotes
  { x: 73, y: 16, glow: '#FFFFFF', kind: 'glint', n: 6 },  // Diagramöarna — vattenglimt
  { x: 55, y: 78, glow: '#9BE8FF', kind: 'glint', n: 4 },  // grottsjöns glimt
  { x: 28, y: 20, glow: '#FFFFFF', kind: 'flake', n: 7 },  // Bråkdrakens klippa — snö
]

function AmbientLife() {
  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', overflow: 'hidden' }}>
      {AMBIENT_EMITTERS.flatMap((e, ei) =>
        Array.from({ length: e.n }).map((_, i) => {
          const seed = ei * 7 + i * 13
          const left = e.x + ((seed * 3) % 11) - 5      // ±5% spridning
          const top = e.y + ((seed * 5) % 11) - 5
          const dur = 4 + ((seed) % 5)                  // 4–8 s
          const delay = -((seed * 0.37) % dur)
          const dx = ((seed % 5) - 2) * 8               // drift
          const dy = e.kind === 'flake' ? 70 : ((seed % 4) - 2) * 9
          return (
            <span
              key={`${ei}-${i}`}
              className={e.kind}
              style={{
                left: `${left}%`, top: `${top}%`,
                ['--glow' as string]: e.glow,
                ['--dur' as string]: `${dur}s`,
                ['--dx' as string]: `${dx}px`,
                ['--dy' as string]: `${dy}px`,
                animationDelay: `${delay}s`,
              }}
            />
          )
        }),
      )}
    </div>
  )
}

export function RealmMap({ child, currentWorldId, onPick }: RealmMapProps) {
  const [zoomTo, setZoomTo] = useState<{ x: number; y: number } | null>(null)
  const [artOk, setArtOk] = useState(false)
  const zooming = useRef(false)
  const artUrl = `${import.meta.env.BASE_URL}art/riket.webp`
  const ringUrl = `${import.meta.env.BASE_URL}art/tex/nodering.webp`
  // Hur långt barnet nått i resvägen (för den upplysta "hittills"-stigen).
  const currentIdx = Math.max(0, WORLDS.findIndex((w) => w.id === currentWorldId))

  /* Dimma ("fog of war"): oupptäckta delar av riket ligger i moln. En värld är
     ÖPPEN = första världen eller föregående värld erövrad (samma begrepp som
     bossgrinden — inga nya motorbegrepp). Första icke-öppna världen visas i
     lätt dis (medaljong + namn syns, men framsteg döljs), världarna bortom den
     i tjock dimma med ???. Erövran är sekventiell, så de öppna världarna bildar
     ett sammanhängande förled och det finns som mest EN "nästa". */
  const conqueredSet = new Set(child.conqueredWorlds ?? [])
  const worldOpen = (i: number): boolean => i === 0 || conqueredSet.has(WORLDS[i - 1].id)
  const firstClosedIdx = WORLDS.findIndex((_, i) => !worldOpen(i))
  const visibilityOf = (worldId: string): 'open' | 'next' | 'beyond' => {
    if (firstClosedIdx === -1) return 'open'
    const i = WORLDS.findIndex((w) => w.id === worldId)
    return i < firstClosedIdx ? 'open' : i === firstClosedIdx ? 'next' : 'beyond'
  }

  /* Avslöjandet: en värld som är ÖPPEN men ännu inte "sedd" (barnet har inte
     anlänt) tonar fram ur dimman en gång — molnen glider isär. Vid
     prefers-reduced-motion hoppar vi direkt till klart läge. seenWorlds sätts
     sedan av ankomstkortet i Home när barnet går in i världen. */
  const seenSet = new Set(child.seenWorlds ?? [])
  const [revealed, setRevealed] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    if (revealed) return
    // Dubbel rAF: låt den dimmiga första bilden målas innan övergången startar.
    let raf2 = 0
    const raf1 = requestAnimationFrame(() => { raf2 = requestAnimationFrame(() => setRevealed(true)) })
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2) }
  }, [revealed])

  const pick = (region: Region): void => {
    if (zooming.current) return
    // Stängda världar går inte att zooma in i (ingen väg dit ännu).
    if (visibilityOf(region.worldId) !== 'open') return
    zooming.current = true
    sfx.whoosh()
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return onPick(region.worldId)
    setZoomTo(artOk ? region.art : region.svg)
    window.setTimeout(() => onPick(region.worldId), 430)
  }

  return (
    <div style={{
      position: 'absolute', inset: 0, overflow: 'hidden',
      // Kartan hänger på en mörk stenvägg (dungeon-känsla). Sten-texturen
      // kaklas; mörk ton ovanpå ger djup. Reserv: mörk enfärg.
      background: 'linear-gradient(rgba(20,16,26,0.55), rgba(20,16,26,0.72)), var(--tex-stone, none) center / 340px repeat, #1B1F30',
    }}>
      {/* Vinjett så kanterna mörknar och den inramade kartan lyfter fram. */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        boxShadow: 'inset 0 0 120px rgba(0,0,0,0.6)',
      }} />

      {/* Kartboxen: målningens proportioner, centrerad; zoomen sker här.
          Storleken styrs av (stabila) BREDDEN + fast bildproportion — aldrig
          av fönsterhöjden. Annars flyttar iOS Safari ringarna när adressfältet
          fälls in/ut och höjden ändras. */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div
          style={{
            position: 'relative',
            ...(artOk
              ? { width: '100%', aspectRatio: ART_RATIO }
              : { width: '100%', height: '100%' }),
            transformOrigin: zoomTo ? `${zoomTo.x}% ${zoomTo.y}%` : '50% 50%',
            transform: zoomTo ? 'scale(2.6)' : 'scale(1)',
            opacity: zoomTo ? 0 : 1,
            transition: 'transform 0.45s ease-in, opacity 0.45s ease-in',
          }}
        >
          {/* Den målade kartan. onError → SVG-reserven blir kvar. */}
          <img
            src={artUrl} alt="Karta över Matteriket"
            onLoad={() => setArtOk(true)}
            onError={() => setArtOk(false)}
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              display: artOk ? 'block' : 'none',
              borderRadius: 10, boxShadow: '0 4px 24px rgba(0,0,0,.4)',
            }}
          />

          {/* SVG-reserven: enklare ritat rike tills målningen finns. */}
          {!artOk && (
            <>
              <svg viewBox="0 0 1000 640" preserveAspectRatio="none" aria-hidden="true"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                <defs>
                  <linearGradient id="rike-mark" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#BCE0EE" />
                    <stop offset="0.35" stopColor="#C8E6B4" />
                    <stop offset="1" stopColor="#B2DA9A" />
                  </linearGradient>
                  <radialGradient id="rike-grotta" cx="0.5" cy="0.5" r="0.5">
                    <stop offset="0" stopColor="#3A3655" />
                    <stop offset="0.75" stopColor="#4A4468" />
                    <stop offset="1" stopColor="#4A446800" />
                  </radialGradient>
                  <radialGradient id="rike-monster" cx="0.5" cy="0.5" r="0.5">
                    <stop offset="0" stopColor="#C2A8E4" />
                    <stop offset="1" stopColor="#C2A8E400" />
                  </radialGradient>
                  <radialGradient id="rike-kristall" cx="0.5" cy="0.5" r="0.5">
                    <stop offset="0" stopColor="#A8DCE0" />
                    <stop offset="1" stopColor="#A8DCE000" />
                  </radialGradient>
                </defs>

                <rect width="1000" height="640" fill="url(#rike-mark)" />
                {/* Havet kring Diagramöarna. */}
                <path d="M1000,340 Q820,360 780,440 Q740,530 800,640 L1000,640 Z" fill="#7FC8E8" />
                <path d="M1000,360 Q840,380 800,450 Q765,525 815,640 L860,640 Q810,520 850,455 Q890,395 1000,385 Z"
                  fill="#A8DCF4" opacity="0.7" />
                {/* Bergskedjan kring Bråkberget. */}
                <path d="M60,330 L140,190 L215,320 Z" fill="#8FA6C4" />
                <path d="M140,190 L115,235 Q140,248 165,235 Z" fill="#F4F9FF" />
                <path d="M170,345 L260,215 L340,340 Z" fill="#7C94B4" />
                <path d="M260,215 L237,255 Q260,266 283,255 Z" fill="#F4F9FF" />
                <path d="M40,360 Q190,290 360,365 Q200,395 40,360 Z" fill="#9FB4CE" opacity="0.5" />
                {/* Grottans mörka trakt, Mönsterskogens skymning, kristallglansen. */}
                <ellipse cx="500" cy="105" rx="240" ry="115" fill="url(#rike-grotta)" />
                <ellipse cx="500" cy="355" rx="190" ry="105" fill="url(#rike-monster)" opacity="0.8" />
                <ellipse cx="740" cy="195" rx="180" ry="110" fill="url(#rike-kristall)" opacity="0.9" />
                {/* Skogens och dalens grönska. */}
                <ellipse cx="420" cy="545" rx="220" ry="95" fill="#8FBF7A" opacity="0.65" />
                <ellipse cx="170" cy="500" rx="180" ry="90" fill="#B8DCA0" opacity="0.8" />
                {/* Resvägen genom riket. */}
                <path d={realmTrail()} stroke="#FFF7E0" strokeWidth="15" fill="none" strokeLinecap="round" opacity="0.5" />
                <path d={realmTrail()} stroke="#E8B44C" strokeWidth="7" fill="none" strokeLinecap="round" strokeDasharray="0.1 14" />
              </svg>

              {/* Drivande moln (bara i reserven — målningen har egna). */}
              <span className="cloud" aria-hidden="true" style={{ top: '8%', animationDuration: '90s', animationDelay: '-30s', zIndex: 1 }}>
                <CloudSvg width={70} />
              </span>
              <span className="cloud" aria-hidden="true" style={{ top: '58%', animationDuration: '120s', animationDelay: '-70s', zIndex: 1 }}>
                <CloudSvg width={48} opacity={0.7} />
              </span>
            </>
          )}

          {/* Resvägen genom riket, ritad på den målade kartan: en blek stig
              genom hela riket + en tydlig gyllene "hittills"-del fram till den
              region barnet är i just nu. Ligger under regionmärkena. */}
          {artOk && (
            <svg viewBox="0 0 1024 559" preserveAspectRatio="none" aria-hidden="true"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 1, pointerEvents: 'none' }}>
              <path d={artTrail(WORLDS.length - 1)} fill="none" stroke="#1B140C" strokeWidth={9}
                strokeLinecap="round" opacity={0.3} />
              <path d={artTrail(WORLDS.length - 1)} fill="none" stroke="#EAD393" strokeWidth={3.5}
                strokeLinecap="round" strokeDasharray="0.1 15" opacity={0.4} />
              <path d={artTrail(currentIdx)} fill="none" stroke="#1B140C" strokeWidth={11}
                strokeLinecap="round" opacity={0.5} />
              <path d={artTrail(currentIdx)} fill="none" stroke="#F3C24A" strokeWidth={5}
                strokeLinecap="round" strokeDasharray="0.1 14"
                style={{ filter: 'drop-shadow(0 0 3px rgba(243,194,74,.75))' }} />
            </svg>
          )}

          {/* Stämningsliv ovanpå målningen: eldflugor i skogarna, vattenglimt
              vid havet, kristallgnistor i grottan, snö på berget. */}
          {artOk && <AmbientLife />}
          {/* Tunna, långsamma moln som driver över kartan (ersätter fåglarna). */}
          {artOk && <Ambience scene="riket" />}

          {/* Regionernas knappar (och sprites i SVG-reserven). */}
          {REGIONS.map((region) => {
            const world = WORLDS.find((w) => w.id === region.worldId)!
            const theme = worldTheme(region.worldId)
            const progress = worldProgress(child, region.worldId)
            const momentsDone = progress.total > 0 && progress.done === progress.total
            const conquered = child.conqueredWorlds?.includes(region.worldId) ?? false
            // "Klar" (grön bock + "allt klart!") kräver att BOSSEN är besegrad —
            // inte bara att momenten är gjorda. Alla moment klara men boss kvar
            // = "möt bossen!". Så kartan aldrig säger klart innan bossen är slagen.
            const complete = momentsDone && conquered
            const bossWaiting = momentsDone && !conquered
            const isHere = region.worldId === currentWorldId
            const pos = artOk ? region.art : region.svg
            // På målningen är hela riket dramatiskt mörkt — ljus text överallt.
            const dark = artOk || region.worldId === 'sambandsgrottan'
            const vis = visibilityOf(region.worldId)
            const isRevealing = vis === 'open' && !seenSet.has(region.worldId)
            // Dimman ligger på stängda världar — och kvarstår på en avslöjande
            // värld tills övergången spelats, då tonar den bort.
            const fogged = vis !== 'open' || (isRevealing && !revealed)
            const fogFilter = vis === 'beyond' ? 'grayscale(.9) brightness(.6)' : 'grayscale(.55) brightness(.8)'
            const clickable = vis === 'open'
            return (
              <span key={region.worldId}>
                {!artOk && (
                  <>
                    <span aria-hidden="true" style={{ position: 'absolute', left: `${pos.x - 9}%`, top: `${pos.y - 4}%`, zIndex: 1, pointerEvents: 'none' }}>
                      <Sprite name={region.sprites[0]} size={40} />
                    </span>
                    <span aria-hidden="true" style={{ position: 'absolute', left: `${pos.x + 6}%`, top: `${pos.y - 1}%`, zIndex: 1, pointerEvents: 'none' }}>
                      <Sprite name={region.sprites[1]} size={32} flip />
                    </span>
                  </>
                )}
                <button
                  onClick={() => pick(region)}
                  disabled={!clickable}
                  aria-label={
                    vis === 'beyond' ? 'Outforskad värld — dold i dimma'
                    : vis === 'next' ? `${world.name} — ännu inte öppen`
                    : `${world.name} — ${progress.done} av ${progress.total} moment klarade`
                  }
                  style={{
                    position: 'absolute', left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%, -50%)',
                    // Nuvarande region (med Pi) lyfts över grannmärkena.
                    zIndex: isHere ? 5 : 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                    fontFamily: 'inherit', cursor: clickable ? 'pointer' : 'default',
                    // Dis-filtret på hela märket (medaljong + banderoll); avslöjande
                    // värld tonar från dis → klart via transitionen.
                    filter: fogged ? fogFilter : undefined,
                    transition: isRevealing ? 'filter 1.2s ease' : undefined,
                  }}
                >
                  <span
                    className="map-node"
                    style={{
                      position: 'relative', width: 84, height: 84,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      filter: isHere
                        ? 'drop-shadow(0 0 7px rgba(255,201,77,.95)) drop-shadow(0 3px 4px rgba(0,0,0,.4))'
                        : 'drop-shadow(0 3px 4px rgba(0,0,0,.4))',
                    }}
                  >
                    {/* Medaljongen i ringens hål (hålradie ≈ 0.56 → ~47px av 84). */}
                    <span style={{
                      width: 47, height: 47, borderRadius: '50%',
                      ...(artOk
                        ? { backgroundImage: `url(${artUrl})`, backgroundSize: '560%', backgroundPosition: `${region.art.x}% ${region.art.y}%`, backgroundRepeat: 'no-repeat' }
                        : { background: `radial-gradient(circle at 33% 28%, rgba(255,255,255,.55), rgba(255,255,255,0) 60%), ${theme.horizonColors[1]}` }),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {!artOk && <Sprite name={region.sprites[0]} size={30} />}
                    </span>
                    {/* Ornamenterad mässingsring ovanpå (genomskinligt hål + utsida). */}
                    <img src={ringUrl} alt="" aria-hidden="true"
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />
                    {complete && (
                      <svg viewBox="0 0 24 24" width={22} height={22} aria-hidden="true"
                        style={{ position: 'absolute', top: 2, right: 2, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.4))' }}>
                        <circle cx="12" cy="12" r="11" fill="var(--mint)" stroke="#fff" strokeWidth="2" />
                        <path d="M7,12.5 L10.5,16 L17,8.5" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                    {/* Pi (ugglan) står på den region barnet är i just nu — stor
                        och tydlig, svävar mjukt, med "Du är här"-fana under. */}
                    {isHere && (
                      <span className="float-soft" style={{
                        position: 'absolute', top: -52, left: '50%', transform: 'translateX(-50%)',
                        filter: 'drop-shadow(0 5px 6px rgba(0,0,0,.55))', zIndex: 6,
                      }}>
                        <Pi mood="glad" size={58} />
                        <span className="display" style={{
                          position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%) translateY(-6px)',
                          whiteSpace: 'nowrap', fontSize: 10.5, fontWeight: 900, color: '#3A2E14',
                          background: 'linear-gradient(#FFE7A8, #F3C24A)', border: '1.5px solid #A97C2E',
                          borderRadius: 8, padding: '1px 8px', boxShadow: '0 2px 5px rgba(0,0,0,.5)',
                        }}>Du är här</span>
                      </span>
                    )}
                  </span>
                  {/* Pergamentbanderoll — läsbar mot vilken kartmålning som helst. */}
                  <span className="display" style={{
                    fontWeight: 900, fontSize: 12.5, lineHeight: 1.15, textAlign: 'center', maxWidth: 132,
                    background: artOk ? 'rgba(246,238,220,.94)' : dark ? 'rgba(30,27,50,.85)' : 'rgba(255,252,244,.85)',
                    color: artOk ? '#3A3122' : dark ? '#F3EFFF' : 'var(--ink)',
                    border: `1.5px solid ${artOk ? '#6B5B40' : 'transparent'}`,
                    borderRadius: 7, padding: '3px 9px',
                    boxShadow: artOk ? '0 2px 5px rgba(0,0,0,.4)' : '0 1px 4px rgba(0,0,0,.2)',
                  }}>
                    {vis === 'beyond' ? '???' : world.name}
                    <span style={{ display: 'block', fontWeight: 700, fontSize: 10.5, fontFamily: 'var(--font)', color: artOk ? '#6E6046' : dark ? '#CFC8E4' : 'var(--muted)' }}>
                      {vis === 'beyond' ? ' '
                        : vis === 'next' ? '? / ? moment'
                        : progress.total === 0 ? 'kommer snart'
                        : complete ? 'allt klart! ✓'
                        : bossWaiting ? 'möt bossen! ⚔'
                        : `${progress.done} / ${progress.total} moment klarade`}
                    </span>
                  </span>
                </button>
              </span>
            )
          })}

          {/* Dimslöjan: TÄT dimma som TÄCKER de olåsta trakterna — inklusive
              medaljongerna, som bara skönjs som skuggor genom diset (inga separata
              moln längre). Ligger ÖVER regionknapparna (z3). Två överlappande,
              långsamt drivande blobbar per region (.mist-blob, egen takt) → levande
              dimma i stället för en tydlig cirkel. Klippt till kartans yta så diset
              aldrig rinner ut på stenväggen. En öppen-men-osedd värld tonar bort
              slöjan (avslöjandet). pointer-events av. */}
          <div aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: 10, zIndex: 3, pointerEvents: 'none' }}>
          {REGIONS.map((region, ri) => {
            const vis = visibilityOf(region.worldId)
            const isRevealing = vis === 'open' && !seenSet.has(region.worldId)
            if (vis === 'open' && !isRevealing) return null
            const pos = artOk ? region.art : region.svg
            // Täthet per blobb — de TVÅ blobbarna överlappar, så den effektiva
            // opaciteten i mitten blir högre än så här. Håll den nere så
            // medaljongerna fortfarande SKÖNJS som skuggor genom diset (inte
            // helt vitt). Bortom = tätare, nästa = tunnare, avslöjande tonar → 0.
            const mist = isRevealing ? (revealed ? 0 : 0.62) : vis === 'beyond' ? 0.6 : 0.38
            const fadeTransition = isRevealing ? 'opacity 1.3s ease' : undefined
            // Två blobbar med olika storlek/takt → oregelbunden, mjuk dimma.
            const puffs = [
              { w: '64%', dur: 13 + ri, delay: -ri * 2.3, dx: 0, dy: 0, o: 1 },
              { w: '48%', dur: 17 + ri, delay: -ri * 1.6 - 4, dx: 10, dy: -8, o: 0.85 },
            ]
            return (
              <span key={`fog-${region.worldId}`} style={{ position: 'absolute', inset: 0, opacity: 1, transition: fadeTransition }}>
                {puffs.map((p, pi) => (
                  <span
                    key={pi}
                    className="mist-blob"
                    style={{
                      position: 'absolute', left: `calc(${pos.x}% + ${p.dx}px)`, top: `calc(${pos.y}% + ${p.dy}px)`,
                      width: p.w, aspectRatio: '1', borderRadius: '50%', filter: 'blur(9px)',
                      animationDuration: `${p.dur}s`, animationDelay: `${p.delay}s`,
                      background: `radial-gradient(circle, rgba(236,239,246,${mist * p.o}) 0%, rgba(228,233,243,${mist * p.o}) 34%, rgba(222,228,240,${mist * p.o * 0.6}) 56%, rgba(222,228,240,0) 76%)`,
                      transition: fadeTransition,
                    }}
                  />
                ))}
              </span>
            )
          })}
          </div>
        </div>
      </div>
    </div>
  )
}
