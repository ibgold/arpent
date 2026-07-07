import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { BootScene } from './scenes/BootScene'
import { HubScene } from './scenes/HubScene'
import { RunScene } from './scenes/RunScene'

// Monte/démonte proprement l'instance Phaser. Aucune logique de jeu ici.

export function PhaserGame() {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game | null>(null)

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return
    // Flag de dev : ?forcebg fait tourner le jeu même en onglet masqué (tests automatisés)
    const forceBg = import.meta.env.DEV && new URLSearchParams(location.search).has('forcebg')
    gameRef.current = new Phaser.Game({
      fps: forceBg ? { forceSetTimeOut: true } : undefined,
      type: Phaser.AUTO,
      parent: containerRef.current,
      backgroundColor: '#0f172a',
      pixelArt: true,
      roundPixels: true,
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      physics: {
        default: 'arcade',
        arcade: { gravity: { x: 0, y: 0 }, debug: false },
      },
      input: { gamepad: true },
      scene: [BootScene, HubScene, RunScene],
    })
    if (forceBg) {
      const game = gameRef.current
      game.events.on(Phaser.Core.Events.HIDDEN, () => game.loop.resume())
    }
    return () => {
      gameRef.current?.destroy(true)
      gameRef.current = null
    }
  }, [])

  return <div ref={containerRef} className="absolute inset-0" />
}
