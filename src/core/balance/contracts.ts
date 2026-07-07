// Contrats maudits : au départ d'une expédition, 2 contrats optionnels sont proposés.
// Chaque contrat = un malus assumé contre une récompense annoncée. Le risque choisi
// est le meilleur générateur de variété et d'histoires.

export interface ContractMods {
  enemySpeedMult: number
  playerHpMult: number
  dashDisabled: boolean
  drainMult: number
  playerDmgMult: number
  extraEnemiesPerRoom: number
  goldMult: number
  lootChanceBonus: number
  xpMult: number
  eliteChanceBonus: number
}

export interface ContractDef {
  id: string
  name: string
  icon: string
  curse: string
  reward: string
  mods: Partial<ContractMods>
}

export const CONTRACTS: ContractDef[] = [
  {
    id: 'swift-doom',
    name: 'Swift Doom',
    icon: '💨',
    curse: 'Enemies move 30% faster',
    reward: '+60% gold',
    mods: { enemySpeedMult: 1.3, goldMult: 1.6 },
  },
  {
    id: 'glass-bones',
    name: 'Glass Bones',
    icon: '🦴',
    curse: 'Your max HP −25%',
    reward: '+25% loot drop chance',
    mods: { playerHpMult: 0.75, lootChanceBonus: 0.25 },
  },
  {
    id: 'leaden-feet',
    name: 'Leaden Feet',
    icon: '⛓️',
    curse: 'Dash is disabled',
    reward: '+50% XP',
    mods: { dashDisabled: true, xpMult: 1.5 },
  },
  {
    id: 'burning-hours',
    name: 'Burning Hours',
    icon: '⏳',
    curse: 'Energy drains 35% faster',
    reward: 'Elites twice as likely',
    mods: { drainMult: 1.35, eliteChanceBonus: 0.1 },
  },
  {
    id: 'dull-edge',
    name: 'Dull Edge',
    icon: '🪨',
    curse: 'Your damage −20%',
    reward: '+35% loot chance, +30% gold',
    mods: { playerDmgMult: 0.8, lootChanceBonus: 0.35, goldMult: 1.3 },
  },
  {
    id: 'the-horde',
    name: 'The Horde',
    icon: '👥',
    curse: '+3 enemies per room',
    reward: '+40% XP, +20% gold',
    mods: { extraEnemiesPerRoom: 3, xpMult: 1.4, goldMult: 1.2 },
  },
]

const NEUTRAL: ContractMods = {
  enemySpeedMult: 1,
  playerHpMult: 1,
  dashDisabled: false,
  drainMult: 1,
  playerDmgMult: 1,
  extraEnemiesPerRoom: 0,
  goldMult: 1,
  lootChanceBonus: 0,
  xpMult: 1,
  eliteChanceBonus: 0,
}

export function rollContractOffer(count = 2): ContractDef[] {
  return [...CONTRACTS].sort(() => Math.random() - 0.5).slice(0, count)
}

export function aggregateContracts(ids: string[]): ContractMods {
  const out = { ...NEUTRAL }
  for (const id of ids) {
    const def = CONTRACTS.find((c) => c.id === id)
    if (!def) continue
    const m = def.mods
    out.enemySpeedMult *= m.enemySpeedMult ?? 1
    out.playerHpMult *= m.playerHpMult ?? 1
    out.dashDisabled = out.dashDisabled || (m.dashDisabled ?? false)
    out.drainMult *= m.drainMult ?? 1
    out.playerDmgMult *= m.playerDmgMult ?? 1
    out.extraEnemiesPerRoom += m.extraEnemiesPerRoom ?? 0
    out.goldMult *= m.goldMult ?? 1
    out.lootChanceBonus += m.lootChanceBonus ?? 0
    out.xpMult *= m.xpMult ?? 1
    out.eliteChanceBonus += m.eliteChanceBonus ?? 0
  }
  return out
}

export function contractDef(id: string): ContractDef | undefined {
  return CONTRACTS.find((c) => c.id === id)
}
