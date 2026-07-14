import type { ChildProfile, Reward } from '../domain/types'
import { momentsInTermHalf } from '../domain/curriculum'

/* ============================================================
   Belöningar i verkliga livet.

   Definieras i föräldraläget och kopplas till genomförd träning
   och behärskade moment — aldrig till poäng eller hastighet
   (belöningar för fart urholkar noggrannheten och den inre
   motivationen). När målet nås skapas en kupong som föräldern
   kvitterar.
   ============================================================ */

export const masteredCount = (profile: ChildProfile): number =>
  Object.values(profile.skills).filter((s) => s.mastery === 'mastered' || s.mastery === 'star').length

/** Aktiva dagar = dagar med registrerad användningstid. */
export const activeDayCount = (profile: ChildProfile): number =>
  Object.entries(profile.usageSeconds).filter(([, secs]) => secs >= 120).length

export interface RewardProgress {
  done: number
  total: number
  ratio: number
  earned: boolean
  label: string
  /** Barnspråk: exakt vad som krävs för att få belöningen. */
  requirement: string
  /** Nästa konkreta steg (momenttitlar), när målet pekar på specifika moment. */
  nextSteps: string[]
}

export function rewardProgress(reward: Reward, profile: ChildProfile): RewardProgress {
  if (reward.target.type === 'moments') {
    const done = Math.max(0, Math.min(reward.target.count, masteredCount(profile) - reward.baseline.momentsMastered))
    const left = reward.target.count - done
    return {
      done,
      total: reward.target.count,
      ratio: Math.max(0, Math.min(1, done / reward.target.count)),
      earned: done >= reward.target.count,
      label: `${done} av ${reward.target.count} moment`,
      requirement:
        left <= 0 ? 'Klart!' : `Besegra ${left} ${left === 1 ? 'boss' : 'bossar'} till — valfria moment räknas`,
      nextSteps: [],
    }
  }
  if (reward.target.type === 'sessions') {
    const done = Math.max(0, Math.min(reward.target.count, activeDayCount(profile) - reward.baseline.activeDays))
    const left = reward.target.count - done
    return {
      done,
      total: reward.target.count,
      ratio: Math.max(0, Math.min(1, done / reward.target.count)),
      earned: done >= reward.target.count,
      label: `${done} av ${reward.target.count} träningsdagar`,
      requirement: left <= 0 ? 'Klart!' : `Träna ${left} ${left === 1 ? 'dag' : 'dagar'} till`,
      nextSteps: [],
    }
  }
  // Terminsmål: momenten i terminshalvan enligt läroplanen.
  const moments = momentsInTermHalf(reward.target.year, reward.target.term, reward.target.half)
  const isDone = (id: string): boolean => {
    const s = profile.skills[id]
    return s?.mastery === 'mastered' || s?.mastery === 'star'
  }
  const done = moments.filter((m) => isDone(m.id)).length
  // Tom terminshalva (inga läroplansmoment) räknas som klar — annars fastnade
  // belöningen olöslig på "0 av 1" (max(1, 0) gjorde den omöjlig att nå).
  const total = moments.length
  const remaining = moments.filter((m) => !isDone(m.id))
  const left = remaining.length
  return {
    done,
    total,
    ratio: total ? done / total : 1,
    earned: done >= total,
    label: total === 0
      ? `Terminsmål · ${reward.target.term} åk ${reward.target.year}`
      : `${done} av ${total} moment · ${reward.target.term} åk ${reward.target.year}`,
    requirement:
      left <= 0 ? 'Klart!' : `Klara ${left} moment till i terminens mål (${reward.target.term} åk ${reward.target.year})`,
    nextSteps: remaining.map((m) => m.title),
  }
}
