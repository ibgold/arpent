import { useState } from 'react'
import { catalogItem } from '../../core/balance/catalog'
import { VILLAGE_EVENT_META } from '../../core/balance/villageEvents'
import { useGameStore } from '../../core/state/store'

/** Événement de village : surgit au retour d'expédition. Une carte, deux choix, zéro punition. */
export function VillageEventModal() {
  const event = useGameStore((s) => s.villageEvent)
  const gold = useGameStore((s) => s.gold)
  const resolve = useGameStore((s) => s.resolveVillageEvent)
  const inRun = useGameStore((s) => !!s.run)
  const [outcome, setOutcome] = useState<string | null>(null)

  if (inRun) return null
  if (outcome) {
    return (
      <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/70 p-4 font-mono" onClick={() => setOutcome(null)}>
        <div className="w-full max-w-sm rounded-xl border border-slate-700 bg-slate-900 p-5 text-center">
          <p className="text-sm text-emerald-300">{outcome}</p>
          <button className="mt-3 w-full rounded-lg bg-slate-800 py-2 text-xs text-slate-400">Continue</button>
        </div>
      </div>
    )
  }
  if (!event) return null

  const meta = VILLAGE_EVENT_META[event.id]
  const item = event.itemId ? catalogItem(event.itemId) : undefined
  const canAfford = event.id !== 'wandering-merchant' || gold >= (event.price ?? 0)

  const choose = (accept: boolean) => {
    const r = resolve(accept)
    if (r && accept) setOutcome(r.label)
  }

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/70 p-4 font-mono">
      <div className="w-full max-w-sm rounded-xl border border-amber-800/60 bg-slate-900 p-5">
        <div className="text-center text-3xl">{meta.icon}</div>
        <h2 className="mt-1 text-center text-base font-bold text-amber-200">{meta.title}</h2>
        <p className="mt-1 text-center text-xs text-slate-400">{meta.desc}</p>
        {item && (
          <div className="mt-3 rounded-lg bg-slate-950 p-3 text-center text-xs">
            <span className="font-bold text-slate-100">{item.relicEffect && '✦ '}{item.name}</span>
            <span className="ml-2 font-bold text-amber-300">{event.price}g</span>
            <div className="mt-1 italic text-slate-600">“{item.flavor}”</div>
          </div>
        )}
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => choose(true)}
            disabled={!canAfford}
            className="flex-1 rounded-lg bg-emerald-600 py-2.5 text-sm font-bold text-white disabled:bg-slate-800 disabled:text-slate-600"
          >
            {meta.accept}
          </button>
          <button onClick={() => choose(false)} className="flex-1 rounded-lg bg-slate-800 py-2.5 text-sm text-slate-400">
            {meta.decline}
          </button>
        </div>
      </div>
    </div>
  )
}
