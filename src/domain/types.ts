/* ============================================================
   Domänmodell för Barnens Plugg.

   Detta är projektets ryggrad — alla moduler (motor, generatorer,
   lagring, UI, chatt) talar genom de här typerna. Ändringar här
   påverkar sparade profiler: bumpa PROFILE_SCHEMA_VERSION och
   skriv en migrering i storage/migrations.ts vid brytande ändring.
   ============================================================ */

export const PROFILE_SCHEMA_VERSION = 1

// ---------- Läroplan ----------

/** Lgr22:s centrala innehållsområden. */
export type CurriculumArea =
  | 'taluppfattning' // Taluppfattning och tals användning
  | 'algebra' // Algebra (mönster, likheter, ekvationer)
  | 'geometri' // Geometri
  | 'sannolikhet' // Sannolikhet och statistik
  | 'samband' // Samband och förändring
  | 'problem' // Problemlösning (vävs även in i övriga)

/** Skolår. F = förskoleklass. */
export type SchoolYear = 'F' | '1' | '2' | '3' | '4' | '5' | '6'

/** Läsårsrytm för terminsmål: vilken termin + halva ett moment hör till. */
export interface TermSlot {
  year: SchoolYear
  term: 'HT' | 'VT'
  half: 1 | 2
}

/**
 * Ett moment = en avgränsad färdighet i läroplanskedjan,
 * t.ex. "subtraktion med växling 0–100". Motsvarar 1–3 veckors
 * dagliga pass och avslutas med en bosstrid.
 */
export interface Moment {
  id: string
  title: string
  /** Kort beskrivning i barnspråk, används av berättelsen och föräldrarapporten. */
  description: string
  area: CurriculumArea
  year: SchoolYear
  term: TermSlot
  /** Moment-id:n som måste vara behärskade först. */
  prerequisites: string[]
  /** Id för uppgiftsgeneratorn. Saknas = innehållet kommer i senare fas ("kommer snart"). */
  generatorId?: string
  /** Världen momentet ligger i (styr kartan och berättelsen). */
  worldId: string
}

/** En värld i Matteriket = ett sammanhängande stycke av kartan med egen berättelse. */
export interface World {
  id: string
  name: string
  emoji: string
  /** Kort stämningstext som visas på kartan. */
  tagline: string
  /** Bossen som vaktar världens utgång. */
  boss: Boss
  /** Berättelsekapitel; index i listan följer momentens ordning i världen. */
  chapters: string[]
}

export interface Boss {
  id: string
  name: string
  emoji: string
  /** Vad bossen ropar när striden börjar. */
  taunt: string
  /** Vad bossen säger när den besegras (växer alltid till något snällt). */
  defeatLine: string
}

// ---------- Uppgifter ----------

/**
 * Kända missuppfattningar. Varje distraktor i en flervalsuppgift
 * taggas med varför just det felet uppstår — det är så motorn vet
 * VAD som ska repareras, inte bara ATT det blev fel.
 */
export type MisconceptionTag =
  | 'glomd-vaxling' // störst-minus-minst i varje kolumn / glömd växling
  | 'glomd-minnessiffra' // tappad minnessiffra i addition/multiplikation
  | 'positionsfel' // blandar ihop tiotal och ental
  | 'fel-raknesatt' // valde motsatt räknesätt (ofta i textuppgifter)
  | 'en-fel' // räknefel på ±1/±10 (ofta slarv eller fingerräkning)
  | 'storre-namnare-storre-brak' // tror att 1/8 > 1/4 för att 8 > 4
  | 'decimal-langd' // tror att 0,25 > 0,5 för att 25 > 5
  | 'likhetstecken-resultat' // tolkar = som "här kommer svaret" i öppna utsagor
  | 'nolla-multiplikation' // fel kring nollor: 30 × 4 = 12
  | 'rest-ignorerad' // division: struntar i resten
  | 'enhet-fel' // blandar enheter (cm/m, min/h)
  | 'okand' // fritextsvar som inte matchar känd feltyp

/** Visuellt stöd enligt CRA-principen (konkret → representation → abstrakt). */
export type TaskVisual =
  // op: räknesättet grupperna visar (default '+'). '−' ritar den andra gruppen
  // överstruken (tas bort) så bilden matchar en subtraktion, inte en addition.
  | { kind: 'tiobas'; groups: { tens: number; ones: number; hundreds?: number }[]; op?: '+' | '−' }
  | { kind: 'tallinje'; min: number; max: number; marks?: number[]; highlight?: number }
  | { kind: 'grupper'; groupCount: number; itemsPerGroup: number; emoji: string }
  | { kind: 'foljd'; items: string[] } // mönsterföljd (objekt-nycklar) + '?' på slutet
  | { kind: 'brak'; parts: number; filled: number; secondary?: { parts: number; filled: number } }
  | { kind: 'klocka'; hours: number; minutes: number }
  | { kind: 'form'; shape: 'cirkel' | 'triangel' | 'kvadrat' | 'rektangel' | 'femhorning' | 'sexhorning' }
  | { kind: 'rektangel'; w: number; h: number; unit: string }
  | { kind: 'ingen' }

/** Ett svarsalternativ i flervalsuppgift. */
export interface Choice {
  text: string
  correct: boolean
  misconception?: MisconceptionTag
}

/**
 * En genererad uppgift. Skapas alltid av deterministisk kod
 * (aldrig AI) från ett frö, så samma frö ger samma uppgift.
 */
export interface Task {
  /** Generatorns id + frö, för reproducerbarhet och felsökning. */
  ref: { generatorId: string; level: DifficultyLevel; seed: number }
  /** Uppgiftstexten. Läses även upp av talsyntesen. */
  prompt: string
  /** Kortare variant för uppläsning om prompten har symboler som läses dåligt. */
  spokenPrompt?: string
  visual: TaskVisual
  answer:
    | { kind: 'numeric'; value: number; unit?: string }
    | { kind: 'choice'; choices: Choice[] }
  /** Förklaring som visas efter fel svar (pedagogisk, inte bara facit). */
  explanation: string
  /** Vilka missuppfattningar ett numeriskt felsvar ska matchas mot: värde → tagg. */
  misconceptionMap?: Record<number, MisconceptionTag>
}

/** Svårighetsnivå 1–10. 1–7 ≈ årskursnivå, 8–10 = stjärnnivån (över årskursnivå). */
export type DifficultyLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10

export const STAR_LEVEL_MIN: DifficultyLevel = 8

/** Kontrakt för en uppgiftsgenerator. Ren funktion: (nivå, frö) → uppgift. */
export interface TaskGenerator {
  id: string
  /** Vilka nivåer generatorn stöder (alltid 1–10 för färdiga moment). */
  generate(level: DifficultyLevel, seed: number): Task
}

// ---------- Elevens tillstånd ----------

export type MasteryState =
  | 'locked' // förkunskaper saknas
  | 'available' // kan påbörjas
  | 'in-progress' // tränas nu
  | 'boss-ready' // tillräcklig nivå för att utmana bossen
  | 'mastered' // boss besegrad
  | 'star' // stjärnnivån (8–10) klarad — 💎
  | 'needs-review' // repetitionsprov underkänt — öppnad igen

/** Per-moment-tillstånd i barnets profil. */
export interface SkillState {
  momentId: string
  mastery: MasteryState
  /** Adaptiv rating 100–1000, mappas mot svårighetsnivå 1–10. */
  rating: number
  /** Osäkerhet: hög i början, sjunker med antal svar. Styr K-faktorn. */
  attempts: number
  correct: number
  /** Senaste klassade missuppfattningar (ringbuffert, senaste först). */
  recentMisconceptions: MisconceptionTag[]
  /** Spaced repetition-schema (sätts när momentet behärskas). */
  review?: {
    nextReviewAt: string // ISO-datum
    intervalDays: number
    passes: number
  }
  bossAttempts: number
  starWon: boolean
}

/** Ett registrerat svar — grunden för all analys och rapporter. */
export interface AnswerRecord {
  at: string // ISO
  momentId: string
  taskRef: Task['ref']
  correct: boolean
  /** Svarstid i ms — används för flytmätning och slarvfelsklassning. */
  elapsedMs: number
  misconception?: MisconceptionTag
  /** Klassning: slarvfel = hög rating + snabbt fel; kunskapslucka annars. */
  errorKind?: 'slarv' | 'kunskap'
  context: 'ovning' | 'boss' | 'diagnos' | 'repetition' | 'blixt' | 'stjarna'
  /** Kladdytan som liten PNG-dataURL, sparas för de senaste svaren. */
  scratchPng?: string
}

// ---------- Pass ----------

export type SessionPartKind = 'uppvarmning' | 'nytt' | 'blandat'

export interface SessionPlan {
  parts: {
    kind: SessionPartKind
    momentId: string
    taskCount: number
  }[]
}

// ---------- Diagnos ----------

export interface DiagnosisState {
  /** Diagnosen delas i pass (3 för yngre barn, 1–2 för äldre). */
  passesDone: number
  passesTotal: number
  done: boolean
  /** Arbetsminne för den adaptiva sökningen per område. */
  probes: { momentId: string; correct: boolean; level: DifficultyLevel }[]
}

// ---------- Belöningar ----------

export type RewardTarget =
  | { type: 'moments'; count: number } // N moment klarade (bossar besegrade)
  | { type: 'sessions'; count: number } // N genomförda pass
  | { type: 'term-goal'; year: SchoolYear; term: 'HT' | 'VT'; half: 1 | 2 } // terminsmål enligt läroplan

export interface Reward {
  id: string
  childId: string
  title: string
  emoji: string
  target: RewardTarget
  /** Räkningens startpunkt så gamla framsteg inte äts upp av nya belöningar. */
  createdAt: string
  /** Läget när belöningen skapades — progress räknas från noll härifrån. */
  baseline: { momentsMastered: number; activeDays: number }
  earnedAt?: string
  redeemedAt?: string
}

// ---------- Barnprofil ----------

export interface ChildProfile {
  id: string
  name: string
  /** Profilfärg (hex) som följer barnet genom appen. */
  color: string
  birthYear: number
  /** Startår i appen, används för terminsmappning (vilket skolår barnet går). */
  schoolYear: SchoolYear
  createdAt: string

  skills: Record<string, SkillState>
  answers: AnswerRecord[]
  diagnosis: DiagnosisState

  /** Daglig tidsgräns i minuter (sätts i föräldraläget). */
  dailyLimitMinutes: number
  /** Använd tid per dag: ISO-datum → sekunder. */
  usageSeconds: Record<string, number>
  /** Extratid som förälder beviljat (PIN-skyddat): ISO-datum → sekunder.
      Optionellt fält = bakåtkompatibelt med äldre profiler/exportfiler. */
  extraSeconds?: Record<string, number>

  /** AI-chatt på/av för detta barn (fas 5). */
  chatEnabled: boolean

  streak: { days: number; lastActiveDate: string }

  /** Blixtpass-rekord (flyt): bästa antal rätt på en minut per testtyp. */
  blixt?: Partial<Record<BlixtKind, BlixtRecord>>

  /** Vald hjältefigur (målad karaktär). Optionellt = bakåtkompatibelt; sätts i
      föräldraläget och bor bara lokalt. Styr avatar + hjältebild. */
  hero?: HeroKind

  /** Har barnet sett Pis förklaring av diamantnivån? Optionellt =
      bakåtkompatibelt; visas en gång, sedan hoppas introt över. */
  seenStarIntro?: boolean

  /** Har barnet sett Pis förklaring av hur kartans noder fungerar? Optionellt
      = bakåtkompatibelt; visas en gång på hemskärmen. */
  seenMapIntro?: boolean

  /** Världar där barnet besegrat världsbossen (klimaxstriden i slutet).
      Optionellt = bakåtkompatibelt. Kosmetiskt/firande — gatear inte nästa värld. */
  conqueredWorlds?: string[]
}

/** Målade hjältefigurer (public/art/hero/*). Nyckeln bor lokalt per barn. */
export type HeroKind = 'bagskytt' | 'riddare' | 'trollkarl'

/** Blixtpassens testtyper — speglar skolans minuttest. */
export type BlixtKind = 'add-sub-0-10' | 'add-sub-0-20' | 'tabeller'

export interface BlixtRecord {
  best: number
  lastAt: string
}

// ---------- Chattlogg (fas 5, men loggformatet är del av grundmodellen) ----------

export interface ChatLogEntry {
  at: string
  childId: string
  role: 'child' | 'ai'
  text: string
  /** Sattes meddelandet stopp för av ämnesfiltret? */
  refusedOffTopic?: boolean
  scratchPng?: string
}

// ---------- Hela hushållet (det som lagras/exporteras) ----------

export interface Household {
  schemaVersion: number
  /** SHA-256-hash av föräldra-PIN (aldrig klartext). */
  parentPinHash?: string
  children: ChildProfile[]
  rewards: Reward[]
  chatLog: ChatLogEntry[]
  /** Chattkonfiguration (fas 5): leverantör + nyckel läggs in i föräldraläget. */
  chat?: { provider: 'gemini' | 'claude'; apiKey: string }
  /** Skolans minutmål per blixttest (sätts i föräldraläget, standard 20). */
  blixtTargets?: Partial<Record<BlixtKind, number>>
  lastBackupAt?: string
}
