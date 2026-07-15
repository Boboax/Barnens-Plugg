import type { ChildProfile, DiagnosisState, DifficultyLevel, SchoolYear, SkillState, Task } from '../domain/types'
import { MOMENTS_ORDERED, momentById } from '../domain/curriculum'
import { generateTask, hasGenerator } from '../generators'
import { freshSeed } from '../generators/rng'
import { newSkillState, recomputeAvailability } from './progress'
import { scheduleFirstReview } from './spaced-repetition'

/* ============================================================
   Startdiagnosen — "Vi lär känna varandra".

   Adaptiv nivåbestämning som en binärsökning längs den aritmetiska
   ryggraden (momenten i läroplansordning som har generatorer).
   Rätt svar flyttar fronten framåt, fel backar den. Inga rätt/fel
   visas för barnet under tiden.

   För yngre barn delas diagnosen i tre korta pass över flera dagar;
   äldre barn kör två. Resultatet: momenten bakom fronten markeras
   som behärskade (med repetitionsschema), frontmomentet blir
   startpunkten för träningen.
   ============================================================ */

export const PROBES_PER_PASS = 8
export const DIAGNOSIS_LEVEL: DifficultyLevel = 5

/** Ryggraden: alla generatorförsedda moment i läroplansordning. */
export const diagnosisBackbone = (): string[] =>
  MOMENTS_ORDERED.filter((m) => hasGenerator(m.generatorId)).map((m) => m.id)

/** Startindex i ryggraden utifrån skolår — diagnosens första gissning. */
export function startIndexForYear(year: SchoolYear, backbone: string[]): number {
  const YEAR_ORDER: SchoolYear[] = ['F', '1', '2', '3', '4', '5', '6']
  const target = YEAR_ORDER.indexOf(year)
  // Första momentet som hör till barnets skolår, backat ett steg (snäll start).
  const idx = backbone.findIndex((id) => YEAR_ORDER.indexOf(momentById(id).year) >= target)
  return Math.max(0, (idx === -1 ? backbone.length - 1 : idx) - 1)
}

export const diagnosisPassesForAge = (birthYear: number, thisYear: number): number =>
  thisYear - birthYear <= 7 ? 3 : 2

interface SearchState {
  lo: number
  hi: number
  nextIndex: number
  converged: boolean
}

/** Återskapa sökläget ur probe-historiken (lagras aldrig separat — härleds). */
export function searchState(diagnosis: DiagnosisState, backbone: string[], year: SchoolYear): SearchState {
  let lo = 0
  let hi = backbone.length - 1
  let index = startIndexForYear(year, backbone)
  for (const probe of diagnosis.probes) {
    const i = backbone.indexOf(probe.momentId)
    if (i === -1) continue
    if (probe.correct) lo = i + 1
    else hi = i - 1
    index = Math.floor((lo + hi) / 2)
  }
  return { lo, hi, nextIndex: index, converged: lo > hi }
}

/** Nästa diagnosuppgift, eller null om sökningen är klar. */
export function nextDiagnosisTask(profile: ChildProfile): { momentId: string; task: Task } | null {
  const backbone = diagnosisBackbone()
  const s = searchState(profile.diagnosis, backbone, profile.schoolYear)
  if (s.converged) return null
  const momentId = backbone[Math.min(Math.max(s.nextIndex, 0), backbone.length - 1)]
  const moment = momentById(momentId)
  return { momentId, task: generateTask(moment.generatorId!, DIAGNOSIS_LEVEL, freshSeed()) }
}

/**
 * Avsluta diagnosen: fronten avgör startläget.
 * Momenten före fronten → behärskade (diagnosen ger "benefit of the doubt";
 * repetitionsschemat fångar upp det som ändå inte satt). De visas som
 * "redan klara" på kartan — INTE som en hög med bossar att beta av.
 * Frontmomentet → barnets startpunkt. Bossar förtjänas därefter naturligt
 * genom att spela framåt (träna → boss-ready → besegra bossen → mastered).
 */
export function applyDiagnosisResult(profile: ChildProfile, now: string): Record<string, SkillState> {
  const backbone = diagnosisBackbone()
  const s = searchState(profile.diagnosis, backbone, profile.schoolYear)
  const frontier = Math.min(Math.max(s.lo, 0), backbone.length)
  let skills: Record<string, SkillState> = { ...profile.skills }

  backbone.forEach((momentId, i) => {
    const base = skills[momentId] ?? newSkillState(momentId)
    if (i < frontier) {
      skills[momentId] = {
        ...base,
        mastery: 'mastered',
        rating: 700,
        review: scheduleFirstReview(now),
      }
    } else if (i === frontier) {
      // Nivå ~5 direkt: diagnosen har redan visat att allt före sitter,
      // så frontmomentet ska kännas som en utmaning — inte som mjukstart
      // med klossbilder (rating 550 ⇒ practiceLevel 5).
      skills[momentId] = { ...base, mastery: 'in-progress', rating: 550 }
    }
  })

  return recomputeAvailability(skills)
}
