import { useEffect, useState } from 'react'
import { petSpecies, type PetSpeciesId, type PetStage } from '../../../domain/pet-home'
import { campImage, hasPetAnimation, petAnimation, petStageImage, petStill } from './campArt'

/* Husdjuret i lägret — samma figur överallt (lägret, lyan, tittut).

   Tre lager, från bäst till enklast, så att vännen ALLTID rör sig:
   1. Målade bildrutor per handling (vila, äta, klapp, lek, glad, sova) och
      ålder: en remsa med fyra rutor som stegas med CSS (camp.css: pet-strip-*).
      Används så fort remsan finns (campArt: hasPetAnimation).
   2. Den vuxnas 4×4-atlas med sexton målade poser (andas, blinkar, myser).
   3. En målad stillbild som ändå lever: magen andas för sig (ett maskat
      andra lager som sväller mjukt) och hela kroppen rör sig efter åldern —
      ungen vinglar, den unga är pigg, följeslagaren lugn (camp.css).
   Stillbilden visas också tills en atlas hunnit laddas (iPad på mobilnät). */

/** Det vännen gör just nu — styr vilken rörelse som spelas. */
export type PetAction = 'idle' | 'eat' | 'pet' | 'play' | 'happy' | 'sleep'

export function PetSprite({ species, stage = 3, action = 'idle', greeting = false, resting = false }: {
  species: PetSpeciesId
  stage?: PetStage
  action?: PetAction
  /** Äldre sätt att säga "glad" (lägret vid elden). */
  greeting?: boolean
  resting?: boolean
}) {
  const kind = petSpecies(species)
  const doing: PetAction = resting ? 'sleep' : action === 'idle' && greeting ? 'happy' : action
  const atlas = campImage(`${kind.id}-motion-v1`)
  const [loaded, setLoaded] = useState('')
  const useAtlas = stage === 3 && doing !== 'sleep' && !hasPetAnimation(kind.id, stage, doing)

  useEffect(() => {
    if (!useAtlas) return
    let active = true
    const img = new Image()
    img.onload = () => { if (active) setLoaded(atlas) }
    img.src = atlas
    return () => { active = false; img.onload = null }
  }, [atlas, useAtlas])

  // 1. Målade bildrutor för just den här handlingen och åldern.
  if (hasPetAnimation(kind.id, stage, doing)) {
    return (
      <div
        role="img"
        aria-label={doing === 'sleep' ? `${kind.name} sover` : kind.name}
        className={`pet-strip pet-strip--${doing}`}
        style={{ backgroundImage: `url(${petAnimation(kind.id, stage, doing)})` }}
      />
    )
  }

  // 2. Den vuxnas atlas (vila och glad).
  if (useAtlas) {
    const ready = loaded === atlas
    const happy = doing !== 'idle'
    const classes = ['pet-sprite', `pet-sprite-${kind.id}`, ready && 'pet-sprite-ready', happy && 'pet-sprite-greeting']
    return (
      <div
        role="img"
        aria-label={kind.name}
        className={classes.filter(Boolean).join(' ')}
        style={{ backgroundImage: `url(${ready ? atlas : petStill(kind.id)})` }}
      />
    )
  }

  // 3. Stillbild som andas: magen sväller och sjunker i ett eget lager.
  const sleeping = doing === 'sleep'
  const src = stage === 3 && sleeping ? campImage(`${kind.id}-sleep-v1`) : petStageImage(kind.id, stage, sleeping)
  return (
    <span
      role="img"
      aria-label={sleeping ? `${kind.name} sover` : kind.name}
      className={`pet-still pet-still--stage-${stage}${sleeping ? ' pet-still--sleeping' : ''}${!sleeping && doing !== 'idle' ? ' pet-still--greeting' : ''}`}
    >
      <img className="pet-still__img" src={src} alt="" draggable={false} />
      <img className="pet-still__belly" src={src} alt="" draggable={false} aria-hidden="true" />
    </span>
  )
}
