import Dexie, { type EntityTable } from 'dexie'
import type { GameState } from '../types'

interface SaveRow {
  id: number
  updatedAt: number
  state: GameState
}

/** Journal de marche : UNE ligne par jour. Table SÉPARÉE de la save du jeu —
 *  reset/import du jeu ne la touche jamais (la marche réelle est acquise). */
export interface WalkDayRow {
  day: string // YYYY-MM-DD
  meters: number
  steps: number
  minutes: number
}

// Base séparée de la v1 : les deux jeux coexistent sans se marcher sur les saves
export const db = new Dexie('arpenteur-v2') as Dexie & {
  saves: EntityTable<SaveRow, 'id'>
  walkLog: EntityTable<WalkDayRow, 'day'>
}

db.version(1).stores({
  saves: 'id',
})
db.version(2).stores({
  saves: 'id',
  walkLog: 'day',
})
