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

/* ---------- Chans (sannolikhet): alla möjligheter under strecket ---------- */

/** Blir sann en stund efter att `active` slagit till — för rörelser som ska
    hända INOM en scen (siffrorna som flyttar), inte bara mellan scener. */
function useLater(active: boolean, ms: number): boolean {
  const [on, setOn] = useState(false)
  useEffect(() => {
    if (!active) { setOn(false); return }
    if (reducedMotion()) { setOn(true); return }
    const t = window.setTimeout(() => setOn(true), ms)
    return () => window.clearTimeout(t)
  }, [active, ms])
  return on
}

const BALLS: { x: number; y: number; red: boolean }[] = [
  { x: 70, y: 150, red: true }, { x: 104, y: 152, red: false }, { x: 138, y: 148, red: true },
  { x: 86, y: 118, red: false }, { x: 122, y: 116, red: true },
]

const Sannolikhet: LessonVisual = ({ step }) => {
  const dice = step >= 5
  return (
    <g>
      <g className="ls" style={fade(!dice)}>
        {/* Påsen */}
        <path d="M44 92 Q40 60 70 52 L80 40 L128 40 L138 52 Q168 60 164 92 L164 160 Q164 182 140 182 L68 182 Q44 182 44 160 Z"
          fill={SUN_SOFT} stroke={INK} strokeWidth={3} />
        <path d="M78 46 Q104 58 130 46" fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" />
        {BALLS.map((b, i) => (
          <g key={i}>
            <circle className="ls" cx={b.x} cy={b.y} r={18} fill="none" stroke={SUN} strokeWidth={6} style={fade(step >= 3 && b.red)} />
            <circle cx={b.x} cy={b.y} r={14} fill={b.red ? CORAL : PRIMARY} stroke={INK} strokeWidth={2} />
            <text className="ls" x={b.x} y={b.y + 5} textAnchor="middle" fontSize={14} fontWeight={900} fill={PAPER} style={fade(step >= 2)}>{i + 1}</text>
          </g>
        ))}
      </g>
      {/* Tärningen */}
      <g className="ls" style={fade(dice)}>
        <rect x={60} y={70} width={92} height={92} rx={18} fill={PAPER} stroke={INK} strokeWidth={3} />
        {[[82, 92], [82, 116], [82, 140], [130, 92], [130, 116], [130, 140]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={7} fill={INK} />
        ))}
      </g>
      <g className="ls" style={fade(step >= 2 && !dice)}>
        <Frac x={244} y={104} n={step >= 3 ? 3 : '?'} d={5} size={46} hiD={step === 2} hiN={step === 3} />
      </g>
      <g className="ls" style={fade(dice)}>
        <Frac x={244} y={104} n={1} d={6} size={46} />
      </g>
      <Caption x={244} y={40} size={17} visible={step === 1} color={CORAL}>röd?</Caption>
      <Caption x={244} y={182} size={17} visible={step === 2} color={MUTED}>alla kulor</Caption>
      <Caption x={244} y={182} size={17} visible={step === 3} color={CORAL}>de röda</Caption>
      <Caption x={244} y={182} size={18} visible={step === 4} color={MINT}>tre av fem</Caption>
      <Caption x={244} y={182} size={18} visible={dice} color={MINT}>en av sex</Caption>
    </g>
  )
}

/* ---------- Skala: från kartan till verkligheten ---------- */

const CM = 45

const Skala: LessonVisual = ({ step }) => {
  const measured = useTween(step >= 2 ? 3 : 0, 1600)
  return (
    <g>
      <rect x={18} y={18} width={190} height={112} rx={10} fill="#E6F0D6" stroke={LINE} strokeWidth={2} />
      <ellipse cx={170} cy={46} rx={26} ry={14} fill="#BFDDF0" />
      <path d="M30 112 Q60 100 52 124" fill="none" stroke="#9CC27E" strokeWidth={8} strokeLinecap="round" />
      {/* Vägen: exakt 3 cm på kartan */}
      <line x1={40} x2={40 + 3 * CM} y1={84} y2={84} stroke="#8A8178" strokeWidth={10} strokeLinecap="round" />
      <line x1={46} x2={34 + 3 * CM} y1={84} y2={84} stroke={PAPER} strokeWidth={2} strokeDasharray="6 6" />
      <g className="ls" style={fade(step >= 1)}>
        <rect x={26} y={26} width={66} height={26} rx={8} fill={PAPER} stroke={INK} strokeWidth={2} />
        <text x={59} y={45} textAnchor="middle" fontSize={16} fontWeight={900} fill={INK}>1:1000</text>
      </g>
      {/* Linjalen */}
      <g className="ls" style={fade(step >= 2)}>
        <rect x={34} y={140} width={4 * CM + 12} height={34} rx={4} fill={SUN_SOFT} stroke={INK} strokeWidth={2} />
        <rect x={40} y={140} width={measured * CM} height={10} fill={SUN} />
        {Array.from({ length: 5 }, (_, i) => (
          <g key={i}>
            <line x1={40 + i * CM} x2={40 + i * CM} y1={140} y2={152} stroke={INK} strokeWidth={2} />
            <text x={40 + i * CM} y={168} textAnchor="middle" fontSize={12} fontWeight={800} fill={INK}>{i}</text>
          </g>
        ))}
        <text x={34 + 4 * CM + 18} y={168} fontSize={11} fontWeight={800} fill={MUTED}>cm</text>
      </g>
      <Caption x={265} y={56} size={16} visible={step === 1} color={PRIMARY}>1 cm →</Caption>
      <Caption x={265} y={78} size={16} visible={step === 1} color={PRIMARY}>1000 cm</Caption>
      <Caption x={265} y={84} size={22} visible={step === 2} color={INK}>3 cm</Caption>
      <Caption x={265} y={56} size={17} visible={step >= 3 && step < 5} color={PRIMARY}>3 × 1000</Caption>
      <Caption x={265} y={80} size={17} visible={step >= 3 && step < 5} color={PRIMARY}>= 3000 cm</Caption>
      <Caption x={265} y={110} size={20} visible={step === 4} color={MINT}>= 30 m</Caption>
      <Caption x={266} y={52} size={14} visible={step >= 5} color={PRIMARY}>från kartan:</Caption>
      <Caption x={266} y={76} size={20} visible={step >= 5} color={PRIMARY}>gånger</Caption>
      <Caption x={266} y={112} size={14} visible={step >= 5} color={CORAL}>till kartan:</Caption>
      <Caption x={266} y={136} size={20} visible={step >= 5} color={CORAL}>delat</Caption>
    </g>
  )
}

/* ---------- Grafer: upp till linjen, sedan åt sidan ---------- */

const Grafer: LessonVisual = ({ step }) => {
  const ox = 52
  const oy = 172
  const ux = 42
  const uy = 14
  const X = (hg: number): number => ox + hg * ux
  const Y = (kr: number): number => oy - kr * uy
  const up = useTween(step >= 2 ? 6 : 0, 1400)
  const left = useTween(step >= 3 ? 3 : 0, 1400)
  const across = useTween(step >= 4 ? 4 : 0, 1400)
  const down = useTween(step >= 5 ? 8 : 0, 1400)
  const firstDim = step >= 4 ? 0.25 : 1
  return (
    <g>
      {Array.from({ length: 6 }, (_, i) => (
        <g key={`x${i}`}>
          <line x1={X(i)} x2={X(i)} y1={Y(0)} y2={Y(11)} stroke={LINE} strokeWidth={1} />
          <text x={X(i)} y={oy + 17} textAnchor="middle" fontSize={12} fontWeight={800} fill={MUTED}>{i}</text>
        </g>
      ))}
      {[2, 4, 6, 8, 10].map((kr) => (
        <g key={`y${kr}`}>
          <line x1={X(0)} x2={X(5.4)} y1={Y(kr)} y2={Y(kr)} stroke={LINE} strokeWidth={1} />
          <text x={ox - 8} y={Y(kr) + 4} textAnchor="end" fontSize={12} fontWeight={800} fill={MUTED}>{kr}</text>
        </g>
      ))}
      <line x1={X(0)} x2={X(5.6)} y1={oy} y2={oy} stroke={INK} strokeWidth={3} />
      <line x1={ox} x2={ox} y1={Y(0)} y2={Y(11.5)} stroke={INK} strokeWidth={3} />
      <text x={X(5.6)} y={oy - 6} textAnchor="end" fontSize={13} fontWeight={900} fill={INK}>hg</text>
      <text x={ox + 6} y={Y(11.2)} fontSize={13} fontWeight={900} fill={INK}>kr</text>
      <line className="ls" x1={X(0)} y1={Y(0)} x2={X(5)} y2={Y(10)} stroke={MINT} strokeWidth={5} strokeLinecap="round" style={fade(step >= 1)} />
      {/* 3 hg → 6 kr */}
      <g opacity={firstDim}>
        <line x1={X(3)} x2={X(3)} y1={Y(0)} y2={Y(up)} stroke={CORAL} strokeWidth={4} strokeDasharray="6 4" opacity={step >= 2 ? 1 : 0} />
        <line x1={X(3)} x2={X(3 - left)} y1={Y(6)} y2={Y(6)} stroke={CORAL} strokeWidth={4} strokeDasharray="6 4" opacity={step >= 3 ? 1 : 0} />
      </g>
      {/* 8 kr → 4 hg */}
      <line x1={X(0)} x2={X(across)} y1={Y(8)} y2={Y(8)} stroke={PRIMARY} strokeWidth={4} strokeDasharray="6 4" opacity={step >= 4 ? 1 : 0} />
      <line x1={X(4)} x2={X(4)} y1={Y(8)} y2={Y(8 - down)} stroke={PRIMARY} strokeWidth={4} strokeDasharray="6 4" opacity={step >= 5 ? 1 : 0} />
      <Caption x={X(3) + 28} y={Y(6) + 6} size={15} visible={step === 3} color={CORAL}>6 kr</Caption>
      <Caption x={X(4) + 26} y={oy - 10} size={15} visible={step >= 5} color={PRIMARY}>4 hg</Caption>
      <Caption x={265} y={36} size={15} visible={step === 0} color={MUTED}>godispris</Caption>
    </g>
  )
}

/* ---------- Räkna med decimaltal: komma under komma ---------- */

const DEC = { e: 140, k: 162, t: 184, h: 210 }

const DecimalRakna: LessonVisual = ({ step }) => {
  const shift = useTween(step >= 1 ? 0 : 52, 1300)
  const digit = (x: number, y: number, ch: string, color = INK): JSX.Element => (
    <text x={x} y={y} textAnchor="middle" fontSize={34} fontWeight={900} fill={color}>{ch}</text>
  )
  return (
    <g>
      <g className="ls" style={fade(step >= 3)}>
        <text x={DEC.e} y={28} textAnchor="middle" fontSize={10} fontWeight={800} fill={MUTED}>ental</text>
        <text x={DEC.t} y={20} textAnchor="middle" fontSize={10} fontWeight={800} fill={MUTED}>tiondel</text>
        <text x={DEC.h + 8} y={34} textAnchor="middle" fontSize={10} fontWeight={800} fill={MUTED}>hundradel</text>
      </g>
      <line className="ls" x1={DEC.k} x2={DEC.k} y1={34} y2={176} stroke={MINT} strokeWidth={3} strokeDasharray="5 5" style={fade(step >= 4)} />
      {digit(DEC.e, 72, '3')}{digit(DEC.k, 72, ',')}{digit(DEC.t, 72, '1')}{digit(DEC.h, 72, '8')}
      <text x={100} y={116} textAnchor="middle" fontSize={34} fontWeight={900} fill={INK}>+</text>
      <g style={{ transform: `translate(${shift}px, 0)` }}>
        {digit(DEC.e, 116, '2')}{digit(DEC.k, 116, ',')}{digit(DEC.t, 116, '7')}
      </g>
      <text className="ls" x={DEC.h} y={116} textAnchor="middle" fontSize={34} fontWeight={900} fill={CORAL} style={fade(step >= 2)}>0</text>
      <line x1={110} x2={232} y1={130} y2={130} stroke={INK} strokeWidth={3} />
      <text className="ls" x={DEC.h} y={170} textAnchor="middle" fontSize={34} fontWeight={900} fill={PRIMARY} style={fade(step >= 3)}>8</text>
      <text className="ls" x={DEC.t} y={170} textAnchor="middle" fontSize={34} fontWeight={900} fill={PRIMARY} style={fade(step >= 3, 1100)}>8</text>
      <text className="ls" x={DEC.e} y={170} textAnchor="middle" fontSize={34} fontWeight={900} fill={PRIMARY} style={fade(step >= 3, 2200)}>5</text>
      <text className="ls" x={DEC.k} y={170} textAnchor="middle" fontSize={34} fontWeight={900} fill={MINT} style={fade(step >= 4)}>,</text>
      <Caption x={280} y={116} size={14} visible={step === 0} color={CORAL}>fel plats!</Caption>
      <Caption x={280} y={116} size={14} visible={step === 2} color={CORAL}>2,7 = 2,70</Caption>
    </g>
  )
}

/* ---------- Gånger och delat med stora tal ---------- */

const PV = { h: 112, t: 162, e: 212 }

const MultDivStora: LessonVisual = ({ step }) => {
  const shifted0 = useLater(step === 0, 1300)
  const back2 = useLater(step === 2, 1300)
  const target = step === 0 ? (shifted0 ? 1 : 0) : step === 1 ? 1 : step === 2 ? (back2 ? 0 : 1) : 0
  const off = useTween(target, 1000)
  const area = step >= 3
  return (
    <g>
      <g className="ls" style={fade(!area)}>
        {([['hundratal', PV.h], ['tiotal', PV.t], ['ental', PV.e]] as const).map(([name, x]) => (
          <g key={name}>
            <rect x={x - 22} y={44} width={44} height={70} rx={8} fill={PAPER} stroke={LINE} strokeWidth={2} />
            <text x={x} y={36} textAnchor="middle" fontSize={11} fontWeight={800} fill={MUTED}>{name}</text>
          </g>
        ))}
        <text x={PV.t - off * 50} y={92} textAnchor="middle" fontSize={36} fontWeight={900} fill={PRIMARY}>3</text>
        <text x={PV.e - off * 50} y={92} textAnchor="middle" fontSize={36} fontWeight={900} fill={PRIMARY}>4</text>
        <text x={PV.e} y={92} textAnchor="middle" fontSize={36} fontWeight={900} fill={CORAL} opacity={step === 1 || (step === 0 && shifted0) || (step === 2 && !back2) ? 1 : 0}>0</text>
        <Caption x={160} y={150} size={20} visible={step <= 1} color={INK}>34 × 10 = 340</Caption>
        <Caption x={160} y={150} size={20} visible={step === 2} color={INK}>340 / 10 = 34</Caption>
        <Caption x={160} y={178} size={15} visible={step <= 1} color={PRIMARY}>← ett steg åt vänster</Caption>
        <Caption x={160} y={178} size={15} visible={step === 2} color={PRIMARY}>ett steg åt höger →</Caption>
      </g>
      <g className="ls" style={fade(area)}>
        <text x={36} y={110} textAnchor="end" fontSize={18} fontWeight={900} fill={INK}>24</text>
        <rect x={46} y={60} width={160} height={84} rx={6} fill={PRIMARY_SOFT} stroke={INK} strokeWidth={2.5} />
        <rect x={206} y={60} width={80} height={84} rx={6} fill={CORAL_SOFT} stroke={INK} strokeWidth={2.5} />
        <text x={126} y={50} textAnchor="middle" fontSize={18} fontWeight={900} fill={PRIMARY}>10</text>
        <text x={246} y={50} textAnchor="middle" fontSize={18} fontWeight={900} fill={CORAL}>5</text>
        <text className="ls" x={126} y={110} textAnchor="middle" fontSize={24} fontWeight={900} fill={INK} style={fade(step >= 4)}>240</text>
        <text className="ls" x={246} y={110} textAnchor="middle" fontSize={24} fontWeight={900} fill={INK} style={fade(step >= 4, 900)}>120</text>
        <Caption x={166} y={24} size={18} visible={step === 3} color={INK}>24 × 15</Caption>
        <Caption x={166} y={178} size={20} visible={step >= 5} color={MINT}>240 + 120 = 360</Caption>
      </g>
    </g>
  )
}

/* ---------- Åk 3–4: gemensamma byggstenar ---------- */

/** En siffra i en uppställning. */
function Dig({ x, y, ch, color = INK, visible = true, size = 34, delay = 0 }: {
  x: number; y: number; ch: string; color?: string; visible?: boolean; size?: number; delay?: number
}) {
  return <text className="ls" x={x} y={y} textAnchor="middle" fontSize={size} fontWeight={900} fill={color} style={fade(visible, delay)}>{ch}</text>
}

/** En båge mellan två punkter på en tallinje; t = hur långt den ritats (0–1). */
function Arc({ x1, x2, y, h, color, t = 1, label, below = false, visible = true }: {
  x1: number; x2: number; y: number; h: number; color: string; t?: number; label?: string; below?: boolean; visible?: boolean
}) {
  const cy = below ? y + h : y - h
  return (
    <g className="ls" style={fade(visible)}>
      <path d={`M${x1} ${y} Q${(x1 + x2) / 2} ${cy} ${x2} ${y}`} fill="none" stroke={color} strokeWidth={4} strokeLinecap="round"
        pathLength={1} strokeDasharray="1" strokeDashoffset={1 - t} />
      {label && <text x={(x1 + x2) / 2} y={below ? cy + 2 : cy + 10} textAnchor="middle" fontSize={15} fontWeight={900} fill={color} opacity={t > 0.6 ? 1 : 0}>{label}</text>}
    </g>
  )
}

const COLS = [100, 145, 190]
const COL_NAMES = ['hundratal', 'tiotal', 'ental']

function ColumnFrame({ active }: { active: number }) {
  return (
    <g>
      {COLS.map((x, i) => (
        <g key={i}>
          <rect className="ls" x={x - 20} y={34} width={40} height={150} rx={10} fill={SUN_SOFT} style={fade(active === i)} />
          <text x={x} y={26} textAnchor="middle" fontSize={10} fontWeight={800} fill={MUTED}>{COL_NAMES[i]}</text>
        </g>
      ))}
      <line x1={66} x2={212} y1={138} y2={138} stroke={INK} strokeWidth={3} />
    </g>
  )
}

/* ---------- Räkna till 1000: uppställning med minnessiffra ---------- */

const AddSub1000: LessonVisual = ({ step }) => {
  const active = step === 1 || step === 2 ? 2 : step === 3 ? 1 : step === 4 ? 0 : -1
  return (
    <g>
      <ColumnFrame active={active} />
      <Dig x={COLS[0]} y={82} ch="2" /><Dig x={COLS[1]} y={82} ch="4" /><Dig x={COLS[2]} y={82} ch="5" />
      <Dig x={68} y={124} ch="+" />
      <Dig x={COLS[0]} y={124} ch="1" /><Dig x={COLS[1]} y={124} ch="3" /><Dig x={COLS[2]} y={124} ch="8" />
      <Dig x={COLS[1]} y={52} ch="1" size={18} color={CORAL} visible={step >= 2} />
      <Dig x={COLS[2]} y={176} ch="3" color={PRIMARY} visible={step >= 2} />
      <Dig x={COLS[1]} y={176} ch="8" color={PRIMARY} visible={step >= 3} />
      <Dig x={COLS[0]} y={176} ch="3" color={PRIMARY} visible={step >= 4} />
      <Caption x={268} y={100} size={16} visible={step === 1} color={PRIMARY}>5 + 8 = 13</Caption>
      <Caption x={268} y={90} size={15} visible={step === 2} color={CORAL}>13 = 1 tiotal</Caption>
      <Caption x={268} y={112} size={15} visible={step === 2} color={CORAL}>+ 3 ental</Caption>
      <Caption x={268} y={100} size={15} visible={step === 3} color={PRIMARY}>4 + 3 + 1 = 8</Caption>
      <Caption x={268} y={100} size={16} visible={step === 4} color={PRIMARY}>2 + 1 = 3</Caption>
      <Caption x={268} y={90} size={14} visible={step >= 5} color={MINT}>minus:</Caption>
      <Caption x={268} y={112} size={14} visible={step >= 5} color={MINT}>växla ett tiotal</Caption>
    </g>
  )
}

/* ---------- Stora tal: platsernas namn och värde ---------- */

const PLACES = ['tiotusental', 'tusental', 'hundratal', 'tiotal', 'ental']
const PLACE_X = [40, 100, 160, 220, 280]

const StoraTal: LessonVisual = ({ step }) => {
  const digits = ['1', '3', step >= 4 ? '5' : '4', '7', '9']
  const lit = (i: number): boolean => (step === 1 && i >= 3) || ((step === 2 || step === 4) && i === 2)
  return (
    <g>
      {PLACE_X.map((x, i) => (
        <g key={i}>
          <rect className="ls" x={x - 25} y={58} width={50} height={64} rx={10} fill={lit(i) ? SUN : PAPER} stroke={LINE} strokeWidth={2} />
          <text x={x} y={48} textAnchor="middle" fontSize={9} fontWeight={800} fill={MUTED}>{PLACES[i]}</text>
          <text x={x} y={104} textAnchor="middle" fontSize={34} fontWeight={900} fill={step >= 4 && i === 2 ? CORAL : PRIMARY}>{digits[i]}</text>
        </g>
      ))}
      {[0, 1, 2, 3].map((i) => (
        <text key={i} className="ls" x={PLACE_X[i] + 30} y={146} textAnchor="middle" fontSize={12} fontWeight={900} fill={MINT} style={fade(step === 3)}>← ×10</text>
      ))}
      <Caption x={160} y={152} size={20} visible={step === 2} color={INK}>4 hundratal = 400</Caption>
      <Caption x={160} y={152} size={20} visible={step === 4} color={CORAL}>13 479 + 100 = 13 579</Caption>
      <Caption x={160} y={152} size={18} visible={step >= 5} color={CORAL}>9 + 1 = 10 → växla åt vänster</Caption>
    </g>
  )
}

/* ---------- Alla tabeller: bygg en du glömt av en du kan ---------- */

const TabellerAlla: LessonVisual = ({ step }) => {
  const cell = 17
  const x0 = 34
  const y0 = 40
  const grid = step <= 3
  return (
    <g>
      <g className="ls" style={fade(grid)}>
        <rect className="ls" x={x0 - 6} y={y0 - 6} width={7 * cell + 12} height={5 * cell + 6} rx={8} fill={PRIMARY_SOFT} style={fade(step >= 2)} />
        {Array.from({ length: 6 }, (_, r) => Array.from({ length: 7 }, (_, c) => (
          <circle key={`${r}-${c}`} cx={x0 + c * cell + cell / 2 - 6} cy={y0 + r * cell + cell / 2 - 6} r={6}
            fill={r === 5 && step >= 3 ? CORAL : PRIMARY} />
        )))}
      </g>
      <Caption x={250} y={92} size={22} visible={step === 1} color={INK}>6 × 7</Caption>
      <Caption x={250} y={80} size={18} visible={step >= 2 && step <= 3} color={PRIMARY}>5 × 7 = 35</Caption>
      <Caption x={250} y={112} size={18} visible={step === 3} color={CORAL}>35 + 7 = 42</Caption>
      <Caption x={250} y={150} size={20} visible={step === 3} color={MINT}>6 × 7 = 42</Caption>
      <Caption x={160} y={70} size={24} visible={step === 4} color={INK}>9 × 4</Caption>
      <Caption x={160} y={110} size={20} visible={step === 4} color={PRIMARY}>= 10 × 4 − 4</Caption>
      <Caption x={160} y={148} size={20} visible={step === 4} color={MINT}>= 40 − 4 = 36</Caption>
      <Caption x={160} y={110} size={26} visible={step >= 5} color={MINT}>7 × 6 = 6 × 7</Caption>
    </g>
  )
}

/* ---------- Gånger och delat hör ihop: talfamiljen ---------- */

const MultDivSamband: LessonVisual = ({ step }) => {
  const eqs = ['6 × 7 = 42', '7 × 6 = 42', '42 / 7 = 6', '42 / 6 = 7']
  return (
    <g>
      <path d="M86 42 L34 158 L138 158 Z" fill={SUN_SOFT} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
      <circle cx={86} cy={58} r={22} fill={PAPER} stroke={INK} strokeWidth={2.5} />
      <text x={86} y={66} textAnchor="middle" fontSize={22} fontWeight={900} fill={CORAL}>42</text>
      <circle cx={48} cy={146} r={20} fill={PAPER} stroke={INK} strokeWidth={2.5} />
      <text x={48} y={154} textAnchor="middle" fontSize={22} fontWeight={900} fill={PRIMARY}>6</text>
      <circle cx={124} cy={146} r={20} fill={PAPER} stroke={INK} strokeWidth={2.5} />
      <text x={124} y={154} textAnchor="middle" fontSize={22} fontWeight={900} fill={PRIMARY}>7</text>
      {eqs.map((e, i) => (
        <Caption key={e} x={240} y={52 + i * 32} size={19} visible={step >= i + 1 && step < 5} color={i < 2 ? PRIMARY : CORAL}>{e}</Caption>
      ))}
      <Caption x={240} y={92} size={19} visible={step >= 5} color={CORAL}>42 / 7 = ?</Caption>
      <Caption x={240} y={126} size={19} visible={step >= 5} color={MINT}>? × 7 = 42</Caption>
    </g>
  )
}

/* ---------- Uppställning gånger ---------- */

const SkriftligMult: LessonVisual = ({ step }) => {
  const active = step === 1 ? 2 : step === 2 || step === 3 ? 1 : -1
  return (
    <g>
      <ColumnFrame active={active} />
      <Dig x={COLS[1]} y={82} ch="4" /><Dig x={COLS[2]} y={82} ch="6" />
      <Dig x={68} y={124} ch="×" /><Dig x={COLS[2]} y={124} ch="3" />
      <Dig x={COLS[1]} y={52} ch="1" size={18} color={CORAL} visible={step >= 1} />
      <Dig x={COLS[2]} y={176} ch="8" color={PRIMARY} visible={step >= 1} />
      <Dig x={COLS[1]} y={176} ch="3" color={PRIMARY} visible={step >= 3} />
      <Dig x={COLS[0]} y={176} ch="1" color={PRIMARY} visible={step >= 3} />
      <Caption x={268} y={100} size={16} visible={step === 1} color={PRIMARY}>6 × 3 = 18</Caption>
      <Caption x={268} y={88} size={15} visible={step === 2 || step === 3} color={PRIMARY}>4 × 3 = 12</Caption>
      <Caption x={268} y={112} size={15} visible={step === 2 || step === 3} color={CORAL}>12 + 1 = 13</Caption>
      <Caption x={268} y={88} size={15} visible={step >= 4} color={MINT}>46 ≈ 50</Caption>
      <Caption x={268} y={112} size={15} visible={step >= 4} color={MINT}>50 × 3 = 150</Caption>
    </g>
  )
}

/* ---------- Kort division: dela tiotal och ental för sig ---------- */

const GROUP_X = [50, 122, 194, 266]

const KortDivision: LessonVisual = ({ step }) => {
  const grouped = step >= 2
  const cubes = step >= 3
  return (
    <g>
      {GROUP_X.map((gx, g) => (
        <g key={g} className="ls" style={fade(grouped)}>
          <rect x={gx - 30} y={42} width={60} height={118} rx={10} fill={PRIMARY_SOFT} opacity={0.55} />
          <text x={gx} y={180} textAnchor="middle" fontSize={16} fontWeight={900} fill={MINT} style={{ opacity: step >= 4 ? 1 : 0 }}>21</text>
        </g>
      ))}
      {Array.from({ length: 8 }, (_, i) => {
        const [x, y] = grouped ? [GROUP_X[Math.floor(i / 2)] - 14 + (i % 2) * 16, 50] : [26 + i * 17, 50]
        return <rect key={i} className="ls ls--slow" x={0} y={0} width={12} height={64} rx={3} fill={PRIMARY} stroke={INK} strokeWidth={1.5}
          style={{ transform: `translate(${x}px, ${y}px)` }} />
      })}
      {Array.from({ length: step >= 5 ? 5 : 4 }, (_, j) => {
        // Före grupperingen ligger kuberna under grupperna, så de aldrig
        // hamnar ovanpå en tiotalsgrupp.
        const [x, y] = j === 4 ? [300, 128] : cubes ? [GROUP_X[j] - 7, 128] : [126 + j * 20, 168]
        return <rect key={j} className="ls ls--slow" x={0} y={0} width={14} height={14} rx={2} fill={j === 4 ? CORAL : SUN} stroke={INK} strokeWidth={1.5}
          style={{ transform: `translate(${x}px, ${y}px)` }} />
      })}
      <Caption x={160} y={26} size={18} visible={step === 0} color={INK}>84 / 4</Caption>
      <Caption x={160} y={26} size={18} visible={step === 1} color={INK}>84 = 80 + 4</Caption>
      <Caption x={160} y={26} size={18} visible={step === 2} color={PRIMARY}>80 / 4 = 20</Caption>
      <Caption x={160} y={26} size={18} visible={step === 3} color={PRIMARY}>4 / 4 = 1</Caption>
      <Caption x={160} y={26} size={18} visible={step === 4} color={MINT}>20 + 1 = 21</Caption>
      <Caption x={160} y={26} size={18} visible={step >= 5} color={CORAL}>85 / 4 = 21, rest 1</Caption>
    </g>
  )
}

/* ---------- Öppna utsagor: räkna baklänges ---------- */

const OU_X = (n: number): number => 22 + (n - 20) * 13.8

const OppnaUtsagor: LessonVisual = ({ step }) => {
  const t = useTween(step >= 2 ? 1 : 0, 1600)
  const mult = step >= 4
  return (
    <g>
      <g className="ls" style={fade(!mult)}>
        <text x={142} y={62} textAnchor="end" fontSize={32} fontWeight={900} fill={INK}>36 −</text>
        <text x={200} y={62} fontSize={32} fontWeight={900} fill={INK}>= 25</text>
        <rect x={150} y={34} width={42} height={38} rx={8} fill={step >= 3 ? MINT : SUN_SOFT} stroke={INK} strokeWidth={2.5} />
        <text x={171} y={63} textAnchor="middle" fontSize={26} fontWeight={900} fill={step >= 3 ? PAPER : CORAL}>{step >= 3 ? '11' : '?'}</text>
        <line x1={OU_X(20)} x2={OU_X(40)} y1={156} y2={156} stroke={INK} strokeWidth={3} />
        {Array.from({ length: 21 }, (_, i) => (
          <g key={i}>
            <line x1={OU_X(20 + i)} x2={OU_X(20 + i)} y1={150} y2={i % 5 === 0 ? 164 : 160} stroke={INK} strokeWidth={2} />
            {i % 5 === 0 && <text x={OU_X(20 + i)} y={180} textAnchor="middle" fontSize={12} fontWeight={800} fill={MUTED}>{20 + i}</text>}
          </g>
        ))}
        <circle className="ls" cx={OU_X(25)} cy={156} r={7} fill={PRIMARY} style={fade(step >= 1)} />
        <circle className="ls" cx={OU_X(36)} cy={156} r={7} fill={CORAL} style={fade(step >= 1)} />
        <Arc x1={OU_X(25)} x2={OU_X(36)} y={150} h={56} color={MINT} t={t} label="11 steg" visible={step >= 2} />
      </g>
      <g className="ls" style={fade(mult)}>
        <text x={138} y={92} fontSize={34} fontWeight={900} fill={INK}>× 5 = 25</text>
        <rect x={84} y={62} width={44} height={40} rx={8} fill={MINT} stroke={INK} strokeWidth={2.5} />
        <text x={106} y={92} textAnchor="middle" fontSize={28} fontWeight={900} fill={PAPER}>5</text>
        <Caption x={160} y={150} size={18} color={PRIMARY}>vad gånger 5 blir 25?</Caption>
      </g>
    </g>
  )
}

/* ---------- Mönster med regler ---------- */

const SEQ = [3, 7, 11, 15, 19, 23]
const SEQ_X = (i: number): number => 24 + i * 48

const MonsterRegler: LessonVisual = ({ step }) => (
  <g>
    {SEQ.map((n, i) => {
      const shown = i < 4 || step >= 3
      return (
        <g key={i} className="ls" style={fade(shown, i >= 4 ? (i - 4) * 700 : 0)}>
          <rect x={SEQ_X(i)} y={78} width={38} height={40} rx={8} fill={i === 5 && step >= 3 ? MINT : PAPER} stroke={LINE} strokeWidth={2} />
          <text x={SEQ_X(i) + 19} y={105} textAnchor="middle" fontSize={20} fontWeight={900} fill={i === 5 && step >= 3 ? PAPER : PRIMARY}>{n}</text>
          <text x={SEQ_X(i) + 19} y={136} textAnchor="middle" fontSize={10} fontWeight={800} fill={MUTED} style={{ opacity: step >= 3 ? 1 : 0 }}>plats {i + 1}</text>
        </g>
      )
    })}
    {SEQ.slice(1).map((_, i) => (
      <Arc key={i} x1={SEQ_X(i) + 24} x2={SEQ_X(i + 1) + 14} y={76} h={24} color={CORAL} label="+4" visible={step >= 1 && (i < 3 || step >= 3)} />
    ))}
    <Caption x={160} y={176} size={17} visible={step === 2} color={PRIMARY}>börja på 3, lägg till 4</Caption>
    <Caption x={160} y={176} size={17} visible={step >= 4} color={MINT}>3 + 5 × 4 = 3 + 20 = 23</Caption>
  </g>
)

/* ---------- Symmetri: vik längs spegellinjen ---------- */

const HEART_R = 'M80 72 C95 46 136 56 128 94 C122 122 96 136 80 154 Z'
const HEART_L = 'M80 72 C65 46 24 56 32 94 C38 122 64 136 80 154 Z'

const Symmetri: LessonVisual = ({ step }) => {
  // Viks bara i scen 2 — sedan vecklas hjärtat ut igen.
  const fold = useTween(step === 2 ? -1 : 1, 1500)
  const rect = step >= 5
  return (
    <g>
      <g className="ls" style={fade(!rect)}>
        <path d={HEART_R} fill={CORAL} />
        <path d={HEART_L} fill={CORAL_SOFT} stroke={CORAL} strokeWidth={2}
          style={{ transform: `translate(80px, 0) scaleX(${fold}) translate(-80px, 0)` }} opacity={0.9} />
        <line className="ls" x1={80} x2={80} y1={40} y2={168} stroke={INK} strokeWidth={2.5} strokeDasharray="6 5" style={fade(step >= 1)} />
      </g>
      <g className="ls" style={fade(rect)}>
        <rect x={30} y={70} width={100} height={60} fill={PRIMARY_SOFT} stroke={INK} strokeWidth={2.5} />
        <line x1={30} y1={70} x2={130} y2={130} stroke={CORAL} strokeWidth={3} strokeDasharray="6 5" />
        <text x={80} y={160} textAnchor="middle" fontSize={22} fontWeight={900} fill={CORAL}>✗</text>
      </g>
      <g className="ls" style={fade(step >= 3)}>
        <text x={210} y={128} textAnchor="middle" fontSize={78} fontWeight={900} fill={PRIMARY}>A</text>
        <line x1={210} x2={210} y1={52} y2={140} stroke={INK} strokeWidth={2.5} strokeDasharray="6 5" />
        <text x={210} y={164} textAnchor="middle" fontSize={20} fontWeight={900} fill={MINT}>✓</text>
      </g>
      <g className="ls" style={fade(step >= 4)}>
        <text x={280} y={128} textAnchor="middle" fontSize={78} fontWeight={900} fill={PRIMARY}>P</text>
        <line x1={280} x2={280} y1={52} y2={140} stroke={INK} strokeWidth={2.5} strokeDasharray="6 5" />
        <text x={280} y={164} textAnchor="middle" fontSize={20} fontWeight={900} fill={CORAL}>✗</text>
      </g>
    </g>
  )
}

/* ---------- Läsa diagram: temperaturen månad för månad ---------- */

const TEMP = [{ m: 'jan', v: 2 }, { m: 'feb', v: 4 }, { m: 'mar', v: 8 }, { m: 'apr', v: 6 }, { m: 'maj', v: 10 }]

const DiagramLasa: LessonVisual = ({ step }) => {
  const ox = 52
  const oy = 172
  const X = (i: number): number => ox + 22 + i * 50
  const Y = (v: number): number => oy - v * 12.5
  const up = useTween(step >= 1 ? 8 : 0, 1400)
  const left = useTween(step >= 2 ? 1 : 0, 1200)
  return (
    <g>
      {[2, 4, 6, 8, 10, 12].map((v) => (
        <g key={v}>
          <line x1={ox} x2={X(4) + 22} y1={Y(v)} y2={Y(v)} stroke={LINE} strokeWidth={1} />
          <text x={ox - 8} y={Y(v) + 4} textAnchor="end" fontSize={12} fontWeight={800} fill={MUTED}>{v}°</text>
        </g>
      ))}
      <line x1={ox} x2={X(4) + 24} y1={oy} y2={oy} stroke={INK} strokeWidth={3} />
      <line x1={ox} x2={ox} y1={oy} y2={Y(12.6)} stroke={INK} strokeWidth={3} />
      {TEMP.map((p, i) => <text key={p.m} x={X(i)} y={oy + 17} textAnchor="middle" fontSize={12} fontWeight={800} fill={step >= 1 && i === 2 ? CORAL : MUTED}>{p.m}</text>)}
      <polyline points={TEMP.map((p, i) => `${X(i)},${Y(p.v)}`).join(' ')} fill="none" stroke={PRIMARY} strokeWidth={4} strokeLinejoin="round" />
      {TEMP.map((p, i) => <circle key={p.m} cx={X(i)} cy={Y(p.v)} r={5} fill={PRIMARY} />)}
      <line x1={X(2)} x2={X(2)} y1={oy} y2={Y(up)} stroke={CORAL} strokeWidth={3} strokeDasharray="6 4" opacity={step >= 1 ? 1 : 0} />
      <line x1={X(2)} x2={X(2) - (X(2) - ox) * left} y1={Y(8)} y2={Y(8)} stroke={CORAL} strokeWidth={3} strokeDasharray="6 4" opacity={step >= 2 ? 1 : 0} />
      <line className="ls" x1={X(2)} y1={Y(8)} x2={X(3)} y2={Y(6)} stroke={CORAL} strokeWidth={7} strokeLinecap="round" style={fade(step >= 3)} />
      <line className="ls" x1={ox} x2={X(3)} y1={Y(6)} y2={Y(6)} stroke={MINT} strokeWidth={3} strokeDasharray="6 4" style={fade(step >= 3)} />
      <Caption x={X(2) + 4} y={Y(8) - 12} size={15} visible={step === 2} color={CORAL}>8°</Caption>
      <Caption x={X(3) + 22} y={Y(6) + 16} size={15} visible={step >= 3} color={MINT}>6°</Caption>
      <Caption x={250} y={30} size={16} visible={step >= 4} color={INK}>8 − 6 = 2 grader</Caption>
    </g>
  )
}

/* ---------- Proportionalitet: tre gånger så många, tre gånger så dyrt ---------- */

const Proportionalitet: LessonVisual = ({ step }) => (
  <g>
    <text x={58} y={88} textAnchor="middle" fontSize={16} fontWeight={900} fill={MUTED}>bullar</text>
    <text x={58} y={148} textAnchor="middle" fontSize={16} fontWeight={900} fill={MUTED}>kronor</text>
    {[[150, '3'], [250, '9']].map(([x, v]) => (
      <g key={String(x)}>
        <rect x={Number(x) - 32} y={62} width={64} height={40} rx={10} fill={PAPER} stroke={LINE} strokeWidth={2} />
        <text x={Number(x)} y={91} textAnchor="middle" fontSize={24} fontWeight={900} fill={PRIMARY}>{v}</text>
      </g>
    ))}
    <rect x={118} y={122} width={64} height={40} rx={10} fill={PAPER} stroke={LINE} strokeWidth={2} />
    <text x={150} y={151} textAnchor="middle" fontSize={24} fontWeight={900} fill={CORAL}>9</text>
    <rect x={218} y={122} width={64} height={40} rx={10} fill={step >= 2 ? MINT : SUN_SOFT} stroke={LINE} strokeWidth={2} />
    <text x={250} y={151} textAnchor="middle" fontSize={24} fontWeight={900} fill={step >= 2 ? PAPER : CORAL}>{step >= 2 ? '27' : '?'}</text>
    <Arc x1={162} x2={238} y={60} h={30} color={PRIMARY} label="× 3" visible={step >= 1} />
    <Arc x1={162} x2={238} y={164} h={30} color={CORAL} label="× 3" below visible={step >= 2} />
    <Caption x={160} y={20} size={14} visible={step === 3} color={MINT}>1 bulle: 9 / 3 = 3 kr → 9 × 3 = 27 kr</Caption>
    <Caption x={160} y={20} size={15} visible={step >= 4} color={MINT}>dubbelt så många → dubbelt så dyrt</Caption>
  </g>
)

/* ---------- Kontrollera med motsatt räknesätt ---------- */

const KM_X = (n: number): number => 20 + n * 4.6

const KontrollMotsatt: LessonVisual = ({ step }) => {
  const back = useTween(step >= 1 ? 1 : 0, 1500)
  const div = step >= 4
  return (
    <g>
      <g className="ls" style={fade(!div)}>
        <line x1={KM_X(0)} x2={KM_X(60)} y1={130} y2={130} stroke={INK} strokeWidth={3} />
        {[0, 10, 20, 30, 40, 50, 60].map((n) => (
          <g key={n}>
            <line x1={KM_X(n)} x2={KM_X(n)} y1={124} y2={136} stroke={INK} strokeWidth={2} />
            <text x={KM_X(n)} y={152} textAnchor="middle" fontSize={12} fontWeight={800} fill={MUTED}>{n}</text>
          </g>
        ))}
        <circle cx={KM_X(52)} cy={130} r={7} fill={INK} />
        <circle cx={KM_X(34)} cy={130} r={7} fill={PRIMARY} />
        <text x={KM_X(52)} y={112} textAnchor="middle" fontSize={13} fontWeight={900} fill={INK}>52</text>
        <text x={KM_X(34)} y={112} textAnchor="middle" fontSize={13} fontWeight={900} fill={PRIMARY}>34</text>
        <Arc x1={KM_X(52)} x2={KM_X(34)} y={122} h={58} color={CORAL} label="− 18" />
        <Arc x1={KM_X(34)} x2={KM_X(52)} y={160} h={26} color={MINT} t={back} label="+ 18" below visible={step >= 1 && step < 3} />
        <Caption x={KM_X(52) + 26} y={92} size={20} visible={step === 2} color={MINT}>✓</Caption>
        <Arc x1={KM_X(36)} x2={KM_X(54)} y={160} h={26} color={MUTED} label="+ 18" below visible={step === 3} />
        <circle className="ls" cx={KM_X(54)} cy={130} r={6} fill={CORAL} style={fade(step === 3)} />
        <Caption x={250} y={40} size={16} visible={step === 3} color={CORAL}>36 + 18 = 54 ≠ 52</Caption>
      </g>
      <g className="ls" style={fade(div)}>
        <Caption x={160} y={80} size={24} color={PRIMARY}>42 / 6 = 7</Caption>
        <Caption x={160} y={124} size={24} color={MINT}>7 × 6 = 42 ✓</Caption>
      </g>
    </g>
  )
}

/* ---------- Överslagsräkning: runda tal ---------- */

const OS_X = (n: number): number => 22 + n * 0.4

const Overslag: LessonVisual = ({ step }) => {
  const a = useTween(step >= 1 ? 400 : 398, 1200)
  const b = useTween(step >= 2 ? 200 : 205, 1200)
  return (
    <g>
      <line x1={OS_X(0)} x2={OS_X(700)} y1={120} y2={120} stroke={INK} strokeWidth={3} />
      {[0, 100, 200, 300, 400, 500, 600, 700].map((n) => (
        <g key={n}>
          <line x1={OS_X(n)} x2={OS_X(n)} y1={113} y2={127} stroke={INK} strokeWidth={2} />
          <text x={OS_X(n)} y={144} textAnchor="middle" fontSize={11} fontWeight={800} fill={MUTED}>{n}</text>
        </g>
      ))}
      <g className="ls" style={fade(step >= 1)}>
        <circle cx={OS_X(a)} cy={120} r={7} fill={PRIMARY} />
        <text x={OS_X(400)} y={98} textAnchor="middle" fontSize={14} fontWeight={900} fill={PRIMARY}>398 ≈ 400</text>
      </g>
      <g className="ls" style={fade(step >= 2)}>
        <circle cx={OS_X(b)} cy={120} r={7} fill={CORAL} />
        <text x={OS_X(200)} y={98} textAnchor="middle" fontSize={14} fontWeight={900} fill={CORAL}>205 ≈ 200</text>
      </g>
      <Caption x={160} y={40} size={22} visible={step >= 3} color={MINT}>400 + 200 = 600</Caption>
      <g className="ls" style={fade(step >= 4)}>
        <circle cx={OS_X(603)} cy={120} r={7} fill={MINT} />
        <text x={OS_X(603)} y={172} textAnchor="middle" fontSize={14} fontWeight={900} fill={MINT}>exakt: 603</text>
      </g>
      <Caption x={160} y={40} size={18} visible={step === 0} color={INK}>räkna ungefär</Caption>
    </g>
  )
}

/* ---------- Förskoleklass–åk 2: gemensamma byggstenar ---------- */

/** En prick som kan flytta (CSS-övergång), tona och bära en etikett. */
function Ball({ x, y, r = 11, fill, visible = true, delay = 0, label, ring = false, crossed = false }: {
  x: number; y: number; r?: number; fill: string; visible?: boolean; delay?: number; label?: string | number; ring?: boolean; crossed?: boolean
}) {
  return (
    <g className="ls ls--slow" style={{ transform: `translate(${x}px, ${y}px)`, opacity: visible ? (crossed ? 0.3 : 1) : 0, transitionDelay: visible ? `${delay}ms` : '0ms' }}>
      {ring && <circle r={r + 5} fill="none" stroke={SUN} strokeWidth={4} />}
      <circle r={r} fill={fill} stroke={INK} strokeWidth={2} />
      {crossed && <line x1={-r} y1={-r} x2={r} y2={r} stroke={INK} strokeWidth={3} strokeLinecap="round" />}
      {label !== undefined && <text y={-r - 6} textAnchor="middle" fontSize={14} fontWeight={900} fill={INK}>{label}</text>}
    </g>
  )
}

/** Tioramen: två rader om fem. cells = färg per ruta (undefined = tom). */
function TenFrame({ x, y, cell = 34, cells, crossed = [] }: { x: number; y: number; cell?: number; cells: (string | undefined)[]; crossed?: number[] }) {
  return (
    <g>
      {Array.from({ length: 10 }, (_, i) => {
        const cx = x + (i % 5) * cell
        const cy = y + Math.floor(i / 5) * cell
        return (
          <g key={i}>
            <rect x={cx} y={cy} width={cell} height={cell} fill={PAPER} stroke={LINE} strokeWidth={2} />
            <circle className="ls" cx={cx + cell / 2} cy={cy + cell / 2} r={cell * 0.34} fill={cells[i] ?? PAPER} stroke={cells[i] ? INK : 'none'} strokeWidth={2}
              style={{ opacity: cells[i] ? (crossed.includes(i) ? 0.25 : 1) : 0 }} />
          </g>
        )
      })}
    </g>
  )
}

const fill = (n: number, color: string, m = 0, color2 = CORAL): (string | undefined)[] =>
  Array.from({ length: 10 }, (_, i) => (i < n ? color : i < n + m ? color2 : undefined))

/** Tallinje med jämnt fördelade streck. */
function NumLine({ min, max, x0 = 22, x1 = 298, y, every = 1, labelEvery = 1, fontSize = 11 }: {
  min: number; max: number; x0?: number; x1?: number; y: number; every?: number; labelEvery?: number; fontSize?: number
}) {
  const X = (n: number): number => x0 + ((n - min) / (max - min)) * (x1 - x0)
  const ticks: number[] = []
  for (let n = min; n <= max; n += every) ticks.push(n)
  return (
    <g>
      <line x1={x0} x2={x1} y1={y} y2={y} stroke={INK} strokeWidth={3} />
      {ticks.map((n) => (
        <g key={n}>
          <line x1={X(n)} x2={X(n)} y1={y - 6} y2={y + 6} stroke={INK} strokeWidth={2} />
          {(n - min) % labelEvery === 0 && <text x={X(n)} y={y + 22} textAnchor="middle" fontSize={fontSize} fontWeight={800} fill={MUTED}>{n}</text>}
        </g>
      ))}
    </g>
  )
}
const lineX = (min: number, max: number, x0 = 22, x1 = 298) => (n: number): number => x0 + ((n - min) / (max - min)) * (x1 - x0)

/** Tiostavar och entalskuber. */
function Base10({ x, y, tens, ones, tenColor = PRIMARY, oneColor = SUN, labelsFrom, delayStep = 0 }: {
  x: number; y: number; tens: number; ones: number; tenColor?: string; oneColor?: string; labelsFrom?: number; delayStep?: number
}) {
  return (
    <g>
      {Array.from({ length: tens }, (_, i) => (
        <g key={`t${i}`} className="ls" style={fade(true, i * delayStep)}>
          <rect x={x + i * 16} y={y} width={12} height={70} rx={2} fill={tenColor} stroke={INK} strokeWidth={1.5} />
          {Array.from({ length: 9 }, (_, k) => <line key={k} x1={x + i * 16} x2={x + i * 16 + 12} y1={y + 7 * (k + 1)} y2={y + 7 * (k + 1)} stroke={INK} strokeWidth={0.6} />)}
        </g>
      ))}
      {Array.from({ length: ones }, (_, j) => (
        <rect key={`o${j}`} className="ls" x={x + tens * 16 + 8 + (j % 5) * 15} y={y + 70 - 14 - Math.floor(j / 5) * 15} width={12} height={12} rx={2}
          fill={oneColor} stroke={INK} strokeWidth={1.5} style={fade(true, (tens + j) * delayStep)} />
      ))}
      {labelsFrom !== undefined && null}
    </g>
  )
}

/* ---------- Räkna antal ---------- */

const ANTAL_X = [70, 115, 160, 205, 250]

const Antal: LessonVisual = ({ step }) => (
  <g>
    {ANTAL_X.map((x, i) => (
      <g key={i}>
        <ellipse cx={x} cy={110} rx={15} ry={20} fill="#9C6B3E" stroke={INK} strokeWidth={2} />
        <path d={`M${x - 10} ${100} L${x + 10} ${100} M${x - 12} ${110} L${x + 12} ${110} M${x - 10} ${120} L${x + 10} ${120}`} stroke="#6E4524" strokeWidth={2} />
        <circle className="ls" cx={x} cy={110} r={26} fill="none" stroke={SUN} strokeWidth={4} style={fade(step === 1 && i === 0)} />
        <text className="ls" x={x} y={74} textAnchor="middle" fontSize={22} fontWeight={900} fill={PRIMARY} style={fade(step >= 2, step === 2 ? i * 900 : 0)}>{i + 1}</text>
      </g>
    ))}
    <Caption x={160} y={176} size={26} visible={step === 3} color={MINT}>5 kottar</Caption>
    <Caption x={160} y={176} size={18} visible={step >= 4} color={PRIMARY}>peka · säg · gå vidare</Caption>
  </g>
)

/* ---------- Talraden 0–20 ---------- */

// Filmen visar 0–10: alla exempel ligger där, och stegen blir stora nog
// för de yngsta att se.
const T20 = lineX(0, 10, 20, 300)

const Talrad20: LessonVisual = ({ step }) => (
  <g>
    <NumLine min={0} max={10} y={130} x0={20} x1={300} fontSize={14} />
    <circle className="ls" cx={T20(7)} cy={130} r={8} fill={PRIMARY} style={fade(step >= 1 && step <= 2)} />
    <Arc x1={T20(7)} x2={T20(8)} y={124} h={40} color={MINT} label="+1" visible={step === 1} />
    <Arc x1={T20(7)} x2={T20(6)} y={124} h={40} color={CORAL} label="−1" visible={step === 2} />
    <circle className="ls" cx={T20(5)} cy={130} r={8} fill={PRIMARY} style={fade(step === 3)} />
    <Arc x1={T20(5)} x2={T20(6)} y={124} h={40} color={MINT} label="1" visible={step === 3} />
    <Arc x1={T20(6)} x2={T20(7)} y={124} h={40} color={MINT} label="2" visible={step === 3} />
    <circle className="ls" cx={T20(4)} cy={130} r={8} fill={CORAL} style={fade(step >= 4)} />
    <circle className="ls" cx={T20(9)} cy={130} r={10} fill={MINT} style={fade(step >= 4)} />
    <Caption x={160} y={60} size={20} visible={step === 1} color={MINT}>efter 7 kommer 8</Caption>
    <Caption x={160} y={60} size={20} visible={step === 2} color={CORAL}>före 7 kommer 6</Caption>
    <Caption x={160} y={60} size={20} visible={step === 3} color={MINT}>5 + 2 = 7</Caption>
    <Caption x={160} y={60} size={20} visible={step >= 4} color={MINT}>9 är störst — längst åt höger</Caption>
    <Caption x={160} y={60} size={18} visible={step === 0} color={PRIMARY}>0, 1, 2, 3 …</Caption>
  </g>
)

/* ---------- Dela upp tal ---------- */

const DelaUpp: LessonVisual = ({ step }) => {
  const left = [7, 5, 4, 3, 3][Math.min(step, 4)]
  return (
    <g>
      {Array.from({ length: 7 }, (_, i) => {
        const inLeft = i < left
        const x = step === 0 ? 88 + i * 24 : inLeft ? 46 + i * 26 : 196 + (i - left) * 26
        return <Ball key={i} x={x} y={112} fill={inLeft || step === 0 ? PRIMARY : CORAL}
          label={step === 3 && !inLeft ? i + 1 : undefined} delay={step === 3 && !inLeft ? (i - left) * 700 : 0} />
      })}
      <Caption x={160} y={50} size={22} visible={step === 0} color={INK}>7</Caption>
      <Caption x={160} y={50} size={22} visible={step === 1} color={INK}>5 + 2 = 7</Caption>
      <Caption x={160} y={50} size={22} visible={step === 2} color={INK}>4 + 3 = 7</Caption>
      <Caption x={160} y={50} size={22} visible={step === 3} color={INK}>3 + ? = 7</Caption>
      <Caption x={160} y={176} size={20} visible={step === 3} color={MINT}>4</Caption>
      <Caption x={160} y={50} size={18} visible={step >= 4} color={MINT}>5 + 2 · 4 + 3 · 3 + 4 — alla blir 7</Caption>
    </g>
  )
}

/* ---------- Mönster ---------- */

const Star = ({ x, y, color = SUN }: { x: number; y: number; color?: string }) => (
  <path transform={`translate(${x} ${y})`} d="M0 -16 L4.7 -5 L16 -5 L7 2 L10 14 L0 7 L-10 14 L-7 2 L-16 -5 L-4.7 -5 Z" fill={color} stroke={INK} strokeWidth={1.8} strokeLinejoin="round" />
)
const Moon = ({ x, y }: { x: number; y: number }) => (
  <path transform={`translate(${x} ${y})`} d="M4 -15 A15 15 0 1 0 4 15 A11 11 0 1 1 4 -15 Z" fill={PRIMARY_SOFT} stroke={INK} strokeWidth={1.8} />
)
const SEQ1 = ['s', 'm', 's', 'm', 's', 'm']
const SEQ2 = [CORAL, PRIMARY, SUN, CORAL, PRIMARY, SUN, CORAL]

const MonsterEnkla: LessonVisual = ({ step }) => (
  <g>
    <g className="ls" style={fade(step <= 2)}>
      {SEQ1.map((k, i) => {
        const x = 40 + i * 48
        const last = i === 4
        if (i === 5) return null
        return (
          <g key={i}>
            {last && step < 2 ? (
              <text x={x} y={96} textAnchor="middle" fontSize={30} fontWeight={900} fill={MUTED}>?</text>
            ) : k === 's' ? <Star x={x} y={86} /> : <Moon x={x} y={86} />}
            {last && step >= 2 && <circle cx={x} cy={86} r={24} fill="none" stroke={MINT} strokeWidth={3} />}
          </g>
        )
      })}
      <path className="ls" d="M24 116 L24 124 L104 124 L104 116" fill="none" stroke={CORAL} strokeWidth={3} style={fade(step >= 1)} />
      <Caption x={64} y={146} size={14} visible={step >= 1} color={CORAL}>biten</Caption>
    </g>
    <g className="ls" style={fade(step >= 3)}>
      {SEQ2.map((c, i) => {
        const x = 30 + i * 42
        const last = i === 6
        return last && step < 4
          ? <text key={i} x={x + 14} y={110} textAnchor="middle" fontSize={30} fontWeight={900} fill={MUTED}>?</text>
          : <rect key={i} x={x} y={80} width={28} height={28} rx={5} fill={c} stroke={last ? MINT : INK} strokeWidth={last ? 4 : 1.8} />
      })}
      <path className="ls" d="M28 120 L28 128 L144 128 L144 120" fill="none" stroke={CORAL} strokeWidth={3} style={fade(step >= 4)} />
      <Caption x={86} y={150} size={14} visible={step >= 4} color={CORAL}>biten: röd, blå, gul</Caption>
    </g>
  </g>
)

/* ---------- Formerna ---------- */

const Former2d: LessonVisual = ({ step }) => {
  const lit = (i: number): number => (step === i + 1 ? 1 : step === 0 ? 1 : 0.35)
  return (
    <g>
      <g style={{ opacity: lit(0) }} className="ls">
        <path d="M50 70 L84 130 L16 130 Z" fill={CORAL_SOFT} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
        {[[50, 70], [84, 130], [16, 130]].map(([x, y], i) => (
          <g key={i} className="ls" style={fade(step === 1, i * 700)}>
            <circle cx={x} cy={y} r={6} fill={CORAL} /><text x={x + (i === 2 ? -10 : 10)} y={y - 8} fontSize={13} fontWeight={900} fill={CORAL} textAnchor="middle">{i + 1}</text>
          </g>
        ))}
      </g>
      <g style={{ opacity: lit(1) }} className="ls">
        <rect x={102} y={74} width={56} height={56} fill={PRIMARY_SOFT} stroke={INK} strokeWidth={3} />
        {[[102, 74], [158, 74], [158, 130], [102, 130]].map(([x, y], i) => <circle key={i} className="ls" cx={x} cy={y} r={6} fill={PRIMARY} style={fade(step === 2, i * 500)} />)}
      </g>
      <g style={{ opacity: lit(2) }} className="ls">
        <rect x={176} y={86} width={78} height={44} fill={SUN_SOFT} stroke={INK} strokeWidth={3} />
        <line className="ls" x1={176} x2={254} y1={86} y2={86} stroke={CORAL} strokeWidth={5} style={fade(step === 3)} />
        <line className="ls" x1={176} x2={254} y1={130} y2={130} stroke={CORAL} strokeWidth={5} style={fade(step === 3)} />
      </g>
      <g style={{ opacity: lit(3) }} className="ls">
        <circle cx={288} cy={102} r={26} fill={'#CFE8DA'} stroke={INK} strokeWidth={3} />
      </g>
      <Caption x={160} y={176} size={18} visible={step === 1} color={CORAL}>triangel: 3 hörn</Caption>
      <Caption x={160} y={176} size={18} visible={step === 2} color={PRIMARY}>kvadrat: 4 hörn, lika sidor</Caption>
      <Caption x={160} y={176} size={18} visible={step === 3} color={CORAL}>rektangel: 4 hörn, två långa sidor</Caption>
      <Caption x={160} y={176} size={18} visible={step >= 4} color={MINT}>cirkel: inga hörn</Caption>
    </g>
  )
}

/* ---------- Tioramen: tiokamrater, plus och minus 0–10 ---------- */

interface FrameStep { blue: number; coral?: number; crossed?: number[]; caption?: string; captionColor?: string }

function FrameLesson({ step, steps }: { step: number; steps: FrameStep[] }) {
  const s = steps[Math.min(step, steps.length - 1)]
  return (
    <g>
      <TenFrame x={75} y={54} cells={fill(s.blue, PRIMARY, s.coral ?? 0)} crossed={s.crossed} />
      <Caption x={160} y={168} size={22} visible={!!s.caption} color={s.captionColor ?? INK}>{s.caption ?? ''}</Caption>
    </g>
  )
}

const Talkamrater: LessonVisual = ({ step }) => <FrameLesson step={step} steps={[
  { blue: 0, caption: '? + ? = 10' }, { blue: 7, caption: '7 och …?' }, { blue: 7, coral: 3, caption: '7 + 3 = 10', captionColor: MINT },
  { blue: 6, coral: 4, caption: '6 + 4 = 10', captionColor: MINT }, { blue: 5, coral: 5, caption: '5+5 · 8+2 · 9+1', captionColor: MINT },
]} />

const Addition10: LessonVisual = ({ step }) => <FrameLesson step={step} steps={[
  { blue: 0, caption: '4 + 3' }, { blue: 4, caption: '4 …' }, { blue: 4, coral: 3, caption: '5, 6, 7', captionColor: CORAL },
  { blue: 4, coral: 3, caption: '4 + 3 = 7', captionColor: MINT }, { blue: 3, coral: 4, caption: '3 + 4 = 7', captionColor: MINT },
]} />

const Subtraktion10: LessonVisual = ({ step }) => <FrameLesson step={step} steps={[
  { blue: 0, caption: '8 − 3' }, { blue: 8, caption: '8' }, { blue: 8, crossed: [5, 6, 7], caption: '7, 6, 5', captionColor: CORAL },
  { blue: 8, crossed: [5, 6, 7], caption: '8 − 3 = 5', captionColor: MINT }, { blue: 5, coral: 3, caption: '5 + 3 = 8', captionColor: MINT },
]} />

const AddSub10: LessonVisual = ({ step }) => <FrameLesson step={step} steps={[
  { blue: 6, coral: 4, caption: '6 · 4 · 10' }, { blue: 6, coral: 4, caption: '6 + 4 = 10', captionColor: MINT },
  { blue: 6, coral: 4, crossed: [6, 7, 8, 9], caption: '10 − 4 = 6', captionColor: CORAL },
  { blue: 6, coral: 4, caption: '+ eller − ?' }, { blue: 6, coral: 4, caption: '+ fler · − färre', captionColor: PRIMARY },
]} />

/* ---------- Två tioramar: plus och minus 0–20 ---------- */

interface TwoStep { ones: number; coral?: number; crossed?: number[]; caption?: string; sub?: string; color?: string }

function TwoFrameLesson({ step, steps }: { step: number; steps: TwoStep[] }) {
  const s = steps[Math.min(step, steps.length - 1)]
  return (
    <g>
      <TenFrame x={14} y={58} cell={28} cells={fill(10, PRIMARY)} />
      <TenFrame x={166} y={58} cell={28} cells={fill(s.ones, SUN, s.coral ?? 0)} crossed={s.crossed} />
      <text x={84} y={48} textAnchor="middle" fontSize={13} fontWeight={800} fill={MUTED}>en hel tia</text>
      <Caption x={160} y={30} size={20} visible={!!s.caption} color={s.color ?? INK}>{s.caption ?? ''}</Caption>
      <Caption x={160} y={150} size={18} visible={!!s.sub} color={MINT}>{s.sub ?? ''}</Caption>
    </g>
  )
}

const Addition20: LessonVisual = ({ step }) => <TwoFrameLesson step={step} steps={[
  { ones: 3, caption: '13 + 4' }, { ones: 3, coral: 4, caption: '3 + 4 = 7', color: CORAL },
  { ones: 3, coral: 4, caption: '13 + 4 = 17', color: MINT }, { ones: 3, coral: 4, caption: '3 + 4 = 7', sub: '13 + 4 = 17' },
]} />

const Subtraktion20: LessonVisual = ({ step }) => <TwoFrameLesson step={step} steps={[
  { ones: 7, caption: '17 − 5' }, { ones: 7, crossed: [2, 3, 4, 5, 6], caption: '7 − 5 = 2', color: CORAL },
  { ones: 7, crossed: [2, 3, 4, 5, 6], caption: '17 − 5 = 12', color: MINT }, { ones: 7, crossed: [2, 3, 4, 5, 6], caption: '7 − 5 = 2', sub: '17 − 5 = 12' },
]} />

const AddSub20: LessonVisual = ({ step }) => <TwoFrameLesson step={step} steps={[
  { ones: 2, caption: '+ eller − ?' }, { ones: 2, coral: 5, caption: '12 + 5 = 17', color: MINT },
  { ones: 7, crossed: [2, 3, 4, 5, 6], caption: '17 − 5 = 12', color: CORAL }, { ones: 2, coral: 5, caption: '12 + 5 = 17', sub: '17 − 5 = 12' },
]} />

/* ---------- Talföljder ---------- */

const TF = lineX(0, 12)
const TF2 = lineX(0, 50)

const Talfoljder: LessonVisual = ({ step }) => (
  <g>
    <g className="ls" style={fade(step <= 2)}>
      <NumLine min={0} max={12} y={130} />
      {[2, 4, 6, 8].map((n) => <circle key={n} cx={TF(n)} cy={130} r={8} fill={PRIMARY} />)}
      {[2, 4, 6].map((n) => <Arc key={n} x1={TF(n)} x2={TF(n + 2)} y={124} h={28} color={CORAL} label="+2" visible={step >= 1} />)}
      <Arc x1={TF(8)} x2={TF(10)} y={124} h={28} color={MINT} label="+2" visible={step >= 2} />
      <circle className="ls" cx={TF(10)} cy={130} r={9} fill={MINT} style={fade(step >= 2)} />
      <Caption x={160} y={48} size={20} visible={step <= 2} color={INK}>2, 4, 6, 8, {step >= 2 ? '10' : '?'}</Caption>
    </g>
    <g className="ls" style={fade(step >= 3)}>
      <NumLine min={0} max={50} y={130} every={10} labelEvery={10} />
      {[3, 13, 23, 33].map((n) => <circle key={n} cx={TF2(n)} cy={130} r={7} fill={PRIMARY} />)}
      {[3, 13, 23, 33].map((n) => <Arc key={n} x1={TF2(n)} x2={TF2(n + 10)} y={124} h={26} color={n === 33 ? MINT : CORAL} label="+10" />)}
      <circle cx={TF2(43)} cy={130} r={8} fill={MINT} />
      <Caption x={160} y={48} size={20} color={INK}>3, 13, 23, 33, 43</Caption>
    </g>
  </g>
)

/* ---------- Kroppar ---------- */

const Former3d: LessonVisual = ({ step }) => {
  const lit = (i: number): number => (step === 0 || step === i + 1 ? 1 : 0.3)
  return (
    <g>
      <g className="ls" style={{ opacity: lit(0) }}>
        <circle cx={48} cy={100} r={30} fill={CORAL} stroke={INK} strokeWidth={2.5} />
        <ellipse cx={38} cy={88} rx={9} ry={6} fill="#FFFFFF" opacity={0.6} />
      </g>
      <g className="ls" style={{ opacity: lit(1) }}>
        <path d="M100 82 L130 70 L160 82 L130 94 Z" fill={'#C9CDF2'} stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
        <path d="M100 82 L130 94 L130 130 L100 118 Z" fill={PRIMARY_SOFT} stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
        <path d="M160 82 L130 94 L130 130 L160 118 Z" fill={'#A9B0E8'} stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
      </g>
      <g className="ls" style={{ opacity: lit(2) }}>
        <path d="M184 76 L184 124 A26 9 0 0 0 236 124 L236 76" fill={SUN_SOFT} stroke={INK} strokeWidth={2.5} />
        <ellipse cx={210} cy={76} rx={26} ry={9} fill={SUN} stroke={INK} strokeWidth={2.5} />
      </g>
      <g className="ls" style={{ opacity: lit(3) }}>
        <path d="M282 64 L258 124 A24 8 0 0 0 306 124 Z" fill={'#CFE8DA'} stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
        <ellipse cx={282} cy={124} rx={24} ry={8} fill={'#B5DCC5'} stroke={INK} strokeWidth={2.5} />
      </g>
      {[['klot', 48], ['kub', 130], ['cylinder', 210], ['kon', 282]].map(([n, x], i) => (
        <text key={String(n)} className="ls" x={Number(x)} y={160} textAnchor="middle" fontSize={15} fontWeight={900} fill={INK} style={fade(step === 0 || step === i + 1)}>{n}</text>
      ))}
      <Caption x={160} y={30} size={16} visible={step === 2} color={PRIMARY}>6 sidoytor</Caption>
    </g>
  )
}

/* ---------- Sortera och räkna ---------- */

const ITEMS: { kind: 0 | 1 | 2; x: number; y: number }[] = [
  { kind: 0, x: 40, y: 60 }, { kind: 1, x: 90, y: 110 }, { kind: 2, x: 140, y: 70 }, { kind: 0, x: 190, y: 120 }, { kind: 2, x: 240, y: 60 },
  { kind: 0, x: 280, y: 110 }, { kind: 1, x: 60, y: 150 }, { kind: 2, x: 170, y: 160 }, { kind: 0, x: 230, y: 165 },
]
const KIND_COLOR = [CORAL, '#8BC34A', '#9C6B3E']
const KIND_NAME = ['äpplen', 'päron', 'kottar']

const Sortera: LessonVisual = ({ step }) => {
  const sorted = step >= 1
  const seen = [0, 0, 0]
  return (
    <g>
      {ITEMS.map((it, i) => {
        const k = seen[it.kind]++
        const [x, y] = sorted ? [30 + k * 24, 54 + it.kind * 46] : [it.x, it.y]
        return <Ball key={i} x={x} y={y} r={10} fill={KIND_COLOR[it.kind]} ring={step === 3 && it.kind === 0} />
      })}
      <g className="ls" style={fade(step >= 2)}>
        {KIND_NAME.map((n, r) => (
          <g key={n}>
            <rect x={190} y={36 + r * 46} width={110} height={36} rx={8} fill={step === 3 && r === 0 ? SUN_SOFT : PAPER} stroke={LINE} strokeWidth={2} />
            <text x={200} y={60 + r * 46} fontSize={15} fontWeight={800} fill={INK}>{n}</text>
            <text x={288} y={60 + r * 46} textAnchor="end" fontSize={18} fontWeight={900} fill={PRIMARY}>{[4, 2, 3][r]}</text>
          </g>
        ))}
      </g>
      <Caption x={160} y={190} size={17} visible={step >= 4} color={MINT}>4 + 2 + 3 = 9 saker</Caption>
    </g>
  )
}

/* ---------- Tiotal och ental ---------- */

const Positionssystem: LessonVisual = ({ step }) => {
  const swap = step >= 4
  return (
    <g>
      <g className="ls" style={fade(step >= 1)}>
        <Base10 x={20} y={70} tens={swap ? 7 : 4} ones={step >= 2 ? (swap ? 4 : 7) : 0} delayStep={step === 1 || step === 2 ? 350 : 0} />
      </g>
      <text x={262} y={124} textAnchor="middle" fontSize={56} fontWeight={900}>
        <tspan fill={PRIMARY}>{swap ? 7 : 4}</tspan><tspan fill={'#C9922A'}>{swap ? 4 : 7}</tspan>
      </text>
      <Caption x={244} y={150} size={13} visible={step >= 3} color={PRIMARY}>tiotal</Caption>
      <Caption x={284} y={150} size={13} visible={step >= 3} color={'#C9922A'}>ental</Caption>
      <Caption x={160} y={36} size={16} visible={step === 1} color={PRIMARY}>10, 20, 30, 40</Caption>
      <Caption x={160} y={36} size={16} visible={step === 2} color={'#C9922A'}>41, 42 … 47</Caption>
      <Caption x={160} y={36} size={16} visible={swap} color={CORAL}>74 = 7 tiotal och 4 ental</Caption>
    </g>
  )
}

/* ---------- Plus och minus 0–100 ---------- */

const AddSub100: LessonVisual = ({ step }) => (
  <g>
    <rect className="ls" x={24} y={46} width={110} height={84} rx={8} fill={SUN_SOFT} style={fade(step === 1)} />
    <Base10 x={34} y={54} tens={3} ones={0} />
    <g transform="translate(84 0)"><Base10 x={0} y={54} tens={0} ones={4} /></g>
    <Base10 x={186} y={54} tens={2} ones={5} tenColor={CORAL} />
    <text x={160} y={100} textAnchor="middle" fontSize={26} fontWeight={900} fill={INK}>+</text>
    <Caption x={160} y={160} size={18} visible={step === 0} color={INK}>34 + 25</Caption>
    <Caption x={160} y={160} size={18} visible={step === 1} color={PRIMARY}>30 + 20 = 50</Caption>
    <Caption x={160} y={160} size={18} visible={step === 2} color={'#C9922A'}>4 + 5 = 9</Caption>
    <Caption x={160} y={160} size={20} visible={step === 3} color={MINT}>50 + 9 = 59</Caption>
    <Caption x={160} y={160} size={18} visible={step >= 4} color={CORAL}>59 − 25 = 34</Caption>
  </g>
)

/* ---------- Mäta längd ---------- */

const CMX = (cm: number): number => 30 + cm * 26

const MatningLangd: LessonVisual = ({ step }) => {
  const shift = useTween(step >= 1 ? 0 : -18, 1200)
  const meter = step >= 3
  return (
    <g>
      <g className="ls" style={fade(!meter)}>
        <rect x={CMX(0) - 8} y={120} width={10 * 26 + 16} height={36} rx={4} fill={SUN_SOFT} stroke={INK} strokeWidth={2} />
        {Array.from({ length: 11 }, (_, i) => (
          <g key={i}>
            <line x1={CMX(i)} x2={CMX(i)} y1={120} y2={132} stroke={INK} strokeWidth={2} />
            <text x={CMX(i)} y={148} textAnchor="middle" fontSize={11} fontWeight={800} fill={INK}>{i}</text>
          </g>
        ))}
        <g style={{ transform: `translate(${shift}px, 0)` }}>
          <rect x={CMX(0)} y={92} width={8 * 26 - 14} height={16} fill={PRIMARY} stroke={INK} strokeWidth={2} />
          <path d={`M${CMX(8) - 14} 92 L${CMX(8)} 100 L${CMX(8) - 14} 108 Z`} fill={SUN} stroke={INK} strokeWidth={2} strokeLinejoin="round" />
        </g>
        <circle className="ls" cx={CMX(0)} cy={100} r={12} fill="none" stroke={MINT} strokeWidth={3} style={fade(step === 1)} />
        <line className="ls" x1={CMX(8)} x2={CMX(8)} y1={86} y2={128} stroke={MINT} strokeWidth={3} strokeDasharray="5 4" style={fade(step === 2)} />
        <Caption x={CMX(8)} y={76} size={18} visible={step === 2} color={MINT}>8 cm</Caption>
        <Caption x={160} y={50} size={16} visible={step === 1} color={MINT}>börja vid nollan</Caption>
      </g>
      <g className="ls" style={fade(meter)}>
        {[0, 1, 2].map((i) => (
          <g key={i} className="ls" style={fade(step >= 4 || i === 0, step >= 4 ? i * 500 : 0)}>
            <rect x={20 + i * 96} y={100} width={92} height={20} rx={4} fill={i % 2 ? CORAL : PRIMARY} stroke={INK} strokeWidth={2} />
            <text x={66 + i * 96} y={140} textAnchor="middle" fontSize={13} fontWeight={900} fill={INK}>1 m</text>
          </g>
        ))}
        <Caption x={160} y={60} size={18} visible={step === 3} color={PRIMARY}>1 m = 100 cm</Caption>
        <Caption x={160} y={60} size={18} visible={step >= 4} color={MINT}>3 m = 300 cm</Caption>
      </g>
    </g>
  )
}

/* ---------- Stapeldiagram ---------- */

const VOTES = [{ n: 'katt', v: 6, c: CORAL }, { n: 'hund', v: 4, c: PRIMARY }, { n: 'häst', v: 3, c: SUN }]

const Stapeldiagram: LessonVisual = ({ step }) => {
  const oy = 168
  const Y = (v: number): number => oy - v * 16
  const bx = (i: number): number => 90 + i * 70
  return (
    <g>
      {[2, 4, 6, 8].map((v) => (
        <g key={v}>
          <line x1={52} x2={300} y1={Y(v)} y2={Y(v)} stroke={LINE} strokeWidth={1} />
          <text x={44} y={Y(v) + 4} textAnchor="end" fontSize={12} fontWeight={800} fill={MUTED}>{v}</text>
        </g>
      ))}
      <line x1={52} x2={300} y1={oy} y2={oy} stroke={INK} strokeWidth={3} />
      <line x1={52} x2={52} y1={oy} y2={Y(8.6)} stroke={INK} strokeWidth={3} />
      {VOTES.map((b, i) => (
        <g key={b.n}>
          <rect x={bx(i) - 20} y={Y(b.v)} width={40} height={b.v * 16} fill={b.c} stroke={INK} strokeWidth={2} opacity={step === 3 && i === 2 ? 0.4 : 1} />
          <text x={bx(i)} y={oy + 17} textAnchor="middle" fontSize={13} fontWeight={800} fill={INK}>{b.n}</text>
        </g>
      ))}
      <line className="ls" x1={52} x2={bx(0) - 20} y1={Y(6)} y2={Y(6)} stroke={CORAL} strokeWidth={3} strokeDasharray="6 4" style={fade(step >= 2)} />
      <line className="ls" x1={52} x2={bx(1) - 20} y1={Y(4)} y2={Y(4)} stroke={PRIMARY} strokeWidth={3} strokeDasharray="6 4" style={fade(step === 3)} />
      <line className="ls" x1={bx(1) + 26} x2={bx(1) + 26} y1={Y(6)} y2={Y(4)} stroke={MINT} strokeWidth={4} style={fade(step === 3)} />
      <Caption x={250} y={32} size={16} visible={step === 2} color={CORAL}>katt: 6</Caption>
      <Caption x={250} y={32} size={16} visible={step === 3} color={MINT}>6 − 4 = 2 fler</Caption>
      <Caption x={250} y={32} size={16} visible={step >= 4} color={MINT}>6 + 4 + 3 = 13</Caption>
    </g>
  )
}

/* ---------- Dubbelt och hälften ---------- */

const Dubbelt: LessonVisual = ({ step }) => {
  const split = step >= 2 && step <= 3
  const tens = step >= 4
  return (
    <g>
      <g className="ls" style={fade(!tens)}>
        {Array.from({ length: 8 }, (_, i) => {
          const left = i < 4
          const x = split ? (left ? 50 + i * 26 : 190 + (i - 4) * 26) : 70 + i * 26
          return <Ball key={i} x={x} y={100} fill={left ? PRIMARY : CORAL} visible={step >= 1 || left} delay={step === 1 && !left ? (i - 4) * 300 : 0} />
        })}
      </g>
      <g className="ls" style={fade(tens)}>
        <Base10 x={40} y={64} tens={4} ones={0} />
        <Base10 x={200} y={64} tens={4} ones={0} tenColor={CORAL} />
      </g>
      <Caption x={160} y={40} size={20} visible={step === 0} color={INK}>4</Caption>
      <Caption x={160} y={40} size={20} visible={step === 1} color={MINT}>dubbelt så mycket som 4 är 8</Caption>
      <Caption x={160} y={40} size={20} visible={step === 2} color={INK}>8 i två lika delar</Caption>
      <Caption x={160} y={40} size={20} visible={step === 3} color={MINT}>hälften av 8 är 4</Caption>
      <Caption x={160} y={40} size={20} visible={tens} color={MINT}>hälften av 80 är 40</Caption>
    </g>
  )
}

/* ---------- Är det rimligt? ---------- */

const RL = lineX(0, 100)

const Rimlighet: LessonVisual = ({ step }) => {
  const a = useTween(step >= 1 ? 50 : 47, 1000)
  return (
    <g>
      <NumLine min={0} max={100} y={130} every={10} labelEvery={10} />
      <circle className="ls" cx={RL(a)} cy={130} r={8} fill={PRIMARY} style={fade(step >= 1)} />
      <Caption x={RL(38)} y={110} size={14} visible={step >= 1 && step < 4} color={PRIMARY}>47 ≈ 50</Caption>
      <Arc x1={RL(50)} x2={RL(75)} y={124} h={52} color={MINT} label="+25" visible={step >= 2 && step < 4} />
      <circle className="ls" cx={RL(75)} cy={130} r={8} fill={MINT} style={fade(step >= 2)} />
      <Caption x={160} y={40} size={18} visible={step === 0} color={INK}>47 + 25 ≈ ?</Caption>
      <Caption x={160} y={40} size={18} visible={step === 2} color={MINT}>runt 70–75</Caption>
      <Caption x={160} y={40} size={22} visible={step === 3} color={CORAL}>612? ✗ alldeles för stort</Caption>
      <circle className="ls" cx={RL(72)} cy={130} r={9} fill={MINT} stroke={INK} strokeWidth={2} style={fade(step >= 4)} />
      <Caption x={160} y={40} size={20} visible={step >= 4} color={MINT}>72 ✓ nära gissningen</Caption>
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
  'sannolikhet-intro': Sannolikhet,
  'skala': Skala,
  'grafer': Grafer,
  'decimal-rakna': DecimalRakna,
  'mult-div-stora': MultDivStora,
  'add-sub-0-1000': AddSub1000,
  'stora-tal': StoraTal,
  'tabeller-alla': TabellerAlla,
  'mult-div-samband': MultDivSamband,
  'skriftlig-mult': SkriftligMult,
  'kort-division': KortDivision,
  'oppna-utsagor-100': OppnaUtsagor,
  'monster-regler': MonsterRegler,
  'symmetri': Symmetri,
  'diagram-lasa': DiagramLasa,
  'proportionalitet': Proportionalitet,
  'kontroll-motsatt': KontrollMotsatt,
  'overslagsrakning': Overslag,
  'antal-0-10': Antal,
  'talrad-0-20': Talrad20,
  'dela-upp-tal': DelaUpp,
  'monster-enkla': MonsterEnkla,
  'former-2d': Former2d,
  'talkamrater-10': Talkamrater,
  'addition-0-10': Addition10,
  'subtraktion-0-10': Subtraktion10,
  'add-sub-0-10': AddSub10,
  'addition-0-20': Addition20,
  'subtraktion-0-20': Subtraktion20,
  'add-sub-0-20': AddSub20,
  'talfoljder-1': Talfoljder,
  'former-3d': Former3d,
  'sortera-tabeller': Sortera,
  'positionssystem-100': Positionssystem,
  'add-sub-0-100': AddSub100,
  'matning-langd': MatningLangd,
  'stapeldiagram': Stapeldiagram,
  'dubbelt-halften': Dubbelt,
  'rimlighet': Rimlighet,
}
