import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { LESSONS, sceneDurationMs, sceneSpoken } from '../../../domain/lessons'
import { MOMENTS } from '../../../domain/curriculum'
import { LESSON_VISUALS } from './visuals'

describe('minilektionerna', () => {
  it('hör till riktiga moment och har en bild var', () => {
    const ids = new Set(MOMENTS.map((m) => m.id))
    for (const id of Object.keys(LESSONS)) {
      expect(ids.has(id), id).toBe(true)
      expect(LESSON_VISUALS[id], id).toBeTypeOf('function')
    }
    expect(Object.keys(LESSON_VISUALS).sort()).toEqual(Object.keys(LESSONS).sort())
  })

  it('är korta filmer: 4–8 scener, ingen scen över en halv minut', () => {
    for (const [id, lesson] of Object.entries(LESSONS)) {
      expect(lesson.scenes.length, id).toBeGreaterThanOrEqual(4)
      expect(lesson.scenes.length, id).toBeLessThanOrEqual(8)
      for (const s of lesson.scenes) expect(sceneDurationMs(s), s.text).toBeLessThan(30_000)
    }
  })

  it('läser aldrig upp symboler som låter fel (snedstreck i bråk)', () => {
    for (const lesson of Object.values(LESSONS)) {
      for (const s of lesson.scenes) expect(sceneSpoken(s), s.text).not.toMatch(/\d\/\d/)
    }
  })

  it('ritar varje scen utan att krascha', () => {
    for (const [id, lesson] of Object.entries(LESSONS)) {
      lesson.scenes.forEach((_, step) => {
        const html = renderToStaticMarkup(createElement('svg', null, createElement(LESSON_VISUALS[id], { step })))
        expect(html.length, `${id} steg ${step}`).toBeGreaterThan(100)
        expect(html, `${id} steg ${step}`).not.toMatch(/NaN|undefined/)
      })
    }
  })
})
