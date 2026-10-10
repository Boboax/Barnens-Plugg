import type { ChildProfile } from '../domain/types'
import { DAILY_PET_COINS, FIRST_PET_SPECIES, HOME_VISIT_SECONDS, type CampPet, type PetProgress } from '../domain/pet-home'

/* ============================================================
   Kvällslägrets vana: dagsmynt, upptäckt och lägertid.

   Rena funktioner på ETT barn. Oförändrat barn returneras som samma
   objekt — då stämplar store.patchChild inte updatedAt, och en no-op
   (dubbeltryck, StrictMode-effekt) blir aldrig en synk eller ett köp.
   Inget här rör skills, answers eller usageSeconds.
   ============================================================ */

/** Lokal kalenderdag: ett kvällspass ska tillhöra samma dag som barnet ser
    (todayISO i store är UTC och byter dag mitt i en svensk kväll). */
export function petDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

const withProgress = (child: ChildProfile, patch: Partial<PetProgress>): ChildProfile => ({
  ...child,
  petProgress: { ...child.petProgress, ...patch },
})

/**
 * Ett AVSLUTAT pass ger dagens mynt — det första per lokal kalenderdag,
 * och "pass" är all träning som spelats till slut: övningspass, blixtrunda,
 * koll, boss eller väktare (de senare anropar med completed = planned = 1).
 * oavsett antal rätt (vana, inte prestation). Avbrutna eller tomma pass
 * ger inget. Klockan bakåt ger inget (jämförelsen är `>=` på datumsträngen).
 *
 * Har barnet ingen vän än väcks upptäckten: skogsgrodan, "från" världen
 * barnet just tränade i. Fler vänner kommer vid milstolpar (etapp 2).
 */
export function completePetPractice(
  child: ChildProfile,
  completed: number,
  planned: number,
  worldId: string,
  at: Date,
): ChildProfile {
  if (!Number.isInteger(planned) || planned < 1 || completed !== planned) return child
  const p = child.petProgress
  const day = petDay(at)
  if (p.lastPracticeDay >= day) return child
  const firstFriendWaiting = p.pets.length === 0 && !p.encounter
  return withProgress(child, {
    coins: p.coins + DAILY_PET_COINS,
    lastPracticeDay: day,
    encounter: firstFriendWaiting ? { species: FIRST_PET_SPECIES, worldId } : p.encounter,
  })
}

/** Barnet namnger vännen bakom stenen. Kräver en väntande upptäckt; samma
    art kan aldrig adopteras två gånger. */
export function adoptPet(child: ChildProfile, name: string, at: Date): ChildProfile {
  const p = child.petProgress
  const clean = name.trim().slice(0, 24)
  const encounter = p.encounter
  if (!encounter || !clean || p.pets.some((pet) => pet.species === encounter.species)) return child
  const pet: CampPet = {
    id: `${encounter.species}-${at.getTime()}`,
    name: clean,
    species: encounter.species,
    foundAt: at.toISOString(),
    foundInWorldId: encounter.worldId,
    bedPoint: `bed-${p.pets.length + 1}`,
  }
  return withProgress(child, { pets: [...p.pets, pet], encounter: undefined })
}

/** Kvar av dagens lägertid. Ingen tid alls utan dagens avslutade pass —
    lägret är kvällsstunden EFTER träningen, aldrig i stället för den. */
export function homeSecondsLeft(child: ChildProfile, at: Date): number {
  const p = child.petProgress
  const day = petDay(at)
  if (p.lastPracticeDay !== day) return 0
  const used = p.visit?.day === day ? p.visit.seconds : 0
  return Math.max(0, HOME_VISIT_SECONDS - used)
}

/** Bokför förbrukad lägertid. Kallas i klumpar (var 15:e s och vid utgång)
    från PetHomeScreen — inte varje sekund, som gav 180 lagringsskrivningar
    per besök och lät lägret alltid "vinna" synkkrocken. */
export function spendHomeTime(child: ChildProfile, seconds: number, at: Date): ChildProfile {
  if (!Number.isFinite(seconds) || seconds <= 0 || homeSecondsLeft(child, at) <= 0) return child
  const day = petDay(at)
  const p = child.petProgress
  const used = p.visit?.day === day ? p.visit.seconds : 0
  return withProgress(child, {
    visit: { day, seconds: Math.min(HOME_VISIT_SECONDS, used + Math.round(seconds)) },
  })
}
