import { db, type WalkDayRow } from './save/db'
import { BALANCE } from './balance/constants'
import { dayKey } from './dayKey'

// Le journal de marche 📖 : la trace de TA marche réelle, un jour = une ligne.
// Totalement indépendant de la save du jeu : reset/import du jeu → journal intact.
// Il a son propre reset et son édition (Walk → Journal), rien d'autre n'y touche.

// La clé de jour vient de core/dayKey.ts : bascule à 3 h du matin (marche nocturne = la veille)
const todayKey = dayKey

export interface WalkTotals {
  meters: number
  steps: number
  minutes: number
  days: number
  bestDayMeters: number
}

class WalkLog {
  private today: WalkDayRow | undefined
  private dirty = false

  async init(): Promise<void> {
    const day = todayKey()
    try {
      // Auto-réparation : une ligne datée APRÈS le jour logique courant est un artefact
      // (ex. marche post-minuit enregistrée avant la règle des 3 h) → fusionnée dans le jour courant
      const future = await db.walkLog.where('day').above(day).toArray()
      if (future.length > 0) {
        const base = (await db.walkLog.get(day)) ?? { day, meters: 0, steps: 0, minutes: 0 }
        for (const f of future) {
          base.meters += f.meters
          base.steps += f.steps
          base.minutes += f.minutes
          await db.walkLog.delete(f.day)
        }
        await db.walkLog.put(base)
      }
      this.today = (await db.walkLog.get(day)) ?? { day, meters: 0, steps: 0, minutes: 0 }
    } catch {
      this.today = { day, meters: 0, steps: 0, minutes: 0 }
    }
    setInterval(() => void this.flush(), 5000)
    document.addEventListener('visibilitychange', () => void this.flush())
    window.addEventListener('beforeunload', () => void this.flush())
  }

  /** Appelé à chaque échantillon de marche (source réelle ou non) */
  record(distanceDeltaM: number, speedKmh: number, dtS: number): void {
    const day = todayKey()
    if (!this.today || this.today.day !== day) {
      void this.flush()
      this.today = { day, meters: 0, steps: 0, minutes: 0 }
    }
    const strideM = Math.min(0.85, Math.max(0.4, BALANCE.strideBaseM + BALANCE.stridePerKmh * speedKmh))
    this.today.meters += distanceDeltaM
    this.today.steps += distanceDeltaM / strideM
    this.today.minutes += dtS / 60
    this.dirty = true
  }

  private async flush(): Promise<void> {
    if (!this.dirty || !this.today) return
    this.dirty = false
    try { await db.walkLog.put({ ...this.today }) } catch { this.dirty = true }
  }

  /** Les N derniers jours enregistrés, du plus récent au plus ancien */
  async getRecent(n = 30): Promise<WalkDayRow[]> {
    await this.flush()
    return db.walkLog.orderBy('day').reverse().limit(n).toArray()
  }

  async getTotals(): Promise<WalkTotals> {
    await this.flush()
    const all = await db.walkLog.toArray()
    return all.reduce<WalkTotals>(
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

  /** Édition manuelle d'un jour (corriger une valeur fausse, ajouter une marche hors app) */
  async updateDay(day: string, patch: Partial<Omit<WalkDayRow, 'day'>>): Promise<void> {
    const row = (await db.walkLog.get(day)) ?? { day, meters: 0, steps: 0, minutes: 0 }
    const next = { ...row, ...patch }
    await db.walkLog.put(next)
    if (this.today?.day === day) this.today = next
  }

  async deleteDay(day: string): Promise<void> {
    await db.walkLog.delete(day)
    if (this.today?.day === day) this.today = { day, meters: 0, steps: 0, minutes: 0 }
  }

  /** Reset du JOURNAL uniquement — jamais déclenché par le reset du jeu */
  async resetAll(): Promise<void> {
    await db.walkLog.clear()
    this.today = { day: todayKey(), meters: 0, steps: 0, minutes: 0 }
    this.dirty = false
  }
}

export const walkLog = new WalkLog()
