/* Målade UI-ikoner (public/art/icons/*.webp, ur förälderns Gemini-ark).
   Ersätter emojier i panelrubriker m.m. så gränssnittet matchar konsten. */

export type IconName =
  | 'svards' | 'stjarna' | 'las' | 'flagga' | 'grodd' | 'blixt' | 'bok' | 'timglas'
  | 'skold' | 'pokal' | 'rulle' | 'penna' | 'pratbubbla' | 'eld' | 'kugge' | 'kristall'
  | 'ljud' | 'ljud-av' | 'karta'

export function Icon({ name, size = 20, style }: { name: IconName; size?: number; style?: React.CSSProperties }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}art/icons/${name}.webp`}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      style={{
        display: 'inline-block', verticalAlign: 'middle', objectFit: 'contain', flexShrink: 0,
        filter: 'drop-shadow(0 1px 1px rgba(0,0,0,.3))', ...style,
      }}
    />
  )
}

/* Belöningsikoner (public/art/beloning/*.webp) — föräldern väljer en per
   belöning. Sparas som nyckel i reward.emoji. Äldre belöningar kan ha en
   riktig emoji i stället; isBelongIcon skiljer dem åt så vi kan visa båda. */
export const BELONING_ICONS = ['bio', 'glass', 'boll', 'spel', 'bok', 'bakverk', 'simning', 'konst', 'leksak'] as const
export const isBelongIcon = (v: string): boolean => (BELONING_ICONS as readonly string[]).includes(v)

export function BelongIcon({ name, size = 28, style }: { name: string; size?: number; style?: React.CSSProperties }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}art/beloning/${name}.webp`}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      style={{ display: 'inline-block', verticalAlign: 'middle', objectFit: 'contain', flexShrink: 0, ...style }}
    />
  )
}

/* Räkneobjekt och mönsterfigurer (public/art/objekt/*.webp) — används i
   genererade uppgifter (räkna föremål, fortsätt mönstret). Genereras med
   nyckel i stället för emoji; isObjektIcon känner igen dem. */
export const OBJEKT_ICONS = [
  'kula', 'kort', 'apple', 'klistermarke', 'snacka', 'kotte', 'boll', 'bulle',
  'cirkel-rod', 'cirkel-bla', 'stjarna-guld', 'mane', 'groda', 'anka',
  'ruta-gul', 'ruta-gron', 'ruta-bla', 'paron', 'citron',
] as const
export const isObjektIcon = (v: string): boolean => (OBJEKT_ICONS as readonly string[]).includes(v)

export function ObjektIcon({ name, size = 22, style }: { name: string; size?: number; style?: React.CSSProperties }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}art/objekt/${name}.webp`}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      style={{ display: 'inline-block', verticalAlign: 'middle', objectFit: 'contain', flexShrink: 0, ...style }}
    />
  )
}
