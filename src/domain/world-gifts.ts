export type WorldGiftKind = 'world' | 'pet' | 'camp' | 'boss'

export interface WorldGift {
  id: string
  worldId: string
  kind: WorldGiftKind
  name: string
  emoji: string
  description: string
  effect: string
}

/** Beständiga, kosmetiska gåvor. De påverkar aldrig matte eller progression. */
export const WORLD_GIFTS: readonly WorldGift[] = [
  { id: 'dalen-blomfro', worldId: 'talens-dal', kind: 'world', name: 'Talsprångens blomfrö', emoji: '🌼', description: 'Ett frö som får sifferblommor att slå ut i dalen.', effect: 'Urtalens dal blommar på rikskartan.' },
  { id: 'dalen-sifferboll', worldId: 'talens-dal', kind: 'pet', name: 'Sifferbollen', emoji: '🔵', description: 'En mjuk boll med gyllene siffror.', effect: 'Djuren får en ny leksak vid lägerelden.' },
  { id: 'dalen-lykta', worldId: 'talens-dal', kind: 'camp', name: 'Tioflodens lykta', emoji: '🏮', description: 'En lykta som räknar tio varma ljusglimtar.', effect: 'Lyktan lyser i kvällslägret.' },
  { id: 'dalen-sigill', worldId: 'talens-dal', kind: 'boss', name: 'Växlartrollets brosigill', emoji: '🪙', description: 'Beviset på att Tioflodens bro är fri.', effect: 'Bossreliken visas på kartan och i lägrets troféhylla.' },

  { id: 'skogen-eldflugebo', worldId: 'multiplikationsskogen', kind: 'world', name: 'Eldflugornas gångertavla', emoji: '✨', description: 'Eldflugor samlas i lysande grupper.', effect: 'Skogen glimmar på rikskartan.' },
  { id: 'skogen-drakboll', worldId: 'multiplikationsskogen', kind: 'pet', name: 'Drakbollen', emoji: '🟠', description: 'En tålig boll som doftar lite av rök.', effect: 'Djuren kan leka med drakbollen.' },
  { id: 'skogen-baner', worldId: 'multiplikationsskogen', kind: 'camp', name: 'Skogens gruppbanér', emoji: '🎏', description: 'Ett banér med kottar i perfekta grupper.', effect: 'Banéret hänger över lägret.' },
  { id: 'skogen-relik', worldId: 'multiplikationsskogen', kind: 'boss', name: 'Tabelldrakens guldskala', emoji: '🐲', description: 'En skimrande fjällskiva från drakens skatt.', effect: 'Bossreliken visas på kartan och i troféhyllan.' },

  { id: 'brak-bron', worldId: 'brakberget', kind: 'world', name: 'Delningsbron', emoji: '🌉', description: 'En liten bro byggd av helt jämna delar.', effect: 'En gyllene bro syns vid Bråkberget.' },
  { id: 'brak-honung', worldId: 'brakberget', kind: 'pet', name: 'Honungskakan', emoji: '🍯', description: 'En doftande leksak som får nosar att vakna.', effect: 'Djuren samlas nyfiket kring honungskakan.' },
  { id: 'brak-snokudde', worldId: 'brakberget', kind: 'camp', name: 'Snömjuk kudde', emoji: '❄️', description: 'En fjäderlätt kudde från bergets topp.', effect: 'Kudden ligger i kvällslägret.' },
  { id: 'brak-relik', worldId: 'brakberget', kind: 'boss', name: 'Bråkbjörnens guldkvart', emoji: '🟡', description: 'En perfekt fjärdedel av den stora guldkakan.', effect: 'Bossreliken visas på kartan och i troféhyllan.' },

  { id: 'monster-runplattor', worldId: 'monsterskogen', kind: 'world', name: 'Gläntans runplattor', emoji: '🌀', description: 'Plattor som fortsätter sitt mönster av sig själva.', effect: 'Ett lysande mönster ringlar över gläntan.' },
  { id: 'monster-fjaril', worldId: 'monsterskogen', kind: 'pet', name: 'Mönsterfjärilen', emoji: '🦋', description: 'En vänlig fjäril som flyger i upprepade slingor.', effect: 'Fjärilen hälsar på djuren i lägret.' },
  { id: 'monster-vindspel', worldId: 'monsterskogen', kind: 'camp', name: 'Spiralvindspel', emoji: '🎐', description: 'Ett vindspel med en melodi som alltid hittar hem.', effect: 'Vindspelet hänger vid lägerelden.' },
  { id: 'monster-relik', worldId: 'monsterskogen', kind: 'boss', name: 'Mönsterormens skimrande fjäll', emoji: '🐍', description: 'Ett fjäll där färgerna aldrig slutar upprepas.', effect: 'Bossreliken visas på kartan och i troféhyllan.' },

  { id: 'former-kristallstig', worldId: 'formernas-berg', kind: 'world', name: 'Kristallstigen', emoji: '💠', description: 'Former som passar samman och visar en ny stig.', effect: 'Kristaller markerar vägen genom öknen.' },
  { id: 'former-sandboll', worldId: 'formernas-berg', kind: 'pet', name: 'Prismabollen', emoji: '🔷', description: 'En kantig boll som ändå studsar mjukt.', effect: 'Djuren får en glittrande prismaleksak.' },
  { id: 'former-stjarntalt', worldId: 'formernas-berg', kind: 'camp', name: 'Geometrins stjärnlykta', emoji: '🌟', description: 'Trianglar av ljus bildar en stjärna.', effect: 'Stjärnlyktan lyser över lägret.' },
  { id: 'former-relik', worldId: 'formernas-berg', kind: 'boss', name: 'Stenjätten Kants prism', emoji: '🔶', description: 'Ett uråldrigt prism med fulländade kanter.', effect: 'Bossreliken visas på kartan och i troféhyllan.' },

  { id: 'diagram-fyr', worldId: 'diagramoarna', kind: 'world', name: 'Stapelfyren', emoji: '🗼', description: 'En fyr vars ljus växer stapel för stapel.', effect: 'Fyren lyser över Diagramöarna.' },
  { id: 'diagram-snacka', worldId: 'diagramoarna', kind: 'pet', name: 'Sångsnäckan', emoji: '🐚', description: 'En snäcka som spelar havets lugna ljud.', effect: 'Djuren lyssnar på snäckan i lägret.' },
  { id: 'diagram-segel', worldId: 'diagramoarna', kind: 'camp', name: 'Öarnas vindsegel', emoji: '⛵', description: 'Ett litet segel som fångar kvällsbrisen.', effect: 'Vindseglet pryder kvällslägret.' },
  { id: 'diagram-relik', worldId: 'diagramoarna', kind: 'boss', name: 'Plottrigs kartkompass', emoji: '🧭', description: 'En kompass som pekar mot det tydligaste diagrammet.', effect: 'Bossreliken visas på kartan och i troféhyllan.' },

  { id: 'samband-kristallfro', worldId: 'sambandsgrottan', kind: 'world', name: 'Sambandets kristallfrö', emoji: '💎', description: 'En kristall som växer dubbelt när den får ljus.', effect: 'Grottans kristaller börjar lysa på kartan.' },
  { id: 'samband-spokboll', worldId: 'sambandsgrottan', kind: 'pet', name: 'Spökbollen', emoji: '⚪', description: 'En nästan osynlig boll som fnissar när den rullar.', effect: 'Djuren får en spöklik leksak.' },
  { id: 'samband-spoklykta', worldId: 'sambandsgrottan', kind: 'camp', name: 'Hundraprocentslyktan', emoji: '🕯️', description: 'En lykta som lyser med hela sin kraft.', effect: 'Spöklyktan lyser vid lägerelden.' },
  { id: 'samband-relik', worldId: 'sambandsgrottan', kind: 'boss', name: 'Procentspökets hundraprocentiga sigill', emoji: '👻', description: 'Ett sigill som är hundra procent synligt.', effect: 'Bossreliken visas på kartan och i troféhyllan.' },
] as const

export const giftById = (id: string): WorldGift | undefined => WORLD_GIFTS.find((gift) => gift.id === id)

export function giftsForWorld(worldId: string, includeBoss = false): WorldGift[] {
  return WORLD_GIFTS.filter((gift) => gift.worldId === worldId && (includeBoss || gift.kind !== 'boss'))
}

export function unclaimedGifts(worldId: string, claimed: readonly string[] = [], includeBoss = false): WorldGift[] {
  const owned = new Set(claimed)
  return giftsForWorld(worldId, includeBoss).filter((gift) => !owned.has(gift.id))
}

export function bossGiftForWorld(worldId: string): WorldGift | undefined {
  return WORLD_GIFTS.find((gift) => gift.worldId === worldId && gift.kind === 'boss')
}
