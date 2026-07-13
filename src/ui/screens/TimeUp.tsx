import { Pi } from '../components/Pi'
import { useStore } from '../store'

/* Tiden är slut — vänligt och bestämt. Sköts av appens kod, inte av AI. */

export function TimeUp() {
  const store = useStore()
  const child = store.activeChild
  return (
    <div className="screen-fade" style={{
      minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: 12, padding: 30, textAlign: 'center',
    }}>
      <Pi mood="sover" size={110} />
      <h2 style={{ fontSize: 26, fontWeight: 900, margin: 0 }}>Bra jobbat idag{child ? `, ${child.name}` : ''}! 🌙</h2>
      <p style={{ color: 'var(--muted)', fontWeight: 700, maxWidth: 420, margin: 0 }}>
        Dagens mattetid är slut — hjärnan lär sig som bäst när den får vila emellan.
        Vi ses imorgon, då väntar äventyret igen!
      </p>
      <button className="btn btn-primary" onClick={store.leaveChild}>Hejdå Pi! 👋</button>
    </div>
  )
}
