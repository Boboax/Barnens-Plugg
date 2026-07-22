import type { DifficultyLevel, TaskGenerator } from '../domain/types'
import { createRng, type Rng } from './rng'
import { choiceTask, lerpInt, numericTask, pickName } from './helpers'

/* ============================================================
   Diagramöarna (statistik & sannolikhet) och
   Sambandsgrottan (samband & förändring).
   ============================================================ */

const g = (
  id: string,
  fn: (level: DifficultyLevel, seed: number, rng: Rng) => ReturnType<typeof numericTask>,
): TaskGenerator => ({
  id: `gen.${id}`,
  generate: (level, seed) => fn(level, seed, createRng(seed)),
})

// ---------- Medelvärde (åk 5) ----------

const medelvarde = g('medelvarde', (level, seed, rng) => {
  const id = 'gen.medelvarde'
  const count = level <= 4 ? 3 : level <= 7 ? 4 : 5
  const mean = rng.int(3, lerpInt(level, 10, 25))
  // Bygg tal som garanterat har heltalsmedelvärde. Utjämningstalet (−sum)
  // måste ge ett värde ≥ 1: annars kunde "poängen" bli negativa nonsenstal
  // (t.ex. "fick 6, 6, −3 poäng") — därför begränsas varje offset så att
  // summan aldrig överstiger mean − 1.
  const offsets: number[] = []
  let sum = 0
  for (let i = 0; i < count - 1; i++) {
    const hi = Math.min(3, mean - 1 - sum)
    const lo = -Math.min(2, mean - 1)
    const o = rng.int(Math.min(lo, hi), Math.max(lo, hi))
    offsets.push(o)
    sum += o
  }
  offsets.push(-sum)
  const numbers = offsets.map((o) => mean + o)
  if (level >= 8 && rng.chance(0.5)) {
    const med = [...numbers].sort((a, b) => a - b)[Math.floor(count / 2)]
    return numericTask({
      generatorId: id, level, seed,
      prompt: `Talen är ${numbers.join(', ')}. Vad är medianen?`,
      value: med,
      explanation: `Sortera talen: ${[...numbers].sort((a, b) => a - b).join(', ')}. Medianen är talet i mitten: ${med}.`,
      misconceptions: { [mean]: 'fel-raknesatt' },
    })
  }
  return numericTask({
    generatorId: id, level, seed,
    prompt: `${pickName(rng)} fick ${numbers.join(', ')} poäng i ${count} spel. Vad är medelvärdet?`,
    value: mean,
    explanation: `Lägg ihop allt: ${numbers.join(' + ')} = ${numbers.reduce((a, b) => a + b, 0)}. Dela med ${count}: ${mean}.`,
    misconceptions: { [numbers.reduce((a, b) => a + b, 0)]: 'fel-raknesatt' },
  })
})

// ---------- Chans och risk (åk 6) ----------

const sannolikhet = g('sannolikhet-intro', (level, seed, rng) => {
  const id = 'gen.sannolikhet-intro'
  if (level <= 4) {
    const target = rng.int(1, 6)
    return choiceTask({
      generatorId: id, level, seed, rng,
      prompt: `Du kastar en tärning. Hur stor är chansen att få en ${['', 'etta', 'tvåa', 'trea', 'fyra', 'femma', 'sexa'][target]}?`,
      correct: '1/6',
      distractors: [
        ['1/2', null],
        [`${target}/6`, 'storre-namnare-storre-brak'],
        ['6/1', 'storre-namnare-storre-brak'],
      ],
      explanation: `Tärningen har 6 sidor och bara 1 visar rätt tal: chansen är 1 av 6, alltså 1/6.`,
    })
  }
  const red = rng.int(1, 5)
  const blue = rng.int(1, 5)
  const total = red + blue
  const askRed = rng.chance(0.5)
  const want = askRed ? red : blue
  return choiceTask({
    generatorId: id, level, seed, rng,
    prompt: `I en påse ligger ${red} röda och ${blue} blå kulor. Hur stor är chansen att dra en ${askRed ? 'röd' : 'blå'} kula?`,
    correct: `${want}/${total}`,
    distractors: [
      [`${want}/${askRed ? blue : red}`, 'fel-raknesatt'],
      [`1/${total}`, null],
      [`${askRed ? blue : red}/${total}`, null],
    ],
    explanation: `Det finns ${total} kulor totalt och ${want} är ${askRed ? 'röda' : 'blå'}: chansen är ${want}/${total}. Nämnaren är alltid ALLA möjligheter.`,
  })
})

// ---------- Dubbelt och hälften (åk 2) ----------

const dubbeltHalften = g('dubbelt-halften', (level, seed, rng) => {
  const id = 'gen.dubbelt-halften'
  const double = rng.chance(0.5)
  if (double) {
    const n = rng.int(3, lerpInt(level, 20, 250))
    return numericTask({
      generatorId: id, level, seed,
      prompt: `Vad är dubbelt så mycket som ${n}?`,
      value: n * 2,
      explanation: `Dubbelt är två gånger: ${n} + ${n} = ${n * 2}.`,
      misconceptions: { [n + 2]: 'fel-raknesatt', [n * 2 + 1]: 'en-fel', [n * 2 - 1]: 'en-fel' },
    })
  }
  const half = rng.int(2, lerpInt(level, 15, 200))
  return numericTask({
    generatorId: id, level, seed,
    prompt: `Vad är hälften av ${half * 2}?`,
    value: half,
    explanation: `Hälften är att dela i två lika delar: ${half * 2} / 2 = ${half}.`,
    misconceptions: { [half * 2 - 2]: 'fel-raknesatt', [half + 1]: 'en-fel', [half - 1]: 'en-fel' },
  })
})

// ---------- Proportionalitet (åk 4) ----------

const proportionalitet = g('proportionalitet', (level, seed, rng) => {
  const id = 'gen.proportionalitet'
  const unitCount = rng.int(2, 4)
  const unitPrice = rng.int(3, lerpInt(level, 10, 25))
  const factor = rng.int(2, level >= 6 ? 5 : 3)
  const targetCount = unitCount * factor
  const [, plural] = ['bulle', 'bullar'] as const
  const baseCost = unitCount * unitPrice
  return numericTask({
    generatorId: id, level, seed,
    prompt: `${unitCount} ${plural} kostar ${baseCost} kr. Vad kostar ${targetCount} ${plural}?`,
    value: targetCount * unitPrice,
    unit: 'kr',
    explanation: `${targetCount} är ${factor} gånger så många som ${unitCount} — då blir priset ${factor} gånger så stort: ${baseCost} × ${factor} = ${targetCount * unitPrice} kr. (En ${['bulle'][0]} kostar ${unitPrice} kr.)`,
    misconceptions: {
      [baseCost + (targetCount - unitCount)]: 'fel-raknesatt',
      [baseCost + factor]: 'fel-raknesatt',
    },
  })
})

// ---------- Diagramöarna: tabeller & diagram (docs/SPEC-GEOMETRI.md, etapp A) ----------

/** Saker att sortera i bildtabeller: [plural-etikett, objekt-ikon]. Ikonerna
    finns i OBJEKT_ICONS så piktogrammet kan rita dem. */
const TABELL_SAKER: [string, string][] = [
  ['äpplen', 'apple'], ['kulor', 'kula'], ['kottar', 'kotte'], ['bollar', 'boll'],
  ['snäckor', 'snacka'], ['bullar', 'bulle'], ['päron', 'paron'], ['citroner', 'citron'],
]

/** n distinkta heltalsvärden 1..max → "flest/skillnad" blir alltid entydigt. */
const distinctValues = (rng: Rng, n: number, max: number): number[] =>
  rng.shuffle(Array.from({ length: max }, (_, i) => i + 1)).slice(0, n)

/** n distinkta värden som ALLA är multiplar av step (step, 2·step, … ≤ max).
    Staplarnas/punkternas toppar måste landa på en gridlinje — annars kräver
    avläsningen interpolation som skalan inte medger (ren gissning). */
const distinctMultiples = (rng: Rng, n: number, step: number, max: number): number[] => {
  const count = Math.floor(max / step)
  const pool = Array.from({ length: count }, (_, i) => (i + 1) * step)
  return rng.shuffle(pool).slice(0, n)
}

// Sortera och räkna (åk 1 VT) — bildtabell (piktogram).
const sorteraTabeller = g('sortera-tabeller', (level, seed, rng) => {
  const id = 'gen.sortera-tabeller'
  const n = level <= 3 ? rng.int(2, 3) : 4
  // Piktogramrader ≤ 8 på de lägsta nivåerna (räknebart med finger).
  const maxVal = level <= 3 ? 6 : 10
  const saker = rng.shuffle(TABELL_SAKER).slice(0, n)
  const values = distinctValues(rng, n, maxVal)
  const cats = saker.map(([label, icon], i) => ({ label, icon, value: values[i] }))
  const visual = { kind: 'stapel' as const, pictogram: true, categories: cats }
  const byVal = [...cats].sort((a, b) => b.value - a.value)
  const hi = byVal[0], lo = byVal[byVal.length - 1]

  if (level <= 3) {
    if (rng.chance(0.5)) {
      const c = rng.pick(cats)
      return numericTask({
        generatorId: id, level, seed, visual,
        prompt: `Hur många ${c.label} finns det?`,
        value: c.value,
        explanation: `Räkna bilderna i raden för ${c.label}: det är ${c.value}.`,
        misconceptions: { [c.value + 1]: 'en-fel', [c.value - 1]: 'en-fel' },
      })
    }
    return choiceTask({
      generatorId: id, level, seed, rng, visual,
      prompt: 'Vilken sak finns det flest av?',
      correct: hi.label,
      distractors: byVal.slice(1).map((c) => [c.label, null] as [string, null]),
      explanation: `${hi.label} har den längsta raden — ${hi.value} stycken. Det är flest.`,
    })
  }

  if (level <= 7) {
    if (rng.chance(0.5)) {
      return numericTask({
        generatorId: id, level, seed, visual,
        prompt: `Hur många fler ${hi.label} än ${lo.label} finns det?`,
        value: hi.value - lo.value,
        explanation: `${hi.label}: ${hi.value}, ${lo.label}: ${lo.value}. Skillnaden är ${hi.value} − ${lo.value} = ${hi.value - lo.value}.`,
        misconceptions: { [hi.value + lo.value]: 'fel-raknesatt' },
      })
    }
    const sum = cats.reduce((s, c) => s + c.value, 0)
    return numericTask({
      generatorId: id, level, seed, visual,
      prompt: 'Hur många saker finns det sammanlagt?',
      value: sum,
      explanation: `Lägg ihop alla rader: ${cats.map((c) => c.value).join(' + ')} = ${sum}.`,
      misconceptions: { [sum - 1]: 'en-fel', [sum + 1]: 'en-fel' },
    })
  }

  // Nivå 8–10: överflödig info respektive tvåsteg ("räkna upp till lika många").
  if (rng.chance(0.5)) {
    const bocker = rng.int(2, 9)
    return numericTask({
      generatorId: id, level, seed, visual,
      prompt: `På hyllan står också ${bocker} böcker. Hur många fler ${hi.label} än ${lo.label} finns det?`,
      value: hi.value - lo.value,
      explanation: `Böckerna hör inte till tabellen — titta bara på raderna: ${hi.value} − ${lo.value} = ${hi.value - lo.value}.`,
      misconceptions: { [hi.value + lo.value]: 'fel-raknesatt', [hi.value - lo.value + bocker]: 'fel-raknesatt' },
    })
  }
  return numericTask({
    generatorId: id, level, seed, visual,
    prompt: `Hur många fler ${lo.label} måste vi lägga till för att det ska bli lika många som ${hi.label}?`,
    value: hi.value - lo.value,
    explanation: `${lo.label} måste komma upp i ${hi.value}: ${hi.value} − ${lo.value} = ${hi.value - lo.value}.`,
    misconceptions: { [hi.value + lo.value]: 'fel-raknesatt' },
  })
})

/** Röstas det om i stapeldiagrammen — korta, konkreta etiketter. */
const STAPEL_SAKER = ['katt', 'hund', 'häst', 'fågel', 'fisk', 'kanin', 'groda', 'anka']

// Stapeldiagram (åk 2 VT).
const stapeldiagram = g('stapeldiagram', (level, seed, rng) => {
  const id = 'gen.stapeldiagram'
  const n = level <= 3 ? 3 : 4
  const yStep = level <= 3 ? 1 : level <= 7 ? rng.pick([1, 2] as const) : rng.pick([2, 5] as const)
  const maxVal = level <= 3 ? 8 : level <= 7 ? 12 : 20
  const labels = rng.shuffle(STAPEL_SAKER).slice(0, n)
  // Värdena MÅSTE vara multiplar av yStep — annars slutar stapeln mellan två
  // gridlinjer och avläsningen blir omöjlig (visar bara siffra på nivå ≤ 2).
  const values = distinctMultiples(rng, n, yStep, maxVal)
  const cats = labels.map((label, i) => ({ label, value: values[i] }))
  // Värdesiffran som stöd bara på allra lägsta nivån; annars försvinner avläsningen.
  const visual = { kind: 'stapel' as const, categories: cats, yStep, showValues: level <= 2 }
  const byVal = [...cats].sort((a, b) => b.value - a.value)
  const hi = byVal[0], lo = byVal[byVal.length - 1]

  if (level <= 3) {
    const c = rng.pick(cats)
    return numericTask({
      generatorId: id, level, seed, visual,
      prompt: `Hur många röstade på ${c.label}?`,
      value: c.value,
      explanation: `Följ ${c.label}-stapelns topp med fingret till skalan: ${c.value}.`,
      // Avläsningsfel: ett streck fel, eller ett skalsteg fel.
      misconceptions: { [c.value + 1]: 'en-fel', [c.value - 1]: 'en-fel', [c.value + yStep]: 'en-fel', [c.value - yStep]: 'en-fel' },
    })
  }
  if (level <= 7) {
    if (rng.chance(0.5)) {
      return numericTask({
        generatorId: id, level, seed, visual,
        prompt: `Hur många fler röstade på ${hi.label} än på ${lo.label}?`,
        value: hi.value - lo.value,
        explanation: `${hi.label}: ${hi.value}, ${lo.label}: ${lo.value}. Skillnaden är ${hi.value - lo.value}.`,
        misconceptions: { [hi.value + lo.value]: 'fel-raknesatt' },
      })
    }
    const sum = cats.reduce((s, c) => s + c.value, 0)
    return numericTask({
      generatorId: id, level, seed, visual,
      prompt: 'Hur många barn röstade sammanlagt?',
      value: sum,
      explanation: `Lägg ihop alla staplar: ${cats.map((c) => c.value).join(' + ')} = ${sum}.`,
      misconceptions: { [sum - yStep]: 'en-fel' },
    })
  }
  // Nivå 8–10: två staplar tillsammans, respektive överflödig totalsiffra.
  if (rng.chance(0.5)) {
    const a = byVal[byVal.length - 1], b = byVal[byVal.length - 2]
    return numericTask({
      generatorId: id, level, seed, visual,
      prompt: `Hur många röstade på ${a.label} och ${b.label} tillsammans?`,
      value: a.value + b.value,
      explanation: `${a.label}: ${a.value}, ${b.label}: ${b.value}. Tillsammans ${a.value} + ${b.value} = ${a.value + b.value}.`,
      misconceptions: { [Math.abs(a.value - b.value)]: 'fel-raknesatt' },
    })
  }
  const sum = cats.reduce((s, c) => s + c.value, 0)
  return numericTask({
    generatorId: id, level, seed, visual,
    prompt: `Klassen hade ${sum} röster totalt. Hur många fler röstade på ${hi.label} än på ${lo.label}?`,
    value: hi.value - lo.value,
    explanation: `Totalen behövs inte — läs de två staplarna: ${hi.value} − ${lo.value} = ${hi.value - lo.value}.`,
    misconceptions: { [hi.value + lo.value]: 'fel-raknesatt' },
  })
})

const MANADER = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun']

// Läsa diagram (åk 4 VT) — linjediagram, samt cirkeldiagram (via brak).
const diagramLasa = g('diagram-lasa', (level, seed, rng) => {
  const id = 'gen.diagram-lasa'

  // Cirkeldiagram-gren (bara nivå 4–7): cirkeln ÄR diagrammet. Knyter an till
  // procent-/bråktrappan — "hälften/fjärdedel av N".
  if (level >= 4 && level <= 7 && rng.chance(0.4)) {
    const [d, ord] = rng.pick([[2, 'Hälften'], [4, 'En fjärdedel'], [10, 'En tiondel']] as const)
    const base = rng.int(2, 6) * d // delbart → heltalssvar
    const val = rng.pick(['fotboll', 'pyssel', 'dans', 'schack'])
    return numericTask({
      generatorId: id, level, seed,
      visual: { kind: 'brak', parts: d, filled: 1 },
      prompt: `Cirkeldiagrammet visar klassens val. ${ord} av ${base} elever valde ${val}. Hur många är det?`,
      value: base / d,
      explanation: `${ord} betyder 1 av ${d} lika delar: ${base} / ${d} = ${base / d}.`,
      misconceptions: { [base]: 'fel-raknesatt' },
    })
  }

  // Linjediagram-gren.
  const n = rng.int(4, 5)
  const labels = MANADER.slice(0, n)
  const scen = rng.pick([
    { what: 'temperaturen', unit: '°C', read: 'Vad var temperaturen' },
    { what: 'plantans höjd', unit: 'cm', read: 'Hur hög var plantan' },
  ] as const)
  // Skalsteg 2 genomgående → varje punkt landar på en gridlinje (annars kräver
  // avläsningen interpolation, och ±1-distraktorerna matchar inte skalan).
  const STEP = 2
  // En planta MÅSTE växa (aldrig krympa); temperatur får gå både upp och ner.
  const vaxer = scen.what === 'plantans höjd'
  let values: number[]
  if (level >= 8) {
    // Distinkta (jämna) förändringar → den brantaste ökningen är ENTYDIG och
    // varje punkt sitter kvar på en gridlinje. Plantan: enbart POSITIVA steg.
    const deltas = rng.shuffle(vaxer ? [2, 4, 6, 8] : [2, 4, 6, -2, -4]).slice(0, n - 1)
    values = [6]
    for (const dl of deltas) values.push(Math.max(0, values[values.length - 1] + dl))
  } else {
    // Distinkta multiplar av 2 (max 16) → entydig topp och entydig skillnad.
    values = distinctMultiples(rng, n, STEP, 16)
    // Plantan sorteras stigande → frågan "hur mycket minskade plantan?" kan
    // aldrig uppstå (en planta som krymper är fel modell).
    if (vaxer) values = [...values].sort((a, b) => a - b)
  }
  const points = labels.map((label, i) => ({ label, value: values[i] }))
  const visual = { kind: 'linje' as const, points, unit: scen.unit, step: STEP }
  const byVal = [...points].sort((a, b) => b.value - a.value)

  if (level <= 3) {
    if (rng.chance(0.5)) {
      return choiceTask({
        generatorId: id, level, seed, rng, visual,
        prompt: `Vilken månad var ${scen.what} högst?`,
        correct: byVal[0].label,
        distractors: byVal.slice(1).map((p) => [p.label, null] as [string, null]),
        explanation: `Den högsta punkten är i ${byVal[0].label} (${byVal[0].value} ${scen.unit}).`,
      })
    }
    const p = rng.pick(points)
    return numericTask({
      generatorId: id, level, seed, visual,
      prompt: `${scen.read} i ${p.label}?`,
      value: p.value,
      explanation: `Följ ${p.label} upp till punkten och läs av: ${p.value} ${scen.unit}.`,
      misconceptions: { [p.value + 1]: 'en-fel', [p.value - 1]: 'en-fel' },
    })
  }
  if (level <= 7) {
    // Förändring mellan två månader (tidsordning → entydig skillnad).
    const i = rng.int(0, n - 2)
    const j = i + rng.int(1, n - 1 - i)
    const a = points[i], b = points[j]
    const diff = Math.abs(b.value - a.value)
    const grew = b.value >= a.value
    return numericTask({
      generatorId: id, level, seed, visual,
      prompt: `Hur mycket ${grew ? 'ökade' : 'minskade'} ${scen.what} mellan ${a.label} och ${b.label}?`,
      value: diff,
      explanation: `${a.label}: ${a.value}, ${b.label}: ${b.value}. Skillnaden är ${diff} ${scen.unit}.`,
      misconceptions: { [a.value + b.value]: 'fel-raknesatt' },
    })
  }
  // Nivå 8–10: mellan vilka två (grann-)månader ökade det MEST? (entydigt, se ovan)
  const incs = points.slice(1).map((p, i) => ({ from: points[i].label, to: p.label, inc: p.value - points[i].value }))
  const best = [...incs].sort((a, b) => b.inc - a.inc)[0]
  const seg = (x: { from: string; to: string }): string => `${x.from}–${x.to}`
  return choiceTask({
    generatorId: id, level, seed, rng, visual,
    prompt: `Mellan vilka två månader ökade ${scen.what} mest?`,
    correct: seg(best),
    distractors: incs.filter((x) => x !== best).map((x) => [seg(x), null] as [string, null]),
    explanation: `Den brantaste uppförsbacken är mellan ${best.from} och ${best.to} (ökar ${best.inc} ${scen.unit}).`,
  })
})

// ---------- Sambandsgrottan: koordinater & grafer (SPEC-GEOMETRI.md, etapp B) ----------

/** Formatera tal med matematiskt minustecken; koordinatpar och uppläsning. */
const fmtN = (n: number): string => (n < 0 ? `−${Math.abs(n)}` : `${n}`)
const coord = (x: number, y: number): string => `(${fmtN(x)}, ${fmtN(y)})`
const spN = (n: number): string => (n < 0 ? `minus ${Math.abs(n)}` : `${n}`)
const coordSpoken = (x: number, y: number): string => `punkten ${spN(x)}, ${spN(y)}`
const LETTERS = ['A', 'B', 'C', 'D']

// Koordinatsystem (åk 5 VT). x/y-förväxlingen är hela poängen → alltid en
// positionsfel-distraktor där koordinaterna bytt plats.
const koordinatsystem = g('koordinatsystem', (level, seed, rng) => {
  const id = 'gen.koordinatsystem'
  const negative = level >= 6
  const min = negative ? -5 : 0
  const max = negative ? 5 : level <= 3 ? 5 : 10
  const lo = negative ? -5 : 1

  // Nivå 8–10: rektangelns fjärde hörn respektive spegling i en axel.
  if (level >= 8) {
    if (rng.chance(0.5)) {
      const x0 = rng.int(min, max - 2), x1 = x0 + rng.int(2, max - x0)
      const y0 = rng.int(min, max - 2), y1 = y0 + rng.int(2, max - y0)
      const shown = [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x0, y: y1 }].map((c, i) => ({ ...c, label: LETTERS[i] }))
      return choiceTask({
        generatorId: id, level, seed, rng,
        visual: { kind: 'koordinat', min, max, points: shown },
        prompt: `Tre hörn av en rektangel ligger på ${coord(x0, y0)}, ${coord(x1, y0)} och ${coord(x0, y1)}. Var ligger det fjärde hörnet?`,
        spokenPrompt: `Tre hörn av en rektangel ligger på ${coordSpoken(x0, y0)}, ${coordSpoken(x1, y0)} och ${coordSpoken(x0, y1)}. Var ligger det fjärde hörnet?`,
        correct: coord(x1, y1),
        distractors: [[coord(y1, x1), 'positionsfel'], [coord(x1, y0), null], [coord(x0, y1), null]],
        explanation: `Det fjärde hörnet har samma x som ${coord(x1, y0)} och samma y som ${coord(x0, y1)}: ${coord(x1, y1)}.`,
      })
    }
    const p = { x: rng.int(1, 4), y: rng.int(1, 4) }
    const inX = rng.chance(0.5)
    const res = inX ? { x: p.x, y: -p.y } : { x: -p.x, y: p.y }
    const wrongAxis = inX ? { x: -p.x, y: p.y } : { x: p.x, y: -p.y }
    return choiceTask({
      generatorId: id, level, seed, rng,
      visual: { kind: 'koordinat', min: -5, max: 5, points: [{ ...p, label: 'P' }] },
      prompt: `Punkten ${coord(p.x, p.y)} speglas i ${inX ? 'x' : 'y'}-axeln. Var hamnar den?`,
      spokenPrompt: `${coordSpoken(p.x, p.y)} speglas i ${inX ? 'x' : 'y'}-axeln. Var hamnar den?`,
      correct: coord(res.x, res.y),
      distractors: [[coord(wrongAxis.x, wrongAxis.y), 'positionsfel'], [coord(-p.x, -p.y), null], [coord(p.x, p.y), null]],
      explanation: `Spegling i ${inX ? 'x' : 'y'}-axeln byter tecken på ${inX ? 'y' : 'x'}: ${coord(p.x, p.y)} → ${coord(res.x, res.y)}.`,
    })
  }

  // Målpunkt med x ≠ y så swap-distraktorn skiljer sig från rätt svar.
  let tx = rng.int(lo, max), ty = rng.int(lo, max)
  let guard = 0
  while (tx === ty && guard++ < 40) ty = rng.int(lo, max)
  if (tx === ty) tx = ty < max ? ty + 1 : ty - 1
  // Fyra distinkta namngivna punkter, inkl. målet (tx,ty) och swappen (ty,tx).
  const key = (p: { x: number; y: number }): string => `${p.x},${p.y}`
  const chosen = [{ x: tx, y: ty }, { x: ty, y: tx }]
  const seen = new Set(chosen.map(key))
  let g2 = 0
  while (chosen.length < 4 && g2++ < 200) {
    const c = { x: rng.int(min, max), y: rng.int(min, max) }
    if ((c.x === 0 && c.y === 0) || seen.has(key(c))) continue
    seen.add(key(c)); chosen.push(c)
  }
  const pts = rng.shuffle(chosen).map((p, i) => ({ ...p, label: LETTERS[i] }))
  const labelAt = (x: number, y: number): string => pts.find((p) => p.x === x && p.y === y)!.label
  const visual = { kind: 'koordinat' as const, min, max, points: pts }
  const variant = rng.pick(level <= 3 ? ['vilken', 'koord'] as const : ['vilken', 'koord', 'vilka'] as const)

  if (variant === 'vilken') {
    return choiceTask({
      generatorId: id, level, seed, rng, visual,
      prompt: `Vilken punkt ligger på ${coord(tx, ty)}?`,
      spokenPrompt: `Vilken punkt ligger på ${coordSpoken(tx, ty)}?`,
      correct: labelAt(tx, ty),
      distractors: pts.filter((p) => !(p.x === tx && p.y === ty)).map((p) => [p.label, p.x === ty && p.y === tx ? 'positionsfel' : null]),
      explanation: `Gå först ${fmtN(tx)} åt sidan (x), sedan ${fmtN(ty)} uppåt (y) — som att gå in i ett rum innan man klättrar på stegen. Där ligger ${labelAt(tx, ty)}.`,
    })
  }
  if (variant === 'koord') {
    const L = rng.pick(pts)
    const askX = rng.chance(0.5)
    return numericTask({
      generatorId: id, level, seed, visual,
      prompt: `Vad är ${askX ? 'x' : 'y'}-koordinaten för punkt ${L.label}?`,
      value: askX ? L.x : L.y,
      explanation: askX
        ? `Punkt ${L.label} ligger ${fmtN(L.x)} steg åt sidan — x = ${fmtN(L.x)}.`
        : `Punkt ${L.label} ligger ${fmtN(L.y)} steg upp — y = ${fmtN(L.y)}.`,
      // Att svara med den ANDRA koordinaten = x/y-förväxling.
      misconceptions: { [askX ? L.y : L.x]: 'positionsfel' },
    })
  }
  const L = rng.pick(pts)
  const others = pts.filter((p) => p !== L)
  return choiceTask({
    generatorId: id, level, seed, rng, visual,
    prompt: `Vilka koordinater har punkt ${L.label}?`,
    correct: coord(L.x, L.y),
    distractors: [[coord(L.y, L.x), L.x !== L.y ? 'positionsfel' : null], ...others.slice(0, 2).map((p) => [coord(p.x, p.y), null] as [string, null])],
    explanation: `Gå ${fmtN(L.x)} åt sidan (x) och ${fmtN(L.y)} uppåt (y): ${coord(L.x, L.y)}.`,
  })
})

// Grafer (åk 6 VT): proportionella samband som räta linjer genom origo. Alla
// avläsningar landar på HELA gitterpunkter. Kvadratiskt rutnät 0..10.
const grafer = g('grafer', (level, seed, rng) => {
  const id = 'gen.grafer'
  const GRID = 10
  const [thing, unit] = rng.pick([['äpplen', 'kg'], ['bananer', 'kg'], ['godis', 'hg'], ['bär', 'kg']] as const)
  const showDots = level <= 5

  // Nivå 8–10: två affärer (en med startavgift) — jämför / hitta brytpunkten.
  if (level >= 8) {
    const [kA, kB] = rng.pick([[2, 1], [3, 1], [3, 2]] as const)
    const xStar = rng.int(2, 3)
    const feeB = (kA - kB) * xStar // → linjerna korsas vid heltalet xStar
    const lineA = { points: [{ x: 0, y: 0 }, { x: 3, y: kA * 3 }], label: 'A' }
    const lineB = { points: [{ x: 0, y: feeB }, { x: 3, y: feeB + kB * 3 }], label: 'B' }
    const visual = { kind: 'koordinat' as const, min: 0, max: GRID, points: [], lines: [lineA, lineB], xLabel: unit, yLabel: 'kr' }
    if (rng.chance(0.5)) {
      // Billigast vid q kg (q ≠ brytpunkten så det finns en tydlig vinnare).
      let q = rng.int(1, 4)
      if (q === xStar) q = xStar + 1
      const costA = kA * q, costB = feeB + kB * q
      const cheaper = costA < costB ? 'Affär A' : 'Affär B'
      return choiceTask({
        generatorId: id, level, seed, rng, visual,
        prompt: `Linjerna visar priset i två affärer. Vilken affär är billigast om du köper ${q} ${unit} ${thing}?`,
        correct: cheaper,
        distractors: [[cheaper === 'Affär A' ? 'Affär B' : 'Affär A', 'fel-raknesatt']],
        explanation: `Vid ${q} ${unit}: Affär A ${costA} kr, Affär B ${costB} kr. ${cheaper} är billigast.`,
      })
    }
    return numericTask({
      generatorId: id, level, seed, visual,
      prompt: `Affär A säljer utan startavgift, affär B har en startavgift. Vid hur många ${unit} kostar ${thing} lika mycket i båda?`,
      value: xStar, unit,
      explanation: `Där linjerna korsas kostar de lika mycket — läs av x: ${xStar} ${unit}.`,
      misconceptions: { [feeB]: 'fel-raknesatt' },
    })
  }

  const k = rng.pick([1, 2, 3] as const)
  const xEnd = Math.floor(GRID / k)
  const line = { points: [{ x: 0, y: 0 }, { x: xEnd, y: k * xEnd }] }
  const dots = showDots ? [{ x: 1, y: k }, { x: xEnd, y: k * xEnd }] : []
  const visual = { kind: 'koordinat' as const, min: 0, max: GRID, points: dots, lines: [line], xLabel: unit, yLabel: 'kr' }

  if (level <= 3) {
    const q = rng.int(2, xEnd)
    return numericTask({
      generatorId: id, level, seed, visual,
      prompt: `Grafen visar priset på ${thing}. Vad kostar ${q} ${unit}?`,
      value: k * q, unit: 'kr',
      explanation: `Följ upp från ${q} ${unit} till linjen och läs av: ${q} × ${k} = ${k * q} kr.`,
      misconceptions: { [q + k]: 'fel-raknesatt', [k * q + 1]: 'en-fel', [k * q - 1]: 'en-fel' },
    })
  }
  if (level <= 7) {
    if (rng.chance(0.5)) {
      const q = rng.int(2, xEnd)
      return numericTask({
        generatorId: id, level, seed, visual,
        prompt: `Grafen visar priset på ${thing}. Hur många ${unit} får du för ${k * q} kr?`,
        value: q, unit,
        explanation: `Följ in från ${k * q} kr till linjen och ner: ${k * q} / ${k} = ${q} ${unit}.`,
        misconceptions: { [k * q]: 'fel-raknesatt' },
      })
    }
    return numericTask({
      generatorId: id, level, seed, visual,
      prompt: `Grafen visar priset på ${thing}. Vad kostar 1 ${unit}?`,
      value: k, unit: 'kr',
      explanation: `Läs av linjen vid 1 ${unit}: ${k} kr. (Priset stiger ${k} kr för varje ${unit}.)`,
      misconceptions: { [k + 1]: 'en-fel', [k - 1]: 'en-fel' },
    })
  }
  // (nivå 8–10 hanteras ovan)
  return numericTask({
    generatorId: id, level, seed, visual,
    prompt: `Grafen visar priset på ${thing}. Vad kostar 1 ${unit}?`,
    value: k, unit: 'kr', explanation: `Läs av linjen vid 1 ${unit}: ${k} kr.`,
    misconceptions: { [k + 1]: 'en-fel' },
  })
})

export const OVRIGA_GENERATORS: TaskGenerator[] = [
  medelvarde, sannolikhet, dubbeltHalften, proportionalitet,
  sorteraTabeller, stapeldiagram, diagramLasa,
  koordinatsystem, grafer,
]
