export type ItemSlot = 'weapon' | 'armor' | 'charm'

/** Un objet possédé = une entrée du catalogue + son niveau de forge. La Collection EST l'inventaire. */
export interface OwnedItem {
  level: number
  foundAt: number
}

/** Résultat d'une acquisition : découverte ou doublon recyclé en Essence */
export interface AcquireResult {
  catalogId: string
  isNew: boolean
  essence: number
}

/** Une parcelle de potager */
export interface PlotState {
  seedId: string
  /** Mètres de croissance accumulés (multiplicateurs déjà appliqués) */
  grownM: number
  /** Jour (YYYY-MM-DD) où la plante est arrivée à maturité */
  matureDay?: string
  wilted: boolean
}

/** Un arbre : immortel, grandit par paliers de régularité */
export interface TreeState {
  seedId: string
  stage: number
  /** Jours de marche distincts comptés vers le prochain palier */
  daysThisStage: string[]
}

export interface GardenState {
  plots: (PlotState | null)[]
  trees: (TreeState | null)[]
  /** Graines possédées : seedId → quantité */
  seeds: Record<string, number>
  /** Potions récoltées : potionId → quantité */
  potions: Record<string, number>
  compost: number
  /** Nourriture (récoltes de légumes) : nourrit les Éveillés */
  food: number
  /** Fleurs décoratives permanentes accumulées (par espèce) */
  blooms: Record<string, number>
  /** Village nourri jusqu'à ce jour inclus (acclamation doublée) */
  fedUntilDay?: string
}

export interface QuestState {
  id: string
  defId: string
  progress: number
  target: number
}

export interface Follower {
  id: string
  name: string
  species: string
  rescuedAt: number
  /** id du bâtiment où il travaille */
  assignedTo?: string
  /** Moral : mètres marchés vers le prochain cadeau (voir GIFT_THRESHOLD_M) */
  moraleM?: number
  /** Cadeau prêt à réclamer (le moral est plein) */
  giftReady?: boolean
}

export interface RunState {
  regionId: string
  /** Profondeur jouée (échelle infinie de difficulté) */
  depth: number
  room: number
  energyAtStart: number
  currentHp: number
  /** Acquisitions de la run (pour le récap) */
  loot: AcquireResult[]
  essenceGained: number
  gold: number
  wood: number
  stone: number
  followersRescued: number
  boons: string[]
  /** Contrats maudits acceptés au départ */
  contracts: string[]
  /** Potion du jardin activée pour cette run */
  potion?: string
  /** Défi quotidien 🏅 : modificateurs du jour actifs, récompense unique à la victoire */
  challenge?: boolean
  /** Festin de village : +20% PV max pour cette run */
  feast?: boolean
  /** Mode alternatif : boss-rush (9 boss enchaînés) ou colosseum (vagues infinies) */
  mode?: 'boss-rush' | 'colosseum'
  /** Niveau de run façon Archero : rempli par les orbes d'XP, chaque niveau = choix de capacité */
  runXp: number
  runLevel: number
  kills: number
  xpGained: number
  startedAt: number
}

export interface RunSummary {
  rooms: number
  kills: number
  loot: AcquireResult[]
  essenceGained: number
  gold: number
  wood: number
  stone: number
  followersRescued: number
  xpGained: number
  durationS: number
  victory: boolean
  bossDefeated: boolean
}

export interface HeroState {
  level: number
  xp: number
  skills: string[]
}

export interface GameSettings {
  sound: boolean
  haptics: boolean
  /** Screen Wake Lock : garder l'écran allumé pendant la marche */
  keepAwake: boolean
  theme: 'dark'
  inputMode: 'manual' | 'simulation' | 'gps' | 'motion'
  simSpeedKmh: number
  /** Jardin : Chill (fanaison douce, jamais de compostage) ou Intense (mordant, rendement +25%) */
  gardenMode: 'chill' | 'intense'
}

export interface GameState {
  version: number
  energy: number
  totalEnergyEarned: number
  totalDistanceM: number
  gold: number
  wood: number
  stone: number
  /** Essence ⚗ : monnaie de forge issue du recyclage automatique des doublons */
  essence: number
  base: Record<string, { level: number }>
  followers: Follower[]
  wanderChests: { progressM: number; stored: number }
  /** Trouvailles de la route : progression vers la prochaine (tous les 2 km) */
  roadProgressM: number
  lastRoadFind?: AcquireResult & { at: number }
  quests: QuestState[]
  hero: HeroState
  /** La Collection EST l'inventaire : équipé = catalogId, owned = catalogId → forge */
  equipment: { equipped: Partial<Record<ItemSlot, string>>; owned: Record<string, OwnedItem> }
  progression: { unlockedRegions: string[]; bossesDefeated: string[]; depth: number }
  collections: { bestiary: string[]; regions: string[] }
  dailyStreak: { days: number; lastDay: string }
  /** Quota de pas quotidien : compteur, objectif réglable, récompense réclamée ou non */
  dailySteps: { date: string; steps: number; goal: number; rewarded: boolean }
  prestige: { rank: number; permanentBonus: number; perks: string[] }
  /** Balance Lab : overrides des constantes d'équilibrage, appliqués par-dessus les défauts */
  balanceOverrides: Record<string, number>
  /** Défi quotidien 🏅 : dernier jour gagné (une récompense par jour) */
  dailyChallenge: { lastWonDay: string }
  /** Événement de village en attente (retour de run) */
  villageEvent?: { id: 'wandering-merchant' | 'lost-awakened' | 'feast'; itemId?: string; price?: number; at: number }
  /** Festin : la prochaine run part avec +20% PV max */
  feastPending?: boolean
  /** Colosseum : meilleure vague atteinte */
  colosseumBest?: number
  garden: GardenState
  run?: RunState
  settings: GameSettings
}
