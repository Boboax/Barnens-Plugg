import { describe, expect, it } from 'vitest'
import type { ChildProfile, SkillState } from '../domain/types'
import { MOMENTS, momentById, momentsInWorld } from '../domain/curriculum'
import { WORLDS } from '../domain/worlds'
import { hasGenerator } from '../generators'
import { expectedSuccess, practiceLevel, updateRating } from './rating'
import { REVIEW_INTERVALS_DAYS, scheduleFirstReview, scheduleNextReview } from './spaced-repetition'
import { applyAnswer, classifyError, hotStreakBonus, newSkillState, recomputeAvailability, repairDiagnosisBossReady, currentMomentId, bossPendingWorldId, worldMomentsComplete } from './progress'
import { practiceLevel as practiceLevelFor } from './rating'
import { applyDiagnosisResult, diagnosisBackbone, searchState, startIndexForYear } from './diagnosis'
import { composeCheckTasks, composeWorldBossTasks, composeStarTasks, CHECK_TASK_COUNT, WORLDBOSS_TASK_COUNT } from './session'
import { rewardProgress } from './rewards'
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

describe('bossgrinden: bossen öppnar nästa värld', () => {
  const w0 = WORLDS[0].id
  const masterFirstWorld = (): ChildProfile => {
    const profile = makeProfile()
    for (const m of momentsInWorld(w0)) {
      profile.skills[m.id] = { ...profile.skills[m.id], mastery: 'mastered', rating: 700 }
    }
    return profile
  }

  it('alla moment klara men bossen kvar → bossen väntar, inget moment att träna, nästa värld låst', () => {
    const profile = masterFirstWorld()
    profile.skills = recomputeAvailability(profile.skills, []) // ingen erövrad boss
    expect(worldMomentsComplete(profile.skills, w0)).toBe(true)
    // Bossen är nästa steg — vi hoppar INTE vidare till nästa värld.
    expect(bossPendingWorldId(profile)).toBe(w0)
    expect(currentMomentId(profile)).toBeUndefined()
    // Ett moment i en senare värld (förkunskap i w0) är fortfarande låst.
    const laterGated = MOMENTS.find(
      (m) => m.worldId !== w0 && hasGenerator(m.generatorId) &&
        m.prerequisites.some((p) => momentById(p).worldId === w0),
    )
    if (laterGated) expect(profile.skills[laterGated.id].mastery).toBe('locked')
  })

  it('erövrad boss → nästa värld öppnas och blir aktuell', () => {
    const profile = masterFirstWorld()
    profile.conqueredWorlds = [w0]
    profile.skills = recomputeAvailability(profile.skills, [w0])
    expect(bossPendingWorldId(profile)).not.toBe(w0)
    const next = currentMomentId(profile)
    expect(next).toBeDefined()
    expect(momentById(next!).worldId).not.toBe(w0)
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
    const gated = BLIXT_GATE['add-sub-0-10'] // 'addition-0-20'
    const before = reachAddSub010()
    const blockedNo = blixtBlockedMoments(before)
    expect(blockedNo.has(gated)).toBe(true)
    // Trots att förkunskaperna är klara hålls momentet låst av grinden.
    const locked = recomputeAvailability(before.skills, [], blockedNo)
    expect(locked[gated].mastery).toBe('locked')
    expect(pendingBlixtKind(before)).toBe('add-sub-0-10')

    // Klara blixten → grinden släpper.
    const after: ChildProfile = { ...before, blixt: { 'add-sub-0-10': { best: 20, lastAt: '', cleared: true } } }
    const blockedYes = blixtBlockedMoments(after)
    expect(blockedYes.has(gated)).toBe(false)
    const open = recomputeAvailability(after.skills, [], blockedYes)
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
    expect(progress.requirement).toContain('1 boss till')
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
