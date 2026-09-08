/** Endast Vite-utveckling: fristående visningssida med påhittad profil.
 * Ingår inte i produktionsbygget och använder aldrig barnens riktiga data.
 */
import { createRoot } from 'react-dom/client'
import { useEffect, useState } from 'react'
import { StoreProvider, useStore } from '../ui/store'
import { PetHomeScreen } from '../ui/screens/PetHomeScreen'
import { petDay } from '../engine/pet-home'
import type { Household } from '../domain/types'
import '../styles/global.css'

for (const [key, file] of Object.entries({ parchment: 'parchment', wood: 'wood', frame: 'panelframe', stone: 'stone', nodering: 'nodering', plaque: 'plaque' })) {
  document.documentElement.style.setProperty(`--tex-${key}`, `url(${import.meta.env.BASE_URL}art/tex/${file}.webp)`)
}

function Demo() {
  const store = useStore()
  const [pending, setPending] = useState(false)
  const reset = (kind: 'discovery' | 'home' | 'locked') => {
    const at = new Date()
    const h: Household = {
      schemaVersion: 1, rewards: [], chatLog: [],
      children: [{ id: 'demo-pet', name: 'Testspelare', color: '#557b45', schoolYear: '2', birthYear: 2018,
        createdAt: at.toISOString(), skills: {}, answers: [], usageSeconds: {}, dailyLimitMinutes: 20,
        diagnosis: { done: true, passesDone: 1, passesTotal: 1, probes: [] }, chatEnabled: false, streak: { days: 0, lastActiveDate: '' },
        ...(kind === 'locked' ? {} : { petProgress: { coins: kind === 'home' ? 80 : 20, lastPracticeDay: petDay(at),
          ...(kind === 'home' ? { pet: { name: 'Mossa', foundAt: at.toISOString() } } : {}),
        } }),
      }],
    }
    store.replaceHousehold(h)
    setPending(true)
  }
  useEffect(() => {
    if (pending && store.household.children.some((c) => c.id === 'demo-pet')) {
      store.selectChild('demo-pet')
      store.go('pet-home')
      setPending(false)
    }
  }, [pending, store])
  return <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
    <div style={{ padding: '8px 16px', background: '#ece6f6', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', fontSize: 12, color: '#372f49' }}>
      <strong>TESTVERSION · påhittad profil</strong>
      <button className="chip" disabled={!store.loaded} onClick={() => reset('discovery')}>Första upptäckten</button>
      <button className="chip" disabled={!store.loaded} onClick={() => reset('home')}>Prova stugan (80 testmynt)</button>
      <button className="chip" disabled={!store.loaded} onClick={() => reset('locked')}>Före dagens pass</button>
    </div>
    <div style={{ flex: 1, minHeight: 0 }}>
      {store.activeChild?.id === 'demo-pet' && store.screen === 'pet-home' ? <PetHomeScreen key={store.household.children[0]?.petProgress?.pet?.foundAt ?? String(pending)} /> : <p style={{ padding: 24 }}>Välj Första upptäckten eller Prova stugan ovan. Till kartan avslutar den här förhandsvisningen.</p>}
    </div>
  </div>
}

// Egen databas på förhandsvisningssidan, även om vanlig app öppnas på samma origin.
if (import.meta.env.DEV) createRoot(document.getElementById('root')!).render(<StoreProvider storageScope="pet-preview"><Demo /></StoreProvider>)
