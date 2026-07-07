# ARPENTEUR — Du dev à l'usage quotidien

Comment utiliser le jeu pour de vrai, sur le tapis, sans `npm run dev`. Trois chemins selon ton installation, du plus simple au plus complet.

> **À savoir d'abord** : le jeu est une PWA 100 % locale — aucun compte, aucun serveur de jeu. **Ta save vit dans le navigateur de chaque appareil** (IndexedDB). PC et téléphone = deux saves distinctes ; pour transférer : Réglages → *Export save (JSON)* sur l'un, *Import save* sur l'autre.

---

## Chemin 1 — Le PC près du tapis (le plus simple, 2 minutes)

Si ton PC/portable est visible depuis le tapis :

1. **Double-clique `start-arpenteur.cmd`** (à la racine du projet). Il build si nécessaire, lance le serveur et ouvre le navigateur.
2. Dans Chrome/Edge sur `http://localhost:4173` : icône **Installer** dans la barre d'adresse (⊕ ou écran+flèche) → ARPENTEUR devient une **vraie app de bureau** : fenêtre dédiée, icône dans le menu Démarrer, plein écran.
3. Le **widget flottant** (onglet Walk → *Open floating widget*) reste au-dessus de tout : tu peux travailler/regarder autre chose en marchant, avec pause/vitesse/coffres sous la main.
4. L'écran **reste allumé pendant que tu marches** (réglage *Keep screen awake*, activé par défaut).

Limite : le serveur doit tourner (la fenêtre du .cmd ouverte). L'app installée survit aux redémarrages mais a besoin du serveur au lancement — sauf si tu passes au Chemin 3.

## Chemin 2 — Le téléphone sur le même WiFi (test rapide)

1. Lance `start-arpenteur.cmd` sur le PC : il affiche **l'IP du PC**.
2. Sur le téléphone (même WiFi) : ouvre `http://IP_DU_PC:4173`.
3. Tu peux jouer directement dans le navigateur — joystick tactile, tout fonctionne.

**Limites importantes** (protocole HTTP non sécurisé hors localhost) :
- Pas d'installation PWA ni de mode offline depuis une adresse IP en HTTP — c'est une restriction des navigateurs, pas du jeu.
- Il faut que le PC serve pendant que tu joues.
→ Pour un vrai usage téléphone, prends le Chemin 3.

## Chemin 3 — Hébergement HTTPS gratuit (l'installation complète, recommandé)

Le jeu étant statique, n'importe quel hébergeur statique gratuit suffit. **HTTPS = installation PWA + offline complet** : après la première visite, le jeu marche sans réseau, lancé depuis l'icône de l'écran d'accueil.

### Option A — Netlify Drop (le plus simple, zéro ligne de commande)
1. `npm run build` (le dossier `dist/` est le jeu complet).
2. Va sur **https://app.netlify.com/drop** (compte gratuit).
3. **Glisse-dépose le dossier `dist/`** dans la page. C'est en ligne en ~10 secondes avec une URL `https://xxx.netlify.app`.
4. Chaque mise à jour : re-build, re-glisser.

### Option B — Cloudflare Pages / Vercel (CLI, mises à jour en une commande)
```bash
npm run build
npx wrangler pages deploy dist        # Cloudflare (compte gratuit, login au 1er run)
# ou
npx vercel deploy dist --prod          # Vercel
```

### Option C — GitHub Pages (si tu mets le projet sur GitHub)
```bash
# le site vivra sous /nom-du-repo/ : il faut builder avec la base correspondante
set VITE_BASE=/nom-du-repo/ && npm run build     # (PowerShell: $env:VITE_BASE='/nom-du-repo/'; npm run build)
npx gh-pages -d dist
```

### Installer sur le téléphone (une fois l'URL HTTPS ouverte)
- **Android (Chrome)** : menu ⋮ → **« Installer l'application »** (ou bannière automatique). Icône sur l'écran d'accueil, plein écran, offline.
- **iPhone (Safari)** : bouton Partager → **« Sur l'écran d'accueil »**. ⚠️ Sur iOS : pas de widget flottant (API Chromium) et pas de vibrations — le reste fonctionne.
- **PC** : icône Installer dans la barre d'adresse, comme au Chemin 1 mais sans serveur à lancer.

Puis : Réglages → *Import save* avec le JSON exporté de ta session dev pour récupérer ta progression.

---

## Réalités d'usage à connaître

- **L'énergie ne compte que l'app ouverte.** Les sources Manuel/Simulation sont des horloges dans l'app : téléphone verrouillé ou app fermée = marche non comptée. D'où le wake lock (écran allumé tant que ça marche) et le widget PiP sur PC. Le comptage en arrière-plan viendra avec les capteurs réels (podomètre/Health Connect — l'architecture `WalkDataSource` est prête).
- **En mode Manuel**, règle le curseur sur la vitesse affichée par ton tapis ; ajuste à la volée depuis le widget (− / +).
- **Mises à jour** : la PWA se met à jour seule au lancement suivant un re-déploiement (service worker `autoUpdate`).
- **Sauvegarde** : pense à exporter le JSON de temps en temps (Réglages) — c'est ton seul backup si le navigateur purge ses données.
