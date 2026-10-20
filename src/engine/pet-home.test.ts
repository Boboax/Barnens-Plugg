import { describe, expect, it } from 'vitest'
import type { ChildProfile } from '../domain/types'
import { DAILY_PET_COINS, HOME_PEEK_SECONDS, HOME_VISIT_SECONDS, emptyPetProgress } from '../domain/pet-home'
import {
  adoptPet, completePetPractice, friendsEarned, homeSecondsLeft, markPetGrowthSeen, nextFriendSpecies, petDay,
  dismissFreshStart, displayStage, petGrewUnseen, petStage, releasePet, setShownStage, restartPetGrowth, settleMilestoneBase, spendHomeTime, campAccess, peekSecondsLeft, spendPeekTime,
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

/** Hela dagens mattetid gjord — det är den som öppnar lägret (okt 2026). */
const timeDone = (c: ChildProfile, when = at): ChildProfile =>
  ({ ...c, usageSeconds: { ...c.usageSeconds, [when.toISOString().slice(0, 10)]: c.dailyLimitMinutes * 60 } })

describe('Kvällslägret: lägertid', () => {
  it('öppnar först när hela dagens mattetid är gjord — ett pass räcker inte', () => {
    expect(homeSecondsLeft(kid(), at)).toBe(0)
    expect(homeSecondsLeft(withFrog(), at)).toBe(0)
    expect(homeSecondsLeft(timeDone(withFrog()), at)).toBe(HOME_VISIT_SECONDS)
    expect(homeSecondsLeft(timeDone(withFrog()), nextDay)).toBe(0)
    // Även utan avslutat pass: tiden tog slut mitt i passet, då är träningen gjord.
    expect(homeSecondsLeft(timeDone(kid()), at)).toBe(HOME_VISIT_SECONDS)
  })

  it('är 15 minuter och rör aldrig mattetiden', () => {
    expect(HOME_VISIT_SECONDS).toBe(15 * 60)
    const before = timeDone(withFrog())
    const after = spendHomeTime(before, 10 * 60, at)
    expect(homeSecondsLeft(after, at)).toBe(5 * 60)
    // Bara lägrets egen klocka ändras — mattetiden (usageSeconds) är orörd.
    expect(after.usageSeconds).toBe(before.usageSeconds)
  })

  it('kan inte fyllas på genom återbesök eller fler pass samma dag', () => {
    const h = spendHomeTime(timeDone(withFrog()), HOME_VISIT_SECONDS, at)
    expect(homeSecondsLeft(h, at)).toBe(0)
    expect(homeSecondsLeft(completePetPractice(h, 8, 8, 'talens-dal', at), at)).toBe(0)
    expect(homeSecondsLeft(timeDone(h, nextDay), nextDay)).toBe(HOME_VISIT_SECONDS)
  })

  it('bokförs i klumpar och stannar vid taket', () => {
    let h = timeDone(withFrog())
    h = spendHomeTime(h, 15, at)
    h = spendHomeTime(h, 15, at)
    expect(homeSecondsLeft(h, at)).toBe(HOME_VISIT_SECONDS - 30)
    h = spendHomeTime(h, 999, at)
    expect(h.petProgress.visit).toEqual({ day: '2026-09-08', seconds: HOME_VISIT_SECONDS })
    expect(spendHomeTime(h, 15, at)).toBe(h)
  })

  it('ignorerar noll, negativa och trasiga tider', () => {
    const h = timeDone(withFrog())
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

  it('väktare, tio träningsdagar och världsboss ger räv, axolotl och drake — i fast ordning', () => {
    let c: ChildProfile = { ...withFrog(), conqueredYears: ['F'] }
    expect(nextFriendSpecies(c)).toBe('dune-fox')
    c = passAndAdopt(c, 'Saffran')
    expect(c.petProgress.pets.map((p) => p.species)).toEqual(['woodland-frog', 'dune-fox'])
    // Vännen kommer från världen barnet just tränade i, även samma dag (inga extra mynt).
    expect(c.petProgress.pets[1].foundInWorldId).toBe('brakberget')
    expect(c.petProgress.coins).toBe(DAILY_PET_COINS)
    // Ett klarat blixtpass är ingen milstolpe längre (fart, princip 3).
    const fast = { ...c, blixt: { 'plus-minus-10': { best: 20, cleared: true, attempts: 1 } } } as ChildProfile
    expect(nextFriendSpecies(fast)).toBeUndefined()
    // Tionde träningsdagen är det (träningsvana, okt 2026).
    c = passAndAdopt({ ...fast, petProgress: { ...fast.petProgress, practiceDays: 9 } }, 'Pärla', nextDay)
    expect(c.petProgress.practiceDays).toBe(10)
    c = passAndAdopt({ ...c, conqueredWorlds: ['talens-dal'] }, 'Glimmer')
    expect(c.petProgress.pets.map((p) => p.species)).toEqual(['woodland-frog', 'dune-fox', 'reef-axolotl', 'crystal-dragon'])
    expect(nextFriendSpecies(c)).toBeUndefined()
  })

  it('skänkta fjärranår räknas inte som besegrad väktare', () => {
    const tenYearOld: ChildProfile = { ...withFrog(), schoolYear: '4', conqueredYears: [] }
    expect(friendsEarned(tenYearOld)).toBe(1)
  })

  it('milstolpar nådda INNAN första vännen ger inga nya vänner — bara nästa milstolpe gör det', () => {
    // Nikolai-fallet (okt 2026): blixt och väktare klarade sedan länge gav
    // förr räv och axolotl direkt efter grodan, samma dag.
    const veteranKid = {
      ...kid(), schoolYear: '4', conqueredYears: ['3'], conqueredWorlds: ['talens-dal'],
      blixt: { 'plus-minus-10': { best: 20, cleared: true, attempts: 1 } },
    } as ChildProfile
    let c = adoptPet(completePetPractice(veteranKid, 8, 8, 'talens-dal', at), 'Mossa', at)
    expect(c.petProgress.milestoneBase).toEqual({ friends: 1, years: 1, worlds: 1, blixt: 1, habit: 0 })
    expect(friendsEarned(c)).toBe(1)
    expect(completePetPractice(c, 8, 8, 'talens-dal', at).petProgress.encounter).toBeUndefined()
    expect(completePetPractice(c, 8, 8, 'talens-dal', nextDay).petProgress.encounter).toBeUndefined()
    // Nästa årsväktare besegrad → nästa vän.
    c = { ...c, conqueredYears: ['3', '4'] }
    expect(completePetPractice(c, 8, 8, 'talens-dal', nextDay).petProgress.encounter?.species).toBe('dune-fox')
  })

  it('barn som redan har vänner behåller dem; räkningen startar därifrån', () => {
    const fox = { ...withFrog().petProgress.pets[0], id: 'fox', species: 'dune-fox' as const }
    const before: ChildProfile = {
      ...withFrog(), conqueredYears: ['3'], blixt: { 'plus-minus-10': { best: 20, cleared: true, attempts: 1 } },
    } as ChildProfile
    const legacy: ChildProfile = {
      ...before,
      petProgress: { ...before.petProgress, pets: [...before.petProgress.pets, fox], milestoneBase: undefined },
    }
    const settled = settleMilestoneBase(legacy)
    expect(settled.petProgress.milestoneBase).toEqual({ friends: 2, years: 1, worlds: 0, blixt: 1, habit: 0 })
    expect(settleMilestoneBase(settled)).toBe(settled)
    expect(nextFriendSpecies(settled)).toBeUndefined()
    // En ny milstolpe → tredje vännen.
    expect(nextFriendSpecies({ ...settled, conqueredWorlds: ['talens-dal'] })).toBe('reef-axolotl')
  })
})

describe('Föräldern tar bort en vän', () => {
  it('vännen försvinner och räkningen startar om från de som är kvar', () => {
    let c: ChildProfile = { ...withFrog(), conqueredYears: ['F'] }
    c = passAndAdopt(c, 'Saffran')
    const fox = c.petProgress.pets[1]
    const after = releasePet(c, fox.id)
    expect(after.petProgress.pets.map((p) => p.name)).toEqual(['Mossa'])
    expect(after.petProgress.milestoneBase).toEqual({ friends: 1, years: 1, worlds: 0, blixt: 0, habit: 0 })
    // Väcks inte igen förrän vid nästa nya milstolpe.
    expect(nextFriendSpecies(after)).toBeUndefined()
    expect(releasePet(after, 'finns-inte')).toBe(after)
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

  it('befintliga vänner startas om som ungar och växer med det barnet lär sig härifrån', () => {
    const c = withFrog()
    // Grodan från före tillväxten (ingen startpunkt), hos en tioåring med 40 behärskade moment.
    const legacy = { ...c.petProgress.pets[0], masteredAtFound: undefined, seenStage: undefined, growthV: undefined }
    const veteran: ChildProfile = { ...c, skills: mastered(40), petProgress: { ...c.petProgress, pets: [legacy] } }
    const restarted = restartPetGrowth(veteran)
    const frog = restarted.petProgress.pets[0]
    expect(petStage(restarted, frog)).toBe(1)
    expect(frog.freshStart).toBe(true)
    expect(petGrewUnseen(restarted, frog)).toBe(false)
    // Diagnosens moment räknas inte — men fem NYA behärskade gör grodan ung.
    expect(petStage({ ...restarted, skills: mastered(44) }, frog)).toBe(1)
    expect(petStage({ ...restarted, skills: mastered(45) }, frog)).toBe(2)
    expect(petStage({ ...restarted, skills: mastered(65) }, frog)).toBe(4)
    expect(restartPetGrowth(restarted)).toBe(restarted)
  })

  it('även en vän som visats som vuxen eller följeslagare i går startas om — med rutan', () => {
    const c = withFrog()
    const shownCompanion = { ...c.petProgress.pets[0], masteredAtFound: 3, seenStage: 4, growthV: undefined }
    const kid4: ChildProfile = { ...c, skills: mastered(15), petProgress: { ...c.petProgress, pets: [shownCompanion] } }
    const restarted = restartPetGrowth(kid4)
    expect(petStage(restarted, restarted.petProgress.pets[0])).toBe(1)
    expect(restarted.petProgress.pets[0].freshStart).toBe(true)
    const read = dismissFreshStart(restarted, shownCompanion.id)
    expect(read.petProgress.pets[0].freshStart).toBeUndefined()
    expect(dismissFreshStart(read, shownCompanion.id)).toBe(read)
  })

  it('en vän som hittades som unge behåller sin startpunkt och får ingen ruta', () => {
    const c = { ...withFrog(), skills: mastered(2) }
    const youngOne = { ...c.petProgress.pets[0], masteredAtFound: 0, seenStage: 1, growthV: undefined }
    const restarted = restartPetGrowth({ ...c, petProgress: { ...c.petProgress, pets: [youngOne] } })
    expect(restarted.petProgress.pets[0].masteredAtFound).toBe(0)
    expect(restarted.petProgress.pets[0].freshStart).toBeFalsy()
    expect(petStage(restarted, restarted.petProgress.pets[0])).toBe(1)
  })

  it('ett stadium barnet sett försvinner aldrig, inte ens om gränserna höjs', () => {
    const c = withFrog()
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

describe('Lägret är belöningen efter mattetiden', () => {
  it('innan mattetiden är gjord: en minuts snabbtitt, sedan stängt', () => {
    const c = adoptPet(completePetPractice(kid(), 8, 8, 'talens-dal', at), 'Mossa', at)
    // Passet klart men mattetid kvar: bara snabbtitt.
    expect(campAccess(c, at)).toBe('peek')
    expect(peekSecondsLeft(c, nextDay)).toBe(HOME_PEEK_SECONDS)
    const used = spendPeekTime(c, HOME_PEEK_SECONDS, nextDay)
    expect(campAccess(used, nextDay)).toBe('closed-before')
    expect(spendPeekTime(used, 10, nextDay)).toBe(used)
    // Mattetiden gjord → öppet med full lägertid.
    const done = timeDone(used, nextDay)
    expect(campAccess(done, nextDay)).toBe('open')
    expect(peekSecondsLeft(done, nextDay)).toBe(0)
  })

  it('när lägertiden är slut stänger lägret för dagen', () => {
    const c = timeDone(adoptPet(completePetPractice(kid(), 8, 8, 'talens-dal', at), 'Mossa', at))
    const spent = spendHomeTime(c, HOME_VISIT_SECONDS, at)
    expect(campAccess(spent, at)).toBe('closed-after')
  })
})

describe('Tidsmaskinen: se vännen som liten igen', () => {
  // Grodan har vuxit till stadium 3 (12 behärskade moment efter att hon hittades).
  const grown = (machine = true): ChildProfile => {
    const c = withFrog()
    return {
      ...c, skills: mastered(12),
      petProgress: { ...c.petProgress, items: machine ? [{ id: 'k1', itemId: 'time-machine', boughtAt: at.toISOString() }] : [] },
    }
  }

  const firstId = grown().petProgress.pets[0].id

  it('visar en tidigare ålder men ändrar aldrig den riktiga tillväxten', () => {
    const c = grown()
    const pet = c.petProgress.pets[0]
    expect(petStage(c, pet)).toBe(3)
    const small = setShownStage(c, pet.id, 1)
    const p = small.petProgress.pets[0]
    expect(displayStage(small, p)).toBe(1)
    expect(petStage(small, p)).toBe(3)
    expect(small.skills).toBe(c.skills)
  })

  it('tillbaka till nu rensar valet, och samma val ger samma objekt', () => {
    const small = setShownStage(grown(), firstId, 2)
    expect(setShownStage(small, firstId, 2)).toBe(small)
    const now = setShownStage(small, firstId, 3)
    expect(now.petProgress.pets[0].shownStage).toBeUndefined()
    expect(displayStage(now, now.petProgress.pets[0])).toBe(3)
  })

  it('kan aldrig spola fram till en ålder vännen inte nått', () => {
    const c = grown()
    expect(setShownStage(c, firstId, 4)).toBe(c)
  })

  it('kräver att maskinen är köpt', () => {
    const c = grown(false)
    expect(setShownStage(c, firstId, 1)).toBe(c)
  })

  it('en vän som växer förbi den visade åldern syns fortfarande liten tills barnet väljer nu', () => {
    const small = setShownStage(grown(), firstId, 1)
    const more: ChildProfile = { ...small, skills: mastered(30) }
    expect(petStage(more, more.petProgress.pets[0])).toBe(4)
    expect(displayStage(more, more.petProgress.pets[0])).toBe(1)
  })
})
