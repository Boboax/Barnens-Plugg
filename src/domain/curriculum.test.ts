import { describe, expect, it } from 'vitest'
import { MOMENTS, MOMENTS_ORDERED, momentsInTermHalf, validateCurriculum } from './curriculum'
import { WORLDS } from './worlds'
import { hasGenerator } from '../generators'

describe('läroplansträdet', () => {
  it('är konsistent: unika id:n, kända förkunskaper, inga cykler, rätt ordning', () => {
    expect(validateCurriculum()).toEqual([])
  })

  it('alla moment pekar på en existerande värld', () => {
    const worldIds = new Set(WORLDS.map((w) => w.id))
    for (const m of MOMENTS) expect(worldIds.has(m.worldId), `${m.id} → ${m.worldId}`).toBe(true)
  })

  it('alla utlovade generatorer finns i registret', () => {
    for (const m of MOMENTS) {
      if (m.generatorId) expect(hasGenerator(m.generatorId), `${m.id} saknar ${m.generatorId}`).toBe(true)
    }
  })

  it('den ordnade listan följer terminsordningen', () => {
    const years = MOMENTS_ORDERED.map((m) => ['F', '1', '2', '3', '4', '5', '6'].indexOf(m.year))
    for (let i = 1; i < years.length; i++) expect(years[i]).toBeGreaterThanOrEqual(years[i - 1])
  })

  it('terminsmål hittar moment', () => {
    expect(momentsInTermHalf('2', 'HT', 1).length).toBeGreaterThan(0)
  })
})
