/* ============================================================
   Matterikets miljöer — varje värld får sin egen himmel,
   horisontsiluett, vandringsväg och ritade sprites längs vägen,
   så att dalen känns som en dal, skogen som en skog och grottan
   som en grotta. All grafik är handritad SVG (se WorldSprites) —
   inga emojis, inga bildfiler.
   ============================================================ */

import type { SpriteName } from './components/WorldSprites'

export type HorizonKind = 'kullar' | 'skog' | 'berg' | 'slingor' | 'kristaller' | 'vagor' | 'grotta'

export interface WorldTheme {
  /** Kartans himmel + mark som CSS-gradient. */
  sky: string
  /** Berättelsebannerns färger. */
  banner: { bg: string; border: string; ink: string }
  horizon: HorizonKind
  /** [bakre siluett, främre siluett] */
  horizonColors: [string, string]
  /** Sprites som strös längs vägen (väljs deterministiskt per nod). */
  sprites: SpriteName[]
  /** Vandringsvägens prickar + den slitna stigen under. */
  pathColor: string
  pathUnder: string
  celestial: 'sol' | 'mane' | 'ingen'
  clouds: boolean
}

export const WORLD_THEMES: Record<string, WorldTheme> = {
  'talens-dal': {
    sky: 'linear-gradient(180deg, #A8D8F0 0%, #C8E8F0 30%, #E4F3DC 62%, #D6EDC2 100%)',
    banner: { bg: '#FFF8E6', border: '#F2E3B8', ink: '#7A5A00' },
    horizon: 'kullar',
    horizonColors: ['#A8D8A0', '#7FC47F'],
    sprites: ['lovtrad', 'blomma', 'buske', 'tuva', 'lovtrad', 'sten', 'blomma'],
    pathColor: '#E8B44C',
    pathUnder: '#F6E7C0',
    celestial: 'sol',
    clouds: true,
  },
  multiplikationsskogen: {
    sky: 'linear-gradient(180deg, #BFE0D8 0%, #C8E4B8 35%, #A8D094 70%, #96C284 100%)',
    banner: { bg: '#EDF7E4', border: '#C8E3B2', ink: '#3E6B2A' },
    horizon: 'skog',
    horizonColors: ['#6FA860', '#4A8442'],
    sprites: ['gran', 'svamp', 'gran', 'buske', 'sten', 'gran', 'tuva'],
    pathColor: '#B08A5A',
    pathUnder: '#D8C8A4',
    celestial: 'sol',
    clouds: true,
  },
  brakberget: {
    sky: 'linear-gradient(180deg, #98BCE4 0%, #C2D8EE 40%, #E4E9E4 75%, #D8DED2 100%)',
    banner: { bg: '#EAF1FB', border: '#C6D8F0', ink: '#3A5B8C' },
    horizon: 'berg',
    horizonColors: ['#8FA6C4', '#5F7CA3'],
    sprites: ['snogran', 'sten', 'gran', 'snogran', 'sten', 'tuva', 'snogran'],
    pathColor: '#8898AC',
    pathUnder: '#D2DAE4',
    celestial: 'sol',
    clouds: true,
  },
  monsterskogen: {
    sky: 'linear-gradient(180deg, #8E7BC8 0%, #B49AE0 35%, #E0CCF0 70%, #D4C2E8 100%)',
    banner: { bg: '#F3EAFB', border: '#DCC8F0', ink: '#6A4DA8' },
    horizon: 'slingor',
    horizonColors: ['#A488D4', '#8365B8'],
    sprites: ['snurrtrad', 'orb', 'svamp', 'snurrtrad', 'orb', 'buske', 'kristall'],
    pathColor: '#E8C8F8',
    pathUnder: '#B49AE0',
    celestial: 'mane',
    clouds: false,
  },
  'formernas-berg': {
    sky: 'linear-gradient(180deg, #8FC6D8 0%, #B8E0E4 38%, #D8ECE8 72%, #C8E0DA 100%)',
    banner: { bg: '#E4F4F4', border: '#B8DFE0', ink: '#20707A' },
    horizon: 'kristaller',
    horizonColors: ['#7FB8BE', '#4E969E'],
    sprites: ['kristall', 'sten', 'kristall', 'tuva', 'kristall', 'sten', 'buske'],
    pathColor: '#5BA3AA',
    pathUnder: '#C2E4E6',
    celestial: 'sol',
    clouds: true,
  },
  diagramoarna: {
    sky: 'linear-gradient(180deg, #78C4E8 0%, #A8DCF0 35%, #D8F0F4 65%, #F2E4C2 100%)',
    banner: { bg: '#E4F5FB', border: '#B8E0F0', ink: '#1F6A8C' },
    horizon: 'vagor',
    horizonColors: ['#6FC0E4', '#3E98CC'],
    sprites: ['palm', 'segelbat', 'tuva', 'palm', 'sten', 'segelbat', 'buske'],
    pathColor: '#E8C87C',
    pathUnder: '#F6EBC8',
    celestial: 'sol',
    clouds: true,
  },
  sambandsgrottan: {
    sky: 'linear-gradient(180deg, #2A2842 0%, #3A3655 40%, #4A4468 75%, #57517A 100%)',
    banner: { bg: '#4A4468', border: '#6C6490', ink: '#FFD98A' },
    horizon: 'grotta',
    horizonColors: ['#221F38', '#191730'],
    sprites: ['stalagmit', 'kristall', 'orb', 'stalagmit', 'kristall', 'stalagmit', 'orb'],
    pathColor: '#8FE4EE',
    pathUnder: '#3A3655',
    celestial: 'ingen', // grottan har inget himlavalv — kristallerna lyser i stället
    clouds: false,
  },
}

export const worldTheme = (worldId: string): WorldTheme =>
  WORLD_THEMES[worldId] ?? WORLD_THEMES['talens-dal']
