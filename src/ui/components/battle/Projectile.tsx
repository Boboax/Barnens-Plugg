import type { HeroKind } from '../../../domain/types'

/* Anfallen som flyger över skärmen: hjältens från vänster till höger,
   bossens från höger till vänster. Målade projektiler ligger i art/battle/;
   saknas en bild (ny boss eller hjälte) ritas anfallet som en ljuseffekt i
   CSS, så striden aldrig står utan anfall. */

/** Levererade projektilbilder, nyckel = filnamnets del efter "proj-". */
const PROJECTILE_ART: Readonly<Record<string, string>> = {
  pil: 'proj-pil.webp',
  svardsvag: 'proj-svardsvag.webp',
  trollkula: 'proj-trollkula.webp',
  vaxlartrollet: 'proj-vaxlartrollet.webp',
  tabelldraken: 'proj-tabelldraken.webp',
  brakbjorren: 'proj-brakbjorren.webp',
  monsterormen: 'proj-monsterormen.webp',
  stenjatten: 'proj-stenjatten.webp',
  plottrig: 'proj-plottrig.webp',
  procentspoket: 'proj-procentspoket.webp',
}

const HERO_PROJECTILE: Record<HeroKind, string> = { bagskytt: 'pil', riddare: 'svardsvag', trollkarl: 'trollkula' }

/** Bossens anfallsfärg för CSS-reserven — bossens egen ton. */
const BOSS_TINT: Record<string, string> = {
  vaxlartrollet: '#F2C14E',
  tabelldraken: '#FF8A3D',
  brakbjorren: '#E9B46A',
  monsterormen: '#4FD18B',
  stenjatten: '#9FB4C7',
  plottrig: '#6C7BE0',
  procentspoket: '#A8E4FF',
}

export function Projectile({ from, hero = 'bagskytt', bossId }: {
  from: 'hero' | 'boss'
  hero?: HeroKind
  bossId: string
}) {
  const kind = from === 'hero' ? HERO_PROJECTILE[hero] : bossId
  const art = PROJECTILE_ART[kind]
  return (
    <div className={`battle-projectile battle-projectile--from-${from}`} aria-hidden="true">
      {art
        ? <img src={`${import.meta.env.BASE_URL}art/battle/${art}`} alt="" />
        : <span
            className={`battle-projectile__fx battle-projectile__fx--${from === 'hero' ? kind : 'boss'}`}
            style={from === 'boss' ? { '--tint': BOSS_TINT[bossId] ?? '#F2C14E' } as React.CSSProperties : undefined}
          />}
    </div>
  )
}
