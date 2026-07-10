import Phaser from 'phaser'
import { BALANCE } from '../../core/balance/constants'
import { aggregateSkills, type SkillEffects } from '../../core/balance/skills'
import { aggregateGear, type GearEffects } from '../../core/balance/affixes'
import { aggregateContracts, type ContractMods } from '../../core/balance/contracts'
import { villageCombatBonuses, type VillageCombatBonuses } from '../../core/balance/buildings'
import { hasRegionMastery, hasUnlock, MASTERY_DAMAGE_MULT, MASTERY_DRAIN_MULT } from '../../core/balance/collectionRewards'
import { rollSeedDrop, seedDef } from '../../core/balance/garden'
import { combinedChallengeMults, dailyChallengeMods } from '../../core/balance/challenge'
import { perkCount } from '../../core/balance/prestigePerks'
import { equippedWeaponProfile, type ArchetypeProfile } from '../../core/balance/weapons'
import { getRegion, REGIONS, type RegionDef } from '../../core/balance/regions'
import { rollBoonOffer } from '../../core/balance/boons'
import { heroStats, useGameStore } from '../../core/state/store'
import type { AcquireResult, RunSummary } from '../../core/types'
import { playSfx, vibrate } from '../../core/audio/sfx'
import { gameEvents } from '../bridge/events'
import { TEX } from '../art/textures'
import { buildTinyFloor, TINY, TINY_FOLLOWERS, TINY_PROPS } from '../art/tinyDungeon'
import { Player } from '../entities/Player'
import { ELITE_PREFIXES, Enemy, type EnemyKind } from '../entities/Enemy'
import { InputSystem } from '../systems/inputSystem'
import { JuiceSystem } from '../systems/juice'
import { catalogItem, RELIC_IDS, rollCatalogItem } from '../../core/balance/catalog'

const ARENA = 1200

/** Modificateurs de salle : la promesse affichée sur chaque porte */
type RoomModifier = 'loot' | 'resources' | 'elite' | 'cage'

const GATE_MODS: { id: RoomModifier; label: string; color: string }[] = [
  { id: 'loot', label: '💎 Treasure', color: '#38bdf8' },
  { id: 'resources', label: '🪵 Bounty', color: '#d6d3d1' },
  { id: 'elite', label: '👑 Elite hunt', color: '#fbbf24' },
  { id: 'cage', label: '🐾 Captive', color: '#f472b6' },
]

const ROOM_MOD_ANNOUNCE: Record<RoomModifier, string> = {
  loot: '💎 Treasure room — loot rains here',
  resources: '🪵 Bounty room — rich in materials',
  elite: '👑 Elite hunt — big risk, big reward',
  cage: '🐾 Someone is trapped here…',
}

export class RunScene extends Phaser.Scene {
  private player!: Player
  private inputSys!: InputSystem
  private juice!: JuiceSystem
  private enemies!: Phaser.Physics.Arcade.Group
  private playerShots!: Phaser.Physics.Arcade.Group
  private enemyShots!: Phaser.Physics.Arcade.Group
  private pickups!: Phaser.Physics.Arcade.Group
  private walls!: Phaser.Physics.Arcade.StaticGroup
  private gates: { gate: Phaser.Physics.Arcade.Sprite; label: Phaser.GameObjects.Text }[] = []
  private cage: Phaser.Physics.Arcade.Sprite | undefined
  private boss: Enemy | undefined
  private nextRoomModifier: RoomModifier | undefined
  private roomLootBonus = 0
  private roomResourceMult = 1

  private room = 1
  private region!: RegionDef
  private skills!: SkillEffects
  private gear!: GearEffects
  private contracts!: ContractMods
  private weapon!: ArchetypeProfile
  /** Salle qui contient l'événement de la run (autel ou marchand) */
  private eventRoom = 0
  private eventObjects: Phaser.GameObjects.GameObject[] = []
  private decorSprites: Phaser.GameObjects.Image[] = []
  private heroScaling = { hp: 1, atk: 1 }
  private village!: VillageCombatBonuses
  private mastery = false
  /** Défi quotidien 🏅 : multiplicateurs combinés des mods du jour (1 si run normale) */
  private challengeMults = { hp: 1, atk: 1, gold: 1, xp: 1 }
  /** Mode alternatif : boss-rush (9 boss enchaînés) ou colosseum (vagues infinies) */
  private mode: 'boss-rush' | 'colosseum' | undefined
  /** Cages apparues cette run (cap : BALANCE.cageMaxPerRun) */
  private cagesSpawned = 0
  private depth = 1
  /** Potion du jardin : multiplicateur d'or (Fortune) */
  private potionGoldMult = 1
  /** Choix de capacité gratuits restants au départ (Focus/Legend/Head Start) */
  private freeBoons = 0
  private lastDeniedAt = 0
  private boons = new Set<string>()
  private choosingBoon = false
  private nextAttackAt = 0
  private walkSpeedKmh = 0
  private runEnded = false
  private collectedLoot: AcquireResult[] = []
  private essenceGained = 0
  /** Le champion 👑 : LA seule élite de la run qui droppe un objet */
  private championPending = true
  private championRoom = 1
  private gold = 0
  private wood = 0
  private stone = 0
  private followersRescued = 0
  private runXp = 0
  private runLevel = 1
  private kills = 0
  private xpGained = 0
  private bonusMaxHp = 0

  constructor() {
    super('Run')
  }

  create(): void {
    const state = useGameStore.getState()
    const run = state.run
    if (!run) {
      this.scene.start('Hub')
      return
    }
    this.room = run.room
    this.mode = run.mode
    // Boss Rush : la séquence des 9 régions, un boss par salle
    this.region = this.mode === 'boss-rush' ? REGIONS[Math.min(this.room - 1, REGIONS.length - 1)] : getRegion(run.regionId)
    this.skills = aggregateSkills(state.hero.skills)
    this.gear = aggregateGear(state)
    this.contracts = aggregateContracts(run.contracts ?? [])
    this.weapon = equippedWeaponProfile(state)
    this.village = villageCombatBonuses(state.base)
    // Maîtrise régionale : le set complet de la région → +15% dégâts, −15% drain ici
    this.mastery = hasRegionMastery(state, run.regionId)
    // Profondeur : l'échelle infinie — les multiplicateurs composés font le gros du challenge
    this.depth = run.depth ?? 1
    const depthHp = Math.pow(BALANCE.depthHpMult, this.depth - 1)
    const depthAtk = Math.pow(BALANCE.depthAtkMult, this.depth - 1)
    // + scaling léger sur le niveau du héros (filet de sécurité)
    const heroLevel = state.hero.level
    // Défi quotidien 🏅 : les mods du jour durcissent les ennemis et gonflent les gains
    this.challengeMults = run.challenge ? combinedChallengeMults(dailyChallengeMods()) : { hp: 1, atk: 1, gold: 1, xp: 1 }
    this.heroScaling = {
      hp: (1 + (heroLevel - 1) * BALANCE.enemyHeroScalingHp) * depthHp * BALANCE.globalEnemyHpMult * this.challengeMults.hp,
      atk: (1 + (heroLevel - 1) * BALANCE.enemyHeroScalingAtk) * depthAtk * BALANCE.globalEnemyAtkMult * this.challengeMults.atk,
    }
    // Une salle événement par run (jamais la 1 ni celle du boss) — pas en Boss Rush
    this.eventRoom = this.mode === 'boss-rush' ? -1 : Phaser.Math.Between(2, BALANCE.roomsPerRegion - 1)
    this.boons = new Set(run.boons)
    this.choosingBoon = false
    this.runEnded = false
    this.collectedLoot = [...run.loot]
    this.essenceGained = run.essenceGained ?? 0
    // Le champion apparaît dans une salle aléatoire (1-5) ; une seule fois par run — pas en Boss Rush
    this.championRoom = Phaser.Math.Between(1, BALANCE.roomsPerRegion - 1)
    this.championPending = this.mode !== 'boss-rush'
    this.cagesSpawned = 0
    this.gold = run.gold
    this.wood = run.wood
    this.stone = run.stone
    this.followersRescued = run.followersRescued
    this.runXp = run.runXp ?? 0
    this.runLevel = run.runLevel ?? 1
    this.kills = run.kills
    this.xpGained = run.xpGained
    this.bonusMaxHp = 0

    this.physics.world.setBounds(0, 0, ARENA, ARENA)
    buildTinyFloor(this, ARENA, this.region.id, this.region.floorTint)
    this.buildAmbient()

    this.walls = this.physics.add.staticGroup()
    this.buildWalls()

    const stats = heroStats(state)
    // Potions du jardin 🌱 : Vigor (+30% PV), Fortune (+50% or), Focus/Legend (choix gratuits)
    const potion = run.potion
    this.potionGoldMult = potion === 'fortune' ? 1.5 : 1
    const potionHpMult = potion === 'vigor' ? 1.3 : 1
    // Contrat Glass Bones : PV max réduits (les PV courants sont clampés au nouveau max)
    // Festin de village 🍲 : +20% PV max pour cette run
    const feastHpMult = run.feast ? 1.2 : 1
    const maxHp = Math.round(stats.maxHp * this.contracts.playerHpMult * potionHpMult * feastHpMult)
    this.player = new Player(
      this,
      ARENA / 2,
      ARENA - 140,
      {
        ...stats,
        maxHp,
        dashCooldownMult:
          this.skills.dashCooldownMult * this.boonMult('swift-shadow', 0.65) * (1 - this.gear.dashCdReduction),
        dashDisabled: this.contracts.dashDisabled,
      },
      Math.min(run.currentHp, maxHp),
    )
    this.applyBoonStatEffects()

    this.enemies = this.physics.add.group({ runChildUpdate: false })
    this.playerShots = this.physics.add.group()
    this.enemyShots = this.physics.add.group()
    this.pickups = this.physics.add.group()

    this.inputSys = new InputSystem(this)
    this.juice = new JuiceSystem(this)

    this.cameras.main.setBounds(0, 0, ARENA, ARENA)
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12)
    this.cameras.main.setZoom(1.5) // le pixel art respire mieux zoomé

    this.setupCollisions()
    this.spawnRoom()

    // Drain d'énergie continu : à zéro → fin de run (loot conservé, jamais de punition)
    this.time.addEvent({ delay: 1000, loop: true, callback: () => this.tickEnergy() })

    // Hybride : la vitesse de marche en direct booste les dégâts
    const onSpeed = (kmh: number) => (this.walkSpeedKmh = kmh)
    const onBoonChosen = (id: string) => this.applyBoonChoice(id)
    const onBoonReroll = () => this.rerollBoonOffer()
    gameEvents.on('walk:speed', onSpeed)
    gameEvents.on('run:boon-chosen', onBoonChosen)
    gameEvents.on('run:boon-reroll', onBoonReroll)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      gameEvents.off('walk:speed', onSpeed)
      gameEvents.off('run:boon-chosen', onBoonChosen)
      gameEvents.off('run:boon-reroll', onBoonReroll)
      this.inputSys.destroy()
    })

    gameEvents.emit('run:started')
    gameEvents.emit('run:hp', this.player.hp, this.player.maxHp)
    gameEvents.emit('run:room', this.room, this.isBossRoom())
    gameEvents.emit('run:xp', this.runXp, this.runXpNeeded(), this.runLevel)
    if (this.mastery) {
      this.time.delayedCall(500, () =>
        this.juice.textPopup(this.player.x, this.player.y - 40, `★ ${this.region.name} MASTERED: +15% dmg`, '#fbbf24'),
      )
    }
    // Choix gratuits au départ : Head Start (30 découvertes) + potions Focus/Legend
    if (this.room === 1 && this.boons.size === 0) {
      this.freeBoons =
        (hasUnlock(state, 'head-start') ? 1 : 0) +
        (potion === 'focus' ? 1 : 0) +
        (potion === 'legend' ? 2 : 0) +
        perkCount(state, 'waking-boon')
      if (this.freeBoons > 0) this.time.delayedCall(700, () => this.offerBoon())
    }
  }

  // --- Boons ---

  private boonMult(id: string, mult: number): number {
    return this.boons.has(id) ? mult : 1
  }

  private applyBoonStatEffects(): void {
    // Effets passifs recalculés à la (re)création de la scène
    if (this.boons.has('sharpened-claws')) this.player.atk = Math.round(this.player.atk * 1.25)
    if (this.boons.has('wild-haste')) this.player.moveSpeed *= 1.15
    if (this.boons.has('stone-skin')) {
      this.player.maxHp += 25
      this.bonusMaxHp += 25
    }
  }

  private applyBoonChoice(id: string): void {
    if (!this.choosingBoon || this.runEnded) return
    this.choosingBoon = false
    this.physics.world.resume()
    this.grantBoon(id)
    // Chaîne des choix gratuits de départ (Legend en donne deux)
    if (this.freeBoons > 0) {
      this.freeBoons -= 1
      if (this.freeBoons > 0) this.time.delayedCall(300, () => this.offerBoon())
    }
  }

  /** Accorde une bénédiction (fin de salle, autel ou marchand) et applique ses effets immédiats */
  private grantBoon(id: string): void {
    this.boons.add(id)
    if (id === 'sharpened-claws') this.player.atk = Math.round(this.player.atk * 1.25)
    if (id === 'wild-haste') this.player.moveSpeed *= 1.15
    if (id === 'stone-skin') {
      this.player.maxHp += 25
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 25)
      gameEvents.emit('run:hp', this.player.hp, this.player.maxHp)
    }
    if (id === 'swift-shadow') this.player.applyDashCooldownMult(0.65)
    this.syncRun()
    playSfx('levelUp')
    this.juice.burst(this.player.x, this.player.y, 0xfbbf24, 14, 120)
  }

  /** Tire une bénédiction non possédée (autel/marchand). null si tout est déjà pris. */
  private grantRandomBoon(): string | null {
    const pool = rollBoonOffer([...this.boons], 1)
    if (pool.length === 0) return null
    this.grantBoon(pool[0].id)
    return pool[0].name
  }

  /** Reroll : rejoue l'offre de capacités contre de l'énergie (l'énergie a un usage actif en run) */
  private rerollBoonOffer(): void {
    if (!this.choosingBoon || this.runEnded) return
    if (!useGameStore.getState().spendEnergy(BALANCE.boonRerollCost)) return
    const count =
      3 +
      (this.gear.uniqueEffects.has('four-boons') ? 1 : 0) +
      (hasUnlock(useGameStore.getState(), 'wider-fate') ? 1 : 0)
    const offer = rollBoonOffer([...this.boons], count)
    if (offer.length > 0) gameEvents.emit('run:boon-offer', offer)
  }

  private offerBoon(): void {
    // Rootbound Crown : +1 choix ; Wider Fate (20 découvertes) : +1 choix
    const count =
      3 +
      (this.gear.uniqueEffects.has('four-boons') ? 1 : 0) +
      (hasUnlock(useGameStore.getState(), 'wider-fate') ? 1 : 0)
    const offer = rollBoonOffer([...this.boons], count)
    if (offer.length === 0) return // tout le pool est pris : rien à offrir
    this.choosingBoon = true
    this.physics.world.pause() // le monde retient son souffle pendant le choix
    gameEvents.emit('run:boon-offer', offer)
  }

  private isBossRoom(): boolean {
    if (this.mode === 'boss-rush') return true // chaque salle est un boss
    if (this.mode === 'colosseum') return this.room % 5 === 0 // vague de boss toutes les 5
    return this.room >= BALANCE.roomsPerRegion
  }

  private buildWalls(): void {
    this.walls.clear(true, true)
    for (let i = 0; i < 14; i++) {
      const x = Phaser.Math.Between(120, ARENA - 120)
      const y = Phaser.Math.Between(120, ARENA - 320)
      const w = Phaser.Math.Between(1, 4)
      for (let j = 0; j < w; j++) {
        const wall = this.walls.create(x + j * 32, y, TINY, TINY_PROPS.wall) as Phaser.Physics.Arcade.Sprite
        wall.setScale(2)
        wall.refreshBody()
      }
    }
    // Décor d'ambiance éparpillé, teinté par la région
    for (const d of this.decorSprites) d.destroy()
    this.decorSprites = []
    for (let i = 0; i < 26; i++) {
      const decor = this.add
        .image(Phaser.Math.Between(60, ARENA - 60), Phaser.Math.Between(60, ARENA - 60), TEX.decor(Phaser.Math.Between(0, TEX.decorCount - 1)))
        .setDepth(2)
        .setAlpha(0.75)
        .setTint(this.region.floorTint)
      this.decorSprites.push(decor)
    }
  }

  private setupCollisions(): void {
    this.physics.add.collider(this.player, this.walls)
    this.physics.add.collider(this.enemies, this.walls)
    this.physics.add.collider(this.enemies, this.enemies)

    this.physics.add.collider(this.playerShots, this.walls, (shot) => shot.destroy())
    this.physics.add.collider(this.enemyShots, this.walls, (shot) => shot.destroy())

    this.physics.add.overlap(this.playerShots, this.enemies, (shotObj, enemyObj) => {
      const shot = shotObj as Phaser.Physics.Arcade.Sprite
      const enemy = enemyObj as Enemy
      if (!shot.active || !enemy.active) return
      const dmgScale = (shot.getData('dmgScale') as number) ?? 1

      // Perçant : le bolt traverse un ennemi supplémentaire
      const pierce = (shot.getData('pierce') as number) ?? 0
      if (pierce > 0) shot.setData('pierce', pierce - 1)
      else shot.destroy()

      this.damageEnemy(enemy, dmgScale)
      if (!enemy.active) {
        this.tryRicochet(shot, enemy.x, enemy.y, dmgScale)
        return
      }

      // Effets élémentaires à l'impact (Magma Fist : ignition + brûlure ×2)
      if (this.boons.has('frost-bolt')) enemy.applySlow(1200)
      const magma = this.gear.uniqueEffects.has('magma-fist')
      if (this.boons.has('ember-bolt') || this.gear.uniqueEffects.has('ember-bolt') || magma) {
        enemy.applyBurn(this.player.atk * (magma ? 0.4 : 0.2))
      }
      if (this.weapon.id === 'hammer') {
        enemy.knockback(new Phaser.Math.Vector2(this.player.x, this.player.y), 260)
        this.juice.shake(0.002, 50)
      }
      this.tryRicochet(shot, enemy.x, enemy.y, dmgScale)
    })

    this.physics.add.overlap(this.player, this.enemyShots, (_p, shotObj) => {
      const shot = shotObj as Phaser.Physics.Arcade.Sprite
      const dmg = (shot.getData('atk') as number) ?? 8
      shot.destroy()
      this.damagePlayer(dmg)
    })

    this.physics.add.overlap(this.player, this.enemies, (_p, enemyObj) => {
      const enemy = enemyObj as Enemy
      // Dune Strider : le dash devient une arme — il blesse les ennemis traversés
      if (this.player.isDashing() && this.gear.uniqueEffects.has('dune-strider')) {
        const now = this.time.now
        if (now - ((enemy.getData('dashHitAt') as number) ?? 0) > 500) {
          enemy.setData('dashHitAt', now)
          this.damageEnemy(enemy, 0.6)
        }
        return
      }
      const tookDamage = !this.player.isInvulnerable()
      this.damagePlayer(enemy.atk)
      // Mirebark Shell : renvoie 25% des dégâts de contact
      if (tookDamage && this.gear.uniqueEffects.has('thorns') && enemy.active) {
        enemy.hp -= enemy.atk * 0.25
        this.juice.flash(enemy)
        if (enemy.hp <= 0) this.killEnemy(enemy)
      }
      // Glacier Heart : encaisser un coup gèle les ennemis proches
      if (tookDamage && this.gear.uniqueEffects.has('glacier-heart')) {
        for (const obj of this.enemies.getChildren()) {
          const e = obj as Enemy
          if (e.active && Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y) < 140) {
            e.applySlow(1200)
          }
        }
        this.juice.burst(this.player.x, this.player.y, 0x93c5fd, 14, 130)
      }
    })

    this.physics.add.overlap(this.player, this.pickups, (_p, obj) => {
      this.collectPickup(obj as Phaser.Physics.Arcade.Sprite)
    })
  }

  // --- Spawn ---

  private spawnRoom(): void {
    gameEvents.emit('run:room', this.room, this.isBossRoom())
    // Applique la promesse de la porte franchie
    const mod = this.nextRoomModifier
    this.nextRoomModifier = undefined
    this.roomLootBonus = mod === 'loot' ? 0.35 : 0
    this.roomResourceMult = mod === 'resources' ? 2.5 : 1
    if (mod) {
      this.time.delayedCall(300, () =>
        this.juice.textPopup(this.player.x, this.player.y - 40, ROOM_MOD_ANNOUNCE[mod], '#fbbf24'),
      )
    }

    if (this.isBossRoom()) {
      this.spawnBoss()
      return
    }
    // Colosseum : les vagues grossissent mais restent lisibles (cap à 20)
    const count = Math.min(this.mode === 'colosseum' ? 20 : 99, 4 + this.room * 2 + this.contracts.extraEnemiesPerRoom)
    for (let i = 0; i < count; i++) {
      this.spawnEnemy(this.pickEnemyKind())
    }
    if (mod === 'elite') {
      this.spawnEnemy(this.pickEnemyKind(), undefined, true)
      this.spawnEnemy(this.pickEnemyKind(), undefined, true)
    }
    if (mod === 'cage') this.spawnCage()
    else this.maybeSpawnCage()
    // Le champion doit exister : si sa salle est atteinte sans élite naturelle, on en force une
    if (this.championPending && this.room >= this.championRoom) {
      this.spawnEnemy(this.pickEnemyKind(), undefined, true)
    }
    // Salle événement : autel de sacrifice ou marchand itinérant
    if (this.room === this.eventRoom) {
      if (Math.random() < 0.5) this.spawnAltar()
      else this.spawnMerchant()
    }
  }

  private spawnEnemy(kind: EnemyKind, at?: Phaser.Math.Vector2, forceElite = false): Enemy {
    const pos = at ?? this.findSpawnPoint()
    const eliteChance =
      BALANCE.eliteChanceBase +
      this.room * BALANCE.eliteChancePerRoom +
      this.contracts.eliteChanceBonus +
      (this.depth - 1) * BALANCE.depthEliteBonus
    const elite = forceElite || (kind !== 'splitterMini' && Math.random() < eliteChance)
    const enemy = new Enemy(
      this,
      pos.x,
      pos.y,
      kind,
      this.room,
      this.region.difficultyMult,
      elite,
      this.contracts.enemySpeedMult,
      this.heroScaling,
    )
    enemy.onBurnTick = (e, dmg) => {
      this.juice.damagePopup(e.x, e.y, dmg)
      if (e.hp <= 0 && e.active) this.killEnemy(e)
      else if (e.kind === 'boss') gameEvents.emit('run:boss-hp', Math.max(0, e.hp), e.maxHp)
    }
    if (elite && enemy.elitePrefix) {
      const prefix = ELITE_PREFIXES[enemy.elitePrefix]
      this.juice.textPopup(pos.x, pos.y - 30, `${prefix.label} Elite!`, `#${prefix.tint.toString(16)}`)
    }
    // La première élite à partir de la salle du champion devient LE champion 👑
    if (elite && this.championPending && this.room >= this.championRoom) {
      this.championPending = false
      enemy.setData('champion', true)
      enemy.setScale(enemy.scaleX * 1.15)
      enemy.setTint(0xffd700)
      enemy.eliteTint = 0xffd700
      const crown = this.add
        .text(pos.x, pos.y - 44, '👑 CHAMPION', { fontFamily: 'monospace', fontSize: '12px', color: '#ffd700', stroke: '#0f172a', strokeThickness: 3 })
        .setOrigin(0.5)
        .setDepth(120)
      this.time.addEvent({
        delay: 60,
        loop: true,
        callback: () => (enemy.active ? crown.setPosition(enemy.x, enemy.y - 44) : crown.destroy()),
      })
    }
    enemy.fireShot = (x, y, dir) => this.fireEnemyShot(x, y, dir, enemy.atk)
    if (kind === 'splitter') {
      enemy.onSplit = (x, y) => {
        this.spawnEnemy('splitterMini', new Phaser.Math.Vector2(x - 14, y))
        this.spawnEnemy('splitterMini', new Phaser.Math.Vector2(x + 14, y))
      }
    }
    this.enemies.add(enemy)
    useGameStore.getState().addToBestiary(kind === 'splitterMini' ? 'splitter' : kind)
    return enemy
  }

  private pickEnemyKind(): EnemyKind {
    // Mix propre à la région + variété par salle : splitters et dashers rejoignent le pool salle 2+
    const w: Record<string, number> = { ...this.region.enemyWeights, splitter: 0, dasher: 0 }
    if (this.room >= 2) {
      w.splitter = 18
      w.dasher = 14
    }
    if (this.room < 2) w.shooter = 0
    if (this.room < 3) w.brute = Math.round(w.brute * 0.3)
    const total = Object.values(w).reduce((a, b) => a + b, 0)
    let roll = Math.random() * total
    for (const [kind, weight] of Object.entries(w)) {
      roll -= weight
      if (roll <= 0) return kind as EnemyKind
    }
    return 'chaser'
  }

  private spawnBoss(): void {
    this.boss = new Enemy(this, ARENA / 2, 220, 'boss', this.room, this.region.difficultyMult, false, 1, this.heroScaling)
    this.boss.burstBonus = this.depth - 1
    this.boss.setTint(this.region.bossTint)
    this.boss.fireShot = (x, y, dir) => this.fireEnemyShot(x, y, dir, Math.round(this.boss!.atk * 0.7))
    this.boss.onBurnTick = (e, dmg) => {
      this.juice.damagePopup(e.x, e.y, dmg)
      gameEvents.emit('run:boss-hp', Math.max(0, e.hp), e.maxHp)
      if (e.hp <= 0 && e.active) this.killEnemy(e)
    }
    this.enemies.add(this.boss)
    useGameStore.getState().addToBestiary('boss')
    gameEvents.emit('run:boss-hp', this.boss.hp, this.boss.maxHp)
    this.juice.textPopup(this.player.x, this.player.y - 50, this.region.bossName, '#f43f5e')
    this.juice.shake(0.006, 300)
  }

  private maybeSpawnCage(): void {
    if (Math.random() > BALANCE.cageChancePerRoom) return
    this.spawnCage()
  }

  private spawnCage(): void {
    // Les Éveillés sont un capital long terme : rare = précieux (cap dur par run)
    if (this.cagesSpawned >= BALANCE.cageMaxPerRun) return
    this.cagesSpawned += 1
    const pos = this.findSpawnPoint()
    this.cage = this.physics.add.sprite(pos.x, pos.y, TINY, TINY_PROPS.cage)
    this.cage.setScale(2)
    this.cage.setImmovable(true)
    this.cage.setDepth(70)
    const hint = this.add
      .text(pos.x, pos.y + 30, 'walk up to free', { fontFamily: 'monospace', fontSize: '10px', color: '#fbbf24', stroke: '#0f172a', strokeThickness: 3 })
      .setOrigin(0.5)
      .setDepth(71)
    this.eventObjects.push(hint)
    // La cage s'ouvre au contact du héros
    this.physics.add.overlap(this.player, this.cage, () => {
      hint.destroy()
      this.openCage()
    })
  }

  // --- Salles à événement ---

  private spawnAltar(): void {
    const pos = this.findSpawnPoint()
    const altar = this.physics.add.sprite(pos.x, pos.y, TEX.altar)
    altar.setImmovable(true)
    altar.setDepth(70)
    const label = this.add
      .text(pos.x, pos.y + 34, '🩸 Sacrifice 25% HP → blessing', {
        fontFamily: 'monospace', fontSize: '11px', color: '#fb7185', stroke: '#0f172a', strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(71)
    this.eventObjects.push(altar, label)
    this.tweens.add({ targets: altar, alpha: 0.75, yoyo: true, repeat: -1, duration: 600 })
    this.physics.add.overlap(this.player, altar, () => {
      altar.destroy()
      label.destroy()
      this.player.hp = Math.max(1, this.player.hp - this.player.maxHp * 0.25)
      gameEvents.emit('run:hp', this.player.hp, this.player.maxHp)
      const granted = this.grantRandomBoon()
      this.juice.shake(0.004, 150)
      this.juice.burst(pos.x, pos.y, 0xfb7185, 16, 140)
      this.juice.textPopup(pos.x, pos.y - 30, granted ? `The altar grants: ${granted}` : 'The altar hums… +40 gold', '#fb7185')
      if (!granted) this.gold += 40
      vibrate([40, 30, 80])
      this.syncRun()
    })
  }

  private spawnMerchant(): void {
    const pos = this.findSpawnPoint()
    const stall = this.add.sprite(pos.x, pos.y, TEX.merchant).setDepth(70)
    const title = this.add
      .text(pos.x, pos.y - 42, '🛖 Wandering merchant', {
        fontFamily: 'monospace', fontSize: '11px', color: '#fda4af', stroke: '#0f172a', strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(71)
    this.eventObjects.push(stall, title)

    const priceMult = this.region.lootMult
    const wares: { kind: 'heal' | 'item' | 'boon'; tex: string; price: number; dx: number }[] = [
      { kind: 'heal', tex: TEX.heart, price: Math.round(25 * priceMult), dx: -60 },
      { kind: 'item', tex: TEX.loot('epic'), price: Math.round(45 * priceMult), dx: 0 },
      { kind: 'boon', tex: TEX.star, price: Math.round(60 * priceMult), dx: 60 },
    ]
    for (const ware of wares) {
      const sprite = this.physics.add.sprite(pos.x + ware.dx, pos.y + 55, ware.tex)
      sprite.setImmovable(true)
      sprite.setDepth(70)
      const priceLabel = this.add
        .text(pos.x + ware.dx, pos.y + 78, `${ware.price}g`, {
          fontFamily: 'monospace', fontSize: '11px', color: '#fbbf24', stroke: '#0f172a', strokeThickness: 3,
        })
        .setOrigin(0.5)
        .setDepth(71)
      this.eventObjects.push(sprite, priceLabel)
      this.tweens.add({ targets: sprite, y: sprite.y - 6, yoyo: true, repeat: -1, duration: 700 })
      this.physics.add.overlap(this.player, sprite, () => this.buyWare(ware.kind, ware.price, sprite, priceLabel))
    }
  }

  private buyWare(kind: 'heal' | 'item' | 'boon', price: number, sprite: Phaser.Physics.Arcade.Sprite, label: Phaser.GameObjects.Text): void {
    if (!sprite.active) return
    if (!useGameStore.getState().spendGold(price)) {
      // Message throttlé pour ne pas spammer pendant qu'on marche dessus
      if (this.time.now - this.lastDeniedAt > 1200) {
        this.lastDeniedAt = this.time.now
        this.juice.textPopup(sprite.x, sprite.y - 24, `Need ${price}g`, '#f87171')
      }
      return
    }
    sprite.destroy()
    label.destroy()
    playSfx('lootRare')
    if (kind === 'heal') {
      this.player.hp = this.player.maxHp
      gameEvents.emit('run:hp', this.player.hp, this.player.maxHp)
      this.juice.textPopup(this.player.x, this.player.y - 24, 'Fully healed!', '#fb7185')
    } else if (kind === 'item') {
      const owned = new Set(Object.keys(useGameStore.getState().equipment.owned))
      const id = rollCatalogItem({ pool: 'any', regionOrder: this.region.order, depth: this.depth, owned })
      this.acquireInRun(id)
    } else {
      const granted = this.grantRandomBoon()
      this.juice.textPopup(this.player.x, this.player.y - 24, granted ? `Blessing: ${granted}` : 'Sold out — refunded', '#fbbf24')
      if (!granted) useGameStore.getState().spendGold(-price)
    }
    this.syncRun()
  }

  private findSpawnPoint(): Phaser.Math.Vector2 {
    for (let tries = 0; tries < 20; tries++) {
      const p = new Phaser.Math.Vector2(
        Phaser.Math.Between(80, ARENA - 80),
        Phaser.Math.Between(80, ARENA - 80),
      )
      if (p.distance(this.player) > 260) return p
    }
    return new Phaser.Math.Vector2(ARENA / 2, 120)
  }

  // --- Combat façon Archero : tir auto à l'arrêt, se déplacer = esquiver ---

  private tryAutoShoot(movingPenalty = 1): void {
    const now = this.time.now
    if (now < this.nextAttackAt) return

    // Cible : l'ennemi actif le plus proche à portée (réduite en mouvement)
    let nearest: Enemy | undefined
    let bestDist =
      BALANCE.heroAttackRange *
      this.boonMult('long-reach', 1.3) *
      (1 + this.gear.rangeBonus) *
      (movingPenalty > 1 ? BALANCE.movingFireRangeMult : 1)
    for (const obj of this.enemies.getChildren()) {
      const e = obj as Enemy
      if (!e.active) continue
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y)
      if (d < bestDist) {
        bestDist = d
        nearest = e
      }
    }
    if (!nearest) return

    this.nextAttackAt =
      now +
      BALANCE.heroAttackCooldownMs *
        this.weapon.cooldownMult *
        this.skills.attackCooldownMult *
        this.boonMult('frenzy', 0.75) *
        movingPenalty

    const dir = new Phaser.Math.Vector2(nearest.x - this.player.x, nearest.y - this.player.y).normalize()
    const angle = Math.atan2(dir.y, dir.x)
    playSfx('shoot')

    // Pattern de tir : les capacités se combinent (le moteur de build Archero)
    this.fireBolt(angle, 1)
    if (this.boons.has('multishot')) this.fireBolt(angle, 0.75, 14)
    if (this.boons.has('side-shots')) {
      this.fireBolt(angle + Math.PI / 2, 0.5)
      this.fireBolt(angle - Math.PI / 2, 0.5)
    }
    if (this.boons.has('rear-shot')) this.fireBolt(angle + Math.PI, 0.5)
    if (this.boons.has('diagonal-shots')) {
      this.fireBolt(angle + 0.45, 0.5)
      this.fireBolt(angle - 0.45, 0.5)
    }
  }

  /** Tire un bolt. offsetPerp décale le point de départ perpendiculairement (multishot). */
  private fireBolt(angle: number, dmgScale: number, offsetPerp = 0, fromX?: number, fromY?: number, bounced = false): void {
    const px = fromX ?? this.player.x - Math.sin(angle) * offsetPerp
    const py = fromY ?? this.player.y + Math.cos(angle) * offsetPerp
    const shot = this.playerShots.create(px, py, TEX.playerShot) as Phaser.Physics.Arcade.Sprite
    shot.setDepth(95)
    shot.setBlendMode(Phaser.BlendModes.ADD) // bolts lumineux
    const heavy = this.boons.has('heavy-bolt')
    shot.setScale(this.weapon.projScale * (heavy ? 1.4 : 1))
    if (this.boons.has('ember-bolt') || this.gear.uniqueEffects.has('ember-bolt')) shot.setTint(0xfb923c)
    else if (this.boons.has('frost-bolt')) shot.setTint(0x93c5fd)
    const speed = BALANCE.heroProjectileSpeed * this.boonMult('long-reach', 1.3) * (1 + this.gear.rangeBonus)
    shot.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed)
    shot.setData('dmgScale', dmgScale * this.weapon.damageMult * (heavy ? 1.15 : 1))
    shot.setData('pierce', this.boons.has('piercing') ? 1 : 0)
    shot.setData('bounced', bounced)
    this.time.delayedCall(1400, () => shot.active && shot.destroy())
  }

  /** Ricochet : à l'impact, le bolt rebondit vers le 2ᵉ ennemi le plus proche (une fois) */
  private tryRicochet(shot: Phaser.Physics.Arcade.Sprite, x: number, y: number, dmgScale: number): void {
    if (!this.boons.has('ricochet') || (shot.getData('bounced') as boolean)) return
    this.tryRicochetFrom(x, y, dmgScale * 0.7)
  }

  /** Chaîne un bolt depuis (x,y) vers l'ennemi le plus proche (Ricochet, Storm Core) */
  private tryRicochetFrom(x: number, y: number, dmgScale: number): void {
    let nearest: Enemy | undefined
    let bestDist = 300
    for (const obj of this.enemies.getChildren()) {
      const e = obj as Enemy
      if (!e.active) continue
      const d = Phaser.Math.Distance.Between(x, y, e.x, e.y)
      if (d > 10 && d < bestDist) {
        bestDist = d
        nearest = e
      }
    }
    if (!nearest) return
    const angle = Math.atan2(nearest.y - y, nearest.x - x)
    this.fireBolt(angle, dmgScale, 0, x, y, true)
  }

  // --- XP de run (orbes façon Archero) ---

  private runXpNeeded(): number {
    return Math.round(BALANCE.runXpBase * Math.pow(BALANCE.runXpGrowth, this.runLevel - 1))
  }

  private dropXpOrb(x: number, y: number, value: number): void {
    const orb = this.pickups.create(x + Phaser.Math.Between(-10, 10), y + Phaser.Math.Between(-10, 10), TEX.xpOrb) as Phaser.Physics.Arcade.Sprite
    orb.setDepth(78)
    orb.setData('runXp', value)
  }

  private gainRunXp(value: number): void {
    // Gloom Lantern : +40% d'XP de run · Défi quotidien : mods XP
    this.runXp += Math.round(value * (this.gear.uniqueEffects.has('gloom-lantern') ? 1.4 : 1) * this.challengeMults.xp)
    while (this.runXp >= this.runXpNeeded()) {
      this.runXp -= this.runXpNeeded()
      this.runLevel += 1
      this.juice.textPopup(this.player.x, this.player.y - 34, `LEVEL ${this.runLevel}!`, '#c4b5fd')
      this.juice.burst(this.player.x, this.player.y, 0xc4b5fd, 16, 130)
      playSfx('levelUp')
      vibrate(40)
      this.offerBoon()
    }
    gameEvents.emit('run:xp', this.runXp, this.runXpNeeded(), this.runLevel)
    this.syncRun()
  }

  private openCage(): void {
    if (!this.cage?.active) return
    this.juice.burst(this.cage.x, this.cage.y, 0xd6d3d1, 8, 90)
    playSfx('hit')
    const { x, y } = this.cage
    this.cage.destroy()
    this.cage = undefined
    const follower = useGameStore.getState().rescueFollower()
    if (follower) {
      this.followersRescued += 1
      useGameStore.getState().questProgress('rescue', 1)
      const sprite = this.add.sprite(x, y, TINY, TINY_FOLLOWERS[follower.species] ?? 85).setScale(2).setDepth(80)
      this.tweens.add({ targets: sprite, y: y - 30, alpha: 0, duration: 1200, onComplete: () => sprite.destroy() })
      this.juice.textPopup(x, y - 24, `${follower.name} joins the village!`, '#fbbf24')
      this.juice.confetti(x, y)
      playSfx('victory')
      vibrate([50, 30, 80])
      gameEvents.emit('run:follower-rescued', follower.name, follower.species)
    } else {
      // Village plein : l'Éveillé te bénit d'or à la place
      this.gold += 25
      this.juice.textPopup(x, y - 24, 'Village is full — +25 gold blessing', '#fbbf24')
      playSfx('loot')
    }
    this.syncRun()
  }

  private hybridDamageMult(): number {
    // Stride Anthem : le bonus Hybride est doublé ; la Waking Statue l'augmente
    const echo = this.gear.uniqueEffects.has('hybrid-echo') ? 2 : 1
    const perKmh = BALANCE.hybridDamageBonusPerKmh + this.village.hybridBonus
    return 1 + this.walkSpeedKmh * perKmh * echo
  }

  private damageEnemy(enemy: Enemy, damageScale = 1): void {
    if (!enemy.active) return
    const critChance =
      BALANCE.critChance +
      this.skills.critChanceBonus +
      this.gear.critChance +
      this.weapon.critBonus +
      (this.boons.has('keen-edge') ? 0.15 : 0)
    const crit = Math.random() < critChance
    const critMult = BALANCE.critMultiplier + this.gear.critDamage
    // Colossus Grip : +30% de dégâts aux élites et boss
    const giantSlayer =
      this.gear.uniqueEffects.has('giant-slayer') && (enemy.isElite || enemy.kind === 'boss') ? 1.3 : 1
    const masteryMult = this.mastery ? MASTERY_DAMAGE_MULT : 1
    const dmg =
      this.player.atk * damageScale * this.contracts.playerDmgMult * this.hybridDamageMult() * giantSlayer * masteryMult * (crit ? critMult : 1)
    enemy.hp -= dmg
    const lifesteal = (this.boons.has('leech-fang') ? 0.06 : 0) + this.gear.lifesteal
    if (lifesteal > 0 && this.player.hp < this.player.maxHp) {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + dmg * lifesteal)
      gameEvents.emit('run:hp', this.player.hp, this.player.maxHp)
    }
    this.juice.damagePopup(enemy.x, enemy.y, dmg, crit)
    this.juice.flash(enemy)
    this.juice.burst(enemy.x, enemy.y, 0xfde047, 5, 70)
    if (crit) {
      this.juice.shake(0.003, 60)
      this.juice.hitStop(30)
      playSfx('crit')
      // Storm Core : les crits chaînent un éclair vers un autre ennemi
      if (this.gear.uniqueEffects.has('storm-core')) {
        this.tryRicochetFrom(enemy.x, enemy.y, 0.5)
      }
    } else {
      playSfx('hit')
    }
    if (enemy.kind === 'boss') {
      gameEvents.emit('run:boss-hp', Math.max(0, enemy.hp), enemy.maxHp)
      this.time.delayedCall(90, () => enemy.active && enemy.setTint(this.region.bossTint))
    } else if (enemy.isElite) {
      this.time.delayedCall(90, () => enemy.active && enemy.setTint(enemy.eliteTint))
    }
    if (enemy.hp <= 0) this.killEnemy(enemy)
  }

  private killEnemy(enemy: Enemy): void {
    const { x, y, kind, xpValue, isElite, elitePrefix, atk } = enemy
    const depthXp = Math.pow(BALANCE.depthXpMult, this.depth - 1)
    this.xpGained += Math.round(xpValue * (1 + this.gear.xpBonus) * this.contracts.xpMult * depthXp * this.village.xpMult)
    this.kills += 1
    const goldMult =
      (this.boons.has('gold-sense') ? 1.6 : 1) *
      (1 + this.gear.goldBonus) *
      this.contracts.goldMult *
      this.village.goldMult *
      this.potionGoldMult *
      BALANCE.globalGoldMult *
      this.challengeMults.gold *
      Math.pow(BALANCE.depthGoldMult, this.depth - 1)
    this.gold += Math.round(Phaser.Math.Between(...BALANCE.goldPerKill) * goldMult * (isElite ? BALANCE.eliteGoldMult : 1))
    this.juice.burst(x, y, 0xf87171, 12, 120)
    // Orbe d'XP de run (façon Archero) : vole vers le joueur, remplit la jauge de capacité
    this.dropXpOrb(x, y, Math.max(3, Math.round(xpValue * 0.6)))
    const onSplit = enemy.onSplit
    const championKilled = (enemy.getData('champion') as boolean) ?? false
    enemy.destroy()

    // Élite volcanique : explose à la mort — reste à distance !
    if (elitePrefix === 'volcanic') {
      this.juice.burst(x, y, 0xff7849, 22, 200)
      this.juice.shake(0.006, 200)
      playSfx('hurt')
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, x, y) < 110) {
        this.damagePlayer(Math.round(atk * 1.5))
      }
    }

    if (kind === 'boss') {
      this.onBossDefeated(x, y)
      return
    }
    // Les splitters se scindent à la mort
    if (kind === 'splitter') onSplit?.(x, y)

    // Objets : SEUL le champion droppe garanti ; les bonus « +loot » donnent une chance aux élites normales
    if (championKilled) {
      this.dropCatalogAt(x, y)
      // Les bonus de loot offrent une chance d'un 2ᵉ drop du champion
      const bonusChance =
        this.skills.lootChanceBonus + (this.boons.has('lucky-charm') ? 0.18 : 0) + this.roomLootBonus + this.contracts.lootChanceBonus
      if (Math.random() < bonusChance) this.dropCatalogAt(x + 24, y)
    } else if (isElite) {
      const eliteChance =
        this.skills.lootChanceBonus + (this.boons.has('lucky-charm') ? 0.18 : 0) + this.roomLootBonus + this.contracts.lootChanceBonus
      if (Math.random() < eliteChance) this.dropCatalogAt(x, y)
    }
    // Graines du jardin 🌱 : élites (chance réglable), champion garanti
    if ((isElite && Math.random() < BALANCE.seedDropEliteChance) || championKilled) {
      this.dropSeed(x, y - 16, rollSeedDrop(this.region.order, 'rare'))
    }
    // Ressources du village : le combat nourrit la gestion
    if (isElite || Math.random() < BALANCE.woodDropChance * this.roomResourceMult) this.dropResource(x + 12, y, 'wood')
    if (isElite || Math.random() < BALANCE.stoneDropChance * this.roomResourceMult) this.dropResource(x - 12, y, 'stone')

    // Commissions
    const store = useGameStore.getState()
    store.questProgress('kill', 1)
    if (isElite) store.questProgress('elite', 1)

    this.syncRun()
    if (this.enemies.countActive() === 0) this.onRoomCleared()
  }

  /** Pass d'art régional : voile de lumière + particules d'ambiance propres à chaque monde */
  private buildAmbient(): void {
    const amb = this.region.ambient
    if (!amb) return
    this.add.rectangle(ARENA / 2, ARENA / 2, ARENA, ARENA, amb.color, amb.overlayAlpha).setDepth(4)
    const rect = new Phaser.Geom.Rectangle(0, 0, ARENA, ARENA)
    const zone: Phaser.Types.GameObjects.Particles.ParticleEmitterRandomZoneConfig = {
      type: 'random',
      source: { getRandomPoint: (point) => { const p = rect.getRandomPoint(); point.x = p.x; point.y = p.y } },
    }
    const base: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig = {
      emitZone: zone,
      tint: amb.color,
      alpha: { start: 0.35, end: 0 },
      scale: { start: 0.9, end: 0.2 },
      lifespan: 6000,
      frequency: 200,
      quantity: 1,
    }
    const byKind: Record<string, Phaser.Types.GameObjects.Particles.ParticleEmitterConfig> = {
      motes: { ...base, speedY: { min: -12, max: -4 }, speedX: { min: -6, max: 6 } },
      embers: { ...base, speedY: { min: -60, max: -20 }, speedX: { min: -12, max: 12 }, lifespan: 3200, frequency: 110, alpha: { start: 0.5, end: 0 } },
      snow: { ...base, speedY: { min: 15, max: 42 }, speedX: { min: -16, max: 16 }, lifespan: 8000, frequency: 90 },
      rain: { ...base, speedY: { min: 260, max: 340 }, lifespan: 1600, frequency: 26, alpha: { start: 0.3, end: 0.05 }, scale: { start: 0.5, end: 0.3 } },
      sand: { ...base, speedX: { min: 40, max: 90 }, speedY: { min: -6, max: 6 }, lifespan: 4200, frequency: 80 },
      spores: { ...base, speedY: { min: 5, max: 16 }, speedX: { min: -10, max: 10 }, lifespan: 7500, frequency: 160 },
    }
    this.add.particles(0, 0, TEX.particle, byKind[amb.kind] ?? byKind.motes).setDepth(5)
  }

  private onRoomCleared(): void {
    playSfx('levelUp')
    useGameStore.getState().questProgress('rooms', 1)
    // Colosseum : pas de porte, la vague suivante déferle directement
    if (this.mode === 'colosseum') {
      this.juice.textPopup(this.player.x, this.player.y - 30, `Wave ${this.room} cleared!`, '#fbbf24')
      useGameStore.getState().recordColosseumWave(this.room)
      this.time.delayedCall(900, () => this.nextRoom())
      return
    }
    this.juice.textPopup(this.player.x, this.player.y - 30, 'Room cleared!', '#38bdf8')
    // Les capacités arrivent via les orbes d'XP (façon Archero) : les portes s'ouvrent direct
    this.openGate()
  }

  private onBossDefeated(x: number, y: number): void {
    this.juice.confetti(x, y)
    this.juice.shake(0.008, 400)
    useGameStore.getState().questProgress('boss', 1)
    playSfx('victory')
    vibrate([80, 40, 80, 40, 160])
    // Le boss lâche UN objet garanti. 25% : une relique ✦ — SA relique signature d'abord (la chasse aux boss)
    if (Math.random() < BALANCE.bossUniqueChance) {
      const owned = useGameStore.getState().equipment.owned
      const relicId = !owned[this.region.relicId]
        ? this.region.relicId
        : (() => {
            const eligible = RELIC_IDS.filter((id) => (catalogItem(id)?.minRegion ?? 0) <= this.region.order)
            return eligible[Phaser.Math.Between(0, eligible.length - 1)] ?? RELIC_IDS[0]
          })()
      this.dropCatalogId(x, y, relicId)
      this.juice.textPopup(x, y - 60, '✦ A relic drops! ✦', '#fbbf24')
    } else {
      this.dropCatalogAt(x, y)
    }
    this.wood += 10
    this.stone += 6
    // Le boss lâche 2 graines (chance d'ultra-rare réglable, chacune)
    for (let i = 0; i < 2; i++) {
      const tier = Math.random() < BALANCE.seedDropUltraChance ? 'ultra' : 'rare'
      this.dropSeed(x + (i === 0 ? -34 : 34), y + 20, rollSeedDrop(this.region.order, tier))
    }
    // Boss Rush : on enchaîne — la porte du boss suivant s'ouvre
    if (this.mode === 'boss-rush' && this.room < REGIONS.length) {
      this.juice.textPopup(x, y - 84, `👑 Boss ${this.room}/${REGIONS.length} down!`, '#fbbf24')
      gameEvents.emit('run:boss-hp', 0, 1)
      this.openGate()
      return
    }
    // Colosseum : la vague de boss n'est qu'une vague de plus
    if (this.mode === 'colosseum') {
      this.juice.textPopup(x, y - 84, `👑 Boss wave ${this.room} down!`, '#fbbf24')
      gameEvents.emit('run:boss-hp', 0, 1)
      this.onRoomCleared()
      return
    }
    // Défi quotidien 🏅 : la victoire du jour paie une seule fois
    if (useGameStore.getState().run?.challenge) {
      const label = useGameStore.getState().winDailyChallenge()
      if (label) this.juice.textPopup(x, y - 84, `🏅 Daily challenge! ${label}`, '#fbbf24')
    }
    this.time.delayedCall(1800, () => this.endRun(true))
  }

  private damagePlayer(amount: number): void {
    if (this.runEnded || this.choosingBoon || !this.player.takeDamage(amount)) return
    this.juice.shake(0.005, 120)
    this.juice.flash(this.player, 0xff0000)
    this.juice.damagePopup(this.player.x, this.player.y, amount)
    playSfx('hurt')
    vibrate(60)
    gameEvents.emit('run:hp', this.player.hp, this.player.maxHp)
    this.syncRun()
    if (this.player.hp <= 0) {
      playSfx('death')
      this.endRun(false)
    }
  }

  private fireEnemyShot(x: number, y: number, dir: Phaser.Math.Vector2, atk: number): void {
    const shot = this.enemyShots.create(x, y, TEX.enemyShot) as Phaser.Physics.Arcade.Sprite
    shot.setDepth(95)
    shot.setData('atk', atk)
    // Void Anchor : les projectiles ennemis volent 15% plus lentement
    const speed = this.gear.uniqueEffects.has('void-anchor') ? 187 : 220
    shot.setVelocity(dir.x * speed, dir.y * speed)
    this.time.delayedCall(3000, () => shot.active && shot.destroy())
  }

  // --- Loot & ressources ---

  /** Tire un objet du catalogue (pool combat, gating région/profondeur, découverte favorisée) */
  private dropCatalogAt(x: number, y: number): void {
    const owned = new Set(Object.keys(useGameStore.getState().equipment.owned))
    const id = rollCatalogItem({ pool: 'combat', regionOrder: this.region.order, depth: this.depth, owned })
    this.dropCatalogId(x, y, id)
  }

  private dropCatalogId(x: number, y: number, catalogId: string): void {
    const def = catalogItem(catalogId)
    if (!def) return
    const sprite = this.pickups.create(x, y, TEX.loot(def.rarity)) as Phaser.Physics.Arcade.Sprite
    sprite.setData('catalogId', catalogId)
    sprite.setDepth(80)
    const relic = !!def.relicEffect
    this.tweens.add({ targets: sprite, scale: relic ? 1.5 : 1.25, yoyo: true, repeat: -1, duration: relic ? 350 : 500 })
  }

  private dropSeed(x: number, y: number, seedId: string): void {
    const sprite = this.pickups.create(x, y, TEX.seed) as Phaser.Physics.Arcade.Sprite
    sprite.setData('seedId', seedId)
    sprite.setDepth(80)
    this.tweens.add({ targets: sprite, y: y - 6, yoyo: true, repeat: -1, duration: 600 })
  }

  private dropResource(x: number, y: number, kind: 'wood' | 'stone'): void {
    const sprite = this.pickups.create(x, y, kind === 'wood' ? TEX.woodDrop : TEX.stoneDrop) as Phaser.Physics.Arcade.Sprite
    sprite.setData('resource', kind)
    sprite.setData('amount', Phaser.Math.Between(...BALANCE.resourceDropAmount))
    sprite.setDepth(79)
    // Anti-camouflage : les drops respirent et scintillent (ils se fondaient dans le décor)
    this.tweens.add({ targets: sprite, y: y - 5, scale: sprite.scale * 1.15, yoyo: true, repeat: -1, duration: 500, ease: 'Sine.easeInOut' })
    this.juice.burst(x, y, kind === 'wood' ? 0xd97706 : 0x94a3b8, 6, 60)
    const twinkle = this.time.addEvent({
      delay: 900, loop: true,
      callback: () => {
        if (!sprite.active) { twinkle.remove(); return }
        this.juice.burst(sprite.x, sprite.y - 8, 0xfde68a, 2, 30)
      },
    })
  }

  private collectPickup(sprite: Phaser.Physics.Arcade.Sprite): void {
    const catalogId = sprite.getData('catalogId') as string | undefined
    const resource = sprite.getData('resource') as 'wood' | 'stone' | undefined
    const runXpValue = sprite.getData('runXp') as number | undefined
    const seedId = sprite.getData('seedId') as string | undefined
    if (runXpValue) {
      sprite.destroy()
      this.gainRunXp(runXpValue)
      return
    }
    if (seedId) {
      sprite.destroy()
      useGameStore.getState().addSeed(seedId)
      const def = seedDef(seedId)
      this.juice.textPopup(this.player.x, this.player.y - 22, `${def?.icon ?? '🌱'} ${def?.name ?? 'Seed'} seed!`, '#86efac')
      this.juice.burst(this.player.x, this.player.y, 0x86efac, 8, 90)
      playSfx('loot')
      this.syncRun()
      return
    }
    if (catalogId) {
      sprite.destroy()
      this.acquireInRun(catalogId)
    } else if (resource) {
      const amount = (sprite.getData('amount') as number) ?? 1
      sprite.destroy()
      if (resource === 'wood') this.wood += amount
      else this.stone += amount
      this.juice.textPopup(this.player.x, this.player.y - 16, `+${amount} ${resource}`, '#d6d3d1')
      playSfx('loot')
    }
    this.syncRun()
  }

  /** Acquisition en run : découverte (le grand moment) ou doublon → Essence */
  private acquireInRun(catalogId: string): void {
    const result = useGameStore.getState().acquireItem(catalogId)
    const def = catalogItem(catalogId)
    this.collectedLoot.push(result)
    this.essenceGained += result.essence
    if (result.isNew) {
      this.juice.textPopup(this.player.x, this.player.y - 24, `★ NEW: ${def?.name ?? '???'}`, '#fbbf24')
      this.juice.confetti(this.player.x, this.player.y)
      playSfx('victory')
      vibrate([50, 30, 90])
    } else {
      this.juice.textPopup(this.player.x, this.player.y - 20, `${def?.name ?? '???'} → +${result.essence}⚗`, '#a78bfa')
      this.juice.burst(this.player.x, this.player.y, 0xa78bfa, 6, 90)
      playSfx('loot')
    }
    gameEvents.emit('loot:picked', def?.rarity ?? 'common', def?.name ?? '???')
    this.syncRun()
  }

  // --- Progression de salle ---

  private openGate(): void {
    if (this.gates.length > 0) return
    const nextIsBoss = this.mode === 'boss-rush' || this.room + 1 >= BALANCE.roomsPerRegion
    if (nextIsBoss) {
      this.spawnGate(ARENA / 2, undefined)
      this.juice.textPopup(this.player.x, this.player.y - 30, 'The boss awaits ↑', '#f43f5e')
      return
    }
    // Deux portes, deux promesses différentes : choisis ta prochaine salle
    // (la promesse « cage » disparaît une fois le cap de cages de la run atteint)
    const pool = GATE_MODS.filter((m) => m.id !== 'cage' || this.cagesSpawned < BALANCE.cageMaxPerRun)
    const mods = [...pool].sort(() => Math.random() - 0.5).slice(0, 2)
    this.spawnGate(ARENA / 2 - 140, mods[0])
    this.spawnGate(ARENA / 2 + 140, mods[1])
    this.juice.textPopup(this.player.x, this.player.y - 30, 'Choose your path ↑', '#38bdf8')
  }

  private spawnGate(x: number, mod: (typeof GATE_MODS)[number] | undefined): void {
    const gate = this.physics.add.sprite(x, 40, TEX.gate)
    gate.setImmovable(true)
    gate.setDepth(50)
    const label = this.add
      .text(x, 78, mod ? mod.label : '👑 BOSS', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: mod ? mod.color : '#f43f5e',
        stroke: '#0f172a',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(51)
    this.tweens.add({ targets: gate, alpha: 0.5, yoyo: true, repeat: -1, duration: 400 })
    this.physics.add.overlap(this.player, gate, () => {
      this.nextRoomModifier = mod?.id
      this.nextRoom()
    })
    this.gates.push({ gate, label })
  }

  private nextRoom(): void {
    if (this.runEnded) return
    for (const { gate, label } of this.gates) {
      gate.destroy()
      label.destroy()
    }
    this.gates = []
    this.cage?.destroy()
    this.cage = undefined
    for (const obj of this.eventObjects) obj.destroy()
    this.eventObjects = []
    this.room += 1
    // Boss Rush : chaque salle est le boss de la région suivante (nom, teinte, difficulté)
    if (this.mode === 'boss-rush') this.region = REGIONS[Math.min(this.room - 1, REGIONS.length - 1)]
    this.syncRun()
    this.player.setPosition(ARENA / 2, ARENA - 140)
    this.enemyShots.clear(true, true)
    this.playerShots.clear(true, true)
    this.pickups.clear(true, true)
    this.buildWalls()
    this.cameras.main.flash(200, 15, 23, 42)
    this.spawnRoom()
  }

  // --- Énergie ---

  private tickEnergy(): void {
    if (this.runEnded || this.choosingBoon) return
    const drainMult =
      (this.boons.has('warm-glow') ? 0.75 : 1) *
      (1 - this.gear.drainReduction) *
      this.contracts.drainMult *
      (this.mastery ? MASTERY_DRAIN_MULT : 1) *
      (1 + (this.depth - 1) * BALANCE.depthDrainBonus)
    const drain = (BALANCE.runDrainPerSec + this.room * BALANCE.runDrainPerRoom) * drainMult
    useGameStore.getState().drainEnergy(drain)
    if (useGameStore.getState().energy <= 0) {
      this.juice.textPopup(this.player.x, this.player.y - 30, 'Energy depleted — heading home', '#fbbf24')
      this.endRun(false)
    }
  }

  // --- Fin de run ---

  private syncRun(): void {
    useGameStore.getState().updateRun({
      room: this.room,
      currentHp: this.player.hp,
      loot: this.collectedLoot,
      gold: this.gold,
      wood: this.wood,
      stone: this.stone,
      followersRescued: this.followersRescued,
      boons: [...this.boons],
      runXp: this.runXp,
      runLevel: this.runLevel,
      essenceGained: this.essenceGained,
      kills: this.kills,
      xpGained: this.xpGained,
    })
  }

  private endRun(bossDefeated: boolean): void {
    if (this.runEnded) return
    this.runEnded = true
    // Aspiration du butin : rien de ce qui traîne au sol n'est jamais perdu
    let swept = 0
    for (const obj of this.pickups.getChildren()) {
      const sprite = obj as Phaser.Physics.Arcade.Sprite
      if (!sprite.active) continue
      const catalogId = sprite.getData('catalogId') as string | undefined
      const resource = sprite.getData('resource') as 'wood' | 'stone' | undefined
      const sweptSeed = sprite.getData('seedId') as string | undefined
      if (sweptSeed) {
        useGameStore.getState().addSeed(sweptSeed)
        swept += 1
      } else if (catalogId) {
        const result = useGameStore.getState().acquireItem(catalogId)
        this.collectedLoot.push(result)
        this.essenceGained += result.essence
        swept += 1
      } else if (resource) {
        const amount = (sprite.getData('amount') as number) ?? 1
        if (resource === 'wood') this.wood += amount
        else this.stone += amount
      }
    }
    this.pickups.clear(true, true)
    if (swept > 0) this.juice.textPopup(this.player.x, this.player.y - 40, `✨ ${swept} item${swept > 1 ? 's' : ''} swept up`, '#a7f3d0')
    const state = useGameStore.getState()
    const summary: RunSummary = {
      rooms: this.room,
      kills: this.kills,
      loot: this.collectedLoot,
      essenceGained: this.essenceGained,
      gold: this.gold,
      wood: this.wood,
      stone: this.stone,
      followersRescued: this.followersRescued,
      xpGained: this.xpGained,
      durationS: state.run ? Math.round((Date.now() - state.run.startedAt) / 1000) : 0,
      victory: bossDefeated,
      // Modes alternatifs : pures récompenses, pas de progression de région
      bossDefeated: bossDefeated && !this.mode,
    }
    state.endRun(summary)
    gameEvents.emit('run:ended', summary)
    this.time.delayedCall(400, () => this.scene.start('Hub'))
  }

  // --- Boucle ---

  override update(): void {
    if (this.runEnded || this.choosingBoon || !this.player?.active) return
    const input = this.inputSys.read()
    const dashed = this.player.handleMovement(input)
    if (dashed) {
      playSfx('dash')
      this.juice.burst(this.player.x, this.player.y, 0x34d399, 6, 60)
    }

    // Immobile = cadence pleine ; en mouvement on tire quand même, mais 2× plus lentement et moins loin
    const standing = input.moveX === 0 && input.moveY === 0 && !this.player.isDashing()
    if (!this.player.isDashing()) this.tryAutoShoot(standing ? 1 : BALANCE.movingFireCooldownMult)

    for (const obj of this.enemies.getChildren()) {
      ;(obj as Enemy).updateAI(this.player)
    }

    // Aimant : les orbes d'XP volent vers le joueur (170 px) ; les AUTRES ramassages
    // (bois, pierre, graines, objets) dérivent aussi vers lui à courte portée (110 px) —
    // fini les drops qui se fondent dans le décor et restent au sol
    for (const obj of this.pickups.getChildren()) {
      const p = obj as Phaser.Physics.Arcade.Sprite
      if (!p.active) continue
      const isOrb = !!p.getData('runXp')
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, p.x, p.y)
      if (isOrb ? d < 170 : d < 110) {
        this.tweens.killTweensOf(p) // le bob ne doit pas lutter contre l'aimant
        this.physics.moveToObject(p, this.player, isOrb ? 340 : 260)
      }
    }
  }
}
