import Phaser from 'phaser'

// Couche d'input unifiée : clavier (ZQSD + WASD + flèches), joystick tactile virtuel, manette.
// Les scènes ne lisent que UnifiedInputState, jamais les périphériques directement.

export interface UnifiedInputState {
  moveX: number
  moveY: number
  attackHeld: boolean
  dashPressed: boolean
}

const JOYSTICK_RADIUS = 60
const DEADZONE = 0.18

export class InputSystem {
  private scene: Phaser.Scene
  private keys: Record<string, Phaser.Input.Keyboard.Key> = {}
  private dashWasDown = false

  // Joystick tactile (moitié gauche = déplacement, moitié droite = dash au tap ; l'attaque est auto en tactile)
  private stickPointer: Phaser.Input.Pointer | undefined
  private stickOrigin = new Phaser.Math.Vector2()
  private stickVector = new Phaser.Math.Vector2()
  private touchDash = false
  private touchActive = false
  private stickBase: Phaser.GameObjects.Arc | undefined
  private stickKnob: Phaser.GameObjects.Arc | undefined

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    const kb = scene.input.keyboard
    if (kb) {
      const map = {
        up: 'W', up2: 'Z', down: 'S', left: 'A', left2: 'Q', right: 'D',
        arrowUp: 'UP', arrowDown: 'DOWN', arrowLeft: 'LEFT', arrowRight: 'RIGHT',
        attack: 'SPACE', attack2: 'J', dash: 'SHIFT', dash2: 'K',
      }
      for (const [name, key] of Object.entries(map)) {
        this.keys[name] = kb.addKey(key)
      }
    }
    this.setupTouch()
  }

  private setupTouch(): void {
    const s = this.scene
    s.input.addPointer(2)
    s.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (!p.wasTouch) return
      this.touchActive = true
      if (p.x < s.scale.width / 2) {
        this.stickPointer = p
        this.stickOrigin.set(p.x, p.y)
        this.showStick(p.x, p.y)
      } else {
        this.touchDash = true
      }
    })
    s.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.stickPointer?.id !== p.id) return
      this.stickVector.set(p.x - this.stickOrigin.x, p.y - this.stickOrigin.y)
      const len = this.stickVector.length()
      if (len > JOYSTICK_RADIUS) this.stickVector.scale(JOYSTICK_RADIUS / len)
      this.stickKnob?.setPosition(this.stickOrigin.x + this.stickVector.x, this.stickOrigin.y + this.stickVector.y)
    })
    const release = (p: Phaser.Input.Pointer) => {
      if (this.stickPointer?.id === p.id) {
        this.stickPointer = undefined
        this.stickVector.set(0, 0)
        this.hideStick()
      }
    }
    s.input.on('pointerup', release)
    s.input.on('pointerupoutside', release)
  }

  private showStick(x: number, y: number): void {
    this.stickBase ??= this.scene.add.circle(0, 0, JOYSTICK_RADIUS, 0xffffff, 0.08).setScrollFactor(0).setDepth(1000)
    this.stickKnob ??= this.scene.add.circle(0, 0, 22, 0xffffff, 0.2).setScrollFactor(0).setDepth(1001)
    this.stickBase.setPosition(x, y).setVisible(true)
    this.stickKnob.setPosition(x, y).setVisible(true)
  }

  private hideStick(): void {
    this.stickBase?.setVisible(false)
    this.stickKnob?.setVisible(false)
  }

  /** En tactile, l'attaque est automatique (auto-aim) pour rester jouable à une main sur tapis */
  isTouchMode(): boolean {
    return this.touchActive
  }

  read(): UnifiedInputState {
    let moveX = 0
    let moveY = 0
    let attackHeld = false
    let dashDown = false

    // Clavier
    const k = this.keys
    if (Object.keys(k).length > 0) {
      if (k.left.isDown || k.left2.isDown || k.arrowLeft.isDown) moveX -= 1
      if (k.right.isDown || k.arrowRight.isDown) moveX += 1
      if (k.up.isDown || k.up2.isDown || k.arrowUp.isDown) moveY -= 1
      if (k.down.isDown || k.arrowDown.isDown) moveY += 1
      attackHeld = k.attack.isDown || k.attack2.isDown
      dashDown = k.dash.isDown || k.dash2.isDown
    }

    // Manette (Gamepad API via Phaser)
    const pad = this.scene.input.gamepad?.getPad(0)
    if (pad) {
      const ax = pad.axes[0]?.getValue() ?? 0
      const ay = pad.axes[1]?.getValue() ?? 0
      if (Math.abs(ax) > DEADZONE) moveX = ax
      if (Math.abs(ay) > DEADZONE) moveY = ay
      if (pad.A || (pad.R2 ?? 0) > 0.3) attackHeld = true
      if (pad.B || pad.X) dashDown = true
    }

    // Joystick tactile
    if (this.stickPointer) {
      moveX = this.stickVector.x / JOYSTICK_RADIUS
      moveY = this.stickVector.y / JOYSTICK_RADIUS
    }
    if (this.touchDash) {
      dashDown = true
      this.touchDash = false
    }
    if (this.touchActive) attackHeld = true // auto-attaque en tactile

    const len = Math.hypot(moveX, moveY)
    if (len > 1) {
      moveX /= len
      moveY /= len
    }
    if (len < DEADZONE && !this.stickPointer) {
      moveX = 0
      moveY = 0
    }

    const dashPressed = dashDown && !this.dashWasDown
    this.dashWasDown = dashDown

    return { moveX, moveY, attackHeld, dashPressed }
  }

  destroy(): void {
    this.stickBase?.destroy()
    this.stickKnob?.destroy()
  }
}
