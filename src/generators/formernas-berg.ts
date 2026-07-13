import type { DifficultyLevel, TaskGenerator } from '../domain/types'
import { createRng, type Rng } from './rng'
import { choiceTask, lerpInt, numericTask } from './helpers'

/* ============================================================
   Formernas berg — former, klockan, mätning, omkrets och area.
   ============================================================ */

const g = (
  id: string,
  fn: (level: DifficultyLevel, seed: number, rng: Rng) => ReturnType<typeof numericTask>,
): TaskGenerator => ({
  id: `gen.${id}`,
  generate: (level, seed) => fn(level, seed, createRng(seed)),
})

// ---------- Formerna (F) ----------

const former2d = g('former-2d', (level, seed, rng) => {
  const id = 'gen.former-2d'
  const shapes = [
    { name: 'cirkel', emoji: '⚪', corners: 0, sides: 0 },
    { name: 'triangel', emoji: '🔺', corners: 3, sides: 3 },
    { name: 'kvadrat', emoji: '🟥', corners: 4, sides: 4 },
    { name: 'rektangel', emoji: '▭', corners: 4, sides: 4 },
    { name: 'femhörning', emoji: '⬠', corners: 5, sides: 5 },
    { name: 'sexhörning', emoji: '⬡', corners: 6, sides: 6 },
  ] as const
  const pool = level <= 4 ? shapes.slice(0, 4) : shapes
  const shape = rng.pick(pool)
  if (level >= 6 || (shape.corners > 0 && rng.chance(0.5))) {
    const target = rng.pick(pool.filter((s) => s.corners > 0))
    return choiceTask({
      generatorId: id, level, seed, rng,
      prompt: `Vilken form har ${target.corners} hörn?`,
      correct: `${target.emoji} ${target.name}`,
      distractors: pool
        .filter((s) => s.name !== target.name && s.corners !== target.corners)
        .slice(0, 3)
        .map((s) => [`${s.emoji} ${s.name}`, null] as [string, null]),
      explanation: `En ${target.name} har ${target.corners} hörn och ${target.sides} sidor.`,
    })
  }
  return choiceTask({
    generatorId: id, level, seed, rng,
    prompt: `Vad heter formen ${shape.emoji}?`,
    correct: shape.name,
    distractors: pool
      .filter((s) => s.name !== shape.name)
      .slice(0, 3)
      .map((s) => [s.name, null] as [string, null]),
    explanation: `${shape.emoji} är en ${shape.name}.`,
  })
})

// ---------- Klockan ----------

const klockText = (h: number, m: number): string => {
  const names = ['tolv', 'ett', 'två', 'tre', 'fyra', 'fem', 'sex', 'sju', 'åtta', 'nio', 'tio', 'elva'] as const
  const hh = names[h % 12]
  const next = names[(h + 1) % 12]
  if (m === 0) return `klockan ${hh}`
  if (m === 30) return `halv ${next}`
  if (m === 15) return `kvart över ${hh}`
  if (m === 45) return `kvart i ${next}`
  if (m < 30) return `${m} över ${hh}`
  return `${60 - m} i ${next}`
}

function makeKlocka(momentId: string, minutePool: (level: DifficultyLevel, rng: Rng) => number): TaskGenerator {
  const id = `gen.${momentId}`
  return {
    id,
    generate: (level, seed) => {
      const rng = createRng(seed)
      const h = rng.int(1, 12)
      const m = minutePool(level, rng)
      const correct = klockText(h, m)
      // Distraktorer: klassiska avläsningsfel.
      const wrongs = [
        klockText(h, (m + 30) % 60), // halv/hel förväxlat
        klockText((h + 1) % 12 || 12, m), // fel timme
        klockText(h, (60 - m) % 60), // "över" och "i" förväxlat
      ].filter((w) => w !== correct)
      return choiceTask({
        generatorId: id, level, seed, rng,
        prompt: 'Vad är klockan?',
        correct,
        distractors: [...new Set(wrongs)].slice(0, 3).map((w) => [w, null] as [string, null]),
        visual: { kind: 'klocka', hours: h, minutes: m },
        explanation: `Den korta visaren pekar på timmen, den långa på minuterna: ${correct}.`,
      })
    },
  }
}

const klockanHelHalv = makeKlocka('klockan-hel-halv', (level, rng) =>
  level <= 4 ? 0 : rng.pick([0, 30] as const),
)
const klockanKvart = makeKlocka('klockan-kvart', (level, rng) =>
  level <= 3 ? rng.pick([0, 30] as const) : rng.pick([0, 15, 30, 45] as const),
)
const klockanMinuter = makeKlocka('klockan-minuter', (level, rng) =>
  level <= 3 ? rng.pick([5, 10, 20, 25] as const) : rng.pick([5, 10, 20, 25, 35, 40, 50, 55] as const),
)

// ---------- Mäta längd (åk 2) ----------

const matningLangd = g('matning-langd', (level, seed, rng) => {
  const id = 'gen.matning-langd'
  if (level >= 6) {
    const mm = rng.pick([0, 5] as const)
    const cm = rng.int(2, 30)
    const kind = rng.pick(['cm-mm', 'm-cm-blandat'] as const)
    if (kind === 'cm-mm') {
      return numericTask({
        generatorId: id, level, seed,
        prompt: `Hur många millimeter är ${cm} cm${mm ? ` och ${mm} mm` : ''}?`,
        value: cm * 10 + mm,
        unit: 'mm',
        explanation: `1 cm = 10 mm, så ${cm} cm = ${cm * 10} mm${mm ? ` — plus ${mm} mm = ${cm * 10 + mm} mm` : ''}.`,
        misconceptions: { [cm + mm]: 'enhet-fel', [cm * 100 + mm]: 'enhet-fel' },
      })
    }
    const meters = rng.int(1, 5)
    const extraCm = rng.int(5, 95)
    return numericTask({
      generatorId: id, level, seed,
      prompt: `Ett rep är ${meters} m och ${extraCm} cm. Hur många centimeter är det?`,
      value: meters * 100 + extraCm,
      unit: 'cm',
      explanation: `1 m = 100 cm: ${meters} m = ${meters * 100} cm, plus ${extraCm} cm = ${meters * 100 + extraCm} cm.`,
      misconceptions: { [meters * 10 + extraCm]: 'enhet-fel', [meters + extraCm]: 'enhet-fel' },
    })
  }
  const m = rng.int(1, lerpInt(level, 3, 9))
  return numericTask({
    generatorId: id, level, seed,
    prompt: `Hur många centimeter är ${m} meter?`,
    value: m * 100,
    unit: 'cm',
    explanation: `1 meter = 100 centimeter, så ${m} m = ${m * 100} cm.`,
    misconceptions: { [m * 10]: 'enhet-fel', [m * 1000]: 'enhet-fel' },
  })
})

// ---------- Omkrets (åk 4) ----------

const omkrets = g('omkrets', (level, seed, rng) => {
  const id = 'gen.omkrets'
  const w = rng.int(2, lerpInt(level, 8, 20))
  const h = rng.int(2, lerpInt(level, 6, 15))
  if (level >= 8 && rng.chance(0.5)) {
    // Baklänges: given omkrets, hitta saknad sida.
    const o = 2 * (w + h)
    return numericTask({
      generatorId: id, level, seed,
      prompt: `En rektangel har omkretsen ${o} cm. Ena sidan är ${w} cm. Hur lång är den andra sidan?`,
      value: h,
      unit: 'cm',
      visual: { kind: 'rektangel', w, h: 0, unit: 'cm' },
      explanation: `Två sidor à ${w} cm tar ${2 * w} cm. Kvar: ${o} − ${2 * w} = ${o - 2 * w} cm på två sidor, alltså ${h} cm var.`,
      misconceptions: { [o - w]: 'fel-raknesatt', [o - 2 * w]: 'fel-raknesatt' },
    })
  }
  return numericTask({
    generatorId: id, level, seed,
    prompt: `En rektangel är ${w} cm bred och ${h} cm hög. Vad är omkretsen?`,
    value: 2 * (w + h),
    unit: 'cm',
    visual: { kind: 'rektangel', w, h, unit: 'cm' },
    explanation: `Runt hela: ${w} + ${h} + ${w} + ${h} = ${2 * (w + h)} cm.`,
    misconceptions: { [w * h]: 'fel-raknesatt', [w + h]: 'fel-raknesatt' },
  })
})

// ---------- Area (åk 5) ----------

const area = g('area', (level, seed, rng) => {
  const id = 'gen.area'
  const w = rng.int(2, lerpInt(level, 8, 20))
  const h = rng.int(2, lerpInt(level, 5, 15))
  if (level >= 7 && rng.chance(0.4)) {
    // Triangel = halva rektangeln.
    const base = w % 2 === 0 ? w : w + 1
    return numericTask({
      generatorId: id, level, seed,
      prompt: `En triangel har basen ${base} cm och höjden ${h} cm. Vad är arean?`,
      value: (base * h) / 2,
      unit: 'cm²',
      explanation: `Triangeln är en halv rektangel: ${base} × ${h} / 2 = ${(base * h) / 2} cm².`,
      misconceptions: { [base * h]: 'fel-raknesatt', [base + h]: 'fel-raknesatt' },
    })
  }
  return numericTask({
    generatorId: id, level, seed,
    prompt: `En rektangel är ${w} cm bred och ${h} cm hög. Vad är arean?`,
    value: w * h,
    unit: 'cm²',
    visual: { kind: 'rektangel', w, h, unit: 'cm' },
    explanation: `Arean är ytan innanför: ${w} × ${h} = ${w * h} cm². (Omkretsen hade varit ${2 * (w + h)} cm — blanda inte ihop dem!)`,
    misconceptions: { [2 * (w + h)]: 'fel-raknesatt', [w + h]: 'fel-raknesatt' },
  })
})

export const FORMERNAS_BERG_GENERATORS: TaskGenerator[] = [
  former2d, klockanHelHalv, klockanKvart, klockanMinuter, matningLangd, omkrets, area,
]
