import type { PetSpeciesId } from '../domain/pet-home'

/* Husdjurens läten: korta, tysta fantasiljud syntetiserade med Web Audio
   (inga ljudfiler — samma princip som sound.ts). AudioContext skapas först
   inne i en användargest, annars förblir den stum på iOS. */

type Tone = (start: number, duration: number, from: number, to: number, volume: number, type?: OscillatorType) => void

const VOICES: Record<PetSpeciesId, (tone: Tone) => void> = {
  // Grodan: tre mjuka kvack med en svag överton.
  'woodland-frog': (tone) => {
    for (let i = 0; i < 3; i++) {
      tone(i * 0.14, 0.18, 185, 105, 0.055, 'triangle')
      tone(i * 0.14, 0.16, 510, 340, 0.016)
    }
  },
  // Räven: ett nyfiket, stigande och fallande pip.
  'dune-fox': (tone) => {
    tone(0, 0.22, 760, 1150, 0.04)
    tone(0.2, 0.3, 1050, 620, 0.035)
    tone(0.02, 0.18, 1520, 2000, 0.007)
  },
  // Axolotlen: fyra små bubblor uppåt.
  'reef-axolotl': (tone) => {
    for (let i = 0; i < 4; i++) tone(i * 0.12, 0.16, 280 + i * 90, 720 + i * 140, 0.04)
  },
}

/** Minsta tid mellan två läten — ett barn som trummar på knappen ska inte
    få en kakofoni. */
const COOLDOWN_MS = 1400

export class PetSounds {
  private context: AudioContext | undefined
  private voices = new Set<OscillatorNode>()
  private last = -Infinity
  private count = 0

  stop(): void {
    for (const voice of this.voices) {
      try { voice.stop() } catch { /* redan slut */ }
    }
    this.voices.clear()
  }

  dispose(): void {
    this.stop()
    void this.context?.close().catch(() => undefined)
    this.context = undefined
  }

  play(species: PetSpeciesId): void {
    const now = performance.now()
    if (now - this.last < COOLDOWN_MS || document.hidden) return
    try {
      const Ctor = window.AudioContext
        ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return
      this.context ??= new Ctor()
      const ctx = this.context
      if (ctx.state === 'suspended') void ctx.resume().catch(() => undefined)
      this.stop()
      this.last = now
      // Liten tonhöjdsvariation så samma vän inte låter exakt likadant varje gång.
      const variation = [1, 0.94, 1.06][this.count++ % 3]
      const tone: Tone = (start, duration, from, to, volume, type = 'sine') => {
        const voice = ctx.createOscillator()
        const gain = ctx.createGain()
        const t = ctx.currentTime + start
        voice.type = type
        voice.frequency.setValueAtTime(from * variation, t)
        voice.frequency.exponentialRampToValueAtTime(to * variation, t + duration)
        gain.gain.setValueAtTime(0, t)
        gain.gain.linearRampToValueAtTime(volume, t + 0.025)
        gain.gain.exponentialRampToValueAtTime(0.0001, t + duration)
        voice.connect(gain)
        gain.connect(ctx.destination)
        this.voices.add(voice)
        voice.onended = () => { voice.disconnect(); gain.disconnect(); this.voices.delete(voice) }
        voice.start(t)
        voice.stop(t + duration + 0.02)
      }
      VOICES[species](tone)
    } catch {
      // Ljudet får aldrig stoppa omsorgen om djuret.
      this.stop()
    }
  }
}
