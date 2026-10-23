import { describe, expect, it } from 'vitest'
import type { ChildProfile } from '../domain/types'
import { emptyPetProgress } from '../domain/pet-home'
import { detectStruggle, easierMomentFor, logStruggle, restMoment, restingToday } from './struggle'
import { newSkillState } from './progress'
import { composeSession, composeCheckTasks, CHECK_MIN_LEVEL } from './session'
import { dayStats } from './daily'

/* Spärren: snabba fel i följd stoppas, kamp ger ett lättare moment, och
   allt syns för föräldern. */

const fast = { correct: false, elapsedMs: 900 }
const slowWrong = { correct: false, elapsedMs: 9000 }
const right = { correct: true, elapsedMs: 6000 }

describe('spärren', () => {
  it('ser gissningar: tre snabba fel bland de fyra senaste', () => {
    expect(detectStruggle([right, fast, fast])).toBeUndefined()
    expect(detectStruggle([fast, fast, fast])).toBe('gissar')
    expect(detectStruggle([right, fast, right, fast])).toBeUndefined()
  })

  it('ser kamp: högst ett rätt av sex', () => {
    expect(detectStruggle([slowWrong, slowWrong, right, slowWrong, slowWrong, slowWrong])).toBe('kampar')
    expect(detectStruggle([slowWrong, right, right, slowWrong, slowWrong, slowWrong])).toBeUndefined()
  })

  const kid = (): ChildProfile => ({
    id: 'a', name: 'A', color: '#000', birthYear: 2020, schoolYear: 'F', createdAt: '2026-01-01T00:00:00Z',
    skills: {
      'add-sub-0-20': { ...newSkillState('add-sub-0-20'), mastery: 'mastered', rating: 570, attempts: 40 },
      'tiotalsovergang-20': { ...newSkillState('tiotalsovergang-20'), mastery: 'in-progress', rating: 100, attempts: 300 },
    },
    answers: [], diagnosis: { done: true, passesDone: 2, passesTotal: 2, probes: [] },
    dailyLimitMinutes: 15, usageSeconds: {}, chatEnabled: false, streak: { days: 0, lastActiveDate: '' },
    petProgress: emptyPetProgress(),
  })

  it('"Över tian" för svårt → förkunskapen plus och minus 0–20', () => {
    expect(easierMomentFor('tiotalsovergang-20', kid().skills)).toBe('add-sub-0-20')
  })

  it('ett vilande moment byts mot förkunskapen i dagens pass, i morgon är det tillbaka', () => {
    const rested = restMoment(kid(), 'tiotalsovergang-20', '2026-10-24')
    expect(restingToday(rested.skills['tiotalsovergang-20'], '2026-10-24')).toBe(true)
    expect(restMoment(rested, 'tiotalsovergang-20', '2026-10-24')).toBe(rested)
    const today = composeSession(rested, '2026-10-24', 'tiotalsovergang-20').parts.find((p) => p.kind === 'nytt')
    expect(today?.momentId).toBe('add-sub-0-20')
    const tomorrow = composeSession(rested, '2026-10-25', 'tiotalsovergang-20').parts.find((p) => p.kind === 'nytt')
    expect(tomorrow?.momentId).toBe('tiotalsovergang-20')
  })

  it('syns i föräldrarnas dag för dag', () => {
    let c = logStruggle(kid(), 'tiotalsovergang-20', 'gissar', '2026-10-24T15:00:00Z')
    c = logStruggle(c, 'tiotalsovergang-20', 'for-svart', '2026-10-24T15:05:00Z')
    const texts = dayStats(c, '2026-10-24').signals.map((x) => x.text).join(' ')
    expect(texts).toContain('stannade upp 1 gång')
    expect(texts).toContain('Över tian')
  })
})

describe('kunskapskollen', () => {
  it('testar aldrig under årskursens mitt, även med låg övningsnivå', () => {
    for (let i = 0; i < 20; i++) {
      for (const t of composeCheckTasks('medelvarde', 400)) expect(t.ref.level).toBeGreaterThanOrEqual(CHECK_MIN_LEVEL - 1)
    }
  })
})
