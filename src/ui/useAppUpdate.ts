import { useSyncExternalStore } from 'react'
import { registerSW } from 'virtual:pwa-register'

/* ============================================================
   Uppdateringsknappen (förälderns önskan okt 2026).

   Förr laddades en ny version ned i bakgrunden men aktiverades först när
   appen stängts helt — ofta två gånger — och en iPad i hemskärmsläge
   stängs sällan. Nu väntar den nya versionen tills någon trycker
   "Uppdatera" (startsidan och föräldraläget, aldrig mitt i ett pass), och
   appen letar själv efter nya versioner: vid start, var 30:e minut och
   när den kommer tillbaka i förgrunden. Stängs appen helt aktiveras den
   nya versionen ändå, som förut.

   En modulsingel: service workern registreras EN gång, och React-
   komponenterna prenumererar på läget.
   ============================================================ */

const CHECK_EVERY_MS = 30 * 60_000

type Phase = 'idle' | 'checking' | 'latest' | 'ready' | 'error'
interface UpdateState { phase: Phase }

let state: UpdateState = { phase: 'idle' }
const listeners = new Set<() => void>()
const set = (phase: Phase): void => {
  state = { phase }
  listeners.forEach((l) => l())
}

let registration: ServiceWorkerRegistration | undefined
let apply: ((reload?: boolean) => Promise<void>) | undefined

/** Registrera service workern vid appstart (main.tsx). Idempotent. */
export function startAppUpdate(): void {
  if (apply || typeof window === 'undefined' || !('serviceWorker' in navigator)) return
  apply = registerSW({
    immediate: true,
    onNeedRefresh: () => set('ready'),
    onRegisteredSW: (_url, r) => {
      registration = r
      if (!r) return
      window.setInterval(() => { void r.update() }, CHECK_EVERY_MS)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void r.update()
      })
    },
  })
}

/** Leta efter en ny version nu (föräldraläget). */
async function check(): Promise<void> {
  if (!registration) { set('error'); return }
  set('checking')
  try {
    await registration.update()
    // onNeedRefresh sätter 'ready' om något nytt hittades.
    window.setTimeout(() => { if (state.phase === 'checking') set('latest') }, 2500)
  } catch {
    set('error')
  }
}

/** Aktivera den nedladdade versionen och ladda om appen. */
async function update(): Promise<void> {
  await apply?.(true)
}

export function useAppUpdate(): UpdateState & { check: () => Promise<void>; update: () => Promise<void> } {
  startAppUpdate()
  const s = useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb) }, () => state)
  return { ...s, check, update }
}
