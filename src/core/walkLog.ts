import { db, type WalkDayRow, type WalkEntryRow } from './save/db'
import { BALANCE } from './balance/constants'
import { dayKey } from './dayKey'

// Le journal de marche 📖 : la trace de TA marche réelle. Une ligne par jour ET PAR APPAREIL —
// chaque appareil n'écrit que les siennes, la sync (Gist GitHub) fusionne donc sans conflit.
// Totalement indépendant de la save du jeu : reset/import du jeu → journal intact.
// L'UI consomme des agrégats par jour (tous appareils confondus).

const todayKey = dayKey

/** Identifiant stable de CET appareil (généré une fois, stocké en localStorage) */
export function deviceId(): string {
  let id = localStorage.getItem('arpenteur-device-id')
  if (!id) {
    const kind = /mobile|android|iphone/i.test(navigator.userAgent) ? 'phone' : 'pc'
    id = `${kind}-${Math.random().toString(36).slice(2, 6)}`
    localStorage.setItem('arpenteur-device-id', id)
  }
  return id
}

export interface WalkTotals {
  meters: number
  steps: number
  minutes: number
  days: number
  bestDayMeters: number
}

function aggregate(entries: WalkEntryRow[]): WalkDayRow[] {
  const byDay = new Map<string, WalkDayRow>()
  for (const e of entries) {
    if (e.deleted) continue
    const d = byDay.get(e.day) ?? { day: e.day, meters: 0, steps: 0, minutes: 0 }
    d.meters += e.meters
    d.steps += e.steps
    d.minutes += e.minutes
    byDay.set(e.day, d)
  }
  return [...byDay.values()].sort((a, b) => (a.day < b.day ? 1 : -1))
}

class WalkLog {
  private today: WalkEntryRow | undefined
  private dirty = false

  async init(): Promise<void> {
    const device = deviceId() // AVANT tout accès db : la migration v3 lit ce localStorage
    const day = todayKey()
    const id = `${day}|${device}`
    try {
      // Auto-réparation : les lignes de CET appareil datées après le jour logique courant
      // (artefact d'avant la règle des 3 h) sont fusionnées dans le jour courant
      const future = await db.walkEntries.where('day').above(day).filter((e) => e.device === device && !e.deleted).toArray()
      if (future.length > 0) {
        const base = (await db.walkEntries.get(id)) ?? { id, day, device, meters: 0, steps: 0, minutes: 0, updatedAt: Date.now() }
        for (const f of future) {
          base.meters += f.meters
          base.steps += f.steps
          base.minutes += f.minutes
          await db.walkEntries.put({ ...f, meters: 0, steps: 0, minutes: 0, deleted: true, updatedAt: Date.now() })
        }
        base.updatedAt = Date.now()
        await db.walkEntries.put(base)
      }
      const existing = await db.walkEntries.get(id)
      this.today = existing && !existing.deleted ? existing : { id, day, device, meters: 0, steps: 0, minutes: 0, updatedAt: Date.now() }
    } catch {
      this.today = { id, day, device, meters: 0, steps: 0, minutes: 0, updatedAt: Date.now() }
    }
    setInterval(() => void this.flush(), 5000)
    document.addEventListener('visibilitychange', () => void this.flush())
    window.addEventListener('beforeunload', () => void this.flush())
  }

  /** Appelé à chaque échantillon de marche (source réelle ou non) */
  record(distanceDeltaM: number, speedKmh: number, dtS: number): void {
    const day = todayKey()
    const device = deviceId()
    if (!this.today || this.today.day !== day) {
      void this.flush()
      this.today = { id: `${day}|${device}`, day, device, meters: 0, steps: 0, minutes: 0, updatedAt: Date.now() }
    }
    const strideM = Math.min(0.85, Math.max(0.4, BALANCE.strideBaseM + BALANCE.stridePerKmh * speedKmh))
    this.today.meters += distanceDeltaM
    this.today.steps += distanceDeltaM / strideM
    this.today.minutes += dtS / 60
    this.today.deleted = undefined
    this.dirty = true
  }

  private async flush(): Promise<void> {
    if (!this.dirty || !this.today) return
    this.dirty = false
    this.today.updatedAt = Date.now()
    try { await db.walkEntries.put({ ...this.today }) } catch { this.dirty = true }
  }

  /** Les N derniers jours (agrégés tous appareils), du plus récent au plus ancien */
  async getRecent(n = 30): Promise<WalkDayRow[]> {
    await this.flush()
    const all = await db.walkEntries.toArray()
    return aggregate(all).slice(0, n)
  }

  async getTotals(): Promise<WalkTotals> {
    await this.flush()
    const days = aggregate(await db.walkEntries.toArray())
    return days.reduce<WalkTotals>(
      (t, r) => ({
        meters: t.meters + r.meters,
        steps: t.steps + r.steps,
        minutes: t.minutes + r.minutes,
        days: t.days + (r.meters > 0 ? 1 : 0),
        bestDayMeters: Math.max(t.bestDayMeters, r.meters),
      }),
      { meters: 0, steps: 0, minutes: 0, days: 0, bestDayMeters: 0 },
    )
  }

  /** Édition manuelle d'un jour : la valeur saisie devient LA vérité du jour
   *  (portée par la ligne de cet appareil ; les lignes des autres appareils passent en tombstone) */
  async updateDay(day: string, patch: Partial<Omit<WalkDayRow, 'day'>>): Promise<void> {
    await this.flush()
    const device = deviceId()
    const id = `${day}|${device}`
    const rows = await db.walkEntries.where('day').equals(day).toArray()
    const current = aggregate(rows)[0] ?? { day, meters: 0, steps: 0, minutes: 0 }
    const next: WalkEntryRow = {
      id, day, device,
      meters: patch.meters ?? current.meters,
      steps: patch.steps ?? current.steps,
      minutes: patch.minutes ?? current.minutes,
      updatedAt: Date.now(),
    }
    for (const r of rows) {
      if (r.id !== id) await db.walkEntries.put({ ...r, meters: 0, steps: 0, minutes: 0, deleted: true, updatedAt: Date.now() })
    }
    await db.walkEntries.put(next)
    if (this.today?.day === day) this.today = next
  }

  async deleteDay(day: string): Promise<void> {
    await this.flush()
    const rows = await db.walkEntries.where('day').equals(day).toArray()
    for (const r of rows) {
      await db.walkEntries.put({ ...r, meters: 0, steps: 0, minutes: 0, deleted: true, updatedAt: Date.now() })
    }
    const device = deviceId()
    if (this.today?.day === day) {
      this.today = { id: `${day}|${device}`, day, device, meters: 0, steps: 0, minutes: 0, deleted: true, updatedAt: Date.now() }
    }
  }

  /** Reset du JOURNAL uniquement — tombstone tout (la suppression se propage à la sync) */
  async resetAll(): Promise<void> {
    const rows = await db.walkEntries.toArray()
    for (const r of rows) {
      await db.walkEntries.put({ ...r, meters: 0, steps: 0, minutes: 0, deleted: true, updatedAt: Date.now() })
    }
    const device = deviceId()
    const day = todayKey()
    this.today = { id: `${day}|${device}`, day, device, meters: 0, steps: 0, minutes: 0, deleted: true, updatedAt: Date.now() }
    this.dirty = false
  }

  // --- Sync : le moteur de fusion (utilisé par gistSync) ---

  /** Toutes les lignes brutes (tombstones inclus) pour l'envoi */
  async exportEntries(): Promise<WalkEntryRow[]> {
    await this.flush()
    return db.walkEntries.toArray()
  }

  /** Fusionne des lignes distantes : par id, la plus récemment modifiée gagne */
  async mergeEntries(remote: WalkEntryRow[]): Promise<number> {
    await this.flush()
    let changed = 0
    for (const r of remote) {
      if (!r?.id || typeof r.updatedAt !== 'number') continue
      const local = await db.walkEntries.get(r.id)
      if (!local || r.updatedAt > local.updatedAt) {
        await db.walkEntries.put(r)
        changed += 1
      }
    }
    // Recharge la ligne du jour de cet appareil si la fusion l'a touchée
    const id = `${todayKey()}|${deviceId()}`
    const mine = await db.walkEntries.get(id)
    if (mine && this.today && mine.updatedAt > this.today.updatedAt) this.today = mine
    return changed
  }
}

export const walkLog = new WalkLog()
