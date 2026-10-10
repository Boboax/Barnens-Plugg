import { useState } from 'react'
import type { ChildProfile } from '../../domain/types'
import { YEAR_ORDER, momentById } from '../../domain/curriculum'
import { WORLDS } from '../../domain/worlds'
import { yearLabel } from '../../domain/guardians'
import { BLIXT_TESTS } from '../../engine/blixt'
import { currentMomentId } from '../../engine/progress'
import { petDay } from '../../engine/pet-home'
import { emptyPetProgress } from '../../domain/pet-home'
import { useStore } from '../store'

/* Testpanelen på kartan: hoppa direkt till strider och läger utan att
   spela fram dem. Renderas bara när __TESTLAGE__ är sant (förhandsbyggen);
   store-funktionerna har samma vakt. */

const PANEL: React.CSSProperties = {
  position: 'fixed', top: 'calc(70px + env(safe-area-inset-top))', left: 18, zIndex: 50,
  width: 'min(420px, calc(100vw - 36px))', maxHeight: 'calc(100% - 100px)', overflow: 'auto',
  padding: 16, display: 'grid', gap: 12, color: '#35302E',
}
const ROW: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 6 }
const H: React.CSSProperties = { margin: 0, fontSize: 13, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.06em', color: '#6E6656' }

export function TestPanel({ child }: { child: ChildProfile }) {
  const store = useStore()
  const [open, setOpen] = useState(false)
  if (!__TESTLAGE__) return null
  const momentId = currentMomentId(child)
  const go = (start: () => void): void => { setOpen(false); start() }
  const patch = store.testlagePatchActiveChild
  const years = YEAR_ORDER.slice(0, YEAR_ORDER.indexOf(child.schoolYear) + 2)

  return (
    <>
      <button className="chip" onClick={() => setOpen(!open)} aria-expanded={open}>🧪 Test</button>
      {open && (
        <div className="card" style={PANEL} role="dialog" aria-label="Testpanel">
          <p style={{ margin: 0, fontSize: 13 }}>Bara på testadressen. Resultat sparas på testbarnet som vanligt.</p>

          <h4 style={H}>Kvällslägret</h4>
          <div style={ROW}>
            <button className="btn btn-quiet" onClick={() => patch((c) => ({ ...c, petProgress: { ...c.petProgress, coins: c.petProgress.coins + 200 } }))}>+200 mynt</button>
            <button className="btn btn-quiet" onClick={() => patch((c) => ({ ...c, petProgress: { ...c.petProgress, lastPracticeDay: petDay(new Date()), visit: undefined } }))}>Dagens pass klart (ny lägertid)</button>
            <button className="btn btn-quiet" onClick={() => patch((c) => ({
              ...c,
              petProgress: { ...c.petProgress, pets: [], items: [], lastPracticeDay: petDay(new Date()), visit: undefined,
                encounter: { species: 'woodland-frog', worldId: momentId ? momentById(momentId).worldId : 'talens-dal' } },
            }))}>Börja om: grodan bakom stenen</button>
            {/* Som ett barn som aldrig tränat sedan lägret kom: ingen vän,
                inget dagens pass — knappen på kartan ska då vara borta. */}
            <button className="btn btn-quiet" onClick={() => patch((c) => ({
              ...c, petProgress: { ...emptyPetProgress(), coins: c.petProgress.coins },
            }))}>Börja om från noll (ingen vän)</button>
            <button className="btn btn-quiet" onClick={() => go(() => store.go('pet-home'))}>Öppna lägret</button>
            <button className="btn btn-quiet" onClick={() => patch((c) => ({ ...c, conqueredWorlds: WORLDS.map((w) => w.id) }))}>
              Erövra alla världar (alla reliker)
            </button>
          </div>

          <h4 style={H}>Nuvarande moment{momentId ? `: ${momentById(momentId).title}` : ''}</h4>
          <div style={ROW}>
            <button className="btn btn-quiet" disabled={!momentId} onClick={() => go(() => store.startBattle(momentId!, 'check'))}>Kunskapskoll</button>
            <button className="btn btn-quiet" disabled={!momentId} onClick={() => go(() => store.startBattle(momentId!, 'star'))}>Diamantnivå</button>
            <button className="btn btn-quiet" disabled={!momentId} onClick={() => go(() => store.startSession(momentId, true))}>Fokuserat pass</button>
          </div>

          <h4 style={H}>Årsväktare</h4>
          <div style={ROW}>
            {years.map((y) => (
              <button key={y} className="btn btn-quiet" onClick={() => go(() => store.startGuardian(y))}>{yearLabel(y)}</button>
            ))}
          </div>

          <h4 style={H}>Världsbossar</h4>
          <div style={ROW}>
            {WORLDS.map((w) => (
              <button key={w.id} className="btn btn-quiet" onClick={() => go(() => store.startWorldBoss(w.id))}>{w.boss.emoji} {w.boss.name}</button>
            ))}
          </div>

          <h4 style={H}>Blixtpass</h4>
          <div style={ROW}>
            {BLIXT_TESTS.map((b) => (
              <button key={b.kind} className="btn btn-quiet" onClick={() => go(() => store.startBlixt(b.kind))}>{b.title}</button>
            ))}
          </div>
          <button className="chip" style={{ justifySelf: 'start' }} onClick={() => setOpen(false)}>Stäng</button>
        </div>
      )}
    </>
  )
}
