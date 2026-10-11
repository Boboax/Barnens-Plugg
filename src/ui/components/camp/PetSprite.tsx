import { useEffect, useState } from 'react'
import { petSpecies, type PetSpeciesId, type PetStage } from '../../../domain/pet-home'
import { campImage, petStageImage, petStill } from './campArt'

/* Husdjuret i lägret. Stadie 3 ("vuxen") har en 4×4-atlas med sexton
   individuellt målade poser som stegas med CSS (camp.css: pet-pose-idle/
   -greeting) — djuret ska se levande ut, inte som ett klistermärke.
   Stillbilden visas tills atlasen laddats (iPad på mobilnät).

   Stadie 1, 2 och 4 (etapp 2) är en målad bild per stadium som andas
   mjukt med CSS. De bilderna fyller hela rutan, så de skalas per stadium
   (camp.css: pet-still--stage-N) — ungen ser liten ut bredvid vuxna vänner.
   En sovande vän är alltid stilla. */
export function PetSprite({ species, stage = 3, greeting = false, resting = false }: {
  species: PetSpeciesId
  stage?: PetStage
  greeting?: boolean
  resting?: boolean
}) {
  const kind = petSpecies(species)
  const atlas = campImage(`${kind.id}-motion-v1`)
  const [loaded, setLoaded] = useState('')
  const animated = stage === 3

  useEffect(() => {
    if (!animated) return
    let active = true
    const img = new Image()
    img.onload = () => { if (active) setLoaded(atlas) }
    img.src = atlas
    return () => { active = false; img.onload = null }
  }, [atlas, animated])

  if (!animated) {
    return (
      <img
        className={`pet-still pet-still--stage-${stage}${resting ? ' pet-still--sleeping' : ''}${greeting && !resting ? ' pet-still--greeting' : ''}`}
        src={petStageImage(kind.id, stage, resting)}
        alt={resting ? `${kind.name} sover` : kind.name}
        draggable={false}
      />
    )
  }
  if (resting) {
    return <img className="pet-sleep-pose" src={campImage(`${kind.id}-sleep-v1`)} alt={`${kind.name} sover`} draggable={false} />
  }
  const ready = loaded === atlas
  const classes = ['pet-sprite', `pet-sprite-${kind.id}`, ready && 'pet-sprite-ready', greeting && 'pet-sprite-greeting']
  return (
    <div
      role="img"
      aria-label={kind.name}
      className={classes.filter(Boolean).join(' ')}
      style={{ backgroundImage: `url(${ready ? atlas : petStill(kind.id)})` }}
    />
  )
}
