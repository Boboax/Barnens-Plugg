import { useEffect, useRef, useState, type RefObject } from 'react'
import type { PetSpeciesId } from '../../../domain/pet-home'
import { campImage } from './campArt'

/* Godbitsskålen under vännens närbild. Barnet DRAR en godbit till vännen
   och släpper den vid munnen — en handling med kroppen, inte en knapp, så
   omsorgen känns på riktigt. Ett tryck utan att dra skickar godbiten ändå
   (de minsta barnen, skärmläsare och tangentbord), och en godbit som släpps
   utanför glider snällt tillbaka — inget kan bli fel. */

/** Grundgodiset — gratis och alltid i skålen. Köpt favoritgodis
    (handelsboden) läggs till bredvid. */
const BASIC: Record<PetSpeciesId, { emoji: string; name: string }> = {
  'woodland-frog': { emoji: '🫐', name: 'Blåbär' },
  'dune-fox': { emoji: '🍓', name: 'Jordgubbe' },
  'reef-axolotl': { emoji: '🦐', name: 'Räka' },
}

export interface BowlTreat { id: string; emoji: string; name: string }

/** Rörelse under detta räknas som ett tryck, inte ett drag. */
const TAP_SLOP_PX = 8
/** Godbitens flygtid till munnen — vännen tuggar när den landat. */
const FLY_MS = 380
/** Samma som vännens reaktionsstund i PetHouse (då är knapparna låsta). */
const EAT_MS = 2200

type Phase = 'rest' | 'drag' | 'fly' | 'back'

export function TreatBowl({ species, petName, extras = [], targetRef, disabled, onFeed }: {
  species: PetSpeciesId
  petName: string
  /** Köpt favoritgodis för den här arten. */
  extras?: BowlTreat[]
  /** Vännen — där godbiten ska släppas. */
  targetRef: RefObject<HTMLElement | null>
  disabled: boolean
  /** special = köpt favoritgodis (vännen blir extra glad). */
  onFeed(treat: { name: string; special: boolean }): void
}) {
  const basic = BASIC[species] ?? { emoji: '🍪', name: 'Kaka' }
  const choices: (BowlTreat & { special: boolean })[] = [
    { id: 'basic', ...basic, special: false },
    ...extras.map((t) => ({ ...t, special: true })),
  ]
  // Senast köpta favoriten ligger överst — då syns det nya direkt.
  const [chosenId, setChosenId] = useState(choices[choices.length - 1].id)
  const chosen = choices.find((c) => c.id === chosenId) ?? choices[0]
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
    const eaten = { name: chosen.name, special: chosen.special }
    if (!treat || !target) { onFeed(eaten); return }
    // Offset räknas från godbitens viloplats i skålen.
    const homeX = treat.left + treat.width / 2 - offset.x
    const homeY = treat.top + treat.height / 2 - offset.y
    setOffset({ x: target.left + target.width / 2 - homeX, y: target.top + target.height * 0.42 - homeY })
    setPhase('fly')
    const fly = reduced ? 0 : FLY_MS
    timer.current = window.setTimeout(() => {
      onFeed(eaten)
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

  const treat = chosen.emoji
  return (
    <div className={`treat-bowl${disabled ? ' treat-bowl--off' : ''}`}>
      {choices.length > 1 && (
        <div className="treat-bowl__choices" role="group" aria-label="Välj godis">
          {choices.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={c.id === chosen.id}
              aria-label={c.name}
              disabled={phase !== 'rest'}
              onClick={() => setChosenId(c.id)}
            >{c.emoji}</button>
          ))}
        </div>
      )}
      <span className="treat-bowl__dish" style={{ backgroundImage: `url(${campImage('den-treat-bowl')})` }} aria-hidden="true">
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
      <small>{disabled ? '' : choices.length > 1 ? `Dra ${chosen.name.toLowerCase()} till ${petName}` : `Dra en godbit till ${petName}`}</small>
    </div>
  )
}
