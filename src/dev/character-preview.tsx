/** Fristående renderingsprov med enbart påhittad profil och separat lagring. */
import { createRoot } from 'react-dom/client'
import { useEffect, useState } from 'react'
import type { CharacterMotion, PrototypeCloakId, PrototypeWeaponId } from '../domain/character'
import { PROTOTYPE_CLOAKS, PROTOTYPE_WEAPONS } from '../domain/character'
import { CharacterFigure } from '../ui/components/CharacterFigure'
import { PrototypeBoss } from '../ui/components/PrototypeBoss'
import '../styles/character-prototype.css'

type SavedDemo = { weapon: PrototypeWeaponId; cloak: PrototypeCloakId; reducedMotion: boolean }
const KEY = 'barnens-plugg-character-prototype-v1'
const fallback: SavedDemo = { weapon: 'moon-bow', cloak: 'forest-cloak', reducedMotion: false }

function readSaved(): SavedDemo {
  try { return { ...fallback, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') } } catch { return fallback }
}

function CharacterPreview() {
  const [saved, setSaved] = useState<SavedDemo>(readSaved)
  const [motion, setMotion] = useState<CharacterMotion>('idle')
  const [run, setRun] = useState(0)
  const [view, setView] = useState<'figure' | 'battle'>('figure')
  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(saved)) }, [saved])
  const play = (next: CharacterMotion) => { setMotion(next); setRun((n) => n + 1) }
  const bossMotion: CharacterMotion = motion === 'guard' ? 'guard' : motion === 'attack' ? 'attack' : motion === 'victory' ? 'victory' : 'idle'
  return <main className="character-demo">
    <div className="character-demo__inner">
      <p className="character-demo__eyebrow">TESTPROTOTYP · PÅHITTAD PROFIL · {__APP_VERSION__}</p>
      <h1>Hjälte och bossfight</h1>
      <p className="character-demo__lead">Här provar vi kroppsrörelse och fästpunkter. Figurerna är tekniska prototyper, inte godkänd slutkonst.</p>
      <nav className="character-demo__tabs" aria-label="Prototypvyer">
        <button aria-pressed={view === 'figure'} onClick={() => setView('figure')}>Figur och garderob</button>
        <button aria-pressed={view === 'battle'} onClick={() => setView('battle')}>Bossfight</button>
        <button disabled>Skattkista · nästa etapp</button>
      </nav>
      <div className="character-demo__grid">
        <section className="character-demo__panel">
          <h2>{view === 'figure' ? 'Garderob' : 'Stridskontroll'}</h2>
          <p>{view === 'figure' ? 'Byt utrustning och spela en pose direkt.' : 'Samma hjälte och rigg används i reaktionerna.'}</p>
          <h3>Vapen</h3><div className="character-demo__choices">{PROTOTYPE_WEAPONS.map((item) => <button key={item.id} aria-pressed={saved.weapon === item.id} onClick={() => setSaved((old) => ({ ...old, weapon: item.id }))}>{item.name}</button>)}</div>
          <h3>Mantel</h3><div className="character-demo__choices">{PROTOTYPE_CLOAKS.map((item) => <button key={item.id} aria-pressed={saved.cloak === item.id} onClick={() => setSaved((old) => ({ ...old, cloak: item.id }))}>{item.name}</button>)}</div>
          <h3>Spela reaktion</h3><div className="character-demo__controls">
            <button onClick={() => play('idle')}>Väntar</button><button onClick={() => play('attack')}>Rätt svar</button><button onClick={() => play('guard')}>Fel svar</button><button onClick={() => play('victory')}>Seger</button><button onClick={() => play(motion)}>Spela om</button>
          </div>
          <label className="character-demo__motion"><input type="checkbox" checked={saved.reducedMotion} onChange={(e) => setSaved((old) => ({ ...old, reducedMotion: e.target.checked }))}/> Rörelsepaus · visa stillpose</label>
          <div className="character-demo__note">Sparat bara i den här testdemon. Återställning: rensa webbplatsdata för demon.</div>
        </section>
        <section className="character-demo__panel">
          <h2>{view === 'figure' ? 'Posprov' : 'Rätt/fel-reaktion'}</h2>
          <div className={`character-demo__stage ${view === 'figure' ? 'character-demo__stage--single' : ''}`}>
            <CharacterFigure key={`hero-${run}`} weapon={saved.weapon} cloak={saved.cloak} motion={motion} reducedMotion={saved.reducedMotion} className="character-demo__hero" />
            {view === 'battle' && <><span className="character-demo__versus">mot</span><PrototypeBoss key={`boss-${run}`} motion={bossMotion} reducedMotion={saved.reducedMotion} className="character-demo__boss" /></>}
          </div>
          <p className="character-demo__note">{motion === 'attack' ? 'Rätt svar: hjälten attackerar och draken ryggar tillbaka.' : motion === 'guard' ? 'Fel svar: hjälten skyddar sig och draken sänder en kort magisk våg.' : motion === 'victory' ? 'Seger: hjälten firar och draken bugar.' : 'Vänteläge: andning, mantel och drakens huvud, vingar och svans rör sig var för sig.'}</p>
        </section>
      </div>
      <footer className="character-demo__footer"><span>Detta kan testas: vapenfäste, mantel, idle, rätt, fel, seger och rörelsepaus.</span><span>Ingen matte, valuta, sparfil eller vanlig appdata ändras.</span></footer>
    </div>
  </main>
}

createRoot(document.getElementById('root')!).render(<CharacterPreview />)
