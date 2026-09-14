/**
 * Första bildkontraktet för hjälteprototypen. Katalogen är statisk och den
 * framtida sparfilen ska bara innehålla dessa stabila id:n.
 */
export type PrototypeWeaponId = 'moon-bow' | 'sun-blade'
export type PrototypeCloakId = 'forest-cloak' | 'star-cloak'
export type CharacterMotion = 'idle' | 'attack' | 'guard' | 'victory'

export const PROTOTYPE_WEAPONS: ReadonlyArray<{ id: PrototypeWeaponId; name: string; description: string }> = [
  { id: 'moon-bow', name: 'Månbågen', description: 'En snabb pil av stjärnljus.' },
  { id: 'sun-blade', name: 'Solklingan', description: 'Ett varmt, tydligt svärdsslag.' },
]

export const PROTOTYPE_CLOAKS: ReadonlyArray<{ id: PrototypeCloakId; name: string; color: string; trim: string }> = [
  { id: 'forest-cloak', name: 'Skogsmanteln', color: '#315e4b', trim: '#d9bf75' },
  { id: 'star-cloak', name: 'Stjärnmanteln', color: '#514273', trim: '#ead2a0' },
]
