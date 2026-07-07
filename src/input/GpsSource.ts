import { BALANCE } from '../core/balance/constants'
import type { WalkDataSource, WalkSampleCallback } from './WalkDataSource'

// Capteur réel n°1 : le GPS (marche en extérieur). Haversine entre deux fixes,
// filtrage des fixes imprécis et des vitesses non humaines. PWA : nécessite HTTPS.
// Seuils calibrables EN LIVE : Balance Lab → 📡 Sensors (lus à chaque fix).

const MIN_INTERVAL_MS = 900

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

export class GpsSource implements WalkDataSource {
  private cb: WalkSampleCallback | undefined
  private watchId: number | undefined
  private last: { lat: number; lon: number; t: number } | undefined
  /** Dernière erreur (affichable par l'UI) */
  status: 'idle' | 'active' | 'denied' | 'unavailable' = 'idle'
  /** Diagnostics live (affichés dans l'onglet Walk pour calibrer) */
  fixCount = 0
  rejectedCount = 0
  lastAccuracyM = 0
  lastSpeedKmh = 0

  onSample(cb: WalkSampleCallback): void {
    this.cb = cb
  }

  start(): void {
    if (!('geolocation' in navigator)) {
      this.status = 'unavailable'
      return
    }
    this.status = 'active'
    this.last = undefined
    this.watchId = navigator.geolocation.watchPosition(
      (pos) => this.onFix(pos),
      (err) => {
        this.status = err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable'
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
    )
  }

  stop(): void {
    if (this.watchId !== undefined) navigator.geolocation.clearWatch(this.watchId)
    this.watchId = undefined
    this.last = undefined
    this.status = 'idle'
  }

  private onFix(pos: GeolocationPosition): void {
    this.fixCount += 1
    this.lastAccuracyM = Math.round(pos.coords.accuracy ?? 999)
    if ((pos.coords.accuracy ?? 999) > BALANCE.gpsMaxAccuracyM) {
      this.rejectedCount += 1
      return
    }
    const now = pos.timestamp || Date.now()
    const { latitude: lat, longitude: lon } = pos.coords
    if (!this.last) {
      this.last = { lat, lon, t: now }
      return
    }
    const dtMs = now - this.last.t
    if (dtMs < MIN_INTERVAL_MS) return
    const dist = haversineM(this.last.lat, this.last.lon, lat, lon)
    const speedKmh = (dist / (dtMs / 1000)) * 3.6
    this.last = { lat, lon, t: now }
    this.lastSpeedKmh = Math.round(speedKmh * 10) / 10
    // On ignore l'immobilité GPS (jitter) et les vitesses de véhicule : l'énergie vient de la MARCHE
    if (speedKmh < BALANCE.gpsMinSpeedKmh || speedKmh > BALANCE.gpsMaxSpeedKmh) {
      this.rejectedCount += 1
      return
    }
    this.cb?.({ timestamp: now, distanceDeltaM: dist, speedKmh })
  }
}
