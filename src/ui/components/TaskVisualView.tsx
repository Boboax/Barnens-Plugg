import type { TaskVisual } from '../../domain/types'
import { isObjektIcon, ObjektIcon } from './Icon'

/* ============================================================
   Visuellt stöd enligt CRA-principen: tiobasblock, tallinje,
   grupper, bråkfigurer, klocka och rektangel.
   ============================================================ */

export function TaskVisualView({ visual }: { visual: TaskVisual }) {
  if (visual.kind === 'ingen') return null
  const inner = (() => {
    switch (visual.kind) {
      case 'tiobas': return <Tiobas groups={visual.groups} op={visual.op} />
      case 'tallinje': return <Tallinje min={visual.min} max={visual.max} marks={visual.marks} highlight={visual.highlight} />
      case 'grupper': return <Grupper count={visual.groupCount} per={visual.itemsPerGroup} emoji={visual.emoji} />
      case 'foljd': return <Foljd items={visual.items} />
      case 'brak': return <Brak parts={visual.parts} filled={visual.filled} secondary={visual.secondary} />
      case 'klocka': return <Klocka hours={visual.hours} minutes={visual.minutes} />
      case 'form': return <Form shape={visual.shape} />
      case 'rektangel': return <Rektangel w={visual.w} h={visual.h} unit={visual.unit} />
      case 'stapel': return <Stapel categories={visual.categories} yStep={visual.yStep} pictogram={visual.pictogram} showValues={visual.showValues} />
      case 'linje': return <Linje points={visual.points} unit={visual.unit} />
      case 'koordinat': return <Koordinat min={visual.min} max={visual.max} points={visual.points} lines={visual.lines} xLabel={visual.xLabel} yLabel={visual.yLabel} />
    }
  })()
  // Ljus "kortyta" runt bilden med ÅTERSTÄLLDA färgvariabler: annars ärver
  // visualen skärmens --ink/--card (som t.ex. i bosstriden är LJUSA) och då
  // blir mörka streck/siffror osynliga (t.ex. klockans siffror och timvisare).
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', maxWidth: '100%',
      background: 'linear-gradient(180deg, #FBF4E2, #F1E6CB)', border: '2px solid #C9B489',
      borderRadius: 16, padding: '10px 14px', color: '#2E3350',
      boxShadow: '0 2px 6px rgba(60,44,20,.18)',
      ...({ '--ink': '#2E3350', '--muted': '#6E6656', '--card': '#FBF4E2', '--line': '#C9B489' } as React.CSSProperties),
    }}>{inner}</div>
  )
}

function Tiobas({ groups, op = '+' }: { groups: { tens: number; ones: number; hundreds?: number }[]; op?: '+' | '−' }) {
  return (
    <div style={{ display: 'flex', gap: 22, justifyContent: 'center', alignItems: 'flex-end', flexWrap: 'wrap' }}>
      {groups.map((g, gi) => {
        // Vid subtraktion ritas den andra gruppen (det som tas bort) överstruken
        // och nedtonad, så bilden matchar "a − b" och inte ser ut som addition.
        const removed = op === '−' && gi > 0
        return (
          <div key={gi} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            {gi > 0 && <span style={{ fontSize: 24, fontWeight: 900, color: 'var(--muted)', alignSelf: 'center' }}>{op}</span>}
            <div style={{ position: 'relative', display: 'flex', gap: 8, alignItems: 'flex-end', opacity: removed ? 0.5 : 1 }}>
              {Array.from({ length: g.hundreds ?? 0 }).map((_, i) => (
                <div key={`h${i}`} style={{
                  width: 34, height: 34, borderRadius: 5, background: 'var(--sun)',
                  backgroundImage: 'repeating-linear-gradient(0deg, transparent 0 6px, rgba(255,255,255,.5) 6px 7px), repeating-linear-gradient(90deg, transparent 0 6px, rgba(255,255,255,.5) 6px 7px)',
                }} />
              ))}
              <div style={{ display: 'flex', gap: 4 }}>
                {Array.from({ length: g.tens }).map((_, i) => (
                  <div key={`t${i}`} style={{
                    width: 13, height: 78, borderRadius: 4, background: 'var(--primary)',
                    backgroundImage: 'repeating-linear-gradient(180deg, transparent 0 6.8px, rgba(255,255,255,.5) 6.8px 7.8px)',
                  }} />
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 13px)', gap: 4 }}>
                {Array.from({ length: g.ones }).map((_, i) => (
                  <div key={`o${i}`} style={{ width: 13, height: 13, borderRadius: 4, background: 'var(--coral)' }} />
                ))}
              </div>
              {/* Överstrykning: tydligt "borttaget" vid subtraktion. */}
              {removed && (
                <span aria-hidden="true" style={{
                  position: 'absolute', left: -5, right: -5, top: '50%',
                  height: 4, borderRadius: 2, background: 'var(--coral)',
                  transform: 'translateY(-50%) rotate(-10deg)', boxShadow: '0 0 0 1.5px rgba(255,255,255,.7)',
                }} />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Tallinje({ min, max, marks = [], highlight }: { min: number; max: number; marks?: number[]; highlight?: number }) {
  const width = 480
  const pad = 24
  const x = (n: number): number => pad + ((n - min) / (max - min)) * (width - pad * 2)
  const span = max - min
  const step = span <= 20 ? 1 : span <= 50 ? 5 : span <= 200 ? 10 : 100
  const ticks: number[] = []
  for (let n = Math.ceil(min / step) * step; n <= max; n += step) ticks.push(n)
  return (
    <svg viewBox={`0 0 ${width} 64`} style={{ width: 460, maxWidth: '100%' }} aria-hidden="true">
      <line x1={pad - 8} y1={32} x2={width - pad + 8} y2={32} stroke="var(--line)" strokeWidth={4} strokeLinecap="round" />
      {ticks.map((n) => (
        <g key={n}>
          <line x1={x(n)} y1={26} x2={x(n)} y2={38} stroke="var(--muted)" strokeWidth={n % (step * 5) === 0 || span <= 20 ? 2.5 : 1.5} />
          {(span <= 20 || n % (step * 2) === 0) && (
            <text x={x(n)} y={56} fontSize={12} fontWeight={700} fill="var(--muted)" textAnchor="middle">{n}</text>
          )}
        </g>
      ))}
      {marks.map((n) => (
        <circle key={`m${n}`} cx={x(n)} cy={32} r={7} fill="var(--sun)" stroke="#fff" strokeWidth={2} />
      ))}
      {highlight !== undefined && (
        <circle cx={x(highlight)} cy={32} r={8} fill="var(--coral)" stroke="#fff" strokeWidth={2.5} />
      )}
    </svg>
  )
}

/* Mönsterföljd: raden av figurer barnet ska fortsätta, med en frågeruta sist. */
function Foljd({ items }: { items: string[] }) {
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
      {items.map((key, i) => (
        isObjektIcon(key)
          ? <ObjektIcon key={i} name={key} size={40} />
          : <span key={i} style={{ fontSize: 34 }}>{key}</span>
      ))}
      <span style={{
        width: 44, height: 44, borderRadius: 12, border: '3px dashed var(--sun)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 26, fontWeight: 900, color: 'var(--sun-ink)',
      }}>?</span>
    </div>
  )
}

function Grupper({ count, per, emoji }: { count: number; per: number; emoji: string }) {
  const items = Array.from({ length: per })
  return (
    <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
      {Array.from({ length: count }).map((_, g) => (
        <div key={g} style={{
          display: 'grid', gridTemplateColumns: `repeat(${Math.min(per, 5)}, auto)`, gap: 3,
          background: 'var(--card)', border: '2px dashed var(--line)', borderRadius: 12, padding: '8px 10px',
        }}>
          {items.map((_, i) => (
            isObjektIcon(emoji)
              ? <ObjektIcon key={i} name={emoji} size={24} />
              : <span key={i} style={{ fontSize: 20 }}>{emoji}</span>
          ))}
        </div>
      ))}
    </div>
  )
}

function BrakCirkel({ parts, filled }: { parts: number; filled: number }) {
  const r = 44
  const cx = 50, cy = 50
  const slices = Array.from({ length: parts }).map((_, i) => {
    const a0 = (i / parts) * Math.PI * 2 - Math.PI / 2
    const a1 = ((i + 1) / parts) * Math.PI * 2 - Math.PI / 2
    const large = 1 / parts > 0.5 ? 1 : 0
    return {
      d: `M ${cx} ${cy} L ${cx + r * Math.cos(a0)} ${cy + r * Math.sin(a0)} A ${r} ${r} 0 ${large} 1 ${cx + r * Math.cos(a1)} ${cy + r * Math.sin(a1)} Z`,
      isFilled: i < filled,
    }
  })
  return (
    <svg viewBox="0 0 100 100" width={110} height={110} aria-hidden="true">
      {slices.map((s, i) => (
        <path key={i} d={s.d} fill={s.isFilled ? 'var(--primary)' : 'var(--card)'} stroke="var(--ink)" strokeWidth={1.6} />
      ))}
    </svg>
  )
}

function Brak({ parts, filled, secondary }: { parts: number; filled: number; secondary?: { parts: number; filled: number } }) {
  return (
    <div style={{ display: 'flex', gap: 28, justifyContent: 'center', alignItems: 'center' }}>
      <BrakCirkel parts={parts} filled={filled} />
      {secondary && (
        <>
          <span style={{ fontSize: 20, fontWeight: 900, color: 'var(--muted)' }}>vs</span>
          <BrakCirkel parts={secondary.parts} filled={secondary.filled} />
        </>
      )}
    </div>
  )
}

/* Analog klocka. FASTA färger (inte var(--ink)/var(--card)) så siffror och
   visare alltid syns, oavsett skärmens färgtema (bosstriden gör --ink ljus).
   Kort tjock mörk visare = timme; lång smal röd visare = minut — tydligt
   åtskilda så barnet förstår vilken som är vilken. */
function Klocka({ hours, minutes }: { hours: number; minutes: number }) {
  const FACE = '#FCFBF6', RIM = '#2E3350', HOUR = '#2E3350', MIN = '#E2574C'
  const hourAngle = ((hours % 12) + minutes / 60) * 30 - 90
  const minAngle = minutes * 6 - 90
  const hx = 60 + 30 * Math.cos((hourAngle * Math.PI) / 180)
  const hy = 60 + 30 * Math.sin((hourAngle * Math.PI) / 180)
  const mx = 60 + 46 * Math.cos((minAngle * Math.PI) / 180)
  const my = 60 + 46 * Math.sin((minAngle * Math.PI) / 180)
  return (
    <svg viewBox="0 0 120 120" width={158} height={158} aria-hidden="true">
      <circle cx={60} cy={60} r={54} fill={FACE} stroke={RIM} strokeWidth={4} />
      {/* Minutmarkeringar runt kanten. */}
      {Array.from({ length: 60 }).map((_, i) => {
        const a = (i * 6 - 90) * (Math.PI / 180)
        const big = i % 5 === 0
        return <line key={`t${i}`}
          x1={60 + 50 * Math.cos(a)} y1={60 + 50 * Math.sin(a)}
          x2={60 + (big ? 44 : 47) * Math.cos(a)} y2={60 + (big ? 44 : 47) * Math.sin(a)}
          stroke={RIM} strokeWidth={big ? 1.8 : 0.8} opacity={big ? 1 : 0.5} />
      })}
      {/* Timsiffror 1–12. */}
      {Array.from({ length: 12 }).map((_, i) => {
        const a = ((i + 1) * 30 - 90) * (Math.PI / 180)
        return (
          <text key={i} x={60 + 38 * Math.cos(a)} y={60 + 38 * Math.sin(a) + 4}
            fontSize={12} fontWeight={900} textAnchor="middle" fill={RIM}>
            {i + 1}
          </text>
        )
      })}
      <line x1={60} y1={60} x2={hx} y2={hy} stroke={HOUR} strokeWidth={6} strokeLinecap="round" />
      <line x1={60} y1={60} x2={mx} y2={my} stroke={MIN} strokeWidth={3.5} strokeLinecap="round" />
      <circle cx={60} cy={60} r={4.5} fill={HOUR} />
    </svg>
  )
}

/** Stora, tydliga geometriska former (inte emojis — de blir små och otydliga). */
function Form({ shape }: { shape: 'cirkel' | 'triangel' | 'kvadrat' | 'rektangel' | 'femhorning' | 'sexhorning' }) {
  const fill = 'color-mix(in srgb, var(--primary) 22%, #fff)'
  const stroke = 'var(--primary)'
  const polygon = (sides: number): string =>
    Array.from({ length: sides })
      .map((_, i) => {
        const a = (i / sides) * Math.PI * 2 - Math.PI / 2
        return `${80 + 62 * Math.cos(a)},${80 + 62 * Math.sin(a)}`
      })
      .join(' ')
  return (
    <svg viewBox="0 0 160 160" width={170} height={170} aria-hidden="true">
      {shape === 'cirkel' && <circle cx={80} cy={80} r={60} fill={fill} stroke={stroke} strokeWidth={5} />}
      {shape === 'kvadrat' && <rect x={24} y={24} width={112} height={112} fill={fill} stroke={stroke} strokeWidth={5} />}
      {shape === 'rektangel' && <rect x={12} y={44} width={136} height={72} fill={fill} stroke={stroke} strokeWidth={5} />}
      {shape === 'triangel' && <polygon points="80,18 148,138 12,138" fill={fill} stroke={stroke} strokeWidth={5} strokeLinejoin="round" />}
      {shape === 'femhorning' && <polygon points={polygon(5)} fill={fill} stroke={stroke} strokeWidth={5} strokeLinejoin="round" />}
      {shape === 'sexhorning' && <polygon points={polygon(6)} fill={fill} stroke={stroke} strokeWidth={5} strokeLinejoin="round" />}
    </svg>
  )
}

/* Diagramfärger: distinkta men betydelsen bärs ALLTID av etiketten under
   (färgblindhet — aldrig "den röda stapeln" i uppgiftstexten). */
const CHART_COLORS = ['var(--primary)', 'var(--coral)', 'var(--mint)', 'var(--sun)', '#9B7BD4', '#4FB0C6']
/** Snällt skalmax: minsta multipel av step som rymmer maxvärdet (aldrig 0). */
const niceMax = (maxV: number, step: number): number => Math.max(step, Math.ceil(maxV / step) * step)

/* Stapeldiagram ELLER piktogram (bildtabell). Höjden är EXAKT proportionell mot
   värdet; värdesiffran ritas bara när showValues (stöd på lägsta nivåerna) —
   annars försvinner själva avläsningsövningen. */
function Stapel({ categories, yStep = 1, pictogram = false, showValues = false }: {
  categories: { label: string; value: number; icon?: string }[]; yStep?: number; pictogram?: boolean; showValues?: boolean
}) {
  if (pictogram) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, padding: '2px 4px' }}>
        {categories.map((c, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 82, textAlign: 'right', fontWeight: 800, fontSize: 13, color: 'var(--ink)', flexShrink: 0 }}>{c.label}</span>
            <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              {Array.from({ length: c.value }).map((_, k) => (
                c.icon && isObjektIcon(c.icon)
                  ? <ObjektIcon key={k} name={c.icon} size={22} />
                  : <span key={k} style={{ width: 18, height: 18, borderRadius: 5, background: CHART_COLORS[i % CHART_COLORS.length] }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }
  const chartH = 150, barW = 40, gap = 26, padL = 32, padB = 40, padT = 18
  const maxTick = niceMax(Math.max(...categories.map((c) => c.value), 1), yStep)
  const w = padL + categories.length * (barW + gap) + 12
  const h = padT + chartH + padB
  const yOf = (v: number): number => padT + chartH - (v / maxTick) * chartH
  const ticks: number[] = []
  for (let t = 0; t <= maxTick; t += yStep) ticks.push(t)
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: Math.min(w * 1.9, 520), maxWidth: '100%' }} aria-hidden="true">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={padL} y1={yOf(t)} x2={w - 8} y2={yOf(t)} stroke="var(--line)" strokeWidth={1} opacity={0.55} />
          <text x={padL - 6} y={yOf(t) + 4} fontSize={11} fontWeight={700} fill="var(--muted)" textAnchor="end">{t}</text>
        </g>
      ))}
      <line x1={padL} y1={padT} x2={padL} y2={padT + chartH} stroke="var(--ink)" strokeWidth={2} />
      <line x1={padL} y1={padT + chartH} x2={w - 8} y2={padT + chartH} stroke="var(--ink)" strokeWidth={2} />
      {categories.map((c, i) => {
        const x = padL + 16 + i * (barW + gap)
        const bh = (c.value / maxTick) * chartH
        return (
          <g key={i}>
            <rect x={x} y={padT + chartH - bh} width={barW} height={bh} rx={4}
              fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="var(--ink)" strokeWidth={1.2} />
            {showValues && (
              <text x={x + barW / 2} y={padT + chartH - bh - 5} fontSize={12.5} fontWeight={800} fill="var(--ink)" textAnchor="middle">{c.value}</text>
            )}
            <text x={x + barW / 2} y={padT + chartH + 16} fontSize={11.5} fontWeight={800} fill="var(--ink)" textAnchor="middle">{c.label}</text>
          </g>
        )
      })}
    </svg>
  )
}

/* Linjediagram: kategorier jämnt fördelade på x, värde på y, punkter förbundna
   med en linje. Rutnät + siffror på y-axeln så barnet kan följa toppen ner. */
function Linje({ points, unit }: { points: { label: string; value: number }[]; unit?: string }) {
  const chartH = 140, colW = 72, padL = 34, padB = 38, padT = 18
  const maxV = Math.max(...points.map((p) => p.value), 1)
  const step = maxV <= 10 ? 2 : maxV <= 20 ? 5 : 10
  const maxTick = niceMax(maxV, step)
  const w = padL + points.length * colW + 10
  const h = padT + chartH + padB
  const xOf = (i: number): number => padL + colW * (i + 0.5)
  const yOf = (v: number): number => padT + chartH - (v / maxTick) * chartH
  const ticks: number[] = []
  for (let t = 0; t <= maxTick; t += step) ticks.push(t)
  const poly = points.map((p, i) => `${xOf(i)},${yOf(p.value)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: Math.min(w * 1.9, 520), maxWidth: '100%' }} aria-hidden="true">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={padL} y1={yOf(t)} x2={w - 8} y2={yOf(t)} stroke="var(--line)" strokeWidth={1} opacity={0.55} />
          <text x={padL - 6} y={yOf(t) + 4} fontSize={11} fontWeight={700} fill="var(--muted)" textAnchor="end">{t}</text>
        </g>
      ))}
      <line x1={padL} y1={padT} x2={padL} y2={padT + chartH} stroke="var(--ink)" strokeWidth={2} />
      <line x1={padL} y1={padT + chartH} x2={w - 8} y2={padT + chartH} stroke="var(--ink)" strokeWidth={2} />
      {unit && <text x={padL - 6} y={padT - 6} fontSize={10.5} fontWeight={700} fill="var(--muted)" textAnchor="end">{unit}</text>}
      <polyline points={poly} fill="none" stroke="var(--primary)" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={xOf(i)} cy={yOf(p.value)} r={5} fill="var(--coral)" stroke="#fff" strokeWidth={2} />
          <text x={xOf(i)} y={padT + chartH + 16} fontSize={11.5} fontWeight={800} fill="var(--ink)" textAnchor="middle">{p.label}</text>
        </g>
      ))}
    </svg>
  )
}

/* Klipp en (oändlig) linje till rutnätsrutan [min,max]² (Liang–Barsky). Så en
   graf kan ritas rakt genom hela rutnätet utan att spilla ut i etikettmarginalen. */
function clipToBox(x0: number, y0: number, x1: number, y1: number, min: number, max: number): [number, number, number, number] | null {
  const dx = x1 - x0, dy = y1 - y0
  const p = [-dx, dx, -dy, dy]
  const q = [x0 - min, max - x0, y0 - min, max - y0]
  let t0 = 0, t1 = 1
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) { if (q[i] < 0) return null }
    else {
      const r = q[i] / p[i]
      if (p[i] < 0) { if (r > t1) return null; if (r > t0) t0 = r }
      else { if (r < t0) return null; if (r < t1) t1 = r }
    }
  }
  return [x0 + t0 * dx, y0 + t0 * dy, x0 + t1 * dx, y0 + t1 * dy]
}

/* Koordinatsystem: kvadratiskt rutnät med markerat origo, axelpilar och siffror
   på varje heltalssteg. Punkter ritas som fyllda cirklar med bokstavsetikett
   INTILL (aldrig ovanpå). Linjer (grafer) klipps till rutnätet. */
function Koordinat({ min, max, points, lines, xLabel, yLabel }: {
  min: number; max: number
  points: { x: number; y: number; label?: string }[]
  lines?: { points: { x: number; y: number }[]; label?: string }[]
  xLabel?: string; yLabel?: string
}) {
  const range = max - min
  const cell = range <= 6 ? 34 : range <= 10 ? 28 : 22
  const pad = 26
  const size = pad * 2 + range * cell
  const sx = (x: number): number => pad + (x - min) * cell
  const sy = (y: number): number => pad + (max - y) * cell
  const step = range <= 10 ? 1 : 2
  const ints: number[] = []
  for (let i = Math.ceil(min / step) * step; i <= max; i += step) ints.push(i)
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={Math.min(size, 360)} style={{ maxWidth: '100%' }} aria-hidden="true">
      {/* Rutnät. */}
      {ints.map((i) => <line key={`gx${i}`} x1={sx(i)} y1={sy(max)} x2={sx(i)} y2={sy(min)} stroke="var(--line)" strokeWidth={1} opacity={0.5} />)}
      {ints.map((i) => <line key={`gy${i}`} x1={sx(min)} y1={sy(i)} x2={sx(max)} y2={sy(i)} stroke="var(--line)" strokeWidth={1} opacity={0.5} />)}
      {/* Axlar + pilar. */}
      <line x1={sx(min)} y1={sy(0)} x2={sx(max)} y2={sy(0)} stroke="var(--ink)" strokeWidth={2} />
      <line x1={sx(0)} y1={sy(min)} x2={sx(0)} y2={sy(max)} stroke="var(--ink)" strokeWidth={2} />
      <polygon points={`${sx(max) + 9},${sy(0)} ${sx(max) + 1},${sy(0) - 4.5} ${sx(max) + 1},${sy(0) + 4.5}`} fill="var(--ink)" />
      <polygon points={`${sx(0)},${sy(max) - 9} ${sx(0) - 4.5},${sy(max) - 1} ${sx(0) + 4.5},${sy(max) - 1}`} fill="var(--ink)" />
      {/* Siffror på axlarna (0 vid origo). */}
      {ints.filter((i) => i !== 0).map((i) => <text key={`nx${i}`} x={sx(i)} y={sy(0) + 14} fontSize={10.5} fontWeight={700} fill="var(--muted)" textAnchor="middle">{i}</text>)}
      {ints.filter((i) => i !== 0).map((i) => <text key={`ny${i}`} x={sx(0) - 6} y={sy(i) + 4} fontSize={10.5} fontWeight={700} fill="var(--muted)" textAnchor="end">{i}</text>)}
      <text x={sx(0) - 6} y={sy(0) + 14} fontSize={10.5} fontWeight={700} fill="var(--muted)" textAnchor="end">0</text>
      {xLabel && <text x={sx(max) + 2} y={sy(0) + 19} fontSize={11} fontWeight={800} fill="var(--ink)" textAnchor="end">{xLabel}</text>}
      {yLabel && <text x={sx(0) + 6} y={sy(max) + 1} fontSize={11} fontWeight={800} fill="var(--ink)" textAnchor="start">{yLabel}</text>}
      {/* Linjer (grafer): förläng riktningen och klipp till rutnätet. */}
      {(lines ?? []).map((ln, li) => {
        const a = ln.points[0], b = ln.points[ln.points.length - 1]
        const dx = b.x - a.x, dy = b.y - a.y
        const clip = clipToBox(a.x - dx * 60, a.y - dy * 60, a.x + dx * 60, a.y + dy * 60, min, max)
        if (!clip) return null
        const col = CHART_COLORS[li % CHART_COLORS.length]
        return (
          <g key={li}>
            <line x1={sx(clip[0])} y1={sy(clip[1])} x2={sx(clip[2])} y2={sy(clip[3])} stroke={col} strokeWidth={3} strokeLinecap="round" />
            {ln.label && <text x={sx(b.x) + 7} y={sy(b.y) - 5} fontSize={12.5} fontWeight={900} fill={col}>{ln.label}</text>}
          </g>
        )
      })}
      {/* Punkter med etikett intill. */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={sx(p.x)} cy={sy(p.y)} r={5} fill="var(--coral)" stroke="#fff" strokeWidth={2} />
          {p.label && <text x={sx(p.x) + 7} y={sy(p.y) - 6} fontSize={13} fontWeight={900} fill="var(--ink)">{p.label}</text>}
        </g>
      ))}
    </svg>
  )
}

function Rektangel({ w, h, unit }: { w: number; h: number; unit: string }) {
  // h = 0 betyder "okänd sida" (baklängesuppgift).
  const scale = Math.min(200 / Math.max(w, 1), 110 / Math.max(h, 4))
  const pw = Math.max(60, w * scale)
  const ph = Math.max(40, (h || 4) * scale)
  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <div style={{ position: 'relative', padding: '4px 40px 26px 4px' }}>
        <div style={{
          width: pw, height: ph, background: 'color-mix(in srgb, var(--primary) 14%, transparent)',
          border: '3px solid var(--primary)', borderRadius: 6,
          borderStyle: h === 0 ? 'dashed' : 'solid',
        }} />
        <span style={{ position: 'absolute', bottom: 0, left: pw / 2, transform: 'translateX(-50%)', fontWeight: 800, fontSize: 14 }}>
          {w} {unit}
        </span>
        <span style={{ position: 'absolute', right: 0, top: ph / 2, transform: 'translateY(-50%)', fontWeight: 800, fontSize: 14 }}>
          {h === 0 ? '?' : `${h} ${unit}`}
        </span>
      </div>
    </div>
  )
}
