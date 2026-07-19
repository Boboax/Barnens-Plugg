import { useEffect, useRef, useState } from 'react'
import {
  isMuted, setMuted,
  getMusicVolume, setMusicVolume, getSfxVolume, setSfxVolume, sfx,
} from '../../sound'
import { Icon } from './Icon'

/* Ljudinställningar — barnvänligt reglage: på/av + separata skjutreglage för
   musik och effekter. Allt sparas mellan sessioner. Öppnas som en liten
   pergamentruta under (eller över, nära skärmkanten) högtalarknappen. */
export function SoundToggle({ openUp = false }: { openUp?: boolean }) {
  const [muted, setMut] = useState(isMuted())
  const [open, setOpen] = useState(false)
  const [music, setMusic] = useState(Math.round(getMusicVolume() * 100))
  const [effekt, setEffekt] = useState(Math.round(getSfxVolume() * 100))
  const wrapRef = useRef<HTMLSpanElement>(null)

  // Stäng när man pekar utanför rutan.
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent): void => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('pointerdown', onDown)
    return () => window.removeEventListener('pointerdown', onDown)
  }, [open])

  const toggleMute = (): void => {
    const next = !muted
    setMuted(next)
    setMut(next)
    if (!next) sfx.ratt()
  }

  return (
    <span ref={wrapRef} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        className="chip"
        aria-label="Ljudinställningar"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      ><Icon name={muted ? 'ljud-av' : 'ljud'} size={18} /></button>

      {open && (
        <div role="dialog" aria-label="Ljud" style={{
          position: 'absolute', left: 0, zIndex: 40,
          ...(openUp ? { bottom: 'calc(100% + 8px)' } : { top: 'calc(100% + 8px)' }),
          width: 224, boxSizing: 'border-box',
          background: 'linear-gradient(180deg, #FBF4E2, #F0E6CD)',
          border: '2px solid #C9B489', borderRadius: 14,
          boxShadow: '0 10px 26px rgba(45,30,10,.42)', padding: 12,
          display: 'flex', flexDirection: 'column', gap: 12, color: '#35302E',
        }}>
          <button
            onClick={toggleMute}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontFamily: 'inherit', fontWeight: 800, fontSize: 13.5, cursor: 'pointer',
              background: muted ? '#E7DCC2' : 'linear-gradient(180deg,#3E8E63,#2E6B4C)',
              color: muted ? '#6E6656' : '#EAFBF1',
              border: `2px solid ${muted ? '#C9B489' : '#4FA97C'}`, borderRadius: 10, padding: '8px 10px',
            }}
          >
            <Icon name={muted ? 'ljud-av' : 'ljud'} size={17} /> {muted ? 'Ljudet är av' : 'Ljudet är på'}
          </button>

          <VolRow
            label="Musik" value={music} disabled={muted}
            onChange={(v) => { setMusic(v); setMusicVolume(v / 100) }}
          />
          <VolRow
            label="Effekter" value={effekt} disabled={muted}
            // Spela ett litet pling så barnet hör nivån direkt.
            onChange={(v) => { setEffekt(v); setSfxVolume(v / 100); if (!muted) sfx.klick() }}
          />
        </div>
      )}
    </span>
  )
}

function VolRow({ label, value, onChange, disabled }: {
  label: string; value: number; onChange(v: number): void; disabled?: boolean
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, opacity: disabled ? 0.5 : 1 }}>
      <span style={{ fontWeight: 800, fontSize: 12.5, display: 'flex', justifyContent: 'space-between' }}>
        <span>{label}</span><span style={{ color: '#8A6A38' }}>{value}%</span>
      </span>
      <input
        type="range" min={0} max={100} step={5} value={value} disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={`${label} volym`}
        style={{ width: '100%', accentColor: '#3E8E63', height: 22, cursor: disabled ? 'default' : 'pointer' }}
      />
    </label>
  )
}
