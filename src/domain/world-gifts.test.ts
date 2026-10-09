import { describe, expect, it } from 'vitest'
import { WORLD_GIFTS, bossGiftForWorld, eligibleChestGifts, giftsForWorld, unclaimedGifts } from './world-gifts'
import { WORLDS } from './worlds'

describe('världsgåvor', () => {
  it('har tre vardagsgåvor och en bossrelik per värld', () => {
    for (const world of WORLDS) {
      expect(giftsForWorld(world.id)).toHaveLength(3)
      expect(bossGiftForWorld(world.id)?.kind).toBe('boss')
    }
    expect(WORLD_GIFTS).toHaveLength(WORLDS.length * 4)
  })

  it('erbjuder aldrig redan valda gåvor igen', () => {
    const gifts = giftsForWorld('sambandsgrottan')
    expect(unclaimedGifts('sambandsgrottan', [gifts[0].id]).map((gift) => gift.id))
      .toEqual(gifts.slice(1).map((gift) => gift.id))
  })

  it('tar bara med husdjursgåvan när barnet har ett djur från samma värld', () => {
    expect(eligibleChestGifts('monsterskogen').map((gift) => gift.kind))
      .toEqual(['world', 'camp'])
    expect(eligibleChestGifts('monsterskogen', [], ['monsterskogen']).map((gift) => gift.kind))
      .toEqual(['world', 'pet', 'camp'])
  })

  it('lämnar en låst husdjursgåva till en framtida kista', () => {
    const claimed = giftsForWorld('monsterskogen')
      .filter((gift) => gift.kind !== 'pet')
      .map((gift) => gift.id)
    expect(eligibleChestGifts('monsterskogen', claimed)).toEqual([])
    expect(eligibleChestGifts('monsterskogen', claimed, ['monsterskogen']).map((gift) => gift.kind))
      .toEqual(['pet'])
  })

  it('husdjursgåvan följer världen där barnets vän hittades', () => {
    // Grodan som hittades i Urtalens dal öppnar dalens leksak, inte gläntans.
    expect(eligibleChestGifts('talens-dal', [], ['talens-dal']).map((gift) => gift.kind))
      .toEqual(['world', 'pet', 'camp'])
    expect(eligibleChestGifts('monsterskogen', [], ['talens-dal']).map((gift) => gift.kind))
      .toEqual(['world', 'camp'])
  })

  it('kistan delar aldrig ut bossreliken', () => {
    for (const world of WORLDS) {
      expect(eligibleChestGifts(world.id, [], [world.id]).some((gift) => gift.kind === 'boss')).toBe(false)
    }
  })
})
