// Événements de village (Vague 3) : en rentrant d'expédition, le village vit.
// Toujours une bonne surprise ou une offre — jamais une punition.

export type VillageEventId = 'wandering-merchant' | 'lost-awakened' | 'feast'

export interface VillageEventState {
  id: VillageEventId
  /** Marchand : objet proposé et son prix */
  itemId?: string
  price?: number
  at: number
}

export const VILLAGE_EVENT_CHANCE = 0.3

export const VILLAGE_EVENT_META: Record<VillageEventId, { icon: string; title: string; desc: string; accept: string; decline: string }> = {
  'wandering-merchant': {
    icon: '🧳',
    title: 'A wandering merchant',
    desc: 'A traveler unpacks a single curious item by the hearth.',
    accept: 'Buy it',
    decline: 'Wave goodbye',
  },
  'lost-awakened': {
    icon: '🏮',
    title: 'A lost Awakened',
    desc: 'Someone small followed the light of your village home.',
    accept: 'Welcome them',
    decline: 'Point them elsewhere',
  },
  feast: {
    icon: '🍲',
    title: 'The village feasts!',
    desc: 'Tonight the Awakened cook for YOU. The next expedition starts heartier (+20% max HP).',
    accept: 'Join the feast',
    decline: 'Skip it',
  },
}

export function rollVillageEventId(): VillageEventId {
  const r = Math.random()
  if (r < 0.4) return 'wandering-merchant'
  if (r < 0.7) return 'lost-awakened'
  return 'feast'
}
