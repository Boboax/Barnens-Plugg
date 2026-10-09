import type { ChildProfile, Household } from '../domain/types'
import { migrate } from './db'

/* ============================================================
   Familjesynk via förälderns EGEN Cloudflare Worker.

   Medvetet val med föräldern (aug 2026, se docs/PEDAGOGIK.md):
   grundprincipen "all data lokalt" mjukas upp till "lokalt +
   förälderns eget moln" — synken är frivillig, ägs helt av
   föräldern (egen Worker, egen KV, egen hemlighet) och kan
   raderas när som helst. Workern finns i cloud/sync-worker.js,
   uppsättningsguiden i docs/SYNC.md.

   Krockregel: nyaste versionen av VARJE BARN vinner (updatedAt).
   Så kan Nikolai spela på en platta och Edward på en annan
   samtidigt — det enda som inte går är SAMMA barn på två
   enheter på en gång (sist uppladdad vinner då).
   ============================================================ */

export interface SyncConfig {
  endpoint: string
  secret: string
}

/** Enhetshemligheter som ALDRIG lämnar enheten — varken i exportfilen
    eller i synkdatat: AI-nyckeln, PIN-hashen och synkhemligheten själv. */
export function stripDeviceSecrets(household: Household): Household {
  const { chat, parentPinHash, sync, ...rest } = household
  void chat
  void parentPinHash
  void sync
  return rest as Household
}

/** När ändrades barnet senast? Gamla profiler saknar updatedAt —
    då duger senaste svaret, och allra sist skapelsedatumet. */
const childStamp = (c: ChildProfile): string =>
  c.updatedAt ?? c.answers[c.answers.length - 1]?.at ?? c.createdAt

/**
 * Slå ihop lokalt och hämtat hushåll, barn för barn: den nyaste versionen
 * av varje barn vinner, och barnets belöningar + chattlogg följer med sin
 * vinnande sida (de hör ihop med framsteget). Enhetsfält (PIN, AI-nyckel,
 * synkinställning, blixtmål) behålls alltid från den lokala sidan.
 */
export function mergeHouseholds(local: Household, remote: Household | null): Household {
  if (!remote || !Array.isArray(remote.children)) return local
  // Borttagna profiler är borta på BÅDA sidor — annars väcker molnet (eller
  // en annan platta) liv i ett barn som föräldern tagit bort.
  const localRemoved = local.removedChildIds ?? []
  const removed = new Set([...localRemoved, ...(remote.removedChildIds ?? [])])
  const newlyRemoved = removed.size > localRemoved.length
  const byId = new Map<string, ChildProfile>()
  for (const c of local.children) if (!removed.has(c.id)) byId.set(c.id, c)
  const fromRemote = new Set<string>()
  for (const rc of remote.children) {
    if (removed.has(rc.id)) continue
    const lc = byId.get(rc.id)
    if (!lc || childStamp(rc) > childStamp(lc)) {
      byId.set(rc.id, rc)
      fromRemote.add(rc.id)
    }
  }
  // Inget nyare i molnet → samma objekt tillbaka. Då kan UI:t slå ihop med
  // en funktionell uppdatering utan att trigga en ny sparning/uppladdning.
  const schemaVersion = Math.max(local.schemaVersion ?? 1, remote.schemaVersion ?? 1)
  if (fromRemote.size === 0 && !newlyRemoved && schemaVersion === local.schemaVersion) return local
  const kept = (childId: string): boolean => !removed.has(childId)
  return {
    ...local,
    children: [...byId.values()],
    rewards: [
      ...(local.rewards ?? []).filter((r) => !fromRemote.has(r.childId) && kept(r.childId)),
      ...(remote.rewards ?? []).filter((r) => fromRemote.has(r.childId)),
    ],
    chatLog: [
      ...(local.chatLog ?? []).filter((e) => !fromRemote.has(e.childId) && kept(e.childId)),
      ...(remote.chatLog ?? []).filter((e) => fromRemote.has(e.childId)),
    ],
    removedChildIds: removed.size > 0 ? [...removed] : undefined,
    schemaVersion,
  }
}

/** Hämta molnets hushåll. null = molnet är tomt (första synken). */
export async function pullRemote(cfg: SyncConfig): Promise<Household | null> {
  // Timeout: appstarten får aldrig hänga på ett dött nät (iPad offline).
  const ctrl = new AbortController()
  const t = window.setTimeout(() => ctrl.abort(), 8000)
  try {
    const res = await fetch(cfg.endpoint, {
      headers: { Authorization: `Bearer ${cfg.secret}` },
      signal: ctrl.signal,
    })
    if (res.status === 401) throw new Error('Fel familjekod — kontrollera synkinställningen.')
    if (!res.ok) throw new Error(`Synktjänsten svarade ${res.status}.`)
    const data = (await res.json()) as Household | null
    if (data === null) return null
    if (!Array.isArray(data.children)) throw new Error('Oväntat svar från synktjänsten.')
    // Molnet kan bära en äldre schemaversion (annan enhet, äldre app).
    return migrate(data)
  } finally {
    window.clearTimeout(t)
  }
}

/** Ladda upp hushållet (utan enhetshemligheter). */
export async function pushRemote(cfg: SyncConfig, household: Household): Promise<void> {
  const res = await fetch(cfg.endpoint, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${cfg.secret}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(stripDeviceSecrets(household)),
  })
  if (!res.ok) throw new Error(`Synktjänsten svarade ${res.status}.`)
}

/**
 * En synkrunda: HÄMTA molnet, slå ihop, ladda upp det sammanslagna.
 * Varje uppladdning går hit — aldrig rakt upp med enbart lokal data.
 * Förr laddade appen upp enhetens hushåll fem sekunder efter en ändring
 * utan att först hämta; en nyss påkopplad platta (eller en som startat
 * offline) skrev då över molnet med sina egna profiler och syskonens
 * framsteg från andra plattor försvann ur molnet.
 * Returnerar molnets version så att anroparen kan slå in den i sitt
 * aktuella tillstånd (det kan ha ändrats under nätverksanropet).
 */
export async function syncRound(cfg: SyncConfig, local: Household): Promise<{ remote: Household | null; merged: Household }> {
  const remote = await pullRemote(cfg)
  const merged = mergeHouseholds(local, remote)
  await pushRemote(cfg, merged)
  return { remote, merged }
}
