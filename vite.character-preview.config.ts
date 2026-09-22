import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/** Bygger en isolerad statisk demo till Preview-repots undermapp. */
export default defineConfig({
  base: '/Barnens-Plugg-Preview/character-prototype/',
  define: { __APP_VERSION__: JSON.stringify('character-prototype-v6-boss-frames') },
  plugins: [react()],
  build: {
    outDir: 'dist-character-preview',
    rollupOptions: {
      input: { index: 'character-preview.html' },
      external: ['react', 'react-dom/client', 'react/jsx-runtime'],
      output: { paths: { react: 'https://esm.sh/react@18.3.1', 'react-dom/client': 'https://esm.sh/react-dom@18.3.1/client', 'react/jsx-runtime': 'https://esm.sh/react@18.3.1/jsx-runtime' } },
    },
  },
})
