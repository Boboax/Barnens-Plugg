import { describe, expect, it } from 'vitest'
import { MOMENTS } from './curriculum'
import { MOMENT_INTROS } from './intros'
import { hasGenerator } from '../generators'

/* Varje moment barnet kan möta ska ha ett begreppskort — annars börjar
   introduktionen direkt med exempel utan att säga vad idén är. */

describe('begreppskort', () => {
  const trainable = MOMENTS.filter((m) => hasGenerator(m.generatorId))

  it('finns för varje moment med uppgifter', () => {
    const missing = trainable.filter((m) => !MOMENT_INTROS[m.id]).map((m) => m.id)
    expect(missing).toEqual([])
  })

  it('pekar bara på moment som finns', () => {
    const ids = new Set(MOMENTS.map((m) => m.id))
    expect(Object.keys(MOMENT_INTROS).filter((id) => !ids.has(id))).toEqual([])
  })

  it('är korta nog att läsas upp, och de yngsta har en lyssningsversion', () => {
    for (const m of trainable) {
      const intro = MOMENT_INTROS[m.id]
      expect(intro.idea.length, m.id).toBeLessThanOrEqual(220)
      if (m.year === 'F' || m.year === '1') {
        expect(intro.say, m.id).toBeTruthy()
        expect(intro.say!.length, m.id).toBeLessThanOrEqual(90)
      }
    }
  })
})
