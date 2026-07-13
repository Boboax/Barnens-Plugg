import { useState } from 'react'

/* ============================================================
   Maskoten Pi — en liten uggleande med lykta, målad i Ghibli-
   anda (public/art/pi/*.webp, genererad av föräldern via Gemini
   och frilagd i bygget). En pose per humör. Om bilderna inte
   kan laddas ritas den gamla SVG-pingvinen som reserv — Pi
   försvinner aldrig.
   ============================================================ */

export type PiMood = 'glad' | 'hejar' | 'sover' | 'funderar'

/** Posebildernas proportioner (bredd/höjd) — så layouten inte hoppar när de laddas. */
const RATIO: Record<PiMood, number> = { glad: 1.25, hejar: 1.55, funderar: 1.05, sover: 1.6 }

export function Pi({ mood = 'glad', size = 90 }: { mood?: PiMood; size?: number }) {
  const [broken, setBroken] = useState(false)
  if (broken) return <PenguinFallback mood={mood} size={size} />
  return (
    <img
      src={`${import.meta.env.BASE_URL}art/pi/${mood}.webp`}
      alt=""
      aria-hidden="true"
      onError={() => setBroken(true)}
      style={{
        display: 'block', height: size, width: size * RATIO[mood], objectFit: 'contain',
        filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.25))', // binder figuren till marken
        pointerEvents: 'none',
      }}
    />
  )
}

/** Stor hjältebild till startsidan/splash. */
export function PiHero({ size = 200 }: { size?: number }) {
  const [broken, setBroken] = useState(false)
  if (broken) return <PenguinFallback mood="glad" size={size} />
  return (
    <img
      src={`${import.meta.env.BASE_URL}art/pi/hjalte.webp`}
      alt=""
      aria-hidden="true"
      onError={() => setBroken(true)}
      style={{
        display: 'block', height: size, width: 'auto',
        filter: 'drop-shadow(0 4px 8px rgba(0,0,0,.3))',
        pointerEvents: 'none',
      }}
    />
  )
}

/* Ursprungliga SVG-pingvinen — behålls som reserv (och som appens rötter). */
function PenguinFallback({ mood, size }: { mood: PiMood; size: number }) {
  const sleeping = mood === 'sover'
  return (
    <svg width={size} height={size * 1.07} viewBox="0 0 86 92" aria-hidden="true">
      {mood === 'hejar' && (
        <>
          <ellipse cx="10" cy="46" rx="9" ry="4.5" fill="#2E3350" transform="rotate(-40 10 46)" />
          <ellipse cx="76" cy="46" rx="9" ry="4.5" fill="#2E3350" transform="rotate(40 76 46)" />
        </>
      )}
      <ellipse cx="43" cy="56" rx="30" ry="34" fill="#2E3350" />
      <ellipse cx="43" cy="62" rx="20" ry="25" fill="#fff" />
      {sleeping ? (
        <>
          <path d="M29,42 q5,4 10,0" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M47,42 q5,4 10,0" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <text x="62" y="26" fontSize="13" fill="#8A8FA8" fontWeight="700">z</text>
          <text x="70" y="16" fontSize="10" fill="#8A8FA8" fontWeight="700">z</text>
        </>
      ) : (
        <>
          <circle cx="34" cy="42" r="4.5" fill="#fff" />
          <circle cx="52" cy="42" r="4.5" fill="#fff" />
          <circle cx="35" cy="43" r="2.2" fill="#2E3350" />
          <circle cx="51" cy="43" r="2.2" fill="#2E3350" />
        </>
      )}
      {mood === 'funderar' && <circle cx="63" cy="30" r="3" fill="none" stroke="#8A8FA8" strokeWidth="1.5" />}
      <polygon points="43,48 37,54 49,54" fill="#FFC94D" />
      {mood === 'hejar' && <path d="M35,58 q8,6 16,0" stroke="#2E3350" strokeWidth="2.5" fill="none" strokeLinecap="round" />}
      <ellipse cx="33" cy="88" rx="9" ry="4" fill="#FFC94D" />
      <ellipse cx="53" cy="88" rx="9" ry="4" fill="#FFC94D" />
    </svg>
  )
}
