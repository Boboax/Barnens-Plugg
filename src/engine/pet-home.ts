import type { ChildProfile } from '../domain/types'
import {
  DAILY_PET_COINS, FIRST_PET_SPECIES, HOME_VISIT_SECONDS, PET_ORDER,
  type CampPet, type PetProgress, type PetSpeciesId, type PetStage,
} from '../domain/pet-home'
import type { MasteryState } from '../domain/types'

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
 * Varje avslutat pass (inte bara dagens första) kan också väcka nästa
 * vän: grodan efter första passet, sedan en vän per milstolpe
 * (friendsEarned). Bara EN upptäckt väntar åt gången — en tioåring som
 * redan passerat alla milstolpar får vännerna en i taget, pass för pass,
 * i stället för fyra på en gång. Vännen kommer "från" världen barnet
 * just tränade i.
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
  const firstToday = p.lastPracticeDay < day
  const species = p.encounter ? undefined : nextFriendSpecies(child)
  if (!firstToday && !species) return child
  return withProgress(child, {
    ...(firstToday ? { coins: p.coins + DAILY_PET_COINS, lastPracticeDay: day } : {}),
    encounter: species ? { species, worldId } : p.encounter,
  })
}

/* ---------- Etapp 2: milstolpar och tillväxt ---------- */

/** Moment som räknas som behärskade. 'needs-review' var behärskat och
    räknas fortfarande — annars kunde en vän krympa när ett moment går
    till repetition, och en vän får aldrig krympa. */
const GROWN: ReadonlySet<MasteryState> = new Set<MasteryState>(['mastered', 'star', 'needs-review'])

export const masteredCount = (child: ChildProfile): number =>
  Object.values(child.skills).filter((s) => GROWN.has(s.mastery)).length

/**
 * Hur många vänner barnet har förtjänat: grodan (första passet) plus en
 * per milstolpe — första RIKTIGT besegrade årsväktaren (skänkta fjärranår
 * räknas inte, de ligger inte i conqueredYears), första världsbossen och
 * första klarade blixten. Milstolparna är barnets egna framsteg, aldrig
 * poäng eller tid (princip 3).
 */
export function friendsEarned(child: ChildProfile): number {
  const milestones = [
    (child.conqueredYears?.length ?? 0) > 0,
    (child.conqueredWorlds?.length ?? 0) > 0,
    Object.values(child.blixt ?? {}).some((b) => b?.cleared === true),
  ].filter(Boolean).length
  return Math.min(PET_ORDER.length, 1 + milestones)
}

/** Nästa vän som väntar bakom stenen, eller undefined. */
export function nextFriendSpecies(child: ChildProfile): PetSpeciesId | undefined {
  const pets = child.petProgress.pets
  if (pets.length === 0) return FIRST_PET_SPECIES
  if (pets.length >= friendsEarned(child)) return undefined
  return PET_ORDER.find((s) => !pets.some((pet) => pet.species === s))
}

/** Tillväxt sedan vännen hittades, i behärskade moment: 0–2 unge,
    3–6 ung, 7–12 vuxen, 13+ följeslagare (startvärden enligt planen). */
const STAGE_FROM = [0, 3, 7, 13] as const

/**
 * Vännens stadium. Räknas vid varje rendering och sparas aldrig, så det
 * kan inte bli fel i synk eller backa (behärskade moment tas aldrig bort).
 * En vän från före etapp 2 (saknar masteredAtFound) var redan vuxen i
 * barnets ögon och börjar därför på stadie 3 — den växer, men krymper aldrig.
 */
export function petStage(child: ChildProfile, pet: CampPet): PetStage {
  const legacy = pet.masteredAtFound === undefined
  const growth = masteredCount(child) - (pet.masteredAtFound ?? 0)
  const fromGrowth = (STAGE_FROM.filter((n) => growth >= n).length || 1) as PetStage
  return legacy ? (Math.max(3, fromGrowth) as PetStage) : fromGrowth
}

/** Har vännen vuxit sedan barnet senast såg den? (för "har växt!"-rutan) */
export const petGrewUnseen = (child: ChildProfile, pet: CampPet): boolean =>
  petStage(child, pet) > (pet.seenStage ?? (pet.masteredAtFound === undefined ? 3 : 1))

/** Barnet har sett att vännen växt. Samma objekt om inget ändras. */
export function markPetGrowthSeen(child: ChildProfile, petId: string): ChildProfile {
  const p = child.petProgress
  const pet = p.pets.find((v) => v.id === petId)
  if (!pet || !petGrewUnseen(child, pet)) return child
  const stage = petStage(child, pet)
  return withProgress(child, { pets: p.pets.map((v) => (v.id === petId ? { ...v, seenStage: stage } : v)) })
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
    // Tillväxten räknas härifrån: varje ny vän börjar som unge.
    masteredAtFound: masteredCount(child),
    seenStage: 1,
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
