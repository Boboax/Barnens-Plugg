import { describe, expect, it } from 'vitest'
import type { ChildProfile, Household } from '../domain/types'
import { CAMP_CATALOG, OUTFITS, isCampUnlockMet } from '../domain/camp'
import { HOME_VISIT_SECONDS, emptyPetProgress, type CampPet } from '../domain/pet-home'
import { changeCamp } from './camp'
import { migrate } from '../storage/db'

/* Kvällslägrets handelsbod och omsorg. Porterat från referensgrenens
   camp.test.ts: samma regler (atomiska köp, idempotent köp-id, inga
   ändringar utan lägertid, syskon åtskilda) — men föremålen bor nu på
   barnet, så hushållsnivåns petHome och de gamla möblerna är borta. */

const at = new Date(2026, 8, 9, 15)
const today = '2026-09-09'

const frog: CampPet = {
  id: 'first-pet', name: 'Mossa', species: 'woodland-frog', foundAt: 'old', foundInWorldId: 'talens-dal', bedPoint: 'bed-1',
}
const fox: CampPet = { id: 'fox', name: 'Saffran', species: 'dune-fox', foundAt: 'old', foundInWorldId: 'brakberget' }

const kid = (patch: Partial<ChildProfile['petProgress']> = {}, id = 'a'): ChildProfile => ({
  id, name: id.toUpperCase(), color: '#446633', birthYear: 2018, schoolYear: '2', createdAt: at.toISOString(),
  skills: {}, answers: [], diagnosis: { done: true, passesDone: 1, passesTotal: 1, probes: [] },
  dailyLimitMinutes: 20, usageSeconds: {}, chatEnabled: false, streak: { days: 0, lastActiveDate: '' },
  seenWorlds: ['monsterskogen'],
  petProgress: { ...emptyPetProgress(), coins: 200, lastPracticeDay: today, pets: [frog], ...patch },
})

const buy = (itemId: string, purchaseId: string) => ({ type: 'buy', itemId, purchaseId }) as const

describe('Kvällslägret: köp', () => {
  it('köper atomiskt: mynten dras och föremålet hamnar i packningen i samma steg', () => {
    const c = kid()
    const next = changeCamp(c, buy('camp-lantern', 'p1'), at)
    expect(next.petProgress.coins).toBe(160)
    expect(next.petProgress.items).toEqual([{ id: 'p1', itemId: 'camp-lantern', boughtAt: at.toISOString() }])
  })

  it('samma köp-id debiteras aldrig två gånger, men en ny bädd per vän går', () => {
    const c = kid({ pets: [frog, fox] })
    const once = changeCamp(c, buy('fern-bed', 'one'), at)
    expect(changeCamp(once, buy('fern-bed', 'one'), at)).toBe(once)
    const twice = changeCamp(once, buy('fern-bed', 'two'), at)
    expect(twice.petProgress.items.map((i) => i.itemId)).toEqual(['fern-bed', 'fern-bed'])
    expect(twice.petProgress.coins).toBe(120)
    // Två vänner = två bäddar, inte fler.
    expect(changeCamp(twice, buy('fern-bed', 'three'), at)).toBe(twice)
  })

  it('låter saker köpas bara upp till sin gräns', () => {
    let c = kid()
    c = changeCamp(c, buy('sun-rug', 'rug-1'), at)
    expect(changeCamp(c, buy('sun-rug', 'rug-2'), at)).toBe(c)
    c = changeCamp(c, buy('camp-lantern', 'lamp-1'), at)
    c = changeCamp(c, buy('camp-lantern', 'lamp-2'), at)
    expect(changeCamp(c, buy('camp-lantern', 'lamp-3'), at)).toBe(c)
  })

  it('nekar för dyra, okända, låsta och id-lösa köp utan att ändra något', () => {
    const poor = kid({ coins: 10 })
    expect(changeCamp(poor, buy('camp-lantern', 'x'), at)).toBe(poor)
    const c = kid()
    expect(changeCamp(c, buy('okänd', 'x'), at)).toBe(c)
    expect(changeCamp(c, buy('camp-lantern', ''), at)).toBe(c)
  })

  it('kräver dagens lägertid och minst en vän', () => {
    const noTime = kid({ visit: { day: today, seconds: HOME_VISIT_SECONDS } })
    expect(changeCamp(noTime, buy('camp-lantern', 'x'), at)).toBe(noTime)
    const noPractice = kid({ lastPracticeDay: '2026-09-08' })
    expect(changeCamp(noPractice, buy('camp-lantern', 'x'), at)).toBe(noPractice)
    const noPets = kid({ pets: [] })
    expect(changeCamp(noPets, buy('camp-lantern', 'x'), at)).toBe(noPets)
  })

  it('inget i boden kostar mer än en veckas träning (140 mynt)', () => {
    for (const item of CAMP_CATALOG) expect(item.price).toBeLessThanOrEqual(140)
    for (const outfit of OUTFITS) expect(outfit.price).toBeLessThanOrEqual(140)
  })
})

describe('Kvällslägret: placering', () => {
  it('placerar på rätt sorts plats, nekar upptagna och packar undan utan att något försvinner', () => {
    let c = kid({ pets: [frog, fox] })
    c = changeCamp(c, buy('fern-bed', 'one'), at)
    c = changeCamp(c, buy('moon-bed', 'two'), at)
    c = changeCamp(c, { type: 'place', instanceId: 'one', point: 'bed-1' }, at)
    expect(changeCamp(c, { type: 'place', instanceId: 'two', point: 'bed-1' }, at)).toBe(c)
    expect(changeCamp(c, { type: 'place', instanceId: 'two', point: 'light-1' }, at)).toBe(c)
    c = changeCamp(c, { type: 'place', instanceId: 'two', point: 'bed-2' }, at)
    c = changeCamp(c, { type: 'place', instanceId: 'one' }, at)
    expect(c.petProgress.items).toHaveLength(2)
    expect(c.petProgress.items.find((i) => i.id === 'one')?.point).toBeUndefined()
    expect(c.petProgress.items.find((i) => i.id === 'two')?.point).toBe('bed-2')
  })

  it('tältet står vid elden och har ingen flyttbar plats', () => {
    let c = kid()
    c = changeCamp(c, buy('pet-tent', 'tent'), at)
    expect(c.petProgress.coins).toBe(100)
    expect(changeCamp(c, { type: 'place', instanceId: 'tent', point: 'bed-1' }, at)).toBe(c)
  })

  it('håller syskons packningar och placeringar åtskilda', () => {
    const h: Household = { schemaVersion: 2, rewards: [], chatLog: [], children: [kid({}, 'a'), kid({}, 'b')] }
    const [a, b] = h.children
    const a2 = changeCamp(changeCamp(a, buy('camp-lantern', 'a-light'), at), { type: 'place', instanceId: 'a-light', point: 'light-1' }, at)
    const b2 = changeCamp(changeCamp(b, buy('camp-lantern', 'b-light'), at), { type: 'place', instanceId: 'b-light', point: 'light-1' }, at)
    expect(a2.petProgress.items).toMatchObject([{ id: 'a-light', point: 'light-1' }])
    expect(b2.petProgress.items).toMatchObject([{ id: 'b-light', point: 'light-1' }])
    // A kan inte flytta B:s lykta — den finns inte i A:s packning.
    expect(changeCamp(a2, { type: 'place', instanceId: 'b-light', point: 'light-2' }, at)).toBe(a2)
  })
})

describe('Kvällslägret: vännerna', () => {
  it('sparar omsorg utan att debitera mynt eller ändra skolarbetet', () => {
    const c = kid()
    let next = changeCamp(c, { type: 'care', petId: 'first-pet', activity: 'feed' }, at)
    next = changeCamp(next, { type: 'care', petId: 'first-pet', activity: 'pet' }, at)
    const reloaded = migrate({ schemaVersion: 2, rewards: [], chatLog: [], children: [JSON.parse(JSON.stringify(next))] })
    expect(reloaded.children[0].petProgress.pets[0]).toMatchObject({
      name: 'Mossa', care: { lastFedAt: at.toISOString(), lastPettedAt: at.toISOString() },
    })
    expect(next.petProgress.coins).toBe(200)
    expect(next.skills).toBe(c.skills)
    expect(next.answers).toBe(c.answers)
  })

  it('en vän som sover väcks inte av godbitar, och andras omsorg lämnas orörd', () => {
    let c = kid({ pets: [frog, { ...fox, care: { lastFedAt: 'old' } }] })
    c = changeCamp(c, { type: 'care', petId: 'first-pet', activity: 'rest' }, at)
    expect(c.petProgress.pets[0].care?.resting).toBe(true)
    expect(changeCamp(c, { type: 'care', petId: 'first-pet', activity: 'feed' }, at)).toBe(c)
    expect(changeCamp(c, { type: 'care', petId: 'first-pet', activity: 'pet' }, at)).toBe(c)
    c = changeCamp(c, { type: 'care', petId: 'first-pet', activity: 'wake' }, at)
    expect(c.petProgress.pets[0].care?.resting).toBe(false)
    expect(c.petProgress.pets[1].care).toEqual({ lastFedAt: 'old' })
  })

  it('nekar omsorg för okända vänner och när lägertiden är slut', () => {
    const c = kid()
    expect(changeCamp(c, { type: 'care', petId: 'saknas', activity: 'feed' }, at)).toBe(c)
    const late = kid({ visit: { day: today, seconds: HOME_VISIT_SECONDS } })
    for (const activity of ['feed', 'pet', 'rest', 'wake'] as const) {
      expect(changeCamp(late, { type: 'care', petId: 'first-pet', activity }, at)).toBe(late)
    }
  })

  it('byter namn (trimmat, max 24 tecken) och byter sovplats atomiskt', () => {
    let c = kid({ pets: [frog, { ...fox, bedPoint: 'bed-2' }] })
    c = changeCamp(c, { type: 'rename', petId: 'fox', name: '  Sandy  ' }, at)
    expect(c.petProgress.pets[1].name).toBe('Sandy')
    expect(changeCamp(c, { type: 'rename', petId: 'fox', name: '   ' }, at)).toBe(c)
    c = changeCamp(c, { type: 'bed', petId: 'fox', point: 'bed-1' }, at)
    expect(c.petProgress.pets.map((p) => p.bedPoint)).toEqual(['bed-2', 'bed-1'])
    expect(changeCamp(c, { type: 'bed', petId: 'fox', point: 'rug-1' }, at)).toBe(c)
  })
})

describe('Kvällslägret: garderoben', () => {
  it('debiterar en mantel en gång och tar på den gratis igen', () => {
    const c = kid()
    const once = changeCamp(c, { type: 'outfit', outfitId: 'starlight' }, at)
    expect(once.petProgress).toMatchObject({ coins: 120, outfit: 'starlight', outfits: ['starlight'] })
    const back = changeCamp(once, { type: 'outfit', outfitId: 'traveller' }, at)
    const again = changeCamp(back, { type: 'outfit', outfitId: 'starlight' }, at)
    expect(again.petProgress.coins).toBe(120)
    expect(again.skills).toBe(c.skills)
  })

  it('visar och säljer följeslagarmanteln först när rätt vän bor i lägret', () => {
    const c = kid({ coins: 300 })
    expect(changeCamp(c, { type: 'outfit', outfitId: 'dune-companion' }, at)).toBe(c)
    const withFox = kid({ coins: 300, pets: [frog, fox] })
    expect(changeCamp(withFox, { type: 'outfit', outfitId: 'dune-companion' }, at).petProgress)
      .toMatchObject({ coins: 180, outfit: 'dune-companion' })
  })

  it('nekar mantlar efter lägertiden och utan tillräckligt med mynt', () => {
    const poor = kid({ coins: 0 })
    expect(changeCamp(poor, { type: 'outfit', outfitId: 'starlight' }, at)).toBe(poor)
    const late = kid({ visit: { day: today, seconds: HOME_VISIT_SECONDS } })
    expect(changeCamp(late, { type: 'outfit', outfitId: 'starlight' }, at)).toBe(late)
  })
})

describe('Kvällslägret: hela boden öppen', () => {
  it('allt i boden kan köpas så snart lägret är upplåst, även för det yngsta barnet', () => {
    const fk = { ...kid({ coins: 1000 }), schoolYear: 'F' as const, seenWorlds: [], conqueredWorlds: [] }
    for (const item of CAMP_CATALOG) expect(isCampUnlockMet(item.unlock, fk)).toBe(true)
    const stars = changeCamp(fk, buy('star-lights', 'x'), at)
    expect(stars.petProgress.items.map((i) => i.itemId)).toEqual(['star-lights'])
  })

  it('bara följeslagarmantlarna väntar på rätt vän', () => {
    const fk = { ...kid(), seenWorlds: [], conqueredWorlds: [] }
    const locked = OUTFITS.filter((o) => !isCampUnlockMet(o.unlock, fk)).map((o) => o.id)
    expect(locked).toEqual(['dune-companion', 'reef-companion'])
  })
})
