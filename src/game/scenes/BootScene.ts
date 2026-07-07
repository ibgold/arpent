import Phaser from 'phaser'
import { generateAllTextures } from '../art/textures'
import { TILE_PX, TINY, TINY_URL } from '../art/tinyDungeon'

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot')
  }

  preload(): void {
    // Pack CC0 Kenney Tiny Dungeon : le pixel art du jeu
    this.load.spritesheet(TINY, TINY_URL, { frameWidth: TILE_PX, frameHeight: TILE_PX })
  }

  create(): void {
    generateAllTextures(this)
    // Si une run était en cours (refresh au milieu), on y retourne directement
    this.scene.start('Hub')
  }
}
