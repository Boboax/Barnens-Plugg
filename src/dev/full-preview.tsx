/** Separat fullappsprov: samma App/BattleScreen, men enbart testhushåll. */
import { createRoot } from 'react-dom/client'
import { useEffect, useState } from 'react'
import type { HeroKind, Household } from '../domain/types'
import { MOMENTS } from '../domain/curriculum'
import { newSkillState, recomputeAvailability, grantedYears } from '../engine/progress'
import { blixtBlockedMoments } from '../engine/blixt'
import { App } from '../ui/App'
import { StoreProvider, useStore } from '../ui/store'
import { eligibleChestGifts, WORLD_GIFTS, type WorldGift } from '../domain/world-gifts'
import { campPets, petSpecies } from '../domain/pet-home'
import { WorldGiftChest } from '../ui/components/WorldGiftChest'
import '../styles/global.css'

const STORAGE_SCOPE = 'fullapp-character-preview-v1'
const DEMO_ID = 'fullapp-character-demo'
const heroes: Array<{ id: HeroKind; name: string }> = [
  { id: 'bagskytt', name: 'Bågskytten' },
  { id: 'riddare', name: 'Riddaren' },
  { id: 'trollkarl', name: 'Trollkarlen' },
]

for (const [key, file] of Object.entries({ parchment: 'parchment', wood: 'wood', frame: 'panelframe', stone: 'stone', nodering: 'nodering', plaque: 'plaque' })) {
  document.documentElement.style.setProperty(`--tex-${key}`, `url(${import.meta.env.BASE_URL}art/tex/${file}.webp)`)
}

function testHousehold(hero: HeroKind = 'bagskytt'): Household {
  const at = new Date().toISOString()
  const child = {
    id: DEMO_ID, name: 'Testhjälten', hero, color: '#4A56C6', schoolYear: '4' as const, birthYear: 2016,
    createdAt: at, updatedAt: at, answers: [], usageSeconds: {}, dailyLimitMinutes: 60, chatEnabled: false,
    diagnosis: { done: true, passesDone: 1, passesTotal: 1, probes: [] }, streak: { days: 0, lastActiveDate: '' },
    petProgress: {
      coins: 100, lastPracticeDay: at.slice(0, 10),
      pets: [{ id: 'preview-pet', name: 'Mossa', foundAt: at, species: 'woodland-frog', bedPoint: 'bed-1' }],
    },
    skills: Object.fromEntries(MOMENTS.map((moment) => [moment.id, newSkillState(moment.id)])),
  }
  child.skills = recomputeAvailability(child.skills, grantedYears(child), blixtBlockedMoments({ blixt: undefined }))
  return { schemaVersion: 1, children: [child], rewards: [], chatLog: [] }
}

function PreviewHarness() {
  const store = useStore()
  const [ready, setReady] = useState(false)
  const [giftPreview, setGiftPreview] = useState<WorldGift>()
  const child = store.household.children.find((item) => item.id === DEMO_ID)

  useEffect(() => {
    if (!store.loaded || ready) return
    if (!child) store.replaceHousehold(testHousehold())
    else {
      store.selectChild(DEMO_ID)
      store.startWorldBoss('sambandsgrottan')
      setReady(true)
    }
  }, [child, ready, store])

  const reset = () => {
    store.replaceHousehold(testHousehold())
    setGiftPreview(undefined)
    setReady(false)
  }
  const openGiftPreview = () => {
    if (!child) return
    const petWorldIds = campPets(child.petProgress).map((pet) => petSpecies(pet.species).worldId)
    const available = eligibleChestGifts('monsterskogen', child.worldGifts, petWorldIds)
    const gift = available[Math.floor(Math.random() * available.length)]
    if (!gift) return
    store.claimWorldGift(gift.id)
    setGiftPreview(gift)
  }
  const unlockWeaponPreview = () => {
    if (!child) return
    store.replaceHousehold({ ...store.household, children: store.household.children.map((profile) => profile.id === child.id ? {
      ...profile,
      conqueredWorlds: Array.from(new Set([...(profile.conqueredWorlds ?? []), 'monsterskogen'])),
      petProgress: { ...profile.petProgress!, coins: Math.max(profile.petProgress?.coins ?? 0, 300) },
    } : profile) })
    store.selectChild(child.id)
    store.go('pet-home')
  }

  return <>
    <App skipSplash disableAudio />
    <nav aria-label="Testgenvägar" style={{ position: 'fixed', zIndex: 900, top: 8, left: 8, right: 8, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', padding: '7px 10px', background: 'rgba(255,247,225,.94)', border: '2px solid #6E5426', borderRadius: 12, fontSize: 12 }}>
      <strong>TESTPROFIL · separat lagring · {__APP_VERSION__}</strong>
      {heroes.map((item) => <button key={item.id} className="chip" disabled={!child} aria-pressed={child?.hero === item.id} onClick={() => child && store.updateChild(child.id, { hero: item.id })}>{item.name}</button>)}
      <button className="chip" disabled={!child} onClick={() => store.go('pet-home')}>Kvällslägret</button>
      <button className="chip" disabled={!child} onClick={unlockWeaponPreview}>Lås upp vapenprov</button>
      <button className="chip" disabled={!child} onClick={() => store.startWorldBoss('sambandsgrottan')}>Bossfight · Procentspöket</button>
      <button className="chip" disabled={!child} onClick={() => store.startWorldBoss('sambandsgrottan')}>Börja om bossfight</button>
      <button className="chip" disabled={!child} onClick={openGiftPreview}>Prova skattkista</button>
      <button className="chip" disabled={!child} onClick={() => WORLD_GIFTS.forEach((gift) => store.claimWorldGift(gift.id))}>Fyll provsamling</button>
      <button className="chip" disabled={!store.loaded} onClick={reset}>Återställ testprofil</button>
    </nav>
    {giftPreview && (
      <div style={{ position: 'fixed', inset: 0, zIndex: 1000 }}>
        <WorldGiftChest
          gifts={[giftPreview]}
          title="Prov: slumpad världsgåva"
          subtitle="Kistan valde gåvan åt dig och sparade den direkt."
          onChoose={() => setGiftPreview(undefined)}
        />
      </div>
    )}
  </>
}

createRoot(document.getElementById('root')!).render(<StoreProvider storageScope={STORAGE_SCOPE}><PreviewHarness /></StoreProvider>)
