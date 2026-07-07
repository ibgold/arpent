// Les bâtiments du village : construits avec or/bois/pierre, pourvus en Éveillés (disciples).
// La production ne tourne QUE pendant la marche — la boucle centrale reste intacte.

export type ResourceKind = 'gold' | 'wood' | 'stone'

export interface BuildingDef {
  id: string
  name: string
  icon: string
  description: string
  /** Ressource produite par Éveillé assigné (par seconde de marche), null = pas de production */
  produces: ResourceKind | null
  ratePerFollower: number
  /** Coût du niveau 1 ; chaque niveau suivant ×costGrowth */
  baseCost: Partial<Record<ResourceKind, number>>
  costGrowth: number
  maxLevel: number
}

export const BUILDINGS: BuildingDef[] = [
  {
    id: 'hearth',
    name: 'The Hearth',
    icon: '🔥',
    description: 'Each level: +3% hero max HP, +10% village output, +2 follower beds.',
    produces: null,
    ratePerFollower: 0,
    baseCost: { gold: 60, wood: 25, stone: 10 },
    costGrowth: 1.7,
    maxLevel: 5,
  },
  {
    id: 'shrine',
    name: 'Waking Shrine',
    icon: '⛩️',
    description: 'Each level: +2% gold from kills. Followers channel gold while you walk.',
    produces: 'gold',
    ratePerFollower: 0.12,
    baseCost: { gold: 30, wood: 15 },
    costGrowth: 1.6,
    maxLevel: 4,
  },
  {
    id: 'lumber-hut',
    name: 'Lumber Hut',
    icon: '🪵',
    description: 'Each level: +1.5% hero ATK. Followers gather wood while you walk.',
    produces: 'wood',
    ratePerFollower: 0.07,
    baseCost: { gold: 25 },
    costGrowth: 1.6,
    maxLevel: 4,
  },
  {
    id: 'quarry',
    name: 'Old Quarry',
    icon: '⛏️',
    description: 'Each level: +2% XP from kills. Followers mine stone while you walk.',
    produces: 'stone',
    ratePerFollower: 0.05,
    baseCost: { gold: 40, wood: 20 },
    costGrowth: 1.6,
    maxLevel: 4,
  },
  // --- Projets de marche : la raison de grinder les ressources ---
  {
    id: 'watchtower',
    name: 'Watchtower',
    icon: '🗼',
    description: 'Each level: +5% energy from walking. The village watches over your strides.',
    produces: null,
    ratePerFollower: 0,
    baseCost: { gold: 120, stone: 40 },
    costGrowth: 1.8,
    maxLevel: 3,
  },
  {
    id: 'paved-road',
    name: 'Paved Road',
    icon: '🛤️',
    description: 'Each level: road finds come 100 m sooner.',
    produces: null,
    ratePerFollower: 0,
    baseCost: { gold: 80, wood: 60 },
    costGrowth: 1.8,
    maxLevel: 3,
  },
  {
    id: 'waking-statue',
    name: 'Waking Statue',
    icon: '🗿',
    description: 'Each level: +1 follower bed and +2% Hybrid walking damage.',
    produces: null,
    ratePerFollower: 0,
    baseCost: { gold: 200, wood: 30, stone: 30 },
    costGrowth: 1.9,
    maxLevel: 3,
  },
]

export function getBuilding(id: string): BuildingDef | undefined {
  return BUILDINGS.find((b) => b.id === id)
}

/** Coût pour passer du niveau `level` au niveau `level+1` (level 0 = construction) */
export function buildingCost(def: BuildingDef, level: number): Partial<Record<ResourceKind, number>> {
  const mult = Math.pow(def.costGrowth, level)
  const out: Partial<Record<ResourceKind, number>> = {}
  for (const [k, v] of Object.entries(def.baseCost) as [ResourceKind, number][]) {
    out[k] = Math.round(v * mult)
  }
  return out
}

/** Places de travail d'un bâtiment = son niveau */
export function buildingSlots(level: number): number {
  return level
}

/** Capacité totale d'Éveillés du village (Foyer + Statue) */
export function followerCapacity(base: Record<string, { level: number }>): number {
  return 2 + (base.hearth?.level ?? 1) * 2 + (base['waking-statue']?.level ?? 0)
}

/** Multiplicateur global de production du village */
export function hearthMultiplier(hearthLevel: number): number {
  return 1 + Math.max(0, hearthLevel - 1) * 0.1
}

/** Bonus de combat permanents du village : chaque bâtiment rend le héros plus fort */
export interface VillageCombatBonuses {
  hpMult: number
  atkMult: number
  goldMult: number
  xpMult: number
  /** Watchtower : multiplicateur de gain d'énergie de marche */
  energyMult: number
  /** Paved Road : mètres retranchés à la distance des trouvailles de route */
  roadReduceM: number
  /** Waking Statue : bonus additionnel de dégâts Hybride */
  hybridBonus: number
}

export function villageCombatBonuses(base: Record<string, { level: number }>): VillageCombatBonuses {
  return {
    hpMult: 1 + (base.hearth?.level ?? 0) * 0.03,
    atkMult: 1 + (base['lumber-hut']?.level ?? 0) * 0.015,
    goldMult: 1 + (base.shrine?.level ?? 0) * 0.02,
    xpMult: 1 + (base.quarry?.level ?? 0) * 0.02,
    energyMult: 1 + (base.watchtower?.level ?? 0) * 0.05,
    roadReduceM: (base['paved-road']?.level ?? 0) * 100,
    hybridBonus: (base['waking-statue']?.level ?? 0) * 0.02,
  }
}
