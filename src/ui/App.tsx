import { useEffect } from 'react'
import { Pi } from './components/Pi'
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
const TIMED_SCREENS = new Set(['session', 'boss', 'star', 'blixt', 'diagnosis'])
const TICK_SECONDS = 5

export function App() {
  const store = useStore()
  const { screen, activeChild, loaded } = store

  // Profilfärgen följer barnet genom hela appen.
  useEffect(() => {
    document.documentElement.style.setProperty('--kid', activeChild?.color ?? 'var(--primary)')
  }, [activeChild?.color])

  // Tidsbokföring: tickar bara på träningsskärmar, låser vänligt när tiden är slut.
  useEffect(() => {
    if (!activeChild || !TIMED_SCREENS.has(screen)) return
    const interval = window.setInterval(() => {
      store.addUsage(TICK_SECONDS)
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

  switch (screen) {
    case 'profiles': return <ProfileSelect />
    case 'home': return <Home />
    case 'session': return <SessionScreen key={activeChild?.id} />
    case 'boss': return <BattleScreen kind="boss" />
    case 'star': return <BattleScreen kind="star" />
    case 'blixt': return <BlixtScreen key={store.blixtKind} />
    case 'diagnosis': return <DiagnosisScreen />
    case 'parent': return <ParentScreen />
    case 'time-up': return <TimeUp />
  }
}
