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

function Balance({ items, eq, cuts = false }: { items: Weight[]; eq: string; cuts?: boolean }) {
  return (
    <g>
      {/* Stativ och balk — balken ligger alltid vågrätt: det är hela poängen. */}
      <polygon points="148,164 172,164 160,148" fill={MUTED} />
      <line x1={160} x2={160} y1={58} y2={152} stroke={MUTED} strokeWidth={6} strokeLinecap="round" />
      <line x1={58} x2={262} y1={58} y2={58} stroke={INK} strokeWidth={6} strokeLinecap="round" />
      <circle cx={160} cy={58} r={7} fill={SUN} stroke={INK} strokeWidth={2.5} />
      {[60, 260].map((cx) => (
        <g key={cx}>
          <line x1={cx} x2={cx - 48} y1={58} y2={140} stroke={MUTED} strokeWidth={1.5} />
          <line x1={cx} x2={cx + 48} y1={58} y2={140} stroke={MUTED} strokeWidth={1.5} />
          <path d={`M${cx - 56} 140 L${cx + 56} 140 L${cx + 46} 148 L${cx - 46} 148 Z`} fill={SUN} stroke={INK} strokeWidth={2.5} />
        </g>
      ))}
      <line className="ls" x1={60} x2={60} y1={70} y2={140} stroke={CORAL} strokeWidth={2.5} strokeDasharray="5 4" style={fade(cuts)} />
      <line className="ls" x1={262} x2={262} y1={70} y2={140} stroke={CORAL} strokeWidth={2.5} strokeDasharray="5 4" style={fade(cuts)} />
      {items.map((w) => (
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
}
