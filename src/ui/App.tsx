import { useEffect, useRef, useState } from 'react'
import { setMusicScene, pauseMusic, unlockAudio, installAudioLifecycle } from '../sound'
import { Pi } from './components/Pi'
import { Splash } from './components/Splash'
import { BattleScreen } from './screens/BattleScreen'
import { BlixtScreen } from './screens/BlixtScreen'
import { DiagnosisScreen } from './screens/DiagnosisScreen'
import { Home } from './screens/Home'
import { ParentScreen } from './screens/ParentScreen'
import { ProfileSelect } from './screens/ProfileSelect'
import { SessionScreen } from './screens/SessionScreen'
import { TimeUp } from './screens/TimeUp'
import { useStore } from './store'

/** Skärmar där aktiv träningstid tickar mot dagens gräns. */
const TIMED_SCREENS = new Set(['session', 'check', 'boss', 'star', 'blixt', 'diagnosis'])
const TICK_SECONDS = 5
/**
 * Aktivitetsbaserad tid: klockan räknar bara när barnet faktiskt gör något.
 * Ingen pekning på 90 s → räkningen pausar tyst (att tänka länge på en
 * uppgift är okej — 90 s utan EN tryckning betyder paus, inte funderande).
 * Efter 2,5 min somnar Pi med en "är du kvar?"-skärm. Att låta plattan
 * ligga förbrukar alltså noll tid — "låta timern rinna ut" fungerar inte.
 */
const IDLE_GRACE_MS = 90_000
const IDLE_SLEEP_MS = 150_000

export function App() {
  const store = useStore()
  const { screen, activeChild, loaded } = store
  const [showSplash, setShowSplash] = useState(true)
  const [piSover, setPiSover] = useState(false)
  const lastActivity = useRef(Date.now())

  // Profilfärgen följer barnet genom hela appen.
  useEffect(() => {
    document.documentElement.style.setProperty('--kid', activeChild?.color ?? 'var(--primary)')
  }, [activeChild?.color])

  // iOS släpper ljudet först efter en användargest.
  useEffect(() => {
    const unlock = (): void => unlockAudio()
    window.addEventListener('pointerdown', unlock, { once: true })
    return () => window.removeEventListener('pointerdown', unlock)
  }, [])

  // Tysta musiken när appen göms/stängs (annars spelar mp3-låten kvar i
  // bakgrunden på iOS). Återupptas automatiskt när appen blir synlig igen.
  useEffect(() => { installAudioLifecycle() }, [])

  // All interaktion räknas som aktivitet (peka, rita, skriva).
  useEffect(() => {
    const poke = (): void => {
      lastActivity.current = Date.now()
    }
    window.addEventListener('pointerdown', poke)
    window.addEventListener('keydown', poke)
    return () => {
      window.removeEventListener('pointerdown', poke)
      window.removeEventListener('keydown', poke)
    }
  }, [])

  // Musiken följer skärmen — och pausar (glömmer inte) när Pi sover.
  // Startlåten spelar på spelarvalet och FÅR spela klart in på kartan; sen
  // loopar temalåten tills en bosstrid, då bosslåtarna tar över.
  useEffect(() => {
    if (piSover) { pauseMusic(); return }
    // Bara VÄRLDSBOSSEN (klimaxstriden) får den dramatiska boss-musiken.
    // Nodens vänliga kunskapskoll ('check') och diamanten ('star') kör temalåten.
    if (screen === 'boss') setMusicScene('boss')
    else if (screen === 'profiles') setMusicScene('start')
    else setMusicScene('spel') // home, session, check, star, diagnosis, blixt, time-up, parent
  }, [screen, piSover])

  // Tidsbokföring: tickar bara på träningsskärmar, bara vid aktivitet,
  // bara när appen är synlig. Låser vänligt när tiden är slut.
  useEffect(() => {
    if (!activeChild || !TIMED_SCREENS.has(screen)) return
    const interval = window.setInterval(() => {
      const idleFor = Date.now() - lastActivity.current
      if (document.visibilityState === 'visible' && idleFor < IDLE_GRACE_MS) {
        store.addUsage(TICK_SECONDS)
      }
      setPiSover(idleFor >= IDLE_SLEEP_MS)
    }, TICK_SECONDS * 1000)
    return () => window.clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, activeChild?.id])

  useEffect(() => {
    if (activeChild && TIMED_SCREENS.has(screen) && store.secondsLeftToday(activeChild) <= 0) {
      store.go('time-up')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChild, screen])

  if (!loaded) {
    return (
      <div style={{ minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Pi mood="glad" size={90} />
      </div>
    )
  }

  if (showSplash) return <Splash onDone={() => setShowSplash(false)} />

  const content = (() => {
    switch (screen) {
      case 'profiles': return <ProfileSelect />
      case 'home': return <Home />
      case 'session': return <SessionScreen key={activeChild?.id} />
      case 'check': return <BattleScreen kind="check" />
      case 'boss': return <BattleScreen kind="boss" />
      case 'star': return <BattleScreen kind="star" />
      case 'blixt': return <BlixtScreen key={store.blixtKind} />
      case 'diagnosis': return <DiagnosisScreen />
      case 'parent': return <ParentScreen />
      case 'time-up': return <TimeUp />
    }
  })()

  return (
    <>
      {content}
      {piSover && TIMED_SCREENS.has(screen) && (
        <div
          onPointerDown={() => {
            lastActivity.current = Date.now()
            setPiSover(false)
          }}
          style={{
            position: 'fixed', inset: 0, zIndex: 500,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14,
            background: 'rgba(46, 51, 80, 0.55)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
          }}
        >
          <div className="card bounce-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '26px 36px', textAlign: 'center' }}>
            <Pi mood="sover" size={100} />
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>Pi tog en tupplur …</h2>
            <p style={{ margin: 0, color: 'var(--muted)', fontWeight: 700, maxWidth: 300 }}>
              Klockan är pausad — ingen tid har gått medan du var borta. Tryck så fortsätter vi!
            </p>
            <span className="btn btn-primary">Väck Pi ▶</span>
          </div>
        </div>
      )}
    </>
  )
}
