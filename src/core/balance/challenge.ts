// Le Défi quotidien 🏅 (v2) : une run spéciale par jour, modificateurs tirés de la date,
// grosse récompense à la victoire (boss battu). Déterministe : tout le monde a le même défi.

import type { GameState } from '../types'

export interface ChallengeMod {
  id: string
  name: string
  icon: string
  desc: string
  enemyHpMult: number
  enemyAtkMult: number
  goldMult: number
  xpMult: number
}

/** Le pool : chaque mod rend la run plus dure ET plus généreuse */
export const CHALLENGE_MODS: ChallengeMod[] = [
  { id: 'iron-horde', name: 'Iron Horde', icon: '🛡️', desc: 'Enemies +60% HP · gold ×1.4', enemyHpMult: 1.6, enemyAtkMult: 1, goldMult: 1.4, xpMult: 1.1 },
  { id: 'sharp-fangs', name: 'Sharp Fangs', icon: '🗡️', desc: 'Enemies +45% ATK · gold ×1.4', enemyHpMult: 1, enemyAtkMult: 1.45, goldMult: 1.4, xpMult: 1.1 },
  { id: 'gold-rush', name: 'Gold Rush', icon: '💰', desc: 'Enemies +25% HP & ATK · gold ×1.8', enemyHpMult: 1.25, enemyAtkMult: 1.25, goldMult: 1.8, xpMult: 1 },
  { id: 'scholars-day', name: "Scholar's Day", icon: '📚', desc: 'Enemies +30% HP · XP orbs ×1.5', enemyHpMult: 1.3, enemyAtkMult: 1, goldMult: 1, xpMult: 1.5 },
  { id: 'blood-moon', name: 'Blood Moon', icon: '🌕', desc: 'Enemies +35% HP & +25% ATK · gold ×1.6', enemyHpMult: 1.35, enemyAtkMult: 1.25, goldMult: 1.6, xpMult: 1.2 },
  { id: 'thick-hide', name: 'Thick Hide', icon: '🐗', desc: 'Enemies +80% HP · XP ×1.3', enemyHpMult: 1.8, enemyAtkMult: 1, goldMult: 1.2, xpMult: 1.3 },
]

/** Jour local YYYY-MM-DD (même clé que le streak) */
export function challengeDayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function hashDay(day: string): number {
  let h = 0
  for (let i = 0; i < day.length; i++) h = (h * 31 + day.charCodeAt(i)) >>> 0
  return h
}

/** Les 2 modificateurs du jour, déterministes (mêmes pour toute la journée) */
export function dailyChallengeMods(day = challengeDayKey()): ChallengeMod[] {
  const h = hashDay(day)
  const first = h % CHALLENGE_MODS.length
  const second = (first + 1 + ((h >>> 8) % (CHALLENGE_MODS.length - 1))) % CHALLENGE_MODS.length
  return [CHALLENGE_MODS[first], CHALLENGE_MODS[second]]
}

/** Multiplicateurs combinés des mods du jour */
export function combinedChallengeMults(mods: ChallengeMod[]): { hp: number; atk: number; gold: number; xp: number } {
  return mods.reduce(
    (acc, m) => ({ hp: acc.hp * m.enemyHpMult, atk: acc.atk * m.enemyAtkMult, gold: acc.gold * m.goldMult, xp: acc.xp * m.xpMult }),
    { hp: 1, atk: 1, gold: 1, xp: 1 },
  )
}

/** Récompense de victoire : or (scale avec la profondeur jouée) + graine rare + coffre */
export const CHALLENGE_REWARD_GOLD = 300

export function challengeWonToday(state: GameState): boolean {
  return state.dailyChallenge.lastWonDay === challengeDayKey()
}
