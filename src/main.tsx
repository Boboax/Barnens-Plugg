import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './ui/App'
import { StoreProvider } from './ui/store'
import './styles/global.css'

// Texturernas sökväg måste respektera base-path (GitHub Pages: /Barnens-Plugg/).
// Sätts som CSS-variabler här så global.css kan referera dem utan hårdkodad bas.
document.documentElement.style.setProperty('--tex-parchment', `url(${import.meta.env.BASE_URL}art/tex/parchment.webp)`)
document.documentElement.style.setProperty('--tex-wood', `url(${import.meta.env.BASE_URL}art/tex/wood.webp)`)
document.documentElement.style.setProperty('--tex-frame', `url(${import.meta.env.BASE_URL}art/tex/panelframe.webp)`)
document.documentElement.style.setProperty('--tex-stone', `url(${import.meta.env.BASE_URL}art/tex/stone.webp)`)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </StrictMode>,
)
