import type { ChildProfile, SkillState } from '../domain/types'
import { momentById } from '../domain/curriculum'
import { hasGenerator } from '../generators'
import { GUESS_MS } from './daily'

/* ============================================================
   Spärren: stanna upp vid gissning, kliv ner vid kamp.

   Analysen av barnens pass (okt 2026): sexåringen gjorde 50–70 svar om
   dagen på "Över tian" med 7–13 % rätt och en sekund per svar — han
   tryckte på måfå, och motorn fortsatte servera samma moment eftersom
   nivån redan var 1. Kalla handen (ett steg ner) räcker inte när steget
   under inte finns. Förälderns beslut:

   - Gissar barnet (flera snabba fel i rad) stannar Pi upp det: läs, lyssna,
     tänk efter — knappen för att fortsätta väntar några sekunder.
   - Kämpar barnet (nästan inget rätt på flera uppgifter) får det välja:
     se filmen igen, lättare uppgifter eller ett försök till.
   - "För svårt?" finns alltid att trycka på — barnet ska enkelt kunna säga
     till, och det är aldrig fel att göra det.
   - Väljer barnet lättare uppgifter vilar momentet resten av dagen, och
     passet tränar en förkunskap i stället.

   Allt loggas (child.struggles) så att föräldern ser det dag för dag.
   Rena funktioner; samma objekt tillbaka när inget ändras.
   ============================================================ */

export type StruggleKind = 'gissar' | 'kampar' | 'for-svart'

export interface StruggleEvent { at: string; momentId: string; kind: StruggleKind }

/** Hur många händelser som sparas per barn (ringbuffert). */
const STRUGGLE_LOG_LIMIT = 200

export interface RecentAnswer { correct: boolean; elapsedMs: number }

/**
 * Säger svaren i följd på ett moment att barnet gissar eller kämpar?
 * Gissar: minst 3 av de senaste 4 är fel på under GUESS_MS (man hinner inte
 * läsa så fort). Kämpar: högst 1 rätt av de senaste 6.
 */
export function detectStruggle(recent: readonly RecentAnswer[]): 'gissar' | 'kampar' | undefined {
  const last4 = recent.slice(-4)
  if (last4.length >= 3 && last4.filter((r) => !r.correct && r.elapsedMs < GUESS_MS).length >= 3) return 'gissar'
  const last6 = recent.slice(-6)
  if (last6.length >= 6 && last6.filter((r) => r.correct).length <= 1) return 'kampar'
  return undefined
}

const trainable = (s: SkillState | undefined): boolean =>
  !!s && s.mastery !== 'locked' && hasGenerator(momentById(s.momentId).generatorId)

/**
 * Ett lättare moment att träna i stället: närmaste förkunskap (sedan
 * förkunskapens förkunskap …) som barnet har öppen. undefined om inget finns.
 */
export function easierMomentFor(momentId: string, skills: Record<string, SkillState>): string | undefined {
  const seen = new Set<string>([momentId])
  let frontier = [...momentById(momentId).prerequisites]
  while (frontier.length) {
    const next: string[] = []
    for (const id of frontier) {
      if (seen.has(id)) continue
      seen.add(id)
      if (trainable(skills[id])) return id
      next.push(...momentById(id).prerequisites)
    }
    frontier = next
  }
  return undefined
}

/** Vilar momentet i dag? (Barnet valde lättare uppgifter.) */
export const restingToday = (skill: SkillState | undefined, today: string): boolean => skill?.restDay === today

/** Låt momentet vila resten av dagen. */
export function restMoment(child: ChildProfile, momentId: string, today: string): ChildProfile {
  const s = child.skills[momentId]
  if (!s || s.restDay === today) return child
  return { ...child, skills: { ...child.skills, [momentId]: { ...s, restDay: today } } }
}

/** Logga en händelse för föräldrarapporten. */
export function logStruggle(child: ChildProfile, momentId: string, kind: StruggleKind, at: string): ChildProfile {
  const log = [...(child.struggles ?? []), { at, momentId, kind }].slice(-STRUGGLE_LOG_LIMIT)
  return { ...child, struggles: log }
}
