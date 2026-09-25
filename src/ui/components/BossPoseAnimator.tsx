import { useEffect, useState } from 'react'
import type { ProductionPoseFrame, ProductionPoseMode } from './ProductionPoseAnimatorV5'

export type BossPoseSequence = 'attack' | 'hit' | 'defeat'
export type BossId = 'tabelldraken' | 'brakbjornen' | 'monsterormen' | 'plottrig' | 'stenjatten' | 'procentspoket' | 'vaxlartrollet'
type BossAnimation = { frames: number[]; timing: number[] }
type BossConfig = {
  name: string
  attackLabel: string
  frames: string[]
  finalPose: string
  playback?: Partial<Record<BossPoseSequence, BossAnimation>>
  manualFrames?: Partial<Record<BossPoseSequence, number[]>>
}

const bosses: Record<BossId, BossConfig> = {
  tabelldraken: {
    name: 'Tabelldraken',
    attackLabel: 'Tabelldraken anfaller',
    frames: [1, 2, 3, 4, 5, 6].map((frame) => `art/prototype-v6/tabelldraken-battle-frame-${frame}-v2.png`),
    finalPose: 'art/boss/tabelldraken-besegrad.webp',
  },
  brakbjornen: {
    name: 'Bråkbjörnen',
    attackLabel: 'Bråkbjörnen anfaller med bråkskölden',
    frames: [
      'art/boss/brakbjorren.webp',
      'art/prototype-v7/brakbjornen-battle-frame-2-v1.png',
      'art/prototype-v7/brakbjornen-battle-frame-3-v1.png',
      'art/prototype-v7/brakbjornen-battle-frame-4-v1.png',
      'art/prototype-v7/brakbjornen-battle-frame-5-v1.png',
      'art/boss/brakbjorren-besegrad.webp',
    ],
    finalPose: 'art/boss/brakbjorren-besegrad.webp',
  },
  monsterormen: {
    name: 'Mönsterormen',
    attackLabel: 'Mönsterormen anfaller med en runprojektil',
    frames: [
      'art/boss/monsterormen.webp',
      'art/prototype-v8/monsterormen-battle-frame-2-v1.png',
      'art/prototype-v8/monsterormen-battle-frame-2b-v1.png',
      'art/prototype-v8/monsterormen-battle-frame-3-v1.png',
      'art/prototype-v8/monsterormen-battle-frame-4-v1.png',
      'art/prototype-v8/monsterormen-battle-frame-5-v1.png',
      'art/boss/monsterormen-besegrad.webp',
    ],
    finalPose: 'art/boss/monsterormen-besegrad.webp',
    playback: {
      attack: { frames: [0, 1, 2, 3], timing: [0, 270, 520, 800] },
      hit: { frames: [0, 4, 5], timing: [0, 620, 930] },
      defeat: { frames: [4, 5, 6], timing: [0, 330, 720] },
    },
    manualFrames: {
      attack: [0, 1, 2, 3, 3, 3],
      hit: [0, 0, 0, 4, 5, 5],
      defeat: [4, 5, 6, 6, 6, 6],
    },
  },
  plottrig: {
    name: 'Plottrig',
    attackLabel: 'Plottrig ritar iväg ett virrigt diagram',
    frames: [
      'art/boss/plottrig.webp',
      'art/prototype-v9/plottrig-battle-frame-2-v1.png',
      'art/prototype-v9/plottrig-battle-frame-3-v1.png',
      'art/prototype-v9/plottrig-battle-frame-4-v1.png',
      'art/prototype-v9/plottrig-battle-frame-5-v1.png',
      'art/boss/plottrig-besegrad.webp',
    ],
    finalPose: 'art/boss/plottrig-besegrad.webp',
  },
  stenjatten: {
    name: 'Stenjätten',
    attackLabel: 'Stenjätten slår iväg en lysande runsten',
    frames: [
      'art/boss/stenjatten.webp',
      'art/prototype-v10/stenjatten-battle-frame-2-v1.png',
      'art/prototype-v10/stenjatten-battle-frame-3-v1.png',
      'art/prototype-v10/stenjatten-battle-frame-4-v1.png',
      'art/prototype-v10/stenjatten-battle-frame-5-v1.png',
      'art/boss/stenjatten-besegrad.webp',
    ],
    finalPose: 'art/boss/stenjatten-besegrad.webp',
  },
  procentspoket: {
    name: 'Procentspöket',
    attackLabel: 'Procentspöket kastar en lysande procentvirvel',
    frames: [
      'art/boss/procentspoket.webp',
      'art/prototype-v11/procentspoket-battle-frame-2-v1.png',
      'art/prototype-v11/procentspoket-battle-frame-3-v1.png',
      'art/prototype-v11/procentspoket-battle-frame-4-v1.png',
      'art/prototype-v11/procentspoket-battle-frame-5-v1.png',
      'art/boss/procentspoket-besegrad.webp',
    ],
    finalPose: 'art/boss/procentspoket-besegrad.webp',
  },
  vaxlartrollet: {
    name: 'Växlartrollet',
    attackLabel: 'Växlartrollet slår iväg en lysande tioruna',
    frames: [
      'art/boss/vaxlartrollet.webp',
      'art/prototype-v12/vaxlartrollet-battle-frame-2-v1.png',
      'art/prototype-v12/vaxlartrollet-battle-frame-3-v1.png',
      'art/prototype-v12/vaxlartrollet-battle-frame-4-v1.png',
      'art/prototype-v12/vaxlartrollet-battle-frame-5-v1.png',
      'art/boss/vaxlartrollet-besegrad.webp',
    ],
    finalPose: 'art/boss/vaxlartrollet-besegrad.webp',
  },
}

const defaultPlayback: Record<BossPoseSequence, BossAnimation> = {
  attack: { frames: [0, 1, 2], timing: [0, 360, 700] },
  hit: { frames: [0, 3, 4], timing: [0, 620, 930] },
  defeat: { frames: [3, 4, 5], timing: [0, 330, 720] },
}

const defaultManualFrames: Record<BossPoseSequence, number[]> = {
  attack: [0, 1, 1, 2, 2, 2],
  hit: [0, 0, 0, 3, 4, 4],
  defeat: [3, 4, 5, 5, 5, 5],
}

export function BossPoseAnimator({
  bossId = 'tabelldraken',
  sequence,
  mode = 'play',
  reducedMotion = false,
}: {
  bossId?: BossId
  sequence: BossPoseSequence
  mode?: ProductionPoseMode
  reducedMotion?: boolean
}) {
  const boss = bosses[bossId]
  const activePlayback = boss.playback?.[sequence] ?? defaultPlayback[sequence]
  const activeManualFrames = boss.manualFrames?.[sequence] ?? defaultManualFrames[sequence]
  const [frame, setFrame] = useState(activePlayback.frames[0])
  const [defeated, setDefeated] = useState(false)

  useEffect(() => {
    setDefeated(false)
    if (reducedMotion) {
      setFrame(activePlayback.frames.at(-1) ?? activePlayback.frames[0])
      setDefeated(sequence === 'defeat')
      return
    }
    if (mode !== 'play') {
      const selected = activeManualFrames[mode as ProductionPoseFrame]
      setFrame(selected)
      setDefeated(sequence === 'defeat' && mode >= 2)
      return
    }
    setFrame(activePlayback.frames[0])
    const timers = activePlayback.timing.slice(1).map((delay, index) => window.setTimeout(() => setFrame(activePlayback.frames[index + 1]), delay))
    if (sequence === 'defeat') timers.push(window.setTimeout(() => setDefeated(true), 1080))
    return () => timers.forEach(window.clearTimeout)
  }, [activeManualFrames, activePlayback, mode, reducedMotion, sequence])

  const pose = `${import.meta.env.BASE_URL}${boss.frames[frame]}`
  const finalPose = `${import.meta.env.BASE_URL}${boss.finalPose}`

  return <div className={`boss-pose boss-pose--${bossId} boss-pose--${sequence}${reducedMotion ? ' boss-pose--paused' : ''}`} role="img" aria-label={sequence === 'attack' ? boss.attackLabel : sequence === 'hit' ? `${boss.name} träffas och ryggar tillbaka` : `${boss.name} besegras`}>
    <img key={`${sequence}-${frame}`} className={`boss-pose__sprite${defeated ? ' boss-pose__sprite--defeated' : ''}`} src={pose} alt="" />
    {sequence === 'attack' && <><span className="boss-pose__charge"/><span className="boss-pose__projectile"/><span className="boss-pose__block-impact"/></>}
    {sequence === 'hit' && <span className="boss-pose__hero-impact"/>}
    {sequence === 'defeat' && <img className={`boss-pose__defeated${defeated ? ' boss-pose__defeated--visible' : ''}`} src={finalPose} alt=""/>}
  </div>
}
