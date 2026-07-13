import { describe, expect, it } from 'vitest'
import type { DifficultyLevel } from '../domain/types'
import { allGeneratorIds, generateTask } from './index'

/**
 * Fuzz-test av samtliga generatorer: alla nivåer, många frön.
 * Fångar ogiltiga uppgifter (dubbla rätta svar, NaN, tomma val)
 * innan något barn någonsin ser dem.
 */
describe('uppgiftsgeneratorerna', () => {
  const LEVELS: DifficultyLevel[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  const SEEDS = Array.from({ length: 25 }, (_, i) => i * 7919 + 1)

  for (const id of allGeneratorIds()) {
    it(`${id}: giltiga uppgifter på alla nivåer`, () => {
      for (const level of LEVELS) {
        for (const seed of SEEDS) {
          const task = generateTask(id, level, seed)
          expect(task.prompt.length, `${id} n${level} f${seed}: tom prompt`).toBeGreaterThan(0)
          expect(task.explanation.length).toBeGreaterThan(0)

          if (task.answer.kind === 'numeric') {
            expect(Number.isFinite(task.answer.value), `${id} n${level} f${seed}: NaN-svar`).toBe(true)
          } else {
            const correct = task.answer.choices.filter((c) => c.correct)
            expect(correct.length, `${id} n${level} f${seed}: exakt ett rätt svar`).toBe(1)
            expect(task.answer.choices.length, `${id} n${level} f${seed}: minst två val`).toBeGreaterThanOrEqual(2)
            const texts = task.answer.choices.map((c) => c.text)
            expect(new Set(texts).size, `${id} n${level} f${seed}: dubblettval: ${texts.join(' | ')}`).toBe(texts.length)
          }
        }
      }
    })
  }

  it('samma frö ger samma uppgift (reproducerbarhet)', () => {
    const a = generateTask('gen.vaxling-0-100', 5, 12345)
    const b = generateTask('gen.vaxling-0-100', 5, 12345)
    expect(a).toEqual(b)
  })

  it('missuppfattningskartan pekar aldrig på rätt svar', () => {
    for (const id of allGeneratorIds()) {
      for (const seed of SEEDS.slice(0, 10)) {
        const task = generateTask(id, 6, seed)
        if (task.answer.kind === 'numeric' && task.misconceptionMap) {
          for (const wrong of Object.keys(task.misconceptionMap)) {
            expect(Number(wrong), `${id} f${seed}`).not.toBe(task.answer.value)
          }
        }
      }
    }
  })
})
