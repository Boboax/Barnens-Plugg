/// <reference types="node" />
import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/* Vaktregel för bildbudgeten.

   PWA:n precachar ALLA bilder i public/ (globPatterns i vite.config.ts) —
   varje iPad laddar alltså ned hela public/art vid första start och vid
   varje ny version, ofta över mobilnät, och allt räknas mot Safaris
   lagringskvot (som iOS kan rensa när den fylls). Preview-grenen med
   lägret och bossanimationerna växte tyst från 3 till 31 MB. Taket gör
   att nästa tunga leverans syns här i stället för som en trasig
   installation på en platta. Höj det inte utan att först banta (webp,
   färre bildrutor) — se docs/PLAN-LAGER.md, etapp 0. */

const ART_LIMIT_MB = 12

function folderBytes(dir: string): number {
  return readdirSync(dir).reduce((sum, name) => {
    const path = join(dir, name)
    const stat = statSync(path)
    return sum + (stat.isDirectory() ? folderBytes(path) : stat.size)
  }, 0)
}

describe('bildbudget', () => {
  it(`public/art ryms under ${ART_LIMIT_MB} MB`, () => {
    const art = fileURLToPath(new URL('../public/art', import.meta.url))
    const mb = folderBytes(art) / 1024 / 1024
    expect(mb).toBeLessThan(ART_LIMIT_MB)
  })
})
