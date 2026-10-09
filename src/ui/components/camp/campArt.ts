import type { CampCatalogItem } from '../../../domain/camp'
import type { PetSpeciesId } from '../../../domain/pet-home'

/* Bildvägar för Kvällslägret. Bor i UI-lagret eftersom base-path är en
   byggmiljöfråga (import.meta.env) som domänlagret inte får känna till. */

const base = import.meta.env.BASE_URL

export const campImage = (name: string): string => `${base}art/camp/${name}.webp`

export const itemImage = (item: CampCatalogItem): string => `${base}art/camp/items/${item.art}.webp`

/** Stillbild av en art (laddningsbilden ur rörelseatlasen) — används även
    i upptäckten och Bokhörnan. */
export const petStill = (species: PetSpeciesId): string => campImage(`${species}-poster-v1`)

export const worldImage = (worldId: string): string => `${base}art/world/${worldId}.webp`
