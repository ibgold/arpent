import { BALANCE } from './constants'

// Le Balance Lab : tous les scalaires d'équilibrage sont réglables en jeu, sans code.
// Les overrides sont persistés dans la save et appliqués par-dessus les défauts.

/** Snapshot des valeurs par défaut (uniquement les clés numériques), pris au chargement du module */
export const BALANCE_DEFAULTS: Record<string, number> = {}
for (const [k, v] of Object.entries(BALANCE)) {
  if (typeof v === 'number') BALANCE_DEFAULTS[k] = v
}

/** Applique les overrides : chaque clé numérique reprend son défaut puis l'override éventuel */
export function applyBalanceOverrides(overrides: Record<string, number>): void {
  const target = BALANCE as unknown as Record<string, number>
  for (const key of Object.keys(BALANCE_DEFAULTS)) {
    const o = overrides[key]
    target[key] = typeof o === 'number' && Number.isFinite(o) ? o : BALANCE_DEFAULTS[key]
  }
}

export interface TunableDef {
  key: string
  label: string
  min: number
  max: number
  step: number
}

export interface TunableGroup {
  name: string
  icon: string
  items: TunableDef[]
}

/** Le manifeste du Balance Lab : quoi régler, dans quelles bornes */
export const TUNABLE_GROUPS: TunableGroup[] = [
  {
    name: 'Global multipliers',
    icon: '🌍',
    items: [
      { key: 'globalEnemyHpMult', label: 'Enemy HP ×', min: 0.2, max: 5, step: 0.1 },
      { key: 'globalEnemyAtkMult', label: 'Enemy ATK ×', min: 0.2, max: 5, step: 0.1 },
      { key: 'globalGoldMult', label: 'Gold from kills ×', min: 0.2, max: 5, step: 0.1 },
    ],
  },
  {
    name: 'Walking & energy',
    icon: '👟',
    items: [
      { key: 'energyRatePerKmh', label: 'Energy per km/h per s', min: 0.1, max: 3, step: 0.05 },
      { key: 'runStartCost', label: 'Run start cost ⚡', min: 50, max: 1000, step: 25 },
      { key: 'energyCap', label: 'Energy cap (reservoir)', min: 300, max: 8000, step: 100 },
      { key: 'energyOverflowGoldDivisor', label: 'Overflow → gold (÷)', min: 1, max: 50, step: 1 },
      { key: 'overchargeCostPerStep', label: 'Overcharge ⚡ per step', min: 50, max: 1000, step: 25 },
      { key: 'overchargeBonusPerStep', label: 'Overcharge bonus/step', min: 0.05, max: 0.5, step: 0.05 },
      { key: 'overchargeMaxSteps', label: 'Overcharge max steps', min: 1, max: 10, step: 1 },
      { key: 'runDrainPerSec', label: 'Run drain ⚡/s', min: 0.2, max: 8, step: 0.1 },
      { key: 'runDrainPerRoom', label: 'Extra drain per room', min: 0, max: 2, step: 0.05 },
      { key: 'hybridEnergyMultiplier', label: 'Hybrid energy ×', min: 1, max: 3, step: 0.05 },
      { key: 'hybridDamageBonusPerKmh', label: 'Hybrid dmg per km/h', min: 0, max: 0.3, step: 0.01 },
      { key: 'strideBaseM', label: 'Stride base (m)', min: 0.2, max: 0.7, step: 0.01 },
      { key: 'stridePerKmh', label: 'Stride per km/h (m)', min: 0, max: 0.15, step: 0.005 },
      { key: 'dailyGoalGold', label: 'Daily goal gold', min: 0, max: 1000, step: 25 },
      { key: 'boonRerollCost', label: 'Ability reroll cost ⚡', min: 0, max: 200, step: 5 },
    ],
  },
  {
    name: 'Hero',
    icon: '🧙',
    items: [
      { key: 'heroBaseHp', label: 'Base HP', min: 40, max: 400, step: 10 },
      { key: 'heroHpPerLevel', label: 'HP per level', min: 2, max: 50, step: 1 },
      { key: 'heroBaseAtk', label: 'Base ATK', min: 3, max: 60, step: 1 },
      { key: 'heroAtkPerLevel', label: 'ATK per level', min: 0.5, max: 12, step: 0.5 },
      { key: 'heroBaseSpeed', label: 'Move speed', min: 90, max: 320, step: 10 },
      { key: 'heroAttackCooldownMs', label: 'Attack cooldown (ms)', min: 150, max: 1200, step: 20 },
      { key: 'heroAttackRange', label: 'Attack range (px)', min: 200, max: 1000, step: 20 },
      { key: 'heroProjectileSpeed', label: 'Bolt speed', min: 200, max: 900, step: 20 },
      { key: 'heroInvulnAfterHitMs', label: 'I-frames after hit (ms)', min: 100, max: 1500, step: 50 },
      { key: 'heroDashCooldownMs', label: 'Dash cooldown (ms)', min: 300, max: 2500, step: 50 },
      { key: 'critChance', label: 'Crit chance', min: 0, max: 0.6, step: 0.01 },
      { key: 'critMultiplier', label: 'Crit damage ×', min: 1.2, max: 5, step: 0.1 },
      { key: 'movingFireCooldownMult', label: 'Moving-fire cooldown ×', min: 1, max: 5, step: 0.1 },
      { key: 'movingFireRangeMult', label: 'Moving-fire range ×', min: 0.3, max: 1, step: 0.05 },
    ],
  },
  {
    name: 'Enemies & elites',
    icon: '👹',
    items: [
      { key: 'enemyHpGrowthPerRoom', label: 'HP growth per room', min: 0, max: 1, step: 0.05 },
      { key: 'enemyAtkGrowthPerRoom', label: 'ATK growth per room', min: 0, max: 1, step: 0.05 },
      { key: 'enemyHeroScalingHp', label: 'HP scaling per hero lvl', min: 0, max: 0.3, step: 0.01 },
      { key: 'enemyHeroScalingAtk', label: 'ATK scaling per hero lvl', min: 0, max: 0.3, step: 0.005 },
      { key: 'eliteChanceBase', label: 'Elite chance base', min: 0, max: 0.5, step: 0.01 },
      { key: 'eliteChancePerRoom', label: 'Elite chance per room', min: 0, max: 0.15, step: 0.005 },
      { key: 'eliteHpMult', label: 'Elite HP ×', min: 1.5, max: 8, step: 0.25 },
      { key: 'eliteAtkMult', label: 'Elite ATK ×', min: 1, max: 4, step: 0.1 },
    ],
  },
  {
    name: 'Depths',
    icon: '⛏️',
    items: [
      { key: 'depthHpMult', label: 'Enemy HP × per depth', min: 1.2, max: 4, step: 0.1 },
      { key: 'depthAtkMult', label: 'Enemy ATK × per depth', min: 1.1, max: 3, step: 0.05 },
      { key: 'depthGoldMult', label: 'Gold × per depth', min: 1, max: 3, step: 0.05 },
      { key: 'depthXpMult', label: 'XP × per depth', min: 1, max: 3, step: 0.05 },
      { key: 'depthDrainBonus', label: 'Drain bonus per depth', min: 0, max: 0.6, step: 0.05 },
      { key: 'depthEliteBonus', label: 'Elite chance per depth', min: 0, max: 0.15, step: 0.005 },
    ],
  },
  {
    name: 'Rewards & forge',
    icon: '⚗️',
    items: [
      { key: 'woodDropChance', label: 'Wood drop chance', min: 0, max: 0.6, step: 0.02 },
      { key: 'stoneDropChance', label: 'Stone drop chance', min: 0, max: 0.6, step: 0.02 },
      { key: 'cageChancePerRoom', label: 'Cage chance per room', min: 0, max: 1, step: 0.05 },
      { key: 'cageMaxPerRun', label: 'Cages max per run', min: 0, max: 6, step: 1 },
      { key: 'eliteGoldMult', label: 'Elite gold ×', min: 1, max: 5, step: 0.5 },
      { key: 'bossUniqueChance', label: 'Boss relic chance', min: 0, max: 1, step: 0.05 },
      { key: 'runXpBase', label: 'Run XP base threshold', min: 8, max: 80, step: 2 },
      { key: 'runXpGrowth', label: 'Run XP growth ×', min: 1.1, max: 2.5, step: 0.05 },
      { key: 'upgradeGoldBase', label: 'Forge gold base', min: 5, max: 200, step: 5 },
      { key: 'upgradeGoldGrowth', label: 'Forge gold growth ×', min: 1.1, max: 3, step: 0.05 },
      { key: 'upgradeStatBonus', label: 'Forge stat bonus per lvl', min: 0.02, max: 0.4, step: 0.01 },
    ],
  },
  {
    name: 'Garden',
    icon: '🌱',
    items: [
      { key: 'gardenGrowthMult', label: 'Growth speed ×', min: 0.2, max: 5, step: 0.1 },
      { key: 'gardenStreakBonusPerDay', label: 'Streak bonus per day', min: 0, max: 0.2, step: 0.01 },
      { key: 'gardenStreakBonusCap', label: 'Streak bonus cap', min: 0, max: 2, step: 0.05 },
      { key: 'gardenWiltDaysChill', label: 'Chill: wilt after (days)', min: 1, max: 14, step: 1 },
      { key: 'gardenWiltDaysIntense', label: 'Intense: wilt after (days)', min: 1, max: 7, step: 1 },
      { key: 'gardenCompostDaysIntense', label: 'Intense: compost after wilt (days)', min: 1, max: 10, step: 1 },
      { key: 'gardenIntenseYieldMult', label: 'Intense yield ×', min: 1, max: 2, step: 0.05 },
      { key: 'seedDropEliteChance', label: 'Elite seed drop chance', min: 0, max: 1, step: 0.05 },
      { key: 'seedDropUltraChance', label: 'Boss ultra-seed chance', min: 0, max: 1, step: 0.05 },
    ],
  },
  {
    name: 'Sensors',
    icon: '📡',
    items: [
      { key: 'sensorPeakThreshold', label: 'Step peak threshold (m/s²)', min: 10, max: 16, step: 0.1 },
      { key: 'sensorStepIntervalMs', label: 'Min ms between steps', min: 200, max: 600, step: 10 },
      { key: 'gpsMaxAccuracyM', label: 'GPS max accuracy (m)', min: 10, max: 100, step: 5 },
      { key: 'gpsMinSpeedKmh', label: 'GPS min speed (km/h)', min: 0, max: 3, step: 0.1 },
      { key: 'gpsMaxSpeedKmh', label: 'GPS max speed (km/h)', min: 6, max: 20, step: 0.5 },
    ],
  },
]
