import type { CampCatalogItem } from '../../../domain/camp'
import type { PetSpeciesId, PetStage } from '../../../domain/pet-home'

/* Bildvägar för Kvällslägret. Bor i UI-lagret eftersom base-path är en
   byggmiljöfråga (import.meta.env) som domänlagret inte får känna till. */

const base = import.meta.env.BASE_URL

export const campImage = (name: string): string => `${base}art/camp/${name}.webp`

/** Lyans målade knappikoner (art/camp/icons/). */
export const campIcon = (name: string): string => `${base}art/camp/icons/${name}.webp`

export const itemImage = (item: CampCatalogItem): string => `${base}art/camp/items/${item.art}.webp`

/** Stillbild av en art (laddningsbilden ur rörelseatlasen) — används även
    i upptäckten och Bokhörnan. */
export const petStill = (species: PetSpeciesId): string => campImage(`${species}-poster-v1`)

/** Bilden för ett tillväxtstadium (etapp 2). Stadie 3 är den vuxna
    vännens befintliga stillbild/sovbild. */
export const petStageImage = (species: PetSpeciesId, stage: PetStage, sleeping = false): string =>
  stage === 3
    ? campImage(sleeping ? `${species}-sleep-v1` : `${species}-poster-v1`)
    : campImage(`${species}-stage-${stage}${sleeping ? '-sleep' : ''}`)

export const worldImage = (worldId: string): string => `${base}art/world/${worldId}.webp`
