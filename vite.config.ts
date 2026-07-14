import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'node:child_process'
import pkg from './package.json'

// Versionsstämpel: paketversion + git-hash + byggtid — så att man alltid
// kan se exakt vilken version en platta kör (PWA:er ligger lätt en version efter).
let gitSha = 'dev'
try {
  gitSha = execSync('git rev-parse --short HEAD').toString().trim()
} catch { /* utanför git — behåll 'dev' */ }
const buildTime = new Date().toISOString().slice(0, 16).replace('T', ' ')

// Byggs för GitHub Pages under /Barnens-Plugg/ som standard.
// Sätt BASE_PATH=/ för annan hosting (t.ex. egen domän eller lokal preview).
const base = process.env.BASE_PATH ?? '/Barnens-Plugg/'

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(`${pkg.version} (${gitSha})`),
    __BUILD_TIME__: JSON.stringify(buildTime),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['pi.svg'],
      manifest: {
        name: 'Räknarnas rike',
        short_name: 'Räknarna',
        description: 'Adaptiv matteträning för barn enligt svensk läroplan',
        lang: 'sv',
        display: 'standalone',
        orientation: 'landscape',
        background_color: '#241C24',
        theme_color: '#241C24',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}'],
        // Appen är helt lokal — inga runtime-anrop att cacha förutom appskalet.
        navigateFallback: `${base}index.html`,
        // Låtarna (mp3, ~4 MB styck) precachas INTE — då sväller install:en.
        // I stället cachas de vid första uppspelning (CacheFirst) så de startar
        // direkt andra gången och fungerar offline sedan.
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.endsWith('.mp3'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'lat-cache',
              expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 90 },
              rangeRequests: true,
            },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
