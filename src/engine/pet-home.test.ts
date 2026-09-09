import { describe, expect, it } from 'vitest'
import type { ChildProfile, Household } from '../domain/types'
import { adoptPet, buyFurniture, completePetPractice, equipFurniture, homeSecondsLeft, petDay, spendHomeTime } from './pet-home'
import { migrate } from '../storage/db'
import { stripDeviceSecrets } from '../storage/sync'

const at = new Date(2026, 8, 8, 15)
const nextDay = new Date(2026, 8, 9, 15)
const kid = (id: string): ChildProfile => ({
  id, name: id, birthYear: 2018, color: '#446633', schoolYear: '2', createdAt: at.toISOString(),
  skills: {}, answers: [], diagnosis: { done: true, passesDone: 2, passesTotal: 2, probes: [] },
  dailyLimitMinutes: 20, usageSeconds: {}, chatEnabled: false, streak: { days: 0, lastActiveDate: '' },
})
const oldSave = (): Household => ({ schemaVersion: 1, children: [kid('a'), kid('b')], rewards: [], chatLog: [] })
const ready = () => adoptPet(completePetPractice(oldSave(), 'a', 12, 12, at), 'a', 'Mossa', at)

describe('stugan: vana, beständigt ägande och gamla sparfiler', () => {
  it('hittar en världsanpassad vän och bevarar upptäckten över nya pass och omladdning', () => {
    const h = completePetPractice(oldSave(), 'a', 8, 8, at, 'formernas-berg')
    expect(h.children[0].petProgress?.encounterSpecies).toBe('dune-fox')
    const next = completePetPractice(h, 'a', 8, 8, nextDay, 'diagramoarna')
    const adopted = adoptPet(JSON.parse(JSON.stringify(next)), 'a', 'Saffran', nextDay)
    expect(adopted.children[0].petProgress?.pet?.species).toBe('dune-fox')
    expect(adopted.children[0].petProgress?.coins).toBe(40)
  })
  it('lämnar tomma och avbrutna pass orörda', () => {
    const h = oldSave()
    for (const [done, planned] of [[0, 0], [3, 12], [13, 12], [-1, -1]]) {
      expect(completePetPractice(h, 'a', done, planned, at)).toBe(h)
    }
  })
  it('ger en dagsbelöning per barn även vid dubbel effekt eller omladdning', () => {
    const h = ready()
    expect(completePetPractice(h, 'a', 12, 12, at)).toBe(h)
    const reloaded = JSON.parse(JSON.stringify(h)) as Household
    expect(completePetPractice(reloaded, 'a', 12, 12, at)).toBe(reloaded)
    const other = completePetPractice(h, 'b', 8, 8, at)
    expect(other.children.map((c) => c.petProgress?.coins)).toEqual([20, 20])
    expect(other.children[0].skills).toBe(h.children[0].skills)
  })
  it('ger nya mynt nästa dag men inte om klockan flyttas bakåt', () => {
    const h = completePetPractice(ready(), 'a', 8, 8, nextDay)
    expect(h.children[0].petProgress?.coins).toBe(40)
    expect(completePetPractice(h, 'a', 8, 8, at)).toBe(h)
  })
  it('kräver ett pass före upptäckt och behåller det första namnet', () => {
    expect(adoptPet(oldSave(), 'a', 'Mossa', at).children[0].petProgress).toBeUndefined()
    const h = completePetPractice(oldSave(), 'a', 8, 8, at)
    expect(adoptPet(h, 'a', '   ', at)).toBe(h)
    const adopted = adoptPet(h, 'a', '  Mossa  ', at)
    expect(adopted.children[0].petProgress?.pet?.name).toBe('Mossa')
    expect(adoptPet(adopted, 'a', 'Annat', at)).toBe(adopted)
  })
  it('köper en gång och debiterar bara köparens plånbok', () => {
    const h = buyFurniture(ready(), 'a', 'ball', at)
    expect(h.children[0].petProgress?.coins).toBe(0)
    expect(h.children[1].petProgress).toBeUndefined()
    expect(h.petHome?.equipped.toy).toBe('ball')
    expect(h.petHome?.owned.ball.childId).toBe('a')
    expect(buyFurniture(h, 'a', 'ball', at)).toBe(h)
  })
  it('nekar för dyra, okända och oägda saker utan att ändra sparfilen', () => {
    const h = ready()
    expect(buyFurniture(h, 'a', 'moon-bed', at)).toBe(h)
    expect(buyFurniture(h, 'a', 'unknown', at)).toBe(h)
    expect(equipFurniture(h, 'a', 'moon-bed', at)).toBe(h)
  })
  it('behåller gamla möbler när en ny ställs fram och återutrustar gratis', () => {
    let h = ready()
    h = completePetPractice(h, 'a', 8, 8, nextDay)
    h = completePetPractice(h, 'a', 8, 8, new Date(2026, 8, 10, 15))
    const day3 = new Date(2026, 8, 10, 15)
    h = buyFurniture(buyFurniture(h, 'a', 'fern-bed', day3), 'a', 'moon-bed', day3)
    expect(Object.keys(h.petHome!.owned)).toHaveLength(2)
    expect(equipFurniture(h, 'a', 'fern-bed', day3).petHome?.equipped.bed).toBe('fern-bed')
    expect(h.children[0].petProgress?.coins).toBe(0)
  })
  it('stugtid kan inte fyllas på genom återbesök eller flera pass', () => {
    const h = spendHomeTime(ready(), 'a', 180, at)
    expect(homeSecondsLeft(h, 'a', at)).toBe(0)
    expect(buyFurniture(h, 'a', 'ball', at)).toBe(h)
    expect(homeSecondsLeft(completePetPractice(h, 'a', 8, 8, at), 'a', at)).toBe(0)
    expect(homeSecondsLeft(h, 'a', nextDay)).toBe(0)
    expect(homeSecondsLeft(completePetPractice(h, 'a', 8, 8, nextDay), 'a', nextDay)).toBe(180)
    expect(h.children[0].usageSeconds).toEqual({})
  })
  it('återläsning/migrering och export behåller nya fält utan nya krav på gamla', () => {
    expect(migrate(oldSave()).children[0].petProgress).toBeUndefined()
    const h = buyFurniture(ready(), 'a', 'ball', at)
    const restored = migrate(JSON.parse(JSON.stringify(stripDeviceSecrets(h))) as Household)
    expect(restored.petHome).toEqual(h.petHome)
    expect(restored.children[0].petProgress).toEqual(h.children[0].petProgress)
  })
  it('använder kalenderdagen i enhetens tidszon', () => {
    expect(petDay(new Date(2026, 8, 8, 0, 5))).toBe('2026-09-08')
  })
})

