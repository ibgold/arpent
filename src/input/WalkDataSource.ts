// Interface commune marche -> Énergie. Tout le reste de l'app ne connaît que ça.
// Brancher un vrai capteur (podomètre, Health Connect, Bluetooth FTMS) = une implémentation, zéro refactor.

export interface WalkSample {
  timestamp: number
  distanceDeltaM: number
  speedKmh: number
}

export type WalkSampleCallback = (sample: WalkSample) => void

export interface WalkDataSource {
  start(): void
  stop(): void
  onSample(cb: WalkSampleCallback): void
}
