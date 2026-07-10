import type { WalkDataSource, WalkSampleCallback } from './WalkDataSource'

// Capteur réel n°3 — LE MEILLEUR : le tapis de marche lui-même, lu en direct par Bluetooth.
// API Web Bluetooth (Chrome/Edge sur Windows/Android ; jamais iOS/Firefox). HTTPS + geste requis.
//
// Protocole PitPat / Superun BA10 (propriétaire, rétro-conçu publiquement — merci azmke/pitpat-treadmill-control) :
//   service 0xff00 · notify 0xff02 · write 0xff01
//   trame de notif (≥31 octets) : vitesse = octets 3-4 (÷1000 → km/h), distance = 7-10, pas = 14-17
//   « battement de cœur » à renvoyer après chaque notif pour garder le flux : 4d 00 <cpt> 05 6a 05 fd f8 43

const SERVICE_UUID = 0xff00
const NOTIFY_UUID = '0000ff02-0000-1000-8000-00805f9b34fb'
const WRITE_UUID = '0000ff01-0000-1000-8000-00805f9b34fb'

export type TreadmillStatus = 'idle' | 'connecting' | 'active' | 'denied' | 'unavailable' | 'lost'

export class TreadmillSource implements WalkDataSource {
  private cb: WalkSampleCallback | undefined
  private device: BluetoothDevice | undefined
  private writeChar: BluetoothRemoteGATTCharacteristic | undefined
  private notifyChar: BluetoothRemoteGATTCharacteristic | undefined
  private hbCounter = 0
  private lastAt = 0
  status: TreadmillStatus = 'idle'
  /** Diagnostics affichés dans l'onglet Walk */
  deviceName = ''
  lastSpeedKmh = 0
  treadmillSteps = 0
  treadmillDistanceM = 0
  lastError = ''

  onSample(cb: WalkSampleCallback): void {
    this.cb = cb
  }

  get supported(): boolean {
    return typeof navigator !== 'undefined' && !!navigator.bluetooth
  }

  /** Appelé par le walkManager au changement de mode : ne se connecte PAS (le pairing exige un geste utilisateur). */
  start(): void {
    if (!this.supported) {
      this.status = 'unavailable'
      return
    }
    if (this.status !== 'active') this.status = 'idle'
  }

  stop(): void {
    try {
      this.notifyChar?.removeEventListener('characteristicvaluechanged', this.onNotify)
      this.device?.removeEventListener('gattserverdisconnected', this.onDisconnect)
      this.device?.gatt?.disconnect()
    } catch { /* ignore */ }
    this.device = undefined
    this.writeChar = undefined
    this.notifyChar = undefined
    this.status = 'idle'
  }

  /** LE geste utilisateur : appelé directement par le bouton « Connecter le tapis ». */
  async connect(): Promise<void> {
    if (!this.supported) {
      this.status = 'unavailable'
      this.lastError = 'Web Bluetooth non supporté (utilise Chrome ou Edge sur Windows/Android).'
      return
    }
    try {
      this.status = 'connecting'
      this.lastError = ''
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [SERVICE_UUID],
      })
      this.device = device
      this.deviceName = device.name ?? 'tapis'
      device.addEventListener('gattserverdisconnected', this.onDisconnect)
      const server = await device.gatt!.connect()
      const service = await server.getPrimaryService(SERVICE_UUID)
      this.writeChar = await service.getCharacteristic(WRITE_UUID)
      this.notifyChar = await service.getCharacteristic(NOTIFY_UUID)
      await this.notifyChar.startNotifications()
      this.notifyChar.addEventListener('characteristicvaluechanged', this.onNotify)
      this.status = 'active'
      this.lastAt = 0
      void this.sendHeartbeat() // amorce le flux
    } catch (err) {
      const e = err as DOMException
      if (e?.name === 'NotFoundError') {
        // L'utilisateur a fermé le sélecteur sans choisir : pas une erreur
        this.status = 'idle'
      } else {
        this.status = 'denied'
        this.lastError = e?.message ?? String(err)
      }
    }
  }

  private onDisconnect = (): void => {
    this.status = 'lost'
    this.lastSpeedKmh = 0
  }

  private onNotify = (event: Event): void => {
    const dv = (event.target as BluetoothRemoteGATTCharacteristic).value
    if (!dv || dv.byteLength < 31) return
    const p = new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength)
    const speedKmh = (((p[3] << 8) | p[4]) & 0xffff) / 1000
    this.lastSpeedKmh = speedKmh
    this.treadmillDistanceM = ((p[7] << 24) | (p[8] << 16) | (p[9] << 8) | p[10]) >>> 0
    this.treadmillSteps = ((p[14] << 24) | (p[15] << 16) | (p[16] << 8) | p[17]) >>> 0

    const now = performance.now()
    const dtS = this.lastAt ? (now - this.lastAt) / 1000 : 0
    this.lastAt = now
    // Distance dérivée de vitesse × temps : robuste et indépendant de l'échelle du champ distance
    if (speedKmh > 0 && dtS > 0 && dtS < 10) {
      this.cb?.({ timestamp: Date.now(), distanceDeltaM: (speedKmh / 3.6) * dtS, speedKmh })
    }
    // Garde le flux ouvert
    void this.sendHeartbeat()
  }

  private async sendHeartbeat(): Promise<void> {
    if (!this.writeChar) return
    const hb = new Uint8Array([0x4d, 0x00, this.hbCounter & 0xff, 0x05, 0x6a, 0x05, 0xfd, 0xf8, 0x43])
    this.hbCounter = (this.hbCounter + 1) & 0xff
    const char = this.writeChar
    try {
      if (typeof char.writeValueWithoutResponse === 'function') await char.writeValueWithoutResponse(hb)
      else await char.writeValue(hb)
    } catch { /* la prochaine notif renverra un heartbeat */ }
  }
}
