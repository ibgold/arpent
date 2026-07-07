import type { WalkDataSource, WalkSampleCallback } from './WalkDataSource'

const TICK_MS = 1000

/** Marche fictive : vitesse constante avec une légère variation naturelle. Pour tester tout le jeu au bureau. */
export class SimulatedSource implements WalkDataSource {
  private cb: WalkSampleCallback | undefined
  private timer: ReturnType<typeof setInterval> | undefined
  private baseSpeedKmh: number
  private lastTick = 0
  private t = 0

  constructor(baseSpeedKmh = 4) {
    this.baseSpeedKmh = baseSpeedKmh
  }

  setBaseSpeed(kmh: number): void {
    this.baseSpeedKmh = Math.max(0, kmh)
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
    this.t += dtS
    if (this.baseSpeedKmh <= 0) return
    // Légère ondulation pour un rendu plus organique qu'une constante parfaite
    const speedKmh = Math.max(0, this.baseSpeedKmh + Math.sin(this.t * 0.4) * 0.4)
    const distanceDeltaM = (speedKmh / 3.6) * dtS
    this.cb?.({ timestamp: Date.now(), distanceDeltaM, speedKmh })
  }
}
