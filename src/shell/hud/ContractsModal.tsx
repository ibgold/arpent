import { useEffect, useState } from 'react'
import type { ContractDef } from '../../core/balance/contracts'
import { challengeDayKey, dailyChallengeMods } from '../../core/balance/challenge'
import { POTIONS } from '../../core/balance/garden'
import { BALANCE } from '../../core/balance/constants'
import { useGameStore } from '../../core/state/store'
import { gameEvents } from '../../game/bridge/events'

/** Contrats maudits : proposés au départ d'une expédition. Chaque contrat accepté
 *  est un malus assumé contre une récompense annoncée. Tout est optionnel. */
export function ContractsModal() {
  const [offer, setOffer] = useState<{ regionId: string; contracts: ContractDef[] } | null>(null)
  const [accepted, setAccepted] = useState<Set<string>>(new Set())
  const [potion, setPotion] = useState<string | undefined>(undefined)
  const [challenge, setChallenge] = useState(false)
  const [mode, setMode] = useState<'expedition' | 'boss-rush' | 'colosseum'>('expedition')
  const [overcharge, setOvercharge] = useState(0)
  const energy = useGameStore((s) => s.energy)
  const potions = useGameStore((s) => s.garden.potions)
  const wonToday = useGameStore((s) => s.dailyChallenge.lastWonDay === challengeDayKey())
  const bossesDown = useGameStore((s) => s.progression.bossesDefeated.length)
  const colosseumBest = useGameStore((s) => s.colosseumBest ?? 0)

  useEffect(() => {
    const onOffer = (regionId: string, contracts: ContractDef[]) => {
      setOffer({ regionId, contracts })
      setAccepted(new Set())
      setPotion(undefined)
      setChallenge(false)
      setMode('expedition')
      setOvercharge(0)
    }
    gameEvents.on('hub:offer-contracts', onOffer)
    return () => void gameEvents.off('hub:offer-contracts', onOffer)
  }, [])

  if (!offer) return null

  const toggle = (id: string) => {
    setAccepted((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const embark = () => {
    gameEvents.emit('hub:embark', offer.regionId, [...accepted], potion, challenge, mode === 'expedition' ? undefined : mode, overcharge)
    setOffer(null)
  }

  const ownedPotions = POTIONS.filter((p) => (potions[p.id] ?? 0) > 0)
  const todayMods = dailyChallengeMods()
  // Surcharge : crans d'énergie versables dans la run (au-delà du coût de base)
  const maxOverSteps = Math.min(BALANCE.overchargeMaxSteps, Math.floor((energy - BALANCE.runStartCost) / BALANCE.overchargeCostPerStep))
  const overBonusPct = Math.round(overcharge * BALANCE.overchargeBonusPerStep * 100)

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/80 p-4 font-mono">
      <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-5">
        <h2 className="text-center text-lg font-bold text-rose-300">Cursed Contracts</h2>
        <p className="mt-1 text-center text-xs text-slate-500">
          Accept a curse, claim its reward. Or walk in clean — your call.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          {offer.contracts.map((c) => {
            const on = accepted.has(c.id)
            return (
              <button
                key={c.id}
                onClick={() => toggle(c.id)}
                className={`rounded-xl border p-3 text-left transition-colors ${
                  on ? 'border-rose-500 bg-rose-950/40' : 'border-slate-700 bg-slate-950'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-100">
                    {c.icon} {c.name}
                  </span>
                  <span className={`rounded px-2 py-0.5 text-[11px] font-bold ${on ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-500'}`}>
                    {on ? 'ACCEPTED' : 'tap to accept'}
                  </span>
                </div>
                <div className="mt-1 text-xs text-rose-400">☠ {c.curse}</div>
                <div className="text-xs text-emerald-300">✦ {c.reward}</div>
              </button>
            )
          })}
        </div>
        {/* Modes alternatifs : Boss Rush (dès 3 boss) et Colosseum (dès 1 boss) */}
        <div className="mt-3">
          <div className="mb-1 text-[11px] font-bold uppercase text-sky-300">⚔️ Game mode</div>
          <div className="grid grid-cols-3 gap-1.5">
            {([
              { id: 'expedition', label: '🗺 Expedition', locked: false, hint: 'The classic run' },
              { id: 'boss-rush', label: '👑 Boss Rush', locked: bossesDown < 3, hint: bossesDown < 3 ? 'Defeat 3 bosses to unlock' : `All ${9} bosses back-to-back` },
              { id: 'colosseum', label: '🏟 Colosseum', locked: bossesDown < 1, hint: bossesDown < 1 ? 'Defeat 1 boss to unlock' : `Endless waves · best: ${colosseumBest}` },
            ] as const).map((m) => (
              <button
                key={m.id}
                disabled={m.locked}
                onClick={() => { setMode(m.id); if (m.id !== 'expedition') setChallenge(false) }}
                title={m.hint}
                className={`rounded-lg border px-1 py-2 text-[11px] ${
                  mode === m.id ? 'border-sky-500 bg-sky-950/50 font-bold text-sky-200' : 'border-slate-700 text-slate-400'
                } disabled:opacity-40`}
              >
                {m.locked ? '🔒 ' : ''}{m.label}
              </button>
            ))}
          </div>
          {mode === 'boss-rush' && (
            <p className="mt-1 text-[11px] text-sky-300">The 9 region bosses, back-to-back. Each drops loot — survive them all.</p>
          )}
          {mode === 'colosseum' && (
            <p className="mt-1 text-[11px] text-sky-300">
              One arena, endless waves, a boss every 5th. Best wave: <b>{colosseumBest}</b>. No region progress — pure glory & loot.
            </p>
          )}
        </div>
        {/* Défi quotidien 🏅 : mods du jour, grosse récompense, une victoire par jour */}
        <div className={mode === 'expedition' ? 'mt-3' : 'hidden'}>
          <div className="mb-1 text-[11px] font-bold uppercase text-amber-300">🏅 Daily challenge</div>
          {wonToday ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-slate-500">
              ✓ Completed today — come back tomorrow for new modifiers.
            </div>
          ) : (
            <button
              onClick={() => setChallenge(!challenge)}
              className={`w-full rounded-xl border p-3 text-left transition-colors ${
                challenge ? 'border-amber-500 bg-amber-950/40' : 'border-slate-700 bg-slate-950'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-100">Today's trial</span>
                <span className={`rounded px-2 py-0.5 text-[11px] font-bold ${challenge ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-500'}`}>
                  {challenge ? 'ACCEPTED' : 'tap to accept'}
                </span>
              </div>
              {todayMods.map((m) => (
                <div key={m.id} className="mt-1 text-xs text-amber-400">
                  {m.icon} {m.name} — {m.desc}
                </div>
              ))}
              <div className="text-xs text-emerald-300">✦ Beat the boss: +300g × depth · rare seed · bonus chest</div>
            </button>
          )}
        </div>
        {/* Surcharge ⚡ : verser ton énergie en réserve dans la run pour la booster (or & butin) */}
        {maxOverSteps > 0 && (
          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-emerald-300">⚡ Overcharge (spend banked energy)</span>
              <span className="text-[11px] text-slate-500">⚡ {Math.floor(energy)}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setOvercharge(Math.max(0, overcharge - 1))}
                className="h-9 w-10 rounded-lg bg-slate-800 text-lg text-slate-200"
              >−</button>
              <div className="flex-1 rounded-lg bg-slate-950 py-2 text-center text-xs">
                {overcharge === 0 ? (
                  <span className="text-slate-500">no boost</span>
                ) : (
                  <span className="font-bold text-emerald-300">
                    −{overcharge * BALANCE.overchargeCostPerStep} ⚡ → +{overBonusPct}% gold & loot
                  </span>
                )}
              </div>
              <button
                onClick={() => setOvercharge(Math.min(maxOverSteps, overcharge + 1))}
                className="h-9 w-10 rounded-lg bg-slate-800 text-lg text-slate-200"
              >+</button>
            </div>
            <p className="mt-1 text-[10px] text-slate-600">Turn your energy reserve into a richer run — up to +{BALANCE.overchargeMaxSteps * BALANCE.overchargeBonusPerStep * 100}%.</p>
          </div>
        )}
        {/* Potions du jardin 🌱 : une par run, optionnelle */}
        {ownedPotions.length > 0 && (
          <div className="mt-3">
            <div className="mb-1 text-[11px] font-bold uppercase text-emerald-300">🌱 Garden potion (one per run)</div>
            <div className="flex flex-wrap gap-1.5">
              {ownedPotions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPotion(potion === p.id ? undefined : p.id)}
                  title={p.description}
                  className={`rounded-lg border px-2 py-1.5 text-xs ${
                    potion === p.id ? 'border-emerald-500 bg-emerald-950 font-bold text-emerald-200' : 'border-slate-700 text-slate-400'
                  }`}
                >
                  {p.icon} {p.name} ×{potions[p.id]}
                </button>
              ))}
            </div>
            {potion && <p className="mt-1 text-[11px] text-emerald-400">{POTIONS.find((p) => p.id === potion)?.description}</p>}
          </div>
        )}
        <button
          onClick={embark}
          className="mt-4 w-full rounded-lg bg-indigo-600 py-3 font-bold text-white active:bg-indigo-700"
        >
          {accepted.size > 0 ? `Embark cursed ×${accepted.size}` : 'Embark clean'}
        </button>
        <button onClick={() => setOffer(null)} className="mt-2 w-full rounded-lg bg-slate-800 py-2 text-sm text-slate-400">
          Cancel
        </button>
      </div>
    </div>
  )
}
