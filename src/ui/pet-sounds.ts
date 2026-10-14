import type { PetSpeciesId } from '../domain/pet-home'
import { sfxOutput } from '../sound'

/* Vännernas läten: korta fantasiljud syntetiserade med Web Audio (inga
   ljudfiler — samma princip som sound.ts).

   Omgjort okt 2026 (föräldern hörde inget): grodans kvack låg runt
   100–185 Hz, under vad iPadens högtalare återger, och mycket svagt, och
   lätena spelades i en egen AudioContext som iPad håller tyst när första
   ljudet kommer efter en fördröjning (godbiten som landar, bollen som
   kommer tillbaka). Nu går allt genom appens effektbuss — redan upplåst
   vid första pekningen, styrd av effektreglaget och ljud av/på — i ett
   tonläge som hörs, med ett eget läte för varje handling. */

export type PetSoundKind = 'happy' | 'pet' | 'eat' | 'play' | 'love' | 'wake'

type Tone = (start: number, duration: number, from: number, to: number, volume: number, type?: OscillatorType) => void
type Noise = (start: number, duration: number, volume: number, freq: number) => void
interface Kit { tone: Tone; noise: Noise }

/** Artens röst — kort "jag"-läte som används i alla handlingar. */
const VOICE: Record<PetSpeciesId, (k: Kit, at: number, pitch: number) => void> = {
  // Grodan: ett runt "kvack" med tydlig överton (hörs i små högtalare).
  'woodland-frog': ({ tone }, at, p) => {
    tone(at, 0.16, 420 * p, 260 * p, 0.55, 'triangle')
    tone(at, 0.14, 840 * p, 560 * p, 0.22, 'square')
    tone(at + 0.17, 0.14, 380 * p, 240 * p, 0.45, 'triangle')
  },
  // Räven: ett nyfiket stigande och fallande gnäll.
  'dune-fox': ({ tone }, at, p) => {
    tone(at, 0.2, 760 * p, 1180 * p, 0.45)
    tone(at + 0.18, 0.26, 1080 * p, 640 * p, 0.4)
  },
  // Axolotlen: små bubblor uppåt.
  'reef-axolotl': ({ tone }, at, p) => {
    for (let i = 0; i < 4; i++) tone(at + i * 0.09, 0.12, (380 + i * 110) * p, (820 + i * 160) * p, 0.4)
  },
  // Draken: kristallklart kvitter med glittrig efterklang.
  'crystal-dragon': ({ tone }, at, p) => {
    tone(at, 0.18, 1320 * p, 1760 * p, 0.38)
    tone(at + 0.15, 0.24, 1760 * p, 1480 * p, 0.32)
    tone(at + 0.05, 0.4, 2640 * p, 2900 * p, 0.1)
  },
}

/** Handlingarna: rösten i olika lynne plus det som hör till handlingen. */
const ACTIONS: Record<PetSoundKind, (k: Kit, species: PetSpeciesId) => void> = {
  happy: (k, sp) => VOICE[sp](k, 0, 1),
  // Klapp: lugnt, lite lägre och mjukare — som ett nöjt kurr.
  pet: (k, sp) => {
    k.tone(0, 0.5, 330, 300, 0.25, 'sine')
    k.tone(0, 0.5, 336, 304, 0.18, 'sine') // svävning = kurr
    VOICE[sp](k, 0.35, 0.9)
  },
  // Äta: tre små tugg (brus) och ett nöjt läte efteråt.
  eat: (k, sp) => {
    for (let i = 0; i < 3; i++) k.noise(i * 0.16, 0.07, 0.5, 1800)
    VOICE[sp](k, 0.55, 1.05)
  },
  // Leka: pigg och lite högre, två gånger.
  play: (k, sp) => {
    VOICE[sp](k, 0, 1.15)
    VOICE[sp](k, 0.3, 1.25)
  },
  wake: (k, sp) => {
    k.tone(0, 0.45, 300, 520, 0.25, 'sine') // gäsp uppåt
    VOICE[sp](k, 0.45, 1)
  },
  // Favoritgodiset: tugg, ett glädjeskutt i tre steg uppåt och ett
  // glittrigt "pling-pling" — det största lätet vännen har.
  love: (k, sp) => {
    for (let i = 0; i < 2; i++) k.noise(i * 0.14, 0.06, 0.45, 1800)
    VOICE[sp](k, 0.3, 1.1)
    VOICE[sp](k, 0.62, 1.3)
    VOICE[sp](k, 0.94, 1.5)
    const sparkle = [1568, 1976, 2349, 3136]
    sparkle.forEach((f, i) => k.tone(1.25 + i * 0.08, 0.35, f, f * 1.01, 0.22, 'triangle'))
  },
}

/** Minsta tid mellan två läten — ett barn som trummar på vännen ska inte
    få en kakofoni. Favoritgodiset går alltid fram. */
const COOLDOWN_MS = 1200

export class PetSounds {
  private voices = new Set<AudioScheduledSourceNode>()
  private last = -Infinity
  private count = 0

  stop(): void {
    for (const voice of this.voices) {
      try { voice.stop() } catch { /* redan slut */ }
    }
    this.voices.clear()
  }

  dispose(): void { this.stop() }

  play(species: PetSpeciesId, kind: PetSoundKind = 'happy'): void {
    const now = performance.now()
    if ((kind !== 'love' && now - this.last < COOLDOWN_MS) || document.hidden) return
    try {
      const out = sfxOutput()
      if (!out) return
      const { ctx, bus } = out
      if (ctx.state === 'suspended') void ctx.resume().catch(() => undefined)
      this.stop()
      this.last = now
      // Liten tonhöjdsvariation så samma vän inte låter exakt likadant varje gång.
      const variation = [1, 0.95, 1.05][this.count++ % 3]
      const track = (node: AudioScheduledSourceNode, gain: GainNode): void => {
        this.voices.add(node)
        node.onended = () => { node.disconnect(); gain.disconnect(); this.voices.delete(node) }
      }
      const tone: Tone = (start, duration, from, to, volume, type = 'sine') => {
        const voice = ctx.createOscillator()
        const gain = ctx.createGain()
        const t = ctx.currentTime + start
        voice.type = type
        voice.frequency.setValueAtTime(from * variation, t)
        voice.frequency.exponentialRampToValueAtTime(Math.max(20, to * variation), t + duration)
        gain.gain.setValueAtTime(0, t)
        gain.gain.linearRampToValueAtTime(volume, t + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.0001, t + duration)
        voice.connect(gain)
        gain.connect(bus)
        track(voice, gain)
        voice.start(t)
        voice.stop(t + duration + 0.02)
      }
      const noise: Noise = (start, duration, volume, freq) => {
        const len = Math.max(1, Math.floor(ctx.sampleRate * duration))
        const buffer = ctx.createBuffer(1, len, ctx.sampleRate)
        const data = buffer.getChannelData(0)
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
        const src = ctx.createBufferSource()
        src.buffer = buffer
        const filter = ctx.createBiquadFilter()
        filter.type = 'bandpass'
        filter.frequency.value = freq
        const gain = ctx.createGain()
        const t = ctx.currentTime + start
        gain.gain.setValueAtTime(volume, t)
        gain.gain.exponentialRampToValueAtTime(0.0001, t + duration)
        src.connect(filter)
        filter.connect(gain)
        gain.connect(bus)
        track(src, gain)
        src.start(t)
        src.stop(t + duration + 0.02)
      }
      ACTIONS[kind]({ tone, noise }, species)
    } catch {
      // Ljudet får aldrig stoppa omsorgen om djuret.
      this.stop()
    }
  }
}
