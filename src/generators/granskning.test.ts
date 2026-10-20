import { describe, expect, it } from 'vitest'
import type { DifficultyLevel } from '../domain/types'
import { generateTask } from './index'

/* Granskningen av uppgifterna (okt 2026): bilder som ritade svaret,
   tvåval som gick att gissa, och förklaringar som bara upprepade facit.
   Testerna vaktar att de felen inte kommer tillbaka. */

const seeds = Array.from({ length: 200 }, (_, i) => i)
const levels: DifficultyLevel[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

describe('granskning av uppgifterna', () => {
  it('dela upp tal: bilden visar helheten, aldrig båda delarna', () => {
    for (const level of levels.filter((l) => l <= 7)) {
      for (const seed of seeds) {
        const v = generateTask('gen.dela-upp-tal', level, seed).visual
        if (v.kind === 'tiobas') expect(v.groups).toHaveLength(1)
      }
    }
  })

  it('dela upp tal: nivå 1 har fler än fyra olika uppgifter', () => {
    const prompts = new Set(seeds.map((s) => generateTask('gen.dela-upp-tal', 1, s).prompt))
    expect(prompts.size).toBeGreaterThan(6)
  })

  it('talraden 0–20: tallinjen är stöd bara på nivå 1–3', () => {
    for (const level of levels.filter((l) => l >= 4)) {
      for (const seed of seeds) expect(generateTask('gen.talrad-0-20', level, seed).visual.kind).not.toBe('tallinje')
    }
  })

  it('jämförelser är aldrig tvåval efter nivå 3', () => {
    for (const gen of ['gen.talrad-0-20', 'gen.stora-tal', 'gen.brak-jamfora', 'gen.decimal-intro']) {
      for (const level of levels.filter((l) => l >= 4)) {
        for (const seed of seeds) {
          const t = generateTask(gen, level, seed)
          if (t.answer.kind === 'choice' && /störst/.test(t.prompt)) expect(t.answer.choices.length, `${gen} ${level} ${seed}`).toBeGreaterThanOrEqual(3)
        }
      }
    }
  })

  it('bråk: rätt svar är verkligen störst, och felet "större nämnare" taggas bara när det stämmer', () => {
    const val = (s: string): number => { const [n, d] = s.split('/').map(Number); return n / d }
    for (const level of levels) {
      for (const seed of seeds) {
        const t = generateTask('gen.brak-jamfora', level, seed)
        if (t.answer.kind !== 'choice' || !/Vilket bråk/.test(t.prompt)) continue
        const right = t.answer.choices.find((c) => c.correct)!
        const denom = (s: string): number => Number(s.split('/')[1])
        for (const c of t.answer.choices.filter((x) => !x.correct)) {
          expect(val(c.text)).toBeLessThan(val(right.text))
          if (c.misconception === 'storre-namnare-storre-brak') expect(denom(c.text)).toBeGreaterThan(denom(right.text))
        }
        expect(t.explanation).not.toMatch(/0,33/)
      }
    }
  })

  it('stora tal: förklaringen nämner växlingen när en nia blir tio', () => {
    let carried = 0
    for (const level of levels) {
      for (const seed of seeds) {
        const t = generateTask('gen.stora-tal', level, seed)
        const m = /^Vad är ([\d\s ]+) \+ ([\d\s ]+)\?$/.exec(t.prompt)
        if (!m) continue
        const a = Number(m[1].replace(/\D/g, ''))
        const step = Number(m[2].replace(/\D/g, ''))
        if (Math.floor(a / step) % 10 === 9) { carried++; expect(t.explanation).toMatch(/växla/) }
        else expect(t.explanation).toMatch(/Bara siffran/)
      }
    }
    expect(carried).toBeGreaterThan(0)
  })

  it('skriftlig multiplikation delas efter platsvärde', () => {
    for (const seed of seeds) {
      const t = generateTask('gen.skriftlig-mult', 9, seed)
      const a = Number(/^(\d+) ×/.exec(t.prompt)![1])
      const h = Math.floor(a / 100) * 100
      expect(t.explanation).toContain(`${a} = ${h}`)
    }
  })

  it('inga "1 tiondelar"', () => {
    for (const level of levels) for (const seed of seeds) expect(generateTask('gen.decimal-intro', level, seed).prompt).not.toMatch(/\b1 (tiondelar|hundradelar)/)
  })
})
