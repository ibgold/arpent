import type { WalkDataSource, WalkSampleCallback } from './WalkDataSource'

// Capteur réel n°2 : le podomètre par accéléromètre (devicemotion).
// Détection de pas par pics d'accélération verticale — parfait sur tapis, téléphone en poche/main.
// iOS demande une permission explicite (bouton utilisateur requis).

const STEP_LENGTH_M = 0.7
const PEAK_THRESHOLD = 11.5 // m/s² (gravité ≈ 9.81 ; un pas dépasse nettement)
const MIN_STEP_INTERVAL_MS = 300 // cadence humaine max ≈ 3.3 pas/s
const EMIT_EVERY_MS = 1000

export class PedometerSource implements WalkDataSource {
  private cb: WalkSampleCallback | undefined
  private lastStepAt = 0
  private stepsSinceEmit = 0
  private emitTimer: ReturnType<typeof setInterval> | undefined
  private handler = (e: DeviceMotionEvent) => this.onMotion(e)
  status: 'idle' | 'active' | 'denied' | 'unavailable' = 'idle'

  onSample(cb: WalkSampleCallback): void {
    this.cb = cb
  }

  start(): void {
    if (typeof DeviceMotionEvent === 'undefined') {
      this.status = 'unavailable'
      return
    }
    // iOS 13+ : permission explicite, à appeler depuis un geste utilisateur
    const dme = DeviceMotionEvent as unknown as { requestPermission?: () => Promise<'granted' | 'denied'> }
    if (typeof dme.requestPermission === 'function') {
      dme.requestPermission()
        .then((res) => {
          if (res === 'granted') this.attach()
          else this.status = 'denied'
        })
        .catch(() => { this.status = 'denied' })
    } else {
      this.attach()
    }
  }

  private attach(): void {
    this.status = 'active'
    this.stepsSinceEmit = 0
    window.addEventListener('devicemotion', this.handler)
    this.emitTimer = setInterval(() => {
      if (this.stepsSinceEmit === 0) return
      const dist = this.stepsSinceEmit * STEP_LENGTH_M
      const speedKmh = Math.min(12, dist * 3.6) // dist sur 1 s
      this.stepsSinceEmit = 0
      this.cb?.({ timestamp: Date.now(), distanceDeltaM: dist, speedKmh })
    }, EMIT_EVERY_MS)
  }

  stop(): void {
    window.removeEventListener('devicemotion', this.handler)
    if (this.emitTimer) clearInterval(this.emitTimer)
    this.emitTimer = undefined
    this.status = 'idle'
  }

  private onMotion(e: DeviceMotionEvent): void {
    const a = e.accelerationIncludingGravity
    if (!a) return
    const mag = Math.sqrt((a.x ?? 0) ** 2 + (a.y ?? 0) ** 2 + (a.z ?? 0) ** 2)
    const now = performance.now()
    if (mag > PEAK_THRESHOLD && now - this.lastStepAt > MIN_STEP_INTERVAL_MS) {
      this.lastStepAt = now
      this.stepsSinceEmit += 1
    }
  }
}
