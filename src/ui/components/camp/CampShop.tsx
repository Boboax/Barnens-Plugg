import type { ChildProfile } from '../../../domain/types'
import { CAMP_CATALOG, campItemLimit, campPoint, catalogItem, isCampUnlockMet, type CampCatalogItem } from '../../../domain/camp'
import { itemImage } from './campArt'

/* Handelsboden och packningen. Köpta saker hamnar i packningen och
   ställs fram i lägervyn ovanför — inget placeras åt barnet. Priset står
   alltid neutralt ("Kostar 60 mynt"), aldrig som en nedräkning ("spara 40
   till") som gör butiken till ett mål att jaga. */

export type ShopTab = 'shop' | 'packing'

/** Varans bild — godis ritas som emoji (ingen bildfil i budgeten). */
function ItemIcon({ item }: { item: CampCatalogItem }) {
  return item.emoji
    ? <span className="camp-product-emoji" aria-hidden="true">{item.emoji}</span>
    : <img src={itemImage(item)} alt="" />
}

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
  // Tältet står alltid vid elden, och godiset ligger i lyans skål — inget
  // av dem kan packas undan eller ställas fram.
  const packable = items.filter((i) => {
    const kind = catalogItem(i.itemId)?.kind
    return kind !== 'tent' && kind !== 'treat'
  })

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
          <p>Allt i boden går att köpa när du har råd. Bäddar finns till varje vän, lyktor och lekstockar två av, andra saker en. Godiset är dina vänners favoriter — det köps en gång och tar aldrig slut.</p>
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
                  <ItemIcon item={item} />
                  <span>{item.name}</span>
                  <small>{soldOut
                    ? (item.kind === 'treat' ? 'Finns i godisskålen' : 'Du har alla du behöver')
                    : item.kind === 'treat' ? `${item.price} mynt` : `${item.price} mynt · ${owned} av ${max}`}</small>
                </button>
              )
            })}
          </div>
          {chosen && (
            <div className="camp-buy-confirm">
              <ItemIcon item={chosen} />
              <div>
                <h3 className="display">{chosen.name}</h3>
                <p>{chosen.description}</p>
                <p>{chosen.kind === 'tent'
                  ? 'Tältet ställs upp vid elden, och vännerna kan bo där.'
                  : chosen.kind === 'treat'
                    ? 'Godiset hamnar i godisskålen i lyan och tar aldrig slut.'
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
