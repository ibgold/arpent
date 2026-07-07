import { useState } from 'react'
import { BALANCE, RARITY_ORDER, type Rarity } from '../../core/balance/constants'
import { REGIONS } from '../../core/balance/regions'
import { SKILLS, skillPointsAvailable } from '../../core/balance/skills'
import { affixLine, CATALOG_SIZE, RELIC_DESCRIPTIONS } from '../../core/balance/affixes'
import { CATALOG, FORGE_CAP, type CatalogItem } from '../../core/balance/catalog'
import { ARCHETYPES } from '../../core/balance/weapons'
import { COLLECTION_UNLOCKS, hasRegionMastery, nextUnlock, regionSetIds } from '../../core/balance/collectionRewards'
import { equippedSetCounts, SETS, setOf } from '../../core/balance/sets'
import { pendingPerkPicks, PRESTIGE_PERKS } from '../../core/balance/prestigePerks'
import {
  COLLECTION_ATK_PER_ITEM,
  COLLECTION_HP_PER_ITEM,
  distanceBonusLevels,
  heroStats,
  itemStats,
  PRESTIGE_BONUS_PER_RANK,
  upgradeItemCost,
  useGameStore,
} from '../../core/state/store'
import type { ItemSlot } from '../../core/types'
import { formatDistance } from '../components/StatusBar'

const RARITY_DOT: Record<Rarity, string> = {
  common: 'bg-slate-500',
  rare: 'bg-sky-400',
  epic: 'bg-violet-400',
  legendary: 'bg-amber-400',
}

const SLOT_META: Record<ItemSlot, { icon: string; label: string }> = {
  weapon: { icon: '⚔️', label: 'Weapon' },
  armor: { icon: '🛡️', label: 'Armor' },
  charm: { icon: '🧿', label: 'Charm' },
}

type SubTab = 'hero' | 'collection' | 'records'

export function HeroView() {
  const [sub, setSub] = useState<SubTab>('hero')
  return (
    <div className="flex h-full flex-col font-mono">
      {/* Sous-navigation : trois espaces clairs au lieu d'un mur */}
      <div className="flex gap-1 border-b border-slate-800 bg-slate-900 p-2">
        {(
          [
            { id: 'hero', label: '🧙 Hero' },
            { id: 'collection', label: '📖 Collection' },
            { id: 'records', label: '🏆 Records' },
          ] as { id: SubTab; label: string }[]
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setSub(t.id)}
            className={`flex-1 rounded-lg py-2 text-xs font-bold ${
              sub === t.id ? 'bg-slate-700 text-white' : 'text-slate-500'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto flex max-w-lg flex-col gap-4">
          {sub === 'hero' && <HeroSub />}
          {sub === 'collection' && <CollectionSub />}
          {sub === 'records' && <RecordsSub />}
        </div>
      </div>
    </div>
  )
}

/* ============ HERO : stats, équipement, compétences ============ */

function HeroSub() {
  const state = useGameStore()
  const stats = heroStats(state)
  const xpNeeded = BALANCE.xpForLevel(state.hero.level)
  const milestones = distanceBonusLevels(state.totalDistanceM)
  const nextMilestone = BALANCE.distanceMilestonesM.find((m) => state.totalDistanceM < m)

  return (
    <>
      <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold">Lv {state.hero.level}</h2>
          <span className="text-xs text-slate-500">{state.hero.xp}/{xpNeeded} XP</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded bg-slate-800">
          <div className="h-full bg-violet-500" style={{ width: `${(state.hero.xp / xpNeeded) * 100}%` }} />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
          <div className="rounded bg-slate-950 p-2"><div className="font-bold text-rose-300">{stats.maxHp}</div><div className="text-[10px] text-slate-500">MAX HP</div></div>
          <div className="rounded bg-slate-950 p-2"><div className="font-bold text-amber-300">{stats.atk}</div><div className="text-[10px] text-slate-500">ATK</div></div>
          <div className="rounded bg-slate-950 p-2"><div className="font-bold text-sky-300">{stats.speed}</div><div className="text-[10px] text-slate-500">SPEED</div></div>
        </div>
        <p className="mt-2 text-[11px] text-slate-500">
          👟 Walking bonus: +{milestones * 10} HP, +{Math.round(milestones * 1.5)} ATK
          {nextMilestone && <> · next at {formatDistance(nextMilestone)}</>}
        </p>
      </section>

      <Loadout />
      <SkillsSection />
    </>
  )
}

/** L'équipement : 3 cartes de slot, tap → sélecteur des objets possédés du slot */
function Loadout() {
  const state = useGameStore()
  const [openSlot, setOpenSlot] = useState<ItemSlot | null>(null)
  const setCounts = equippedSetCounts(state.equipment.equipped)

  return (
    <section className="rounded-xl border border-emerald-900/50 bg-slate-900 p-4">
      <h3 className="mb-2 text-sm font-bold text-emerald-200">EQUIPMENT — tap a slot to change</h3>
      {/* Sets : 2 pièces = bonus mineur, 3 = majeur cumulé */}
      {[...setCounts.entries()].map(([setId, n]) => {
        const set = SETS.find((s) => s.id === setId)
        if (!set || n < 2) return null
        return (
          <div key={setId} className="mb-2 rounded-lg border border-violet-900/60 bg-violet-950/30 px-3 py-2 text-[11px]">
            <span className="font-bold text-violet-200">🧩 {set.icon} {set.name} ({n}/3)</span>
            <span className="ml-2 text-violet-300">{n >= 3 ? set.desc3 : set.desc2}</span>
          </div>
        )
      })}
      <div className="flex flex-col gap-2">
        {(['weapon', 'armor', 'charm'] as ItemSlot[]).map((slot) => {
          const id = state.equipment.equipped[slot]
          const item = id ? CATALOG.find((i) => i.id === id) : undefined
          const owned = id ? state.equipment.owned[id] : undefined
          const st = item && owned ? itemStats(item.id, owned.level) : null
          const isOpen = openSlot === slot
          const candidates = CATALOG.filter((i) => i.slot === slot && state.equipment.owned[i.id])
          return (
            <div key={slot}>
              <button
                onClick={() => setOpenSlot(isOpen ? null : slot)}
                className={`flex w-full items-center gap-3 rounded-lg border p-2.5 text-left text-xs ${
                  isOpen ? 'border-emerald-500' : item ? 'border-slate-700' : 'border-dashed border-slate-700'
                }`}
              >
                <span className="text-xl">{SLOT_META[slot].icon}</span>
                <div className="flex-1">
                  {item && owned && st ? (
                    <>
                      <div className="font-bold text-slate-100">
                        {item.relicEffect && '✦ '}{item.name}
                        {owned.level > 0 && <span className="text-amber-300"> +{owned.level}</span>}
                      </div>
                      <div className="text-slate-400">
                        {slot === 'weapon' && `${ARCHETYPES[item.archetype ?? 'blade'].icon} `}
                        {[st.atk && `+${st.atk} ATK`, st.hp && `+${st.hp} HP`, st.speed && `+${st.speed} SPD`].filter(Boolean).join(' · ')}
                      </div>
                    </>
                  ) : (
                    <span className="text-slate-500">{SLOT_META[slot].label} — empty</span>
                  )}
                </div>
                {item && owned && <ForgeButton itemId={item.id} level={owned.level} rarity={item.rarity} />}
                <span className="text-slate-600">{isOpen ? '▾' : '▸'}</span>
              </button>
              {isOpen && (
                <div className="mt-1 flex flex-col gap-1 rounded-lg bg-slate-950 p-2">
                  {candidates.length === 0 && <p className="text-[11px] text-slate-600">Nothing owned for this slot yet.</p>}
                  {candidates.map((c) => {
                    const cOwned = state.equipment.owned[c.id]
                    const cSt = itemStats(c.id, cOwned.level)
                    const equipped = state.equipment.equipped[slot] === c.id
                    return (
                      <button
                        key={c.id}
                        onClick={() => { state.equipItem(c.id); setOpenSlot(null) }}
                        className={`flex items-center gap-2 rounded px-2 py-1.5 text-left text-[11px] ${
                          equipped ? 'bg-emerald-950 text-emerald-200' : 'text-slate-300 hover:bg-slate-900'
                        }`}
                      >
                        <span className={`h-2 w-2 rounded-full ${RARITY_DOT[c.rarity]}`} />
                        <span className="flex-1 font-bold">
                          {c.relicEffect && '✦ '}{c.name}{cOwned.level > 0 && <span className="text-amber-300"> +{cOwned.level}</span>}
                          {setOf(c.id) && <span className="ml-1 text-violet-400" title={setOf(c.id)?.name}>🧩</span>}
                        </span>
                        <span className="text-slate-500">
                          {[cSt.atk && `${cSt.atk}A`, cSt.hp && `${cSt.hp}H`, cSt.speed && `${cSt.speed}S`].filter(Boolean).join(' ')}
                        </span>
                        {equipped && <span>✓</span>}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function ForgeButton({ itemId, level, rarity }: { itemId: string; level: number; rarity: Rarity }) {
  const state = useGameStore()
  const cost = upgradeItemCost(itemId, level)
  const capped = level >= FORGE_CAP[rarity]
  const affordable = state.gold >= cost.gold && state.essence >= cost.essence && state.wood >= cost.wood && state.stone >= cost.stone
  if (capped) return <span className="text-[10px] font-bold text-amber-400">MAX</span>
  return (
    <span
      role="button"
      onClick={(e) => { e.stopPropagation(); state.upgradeItem(itemId) }}
      className={`rounded px-2 py-1 text-[10px] font-bold ${affordable ? 'bg-amber-700 text-white' : 'bg-slate-800 text-slate-600'}`}
      title={`${cost.gold}g ${cost.essence}⚗${cost.wood ? ` ${cost.wood}🪵` : ''}${cost.stone ? ` ${cost.stone}🪨` : ''}`}
    >
      ⚒ {cost.gold}g {cost.essence}⚗
    </span>
  )
}

function SkillsSection() {
  const hero = useGameStore((s) => s.hero)
  const buySkill = useGameStore((s) => s.buySkill)
  const points = skillPointsAvailable(hero.level, hero.skills)

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="text-sm font-bold text-slate-400">SKILLS</h3>
        <span className={`text-xs font-bold ${points > 0 ? 'text-emerald-400' : 'text-slate-600'}`}>{points} pt{points !== 1 ? 's' : ''}</span>
      </div>
      <div className="flex flex-col gap-1">
        {SKILLS.map((skill) => {
          const owned = hero.skills.includes(skill.id)
          const levelOk = hero.level >= skill.minLevel
          return (
            <div key={skill.id} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs ${owned ? 'bg-emerald-950/40 text-emerald-300' : levelOk ? 'bg-slate-950 text-slate-300' : 'bg-slate-950 text-slate-600'}`}>
              <span className="flex-1">
                <b>{skill.name}</b> · {skill.description}{!levelOk && ` (Lv ${skill.minLevel})`}
              </span>
              {owned ? <span>✓</span> : levelOk && points > 0 ? (
                <button onClick={() => buySkill(skill.id)} className="rounded bg-violet-700 px-2 py-1 font-bold text-white">Learn</button>
              ) : null}
            </div>
          )
        })}
      </div>
    </section>
  )
}

/* ============ COLLECTION : la chasse ============ */

function CollectionSub() {
  const state = useGameStore()
  const discovered = Object.keys(state.equipment.owned).length
  const next = nextUnlock(state)
  const [showUnlocks, setShowUnlocks] = useState(false)
  const [showMastery, setShowMastery] = useState(false)

  return (
    <>
      <section className="rounded-xl border border-amber-900/50 bg-slate-900 p-4">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-bold text-amber-200">📖 {discovered}/{CATALOG_SIZE} discovered</h3>
          <span className="text-xs text-violet-300">⚗ {Math.round(state.essence)}</span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded bg-slate-800">
          <div className="h-full bg-gradient-to-r from-amber-600 to-amber-400" style={{ width: `${(discovered / CATALOG_SIZE) * 100}%` }} />
        </div>
        <p className="mt-1.5 text-[11px] text-slate-500">
          Each find: +{COLLECTION_HP_PER_ITEM} HP, +{COLLECTION_ATK_PER_ITEM} ATK forever. Duplicates → Essence ⚗.
        </p>

        {/* Le prochain déblocage seulement — la liste complète au tap */}
        <button onClick={() => setShowUnlocks(!showUnlocks)} className="mt-2 w-full rounded-lg bg-slate-950 px-3 py-2 text-left text-xs">
          {next ? (
            <span className="text-slate-300">🔒 Next unlock at <b>{next.count}</b>: {next.icon} <b>{next.name}</b> — {next.description}</span>
          ) : (
            <span className="text-amber-300">★ Everything unlocked!</span>
          )}
          <span className="float-right text-slate-600">{showUnlocks ? '▾' : '▸'}</span>
        </button>
        {showUnlocks && (
          <div className="mt-1 flex flex-col gap-1">
            {COLLECTION_UNLOCKS.map((u) => {
              const done = discovered >= u.count
              return (
                <div key={u.id} className={`rounded px-3 py-1 text-[11px] ${done ? 'bg-emerald-950/40 text-emerald-300' : 'bg-slate-950 text-slate-600'}`}>
                  {done ? '✓' : u.count} · {u.icon} <b>{u.name}</b> — {u.description}
                </div>
              )
            })}
          </div>
        )}

        <button onClick={() => setShowMastery(!showMastery)} className="mt-2 w-full rounded-lg bg-slate-950 px-3 py-2 text-left text-xs">
          <span className="text-slate-300">★ Region mastery (full set = +15% dmg, −15% drain there)</span>
          <span className="float-right text-slate-600">{showMastery ? '▾' : '▸'}</span>
        </button>
        {showMastery && (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {REGIONS.map((r) => {
              const set = regionSetIds(r)
              const ownedInSet = set.filter((id) => state.equipment.owned[id]).length
              const mastered = hasRegionMastery(state, r.id)
              return (
                <span key={r.id} className={`rounded px-2 py-1 text-[11px] ${mastered ? 'bg-amber-950 font-bold text-amber-300' : 'bg-slate-950 text-slate-500'}`}>
                  {mastered ? '★ ' : ''}{r.name} {ownedInSet}/{set.length}
                </span>
              )
            })}
          </div>
        )}
      </section>

      {(['weapon', 'armor', 'charm'] as ItemSlot[]).map((slot) => (
        <SlotCollection key={slot} slot={slot} />
      ))}
    </>
  )
}

function SlotCollection({ slot }: { slot: ItemSlot }) {
  const state = useGameStore()
  const [open, setOpen] = useState(false)
  const items = CATALOG.filter((i) => i.slot === slot).sort(
    (a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity),
  )
  const found = items.filter((i) => state.equipment.owned[i.id]).length

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-3">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between text-xs font-bold text-slate-300">
        <span>{SLOT_META[slot].icon} {SLOT_META[slot].label}s</span>
        <span className="text-slate-500">{found}/{items.length} {open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="mt-2 flex flex-col gap-1">
          {items.map((item) => <CollectionEntry key={item.id} item={item} />)}
        </div>
      )}
    </section>
  )
}

/** Entrée compacte : une ligne, tap pour les détails */
function CollectionEntry({ item }: { item: CatalogItem }) {
  const state = useGameStore()
  const [expanded, setExpanded] = useState(false)
  const owned = state.equipment.owned[item.id]
  const equipped = state.equipment.equipped[item.slot] === item.id

  if (!owned) {
    const hint = item.pool === 'road' ? '👟 road' : item.pool === 'combat' ? `⚔️ ${REGIONS[item.minRegion]?.name ?? ''}${item.minDepth > 1 ? ` D${item.minDepth}+` : ''}` : 'anywhere'
    return (
      <div className="flex items-center gap-2 rounded bg-slate-950/60 px-2 py-1 text-[11px] text-slate-600">
        <span className={`h-2 w-2 rounded-full opacity-40 ${RARITY_DOT[item.rarity]}`} />
        <span>{item.relicEffect ? '✦' : '◆'} ???</span>
        <span className="ml-auto">{hint}</span>
      </div>
    )
  }

  const st = itemStats(item.id, owned.level)
  return (
    <div className={`rounded bg-slate-950 ${equipped ? 'ring-1 ring-emerald-600' : ''}`}>
      <button onClick={() => setExpanded(!expanded)} className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-[11px]">
        <span className={`h-2 w-2 rounded-full ${RARITY_DOT[item.rarity]}`} />
        <span className="flex-1 font-bold text-slate-200">
          {item.relicEffect && '✦ '}{item.name}
          {owned.level > 0 && <span className="text-amber-300"> +{owned.level}</span>}
          {equipped && <span className="text-emerald-400"> ✓</span>}
        </span>
        <span className="text-slate-500">
          {[st.atk && `${st.atk}A`, st.hp && `${st.hp}H`, st.speed && `${st.speed}S`].filter(Boolean).join(' ')}
        </span>
        <span className="text-slate-600">{expanded ? '▾' : '▸'}</span>
      </button>
      {expanded && (
        <div className="border-t border-slate-800 px-2 py-2 text-[11px]">
          {item.slot === 'weapon' && (
            <div className="text-slate-400">{ARCHETYPES[item.archetype ?? 'blade'].icon} {ARCHETYPES[item.archetype ?? 'blade'].label}</div>
          )}
          {item.effect && <div className="text-sky-300/80">• {affixLine(item.effect)}</div>}
          {item.relicEffect && <div className="font-bold text-amber-300">★ {RELIC_DESCRIPTIONS[item.relicEffect]}</div>}
          {setOf(item.id) && (
            <div className="text-violet-300">
              🧩 {setOf(item.id)!.name} set — 2p: {setOf(item.id)!.desc2} · 3p: {setOf(item.id)!.desc3}
            </div>
          )}
          <div className="mt-1 italic text-slate-600">“{item.flavor}”</div>
          <div className="mt-2 flex gap-2">
            <ForgeButton itemId={item.id} level={owned.level} rarity={item.rarity} />
            {!equipped && (
              <button onClick={() => state.equipItem(item.id)} className="rounded bg-emerald-700 px-2 py-1 text-[10px] font-bold text-white">
                Equip
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ============ RECORDS : trophées & renaissance ============ */

function RecordsSub() {
  const state = useGameStore()
  return (
    <>
      <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <h3 className="mb-2 text-sm font-bold text-slate-400">BESTIARY ({state.collections.bestiary.length}/6)</h3>
        <div className="flex flex-wrap gap-2 text-xs">
          {['chaser', 'shooter', 'brute', 'splitter', 'dasher', 'boss'].map((kind) => (
            <span key={kind} className={`rounded px-2 py-1 capitalize ${state.collections.bestiary.includes(kind) ? 'bg-emerald-950 text-emerald-300' : 'bg-slate-950 text-slate-700'}`}>
              {state.collections.bestiary.includes(kind) ? kind : '???'}
            </span>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <h3 className="mb-2 text-sm font-bold text-slate-400">
          REGIONS AWAKENED ({state.collections.regions.length}/{REGIONS.length}) · DEPTH {state.progression.depth}
        </h3>
        {(state.colosseumBest ?? 0) > 0 && (
          <p className="mb-2 text-xs text-amber-300">🏟 Colosseum best wave: {state.colosseumBest}</p>
        )}
        <div className="flex flex-wrap gap-2 text-xs">
          {REGIONS.map((region) => {
            const awakened = state.collections.regions.includes(region.id)
            const unlocked = state.progression.unlockedRegions.includes(region.id)
            return (
              <span key={region.id} className={`rounded px-2 py-1 ${awakened ? 'bg-amber-950 text-amber-300' : unlocked ? 'bg-slate-800 text-slate-400' : 'bg-slate-950 text-slate-700'}`}>
                {awakened ? `☀ ${region.name}` : unlocked ? region.name : '🔒 ???'}
              </span>
            )
          })}
        </div>
      </section>

      <PrestigeSection />
    </>
  )
}

function PrestigeSection() {
  const state = useGameStore()
  const prestige = state.prestige
  const bossesDefeated = state.progression.bossesDefeated
  const rebirth = state.rebirth
  const eligible = bossesDefeated.length >= REGIONS.length
  const picks = pendingPerkPicks(state)

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-bold text-slate-400">REBIRTH</h3>
        {prestige.rank > 0 && (
          <span className="text-xs font-bold text-amber-300">
            Rank {prestige.rank} · +{Math.round(prestige.rank * PRESTIGE_BONUS_PER_RANK * 100)}% ATK & energy
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Awaken all {REGIONS.length} regions, then be reborn: hero, gold and village reset — you keep your Collection,
        steps, villagers, garden and Depth. +10% permanent ATK & energy per rank, plus one starting perk of your choice.
      </p>
      {/* Perks de prestige : un choix par rang, cumulables */}
      {picks > 0 && (
        <div className="mt-3 rounded-lg border border-amber-700/60 bg-amber-950/30 p-2">
          <p className="mb-1.5 text-[11px] font-bold text-amber-200">
            ☀ {picks} perk choice{picks > 1 ? 's' : ''} available — pick one:
          </p>
          <div className="flex flex-col gap-1">
            {PRESTIGE_PERKS.map((p) => (
              <button
                key={p.id}
                onClick={() => state.pickPrestigePerk(p.id)}
                className="flex items-center gap-2 rounded bg-slate-950 px-2 py-1.5 text-left text-[11px] text-slate-200 hover:bg-slate-800"
              >
                <span>{p.icon}</span>
                <span className="flex-1"><b>{p.name}</b> — {p.desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {prestige.perks.length > 0 && (
        <p className="mt-2 text-[11px] text-slate-400">
          Perks:{' '}
          {PRESTIGE_PERKS.filter((p) => prestige.perks.includes(p.id)).map((p) => {
            const n = prestige.perks.filter((x) => x === p.id).length
            return `${p.icon} ${p.name}${n > 1 ? ` ×${n}` : ''}`
          }).join(' · ')}
        </p>
      )}
      <button
        onClick={() => rebirth()}
        disabled={!eligible}
        className="mt-3 w-full rounded-lg bg-amber-600 py-2.5 text-sm font-bold text-white disabled:bg-slate-800 disabled:text-slate-600"
      >
        {eligible ? '☀ Be reborn' : `Defeat all bosses first (${bossesDefeated.length}/${REGIONS.length})`}
      </button>
    </section>
  )
}
