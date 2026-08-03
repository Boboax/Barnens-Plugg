import { useEffect } from 'react'

/* iPadOS (hemskärmsläge) ritar inte webbvyn ända ner bakom home-indikatorn:
   remsan längst ner "letterboxas" och målas av systemet med DOKUMENTETS
   bakgrundsfärg (html/body). Ingen CSS i appen når dit — position:fixed,
   viewport-fit=cover och safe-area hjälper inte. Mot pergamentvyerna är den
   mörka ramtonen (#241C24 i global.css) en diskret kant, men mot mörka
   helskärmsscener (segerfirande, natt, väktarsal) blev den en avvikande
   lila-grå rand (förälderns foto, aug 2026). Sådana scener färgar därför
   dokumentbakgrunden till sin egen kantfärg så länge de visas — och
   återställer den vid avmontering. */
export function useDocumentBackground(color?: string): void {
  useEffect(() => {
    if (!color) return
    const els = [document.documentElement, document.body]
    const prev = els.map((el) => el.style.backgroundColor)
    for (const el of els) el.style.backgroundColor = color
    return () => els.forEach((el, i) => { el.style.backgroundColor = prev[i] })
  }, [color])
}
