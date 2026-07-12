import { useRef, useState } from 'react'
import { useGameStore } from '../../core/state/store'
import { exportSaveJson, importSaveJson, resetSave } from '../../core/save/persistence'
import { BALANCE_DEFAULTS, TUNABLE_GROUPS, type TunableDef } from '../../core/balance/tuning'
import { GARDEN_MODES } from '../../core/balance/garden'
import { gistSync } from '../../core/gistSync'

export function SettingsView() {
  const settings = useGameStore((s) => s.settings)
  const setSettings = useGameStore((s) => s.setSettings)
  const fileRef = useRef<HTMLInputElement>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [message, setMessage] = useState('')

  const download = () => {
    const blob = new Blob([exportSaveJson()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `arpenteur-save-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const onImportFile = async (file: File) => {
    try {
      await importSaveJson(await file.text())
      setMessage('Save imported ✓')
    } catch {
      setMessage('Invalid save file')
    }
  }

  return (
    <div className="h-full overflow-y-auto p-4 font-mono">
      <div className="mx-auto flex max-w-lg flex-col gap-4">
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <h3 className="mb-3 text-sm font-bold text-slate-400">FEEDBACK</h3>
          <Toggle label="Sound effects" value={settings.sound} onChange={(v) => setSettings({ sound: v })} />
          <Toggle label="Haptics (vibration)" value={settings.haptics} onChange={(v) => setSettings({ haptics: v })} />
          <Toggle label="Keep screen awake while walking" value={settings.keepAwake} onChange={(v) => setSettings({ keepAwake: v })} />
          <div className="mt-2 flex items-center justify-between py-1.5 text-sm">
            <span>Garden mode</span>
            <div className="flex gap-1.5">
              {(['chill', 'intense'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setSettings({ gardenMode: m })}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                    settings.gardenMode === m ? (m === 'chill' ? 'bg-emerald-700 text-white' : 'bg-orange-700 text-white') : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {m === 'chill' ? '🍃 Chill' : '🔥 Intense'}
                </button>
              ))}
            </div>
          </div>
          <p className="text-[11px] text-slate-600">
            Chill: plants wilt after {GARDEN_MODES.chill.wiltAfterDays} idle days, never die. Intense: wilt after{' '}
            {GARDEN_MODES.intense.wiltAfterDays}, compost {GARDEN_MODES.intense.compostAfterDays} days later, ×
            {GARDEN_MODES.intense.yieldMult} yields.
          </p>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <h3 className="mb-3 text-sm font-bold text-slate-400">SAVE DATA</h3>
          <div className="flex flex-col gap-2">
            <button onClick={download} className="rounded-lg bg-slate-800 py-2.5 text-sm text-slate-200">
              ⬇ Export save (JSON)
            </button>
            <button onClick={() => fileRef.current?.click()} className="rounded-lg bg-slate-800 py-2.5 text-sm text-slate-200">
              ⬆ Import save
            </button>
            <input
              ref={fileRef} type="file" accept="application/json" className="hidden"
              onChange={(e) => e.target.files?.[0] && void onImportFile(e.target.files[0])}
            />
            {/* Transfert inter-appareils : la save voyage par presse-papier (pas de serveur, pas de compte) */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(exportSaveJson())
                    .then(() => setMessage('Save copied — paste it on the other device ✓'))
                    .catch(() => setMessage('Clipboard unavailable'))
                }}
                className="flex-1 rounded-lg bg-slate-800 py-2.5 text-sm text-slate-200"
              >
                📋 Copy save
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.readText()
                    .then(async (t) => { await importSaveJson(t); setMessage('Save pasted & imported ✓') })
                    .catch(() => setMessage('Nothing valid in the clipboard'))
                }}
                className="flex-1 rounded-lg bg-slate-800 py-2.5 text-sm text-slate-200"
              >
                📥 Paste save
              </button>
            </div>
            {!confirmReset ? (
              <button onClick={() => setConfirmReset(true)} className="rounded-lg bg-slate-800 py-2.5 text-sm text-rose-400">
                Reset all progress
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => { void resetSave(); setConfirmReset(false); setMessage('Progress reset') }}
                  className="flex-1 rounded-lg bg-rose-700 py-2.5 text-sm font-bold text-white"
                >
                  Yes, wipe everything
                </button>
                <button onClick={() => setConfirmReset(false)} className="flex-1 rounded-lg bg-slate-800 py-2.5 text-sm">
                  Cancel
                </button>
              </div>
            )}
            {message && <p className="text-center text-xs text-emerald-400">{message}</p>}
          </div>
        </section>

        <JournalSync />

        <BalanceLab />

        <section className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-xs text-slate-500">
          <p className="font-bold text-slate-400">ARPENTEUR 2 — v2.0</p>
          <p className="mt-1">Energy only comes from walking. No notifications, no guilt — the world simply wakes up when you move.</p>
          <p className="mt-2">
            Combat: you auto-attack the nearest enemy. Standing still = full fire rate; moving = half rate and
            shorter range. WASD/ZQSD/arrows or left touch stick to move · Shift/K or right tap to dash · gamepad supported.
          </p>
        </section>
      </div>
    </div>
  )
}

/** Sync du Journal de marche ☁ : Gist GitHub privé, un jeton (scope gist) collé sur chaque appareil. */
function JournalSync() {
  const [token, setTokenInput] = useState(gistSync.token)
  const [, force] = useState(0)
  const [busy, setBusy] = useState(false)

  const doSync = async () => {
    setBusy(true)
    await gistSync.sync()
    setBusy(false)
    force((n) => n + 1)
  }

  return (
    <section className="rounded-xl border border-sky-900/60 bg-slate-900 p-4">
      <h3 className="mb-1 text-sm font-bold text-sky-300">☁ WALK JOURNAL SYNC</h3>
      <p className="mb-2 text-[11px] text-slate-500">
        Sync your walk history between devices through a <b>private GitHub Gist</b>. One-time setup:
        create a token at github.com → Settings → Developer settings → Personal access tokens (classic) →
        scope <b>gist only</b>, then paste it here on each device. Your data stays in YOUR account.
      </p>
      <div className="flex gap-2">
        <input
          type="password"
          value={token}
          onChange={(e) => setTokenInput(e.target.value)}
          placeholder="ghp_… (gist scope)"
          className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-xs text-slate-200"
        />
        <button
          onClick={() => { gistSync.setToken(token); void doSync() }}
          disabled={busy || !token}
          className="rounded-lg bg-sky-700 px-3 py-2 text-xs font-bold text-white disabled:bg-slate-800 disabled:text-slate-600"
        >
          {busy ? '…' : gistSync.enabled ? 'Sync now' : 'Save & sync'}
        </button>
      </div>
      <div className="mt-2 text-[11px]">
        {gistSync.state === 'ok' && (
          <p className="text-emerald-400">
            ✓ Synced {gistSync.lastSyncAt ? `at ${new Date(gistSync.lastSyncAt).toLocaleTimeString()}` : ''}
            {gistSync.lastPulled > 0 ? ` · ${gistSync.lastPulled} entries pulled` : ''}
          </p>
        )}
        {gistSync.state === 'error' && <p className="select-text text-rose-400">✗ {gistSync.lastError}</p>}
        {gistSync.state === 'syncing' && <p className="text-slate-400">Syncing…</p>}
        {gistSync.state === 'idle' && gistSync.enabled && <p className="text-slate-500">Auto-syncs when the app opens.</p>}
      </div>
      {gistSync.enabled && (
        <button
          onClick={() => { gistSync.setToken(''); setTokenInput(''); force((n) => n + 1) }}
          className="mt-2 text-[11px] text-slate-500 underline"
        >
          Remove token from this device
        </button>
      )}
    </section>
  )
}

/** Balance Lab : tous les paramètres d'équilibrage réglables en jeu, persistés dans la save. */
function BalanceLab() {
  const overrides = useGameStore((s) => s.balanceOverrides)
  const setOverride = useGameStore((s) => s.setBalanceOverride)
  const resetAll = useGameStore((s) => s.resetBalanceOverrides)
  const [open, setOpen] = useState(false)
  const [openGroup, setOpenGroup] = useState<string | null>(null)
  const overrideCount = Object.keys(overrides).length

  return (
    <section className="rounded-xl border border-violet-900/60 bg-slate-900 p-4">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between">
        <h3 className="text-sm font-bold text-violet-300">⚖️ BALANCE LAB</h3>
        <span className="text-xs text-slate-500">
          {overrideCount > 0 && <span className="mr-2 font-bold text-amber-400">{overrideCount} modified</span>}
          {open ? '▾' : '▸'}
        </span>
      </button>
      {open && (
        <>
          <p className="mt-1 text-[11px] text-slate-500">
            Tune the game without touching code. Changes apply to the <span className="text-slate-300">next run</span> and
            persist in your save. Amber = modified from default.
          </p>
          {TUNABLE_GROUPS.map((group) => (
            <div key={group.name} className="mt-2">
              <button
                onClick={() => setOpenGroup(openGroup === group.name ? null : group.name)}
                className="flex w-full items-center justify-between rounded-lg bg-slate-950 px-3 py-2 text-xs font-bold text-slate-300"
              >
                <span>{group.icon} {group.name}</span>
                <span className="text-slate-600">
                  {group.items.filter((i) => overrides[i.key] !== undefined).length > 0 &&
                    `${group.items.filter((i) => overrides[i.key] !== undefined).length} · `}
                  {openGroup === group.name ? '▾' : '▸'}
                </span>
              </button>
              {openGroup === group.name && (
                <div className="mt-1 flex flex-col gap-1">
                  {group.items.map((item) => (
                    <TunableRow key={item.key} item={item} value={overrides[item.key]} onChange={(v) => setOverride(item.key, v)} />
                  ))}
                </div>
              )}
            </div>
          ))}
          {overrideCount > 0 && (
            <button onClick={resetAll} className="mt-3 w-full rounded-lg bg-slate-800 py-2 text-xs font-bold text-rose-400">
              Reset ALL to defaults ({overrideCount} modified)
            </button>
          )}
        </>
      )}
    </section>
  )
}

function TunableRow({ item, value, onChange }: { item: TunableDef; value: number | undefined; onChange: (v: number | null) => void }) {
  const def = BALANCE_DEFAULTS[item.key]
  const current = value ?? def
  const modified = value !== undefined && value !== def
  return (
    <div className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs ${modified ? 'bg-amber-950/40' : 'bg-slate-950/60'}`}>
      <span className={`flex-1 ${modified ? 'font-bold text-amber-200' : 'text-slate-400'}`}>{item.label}</span>
      <span className="text-[10px] text-slate-600">def {def}</span>
      <input
        type="number"
        value={Number(current.toFixed(4))}
        min={item.min}
        max={item.max}
        step={item.step}
        onChange={(e) => {
          const v = Number(e.target.value)
          if (!Number.isFinite(v)) return
          onChange(Math.max(item.min, Math.min(item.max, v)))
        }}
        className={`w-20 rounded border bg-slate-900 px-1.5 py-1 text-right ${modified ? 'border-amber-600 text-amber-200' : 'border-slate-700 text-slate-200'}`}
      />
      {modified && (
        <button onClick={() => onChange(null)} className="rounded bg-slate-800 px-1.5 py-1 text-slate-400" title="Reset to default">
          ↺
        </button>
      )}
    </div>
  )
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between py-1.5 text-sm">
      <span>{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`h-7 w-12 rounded-full p-1 transition-colors ${value ? 'bg-emerald-600' : 'bg-slate-700'}`}
      >
        <span className={`block h-5 w-5 rounded-full bg-white transition-transform ${value ? 'translate-x-5' : ''}`} />
      </button>
    </label>
  )
}
