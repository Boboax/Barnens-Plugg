import { useEffect, useRef, useState } from 'react'
import type { PrototypeWeaponId } from '../../domain/character'

export type ProductionPoseFrame = 0 | 1 | 2 | 3 | 4 | 5
export type ProductionPoseMode = 'play' | ProductionPoseFrame
export type ProductionPoseOutfit = 'star-cloak' | 'light-armor'
export type ProductionPoseSequence = 'attack' | 'guard' | 'victory'

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
  poseSequence = 'attack',
}: {
  reducedMotion?: boolean
  mode?: ProductionPoseMode
  weapon?: PrototypeWeaponId
  outfit?: ProductionPoseOutfit
  poseSequence?: ProductionPoseSequence
}) {
  const [systemReducedMotion, setSystemReducedMotion] = useState(false)
  const [frame, setFrame] = useState<ProductionPoseFrame>(0)
  const [previousFrame, setPreviousFrame] = useState<ProductionPoseFrame>(0)
  const frameRef = useRef<ProductionPoseFrame>(0)
  const paused = reducedMotion || systemReducedMotion
  const attackSequence = sequences[weapon]
  const reactionLabels = poseSequence === 'guard'
    ? ['Går i försvar', 'Blockerar och kliver undan', 'Återtar balansen']
    : ['Segern sjunker in', 'Jublar', 'Lugn segerpose']
  const reactionFrames: ProductionPoseFrame[] = poseSequence === 'guard' ? [0, 1, 2] : [3, 4, 5]
  const visibleFrames = poseSequence === 'attack' ? ([0, 1, 2, 3, 4, 5] as ProductionPoseFrame[]) : reactionFrames
  const labels = poseSequence === 'attack' ? attackSequence.labels : reactionLabels
  const timing = poseSequence === 'attack' ? attackSequence.timing : poseSequence === 'guard' ? [0, 300, 760] : [0, 380, 940]
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
      showFrame(poseSequence === 'guard' ? 1 : visibleFrames[visibleFrames.length - 1])
      return
    }
    if (mode !== 'play') {
      showFrame(visibleFrames[Math.min(mode, visibleFrames.length - 1)])
      return
    }
    showFrame(visibleFrames[0])
    const timers = timing.slice(1).map((delay, index) => window.setTimeout(() => showFrame(visibleFrames[index + 1]), delay))
    return () => timers.forEach(window.clearTimeout)
  }, [mode, paused, weapon, poseSequence])

  const isSword = weapon === 'sun-blade'
  const isLightArmor = outfit === 'light-armor'
  const spriteUrl = poseSequence === 'attack'
    ? `${import.meta.env.BASE_URL}art/prototype-v3/hero-${attackSequence.file}${isLightArmor ? '-light-armor' : ''}-motion-sheet-v3.webp`
    : `${import.meta.env.BASE_URL}art/prototype-v5/hero-sun-sword-light-armor-reactions-v5.webp`
  const position = (value: number) => `${(value % 3) * 50}% ${Math.floor(value / 3) * 100}%`
  const localFrame = Math.max(0, visibleFrames.indexOf(frame))
  const sequenceName = poseSequence === 'attack' ? (isSword ? 'Svärdsattack' : 'Bågattack') : poseSequence === 'guard' ? 'Fel svar, säker undanmanöver' : 'Seger'

  return <div
    className={`production-pose-v5${isSword ? ' production-pose-v5--sword' : ''}${paused ? ' production-pose-v5--paused' : ''}`}
    role="img"
    data-frame={localFrame}
    data-sheet-frame={frame}
    aria-label={paused ? `Stillpose: ${sequenceName}` : `${sequenceName}, fas ${localFrame + 1} av ${visibleFrames.length}: ${labels[localFrame]}`}
  >
    <div className="production-pose-v5__ground" aria-hidden="true" />
    <div className="production-pose-v5__sprite" style={{ backgroundImage: `url(${spriteUrl})`, backgroundPosition: position(previousFrame) }} />
    <div key={`${weapon}-${outfit}-${frame}`} className="production-pose-v5__sprite production-pose-v5__sprite--current" style={{ backgroundImage: `url(${spriteUrl})`, backgroundPosition: position(frame) }} />
    <span className="production-pose-v5__label" aria-hidden="true">Fas {localFrame + 1}/{visibleFrames.length} · {labels[localFrame]}</span>
  </div>
}
