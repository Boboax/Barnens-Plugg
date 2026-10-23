import type { ChildProfile, SchoolYear, SkillState } from '../domain/types'
import { momentById, YEAR_ORDER } from '../domain/curriculum'
import { hasGenerator } from '../generators'
import { grantedYears, isDistantYear, recomputeAvailability } from './progress'
import { blixtBlockedMoments } from './blixt'
import { BOSS_READY_RATING } from './rating'

/* ============================================================
   Träna om och backa — förälderns verktyg (okt 2026).

   Analysen av barnens pass visade två sorters "klart" som inte betydde
   att barnet kunde momentet: moment som blev klara via den gamla
   diagnosen eller en boss utan att barnet övat (1–3 svar, ibland fel),
   och moment som klarades på låg nivå när kollen ännu testade kring
   barnets egen nivå. Och en sexåring som släppts fram till åk 1-stoff han
   inte var redo för.

   Föräldern väljer (i föräldraläget, PIN-skyddat — princip 5):
   - Träna om: valda moment öppnas igen. Barnet behåller allt annat —
     besegrade väktare, troféer, vänner och mynt — och tränar om momenten
     med filmerna, en efter en i läroplanens ordning. Kollen kräver två
     dagar och årskursnivå som för alla moment.
   - Backa till en årskurs: senare årskurser stängs igen (väktaren för den
     valda årskursen får mötas på nytt), osäkra moment där låses och de
     osäkra i den valda årskursen öppnas för omträning. Säkra moment (hög
     säkerhet och tränade på riktigt) behålls som klara.

   Rena funktioner; samma objekt tillbaka när inget ändras.
   ============================================================ */

/** Färre övningssvar än så = momentet blev aldrig tränat på riktigt. */
const MIN_PRACTICED = 4
/** Under den här säkerheten räknas momentet som osäkert. */
const WEAK_RATING = 600

/** aldrig-ovat: knappt några egna svar. osaker: låg träffsäkerhet.
    latt-niva: bra träffsäkerhet men mest på lätta nivåer (låg rating) —
    kan räcka, föräldern avgör. */
export type WeakReason = 'aldrig-ovat' | 'osaker' | 'latt-niva'

export interface WeakMoment {
  momentId: string
  title: string
  year: SchoolYear
  reason: WeakReason
  practiced: number
  accuracy: number | null
}

const DONE = new Set(['mastered', 'needs-review', 'boss-ready'])

function evidence(child: ChildProfile, momentId: string): { practiced: number; accuracy: number | null } {
  const own = child.answers.filter((a) => a.momentId === momentId && a.context !== 'diagnos')
  return { practiced: own.length, accuracy: own.length ? own.filter((a) => a.correct).length / own.length : null }
}

function weakness(child: ChildProfile, s: SkillState): WeakMoment | undefined {
  const m = momentById(s.momentId)
  if (!hasGenerator(m.generatorId)) return undefined
  const { practiced, accuracy } = evidence(child, s.momentId)
  const reason: WeakReason | undefined =
    practiced < MIN_PRACTICED ? 'aldrig-ovat'
      : accuracy !== null && accuracy < 0.7 ? 'osaker'
        : s.rating < WEAK_RATING ? 'latt-niva'
          : undefined
  return reason ? { momentId: s.momentId, title: m.title, year: m.year, reason, practiced, accuracy } : undefined
}

/**
 * Klara moment som barnet inte visat att det kan: aldrig tränade på riktigt,
 * eller med låg säkerhet. Diamantvunna (star) räknas som säkra, liksom
 * fjärranår långt under barnets årskurs. I läroplanens ordning.
 */
export function weakMoments(child: ChildProfile): WeakMoment[] {
  return Object.values(child.skills)
    .filter((s) => DONE.has(s.mastery) && !isDistantYear(momentById(s.momentId).year, child.schoolYear))
    .map((s) => weakness(child, s))
    .filter((w): w is WeakMoment => !!w)
    .sort((a, b) => YEAR_ORDER.indexOf(a.year) - YEAR_ORDER.indexOf(b.year))
}

const reopen = (s: SkillState, today: string): SkillState => ({
  ...s, mastery: 'in-progress', review: undefined, firstPracticedOn: today, restDay: undefined,
})

const settle = (child: ChildProfile, skills: Record<string, SkillState>, conqueredYears = child.conqueredYears): ChildProfile => {
  const next = { ...child, conqueredYears }
  return { ...next, skills: recomputeAvailability(skills, grantedYears(next), blixtBlockedMoments(next)) }
}

/** Öppna de valda momenten igen för omträning. Allt annat behålls. */
export function retrainMoments(child: ChildProfile, momentIds: readonly string[], today: string): ChildProfile {
  const skills = { ...child.skills }
  let changed = false
  for (const id of momentIds) {
    const s = skills[id]
    if (!s || !DONE.has(s.mastery)) continue
    skills[id] = reopen(s, today)
    changed = true
  }
  return changed ? settle(child, skills) : child
}

/**
 * Backa till en årskurs: senare årskurser (och väktaren för den valda) blir
 * oerövrade igen, osäkra moment i senare årskurser låses, och osäkra moment
 * i den valda årskursen öppnas för omträning. Säkra moment behålls.
 */
export function backToYear(child: ChildProfile, year: SchoolYear, today: string): ChildProfile {
  const yi = YEAR_ORDER.indexOf(year)
  const skills = { ...child.skills }
  for (const s of Object.values(child.skills)) {
    const my = YEAR_ORDER.indexOf(momentById(s.momentId).year)
    if (my < yi || s.mastery === 'locked') continue
    const weak = weakness(child, s) !== undefined || s.rating < BOSS_READY_RATING
    if (my > yi) {
      // Senare årskurs: osäkert stoff låses (det öppnas igen när barnet når
      // dit), säkert behålls som klart. Pågående osäkert låses också.
      if (s.mastery === 'star') continue
      if (weak || s.mastery === 'in-progress' || s.mastery === 'available') skills[s.momentId] = { ...s, mastery: 'locked', review: undefined, restDay: undefined }
    } else if (DONE.has(s.mastery) && weak) {
      skills[s.momentId] = reopen(s, today)
    }
  }
  const conqueredYears = (child.conqueredYears ?? []).filter((y) => YEAR_ORDER.indexOf(y) < yi)
  return settle(child, skills, conqueredYears)
}
