/**
 * Seedad slumpgenerator (mulberry32). Samma frö → samma uppgift,
 * vilket gör varje genererad uppgift reproducerbar vid felsökning
 * och hindrar att omprov ger identiska frågor (nytt frö varje gång).
 */
export interface Rng {
  /** Flyttal [0, 1). */
  next(): number
  /** Heltal i [min, max] (inklusive). */
  int(min: number, max: number): number
  pick<T>(items: readonly T[]): T
  shuffle<T>(items: readonly T[]): T[]
  /** true med sannolikhet p. */
  chance(p: number): boolean
}

export function createRng(seed: number): Rng {
  let a = seed >>> 0
  const next = (): number => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    pick: (items) => items[Math.floor(next() * items.length)],
    shuffle: (items) => {
      const arr = [...items]
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1))
        ;[arr[i], arr[j]] = [arr[j], arr[i]]
      }
      return arr
    },
    chance: (p) => next() < p,
  }
}

/** Slumpfrö för nya uppgifter (utanför generatorerna får Date användas). */
export const freshSeed = (): number => (Math.random() * 0xffffffff) >>> 0
