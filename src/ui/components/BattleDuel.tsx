import { useEffect, useState } from 'react'
import type { Boss } from '../../domain/types'
import type { PrototypeCloakId, PrototypeWeaponId } from '../../domain/character'
import { HeroImg } from './Icon'
import { BossPoseAnimator, type BossId } from './BossPoseAnimator'
import { ProductionPoseAnimatorV5 } from './ProductionPoseAnimatorV5'
import '../../styles/boss-pose.css'

export type BattleDuelState = 'idle' | 'hit' | 'attack' | 'defeat'
export type BattleDuelHeroPresentation = 'profile' | 'production-prototype'

/* Domändatan behåller sitt sedan tidigare publicerade "brakbjorren", medan
   rörelseprovet använder den visuella filidentifieraren "brakbjornen". */
function animatedBossId(id: string): BossId | undefined {
  if (id === 'brakbjorren') return 'brakbjornen'
  return ['tabelldraken', 'monsterormen', 'plottrig', 'stenjatten', 'procentspoket', 'vaxlartrollet'].includes(id) ? id as BossId : undefined
}

function BattleHero({ hero, state, reducedMotion, presentation, weapon, outfit }: {
  hero?: string
  state: BattleDuelState
  reducedMotion: boolean
  presentation: BattleDuelHeroPresentation
  weapon: PrototypeWeaponId
  outfit: PrototypeCloakId
}) {
  const motion = state === 'hit' ? 'attack' : state === 'attack' ? 'guard' : state === 'defeat' ? 'victory' : 'idle'
  if (presentation === 'production-prototype') {
    const poseSequence = state === 'attack' ? 'guard' : state === 'defeat' ? 'victory' : 'attack'
    return <div className="battle-duel__hero battle-duel__hero--production" aria-label="Hjälte med helkroppsposer i produktionsprov">
      <ProductionPoseAnimatorV5 mode={state === 'idle' ? 0 : 'play'} weapon={state === 'attack' || state === 'defeat' ? 'sun-blade' : weapon} outfit={state === 'attack' || state === 'defeat' ? 'light-armor' : outfit === 'star-cloak' ? 'star-cloak' : 'light-armor'} poseSequence={poseSequence} reducedMotion={reducedMotion} />
    </div>
  }
  return <div className={`battle-duel__hero battle-duel__hero--${motion}`} role="img" aria-label={motion === 'attack' ? 'Hjälten gör ett kontrollerat anfall' : motion === 'guard' ? 'Hjälten blockerar bossens anfall' : motion === 'victory' ? 'Hjälten firar segern' : 'Hjälten väntar'}>
    <HeroImg kind={hero ?? 'bagskytt'} variant="figur" />
  </div>
}

function BattleBoss({ boss, state, reducedMotion }: { boss: Pick<Boss, 'id' | 'name' | 'emoji'>; state: BattleDuelState; reducedMotion: boolean }) {
  const [broken, setBroken] = useState(false)
  const poseId = animatedBossId(boss.id)
  if (poseId && (state === 'hit' || state === 'attack')) {
    return <BossPoseAnimator bossId={poseId} sequence={state === 'attack' ? 'attack' : 'hit'} reducedMotion={reducedMotion} className="battle-duel__boss battle-boss-pose" />
  }
  const base = import.meta.env.BASE_URL
  const defeated = state === 'defeat'
  if (broken) return <span className={`battle-duel__boss battle-duel__boss--emoji battle-duel__boss--${defeated ? 'defeat' : 'idle'}`}>{boss.emoji}</span>
  return <img
    src={`${base}art/boss/${boss.id}${defeated ? '-besegrad' : ''}.webp`}
    alt={boss.name}
    className={`battle-duel__boss battle-duel__boss--image battle-duel__boss--${defeated ? 'defeat' : 'idle'}`}
    onError={() => setBroken(true)}
  />
}

/**
 * Rent presentationslager: samma duell används i riktig BattleScreen och i
 * den fristående demon. Den tar inte emot eller skriver någon spelstatus.
 */
export function BattleDuel({ boss, hero, state, reducedMotion = false, heroPresentation = 'profile', weapon = 'moon-bow', outfit = 'star-cloak' }: {
  boss: Pick<Boss, 'id' | 'name' | 'emoji'>
  hero?: string
  state: BattleDuelState
  reducedMotion?: boolean
  heroPresentation?: BattleDuelHeroPresentation
  weapon?: PrototypeWeaponId
  outfit?: PrototypeCloakId
}) {
  const [systemReducedMotion, setSystemReducedMotion] = useState(false)
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setSystemReducedMotion(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  const paused = reducedMotion || systemReducedMotion
  return <div className={`battle-duel${heroPresentation === 'production-prototype' ? ' battle-duel--production' : ''}${paused ? ' battle-duel--paused' : ''}`}>
    <BattleHero hero={hero} state={state} reducedMotion={paused} presentation={heroPresentation} weapon={weapon} outfit={outfit} />
    <BattleBoss boss={boss} state={state} reducedMotion={paused} />
  </div>
}
