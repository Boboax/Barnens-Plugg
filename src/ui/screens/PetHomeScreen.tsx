import { useEffect, useState, type CSSProperties } from 'react'
import { FURNITURE, DAILY_PET_COINS, type Furniture, type FurnitureSlot } from '../../domain/pet-home'
import { homeSecondsLeft, petDay } from '../../engine/pet-home'
import { speak, stopSpeaking } from '../../tts'
import { useStore } from '../store'
import { useDocumentBackground } from '../useDocumentBackground'
import { Icon } from '../components/Icon'
import '../../styles/pet-home.css'

const art = (name: string) => `${import.meta.env.BASE_URL}art/${name}.webp`
const SLOT_NAMES: Record<FurnitureSlot, string> = { bed: 'Sovplats', rug: 'Matta', shelf: 'Hylla', toy: 'Lekhörna' }

export function PetHomeScreen() {
  const store = useStore()
  const child = store.activeChild
  const progress = child?.petProgress
  const [encounter, setEncounter] = useState(false)
  const [name, setName] = useState('')
  const [selected, setSelected] = useState<Furniture | null>(null)
  const [tab, setTab] = useState<'shop' | 'owned'>('shop')
  const [message, setMessage] = useState('')
  const [petHappy, setPetHappy] = useState(false)
  const [clock, setClock] = useState(() => new Date())
  useDocumentBackground('#241c24')
  const left = child ? homeSecondsLeft(store.household, child.id, clock) : 0
  const ready = progress?.lastPracticeDay === petDay(clock)

  // Egen liten besökstid; bakgrundsflikar räknas inte. Sparas över återbesök.
  useEffect(() => {
    const timer = window.setInterval(() => {
      setClock(new Date())
      if (document.visibilityState === 'visible') store.spendHomeTime(1)
    }, 1000)
    return () => { window.clearInterval(timer); stopSpeaking() }
    // Funktionen använder funktionell stateuppdatering; bara spelarbytet byter mål.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [child?.id])
  useEffect(() => {
    if (!petHappy) return
    const timer = window.setTimeout(() => setPetHappy(false), 1000)
    return () => window.clearTimeout(timer)
  }, [petHappy])
  if (!child) return null

  const back = () => store.go(store.secondsLeftToday(child) <= 0 ? 'time-up' : 'home')
  const pet = progress?.pet
  const owned = store.household.petHome?.owned ?? {}
  const equipped = { ...store.household.petHome?.equipped }
  if (selected && left > 0) equipped[selected.slot] = selected.id
  const roomItem = (slot: FurnitureSlot) => FURNITURE.find((f) => f.id === equipped[slot])
  const others = store.household.children.filter((c) => c.id !== child.id && c.petProgress?.pet)
  const story = encounter
    ? 'En liten skogsgroda! Den hoppar fram till dig. Vill du ge den ett namn och visa den stugan?'
    : 'På vägen hem från ditt matteäventyr prasslar det vid en mossig sten. Två små ögon tittar fram …'

  return (
    <main className="pet-page screen-fade">
      <header className="wood-bar pet-topbar">
        <button className="chip" onClick={back}>← Till kartan</button>
        <h1 className="display">Djurens stuga</h1>
        <span className="pet-wallet" aria-label={`${progress?.coins ?? 0} mynt`}><span aria-hidden="true">●</span> {progress?.coins ?? 0} mynt</span>
      </header>

      {!progress || (!pet && !ready) ? (
        <section className="pet-welcome card">
          <Icon name="grodd" size={54} />
          <h2 className="display">Vem bor i skogen?</h2>
          <p>Gör klart ett övningspass. På vägen hem väntar en liten överraskning!</p>
          <p>För dagens första färdiga pass får du {DAILY_PET_COINS} mynt till stugan. Alla försök räknas, även när det blir fel.</p>
          <button className="btn btn-primary" onClick={back}>Till äventyret</button>
        </section>
      ) : !pet ? (
        <section className="pet-discovery" style={{ backgroundImage: `url(${art('world/monsterskogen')})` }}>
          <div className="pet-find-scene" aria-hidden="true">
            <div className="pet-moss-stone" />
            <img className={encounter ? 'pet-found' : 'pet-peeking'} src={art('objekt/groda')} alt="" />
          </div>
          <div className="card pet-story">
            <span className="pet-eyebrow">Dagens äventyr · {DAILY_PET_COINS} mynt intjänade</span>
            <h2 className="display">{encounter ? 'En vän att ta med hem' : 'Det prasslar bland träden …'}</h2>
            <p>{story}</p>
            <button className="chip" onClick={() => speak(story)}><Icon name="ljud" /> Lyssna</button>
            {!encounter ? (
              <button className="btn btn-primary" onClick={() => setEncounter(true)}>Titta bakom stenen</button>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); store.adoptPet(name) }}>
                <label htmlFor="pet-name">Vad heter din groda?</label>
                <input id="pet-name" value={name} maxLength={24} autoComplete="off" placeholder="Skriv ett namn" onChange={(e) => setName(e.target.value)} />
                <button className="btn btn-primary" type="submit" disabled={!name.trim()}>Följ med hem!</button>
              </form>
            )}
            <button className="chip" onClick={back}>Vi ses snart igen</button>
          </div>
        </section>
      ) : (
        <div className="pet-layout">
          <section className="pet-room-panel">
            <div className="pet-room-heading">
              <div><span className="pet-eyebrow">En lugn stund efter äventyret</span><h2 className="display">Välkommen hem, {pet.name}</h2></div>
              <button className="chip" aria-label="Läs om stugan" onClick={() => speak(`${pet.name} är glad att se dig! Här kan du inreda djurens stuga. Dina saker finns alltid kvar.`)}><Icon name="ljud" size={24} /></button>
            </div>
            <div className="pet-room" aria-label={`Stugan. ${FURNITURE.filter((f) => equipped[f.slot] === f.id).map((f) => f.name).join(', ') || 'En mjuk mossbädd väntar på din groda.'}`}>
              <div className="pet-room-wall" />
              <div className="pet-beam pet-beam-left" /><div className="pet-beam pet-beam-right" />
              <div className="pet-window" style={{ backgroundImage: `url(${art('world/monsterskogen')})` }}><span /><span /></div>
              <div className="pet-room-floor" />
              <div className="pet-shelf"><span />{roomItem('shelf') && <img src={art(roomItem('shelf')!.art)} alt={roomItem('shelf')!.name} />}</div>
              <div className="pet-rug" style={{ '--furniture-tone': roomItem('rug')?.tone ?? '#866b57' } as CSSProperties}>
                {roomItem('rug') && <img src={art(roomItem('rug')!.art)} alt={roomItem('rug')!.name} />}
              </div>
              <div className="pet-bed" style={{ '--furniture-tone': roomItem('bed')?.tone ?? '#647852' } as CSSProperties}>
                {roomItem('bed') && <img src={art(roomItem('bed')!.art)} alt={roomItem('bed')!.name} />}
              </div>
              <button disabled={left <= 0} className={`pet-resident ${petHappy ? 'pet-hop' : ''}`} aria-label={`Hälsa på ${pet.name}`} onClick={() => { setPetHappy(true); setMessage(`${pet.name} gör ett glatt litet hopp!`) }}>
                <img src={art('objekt/groda')} alt="" /><span>{pet.name}</span>
              </button>
              <div className="pet-neighbours">{others.map((c) => <span key={c.id} title={c.petProgress!.pet!.name}><img src={art('objekt/groda')} alt={c.petProgress!.pet!.name} /></span>)}</div>
              {roomItem('toy') && <img className="pet-room-toy" src={art(roomItem('toy')!.art)} alt={roomItem('toy')!.name} />}
              <span className="pet-room-label">{selected ? 'Förhandsvisning · inget köpt ännu' : 'Vår lilla skogsstuga'}</span>
            </div>
            <div className="pet-room-footer">
              <p role="status">{left > 0 ? message || `${pet.name} är glad att se dig. Tryck och säg hej!` : ready ? 'Nu vilar stugan. Dina djur och saker finns kvar. Vi ses efter nästa dags pass!' : 'Dina djur mår bra. Efter dagens övningspass kan du inreda igen.'}</p>
              <span>{left > 0 ? `${Math.ceil(left / 60)} min stugtid kvar idag` : 'Dags att vila'}</span>
            </div>
          </section>

          <aside className="pet-shop card" aria-label="Stugans butik">
            <span className="pet-eyebrow">Små skatter för ditt hem</span>
            <h2 className="display">Stugboden</h2>
            <p>{DAILY_PET_COINS} mynt efter dagens första färdiga övningspass. Spara till något du tycker om!</p>
            <div className="pet-tabs" aria-label="Visa saker">
              <button className="chip" aria-pressed={tab === 'shop'} onClick={() => { setTab('shop'); setSelected(null) }}>Butiken</button>
              <button className="chip" aria-pressed={tab === 'owned'} onClick={() => { setTab('owned'); setSelected(null) }}>Våra saker</button>
            </div>
            <div className="pet-products">
              {FURNITURE.filter((f) => tab === 'shop' || owned[f.id]).map((f) => (
                <button key={f.id} disabled={left <= 0} className={`pet-product ${selected?.id === f.id ? 'pet-product-selected' : ''}`} aria-pressed={selected?.id === f.id} onClick={() => setSelected(f)}>
                  <img src={art(f.art)} alt="" /><span>{f.name}</span><small>{owned[f.id] ? store.household.petHome?.equipped[f.slot] === f.id ? 'På plats' : 'Äger redan' : `${f.price} mynt`}</small>
                </button>
              ))}
              {tab === 'owned' && Object.keys(owned).length === 0 && <p className="pet-empty">Här hamnar sakerna ni köper. De finns alltid kvar.</p>}
            </div>
            {selected && left > 0 && <div className="pet-purchase" aria-live="polite">
              <strong>{selected.name}</strong><span>{SLOT_NAMES[selected.slot]} · {selected.description}</span>
              <button className="chip" aria-label={`Läs om ${selected.name}`} onClick={() => speak(`${selected.name}. ${selected.description} ${owned[selected.id] ? 'Den äger ni redan.' : `${selected.price} mynt.`}`)}>Lyssna</button>
              <button className="btn btn-primary" disabled={(!owned[selected.id] && progress.coins < selected.price) || store.household.petHome?.equipped[selected.slot] === selected.id}
                onClick={() => {
                  if (owned[selected.id]) store.equipFurniture(selected.id)
                  else store.buyFurniture(selected.id)
                  setMessage(`${selected.name} har fått en plats i stugan.`)
                  setSelected(null)
                }}>
                {store.household.petHome?.equipped[selected.slot] === selected.id ? 'Redan på plats' : owned[selected.id] ? 'Ställ fram' : progress.coins < selected.price ? `Spara ${selected.price - progress.coins} mynt till` : `Köp & ställ fram · ${selected.price} mynt`}
              </button>
              <button className="chip" onClick={() => setSelected(null)}>Avbryt förhandsvisning</button>
            </div>}
            <p className="pet-small">Saker som byts ut finns kvar i Våra saker. Hemmet delas av spelarna på den här plattan.</p>
          </aside>
        </div>
      )}
    </main>
  )
}
