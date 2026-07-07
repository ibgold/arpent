# ARPENTEUR 2 — Référence complète du jeu

Documentation exhaustive de TOUT le fonctionnement actuellement implémenté : marche, récompenses, village, combat, profondeurs, économie. Chaque chiffre vient de `src/core/balance/` (qui fait foi en cas de divergence). Dernière mise à jour : 2026-07-08.

> Le système d'objets v2 « la Collection » ([ITEMS.md](ITEMS.md)) est **implémenté** — voir §9-10.

## ⭐ Spécifique ARPENTEUR 2 (voir [ROADMAP-V2.md](ROADMAP-V2.md) pour le détail)

- **🏅 Défi quotidien** : 2 modificateurs déterministes par date (écran d'embarquement), victoire du boss = +300g × profondeur + graine rare + coffre, une fois/jour (`challenge.ts`, save v13).
- **🧩 Sets d'équipement** : 4 sets de 3 pièces, bonus à 2 et 3 pièces (`sets.ts`), badge dans EQUIPMENT.
- **☀ Perks de prestige** : un choix par rang de Renaissance, cumulables (`prestigePerks.ts`, save v14) — Waking Boon / Crowd Favor / Trail Caches.
- **😊 Humeurs & 🎀 cadeaux des Éveillés** : humeur du jour (production ±15%, moral ×2), 3 km de marche = un cadeau à réclamer (fiche du Foyer).
- **🧳 Événements de village** : 30% au retour de run — marchand, Éveillé perdu, festin (+20% PV) (`villageEvents.ts`).
- **🛰📳 Capteurs réels** : GPS et podomètre accéléromètre (onglet Walk), en plus de manual/simulation.
- **📋 Transfert de save** : copier/coller par presse-papier (Réglages).
- **🎨 Ambiances régionales** : voile de lumière + particules par région (braises, neige, pluie, sable, spores).
- **👑 Boss Rush** (3 boss requis) et **🏟 Colosseum** (1 boss requis, record de vague) : modes alternatifs à récompenses pures, sans progression de région.

---

## 1. La règle d'or

**L'Énergie ⚡ ne s'obtient QUE en marchant.** Elle ne remonte jamais avec le temps. Elle paie le lancement des expéditions et leur drain continu. Aucune notification, aucun rappel, aucune punition — motivation pull uniquement.

---

## 2. La marche

### Sources (`src/input/`)
- **Manual** : curseur 0–12 km/h que tu règles sur ta vitesse réelle de tapis.
- **Simulation** : vitesse constante (~ondulée) pour tester au bureau.
- Interface `WalkDataSource` commune : brancher un vrai capteur (podomètre, Health Connect, Bluetooth FTMS) = 1 classe, zéro refactor.
- **Pause/reprise** : bouton ⏸ dans l'onglet Walk ET dans le widget flottant. En pause : zéro gain, zéro production.

### Gain d'énergie (par seconde de marche)
```
gain = 0.5 × vitesse(km/h) × multiplicateurHybride × multiplicateurPrestige
```
- Hybride (marcher pendant une run) : ×1.25
- Prestige : ×(1 + 0.1 × rang)
- À 4 km/h : 2/s → une run (250⚡) ≈ 2 min de marche ; une run complète avec drain ≈ 10 min.

### Widget flottant (Document PiP, Chromium)
Reste au-dessus des autres fenêtres : énergie (pop à chaque gain), vitesse, distance, boutons **⏸/▶**, **−/+** (vitesse), **🎁** (ouvrir un coffre).

---

## 3. Les récompenses de marche

### Coffres du Marcheur 🎁
- **+1 coffre tous les 400 m** marchés, stock max 3 (jauge pleine = figée tant qu'on n'ouvre pas).
- Ouverture (onglet Walk, PiP, chip 🎁 clignotant dans la barre) — table :

| Récompense | Poids | Contenu |
|---|---|---|
| Or | 38 | 18–45 g |
| Bois | 20 | 4–9 🪵 |
| Pierre | 15 | 3–7 🪨 |
| Objet | 21 | item aléatoire |
| **JACKPOT** | 6 | 120–220 g |

### Commissions 📜
3 objectifs toujours actifs (onglet Walk), barre de progression temps réel, bouton **Claim!** → récompense + remplacement immédiat (jamais 2× le même type). Le tirage initial garantit une commission facile.

| Commission | Cibles | Récompense |
|---|---|---|
| ☠️ Slay {t} enemies | 15/25/40 | 40g + 30 XP |
| 👟 Walk {t} m | 600/1200/2000 | 35g + 5🪵 |
| 🚪 Clear {t} rooms | 5/8/12 | 6🪨 + 25g + 40 XP |
| 🐾 Rescue {t} villager(s) | 1/2 | 1 objet |
| 🎁 Open {t} chests | 2/3 | 55g |
| 👑 Defeat {t} boss(es) | 1 | 1 objet + 80g |
| ⭐ Kill {t} elites | 2/3 | 10🪵 + 6🪨 + 50 XP |

### Paliers de distance (à vie)
1 / 3 / 6 / 10 / 15 / 21 / 30 / 42 km : chaque palier franchi = **+10 PV max et +1.5 ATK permanents (plats)**. Jamais réinitialisés (même par la Renaissance).

### Quota de pas quotidien 🚶
Les pas sont dérivés de la distance (foulée 0.7 m). **Objectif journalier réglable** (2 000–30 000, défaut 6 000, boutons ±1000 dans l'onglet Walk) ; l'atteindre → **+100 or et +1 coffre bonus** (peut dépasser le cap de stock). Reset automatique à minuit.

### Série quotidienne
Compteur de jours consécutifs de marche (affiché onglet Walk).

---

## 4. Le Village

Scène 2D (pack pixel art CC0 Kenney Tiny Dungeon), gestion **diégétique** : on tape un bâtiment dans la scène → fiche contextuelle (construction, amélioration, assignation).

### Les 4 bâtiments

| Bâtiment | Produit (par Éveillé/s de marche) | **Bonus de combat permanent** | Coût Lv1 | Max |
|---|---|---|---|---|
| 🔥 The Hearth | — (multiplicateur global ×(1+0.1×(lv−1)) ; +2 lits/lv) | **+3% PV max / niveau** | 60g+25🪵+10🪨 | 5 |
| ⛩️ Waking Shrine | 0.12 or | **+2% or des kills / niveau** | 30g+15🪵 | 4 |
| 🪵 Lumber Hut | 0.07 bois | **+1.5% ATK / niveau** | 25g | 4 |
| ⛏️ Old Quarry | 0.05 pierre | **+2% XP des kills / niveau** | 40g+20🪵 | 4 |
| 🗼 Watchtower | — | **+5% d'énergie de marche / niveau** | 120g+40🪨 | 3 |
| 🛤️ Paved Road | — | **trouvailles de route −100 m / niveau** | 80g+60🪵 | 3 |
| 🗿 Waking Statue | — | **+1 lit d'Éveillé et +2% dégâts Hybride / niveau** | 200g+30🪵+30🪨 | 3 |

- Coûts ×1.6–1.7 par niveau. Places de travail = niveau du bâtiment.
- **La production ne tourne QUE pendant la marche** (pops +g/+🪵/+🪨 au-dessus des toits).
- Le village n'est pas une boucle fermée : ses niveaux buffent le héros, ses ressources nourrissent la Forge (§10).

### Les Éveillés 👥
- Villageois **secourus dans les cages** en expédition (marcher sur la cage). Capacité : 2 + 2×niveau du Foyer + niveau de la Statue.
- **L'acclamation du village** : chaque Éveillé (assigné ou non) donne **+0.5% de gain d'énergie de marche** (plafonné à +10%) — plus tu en sauves, plus marcher rapporte.
- 5 espèces visuelles, noms aléatoires. Assignés à un bâtiment via sa fiche → vivent et errent à côté de leur lieu de travail ; les non-assignés flânent près du Foyer.
- Village plein → la cage donne +25 or à la place.

---

## 5. Lancer une expédition

1. Choisir la **région** (◀ ▶) : débloquées en battant le boss de la précédente.
2. Choisir la **Profondeur** (− / + , visible dès la Profondeur 2 débloquée).
3. Taper le portail → **Contrats maudits** : 2 proposés (pool de 6), optionnels, cumulables — malus contre récompense :

| Contrat | Malédiction | Récompense |
|---|---|---|
| 💨 Swift Doom | ennemis +30% vitesse | +60% or |
| 🦴 Glass Bones | PV max −25% | +25% loot |
| ⛓️ Leaden Feet | dash désactivé | +50% XP |
| ⏳ Burning Hours | drain +35% | élites ×2 |
| 🪨 Dull Edge | dégâts −20% | +35% loot, +30% or |
| 👥 The Horde | +3 ennemis/salle | +40% XP, +20% or |

4. **Embark** (coût 250 ⚡). Une run = 6 salles, boss à la 6ᵉ.

### Économie d'une run
- Drain continu : `(1.5 + 0.15×salle) × (1 + 0.15×(profondeur−1))` ⚡/s, modifié par Warm Glow (−25%), affixes (−5-15%), contrat (+35%).
- **Énergie à zéro OU mort → retour au village avec TOUT le butin.** Jamais de perte.
- Refresh en pleine run → reprise exacte (salle, PV, capacités).

---

## 6. Le combat (façon Archero)

### Contrôles (une main suffit)
| Action | Clavier | Tactile | Manette |
|---|---|---|---|
| Déplacement | ZQSD/WASD/flèches | stick virtuel (moitié gauche) | stick gauche |
| Dash (i-frames) | Shift / K | tap moitié droite | B / X |
| Attaque | — automatique — | | |

### Le tir automatique
- Vise l'ennemi le plus proche (portée 540 px).
- **Immobile = cadence pleine** (480 ms de base). **En mouvement = cadence ×2.1 et portée ×0.75.** Se planter est le mode DPS, bouger le mode survie.
- Dash : 460 px/s, 180 ms, cooldown 900 ms, invulnérable pendant.
- Invulnérabilité après un coup subi : 450 ms seulement.
- Critique : 12% de base, dégâts ×2.2.

### Armes-archétypes (profil du tir, mains nues = épée)
| Archétype | Cadence | Dégâts | Taille bolt | Bonus |
|---|---|---|---|---|
| 🗡️ Blade | ×1 | ×1 | ×1 | — |
| 🔨 Hammer | ×1.8 | ×1.9 | ×1.7 | knockback + screen-shake |
| 🔪 Daggers | ×0.55 | ×0.55 | ×0.8 | +10% crit |

### XP de run & capacités (le moteur de build)
- Chaque kill lâche un **orbe verte** (60% de l'XP du monstre, min 3) qui vole vers toi (aimant 170 px).
- Jauge violette au HUD ; seuil du niveau n = 22 × 1.45^(n−1).
- **Chaque niveau de run : choix d'1 capacité parmi 3** (4 avec la Rootbound Crown), le monde se fige pendant le choix. Valable jusqu'à la fin de la run. **🎲 Reroll : rejouer l'offre coûte 30 ⚡** — l'énergie a un usage actif en combat.
- **Fin de run : tout le butin restant au sol est aspiré automatiquement** (objets acquis, ressources créditées) — le drop de boss n'est jamais perdu.

**Capacités d'attaque (se combinent) :** Multishot (2ᵉ bolt, 75%), Side Shots (2 latéraux, 50%), Rear Shot (arrière, 50%), Diagonal Shots (2 à ±25°, 50%), Ricochet (rebond vers un 2ᵉ ennemi ≤300 px, 70%), Piercing (traverse +1), Burning Bolts (brûlure : 3 ticks de 20% ATK/500 ms), Frost Bolts (ralenti 35% pendant 1.2 s), Heavy Bolts (+40% taille, +15% dégâts).

**Buffs généraux :** +25% dégâts, +15% vitesse, +25 PV max+soin, lifesteal 6%, +30% vitesse/portée de bolt, −25% cadence, +18% loot, +15% crit, −35% dash CD, +60% or, −25% drain.

### Structure d'une salle
nettoyer → **2 portes au choix** (💎 Treasure +35% loot · 🪵 Bounty ressources ×2.5 · 👑 Elite hunt +2 élites forcées · 🐾 Captive cage garantie) → salle suivante modifiée. Avant le boss : porte unique 👑.

### Salle à événement (1 par run, salles 2–5)
- 🩸 **Autel** : marcher dessus = −25% PV max → +1 capacité aléatoire.
- 🛖 **Marchand** : 3 articles au sol (soin complet ~25g / objet ~45g / capacité ~60g, ×multiplicateur de région), achetés en marchant dessus.

### Cages 🐾
35% de chance par salle (hors boss). **S'ouvrent au contact.** → Éveillé pour le village.

---

## 7. Le bestiaire

| Ennemi | PV | ATK | Vitesse | Comportement |
|---|---|---|---|---|
| Chaser (démon rouge) | 26 | 10 | 125 | fonce droit |
| Shooter (mage violet) | 20 | 8 | 75 | garde ses distances, tire (1.25 s) |
| Brute (grand démon) | 80 | 18 | 55 | charge ×4 sous 220 px |
| Splitter (slime) | 34 | 9 | 95 | zigzag ; **se scinde en 2 rats à la mort** |
| Mini (rat) | 10 | 6 | 150 | essaim rapide |
| Dasher (chauve-souris) | 24 | 12 | 80 | charge télégraphiée (flash 420 ms) ×5.5 |
| **Boss** | 850 | 22 | 62 | salves radiales 9 (14 enragé <50% PV, +2/profondeur) + charges télégraphiées |

**Scaling des ennemis** (PV et ATK) :
```
× (1 + 0.3×(salle−1))            [salle]
× région (1 / 1.8 / 2.8)          [Verdant / Ember / Night]
× 2.2^(prof−1) PV, 1.6^(prof−1) ATK   [Profondeur]
× (1 + 0.06×(nivHéros−1)) PV, (1 + 0.035×…) ATK   [filet anti-trivialisation]
```

**Élites** : chance 8% + 2.5%/salle + 2%/profondeur (+contrats). ×3 PV, ×1.5 ATK, ×3 XP, ×3 or, échelle ×1.35, **objet garanti** *(⚠ à remplacer par le système « champion » d'ITEMS.md)*. Préfixes à teinte distincte : **Volcanique** (explose à la mort, 110 px), **Vampirique** (régén 2% PV/s), **Hâtive** (+50% vitesse).

---

## 8. Les Profondeurs (l'échelle infinie)

Battre le boss de **Night Marsh à la profondeur max** débloque la suivante. Par profondeur au-delà de la 1 (composés) :

| Ennemis PV | Ennemis ATK | Or | Loot (qualité) | XP | Drain | Élites | Salves boss |
|---|---|---|---|---|---|---|---|
| ×2.2 | ×1.6 | ×1.4 | ×1.3 | ×1.3 | +15% | +2% | +2 bolts |

La question n'est plus « suis-je fort ? » mais « jusqu'où je descends ? ».

---

## 9. La Collection (le système d'objets)

**Chaque objet existe en UN exemplaire nommé dans un catalogue fixe de 54 objets** (18 par slot + 5 reliques ✦). On ne loote pas des stats : on **découvre**. La Collection est l'inventaire — on y équipe, on y forge.

- **Découverte** (jamais possédé) → rejoint la Collection + **+2 PV et +0.5 ATK permanents**. Confettis, le grand moment.
- **Doublon** → recyclé automatiquement en **Essence ⚗** (commun 3 / rare 8 / épique 20 / légendaire 50). Zéro tri, zéro inventaire.
- Chaque objet : slot, rareté, stats fixes, **passif signature** (rare et +), texte d'ambiance, et **gating** (source, région min, profondeur min) — les silhouettes ??? affichent un indice de chasse.
- **Sources** (2-4 objets par run max) : boss 1 garanti (25% relique ✦) · **1 Champion 👑 par run** (élite couronnée, seul drop garanti d'élite) · élites normales : rien (or ×3 — les bonus « +loot » donnent une chance) · mobs : rien · **Trouvaille de la route : 1 objet tous les 2 km marchés** (pool exclusif à la marche !) · coffres (~1/5) · marchand · commissions.
- Les tirages favorisent les objets **non découverts** (65%), et les poids de rareté glissent vers le haut avec la Profondeur.
- **Reliques ✦** (pouvoirs de gameplay) : Emberfang (bolts enflammés), Colossus Grip (+30% vs élites/boss), Mirebark Shell (renvoie 25% contact), Rootbound Crown (4 choix de capacité), Stride Anthem (Hybride ×2).

## 10. La Forge

- **⚒ Amélioration** : +12% stats/niveau. Coût : **or (25 × 1.7^niv × multRareté) + Essence ⚗ (4 × 1.5^niv × multRareté)**, + bois dès +4, + pierre dès +7.
- **Caps par rareté** : commun +3, rare +6, épique +9, légendaire/relique +12 — la rareté définit le potentiel.
- Plus de fusion ni de vente : le recyclage automatique des doublons alimente tout.

## 11. Le héros

```
PV max = (100 + 14×(niv−1) + 10×paliers) × skills × (1+3%×Foyer)
ATK    = (10 + 2.5×(niv−1) + 1.5×paliers) × skills × (1+1.5%×Cabane) × (1+10%×rangPrestige)
Vitesse = 170 × skills × (1+affixes)
+ stats des 3 objets équipés (avec leur forge)
```
- XP pour niveau n = 60 × 1.3^(n−1) (kills, élites ×3, commissions).
- **Compétences** : 1 point/niveau, 7 skills permanents (prérequis de niveau 2-7) : +20% dégâts, +25% PV, +12% vitesse, −25% cadence, −30% dash, +15% loot, +8% crit.
- **Collections** : bestiaire (6), régions réveillées (3).
- **Renaissance** (après les 3 boss) : reset niveau/or/ressources/village/régions — **garde** équipement, collections, distance, Éveillés (désassignés) et **Profondeur**. +10% ATK & gain d'énergie permanents par rang.

## 12. Les 9 régions

Chaque région a son identité, **ses objets exclusifs au catalogue et la relique signature ✦ de son boss** (25% de drop, prioritaire tant que non possédée) :

| Région | Boss | Relique signature | Difficulté | Or |
|---|---|---|---|---|
| Verdant Hollow | The Rootbound King | Rootbound Crown | ×1 | ×1 |
| Ember Wastes | Cinder Colossus | Emberfang | ×1.8 | ×1.6 |
| Night Marsh | The Sleepless Mire | Mirebark Shell | ×2.8 | ×2.4 |
| Frostpeak Summit | The Avalanche Warden | Glacier Heart | ×4.2 | ×3.4 |
| Sunken Dunes | The Dune Colossus | Dune Strider | ×6.2 | ×4.6 |
| Storm Plateau | The Tempest Crown | Storm Core | ×9.2 | ×6.2 |
| Gloomwood | The Pale Shepherd | Gloom Lantern | ×13.5 | ×8.2 |
| Magma Throat | The Furnace King | Magma Fist | ×19.5 | ×11 |
| The Hollow Root | The First Sleeper | Void Anchor | ×28 | ×15 |

La Profondeur suivante se débloque en battant le boss de **The Hollow Root** à profondeur max. Splitters et Dashers rejoignent le pool dès la salle 2 partout.

## 12bis. Les récompenses de Collection (la collection n'est jamais gratuite)

**Paliers de découvertes → déblocages de mécaniques :**

| Découvertes | Déblocage |
|---|---|
| 5 | 🎁 Deep Pockets — capacité de coffres : 4 |
| 10 | 📜 Dark Reputation — 3 contrats maudits proposés |
| 15 | 👟 Keen Boots — trouvaille de la route tous les 1.5 km |
| 20 | 🃏 Wider Fate — +1 choix sur chaque capacité de run |
| 30 | 🚀 Head Start — chaque run démarre avec un choix de capacité gratuit |
| 40 | ⚗️ Essence Mastery — +50% d'Essence des doublons |
| 83 (tout) | ☀️ The World's Blessing — +25% d'énergie de marche, pour toujours |

**Maîtrise régionale** : posséder le set complet d'une région (ses objets de combat exclusifs) → **+15% dégâts et −15% drain dans cette région**, badge ★ MASTERED au portail. Et chaque découverte donne toujours +2 PV / +0.5 ATK permanents.

## 12quater. Le Jardin 🌱 (le pilier contemplation)

Onglet dédié, fond jour/nuit selon l'heure réelle. **La croissance se paie en mètres marchés, jamais en énergie** — design complet dans [GARDEN.md](GARDEN.md).

- **9 parcelles de potager** : graine → pousse (mètres) → mûre (récoltable) → fane si inactivité → compost (mode Intense seulement). Le compost fertilise la plantation suivante (−15% de pousse).
- **3 arbres immortels** : grandissent par paliers de jours de marche distincts (Oak +3% croissance/palier, Willow +2⚗/jour de marche/palier, Sapling +1% énergie/palier).
- **Streak** : +5%/jour consécutif de croissance ET de rendement (cap +50%) — jamais de punition, que du boost.
- **13 graines** (communes autosuffisantes → rendent leurs graines à la récolte ; rares = élites 15%/champion garanti ; ultra = boss 10%).
- **Potions** (herbes récoltées) : Vigor (+30% PV), Fortune (+50% or), Focus (1 choix gratuit), Legend (2 choix) — une par run, sélectionnée dans l'écran des contrats.
- **🍲 Nourrir le village** : les légumes donnent de la food ; 1/Éveillé → acclamation **doublée** 2 jours (cap +20%).
- **Modes** (Réglages) : 🍃 Chill (fane à 4 j d'inactivité, ne meurt jamais) / 🔥 Intense (fane à 2 j, composte 3 j après, rendements ×1.25).

## 12ter. Le Balance Lab ⚖️ (Réglages)

**Tous les paramètres d'équilibrage sont réglables en jeu**, sans toucher au code : section ⚖️ Balance Lab dans Réglages, 7 groupes (multiplicateurs globaux, marche & énergie, héros, ennemis & élites, profondeurs, récompenses & forge, jardin — ~55 paramètres). Le groupe 🌱 Jardin couvre : vitesse de croissance ×, bonus/cap de streak, jours de fanaison Chill/Intense, délai de compost, rendement Intense ×, chance de graine sur élite et chance d'ultra-graine de boss. Chaque ligne montre la valeur par défaut ; une valeur modifiée passe en ambre avec un reset individuel ↺, plus un « Reset ALL ». Les overrides sont **persistés dans la save** (et donc dans l'export JSON) et s'appliquent à la prochaine run. Trois multiplicateurs globaux (`Enemy HP ×`, `Enemy ATK ×`, `Gold ×`) permettent l'équilibrage grossier en un geste.

## 13. Technique

- **Art** : pack CC0 Kenney Tiny Dungeon (`public/assets/tiny-dungeon/`) + textures générées restantes ; zoom caméra ×1.5, ombres portées, respiration procédurale, flip directionnel, bolts additifs, vignette.
- **Save** : Dexie (IndexedDB), autosave débouncée 1.5 s + flush sur fermeture, migrations versionnées (v8), export/import JSON, reset — le tout dans Réglages.
- **PWA** installable offline ; son WebAudio synthétique et haptique toggleables ; `prefers-reduced-motion` respecté.
- Réglages : son, haptique, mode Manuel/Simulation, save.

---

## En attente de décision ([ITEMS.md](ITEMS.md))

1. Cap d'inventaire à 40 — oui/non ?
2. « Champion » unique par run (1 seule élite droppe) — ou plafond dur de 3 objets/run ?
3. Caps de forge par rareté (+3/+6/+9/+12) — oui/non ?
