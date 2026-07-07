import { useEffect, useState } from 'react'
import { BALANCE } from '../../core/balance/constants'
import { type ChestReward } from '../../core/balance/chests'
import { chestDistanceM } from '../../core/balance/prestigePerks'
import { questLabel } from '../../core/balance/quests'
import { catalogItem } from '../../core/balance/catalog'
import { chestCapacity, roadFindDistance, useGameStore } from '../../core/state/store'
import { walkManager } from '../../input/walkManager'
import { gameEvents } from '../../game/bridge/events'
import { formatDistance, useWalkSpeed } from '../components/StatusBar'
import { isPipSupported, openPipWidget } from './pip'

/** Mode Ambiant : je marche en faisant autre chose. Gros compteur, contrôles de vitesse, widget PiP. */
export function AmbientView() {
  const energy = useGameStore((s) => s.energy)
  const totalDistance = useGameStore((s) => s.totalDistanceM)
  const streak = useGameStore((s) => s.dailyStreak)
  const settings = useGameStore((s) => s.settings)
  const setSettings = useGameStore((s) => s.setSettings)
  const speed = useWalkSpeed()
  const [manualSpeed, setManualSpeed] = useState(walkManager.manual.getSpeed())
  const [pipOpen, setPipOpen] = useState(false)
  const [paused, setPaused] = useState(walkManager.isPaused())

  useEffect(() => {
    const onPaused = (p: boolean) => setPaused(p)
    gameEvents.on('walk:paused', onPaused)
    return () => void gameEvents.off('walk:paused', onPaused)
  }, [])

  const applyManualSpeed = (kmh: number) => {
    const clamped = Math.max(0, Math.min(12, Math.round(kmh * 10) / 10))
    setManualSpeed(clamped)
    walkManager.manual.setSpeed(clamped)
  }

  const runsAvailable = Math.floor(energy / BALANCE.runStartCost)

  return (
    <div className="flex h-full flex-col items-center gap-5 overflow-y-auto p-6 font-mono">
      <div className="mt-4 text-center">
        <div className={`text-6xl font-bold ${speed > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
          ⚡ {Math.floor(energy)}
        </div>
        <div className="mt-2 text-sm text-slate-400">
          {speed > 0 ? `earning ${(BALANCE.energyRatePerKmh * speed).toFixed(1)} energy/s` : 'walk to earn energy'}
        </div>
        <div className="mt-1 text-xs text-slate-600">
          {runsAvailable > 0
            ? `enough for ${runsAvailable} expedition${runsAvailable > 1 ? 's' : ''}`
            : `${Math.ceil(BALANCE.runStartCost - energy)} more for an expedition`}
        </div>
      </div>

      <div className="flex gap-6 text-center text-sm">
        <div>
          <div className="text-lg font-bold text-sky-300">{formatDistance(totalDistance)}</div>
          <div className="text-xs text-slate-500">total walked</div>
        </div>
        <div>
          <div className="text-lg font-bold text-amber-300">{streak.days || 0} day{streak.days > 1 ? 's' : ''}</div>
          <div className="text-xs text-slate-500">walking streak</div>
        </div>
      </div>

      <DailyStepsPanel />
      <RoadFindPanel />
      <ChestPanel />
      <ErrandsPanel />

      {/* Contrôle de la source de marche */}
      <div className="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-900 p-4">
        <button
          onClick={() => walkManager.togglePause()}
          className={`mb-3 w-full rounded-lg py-2.5 text-sm font-bold ${
            paused ? 'bg-orange-700 text-white' : 'bg-slate-800 text-slate-300'
          }`}
        >
          {paused ? '▶ Resume walking' : '⏸ Pause walking'}
        </button>
        <div className="mb-3 grid grid-cols-2 gap-2">
          {([
            { id: 'manual', label: '🎚 Manual' },
            { id: 'simulation', label: '🤖 Simulation' },
            { id: 'gps', label: '🛰 GPS' },
            { id: 'motion', label: '📳 Pedometer' },
          ] as const).map((mode) => (
            <button
              key={mode.id}
              onClick={() => setSettings({ inputMode: mode.id })}
              className={`rounded-lg py-2 text-sm ${
                settings.inputMode === mode.id ? 'bg-emerald-600 font-bold text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {settings.inputMode === 'gps' && (
          <SensorStatus
            mode="gps"
            hint="Outdoor walks: distance comes from real GPS fixes (needs location permission, works best outside)."
          />
        )}
        {settings.inputMode === 'motion' && (
          <SensorStatus
            mode="motion"
            hint="Treadmill-friendly: steps are detected from the phone's motion sensor. Keep the phone on you."
          />
        )}
        {settings.inputMode === 'manual' ? (
          <div>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-slate-400">My treadmill speed</span>
              <span className="font-bold text-emerald-300">{manualSpeed.toFixed(1)} km/h</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => applyManualSpeed(manualSpeed - 0.5)} className="h-10 w-10 rounded-lg bg-slate-800 text-lg">−</button>
              <input
                type="range" min={0} max={12} step={0.1} value={manualSpeed}
                onChange={(e) => applyManualSpeed(Number(e.target.value))}
                className="flex-1 accent-emerald-500"
              />
              <button onClick={() => applyManualSpeed(manualSpeed + 0.5)} className="h-10 w-10 rounded-lg bg-slate-800 text-lg">+</button>
            </div>
            <p className="mt-2 text-xs text-slate-600">Set it to match your treadmill. 0 = not walking.</p>
          </div>
        ) : settings.inputMode === 'simulation' ? (
          <div>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-slate-400">Simulated speed</span>
              <span className="font-bold text-emerald-300">{settings.simSpeedKmh.toFixed(1)} km/h</span>
            </div>
            <input
              type="range" min={0} max={12} step={0.5} value={settings.simSpeedKmh}
              onChange={(e) => setSettings({ simSpeedKmh: Number(e.target.value) })}
              className="w-full accent-emerald-500"
            />
            <p className="mt-2 text-xs text-slate-600">Fake walking for testing at your desk.</p>
          </div>
        ) : null}
      </div>

      <button
        onClick={async () => {
          const w = await openPipWidget()
          if (w) {
            setPipOpen(true)
            w.addEventListener('pagehide', () => setPipOpen(false))
          }
        }}
        disabled={!isPipSupported() || pipOpen}
        className="w-full max-w-sm rounded-xl bg-indigo-600 py-3 font-bold text-white disabled:bg-slate-800 disabled:text-slate-600"
      >
        {isPipSupported()
          ? pipOpen ? 'Floating widget is open' : '⧉ Open floating widget'
          : 'Floating widget (Chromium only)'}
      </button>
      <p className="max-w-sm text-center text-xs text-slate-600">
        The floating widget stays on top of other windows — walk, work, and watch your energy grow.
      </p>
    </div>
  )
}

/** Quota de pas quotidien : l'objectif santé, avec récompense à l'atteinte. */
function DailyStepsPanel() {
  const daily = useGameStore((s) => s.dailySteps)
  const setDailyGoal = useGameStore((s) => s.setDailyGoal)
  const steps = Math.floor(daily.steps)
  const pct = Math.min(100, (steps / daily.goal) * 100)
  const done = daily.rewarded

  return (
    <div className={`w-full max-w-sm rounded-xl border p-4 ${done ? 'border-emerald-700 bg-emerald-950/30' : 'border-slate-700 bg-slate-900'}`}>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm font-bold text-emerald-200">🚶 Daily steps</span>
        <span className={`text-sm font-bold ${done ? 'text-emerald-300' : 'text-slate-300'}`}>
          {steps.toLocaleString()} / {daily.goal.toLocaleString()}
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded bg-slate-800">
        <div
          className={`h-full transition-all duration-700 ${done ? 'bg-emerald-400' : 'bg-gradient-to-r from-emerald-700 to-emerald-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px]">
        {done ? (
          <span className="font-bold text-emerald-300">✓ Goal reached — +{BALANCE.dailyGoalGold}g and a bonus chest! 🎁</span>
        ) : (
          <span className="text-slate-500">Reward: +{BALANCE.dailyGoalGold}g and a bonus chest</span>
        )}
        <span className="flex items-center gap-1 text-slate-500">
          goal
          <button onClick={() => setDailyGoal(daily.goal - 1000)} className="rounded bg-slate-800 px-1.5 py-0.5">−</button>
          <button onClick={() => setDailyGoal(daily.goal + 1000)} className="rounded bg-slate-800 px-1.5 py-0.5">+</button>
        </span>
      </div>
    </div>
  )
}

/** Trouvailles de la route : tous les 2 km, la marche découvre un objet du catalogue. */
function RoadFindPanel() {
  const roadProgressM = useGameStore((s) => s.roadProgressM)
  const lastFind = useGameStore((s) => s.lastRoadFind)
  const findDistance = useGameStore((s) => roadFindDistance(s))
  const pct = Math.min(100, (roadProgressM / findDistance) * 100)
  const lastDef = lastFind ? catalogItem(lastFind.catalogId) : undefined

  return (
    <div className="w-full max-w-sm rounded-xl border border-sky-900/60 bg-slate-900 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-bold text-sky-200">👟 Road finds</span>
        <span className="text-xs text-slate-500">next in {Math.max(0, Math.ceil(findDistance - roadProgressM))} m</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded bg-slate-800">
        <div className="h-full bg-gradient-to-r from-sky-600 to-sky-400 transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-[11px] text-slate-500">
        Some items can only be found on the road — walk to complete your Collection.
      </p>
      {lastFind && lastDef && (
        <div className={`mt-2 rounded-lg py-2 text-center text-sm font-bold ${lastFind.isNew ? 'bg-amber-950 text-amber-300' : 'bg-slate-950 text-violet-300'}`}>
          {lastFind.isNew ? `★ NEW: ${lastDef.name}` : `${lastDef.name} → +${lastFind.essence}⚗`}
        </div>
      )}
    </div>
  )
}

/** Statut du capteur réel : permission, activité, erreurs — sans jargon */
function SensorStatus({ mode, hint }: { mode: 'gps' | 'motion'; hint: string }) {
  const [status, setStatus] = useState<'idle' | 'active' | 'denied' | 'unavailable'>('idle')
  useEffect(() => {
    const read = () => setStatus(mode === 'gps' ? walkManager.gps.status : walkManager.pedometer.status)
    read()
    const t = setInterval(read, 1000)
    return () => clearInterval(t)
  }, [mode])
  const label =
    status === 'active' ? '🟢 Sensor active — walk and watch the energy flow'
    : status === 'denied' ? '🔴 Permission denied — allow it in your browser settings'
    : status === 'unavailable' ? '🟠 Not available on this device/browser'
    : '⚪ Starting…'
  return (
    <div className="mb-3 rounded-lg bg-slate-950 p-2 text-[11px]">
      <p className="font-bold text-slate-300">{label}</p>
      <p className="mt-1 text-slate-600">{hint}</p>
    </div>
  )
}

/** Coffres du Marcheur : la marche remplit la jauge, chaque coffre est une surprise. */
function ChestPanel() {
  const chests = useGameStore((s) => s.wanderChests)
  const cap = useGameStore((s) => chestCapacity(s))
  const openChest = useGameStore((s) => s.openWanderChest)
  const [lastReward, setLastReward] = useState<ChestReward | null>(null)
  const [revealing, setRevealing] = useState(false)

  const chestDist = useGameStore((s) => chestDistanceM(s))
  const pct = Math.min(100, (chests.progressM / chestDist) * 100)
  const remaining = Math.max(0, Math.ceil(chestDist - chests.progressM))

  const handleOpen = () => {
    const reward = openChest()
    if (!reward) return
    setRevealing(true)
    setLastReward(reward)
    setTimeout(() => setRevealing(false), 200)
  }

  return (
    <div className="w-full max-w-sm rounded-xl border border-amber-900/60 bg-slate-900 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-bold text-amber-200">🎁 Wander Chests</span>
        <span className="text-xs text-slate-500">
          {chests.stored}/{cap} stored
        </span>
      </div>
      <div className="mb-1 h-2.5 overflow-hidden rounded bg-slate-800">
        <div className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>
      <div className="mb-3 text-[11px] text-slate-500">
        {chests.stored >= cap
          ? 'Chest bag full — open one to keep earning!'
          : `next chest in ${remaining} m`}
      </div>
      <button
        onClick={handleOpen}
        disabled={chests.stored === 0}
        className={`w-full rounded-lg py-3 text-sm font-bold transition-transform ${
          revealing ? 'scale-95' : ''
        } ${chests.stored > 0 ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-600'}`}
      >
        {chests.stored > 0 ? `Open a chest (${chests.stored})` : 'Walk to earn chests'}
      </button>
      {lastReward && (
        <div
          className={`mt-2 rounded-lg py-2 text-center text-sm font-bold ${
            lastReward.kind === 'jackpot'
              ? 'bg-amber-950 text-amber-300'
              : lastReward.kind === 'item'
                ? 'bg-violet-950 text-violet-300'
                : 'bg-slate-950 text-emerald-300'
          }`}
        >
          {lastReward.kind === 'jackpot' ? '✨ ' : '→ '}
          {lastReward.label}
        </div>
      )}
    </div>
  )
}

/** Commissions : 3 objectifs court-terme, toujours une barre presque pleine. */
function ErrandsPanel() {
  const quests = useGameStore((s) => s.quests)
  const claimQuest = useGameStore((s) => s.claimQuest)
  const [claimedMsg, setClaimedMsg] = useState('')

  const handleClaim = (id: string) => {
    const reward = claimQuest(id)
    if (!reward) return
    const parts = [
      reward.gold ? `+${reward.gold}g` : null,
      reward.wood ? `+${reward.wood}🪵` : null,
      reward.stone ? `+${reward.stone}🪨` : null,
      reward.xp ? `+${reward.xp} XP` : null,
      reward.item ? '+1 item ◆' : null,
    ].filter(Boolean)
    setClaimedMsg(`Claimed: ${parts.join(' ')}`)
    setTimeout(() => setClaimedMsg(''), 3000)
  }

  return (
    <div className="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="mb-2 text-sm font-bold text-slate-300">📜 Errands</div>
      <div className="flex flex-col gap-2">
        {quests.map((q) => {
          const done = q.progress >= q.target
          const pct = Math.min(100, (q.progress / q.target) * 100)
          return (
            <div key={q.id} className="rounded-lg bg-slate-950 p-2">
              <div className="flex items-center justify-between gap-2">
                <span className={`text-xs ${done ? 'text-emerald-300' : 'text-slate-300'}`}>{questLabel(q)}</span>
                {done ? (
                  <button
                    onClick={() => handleClaim(q.id)}
                    className="animate-pulse rounded bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white"
                  >
                    Claim!
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-500">
                    {Math.floor(q.progress)}/{q.target}
                  </span>
                )}
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded bg-slate-800">
                <div
                  className={`h-full transition-all duration-500 ${done ? 'bg-emerald-400' : 'bg-sky-500'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
      {claimedMsg && <p className="mt-2 text-center text-xs font-bold text-emerald-400">{claimedMsg}</p>}
    </div>
  )
}
