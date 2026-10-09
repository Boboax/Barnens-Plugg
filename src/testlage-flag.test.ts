import { describe, expect, it } from 'vitest'
import { testlageEnabled } from './testlage-flag'

/* Testläget ger mynt, färdiga pass och strider med ett tryck. Det får aldrig
   hamna i bygget som barnen kör. */
describe('testlägets byggflagga', () => {
  it('är av i barnens app (GitHub Pages) och i Cloudflares produktionsbygge', () => {
    expect(testlageEnabled({})).toBe(false)
    expect(testlageEnabled({ GITHUB_ACTIONS: 'true' })).toBe(false)
    expect(testlageEnabled({ CF_PAGES: '1', CF_PAGES_BRANCH: 'main' })).toBe(false)
    expect(testlageEnabled({ CF_PAGES: '1' })).toBe(false)
  })

  it('är på för Cloudflares förhandsbyggen av andra grenar, och lokalt med TESTLAGE=1', () => {
    expect(testlageEnabled({ CF_PAGES: '1', CF_PAGES_BRANCH: 'feature/lager-etapp-0-1' })).toBe(true)
    expect(testlageEnabled({ TESTLAGE: '1' })).toBe(true)
  })
})
