# ARPENTEUR 2

Une PWA qui gate un vrai jeu d'action 2D (Phaser 3) derrière tes pas sur le tapis de marche.
**L'Énergie ne s'obtient QUE par la marche** — plus tu marches, plus tu joues.

**🌍 Jouer en ligne : https://ibgold.github.io/arpent/** (HTTPS — GPS et podomètre utilisables
sur téléphone ; installable en PWA depuis le navigateur). Redéployé à chaque push sur `main`.

> 📖 **[FONCTIONNEMENT.md](FONCTIONNEMENT.md) explique TOUT le jeu, système par système, chiffres inclus.**
> Nouveautés v2 : [ROADMAP-V2.md](ROADMAP-V2.md) · référence détaillée : [GAMEPLAY.md](GAMEPLAY.md) ·
> jardin : [GARDEN.md](GARDEN.md) · objets : [ITEMS.md](ITEMS.md) · déploiement : [DEPLOY.md](DEPLOY.md) ·
> **backlog technique pour les prochaines sessions : [PROCHAINES-ETAPES.md](PROCHAINES-ETAPES.md)**

Fork parallèle de la v1 (`../Tapis de marche v2`) : save séparée (IndexedDB `arpenteur-v2`), port dev 5174.

## Lancer

**Sans terminal (recommandé)** : double-clic sur **`Jouer - ARPENTEUR 2.vbs`** (ou le raccourci
« ARPENTEUR 2 » du Bureau). Le serveur démarre en arrière-plan et le navigateur s'ouvre sur le jeu
(http://localhost:4273). Première ouverture : une fenêtre de préparation s'affiche le temps de
l'installation, puis plus jamais. `Arreter ARPENTEUR 2.cmd` coupe le serveur ;
`Mettre a jour ARPENTEUR 2.cmd` reconstruit après une modification du code.

En ligne de commande :

```bash
npm install
npm run dev      # développement : http://localhost:5174
npm run build    # build de prod + PWA (dist/)
npm run serve    # sert le build : http://localhost:4273 (aussi sur le réseau local)
```

## La boucle en 5 lignes

1. **👟 Walk** : Manual (tapis), Simulation (bureau), **🛰 GPS** (extérieur) ou **📳 Podomètre** (capteur
   du téléphone). La marche produit : énergie, coffres (400 m), trouvailles (2 km), pas quotidiens,
   production du village, moral des Éveillés, croissance du jardin.
2. **🔥 Village** : tape le portail (250 ⚡) → écran d'embarquement : mode (Expédition / **👑 Boss Rush** /
   **🏟 Colosseum**), contrats maudits, **🏅 défi quotidien**, potion du jardin.
3. **En run** (façon Archero) : tir auto à l'arrêt, déplacement = esquive, orbes d'XP → choix de
   capacités, 6 salles, boss, reliques signatures. Énergie à zéro = retour avec tout le butin.
4. **Gestion** : bâtiments (or/bois/pierre), Éveillés assignés (humeurs du jour, cadeaux à 3 km de
   marche), événements au retour de run, **🌱 jardin** (pousse en mètres marchés), Collection de
   83 objets (découverte = bonus permanent, doublon = Essence, forge, **🧩 sets**).
5. **🧙 Hero** : stats, équipement, compétences · Collection · Records (bestiaire, régions, Profondeurs,
   Renaissance + perks de prestige).

## Contrôles

| Action | Clavier | Tactile | Manette |
|---|---|---|---|
| Déplacement | ZQSD / WASD / flèches | joystick virtuel (moitié gauche) | stick gauche |
| Tir | automatique (à l'arrêt = pleine cadence) | automatique | automatique |
| Dash (i-frames) | Shift / K | tap moitié droite | B / X |

## Architecture

**Style visuel : pixel art 2D avec de vrais assets.** Personnages, murs et sols : pack CC0
**[Tiny Dungeon](https://kenney.nl/assets/tiny-dungeon) de Kenney** (`public/assets/tiny-dungeon/`,
intégré via `src/game/art/tinyDungeon.ts` — respiration procédurale, flip directionnel, particules
d'ambiance par région). Le reste est généré dans `src/game/art/textures.ts`. Merci Kenney 🧡

- `src/core/` — store Zustand (source de vérité), balance centralisée (constants, catalog, sets,
  challenge, prestigePerks, villageEvents, garden…), save Dexie versionnée (v14) avec migrations
- `src/game/` — tout le Phaser : scènes (Boot/Hub/Run), entités, systèmes, bridge événementiel vers React
- `src/input/` — `WalkDataSource` : Manual, Simulated, **Gps**, **Pedometer** — une interface, zéro refactor
- `src/shell/` — coquille React : HUD, onglets (Village/Garden/Hero/Walk/Settings), PiP, Balance Lab

Toutes les constantes d'équilibrage vivent dans `src/core/balance/constants.ts` et sont réglables
en jeu (Réglages → ⚖️ Balance Lab).

En dev, `window.__store` et `window.__events` sont exposés dans la console pour tricher/tester.
