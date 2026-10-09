/* ============================================================
   Kvällslägret: husdjur, mynt och ägda föremål.

   ALLT bor på barnet (child.petProgress) — inget delas på hushålls-
   nivå. Då följer lägret familjesynkens krockregel (nyaste versionen
   av varje barn vinner) utan egen konfliktlogik: ett köp på en platta
   reser med barnet till nästa. Preview-grenen hade möblerna på
   hushållet och tappade därför köp mellan enheter.

   Lägret är rent kosmetiskt. Inget här får någonsin läsas av motorn
   för rating, upplåsning eller rättning (princip 1, 3 och 5).
   ============================================================ */

/** Arterna som har färdig grafik. Draken kommer i etapp 2 med sin atlas. */
export type PetSpeciesId = 'woodland-frog' | 'dune-fox' | 'reef-axolotl'

export interface PetSpecies {
  id: PetSpeciesId
  name: string
  /** Förslag i namnfältet — barnet väljer alltid själv. */
  defaultName: string
}

export const PET_SPECIES: readonly PetSpecies[] = [
  { id: 'woodland-frog', name: 'Skogsgroda', defaultName: 'Mossa' },
  { id: 'dune-fox', name: 'Sandräv', defaultName: 'Saffran' },
  { id: 'reef-axolotl', name: 'Korallaxolotl', defaultName: 'Pärla' },
]

/** Första vännen är skogsgrodan för alla: neutral, färdigritad och inte
    knuten till någon värld. VARIFRÅN den kommer bestäms av barnets egen
    resa (världen barnet just tränade i), aldrig av arten — annars fick
    sexåringen i Urtalens dal en groda "från" en åk 3-värld i dimman. */
export const FIRST_PET_SPECIES: PetSpeciesId = 'woodland-frog'

export const petSpecies = (id: string): PetSpecies =>
  PET_SPECIES.find((s) => s.id === id) ?? PET_SPECIES[0]

export type PetCareActivity = 'pet' | 'feed' | 'rest' | 'wake'

export interface CampPet {
  id: string
  name: string
  species: PetSpeciesId
  foundAt: string
  /** Världen barnet tränade i när vännen hittades — berättelsens "från". */
  foundInWorldId: string
  /** Sovplats (CAMP_POINTS av typen 'bed'). */
  bedPoint?: string
  /** Omsorg är minnen, inte behov: djuren svälter aldrig och inget går
      förlorat om barnet är borta en vecka. Fälten styr bara repliker. */
  care?: { resting?: boolean; lastFedAt?: string; lastPettedAt?: string }
}

/** Ett ägt föremål. `id` är köpets id (purchaseId) — det gör köpet
    idempotent: samma köp-id kan aldrig dras två gånger. */
export interface CampItemInstance {
  id: string
  itemId: string
  boughtAt: string
  /** Plats i lägret (CAMP_POINTS). Saknas = ligger i packningen. */
  point?: string
}

export interface PetProgress {
  coins: number
  /** Lokal kalenderdag (ÅÅÅÅ-MM-DD) för senaste avslutade pass som gav
      mynt. Tom sträng = aldrig. Styr både dagsmynten och lägertiden. */
  lastPracticeDay: string
  pets: CampPet[]
  items: CampItemInstance[]
  /** En upptäckt som väntar på att barnet tittar bakom stenen. Sparas så
      att den överlever omladdning och nya pass. */
  encounter?: { species: PetSpeciesId; worldId: string }
  /** Dagens förbrukade lägertid i sekunder. */
  visit?: { day: string; seconds: number }
  outfit?: string
  /** Köpta mantlar (resenärens mantel är gratis och står inte här). */
  outfits?: string[]
}

/** Mynt för VANAN: första avslutade passet per dag, oavsett hur många rätt.
    Aldrig för rätt svar, hastighet eller jämförelse (princip 3). 20/dag
    gör att inget i boden kostar mer än en veckas träning. */
export const DAILY_PET_COINS = 20

/** Lägret är en kort kvällsstund efter passet, inte en egen spelplats. */
export const HOME_VISIT_SECONDS = 180

export const emptyPetProgress = (): PetProgress => ({
  coins: 0,
  lastPracticeDay: '',
  pets: [],
  items: [],
})
