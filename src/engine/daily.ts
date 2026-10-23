import type { AnswerRecord, ChildProfile } from '../domain/types'
import { momentById } from '../domain/curriculum'

/* ============================================================
   Dag för dag — föräldrarnas fokusbild.

   Föräldrarnas fråga (okt 2026): "gör barnen sitt bästa, eller sitter de
   bara av tiden?" Ingen enskild siffra svarar på det, så rapporten ställer
   ihop flera spår som var för sig är svåra att fuska med:

   - Aktiv tid räknas bara vid pekning (App.tsx) — PAUSAD tid (appen framme,
     ingen pekning på 90 s) bokförs separat, så "lät plattan ligga" syns.
   - Gissningar: fel svar på under GUESS_MS. Man hinner inte läsa och räkna
     så fort; många sådana betyder att barnet trycker sig igenom.
   - Tempo: uppgifter per aktiv minut. Mycket lågt tempo med aktiv tid
     betyder att fingret rör sig men uppgifterna inte blir gjorda.
   - Ork: träffsäkerheten i dagens första mot andra halva.

   Språket är en lärares, aldrig en anklagelse: signalerna är skäl att
   prata med barnet, inte domar. Diagnosen och blixtpassen räknas i
   antal men inte i träffsäkerhet/gissningar (samma skäl som veckorapporten:
   diagnosen är medvetet på oövat, blixten är gjord för att gå fort).
   ============================================================ */

/** Fel svar snabbare än så räknas som gissning. */
export const GUESS_MS = 2500
/** Ett nytt pass börjar efter så här långt uppehåll mellan svar. */
const SESSION_GAP_MS = 10 * 60_000

export type DayVerdict = 'fokus' | 'blandat' | 'obs' | 'kort' | 'vila'

export interface DaySignal { tone: 'bra' | 'obs'; text: string }

export interface DayStats {
  date: string
  activeMinutes: number
  idleMinutes: number
  campMinutes: number
  /** Alla svar, även diagnos och blixt. */
  answers: number
  /** Svar i riktig träning (utan diagnos/blixt) — grunden för procenten. */
  trained: number
  correct: number
  accuracy: number | null
  guesses: number
  medianSeconds: number | null
  perMinute: number | null
  firstAt?: string
  lastAt?: string
  sessions: number
  moments: { id: string; title: string; answers: number; correct: number }[]
  signals: DaySignal[]
  verdict: DayVerdict
}

const dayKey = (iso: string): string => iso.slice(0, 10)
const minutes = (secs: number | undefined): number => Math.round((secs ?? 0) / 60)
const pct = (x: number): string => `${Math.round(x * 100)} %`

const median = (xs: number[]): number | null => {
  if (xs.length === 0) return null
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

const isTrained = (a: AnswerRecord): boolean => a.context !== 'diagnos' && a.context !== 'blixt'

export function dayStats(profile: ChildProfile, date: string): DayStats {
  const day = profile.answers.filter((a) => dayKey(a.at) === date)
  const trained = day.filter(isTrained)
  const correct = trained.filter((a) => a.correct).length
  const guesses = trained.filter((a) => !a.correct && a.elapsedMs < GUESS_MS).length
  const activeMinutes = minutes(profile.usageSeconds[date])
  const idleMinutes = minutes(profile.idleSeconds?.[date])
  const campMinutes = minutes(profile.campSeconds?.[date])
  const med = median(trained.map((a) => a.elapsedMs))

  let sessions = 0
  let prev = 0
  for (const a of day) {
    const t = new Date(a.at).getTime()
    if (sessions === 0 || t - prev > SESSION_GAP_MS) sessions++
    prev = t
  }

  const byMoment = new Map<string, { answers: number; correct: number }>()
  for (const a of trained) {
    const m = byMoment.get(a.momentId) ?? { answers: 0, correct: 0 }
    m.answers++
    if (a.correct) m.correct++
    byMoment.set(a.momentId, m)
  }
  const moments = [...byMoment.entries()]
    .map(([id, v]) => ({ id, title: momentById(id).title, ...v }))
    .sort((a, b) => b.answers - a.answers)

  const accuracy = trained.length ? correct / trained.length : null
  const perMinute = activeMinutes >= 1 ? day.length / activeMinutes : null
  const signals: DaySignal[] = []

  if (trained.length >= 4 && guesses >= 3 && guesses / trained.length >= 0.2) {
    signals.push({ tone: 'obs', text: `${guesses} snabba gissningar — fel svar på under ${String(GUESS_MS / 1000).replace('.', ',')} sekunder (${pct(guesses / trained.length)} av svaren). Så fort hinner man inte läsa och räkna.` })
  }
  if (idleMinutes >= 3 && idleMinutes / (activeMinutes + idleMinutes) >= 0.25) {
    signals.push({ tone: 'obs', text: `${idleMinutes} min pauser då appen låg framme utan att någon rörde skärmen (räknas inte som träningstid).` })
  }
  if (activeMinutes >= 6 && perMinute !== null && perMinute < 0.6) {
    signals.push({ tone: 'obs', text: `Lågt tempo: ${perMinute.toFixed(1).replace('.', ',')} uppgifter per aktiv minut. Kan vara långa funderingar — eller att tiden gick åt till annat.` })
  }
  if (trained.length >= 12) {
    const half = Math.floor(trained.length / 2)
    const first = trained.slice(0, half).filter((a) => a.correct).length / half
    const second = trained.slice(half).filter((a) => a.correct).length / (trained.length - half)
    if (first - second >= 0.3) {
      signals.push({ tone: 'obs', text: `Träffsäkerheten sjönk under dagen (${pct(first)} → ${pct(second)}) — kanske trött mot slutet.` })
    }
  }
  // Spärren (engine/struggle.ts): Pi stannade upp gissningar, barnet kämpade
  // eller tryckte "För svårt?". Att säga till är bra — det formuleras så.
  const struggles = (profile.struggles ?? []).filter((e) => dayKey(e.at) === date)
  const stopped = struggles.filter((e) => e.kind === 'gissar').length
  const tooHard = struggles.filter((e) => e.kind !== 'gissar')
  if (stopped > 0) {
    signals.push({ tone: 'obs', text: `Pi stannade upp ${stopped} ${stopped === 1 ? 'gång' : 'gånger'} för snabba gissningar och bad barnet läsa och tänka efter.` })
  }
  if (tooHard.length > 0) {
    const titles = [...new Set(tooHard.map((e) => momentById(e.momentId).title))].join(', ')
    signals.push({ tone: 'obs', text: `Kämpigt: ${titles} (${tooHard.length} ${tooHard.length === 1 ? 'gång' : 'gånger'} — själv sagt "för svårt" eller nästan inget rätt i följd). Bra att barnet säger till; prata gärna om momentet eller titta på filmen tillsammans.` })
  }
  const warnings = signals.length
  if (warnings === 0 && trained.length >= 8) {
    signals.push({ tone: 'bra', text: 'Jämnt tempo, få gissningar och inga långa pauser — koncentrerat arbete.' })
  }
  if (accuracy !== null && trained.length >= 8 && accuracy >= 0.85) {
    signals.push({ tone: 'bra', text: `Hög träffsäkerhet (${pct(accuracy)}).` })
  }

  const verdict: DayVerdict =
    day.length === 0 && activeMinutes < 1 ? 'vila'
      : warnings >= 2 ? 'obs'
        : warnings === 1 ? 'blandat'
          : trained.length < 5 ? 'kort'
            : 'fokus'

  if (verdict === 'vila' && idleMinutes >= 2) {
    signals.push({ tone: 'obs', text: `Appen låg framme ${idleMinutes} min utan att någon tränade.` })
  }

  return {
    date, activeMinutes, idleMinutes, campMinutes,
    answers: day.length, trained: trained.length, correct, accuracy, guesses,
    medianSeconds: med === null ? null : Math.round(med / 100) / 10,
    perMinute,
    firstAt: day[0]?.at, lastAt: day[day.length - 1]?.at,
    sessions, moments, signals, verdict,
  }
}

/** De senaste `days` dagarna, nyaste först (även dagar utan träning). */
export function dailyStats(profile: ChildProfile, now: string, days = 14): DayStats[] {
  const end = new Date(`${dayKey(now)}T12:00:00Z`).getTime()
  return Array.from({ length: days }, (_, i) => dayStats(profile, new Date(end - i * 86_400_000).toISOString().slice(0, 10)))
}

/** Perioden i klarspråk — det föräldern vill veta innan siffrorna. */
export function periodSummary(name: string, stats: DayStats[]): string[] {
  const worked = stats.filter((d) => d.verdict !== 'vila')
  if (worked.length === 0) return [`${name} har inte tränat under perioden.`]
  const notes: string[] = []
  const totalActive = worked.reduce((s, d) => s + d.activeMinutes, 0)
  notes.push(`${name} tränade ${worked.length} av ${stats.length} dagar, i snitt ${Math.round(totalActive / worked.length)} aktiva minuter per träningsdag.`)
  const focus = worked.filter((d) => d.verdict === 'fokus').length
  const flagged = worked.filter((d) => d.verdict === 'obs').length
  const mixed = worked.filter((d) => d.verdict === 'blandat').length
  if (flagged === 0 && mixed === 0) notes.push('Inga tecken på att tiden suttits av: inga dagar med många gissningar eller långa pauser.')
  else notes.push(`Fokus: ${focus} ${focus === 1 ? 'dag' : 'dagar'} koncentrerat, ${mixed} med någon varningssignal, ${flagged} med flera. Titta på de markerade dagarna nedan och prata gärna om dem.`)
  const totalIdle = worked.reduce((s, d) => s + d.idleMinutes, 0)
  if (totalIdle >= 10) notes.push(`Sammanlagt ${totalIdle} min pauser under perioden (appen framme men orörd) — de räknas inte av från dagens tid.`)
  const guesses = worked.reduce((s, d) => s + d.guesses, 0)
  const trained = worked.reduce((s, d) => s + d.trained, 0)
  if (trained >= 20 && guesses / trained >= 0.15) notes.push(`${pct(guesses / trained)} av alla svar var snabba gissningar — påminn gärna om att läsa uppgiften färdigt; tiden räcker.`)
  // Trend: andra halvan av perioden mot första.
  const mid = Math.floor(stats.length / 2)
  const acc = (ds: DayStats[]): number | null => {
    const t = ds.reduce((s, d) => s + d.trained, 0)
    return t >= 15 ? ds.reduce((s, d) => s + d.correct, 0) / t : null
  }
  const recent = acc(stats.slice(0, mid))
  const earlier = acc(stats.slice(mid))
  if (recent !== null && earlier !== null && Math.abs(recent - earlier) >= 0.1) {
    notes.push(recent > earlier
      ? `Träffsäkerheten har gått upp (${pct(earlier)} → ${pct(recent)}).`
      : `Träffsäkerheten har gått ned (${pct(earlier)} → ${pct(recent)}) — ofta för att svårare moment har öppnats; motorn anpassar nivån.`)
  }
  const camp = worked.reduce((s, d) => s + d.campMinutes, 0)
  if (camp > 0) notes.push(`${camp} min i Kvällslägret (belöningstid efter passen — räknas inte som mattetid).`)
  return notes
}
