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
}

export function rewardProgress(reward: Reward, profile: ChildProfile): RewardProgress {
  if (reward.target.type === 'moments') {
    const done = Math.min(reward.target.count, masteredCount(profile) - reward.baseline.momentsMastered)
    return {
      done: Math.max(0, done),
      total: reward.target.count,
      ratio: Math.max(0, Math.min(1, done / reward.target.count)),
      earned: done >= reward.target.count,
      label: `${Math.max(0, done)} av ${reward.target.count} moment`,
    }
  }
  if (reward.target.type === 'sessions') {
    const done = Math.min(reward.target.count, activeDayCount(profile) - reward.baseline.activeDays)
    return {
      done: Math.max(0, done),
      total: reward.target.count,
      ratio: Math.max(0, Math.min(1, done / reward.target.count)),
      earned: done >= reward.target.count,
      label: `${Math.max(0, done)} av ${reward.target.count} pass`,
    }
  }
  // Terminsmål: momenten i terminshalvan enligt läroplanen.
  const moments = momentsInTermHalf(reward.target.year, reward.target.term, reward.target.half)
  const done = moments.filter((m) => {
    const s = profile.skills[m.id]
    return s?.mastery === 'mastered' || s?.mastery === 'star'
  }).length
  const total = Math.max(1, moments.length)
  return {
    done,
    total,
    ratio: done / total,
    earned: done >= total,
    label: `${done} av ${total} moment · ${reward.target.term} åk ${reward.target.year}`,
  }
}
