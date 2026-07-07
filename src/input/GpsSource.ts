import type { WalkDataSource, WalkSampleCallback } from './WalkDataSource'

// Capteur réel n°1 : le GPS (marche en extérieur). Haversine entre deux fixes,
// filtrage des fixes imprécis et des vitesses non humaines. PWA : nécessite HTTPS.

const MAX_ACCURACY_M = 35
const MAX_SPEED_KMH = 12
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
    if ((pos.coords.accuracy ?? 999) > MAX_ACCURACY_M) return
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
    // On ignore l'immobilité GPS (jitter) et les vitesses de véhicule : l'énergie vient de la MARCHE
    if (speedKmh < 1 || speedKmh > MAX_SPEED_KMH) return
    this.cb?.({ timestamp: now, distanceDeltaM: dist, speedKmh })
  }
}
