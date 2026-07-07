import { useState } from 'react'
import {
  GARDEN_MODES,
  POTIONS,
  SEEDS,
  seedDef,
  streakMult,
  TREE_MAX_STAGE,
  type SeedDef,
} from '../../core/balance/garden'
import { useGameStore } from '../../core/state/store'
import type { PlotState, TreeState } from '../../core/types'

// Le Jardin 🌱 : le pilier contemplation. Fond jour/nuit selon l'heure réelle,
// 9 parcelles + 3 arbres, zéro HUD agressif, zéro énergie dépensée.

const TIER_COLOR: Record<string, string> = {
  common: 'text-slate-300',
  rare: 'text-sky-300',
  ultra: 'text-amber-300',
}

/** Teinte du ciel selon l'heure locale : aube, jour, crépuscule, nuit */
function skyGradient(): string {
  const h = new Date().getHours()
  if (h >= 6 && h < 9) return 'linear-gradient(180deg, #2a2a4a 0%, #7a4a5a 60%, #1a2e1a 100%)'
  if (h >= 9 && h < 18) return 'linear-gradient(180deg, #1e3a5f 0%, #2d5a4a 60%, #1a2e1a 100%)'
  if (h >= 18 && h < 21) return 'linear-gradient(180deg, #2a1a3e 0%, #6a3a4a 60%, #14261a 100%)'
  return 'linear-gradient(180deg, #0a0a1e 0%, #14142e 60%, #0e1c12 100%)'
}

function plantStage(plot: PlotState, def: SeedDef): { icon: string; label: string } {
  if (plot.wilted) return { icon: '🥀', label: 'wilted (½ yield) — harvest or walk!' }
  if (plot.matureDay) return { icon: def.icon, label: 'ready to harvest!' }
  const pct = plot.grownM / def.needM
  if (pct < 0.33) return { icon: '🌱', label: `sprouting` }
  if (pct < 0.75) return { icon: '🌿', label: `growing` }
  return { icon: '🌾', label: `almost there` }
}

export function GardenView() {
  const garden = useGameStore((s) => s.garden)
  const streak = useGameStore((s) => s.dailyStreak)
  const mode = useGameStore((s) => s.settings.gardenMode)
  const followers = useGameStore((s) => s.followers.length)
  const [selected, setSelected] = useState<{ kind: 'plot' | 'tree'; idx: number } | null>(null)
  const [toast, setToast] = useState('')

  const today = new Date().toISOString().slice(0, 10)
  const fed = !!garden.fedUntilDay && garden.fedUntilDay >= today
  const mult = streakMult(streak.days)
  const bloomCount = Object.values(garden.blooms).reduce((a, b) => a + b, 0)

  const say = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }

  return (
    <div className="h-full overflow-y-auto p-4 font-mono" style={{ background: skyGradient() }}>
      <div className="mx-auto flex max-w-lg flex-col gap-4 pb-8">
        <div className="text-center">
          <h2 className="text-xl font-bold text-emerald-200">🌱 The Garden</h2>
          <p className="text-xs text-emerald-100/50">Every step you take feeds what grows here.</p>
          <div className="mt-2 flex justify-center gap-3 text-[11px]">
            <span className="rounded bg-black/30 px-2 py-1 text-emerald-300">
              🔥 streak ×{mult.toFixed(2)}
            </span>
            <span className="rounded bg-black/30 px-2 py-1 text-slate-300">
              {mode === 'chill' ? '🍃 Chill' : '🔥 Intense (+25% yield)'}
            </span>
            {garden.compost > 0 && <span className="rounded bg-black/30 px-2 py-1 text-amber-200">🪱 {garden.compost} compost</span>}
            {bloomCount > 0 && <span className="rounded bg-black/30 px-2 py-1 text-pink-300">🌸 {bloomCount}</span>}
          </div>
        </div>

        {/* Les arbres : le patrimoine */}
        <div className="grid grid-cols-3 gap-2">
          {garden.trees.map((tree, idx) => (
            <TreeCard
              key={idx}
              tree={tree}
              selected={selected?.kind === 'tree' && selected.idx === idx}
              onTap={() => setSelected(selected?.kind === 'tree' && selected.idx === idx ? null : { kind: 'tree', idx })}
            />
          ))}
        </div>

        {/* Le potager : 9 parcelles */}
        <div className="grid grid-cols-3 gap-2">
          {garden.plots.map((plot, idx) => (
            <PlotCard
              key={idx}
              plot={plot}
              selected={selected?.kind === 'plot' && selected.idx === idx}
              onTap={() => setSelected(selected?.kind === 'plot' && selected.idx === idx ? null : { kind: 'plot', idx })}
            />
          ))}
        </div>

        {/* Fiche contextuelle */}
        {selected && (
          <SelectionSheet
            selection={selected}
            onDone={(msg) => {
              if (msg) say(msg)
              setSelected(null)
            }}
          />
        )}

        {toast && (
          <div className="rounded-lg bg-emerald-950/80 py-2 text-center text-sm font-bold text-emerald-200">{toast}</div>
        )}

        {/* Le garde-manger du village */}
        <div className="rounded-xl bg-black/30 p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-200">🍲 Food: <b>{Math.floor(garden.food)}</b></span>
            {fed ? (
              <span className="font-bold text-emerald-300">Village fed — cheer doubled! (until {garden.fedUntilDay})</span>
            ) : (
              <button
                onClick={() => {
                  const ok = useGameStore.getState().feedVillage()
                  say(ok ? '🍲 The village feasts! Cheer doubled for 2 days.' : `Not enough food (need ${Math.max(1, followers)})`)
                }}
                className="rounded-lg bg-emerald-700 px-3 py-1.5 font-bold text-white"
              >
                Feed the village ({Math.max(1, followers)} 🍲)
              </button>
            )}
          </div>
        </div>

        {/* Potions récoltées */}
        <div className="rounded-xl bg-black/30 p-3 text-xs">
          <div className="mb-1 font-bold text-slate-300">🧪 Potions (pick one when starting a run)</div>
          <div className="flex flex-wrap gap-1.5">
            {POTIONS.map((p) => (
              <span key={p.id} className={`rounded px-2 py-1 ${(garden.potions[p.id] ?? 0) > 0 ? 'bg-emerald-950 text-emerald-200' : 'bg-black/30 text-slate-600'}`} title={p.description}>
                {p.icon} ×{garden.potions[p.id] ?? 0}
              </span>
            ))}
          </div>
        </div>

        {/* Sac de graines */}
        <div className="rounded-xl bg-black/30 p-3 text-xs">
          <div className="mb-1 font-bold text-slate-300">🎒 Seeds — rare ones drop in the dungeon</div>
          <div className="flex flex-wrap gap-1.5">
            {SEEDS.filter((sd) => (garden.seeds[sd.id] ?? 0) > 0).map((sd) => (
              <span key={sd.id} className={`rounded bg-black/30 px-2 py-1 ${TIER_COLOR[sd.tier]}`}>
                {sd.icon} {sd.name} ×{garden.seeds[sd.id]}
              </span>
            ))}
            {SEEDS.every((sd) => (garden.seeds[sd.id] ?? 0) === 0) && <span className="text-slate-600">empty — harvest or raid the dungeon</span>}
          </div>
        </div>
      </div>
    </div>
  )
}

function PlotCard({ plot, selected, onTap }: { plot: PlotState | null; selected: boolean; onTap: () => void }) {
  const def = plot ? seedDef(plot.seedId) : undefined
  const stage = plot && def ? plantStage(plot, def) : null
  const pct = plot && def ? Math.min(100, (plot.grownM / def.needM) * 100) : 0
  return (
    <button
      onClick={onTap}
      className={`flex h-24 flex-col items-center justify-center rounded-xl border-2 transition-colors ${
        selected ? 'border-emerald-400 bg-emerald-950/60' : plot?.matureDay && !plot.wilted ? 'border-amber-500/60 bg-black/30' : 'border-amber-950/60 bg-black/20'
      }`}
    >
      {plot && def && stage ? (
        <>
          <span className="text-2xl">{stage.icon}</span>
          <span className={`mt-0.5 text-[10px] ${plot.wilted ? 'text-rose-300' : plot.matureDay ? 'font-bold text-amber-300' : 'text-slate-400'}`}>
            {plot.matureDay ? (plot.wilted ? 'wilted' : 'ripe!') : `${Math.floor(pct)}%`}
          </span>
          {!plot.matureDay && (
            <div className="mt-1 h-1 w-12 overflow-hidden rounded bg-black/40">
              <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
            </div>
          )}
        </>
      ) : (
        <span className="text-xl text-amber-900/80">🟫</span>
      )}
    </button>
  )
}

function TreeCard({ tree, selected, onTap }: { tree: TreeState | null; selected: boolean; onTap: () => void }) {
  const def = tree ? seedDef(tree.seedId) : undefined
  const req = def?.daysPerStage ?? 3
  return (
    <button
      onClick={onTap}
      className={`flex h-28 flex-col items-center justify-center rounded-xl border-2 ${
        selected ? 'border-emerald-400 bg-emerald-950/60' : 'border-emerald-950/70 bg-black/20'
      }`}
    >
      {tree && def ? (
        <>
          <span style={{ fontSize: `${18 + tree.stage * 5}px` }}>{tree.stage === 0 ? '🌱' : '🌳'}</span>
          <span className="text-[10px] font-bold text-emerald-200">{def.name}</span>
          <span className="text-[10px] text-slate-400">
            {tree.stage >= TREE_MAX_STAGE ? '★ fully grown' : `stage ${tree.stage} · ${tree.daysThisStage.length}/${req} days`}
          </span>
        </>
      ) : (
        <span className="text-xl text-emerald-900">🕳️</span>
      )}
    </button>
  )
}

function SelectionSheet({ selection, onDone }: { selection: { kind: 'plot' | 'tree'; idx: number }; onDone: (msg?: string) => void }) {
  const garden = useGameStore((s) => s.garden)
  const mode = useGameStore((s) => s.settings.gardenMode)
  const modeParams = GARDEN_MODES[mode]

  if (selection.kind === 'plot') {
    const plot = garden.plots[selection.idx]
    if (plot) {
      const def = seedDef(plot.seedId)
      return (
        <div className="rounded-xl bg-black/50 p-3 text-xs">
          <div className="font-bold text-slate-100">{def?.icon} {def?.name}</div>
          <div className="mt-0.5 italic text-slate-500">“{def?.flavor}”</div>
          <div className="mt-2 flex gap-2">
            {plot.matureDay && (
              <button
                onClick={() => onDone(useGameStore.getState().harvestPlot(selection.idx)?.label ?? '')}
                className="flex-1 rounded-lg bg-amber-600 py-2 font-bold text-white"
              >
                🧺 Harvest{plot.wilted ? ' (½)' : ''}
              </button>
            )}
            <button
              onClick={() => { useGameStore.getState().uprootPlot(selection.idx); onDone('🪱 +1 compost') }}
              className="rounded-lg bg-slate-800 px-3 py-2 text-slate-400"
            >
              Uproot
            </button>
          </div>
          {!plot.matureDay && def && (
            <p className="mt-2 text-slate-500">{Math.ceil(def.needM - plot.grownM)} m of walking to go.</p>
          )}
        </div>
      )
    }
    // Parcelle vide : planter
    const plantable = SEEDS.filter((sd) => sd.kind !== 'tree' && (garden.seeds[sd.id] ?? 0) > 0)
    return (
      <div className="rounded-xl bg-black/50 p-3 text-xs">
        <div className="mb-1.5 font-bold text-slate-200">
          Plant a seed {garden.compost > 0 && <span className="text-amber-300">(compost ready: −15% growth needed)</span>}
        </div>
        {plantable.length === 0 && <p className="text-slate-500">No seeds. Harvest commons or raid the dungeon for rare ones.</p>}
        <div className="flex flex-col gap-1">
          {plantable.map((sd) => (
            <button
              key={sd.id}
              onClick={() => { useGameStore.getState().plantSeed(selection.idx, sd.id); onDone(`${sd.icon} planted!`) }}
              className="flex items-center justify-between rounded-lg bg-black/40 px-2 py-1.5 text-left"
            >
              <span className={TIER_COLOR[sd.tier]}>{sd.icon} {sd.name} ×{garden.seeds[sd.id]}</span>
              <span className="text-slate-500">{sd.needM} m{sd.potion ? ` · ${sd.potion} potion` : ''}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-slate-600">
          Mode {mode}: wilts after {modeParams.wiltAfterDays} idle days{modeParams.compostAfterDays !== null ? `, composts ${modeParams.compostAfterDays} days later` : ', never composts'}.
        </p>
      </div>
    )
  }

  // Arbre
  const tree = garden.trees[selection.idx]
  if (tree) {
    const def = seedDef(tree.seedId)
    return (
      <div className="rounded-xl bg-black/50 p-3 text-xs">
        <div className="font-bold text-emerald-200">🌳 {def?.name} — stage {tree.stage}/{TREE_MAX_STAGE}</div>
        <div className="mt-0.5 text-slate-400">{def?.stageBonus}</div>
        <div className="mt-0.5 italic text-slate-500">“{def?.flavor}”</div>
        <p className="mt-1 text-slate-500">
          Trees never die. Walk on {(def?.daysPerStage ?? 3) - tree.daysThisStage.length} more distinct day(s) for the next stage.
        </p>
        <button onClick={() => onDone()} className="mt-2 w-full rounded-lg bg-slate-800 py-1.5 text-slate-400">Close</button>
      </div>
    )
  }
  const treeSeeds = SEEDS.filter((sd) => sd.kind === 'tree' && (garden.seeds[sd.id] ?? 0) > 0)
  return (
    <div className="rounded-xl bg-black/50 p-3 text-xs">
      <div className="mb-1.5 font-bold text-emerald-200">Plant a tree (immortal — grows with your regularity)</div>
      {treeSeeds.length === 0 && <p className="text-slate-500">No tree seeds. They drop rarely in the dungeon.</p>}
      <div className="flex flex-col gap-1">
        {treeSeeds.map((sd) => (
          <button
            key={sd.id}
            onClick={() => { useGameStore.getState().plantTree(selection.idx, sd.id); onDone(`🌳 ${sd.name} planted!`) }}
            className="flex items-center justify-between rounded-lg bg-black/40 px-2 py-1.5 text-left"
          >
            <span className={TIER_COLOR[sd.tier]}>{sd.icon} {sd.name} ×{garden.seeds[sd.id]}</span>
            <span className="text-slate-500">{sd.stageBonus}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
