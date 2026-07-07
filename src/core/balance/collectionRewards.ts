import { CATALOG } from './catalog'
import { REGIONS, type RegionDef } from './regions'
import type { GameState } from '../types'

// La Collection n'est pas décorative : chaque palier débloque une VRAIE mécanique,
// et compléter le set d'une région donne sa Maîtrise.

export interface CollectionUnlock {
  id: string
  count: number
  name: string
  description: string
  icon: string
}

export const COLLECTION_UNLOCKS: CollectionUnlock[] = [
  { id: 'chest-cap', count: 5, name: 'Deep Pockets', description: 'Wander chest capacity: 4 (was 3)', icon: '🎁' },
  { id: 'triple-contract', count: 10, name: 'Dark Reputation', description: '3 cursed contracts offered before each run', icon: '📜' },
  { id: 'keen-boots', count: 15, name: 'Keen Boots', description: 'Road finds every 1.5 km (was 2 km)', icon: '👟' },
  { id: 'wider-fate', count: 20, name: 'Wider Fate', description: '+1 choice on every run ability', icon: '🃏' },
  { id: 'head-start', count: 30, name: 'Head Start', description: 'Every run begins with a free ability choice', icon: '🚀' },
  { id: 'essence-mastery', count: 40, name: 'Essence Mastery', description: '+50% Essence from duplicates', icon: '⚗️' },
  { id: 'worlds-blessing', count: CATALOG.length, name: "The World's Blessing", description: '+25% energy from walking, forever', icon: '☀️' },
]

export function discoveredCount(state: GameState): number {
  return Object.keys(state.equipment.owned).length
}

export function hasUnlock(state: GameState, unlockId: string): boolean {
  const unlock = COLLECTION_UNLOCKS.find((u) => u.id === unlockId)
  return !!unlock && discoveredCount(state) >= unlock.count
}

export function nextUnlock(state: GameState): CollectionUnlock | undefined {
  const count = discoveredCount(state)
  return COLLECTION_UNLOCKS.find((u) => count < u.count)
}

/** Le set d'une région = ses objets de combat exclusifs (relique incluse) */
export function regionSetIds(region: RegionDef): string[] {
  return CATALOG.filter((i) => i.pool === 'combat' && i.minRegion === region.order).map((i) => i.id)
}

/** Maîtrise régionale : tout le set possédé → +15% dégâts et −15% drain DANS cette région */
export function hasRegionMastery(state: GameState, regionId: string): boolean {
  const region = REGIONS.find((r) => r.id === regionId)
  if (!region) return false
  const set = regionSetIds(region)
  return set.length > 0 && set.every((id) => !!state.equipment.owned[id])
}

export const MASTERY_DAMAGE_MULT = 1.15
export const MASTERY_DRAIN_MULT = 0.85
