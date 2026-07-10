import type { WalkDataSource, WalkSampleCallback } from './WalkDataSource'

// Capteur réel n°3 — LE MEILLEUR : le tapis de marche lui-même, lu en direct par Bluetooth.
// API Web Bluetooth (Chrome/Edge sur Windows/Android ; jamais iOS/Firefox). HTTPS + geste requis.
//
// Deux protocoles supportés, détectés automatiquement après connexion :
// 1. PitPat / Superun BA10 (propriétaire, rétro-conçu — merci azmke/pitpat-treadmill-control) :
//    caractéristiques notify 0xff02 / write 0xff01 (service ff00 ou fff0 selon firmware)
//    trame (≥31 o) : vitesse = octets 3-4 (÷1000 → km/h), distance = 7-10, pas = 14-17
//    heartbeat après chaque notif : 4d 00 <cpt> 05 6a 05 fd f8 43
// 2. FTMS standard (service 0x1826, Treadmill Data 0x2acd) : vitesse uint16 ×0.01 km/h à l'offset 2.

const CANDIDATE_SERVICES = [0xff00, 0xfff0, 0xffe0, 0x1826]
const PITPAT_NOTIFY = 0xff02
const PITPAT_WRITE = 0xff01
const FTMS_SERVICE = 0x1826
const FTMS_TREADMILL_DATA = 0x2acd

export type TreadmillStatus = 'idle' | 'connecting' | 'active' | 'denied' | 'unavailable' | 'lost'

export class TreadmillSource implements WalkDataSource {
  private cb: WalkSampleCallback | undefined
  private device: BluetoothDevice | undefined
  private writeChar: BluetoothRemoteGATTCharacteristic | undefined
  private notifyChar: BluetoothRemoteGATTCharacteristic | undefined
  private protocol: 'pitpat' | 'ftms' | undefined
  private hbCounter = 0
  private lastAt = 0
  status: TreadmillStatus = 'idle'
  /** Diagnostics affichés dans l'onglet Walk (l'erreur RESTE affichée jusqu'au prochain essai) */
  deviceName = ''
  lastSpeedKmh = 0
  treadmillSteps = 0
  treadmillDistanceM = 0
  lastError = ''
  /** Services GATT découverts au dernier essai (debug : dit quel protocole parle le tapis) */
  foundServices = ''

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
    this.protocol = undefined
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
        optionalServices: CANDIDATE_SERVICES,
      })
      this.device = device
      this.deviceName = device.name ?? 'tapis'
      device.addEventListener('gattserverdisconnected', this.onDisconnect)
      await this.attach()
    } catch (err) {
      const e = err as DOMException
      if (e?.name === 'NotFoundError') {
        // L'utilisateur a fermé le sélecteur sans choisir : pas une erreur
        this.status = 'idle'
      } else {
        this.status = 'denied'
        this.lastError = `${e?.name ?? 'Erreur'}: ${e?.message ?? String(err)}`
      }
    }
  }

  /** Connexion GATT + abonnement, avec retries : ces tapis raccrochent si on est trop lent,
   *  et un 2ᵉ essai immédiat passe très souvent là où le 1ᵉʳ échoue (particularité Windows/BLE). */
  private async attach(): Promise<void> {
    const device = this.device
    if (!device) return
    let lastErr: unknown
    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        this.status = 'connecting'
        const server = await device.gatt!.connect()
        await this.discover(server)
        this.status = 'active'
        this.lastError = ''
        this.lastAt = 0
        if (this.protocol === 'pitpat') void this.sendHeartbeat() // amorce le flux
        return
      } catch (err) {
        lastErr = err
        // Le tapis a raccroché en cours de route : petite pause puis on retente
        try { device.gatt?.disconnect() } catch { /* ignore */ }
        await new Promise((r) => setTimeout(r, 350 * attempt))
      }
    }
    const e = lastErr as DOMException
    this.status = 'denied'
    this.lastError = `${e?.name ?? 'Erreur'}: ${e?.message ?? String(lastErr)} (4 essais)`
  }

  /** Va droit aux services connus (rapide) — l'énumération complète ne sert qu'au diagnostic final */
  private async discover(server: BluetoothRemoteGATTServer): Promise<void> {
    this.protocol = undefined
    this.notifyChar = undefined
    this.writeChar = undefined
    // 1. Protocole PitPat : caractéristiques ff02/ff01 sous l'un des services candidats
    for (const uuid of [0xff00, 0xfff0, 0xffe0]) {
      try {
        const service = await server.getPrimaryService(uuid)
        this.notifyChar = await service.getCharacteristic(PITPAT_NOTIFY)
        this.writeChar = await service.getCharacteristic(PITPAT_WRITE)
        this.protocol = 'pitpat'
        break
      } catch { /* pas ce service : suivant */ }
    }
    // 2. Fallback : le standard FTMS
    if (!this.protocol) {
      try {
        const service = await server.getPrimaryService(FTMS_SERVICE)
        this.notifyChar = await service.getCharacteristic(FTMS_TREADMILL_DATA)
        this.protocol = 'ftms'
      } catch { /* pas de FTMS non plus */ }
    }
    if (!this.protocol || !this.notifyChar) {
      // Diagnostic : on liste ce que le tapis expose (peut échouer si déjà déconnecté)
      try {
        const services = await server.getPrimaryServices()
        this.foundServices = services.map((s) => s.uuid.slice(4, 8)).join(', ') || 'aucun'
      } catch { this.foundServices = 'illisibles (déconnecté trop vite)' }
      throw new DOMException(`Protocole inconnu — services vus : ${this.foundServices}. Envoie-moi cette ligne !`, 'NotSupportedError')
    }
    // S'abonner IMMÉDIATEMENT : c'est ce qui apaise le watchdog du tapis
    await this.notifyChar.startNotifications()
    this.notifyChar.removeEventListener('characteristicvaluechanged', this.onNotify)
    this.notifyChar.addEventListener('characteristicvaluechanged', this.onNotify)
  }

  private onDisconnect = (): void => {
    this.lastSpeedKmh = 0
    if (this.status !== 'active') return
    // Coupure en cours d'usage : on retente tout seul (pas de geste requis, on a déjà l'appareil)
    this.status = 'lost'
    void this.attach()
  }

  private onNotify = (event: Event): void => {
    const dv = (event.target as BluetoothRemoteGATTCharacteristic).value
    if (!dv) return
    if (this.protocol === 'ftms') return this.parseFtms(dv)
    this.parsePitpat(dv)
  }

  private parsePitpat(dv: DataView): void {
    if (dv.byteLength < 31) return
    const p = new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength)
    const speedKmh = (((p[3] << 8) | p[4]) & 0xffff) / 1000
    this.treadmillDistanceM = ((p[7] << 24) | (p[8] << 16) | (p[9] << 8) | p[10]) >>> 0
    this.treadmillSteps = ((p[14] << 24) | (p[15] << 16) | (p[16] << 8) | p[17]) >>> 0
    this.emitSample(speedKmh)
    void this.sendHeartbeat() // garde le flux ouvert
  }

  private parseFtms(dv: DataView): void {
    if (dv.byteLength < 4) return
    // Treadmill Data : flags uint16 LE, puis Instantaneous Speed uint16 LE en 0.01 km/h
    const speedKmh = dv.getUint16(2, true) / 100
    this.emitSample(speedKmh)
  }

  private emitSample(speedKmh: number): void {
    this.lastSpeedKmh = speedKmh
    const now = performance.now()
    const dtS = this.lastAt ? (now - this.lastAt) / 1000 : 0
    this.lastAt = now
    // Distance dérivée de vitesse × temps : robuste et indépendant de l'échelle du champ distance
    if (speedKmh > 0 && dtS > 0 && dtS < 10) {
      this.cb?.({ timestamp: Date.now(), distanceDeltaM: (speedKmh / 3.6) * dtS, speedKmh })
    }
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
