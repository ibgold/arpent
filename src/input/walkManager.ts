import { useGameStore } from '../core/state/store'
import { ManualSource } from './ManualSource'
import { SimulatedSource } from './SimulatedSource'
import { GpsSource } from './GpsSource'
import { PedometerSource } from './PedometerSource'
import { TreadmillSource } from './TreadmillSource'
import type { WalkDataSource, WalkSample } from './WalkDataSource'
import type { GameSettings } from '../core/types'
import { gameEvents } from '../game/bridge/events'

// Singleton qui branche la source de marche active sur le store.
// Change de source quand settings.inputMode change.

class WalkManager {
  readonly manual = new ManualSource()
  readonly simulated = new SimulatedSource(4)
  readonly gps = new GpsSource()
  readonly pedometer = new PedometerSource()
  readonly treadmill = new TreadmillSource()
  private active: WalkDataSource | undefined
  private currentSpeedKmh = 0
  private lastSampleAt = 0
  private paused = false

  init(): void {
    this.manual.onSample((s) => this.handleSample(s))
    this.simulated.onSample((s) => this.handleSample(s))
    this.gps.onSample((s) => this.handleSample(s))
    this.pedometer.onSample((s) => this.handleSample(s))
    this.treadmill.onSample((s) => this.handleSample(s))
    this.applyMode(useGameStore.getState().settings.inputMode)
    let prevMode = useGameStore.getState().settings.inputMode
    let prevSim = useGameStore.getState().settings.simSpeedKmh
    useGameStore.subscribe((state) => {
      if (state.settings.inputMode !== prevMode) {
        prevMode = state.settings.inputMode
        this.applyMode(prevMode)
      }
      if (state.settings.simSpeedKmh !== prevSim) {
        prevSim = state.settings.simSpeedKmh
        this.simulated.setBaseSpeed(prevSim)
      }
    })
    // Décroissance de la vitesse affichée si plus de samples (arrêt de marche)
    setInterval(() => {
      if (performance.now() - this.lastSampleAt > 2500 && this.currentSpeedKmh !== 0) {
        this.currentSpeedKmh = 0
        gameEvents.emit('walk:speed', 0)
      }
    }, 1000)
  }

  private applyMode(mode: GameSettings['inputMode']): void {
    this.active?.stop()
    if (mode === 'simulation') {
      this.simulated.setBaseSpeed(useGameStore.getState().settings.simSpeedKmh)
      this.active = this.simulated
    } else if (mode === 'gps') {
      this.active = this.gps
    } else if (mode === 'motion') {
      this.active = this.pedometer
    } else if (mode === 'treadmill') {
      this.active = this.treadmill
    } else {
      this.active = this.manual
    }
    if (!this.paused) this.active.start()
  }

  /** Met la marche en pause : plus aucun sample, quel que soit le mode.
   *  Mode tapis : arrête le BANDEAU mais garde la connexion Bluetooth (pas de re-appairage). */
  pause(): void {
    if (this.paused) return
    this.paused = true
    if (this.active === this.treadmill) void this.treadmill.stopBelt()
    else this.active?.stop()
    this.currentSpeedKmh = 0
    gameEvents.emit('walk:speed', 0)
    gameEvents.emit('walk:paused', true)
  }

  resume(): void {
    if (!this.paused) return
    this.paused = false
    // Tapis : la connexion est restée ouverte ; le bandeau ne REDÉMARRE PAS tout seul (sécurité) —
    // c'est le bouton « Start belt » qui relance.
    if (this.active !== this.treadmill) this.active?.start()
    gameEvents.emit('walk:paused', false)
  }

  togglePause(): void {
    if (this.paused) this.resume()
    else this.pause()
  }

  isPaused(): boolean {
    return this.paused
  }

  private handleSample(s: WalkSample): void {
    if (this.paused) return
    this.currentSpeedKmh = s.speedKmh
    this.lastSampleAt = performance.now()
    // dtS ≈ 1s par tick des deux sources ; on le déduit de la distance pour rester exact
    const dtS = s.speedKmh > 0 ? s.distanceDeltaM / (s.speedKmh / 3.6) : 0
    useGameStore.getState().applyWalkSample(s.distanceDeltaM, s.speedKmh, dtS)
    gameEvents.emit('walk:speed', s.speedKmh)
  }

  getCurrentSpeed(): number {
    return this.currentSpeedKmh
  }
}

export const walkManager = new WalkManager()
