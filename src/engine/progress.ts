import type {
  AnswerRecord, ChildProfile, MasteryState, MisconceptionTag, SkillState, Task,
} from '../domain/types'
import { MOMENTS, MOMENTS_ORDERED, momentById } from '../domain/curriculum'
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

/** Räkna om locked/available utifrån förkunskaper. Muterar inte. */
export function recomputeAvailability(skills: Record<string, SkillState>): Record<string, SkillState> {
  const next: Record<string, SkillState> = { ...skills }
  for (const moment of MOMENTS) {
    const skill = next[moment.id] ?? newSkillState(moment.id)
    const unlocked = moment.prerequisites.every((p) => isDone(next[p]))
    let mastery: MasteryState = skill.mastery
    if (skill.mastery === 'locked' && unlocked) mastery = 'available'
    if (skill.mastery === 'available' && !unlocked) mastery = 'locked'
    next[moment.id] = mastery === skill.mastery ? skill : { ...skill, mastery }
  }
  return next
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

/** Registrera ett svar under övning/repetition: rating, räknare, feltyp. */
export function applyAnswer(
  skill: SkillState,
  task: Task,
  correct: boolean,
  elapsedMs: number,
  context: AnswerRecord['context'],
  now: string,
  givenAnswer?: number | string,
  scratchPng?: string,
): AnswerOutcome {
  const misconception = correct || givenAnswer === undefined ? undefined : matchMisconception(task, givenAnswer)
  const errorKind = correct ? undefined : classifyError(skill, task.ref.level, elapsedMs, misconception)

  // Slarvfel ska inte sänka ratingen lika hårt — kunskapen finns ju.
  const ratingCorrect = correct || errorKind === 'slarv' ? correct : false
  let rating = skill.rating
  if (!(errorKind === 'slarv' && !correct)) {
    rating = updateRating(skill.rating, skill.attempts, task.ref.level, ratingCorrect)
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
      : skill.mastery === 'in-progress' && isBossReady({ ...skill, rating, attempts: skill.attempts + 1 }) ? 'boss-ready'
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

/** Nästa moment att träna: needs-review först, sedan läroplansordningen. */
export function currentMomentId(profile: ChildProfile): string | undefined {
  const skills = profile.skills
  const withGen = (id: string): boolean => hasGenerator(momentById(id).generatorId)
  const needsReview = Object.values(skills).find((s) => s.mastery === 'needs-review' && withGen(s.momentId))
  if (needsReview) return needsReview.momentId
  const inProgress = Object.values(skills).find(
    (s) => (s.mastery === 'in-progress' || s.mastery === 'boss-ready') && withGen(s.momentId),
  )
  if (inProgress) return inProgress.momentId
  // Första tillgängliga i läroplansordning med byggd generator.
  for (const moment of MOMENTS_ORDERED) {
    const s = skills[moment.id]
    if (s?.mastery === 'available' && hasGenerator(moment.generatorId)) return moment.id
  }
  return undefined
}
