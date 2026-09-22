import { useEffect, useState } from 'react'
import type { ProductionPoseFrame, ProductionPoseMode } from './ProductionPoseAnimatorV5'

export type BossPoseSequence = 'attack' | 'hit' | 'defeat'
type BossFrame = 0 | 1 | 2 | 3 | 4 | 5

const playback: Record<BossPoseSequence, { frames: BossFrame[]; timing: number[] }> = {
  attack: { frames: [0, 1, 2], timing: [0, 360, 700] },
  hit: { frames: [0, 3, 4], timing: [0, 620, 930] },
  defeat: { frames: [3, 4, 5], timing: [0, 330, 720] },
}

const manualFrames: Record<BossPoseSequence, BossFrame[]> = {
  attack: [0, 1, 1, 2, 2, 2],
  hit: [0, 0, 0, 3, 4, 4],
  defeat: [3, 4, 5, 5, 5, 5],
}

export function BossPoseAnimator({
  sequence,
  mode = 'play',
  reducedMotion = false,
}: {
  sequence: BossPoseSequence
  mode?: ProductionPoseMode
  reducedMotion?: boolean
}) {
  const [frame, setFrame] = useState<BossFrame>(playback[sequence].frames[0])
  const [defeated, setDefeated] = useState(false)

  useEffect(() => {
    setDefeated(false)
    if (reducedMotion) {
      setFrame(sequence === 'attack' ? 2 : sequence === 'hit' ? 4 : 5)
      setDefeated(sequence === 'defeat')
      return
    }
    if (mode !== 'play') {
      const selected = manualFrames[sequence][mode as ProductionPoseFrame]
      setFrame(selected)
      setDefeated(sequence === 'defeat' && mode >= 2)
      return
    }
    const active = playback[sequence]
    setFrame(active.frames[0])
    const timers = active.timing.slice(1).map((delay, index) => window.setTimeout(() => setFrame(active.frames[index + 1]), delay))
    if (sequence === 'defeat') timers.push(window.setTimeout(() => setDefeated(true), 1080))
    return () => timers.forEach(window.clearTimeout)
  }, [mode, reducedMotion, sequence])

  const pose = `${import.meta.env.BASE_URL}art/prototype-v6/tabelldraken-battle-frame-${frame + 1}-v2.png`
  const finalPose = `${import.meta.env.BASE_URL}art/boss/tabelldraken-besegrad.webp`

  return <div className={`boss-pose boss-pose--${sequence}${reducedMotion ? ' boss-pose--paused' : ''}`} role="img" aria-label={sequence === 'attack' ? 'Tabelldraken anfaller' : sequence === 'hit' ? 'Tabelldraken träffas och ryggar tillbaka' : 'Tabelldraken besegras och somnar'}>
    <img key={`${sequence}-${frame}`} className="boss-pose__sprite" src={pose} alt="" />
    {sequence === 'attack' && <><span className="boss-pose__charge"/><span className="boss-pose__projectile"/><span className="boss-pose__block-impact"/></>}
    {sequence === 'hit' && <span className="boss-pose__hero-impact"/>}
    {sequence === 'defeat' && <img className={`boss-pose__defeated${defeated ? ' boss-pose__defeated--visible' : ''}`} src={finalPose} alt=""/>}
  </div>
}
