import { useEffect, useRef, useState } from 'react'
import type { PrototypeWeaponId } from '../../domain/character'

export type ProductionPoseFrame = 0 | 1 | 2 | 3 | 4 | 5
export type ProductionPoseMode = 'play' | ProductionPoseFrame
export type ProductionPoseOutfit = 'star-cloak' | 'light-armor'

const sequences: Record<PrototypeWeaponId, { labels: string[]; timing: number[]; file: string }> = {
  'moon-bow': {
    labels: ['Grundställning', 'Ladda pilen', 'Fullt drag', 'Släpp', 'Efterrörelse', 'Återhämtning'],
    timing: [0, 210, 520, 850, 1040, 1280],
    file: 'moon-bow',
  },
  'sun-blade': {
    labels: ['Grundställning', 'Vakt', 'Ladda slaget', 'Kontrollerat slag', 'Efterrörelse', 'Återhämtning'],
    timing: [0, 230, 510, 790, 1020, 1280],
    file: 'sun-sword',
  },
}

export function ProductionPoseAnimatorV5({
  reducedMotion = false,
  mode = 'play',
  weapon = 'moon-bow',
  outfit = 'star-cloak',
}: {
  reducedMotion?: boolean
  mode?: ProductionPoseMode
  weapon?: PrototypeWeaponId
  outfit?: ProductionPoseOutfit
}) {
  const [systemReducedMotion, setSystemReducedMotion] = useState(false)
  const [frame, setFrame] = useState<ProductionPoseFrame>(0)
  const [previousFrame, setPreviousFrame] = useState<ProductionPoseFrame>(0)
  const frameRef = useRef<ProductionPoseFrame>(0)
  const paused = reducedMotion || systemReducedMotion
  const sequence = sequences[weapon]
  const showFrame = (next: ProductionPoseFrame) => {
    setPreviousFrame(frameRef.current)
    frameRef.current = next
    setFrame(next)
  }

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
    const timers = sequence.timing.slice(1).map((delay, index) => window.setTimeout(() => showFrame((index + 1) as ProductionPoseFrame), delay))
    return () => timers.forEach(window.clearTimeout)
  }, [mode, paused, weapon])

  const isSword = weapon === 'sun-blade'
  const isLightArmor = outfit === 'light-armor'
  const spriteUrl = `${import.meta.env.BASE_URL}art/prototype-v3/hero-${sequence.file}${isLightArmor ? '-light-armor' : ''}-motion-sheet-v3.webp`
  const position = (value: number) => `${(value % 3) * 50}% ${Math.floor(value / 3) * 100}%`

  return <div
    className={`production-pose-v5${isSword ? ' production-pose-v5--sword' : ''}${paused ? ' production-pose-v5--paused' : ''}`}
    role="img"
    data-frame={frame}
    aria-label={paused ? `Stillpose med ${isSword ? 'solklingan' : 'månbågen'}` : `${isSword ? 'Svärdssekvens' : 'Bågsekvens'}, fas ${frame + 1} av 6: ${sequence.labels[frame]}`}
  >
    <div className="production-pose-v5__ground" aria-hidden="true" />
    <div className="production-pose-v5__sprite" style={{ backgroundImage: `url(${spriteUrl})`, backgroundPosition: position(previousFrame) }} />
    <div key={`${weapon}-${outfit}-${frame}`} className="production-pose-v5__sprite production-pose-v5__sprite--current" style={{ backgroundImage: `url(${spriteUrl})`, backgroundPosition: position(frame) }} />
    <span className="production-pose-v5__label" aria-hidden="true">Fas {frame + 1}/6 · {sequence.labels[frame]}</span>
  </div>
}
