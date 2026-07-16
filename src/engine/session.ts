import type { ChildProfile, DifficultyLevel, SessionPlan, Task } from '../domain/types'
import { momentById, momentsInWorld } from '../domain/curriculum'
import { generateTask, hasGenerator } from '../generators'
import { freshSeed, createRng } from '../generators/rng'
import { variedLevel, practiceLevel } from './rating'
import { dueForReview, REVIEW_TASK_COUNT } from './spaced-repetition'
import { currentMomentId } from './progress'

/* ============================================================
   Passkomponering — "Dagens pass".

   Forskningsgrundad struktur:
   1. Uppvärmning: repetition av förfallna moment (spaced repetition)
   2. Nytt: dagens moment på adaptiv nivå (huvuddelen)
   3. Blandat: uppgifter från redan behärskade moment (interleaving)

   Barnet ska aldrig behöva välja vad som ska tränas —
   den gula knappen är alltid nästa steg.
   ============================================================ */

const NEW_TASK_COUNT = 8
const MIXED_TASK_COUNT = 4
const MAX_REVIEW_MOMENTS = 2
// Fokuserad nodträning: bara det valda momentet. 12 = når "boss-redo"
// (BOSS_READY_MIN_ATTEMPTS) på ett fokuserat pass om det går bra → bossen
// vaknar direkt, så vägen till "klar" blir tydlig och snabb.
const FOCUSED_TASK_COUNT = 12

/** Kan momentet tränas som "nytt" just nu? (upplåst + byggd generator) */
export function isTrainable(profile: ChildProfile, momentId: string): boolean {
  const skill = profile.skills[momentId]
  if (!skill) return false
  const openStates = new Set(['available', 'in-progress', 'boss-ready', 'needs-review'])
  return openStates.has(skill.mastery) && hasGenerator(momentById(momentId).generatorId)
}

export function composeSession(profile: ChildProfile, today: string, preferredMomentId?: string, focused = false): SessionPlan {
  const parts: SessionPlan['parts'] = []

  // Fokuserad nodträning: barnet tryckte på EN specifik nod och vill träna
  // just det momentet — då hoppar vi över uppvärmning/blandat (som hör till
  // "Dagens pass") och kör bara det valda momentet.
  if (focused && preferredMomentId && isTrainable(profile, preferredMomentId)) {
    return { parts: [{ kind: 'nytt', momentId: preferredMomentId, taskCount: FOCUSED_TASK_COUNT }] }
  }

  const due = dueForReview(profile.skills, today)
    .filter((s) => hasGenerator(momentById(s.momentId).generatorId))
    .slice(0, MAX_REVIEW_MOMENTS)
  for (const skill of due) {
    parts.push({ kind: 'uppvarmning', momentId: skill.momentId, taskCount: REVIEW_TASK_COUNT })
  }

  // Barnet kan välja ett upplåst moment på kartan; annars väljer motorn.
  const current =
    preferredMomentId && isTrainable(profile, preferredMomentId)
      ? preferredMomentId
      : currentMomentId(profile)
  if (current) {
    parts.push({ kind: 'nytt', momentId: current, taskCount: NEW_TASK_COUNT })
  }

  // Blandad avslutning: slumpa bland behärskade moment (interleaving).
  const mastered = Object.values(profile.skills).filter(
    (s) =>
      (s.mastery === 'mastered' || s.mastery === 'star') &&
      s.momentId !== current &&
      hasGenerator(momentById(s.momentId).generatorId),
  )
  if (mastered.length > 0) {
    const rng = createRng(freshSeed())
    const picked = rng.shuffle(mastered).slice(0, MIXED_TASK_COUNT)
    for (const skill of picked) {
      parts.push({ kind: 'blandat', momentId: skill.momentId, taskCount: 1 })
    }
  }

  return { parts }
}

/** Generera nästa uppgift i ett passavsnitt, på barnets adaptiva nivå. */
export function taskForPart(profile: ChildProfile, momentId: string, kind: 'uppvarmning' | 'nytt' | 'blandat'): Task {
  const moment = momentById(momentId)
  if (!moment.generatorId) throw new Error(`Momentet ${momentId} saknar generator`)
  const skill = profile.skills[momentId]
  const rating = skill?.rating ?? 300
  // Repetition och blandat körs ett snäpp under toppnivån — målet är att hålla kunskapen vid liv.
  const roll = Math.random()
  const level = kind === 'nytt' ? variedLevel(rating, roll) : Math.max(1, variedLevel(rating, roll) - 1) as DifficultyLevel
  return generateTask(moment.generatorId, level, freshSeed())
}

/* ============================================================
   Nodens kunskapskoll, världsbossen och stjärnnivån.
   ============================================================ */

/* Kunskapskollen ("Visa vad du kan för Pi") avgör om en NOD blir klar.
   Kort och vänlig — ingen boss, ingen klocka, fel straffas aldrig. */
export const CHECK_TASK_COUNT = 8
export const CHECK_CORRECT_TO_WIN = 6 // 75 % — solid, inte perfektion

/* Världsbossen är klimaxstriden i SLUTET av en värld (sällsynt, dramatisk).
   Blandar frågor från hela världens moment. */
export const WORLDBOSS_TASK_COUNT = 14
export const WORLDBOSS_SHIELDS_TO_WIN = 11 // ≈ 80 %-kravet

export const STAR_TASK_COUNT = 8
export const STAR_CORRECT_TO_WIN = 6

/**
 * Nodens kunskapskoll: några frågor från momentet. Kollen är en BEKRÄFTELSE på
 * det barnet nyss tränade, så nivån läggs kring barnets egen övningsnivå (en
 * aning snäll) — inte en fast hög nivå som kunde bli orättvist svår direkt
 * efter ett lätt moment. Utan känd rating (kartans manuella koll) faller vi
 * tillbaka på nivå 4–6. Nya frön varje gång.
 */
export function composeCheckTasks(momentId: string, rating?: number): Task[] {
  const moment = momentById(momentId)
  if (!moment.generatorId) throw new Error(`Momentet ${momentId} saknar generator`)
  const rng = createRng(freshSeed())
  const base = rating !== undefined ? practiceLevel(rating) : (5 as DifficultyLevel)
  const lo = Math.max(1, base - 1) as DifficultyLevel
  const hi = Math.min(10, base + 1) as DifficultyLevel
  const levels: DifficultyLevel[] = [lo, base, base, hi, base]
  const tasks: Task[] = []
  for (let i = 0; i < CHECK_TASK_COUNT; i++) {
    tasks.push(generateTask(moment.generatorId, rng.pick(levels), freshSeed()))
  }
  return tasks
}

/**
 * Världsbossens frågor: blandat från HELA världens generatorförsedda moment
 * (ett riktigt slutprov för världen), nivå 5–7. Nya frön varje försök.
 */
export function composeWorldBossTasks(worldId: string): Task[] {
  const moments = momentsInWorld(worldId).filter((m) => hasGenerator(m.generatorId))
  if (moments.length === 0) return []
  const rng = createRng(freshSeed())
  const tasks: Task[] = []
  for (let i = 0; i < WORLDBOSS_TASK_COUNT; i++) {
    const m = rng.pick(moments)
    tasks.push(generateTask(m.generatorId!, rng.pick([5, 6, 6, 7, 7] as const), freshSeed()))
  }
  return rng.shuffle(tasks)
}

/** Stjärnnivån: enbart de riktigt svåra uppgifterna (nivå 8–10). */
export function composeStarTasks(momentId: string): Task[] {
  const moment = momentById(momentId)
  if (!moment.generatorId) throw new Error(`Momentet ${momentId} saknar generator`)
  const rng = createRng(freshSeed())
  const tasks: Task[] = []
  for (let i = 0; i < STAR_TASK_COUNT; i++) {
    const level = rng.pick([8, 8, 9, 9, 10] as const)
    tasks.push(generateTask(moment.generatorId, level, freshSeed()))
  }
  return tasks
}

/** Repetitionsprov: kort, blandade nivåer kring behärskad nivå. */
export function composeReviewTasks(momentId: string): Task[] {
  const moment = momentById(momentId)
  if (!moment.generatorId) throw new Error(`Momentet ${momentId} saknar generator`)
  const rng = createRng(freshSeed())
  const tasks: Task[] = []
  for (let i = 0; i < REVIEW_TASK_COUNT; i++) {
    tasks.push(generateTask(moment.generatorId, rng.pick([4, 5, 6] as const), freshSeed()))
  }
  return tasks
}
