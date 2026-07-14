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

/** Generiska namn till textuppgifter — kort, könsblandat, lätt att läsa. */
const DEFAULT_NAMES = ['Elsa', 'Hugo', 'Lo', 'Ali', 'Maja', 'Nils', 'Siri', 'Omar', 'Vera', 'Otto', 'Alma', 'Juno']

/*
 * Namnpool för textuppgifter. UI-lagret kan väva in barnets EGET namn
 * (och syskonens) via setNamePool — hämtat från de lokala profilerna vid
 * körning. Namnen finns aldrig i koden eller i repot, bara på enheten.
 * Poolen är modulnivå så generatorernas signatur förblir (level, seed);
 * seedet avgör fortfarande vilket index som väljs, så uppgifterna är
 * reproducerbara för en given pool (default-poolen i tester).
 */
let weightedPool: string[] = [...DEFAULT_NAMES]
let uniquePool: string[] = [...DEFAULT_NAMES]

/** Väv in barnets namn (väger tyngst) och syskonens i textuppgifterna. */
export function setNamePool(childName: string, siblingNames: string[] = []): void {
  const firstName = (n: string): string => n.trim().split(/\s+/)[0] ?? ''
  const child = firstName(childName)
  if (!child) { resetNamePool(); return }
  const siblings = siblingNames.map(firstName).filter((n) => n && n !== child)
  // Barnets eget namn ~4x, syskon 1x, sedan generiska namn för variation.
  weightedPool = [child, child, child, child, ...siblings, ...DEFAULT_NAMES]
  uniquePool = [...new Set([child, ...siblings, ...DEFAULT_NAMES])]
}

/** Återgå till enbart generiska namn (t.ex. när inget barn är aktivt). */
export function resetNamePool(): void {
  weightedPool = [...DEFAULT_NAMES]
  uniquePool = [...DEFAULT_NAMES]
}

export const pickName = (rng: Rng): string => rng.pick(weightedPool)
export const pickTwoNames = (rng: Rng): [string, string] => {
  const shuffled = rng.shuffle(uniquePool)
  return [shuffled[0], shuffled[1]]
}

/** Saker att räkna i textuppgifter: [singular, plural, ikon-nyckel].
    Tredje fältet är en nyckel till public/art/objekt/*.webp (målad ikon som
    ritas i grupper-visualiseringen), inte längre en emoji. */
const THINGS: [string, string, string][] = [
  ['kula', 'kulor', 'kula'],
  ['kort', 'kort', 'kort'],
  ['äpple', 'äpplen', 'apple'],
  ['klistermärke', 'klistermärken', 'klistermarke'],
  ['snäcka', 'snäckor', 'snacka'],
  ['kotte', 'kottar', 'kotte'],
  ['boll', 'bollar', 'boll'],
  ['bulle', 'bullar', 'bulle'],
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
