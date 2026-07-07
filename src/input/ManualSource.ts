import type { WalkDataSource, WalkSampleCallback } from './WalkDataSource'

const TICK_MS = 1000

/** Je règle ma vitesse (curseur / ±) ; émet des samples tant que « je marche » (vitesse > 0). */
export class ManualSource implements WalkDataSource {
  private cb: WalkSampleCallback | undefined
  private timer: ReturnType<typeof setInterval> | undefined
  private speedKmh = 0
  private lastTick = 0

  setSpeed(kmh: number): void {
    this.speedKmh = Math.max(0, Math.min(12, kmh))
  }

  getSpeed(): number {
    return this.speedKmh
  }

  start(): void {
    this.stop()
    this.lastTick = performance.now()
    this.timer = setInterval(() => this.tick(), TICK_MS)
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = undefined
  }

  onSample(cb: WalkSampleCallback): void {
    this.cb = cb
  }

  private tick(): void {
    const now = performance.now()
    const dtS = (now - this.lastTick) / 1000
    this.lastTick = now
    if (this.speedKmh <= 0) return
    const distanceDeltaM = (this.speedKmh / 3.6) * dtS
    this.cb?.({ timestamp: Date.now(), distanceDeltaM, speedKmh: this.speedKmh })
  }
}
