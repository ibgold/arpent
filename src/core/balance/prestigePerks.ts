// Prestige enrichi (Vague 2) : chaque rang de Renaissance donne UN choix de perk de départ.
// Les perks sont cumulables (reprendre le même = empiler l'effet).

import { CHEST_DISTANCE_M } from './chests'
import type { GameState } from '../types'

export interface PrestigePerkDef {
  id: string
  name: string
  icon: string
  desc: string
}

export const PRESTIGE_PERKS: PrestigePerkDef[] = [
  { id: 'waking-boon', name: 'Waking Boon', icon: '🚀', desc: 'Every run starts with +1 free ability choice' },
  { id: 'crowd-favor', name: 'Crowd Favor', icon: '👥', desc: '+2 villager capacity' },
  { id: 'trail-caches', name: 'Trail Caches', icon: '🎁', desc: 'Wander chests need −50 m of walking (floor 300 m)' },
]

export function perkCount(state: GameState, perkId: string): number {
  return state.prestige.perks.filter((p) => p === perkId).length
}

/** Choix de perk encore disponibles (1 par rang de Renaissance) */
export function pendingPerkPicks(state: GameState): number {
  return Math.max(0, state.prestige.rank - state.prestige.perks.length)
}

/** Distance entre deux Coffres du Marcheur, réduite par Trail Caches */
export function chestDistanceM(state: GameState): number {
  return Math.max(300, CHEST_DISTANCE_M - 50 * perkCount(state, 'trail-caches'))
}

/** Capacité d'Éveillés bonus (Crowd Favor) */
export function prestigeFollowerBonus(state: GameState): number {
  return 2 * perkCount(state, 'crowd-favor')
}
