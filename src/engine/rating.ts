import type { DifficultyLevel, SkillState } from '../domain/types'

/* ============================================================
   Adaptiv svårighet, Elo-inspirerad.

   Varje färdighet har en rating 100–1000 som mappas mot
   svårighetsnivå 1–10 (nivå n ≈ rating n×100−50). Målet är att
   barnet ska träna i sin proximala utvecklingszon: vi väljer nivå
   så att förväntad lösningsgrad hamnar kring 70–80 % — svårt nog
   att lära, lätt nog att inte ge upp.
   ============================================================ */

export const RATING_MIN = 100
export const RATING_MAX = 1000
export const RATING_START = 300 // nivå ~3 — snällt men inte trivialt

/** Ratingpoäng som motsvarar mitten av en svårighetsnivå. */
export const ratingForLevel = (level: DifficultyLevel): number => level * 100 - 50

/** Förväntad sannolikhet att klara en uppgift på given nivå. */
export function expectedSuccess(rating: number, level: DifficultyLevel): number {
  return 1 / (1 + 10 ** ((ratingForLevel(level) - rating) / 250))
}

/**
 * K-faktor: stora kliv i början (osäker skattning), små när vi vet mer.
 * Diagnosen använder maxvärdet direkt.
 */
export const kFactor = (attempts: number): number => Math.max(16, 64 - attempts * 3)

/** Uppdaterad rating efter ett svar. */
export function updateRating(
  rating: number,
  attempts: number,
  level: DifficultyLevel,
  correct: boolean,
): number {
  const expected = expectedSuccess(rating, level)
  const next = rating + kFactor(attempts) * ((correct ? 1 : 0) - expected)
  return Math.round(Math.min(RATING_MAX, Math.max(RATING_MIN, next)))
}

/**
 * Välj övningsnivå för en färdighet: den högsta nivå där barnet
 * väntas klara ≈ 70 %. Slumpvariationen (±1 ibland) läggs av
 * anroparen så motorn förblir deterministisk och testbar.
 */
export function practiceLevel(rating: number): DifficultyLevel {
  for (let level = 10 as DifficultyLevel; level >= 2; level--) {
    if (expectedSuccess(rating, level as DifficultyLevel) >= 0.7) return level as DifficultyLevel
  }
  return 1
}

/** Nivå med lite variation: mest practiceLevel, ibland ett steg upp/ner. */
export function variedLevel(rating: number, roll: number): DifficultyLevel {
  const base = practiceLevel(rating)
  const adjusted = roll < 0.2 ? base - 1 : roll > 0.85 ? base + 1 : base
  return Math.min(10, Math.max(1, adjusted)) as DifficultyLevel
}

/** Är färdigheten redo för bosstrid? Kravet är solid nivå, inte perfektion. */
export const BOSS_READY_RATING = 620 // ≈ klarar nivå 6 med god marginal
export const BOSS_READY_MIN_ATTEMPTS = 12

export function isBossReady(skill: SkillState): boolean {
  return skill.rating >= BOSS_READY_RATING && skill.attempts >= BOSS_READY_MIN_ATTEMPTS
}
