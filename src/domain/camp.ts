import type { ChildProfile } from './types'

/* ============================================================
   Kvällslägrets handelsbod: EN katalog, en prislista.

   Priserna är satta en gång mot dagsmynten (20 per dag): inget kostar
   mer än 140, alltså högst en veckas träning. Dyrare varor gör butiken
   till målet i stället för träningen (Deci & Ryan — se PLAN-LAGER).

   Hela boden är öppen så snart lägret är upplåst (barnet har hittat sin
   första vän) — förälderns beslut okt 2026. Världsknutna upplåsningar gav
   det yngsta barnet en halvtom bod i åratal. Det enda som väntar på
   barnets resa är följeslagarmantlarna: de kräver rätt vän i lägret.
   ============================================================ */

/** 'tent' har ingen flyttbar plats — tältet står alltid vid elden. */
export type CampKind = 'bed' | 'rug' | 'light' | 'toy' | 'storage' | 'tent'

export type CampUnlock =
  | { kind: 'always' }
  | { kind: 'pet-species'; species: string }

export interface CampCatalogItem {
  id: string
  name: string
  price: number
  kind: CampKind
  /** Bildnyckel under public/art/camp/items/ (UI:t bygger sökvägen —
      domänlagret känner inte till byggmiljöns base-path). */
  art: string
  description: string
  unlock: CampUnlock
  /** 'pets' = en per husdjur (bäddar). */
  maxOwned: number | 'pets'
}

export const CAMP_CATALOG: readonly CampCatalogItem[] = [
  {
    id: 'fern-bed', name: 'Ormbunksbädd', price: 40, kind: 'bed', art: 'moss-bed',
    description: 'Flätad bädd med mjuk mossa och en varm filt.',
    unlock: { kind: 'always' }, maxOwned: 'pets',
  },
  {
    id: 'moon-bed', name: 'Månkudde', price: 60, kind: 'bed', art: 'moon-bed',
    description: 'En mjuk plats under en broderad måne.',
    unlock: { kind: 'always' }, maxOwned: 'pets',
  },
  {
    // Tältet ritas i lägret FÖRST när det är köpt — barnet ska inte köpa
    // något det redan ser (granskningen, punkt C).
    id: 'pet-tent', name: 'Husdjurstält', price: 100, kind: 'tent', art: 'pet-tent',
    description: 'Ett eget litet krypin med öppen dörr.',
    unlock: { kind: 'always' }, maxOwned: 1,
  },
  {
    id: 'sun-rug', name: 'Solmatta', price: 40, kind: 'rug', art: 'camp-rug',
    description: 'Samla vännerna på en mjuk vävd matta.',
    unlock: { kind: 'always' }, maxOwned: 1,
  },
  {
    id: 'camp-lantern', name: 'Lägerlykta', price: 40, kind: 'light', art: 'camp-lantern',
    description: 'Ett varmt litet ljus vid en sovplats.',
    unlock: { kind: 'always' }, maxOwned: 2,
  },
  {
    id: 'star-lights', name: 'Stjärnlyktor', price: 80, kind: 'light', art: 'star-lights',
    description: 'Fem stjärnor som lyser tillsammans.',
    unlock: { kind: 'always' }, maxOwned: 1,
  },
  {
    id: 'play-log', name: 'Lekstock', price: 60, kind: 'toy', art: 'play-log',
    description: 'En tunnel och en hängande leksak.',
    unlock: { kind: 'always' }, maxOwned: 2,
  },
  {
    id: 'treasure-chest', name: 'Skattkista', price: 80, kind: 'storage', art: 'treasure-chest',
    description: 'En plats för lägrets små skatter.',
    unlock: { kind: 'always' }, maxOwned: 1,
  },
]

export interface CampPoint {
  id: string
  name: string
  kind: CampKind
  /** Position och bredd i procent av lägerbildens yta. */
  x: number
  y: number
  width: number
}

export const CAMP_POINTS: readonly CampPoint[] = [
  { id: 'bed-1', name: 'Sovplats vid tältet', kind: 'bed', x: 24, y: 67, width: 19 },
  { id: 'bed-2', name: 'Sovplats vid stigen', kind: 'bed', x: 45, y: 78, width: 19 },
  { id: 'bed-3', name: 'Sovplats vid stenen', kind: 'bed', x: 77, y: 77, width: 18 },
  { id: 'bed-4', name: 'Sovplats vid ormbunken', kind: 'bed', x: 15, y: 85, width: 17 },
  { id: 'rug-1', name: 'Samlingsplatsen', kind: 'rug', x: 47, y: 86, width: 31 },
  { id: 'light-1', name: 'Ljuset vid tältet', kind: 'light', x: 12, y: 58, width: 13 },
  { id: 'light-2', name: 'Ljuset vid skogsbrynet', kind: 'light', x: 86, y: 58, width: 19 },
  { id: 'toy-1', name: 'Lekplats vid stigen', kind: 'toy', x: 61, y: 80, width: 16 },
  { id: 'toy-2', name: 'Lekplats vid tältet', kind: 'toy', x: 32, y: 84, width: 13 },
  { id: 'storage-1', name: 'Skattplatsen', kind: 'storage', x: 88, y: 80, width: 18 },
  { id: 'storage-2', name: 'Bokplatsen', kind: 'storage', x: 36, y: 55, width: 12 },
]

export const catalogItem = (id: string): CampCatalogItem | undefined =>
  CAMP_CATALOG.find((item) => item.id === id)

export const campPoint = (id: string | undefined): CampPoint | undefined =>
  CAMP_POINTS.find((point) => point.id === id)

export function isCampUnlockMet(unlock: CampUnlock, child: ChildProfile): boolean {
  const pets = child.petProgress.pets
  switch (unlock.kind) {
    case 'always': return true
    case 'pet-species': return pets.some((pet) => pet.species === unlock.species)
  }
}

/** Hur många av varan barnet kan äga. Bäddar följer antalet vänner. */
export const campItemLimit = (item: CampCatalogItem, child: ChildProfile): number =>
  item.maxOwned === 'pets' ? child.petProgress.pets.length : item.maxOwned

export const ownsCampItem = (child: ChildProfile, itemId: string): boolean =>
  child.petProgress.items.some((owned) => owned.itemId === itemId)

/* Mantlarna är ett eget lager över hjältebilden och syns bara i lägret
   (striden får dem i etapp 3). Alla är öppna utom följeslagarmantlarna,
   som kräver rätt vän i lägret. */
export interface Outfit {
  id: string
  name: string
  color: string
  trim: string
  price: number
  unlock: CampUnlock
}

export const OUTFITS: readonly Outfit[] = [
  { id: 'traveller', name: 'Resenärens mantel', color: '#33694c', trim: '#c9ac68', price: 0, unlock: { kind: 'always' } },
  {
    id: 'starlight', name: 'Stjärnmantel', color: '#544078', trim: '#e4cba0', price: 80,
    unlock: { kind: 'always' },
  },
  {
    id: 'sunset', name: 'Solnedgångsmantel', color: '#a74f32', trim: '#f0bf63', price: 100,
    unlock: { kind: 'always' },
  },
  {
    id: 'moss-companion', name: 'Skogsgrodans mantel', color: '#477044', trim: '#b9d47a', price: 120,
    unlock: { kind: 'pet-species', species: 'woodland-frog' },
  },
  {
    id: 'dune-companion', name: 'Sandrävens mantel', color: '#9a6338', trim: '#f0cd79', price: 120,
    unlock: { kind: 'pet-species', species: 'dune-fox' },
  },
  {
    id: 'reef-companion', name: 'Korallaxolotlens mantel', color: '#39777c', trim: '#f09b9c', price: 120,
    unlock: { kind: 'pet-species', species: 'reef-axolotl' },
  },
]

export const outfitById = (id: string | undefined): Outfit =>
  OUTFITS.find((outfit) => outfit.id === id) ?? OUTFITS[0]

export const ownsOutfit = (child: ChildProfile, outfit: Outfit): boolean =>
  outfit.price === 0 || (child.petProgress.outfits?.includes(outfit.id) ?? false)

/** Köpta mantlar visas alltid; övriga först när de låsts upp. */
export const visibleOutfits = (child: ChildProfile): Outfit[] =>
  OUTFITS.filter((outfit) => ownsOutfit(child, outfit) || isCampUnlockMet(outfit.unlock, child))
