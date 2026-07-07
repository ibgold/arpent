import Phaser from 'phaser'
import { BALANCE } from '../../core/balance/constants'
import { breathe, TINY, TINY_VISUALS } from '../art/tinyDungeon'
import type { Player } from './Player'

export type EnemyKind = 'chaser' | 'shooter' | 'brute' | 'splitter' | 'splitterMini' | 'dasher' | 'boss'

/** Préfixes d'élites : chaque élite a une identité lisible par sa teinte */
export type ElitePrefix = 'volcanic' | 'vampiric' | 'hasty'

export const ELITE_PREFIXES: Record<ElitePrefix, { label: string; tint: number }> = {
  volcanic: { label: 'Volcanic', tint: 0xff7849 },
  vampiric: { label: 'Vampiric', tint: 0xe879f9 },
  hasty: { label: 'Hasty', tint: 0x67e8f9 },
}

interface EnemyConfig {
  hp: number
  atk: number
  speed: number
  xp: number
}

const CONFIGS: Record<EnemyKind, EnemyConfig> = {
  chaser: { hp: 26, atk: 10, speed: 125, xp: BALANCE.enemyXp.chaser },
  shooter: { hp: 20, atk: 8, speed: 75, xp: BALANCE.enemyXp.shooter },
  brute: { hp: 80, atk: 18, speed: 55, xp: BALANCE.enemyXp.brute },
  splitter: { hp: 34, atk: 9, speed: 95, xp: BALANCE.enemyXp.splitter },
  splitterMini: { hp: 10, atk: 6, speed: 150, xp: 3 },
  dasher: { hp: 24, atk: 12, speed: 80, xp: BALANCE.enemyXp.dasher },
  boss: { hp: 850, atk: 22, speed: 62, xp: 140 },
}

const SHOOTER_RANGE = 260
const SHOOTER_FLEE = 150
const BRUTE_CHARGE_RANGE = 220
const DASHER_RANGE = 280

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  kind: EnemyKind
  hp: number
  maxHp: number
  atk: number
  xpValue: number
  isElite = false
  elitePrefix: ElitePrefix | undefined
  eliteTint = 0xffd166
  /** Densité de salve supplémentaire du boss (croît avec la Profondeur) */
  burstBonus = 0
  private moveSpeed: number
  private nextRegenAt = 0
  private nextActionAt = 0
  private slowUntil = 0
  private burnTicksLeft = 0
  private burnDamage = 0
  private nextBurnAt = 0
  /** Callback scène pour afficher les dégâts de brûlure */
  onBurnTick?: (enemy: Enemy, damage: number) => void
  private chargeUntil = 0
  private telegraphUntil = 0
  private chargeDir = new Phaser.Math.Vector2()
  /** Callback fournie par la scène pour tirer un projectile ennemi */
  fireShot?: (x: number, y: number, dir: Phaser.Math.Vector2) => void
  /** Callback fournie par la scène quand un splitter meurt (spawn des minis) */
  onSplit?: (x: number, y: number) => void

  private shadow: Phaser.GameObjects.Ellipse

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    kind: EnemyKind,
    room: number,
    statMult = 1,
    elite = false,
    speedMult = 1,
    /** Scaling dynamique sur le niveau effectif du héros (hp/atk séparés) */
    heroScaling: { hp: number; atk: number } = { hp: 1, atk: 1 },
  ) {
    const cfg = CONFIGS[kind]
    const vis = TINY_VISUALS[kind]
    super(scene, x, y, TINY, vis.frame)
    scene.add.existing(this)
    scene.physics.add.existing(this)
    this.kind = kind
    this.isElite = elite
    const eliteHp = elite ? BALANCE.eliteHpMult : 1
    const eliteAtk = elite ? BALANCE.eliteAtkMult : 1
    const hpMult = (1 + (room - 1) * BALANCE.enemyHpGrowthPerRoom) * statMult * eliteHp * heroScaling.hp
    const atkMult = (1 + (room - 1) * BALANCE.enemyAtkGrowthPerRoom) * statMult * eliteAtk * heroScaling.atk
    this.maxHp = Math.round(cfg.hp * hpMult)
    this.hp = this.maxHp
    this.atk = Math.round(cfg.atk * atkMult)
    this.xpValue = elite ? cfg.xp * 3 : cfg.xp
    this.moveSpeed = cfg.speed * speedMult
    const worldScale = vis.scale * (elite ? 1.35 : 1)
    this.setScale(worldScale)
    if (elite) {
      // Préfixe d'élite : identité + teinte lisible immédiatement
      const prefixIds = Object.keys(ELITE_PREFIXES) as ElitePrefix[]
      this.elitePrefix = prefixIds[Math.floor(Math.random() * prefixIds.length)]
      this.eliteTint = ELITE_PREFIXES[this.elitePrefix].tint
      if (this.elitePrefix === 'hasty') this.moveSpeed *= 1.5
      scene.tweens.add({ targets: this, alpha: 0.75, yoyo: true, repeat: -1, duration: 300 })
      this.setTint(this.eliteTint)
    } else {
      breathe(scene, this, worldScale)
    }
    this.setCircle(vis.bodyRadius, 8 - vis.bodyRadius, 8 - vis.bodyRadius + 1)
    this.setCollideWorldBounds(true)
    this.setDepth(90)
    // Ombre portée : ancre visuellement au sol
    this.shadow = scene.add
      .ellipse(x, y + (this.height * worldScale) / 2, this.width * worldScale * 0.65, 7, 0x000000, 0.28)
      .setDepth(5)
  }

  override preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta)
    this.shadow.setPosition(this.x, this.y + (this.height * this.scaleX) / 2 - 2)
    const body = this.body as Phaser.Physics.Arcade.Body
    if (Math.abs(body.velocity.x) > 5) this.setFlipX(body.velocity.x < 0)
  }

  override destroy(fromScene?: boolean): void {
    this.shadow?.destroy()
    super.destroy(fromScene)
  }

  /** Gel : ralentit les déplacements */
  applySlow(durationMs: number): void {
    this.slowUntil = this.scene.time.now + durationMs
  }

  /** Brûlure : dégâts sur la durée (3 ticks de 500ms) */
  applyBurn(damagePerTick: number): void {
    this.burnTicksLeft = 3
    this.burnDamage = damagePerTick
    this.nextBurnAt = this.scene.time.now + 500
  }

  /** Vitesse effective (gel pris en compte) */
  private effSpeed(): number {
    return this.scene.time.now < this.slowUntil ? this.moveSpeed * 0.65 : this.moveSpeed
  }

  /** Applique un recul (knockback du swing de mêlée) */
  knockback(from: Phaser.Math.Vector2, force: number): void {
    if (this.kind === 'boss' || this.kind === 'brute') return // les gros ne reculent pas
    const body = this.body as Phaser.Physics.Arcade.Body
    const dir = new Phaser.Math.Vector2(this.x - from.x, this.y - from.y).normalize()
    body.velocity.x += dir.x * force
    body.velocity.y += dir.y * force
  }

  updateAI(player: Player): void {
    if (!this.active || !player.active) return
    const now = this.scene.time.now
    const body = this.body as Phaser.Physics.Arcade.Body

    // Élite vampirique : régénère 2% de ses PV max par seconde
    if (this.elitePrefix === 'vampiric' && now >= this.nextRegenAt && this.hp < this.maxHp) {
      this.nextRegenAt = now + 1000
      this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.02)
    }

    // Brûlure : ticks de dégâts sur la durée
    if (this.burnTicksLeft > 0 && now >= this.nextBurnAt) {
      this.burnTicksLeft -= 1
      this.nextBurnAt = now + 500
      this.hp -= this.burnDamage
      this.onBurnTick?.(this, this.burnDamage)
      if (!this.active) return
    }
    const toPlayer = new Phaser.Math.Vector2(player.x - this.x, player.y - this.y)
    const dist = toPlayer.length()
    toPlayer.normalize()

    switch (this.kind) {
      case 'chaser':
      case 'splitterMini':
        body.setVelocity(toPlayer.x * this.effSpeed(), toPlayer.y * this.effSpeed())
        break

      case 'splitter':
        // Approche en zigzag léger
        body.setVelocity(
          toPlayer.x * this.effSpeed() + Math.sin(now / 200) * 40,
          toPlayer.y * this.effSpeed() + Math.cos(now / 200) * 40,
        )
        break

      case 'shooter': {
        if (dist < SHOOTER_FLEE) {
          body.setVelocity(-toPlayer.x * this.effSpeed(), -toPlayer.y * this.effSpeed())
        } else if (dist > SHOOTER_RANGE) {
          body.setVelocity(toPlayer.x * this.effSpeed(), toPlayer.y * this.effSpeed())
        } else {
          body.setVelocity(0, 0)
        }
        if (dist < SHOOTER_RANGE + 40 && now >= this.nextActionAt) {
          this.nextActionAt = now + 1250
          this.fireShot?.(this.x, this.y, toPlayer)
        }
        break
      }

      case 'dasher': {
        if (now < this.telegraphUntil) {
          body.setVelocity(0, 0) // télégraphe : immobile et clignote
        } else if (now < this.chargeUntil) {
          body.setVelocity(this.chargeDir.x * this.effSpeed() * 5.5, this.chargeDir.y * this.effSpeed() * 5.5)
        } else if (dist < DASHER_RANGE && now >= this.nextActionAt) {
          this.nextActionAt = now + 2100
          this.telegraphUntil = now + 420
          this.chargeUntil = now + 420 + 380
          this.chargeDir.copy(toPlayer)
          this.setTintFill(0xffffff)
          this.scene.time.delayedCall(420, () => this.active && (this.isElite ? this.setTint(0xffd166) : this.clearTint()))
        } else {
          body.setVelocity(toPlayer.x * this.effSpeed(), toPlayer.y * this.effSpeed())
        }
        break
      }

      case 'brute': {
        if (now < this.chargeUntil) {
          body.setVelocity(this.chargeDir.x * this.effSpeed() * 4, this.chargeDir.y * this.effSpeed() * 4)
        } else if (dist < BRUTE_CHARGE_RANGE && now >= this.nextActionAt) {
          this.nextActionAt = now + 2400
          this.chargeUntil = now + 520
          this.chargeDir.copy(toPlayer)
        } else {
          body.setVelocity(toPlayer.x * this.effSpeed(), toPlayer.y * this.effSpeed())
        }
        break
      }

      case 'boss': {
        // Pattern 1 : poursuite + salve radiale ; Pattern 2 (enragé <50% PV) : charges + salves denses
        const enraged = this.hp < this.maxHp * 0.5
        if (now < this.chargeUntil) {
          body.setVelocity(this.chargeDir.x * this.effSpeed() * 5, this.chargeDir.y * this.effSpeed() * 5)
        } else {
          body.setVelocity(toPlayer.x * this.effSpeed(), toPlayer.y * this.effSpeed())
          if (now >= this.nextActionAt) {
            this.nextActionAt = now + (enraged ? 1200 : 1900)
            if (enraged && Math.random() < 0.5) {
              this.chargeUntil = now + 620
              this.chargeDir.copy(toPlayer)
              this.setTintFill(0xffff00) // télégraphe lisible
              this.scene.time.delayedCall(200, () => this.active && this.clearTint())
            } else {
              this.radialBurst((enraged ? 14 : 9) + this.burstBonus * 2)
            }
          }
        }
        break
      }
    }
  }

  private radialBurst(count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count
      this.fireShot?.(this.x, this.y, new Phaser.Math.Vector2(Math.cos(angle), Math.sin(angle)))
    }
  }
}
