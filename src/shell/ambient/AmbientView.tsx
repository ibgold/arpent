import { useEffect, useRef, useState } from 'react'
import { BALANCE } from '../../core/balance/constants'
import { type ChestReward } from '../../core/balance/chests'
import { chestDistanceM } from '../../core/balance/prestigePerks'
import { questLabel } from '../../core/balance/quests'
import { catalogItem } from '../../core/balance/catalog'
import { chestCapacity, roadFindDistance, useGameStore } from '../../core/state/store'
import { walkManager } from '../../input/walkManager'
import { BELT_MIN_KMH, BELT_MAX_KMH } from '../../input/TreadmillSource'
import { walkLog, type WalkTotals } from '../../core/walkLog'
import type { WalkDayRow } from '../../core/save/db'
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
      <WalkJournalPanel />
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
        {/* Le tapis connecté en Bluetooth : le mode phare (vitesse & pas réels, zéro réglage) */}
        <button
          onClick={() => setSettings({ inputMode: 'treadmill' })}
          className={`mb-2 w-full rounded-lg py-2.5 text-sm font-bold ${
            settings.inputMode === 'treadmill' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-emerald-300'
          }`}
        >
          🏃 Treadmill (Bluetooth) — recommended
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

        {settings.inputMode === 'treadmill' && <TreadmillPanel />}
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

/** Le Journal de marche 📖 : la trace de la marche RÉELLE. Indépendant de la save du jeu
 *  (reset du jeu → journal intact) ; il a son propre reset et son édition. */
function WalkJournalPanel() {
  const [rows, setRows] = useState<WalkDayRow[]>([])
  const [totals, setTotals] = useState<WalkTotals | null>(null)
  const [editing, setEditing] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  const refresh = async () => {
    setRows(await walkLog.getRecent(30))
    setTotals(await walkLog.getTotals())
  }
  useEffect(() => {
    void refresh()
    const t = setInterval(() => { if (!editing) void refresh() }, 5000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing])

  // Les 14 derniers jours CALENDAIRES (les jours sans marche comptent — et se voient)
  const bars: { day: string; meters: number }[] = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    bars.push({ day: key, meters: rows.find((r) => r.day === key)?.meters ?? 0 })
  }
  const maxM = Math.max(1000, ...bars.map((b) => b.meters))

  return (
    <div className="w-full max-w-sm rounded-xl border border-sky-900/60 bg-slate-900 p-4">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-sm font-bold text-sky-200">📖 Walk journal</h3>
        <button onClick={() => setEditing(!editing)} className="rounded bg-slate-800 px-2 py-1 text-[11px] text-slate-400">
          {editing ? 'Done' : '✎ Edit'}
        </button>
      </div>
      <p className="mb-2 text-[10px] text-slate-600">Your real walking — survives game resets.</p>

      {/* 14 jours en barres */}
      <div className="flex h-16 items-end gap-1">
        {bars.map((b) => (
          <div key={b.day} className="flex-1" title={`${b.day} · ${(b.meters / 1000).toFixed(2)} km`}>
            <div
              className={`w-full rounded-t ${b.meters > 0 ? 'bg-sky-500' : 'bg-slate-800'}`}
              style={{ height: `${Math.max(3, (b.meters / maxM) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-0.5 flex justify-between text-[9px] text-slate-600">
        <span>{bars[0].day.slice(5)}</span><span>today</span>
      </div>

      {totals && (
        <div className="mt-2 grid grid-cols-4 gap-1 text-center">
          <div><div className="font-bold text-sky-300">{(totals.meters / 1000).toFixed(1)}</div><div className="text-[9px] text-slate-500">km total</div></div>
          <div><div className="font-bold text-sky-300">{Math.round(totals.steps).toLocaleString()}</div><div className="text-[9px] text-slate-500">steps</div></div>
          <div><div className="font-bold text-sky-300">{totals.days}</div><div className="text-[9px] text-slate-500">days</div></div>
          <div><div className="font-bold text-sky-300">{(totals.bestDayMeters / 1000).toFixed(1)}</div><div className="text-[9px] text-slate-500">best km</div></div>
        </div>
      )}

      {/* Édition : corriger un jour, en supprimer, ou reset le journal SEUL */}
      {editing && (
        <div className="mt-3 border-t border-slate-800 pt-2">
          <div className="flex max-h-44 flex-col gap-1 overflow-y-auto">
            {rows.length === 0 && <p className="text-[11px] text-slate-600">No walks recorded yet.</p>}
            {rows.map((r) => (
              <div key={r.day} className="flex items-center gap-1.5 text-[11px]">
                <span className="w-[74px] text-slate-400">{r.day.slice(5)}</span>
                <input
                  type="number" min={0} step={0.01} value={Number((r.meters / 1000).toFixed(2))}
                  onChange={(e) => {
                    const km = Math.max(0, Number(e.target.value) || 0)
                    void walkLog.updateDay(r.day, { meters: km * 1000 }).then(refresh)
                  }}
                  className="w-16 rounded border border-slate-700 bg-slate-950 px-1 py-0.5 text-right text-sky-200"
                />
                <span className="text-slate-600">km</span>
                <input
                  type="number" min={0} step={100} value={Math.round(r.steps)}
                  onChange={(e) => {
                    const st = Math.max(0, Number(e.target.value) || 0)
                    void walkLog.updateDay(r.day, { steps: st }).then(refresh)
                  }}
                  className="w-16 rounded border border-slate-700 bg-slate-950 px-1 py-0.5 text-right text-sky-200"
                />
                <span className="text-slate-600">steps</span>
                <button onClick={() => void walkLog.deleteDay(r.day).then(refresh)} className="ml-auto text-rose-500">✕</button>
              </div>
            ))}
          </div>
          {!confirmReset ? (
            <button onClick={() => setConfirmReset(true)} className="mt-2 w-full rounded-lg bg-slate-800 py-1.5 text-[11px] text-rose-400">
              Reset journal (game save untouched)
            </button>
          ) : (
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => { void walkLog.resetAll().then(refresh); setConfirmReset(false) }}
                className="flex-1 rounded-lg bg-rose-700 py-1.5 text-[11px] font-bold text-white"
              >
                Yes, erase my walk history
              </button>
              <button onClick={() => setConfirmReset(false)} className="flex-1 rounded-lg bg-slate-800 py-1.5 text-[11px]">Cancel</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/** Le tapis Bluetooth : bouton de connexion (geste requis) + diagnostics live vitesse/pas */
function TreadmillPanel() {
  const [, force] = useState(0)
  const [connecting, setConnecting] = useState(false)
  // Curseur de vitesse : valeur locale pendant le glissement, envoi débouncé (250 ms)
  const [sliderVal, setSliderVal] = useState<number | null>(null)
  const sendTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 500)
    return () => clearInterval(t)
  }, [])
  const t = walkManager.treadmill
  const supported = t.supported

  const sendSpeed = (kmh: number) => {
    setSliderVal(kmh)
    clearTimeout(sendTimer.current)
    sendTimer.current = setTimeout(() => {
      void t.setBeltSpeed(kmh).then(() => setSliderVal(null))
    }, 250)
  }

  const connect = async () => {
    setConnecting(true)
    await t.connect()
    setConnecting(false)
  }

  const label =
    t.status === 'active' ? `🟢 Connected to ${t.deviceName || 'treadmill'} — just walk`
    : t.status === 'connecting' || connecting ? '⏳ Connecting…'
    : t.status === 'lost' ? '🔴 Connection lost — reconnect'
    : t.status === 'denied' ? '🔴 Could not connect'
    : t.status === 'unavailable' ? '🟠 Web Bluetooth unavailable on this browser'
    : '⚪ Not connected'

  return (
    <div className="mb-3 rounded-lg bg-slate-950 p-3 text-xs">
      <p className="font-bold text-slate-200">{label}</p>
      {t.status === 'active' && (
        <>
          <p className="mt-1 font-mono text-emerald-300/80">
            {t.lastSpeedKmh.toFixed(1)} km/h · {(t.treadmillDistanceM / 1000).toFixed(2)} km · {t.variantName}
          </p>
          <p className="mt-1 select-text font-mono text-slate-500">
            frames {t.notifCount}{t.lastFrameHex ? ` · ${t.lastFrameHex}` : ' · (no data yet — send me this)'}
          </p>
          {t.lastSentHex && (
            <p className="mt-0.5 select-text font-mono text-sky-400/70">sent: {t.lastSentHex}</p>
          )}
          {/* Contrôle du tapis : ⚠ agit sur le vrai bandeau sous tes pieds */}
          {t.lastSpeedKmh <= 0 && t.targetSpeedKmh <= 0 ? (
            <button
              onClick={() => void t.startBelt()}
              className="mt-2 w-full rounded-lg bg-emerald-700 py-2.5 text-sm font-bold text-white"
            >
              ▶ Start belt
            </button>
          ) : (
            (() => {
              const shown = sliderVal ?? (t.targetSpeedKmh > 0 ? t.targetSpeedKmh : t.lastSpeedKmh)
              return (
                <>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="font-mono text-sm font-bold text-emerald-300">→ {shown.toFixed(1)} km/h</span>
                    <button onClick={() => void t.stopBelt()} className="rounded-lg bg-rose-800 px-4 py-1.5 text-sm font-bold text-white">
                      ⏹ Stop
                    </button>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <button onClick={() => sendSpeed(Math.max(BELT_MIN_KMH, Math.round((shown - 0.1) * 10) / 10))} className="h-10 w-12 rounded-lg bg-slate-800 text-lg">−</button>
                    <input
                      type="range" min={BELT_MIN_KMH} max={BELT_MAX_KMH} step={0.1} value={shown}
                      onChange={(e) => sendSpeed(Number(e.target.value))}
                      className="flex-1 accent-emerald-500"
                    />
                    <button onClick={() => sendSpeed(Math.min(6, Math.round((shown + 0.1) * 10) / 10))} className="h-10 w-12 rounded-lg bg-slate-800 text-lg">+</button>
                  </div>
                </>
              )
            })()
          )}
          <p className="mt-1 text-[10px] text-slate-600">−/+ = 0.1 km/h · slider for big jumps · capped at 6.0 km/h (use the remote beyond).</p>
        </>
      )}
      {/* L'erreur RESTE affichée (sélectionnable) jusqu'au prochain essai : c'est notre diagnostic */}
      {t.lastError && <p className="mt-1 select-text break-words text-rose-400">{t.lastError}</p>}
      {supported ? (
        t.status !== 'active' && (
          <button
            onClick={() => void connect()}
            disabled={connecting}
            className="mt-2 w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-bold text-white disabled:bg-slate-700"
          >
            🔗 Connect treadmill
          </button>
        )
      ) : (
        <p className="mt-1 text-slate-500">
          This browser can't read Bluetooth. Use Chrome or Edge on Windows or Android.
        </p>
      )}
      <p className="mt-2 text-slate-600">
        Turn the treadmill on, tap Connect, then pick your treadmill in the browser popup. Its real speed and
        steps drive the game — no manual setting.
      </p>
      <p className="mt-1 text-slate-600">
        Treadmill not in the list? It only advertises when NOTHING is connected to it: unplug it 10 s,
        turn off your phone's Bluetooth (the PitPat app grabs it), and don't pair it in Windows settings.
      </p>
    </div>
  )
}

/** Statut du capteur réel : permission, activité, erreurs — plus les diagnostics de calibration */
function SensorStatus({ mode, hint }: { mode: 'gps' | 'motion'; hint: string }) {
  const [status, setStatus] = useState<'idle' | 'active' | 'denied' | 'unavailable'>('idle')
  const [diag, setDiag] = useState('')
  useEffect(() => {
    const read = () => {
      if (mode === 'gps') {
        const g = walkManager.gps
        setStatus(g.status)
        setDiag(g.fixCount > 0 ? `fixes ${g.fixCount} · rejected ${g.rejectedCount} · accuracy ${g.lastAccuracyM} m · last ${g.lastSpeedKmh} km/h` : '')
      } else {
        const p = walkManager.pedometer
        setStatus(p.status)
        setDiag(p.status === 'active' ? `steps ${p.stepsDetected} · force ${p.lastMagnitude.toFixed(1)} (peak ${p.peakMagnitude.toFixed(1)}) m/s²` : '')
      }
    }
    read()
    const t = setInterval(read, 500)
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
      {diag && <p className="mt-1 font-mono text-emerald-300/80">{diag}</p>}
      <p className="mt-1 text-slate-600">{hint}</p>
      {mode === 'motion' && (
        <p className="mt-1 text-slate-600">Calibrate live: Settings → ⚖️ Balance Lab → 📡 Sensors (peak threshold).</p>
      )}
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
