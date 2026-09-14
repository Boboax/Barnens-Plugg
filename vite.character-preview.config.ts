import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/** Bygger en isolerad statisk demo till Preview-repots undermapp. */
export default defineConfig({
  base: '/Barnens-Plugg-Preview/character-prototype/',
  define: { __APP_VERSION__: JSON.stringify('character-prototype') },
  plugins: [react()],
  build: { outDir: 'dist-character-preview', rollupOptions: { input: { index: 'character-preview.html' } } },
})
