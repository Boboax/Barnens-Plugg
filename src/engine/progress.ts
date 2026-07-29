import type {
  AnswerRecord, ChildProfile, MasteryState, MisconceptionTag, SchoolYear, SkillState, Task,
} from '../domain/types'
import { MOMENTS, MOMENTS_ORDERED, YEAR_ORDER, momentById } from '../domain/curriculum'
import { WORLDS } from '../domain/worlds'
import { hasGenerator } from '../generators'
import { RATING_START, isBossReady, practiceLevel, updateRating } from './rating'
import { scheduleFirstReview, scheduleNextReview, scheduleRetryReview } from './spaced-repetition'

/* ============================================================
   Mästerskapslogik: färdigheternas tillstånd och övergångar.

   locked → available → in-progress → boss-ready → mastered → star
                                          ↑ needs-review (missad repetition)
   Allt här är rena funktioner över profildata — lagring och UI
   ligger utanför.
   ============================================================ */

export function newSkillState(momentId: string): SkillState {
  return {
    momentId,
    mastery: 'locked',
    rating: RATING_START,
    attempts: 0,
    correct: 0,
    recentMisconceptions: [],
    bossAttempts: 0,
    starWon: false,
  }
}

const isDone = (s: SkillState | undefined): boolean =>
  s?.mastery === 'mastered' || s?.mastery === 'star'

const EMPTY_SET: ReadonlySet<string> = new Set()

/** Generatorförsedda moment i en värld (de som faktiskt går att träna), i
    LÄROPLANSORDNING (termin, inte definitionsordning). Annars rekommenderade
    "Du är här" ett åk 5-moment före åk 2-momentet i Urtalens dal, där
    problemmomenten definieras sist i curriculum.ts. */
function genMomentIdsInWorld(worldId: string): string[] {
  return MOMENTS_ORDERED.filter((m) => m.worldId === worldId && hasGenerator(m.generatorId)).map((m) => m.id)
}

/** Är alla (tränbara) moment i en värld behärskade? Tom värld räknas EJ som klar.
    Sedan Expeditionsmodellen styr detta bara TROFÉ-bossen — grinden är årets. */
export function worldMomentsComplete(skills: Record<string, SkillState>, worldId: string): boolean {
  const ids = genMomentIdsInWorld(worldId)
  return ids.length > 0 && ids.every((id) => isDone(skills[id]))
}

/** Tränbara moment i en ÅRSKURS (över alla världar), i terminsordning.
    Expeditionens grundenhet: läroplanen är en spiral, så resan går år för år
    genom flera världar — inte värld för värld genom flera år. */
export function genMomentIdsInYear(year: SchoolYear): string[] {
  return MOMENTS_ORDERED.filter((m) => m.year === year && hasGenerator(m.generatorId)).map((m) => m.id)
}

/** Är alla tränbara moment i en årskurs behärskade? Tom årskurs räknas EJ klar. */
export function yearMomentsComplete(skills: Record<string, SkillState>, year: SchoolYear): boolean {
  const ids = genMomentIdsInYear(year)
  return ids.length > 0 && ids.every((id) => isDone(skills[id]))
}

/** Årskurser som har tränbara moment (lat + memoiserad: generatorregistret
    ska vara fyllt när vi frågar, inte vid modul-laddning). */
let trainableYearsMemo: SchoolYear[] | undefined
function trainableYears(): SchoolYear[] {
  trainableYearsMemo ??= YEAR_ORDER.filter((y) => genMomentIdsInYear(y).length > 0)
  return trainableYearsMemo
}

/** Är årskursen öppen för träning? Öppen = varje TIDIGARE årskurs (med
    tränbara moment) har sin Årsväktare besegrad. Första årskursen är alltid
    öppen. Detta är Expeditionsmodellens hårda grind. */
function yearOpen(year: SchoolYear, conqueredYears: ReadonlySet<SchoolYear>): boolean {
  const idx = YEAR_ORDER.indexOf(year)
  return trainableYears().every((y) => YEAR_ORDER.indexOf(y) >= idx || conqueredYears.has(y))
}

/** Hur många år under barnets årskurs väktarna fortfarande krävs. Årskurser
    LÄNGRE ner än så är "fjärranår" och auto-erövras. */
const GUARDIAN_LOOKBACK_YEARS = 2

/**
 * Erövrade år i praktiken: lagrade väktarsegrar + auto-erövrade FJÄRRANÅR —
 * årskurser som ligger ≥3 år under barnets aktuella årskurs. En tioåring ska
 * inte behöva bossa förskoleklassen (mjukats upp på förälderns begäran, juli
 * 2026); de närmaste två åren bakåt väktas fortfarande, så bakåtgrinden
 * behåller sin mening. Luckor i fjärranåren tränas ändå — rekommendationen
 * fyller ofullständiga år i ordning; det är bara VÄKTARSTRIDEN som skänks.
 * Beräknas ur schoolYear (föräldern uppdaterar den) — ingen lagring, så
 * regeln följer med när barnet byter årskurs.
 */
export function grantedYears(profile: Pick<ChildProfile, 'conqueredYears' | 'schoolYear'>): SchoolYear[] {
  const idx = YEAR_ORDER.indexOf(profile.schoolYear)
  const distant = YEAR_ORDER.filter((y) => YEAR_ORDER.indexOf(y) <= idx - (GUARDIAN_LOOKBACK_YEARS + 1))
  return [...new Set([...(profile.conqueredYears ?? []), ...distant])]
}

/**
 * Räkna om locked/available utifrån förkunskaper OCH årsgrinden. Muterar inte.
 *
 * Årsgrind (orubblig princip: framsteg styrs av appkod): ett moment låses upp
 * först när dess årskurs är öppen — dvs. alla tidigare årskursers Årsväktare
 * är besegrade. Så följer resan läroplanens spiral (multiplikation i åk 2
 * öppnas när åk 1 är erövrad — inte när en hel värld är färdigspelad upp till
 * åk 5). `conqueredYears` default tom = inga väktare besegrade än (ny profil).
 *
 * Moment som redan är in-progress/mastered rörs ALDRIG av grinden — den
 * växlar bara locked ⇄ available. (Ett barn som hunnit påbörja ett moment
 * över sin årskurs får behålla det på kartan, men rekommendationen pekar dit
 * först när året är öppet.)
 */
export function recomputeAvailability(
  skills: Record<string, SkillState>,
  conqueredYears: readonly SchoolYear[] = [],
  blixtBlocked: ReadonlySet<string> = EMPTY_SET,
): Record<string, SkillState> {
  const conquered = new Set(conqueredYears)
  const next: Record<string, SkillState> = { ...skills }
  for (const moment of MOMENTS) {
    const skill = next[moment.id] ?? newSkillState(moment.id)
    const prereqsDone = moment.prerequisites.every((p) => isDone(next[p]))
    // Flyt-grind: momentet hålls låst tills blixten före det är klarad.
    const unlocked = prereqsDone && yearOpen(moment.year, conquered) && !blixtBlocked.has(moment.id)
    let mastery: MasteryState = skill.mastery
    if (skill.mastery === 'locked' && unlocked) mastery = 'available'
    if (skill.mastery === 'available' && !unlocked) mastery = 'locked'
    next[moment.id] = mastery === skill.mastery ? skill : { ...skill, mastery }
  }
  return next
}

/**
 * Engångsreparation av gamla profiler. En tidigare version av diagnosen
 * markerade ALLA moment före fronten som 'boss-ready' (direkt, utan träning
 * → attempts 0), vilket gjorde hela kartan till bossnoder. Här görs de om
 * till 'mastered' med repetitionsschema — precis som diagnosen gör nu.
 *
 * Legitima boss-ready (barnet har tränat fram dem) har attempts ≥
 * BOSS_READY_MIN_ATTEMPTS och lämnas ORÖRDA. Idempotent: efter körning finns
 * inga boss-ready-med-0-försök kvar, så en ny inläsning gör ingenting.
 */
export function repairDiagnosisBossReady(
  skills: Record<string, SkillState>,
  now: string,
  conqueredYears: readonly SchoolYear[] = [],
  blixtBlocked: ReadonlySet<string> = EMPTY_SET,
): Record<string, SkillState> {
  const next: Record<string, SkillState> = { ...skills }
  for (const [id, s] of Object.entries(skills)) {
    if (s && s.mastery === 'boss-ready' && s.attempts === 0) {
      next[id] = { ...s, mastery: 'mastered', rating: Math.max(s.rating, 700), review: s.review ?? scheduleFirstReview(now) }
    }
  }
  // Alltid räkna om tillgänglighet — så års- OCH flyt-grinden greppar även
  // gamla profiler som placerades innan grindarna fanns.
  return recomputeAvailability(next, conqueredYears, blixtBlocked)
}

/**
 * Engångsmigrering när "Plus och minus" delades i ren addition → ren
 * subtraktion → blandat. Barn som REDAN behärskar en blandad nod har visat
 * båda räknesätten, så de nya rena noderna markeras klara direkt — annars
 * skulle motorn skicka dem bakåt till addition igen. Idempotent.
 */
const SPLIT_BACKFILL: { mixed: string; pure: string[] }[] = [
  { mixed: 'add-sub-0-10', pure: ['addition-0-10', 'subtraktion-0-10'] },
  { mixed: 'add-sub-0-20', pure: ['addition-0-20', 'subtraktion-0-20'] },
]

export function backfillSplitAddSub(
  skills: Record<string, SkillState>,
  now: string,
): Record<string, SkillState> {
  let changed = false
  const next: Record<string, SkillState> = { ...skills }
  for (const { mixed, pure } of SPLIT_BACKFILL) {
    const m = skills[mixed]
    if (!m || !isDone(m)) continue
    for (const id of pure) {
      const s = next[id]
      if (s && isDone(s)) continue
      next[id] = {
        ...(s ?? newSkillState(id)),
        mastery: 'mastered',
        rating: Math.max(s?.rating ?? 0, 640),
        review: s?.review ?? scheduleFirstReview(now),
      }
      changed = true
    }
  }
  return changed ? next : skills
}

/** Migrering (idempotent): fyll `seenWorlds` för befintliga barn så de inte
    plötsligt får "Pi anländer"-kort för världar de redan spelat i. En värld
    räknas som redan sedd om barnet har NÅGOT framsteg där (ett moment som
    lämnat 'locked'/'available') eller redan erövrat den. Ett redan satt
    seenWorlds lämnas orört (nya barn börjar tomt → får ankomsten till värld 1). */
export function backfillSeenWorlds(
  skills: Record<string, SkillState>,
  conqueredWorlds: string[] | undefined,
  seenWorlds: string[] | undefined,
): string[] {
  if (seenWorlds) return seenWorlds
  const conquered = new Set(conqueredWorlds ?? [])
  const seen: string[] = []
  for (const w of WORLDS) {
    const hasProgress = MOMENTS.some((m) => {
      if (m.worldId !== w.id) return false
      const s = skills[m.id]
      return s !== undefined && s.mastery !== 'locked' && s.mastery !== 'available'
    })
    if (hasProgress || conquered.has(w.id)) seen.push(w.id)
  }
  return seen
}

const MISCONCEPTION_MEMORY = 10

/**
 * Klassa ett fel: slarv eller kunskapslucka?
 * Slarv = barnet ligger klart över uppgiftens nivå och svarade snabbt —
 * det är inte förståelsen som brast utan noggrannheten.
 */
export function classifyError(
  skill: SkillState,
  taskLevel: number,
  elapsedMs: number,
  misconception?: MisconceptionTag,
): 'slarv' | 'kunskap' {
  const ownLevel = practiceLevel(skill.rating)
  const quick = elapsedMs < 12_000
  if (misconception === 'en-fel' && quick) return 'slarv'
  if (ownLevel >= taskLevel + 2 && quick) return 'slarv'
  return 'kunskap'
}

/** Matcha ett numeriskt felsvar mot uppgiftens missuppfattningskarta. */
export function matchMisconception(task: Task, givenAnswer: number | string): MisconceptionTag | undefined {
  if (task.answer.kind === 'choice') {
    const choice = task.answer.choices.find((c) => c.text === givenAnswer)
    return choice?.misconception
  }
  const numeric = typeof givenAnswer === 'number' ? givenAnswer : Number(String(givenAnswer).replace(',', '.'))
  if (Number.isNaN(numeric)) return 'okand'
  return task.misconceptionMap?.[numeric] ?? 'okand'
}

export interface AnswerOutcome {
  skill: SkillState
  record: AnswerRecord
}

/**
 * "Het hand"-acceleration: extra ratingskjuts vid längre rättsviter,
 * så starka elever når sin riktiga nivå inom ett pass i stället för
 * inom en vecka. Kämpar man gäller den försiktiga grundtakten.
 */
export const hotStreakBonus = (streak: number): number =>
  streak >= 3 ? Math.min(24, 6 * (streak - 2)) : 0

/**
 * Registrera ett svar under övning/repetition: rating, räknare, feltyp.
 * hotStreak = antal rätt i rad inklusive detta svar (bara övningspass —
 * boss/diagnos/blixt skickar inget och får ingen acceleration).
 */
export function applyAnswer(
  skill: SkillState,
  task: Task,
  correct: boolean,
  elapsedMs: number,
  context: AnswerRecord['context'],
  now: string,
  givenAnswer?: number | string,
  scratchPng?: string,
  hotStreak = 0,
): AnswerOutcome {
  const misconception = correct || givenAnswer === undefined ? undefined : matchMisconception(task, givenAnswer)
  const errorKind = correct ? undefined : classifyError(skill, task.ref.level, elapsedMs, misconception)

  // Slarvfel ska inte sänka ratingen lika hårt — kunskapen finns ju.
  const ratingCorrect = correct || errorKind === 'slarv' ? correct : false
  let rating = skill.rating
  if (!(errorKind === 'slarv' && !correct)) {
    rating = updateRating(skill.rating, skill.attempts, task.ref.level, ratingCorrect)
  }
  if (correct) {
    rating = Math.min(1000, rating + hotStreakBonus(hotStreak))
  }

  const recentMisconceptions = misconception && misconception !== 'okand'
    ? [misconception, ...skill.recentMisconceptions].slice(0, MISCONCEPTION_MEMORY)
    : skill.recentMisconceptions

  const next: SkillState = {
    ...skill,
    rating,
    attempts: skill.attempts + 1,
    correct: skill.correct + (correct ? 1 : 0),
    recentMisconceptions,
    mastery:
      skill.mastery === 'available' ? 'in-progress'
      // needs-review tränas om precis som in-progress — och måste kunna nå
      // bossen igen, annars fastnar momentet i evig omträning.
      : (skill.mastery === 'in-progress' || skill.mastery === 'needs-review') &&
        isBossReady({ ...skill, rating, attempts: skill.attempts + 1 }) ? 'boss-ready'
      : skill.mastery,
  }

  return {
    skill: next,
    record: {
      at: now, momentId: skill.momentId, taskRef: task.ref,
      correct, elapsedMs, misconception, errorKind, context, scratchPng,
    },
  }
}

/** Resultat av en bosstrid. */
export function applyBossResult(skill: SkillState, won: boolean, now: string): SkillState {
  if (!won) return { ...skill, bossAttempts: skill.bossAttempts + 1 }
  return {
    ...skill,
    bossAttempts: skill.bossAttempts + 1,
    mastery: 'mastered',
    review: scheduleFirstReview(now),
  }
}

/** Resultat av stjärnnivåförsök (nivå 8–10 efter besegrad boss). */
export function applyStarResult(skill: SkillState, won: boolean): SkillState {
  if (!won) return skill
  return { ...skill, mastery: 'star', starWon: true }
}

/** Resultat av repetitionsprov. */
export function applyReviewResult(skill: SkillState, passed: boolean, now: string): SkillState {
  if (!skill.review) return skill
  if (passed) return { ...skill, review: scheduleNextReview(skill.review, now) }
  // Missad repetition: momentet öppnas igen och tränas om innan ny boss.
  return {
    ...skill,
    mastery: 'needs-review',
    rating: Math.max(RATING_START, skill.rating - 120),
    review: scheduleRetryReview(now),
  }
}

/**
 * Nästa moment att träna. Repetition (needs-review) går alltid först — den
 * är tillåten var som helst. Därefter går vi igenom ÅRSKURSERNA i ordning
 * (Expeditionen: läroplanens spiral, år för år genom flera världar) och
 * STANNAR vid den första årskurs som inte är både klar OCH erövrad: är det
 * moment kvar tränar vi dem (terminsordning); är alla moment klara men
 * Årsväktaren kvar returnerar vi undefined (barnet ska möta väktaren — se
 * pendingGuardianYear). Så hoppar vi aldrig förbi en obesegrad väktare in i
 * nästa årskurs — och rekommenderar aldrig ett moment ÖVER barnets front,
 * även om det råkar vara påbörjat sedan tidigare.
 */
export function currentMomentId(profile: ChildProfile): string | undefined {
  const skills = profile.skills
  const withGen = (id: string): boolean => hasGenerator(momentById(id).generatorId)
  const needsReview = Object.values(skills).find((s) => s.mastery === 'needs-review' && withGen(s.momentId))
  if (needsReview) return needsReview.momentId
  const conquered = new Set(grantedYears(profile))
  for (const year of YEAR_ORDER) {
    const ids = genMomentIdsInYear(year)
    if (ids.length === 0) continue
    const complete = ids.every((id) => isDone(skills[id]))
    if (!complete) {
      // Träna vidare i denna årskurs: pågående/boss-redo först, annars nästa öppna.
      const active = ids.find((id) => {
        const m = skills[id]?.mastery
        return m === 'in-progress' || m === 'boss-ready'
      })
      if (active) return active
      // Nästa öppna moment. Finns inget (allt före klart, nästa låst av en
      // flyt-grind) → returnera undefined; Home visar då blixt-grinden som steg.
      return ids.find((id) => skills[id]?.mastery === 'available')
    }
    // Årskursen klar men väktaren inte besegrad → stanna (barnet möter väktaren).
    if (!conquered.has(year)) return undefined
    // Klar OCH erövrad → gå vidare till nästa årskurs.
  }
  return undefined
}

/**
 * Vilken Årsväktare väntar just nu (alla årskursens moment klara men året
 * inte erövrat)? Den avgör "Du är här" och den gula knappen när det inte
 * finns något moment kvar att träna. Grinden gäller även bakåt: ett diagnos-
 * placerat barn med hela förskoleklassen behärskad möter Gryningsvakten
 * innan resan fortsätter. undefined = ingen väktare väntar.
 */
export function pendingGuardianYear(profile: ChildProfile): SchoolYear | undefined {
  const skills = profile.skills
  const conquered = new Set(grantedYears(profile))
  for (const year of YEAR_ORDER) {
    const ids = genMomentIdsInYear(year)
    if (ids.length === 0) continue
    if (!ids.every((id) => isDone(skills[id]))) return undefined // moment kvar → ingen väktare än
    if (!conquered.has(year)) return year // klar men oerövrad → väktaren väntar
    // annars nästa årskurs
  }
  return undefined
}

/**
 * Trofé-boss: första världen som är HELT klar (alla år) men vars världsboss
 * inte besegrats. Blockerar INGENTING sedan Expeditionsmodellen — striden är
 * en frivillig klimax som erbjuds på världens stig och i rapporten.
 */
export function trophyBossWorldId(profile: ChildProfile): string | undefined {
  const conquered = new Set(profile.conqueredWorlds ?? [])
  for (const world of WORLDS) {
    if (worldMomentsComplete(profile.skills, world.id) && !conquered.has(world.id)) return world.id
  }
  return undefined
}
