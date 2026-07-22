import type { DifficultyLevel, TaskGenerator } from '../domain/types'
import { createRng, type Rng } from './rng'
import { choiceTask, lerpInt, numericTask } from './helpers'

/* ============================================================
   Formernas berg — former, klockan, mätning, omkrets och area.
   ============================================================ */

const g = (
  id: string,
  fn: (level: DifficultyLevel, seed: number, rng: Rng) => ReturnType<typeof numericTask>,
): TaskGenerator => ({
  id: `gen.${id}`,
  generate: (level, seed) => fn(level, seed, createRng(seed)),
})

// ---------- Formerna (F) ----------

const former2d = g('former-2d', (level, seed, rng) => {
  const id = 'gen.former-2d'
  const shapes = [
    { name: 'cirkel', shape: 'cirkel', corners: 0, sides: 0 },
    { name: 'triangel', shape: 'triangel', corners: 3, sides: 3 },
    { name: 'kvadrat', shape: 'kvadrat', corners: 4, sides: 4 },
    { name: 'rektangel', shape: 'rektangel', corners: 4, sides: 4 },
    { name: 'femhörning', shape: 'femhorning', corners: 5, sides: 5 },
    { name: 'sexhörning', shape: 'sexhorning', corners: 6, sides: 6 },
  ] as const
  const pool = level <= 4 ? shapes.slice(0, 4) : shapes
  const shape = rng.pick(pool)
  if (level >= 6 || (shape.corners > 0 && rng.chance(0.5))) {
    // Hörnfrågan visar formen som STOR bild — barnet räknar hörnen själv.
    const target = rng.pick(pool.filter((s) => s.corners > 0))
    return choiceTask({
      generatorId: id, level, seed, rng,
      prompt: `Hur många hörn har formen?`,
      correct: String(target.corners),
      distractors: [
        [String(target.corners + 1), null],
        [String(Math.max(0, target.corners - 1)), null],
        [String(target.corners + 2), null],
      ],
      visual: { kind: 'form', shape: target.shape },
      explanation: `En ${target.name} har ${target.corners} hörn och ${target.sides} sidor.`,
    })
  }
  return choiceTask({
    generatorId: id, level, seed, rng,
    prompt: `Vad heter formen?`,
    correct: shape.name,
    distractors: pool
      .filter((s) => s.name !== shape.name)
      .slice(0, 3)
      .map((s) => [s.name, null] as [string, null]),
    visual: { kind: 'form', shape: shape.shape },
    explanation: `Formen på bilden är en ${shape.name}${shape.corners > 0 ? ` — den har ${shape.corners} hörn` : ' — den är helt rund, utan hörn'}.`,
  })
})

// ---------- Klockan ----------

const klockText = (h: number, m: number): string => {
  const names = ['tolv', 'ett', 'två', 'tre', 'fyra', 'fem', 'sex', 'sju', 'åtta', 'nio', 'tio', 'elva'] as const
  const hh = names[h % 12]
  const next = names[(h + 1) % 12]
  if (m === 0) return `klockan ${hh}`
  if (m === 30) return `halv ${next}`
  if (m === 15) return `kvart över ${hh}`
  if (m === 45) return `kvart i ${next}`
  if (m < 30) return `${m} över ${hh}`
  return `${60 - m} i ${next}`
}

function makeKlocka(momentId: string, minutePool: (level: DifficultyLevel, rng: Rng) => number): TaskGenerator {
  const id = `gen.${momentId}`
  return {
    id,
    generate: (level, seed) => {
      const rng = createRng(seed)
      const h = rng.int(1, 12)
      const m = minutePool(level, rng)
      const correct = klockText(h, m)
      // Distraktorer: klassiska avläsningsfel.
      const wrongs = [
        klockText(h, (m + 30) % 60), // halv/hel förväxlat
        klockText((h + 1) % 12 || 12, m), // fel timme
        klockText(h, (60 - m) % 60), // "över" och "i" förväxlat
      ].filter((w) => w !== correct)
      return choiceTask({
        generatorId: id, level, seed, rng,
        prompt: 'Vad är klockan?',
        correct,
        distractors: [...new Set(wrongs)].slice(0, 3).map((w) => [w, null] as [string, null]),
        visual: { kind: 'klocka', hours: h, minutes: m },
        explanation: `Den korta visaren pekar på timmen, den långa på minuterna: ${correct}.`,
      })
    },
  }
}

const klockanHelHalv = makeKlocka('klockan-hel-halv', (level, rng) =>
  level <= 4 ? 0 : rng.pick([0, 30] as const),
)
const klockanKvart = makeKlocka('klockan-kvart', (level, rng) =>
  level <= 3 ? rng.pick([0, 30] as const) : rng.pick([0, 15, 30, 45] as const),
)
const klockanMinuter = makeKlocka('klockan-minuter', (level, rng) =>
  level <= 3 ? rng.pick([5, 10, 20, 25] as const) : rng.pick([5, 10, 20, 25, 35, 40, 50, 55] as const),
)

// ---------- Mäta längd (åk 2) ----------

const matningLangd = g('matning-langd', (level, seed, rng) => {
  const id = 'gen.matning-langd'
  if (level >= 6) {
    const mm = rng.pick([0, 5] as const)
    const cm = rng.int(2, 30)
    const kind = rng.pick(['cm-mm', 'm-cm-blandat'] as const)
    if (kind === 'cm-mm') {
      return numericTask({
        generatorId: id, level, seed,
        prompt: `Hur många millimeter är ${cm} cm${mm ? ` och ${mm} mm` : ''}?`,
        value: cm * 10 + mm,
        unit: 'mm',
        explanation: `1 cm = 10 mm, så ${cm} cm = ${cm * 10} mm${mm ? ` — plus ${mm} mm = ${cm * 10 + mm} mm` : ''}.`,
        misconceptions: { [cm + mm]: 'enhet-fel', [cm * 100 + mm]: 'enhet-fel' },
      })
    }
    const meters = rng.int(1, 5)
    const extraCm = rng.int(5, 95)
    return numericTask({
      generatorId: id, level, seed,
      prompt: `Ett rep är ${meters} m och ${extraCm} cm. Hur många centimeter är det?`,
      value: meters * 100 + extraCm,
      unit: 'cm',
      explanation: `1 m = 100 cm: ${meters} m = ${meters * 100} cm, plus ${extraCm} cm = ${meters * 100 + extraCm} cm.`,
      misconceptions: { [meters * 10 + extraCm]: 'enhet-fel', [meters + extraCm]: 'enhet-fel' },
    })
  }
  const m = rng.int(1, lerpInt(level, 3, 9))
  return numericTask({
    generatorId: id, level, seed,
    prompt: `Hur många centimeter är ${m} meter?`,
    value: m * 100,
    unit: 'cm',
    explanation: `1 meter = 100 centimeter, så ${m} m = ${m * 100} cm.`,
    misconceptions: { [m * 10]: 'enhet-fel', [m * 1000]: 'enhet-fel' },
  })
})

// ---------- Omkrets (åk 4) ----------

const omkrets = g('omkrets', (level, seed, rng) => {
  const id = 'gen.omkrets'
  const w = rng.int(2, lerpInt(level, 8, 20))
  const h = rng.int(2, lerpInt(level, 6, 15))
  if (level >= 8 && rng.chance(0.5)) {
    // Baklänges: given omkrets, hitta saknad sida.
    const o = 2 * (w + h)
    return numericTask({
      generatorId: id, level, seed,
      prompt: `En rektangel har omkretsen ${o} cm. Ena sidan är ${w} cm. Hur lång är den andra sidan?`,
      value: h,
      unit: 'cm',
      // Ingen bild: h=0 ritade en platt linje, och att rita rektangeln med
      // båda sidorna hade avslöjat svaret. Stjärnnivå klarar sig utan stöd.
      visual: { kind: 'ingen' },
      explanation: `Två sidor à ${w} cm tar ${2 * w} cm. Kvar: ${o} − ${2 * w} = ${o - 2 * w} cm på två sidor, alltså ${h} cm var.`,
      misconceptions: { [o - w]: 'fel-raknesatt', [o - 2 * w]: 'fel-raknesatt' },
    })
  }
  return numericTask({
    generatorId: id, level, seed,
    prompt: `En rektangel är ${w} cm bred och ${h} cm hög. Vad är omkretsen?`,
    value: 2 * (w + h),
    unit: 'cm',
    visual: { kind: 'rektangel', w, h, unit: 'cm' },
    explanation: `Runt hela: ${w} + ${h} + ${w} + ${h} = ${2 * (w + h)} cm.`,
    misconceptions: { [w * h]: 'fel-raknesatt', [w + h]: 'fel-raknesatt' },
  })
})

// ---------- Area (åk 5) ----------

const area = g('area', (level, seed, rng) => {
  const id = 'gen.area'
  const w = rng.int(2, lerpInt(level, 8, 20))
  const h = rng.int(2, lerpInt(level, 5, 15))
  if (level >= 7 && rng.chance(0.4)) {
    // Triangel = halva rektangeln.
    const base = w % 2 === 0 ? w : w + 1
    return numericTask({
      generatorId: id, level, seed,
      prompt: `En triangel har basen ${base} cm och höjden ${h} cm. Vad är arean?`,
      value: (base * h) / 2,
      unit: 'cm²',
      explanation: `Triangeln är en halv rektangel: ${base} × ${h} / 2 = ${(base * h) / 2} cm².`,
      misconceptions: { [base * h]: 'fel-raknesatt', [base + h]: 'fel-raknesatt' },
    })
  }
  return numericTask({
    generatorId: id, level, seed,
    prompt: `En rektangel är ${w} cm bred och ${h} cm hög. Vad är arean?`,
    value: w * h,
    unit: 'cm²',
    visual: { kind: 'rektangel', w, h, unit: 'cm' },
    explanation: `Arean är ytan innanför: ${w} × ${h} = ${w * h} cm². (Omkretsen hade varit ${2 * (w + h)} cm — blanda inte ihop dem!)`,
    misconceptions: { [2 * (w + h)]: 'fel-raknesatt', [w + h]: 'fel-raknesatt' },
  })
})

// ---------- Geometri, etapp C (docs/SPEC-GEOMETRI.md): kroppar, symmetri, vinklar ----------

/* FACIT — kropparnas egenskaper. TABELLEN ÄR SANNINGEN; enhetstestas, ändras
   aldrig på känn. (Kanter/hörn för runda kroppar följer svensk skolkonvention.) */
export const BODY_FACTS = {
  klot: { name: 'Klot', art: 'ett', ytor: 1, horn: 0, kanter: 0, rullar: true, polyeder: false },
  kub: { name: 'Kub', art: 'en', ytor: 6, horn: 8, kanter: 12, rullar: false, polyeder: true },
  ratblock: { name: 'Rätblock', art: 'ett', ytor: 6, horn: 8, kanter: 12, rullar: false, polyeder: true },
  cylinder: { name: 'Cylinder', art: 'en', ytor: 3, horn: 0, kanter: 2, rullar: true, polyeder: false },
  kon: { name: 'Kon', art: 'en', ytor: 2, horn: 1, kanter: 1, rullar: true, polyeder: false },
  pyramid: { name: 'Pyramid', art: 'en', ytor: 5, horn: 5, kanter: 8, rullar: false, polyeder: true },
} as const
type BodyKey = keyof typeof BODY_FACTS

/* FACIT — spegellinjer. Rektangelns diagonal är AVSIKTLIGT falsk (den klassiska
   missuppfattningen). count = totalt antal spegellinjer (−1 = oändligt, cirkel). */
export const MIRROR_FACTS = {
  cirkel: { lodrat: true, vagrat: true, diagonal: true, count: -1 },
  kvadrat: { lodrat: true, vagrat: true, diagonal: true, count: 4 },
  rektangel: { lodrat: true, vagrat: true, diagonal: false, count: 2 },
  triangel: { lodrat: true, vagrat: false, diagonal: false, count: 3 },
  hjarta: { lodrat: true, vagrat: false, diagonal: false, count: 1 },
} as const
type ShapeKey = keyof typeof MIRROR_FACTS

// Kroppar (åk 1 HT) — 7-åringar: korta ord, flerval + bild.
const former3d = g('former-3d', (level, seed, rng) => {
  const id = 'gen.former-3d'
  const basic: BodyKey[] = ['klot', 'kub', 'cylinder', 'kon']
  const all: BodyKey[] = ['klot', 'kub', 'cylinder', 'kon', 'pyramid', 'ratblock']
  const pool = level <= 3 ? basic : all
  const nameOf = (k: BodyKey): string => BODY_FACTS[k].name
  // "en kub" / "ett klot" — rätt genus per kropp.
  const enOf = (k: BodyKey): string => `${BODY_FACTS[k].art} ${BODY_FACTS[k].name.toLowerCase()}`
  const nameChoices = (correct: BodyKey): [string, null][] =>
    rng.shuffle(pool.filter((k) => k !== correct)).slice(0, 3).map((k) => [nameOf(k), null])

  // Nivå 8–10: gåtor med korta meningar (åk 1-språk även på stjärnan). Fler
  // gåtor (cylinder/pyramid/rätblock) så stjärnan inte upprepar samma tre.
  // `force` = en särskilt lockande felkropp som alltid ska vara med.
  if (level >= 8) {
    const riddle = rng.pick([
      { q: 'Jag har 6 lika stora sidoytor. Vad är jag?', a: 'kub' as BodyKey, force: 'ratblock' as BodyKey,
        why: 'En kub har 6 lika stora kvadrat-ytor. Ett rätblock har också 6 ytor, men de är inte lika stora.' },
      { q: 'Jag har 6 sidoytor, men alla är inte lika stora. Vad är jag?', a: 'ratblock' as BodyKey, force: 'kub' as BodyKey,
        why: 'Ett rätblock har 6 ytor med olika storlek. En kub har också 6 ytor, men de är alla lika stora.' },
      { q: 'Jag kan rulla och har en spets. Vad är jag?', a: 'kon' as BodyKey, force: 'pyramid' as BodyKey,
        why: 'En kon har en spets och en rund botten — därför kan den rulla. En pyramid har platta ytor och kan inte rulla.' },
      { q: 'Jag har en spets och en fyrkantig botten. Vad är jag?', a: 'pyramid' as BodyKey, force: 'kon' as BodyKey,
        why: 'En pyramid har en spets över en fyrkantig botten — bara platta ytor. En kon har en rund botten.' },
      { q: 'Jag kan rulla och har två platta cirklar. Vad är jag?', a: 'cylinder' as BodyKey, force: 'klot' as BodyKey,
        why: 'En cylinder har två runda cirkelytor och en rund sida — den rullar på sidan.' },
      { q: 'Jag är rund överallt och kan rulla åt alla håll. Vad är jag?', a: 'klot' as BodyKey, force: 'cylinder' as BodyKey,
        why: 'Ett klot är runt åt alla håll. En cylinder rullar bara åt ett håll.' },
    ])
    const distr: [string, null][] = [
      [nameOf(riddle.force), null],
      ...nameChoices(riddle.a).filter(([n]) => n !== nameOf(riddle.force)).slice(0, 2),
    ]
    return choiceTask({
      generatorId: id, level, seed, rng,
      prompt: riddle.q, correct: nameOf(riddle.a), distractors: distr,
      explanation: riddle.why,
    })
  }

  const which = rng.pick(level <= 3 ? ['namn', 'vardag'] as const : ['namn', 'rulla', 'antal'] as const)
  if (which === 'namn') {
    const k = rng.pick(pool)
    return choiceTask({
      generatorId: id, level, seed, rng,
      visual: { kind: 'kropp', body: k },
      prompt: 'Vad heter formen?', correct: nameOf(k), distractors: nameChoices(k),
      explanation: `Det är ${enOf(k)}.`,
    })
  }
  if (which === 'vardag') {
    const VARDAG: [string, BodyKey][] = [['en boll', 'klot'], ['en tärning', 'kub'], ['en konservburk', 'cylinder'], ['en glasstrut', 'kon']]
    const [obj, k] = rng.pick(VARDAG)
    return choiceTask({
      generatorId: id, level, seed, rng,
      prompt: `Vilken form är ${obj}?`, correct: nameOf(k), distractors: nameChoices(k),
      explanation: `${obj[0].toUpperCase()}${obj.slice(1)} har formen av ${enOf(k)}.`,
    })
  }
  if (which === 'rulla') {
    const k = rng.pick(pool)
    const rullar = BODY_FACTS[k].rullar
    // Kongruens efter genus: "ett klot är runt … det kan rulla" (inte "rund … den").
    const neutrum = BODY_FACTS[k].art === 'ett'
    const pron = neutrum ? 'det' : 'den'
    const rund = neutrum ? 'runt' : 'rund'
    const Cap = `${enOf(k)[0].toUpperCase()}${enOf(k).slice(1)}`
    return choiceTask({
      generatorId: id, level, seed, rng,
      visual: { kind: 'kropp', body: k },
      prompt: `Kan ${enOf(k)} rulla?`, correct: rullar ? 'Ja' : 'Nej',
      distractors: [[rullar ? 'Nej' : 'Ja', null]],
      explanation: rullar
        ? `${Cap} är ${rund} någonstans — ${pron} kan rulla.`
        : `${Cap} har bara platta sidor — ${pron} kan inte rulla.`,
    })
  }
  // 'antal': hörn/kanter bara för polyedrar (entydigt); ytor för alla.
  const k = rng.pick(pool)
  const facts = BODY_FACTS[k]
  const prop = facts.polyeder ? rng.pick(['ytor', 'horn', 'kanter'] as const) : 'ytor'
  const label = prop === 'ytor' ? 'sidoytor' : prop === 'horn' ? 'hörn' : 'kanter'
  // Klotets enda yta ger "1 sidoyta" (inte "1 sidoytor"); hörn är samma i sing.
  const singular = prop === 'ytor' ? 'sidoyta' : prop === 'horn' ? 'hörn' : 'kant'
  const enhet = facts[prop] === 1 ? singular : label
  const en = enOf(k)
  return numericTask({
    generatorId: id, level, seed,
    visual: { kind: 'kropp', body: k },
    // enOf → rätt genus: "har ett klot" / "har en kub" (inte "en klot").
    prompt: `Hur många ${label} har ${en}?`,
    value: facts[prop],
    explanation: `${en[0].toUpperCase()}${en.slice(1)} har ${facts[prop]} ${enhet}.`,
    misconceptions: { [facts[prop] + 1]: 'en-fel', [facts[prop] - 1]: 'en-fel' },
  })
})

// Symmetri (åk 3 VT).
const symmetri = g('symmetri', (level, seed, rng) => {
  const id = 'gen.symmetri'
  const axisName = { lodrat: 'lodrät', vagrat: 'vågrät', diagonal: 'diagonal' } as const

  if (level <= 3) {
    // Ja/Nej: är den ritade linjen en spegellinje? Väg in rektangel+diagonal ofta.
    const shape: ShapeKey = rng.chance(0.4) ? 'rektangel' : rng.pick(['cirkel', 'kvadrat', 'rektangel', 'triangel', 'hjarta'])
    const axis = shape === 'rektangel' && rng.chance(0.5) ? 'diagonal' : rng.pick(['lodrat', 'vagrat', 'diagonal'] as const)
    const ok = MIRROR_FACTS[shape][axis]
    return choiceTask({
      generatorId: id, level, seed, rng,
      visual: { kind: 'spegel', shape, axis },
      prompt: 'Är den streckade linjen en spegellinje?',
      correct: ok ? 'Ja' : 'Nej', distractors: [[ok ? 'Nej' : 'Ja', null]],
      explanation: ok
        ? `Ja — viker man figuren längs den ${axisName[axis]}a linjen passar halvorna precis på varandra.`
        : `Nej — viker man längs den ${axisName[axis]}a linjen hamnar halvorna snett. Det är ingen spegellinje.`,
    })
  }
  if (level <= 7) {
    if (rng.chance(0.5)) {
      // Hur många spegellinjer? Bara former som 'form'-bilden kan visa UTAN att
      // rita ut en specifik linje (aldrig cirkel — oändligt; ingen hint-linje).
      const shape = rng.pick(['kvadrat', 'rektangel', 'triangel'] as const)
      return numericTask({
        generatorId: id, level, seed, visual: { kind: 'form', shape },
        prompt: `Hur många spegellinjer har figuren?`,
        value: MIRROR_FACTS[shape].count,
        explanation: `En ${shape === 'triangel' ? 'liksidig triangel' : shape} har ${MIRROR_FACTS[shape].count} spegellinjer.`,
        misconceptions: { [MIRROR_FACTS[shape].count + 1]: 'en-fel', [MIRROR_FACTS[shape].count - 1]: 'en-fel' },
      })
    }
    // Bokstäver med lodrät spegellinje (utan bild).
    const YES = ['A', 'H', 'M', 'O', 'T', 'U', 'V']
    const NO = ['F', 'G', 'J', 'L', 'P', 'R']
    const correct = rng.pick(YES)
    return choiceTask({
      generatorId: id, level, seed, rng,
      prompt: 'Vilken bokstav har en lodrät spegellinje?',
      correct, distractors: rng.shuffle(NO).slice(0, 3).map((c) => [c, null] as [string, null]),
      explanation: `${correct} är likadan på båda sidor om en lodrät linje genom mitten.`,
    })
  }
  // Nivå 8–10: fler spegellinjer än rektangeln, respektive kvadratens sanna diagonal.
  if (rng.chance(0.5)) {
    const more = rng.pick(['kvadrat', 'triangel'] as const) // 4 resp 3 > rektangelns 2
    return choiceTask({
      generatorId: id, level, seed, rng,
      prompt: 'Vilken figur har FLER spegellinjer än en rektangel?',
      correct: more === 'kvadrat' ? 'Kvadrat' : 'Triangel',
      distractors: [['Rektangel', 'fel-raknesatt'], ['Hjärta', null]],
      explanation: `En rektangel har 2 spegellinjer. En ${more === 'kvadrat' ? 'kvadrat har 4' : 'liksidig triangel har 3'} — fler.`,
    })
  }
  // Diagonalfrågan varieras: kvadrat (Ja) ELLER rektangel (Nej — klassiska
  // fällan). Förr var det alltid kvadrat → exakt samma uppgift varje gång.
  const diagShape = rng.pick(['kvadrat', 'rektangel'] as const)
  const diagOk = MIRROR_FACTS[diagShape].diagonal
  return choiceTask({
    generatorId: id, level, seed, rng,
    visual: { kind: 'spegel', shape: diagShape, axis: 'diagonal' },
    prompt: 'Är den streckade linjen en spegellinje?',
    correct: diagOk ? 'Ja' : 'Nej', distractors: [[diagOk ? 'Nej' : 'Ja', null]],
    explanation: diagOk
      ? 'Ja — kvadratens diagonal ÄR en spegellinje: viker man längs den passar halvorna precis på varandra.'
      : 'Nej — rektangelns diagonal är INTE en spegellinje: halvorna hamnar snett (till skillnad från kvadratens diagonal).',
  })
})

/** Klassa en vinkel efter storlek (svensk konvention). */
const angleKind = (d: number): string => (d === 90 ? 'Rät' : d === 180 ? 'Rak' : d < 90 ? 'Spetsig' : 'Trubbig')
const degSpoken = (s: string): string => s.replace(/(\d+)\s*°/g, '$1 grader')

// Vinklar (åk 6 HT).
const vinklar = g('vinklar', (level, seed, rng) => {
  const id = 'gen.vinklar'
  const rot = rng.int(0, 11) * 30 // slumpad rotation → "rät" pekar inte alltid uppåt

  if (level <= 3) {
    const d = rng.pick([30, 45, 60, 90, 120, 135, 150] as const)
    return choiceTask({
      generatorId: id, level, seed, rng,
      visual: { kind: 'vinkel', degrees: d, rot },
      prompt: 'Är vinkeln rät, spetsig eller trubbig?',
      correct: angleKind(d),
      distractors: (['Spetsig', 'Rät', 'Trubbig'] as const).filter((k) => k !== angleKind(d)).map((k) => [k, null] as [string, null]),
      explanation: `En rät vinkel är 90°, som hörnet på ett papper. Den här är ${angleKind(d).toLowerCase()}.`,
    })
  }
  if (level <= 7) {
    const kind = rng.pick(['halv', 'tva-rata', 'rak-linje'] as const)
    if (kind === 'halv') {
      return numericTask({
        generatorId: id, level, seed, visual: { kind: 'vinkel', degrees: 45, rot },
        prompt: 'Vinkeln är en halv rät vinkel. Hur många grader är den?',
        value: 45, unit: '°',
        explanation: 'En rät vinkel är 90°. Hälften av det är 45°.',
        misconceptions: { 90: 'fel-raknesatt' },
      })
    }
    if (kind === 'tva-rata') {
      // Varieras: förr alltid "två räta vinklar = 180" (parameterlöst, ~1/3 av
      // nivå 4–7). Nu tre/fyra räta och rät+halv rät också.
      const combo = rng.pick([
        { q: 'två räta vinklar', v: 180, e: 'Två räta vinklar: 90° + 90° = 180°. Det är en rak linje.' },
        { q: 'tre räta vinklar', v: 270, e: 'Tre räta vinklar: 3 × 90° = 270°.' },
        { q: 'en rät vinkel och en halv rät vinkel', v: 135, e: 'En rät vinkel är 90° och en halv rät är 45°: 90° + 45° = 135°.' },
        { q: 'fyra räta vinklar', v: 360, e: 'Fyra räta vinklar: 4 × 90° = 360°. Det är ett helt varv.' },
      ] as const)
      return numericTask({
        generatorId: id, level, seed,
        prompt: `Hur många grader är ${combo.q} tillsammans?`,
        value: combo.v, unit: '°',
        explanation: combo.e,
        misconceptions: { 90: 'fel-raknesatt' },
      })
    }
    const a = rng.pick([30, 40, 50, 60, 70, 110, 120, 130] as const)
    return numericTask({
      generatorId: id, level, seed, visual: { kind: 'vinkel', degrees: a, rot },
      prompt: `Två vinklar sitter ihop på en rak linje. Den ena är ${a}°. Hur stor är den andra?`,
      spokenPrompt: degSpoken(`Två vinklar sitter ihop på en rak linje. Den ena är ${a}°. Hur stor är den andra?`),
      value: 180 - a, unit: '°',
      explanation: `En rak linje är 180°. Den andra vinkeln är 180° − ${a}° = ${180 - a}°.`,
      misconceptions: { [a]: 'fel-raknesatt', [90 - a > 0 ? 90 - a : a + 90]: 'en-fel' },
    })
  }
  // Nivå 8–10: triangelns (och på högsta nivån fyrhörningens) vinkelsumma.
  if (level >= 10 && rng.chance(0.5)) {
    // Fyrhörning: 360. Konstruera så fjärde ∈ [40,140].
    const a = rng.int(60, 100), b = rng.int(60, 100), c = rng.int(60, 100)
    const d = 360 - a - b - c
    if (d >= 40 && d <= 140) {
      return numericTask({
        generatorId: id, level, seed,
        prompt: `En fyrhörning har vinklarna ${a}°, ${b}° och ${c}°. Hur stor är den fjärde?`,
        spokenPrompt: degSpoken(`En fyrhörning har vinklarna ${a}°, ${b}° och ${c}°. Hur stor är den fjärde?`),
        value: d, unit: '°',
        explanation: `Vinklarna i en fyrhörning är tillsammans 360°. Den fjärde är 360° − ${a}° − ${b}° − ${c}° = ${d}°.`,
        misconceptions: { [a + b + c]: 'fel-raknesatt' },
      })
    }
  }
  // Triangel: 180, svar ∈ [20,120].
  const a = rng.int(30, 90), b = rng.int(30, 90)
  const third = 180 - a - b
  const [aa, bb] = third >= 20 && third <= 120 ? [a, b] : [60, 70]
  return numericTask({
    generatorId: id, level, seed,
    prompt: `En triangel har vinklarna ${aa}° och ${bb}°. Hur stor är den tredje?`,
    spokenPrompt: degSpoken(`En triangel har vinklarna ${aa}° och ${bb}°. Hur stor är den tredje?`),
    value: 180 - aa - bb, unit: '°',
    explanation: `Vinklarna i en triangel är tillsammans 180°. Den tredje är 180° − ${aa}° − ${bb}° = ${180 - aa - bb}°.`,
    misconceptions: { [aa + bb]: 'fel-raknesatt' },
  })
})

// Skala (åk 6 VT, etapp D). Heltalssvar garanterat t.o.m. nivå 7.
const skala = g('skala', (level, seed, rng) => {
  const id = 'gen.skala'
  // Läser upp skalförhållanden: "2:1" → "två till ett" (inte "två kolon ett").
  // Regexen matchar N:M (inte bara 1:N); "skala" behålls i själva strängen.
  const ratWord = (n: string): string => (n === '1' ? 'ett' : n === '2' ? 'två' : n)
  const skalaSpoken = (s: string): string =>
    s.replace(/(\d+):(\d+)/g, (_, a, b) => `${ratWord(a)} till ${ratWord(b)}`)

  if (level <= 3) {
    // Förstora/förminska en bild med skala 2:1 (dubbelt) eller 1:2 (hälften).
    const upp = rng.chance(0.5)
    const w = upp ? rng.int(2, 8) : rng.int(2, 8) * 2 // 1:2 kräver jämnt tal
    const h = Math.max(2, Math.round(w / 2))
    const value = upp ? w * 2 : w / 2
    return numericTask({
      generatorId: id, level, seed, unit: 'cm',
      visual: { kind: 'rektangel', w, h, unit: 'cm' },
      prompt: `Bilden är ${w} cm bred. I skala ${upp ? '2:1' : '1:2'} — hur bred blir den?`,
      spokenPrompt: skalaSpoken(`Bilden är ${w} cm bred. I skala ${upp ? '2:1' : '1:2'} — hur bred blir den?`),
      value,
      explanation: upp
        ? `Skala 2:1 gör bilden dubbelt så stor: ${w} × 2 = ${value} cm.`
        : `Skala 1:2 gör bilden hälften så stor: ${w} / 2 = ${value} cm.`,
      misconceptions: { [upp ? w : w]: 'fel-raknesatt', [upp ? w + 2 : w - 2]: 'fel-raknesatt' },
    })
  }
  if (level <= 7) {
    const scale = rng.pick([100, 1000] as const) // ger heltal både i cm och meter
    const inMeters = level >= 6
    const reverse = level >= 6 && rng.chance(0.4)
    if (reverse) {
      // Verkligheten → ritningen (gångra-i-stället-för-dela = fel-raknesatt).
      const mapCm = rng.int(2, 8)
      const realM = (mapCm * scale) / 100
      return numericTask({
        generatorId: id, level, seed, unit: 'cm',
        prompt: `En väg är ${realM} m i verkligheten. Kartan har skala 1:${scale}. Hur många cm är vägen på kartan?`,
        spokenPrompt: skalaSpoken(`En väg är ${realM} meter i verkligheten. Kartan har skala 1:${scale}. Hur många cm är vägen på kartan?`),
        value: mapCm,
        explanation: `Verkligheten delas med ${scale}: ${realM} m = ${realM * 100} cm, och ${realM * 100} / ${scale} = ${mapCm} cm.`,
        misconceptions: { [realM * 100 * scale]: 'fel-raknesatt', [realM * 100]: 'enhet-fel' },
      })
    }
    const mapCm = rng.int(2, 9)
    const realCm = mapCm * scale
    const value = inMeters ? realCm / 100 : realCm
    return numericTask({
      generatorId: id, level, seed, unit: inMeters ? 'm' : 'cm',
      prompt: `Kartan har skala 1:${scale}. En väg är ${mapCm} cm på kartan. Hur lång är den i verkligheten (${inMeters ? 'meter' : 'cm'})?`,
      spokenPrompt: skalaSpoken(`Kartan har skala 1:${scale}. En väg är ${mapCm} cm på kartan. Hur lång är den i verkligheten, i ${inMeters ? 'meter' : 'centimeter'}?`),
      value,
      explanation: inMeters
        ? `1 cm på kartan är ${scale} cm i verkligheten: ${mapCm} × ${scale} = ${realCm} cm = ${value} m.`
        : `1 cm på kartan är ${scale} cm i verkligheten: ${mapCm} × ${scale} = ${realCm} cm.`,
      misconceptions: inMeters ? { [realCm]: 'enhet-fel', [mapCm]: 'fel-raknesatt' } : { [mapCm]: 'fel-raknesatt' },
    })
  }
  // Nivå 8–10: jämförelse respektive km-omvandling.
  if (rng.chance(0.5)) {
    const s1 = 100, s2 = 1000
    return choiceTask({
      generatorId: id, level, seed, rng,
      prompt: `Vilken karta visar MEST verklighet på 1 cm — skala 1:${s1} eller 1:${s2}?`,
      spokenPrompt: skalaSpoken(`Vilken karta visar mest verklighet på 1 cm — skala 1:${s1} eller 1:${s2}?`),
      correct: `1:${s2}`, distractors: [[`1:${s1}`, 'fel-raknesatt']],
      explanation: `Ju större talet efter kolon, desto mer verklighet ryms på varje cm. 1:${s2} visar ${s2} cm per cm — mer än 1:${s1}.`,
    })
  }
  const scale = 1000
  const mapCm = rng.int(20, 90) // realCm = mapCm*1000 → jämna hundratal meter
  const realM = (mapCm * scale) / 100
  return numericTask({
    generatorId: id, level, seed, unit: 'm',
    prompt: `Kartan har skala 1:${scale}. En stig är ${mapCm} cm på kartan. Hur lång är stigen i verkligheten (meter)?`,
    spokenPrompt: skalaSpoken(`Kartan har skala 1:${scale}. En stig är ${mapCm} cm på kartan. Hur lång är stigen i verkligheten, i meter?`),
    value: realM,
    explanation: `${mapCm} × ${scale} = ${mapCm * scale} cm = ${realM} m.`,
    misconceptions: { [mapCm * scale]: 'enhet-fel' },
  })
})

export const FORMERNAS_BERG_GENERATORS: TaskGenerator[] = [
  former2d, klockanHelHalv, klockanKvart, klockanMinuter, matningLangd, omkrets, area,
  former3d, symmetri, vinklar, skala,
]
