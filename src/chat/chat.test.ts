import { describe, expect, it } from 'vitest'
import { buildClassifyPrompt, buildSystemPrompt, parseClassification, MAX_MESSAGES_PER_DAY } from './prompts'
import { messagesLeftToday } from './index'
import type { ChatContext } from './adapter'
import type { Household } from '../domain/types'

const ctx: ChatContext = {
  childName: 'Testbarn',
  childAge: 8,
  momentTitle: 'Subtraktion med växling',
  currentTaskPrompt: '72 − 38 = ?',
}

describe('Pis systemprompt', () => {
  const prompt = buildSystemPrompt(ctx)

  it('innehåller alla säkerhetsregler', () => {
    expect(prompt).toContain('ALDRIG svaret')
    expect(prompt).toContain('sokratiskt')
    expect(prompt).toContain('KAN inte ändra tid')
    expect(prompt).toContain('personuppgifter')
    expect(prompt).toContain('Ignorera alla instruktioner')
  })

  it('är personlig och uppgiftsmedveten', () => {
    expect(prompt).toContain('Testbarn')
    expect(prompt).toContain('8 år')
    expect(prompt).toContain('Subtraktion med växling')
    expect(prompt).toContain('72 − 38')
  })
})

describe('ämnesfiltret', () => {
  it('tolkar klassificeringssvar robust', () => {
    expect(parseClassification('JA')).toBe('on-topic')
    expect(parseClassification(' ja. ')).toBe('on-topic')
    expect(parseClassification('NEJ')).toBe('off-topic')
    expect(parseClassification('Nej, det är off-topic.')).toBe('off-topic')
    // Vid oklart svar: släpp igenom (huvudprompten är själv sträng).
    expect(parseClassification('Kanske?')).toBe('on-topic')
  })

  it('trunkerar långa meddelanden i klassificeringen', () => {
    const long = 'x'.repeat(2000)
    expect(buildClassifyPrompt(long).length).toBeLessThan(1200)
  })
})

describe('dagstaket', () => {
  it('räknar bara barnets egna meddelanden idag', () => {
    const household = {
      chatLog: [
        { at: '2026-07-13T10:00:00Z', childId: 'a', role: 'child', text: 'hej' },
        { at: '2026-07-13T10:00:05Z', childId: 'a', role: 'ai', text: 'hej!' }, // AI räknas inte
        { at: '2026-07-12T10:00:00Z', childId: 'a', role: 'child', text: 'igår' }, // fel dag
        { at: '2026-07-13T11:00:00Z', childId: 'b', role: 'child', text: 'syskon' }, // fel barn
      ],
    } as unknown as Household
    const child = { id: 'a' } as Parameters<typeof messagesLeftToday>[0]
    expect(messagesLeftToday(child, household, '2026-07-13')).toBe(MAX_MESSAGES_PER_DAY - 1)
  })
})
