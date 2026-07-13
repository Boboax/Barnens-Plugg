import type { DifficultyLevel, TaskGenerator } from '../domain/types'
import { createRng, type Rng } from './rng'
import { choiceTask, lerpInt, numericTask, sv } from './helpers'

/* ============================================================
   Bråkberget — bråk, decimaltal och procent.
   Bråksvar ges som flerval (knappsatsen är för heltal/decimaler).
   ============================================================ */

const g = (
  id: string,
  fn: (level: DifficultyLevel, seed: number, rng: Rng) => ReturnType<typeof numericTask>,
): TaskGenerator => ({
  id: `gen.${id}`,
  generate: (level, seed) => fn(level, seed, createRng(seed)),
})

const frac = (n: number, d: number): string => `${n}/${d}`

// ---------- Bråk börjar (åk 3) ----------

const brakIntro = g('brak-intro', (level, seed, rng) => {
  const id = 'gen.brak-intro'
  const d = level <= 3 ? rng.pick([2, 4] as const) : level <= 6 ? rng.pick([2, 3, 4, 6] as const) : rng.pick([3, 5, 6, 8] as const)
  const n = rng.int(1, d - 1)
  if (level >= 8) {
    // Stjärnnivå: bråk av antal.
    const whole = d * rng.int(2, 6)
    return numericTask({
      generatorId: id, level, seed,
      prompt: `Vad är ${frac(n, d)} av ${whole}?`,
      value: (whole / d) * n,
      visual: { kind: 'brak', parts: d, filled: n },
      explanation: `En ${d}-del av ${whole} är ${whole / d}. Då är ${frac(n, d)} lika med ${n} × ${whole / d} = ${(whole / d) * n}.`,
      misconceptions: { [whole / d]: 'fel-raknesatt', [whole - n]: 'fel-raknesatt' },
    })
  }
  return choiceTask({
    generatorId: id, level, seed, rng,
    prompt: `Hur stor del av figuren är målad?`,
    correct: frac(n, d),
    distractors: [
      [frac(d - n, d), null],
      [frac(d, n), 'storre-namnare-storre-brak'],
      [frac(n, d + 1), null],
    ],
    visual: { kind: 'brak', parts: d, filled: n },
    explanation: `Figuren har ${d} lika delar och ${n} är målade: ${frac(n, d)}. Nämnaren (under strecket) säger hur många delar helheten har.`,
  })
})

// ---------- Jämföra bråk (åk 4) ----------

const brakJamfora = g('brak-jamfora', (level, seed, rng) => {
  const id = 'gen.brak-jamfora'
  if (level >= 7 && rng.chance(0.5)) {
    // Likvärdiga bråk: 1/2 = ?/8
    const base = rng.pick([[1, 2], [1, 3], [2, 3], [3, 4], [1, 4]] as const)
    const k = rng.int(2, 4)
    return numericTask({
      generatorId: id, level, seed,
      prompt: `${frac(base[0], base[1])} = __/${base[1] * k}`,
      spokenPrompt: `${base[0]} ${base[1]}-delar är lika med hur många ${base[1] * k}-delar?`,
      value: base[0] * k,
      visual: { kind: 'brak', parts: base[1], filled: base[0], secondary: { parts: base[1] * k, filled: base[0] * k } },
      explanation: `Multiplicera täljare och nämnare med samma tal (${k}): ${frac(base[0], base[1])} = ${frac(base[0] * k, base[1] * k)}.`,
      misconceptions: { [base[0]]: 'storre-namnare-storre-brak', [base[0] + k]: 'fel-raknesatt' },
    })
  }
  // Vilket är störst? Klassisk fälla: större nämnare ⇒ mindre delar.
  const pairs: [number, number, number, number][] =
    level <= 4
      ? [[1, 2, 1, 4], [1, 3, 1, 6], [3, 4, 1, 4], [1, 2, 1, 3]]
      : [[2, 3, 3, 5], [3, 4, 4, 6], [2, 5, 1, 2], [5, 6, 7, 9], [3, 8, 2, 5]]
  const [a, b, c, d] = rng.pick(pairs)
  const first = a / b > c / d
  return choiceTask({
    generatorId: id, level, seed, rng,
    prompt: `Vilket bråk är störst?`,
    correct: first ? frac(a, b) : frac(c, d),
    distractors: [[first ? frac(c, d) : frac(a, b), 'storre-namnare-storre-brak']],
    visual: { kind: 'brak', parts: b, filled: a, secondary: { parts: d, filled: c } },
    explanation: `Jämför bitarna: ${frac(a, b)} = ${sv(Math.round((a / b) * 100) / 100)} och ${frac(c, d)} = ${sv(Math.round((c / d) * 100) / 100)}. Större nämnare betyder mindre bitar!`,
  })
})

// ---------- Decimaltal börjar (åk 4) ----------

const decimalIntro = g('decimal-intro', (level, seed, rng) => {
  const id = 'gen.decimal-intro'
  if (rng.chance(0.5)) {
    // Jämförelsefällan: 0,25 ser "större ut" än 0,5.
    const pairs: [number, number][] =
      level <= 4 ? [[0.5, 0.25], [0.3, 0.13], [0.7, 0.09]] : [[0.5, 0.45], [0.62, 0.7], [0.08, 0.4], [0.35, 0.4]]
    const [x, y] = rng.pick(pairs)
    return choiceTask({
      generatorId: id, level, seed, rng,
      prompt: `Vilket tal är störst?`,
      correct: sv(Math.max(x, y)),
      distractors: [[sv(Math.min(x, y)), 'decimal-langd']],
      explanation: `Jämför tiondelarna först: ${sv(Math.max(x, y))} har ${Math.floor(Math.max(x, y) * 10) % 10} tiondelar. Fler siffror betyder inte större tal!`,
    })
  }
  const tenths = rng.int(1, 9)
  const hundredths = level >= 5 ? rng.int(1, 9) : 0
  const value = tenths / 10 + hundredths / 100
  return choiceTask({
    generatorId: id, level, seed, rng,
    prompt: hundredths
      ? `Vilket tal är ${tenths} tiondelar och ${hundredths} hundradelar?`
      : `Vilket tal är ${tenths} tiondelar?`,
    correct: sv(value),
    distractors: [
      [sv(value * 10), 'positionsfel'],
      [sv(Math.round(value * 100) / 1000), 'positionsfel'],
      [hundredths ? sv(hundredths / 10 + tenths / 100) : sv(tenths), hundredths ? 'positionsfel' : 'decimal-langd'],
    ],
    explanation: `Tiondelarna står först efter kommat, sedan hundradelarna: ${sv(value)}.`,
  })
})

// ---------- Räkna med decimaltal (åk 5) ----------

const decimalRakna = g('decimal-rakna', (level, seed, rng) => {
  const id = 'gen.decimal-rakna'
  const scale = level <= 4 ? 10 : 100
  const aI = rng.int(1 * scale, lerpInt(level, 5, 20) * scale)
  const bI = rng.int(1, aI - 1)
  const isAdd = rng.chance(0.5)
  const a = aI / scale
  const b = bI / scale
  const value = isAdd ? (aI + bI) / scale : (aI - bI) / scale
  // Kommafelet: räkna som heltal och sätta kommat fel.
  const wrongComma = isAdd ? (aI + bI) / (scale * 10) : (aI - bI) / (scale * 10)
  const money = rng.chance(0.4)
  return numericTask({
    generatorId: id, level, seed,
    prompt: money
      ? `En glass kostar ${sv(a)} kr och en klubba ${sv(b)} kr. ${isAdd ? 'Vad kostar de tillsammans?' : 'Hur mycket dyrare är glassen?'}`
      : `${sv(a)} ${isAdd ? '+' : '−'} ${sv(b)} = ?`,
    spokenPrompt: `Vad är ${sv(a)} ${isAdd ? 'plus' : 'minus'} ${sv(b)}?`,
    value,
    unit: money ? 'kr' : undefined,
    explanation: `Ställ upp med komma under komma — tiondelar räknas med tiondelar: ${sv(value)}.`,
    misconceptions: { [wrongComma]: 'decimal-langd', [value * 10]: 'positionsfel' },
  })
})

// ---------- Räkna med bråk (åk 5) ----------

const brakRakna = g('brak-rakna', (level, seed, rng) => {
  const id = 'gen.brak-rakna'
  const d = level <= 4 ? rng.pick([4, 5, 6] as const) : rng.pick([6, 8, 10, 12] as const)
  const a = rng.int(1, d - 2)
  const b = rng.int(1, d - a - 1)
  const isAdd = level <= 6 || rng.chance(0.5)
  const n = isAdd ? a + b : Math.max(a, b) - Math.min(a, b) || 1
  const x = isAdd ? a : Math.max(a, b)
  const y = isAdd ? b : Math.min(a, b)
  return choiceTask({
    generatorId: id, level, seed, rng,
    prompt: `${frac(x, d)} ${isAdd ? '+' : '−'} ${frac(y, d)} = ?`,
    spokenPrompt: `Vad är ${x} ${d}-delar ${isAdd ? 'plus' : 'minus'} ${y} ${d}-delar?`,
    correct: frac(n, d),
    distractors: [
      [frac(n, d * 2), 'storre-namnare-storre-brak'],
      [frac(isAdd ? x + y : x - y, isAdd ? d + d : d), 'storre-namnare-storre-brak'],
      [frac(Math.max(1, isAdd ? n - 1 : n + 1), d), 'en-fel'],
    ].filter(([t]) => t !== frac(n, d)) as [string, 'storre-namnare-storre-brak' | 'en-fel'][],
    visual: { kind: 'brak', parts: d, filled: x },
    explanation: `Samma nämnare — räkna bara täljarna: ${x} ${isAdd ? '+' : '−'} ${y} = ${n}. Nämnaren ändras inte, bitarna är lika stora hela tiden.`,
  })
})

// ---------- Procent börjar (åk 5) ----------

const procentIntro = g('procent-intro', (level, seed, rng) => {
  const id = 'gen.procent-intro'
  const pct = level <= 3 ? rng.pick([50, 100] as const) : level <= 6 ? rng.pick([10, 25, 50, 75] as const) : rng.pick([5, 10, 20, 25, 30, 75, 90] as const)
  const base = rng.int(2, 20) * (pct % 25 === 0 ? 4 : 10)
  const value = (base * pct) / 100
  const rea = rng.chance(0.4)
  if (rea) {
    return numericTask({
      generatorId: id, level, seed,
      prompt: `En tröja kostar ${base} kr. Det är ${pct} % rea. Hur mycket billigare blir den?`,
      value,
      unit: 'kr',
      explanation: `${pct} % betyder ${pct} hundradelar: ${base} × ${pct}/100 = ${sv(value)} kr.`,
      misconceptions: { [base - pct]: 'fel-raknesatt', [base - value]: 'fel-raknesatt' },
    })
  }
  return numericTask({
    generatorId: id, level, seed,
    prompt: `Vad är ${pct} % av ${base}?`,
    value,
    explanation: pct === 50
      ? `50 % är hälften: ${base} / 2 = ${sv(value)}.`
      : pct === 25
        ? `25 % är en fjärdedel: ${base} / 4 = ${sv(value)}.`
        : `${pct} % = ${pct}/100. ${base} × ${pct}/100 = ${sv(value)}.`,
    misconceptions: { [pct]: 'fel-raknesatt', [base - pct]: 'fel-raknesatt' },
  })
})

// ---------- Tre former, samma tal (åk 6) ----------

const brakDecimalProcent = g('brak-decimal-procent', (level, seed, rng) => {
  const id = 'gen.brak-decimal-procent'
  const triples: [string, string, string][] = [
    ['1/2', '0,5', '50 %'],
    ['1/4', '0,25', '25 %'],
    ['3/4', '0,75', '75 %'],
    ['1/10', '0,1', '10 %'],
    ['1/5', '0,2', '20 %'],
    ['3/5', '0,6', '60 %'],
    ['1/100', '0,01', '1 %'],
    ['7/10', '0,7', '70 %'],
  ]
  const pool = level <= 4 ? triples.slice(0, 4) : triples
  const [brak, dec, pct] = rng.pick(pool)
  const forms = rng.shuffle([0, 1, 2] as const)
  const from = [brak, dec, pct][forms[0]]
  const target = forms[1]
  const correct = [brak, dec, pct][target]
  const others = rng.shuffle(pool.filter(([b]) => b !== brak))
  const wrong1 = others[0][target]
  const wrong2 = others[1]?.[target]
  const targetName = ['bråk', 'decimaltal', 'procent'][target]
  return choiceTask({
    generatorId: id, level, seed, rng,
    prompt: `Skriv ${from} som ${targetName}.`,
    correct,
    distractors: [
      [wrong1, 'decimal-langd'],
      ...(wrong2 ? ([[wrong2, null]] as [string, null][]) : []),
    ],
    explanation: `${brak} = ${dec} = ${pct} — tre sätt att skriva samma tal.`,
  })
})

export const BRAKBERGET_GENERATORS: TaskGenerator[] = [
  brakIntro, brakJamfora, decimalIntro, decimalRakna, brakRakna, procentIntro, brakDecimalProcent,
]
