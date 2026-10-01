import type { WorldGift } from '../../domain/world-gifts'
import { worldById } from '../../domain/worlds'
import '../../styles/world-gifts.css'

const KIND_LABEL: Record<WorldGift['kind'], string> = {
  world: 'För världen',
  pet: 'Till djuren',
  camp: 'Till lägret',
  boss: 'Unik bossrelik',
}

export function WorldGiftChest({
  gifts,
  title = 'Välj en världsgåva',
  subtitle = 'Gåvan stannar i ditt äventyr och förändrar världen, djuren eller lägret.',
  onChoose,
}: {
  gifts: readonly WorldGift[]
  title?: string
  subtitle?: string
  onChoose(gift: WorldGift): void
}) {
  const world = gifts[0] ? worldById(gifts[0].worldId) : undefined
  return (
    <main className="world-gift-screen screen-fade">
      <section className="world-gift-chest bounce-in" aria-labelledby="world-gift-title">
        <div className="world-gift-chest__lid" aria-hidden="true">✦</div>
        <span className="world-gift-chest__eyebrow">
          {world ? world.emoji + ' ' + world.name : 'Matteriket'}
        </span>
        <h2 id="world-gift-title" className="display">{title}</h2>
        <p>{subtitle}</p>
        <div className={'world-gift-grid world-gift-grid--' + Math.min(3, gifts.length)}>
          {gifts.map((gift) => (
            <button key={gift.id} className="world-gift-card" onClick={() => onChoose(gift)}>
              <span className="world-gift-card__kind">{KIND_LABEL[gift.kind]}</span>
              <span className="world-gift-card__emoji" aria-hidden="true">{gift.emoji}</span>
              <strong className="display">{gift.name}</strong>
              <span>{gift.description}</span>
              <small>{gift.effect}</small>
              <b>Välj denna gåva</b>
            </button>
          ))}
        </div>
      </section>
    </main>
  )
}
