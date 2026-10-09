import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ChildProfile, Household } from '../domain/types'
import { mergeHouseholds, stripDeviceSecrets, syncRound } from './sync'

/* Familjesynkens krockregel: nyaste versionen av VARJE BARN vinner, och
   barnets belöningar + chattlogg följer sin vinnande sida. Enhetsfält
   (PIN, AI-nyckel, synkhemlighet) lämnar aldrig enheten. */

const kid = (id: string, updatedAt: string, name = id): ChildProfile => ({
  id, name, color: '#000', birthYear: 2017, schoolYear: '2',
  createdAt: '2026-01-01T00:00:00Z', updatedAt,
  skills: {}, answers: [],
  diagnosis: { passesDone: 0, passesTotal: 2, done: false, probes: [] },
  dailyLimitMinutes: 20, usageSeconds: {}, chatEnabled: false,
  streak: { days: 0, lastActiveDate: '' },
})

const home = (children: ChildProfile[], extra: Partial<Household> = {}): Household => ({
  schemaVersion: 1, children, rewards: [], chatLog: [], ...extra,
})

describe('familjesynk: sammanslagning per barn', () => {
  it('nyaste versionen av varje barn vinner — oberoende av sida', () => {
    const local = home([kid('a', '2026-08-01T10:00:00Z', 'A-lokal'), kid('b', '2026-08-05T10:00:00Z', 'B-lokal')])
    const remote = home([kid('a', '2026-08-03T10:00:00Z', 'A-moln'), kid('b', '2026-08-02T10:00:00Z', 'B-moln')])
    const merged = mergeHouseholds(local, remote)
    expect(merged.children.find((c) => c.id === 'a')?.name).toBe('A-moln') // molnet nyare
    expect(merged.children.find((c) => c.id === 'b')?.name).toBe('B-lokal') // lokalt nyare
  })

  it('barn som bara finns på en sida behålls (nytt syskon på annan enhet)', () => {
    const local = home([kid('a', '2026-08-01T10:00:00Z')])
    const remote = home([kid('a', '2026-07-01T10:00:00Z'), kid('c', '2026-08-01T10:00:00Z')])
    const merged = mergeHouseholds(local, remote)
    expect(merged.children.map((c) => c.id).sort()).toEqual(['a', 'c'])
  })

  it('belöningar och chattlogg följer sitt barns vinnande sida', () => {
    const reward = (id: string, childId: string, title: string) =>
      ({ id, childId, title, emoji: 'bok', target: { type: 'sessions' as const, count: 3 },
        createdAt: '2026-08-01', baseline: { momentsMastered: 0, activeDays: 0 } })
    const local = home([kid('a', '2026-08-01T10:00:00Z')], {
      rewards: [reward('r1', 'a', 'gammal')], chatLog: [{ at: '1', childId: 'a', role: 'child', text: 'lokal' }],
    })
    const remote = home([kid('a', '2026-08-02T10:00:00Z')], {
      rewards: [reward('r2', 'a', 'ny')], chatLog: [{ at: '2', childId: 'a', role: 'child', text: 'moln' }],
    })
    const merged = mergeHouseholds(local, remote)
    expect(merged.rewards.map((r) => r.id)).toEqual(['r2'])
    expect(merged.chatLog.map((e) => e.text)).toEqual(['moln'])
  })

  it('tomt moln (första synken) och trasigt svar lämnar allt orört', () => {
    const local = home([kid('a', '2026-08-01T10:00:00Z')])
    expect(mergeHouseholds(local, null)).toBe(local)
    expect(mergeHouseholds(local, {} as Household)).toBe(local)
  })

  it('gamla profiler utan updatedAt jämförs via senaste svar/skapelse', () => {
    const oldLocal = { ...kid('a', ''), updatedAt: undefined, answers: [{ at: '2026-08-04T10:00:00Z' } as never] }
    const newerRemote = kid('a', '2026-08-05T10:00:00Z', 'moln')
    const merged = mergeHouseholds(home([oldLocal]), home([newerRemote]))
    expect(merged.children[0].name).toBe('moln')
  })

  it('enhetsfält behålls lokalt och strippas ur synkdatat', () => {
    const local = home([kid('a', '2026-08-01T10:00:00Z')], {
      parentPinHash: 'hash', chat: { provider: 'gemini', apiKey: 'nyckel' },
      sync: { endpoint: 'https://x', secret: 'kod' },
    })
    const merged = mergeHouseholds(local, home([kid('a', '2026-08-02T10:00:00Z')]))
    expect(merged.parentPinHash).toBe('hash')
    expect(merged.sync?.secret).toBe('kod')
    const stripped = stripDeviceSecrets(local)
    expect(stripped.parentPinHash).toBeUndefined()
    expect(stripped.chat).toBeUndefined()
    expect(stripped.sync).toBeUndefined()
  })

  it('inget nyare i molnet → samma objekt (ingen onödig sparning eller runda)', () => {
    const local = home([kid('a', '2026-08-02T10:00:00Z')])
    expect(mergeHouseholds(local, home([kid('a', '2026-08-01T10:00:00Z')]))).toBe(local)
    expect(mergeHouseholds(local, home([kid('a', '2026-08-02T10:00:00Z')]))).toBe(local)
  })
})

describe('familjesynk: synkrundan hämtar alltid före uppladdning', () => {
  afterEach(() => vi.unstubAllGlobals())

  /** Ett låtsasmoln: GET ger det som senast laddades upp, PUT sparar. */
  function fakeCloud(initial: Household | null) {
    let stored = initial === null ? 'null' : JSON.stringify(initial)
    vi.stubGlobal('window', globalThis)
    vi.stubGlobal('fetch', async (_url: string, init?: { method?: string; body?: string }) => {
      if (init?.method === 'PUT') stored = init.body ?? 'null'
      return new Response(init?.method === 'PUT' ? 'ok' : stored, { status: 200 })
    })
    return { read: () => JSON.parse(stored) as Household | null }
  }
  const cfg = { endpoint: 'https://plugg-sync.test', secret: 'kod' }

  it('en nyss påkopplad platta skriver aldrig över syskonens profiler i molnet', async () => {
    // Molnet har redan barn a och b (från deras egna plattor).
    const cloud = fakeCloud(home([kid('a', '2026-08-01T10:00:00Z'), kid('b', '2026-08-01T11:00:00Z')]))
    // Barn c:s platta har bara c lokalt och kopplar på synken.
    const tabletC = home([kid('c', '2026-08-02T09:00:00Z')], { parentPinHash: 'pin', sync: { ...cfg } })
    const { merged } = await syncRound(cfg, tabletC)
    expect(merged.children.map((c) => c.id).sort()).toEqual(['a', 'b', 'c'])
    expect(cloud.read()!.children.map((c) => c.id).sort()).toEqual(['a', 'b', 'c'])
    // Enhetshemligheterna lämnade aldrig plattan.
    expect(cloud.read()!.parentPinHash).toBeUndefined()
    expect(cloud.read()!.sync).toBeUndefined()
  })

  it('första plattan mot ett tomt moln laddar upp sina profiler', async () => {
    const cloud = fakeCloud(null)
    await syncRound(cfg, home([kid('a', '2026-08-01T10:00:00Z')]))
    expect(cloud.read()!.children.map((c) => c.id)).toEqual(['a'])
  })

  it('hämtningen misslyckas (fel kod) → inget laddas upp', async () => {
    let puts = 0
    vi.stubGlobal('window', globalThis)
    vi.stubGlobal('fetch', async (_url: string, init?: { method?: string }) => {
      if (init?.method === 'PUT') puts++
      return new Response('Fel familjekod', { status: 401 })
    })
    await expect(syncRound(cfg, home([kid('a', '2026-08-01T10:00:00Z')]))).rejects.toThrow('Fel familjekod')
    expect(puts).toBe(0)
  })
})
