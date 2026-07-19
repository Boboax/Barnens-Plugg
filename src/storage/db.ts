import type { Household } from '../domain/types'
import { PROFILE_SCHEMA_VERSION } from '../domain/types'
import { repairDiagnosisBossReady, backfillSplitAddSub } from '../engine/progress'
import { blixtBlockedMoments } from '../engine/blixt'

/* ============================================================
   Lagring: IndexedDB med localStorage som reservutväg.

   All data bor lokalt på enheten (GDPR-enkelt, inga konton).
   Vi begär beständig lagring av webbläsaren så iOS inte rensar
   datan vid utrymmesbrist — och exportfunktionen är den riktiga
   livlinan (se backup.ts).
   ============================================================ */

const DB_NAME = 'barnens-plugg'
const STORE = 'household'
const KEY = 'main'
const LS_KEY = 'barnens-plugg-household'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function loadHousehold(): Promise<Household | null> {
  try {
    const db = await openDb()
    const data = await new Promise<Household | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).get(KEY)
      req.onsuccess = () => resolve(req.result as Household | undefined)
      req.onerror = () => reject(req.error)
    })
    db.close()
    if (data) return migrate(data)
  } catch {
    // IndexedDB otillgänglig (t.ex. privat läge) — prova localStorage.
  }
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return migrate(JSON.parse(raw) as Household)
  } catch {
    // Ingen lagring alls — appen startar tom.
  }
  return null
}

export async function saveHousehold(household: Household): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(household, KEY)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  } catch {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(household))
    } catch {
      // Sista utvägen misslyckades — exportpåminnelsen i föräldraläget är skyddsnätet.
    }
  }
}

/** Begär att webbläsaren inte rensar vår lagring vid utrymmesbrist. */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (navigator.storage?.persist) return await navigator.storage.persist()
  } catch {
    // Stöds inte — ignorera tyst.
  }
  return false
}

/** Migrering mellan schemaversioner. En version hittills = ingen åtgärd. */
export function migrate(data: Household): Household {
  // Normalisera saknade toppnivå-arrayer FÖRST — äldre eller handredigerade
  // kopior kan sakna rewards/chatLog, och UI:t gör h.rewards.map(...) /
  // h.chatLog direkt (skulle annars krascha på undefined vid import).
  // Reparera samtidigt gamla profiler där diagnosen skrev alla moment som
  // 'boss-ready' (→ hela kartan blev bossar). Körs vid varje inläsning/import
  // och är idempotent.
  const now = new Date().toISOString().slice(0, 10)
  // Beskär tidsbokföringen till senaste 60 dagarna (rapporten behöver 7) —
  // annars växer usageSeconds/extraSeconds obegränsat, en post per aktiv dag.
  const pruneDays = (rec: Record<string, number> | undefined): Record<string, number> | undefined => {
    if (!rec) return rec
    const cutoff = new Date(now)
    cutoff.setDate(cutoff.getDate() - 60)
    const lim = cutoff.toISOString().slice(0, 10)
    return Object.fromEntries(Object.entries(rec).filter(([d]) => d >= lim))
  }
  const base: Household = {
    ...data,
    // Trasiga/null-barn (handredigerad fil) filtreras bort — annars kraschar
    // UI:t på children.map(child.name) direkt efter import.
    children: (Array.isArray(data.children) ? data.children : [])
      .filter((c) => c && typeof c === 'object' && c.skills && typeof c.name === 'string')
      .map((c) => ({
        ...c,
        // backfillSplitAddSub: markera nya rena add/sub-noder klara för barn som
        // redan klarat den blandade noden. repairDiagnosisBossReady räknar sedan
        // om tillgänglighet med boss- och flyt-grindarna.
        skills: repairDiagnosisBossReady(backfillSplitAddSub(c.skills, now), now, c.conqueredWorlds ?? [], blixtBlockedMoments(c)),
        usageSeconds: pruneDays(c.usageSeconds) ?? {},
        extraSeconds: pruneDays(c.extraSeconds),
      })),
    rewards: Array.isArray(data.rewards) ? data.rewards : [],
    chatLog: Array.isArray(data.chatLog) ? data.chatLog : [],
  }
  if (base.schemaVersion === PROFILE_SCHEMA_VERSION) return base
  // Framtida schema-migreringar kedjas här (v1→v2→v3 …).
  return { ...base, schemaVersion: PROFILE_SCHEMA_VERSION }
}

export function emptyHousehold(): Household {
  return {
    schemaVersion: PROFILE_SCHEMA_VERSION,
    children: [],
    rewards: [],
    chatLog: [],
  }
}
