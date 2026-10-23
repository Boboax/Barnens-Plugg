import { describe, expect, it } from 'vitest'
import type { AnswerRecord, ChildProfile } from '../domain/types'
import { emptyPetProgress } from '../domain/pet-home'
import { newSkillState } from './progress'
import { backToYear, retrainMoments, weakMoments } from './retrain'

/* Föräldraverktyget: svaga moment hittas, öppnas igen utan att något annat
   tas ifrån barnet, och "backa" stänger senare årskurser. */

const ans = (momentId: string, correct: boolean): AnswerRecord => ({
  at: '2026-10-01T15:00:00Z', momentId, taskRef: { generatorId: `gen.${momentId}`, level: 3, seed: 1 }, correct, elapsedMs: 5000, context: 'ovning',
})

const kid = (): ChildProfile => ({
  id: 'k', name: 'K', color: '#000', birthYear: 2015, schoolYear: '5', createdAt: '2026-01-01T00:00:00Z',
  skills: {
    // Klar via boss utan övning.
    omkrets: { ...newSkillState('omkrets'), mastery: 'mastered', rating: 650, attempts: 2 },
    // Klar men låg träffsäkerhet.
    'procent-intro': { ...newSkillState('procent-intro'), mastery: 'mastered', rating: 736, attempts: 47 },
    // Säker: många svar, hög träffsäkerhet och hög rating.
    'stora-tal': { ...newSkillState('stora-tal'), mastery: 'mastered', rating: 815, attempts: 20 },
    // Diamant = säker.
    'positionssystem-100': { ...newSkillState('positionssystem-100'), mastery: 'star', rating: 899, attempts: 9 },
  },
  answers: [
    ...Array.from({ length: 10 }, (_, i) => ans('procent-intro', i < 5)),
    ...Array.from({ length: 10 }, () => ans('stora-tal', true)),
  ],
  diagnosis: { done: true, passesDone: 1, passesTotal: 1, probes: [] },
  dailyLimitMinutes: 20, usageSeconds: {}, chatEnabled: false, streak: { days: 0, lastActiveDate: '' },
  conqueredYears: ['3', '4', '5'], conqueredWorlds: ['talens-dal'],
  petProgress: { ...emptyPetProgress(), coins: 80 },
})

describe('träna om och backa', () => {
  it('hittar knappt övade och osäkra moment, men inte säkra eller diamantvunna', () => {
    const w = weakMoments(kid())
    expect(w.map((x) => [x.momentId, x.reason])).toEqual([['omkrets', 'aldrig-ovat'], ['procent-intro', 'osaker']])
  })

  it('träna om öppnar momenten igen och behåller väktare, troféer och mynt', () => {
    const c = retrainMoments(kid(), ['omkrets', 'procent-intro'], '2026-10-24')
    expect(c.skills.omkrets.mastery).toBe('in-progress')
    expect(c.skills.omkrets.firstPracticedOn).toBe('2026-10-24')
    expect(c.skills['stora-tal'].mastery).toBe('mastered')
    expect(c.conqueredYears).toEqual(['3', '4', '5'])
    expect(c.conqueredWorlds).toEqual(['talens-dal'])
    expect(c.petProgress.coins).toBe(80)
    expect(retrainMoments(c, ['stora-tal-finns-ej'], '2026-10-24')).toBe(c)
  })

  it('backa till åk 4 stänger åk 4 och 5 men behåller säkra moment', () => {
    const c = backToYear(kid(), '4', '2026-10-24')
    expect(c.conqueredYears).toEqual(['3'])
    expect(c.skills['procent-intro'].mastery).toBe('locked') // åk 5, osäker
    expect(c.skills.omkrets.mastery).toBe('in-progress') // åk 4, knappt övad
    expect(c.skills['stora-tal'].mastery).toBe('mastered') // åk 4, säker
  })
})
