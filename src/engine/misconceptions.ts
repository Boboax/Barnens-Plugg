import type { MisconceptionTag } from '../domain/types'

/* ============================================================
   Missuppfattningstaxonomin i klarspråk.

   childHint visas för barnet direkt efter felet (kort, varm ton).
   parentNote används i veckorapporten (förklarar mönstret för
   en vuxen vid köksbordet).
   ============================================================ */

export interface MisconceptionInfo {
  childHint: string
  parentNote: string
}

export const MISCONCEPTIONS: Record<MisconceptionTag, MisconceptionInfo> = {
  'glomd-vaxling': {
    childHint: 'Kolla entalen — räcker de? Ibland måste man växla ett tiotal.',
    parentNote: 'Räknar "störst minus minst" i varje kolumn i stället för att växla. Träna med tiobasmaterial: växla ett tiotal till tio ental.',
  },
  'glomd-minnessiffra': {
    childHint: 'Blev det tio eller mer? Glöm inte minnessiffran!',
    parentNote: 'Tappar minnessiffran vid tiotalsövergång. Be barnet säga minnessiffran högt när den skrivs.',
  },
  'positionsfel': {
    childHint: 'Titta noga på talens platser — vilken siffra är tiotal och vilken är ental?',
    parentNote: 'Blandar ihop siffrornas platsvärden. Träna att bygga tal med tiotal och ental ("47 är 4 tior och 7 enkronor").',
  },
  'fel-raknesatt': {
    childHint: 'Läs uppgiften en gång till — ska det bli fler eller färre?',
    parentNote: 'Väljer fel räknesätt, oftast i textuppgifter. Träna att rita uppgiften eller berätta den med egna ord innan räknandet.',
  },
  'en-fel': {
    childHint: 'Nästan! Räkna en gång till, lugnt och fint.',
    parentNote: 'Svaret ligger ±1 eller ±10 från rätt — ofta fingerräkning eller slarv snarare än en kunskapslucka.',
  },
  'storre-namnare-storre-brak': {
    childHint: 'Tänk på kakbitarna: ju fler bitar kakan delas i, desto mindre blir varje bit!',
    parentNote: 'Tror att större nämnare betyder större bråk (1/8 > 1/4). Rita och jämför bitar av samma helhet.',
  },
  'decimal-langd': {
    childHint: 'Fler siffror betyder inte större tal — jämför tiondelarna först!',
    parentNote: 'Tolkar decimaltal som "långa tal är stora" (0,25 > 0,5). Placera talen på en tallinje tillsammans.',
  },
  'likhetstecken-resultat': {
    childHint: 'Likhetstecknet är en våg — båda sidor ska väga lika mycket!',
    parentNote: 'Tolkar "=" som "här kommer svaret" i stället för att sidorna är lika värda. Grundläggande för algebra — värt att träna klart.',
  },
  'nolla-multiplikation': {
    childHint: 'Se upp med nollorna — de följer med i svaret!',
    parentNote: 'Tappar eller lägger till nollor vid multiplikation med tiotal (30 × 4). Dela upp: 3 × 4 = 12, sedan × 10.',
  },
  'rest-ignorerad': {
    childHint: 'Gick delningen jämnt upp? Kolla om något blev över!',
    parentNote: 'Ignorerar resten vid division. Träna med konkret delning där något faktiskt blir över.',
  },
  'enhet-fel': {
    childHint: 'Kolla enheterna — hur många centimeter går det på en meter?',
    parentNote: 'Växlar enheter fel (m/cm/mm). Koppla till kroppen: en meter är ett stort kliv, en centimeter en fingerbredd.',
  },
  'okand': {
    childHint: 'Inte riktigt — titta på förklaringen så visar jag!',
    parentNote: 'Fel som inte matchar något känt mönster.',
  },
}

export const misconceptionInfo = (tag: MisconceptionTag): MisconceptionInfo => MISCONCEPTIONS[tag]
