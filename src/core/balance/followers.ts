import type { Follower } from '../types'

// Les Éveillés : petites créatures secourues dans les cages des runs, façon disciples de Cult of the Lamb.

export const SPECIES = ['moth', 'toad', 'sprout', 'emberfox', 'owlet'] as const
export type Species = (typeof SPECIES)[number]

export const SPECIES_ICONS: Record<Species, string> = {
  moth: '🦋',
  toad: '🐸',
  sprout: '🌱',
  emberfox: '🦊',
  owlet: '🦉',
}

const NAMES = [
  'Pip', 'Mira', 'Bramble', 'Sooty', 'Fen', 'Lumen', 'Twig', 'Nox', 'Puddle', 'Cinder',
  'Moss', 'Echo', 'Willow', 'Grub', 'Ash', 'Bea', 'Nettle', 'Coal', 'Fern', 'Dew',
]

export function generateFollower(): Follower {
  return {
    id: crypto.randomUUID(),
    name: NAMES[Math.floor(Math.random() * NAMES.length)],
    species: SPECIES[Math.floor(Math.random() * SPECIES.length)],
    rescuedAt: Date.now(),
  }
}

// --- Humeurs du jour (Vague 3) : déterministes par Éveillé + date, personne ne triche ---

export interface MoodDef {
  id: string
  icon: string
  label: string
  /** Multiplicateur de production quand l'Éveillé est assigné */
  productionMult: number
  /** Multiplicateur de gain de moral (marche → cadeau) */
  moraleMult: number
}

export const MOODS: MoodDef[] = [
  { id: 'cheerful', icon: '😊', label: 'Cheerful', productionMult: 1.15, moraleMult: 1 },
  { id: 'steady', icon: '😌', label: 'Steady', productionMult: 1, moraleMult: 1 },
  { id: 'inspired', icon: '🤩', label: 'Inspired', productionMult: 1, moraleMult: 2 },
  { id: 'sleepy', icon: '😴', label: 'Sleepy', productionMult: 0.85, moraleMult: 1 },
]

export function moodOf(followerId: string, day: string): MoodDef {
  const key = followerId + day
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return MOODS[h % MOODS.length]
}

/** Moral : mètres de marche avant qu'un Éveillé offre un cadeau */
export const GIFT_THRESHOLD_M = 3000

export interface FollowerGift {
  gold: number
  wood: number
  stone: number
  essence: number
  /** 12% : l'Éveillé a trouvé un objet du catalogue (pool route) */
  itemRoll: boolean
}

export function rollFollowerGift(): FollowerGift {
  const kind = Math.random()
  if (kind < 0.12) return { gold: 0, wood: 0, stone: 0, essence: 0, itemRoll: true }
  if (kind < 0.4) return { gold: 40 + Math.floor(Math.random() * 40), wood: 0, stone: 0, essence: 0, itemRoll: false }
  if (kind < 0.65) return { gold: 0, wood: 6 + Math.floor(Math.random() * 6), stone: 3 + Math.floor(Math.random() * 4), essence: 0, itemRoll: false }
  return { gold: 0, wood: 0, stone: 0, essence: 6 + Math.floor(Math.random() * 8), itemRoll: false }
}
