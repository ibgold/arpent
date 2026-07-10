// Arbre de compétences simple : 1 point par niveau gagné, chaque compétence s'achète une fois.

export interface SkillEffects {
  atkMult: number
  hpMult: number
  speedMult: number
  attackCooldownMult: number
  dashCooldownMult: number
  lootChanceBonus: number
  critChanceBonus: number
}

export interface SkillDef {
  id: string
  name: string
  description: string
  minLevel: number
  effects: Partial<SkillEffects>
}

export const SKILLS: SkillDef[] = [
  {
    id: 'heavy-strikes',
    name: 'Heavy Strikes',
    description: '+20% attack damage',
    minLevel: 2,
    effects: { atkMult: 1.2 },
  },
  {
    id: 'vital-core',
    name: 'Vital Core',
    description: '+25% max HP',
    minLevel: 3,
    effects: { hpMult: 1.25 },
  },
  {
    id: 'swift-stride',
    name: 'Swift Stride',
    description: '+12% move speed',
    minLevel: 4,
    effects: { speedMult: 1.12 },
  },
  {
    id: 'quick-hands',
    name: 'Quick Hands',
    description: '-25% attack cooldown',
    minLevel: 6,
    effects: { attackCooldownMult: 0.75 },
  },
  {
    id: 'shadow-step',
    name: 'Shadow Step',
    description: '-30% dash cooldown',
    minLevel: 8,
    effects: { dashCooldownMult: 0.7 },
  },
  {
    id: 'lucky-find',
    name: 'Lucky Find',
    description: '+15% loot drop chance',
    minLevel: 10,
    effects: { lootChanceBonus: 0.15 },
  },
  {
    id: 'keen-eye',
    name: 'Keen Eye',
    description: '+8% crit chance',
    minLevel: 12,
    effects: { critChanceBonus: 0.08 },
  },
]

const NEUTRAL: SkillEffects = {
  atkMult: 1,
  hpMult: 1,
  speedMult: 1,
  attackCooldownMult: 1,
  dashCooldownMult: 1,
  lootChanceBonus: 0,
  critChanceBonus: 0,
}

/** Agrège les effets des compétences possédées en un seul jeu de multiplicateurs */
export function aggregateSkills(ownedIds: string[]): SkillEffects {
  const out = { ...NEUTRAL }
  for (const id of ownedIds) {
    const def = SKILLS.find((s) => s.id === id)
    if (!def) continue
    const e = def.effects
    out.atkMult *= e.atkMult ?? 1
    out.hpMult *= e.hpMult ?? 1
    out.speedMult *= e.speedMult ?? 1
    out.attackCooldownMult *= e.attackCooldownMult ?? 1
    out.dashCooldownMult *= e.dashCooldownMult ?? 1
    out.lootChanceBonus += e.lootChanceBonus ?? 0
    out.critChanceBonus += e.critChanceBonus ?? 0
  }
  return out
}

/** Points disponibles = (niveau - 1) gagnés - points déjà dépensés */
export function skillPointsAvailable(level: number, ownedIds: string[]): number {
  return Math.max(0, level - 1 - ownedIds.length)
}
