import type { DifficultyLevel, MisconceptionTag, TaskGenerator } from '../domain/types'
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
  const x0 = isAdd ? a : Math.max(a, b)
  const y = isAdd ? b : Math.min(a, b)
  // Subtraktion måste ge en positiv, nollskild skillnad — annars blev facit
  // fel (t.ex. 1/4 − 1/4 rättades som 1/4). Höj täljaren när de är lika stora;
  // x0+1 ≤ d-1 så bråket förblir äkta.
  const x = !isAdd && x0 <= y ? y + 1 : x0
  const n = isAdd ? a + b : x - y
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

/* Procent byggs upp enligt CRA (konkret → representation → abstrakt), för att
   Edward (åk 5) fastnade på procent: appen hoppade rakt in i "50 % av 76" utan
   bild och utan att först lära ut vad procent BETYDER. Trappan nu:
   1–2 begreppet (flerval + bild), 3–4 hälften/fjärdedel av snälla tal (bild),
   5–6 tiondel/tre fjärdedelar (rea tidigast här), 7–10 blandat med 10 %-tricket.
   Heltalssvar är garanterat t.o.m. nivå 6; bild finns alltid t.o.m. nivå 4. */
const procentIntro = g('procent-intro', (level, seed, rng) => {
  const id = 'gen.procent-intro'

  // Nivå 1–2 — BEGREPPET: vad procent betyder, som flerval med en bild att SE.
  if (level <= 2) {
    if (rng.chance(0.5)) {
      return choiceTask({
        generatorId: id, level, seed, rng,
        prompt: 'Hur många procent är HELA (allt tillsammans)?',
        spokenPrompt: 'Hur många procent är hela, allt tillsammans?',
        correct: '100 %',
        // Hundraplattan = 100 rutor = hela = 100 %.
        visual: { kind: 'tiobas', groups: [{ hundreds: 1, tens: 0, ones: 0 }] },
        distractors: [['50 %', 'fel-raknesatt'], ['10 %', 'fel-raknesatt'], ['1 %', 'fel-raknesatt']],
        explanation: 'Procent betyder hundradelar. Hela är 100 av 100 rutor — alltså 100 %.',
      })
    }
    const meaning = rng.pick([
      { pct: 50, correct: 'Hälften', parts: 2, filled: 1, why: '50 % är 50 av 100 rutor — precis hälften.' },
      { pct: 25, correct: 'En fjärdedel', parts: 4, filled: 1, why: '25 % är 25 av 100 rutor — en fjärdedel.' },
      { pct: 100, correct: 'Allting', parts: 4, filled: 4, why: '100 % är alla 100 rutor — hela alltihop.' },
    ] as const)
    const options: [string, MisconceptionTag | null][] = [
      ['Hälften', null], ['En fjärdedel', null], ['Allting', null], ['Tio stycken', null],
    ]
    return choiceTask({
      generatorId: id, level, seed, rng,
      prompt: `Vad betyder ${meaning.pct} %?`,
      spokenPrompt: `Vad betyder ${meaning.pct} procent?`,
      correct: meaning.correct,
      distractors: options.filter(([t]) => t !== meaning.correct),
      visual: { kind: 'brak', parts: meaning.parts, filled: meaning.filled },
      explanation: `Procent betyder hundradelar. ${meaning.why}`,
    })
  }

  // Nivå 3–4 — 50 % och 25 % av SNÄLLA tal. Alltid en bråkbild; förklaringen
  // går via hälften/fjärdedelen (inte ×/100 — det kommer först längre upp).
  if (level <= 4) {
    const pct = rng.pick([50, 25] as const)
    const base = rng.int(2, 10) * 4 // jämnt OCH 4-delbart (8–40) → heltalssvar för både 50 % och 25 %
    const value = (base * pct) / 100
    const misconceptions: Record<number, MisconceptionTag> = { [pct]: 'fel-raknesatt' }
    if (pct === 25) misconceptions[base / 2] = 'fel-raknesatt' // tog hälften i stället för fjärdedelen
    return numericTask({
      generatorId: id, level, seed,
      prompt: `Vad är ${pct} % av ${base}?`,
      spokenPrompt: `Vad är ${pct} procent av ${base}?`,
      value,
      visual: { kind: 'brak', parts: pct === 50 ? 2 : 4, filled: 1 },
      explanation: pct === 50
        ? `50 % är hälften: ${base} / 2 = ${sv(value)}.`
        : `25 % är en fjärdedel: ${base} / 4 = ${sv(value)}.`,
      misconceptions,
    })
  }

  // Nivå 5–6 — 10 % (dela med 10) och 75 % (tre fjärdedelar). Rea-berättelsen
  // får dyka upp TIDIGAST här, med snälla tal. Heltalssvar garanterat.
  if (level <= 6) {
    const pct = rng.pick([10, 75] as const)
    const base = pct === 10 ? rng.int(2, 10) * 10 : rng.int(2, 10) * 4 // heltalssvar garanterat
    const value = (base * pct) / 100
    const explanation = pct === 10
      ? `10 % betyder dela med 10: ${base} / 10 = ${sv(value)}.`
      : `75 % är tre fjärdedelar. En fjärdedel av ${base} är ${sv(base / 4)}, tre av dem: 3 × ${sv(base / 4)} = ${sv(value)}.`
    if (rng.chance(0.4)) {
      return numericTask({
        generatorId: id, level, seed,
        prompt: `En tröja kostar ${base} kr. Det är ${pct} % rea. Hur mycket billigare blir den?`,
        spokenPrompt: `En tröja kostar ${base} kronor. Det är ${pct} procent rea. Hur mycket billigare blir den?`,
        value, unit: 'kr',
        explanation,
        misconceptions: { [pct]: 'fel-raknesatt', [base - value]: 'fel-raknesatt' },
      })
    }
    return numericTask({
      generatorId: id, level, seed,
      prompt: `Vad är ${pct} % av ${base}?`,
      spokenPrompt: `Vad är ${pct} procent av ${base}?`,
      value,
      visual: pct === 10 ? { kind: 'brak', parts: 10, filled: 1 } : { kind: 'brak', parts: 4, filled: 3 },
      explanation,
      misconceptions: { [pct]: 'fel-raknesatt' },
    })
  }

  // Nivå 7 — 10 %-tricket med HELA svar (10/20/30/90 % av tiotal). Ingen bild,
  // men fortfarande garanterat heltalssvar (mjuk övergång till stjärnan).
  if (level <= 7) {
    const pct = rng.pick([10, 20, 30, 90] as const)
    const base = rng.int(2, 20) * 10
    const value = (base * pct) / 100 // heltal (base ÷ 10 × factor)
    const tenth = base / 10
    const factor = pct / 10 // 10 → 1 · 20 → 2 · 30 → 3 · 90 → 9 gånger tiondelen
    if (rng.chance(0.4)) {
      return numericTask({
        generatorId: id, level, seed,
        prompt: `En tröja kostar ${base} kr. Det är ${pct} % rea. Hur mycket billigare blir den?`,
        spokenPrompt: `En tröja kostar ${base} kronor. Det är ${pct} procent rea. Hur mycket billigare blir den?`,
        value, unit: 'kr',
        explanation: `Ta 10 % först: ${sv(tenth)} kr. ${pct} % är ${sv(factor)} × 10 %, alltså ${sv(factor)} × ${sv(tenth)} = ${sv(value)} kr.`,
        misconceptions: { [pct]: 'fel-raknesatt', [base - value]: 'fel-raknesatt' },
      })
    }
    return numericTask({
      generatorId: id, level, seed,
      prompt: `Vad är ${pct} % av ${base}?`,
      spokenPrompt: `Vad är ${pct} procent av ${base}?`,
      value,
      explanation: `Ta 10 % först: ${base} / 10 = ${sv(tenth)}. ${pct} % är ${sv(factor)} × 10 %, alltså ${sv(factor)} × ${sv(tenth)} = ${sv(value)}.`,
      misconceptions: { [pct]: 'fel-raknesatt', [base - pct]: 'fel-raknesatt' },
    })
  }

  // Nivå 8–10 — stjärnan: 5 %/15 % med x,5-svar OCH tvåstegsfrågan "vad kostar
  // tröjan EFTER rean?" (pris − rabatt) som är det verkliga rea-räknandet.
  const pct = rng.pick([5, 15, 20, 30, 90] as const)
  const base = rng.int(2, 20) * 10
  const value = (base * pct) / 100 // 5/15 % → x,5 när tiondelen är udda
  const tenth = base / 10
  const factor = pct / 10 // 5 → 0,5 · 15 → 1,5 · 20 → 2 …
  const variant = rng.pick(['efter', 'billigare', 'av'] as const)
  if (variant === 'efter') {
    const after = base - value
    return numericTask({
      generatorId: id, level, seed,
      prompt: `En tröja kostar ${base} kr. Det är ${pct} % rea. Vad kostar tröjan efter rean?`,
      spokenPrompt: `En tröja kostar ${base} kronor. Det är ${pct} procent rea. Vad kostar tröjan efter rean?`,
      value: after, unit: 'kr',
      explanation: `Rabatten är ${pct} % av ${base}: ta 10 % (${sv(tenth)} kr) × ${sv(factor)} = ${sv(value)} kr. Efter rean: ${base} − ${sv(value)} = ${sv(after)} kr.`,
      // Vanligaste felet: svara med RABATTEN i stället för priset efter rean.
      misconceptions: { [value]: 'fel-raknesatt' },
    })
  }
  if (variant === 'billigare') {
    return numericTask({
      generatorId: id, level, seed,
      prompt: `En tröja kostar ${base} kr. Det är ${pct} % rea. Hur mycket billigare blir den?`,
      spokenPrompt: `En tröja kostar ${base} kronor. Det är ${pct} procent rea. Hur mycket billigare blir den?`,
      value, unit: 'kr',
      explanation: `Ta 10 % först: ${sv(tenth)} kr. ${pct} % är ${sv(factor)} × 10 %, alltså ${sv(factor)} × ${sv(tenth)} = ${sv(value)} kr.`,
      misconceptions: { [pct]: 'fel-raknesatt', [base - value]: 'fel-raknesatt' },
    })
  }
  return numericTask({
    generatorId: id, level, seed,
    prompt: `Vad är ${pct} % av ${base}?`,
    spokenPrompt: `Vad är ${pct} procent av ${base}?`,
    value,
    explanation: `Ta 10 % först: ${base} / 10 = ${sv(tenth)}. ${pct} % är ${sv(factor)} × 10 %, alltså ${sv(factor)} × ${sv(tenth)} = ${sv(value)}.`,
    misconceptions: { [pct]: 'fel-raknesatt' },
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
