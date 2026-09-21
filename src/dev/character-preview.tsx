/** Fristående renderingsprov med enbart påhittad profil och separat lagring. */
import { createRoot } from 'react-dom/client'
import { useEffect, useState } from 'react'
import type { CharacterMotion, PrototypeCloakId, PrototypeWeaponId } from '../domain/character'
import { PROTOTYPE_CLOAKS, PROTOTYPE_WEAPONS } from '../domain/character'
import { CharacterFigure } from '../ui/components/CharacterFigure'
import { ProductionPoseAnimatorV5, type ProductionPoseFrame, type ProductionPoseMode, type ProductionPoseSequence } from '../ui/components/ProductionPoseAnimatorV5'
import { PrototypeBoss } from '../ui/components/PrototypeBoss'
import '../styles/character-prototype.css'

type MotionOutfit = 'star-cloak' | 'light-armor'
type SavedDemo = { weapon: PrototypeWeaponId; cloak: PrototypeCloakId; reducedMotion: boolean; motionOutfit: MotionOutfit }
const KEY = 'barnens-plugg-character-prototype-v1'
const fallback: SavedDemo = { weapon: 'moon-bow', cloak: 'forest-cloak', reducedMotion: false, motionOutfit: 'star-cloak' }

function readSaved(): SavedDemo {
  try { return { ...fallback, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') } } catch { return fallback }
}

function CharacterPreview() {
  const [saved, setSaved] = useState<SavedDemo>(readSaved)
  const [motion, setMotion] = useState<CharacterMotion>('idle')
  const [run, setRun] = useState(0)
  const [motionMode, setMotionMode] = useState<ProductionPoseMode>('play')
  const [poseSequence, setPoseSequence] = useState<ProductionPoseSequence>('attack')
  const [view, setView] = useState<'figure' | 'battle' | 'motion'>('motion')
  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(saved)) }, [saved])
  const play = (next: CharacterMotion) => { setMotion(next); setRun((n) => n + 1) }
  const playMotion = (next: ProductionPoseMode) => { setMotionMode(next); setRun((n) => n + 1) }
  const selectPoseSequence = (next: ProductionPoseSequence) => {
    setPoseSequence(next)
    if (next !== 'attack') setSaved((old) => ({ ...old, weapon: 'sun-blade', motionOutfit: 'light-armor' }))
    playMotion('play')
  }
  const isSwordMotion = saved.weapon === 'sun-blade'
  const bossMotion: CharacterMotion = motion === 'guard' ? 'guard' : motion === 'attack' ? 'attack' : motion === 'victory' ? 'victory' : 'idle'
  return <main className="character-demo">
    <div className="character-demo__inner">
      <p className="character-demo__eyebrow">TESTPROTOTYP · PÅHITTAD PROFIL · {__APP_VERSION__}</p>
      <h1>Hjälte och bossfight</h1>
      <p className="character-demo__lead">Här provar vi naturlig kroppsrörelse, viktfördelning och vapenfattning. Detta är ett visuellt rörelseprov, inte godkänd slutkonst eller produktionsrigg.</p>
      <nav className="character-demo__tabs" aria-label="Prototypvyer">
        <button aria-pressed={view === 'motion'} onClick={() => { setView('motion'); playMotion('play') }}>Poseanimation v5</button>
        <button aria-pressed={view === 'figure'} onClick={() => setView('figure')}>Äldre garderobstest</button>
        <button aria-pressed={view === 'battle'} onClick={() => setView('battle')}>Äldre bossflöde</button>
        <button disabled>Skattkista · nästa etapp</button>
      </nav>
      <div className="character-demo__grid">
        <section className="character-demo__panel">
          <h2>{view === 'figure' ? 'Garderob' : view === 'battle' ? 'Stridskontroll' : 'Produktionsprov v5'}</h2>
          {view === 'motion' ? <>
            <p>V5 använder riktiga helkroppsposer. Vapen och klädsel delar samma sex fasnummer, så samma ögonblick kan jämföras utan lösa kroppsdelar eller ändrad marklinje.</p>
            <h3>Händelse</h3><div className="character-demo__choices"><button aria-pressed={poseSequence === 'attack'} onClick={() => selectPoseSequence('attack')}>Rätt svar · attack</button><button aria-pressed={poseSequence === 'guard'} onClick={() => selectPoseSequence('guard')}>Fel svar · bakslag</button><button aria-pressed={poseSequence === 'victory'} onClick={() => selectPoseSequence('victory')}>Seger</button></div>
            <h3>Vapen</h3><div className="character-demo__choices">{PROTOTYPE_WEAPONS.map((item) => <button key={item.id} aria-pressed={saved.weapon === item.id} onClick={() => { setPoseSequence('attack'); setSaved((old) => ({ ...old, weapon: item.id })) }}>{item.name}</button>)}</div>
            <h3>Klädsel</h3><div className="character-demo__choices"><button aria-pressed={saved.motionOutfit === 'star-cloak'} onClick={() => { setPoseSequence('attack'); setSaved((old) => ({ ...old, motionOutfit: 'star-cloak' })) }}>Stjärnmantel</button><button aria-pressed={saved.motionOutfit === 'light-armor'} onClick={() => { setPoseSequence('attack'); setSaved((old) => ({ ...old, motionOutfit: 'light-armor' })) }}>Lätt rustning</button></div>
            <h3>Sekvens</h3><div className="character-demo__controls">{([0, 1, 2, 3, 4, 5] as ProductionPoseFrame[]).slice(0, poseSequence === 'victory' ? 2 : 6).map((frame) => <button key={frame} aria-pressed={motionMode === frame} onClick={() => playMotion(frame)}>Fas {frame + 1}</button>)}<button aria-pressed={motionMode === 'play'} onClick={() => playMotion('play')}>Spela hela</button></div>
          </> : <>
            <p>{view === 'figure' ? 'Byt utrustning och spela en pose direkt.' : 'Detta är det äldre bossflödet och används bara som funktionsreferens.'}</p>
            <h3>Vapen</h3><div className="character-demo__choices">{PROTOTYPE_WEAPONS.map((item) => <button key={item.id} aria-pressed={saved.weapon === item.id} onClick={() => setSaved((old) => ({ ...old, weapon: item.id }))}>{item.name}</button>)}</div>
            <h3>Mantel</h3><div className="character-demo__choices">{PROTOTYPE_CLOAKS.map((item) => <button key={item.id} aria-pressed={saved.cloak === item.id} onClick={() => setSaved((old) => ({ ...old, cloak: item.id }))}>{item.name}</button>)}</div>
            <h3>Spela reaktion</h3><div className="character-demo__controls">
              <button onClick={() => play('idle')}>Väntar</button><button onClick={() => play('attack')}>Rätt svar</button><button onClick={() => play('guard')}>Fel svar</button><button onClick={() => play('victory')}>Seger</button><button onClick={() => play(motion)}>Spela om</button>
            </div>
          </>}
          <label className="character-demo__motion"><input type="checkbox" checked={saved.reducedMotion} onChange={(e) => setSaved((old) => ({ ...old, reducedMotion: e.target.checked }))}/> Rörelsepaus · visa stillpose</label>
          <div className="character-demo__note">Sparat bara i den här testdemon. Återställning: rensa webbplatsdata för demon.</div>
        </section>
        <section className="character-demo__panel">
          <h2>{view === 'figure' ? 'Posprov' : view === 'battle' ? 'Rätt/fel-reaktion' : poseSequence === 'guard' ? 'Fel svar · blockeras och tappar balansen' : poseSequence === 'victory' ? 'Seger · stabil triumfpose' : `${isSwordMotion ? 'Svärdssekvens' : 'Bågsekvens'} · samma fas för båda kläderna`}</h2>
          {view === 'motion' ? <>
            <div className="character-demo__stage character-demo__stage--motion"><ProductionPoseAnimatorV5 key={`motion-${run}`} mode={motionMode} weapon={saved.weapon} outfit={saved.motionOutfit} poseSequence={poseSequence} reducedMotion={saved.reducedMotion} /></div>
            <p className="character-demo__note">{poseSequence === 'attack' ? 'Attackprovet stöder båda vapnen och båda kläderna.' : 'Detta första reaktionsprov är avgränsat till solklinga och lätt rustning. Godkänn rörelsen innan samma sekvenser beställs för fler kombinationer.'}</p>
          </> : <>
            <div className={`character-demo__stage ${view === 'figure' ? 'character-demo__stage--single' : ''}`}>
              <CharacterFigure key={`hero-${run}`} weapon={saved.weapon} cloak={saved.cloak} motion={motion} reducedMotion={saved.reducedMotion} className="character-demo__hero" />
              {view === 'battle' && <><span className="character-demo__versus">mot</span><PrototypeBoss key={`boss-${run}`} motion={bossMotion} reducedMotion={saved.reducedMotion} className="character-demo__boss" /></>}
            </div>
            <p className="character-demo__note">{motion === 'attack' ? 'Rätt svar: hjälten attackerar och draken ryggar tillbaka.' : motion === 'guard' ? 'Fel svar: hjälten skyddar sig och draken sänder en kort magisk våg.' : motion === 'victory' ? 'Seger: hjälten firar och draken bugar.' : 'Vänteläge: andning, mantel och drakens huvud, vingar och svans rör sig var för sig.'}</p>
          </>}
        </section>
      </div>
      <footer className="character-demo__footer"><span>V5 testar attack, säker undanmanöver, seger, marklinje, direktval av bildruta och rörelsepaus.</span><span>Ingen matte, valuta, sparfil eller vanlig appdata ändras.</span></footer>
    </div>
  </main>
}

createRoot(document.getElementById('root')!).render(<CharacterPreview />)
