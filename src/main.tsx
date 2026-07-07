import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './app/App'
import { loadSave, startAutosave } from './core/save/persistence'
import { walkManager } from './input/walkManager'
import { initWakeLock } from './shell/wakeLock'

async function bootstrap() {
  await loadSave()
  startAutosave()
  walkManager.init()
  initWakeLock()
  if (import.meta.env.DEV) {
    // Accès console au store en dev (debug/tests uniquement)
    const { useGameStore } = await import('./core/state/store')
    const { gameEvents } = await import('./game/bridge/events')
    ;(window as unknown as Record<string, unknown>).__store = useGameStore
    ;(window as unknown as Record<string, unknown>).__events = gameEvents
    ;(window as unknown as Record<string, unknown>).__walk = walkManager
  }
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void bootstrap()
