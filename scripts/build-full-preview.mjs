import { cp, mkdir, rename, rm } from 'node:fs/promises'
import { build } from 'vite'

const staging = 'dist-full-preview-public'
const assets = [
  'art/arena/sambandsgrottan.webp',
  'art/boss/procentspoket.webp', 'art/boss/procentspoket-besegrad.webp',
  'art/hero/bagskytt.webp', 'art/hero/riddare.webp', 'art/hero/trollkarl.webp',
  'art/prototype-v11', 'art/prototype-v16', 'art/prototype-v17', 'art/prototype-v18', 'art/prototype-v19',
  'art/tex', 'art/camp/evening-camp.webp',
]
await rm(staging, { recursive: true, force: true })
await mkdir(staging)
for (const asset of assets) await cp(`public/${asset}`, `${staging}/${asset}`, { recursive: true })
await build({ configFile: 'vite.full-preview.config.ts', mode: 'development' })
await rename('dist-full-preview/full-preview.html', 'dist-full-preview/index.html')
