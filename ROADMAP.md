# ARPENTEUR — Proposition de développement

Réponse au constat : *« le jeu ne va pas assez loin, peu d'items, meilleur équilibrage »*.
La section ✅ est **déjà implémentée** avec cette proposition ; le reste est classé par vagues, chaque vague étant jouable seule. Estimation d'effort : 🔨 (une séance) à 🔨🔨🔨 (plusieurs séances).

---

## ✅ Vague 0 — Livrée avec ce document

### Objets profonds (le manque le plus criant)
- **Affixes** : chaque objet roll des lignes bonus selon sa rareté (commun 0, rare 1, épique 2, légendaire 3) parmi 9 affixes : crit chance, crit damage, lifesteal, vitesse, or, XP, drain d'énergie réduit, cooldown de dash, portée d'attaque. Deux « Fine Trail Vest » ne se ressemblent plus jamais.
- **5 objets UNIQUES** (légendaires nommés, ✦, halo doré dans l'inventaire) avec un pouvoir de gameplay :
  | Unique | Slot | Pouvoir |
  |---|---|---|
  | Emberfang | arme | les swings lancent un projectile de feu |
  | Colossus Grip | arme | +30% dégâts aux élites et boss |
  | Mirebark Shell | armure | renvoie 25% des dégâts de contact |
  | Rootbound Crown | charme | les bénédictions offrent 4 choix au lieu de 3 |
  | Stride Anthem | charme | bonus Hybride (marche en combat) doublé |
  Drop : 25% de chance sur chaque boss, scalés par région.
- **+9 noms de base** (8 par slot au lieu de 5).

### Rééquilibrage
| Valeur | Avant | Après | Pourquoi |
|---|---|---|---|
| PV/niveau héros | 12 | 14 | la survie ne suivait pas le scaling des régions |
| ATK/niveau héros | 2 | 2.5 | idem côté dégâts |
| Stats de base des objets | 3/10/4 | 4/14/5 | l'équipement doit peser dans la build |
| Difficulté Ember Wastes | ×1.7 | ×1.55 | mur trop abrupt après la région 1 |
| Difficulté Night Marsh | ×2.6 | ×2.2 | idem |
| Loot Ember / Night | ×1.5 / ×2.2 | ×1.6 / ×2.4 | le risque doit payer plus |
| PV boss | 950 | 850 | les combats traînaient en longueur |
| Raretés (c/r/e/l) | 62/26/9/3 | 58/28/10/4 | plus d'épiques/légendaires = plus de moments forts |
| Or par kill | 2–6 | 3–7 | l'économie du village était trop lente |
| Chance d'élite de base | 6% | 8% | plus de pics d'excitation |

---

## ✅ Vague 1 — Profondeur de run (LIVRÉE)

1. ✅ **Contrats maudits** : 2 contrats optionnels au départ (pool de 6), malus contre récompense annoncée, cumulables.
2. ✅ **Salles à événement** (1 par run, salles 2–5) : autel de sacrifice (25% PV → bénédiction) et marchand itinérant (soin/objet/bénédiction contre or), diégétiques — on marche dessus.
3. ✅ **Armes-archétypes** : épée / marteau (lent, large, ×1.65 dégâts, gros knockback) / dagues (rapides, +10% crit). Nouveaux noms d'armes par archétype ; Emberfang = dagues, Colossus Grip = marteau.
4. ✅ **Préfixes d'élites** : Volcanique (explose), Vampirique (régénère), Hâtive (+50% vitesse) — teintes distinctes.

## Vague 2 — Rétention long terme 🔨🔨

5. **Sets d'équipement** : 3 sets de 3 pièces (2 pièces = bonus mineur, 3 = majeur, ex. set du Colosse : +PV, et les swings font trembler l'écran + AoE). Complète la collection prévue au §C du brief.
6. **Défi quotidien** : une expédition spéciale par jour (seed fixe, modificateurs du jour, récompense unique). Zéro punition si raté — juste un bonus à prendre.
7. **4ᵉ et 5ᵉ régions** : Frostpeak Summit (glace : sol glissant, ennemis gelants) et The Hollow Root (donjon final : mix de tous les ennemis, boss en 2 phases). L'architecture `REGIONS[]` les accueille sans refactor.
8. **Paliers de prestige enrichis** : chaque rang de Renaissance débloque un modificateur de départ au choix (commencer avec 1 boon / +1 Éveillé de capacité / coffres tous les 350m).

## Vague 3 — Village vivant 🔨🔨🔨

9. **Humeurs & cadeaux des Éveillés** : chaque Éveillé a une jauge de moral qui monte quand tu marches ; à fond, il t'offre un cadeau (ressources, parfois un objet). Tap sur un Éveillé → il réagit (son, cœur).
10. **Bâtiments avancés** : Atelier (recycle 3 objets → 1 objet de rareté supérieure), Autel des Boons (choisir 1 boon de départ permanent par run contre de l'or), Tour de guet (révèle la promesse des DEUX salles suivantes).
11. **Événements de village** : en revenant de run, parfois un événement (visiteur marchand, Éveillé perdu à recueillir, festin qui booste la prochaine run).

## Vague 4 — Corps & capteurs 🔨🔨🔨 (Phase 5 du brief)

12. **Capteur réel** : implémentation `PedometerSource` (API Sensor / Health Connect via PWA) — l'architecture `WalkDataSource` est prête.
13. **Objectifs santé doux** : paliers de distance quotidiens à récompenses (jamais de malus).
14. **Pass d'art final** : spritesheets pixel art animées (idle/walk/attack), tilesets par région, portraits des Éveillés.

---

## Ordre recommandé

**Vague 1 d'abord** (contrats + événements + archétypes d'armes) : c'est ce qui maximise la variété par minute de jeu, le reproche principal. Puis Vague 2 pour la rétention, Vague 3 quand le combat est éprouvé, Vague 4 en dernier (dépend du matériel réel).
