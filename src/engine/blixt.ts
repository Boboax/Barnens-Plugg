import type { BlixtKind, ChildProfile, DifficultyLevel, SchoolYear, Task } from '../domain/types'
import { momentById } from '../domain/curriculum'
import { generateTask } from '../generators'
import { createRng, freshSeed } from '../generators/rng'

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

// FK kör UTAN synlig klocka: en fast liten mängd frågor, "gör så snabbt du
// kan". Tiden mäts ändå i det tysta (för föräldern). Från åk 1 tickar klockan.
export const BLIXT_UNTIMED_COUNT = 15
export const BLIXT_UNTIMED_PASS = 12 // ~80 % rätt = klarad

/** Tidssatt blixt (synlig klocka) från åk 1; FK kör utan tidspress. */
export const blixtTimed = (schoolYear: SchoolYear): boolean => schoolYear !== 'F'

/* Flyt-grind: varje blixttest måste KLARAS (nå målet) innan momentet det
   grindar öppnas. Obegränsade omförsök, aldrig straff. Forskningsgrund:
   mastery learning + automatisering; se docs/PEDAGOGIK.md. */
export const BLIXT_GATE: Record<BlixtKind, string> = {
  'add-sub-0-10': 'addition-0-20',
  'add-sub-0-20': 'tiotalsovergang-20',
  tabeller: 'mult-div-samband',
}
const BLIXT_ORDER: BlixtKind[] = ['add-sub-0-10', 'add-sub-0-20', 'tabeller']

/** Har barnet klarat blixten minst en gång (grinden öppen)? */
export const blixtCleared = (kind: BlixtKind, profile: ChildProfile): boolean =>
  profile.blixt?.[kind]?.cleared === true

/** Moment som är låsta av en ännu oklarad flyt-grind. */
export function blixtBlockedMoments(profile: ChildProfile): Set<string> {
  const blocked = new Set<string>()
  for (const kind of BLIXT_ORDER) {
    if (!blixtCleared(kind, profile)) blocked.add(BLIXT_GATE[kind])
  }
  return blocked
}

/** Vilken flyt-grind blockerar just nu (barnet har nått den men inte klarat)?
    Styr "nästa steg" på hemskärmen. undefined = ingen grind väntar. */
export function pendingBlixtKind(profile: ChildProfile): BlixtKind | undefined {
  const done = (id: string): boolean => {
    const m = profile.skills[id]?.mastery
    return m === 'mastered' || m === 'star'
  }
  for (const kind of BLIXT_ORDER) {
    if (blixtCleared(kind, profile)) continue
    // Grinden väntar när momentet den grindar är redo så när som på blixten.
    if (momentById(BLIXT_GATE[kind]).prerequisites.every(done)) return kind
  }
  return undefined
}

export interface BlixtConfig {
  kind: BlixtKind
  title: string
  emoji: string
  /** Momentet som låser upp testet (samma kedja som skolan följer). */
  unlockMomentId: string
  /** Generator-id:n som blandas + tillåtet nivåspann (bara rena tal). */
  sources: { generatorId: string; minLevel: DifficultyLevel; maxLevel: DifficultyLevel }[]
}

// Nivåspannen börjar LÅGT (lätt i början) och toppen ger rum för trappan att
// stiga varje gång barnet når målet. Håller sig i det rena sifferspannet.
export const BLIXT_TESTS: BlixtConfig[] = [
  {
    kind: 'add-sub-0-10',
    title: 'Plus & minus 0–10',
    emoji: '⚡',
    unlockMomentId: 'add-sub-0-10',
    sources: [{ generatorId: 'gen.add-sub-0-10', minLevel: 2, maxLevel: 6 }],
  },
  {
    kind: 'add-sub-0-20',
    title: 'Plus & minus 0–20',
    emoji: '🌩',
    unlockMomentId: 'add-sub-0-20',
    sources: [
      { generatorId: 'gen.add-sub-0-20', minLevel: 2, maxLevel: 6 },
      { generatorId: 'gen.tiotalsovergang-20', minLevel: 3, maxLevel: 6 },
    ],
  },
  {
    kind: 'tabeller',
    title: 'Tabellerna',
    emoji: '✨',
    // Låses upp när ALLA tabeller lärts in — då grindar den vägen vidare.
    unlockMomentId: 'tabeller-alla',
    sources: [{ generatorId: 'gen.tabeller-alla', minLevel: 2, maxLevel: 7 }],
  },
]

/** Hur många steg trappan kan stiga för ett test (0 = redan på toppen). */
export const blixtMaxTier = (kind: BlixtKind): number =>
  Math.max(...blixtConfig(kind).sources.map((s) => s.maxLevel - s.minLevel))

/** Aktuell trappnivå (0-baserad) för barnet — stiger när minutmålet nås. */
export const blixtTier = (kind: BlixtKind, profile: ChildProfile): number =>
  Math.min(blixtMaxTier(kind), Math.max(0, profile.blixt?.[kind]?.tier ?? 0))

/** Ungefärlig svårighetsnivå (1–10) barnet spelar just nu — för UI-visning. */
export const blixtLevel = (kind: BlixtKind, profile: ChildProfile): DifficultyLevel => {
  const tier = blixtTier(kind, profile)
  const s = blixtConfig(kind).sources[0]
  return Math.min(s.maxLevel, s.minLevel + tier) as DifficultyLevel
}

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
  // Svårigheten följer TRAPPAN (antal gånger målet nåtts), inte nodratingen —
  // så rundorna börjar lätta och blir successivt svårare för alla barn.
  const tier = blixtTier(kind, profile)
  const level = Math.min(source.maxLevel, source.minLevel + tier) as DifficultyLevel
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
