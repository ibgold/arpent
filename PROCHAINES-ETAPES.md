# ARPENTEUR 2 — Prochaines étapes (backlog technique détaillé)

Document de passation : chaque chantier ci-dessous est décrit avec assez de détail technique pour
être confié tel quel à un agent (Claude Opus ou autre) dans une session future. Rédigé le 2026-07-08.

**Ordre recommandé : §0 → §1 → §2 → §3, puis au choix.** Le §0 (git) protège tout le reste.

---

## Contexte projet (à lire avant tout chantier)

- **Deux projets frères** : `C:\Users\Ib\Downloads\Claude\Tapis de marche v2` (v1, stable, ne plus y toucher
  sauf demande) et `C:\Users\Ib\Downloads\Claude\Arpenteur v2` (v2, terrain des évolutions — ce dossier).
- **Stack** : Vite + TypeScript strict, React + Tailwind 4, Phaser 3 (arcade), Zustand
  (`src/core/state/store.ts` = source de vérité unique, ~1000 lignes), Dexie/IndexedDB, vite-plugin-pwa.
- **Ports** : dev v2 = 5174 (`--strictPort`), serveur de jeu v2 = 4273 (lanceur `Jouer - ARPENTEUR 2.vbs`).
  v1 : 5173 / 4173. **La save est liée à l'origine** (port) : 5174 et 4273 ont des IndexedDB séparées.
- **Docs de référence** : `FONCTIONNEMENT.md` (tout le jeu), `GAMEPLAY.md` (référence historique),
  `ROADMAP-V2.md` (livré en v2.0/v2.1), `GARDEN.md`, `ITEMS.md`, `DEPLOY.md`.

### Règles non négociables du projet

1. **L'Énergie ⚡ ne vient QUE de la marche.** Jamais de régénération passive, jamais de notification,
   jamais de culpabilisation. Motivation pull uniquement.
2. **Save : jamais estampiller sans migrer.** Toute nouvelle clé persistée = bump `SAVE_VERSION`
   (`store.ts`) + step dans `migrations` (`src/core/save/persistence.ts`) + champ dans `snapshotState()`.
   Le filet de normalisation deep-merge dans `migrate()` répare les objets imbriqués manquants, mais ne
   remplace PAS une migration. Version actuelle : **14**.
3. **Zustand `set()` merge** : les clés optionnelles (`villageEvent`, `feastPending`, `colosseumBest`,
   `lastRoadFind`, `run`) doivent être purgées explicitement dans `resetAll` et `hydrate` (déjà fait —
   maintenir le pattern pour toute nouvelle clé optionnelle).
4. **Équilibrage** : toute nouvelle constante numérique va dans `BALANCE`
   (`src/core/balance/constants.ts`, objet MUTABLE) + entrée dans `TUNABLE_GROUPS`
   (`src/core/balance/tuning.ts`) pour être réglable dans le Balance Lab.
5. **React ↔ Phaser** : uniquement via `gameEvents` (`src/game/bridge/events.ts`, émetteur typé) ou
   `useGameStore.getState()`. Jamais de référence directe composant ↔ scène.

### Pièges connus (vécus)

- **`applyWalkSample(distanceDeltaM, speedKmh, dtS)` est POSITIONNEL.** L'appeler avec un objet injecte
  des `NaN` dans la save (énergie, distance, pas). Pour simuler en console :
  `__store.getState().applyWalkSample(100, 5, 72)`.
- **Onglet masqué = Phaser en pause** (RAF stoppé) : screenshots de canvas en timeout, runs figées.
  Vérifier via `preview_eval` sur `window.__store` plutôt que par captures. Les `setInterval` JS sont
  throttlés à ~1/min en arrière-plan (voir §3).
- **HMR + imports dynamiques en console** : `import('/src/...')` peut charger une SECONDE instance d'un
  module (valeurs divergentes de celles de l'app). Après grosse modif, recharger la page avant de tester.
- **Tests en live** : rembourser/nettoyer toute triche (`setState`) après vérification ; les tests
  précédents ont déjà pollué des saves.
- **`preview_start`** : les chemins avec espaces cassent le spawn → le lanceur passe par
  `start-v2-dev.cmd` en chemin court DOS (voir `.claude/launch.json` du projet v1).

---

## §0 — ✅ FAIT (2026-07-08) — Versionner avec git

**Pourquoi** : aucun historique, aucun retour arrière possible. Tout le reste du backlog devient
plus sûr avec ça.

**Faire** :
```bash
cd "C:\Users\Ib\Downloads\Claude\Arpenteur v2"
git init -b main
git add -A && git commit -m "ARPENTEUR 2 v2.1 — roadmap complète"
```
Idem dans le dossier v1. Le `.gitignore` existe déjà (node_modules, dist). Ajouter
`dev-dist/` et `tsconfig.tsbuildinfo` s'ils n'y sont pas. Ensuite : un commit par feature livrée.
Optionnel : remote GitHub privé (utile pour §1 GitHub Pages).

---

## §1 — ✅ FAIT (2026-07-08) — Hébergement HTTPS

> **Le jeu est en ligne : https://ibgold.github.io/arpent/** (repo `github.com/ibgold/arpent`).
> Chaque `git push` sur `main` redéploie automatiquement (`.github/workflows/deploy.yml`, ~1 min).
> Pages activé manuellement (Settings → Pages → GitHub Actions) — l'`enablement` auto échouait
> avec le GITHUB_TOKEN.
> ⚠️ Ce repo a sa propre config git locale (`credential.useHttpPath true` + email de commit noreply) :
> ne pas pousser avec la config globale de la machine.
> ⚠️ Nouvelle origine = nouvelle save : transférer via Réglages → Copy/Paste save.
> Le §2 (capteurs sur téléphone) est maintenant débloqué : ouvrir l'URL sur le téléphone.

**Pourquoi** : `getUserMedia`-like, **Geolocation et devicemotion exigent un contexte sécurisé**.
`http://192.168.x.x:4273` depuis le téléphone → capteurs GPS/podomètre silencieusement bloqués
(status `unavailable`/`denied` dans l'UI Walk). Seuls `localhost` ou HTTPS passent.

**Options (détaillées dans `DEPLOY.md`)** :
1. **GitHub Pages** (recommandé si repo git, gratuit, HTTPS natif) :
   - Build avec base sous-chemin : `VITE_BASE=/nom-du-repo/ npm run build` (déjà géré dans
     `vite.config.ts` : `base: process.env.VITE_BASE || '/'`).
   - Publier `dist/` sur la branche `gh-pages` (ou workflow Actions).
   - ⚠️ PWA : le service worker et le manifest héritent du scope du sous-chemin — vérifier
     l'installation et la mise à jour (`registerType: 'autoUpdate'`) après déploiement.
   - ⚠️ La save IndexedDB de `username.github.io` est une NOUVELLE origine : transférer la
     progression via Réglages → Copy save / Paste save.
2. **Netlify / Vercel drop** : glisser `dist/` dans l'UI web — zéro config, HTTPS immédiat,
   URL aléatoire. Le plus simple sans compte GitHub.
3. **Tunnel local** (test rapide sans hébergement) : `cloudflared tunnel --url http://localhost:4273`
   (ou ngrok). HTTPS temporaire vers le PC — parfait pour valider les capteurs (§2) avant de choisir.

**Critères de done** : le jeu s'ouvre en HTTPS sur le téléphone ; l'installation PWA fonctionne ;
les modes GPS et Pedometer affichent 🟢 après octroi des permissions.

---

## §2 — Valider et calibrer les capteurs sur téléphone

**Fichiers** : `src/input/GpsSource.ts`, `src/input/PedometerSource.ts`,
UI de statut dans `src/shell/ambient/AmbientView.tsx` (composant `SensorStatus`, poll 1 s).

**État actuel (jamais testé sur device)** :
- GPS : haversine entre fixes, rejette précision >35 m (`MAX_ACCURACY_M`), vitesses <1 ou >12 km/h,
  intervalle min 900 ms. `enableHighAccuracy: true`.
- Podomètre : `devicemotion`, pas détecté si magnitude accélération >11,5 m/s² (`PEAK_THRESHOLD`,
  gravité incluse ≈ 9,81 au repos) avec 300 ms min entre pas ; émission agrégée chaque seconde,
  foulée 0,7 m. **iOS 13+** : `DeviceMotionEvent.requestPermission()` est appelé au `start()` — il DOIT
  être déclenché depuis un geste utilisateur (le clic sur le bouton de mode dans Walk convient : le
  `subscribe` du walkManager s'exécute dans la pile du clic).

**Protocole de calibration** :
1. Debug distant : téléphone Android en USB → `chrome://inspect` sur le PC (console du téléphone).
   Sur iOS : Safari → Réglages avancés → Web Inspector.
2. Marcher 100 pas comptés à la main en mode Pedometer → comparer `dailySteps.steps`
   (`__store.getState().dailySteps`). Ajuster `PEAK_THRESHOLD` (trop haut = pas manqués ; trop bas =
   faux pas quand on manipule le téléphone) et `MIN_STEP_INTERVAL_MS`.
3. Marcher un trajet connu (~500 m) en mode GPS → comparer `totalDistanceM`. Ajuster
   `MAX_ACCURACY_M` (35 m est permissif en ville) et le seuil bas de vitesse (1 km/h) si le jitter
   à l'arrêt crédite de la distance.
4. Envisager d'exposer ces seuils dans `BALANCE` + groupe Balance Lab « Sensors » pour calibrer
   sans rebuild (suivre la règle n°4 du contexte).

**Pièges** : sur tapis de marche, le GPS ne bouge pas → utiliser Pedometer ; certains Android
suspendent `devicemotion` écran éteint → garder Wake Lock actif (réglage « Keep screen awake »
déjà présent, `src/shell/wakeLock.ts`).

---

## §3 — Comptage en arrière-plan (limites PWA et mitigations)

**Problème** : onglet masqué/écran éteint → les navigateurs throttlent `setInterval` (~1/min) et
stoppent le RAF. Le `SimulatedSource`/`ManualSource` (tick 1 s) sous-compte massivement ; les
événements `watchPosition`/`devicemotion` sont aussi réduits selon l'OS.

**Mitigations classées par coût** :
1. **Déjà en place** : Screen Wake Lock (écran allumé pendant la marche) — la mitigation principale.
   Vérifier qu'il est réacquis au retour de visibilité (`visibilitychange` dans `wakeLock.ts`).
2. **Rattrapage à la reprise** (bon rapport coût/valeur) : dans `walkManager.handleSample`, quand
   `document.visibilityState` redevient visible après un trou, estimer la distance manquée =
   `vitesse courante × durée du trou` (borné, uniquement en mode Manual/Simulation où la vitesse est
   déclarative) et l'injecter en un échantillon. Pour GPS : le premier fix au retour donne la vraie
   distance cumulée → créditer le delta haversine complet au lieu de le rejeter.
3. **Web Worker** pour le tick (les workers sont un peu moins throttlés) — gain réel limité sur mobile.
4. **Long terme, la vraie solution** : empaqueter en app (Capacitor ou TWA/Bubblewrap) et lire
   **Health Connect** (Android) / HealthKit — un nouveau `WalkDataSource` (`HealthConnectSource`),
   l'architecture est prête (`src/input/WalkDataSource.ts` : une interface, zéro refactor).
   C'est un chantier séparé (toolchain Android Studio, signature APK).

---

## §4 — Backup automatique de la save

**Problème** : IndexedDB peut être purgé par le navigateur (pression disque, « libérer l'espace »).
Des mois de marche perdus. L'export manuel existe (`Réglages → Export save`).

**Approche recommandée** (fichiers : `src/core/save/persistence.ts`, `src/shell/settings/SettingsView.tsx`) :
1. `navigator.storage.persist()` au boot (une ligne, demande au navigateur de ne pas purger —
   logguer le résultat).
2. **Backup hebdomadaire semi-auto** : au chargement, si `Date.now() - lastBackupAt > 7 j` (nouvelle clé
   persistée → migration v15 !), afficher un bandeau doux « 💾 Pense à sauvegarder — un clic » qui
   déclenche le téléchargement JSON existant (`exportSaveJson()`), puis met à jour `lastBackupAt`.
   Jamais bloquant, jamais répétitif dans la même session (règle : zéro culpabilisation).
3. Option avancée : File System Access API (`showSaveFilePicker` puis réécriture silencieuse du même
   fichier à chaque autosave) — Chromium uniquement, demande un geste initial.

---

## §5 — Onboarding en jeu

**Problème** : premier lancement = village muet, rien n'explique que l'énergie vient de la marche.

**Approche** : composant React `WelcomeModal` (nouveau fichier `src/shell/components/Welcome.tsx`,
monté dans `App.tsx`), affiché si `settings.onboarded !== true` (nouvelle clé `GameSettings` —
défaut `false` dans `initialGameState`, pas besoin de migration si le filet comble, mais suivre la
règle n°2 par propreté : v15).
3 à 4 écrans max, swipe/next : ① « Tes pas réveillent le monde » (énergie = marche, montrer l'onglet
Walk et les 4 modes) ② « Dépense-la en expéditions » (portail, 250 ⚡) ③ « Tout le reste pousse en
marchant » (village, jardin, coffres) ④ choix du mode de marche immédiat (boutons Manual/GPS/…).
Ré-affichable depuis Réglages (« Revoir l'intro »).

**Question à trancher avec l'utilisateur avant** : langue de l'UI (actuellement anglais, docs en
français). Si passage au français : centraliser les chaînes est un chantier en soi — commencer par
l'onboarding en français et noter l'incohérence.

---

## §6 — Boss uniques (patterns par région)

**Problème** : les 9 boss = même comportement, seuls teinte/stats/nom changent.

**Fichiers** : `src/game/entities/Enemy.ts` (classe unique, `kind: 'boss'`, `burstBonus`),
`src/game/scenes/RunScene.ts` (`spawnBoss()`, ~ligne 545 ; `fireEnemyShot`).

**Approche incrémentale** (un boss = une session de test) :
1. Ajouter `bossPattern?: string` à `RegionDef` (`src/core/balance/regions.ts`).
2. Dans `Enemy` (ou une petite classe `BossBrain` composée), un switch de patterns :
   - `root-king` (Verdant) : invoque 2 chasers à 66 % et 33 % PV.
   - `cinder` (Ember) : anneaux de projectiles lents (8 directions).
   - `mire` (Marsh) : pools au sol qui ralentissent (réutiliser `applySlow`).
   - `avalanche` (Frost) : charge télégraphiée en ligne (réutiliser la logique dasher).
   - `tempest` (Storm) : téléport + burst (réutiliser storm-core visuals).
   - etc. Réutiliser au maximum l'existant : burn/slow/dash/splitter sont déjà codés.
3. **Phase 2 à 50 % PV** (roadmap v1, jamais fait) : dans `takeDamage` du boss, à la moitié →
   `burstBonus += 1`, pattern accéléré, popup « PHASE 2 », shake. Généraliser à tous les boss.
4. Tester chaque pattern en sautant directement au boss : `__store.getState().startRun(...)` puis
   `__store.getState().updateRun({ room: 6 })` avant d'entrer dans la scène (ou tricher la salle
   via la porte).

---

## §7 — Historique et statistiques

**Pourquoi** : dopamine gratuite (profil TDAH) + valorise la marche passée.

**Modèle** (nouvelles clés persistées → **migration v15**, snapshot, purge resetAll) :
```ts
stats: {
  runsPlayed: number; runsWon: number; bossesKilled: number
  totalKills: number; bestDepthCleared: number
  /** 30 derniers jours : { day: 'YYYY-MM-DD', meters: number, energy: number } */
  dailyLog: { day: string; meters: number; energy: number }[]
}
```
- Alimenter : `endRun` (runs/kills/boss), `applyWalkSample` (dailyLog — mettre à jour l'entrée du jour,
  garder 30 entrées max).
- UI : onglet Hero → Records, section « 📈 Journal » : 7 derniers jours en barres (divs Tailwind
  suffisent, pas de lib de charts), totaux lifetime en dessous.
- Ne PAS logger davantage (poids de save) ; 30 jours suffisent.

---

## §8 — Passe d'équilibrage en conditions réelles

Pas du code : **du jeu**. Utiliser le Balance Lab (Réglages, 7 groupes, ~55 paramètres, persisté).
Points de surveillance identifiés :
- Drain d'énergie ressenti avec tous les bonus cumulés (maîtrise + warm-light + Warm Glow) —
  potentiellement trop indolore.
- Boss Rush : le mur ×28 (Hollow Root) après ×1 (Verdant) — vérifier que la courbe est jouable ;
  sinon lisser (ex. difficulté de rush = `difficultyMult^0.8`).
- Colosseum : cap de 20 ennemis/vague et fréquence des boss (toutes les 5) — sensations à valider.
- Défi quotidien : les mods « Thick Hide » (+80 % PV) tôt dans la partie.
- Sets : Toll Collector (or) probablement dominant en farm — acceptable si assumé.
Consigner les changements retenus en modifiant les DÉFAUTS dans `constants.ts` (pas seulement les
overrides de save) une fois validés.

---

## §9 — Musique d'ambiance

**Existant** : `src/core/audio/sfx.ts` — SFX 100 % WebAudio synthétique (zéro asset), respecte
`settings.sound`.

**Deux options** :
1. **Génératif WebAudio** (cohérent avec le projet zéro-asset) : drone + arpèges pentatoniques
   aléatoires lents, une palette de notes par région (mapper `region.id` → gamme/tempo), gain très
   bas, crossfade aux changements de scène. ~150 lignes dans un nouveau `music.ts`, démarré après le
   premier geste utilisateur (autoplay policy), toggle « Music » séparé dans Réglages (nouvelle clé
   settings → filet ok).
2. **Assets CC0** (Kenney audio, OpenGameArt) : boucles OGG par région (~1-2 Mo chacune — attention
   au precache PWA, exclure du `globPatterns` et charger à la demande).
Recommandation : option 1 d'abord (gratuite en poids), option 2 si le rendu déçoit.

---

## §10 — Finitions techniques

1. **Code splitting** (warning build : chunk 1,9 Mo) : dans `vite.config.ts` →
   `build.rollupOptions.output.manualChunks: { phaser: ['phaser'] }`. Phaser (~1,4 Mo) part dans son
   chunk mis en cache ; vérifier que le jeu boot toujours (import statique → l'ordre ne change pas).
2. **Icônes PWA PNG** : iOS ignore les SVG. Générer 192/512 px (+ maskable) depuis `public/icon.svg`
   (sharp en script Node ou export manuel), les déclarer dans le manifest de `vite.config.ts` et
   ajouter `<link rel="apple-touch-icon" href="/icon-180.png">` dans `index.html`.
3. **Lighthouse PWA pass** après §1 (hébergé) : installabilité, offline, maskable.

---

## Modèle de prompt pour lancer un chantier

> Lis `PROCHAINES-ETAPES.md` (contexte + pièges) et `FONCTIONNEMENT.md` dans
> `C:\Users\Ib\Downloads\Claude\Arpenteur v2`, puis implémente le §N en respectant les
> « règles non négociables ». Typecheck (`npx tsc --noEmit`), build (`npm run build`),
> vérifie en live sur le port 5174, nettoie tes données de test, mets à jour
> FONCTIONNEMENT.md et coche le § ici.
