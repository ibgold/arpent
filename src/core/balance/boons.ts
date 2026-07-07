// Capacités de run (façon Archero) : choisies 1 parmi 3 à chaque montée de niveau
// EN RUN (orbes d'XP). Les capacités d'attaque se COMBINENT — c'est le moteur de build.

export interface BoonDef {
  id: string
  name: string
  description: string
  icon: string
}

export const BOONS: BoonDef[] = [
  // --- Capacités d'attaque (se combinent entre elles) ---
  { id: 'multishot', name: 'Multishot', description: 'Fire a 2nd bolt (75% dmg)', icon: '🏹' },
  { id: 'side-shots', name: 'Side Shots', description: 'Fire 2 bolts sideways (50% dmg)', icon: '↔️' },
  { id: 'rear-shot', name: 'Rear Shot', description: 'Fire a bolt backwards (50% dmg)', icon: '↩️' },
  { id: 'diagonal-shots', name: 'Diagonal Shots', description: 'Fire 2 diagonal bolts (50% dmg)', icon: '📐' },
  { id: 'ricochet', name: 'Ricochet', description: 'Bolts bounce to a 2nd enemy (70% dmg)', icon: '🎱' },
  { id: 'piercing', name: 'Piercing', description: 'Bolts pass through one extra enemy', icon: '🪡' },
  { id: 'ember-bolt', name: 'Burning Bolts', description: 'Hits ignite enemies (burn over time)', icon: '🔥' },
  { id: 'frost-bolt', name: 'Frost Bolts', description: 'Hits slow enemies by 35% for 1.2s', icon: '❄️' },
  { id: 'heavy-bolt', name: 'Heavy Bolts', description: '+40% bolt size, +15% damage', icon: '⚫' },
  // --- Buffs généraux ---
  { id: 'sharpened-claws', name: 'Sharpened Claws', description: '+25% damage', icon: '🗡️' },
  { id: 'wild-haste', name: 'Wild Haste', description: '+15% move speed', icon: '💨' },
  { id: 'stone-skin', name: 'Stone Skin', description: '+25 max HP, heal 25', icon: '🛡️' },
  { id: 'leech-fang', name: 'Leech Fang', description: 'Heal 6% of damage dealt', icon: '🩸' },
  { id: 'long-reach', name: 'Long Reach', description: '+30% bolt speed & range', icon: '🌙' },
  { id: 'frenzy', name: 'Frenzy', description: '-25% attack cooldown', icon: '⚡' },
  { id: 'lucky-charm', name: 'Lucky Charm', description: '+18% loot drop chance', icon: '🍀' },
  { id: 'keen-edge', name: 'Keen Edge', description: '+15% crit chance', icon: '🎯' },
  { id: 'swift-shadow', name: 'Swift Shadow', description: '-35% dash cooldown', icon: '👤' },
  { id: 'gold-sense', name: 'Gold Sense', description: '+60% gold from kills', icon: '💰' },
  { id: 'warm-glow', name: 'Warm Glow', description: '-25% energy drain', icon: '☀️' },
]

export function rollBoonOffer(owned: string[], count = 3): BoonDef[] {
  const pool = BOONS.filter((b) => !owned.includes(b.id))
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}
