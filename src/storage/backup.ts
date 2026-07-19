import type { Household } from '../domain/types'
import { migrate } from './db'

/* ============================================================
   Export/import av hela hushållet.

   Detta är den riktiga livlinan: iOS kan rensa webbdata,
   plattor byts ut. Exporten är en JSON-fil som delas via
   Filer/AirDrop och läses in på nya enheten.
   ============================================================ */

export function exportHousehold(household: Household): void {
  // API-nyckeln följer ALDRIG med i exporten — den bor bara på enheten
  // och matas in på nytt i föräldraläget om profilen flyttas.
  // PIN-hashen strippas också: en osaltad hash av 4–6 siffror knäcks på
  // millisekunder offline. Efter import sätter föräldern ny PIN.
  const { chat, parentPinHash, ...rest } = household
  void chat
  void parentPinHash
  const stamped: Household = { ...rest, lastBackupAt: new Date().toISOString() }
  const blob = new Blob([JSON.stringify(stamped, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `barnens-plugg-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function importHousehold(file: File): Promise<Household> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as Household
        if (!Array.isArray(parsed.children)) throw new Error('Filen ser inte ut som en Räknarnas rike-backup.')
        resolve(migrate(parsed))
      } catch (e) {
        reject(e instanceof Error ? e : new Error('Kunde inte läsa filen.'))
      }
    }
    reader.onerror = () => reject(new Error('Kunde inte läsa filen.'))
    reader.readAsText(file)
  })
}

/** Dagar sedan senaste backup — styr påminnelsen i föräldraläget. */
export function daysSinceBackup(household: Household, now: string): number | null {
  if (!household.lastBackupAt) return null
  return Math.floor((new Date(now).getTime() - new Date(household.lastBackupAt).getTime()) / 86_400_000)
}
