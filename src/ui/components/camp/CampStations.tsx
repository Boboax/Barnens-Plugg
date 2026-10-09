import { useState } from 'react'
import type { ChildProfile } from '../../../domain/types'
import type { PetCareActivity } from '../../../domain/pet-home'
import { petSpecies } from '../../../domain/pet-home'
import { ownsCampItem, ownsOutfit, outfitById, visibleOutfits } from '../../../domain/camp'
import { giftById, type WorldGift } from '../../../domain/world-gifts'
import { worldById } from '../../../domain/worlds'
import type { CampAction } from '../../../engine/camp'
import { CampHero } from './CampHero'
import { PetHouse } from './PetHouse'
import { petStill } from './campArt'

/* Lägrets stationer: vännerna (omsorg), garderoben (mantlar) och
   Bokhörnan (minnen av var vännerna och gåvorna hittades).
   Rustkammaren med vapen och bossreliker kommer med striden (etapp 3). */

export type StationId = 'friends' | 'wardrobe' | 'books'

export const stationName = (id: StationId, child: ChildProfile): string => ({
  friends: ownsCampItem(child, 'pet-tent') ? 'Husdjurstältet' : 'Vännerna',
  wardrobe: 'Garderoben',
  books: 'Bokhörnan',
})[id]

interface Props {
  station: StationId
  child: ChildProfile
  canInteract: boolean
  onChange(action: CampAction): void
  onMessage(text: string): void
  onPacking(): void
}

export function CampStations({ station, child, canInteract, onChange, onMessage, onPacking }: Props) {
  if (station === 'friends') {
    return (
      <PetHouse
        pets={child.petProgress.pets}
        items={child.petProgress.items}
        hasTent={ownsCampItem(child, 'pet-tent')}
        canInteract={canInteract}
        onCare={(petId, activity: PetCareActivity) => onChange({ type: 'care', petId, activity })}
        onRename={(petId, name) => onChange({ type: 'rename', petId, name })}
        onBed={(petId, point) => onChange({ type: 'bed', petId, point })}
        onPacking={onPacking}
      />
    )
  }
  if (station === 'wardrobe') {
    return <Wardrobe child={child} canInteract={canInteract} onChange={onChange} onMessage={onMessage} />
  }
  return <BookCorner child={child} />
}

/** Barnet provar fritt; inget köps förrän det trycker på knappen. */
function Wardrobe({ child, canInteract, onChange, onMessage }: {
  child: ChildProfile
  canInteract: boolean
  onChange(action: CampAction): void
  onMessage(text: string): void
}) {
  const [trying, setTrying] = useState<string>()
  const outfits = visibleOutfits(child)
  const active = outfitById(trying ?? child.petProgress.outfit)
  const owned = ownsOutfit(child, active)
  const coins = child.petProgress.coins
  const wearing = outfitById(child.petProgress.outfit).id === active.id

  return (
    <section className="camp-panel camp-wardrobe">
      <div className="camp-fitting">
        <CampHero child={child} outfitId={active.id} />
        <span>{trying && !owned ? 'Provar · inget köpt ännu' : child.name}</span>
      </div>
      <div>
        <p>Prova en mantel. Följeslagarmantlarna dyker upp när rätt vän har flyttat in. Manteln syns i lägret och påverkar inte matteäventyren.</p>
        <div className="camp-outfits">
          {outfits.map((o) => (
            <button key={o.id} className="camp-outfit-option" aria-pressed={active.id === o.id} onClick={() => setTrying(o.id)}>
              <span className="camp-fabric" style={{ background: o.color, borderColor: o.trim }} aria-hidden="true" />
              {o.name}
              <small>{ownsOutfit(child, o) ? 'I garderoben' : `${o.price} mynt`}</small>
            </button>
          ))}
        </div>
        <h3 className="display">{active.name}</h3>
        <button
          className="btn btn-primary"
          disabled={!canInteract || wearing || (!owned && coins < active.price)}
          onClick={() => {
            onChange({ type: 'outfit', outfitId: active.id })
            setTrying(undefined)
            onMessage(`${active.name} är på!`)
          }}
        >
          {wearing ? 'Den har du på dig' : owned ? 'Ta på manteln'
            : coins < active.price ? `Kostar ${active.price} mynt` : `Köp och ta på · ${active.price} mynt`}
        </button>
        {trying && <button className="chip" onClick={() => setTrying(undefined)}>Tillbaka till min mantel</button>}
      </div>
    </section>
  )
}

/** Minnen: varje vän med världen den hittades i, och alla världsgåvor. */
function BookCorner({ child }: { child: ChildProfile }) {
  const gifts = (child.worldGifts ?? [])
    .map(giftById)
    .filter((gift): gift is WorldGift => gift !== undefined)
  return (
    <section className="camp-panel camp-library">
      <p>Upptäckter från världarna du och dina vänner har besökt.</p>
      <div className="camp-book-grid">
        {child.petProgress.pets.map((pet) => (
          <article className="camp-book" key={pet.id}>
            <img src={petStill(pet.species)} alt="" />
            <h3 className="display">{worldById(pet.foundInWorldId).name}</h3>
            <p>Här hittade du {pet.name}.</p>
            <span>{petSpecies(pet.species).name}</span>
          </article>
        ))}
      </div>
      <h3 className="display">Världsgåvor</h3>
      {gifts.length > 0 ? (
        <div className="camp-gift-library">
          {gifts.map((gift) => (
            <article key={gift.id}>
              <span aria-hidden="true">{gift.emoji}</span>
              <strong>{gift.name}</strong>
              <small>{gift.effect}</small>
            </article>
          ))}
        </div>
      ) : (
        <p className="camp-note">Öppna en skattkista efter ett starkt pass, så hamnar gåvan här.</p>
      )}
    </section>
  )
}
