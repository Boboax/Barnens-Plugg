import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/** Bygger en fullapps-förhandsvisning med avskilt testhushåll. */
export default defineConfig({
  base: '/Barnens-Plugg-Preview/fullapp-prototype/',
  publicDir: 'dist-full-preview-public',
  define: {
    __APP_VERSION__: JSON.stringify('fullapp-character-preview-v1'),
    __BUILD_TIME__: JSON.stringify('test build'),
  },
  plugins: [react()],
  build: { outDir: 'dist-full-preview', rollupOptions: { input: { index: 'full-preview.html' } } },
})
