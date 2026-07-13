import type { WorldTheme } from '../worldThemes'
import { Celestial, CloudSvg, Sprite } from './WorldSprites'

/* ============================================================
   Världsmiljön: himlakropp, ritade moln, horisontsiluett i två
   lager (med detaljer som snötoppar/stjärnor) samt inramande
   sprites i kanterna. Ren SVG/CSS — inga bilder, väger inget,
   funkar offline.
   ============================================================ */

function silhouettePath(kind: WorldTheme['horizon'], layer: 0 | 1): string {
  // Alla ritas i en 1000×140-vy och skalas med preserveAspectRatio="none".
  switch (kind) {
    case 'kullar':
      return layer === 0
        ? 'M0,140 L0,80 Q160,20 340,75 Q520,125 700,60 Q850,15 1000,70 L1000,140 Z'
        : 'M0,140 L0,105 Q220,55 430,100 Q640,140 820,95 Q920,72 1000,95 L1000,140 Z'
    case 'skog': {
      // Rader av granar: taggig sicksack.
      const trees = (h: number, w: number, off: number): string => {
        let d = `M0,140 L0,${140 - h / 2}`
        for (let x = off; x < 1000; x += w) d += ` L${x + w / 2},${140 - h} L${x + w},${140 - h / 2}`
        return d + ' L1000,140 Z'
      }
      return layer === 0 ? trees(95, 90, 0) : trees(60, 64, 20)
    }
    case 'berg':
      return layer === 0
        ? 'M0,140 L0,90 L140,25 L300,95 L460,15 L620,100 L780,30 L1000,90 L1000,140 Z'
        : 'M0,140 L0,115 L200,60 L380,120 L560,55 L760,125 L900,80 L1000,110 L1000,140 Z'
    case 'slingor':
      return layer === 0
        ? 'M0,140 L0,85 Q80,45 160,85 Q240,125 320,85 Q400,45 480,85 Q560,125 640,85 Q720,45 800,85 Q880,125 960,85 L1000,85 L1000,140 Z'
        : 'M0,140 L0,112 Q100,82 200,112 Q300,138 400,112 Q500,82 600,112 Q700,138 800,112 Q900,82 1000,112 L1000,140 Z'
    case 'kristaller':
      return layer === 0
        ? 'M0,140 L0,95 L90,30 L170,95 L260,50 L340,100 L440,20 L540,95 L640,45 L730,100 L830,35 L920,90 L1000,60 L1000,140 Z'
        : 'M0,140 L0,120 L120,75 L230,120 L350,85 L470,120 L590,80 L710,120 L830,90 L940,120 L1000,105 L1000,140 Z'
    case 'vagor':
      return layer === 0
        ? 'M0,140 L0,90 Q125,60 250,90 Q375,120 500,90 Q625,60 750,90 Q875,120 1000,90 L1000,140 Z'
        : 'M0,140 L0,115 Q125,95 250,115 Q375,135 500,115 Q625,95 750,115 Q875,135 1000,115 L1000,140 Z'
    case 'grotta':
      // Stalaktiter hänger uppifrån (ritas därför i toppen, inverterad).
      return layer === 0
        ? 'M0,0 L1000,0 L1000,30 L940,95 L880,35 L800,120 L730,40 L640,105 L560,35 L470,130 L390,45 L300,110 L220,35 L140,90 L70,30 L0,60 Z'
        : 'M0,0 L1000,0 L1000,15 L900,55 L820,20 L700,70 L600,20 L500,80 L400,25 L290,65 L180,20 L90,50 L0,25 Z'
  }
}

/** Detaljer ovanpå siluetterna: snötoppar, stjärnor, glittrande hav. */
function HorizonDetails({ kind }: { kind: WorldTheme['horizon'] }) {
  switch (kind) {
    case 'berg':
      // Snötäckta toppar på det bakre bergslagret.
      return (
        <>
          <path d="M140,25 L108,42 Q140,52 172,42 Z" fill="#F4F9FF" opacity={0.95} />
          <path d="M460,15 L424,34 Q460,45 496,34 Z" fill="#F4F9FF" opacity={0.95} />
          <path d="M780,30 L750,45 Q780,54 810,45 Z" fill="#F4F9FF" opacity={0.9} />
        </>
      )
    case 'kristaller':
      return (
        <>
          <path d="M90,30 L74,44 L90,52 Z" fill="#E8FBFC" opacity={0.8} />
          <path d="M440,20 L420,38 L440,48 Z" fill="#E8FBFC" opacity={0.8} />
          <path d="M830,35 L814,48 L830,56 Z" fill="#E8FBFC" opacity={0.75} />
        </>
      )
    case 'vagor':
      // Vitt vågskum längs den bakre vågkammen.
      return (
        <path d="M0,90 Q125,60 250,90 Q375,120 500,90 Q625,60 750,90 Q875,120 1000,90"
          stroke="#FFFFFF" strokeWidth="4" fill="none" opacity={0.55} />
      )
    default:
      return null
  }
}

/** Fasta stjärnpositioner (deterministiska — ingen slump i UI:t heller). */
const STARS: [number, number, number][] = [
  [6, 10, 1.6], [16, 22, 1.1], [27, 7, 1.4], [38, 18, 1.0], [50, 9, 1.7],
  [61, 24, 1.1], [72, 12, 1.5], [83, 20, 1.0], [92, 8, 1.4], [45, 30, 0.9],
]

export function WorldScenery({ theme }: { theme: WorldTheme }) {
  const isCave = theme.horizon === 'grotta'
  const night = theme.celestial === 'mane' || isCave
  return (
    <>
      {/* Stjärnor på natt-/grottvärldarnas himmel. */}
      {night && (
        <svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true"
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '38%', pointerEvents: 'none', zIndex: 0 }}>
          {STARS.map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r * 0.28} fill={isCave ? '#8FE4EE' : '#FFF3D6'} opacity={0.7} />
          ))}
        </svg>
      )}

      {/* Sol eller måne i övre hörnet. */}
      {theme.celestial !== 'ingen' && (
        <span aria-hidden="true" style={{ position: 'absolute', top: 46, right: 26, zIndex: 0, pointerEvents: 'none', opacity: 0.95 }}>
          <Celestial kind={theme.celestial} size={66} />
        </span>
      )}

      {/* Ritade moln som driver förbi. */}
      {theme.clouds && (
        <>
          <span className="cloud" aria-hidden="true" style={{ top: '6%', animationDuration: '75s', animationDelay: '-20s', zIndex: 1 }}>
            <CloudSvg width={84} />
          </span>
          <span className="cloud" aria-hidden="true" style={{ top: '15%', animationDuration: '105s', animationDelay: '-58s', zIndex: 1 }}>
            <CloudSvg width={56} opacity={0.8} />
          </span>
        </>
      )}

      {/* Horisonten: två siluettlager för djup. Grottans tak hänger uppifrån. */}
      <svg
        viewBox="0 0 1000 140"
        preserveAspectRatio="none"
        aria-hidden="true"
        style={{
          position: 'absolute', left: 0, right: 0, width: '100%', height: 110,
          ...(isCave ? { top: 0 } : { top: 96 }),
          pointerEvents: 'none', zIndex: 0, opacity: 0.9,
        }}
      >
        <path d={silhouettePath(theme.horizon, 0)} fill={theme.horizonColors[0]} opacity={0.6} />
        <HorizonDetails kind={theme.horizon} />
        <path d={silhouettePath(theme.horizon, 1)} fill={theme.horizonColors[1]} opacity={0.8} />
      </svg>

      {/* Inramande sprites i nederkanterna — utanför vägen, stör inte noderna. */}
      <span aria-hidden="true" style={{ position: 'absolute', bottom: 40, left: 6, zIndex: 1, pointerEvents: 'none' }}>
        <Sprite name={theme.sprites[0]} size={54} />
      </span>
      <span aria-hidden="true" style={{ position: 'absolute', bottom: 40, right: 8, zIndex: 1, pointerEvents: 'none' }}>
        <Sprite name={theme.sprites[1]} size={44} flip />
      </span>
    </>
  )
}
