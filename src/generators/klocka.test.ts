import { describe, expect, it } from 'vitest'
import type { DifficultyLevel } from '../domain/types'
import { generateTask } from './index'

/* Klockans förklaring ska säga VARFÖR tiden heter som den heter — och
   alltid sluta med rätt svar. "Halv" är den klassiska fällan (halv fyra
   = 3:30), så den förklaras uttryckligen. */

describe('klockans förklaringar', () => {
  it('slutar med rätt svar och förklarar halv, kvart i och fem i halv', () => {
    const seen = new Set<string>()
    for (const id of ['gen.klockan-hel-halv', 'gen.klockan-kvart', 'gen.klockan-minuter']) {
      for (let level = 1; level <= 7; level++) {
        for (let seed = 1; seed <= 30; seed++) {
          const t = generateTask(id, level as DifficultyLevel, seed)
          const correct = t.answer.kind === 'choice' ? t.answer.choices.find((c) => c.correct)!.text : ''
          expect(t.explanation.endsWith(`${correct}.`), t.explanation).toBe(true)
          if (correct.startsWith('halv')) { expect(t.explanation).toContain('halvvägs TILL nästa timme'); seen.add('halv') }
          if (correct.startsWith('kvart i')) { expect(t.explanation).toContain('kvar till'); seen.add('kvart i') }
          if (correct.startsWith('fem i halv')) { expect(t.explanation).toContain('innan halv'); seen.add('fem i halv') }
        }
      }
    }
    expect([...seen].sort()).toEqual(['fem i halv', 'halv', 'kvart i'])
  })
})
