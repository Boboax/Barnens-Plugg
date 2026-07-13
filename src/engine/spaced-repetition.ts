import type { SkillState } from '../domain/types'

/* ============================================================
   Spaced repetition (SM-2-inspirerad, förenklad).

   När ett moment behärskas (boss besegrad) schemaläggs det för
   repetition med växande intervall. Klarad repetition → nästa
   intervall; missad → momentet öppnas igen ("needs-review") och
   intervallet backar. Det är skillnaden mellan "kunde igår"
   och "kan på riktigt".
   ============================================================ */

export const REVIEW_INTERVALS_DAYS = [3, 7, 14, 30, 60, 120] as const

/** Andel rätt som krävs för att klara ett repetitionsprov. */
export const REVIEW_PASS_RATIO = 0.75
export const REVIEW_TASK_COUNT = 4

const addDays = (iso: string, days: number): string => {
  const d = new Date(iso)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Schemalägg första repetitionen (anropas när bossen besegrats). */
export function scheduleFirstReview(now: string): NonNullable<SkillState['review']> {
  return {
    nextReviewAt: addDays(now, REVIEW_INTERVALS_DAYS[0]),
    intervalDays: REVIEW_INTERVALS_DAYS[0],
    passes: 0,
  }
}

/** Uppdatera schemat efter en klarad repetition. */
export function scheduleNextReview(
  review: NonNullable<SkillState['review']>,
  now: string,
): NonNullable<SkillState['review']> {
  const idx = Math.min(review.passes + 1, REVIEW_INTERVALS_DAYS.length - 1)
  return {
    nextReviewAt: addDays(now, REVIEW_INTERVALS_DAYS[idx]),
    intervalDays: REVIEW_INTERVALS_DAYS[idx],
    passes: review.passes + 1,
  }
}

/** Backa schemat efter missad repetition (momentet öppnas igen). */
export function scheduleRetryReview(now: string): NonNullable<SkillState['review']> {
  return scheduleFirstReview(now)
}

/** Moment vars repetition har förfallit (dagens datum ≥ nextReviewAt). */
export function dueForReview(skills: Record<string, SkillState>, today: string): SkillState[] {
  return Object.values(skills)
    .filter((s) => (s.mastery === 'mastered' || s.mastery === 'star') && s.review && s.review.nextReviewAt <= today)
    .sort((a, b) => (a.review!.nextReviewAt < b.review!.nextReviewAt ? -1 : 1))
}
