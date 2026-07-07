// Le Jardin 🌱 : le pilier contemplation. La croissance se paie en mètres marchés,
// jamais en énergie. Fanaison douce (Chill) ou mordante (Intense), arbres immortels.

import { BALANCE } from './constants'

export type SeedTier = 'common' | 'rare' | 'ultra'
export type SeedKind = 'veg' | 'herb' | 'flower' | 'tree'
export type GardenMode = 'chill' | 'intense'
export type PotionId = 'vigor' | 'fortune' | 'focus' | 'legend'

export interface SeedDef {
  id: string
  name: string
  icon: string
  kind: SeedKind
  tier: SeedTier
  /** Mètres de marche pour arriver à maturité (plantes) */
  needM: number
  /** Région minimale pour le drop en donjon (rare/ultra) */
  minRegion: number
  /** Récolte */
  gold?: number
  essence?: number
  wood?: number
  /** Portions de nourriture (légumes) : nourrissent les Éveillés */
  food?: number
  potion?: PotionId
  flower?: boolean
  /** Arbres : jours de marche distincts requis par palier */
  daysPerStage?: number
  /** Arbres : description du bonus par palier */
  stageBonus?: string
  flavor: string
}

export const SEEDS: SeedDef[] = [
  // Communes — la boucle autosuffisante
  { id: 'glow-carrot', name: 'Glow Carrot', icon: '🥕', kind: 'veg', tier: 'common', needM: 400, minRegion: 0, gold: 18, food: 2, flavor: 'It hums softly underground.' },
  { id: 'sun-daisy', name: 'Sun Daisy', icon: '🌼', kind: 'flower', tier: 'common', needM: 300, minRegion: 0, essence: 4, flower: true, flavor: 'It follows you, not the sun.' },
  { id: 'green-mint', name: 'Green Mint', icon: '🌿', kind: 'herb', tier: 'common', needM: 500, minRegion: 0, potion: 'vigor', flavor: 'Fresh enough to wake a mountain.' },
  // Rares — le pont vers le donjon
  { id: 'ember-pumpkin', name: 'Ember Pumpkin', icon: '🎃', kind: 'veg', tier: 'rare', needM: 1400, minRegion: 1, gold: 60, wood: 6, food: 5, flavor: 'Warm all winter.' },
  { id: 'ember-sage', name: 'Ember Sage', icon: '🍂', kind: 'herb', tier: 'rare', needM: 1600, minRegion: 1, potion: 'fortune', flavor: 'Burns bright in a teapot.' },
  { id: 'marsh-melon', name: 'Marsh Melon', icon: '🍈', kind: 'veg', tier: 'rare', needM: 1800, minRegion: 2, essence: 18, food: 4, flavor: 'Suspiciously heavy.' },
  { id: 'night-fern', name: 'Night Fern', icon: '🌑', kind: 'herb', tier: 'rare', needM: 2000, minRegion: 2, potion: 'focus', flavor: 'It grows toward the dark.' },
  { id: 'moon-orchid', name: 'Moon Orchid', icon: '🌸', kind: 'flower', tier: 'rare', needM: 1500, minRegion: 2, essence: 12, flower: true, flavor: 'Blooms once, remembered forever.' },
  // Ultra-rares — les trophées des boss
  { id: 'royal-turnip', name: 'Royal Turnip', icon: '👑', kind: 'veg', tier: 'ultra', needM: 4000, minRegion: 0, gold: 220, essence: 30, food: 10, flavor: 'The Rootbound King’s last laugh.' },
  { id: 'dawn-lotus', name: 'Dawn Lotus', icon: '🪷', kind: 'herb', tier: 'ultra', needM: 4500, minRegion: 0, potion: 'legend', flavor: 'It opens for those who kept walking.' },
  // Arbres — le patrimoine (immortels, paliers de régularité)
  { id: 'oak-of-steps', name: 'Oak of Steps', icon: '🌳', kind: 'tree', tier: 'common', needM: 0, minRegion: 0, daysPerStage: 3, stageBonus: '+3% garden growth per stage', flavor: 'Each ring is a week of your life.' },
  { id: 'ember-willow', name: 'Ember Willow', icon: '🌳', kind: 'tree', tier: 'rare', needM: 0, minRegion: 1, daysPerStage: 4, stageBonus: '+2 ⚗ per walking day per stage', flavor: 'It weeps warm light.' },
  { id: 'world-sapling', name: 'World Sapling', icon: '🌳', kind: 'tree', tier: 'ultra', needM: 0, minRegion: 0, daysPerStage: 5, stageBonus: '+1% walking energy per stage', flavor: 'One day it will hold the sky.' },
]

export const TREE_MAX_STAGE = 5
export const GARDEN_PLOTS = 9
export const GARDEN_TREES = 3

export function seedDef(id: string): SeedDef | undefined {
  return SEEDS.find((s) => s.id === id)
}

/** Paramètres des deux modes : la conséquence existe, jamais la dévastation.
 *  Getters : les valeurs viennent de BALANCE, réglables dans le Balance Lab. */
export const GARDEN_MODES: Record<GardenMode, { wiltAfterDays: number; compostAfterDays: number | null; yieldMult: number }> = {
  get chill() {
    return { wiltAfterDays: BALANCE.gardenWiltDaysChill, compostAfterDays: null, yieldMult: 1 }
  },
  get intense() {
    return {
      wiltAfterDays: BALANCE.gardenWiltDaysIntense,
      compostAfterDays: BALANCE.gardenCompostDaysIntense,
      yieldMult: BALANCE.gardenIntenseYieldMult,
    }
  },
}

/** Streak → multiplicateur de croissance ET de rendement : +5%/jour, cap +50% (réglable) */
export function streakMult(streakDays: number): number {
  return 1 + Math.min(BALANCE.gardenStreakBonusCap, Math.max(0, streakDays - 1) * BALANCE.gardenStreakBonusPerDay)
}

export interface PotionDef {
  id: PotionId
  name: string
  icon: string
  description: string
}

export const POTIONS: PotionDef[] = [
  { id: 'vigor', name: 'Potion of Vigor', icon: '❤️', description: '+30% max HP for this run' },
  { id: 'fortune', name: 'Potion of Fortune', icon: '💰', description: '+50% gold for this run' },
  { id: 'focus', name: 'Potion of Focus', icon: '🎯', description: 'Start the run with a free ability choice' },
  { id: 'legend', name: 'Potion of Legend', icon: '⭐', description: 'Start the run with TWO free ability choices' },
]

export function potionDef(id: string): PotionDef | undefined {
  return POTIONS.find((p) => p.id === id)
}

/** Drop de graine en donjon : tire dans le pool éligible (région, tier) */
export function rollSeedDrop(regionOrder: number, tier: SeedTier): string {
  const pool = SEEDS.filter((s) => s.tier === tier && s.minRegion <= regionOrder && s.kind !== 'tree')
  const withTrees = tier !== 'common' && Math.random() < 0.2
    ? SEEDS.filter((s) => s.tier === tier && s.minRegion <= regionOrder)
    : pool
  const pick = withTrees.length > 0 ? withTrees : SEEDS.filter((s) => s.tier === 'common')
  return pick[Math.floor(Math.random() * pick.length)].id
}

/** Nombre de jours entre deux clés de jour (YYYY-MM-DD) */
export function daysBetween(fromDay: string, toDay: string): number {
  if (!fromDay || !toDay) return 0
  const a = new Date(fromDay + 'T00:00:00Z').getTime()
  const b = new Date(toDay + 'T00:00:00Z').getTime()
  return Math.max(0, Math.round((b - a) / 86400000))
}
