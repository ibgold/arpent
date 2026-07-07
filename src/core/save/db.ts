import Dexie, { type EntityTable } from 'dexie'
import type { GameState } from '../types'

interface SaveRow {
  id: number
  updatedAt: number
  state: GameState
}

// Base séparée de la v1 : les deux jeux coexistent sans se marcher sur les saves
export const db = new Dexie('arpenteur-v2') as Dexie & {
  saves: EntityTable<SaveRow, 'id'>
}

db.version(1).stores({
  saves: 'id',
})
