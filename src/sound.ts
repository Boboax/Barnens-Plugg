/* ============================================================
   Ljudmotorn — chiptune-musik och effekter, helt syntetiserad
   med Web Audio API. Inga ljudfiler = fungerar offline och
   väger ingenting.

   iOS kräver en användargest innan ljud får spelas: unlockAudio()
   kopplas till första pekningen (görs i App.tsx). Musik som
   beställts innan dess startar automatiskt när låset släpper.
   ============================================================ */

export type MusicMood = 'varld' | 'boss' | 'blixt'

let ctx: AudioContext | null = null
let master: GainNode | null = null
let musicBus: GainNode | null = null
let sfxBus: GainNode | null = null
let unlocked = false
let pendingMood: MusicMood | null = null
let currentMood: MusicMood | null = null
let stepTimer: number | null = null

const LS_KEY = 'barnens-plugg-ljud'
let muted = typeof localStorage !== 'undefined' && localStorage.getItem(LS_KEY) === 'av'

function ensure(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  if (!ctx) {
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = muted ? 0 : 1
    master.connect(ctx.destination)
    musicBus = ctx.createGain()
    musicBus.gain.value = 0.055
    musicBus.connect(master)
    sfxBus = ctx.createGain()
    sfxBus.gain.value = 0.16
    sfxBus.connect(master)
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

/** Anropas vid första pekningen — låser upp ljudet på iOS. */
export function unlockAudio(): void {
  const c = ensure()
  if (!c) return
  unlocked = true
  if (pendingMood) {
    const mood = pendingMood
    pendingMood = null
    startMusic(mood)
  }
}

export const isMuted = (): boolean => muted

export function setMuted(value: boolean): void {
  muted = value
  try { localStorage.setItem(LS_KEY, value ? 'av' : 'pa') } catch { /* privat läge */ }
  if (master && ctx) master.gain.setTargetAtTime(value ? 0 : 1, ctx.currentTime, 0.05)
}

/* ---------- Tonhjälpare ---------- */

const freq = (base: number, semitones: number): number => base * 2 ** (semitones / 12)

interface ToneOpts {
  at?: number // ctx-tid; default nu
  dur?: number
  type?: OscillatorType
  gain?: number
  slideTo?: number // glid till denna frekvens
  bus?: 'sfx' | 'music'
}

function tone(frequency: number, opts: ToneOpts = {}): void {
  const c = ensure()
  if (!c || !sfxBus || !musicBus) return
  const at = opts.at ?? c.currentTime
  const dur = opts.dur ?? 0.15
  const osc = c.createOscillator()
  osc.type = opts.type ?? 'triangle'
  osc.frequency.setValueAtTime(frequency, at)
  if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(opts.slideTo, at + dur)
  const g = c.createGain()
  g.gain.setValueAtTime(0, at)
  g.gain.linearRampToValueAtTime(opts.gain ?? 1, at + 0.012)
  g.gain.exponentialRampToValueAtTime(0.001, at + dur)
  osc.connect(g)
  g.connect(opts.bus === 'music' ? musicBus : sfxBus)
  osc.start(at)
  osc.stop(at + dur + 0.05)
}

/* ---------- Ljudeffekter ---------- */

const C5 = 523.25

export const sfx = {
  /** Knapptryck — kort mjukt klick. */
  klick(): void {
    tone(freq(C5, 7), { dur: 0.05, type: 'sine', gain: 0.5 })
  },
  /** Rätt svar — glatt tvåtonspling. */
  ratt(): void {
    const c = ensure(); if (!c) return
    tone(freq(C5, 0), { dur: 0.12, gain: 0.9 })
    tone(freq(C5, 7), { at: c.currentTime + 0.09, dur: 0.22, gain: 0.9 })
  },
  /** Fel svar — mjukt och vänligt, aldrig hårt. */
  fel(): void {
    tone(freq(C5, -7), { dur: 0.25, type: 'sine', gain: 0.6, slideTo: freq(C5, -10) })
  },
  /** Sköld knäcks i bosstriden. */
  skold(): void {
    const c = ensure(); if (!c) return
    tone(freq(C5, -2), { dur: 0.06, type: 'square', gain: 0.7 })
    tone(freq(C5, 5), { at: c.currentTime + 0.05, dur: 0.09, type: 'square', gain: 0.6 })
    tone(freq(C5, 12), { at: c.currentTime + 0.11, dur: 0.18, gain: 0.8 })
  },
  /** Bossens fniss när svaret var fel. */
  bossFniss(): void {
    const c = ensure(); if (!c) return
    tone(freq(C5, -14), { dur: 0.09, type: 'square', gain: 0.45 })
    tone(freq(C5, -12), { at: c.currentTime + 0.1, dur: 0.09, type: 'square', gain: 0.45 })
  },
  /** Fanfar — boss besegrad, moment klart. */
  fanfar(): void {
    const c = ensure(); if (!c) return
    const t = c.currentTime
    const notes = [0, 4, 7, 12, 12, 16]
    notes.forEach((n, i) => tone(freq(C5, n), { at: t + i * 0.11, dur: i >= 4 ? 0.4 : 0.14, gain: 0.9 }))
  },
  /** Nytt rekord / stjärnnivå. */
  rekord(): void {
    const c = ensure(); if (!c) return
    const t = c.currentTime
    ;[0, 7, 12, 19, 24].forEach((n, i) => tone(freq(C5, n), { at: t + i * 0.07, dur: 0.16, gain: 0.85 }))
  },
  /** Combo-pling — stiger med combons längd. */
  combo(steps: number): void {
    tone(freq(C5, 12 + Math.min(steps, 8)), { dur: 0.18, gain: 0.8 })
  },
  /** Whoosh — skärmbyte/start. */
  whoosh(): void {
    tone(220, { dur: 0.28, type: 'sine', gain: 0.4, slideTo: 880 })
  },
  /** Tick — sista sekunderna i blixtpasset. */
  tick(): void {
    tone(freq(C5, 12), { dur: 0.04, type: 'square', gain: 0.35 })
  },
}

/* ---------- Musik: stegsekvenser i chiptune-stil ---------- */

interface MoodDef {
  tempo: number // BPM, åttondelar spelas
  wave: OscillatorType
  base: number
  /** Melodi i halvtonssteg från basen; null = paus. Loopas. */
  melody: (number | null)[]
  /** Baston varannan/var fjärde steg; null = paus. */
  bass: (number | null)[]
  melodyGain: number
}

const A3 = 220
const MOODS: Record<MusicMood, MoodDef> = {
  // Äventyrsmusik: lugn pentatonisk vandring, dur.
  varld: {
    tempo: 96, wave: 'triangle', base: A3 * (2 ** (3 / 12)), // C4
    melody: [0, 4, 7, 9, 7, 4, 2, 4, 0, 4, 7, 12, 9, 7, 4, null,
             2, 4, 7, 9, 12, 9, 7, 4, 7, 4, 2, 0, 2, 4, 0, null],
    bass: [-12, null, null, null, -5, null, null, null, -3, null, null, null, -7, null, null, null,
           -12, null, null, null, -5, null, null, null, -3, null, null, null, -5, null, -7, null],
    melodyGain: 0.8,
  },
  // Bossmusik: moll, drivande basgång.
  boss: {
    tempo: 138, wave: 'square', base: A3, // A3 moll
    melody: [0, null, 3, 0, 5, 3, 0, -2, 0, null, 3, 5, 7, 5, 3, 2,
             0, null, 3, 0, 8, 7, 5, 3, 2, 3, 5, 3, 2, 0, -2, null],
    bass: [-12, -12, null, -12, -12, null, -9, null, -12, -12, null, -12, -7, null, -9, null,
           -12, -12, null, -12, -12, null, -9, null, -5, null, -7, null, -12, null, -12, null],
    melodyGain: 0.5,
  },
  // Blixtmusik: snabb puls, framåt.
  blixt: {
    tempo: 160, wave: 'triangle', base: A3 * (2 ** (5 / 12)), // D4
    melody: [0, 7, 12, 7, 0, 7, 12, 14, 0, 7, 12, 7, 2, 9, 14, 9],
    bass: [-12, null, -12, null, -10, null, -10, null, -12, null, -12, null, -7, null, -5, null],
    melodyGain: 0.7,
  },
}

export function startMusic(mood: MusicMood): void {
  if (!unlocked) {
    pendingMood = mood
    return
  }
  if (currentMood === mood && stepTimer !== null) return
  stopMusic()
  const c = ensure()
  if (!c) return
  currentMood = mood
  const def = MOODS[mood]
  const stepSeconds = 60 / def.tempo / 2 // åttondelar
  let step = 0
  const playStep = (): void => {
    const at = c.currentTime + 0.02
    const m = def.melody[step % def.melody.length]
    const b = def.bass[step % def.bass.length]
    if (m !== null) tone(freq(def.base, m), { at, dur: stepSeconds * 0.9, type: def.wave, gain: def.melodyGain, bus: 'music' })
    if (b !== null) tone(freq(def.base, b), { at, dur: stepSeconds * 1.7, type: 'sine', gain: 1.0, bus: 'music' })
    step++
  }
  playStep()
  stepTimer = window.setInterval(playStep, stepSeconds * 1000)
}

export function stopMusic(): void {
  if (stepTimer !== null) {
    window.clearInterval(stepTimer)
    stepTimer = null
  }
  currentMood = null
  pendingMood = null
}
