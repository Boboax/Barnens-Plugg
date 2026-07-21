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
  const values = distinctValues(rng, n, maxVal)
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
  let values: number[]
  if (level >= 8) {
    // Konstruera distinkta förändringar → den brantaste ökningen är ENTYDIG.
    const deltas = rng.shuffle([1, 2, 3, 4, 5, -1, -2]).slice(0, n - 1)
    values = [6]
    for (const dl of deltas) values.push(values[values.length - 1] + dl)
  } else {
    values = distinctValues(rng, n, 20)
  }
  const points = labels.map((label, i) => ({ label, value: values[i] }))
  const visual = { kind: 'linje' as const, points, unit: scen.unit }
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

export const OVRIGA_GENERATORS: TaskGenerator[] = [
  medelvarde, sannolikhet, dubbeltHalften, proportionalitet,
  sorteraTabeller, stapeldiagram, diagramLasa,
]
