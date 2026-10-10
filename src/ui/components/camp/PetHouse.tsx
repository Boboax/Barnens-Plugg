import { useEffect, useRef, useState } from 'react'
import type { CampItemInstance, CampPet, PetCareActivity } from '../../../domain/pet-home'
import { petSpecies } from '../../../domain/pet-home'
import { catalogItem } from '../../../domain/camp'
import { worldById } from '../../../domain/worlds'
import { PetSounds } from '../../pet-sounds'
import { PetSprite } from './PetSprite'
import { campImage, itemImage } from './campArt'
import { DEN_ART_READY, DenScene } from './DenScene'

/* Stationen "Vännerna": en stund med ett husdjur — klappa, ge en godbit,
   leka eller säga godnatt. Allt är gratis och inget kan gå förlorat;
   djuren har det alltid bra, även när barnet inte är här (inga behov,
   inga mätare som sjunker — inget dåligt samvete för en sexåring).
   Vännerna bor i en lya under trädrötterna tills barnet köper tältet,
   då flyttar de in där. */

/* Varierade repliker: samma rad varje gång blir platt. */
const REACTIONS: Record<PetCareActivity, ((name: string) => string)[]> = {
  pet: [
    (n) => `${n} njuter av din klapp och känner sig trygg.`,
    (n) => `${n} blundar och lutar sig mot din hand.`,
    (n) => `${n} gör en liten glad hoppsa!`,
    (n) => `${n} kurrar nöjt. Ni är bästa vänner.`,
  ],
  feed: [
    (n) => `${n} mumsar glatt på sin godbit.`,
    (n) => `${n} smaskar och slickar sig om munnen.`,
    (n) => `${n} sparar en smula till senare.`,
  ],
  play: [
    (n) => `${n} hoppar högt och vill leka igen!`,
    (n) => `${n} gömmer sig och tittar fram. Tittut!`,
    (n) => `${n} springer i cirklar av glädje.`,
  ],
  wake: [(n) => `${n} vaknar, sträcker på sig och är glad att se dig.`],
  rest: [(n) => `${n} sover tryggt i sin sovhörna.`],
}

const daysBetween = (fromIso: string, to: Date): number =>
  Math.max(1, Math.floor((to.getTime() - new Date(fromIso).getTime()) / 86_400_000) + 1)

const whenText = (iso: string | undefined, now: Date): string | undefined => {
  if (!iso) return undefined
  const days = Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000)
  return days <= 0 ? 'idag' : days === 1 ? 'igår' : `för ${days} dagar sedan`
}

/** Sovhörnorna i tältbilden, i samma ordning som bäddplatserna bed-1..4. */
const CORNERS = [
  { x: 32, y: 52, name: 'Bakre vänstra hörnet' },
  { x: 69, y: 52, name: 'Bakre högra hörnet' },
  { x: 25, y: 78, name: 'Främre vänstra hörnet' },
  { x: 75, y: 78, name: 'Främre högra hörnet' },
]
/** Lyans målade mossbäddar ligger på andra ställen än tältets hörnor —
    samma fyra platser (bed-1..4), bara flyttade så vännen sitter PÅ bädden. */
const DEN_SPOTS = [{ x: 37, y: 47 }, { x: 71, y: 46 }, { x: 24, y: 70 }, { x: 75, y: 70 }]
const cornerIndex = (pet: CampPet, fallback: number): number => {
  const i = Number(pet.bedPoint?.replace('bed-', '')) - 1
  return i >= 0 && i < CORNERS.length ? i : fallback
}

const MUTE_KEY = 'pet-sounds-muted'
const readMuted = (): boolean => {
  try { return localStorage.getItem(MUTE_KEY) === 'true' } catch { return false }
}

interface Props {
  pets: CampPet[]
  items: CampItemInstance[]
  hasTent: boolean
  /** Namnet på en leksak barnet äger (lekstock, världsgåva) — leken blir då
      med den. Utan leksak leker vännen tittut. */
  toyName?: string
  canInteract: boolean
  onCare(petId: string, activity: PetCareActivity): void
  onRename(petId: string, name: string): void
  onBed(petId: string, point: string): void
  onPacking(): void
}

export function PetHouse({ pets, items, hasTent, toyName, canInteract, onCare, onRename, onBed, onPacking }: Props) {
  const [selectedId, setSelectedId] = useState(pets[0]?.id)
  const [moment, setMoment] = useState<{ petId: string; activity: PetCareActivity; key: number } | null>(null)
  const [muted, setMuted] = useState(readMuted)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const sounds = useRef<PetSounds | null>(null)

  // Tysta lätena när appen göms, och släpp ljudkontexten när stationen stängs.
  useEffect(() => {
    const quiet = (): void => { if (document.hidden) sounds.current?.stop() }
    document.addEventListener('visibilitychange', quiet)
    return () => {
      document.removeEventListener('visibilitychange', quiet)
      sounds.current?.dispose()
      sounds.current = null
    }
  }, [])

  // Hjärtan och skål visas en kort stund, sedan är knapparna fria igen.
  useEffect(() => {
    if (!moment) return
    const t = window.setTimeout(() => setMoment(null), 2200)
    return () => window.clearTimeout(t)
  }, [moment])

  const pet = pets.find((p) => p.id === selectedId) ?? pets[0]
  if (!pet) return null
  const resting = pet.care?.resting ?? false
  const busy = moment !== null

  const care = (activity: PetCareActivity): void => {
    if (!canInteract || busy || (resting && activity !== 'rest' && activity !== 'wake')) return
    onCare(pet.id, activity)
    setMoment({ petId: pet.id, activity, key: Date.now() })
    if (activity === 'rest') sounds.current?.stop()
    else if (!muted) {
      sounds.current ??= new PetSounds()
      sounds.current.play(pet.species)
    }
  }

  const toggleSound = (): void => {
    const next = !muted
    setMuted(next)
    if (next) sounds.current?.stop()
    try { localStorage.setItem(MUTE_KEY, String(next)) } catch { /* frivillig inställning */ }
  }

  const select = (p: CampPet): void => {
    setSelectedId(p.id)
    setEditing(false)
    setMoment(null)
  }

  const lines = moment ? REACTIONS[moment.activity] : []
  const response = resting
    ? `${pet.name} sover tryggt i sin sovhörna.`
    : moment?.petId === pet.id
      ? lines[moment.key % lines.length](pet.name)
      : canInteract
        ? 'En klapp, en godbit, en lek eller en mysig tupplur. Du väljer.'
        : 'Vännerna har det bra. Kom tillbaka efter nästa övningspass.'
  const now = new Date()
  const memories = [
    `Ni har varit vänner i ${daysBetween(pet.foundAt, now)} ${daysBetween(pet.foundAt, now) === 1 ? 'dag' : 'dagar'}.`,
    `Ni hittade varandra i ${worldById(pet.foundInWorldId).name}.`,
    pet.care?.lastPlayedAt && `Senaste leken: ${whenText(pet.care.lastPlayedAt, now)}.`,
    pet.care?.lastFedAt && `Senaste godbiten: ${whenText(pet.care.lastFedAt, now)}.`,
    toyName && `Älsklingsleksak: ${toyName.toLowerCase()}.`,
  ].filter((m): m is string => Boolean(m))

  return (
    <section className="pet-house" aria-label="En stund med dina vänner">
      <div className="pet-house-toolbar">
        <p>Tryck på en vän för en stund tillsammans.</p>
        <button className="chip" aria-pressed={muted} onClick={toggleSound}>
          {muted ? 'Ljud av' : 'Ljud på'}
        </button>
      </div>

      <div className="pet-house-room">
        {hasTent || DEN_ART_READY ? (
          <img
            className="pet-house-backdrop"
            src={campImage(hasTent ? 'pet-tent-interior-v1' : 'pet-den-interior-v1')}
            alt={hasTent ? 'Ett ombonat husdjurstält med lyktor och fyra sovhörnor' : 'En mysig lya under trädrötterna'}
          />
        ) : <DenScene />}
        <div className="pet-house-firelight" aria-hidden="true" />
        {pets.slice(0, CORNERS.length).map((p, i) => {
          const index = cornerIndex(p, i)
          const corner = hasTent ? CORNERS[index] : DEN_SPOTS[index]
          // Bädden som står på vännens sovplats i lägret syns även här.
          const owned = items.find((item) => item.point === (p.bedPoint ?? `bed-${i + 1}`))
          const bed = owned && catalogItem(owned.itemId)
          return (
            <button
              key={p.id}
              className={`pet-house-resident ${index > 1 ? 'pet-house-front' : ''}${moment?.petId === p.id && moment.activity === 'play' ? ' pet-house-playing' : ''}`}
              style={{ left: `${corner.x}%`, top: `${corner.y}%` }}
              aria-label={`Välj ${p.name}`}
              aria-pressed={pet.id === p.id}
              onClick={() => select(p)}
            >
              {bed?.kind === 'bed' && <img className="pet-house-bed" src={itemImage(bed)} alt={bed.name} />}
              <div className="pet-house-animal">
                <PetSprite species={p.species} greeting={moment?.petId === p.id} resting={p.care?.resting} />
              </div>
              {moment?.petId === p.id && moment.activity === 'pet' && (
                <div key={moment.key} className="pet-house-hearts" aria-hidden="true">♥ <i>♥</i> ♥</div>
              )}
              {moment?.petId === p.id && moment.activity === 'feed' && (
                <div className="pet-food-bowl" aria-hidden="true"><i /><i /><i /></div>
              )}
              {moment?.petId === p.id && moment.activity === 'play' && toyName && (
                <span key={moment.key} className="pet-play-ball" aria-hidden="true" />
              )}
            </button>
          )
        })}
      </div>

      {pets.length > 1 && (
        <div className="pet-house-friends" aria-label="Välj husdjur">
          {pets.map((p) => (
            <button className="chip" key={p.id} aria-pressed={pet.id === p.id} onClick={() => select(p)}>{p.name}</button>
          ))}
        </div>
      )}

      <div className="pet-house-care">
        <div className="pet-house-closeup" aria-hidden="true">
          <PetSprite species={pet.species} greeting={moment?.petId === pet.id} resting={resting} />
        </div>
        <div>
          <span className="camp-eyebrow">En stund med din vän</span>
          <h3 className="display">{pet.name}</h3>
          <p>{petSpecies(pet.species).name} från {worldById(pet.foundInWorldId).name}</p>
          <div className="pet-care-actions">
            <button className="btn btn-primary" disabled={!canInteract || busy || resting} onClick={() => care('pet')}>
              ♡ Klappa {pet.name}
            </button>
            <button className="chip" disabled={!canInteract || busy || resting} onClick={() => care('feed')}>
              Ge en godbit
            </button>
            <button className="chip" disabled={!canInteract || busy || resting} onClick={() => care('play')}>
              {toyName ? `Lek med ${toyName.toLowerCase()}` : 'Lek tittut'}
            </button>
            <button className="chip" disabled={!canInteract || busy} onClick={() => care(resting ? 'wake' : 'rest')}>
              {resting ? 'Väck försiktigt' : 'Säg godnatt'}
            </button>
          </div>
          <p className="pet-house-response" role="status">{response}</p>
          <div className="pet-memories" aria-label={`Minnesboken om ${pet.name}`}>
            <span className="camp-eyebrow">Minnesboken</span>
            <ul>{memories.map((m) => <li key={m}>{m}</li>)}</ul>
          </div>
          <p className="camp-note">Godbitarna är gratis. Dina vänner har det alltid bra, även när du inte är här.</p>

          <details>
            <summary>Namn och sovplats</summary>
            {editing ? (
              <form onSubmit={(e) => {
                e.preventDefault()
                if (canInteract && name.trim()) { onRename(pet.id, name); setEditing(false) }
              }}>
                <label>Nytt namn<input value={name} maxLength={24} onChange={(e) => setName(e.target.value)} /></label>
                <button className="chip" disabled={!canInteract || !name.trim()}>Spara namn</button>
                <button className="chip" type="button" onClick={() => setEditing(false)}>Avbryt</button>
              </form>
            ) : (
              <button className="chip" disabled={!canInteract} onClick={() => { setName(pet.name); setEditing(true) }}>
                Byt namn
              </button>
            )}
            <label>
              Sovplats
              <select value={pet.bedPoint ?? 'bed-1'} disabled={!canInteract} onChange={(e) => onBed(pet.id, e.target.value)}>
                {CORNERS.map((corner, i) => <option key={corner.name} value={`bed-${i + 1}`}>{corner.name}</option>)}
              </select>
            </label>
            <p>Bädden du ställer på samma sovplats i lägret syns också här. Väljer två vänner samma hörn byter de plats.</p>
            <button className="chip" onClick={onPacking}>Välj bädd i packningen</button>
          </details>
        </div>
      </div>
    </section>
  )
}
