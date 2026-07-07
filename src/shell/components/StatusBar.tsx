import { useEffect, useState } from 'react'
import { useGameStore } from '../../core/state/store'
import { gameEvents } from '../../game/bridge/events'

export function formatDistance(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`
}

export function useWalkSpeed(): number {
  const [speed, setSpeed] = useState(0)
  useEffect(() => {
    const cb = (kmh: number) => setSpeed(kmh)
    gameEvents.on('walk:speed', cb)
    return () => void gameEvents.off('walk:speed', cb)
  }, [])
  return speed
}

export function StatusBar() {
  const energy = useGameStore((s) => s.energy)
  const gold = useGameStore((s) => s.gold)
  const wood = useGameStore((s) => s.wood)
  const stone = useGameStore((s) => s.stone)
  const essence = useGameStore((s) => s.essence)
  const chests = useGameStore((s) => s.wanderChests.stored)
  const distance = useGameStore((s) => s.totalDistanceM)
  const speed = useWalkSpeed()

  return (
    <header className="flex items-center justify-between gap-1.5 border-b border-slate-800 bg-slate-900 px-2 py-1.5 pt-[max(env(safe-area-inset-top),0.375rem)] font-mono text-[11px] sm:px-3 sm:text-sm">
      <span className={`shrink-0 ${speed > 0 ? 'text-emerald-400' : 'text-slate-600'}`}>
        {speed > 0 ? `👟 ${speed.toFixed(1)}` : '👟'}
      </span>
      {/* Wrappe proprement sur petit écran au lieu de déborder */}
      <div className="flex flex-wrap items-center justify-end gap-x-1.5 gap-y-0.5 sm:gap-x-3">
        {chests > 0 && <span className="animate-pulse font-bold text-amber-400">🎁{chests}</span>}
        <span className="text-sky-300">{formatDistance(distance)}</span>
        <span className="text-amber-300">{Math.floor(gold)}g</span>
        <span className="text-yellow-600">🪵{Math.floor(wood)}</span>
        <span className="text-stone-400">🪨{Math.floor(stone)}</span>
        <span className="text-violet-300">⚗{Math.floor(essence)}</span>
        <span className="rounded bg-emerald-950 px-1.5 py-0.5 font-bold text-emerald-300 sm:px-2">
          ⚡ {Math.floor(energy)}
        </span>
      </div>
    </header>
  )
}
