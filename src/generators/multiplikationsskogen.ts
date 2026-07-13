import type { DifficultyLevel, TaskGenerator } from '../domain/types'
import { createRng, type Rng } from './rng'
import { lerpInt, numericTask, pickName, pickThing } from './helpers'

/* ============================================================
   Multiplikationsskogen — multiplikation, division, flerstegsproblem.
   ============================================================ */

const g = (
  id: string,
  fn: (level: DifficultyLevel, seed: number, rng: Rng) => ReturnType<typeof numericTask>,
): TaskGenerator => ({
  id: `gen.${id}`,
  generate: (level, seed) => fn(level, seed, createRng(seed)),
})

/** Missuppfattningar kring en produkt a×b. */
const multMisconceptions = (a: number, b: number): Record<number, 'fel-raknesatt' | 'en-fel' | 'nolla-multiplikation'> => {
  const value = a * b
  const mis: Record<number, 'fel-raknesatt' | 'en-fel' | 'nolla-multiplikation'> = {
    [a + b]: 'fel-raknesatt',
    [value - a]: 'en-fel',
    [value + a]: 'en-fel',
  }
  // Nolla-felet: 30 × 4 "blir" 12 när nollan tappas.
  if (a % 10 === 0 && a >= 10) mis[(a / 10) * b] = 'nolla-multiplikation'
  if (b % 10 === 0 && b >= 10) mis[a * (b / 10)] = 'nolla-multiplikation'
  return mis
}

// ---------- Gånger börjar (åk 2): tabell 2, 5, 10 ----------

const multIntro = g('mult-intro', (level, seed, rng) => {
  const id = 'gen.mult-intro'
  const table = level <= 3 ? rng.pick([2, 10] as const) : level <= 7 ? rng.pick([2, 5, 10] as const) : rng.pick([3, 4, 5] as const)
  const n = rng.int(1, level >= 8 ? 12 : 10)
  const [, plural, emoji] = pickThing(rng)
  if (level <= 5) {
    return numericTask({
      generatorId: id, level, seed,
      prompt: `${n} högar med ${table} ${plural} i varje. Hur många ${plural} är det?`,
      value: n * table,
      visual: { kind: 'grupper', groupCount: n, itemsPerGroup: table, emoji },
      explanation: `${n} × ${table} betyder ${Array(Math.min(n, 5)).fill(table).join(' + ')}${n > 5 ? ' + …' : ''} = ${n * table}.`,
      misconceptions: multMisconceptions(n, table),
    })
  }
  return numericTask({
    generatorId: id, level, seed,
    prompt: `${n} × ${table} = ?`,
    spokenPrompt: `Vad är ${n} gånger ${table}?`,
    value: n * table,
    explanation: `${n} × ${table} är ${n} hopp om ${table} på talraden: ${n * table}.`,
    misconceptions: multMisconceptions(n, table),
  })
})

// ---------- Dela lika (åk 2) ----------

const divIntro = g('div-intro', (level, seed, rng) => {
  const id = 'gen.div-intro'
  const parts = level <= 4 ? rng.pick([2, 5] as const) : rng.pick([2, 3, 4, 5] as const)
  const each = rng.int(2, lerpInt(level, 5, 10))
  const [, plural, emoji] = pickThing(rng)
  const name = pickName(rng)
  if (level >= 8) {
    // Stjärnnivån gömmer en fälla: den som delar räknas också.
    const persons = parts + 1
    const total = persons * each
    return numericTask({
      generatorId: id, level, seed,
      prompt: `${name} delar ${total} ${plural} lika mellan sig själv och ${parts} kompisar. Hur många får var och en?`,
      value: each,
      explanation: `Det är ${persons} personer som delar (glöm inte ${name}!): ${total} / ${persons} = ${each}.`,
      misconceptions: { [total / parts === Math.floor(total / parts) ? total / parts : each + 1]: 'fel-raknesatt', [each + 1]: 'en-fel', [each - 1]: 'en-fel' },
    })
  }
  const total = parts * each
  return numericTask({
    generatorId: id, level, seed,
    prompt: `${name} delar ${total} ${plural} lika i ${parts} högar. Hur många i varje hög?`,
    value: each,
    visual: level <= 5 ? { kind: 'grupper', groupCount: parts, itemsPerGroup: each, emoji } : { kind: 'ingen' },
    explanation: `${total} / ${parts} = ${each} — kolla: ${parts} × ${each} = ${total}.`,
    misconceptions: { [total - parts]: 'fel-raknesatt', [each + 1]: 'en-fel', [each - 1]: 'en-fel' },
  })
})

// ---------- Alla tabeller (åk 3) ----------

const tabellerAlla = g('tabeller-alla', (level, seed, rng) => {
  const id = 'gen.tabeller-alla'
  // Nivåtrappan följer hur svåra tabellerna faktiskt är, inte talens ordning.
  const tables =
    level <= 2 ? [1, 2, 5, 10]
    : level <= 4 ? [2, 3, 4, 5, 10]
    : level <= 6 ? [3, 4, 6, 7, 8, 9]
    : [6, 7, 8, 9, 11, 12]
  const a = rng.pick(tables)
  const b = rng.int(level >= 7 ? 3 : 1, level >= 7 ? 12 : 10)
  if (level >= 8 && rng.chance(0.5)) {
    return numericTask({
      generatorId: id, level, seed,
      prompt: `${a} × __ = ${a * b}`,
      spokenPrompt: `${a} gånger vad blir ${a * b}?`,
      value: b,
      explanation: `Tänk baklänges: ${a * b} / ${a} = ${b}.`,
      misconceptions: { [a * b - a]: 'fel-raknesatt' },
    })
  }
  return numericTask({
    generatorId: id, level, seed,
    prompt: `${a} × ${b} = ?`,
    spokenPrompt: `Vad är ${a} gånger ${b}?`,
    value: a * b,
    explanation: a === 9
      ? `Niansknepet: ${b} × 10 − ${b} = ${a * b}.`
      : `${a} × ${b} = ${a * b}. Kommutativt: samma som ${b} × ${a}.`,
    misconceptions: multMisconceptions(a, b),
  })
})

// ---------- Gånger och delat hör ihop (åk 3) ----------

const multDivSamband = g('mult-div-samband', (level, seed, rng) => {
  const id = 'gen.mult-div-samband'
  const a = rng.int(2, lerpInt(level, 5, 12))
  const b = rng.int(2, lerpInt(level, 5, 12))
  const product = a * b
  if (rng.chance(0.5)) {
    return numericTask({
      generatorId: id, level, seed,
      prompt: `Du vet att ${a} × ${b} = ${product}. Vad är ${product} / ${a}?`,
      value: b,
      explanation: `Multiplikation och division hör ihop: ${a} × ${b} = ${product} betyder att ${product} / ${a} = ${b}.`,
      misconceptions: { [a]: 'fel-raknesatt', [product - a]: 'fel-raknesatt' },
    })
  }
  return numericTask({
    generatorId: id, level, seed,
    prompt: `${product} / ${b} = ?`,
    spokenPrompt: `Vad är ${product} delat med ${b}?`,
    value: a,
    explanation: `Tänk gånger: ${b} × ? = ${product}. Svaret är ${a}.`,
    misconceptions: { [b]: 'fel-raknesatt', [a + 1]: 'en-fel', [a - 1]: 'en-fel' },
  })
})

// ---------- Uppställning gånger (åk 4) ----------

const skriftligMult = g('skriftlig-mult', (level, seed, rng) => {
  const id = 'gen.skriftlig-mult'
  const a = level <= 3 ? rng.int(12, 49) : level <= 6 ? rng.int(23, 99) : rng.int(102, 999)
  const b = level <= 6 ? rng.int(2, 9) : rng.int(3, 9)
  const value = a * b
  // Glömd minnessiffra: multiplicera siffervis utan minne.
  const ones = (a % 10) * b
  const tensDigit = Math.floor((a % 100) / 10) * b
  const noCarry = Math.floor(a / 100) * b * 100 + (tensDigit % 10) * 10 + (ones % 10)
  return numericTask({
    generatorId: id, level, seed,
    prompt: `${a} × ${b} = ?`,
    spokenPrompt: `Vad är ${a} gånger ${b}? Använd gärna kladdytan för uppställning.`,
    value,
    explanation: `Dela upp: ${a} = ${Math.floor(a / 10) * 10} + ${a % 10}. Då är ${a} × ${b} = ${Math.floor(a / 10) * 10 * b} + ${(a % 10) * b} = ${value}.`,
    misconceptions: {
      ...(noCarry !== value ? { [noCarry]: 'glomd-minnessiffra' as const } : {}),
      [a * b - b]: 'en-fel',
      [a + b]: 'fel-raknesatt',
    },
  })
})

// ---------- Kort division (åk 4) ----------

const kortDivision = g('kort-division', (level, seed, rng) => {
  const id = 'gen.kort-division'
  const b = rng.int(2, level <= 4 ? 5 : 9)
  const q = rng.int(lerpInt(level, 3, 20), lerpInt(level, 12, 120))
  const withRest = level >= 5 && rng.chance(0.4)
  const rest = withRest ? rng.int(1, b - 1) : 0
  const a = q * b + rest
  if (withRest) {
    return numericTask({
      generatorId: id, level, seed,
      prompt: `${a} / ${b} — vad blir resten?`,
      spokenPrompt: `${a} delat med ${b}. Vad blir resten?`,
      value: rest,
      explanation: `${b} × ${q} = ${q * b}, och ${a} − ${q * b} = ${rest}. Kvot ${q}, rest ${rest}.`,
      misconceptions: { [q]: 'rest-ignorerad', 0: 'rest-ignorerad' },
    })
  }
  return numericTask({
    generatorId: id, level, seed,
    prompt: `${a} / ${b} = ?`,
    spokenPrompt: `Vad är ${a} delat med ${b}?`,
    value: q,
    explanation: `Dela upp ${a} i delar som går jämnt med ${b} — kolla svaret: ${q} × ${b} = ${a}.`,
    misconceptions: { [q + 1]: 'en-fel', [q - 1]: 'en-fel', [a - b]: 'fel-raknesatt' },
  })
})

// ---------- Gånger och delat med stora tal (åk 5) ----------

const multDivStora = g('mult-div-stora', (level, seed, rng) => {
  const id = 'gen.mult-div-stora'
  const kind = rng.pick(level <= 4 ? (['tiopotens'] as const) : (['tiopotens', 'tvasiffrig'] as const))
  if (kind === 'tiopotens') {
    const a = rng.int(3, 99)
    const p = rng.pick(level <= 3 ? ([10] as const) : ([10, 100, 1000] as const))
    const divide = rng.chance(0.4)
    if (divide) {
      return numericTask({
        generatorId: id, level, seed,
        prompt: `${a * p} / ${p} = ?`,
        value: a,
        explanation: `Att dela med ${p} flyttar siffrorna ${String(p).length - 1} steg åt höger: ${a}.`,
        misconceptions: { [a * 10]: 'nolla-multiplikation', [Math.floor(a / 10)]: 'nolla-multiplikation' },
      })
    }
    return numericTask({
      generatorId: id, level, seed,
      prompt: `${a} × ${p} = ?`,
      value: a * p,
      explanation: `Att multiplicera med ${p} lägger till ${String(p).length - 1} nollor: ${a * p}.`,
      misconceptions: { [a * p * 10]: 'nolla-multiplikation', [(a * p) / 10]: 'nolla-multiplikation' },
    })
  }
  const a = rng.int(12, level >= 8 ? 99 : 49)
  const b = rng.int(11, level >= 8 ? 99 : 29)
  return numericTask({
    generatorId: id, level, seed,
    prompt: `${a} × ${b} = ?`,
    spokenPrompt: `Vad är ${a} gånger ${b}? Använd kladdytan.`,
    value: a * b,
    explanation: `Dela upp: ${a} × ${b} = ${a} × ${Math.floor(b / 10) * 10} + ${a} × ${b % 10} = ${a * Math.floor(b / 10) * 10} + ${a * (b % 10)} = ${a * b}.`,
    misconceptions: { [a * (b % 10) + a * Math.floor(b / 10)]: 'positionsfel', [a + b]: 'fel-raknesatt' },
  })
})

// ---------- Kluringar i flera steg (åk 5) ----------

const problemFlersteg = g('problemlosning-flerstegs', (level, seed, rng) => {
  const id = 'gen.problemlosning-flerstegs'
  const name = pickName(rng)
  const kind = rng.pick(['kop', 'biljetter', 'spara'] as const)
  if (kind === 'kop') {
    const antal = rng.int(3, 8)
    const pris = rng.int(8, lerpInt(level, 20, 60))
    const betalt = Math.ceil((antal * pris) / 100) * 100
    const extra = level >= 9 ? ` I affären finns ${rng.int(20, 90)} bullar.` : ''
    return numericTask({
      generatorId: id, level, seed,
      prompt: `${name} köper ${antal} bullar för ${pris} kr styck och betalar med ${betalt} kr.${extra} Hur mycket får ${name} tillbaka?`,
      value: betalt - antal * pris,
      explanation: `Steg 1: ${antal} × ${pris} = ${antal * pris} kr. Steg 2: ${betalt} − ${antal * pris} = ${betalt - antal * pris} kr.`,
      misconceptions: { [antal * pris]: 'fel-raknesatt', [betalt - pris]: 'fel-raknesatt' },
    })
  }
  if (kind === 'biljetter') {
    const vuxna = rng.int(2, 3)
    const barn = rng.int(2, 4)
    const vuxenPris = rng.int(8, 15) * 10
    const barnPris = vuxenPris / 2
    return numericTask({
      generatorId: id, level, seed,
      prompt: `En vuxenbiljett kostar ${vuxenPris} kr och en barnbiljett hälften. Vad kostar det för ${vuxna} vuxna och ${barn} barn?`,
      value: vuxna * vuxenPris + barn * barnPris,
      explanation: `Barnbiljett: ${barnPris} kr. Vuxna: ${vuxna} × ${vuxenPris} = ${vuxna * vuxenPris}. Barn: ${barn} × ${barnPris} = ${barn * barnPris}. Tillsammans ${vuxna * vuxenPris + barn * barnPris} kr.`,
      misconceptions: { [(vuxna + barn) * vuxenPris]: 'fel-raknesatt' },
    })
  }
  const veckopeng = rng.int(3, 8) * 10
  const veckor = rng.int(4, 9)
  const mal = veckopeng * veckor + rng.int(2, 9) * 10
  return numericTask({
    generatorId: id, level, seed,
    prompt: `${name} sparar ${veckopeng} kr i veckan i ${veckor} veckor. En cykel kostar ${mal} kr. Hur mycket fattas?`,
    value: mal - veckopeng * veckor,
    explanation: `Sparat: ${veckor} × ${veckopeng} = ${veckopeng * veckor} kr. Fattas: ${mal} − ${veckopeng * veckor} = ${mal - veckopeng * veckor} kr.`,
    misconceptions: { [veckopeng * veckor]: 'fel-raknesatt' },
  })
})

export const MULTIPLIKATIONSSKOGEN_GENERATORS: TaskGenerator[] = [
  multIntro, divIntro, tabellerAlla, multDivSamband, skriftligMult, kortDivision, multDivStora, problemFlersteg,
]
