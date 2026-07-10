import { create } from 'zustand'
import { BALANCE, RARITY_STAT_MULT, type Rarity } from '../balance/constants'
import { aggregateSkills, SKILLS, skillPointsAvailable } from '../balance/skills'
import { FINAL_REGION_ID, getRegion, nextRegion, REGIONS } from '../balance/regions'
import { hasUnlock } from '../balance/collectionRewards'
import {
  buildingCost,
  buildingSlots,
  followerCapacity,
  getBuilding,
  hearthMultiplier,
  villageCombatBonuses,
  type ResourceKind,
} from '../balance/buildings'
import { generateFollower, GIFT_THRESHOLD_M, moodOf, rollFollowerGift } from '../balance/followers'
import { CHEST_MAX_STORED, rollChestReward, type ChestReward } from '../balance/chests'
import { questDef, rollInitialQuests, rollQuest, type QuestKind, type QuestReward } from '../balance/quests'
import { aggregateGear } from '../balance/affixes'
import { catalogItem, DUPE_ESSENCE, FORGE_CAP, rollCatalogItem } from '../balance/catalog'
import { applyBalanceOverrides } from '../balance/tuning'
import {
  daysBetween,
  GARDEN_MODES,
  GARDEN_PLOTS,
  GARDEN_TREES,
  rollSeedDrop,
  seedDef,
  streakMult,
  TREE_MAX_STAGE,
} from '../balance/garden'
import { CHALLENGE_REWARD_GOLD, challengeDayKey, challengeWonToday } from '../balance/challenge'
import { chestDistanceM, pendingPerkPicks, PRESTIGE_PERKS, prestigeFollowerBonus } from '../balance/prestigePerks'
import { rollVillageEventId, VILLAGE_EVENT_CHANCE } from '../balance/villageEvents'
import type { AcquireResult, Follower, GameState, GardenState, ItemSlot, RunState, RunSummary } from '../types'

// Source de vérité unique de la méta. Phaser y accède via useGameStore.getState().

export interface HeroDerivedStats {
  maxHp: number
  atk: number
  speed: number
}

interface GameActions {
  /** Un échantillon de marche : énergie + distance + production du village + trouvailles de la route */
  applyWalkSample: (distanceDeltaM: number, speedKmh: number, dtS: number) => void
  spendEnergy: (amount: number) => boolean
  spendGold: (amount: number) => boolean
  drainEnergy: (amount: number) => number
  startRun: (
    regionId: string,
    contractIds?: string[],
    depth?: number,
    potionId?: string,
    challenge?: boolean,
    mode?: 'boss-rush' | 'colosseum',
    overchargeSteps?: number,
  ) => boolean
  /** Colosseum : enregistre la meilleure vague atteinte */
  recordColosseumWave: (wave: number) => void
  /** Défi quotidien 🏅 : réclame la récompense de victoire (une par jour), retourne le résumé ou null */
  winDailyChallenge: () => string | null
  updateRun: (patch: Partial<RunState>) => void
  endRun: (summary: RunSummary) => void
  /** Événement de village : accepte ou décline, retourne le résumé */
  resolveVillageEvent: (accept: boolean) => { label: string } | null
  gainXp: (amount: number) => void
  buySkill: (skillId: string) => boolean
  rebirth: () => boolean
  /** Prestige : dépense un choix de perk (un par rang de Renaissance) */
  pickPrestigePerk: (perkId: string) => boolean
  addToBestiary: (enemyKind: string) => void
  /** Acquisition d'un objet du catalogue : découverte (Collection) ou doublon (Essence) */
  acquireItem: (catalogId: string) => AcquireResult
  equipItem: (catalogId: string) => boolean
  /** Forge : or + Essence (+ bois dès +4, pierre dès +7), cap selon la rareté */
  upgradeItem: (catalogId: string) => boolean
  buildOrUpgrade: (buildingId: string) => boolean
  rescueFollower: () => Follower | null
  assignFollower: (followerId: string, buildingId: string | undefined) => boolean
  /** Cadeau d'Éveillé : réclame le cadeau d'un moral plein, retourne le résumé (ou null) */
  claimFollowerGift: (followerId: string) => { label: string } | null
  openWanderChest: () => ChestReward | null
  questProgress: (kind: QuestKind, amount: number) => void
  claimQuest: (questId: string) => QuestReward | null
  setDailyGoal: (goal: number) => void
  // --- Jardin 🌱 ---
  addSeed: (seedId: string, count?: number) => void
  plantSeed: (plotIdx: number, seedId: string) => boolean
  plantTree: (treeIdx: number, seedId: string) => boolean
  /** Récolte une parcelle mûre : applique les gains, rend des graines communes, retourne un résumé */
  harvestPlot: (plotIdx: number) => { label: string } | null
  /** Arrache une plante (fanée ou non) → +1 compost */
  uprootPlot: (plotIdx: number) => void
  /** Nourrit le village : consomme 1 🍲 food par Éveillé → acclamation doublée pendant 2 jours */
  feedVillage: () => boolean
  /** Balance Lab : fixe (ou retire avec null) l'override d'une constante d'équilibrage */
  setBalanceOverride: (key: string, value: number | null) => void
  resetBalanceOverrides: () => void
  setSettings: (patch: Partial<GameState['settings']>) => void
  hydrate: (saved: GameState) => void
  resetAll: () => void
}

export type Store = GameState & GameActions

export const SAVE_VERSION = 14

/** Acclamation du village : chaque Éveillé augmente le gain d'énergie de 0.5% (plafonné à +10%) */
export const CHEER_PER_FOLLOWER = 0.005
export const CHEER_CAP = 0.1

/** Bonus permanent de prestige : +10% ATK et gain d'énergie par rang */
export const PRESTIGE_BONUS_PER_RANK = 0.1

/** Trouvaille de la route : un objet du catalogue tous les 2 km marchés (1.5 km avec Keen Boots) */
export const ROAD_FIND_DISTANCE_M = 2000

export function roadFindDistance(s: GameState): number {
  const base = hasUnlock(s, 'keen-boots') ? 1500 : ROAD_FIND_DISTANCE_M
  // Paved Road : −100 m par niveau, plancher à 1 km
  return Math.max(1000, base - villageCombatBonuses(s.base).roadReduceM)
}

export function chestCapacity(s: GameState): number {
  return CHEST_MAX_STORED + (hasUnlock(s, 'chest-cap') ? 1 : 0)
}

/** Bonus de collection : chaque objet découvert rend le héros définitivement plus fort */
export const COLLECTION_HP_PER_ITEM = 2
export const COLLECTION_ATK_PER_ITEM = 0.5

export const initialGameState = (): GameState => ({
  version: SAVE_VERSION,
  energy: 0,
  totalEnergyEarned: 0,
  totalDistanceM: 0,
  gold: 0,
  wood: 0,
  stone: 0,
  essence: 0,
  base: { hearth: { level: 1 } },
  followers: [],
  wanderChests: { progressM: 0, stored: 0 },
  roadProgressM: 0,
  lastRoadFind: undefined,
  quests: rollInitialQuests(),
  hero: { level: 1, xp: 0, skills: [] },
  equipment: { equipped: {}, owned: {} },
  progression: { unlockedRegions: ['verdant-hollow'], bossesDefeated: [], depth: 1 },
  collections: { bestiary: [], regions: [] },
  dailyStreak: { days: 0, lastDay: '' },
  dailySteps: { date: '', steps: 0, goal: BALANCE.dailyStepGoalDefault, rewarded: false },
  prestige: { rank: 0, permanentBonus: 0, perks: [] },
  balanceOverrides: {},
  dailyChallenge: { lastWonDay: '' },
  garden: initialGarden(),
  run: undefined,
  settings: { sound: true, haptics: true, keepAwake: true, theme: 'dark', inputMode: 'simulation', simSpeedKmh: 4, gardenMode: 'chill' },
})

/** Jardin de départ : quelques graines pour planter dès la première visite */
export function initialGarden(): GardenState {
  return {
    plots: Array.from({ length: GARDEN_PLOTS }, () => null),
    trees: Array.from({ length: GARDEN_TREES }, () => null),
    seeds: { 'glow-carrot': 2, 'sun-daisy': 1, 'green-mint': 1, 'oak-of-steps': 1 },
    potions: {},
    compost: 0,
    food: 0,
    blooms: {},
    fedUntilDay: undefined,
  }
}

/** Paliers de distance : bonus PLATS permanents */
export function distanceBonusLevels(totalDistanceM: number): number {
  return BALANCE.distanceMilestonesM.filter((m) => totalDistanceM >= m).length
}

/** Stats effectives d'un objet du catalogue possédé (base × forge) */
export function itemStats(catalogId: string, level: number): { atk: number; hp: number; speed: number } {
  const def = catalogItem(catalogId)
  if (!def) return { atk: 0, hp: 0, speed: 0 }
  const mult = 1 + level * BALANCE.upgradeStatBonus
  return { atk: Math.round(def.atk * mult), hp: Math.round(def.hp * mult), speed: Math.round(def.speed * mult) }
}

/** Coût du prochain niveau de forge : or + essence, + bois dès +4, + pierre dès +7 */
export function upgradeItemCost(catalogId: string, level: number): { gold: number; essence: number; wood: number; stone: number } {
  const def = catalogItem(catalogId)
  const rarityMult = RARITY_STAT_MULT[(def?.rarity ?? 'common') as Rarity]
  return {
    gold: Math.round(BALANCE.upgradeGoldBase * Math.pow(BALANCE.upgradeGoldGrowth, level) * rarityMult),
    essence: Math.round(4 * Math.pow(1.5, level) * rarityMult),
    wood:
      level >= BALANCE.upgradeWoodFromLevel
        ? Math.round(BALANCE.upgradeWoodBase * Math.pow(BALANCE.upgradeResGrowth, level - BALANCE.upgradeWoodFromLevel) * rarityMult)
        : 0,
    stone:
      level >= BALANCE.upgradeStoneFromLevel
        ? Math.round(BALANCE.upgradeStoneBase * Math.pow(BALANCE.upgradeResGrowth, level - BALANCE.upgradeStoneFromLevel) * rarityMult)
        : 0,
  }
}

export function heroStats(s: GameState): HeroDerivedStats {
  const milestones = distanceBonusLevels(s.totalDistanceM)
  const discovered = Object.keys(s.equipment.owned).length
  let maxHp =
    BALANCE.heroBaseHp + (s.hero.level - 1) * BALANCE.heroHpPerLevel + milestones * 10 + discovered * COLLECTION_HP_PER_ITEM
  let atk =
    BALANCE.heroBaseAtk + (s.hero.level - 1) * BALANCE.heroAtkPerLevel + milestones * 1.5 + discovered * COLLECTION_ATK_PER_ITEM
  let speed = BALANCE.heroBaseSpeed
  for (const slot of ['weapon', 'armor', 'charm'] as ItemSlot[]) {
    const id = s.equipment.equipped[slot]
    const owned = id ? s.equipment.owned[id] : undefined
    if (!id || !owned) continue
    const st = itemStats(id, owned.level)
    maxHp += st.hp
    atk += st.atk
    speed += st.speed
  }
  const skills = aggregateSkills(s.hero.skills)
  const gear = aggregateGear(s)
  const village = villageCombatBonuses(s.base)
  maxHp *= skills.hpMult * village.hpMult
  atk *= skills.atkMult * village.atkMult * (1 + s.prestige.rank * PRESTIGE_BONUS_PER_RANK)
  speed *= skills.speedMult * (1 + gear.speedPct)
  return { maxHp: Math.round(maxHp), atk: Math.round(atk), speed: Math.round(speed) }
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function yesterdayKey(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

export const useGameStore = create<Store>((set, get) => ({
  ...initialGameState(),

  applyWalkSample: (distanceDeltaM, speedKmh, dtS) => {
    if (dtS <= 0 || speedKmh <= 0) return
    set((s) => {
      const hybrid = s.run ? BALANCE.hybridEnergyMultiplier : 1
      const prestigeMult = 1 + s.prestige.rank * PRESTIGE_BONUS_PER_RANK
      const blessing = hasUnlock(s, 'worlds-blessing') ? 1.25 : 1
      // L'acclamation du village (chaque Éveillé compte) + la Watchtower boostent la marche.
      // Village nourri (jardin 🍲) : acclamation doublée, plafond relevé à 20%.
      const fed = !!s.garden.fedUntilDay && s.garden.fedUntilDay >= todayKey()
      const cheerRate = CHEER_PER_FOLLOWER * (fed ? 2 : 1)
      const cheerCap = fed ? CHEER_CAP * 2 : CHEER_CAP
      // World Sapling : +1% d'énergie par palier
      const saplingBonus = s.garden.trees.reduce(
        (sum, t) => sum + (t?.seedId === 'world-sapling' ? t.stage * 0.01 : 0),
        0,
      )
      const cheer = (1 + Math.min(cheerCap, s.followers.length * cheerRate)) * (1 + saplingBonus)
      const watchtower = villageCombatBonuses(s.base).energyMult
      const gain = BALANCE.energyRatePerKmh * speedKmh * dtS * hybrid * prestigeMult * blessing * cheer * watchtower
      const today = todayKey()
      // Production du village : chaque Éveillé assigné produit, boostée par le Foyer et son humeur du jour
      const production: Record<ResourceKind, number> = { gold: 0, wood: 0, stone: 0 }
      const hearthMult = hearthMultiplier(s.base.hearth?.level ?? 1)
      for (const follower of s.followers) {
        if (!follower.assignedTo) continue
        const def = getBuilding(follower.assignedTo)
        const level = s.base[follower.assignedTo]?.level ?? 0
        if (!def || !def.produces || level <= 0) continue
        production[def.produces] += def.ratePerFollower * level * hearthMult * moodOf(follower.id, today).productionMult * dtS
      }
      // Moral des Éveillés : la marche remplit la jauge (×2 si Inspiré) → cadeau à réclamer
      const followers = s.followers.map((f) => {
        if (f.giftReady) return f
        const moraleM = (f.moraleM ?? 0) + distanceDeltaM * moodOf(f.id, today).moraleMult
        return moraleM >= GIFT_THRESHOLD_M ? { ...f, moraleM: GIFT_THRESHOLD_M, giftReady: true } : { ...f, moraleM }
      })
      const streak =
        s.dailyStreak.lastDay === today
          ? s.dailyStreak
          : { days: s.dailyStreak.lastDay === yesterdayKey() ? s.dailyStreak.days + 1 : 1, lastDay: today }
      // Quota de pas quotidien : reset au changement de jour, récompense à l'objectif.
      // Foulée ADAPTATIVE à la vitesse : à 3 km/h on fait des petits pas (~0,56 m), pas des foulées de 0,70 m.
      const strideM = Math.min(0.85, Math.max(0.4, BALANCE.strideBaseM + BALANCE.stridePerKmh * speedKmh))
      const prevDaily = s.dailySteps.date === today ? s.dailySteps : { ...s.dailySteps, date: today, steps: 0, rewarded: false }
      const newSteps = prevDaily.steps + distanceDeltaM / strideM
      const goalHit = !prevDaily.rewarded && newSteps >= prevDaily.goal
      const dailySteps = { ...prevDaily, steps: newSteps, rewarded: prevDaily.rewarded || goalHit }
      const goalGold = goalHit ? BALANCE.dailyGoalGold : 0
      const goalChest = goalHit ? 1 : 0
      // Coffres du Marcheur
      const cap = chestCapacity(s)
      const chestDist = chestDistanceM(s)
      let { progressM, stored } = s.wanderChests
      progressM += distanceDeltaM
      while (progressM >= chestDist && stored < cap) {
        progressM -= chestDist
        stored += 1
      }
      if (stored >= cap) progressM = Math.min(progressM, chestDist)
      // Commissions de marche
      const quests = s.quests.map((q) =>
        questDef(q.defId)?.kind === 'walk' ? { ...q, progress: Math.min(q.target, q.progress + distanceDeltaM) } : q,
      )

      // --- Jardin 🌱 ---
      let garden = s.garden
      let willowEssence = 0
      const newWalkDay = s.dailyStreak.lastDay !== today
      if (newWalkDay) {
        // Retour après absence : la fanaison s'évalue sur les jours d'inactivité
        const idle = daysBetween(s.dailyStreak.lastDay, today) - 1
        const mode = GARDEN_MODES[s.settings.gardenMode]
        let plots = garden.plots
        let compost = garden.compost
        if (idle >= mode.wiltAfterDays) {
          plots = plots.map((p) => (p && p.matureDay ? { ...p, wilted: true } : p))
        }
        if (mode.compostAfterDays !== null && idle >= mode.wiltAfterDays + mode.compostAfterDays) {
          for (const p of plots) if (p?.matureDay) compost += 1
          plots = plots.map((p) => (p && p.matureDay ? null : p))
        }
        // Les arbres comptent ce nouveau jour de marche vers leur palier
        const trees = garden.trees.map((t) => {
          if (!t || t.stage >= TREE_MAX_STAGE) return t
          const def = seedDef(t.seedId)
          const days = [...t.daysThisStage, today]
          if (days.length >= (def?.daysPerStage ?? 3)) return { ...t, stage: t.stage + 1, daysThisStage: [] }
          return { ...t, daysThisStage: days }
        })
        // Ember Willow : +2 ⚗ par jour de marche et par palier
        willowEssence = garden.trees.reduce((sum, t) => sum + (t?.seedId === 'ember-willow' ? t.stage * 2 : 0), 0)
        garden = { ...garden, plots, trees, compost }
      }
      // Croissance : distance × streak × Oak of Steps
      const oakBonus = garden.trees.reduce((sum, t) => sum + (t?.seedId === 'oak-of-steps' ? t.stage * 0.03 : 0), 0)
      const growth = distanceDeltaM * BALANCE.gardenGrowthMult * streakMult(streak.days) * (1 + oakBonus)
      garden = {
        ...garden,
        plots: garden.plots.map((p) => {
          if (!p || p.matureDay) return p
          const def = seedDef(p.seedId)
          if (!def) return p
          const grownM = p.grownM + growth
          return grownM >= def.needM ? { ...p, grownM: def.needM, matureDay: today, wilted: false } : { ...p, grownM }
        }),
      }
      // Plafond du réservoir : on ne stocke que jusqu'au cap ; le surplus devient de l'or (aucun pas gâché).
      // L'énergie déjà au-dessus du cap (ex. avant l'ajout du plafond) est conservée telle quelle.
      const room = Math.max(0, BALANCE.energyCap - s.energy)
      const toEnergy = Math.min(gain, room)
      const overflowGold = Math.floor((gain - toEnergy) / BALANCE.energyOverflowGoldDivisor)
      return {
        energy: s.energy + toEnergy,
        totalEnergyEarned: s.totalEnergyEarned + gain,
        totalDistanceM: s.totalDistanceM + distanceDeltaM,
        gold: s.gold + production.gold + goalGold + overflowGold,
        wood: s.wood + production.wood,
        stone: s.stone + production.stone,
        essence: s.essence + willowEssence,
        followers,
        dailyStreak: streak,
        dailySteps,
        wanderChests: { progressM, stored: stored + goalChest },
        roadProgressM: s.roadProgressM + distanceDeltaM,
        quests,
        garden,
      }
    })
    // Trouvaille de la route : un objet du catalogue régulièrement (hors du set() : utilise acquireItem)
    while (get().roadProgressM >= roadFindDistance(get())) {
      set((s) => ({ roadProgressM: s.roadProgressM - roadFindDistance(s) }))
      const s = get()
      const maxRegion = Math.max(...REGIONS.filter((r) => s.progression.unlockedRegions.includes(r.id)).map((r) => r.order), 0)
      const id = rollCatalogItem({
        pool: 'road',
        regionOrder: maxRegion,
        depth: s.progression.depth,
        owned: new Set(Object.keys(s.equipment.owned)),
      })
      const result = get().acquireItem(id)
      set({ lastRoadFind: { ...result, at: Date.now() } })
    }
  },

  spendEnergy: (amount) => {
    if (get().energy < amount) return false
    set((s) => ({ energy: s.energy - amount }))
    return true
  },

  spendGold: (amount) => {
    if (get().gold < amount) return false
    set((s) => ({ gold: s.gold - amount }))
    return true
  },

  drainEnergy: (amount) => {
    const drained = Math.min(get().energy, amount)
    set((s) => ({ energy: Math.max(0, s.energy - amount) }))
    return drained
  },

  startRun: (regionId, contractIds = [], depth, potionId, challenge, mode, overchargeSteps = 0) => {
    const s = get()
    if (s.run || s.energy < BALANCE.runStartCost) return false
    // Surcharge : crans d'énergie versés dans la run (limités par l'énergie dispo au-delà du coût de base)
    const affordableSteps = Math.floor((s.energy - BALANCE.runStartCost) / BALANCE.overchargeCostPerStep)
    const steps = Math.max(0, Math.min(overchargeSteps, BALANCE.overchargeMaxSteps, affordableSteps))
    const totalCost = BALANCE.runStartCost + steps * BALANCE.overchargeCostPerStep
    const overcharge = steps * BALANCE.overchargeBonusPerStep
    // Potion du jardin : consommée au départ, effet pour toute la run
    const hasPotion = !!potionId && (s.garden.potions[potionId] ?? 0) > 0
    const potions = hasPotion
      ? { ...s.garden.potions, [potionId!]: s.garden.potions[potionId!] - 1 }
      : s.garden.potions
    const stats = heroStats(s)
    set({
      energy: s.energy - totalCost,
      garden: { ...s.garden, potions },
      feastPending: undefined,
      run: {
        regionId,
        potion: hasPotion ? potionId : undefined,
        challenge: !mode && challenge && !challengeWonToday(s) ? true : undefined,
        feast: s.feastPending ? true : undefined,
        mode,
        overcharge: overcharge > 0 ? overcharge : undefined,
        depth: Math.max(1, Math.min(depth ?? s.progression.depth, s.progression.depth)),
        room: 1,
        energyAtStart: s.energy - totalCost,
        currentHp: stats.maxHp,
        contracts: contractIds,
        runXp: 0,
        runLevel: 1,
        loot: [],
        essenceGained: 0,
        gold: 0,
        wood: 0,
        stone: 0,
        followersRescued: 0,
        boons: [],
        kills: 0,
        xpGained: 0,
        startedAt: Date.now(),
      },
    })
    return true
  },

  updateRun: (patch) => {
    set((s) => (s.run ? { run: { ...s.run, ...patch } } : {}))
  },

  recordColosseumWave: (wave) => {
    set((s) => (wave > (s.colosseumBest ?? 0) ? { colosseumBest: wave } : {}))
  },

  winDailyChallenge: () => {
    const s = get()
    if (challengeWonToday(s)) return null
    // Or (scale avec la profondeur jouée) + 1 graine rare + 1 coffre du Marcheur
    const gold = CHALLENGE_REWARD_GOLD * (s.run?.depth ?? 1)
    const maxRegionOrder = Math.max(0, s.progression.unlockedRegions.length - 1)
    const seedId = rollSeedDrop(maxRegionOrder, 'rare')
    const def = seedDef(seedId)
    set({
      gold: s.gold + gold,
      wanderChests: { ...s.wanderChests, stored: s.wanderChests.stored + 1 },
      garden: { ...s.garden, seeds: { ...s.garden.seeds, [seedId]: (s.garden.seeds[seedId] ?? 0) + 1 } },
      dailyChallenge: { lastWonDay: challengeDayKey() },
    })
    return `+${gold}g · +1 ${def?.icon ?? '🌱'} ${def?.name ?? 'seed'} seed · +1 🎁 chest`
  },

  endRun: (summary) => {
    set((s) => {
      if (!s.run) return {}
      let progression = s.progression
      let collections = s.collections
      if (summary.bossDefeated) {
        const unlocked = new Set(s.progression.unlockedRegions)
        const next = nextRegion(s.run.regionId)
        if (next) unlocked.add(next.id)
        // La Profondeur suivante se débloque en battant le boss de la DERNIÈRE région à profondeur max
        const depthUp = s.run.regionId === FINAL_REGION_ID && s.run.depth >= s.progression.depth
        progression = {
          unlockedRegions: [...unlocked],
          bossesDefeated: [...new Set([...s.progression.bossesDefeated, s.run.regionId])],
          depth: depthUp ? s.progression.depth + 1 : s.progression.depth,
        }
        collections = { ...s.collections, regions: [...new Set([...s.collections.regions, s.run.regionId])] }
      }
      // Événement de village (30%) : le retour au bercail réserve parfois une surprise
      let villageEvent = s.villageEvent
      if (!villageEvent && Math.random() < VILLAGE_EVENT_CHANCE) {
        const id = rollVillageEventId()
        villageEvent =
          id === 'wandering-merchant'
            ? {
                id,
                at: Date.now(),
                price: 100 + 40 * s.progression.depth,
                itemId: rollCatalogItem({
                  pool: 'road',
                  regionOrder: Math.max(0, s.progression.unlockedRegions.length - 1),
                  depth: s.progression.depth,
                  owned: new Set(Object.keys(s.equipment.owned)),
                }),
              }
            : { id, at: Date.now() }
      }
      // Les objets/essence ont déjà été acquis en direct (acquireItem au ramassage)
      return {
        run: undefined,
        gold: s.gold + summary.gold,
        wood: s.wood + summary.wood,
        stone: s.stone + summary.stone,
        progression,
        collections,
        villageEvent,
      }
    })
    get().gainXp(summary.xpGained)
  },

  resolveVillageEvent: (accept) => {
    const s = get()
    const ev = s.villageEvent
    if (!ev) return null
    set({ villageEvent: undefined })
    if (!accept) return { label: 'Maybe next time.' }
    switch (ev.id) {
      case 'wandering-merchant': {
        if (!ev.itemId || s.gold < (ev.price ?? 0)) return { label: 'Not enough gold…' }
        set({ gold: get().gold - (ev.price ?? 0) })
        const res = get().acquireItem(ev.itemId)
        const item = catalogItem(ev.itemId)
        return { label: res.isNew ? `${item?.name} — NEW!` : `${item?.name} → +${res.essence}⚗` }
      }
      case 'lost-awakened': {
        const f = get().rescueFollower()
        return { label: f ? `${f.name} joins the village!` : 'The village is full — they wave and move on.' }
      }
      case 'feast':
        set({ feastPending: true })
        return { label: 'Next run: +20% max HP 🍲' }
    }
  },

  gainXp: (amount) => {
    if (amount <= 0) return
    set((s) => {
      let { level, xp } = s.hero
      xp += amount
      while (xp >= BALANCE.xpForLevel(level)) {
        xp -= BALANCE.xpForLevel(level)
        level += 1
      }
      return { hero: { ...s.hero, level, xp } }
    })
  },

  buySkill: (skillId) => {
    const s = get()
    const def = SKILLS.find((sk) => sk.id === skillId)
    if (!def || s.hero.skills.includes(skillId)) return false
    if (s.hero.level < def.minLevel) return false
    if (skillPointsAvailable(s.hero.level, s.hero.skills) <= 0) return false
    set({ hero: { ...s.hero, skills: [...s.hero.skills, skillId] } })
    return true
  },

  /** Renaissance : reset héros/or/ressources/village/régions. Garde Collection, distance, Éveillés, Profondeur. */
  rebirth: () => {
    const s = get()
    if (s.run || s.progression.bossesDefeated.length < 3) return false
    const rank = s.prestige.rank + 1
    set({
      // Les perks choisis sont conservés ; le nouveau rang ouvre un choix de plus
      prestige: { rank, permanentBonus: rank * PRESTIGE_BONUS_PER_RANK, perks: s.prestige.perks },
      hero: { level: 1, xp: 0, skills: [] },
      gold: 0,
      wood: 0,
      stone: 0,
      base: { hearth: { level: 1 } },
      followers: s.followers.map((f) => ({ ...f, assignedTo: undefined })),
      progression: { unlockedRegions: ['verdant-hollow'], bossesDefeated: [], depth: s.progression.depth },
    })
    return true
  },

  pickPrestigePerk: (perkId) => {
    const s = get()
    if (pendingPerkPicks(s) <= 0 || !PRESTIGE_PERKS.some((p) => p.id === perkId)) return false
    set({ prestige: { ...s.prestige, perks: [...s.prestige.perks, perkId] } })
    return true
  },

  addToBestiary: (enemyKind) => {
    set((s) =>
      s.collections.bestiary.includes(enemyKind)
        ? {}
        : { collections: { ...s.collections, bestiary: [...s.collections.bestiary, enemyKind] } },
    )
  },

  acquireItem: (catalogId) => {
    const s = get()
    const def = catalogItem(catalogId)
    if (!def) return { catalogId, isNew: false, essence: 0 }
    if (s.equipment.owned[catalogId]) {
      // Doublon → recyclage automatique en Essence (×1.5 avec Essence Mastery)
      const essence = Math.round(DUPE_ESSENCE[def.rarity] * (hasUnlock(s, 'essence-mastery') ? 1.5 : 1))
      set({ essence: s.essence + essence })
      return { catalogId, isNew: false, essence }
    }
    // Auto-équipement : une découverte remplit d'office un slot vide (zéro friction)
    const equipped = s.equipment.equipped[def.slot]
      ? s.equipment.equipped
      : { ...s.equipment.equipped, [def.slot]: catalogId }
    set({
      equipment: { equipped, owned: { ...s.equipment.owned, [catalogId]: { level: 0, foundAt: Date.now() } } },
    })
    return { catalogId, isNew: true, essence: 0 }
  },

  equipItem: (catalogId) => {
    const s = get()
    const def = catalogItem(catalogId)
    if (!def || !s.equipment.owned[catalogId]) return false
    set({ equipment: { ...s.equipment, equipped: { ...s.equipment.equipped, [def.slot]: catalogId } } })
    return true
  },

  upgradeItem: (catalogId) => {
    const s = get()
    const def = catalogItem(catalogId)
    const owned = s.equipment.owned[catalogId]
    if (!def || !owned) return false
    if (owned.level >= FORGE_CAP[def.rarity]) return false
    const cost = upgradeItemCost(catalogId, owned.level)
    if (s.gold < cost.gold || s.essence < cost.essence || s.wood < cost.wood || s.stone < cost.stone) return false
    set({
      gold: s.gold - cost.gold,
      essence: s.essence - cost.essence,
      wood: s.wood - cost.wood,
      stone: s.stone - cost.stone,
      equipment: {
        ...s.equipment,
        owned: { ...s.equipment.owned, [catalogId]: { ...owned, level: owned.level + 1 } },
      },
    })
    return true
  },

  buildOrUpgrade: (buildingId) => {
    const s = get()
    const def = getBuilding(buildingId)
    if (!def) return false
    const level = s.base[buildingId]?.level ?? 0
    if (level >= def.maxLevel) return false
    const cost = buildingCost(def, level)
    if ((cost.gold ?? 0) > s.gold || (cost.wood ?? 0) > s.wood || (cost.stone ?? 0) > s.stone) return false
    set({
      gold: s.gold - (cost.gold ?? 0),
      wood: s.wood - (cost.wood ?? 0),
      stone: s.stone - (cost.stone ?? 0),
      base: { ...s.base, [buildingId]: { level: level + 1 } },
    })
    return true
  },

  rescueFollower: () => {
    const s = get()
    if (s.followers.length >= followerCapacity(s.base) + prestigeFollowerBonus(s)) return null
    const follower = generateFollower()
    set({ followers: [...s.followers, follower] })
    return follower
  },

  assignFollower: (followerId, buildingId) => {
    const s = get()
    const follower = s.followers.find((f) => f.id === followerId)
    if (!follower) return false
    if (buildingId) {
      const def = getBuilding(buildingId)
      const level = s.base[buildingId]?.level ?? 0
      if (!def || !def.produces || level <= 0) return false
      const occupied = s.followers.filter((f) => f.assignedTo === buildingId).length
      if (occupied >= buildingSlots(level)) return false
    }
    set({ followers: s.followers.map((f) => (f.id === followerId ? { ...f, assignedTo: buildingId } : f)) })
    return true
  },

  claimFollowerGift: (followerId) => {
    const s = get()
    const follower = s.followers.find((f) => f.id === followerId)
    if (!follower?.giftReady) return null
    const gift = rollFollowerGift()
    set({
      gold: s.gold + gift.gold,
      wood: s.wood + gift.wood,
      stone: s.stone + gift.stone,
      essence: s.essence + gift.essence,
      followers: s.followers.map((f) => (f.id === followerId ? { ...f, moraleM: 0, giftReady: false } : f)),
    })
    const parts: string[] = []
    if (gift.gold) parts.push(`+${gift.gold}g`)
    if (gift.wood) parts.push(`+${gift.wood}🪵`)
    if (gift.stone) parts.push(`+${gift.stone}🪨`)
    if (gift.essence) parts.push(`+${gift.essence}⚗`)
    if (gift.itemRoll) {
      const state = get()
      const id = rollCatalogItem({
        pool: 'road',
        regionOrder: Math.max(0, state.progression.unlockedRegions.length - 1),
        depth: state.progression.depth,
        owned: new Set(Object.keys(state.equipment.owned)),
      })
      const res = get().acquireItem(id)
      const item = catalogItem(id)
      parts.push(res.isNew ? `${item?.name ?? 'item'} — NEW!` : `${item?.name ?? 'item'} → +${res.essence}⚗`)
    }
    return { label: parts.join(' ') || 'a warm hug' }
  },

  openWanderChest: () => {
    const s = get()
    if (s.wanderChests.stored <= 0) return null
    const reward = rollChestReward()
    set({ wanderChests: { ...s.wanderChests, stored: s.wanderChests.stored - 1 } })
    if (reward.kind === 'item') {
      const state = get()
      const maxRegion = Math.max(
        ...REGIONS.filter((r) => state.progression.unlockedRegions.includes(r.id)).map((r) => r.order),
        0,
      )
      const id = rollCatalogItem({
        pool: 'any',
        regionOrder: maxRegion,
        depth: state.progression.depth,
        owned: new Set(Object.keys(state.equipment.owned)),
      })
      const result = get().acquireItem(id)
      const name = catalogItem(id)?.name ?? '???'
      reward.label = result.isNew ? `${name} — NEW!` : `${name} → +${result.essence}⚗`
    } else {
      set((st) => ({
        gold: st.gold + (reward.kind === 'gold' || reward.kind === 'jackpot' ? reward.amount : 0),
        wood: st.wood + (reward.kind === 'wood' ? reward.amount : 0),
        stone: st.stone + (reward.kind === 'stone' ? reward.amount : 0),
      }))
    }
    get().questProgress('chest', 1)
    return reward
  },

  questProgress: (kind, amount) => {
    set((s) => ({
      quests: s.quests.map((q) =>
        questDef(q.defId)?.kind === kind ? { ...q, progress: Math.min(q.target, q.progress + amount) } : q,
      ),
    }))
  },

  claimQuest: (questId) => {
    const s = get()
    const quest = s.quests.find((q) => q.id === questId)
    const def = quest ? questDef(quest.defId) : undefined
    if (!quest || !def || quest.progress < quest.target) return null
    const otherDefIds = s.quests.filter((q) => q.id !== questId).map((q) => q.defId)
    const replacement = rollQuest([...otherDefIds, quest.defId])
    set({
      gold: s.gold + (def.reward.gold ?? 0),
      wood: s.wood + (def.reward.wood ?? 0),
      stone: s.stone + (def.reward.stone ?? 0),
      quests: s.quests.map((q) => (q.id === questId ? replacement : q)),
    })
    if (def.reward.item) {
      const state = get()
      const maxRegion = Math.max(
        ...REGIONS.filter((r) => state.progression.unlockedRegions.includes(r.id)).map((r) => r.order),
        0,
      )
      const id = rollCatalogItem({
        pool: 'any',
        regionOrder: maxRegion,
        depth: state.progression.depth,
        owned: new Set(Object.keys(state.equipment.owned)),
      })
      get().acquireItem(id)
    }
    if (def.reward.xp) get().gainXp(def.reward.xp)
    return def.reward
  },

  addSeed: (seedId, count = 1) => {
    set((s) => ({
      garden: { ...s.garden, seeds: { ...s.garden.seeds, [seedId]: (s.garden.seeds[seedId] ?? 0) + count } },
    }))
  },

  plantSeed: (plotIdx, seedId) => {
    const s = get()
    const def = seedDef(seedId)
    if (!def || def.kind === 'tree') return false
    if (s.garden.plots[plotIdx] !== null || (s.garden.seeds[seedId] ?? 0) <= 0) return false
    // Le compost fertilise : −15% de distance requise, consommé automatiquement
    const useCompost = s.garden.compost > 0
    const plots = [...s.garden.plots]
    plots[plotIdx] = { seedId, grownM: useCompost ? def.needM * 0.15 : 0, wilted: false }
    set({
      garden: {
        ...s.garden,
        plots,
        compost: useCompost ? s.garden.compost - 1 : s.garden.compost,
        seeds: { ...s.garden.seeds, [seedId]: s.garden.seeds[seedId] - 1 },
      },
    })
    return true
  },

  plantTree: (treeIdx, seedId) => {
    const s = get()
    const def = seedDef(seedId)
    if (!def || def.kind !== 'tree') return false
    if (s.garden.trees[treeIdx] !== null || (s.garden.seeds[seedId] ?? 0) <= 0) return false
    const trees = [...s.garden.trees]
    trees[treeIdx] = { seedId, stage: 0, daysThisStage: [] }
    set({
      garden: { ...s.garden, trees, seeds: { ...s.garden.seeds, [seedId]: s.garden.seeds[seedId] - 1 } },
    })
    return true
  },

  harvestPlot: (plotIdx) => {
    const s = get()
    const plot = s.garden.plots[plotIdx]
    const def = plot ? seedDef(plot.seedId) : undefined
    if (!plot || !def || !plot.matureDay) return null
    const mode = GARDEN_MODES[s.settings.gardenMode]
    const mult = streakMult(s.dailyStreak.days) * mode.yieldMult * (plot.wilted ? 0.5 : 1)
    const gold = Math.round((def.gold ?? 0) * mult)
    const essence = Math.round((def.essence ?? 0) * mult)
    const wood = Math.round((def.wood ?? 0) * mult)
    const food = Math.round((def.food ?? 0) * mult)
    // Les communes redonnent leurs graines : la boucle 100% jardinier
    const seedBack = def.tier === 'common' ? 1 + (Math.random() < 0.5 ? 1 : 0) : 0
    const plots = [...s.garden.plots]
    plots[plotIdx] = null
    const parts: string[] = []
    if (gold) parts.push(`+${gold}g`)
    if (essence) parts.push(`+${essence}⚗`)
    if (wood) parts.push(`+${wood}🪵`)
    if (food) parts.push(`+${food}🍲`)
    if (def.potion) parts.push(`+1 ${def.potion} potion`)
    if (def.flower) parts.push('+1 bloom 🌸')
    if (seedBack) parts.push(`+${seedBack} seed${seedBack > 1 ? 's' : ''}`)
    set({
      gold: s.gold + gold,
      essence: s.essence + essence,
      wood: s.wood + wood,
      garden: {
        ...s.garden,
        plots,
        food: s.garden.food + food,
        potions: def.potion
          ? { ...s.garden.potions, [def.potion]: (s.garden.potions[def.potion] ?? 0) + 1 }
          : s.garden.potions,
        blooms: def.flower
          ? { ...s.garden.blooms, [def.id]: (s.garden.blooms[def.id] ?? 0) + 1 }
          : s.garden.blooms,
        seeds: seedBack
          ? { ...s.garden.seeds, [def.id]: (s.garden.seeds[def.id] ?? 0) + seedBack }
          : s.garden.seeds,
      },
    })
    return { label: parts.join(' ') }
  },

  uprootPlot: (plotIdx) => {
    set((s) => {
      if (!s.garden.plots[plotIdx]) return {}
      const plots = [...s.garden.plots]
      plots[plotIdx] = null
      return { garden: { ...s.garden, plots, compost: s.garden.compost + 1 } }
    })
  },

  feedVillage: () => {
    const s = get()
    const cost = Math.max(1, s.followers.length)
    if (s.garden.food < cost) return false
    const until = new Date()
    until.setDate(until.getDate() + 2)
    set({
      garden: { ...s.garden, food: s.garden.food - cost, fedUntilDay: until.toISOString().slice(0, 10) },
    })
    return true
  },

  setDailyGoal: (goal) => {
    const clamped = Math.max(BALANCE.dailyStepGoalMin, Math.min(BALANCE.dailyStepGoalMax, Math.round(goal)))
    set((s) => ({ dailySteps: { ...s.dailySteps, goal: clamped } }))
  },

  setBalanceOverride: (key, value) => {
    set((s) => {
      const overrides = { ...s.balanceOverrides }
      if (value === null || !Number.isFinite(value)) delete overrides[key]
      else overrides[key] = value
      applyBalanceOverrides(overrides)
      return { balanceOverrides: overrides }
    })
  },

  resetBalanceOverrides: () => {
    applyBalanceOverrides({})
    set({ balanceOverrides: {} })
  },

  setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

  hydrate: (saved) => {
    // set() merge : purge explicite des clés optionnelles absentes de la save importée
    set({ villageEvent: undefined, feastPending: undefined, colosseumBest: undefined, lastRoadFind: undefined, run: undefined, ...saved })
    applyBalanceOverrides(saved.balanceOverrides ?? {})
  },

  resetAll: () => {
    applyBalanceOverrides({})
    // set() merge : les clés optionnelles absentes de l'état initial doivent être purgées explicitement
    set({ ...initialGameState(), villageEvent: undefined, feastPending: undefined, colosseumBest: undefined, lastRoadFind: undefined, run: undefined })
  },
}))

/** Extrait la partie persistable du store (sans les actions) */
export function snapshotState(s: Store): GameState {
  return {
    version: s.version,
    energy: s.energy,
    totalEnergyEarned: s.totalEnergyEarned,
    totalDistanceM: s.totalDistanceM,
    gold: s.gold,
    wood: s.wood,
    stone: s.stone,
    essence: s.essence,
    base: s.base,
    followers: s.followers,
    wanderChests: s.wanderChests,
    roadProgressM: s.roadProgressM,
    lastRoadFind: s.lastRoadFind,
    quests: s.quests,
    hero: s.hero,
    equipment: s.equipment,
    progression: s.progression,
    collections: s.collections,
    dailyStreak: s.dailyStreak,
    dailySteps: s.dailySteps,
    prestige: s.prestige,
    balanceOverrides: s.balanceOverrides,
    dailyChallenge: s.dailyChallenge,
    villageEvent: s.villageEvent,
    feastPending: s.feastPending,
    colosseumBest: s.colosseumBest,
    garden: s.garden,
    run: s.run,
    settings: s.settings,
  }
}

// Réexport pratique pour les vues
export { getRegion }
