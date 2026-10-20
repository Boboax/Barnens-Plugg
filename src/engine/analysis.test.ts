import { describe, expect, it } from 'vitest'
import type { ChildProfile, Household } from '../domain/types'
import { emptyPetProgress } from '../domain/pet-home'
import { analysisSnapshot } from './analysis'

/* Analysunderlaget lämnar familjen — det får aldrig bära namn, kladd,
   chatt eller hemligheter, bara det en nivågranskning behöver. */

const now = new Date('2026-10-20T18:00:00Z')

const kid = (name: string): ChildProfile => ({
  id: `id-${name}`, name, color: '#123456', birthYear: 2018, schoolYear: '2', createdAt: '2026-01-01T00:00:00Z',
  skills: {
    a: { momentId: 'add-sub-0-20', mastery: 'in-progress', rating: 512.4, attempts: 20, correct: 15, recentMisconceptions: [], bossAttempts: 0, starWon: false },
    b: { momentId: 'mult-intro', mastery: 'locked', rating: 400, attempts: 0, correct: 0, recentMisconceptions: [], bossAttempts: 0, starWon: false },
  },
  answers: [
    { at: '2026-10-19T15:00:00Z', momentId: 'add-sub-0-20', taskRef: { generatorId: 'gen.add-sub-0-20', level: 4, seed: 99 }, correct: false, elapsedMs: 1800, context: 'ovning', scratchPng: 'data:image/png;base64,HEMLIGT' },
    { at: '2026-09-01T15:00:00Z', momentId: 'add-sub-0-20', taskRef: { generatorId: 'gen.add-sub-0-20', level: 2, seed: 1 }, correct: true, elapsedMs: 4000, context: 'ovning' },
  ],
  diagnosis: { done: true, passesDone: 2, passesTotal: 2, probes: [] },
  dailyLimitMinutes: 20, usageSeconds: { '2026-10-19': 900 }, chatEnabled: true,
  streak: { days: 4, lastActiveDate: '2026-10-19' }, petProgress: emptyPetProgress(),
})

describe('analysunderlaget', () => {
  const household = { children: [kid('Kalleanka'), kid('Musse')], chatLog: [{ text: 'privat' }] } as unknown as Household
  const snap = analysisSnapshot(household, now, '1.0.999')
  const text = JSON.stringify(snap)

  it('har inga namn, id:n, kladdbilder eller chatt', () => {
    for (const secret of ['Kalleanka', 'Musse', 'id-', 'HEMLIGT', 'privat', '#123456']) expect(text).not.toContain(secret)
    expect(snap.children.map((c) => c.label)).toEqual(['Barn A', 'Barn B'])
  })

  it('tar med senaste två veckornas svar, återskapbara via generator/nivå/frö', () => {
    expect(snap.children[0].answers).toEqual([expect.objectContaining({ generatorId: 'gen.add-sub-0-20', level: 4, seed: 99, correct: false })])
  })

  it('visar nivån per öppet moment men inte låsta', () => {
    expect(snap.children[0].skills).toEqual([expect.objectContaining({ momentId: 'add-sub-0-20', rating: 512 })])
    expect(snap.children[0].days).toHaveLength(14)
    expect(snap.children[0].age).toBe(8)
  })
})
