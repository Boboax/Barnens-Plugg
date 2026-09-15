import type { CharacterMotion, PrototypeCloakId, PrototypeWeaponId } from '../../domain/character'

export interface ModularHeroRigProps {
  weapon: PrototypeWeaponId
  cloak: PrototypeCloakId
  motion: CharacterMotion
  reducedMotion?: boolean
}

const atlas = `${import.meta.env.BASE_URL}art/prototype-v2/rig-v2/hero-modular-atlas-v2.webp`
const parts = {
  head: [203, 7, 257, 273], torso: [553, 4, 369, 333], pelvis: [976, 103, 257, 176],
  'upper-arm-left': [232, 275, 165, 169], 'forearm-left': [428, 278, 145, 236],
  'upper-arm-right': [887, 275, 161, 169], 'forearm-right': [1108, 278, 148, 233],
  'thigh-left': [245, 449, 152, 252], 'shin-left': [470, 435, 168, 257],
  'thigh-right': [870, 437, 160, 260], 'shin-right': [1086, 447, 166, 252],
  'cloak-collar': [49, 709, 252, 202], 'cloak-left': [301, 686, 251, 322],
  'cloak-center': [566, 676, 346, 332], 'cloak-right': [928, 685, 255, 324],
  'moon-bow': [1247, 542, 140, 469], 'sun-blade': [1369, 524, 162, 489],
} as const

type PartName = keyof typeof parts

function Part({ name, className = '' }: { name: PartName; className?: string }) {
  const [x, y, width, height] = parts[name]
  return <svg className={className} viewBox={`${x} ${y} ${width} ${height}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    <image href={atlas} width="1536" height="1024" />
  </svg>
}

/**
 * Hierarkisk 2D-rigg för v2-provet. Underben följer lår, underarm följer
 * överarm och vapen följer handen. Alla rasterdelar har äkta alfakanal.
 */
export function ModularHeroRig({ weapon, cloak, motion, reducedMotion = false }: ModularHeroRigProps) {
  const pose = reducedMotion ? 'idle' : motion
  const weaponAsset = weapon === 'moon-bow' ? 'moon-bow' : 'sun-blade'
  const weaponName = weapon === 'moon-bow' ? 'Månbågen' : 'Solklingan'
  const cloakName = cloak === 'star-cloak' ? 'stjärnmanteln' : 'skogsmanteln'

  return <div className={`modular-hero modular-hero--${pose} modular-hero--${weapon} modular-hero--${cloak}${reducedMotion ? ' modular-hero--paused' : ''}`} role="img" aria-label={`Modulär v2-hjälte med ${weaponName} och ${cloakName}`}>
    <div className="modular-hero__shadow" />
    <div className="modular-hero__cloak" aria-hidden="true">
      <Part className="modular-hero__cloak-left" name="cloak-left" />
      <Part className="modular-hero__cloak-center" name="cloak-center" />
      <Part className="modular-hero__cloak-right" name="cloak-right" />
    </div>
    <div className="modular-hero__pelvis">
      <div className="modular-hero__leg modular-hero__leg--left">
        <Part name="thigh-left" />
        <div className="modular-hero__shin"><Part name="shin-left" /></div>
      </div>
      <div className="modular-hero__leg modular-hero__leg--right">
        <Part name="thigh-right" />
        <div className="modular-hero__shin"><Part name="shin-right" /></div>
      </div>
      <Part className="modular-hero__pelvis-art" name="pelvis" />
    </div>
    <div className="modular-hero__torso">
      <div className="modular-hero__arm modular-hero__arm--left">
        <Part name="upper-arm-left" />
        <div className="modular-hero__forearm">
          <Part name="forearm-left" />
          <Part className="modular-hero__weapon" name={weaponAsset} />
        </div>
      </div>
      <Part className="modular-hero__torso-art" name="torso" />
      <div className="modular-hero__arm modular-hero__arm--right">
        <Part name="upper-arm-right" />
        <div className="modular-hero__forearm"><Part name="forearm-right" /></div>
      </div>
      <Part className="modular-hero__head" name="head" />
      <Part className="modular-hero__collar" name="cloak-collar" />
    </div>
  </div>
}
