import type { WorldTheme } from '../worldThemes'

/* ============================================================
   Världsmiljön: horisontsiluett (två lager) + svävande dekor.
   Ren SVG/CSS — inga bilder, väger inget, funkar offline.
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

export function WorldScenery({ theme }: { theme: WorldTheme }) {
  const isCave = theme.horizon === 'grotta'
  return (
    <>
      {/* Horisonten: två siluettlager för djup. Grottans tak hänger uppifrån. */}
      <svg
        viewBox="0 0 1000 140"
        preserveAspectRatio="none"
        aria-hidden="true"
        style={{
          position: 'absolute', left: 0, right: 0, width: '100%', height: 110,
          ...(isCave ? { top: 0 } : { top: 96 }),
          pointerEvents: 'none', zIndex: 0, opacity: 0.85,
        }}
      >
        <path d={silhouettePath(theme.horizon, 0)} fill={theme.horizonColors[0]} opacity={0.55} />
        <path d={silhouettePath(theme.horizon, 1)} fill={theme.horizonColors[1]} opacity={0.75} />
      </svg>

      {/* Svävande dekor i kanterna — utanför vägen, stör inte noderna. */}
      {theme.decor.map((d, i) => (
        <span
          key={i}
          className="float-soft"
          aria-hidden="true"
          style={{
            position: 'absolute', zIndex: 1, pointerEvents: 'none',
            top: d.top, bottom: d.bottom, left: d.left, right: d.right,
            fontSize: d.size, animationDelay: `${d.delay ?? 0}s`,
            filter: 'drop-shadow(0 2px 2px rgba(0,0,0,.12))',
          }}
        >{d.emoji}</span>
      ))}
    </>
  )
}
