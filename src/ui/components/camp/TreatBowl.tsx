import { useEffect, useRef, useState, type RefObject } from 'react'
import type { PetSpeciesId } from '../../../domain/pet-home'

/* Godbitsskålen under vännens närbild. Barnet DRAR en godbit till vännen
   och släpper den vid munnen — en handling med kroppen, inte en knapp, så
   omsorgen känns på riktigt. Ett tryck utan att dra skickar godbiten ändå
   (de minsta barnen, skärmläsare och tangentbord), och en godbit som släpps
   utanför glider snällt tillbaka — inget kan bli fel. */

/** Varje art har sin egen favorit. */
const TREATS: Record<PetSpeciesId, string> = {
  'woodland-frog': '🫐',
  'dune-fox': '🍓',
  'reef-axolotl': '🦐',
}

/** Rörelse under detta räknas som ett tryck, inte ett drag. */
const TAP_SLOP_PX = 8
/** Godbitens flygtid till munnen — vännen tuggar när den landat. */
const FLY_MS = 380
/** Samma som vännens reaktionsstund i PetHouse (då är knapparna låsta). */
const EAT_MS = 2200

type Phase = 'rest' | 'drag' | 'fly' | 'back'

export function TreatBowl({ species, petName, targetRef, disabled, onFeed }: {
  species: PetSpeciesId
  petName: string
  /** Närbilden — där godbiten ska släppas. */
  targetRef: RefObject<HTMLElement | null>
  disabled: boolean
  onFeed(): void
}) {
  const [phase, setPhase] = useState<Phase>('rest')
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const start = useRef<{ x: number; y: number; id: number } | null>(null)
  const treatRef = useRef<HTMLButtonElement>(null)
  const timer = useRef(0)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const reduced = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  /** Flyg till munnen (övre mitten av närbilden), sedan äter vännen. */
  const feed = (): void => {
    const treat = treatRef.current?.getBoundingClientRect()
    const target = targetRef.current?.getBoundingClientRect()
    if (!treat || !target) { onFeed(); return }
    // Offset räknas från godbitens viloplats i skålen.
    const homeX = treat.left + treat.width / 2 - offset.x
    const homeY = treat.top + treat.height / 2 - offset.y
    setOffset({ x: target.left + target.width / 2 - homeX, y: target.top + target.height * 0.42 - homeY })
    setPhase('fly')
    const fly = reduced ? 0 : FLY_MS
    timer.current = window.setTimeout(() => {
      onFeed()
      // När vännen ätit klart ligger en ny godbit i skålen.
      timer.current = window.setTimeout(() => { setPhase('rest'); setOffset({ x: 0, y: 0 }) }, EAT_MS)
    }, fly)
  }

  const overTarget = (x: number, y: number): boolean => {
    const r = targetRef.current?.getBoundingClientRect()
    if (!r) return false
    // Generös träffyta: små fingrar släpper sällan mitt på munnen.
    const pad = r.width * 0.15
    return x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad
  }

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>): void => {
    if (disabled || phase !== 'rest') return
    e.currentTarget.setPointerCapture(e.pointerId)
    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId }
  }
  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>): void => {
    const s = start.current
    if (!s || s.id !== e.pointerId) return
    const dx = e.clientX - s.x
    const dy = e.clientY - s.y
    if (phase === 'rest' && Math.hypot(dx, dy) < TAP_SLOP_PX) return
    setPhase('drag')
    setOffset({ x: dx, y: dy })
  }
  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>): void => {
    const s = start.current
    if (!s || s.id !== e.pointerId) return
    start.current = null
    if (phase === 'rest' || overTarget(e.clientX, e.clientY)) { feed(); return }
    // Släppt bredvid: tillbaka till skålen, utan dramatik.
    setPhase('back')
    setOffset({ x: 0, y: 0 })
    timer.current = window.setTimeout(() => setPhase('rest'), reduced ? 0 : 260)
  }
  const onPointerCancel = (): void => {
    start.current = null
    setPhase('rest')
    setOffset({ x: 0, y: 0 })
  }

  const treat = TREATS[species] ?? '🍪'
  return (
    <div className={`treat-bowl${disabled ? ' treat-bowl--off' : ''}`}>
      <span className="treat-bowl__dish" aria-hidden="true">
        <i>{treat}</i><i>{treat}</i>
      </span>
      <button
        ref={treatRef}
        type="button"
        className={`treat-bowl__treat treat-bowl__treat--${phase}`}
        style={{ transform: `translate(${offset.x}px, ${offset.y}px)${phase === 'fly' ? ' scale(.35)' : phase === 'drag' ? ' scale(1.25)' : ''}` }}
        disabled={disabled}
        aria-label={`Ge ${petName} en godbit`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        // Tangentbord/skärmläsare: Enter/mellanslag ger click utan pekare.
        onClick={(e) => { if (e.detail === 0 && !disabled && phase === 'rest') feed() }}
      >
        {treat}
      </button>
      <small>{disabled ? '' : `Dra en godbit till ${petName}`}</small>
    </div>
  )
}
