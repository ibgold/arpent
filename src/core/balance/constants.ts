// TOUTES les constantes d'équilibrage, centralisées.
// L'objet est MUTABLE : le Balance Lab (Réglages) applique des overrides persistés
// par-dessus les défauts via applyBalanceOverrides() — voir tuning.ts.

export const BALANCE = {
  // --- Multiplicateurs globaux (équilibrage grossier en un geste) ---
  globalEnemyHpMult: 1,
  globalEnemyAtkMult: 1,
  globalGoldMult: 1,

  // --- Énergie (la ressource maîtresse : ne vient QUE de la marche) ---
  /** énergie/s = energyRatePerKmh × vitesse(km/h) × bonus de base */
  energyRatePerKmh: 0.5,
  /** Cible : ~10 min de marche à 4 km/h ≈ 1200 énergie ≈ 1 run correcte */
  runStartCost: 250,
  runDrainPerSec: 1.5,
  /** Drain additionnel par salle franchie (les runs profondes coûtent plus) */
  runDrainPerRoom: 0.15,

  // --- Pas quotidiens : le quota santé ---
  /** Longueur de foulée moyenne pour convertir distance → pas */
  stepLengthM: 0.7,
  dailyStepGoalDefault: 6000,
  dailyStepGoalMin: 2000,
  dailyStepGoalMax: 30000,
  /** Récompense d'objectif atteint : or + 1 coffre bonus */
  dailyGoalGold: 100,

  /** Rejouer une offre de capacité en run coûte de l'énergie */
  boonRerollCost: 30,

  // --- Hybride : marcher pendant une run ---
  hybridDamageBonusPerKmh: 0.06, // +6% dégâts par km/h de marche en direct
  hybridEnergyMultiplier: 1.25,  // l'énergie gagnée en run est boostée

  // --- Héros ---
  heroBaseHp: 100,
  heroHpPerLevel: 14,   // rééquilibrage : la croissance suit mieux le scaling des régions
  heroBaseAtk: 10,
  heroAtkPerLevel: 2.5,
  heroBaseSpeed: 170,          // px/s dans l'arène
  heroDashSpeed: 460,
  heroDashDurationMs: 180,
  heroDashCooldownMs: 900,
  /** Combat façon Archero : tir auto UNIQUEMENT à l'arrêt ; se déplacer = esquiver */
  heroAttackCooldownMs: 480,
  heroProjectileSpeed: 430,
  heroAttackRange: 540,        // portée d'acquisition de cible du tir auto
  heroInvulnAfterHitMs: 450,   // fenêtre d'invulnérabilité courte : le positionnement compte
  /** XP de run (orbes) : seuil du niveau n = runXpBase × runXpGrowth^(n-1) */
  runXpBase: 22,
  runXpGrowth: 1.45,
  /** Courbe adoucie : level-up fréquents en début de partie (cadence de dopamine) */
  xpForLevel: (level: number) => Math.round(60 * Math.pow(1.3, level - 1)),
  /** Paliers de distance marchée (m) → +1 niveau bonus par palier */
  distanceMilestonesM: [1000, 3000, 6000, 10000, 15000, 21000, 30000, 42000],

  // --- Ennemis (multiplicateurs par salle) ---
  enemyHpGrowthPerRoom: 0.3,
  enemyAtkGrowthPerRoom: 0.2,
  /** Scaling dynamique : les ennemis suivent partiellement le niveau effectif du héros
   *  (la progression se sent toujours, mais n'écrase jamais le challenge) */
  enemyHeroScalingHp: 0.06,
  enemyHeroScalingAtk: 0.035,
  enemyXp: { chaser: 8, shooter: 12, brute: 20, splitter: 10, dasher: 14 },
  roomsPerRegion: 6, // le boss est à la salle 6
  /** Chance qu'un ennemi spawn en élite (croît avec la salle) */
  eliteChanceBase: 0.08,
  eliteChancePerRoom: 0.025,
  eliteHpMult: 3,
  eliteAtkMult: 1.5,

  // --- Cages (disciples à secourir, 1 max par salle ; s'ouvrent au contact) ---
  cageChancePerRoom: 0.35,

  // --- Profondeurs : l'échelle infinie de difficulté (modèle Archero) ---
  /** Multiplicateurs composés par profondeur au-delà de la 1 */
  depthHpMult: 2.2,
  depthAtkMult: 1.6,
  depthGoldMult: 1.4,
  depthLootMult: 1.3,
  depthXpMult: 1.3,
  /** Drain d'énergie +15% par profondeur (descendre coûte plus de marche) */
  depthDrainBonus: 0.15,
  /** Chance d'élite +2% par profondeur */
  depthEliteBonus: 0.02,

  // --- Forge : l'or ET les ressources du village ont une destination sans fond ---
  /** coût d'amélioration = base × growth^niveau × multiplicateur de rareté */
  upgradeGoldBase: 25,
  upgradeGoldGrowth: 1.7,
  /** +12% de stats par niveau d'objet */
  upgradeStatBonus: 0.12,
  /** Bois requis à partir de +4, pierre à partir de +7 (le farm du village nourrit l'équipement) */
  upgradeWoodFromLevel: 3,
  upgradeWoodBase: 4,
  upgradeStoneFromLevel: 6,
  upgradeStoneBase: 3,
  upgradeResGrowth: 1.35,

  // --- Tir en mouvement : possible mais à cadence réduite (immobile = plein régime) ---
  movingFireCooldownMult: 2.1,
  movingFireRangeMult: 0.75,

  // --- Loot : les objets ne tombent presque plus des mobs (élites/boss/coffres/cages) ---
  lootDropChance: 0.04,
  rarityWeights: { common: 58, rare: 28, epic: 10, legendary: 4 },
  goldPerKill: [3, 7] as [number, number],
  /** Chance qu'un boss lâche un objet unique (légendaire nommé) */
  bossUniqueChance: 0.25,
  woodDropChance: 0.12,
  stoneDropChance: 0.08,
  resourceDropAmount: [1, 2] as [number, number],

  // --- Critiques ---
  critChance: 0.12,
  critMultiplier: 2.2,

  // --- Jardin 🌱 (croissance en mètres marchés, fanaison, drops de graines) ---
  /** Multiplicateur global de croissance (mètres crédités aux plantes) */
  gardenGrowthMult: 1,
  /** Bonus de streak par jour consécutif (croissance ET rendement) */
  gardenStreakBonusPerDay: 0.05,
  /** Cap du bonus de streak */
  gardenStreakBonusCap: 0.5,
  /** Mode Chill : jours d'inactivité avant fanaison (jamais de compost) */
  gardenWiltDaysChill: 4,
  /** Mode Intense : jours avant fanaison, puis compost, avec rendement boosté */
  gardenWiltDaysIntense: 2,
  gardenCompostDaysIntense: 3,
  gardenIntenseYieldMult: 1.25,
  /** Chance qu'une élite lâche une graine rare (champion : garanti) */
  seedDropEliteChance: 0.15,
  /** Chance que chaque graine de boss soit ultra-rare */
  seedDropUltraChance: 0.1,

  // --- Capteurs réels 📡 (calibrables en live via le Balance Lab, sans redéploiement) ---
  /** Podomètre : pic d'accélération (m/s², gravité incluse ≈ 9.81 au repos) qui compte un pas */
  sensorPeakThreshold: 11.5,
  /** Podomètre : intervalle minimal entre deux pas (ms) — cadence humaine max */
  sensorStepIntervalMs: 300,
  /** GPS : précision maximale acceptée d'un fix (m) — au-delà, fix ignoré */
  gpsMaxAccuracyM: 35,
  /** GPS : vitesses hors de [min, max] km/h ignorées (jitter à l'arrêt, véhicule) */
  gpsMinSpeedKmh: 1,
  gpsMaxSpeedKmh: 12,
}

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary'

export const RARITY_ORDER: Rarity[] = ['common', 'rare', 'epic', 'legendary']

export const RARITY_COLORS: Record<Rarity, number> = {
  common: 0x9ca3af,
  rare: 0x38bdf8,
  epic: 0xa78bfa,
  legendary: 0xfbbf24,
}

export const RARITY_STAT_MULT: Record<Rarity, number> = {
  common: 1,
  rare: 1.6,
  epic: 2.5,
  legendary: 4,
}
