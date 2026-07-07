import { useEffect, useState } from 'react'
import { BALANCE } from '../../core/balance/constants'
import type { BoonDef } from '../../core/balance/boons'
import { useGameStore } from '../../core/state/store'
import type { RunSummary } from '../../core/types'
import { gameEvents } from '../../game/bridge/events'
import { catalogItem } from '../../core/balance/catalog'
import { useWalkSpeed } from '../components/StatusBar'

const RARITY_TEXT: Record<string, string> = {
  common: 'text-slate-300',
  rare: 'text-sky-400',
  epic: 'text-violet-400',
  legendary: 'text-amber-400',
}

/** HUD React par-dessus le canvas pendant une run + écran de fin de run. */
export function RunHud() {
  const run = useGameStore((s) => s.run)
  const energy = useGameStore((s) => s.energy)
  const [hp, setHp] = useState<[number, number]>([0, 0])
  const [runXp, setRunXp] = useState<[number, number, number]>([0, 1, 1])
  const [bossHp, setBossHp] = useState<[number, number] | null>(null)
  const [summary, setSummary] = useState<RunSummary | null>(null)
  const [boonOffer, setBoonOffer] = useState<BoonDef[] | null>(null)
  const speed = useWalkSpeed()

  useEffect(() => {
    const onHp = (v: number, max: number) => setHp([v, max])
    const onBoss = (v: number, max: number) => setBossHp([v, max])
    const onRoom = (_room: number, isBoss: boolean) => {
      if (!isBoss) setBossHp(null)
    }
    const onEnded = (s: RunSummary) => {
      setSummary(s)
      setBossHp(null)
      setBoonOffer(null)
    }
    const onStarted = () => setSummary(null)
    const onBoonOffer = (choices: BoonDef[]) => setBoonOffer(choices)
    const onXp = (xp: number, needed: number, level: number) => setRunXp([xp, needed, level])
    gameEvents.on('run:xp', onXp)
    gameEvents.on('run:hp', onHp)
    gameEvents.on('run:boss-hp', onBoss)
    gameEvents.on('run:room', onRoom)
    gameEvents.on('run:ended', onEnded)
    gameEvents.on('run:started', onStarted)
    gameEvents.on('run:boon-offer', onBoonOffer)
    return () => {
      gameEvents.off('run:xp', onXp)
      gameEvents.off('run:hp', onHp)
      gameEvents.off('run:boss-hp', onBoss)
      gameEvents.off('run:room', onRoom)
      gameEvents.off('run:ended', onEnded)
      gameEvents.off('run:started', onStarted)
      gameEvents.off('run:boon-offer', onBoonOffer)
    }
  }, [])

  const chooseBoon = (id: string) => {
    setBoonOffer(null)
    gameEvents.emit('run:boon-chosen', id)
  }

  if (summary) return <RunSummaryModal summary={summary} onClose={() => setSummary(null)} />
  if (!run) return null

  if (boonOffer) {
    return (
      <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/70 p-4">
        <div className="w-full max-w-md font-mono">
          <h2 className="text-center text-lg font-bold text-amber-300">Choose a blessing</h2>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            {boonOffer.map((boon) => (
              <button
                key={boon.id}
                onClick={() => chooseBoon(boon.id)}
                className="flex-1 rounded-xl border border-amber-700/60 bg-slate-900 p-4 text-left transition-transform active:scale-95"
              >
                <div className="text-2xl">{boon.icon}</div>
                <div className="mt-1 font-bold text-amber-200">{boon.name}</div>
                <div className="mt-0.5 text-xs text-slate-400">{boon.description}</div>
              </button>
            ))}
          </div>
          <button
            onClick={() => gameEvents.emit('run:boon-reroll')}
            disabled={energy < BALANCE.boonRerollCost}
            className="mx-auto mt-3 block rounded-lg bg-slate-800 px-4 py-2 text-xs font-bold text-emerald-300 disabled:text-slate-600"
          >
            🎲 Reroll — {BALANCE.boonRerollCost}⚡
          </button>
          <p className="mt-2 text-center text-[11px] text-slate-500">Lasts until the end of this expedition</p>
        </div>
      </div>
    )
  }

  const hpPct = hp[1] > 0 ? (hp[0] / hp[1]) * 100 : 100
  // Jauge d'énergie relative à ce qu'on avait au départ de la run
  const energyPct = Math.min(100, (energy / Math.max(1, run.energyAtStart)) * 100)

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 p-2 font-mono">
      <div className="mx-auto flex max-w-lg flex-col gap-1.5">
        <div className="flex items-center gap-2 text-xs">
          <span className="w-8 text-rose-300">HP</span>
          <div className="h-3 flex-1 overflow-hidden rounded bg-slate-800">
            <div className="h-full bg-rose-500 transition-all duration-200" style={{ width: `${hpPct}%` }} />
          </div>
          <span className="w-16 text-right text-rose-200">{Math.ceil(hp[0])}/{hp[1]}</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="w-8 text-emerald-300">⚡</span>
          <div className="h-3 flex-1 overflow-hidden rounded bg-slate-800">
            <div className="h-full bg-emerald-400 transition-all duration-500" style={{ width: `${energyPct}%` }} />
          </div>
          <span className="w-16 text-right text-emerald-200">{Math.floor(energy)}</span>
        </div>
        {/* XP de run façon Archero : la jauge vers la prochaine capacité */}
        <div className="flex items-center gap-2 text-xs">
          <span className="w-8 text-violet-300">Lv{runXp[2]}</span>
          <div className="h-2 flex-1 overflow-hidden rounded bg-slate-800">
            <div
              className="h-full bg-violet-400 transition-all duration-300"
              style={{ width: `${Math.min(100, (runXp[0] / runXp[1]) * 100)}%` }}
            />
          </div>
          <span className="w-16 text-right text-[10px] text-violet-300/70">next skill</span>
        </div>
        <div className="flex justify-between text-[11px] text-slate-400">
          <span>
            {(run.depth ?? 1) > 1 && <span className="font-bold text-amber-400">⛏D{run.depth} · </span>}
            Room {run.room}/{BALANCE.roomsPerRegion}
            {run.room >= BALANCE.roomsPerRegion && <span className="text-rose-400"> · BOSS</span>}
          </span>
          <span>
            💎 {run.loot.length} · ☠️ {run.kills} · 🪵 {run.wood} · 🪨 {run.stone}
            {speed > 0 && (
              <span className="text-emerald-400">
                {' '}· HYBRID +{Math.round(speed * BALANCE.hybridDamageBonusPerKmh * 100)}% dmg
              </span>
            )}
          </span>
        </div>
        {bossHp && (
          <div className="mt-1 flex items-center gap-2 text-xs">
            <span className="text-rose-400">BOSS</span>
            <div className="h-4 flex-1 overflow-hidden rounded border border-rose-900 bg-slate-900">
              <div
                className="h-full bg-gradient-to-r from-rose-600 to-rose-400 transition-all duration-200"
                style={{ width: `${(bossHp[0] / bossHp[1]) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function RunSummaryModal({ summary, onClose }: { summary: RunSummary; onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/80 p-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-700 bg-slate-900 p-5 font-mono">
        <h2 className={`text-center text-xl font-bold ${summary.victory ? 'text-amber-300' : 'text-slate-200'}`}>
          {summary.victory ? '🏆 BOSS DEFEATED!' : 'Expedition over'}
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500">Everything you found is yours to keep.</p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
          <Stat label="Rooms" value={`${summary.rooms}`} />
          <Stat label="Kills" value={`${summary.kills}`} />
          <Stat label="XP" value={`+${summary.xpGained}`} />
          <Stat label="Gold" value={`${summary.gold}g`} />
          <Stat label="Essence" value={`+${summary.essenceGained}⚗`} />
          <Stat label="Wood/Stone" value={`${summary.wood}/${summary.stone}`} />
        </div>
        {summary.followersRescued > 0 && (
          <p className="mt-2 text-center text-sm font-bold text-amber-300">
            ✨ {summary.followersRescued} new villager{summary.followersRescued > 1 ? 's' : ''} rescued!
          </p>
        )}
        {summary.loot.length > 0 && (
          <div className="mt-4 max-h-40 overflow-y-auto rounded bg-slate-950 p-2 text-xs">
            {summary.loot.map((entry, i) => {
              const def = catalogItem(entry.catalogId)
              if (!def) return null
              return entry.isNew ? (
                <div key={i} className="font-bold text-amber-300">
                  ★ NEW: {def.name} <span className={RARITY_TEXT[def.rarity]}>({def.rarity})</span>
                </div>
              ) : (
                <div key={i} className="text-violet-300/80">
                  ◆ {def.name} <span className="text-slate-600">→ +{entry.essence}⚗</span>
                </div>
              )
            })}
          </div>
        )}
        <button
          onClick={onClose}
          className="mt-4 w-full rounded-lg bg-emerald-600 py-2.5 font-bold text-white active:bg-emerald-700"
        >
          Back to the Foyer
        </button>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-slate-950 p-2 text-center">
      <div className="text-[10px] uppercase text-slate-500">{label}</div>
      <div className="font-bold text-slate-100">{value}</div>
    </div>
  )
}
