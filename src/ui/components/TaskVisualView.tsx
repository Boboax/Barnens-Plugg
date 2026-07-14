import type { TaskVisual } from '../../domain/types'
import { isObjektIcon, ObjektIcon } from './Icon'

/* ============================================================
   Visuellt stöd enligt CRA-principen: tiobasblock, tallinje,
   grupper, bråkfigurer, klocka och rektangel.
   ============================================================ */

export function TaskVisualView({ visual }: { visual: TaskVisual }) {
  switch (visual.kind) {
    case 'tiobas': return <Tiobas groups={visual.groups} />
    case 'tallinje': return <Tallinje min={visual.min} max={visual.max} marks={visual.marks} highlight={visual.highlight} />
    case 'grupper': return <Grupper count={visual.groupCount} per={visual.itemsPerGroup} emoji={visual.emoji} />
    case 'foljd': return <Foljd items={visual.items} />
    case 'brak': return <Brak parts={visual.parts} filled={visual.filled} secondary={visual.secondary} />
    case 'klocka': return <Klocka hours={visual.hours} minutes={visual.minutes} />
    case 'form': return <Form shape={visual.shape} />
    case 'rektangel': return <Rektangel w={visual.w} h={visual.h} unit={visual.unit} />
    case 'ingen': return null
  }
}

function Tiobas({ groups }: { groups: { tens: number; ones: number; hundreds?: number }[] }) {
  return (
    <div style={{ display: 'flex', gap: 22, justifyContent: 'center', alignItems: 'flex-end', flexWrap: 'wrap' }}>
      {groups.map((g, gi) => (
        <div key={gi} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          {gi > 0 && <span style={{ fontSize: 24, fontWeight: 900, color: 'var(--muted)', alignSelf: 'center' }}>+</span>}
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
        </div>
      ))}
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
    <svg viewBox={`0 0 ${width} 64`} style={{ width: '100%', maxWidth: 520 }} aria-hidden="true">
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

function Klocka({ hours, minutes }: { hours: number; minutes: number }) {
  const hourAngle = ((hours % 12) + minutes / 60) * 30 - 90
  const minAngle = minutes * 6 - 90
  const rad = (deg: number): [number, number] => [
    60 + 38 * Math.cos((deg * Math.PI) / 180) * 0.62,
    60 + 38 * Math.sin((deg * Math.PI) / 180) * 0.62,
  ]
  const [hx, hy] = rad(hourAngle)
  const mx = 60 + 44 * Math.cos((minAngle * Math.PI) / 180) * 0.86
  const my = 60 + 44 * Math.sin((minAngle * Math.PI) / 180) * 0.86
  return (
    <svg viewBox="0 0 120 120" width={150} height={150} aria-hidden="true">
      <circle cx={60} cy={60} r={52} fill="var(--card)" stroke="var(--ink)" strokeWidth={4} />
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i * 30 - 90) * (Math.PI / 180)
        const x = 60 + 44 * Math.cos(a)
        const y = 60 + 44 * Math.sin(a)
        return (
          <text key={i} x={x} y={y + 4} fontSize={11} fontWeight={800} textAnchor="middle" fill="var(--ink)">
            {i === 0 ? 12 : i}
          </text>
        )
      })}
      <line x1={60} y1={60} x2={hx} y2={hy} stroke="var(--ink)" strokeWidth={5} strokeLinecap="round" />
      <line x1={60} y1={60} x2={mx} y2={my} stroke="var(--coral)" strokeWidth={3.5} strokeLinecap="round" />
      <circle cx={60} cy={60} r={4} fill="var(--ink)" />
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
