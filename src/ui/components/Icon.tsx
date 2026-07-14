/* Målade UI-ikoner (public/art/icons/*.webp, ur förälderns Gemini-ark).
   Ersätter emojier i panelrubriker m.m. så gränssnittet matchar konsten. */

export type IconName =
  | 'svards' | 'stjarna' | 'las' | 'flagga' | 'grodd' | 'blixt' | 'bok' | 'timglas'
  | 'skold' | 'pokal' | 'rulle' | 'penna' | 'pratbubbla' | 'eld' | 'kugge' | 'kristall'

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
