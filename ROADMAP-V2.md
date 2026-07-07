# ARPENTEUR 2 — Roadmap

Fork parallèle de la v1 (`../Tapis de marche v2`). Même moteur, save **séparée** (IndexedDB `arpenteur-v2`),
port dev **5174**. La v1 reste jouable et stable ; la v2 est le terrain des évolutions.

## ✅ Livré en v2.0

- **🏅 Défi quotidien** : une run spéciale par jour, 2 modificateurs déterministes tirés de la date
  (mêmes pour toute la journée), acceptée depuis l'écran des contrats. Ennemis durcis, gains gonflés.
  Victoire (boss battu) = **+300g × profondeur + 1 graine rare + 1 coffre du Marcheur**, une fois par jour.
  - Pool de 6 modificateurs (`src/core/balance/challenge.ts`) : Iron Horde, Sharp Fangs, Gold Rush,
    Scholar's Day, Blood Moon, Thick Hide.
  - Save v13 (migration douce depuis toute save v1 importée).

## ✅ Livré en v2.1 — LA ROADMAP COMPLÈTE

- **🧩 Sets d'équipement** (`sets.ts`) : 4 sets de 3 pièces (Cinder Pilgrim, Toll Collector, Marsh Walker,
  Waking Scholar). 2 pièces = bonus mineur, 3 = majeur cumulé, agrégés dans `aggregateGear`. Badge dans
  EQUIPMENT, pastille 🧩 dans le sélecteur et la Collection.
- **☀ Prestige enrichi** (`prestigePerks.ts`) : chaque rang de Renaissance = un choix de perk cumulable —
  Waking Boon (+1 capacité gratuite au départ), Crowd Favor (+2 capacité d'Éveillés), Trail Caches
  (coffres −50 m, plancher 300 m). Save v14.
- **😊 Humeurs & cadeaux des Éveillés** : humeur du jour déterministe (Cheerful +15% prod / Sleepy −15% /
  Inspired moral ×2 / Steady), moral qui monte en marchant (3 km) → 🎀 cadeau à réclamer dans la fiche
  du Foyer (or, ressources, essence, 12% objet).
- **🧳 Événements de village** (`villageEvents.ts`) : 30% au retour de run — marchand itinérant (objet contre
  or), Éveillé perdu (recrue gratuite), festin (+20% PV max à la prochaine run).
- **🛰 Capteurs réels** : `GpsSource` (Geolocation, filtre précision 35 m, 1-12 km/h) et `PedometerSource`
  (devicemotion, détection de pas par pics, permission iOS gérée) — 4 modes dans l'onglet Walk avec statut
  du capteur. ⚠️ Non testables sur desktop : à valider sur téléphone.
- **📋 Transfert inter-appareils** : Copy save / Paste save par presse-papier dans Réglages (pas de serveur).
- **🎨 Pass d'art régional** : voile de lumière + particules d'ambiance par région (braises, neige, pluie,
  sable, spores, motes) dans l'arène.
- **👑 Boss Rush** (débloqué à 3 boss vaincus) : les 9 boss enchaînés, un drop chacun, difficulté ×1→×28.
- **🏟 Colosseum** (débloqué à 1 boss) : vagues infinies dans une arène, boss toutes les 5 vagues,
  record de meilleure vague (affiché dans Records et l'écran d'embarquement).
- Modes alternatifs = récompenses pures (pas de progression de région) ; le Défi quotidien reste réservé
  aux expéditions classiques.

## 🔜 Idées d'après (non planifiées)

- Sync cloud réelle (nécessite un backend), animations spritesheet 4 frames, portraits des Éveillés,
  événements de village supplémentaires, sets legendaires trans-régions.

## Reprendre une save v1

Réglages → Export save (JSON) dans la v1, puis Import save dans la v2 : la migration v13 s'applique
automatiquement. Les deux jeux n'écrivent jamais dans la même base.
