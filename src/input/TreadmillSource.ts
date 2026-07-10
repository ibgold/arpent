import type { WalkDataSource, WalkSampleCallback } from './WalkDataSource'

// Capteur réel n°3 — le tapis lui-même, lu en direct par Bluetooth (Web Bluetooth).
// Chrome/Edge sur Windows/Android uniquement. HTTPS + geste utilisateur requis.
//
// Familles DeerRun / Superun / PitPat (marque blanche, ex. Superun BA10). Protocoles rétro-conçus
// d'après qdomyos-zwift (cagnulein/qdomyos-zwift, deerruntreadmill.cpp). Trois variantes, détectées
// par l'UUID de service présent. Point crucial : il faut envoyer la séquence d'init IMMÉDIATEMENT
// après l'abonnement, sinon le tapis raccroche (il attend l'init pour commencer à émettre).

type VariantId = 'superun' | 'standard' | 'pitpat'

interface Variant {
  id: VariantId
  service: number
  write: number
  notify: number
  /** PitPat : déverrouillage à écrire sur un service séparé, sinon la connexion est refusée */
  unlockService?: number
  unlockChar?: number
  unlock?: number[]
  /** Commandes à écrire sur la caractéristique d'écriture, dans l'ordre, juste après l'abonnement */
  init: number[][]
  /** Battement de cœur périodique ; l'octet à `pollCounterIndex` (si ≥0) s'incrémente */
  poll: number[]
  pollCounterIndex: number
  /** Décode la vitesse (km/h) depuis la trame de notification */
  parseSpeed: (v: DataView) => number
}

const VARIANTS: Variant[] = [
  {
    id: 'superun',
    service: 0xffff, write: 0xff01, notify: 0xff02,
    init: [
      [0x4d, 0x00, 0x00, 0x05, 0x6a, 0x05, 0xfd, 0xf8, 0x43],
      [0x4d, 0x00, 0x01, 0x05, 0x6a, 0x05, 0xfd, 0xf8, 0x43],
      [0x4d, 0x00, 0x02, 0x17, 0x6a, 0x17, 0x00, 0x00, 0x00, 0x00, 0x03, 0xe8, 0x05, 0x00, 0x50, 0x00, 0x0c, 0x00, 0x00, 0x00, 0x00, 0x00, 0x10, 0xb5, 0x7c, 0x7c, 0x43],
    ],
    poll: [0x4d, 0x00, 0x00, 0x05, 0x6a, 0x05, 0xfd, 0xf8, 0x43], pollCounterIndex: 2,
    parseSpeed: (v) => (((v.getUint8(9) << 8) & 0xff) + v.getUint8(10)) / 100,
  },
  {
    id: 'standard',
    service: 0xfff0, write: 0xfff1, notify: 0xfff2,
    init: [
      [0x4d, 0x00, 0x00, 0x05, 0x6a, 0x05, 0xfd, 0xf8, 0x43],
      [0x4d, 0x00, 0x0c, 0x17, 0x6a, 0x17, 0x02, 0x00, 0x06, 0x40, 0x03, 0xe8, 0x00, 0x00, 0x00, 0x00, 0x0c, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0a, 0x85, 0x11, 0x2a, 0x43],
    ],
    poll: [0x4d, 0x00, 0x00, 0x05, 0x6a, 0x05, 0xfd, 0xf8, 0x43], pollCounterIndex: 2,
    parseSpeed: (v) => (((v.getUint8(9) << 8) & 0xff) + v.getUint8(10)) / 100,
  },
  {
    id: 'pitpat',
    service: 0xfba0, write: 0xfba1, notify: 0xfba2,
    unlockService: 0x1801, unlockChar: 0x2b2a, unlock: [0x6b, 0x05, 0x9d, 0x98, 0x43],
    init: [
      [0x6a, 0x05, 0xfd, 0xf8, 0x43],
      [0x6a, 0x05, 0xd7, 0xd2, 0x43],
      [0x6a, 0x17, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x05, 0x00, 0x81, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x93, 0x43],
    ],
    poll: [0x6a, 0x05, 0xfd, 0xf8, 0x43], pollCounterIndex: -1,
    parseSpeed: (v) => (((v.getUint8(3) << 8) | v.getUint8(4)) & 0xffff) / 1000,
  },
]

const ALL_SERVICES = [0xffff, 0xfff0, 0xfba0, 0xff00, 0x1801, 0x1910]

export type TreadmillStatus = 'idle' | 'connecting' | 'active' | 'denied' | 'unavailable' | 'lost'

export class TreadmillSource implements WalkDataSource {
  private cb: WalkSampleCallback | undefined
  private device: BluetoothDevice | undefined
  private writeChar: BluetoothRemoteGATTCharacteristic | undefined
  private notifyChar: BluetoothRemoteGATTCharacteristic | undefined
  private variant: Variant | undefined
  private pollTimer: ReturnType<typeof setInterval> | undefined
  private pollCounter = 0
  private lastAt = 0
  status: TreadmillStatus = 'idle'
  /** Diagnostics affichés dans l'onglet Walk */
  deviceName = ''
  variantName = ''
  lastSpeedKmh = 0
  treadmillDistanceM = 0
  notifCount = 0
  lastFrameHex = ''
  lastError = ''
  foundServices = ''

  onSample(cb: WalkSampleCallback): void {
    this.cb = cb
  }

  get supported(): boolean {
    return typeof navigator !== 'undefined' && !!navigator.bluetooth
  }

  start(): void {
    if (!this.supported) {
      this.status = 'unavailable'
      return
    }
    if (this.status !== 'active') this.status = 'idle'
  }

  stop(): void {
    if (this.pollTimer) clearInterval(this.pollTimer)
    this.pollTimer = undefined
    try {
      this.notifyChar?.removeEventListener('characteristicvaluechanged', this.onNotify)
      this.device?.removeEventListener('gattserverdisconnected', this.onDisconnect)
      this.device?.gatt?.disconnect()
    } catch { /* ignore */ }
    this.device = undefined
    this.writeChar = undefined
    this.notifyChar = undefined
    this.variant = undefined
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
      this.foundServices = ''
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ALL_SERVICES,
      })
      this.device = device
      this.deviceName = device.name ?? 'tapis'
      device.addEventListener('gattserverdisconnected', this.onDisconnect)
      await this.attach()
    } catch (err) {
      const e = err as DOMException
      if (e?.name === 'NotFoundError') this.status = 'idle' // sélecteur fermé sans choisir
      else { this.status = 'denied'; this.lastError = `${e?.name ?? 'Erreur'}: ${e?.message ?? String(err)}` }
    }
  }

  private async attach(): Promise<void> {
    const device = this.device
    if (!device) return
    let lastErr: unknown
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        this.status = 'connecting'
        const server = await device.gatt!.connect()
        await this.setup(server)
        this.status = 'active'
        this.lastError = ''
        this.lastAt = 0
        return
      } catch (err) {
        lastErr = err
        try { device.gatt?.disconnect() } catch { /* ignore */ }
        await new Promise((r) => setTimeout(r, 300 * attempt))
      }
    }
    const e = lastErr as DOMException
    this.status = 'denied'
    this.lastError = `${e?.name ?? 'Erreur'}: ${e?.message ?? String(lastErr)}`
  }

  private async setup(server: BluetoothRemoteGATTServer): Promise<void> {
    // Détection de variante : la première dont le service répond gagne
    this.variant = undefined
    for (const v of VARIANTS) {
      try {
        const service = await server.getPrimaryService(v.service)
        this.writeChar = await service.getCharacteristic(v.write)
        this.notifyChar = await service.getCharacteristic(v.notify)
        this.variant = v
        break
      } catch { /* pas cette variante */ }
    }
    if (!this.variant || !this.notifyChar || !this.writeChar) {
      try {
        const services = await server.getPrimaryServices()
        this.foundServices = services.map((s) => s.uuid.slice(4, 8)).join(', ') || 'aucun'
      } catch { this.foundServices = 'illisibles (déconnecté trop vite)' }
      throw new DOMException(`Aucune variante connue — services : ${this.foundServices}. Envoie-moi cette ligne !`, 'NotSupportedError')
    }
    this.variantName = `${this.variant.id} / ${this.variant.service.toString(16)}`

    // Abonnement d'abord (calme le chien de garde), puis init IMMÉDIATE
    await this.notifyChar.startNotifications()
    this.notifyChar.removeEventListener('characteristicvaluechanged', this.onNotify)
    this.notifyChar.addEventListener('characteristicvaluechanged', this.onNotify)

    // PitPat : déverrouillage sur son service séparé, glissé après le 1ᵉʳ init
    let unlockChar: BluetoothRemoteGATTCharacteristic | undefined
    if (this.variant.unlock && this.variant.unlockService && this.variant.unlockChar) {
      try {
        const us = await server.getPrimaryService(this.variant.unlockService)
        unlockChar = await us.getCharacteristic(this.variant.unlockChar)
      } catch { /* pas de service de déverrouillage : on tente sans */ }
    }

    for (let i = 0; i < this.variant.init.length; i++) {
      await this.writeTo(this.writeChar, this.variant.init[i])
      if (i === 0 && unlockChar && this.variant.unlock) await this.writeTo(unlockChar, this.variant.unlock)
    }

    // Poll périodique : garde le flux ouvert même si le tapis est à l'arrêt
    this.pollCounter = this.variant.init.length
    if (this.pollTimer) clearInterval(this.pollTimer)
    this.pollTimer = setInterval(() => void this.sendPoll(), 800)
  }

  private async sendPoll(): Promise<void> {
    const v = this.variant
    if (!v || !this.writeChar) return
    const bytes = [...v.poll]
    if (v.pollCounterIndex >= 0) {
      bytes[v.pollCounterIndex] = this.pollCounter & 0xff
      this.pollCounter = (this.pollCounter + 1) & 0xff
    }
    await this.writeTo(this.writeChar, bytes)
  }

  private async writeTo(char: BluetoothRemoteGATTCharacteristic, bytes: number[]): Promise<void> {
    const data = new Uint8Array(bytes)
    try {
      if (typeof char.writeValueWithoutResponse === 'function') await char.writeValueWithoutResponse(data)
      else await char.writeValue(data)
    } catch { /* on retentera au prochain poll */ }
  }

  private onDisconnect = (): void => {
    this.lastSpeedKmh = 0
    if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = undefined }
    if (this.status !== 'active') return
    this.status = 'lost'
    void this.attach() // reconnexion auto (on a déjà l'appareil)
  }

  private onNotify = (event: Event): void => {
    const dv = (event.target as BluetoothRemoteGATTCharacteristic).value
    if (!dv || !this.variant) return
    this.notifCount += 1
    // Filet de sécurité : les 1ers octets bruts, pour recaler le décodage si besoin
    const p = new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength)
    this.lastFrameHex = Array.from(p.slice(0, 16)).map((b) => b.toString(16).padStart(2, '0')).join(' ')
    if (dv.byteLength < 12) return
    const speedKmh = this.variant.parseSpeed(dv)
    if (!Number.isFinite(speedKmh) || speedKmh < 0 || speedKmh > 25) return
    this.lastSpeedKmh = speedKmh
    const now = performance.now()
    const dtS = this.lastAt ? (now - this.lastAt) / 1000 : 0
    this.lastAt = now
    if (speedKmh > 0 && dtS > 0 && dtS < 10) {
      const d = (speedKmh / 3.6) * dtS
      this.treadmillDistanceM += d
      this.cb?.({ timestamp: Date.now(), distanceDeltaM: d, speedKmh })
    }
  }
}
