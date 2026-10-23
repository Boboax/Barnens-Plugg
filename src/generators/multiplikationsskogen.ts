import type { DifficultyLevel, TaskGenerator } from '../domain/types'
import { createRng, type Rng } from './rng'
import { equalParts, lerpInt, numericTask, pickName, pickThing, pickTwoNames } from './helpers'

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
  // Berättelsen (nivå 1–5) börjar på två högar — "1 högar" är ingen svenska.
  const n = rng.int(level <= 5 ? 2 : 1, level >= 8 ? 12 : 10)
  const [, plural, emoji] = pickThing(rng)
  if (level <= 5) {
    return numericTask({
      generatorId: id, level, seed,
      prompt: `${n} högar med ${table} ${plural} i varje. Hur många ${plural} är det?`,
      value: n * table,
      visual: { kind: 'grupper', groupCount: n, itemsPerGroup: table, emoji },
      // Stapelmodellen: n lika långa delar — samma bild som i åk 5:s problemlösning.
      solution: { kind: 'stapelmodell', rows: [{ label: 'Högarna', parts: equalParts(n, table, `${table}`) }], total: { row: 0, text: `${n * table}` } },
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
      solution: { kind: 'stapelmodell', rows: [{ label: 'Alla', parts: equalParts(persons, each, `${each}`) }], total: { row: 0, text: `${total}` } },
      explanation: `Det är ${persons} personer som delar (glöm inte ${name}!): ${total} / ${persons} = ${each}.`,
      // Kärnmissen (delade med kompisarna, glömde sig själv) taggas bara när
      // den ger ett heltal — annars krockade reserven med en-fel-nyckeln.
      misconceptions: {
        ...(total % parts === 0 && total / parts !== each ? { [total / parts]: 'fel-raknesatt' as const } : {}),
        [each + 1]: 'en-fel', [each - 1]: 'en-fel',
      },
    })
  }
  const total = parts * each
  return numericTask({
    generatorId: id, level, seed,
    prompt: `${name} delar ${total} ${plural} lika i ${parts} högar. Hur många i varje hög?`,
    value: each,
    // EN odelad hög att dela upp — att rita färdiga högar visade facit direkt.
    // Fler än 12 objekt blir plottrigt → inget stöd då.
    visual: level <= 5 && total <= 12
      ? { kind: 'grupper', groupCount: 1, itemsPerGroup: total, emoji }
      : level <= 7 ? { kind: 'stapelmodell', rows: [{ label: 'Högarna', parts: equalParts(parts, each, '', { unknownFirst: true }) }], total: { row: 0, text: `${total}` } }
      : { kind: 'ingen' },
    solution: { kind: 'stapelmodell', rows: [{ label: 'Högarna', parts: equalParts(parts, each, `${each}`) }], total: { row: 0, text: `${total}` } },
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
      spokenPrompt: `Du vet att ${a} gånger ${b} är ${product}. Vad är ${product} delat med ${a}?`,
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

/** Talet uppdelat efter platsvärde, utan nollor: 689 → [600, 80, 9]. */
function placeParts(n: number): number[] {
  const out: number[] = []
  for (let p = 10 ** (String(n).length - 1); p >= 1; p /= 10) {
    const d = Math.floor(n / p) % 10
    if (d) out.push(d * p)
  }
  return out
}

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
    explanation: (() => {
      // Dela efter platsvärde (689 = 600 + 80 + 9), inte "680 + 9" som
      // bara flyttar problemet.
      const parts = placeParts(a)
      return `Dela upp: ${a} = ${parts.join(' + ')}. Gånger ${b} var för sig: ${parts.map((p) => p * b).join(' + ')} = ${value}.`
    })(),
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
    explanation: (() => {
      // Dela upp täljaren i bitar som går jämnt (84 / 4: 80 och 4) — VÄGEN
      // till svaret, inte bara kontrollen.
      const qs = placeParts(q)
      if (qs.length === 1) return `Tänk gånger: ${b} × ? = ${a}. ${b} × ${q} = ${a}, så svaret är ${q}.`
      return `Dela upp ${a} i bitar som går jämnt med ${b}: ${qs.map((x) => x * b).join(' + ')}. ${qs.map((x) => `${x * b} / ${b} = ${x}`).join(', ')}. Tillsammans ${q}.`
    })(),
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
        spokenPrompt: `Vad är ${a * p} delat med ${p}?`,
        value: a,
        explanation: `Delat med ${p}: varje siffra flyttar ${String(p).length - 1} steg åt höger, och nollorna på slutet försvinner: ${a}.`,
        misconceptions: { [a * 10]: 'nolla-multiplikation', [Math.floor(a / 10)]: 'nolla-multiplikation' },
      })
    }
    return numericTask({
      generatorId: id, level, seed,
      prompt: `${a} × ${p} = ?`,
      spokenPrompt: `Vad är ${a} gånger ${p}?`,
      value: a * p,
      // Platsvärdet, inte "lägg till nollor" — samma bild som filmen, och
      // regeln som håller även för decimaltal senare.
      explanation: `Gånger ${p}: varje siffra flyttar ${String(p).length - 1} steg åt vänster, och de tomma platserna fylls med ${p === 10 ? 'en nolla' : p === 100 ? 'två nollor' : 'tre nollor'}: ${a * p}.`,
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
  const [name, other] = pickTwoNames(rng)
  // Från nivå 6: de klassiska stapelmodellsproblemen (Singapore) — "gånger
  // så mycket" och "summa och skillnad", som är svåra att lösa utan bild
  // men nästan självklara med den. Stapelmodellen är stöd t.o.m. nivå 7
  // och lösningsbild alltid.
  const kind = rng.pick(level >= 6
    ? (['kop', 'biljetter', 'spara', 'ganger', 'skillnad'] as const)
    : (['kop', 'biljetter', 'spara'] as const))
  const support = level <= 7
  if (kind === 'ganger') {
    const k = rng.int(2, level >= 8 ? 5 : 3)
    const unit = rng.int(4, lerpInt(level, 12, 40))
    const total = (k + 1) * unit
    const model = (shown: boolean) => ({
      kind: 'stapelmodell' as const,
      rows: [
        { label: name, parts: equalParts(k, unit, shown ? `${unit}` : '') },
        { label: other, parts: [{ size: unit, text: shown ? `${unit}` : '?', unknown: !shown, tone: 1 as const }] },
      ],
      total: { row: -1, text: `${total}` },
    })
    return numericTask({
      generatorId: id, level, seed, value: unit,
      prompt: `${name} och ${other} har tillsammans ${total} kr. ${name} har ${k} gånger så mycket som ${other}. Hur mycket har ${other}?`,
      visual: support ? model(false) : { kind: 'ingen' },
      solution: model(true),
      explanation: `Rita ${other} som en ruta och ${name} som ${k} lika rutor: ${k + 1} rutor är ${total} kr. En ruta: ${total} / ${k + 1} = ${unit} kr.`,
      misconceptions: { [total / k]: 'fel-raknesatt', [k * unit]: 'fel-raknesatt' },
    })
  }
  if (kind === 'skillnad') {
    const small = rng.int(6, lerpInt(level, 20, 60))
    const d = rng.int(2, lerpInt(level, 10, 30))
    const total = 2 * small + d
    const model = (shown: boolean) => ({
      kind: 'stapelmodell' as const,
      rows: [
        { label: name, parts: [{ size: small, text: shown ? `${small}` : '' }, { size: d, text: `${d}`, tone: 1 as const }] },
        { label: other, parts: [{ size: small, text: shown ? `${small}` : '?', unknown: !shown }] },
      ],
      total: { row: -1, text: `${total}` },
    })
    return numericTask({
      generatorId: id, level, seed, value: small,
      prompt: `${name} och ${other} har tillsammans ${total} klistermärken. ${name} har ${d} fler än ${other}. Hur många har ${other}?`,
      visual: support ? model(false) : { kind: 'ingen' },
      solution: model(true),
      explanation: `Ta bort de ${d} extra: ${total} − ${d} = ${total - d}. Då är staplarna lika långa: ${total - d} / 2 = ${small}.`,
      misconceptions: { [(total) / 2]: 'fel-raknesatt', [small + d]: 'fel-raknesatt', [total - d]: 'fel-raknesatt' },
    })
  }
  if (kind === 'kop') {
    const antal = rng.int(3, 8)
    const pris = rng.int(8, lerpInt(level, 20, 60))
    const kostnad = antal * pris
    // Betala alltid MER än kostnaden — jämn hundring på kostnaden gav
    // "får tillbaka 0 kr", vilket känns som en lurad fråga.
    const betalt = kostnad % 100 === 0 ? kostnad + 100 : Math.ceil(kostnad / 100) * 100
    const extra = level >= 9 ? ` I affären finns ${rng.int(20, 90)} bullar.` : ''
    const back = betalt - kostnad
    return numericTask({
      generatorId: id, level, seed,
      prompt: `${name} köper ${antal} bullar för ${pris} kr styck och betalar med ${betalt} kr.${extra} Hur mycket får ${name} tillbaka?`,
      value: back,
      solution: {
        kind: 'stapelmodell',
        rows: [{ label: 'Betalt', parts: [{ size: kostnad, text: `${kostnad}` }, { size: back, text: `${back}`, tone: 1 }] }],
        total: { row: 0, text: `${betalt} kr` },
      },
      explanation: `Steg 1: ${antal} × ${pris} = ${kostnad} kr. Steg 2: ${betalt} − ${kostnad} = ${back} kr.`,
      misconceptions: { [kostnad]: 'fel-raknesatt', [betalt - pris]: 'fel-raknesatt' },
    })
  }
  if (kind === 'biljetter') {
    const vuxna = rng.int(2, 3)
    const barn = rng.int(2, 4)
    const vuxenPris = rng.int(8, 15) * 10
    const barnPris = vuxenPris / 2
    const sum = vuxna * vuxenPris + barn * barnPris
    return numericTask({
      generatorId: id, level, seed,
      prompt: `En vuxenbiljett kostar ${vuxenPris} kr och en barnbiljett hälften. Vad kostar det för ${vuxna} vuxna och ${barn} barn?`,
      value: sum,
      solution: {
        kind: 'stapelmodell',
        rows: [{ label: 'Biljetter', parts: [...equalParts(vuxna, vuxenPris, `${vuxenPris}`), ...equalParts(barn, barnPris, `${barnPris}`, { tone: 1 })] }],
        total: { row: 0, text: `${sum} kr` },
      },
      explanation: `Barnbiljett: ${barnPris} kr. Vuxna: ${vuxna} × ${vuxenPris} = ${vuxna * vuxenPris}. Barn: ${barn} × ${barnPris} = ${barn * barnPris}. Tillsammans ${sum} kr.`,
      misconceptions: { [(vuxna + barn) * vuxenPris]: 'fel-raknesatt' },
    })
  }
  const veckopeng = rng.int(3, 8) * 10
  const veckor = rng.int(4, 9)
  const mal = veckopeng * veckor + rng.int(2, 9) * 10
  const sparat = veckopeng * veckor
  return numericTask({
    generatorId: id, level, seed,
    prompt: `${name} sparar ${veckopeng} kr i veckan i ${veckor} veckor. En cykel kostar ${mal} kr. Hur mycket fattas?`,
    value: mal - sparat,
    solution: {
      kind: 'stapelmodell',
      rows: [{ label: 'Cykeln', parts: [{ size: sparat, text: `${sparat}` }, { size: mal - sparat, text: `${mal - sparat}`, tone: 1 }] }],
      total: { row: 0, text: `${mal} kr` },
    },
    explanation: `Sparat: ${veckor} × ${veckopeng} = ${sparat} kr. Fattas: ${mal} − ${sparat} = ${mal - sparat} kr.`,
    misconceptions: { [sparat]: 'fel-raknesatt' },
  })
})

export const MULTIPLIKATIONSSKOGEN_GENERATORS: TaskGenerator[] = [
  multIntro, divIntro, tabellerAlla, multDivSamband, skriftligMult, kortDivision, multDivStora, problemFlersteg,
]
