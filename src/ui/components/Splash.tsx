import { useEffect, useState } from 'react'
import { preloadStartSong } from '../../sound'

/* ============================================================
   Wow-ögonblicket när appen öppnas: den målade utsikten över
   riket (startbg) med den kompletta logotypen (Pi, titel och
   allt) som tonar in och magiska gnistor som glittrar.
   Kräver ETT tryck för att gå vidare — det trycket är
   användargesten som får startlåten att spela direkt (låten
   förladdas här under tiden). Inga emojis — allt är målad konst.
   ============================================================ */

const base = import.meta.env.BASE_URL

/* Gnistlägen (deterministiska) — magiskt glitter i stället för ✨-emojin. */
const GLINTS: { top: string; left: string; delay: number; size: number }[] = [
  { top: '20%', left: '16%', delay: 0.1, size: 10 },
  { top: '14%', left: '72%', delay: 0.6, size: 13 },
  { top: '34%', left: '86%', delay: 0.3, size: 9 },
  { top: '68%', left: '12%', delay: 0.9, size: 11 },
  { top: '74%', left: '80%', delay: 0.4, size: 12 },
  { top: '30%', left: '30%', delay: 1.2, size: 8 },
  { top: '58%', left: '60%', delay: 0.75, size: 10 },
  { top: '22%', left: '52%', delay: 1.0, size: 9 },
]

export function Splash({ onDone }: { onDone(): void }) {
  const [leaving, setLeaving] = useState(false)
  const [logoOk, setLogoOk] = useState(true)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Förladda startlåten redan nu så den kan börja direkt vid trycket.
    preloadStartSong()
    // Låt logotyp/bakgrund tona in en stund, visa sedan "tryck för att börja".
    const t = window.setTimeout(() => setReady(true), 900)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const go = (): void => {
    if (leaving) return
    setLeaving(true)
    window.setTimeout(onDone, 250)
  }

  return (
    <div
      onPointerDown={go}
      role="button"
      tabIndex={0}
      aria-label="Tryck för att börja"
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') go() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 999,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24,
        // Målad utsikt över riket bakom logotypen; mörk enfärg som reserv.
        background: `url(${base}art/startbg.webp) center / cover no-repeat, #241C24`,
        animation: leaving ? 'splash-fade 0.4s ease forwards' : undefined,
        overflow: 'hidden',
      }}
    >
      {/* Vinjett så logotypen lyfter fram ur bakgrunden. */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at center, rgba(20,16,28,0) 30%, rgba(20,16,28,.55) 100%)',
        boxShadow: 'inset 0 0 140px rgba(0,0,0,.6)',
      }} />

      {/* Magiskt glitter (respekterar prefers-reduced-motion via .glint). */}
      {GLINTS.map((g, i) => (
        <span key={i} className="glint" aria-hidden="true" style={{
          top: g.top, left: g.left, width: g.size, height: g.size,
          ['--glow' as string]: '#FFE39A', ['--dur' as string]: '2.4s',
          animationDelay: `${g.delay}s`,
        }} />
      ))}

      {/* Den kompletta logotypen (innehåller redan Pi, titel och underrubrik). */}
      <div className="bounce-in" style={{ position: 'relative', zIndex: 2, animationDelay: '0.1s' }}>
        {logoOk ? (
          <img
            src={`${base}art/logo.webp`}
            alt="Räknarnas rike"
            onError={() => setLogoOk(false)}
            style={{
              width: 'min(560px, 84vw)', height: 'auto', display: 'block',
              filter: 'drop-shadow(0 8px 24px rgba(0,0,0,.55))',
            }}
          />
        ) : (
          <h1 className="display" style={{
            margin: 0, fontSize: 'clamp(30px, 6vw, 46px)', fontWeight: 900, letterSpacing: 0.5,
            color: '#FFE39A', textShadow: '0 3px 10px rgba(0,0,0,.7)', textAlign: 'center',
          }}>Räknarnas rike</h1>
        )}
      </div>

      {/* Före: laddningsrad. När klart: pulserande "tryck för att börja" —
          trycket är gesten som startar musiken. */}
      <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, minHeight: 60, justifyContent: 'center' }}>
        {ready ? (
          // Samma ornerade snidade skylt som världstitlarna (--tex-plaque) med
          // graverad guldtext — smälter in i appens signeringsestetik. Mjukt
          // andas/glöd-sken lockar till tryck. Ingen pil.
          <span className="display splash-cta" aria-hidden="true" style={{
            width: 'min(370px, 80vw)', aspectRatio: '600 / 328',
            backgroundImage: 'var(--tex-plaque)', backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 15% 2%', boxSizing: 'border-box', whiteSpace: 'nowrap', pointerEvents: 'none',
            fontWeight: 900, fontSize: 'clamp(18px, 4.2vw, 24px)', letterSpacing: 0.5,
            color: '#FFE7A8', textShadow: '0 1px 2px rgba(45,26,4,.95), 0 0 3px rgba(45,26,4,.7)',
          }}>Tryck för att börja</span>
        ) : (
          <>
            <div aria-hidden="true" style={{
              width: 168, height: 6, borderRadius: 99, overflow: 'hidden',
              background: 'rgba(0,0,0,.35)', boxShadow: 'inset 0 1px 3px rgba(0,0,0,.5), 0 0 0 1px rgba(255,201,77,.25)',
            }}>
              <div className="splash-load" style={{
                height: '100%', borderRadius: 99,
                background: 'linear-gradient(90deg, #F3C24A, #FFE39A, #F3C24A)',
              }} />
            </div>
            <p className="display" style={{
              margin: 0, fontWeight: 800, fontSize: 15, letterSpacing: 0.3,
              color: '#F6EFDF', textShadow: '0 2px 6px rgba(0,0,0,.7)',
            }}>Äventyret laddas …</p>
          </>
        )}
      </div>
    </div>
  )
}
