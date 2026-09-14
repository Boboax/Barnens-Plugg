import type { Household } from '../domain/types'
import { DAILY_PET_COINS, FURNITURE, HOME_VISIT_SECONDS, PET_SPECIES, petSpecies, campPets } from '../domain/pet-home'

/** Lokal kalenderdag: ett kvällspass ska tillhöra samma dag som barnet ser. */
export function petDay(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** Endast ett avslutat, icke-tomt pass ger mynt. Upprepade effekter är ofarliga. */
export function completePetPractice(h: Household, childId: string, completed: number, planned: number, at: Date, worldId?: string): Household {
  if (!Number.isInteger(planned) || planned < 1 || completed !== planned) return h
  const day = petDay(at)
  const child = h.children.find((c) => c.id === childId)
  if (!child || (child.petProgress?.lastPracticeDay ?? '') >= day) return h
  const pets = campPets(child.petProgress)
  const candidate = (PET_SPECIES.find((p) => p.worldId === worldId) ?? PET_SPECIES[0]).id
  const pending = child.petProgress?.encounterSpecies
  const encounterSpecies = pending && !pets.some(p=>p.species===pending) ? pending : !pets.some(p=>p.species===candidate) ? candidate : undefined
  return {
    ...h,
    children: h.children.map((c) => c.id !== childId ? c : {
      ...c, updatedAt: at.toISOString(),
      petProgress: { ...c.petProgress, coins: (c.petProgress?.coins ?? 0) + DAILY_PET_COINS, lastPracticeDay: day,
        encounterSpecies },
    }),
  }
}

export function adoptPet(h: Household, childId: string, name: string, at: Date): Household {
  const child = h.children.find((c) => c.id === childId)
  const clean = name.trim().slice(0, 24)
  const pets = campPets(child?.petProgress)
  const species = petSpecies(child?.petProgress?.encounterSpecies).id
  if (!child?.petProgress || !clean || pets.some(p=>p.species===species) || (pets.length>0 && !child.petProgress.encounterSpecies)) return h
  const newPet = {id:`${species}-${at.toISOString()}`, name:clean, foundAt:at.toISOString(),species,bedPoint:`bed-${pets.length+1}`}
  return { ...h, children: h.children.map((c) => c.id !== childId ? c : {
    ...c, updatedAt: at.toISOString(), petProgress: { ...child.petProgress!, pet: child.petProgress!.pet ?? newPet, pets:[...pets,newPet],encounterSpecies:undefined },
  }) }
}

export function homeSecondsLeft(h: Household, childId: string, at: Date): number {
  const p = h.children.find((c) => c.id === childId)?.petProgress
  if (!p || p.lastPracticeDay !== petDay(at)) return 0
  return Math.max(0, HOME_VISIT_SECONDS - (p.visit?.day === petDay(at) ? p.visit.seconds : 0))
}

export function spendHomeTime(h: Household, childId: string, seconds: number, at: Date): Household {
  if (!Number.isFinite(seconds) || seconds <= 0 || homeSecondsLeft(h, childId, at) <= 0) return h
  const day = petDay(at)
  return { ...h, children: h.children.map((c) => {
    if (c.id !== childId || !c.petProgress) return c
    const used = c.petProgress.visit?.day === day ? c.petProgress.visit.seconds : 0
    return { ...c, updatedAt: at.toISOString(), petProgress: { ...c.petProgress,
      visit: { day, seconds: Math.min(HOME_VISIT_SECONDS, used + seconds) },
    } }
  }) }
}

/** Avdrag och ägande skrivs i SAMMA uppdatering. Dubbeltryck kostar aldrig dubbelt. */
export function buyFurniture(h: Household, childId: string, itemId: string, at: Date): Household {
  const item = FURNITURE.find((f) => f.id === itemId)
  const p = h.children.find((c) => c.id === childId)?.petProgress
  if (!item || !p?.pet || p.coins < item.price || h.petHome?.owned[itemId] || homeSecondsLeft(h, childId, at) <= 0) return h
  return { ...h,
    children: h.children.map((c) => c.id !== childId ? c : {
      ...c, updatedAt: at.toISOString(), petProgress: { ...p, coins: p.coins - item.price },
    }),
    petHome: {
      ...h.petHome,
      owned: { ...h.petHome?.owned, [itemId]: { childId, boughtAt: at.toISOString() } },
      equipped: { ...h.petHome?.equipped, [item.slot]: itemId },
    },
  }
}

export function equipFurniture(h: Household, childId: string, itemId: string, at: Date): Household {
  const item = FURNITURE.find((f) => f.id === itemId)
  if (!item || !h.petHome?.owned[itemId] || !h.children.find((c) => c.id === childId)?.petProgress?.pet
    || homeSecondsLeft(h, childId, at) <= 0 || h.petHome.equipped[item.slot] === itemId) return h
  return { ...h, petHome: { ...h.petHome, equipped: { ...h.petHome.equipped, [item.slot]: itemId } } }
}

