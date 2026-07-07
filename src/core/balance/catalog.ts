import type { Rarity } from './constants'
import type { WeaponArchetype } from './weapons'

// LE CATALOGUE : chaque objet du jeu existe en un exemplaire nommé.
// On ne loote pas des stats — on DÉCOUVRE des objets. Doublon → Essence ⚗.

export type CatalogPool = 'combat' | 'road' | 'any'

export type RelicEffect =
  | 'ember-bolt' | 'thorns' | 'four-boons' | 'hybrid-echo' | 'giant-slayer'
  | 'glacier-heart' | 'dune-strider' | 'storm-core' | 'gloom-lantern' | 'magma-fist' | 'void-anchor'

export interface CatalogEffect {
  /** Réutilise les ids d'effets consommés par aggregateGear / la RunScene */
  id:
    | 'crit-chance' | 'crit-damage' | 'lifesteal' | 'swiftness' | 'gold-touch'
    | 'scholar' | 'warm-light' | 'dash-master' | 'long-arm'
  value: number
}

export interface CatalogItem {
  id: string
  name: string
  slot: 'weapon' | 'armor' | 'charm'
  rarity: Rarity
  atk: number
  hp: number
  speed: number
  archetype?: WeaponArchetype
  /** Passif signature fixe (rare et +) */
  effect?: CatalogEffect
  /** Pouvoir de relique ✦ */
  relicEffect?: RelicEffect
  /** Texte d'ambiance : la récompense de découverte */
  flavor: string
  pool: CatalogPool
  /** Ordre de région minimal (0-2) et profondeur minimale pour apparaître */
  minRegion: number
  minDepth: number
}

const W = (
  id: string, name: string, rarity: Rarity, archetype: WeaponArchetype, atk: number,
  flavor: string, pool: CatalogPool = 'combat', minRegion = 0, minDepth = 1,
  effect?: CatalogEffect, relicEffect?: CatalogItem['relicEffect'],
): CatalogItem => ({ id, name, slot: 'weapon', rarity, atk, hp: 0, speed: 0, archetype, effect, relicEffect, flavor, pool, minRegion, minDepth })

const A = (
  id: string, name: string, rarity: Rarity, hp: number,
  flavor: string, pool: CatalogPool = 'combat', minRegion = 0, minDepth = 1,
  effect?: CatalogEffect, relicEffect?: CatalogItem['relicEffect'],
): CatalogItem => ({ id, name, slot: 'armor', rarity, atk: 0, hp, speed: 0, effect, relicEffect, flavor, pool, minRegion, minDepth })

const C = (
  id: string, name: string, rarity: Rarity, speed: number, atk: number,
  flavor: string, pool: CatalogPool = 'any', minRegion = 0, minDepth = 1,
  effect?: CatalogEffect, relicEffect?: CatalogItem['relicEffect'],
): CatalogItem => ({ id, name, slot: 'charm', rarity, atk, hp: 0, speed, effect, relicEffect, flavor, pool, minRegion, minDepth })

export const CATALOG: CatalogItem[] = [
  // ============ ARMES (18) ============
  // Communes (6)
  W('waker-blade', 'Waker Blade', 'common', 'blade', 5, 'The first thing the sleeping world handed you.'),
  W('rusty-cleaver', 'Rusty Cleaver', 'common', 'blade', 4, 'Someone chopped a lot of turnips with this.', 'road'),
  W('pebble-maul', 'Pebble Maul', 'common', 'hammer', 5, 'Heavy enough. Barely.'),
  W('stick-and-stone', 'Stick & Stone', 'common', 'hammer', 4, 'Words may fail. This will not.', 'road'),
  W('kitchen-fangs', 'Kitchen Fangs', 'common', 'daggers', 5, 'Borrowed. Forever.', 'road'),
  W('thorn-picks', 'Thorn Picks', 'common', 'daggers', 4, 'Plucked from a bramble that fought back.'),
  // Rares (5)
  W('dawn-edge', 'Dawn Edge', 'rare', 'blade', 8, 'It hums at sunrise.', 'combat', 0, 1, { id: 'crit-chance', value: 0.05 }),
  W('ember-pike', 'Ember Pike', 'rare', 'hammer', 8, 'Still warm from a forge nobody remembers.', 'combat', 1, 1, { id: 'crit-damage', value: 0.3 }),
  W('whisper-claws', 'Whisper Claws', 'rare', 'daggers', 8, 'They talk when you miss. Rude.', 'combat', 0, 1, { id: 'lifesteal', value: 0.03 }),
  W('toll-bell-hammer', 'Toll-Bell Hammer', 'rare', 'hammer', 8, 'Rings once per regret.', 'road', 0, 1, { id: 'gold-touch', value: 0.2 }),
  W('night-sickle', 'Night Sickle', 'rare', 'blade', 8, 'Cut from the marsh moon.', 'combat', 2, 1, { id: 'long-arm', value: 0.12 }),
  // Épiques (4)
  W('root-breaker', 'Root Breaker', 'epic', 'hammer', 13, 'The Rootbound King still misses it.', 'combat', 0, 1, { id: 'crit-damage', value: 0.45 }),
  W('cinder-fang', 'Cinder Fang', 'epic', 'daggers', 13, 'Bites twice. Burns once.', 'combat', 1, 1, { id: 'crit-chance', value: 0.08 }),
  W('mire-saber', 'Mire Saber', 'epic', 'blade', 13, 'It never dried.', 'combat', 2, 1, { id: 'lifesteal', value: 0.05 }),
  W('milestone-maul', 'Milestone Maul', 'epic', 'hammer', 13, 'A road marker, repurposed. It counts your steps.', 'road', 0, 1, { id: 'scholar', value: 0.25 }),
  // Légendaires (3)
  W('dawnbreaker', 'Dawnbreaker', 'legendary', 'blade', 20, 'The night files a complaint every time you swing it.', 'combat', 0, 2, { id: 'crit-chance', value: 0.12 }),
  W('worldsplitter', 'Worldsplitter', 'legendary', 'hammer', 20, 'Careful with the floor.', 'combat', 1, 2, { id: 'crit-damage', value: 0.6 }),
  W('twin-eclipses', 'Twin Eclipses', 'legendary', 'daggers', 20, 'One for the sun, one for the moon.', 'combat', 2, 2, { id: 'lifesteal', value: 0.07 }),

  // ============ ARMURES (18) ============
  // Communes (6)
  A('trail-vest', 'Trail Vest', 'common', 18, 'Smells like every road you have walked.'),
  A('straw-jacket', 'Straw Jacket', 'common', 16, 'Scarecrows swear by it.', 'road'),
  A('pot-lid-plate', 'Pot-Lid Plate', 'common', 16, 'Dinner is safe. So are you, mostly.', 'road'),
  A('moss-wrap', 'Moss Wrap', 'common', 18, 'Soft, damp, oddly comforting.'),
  A('bark-guard', 'Bark Guard', 'common', 16, 'The tree said yes. Probably.'),
  A('wool-of-the-flock', 'Wool of the Flock', 'common', 18, 'A hundred sheep contributed.', 'road'),
  // Rares (5)
  A('warden-plate', 'Warden Plate', 'rare', 30, 'The dungeon used to have rules. It kept them.', 'combat', 0, 1, { id: 'warm-light', value: 0.08 }),
  A('ember-shell', 'Ember Shell', 'rare', 30, 'Warm side in. Always.', 'combat', 1, 1, { id: 'dash-master', value: 0.15 }),
  A('mist-cloak', 'Mist Cloak', 'rare', 30, 'Sometimes even you cannot find yourself.', 'combat', 2, 1, { id: 'swiftness', value: 0.05 }),
  A('innkeeper-apron', "Innkeeper's Apron", 'rare', 28, 'Stains of a thousand stews. Immortal.', 'road', 0, 1, { id: 'gold-touch', value: 0.18 }),
  A('pilgrim-mantle', "Pilgrim's Mantle", 'rare', 28, 'It has walked farther than you.', 'road', 0, 1, { id: 'scholar', value: 0.18 }),
  // Épiques (4)
  A('rootbound-mail', 'Rootbound Mail', 'epic', 48, 'It grows back.', 'combat', 0, 1, { id: 'warm-light', value: 0.12 }),
  A('cinder-carapace', 'Cinder Carapace', 'epic', 48, 'Forged in the Wastes, cooled in spite.', 'combat', 1, 1, { id: 'dash-master', value: 0.22 }),
  A('sleepless-shroud', 'Sleepless Shroud', 'epic', 48, 'The Mire wove it. It watches back.', 'combat', 2, 1, { id: 'lifesteal', value: 0.04 }),
  A('leagues-coat', 'Coat of Seven Leagues', 'epic', 44, 'Every stitch is a mile.', 'road', 0, 1, { id: 'swiftness', value: 0.08 }),
  // Légendaires (3)
  A('heart-of-the-hearth', 'Heart of the Hearth', 'legendary', 75, 'The village fire, wearable.', 'combat', 0, 2, { id: 'warm-light', value: 0.18 }),
  A('molten-bulwark', 'Molten Bulwark', 'legendary', 75, 'Do not hug anyone.', 'combat', 1, 2, { id: 'crit-damage', value: 0.4 }),
  A('shroud-of-depths', 'Shroud of the Depths', 'legendary', 75, 'It remembers every floor you fell through.', 'combat', 2, 3, { id: 'lifesteal', value: 0.06 }),

  // ============ CHARMES (18) ============
  // Communs (6)
  C('step-sigil', 'Step Sigil', 'common', 8, 2, 'It ticks with every step. Nobody knows why.'),
  C('lucky-pebble', 'Lucky Pebble', 'common', 6, 2, 'Round. Smooth. Definitely lucky.', 'road'),
  C('acorn-locket', 'Acorn Locket', 'common', 8, 2, 'A forest in your pocket, pending.'),
  C('bent-spoon', 'Bent Spoon', 'common', 6, 2, 'It bent first.', 'road'),
  C('firefly-jar', 'Firefly Jar', 'common', 8, 2, 'The light bill is one leaf per day.'),
  C('bootlace-knot', 'Bootlace Knot', 'common', 6, 2, 'Tied by someone who loved walking.', 'road'),
  // Rares (5)
  C('pace-totem', 'Pace Totem', 'rare', 12, 4, 'It approves of your rhythm.', 'road', 0, 1, { id: 'swiftness', value: 0.06 }),
  C('coin-of-the-road', 'Coin of the Road', 'rare', 10, 4, 'Heads: gold. Tails: also gold.', 'road', 0, 1, { id: 'gold-touch', value: 0.25 }),
  C('owl-feather', 'Owl Feather', 'rare', 10, 4, 'Wisdom sheds. Catch it.', 'combat', 0, 1, { id: 'scholar', value: 0.22 }),
  C('ember-bead', 'Ember Bead', 'rare', 10, 4, 'A campfire, condensed.', 'combat', 1, 1, { id: 'warm-light', value: 0.1 }),
  C('marsh-lantern', 'Marsh Lantern', 'rare', 10, 4, 'It only lies about the path sometimes.', 'combat', 2, 1, { id: 'dash-master', value: 0.15 }),
  // Épiques (4)
  C('sun-shard', 'Sun Shard', 'epic', 16, 7, 'The dawn keeps asking for it back.', 'combat', 0, 1, { id: 'crit-chance', value: 0.07 }),
  C('wayfarer-compass', "Wayfarer's Compass", 'epic', 16, 7, 'Points at whatever you truly need. Usually snacks.', 'road', 0, 1, { id: 'gold-touch', value: 0.35 }),
  C('dream-knot', 'Dream Knot', 'epic', 16, 7, 'Untie it and wake the world a little more.', 'combat', 2, 1, { id: 'scholar', value: 0.3 }),
  C('cinder-heart', 'Cinder Heart', 'epic', 16, 7, 'It beats. Try not to think about it.', 'combat', 1, 1, { id: 'crit-damage', value: 0.35 }),
  // Légendaires (3)
  C('kings-pace', "King's Pace", 'legendary', 24, 10, 'Royalty walked everywhere. This is why.', 'road', 0, 2, { id: 'swiftness', value: 0.1 }),
  C('midnight-metronome', 'Midnight Metronome', 'legendary', 24, 10, 'Keeps time for the sleepless.', 'combat', 2, 2, { id: 'dash-master', value: 0.28 }),
  C('golden-horizon', 'Golden Horizon', 'legendary', 24, 10, 'Always one step away. Now it is yours.', 'road', 0, 3, { id: 'gold-touch', value: 0.5 }),

  // ============ OBJETS RÉGIONAUX (régions 4-9 : chaque monde a ses trésors) ============
  // Frostpeak Summit (r3)
  W('icicle-edge', 'Icicle Edge', 'rare', 'blade', 9, 'It never melts. It never forgives.', 'combat', 3, 1, { id: 'crit-chance', value: 0.06 }),
  A('avalanche-plate', 'Avalanche Plate', 'epic', 52, 'Wear the mountain. Politely.', 'combat', 3, 1, { id: 'warm-light', value: 0.14 }),
  C('frozen-tear', 'Frozen Tear', 'epic', 17, 8, 'The summit wept exactly once.', 'combat', 3, 1, { id: 'dash-master', value: 0.2 }),
  // Sunken Dunes (r4)
  W('sandglass-saber', 'Sandglass Saber', 'epic', 'blade', 14, 'Every swing spills someone else’s time.', 'combat', 4, 1, { id: 'crit-damage', value: 0.4 }),
  A('caravan-hide', 'Caravan Hide', 'rare', 32, 'It crossed the dunes ninety-nine times.', 'combat', 4, 1, { id: 'gold-touch', value: 0.22 }),
  C('buried-idol', 'Buried Idol', 'epic', 17, 8, 'It was hiding for a reason.', 'combat', 4, 1, { id: 'scholar', value: 0.32 }),
  // Storm Plateau (r5)
  W('thunder-splinter', 'Thunder Splinter', 'epic', 'daggers', 14, 'A piece of the sky, still angry.', 'combat', 5, 1, { id: 'crit-chance', value: 0.09 }),
  A('galecaller-wrap', 'Galecaller Wrap', 'epic', 52, 'The wind owes it favors.', 'combat', 5, 1, { id: 'swiftness', value: 0.09 }),
  C('storm-eye', 'Eye of the Storm', 'legendary', 26, 11, 'Perfect calm, portable.', 'combat', 5, 1, { id: 'crit-damage', value: 0.5 }),
  // Gloomwood (r6)
  W('shepherds-hook', "Shepherd's Hook", 'epic', 'hammer', 15, 'It herds more than sheep.', 'combat', 6, 1, { id: 'lifesteal', value: 0.05 }),
  A('mourning-veil', 'Mourning Veil', 'legendary', 80, 'Grief, woven tight enough to stop a blade.', 'combat', 6, 1, { id: 'warm-light', value: 0.2 }),
  C('pale-candle', 'Pale Candle', 'rare', 12, 5, 'It burns cold and remembers names.', 'combat', 6, 1, { id: 'scholar', value: 0.25 }),
  // Magma Throat (r7)
  W('furnace-tongue', 'Furnace Tongue', 'legendary', 'hammer', 22, 'It speaks only in sparks.', 'combat', 7, 1, { id: 'crit-damage', value: 0.65 }),
  A('slag-mantle', 'Slag Mantle', 'epic', 55, 'Yesterday’s eruption, today’s outfit.', 'combat', 7, 1, { id: 'dash-master', value: 0.24 }),
  C('molten-core', 'Molten Core', 'epic', 18, 9, 'Do not swallow.', 'combat', 7, 1, { id: 'gold-touch', value: 0.4 }),
  // The Hollow Root (r8)
  W('first-thorn', 'The First Thorn', 'legendary', 'daggers', 24, 'Older than the sleep itself.', 'combat', 8, 1, { id: 'lifesteal', value: 0.08 }),
  A('rootheart-aegis', 'Rootheart Aegis', 'legendary', 85, 'The world’s core said: enough.', 'combat', 8, 1, { id: 'crit-chance', value: 0.08 }),
  C('seed-of-waking', 'Seed of Waking', 'legendary', 28, 12, 'Plant it in your pocket. Wait.', 'combat', 8, 1, { id: 'scholar', value: 0.45 }),

  // ============ RELIQUES ✦ (une par boss + 2 hors-boss) ============
  W('emberfang', 'Emberfang', 'legendary', 'daggers', 18, 'Your bolts remember fire.', 'combat', 1, 1, undefined, 'ember-bolt'),
  W('colossus-grip', 'Colossus Grip', 'legendary', 'hammer', 16, 'Made to unmake the makers of big things.', 'combat', 0, 1, undefined, 'giant-slayer'),
  A('mirebark-shell', 'Mirebark Shell', 'legendary', 60, 'Touch it and regret blooms.', 'combat', 2, 1, undefined, 'thorns'),
  C('rootbound-crown', 'Rootbound Crown', 'legendary', 8, 6, 'Wisdom of the first king: always have options.', 'combat', 0, 1, undefined, 'four-boons'),
  C('stride-anthem', 'Stride Anthem', 'legendary', 16, 4, 'The song your steps were always trying to sing.', 'road', 0, 1, undefined, 'hybrid-echo'),
  A('glacier-heart', 'Glacier Heart', 'legendary', 65, 'Strike me, and winter answers.', 'combat', 3, 1, undefined, 'glacier-heart'),
  C('dune-strider', 'Dune Strider', 'legendary', 20, 6, 'The desert taught it: movement is a weapon.', 'combat', 4, 1, undefined, 'dune-strider'),
  W('storm-core', 'Storm Core', 'legendary', 'blade', 20, 'Lightning, on a leash.', 'combat', 5, 1, undefined, 'storm-core'),
  C('gloom-lantern', 'Gloom Lantern', 'legendary', 18, 6, 'It feeds on what enemies leave behind.', 'combat', 6, 1, undefined, 'gloom-lantern'),
  W('magma-fist', 'Magma Fist', 'legendary', 'hammer', 24, 'The Furnace King’s own knuckles.', 'combat', 7, 1, undefined, 'magma-fist'),
  A('void-anchor', 'Void Anchor', 'legendary', 78, 'It slows the world’s worst intentions.', 'combat', 8, 1, undefined, 'void-anchor'),
]

export const RELIC_IDS = CATALOG.filter((i) => i.relicEffect).map((i) => i.id)

export function catalogItem(id: string): CatalogItem | undefined {
  return CATALOG.find((i) => i.id === id)
}

/** Essence rendue par un doublon */
export const DUPE_ESSENCE: Record<Rarity, number> = { common: 3, rare: 8, epic: 20, legendary: 50 }

/** Poids de rareté, glissant vers le haut avec la profondeur */
export function rarityWeightsAtDepth(depth: number): Record<Rarity, number> {
  const d = Math.min(depth - 1, 8)
  return {
    common: Math.max(20, 58 - d * 5),
    rare: 28 + d * 1,
    epic: 10 + d * 2.5,
    legendary: 4 + d * 1.5,
  }
}

export interface RollContext {
  pool: CatalogPool
  regionOrder: number
  depth: number
  /** ids déjà possédés (les tirages favorisent la découverte à 65%) */
  owned: Set<string>
  /** true : peut tirer une relique (boss) */
  allowRelic?: boolean
}

/** Tire un objet du catalogue. Retourne toujours un id (doublon possible). */
export function rollCatalogItem(ctx: RollContext): string {
  const eligible = CATALOG.filter(
    (i) =>
      (i.pool === ctx.pool || i.pool === 'any' || ctx.pool === 'any') &&
      i.minRegion <= ctx.regionOrder &&
      i.minDepth <= ctx.depth &&
      (ctx.allowRelic ? true : !i.relicEffect),
  )
  if (eligible.length === 0) return CATALOG[0].id
  const undiscovered = eligible.filter((i) => !ctx.owned.has(i.id))
  const pickPool = undiscovered.length > 0 && Math.random() < 0.65 ? undiscovered : eligible
  const weights = rarityWeightsAtDepth(ctx.depth)
  const total = pickPool.reduce((s, i) => s + weights[i.rarity], 0)
  let roll = Math.random() * total
  for (const item of pickPool) {
    roll -= weights[item.rarity]
    if (roll <= 0) return item.id
  }
  return pickPool[pickPool.length - 1].id
}

/** Caps de forge par rareté : la rareté définit le POTENTIEL */
export const FORGE_CAP: Record<Rarity, number> = { common: 3, rare: 6, epic: 9, legendary: 12 }
