import type { AnswerRecord, ChildProfile, CurriculumArea, MisconceptionTag } from '../domain/types'
import { momentById } from '../domain/curriculum'
import { worldById } from '../domain/worlds'
import { misconceptionInfo } from './misconceptions'
import { currentMomentId, bossPendingWorldId } from './progress'
import { pendingBlixtKind, blixtConfig } from './blixt'

/* ============================================================
   Föräldrarapporten — veckan i klarspråk.

   Målet är en lärares formulering, inte statistik: vad går bra,
   var hakar det, och vad kan man göra vid köksbordet.
   ============================================================ */

export interface WeeklyReport {
  activeDays: number
  totalMinutes: number
  answers: number
  accuracy: number // 0–1
  bossesWon: number
  starsWon: number
  /** Andel av felen som klassats som slarv (inte kunskapslucka). */
  slarvRatio: number
  /** Vanligaste missuppfattningarna med föräldranoter. */
  topMisconceptions: { tag: MisconceptionTag; count: number; note: string }[]
  perArea: { area: CurriculumArea; answers: number; accuracy: number }[]
  /** Läraraktiga meningar, redo att visas. */
  notes: string[]
  currentMomentTitle?: string
}

const AREA_NAMES: Record<CurriculumArea, string> = {
  taluppfattning: 'Taluppfattning',
  algebra: 'Algebra & mönster',
  geometri: 'Geometri',
  sannolikhet: 'Statistik & sannolikhet',
  samband: 'Samband',
  problem: 'Problemlösning',
}

export const areaName = (area: CurriculumArea): string => AREA_NAMES[area]

const daysAgo = (iso: string, now: string): number =>
  Math.floor((new Date(now).getTime() - new Date(iso).getTime()) / 86_400_000)

export function weeklyReport(profile: ChildProfile, now: string): WeeklyReport {
  const week: AnswerRecord[] = profile.answers.filter((a) => daysAgo(a.at, now) < 7)
  // Träffsäkerhet/områdesstatistik räknas BARA på riktig träning. Diagnosen
  // (medvetet på oövat, ~50 % avsiktligt) och blixtpassen (fel "räknas inte")
  // skulle annars dra ned siffrorna och motsäga appens egen inramning.
  const trained = week.filter((a) => a.context !== 'diagnos' && a.context !== 'blixt')
  const answers = trained.length
  const correct = trained.filter((a) => a.correct).length
  const errors = trained.filter((a) => !a.correct)
  const slarv = errors.filter((a) => a.errorKind === 'slarv').length

  const activeDates = new Set(week.map((a) => a.at.slice(0, 10)))
  let totalSeconds = 0
  for (const [date, secs] of Object.entries(profile.usageSeconds)) {
    if (daysAgo(date, now) < 7) totalSeconds += secs
  }

  // Missuppfattningar den här veckan.
  const misCount = new Map<MisconceptionTag, number>()
  for (const a of trained) {
    if (a.misconception && a.misconception !== 'okand' && a.errorKind === 'kunskap') {
      misCount.set(a.misconception, (misCount.get(a.misconception) ?? 0) + 1)
    }
  }
  const topMisconceptions = [...misCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .filter(([, count]) => count >= 2)
    .map(([tag, count]) => ({ tag, count, note: misconceptionInfo(tag).parentNote }))

  // Per område.
  const areaMap = new Map<CurriculumArea, { answers: number; correct: number }>()
  for (const a of trained) {
    const area = momentById(a.momentId).area
    const cur = areaMap.get(area) ?? { answers: 0, correct: 0 }
    cur.answers++
    if (a.correct) cur.correct++
    areaMap.set(area, cur)
  }
  const perArea = [...areaMap.entries()]
    .map(([area, v]) => ({ area, answers: v.answers, accuracy: v.answers ? v.correct / v.answers : 0 }))
    .sort((a, b) => b.answers - a.answers)

  // Noder klarade i veckan: moment med kunskapskoll ('koll'; äldre sparade
  // svar använde 'boss' även för kollen) som nu är behärskade.
  const bossMoments = new Set(week.filter((a) => a.context === 'koll' || a.context === 'boss').map((a) => a.momentId))
  const bossesWon = [...bossMoments].filter((id) => {
    const s = profile.skills[id]
    return s?.mastery === 'mastered' || s?.mastery === 'star'
  }).length

  // Klarspråksnoter.
  const notes: string[] = []
  const currentId = currentMomentId(profile)
  const current = currentId ? momentById(currentId) : undefined
  // Står barnet vid en grind ska föräldern SE det — annars ser det bara ut
  // som att träningen stannat.
  const pendingBoss = bossPendingWorldId(profile)
  const pendingBlixt = pendingBlixtKind(profile)
  if (answers === 0) {
    notes.push('Inga pass den här veckan — kanske dags för en mjuk påminnelse?')
  } else {
    if (current) notes.push(`Tränar just nu på "${current.title}" (${areaName(current.area)}).`)
    else if (pendingBoss) notes.push(`Redo för världsbossen i ${worldById(pendingBoss).name} — nästa steg är att besegra ${worldById(pendingBoss).boss.name}.`)
    else if (pendingBlixt) notes.push(`Flyt-grind: behöver klara blixtpasset "${blixtConfig(pendingBlixt).title}" för att komma vidare (obegränsade försök).`)
    const acc = correct / answers
    if (acc >= 0.85) notes.push('Hög träffsäkerhet — nivån trappas upp automatiskt.')
    else if (acc < 0.55) notes.push('Det har varit tufft den här veckan — motorn har sänkt nivån så det ska kännas lättare.')
    if (errors.length >= 4 && slarv / errors.length > 0.5) {
      notes.push('Mer än hälften av felen ser ut som slarv snarare än kunskapsluckor — träna gärna "läs uppgiften en gång till"-vanan.')
    }
    for (const m of topMisconceptions) notes.push(m.note)
  }

  return {
    activeDays: activeDates.size,
    totalMinutes: Math.round(totalSeconds / 60),
    answers,
    accuracy: answers ? correct / answers : 0,
    bossesWon,
    starsWon: Object.values(profile.skills).filter((s) => s.starWon).length,
    slarvRatio: errors.length ? slarv / errors.length : 0,
    topMisconceptions,
    perArea,
    notes,
    currentMomentTitle: current?.title,
  }
}
