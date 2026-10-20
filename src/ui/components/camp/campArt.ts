import type { CampCatalogItem } from '../../../domain/camp'
import type { PetSpeciesId, PetStage } from '../../../domain/pet-home'

/* Bildvägar för Kvällslägret. Bor i UI-lagret eftersom base-path är en
   byggmiljöfråga (import.meta.env) som domänlagret inte får känna till. */

const base = import.meta.env.BASE_URL

export const campImage = (name: string): string => `${base}art/camp/${name}.webp`

/** Lyans målade knappikoner (art/camp/icons/). */
export const campIcon = (name: string): string => `${base}art/camp/icons/${name}.webp`

export const itemImage = (item: CampCatalogItem): string => `${base}art/camp/items/${item.art}.webp`

/** Tidsmaskinens fyra rutor där sanden rinner (Tillägg 8), sida vid sida. */
export const TIME_MACHINE_SAND = `${base}art/camp/items/time-machine-sand.webp`

/** Stillbild av en art (laddningsbilden ur rörelseatlasen) — används även
    i upptäckten och Bokhörnan. */
export const petStill = (species: PetSpeciesId): string => campImage(`${species}-poster-v1`)

/**
 * Målade bildrutor per art, ålder och handling (grafikbeställningen,
 * Tillägg 5): `art/camp/anim/{art}-age-{1–4}-{handling}.webp`, fyra rutor i
 * en vågrät remsa. Lägg nyckeln här när remsan levererats — tills dess
 * spelar PetSprite atlasen eller den andande stillbilden.
 *
 * Levererade okt 2026: 84 av 92. Rutorna är tvättade (lösa bitar från
 * grannrutan borttagna) och fötterna linjerade så att vila/äta/klapp/sova
 * står stilla; leken får röra sig fritt. Saknas (felaktiga i leveransen,
 * ombeställda): axolotlbebisens äta/vila/klapp (visade en räv),
 * axolotltonåringens vila, rävtonåringens vila/klapp och den vuxna rävens
 * äta/klapp (fel ålder). Vuxen vila
 * beställdes aldrig — där spelar atlasen.
 */
const PET_ANIM_READY: ReadonlySet<string> = new Set<string>([
  // crystal-dragon: 23
  'crystal-dragon-1-eat', 'crystal-dragon-1-happy', 'crystal-dragon-1-idle', 'crystal-dragon-1-pet', 'crystal-dragon-1-play', 'crystal-dragon-1-sleep',
  'crystal-dragon-2-eat', 'crystal-dragon-2-happy', 'crystal-dragon-2-idle', 'crystal-dragon-2-pet', 'crystal-dragon-2-play', 'crystal-dragon-2-sleep',
  'crystal-dragon-3-eat', 'crystal-dragon-3-happy', 'crystal-dragon-3-pet', 'crystal-dragon-3-play', 'crystal-dragon-3-sleep', 'crystal-dragon-4-eat',
  'crystal-dragon-4-happy', 'crystal-dragon-4-idle', 'crystal-dragon-4-pet', 'crystal-dragon-4-play', 'crystal-dragon-4-sleep',
  // dune-fox: 19
  'dune-fox-1-eat', 'dune-fox-1-happy', 'dune-fox-1-idle', 'dune-fox-1-pet', 'dune-fox-1-play', 'dune-fox-1-sleep',
  'dune-fox-2-eat', 'dune-fox-2-happy', 'dune-fox-2-play', 'dune-fox-2-sleep', 'dune-fox-3-happy', 'dune-fox-3-play',
  'dune-fox-3-sleep', 'dune-fox-4-eat', 'dune-fox-4-happy', 'dune-fox-4-idle', 'dune-fox-4-pet', 'dune-fox-4-play',
  'dune-fox-4-sleep',
  // reef-axolotl: 19
  'reef-axolotl-1-happy', 'reef-axolotl-1-play', 'reef-axolotl-1-sleep', 'reef-axolotl-2-eat', 'reef-axolotl-2-happy', 'reef-axolotl-2-pet',
  'reef-axolotl-2-play', 'reef-axolotl-2-sleep', 'reef-axolotl-3-eat', 'reef-axolotl-3-happy', 'reef-axolotl-3-pet', 'reef-axolotl-3-play',
  'reef-axolotl-3-sleep', 'reef-axolotl-4-eat', 'reef-axolotl-4-happy', 'reef-axolotl-4-idle', 'reef-axolotl-4-pet', 'reef-axolotl-4-play',
  'reef-axolotl-4-sleep',
  // woodland-frog: 23
  'woodland-frog-1-eat', 'woodland-frog-1-happy', 'woodland-frog-1-idle', 'woodland-frog-1-pet', 'woodland-frog-1-play', 'woodland-frog-1-sleep',
  'woodland-frog-2-eat', 'woodland-frog-2-happy', 'woodland-frog-2-idle', 'woodland-frog-2-pet', 'woodland-frog-2-play', 'woodland-frog-2-sleep',
  'woodland-frog-3-eat', 'woodland-frog-3-happy', 'woodland-frog-3-pet', 'woodland-frog-3-play', 'woodland-frog-3-sleep', 'woodland-frog-4-eat',
  'woodland-frog-4-happy', 'woodland-frog-4-idle', 'woodland-frog-4-pet', 'woodland-frog-4-play', 'woodland-frog-4-sleep',
])

/** Alla levererade remsor (för testet som vaktar att filerna finns). */
export const readyPetAnimations = (): string[] => [...PET_ANIM_READY]

export const hasPetAnimation = (species: PetSpeciesId, stage: PetStage, action: string): boolean =>
  PET_ANIM_READY.has(`${species}-${stage}-${action}`)

export const petAnimation = (species: PetSpeciesId, stage: PetStage, action: string): string =>
  `${base}art/camp/anim/${species}-age-${stage}-${action}.webp`

/** Bilden för ett tillväxtstadium (etapp 2). Stadie 1, 2 och 4 är
    åldersbilderna (bebis, tonåring, väktare — GRAFIKBESTALLNING Tillägg 3);
    stadie 3 är den vuxna vännens befintliga stillbild/sovbild. */
export const petStageImage = (species: PetSpeciesId, stage: PetStage, sleeping = false): string =>
  stage === 3
    ? campImage(sleeping ? `${species}-sleep-v1` : `${species}-poster-v1`)
    : campImage(`${species}-age-${stage}${sleeping ? '-sleep' : ''}`)

export const worldImage = (worldId: string): string => `${base}art/world/${worldId}.webp`
