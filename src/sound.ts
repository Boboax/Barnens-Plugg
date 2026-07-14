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
  // Låtarna är riktiga ljudfiler (utanför Web Audio-mastern) — styr separat.
  if (value) mCurrent?.pause()
  else if (mCurrent) gesturePlay(mCurrent)
}

/* ---------- Musikregissör (riktiga låtfiler) ----------
   Medvetet undantag från "inga ljudfiler"-principen: målade låtar.
   - 'start' : startlåten spelas EN gång (klipps inte när man går till kartan).
   - 'spel'  : när startlåten är slut loopar temalåten som bakgrund.
   - 'boss'  : de två bosslåtarna spelas om vartannat i loop tills striden är slut.
   Spelas via HTMLAudioElement, respekterar ljud av/på, och försöker igen vid
   första gest om webbläsaren blockerar autoplay. Ligger utanför PWA-precachen. */
type MusicScene = 'start' | 'spel' | 'boss'
const B = import.meta.env.BASE_URL
const URL_START = `${B}audio/startlat.mp3`
const URL_THEME = `${B}audio/temalat.mp3`
const URL_BOSS = [`${B}audio/bosslat.mp3`, `${B}audio/bosslat2.mp3`]

let mScene: MusicScene | null = null
let mCurrent: HTMLAudioElement | null = null
let startEnded = false
let trkStart: HTMLAudioElement | null = null
let trkTheme: HTMLAudioElement | null = null
const trkBoss: (HTMLAudioElement | null)[] = [null, null]

function mkTrack(url: string, loop: boolean): HTMLAudioElement {
  const a = new Audio(url); a.loop = loop; a.preload = 'auto'; a.volume = 0.5; return a
}
function gesturePlay(a: HTMLAudioElement): void {
  if (muted) return
  a.play().catch(() => {
    const retry = (): void => {
      window.removeEventListener('pointerdown', retry)
      window.removeEventListener('keydown', retry)
      if (mCurrent === a && !muted) void a.play().catch(() => { /* ge upp tyst */ })
    }
    window.addEventListener('pointerdown', retry, { once: true })
    window.addEventListener('keydown', retry, { once: true })
  })
}
function setCurrent(a: HTMLAudioElement): void {
  mCurrent = a
  for (const t of [trkStart, trkTheme, trkBoss[0], trkBoss[1]]) if (t && t !== a) t.pause()
  gesturePlay(a)
}
function playThemeLoop(): void {
  if (!trkTheme) trkTheme = mkTrack(URL_THEME, true)
  setCurrent(trkTheme)
}
function ensureStart(): HTMLAudioElement {
  if (!trkStart) {
    trkStart = mkTrack(URL_START, false)
    // När startlåten tar slut tar temalåten vid (om vi inte är i en boss).
    trkStart.onended = () => { startEnded = true; if (mScene === 'spel' || mScene === 'start') playThemeLoop() }
  }
  return trkStart
}
function playStartOnce(): void { setCurrent(ensureStart()) }

/** Börja hämta startlåten redan under laddningsskärmen så den kan starta
    direkt när barnet trycker vidare (annars märks fördröjningen första gången). */
export function preloadStartSong(): void { ensureStart().load() }
function playBossLoop(): void {
  if (!trkBoss[0]) {
    trkBoss[0] = mkTrack(URL_BOSS[0], false)
    trkBoss[1] = mkTrack(URL_BOSS[1], false)
    // De två bosslåtarna växlar i evig loop tills scenen byts.
    trkBoss[0].onended = () => { if (mScene === 'boss' && trkBoss[1]) setCurrent(trkBoss[1]) }
    trkBoss[1].onended = () => { if (mScene === 'boss' && trkBoss[0]) setCurrent(trkBoss[0]) }
  }
  setCurrent(trkBoss[0]!)
}

/** Väljer musikscen efter appens läge. Idempotent: samma scen återupptar bara. */
export function setMusicScene(scene: MusicScene): void {
  if (scene === mScene) {
    if (mCurrent && !muted && mCurrent.paused) gesturePlay(mCurrent)
    return
  }
  mScene = scene
  if (scene === 'boss') playBossLoop()
  else if (scene === 'start') { if (!startEnded) playStartOnce(); else playThemeLoop() }
  else {
    // 'spel': låt startlåten spela klart om den fortfarande går, annars tema.
    if (trkStart && !startEnded && mCurrent === trkStart) {
      trkBoss[0]?.pause(); trkBoss[1]?.pause()
    } else playThemeLoop()
  }
}

/** Pausar musiken utan att glömma scenen (t.ex. när Pi somnar). */
export function pauseMusic(): void { mCurrent?.pause() }

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
