import Phaser from 'phaser'
import { BALANCE } from '../../core/balance/constants'
import { rollContractOffer } from '../../core/balance/contracts'
import { hasRegionMastery, hasUnlock } from '../../core/balance/collectionRewards'
import { REGIONS } from '../../core/balance/regions'
import { BUILDINGS } from '../../core/balance/buildings'
import { useGameStore } from '../../core/state/store'
import { playSfx } from '../../core/audio/sfx'
import { gameEvents } from '../bridge/events'
import { TEX } from '../art/textures'
import { breathe, TINY, TINY_FOLLOWERS } from '../art/tinyDungeon'
import { JuiceSystem } from '../systems/juice'

// Deux dispositions : paysage (PC) et portrait (téléphone) — le village s'adapte à l'écran
const LANDSCAPE_W = 800
const LANDSCAPE_H = 600
const PORTRAIT_W = 460
const PORTRAIT_H = 780

const BUILDING_SPOTS: Record<string, { x: number; y: number }> = {
  hearth: { x: 400, y: 330 },
  shrine: { x: 250, y: 260 },
  'lumber-hut': { x: 550, y: 260 },
  quarry: { x: 400, y: 470 },
  watchtower: { x: 160, y: 400 },
  'paved-road': { x: 640, y: 400 },
  'waking-statue': { x: 250, y: 500 },
}

const BUILDING_SPOTS_PORTRAIT: Record<string, { x: number; y: number }> = {
  hearth: { x: 230, y: 400 },
  shrine: { x: 110, y: 320 },
  'lumber-hut': { x: 350, y: 320 },
  quarry: { x: 230, y: 530 },
  watchtower: { x: 95, y: 465 },
  'paved-road': { x: 365, y: 465 },
  'waking-statue': { x: 130, y: 615 },
}

/** Le village : vue d'ambiance (le Foyer qui brûle, les Éveillés qui vivent) + départ des runs.
 *  La gestion (construction, assignation) vit dans l'onglet Village (React). */
export class HubScene extends Phaser.Scene {
  private juice!: JuiceSystem
  private buildingSprites = new Map<string, Phaser.GameObjects.Sprite>()
  private buildingLabels = new Map<string, Phaser.GameObjects.Text>()
  private followerSprites = new Map<string, Phaser.GameObjects.Sprite>()
  private unsubscribe: (() => void) | undefined
  private selectedRegionIdx = 0
  private selectedDepth = 1
  private regionLabel: Phaser.GameObjects.Text | undefined
  private depthLabel: Phaser.GameObjects.Text | undefined
  private walkSpeedKmh = 0
  /** Dimensions du monde et emplacements, choisis selon l'orientation de l'écran */
  private W = LANDSCAPE_W
  private H = LANDSCAPE_H
  private spotMap = BUILDING_SPOTS
  private isPortrait = false

  constructor() {
    super('Hub')
  }

  /** Zoome pour que tout le village soit visible — jamais de bâtiment coupé */
  private fitCamera(): void {
    const cam = this.cameras.main
    const zoom = Math.min(this.scale.width / this.W, this.scale.height / this.H, 1)
    cam.setZoom(zoom)
    cam.centerOn(this.W / 2, this.H / 2)
  }

  create(): void {
    // Si une run est en cours dans la save (refresh mid-run), on reprend la run
    if (useGameStore.getState().run) {
      this.scene.start('Run')
      return
    }

    this.juice = new JuiceSystem(this)
    // Disposition selon l'orientation : portrait (téléphone) ou paysage (PC)
    this.isPortrait = this.scale.height > this.scale.width
    this.W = this.isPortrait ? PORTRAIT_W : LANDSCAPE_W
    this.H = this.isPortrait ? PORTRAIT_H : LANDSCAPE_H
    this.spotMap = this.isPortrait ? BUILDING_SPOTS_PORTRAIT : BUILDING_SPOTS
    // Sol surdimensionné : couvre tout le viewport même sur grands écrans
    this.add.tileSprite(this.W / 2, this.H / 2, this.W * 4, this.H * 4, TEX.floor).setAlpha(0.8)
    for (let i = 0; i < 14; i++) {
      this.add
        .image(Phaser.Math.Between(80, this.W - 80), Phaser.Math.Between(140, this.H - 60), TEX.decor(Phaser.Math.Between(0, TEX.decorCount - 1)))
        .setDepth(2)
        .setAlpha(0.6)
    }
    // Responsive : le village entier tient dans le viewport ; changement d'orientation → re-layout
    this.fitCamera()
    const onResize = () => {
      if (this.scale.height > this.scale.width !== this.isPortrait) this.scene.restart()
      else this.fitCamera()
    }
    this.scale.on(Phaser.Scale.Events.RESIZE, onResize)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, onResize))

    this.add
      .text(this.W / 2, 46, 'THE VILLAGE', { fontFamily: 'monospace', fontSize: '26px', color: '#e2e8f0' })
      .setOrigin(0.5)
    this.add
      .text(this.W / 2, 74, 'It only wakes when you walk', { fontFamily: 'monospace', fontSize: '12px', color: '#64748b' })
      .setOrigin(0.5)

    for (const def of BUILDINGS) {
      this.createBuildingVisual(def.id, def.name)
    }
    this.createPortal()
    this.refreshBuildings()
    this.refreshFollowers()

    let prevBase = useGameStore.getState().base
    let prevFollowers = useGameStore.getState().followers
    this.unsubscribe = useGameStore.subscribe((s) => {
      if (s.base !== prevBase) {
        prevBase = s.base
        this.refreshBuildings()
      }
      if (s.followers !== prevFollowers) {
        prevFollowers = s.followers
        this.refreshFollowers()
        this.refreshBuildings() // compteur de travailleurs dans les labels
      }
    })
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.unsubscribe?.())

    const onRequestRun = () => this.tryStartRun()
    const onEmbark = (regionId: string, contractIds: string[], potionId?: string, challenge?: boolean, mode?: 'boss-rush' | 'colosseum', overcharge?: number) =>
      this.embark(regionId, contractIds, potionId, challenge, mode, overcharge)
    gameEvents.on('hub:request-run', onRequestRun)
    gameEvents.on('hub:embark', onEmbark)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      gameEvents.off('hub:request-run', onRequestRun)
      gameEvents.off('hub:embark', onEmbark)
    })

    // Pops de production : pendant la marche, les bâtiments pourvus montrent qu'ils travaillent
    const onSpeed = (kmh: number) => (this.walkSpeedKmh = kmh)
    gameEvents.on('walk:speed', onSpeed)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => gameEvents.off('walk:speed', onSpeed))
    this.time.addEvent({ delay: 4000, loop: true, callback: () => this.productionPops() })
  }

  private productionPops(): void {
    if (this.walkSpeedKmh <= 0) return
    const state = useGameStore.getState()
    const icons: Record<string, string> = { gold: '+g', wood: '+🪵', stone: '+🪨' }
    for (const def of BUILDINGS) {
      if (!def.produces) continue
      const level = state.base[def.id]?.level ?? 0
      const workers = state.followers.filter((f) => f.assignedTo === def.id).length
      if (level <= 0 || workers === 0) continue
      const spot = this.spotMap[def.id]
      this.juice.textPopup(spot.x + Phaser.Math.Between(-15, 15), spot.y - 34, icons[def.produces], '#a7f3d0')
    }
  }

  private createBuildingVisual(id: string, name: string): void {
    const spot = this.spotMap[id]
    if (!spot) return
    // Les nouveaux projets réutilisent le sprite générique tant qu'ils n'ont pas leur pixel art dédié
    const texKey = this.textures.exists(TEX.building(id)) ? TEX.building(id) : TEX.structure
    const sprite = this.add.sprite(spot.x, spot.y, texKey)
    const label = this.add
      .text(spot.x, spot.y + 44, name, { fontFamily: 'monospace', fontSize: '11px', color: '#94a3b8', align: 'center' })
      .setOrigin(0.5)
    this.buildingSprites.set(id, sprite)
    this.buildingLabels.set(id, label)
    // Tap sur le bâtiment → fiche de gestion (React bottom-sheet)
    sprite.setInteractive({ useHandCursor: true })
    sprite.on('pointerdown', () => {
      this.tweens.add({ targets: sprite, scaleX: sprite.scaleX * 1.12, scaleY: sprite.scaleY * 1.12, yoyo: true, duration: 90 })
      playSfx('loot')
      gameEvents.emit('hub:building-tap', id)
    })
    if (id === 'hearth') {
      // Le Foyer scintille — le cœur vivant du village
      this.tweens.add({ targets: sprite, alpha: { from: 1, to: 0.85 }, yoyo: true, repeat: -1, duration: 700 })
    }
  }

  private refreshBuildings(): void {
    const state = useGameStore.getState()
    for (const def of BUILDINGS) {
      const sprite = this.buildingSprites.get(def.id)
      const label = this.buildingLabels.get(def.id)
      if (!sprite || !label) continue
      const level = state.base[def.id]?.level ?? 0
      sprite.setAlpha(level === 0 ? 0.25 : 1)
      sprite.setScale(0.85 + Math.min(level, 5) * 0.08)
      const workers = state.followers.filter((f) => f.assignedTo === def.id).length
      label.setText(
        level === 0
          ? `${def.name}\n(tap to build)`
          : `${def.name} · Lv ${level}${def.produces ? ` · 👥${workers}/${level}` : ''}`,
      )
      label.setColor(level === 0 ? '#64748b' : '#94a3b8')
    }
  }

  private refreshFollowers(): void {
    const followers = useGameStore.getState().followers
    // Supprime les sprites de ceux qui n'existent plus
    for (const [id, sprite] of this.followerSprites) {
      if (!followers.some((f) => f.id === id)) {
        sprite.destroy()
        this.followerSprites.delete(id)
      }
    }
    // Chaque Éveillé vit près de son lieu de travail (ou du Foyer s'il se repose)
    for (const f of followers) {
      const anchor = this.spotMap[f.assignedTo ?? 'hearth'] ?? this.spotMap.hearth
      let sprite = this.followerSprites.get(f.id)
      if (!sprite) {
        sprite = this.add
          .sprite(anchor.x + Phaser.Math.Between(-40, 40), anchor.y + Phaser.Math.Between(30, 60), TINY, TINY_FOLLOWERS[f.species] ?? 85)
          .setScale(2)
          .setDepth(60)
        breathe(this, sprite, 2)
        this.followerSprites.set(f.id, sprite)
        this.wanderLoop(sprite)
      }
      sprite.setData('anchor', anchor)
    }
  }

  private wanderLoop(sprite: Phaser.GameObjects.Sprite): void {
    if (!sprite.active) return
    const anchor = (sprite.getData('anchor') as { x: number; y: number }) ?? { x: this.W / 2, y: this.H / 2 }
    const tx = Phaser.Math.Clamp(anchor.x + Phaser.Math.Between(-55, 55), 60, this.W - 60)
    const ty = Phaser.Math.Clamp(anchor.y + Phaser.Math.Between(20, 75), 120, this.H - 60)
    this.tweens.add({
      targets: sprite,
      x: tx,
      y: ty,
      duration: Phaser.Math.Between(1500, 3000),
      ease: 'Sine.easeInOut',
      onComplete: () => this.time.delayedCall(Phaser.Math.Between(400, 2000), () => this.wanderLoop(sprite)),
    })
  }

  private createPortal(): void {
    const unlocked = useGameStore.getState().progression.unlockedRegions
    this.selectedRegionIdx = Math.max(
      0,
      ...REGIONS.filter((r) => unlocked.includes(r.id)).map((r) => r.order),
    )

    const portal = this.add.sprite(this.W / 2, 160, TEX.portal).setInteractive({ useHandCursor: true })
    this.tweens.add({ targets: portal, scale: 1.15, angle: 360, duration: 3000, repeat: -1 })

    this.regionLabel = this.add
      .text(this.W / 2, 205, '', { fontFamily: 'monospace', fontSize: '12px', color: '#a5b4fc', align: 'center' })
      .setOrigin(0.5)

    const mkArrow = (x: number, dir: -1 | 1) => {
      const arrow = this.add
        .text(x, 160, dir === -1 ? '◀' : '▶', { fontFamily: 'monospace', fontSize: '26px', color: '#818cf8' })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
      arrow.on('pointerdown', () => this.cycleRegion(dir))
    }
    mkArrow(this.W / 2 - 90, -1)
    mkArrow(this.W / 2 + 90, 1)
    this.input.keyboard?.on('keydown-LEFT', () => this.cycleRegion(-1))
    this.input.keyboard?.on('keydown-RIGHT', () => this.cycleRegion(1))

    // Sélecteur de Profondeur (visible dès qu'on a débloqué la 2)
    this.selectedDepth = useGameStore.getState().progression.depth
    if (this.selectedDepth > 1) {
      const mkDepthArrow = (x: number, dir: -1 | 1) => {
        const a = this.add
          .text(x, 262, dir === -1 ? '−' : '+', { fontFamily: 'monospace', fontSize: '20px', color: '#f5c542' })
          .setOrigin(0.5)
          .setInteractive({ useHandCursor: true })
        a.on('pointerdown', () => {
          const max = useGameStore.getState().progression.depth
          this.selectedDepth = Phaser.Math.Clamp(this.selectedDepth + dir, 1, max)
          this.refreshRegionLabel()
        })
      }
      mkDepthArrow(this.W / 2 - 70, -1)
      mkDepthArrow(this.W / 2 + 70, 1)
      this.depthLabel = this.add
        .text(this.W / 2, 262, '', { fontFamily: 'monospace', fontSize: '13px', color: '#f5c542' })
        .setOrigin(0.5)
    }

    this.refreshRegionLabel()
    portal.on('pointerdown', () => this.tryStartRun())
    this.input.keyboard?.on('keydown-ENTER', () => this.tryStartRun())
  }

  private cycleRegion(dir: -1 | 1): void {
    this.selectedRegionIdx = (this.selectedRegionIdx + dir + REGIONS.length) % REGIONS.length
    this.refreshRegionLabel()
  }

  private isSelectedUnlocked(): boolean {
    const region = REGIONS[this.selectedRegionIdx]
    return useGameStore.getState().progression.unlockedRegions.includes(region.id)
  }

  private refreshRegionLabel(): void {
    const region = REGIONS[this.selectedRegionIdx]
    const state = useGameStore.getState()
    const unlocked = this.isSelectedUnlocked()
    const cleared = state.progression.bossesDefeated.includes(region.id)
    const mastered = hasRegionMastery(state, region.id)
    this.regionLabel?.setText(
      unlocked
        ? `◈ ${region.name.toUpperCase()} ${cleared ? '✓' : ''}${mastered ? ' ★ MASTERED' : ''}\nCost: ${BALANCE.runStartCost} energy — tap to enter`
        : `🔒 ${region.name.toUpperCase()}\nDefeat the previous boss to unlock`,
    )
    this.regionLabel?.setColor(unlocked ? '#a5b4fc' : '#64748b')
    this.depthLabel?.setText(`⛏ DEPTH ${this.selectedDepth}`)
  }

  private tryStartRun(): void {
    const state = useGameStore.getState()
    const region = REGIONS[this.selectedRegionIdx]
    if (!this.isSelectedUnlocked()) {
      this.juice.textPopup(this.W / 2, 120, 'This region is still asleep — beat the previous boss first', '#94a3b8')
      return
    }
    if (state.energy < BALANCE.runStartCost) {
      this.juice.textPopup(this.W / 2, 120, `Need ${Math.ceil(BALANCE.runStartCost - state.energy)} more energy — keep walking!`, '#fbbf24')
      return
    }
    // Propose les contrats maudits avant d'embarquer (3 avec Dark Reputation)
    const contractCount = hasUnlock(state, 'triple-contract') ? 3 : 2
    gameEvents.emit('hub:offer-contracts', region.id, rollContractOffer(contractCount))
  }

  private embark(regionId: string, contractIds: string[], potionId?: string, challenge?: boolean, mode?: 'boss-rush' | 'colosseum', overcharge?: number): void {
    if (useGameStore.getState().startRun(regionId, contractIds, this.selectedDepth, potionId, challenge, mode, overcharge)) {
      playSfx('levelUp')
      this.cameras.main.flash(300, 129, 140, 248)
      this.time.delayedCall(250, () => this.scene.start('Run'))
    }
  }
}
