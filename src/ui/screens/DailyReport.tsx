import { useState } from 'react'
import type { ChildProfile } from '../../domain/types'
import { dailyStats, periodSummary, type DayStats, type DayVerdict } from '../../engine/daily'

/* Föräldraläget → "Dag för dag": två veckor per barn. Överst perioden i
   klarspråk, sedan ett stapeldiagram (aktiv tid + pauser per dag, med
   dagsgränsen som streckad linje) och under det en rad per dag med det
   som ligger bakom: tider, uppgifter, träffsäkerhet, gissningar, tempo
   och vilka moment som tränats. Diagrammet och raderna hänger ihop —
   tryck på en stapel så öppnas den dagen. */

const ACTIVE = '#4A56C6'
const IDLE = '#C9A227'
const INK = '#2A2F3A'
const MUTED = '#8B8FA0'
const GRID = '#ECEAE4'

const VERDICT: Record<DayVerdict, { label: string; icon: string; color: string; bg: string }> = {
  fokus: { label: 'Fokuserat', icon: '✓', color: '#1F7A50', bg: '#E4F4EC' },
  blandat: { label: 'En varningssignal', icon: '!', color: '#8A5A00', bg: '#FFF1D6' },
  obs: { label: 'Flera varningssignaler', icon: '!!', color: '#B3261E', bg: '#FDE7E4' },
  kort: { label: 'Kort stund', icon: '·', color: '#5B6070', bg: '#F0EFEA' },
  vila: { label: 'Vilodag', icon: '', color: MUTED, bg: 'transparent' },
}

const WEEKDAYS = ['sön', 'mån', 'tis', 'ons', 'tor', 'fre', 'lör']
const dayLabel = (date: string): string => {
  const d = new Date(`${date}T12:00:00Z`)
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()}/${d.getUTCMonth() + 1}`
}
const clock = (iso?: string): string =>
  iso ? new Date(iso).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }) : ''

export function DailyReport({ child, now }: { child: ChildProfile; now: string }) {
  const stats = dailyStats(child, now, 14)
  const summary = periodSummary(child.name, stats)
  const firstWorked = stats.find((d) => d.verdict !== 'vila')?.date ?? null
  const [open, setOpen] = useState<string | null>(firstWorked)
  return (
    <div>
      <ul style={{ margin: '0 0 12px', paddingLeft: 18, fontSize: 13.5, lineHeight: 1.6 }}>
        {summary.map((n, i) => <li key={i}>{n}</li>)}
      </ul>
      <DayChart stats={stats} limit={child.dailyLimitMinutes} selected={open} onSelect={setOpen} />
      <div style={{ marginTop: 12, display: 'grid', gap: 6 }}>
        {groupRestDays(stats).map((g) => Array.isArray(g)
          ? (
            <div key={g[0].date} style={{ fontSize: 12.5, color: MUTED, fontWeight: 600, padding: '2px 4px' }}>
              {g.length === 1 ? dayLabel(g[0].date) : `${dayLabel(g[g.length - 1].date)} – ${dayLabel(g[0].date)}`} · ingen träning
            </div>
          )
          : <DayRow key={g.date} day={g} open={open === g.date} onToggle={() => setOpen(open === g.date ? null : g.date)} />)}
      </div>
    </div>
  )
}

/** Vilodagar i följd slås ihop till en rad — två veckors "ingen träning"
    ska inte trycka ned dagarna som faktiskt säger något. */
function groupRestDays(stats: DayStats[]): (DayStats | DayStats[])[] {
  const out: (DayStats | DayStats[])[] = []
  for (const d of stats) {
    const quiet = d.verdict === 'vila' && d.signals.length === 0 && d.campMinutes === 0
    const last = out[out.length - 1]
    if (quiet && Array.isArray(last)) last.push(d)
    else out.push(quiet ? [d] : d)
  }
  return out
}

function DayChart({ stats, limit, selected, onSelect }: {
  stats: DayStats[]; limit: number; selected: string | null; onSelect(date: string): void
}) {
  const days = [...stats].reverse() // äldst till vänster
  const W = 700
  const H = 190
  const PAD_L = 34
  const PAD_B = 40
  const top = 14
  const maxVal = Math.max(limit, ...days.map((d) => d.activeMinutes + d.idleMinutes), 10)
  const yMax = Math.ceil(maxVal / 10) * 10
  const plotH = H - PAD_B - top
  const slot = (W - PAD_L) / days.length
  const barW = Math.min(26, slot * 0.6)
  const y = (v: number): number => top + plotH - (v / yMax) * plotH
  const ticks = [0, yMax / 2, yMax]

  return (
    <div>
      <div style={{ display: 'flex', gap: 14, fontSize: 12.5, fontWeight: 700, color: INK, marginBottom: 4, flexWrap: 'wrap' }}>
        <span><Swatch color={ACTIVE} /> Aktiv tid (min)</span>
        <span><Swatch color={IDLE} /> Pauser — appen framme, orörd</span>
        <span style={{ color: MUTED }}>– – dagsgräns {limit} min</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Minuter per dag de senaste två veckorna" style={{ display: 'block', fontFamily: 'inherit' }}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD_L} x2={W} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
            <text x={PAD_L - 6} y={y(t) + 4} textAnchor="end" fontSize={11} fill={MUTED}>{t}</text>
          </g>
        ))}
        <line x1={PAD_L} x2={W} y1={y(limit)} y2={y(limit)} stroke={MUTED} strokeWidth={1.5} strokeDasharray="5 4" />
        {days.map((d, i) => {
          const cx = PAD_L + slot * i + slot / 2
          const x = cx - barW / 2
          const aH = (d.activeMinutes / yMax) * plotH
          const iH = (d.idleMinutes / yMax) * plotH
          const v = VERDICT[d.verdict]
          const isSel = selected === d.date
          const tip = `${dayLabel(d.date)}: ${d.activeMinutes} min aktiv, ${d.idleMinutes} min pauser, ${d.answers} uppgifter${d.accuracy !== null ? `, ${Math.round(d.accuracy * 100)} % rätt` : ''}`
          return (
            <g key={d.date} onClick={() => onSelect(d.date)} style={{ cursor: 'pointer' }}>
              <title>{tip}</title>
              {/* Träffytan är hela kolumnen, inte bara stapeln. */}
              <rect x={cx - slot / 2} y={top} width={slot} height={plotH + PAD_B} fill={isSel ? '#F4F3EF' : 'transparent'} />
              {aH > 0 && <rect x={x} y={y(d.activeMinutes)} width={barW} height={aH} rx={4} fill={ACTIVE} />}
              {iH > 0 && <rect x={x} y={y(d.activeMinutes + d.idleMinutes)} width={barW} height={Math.max(0, iH - 2)} rx={4} fill={IDLE} />}
              <text x={cx} y={H - PAD_B + 15} textAnchor="middle" fontSize={11} fontWeight={isSel ? 800 : 600} fill={isSel ? INK : MUTED}>
                {dayLabel(d.date).split(' ')[0]}
              </text>
              <text x={cx} y={H - PAD_B + 28} textAnchor="middle" fontSize={10} fill={MUTED}>{d.date.slice(8).replace(/^0/, '')}</text>
              {d.verdict !== 'vila' && (
                <g>
                  <text x={cx} y={y(d.activeMinutes + d.idleMinutes) - 5} textAnchor="middle" fontSize={11} fontWeight={900} fill={v.color}>{v.icon}</text>
                </g>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function Swatch({ color }: { color: string }) {
  return <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: color, marginRight: 4, verticalAlign: -1 }} />
}

function DayRow({ day, open, onToggle }: { day: DayStats; open: boolean; onToggle(): void }) {
  const v = VERDICT[day.verdict]
  if (day.verdict === 'vila' && day.signals.length === 0) {
    return (
      <div style={{ fontSize: 12.5, color: MUTED, fontWeight: 600, padding: '2px 4px' }}>
        {dayLabel(day.date)} · ingen träning{day.campMinutes ? ` · ${day.campMinutes} min i lägret` : ''}
      </div>
    )
  }
  return (
    <div style={{ border: '1px solid #EDEAE2', borderRadius: 12, background: open ? '#FCFBF8' : '#fff' }}>
      <button onClick={onToggle} aria-expanded={open} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '9px 12px',
        fontFamily: 'inherit', fontSize: 13.5, color: INK, textAlign: 'left', background: 'transparent',
      }}>
        <strong style={{ minWidth: 74 }}>{dayLabel(day.date)}</strong>
        <span style={{ fontSize: 12, fontWeight: 800, color: v.color, background: v.bg, borderRadius: 99, padding: '2px 9px' }}>
          {v.icon && `${v.icon} `}{v.label}
        </span>
        <span style={{ fontWeight: 700 }}>{day.activeMinutes} min</span>
        <span style={{ color: MUTED, fontWeight: 600 }}>
          {day.answers} uppgifter{day.accuracy !== null ? ` · ${Math.round(day.accuracy * 100)} % rätt` : ''}
          {day.firstAt ? ` · ${clock(day.firstAt)}–${clock(day.lastAt)}` : ''}
        </span>
        <span style={{ marginLeft: 'auto', color: MUTED }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{ padding: '0 12px 12px', fontSize: 13.5 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8, margin: '4px 0 10px' }}>
            <Fact label="Aktiv tid" value={`${day.activeMinutes} min`} />
            <Fact label="Pauser (orörd)" value={`${day.idleMinutes} min`} />
            <Fact label="Pass" value={`${day.sessions}`} />
            <Fact label="Uppgifter" value={`${day.answers}`} />
            <Fact label="Rätt (träning)" value={day.accuracy !== null ? `${day.correct} av ${day.trained} · ${Math.round(day.accuracy * 100)} %` : '–'} />
            <Fact label="Snabba gissningar" value={`${day.guesses}`} />
            <Fact label="Tempo" value={day.perMinute !== null ? `${day.perMinute.toFixed(1).replace('.', ',')} uppg/min` : '–'} />
            <Fact label="Typisk svarstid" value={day.medianSeconds !== null ? `${String(day.medianSeconds).replace('.', ',')} s` : '–'} />
            {day.campMinutes > 0 && <Fact label="Kvällslägret" value={`${day.campMinutes} min`} />}
          </div>
          {day.signals.length > 0 && (
            <ul style={{ margin: '0 0 8px', paddingLeft: 0, listStyle: 'none', display: 'grid', gap: 4 }}>
              {day.signals.map((s, i) => (
                <li key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', lineHeight: 1.45 }}>
                  <span aria-hidden="true" style={{ fontWeight: 900, color: s.tone === 'bra' ? '#1F7A50' : '#8A5A00', minWidth: 14 }}>{s.tone === 'bra' ? '✓' : '!'}</span>
                  <span>{s.text}</span>
                </li>
              ))}
            </ul>
          )}
          {day.moments.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {day.moments.map((m) => (
                <span key={m.id} style={{ fontSize: 12, fontWeight: 700, background: '#F4F3EF', borderRadius: 99, padding: '3px 10px' }}>
                  {m.title}: {m.correct}/{m.answers}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: '#F7F6F2', borderRadius: 10, padding: '7px 10px' }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: MUTED }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 800, color: INK }}>{value}</div>
    </div>
  )
}
