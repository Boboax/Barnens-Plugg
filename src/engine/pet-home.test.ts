import { describe, expect, it } from 'vitest'
import type { ChildProfile } from '../domain/types'
import { DAILY_PET_COINS, HOME_VISIT_SECONDS, emptyPetProgress } from '../domain/pet-home'
import {
  adoptPet, completePetPractice, friendsEarned, homeSecondsLeft, markPetGrowthSeen, nextFriendSpecies, petDay,
  petGrewUnseen, petStage, settleLegacyPets, spendHomeTime,
} from './pet-home'
import type { SkillState } from '../domain/types'

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

  it('är 15 minuter och rör aldrig mattetiden', () => {
    expect(HOME_VISIT_SECONDS).toBe(15 * 60)
    const before = withFrog()
    const after = spendHomeTime(before, 10 * 60, at)
    expect(homeSecondsLeft(after, at)).toBe(5 * 60)
    // Bara lägrets egen klocka ändras — mattetiden (usageSeconds) är orörd.
    expect(after.usageSeconds).toBe(before.usageSeconds)
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

/* ---------- Etapp 2: fler vänner och tillväxt ---------- */

const mastered = (n: number, start = 0): Record<string, SkillState> => Object.fromEntries(
  Array.from({ length: n }, (_, i) => [`m${start + i}`, {
    momentId: `m${start + i}`, mastery: 'mastered', rating: 500, attempts: 10, correct: 9,
    recentMisconceptions: [], bossAttempts: 1, starWon: false,
  } satisfies SkillState]))

/** Ett pass senare samma dag (eller en ny dag) — och döp den som väntar. */
const passAndAdopt = (c: ChildProfile, name: string, when = at): ChildProfile =>
  adoptPet(completePetPractice(c, 8, 8, 'brakberget', when), name, when)

describe('Etapp 2: en ny vän per milstolpe', () => {
  it('utan milstolpar kommer ingen ny vän, hur många pass det än blir', () => {
    const h = withFrog()
    expect(friendsEarned(h)).toBe(1)
    expect(completePetPractice(h, 8, 8, 'brakberget', at)).toBe(h)
    expect(completePetPractice(h, 8, 8, 'brakberget', nextDay).petProgress.encounter).toBeUndefined()
  })

  it('väktare, världsboss och blixt ger räv, axolotl och drake — i fast ordning', () => {
    let c: ChildProfile = { ...withFrog(), conqueredYears: ['F'] }
    expect(nextFriendSpecies(c)).toBe('dune-fox')
    c = passAndAdopt(c, 'Saffran')
    expect(c.petProgress.pets.map((p) => p.species)).toEqual(['woodland-frog', 'dune-fox'])
    // Vännen kommer från världen barnet just tränade i, även samma dag (inga extra mynt).
    expect(c.petProgress.pets[1].foundInWorldId).toBe('brakberget')
    expect(c.petProgress.coins).toBe(DAILY_PET_COINS)
    c = passAndAdopt({ ...c, blixt: { 'plus-minus-10': { best: 20, cleared: true, attempts: 1 } } } as ChildProfile, 'Pärla')
    c = passAndAdopt({ ...c, conqueredWorlds: ['talens-dal'] }, 'Glimmer')
    expect(c.petProgress.pets.map((p) => p.species)).toEqual(['woodland-frog', 'dune-fox', 'reef-axolotl', 'crystal-dragon'])
    expect(nextFriendSpecies(c)).toBeUndefined()
  })

  it('skänkta fjärranår räknas inte som besegrad väktare', () => {
    const tenYearOld: ChildProfile = { ...withFrog(), schoolYear: '4', conqueredYears: [] }
    expect(friendsEarned(tenYearOld)).toBe(1)
  })

  it('den som redan passerat alla milstolpar får vännerna EN i taget', () => {
    const veteran: ChildProfile = {
      ...withFrog(), conqueredYears: ['1'], conqueredWorlds: ['talens-dal'],
      blixt: { 'plus-minus-10': { best: 20, cleared: true, attempts: 1 } },
    } as ChildProfile
    const one = completePetPractice(veteran, 8, 8, 'talens-dal', at)
    expect(one.petProgress.encounter?.species).toBe('dune-fox')
    // En upptäckt väntar redan → nästa pass väcker ingen till.
    expect(completePetPractice(one, 8, 8, 'talens-dal', at)).toBe(one)
  })
})

describe('Etapp 2: vännerna växer med barnets lärande', () => {
  it('en ny vän börjar som unge och växer med behärskade moment', () => {
    const base: ChildProfile = { ...withFrog(), skills: mastered(5) }
    const fox = passAndAdopt({ ...base, conqueredYears: ['F'] }, 'Saffran').petProgress.pets[1]
    expect(fox.masteredAtFound).toBe(5)
    const at = (n: number): ChildProfile => ({ ...base, skills: mastered(5 + n), petProgress: { ...base.petProgress, pets: [fox] } })
    expect([0, 4, 5, 11, 12, 24, 25, 60].map((n) => petStage(at(n), fox))).toEqual([1, 1, 2, 2, 3, 3, 4, 4])
  })

  it('repetitionsmoment räknas — en vän krymper aldrig', () => {
    const c: ChildProfile = { ...withFrog(), skills: mastered(4) }
    const pet = c.petProgress.pets[0]
    const review = { ...c.skills, m0: { ...c.skills.m0, mastery: 'needs-review' as const } }
    expect(petStage({ ...c, skills: review }, pet)).toBe(petStage(c, pet))
  })

  it('en vän från före etapp 2 är vuxen — och växer bara med det barnet lär sig härifrån', () => {
    const c = withFrog()
    const legacy = { ...c.petProgress.pets[0], masteredAtFound: undefined, seenStage: undefined }
    // Tioåringen med 40 behärskade moment (många från diagnosen) får INTE en följeslagare direkt.
    const veteran: ChildProfile = { ...c, skills: mastered(40), petProgress: { ...c.petProgress, pets: [legacy] } }
    expect(petStage(veteran, legacy)).toBe(3)
    const settled = settleLegacyPets(veteran)
    const frog = settled.petProgress.pets[0]
    expect(petStage(settled, frog)).toBe(3)
    expect(petGrewUnseen(settled, frog)).toBe(false)
    // 12 nya behärskade moment senare (25 sedan "vuxen-starten" på 12) → följeslagare.
    expect(petStage({ ...settled, skills: mastered(40 + 12) }, frog)).toBe(3)
    expect(petStage({ ...settled, skills: mastered(40 + 13) }, frog)).toBe(4)
    expect(settleLegacyPets(settled)).toBe(settled)
  })

  it('en vän barnet redan sett som följeslagare får behålla det — en vän krymper aldrig', () => {
    const c = withFrog()
    const seenCompanion = { ...c.petProgress.pets[0], masteredAtFound: undefined, seenStage: 4 }
    const kid4: ChildProfile = { ...c, skills: mastered(15), petProgress: { ...c.petProgress, pets: [seenCompanion] } }
    expect(petStage(settleLegacyPets(kid4), settleLegacyPets(kid4).petProgress.pets[0])).toBe(4)
    // Och höjda gränser kan aldrig ta ett sett stadium ifrån vännen.
    const grownYoung = { ...c.petProgress.pets[0], masteredAtFound: 0, seenStage: 2 }
    expect(petStage({ ...c, skills: mastered(3) }, grownYoung)).toBe(2)
  })

  it('"har växt!" visas en gång per nytt stadium', () => {
    let c = withFrog()
    const id = c.petProgress.pets[0].id
    expect(petGrewUnseen(c, c.petProgress.pets[0])).toBe(false)
    c = { ...c, skills: mastered(5) }
    expect(petGrewUnseen(c, c.petProgress.pets[0])).toBe(true)
    const seen = markPetGrowthSeen(c, id)
    expect(petGrewUnseen(seen, seen.petProgress.pets[0])).toBe(false)
    expect(markPetGrowthSeen(seen, id)).toBe(seen)
  })

  it('tillväxt och nya vänner ändrar aldrig skills eller svar', () => {
    const c: ChildProfile = { ...withFrog(), skills: mastered(3), conqueredYears: ['F'] }
    const after = markPetGrowthSeen(passAndAdopt(c, 'Saffran'), c.petProgress.pets[0].id)
    expect(after.skills).toBe(c.skills)
    expect(after.answers).toBe(c.answers)
  })
})
