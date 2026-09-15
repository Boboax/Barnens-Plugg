/** Fristående renderingsprov med enbart påhittad profil och separat lagring. */
import { createRoot } from 'react-dom/client'
import { useEffect, useState } from 'react'
import type { CharacterMotion, PrototypeCloakId, PrototypeWeaponId } from '../domain/character'
import { PROTOTYPE_CLOAKS, PROTOTYPE_WEAPONS } from '../domain/character'
import { CharacterFigure } from '../ui/components/CharacterFigure'
import { BowMotionStudyV3 } from '../ui/components/BowMotionStudyV3'
import { ModularHeroRig } from '../ui/components/ModularHeroRig'
import { ProductionHeroRigV4 } from '../ui/components/ProductionHeroRigV4'
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
  const [motionMode, setMotionMode] = useState<'play' | 0 | 1 | 2 | 3 | 4 | 5>('play')
  const [view, setView] = useState<'figure' | 'battle' | 'motion' | 'rig' | 'rig4'>('motion')
  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(saved)) }, [saved])
  const play = (next: CharacterMotion) => { setMotion(next); setRun((n) => n + 1) }
  const playMotion = (next: 'play' | 0 | 1 | 2 | 3 | 4 | 5) => { setMotionMode(next); setRun((n) => n + 1) }
  const isSwordMotion = saved.weapon === 'sun-blade'
  const bossMotion: CharacterMotion = motion === 'guard' ? 'guard' : motion === 'attack' ? 'attack' : motion === 'victory' ? 'victory' : 'idle'
  return <main className="character-demo">
    <div className="character-demo__inner">
      <p className="character-demo__eyebrow">TESTPROTOTYP · PÅHITTAD PROFIL · {__APP_VERSION__}</p>
      <h1>Hjälte och bossfight</h1>
      <p className="character-demo__lead">Här provar vi naturlig kroppsrörelse, viktfördelning och vapenfattning. Detta är ett visuellt rörelseprov, inte godkänd slutkonst eller produktionsrigg.</p>
      <nav className="character-demo__tabs" aria-label="Prototypvyer">
        <button aria-pressed={view === 'figure'} onClick={() => setView('figure')}>Figur och garderob</button>
        <button aria-pressed={view === 'battle'} onClick={() => setView('battle')}>Bossfight</button>
        <button aria-pressed={view === 'motion'} onClick={() => { setView('motion'); playMotion('play') }}>Rörelse v3 · vapen</button>
        <button aria-pressed={view === 'rig4'} onClick={() => { setView('rig4'); play('idle') }}>Rigg v4 · lager</button>
        <button aria-pressed={view === 'rig'} onClick={() => { setView('rig'); play('idle') }}>Teknisk rigg · ej godkänd</button>
        <button disabled>Skattkista · nästa etapp</button>
      </nav>
      <div className="character-demo__grid">
        <section className="character-demo__panel">
          <h2>{view === 'figure' ? 'Garderob' : view === 'battle' ? 'Stridskontroll' : view === 'rig' || view === 'rig4' ? 'Riggkontroll' : 'Rörelsekontroll v3'}</h2>
          {view === 'motion' ? <>
            <p>Sex sammanhängande helkroppsposer testar balanserad ståställning, korrekt handgrepp och naturlig efterrörelse. Växla både vapen och klädsel direkt i detta visuella prov.</p>
            <h3>Vapen</h3><div className="character-demo__choices">{PROTOTYPE_WEAPONS.map((item) => <button key={item.id} aria-pressed={saved.weapon === item.id} onClick={() => { setSaved((old) => ({ ...old, weapon: item.id })); playMotion(0) }}>{item.name}</button>)}</div>
            <h3>Klädsel</h3><div className="character-demo__choices"><button aria-pressed={saved.motionOutfit === 'star-cloak'} onClick={() => { setSaved((old) => ({ ...old, motionOutfit: 'star-cloak' })); playMotion(0) }}>Stjärnmantel</button><button aria-pressed={saved.motionOutfit === 'light-armor'} onClick={() => { setSaved((old) => ({ ...old, motionOutfit: 'light-armor' })); playMotion(0) }}>Lätt rustning</button></div>
            <div className="character-demo__controls"><button onClick={() => playMotion(0)}>Grundställning</button><button onClick={() => playMotion(2)}>{isSwordMotion ? 'Ladda slaget' : 'Fullt drag'}</button><button onClick={() => playMotion(3)}>{isSwordMotion ? 'Kontrollerat slag' : 'Släpp'}</button><button onClick={() => playMotion(5)}>Återhämtning</button><button onClick={() => playMotion('play')}>Spela hela</button></div>
          </> : <>
            <p>{view === 'figure' ? 'Byt utrustning och spela en pose direkt.' : view === 'rig4' ? 'V4 använder en kroppskärna, två överarmar, två underarmar, mantel och vapen som separata bildlager. Prova rörelse och växla rustning/mantel.' : view === 'rig' ? 'Den här lagrade delen är en teknisk jämförelse, inte en visuell riktning. Den visar varför en produktionsrigg måste byggas från godkända poser.' : 'Samma hjälte och rigg används i reaktionerna.'}</p>
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
          <h2>{view === 'figure' ? 'Posprov' : view === 'battle' ? 'Rätt/fel-reaktion' : view === 'rig4' ? 'Produktionsrigg v4 · lager' : view === 'rig' ? 'Modulär hjälte · teknisk jämförelse' : `${isSwordMotion ? 'Svärdssekvens' : 'Bågsekvens'} med naturlig kroppshållning`}</h2>
          {view === 'motion' ? <>
            <div className="character-demo__stage character-demo__stage--motion"><BowMotionStudyV3 key={`motion-${run}`} mode={motionMode} weapon={saved.weapon} outfit={saved.motionOutfit} reducedMotion={saved.reducedMotion} /></div>
            <p className="character-demo__note">Klädprovet visar att stjärnmantel och lätt rustning fungerar med båge och svärd utan att ståställningen går sönder. Än så länge är varje klädsel ett sammanhängande poseark; slutversionen behöver frilagda produktionslager för verkligt modulära plagg.</p>
          </> : view === 'rig4' ? <>
            <div className="character-demo__stage character-demo__stage--rig"><ProductionHeroRigV4 key={`rig4-${run}`} weapon={saved.weapon} cloak={saved.motionOutfit === 'star-cloak'} motion={motion} reducedMotion={saved.reducedMotion} /></div>
            <p className="character-demo__note">V4 är första riktiga lagerprovet: mantel eller rustning kan växlas utan att kroppen ritas om. Bågens handgrepp behöver ännu en egen handpose innan detta kan ersätta v3:s godkända bågsekvens.</p>
          </> : view === 'rig' ? <>
            <div className="character-demo__stage character-demo__stage--rig"><ModularHeroRig key={`rig-${run}`} weapon={saved.weapon} cloak={saved.cloak} motion={motion} reducedMotion={saved.reducedMotion} /></div>
            <p className="character-demo__note">Denna äldre tekniska rigg använder frilagda delar och ledpunkter, men är inte visuellt godkänd. Behåll den endast som jämförelse för nästa produktionsrigg.</p>
          </> : <>
            <div className={`character-demo__stage ${view === 'figure' ? 'character-demo__stage--single' : ''}`}>
              <CharacterFigure key={`hero-${run}`} weapon={saved.weapon} cloak={saved.cloak} motion={motion} reducedMotion={saved.reducedMotion} className="character-demo__hero" />
              {view === 'battle' && <><span className="character-demo__versus">mot</span><PrototypeBoss key={`boss-${run}`} motion={bossMotion} reducedMotion={saved.reducedMotion} className="character-demo__boss" /></>}
            </div>
            <p className="character-demo__note">{motion === 'attack' ? 'Rätt svar: hjälten attackerar och draken ryggar tillbaka.' : motion === 'guard' ? 'Fel svar: hjälten skyddar sig och draken sänder en kort magisk våg.' : motion === 'victory' ? 'Seger: hjälten firar och draken bugar.' : 'Vänteläge: andning, mantel och drakens huvud, vingar och svans rör sig var för sig.'}</p>
          </>}
        </section>
      </div>
      <footer className="character-demo__footer"><span>Detta kan testas: vapenfäste, mantel, flerledsrörelse, rätt, fel, seger och rörelsepaus.</span><span>Ingen matte, valuta, sparfil eller vanlig appdata ändras.</span></footer>
    </div>
  </main>
}

createRoot(document.getElementById('root')!).render(<CharacterPreview />)
