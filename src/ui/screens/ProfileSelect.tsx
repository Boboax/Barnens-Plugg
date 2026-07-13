import { sfx } from '../../sound'
import { Pi } from '../components/Pi'
import { SoundToggle } from '../components/SoundToggle'
import { useStore } from '../store'

const CLOUDS = [
  { top: '8%', duration: 60, delay: -12, emoji: '☁️' },
  { top: '18%', duration: 85, delay: -40, emoji: '☁️' },
  { top: '30%', duration: 70, delay: -60, emoji: '🎈' },
]

export function ProfileSelect() {
  const store = useStore()
  const { children } = store.household

  return (
    <div className="screen-fade" style={{
      minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: 10, padding: 24, position: 'relative', overflow: 'hidden',
      background: 'linear-gradient(180deg, #FFEFC9 0%, var(--bg) 65%)',
    }}>
      {CLOUDS.map((c, i) => (
        <span key={i} className="cloud" style={{ top: c.top, animationDuration: `${c.duration}s`, animationDelay: `${c.delay}s` }}>
          {c.emoji}
        </span>
      ))}
      <div className="float-soft"><Pi mood="glad" size={96} /></div>
      <h1 style={{ fontSize: 30, fontWeight: 900, margin: 0 }}>
        Barnens <span style={{ color: 'var(--primary)' }}>Plugg</span>
      </h1>

      {children.length === 0 ? (
        <>
          <p style={{ color: 'var(--muted)', fontWeight: 700, maxWidth: 420, textAlign: 'center' }}>
            Hej! Jag är Pi. 🐧 En vuxen behöver sätta upp appen först — det tar bara en minut.
          </p>
          <button className="btn btn-primary" onClick={() => store.go('parent')}>
            Kom igång (förälder) →
          </button>
        </>
      ) : (
        <>
          <p style={{ color: 'var(--muted)', fontWeight: 700, margin: '2px 0 10px' }}>Vem ska räkna idag?</p>
          <div style={{ display: 'flex', gap: 30, flexWrap: 'wrap', justifyContent: 'center' }}>
            {children.map((child, i) => (
              <button
                key={child.id}
                className="bounce-in"
                onClick={() => { sfx.whoosh(); store.selectChild(child.id) }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: 15, color: 'var(--ink)', fontFamily: 'inherit', animationDelay: `${i * 0.12}s` }}
              >
                <span className="float-soft" style={{
                  width: 86, height: 86, borderRadius: '50%', background: child.color, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, fontWeight: 900,
                  boxShadow: '0 5px 0 rgba(0,0,0,.12)', animationDelay: `${i * 0.4}s`,
                }}>{child.name.charAt(0).toUpperCase()}</span>
                {child.name}
                <span style={{ fontWeight: 600, color: 'var(--muted)', fontSize: 13 }}>
                  {child.diagnosis.done ? `åk ${child.schoolYear === 'F' ? 'F' : child.schoolYear}` : 'ny spelare ✨'}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      <span style={{ position: 'fixed', left: 18, bottom: 16 }}><SoundToggle /></span>
      <button
        className="chip"
        onClick={() => store.go('parent')}
        style={{ position: 'fixed', right: 18, bottom: 16 }}
      >🔒 Förälder</button>
    </div>
  )
}
