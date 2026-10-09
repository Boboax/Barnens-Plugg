import type { CSSProperties } from 'react'
import type { ChildProfile } from '../../../domain/types'
import type { CampPet } from '../../../domain/pet-home'
import { CAMP_POINTS, campPoint, catalogItem, ownsCampItem, type CampCatalogItem } from '../../../domain/camp'
import { giftById, type WorldGift } from '../../../domain/world-gifts'
import { CampHero } from './CampHero'
import { PetSprite } from './PetSprite'
import { campImage, itemImage } from './campArt'

/* Lägervyn: den målade kvällsscenen med elden, vännerna, hjälten och de
   saker barnet ställt fram. Allt interaktivt ligger som knappar ovanpå
   bilden i procentkoordinater (CAMP_POINTS), så scenen skalar med iPadens
   bredd. Text på bilden sitter alltid på egna mörka plattor — lägerbilden
   går från eldsken till nattsvart (CLAUDE.md: garanterad kontrast). */

interface Props {
  child: ChildProfile
  canInteract: boolean
  /** Föremålet som just flyttas (instans-id), eller tom sträng. */
  placingId: string
  /** Vara som provas i handelsboden — visas som skiss på första lediga plats. */
  preview?: CampCatalogItem
  /** Vännen som nyss hälsade (hälsningsposen spelas en gång). */
  greetingPetId: string
  onGreet(pet: CampPet): void
  onOpenFriends(): void
  onOpenWardrobe(): void
  onStartPlacing(instanceId: string): void
  onPlace(point?: string): void
  onMessage(text: string): void
}

const FIREFLIES = Array.from({ length: 9 }, (_, i) => i)

export function CampView(props: Props) {
  const { child, canInteract, placingId, preview, greetingPetId } = props
  const { pets, items } = child.petProgress
  const placing = items.find((i) => i.id === placingId)
  const placingItem = placing && catalogItem(placing.itemId)
  const previewPoint = preview && CAMP_POINTS.find((s) => s.kind === preview.kind && !items.some((i) => i.point === s.id))
  const tent = catalogItem('pet-tent')
  const gifts = (child.worldGifts ?? [])
    .map(giftById)
    .filter((gift): gift is WorldGift => gift !== undefined && (gift.kind === 'camp' || gift.kind === 'pet'))
    .slice(-8)

  return (
    <>
      <div className="camp-scene" aria-label="Ditt läger med vänner och saker">
        <img className="camp-scene-background" src={campImage('evening-camp')} alt="Ett läger vid en sjö i skymningen" />
        <div className="camp-glow" aria-hidden="true" />
        <div className="camp-fire" aria-hidden="true"><i /><i /><i /><b /><b /><b /></div>
        <div className="camp-fireflies" aria-hidden="true">
          {FIREFLIES.map((i) => <i key={i} style={{ '--i': i } as CSSProperties} />)}
        </div>

        {gifts.length > 0 && (
          <div className="camp-world-gifts" aria-label="Dina världsgåvor i lägret">
            {gifts.map((gift) => (
              <button
                key={gift.id}
                className={`camp-world-gift camp-world-gift--${gift.kind}`}
                aria-label={gift.name}
                onClick={() => props.onMessage(gift.kind === 'pet' ? gift.description : gift.effect)}
              >
                <span aria-hidden="true">{gift.emoji}</span>
              </button>
            ))}
          </div>
        )}

        {tent && ownsCampItem(child, tent.id) && (
          <button className="camp-tent" aria-label="Gå in i husdjurstältet" onClick={props.onOpenFriends}>
            <img src={itemImage(tent)} alt="" />
          </button>
        )}

        {items.map((instance) => {
          const point = campPoint(instance.point)
          const item = catalogItem(instance.itemId)
          if (!point || !item) return null
          return (
            <button
              key={instance.id}
              className={`camp-placed ${item.kind === 'light' ? 'camp-light' : ''}`}
              style={{ left: `${point.x}%`, top: `${point.y}%`, width: `${point.width}%` }}
              aria-label={`${item.name}, ${point.name}. Flytta eller packa undan`}
              onClick={() => props.onStartPlacing(instance.id)}
            >
              <img src={itemImage(item)} alt="" />
            </button>
          )
        })}

        {preview && previewPoint && (
          <img
            className="camp-placement-preview"
            style={{ left: `${previewPoint.x}%`, top: `${previewPoint.y}%`, width: `${previewPoint.width}%` }}
            src={itemImage(preview)}
            alt={`Så kan ${preview.name.toLowerCase()} se ut i lägret`}
          />
        )}

        {pets.slice(0, 4).map((pet, i) => {
          const point = campPoint(pet.bedPoint) ?? CAMP_POINTS[i]
          return (
            <button
              key={pet.id}
              className="camp-pet"
              style={{ left: `${point.x}%`, top: `${point.y - 4}%` }}
              disabled={!canInteract}
              aria-label={`Hälsa på ${pet.name}`}
              onClick={() => props.onGreet(pet)}
            >
              <PetSprite species={pet.species} greeting={greetingPetId === pet.id} resting={pet.care?.resting} />
              <span>{pet.name}</span>
            </button>
          )
        })}

        <button className="camp-player" aria-label="Öppna garderoben" onClick={props.onOpenWardrobe}>
          <CampHero child={child} />
        </button>

        {placingItem && CAMP_POINTS.filter((s) => s.kind === placingItem.kind).map((point) => (
          <button
            key={point.id}
            className="camp-placement-target"
            style={{ left: `${point.x}%`, top: `${point.y}%` }}
            disabled={!canInteract || items.some((i) => i.point === point.id && i.id !== placingId)}
            aria-label={`Ställ på ${point.name.toLowerCase()}`}
            onClick={() => props.onPlace(point.id)}
          >
            ＋<span>{point.name}</span>
          </button>
        ))}
      </div>

      {placingItem && (
        <div className="camp-placement-bar">
          <strong>Välj en ledig plats för {placingItem.name.toLowerCase()}.</strong>
          <button className="chip" disabled={!canInteract || !placing?.point} onClick={() => props.onPlace(undefined)}>
            Packa undan
          </button>
          <button className="chip" onClick={() => props.onStartPlacing('')}>Avbryt</button>
        </div>
      )}
    </>
  )
}
