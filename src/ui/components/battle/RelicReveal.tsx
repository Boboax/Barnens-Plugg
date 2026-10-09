import { useEffect, useState } from 'react'
import type { WorldGift } from '../../../domain/world-gifts'
import { worldById } from '../../../domain/worlds'
import { sfx } from '../../../sound'
import { fireConfetti } from '../../fx/confetti'
import { useDocumentBackground } from '../../useDocumentBackground'
import { RelicArt } from './RelicArt'
import '../../../styles/relics.css'

/* Bossrelikens avslöjande — spelets största trofé ska kännas episk:
   ljuspelare ur marken, strålar som roterar, reliken stiger upp och
   svävar, guldgnistor och fanfar. Knappen kommer först när reliken har
   landat, så barnet hinner se ögonblicket. Reliken är redan sparad
   (onShown) innan något visas. prefers-reduced-motion: allt syns direkt. */

const RISE_MS = 2100
const SPARKS = Array.from({ length: 18 }, (_, i) => i)

export function RelicReveal({ relic, bossName, onShown, onClose }: {
  relic: WorldGift
  bossName: string
  onShown(): void
  onClose(): void
}) {
  useDocumentBackground('#0B0710')
  const [landed, setLanded] = useState(false)
  const world = worldById(relic.worldId)

  useEffect(() => {
    onShown()
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    sfx.skatt()
    const fanfare = window.setTimeout(() => {
      sfx.fanfar()
      fireConfetti({ power: 1.2, count: 120 })
    }, reduced ? 0 : RISE_MS - 300)
    const land = window.setTimeout(() => setLanded(true), reduced ? 0 : RISE_MS)
    return () => { window.clearTimeout(fanfare); window.clearTimeout(land) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <main className="relic-reveal screen-fade" aria-labelledby="relic-title">
      <div className="relic-reveal__rays" aria-hidden="true" />
      <div className="relic-reveal__pillar" aria-hidden="true" />
      <div className="relic-reveal__sparks" aria-hidden="true">
        {SPARKS.map((i) => <i key={i} style={{ '--i': i } as React.CSSProperties} />)}
      </div>

      <div className="relic-reveal__stage">
        <div className="relic-reveal__relic">
          <RelicArt relic={relic} size={220} />
        </div>
      </div>

      <section className={`relic-reveal__card${landed ? ' relic-reveal__card--shown' : ''}`}>
        <span className="relic-reveal__eyebrow">{world.emoji} {bossName} är besegrad</span>
        <h2 id="relic-title" className="display">{relic.name}</h2>
        <p>{relic.description}</p>
        <small>En legendarisk relik — den enda i sitt slag. Den står nu i lägrets trofésal och lyser på kartan.</small>
        <button className="btn btn-primary" disabled={!landed} onClick={onClose}>Ta emot reliken ✦</button>
      </section>
    </main>
  )
}
