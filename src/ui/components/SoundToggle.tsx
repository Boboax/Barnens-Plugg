import { useState } from 'react'
import { isMuted, setMuted, sfx } from '../../sound'
import { Icon } from './Icon'

/** Ljud på/av — sparas mellan sessioner. */
export function SoundToggle() {
  const [muted, set] = useState(isMuted())
  return (
    <button
      className="chip"
      aria-label={muted ? 'Sätt på ljudet' : 'Stäng av ljudet'}
      onClick={() => {
        const next = !muted
        setMuted(next)
        set(next)
        if (!next) sfx.ratt()
      }}
    ><Icon name={muted ? 'ljud-av' : 'ljud'} size={18} /></button>
  )
}
