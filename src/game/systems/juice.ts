import Phaser from 'phaser'
import { TEX } from '../art/textures'

// Le « juice » est une feature : pops de dégâts, hit-stop, shake, particules, flash.
// Respecte prefers-reduced-motion (shake et hit-stop coupés).

const reducedMotion =
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export class JuiceSystem {
  private scene: Phaser.Scene

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  damagePopup(x: number, y: number, amount: number, crit = false): void {
    const text = this.scene.add
      .text(x, y - 10, `${Math.round(amount)}`, {
        fontFamily: 'monospace',
        fontSize: crit ? '22px' : '15px',
        color: crit ? '#fbbf24' : '#f8fafc',
        stroke: '#0f172a',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(500)
    this.scene.tweens.add({
      targets: text,
      y: y - 44,
      alpha: 0,
      scale: crit ? 1.4 : 1,
      duration: reducedMotion ? 300 : 600,
      ease: 'Cubic.easeOut',
      onComplete: () => text.destroy(),
    })
  }

  textPopup(x: number, y: number, message: string, color = '#a7f3d0'): void {
    const text = this.scene.add
      .text(x, y, message, {
        fontFamily: 'monospace',
        fontSize: '14px',
        color,
        stroke: '#0f172a',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(500)
    this.scene.tweens.add({
      targets: text,
      y: y - 36,
      alpha: 0,
      duration: 900,
      ease: 'Cubic.easeOut',
      onComplete: () => text.destroy(),
    })
  }

  shake(intensity = 0.004, durationMs = 90): void {
    if (reducedMotion) return
    this.scene.cameras.main.shake(durationMs, intensity)
  }

  hitStop(ms = 40): void {
    if (reducedMotion) return
    const scene = this.scene
    scene.physics.world.pause()
    scene.time.delayedCall(ms, () => {
      if (scene.scene.isActive()) scene.physics.world.resume()
    })
  }

  flash(target: Phaser.GameObjects.Sprite, tint = 0xffffff): void {
    target.setTintFill(tint)
    this.scene.time.delayedCall(70, () => {
      if (target.active) target.clearTint()
    })
  }

  burst(x: number, y: number, color: number, count = 8, speed = 90): void {
    const particles = this.scene.add.particles(x, y, TEX.particle, {
      speed: { min: speed * 0.4, max: speed },
      lifespan: 350,
      scale: { start: 1, end: 0 },
      quantity: reducedMotion ? Math.ceil(count / 2) : count,
      tint: color,
      emitting: false,
    })
    particles.setDepth(400)
    particles.explode()
    this.scene.time.delayedCall(500, () => particles.destroy())
  }

  confetti(x: number, y: number): void {
    for (const color of [0xfbbf24, 0x34d399, 0x38bdf8, 0xf472b6, 0xa78bfa]) {
      this.burst(x + Phaser.Math.Between(-30, 30), y + Phaser.Math.Between(-30, 30), color, 10, 160)
    }
  }
}
