import { describe, expect, it } from 'vitest'
import { existsSync } from 'node:fs'
import { readyPetAnimations } from './campArt'

/* Varje rörelseremsa som appen tror finns måste finnas på disk — annars
   visar vännen en tom ruta i stället för stillbilden. */
describe('vännernas rörelseremsor', () => {
  it('varje registrerad remsa finns som fil', () => {
    const keys = readyPetAnimations()
    expect(keys.length).toBeGreaterThan(80)
    for (const key of keys) {
      const m = /^(.+)-(\d)-(\w+)$/.exec(key)!
      expect(existsSync(`public/art/camp/anim/${m[1]}-age-${m[2]}-${m[3]}.webp`), key).toBe(true)
    }
  })
})
