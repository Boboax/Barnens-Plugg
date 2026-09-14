import { rename } from 'node:fs/promises'
import { build } from 'vite'

await build({ configFile: 'vite.character-preview.config.ts', mode: 'development' })
await rename('dist-character-preview/character-preview.html', 'dist-character-preview/index.html')
