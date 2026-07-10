import { BALANCE } from './balance/constants'

// LA définition du « jour » dans tout le jeu : une journée bascule à 3 h du matin
// (réglable : dayRolloverHour). Marcher à 1 h du matin compte pour la veille —
// pensé pour les horaires décalés. Utilisé par : journal de marche, pas quotidiens,
// streak, jardin, humeurs des Éveillés, défi quotidien.

function fmt(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Clé de jour (YYYY-MM-DD, heure LOCALE) avec bascule à dayRolloverHour */
export function dayKey(at: Date = new Date()): string {
  return fmt(new Date(at.getTime() - BALANCE.dayRolloverHour * 3_600_000))
}

/** La clé du jour d'avant (même règle de bascule) */
export function yesterdayKey(): string {
  return fmt(new Date(Date.now() - BALANCE.dayRolloverHour * 3_600_000 - 86_400_000))
}
