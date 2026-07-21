import type { DifficultyLevel, TaskGenerator } from '../domain/types'
import { createRng, type Rng } from './rng'
import { choiceTask, lerpInt, numericTask } from './helpers'

/* ============================================================
   Mönsterskogen — mönster, likhetstecknet, öppna utsagor, ekvationer.
   Här bor den viktigaste algebra-missuppfattningen: att "=" betyder
   "här kommer svaret" i stället för "båda sidor är lika mycket".
   ============================================================ */

const g = (
  id: string,
  fn: (level: DifficultyLevel, seed: number, rng: Rng) => ReturnType<typeof numericTask>,
): TaskGenerator => ({
  id: `gen.${id}`,
  generate: (level, seed) => fn(level, seed, createRng(seed)),
})

// ---------- Mönster (F) ----------

const monsterEnkla = g('monster-enkla', (level, seed, rng) => {
  const id = 'gen.monster-enkla'
  // Mönsterfigurer = nycklar till målade ikoner (public/art/objekt/*), ritas
  // i följd-visualiseringen och som bildval — inga emojis längre.
  const pools = [
    ['cirkel-rod', 'cirkel-bla'],
    ['stjarna-guld', 'mane'],
    ['groda', 'anka'],
    ['ruta-gul', 'ruta-gron', 'ruta-bla'],
    ['apple', 'paron', 'citron'],
  ] as const
  const pool = level <= 4 ? rng.pick(pools.slice(0, 3)) : rng.pick(pools)
  // Mönsterenhet: AB, AAB, ABB eller ABC beroende på nivå.
  const unit =
    level <= 3 ? [pool[0], pool[1]]
    : level <= 6 ? rng.pick([[pool[0], pool[0], pool[1]], [pool[0], pool[1], pool[1]]])
    : [pool[0], pool[1], pool[2] ?? pool[0], pool[1]]
  const repeats = 2
  const seq: string[] = []
  for (let i = 0; i < repeats; i++) seq.push(...unit)
  const answerIndex = seq.length % unit.length
  const correct = unit[answerIndex]
  const wrong = pool.filter((p) => p !== correct)
  return choiceTask({
    generatorId: id, level, seed, rng,
    prompt: 'Vilken figur kommer härnäst i mönstret?',
    spokenPrompt: 'Titta på mönstret. Vilken figur kommer härnäst?',
    correct,
    distractors: wrong.slice(0, 2).map((w) => [w, null] as [string, null]),
    visual: { kind: 'foljd', items: seq },
    explanation: 'Mönstret upprepar sig i samma ordning hela tiden. Titta var i rundan du är — nästa figur är den som kommer efter.',
  })
})

// ---------- Talföljder (åk 1) ----------

const talfoljder1 = g('talfoljder-1', (level, seed, rng) => {
  const id = 'gen.talfoljder-1'
  const step = level <= 3 ? rng.pick([1, 2] as const) : level <= 6 ? rng.pick([2, 5, 10] as const) : rng.pick([3, 4, -2] as const)
  const start = step > 0 ? rng.int(0, 10) : rng.int(12, 20)
  const seq = [start, start + step, start + step * 2, start + step * 3]
  return numericTask({
    generatorId: id, level, seed,
    prompt: `${seq.join(', ')}, __ — vilket tal kommer sen?`,
    spokenPrompt: `Talföljden är ${seq.join(', ')}. Vilket tal kommer sen?`,
    value: start + step * 4,
    visual: { kind: 'tallinje', min: Math.min(0, start + step * 4), max: Math.max(...seq) + Math.abs(step) + 2, marks: seq },
    explanation: step > 0
      ? `Talen ökar med ${step} varje gång: ${seq[3]} + ${step} = ${start + step * 4}.`
      : `Talen minskar med ${-step} varje gång: ${seq[3]} − ${-step} = ${start + step * 4}.`,
    // "En fel" = ±1 från RÄTT svar (start + step·4), inte från sista talet i
    // följden — annars taggades godtyckliga värden när step ≠ 1.
    misconceptions: { [start + step * 4 + 1]: 'en-fel', [start + step * 4 - 1]: 'en-fel', [seq[3]]: 'fel-raknesatt' },
  })
})

// ---------- Likhetstecknets vågskål (åk 2) ----------

const likhetstecken = g('likhetstecken', (level, seed, rng) => {
  const id = 'gen.likhetstecken'
  const max = lerpInt(level, 12, 20)
  // Klassisk form: a + b = __ + d. Den vanligaste missen: svara a + b.
  const a = rng.int(2, max - 6)
  const b = rng.int(2, Math.min(9, max - a))
  const d = rng.int(1, a + b - 1)
  const value = a + b - d
  if (level >= 8) {
    // Stjärnnivå: subtraktion på vänstersidan — vågen gäller fortfarande.
    const c = rng.int(10, max)
    const dd = rng.int(2, c - 4)
    const e = rng.int(1, c - dd - 1)
    return numericTask({
      generatorId: id, level, seed,
      prompt: `${c} − ${dd} = __ + ${e}`,
      spokenPrompt: `${c} minus ${dd} är lika med vad plus ${e}?`,
      value: c - dd - e,
      explanation: `Vänster sida är ${c - dd}. Höger sida måste bli lika: ${c - dd - e} + ${e} = ${c - dd}.`,
      misconceptions: { [c - dd]: 'likhetstecken-resultat', [c - dd - e + 1]: 'en-fel', [c - dd - e - 1]: 'en-fel' },
    })
  }
  return numericTask({
    generatorId: id, level, seed,
    prompt: `${a} + ${b} = __ + ${d}`,
    spokenPrompt: `${a} plus ${b} är lika med vad plus ${d}?`,
    value,
    explanation: `Vänster sida är ${a + b}. Höger sida måste också bli ${a + b}: ${value} + ${d} = ${a + b}. Likhetstecknet är en våg — båda sidor väger lika.`,
    misconceptions: { [a + b]: 'likhetstecken-resultat', [value + 1]: 'en-fel', [value - 1]: 'en-fel' },
  })
})

// ---------- Öppna utsagor (åk 3) ----------

const oppnaUtsagor = g('oppna-utsagor-100', (level, seed, rng) => {
  const id = 'gen.oppna-utsagor-100'
  const max = lerpInt(level, 30, 100)
  const kind = rng.pick(level >= 6 ? (['forsta', 'andra', 'mult'] as const) : (['forsta', 'andra'] as const))
  if (kind === 'mult') {
    const f = rng.int(3, 9)
    const q = rng.int(3, 12)
    return numericTask({
      generatorId: id, level, seed,
      prompt: `__ × ${f} = ${f * q}`,
      spokenPrompt: `Vad gånger ${f} blir ${f * q}?`,
      value: q,
      explanation: `Tänk baklänges med division: ${f * q} / ${f} = ${q}.`,
      misconceptions: { [f * q]: 'likhetstecken-resultat', [f * q - f]: 'fel-raknesatt' },
    })
  }
  const b = rng.int(10, max - 10)
  const c = rng.int(5, max - b)
  if (kind === 'forsta') {
    // __ − b = c  →  svar b + c
    return numericTask({
      generatorId: id, level, seed,
      prompt: `__ − ${b} = ${c}`,
      spokenPrompt: `Vad minus ${b} blir ${c}?`,
      value: b + c,
      explanation: `Det gömda talet var större: ${c} + ${b} = ${b + c}. Kontrollera: ${b + c} − ${b} = ${c}. ✓`,
      misconceptions: { [Math.abs(c - b)]: 'fel-raknesatt', [c]: 'likhetstecken-resultat' },
    })
  }
  // a − __ = c
  const a2 = b + c
  return numericTask({
    generatorId: id, level, seed,
    prompt: `${a2} − __ = ${c}`,
    spokenPrompt: `${a2} minus vad blir ${c}?`,
    value: b,
    explanation: `Hur långt är det från ${c} upp till ${a2}? ${a2} − ${c} = ${b}.`,
    misconceptions: { [a2 + c]: 'fel-raknesatt', [c]: 'likhetstecken-resultat' },
  })
})

// ---------- Mönster med regler (åk 4) ----------

const monsterRegler = g('monster-regler', (level, seed, rng) => {
  const id = 'gen.monster-regler'
  const kind = rng.pick(level >= 6 ? (['nasta', 'regel', 'langre-fram'] as const) : (['nasta', 'regel'] as const))
  const step = rng.pick([3, 4, 6, 7, 9, 11] as const)
  const start = rng.int(1, 12)
  const seq = [start, start + step, start + 2 * step, start + 3 * step]
  if (kind === 'regel') {
    return choiceTask({
      generatorId: id, level, seed, rng,
      prompt: `Vilken regel har talföljden ${seq.join(', ')} …?`,
      correct: `Öka med ${step}`,
      distractors: [
        [`Öka med ${step + 1}`, 'en-fel'],
        [`Gångra med ${step}`, 'fel-raknesatt'],
        [`Öka med ${start}`, null],
      ],
      explanation: `Skillnaden mellan talen är alltid ${step}: ${seq[0]} → ${seq[1]} → ${seq[2]} …`,
    })
  }
  if (kind === 'langre-fram') {
    // Stjärntänk: hoppa flera steg framåt utan att räkna alla.
    const pos = rng.int(6, 10)
    return numericTask({
      generatorId: id, level, seed,
      prompt: `Talföljden ${seq.join(', ')} … fortsätter likadant. Vilket tal står på plats ${pos}?`,
      value: start + (pos - 1) * step,
      explanation: `Plats ${pos} är ${pos - 1} hopp från start: ${start} + ${pos - 1} × ${step} = ${start + (pos - 1) * step}.`,
      misconceptions: { [start + pos * step]: 'en-fel' },
    })
  }
  return numericTask({
    generatorId: id, level, seed,
    prompt: `${seq.join(', ')}, __ — vad kommer sen?`,
    spokenPrompt: `Talföljden är ${seq.join(', ')}. Vad kommer sen?`,
    value: start + 4 * step,
    explanation: `Regeln är +${step}: ${seq[3]} + ${step} = ${start + 4 * step}.`,
    misconceptions: { [seq[3] + step + 1]: 'en-fel', [seq[3] + step - 1]: 'en-fel' },
  })
})

// ---------- Enkla ekvationer (åk 5) ----------

const enklaEkvationer = g('enkla-ekvationer', (level, seed, rng) => {
  const id = 'gen.enkla-ekvationer'
  const useMult = level >= 5 && rng.chance(0.4)
  if (useMult) {
    const x = rng.int(3, lerpInt(level, 9, 15))
    const k = rng.int(2, 9)
    return numericTask({
      generatorId: id, level, seed,
      prompt: `${k}x = ${k * x} — vad är x?`,
      spokenPrompt: `${k} gånger x är ${k * x}. Vad är x?`,
      value: x,
      explanation: `Dela båda sidor med ${k}: x = ${k * x} / ${k} = ${x}.`,
      misconceptions: { [k * x - k]: 'fel-raknesatt', [k * x]: 'likhetstecken-resultat' },
    })
  }
  const x = rng.int(5, lerpInt(level, 20, 60))
  const a = rng.int(3, lerpInt(level, 15, 40))
  const plus = rng.chance(0.6)
  if (level >= 8) {
    // Stjärnnivå: tvåstegsekvation (försmak av åk 6).
    const k = rng.int(2, 5)
    const m = rng.int(1, 9)
    return numericTask({
      generatorId: id, level, seed,
      prompt: `${k}x + ${m} = ${k * x + m} — vad är x?`,
      spokenPrompt: `${k} gånger x plus ${m} är ${k * x + m}. Vad är x?`,
      value: x,
      explanation: `Ta bort ${m} från båda sidor: ${k}x = ${k * x}. Dela med ${k}: x = ${x}.`,
      misconceptions: { [k * x]: 'fel-raknesatt' },
    })
  }
  return numericTask({
    generatorId: id, level, seed,
    prompt: plus ? `x + ${a} = ${x + a} — vad är x?` : `x − ${a} = ${x - a} — vad är x?`,
    spokenPrompt: plus ? `x plus ${a} är ${x + a}. Vad är x?` : `x minus ${a} är ${x - a}. Vad är x?`,
    value: x,
    explanation: plus
      ? `Ta bort ${a} från båda sidor: x = ${x + a} − ${a} = ${x}.`
      : `Lägg till ${a} på båda sidor: x = ${x - a} + ${a} = ${x}.`,
    misconceptions: { [plus ? x + a : x - a]: 'likhetstecken-resultat' },
  })
})

// ---------- Ekvationer i två steg (åk 6, etapp D) ----------
// Ingen bild — kvaliteten bor i den tvåstegsförklaringen. Svaren konstrueras
// BAKLÄNGES från x så de alltid är snälla positiva heltal.
const ekvationerTvaSteg = g('ekvationer-tva-steg', (level, seed, rng) => {
  const id = 'gen.ekvationer-tva-steg'

  if (level <= 3) {
    // Bro från förkunskapen: ett steg, små tal.
    const x = rng.int(2, 9)
    if (rng.chance(0.5)) {
      const a = rng.int(2, 9)
      return numericTask({
        generatorId: id, level, seed,
        prompt: `x + ${a} = ${x + a} — vad är x?`,
        spokenPrompt: `x plus ${a} är ${x + a}. Vad är x?`,
        value: x,
        explanation: `Ta bort ${a} från båda sidor: x = ${x + a} − ${a} = ${x}.`,
        misconceptions: { [x + a]: 'likhetstecken-resultat' },
      })
    }
    const k = rng.int(2, 5)
    return numericTask({
      generatorId: id, level, seed,
      prompt: `${k}x = ${k * x} — vad är x?`,
      spokenPrompt: `${k} gånger x är ${k * x}. Vad är x?`,
      value: x,
      explanation: `Dela båda sidor med ${k}: x = ${k * x} / ${k} = ${x}.`,
      misconceptions: { [k * x]: 'likhetstecken-resultat' },
    })
  }

  if (level <= 7) {
    // ax + b = c  eller  ax − b = c. Konstruera från x.
    const x = rng.int(2, 12)
    const a = rng.int(2, 5)
    const plus = rng.chance(0.6)
    const b = plus ? rng.int(1, 9) : rng.int(1, Math.min(9, a * x - 1))
    const c = plus ? a * x + b : a * x - b
    const mis: Record<number, 'likhetstecken-resultat' | 'fel-raknesatt'> = { [a * x]: 'likhetstecken-resultat' }
    const added = plus ? (c + b) / a : (c - b) / a // om barnet gjorde motsatt räknesätt
    if (Number.isInteger(added) && added !== x) mis[added] = 'fel-raknesatt'
    return numericTask({
      generatorId: id, level, seed,
      prompt: `${a}x ${plus ? '+' : '−'} ${b} = ${c} — vad är x?`,
      spokenPrompt: `${a} gånger x ${plus ? 'plus' : 'minus'} ${b} är ${c}. Vad är x?`,
      value: x,
      explanation: plus
        ? `Ta bort ${b} från båda sidor: ${a}x = ${a * x}. Dela båda sidor med ${a}: x = ${x}.`
        : `Lägg till ${b} på båda sidor: ${a}x = ${a * x}. Dela båda sidor med ${a}: x = ${x}.`,
      misconceptions: mis,
    })
  }

  // Nivå 8–10: textform, samt (nivå 10) x på båda sidor.
  if (level >= 10 && rng.chance(0.5)) {
    const x = rng.int(3, 9)
    const b1 = rng.int(2, 8)
    // 2x + b1 = x + (x + b1)  →  x
    return numericTask({
      generatorId: id, level, seed,
      prompt: `2x + ${b1} = x + ${x + b1} — vad är x?`,
      spokenPrompt: `2 gånger x plus ${b1} är lika med x plus ${x + b1}. Vad är x?`,
      value: x,
      explanation: `Ta bort x från båda sidor: x + ${b1} = ${x + b1}. Ta bort ${b1}: x = ${x}.`,
      misconceptions: { [x + b1]: 'likhetstecken-resultat' },
    })
  }
  // Textform: startavgift + styckpris.
  const penna = rng.int(2, 9)
  const a = rng.int(2, 4)
  const b = rng.int(2, 6)
  const c = a * penna + b
  return numericTask({
    generatorId: id, level, seed,
    prompt: `Ali köper ${a} pennor och betalar ${b} kr för en påse. Allt kostar ${c} kr. Vad kostar en penna?`,
    value: penna, unit: 'kr',
    explanation: `Pennorna kostar ${c} − ${b} = ${a * penna} kr. En penna: ${a * penna} / ${a} = ${penna} kr.`,
    misconceptions: { [a * penna]: 'likhetstecken-resultat', [c]: 'fel-raknesatt' },
  })
})

export const MONSTERSKOGEN_GENERATORS: TaskGenerator[] = [
  monsterEnkla, talfoljder1, likhetstecken, oppnaUtsagor, monsterRegler, enklaEkvationer, ekvationerTvaSteg,
]
