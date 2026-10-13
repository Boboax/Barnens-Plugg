import { describe, expect, it } from 'vitest'
import type { DifficultyLevel, TaskVisual } from '../domain/types'
import { allGeneratorIds, generateTask } from './index'

/* Stapelmodellen ska alltid gå ihop: delarna har bredd, lösningsbilden
   visar svaret, och stödbilden före svaret har ett frågetecken — men
   avslöjar aldrig svaret. */

const texts = (v: Extract<TaskVisual, { kind: 'stapelmodell' }>): string[] => [
  ...v.rows.flatMap((r) => r.parts.map((p) => p.text)),
  v.total?.text ?? '',
  v.diff?.text ?? '',
]
const hasUnknown = (v: Extract<TaskVisual, { kind: 'stapelmodell' }>): boolean =>
  v.rows.some((r) => r.parts.some((p) => p.unknown)) || !!v.total?.unknown || !!v.diff?.unknown

describe('stapelmodellen', () => {
  it('går ihop i alla generatorer, nivåer och frön', () => {
    let seen = 0
    for (const id of allGeneratorIds()) {
      for (let level = 1; level <= 10; level++) {
        for (let seed = 0; seed < 120; seed++) {
          const task = generateTask(id, level as DifficultyLevel, seed)
          if (task.answer.kind !== 'numeric') continue
          const answer = String(task.answer.value)
          const label = `${id} n${level} f${seed}`
          if (task.solution?.kind === 'stapelmodell') {
            seen++
            for (const r of task.solution.rows) for (const p of r.parts) expect(p.size, label).toBeGreaterThan(0)
            expect(texts(task.solution).some((t) => t.split(/[^0-9]+/).includes(answer)), label).toBe(true)
            expect(hasUnknown(task.solution), label).toBe(false)
          }
          if (task.visual.kind === 'stapelmodell') {
            expect(hasUnknown(task.visual), label).toBe(true)
            // Svaret får inte stå utskrivet i stödbilden (om det inte råkar
            // vara ett av de givna talen i uppgiften).
            if (!task.prompt.split(/[^0-9]+/).includes(answer)) {
              expect(texts(task.visual).some((t) => t.split(/[^0-9]+/).includes(answer)), label).toBe(false)
            }
          }
        }
      }
    }
    expect(seen).toBeGreaterThan(200)
  })
})
