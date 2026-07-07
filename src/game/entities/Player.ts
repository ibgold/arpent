import Phaser from 'phaser'
import { BALANCE } from '../../core/balance/constants'
import { breathe, TINY, TINY_VISUALS } from '../art/tinyDungeon'
import type { UnifiedInputState } from '../systems/inputSystem'

export class Player extends Phaser.Physics.Arcade.Sprite {
  hp: number
  maxHp: number
  atk: number
  moveSpeed: number

  private dashUntil = 0
  private dashReadyAt = 0
  private invulnUntil = 0
  private dashDir = new Phaser.Math.Vector2(1, 0)
  private lastMoveDir = new Phaser.Math.Vector2(1, 0)

  private dashCooldownMs: number
  private dashDisabled: boolean
  private shadow!: Phaser.GameObjects.Ellipse

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    stats: { maxHp: number; atk: number; speed: number; dashCooldownMult?: number; dashDisabled?: boolean },
    hp?: number,
  ) {
    const vis = TINY_VISUALS.player
    super(scene, x, y, TINY, vis.frame)
    scene.add.existing(this)
    scene.physics.add.existing(this)
    this.setScale(vis.scale)
    this.setCircle(vis.bodyRadius, 8 - vis.bodyRadius, 8 - vis.bodyRadius + 2)
    this.setCollideWorldBounds(true)
    this.setDepth(100)
    breathe(scene, this, vis.scale)
    this.maxHp = stats.maxHp
    this.hp = hp ?? stats.maxHp
    this.atk = stats.atk
    this.moveSpeed = stats.speed
    this.dashCooldownMs = BALANCE.heroDashCooldownMs * (stats.dashCooldownMult ?? 1)
    this.dashDisabled = stats.dashDisabled ?? false
    this.shadow = scene.add
      .ellipse(x, y + (this.height * vis.scale) / 2, this.width * vis.scale * 0.65, 7, 0x000000, 0.3)
      .setDepth(5)
  }

  override preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta)
    this.shadow.setPosition(this.x, this.y + (this.height * this.scaleX) / 2 - 2)
    // Le chevalier regarde dans sa direction de déplacement
    const body = this.body as Phaser.Physics.Arcade.Body
    if (Math.abs(body.velocity.x) > 5) this.setFlipX(body.velocity.x < 0)
  }

  override destroy(fromScene?: boolean): void {
    this.shadow?.destroy()
    super.destroy(fromScene)
  }

  applyDashCooldownMult(mult: number): void {
    this.dashCooldownMs *= mult
  }

  isDashing(): boolean {
    return this.scene.time.now < this.dashUntil
  }

  isInvulnerable(): boolean {
    return this.scene.time.now < this.invulnUntil || this.isDashing()
  }

  /** Retourne true si un dash vient de démarrer */
  handleMovement(input: UnifiedInputState): boolean {
    const now = this.scene.time.now
    const body = this.body as Phaser.Physics.Arcade.Body

    if (input.moveX !== 0 || input.moveY !== 0) {
      this.lastMoveDir.set(input.moveX, input.moveY).normalize()
    }

    let dashStarted = false
    if (input.dashPressed && !this.dashDisabled && now >= this.dashReadyAt && !this.isDashing()) {
      this.dashUntil = now + BALANCE.heroDashDurationMs
      this.dashReadyAt = now + this.dashCooldownMs
      this.dashDir.copy(this.lastMoveDir)
      dashStarted = true
    }

    if (this.isDashing()) {
      body.setVelocity(this.dashDir.x * BALANCE.heroDashSpeed, this.dashDir.y * BALANCE.heroDashSpeed)
      this.setAlpha(0.6)
    } else {
      body.setVelocity(input.moveX * this.moveSpeed, input.moveY * this.moveSpeed)
      this.setAlpha(1)
    }
    return dashStarted
  }

  getAimDir(): Phaser.Math.Vector2 {
    return this.lastMoveDir.clone()
  }

  /** Retourne true si des dégâts ont réellement été pris */
  takeDamage(amount: number): boolean {
    if (this.isInvulnerable()) return false
    this.hp = Math.max(0, this.hp - amount)
    this.invulnUntil = this.scene.time.now + BALANCE.heroInvulnAfterHitMs
    return true
  }
}
