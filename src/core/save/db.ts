import Dexie, { type EntityTable } from 'dexie'
import type { GameState } from '../types'

interface SaveRow {
  id: number
  updatedAt: number
  state: GameState
}

/** Journal de marche : une ligne par jour ET par appareil (PC/téléphone écrivent chacun la leur,
 *  la sync fusionne sans conflit). Table SÉPARÉE de la save du jeu — reset/import du jeu ne la
 *  touche jamais. L'affichage agrège les appareils par jour. */
export interface WalkEntryRow {
  /** `${day}|${deviceId}` — chaque appareil n'écrit QUE ses propres lignes */
  id: string
  day: string // YYYY-MM-DD
  device: string
  meters: number
  steps: number
  minutes: number
  /** Horodatage de dernière écriture (fusion : le plus récent gagne) */
  updatedAt: number
  /** Tombstone : la ligne a été supprimée (la suppression se propage à la sync) */
  deleted?: boolean
}

/** Vue agrégée par jour (ce que l'UI consomme) */
export interface WalkDayRow {
  day: string
  meters: number
  steps: number
  minutes: number
}

// Base séparée de la v1 : les deux jeux coexistent sans se marcher sur les saves
export const db = new Dexie('arpenteur-v2') as Dexie & {
  saves: EntityTable<SaveRow, 'id'>
  walkEntries: EntityTable<WalkEntryRow, 'id'>
}

db.version(1).stores({
  saves: 'id',
})
db.version(2).stores({
  saves: 'id',
  walkLog: 'day',
})
db.version(3)
  .stores({
    saves: 'id',
    walkLog: 'day',
    walkEntries: 'id, day',
  })
  .upgrade(async (tx) => {
    // Migration : les anciennes lignes (clé = jour) deviennent des lignes de CET appareil
    const old = await tx.table('walkLog').toArray()
    if (old.length === 0) return
    const device = localStorage.getItem('arpenteur-device-id') ?? 'legacy'
    await tx.table('walkEntries').bulkPut(
      old.map((r: { day: string; meters: number; steps: number; minutes: number }) => ({
        id: `${r.day}|${device}`,
        day: r.day,
        device,
        meters: r.meters,
        steps: r.steps,
        minutes: r.minutes,
        updatedAt: Date.now(),
      })),
    )
  })
// L'ancienne table ne peut être supprimée que dans une version ULTÉRIEURE à sa migration (règle Dexie)
db.version(4).stores({
  saves: 'id',
  walkLog: null,
  walkEntries: 'id, day',
})
