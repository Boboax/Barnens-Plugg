import type { Choice, DifficultyLevel, MisconceptionTag, Task, TaskVisual } from '../domain/types'
import type { Rng } from './rng'

/* Gemensamma byggstenar för alla uppgiftsgeneratorer. */

export interface NumericSpec {
  generatorId: string
  level: DifficultyLevel
  seed: number
  prompt: string
  spokenPrompt?: string
  value: number
  unit?: string
  explanation: string
  visual?: TaskVisual
  /** felvärde → missuppfattning, för klassning av fria numeriska svar */
  misconceptions?: Record<number, MisconceptionTag>
}

export function numericTask(spec: NumericSpec): Task {
  // Skydd: en missuppfattningsnyckel får aldrig sammanfalla med rätt svar
  // (kan hända när slumpade tal råkar kollidera, t.ex. 4 − 2 = 2).
  let misconceptionMap = spec.misconceptions
  if (misconceptionMap && spec.value in misconceptionMap) {
    misconceptionMap = Object.fromEntries(
      Object.entries(misconceptionMap).filter(([wrong]) => Number(wrong) !== spec.value),
    )
  }
  return {
    ref: { generatorId: spec.generatorId, level: spec.level, seed: spec.seed },
    prompt: spec.prompt,
    spokenPrompt: spec.spokenPrompt,
    visual: spec.visual ?? { kind: 'ingen' },
    answer: { kind: 'numeric', value: spec.value, unit: spec.unit },
    explanation: spec.explanation,
    misconceptionMap,
  }
}

export interface ChoiceSpec {
  generatorId: string
  level: DifficultyLevel
  seed: number
  prompt: string
  spokenPrompt?: string
  correct: string
  /** text → missuppfattning (eller null för "bara fel") */
  distractors: [string, MisconceptionTag | null][]
  explanation: string
  visual?: TaskVisual
  rng: Rng
}

export function choiceTask(spec: ChoiceSpec): Task {
  // Släng distraktorer som råkar sammanfalla med rätt svar eller varandra.
  const seen = new Set<string>([spec.correct])
  const distractors = spec.distractors.filter(([text]) => {
    if (seen.has(text)) return false
    seen.add(text)
    return true
  })
  const choices: Choice[] = spec.rng.shuffle([
    { text: spec.correct, correct: true },
    ...distractors.map(([text, mis]) => ({
      text,
      correct: false,
      misconception: mis ?? undefined,
    })),
  ])
  return {
    ref: { generatorId: spec.generatorId, level: spec.level, seed: spec.seed },
    prompt: spec.prompt,
    spokenPrompt: spec.spokenPrompt,
    visual: spec.visual ?? { kind: 'ingen' },
    answer: { kind: 'choice', choices },
    explanation: spec.explanation,
  }
}

/** Unika distraktorvärden: filtrerar bort dubletter, rätt svar och ogiltiga (< 0 om så önskas). */
export function uniqueDistractors(
  correct: number,
  candidates: [number, MisconceptionTag | null][],
  opts: { allowNegative?: boolean; count?: number } = {},
): [string, MisconceptionTag | null][] {
  const seen = new Set<number>([correct])
  const out: [string, MisconceptionTag | null][] = []
  for (const [v, tag] of candidates) {
    if (seen.has(v)) continue
    if (!opts.allowNegative && v < 0) continue
    seen.add(v)
    out.push([String(v), tag])
    if (out.length >= (opts.count ?? 3)) break
  }
  return out
}

/** Formatterar decimaltal på svenska (komma). */
export const sv = (n: number): string =>
  n.toLocaleString('sv-SE', { maximumFractionDigits: 3 })

/** Namn till textuppgifter — kort, könsblandat, lätt att läsa. */
const NAMES = ['Elsa', 'Hugo', 'Lo', 'Ali', 'Maja', 'Nils', 'Siri', 'Omar', 'Vera', 'Otto', 'Alma', 'Juno'] as const
export const pickName = (rng: Rng): string => rng.pick(NAMES)
export const pickTwoNames = (rng: Rng): [string, string] => {
  const [a, b] = rng.shuffle(NAMES)
  return [a, b]
}

/** Saker att räkna i textuppgifter: [singular, plural, emoji]. */
const THINGS: [string, string, string][] = [
  ['kula', 'kulor', '🔵'],
  ['kort', 'kort', '🃏'],
  ['äpple', 'äpplen', '🍎'],
  ['klistermärke', 'klistermärken', '⭐'],
  ['snäcka', 'snäckor', '🐚'],
  ['kotte', 'kottar', '🌰'],
  ['boll', 'bollar', '⚽'],
  ['bulle', 'bullar', '🥐'],
]
export const pickThing = (rng: Rng): [string, string, string] => rng.pick(THINGS)

/** Tiobas-visualisering av en term (för CRA-stödet på låga nivåer). */
export const tiobas = (...numbers: number[]): TaskVisual => ({
  kind: 'tiobas',
  groups: numbers.map((n) => ({
    hundreds: Math.floor(n / 100),
    tens: Math.floor((n % 100) / 10),
    ones: n % 10,
  })),
})

/** Skala ett intervall efter nivå: nivå 1 → [lo], nivå 10 → [hi]. */
export const lerpInt = (level: DifficultyLevel, lo: number, hi: number): number =>
  Math.round(lo + ((hi - lo) * (level - 1)) / 9)
