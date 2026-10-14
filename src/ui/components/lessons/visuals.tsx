import { useEffect, useRef, useState, type ReactNode } from 'react'

/* Bilderna till minilektionerna (domain/lessons.ts). Varje lektion är en
   ren funktion av scenens nummer: samma steg ger alltid samma bild, så
   att barnet kan spola fram och tillbaka. Rörelsen kommer av CSS-
   övergångar mellan stegen (klassen .ls i lessons.css) och, där en form
   själv måste ändras — vinkelns båge, staketet runt hagen, punkten som
   vandrar — av en liten mellanräkning (useTween).

   Alla bilder ritas i samma koordinatsystem, 320 × 200. */

export type LessonVisual = (props: { step: number }) => JSX.Element

const INK = '#35302E'
const MUTED = '#837A66'
const PAPER = '#FFFDF6'
const LINE = '#D8C8A4'
const PRIMARY = '#4A56C6'
const PRIMARY_SOFT = '#C9CDF2'
const CORAL = '#FF7A6E'
const CORAL_SOFT = '#FFD3CD'
const SUN = '#FFC94D'
const SUN_SOFT = '#FFE9AE'
const MINT = '#3FA87A'

const reducedMotion = (): boolean =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Glider mjukt mot målvärdet (ease-in-out). Vid reducerad rörelse: direkt. */
function useTween(target: number, ms = 1000): number {
  const [value, setValue] = useState(target)
  const from = useRef(target)
  const current = useRef(target)
  useEffect(() => {
    if (reducedMotion() || current.current === target) {
      current.current = target
      setValue(target)
      return
    }
    from.current = current.current
    const start = performance.now()
    let raf = 0
    const tick = (now: number): void => {
      const t = Math.min(1, (now - start) / ms)
      const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
      current.current = from.current + (target - from.current) * e
      setValue(current.current)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return value
}

const fade = (visible: boolean, delayMs = 0): React.CSSProperties =>
  ({ opacity: visible ? 1 : 0, transitionDelay: visible ? `${delayMs}ms` : '0ms' })

/** Ett bråk med vågrätt streck. hiN/hiD lyser upp täljaren/nämnaren. */
function Frac({ x, y, n, d, size = 34, color = INK, hiN = false, hiD = false }: {
  x: number; y: number; n: number | string; d: number | string
  size?: number; color?: string; hiN?: boolean; hiD?: boolean
}) {
  const w = size * 0.9
  return (
    <g>
      <rect className="ls" x={x - w / 2 - 4} y={y - size * 1.05} width={w + 8} height={size * 0.98} rx={8} fill={SUN} style={fade(hiN)} />
      <rect className="ls" x={x - w / 2 - 4} y={y + size * 0.12} width={w + 8} height={size * 0.98} rx={8} fill={SUN} style={fade(hiD)} />
      <text x={x} y={y - size * 0.22} textAnchor="middle" fontSize={size} fontWeight={900} fill={color}>{n}</text>
      <line x1={x - w / 2} x2={x + w / 2} y1={y} y2={y} stroke={color} strokeWidth={size / 11} strokeLinecap="round" />
      <text x={x} y={y + size * 0.92} textAnchor="middle" fontSize={size} fontWeight={900} fill={color}>{d}</text>
    </g>
  )
}

/** Text i en egen ljus platta — läsbar oavsett vad som ligger under. */
function Caption({ x, y, children, visible = true, size = 20, color = INK }: {
  x: number; y: number; children: ReactNode; visible?: boolean; size?: number; color?: string
}) {
  return (
    <text className="ls" x={x} y={y} textAnchor="middle" fontSize={size} fontWeight={900} fill={color} style={fade(visible)}>
      {children}
    </text>
  )
}

const rad = (deg: number): number => (deg * Math.PI) / 180
const polar = (cx: number, cy: number, r: number, deg: number): [number, number] =>
  [cx + r * Math.cos(rad(deg)), cy + r * Math.sin(rad(deg))]

/** En tårtbit från vinkel a0 till a1 (grader medurs från klockan tre). */
const slice = (cx: number, cy: number, r: number, a0: number, a1: number): string => {
  const [x0, y0] = polar(cx, cy, r, a0)
  const [x1, y1] = polar(cx, cy, r, a1)
  return `M${cx} ${cy} L${x0} ${y0} A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1} Z`
}

/** En cirkel i n lika bitar där de första `filled` är färgade. */
function Pie({ cx, cy, r, n, filled, fill = CORAL, base = SUN_SOFT, lines = true, pull = 0 }: {
  cx: number; cy: number; r: number; n: number; filled: number
  fill?: string; base?: string; lines?: boolean; pull?: number
}) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={base} stroke={INK} strokeWidth={3} />
      {Array.from({ length: n }, (_, i) => {
        const a0 = -90 + (i * 360) / n
        const a1 = a0 + 360 / n
        const [dx, dy] = polar(0, 0, i < filled ? pull : 0, (a0 + a1) / 2)
        return (
          <path
            key={i}
            className="ls"
            d={slice(cx, cy, r, a0, a1)}
            fill={i < filled ? fill : base}
            stroke={INK}
            strokeWidth={3}
            strokeLinejoin="round"
            style={{ strokeOpacity: lines ? 1 : 0, transform: `translate(${dx}px, ${dy}px)` }}
          />
        )
      })}
    </g>
  )
}

/** Rutnät med 100 rutor; de första `count` fylls i tur och ordning. */
function Grid100({ x, y, cell, count, fill = PRIMARY }: { x: number; y: number; cell: number; count: number; fill?: string }) {
  return (
    <g>
      {Array.from({ length: 100 }, (_, i) => (
        <rect
          key={i}
          className="ls"
          x={x + (i % 10) * cell}
          y={y + Math.floor(i / 10) * cell}
          width={cell - 1.5}
          height={cell - 1.5}
          rx={1.5}
          fill={i < count ? fill : PAPER}
          stroke={LINE}
          strokeWidth={0.8}
          style={{ transitionDelay: `${i * 10}ms` }}
        />
      ))}
    </g>
  )
}

/* ---------------- Gånger börjar ---------------- */

const MultIntro: LessonVisual = ({ step }) => {
  const plates = [60, 160, 260]
  return (
    <g>
      {plates.map((cx, g) => {
        const on = step >= g + 1
        return (
          <g key={g} className="ls" style={{ ...fade(on), transform: on ? 'scale(1)' : 'scale(.6)', transformOrigin: `${cx}px 80px` }}>
            <circle cx={cx} cy={80} r={42} fill={PAPER} stroke={LINE} strokeWidth={3} />
            {[[-13, -13], [13, -13], [-13, 13], [13, 13]].map(([dx, dy], i) => (
              <circle key={i} cx={cx + dx} cy={80 + dy} r={10} fill={[PRIMARY, CORAL, MINT][g]} stroke={INK} strokeWidth={2} />
            ))}
            <text x={cx} y={142} textAnchor="middle" fontSize={20} fontWeight={900} fill={MUTED}>4</text>
          </g>
        )
      })}
      <Caption x={160} y={186} size={26} visible={step === 4}>4 + 4 + 4 = 12</Caption>
      <Caption x={160} y={186} size={30} visible={step >= 5} color={PRIMARY}>3 × 4 = 12</Caption>
      <Caption x={160} y={186} size={18} visible={step === 0} color={MUTED}>lika stora grupper</Caption>
    </g>
  )
}

/* ---------------- Dela lika ---------------- */

const DivIntro: LessonVisual = ({ step }) => {
  const plates = [60, 160, 260]
  const dealt = step >= 2
  return (
    <g>
      {plates.map((cx) => (
        <ellipse key={cx} cx={cx} cy={150} rx={44} ry={26} fill={PAPER} stroke={LINE} strokeWidth={3} />
      ))}
      {Array.from({ length: 12 }, (_, i) => {
        // I högen: ett rutnät 4 × 3 överst. Utdelade: tallrik i % 3, plats i / 3.
        const pile: [number, number] = [130 + (i % 4) * 20, 26 + Math.floor(i / 4) * 20]
        const slot = Math.floor(i / 3)
        const plate: [number, number] = [plates[i % 3] + (slot % 2 ? 11 : -11), 150 + (slot < 2 ? -9 : 9)]
        const [x, y] = dealt ? plate : pile
        return (
          <g key={i} className="ls ls--slow" style={{ transform: `translate(${x}px, ${y}px)`, transitionDelay: dealt ? `${i * 330}ms` : '0ms' }}>
            <circle r={9.5} fill="#E9A85A" stroke="#8A5A26" strokeWidth={2} />
            <circle r={3} cx={-2} cy={-2} fill="#FBE3B8" />
          </g>
        )
      })}
      {plates.map((cx) => (
        <Caption key={cx} x={cx} y={194} size={20} visible={step >= 3} color={MUTED}>4</Caption>
      ))}
      <Caption x={160} y={96} size={28} visible={step === 4} color={PRIMARY}>12 / 3 = 4</Caption>
      <Caption x={160} y={96} size={28} visible={step >= 5} color={MINT}>3 × 4 = 12</Caption>
    </g>
  )
}

/* ---------------- Negativa tal ---------------- */

const NEG_X = (v: number): number => 160 + v * 26

const NegativaTal: LessonVisual = ({ step }) => {
  const target = [0, 3, -3, -3, 2, -1][step] ?? 0
  const v = useTween(target, step === 4 ? 2400 : 1200)
  const temp = useTween(step >= 4 ? 2 : -3, 2400)
  const level = 96 - ((temp + 6) / 12) * 78
  return (
    <g>
      {/* Termometern */}
      <g className="ls" style={fade(step === 3 || step === 4)}>
        <rect x={22} y={14} width={16} height={90} rx={8} fill={PAPER} stroke={INK} strokeWidth={2.5} />
        <rect x={26} y={level} width={8} height={104 - level} fill={temp < 0 ? PRIMARY : CORAL} />
        <circle cx={30} cy={108} r={12} fill={temp < 0 ? PRIMARY : CORAL} stroke={INK} strokeWidth={2.5} />
        <line x1={18} x2={42} y1={57} y2={57} stroke={INK} strokeWidth={1.5} strokeDasharray="3 2" />
        <text x={50} y={62} fontSize={22} fontWeight={900} fill={temp < 0 ? PRIMARY : CORAL}>
          {`${Math.round(temp) < 0 ? '−' : ''}${Math.abs(Math.round(temp))}°`}
        </text>
      </g>
      <line x1={14} x2={306} y1={150} y2={150} stroke={INK} strokeWidth={3} strokeLinecap="round" />
      {Array.from({ length: 11 }, (_, i) => {
        const n = i - 5
        const visible = n === 0 || (n > 0 ? step >= 1 : step >= 2)
        return (
          <g key={n} className="ls" style={fade(visible, n > 0 ? n * 120 : n < 0 ? -n * 120 : 0)}>
            <line x1={NEG_X(n)} x2={NEG_X(n)} y1={142} y2={158} stroke={INK} strokeWidth={n === 0 ? 3.5 : 2} />
            <text x={NEG_X(n)} y={180} textAnchor="middle" fontSize={n === 0 ? 18 : 15} fontWeight={900} fill={n < 0 ? CORAL : n === 0 ? INK : PRIMARY}>
              {n < 0 ? `−${-n}` : n}
            </text>
          </g>
        )
      })}
      {/* Fem hopp från −3 till 2 */}
      {[-3, -2, -1, 0, 1].map((n, i) => (
        <path
          key={n}
          className="ls"
          d={`M${NEG_X(n)} 140 Q${NEG_X(n + 0.5)} 112 ${NEG_X(n + 1)} 140`}
          fill="none"
          stroke={MINT}
          strokeWidth={3}
          strokeLinecap="round"
          style={fade(step === 4, 300 + i * 420)}
        />
      ))}
      {/* Jämförelsen −5 < −1 */}
      <g className="ls" style={fade(step >= 5)}>
        <circle cx={NEG_X(-5)} cy={150} r={8} fill={CORAL} stroke={INK} strokeWidth={2} />
        <Caption x={160} y={92} size={26} color={CORAL}>−5 &lt; −1</Caption>
      </g>
      {/* Markören: en liten kula som vandrar */}
      <g style={{ transform: `translate(${NEG_X(v)}px, 150px)` }}>
        <circle r={10} fill={SUN} stroke={INK} strokeWidth={2.5} />
        <circle r={2} cx={-3} cy={-2} fill={INK} />
        <circle r={2} cx={3} cy={-2} fill={INK} />
      </g>
    </g>
  )
}

/* ---------------- Bråk börjar ---------------- */

const BrakIntro: LessonVisual = ({ step }) => {
  const filled = step >= 5 ? 3 : step >= 2 ? 1 : 0
  return (
    <g>
      <Pie cx={105} cy={100} r={74} n={4} filled={filled} lines={step >= 1} pull={step >= 2 && step < 5 ? 10 : 0} />
      <g className="ls" style={fade(step >= 2)}>
        <Frac x={240} y={104} n={step >= 5 ? 3 : 1} d={4} size={44} hiN={step === 4} hiD={step === 3} />
        <Caption x={240} y={34} size={18} color={MUTED} visible={step === 4}>täljaren</Caption>
        <Caption x={240} y={186} size={18} color={MUTED} visible={step === 3}>nämnaren</Caption>
      </g>
    </g>
  )
}

/* ---------------- Jämföra bråk ---------------- */

function Bar({ x, y, w, h, parts, filled, fill, base = '#C8925F', divided = true }: {
  x: number; y: number; w: number; h: number; parts: number; filled: number
  fill: string; base?: string; divided?: boolean
}) {
  const pw = w / parts
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={base} />
      {Array.from({ length: parts }, (_, i) => (
        <rect key={i} className="ls" x={x + i * pw} y={y} width={pw} height={h} fill={i < filled ? fill : base} style={{ transitionDelay: `${i * 90}ms` }} />
      ))}
      {Array.from({ length: parts - 1 }, (_, i) => (
        <line key={i} className="ls" x1={x + (i + 1) * pw} x2={x + (i + 1) * pw} y1={y} y2={y + h} stroke={INK} strokeWidth={2.5} style={fade(divided, 150)} />
      ))}
      <rect x={x} y={y} width={w} height={h} rx={4} fill="none" stroke={INK} strokeWidth={3} />
    </g>
  )
}

const BrakJamfora: LessonVisual = ({ step }) => (
  <g>
    <Bar x={24} y={30} w={200} h={44} parts={2} filled={step >= 2 ? 1 : 0} fill={PRIMARY} divided={step >= 1} />
    <Bar x={24} y={110} w={200} h={44} parts={4} filled={step >= 4 ? 2 : step >= 2 ? 1 : 0} fill={CORAL} divided={step >= 1} />
    <line className="ls" x1={124} x2={124} y1={20} y2={164} stroke={INK} strokeWidth={2.5} strokeDasharray="6 5" style={fade(step >= 4)} />
    <g className="ls" style={fade(step >= 2)}>
      <Frac x={270} y={56} n={1} d={2} size={28} color={PRIMARY} />
      <Frac x={270} y={136} n={step >= 4 ? 2 : 1} d={4} size={28} color={CORAL} />
    </g>
    <Caption x={124} y={190} size={22} visible={step === 3}>1/4 &lt; 1/2</Caption>
    <Caption x={124} y={190} size={22} visible={step === 4}>2/4 = 1/2</Caption>
    <Caption x={124} y={190} size={20} visible={step >= 5} color={MINT}>likvärdiga bråk</Caption>
  </g>
)

/* ---------------- Räkna med bråk ---------------- */

const BrakRakna: LessonVisual = ({ step }) => {
  const bar = step < 5
  return (
    <g>
      <g className="ls" style={fade(bar)}>
        <Bar x={40} y={28} w={240} h={56} parts={5} filled={0} fill={PRIMARY} base={SUN_SOFT} />
        {[0, 1, 2].map((i) => (
          <rect
            key={i}
            className="ls"
            x={40 + i * 48 + 3}
            y={31}
            width={42}
            height={50}
            rx={4}
            fill={i < 2 ? PRIMARY : CORAL}
            style={{ ...fade(i < 2 ? step >= 1 : step >= 2, i * 150), transform: i === 2 && step < 2 ? 'translateY(-30px)' : 'none' }}
          />
        ))}
        <g className="ls" style={fade(step >= 1)}><Frac x={80} y={140} n={2} d={5} size={30} color={PRIMARY} hiD={step === 4} /></g>
        <Caption x={125} y={150} size={30} visible={step >= 2}>+</Caption>
        <g className="ls" style={fade(step >= 2)}><Frac x={170} y={140} n={1} d={5} size={30} color={CORAL} hiD={step === 4} /></g>
        <Caption x={215} y={150} size={30} visible={step >= 3}>=</Caption>
        <g className="ls" style={fade(step >= 3)}><Frac x={260} y={140} n={3} d={5} size={30} hiD={step === 4} /></g>
      </g>
      <g className="ls" style={fade(!bar)}>
        {Array.from({ length: 12 }, (_, i) => {
          const group = i % 3
          const slot = Math.floor(i / 3)
          const scattered: [number, number] = [48 + (i % 6) * 45, 62 + Math.floor(i / 6) * 40 + (i % 2) * 8]
          const grouped: [number, number] = [65 + group * 95 + (slot % 2 ? 14 : -14), 82 + (slot < 2 ? -14 : 14)]
          const [x, y] = step >= 6 ? grouped : scattered
          return (
            <circle
              key={i}
              className="ls ls--slow"
              r={10}
              fill={step >= 6 && group === 0 ? CORAL : PRIMARY}
              stroke={INK}
              strokeWidth={2}
              style={{ transform: `translate(${x}px, ${y}px)` }}
            />
          )
        })}
        {[65, 160, 255].map((cx, g) => (
          <circle key={cx} className="ls" cx={cx} cy={82} r={38} fill="none" stroke={g === 0 ? CORAL : LINE} strokeWidth={3} strokeDasharray="7 5" style={fade(step >= 6, 900)} />
        ))}
        <Caption x={160} y={172} size={26} visible={step === 5}>1/3 av 12 = ?</Caption>
        <Caption x={160} y={172} size={26} visible={step >= 6} color={CORAL}>1/3 av 12 = 4</Caption>
      </g>
    </g>
  )
}

/* ---------------- Procent börjar ---------------- */

const Procent: LessonVisual = ({ step }) => {
  const count = [0, 1, 50, 25, 100, 50][step] ?? 0
  const big = ['100 rutor', '1 %', '50 %', '25 %', '100 %', ''][step] ?? ''
  const small = ['= 1 hel', '1 av 100', 'hälften', 'en fjärdedel', 'det hela', ''][step] ?? ''
  return (
    <g>
      <Grid100 x={18} y={18} cell={16.4} count={count} fill={step === 1 ? CORAL : PRIMARY} />
      <g key={step} className="lesson-pop">
        <text x={252} y={92} textAnchor="middle" fontSize={step === 0 ? 24 : 40} fontWeight={900} fill={step === 1 ? CORAL : PRIMARY}>{big}</text>
        <text x={252} y={124} textAnchor="middle" fontSize={18} fontWeight={800} fill={MUTED}>{small}</text>
        {step >= 5 && (
          <g>
            <rect x={200} y={42} width={104} height={34} rx={17} fill={CORAL} />
            <text x={252} y={66} textAnchor="middle" fontSize={20} fontWeight={900} fill="#fff">Rea 50 %</text>
            <text x={252} y={112} textAnchor="middle" fontSize={24} fontWeight={900} fill={MUTED} textDecoration="line-through">80 kr</text>
            <line x1={218} x2={286} y1={104} y2={104} stroke={CORAL} strokeWidth={3} />
            <text x={252} y={150} textAnchor="middle" fontSize={32} fontWeight={900} fill={MINT}>40 kr</text>
          </g>
        )}
      </g>
    </g>
  )
}

/* ---------------- Decimaltal börjar ---------------- */

const Decimal: LessonVisual = ({ step }) => {
  const top = [0, 1, 5, 5, 0, 2][step] ?? 0
  const zoom = step >= 4
  const hundredths = step === 4 ? 1 : 5
  return (
    <g>
      <Bar x={20} y={14} w={280} h={40} parts={10} filled={top} fill={PRIMARY} base={SUN_SOFT} />
      {/* Den tredje tiondelen förstoras */}
      <g className="ls" style={fade(zoom)}>
        <rect x={76} y={14} width={28} height={40} fill="none" stroke={CORAL} strokeWidth={4} />
        {step >= 5 && <rect x={78} y={16} width={12} height={36} fill={CORAL} />}
        <polygon points="76,54 104,54 300,118 20,118" fill={CORAL_SOFT} opacity={0.55} />
        <Bar x={20} y={118} w={280} h={40} parts={10} filled={hundredths} fill={CORAL} base={PAPER} />
      </g>
      <g key={step} className="lesson-pop">
        {step >= 1 && step <= 3 && (
          <text x={160} y={98} textAnchor="middle" fontSize={36} fontWeight={900} fill={INK}>
            0,<tspan fill={step === 3 ? CORAL : PRIMARY}>{step === 1 ? 1 : 5}</tspan>
          </text>
        )}
        {step === 3 && <text x={160} y={130} textAnchor="middle" fontSize={18} fontWeight={800} fill={CORAL}>tiondelar</text>}
        {step === 4 && <text x={160} y={190} textAnchor="middle" fontSize={24} fontWeight={900} fill={CORAL}>0,01 = en hundradel</text>}
        {step >= 5 && (
          <text x={160} y={192} textAnchor="middle" fontSize={28} fontWeight={900} fill={INK}>
            0,<tspan fill={PRIMARY}>2</tspan><tspan fill={CORAL}>5</tspan>
          </text>
        )}
      </g>
      <Caption x={160} y={98} size={18} visible={step === 0} color={MUTED}>tio lika delar</Caption>
    </g>
  )
}

/* ---------------- Tre former, samma tal ---------------- */

const BrakDecimalProcent: LessonVisual = ({ step }) => {
  const frac = step >= 5 ? 0.25 : 0.5
  const on = (k: number): number => (step >= k ? 1 : 0.15)
  return (
    <g>
      {['bråk', 'decimaltal', 'procent'].map((t, i) => (
        <text key={t} x={[55, 160, 265][i]} y={22} textAnchor="middle" fontSize={15} fontWeight={800} fill={MUTED}>{t}</text>
      ))}
      <g className="ls" style={{ opacity: on(1) }}>
        <Pie cx={55} cy={82} r={40} n={4} filled={frac * 4} />
        <Frac x={55} y={164} n={1} d={step >= 5 ? 4 : 2} size={26} />
      </g>
      <g className="ls" style={{ opacity: on(2) }}>
        <rect x={115} y={64} width={90} height={36} fill={SUN_SOFT} />
        <rect className="ls" x={115} y={64} width={90} height={36} fill={CORAL} style={{ transform: `scaleX(${frac})`, transformOrigin: '115px 0px' }} />
        {Array.from({ length: 9 }, (_, i) => (
          <line key={i} x1={124 + i * 9} x2={124 + i * 9} y1={64} y2={100} stroke={INK} strokeWidth={1.2} />
        ))}
        <rect x={115} y={64} width={90} height={36} fill="none" stroke={INK} strokeWidth={3} />
        <text x={160} y={172} textAnchor="middle" fontSize={26} fontWeight={900} fill={INK}>{step >= 5 ? '0,25' : '0,5'}</text>
      </g>
      <g className="ls" style={{ opacity: on(3) }}>
        <Grid100 x={225} y={42} cell={8} count={frac * 100} fill={CORAL} />
        <text x={265} y={172} textAnchor="middle" fontSize={26} fontWeight={900} fill={INK}>{step >= 5 ? '25 %' : '50 %'}</text>
      </g>
      <Caption x={108} y={170} size={28} visible={step >= 4} color={MINT}>=</Caption>
      <Caption x={213} y={170} size={28} visible={step >= 4} color={MINT}>=</Caption>
    </g>
  )
}

/* ---------------- Ekvationer: vågen ---------------- */

interface Weight { key: string; kind: 'box' | 'block'; x: number; y: number; gone?: boolean; label?: string; hi?: boolean; dim?: boolean }

/** Vågen. tilt > 0 = höger sida tyngre (sjunker så många px), < 0 = vänster.
    Ekvationerna håller den alltid vågrät — det är hela poängen; bara
    likhetstecknets "fälla" får den att tippa. */
function Balance({ items, eq, cuts = false, tilt = 0 }: { items: Weight[]; eq: string; cuts?: boolean; tilt?: number }) {
  const angle = (Math.atan2(2 * tilt, 204) * 180) / Math.PI
  const side = (left: boolean): ReactNode => {
    const cx = left ? 60 : 260
    return (
      <g className="ls" style={{ transform: `translateY(${left ? -tilt : tilt}px)` }}>
        <line x1={cx} x2={cx - 48} y1={58} y2={140} stroke={MUTED} strokeWidth={1.5} />
        <line x1={cx} x2={cx + 48} y1={58} y2={140} stroke={MUTED} strokeWidth={1.5} />
        <path d={`M${cx - 56} 140 L${cx + 56} 140 L${cx + 46} 148 L${cx - 46} 148 Z`} fill={SUN} stroke={INK} strokeWidth={2.5} />
        <line className="ls" x1={left ? 60 : 262} x2={left ? 60 : 262} y1={70} y2={140} stroke={CORAL} strokeWidth={2.5} strokeDasharray="5 4" style={fade(cuts)} />
        {items.filter((w) => (w.x < 160) === left).map((w) => (
          <g
            key={w.key}
            className="ls"
            style={{ transform: `translate(${w.x}px, ${w.y - (w.gone ? 40 : 0)}px)`, opacity: w.gone ? 0 : w.dim ? 0.3 : 1 }}
          >
            {w.kind === 'box' ? (
              <>
                <rect width={30} height={30} rx={4} fill={w.hi ? SUN : '#B98A5A'} stroke={INK} strokeWidth={2.5} />
                <text x={15} y={22} textAnchor="middle" fontSize={20} fontWeight={900} fill={w.hi ? INK : '#fff'}>{w.label ?? 'x'}</text>
              </>
            ) : (
              <rect width={15} height={15} rx={2.5} fill={w.hi ? SUN : PRIMARY} stroke={INK} strokeWidth={2} />
            )}
          </g>
        ))}
      </g>
    )
  }
  return (
    <g>
      <polygon points="148,164 172,164 160,148" fill={MUTED} />
      <line x1={160} x2={160} y1={58} y2={152} stroke={MUTED} strokeWidth={6} strokeLinecap="round" />
      <line className="ls" x1={58} x2={262} y1={58} y2={58} stroke={INK} strokeWidth={6} strokeLinecap="round"
        style={{ transform: `rotate(${angle}deg)`, transformOrigin: '160px 58px' }} />
      <circle cx={160} cy={58} r={7} fill={SUN} stroke={INK} strokeWidth={2.5} />
      {side(true)}
      {side(false)}
      <text x={160} y={193} textAnchor="middle" fontSize={22} fontWeight={900} fill={INK} style={{ whiteSpace: 'pre' }}>{eq}</text>
    </g>
  )
}

/** Klossar i rader om `perRow`, nerifrån och upp, med vänsterkant x0. */
const stack = (n: number, x0: number, perRow: number): [number, number][] =>
  Array.from({ length: n }, (_, i) => [x0 + (i % perRow) * 17 + (Math.floor(i / perRow) % 2) * 8, 125 - Math.floor(i / perRow) * 17])

const EnklaEkvationer: LessonVisual = ({ step }) => {
  const gone = step === 2 || step === 3
  const right = stack(7, 226, 4)
  const solved = step >= 4
  const items: Weight[] = [
    { key: 'x', kind: 'box', x: 14, y: 110, label: solved ? '4' : 'x', hi: step === 3 || solved },
    ...[0, 1, 2].map((i): Weight => ({ key: `l${i}`, kind: 'block', x: 52 + (i % 2) * 17 + (i === 2 ? 8 : 0), y: i === 2 ? 108 : 125, gone })),
    ...right.map(([x, y], i): Weight => ({ key: `r${i}`, kind: 'block', x, y, gone: gone && i >= 4 })),
  ]
  const eq = ['vänster = höger', 'x + 3 = 7', 'x + 3 − 3 = 7 − 3', 'x = 4', '4 + 3 = 7', 'x + 12 = 30   →   x = 18'][step] ?? ''
  return <Balance items={items} eq={eq} />
}

const EkvationerTvaSteg: LessonVisual = ({ step }) => {
  const gone = step >= 1
  const halves = step >= 3
  const solved = step >= 4
  // 11 klossar: rader om fem. Efter steg två: två högar om fyra.
  const rows = stack(11, 218, 5)
  const grouped = (i: number): [number, number] => [i < 4 ? 222 + (i % 2) * 17 : 270 + (i % 2) * 17, 125 - (Math.floor((i % 4) / 2)) * 17]
  const items: Weight[] = [
    { key: 'x1', kind: 'box', x: 12, y: 110, label: solved ? '4' : 'x', hi: halves },
    { key: 'x2', kind: 'box', x: halves ? 76 : 44, y: 110, label: solved ? '4' : 'x', dim: halves && !solved },
    ...[0, 1, 2].map((i): Weight => ({ key: `l${i}`, kind: 'block', x: 80 + (i % 2) * 17 - (i === 2 ? -8 : 0), y: i === 2 ? 108 : 125, gone })),
    ...rows.map(([x, y], i): Weight => {
      const [gx, gy] = halves && i < 8 ? grouped(i) : [x, y]
      return { key: `r${i}`, kind: 'block', x: gx, y: gy, gone: gone && i >= 8, hi: halves && i < 4, dim: halves && !solved && i >= 4 && i < 8 }
    }),
  ]
  const eq = ['2x + 3 = 11', '2x + 3 − 3 = 11 − 3', '2x = 8', 'x = 8 / 2', 'x = 4    (2 × 4 + 3 = 11)', 'samma sak på båda sidor'][step] ?? ''
  return <Balance items={items} eq={eq} cuts={step === 3} />
}

/* ---------------- Omkrets ---------------- */

const OMK = { x: 60, y: 40, u: 40, w: 5, h: 3 }

/** Punkt längs omkretsen, t mätt i meter från övre vänstra hörnet medurs. */
const perimeterPoint = (t: number): [number, number] => {
  const { x, y, u, w, h } = OMK
  if (t <= w) return [x + t * u, y]
  if (t <= w + h) return [x + w * u, y + (t - w) * u]
  if (t <= 2 * w + h) return [x + (2 * w + h - t) * u, y + h * u]
  return [x, y + (2 * w + 2 * h - t) * u]
}

const Omkrets: LessonVisual = ({ step }) => {
  const target = [0, 5, 8, 13, 16, 16][step] ?? 0
  const t = useTween(target, 2200)
  const { x, y, u, w, h } = OMK
  const total = (2 * w + 2 * h) * u
  const [wx, wy] = perimeterPoint(t)
  const sum = ['', '5', '5 + 3', '5 + 3 + 5', '5 + 3 + 5 + 3 = 16 m', 'omkretsen = 16 m'][step] ?? ''
  return (
    <g>
      <rect x={x} y={y} width={w * u} height={h * u} fill="#DCEFD0" stroke={LINE} strokeWidth={2} strokeDasharray="4 4" />
      <path
        d={`M${x} ${y} h${w * u} v${h * u} h${-w * u} Z`}
        fill="none"
        stroke="#8A5A26"
        strokeWidth={6}
        strokeLinejoin="round"
        strokeDasharray={total}
        strokeDashoffset={total - t * u}
      />
      <Caption x={x + (w * u) / 2} y={y - 10} size={17} visible={step >= 1}>5 m</Caption>
      <Caption x={x + w * u + 26} y={y + (h * u) / 2 + 6} size={17} visible={step >= 2}>3 m</Caption>
      <Caption x={x + (w * u) / 2} y={y + h * u + 22} size={17} visible={step >= 3}>5 m</Caption>
      <Caption x={x - 26} y={y + (h * u) / 2 + 6} size={17} visible={step >= 4}>3 m</Caption>
      <g style={{ transform: `translate(${wx}px, ${wy}px)` }}>
        <circle r={10} fill={MINT} stroke={INK} strokeWidth={2.5} />
        <circle r={2} cx={-3} cy={-2} fill={INK} />
        <circle r={2} cx={3} cy={-2} fill={INK} />
      </g>
      <g key={step} className="lesson-pop">
        <text x={x + (w * u) / 2} y={y + (h * u) / 2 + 9} textAnchor="middle" fontSize={step === 4 ? 17 : step >= 5 ? 20 : 26} fontWeight={900} fill={step >= 5 ? PRIMARY : INK}>{sum}</text>
      </g>
    </g>
  )
}

/* ---------------- Area ---------------- */

const Area: LessonVisual = ({ step }) => {
  const x0 = 70
  const y0 = 42
  const c = 36
  return (
    <g>
      {Array.from({ length: 12 }, (_, i) => {
        const col = i % 4
        const row = Math.floor(i / 4)
        const fill = step >= 3 ? [PRIMARY_SOFT, SUN_SOFT, CORAL_SOFT][row] : PRIMARY_SOFT
        return (
          <g key={i}>
            <rect
              className="ls"
              x={x0 + col * c + 2}
              y={y0 + row * c + 2}
              width={c - 4}
              height={c - 4}
              rx={4}
              fill={fill}
              stroke={PRIMARY}
              strokeWidth={1.5}
              style={{ ...fade(step >= 1 && step < 5, step === 1 ? i * 170 : 0), transform: step >= 1 ? 'none' : 'translateY(-14px)' }}
            />
            <text className="ls" x={x0 + col * c + c / 2} y={y0 + row * c + c / 2 + 6} textAnchor="middle" fontSize={16} fontWeight={900} fill={INK} style={fade(step === 2, i * 160)}>
              {i + 1}
            </text>
          </g>
        )
      })}
      <polygon className="ls" points={`${x0},${y0 + 3 * c} ${x0 + 4 * c},${y0 + 3 * c} ${x0 + 4 * c},${y0}`} fill={CORAL} opacity={0.75} style={fade(step >= 5)} />
      <rect x={x0} y={y0} width={4 * c} height={3 * c} fill="none" stroke={INK} strokeWidth={3} />
      <text x={x0 + 2 * c} y={y0 - 10} textAnchor="middle" fontSize={16} fontWeight={900} fill={MUTED}>4 cm</text>
      <text x={x0 - 10} y={y0 + 1.5 * c + 6} textAnchor="end" fontSize={16} fontWeight={900} fill={MUTED}>3 cm</text>
      {[0, 1, 2].map((r) => (
        <Caption key={r} x={x0 + 4 * c + 24} y={y0 + r * c + c / 2 + 7} size={18} visible={step === 3} color={MUTED}>4</Caption>
      ))}
      <Caption x={160} y={186} size={22} visible={step === 2}>12 rutor = 12 cm²</Caption>
      <Caption x={160} y={186} size={22} visible={step === 3}>4 + 4 + 4 = 12</Caption>
      <Caption x={160} y={186} size={24} visible={step === 4} color={PRIMARY}>4 × 3 = 12 cm²</Caption>
      <Caption x={160} y={186} size={22} visible={step >= 5} color={CORAL}>hälften av 12 = 6 cm²</Caption>
    </g>
  )
}

/* ---------------- Vinklar ---------------- */

const Vinklar: LessonVisual = ({ step }) => {
  const target = [45, 90, 35, 140, 180, 360][step] ?? 45
  const a = useTween(target, 1300)
  const vx = 160
  const vy = 118
  const len = 92
  const r = 30
  const ex = vx + len * Math.cos(rad(a))
  const ey = vy - len * Math.sin(rad(a))
  const ax = vx + r * Math.cos(rad(a))
  const ay = vy - r * Math.sin(rad(a))
  const wedge = a >= 359.5
    ? `M${vx + r} ${vy} A${r} ${r} 0 1 0 ${vx - r} ${vy} A${r} ${r} 0 1 0 ${vx + r} ${vy} Z`
    : a > 0.5 ? `M${vx} ${vy} L${vx + r} ${vy} A${r} ${r} 0 ${a > 180 ? 1 : 0} 0 ${ax} ${ay} Z` : ''
  const right = Math.abs(a - 90) < 0.6
  const [lx, ly] = [vx + 56 * Math.cos(rad(Math.min(a, 330) / 2)), vy - 56 * Math.sin(rad(Math.min(a, 330) / 2))]
  const kind = ['', 'rät vinkel', 'spetsig', 'trubbig', 'rak vinkel', 'helt varv'][step] ?? ''
  return (
    <g>
      <path d={wedge} fill={SUN_SOFT} stroke={SUN} strokeWidth={2.5} />
      {right && <path d={`M${vx + 16} ${vy} V${vy - 16} H${vx}`} fill="none" stroke={INK} strokeWidth={2.5} />}
      <line x1={vx} y1={vy} x2={vx + len} y2={vy} stroke={INK} strokeWidth={5} strokeLinecap="round" />
      <line x1={vx} y1={vy} x2={ex} y2={ey} stroke={PRIMARY} strokeWidth={5} strokeLinecap="round" />
      <circle cx={vx} cy={vy} r={6} fill={CORAL} stroke={INK} strokeWidth={2} />
      <rect x={lx - 30} y={ly - 15} width={60} height={28} rx={14} fill={PAPER} stroke={LINE} strokeWidth={1.5} />
      <text x={lx} y={ly + 6} textAnchor="middle" fontSize={18} fontWeight={900} fill={INK}>{`${Math.round(a)}°`}</text>
      <g key={step} className="lesson-pop">
        {kind && (
          <>
            <rect x={110} y={164} width={100} height={30} rx={15} fill={PRIMARY} />
            <text x={160} y={185} textAnchor="middle" fontSize={17} fontWeight={900} fill="#fff">{kind}</text>
          </>
        )}
      </g>
    </g>
  )
}

/* ---------------- Koordinatsystem ---------------- */

const Koordinat: LessonVisual = ({ step }) => {
  const ox = 46
  const oy = 172
  const u = 24
  const tx = step >= 3 ? 3 : 0
  const ty = step >= 4 ? 4 : 0
  const px = useTween(tx, 1500)
  const py = useTween(ty, 1500)
  const X = (v: number): number => ox + v * u
  const Y = (v: number): number => oy - v * u
  return (
    <g>
      {Array.from({ length: 7 }, (_, i) => (
        <g key={i}>
          <line x1={X(i)} x2={X(i)} y1={Y(0)} y2={Y(6)} stroke={LINE} strokeWidth={1} />
          <line x1={X(0)} x2={X(6)} y1={Y(i)} y2={Y(i)} stroke={LINE} strokeWidth={1} />
          <text x={X(i)} y={oy + 18} textAnchor="middle" fontSize={12} fontWeight={800} fill={MUTED}>{i}</text>
          {i > 0 && <text x={ox - 9} y={Y(i) + 4} textAnchor="end" fontSize={12} fontWeight={800} fill={MUTED}>{i}</text>}
        </g>
      ))}
      <line x1={X(0)} x2={X(6.5)} y1={oy} y2={oy} stroke={INK} strokeWidth={3} />
      <line x1={ox} x2={ox} y1={Y(0)} y2={Y(6.6)} stroke={INK} strokeWidth={3} />
      <text x={X(6.7)} y={oy + 5} fontSize={16} fontWeight={900} fill={PRIMARY}>x</text>
      <text x={ox - 5} y={Y(6.75)} textAnchor="end" fontSize={16} fontWeight={900} fill={CORAL}>y</text>
      {/* Målet, svagt, tills vi är framme */}
      <circle className="ls" cx={X(3)} cy={Y(4)} r={9} fill="none" stroke={MUTED} strokeWidth={2} strokeDasharray="3 3" style={fade(step >= 1 && step < 5)} />
      <line x1={X(0)} x2={X(px)} y1={oy} y2={oy} stroke={PRIMARY} strokeWidth={6} strokeLinecap="round" opacity={step >= 3 ? 1 : 0} />
      <line x1={X(3)} x2={X(3)} y1={oy} y2={Y(py)} stroke={CORAL} strokeWidth={6} strokeLinecap="round" opacity={step >= 4 ? 1 : 0} />
      <g className="ls" style={{ ...fade(step >= 2), transform: `translate(${X(px)}px, ${Y(py)}px)` }}>
        <circle r={9} fill={step >= 5 ? MINT : SUN} stroke={INK} strokeWidth={2.5} />
      </g>
      <Caption x={X(3) + 24} y={Y(4) - 10} size={16} visible={step >= 5} color={MINT}>(3, 4)</Caption>
      {/* Adresskortet */}
      <g className="ls" style={fade(step >= 1)}>
        <rect x={222} y={52} width={90} height={56} rx={12} fill={PAPER} stroke={LINE} strokeWidth={2} />
        <text x={267} y={90} textAnchor="middle" fontSize={28} fontWeight={900} fill={INK}>
          (<tspan fill={PRIMARY} fontSize={step === 3 ? 34 : 28}>3</tspan>, <tspan fill={CORAL} fontSize={step === 4 ? 34 : 28}>4</tspan>)
        </text>
      </g>
      <Caption x={267} y={136} size={17} visible={step >= 3} color={PRIMARY}>→ 3 steg</Caption>
      <Caption x={267} y={160} size={17} visible={step >= 4} color={CORAL}>↑ 4 steg</Caption>
    </g>
  )
}

/* ---------- Tiotalsövergång: fyll tian ---------- */

const Tiotal: LessonVisual = ({ step }) => {
  const cell = 34
  const fx = 30
  const fy = 40
  const cellPos = (i: number): [number, number] => [fx + (i % 5) * cell + cell / 2, fy + Math.floor(i / 5) * cell + cell / 2]
  const moved = step >= 2
  return (
    <g>
      {/* Tiorutan */}
      {Array.from({ length: 10 }, (_, i) => {
        const [x, y] = cellPos(i)
        const empty = i >= 8
        return <rect key={i} className="ls" x={x - cell / 2} y={y - cell / 2} width={cell} height={cell} fill={empty && step === 1 ? SUN_SOFT : PAPER} stroke={INK} strokeWidth={2} />
      })}
      {Array.from({ length: 8 }, (_, i) => {
        const [x, y] = cellPos(i)
        return <circle key={i} cx={x} cy={y} r={12} fill={PRIMARY} stroke={INK} strokeWidth={2} />
      })}
      {Array.from({ length: 5 }, (_, i) => {
        const outside: [number, number] = [236 + (i % 3) * 30, 57 + Math.floor(i / 3) * 34]
        const [x, y] = moved && i < 2 ? cellPos(8 + i) : outside
        return (
          <g key={i} className="ls ls--slow" style={{ transform: `translate(${x}px, ${y}px)`, transitionDelay: moved ? `${i * 400}ms` : '0ms' }}>
            <circle r={12} fill={CORAL} stroke={INK} strokeWidth={2} />
          </g>
        )
      })}
      <Caption x={115} y={28} size={15} color={MUTED}>tiorutan</Caption>
      <rect className="ls" x={222} y={38} width={92} height={78} rx={10} fill="none" stroke={CORAL} strokeWidth={2.5} strokeDasharray="6 5" style={fade(step === 3)} />
      <Caption x={160} y={168} size={26} visible={step === 0}>8 + 5 = ?</Caption>
      <Caption x={160} y={168} size={24} visible={step === 1 || step === 2} color={MUTED}>8 + 2 = 10</Caption>
      <Caption x={160} y={168} size={24} visible={step === 3} color={CORAL}>3 kvar</Caption>
      <Caption x={160} y={168} size={26} visible={step >= 4} color={PRIMARY}>10 + 3 = 13</Caption>
      <Caption x={160} y={194} size={18} visible={step >= 4} color={MUTED}>8 + 5 = 13</Caption>
    </g>
  )
}

/* ---------- Växling: en tiostav blir tio ental ---------- */

const Vaxling: LessonVisual = ({ step }) => {
  const stickGone = (i: number): boolean => (i === 3 && step >= 2) || (i === 2 && step >= 4)
  // Ental: 2 från början + 10 efter växlingen. 7 tas bort i steg 3.
  const cube = (i: number): [number, number] => [176 + (i % 6) * 21, 132 - Math.floor(i / 6) * 21]
  return (
    <g>
      {[0, 1, 2, 3].map((i) => (
        <g key={i} className="ls" style={{ ...fade(!stickGone(i)), transform: stickGone(i) && i === 3 ? 'translateX(90px)' : 'none' }}>
          <rect x={22 + i * 26} y={46} width={18} height={100} rx={3} fill={PRIMARY} stroke={INK} strokeWidth={2} />
          {Array.from({ length: 9 }, (_, k) => <line key={k} x1={22 + i * 26} x2={40 + i * 26} y1={56 + k * 10} y2={56 + k * 10} stroke={INK} strokeWidth={1} opacity={0.5} />)}
        </g>
      ))}
      {Array.from({ length: 12 }, (_, i) => {
        const exchanged = i >= 2
        const visible = exchanged ? step >= 2 : true
        const removed = step >= 3 && i >= 5
        const [x, y] = cube(i)
        return (
          <rect
            key={i}
            className="ls"
            x={x} y={y} width={17} height={17} rx={2}
            fill={exchanged ? CORAL : SUN}
            stroke={INK} strokeWidth={1.8}
            style={{ ...fade(visible && !removed, exchanged ? 600 + (i - 2) * 80 : 0), transform: removed ? 'translateY(-24px)' : 'none' }}
          />
        )
      })}
      <rect className="ls" x={170} y={124} width={50} height={33} rx={6} fill="none" stroke={CORAL} strokeWidth={2.5} strokeDasharray="5 4" style={fade(step === 1)} />
      <Caption x={74} y={30} size={15} color={MUTED}>tiotal</Caption>
      <Caption x={230} y={30} size={15} color={MUTED}>ental</Caption>
      <Caption x={160} y={186} size={24} visible={step <= 1}>42 − 17</Caption>
      <Caption x={160} y={186} size={22} visible={step === 2} color={CORAL}>3 tiotal och 12 ental</Caption>
      <Caption x={160} y={186} size={22} visible={step === 3}>12 − 7 = 5 ental</Caption>
      <Caption x={160} y={186} size={22} visible={step === 4}>3 − 1 = 2 tiotal</Caption>
      <Caption x={160} y={186} size={26} visible={step >= 5} color={PRIMARY}>42 − 17 = 25</Caption>
    </g>
  )
}

/* ---------- Likhetstecknet ---------- */

const Likhetstecken: LessonVisual = ({ step }) => {
  const puzzle = step >= 2
  const boxLabel = step >= 5 ? '8' : step === 4 ? '3' : '?'
  const items: Weight[] = puzzle
    ? [
        ...stack(8, 18, 4).map(([x, y], i): Weight => ({ key: `l${i}`, kind: 'block', x, y, hi: step === 3 || (step === 2 && i >= 6) })),
        { key: 'box', kind: 'box', x: 216, y: 110, label: boxLabel, hi: step >= 4 },
        ...stack(5, 252, 3).map(([x, y], i): Weight => ({ key: `r${i}`, kind: 'block', x, y })),
      ]
    : [
        ...stack(8, 18, 4).map(([x, y], i): Weight => ({ key: `l${i}`, kind: 'block', x, y, hi: i >= 5 })),
        ...stack(8, 226, 4).map(([x, y], i): Weight => ({ key: `r${i}`, kind: 'block', x, y })),
      ]
  const eq = ['5 + 3 = 8', '8 = 5 + 3', '6 + 2 = □ + 5', '8 = □ + 5', '6 + 2 = 3 + 5', '8 ≠ 8 + 5'][step] ?? ''
  return <Balance items={items} eq={eq} tilt={step >= 5 ? 16 : 0} />
}

/* ---------- Klockan ---------- */

const CLOCK_NAMES: Record<number, string> = {
  180: 'klockan tre', 240: 'klockan fyra', 270: 'halv fem', 255: 'kvart över fyra', 285: 'kvart i fem', 300: 'klockan fem',
  200: 'tjugo över tre', 205: 'fem i halv fyra', 215: 'fem över halv fyra', 220: 'tjugo i fyra',
}
const digital = (mins: number): string => `${Math.floor(mins / 60)}:${String(Math.round(mins % 60)).padStart(2, '0')}`

function Clock({ minutes, wedge = false, fives = false, labels = false }: { minutes: number; wedge?: boolean; fives?: boolean; labels?: boolean }) {
  const cx = 98
  const cy = 102
  const r = 74
  const minAngle = ((minutes % 60) / 60) * 360 - 90
  const hourAngle = (((minutes / 60) % 12) / 12) * 360 - 90
  const [mx, my] = polar(cx, cy, r * 0.82, minAngle)
  const [hx, hy] = polar(cx, cy, r * 0.5, hourAngle)
  const swept = minutes % 60
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={PAPER} stroke={INK} strokeWidth={4} />
      {wedge && swept > 0.3 && (
        <path d={swept >= 59.7 ? `M${cx} ${cy - r + 4} A${r - 4} ${r - 4} 0 1 1 ${cx - 0.01} ${cy - r + 4} Z` : slice(cx, cy, r - 4, -90, minAngle)} fill={SUN_SOFT} />
      )}
      {wedge && [0, 90, 180, 270].map((a) => {
        const [x, y] = polar(cx, cy, r - 4, a - 90)
        return <line key={a} x1={cx} y1={cy} x2={x} y2={y} stroke={LINE} strokeWidth={1.5} strokeDasharray="3 3" />
      })}
      {Array.from({ length: 60 }, (_, i) => {
        const [x1, y1] = polar(cx, cy, r - 3, i * 6 - 90)
        const [x2, y2] = polar(cx, cy, r - (i % 5 === 0 ? 11 : 6), i * 6 - 90)
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={INK} strokeWidth={i % 5 === 0 ? 2.2 : 1} />
      })}
      {Array.from({ length: 12 }, (_, i) => {
        const [x, y] = polar(cx, cy, r - 23, (i + 1) * 30 - 90)
        return <text key={i} x={x} y={y + 6} textAnchor="middle" fontSize={16} fontWeight={900} fill={INK}>{i + 1}</text>
      })}
      {Array.from({ length: 12 }, (_, i) => {
        const [x, y] = polar(cx, cy, r + 13, (i + 1) * 30 - 90)
        return <text key={i} className="ls" x={x} y={y + 4} textAnchor="middle" fontSize={11} fontWeight={800} fill={CORAL} style={fade(fives, i * 120)}>{(i + 1) * 5}</text>
      })}
      <line x1={cx} y1={cy} x2={hx} y2={hy} stroke={INK} strokeWidth={7} strokeLinecap="round" />
      <line x1={cx} y1={cy} x2={mx} y2={my} stroke={PRIMARY} strokeWidth={4.5} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={6} fill={CORAL} stroke={INK} strokeWidth={2} />
      <g className="ls" style={fade(labels)}>
        <rect x={cx + 6} y={cy + 10} width={66} height={18} rx={9} fill={PAPER} stroke={LINE} />
        <text x={cx + 39} y={cy + 23} textAnchor="middle" fontSize={11.5} fontWeight={800} fill={INK}>timvisare</text>
        <rect x={cx - 84} y={cy - 46} width={78} height={18} rx={9} fill={PAPER} stroke={LINE} />
        <text x={cx - 45} y={cy - 33} textAnchor="middle" fontSize={11.5} fontWeight={800} fill={PRIMARY}>minutvisare</text>
      </g>
    </g>
  )
}

function ClockLesson({ step, times, wedge = false, fives }: { step: number; times: number[]; wedge?: boolean; fives?: (step: number) => boolean }) {
  const target = times[step] ?? times[times.length - 1]
  const m = useTween(target, 2600)
  const name = CLOCK_NAMES[target]
  return (
    <g>
      <Clock minutes={m} wedge={wedge} fives={fives?.(step)} labels={step === 0} />
      <g key={target} className="lesson-pop">
        {name && <text x={254} y={92} textAnchor="middle" fontSize={name.length > 15 ? 13.5 : name.length > 13 ? 15 : 19} fontWeight={900} fill={INK}>{name}</text>}
        <text x={254} y={128} textAnchor="middle" fontSize={30} fontWeight={900} fill={PRIMARY}>{digital(target)}</text>
      </g>
    </g>
  )
}

const KlockanHelHalv: LessonVisual = ({ step }) => <ClockLesson step={step} times={[180, 180, 240, 270, 270, 270]} />
const KlockanKvart: LessonVisual = ({ step }) => <ClockLesson step={step} times={[240, 255, 270, 285, 300, 300]} wedge />
const KlockanMinuter: LessonVisual = ({ step }) => <ClockLesson step={step} times={[180, 200, 200, 205, 215, 220]} fives={(st) => st <= 2} />

/* ---------- Medelvärde: jämna ut tornen ---------- */

const MEDEL_START = [2, 6, 3, 5]
const MEDEL_POS: { start: [number, number]; end: [number, number] }[] = (() => {
  const cubes: { col: number; lvl: number }[] = []
  MEDEL_START.forEach((h, col) => { for (let lvl = 0; lvl < h; lvl++) cubes.push({ col, lvl }) })
  const avg = 4
  const fill = MEDEL_START.map((h) => Math.min(h, avg))
  return cubes.map(({ col, lvl }) => {
    let endCol = col
    let endLvl = lvl
    if (lvl >= avg) {
      endCol = fill.findIndex((f) => f < avg)
      endLvl = fill[endCol]
      fill[endCol]++
    }
    const at = (c: number, l: number): [number, number] => [62 + c * 62, 150 - l * 24]
    return { start: at(col, lvl), end: at(endCol, endLvl) }
  })
})()

const Medelvarde: LessonVisual = ({ step }) => {
  const level = step >= 2
  return (
    <g>
      <line x1={30} x2={300} y1={172} y2={172} stroke={INK} strokeWidth={3} />
      {MEDEL_POS.map((p, i) => {
        const [x, y] = level ? p.end : p.start
        const moving = p.start[0] !== p.end[0]
        return (
          <rect key={i} className="ls ls--slow" x={-11} y={-11} width={22} height={22} rx={4}
            fill={moving && level ? CORAL : PRIMARY} stroke={INK} strokeWidth={2}
            style={{ transform: `translate(${x}px, ${y + 11}px)`, transitionDelay: level && moving ? `${(i % 3) * 500}ms` : '0ms' }} />
        )
      })}
      {MEDEL_START.map((h, c) => (
        <text key={c} className="ls" x={62 + c * 62} y={192} textAnchor="middle" fontSize={16} fontWeight={900} fill={MUTED} style={fade(step < 2)}>{h}</text>
      ))}
      <line className="ls" x1={34} x2={296} y1={150 - 3 * 24 - 13} y2={150 - 3 * 24 - 13} stroke={MINT} strokeWidth={3} strokeDasharray="7 5" style={fade(step >= 3)} />
      <Caption x={160} y={30} size={20} visible={step >= 3 && step < 4} color={MINT}>medelvärdet = 4</Caption>
      <Caption x={160} y={30} size={20} visible={step >= 4} color={PRIMARY}>(2 + 6 + 3 + 5) / 4 = 4</Caption>
    </g>
  )
}

/* ---------- Stapelmodellen ---------- */

const Stapelmodell: LessonVisual = ({ step }) => {
  const x0 = 64
  const u = 128 // en "Bea-stapel" (12)
  const extra = 64 // de 6 extra
  const removed = step === 3 || step === 4
  const known = step >= 4
  const bx = x0 + u + extra + 10
  return (
    <g>
      <Caption x={160} y={26} size={16} color={MUTED} visible={step === 0}>tillsammans 30 · Ali har 6 fler</Caption>
      <g className="ls" style={fade(step >= 1)}>
        <text x={x0 - 10} y={70} textAnchor="end" fontSize={17} fontWeight={900} fill={INK}>Ali</text>
        <rect x={x0} y={48} width={u} height={34} rx={4} fill={PRIMARY_SOFT} stroke={PRIMARY} strokeWidth={2.5} />
        <text className="ls" x={x0 + u / 2} y={71} textAnchor="middle" fontSize={18} fontWeight={900} fill={INK} style={fade(known)}>12</text>
        <g className="ls" style={{ opacity: removed ? 0.3 : 1 }}>
          <rect x={x0 + u} y={48} width={extra} height={34} rx={4} fill={removed ? PAPER : CORAL_SOFT} stroke={CORAL} strokeWidth={2.5} strokeDasharray={removed ? '5 4' : undefined} />
          <text x={x0 + u + extra / 2} y={71} textAnchor="middle" fontSize={18} fontWeight={900} fill={INK}>6</text>
        </g>
        <text className="ls" x={x0 + u + extra + 4} y={40} textAnchor="end" fontSize={15} fontWeight={900} fill={MINT} style={fade(step >= 5)}>Ali = 18</text>
        <text x={x0 - 10} y={124} textAnchor="end" fontSize={17} fontWeight={900} fill={INK}>Bea</text>
        <rect x={x0} y={102} width={u} height={34} rx={4} fill={known ? PRIMARY_SOFT : PAPER} stroke={known ? PRIMARY : CORAL} strokeWidth={2.5} strokeDasharray={known ? undefined : '5 4'} />
        <text x={x0 + u / 2} y={125} textAnchor="middle" fontSize={18} fontWeight={900} fill={known ? INK : CORAL}>{known ? '12' : '?'}</text>
      </g>
      <g className="ls" style={fade(step >= 2)}>
        <path d={`M${bx} 48 q8 0 8 8 V84 q0 8 8 8 q-8 0 -8 8 V128 q0 8 -8 8`} fill="none" stroke={INK} strokeWidth={2.2} />
        <g key={removed ? 'a' : 'b'} className="lesson-pop">
          <text x={bx + 36} y={98} textAnchor="middle" fontSize={22} fontWeight={900} fill={removed ? CORAL : INK}>{removed ? '24' : '30'}</text>
        </g>
      </g>
      <Caption x={160} y={176} size={22} visible={step === 3} color={CORAL}>30 − 6 = 24</Caption>
      <Caption x={160} y={176} size={22} visible={step === 4} color={PRIMARY}>24 / 2 = 12</Caption>
      <Caption x={160} y={176} size={22} visible={step === 5} color={MINT}>12 + 18 = 30</Caption>
      <Caption x={160} y={176} size={20} visible={step >= 6} color={PRIMARY}>rita först, räkna sedan</Caption>
    </g>
  )
}

/* ---------- Räkna till 100: hundrarutan ---------- */

const HUNDRA_PAIRS = [[39, 40], [49, 50], [69, 70], [99, 100]]

const Hundra: LessonVisual = ({ step }) => {
  const C = 18.5
  const x0 = 67
  const y0 = 6
  return (
    <g>
      {Array.from({ length: 100 }, (_, i) => {
        const v = i + 1
        const row = Math.floor(i / 10)
        const col = i % 10
        const inRow = v >= 21 && v <= 29
        const pairIdx = HUNDRA_PAIRS.findIndex((p) => p.includes(v))
        const hi =
          (step === 1 && inRow) ||
          (step === 2 && (v === 29 || v === 30)) ||
          (step === 3 && pairIdx >= 0) ||
          (step >= 4 && v % 10 === 0) ||
          (step === 5 && v === 29)
        const fill = hi ? (v % 10 === 0 ? CORAL : SUN) : v % 10 === 0 ? PRIMARY_SOFT : PAPER
        const delay = step === 0 ? row * 140 : step === 1 && inRow ? (v - 21) * 280 : step === 3 && pairIdx >= 0 ? pairIdx * 900 : step === 4 && v % 10 === 0 ? row * 280 : 0
        return (
          <g key={v} className="ls" style={{ ...fade(true, step === 0 ? row * 140 : 0) }}>
            <rect className="ls" x={x0 + col * C} y={y0 + row * C} width={C - 1.5} height={C - 1.5} rx={2.5}
              fill={fill} stroke={LINE} strokeWidth={0.8} style={{ transitionDelay: `${delay}ms` }} />
            <text x={x0 + col * C + (C - 1.5) / 2} y={y0 + row * C + C / 2 + 3} textAnchor="middle" fontSize={8} fontWeight={800} fill={INK}>{v}</text>
          </g>
        )
      })}
      <Caption x={34} y={y0 + 3.5 * C + 4} size={13} visible={step === 2} color={CORAL}>ny rad →</Caption>
      <g className="ls" style={fade(step === 5)}>
        <rect x={258} y={46} width={58} height={24} rx={12} fill={PAPER} stroke={CORAL} strokeWidth={2} />
        <text x={287} y={63} textAnchor="middle" fontSize={11} fontWeight={900} fill={CORAL} textDecoration="line-through">tjugotio</text>
      </g>
    </g>
  )
}

export const LESSON_VISUALS: Record<string, LessonVisual> = {
  'mult-intro': MultIntro,
  'div-intro': DivIntro,
  'negativa-tal': NegativaTal,
  'brak-intro': BrakIntro,
  'brak-jamfora': BrakJamfora,
  'brak-rakna': BrakRakna,
  'procent-intro': Procent,
  'decimal-intro': Decimal,
  'brak-decimal-procent': BrakDecimalProcent,
  'enkla-ekvationer': EnklaEkvationer,
  'ekvationer-tva-steg': EkvationerTvaSteg,
  'omkrets': Omkrets,
  'area': Area,
  'vinklar': Vinklar,
  'koordinatsystem': Koordinat,
  'talrad-0-100': Hundra,
  'tiotalsovergang-20': Tiotal,
  'vaxling-0-100': Vaxling,
  'likhetstecken': Likhetstecken,
  'klockan-hel-halv': KlockanHelHalv,
  'klockan-kvart': KlockanKvart,
  'klockan-minuter': KlockanMinuter,
  'medelvarde': Medelvarde,
  'problemlosning-flerstegs': Stapelmodell,
}
