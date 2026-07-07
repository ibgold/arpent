import { CATALOG, catalogItem, type RelicEffect } from './catalog'
import { equippedSetCounts, SETS, type SetBonus } from './sets'
import type { GameState } from '../types'

// Effets d'équipement : chaque objet du catalogue porte au plus un passif signature FIXE
// (voir catalog.ts). Ce module agrège les passifs des 3 pièces équipées pour le combat.

export interface AffixDef {
  id: string
  format: (value: number) => string
}

/** Formatage des passifs (affichage Collection) */
export const AFFIXES: AffixDef[] = [
  { id: 'crit-chance', format: (v) => `+${Math.round(v * 100)}% crit chance` },
  { id: 'crit-damage', format: (v) => `+${Math.round(v * 100)}% crit damage` },
  { id: 'lifesteal', format: (v) => `heal ${Math.round(v * 100)}% of damage dealt` },
  { id: 'swiftness', format: (v) => `+${Math.round(v * 100)}% move speed` },
  { id: 'gold-touch', format: (v) => `+${Math.round(v * 100)}% gold from kills` },
  { id: 'scholar', format: (v) => `+${Math.round(v * 100)}% XP from kills` },
  { id: 'warm-light', format: (v) => `-${Math.round(v * 100)}% energy drain` },
  { id: 'dash-master', format: (v) => `-${Math.round(v * 100)}% dash cooldown` },
  { id: 'long-arm', format: (v) => `+${Math.round(v * 100)}% attack range` },
]

export function affixLine(affix: { id: string; value: number }): string {
  const def = AFFIXES.find((a) => a.id === affix.id)
  return def ? def.format(affix.value) : ''
}

/** Descriptions des pouvoirs de relique ✦ */
export const RELIC_DESCRIPTIONS: Record<string, string> = {
  'ember-bolt': 'Your bolts ignite enemies (burn)',
  'giant-slayer': '+30% damage to elites & bosses',
  thorns: 'Reflects 25% of contact damage',
  'four-boons': 'Blessings offer 4 choices',
  'hybrid-echo': 'Hybrid walking bonus doubled',
  'glacier-heart': 'Taking a hit freezes nearby enemies',
  'dune-strider': 'Your dash damages enemies it crosses',
  'storm-core': 'Crits chain lightning to another enemy',
  'gloom-lantern': '+40% run XP from orbs',
  'magma-fist': 'Bolts ignite; burns are twice as strong',
  'void-anchor': 'Enemy projectiles fly 15% slower',
}

export interface GearEffects {
  critChance: number
  critDamage: number
  lifesteal: number
  speedPct: number
  goldBonus: number
  xpBonus: number
  drainReduction: number
  dashCdReduction: number
  rangeBonus: number
  uniqueEffects: Set<RelicEffect>
}

export function aggregateGear(state: GameState): GearEffects {
  const out: GearEffects = {
    critChance: 0,
    critDamage: 0,
    lifesteal: 0,
    speedPct: 0,
    goldBonus: 0,
    xpBonus: 0,
    drainReduction: 0,
    dashCdReduction: 0,
    rangeBonus: 0,
    uniqueEffects: new Set(),
  }
  for (const slot of ['weapon', 'armor', 'charm'] as const) {
    const id = state.equipment.equipped[slot]
    const item = id ? catalogItem(id) : undefined
    if (!item) continue
    if (item.relicEffect) out.uniqueEffects.add(item.relicEffect)
    const e = item.effect
    if (!e) continue
    switch (e.id) {
      case 'crit-chance': out.critChance += e.value; break
      case 'crit-damage': out.critDamage += e.value; break
      case 'lifesteal': out.lifesteal += e.value; break
      case 'swiftness': out.speedPct += e.value; break
      case 'gold-touch': out.goldBonus += e.value; break
      case 'scholar': out.xpBonus += e.value; break
      case 'warm-light': out.drainReduction += e.value; break
      case 'dash-master': out.dashCdReduction += e.value; break
      case 'long-arm': out.rangeBonus += e.value; break
    }
  }
  // Sets d'équipement : 2 pièces = bonus mineur, 3 pièces = les deux bonus cumulés
  const setCounts = equippedSetCounts(state.equipment.equipped)
  const applyBonus = (b: SetBonus) => {
    for (const [k, v] of Object.entries(b)) {
      if (typeof v === 'number') (out as unknown as Record<string, number>)[k] += v
    }
  }
  for (const set of SETS) {
    const n = setCounts.get(set.id) ?? 0
    if (n >= 2) applyBonus(set.bonus2)
    if (n >= 3) applyBonus(set.bonus3)
  }
  return out
}

/** Nombre total d'objets du catalogue (progression de collection) */
export const CATALOG_SIZE = CATALOG.length
