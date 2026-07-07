import type { QuestState } from '../types'

// Commissions : 3 objectifs court-terme toujours actifs, réclamables d'un tap,
// remplacés immédiatement — il y a TOUJOURS une barre presque pleine.

export type QuestKind = 'kill' | 'walk' | 'rooms' | 'rescue' | 'chest' | 'boss' | 'elite'

export interface QuestReward {
  gold?: number
  wood?: number
  stone?: number
  xp?: number
  item?: boolean
}

export interface QuestDef {
  id: string
  kind: QuestKind
  icon: string
  /** Libellé avec {t} remplacé par la cible */
  label: string
  targets: number[]
  reward: QuestReward
}

export const QUEST_DEFS: QuestDef[] = [
  { id: 'slayer', kind: 'kill', icon: '☠️', label: 'Slay {t} enemies', targets: [15, 25, 40], reward: { gold: 40, xp: 30 } },
  { id: 'wanderer', kind: 'walk', icon: '👟', label: 'Walk {t} m', targets: [600, 1200, 2000], reward: { gold: 35, wood: 5 } },
  { id: 'delver', kind: 'rooms', icon: '🚪', label: 'Clear {t} rooms', targets: [5, 8, 12], reward: { stone: 6, gold: 25, xp: 40 } },
  { id: 'savior', kind: 'rescue', icon: '🐾', label: 'Rescue {t} villager(s)', targets: [1, 2], reward: { item: true } },
  { id: 'opener', kind: 'chest', icon: '🎁', label: 'Open {t} wander chests', targets: [2, 3], reward: { gold: 55 } },
  { id: 'boss-hunter', kind: 'boss', icon: '👑', label: 'Defeat {t} boss(es)', targets: [1], reward: { item: true, gold: 80 } },
  { id: 'elite-hunter', kind: 'elite', icon: '⭐', label: 'Kill {t} elite enemies', targets: [2, 3], reward: { wood: 10, stone: 6, xp: 50 } },
]

export function questLabel(state: QuestState): string {
  const def = QUEST_DEFS.find((d) => d.id === state.defId)
  return def ? `${def.icon} ${def.label.replace('{t}', String(state.target))}` : '???'
}

export function questDef(defId: string): QuestDef | undefined {
  return QUEST_DEFS.find((d) => d.id === defId)
}

/** Tire une nouvelle commission dont le def n'est pas déjà actif */
export function rollQuest(excludeDefIds: string[]): QuestState {
  const pool = QUEST_DEFS.filter((d) => !excludeDefIds.includes(d.id))
  const def = pool[Math.floor(Math.random() * pool.length)] ?? QUEST_DEFS[0]
  const target = def.targets[Math.floor(Math.random() * def.targets.length)]
  return { id: crypto.randomUUID(), defId: def.id, progress: 0, target }
}

export function rollInitialQuests(): QuestState[] {
  // Toujours une quête facile d'entrée (marche ou kills) : la première barre doit se remplir vite
  const easyId = Math.random() < 0.5 ? 'wanderer' : 'slayer'
  const easy = QUEST_DEFS.find((d) => d.id === easyId)!
  const quests: QuestState[] = [
    { id: crypto.randomUUID(), defId: easy.id, progress: 0, target: easy.targets[0] },
  ]
  for (let i = 0; i < 2; i++) {
    quests.push(rollQuest(quests.map((q) => q.defId)))
  }
  return quests
}
