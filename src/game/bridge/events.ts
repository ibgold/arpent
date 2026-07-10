import Phaser from 'phaser'
import type { BoonDef } from '../../core/balance/boons'
import type { ContractDef } from '../../core/balance/contracts'
import type { RunSummary } from '../../core/types'

// Event bus React <-> Phaser. Jamais de couplage direct composant <-> scène.

export interface GameEventMap {
  'walk:speed': (kmh: number) => void
  'run:started': () => void
  'run:ended': (summary: RunSummary) => void
  'run:hp': (hp: number, maxHp: number) => void
  'run:room': (room: number, isBossRoom: boolean) => void
  'run:boss-hp': (hp: number, maxHp: number) => void
  'hub:request-run': () => void
  'loot:picked': (rarity: string, name: string) => void
  'run:boon-offer': (choices: BoonDef[]) => void
  /** XP de run (orbes) : progression vers la prochaine capacité */
  'run:xp': (xp: number, needed: number, level: number) => void
  'run:boon-chosen': (boonId: string) => void
  /** Rejouer l'offre de capacités contre de l'énergie */
  'run:boon-reroll': () => void
  'run:follower-rescued': (name: string, species: string) => void
  'walk:paused': (paused: boolean) => void
  'hub:building-tap': (buildingId: string) => void
  /** Le Hub propose les contrats maudits ; la coquille répond par embark */
  'hub:offer-contracts': (regionId: string, offers: ContractDef[]) => void
  'hub:embark': (
    regionId: string,
    acceptedContractIds: string[],
    potionId?: string,
    challenge?: boolean,
    mode?: 'boss-rush' | 'colosseum',
    overchargeSteps?: number,
  ) => void
}

class TypedEmitter extends Phaser.Events.EventEmitter {
  override emit<K extends keyof GameEventMap & string>(
    event: K,
    ...args: Parameters<GameEventMap[K]>
  ): boolean {
    return super.emit(event, ...args)
  }

  override on<K extends keyof GameEventMap & string>(event: K, fn: GameEventMap[K]): this {
    return super.on(event, fn)
  }

  override off<K extends keyof GameEventMap & string>(event: K, fn: GameEventMap[K]): this {
    return super.off(event, fn)
  }
}

export const gameEvents = new TypedEmitter()
