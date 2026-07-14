/* ============================================================
   Levande värld — rörliga varelser och partiklar ovanpå de
   målade bakgrunderna (både rikeskartan och varje värld).

   Allt är lätt SVG + CSS-transform (inga bildfiler), ligger som
   ett eget lager med pointer-events:none mellan bakgrund och
   noder. Positioner och tider är HÅRDKODADE (deterministiskt →
   stabilt mellan omritningar, ingen slump). Respekterar
   prefers-reduced-motion via den globala CSS-regeln.
   ============================================================ */

/* ---------- Varelser (små SVG:er, ~50 px) ---------- */

function Bird({ tone = '#3B3550' }: { tone?: string }) {
  // Fågel i "V"-siluett — läses som en flygande fågel på håll.
  return (
    <svg viewBox="0 0 48 24" width="100%" height="100%" aria-hidden="true" style={{ display: 'block' }}>
      <path d="M2,16 Q14,2 24,14 Q34,2 46,16" fill="none" stroke={tone} strokeWidth="3.2"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Butterfly({ a = '#F2A6C6', b = '#FFD166' }: { a?: string; b?: string }) {
  return (
    <svg viewBox="0 0 40 34" width="100%" height="100%" aria-hidden="true" style={{ display: 'block' }}>
      <ellipse cx="14" cy="12" rx="10" ry="8" fill={a} />
      <ellipse cx="14" cy="23" rx="8" ry="7" fill={b} />
      <ellipse cx="26" cy="12" rx="10" ry="8" fill={a} />
      <ellipse cx="26" cy="23" rx="8" ry="7" fill={b} />
      <rect x="19" y="8" width="2.4" height="20" rx="1.2" fill="#4A3A2A" />
      <path d="M20,8 Q17,3 15,4 M20,8 Q23,3 25,4" stroke="#4A3A2A" strokeWidth="1.2" fill="none" strokeLinecap="round" />
    </svg>
  )
}

function Bat() {
  return (
    <svg viewBox="0 0 48 26" width="100%" height="100%" aria-hidden="true" style={{ display: 'block' }}>
      <path d="M24,8 Q20,2 14,6 Q10,0 4,4 Q8,8 6,14 Q14,10 18,16 Q20,10 24,14 Q28,10 30,16 Q34,10 42,14 Q40,8 44,4 Q38,0 34,6 Q28,2 24,8 Z"
        fill="#2A2438" />
      <circle cx="21" cy="9" r="1" fill="#FFD98A" />
      <circle cx="27" cy="9" r="1" fill="#FFD98A" />
    </svg>
  )
}

function Fish({ c = '#6FC0E4' }: { c?: string }) {
  return (
    <svg viewBox="0 0 40 24" width="100%" height="100%" aria-hidden="true" style={{ display: 'block' }}>
      <path d="M4,12 Q16,2 30,12 Q16,22 4,12 Z" fill={c} />
      <path d="M30,12 L40,5 L38,12 L40,19 Z" fill={c} />
      <circle cx="12" cy="10" r="1.6" fill="#22303A" />
      <path d="M18,7 Q22,12 18,17" stroke="#FFFFFF" strokeWidth="1.2" fill="none" opacity="0.6" />
    </svg>
  )
}

function Leaf({ c = '#C98A3A' }: { c?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true" style={{ display: 'block' }}>
      <path d="M12,2 Q22,10 12,22 Q2,10 12,2 Z" fill={c} />
      <path d="M12,4 L12,20" stroke="#7A5426" strokeWidth="1.2" />
    </svg>
  )
}

/* ---------- Konfiguration per miljö ---------- */

type FlyerKind = 'bird' | 'butterfly' | 'bat' | 'fish' | 'leaf'
interface Flyer {
  kind: FlyerKind
  top: string       // vertikalt läge (%)
  size: number      // px
  dur: number       // s för att korsa scenen
  delay: number     // s
  dir?: 'ltr' | 'rtl'
  color?: string
}
interface Particle { kind: 'mote' | 'glint' | 'flake'; x: number; y: number; glow: string; n: number }

interface Scene { flyers: Flyer[]; particles: Particle[] }

const SCENES: Record<string, Scene> = {
  riket: {
    flyers: [
      { kind: 'bird', top: '14%', size: 34, dur: 30, delay: 0, color: '#2C2740' },
      { kind: 'bird', top: '20%', size: 26, dur: 38, delay: 6, color: '#2C2740' },
      { kind: 'bird', top: '11%', size: 30, dur: 34, delay: 16, dir: 'rtl', color: '#2C2740' },
    ],
    particles: [],
  },
  'talens-dal': {
    flyers: [
      { kind: 'butterfly', top: '58%', size: 30, dur: 26, delay: 0 },
      { kind: 'butterfly', top: '70%', size: 24, dur: 30, delay: 9, dir: 'rtl', color: '#B8E0A0' },
      { kind: 'bird', top: '16%', size: 30, dur: 28, delay: 4, color: '#3A3550' },
      { kind: 'bird', top: '22%', size: 24, dur: 34, delay: 14, color: '#3A3550' },
    ],
    particles: [{ kind: 'glint', x: 50, y: 42, glow: '#FFE7A8', n: 4 }],
  },
  multiplikationsskogen: {
    flyers: [
      { kind: 'bird', top: '15%', size: 28, dur: 30, delay: 2, color: '#274031' },
      { kind: 'leaf', top: '0%', size: 20, dur: 13, delay: 0, color: '#C98A3A' },
      { kind: 'leaf', top: '0%', size: 16, dur: 17, delay: 7, color: '#D9A94A' },
    ],
    particles: [{ kind: 'mote', x: 40, y: 62, glow: '#FFE27A', n: 6 }, { kind: 'mote', x: 70, y: 55, glow: '#FFE27A', n: 4 }],
  },
  brakberget: {
    flyers: [
      { kind: 'bird', top: '13%', size: 30, dur: 32, delay: 1, color: '#3A4A63' },
      { kind: 'bird', top: '19%', size: 24, dur: 40, delay: 12, dir: 'rtl', color: '#3A4A63' },
    ],
    particles: [{ kind: 'flake', x: 50, y: 10, glow: '#FFFFFF', n: 10 }],
  },
  monsterskogen: {
    flyers: [
      { kind: 'bat', top: '20%', size: 30, dur: 20, delay: 0 },
      { kind: 'bat', top: '30%', size: 22, dur: 26, delay: 8, dir: 'rtl' },
    ],
    particles: [{ kind: 'mote', x: 45, y: 55, glow: '#C6A2F5', n: 6 }, { kind: 'mote', x: 72, y: 48, glow: '#C6A2F5', n: 4 }],
  },
  'formernas-berg': {
    flyers: [{ kind: 'bird', top: '15%', size: 28, dur: 34, delay: 3, color: '#2E6A72' }],
    particles: [{ kind: 'glint', x: 48, y: 52, glow: '#8FE8F0', n: 6 }, { kind: 'glint', x: 76, y: 46, glow: '#B8F0F4', n: 4 }],
  },
  diagramoarna: {
    flyers: [
      { kind: 'bird', top: '14%', size: 28, dur: 26, delay: 0, color: '#4A5A6A' },
      { kind: 'bird', top: '20%', size: 22, dur: 32, delay: 10, color: '#4A5A6A' },
      { kind: 'fish', top: '74%', size: 30, dur: 6, delay: 2, color: '#6FC0E4' },
      { kind: 'fish', top: '80%', size: 24, dur: 7, delay: 9, color: '#8FD4F0' },
    ],
    particles: [{ kind: 'glint', x: 55, y: 70, glow: '#FFFFFF', n: 6 }],
  },
  sambandsgrottan: {
    flyers: [
      { kind: 'bat', top: '18%', size: 30, dur: 18, delay: 0 },
      { kind: 'bat', top: '26%', size: 22, dur: 24, delay: 6, dir: 'rtl' },
      { kind: 'bat', top: '14%', size: 18, dur: 28, delay: 13 },
    ],
    particles: [{ kind: 'mote', x: 50, y: 60, glow: '#8FE8F0', n: 6 }, { kind: 'mote', x: 78, y: 50, glow: '#8FE8F0', n: 4 }],
  },
}

function drawFlyer(f: Flyer) {
  switch (f.kind) {
    case 'bird': return <Bird tone={f.color} />
    case 'butterfly': return <Butterfly a={f.color ?? undefined} />
    case 'bat': return <Bat />
    case 'fish': return <Fish c={f.color} />
    case 'leaf': return <Leaf c={f.color} />
  }
}

/** Rörligt liv över en scen. `scene` är en världs-id eller 'riket'. */
export function Ambience({ scene }: { scene: string }) {
  const cfg = SCENES[scene]
  if (!cfg) return null
  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', overflow: 'hidden' }}>
      {/* Varelser som korsar scenen (fjärilar/fåglar/fladdermöss driver i sidled,
          löv faller, fiskar hoppar i vattnet). */}
      {cfg.flyers.map((f, i) => {
        // Löv och fiskar står kvar i sidled (faller/hoppar på plats); övriga driver.
        const leftAnchor = f.kind === 'leaf' || f.kind === 'fish' ? `${12 + (i * 29) % 76}%` : undefined
        const anim =
          f.kind === 'leaf' ? `leaf-fall ${f.dur}s linear ${f.delay}s infinite`
          : f.kind === 'fish' ? `fish-leap ${f.dur}s ease-in-out ${f.delay}s infinite`
          : `${f.dir === 'rtl' ? 'drift-rtl' : 'drift-ltr'} ${f.dur}s linear ${f.delay}s infinite`
        return (
          <span key={i} style={{
            position: 'absolute', top: f.top, left: leftAnchor ?? 0, width: f.size, height: f.size * 0.6,
            animation: anim, willChange: 'transform',
          }}>
            {/* Inre vaggning så rörelsen inte är helt spikrak (fisk/löv sköter det själva). */}
            <span style={{
              display: 'block', width: '100%', height: '100%',
              animation: f.kind === 'butterfly' ? 'flutter 0.4s ease-in-out infinite'
                : f.kind === 'bat' ? 'bob-y 0.5s ease-in-out infinite'
                : (f.kind === 'bird' ? 'bob-y 2.4s ease-in-out infinite' : undefined),
            }}>
              {drawFlyer(f)}
            </span>
          </span>
        )
      })}

      {/* Stämningspartiklar (eldflugor/glimt/snö). */}
      {cfg.particles.flatMap((p, pi) =>
        Array.from({ length: p.n }).map((_, i) => {
          const seed = pi * 7 + i * 13
          const left = p.x + ((seed * 3) % 17) - 8
          const top = p.y + ((seed * 5) % 15) - 7
          const dur = 4 + (seed % 5)
          const delay = -((seed * 0.37) % dur)
          const dx = ((seed % 5) - 2) * 8
          const dy = p.kind === 'flake' ? 80 : ((seed % 4) - 2) * 9
          return (
            <span key={`${pi}-${i}`} className={p.kind} style={{
              left: `${left}%`, top: `${top}%`,
              ['--glow' as string]: p.glow, ['--dur' as string]: `${dur}s`,
              ['--dx' as string]: `${dx}px`, ['--dy' as string]: `${dy}px`,
              animationDelay: `${delay}s`,
            }} />
          )
        }),
      )}
    </div>
  )
}
