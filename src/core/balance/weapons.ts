import type { GameState } from '../types'
import { catalogItem } from './catalog'

// Armes-archétypes : l'arme équipée détermine le PROFIL DE TIR (combat façon Archero :
// on tire automatiquement à l'arrêt). Épée = équilibrée ; marteau = lent, gros projectile
// dévastateur ; dagues = mitraille rapide et critique.

export type WeaponArchetype = 'blade' | 'hammer' | 'daggers'

export interface ArchetypeProfile {
  id: WeaponArchetype
  label: string
  icon: string
  /** Multiplicateur de cadence de tir (plus haut = plus lent) */
  cooldownMult: number
  damageMult: number
  critBonus: number
  /** Échelle visuelle + hitbox du projectile */
  projScale: number
}

export const ARCHETYPES: Record<WeaponArchetype, ArchetypeProfile> = {
  blade: {
    id: 'blade',
    label: 'Blade',
    icon: '🗡️',
    cooldownMult: 1,
    damageMult: 1,
    critBonus: 0,
    projScale: 1,
  },
  hammer: {
    id: 'hammer',
    label: 'Hammer',
    icon: '🔨',
    cooldownMult: 1.8,
    damageMult: 1.9,
    critBonus: 0,
    projScale: 1.7,
  },
  daggers: {
    id: 'daggers',
    label: 'Daggers',
    icon: '🔪',
    cooldownMult: 0.55,
    damageMult: 0.55,
    critBonus: 0.1,
    projScale: 0.8,
  },
}

/** Profil de l'arme équipée (mains nues = épée) */
export function equippedWeaponProfile(state: GameState): ArchetypeProfile {
  const id = state.equipment.equipped.weapon
  const item = id ? catalogItem(id) : undefined
  return ARCHETYPES[item?.archetype ?? 'blade']
}
