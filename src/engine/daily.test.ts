import { describe, expect, it } from 'vitest'
import type { AnswerRecord, ChildProfile } from '../domain/types'
import { emptyPetProgress } from '../domain/pet-home'
import { dailyStats, dayStats, periodSummary } from './daily'

/* Dag för dag: signalerna ska skilja koncentrerad träning från att trycka
   sig igenom (gissningar), låta plattan ligga (pauser) och att tröttna. */

const DAY = '2026-10-12'
const kid = (answers: AnswerRecord[], extra: Partial<ChildProfile> = {}): ChildProfile => ({
  id: 'a', name: 'Testbarn', birthYear: 2016, color: '#446633', schoolYear: '4', createdAt: `${DAY}T10:00:00Z`,
  skills: {}, answers, diagnosis: { done: true, passesDone: 2, passesTotal: 2, probes: [] },
  dailyLimitMinutes: 20, usageSeconds: { [DAY]: 15 * 60 }, chatEnabled: false,
  streak: { days: 0, lastActiveDate: '' }, petProgress: emptyPetProgress(), ...extra,
})
const ans = (i: number, correct: boolean, elapsedMs: number, context: AnswerRecord['context'] = 'ovning'): AnswerRecord => ({
  at: new Date(Date.parse(`${DAY}T15:00:00Z`) + i * 30_000).toISOString(),
  momentId: 'stora-tal', taskRef: { generatorId: 'gen.stora-tal', level: 4, seed: i }, correct, elapsedMs, context,
})

describe('dag för dag', () => {
  it('koncentrerad dag: fokus och positiv signal', () => {
    const d = dayStats(kid(Array.from({ length: 20 }, (_, i) => ans(i, i % 5 !== 0, 9000))), DAY)
    expect(d.verdict).toBe('fokus')
    expect(d.guesses).toBe(0)
    expect(d.signals.some((s) => s.tone === 'bra')).toBe(true)
    expect(d.sessions).toBe(1)
  })

  it('många snabba fel räknas som gissningar', () => {
    const d = dayStats(kid(Array.from({ length: 20 }, (_, i) => ans(i, i % 2 === 0, i % 2 ? 1200 : 7000))), DAY)
    expect(d.guesses).toBe(10)
    expect(d.verdict).not.toBe('fokus')
    expect(d.signals.find((s) => s.tone === 'obs')?.text).toMatch(/gissningar/)
  })

  it('blixtpassets snabba svar räknas inte som gissningar', () => {
    const d = dayStats(kid(Array.from({ length: 20 }, (_, i) => ans(i, i % 3 !== 0, 1500, 'blixt'))), DAY)
    expect(d.guesses).toBe(0)
    expect(d.answers).toBe(20)
    expect(d.accuracy).toBeNull()
  })

  it('pauser och lågt tempo syns, och två signaler blir "flera"', () => {
    const d = dayStats(kid([ans(0, true, 8000), ans(1, true, 8000), ans(2, false, 9000)], {
      usageSeconds: { [DAY]: 12 * 60 }, idleSeconds: { [DAY]: 10 * 60 },
    }), DAY)
    expect(d.idleMinutes).toBe(10)
    expect(d.signals.filter((s) => s.tone === 'obs').length).toBe(2)
    expect(d.verdict).toBe('obs')
  })

  it('appen framme utan träning syns även en "vilodag"', () => {
    const d = dayStats(kid([], { usageSeconds: {}, idleSeconds: { [DAY]: 5 * 60 } }), DAY)
    expect(d.verdict).toBe('vila')
    expect(d.signals[0].text).toMatch(/låg framme/)
  })

  it('perioden: 14 dagar nyaste först och en sammanfattning', () => {
    const p = kid(Array.from({ length: 10 }, (_, i) => ans(i, true, 8000)))
    const stats = dailyStats(p, `${DAY}T20:00:00Z`)
    expect(stats).toHaveLength(14)
    expect(stats[0].date).toBe(DAY)
    expect(periodSummary('Testbarn', stats)[0]).toMatch(/tränade 1 av 14 dagar/)
  })
})
