import { describe, expect, it } from 'vitest'
import type { Household } from '../domain/types'
import { PROFILE_SCHEMA_VERSION } from '../domain/types'
import { emptyPetProgress } from '../domain/pet-home'
import { migrate } from './db'

/* Schema v1 → v2 (Kvällslägret). Barnens sparade framsteg och gamla
   exportfiler måste gå att läsa in — importHousehold kör migrate() på
   filens innehåll precis som här. */

/** En exportfil som v1-appen skrev den (ingen petProgress, inga gåvor). */
const V1_EXPORT = `{
  "schemaVersion": 1,
  "children": [
    {
      "id": "barn-1", "name": "Ella", "color": "#FF7A6E", "birthYear": 2020, "schoolYear": "F",
      "createdAt": "2026-08-01T08:00:00.000Z", "updatedAt": "2026-10-01T17:00:00.000Z",
      "skills": {}, "answers": [],
      "diagnosis": { "passesDone": 1, "passesTotal": 1, "done": true, "probes": [] },
      "dailyLimitMinutes": 15, "usageSeconds": {}, "chatEnabled": false,
      "streak": { "days": 4, "lastActiveDate": "2026-10-01" },
      "conqueredYears": [], "seenWorlds": ["talens-dal"]
    }
  ],
  "rewards": [],
  "chatLog": [],
  "lastBackupAt": "2026-10-01T18:00:00.000Z"
}`

describe('migrering v1 → v2', () => {
  it('läser en exportfil från version 1 och ger barnet ett tomt läger', () => {
    const migrated = migrate(JSON.parse(V1_EXPORT) as Household)
    expect(PROFILE_SCHEMA_VERSION).toBe(2)
    expect(migrated.schemaVersion).toBe(2)
    const ella = migrated.children[0]
    expect(ella.petProgress).toEqual(emptyPetProgress())
    // Allt annat lämnas orört.
    expect(ella.name).toBe('Ella')
    expect(ella.streak).toEqual({ days: 4, lastActiveDate: '2026-10-01' })
    expect(ella.updatedAt).toBe('2026-10-01T17:00:00.000Z')
    expect(migrated.lastBackupAt).toBe('2026-10-01T18:00:00.000Z')
  })

  it('är idempotent och behåller ett befintligt läger', () => {
    const once = migrate(JSON.parse(V1_EXPORT) as Household)
    once.children[0].petProgress = { ...emptyPetProgress(), coins: 40, lastPracticeDay: '2026-10-02' }
    const twice = migrate(JSON.parse(JSON.stringify(once)) as Household)
    expect(twice.children[0].petProgress).toEqual(once.children[0].petProgress)
    expect(twice.schemaVersion).toBe(2)
  })

  it('fyller i ett halvt läger fält för fält', () => {
    const data = JSON.parse(V1_EXPORT) as Household
    data.children[0].petProgress = { coins: 60 } as never
    const migrated = migrate(data)
    expect(migrated.children[0].petProgress).toEqual({ ...emptyPetProgress(), coins: 60 })
  })

  it('reparerar även ett barn utan läger i en fil märkt v2 (en platta som ännu kör v1-appen)', () => {
    const data = { ...(JSON.parse(V1_EXPORT) as Household), schemaVersion: 2 }
    expect(migrate(data).children[0].petProgress).toEqual(emptyPetProgress())
  })
})
