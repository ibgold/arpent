// Sets d'équipement (Vague 2) : 3 pièces thématiques (arme + armure + charme).
// 2 pièces = bonus mineur, 3 pièces = bonus majeur cumulé. Agrégés dans aggregateGear.

import type { GearEffects } from './affixes'

/** Bonus de set : uniquement des champs numériques de GearEffects (pas de nouveaux hooks combat) */
export type SetBonus = Partial<Omit<GearEffects, 'uniqueEffects'>>

export interface SetDef {
  id: string
  name: string
  icon: string
  /** Les 3 catalogIds du set (un par slot) */
  pieces: [string, string, string]
  bonus2: SetBonus
  bonus3: SetBonus
  desc2: string
  desc3: string
}

export const SETS: SetDef[] = [
  {
    id: 'ember-set',
    name: 'Cinder Pilgrim',
    icon: '🔥',
    pieces: ['ember-pike', 'ember-shell', 'ember-bead'],
    bonus2: { critDamage: 0.2 },
    bonus3: { critDamage: 0.25, drainReduction: 0.08 },
    desc2: '+20% crit damage',
    desc3: '+45% crit damage · −8% energy drain',
  },
  {
    id: 'road-set',
    name: 'Toll Collector',
    icon: '🪙',
    pieces: ['toll-bell-hammer', 'innkeeper-apron', 'coin-of-the-road'],
    bonus2: { goldBonus: 0.15 },
    bonus3: { goldBonus: 0.3, speedPct: 0.05 },
    desc2: '+15% gold from kills',
    desc3: '+45% gold from kills · +5% move speed',
  },
  {
    id: 'mire-set',
    name: 'Marsh Walker',
    icon: '🌙',
    pieces: ['night-sickle', 'mist-cloak', 'marsh-lantern'],
    bonus2: { lifesteal: 0.03 },
    bonus3: { lifesteal: 0.04, dashCdReduction: 0.15 },
    desc2: 'heal 3% of damage dealt',
    desc3: 'heal 7% of damage dealt · −15% dash cooldown',
  },
  {
    id: 'scholar-set',
    name: 'Waking Scholar',
    icon: '📚',
    pieces: ['milestone-maul', 'pilgrim-mantle', 'owl-feather'],
    bonus2: { xpBonus: 0.2 },
    bonus3: { xpBonus: 0.3, critChance: 0.06 },
    desc2: '+20% XP from kills',
    desc3: '+50% XP from kills · +6% crit chance',
  },
]

export function setOf(catalogId: string): SetDef | undefined {
  return SETS.find((s) => s.pieces.includes(catalogId))
}

/** Pièces équipées par set : setId → count (0-3) */
export function equippedSetCounts(equipped: Partial<Record<string, string>>): Map<string, number> {
  const ids = new Set(Object.values(equipped).filter(Boolean) as string[])
  const counts = new Map<string, number>()
  for (const set of SETS) {
    const n = set.pieces.filter((p) => ids.has(p)).length
    if (n > 0) counts.set(set.id, n)
  }
  return counts
}
