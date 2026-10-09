import type { WorldGift } from '../../domain/world-gifts'
import { worldById } from '../../domain/worlds'
import { useDocumentBackground } from '../useDocumentBackground'
import '../../styles/world-gifts.css'

/* Skattkistans avslöjande: EN världsgåva, redan sparad hos barnet innan
   den visas. (Preview-grenen kallade rutan "Välj en världsgåva" men gav
   aldrig något val — rubriken lovar nu bara det som händer.) */

const KIND_LABEL: Record<WorldGift['kind'], string> = {
  world: 'För världen',
  pet: 'Till djuren',
  camp: 'Till lägret',
  boss: 'Unik bossrelik',
}

export function WorldGiftChest({ gift, title, subtitle, onClose }: {
  gift: WorldGift
  title: string
  subtitle: string
  onClose(): void
}) {
  useDocumentBackground('#171321') // iPad-remsan följer kistscenens nattkant
  const world = worldById(gift.worldId)
  return (
    <main className="world-gift-screen screen-fade">
      <section className="world-gift-chest bounce-in" aria-labelledby="world-gift-title">
        <div className="world-gift-chest__lid" aria-hidden="true">✦</div>
        <span className="world-gift-chest__eyebrow">{world.emoji} {world.name}</span>
        <h2 id="world-gift-title" className="display">{title}</h2>
        <p>{subtitle}</p>
        <button className="world-gift-card" onClick={onClose}>
          <span className="world-gift-card__kind">{KIND_LABEL[gift.kind]}</span>
          <span className="world-gift-card__emoji" aria-hidden="true">{gift.emoji}</span>
          <strong className="display">{gift.name}</strong>
          <span>{gift.description}</span>
          <small>{gift.effect}</small>
          <b>Ta emot gåvan</b>
        </button>
      </section>
    </main>
  )
}
