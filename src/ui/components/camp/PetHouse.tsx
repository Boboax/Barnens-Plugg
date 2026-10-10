import { useEffect, useRef, useState } from 'react'
import type { CampItemInstance, CampPet, PetCareActivity } from '../../../domain/pet-home'
import { petSpecies } from '../../../domain/pet-home'
import { catalogItem } from '../../../domain/camp'
import { worldById } from '../../../domain/worlds'
import { PetSounds } from '../../pet-sounds'
import { PetSprite } from './PetSprite'
import { campImage, itemImage } from './campArt'
import { DEN_ART_READY, DenScene } from './DenScene'
import { TreatBowl } from './TreatBowl'

/* Lyan som lekscen: EN skärm utan scroll, med vännen stor mitt i rummet och
   allt man kan göra som saker i rummet — inte knappar i en panel under.
   (Förr låg rummet överst och knapparna under, så på iPaden såg barnet
   antingen djuret eller knapparna; förälderns test okt 2026.)

   Man rör vid vännen direkt: tryck = en reaktion, stryk med fingret = klapp
   med hjärtan där fingret är. Godbiten dras ur skålen, bollen kastas och
   hämtas, tittut är ett riktigt gömleksspel, lyktan släcker för natten.
   Allt är gratis och inget kan gå förlorat — inga behov, inga mätare som
   sjunker (princip 3). Bara lägertiden (canInteract) grindar verktygen. */

/** Vännens sovplatser i tältet, i samma ordning som bäddplatserna bed-1..4. */
const CORNERS = [
  { x: 32, y: 52, name: 'Bakre vänstra hörnet' },
  { x: 69, y: 52, name: 'Bakre högra hörnet' },
  { x: 25, y: 78, name: 'Främre vänstra hörnet' },
  { x: 75, y: 78, name: 'Främre högra hörnet' },
]
/** Lyans målade mossbäddar ligger på andra ställen än tältets hörnor. */
const DEN_SPOTS = [{ x: 37, y: 47 }, { x: 71, y: 46 }, { x: 24, y: 70 }, { x: 75, y: 70 }]
const cornerIndex = (pet: CampPet, fallback: number): number => {
  const i = Number(pet.bedPoint?.replace('bed-', '')) - 1
  return i >= 0 && i < CORNERS.length ? i : fallback
}

/** Vännens plats mitt i rummet (fötterna), i procent av scenen. */
const HOME = { x: 50, y: 82 }
/** Vännen är 40 % av scenens höjd — hjärtan stiger från huvudet. */
const PET_HEIGHT = 40
/** Bollens viloplats i rummets nederkant. */
const BALL_HOME = { x: 36, y: 93 }
/** Tittutens tre gömställen. Ritas i appen tills målade bilder finns. */
const HIDING_SPOTS = [
  { x: 17, y: 66, emoji: '🍄', name: 'svampen' },
  { x: 50, y: 60, emoji: '🌿', name: 'busken' },
  { x: 83, y: 66, emoji: '🪵', name: 'stocken' },
]

type Reaction = 'hop' | 'spin' | 'wiggle' | 'giggle' | 'purr' | 'chew' | 'stretch' | 'run'
type Mode = 'free' | 'fetch' | 'peek'

const TAP_REACTIONS: { kind: Reaction; line: (n: string) => string }[] = [
  { kind: 'hop', line: (n) => `${n} gör en glad hoppsa!` },
  { kind: 'spin', line: (n) => `${n} snurrar runt av glädje!` },
  { kind: 'wiggle', line: (n) => `${n} vickar på hela kroppen.` },
  { kind: 'giggle', line: (n) => `Hihi! ${n} är kittlig.` },
]
const PURR_LINES = [
  (n: string) => `${n} blundar och njuter av din klapp.`,
  (n: string) => `${n} lutar sig mot din hand. Ni är bästa vänner.`,
  (n: string) => `${n} kurrar nöjt.`,
]
const FEED_LINES = [
  (n: string) => `Mums! ${n} smaskar glatt.`,
  (n: string) => `${n} slickar sig om munnen. Mer?`,
  (n: string) => `${n} sparar en smula till senare.`,
]
// UI-slump (vilken reaktion, var bollen landar) — påverkar aldrig motorn.
const pick = <T,>(list: T[]): T => list[Math.floor(Math.random() * list.length)]

const MUTE_KEY = 'pet-sounds-muted'
const readMuted = (): boolean => {
  try { return localStorage.getItem(MUTE_KEY) === 'true' } catch { return false }
}

const daysBetween = (fromIso: string, to: Date): number =>
  Math.max(1, Math.floor((to.getTime() - new Date(fromIso).getTime()) / 86_400_000) + 1)
const whenText = (iso: string | undefined, now: Date): string | undefined => {
  if (!iso) return undefined
  const days = Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000)
  return days <= 0 ? 'idag' : days === 1 ? 'igår' : `för ${days} dagar sedan`
}

interface Props {
  pets: CampPet[]
  items: CampItemInstance[]
  hasTent: boolean
  /** Namnet på en leksak barnet äger — nämns i minnesboken. */
  toyName?: string
  canInteract: boolean
  onCare(petId: string, activity: PetCareActivity): void
  onRename(petId: string, name: string): void
  onBed(petId: string, point: string): void
  onPacking(): void
}

export function PetHouse({ pets, items, hasTent, toyName, canInteract, onCare, onRename, onBed, onPacking }: Props) {
  const [selectedId, setSelectedId] = useState(pets[0]?.id)
  const [mode, setMode] = useState<Mode>('free')
  const [reaction, setReaction] = useState<{ kind: Reaction; key: number } | null>(null)
  const [bubble, setBubble] = useState('')
  const [hearts, setHearts] = useState<{ id: number; x: number; y: number }[]>([])
  const [mums, setMums] = useState(0)
  const [petPos, setPetPos] = useState(HOME)
  const [lean, setLean] = useState(0)
  const [ball, setBall] = useState<{ x: number; y: number; phase: 'home' | 'drag' | 'fly' | 'carried' | 'return' }>(
    { ...BALL_HOME, phase: 'home' })
  const [peek, setPeek] = useState<{ spot: number; wrong: number[]; found: boolean } | null>(null)
  const [bookOpen, setBookOpen] = useState(false)
  const [muted, setMuted] = useState(readMuted)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')

  const sceneRef = useRef<HTMLDivElement>(null)
  const petRef = useRef<HTMLDivElement>(null)
  const sounds = useRef<PetSounds | null>(null)
  const timers = useRef<number[]>([])
  const heartId = useRef(0)
  const lastPetCare = useRef(0)
  const stroke = useRef<{ x: number; y: number; dist: number; lastHeart: number; counted: boolean; id: number } | null>(null)
  const throwing = useRef<{ id: number; samples: { x: number; y: number; t: number }[]; moved: number } | null>(null)

  const later = (fn: () => void, ms: number): void => { timers.current.push(window.setTimeout(fn, ms)) }

  // Tysta lätena när appen göms; städa timers och ljud när stationen stängs.
  useEffect(() => {
    const quiet = (): void => { if (document.hidden) sounds.current?.stop() }
    document.addEventListener('visibilitychange', quiet)
    return () => {
      document.removeEventListener('visibilitychange', quiet)
      timers.current.forEach((t) => window.clearTimeout(t))
      sounds.current?.dispose()
      sounds.current = null
    }
  }, [])

  const pet = pets.find((p) => p.id === selectedId) ?? pets[0]
  const resting = pet?.care?.resting ?? false
  const free = mode === 'free'

  // Vännen lever även när barnet inte gör något: kliar sig, sträcker på sig.
  useEffect(() => {
    if (!pet || resting || !free) return
    const t = window.setInterval(() => {
      setReaction((cur) => cur ?? { kind: Math.random() < 0.5 ? 'stretch' : 'wiggle', key: Date.now() })
    }, 7000)
    return () => window.clearInterval(t)
  }, [pet, resting, free])

  // En reaktion är en kort animation; nästa kan börja när den är klar.
  useEffect(() => {
    if (!reaction) return
    const t = window.setTimeout(() => setReaction(null), reaction.kind === 'chew' ? 1400 : 1000)
    return () => window.clearTimeout(t)
  }, [reaction])

  if (!pet) return null

  const say = (text: string): void => setBubble(text)
  // Ny reaktion: töm klassen en bildruta först så att samma animation kan
  // starta om. (En ny React-nyckel på kroppen lämnade ibland kvar den gamla
  // noden — två vänner syntes samtidigt.)
  const react = (kind: Reaction): void => {
    setReaction(null)
    requestAnimationFrame(() => setReaction({ kind, key: Date.now() }))
  }
  const sound = (): void => {
    if (muted) return
    sounds.current ??= new PetSounds()
    sounds.current.play(pet.species)
  }
  /** Spara omsorgen i barnets läger. Klapp sparas högst var 1,5 s — ett
      strykande finger ska inte bli tjugo sparningar (och synkrundor). */
  const care = (activity: PetCareActivity): void => {
    if (!canInteract) return
    if (activity === 'pet') {
      if (Date.now() - lastPetCare.current < 1500) return
      lastPetCare.current = Date.now()
    }
    onCare(pet.id, activity)
  }

  /** Klientkoordinater → procent av scenen. */
  const toScene = (clientX: number, clientY: number): { x: number; y: number } => {
    const r = sceneRef.current?.getBoundingClientRect()
    if (!r) return { x: 50, y: 50 }
    return { x: ((clientX - r.left) / r.width) * 100, y: ((clientY - r.top) / r.height) * 100 }
  }
  const addHeart = (x: number, y: number): void => {
    const id = ++heartId.current
    setHearts((h) => [...h.slice(-14), { id, x, y }])
    later(() => setHearts((h) => h.filter((v) => v.id !== id)), 1300)
  }
  const heartBurst = (at = petPos): void => {
    for (let i = 0; i < 5; i++) later(() => addHeart(at.x - 8 + Math.random() * 16, at.y - PET_HEIGHT * 0.7), i * 110)
  }

  /* ---------- Röra vid vännen: tryck och stryk ---------- */

  const onPetDown = (e: React.PointerEvent<HTMLDivElement>): void => {
    if (!free) return
    e.currentTarget.setPointerCapture(e.pointerId)
    stroke.current = { x: e.clientX, y: e.clientY, dist: 0, lastHeart: 0, counted: false, id: e.pointerId }
  }
  const onPetMove = (e: React.PointerEvent<HTMLDivElement>): void => {
    const s = stroke.current
    if (!s || s.id !== e.pointerId || resting) return
    s.dist += Math.hypot(e.clientX - s.x, e.clientY - s.y)
    s.x = e.clientX
    s.y = e.clientY
    if (s.dist - s.lastHeart > 45) {
      s.lastHeart = s.dist
      const p = toScene(e.clientX, e.clientY)
      addHeart(p.x, p.y)
    }
    // Ett riktigt drag med fingret (inte ett darr) blir ett klapp.
    if (!s.counted && s.dist > 160) {
      s.counted = true
      react('purr')
      say(pick(PURR_LINES)(pet.name))
      sound()
      care('pet')
    }
  }
  const onPetUp = (e: React.PointerEvent<HTMLDivElement>): void => {
    const s = stroke.current
    if (!s || s.id !== e.pointerId) return
    stroke.current = null
    if (s.dist > 10) return
    if (resting) { say(`Shh … ${pet.name} sover. Tryck på lyktan för att väcka.`); return }
    const r = pick(TAP_REACTIONS)
    react(r.kind)
    say(canInteract ? r.line(pet.name) : `${pet.name} vinkar. Efter nästa pass kan ni leka mer!`)
    if (canInteract) { sound(); heartBurst(); care('pet') }
  }

  /* ---------- Godbiten ---------- */

  const feed = (): void => {
    care('feed')
    react('chew')
    setMums(Date.now())
    say(pick(FEED_LINES)(pet.name))
    sound()
  }

  /* ---------- Bollen: dra och släpp, vännen hämtar ---------- */

  const ballReady = canInteract && free && !resting && ball.phase === 'home'
  const onBallDown = (e: React.PointerEvent<HTMLButtonElement>): void => {
    if (!ballReady) return
    e.currentTarget.setPointerCapture(e.pointerId)
    throwing.current = { id: e.pointerId, samples: [{ x: e.clientX, y: e.clientY, t: performance.now() }], moved: 0 }
  }
  const onBallMove = (e: React.PointerEvent<HTMLButtonElement>): void => {
    const t = throwing.current
    if (!t || t.id !== e.pointerId) return
    const last = t.samples[t.samples.length - 1]
    t.moved += Math.hypot(e.clientX - last.x, e.clientY - last.y)
    t.samples = [...t.samples.slice(-4), { x: e.clientX, y: e.clientY, t: performance.now() }]
    if (t.moved > 8) setBall({ ...toScene(e.clientX, e.clientY), phase: 'drag' })
  }
  const onBallUp = (e: React.PointerEvent<HTMLButtonElement>): void => {
    const t = throwing.current
    if (!t || t.id !== e.pointerId) return
    throwing.current = null
    let land: { x: number; y: number }
    if (t.moved <= 8) {
      // Ett tryck kastar bollen själv, åt ett slumpat håll.
      land = { x: 20 + Math.random() * 60, y: 70 + Math.random() * 14 }
    } else {
      // Kastets fart avgör hur långt bollen rullar — men den stannar på golvet.
      const a = t.samples[0]
      const b = t.samples[t.samples.length - 1]
      const dt = Math.max(16, b.t - a.t)
      const end = toScene(b.x + ((b.x - a.x) / dt) * 260, b.y + ((b.y - a.y) / dt) * 260)
      land = { x: Math.min(90, Math.max(10, end.x)), y: Math.min(88, Math.max(64, end.y)) }
    }
    fetchBall(land)
  }
  const fetchBall = (land: { x: number; y: number }): void => {
    setMode('fetch')
    setBall({ ...land, phase: 'fly' })
    say(`${pet.name} springer efter bollen!`)
    later(() => { react('run'); setPetPos({ x: land.x, y: Math.min(94, land.y + 4) }) }, 550)
    later(() => { setBall((b) => ({ ...b, phase: 'carried' })); setPetPos(HOME) }, 1450)
    later(() => {
      setBall({ ...BALL_HOME, phase: 'return' })
      react('hop')
      say(`${pet.name} kommer tillbaka med bollen. Igen!`)
      sound()
      heartBurst(HOME)
      care('play')
    }, 2350)
    later(() => { setBall({ ...BALL_HOME, phase: 'home' }); setMode('free') }, 2800)
  }

  /* ---------- Tittut: vännen gömmer sig, barnet letar ---------- */

  const startPeek = (): void => {
    if (!canInteract || !free || resting) return
    const spot = Math.floor(Math.random() * HIDING_SPOTS.length)
    setMode('peek')
    setPeek({ spot, wrong: [], found: false })
    say(`${pet.name} gömmer sig! Var är ${pet.name}?`)
  }
  const guess = (i: number): void => {
    if (!peek || peek.found) return
    if (i !== peek.spot) {
      setPeek({ ...peek, wrong: [...peek.wrong, i] })
      say(pick(['Inte här … kanske där?', 'Hmm, tomt! Leta vidare.', `Där var inte ${pet.name}. Titta noga!`]))
      return
    }
    setPeek({ ...peek, found: true })
    const s = HIDING_SPOTS[i]
    // Vännen hoppar fram FRAMFÖR gömstället (lägre i rummet = närmare barnet).
    const found = { x: s.x, y: Math.min(94, s.y + 14) }
    setPetPos(found)
    react('hop')
    say(`Tittut! Du hittade ${pet.name}!`)
    sound()
    heartBurst(found)
    care('play')
    later(() => { setPetPos(HOME); setPeek(null); setMode('free') }, 1600)
  }
  const stopPeek = (): void => { setPeek(null); setMode('free'); setPetPos(HOME); say('') }

  /* ---------- Lyktan: godnatt och god morgon ---------- */

  const toggleNight = (): void => {
    if (!canInteract || !free) return
    if (resting) {
      onCare(pet.id, 'wake')
      react('stretch')
      say(`${pet.name} vaknar, sträcker på sig och är glad att se dig.`)
      sound()
    } else {
      onCare(pet.id, 'rest')
      sounds.current?.stop()
      say(`Godnatt, ${pet.name}. Sov gott.`)
    }
  }

  const toggleSound = (): void => {
    const next = !muted
    setMuted(next)
    if (next) sounds.current?.stop()
    try { localStorage.setItem(MUTE_KEY, String(next)) } catch { /* frivillig inställning */ }
  }
  const select = (p: CampPet): void => {
    if (!free) return
    setSelectedId(p.id)
    setEditing(false)
    react('hop')
    say(`${p.name} kommer fram till dig!`)
  }

  // Vännen vänder sig lite mot fingret när barnet rör sig i rummet.
  const onSceneMove = (e: React.PointerEvent<HTMLDivElement>): void => {
    if (!free || resting) return
    const p = toScene(e.clientX, e.clientY)
    setLean(Math.max(-1, Math.min(1, (p.x - petPos.x) / 30)))
  }

  const now = new Date()
  const days = daysBetween(pet.foundAt, now)
  const memories = [
    `Ni har varit vänner i ${days} ${days === 1 ? 'dag' : 'dagar'}.`,
    `Ni hittade varandra i ${worldById(pet.foundInWorldId).name}.`,
    pet.care?.lastPlayedAt && `Senaste leken: ${whenText(pet.care.lastPlayedAt, now)}.`,
    pet.care?.lastFedAt && `Senaste godbiten: ${whenText(pet.care.lastFedAt, now)}.`,
    toyName && `Älsklingsleksak: ${toyName.toLowerCase()}.`,
  ].filter((m): m is string => Boolean(m))

  const hint = !canInteract
    ? 'Vännerna vilar. Efter nästa övningspass kan ni leka igen.'
    : resting ? `${pet.name} sover. Tryck på lyktan för att väcka.`
    : 'Tryck på din vän eller stryk med fingret. Dra en godbit, kasta bollen, lek tittut!'
  const hiding = mode === 'peek' && peek !== null && !peek.found

  return (
    <section className="den-stage" aria-label={`Lyan med ${pet.name}`}>
      <div
        ref={sceneRef}
        className={`den-scene${resting ? ' den-scene--night' : ''}`}
        onPointerMove={onSceneMove}
      >
        {hasTent || DEN_ART_READY ? (
          <img
            className="den-backdrop"
            src={campImage(hasTent ? 'pet-tent-interior-v1' : 'pet-den-interior-v1')}
            alt={hasTent ? 'Ett ombonat husdjurstält med lyktor och fyra sovhörnor' : 'En mysig lya under trädrötterna'}
            draggable={false}
          />
        ) : <DenScene />}
        <div className="den-night" aria-hidden="true" />

        {/* De andra vännerna sitter på sina bäddar i bakgrunden. */}
        {pets.filter((p) => p.id !== pet.id).slice(0, 3).map((p, i) => {
          const index = cornerIndex(p, i + 1)
          const spot = hasTent ? CORNERS[index] : DEN_SPOTS[index]
          const owned = items.find((item) => item.point === (p.bedPoint ?? `bed-${i + 1}`))
          const bed = owned && catalogItem(owned.itemId)
          return (
            <button
              key={p.id}
              className={`den-friend${index > 1 ? ' den-friend--front' : ''}`}
              style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
              aria-label={`Lek med ${p.name}`}
              disabled={!free}
              onClick={() => select(p)}
            >
              {bed?.kind === 'bed' && <img className="den-friend__bed" src={itemImage(bed)} alt="" draggable={false} />}
              <PetSprite species={p.species} resting={p.care?.resting} />
            </button>
          )
        })}

        {/* Tittutens gömställen syns bara under leken. */}
        {mode === 'peek' && peek && HIDING_SPOTS.map((s, i) => {
          const here = i === peek.spot
          return (
            <button
              key={s.name}
              className={`den-hide${peek.wrong.includes(i) ? ' den-hide--empty' : ''}${here && peek.wrong.length >= 2 ? ' den-hide--hint' : ''}`}
              style={{ left: `${s.x}%`, top: `${s.y}%` }}
              aria-label={`Titta bakom ${s.name}`}
              onClick={() => guess(i)}
              disabled={peek.found}
            >
              {/* Ett öra sticker fram bakom rätt gömställe — en ledtråd för den som tittar noga. */}
              {here && !peek.found && <span className="den-hide__peeker"><PetSprite species={pet.species} /></span>}
              <span className="den-hide__prop" aria-hidden="true">{s.emoji}</span>
            </button>
          )
        })}

        <div
          ref={petRef}
          className={`den-pet${hiding ? ' den-pet--hidden' : ''}${mode === 'fetch' ? ' den-pet--running' : ''}${peek?.found ? ' den-pet--found' : ''}`}
          style={{ left: `${petPos.x}%`, top: `${petPos.y}%`, '--lean': `${lean * 5}deg` } as React.CSSProperties}
          role="button"
          tabIndex={0}
          aria-label={`Klappa ${pet.name}`}
          onPointerDown={onPetDown}
          onPointerMove={onPetMove}
          onPointerUp={onPetUp}
          onPointerCancel={() => { stroke.current = null }}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && free && !resting && canInteract) {
              e.preventDefault()
              react('hop'); say(pick(PURR_LINES)(pet.name)); sound(); heartBurst(); care('pet')
            }
          }}
        >
          <div className={`den-pet__body${reaction ? ` den-pet__body--${reaction.kind}` : ''}`}>
            <PetSprite species={pet.species} greeting={reaction !== null && reaction.kind !== 'run'} resting={resting} />
          </div>
          {mums > 0 && <span key={mums} className="den-mums" aria-hidden="true"><b>Mums!</b><i /><i /><i /></span>}
          {resting && <span className="den-zzz" aria-hidden="true"><i>z</i><i>z</i><i>Z</i></span>}
          {ball.phase === 'carried' && <span className="den-ball den-ball--carried" aria-hidden="true" />}
        </div>

        {hearts.map((h) => (
          <span key={h.id} className="den-heart" style={{ left: `${h.x}%`, top: `${h.y}%` }} aria-hidden="true">♥</span>
        ))}

        {/* Övre raden: vem man leker med, minnesboken och ljudet. */}
        <div className="den-hud">
          <div className="den-hud__friends">
            {pets.length > 1
              ? pets.map((p) => (
                <button key={p.id} className="den-pill" aria-pressed={p.id === pet.id} disabled={!free} onClick={() => select(p)}>{p.name}</button>
              ))
              : <span className="den-pill den-pill--name">{pet.name}</span>}
          </div>
          <div className="den-hud__tools">
            <button className="den-pill" onClick={() => setBookOpen(true)} aria-label={`Minnesboken om ${pet.name}`}>📖</button>
            <button className="den-pill" aria-pressed={muted} onClick={toggleSound} aria-label={muted ? 'Slå på ljudet' : 'Stäng av ljudet'}>
              {muted ? '🔇' : '🔊'}
            </button>
          </div>
        </div>

        <p className="den-bubble" role="status">{bubble || hint}</p>

        {/* Sakerna i rummet: skål, boll, tittut och lykta. */}
        <div className="den-prop den-prop--bowl">
          <TreatBowl
            species={pet.species}
            petName={pet.name}
            targetRef={petRef}
            disabled={!canInteract || resting || !free}
            onFeed={feed}
          />
        </div>
        <button
          className={`den-ball den-ball--${ball.phase}${ballReady ? ' den-ball--ready' : ''}`}
          style={{ left: `${ball.x}%`, top: `${ball.y}%`, visibility: ball.phase === 'carried' ? 'hidden' : undefined }}
          aria-label={`Kasta bollen till ${pet.name}`}
          disabled={!ballReady}
          onPointerDown={onBallDown}
          onPointerMove={onBallMove}
          onPointerUp={onBallUp}
          onPointerCancel={() => { throwing.current = null; setBall({ ...BALL_HOME, phase: 'home' }) }}
          onClick={(e) => { if (e.detail === 0 && ballReady) fetchBall({ x: 30 + Math.random() * 40, y: 74 }) }}
        />
        <span className="den-prop-label den-prop-label--ball" aria-hidden="true">Kasta</span>
        <button
          className="den-prop den-prop--peek"
          aria-pressed={mode === 'peek'}
          disabled={!canInteract || resting || (mode !== 'free' && mode !== 'peek')}
          onClick={mode === 'peek' ? stopPeek : startPeek}
        >
          <span aria-hidden="true">🙈</span>
          <small>{mode === 'peek' ? 'Sluta leka' : 'Tittut'}</small>
        </button>
        <button
          className="den-prop den-prop--lantern"
          aria-pressed={resting}
          disabled={!canInteract || !free}
          onClick={toggleNight}
        >
          <span aria-hidden="true">{resting ? '🌙' : '🏮'}</span>
          <small>{resting ? 'Väck' : 'Godnatt'}</small>
        </button>

        {bookOpen && (
          <div className="den-book" role="dialog" aria-label={`Minnesboken om ${pet.name}`}>
            <div className="den-book__card">
              <span className="camp-eyebrow">Minnesboken</span>
              <h3 className="display">{pet.name}</h3>
              <p>{petSpecies(pet.species).name} från {worldById(pet.foundInWorldId).name}</p>
              <ul>{memories.map((m) => <li key={m}>{m}</li>)}</ul>
              {editing ? (
                <form onSubmit={(e) => {
                  e.preventDefault()
                  if (canInteract && name.trim()) { onRename(pet.id, name); setEditing(false) }
                }}>
                  <label>Nytt namn<input value={name} maxLength={24} onChange={(e) => setName(e.target.value)} /></label>
                  <button className="chip" disabled={!canInteract || !name.trim()}>Spara namn</button>
                  <button className="chip" type="button" onClick={() => setEditing(false)}>Avbryt</button>
                </form>
              ) : (
                <button className="chip" disabled={!canInteract} onClick={() => { setName(pet.name); setEditing(true) }}>Byt namn</button>
              )}
              <label>
                Sovplats
                <select value={pet.bedPoint ?? 'bed-1'} disabled={!canInteract} onChange={(e) => onBed(pet.id, e.target.value)}>
                  {CORNERS.map((corner, i) => <option key={corner.name} value={`bed-${i + 1}`}>{corner.name}</option>)}
                </select>
              </label>
              <p className="den-book__note">Bädden du ställer på samma sovplats i lägret syns också här.</p>
              <div className="den-book__actions">
                <button className="chip" onClick={onPacking}>Välj bädd i packningen</button>
                <button className="btn btn-primary" onClick={() => { setBookOpen(false); setEditing(false) }}>Stäng</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
