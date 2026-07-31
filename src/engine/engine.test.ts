import { describe, expect, it } from 'vitest'
import type { ChildProfile, SkillState } from '../domain/types'
import { MOMENTS, momentById, momentsInWorld } from '../domain/curriculum'
import { WORLDS } from '../domain/worlds'
import { hasGenerator } from '../generators'
import { expectedSuccess, practiceLevel, updateRating, variedLevel } from './rating'
import { REVIEW_INTERVALS_DAYS, scheduleFirstReview, scheduleNextReview } from './spaced-repetition'
import { applyAnswer, classifyError, hotStreakBonus, newSkillState, recomputeAvailability, repairDiagnosisBossReady, currentMomentId, pendingGuardianYear, trophyBossWorldId, worldMomentsComplete, genMomentIdsInYear, yearMomentsComplete, grantedYears } from './progress'
import { practiceLevel as practiceLevelFor } from './rating'
import { applyDiagnosisResult, diagnosisBackbone, searchState, startIndexForYear } from './diagnosis'
import { composeCheckTasks, composeWorldBossTasks, composeGuardianTasks, composeStarTasks, taskForPart, CHECK_TASK_COUNT, WORLDBOSS_TASK_COUNT } from './session'
import { rewardProgress, updateStreak } from './rewards'
import { BLIXT_TESTS, blixtTask, blixtUnlocked, blixtLevel, blixtTier, blixtMaxTier, blixtTimed, BLIXT_GATE, blixtBlockedMoments, pendingBlixtKind } from './blixt'
import { backfillSplitAddSub, backfillSeenWorlds } from './progress'

const makeProfile = (overrides: Partial<ChildProfile> = {}): ChildProfile => {
  const skills: Record<string, SkillState> = {}
  for (const m of MOMENTS) skills[m.id] = newSkillState(m.id)
  return {
    id: 'test', name: 'Test', color: '#000', birthYear: 2017, schoolYear: '2',
    createdAt: '2026-01-01T00:00:00Z',
    skills: recomputeAvailability(skills),
    answers: [],
    diagnosis: { passesDone: 0, passesTotal: 2, done: false, probes: [] },
    dailyLimitMinutes: 20, usageSeconds: {}, chatEnabled: false,
    streak: { days: 0, lastActiveDate: '' },
    ...overrides,
  }
}

describe('adaptiv rating', () => {
  it('rätt svar höjer, fel sänker', () => {
    expect(updateRating(500, 20, 5, true)).toBeGreaterThan(500)
    expect(updateRating(500, 20, 5, false)).toBeLessThan(500)
  })

  it('siktar på ~70 % lyckandegrad', () => {
    for (const rating of [200, 400, 600, 800]) {
      const level = practiceLevel(rating)
      expect(expectedSuccess(rating, level)).toBeGreaterThanOrEqual(0.7)
    }
  })
})

describe('spaced repetition', () => {
  it('intervallen växer', () => {
    let review = scheduleFirstReview('2026-01-01')
    expect(review.intervalDays).toBe(REVIEW_INTERVALS_DAYS[0])
    review = scheduleNextReview(review, '2026-01-04')
    expect(review.intervalDays).toBe(REVIEW_INTERVALS_DAYS[1])
  })
})

describe('förkunskapslåset', () => {
  it('grundmomenten är öppna, senare är låsta', () => {
    const profile = makeProfile()
    expect(profile.skills['antal-0-10'].mastery).toBe('available')
    expect(profile.skills['vaxling-0-100'].mastery).toBe('locked')
  })
})

describe('kalibrering för starka elever', () => {
  it('frontmomentet efter diagnos startar på nivå 5 (inte mjukstartsnivå)', () => {
    // Rating 550 sätts av applyDiagnosisResult — verifiera nivåmappningen.
    expect(practiceLevelFor(550)).toBe(5)
  })

  it('het hand ger accelererande bonus, inget vid korta sviter', () => {
    expect(hotStreakBonus(1)).toBe(0)
    expect(hotStreakBonus(2)).toBe(0)
    expect(hotStreakBonus(3)).toBe(6)
    expect(hotStreakBonus(5)).toBe(18)
    expect(hotStreakBonus(8)).toBe(24) // tak
  })

  it('rättsvit klättrar snabbare än utan streak', () => {
    const base = newSkillState('x')
    const task = { ref: { generatorId: 'gen.x', level: 5 as const, seed: 1 }, prompt: '', visual: { kind: 'ingen' as const }, answer: { kind: 'numeric' as const, value: 1 }, explanation: '' }
    let withStreak = { ...base }
    let without = { ...base }
    for (let i = 1; i <= 6; i++) {
      withStreak = applyAnswer(withStreak, task, true, 5000, 'ovning', '2026-01-01T10:00:00Z', undefined, undefined, i).skill
      without = applyAnswer(without, task, true, 5000, 'ovning', '2026-01-01T10:00:00Z').skill
    }
    expect(withStreak.rating).toBeGreaterThan(without.rating + 30)
  })
})

describe('vägen tillbaka efter missad repetition', () => {
  it('needs-review kan nå boss-ready igen (fastnar inte i evig omträning)', () => {
    let skill: SkillState = {
      ...newSkillState('vaxling-0-100'),
      mastery: 'needs-review',
      rating: 615,
      attempts: 25,
      correct: 18,
    }
    const task = { ref: { generatorId: 'gen.vaxling-0-100', level: 6 as const, seed: 1 }, prompt: '', visual: { kind: 'ingen' as const }, answer: { kind: 'numeric' as const, value: 1 }, explanation: '' }
    // Några rätta svar ska lyfta ratingen över bossgränsen och öppna striden.
    for (let i = 0; i < 5 && skill.mastery !== 'boss-ready'; i++) {
      skill = applyAnswer(skill, task, true, 5000, 'ovning', '2026-01-01T10:00:00Z').skill
    }
    expect(skill.mastery).toBe('boss-ready')
  })
})

describe('slarvfelsklassning', () => {
  it('snabbt ±1-fel på hög nivå är slarv, långsamt fel är kunskapslucka', () => {
    const strong: SkillState = { ...newSkillState('x'), rating: 800 }
    expect(classifyError(strong, 4, 3000, 'en-fel')).toBe('slarv')
    const weak: SkillState = { ...newSkillState('x'), rating: 300 }
    expect(classifyError(weak, 5, 40000, 'glomd-vaxling')).toBe('kunskap')
  })
})

describe('startdiagnosen', () => {
  it('startindex följer skolåret', () => {
    const backbone = diagnosisBackbone()
    expect(startIndexForYear('F', backbone)).toBe(0)
    expect(startIndexForYear('4', backbone)).toBeGreaterThan(startIndexForYear('2', backbone))
  })

  it('trappstegsmetoden hittar taket och sätter startläget (robust mot ett slarvfel)', () => {
    const profile = makeProfile()
    const backbone = diagnosisBackbone()
    // Barn som klarar de första 8 momenten men inte moment 8 och uppåt.
    const canDo = new Set(backbone.slice(0, 8))
    let guard = 0
    let injectedSlip = false
    for (;;) {
      const s = searchState(profile.diagnosis, backbone, profile.schoolYear)
      if (s.converged) break
      const momentId = backbone[s.nextIndex]
      let correct = canDo.has(momentId)
      // Ett enda slarvfel lågt ner ska INTE kollapsa skattningen.
      if (correct && !injectedSlip && profile.diagnosis.probes.length === 2) { correct = false; injectedSlip = true }
      profile.diagnosis.probes.push({ momentId, correct, level: 5 })
      if (++guard > 80) throw new Error('konvergerar inte')
    }

    const skills = applyDiagnosisResult(profile, '2026-01-01')
    // Fronten hamnar nära den verkliga gränsen (index 8) trots slarvfelet.
    const frontierIdx = backbone.findIndex((id) => skills[id].mastery === 'in-progress')
    expect(frontierIdx).toBeGreaterThanOrEqual(6)
    expect(frontierIdx).toBeLessThanOrEqual(10)
    // Moment klart under fronten → behärskade, med repetitionsschema.
    expect(skills[backbone[2]].mastery).toBe('mastered')
    expect(skills[backbone[0]].review).toBeDefined()
  })

  it('starkt barn (klarar allt) placeras överst — inte för lätt', () => {
    const profile = makeProfile()
    const backbone = diagnosisBackbone()
    let guard = 0
    for (;;) {
      const s = searchState(profile.diagnosis, backbone, profile.schoolYear)
      if (s.converged) break
      profile.diagnosis.probes.push({ momentId: backbone[s.nextIndex], correct: true, level: 5 })
      if (++guard > 80) throw new Error('tak: konvergerar inte')
    }
    const skills = applyDiagnosisResult(profile, '2026-01-01')
    expect(backbone.findIndex((id) => skills[id].mastery === 'in-progress')).toBe(backbone.length - 1)
  })

  it('barn som inte klarar ens det lättaste placeras längst ner (grinder inte 10 min)', () => {
    const profile = makeProfile()
    const backbone = diagnosisBackbone()
    let guard = 0
    for (;;) {
      const s = searchState(profile.diagnosis, backbone, profile.schoolYear)
      if (s.converged) break
      profile.diagnosis.probes.push({ momentId: backbone[s.nextIndex], correct: false, level: 5 })
      if (++guard > 80) throw new Error('golv: konvergerar inte')
    }
    expect(guard).toBeLessThan(20) // golvet upptäcks snabbt
    const skills = applyDiagnosisResult(profile, '2026-01-01')
    expect(backbone.findIndex((id) => skills[id].mastery === 'in-progress')).toBe(0)
  })

  it('reparerar gamla profiler: diagnos-bossar (boss-ready utan träning) → mastered', () => {
    const skills: Record<string, SkillState> = {
      diag: { ...newSkillState('diag'), mastery: 'boss-ready', rating: 700, attempts: 0 },
      real: { ...newSkillState('real'), mastery: 'boss-ready', rating: 640, attempts: 14 },
      prog: { ...newSkillState('prog'), mastery: 'in-progress', rating: 550, attempts: 3 },
    }
    const out = repairDiagnosisBossReady(skills, '2026-01-01')
    // Diagnos-skapad boss (0 försök) läks till behärskad med repetition.
    expect(out.diag.mastery).toBe('mastered')
    expect(out.diag.review).toBeDefined()
    // Legitimt framtränad boss (≥12 försök) och pågående moment lämnas orörda.
    expect(out.real.mastery).toBe('boss-ready')
    expect(out.prog.mastery).toBe('in-progress')
  })
})

describe('årsgrinden (Expeditionsmodellen): Årsväktaren öppnar nästa årskurs', () => {
  /** Behärska alla tränbara moment i de angivna årskurserna. */
  const masterYears = (profile: ChildProfile, years: string[]): void => {
    for (const m of MOMENTS) {
      if (years.includes(m.year) && hasGenerator(m.generatorId)) {
        profile.skills[m.id] = { ...profile.skills[m.id], mastery: 'mastered', rating: 700 }
      }
    }
  }
  /** Alla blixtar klarade — så flyt-grinden inte blandar sig i årstesterna. */
  const allBlixtCleared = { 'add-sub-0-10': { best: 20, lastAt: '', cleared: true }, 'add-sub-0-20': { best: 20, lastAt: '', cleared: true }, tabeller: { best: 20, lastAt: '', cleared: true } } as ChildProfile['blixt']

  it('år F klart men väktaren kvar → väktaren väntar, inget moment att träna, åk 1 låst', () => {
    const profile = makeProfile({ blixt: allBlixtCleared })
    masterYears(profile, ['F'])
    profile.skills = recomputeAvailability(profile.skills, []) // ingen väktare besegrad
    expect(yearMomentsComplete(profile.skills, 'F')).toBe(true)
    // Väktaren är nästa steg — vi hoppar INTE vidare in i åk 1.
    expect(pendingGuardianYear(profile)).toBe('F')
    expect(currentMomentId(profile)).toBeUndefined()
    // Ett åk 1-moment med alla förkunskaper i F hålls låst av årsgrinden.
    const gated = MOMENTS.find((m) => m.year === '1' && hasGenerator(m.generatorId) &&
      m.prerequisites.every((p) => momentById(p).year === 'F'))
    expect(gated, 'testet behöver ett F-grindat åk 1-moment').toBeDefined()
    expect(profile.skills[gated!.id].mastery).toBe('locked')
  })

  it('besegrad väktare → nästa årskurs öppnas och blir aktuell', () => {
    const profile = makeProfile({ blixt: allBlixtCleared, conqueredYears: ['F'] })
    masterYears(profile, ['F'])
    profile.skills = recomputeAvailability(profile.skills, ['F'])
    expect(pendingGuardianYear(profile)).toBeUndefined()
    const next = currentMomentId(profile)
    expect(next).toBeDefined()
    expect(momentById(next!).year).toBe('1')
  })

  it('Nikolai-scenariot: dalen klar t.o.m. åk 2 + 0–1000 påbörjat → rekommendationen lämnar 0–1000 och öppnar åk 2 (multiplikation)', () => {
    // Läget som föranledde modellbytet: diagnos+träning hade behärskat F–åk 2 i
    // Urtalens dal och motorn matade vidare UPPÅT i dalen (0–1000 = åk 3) i
    // stället för åk 2-innehållet i nästa värld (gånger = åk 2 VT!).
    const profile = makeProfile({ blixt: allBlixtCleared, conqueredYears: ['F', '1'] })
    masterYears(profile, ['F', '1'])
    for (const id of ['positionssystem-100', 'add-sub-0-100', 'vaxling-0-100', 'rimlighet']) {
      profile.skills[id] = { ...profile.skills[id], mastery: 'mastered', rating: 700 }
    }
    // 0–1000 (åk 3) hann påbörjas under den gamla modellen.
    profile.skills['add-sub-0-1000'] = { ...profile.skills['add-sub-0-1000'], mastery: 'in-progress', rating: 500, attempts: 9 }
    profile.skills = recomputeAvailability(profile.skills, profile.conqueredYears)

    // Multiplikationen (åk 2 VT) är UPPLÅST trots att dalen inte är färdig.
    expect(profile.skills['mult-intro'].mastery).toBe('available')
    // Rekommendationen pekar på ett åk 2-moment — aldrig på 0–1000 (åk 3).
    const next = currentMomentId(profile)
    expect(next).toBeDefined()
    expect(next).not.toBe('add-sub-0-1000')
    expect(momentById(next!).year).toBe('2')
    // Det påbörjade åk 3-momentet förstörs inte — det väntar bara på sitt år.
    expect(profile.skills['add-sub-0-1000'].mastery).toBe('in-progress')
  })

  it('grinden gäller bakåt: diagnosplacerat barn möter väktarna för redan klarade år', () => {
    const profile = makeProfile({ blixt: allBlixtCleared }) // inga erövrade år
    masterYears(profile, ['F', '1'])
    profile.skills = recomputeAvailability(profile.skills, [])
    // F är först i kön — väktarna tas i ordning.
    expect(pendingGuardianYear(profile)).toBe('F')
    expect(currentMomentId(profile)).toBeUndefined()
  })

  it('ingen återvändsgränd: i varje årsläge finns ett nästa steg (moment, väktare eller blixt)', () => {
    const years = ['F', '1', '2', '3', '4', '5', '6']
    for (let k = 0; k < years.length; k++) {
      // Åren före k är behärskade + erövrade; år k är delvis/inte påbörjat.
      const conquered = years.slice(0, k) as ChildProfile['conqueredYears']
      const profile = makeProfile({ conqueredYears: conquered })
      masterYears(profile, years.slice(0, k))
      profile.skills = recomputeAvailability(profile.skills, conquered, blixtBlockedMoments(profile))
      const step = currentMomentId(profile) ?? pendingGuardianYear(profile) ?? pendingBlixtKind(profile)
      expect(step, `år ${years[k]}: inget nästa steg`).toBeDefined()
    }
    // Allt behärskat + alla väktare tagna → färdigspelat (inget steg, ingen krasch).
    const done = makeProfile({ blixt: allBlixtCleared, conqueredYears: years as ChildProfile['conqueredYears'] })
    masterYears(done, years)
    done.skills = recomputeAvailability(done.skills, done.conqueredYears)
    expect(currentMomentId(done)).toBeUndefined()
    expect(pendingGuardianYear(done)).toBeUndefined()
  })

  it('fjärranår skänks: en åk 5-elev väktar bara de närmaste åren, inte F–åk 2', () => {
    // Mjukats upp på förälderns begäran (juli 2026): Edward (åk 5) ska inte
    // behöva bossa förskoleklassen. År ≥3 under barnets årskurs auto-erövras;
    // de närmaste två åren bakåt väktas fortfarande.
    const edward = makeProfile({ schoolYear: '5', blixt: allBlixtCleared })
    masterYears(edward, ['F', '1', '2', '3', '4'])
    edward.skills = recomputeAvailability(edward.skills, grantedYears(edward))
    expect(grantedYears(edward)).toEqual(expect.arrayContaining(['F', '1', '2']))
    // Första väktaren är Portvakten (åk 3) — inte Gryningsvakten (F).
    expect(pendingGuardianYear(edward)).toBe('3')
    // Yngre barn skänks inget: åk 2 väktar hela vägen från F.
    expect(grantedYears({ conqueredYears: [], schoolYear: '2' })).toEqual([])
    expect(grantedYears({ conqueredYears: [], schoolYear: 'F' })).toEqual([])
  })

  it('luckor i skänkta fjärranår tränas ändå (bara striden skänks)', () => {
    const gap = genMomentIdsInYear('F')[0]
    const edward = makeProfile({ schoolYear: '5', blixt: allBlixtCleared })
    masterYears(edward, ['F', '1', '2', '3', '4'])
    // Ett F-moment visade sig ändå inte sitta (t.ex. missad repetition).
    edward.skills[gap] = { ...newSkillState(gap), mastery: 'available' }
    edward.skills = recomputeAvailability(edward.skills, grantedYears(edward))
    // Rekommendationen går TILLBAKA och fyller luckan — ingen väktare krävs för F.
    expect(currentMomentId(edward)).toBe(gap)
    expect(pendingGuardianYear(edward)).toBeUndefined() // F ofullständigt → ingen väktare än
  })

  it('fjärranår för åk 6: F–åk 3 skänks', () => {
    expect(grantedYears({ conqueredYears: [], schoolYear: '6' })).toEqual(['F', '1', '2', '3'])
  })

  it('missad repetition ÖVER fronten gömmer inte väktaren', () => {
    // Edward-läget: diagnosplacerad högt, allt t.o.m. åk 4 behärskat, väktaren
    // för åk 3 väntar. Ett åk 6-moment (mastered via placering) missar sin
    // repetition → needs-review i ett STÄNGT år får inte kapa rekommendationen.
    const p = makeProfile({ schoolYear: '5', blixt: allBlixtCleared })
    masterYears(p, ['F', '1', '2', '3', '4'])
    const above = MOMENTS.find((m) => m.year === '6' && hasGenerator(m.generatorId))!
    p.skills[above.id] = { ...p.skills[above.id], mastery: 'needs-review', rating: 500, attempts: 20 }
    p.skills = recomputeAvailability(p.skills, grantedYears(p))
    expect(currentMomentId(p)).toBeUndefined() // väktaren är nästa steg …
    expect(pendingGuardianYear(p)).toBe('3')   // … och den syns
    // Repetition i ett ÖPPET år går däremot fortfarande först.
    const open = MOMENTS.find((m) => m.year === 'F' && hasGenerator(m.generatorId))!
    p.skills[open.id] = { ...p.skills[open.id], mastery: 'needs-review' }
    expect(currentMomentId(p)).toBe(open.id)
  })

  it('nya fjärranår efter årskursbyte öppnar nästa steg vid omräkning', () => {
    // Motorproxy för updateChild-fixen: åk 2-barn med hela F klar (väktaren
    // ej tagen) byter till åk 3 → F blir fjärranår och åk 1 ska öppna direkt
    // NÄR availability räknas om (store gör det numera i updateChild).
    const p = makeProfile({ schoolYear: '2', blixt: allBlixtCleared })
    masterYears(p, ['F'])
    p.skills = recomputeAvailability(p.skills, grantedYears(p))
    expect(pendingGuardianYear(p)).toBe('F')
    const bumped = { ...p, schoolYear: '3' as const }
    bumped.skills = recomputeAvailability(bumped.skills, grantedYears(bumped), blixtBlockedMoments(bumped))
    expect(pendingGuardianYear(bumped)).toBeUndefined() // F skänkt
    expect(currentMomentId(bumped)).toBeDefined()       // åk 1 öppet — inget dödläge
    expect(momentById(currentMomentId(bumped)!).year).toBe('1')
  })

  it('väktarens frågor täcker årets moment (inte dragningsberoende) på nivå 5–7', () => {
    for (const year of ['F', '1', '2', '3', '4', '5', '6'] as const) {
      const tasks = composeGuardianTasks(year)
      expect(tasks.length, `år ${year}: antal`).toBe(WORLDBOSS_TASK_COUNT)
      for (const t of tasks) {
        expect(t.ref.level, `år ${year}: nivå`).toBeGreaterThanOrEqual(5)
        expect(t.ref.level, `år ${year}: nivå`).toBeLessThanOrEqual(7)
      }
      // Täckning först: distinkta generatorer = min(årets moment, 14).
      const distinct = new Set(tasks.map((t) => t.ref.generatorId)).size
      const momentCount = genMomentIdsInYear(year).length
      expect(distinct, `år ${year}: täckning`).toBe(Math.min(momentCount, WORLDBOSS_TASK_COUNT))
    }
  })

  it('världsbossen är en trofé: hel värld klar → bossen erbjuds, men inget grindas av den', () => {
    const w0 = WORLDS[0].id
    const profile = makeProfile({ blixt: allBlixtCleared, conqueredYears: ['F', '1', '2', '3', '4'] })
    for (const m of momentsInWorld(w0)) {
      if (hasGenerator(m.generatorId)) profile.skills[m.id] = { ...profile.skills[m.id], mastery: 'mastered', rating: 700 }
    }
    profile.skills = recomputeAvailability(profile.skills, profile.conqueredYears)
    expect(worldMomentsComplete(profile.skills, w0)).toBe(true)
    expect(trophyBossWorldId(profile)).toBe(w0)
    // Trots att trofé-bossen inte är tagen finns moment att träna (grindar inget).
    expect(currentMomentId(profile)).toBeDefined()
  })

  it('terminsordning inom året: åk-moment rekommenderas i läroplansföljd', () => {
    const profile = makeProfile({ blixt: allBlixtCleared, conqueredYears: ['F'] })
    masterYears(profile, ['F'])
    profile.skills = recomputeAvailability(profile.skills, ['F'], blixtBlockedMoments(profile))
    const first = currentMomentId(profile)
    const yearIds = genMomentIdsInYear('1')
    // Rekommendationen är det FÖRSTA öppna åk 1-momentet i terminsordning.
    const firstOpen = yearIds.find((id) => profile.skills[id]?.mastery === 'available')
    expect(first).toBe(firstOpen)
  })
})

describe('kalla handen (adaptivitet nedåt)', () => {
  it('lugn-läget pausar +1-kryddan men behåller resten av variationen', () => {
    // roll > 0.85 ger normalt base+1 — med noUp stannar den på base.
    expect(variedLevel(550, 0.9)).toBe(practiceLevel(550) + 1)
    expect(variedLevel(550, 0.9, true)).toBe(practiceLevel(550))
    expect(variedLevel(550, 0.1, true)).toBe(practiceLevel(550) - 1) // −1 lever kvar
  })

  it("'sank' tvingar nästa nya uppgift ett steg under barnets nivå", () => {
    const profile = makeProfile()
    profile.skills['antal-0-10'] = { ...profile.skills['antal-0-10'], mastery: 'in-progress', rating: 550 }
    const base = practiceLevel(550)
    for (let i = 0; i < 12; i++) {
      const t = taskForPart(profile, 'antal-0-10', 'nytt', 'sank')
      expect(t.ref.level).toBe(Math.max(1, base - 1))
    }
    // Lugn-läget: aldrig över barnets nivå, oavsett slumpen.
    for (let i = 0; i < 20; i++) {
      const t = taskForPart(profile, 'antal-0-10', 'nytt', 'lugn')
      expect(t.ref.level).toBeLessThanOrEqual(base)
    }
  })
})

describe('världsgruppering i årets resa (färre hopp)', () => {
  it('inom samma terminshalva ligger varje världs moment i EN sammanhängande grupp', () => {
    for (const year of ['F', '1', '2', '3', '4', '5', '6'] as const) {
      const ids = genMomentIdsInYear(year)
      const moments = ids.map((id) => momentById(id))
      // Terminsordningen består …
      for (let i = 1; i < moments.length; i++) {
        const key = (m: typeof moments[0]): number =>
          ['F', '1', '2', '3', '4', '5', '6'].indexOf(m.year) * 4 + (m.term.term === 'HT' ? 0 : 2) + (m.term.half - 1)
        expect(key(moments[i]), `år ${year}: terminsordning`).toBeGreaterThanOrEqual(key(moments[i - 1]))
      }
      // … och ingen värld återkommer i en ANDRA grupp inom samma halva.
      const slots = new Map<string, Set<string>>()
      for (let i = 0; i < moments.length; i++) {
        const slot = `${moments[i].term.term}${moments[i].term.half}`
        const prev = i > 0 ? moments[i - 1] : undefined
        const seen = slots.get(slot) ?? new Set<string>()
        const sameRun = prev && `${prev.term.term}${prev.term.half}` === slot && prev.worldId === moments[i].worldId
        if (!sameRun) {
          expect(seen.has(moments[i].worldId), `år ${year} ${slot}: ${moments[i].worldId} splittrad`).toBe(false)
          seen.add(moments[i].worldId)
        }
        slots.set(slot, seen)
      }
    }
  })
})

describe('prov: kunskapskoll, världsboss, diamant', () => {
  it('nodens kunskapskoll bygger rätt antal frågor med nya frön varje gång', () => {
    const a = composeCheckTasks('vaxling-0-100')
    const b = composeCheckTasks('vaxling-0-100')
    expect(a.length).toBe(CHECK_TASK_COUNT)
    expect(a.map((t) => t.ref.seed).join()).not.toBe(b.map((t) => t.ref.seed).join())
  })

  it('världsbossen blandar frågor från hela världen', () => {
    const tasks = composeWorldBossTasks('talens-dal')
    expect(tasks.length).toBe(WORLDBOSS_TASK_COUNT)
    // Frågor från flera olika moment i världen (inte bara ett).
    expect(new Set(tasks.map((t) => t.ref.generatorId)).size).toBeGreaterThan(1)
  })

  it('diamantnivån håller sig till nivå 8–10', () => {
    for (const task of composeStarTasks('vaxling-0-100')) {
      expect(task.ref.level).toBeGreaterThanOrEqual(8)
    }
  })
})

describe('blixtpass', () => {
  it('låses upp när motsvarande moment börjat tränas', () => {
    const profile = makeProfile()
    expect(blixtUnlocked('add-sub-0-10', profile)).toBe(false)
    profile.skills['add-sub-0-10'] = { ...profile.skills['add-sub-0-10'], mastery: 'in-progress' }
    expect(blixtUnlocked('add-sub-0-10', profile)).toBe(true)
  })

  it('ger alltid korta, rena sifferuppgifter (aldrig text eller flerval)', () => {
    const profile = makeProfile()
    for (const test of BLIXT_TESTS) {
      profile.skills[test.unlockMomentId] = { ...profile.skills[test.unlockMomentId], mastery: 'in-progress', rating: 600 }
      for (let i = 0; i < 40; i++) {
        const task = blixtTask(test.kind, profile)
        expect(task.answer.kind, `${test.kind}: ${task.prompt}`).toBe('numeric')
        expect(task.prompt.length, `${test.kind}: ${task.prompt}`).toBeLessThanOrEqual(24)
      }
    }
  })

  it('svårigheten stiger med trappan (lätt först, tak vid maxtier)', () => {
    const easy = makeProfile({ blixt: { 'add-sub-0-10': { best: 20, lastAt: '', tier: 0 } } })
    const hard = makeProfile({ blixt: { 'add-sub-0-10': { best: 30, lastAt: '', tier: 99 } } })
    expect(blixtLevel('add-sub-0-10', easy)).toBeLessThan(blixtLevel('add-sub-0-10', hard))
    // Trappan klämmer till maxtier — ingen ändlös upptrappning.
    expect(blixtTier('add-sub-0-10', hard)).toBe(blixtMaxTier('add-sub-0-10'))
  })
})

describe('flyt-grind (blixt som krav för att gå vidare)', () => {
  const reachAddSub010 = (): ChildProfile => {
    const p = makeProfile()
    for (const id of ['antal-0-10', 'talrad-0-20', 'dela-upp-tal', 'talkamrater-10', 'addition-0-10', 'subtraktion-0-10', 'add-sub-0-10']) {
      p.skills[id] = { ...p.skills[id], mastery: 'mastered' }
    }
    return p
  }

  it('FK utan klocka, åk1+ med klocka', () => {
    expect(blixtTimed('F')).toBe(false)
    expect(blixtTimed('1')).toBe(true)
    expect(blixtTimed('4')).toBe(true)
  })

  it('oklarad blixt låser momentet efter den — klarad öppnar det', () => {
    const gated = BLIXT_GATE['add-sub-0-10'] // 'addition-0-20' (åk 1)
    const before = reachAddSub010()
    const blockedNo = blixtBlockedMoments(before)
    expect(blockedNo.has(gated)).toBe(true)
    // År F erövrat så årsgrinden inte skuggar flyt-grinden i testet.
    // Trots att förkunskaperna är klara hålls momentet låst av grinden.
    const locked = recomputeAvailability(before.skills, ['F'], blockedNo)
    expect(locked[gated].mastery).toBe('locked')
    expect(pendingBlixtKind(before)).toBe('add-sub-0-10')

    // Klara blixten → grinden släpper.
    const after: ChildProfile = { ...before, blixt: { 'add-sub-0-10': { best: 20, lastAt: '', cleared: true } } }
    const blockedYes = blixtBlockedMoments(after)
    expect(blockedYes.has(gated)).toBe(false)
    const open = recomputeAvailability(after.skills, ['F'], blockedYes)
    expect(open[gated].mastery).toBe('available')
    expect(pendingBlixtKind(after)).not.toBe('add-sub-0-10')
  })
})

describe('delad add/sub-migrering', () => {
  it('klarad blandad nod markerar de rena noderna klara (skickar inte barnet bakåt)', () => {
    const skills: Record<string, SkillState> = {
      'add-sub-0-10': { ...newSkillState('add-sub-0-10'), mastery: 'mastered' },
    }
    const out = backfillSplitAddSub(skills, '2026-01-01')
    expect(out['addition-0-10'].mastery).toBe('mastered')
    expect(out['subtraktion-0-10'].mastery).toBe('mastered')
    expect(out['addition-0-10'].review).toBeDefined()
  })

  it('rör inte rena noder om den blandade inte är klar', () => {
    const skills: Record<string, SkillState> = {
      'add-sub-0-10': { ...newSkillState('add-sub-0-10'), mastery: 'in-progress' },
    }
    const out = backfillSplitAddSub(skills, '2026-01-01')
    expect(out['addition-0-10']).toBeUndefined()
  })
})

describe('seenWorlds-migrering (fog of war)', () => {
  const w0 = WORLDS[0].id
  const w1 = WORLDS[1].id
  const firstMomentOf = (wid: string): string => momentsInWorld(wid)[0].id

  it('fyller seenWorlds för världar med framsteg och erövrade världar', () => {
    const skills: Record<string, SkillState> = {
      [firstMomentOf(w0)]: { ...newSkillState(firstMomentOf(w0)), mastery: 'in-progress' },
    }
    const seen = backfillSeenWorlds(skills, [w1], undefined)
    expect(seen).toContain(w0) // har framsteg
    expect(seen).toContain(w1) // erövrad
  })

  it('idempotent: rör inte ett redan satt seenWorlds', () => {
    expect(backfillSeenWorlds({}, [], ['redan-satt'])).toEqual(['redan-satt'])
  })

  it('nytt barn utan framsteg får tomt seenWorlds (ankomstkort till värld 1 väntar)', () => {
    const skills: Record<string, SkillState> = {
      [firstMomentOf(w0)]: { ...newSkillState(firstMomentOf(w0)), mastery: 'available' },
    }
    expect(backfillSeenWorlds(skills, [], undefined)).toEqual([])
  })
})

describe('streak-frysdag (skyddshjärta)', () => {
  const S = (days: number, lastActiveDate: string, freezes?: number) => ({ days, lastActiveDate, freezes })

  it('igår (gap 1) → dagen läggs på som vanligt', () => {
    const r = updateStreak(S(4, '2026-07-19'), '2026-07-20')
    expect(r.streak.days).toBe(5)
    expect(r.usedFreeze).toBe(false)
  })

  it('exakt EN missad dag med frysdag → förbrukar frysdagen, kedjan räddad', () => {
    const r = updateStreak(S(5, '2026-07-18', 1), '2026-07-20')
    expect(r.streak.days).toBe(6)
    expect(r.usedFreeze).toBe(true)
    expect(r.streak.freezes).toBe(0)
  })

  it('en missad dag UTAN frysdag → nollställs till 1', () => {
    const r = updateStreak(S(5, '2026-07-18', 0), '2026-07-20')
    expect(r.streak.days).toBe(1)
    expect(r.usedFreeze).toBe(false)
  })

  it('mer än en missad dag (gap 3) → nollställs även med frysdag', () => {
    const r = updateStreak(S(9, '2026-07-17', 2), '2026-07-20')
    expect(r.streak.days).toBe(1)
    expect(r.usedFreeze).toBe(false)
    expect(r.streak.freezes).toBe(2) // frysdagen förbrukas inte i onödan
  })

  it('samma dag igen → oförändrat', () => {
    const r = updateStreak(S(3, '2026-07-20', 1), '2026-07-20')
    expect(r.streak.days).toBe(3)
    expect(r.usedFreeze).toBe(false)
    expect(r.earnedFreeze).toBe(false)
  })

  it('når multipel av 7 → tjänar en frysdag (max 2)', () => {
    const r = updateStreak(S(6, '2026-07-19', 0), '2026-07-20')
    expect(r.streak.days).toBe(7)
    expect(r.earnedFreeze).toBe(true)
    expect(r.streak.freezes).toBe(1)
    // Redan 2 lagrade → tjänar inte fler vid nästa multipel.
    const capped = updateStreak(S(13, '2026-07-19', 2), '2026-07-20')
    expect(capped.streak.days).toBe(14)
    expect(capped.earnedFreeze).toBe(false)
    expect(capped.streak.freezes).toBe(2)
  })
})

describe('belöningar', () => {
  it('momentmål räknar från baslinjen', () => {
    const profile = makeProfile()
    profile.skills['antal-0-10'] = { ...profile.skills['antal-0-10'], mastery: 'mastered' }
    const progress = rewardProgress({
      id: 'r', childId: 'test', title: 'Bio', emoji: '🎬',
      target: { type: 'moments', count: 2 }, createdAt: '2026-01-01T00:00:00Z',
      baseline: { momentsMastered: 0, activeDays: 0 },
    }, profile)
    expect(progress.done).toBe(1)
    expect(progress.earned).toBe(false)
    expect(progress.requirement).toContain('1 moment till')
  })

  it('terminsmål listar de återstående momenten vid namn', () => {
    const profile = makeProfile()
    const progress = rewardProgress({
      id: 'r2', childId: 'test', title: 'Glass', emoji: '🍦',
      target: { type: 'term-goal', year: '2', term: 'HT', half: 1 }, createdAt: '2026-01-01T00:00:00Z',
      baseline: { momentsMastered: 0, activeDays: 0 },
    }, profile)
    expect(progress.total).toBeGreaterThan(0)
    expect(progress.nextSteps.length).toBe(progress.total - progress.done)
    expect(progress.requirement).toContain('moment till')
  })
})
