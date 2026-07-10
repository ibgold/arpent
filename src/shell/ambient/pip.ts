import { useGameStore } from '../../core/state/store'
import { gameEvents } from '../../game/bridge/events'
import { walkManager } from '../../input/walkManager'

// Widget flottant via Document Picture-in-Picture (Chromium).
// Compteur d'Énergie + contrôles : pause/reprise de la marche et ajustement de vitesse,
// sans avoir à revenir dans l'app.

interface DocumentPictureInPicture {
  requestWindow(options?: { width?: number; height?: number }): Promise<Window>
}

declare global {
  interface Window {
    documentPictureInPicture?: DocumentPictureInPicture
  }
}

export function isPipSupported(): boolean {
  return typeof window !== 'undefined' && !!window.documentPictureInPicture
}

const BTN_STYLE =
  'background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:8px;' +
  'font-size:16px;font-family:inherit;width:40px;height:34px;cursor:pointer'

export async function openPipWidget(): Promise<Window | null> {
  if (!window.documentPictureInPicture) return null
  const pip = await window.documentPictureInPicture.requestWindow({ width: 290, height: 210 })

  pip.document.body.innerHTML = `
    <div style="font-family:ui-monospace,monospace;background:#0f172a;color:#e2e8f0;height:100vh;
                display:flex;flex-direction:column;justify-content:center;align-items:center;gap:5px;margin:0">
      <div id="pip-energy" style="font-size:28px;font-weight:bold;color:#34d399;transition:transform 0.15s">⚡ 0</div>
      <div style="display:flex;gap:10px;align-items:baseline">
        <span id="pip-speed" style="font-size:13px;color:#94a3b8">idle</span>
        <span id="pip-distance" style="font-size:11px;color:#64748b"></span>
      </div>
      <div style="display:flex;gap:6px;margin-top:4px">
        <button id="pip-minus" style="${BTN_STYLE}">−</button>
        <button id="pip-pause" style="${BTN_STYLE};width:56px;background:#065f46;border-color:#059669">⏸</button>
        <button id="pip-plus" style="${BTN_STYLE}">+</button>
        <button id="pip-chest" style="${BTN_STYLE};width:56px;background:#78350f;border-color:#d97706">🎁 0</button>
      </div>
      <div id="pip-reward" style="font-size:11px;color:#fbbf24;min-height:14px"></div>
      <div id="pip-mode" style="font-size:10px;color:#475569"></div>
    </div>`
  pip.document.body.style.margin = '0'
  pip.document.title = 'Arpenteur'

  const el = (id: string) => pip.document.getElementById(id)!
  const energyEl = el('pip-energy')
  const speedEl = el('pip-speed')
  const distEl = el('pip-distance')
  const modeEl = el('pip-mode')
  const pauseBtn = el('pip-pause') as HTMLButtonElement
  const chestBtn = el('pip-chest') as HTMLButtonElement
  const rewardEl = el('pip-reward')

  let lastEnergy = Math.floor(useGameStore.getState().energy)

  const render = () => {
    const s = useGameStore.getState()
    const e = Math.floor(s.energy)
    energyEl.textContent = `⚡ ${e}`
    if (e > lastEnergy) {
      energyEl.style.transform = 'scale(1.12)'
      setTimeout(() => (energyEl.style.transform = 'scale(1)'), 150)
    }
    lastEnergy = e
    distEl.textContent =
      s.totalDistanceM >= 1000 ? `${(s.totalDistanceM / 1000).toFixed(2)} km` : `${Math.round(s.totalDistanceM)} m`
    modeEl.textContent =
      s.settings.inputMode === 'manual' ? 'manual — set your real speed'
      : s.settings.inputMode === 'gps' ? 'GPS — real outdoor distance'
      : s.settings.inputMode === 'motion' ? 'pedometer — real steps'
      : s.settings.inputMode === 'treadmill' ? 'treadmill — Bluetooth live'
      : 'simulation'
    chestBtn.textContent = `🎁 ${s.wanderChests.stored}`
    chestBtn.style.opacity = s.wanderChests.stored > 0 ? '1' : '0.4'
  }

  const renderPaused = (paused: boolean) => {
    pauseBtn.textContent = paused ? '▶' : '⏸'
    pauseBtn.style.background = paused ? '#7c2d12' : '#065f46'
    pauseBtn.style.borderColor = paused ? '#ea580c' : '#059669'
    if (paused) {
      speedEl.textContent = 'paused'
      speedEl.style.color = '#fb923c'
    }
  }

  const onSpeed = (kmh: number) => {
    if (walkManager.isPaused()) return
    speedEl.textContent = kmh > 0 ? `👟 ${kmh.toFixed(1)} km/h` : 'idle'
    speedEl.style.color = kmh > 0 ? '#34d399' : '#64748b'
  }

  const adjustSpeed = (delta: number) => {
    const s = useGameStore.getState()
    if (s.settings.inputMode === 'manual') {
      walkManager.manual.setSpeed(walkManager.manual.getSpeed() + delta)
    } else if (s.settings.inputMode === 'simulation') {
      s.setSettings({ simSpeedKmh: Math.max(0, Math.min(12, s.settings.simSpeedKmh + delta)) })
    }
    // GPS / podomètre : la vitesse vient du monde réel, rien à ajuster
  }

  el('pip-pause').addEventListener('click', () => walkManager.togglePause())
  el('pip-minus').addEventListener('click', () => adjustSpeed(-0.5))
  el('pip-plus').addEventListener('click', () => adjustSpeed(0.5))
  let rewardTimer: ReturnType<typeof setTimeout> | undefined
  chestBtn.addEventListener('click', () => {
    const reward = useGameStore.getState().openWanderChest()
    if (!reward) return
    rewardEl.textContent = `→ ${reward.label}`
    clearTimeout(rewardTimer)
    rewardTimer = setTimeout(() => (rewardEl.textContent = ''), 4000)
  })

  const unsub = useGameStore.subscribe(render)
  gameEvents.on('walk:speed', onSpeed)
  gameEvents.on('walk:paused', renderPaused)
  render()
  renderPaused(walkManager.isPaused())

  pip.addEventListener('pagehide', () => {
    unsub()
    gameEvents.off('walk:speed', onSpeed)
    gameEvents.off('walk:paused', renderPaused)
  })

  return pip
}
