/** Frivilliga fält håller gamla profiler och säkerhetskopior läsbara. */
export interface PetProgress {
  coins: number
  lastPracticeDay: string
  pet?: { name: string; foundAt: string }
  visit?: { day: string; seconds: number }
}

export type FurnitureSlot = 'bed' | 'rug' | 'shelf' | 'toy'
export interface PetHome {
  owned: Record<string, { childId: string; boughtAt: string }>
  equipped: Partial<Record<FurnitureSlot, string>>
}

export interface Furniture {
  id: string
  name: string
  slot: FurnitureSlot
  price: number
  description: string
  art: string
  tone: string
}

export const FURNITURE: readonly Furniture[] = [
  { id: 'fern-bed', name: 'Ormbunksbädd', slot: 'bed', price: 20, description: 'En mjuk grön bädd att vila i.', art: 'icons/grodd', tone: '#557b45' },
  { id: 'moon-bed', name: 'Månkudde', slot: 'bed', price: 40, description: 'En blå kudde för sköna tupplurar.', art: 'objekt/mane', tone: '#555b8b' },
  { id: 'sun-rug', name: 'Solmatta', slot: 'rug', price: 20, description: 'Varmt guld under små tassar.', art: 'objekt/stjarna-guld', tone: '#bc8736' },
  { id: 'forest-rug', name: 'Skogsmatta', slot: 'rug', price: 40, description: 'En grön matta med gyllene kant.', art: 'objekt/kotte', tone: '#507957' },
  { id: 'shell', name: 'Havets skatt', slot: 'shelf', price: 20, description: 'En snäcka på stugans hylla.', art: 'objekt/snacka', tone: '#d7b88b' },
  { id: 'story-book', name: 'Sagoboken', slot: 'shelf', price: 40, description: 'En bok full av små äventyr.', art: 'beloning/bok', tone: '#766098' },
  { id: 'ball', name: 'Lekbollen', slot: 'toy', price: 20, description: 'En färgglad boll att leka med.', art: 'objekt/boll', tone: '#bc7541' },
  { id: 'gold-star', name: 'Stjärnstenen', slot: 'toy', price: 60, description: 'En blank liten skatt till lekhörnan.', art: 'objekt/stjarna-guld', tone: '#cfab4e' },
]

export const DAILY_PET_COINS = 20
export const HOME_VISIT_SECONDS = 180
