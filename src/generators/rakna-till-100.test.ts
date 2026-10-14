import { describe, expect, it } from 'vitest'
import type { DifficultyLevel } from '../domain/types'
import { generateTask } from './index'
import { backfillCountTo100, newSkillState } from '../engine/progress'

/* Räkna till 100: övergångarna mellan tiotalen är kärnan, och felet att
   gå tillbaka till tiotalets början ska kännas igen. */

describe('räkna till 100', () => {
  it('mer än hälften av uppgifterna handlar om tiotalsövergångar', () => {
    let transitions = 0
    let total = 0
    for (let seed = 0; seed < 400; seed++) {
      const t = generateTask('gen.talrad-0-100', 5, seed)
      if (t.answer.kind !== 'numeric') continue
      total++
      const v = t.answer.value
      if (v % 10 === 0 || v % 10 === 9) transitions++
    }
    expect(transitions / total).toBeGreaterThan(0.5)
  })

  it('29 → 20 taggas som ramsefel vid tiotalet', () => {
    for (let seed = 0; seed < 600; seed++) {
      const t = generateTask('gen.talrad-0-100', 5, seed)
      if (t.prompt !== 'Vilket tal kommer efter 29?' || t.answer.kind !== 'numeric') continue
      expect(t.answer.value).toBe(30)
      expect(t.misconceptionMap?.[20]).toBe('ramsa-tiotal')
      return
    }
    throw new Error('hittade ingen "efter 29"-uppgift')
  })

  it('aldrig tal över 100, och nivå 1–3 håller sig till 1–50', () => {
    for (let level = 1; level <= 10; level++) {
      for (let seed = 0; seed < 300; seed++) {
        const t = generateTask('gen.talrad-0-100', level as DifficultyLevel, seed)
        const nums = (t.prompt.match(/\d+/g) ?? []).map(Number)
        expect(Math.max(...nums), t.prompt).toBeLessThanOrEqual(100)
        if (level <= 3) expect(Math.max(...nums), t.prompt).toBeLessThanOrEqual(50)
      }
    }
  })

  it('äldre barn som behärskar tal till 100 får momentet skänkt — förskoleklassbarnet tränar det', () => {
    const now = '2026-10-14T12:00:00Z'
    const older = { 'positionssystem-100': { ...newSkillState('positionssystem-100'), mastery: 'mastered' as const } }
    expect(backfillCountTo100(older, now)['talrad-0-100'].mastery).toBe('mastered')
    const fk = { 'talrad-0-20': { ...newSkillState('talrad-0-20'), mastery: 'mastered' as const } }
    expect(backfillCountTo100(fk, now)).toBe(fk)
    const done = backfillCountTo100(older, now)
    expect(backfillCountTo100(done, now)).toBe(done)
  })
})
