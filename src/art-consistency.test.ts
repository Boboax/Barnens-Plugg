/// <reference types="node" />
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { CAMP_CATALOG } from './domain/camp'

/* Vaktregel för grafikens enhetlighet (förälderns krav, okt 2026).

   All grafik i appen är målad i EN stil (docs/GRAFIKBESTALLNING.md →
   "Stil (gäller alla bilder)") och beställs med referensbild. Tidsmaskinen
   gick ut med en platt vektorteckning som AI-assistenten ritat själv — den
   stack ut bland de målade sakerna i boden. Ett test kan inte bedöma stil,
   men det kan fånga det som skiljer en platshållare från en leverans:
   målade leveranser är minst ~500 px, egenritade platshållare mindre.

   PENDING_ART: tillfälliga platshållare som VÄNTAR på en beställning i
   GRAFIKBESTALLNING.md. Varje rad måste finnas beställd där — och ska
   tas bort härifrån när den målade bilden är inlagd. */

const PENDING_ART: Record<string, string> = {}

// Godiset visas bara i ~40 px och är medvetet nedskalat till 192 px vid
// inläggningen; övriga saker visas stort i boden och lägret.
const minPaintedPx = (kind: string): number => (kind === 'treat' ? 160 : 500)

/** Bredd/höjd ur en webp-fil (VP8, VP8L eller VP8X), utan beroenden. */
function webpSize(buf: Buffer): { w: number; h: number } {
  const chunk = buf.toString('ascii', 12, 16)
  if (chunk === 'VP8X') return { w: 1 + buf.readUIntLE(24, 3), h: 1 + buf.readUIntLE(27, 3) }
  if (chunk === 'VP8L') {
    const b = buf.readUInt32LE(21)
    return { w: 1 + (b & 0x3fff), h: 1 + ((b >> 14) & 0x3fff) }
  }
  return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff }
}

describe('grafikens enhetlighet', () => {
  const orders = readFileSync(fileURLToPath(new URL('../docs/GRAFIKBESTALLNING.md', import.meta.url)), 'utf8')

  it('varje sak i boden har en målad bild i full storlek (eller en beställd platshållare)', () => {
    for (const item of CAMP_CATALOG) {
      const path = fileURLToPath(new URL(`../public/art/camp/items/${item.art}.webp`, import.meta.url))
      expect(existsSync(path), `${item.art}.webp saknas`).toBe(true)
      const { w, h } = webpSize(readFileSync(path))
      if (PENDING_ART[item.art]) continue
      expect(Math.max(w, h), `${item.art}.webp är ${w}×${h} — ser ut som en platshållare, beställ målad grafik`).toBeGreaterThanOrEqual(minPaintedPx(item.kind))
    }
  })

  it('varje platshållare är beställd i GRAFIKBESTALLNING.md', () => {
    for (const [art, order] of Object.entries(PENDING_ART)) {
      expect(orders, `${art} ska vara beställd`).toContain(`${art}.png`)
      expect(orders).toContain(order)
    }
  })
})
