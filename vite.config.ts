import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Byggs för GitHub Pages under /Barnens-Plugg/ som standard.
// Sätt BASE_PATH=/ för annan hosting (t.ex. egen domän eller lokal preview).
const base = process.env.BASE_PATH ?? '/Barnens-Plugg/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['pi.svg'],
      manifest: {
        name: 'Barnens Plugg',
        short_name: 'Plugg',
        description: 'Adaptiv matteträning för barn enligt svensk läroplan',
        lang: 'sv',
        display: 'standalone',
        orientation: 'landscape',
        background_color: '#FFF9EF',
        theme_color: '#4A56C6',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Appen är helt lokal — inga runtime-anrop att cacha förutom appskalet.
        navigateFallback: `${base}index.html`,
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
