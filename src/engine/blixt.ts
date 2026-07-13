import type { BlixtKind, ChildProfile, DifficultyLevel, Task } from '../domain/types'
import { generateTask } from '../generators'
import { createRng, freshSeed } from '../generators/rng'
import { practiceLevel } from './rating'

/* ============================================================
   Blixtpass — flytträning i skolans minuttest-format.

   Skolan testar: klara N uppgifter på en minut för plus/minus 0–10,
   sedan 0–20, och multiplikationstabellerna. Blixtpassen speglar det
   formatet exakt, men ramas in som tävling mot sig själv: slå ditt
   rekord — skolans mål syns som en ribba på vägen, aldrig som
   underkänt. Fel svar kostar ingenting (de räknas bara inte).

   Nivåerna hålls i spannet där generatorerna ger rena sifferuppgifter
   (inga textuppgifter, inga öppna utsagor) — flyt handlar om fakta.
   ============================================================ */

export const BLIXT_SECONDS = 60
export const BLIXT_DEFAULT_TARGET = 20

export interface BlixtConfig {
  kind: BlixtKind
  title: string
  emoji: string
  /** Momentet som låser upp testet (samma kedja som skolan följer). */
  unlockMomentId: string
  /** Generator-id:n som blandas + tillåtet nivåspann (bara rena tal). */
  sources: { generatorId: string; minLevel: DifficultyLevel; maxLevel: DifficultyLevel }[]
}

export const BLIXT_TESTS: BlixtConfig[] = [
  {
    kind: 'add-sub-0-10',
    title: 'Plus & minus 0–10',
    emoji: '⚡',
    unlockMomentId: 'add-sub-0-10',
    sources: [{ generatorId: 'gen.add-sub-0-10', minLevel: 3, maxLevel: 5 }],
  },
  {
    kind: 'add-sub-0-20',
    title: 'Plus & minus 0–20',
    emoji: '🌩',
    unlockMomentId: 'add-sub-0-20',
    sources: [
      { generatorId: 'gen.add-sub-0-20', minLevel: 3, maxLevel: 5 },
      { generatorId: 'gen.tiotalsovergang-20', minLevel: 3, maxLevel: 5 },
    ],
  },
  {
    kind: 'tabeller',
    title: 'Tabellerna',
    emoji: '✨',
    unlockMomentId: 'mult-intro',
    sources: [{ generatorId: 'gen.tabeller-alla', minLevel: 2, maxLevel: 6 }],
  },
]

export const blixtConfig = (kind: BlixtKind): BlixtConfig => {
  const cfg = BLIXT_TESTS.find((t) => t.kind === kind)
  if (!cfg) throw new Error(`Okänt blixttest: ${kind}`)
  return cfg
}

/** Ett blixttest låses upp när barnet börjat träna motsvarande moment. */
export function blixtUnlocked(kind: BlixtKind, profile: ChildProfile): boolean {
  const skill = profile.skills[blixtConfig(kind).unlockMomentId]
  return skill !== undefined && skill.mastery !== 'locked' && skill.mastery !== 'available'
}

export const unlockedBlixtTests = (profile: ChildProfile): BlixtConfig[] =>
  BLIXT_TESTS.filter((t) => blixtUnlocked(t.kind, profile))

/**
 * Nästa blixtuppgift: nivån följer barnets rating på upplåsningsmomentet
 * (klämd till det rena sifferspannet) — den som kan mer får svårare fakta.
 */
export function blixtTask(kind: BlixtKind, profile: ChildProfile): Task {
  const cfg = blixtConfig(kind)
  const rng = createRng(freshSeed())
  const source = rng.pick(cfg.sources)
  const rating = profile.skills[cfg.unlockMomentId]?.rating ?? 300
  const level = Math.min(source.maxLevel, Math.max(source.minLevel, practiceLevel(rating))) as DifficultyLevel
  // Blixtpass kräver rena sifferuppgifter — generera om ifall en variant
  // med längre text slinker igenom (händer inte i spannet, men bältet+hängslen).
  for (let i = 0; i < 5; i++) {
    const task = generateTask(source.generatorId, level, freshSeed())
    if (task.answer.kind === 'numeric' && task.prompt.length <= 24) return task
  }
  return generateTask(source.generatorId, source.minLevel, freshSeed())
}

/** Skolans mål för testet (förälderns inställning eller standard). */
export const blixtTarget = (
  kind: BlixtKind,
  targets: Partial<Record<BlixtKind, number>> | undefined,
): number => targets?.[kind] ?? BLIXT_DEFAULT_TARGET
