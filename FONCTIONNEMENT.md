# ARPENTEUR 2 — Le fonctionnement de tout

Ce document explique **l'intégralité du jeu** tel qu'il est implémenté : chaque système, chaque boucle,
chaque chiffre. Les valeurs viennent de `src/core/balance/` (qui fait foi en cas de divergence) — et
presque toutes sont réglables en jeu via le **Balance Lab** (§15). Dernière mise à jour : 2026-07-08.

---

## Sommaire

1. [La règle d'or](#1-la-règle-dor)
2. [La marche : sources et capteurs](#2-la-marche--sources-et-capteurs)
3. [Ce que la marche produit](#3-ce-que-la-marche-produit)
4. [Le héros : stats, niveaux, compétences](#4-le-héros)
5. [La Collection : objets, forge, sets, reliques](#5-la-collection)
6. [Le combat (façon Archero)](#6-le-combat)
7. [Régions et Profondeurs](#7-régions-et-profondeurs)
8. [Contrats, potions, défi quotidien, modes de jeu](#8-lécran-dembarquement)
9. [Le village et les Éveillés](#9-le-village)
10. [Événements de village](#10-événements-de-village)
11. [Le Jardin](#11-le-jardin)
12. [Renaissance et perks de prestige](#12-renaissance)
13. [Boss Rush et Colosseum](#13-boss-rush-et-colosseum)
14. [Sauvegarde et transfert](#14-sauvegarde)
15. [Balance Lab](#15-balance-lab)
16. [Technique](#16-technique)

---

## 1. La règle d'or

**L'Énergie ⚡ ne s'obtient QU'en marchant.** Elle ne remonte jamais avec le temps. Elle paie le
lancement des expéditions (250 ⚡) et leur drain continu. Aucune notification, aucun rappel, aucune
culpabilisation : le monde se rendort quand tu t'arrêtes, il se réveille quand tu marches. C'est tout.

Gain : `0.5 ⚡/s × vitesse (km/h)`, multiplié par tous les bonus (§3), soit ~1800 ⚡ par km. Le réservoir
est **plafonné** (défaut 1200 ⚡ — une stamina de jeu, pas un magot infini) : au plafond, la marche
convertit son énergie en **or** (rien n'est gâché, et ta marche reste tracée pour toujours dans le
Journal §3). Deux usages : **lancer** une run (250 ⚡) et la **Surcharge** — verser ton énergie en
réserve au départ pour +or & +butin (jusqu'à +100%). Tout est réglable dans le Balance Lab.

## 2. La marche : sources et capteurs

Cinq modes dans l'onglet **👟 Walk** (architecture `WalkDataSource` : une interface, cinq implémentations) :

| Mode | Usage | Fonctionnement |
|---|---|---|
| 🏃 **Treadmill (Bluetooth)** | **Le meilleur** — tapis DeerRun/Superun/PitPat (validé sur Superun BA10) | Lit **directement** la vitesse réelle du tapis ET **le contrôle** (start/stop/±vitesse, borné 0,6-6,0 km/h, aussi depuis le widget flottant). 3 variantes auto-détectées : superun (`0xffff`), standard (`0xfff0`), pitpat (`0xfba0` + unlock). Protocole d'après qdomyos-zwift ; l'init part immédiatement après l'abonnement (sinon le tapis raccroche). **Chrome/Edge sur Windows/Android uniquement**, un appareil à la fois : Bluetooth du téléphone coupé, et supprimer « Mindtree-HID » des périphériques Windows s'il y est. |
| 🎚 **Manual** | Tapis sans Bluetooth | Tu règles le curseur sur la vitesse affichée par ton tapis. |
| 🤖 **Simulation** | Tests au bureau | Vitesse simulée réglable (avec micro-variations). |
| 🛰 **GPS** | Marche en extérieur | Distance réelle entre fixes GPS (haversine). Fixes imprécis (>35 m) ignorés ; vitesses <1 ou >12 km/h ignorées (jitter, véhicule). Nécessite la permission de localisation. |
| 📳 **Pedometer** | Tapis, téléphone en poche | Détection de pas par pics d'accélération (devicemotion) : pic >11,5 m/s², cadence max 3,3 pas/s, foulée 0,7 m. Permission explicite sur iOS. |

Un indicateur d'état (🟢 actif / 🔴 permission refusée / 🟠 indisponible) s'affiche pour GPS et podomètre.
Le bouton **⏸ Pause** coupe la source quelle qu'elle soit. Le **widget flottant** (Document
Picture-in-Picture, Chromium) affiche vitesse/énergie/coffres par-dessus les autres applis, avec
pause et ajustement de vitesse.

## 3. Ce que la marche produit

Chaque échantillon de marche déclenche, dans l'ordre :

- **⚡ Énergie** : `0.5 × km/h × dt`, multipliée par : Hybride ×1.25 (si une run est en cours), prestige
  (+10 %/rang), World's Blessing +25 % (83/83 objets), acclamation du village (+0,5 %/Éveillé, cap +10 % —
  **doublés** si le village est nourri 🍲), World Sapling (+1 %/palier), Watchtower (+5 %/niveau).
- **🏭 Production du village** : chaque Éveillé assigné produit sa ressource (§9), boostée par le Foyer
  (+10 %/niveau) et **son humeur du jour** (±15 %).
- **💗 Moral des Éveillés** : chaque mètre remplit leur jauge (×2 si Inspiré) ; à 3 km → 🎀 cadeau (§9).
- **🔥 Streak quotidien** : jours de marche consécutifs (affiché onglet Walk, nourrit le Jardin §11).
- **👟 Pas quotidiens** : distance ÷ 0,7 m = pas. Objectif réglable (2 000–30 000, défaut 6 000) ;
  atteint → **+100 or + 1 coffre**, une fois par jour. Jamais de malus si raté.
- **🎁 Coffres du Marcheur** : +1 coffre tous les **400 m** (réduits par Trail Caches §12, plancher 300 m).
  Stock max 3 (4 avec Deep Pockets). Ouverture d'un tap : or (38 %), bois (20 %), pierre (15 %),
  **objet du catalogue (21 %)**, jackpot 120-220 or (6 %).
- **🧭 Trouvailles de la route** : un objet du catalogue (pool « route ») tous les **2 km** (1,5 km avec
  Keen Boots ; −100 m/niveau de Paved Road, plancher 1 km).
- **📜 Commissions** : 3 quêtes actives (marche, kills, élites, salles, boss) ; réclamer une récompense
  en tire une nouvelle.
- **🌱 Jardin** : chaque mètre fait pousser les parcelles (§11).

## 4. Le héros

**Stats** : 100 PV + 14/niveau · 10 ATK + 2,5/niveau · vitesse 170 px/s. S'y ajoutent :

- **Paliers de marche** (plats, permanents) : +10 PV et +1,5 ATK par palier de distance totale
  (1, 3, 6, 10, 15, 21, 30, 42 km) — le corps se souvient.
- **Collection** : **+2 PV et +0,5 ATK par objet découvert**, pour toujours (83 objets = +166 PV, +41,5 ATK).
- **Équipement** : les 3 pièces équipées (catalogue × forge, §5).
- **Compétences** : 1 point par niveau, 7 compétences à l'achat unique (Heavy Strikes +20 % ATK,
  Vital Core +25 % PV, Swift Stride +12 % vitesse, Quick Hands −25 % cooldown de tir, Shadow Step
  −30 % cooldown de dash, Lucky Find +15 % loot, Keen Eye +8 % crit).
- **Village** (§9) et **prestige** (§12).

**XP** : niveau n = `60 × 1.3^(n-1)` XP — les premiers niveaux tombent vite (cadence de dopamine).

## 5. La Collection

**Le principe : on ne loote pas des stats, on DÉCOUVRE des objets.** Le catalogue fixe contient
**83 objets nommés** (28 armes, 27 armures, 28 charmes), chacun avec son texte d'ambiance. La
Collection EST l'inventaire : posséder = découvert, pour toujours.

- **Doublon → Essence ⚗** automatique (3/8/20/50 selon rareté ; ×1,5 avec Essence Mastery).
- **Rareté = potentiel** : multiplicateur de stats (×1/×1.6/×2.5/×4) et cap de forge (+3/+6/+9/+12).
- **Forge ⚒** : +12 % de stats par niveau. Coût : or (25 × 1.7^niveau × rareté), + bois dès +4,
  + pierre dès +7 — le farm du village nourrit l'équipement.
- **Passifs signatures** (rare et +) : 9 effets fixes (crit, dégâts crit, vol de vie, vitesse, or,
  XP, drain réduit, dash, portée).
- **✦ Reliques (11)** : pouvoirs de gameplay uniques (bolts enflammés, +30 % aux élites/boss, épines 25 %,
  4 choix de capacité, Hybride doublé, gel à l'impact, dash blessant, éclairs en chaîne, +40 % XP de run,
  brûlures doublées, projectiles ennemis ralentis). Chaque boss de région a SA relique signature (25 % de
  chance, prioritaire tant que non possédée) — la chasse aux boss.
- **🧩 Sets (4)** : 3 pièces thématiques (arme+armure+charme). 2 pièces = bonus mineur, 3 = majeur cumulé :
  - 🔥 **Cinder Pilgrim** (Ember Pike / Ember Shell / Ember Bead) : +20 % dégâts crit → +45 % et −8 % drain.
  - 🪙 **Toll Collector** (Toll-Bell Hammer / Innkeeper's Apron / Coin of the Road) : +15 % or → +45 % et +5 % vitesse.
  - 🌙 **Marsh Walker** (Night Sickle / Mist Cloak / Marsh Lantern) : 3 % vol de vie → 7 % et −15 % dash.
  - 📚 **Waking Scholar** (Milestone Maul / Pilgrim's Mantle / Owl Feather) : +20 % XP → +50 % et +6 % crit.
- **Paliers de Collection** (mécaniques débloquées) : 5 → coffres ×4 · 10 → 3 contrats proposés ·
  15 → trouvailles route 1,5 km · 20 → +1 choix de capacité · 30 → capacité gratuite au départ ·
  40 → +50 % Essence · 83 → +25 % d'énergie de marche à vie.
- **★ Maîtrise régionale** : posséder tout le set de combat d'une région → **+15 % dégâts et −15 % drain
  dans cette région**.

**Sources d'objets** : boss (1 garanti, 25 % relique), **champion 👑** (1/run, garanti), coffres (21 %),
trouvailles de route, marchands, cadeaux d'Éveillés (12 %), événement de village. Les tirages favorisent
la découverte (65 % vers le non-possédé) et la rareté glisse vers le haut avec la Profondeur.

## 6. Le combat

**Façon Archero : le tir est automatique, le positionnement est le jeu.**

- **Immobile** = pleine cadence (480 ms) et pleine portée (540 px) sur l'ennemi le plus proche.
- **En mouvement** = cadence ×2,1 plus lente, portée ×0,75 — se déplacer sert à esquiver.
- **Dash** (900 ms de cooldown) : esquive avec i-frames. **Hybride** : marcher sur le tapis pendant la
  run donne +6 % de dégâts par km/h (doublé par Stride Anthem, +2 %/niveau de Waking Statue).
- **Archétypes d'armes** : lame (équilibrée), marteau (lent, ×1,65 dégâts, gros knockback),
  dagues (rapides, +10 % crit).
- **Crit** : 12 % de base, ×2,2 dégâts.

**Montée en puissance dans la run** : les kills lâchent des **orbes d'XP** (aimantées à 170 px) qui
remplissent une jauge (seuil 22 × 1.45^niveau). Jauge pleine → le monde se fige → **choix d'une capacité
parmi 3** (4 avec Rootbound Crown, +1 avec Wider Fate ; reroll possible pour 30 ⚡). 21 capacités
combinables : multishot, tirs latéraux/arrière/diagonaux, ricochet, perforant, brûlure, gel, coups lourds…

**Structure d'une expédition** : 6 salles (boss à la 6ᵉ). Après chaque salle nettoyée, **deux portes**
annoncent leur promesse (💎 trésor, 📦 ressources ×2,5, ⚔ élites, 🐦 cage) — choisis ta route. Une
**salle événement** par run : autel de sacrifice (25 % PV → capacité) ou marchand itinérant (soin/objet/
capacité contre or). **Cages** (35 %/salle) : ouvre au contact → un Éveillé rejoint le village.

**Ennemis** : chaser, shooter, brute, splitter (se scinde), dasher — mix propre à chaque région.
**Élites** (8 % +2,5 %/salle) : ×3 PV, ×1,5 ATK, préfixes Volcanique (explose à la mort), Vampirique
(régénère), Hâtive (+50 % vitesse). Le **champion 👑** (une élite dorée par run) droppe un objet garanti.
Scaling par salle (+30 % PV, +20 % ATK) et léger scaling sur le niveau du héros (+6 %/+3,5 % par niveau).

**Drain** : 1,5 ⚡/s +0,15/salle, modulé par contrats, maîtrise (−15 %), objets, capacité Warm Glow (−25 %)
et Profondeur (+15 %/niveau). Énergie à zéro = retour au village (jamais de mort punitive — tout le
butin au sol est **aspiré automatiquement** en fin de run, victoire ou pas).

## 7. Régions et Profondeurs

**9 régions**, débloquées en battant le boss de la précédente. Chacune a son identité : teinte de sol,
**ambiance animée** (particules : motes, braises, spores, neige, sable, pluie), mix d'ennemis, boss nommé,
relique signature, objets exclusifs, difficulté ×1 → ×28 et loot ×1 → ×15 :

Verdant Hollow (Rootbound King) → Ember Wastes (Cinder Colossus) → Night Marsh (Sleepless Mire) →
Frostpeak Summit (Avalanche Warden) → Sunken Dunes (Dune Colossus) → Storm Plateau (Tempest Crown) →
Gloomwood (Pale Shepherd) → Magma Throat (Furnace King) → **The Hollow Root** (The First Sleeper).

**Profondeurs (échelle infinie)** : battre le boss de The Hollow Root à la profondeur max débloque la
suivante. Par profondeur : ennemis ×2,2 PV et ×1,6 ATK (composés), or ×1,4, XP ×1,3, loot plus rare
vers le haut, drain +15 %, élites +2 %. Le contenu remonte plus vite que le joueur : le challenge ne
s'éteint jamais.

## 8. L'écran d'embarquement

Avant chaque départ (choix région + profondeur au village), un écran propose :

- **⚔️ Mode de jeu** : 🗺 Expédition (classique) / 👑 Boss Rush / 🏟 Colosseum (§13).
- **📜 Contrats maudits** (2 proposés, 3 avec Dark Reputation, cumulables) : un malus assumé contre une
  récompense annoncée — Swift Doom (ennemis +30 % vitesse / +60 % or), Glass Bones (−25 % PV / +25 % loot),
  Leaden Feet (dash coupé / +50 % XP), Burning Hours (drain +35 % / élites ×2), Dull Edge (−20 % dégâts /
  +35 % loot +30 % or), The Horde (+3 ennemis/salle / +40 % XP +20 % or).
- **🏅 Défi quotidien** (expédition uniquement) : 2 modificateurs **déterministes tirés de la date** (les
  mêmes toute la journée, pool de 6 : Iron Horde, Sharp Fangs, Gold Rush, Scholar's Day, Blood Moon,
  Thick Hide — ennemis durcis, gains gonflés). Battre le boss = **+300 or × profondeur + 1 graine rare +
  1 coffre**, une seule fois par jour. Raté ? Aucune punition, retente demain.
- **🌱 Potion du jardin** (une par run) : Vigor (+30 % PV), Fortune (+50 % or), Focus (1 capacité gratuite),
  Legend (2 capacités gratuites).

## 9. Le village

Le hub visuel (scène Phaser) : tap sur un bâtiment → fiche de construction/gestion. **La production ne
tourne QUE pendant la marche.**

| Bâtiment | Production/Éveillé | Bonus passif par niveau | Max |
|---|---|---|---|
| 🔥 The Hearth | — | +3 % PV héros, +10 % production, +2 lits | 5 |
| ⛩️ Waking Shrine | 0,12 or/s | +2 % or des kills | 4 |
| 🪵 Lumber Hut | 0,07 bois/s | +1,5 % ATK héros | 4 |
| ⛏️ Old Quarry | 0,05 pierre/s | +2 % XP des kills | 4 |
| 🗼 Watchtower | — | +5 % énergie de marche | 3 |
| 🛤️ Paved Road | — | trouvailles de route −100 m | 3 |
| 🗿 Waking Statue | — | +1 lit, +2 % dégâts Hybride | 3 |

**Les Éveillés** (disciples secourus dans les cages) : capacité = 2 + 2×niveau du Foyer + niveau de la
Statue + 2×Crowd Favor (§12). Chacun compte pour l'**acclamation** (+0,5 % d'énergie de marche, cap +10 % ;
**doublée, cap +20 %, si le village est nourri** — voir Jardin). Assigne-les aux bâtiments producteurs
(places = niveau du bâtiment).

- **😊 Humeur du jour** (déterministe par Éveillé + date, personne ne triche) : Cheerful (production
  +15 %), Steady (neutre), Inspired (moral ×2), Sleepy (production −15 %). Visible dans la fiche du Foyer.
- **🎀 Cadeaux** : la marche remplit le cœur de chaque Éveillé (3 km, ×2 si Inspiré) → bouton « Gift! »
  dans la fiche du Foyer : or (28 %), bois+pierre (25 %), essence (35 %), **objet du catalogue (12 %)**.

## 10. Événements de village

Au retour d'une expédition, **30 % de chance** qu'une carte événement t'attende (jamais une punition) :

- **🧳 Le marchand itinérant** (40 %) : UN objet du catalogue (pool route) contre de l'or
  (100 + 40 × profondeur). Achète ou décline.
- **🏮 L'Éveillé perdu** (30 %) : une recrue gratuite si le village a un lit.
- **🍲 Le festin** (30 %) : les Éveillés cuisinent pour TOI → **+20 % PV max à la prochaine run**.

## 11. Le Jardin

Le 3ᵉ pilier : la **contemplation** (onglet 🌱, ciel teinté selon l'heure réelle). La croissance se paie
en **mètres marchés**, jamais en énergie. Planter est gratuit.

- **9 parcelles** : graine → pousse (mètres × streak × Oak of Steps ×2 growth global) → mûre → récolte
  (libère la parcelle ; les communes redonnent 1-2 graines : la boucle 100 % jardinier s'auto-entretient).
- **3 emplacements d'arbres, immortels** : grandissent par **jours de marche distincts** (paliers, max 5) —
  Oak of Steps (+3 % croissance/palier), Ember Willow (+2 ⚗/jour de marche/palier), World Sapling
  (+1 % énergie/palier). Le patrimoine long terme.
- **Fanaison douce** : une plante **mûre non récoltée** fane après des jours sans marche (rendement ÷2).
  Deux modes (Réglages) : 🍃 **Chill** (4 j, ne meurt jamais) / 🔥 **Intense** (2 j, compost 3 j plus tard,
  rendements ×1,25). Les plantes en croissance ne fanent jamais. Arracher = +1 compost. Le compost
  fertilise la plantation suivante (−15 % de distance).
- **Streak** : +5 %/jour consécutif (croissance ET rendement), cap +50 %. Rater un jour remet le bonus
  à zéro — rien ne meurt.
- **13 graines** : 3 communes autosuffisantes (or/food, essence+fleur, potion Vigor), 5 rares (donjon :
  élites 15 %, champion garanti — or/bois/food, potions Fortune/Focus, essence), 2 ultra (boss, 10 %/graine :
  jackpot, potion Legend), 3 arbres.
- **🍲 Nourrir le village** : les légumes donnent des portions de food (carotte 2, pumpkin 5, turnip 10) ;
  1 portion/Éveillé → **acclamation doublée pendant 2 jours** (cap +20 %).
- **Potions** : stockées sans limite, une activable par run (écran d'embarquement).
- **🌸 Fleurs** : décoratives, permanentes, s'accumulent dans la scène.

## 12. Renaissance

Éveille les 9 régions (tous les boss), puis **renais** : héros, or, ressources, bâtiments et régions
sont réinitialisés — tu **gardes** Collection, forge, distance totale, Éveillés, jardin et Profondeur.

Chaque rang : **+10 % ATK et +10 % d'énergie de marche permanents**, et **un choix de perk** (cumulables,
reprendre le même empile) :

- 🚀 **Waking Boon** : chaque run commence avec +1 choix de capacité gratuit.
- 👥 **Crowd Favor** : +2 de capacité d'Éveillés.
- 🎁 **Trail Caches** : coffres du Marcheur tous les −50 m (plancher 300 m).

## 13. Boss Rush et Colosseum

Deux modes alternatifs (écran d'embarquement) : **récompenses pures, pas de progression de région** ;
le défi quotidien y est désactivé. Contrats et potions s'appliquent.

- **👑 Boss Rush** (débloqué : 3 boss vaincus) : les **9 boss enchaînés**, salle après salle, avec la
  difficulté de leur région (×1 → ×28) et le scaling de salle qui s'empile. Chaque boss lâche son drop
  normal (relique 25 %, graines…). Survis aux 9 = victoire.
- **🏟 Colosseum** (débloqué : 1 boss) : une seule arène, **vagues infinies** (taille croissante, cap 20
  ennemis), **boss toutes les 5 vagues**, pas de portes — la vague suivante déferle après 0,9 s. Le
  **record de meilleure vague** est gardé (affiché dans Records et à l'embarquement). La fin naturelle :
  mourir ou vider son énergie — en gardant tout le butin.

## 14. Sauvegarde

- **Locale d'abord** : IndexedDB (base `arpenteur-v2`, séparée de la v1), autosave débouncée 1,5 s +
  sauvegarde au masquage de l'onglet. Save **v14**, migrations versionnées 1→14 + filet de normalisation
  profonde (une save v1 importée est migrée automatiquement).
- **Export/Import JSON** (Réglages) : fichier téléchargeable / importable.
- **📋 Transfert inter-appareils** : « Copy save » met le JSON dans le presse-papier, « Paste save »
  l'importe sur l'autre appareil. Pas de serveur, pas de compte — ta save t'appartient.
- **Reset** : bouton avec confirmation, tout est remis à zéro.

## 15. Balance Lab

Réglages → ⚖️ **Balance Lab** : ~55 paramètres d'équilibrage réglables **en jeu, sans code**, en
7 groupes — multiplicateurs globaux (PV/ATK ennemis, or), marche & énergie, héros, ennemis & élites,
profondeurs, récompenses & forge, **jardin** (croissance, streak, fanaison, drops de graines). Chaque
ligne montre sa valeur par défaut ; une valeur modifiée passe en ambre avec reset individuel ↺ et
« Reset ALL ». Les overrides sont **persistés dans la save** et suivent l'export/import.

## 16. Technique

- **Stack** : Vite + TypeScript strict, React + Tailwind 4 (coquille UI), Phaser 3 arcade
  (`pixelArt: true`, zoom ×1,5 en run), Zustand (source de vérité unique), Dexie (IndexedDB),
  vite-plugin-pwa (installable, mise à jour auto).
- **Pont React ↔ Phaser** : bus d'événements typé (`gameEvents`) + lecture directe du store — jamais de
  couplage composant/scène.
- **Art** : pack CC0 Kenney Tiny Dungeon (spritesheet 16 px) + textures générées, ombres portées,
  respiration procédurale, flip directionnel, particules d'ambiance par région, vignette.
- **Sons** : WebAudio synthétique (zéro asset). **Haptique** : `navigator.vibrate`.
- **Confort** : Screen Wake Lock (écran allumé pendant la marche), widget PiP flottant, contrôles
  clavier (WASD/ZQSD/flèches, Shift/K dash), tactile (stick gauche, tap droit) et manette.
- **Dev** : port 5174 (`npm run dev`), `window.__store`/`__events`/`__walk` exposés, build `npm run build`.

---

*La philosophie en une phrase : chaque pas réel fait avancer quelque chose — l'énergie, le village,
le jardin, les coffres, la route, le moral des Éveillés — et rien, jamais, ne te punit de t'être arrêté.*
