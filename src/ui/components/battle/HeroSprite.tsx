import { useEffect, useState } from 'react'
import type { HeroKind } from '../../../domain/types'

/* Hjälten i världsbosstriden, till vänster och vänd mot bossen.
   Poser: vila, anfall (rätt svar), försvar (bossen anfaller), seger. En
   hjälte utan målad vilopose faller tillbaka på profilbilden — lägg en ny
   hjältes id i IDLE_READY när dess vilopose finns. */

export type HeroAction = 'idle' | 'attack' | 'block' | 'victory'

/** Hjältar som har en målad vilopose i art/hero/poses/{id}-idle.webp. */
const IDLE_READY: ReadonlySet<HeroKind> = new Set(['bagskytt', 'riddare', 'trollkarl'])

/** Försvaret tas när bossens anfall närmar sig, inte direkt vid felsvaret. */
const BLOCK_DELAY_MS = 620

const NAMES: Record<HeroKind, string> = { bagskytt: 'Bågskytten', riddare: 'Riddaren', trollkarl: 'Trollkarlen' }

export function HeroSprite({ hero = 'bagskytt', action, actionKey, reducedMotion }: {
  hero?: HeroKind
  action: HeroAction
  actionKey: number
  reducedMotion: boolean
}) {
  const [pose, setPose] = useState<HeroAction>(action)
  const base = `${import.meta.env.BASE_URL}art/hero/`

  useEffect(() => {
    for (const p of ['idle', 'attack', 'block', 'victory']) new Image().src = `${base}poses/${hero}-${p}.webp`
  }, [base, hero])

  useEffect(() => {
    if (action !== 'block' || reducedMotion) { setPose(action); return }
    setPose('idle')
    const t = window.setTimeout(() => setPose('block'), BLOCK_DELAY_MS)
    return () => window.clearTimeout(t)
  }, [action, actionKey, reducedMotion])

  const idle = pose === 'idle'
  const src = idle
    ? (IDLE_READY.has(hero) ? `${base}poses/${hero}-idle.webp` : `${base}${hero}.webp`)
    : `${base}poses/${hero}-${pose}.webp`
  const label = pose === 'attack' ? `${NAMES[hero]} anfaller`
    : pose === 'block' ? `${NAMES[hero]} försvarar sig`
    : pose === 'victory' ? `${NAMES[hero]} firar segern` : NAMES[hero]
  return (
    <img
      key={`${pose}-${actionKey}`}
      className={`battle-hero battle-hero--${pose}${idle && !IDLE_READY.has(hero) ? ' battle-hero--profile' : ''}`}
      src={src}
      alt={label}
    />
  )
}
