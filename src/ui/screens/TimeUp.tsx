import { useState } from 'react'
import { Pi } from '../components/Pi'
import { Icon } from '../components/Icon'
import { useStore } from '../store'

/* Tiden är slut — vänligt och bestämt. Sköts av appens kod, inte av AI.
   En förälder kan bevilja extratid här med PIN — beslutet ligger alltså
   alltid hos en vuxen, aldrig hos barnet eller chatten. */

export function TimeUp() {
  const store = useStore()
  const child = store.activeChild
  const [showParent, setShowParent] = useState(false)
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [checking, setChecking] = useState(false)

  const grant = async (minutes: number): Promise<void> => {
    if (!child || checking) return
    setChecking(true)
    setError(false)
    const ok = await store.verifyParentPin(pin)
    setChecking(false)
    if (!ok) { setError(true); return }
    store.grantExtraTime(child.id, minutes)
    store.go('home')
  }

  return (
    <div className="screen-fade" style={{
      minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: 12, padding: 30, textAlign: 'center',
    }}>
      <Pi mood="sover" size={110} />
      <h2 style={{ fontSize: 26, fontWeight: 900, margin: 0 }}>Bra jobbat idag{child ? `, ${child.name}` : ''}!</h2>
      <p style={{ color: 'var(--muted)', fontWeight: 700, maxWidth: 420, margin: 0 }}>
        Dagens mattetid är slut — hjärnan lär sig som bäst när den får vila emellan.
        Vi ses imorgon, då väntar äventyret igen!
      </p>
      <button className="btn btn-primary" onClick={store.leaveChild}>Hejdå Pi!</button>

      {/* Föräldrautväg: mer tid idag kräver PIN. Diskret så barnet inte tjatar. */}
      {!showParent ? (
        <button
          className="chip"
          style={{ marginTop: 18, opacity: 0.75 }}
          onClick={() => setShowParent(true)}
        ><Icon name="las" size={13} style={{ marginRight: 5 }} /> Förälder: ge extra tid idag</button>
      ) : (
        <div className="card" style={{ marginTop: 14, maxWidth: 340, width: '100%' }}>
          <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 8 }}>Extra tid idag (förälder)</div>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            placeholder="Föräldra-PIN"
            value={pin}
            onChange={(e) => { setPin(e.target.value); setError(false) }}
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 18, fontWeight: 800,
              border: `2.5px solid ${error ? 'var(--coral)' : 'var(--line)'}`, textAlign: 'center',
              fontFamily: 'inherit', letterSpacing: 4,
            }}
          />
          {error && (
            <div style={{ color: 'var(--coral)', fontWeight: 800, fontSize: 12.5, marginTop: 6 }}>
              Fel PIN — försök igen.
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'center' }}>
            <button className="btn btn-primary" disabled={checking || pin.length === 0} onClick={() => void grant(10)}>
              +10 min
            </button>
            <button className="btn btn-primary" disabled={checking || pin.length === 0} onClick={() => void grant(20)}>
              +20 min
            </button>
          </div>
          <div style={{ color: 'var(--muted)', fontWeight: 700, fontSize: 11.5, marginTop: 8 }}>
            Gäller bara idag — imorgon räknas den vanliga tiden igen.
          </div>
        </div>
      )}
    </div>
  )
}
