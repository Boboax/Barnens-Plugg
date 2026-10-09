import type { ChildProfile } from '../domain/types'
import type { CampPet, PetCareActivity, PetProgress } from '../domain/pet-home'
import { CAMP_POINTS, OUTFITS, campItemLimit, campPoint, catalogItem, isCampUnlockMet, ownsOutfit } from '../domain/camp'
import { homeSecondsLeft } from './pet-home'

/* ============================================================
   Alla ändringar i Kvällslägret går genom changeCamp.

   Regler (samma som referensgrenen, nu på barnet):
   - Ingen ändring utan dagens lägertid och minst en vän.
   - Köp är atomiska: mynt dras och föremålet läggs till i SAMMA
     uppdatering, och köpets id (purchaseId) gör det idempotent —
     ett dubbeltryck eller en omspelad åtgärd kostar aldrig dubbelt.
   - Nekad åtgärd returnerar samma barn-objekt (ingen stämpel, ingen synk).
   - Bara petProgress ändras. skills/answers rörs aldrig.
   ============================================================ */

export type CampAction =
  | { type: 'buy'; itemId: string; purchaseId: string }
  /** point saknas = packa undan. */
  | { type: 'place'; instanceId: string; point?: string }
  | { type: 'rename'; petId: string; name: string }
  | { type: 'bed'; petId: string; point: string }
  | { type: 'care'; petId: string; activity: PetCareActivity }
  | { type: 'outfit'; outfitId: string }

export function changeCamp(child: ChildProfile, action: CampAction, at: Date): ChildProfile {
  const p = child.petProgress
  if (p.pets.length === 0 || homeSecondsLeft(child, at) <= 0) return child
  const next = applyAction(child, p, action, at)
  return next ? { ...child, petProgress: next } : child
}

/** Returnerar nytt petProgress, eller undefined när åtgärden nekas. */
function applyAction(
  child: ChildProfile,
  p: PetProgress,
  action: CampAction,
  at: Date,
): PetProgress | undefined {
  switch (action.type) {
    case 'buy': {
      const item = catalogItem(action.itemId)
      if (!item || !action.purchaseId) return undefined
      if (p.items.some((owned) => owned.id === action.purchaseId)) return undefined
      const ownedCount = p.items.filter((owned) => owned.itemId === item.id).length
      if (!isCampUnlockMet(item.unlock, child) || ownedCount >= campItemLimit(item, child)) return undefined
      if (p.coins < item.price) return undefined
      return {
        ...p,
        coins: p.coins - item.price,
        items: [...p.items, { id: action.purchaseId, itemId: item.id, boughtAt: at.toISOString() }],
      }
    }

    case 'place': {
      const owned = p.items.find((i) => i.id === action.instanceId)
      const item = owned && catalogItem(owned.itemId)
      if (!owned || !item) return undefined
      if (action.point !== undefined) {
        // Platsen måste passa föremålets sort och vara ledig.
        const point = campPoint(action.point)
        if (!point || point.kind !== item.kind) return undefined
        if (p.items.some((i) => i.id !== owned.id && i.point === point.id)) return undefined
      }
      if (owned.point === action.point) return undefined
      return { ...p, items: p.items.map((i) => (i.id === owned.id ? { ...i, point: action.point } : i)) }
    }

    case 'rename': {
      const pet = p.pets.find((v) => v.id === action.petId)
      const name = action.name.trim().slice(0, 24)
      if (!pet || !name || name === pet.name) return undefined
      return { ...p, pets: p.pets.map((v) => (v.id === pet.id ? { ...v, name } : v)) }
    }

    case 'bed': {
      const pet = p.pets.find((v) => v.id === action.petId)
      const isBed = CAMP_POINTS.some((s) => s.id === action.point && s.kind === 'bed')
      if (!pet || !isBed || pet.bedPoint === action.point) return undefined
      // Väljer två vänner samma hörn byter de plats — ingen blir utan.
      const occupant = p.pets.find((v) => v.id !== pet.id && v.bedPoint === action.point)
      return {
        ...p,
        pets: p.pets.map((v) => {
          if (v.id === pet.id) return { ...v, bedPoint: action.point }
          if (v.id === occupant?.id) return { ...v, bedPoint: pet.bedPoint }
          return v
        }),
      }
    }

    case 'care': {
      const pet = p.pets.find((v) => v.id === action.petId)
      if (!pet) return undefined
      // En sovande vän väcks inte av en godbit — först "Väck försiktigt".
      if (pet.care?.resting && (action.activity === 'feed' || action.activity === 'pet')) return undefined
      return { ...p, pets: p.pets.map((v) => (v.id === pet.id ? withCare(v, action.activity, at) : v)) }
    }

    case 'outfit': {
      const outfit = OUTFITS.find((o) => o.id === action.outfitId)
      if (!outfit) return undefined
      const owned = ownsOutfit(child, outfit)
      if (!owned && (!isCampUnlockMet(outfit.unlock, child) || p.coins < outfit.price)) return undefined
      if (owned && p.outfit === outfit.id) return undefined
      // Köpt mantel tas på gratis igen; ny mantel köps och tas på i ett steg.
      return {
        ...p,
        coins: owned ? p.coins : p.coins - outfit.price,
        outfit: outfit.id,
        outfits: owned || outfit.price === 0 ? p.outfits : [...(p.outfits ?? []), outfit.id],
      }
    }
  }
}

function withCare(pet: CampPet, activity: PetCareActivity, at: Date): CampPet {
  const care = { ...pet.care }
  if (activity === 'rest') care.resting = true
  else if (activity === 'wake') care.resting = false
  else if (activity === 'feed') care.lastFedAt = at.toISOString()
  else care.lastPettedAt = at.toISOString()
  return { ...pet, care }
}
