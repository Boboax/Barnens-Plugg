import { describe, expect, it } from 'vitest'
import type { ChildProfile } from '../domain/types'
import { DAILY_PET_COINS, HOME_VISIT_SECONDS, emptyPetProgress } from '../domain/pet-home'
import { adoptPet, completePetPractice, homeSecondsLeft, petDay, spendHomeTime } from './pet-home'

/* Kvällslägrets vana: mynt för ett avslutat pass per dag, första vännen
   från världen barnet tränade i, och en lägertid som inte går att fylla på.
   Porterat från referensgrenens pet-home.test.ts till modellen där allt
   bor på barnet. */

const at = new Date(2026, 8, 8, 15)
const nextDay = new Date(2026, 8, 9, 15)

const kid = (id = 'a'): ChildProfile => ({
  id, name: id, birthYear: 2019, color: '#446633', schoolYear: 'F', createdAt: at.toISOString(),
  skills: {}, answers: [], diagnosis: { done: true, passesDone: 2, passesTotal: 2, probes: [] },
  dailyLimitMinutes: 20, usageSeconds: {}, chatEnabled: false, streak: { days: 0, lastActiveDate: '' },
  petProgress: emptyPetProgress(),
})

/** Ett barn som klarat dagens pass i Urtalens dal och döpt sin groda. */
const withFrog = (): ChildProfile =>
  adoptPet(completePetPractice(kid(), 12, 12, 'talens-dal', at), 'Mossa', at)

describe('Kvällslägret: dagsmynt och upptäckt', () => {
  it('FK-barnet i Urtalens dal hittar en groda FRÅN Urtalens dal', () => {
    const done = completePetPractice(kid(), 8, 8, 'talens-dal', at)
    expect(done.petProgress.encounter).toEqual({ species: 'woodland-frog', worldId: 'talens-dal' })
    const adopted = adoptPet(done, '  Mossa  ', at)
    expect(adopted.petProgress.pets).toHaveLength(1)
    expect(adopted.petProgress.pets[0]).toMatchObject({
      name: 'Mossa', species: 'woodland-frog', foundInWorldId: 'talens-dal', bedPoint: 'bed-1',
    })
    expect(adopted.petProgress.encounter).toBeUndefined()
  })

  it('upptäckten följer barnets värld, inte artens', () => {
    const done = completePetPractice(kid(), 8, 8, 'brakberget', at)
    expect(done.petProgress.encounter).toEqual({ species: 'woodland-frog', worldId: 'brakberget' })
  })

  it('en väntande upptäckt överlever nya pass och omladdning', () => {
    const first = completePetPractice(kid(), 8, 8, 'talens-dal', at)
    const later = completePetPractice(first, 8, 8, 'multiplikationsskogen', nextDay)
    expect(later.petProgress.encounter?.worldId).toBe('talens-dal')
    const reloaded = JSON.parse(JSON.stringify(later)) as ChildProfile
    expect(adoptPet(reloaded, 'Mossa', nextDay).petProgress.pets[0].foundInWorldId).toBe('talens-dal')
    expect(later.petProgress.coins).toBe(2 * DAILY_PET_COINS)
  })

  it('bara första vännen hittas nu — fler vänner kommer vid milstolpar (etapp 2)', () => {
    const h = completePetPractice(withFrog(), 8, 8, 'brakberget', nextDay)
    expect(h.petProgress.encounter).toBeUndefined()
    expect(adoptPet(h, 'Extra', nextDay)).toBe(h)
  })

  it('lämnar tomma och avbrutna pass helt orörda', () => {
    const c = kid()
    for (const [done, planned] of [[0, 0], [3, 12], [13, 12], [-1, -1], [1.5, 1.5]]) {
      expect(completePetPractice(c, done, planned, 'talens-dal', at)).toBe(c)
    }
  })

  it('ger mynt för första avslutade passet per dag, aldrig dubbelt', () => {
    const h = withFrog()
    expect(h.petProgress.coins).toBe(DAILY_PET_COINS)
    expect(completePetPractice(h, 12, 12, 'talens-dal', at)).toBe(h)
    const reloaded = JSON.parse(JSON.stringify(h)) as ChildProfile
    expect(completePetPractice(reloaded, 12, 12, 'talens-dal', at)).toBe(reloaded)
  })

  it('ger nya mynt nästa dag men inte om klockan flyttas bakåt', () => {
    const h = completePetPractice(withFrog(), 8, 8, 'talens-dal', nextDay)
    expect(h.petProgress.coins).toBe(2 * DAILY_PET_COINS)
    expect(completePetPractice(h, 8, 8, 'talens-dal', at)).toBe(h)
  })

  it('kräver en upptäckt och ett namn för att adoptera', () => {
    const c = kid()
    expect(adoptPet(c, 'Mossa', at)).toBe(c)
    const done = completePetPractice(c, 8, 8, 'talens-dal', at)
    expect(adoptPet(done, '   ', at)).toBe(done)
    expect(adoptPet(done, 'x'.repeat(40), at).petProgress.pets[0].name).toHaveLength(24)
  })

  it('rör aldrig skolarbetet: skills, svar och mattetid', () => {
    const base = withFrog()
    const h = spendHomeTime(completePetPractice(base, 8, 8, 'talens-dal', nextDay), 60, nextDay)
    expect(h.skills).toBe(base.skills)
    expect(h.answers).toBe(base.answers)
    expect(h.usageSeconds).toBe(base.usageSeconds)
  })

  it('använder kalenderdagen i enhetens tidszon', () => {
    expect(petDay(new Date(2026, 8, 8, 0, 5))).toBe('2026-09-08')
    expect(petDay(new Date(2026, 8, 8, 23, 55))).toBe('2026-09-08')
  })
})

describe('Kvällslägret: lägertid', () => {
  it('finns bara efter dagens avslutade pass', () => {
    expect(homeSecondsLeft(kid(), at)).toBe(0)
    expect(homeSecondsLeft(withFrog(), at)).toBe(HOME_VISIT_SECONDS)
    expect(homeSecondsLeft(withFrog(), nextDay)).toBe(0)
  })

  it('kan inte fyllas på genom återbesök eller fler pass samma dag', () => {
    const h = spendHomeTime(withFrog(), HOME_VISIT_SECONDS, at)
    expect(homeSecondsLeft(h, at)).toBe(0)
    expect(homeSecondsLeft(completePetPractice(h, 8, 8, 'talens-dal', at), at)).toBe(0)
    expect(homeSecondsLeft(completePetPractice(h, 8, 8, 'talens-dal', nextDay), nextDay)).toBe(HOME_VISIT_SECONDS)
  })

  it('bokförs i klumpar och stannar vid taket', () => {
    let h = withFrog()
    h = spendHomeTime(h, 15, at)
    h = spendHomeTime(h, 15, at)
    expect(homeSecondsLeft(h, at)).toBe(HOME_VISIT_SECONDS - 30)
    h = spendHomeTime(h, 999, at)
    expect(h.petProgress.visit).toEqual({ day: '2026-09-08', seconds: HOME_VISIT_SECONDS })
    expect(spendHomeTime(h, 15, at)).toBe(h)
  })

  it('ignorerar noll, negativa och trasiga tider', () => {
    const h = withFrog()
    for (const s of [0, -5, Number.NaN, Number.POSITIVE_INFINITY]) expect(spendHomeTime(h, s, at)).toBe(h)
  })
})
