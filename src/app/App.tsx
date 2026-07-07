import { useState } from 'react'
import { PhaserGame } from '../game/PhaserGame'
import { RunHud } from '../shell/hud/RunHud'
import { ContractsModal } from '../shell/hud/ContractsModal'
import { StatusBar } from '../shell/components/StatusBar'
import { AmbientView } from '../shell/ambient/AmbientView'
import { HeroView } from '../shell/menus/HeroView'
import { GardenView } from '../shell/garden/GardenView'
import { BuildingSheet } from '../shell/village/BuildingSheet'
import { VillageEventModal } from '../shell/village/VillageEventModal'
import { SettingsView } from '../shell/settings/SettingsView'
import { useGameStore } from '../core/state/store'

type Tab = 'game' | 'garden' | 'hero' | 'ambient' | 'settings'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'game', label: 'Village', icon: '🔥' },
  { id: 'garden', label: 'Garden', icon: '🌱' },
  { id: 'hero', label: 'Hero', icon: '🧙' },
  { id: 'ambient', label: 'Walk', icon: '👟' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
]

export function App() {
  const [tab, setTab] = useState<Tab>('game')
  const inRun = useGameStore((s) => !!s.run)

  return (
    <div className="flex h-full flex-col bg-slate-950 text-slate-100">
      {!inRun && <StatusBar />}
      <main className="relative flex-1 overflow-hidden">
        {/* Le canvas Phaser reste monté en permanence : on masque juste la vue */}
        <div className={tab === 'game' ? 'absolute inset-0' : 'absolute inset-0 invisible'}>
          <PhaserGame />
          {/* Vignette d'ambiance par-dessus le canvas */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: 'radial-gradient(ellipse at center, transparent 55%, rgba(5,8,20,0.55) 100%)' }}
          />
          <RunHud />
          <BuildingSheet />
          <ContractsModal />
          <VillageEventModal />
        </div>
        {tab === 'garden' && <GardenView />}
        {tab === 'hero' && <HeroView />}
        {tab === 'ambient' && <AmbientView />}
        {tab === 'settings' && <SettingsView />}
      </main>
      {!inRun && (
        <nav className="flex border-t border-slate-800 bg-slate-900 pb-[env(safe-area-inset-bottom)]">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs ${
                tab === t.id ? 'text-emerald-400' : 'text-slate-500'
              }`}
            >
              <span className="text-lg leading-none">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>
      )}
    </div>
  )
}
