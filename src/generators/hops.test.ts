import { describe, expect, it } from 'vitest'
import type { DifficultyLevel, Task } from '../domain/types'
import { generateTask } from './index'
import { hopSolution } from './helpers'

/* Tallinjehoppen i lösningsbilden: de ska alltid landa på rätt svar,
   gå VIA TIAN över tiotalsgränsen och VIA NOLLAN in bland de negativa
   talen — samma strategi som förklaringen lär ut. */

const hopsOf = (t: Task): number[] | undefined =>
  t.solution?.kind === 'tallinje' ? t.solution.hops : undefined

describe('tallinjehopp', () => {
  it('går via tian över tiotalsgränsen, annars ett enda hopp', () => {
    expect(hopSolution(8, 5, true)).toMatchObject({ max: 20, hops: [8, 10, 13] })
    expect(hopSolution(13, 5, false)).toMatchObject({ max: 20, hops: [13, 10, 8] })
    expect(hopSolution(3, 4, true)).toMatchObject({ max: 10, hops: [3, 7] })
    expect(hopSolution(10, 5, true)).toMatchObject({ hops: [10, 15] })
    expect(hopSolution(10, 3, false)).toMatchObject({ hops: [10, 7] })
    // Utanför 0–20 blir tallinjen för tät — ingen lösningsbild.
    expect(hopSolution(40, 5, true)).toBeUndefined()
  })

  it('additions- och subtraktionsuppgifterna landar alltid på rätt svar', () => {
    let checked = 0
    let viaTen = 0
    for (const id of ['gen.addition-0-10', 'gen.subtraktion-0-20', 'gen.tiotalsovergang-20', 'gen.add-sub-0-20']) {
      for (let level = 1; level <= 7; level++) {
        for (let seed = 1; seed <= 40; seed++) {
          const t = generateTask(id, level as DifficultyLevel, seed)
          const hops = hopsOf(t)
          if (!hops || t.answer.kind !== 'numeric' || t.prompt.includes('__')) continue
          expect(hops[hops.length - 1]).toBe(t.answer.value)
          checked++
          if (hops.length === 3) viaTen++
          if (t.solution?.kind === 'tallinje') for (const h of hops) expect(h).toBeGreaterThanOrEqual(t.solution.min)
        }
      }
    }
    // Testet ska faktiskt ha sett hopp — och tiotalsövergången ska gå via tian.
    expect(checked).toBeGreaterThan(200)
    expect(viaTen).toBeGreaterThan(20)
  })

  it('negativa tal hoppar via nollan', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const t = generateTask('gen.negativa-tal', 3, seed)
      const hops = hopsOf(t)
      expect(hops).toBeDefined()
      if (t.answer.kind === 'numeric' && t.prompt.startsWith('Vad är')) {
        expect(hops![hops!.length - 1]).toBe(t.answer.value)
        if (hops![0] !== 0) expect(hops).toContain(0)
      }
    }
  })
})
