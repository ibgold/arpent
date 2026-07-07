import { useGameStore } from '../state/store'

// Petits sons synthétiques (WebAudio) : zéro asset, offline, toggleable.
// Swappable plus tard pour Howler + vrais samples sans toucher les appelants.

type SfxName = 'hit' | 'hurt' | 'crit' | 'loot' | 'lootRare' | 'levelUp' | 'victory' | 'dash' | 'shoot' | 'death' | 'upgrade'

let ctx: AudioContext | undefined

function audio(): AudioContext | undefined {
  if (!useGameStore.getState().settings.sound) return undefined
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return undefined
  }
}

function tone(freq: number, durS: number, type: OscillatorType, gainV: number, when = 0, slideTo?: number): void {
  const ac = audio()
  if (!ac) return
  const t0 = ac.currentTime + when
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + durS)
  gain.gain.setValueAtTime(gainV, t0)
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + durS)
  osc.connect(gain).connect(ac.destination)
  osc.start(t0)
  osc.stop(t0 + durS)
}

const sounds: Record<SfxName, () => void> = {
  shoot: () => tone(660, 0.07, 'square', 0.05, 0, 330),
  hit: () => tone(220, 0.08, 'square', 0.09, 0, 110),
  crit: () => {
    tone(880, 0.09, 'square', 0.1, 0, 440)
    tone(1320, 0.12, 'square', 0.07, 0.03)
  },
  hurt: () => tone(140, 0.18, 'sawtooth', 0.12, 0, 60),
  dash: () => tone(400, 0.1, 'sine', 0.06, 0, 800),
  loot: () => {
    tone(523, 0.08, 'sine', 0.08)
    tone(784, 0.1, 'sine', 0.08, 0.06)
  },
  lootRare: () => {
    tone(523, 0.09, 'sine', 0.09)
    tone(659, 0.09, 'sine', 0.09, 0.07)
    tone(784, 0.12, 'sine', 0.09, 0.14)
    tone(1047, 0.2, 'sine', 0.09, 0.21)
  },
  levelUp: () => {
    tone(392, 0.1, 'triangle', 0.1)
    tone(523, 0.1, 'triangle', 0.1, 0.08)
    tone(659, 0.18, 'triangle', 0.1, 0.16)
  },
  victory: () => {
    tone(523, 0.12, 'triangle', 0.1)
    tone(659, 0.12, 'triangle', 0.1, 0.1)
    tone(784, 0.12, 'triangle', 0.1, 0.2)
    tone(1047, 0.3, 'triangle', 0.12, 0.3)
  },
  death: () => tone(200, 0.5, 'sawtooth', 0.1, 0, 50),
  upgrade: () => {
    tone(440, 0.08, 'triangle', 0.08)
    tone(660, 0.12, 'triangle', 0.08, 0.06)
  },
}

export function playSfx(name: SfxName): void {
  sounds[name]()
}

export function vibrate(pattern: number | number[]): void {
  if (!useGameStore.getState().settings.haptics) return
  try {
    navigator.vibrate?.(pattern)
  } catch {
    // fallback silencieux
  }
}
