// Les régions : 9 mondes à identité propre, difficulté croissante, objets et relique de boss exclusifs.
// Vaincre le boss d'une région débloque la suivante ; le boss de la DERNIÈRE (à profondeur max)
// débloque la Profondeur suivante.

export type AmbientKind = 'motes' | 'embers' | 'snow' | 'rain' | 'sand' | 'spores'

export interface RegionDef {
  id: string
  name: string
  order: number
  /** Teinte appliquée au sol de l'arène */
  floorTint: number
  /** Teinte du boss (variation visuelle par région) */
  bossTint: number
  bossName: string
  /** La relique signature ✦ que ce boss peut lâcher (25%) — la chasse aux boss */
  relicId: string
  /** Poids de spawn par type d'ennemi */
  enemyWeights: { chaser: number; shooter: number; brute: number }
  /** Multiplicateur global de PV/ATK des ennemis */
  difficultyMult: number
  /** Multiplicateur de récompenses (or notamment) */
  lootMult: number
  /** Pass d'art : particules d'ambiance + voile de lumière régional */
  ambient: { kind: AmbientKind; color: number; overlayAlpha: number }
}

export const REGIONS: RegionDef[] = [
  {
    id: 'verdant-hollow',
    name: 'Verdant Hollow',
    order: 0,
    floorTint: 0xffffff,
    bossTint: 0xffffff,
    bossName: 'The Rootbound King',
    relicId: 'rootbound-crown',
    ambient: { kind: 'motes', color: 0xa7f3d0, overlayAlpha: 0.05 },
    enemyWeights: { chaser: 60, shooter: 28, brute: 12 },
    difficultyMult: 1,
    lootMult: 1,
  },
  {
    id: 'ember-wastes',
    name: 'Ember Wastes',
    order: 1,
    floorTint: 0xffb38a,
    bossTint: 0xffa64d,
    bossName: 'Cinder Colossus',
    relicId: 'emberfang',
    ambient: { kind: 'embers', color: 0xfb923c, overlayAlpha: 0.06 },
    enemyWeights: { chaser: 40, shooter: 25, brute: 35 },
    difficultyMult: 1.8,
    lootMult: 1.6,
  },
  {
    id: 'night-marsh',
    name: 'Night Marsh',
    order: 2,
    floorTint: 0x9db4ff,
    bossTint: 0x8f7dff,
    bossName: 'The Sleepless Mire',
    relicId: 'mirebark-shell',
    ambient: { kind: 'spores', color: 0x818cf8, overlayAlpha: 0.07 },
    enemyWeights: { chaser: 30, shooter: 45, brute: 25 },
    difficultyMult: 2.8,
    lootMult: 2.4,
  },
  {
    id: 'frostpeak-summit',
    name: 'Frostpeak Summit',
    order: 3,
    floorTint: 0xbfe3ff,
    bossTint: 0x9fd8ff,
    bossName: 'The Avalanche Warden',
    relicId: 'glacier-heart',
    ambient: { kind: 'snow', color: 0xe0f2fe, overlayAlpha: 0.06 },
    enemyWeights: { chaser: 35, shooter: 40, brute: 25 },
    difficultyMult: 4.2,
    lootMult: 3.4,
  },
  {
    id: 'sunken-dunes',
    name: 'Sunken Dunes',
    order: 4,
    floorTint: 0xffe0a3,
    bossTint: 0xf5c542,
    bossName: 'The Dune Colossus',
    relicId: 'dune-strider',
    ambient: { kind: 'sand', color: 0xfcd34d, overlayAlpha: 0.06 },
    enemyWeights: { chaser: 50, shooter: 20, brute: 30 },
    difficultyMult: 6.2,
    lootMult: 4.6,
  },
  {
    id: 'storm-plateau',
    name: 'Storm Plateau',
    order: 5,
    floorTint: 0xd0c7ff,
    bossTint: 0xa78bfa,
    bossName: 'The Tempest Crown',
    relicId: 'storm-core',
    ambient: { kind: 'rain', color: 0xa5b4fc, overlayAlpha: 0.08 },
    enemyWeights: { chaser: 30, shooter: 50, brute: 20 },
    difficultyMult: 9.2,
    lootMult: 6.2,
  },
  {
    id: 'gloomwood',
    name: 'Gloomwood',
    order: 6,
    floorTint: 0x9fb8a8,
    bossTint: 0x86efac,
    bossName: 'The Pale Shepherd',
    relicId: 'gloom-lantern',
    ambient: { kind: 'spores', color: 0x86efac, overlayAlpha: 0.08 },
    enemyWeights: { chaser: 45, shooter: 35, brute: 20 },
    difficultyMult: 13.5,
    lootMult: 8.2,
  },
  {
    id: 'magma-throat',
    name: 'Magma Throat',
    order: 7,
    floorTint: 0xff9d7a,
    bossTint: 0xf87171,
    bossName: 'The Furnace King',
    relicId: 'magma-fist',
    ambient: { kind: 'embers', color: 0xf87171, overlayAlpha: 0.08 },
    enemyWeights: { chaser: 40, shooter: 25, brute: 35 },
    difficultyMult: 19.5,
    lootMult: 11,
  },
  {
    id: 'hollow-root',
    name: 'The Hollow Root',
    order: 8,
    floorTint: 0xc9a3ff,
    bossTint: 0xe879f9,
    bossName: 'The First Sleeper',
    relicId: 'void-anchor',
    ambient: { kind: 'motes', color: 0xe879f9, overlayAlpha: 0.09 },
    enemyWeights: { chaser: 33, shooter: 34, brute: 33 },
    difficultyMult: 28,
    lootMult: 15,
  },
]

export const FINAL_REGION_ID = REGIONS[REGIONS.length - 1].id

export function getRegion(id: string): RegionDef {
  return REGIONS.find((r) => r.id === id) ?? REGIONS[0]
}

export function nextRegion(id: string): RegionDef | undefined {
  const current = getRegion(id)
  return REGIONS.find((r) => r.order === current.order + 1)
}
