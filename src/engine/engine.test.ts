import { describe, expect, it } from 'vitest'
import type { ChildProfile, SkillState } from '../domain/types'
import { MOMENTS } from '../domain/curriculum'
import { expectedSuccess, practiceLevel, updateRating } from './rating'
import { REVIEW_INTERVALS_DAYS, scheduleFirstReview, scheduleNextReview } from './spaced-repetition'
import { applyAnswer, classifyError, hotStreakBonus, newSkillState, recomputeAvailability } from './progress'
import { practiceLevel as practiceLevelFor } from './rating'
import { applyDiagnosisResult, diagnosisBackbone, searchState, startIndexForYear } from './diagnosis'
import { composeBossTasks, composeStarTasks } from './session'
import { rewardProgress } from './rewards'
import { BLIXT_TESTS, blixtTask, blixtUnlocked } from './blixt'

const makeProfile = (overrides: Partial<ChildProfile> = {}): ChildProfile => {
  const skills: Record<string, SkillState> = {}
  for (const m of MOMENTS) skills[m.id] = newSkillState(m.id)
  return {
    id: 'test', name: 'Test', color: '#000', birthYear: 2017, schoolYear: '2',
    createdAt: '2026-01-01T00:00:00Z',
    skills: recomputeAvailability(skills),
    answers: [],
    diagnosis: { passesDone: 0, passesTotal: 2, done: false, probes: [] },
    dailyLimitMinutes: 20, usageSeconds: {}, chatEnabled: false,
    streak: { days: 0, lastActiveDate: '' },
    ...overrides,
  }
}

describe('adaptiv rating', () => {
  it('rätt svar höjer, fel sänker', () => {
    expect(updateRating(500, 20, 5, true)).toBeGreaterThan(500)
    expect(updateRating(500, 20, 5, false)).toBeLessThan(500)
  })

  it('siktar på ~70 % lyckandegrad', () => {
    for (const rating of [200, 400, 600, 800]) {
      const level = practiceLevel(rating)
      expect(expectedSuccess(rating, level)).toBeGreaterThanOrEqual(0.7)
    }
  })
})

describe('spaced repetition', () => {
  it('intervallen växer', () => {
    let review = scheduleFirstReview('2026-01-01')
    expect(review.intervalDays).toBe(REVIEW_INTERVALS_DAYS[0])
    review = scheduleNextReview(review, '2026-01-04')
    expect(review.intervalDays).toBe(REVIEW_INTERVALS_DAYS[1])
  })
})

describe('förkunskapslåset', () => {
  it('grundmomenten är öppna, senare är låsta', () => {
    const profile = makeProfile()
    expect(profile.skills['antal-0-10'].mastery).toBe('available')
    expect(profile.skills['vaxling-0-100'].mastery).toBe('locked')
  })
})

describe('kalibrering för starka elever', () => {
  it('frontmomentet efter diagnos startar på nivå 5 (inte mjukstartsnivå)', () => {
    // Rating 550 sätts av applyDiagnosisResult — verifiera nivåmappningen.
    expect(practiceLevelFor(550)).toBe(5)
  })

  it('het hand ger accelererande bonus, inget vid korta sviter', () => {
    expect(hotStreakBonus(1)).toBe(0)
    expect(hotStreakBonus(2)).toBe(0)
    expect(hotStreakBonus(3)).toBe(6)
    expect(hotStreakBonus(5)).toBe(18)
    expect(hotStreakBonus(8)).toBe(24) // tak
  })

  it('rättsvit klättrar snabbare än utan streak', () => {
    const base = newSkillState('x')
    const task = { ref: { generatorId: 'gen.x', level: 5 as const, seed: 1 }, prompt: '', visual: { kind: 'ingen' as const }, answer: { kind: 'numeric' as const, value: 1 }, explanation: '' }
    let withStreak = { ...base }
    let without = { ...base }
    for (let i = 1; i <= 6; i++) {
      withStreak = applyAnswer(withStreak, task, true, 5000, 'ovning', '2026-01-01T10:00:00Z', undefined, undefined, i).skill
      without = applyAnswer(without, task, true, 5000, 'ovning', '2026-01-01T10:00:00Z').skill
    }
    expect(withStreak.rating).toBeGreaterThan(without.rating + 30)
  })
})

describe('vägen tillbaka efter missad repetition', () => {
  it('needs-review kan nå boss-ready igen (fastnar inte i evig omträning)', () => {
    let skill: SkillState = {
      ...newSkillState('vaxling-0-100'),
      mastery: 'needs-review',
      rating: 615,
      attempts: 25,
      correct: 18,
    }
    const task = { ref: { generatorId: 'gen.vaxling-0-100', level: 6 as const, seed: 1 }, prompt: '', visual: { kind: 'ingen' as const }, answer: { kind: 'numeric' as const, value: 1 }, explanation: '' }
    // Några rätta svar ska lyfta ratingen över bossgränsen och öppna striden.
    for (let i = 0; i < 5 && skill.mastery !== 'boss-ready'; i++) {
      skill = applyAnswer(skill, task, true, 5000, 'ovning', '2026-01-01T10:00:00Z').skill
    }
    expect(skill.mastery).toBe('boss-ready')
  })
})

describe('slarvfelsklassning', () => {
  it('snabbt ±1-fel på hög nivå är slarv, långsamt fel är kunskapslucka', () => {
    const strong: SkillState = { ...newSkillState('x'), rating: 800 }
    expect(classifyError(strong, 4, 3000, 'en-fel')).toBe('slarv')
    const weak: SkillState = { ...newSkillState('x'), rating: 300 }
    expect(classifyError(weak, 5, 40000, 'glomd-vaxling')).toBe('kunskap')
  })
})

describe('startdiagnosen', () => {
  it('startindex följer skolåret', () => {
    const backbone = diagnosisBackbone()
    expect(startIndexForYear('F', backbone)).toBe(0)
    expect(startIndexForYear('4', backbone)).toBeGreaterThan(startIndexForYear('2', backbone))
  })

  it('binärsökningen konvergerar och sätter startläget', () => {
    const profile = makeProfile()
    const backbone = diagnosisBackbone()
    // Simulera ett barn som kan de första 8 momenten.
    const canDo = new Set(backbone.slice(0, 8))
    let guard = 0
    for (;;) {
      const s = searchState(profile.diagnosis, backbone, profile.schoolYear)
      if (s.converged) break
      const momentId = backbone[s.nextIndex]
      profile.diagnosis.probes.push({ momentId, correct: canDo.has(momentId), level: 5 })
      if (++guard > 30) throw new Error('konvergerar inte')
    }
    expect(guard).toBeLessThanOrEqual(Math.ceil(Math.log2(backbone.length)) + 3)

    const skills = applyDiagnosisResult(profile, '2026-01-01')
    // Momenten barnet redan kan → behärskade (visas som klara, inte som bossar).
    expect(skills[backbone[3]].mastery).toBe('mastered')
    expect(skills[backbone[8]].mastery).toBe('in-progress')
    // Repetitionsschema sätts på det som diagnosen godkände.
    expect(skills[backbone[0]].review).toBeDefined()
  })
})

describe('bosstrider', () => {
  it('bygger rätt antal frågor med nya frön varje gång', () => {
    const a = composeBossTasks('vaxling-0-100')
    const b = composeBossTasks('vaxling-0-100')
    expect(a.length).toBe(12)
    expect(a.map((t) => t.ref.seed).join()).not.toBe(b.map((t) => t.ref.seed).join())
  })

  it('stjärnnivån håller sig till nivå 8–10', () => {
    for (const task of composeStarTasks('vaxling-0-100')) {
      expect(task.ref.level).toBeGreaterThanOrEqual(8)
    }
  })
})

describe('blixtpass', () => {
  it('låses upp när motsvarande moment börjat tränas', () => {
    const profile = makeProfile()
    expect(blixtUnlocked('add-sub-0-10', profile)).toBe(false)
    profile.skills['add-sub-0-10'] = { ...profile.skills['add-sub-0-10'], mastery: 'in-progress' }
    expect(blixtUnlocked('add-sub-0-10', profile)).toBe(true)
  })

  it('ger alltid korta, rena sifferuppgifter (aldrig text eller flerval)', () => {
    const profile = makeProfile()
    for (const test of BLIXT_TESTS) {
      profile.skills[test.unlockMomentId] = { ...profile.skills[test.unlockMomentId], mastery: 'in-progress', rating: 600 }
      for (let i = 0; i < 40; i++) {
        const task = blixtTask(test.kind, profile)
        expect(task.answer.kind, `${test.kind}: ${task.prompt}`).toBe('numeric')
        expect(task.prompt.length, `${test.kind}: ${task.prompt}`).toBeLessThanOrEqual(24)
      }
    }
  })
})

describe('belöningar', () => {
  it('momentmål räknar från baslinjen', () => {
    const profile = makeProfile()
    profile.skills['antal-0-10'] = { ...profile.skills['antal-0-10'], mastery: 'mastered' }
    const progress = rewardProgress({
      id: 'r', childId: 'test', title: 'Bio', emoji: '🎬',
      target: { type: 'moments', count: 2 }, createdAt: '2026-01-01T00:00:00Z',
      baseline: { momentsMastered: 0, activeDays: 0 },
    }, profile)
    expect(progress.done).toBe(1)
    expect(progress.earned).toBe(false)
    expect(progress.requirement).toContain('1 boss till')
  })

  it('terminsmål listar de återstående momenten vid namn', () => {
    const profile = makeProfile()
    const progress = rewardProgress({
      id: 'r2', childId: 'test', title: 'Glass', emoji: '🍦',
      target: { type: 'term-goal', year: '2', term: 'HT', half: 1 }, createdAt: '2026-01-01T00:00:00Z',
      baseline: { momentsMastered: 0, activeDays: 0 },
    }, profile)
    expect(progress.total).toBeGreaterThan(0)
    expect(progress.nextSteps.length).toBe(progress.total - progress.done)
    expect(progress.requirement).toContain('moment till')
  })
})
