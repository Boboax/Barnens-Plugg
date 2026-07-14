import { sfx } from '../../sound'
import { Avatar } from '../components/Avatar'
import { SoundToggle } from '../components/SoundToggle'
import { useStore } from '../store'

/* Startskärmen: den målade valvbakgrunden (public/art/startbg.webp) med
   titel, Pi och spelarval på en mjuk mörkscrim så texten är läsbar mot
   målningen. Om bilden inte laddats faller bakgrunden till varm gradient. */

const startBg = `${import.meta.env.BASE_URL}art/startbg.webp`
const logo = `${import.meta.env.BASE_URL}art/logo.webp`

export function ProfileSelect() {
  const store = useStore()
  const { children } = store.household

  const nameShadow = '0 2px 5px rgba(0,0,0,.7)'

  return (
    <div className="screen-fade" style={{
      minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: 10, padding: 24, position: 'relative', overflow: 'hidden',
      background: `url(${startBg}) center / cover, linear-gradient(180deg, #FFEFC9 0%, var(--bg) 65%)`,
    }}>
      {/* Mjuk mörkscrim i mitten så titel och namn lyfter mot målningen. */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 60% 70% at 50% 52%, rgba(20,15,25,.5), rgba(20,15,25,0) 75%)',
      }} />

      <img
        src={logo}
        alt="Räknarnas rike — Matteäventyret"
        className="float-soft"
        style={{
          position: 'relative', zIndex: 1, width: 'min(560px, 82%)', height: 'auto',
          filter: 'drop-shadow(0 6px 16px rgba(0,0,0,.55))', marginBottom: 4,
        }}
      />

      {children.length === 0 ? (
        <>
          <p style={{ color: '#F3E9D6', fontWeight: 700, maxWidth: 420, textAlign: 'center', position: 'relative', zIndex: 1, textShadow: nameShadow }}>
            Hej! Jag är Pi. 🦉 En vuxen behöver sätta upp appen först — det tar bara en minut.
          </p>
          <button className="btn btn-primary" style={{ position: 'relative', zIndex: 1 }} onClick={() => store.go('parent')}>
            Kom igång (förälder) →
          </button>
        </>
      ) : (
        <>
          <p style={{ color: '#F3E9D6', fontWeight: 800, margin: '2px 0 10px', position: 'relative', zIndex: 1, textShadow: nameShadow }}>Vem ska räkna idag?</p>
          <div style={{ display: 'flex', gap: 30, flexWrap: 'wrap', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
            {children.map((child, i) => (
              <button
                key={child.id}
                className="bounce-in"
                onClick={() => { sfx.whoosh(); store.selectChild(child.id) }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: 15, color: '#FBF3DE', textShadow: nameShadow, fontFamily: 'inherit', animationDelay: `${i * 0.12}s` }}
              >
                <span className="float-soft" style={{ animationDelay: `${i * 0.4}s`, filter: 'drop-shadow(0 5px 8px rgba(0,0,0,.5))' }}>
                  <Avatar child={child} size={92} />
                </span>
                {child.name}
                <span style={{ fontWeight: 700, color: '#E7D8B8', fontSize: 13, textShadow: nameShadow }}>
                  {child.diagnosis.done ? `åk ${child.schoolYear === 'F' ? 'F' : child.schoolYear}` : 'ny spelare ✨'}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      <span style={{ position: 'fixed', left: 18, bottom: 16, zIndex: 2 }}><SoundToggle /></span>
      <span style={{
        position: 'fixed', bottom: 8, left: '50%', transform: 'translateX(-50%)', zIndex: 2,
        fontSize: 11, fontWeight: 700, color: '#EAd9BE', opacity: 0.85, textShadow: '0 1px 2px rgba(0,0,0,.6)',
      }}>v{__APP_VERSION__}</span>
      <button
        className="chip"
        onClick={() => store.go('parent')}
        style={{ position: 'fixed', right: 18, bottom: 16, zIndex: 2 }}
      >🔒 Förälder</button>
    </div>
  )
}
