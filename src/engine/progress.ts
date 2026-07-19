import type {
  AnswerRecord, ChildProfile, MasteryState, MisconceptionTag, SkillState, Task,
} from '../domain/types'
import { MOMENTS, momentById } from '../domain/curriculum'
import { WORLDS } from '../domain/worlds'
import { hasGenerator } from '../generators'
import { RATING_START, isBossReady, practiceLevel, updateRating } from './rating'
import { scheduleFirstReview, scheduleNextReview, scheduleRetryReview } from './spaced-repetition'

/* ============================================================
   Mästerskapslogik: färdigheternas tillstånd och övergångar.

   locked → available → in-progress → boss-ready → mastered → star
                                          ↑ needs-review (missad repetition)
   Allt här är rena funktioner över profildata — lagring och UI
   ligger utanför.
   ============================================================ */

export function newSkillState(momentId: string): SkillState {
  return {
    momentId,
    mastery: 'locked',
    rating: RATING_START,
    attempts: 0,
    correct: 0,
    recentMisconceptions: [],
    bossAttempts: 0,
    starWon: false,
  }
}

const isDone = (s: SkillState | undefined): boolean =>
  s?.mastery === 'mastered' || s?.mastery === 'star'

const EMPTY_SET: ReadonlySet<string> = new Set()

/** Generatorförsedda moment i en värld (de som faktiskt går att träna). */
function genMomentIdsInWorld(worldId: string): string[] {
  return MOMENTS.filter((m) => m.worldId === worldId && hasGenerator(m.generatorId)).map((m) => m.id)
}

/** Är alla (tränbara) moment i en värld behärskade? Tom värld räknas EJ som klar. */
export function worldMomentsComplete(skills: Record<string, SkillState>, worldId: string): boolean {
  const ids = genMomentIdsInWorld(worldId)
  return ids.length > 0 && ids.every((id) => isDone(skills[id]))
}

/**
 * Räkna om locked/available utifrån förkunskaper OCH bossgrinden. Muterar inte.
 *
 * Bossgrind (orubblig princip: framsteg styrs av appkod): för att korsa in i
 * en NY värld måste den förra världens boss vara besegrad. Konkret — ett
 * moment vars förkunskap ligger i en ANNAN värld låses upp först när DEN
 * världen finns i `conqueredWorlds`. Moment inom samma värld påverkas inte.
 * `conqueredWorlds` default tom = inga bossar tagna än (t.ex. ny profil).
 */
export function recomputeAvailability(
  skills: Record<string, SkillState>,
  conqueredWorlds: readonly string[] = [],
  blixtBlocked: ReadonlySet<string> = EMPTY_SET,
): Record<string, SkillState> {
  const conquered = new Set(conqueredWorlds)
  const next: Record<string, SkillState> = { ...skills }
  for (const moment of MOMENTS) {
    const skill = next[moment.id] ?? newSkillState(moment.id)
    const prereqsDone = moment.prerequisites.every((p) => isDone(next[p]))
    const bossGateOpen = moment.prerequisites.every((p) => {
      const pWorld = momentById(p).worldId
      return pWorld === moment.worldId || conquered.has(pWorld)
    })
    // Flyt-grind: momentet hålls låst tills blixten före det är klarad.
    const unlocked = prereqsDone && bossGateOpen && !blixtBlocked.has(moment.id)
    let mastery: MasteryState = skill.mastery
    if (skill.mastery === 'locked' && unlocked) mastery = 'available'
    if (skill.mastery === 'available' && !unlocked) mastery = 'locked'
    next[moment.id] = mastery === skill.mastery ? skill : { ...skill, mastery }
  }
  return next
}

/**
 * Engångsreparation av gamla profiler. En tidigare version av diagnosen
 * markerade ALLA moment före fronten som 'boss-ready' (direkt, utan träning
 * → attempts 0), vilket gjorde hela kartan till bossnoder. Här görs de om
 * till 'mastered' med repetitionsschema — precis som diagnosen gör nu.
 *
 * Legitima boss-ready (barnet har tränat fram dem) har attempts ≥
 * BOSS_READY_MIN_ATTEMPTS och lämnas ORÖRDA. Idempotent: efter körning finns
 * inga boss-ready-med-0-försök kvar, så en ny inläsning gör ingenting.
 */
export function repairDiagnosisBossReady(
  skills: Record<string, SkillState>,
  now: string,
  conqueredWorlds: readonly string[] = [],
  blixtBlocked: ReadonlySet<string> = EMPTY_SET,
): Record<string, SkillState> {
  const next: Record<string, SkillState> = { ...skills }
  for (const [id, s] of Object.entries(skills)) {
    if (s && s.mastery === 'boss-ready' && s.attempts === 0) {
      next[id] = { ...s, mastery: 'mastered', rating: Math.max(s.rating, 700), review: s.review ?? scheduleFirstReview(now) }
    }
  }
  // Alltid räkna om tillgänglighet — så boss- OCH flyt-grinden greppar även
  // gamla profiler som placerades innan grindarna fanns.
  return recomputeAvailability(next, conqueredWorlds, blixtBlocked)
}

/**
 * Engångsmigrering när "Plus och minus" delades i ren addition → ren
 * subtraktion → blandat. Barn som REDAN behärskar en blandad nod har visat
 * båda räknesätten, så de nya rena noderna markeras klara direkt — annars
 * skulle motorn skicka dem bakåt till addition igen. Idempotent.
 */
const SPLIT_BACKFILL: { mixed: string; pure: string[] }[] = [
  { mixed: 'add-sub-0-10', pure: ['addition-0-10', 'subtraktion-0-10'] },
  { mixed: 'add-sub-0-20', pure: ['addition-0-20', 'subtraktion-0-20'] },
]

export function backfillSplitAddSub(
  skills: Record<string, SkillState>,
  now: string,
): Record<string, SkillState> {
  let changed = false
  const next: Record<string, SkillState> = { ...skills }
  for (const { mixed, pure } of SPLIT_BACKFILL) {
    const m = skills[mixed]
    if (!m || !isDone(m)) continue
    for (const id of pure) {
      const s = next[id]
      if (s && isDone(s)) continue
      next[id] = {
        ...(s ?? newSkillState(id)),
        mastery: 'mastered',
        rating: Math.max(s?.rating ?? 0, 640),
        review: s?.review ?? scheduleFirstReview(now),
      }
      changed = true
    }
  }
  return changed ? next : skills
}

const MISCONCEPTION_MEMORY = 10

/**
 * Klassa ett fel: slarv eller kunskapslucka?
 * Slarv = barnet ligger klart över uppgiftens nivå och svarade snabbt —
 * det är inte förståelsen som brast utan noggrannheten.
 */
export function classifyError(
  skill: SkillState,
  taskLevel: number,
  elapsedMs: number,
  misconception?: MisconceptionTag,
): 'slarv' | 'kunskap' {
  const ownLevel = practiceLevel(skill.rating)
  const quick = elapsedMs < 12_000
  if (misconception === 'en-fel' && quick) return 'slarv'
  if (ownLevel >= taskLevel + 2 && quick) return 'slarv'
  return 'kunskap'
}

/** Matcha ett numeriskt felsvar mot uppgiftens missuppfattningskarta. */
export function matchMisconception(task: Task, givenAnswer: number | string): MisconceptionTag | undefined {
  if (task.answer.kind === 'choice') {
    const choice = task.answer.choices.find((c) => c.text === givenAnswer)
    return choice?.misconception
  }
  const numeric = typeof givenAnswer === 'number' ? givenAnswer : Number(String(givenAnswer).replace(',', '.'))
  if (Number.isNaN(numeric)) return 'okand'
  return task.misconceptionMap?.[numeric] ?? 'okand'
}

export interface AnswerOutcome {
  skill: SkillState
  record: AnswerRecord
}

/**
 * "Het hand"-acceleration: extra ratingskjuts vid längre rättsviter,
 * så starka elever når sin riktiga nivå inom ett pass i stället för
 * inom en vecka. Kämpar man gäller den försiktiga grundtakten.
 */
export const hotStreakBonus = (streak: number): number =>
  streak >= 3 ? Math.min(24, 6 * (streak - 2)) : 0

/**
 * Registrera ett svar under övning/repetition: rating, räknare, feltyp.
 * hotStreak = antal rätt i rad inklusive detta svar (bara övningspass —
 * boss/diagnos/blixt skickar inget och får ingen acceleration).
 */
export function applyAnswer(
  skill: SkillState,
  task: Task,
  correct: boolean,
  elapsedMs: number,
  context: AnswerRecord['context'],
  now: string,
  givenAnswer?: number | string,
  scratchPng?: string,
  hotStreak = 0,
): AnswerOutcome {
  const misconception = correct || givenAnswer === undefined ? undefined : matchMisconception(task, givenAnswer)
  const errorKind = correct ? undefined : classifyError(skill, task.ref.level, elapsedMs, misconception)

  // Slarvfel ska inte sänka ratingen lika hårt — kunskapen finns ju.
  const ratingCorrect = correct || errorKind === 'slarv' ? correct : false
  let rating = skill.rating
  if (!(errorKind === 'slarv' && !correct)) {
    rating = updateRating(skill.rating, skill.attempts, task.ref.level, ratingCorrect)
  }
  if (correct) {
    rating = Math.min(1000, rating + hotStreakBonus(hotStreak))
  }

  const recentMisconceptions = misconception && misconception !== 'okand'
    ? [misconception, ...skill.recentMisconceptions].slice(0, MISCONCEPTION_MEMORY)
    : skill.recentMisconceptions

  const next: SkillState = {
    ...skill,
    rating,
    attempts: skill.attempts + 1,
    correct: skill.correct + (correct ? 1 : 0),
    recentMisconceptions,
    mastery:
      skill.mastery === 'available' ? 'in-progress'
      // needs-review tränas om precis som in-progress — och måste kunna nå
      // bossen igen, annars fastnar momentet i evig omträning.
      : (skill.mastery === 'in-progress' || skill.mastery === 'needs-review') &&
        isBossReady({ ...skill, rating, attempts: skill.attempts + 1 }) ? 'boss-ready'
      : skill.mastery,
  }

  return {
    skill: next,
    record: {
      at: now, momentId: skill.momentId, taskRef: task.ref,
      correct, elapsedMs, misconception, errorKind, context, scratchPng,
    },
  }
}

/** Resultat av en bosstrid. */
export function applyBossResult(skill: SkillState, won: boolean, now: string): SkillState {
  if (!won) return { ...skill, bossAttempts: skill.bossAttempts + 1 }
  return {
    ...skill,
    bossAttempts: skill.bossAttempts + 1,
    mastery: 'mastered',
    review: scheduleFirstReview(now),
  }
}

/** Resultat av stjärnnivåförsök (nivå 8–10 efter besegrad boss). */
export function applyStarResult(skill: SkillState, won: boolean): SkillState {
  if (!won) return skill
  return { ...skill, mastery: 'star', starWon: true }
}

/** Resultat av repetitionsprov. */
export function applyReviewResult(skill: SkillState, passed: boolean, now: string): SkillState {
  if (!skill.review) return skill
  if (passed) return { ...skill, review: scheduleNextReview(skill.review, now) }
  // Missad repetition: momentet öppnas igen och tränas om innan ny boss.
  return {
    ...skill,
    mastery: 'needs-review',
    rating: Math.max(RATING_START, skill.rating - 120),
    review: scheduleRetryReview(now),
  }
}

/**
 * Nästa moment att träna. Repetition (needs-review) går alltid först — den
 * är tillåten var som helst. Därefter går vi igenom världarna i läroplans-
 * ordning och STANNAR vid den första världen som inte är både klar OCH
 * erövrad: är det moment kvar tränar vi dem; är alla moment klara men bossen
 * kvar returnerar vi undefined (barnet ska möta bossen — se bossPendingWorldId).
 * Så hoppar vi aldrig förbi en oerövrad boss in i nästa värld.
 */
export function currentMomentId(profile: ChildProfile): string | undefined {
  const skills = profile.skills
  const withGen = (id: string): boolean => hasGenerator(momentById(id).generatorId)
  const needsReview = Object.values(skills).find((s) => s.mastery === 'needs-review' && withGen(s.momentId))
  if (needsReview) return needsReview.momentId
  const conquered = new Set(profile.conqueredWorlds ?? [])
  for (const world of WORLDS) {
    const ids = genMomentIdsInWorld(world.id)
    if (ids.length === 0) continue
    const complete = ids.every((id) => isDone(skills[id]))
    if (!complete) {
      // Träna vidare i denna värld: pågående/boss-redo först, annars nästa öppna.
      const active = ids.find((id) => {
        const m = skills[id]?.mastery
        return m === 'in-progress' || m === 'boss-ready'
      })
      if (active) return active
      // Nästa öppna moment. Finns inget (allt före klart, nästa låst av en
      // flyt-grind) → returnera undefined; Home visar då blixt-grinden som steg.
      return ids.find((id) => skills[id]?.mastery === 'available')
    }
    // Världen klar men bossen inte besegrad → stanna (barnet möter bossen).
    if (!conquered.has(world.id)) return undefined
    // Klar OCH erövrad → gå vidare till nästa värld.
  }
  return undefined
}

/**
 * Vilken världs boss väntar just nu (alla moment klara men världen inte
 * erövrad)? Den avgör "Du är här" och den gula knappen när det inte finns
 * något moment kvar att träna. undefined = ingen boss väntar.
 */
export function bossPendingWorldId(profile: ChildProfile): string | undefined {
  const skills = profile.skills
  const conquered = new Set(profile.conqueredWorlds ?? [])
  for (const world of WORLDS) {
    const ids = genMomentIdsInWorld(world.id)
    if (ids.length === 0) continue
    if (!ids.every((id) => isDone(skills[id]))) return undefined // moment kvar → ingen boss än
    if (!conquered.has(world.id)) return world.id // klar men oerövrad → bossen väntar
    // annars nästa värld
  }
  return undefined
}
