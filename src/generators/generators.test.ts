import { afterEach, describe, expect, it } from 'vitest'
import type { DifficultyLevel } from '../domain/types'
import { allGeneratorIds, generateTask } from './index'
import { pickName, pickTwoNames, resetNamePool, setNamePool } from './helpers'
import { createRng } from './rng'
import { BODY_FACTS, MIRROR_FACTS } from './formernas-berg'

/**
 * Fuzz-test av samtliga generatorer: alla nivåer, många frön.
 * Fångar ogiltiga uppgifter (dubbla rätta svar, NaN, tomma val)
 * innan något barn någonsin ser dem.
 */
describe('uppgiftsgeneratorerna', () => {
  const LEVELS: DifficultyLevel[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  const SEEDS = Array.from({ length: 25 }, (_, i) => i * 7919 + 1)

  for (const id of allGeneratorIds()) {
    it(`${id}: giltiga uppgifter på alla nivåer`, () => {
      for (const level of LEVELS) {
        for (const seed of SEEDS) {
          const task = generateTask(id, level, seed)
          expect(task.prompt.length, `${id} n${level} f${seed}: tom prompt`).toBeGreaterThan(0)
          expect(task.explanation.length).toBeGreaterThan(0)

          if (task.answer.kind === 'numeric') {
            expect(Number.isFinite(task.answer.value), `${id} n${level} f${seed}: NaN-svar`).toBe(true)
          } else {
            const correct = task.answer.choices.filter((c) => c.correct)
            expect(correct.length, `${id} n${level} f${seed}: exakt ett rätt svar`).toBe(1)
            expect(task.answer.choices.length, `${id} n${level} f${seed}: minst två val`).toBeGreaterThanOrEqual(2)
            const texts = task.answer.choices.map((c) => c.text)
            expect(new Set(texts).size, `${id} n${level} f${seed}: dubblettval: ${texts.join(' | ')}`).toBe(texts.length)
          }

          // Bild-mot-uppgift: en tvågrupps-tiobasbild måste visa RÄTT räknesätt.
          // (Buggen: subtraktion visade två grupper med "+" → såg ut som addition.)
          if (task.visual.kind === 'tiobas' && task.visual.groups.length === 2) {
            const op = task.visual.op ?? '+'
            if (/\d − \d/.test(task.prompt)) {
              expect(op, `${id} n${level} f${seed}: subtraktion men bilden visar addition`).toBe('−')
            }
            if (/\d \+ \d/.test(task.prompt)) {
              expect(op, `${id} n${level} f${seed}: addition men bilden visar minus`).toBe('+')
            }
          }
        }
      }
    })
  }

  it('samma frö ger samma uppgift (reproducerbarhet)', () => {
    const a = generateTask('gen.vaxling-0-100', 5, 12345)
    const b = generateTask('gen.vaxling-0-100', 5, 12345)
    expect(a).toEqual(b)
  })

  it('textuppgifter motsäger sig aldrig: samma namn "har" aldrig två olika antal', () => {
    // Buggen (foto från Edward): "Vera har 7 bullar … Vera har 19 bullar" —
    // den överflödiga informationen drog samma namn som huvudpersonen.
    const NAME_HAR = /(\p{L}+) har (\d+)/gu
    for (const id of allGeneratorIds()) {
      for (const level of [8, 9, 10] as DifficultyLevel[]) {
        for (const seed of SEEDS) {
          const prompt = generateTask(id, level, seed).prompt
          const owners = [...prompt.matchAll(NAME_HAR)].map((m) => m[1])
          expect(new Set(owners).size, `${id} n${level} f${seed}: "${prompt}"`).toBe(owners.length)
        }
      }
    }
  })

  it('rena add/sub-noder ger BARA sitt räknesätt (memoreringsordningen)', () => {
    for (const seed of SEEDS) {
      for (const level of [1, 2, 3, 4, 5] as DifficultyLevel[]) {
        for (const id of ['gen.addition-0-10', 'gen.addition-0-20']) {
          const p = generateTask(id, level, seed).prompt
          expect(p, `${id} f${seed}: ska vara addition`).toContain('+')
          expect(p, `${id} f${seed}: ska inte innehålla minus`).not.toContain('−')
        }
        for (const id of ['gen.subtraktion-0-10', 'gen.subtraktion-0-20']) {
          const p = generateTask(id, level, seed).prompt
          expect(p, `${id} f${seed}: ska vara subtraktion`).toContain('−')
          expect(p, `${id} f${seed}: ska inte innehålla plus`).not.toContain('+')
        }
      }
    }
  })

  it('procent-intro: begripligt för de lägre nivåerna (heltal ≤ n6, bild ≤ n4)', () => {
    // Edward fastnade på procent: appen gav stora tal utan bild redan från start.
    // CRA-trappan garanterar heltalssvar t.o.m. nivå 6 och en bild t.o.m. nivå 4.
    for (const seed of SEEDS) {
      for (const level of [1, 2, 3, 4, 5, 6] as DifficultyLevel[]) {
        const task = generateTask('gen.procent-intro', level, seed)
        if (task.answer.kind === 'numeric') {
          expect(Number.isInteger(task.answer.value), `n${level} f${seed}: heltalssvar väntat, fick ${task.answer.value}`).toBe(true)
        }
        if (level <= 4) {
          expect(task.visual.kind, `n${level} f${seed}: bild krävs på nivå ≤ 4`).not.toBe('ingen')
        }
      }
    }
  })

  it('diagram-etapp A: heltal ≥ 0, unika etiketter, bild finns (nivå ≤ 3)', () => {
    // Statistikmomenten (docs/SPEC-GEOMETRI.md etapp A): avläsningsvärden och
    // skillnads-/summasvar ska alltid vara heltal ≥ 0, kategorietiketterna
    // unika, och de lägsta nivåerna alltid ha en bild att läsa av.
    const ids = ['gen.sortera-tabeller', 'gen.stapeldiagram', 'gen.diagram-lasa']
    for (const id of ids) {
      for (const level of LEVELS) {
        for (const seed of SEEDS) {
          const task = generateTask(id, level, seed)
          if (task.answer.kind === 'numeric') {
            expect(Number.isInteger(task.answer.value), `${id} n${level} f${seed}: heltalssvar`).toBe(true)
            expect(task.answer.value, `${id} n${level} f${seed}: svar ≥ 0`).toBeGreaterThanOrEqual(0)
          }
          if (task.visual.kind === 'stapel') {
            const labels = task.visual.categories.map((c) => c.label)
            expect(new Set(labels).size, `${id} n${level} f${seed}: unika kategorier`).toBe(labels.length)
            task.visual.categories.forEach((c) =>
              expect(Number.isInteger(c.value) && c.value >= 0, `${id} n${level} f${seed}: stapelvärde`).toBe(true))
            // Piktogram på de lägsta nivåerna: räknebart med finger (≤ 8).
            if (task.visual.pictogram && level <= 3) {
              task.visual.categories.forEach((c) =>
                expect(c.value, `${id} n${level} f${seed}: piktogramrad ≤ 8`).toBeLessThanOrEqual(8))
            }
          }
          if (task.visual.kind === 'linje') {
            task.visual.points.forEach((p) =>
              expect(Number.isInteger(p.value) && p.value >= 0, `${id} n${level} f${seed}: linjevärde`).toBe(true))
          }
          // Nivå ≤ 3 ska alltid ha en bild att läsa av.
          if (level <= 3) {
            expect(task.visual.kind, `${id} n${level} f${seed}: bild krävs`).not.toBe('ingen')
          }
        }
      }
    }
  })

  it('diagram-etapp A (fix-1 A3/A4): staplar och punkter landar på gridlinjer', () => {
    // A3/A4: ett värde som inte är en multipel av skalsteget slutar MELLAN två
    // gridlinjer → avläsningen blir omöjlig (ren gissning). Varje stapel-/
    // linjevärde måste därför vara en multipel av det skalsteg som ritas.
    for (const id of ['gen.stapeldiagram', 'gen.diagram-lasa']) {
      for (const level of LEVELS) {
        for (const seed of SEEDS) {
          const task = generateTask(id, level, seed)
          if (task.visual.kind === 'stapel') {
            const step = task.visual.yStep ?? 1
            task.visual.categories.forEach((c) =>
              expect(c.value % step, `${id} n${level} f${seed}: stapel ${c.value} ∉ gridlinje (steg ${step})`).toBe(0))
          }
          if (task.visual.kind === 'linje') {
            // Renderarens effektiva steg: generatorns fält om satt, annars heuristik.
            const maxV = Math.max(...task.visual.points.map((p) => p.value), 1)
            const step = task.visual.step ?? (maxV <= 10 ? 2 : maxV <= 20 ? 5 : 10)
            task.visual.points.forEach((p) =>
              expect(p.value % step, `${id} n${level} f${seed}: punkt ${p.value} ∉ gridlinje (steg ${step})`).toBe(0))
          }
        }
      }
    }
  })

  it('koordinat-etapp B: punkter i rutnätet, gitterpunkter, swap ≠ rätt svar', () => {
    // Sambandsgrottan (docs/SPEC-GEOMETRI.md etapp B): alla koordinatpunkter
    // ligger på heltalsgitter inom min..max, numeriska avläsningar är heltal,
    // och en positionsfel-distraktor (x/y-swap) sammanfaller aldrig med rätt svar.
    for (const id of ['gen.koordinatsystem', 'gen.grafer']) {
      for (const level of LEVELS) {
        for (const seed of SEEDS) {
          const task = generateTask(id, level, seed)
          if (task.visual.kind === 'koordinat') {
            const { min, max } = task.visual
            task.visual.points.forEach((p) => {
              expect(Number.isInteger(p.x) && Number.isInteger(p.y), `${id} n${level} f${seed}: heltalsgitter`).toBe(true)
              expect(p.x >= min && p.x <= max && p.y >= min && p.y <= max, `${id} n${level} f${seed}: punkt inom rutnät`).toBe(true)
            })
          }
          if (task.answer.kind === 'numeric') {
            expect(Number.isInteger(task.answer.value), `${id} n${level} f${seed}: heltalssvar`).toBe(true)
          } else {
            const correct = task.answer.choices.find((c) => c.correct)!.text
            // Ingen distraktor (positionsfel eller annan) får vara lika med rätt svar.
            task.answer.choices.filter((c) => !c.correct).forEach((c) =>
              expect(c.text, `${id} n${level} f${seed}: distraktor = rätt svar`).not.toBe(correct))
          }
        }
      }
    }
  })

  it('etapp C: facittabellerna för kroppar och spegellinjer stämmer', () => {
    // FACIT (docs/SPEC-GEOMETRI.md) — får aldrig ändras på känn.
    expect(BODY_FACTS.kub).toMatchObject({ ytor: 6, horn: 8, kanter: 12 })
    expect(BODY_FACTS.ratblock).toMatchObject({ ytor: 6, horn: 8, kanter: 12 })
    expect(BODY_FACTS.pyramid).toMatchObject({ ytor: 5, horn: 5, kanter: 8 })
    expect(BODY_FACTS.cylinder.ytor).toBe(3)
    expect(BODY_FACTS.kon.ytor).toBe(2)
    expect(BODY_FACTS.klot.ytor).toBe(1)
    // Rullbarhet: runda kroppar rullar, polyedrar inte.
    for (const b of Object.values(BODY_FACTS)) expect(b.rullar).toBe(!b.polyeder)
    // Spegellinjer: rektangelns diagonal är AVSIKTLIGT falsk; kvadratens sann.
    expect(MIRROR_FACTS.rektangel.diagonal).toBe(false)
    expect(MIRROR_FACTS.kvadrat.diagonal).toBe(true)
    expect(MIRROR_FACTS.rektangel.count).toBe(2)
    expect(MIRROR_FACTS.kvadrat.count).toBe(4)
    expect(MIRROR_FACTS.triangel.count).toBe(3)
    expect(MIRROR_FACTS.hjarta.count).toBe(1)
    for (const f of Object.values(MIRROR_FACTS)) expect(f.lodrat).toBe(true) // alla har lodrät
  })

  it('etapp C+D: vinkel/skala/ekvation ger giltiga svar', () => {
    for (const seed of SEEDS) {
      for (const level of LEVELS) {
        for (const id of ['gen.vinklar', 'gen.skala', 'gen.ekvationer-tva-steg']) {
          const task = generateTask(id, level, seed)
          if (task.answer.kind !== 'numeric') continue
          if (id === 'gen.vinklar') {
            // Summafrågor ("tre räta vinklar" = 270°, "fyra räta" = 360°) får gå
            // över 180° men aldrig över ett helt varv.
            expect(task.answer.value > 0 && task.answer.value <= 360, `${id} n${level} f${seed}: vinkel (0,360]`).toBe(true)
          }
          if (id === 'gen.ekvationer-tva-steg') {
            expect(Number.isInteger(task.answer.value) && task.answer.value > 0, `${id} n${level} f${seed}: positivt heltal`).toBe(true)
          }
          if (id === 'gen.skala' && level <= 7) {
            expect(Number.isInteger(task.answer.value), `${id} n${level} f${seed}: heltalssvar ≤ n7`).toBe(true)
          }
        }
      }
    }
  })

  it('missuppfattningskartan pekar aldrig på rätt svar', () => {
    for (const id of allGeneratorIds()) {
      for (const seed of SEEDS.slice(0, 10)) {
        const task = generateTask(id, 6, seed)
        if (task.answer.kind === 'numeric' && task.misconceptionMap) {
          for (const wrong of Object.keys(task.misconceptionMap)) {
            expect(Number(wrong), `${id} f${seed}`).not.toBe(task.answer.value)
          }
        }
      }
    }
  })
})

describe('personaliserad namnpool', () => {
  // Återställ efter varje test så fuzz-/reproducerbarhetstesten inte påverkas.
  afterEach(resetNamePool)

  it('väver in barnets eget namn oftare än enskilda generiska namn', () => {
    setNamePool('Edward', ['Nikolai', 'Albert'])
    const counts = new Map<string, number>()
    // Deterministiska frön → stabilt utfall.
    for (let seed = 1; seed <= 400; seed++) {
      const name = pickName(createRng(seed))
      counts.set(name, (counts.get(name) ?? 0) + 1)
    }
    expect(counts.get('Edward') ?? 0).toBeGreaterThan(0)
    // Eget namn ska dominera över ett enskilt generiskt namn.
    expect(counts.get('Edward') ?? 0).toBeGreaterThan(counts.get('Elsa') ?? 0)
  })

  it('pickTwoNames ger alltid två olika namn (aldrig "Edward och Edward")', () => {
    setNamePool('Edward', ['Nikolai'])
    for (let seed = 1; seed <= 200; seed++) {
      const [a, b] = pickTwoNames(createRng(seed))
      expect(a).not.toBe(b)
    }
  })

  it('resetNamePool tar bort barnens namn helt', () => {
    setNamePool('Edward', ['Nikolai', 'Albert'])
    resetNamePool()
    const seen = new Set<string>()
    for (let seed = 1; seed <= 400; seed++) seen.add(pickName(createRng(seed)))
    expect(seen.has('Edward')).toBe(false)
    expect(seen.has('Nikolai')).toBe(false)
  })

  it('hanterar tomt namn utan att krascha', () => {
    setNamePool('   ')
    expect(() => pickName(createRng(1))).not.toThrow()
    expect(pickName(createRng(1))).not.toBe('')
  })
})
