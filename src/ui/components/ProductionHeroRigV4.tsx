import type { CharacterMotion, PrototypeWeaponId } from '../../domain/character'

const art = (name: string) => `${import.meta.env.BASE_URL}art/prototype-v4/rig/${name}`

export function ProductionHeroRigV4({ weapon, motion, cloak, reducedMotion = false }: { weapon: PrototypeWeaponId; motion: CharacterMotion; cloak: boolean; reducedMotion?: boolean }) {
  const sword = weapon === 'sun-blade'
  return <div className={`production-hero-rig production-hero-rig--${motion}${sword ? ' production-hero-rig--sword' : ' production-hero-rig--bow'}${cloak ? ' production-hero-rig--cloak' : ''}${reducedMotion ? ' production-hero-rig--paused' : ''}`} role="img" aria-label={`Produktionsrigg v4: ${sword ? 'solklinga' : 'månbåge'}, ${cloak ? 'stjärnmantel' : 'lätt rustning'}, ${motion}`}>
    <span className="production-hero-rig__shadow" />
    {cloak && <img className="production-hero-rig__cloak" src={art('star-cloak-clean.webp')} alt="" aria-hidden="true" />}
    <img className="production-hero-rig__body" src={art('body-core.webp')} alt="" aria-hidden="true" />
    <div className="production-hero-rig__arm production-hero-rig__arm--left">
      <img src={art('arm-left-upper.webp')} alt="" aria-hidden="true" />
      <div className="production-hero-rig__forearm"><img src={art('arm-left-lower.webp')} alt="" aria-hidden="true" />{!sword && <img className="production-hero-rig__weapon production-hero-rig__weapon--bow" src={art('moon-bow-clean.webp')} alt="" aria-hidden="true" />}</div>
    </div>
    <div className="production-hero-rig__arm production-hero-rig__arm--right">
      <img src={art('arm-right-upper.webp')} alt="" aria-hidden="true" />
      <div className="production-hero-rig__forearm"><img src={art('arm-right-lower.webp')} alt="" aria-hidden="true" />{sword && <img className="production-hero-rig__weapon production-hero-rig__weapon--sword" src={art('sun-sword-clean.webp')} alt="" aria-hidden="true" />}</div>
    </div>
  </div>
}
