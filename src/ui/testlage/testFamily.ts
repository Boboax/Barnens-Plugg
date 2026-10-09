import type { BlixtKind, ChildProfile, SchoolYear, SkillState } from '../../domain/types'
import { MOMENTS, YEAR_ORDER } from '../../domain/curriculum'
import { emptyPetProgress } from '../../domain/pet-home'
import { backfillSeenWorlds, grantedYears, newSkillState, recomputeAvailability } from '../../engine/progress'
import { blixtBlockedMoments } from '../../engine/blixt'
import { petDay } from '../../engine/pet-home'

/* ============================================================
   Testläget: färdiga testbarn så att föräldern kan prova en ny
   version utan att först göra diagnos och pass. Finns bara i
   förhandsbyggen (__TESTLAGE__) och rör aldrig riktiga profiler —
   testbarnen känns igen på id-prefixet och kan tas bort i ett svep.
   ============================================================ */

export const TEST_ID_PREFIX = 'testbarn-'
export const isTestChild = (c: Pick<ChildProfile, 'id'>): boolean => c.id.startsWith(TEST_ID_PREFIX)

const ALL_BLIXT: BlixtKind[] = ['add-sub-0-10', 'add-sub-0-20', 'tabeller']

/** Ett testbarn placerat i sin årskurs: alla tidigare årskurser behärskade
    och erövrade, blixtarna klarade, diagnosen gjord och dagens pass klart
    (så att Kvällslägret har lägertid direkt). */
function testChild(name: string, schoolYear: SchoolYear, birthYear: number, color: string, now: Date): ChildProfile {
  const iso = now.toISOString()
  const reviewAt = new Date(now.getTime() + 21 * 86_400_000).toISOString().slice(0, 10)
  const before = YEAR_ORDER.slice(0, YEAR_ORDER.indexOf(schoolYear))
  const skills: Record<string, SkillState> = {}
  for (const m of MOMENTS) {
    const s = newSkillState(m.id)
    skills[m.id] = before.includes(m.year)
      ? { ...s, mastery: 'mastered', attempts: 20, correct: 18, review: { nextReviewAt: reviewAt, intervalDays: 21, passes: 2 } }
      : s
  }
  const blixt = Object.fromEntries(ALL_BLIXT.map((k) => [k, { best: 25, lastAt: iso, cleared: true, tier: 1 }]))
  const base: ChildProfile = {
    id: `${TEST_ID_PREFIX}${schoolYear}-${now.getTime()}`,
    name, color, birthYear, schoolYear,
    createdAt: iso, updatedAt: iso,
    skills, answers: [],
    diagnosis: { passesDone: 1, passesTotal: 1, done: true, probes: [] },
    dailyLimitMinutes: 120, usageSeconds: {}, chatEnabled: false,
    streak: { days: 3, lastActiveDate: iso.slice(0, 10) },
    seenMapIntro: true, seenStarIntro: true,
    conqueredYears: before,
    blixt,
    petProgress: { ...emptyPetProgress(), coins: 200, lastPracticeDay: petDay(now) },
  }
  const placed = { ...base, skills: recomputeAvailability(skills, grantedYears(base), blixtBlockedMoments(base)) }
  return { ...placed, seenWorlds: backfillSeenWorlds(placed.skills, placed.conqueredWorlds, placed.seenWorlds) }
}

/** Tre testbarn: FK (grodan väntar bakom stenen), åk 2 (har redan sin groda)
    och åk 4 (groda och några saker i packningen). */
export function testFamily(now: Date): ChildProfile[] {
  const fk = testChild('Test F', 'F', now.getFullYear() - 6, '#FF7A6E', now)
  fk.petProgress = { ...fk.petProgress, encounter: { species: 'woodland-frog', worldId: 'talens-dal' } }
  const frog = (worldId: string) => [{
    id: `frog-${now.getTime()}`, name: 'Mossa', species: 'woodland-frog' as const,
    foundAt: now.toISOString(), foundInWorldId: worldId, bedPoint: 'bed-1',
  }]
  const ak2 = testChild('Test 2', '2', now.getFullYear() - 8, '#3FBF87', now)
  ak2.petProgress = { ...ak2.petProgress, pets: frog('talens-dal') }
  const ak4 = testChild('Test 4', '4', now.getFullYear() - 10, '#4A56C6', now)
  ak4.petProgress = {
    ...ak4.petProgress,
    pets: frog('multiplikationsskogen'),
    items: [
      { id: 'test-bed', itemId: 'fern-bed', boughtAt: now.toISOString(), point: 'bed-1' },
      { id: 'test-lantern', itemId: 'camp-lantern', boughtAt: now.toISOString() },
    ],
  }
  return [fk, ak2, ak4]
}
