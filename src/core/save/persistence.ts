import { db } from './db'
import { initialGarden, SAVE_VERSION, initialGameState, snapshotState, useGameStore } from '../state/store'
import { rollInitialQuests } from '../balance/quests'
import type { GameState } from '../types'

// Autosave (débouncé) + chargement + migrations versionnées.

const SLOT_ID = 1
const AUTOSAVE_DEBOUNCE_MS = 1500

/** Migrations de save : chaque entrée transforme version N -> N+1 */
const migrations: Record<number, (s: GameState) => GameState> = {
  // v1 -> v2 : ajout du prestige et des collections de régions
  1: (s) => ({
    ...s,
    version: 2,
    prestige: s.prestige ?? { rank: 0, permanentBonus: 0 },
    collections: {
      bestiary: s.collections?.bestiary ?? [],
      regions: s.collections?.regions ?? [],
    },
  }),
  // v2 -> v3 : village (ressources, Éveillés, bâtiments) ; l'ancien "beacon" devient le Foyer
  2: (s) => ({
    ...s,
    version: 3,
    wood: s.wood ?? 0,
    stone: s.stone ?? 0,
    followers: s.followers ?? [],
    base: { hearth: { level: Math.max(1, (s.base as Record<string, { level: number }>)?.beacon?.level ?? 1) } },
    run: undefined, // le format de run a changé : on clôt proprement toute run en cours
  }),
  // v3 -> v4 : Coffres du Marcheur + commissions
  3: (s) => ({
    ...s,
    version: 4,
    wanderChests: s.wanderChests ?? { progressM: 0, stored: 0 },
    quests: s.quests ?? rollInitialQuests(),
  }),
  // v4 -> v5 / v5 -> v6 : concernaient l'ancien inventaire, supprimé en v9 — bumps purs
  4: (s) => ({ ...s, version: 5 }),
  5: (s) => ({ ...s, version: 6, run: undefined }),
  // v6 -> v7 : combat façon Archero (XP de run) — format de run étendu
  6: (s) => ({ ...s, version: 7, run: undefined }),
  // v7 -> v8 : Profondeurs + forge (niveau d'objet)
  7: (s) => ({
    ...s,
    version: 8,
    progression: { ...s.progression, depth: s.progression.depth ?? 1 },
    run: undefined,
  }),
  // v8 -> v9 : la Collection remplace l'inventaire — les anciens objets deviennent de l'Essence
  8: (s) => {
    const legacy = (s.equipment as unknown as { inventory?: { rarity?: string; level?: number }[] }).inventory ?? []
    const value: Record<string, number> = { common: 3, rare: 8, epic: 20, legendary: 50 }
    const essence = legacy.reduce((sum, i) => sum + (value[i.rarity ?? 'common'] ?? 3) + (i.level ?? 0) * 5, 0)
    return {
      ...s,
      version: 9,
      essence: (s.essence ?? 0) + essence,
      roadProgressM: s.roadProgressM ?? 0,
      equipment: { equipped: {}, owned: {} },
      run: undefined,
    }
  },
  // v9 -> v10 : quota de pas quotidien + nouveaux bâtiments (pas de changement de forme pour base)
  9: (s) => ({
    ...s,
    version: 10,
    dailySteps: s.dailySteps ?? { date: '', steps: 0, goal: 6000, rewarded: false },
  }),
  // v10 -> v11 : Balance Lab (overrides d'équilibrage persistés)
  10: (s) => ({ ...s, version: 11, balanceOverrides: s.balanceOverrides ?? {} }),
  // v11 -> v12 : le Jardin 🌱
  11: (s) => ({ ...s, version: 12, garden: s.garden ?? initialGarden() }),
  // v12 -> v13 (ARPENTEUR 2) : le Défi quotidien 🏅
  12: (s) => ({ ...s, version: 13, dailyChallenge: s.dailyChallenge ?? { lastWonDay: '' } }),
  // v13 -> v14 : perks de prestige (un choix par rang de Renaissance)
  13: (s) => ({ ...s, version: 14, prestige: { ...s.prestige, perks: s.prestige.perks ?? [] } }),
}

export function migrate(state: GameState): GameState {
  let s = state
  while (s.version < SAVE_VERSION) {
    const step = migrations[s.version]
    if (!step) break // pas de step : on garde l'ancienne version, la migration retentera plus tard
    s = step(s)
  }
  // Filet de sécurité : normalisation PROFONDE contre l'état initial.
  // Répare les champs imbriqués manquants même si une save a été mal estampillée.
  const base = initialGameState()
  // Heal : rename beacon -> hearth (v3), au cas où une save a sauté la migration
  const healedBase = s.base?.hearth
    ? s.base
    : { ...s.base, hearth: { level: Math.max(1, (s.base as Record<string, { level: number }> | undefined)?.beacon?.level ?? 1) } }
  delete (healedBase as Record<string, unknown>).beacon
  return {
    ...base,
    ...s,
    version: Math.min(s.version, SAVE_VERSION),
    base: healedBase,
    hero: { ...base.hero, ...s.hero },
    equipment: { ...base.equipment, ...s.equipment },
    progression: { ...base.progression, ...s.progression },
    collections: { ...base.collections, ...s.collections },
    dailyStreak: { ...base.dailyStreak, ...s.dailyStreak },
    dailySteps: { ...base.dailySteps, ...s.dailySteps },
    garden: { ...base.garden, ...s.garden },
    prestige: { ...base.prestige, ...s.prestige },
    settings: { ...base.settings, ...s.settings },
  }
}

export async function loadSave(): Promise<void> {
  try {
    const row = await db.saves.get(SLOT_ID)
    if (row?.state) {
      useGameStore.getState().hydrate(migrate(row.state))
    }
  } catch (err) {
    console.error('[save] load failed', err)
  }
}

export async function saveNow(): Promise<void> {
  const state = snapshotState(useGameStore.getState())
  await db.saves.put({ id: SLOT_ID, updatedAt: Date.now(), state })
}

let timer: ReturnType<typeof setTimeout> | undefined

export function startAutosave(): () => void {
  const unsubscribe = useGameStore.subscribe(() => {
    clearTimeout(timer)
    timer = setTimeout(() => void saveNow().catch((e) => console.error('[save] autosave failed', e)), AUTOSAVE_DEBOUNCE_MS)
  })
  const onHide = () => void saveNow()
  document.addEventListener('visibilitychange', onHide)
  window.addEventListener('beforeunload', onHide)
  return () => {
    unsubscribe()
    clearTimeout(timer)
    document.removeEventListener('visibilitychange', onHide)
    window.removeEventListener('beforeunload', onHide)
  }
}

export function exportSaveJson(): string {
  return JSON.stringify(snapshotState(useGameStore.getState()), null, 2)
}

export async function importSaveJson(json: string): Promise<void> {
  const parsed = JSON.parse(json) as GameState
  if (typeof parsed.version !== 'number') throw new Error('Invalid save file')
  useGameStore.getState().hydrate(migrate(parsed))
  await saveNow()
}

export async function resetSave(): Promise<void> {
  useGameStore.getState().resetAll()
  await saveNow()
}
