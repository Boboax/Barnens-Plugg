import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'node:child_process'
import pkg from './package.json'

// Versionsstämpel: paketversion + git-hash + byggtid — så att man alltid
// kan se exakt vilken version en platta kör (PWA:er ligger lätt en version efter).
// Patch-numret räknas AUTOMATISKT från antalet commits, så versionen rör sig
// vid varje bygge (annars fastnade den på 1.0.0 eftersom package.json aldrig
// bumpas). Kräver full git-historik i CI (fetch-depth: 0 i deploy.yml).
let gitSha = 'dev'
let commitCount = '0'
try {
  gitSha = execSync('git rev-parse --short HEAD').toString().trim()
  commitCount = execSync('git rev-list --count HEAD').toString().trim()
} catch { /* utanför git — behåll standardvärden */ }
// major.minor från package.json, patch = commit-antal → 1.0.<n>.
const [major = '1', minor = '0'] = pkg.version.split('.')
const appVersion = `${major}.${minor}.${commitCount}`
const buildTime = new Date().toISOString().slice(0, 16).replace('T', ' ')

// Byggs för GitHub Pages under /Barnens-Plugg/ som standard.
// Sätt BASE_PATH=/ för annan hosting (t.ex. egen domän eller lokal preview).
const base = process.env.BASE_PATH ?? '/Barnens-Plugg/'

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(`${appVersion} (${gitSha})`),
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
