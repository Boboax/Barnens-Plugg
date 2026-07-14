import { useEffect, useState } from 'react'
import { Pi } from './Pi'

/* ============================================================
   Wow-ögonblicket när appen öppnas: himmel, Pi som studsar in,
   logotypen bokstav för bokstav och gnistrande stjärnor.
   Försvinner själv efter ~2,2 s (eller direkt vid tryck).
   ============================================================ */

const TITLE = 'Räknarnas rike'
const SPARKLES: { top: string; left: string; delay: number; emoji: string }[] = [
  { top: '18%', left: '22%', delay: 0.2, emoji: '✨' },
  { top: '12%', left: '68%', delay: 0.7, emoji: '⭐' },
  { top: '30%', left: '82%', delay: 0.4, emoji: '✨' },
  { top: '62%', left: '14%', delay: 0.9, emoji: '⭐' },
  { top: '70%', left: '76%', delay: 0.5, emoji: '✨' },
  { top: '44%', left: '8%', delay: 1.1, emoji: '➕' },
  { top: '26%', left: '44%', delay: 1.3, emoji: '✖️' },
  { top: '66%', left: '52%', delay: 0.3, emoji: '🔢' },
]

export function Splash({ onDone }: { onDone(): void }) {
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const showFor = reduced ? 400 : 2200
    const t1 = window.setTimeout(() => setLeaving(true), showFor)
    const t2 = window.setTimeout(onDone, showFor + 450)
    return () => { window.clearTimeout(t1); window.clearTimeout(t2) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      onPointerDown={() => { setLeaving(true); window.setTimeout(onDone, 250) }}
      style={{
        position: 'fixed', inset: 0, zIndex: 999,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14,
        background: 'linear-gradient(180deg, #FFE9B8 0%, #FFF9EF 55%, #EAF6EE 100%)',
        animation: leaving ? 'splash-fade 0.4s ease forwards' : undefined,
      }}
    >
      {SPARKLES.map((s, i) => (
        <span key={i} className="sparkle" style={{ top: s.top, left: s.left, animationDelay: `${s.delay}s`, fontSize: 26 }}>
          {s.emoji}
        </span>
      ))}
      <div className="bounce-in" style={{ animationDelay: '0.15s' }}>
        <Pi mood="hejar" size={130} />
      </div>
      <h1 style={{ margin: 0, fontSize: 'clamp(30px, 6vw, 44px)', fontWeight: 900, letterSpacing: 0.5 }}>
        {TITLE.split('').map((ch, i) => (
          <span
            key={i}
            className="letter-pop"
            style={{
              animationDelay: `${0.35 + i * 0.045}s`,
              color: i >= 8 ? 'var(--primary)' : 'var(--ink)',
              whiteSpace: 'pre',
            }}
          >{ch}</span>
        ))}
      </h1>
      <p className="bounce-in" style={{ animationDelay: '1s', margin: 0, color: 'var(--muted)', fontWeight: 800, fontSize: 15 }}>
        🏔 Äventyret i Matteriket väntar …
      </p>
    </div>
  )
}
