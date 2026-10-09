import { useEffect, useRef, useState } from 'react'
import type { ChildProfile } from '../../domain/types'
import { DAILY_PET_COINS, petSpecies, type CampPet } from '../../domain/pet-home'
import { catalogItem, type CampCatalogItem } from '../../domain/camp'
import { worldById } from '../../domain/worlds'
import { homeSecondsLeft } from '../../engine/pet-home'
import { speak, stopSpeaking } from '../../tts'
import { useStore } from '../store'
import { useDocumentBackground } from '../useDocumentBackground'
import { CampView } from '../components/camp/CampView'
import { CampShop, type ShopTab } from '../components/camp/CampShop'
import { CampStations, stationName, type StationId } from '../components/camp/CampStations'
import { petStill, worldImage } from '../components/camp/campArt'
import '../../styles/camp.css'

/* ============================================================
   Kvällslägret — en kort stund efter dagens pass.

   Barnet hittar en vän i världen det just tränat i, och kan sedan klappa
   den, klä sin hjälte och ställa fram saker från handelsboden. Lägret är
   rent kosmetiskt (princip 3) och har en egen, kort klocka (3 min/dag)
   som INTE drar av matte-tiden — skärmen står därför inte i TIMED_SCREENS.
   ============================================================ */

type View = 'camp' | 'shop' | StationId

/** Lägertiden sparas i klumpar. Varje sparning skriver hela hushållet till
    IndexedDB och bumpar barnets updatedAt (synkens krockregel), så en
    skrivning per sekund gav 180 skrivningar per besök och lät den platta
    som stod i lägret alltid vinna synken. */
const SAVE_EVERY_SECONDS = 15

/**
 * Räknar lägertid i en ref och sparar var 15:e sekund, när appen göms
 * och när skärmen lämnas. Skärmen ritas om först när den VISADE minuten
 * ändras (eller tiden tar slut) — inte varje sekund, eftersom lägerscenen
 * med eld, eldflugor och animerade djur är tung att rita.
 */
function useCampSeconds(child: ChildProfile): number {
  const { spendHomeTime } = useStore()
  const saved = homeSecondsLeft(child, new Date())
  const savedRef = useRef(saved)
  savedRef.current = saved
  const spendRef = useRef(spendHomeTime)
  spendRef.current = spendHomeTime
  const pending = useRef(0)
  const [left, setLeft] = useState(saved)

  useEffect(() => {
    const flush = (): void => {
      if (pending.current <= 0) return
      spendRef.current(pending.current)
      // Det sparade värdet når savedRef vid nästa rendering; tills dess
      // räknar vi av från det vi vet så att nedräkningen inte hoppar.
      savedRef.current -= pending.current
      pending.current = 0
    }
    const tick = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      if (savedRef.current - pending.current <= 0) return
      pending.current += 1
      const remaining = Math.max(0, savedRef.current - pending.current)
      // Tiden slut → spara direkt, så att motorn också nekar ändringar.
      if (pending.current >= SAVE_EVERY_SECONDS || remaining === 0) flush()
      setLeft((prev) => (remaining > 0 && Math.ceil(prev / 60) === Math.ceil(remaining / 60) ? prev : remaining))
    }, 1000)
    const onHide = (): void => { if (document.visibilityState === 'hidden') flush() }
    document.addEventListener('visibilitychange', onHide)
    return () => {
      window.clearInterval(tick)
      document.removeEventListener('visibilitychange', onHide)
      flush()
    }
  }, [])

  return left
}

export function PetHomeScreen() {
  const store = useStore()
  const child = store.activeChild
  useDocumentBackground('#121c27') // iPad-remsan följer lägrets nattkant
  useEffect(() => () => stopSpeaking(), [])
  if (!child) return null
  return <Camp child={child} />
}

function Camp({ child }: { child: ChildProfile }) {
  const store = useStore()
  const left = useCampSeconds(child)
  const canInteract = left > 0
  const { pets, coins, encounter } = child.petProgress

  const [view, setView] = useState<View>('camp')
  const [moving, setMoving] = useState(true)
  const [finding, setFinding] = useState(false)
  const [shopTab, setShopTab] = useState<ShopTab>('shop')
  const [selectedId, setSelectedId] = useState('')
  const [placingId, setPlacingId] = useState('')
  const [greetingPetId, setGreetingPetId] = useState('')
  const [message, setMessage] = useState('')
  const heading = useRef<HTMLHeadingElement>(null)

  // Ny vy → fokus på rubriken (skärmläsare och tangentbord hamnar rätt).
  useEffect(() => { heading.current?.focus() }, [view])
  useEffect(() => {
    if (!greetingPetId) return
    const t = window.setTimeout(() => setGreetingPetId(''), 2300)
    return () => window.clearTimeout(t)
  }, [greetingPetId])

  const leave = (): void => store.go(store.secondsLeftToday(child) <= 0 ? 'time-up' : 'home')
  const open = (next: View): void => {
    setView(next)
    setPlacingId('')
    setSelectedId('')
    setFinding(false)
  }
  const back = (): void => {
    if (finding) setFinding(false)
    else if (view !== 'camp') open('camp')
    else leave()
  }

  // Första vännen visas direkt; en senare upptäckt väntar på barnets tryck.
  const discovering = encounter !== undefined && (pets.length === 0 || finding)
  const preview = view === 'shop' && shopTab === 'shop' ? catalogItem(selectedId) : undefined

  const startPlacing = (instanceId: string): void => {
    setPlacingId(instanceId)
    if (instanceId) {
      setView('shop')
      setShopTab('packing')
      setSelectedId('')
      setMessage('Välj en markerad plats i lägret.')
    }
  }
  const place = (point?: string): void => {
    const instance = child.petProgress.items.find((i) => i.id === placingId)
    const item = instance && catalogItem(instance.itemId)
    store.changeCamp({ type: 'place', instanceId: placingId, point })
    setPlacingId('')
    if (item) setMessage(point ? `${item.name} står nu på sin nya plats.` : `${item.name} ligger nu i packningen.`)
  }
  const buy = (item: CampCatalogItem): void => {
    // Nytt köp-id per tryck — samma id två gånger dras aldrig (engine/camp).
    store.changeCamp({ type: 'buy', itemId: item.id, purchaseId: crypto.randomUUID() })
    setSelectedId('')
    if (item.kind === 'tent') {
      setMessage('Tältet står vid elden! Tryck på det för att gå in.')
    } else {
      setShopTab('packing')
      setMessage(`${item.name} finns i packningen. Ställ fram den när du vill.`)
    }
  }
  const greet = (pet: CampPet): void => {
    setGreetingPetId(pet.id)
    setMessage(pet.care?.resting ? `${pet.name} sover tryggt.` : `${pet.name} blir glad att se dig!`)
  }

  const showWorkspace = !discovering && pets.length > 0
  return (
    <main className={`camp-page screen-fade ${moving ? '' : 'camp-still'}`}>
      <header className="wood-bar camp-topbar">
        <button className="chip" onClick={back}>← {view === 'camp' && !finding ? 'Till kartan' : 'Till lägret'}</button>
        <h1 className="display">Kvällslägret</h1>
        <button className="chip camp-motion-toggle" aria-pressed={!moving} onClick={() => setMoving(!moving)}>
          {moving ? 'Pausa rörelser' : 'Starta rörelser'}
        </button>
        <span className="camp-wallet" aria-label={`${coins} mynt`}>● {coins} mynt</span>
      </header>

      {discovering && encounter ? (
        <Discovery
          key={encounter.species}
          speciesId={encounter.species}
          worldId={encounter.worldId}
          onAdopt={(name) => { store.adoptPet(name); setFinding(false) }}
          onLater={back}
        />
      ) : !showWorkspace ? (
        <section className="camp-welcome card">
          <h2 className="display">Vem väntar på dig?</h2>
          <p>Gör klart ett övningspass. På vägen tillbaka kan du hitta en vän i världen du besökt.</p>
          <p>Dagens första färdiga pass ger {DAILY_PET_COINS} mynt till lägret.</p>
          <button className="btn btn-primary" onClick={leave}>Till äventyret</button>
        </section>
      ) : (
        <div className="camp-workspace">
          <nav className="camp-navigation" aria-label="Platser i lägret">
            <button className="chip" aria-current={view === 'camp' ? 'page' : undefined} onClick={() => open('camp')}>Vid elden</button>
            {(['friends', 'wardrobe', 'books'] as const).map((id) => (
              <button key={id} className="chip" aria-current={view === id ? 'page' : undefined} onClick={() => open(id)}>
                {stationName(id, child)}
              </button>
            ))}
            <button className="chip" aria-current={view === 'shop' ? 'page' : undefined} onClick={() => open('shop')}>Handelsboden</button>
          </nav>
          <h2 className="display camp-view-heading" tabIndex={-1} ref={heading}>
            {view === 'camp' ? 'En stund tillsammans' : view === 'shop' ? 'Handelsboden' : stationName(view, child)}
          </h2>
          {encounter && (
            <button className="camp-discovery-call" onClick={() => setFinding(true)}>
              Någon följde dina fotspår … Upptäck en ny vän
            </button>
          )}

          {(view === 'camp' || view === 'shop') && (
            <CampView
              child={child}
              canInteract={canInteract}
              placingId={placingId}
              preview={preview}
              greetingPetId={greetingPetId}
              onGreet={greet}
              onOpenFriends={() => open('friends')}
              onOpenWardrobe={() => open('wardrobe')}
              onStartPlacing={startPlacing}
              onPlace={place}
              onMessage={setMessage}
            />
          )}
          {view === 'shop' && (
            <CampShop
              child={child}
              canInteract={canInteract}
              tab={shopTab}
              onTab={(tab) => { setShopTab(tab); setSelectedId(''); setPlacingId('') }}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onBuy={buy}
              onStartPlacing={startPlacing}
            />
          )}
          {view !== 'camp' && view !== 'shop' && (
            <CampStations
              key={view}
              station={view}
              child={child}
              canInteract={canInteract}
              onChange={store.changeCamp}
              onMessage={setMessage}
              onPacking={() => { open('shop'); setShopTab('packing') }}
            />
          )}

          <footer className="camp-footer">
            <p role="status">{message || 'Vännerna har det bra här. Dina saker finns alltid kvar.'}</p>
            <span>{canInteract
              ? `${Math.ceil(left / 60)} min lägertid kvar idag`
              : 'Lägret vilar. Titta gärna runt — efter nästa dags pass kan du göra mer.'}</span>
          </footer>
        </div>
      )}
    </main>
  )
}

/** Upptäckten: något prasslar bakom en mossig sten i världen barnet just
    tränade i. Berättelsens "från" är barnets egen väg, inte artens. */
function Discovery({ speciesId, worldId, onAdopt, onLater }: {
  speciesId: CampPet['species']
  worldId: string
  onAdopt(name: string): void
  onLater(): void
}) {
  const [revealed, setRevealed] = useState(false)
  const [name, setName] = useState('')
  const species = petSpecies(speciesId)
  const world = worldById(worldId)
  const story = revealed
    ? `En ${species.name.toLowerCase()} från ${world.name}! Vill du ge din nya vän ett namn?`
    : `På vägen tillbaka från ${world.name} hör du något bakom en sten …`

  return (
    <section className="camp-discovery" style={{ backgroundImage: `url(${worldImage(world.id)})` }}>
      <div className="camp-find-scene" aria-hidden="true">
        <div className="camp-moss-stone" />
        <img className={revealed ? 'camp-found' : 'camp-peeking'} src={petStill(species.id)} alt="" />
      </div>
      <div className="camp-story">
        <span className="camp-eyebrow">En ny vän från {world.name}</span>
        <h2 className="display">{revealed ? 'Vill du följa med?' : 'Vem gömmer sig där?'}</h2>
        <p>{story}</p>
        <button className="chip" onClick={() => speak(story)}>Lyssna</button>
        {!revealed ? (
          <button className="btn btn-primary" onClick={() => setRevealed(true)}>Titta bakom stenen</button>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); onAdopt(name) }}>
            <label htmlFor="pet-name">Vad heter din nya vän?</label>
            <input
              id="pet-name"
              value={name}
              maxLength={24}
              placeholder={`Till exempel ${species.defaultName}`}
              autoComplete="off"
              onChange={(e) => setName(e.target.value)}
            />
            <button className="btn btn-primary" disabled={!name.trim()}>Följ med till lägret!</button>
          </form>
        )}
        <button className="chip" onClick={onLater}>Vi ses snart igen</button>
      </div>
    </section>
  )
}
