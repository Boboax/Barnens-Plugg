import type { ChildProfile, DiagnosisState, DifficultyLevel, SchoolYear, SkillState, Task } from '../domain/types'
import { MOMENTS_ORDERED, momentById } from '../domain/curriculum'
import { generateTask, hasGenerator } from '../generators'
import { freshSeed } from '../generators/rng'
import { newSkillState, recomputeAvailability } from './progress'
import { scheduleFirstReview } from './spaced-repetition'

/* ============================================================
   Startdiagnosen — "Vi lär känna varandra".

   Adaptiv nivåbestämning med en TRAPPSTEGSMETOD (staircase, 2-upp/1-ner)
   längs den aritmetiska ryggraden (momenten i läroplansordning som har
   generatorer). Metoden är väl belagd i psykofysik/adaptiv testning:

   - Efter 2 rätt i rad → svårare (längre fram i ryggraden).
   - Efter 1 fel → lättare (bakåt). Ett enstaka slarvfel kollapsar alltså
     INTE skattningen — det ger bara ett litet kliv ner.
   - "2-upp/1-ner" konvergerar matematiskt mot ~70,7 % rätt — precis barnets
     utvecklingszon (appen siktar på 70–80 %).
   - Startsteget är stort och halveras vid varje VÄNDPUNKT (grovt först, fint
     nära taket). Nivån = medelvärdet av de sista vändpunkterna.
   - Stoppregel: ett antal vändpunkter (TARGET_REVERSALS) ELLER en mjuk
     tidsgräns (DIAGNOSIS_MAX_MS) — ingen fast provmängd.

   Inga rätt/fel visas för barnet. Momenten under fronten markeras som
   behärskade; frontmomentet blir startpunkten för träningen.
   ============================================================ */

export const DIAGNOSIS_LEVEL: DifficultyLevel = 5
/** Mjuk tidsgräns: diagnosen avslutas när taket hittats ELLER tiden gått. */
export const DIAGNOSIS_MAX_MS = 10 * 60 * 1000

const START_BACKOFF = 2 // börja snällt: några steg under årskursnivån
const INITIAL_STEP = 4 // stort första kliv, halveras vid vändpunkter
const TARGET_REVERSALS = 6 // antal vändpunkter innan vi är säkra på nivån
const ESTIMATE_REVERSALS = 4 // medelvärdet av de sista N vändpunkterna = nivån
const CEILING_TOP_CORRECT = 2 // klarar svåraste momentet flera ggr → tak nått
const FLOOR_WRONG = 3 // klarar inte ens det lättaste → golv nått
const MAX_PROBES = 50 // säkerhetstak (≈10 min) så diagnosen alltid tar slut

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

/** Diagnosen körs numera som ETT sammanhängande pass (mjuk 10-min-gräns). */
export const diagnosisPassesForAge = (_birthYear: number, _thisYear: number): number => 1

interface SearchState {
  /** Nästa index att prova. */
  nextIndex: number
  /** Skattad frontnivå (medelvärde av vändpunkterna). */
  frontier: number
  /** Antal vändpunkter hittills. */
  reversals: number
  /** Klar när taket hittats (vändpunkter, tak, golv eller säkerhetstak). */
  converged: boolean
}

const clampIdx = (i: number, n: number): number => Math.min(Math.max(i, 0), n - 1)

/**
 * Återskapa trappstegsläget ur probe-historiken (lagras aldrig separat —
 * härleds deterministiskt genom att spela om proven i ordning).
 *
 * Klar när NÅGOT av följande nåtts:
 *  - tillräckligt många vändpunkter (taket ligger däremellan), ELLER
 *  - barnet klarar det svåraste momentet flera ggr (tak = toppen), ELLER
 *  - barnet klarar inte ens det lättaste (golv = botten), ELLER
 *  - säkerhetstaket MAX_PROBES (≈10 min) — så den alltid tar slut.
 */
export function searchState(diagnosis: DiagnosisState, backbone: string[], year: SchoolYear): SearchState {
  const n = backbone.length
  let index = clampIdx(startIndexForYear(year, backbone) - START_BACKOFF, n)
  let step = INITIAL_STEP
  let consecutiveCorrect = 0
  let lastDir = 0 // +1 = på väg uppåt (svårare), −1 = nedåt (lättare)
  const reversalIdx: number[] = []
  let topCorrect = 0 // rätt på svåraste momentet i följd
  let floorWrong = 0 // fel på lättaste momentet i följd
  let count = 0

  for (const probe of diagnosis.probes) {
    const i = backbone.indexOf(probe.momentId)
    if (i === -1) continue
    index = i // synka till det index provet faktiskt låg på
    count++
    if (probe.correct) {
      floorWrong = 0
      if (i >= n - 1) topCorrect++
      consecutiveCorrect++
      if (consecutiveCorrect >= 2) {
        consecutiveCorrect = 0
        if (lastDir === -1) { reversalIdx.push(index); step = Math.max(1, Math.floor(step / 2)) }
        lastDir = 1
        index = clampIdx(index + step, n)
      }
      // Efter bara 1 rätt: stanna kvar (2-upp-regeln) → nästa prov samma nivå.
    } else {
      consecutiveCorrect = 0
      topCorrect = 0
      if (i <= 0) floorWrong++
      if (lastDir === 1) { reversalIdx.push(index); step = Math.max(1, Math.floor(step / 2)) }
      lastDir = -1
      index = clampIdx(index - step, n)
    }
  }

  const ceilingReached = topCorrect >= CEILING_TOP_CORRECT
  const floorReached = floorWrong >= FLOOR_WRONG
  const converged = reversalIdx.length >= TARGET_REVERSALS || ceilingReached || floorReached || count >= MAX_PROBES

  let frontier: number
  if (ceilingReached) frontier = n - 1 // klarar allt → starta på det svåraste
  else if (reversalIdx.length >= 2) {
    frontier = Math.round(reversalIdx.slice(-ESTIMATE_REVERSALS).reduce((a, b) => a + b, 0) / Math.min(ESTIMATE_REVERSALS, reversalIdx.length))
  } else if (floorReached) frontier = 0 // klarar inte det lättaste → starta från början
  else frontier = index

  return { nextIndex: clampIdx(index, n), frontier: clampIdx(frontier, n), reversals: reversalIdx.length, converged }
}

/** Nästa diagnosuppgift, eller null om trappstegsmetoden hittat taket. */
export function nextDiagnosisTask(profile: ChildProfile): { momentId: string; task: Task } | null {
  const backbone = diagnosisBackbone()
  const s = searchState(profile.diagnosis, backbone, profile.schoolYear)
  if (s.converged) return null
  const momentId = backbone[s.nextIndex]
  const moment = momentById(momentId)
  return { momentId, task: generateTask(moment.generatorId!, DIAGNOSIS_LEVEL, freshSeed()) }
}

/**
 * Avsluta diagnosen: fronten (skattad nivå) avgör startläget.
 * Momenten under fronten → behärskade (visas som "redan klara" på kartan;
 * repetitionsschemat fångar upp det som ändå inte satt). Frontmomentet blir
 * barnets startpunkt. Bossar förtjänas därefter genom att spela framåt.
 */
export function applyDiagnosisResult(profile: ChildProfile, now: string): Record<string, SkillState> {
  const backbone = diagnosisBackbone()
  const s = searchState(profile.diagnosis, backbone, profile.schoolYear)
  const frontier = Math.min(Math.max(s.frontier, 0), backbone.length)
  const skills: Record<string, SkillState> = { ...profile.skills }

  backbone.forEach((momentId, i) => {
    const base = skills[momentId] ?? newSkillState(momentId)
    if (i < frontier) {
      skills[momentId] = { ...base, mastery: 'mastered', rating: 700, review: scheduleFirstReview(now) }
    } else if (i === frontier) {
      // Nivå ~5 direkt: allt före sitter, så frontmomentet ska kännas som en
      // riktig utmaning — inte mjukstart med klossbilder (rating 550 ⇒ nivå 5).
      skills[momentId] = { ...base, mastery: 'in-progress', rating: 550 }
    }
  })

  // Bossgrinden gäller även efter diagnos: världar som placeringen "klarade"
  // erövras inte automatiskt — barnet möter deras bossar bakåt först (medvetet
  // val: bossen är i slutet av varje värld). conqueredWorlds är normalt tom här.
  return recomputeAvailability(skills, profile.conqueredWorlds ?? [])
}
