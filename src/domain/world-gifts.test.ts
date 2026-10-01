import { describe, expect, it } from 'vitest'
import { WORLD_GIFTS, bossGiftForWorld, giftsForWorld, unclaimedGifts } from './world-gifts'
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
})
