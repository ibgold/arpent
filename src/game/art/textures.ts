import Phaser from 'phaser'
import type { Rarity } from '../../core/balance/constants'

// Couche d'abstraction art : tous les visuels placeholder sont générés ici, en PIXEL ART 2D.
// Chaque sprite est une grille de caractères → pixels. Le pass d'art final remplacera ces
// générations par des spritesheets pixel art — mêmes clés, zéro refactor.

export const TEX = {
  player: 'tex-player',
  chaser: 'tex-chaser',
  shooter: 'tex-shooter',
  brute: 'tex-brute',
  splitter: 'tex-splitter',
  splitterMini: 'tex-splitter-mini',
  dasher: 'tex-dasher',
  boss: 'tex-boss',
  slash: 'tex-slash',
  cage: 'tex-cage',
  follower: (species: string) => `tex-follower-${species}`,
  woodDrop: 'tex-wood-drop',
  stoneDrop: 'tex-stone-drop',
  altar: 'tex-altar',
  merchant: 'tex-merchant',
  heart: 'tex-heart',
  star: 'tex-star',
  xpOrb: 'tex-xp-orb',
  seed: 'tex-seed',
  decor: (i: number) => `tex-decor-${i}`,
  decorCount: 4,
  playerShot: 'tex-player-shot',
  enemyShot: 'tex-enemy-shot',
  particle: 'tex-particle',
  loot: (r: Rarity) => `tex-loot-${r}`,
  floor: 'tex-floor',
  wall: 'tex-wall',
  gate: 'tex-gate',
  structure: 'tex-structure',
  building: (id: string) => `tex-building-${id}`,
  portal: 'tex-portal',
} as const

type Palette = Record<string, number>

function pixelTexture(scene: Phaser.Scene, key: string, rows: string[], palette: Palette, px = 4): void {
  if (scene.textures.exists(key)) return
  const g = scene.add.graphics()
  rows.forEach((row, y) => {
    ;[...row].forEach((ch, x) => {
      const color = palette[ch]
      if (color === undefined) return
      g.fillStyle(color, 1)
      g.fillRect(x * px, y * px, px, px)
    })
  })
  g.generateTexture(key, rows[0].length * px, rows.length * px)
  g.destroy()
}

// --- Sprites ---

const PLAYER: string[] = [
  '..gggg..',
  '.gGGGGg.',
  '.GwGGwG.',
  '.GGGGGG.',
  'dGGGGGGd',
  '.dGGGGd.',
  '.dG..Gd.',
  '.bb..bb.',
]
const PLAYER_PAL: Palette = { g: 0x10b981, G: 0x34d399, w: 0x022c22, d: 0x065f46, b: 0x14532d }

const CHASER: string[] = [
  '.rRRr.',
  'rRRRRr',
  'RwRRwR',
  'RRRRRR',
  'rRmmRr',
  '.r..r.',
]
const CHASER_PAL: Palette = { r: 0xb91c1c, R: 0xf87171, w: 0xfef2f2, m: 0x450a0a }

const SHOOTER: string[] = [
  '..pp..',
  '.pPPp.',
  'pPwwPp',
  'pPPPPp',
  '.dPPd.',
  '.d..d.',
]
const SHOOTER_PAL: Palette = { p: 0x7e22ce, P: 0xc084fc, w: 0xfdf4ff, d: 0x581c87 }

const BRUTE: string[] = [
  '..oOOOOo..',
  '.oOOOOOOo.',
  'oOwOOOOwOo',
  'OOOOOOOOOO',
  'OOdOOOOdOO',
  'oOOddddOOo',
  '.OOOOOOOO.',
  '.oOO..OOo.',
  '.dOO..OOd.',
  '.dd....dd.',
]
const BRUTE_PAL: Palette = { o: 0xc2410c, O: 0xfb923c, w: 0x431407, d: 0x7c2d12 }

const BOSS: string[] = [
  '..y..yy..y..',
  '..yy.yy.yy..',
  '...rrRRrr...',
  '..rRRRRRRr..',
  '.rRRRRRRRRr.',
  'rRRwwRRwwRRr',
  'rRRwWRRwWRRr',
  'rRRRRRRRRRRr',
  'rRRRmmmmRRRr',
  'rRRmRRRRmRRr',
  '.rRRRRRRRRr.',
  '.rRRRRRRRRr.',
  '..rRRRRRRr..',
  '.rRRr..rRRr.',
  '.rRr....rRr.',
  '.dd......dd.',
]
const BOSS_PAL: Palette = { r: 0x9f1239, R: 0xe11d48, w: 0xfff1f2, W: 0x4c0519, m: 0x4c0519, d: 0x4c0519, y: 0xfbbf24 }

const LOOT: string[] = ['..X..', '.XxX.', 'XxWxX', '.XxX.', '..X..']

const FLOOR: string[] = [
  'aaaaaaaabbbbbbbb',
  'aaaaaaaabbbbbbbb',
  'aacaaaaabbbbbbbb',
  'aaaaaaaabbbbcbbb',
  'aaaaaaaabbbbbbbb',
  'aaaaacaabbbbbbbb',
  'aaaaaaaabbcbbbbb',
  'aaaaaaaabbbbbbbb',
  'bbbbbbbbaaaaaaaa',
  'bbbcbbbbaaaaaaaa',
  'bbbbbbbbaaaacaaa',
  'bbbbbbbbaaaaaaaa',
  'bbbbbcbbaaaaaaaa',
  'bbbbbbbbaacaaaaa',
  'bbbbbbbbaaaaaaaa',
  'bbbbbbbbaaaaaaaa',
]
// Palette dark-cute : brun-pourpre profond avec veines chaudes (vibe Cult of the Lamb)
const FLOOR_PAL: Palette = { a: 0x1c1626, b: 0x181322, c: 0x2a1f35 }

const WALL: string[] = [
  'mmmmmmmm',
  'mMMMmMMm',
  'mMMMmMMm',
  'mmmmmmmm',
  'mMmMMMMm',
  'mMmMMMMm',
  'mmmmmmmm',
  'mMMMmMMm',
]
const WALL_PAL: Palette = { m: 0x2d2438, M: 0x453454 }

const GATE: string[] = [
  'cCCCCCCCCCCCCCCc',
  'CccCCccCCccCCccC',
  'CccCCccCCccCCccC',
  'cCCCCCCCCCCCCCCc',
]
const GATE_PAL: Palette = { c: 0x0ea5e9, C: 0x7dd3fc }

const STRUCTURE: string[] = [
  '.....tt.....',
  '....tTTt....',
  '...tTTTTt...',
  '..tTTTTTTt..',
  '.tTTTTTTTTt.',
  'tttttttttttt',
  '.sSSSSSSSSs.',
  '.sSwwSSwwSs.',
  '.sSwwSSwwSs.',
  '.sSSSddSSSs.',
  '.sSSSddSSSs.',
  '.ssssddssss.',
]
const STRUCTURE_PAL: Palette = { t: 0x854d0e, T: 0xca8a04, s: 0x64748b, S: 0x94a3b8, w: 0xfde68a, d: 0x475569 }

const PORTAL: string[] = [
  '....iiiii....',
  '..ii.....ii..',
  '.i..iiiii..i.',
  '.i.ii...ii.i.',
  'i.ii..I..ii.i',
  'i.i..III..i.i',
  'i.i.IIWII.i.i',
  'i.i..III..i.i',
  'i.ii..I..ii.i',
  '.i.ii...ii.i.',
  '.i..iiiii..i.',
  '..ii.....ii..',
  '....iiiii....',
]
const PORTAL_PAL: Palette = { i: 0x4f46e5, I: 0x818cf8, W: 0xe0e7ff }

// Nouveaux ennemis
const SPLITTER: string[] = [
  '.vVVv.',
  'vVVVVv',
  'VwVVwV',
  'VVVVVV',
  'vVvvVv',
  '.v..v.',
]
const SPLITTER_PAL: Palette = { v: 0x15803d, V: 0x4ade80, w: 0x052e16 }

const SPLITTER_MINI: string[] = ['.vv.', 'vVVv', 'VwwV', '.vv.']

const DASHER: string[] = [
  '..tT..',
  '.tTTt.',
  'tTwwTt',
  'tTTTTt',
  '.tTTt.',
  '..tt..',
]
const DASHER_PAL: Palette = { t: 0x0e7490, T: 0x22d3ee, w: 0x083344 }

// Slash de mêlée : croissant
const SLASH: string[] = [
  '......WW',
  '....WWWw',
  '...WWw..',
  '..WWw...',
  '..WW....',
  '.WWw....',
  '.WW.....',
  '.WW.....',
]
const SLASH_PAL: Palette = { W: 0xf8fafc, w: 0x94a3b8 }

// Cage avec un Éveillé dedans
const CAGE: string[] = [
  'bbbbbbbb',
  'b.b..b.b',
  'b.b..b.b',
  'b.cCCc.b',
  'b.CwwC.b',
  'b.CCCC.b',
  'b.b..b.b',
  'bbbbbbbb',
]
const CAGE_PAL: Palette = { b: 0x78716c, c: 0xd6d3d1, C: 0xfbbf24, w: 0x1c1917 }

// Les Éveillés : petites créatures dark-cute (yeux immenses façon Cult of the Lamb)
const CRITTER: string[] = [
  '.e....e.',
  '.ee..ee.',
  '..cccc..',
  '.cWWWWc.',
  '.cWbWbWc',
  '.cWWWWc.',
  '..cccc..',
  '..c..c..',
]
const CRITTER_SPECIES_PAL: Record<string, Palette> = {
  moth: { e: 0xc4b5fd, c: 0x8b5cf6, W: 0xede9fe, b: 0x1e1b4b },
  toad: { e: 0x4ade80, c: 0x16a34a, W: 0xdcfce7, b: 0x052e16 },
  sprout: { e: 0x86efac, c: 0x65a30d, W: 0xecfccb, b: 0x1a2e05 },
  emberfox: { e: 0xfdba74, c: 0xea580c, W: 0xffedd5, b: 0x431407 },
  owlet: { e: 0xd6d3d1, c: 0x78716c, W: 0xf5f5f4, b: 0x1c1917 },
}

// Bâtiments du village, chacun reconnaissable au premier coup d'œil
const B_HEARTH: string[] = [
  '.....y......',
  '....yYy.....',
  '...yYOYy....',
  '...yOWOy....',
  '..yYOWOYy...',
  '..yOWWWOy...',
  '...yOWOy....',
  '....lll.....',
  '..lLLlLLl...',
  '.lLLLlLLLl..',
  '..ll...ll...',
  '............',
]
const B_HEARTH_PAL: Palette = { y: 0xd97706, Y: 0xf59e0b, O: 0xfb923c, W: 0xfde68a, l: 0x57432e, L: 0x7c5c3e }

const B_SHRINE: string[] = [
  '.gGGGGGGGGg.',
  '..g......g..',
  '..gg....gg..',
  '..gG....Gg..',
  '..gG....Gg..',
  '..gG.ww.Gg..',
  '..gG.wW.Gg..',
  '..gG.ww.Gg..',
  '..gG....Gg..',
  '.ggGGGGGGgg.',
  '.gGGGGGGGGg.',
  '............',
]
const B_SHRINE_PAL: Palette = { g: 0x9f1239, G: 0xe11d48, w: 0xfbbf24, W: 0xfde68a }

const B_LUMBER: string[] = [
  '.....tt.....',
  '....tTTt....',
  '...tTTTTt...',
  '..tTTTTTTt..',
  '.tTTTTTTTTt.',
  'tttttttttttt',
  '.sSSwwSSSSs.',
  '.sSSwwSSSSs.',
  '.sSSSSSSSSs.',
  '.ssssssssss.',
  'lLlLl.......',
  'LlLlL.......',
]
const B_LUMBER_PAL: Palette = { t: 0x854d0e, T: 0xca8a04, s: 0x57432e, S: 0x7c5c3e, w: 0xfde68a, l: 0x854d0e, L: 0xa16207 }

const B_QUARRY: string[] = [
  '............',
  '.....rr.....',
  '....rRRr....',
  '...rRRRRr...',
  '..rRRrRRRr..',
  '.rRRRRRRRRr.',
  '.rRrRRRrRRr.',
  'rRRRRrRRRRRr',
  'rRrRRRRRrRRr',
  'rrrrrrrrrrrr',
  '..p.........',
  '.pPp........',
]
const B_QUARRY_PAL: Palette = { r: 0x44403c, R: 0x78716c, p: 0x854d0e, P: 0xd6d3d1 }

const BUILDING_SPRITES: Record<string, { rows: string[]; pal: Palette }> = {
  hearth: { rows: B_HEARTH, pal: B_HEARTH_PAL },
  shrine: { rows: B_SHRINE, pal: B_SHRINE_PAL },
  'lumber-hut': { rows: B_LUMBER, pal: B_LUMBER_PAL },
  quarry: { rows: B_QUARRY, pal: B_QUARRY_PAL },
}

// Autel de sacrifice : pierre sombre à lueur rouge
const ALTAR: string[] = [
  '....rR....',
  '...rRRr...',
  '....rr....',
  '..ssSSss..',
  '..sSSSSs..',
  '...sSSs...',
  '...sSSs...',
  '..ssSSss..',
  '.sSSSSSSs.',
  'ssssssssss',
]
const ALTAR_PAL: Palette = { s: 0x3f3f46, S: 0x71717a, r: 0x9f1239, R: 0xfb7185 }

// Échoppe du marchand itinérant
const MERCHANT: string[] = [
  '..tTTTTTTt..',
  '.tTtTTtTTTt.',
  'tTTTtTTtTTTt',
  't..........t',
  't.gG....Gg.t',
  't.gG....Gg.t',
  '..gG....Gg..',
  '..gG....Gg..',
  '..gG....Gg..',
  '..ggwwwwgg..',
]
const MERCHANT_PAL: Palette = { t: 0x9f1239, T: 0xfda4af, g: 0x78716c, G: 0xa8a29e, w: 0x57432e }

const HEART: string[] = ['.hh.hh.', 'hHHhHHh', 'hHHHHHh', '.hHHHh.', '..hHh..', '...h...']
const HEART_PAL: Palette = { h: 0x9f1239, H: 0xfb7185 }

const STAR: string[] = ['...y...', '..yYy..', 'yyYWYyy', '.yYWYy.', '.yYyYy.', 'yy...yy']
const STAR_PAL: Palette = { y: 0xd97706, Y: 0xfbbf24, W: 0xfef9c3 }

const WOOD_DROP: string[] = ['.ww.', 'wWWw', 'wWWw', '.ww.']
const WOOD_PAL: Palette = { w: 0x854d0e, W: 0xca8a04 }
const STONE_DROP: string[] = ['.ss.', 'sSSs', 'sSSs', '.ss.']
const STONE_PAL: Palette = { s: 0x57534e, S: 0xa8a29e }

const RARITY_LOOT_PAL: Record<Rarity, Palette> = {
  common: { X: 0x6b7280, x: 0x9ca3af, W: 0xe5e7eb },
  rare: { X: 0x0284c7, x: 0x38bdf8, W: 0xe0f2fe },
  epic: { X: 0x7c3aed, x: 0xa78bfa, W: 0xf3e8ff },
  legendary: { X: 0xd97706, x: 0xfbbf24, W: 0xfef9c3 },
}

export function generateAllTextures(scene: Phaser.Scene): void {
  pixelTexture(scene, TEX.player, PLAYER, PLAYER_PAL, 4)
  pixelTexture(scene, TEX.chaser, CHASER, CHASER_PAL, 4)
  pixelTexture(scene, TEX.shooter, SHOOTER, SHOOTER_PAL, 4)
  pixelTexture(scene, TEX.brute, BRUTE, BRUTE_PAL, 4)
  pixelTexture(scene, TEX.boss, BOSS, BOSS_PAL, 6)
  pixelTexture(scene, TEX.splitter, SPLITTER, SPLITTER_PAL, 4)
  pixelTexture(scene, TEX.splitterMini, SPLITTER_MINI, SPLITTER_PAL, 4)
  pixelTexture(scene, TEX.dasher, DASHER, DASHER_PAL, 4)
  pixelTexture(scene, TEX.slash, SLASH, SLASH_PAL, 4)
  pixelTexture(scene, TEX.cage, CAGE, CAGE_PAL, 4)
  for (const [species, pal] of Object.entries(CRITTER_SPECIES_PAL)) {
    pixelTexture(scene, TEX.follower(species), CRITTER, pal, 3)
  }
  pixelTexture(scene, TEX.woodDrop, WOOD_DROP, WOOD_PAL, 4)
  pixelTexture(scene, TEX.stoneDrop, STONE_DROP, STONE_PAL, 4)
  pixelTexture(scene, TEX.altar, ALTAR, ALTAR_PAL, 4)
  pixelTexture(scene, TEX.merchant, MERCHANT, MERCHANT_PAL, 5)
  pixelTexture(scene, TEX.heart, HEART, HEART_PAL, 3)
  pixelTexture(scene, TEX.star, STAR, STAR_PAL, 3)
  pixelTexture(scene, TEX.xpOrb, ['.g.', 'gGg', '.g.'], { g: 0x16a34a, G: 0x86efac }, 3)
  pixelTexture(scene, TEX.seed, ['.s.', 'sSs', 'ss.'], { s: 0x854d0e, S: 0xd9a44a }, 3)
  // Décor d'ambiance : touffes d'herbe, cailloux, ossements, champignons
  pixelTexture(scene, TEX.decor(0), ['g.g.g', '.ggg.', '..g..'], { g: 0x3f6212 }, 3)
  pixelTexture(scene, TEX.decor(1), ['.ss.', 'sSSs', 'ssss'], { s: 0x3f3f46, S: 0x52525b }, 3)
  pixelTexture(scene, TEX.decor(2), ['b..b', '.bb.', 'bbbb'], { b: 0x78716c }, 3)
  pixelTexture(scene, TEX.decor(3), ['.mm.', 'mMMm', '.tt.'], { m: 0x9f1239, M: 0xfda4af, t: 0xd6d3d1 }, 3)
  for (const [id, def] of Object.entries(BUILDING_SPRITES)) {
    pixelTexture(scene, TEX.building(id), def.rows, def.pal, 5)
  }
  pixelTexture(scene, TEX.playerShot, ['.y.', 'yYy', '.y.'], { y: 0xca8a04, Y: 0xfde047 }, 3)
  pixelTexture(scene, TEX.enemyShot, ['.p.', 'pPp', '.p.'], { p: 0xbe185d, P: 0xf472b6 }, 3)
  pixelTexture(scene, TEX.particle, ['WW', 'WW'], { W: 0xffffff }, 4)
  for (const r of Object.keys(RARITY_LOOT_PAL) as Rarity[]) {
    pixelTexture(scene, TEX.loot(r), LOOT, RARITY_LOOT_PAL[r], 3)
  }
  pixelTexture(scene, TEX.floor, FLOOR, FLOOR_PAL, 4)
  pixelTexture(scene, TEX.wall, WALL, WALL_PAL, 4)
  pixelTexture(scene, TEX.gate, GATE, GATE_PAL, 4)
  pixelTexture(scene, TEX.structure, STRUCTURE, STRUCTURE_PAL, 4)
  pixelTexture(scene, TEX.portal, PORTAL, PORTAL_PAL, 4)
}
