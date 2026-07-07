# ARPENTEUR — Refonte : équilibrage & direction graphique

Décisions issues de la session de recul du 2026-07-04.

---

## 1. Équilibrage : le système des Profondeurs ✅ VALIDÉ

### Diagnostic
La puissance du joueur est le **produit** de six systèmes (niveaux XP × paliers de marche × équipement ×1→×4 × skills × prestige × capacités de run), face à des ennemis à croissance **linéaire** (salle + région). Multiplicatif contre linéaire = fuite en avant garantie ; aucun patch de chiffres ne tiendra. De plus, le contenu a un plafond (Night Marsh ×2.8) et la difficulté est un pur stat-check (jamais de patterns plus dangereux).

### Le plan
1. **Profondeurs (échelle infinie, modèle Archero)** : battre le boss de Night Marsh débloque la Profondeur 2 — les 3 régions rejouables avec multiplicateur composé (**×2.2 PV et ×1.6 ATK par profondeur**). La question n'est plus « suis-je fort ? » mais « jusqu'où je descends ? ». Récompenses scalées (loot, or) + uniques exclusifs aux profondeurs élevées.
2. **Difficulté mécanique par profondeur** : densité de projectiles accrue, nouveaux patterns de boss (spirales, murs de tirs), dangers d'arène (pièges à pointes, flaques de poison par région), auras d'élites. Mourir par placement, pas par arithmétique.
3. **Dégonfler le stacking passif** : les paliers de distance donnent des bonus plats (+10 PV chacun) au lieu de niveaux entiers.
4. **Passe de tuning chiffrée** après la structure : courbes de temps-pour-tuer cibles par profondeur.

---

## 2. Direction graphique

### Écartée : pixel art (placeholders actuels)
Les sprites générés en grilles de pixels ont servi de placeholder ; l'utilisateur veut une refonte totale, hors pixel art.

### Options hors pixel art

| # | Direction | Description | Production | Plafond qualité |
|---|---|---|---|---|
| 1 | **Cartoon vectoriel dark-cute** (façon Cult of the Lamb) | Personnages en SVG haute résolution : grosses têtes, yeux immenses, contours épais, palette gothique + accents chauds. Pantins multi-parties (corps/tête/yeux/arme) animés par tweens : respiration, clignement, squash, inclinaison. Net à toute résolution. | 100% Claude (SVG écrits directement) | Bon (programmer art soigné) |
| 2 | **Néon géométrique / arcade glow** | Formes pures + postFX Phaser (bloom, glow, trails, particules massives). Type Geometry Wars/Downwell. Spectaculaire rapidement, parfait pour le combat à projectiles. | 100% Claude, rapide | Fort en combat, froid pour le village |
| 3 | **Art généré par IA** | Spec d'assets complète (liste, tailles, style guide, palette, prompts) → génération Midjourney/DALL·E/Scenario par l'utilisateur → découpe et intégration par Claude. | Dépend de l'utilisateur | Le plus haut (rendu peint) |

### Recommandation
**Option 1 comme socle + le glow de l'option 2 pour les effets de combat** (bolts, impacts, level-ups, auras d'élites). L'option 3 reste un upgrade ultérieur : l'abstraction `src/game/art/textures.ts` permet de remplacer les vecteurs par de l'art généré sans toucher au gameplay.

### Socle technique commun (à poser en premier, quel que soit le choix)
- `pixelArt: false`, textures haute résolution
- Personnages en pantins multi-parties (Phaser Containers) avec animations procédurales
- PostFX bloom/glow sur les éléments de combat
- Police de caractères dédiée pour l'UI (remplacement du monospace système)
- Éclairage d'ambiance (halos sur héros/torches/portail)

---

## Ordre d'exécution proposé
1. Profondeurs (structure + mécanique + tuning) — règle le problème de fond
2. Socle technique graphique + refonte vectorielle des entités de combat (le plus visible)
3. Refonte du village et de l'UI
4. (plus tard) Remplacement éventuel par art IA via la spec d'assets
