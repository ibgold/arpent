# ARPENTEUR — Système d'objets v2 : la Collection

> Remplace intégralement la v1 (fusion/inventaire/vente). Philosophie recentrée sur le but réel de
> l'app : **marcher un maximum, s'amuser pendant la marche, découvrir** — pas gérer un inventaire.

## Le principe

**Chaque objet du jeu existe en UN exemplaire nommé, dans un catalogue fixe.** On ne "loote" pas des
stats aléatoires : on **découvre** des objets. La Collection est l'inventaire : on y équipe ses 3 pièces,
on y forge, on y contemple ce qui manque.

- **Découverte** (objet jamais possédé) → il rejoint la Collection + **bonus permanent de collection**
  (+2 PV, +0.5 ATK par objet découvert). Le grand moment de dopamine.
- **Doublon** → recyclé automatiquement en **Essence ⚗** (selon rareté). Zéro friction, zéro tri.
- **Essence** → améliore les objets (forge : or + essence, + bois/pierre aux hauts niveaux).

Résultat : il n'y a **plus un seul drop inintéressant**. Nouveau = découverte + bonus permanent.
Connu = essence pour ta build. L'inventaire, la vente et la fusion disparaissent.

## Le catalogue (~54 objets)

- 3 slots × ~18 objets : commun (6) / rare (5) / épique (4) / légendaire (3), + les 5 **reliques ✦**
  (ex-uniques, pouvoirs de gameplay).
- **Commun** : stats + texte d'ambiance. **Rare+** : 1 passif signature fixe (crit, lifesteal, or, XP,
  drain, dash, portée…). **Légendaire** : passif fort. **Relique** : pouvoir unique.
- Les armes portent leur archétype (Blade/Hammer/Daggers) — choisir une arme = choisir un style.
- **Gating de découverte** : chaque objet a une source (`combat` / `road` / `any`), une région minimale
  et une profondeur minimale. Le catalogue se dévoile en jouant ET en marchant — de quoi chasser.

## Les sources (rares, chacune un événement)

| Source | Fréquence | Pool |
|---|---|---|
| **Boss** | 1 garanti par boss | combat, région du boss, 25% relique |
| **Champion 👑** | 1 seule élite couronnée par run → 1 garanti | combat |
| Élites normales / mobs | **0 objet** (or ×3, ressources) | — |
| **Trouvaille de la route** 👟 | 1 tous les **2 km marchés** | road (objets introuvables en combat !) |
| Coffre du Marcheur | ~1 sur 5 coffres | any |
| Marchand | 1 achetable/run | any |
| Commissions | selon quête | any |

Les tirages favorisent les objets **non découverts** (65%) tant qu'il en reste dans le pool éligible.

## La forge (inchangée dans l'esprit, nouvelle monnaie)

+12% de stats par niveau. Coût : **or + Essence ⚗**, + bois dès +4, + pierre dès +7.
Caps par rareté : commun +3, rare +6, épique +9, légendaire/relique +12.

## Bonus de collection

- +2 PV et +0.5 ATK **permanents par objet découvert** (54 objets = +108 PV, +27 ATK à terme).
- La progression de collection est affichée (X/54) — toujours une barre presque pleine.

## Ce qui disparaît

Inventaire illimité, vente, fusion, affixes aléatoires, noms procéduraux ("Fine Ember Pike").
Migration : les anciens objets sont convertis en Essence.
