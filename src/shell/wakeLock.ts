import { useGameStore } from '../core/state/store'
import { gameEvents } from '../game/bridge/events'
import { walkManager } from '../input/walkManager'

// Screen Wake Lock : l'écran reste allumé tant qu'on marche (usage tapis).
// Acquis quand : réglage actif + vitesse > 0 + onglet visible + pas en pause.
// Relâché sinon. Fallback silencieux si l'API n'est pas supportée (iOS < 16.4, etc.).

let sentinel: WakeLockSentinel | null = null
let currentSpeed = 0

async function acquire(): Promise<void> {
  if (sentinel || !('wakeLock' in navigator)) return
  try {
    sentinel = await navigator.wakeLock.request('screen')
    sentinel.addEventListener('release', () => {
      sentinel = null
    })
  } catch {
    // refusé (batterie faible, permissions…) : tant pis, sans bruit
  }
}

function release(): void {
  void sentinel?.release()
  sentinel = null
}

function update(): void {
  const wanted =
    useGameStore.getState().settings.keepAwake &&
    currentSpeed > 0 &&
    document.visibilityState === 'visible' &&
    !walkManager.isPaused()
  if (wanted) void acquire()
  else release()
}

export function initWakeLock(): void {
  gameEvents.on('walk:speed', (kmh: number) => {
    currentSpeed = kmh
    update()
  })
  gameEvents.on('walk:paused', () => update())
  // Le wake lock est auto-relâché quand l'onglet se cache : on le reprend au retour
  document.addEventListener('visibilitychange', () => update())
  useGameStore.subscribe(() => update())
}
