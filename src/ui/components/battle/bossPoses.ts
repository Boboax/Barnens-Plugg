/* ============================================================
   Bossarnas målade bildrutor (art/boss/frames/, från ChatGPT:s
   preview-gren, omkodade till webp i etapp 0) och hur de spelas.

   Varje följd är bildrutor + tidpunkter i ms. Den sista bilden hålls
   tills BattleScreen går vidare (1 260 ms i världsbosstriden), så att
   varje målad pose hinner läsas på en iPad.
   ============================================================ */

export type BossSequence = 'attack' | 'hit' | 'defeat'

interface Playback { frames: number[]; timing: number[] }

interface BossPoseSet {
  /** Bildrutor i ordning; index används av följderna nedan. */
  frames: string[]
  playback?: Partial<Record<BossSequence, Playback>>
}

const DEFAULT_PLAYBACK: Record<BossSequence, Playback> = {
  attack: { frames: [0, 1, 2], timing: [0, 390, 780] },
  hit: { frames: [0, 3, 4], timing: [0, 520, 930] },
  defeat: { frames: [3, 4, 5], timing: [0, 360, 800] },
}

const frame = (file: string): string => `boss/frames/${file}.webp`

/** Standardbossen: vilobild, fyra stridsrutor (frame-2..5), besegrad-bild.
    Bildfilernas namn skiljer sig ibland från domänens boss-id
    (Bråkbjörnen heter brakbjorren i worlds.ts men brakbjornen i ritningarna). */
const standard = (id: string, file = id): BossPoseSet => ({
  frames: [
    `boss/${id}.webp`,
    ...[2, 3, 4, 5].map((n) => frame(`${file}-battle-frame-${n}-v1`)),
    `boss/${id}-besegrad.webp`,
  ],
})

export const BOSS_POSES: Record<string, BossPoseSet> = {
  vaxlartrollet: standard('vaxlartrollet'),
  brakbjorren: standard('brakbjorren', 'brakbjornen'),
  plottrig: standard('plottrig'),
  stenjatten: standard('stenjatten'),
  procentspoket: standard('procentspoket'),
  // Tabelldraken har en egen, hel serie om sex rutor (rutan 1 är vilan).
  tabelldraken: {
    frames: [
      ...[1, 2, 3, 4, 5, 6].map((n) => frame(`tabelldraken-battle-frame-${n}-v2`)),
      'boss/tabelldraken-besegrad.webp',
    ],
    playback: {
      attack: { frames: [0, 1, 2], timing: [0, 390, 780] },
      hit: { frames: [0, 3, 4], timing: [0, 520, 930] },
      defeat: { frames: [4, 5, 6], timing: [0, 360, 800] },
    },
  },
  // Mönsterormen har en extra uppladdningsruta (2b) före anfallet.
  monsterormen: {
    frames: [
      'boss/monsterormen.webp',
      ...['2', '2b', '3', '4', '5'].map((n) => frame(`monsterormen-battle-frame-${n}-v1`)),
      'boss/monsterormen-besegrad.webp',
    ],
    playback: {
      attack: { frames: [0, 1, 2, 3], timing: [0, 270, 520, 800] },
      hit: { frames: [0, 4, 5], timing: [0, 620, 930] },
      defeat: { frames: [4, 5, 6], timing: [0, 330, 720] },
    },
  },
}

export function bossPlayback(bossId: string, sequence: BossSequence): Playback | undefined {
  const set = BOSS_POSES[bossId]
  if (!set) return undefined
  return set.playback?.[sequence] ?? DEFAULT_PLAYBACK[sequence]
}

export const bossFrames = (bossId: string): string[] => BOSS_POSES[bossId]?.frames ?? []
