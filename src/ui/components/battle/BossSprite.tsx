import { useEffect, useState } from 'react'
import type { Boss } from '../../../domain/types'
import { bossFrames, bossPlayback, type BossSequence } from './bossPoses'

/* Världsbossen i striden: målade bildrutor per händelse. I vila står
   bossen på sin vilobild och laddar då och då upp (ruta 1) så att den
   lever redan innan första svaret. Vid prefers-reduced-motion visas
   följdens sista bild direkt, utan mellanrutor. */

export type BossAction = 'idle' | 'attack' | 'hit' | 'defeat'

const IDLE_REST_MS = 3200
const IDLE_BLINK_MS = 520

const art = (path: string): string => `${import.meta.env.BASE_URL}art/${path}`

export function BossSprite({ boss, action, actionKey, reducedMotion }: {
  boss: Pick<Boss, 'id' | 'name' | 'emoji'>
  action: BossAction
  /** Ändras vid varje nytt svar, så att samma följd kan spelas igen. */
  actionKey: number
  reducedMotion: boolean
}) {
  const frames = bossFrames(boss.id)
  const [frame, setFrame] = useState(0)
  const [broken, setBroken] = useState(false)

  // Ladda alla rutor i förväg — annars blinkar första anfallet tomt på iPad.
  useEffect(() => {
    for (const f of frames) new Image().src = art(f)
  }, [frames])

  useEffect(() => {
    if (action === 'idle') {
      setFrame(0)
      if (reducedMotion || frames.length < 2) return
      let timer = 0
      const rest = (): void => { setFrame(0); timer = window.setTimeout(blink, IDLE_REST_MS) }
      const blink = (): void => { setFrame(1); timer = window.setTimeout(rest, IDLE_BLINK_MS) }
      timer = window.setTimeout(blink, IDLE_REST_MS)
      return () => window.clearTimeout(timer)
    }
    const playback = bossPlayback(boss.id, action as BossSequence)
    if (!playback) return
    if (reducedMotion) { setFrame(playback.frames[playback.frames.length - 1]); return }
    setFrame(playback.frames[0])
    const timers = playback.timing.slice(1).map((delay, i) =>
      window.setTimeout(() => setFrame(playback.frames[i + 1]), delay))
    return () => timers.forEach(window.clearTimeout)
  }, [action, actionKey, boss.id, frames.length, reducedMotion])

  if (broken || frames.length === 0) {
    return <span className={`battle-boss battle-boss--emoji battle-boss--${action}`}>{boss.emoji}</span>
  }
  const label = action === 'attack' ? `${boss.name} anfaller`
    : action === 'hit' ? `${boss.name} träffas`
    : action === 'defeat' ? `${boss.name} är besegrad` : boss.name
  return (
    <img
      className={`battle-boss battle-boss--${action}`}
      src={art(frames[frame])}
      alt={label}
      onError={() => setBroken(true)}
    />
  )
}
