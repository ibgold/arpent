import Phaser from 'phaser'

// Intégration du pack CC0 "Tiny Dungeon" de Kenney (kenney.nl) : le vrai pixel art du jeu.
// Planche 12×11 tuiles de 16px (tilemap_packed.png). Les indices ci-dessous ont été
// vérifiés visuellement tuile par tuile.

export const TINY = 'tiny-dungeon'
export const TINY_URL = 'assets/tiny-dungeon/Tilemap/tilemap_packed.png'
export const TILE_PX = 16

/** Casting : personnage/monstres → index de tuile + échelle monde + rayon de hitbox (px non scalés) */
export interface TinyVisual {
  frame: number
  scale: number
  bodyRadius: number
}

export const TINY_VISUALS = {
  player: { frame: 96, scale: 2, bodyRadius: 5.5 },      // chevalier en armure
  chaser: { frame: 110, scale: 2, bodyRadius: 5.5 },     // petit démon rouge
  shooter: { frame: 84, scale: 2, bodyRadius: 5.5 },     // mage violet
  brute: { frame: 111, scale: 2.6, bodyRadius: 6 },      // grand démon orange
  splitter: { frame: 108, scale: 2, bodyRadius: 5.5 },   // slime vert
  splitterMini: { frame: 123, scale: 1.5, bodyRadius: 4.5 }, // rat
  dasher: { frame: 120, scale: 2, bodyRadius: 5 },       // chauve-souris
  boss: { frame: 111, scale: 4.2, bodyRadius: 6 },       // grand démon, teinté par région
} satisfies Record<string, TinyVisual>

export const TINY_PROPS = {
  wall: 40,   // bloc de brique
  cage: 57,   // casier à barreaux
}

/** Les Éveillés sont des villageois secourus (rangée des personnages civils) */
export const TINY_FOLLOWERS: Record<string, number> = {
  moth: 85,
  toad: 86,
  sprout: 87,
  emberfox: 88,
  owlet: 89,
}

/** Sols par région : tuile de sol PURE (les indices voisins sont des transitions murales) */
export const TINY_FLOORS: Record<string, number> = {
  'verdant-hollow': 0,
  'ember-wastes': 48,
  'night-marsh': 0,
  'frostpeak-summit': 0,
  'sunken-dunes': 48,
  'storm-plateau': 0,
  'gloomwood': 0,
  'magma-throat': 48,
  'hollow-root': 0,
}

/** Respiration procédurale : les sprites fixes prennent vie (squash léger en boucle) */
export function breathe(scene: Phaser.Scene, sprite: Phaser.GameObjects.Sprite, baseScale: number): void {
  scene.tweens.add({
    targets: sprite,
    scaleY: { from: baseScale, to: baseScale * 1.06 },
    yoyo: true,
    repeat: -1,
    duration: Phaser.Math.Between(360, 520),
    ease: 'Sine.easeInOut',
  })
}

/** Construit le sol d'une arène en RenderTexture (tuiles aléatoires, une passe, zéro coût par frame) */
export function buildTinyFloor(scene: Phaser.Scene, arenaSize: number, regionId: string, tint: number): Phaser.GameObjects.RenderTexture {
  const frame = TINY_FLOORS[regionId] ?? 0
  const cols = Math.ceil(arenaSize / (TILE_PX * 2))
  const rt = scene.add.renderTexture(0, 0, cols * TILE_PX, cols * TILE_PX)
  rt.setOrigin(0, 0)
  // Variation subtile par teinte aléatoire : casse la répétition sans tuiles de transition
  const shades = [0xffffff, 0xf1ece6, 0xe4dcd2, 0xf8f5f0]
  rt.beginDraw()
  for (let y = 0; y < cols; y++) {
    for (let x = 0; x < cols; x++) {
      rt.batchDrawFrame(TINY, frame, x * TILE_PX, y * TILE_PX, 1, shades[Math.floor(Math.random() * shades.length)])
    }
  }
  rt.endDraw()
  rt.setScale(2)
  rt.setDepth(0)
  rt.setTint(tint)
  return rt
}
