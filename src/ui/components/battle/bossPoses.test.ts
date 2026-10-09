/// <reference types="node" />
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { WORLDS } from '../../../domain/worlds'
import { BOSS_POSES, bossPlayback } from './bossPoses'

/* Varje världsboss har en komplett bildserie och varje följd pekar på
   bildrutor som finns — en saknad fil blir en tom ruta mitt i striden. */
describe('bossarnas bildrutor', () => {
  const art = (p: string) => fileURLToPath(new URL(`../../../../public/art/${p}`, import.meta.url))

  it('alla sju världsbossar har animationer och alla filer finns', () => {
    for (const world of WORLDS) {
      const set = BOSS_POSES[world.boss.id]
      expect(set, world.boss.id).toBeDefined()
      for (const f of set.frames) expect(existsSync(art(f)), f).toBe(true)
    }
  })

  it('varje följd pekar på giltiga rutor och har en tidpunkt per ruta', () => {
    for (const world of WORLDS) {
      for (const seq of ['attack', 'hit', 'defeat'] as const) {
        const p = bossPlayback(world.boss.id, seq)!
        expect(p.frames).toHaveLength(p.timing.length)
        for (const i of p.frames) expect(i).toBeLessThan(BOSS_POSES[world.boss.id].frames.length)
      }
    }
  })
})
