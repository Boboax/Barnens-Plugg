import type { DifficultyLevel, TaskGenerator, TaskVisual } from '../domain/types'
import { createRng } from './rng'
import {
  choiceTask, hopSolution, lerpInt, numericTask, pickName, pickThing, pickTwoNames, tiobas, tiobasOp, uniqueDistractors,
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
      // Ingen bild: en grupp med a+b objekt lät barnet räkna prickar i stället
      // för att addera — bilden avslöjade facit. Stjärnnivå = utan stöd (CRA).
      visual: { kind: 'ingen' },
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
  // Tallinjen är stödet på nivå 1–3 (CRA). Senare står siffrorna ovanför
  // talet som frågas efter — då läser barnet av svaret i stället för att
  // tänka talraden.
  const line = (extra: { marks?: number[]; highlight?: number }): TaskVisual | undefined =>
    level <= 3 ? { kind: 'tallinje', min: 0, max, ...extra } : undefined
  if (kind === 'jamfor') {
    // Tre tal, inte två: med två val blir varannan gissning rätt och felet
    // kan inte tas om (TaskRunner ger inget andra försök på tvåval).
    const nums = new Set<number>()
    while (nums.size < 3) nums.add(rng.int(0, max))
    const [hi, ...rest] = [...nums].sort((x, y) => y - x)
    return choiceTask({
      generatorId: id, level, seed, rng,
      prompt: `Vilket tal är störst?`,
      correct: String(hi),
      distractors: rest.map((n) => [String(n), null] as [string, null]),
      visual: line({ marks: [...nums] }),
      explanation: `${hi} ligger längst fram på talraden — det är störst.`,
    })
  }
  if (kind === 'mellan') {
    const a = rng.int(1, max - 2)
    return numericTask({
      generatorId: id, level, seed,
      prompt: `Vilket tal ligger mellan ${a} och ${a + 2}?`,
      value: a + 1,
      visual: line({ marks: [a, a + 2] }),
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
      visual: line({ highlight: a }),
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
    visual: line({ highlight: a }),
    explanation: after
      ? `Ett steg framåt från ${a} är ${value}.`
      : `Ett steg bakåt från ${a} är ${value}.`,
    misconceptions: { [after ? a - 1 : a + 1]: 'fel-raknesatt' },
  })
})

// ---------- Dela upp tal (F) ----------

const delaUppTal = g('dela-upp-tal', (level, seed, rng) => {
  const id = 'gen.dela-upp-tal'
  // Ett spann av helheter, inte en enda: med bara 5 på nivå 1 fanns fyra
  // uppgifter, och barnet lärde sig dem utantill.
  const total = rng.int(lerpInt(level, 4, 6), lerpInt(level, 6, 10))
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
  // Bilden visar HELHETEN (nivå 1–3): barnet räknar bort den kända delen.
  // Att rita båda delarna var att rita svaret.
  return numericTask({
    generatorId: id, level, seed,
    prompt: `${part} + __ = ${total}`,
    spokenPrompt: `${part} plus vilket tal blir ${total}?`,
    value: total - part,
    visual: level <= 3 ? { kind: 'tiobas', groups: [{ tens: 0, ones: total }] } : undefined,
    explanation: `Räkna vidare från ${part} till ${total}: det är ${total - part} steg. ${part} och ${total - part} blir tillsammans ${total}.`,
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

// ---------- Räkna till 100 (förskoleklass, VT) ----------

/* Talraden till hundra. Barn som inte når 100 fastnar nästan alltid på
   SAMMA ställen: där entalen tar slut och ett nytt tiotal börjar (29 → 30,
   69 → 70, 99 → 100) — ramsan "tjugoåtta, tjugonio, tjugotio". Därför
   handlar mer än hälften av uppgifterna om just övergångarna, och felet
   att gå tillbaka till tiotalets början (29 → 20) eller säga "tjugotio"
   (210) taggas så att motorn och föräldrarapporten ser VAD som hakar.
   Hundrarutan är stödet (CRA): varje rad är ett tiotal, så övergången blir
   synlig som "ny rad". */

/** Raderna i hundrarutan (0 = 1–10 … 9 = 91–100) som täcker talen. */
const chartRows = (...nums: number[]): [number, number] => {
  const rows = nums.map((n) => Math.floor((Math.max(1, Math.min(100, n)) - 1) / 10))
  return [Math.min(...rows), Math.max(...rows)]
}

const talrad0100 = g('talrad-0-100', (level, seed, rng) => {
  const id = 'gen.talrad-0-100'
  const max = level <= 3 ? 50 : 100
  const atTransition = rng.chance(0.6)
  const chart = level <= 4
  const kind = rng.pick(
    level <= 3 ? (['efter', 'efter', 'saknas'] as const)
      : level <= 5 ? (['efter', 'fore', 'saknas'] as const)
        : level <= 7 ? (['efter', 'fore', 'saknas', 'tiotal'] as const)
          : (['bakat', 'under', 'fore', 'efter'] as const),
  )

  if (kind === 'tiotal') {
    const start = rng.int(1, 6)
    const seq = [start, start + 1, start + 2].map((k) => k * 10)
    const value = (start + 3) * 10
    return numericTask({
      generatorId: id, level, seed,
      prompt: `Räkna tiotal: ${seq.join(', ')}, __`,
      spokenPrompt: `Räkna tiotal: ${seq.join(', ')}. Vad kommer sedan?`,
      value,
      explanation: `Tiotalen: tio, tjugo, trettio, fyrtio, femtio, sextio, sjuttio, åttio, nittio, hundra. Efter ${value - 10} kommer ${value}.`,
      misconceptions: { [value - 9]: 'ramsa-tiotal', [value + 10]: 'en-fel', [value - 10 + 1]: 'ramsa-tiotal' },
    })
  }

  if (kind === 'under') {
    // Hundrarutan: talet under är tio mer — en hel rad längre fram.
    const n = rng.int(11, 89)
    return numericTask({
      generatorId: id, level, seed,
      prompt: `I hundrarutan: vilket tal står rakt under ${n}?`,
      value: n + 10,
      visual: { kind: 'hundraruta', highlight: [n], hidden: [n + 10], rows: chartRows(n, n + 10) },
      explanation: `Varje rad i hundrarutan är tio tal. Rakt under ${n} står ${n + 10} — tio mer.`,
      misconceptions: { [n + 1]: 'positionsfel', [n + 11]: 'en-fel', [n + 9]: 'en-fel' },
    })
  }

  if (kind === 'bakat') {
    // Baklänges förbi ett tiotal: 52, 51, __ (50) eller 41, 40, __ (39).
    const ten = rng.int(2, 9) * 10
    const crossBelow = rng.chance(0.5)
    const seq = crossBelow ? [ten + 1, ten] : [ten + 2, ten + 1]
    const value = crossBelow ? ten - 1 : ten
    return numericTask({
      generatorId: id, level, seed,
      prompt: `Räkna baklänges: ${seq.join(', ')}, __`,
      spokenPrompt: `Räkna baklänges: ${seq.join(', ')}. Vad kommer sedan?`,
      value,
      explanation: crossBelow
        ? `Baklänges förbi tiotalet: ${ten + 1}, ${ten}, ${ten - 1} — före ${ten} kommer ${ten - 1}.`
        : `Baklänges: ${ten + 2}, ${ten + 1}, ${ten}.`,
      misconceptions: crossBelow ? { [ten + 9]: 'ramsa-tiotal', [ten - 10]: 'ramsa-tiotal' } : { [ten - 1]: 'en-fel' },
    })
  }

  if (kind === 'fore') {
    // Före ett jämnt tiotal: före 40 kommer 39 (inte 49 eller 30).
    const n = atTransition ? rng.int(2, max / 10) * 10 : rng.int(2, max)
    const value = n - 1
    const mis: Record<number, 'ramsa-tiotal' | 'en-fel'> = { [n + 1]: 'en-fel' }
    if (n % 10 === 0) { mis[n + 9] = 'ramsa-tiotal'; mis[n - 10] = 'ramsa-tiotal' }
    return numericTask({
      generatorId: id, level, seed,
      prompt: `Vilket tal kommer före ${n}?`,
      value,
      visual: chart ? { kind: 'hundraruta', highlight: [n], hidden: [value], rows: chartRows(value, n) } : { kind: 'ingen' },
      explanation: n % 10 === 0
        ? `${n} är början på ett nytt tiotal. Talet före är sista talet i tiotalet innan: ${value}.`
        : `Ett steg bakåt från ${n} är ${value}.`,
      misconceptions: mis,
    })
  }

  // efter / saknas: oftast vid övergången (…9 → nästa tiotal).
  const raw = atTransition ? rng.int(1, max / 10 - (max === 100 ? 0 : 1)) * 10 - 1 : rng.int(1, max - 1)
  // "Saknas" visar talet efter luckan också — det får inte bli 101.
  const n = kind === 'saknas' ? Math.min(raw, raw % 10 === 9 ? max - 11 : max - 2) : raw
  const value = n + 1
  const mis: Record<number, 'ramsa-tiotal' | 'en-fel' | 'positionsfel'> = { [n + 2]: 'en-fel' }
  if (n % 10 === 9) {
    mis[n - 9] = 'ramsa-tiotal' // 29 → 20: tillbaka till tiotalets början
    mis[(n - 9) * 10 + 10] = 'ramsa-tiotal' // 29 → 210: "tjugotio"
    mis[n + 11] = 'positionsfel' // 29 → 40: hoppade ett tiotal för långt
  }
  const transitionNote = n % 10 === 9
    ? ` Efter nio ental är tiotalet fullt — då börjar nästa tiotal: ${value}.`
    : ''
  if (kind === 'saknas') {
    const seq = [n - 1, n, '__', n + 2].filter((x) => x === '__' || (x as number) >= 1)
    return numericTask({
      generatorId: id, level, seed,
      prompt: `Vilket tal saknas? ${seq.join(', ')}`,
      spokenPrompt: `Vilket tal saknas? ${seq.map((x) => (x === '__' ? 'vad' : x)).join(', ')}`,
      value,
      visual: chart ? { kind: 'hundraruta', highlight: [n, n + 2].filter((x) => x <= 100), hidden: [value], rows: chartRows(n, n + 2) } : { kind: 'ingen' },
      explanation: `Talet mellan ${n} och ${n + 2} är ${value}.${transitionNote}`,
      misconceptions: mis,
    })
  }
  if (level <= 3) {
    const wrongs: [string, 'ramsa-tiotal' | 'en-fel' | null][] = n % 10 === 9
      ? [[String(n - 9), 'ramsa-tiotal'], [String(n + 11), null]]
      : [[String(n + 2), 'en-fel'], [String(Math.max(0, n - 1)), null]]
    return choiceTask({
      generatorId: id, level, seed, rng,
      prompt: `Vilket tal kommer efter ${n}?`,
      correct: String(value),
      distractors: wrongs,
      visual: { kind: 'hundraruta', highlight: [n], hidden: [value], rows: chartRows(n, value) },
      explanation: `Efter ${n} kommer ${value}.${transitionNote}`,
    })
  }
  return numericTask({
    generatorId: id, level, seed,
    prompt: `Vilket tal kommer efter ${n}?`,
    value,
    visual: chart ? { kind: 'hundraruta', highlight: [n], hidden: [value], rows: chartRows(n, value) } : { kind: 'ingen' },
    explanation: `Efter ${n} kommer ${value}.${transitionNote}`,
    misconceptions: mis,
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

/** Förklaringen visar VÄGEN, inte bara facit: tiotal för sig och ental för
    sig, eller via tian när entalen inte räcker. "Växla: 52 − 17 = 35"
    upprepade svaret utan att visa hur. */
function addSubSteps(a: number, b: number, isAdd: boolean): string {
  const value = isAdd ? a + b : a - b
  const bTens = b - (b % 10)
  const bOnes = b % 10
  if (isAdd) {
    if ((a % 10) + bOnes >= 10) {
      const up = 10 - (a % 10)
      return `Gå via tian: ${a} + ${up} = ${a + up}, sedan ${b - up} till = ${value}.`
    }
    if (a >= 10 && bTens > 0) {
      return `Tiotal för sig: ${a - (a % 10)} + ${bTens} = ${a - (a % 10) + bTens}. Ental för sig: ${a % 10} + ${bOnes} = ${(a % 10) + bOnes}. Tillsammans ${value}.`
    }
    return `Räkna vidare från ${a}: ${b} steg till blir ${value}.`
  }
  if (a % 10 < bOnes) {
    // Tiotalen först, sedan entalen ner till tian och vidare — det är
    // växlingen gjord i huvudet.
    const x = a - bTens
    const first = bTens > 0 ? `Ta först bort tiotalen: ${a} − ${bTens} = ${x}. ` : ''
    const down = x % 10
    const rest = down === 0
      ? `Sedan ${x} − ${bOnes} = ${value}.`
      : `Sedan ner till tian: ${x} − ${down} = ${x - down}, och ${bOnes - down} till: ${value}.`
    return `Entalen räcker inte — gå via tian. ${first}${rest}`
  }
  if (a >= 10 && bTens > 0) {
    return `Tiotal för sig: ${a - (a % 10)} − ${bTens} = ${a - (a % 10) - bTens}. Ental för sig: ${a % 10} − ${bOnes} = ${(a % 10) - bOnes}. Tillsammans ${value}.`
  }
  return `Räkna bakåt från ${a}: ${b} steg blir ${value}.`
}

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
      // Tre sorters berättelser (Singapore-matten): förändring (får/ger bort),
      // jämförelse (fler/färre än) och saknad del. Alla får en STAPELMODELL:
      // som stöd före svaret upp till nivå 7, och som lösningsbild efteråt.
      // (Ger bort allt = noll kvar blir en stapel utan bredd — då en vanlig uppgift.)
      const story = level >= (cfg.storyFrom ?? 6) && rng.chance(level >= 8 ? 0.7 : 0.4) && (isAdd || value >= 1)
      if (story) {
        // Den överflödiga informationen måste handla om en ANNAN person —
        // pickName två gånger kunde dra samma namn ("Vera har 7 bullar …
        // Vera har 19 bullar") och göra uppgiften självmotsägande.
        const [name, other] = pickTwoNames(rng)
        const [, plural] = pickThing(rng)
        const support = level <= 7
        const kind = rng.pick(isAdd ? (['andring', 'jamfor', 'saknas'] as const) : (['andring', 'jamfor'] as const))
        // I jämförelsen är den andra personen själva frågan — då får den
        // överflödiga informationen inte handla om en person alls.
        const personExtra = kind !== 'jamfor' && rng.chance(0.5)
        const extra = level >= 9
          ? personExtra ? ` ${other} har ${rng.int(2, 20)} ${plural}.` : ` Det är ${rng.int(2, 9)} grader varmt ute.`
          : ''
        const extraNote = extra ? ' Den andra informationen behövdes inte!' : ''

        if (kind === 'saknas') {
          // a + ? = a + b: den sökta delen. Felet att lägga ihop allt fångas.
          const whole = a + b
          const model = (shown: boolean): TaskVisual => ({
            kind: 'stapelmodell',
            rows: [{ label: name, parts: [{ size: a, text: `${a}` }, { size: b, text: shown ? `${b}` : '?', unknown: !shown, tone: 1 }] }],
            total: { row: 0, text: `${whole}` },
          })
          return numericTask({
            generatorId: id, level, seed, value: b,
            prompt: `${name} hade ${a} ${plural}. Sedan fick ${name} några till och har nu ${whole}.${extra} Hur många fick ${name}?`,
            visual: support ? model(false) : { kind: 'ingen' },
            solution: model(true),
            explanation: `Helheten är ${whole} och en del är ${a}. Den andra delen: ${whole} − ${a} = ${b}.${extraNote}`,
            misconceptions: { [whole + a]: 'fel-raknesatt', [b + 1]: 'en-fel', ...(b - 1 >= 0 ? { [b - 1]: 'en-fel' } : {}) },
          })
        }

        if (kind === 'jamfor') {
          // Jämförelse: den andra personen har b fler/färre. Skillnaden är
          // glappet i stapelmodellen.
          const model = (shown: boolean): TaskVisual => isAdd
            ? {
                kind: 'stapelmodell',
                rows: [
                  { label: name, parts: [{ size: a, text: `${a}` }] },
                  { label: other, parts: [{ size: a, text: `${a}` }, { size: b, text: `${b}`, tone: 1 }] },
                ],
                total: { row: 1, text: shown ? `${value}` : '?', unknown: !shown },
              }
            : {
                kind: 'stapelmodell',
                rows: [
                  { label: name, parts: [{ size: a, text: `${a}` }] },
                  { label: other, parts: [{ size: value, text: shown ? `${value}` : '?', unknown: !shown, tone: 1 }] },
                ],
                diff: { text: `${b}` },
              }
          return numericTask({
            generatorId: id, level, seed, value,
            prompt: isAdd
              ? `${name} har ${a} ${plural}. ${other} har ${b} fler än ${name}.${extra} Hur många ${plural} har ${other}?`
              : `${name} har ${a} ${plural}. ${other} har ${b} färre än ${name}.${extra} Hur många ${plural} har ${other}?`,
            visual: support ? model(false) : { kind: 'ingen' },
            solution: model(true),
            explanation: isAdd
              ? `${other} har lika många som ${name} och ${b} till: ${a} + ${b} = ${value}.${extraNote}`
              : `${other} har ${b} färre — staplen är ${b} kortare: ${a} − ${b} = ${value}.${extraNote}`,
            misconceptions: mis,
          })
        }

        const model = (shown: boolean): TaskVisual => isAdd
          ? {
              kind: 'stapelmodell',
              rows: [{ label: name, parts: [{ size: a, text: `${a}` }, { size: b, text: `${b}`, tone: 1 }] }],
              total: { row: 0, text: shown ? `${value}` : '?', unknown: !shown },
            }
          : {
              kind: 'stapelmodell',
              rows: [{ label: name, parts: [{ size: value, text: shown ? `${value}` : '?', unknown: !shown }, { size: b, text: `${b}`, removed: true }] }],
              total: { row: 0, text: `${a}` },
            }
        const prompt = isAdd
          ? `${name} har ${a} ${plural} och får ${b} till.${extra} Hur många ${plural} har ${name} nu?`
          : `${name} har ${a} ${plural} och ger bort ${b}.${extra} Hur många ${plural} har ${name} kvar?`
        return numericTask({
          generatorId: id, level, seed, prompt, value,
          visual: support ? model(false) : { kind: 'ingen' },
          solution: model(true),
          explanation: isAdd
            ? `Två delar blir en helhet: ${a} + ${b} = ${value}.${extraNote}`
            : `Helheten är ${a}, ${b} försvinner: ${a} − ${b} = ${value}.${extraNote}`,
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
        solution: hopSolution(a, b, isAdd),
        explanation: addSubSteps(a, b, isAdd),
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

/** "+1000" ändrar bara tusentalssiffran — UTOM när den är 9: då blir det
    en växling till nästa plats (26 969 + 100 = 27 069). Förklaringen
    påstod tidigare alltid att bara en siffra ändras. */
function tenPowerStep(a: number, step: 100 | 1000 | 10_000): string {
  const place = step === 100 ? 'hundratals' : step === 1000 ? 'tusentals' : 'tiotusentals'
  const next = step === 100 ? 'tusentals' : step === 1000 ? 'tiotusentals' : 'hundratusentals'
  const digit = Math.floor(a / step) % 10
  const sum = (a + step).toLocaleString('sv-SE')
  return digit < 9
    ? `Bara siffran på ${place}platsen ändras: ${digit} blir ${digit + 1}. Svaret är ${sum}.`
    : `Siffran på ${place}platsen är 9 och blir 10 — växla: den blir 0 och ${next}siffran ökar med 1. Svaret är ${sum}.`
}

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
    // Ett tredje tal med en siffra färre men stora siffror ("ser stort ut"),
    // så att det inte blir ett tvåval där varannan gissning träffar.
    const c = Math.max(100, Math.floor(Math.max(a, b) / 10) + rng.int(0, 9))
    const hi = Math.max(a, b)
    return choiceTask({
      generatorId: id, level, seed, rng,
      prompt: `Vilket tal är störst?`,
      correct: hi.toLocaleString('sv-SE'),
      distractors: [
        [Math.min(a, b).toLocaleString('sv-SE'), 'positionsfel'],
        [c.toLocaleString('sv-SE'), 'positionsfel'],
      ],
      explanation: `Flest siffror vinner. Har talen lika många siffror jämför du platserna från vänster — första platsen där de skiljer sig avgör.`,
    })
  }
  if (kind === 'plus-tiopotens') {
    const step = rng.pick([100, 1000, 10_000] as const)
    const a = rng.int(1000, magnitude - step)
    return numericTask({
      generatorId: id, level, seed,
      prompt: `Vad är ${a.toLocaleString('sv-SE')} + ${step.toLocaleString('sv-SE')}?`,
      spokenPrompt: `Vad är ${a} plus ${step}?`,
      value: a + step,
      explanation: tenPowerStep(a, step),
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
      // Hoppet går via nollan — precis som förklaringen räknar.
      solution: { kind: 'tallinje', min: -span, max: span, hops: from === 0 ? [from, to] : [from, 0, to] },
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
    // Först ner till nollan, sedan vidare under den: där blir talen negativa.
    solution: { kind: 'tallinje', min: -span, max: span, hops: a === 0 ? [a, a - b] : [a, 0, a - b] },
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
  const round = (n: number): number => Math.round(n / 10) * 10
  // Rätt svar = SAMMA metod som förklaringen lär ut (avrunda varje term, addera
  // sen). round(a+b) kunde skilja sig (15+15: metoden ger 40, round(30)=30) —
  // då motsade uppgiften sin egen förklaring och barnets korrekta överslag
  // fanns inte bland alternativen.
  const correct = round(a) + round(b)
  const distractors = uniqueDistractors(correct, [
    [round((a + b) / 2), null],
    [round((a + b) * 2), null],
    [correct + 100, 'positionsfel'],
    [Math.max(10, Math.round(correct / 10)), 'positionsfel'],
  ])
  return choiceTask({
    generatorId: id, level, seed, rng,
    prompt: `Ungefär hur mycket är ${a} + ${b}?`,
    spokenPrompt: `Ungefär hur mycket är ${a} plus ${b}?`,
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
    // Håll det påstådda svaret ≥ 0 — "har räknat a − b = −5" förvirrar i åk 3.
    const offsets = ([10, -10, 1, -1] as const).filter((o) => shown + o >= 0)
    const claimed = wrong ? shown + rng.pick(offsets) : shown
    return choiceTask({
      generatorId: id, level, seed, rng,
      prompt: `${pickName(rng)} har räknat ${a} − ${b} = ${claimed}. Kontrollera med addition: stämmer det?`,
      spokenPrompt: `Någon har räknat att ${a} minus ${b} är ${claimed}. Kontrollera med addition: stämmer det?`,
      correct: wrong ? 'Nej' : 'Ja',
      distractors: [[wrong ? 'Ja' : 'Nej', null]],
      explanation: `Kontrollen: ${claimed} + ${b} = ${claimed + b}. ${claimed + b === a ? `Det blir ${a} — svaret stämmer.` : `Det blir ${claimed + b}, inte ${a} — svaret var fel. Rätt svar är ${shown}.`}`,
    })
  }
  return choiceTask({
    generatorId: id, level, seed, rng,
    prompt: `Du har räknat ${a} − ${b} = ${shown}. Vilken kontroll visar om det stämmer?`,
    spokenPrompt: `Du har räknat att ${a} minus ${b} är ${shown}. Vilken kontroll visar om det stämmer?`,
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
    spokenPrompt: `Överslag: ungefär vad är ${Math.max(a, b)} ${isAdd ? 'plus' : 'minus'} ${Math.min(a, b)}?`,
    correct: String(correct),
    distractors,
    explanation: `Avrunda till närmaste hundratal: ${Math.max(roundedA, roundedB)} ${isAdd ? '+' : '−'} ${Math.min(roundedA, roundedB)} = ${correct}.`,
  })
})

export const TALENS_DAL_GENERATORS: TaskGenerator[] = [
  talrad0100,
  antal010, talrad020, delaUppTal, talkamrater10,
  addition010, subtraktion010, addSub010,
  addition020, subtraktion020, addSub020,
  tiotalsovergang, positionssystem100,
  addSub0100, vaxling0100, addSub01000, storaTal, negativaTal,
  rimlighet, kontrollMotsatt, overslagsrakning,
]
