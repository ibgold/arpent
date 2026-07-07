// Coffres du Marcheur : la marche elle-même devient une machine à sous.
// Tous les CHEST_DISTANCE_M marchés → +1 coffre (stock plafonné), à ouvrir d'un tap.
// Le cas 'item' est résolu par le store (tirage catalogue + recyclage doublon).

export const CHEST_DISTANCE_M = 400
export const CHEST_MAX_STORED = 3

export interface ChestReward {
  kind: 'gold' | 'wood' | 'stone' | 'item' | 'jackpot'
  amount: number
  label: string
}

interface RewardRoll {
  kind: ChestReward['kind']
  weight: number
  roll: () => Omit<ChestReward, 'kind'>
}

const between = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min

const TABLE: RewardRoll[] = [
  { kind: 'gold', weight: 38, roll: () => { const a = between(18, 45); return { amount: a, label: `${a} gold` } } },
  { kind: 'wood', weight: 20, roll: () => { const a = between(4, 9); return { amount: a, label: `${a} wood 🪵` } } },
  { kind: 'stone', weight: 15, roll: () => { const a = between(3, 7); return { amount: a, label: `${a} stone 🪨` } } },
  { kind: 'item', weight: 21, roll: () => ({ amount: 1, label: '' }) },
  { kind: 'jackpot', weight: 6, roll: () => { const a = between(120, 220); return { amount: a, label: `JACKPOT! ${a} gold` } } },
]

export function rollChestReward(): ChestReward {
  const total = TABLE.reduce((s, r) => s + r.weight, 0)
  let roll = Math.random() * total
  for (const entry of TABLE) {
    roll -= entry.weight
    if (roll <= 0) return { kind: entry.kind, ...entry.roll() }
  }
  const fallback = TABLE[0]
  return { kind: fallback.kind, ...fallback.roll() }
}
