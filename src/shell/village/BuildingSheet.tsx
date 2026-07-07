import { useEffect, useState } from 'react'
import {
  buildingCost,
  buildingSlots,
  followerCapacity,
  getBuilding,
  hearthMultiplier,
  type ResourceKind,
} from '../../core/balance/buildings'
import { GIFT_THRESHOLD_M, moodOf, SPECIES_ICONS, type Species } from '../../core/balance/followers'
import { prestigeFollowerBonus } from '../../core/balance/prestigePerks'
import { useGameStore } from '../../core/state/store'
import { gameEvents } from '../../game/bridge/events'

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Fiche contextuelle d'un bâtiment : s'ouvre en tapant le bâtiment dans la scène village. */
export function BuildingSheet() {
  const [openId, setOpenId] = useState<string | null>(null)
  const state = useGameStore()

  useEffect(() => {
    const onTap = (id: string) => setOpenId(id)
    const onRunStarted = () => setOpenId(null)
    gameEvents.on('hub:building-tap', onTap)
    gameEvents.on('run:started', onRunStarted)
    return () => {
      gameEvents.off('hub:building-tap', onTap)
      gameEvents.off('run:started', onRunStarted)
    }
  }, [])

  const def = openId ? getBuilding(openId) : undefined
  if (!openId || !def) return null

  const level = state.base[openId]?.level ?? 0
  const cost = buildingCost(def, level)
  const maxed = level >= def.maxLevel
  const affordable =
    (cost.gold ?? 0) <= state.gold && (cost.wood ?? 0) <= state.wood && (cost.stone ?? 0) <= state.stone
  const workers = state.followers.filter((f) => f.assignedTo === openId)
  const resting = state.followers.filter((f) => !f.assignedTo)
  const slots = buildingSlots(level)
  const hearthLevel = state.base.hearth?.level ?? 1

  return (
    <div className="absolute inset-x-0 bottom-0 z-30 font-mono" onClick={(e) => e.stopPropagation()}>
      <div className="mx-auto max-w-lg rounded-t-2xl border border-b-0 border-slate-700 bg-slate-900/95 p-4 shadow-2xl backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{def.icon}</span>
          <div className="flex-1">
            <div className="font-bold text-slate-100">
              {def.name} {level > 0 && <span className="text-slate-500">Lv {level}</span>}
            </div>
            <div className="text-[11px] text-slate-500">{def.description}</div>
          </div>
          <button onClick={() => setOpenId(null)} className="rounded-lg bg-slate-800 px-3 py-2 text-slate-400">
            ✕
          </button>
        </div>

        {/* Spécial Foyer : capacité + bonus global + humeurs & cadeaux des Éveillés */}
        {openId === 'hearth' && level > 0 && (
          <>
            <div className="mt-3 flex gap-3 text-xs">
              <span className="rounded bg-slate-950 px-2 py-1 text-violet-300">
                👥 {state.followers.length}/{followerCapacity(state.base) + prestigeFollowerBonus(state)} villagers
              </span>
              <span className="rounded bg-slate-950 px-2 py-1 text-amber-300">
                ×{hearthMultiplier(hearthLevel).toFixed(1)} village output
              </span>
            </div>
            {state.followers.length > 0 && (
              <div className="mt-3">
                <div className="mb-1.5 text-[11px] uppercase text-slate-500">
                  Moods & gifts — walking fills their hearts ({(GIFT_THRESHOLD_M / 1000).toFixed(0)} km → a gift)
                </div>
                <div className="flex max-h-40 flex-col gap-1 overflow-y-auto">
                  {state.followers.map((f) => {
                    const mood = moodOf(f.id, todayKey())
                    const pct = Math.min(100, ((f.moraleM ?? 0) / GIFT_THRESHOLD_M) * 100)
                    return (
                      <div key={f.id} className="flex items-center gap-2 rounded bg-slate-950 px-2 py-1.5 text-xs">
                        <span title={mood.label}>{SPECIES_ICONS[f.species as Species] ?? '✨'}{mood.icon}</span>
                        <span className="w-16 truncate text-slate-300">{f.name}</span>
                        <span className="text-[10px] text-slate-600">{mood.label}</span>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
                          <div className="h-full bg-pink-500" style={{ width: `${pct}%` }} />
                        </div>
                        {f.giftReady && <GiftButton followerId={f.id} />}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* Postes de travail */}
        {def.produces && level > 0 && (
          <div className="mt-3">
            <div className="mb-1.5 text-[11px] uppercase text-slate-500">
              Workers {workers.length}/{slots} · +
              {(def.ratePerFollower * level * hearthMultiplier(hearthLevel) * workers.length).toFixed(2)} {def.produces}/s
              while walking
            </div>
            <div className="flex flex-wrap gap-1.5">
              {workers.map((f) => (
                <button
                  key={f.id}
                  onClick={() => useGameStore.getState().assignFollower(f.id, undefined)}
                  title="Tap to unassign"
                  className="flex items-center gap-1 rounded-lg border border-emerald-700 bg-emerald-950/50 px-2 py-1.5 text-xs text-emerald-200"
                >
                  {SPECIES_ICONS[f.species as Species] ?? '✨'} {f.name} ✕
                </button>
              ))}
              {workers.length < slots &&
                resting.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => useGameStore.getState().assignFollower(f.id, openId)}
                    title="Tap to assign"
                    className="flex items-center gap-1 rounded-lg border border-dashed border-slate-600 px-2 py-1.5 text-xs text-slate-400"
                  >
                    + {SPECIES_ICONS[f.species as Species] ?? '✨'} {f.name}
                  </button>
                ))}
              {workers.length < slots && resting.length === 0 && (
                <span className="px-1 py-1.5 text-[11px] text-slate-600">
                  No one available — rescue villagers from cages during expeditions
                </span>
              )}
            </div>
          </div>
        )}

        {/* Construction / amélioration */}
        {!maxed ? (
          <button
            onClick={() => useGameStore.getState().buildOrUpgrade(openId)}
            disabled={!affordable}
            className="mt-3 flex w-full items-center justify-center gap-3 rounded-lg bg-emerald-600 py-2.5 text-sm font-bold text-white disabled:bg-slate-800 disabled:text-slate-600"
          >
            {level === 0 ? 'Build' : `Upgrade to Lv ${level + 1}`}
            <span className="flex gap-2 text-xs font-normal">
              {(Object.entries(cost) as [ResourceKind, number][]).map(([k, v]) => (
                <span key={k} className={resourceOk(k, v, state) ? '' : 'text-rose-300'}>
                  {k === 'gold' ? `${v}g` : k === 'wood' ? `🪵${v}` : `🪨${v}`}
                </span>
              ))}
            </span>
          </button>
        ) : (
          <div className="mt-3 rounded-lg bg-slate-950 py-2 text-center text-xs font-bold text-amber-400">
            MAX LEVEL
          </div>
        )}
      </div>
    </div>
  )
}

function GiftButton({ followerId }: { followerId: string }) {
  const claim = useGameStore((s) => s.claimFollowerGift)
  const [label, setLabel] = useState<string | null>(null)
  if (label) return <span className="text-[10px] font-bold text-pink-300">{label}</span>
  return (
    <button
      onClick={() => { const r = claim(followerId); if (r) setLabel(r.label) }}
      className="animate-pulse rounded bg-pink-600 px-2 py-0.5 text-[10px] font-bold text-white"
    >
      🎀 Gift!
    </button>
  )
}

function resourceOk(kind: ResourceKind, amount: number, s: { gold: number; wood: number; stone: number }): boolean {
  return s[kind] >= amount
}
