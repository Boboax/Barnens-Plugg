import { useId } from 'react'
import type { ChildProfile } from '../../../domain/types'
import { outfitById } from '../../../domain/camp'

/* Hjälten i lägret med vald mantel. Manteln är ett eget SVG-lager BAKOM
   den målade hjältebilden, så ansikte, rustning och vapen lämnas orörda
   och samma hjältebild duger för alla mantlar. */

// Bågskyttens silhuett är smalare och har båge och koger utanför kroppen.
// Manteln fäster därför vid axlarna och vidgas mindre vid benen — annars
// stack den ut som en generisk, för bred kappa.
const ARCHER_CLOAK = 'M166 157 Q205 138 264 158 C281 230 286 337 316 510 Q286 559 248 544 '
  + 'Q216 571 181 545 Q143 560 112 529 C143 367 139 235 166 157Z'
const WIDE_CLOAK = 'M160 135 Q200 114 254 135 C292 202 300 391 349 566 Q285 600 244 575 '
  + 'Q204 610 163 576 Q113 602 51 565 C115 351 111 216 160 135Z'
const CLOAK_FOLDS = 'M152 168 Q145 386 90 553 M253 173 Q267 398 314 560 M172 210 Q184 400 163 562'
const starPath = (x: number, y: number) =>
  `m${x} ${y} 3 9 9 3-9 3-3 9-3-9-9-3 9-3z`

export function CampHero({ child, outfitId }: { child: ChildProfile; outfitId?: string }) {
  const gradientId = useId()
  const outfit = outfitById(outfitId ?? child.petProgress.outfit)
  const hero = child.hero ?? 'bagskytt'
  return (
    <div className="camp-hero" role="img" aria-label={`${child.name} i ${outfit.name.toLowerCase()}`}>
      <svg viewBox="0 0 400 640" aria-hidden="true" className="camp-cloak">
        <defs>
          <linearGradient id={gradientId}>
            <stop stopColor="#152024" />
            <stop offset=".4" stopColor={outfit.color} />
            <stop offset=".7" stopColor={outfit.color} />
            <stop offset="1" stopColor="#18222b" />
          </linearGradient>
        </defs>
        <path d={hero === 'bagskytt' ? ARCHER_CLOAK : WIDE_CLOAK} fill={`url(#${gradientId})`}
          stroke={outfit.trim} strokeWidth="5" />
        <path d={CLOAK_FOLDS} fill="none" stroke="#fff" opacity=".12" strokeWidth="7" />
        {outfit.id === 'starlight' && (
          <g fill={outfit.trim}>
            <path d={starPath(91, 469)} />
            <path d={starPath(310, 499)} />
          </g>
        )}
      </svg>
      <img src={`${import.meta.env.BASE_URL}art/hero/${hero}.webp`} alt="" />
    </div>
  )
}
