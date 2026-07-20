import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type {
  AnswerRecord, BlixtKind, ChatLogEntry, ChildProfile, Household, Reward, RewardTarget, SchoolYear, SkillState, Task,
} from '../domain/types'
import { configureChatFromHousehold } from '../chat'
import { configureCloudTts } from '../tts'
import { MOMENTS } from '../domain/curriculum'
import {
  applyAnswer, applyBossResult, applyReviewResult, applyStarResult, newSkillState, recomputeAvailability,
} from '../engine/progress'
import { applyDiagnosisResult, diagnosisPassesForAge } from '../engine/diagnosis'
import { blixtMaxTier, blixtBlockedMoments } from '../engine/blixt'
import { activeDayCount, masteredCount, updateStreak } from '../engine/rewards'
import { resetNamePool, setNamePool } from '../generators/helpers'
import { emptyHousehold, loadHousehold, requestPersistentStorage, saveHousehold } from '../storage/db'
import { hashPin, verifyPin } from '../storage/pin'

/* ============================================================
   Appens tillstånd: hushållet + navigering + tidsbokföring.

   All domänlogik bor i motorn (rena funktioner) — här kopplas
   den till React och lagringen. Varje ändring autosparas.
   ============================================================ */

export type Screen =
  | 'profiles' | 'home' | 'session' | 'check' | 'boss' | 'star'
  | 'blixt' | 'diagnosis' | 'parent' | 'time-up'

export const KID_COLORS = ['#FF7A6E', '#3FBF87', '#4A56C6', '#E8A13C', '#8C6BC8', '#2FA8C7'] as const

export const todayISO = (): string => new Date().toISOString().slice(0, 10)
export const nowISO = (): string => new Date().toISOString()

/** Max antal svar som sparas per barn (ringbuffert — rapporten behöver ~4 veckor). */
const ANSWER_HISTORY_LIMIT = 1500
/** Max antal sparade kladdbilder per barn (de är störst i lagringen). */
const SCRATCH_LIMIT = 20

interface StoreValue {
  household: Household
  loaded: boolean
  screen: Screen
  activeChild: ChildProfile | undefined
  parentUnlocked: boolean

  // Navigering
  go(screen: Screen): void
  selectChild(id: string): void
  leaveChild(): void
  /** Momentet vars kunskapskoll/stjärnnivå körs just nu. */
  battleMomentId: string | undefined
  /** Världen vars boss (klimaxstrid i slutet) utmanas just nu. */
  battleWorldId: string | undefined
  startBattle(momentId: string, kind: 'check' | 'star'): void
  /** Starta världsbossen (den stora striden när alla noder i världen är klara). */
  startWorldBoss(worldId: string): void
  /** Momentet barnet valde på kartan för nästa pass (undefined = motorn väljer). */
  sessionMomentId: string | undefined
  /** Fokuserat pass? (nodtryck = bara det momentet; "Starta passet" = fullt pass). */
  sessionFocused: boolean
  startSession(momentId?: string, focused?: boolean): void
  /** Pågående blixttest. */
  blixtKind: BlixtKind | undefined
  startBlixt(kind: BlixtKind): void
  recordBlixtResult(kind: BlixtKind, correct: number, cleared: boolean, timeMs?: number): void
  setBlixtTarget(kind: BlixtKind, target: number): void

  // Barnhantering
  addChild(input: { name: string; color: string; birthYear: number; schoolYear: SchoolYear; dailyLimitMinutes: number }): void
  updateChild(id: string, patch: Partial<Pick<ChildProfile, 'name' | 'color' | 'dailyLimitMinutes' | 'chatEnabled' | 'schoolYear' | 'hero'>>): void

  // Träning
  recordAnswer(task: Task, correct: boolean, elapsedMs: number, context: AnswerRecord['context'], givenAnswer?: number | string, scratchPng?: string, hotStreak?: number): void
  /** Resultat av nodens kunskapskoll (vinst → momentet behärskat). */
  finishCheck(momentId: string, won: boolean): void
  /** Resultat av världsbossen (vinst → världen erövrad). */
  finishWorldBoss(worldId: string, won: boolean): void
  finishStar(momentId: string, won: boolean): void
  /** Markera att barnet sett Pis diamantnivå-förklaring (visas en gång). */
  markStarIntroSeen(): void
  markStreakCelebrated(days: number): void
  markRewardCelebrated(rewardId: string): void
  /** Markera att barnet sett Pis kart-/nodförklaring (visas en gång). */
  markMapIntroSeen(): void
  /** Markera att barnet "anlänt" till en värld (ankomstkortet visat). */
  markWorldSeen(worldId: string): void
  /** Nollställ den transienta frysdags-skylten efter att Home visat den. */
  clearStreakToast(): void
  finishReview(momentId: string, passed: boolean): void
  recordDiagnosisProbe(momentId: string, level: number, correct: boolean): void
  finishDiagnosisPass(converged: boolean): void
  /** Nollställ placering + framsteg och kör om startdiagnosen (föräldervalt). */
  redoDiagnosis(childId: string): void

  // Tid
  secondsLeftToday(child: ChildProfile): number
  addUsage(seconds: number): void
  /** Förälder beviljar extra minuter idag (PIN-kollad i UI:t, se TimeUp). */
  grantExtraTime(childId: string, minutes: number): void
  /** Kollar PIN utan att låsa upp föräldraläget (extratid från barnets skärm). */
  verifyParentPin(pin: string): Promise<boolean>

  // Föräldraläge
  tryUnlockParent(pin: string): Promise<boolean>
  setPin(pin: string): Promise<void>
  hasPin: boolean
  lockParent(): void
  addReward(childId: string, title: string, emoji: string, target: RewardTarget): void
  markRewardEarned(id: string): void
  redeemReward(id: string): void
  deleteReward(id: string): void
  replaceHousehold(next: Household): void
  noteBackup(): void

  // Chatten (fas 5)
  appendChatLog(entry: ChatLogEntry): void
  setChatConfig(config: { provider: 'gemini' | 'claude'; apiKey: string } | null): void
}

const Ctx = createContext<StoreValue | null>(null)

export function useStore(): StoreValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useStore utanför StoreProvider')
  return v
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [household, setHousehold] = useState<Household>(emptyHousehold)
  const [loaded, setLoaded] = useState(false)
  const [screen, setScreen] = useState<Screen>('profiles')
  const [activeChildId, setActiveChildId] = useState<string>()
  const [parentUnlocked, setParentUnlocked] = useState(false)
  const [battleMomentId, setBattleMomentId] = useState<string>()
  const [battleWorldId, setBattleWorldId] = useState<string>()
  const [blixtKind, setBlixtKind] = useState<BlixtKind>()
  const [sessionMomentId, setSessionMomentId] = useState<string>()
  const [sessionFocused, setSessionFocused] = useState(false)

  useEffect(() => {
    void loadHousehold().then((data) => {
      if (data) setHousehold(data)
      setLoaded(true)
      void requestPersistentStorage()
    })
  }, [])

  // Chattleverantören följer hushållets konfiguration (nyckeln bor lokalt).
  // Gemini-nyckeln driver även moln-TTS:en (mänsklig uppläsningsröst).
  useEffect(() => {
    configureChatFromHousehold(household)
    configureCloudTts(household.chat?.provider === 'gemini' ? household.chat.apiKey : null)
  }, [household.chat?.provider, household.chat?.apiKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Autospar: varje förändring efter inladdning skrivs ner.
  useEffect(() => {
    if (loaded) void saveHousehold(household)
  }, [household, loaded])

  const activeChild = household.children.find((c) => c.id === activeChildId)

  const patchChild = (id: string, fn: (c: ChildProfile) => ChildProfile): void => {
    setHousehold((h) => ({
      ...h,
      children: h.children.map((c) => (c.id === id ? fn(c) : c)),
    }))
  }

  const value: StoreValue = useMemo(() => ({
    household, loaded, screen, activeChild, parentUnlocked,
    hasPin: Boolean(household.parentPinHash),

    go: setScreen,

    selectChild: (id) => {
      const child = household.children.find((c) => c.id === id)
      if (!child) return
      // Personalisera textuppgifterna med barnets eget namn (+ syskonens),
      // hämtat från de lokala profilerna — lämnar aldrig enheten.
      const siblings = household.children.filter((c) => c.id !== id).map((c) => c.name)
      setNamePool(child.name, siblings)
      setActiveChildId(id)
      setScreen(child.diagnosis.done ? 'home' : 'diagnosis')
    },

    leaveChild: () => {
      resetNamePool()
      setActiveChildId(undefined)
      setScreen('profiles')
    },

    battleMomentId,
    battleWorldId,
    startBattle: (momentId, kind) => {
      setBattleMomentId(momentId)
      setScreen(kind)
    },
    startWorldBoss: (worldId) => {
      setBattleWorldId(worldId)
      setScreen('boss')
    },

    sessionMomentId,
    sessionFocused,
    startSession: (momentId, focused = false) => {
      setSessionMomentId(momentId)
      setSessionFocused(focused)
      setScreen('session')
    },

    blixtKind,
    startBlixt: (kind) => {
      setBlixtKind(kind)
      setScreen('blixt')
    },
    recordBlixtResult: (kind, correct, cleared, timeMs) => {
      if (!activeChildId) return
      patchChild(activeChildId, (c) => {
        const prev = c.blixt?.[kind]
        const maxTier = blixtMaxTier(kind)
        const prevTier = Math.min(maxTier, Math.max(0, prev?.tier ?? 0))
        // Klarad runda → trappan stiger ett steg (svårare nästa gång) OCH grinden
        // öppnas. Inte klarad → oförändrad trappa, ingen bestraffning.
        const tier = cleared ? Math.min(maxTier, prevTier + 1) : prevTier
        const best = Math.max(prev?.best ?? 0, correct)
        const bestTimeMs = cleared && timeMs !== undefined
          ? Math.min(prev?.bestTimeMs ?? timeMs, timeMs)
          : prev?.bestTimeMs
        const rec = { best, lastAt: nowISO(), tier, cleared: (prev?.cleared ?? false) || cleared, bestTimeMs }
        const next = { ...c, blixt: { ...c.blixt, [kind]: rec } }
        // Klarad flyt-grind → räkna om tillgänglighet så nästa moment öppnas.
        return { ...next, skills: recomputeAvailability(next.skills, next.conqueredWorlds ?? [], blixtBlockedMoments(next)) }
      })
    },
    setBlixtTarget: (kind, target) => {
      setHousehold((h) => ({ ...h, blixtTargets: { ...h.blixtTargets, [kind]: target } }))
    },

    addChild: ({ name, color, birthYear, schoolYear, dailyLimitMinutes }) => {
      const skills: Record<string, SkillState> = {}
      for (const m of MOMENTS) skills[m.id] = newSkillState(m.id)
      const child: ChildProfile = {
        id: `barn-${Date.now().toString(36)}`,
        name, color, birthYear, schoolYear,
        createdAt: nowISO(),
        skills: recomputeAvailability(skills),
        answers: [],
        diagnosis: {
          passesDone: 0,
          passesTotal: diagnosisPassesForAge(birthYear, new Date().getFullYear()),
          done: false,
          probes: [],
        },
        dailyLimitMinutes,
        usageSeconds: {},
        chatEnabled: false,
        streak: { days: 0, lastActiveDate: '' },
      }
      setHousehold((h) => ({ ...h, children: [...h.children, child] }))
    },

    updateChild: (id, patch) => patchChild(id, (c) => ({ ...c, ...patch })),

    recordAnswer: (task, correct, elapsedMs, context, givenAnswer, scratchPng, hotStreak) => {
      if (!activeChildId) return
      patchChild(activeChildId, (c) => {
        const momentId = MOMENTS.find((m) => m.generatorId === task.ref.generatorId)?.id
        if (!momentId) return c
        const skill = c.skills[momentId] ?? newSkillState(momentId)
        const { skill: nextSkill, record } = applyAnswer(
          skill, task, correct, elapsedMs, context, nowISO(), givenAnswer, scratchPng, hotStreak,
        )
        // Kladdbilder är stora — behåll bara de senaste.
        let answers = [...c.answers, record]
        const withScratch = answers.filter((a) => a.scratchPng)
        if (withScratch.length > SCRATCH_LIMIT) {
          const drop = new Set(withScratch.slice(0, withScratch.length - SCRATCH_LIMIT))
          answers = answers.map((a) => (drop.has(a) ? { ...a, scratchPng: undefined } : a))
        }
        if (answers.length > ANSWER_HISTORY_LIMIT) answers = answers.slice(-ANSWER_HISTORY_LIMIT)

        // Streak: dagens första svar förlänger kedjan (eller räddas av en
        // frysdag / nollställs). Ren logik i updateStreak — se engine/rewards.
        const { streak: nextStreak, usedFreeze, earnedFreeze } = updateStreak(c.streak, todayISO())
        const streak = nextStreak
        // Transient skylt som Home visar en gång (förbrukad väger tyngst).
        const pendingStreakToast = usedFreeze ? 'used' as const
          : earnedFreeze ? 'earned' as const
          : c.pendingStreakToast

        // Orubblig princip: blixtpass och diagnos påverkar ALDRIG rating,
        // framsteg eller bossupplåsning. De loggas (för föräldravyn) och
        // förlänger streaken, men skills lämnas orörda — annars kunde en
        // snabb blixtrunda knuffa ett moment till "boss-ready" utan träning,
        // och diagnosprober smutsade ned rating på oövade moment.
        const skills = context === 'blixt' || context === 'diagnos'
          ? c.skills
          : recomputeAvailability({ ...c.skills, [momentId]: nextSkill }, c.conqueredWorlds ?? [], blixtBlockedMoments(c))
        return { ...c, skills, answers, streak, pendingStreakToast }
      })
    },

    clearStreakToast: () => {
      if (!activeChildId) return
      patchChild(activeChildId, (c) => (c.pendingStreakToast ? { ...c, pendingStreakToast: undefined } : c))
    },

    finishCheck: (momentId, won) => {
      if (!activeChildId) return
      // Vinst i nodens kunskapskoll → momentet behärskat (öppnar nästa nod).
      patchChild(activeChildId, (c) => ({
        ...c,
        skills: recomputeAvailability({
          ...c.skills,
          [momentId]: applyBossResult(c.skills[momentId] ?? newSkillState(momentId), won, todayISO()),
        }, c.conqueredWorlds ?? [], blixtBlockedMoments(c)),
      }))
    },

    finishWorldBoss: (worldId, won) => {
      if (!activeChildId || !won) return
      // Vinst mot världsbossen → världen erövrad. Räkna om tillgänglighet så att
      // NÄSTA värld nu öppnas (bossgrinden släpper). Detta är enda vägen vidare.
      patchChild(activeChildId, (c) => {
        if (c.conqueredWorlds?.includes(worldId)) return c
        const conqueredWorlds = [...(c.conqueredWorlds ?? []), worldId]
        return { ...c, conqueredWorlds, skills: recomputeAvailability(c.skills, conqueredWorlds, blixtBlockedMoments(c)) }
      })
    },

    finishStar: (momentId, won) => {
      if (!activeChildId) return
      patchChild(activeChildId, (c) => ({
        ...c,
        skills: { ...c.skills, [momentId]: applyStarResult(c.skills[momentId] ?? newSkillState(momentId), won) },
      }))
    },

    markStreakCelebrated: (days) => {
      if (!activeChildId) return
      patchChild(activeChildId, (c) => ((c.streakCelebrated ?? 0) >= days ? c : { ...c, streakCelebrated: days }))
    },

    markRewardCelebrated: (rewardId) => {
      setHousehold((h) => ({
        ...h,
        rewards: h.rewards.map((r) => (r.id === rewardId && !r.celebratedAt ? { ...r, celebratedAt: nowISO() } : r)),
      }))
    },

    markStarIntroSeen: () => {
      if (!activeChildId) return
      patchChild(activeChildId, (c) => (c.seenStarIntro ? c : { ...c, seenStarIntro: true }))
    },

    markMapIntroSeen: () => {
      if (!activeChildId) return
      patchChild(activeChildId, (c) => (c.seenMapIntro ? c : { ...c, seenMapIntro: true }))
    },

    markWorldSeen: (worldId) => {
      if (!activeChildId) return
      patchChild(activeChildId, (c) =>
        c.seenWorlds?.includes(worldId) ? c : { ...c, seenWorlds: [...(c.seenWorlds ?? []), worldId] })
    },

    redoDiagnosis: (id) => patchChild(id, (c) => {
      // Färska färdigheter så gammal placering rensas helt; profil/namn/
      // belöningar/historik behålls. Diagnosen körs som ett enda pass.
      const fresh: Record<string, SkillState> = {}
      for (const m of MOMENTS) fresh[m.id] = newSkillState(m.id)
      return {
        ...c,
        skills: recomputeAvailability(fresh, [], blixtBlockedMoments(c)),
        // Ny placering börjar om från noll — även erövrade världar nollställs så
        // bossgrinden gäller på nytt utifrån den nya diagnosen.
        conqueredWorlds: [],
        diagnosis: { passesDone: 0, passesTotal: 1, done: false, probes: [] },
      }
    }),

    finishReview: (momentId, passed) => {
      if (!activeChildId) return
      patchChild(activeChildId, (c) => ({
        ...c,
        skills: recomputeAvailability({
          ...c.skills,
          [momentId]: applyReviewResult(c.skills[momentId] ?? newSkillState(momentId), passed, todayISO()),
        }, c.conqueredWorlds ?? [], blixtBlockedMoments(c)),
      }))
    },

    recordDiagnosisProbe: (momentId, level, correct) => {
      if (!activeChildId) return
      patchChild(activeChildId, (c) => ({
        ...c,
        diagnosis: {
          ...c.diagnosis,
          probes: [...c.diagnosis.probes, { momentId, correct, level: level as 1 }],
        },
      }))
    },

    finishDiagnosisPass: (converged) => {
      if (!activeChildId) return
      patchChild(activeChildId, (c) => {
        const passesDone = c.diagnosis.passesDone + 1
        const done = converged || passesDone >= c.diagnosis.passesTotal
        return {
          ...c,
          diagnosis: { ...c.diagnosis, passesDone, done },
          skills: done ? applyDiagnosisResult(c, todayISO()) : c.skills,
        }
      })
    },

    secondsLeftToday: (child) => {
      const used = child.usageSeconds[todayISO()] ?? 0
      const extra = child.extraSeconds?.[todayISO()] ?? 0
      return Math.max(0, child.dailyLimitMinutes * 60 + extra - used)
    },

    addUsage: (seconds) => {
      if (!activeChildId) return
      patchChild(activeChildId, (c) => ({
        ...c,
        usageSeconds: { ...c.usageSeconds, [todayISO()]: (c.usageSeconds[todayISO()] ?? 0) + seconds },
      }))
    },

    grantExtraTime: (childId, minutes) => {
      patchChild(childId, (c) => ({
        ...c,
        extraSeconds: { ...c.extraSeconds, [todayISO()]: (c.extraSeconds?.[todayISO()] ?? 0) + minutes * 60 },
      }))
    },

    verifyParentPin: async (pin) => {
      if (!household.parentPinHash) return false
      return verifyPin(pin, household.parentPinHash)
    },

    tryUnlockParent: async (pin) => {
      if (!household.parentPinHash) return false
      const ok = await verifyPin(pin, household.parentPinHash)
      if (ok) setParentUnlocked(true)
      return ok
    },

    setPin: async (pin) => {
      const hash = await hashPin(pin)
      setHousehold((h) => ({ ...h, parentPinHash: hash }))
      setParentUnlocked(true)
    },

    lockParent: () => setParentUnlocked(false),

    addReward: (childId, title, emoji, target) => {
      const child = household.children.find((c) => c.id === childId)
      if (!child) return
      const reward: Reward = {
        id: `rew-${Date.now().toString(36)}`,
        childId, title, emoji, target,
        createdAt: nowISO(),
        baseline: { momentsMastered: masteredCount(child), activeDays: activeDayCount(child) },
      }
      setHousehold((h) => ({ ...h, rewards: [...h.rewards, reward] }))
    },

    markRewardEarned: (id) => {
      setHousehold((h) => ({
        ...h,
        rewards: h.rewards.map((r) => (r.id === id && !r.earnedAt ? { ...r, earnedAt: nowISO() } : r)),
      }))
    },

    redeemReward: (id) => {
      setHousehold((h) => ({
        ...h,
        rewards: h.rewards.map((r) => (r.id === id ? { ...r, redeemedAt: nowISO() } : r)),
      }))
    },

    deleteReward: (id) => {
      setHousehold((h) => ({ ...h, rewards: h.rewards.filter((r) => r.id !== id) }))
    },

    replaceHousehold: (next) => {
      setHousehold(next)
      setActiveChildId(undefined)
      setScreen('profiles')
    },

    noteBackup: () => setHousehold((h) => ({ ...h, lastBackupAt: nowISO() })),

    appendChatLog: (entry) => {
      setHousehold((h) => {
        // Ringbuffert: loggen är föräldrainsyn, inte arkiv — 400 rader räcker
        // och kladd-bilder i loggen får inte svälla lagringen.
        let log = [...h.chatLog, entry]
        if (log.length > 400) log = log.slice(-400)
        return { ...h, chatLog: log }
      })
    },

    setChatConfig: (config) => {
      setHousehold((h) => ({ ...h, chat: config ?? undefined }))
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [household, loaded, screen, activeChild, parentUnlocked, activeChildId, battleMomentId, battleWorldId, blixtKind, sessionMomentId, sessionFocused])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
