import type { ChildProfile } from '../../../domain/types'
import { CAMP_CATALOG, campItemLimit, campPoint, catalogItem, isCampUnlockMet, type CampCatalogItem } from '../../../domain/camp'
import { itemImage } from './campArt'

/* Handelsboden och packningen. Köpta saker hamnar i packningen och
   ställs fram i lägervyn ovanför — inget placeras åt barnet. Priset står
   alltid neutralt ("Kostar 60 mynt"), aldrig som en nedräkning ("spara 40
   till") som gör butiken till ett mål att jaga. */

export type ShopTab = 'shop' | 'packing'

interface Props {
  child: ChildProfile
  canInteract: boolean
  tab: ShopTab
  onTab(tab: ShopTab): void
  /** Varan som provas (förhandsvisas i lägret), eller tom sträng. */
  selectedId: string
  onSelect(itemId: string): void
  onBuy(item: CampCatalogItem): void
  onStartPlacing(instanceId: string): void
}

export function CampShop({ child, canInteract, tab, onTab, selectedId, onSelect, onBuy, onStartPlacing }: Props) {
  const { coins, items } = child.petProgress
  const forSale = CAMP_CATALOG.filter((item) => isCampUnlockMet(item.unlock, child))
  const chosen = forSale.find((item) => item.id === selectedId)
  // Tältet står alltid vid elden och kan inte packas undan.
  const packable = items.filter((i) => catalogItem(i.itemId)?.kind !== 'tent')

  return (
    <section className="camp-panel camp-shop">
      <div className="camp-tabs">
        <button className="chip" aria-pressed={tab === 'packing'} onClick={() => onTab('packing')}>
          Packningen ({packable.length})
        </button>
        <button className="chip" aria-pressed={tab === 'shop'} onClick={() => onTab('shop')}>Handelsboden</button>
      </div>

      {tab === 'shop' ? (
        <>
          <p>Allt i boden går att köpa när du har råd. Bäddar finns till varje vän, lyktor och lekstockar två av, andra saker en.</p>
          <div className="camp-shop-grid">
            {forSale.map((item) => {
              const owned = items.filter((i) => i.itemId === item.id).length
              const max = campItemLimit(item, child)
              const soldOut = owned >= max
              return (
                <button
                  key={item.id}
                  className="camp-product"
                  aria-pressed={selectedId === item.id}
                  disabled={soldOut}
                  onClick={() => onSelect(item.id)}
                >
                  <img src={itemImage(item)} alt="" />
                  <span>{item.name}</span>
                  <small>{soldOut ? 'Du har alla du behöver' : `${item.price} mynt · ${owned} av ${max}`}</small>
                </button>
              )
            })}
          </div>
          {chosen && (
            <div className="camp-buy-confirm">
              <img src={itemImage(chosen)} alt="" />
              <div>
                <h3 className="display">{chosen.name}</h3>
                <p>{chosen.description}</p>
                <p>{chosen.kind === 'tent'
                  ? 'Tältet ställs upp vid elden, och vännerna kan bo där.'
                  : 'Den hamnar i packningen. Ställ fram den när du vill.'}</p>
                <button className="btn btn-primary" disabled={!canInteract || coins < chosen.price} onClick={() => onBuy(chosen)}>
                  {coins < chosen.price ? `Kostar ${chosen.price} mynt` : `Köp · ${chosen.price} mynt`}
                </button>
                <button className="chip" onClick={() => onSelect('')}>Avbryt</button>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {packable.length === 0 && <p>Packningen är tom. I handelsboden kan du hitta något till lägret.</p>}
          <div className="camp-shop-grid">
            {packable.map((instance) => {
              const item = catalogItem(instance.itemId)
              if (!item) return null
              return (
                <button key={instance.id} className="camp-product" disabled={!canInteract} onClick={() => onStartPlacing(instance.id)}>
                  <img src={itemImage(item)} alt="" />
                  <span>{item.name}</span>
                  <small>{campPoint(instance.point)?.name ?? 'I packningen'}</small>
                  <small>Ställ fram / flytta</small>
                </button>
              )
            })}
          </div>
        </>
      )}
    </section>
  )
}
