import type { AnswerRecord, ChildProfile, Household, MisconceptionTag, SchoolYear } from '../domain/types'
import { MOMENTS } from '../domain/curriculum'
import { practiceLevel } from './rating'
import { dayStats } from './daily'
import { masteredCount } from './pet-home'

/* ============================================================
   Analysunderlag — en avskalad kopia av barnens träning som föräldern
   kan lämna till någon (t.ex. en AI-assistent) som ska bedöma nivåerna.

   Förälderns önskan (okt 2026): få passen granskade på distans utan att
   någon får stående åtkomst till familjens data. Därför är det en FIL som
   föräldern själv väljer att skicka (princip 6) — och den innehåller bara
   det en granskning behöver:

   - Barnen heter "Barn A/B/C"; bara årskurs och ålder följer med. Inga
     namn, färger, hjältar, id:n, kladdbilder eller chattloggar.
   - De senaste dagarnas svar med uppgiftens generator/nivå/frö — uppgiften
     går att återskapa exakt (generatorerna är deterministiska, princip 1),
     så frågetexten (där barnets och syskonens namn kan stå) behövs aldrig.
   - Nivån per moment, dag-för-dag-signalerna och tiden.
   ============================================================ */

export const ANALYSIS_KIND = 'barnens-plugg-analys'
export const ANALYSIS_DAYS = 14

export interface AnalysisAnswer {
  at: string
  momentId: string
  generatorId: string
  level: number
  seed: number
  correct: boolean
  elapsedMs: number
  context: AnswerRecord['context']
  misconception?: MisconceptionTag
  errorKind?: AnswerRecord['errorKind']
}

export interface AnalysisChild {
  label: string
  schoolYear: SchoolYear
  age: number
  dailyLimitMinutes: number
  diagnosisDone: boolean
  conqueredYears: string[]
  conqueredWorlds: string[]
  masteredMoments: number
  streakDays: number
  skills: {
    momentId: string; title: string; year: SchoolYear; mastery: string
    rating: number; practiceLevel: number; attempts: number; correct: number
    firstPracticedOn?: string; recentMisconceptions: MisconceptionTag[]
  }[]
  days: {
    date: string; activeMinutes: number; idleMinutes: number; campMinutes: number
    answers: number; trained: number; correct: number; guesses: number
    medianSeconds: number | null; sessions: number; verdict: string
  }[]
  blixt: { kind: string; best: number; tier?: number; cleared?: boolean }[]
  answers: AnalysisAnswer[]
}

export interface AnalysisSnapshot {
  kind: typeof ANALYSIS_KIND
  version: 1
  createdAt: string
  appVersion?: string
  days: number
  children: AnalysisChild[]
}

const LABELS = 'ABCDEFGH'

function childSnapshot(child: ChildProfile, index: number, now: Date, days: number): AnalysisChild {
  const since = new Date(now.getTime() - days * 86_400_000).toISOString()
  const dates = Array.from({ length: days }, (_, i) => new Date(now.getTime() - i * 86_400_000).toISOString().slice(0, 10))
  const title = new Map(MOMENTS.map((m) => [m.id, m]))
  return {
    label: `Barn ${LABELS[index] ?? index + 1}`,
    schoolYear: child.schoolYear,
    age: now.getFullYear() - child.birthYear,
    dailyLimitMinutes: child.dailyLimitMinutes,
    diagnosisDone: child.diagnosis.done,
    conqueredYears: child.conqueredYears ?? [],
    conqueredWorlds: child.conqueredWorlds ?? [],
    masteredMoments: masteredCount(child),
    streakDays: child.streak.days,
    // Bara moment barnet faktiskt rört eller som är öppna — låsta moment
    // säger inget om nivån.
    skills: Object.values(child.skills)
      .filter((s) => s.mastery !== 'locked')
      .map((s) => ({
        momentId: s.momentId,
        title: title.get(s.momentId)?.title ?? s.momentId,
        year: title.get(s.momentId)?.year ?? child.schoolYear,
        mastery: s.mastery,
        rating: Math.round(s.rating),
        practiceLevel: practiceLevel(s.rating),
        attempts: s.attempts,
        correct: s.correct,
        firstPracticedOn: s.firstPracticedOn,
        recentMisconceptions: s.recentMisconceptions,
      })),
    // Dag-för-dag utan de färdigformulerade texterna (de är skrivna för
    // föräldern); siffrorna räcker för en granskning.
    days: dates.map((d) => {
      const s = dayStats(child, d)
      return {
        date: d, activeMinutes: s.activeMinutes, idleMinutes: s.idleMinutes, campMinutes: s.campMinutes,
        answers: s.answers, trained: s.trained, correct: s.correct, guesses: s.guesses,
        medianSeconds: s.medianSeconds, sessions: s.sessions, verdict: s.verdict,
      }
    }),
    blixt: Object.entries(child.blixt ?? {}).map(([kind, r]) => ({ kind, best: r!.best, tier: r!.tier, cleared: r!.cleared })),
    answers: child.answers
      .filter((a) => a.at >= since)
      .map((a) => ({
        at: a.at, momentId: a.momentId,
        generatorId: a.taskRef.generatorId, level: a.taskRef.level, seed: a.taskRef.seed,
        correct: a.correct, elapsedMs: a.elapsedMs, context: a.context,
        misconception: a.misconception, errorKind: a.errorKind,
      })),
  }
}

/** Analysunderlaget för hela hushållet. Rena data, inga sidoeffekter. */
export function analysisSnapshot(household: Household, now: Date, appVersion?: string, days = ANALYSIS_DAYS): AnalysisSnapshot {
  return {
    kind: ANALYSIS_KIND,
    version: 1,
    createdAt: now.toISOString(),
    appVersion,
    days,
    children: household.children.map((c, i) => childSnapshot(c, i, now, days)),
  }
}
