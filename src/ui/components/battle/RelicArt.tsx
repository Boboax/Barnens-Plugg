import type { WorldGift } from '../../../domain/world-gifts'

/* Bossrelikens målade bild (art/relics/relic-<id>.webp). En relik utan
   bild — en ny värld innan grafiken finns — visas som relikens tecken i
   ett gyllene medaljong-sigill. Lägg relikens id i RELIC_ART_READY när
   bilden finns. */

const RELIC_ART_READY: ReadonlySet<string> = new Set([
  'dalen-sigill', 'skogen-relik', 'brak-relik', 'monster-relik', 'former-relik', 'diagram-relik', 'samband-relik',
])

export function RelicArt({ relic, size, dim = false }: { relic: WorldGift; size: number; dim?: boolean }) {
  if (RELIC_ART_READY.has(relic.id)) {
    return (
      <img
        className={`relic-art${dim ? ' relic-art--dim' : ''}`}
        src={`${import.meta.env.BASE_URL}art/relics/relic-${relic.id}.webp`}
        alt={relic.name}
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <span
      className={`relic-medallion${dim ? ' relic-art--dim' : ''}`}
      role="img"
      aria-label={relic.name}
      style={{ width: size, height: size, fontSize: size * 0.48 }}
    >
      {relic.emoji}
    </span>
  )
}
