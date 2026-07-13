/* ============================================================
   Handritade vektorsprites — kartans natur och rekvisita.

   Allt ritas som ren SVG i tecknad spelstil (jfr Zelda/Mario-
   världskartor): platta färger + ljusare highlight-former, inga
   emojis och inga bildfiler. Varje sprite ritas i en 64×64-vy
   med marken vid y=64, så de kan radas längs vägen i valfri
   storlek. `flip` speglar för variation.
   ============================================================ */

export type SpriteName =
  | 'lovtrad' | 'gran' | 'snogran' | 'blomma' | 'svamp' | 'sten' | 'buske'
  | 'kristall' | 'palm' | 'stalagmit' | 'orb' | 'segelbat' | 'tuva' | 'snurrtrad'

interface SpriteProps {
  name: SpriteName
  size?: number
  flip?: boolean
  /** 0 eller 1 — växlar mellan två färgstämningar för variation. */
  tone?: 0 | 1
}

/* Små hjälpare för återkommande delar. */

function Trunk({ x = 28, w = 8, h = 18, color = '#8A5A33' }: { x?: number; w?: number; h?: number; color?: string }) {
  return <path d={`M${x},64 L${x + 1},${64 - h} Q${x + w / 2},${64 - h - 3} ${x + w - 1},${64 - h} L${x + w},64 Z`} fill={color} />
}

const CROWN = { ljus: ['#7FC46B', '#95D47F'], mork: ['#4E8F45', '#63A857'] }

function Lovtrad({ tone = 0 }: { tone?: 0 | 1 }) {
  const [base, hi] = tone === 0 ? CROWN.ljus : CROWN.mork
  return (
    <>
      <Trunk x={28} w={8} h={20} />
      <circle cx="20" cy="34" r="13" fill={base} />
      <circle cx="44" cy="34" r="13" fill={base} />
      <circle cx="32" cy="22" r="15" fill={base} />
      <circle cx="27" cy="19" r="7" fill={hi} opacity={0.8} />
      <circle cx="17" cy="31" r="4.5" fill={hi} opacity={0.6} />
      {/* mörk underkant ger volym */}
      <path d="M10,40 Q32,52 54,40 Q45,48 32,48 Q19,48 10,40 Z" fill="#3E7538" opacity={0.35} />
    </>
  )
}

function Gran({ snow = false, tone = 0 }: { snow?: boolean; tone?: 0 | 1 }) {
  const dark = tone === 0 ? '#2F6B3F' : '#25553A'
  const mid = tone === 0 ? '#3E8450' : '#316A47'
  return (
    <>
      <Trunk x={29} w={6} h={10} color="#6E4526" />
      <path d="M32,44 L14,58 L50,58 Z" fill={dark} />
      <path d="M32,26 L16,44 L48,44 Z" fill={mid} />
      <path d="M32,8 L19,30 L45,30 Z" fill={mid} />
      <path d="M32,8 L26,18 L38,18 Z" fill="#55A163" opacity={0.9} />
      {snow && (
        <>
          <path d="M32,8 L25,20 Q32,24 39,20 Z" fill="#F4F9FF" />
          <path d="M22,36 Q32,42 42,36 L45,42 Q32,48 19,42 Z" fill="#F4F9FF" opacity={0.9} />
        </>
      )}
    </>
  )
}

function Blomma({ tone = 0 }: { tone?: 0 | 1 }) {
  const petal = tone === 0 ? '#F8A8C0' : '#FFD166'
  return (
    <>
      <path d="M32,64 Q30,48 32,38" stroke="#5E9C4F" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M32,52 Q24,50 22,44 Q30,44 32,50 Z" fill="#6FAF5E" />
      {[0, 60, 120, 180, 240, 300].map((a) => (
        <ellipse key={a} cx="32" cy="27" rx="5.5" ry="9" fill={petal}
          transform={`rotate(${a} 32 33) translate(0 -6)`} />
      ))}
      <circle cx="32" cy="33" r="5.5" fill="#8A6100" />
      <circle cx="30.5" cy="31.5" r="2" fill="#C79A2A" />
    </>
  )
}

function Svamp() {
  return (
    <>
      <path d="M26,46 Q26,60 27,64 L37,64 Q38,60 38,46 Z" fill="#F3E7CE" />
      <path d="M26,46 Q32,49 38,46 L38,50 Q32,53 26,50 Z" fill="#D9C6A2" opacity={0.7} />
      <path d="M12,44 Q12,22 32,22 Q52,22 52,44 Q42,48 32,48 Q22,48 12,44 Z" fill="#E05A4E" />
      <circle cx="22" cy="34" r="4" fill="#FFEFE0" />
      <circle cx="38" cy="30" r="5" fill="#FFEFE0" />
      <circle cx="44" cy="40" r="3" fill="#FFEFE0" />
    </>
  )
}

function Sten({ tone = 0 }: { tone?: 0 | 1 }) {
  const base = tone === 0 ? '#9AA3AE' : '#8B9AA8'
  return (
    <>
      <path d="M12,64 Q10,48 20,42 Q30,36 44,40 Q56,44 54,56 Q53,62 48,64 Z" fill={base} />
      <path d="M20,44 Q30,38 42,41 L38,48 Q28,50 22,48 Z" fill="#C2C9D2" opacity={0.8} />
      <path d="M14,60 Q26,56 40,58 L38,64 L16,64 Z" fill="#6E7987" opacity={0.5} />
    </>
  )
}

function Buske() {
  return (
    <>
      <circle cx="20" cy="52" r="12" fill="#5E9C4F" />
      <circle cx="42" cy="52" r="13" fill="#549147" />
      <circle cx="31" cy="44" r="12" fill="#6FAF5E" />
      <circle cx="27" cy="41" r="5" fill="#8CC47B" opacity={0.85} />
      <circle cx="40" cy="47" r="2.4" fill="#E05A4E" />
      <circle cx="22" cy="54" r="2.4" fill="#E05A4E" />
      <circle cx="34" cy="55" r="2.4" fill="#E05A4E" />
    </>
  )
}

function Kristall({ tone = 0 }: { tone?: 0 | 1 }) {
  const [a, b] = tone === 0 ? ['#7FD4DE', '#B8F0F4'] : ['#B49AE8', '#DCC8F8']
  return (
    <>
      <path d="M20,64 L14,44 L24,28 L32,46 L30,64 Z" fill={a} />
      <path d="M24,28 L28,44 L26,64 L30,64 L32,46 Z" fill={b} opacity={0.9} />
      <path d="M34,64 L34,38 L44,20 L52,42 L48,64 Z" fill={a} />
      <path d="M44,20 L46,42 L44,64 L48,64 L52,42 Z" fill={b} opacity={0.9} />
      <path d="M44,20 L40,34 L44,40 Z" fill="#FFFFFF" opacity={0.7} />
      <path d="M24,28 L21,38 L24,42 Z" fill="#FFFFFF" opacity={0.7} />
    </>
  )
}

function Palm() {
  return (
    <>
      <path d="M30,64 Q34,44 42,26 L46,28 Q38,46 36,64 Z" fill="#9A6B3F" />
      <path d="M33,56 L40,57 M35,46 L42,48 M38,36 L44,38" stroke="#7E5430" strokeWidth="2" />
      {[[-38, 14], [-10, 6], [22, 8], [48, 16]].map(([a, drop], i) => (
        <path key={i} d={`M44,26 Q${44 + 22 * Math.cos((a as number) * Math.PI / 180)},${20 - 14 * Math.sin((a as number) * Math.PI / 180)} ${44 + 30 * Math.cos((a as number) * Math.PI / 180)},${26 - 20 * Math.sin((a as number) * Math.PI / 180) + (drop as number)}`}
          stroke="#4E9C4F" strokeWidth="5" fill="none" strokeLinecap="round" />
      ))}
      <circle cx="42" cy="29" r="3" fill="#7E5430" />
      <circle cx="47" cy="30" r="3" fill="#6E4526" />
    </>
  )
}

function Stalagmit({ tone = 0 }: { tone?: 0 | 1 }) {
  return (
    <>
      <path d="M14,64 L20,34 L27,64 Z" fill="#57517A" />
      <path d="M26,64 L34,20 L43,64 Z" fill="#6A628F" />
      <path d="M34,20 L37,40 L34,64 L43,64 Z" fill="#4C4570" opacity={0.8} />
      <path d="M42,64 L48,42 L55,64 Z" fill="#57517A" />
      {/* lysande kristall vid foten */}
      <circle cx="24" cy="58" r="8" fill={tone === 0 ? '#7FD4DE' : '#FFD98A'} opacity={0.25} />
      <path d="M21,64 L24,52 L28,64 Z" fill={tone === 0 ? '#8FE4EE' : '#FFD98A'} />
    </>
  )
}

function Orb({ tone = 0 }: { tone?: 0 | 1 }) {
  const c = tone === 0 ? '#C8A8F0' : '#8FD4F0'
  return (
    <>
      <circle cx="32" cy="34" r="18" fill={c} opacity={0.2} />
      <circle cx="32" cy="34" r="11" fill={c} opacity={0.45} />
      <circle cx="32" cy="34" r="6" fill="#FFFFFF" opacity={0.95} />
      <path d="M32,12 L34,28 M32,56 L34,40 M12,34 L26,34 M52,34 L38,34" stroke="#FFFFFF" strokeWidth="1.6" opacity={0.6} />
    </>
  )
}

function Segelbat() {
  return (
    <>
      <path d="M14,48 L50,48 L44,58 L20,58 Z" fill="#B05A3C" />
      <path d="M31,48 L31,14 L48,44 Q40,48 31,48 Z" fill="#FFF4E0" />
      <path d="M29,48 L29,20 L16,44 Q22,48 29,48 Z" fill="#F0E2C8" />
      <path d="M31,12 L31,16 L40,15 Z" fill="#E05A4E" />
      <path d="M8,58 Q16,54 24,58 Q32,62 40,58 Q48,54 56,58" stroke="#4FA8D8" strokeWidth="3" fill="none" strokeLinecap="round" />
    </>
  )
}

function Tuva() {
  return (
    <>
      <path d="M24,64 Q22,50 16,44" stroke="#6FAF5E" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d="M30,64 Q30,46 28,38" stroke="#5E9C4F" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d="M36,64 Q38,48 44,42" stroke="#6FAF5E" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d="M42,64 Q44,54 50,50" stroke="#7FBF6B" strokeWidth="3" fill="none" strokeLinecap="round" />
    </>
  )
}

/** Magiskt snurrigt träd till mönstervärlden. */
function Snurrtrad({ tone = 0 }: { tone?: 0 | 1 }) {
  const crown = tone === 0 ? '#B48AE0' : '#9C7BC8'
  return (
    <>
      <path d="M30,64 Q28,46 34,36 Q40,28 34,22" stroke="#7A5C9E" strokeWidth="6" fill="none" strokeLinecap="round" />
      <circle cx="32" cy="18" r="13" fill={crown} />
      <path d="M32,18 m-8,0 a8,8 0 1,1 16,0 a5,5 0 1,1 -10,0 a3,3 0 1,1 6,0"
        stroke="#E8D8F8" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <circle cx="45" cy="30" r="2" fill="#FFE9A8" />
      <circle cx="18" cy="26" r="1.6" fill="#FFE9A8" />
    </>
  )
}

export function Sprite({ name, size = 44, flip = false, tone = 0 }: SpriteProps) {
  const body = {
    lovtrad: <Lovtrad tone={tone} />,
    gran: <Gran tone={tone} />,
    snogran: <Gran snow tone={tone} />,
    blomma: <Blomma tone={tone} />,
    svamp: <Svamp />,
    sten: <Sten tone={tone} />,
    buske: <Buske />,
    kristall: <Kristall tone={tone} />,
    palm: <Palm />,
    stalagmit: <Stalagmit tone={tone} />,
    orb: <Orb tone={tone} />,
    segelbat: <Segelbat />,
    tuva: <Tuva />,
    snurrtrad: <Snurrtrad tone={tone} />,
  }[name]
  return (
    <svg
      viewBox="0 0 64 64" width={size} height={size} aria-hidden="true"
      style={{ display: 'block', transform: flip ? 'scaleX(-1)' : undefined, filter: 'drop-shadow(0 2px 1.5px rgba(0,0,0,.14))' }}
    >{body}</svg>
  )
}

/** Ritat tecknat moln (ersätter ☁️-emojin). */
export function CloudSvg({ width = 74, opacity = 0.95 }: { width?: number; opacity?: number }) {
  return (
    <svg viewBox="0 0 100 52" width={width} aria-hidden="true" style={{ display: 'block', opacity }}>
      <ellipse cx="30" cy="36" rx="24" ry="14" fill="#FFFFFF" />
      <ellipse cx="58" cy="30" rx="26" ry="17" fill="#FFFFFF" />
      <ellipse cx="78" cy="38" rx="18" ry="11" fill="#FFFFFF" />
      <ellipse cx="46" cy="20" rx="18" ry="13" fill="#FFFFFF" />
      <ellipse cx="50" cy="42" rx="38" ry="8" fill="#E8F0F8" opacity={0.7} />
    </svg>
  )
}

/** Sol med strålar / måne med stjärnor — världens himlakropp. */
export function Celestial({ kind, size = 72 }: { kind: 'sol' | 'mane'; size?: number }) {
  if (kind === 'sol') {
    return (
      <svg viewBox="0 0 80 80" width={size} aria-hidden="true" style={{ display: 'block' }}>
        {Array.from({ length: 10 }).map((_, i) => {
          const a = (i / 10) * Math.PI * 2
          return <path key={i} d={`M${40 + Math.cos(a) * 24},${40 + Math.sin(a) * 24} L${40 + Math.cos(a) * 34},${40 + Math.sin(a) * 34}`}
            stroke="#FFC94D" strokeWidth="5" strokeLinecap="round" />
        })}
        <circle cx="40" cy="40" r="20" fill="#FFD166" />
        <circle cx="34" cy="34" r="7" fill="#FFE39A" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 80 80" width={size} aria-hidden="true" style={{ display: 'block' }}>
      <path d="M52,12 A30,30 0 1,0 68,52 A24,24 0 1,1 52,12 Z" fill="#F4E9C8" />
      <circle cx="14" cy="22" r="2" fill="#FFF3D6" />
      <circle cx="70" cy="14" r="1.6" fill="#FFF3D6" />
      <circle cx="24" cy="60" r="1.6" fill="#FFF3D6" />
    </svg>
  )
}
