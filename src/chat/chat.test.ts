import { describe, expect, it } from 'vitest'
import { buildClassifyPrompt, buildSystemPrompt, parseClassification, MAX_MESSAGES_PER_DAY, KEY_ERROR_LINE, OFFLINE_LINE, QUOTA_LINE } from './prompts'
import { ChatError, errorToLine, pickChatModels, statusToKind, type GeminiModelInfo } from './providers'
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

describe('felhantering', () => {
  it('mappar HTTP-status till rätt felkategori', () => {
    expect(statusToKind(400)).toBe('nyckel')
    expect(statusToKind(401)).toBe('nyckel')
    expect(statusToKind(403)).toBe('nyckel')
    expect(statusToKind(429)).toBe('kvot')
    expect(statusToKind(500)).toBe('natverk')
    expect(statusToKind(503)).toBe('natverk')
  })

  it('ger olika barnvänliga svar per felorsak', () => {
    expect(errorToLine(new ChatError('nyckel', 'x'))).toBe(KEY_ERROR_LINE)
    expect(errorToLine(new ChatError('kvot', 'x'))).toBe(QUOTA_LINE)
    expect(errorToLine(new ChatError('natverk', 'x'))).toBe(OFFLINE_LINE)
    expect(errorToLine(new Error('okänt'))).toBe(OFFLINE_LINE)
  })
})

describe('dynamiskt modellval', () => {
  const m = (id: string): GeminiModelInfo => ({
    id,
    version: Number(/gemini-(\d+(?:\.\d+)?)/.exec(id)?.[1] ?? 0),
    tts: /tts/.test(id),
  })

  it('väljer alltid lite-varianten först (lägst latens), nyaste lite överst, hoppar över specialvarianter', () => {
    const picked = pickChatModels([
      m('gemini-2.5-flash'), m('gemini-2.5-flash-lite'), m('gemini-3-flash'),
      m('gemini-3.5-flash'), m('gemini-3.5-flash-lite'), m('gemini-3.5-flash-preview'),
      m('gemini-3.5-pro'), m('gemini-2.5-flash-tts'), m('gemini-3-flash-image'),
    ])
    // Snabbast först: nyaste lite överst, sedan äldre lite.
    expect(picked[0]).toBe('gemini-3.5-flash-lite')
    expect(picked[1]).toBe('gemini-2.5-flash-lite')
    // Lite går ALLTID före fullstor flash — även när flash är nyare generation.
    expect(picked.indexOf('gemini-2.5-flash-lite')).toBeLessThan(picked.indexOf('gemini-3.5-flash'))
    expect(picked).not.toContain('gemini-2.5-flash-tts')
    expect(picked).not.toContain('gemini-3-flash-image')
  })

  it('faller tillbaka på fullstora flash när ingen lite finns', () => {
    const picked = pickChatModels([m('gemini-3.5-flash'), m('gemini-3-flash')])
    expect(picked[0]).toBe('gemini-3.5-flash')
  })

  it('lägger till kända reservnamn om nyckelns lista är tom/konstig', () => {
    const picked = pickChatModels([])
    expect(picked).toContain('gemini-3.5-flash')
    expect(picked).toContain('gemini-2.5-flash')
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
