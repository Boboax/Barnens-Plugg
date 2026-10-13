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

/** Lägrets fyra vänner. Draken kom med etapp 2 (okt 2026). */
export type PetSpeciesId = 'woodland-frog' | 'dune-fox' | 'reef-axolotl' | 'crystal-dragon'

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
  { id: 'crystal-dragon', name: 'Kristalldrake', defaultName: 'Glimmer' },
]

/** I vilken ordning vännerna kommer. Fast lista — inget slumpas — så att
    syskon aldrig får "bättre tur" (princip 3) och berättelsen går att följa:
    grodan efter första passet, sedan en ny vän för varje milstolpe. */
export const PET_ORDER: readonly PetSpeciesId[] = ['woodland-frog', 'dune-fox', 'reef-axolotl', 'crystal-dragon']

/** Vännens fyra tillväxtstadier. Stadiet sparas aldrig — det räknas fram
    ur barnets behärskade moment (engine/pet-home: petStage). */
export type PetStage = 1 | 2 | 3 | 4
export const PET_STAGE_NAMES: Record<PetStage, string> = { 1: 'Unge', 2: 'Ung', 3: 'Vuxen', 4: 'Följeslagare' }

/** Första vännen är skogsgrodan för alla: neutral, färdigritad och inte
    knuten till någon värld. VARIFRÅN den kommer bestäms av barnets egen
    resa (världen barnet just tränade i), aldrig av arten — annars fick
    sexåringen i Urtalens dal en groda "från" en åk 3-värld i dimman. */
export const FIRST_PET_SPECIES: PetSpeciesId = 'woodland-frog'

export const petSpecies = (id: string): PetSpecies =>
  PET_SPECIES.find((s) => s.id === id) ?? PET_SPECIES[0]

export type PetCareActivity = 'pet' | 'feed' | 'play' | 'rest' | 'wake'

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
  care?: { resting?: boolean; lastFedAt?: string; lastPettedAt?: string; lastPlayedAt?: string }
  /** Antal behärskade moment när tillväxten startade — den räknas härifrån,
      så en vän alltid börjar som unge. */
  masteredAtFound?: number
  /** Högsta stadiet barnet sett "har växt!"-rutan för (upprepas inte). */
  seenStage?: number
  /** 2 = tillväxten följer reglerna från okt 2026 (alla vänner börjar som
      unge). Saknas = vän från innan; den startas om som unge vid nästa
      laddning (restartPetGrowth). */
  growthV?: number
  /** Väntande ruta "{namn} växer upp med dig!" efter omstarten. */
  freshStart?: boolean
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
  /** Utgångsläget för nya vänner: hur många vänner barnet hade och hur
      många milstolpar som redan var nådda när räkningen startade. Bara
      milstolpar EFTER det ger nya vänner (förälderns beslut, okt 2026 —
      gamla framsteg gav annars flera vänner samma dag). Optionellt. */
  milestoneBase?: { friends: number; years: number; worlds: number; blixt: number }
}

/** Mynt för VANAN: första avslutade passet per dag, oavsett hur många rätt.
    Aldrig för rätt svar, hastighet eller jämförelse (princip 3). 20/dag
    gör att inget i boden kostar mer än en veckas träning. */
export const DAILY_PET_COINS = 20

/** Lägertid per dag, bara efter dagens pass. Höjd från 3 till 15 minuter
    på förälderns begäran (okt 2026) när lyan blev en lekscen. Tiden är
    lägrets EGEN klocka: den drar aldrig av mattetiden, och mattetiden tickar
    inte i lägret (pet-home står inte i TIMED_SCREENS) — så passets arbetstid
    kan aldrig "väntas ut" här. */
export const HOME_VISIT_SECONDS = 15 * 60

export const emptyPetProgress = (): PetProgress => ({
  coins: 0,
  lastPracticeDay: '',
  pets: [],
  items: [],
})
