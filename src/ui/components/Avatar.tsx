import type { ChildProfile } from '../../domain/types'

/* Spelarbricka: barnets initial som ingraverat guldmonogram på en färgad
   sten, infattad i samma mässingsring som kartnoderna. Inget foto, ingen
   data lämnar enheten — helt i linje med appens lokalitetsprincip. */

const ringUrl = `${import.meta.env.BASE_URL}art/tex/nodering.webp`

export function Avatar({ child, size = 64 }: { child: ChildProfile; size?: number }) {
  return (
    <span style={{ position: 'relative', width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {/* Färgad stenskiva i ringens hål (hålradie ≈ 0.56 → inset ~0.2). */}
      <span style={{
        position: 'absolute', inset: size * 0.2, borderRadius: '50%',
        background: `radial-gradient(circle at 34% 28%, rgba(255,255,255,.5), rgba(0,0,0,.22) 90%), ${child.color}`,
      }} />
      <span className="display" style={{
        position: 'relative', zIndex: 1, fontSize: size * 0.36, fontWeight: 900, lineHeight: 1,
        color: '#FFE6A6', textShadow: '0 1px 1px rgba(0,0,0,.55), 0 0 6px rgba(255,190,80,.4)',
      }}>{child.name.charAt(0).toUpperCase()}</span>
      {/* Ornamenterad mässingsring ovanpå. */}
      <img src={ringUrl} alt="" aria-hidden="true"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />
    </span>
  )
}
