import { useEffect, useState } from 'react'
import { petSpecies, type PetSpeciesId } from '../../../domain/pet-home'
import { campImage, petStill } from './campArt'

/* Husdjuret i lägret: en 4×4-atlas med sexton individuellt målade poser
   som stegas med CSS (camp.css: pet-pose-idle/-greeting). Ingen gungning
   av hela bilden — djuret ska se levande ut, inte som ett klistermärke.
   Stillbilden visas tills atlasen laddats (iPad på mobilnät), och en
   sovande vän är alltid stilla. */
export function PetSprite({ species, greeting = false, resting = false }: {
  species: PetSpeciesId
  greeting?: boolean
  resting?: boolean
}) {
  const kind = petSpecies(species)
  const atlas = campImage(`${kind.id}-motion-v1`)
  const [loaded, setLoaded] = useState('')

  useEffect(() => {
    let active = true
    const img = new Image()
    img.onload = () => { if (active) setLoaded(atlas) }
    img.src = atlas
    return () => { active = false; img.onload = null }
  }, [atlas])

  if (resting) {
    return <img className="pet-sleep-pose" src={campImage(`${kind.id}-sleep-v1`)} alt={`${kind.name} sover`} />
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
