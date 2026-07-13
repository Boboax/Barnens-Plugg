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
  // Bygg tal som garanterat har heltalsmedelvärde.
  const offsets: number[] = []
  let sum = 0
  for (let i = 0; i < count - 1; i++) {
    const o = rng.int(-Math.min(2, mean - 1), 3)
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

export const OVRIGA_GENERATORS: TaskGenerator[] = [
  medelvarde, sannolikhet, dubbeltHalften, proportionalitet,
]
