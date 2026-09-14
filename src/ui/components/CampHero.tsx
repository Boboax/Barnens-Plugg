import { useId } from 'react'
import type { ChildProfile } from '../../domain/types'
import { OUTFITS } from '../../domain/camp'

/** Separat mantellager lämnar befintlig hjälte, ansikte och rustning orörda. */
export function CampHero({child,outfitId}:{child:ChildProfile;outfitId?:string}) {
 const id=useId(),outfit=OUTFITS.find(o=>o.id===(outfitId??child.petProgress?.outfit))??OUTFITS[0]
 return <div className="camp-hero" role="img" aria-label={`${child.name} i ${outfit.name.toLowerCase()}`}>
  <svg viewBox="0 0 400 640" aria-hidden="true" className="camp-cloak">
   <defs><linearGradient id={id}><stop stopColor="#152024"/><stop offset=".4" stopColor={outfit.color}/><stop offset=".7" stopColor={outfit.color}/><stop offset="1" stopColor="#18222b"/></linearGradient></defs>
   <path d="M160 135 Q200 114 254 135 C292 202 300 391 349 566 Q285 600 244 575 Q204 610 163 576 Q113 602 51 565 C115 351 111 216 160 135Z" fill={`url(#${id})`} stroke={outfit.trim} strokeWidth="5"/>
   <path d="M152 168 Q145 386 90 553 M253 173 Q267 398 314 560 M172 210 Q184 400 163 562" fill="none" stroke="#fff" opacity=".12" strokeWidth="7"/>
   {outfit.id==='starlight'&&<g fill={outfit.trim}><path d="m91 469 3 9 9 3-9 3-3 9-3-9-9-3 9-3z"/><path d="m310 499 3 9 9 3-9 3-3 9-3-9-9-3 9-3z"/></g>}
  </svg>
  <img src={`${import.meta.env.BASE_URL}art/hero/${child.hero??'bagskytt'}.webp`} alt=""/>
 </div>
}

