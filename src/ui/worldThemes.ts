/* ============================================================
   Matterikets miljöer — varje värld får sin egen himmel,
   horisontsiluett och levande dekor, så att dalen känns som en
   dal, skogen som en skog och grottan som en grotta.
   ============================================================ */

export type HorizonKind = 'kullar' | 'skog' | 'berg' | 'slingor' | 'kristaller' | 'vagor' | 'grotta'

export interface WorldDecor {
  emoji: string
  top?: string
  bottom?: string
  left?: string
  right?: string
  size: number
  /** Sekunder mellan sväv-cyklerna förskjuts per dekor. */
  delay?: number
}

export interface WorldTheme {
  /** Kartans himmel + mark som CSS-gradient. */
  sky: string
  /** Berättelsebannerns färger. */
  banner: { bg: string; border: string; ink: string }
  horizon: HorizonKind
  /** [bakre siluett, främre siluett] */
  horizonColors: [string, string]
  decor: WorldDecor[]
  clouds: boolean
}

export const WORLD_THEMES: Record<string, WorldTheme> = {
  'talens-dal': {
    sky: 'linear-gradient(180deg, #BFE3F7 0%, #E4F3E4 38%, #F2F6E4 100%)',
    banner: { bg: '#FFF8E6', border: '#F2E3B8', ink: '#7A5A00' },
    horizon: 'kullar',
    horizonColors: ['#A8D8A0', '#7FC47F'],
    decor: [
      { emoji: '🌻', bottom: '8%', left: '3%', size: 30, delay: 0 },
      { emoji: '🦋', top: '30%', right: '5%', size: 24, delay: 1.2 },
      { emoji: '🌷', bottom: '20%', right: '3%', size: 26, delay: 0.6 },
      { emoji: '🐞', bottom: '40%', left: '4%', size: 20, delay: 1.8 },
    ],
    clouds: true,
  },
  multiplikationsskogen: {
    sky: 'linear-gradient(180deg, #D7EEC8 0%, #C2E3B0 40%, #EAF3DC 100%)',
    banner: { bg: '#EDF7E4', border: '#C8E3B2', ink: '#3E6B2A' },
    horizon: 'skog',
    horizonColors: ['#8FBF7A', '#5E9C4F'],
    decor: [
      { emoji: '🐿️', bottom: '12%', left: '3%', size: 28, delay: 0 },
      { emoji: '🍄', bottom: '6%', right: '4%', size: 26, delay: 0.8 },
      { emoji: '🦉', top: '26%', right: '4%', size: 26, delay: 1.5 },
      { emoji: '🌰', bottom: '35%', left: '5%', size: 20, delay: 2.1 },
    ],
    clouds: true,
  },
  brakberget: {
    sky: 'linear-gradient(180deg, #C9DFF5 0%, #E3ECF7 45%, #F3F1EA 100%)',
    banner: { bg: '#EAF1FB', border: '#C6D8F0', ink: '#3A5B8C' },
    horizon: 'berg',
    horizonColors: ['#9FB4CE', '#6E88AB'],
    decor: [
      { emoji: '🦅', top: '22%', left: '4%', size: 26, delay: 0 },
      { emoji: '⛺', bottom: '10%', right: '4%', size: 28, delay: 1 },
      { emoji: '🍕', bottom: '30%', left: '3%', size: 24, delay: 1.7 },
      { emoji: '❄️', top: '35%', right: '5%', size: 18, delay: 0.5 },
    ],
    clouds: true,
  },
  monsterskogen: {
    sky: 'linear-gradient(180deg, #E4D9F5 0%, #EFE4F7 40%, #F6EFF2 100%)',
    banner: { bg: '#F3EAFB', border: '#DCC8F0', ink: '#6A4DA8' },
    horizon: 'slingor',
    horizonColors: ['#C2A8E0', '#9C7BC8'],
    decor: [
      { emoji: '🔮', bottom: '10%', left: '3%', size: 26, delay: 0 },
      { emoji: '🌀', top: '28%', right: '4%', size: 24, delay: 0.9 },
      { emoji: '🪄', bottom: '28%', right: '3%', size: 24, delay: 1.6 },
      { emoji: '✨', top: '42%', left: '4%', size: 20, delay: 0.4 },
    ],
    clouds: false,
  },
  'formernas-berg': {
    sky: 'linear-gradient(180deg, #C8E8EC 0%, #E0F0F0 40%, #F0F2EA 100%)',
    banner: { bg: '#E4F4F4', border: '#B8DFE0', ink: '#20707A' },
    horizon: 'kristaller',
    horizonColors: ['#8FC6CA', '#5BA3AA'],
    decor: [
      { emoji: '🔷', bottom: '12%', left: '3%', size: 26, delay: 0 },
      { emoji: '📐', top: '30%', right: '4%', size: 26, delay: 1.1 },
      { emoji: '🔺', bottom: '32%', right: '3%', size: 22, delay: 0.5 },
      { emoji: '⬡', top: '45%', left: '4%', size: 22, delay: 1.8 },
    ],
    clouds: true,
  },
  diagramoarna: {
    sky: 'linear-gradient(180deg, #B8E4F5 0%, #D2EFF7 42%, #FBF0D8 100%)',
    banner: { bg: '#E4F5FB', border: '#B8E0F0', ink: '#1F6A8C' },
    horizon: 'vagor',
    horizonColors: ['#7FC8E8', '#4FA8D8'],
    decor: [
      { emoji: '🦜', top: '24%', left: '4%', size: 26, delay: 0 },
      { emoji: '🐚', bottom: '8%', right: '4%', size: 24, delay: 0.7 },
      { emoji: '⛵', top: '38%', right: '5%', size: 26, delay: 1.4 },
      { emoji: '🐠', bottom: '25%', left: '3%', size: 22, delay: 2 },
    ],
    clouds: true,
  },
  sambandsgrottan: {
    sky: 'linear-gradient(180deg, #3A3A55 0%, #4A4468 45%, #5C5478 100%)',
    banner: { bg: '#4A4468', border: '#6C6490', ink: '#FFD98A' },
    horizon: 'grotta',
    horizonColors: ['#2E2C45', '#242238'],
    decor: [
      { emoji: '💎', bottom: '12%', left: '3%', size: 24, delay: 0 },
      { emoji: '🦇', top: '20%', right: '5%', size: 22, delay: 0.8 },
      { emoji: '🕯️', bottom: '30%', right: '3%', size: 24, delay: 1.5 },
      { emoji: '✨', top: '38%', left: '4%', size: 18, delay: 0.4 },
    ],
    clouds: false,
  },
}

export const worldTheme = (worldId: string): WorldTheme =>
  WORLD_THEMES[worldId] ?? WORLD_THEMES['talens-dal']
