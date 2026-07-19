import type { DifficultyLevel, TaskGenerator } from '../domain/types'
import { createRng } from './rng'
import {
  choiceTask, lerpInt, numericTask, pickName, pickThing, pickTwoNames, tiobas, tiobasOp, uniqueDistractors,
} from './helpers'

/* ============================================================
   Talens dal — taluppfattning, addition/subtraktion, kontroll.
   Nivå 1–7 ≈ årskursnivå, 8–10 = stjärnnivån (över årskursnivå).
   ============================================================ */

const g = (
  id: string,
  fn: (level: DifficultyLevel, seed: number, rng: ReturnType<typeof createRng>) => ReturnType<typeof numericTask>,
): TaskGenerator => ({
  id: `gen.${id}`,
  generate: (level, seed) => fn(level, seed, createRng(seed)),
})

// ---------- Räkna antal 0–10 (F) ----------

const antal010 = g('antal-0-10', (level, seed, rng) => {
  const id = 'gen.antal-0-10'
  const [, plural, emoji] = pickThing(rng)
  if (level >= 8) {
    // Stjärnnivå: två grupper tillsammans — försmak av addition.
    const a = rng.int(3, 6)
    const b = rng.int(2, 5)
    return numericTask({
      generatorId: id, level, seed,
      prompt: `Först ${a} ${plural}, sedan ${b} till. Hur många ${plural} är det tillsammans?`,
      value: a + b,
      visual: { kind: 'grupper', groupCount: 1, itemsPerGroup: a + b, emoji },
      explanation: `Räkna alla: ${a} och ${b} blir ${a + b}.`,
      misconceptions: { [a + b - 1]: 'en-fel', [a + b + 1]: 'en-fel' },
    })
  }
  const n = level <= 3 ? rng.int(1, 5) : rng.int(3, 10)
  return numericTask({
    generatorId: id, level, seed,
    prompt: `Hur många ${plural} ser du?`,
    value: n,
    visual: { kind: 'grupper', groupCount: 1, itemsPerGroup: n, emoji },
    explanation: `Peka och räkna en i taget: det är ${n} ${plural}.`,
    misconceptions: { [n - 1]: 'en-fel', [n + 1]: 'en-fel' },
  })
})

// ---------- Talraden 0–20 (F) ----------

const talrad020 = g('talrad-0-20', (level, seed, rng) => {
  const id = 'gen.talrad-0-20'
  const max = lerpInt(level, 10, 20)
  const kind = rng.pick(level >= 6 ? (['mellan', 'jamfor', 'steg'] as const) : (['efter', 'fore', 'jamfor'] as const))
  if (kind === 'jamfor') {
    const a = rng.int(0, max)
    let b = rng.int(0, max)
    if (b === a) b = a === max ? a - 1 : a + 1
    return choiceTask({
      generatorId: id, level, seed, rng,
      prompt: `Vilket tal är störst?`,
      correct: String(Math.max(a, b)),
      distractors: [[String(Math.min(a, b)), null]],
      visual: { kind: 'tallinje', min: 0, max, marks: [a, b] },
      explanation: `${Math.max(a, b)} ligger längre fram på talraden än ${Math.min(a, b)}.`,
    })
  }
  if (kind === 'mellan') {
    const a = rng.int(1, max - 2)
    return numericTask({
      generatorId: id, level, seed,
      prompt: `Vilket tal ligger mellan ${a} och ${a + 2}?`,
      value: a + 1,
      visual: { kind: 'tallinje', min: 0, max, marks: [a, a + 2] },
      explanation: `Mellan ${a} och ${a + 2} bor ${a + 1}.`,
    })
  }
  if (kind === 'steg') {
    const a = rng.int(2, max - 3)
    const step = rng.pick([2, 3] as const)
    return numericTask({
      generatorId: id, level, seed,
      prompt: `Vilket tal är ${step} mer än ${a}?`,
      value: a + step,
      visual: { kind: 'tallinje', min: 0, max, highlight: a },
      explanation: `Hoppa ${step} steg framåt från ${a}: du landar på ${a + step}.`,
      misconceptions: { [a + step - 1]: 'en-fel', [a + step + 1]: 'en-fel', [a - step]: 'fel-raknesatt' },
    })
  }
  const after = kind === 'efter'
  const a = after ? rng.int(0, max - 1) : rng.int(1, max)
  const value = after ? a + 1 : a - 1
  return numericTask({
    generatorId: id, level, seed,
    prompt: after ? `Vilket tal kommer efter ${a}?` : `Vilket tal kommer före ${a}?`,
    value,
    visual: { kind: 'tallinje', min: 0, max, highlight: a },
    explanation: after
      ? `Ett steg framåt från ${a} är ${value}.`
      : `Ett steg bakåt från ${a} är ${value}.`,
    misconceptions: { [after ? a - 1 : a + 1]: 'fel-raknesatt' },
  })
})

// ---------- Dela upp tal (F) ----------

const delaUppTal = g('dela-upp-tal', (level, seed, rng) => {
  const id = 'gen.dela-upp-tal'
  const total = lerpInt(level, 5, 10)
  const part = rng.int(1, total - 1)
  if (level >= 8) {
    const [nameA, nameB] = pickTwoNames(rng)
    const [, plural, emoji] = pickThing(rng)
    return numericTask({
      generatorId: id, level, seed,
      prompt: `${nameA} och ${nameB} delar på ${total} ${plural}. ${nameA} tar ${part}. Hur många får ${nameB}?`,
      value: total - part,
      visual: { kind: 'grupper', groupCount: 1, itemsPerGroup: total, emoji },
      explanation: `${total} kan delas i ${part} och ${total - part}.`,
      misconceptions: { [total - part + 1]: 'en-fel', [total - part - 1]: 'en-fel' },
    })
  }
  // Uppdelning skriven som öppen likhet — "7 är 6 och …?" förstod ingen.
  return numericTask({
    generatorId: id, level, seed,
    prompt: `${part} + __ = ${total}`,
    spokenPrompt: `${part} plus vilket tal blir ${total}?`,
    value: total - part,
    visual: { kind: 'tiobas', groups: [{ tens: 0, ones: part }, { tens: 0, ones: total - part }] },
    explanation: `${part} och ${total - part} blir tillsammans ${total}.`,
    misconceptions: { [total - part + 1]: 'en-fel', [total - part - 1]: 'en-fel', [total + part]: 'fel-raknesatt' },
  })
})

// ---------- Tiokamraterna (åk 1) ----------

const talkamrater10 = g('talkamrater-10', (level, seed, rng) => {
  const id = 'gen.talkamrater-10'
  if (level >= 8) {
    // Stjärnnivå: hundrakamrater — samma idé, större tal.
    const a = rng.int(1, 9) * 10
    return numericTask({
      generatorId: id, level, seed,
      prompt: `${a} + __ = 100`,
      spokenPrompt: `${a} plus vad blir 100?`,
      value: 100 - a,
      explanation: `Tänk tiokamrater: ${a / 10} + ${(100 - a) / 10} = 10, så ${a} + ${100 - a} = 100.`,
      misconceptions: { [100 - a + 10]: 'positionsfel', [100 - a - 10]: 'positionsfel' },
    })
  }
  const a = rng.int(0, 10)
  const flip = rng.chance(0.5)
  return numericTask({
    generatorId: id, level, seed,
    prompt: flip ? `__ + ${a} = 10` : `${a} + __ = 10`,
    spokenPrompt: `Vad plus ${a} blir 10?`,
    value: 10 - a,
    visual: level <= 4 ? { kind: 'tiobas', groups: [{ tens: 0, ones: a }] } : { kind: 'ingen' },
    explanation: `${a} och ${10 - a} är tiokamrater: tillsammans blir de 10.`,
    misconceptions: { [10 - a + 1]: 'en-fel', [10 - a - 1]: 'en-fel', [10 + a]: 'fel-raknesatt' },
  })
})

// ---------- Parametriserad addition/subtraktion ----------

interface AddSubCfg {
  /** max för termer per nivåband: [nivå1–3, nivå4–5, nivå6–7, nivå8–10] */
  ranges: [number, number, number, number]
  /** Kräv/förbjud tiotalsövergång (undefined = blandat). */
  carry?: boolean
  /** Visa tiobas-stöd upp till denna nivå. */
  visualUpTo: number
  /** Andel textuppgifter från nivå 6. */
  storyFrom?: number
  /** Räknesätt: 'add' = bara addition, 'sub' = bara subtraktion, annars blandat.
      Låter oss dela stigen i ren addition → ren subtraktion → blandat. */
  op?: 'add' | 'sub'
}

const rangeFor = (level: DifficultyLevel, r: AddSubCfg['ranges']): number =>
  level <= 3 ? r[0] : level <= 5 ? r[1] : level <= 7 ? r[2] : r[3]

function makeAddSub(momentId: string, cfg: AddSubCfg): TaskGenerator {
  const id = `gen.${momentId}`
  return {
    id,
    generate: (level, seed) => {
      const rng = createRng(seed)
      const max = rangeFor(level, cfg.ranges)
      // Ren addition/subtraktion om cfg.op satts, annars blandat (50/50).
      const isAdd = cfg.op === 'add' ? true : cfg.op === 'sub' ? false : rng.chance(0.5)

      // Dra termer tills övergångskravet uppfylls.
      let a = 0, b = 0
      for (let i = 0; i < 60; i++) {
        if (isAdd) {
          a = rng.int(Math.min(2, max), max)
          b = rng.int(1, Math.max(1, max - a))
        } else {
          a = rng.int(2, max)
          b = rng.int(1, a)
        }
        if (cfg.carry === undefined) break
        const crosses = isAdd ? (a % 10) + (b % 10) >= 10 : a % 10 < b % 10
        if (crosses === cfg.carry) break
      }
      const value = isAdd ? a + b : a - b

      // Missuppfattningar: glömd växling/minnessiffra + ±1/±10.
      const noCarry = isAdd
        ? (Math.floor(a / 10) + Math.floor(b / 10)) * 10 + (((a % 10) + (b % 10)) % 10)
        : undefined
      const digitwiseMaxMin = !isAdd
        ? Math.floor(a / 10 - Math.floor(b / 10)) >= 0
          ? Math.abs(Math.floor(a / 10) - Math.floor(b / 10)) * 10 + Math.abs((a % 10) - (b % 10))
          : undefined
        : undefined
      const mis: Record<number, 'glomd-minnessiffra' | 'glomd-vaxling' | 'en-fel' | 'positionsfel' | 'fel-raknesatt'> = {}
      if (noCarry !== undefined && noCarry !== value) mis[noCarry] = 'glomd-minnessiffra'
      if (digitwiseMaxMin !== undefined && digitwiseMaxMin !== value) mis[digitwiseMaxMin] = 'glomd-vaxling'
      if (value - 1 >= 0) mis[value - 1] = 'en-fel'
      mis[value + 1] = 'en-fel'
      if (value - 10 >= 0 && max > 20) mis[value - 10] = 'positionsfel'
      if (max > 20) mis[value + 10] = 'positionsfel'
      const opposite = isAdd ? a - b : a + b
      if (opposite >= 0 && opposite !== value) mis[opposite] = 'fel-raknesatt'

      // Textuppgift på högre nivåer — med överflödig information på stjärnnivån.
      const story = level >= (cfg.storyFrom ?? 6) && rng.chance(level >= 8 ? 0.7 : 0.4)
      if (story) {
        const name = pickName(rng)
        const [, plural, emoji] = pickThing(rng)
        const extra = level >= 9 ? ` ${pickName(rng)} har ${rng.int(2, 20)} ${plural}.` : ''
        const prompt = isAdd
          ? `${name} har ${a} ${plural} och får ${b} till.${extra} Hur många ${plural} har ${name} nu?`
          : `${name} har ${a} ${plural} och ger bort ${b}.${extra} Hur många ${plural} har ${name} kvar?`
        return numericTask({
          generatorId: id, level, seed, prompt, value,
          visual: level <= cfg.visualUpTo ? { kind: 'grupper', groupCount: 1, itemsPerGroup: Math.min(a, 12), emoji } : { kind: 'ingen' },
          explanation: isAdd
            ? `${a} + ${b} = ${value}. Informationen om andra personer behövdes inte!`
            : `${a} − ${b} = ${value}. Informationen om andra personer behövdes inte!`,
          misconceptions: mis,
        })
      }

      // Öppen utsaga på stjärnnivån (svaret är den gömda termen).
      if (level >= 8 && rng.chance(0.4)) {
        return numericTask({
          generatorId: id, level, seed,
          prompt: isAdd ? `${a} + __ = ${a + b}` : `__ − ${b} = ${a - b}`,
          spokenPrompt: isAdd ? `${a} plus vad blir ${a + b}?` : `Vad minus ${b} blir ${a - b}?`,
          value: isAdd ? b : a,
          explanation: isAdd
            ? `Räkna baklänges: ${a + b} − ${a} = ${b}.`
            : `Räkna baklänges: ${a - b} + ${b} = ${a}.`,
          misconceptions: { [isAdd ? a + b : a - b]: 'likhetstecken-resultat' },
        })
      }

      return numericTask({
        generatorId: id, level, seed,
        prompt: isAdd ? `${a} + ${b} = ?` : `${a} − ${b} = ?`,
        spokenPrompt: isAdd ? `Vad är ${a} plus ${b}?` : `Vad är ${a} minus ${b}?`,
        value,
        visual: level <= cfg.visualUpTo ? tiobasOp(isAdd ? '+' : '−', a, b) : { kind: 'ingen' },
        explanation: isAdd
          ? (a % 10) + (b % 10) >= 10
            ? `Gå via tian: ${a} + ${10 - (a % 10)} = ${a + 10 - (a % 10)}, sedan ${b - (10 - (a % 10))} till = ${value}.`
            : `Lägg ihop: ${a} + ${b} = ${value}.`
          : a % 10 < b % 10
            ? `Entalen räcker inte — växla ett tiotal: ${a} − ${b} = ${value}.`
            : `Ta bort: ${a} − ${b} = ${value}.`,
        misconceptions: mis,
      })
    },
  }
}

// Memoreringsordningen (Albert, FK/åk1): ren addition → ren subtraktion →
// blandat, först 0–10, sedan 0–20. Storyuppgifter hålls borta (storyFrom högt)
// så de rena flyt-noderna handlar om faktakunskap, inte läsförståelse.
const addition010 = makeAddSub('addition-0-10', { ranges: [6, 8, 10, 10], visualUpTo: 5, op: 'add', storyFrom: 99 })
const subtraktion010 = makeAddSub('subtraktion-0-10', { ranges: [6, 8, 10, 10], visualUpTo: 5, op: 'sub', storyFrom: 99 })
const addSub010 = makeAddSub('add-sub-0-10', { ranges: [6, 8, 10, 10], visualUpTo: 5 })
const addition020 = makeAddSub('addition-0-20', { ranges: [12, 15, 20, 20], carry: false, visualUpTo: 4, op: 'add', storyFrom: 99 })
const subtraktion020 = makeAddSub('subtraktion-0-20', { ranges: [12, 15, 20, 20], carry: false, visualUpTo: 4, op: 'sub', storyFrom: 99 })
const addSub020 = makeAddSub('add-sub-0-20', { ranges: [12, 15, 20, 20], carry: false, visualUpTo: 4 })
const tiotalsovergang = makeAddSub('tiotalsovergang-20', { ranges: [14, 16, 18, 20], carry: true, visualUpTo: 5 })
const addSub0100 = makeAddSub('add-sub-0-100', { ranges: [40, 60, 100, 100], carry: false, visualUpTo: 4 })
const vaxling0100 = makeAddSub('vaxling-0-100', { ranges: [50, 70, 100, 100], carry: true, visualUpTo: 4 })
const addSub01000 = makeAddSub('add-sub-0-1000', { ranges: [300, 500, 1000, 1000], visualUpTo: 2, storyFrom: 5 })

// ---------- Tiotal och ental (åk 2) ----------

const positionssystem100 = g('positionssystem-100', (level, seed, rng) => {
  const id = 'gen.positionssystem-100'
  if (level >= 8) {
    const tens = rng.int(10, 19)
    const ones = rng.int(0, 9)
    return numericTask({
      generatorId: id, level, seed,
      prompt: `Vilket tal är ${tens} tiotal och ${ones} ental?`,
      value: tens * 10 + ones,
      explanation: `${tens} tiotal är ${tens * 10}. Med ${ones} ental blir det ${tens * 10 + ones}.`,
      misconceptions: { [tens + ones]: 'positionsfel', [tens * 100 + ones]: 'positionsfel' },
    })
  }
  const n = rng.int(21, 99)
  const tens = Math.floor(n / 10)
  const ones = n % 10
  if (rng.chance(0.5)) {
    return numericTask({
      generatorId: id, level, seed,
      prompt: `Vilket tal är ${tens} tiotal och ${ones} ental?`,
      value: n,
      visual: level <= 5 ? tiobas(n) : { kind: 'ingen' },
      explanation: `${tens} tiotal är ${tens * 10}, plus ${ones} ental blir ${n}.`,
      misconceptions: { [ones * 10 + tens]: 'positionsfel', [tens + ones]: 'positionsfel' },
    })
  }
  return numericTask({
    generatorId: id, level, seed,
    prompt: `Hur många tiotal finns i talet ${n}?`,
    value: tens,
    visual: level <= 5 ? tiobas(n) : { kind: 'ingen' },
    explanation: `${n} är ${tens} tiotal och ${ones} ental.`,
    misconceptions: { [ones]: 'positionsfel', [n]: 'positionsfel' },
  })
})

// ---------- Stora tal (åk 4) ----------

const storaTal = g('stora-tal', (level, seed, rng) => {
  const id = 'gen.stora-tal'
  const magnitude = level <= 3 ? 10_000 : level <= 6 ? 100_000 : 1_000_000
  const kind = rng.pick(['jamfor', 'plus-tiopotens', 'siffran'] as const)
  if (kind === 'jamfor') {
    const a = rng.int(1000, magnitude - 1)
    // Lura positionsfelet: samma siffror, olika ordning.
    const digits = String(a).split('')
    const shuffled = Number(rng.shuffle(digits).join('')) || a + 1
    const b = shuffled === a ? a + 1 : shuffled
    return choiceTask({
      generatorId: id, level, seed, rng,
      prompt: `Vilket tal är störst?`,
      correct: Math.max(a, b).toLocaleString('sv-SE'),
      distractors: [[Math.min(a, b).toLocaleString('sv-SE'), 'positionsfel']],
      explanation: `Jämför siffrornas platser från vänster — flest siffror eller störst siffra längst fram vinner.`,
    })
  }
  if (kind === 'plus-tiopotens') {
    const step = rng.pick([100, 1000, 10_000] as const)
    const a = rng.int(1000, magnitude - step)
    return numericTask({
      generatorId: id, level, seed,
      prompt: `Vad är ${a.toLocaleString('sv-SE')} + ${step.toLocaleString('sv-SE')}?`,
      value: a + step,
      explanation: `Bara siffran på ${step === 100 ? 'hundratals' : step === 1000 ? 'tusentals' : 'tiotusentals'}platsen ändras.`,
      misconceptions: { [a + step / 10]: 'positionsfel', [a + step * 10]: 'positionsfel' },
    })
  }
  const a = rng.int(magnitude / 10, magnitude - 1)
  const places = ['ental', 'tiotal', 'hundratal', 'tusental', 'tiotusental', 'hundratusental'] as const
  const pi = rng.int(0, Math.min(String(a).length - 1, 5))
  const digit = Math.floor(a / 10 ** pi) % 10
  return numericTask({
    generatorId: id, level, seed,
    prompt: `Vilken siffra står på ${places[pi]}splatsen i ${a.toLocaleString('sv-SE')}?`,
    value: digit,
    explanation: `Räkna platserna från höger: ental, tiotal, hundratal … ${places[pi]}splatsen har siffran ${digit}.`,
  })
})

// ---------- Negativa tal (åk 5) ----------

const negativaTal = g('negativa-tal', (level, seed, rng) => {
  const id = 'gen.negativa-tal'
  const span = lerpInt(level, 5, 20)
  if (level >= 6 && rng.chance(0.5)) {
    const from = rng.int(-span, 0)
    const to = rng.int(1, span)
    return numericTask({
      generatorId: id, level, seed,
      prompt: `Hur många grader skiljer det mellan ${from} °C och ${to} °C?`,
      value: to - from,
      visual: { kind: 'tallinje', min: -span, max: span, marks: [from, to] },
      explanation: `Från ${from} till 0 är det ${-from} steg, sedan ${to} till: ${-from} + ${to} = ${to - from}.`,
      misconceptions: { [Math.abs(to + from)]: 'fel-raknesatt' },
    })
  }
  const a = rng.int(0, span)
  const b = rng.int(a + 1, a + span)
  return numericTask({
    generatorId: id, level, seed,
    prompt: `Vad är ${a} − ${b}?`,
    spokenPrompt: `Vad är ${a} minus ${b}?`,
    value: a - b,
    visual: { kind: 'tallinje', min: -span, max: span, highlight: a },
    explanation: `Gå ${b} steg åt vänster från ${a} — du hamnar under nollan, på ${a - b}.`,
    misconceptions: { [b - a]: 'fel-raknesatt' },
  })
})

// ---------- Är det rimligt? (åk 2) ----------

const rimlighet = g('rimlighet', (level, seed, rng) => {
  const id = 'gen.rimlighet'
  const max = lerpInt(level, 50, 900)
  const a = rng.int(max / 4, max / 2)
  const b = rng.int(max / 4, max / 2)
  const sum = a + b
  const round = (n: number): number => Math.round(n / 10) * 10
  const correct = round(sum)
  const distractors = uniqueDistractors(correct, [
    [round(sum / 2), null],
    [round(sum * 2), null],
    [round(sum) + 100, 'positionsfel'],
    [round(sum / 10), 'positionsfel'],
  ])
  return choiceTask({
    generatorId: id, level, seed, rng,
    prompt: `Ungefär hur mycket är ${a} + ${b}?`,
    correct: String(correct),
    distractors,
    explanation: `Avrunda först: ${a} ≈ ${round(a)} och ${b} ≈ ${round(b)}. Då blir det ungefär ${correct}. Så vet du om ditt riktiga svar är rimligt!`,
  })
})

// ---------- Kontrollera svaret (åk 3) ----------

const kontrollMotsatt = g('kontroll-motsatt', (level, seed, rng) => {
  const id = 'gen.kontroll-motsatt'
  const max = lerpInt(level, 50, 500)
  const a = rng.int(20, max)
  const b = rng.int(5, a - 5)
  const shown = a - b
  if (level >= 6 && rng.chance(0.5)) {
    // Stämmer påståendet? Fel med klassisk växlingsmiss ibland.
    const wrong = rng.chance(0.5)
    const claimed = wrong ? shown + rng.pick([10, -10, 1, -1] as const) : shown
    return choiceTask({
      generatorId: id, level, seed, rng,
      prompt: `${pickName(rng)} har räknat ${a} − ${b} = ${claimed}. Kontrollera med addition: stämmer det?`,
      correct: wrong ? 'Nej' : 'Ja',
      distractors: [[wrong ? 'Ja' : 'Nej', null]],
      explanation: `Kontrollen: ${claimed} + ${b} = ${claimed + b}. ${claimed + b === a ? `Det blir ${a} — svaret stämmer.` : `Det blir ${claimed + b}, inte ${a} — svaret var fel. Rätt svar är ${shown}.`}`,
    })
  }
  return choiceTask({
    generatorId: id, level, seed, rng,
    prompt: `Du har räknat ${a} − ${b} = ${shown}. Vilken kontroll visar om det stämmer?`,
    correct: `${shown} + ${b}`,
    distractors: [
      [`${shown} − ${b}`, 'fel-raknesatt'],
      [`${a} + ${b}`, 'fel-raknesatt'],
      [`${a} + ${shown}`, 'fel-raknesatt'],
    ],
    explanation: `Motsatt räknesätt: om ${a} − ${b} = ${shown} ska ${shown} + ${b} bli ${a} igen.`,
  })
})

// ---------- Överslagsräkning (åk 4) ----------

const overslagsrakning = g('overslagsrakning', (level, seed, rng) => {
  const id = 'gen.overslagsrakning'
  const nearHundred = (): number => rng.int(1, 9) * 100 + rng.pick([-8, -5, -3, 2, 4, 7] as const)
  const a = nearHundred()
  let b = nearHundred()
  const isAdd = rng.chance(0.6)
  const roundedA = Math.round(a / 100) * 100
  let roundedB = Math.round(b / 100) * 100
  // Subtraktion med samma hundratal gav överslaget 0 och bara en distraktor —
  // tvinga fram olika hundratal (b hålls kvar nära ett hundratal).
  if (!isAdd && roundedA === roundedB) {
    b = roundedB >= 500 ? b - 100 : b + 100
    roundedB = Math.round(b / 100) * 100
  }
  const correct = isAdd ? roundedA + roundedB : Math.abs(roundedA - roundedB)
  const distractors = uniqueDistractors(correct, [
    [correct + 100, 'en-fel'],
    [correct - 100, 'en-fel'],
    [correct * 10, 'positionsfel'],
    [Math.round(correct / 10), 'positionsfel'],
  ])
  return choiceTask({
    generatorId: id, level, seed, rng,
    prompt: `Överslag: ungefär vad är ${Math.max(a, b)} ${isAdd ? '+' : '−'} ${Math.min(a, b)}?`,
    correct: String(correct),
    distractors,
    explanation: `Avrunda till närmaste hundratal: ${Math.max(roundedA, roundedB)} ${isAdd ? '+' : '−'} ${Math.min(roundedA, roundedB)} = ${correct}.`,
  })
})

export const TALENS_DAL_GENERATORS: TaskGenerator[] = [
  antal010, talrad020, delaUppTal, talkamrater10,
  addition010, subtraktion010, addSub010,
  addition020, subtraktion020, addSub020,
  tiotalsovergang, positionssystem100,
  addSub0100, vaxling0100, addSub01000, storaTal, negativaTal,
  rimlighet, kontrollMotsatt, overslagsrakning,
]
