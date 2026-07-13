import type { CurriculumArea, Moment, SchoolYear, TermSlot } from './types'

/* ============================================================
   Läroplansträdet F–åk 6, ordnat enligt Lgr22:s centrala innehåll
   och en typisk läsårsrytm. Varje moment pekar på sina förkunskaper,
   sin värld i Matteriket och (när innehållet är byggt) sin generator.

   Moment utan generatorId visas som "kommer snart" på kartan —
   strukturen är komplett, innehållet fylls på fas för fas.
   ============================================================ */

const t = (year: SchoolYear, term: 'HT' | 'VT', half: 1 | 2): TermSlot => ({ year, term, half })

interface M {
  id: string
  title: string
  description: string
  area: CurriculumArea
  term: TermSlot
  prereq?: string[]
  gen?: boolean
  world: string
}

const def = (m: M): Moment => ({
  id: m.id,
  title: m.title,
  description: m.description,
  area: m.area,
  year: m.term.year,
  term: m.term,
  prerequisites: m.prereq ?? [],
  generatorId: m.gen ? `gen.${m.id}` : undefined,
  worldId: m.world,
})

export const MOMENTS: Moment[] = [
  // ================= TALENS DAL — taluppfattning & add/sub =================
  def({
    id: 'antal-0-10', world: 'talens-dal', area: 'taluppfattning', term: t('F', 'HT', 1), gen: true,
    title: 'Räkna antal 0–10',
    description: 'Räkna föremål, koppla antal till siffra.',
  }),
  def({
    id: 'talrad-0-20', world: 'talens-dal', area: 'taluppfattning', term: t('F', 'HT', 2), gen: true,
    prereq: ['antal-0-10'],
    title: 'Talraden 0–20',
    description: 'Talens ordning, jämföra, ett mer och ett mindre.',
  }),
  def({
    id: 'dela-upp-tal', world: 'talens-dal', area: 'taluppfattning', term: t('F', 'VT', 1), gen: true,
    prereq: ['talrad-0-20'],
    title: 'Dela upp tal',
    description: 'Talens uppdelning: 7 är 5 och 2, 3 och 4 …',
  }),
  def({
    id: 'talkamrater-10', world: 'talens-dal', area: 'taluppfattning', term: t('1', 'HT', 1), gen: true,
    prereq: ['dela-upp-tal'],
    title: 'Tiokamraterna',
    description: 'Paren som bygger tio: 1+9, 2+8, 3+7 …',
  }),
  def({
    id: 'add-sub-0-10', world: 'talens-dal', area: 'taluppfattning', term: t('1', 'HT', 2), gen: true,
    prereq: ['talkamrater-10'],
    title: 'Plus och minus 0–10',
    description: 'Addition och subtraktion i det lilla talområdet.',
  }),
  def({
    id: 'add-sub-0-20', world: 'talens-dal', area: 'taluppfattning', term: t('1', 'VT', 1), gen: true,
    prereq: ['add-sub-0-10'],
    title: 'Plus och minus 0–20',
    description: 'Utan tiotalsövergång — talraden ut till 20.',
  }),
  def({
    id: 'tiotalsovergang-20', world: 'talens-dal', area: 'taluppfattning', term: t('1', 'VT', 2), gen: true,
    prereq: ['add-sub-0-20'],
    title: 'Över tian',
    description: 'Tiotalsövergång med tiokamraterna som verktyg: 8+5 = 8+2+3.',
  }),
  def({
    id: 'positionssystem-100', world: 'talens-dal', area: 'taluppfattning', term: t('2', 'HT', 1), gen: true,
    prereq: ['tiotalsovergang-20'],
    title: 'Tiotal och ental',
    description: 'Positionssystemet 0–100: 47 är 4 tiotal och 7 ental.',
  }),
  def({
    id: 'add-sub-0-100', world: 'talens-dal', area: 'taluppfattning', term: t('2', 'HT', 2), gen: true,
    prereq: ['positionssystem-100'],
    title: 'Plus och minus 0–100',
    description: 'Utan växling — räkna med hela tiotal och ental.',
  }),
  def({
    id: 'vaxling-0-100', world: 'talens-dal', area: 'taluppfattning', term: t('2', 'VT', 1), gen: true,
    prereq: ['add-sub-0-100'],
    title: 'Subtraktion med växling',
    description: 'Växlingens hemlighet: låna ett tiotal när entalen inte räcker.',
  }),
  def({
    id: 'add-sub-0-1000', world: 'talens-dal', area: 'taluppfattning', term: t('3', 'HT', 2), gen: true,
    prereq: ['vaxling-0-100'],
    title: 'Räkna till 1000',
    description: 'Skriftliga räknemetoder i det större talområdet.',
  }),
  def({
    id: 'stora-tal', world: 'talens-dal', area: 'taluppfattning', term: t('4', 'HT', 1), gen: true,
    prereq: ['add-sub-0-1000'],
    title: 'Stora tal',
    description: 'Positionssystemet till en miljon — läsa, skriva, jämföra.',
  }),
  def({
    id: 'negativa-tal', world: 'talens-dal', area: 'taluppfattning', term: t('5', 'VT', 2), gen: true,
    prereq: ['stora-tal'],
    title: 'Negativa tal',
    description: 'Under nollan: termometern, talraden åt andra hållet.',
  }),

  // ================= MULTIPLIKATIONSSKOGEN — mult & div =================
  def({
    id: 'mult-intro', world: 'multiplikationsskogen', area: 'taluppfattning', term: t('2', 'VT', 1), gen: true,
    prereq: ['add-sub-0-100'],
    title: 'Gånger börjar',
    description: 'Multiplikation som upprepad addition — tabell 2, 5 och 10.',
  }),
  def({
    id: 'div-intro', world: 'multiplikationsskogen', area: 'taluppfattning', term: t('2', 'VT', 2), gen: true,
    prereq: ['mult-intro'],
    title: 'Dela lika',
    description: 'Division som rättvis delning.',
  }),
  def({
    id: 'tabeller-alla', world: 'multiplikationsskogen', area: 'taluppfattning', term: t('3', 'HT', 1), gen: true,
    prereq: ['mult-intro'],
    title: 'Alla tabeller',
    description: 'Multiplikationstabellerna 1–10 med flyt.',
  }),
  def({
    id: 'mult-div-samband', world: 'multiplikationsskogen', area: 'taluppfattning', term: t('3', 'VT', 1), gen: true,
    prereq: ['tabeller-alla', 'div-intro'],
    title: 'Gånger och delat hör ihop',
    description: 'Sambandet: 6×7=42 betyder att 42/7=6.',
  }),
  def({
    id: 'skriftlig-mult', world: 'multiplikationsskogen', area: 'taluppfattning', term: t('4', 'HT', 2), gen: true,
    prereq: ['mult-div-samband', 'add-sub-0-1000'],
    title: 'Uppställning gånger',
    description: 'Skriftlig multiplikation: 34 × 6 med minnessiffra.',
  }),
  def({
    id: 'kort-division', world: 'multiplikationsskogen', area: 'taluppfattning', term: t('4', 'VT', 1), gen: true,
    prereq: ['skriftlig-mult'],
    title: 'Kort division',
    description: 'Dela stora tal: 84/4, även med rest.',
  }),
  def({
    id: 'mult-div-stora', world: 'multiplikationsskogen', area: 'taluppfattning', term: t('5', 'HT', 1), gen: true,
    prereq: ['kort-division'],
    title: 'Gånger och delat med stora tal',
    description: 'Flersiffrig multiplikation och division, tiopotenser.',
  }),

  // ================= BRÅKBERGET — bråk, decimaler, procent =================
  def({
    id: 'brak-intro', world: 'brakberget', area: 'taluppfattning', term: t('3', 'VT', 2), gen: true,
    prereq: ['div-intro'],
    title: 'Bråk börjar',
    description: 'Del av helhet: halvor, tredjedelar, fjärdedelar.',
  }),
  def({
    id: 'brak-jamfora', world: 'brakberget', area: 'taluppfattning', term: t('4', 'VT', 2), gen: true,
    prereq: ['brak-intro'],
    title: 'Jämföra bråk',
    description: 'Vilket är störst — 2/3 eller 3/5? Likvärdiga bråk.',
  }),
  def({
    id: 'decimal-intro', world: 'brakberget', area: 'taluppfattning', term: t('4', 'VT', 2), gen: true,
    prereq: ['brak-intro', 'stora-tal'],
    title: 'Decimaltal börjar',
    description: 'Tiondelar och hundradelar — kommatecknets plats.',
  }),
  def({
    id: 'decimal-rakna', world: 'brakberget', area: 'taluppfattning', term: t('5', 'HT', 1), gen: true,
    prereq: ['decimal-intro'],
    title: 'Räkna med decimaltal',
    description: 'Addition, subtraktion och jämförelser med decimaler.',
  }),
  def({
    id: 'brak-rakna', world: 'brakberget', area: 'taluppfattning', term: t('5', 'HT', 2), gen: true,
    prereq: ['brak-jamfora'],
    title: 'Räkna med bråk',
    description: 'Addera och subtrahera bråk, bråk av ett antal.',
  }),
  def({
    id: 'procent-intro', world: 'brakberget', area: 'taluppfattning', term: t('5', 'VT', 1), gen: true,
    prereq: ['brak-rakna', 'decimal-rakna'],
    title: 'Procent börjar',
    description: 'Hundradelar i vardagen: 50 %, 25 %, rea och räntor.',
  }),
  def({
    id: 'brak-decimal-procent', world: 'brakberget', area: 'taluppfattning', term: t('6', 'HT', 1), gen: true,
    prereq: ['procent-intro'],
    title: 'Tre former, samma tal',
    description: 'Växla mellan bråk, decimaltal och procent.',
  }),

  // ================= MÖNSTERSKOGEN — algebra =================
  def({
    id: 'monster-enkla', world: 'monsterskogen', area: 'algebra', term: t('F', 'VT', 2), gen: true,
    title: 'Mönster',
    description: 'Se och fortsätta enkla mönster.',
  }),
  def({
    id: 'talfoljder-1', world: 'monsterskogen', area: 'algebra', term: t('1', 'VT', 2), gen: true,
    prereq: ['monster-enkla', 'add-sub-0-20'],
    title: 'Talföljder',
    description: 'Hoppa på talraden: 2, 4, 6 … vad kommer sen?',
  }),
  def({
    id: 'likhetstecken', world: 'monsterskogen', area: 'algebra', term: t('2', 'HT', 2), gen: true,
    prereq: ['add-sub-0-20'],
    title: 'Likhetstecknets vågskål',
    description: 'Båda sidor lika mycket: 5 + __ = 9 + 3.',
  }),
  def({
    id: 'oppna-utsagor-100', world: 'monsterskogen', area: 'algebra', term: t('3', 'HT', 1), gen: true,
    prereq: ['likhetstecken', 'vaxling-0-100'],
    title: 'Öppna utsagor',
    description: 'Hitta det gömda talet: __ − 38 = 34.',
  }),
  def({
    id: 'monster-regler', world: 'monsterskogen', area: 'algebra', term: t('4', 'VT', 1), gen: true,
    prereq: ['oppna-utsagor-100', 'tabeller-alla'],
    title: 'Mönster med regler',
    description: 'Talföljder med regel — beskriv och förutsäg.',
  }),
  def({
    id: 'enkla-ekvationer', world: 'monsterskogen', area: 'algebra', term: t('5', 'VT', 2), gen: true,
    prereq: ['monster-regler'],
    title: 'Enkla ekvationer',
    description: 'x + 12 = 30 — bokstaven som gömmer ett tal.',
  }),
  def({
    id: 'ekvationer-tva-steg', world: 'monsterskogen', area: 'algebra', term: t('6', 'VT', 1),
    prereq: ['enkla-ekvationer'],
    title: 'Ekvationer i två steg',
    description: '2x + 3 = 11 — lös steg för steg.',
  }),

  // ================= FORMERNAS BERG — geometri =================
  def({
    id: 'former-2d', world: 'formernas-berg', area: 'geometri', term: t('F', 'VT', 1), gen: true,
    title: 'Formerna',
    description: 'Cirkel, triangel, kvadrat, rektangel — känna igen och namnge.',
  }),
  def({
    id: 'former-3d', world: 'formernas-berg', area: 'geometri', term: t('1', 'HT', 2),
    prereq: ['former-2d'],
    title: 'Kroppar',
    description: 'Klot, kub, cylinder — formerna i tre dimensioner.',
  }),
  def({
    id: 'klockan-hel-halv', world: 'formernas-berg', area: 'geometri', term: t('1', 'VT', 1), gen: true,
    prereq: ['talrad-0-20'],
    title: 'Klockan: hel och halv',
    description: 'Läsa av hel- och halvtimmar.',
  }),
  def({
    id: 'klockan-kvart', world: 'formernas-berg', area: 'geometri', term: t('2', 'HT', 1), gen: true,
    prereq: ['klockan-hel-halv'],
    title: 'Klockan: kvartar',
    description: 'Kvart över och kvart i.',
  }),
  def({
    id: 'matning-langd', world: 'formernas-berg', area: 'geometri', term: t('2', 'VT', 2), gen: true,
    prereq: ['positionssystem-100'],
    title: 'Mäta längd',
    description: 'Centimeter och meter — mäta, jämföra, växla enhet.',
  }),
  def({
    id: 'klockan-minuter', world: 'formernas-berg', area: 'geometri', term: t('3', 'HT', 2), gen: true,
    prereq: ['klockan-kvart'],
    title: 'Klockan: minuter',
    description: 'Hela klockan, digital och analog, tidsskillnader.',
  }),
  def({
    id: 'symmetri', world: 'formernas-berg', area: 'geometri', term: t('3', 'VT', 1),
    prereq: ['former-2d'],
    title: 'Symmetri',
    description: 'Spegellinjer i former och bilder.',
  }),
  def({
    id: 'omkrets', world: 'formernas-berg', area: 'geometri', term: t('4', 'HT', 2), gen: true,
    prereq: ['matning-langd', 'add-sub-0-1000'],
    title: 'Omkrets',
    description: 'Runt om figuren — räkna ut omkretsen.',
  }),
  def({
    id: 'area', world: 'formernas-berg', area: 'geometri', term: t('5', 'HT', 2), gen: true,
    prereq: ['omkrets', 'tabeller-alla'],
    title: 'Area',
    description: 'Ytan innanför: rektanglar och trianglar.',
  }),
  def({
    id: 'vinklar', world: 'formernas-berg', area: 'geometri', term: t('6', 'HT', 2),
    prereq: ['area'],
    title: 'Vinklar',
    description: 'Räta, spetsiga och trubbiga vinklar — mäta i grader.',
  }),
  def({
    id: 'skala', world: 'formernas-berg', area: 'geometri', term: t('6', 'VT', 1),
    prereq: ['area'],
    title: 'Skala',
    description: 'Kartor och ritningar — förminskat och förstorat.',
  }),

  // ================= DIAGRAMÖARNA — sannolikhet & statistik =================
  def({
    id: 'sortera-tabeller', world: 'diagramoarna', area: 'sannolikhet', term: t('1', 'VT', 2),
    prereq: ['antal-0-10'],
    title: 'Sortera och räkna',
    description: 'Enkla tabeller — sortera och sammanställa.',
  }),
  def({
    id: 'stapeldiagram', world: 'diagramoarna', area: 'sannolikhet', term: t('2', 'VT', 2),
    prereq: ['sortera-tabeller'],
    title: 'Stapeldiagram',
    description: 'Läsa av och rita staplar.',
  }),
  def({
    id: 'diagram-lasa', world: 'diagramoarna', area: 'sannolikhet', term: t('4', 'VT', 1),
    prereq: ['stapeldiagram'],
    title: 'Läsa diagram',
    description: 'Linje- och cirkeldiagram — vad säger de egentligen?',
  }),
  def({
    id: 'medelvarde', world: 'diagramoarna', area: 'sannolikhet', term: t('5', 'VT', 1), gen: true,
    prereq: ['kort-division'],
    title: 'Medelvärde',
    description: 'Lägga ihop och dela lika — typvärde och median också.',
  }),
  def({
    id: 'sannolikhet-intro', world: 'diagramoarna', area: 'sannolikhet', term: t('6', 'HT', 2), gen: true,
    prereq: ['brak-jamfora'],
    title: 'Chans och risk',
    description: 'Tärningar och lotter — hur stor är chansen?',
  }),

  // ================= SAMBANDSGROTTAN — samband & förändring =================
  def({
    id: 'dubbelt-halften', world: 'sambandsgrottan', area: 'samband', term: t('2', 'HT', 2), gen: true,
    prereq: ['add-sub-0-100'],
    title: 'Dubbelt och hälften',
    description: 'Det enklaste sambandet — dubblera och halvera.',
  }),
  def({
    id: 'proportionalitet', world: 'sambandsgrottan', area: 'samband', term: t('4', 'VT', 2), gen: true,
    prereq: ['tabeller-alla', 'dubbelt-halften'],
    title: 'Proportionalitet',
    description: 'Kostar 2 bullar 10 kr — vad kostar 6?',
  }),
  def({
    id: 'koordinatsystem', world: 'sambandsgrottan', area: 'samband', term: t('5', 'VT', 2),
    prereq: ['negativa-tal'],
    title: 'Koordinatsystem',
    description: 'Punkter med adress: (3, 4).',
  }),
  def({
    id: 'grafer', world: 'sambandsgrottan', area: 'samband', term: t('6', 'VT', 2),
    prereq: ['koordinatsystem', 'proportionalitet'],
    title: 'Grafer',
    description: 'Proportionella samband som linjer i koordinatsystemet.',
  }),

  // ================= PROBLEMLÖSNING & KONTROLL — vävs in men har egna moment =================
  def({
    id: 'rimlighet', world: 'talens-dal', area: 'problem', term: t('2', 'VT', 2), gen: true,
    prereq: ['add-sub-0-100'],
    title: 'Är det rimligt?',
    description: 'Uppskatta först — kan 47+25 bli 612?',
  }),
  def({
    id: 'kontroll-motsatt', world: 'talens-dal', area: 'problem', term: t('3', 'VT', 1), gen: true,
    prereq: ['vaxling-0-100'],
    title: 'Kontrollera svaret',
    description: 'Kolla din subtraktion med addition — motsatt räknesätt.',
  }),
  def({
    id: 'overslagsrakning', world: 'talens-dal', area: 'problem', term: t('4', 'HT', 1), gen: true,
    prereq: ['add-sub-0-1000', 'rimlighet'],
    title: 'Överslagsräkning',
    description: 'Räkna ungefär: 398 + 205 är nästan 400 + 200.',
  }),
  def({
    id: 'problemlosning-flerstegs', world: 'multiplikationsskogen', area: 'problem', term: t('5', 'HT', 2), gen: true,
    prereq: ['mult-div-stora', 'kontroll-motsatt'],
    title: 'Kluringar i flera steg',
    description: 'Problem som kräver flera räknesätt — och en plan.',
  }),
]

// ---------- Uppslag och hjälpfunktioner ----------

const byId = new Map(MOMENTS.map((m) => [m.id, m]))

export const momentById = (id: string): Moment => {
  const m = byId.get(id)
  if (!m) throw new Error(`Okänt moment: ${id}`)
  return m
}

const YEAR_ORDER: SchoolYear[] = ['F', '1', '2', '3', '4', '5', '6']

export const termSortKey = (slot: TermSlot): number =>
  YEAR_ORDER.indexOf(slot.year) * 4 + (slot.term === 'HT' ? 0 : 2) + (slot.half - 1)

/** Moment i läroplansordning (år → termin → halva → definitionsordning). */
export const MOMENTS_ORDERED: Moment[] = [...MOMENTS].sort(
  (a, b) => termSortKey(a.term) - termSortKey(b.term),
)

export const momentsInWorld = (worldId: string): Moment[] =>
  MOMENTS_ORDERED.filter((m) => m.worldId === worldId)

/** Momenten som ingår i ett terminsmål (t.ex. "HT åk 2, första halvan"). */
export const momentsInTermHalf = (year: SchoolYear, term: 'HT' | 'VT', half: 1 | 2): Moment[] =>
  MOMENTS.filter((m) => m.term.year === year && m.term.term === term && m.term.half === half)

/** Sanity-kontroll av trädet — körs i test. */
export function validateCurriculum(): string[] {
  const errors: string[] = []
  const seen = new Set<string>()
  for (const m of MOMENTS) {
    if (seen.has(m.id)) errors.push(`Dubblerat moment-id: ${m.id}`)
    seen.add(m.id)
    for (const p of m.prerequisites) {
      const pre = byId.get(p)
      if (!pre) { errors.push(`${m.id}: okänd förkunskap ${p}`); continue }
      if (termSortKey(pre.term) > termSortKey(m.term))
        errors.push(`${m.id}: förkunskapen ${p} ligger senare i läroplanen`)
    }
  }
  // Cykelkontroll via topologisk sortering
  const state = new Map<string, 0 | 1 | 2>()
  const visit = (id: string, trail: string[]): void => {
    const s = state.get(id) ?? 0
    if (s === 1) { errors.push(`Cykel i förkunskaper: ${[...trail, id].join(' → ')}`); return }
    if (s === 2) return
    state.set(id, 1)
    for (const p of byId.get(id)?.prerequisites ?? []) visit(p, [...trail, id])
    state.set(id, 2)
  }
  for (const m of MOMENTS) visit(m.id, [])
  return errors
}
