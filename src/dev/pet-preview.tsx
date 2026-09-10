/** Endast Vite-utveckling: fristående visningssida med påhittad profil.
 * Ingår inte i produktionsbygget och använder aldrig barnens riktiga data.
 */
import { createRoot } from 'react-dom/client'
import { useEffect, useState } from 'react'
import { StoreProvider, useStore } from '../ui/store'
import { PetHomeScreen } from '../ui/screens/PetHomeScreen'
import { petDay } from '../engine/pet-home'
import { PET_SPECIES, petSpecies } from '../domain/pet-home'
import type { Household } from '../domain/types'
import '../styles/global.css'

for (const [key, file] of Object.entries({ parchment: 'parchment', wood: 'wood', frame: 'panelframe', stone: 'stone', nodering: 'nodering', plaque: 'plaque' })) {
  document.documentElement.style.setProperty(`--tex-${key}`, `url(${import.meta.env.BASE_URL}art/tex/${file}.webp)`)
}

function Demo() {
  const store = useStore()
  const [pending, setPending] = useState(false)
  const [speciesId, setSpeciesId] = useState('woodland-frog')
  const reset = (kind: 'discovery' | 'home' | 'locked' | 'collection') => {
    const at = new Date()
    const h: Household = {
      schemaVersion: 1, rewards: [], chatLog: [],
      children: [{ id: 'demo-pet', name: 'Testspelare', hero:'bagskytt', color: '#557b45', schoolYear: '2', birthYear: 2018,
        createdAt: at.toISOString(), skills: {}, answers: [], usageSeconds: {}, dailyLimitMinutes: 20,
        diagnosis: { done: true, passesDone: 1, passesTotal: 1, probes: [] }, chatEnabled: false, streak: { days: 0, lastActiveDate: '' },
        ...(kind === 'locked' ? {} : { petProgress: { coins: kind === 'collection' ? 200 : kind === 'home' ? 80 : 20, lastPracticeDay: petDay(at), encounterSpecies: speciesId,
          ...(kind === 'collection' ? { pets:PET_SPECIES.map((s,i)=>({id:`demo-${s.id}`,name:s.defaultName,species:s.id,foundAt:at.toISOString(),bedPoint:`bed-${i+1}`})) } : {}),
          ...(kind === 'home' ? { pet: { name: petSpecies(speciesId).defaultName, species: speciesId, foundAt: at.toISOString() } } : {}),
        } }),
      }],
    }
    if(kind==='collection') h.petHome={owned:{},equipped:{},items:[
      {id:'demo-bed1',itemId:'fern-bed',point:'bed-1',childId:'demo-pet',boughtAt:at.toISOString()},
      {id:'demo-bed2',itemId:'moon-bed',point:'bed-2',childId:'demo-pet',boughtAt:at.toISOString()},
      {id:'demo-light',itemId:'camp-lantern',point:'light-1',childId:'demo-pet',boughtAt:at.toISOString()},
    ]}
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
    <div style={{ padding: '8px 16px', background: '#e8ddc4', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', fontSize: 12, color: '#372f49' }}>
      <strong>TESTVERSION · påhittad profil</strong>
      <label>Prova djur: <select aria-label="Prova husdjur" value={speciesId} onChange={(e) => setSpeciesId(e.target.value)} style={{ font: 'inherit', padding: 10, borderRadius: 8, maxWidth: '100%' }}>{PET_SPECIES.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.world}</option>)}</select></label>
      <button className="chip" disabled={!store.loaded} onClick={() => reset('discovery')}>Första upptäckten</button>
      <button className="chip" disabled={!store.loaded} onClick={() => reset('home')}>Prova lägret (80 testmynt)</button>
      <button className="chip" disabled={!store.loaded} onClick={() => reset('collection')}>Fyra vänner & 200 testmynt</button>
      <button className="chip" disabled={!store.loaded} onClick={() => reset('locked')}>Före dagens pass</button>
    </div>
    <div style={{ flex: 1, minHeight: 0 }}>
      {store.activeChild?.id === 'demo-pet' && store.screen === 'pet-home' ? <PetHomeScreen key={store.household.children[0]?.petProgress?.pet?.foundAt ?? String(pending)} /> : <div className="camp-demo-start"><h1 className="display">Kvällslägret väntar</h1><p>Välj ett husdjur ovan. Upptäck din nya vän i det vilda, eller prova lägret med 80 testmynt.</p><button className="btn btn-primary" disabled={!store.loaded} onClick={() => reset('home')}>Besök lägret</button></div>}
    </div>
  </div>
}

// Egen databas på förhandsvisningssidan, även om vanlig app öppnas på samma origin.
if (import.meta.env.DEV) createRoot(document.getElementById('root')!).render(<StoreProvider storageScope="pet-preview"><Demo /></StoreProvider>)



