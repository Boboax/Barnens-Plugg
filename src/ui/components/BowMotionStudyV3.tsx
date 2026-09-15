import { useEffect, useRef, useState } from 'react'
import type { PrototypeWeaponId } from '../../domain/character'

type MotionMode = 'play' | 0 | 1 | 2 | 3 | 4 | 5
type OutfitMode = 'star-cloak' | 'light-armor'

const bowLabels = ['Grundställning', 'Ladda pilen', 'Fullt drag', 'Släpp', 'Efterrörelse', 'Återhämtning']
const swordLabels = ['Grundställning', 'Vakt', 'Ladda slaget', 'Kontrollerat slag', 'Efterrörelse', 'Återhämtning']

export function BowMotionStudyV3({ reducedMotion = false, mode = 'play', weapon = 'moon-bow', outfit = 'star-cloak' }: { reducedMotion?: boolean; mode?: MotionMode; weapon?: PrototypeWeaponId; outfit?: OutfitMode }) {
  const [systemReducedMotion, setSystemReducedMotion] = useState(false)
  const [frame, setFrame] = useState(0)
  const [previousFrame, setPreviousFrame] = useState(0)
  const frameRef = useRef(0)
  const paused = reducedMotion || systemReducedMotion
  const showFrame = (next: number) => { setPreviousFrame(frameRef.current); frameRef.current = next; setFrame(next) }

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setSystemReducedMotion(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (paused) {
      showFrame(5)
      return
    }
    if (mode !== 'play') {
      showFrame(mode)
      return
    }
    showFrame(0)
    const timing = [150, 390, 660, 880, 1120]
    const timers = timing.map((delay, index) => window.setTimeout(() => showFrame(index + 1), delay))
    return () => timers.forEach(window.clearTimeout)
  }, [mode, paused])

  const column = frame % 3
  const row = Math.floor(frame / 3)
  const isSword = weapon === 'sun-blade'
  const isLightArmor = outfit === 'light-armor'
  const labels = isSword ? swordLabels : bowLabels
  const spriteUrl = `${import.meta.env.BASE_URL}art/prototype-v3/hero-${isSword ? 'sun-sword' : 'moon-bow'}${isLightArmor ? '-light-armor' : ''}-motion-sheet-v3.webp`
  const position = (number: number) => `${(number % 3) * 50}% ${Math.floor(number / 3) * 100}%`
  return <div
    className={`bow-motion-study-v3${isSword ? ' bow-motion-study-v3--sword' : ''}${paused ? ' bow-motion-study-v3--paused' : ''}`}
    role="img"
    aria-label={paused ? `Stillpose: hjälten i avslappnad återhämtning med ${isSword ? 'svärdet' : 'bågen'} säkert sänkt` : `${isSword ? 'Svärdssekvens' : 'Bågsekvens'}, fas ${frame + 1} av 6: ${labels[frame]}`}
  >
    <div className="bow-motion-study-v3__sprite" style={{ backgroundImage: `url(${spriteUrl})`, backgroundPosition: position(previousFrame) }} />
    <div key={frame} className="bow-motion-study-v3__sprite bow-motion-study-v3__sprite--current" style={{ backgroundImage: `url(${spriteUrl})`, backgroundPosition: `${column * 50}% ${row * 100}%` }} />
    <span className="bow-motion-study-v3__label" aria-hidden="true">{labels[frame]}</span>
  </div>
}
