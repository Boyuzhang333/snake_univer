# 🐍 Cosmic Snake

## 🔗 Lien du jeu
**[▶ Jouer en ligne](https://boyuzhang333.github.io/snake_univer/)**

---

## 🌌 Histoire

Dans un secteur stellaire lointain vit une créature cosmique : le **Serpent Cosmique**, qui se nourrit des météorites chargées d'énergie de cette région.

Des flottes de vaisseaux extraterrestres viennent également collecter ces mêmes ressources.

Tu incarnes un jeune serpent cosmique tout juste né. Tu dois :
- Fuir les serpents plus grands que toi
- Chasser les serpents plus petits
- Dévorer les météorites (nourriture) et les vaisseaux ennemis
- Survivre aux lasers des vaisseaux qui t'attaquent

**Objectif** : devenir le serpent le plus grand de ce secteur stellaire.

---

## 🎮 Contrôles

| Touche | Action |
|:------:|:-------|
| **Souris** | Diriger le serpent joueur |
| **Q** | Activer la compétence Trou Noir (débloquée au stade 4) |
| **A** | Faire apparaître un serpent IA aléatoire |
| **D** | Activer/désactiver le mode debug |

**Compétence Trou Noir** : après 2 secondes de chargement, attire vers la tête toute unité mangeable dans un rayon de 250 px pendant 2 secondes. Le serpent est immobile pendant l'activation.

---

## 🏆 Conditions de victoire / défaite

- **Game Over** : ta tête est mangée par un serpent plus grand, ou tu es réduit à zéro anneau par les lasers.
- **Victoire** : atteindre le **stade 7** avec le nombre maximum d'anneaux (100).

---

## ⚙️ Architecture technique

### Hiérarchie des classes

Tous les objets animés héritent de `Vehicle` (fourni) :

```
Vehicle
├── Food             — nourriture, seek vers les serpents proches
├── Snake            — serpent de base (fourni)
│   └── SnakePlus    — gestion des stades, croissance, compétence
│       └── SnakeWanderPlus  — comportement IA autonome
└── Boid             — flocking de base (fourni)
    └── Spaceship    — vaisseaux, lasers, fuite
```

Classes utilitaires indépendantes (pas d'entité physique) :
- `BlackHoleSkill` — machine à états de la compétence
- `Laser` — effet visuel éphémère

---

## 🧠 Comportements de steering utilisés

### `seek` — Chercher une cible
Utilisé par :
- `Food` : se déplace vers la tête du serpent le plus proche quand il est dans le rayon d'attraction.
- `SnakeWanderPlus` (via `chase`) : le serpent fonce vers une proie (petit serpent ou nourriture).

### `arrive` — Arriver avec freinage
Utilisé par :
- `Snake.move()` : la tête *arrive* à la position de la souris avec décélération.
- Chaque anneau du corps *arrive* à la position de l'anneau précédent, créant le mouvement de chenille.

### `flee` — Fuir une menace
Utilisé par :
- `SnakeWanderPlus` : fuit les serpents plus grands détectés dans le rayon.
- `Spaceship` : fuit si un serpent s'approche dans son rayon de détection.
- **Mode panique** : si un serpent perd plusieurs anneaux rapidement, il fuit à vitesse doublée pendant ~1,5 secondes.

### `wander` — Errer aléatoirement
Utilisé par :
- `SnakeWanderPlus` : comportement par défaut quand aucune cible n'est à portée.
- Crée un mouvement organique en ciblant un point aléatoire sur un cercle devant la tête.

### `boundaries` — Rester dans les limites
Utilisé par tous les objets mobiles : applique une force de répulsion douce quand un objet s'approche des bords de la carte (4000 × 3000 px).

### `separation`, `alignment`, `cohesion` — Flocking (Boids)
Utilisés par `Spaceship` (hérité de `Boid`) : les vaisseaux se déplacent en flotte cohérente, s'évitent, s'alignent, et restent groupés.

### Système de stades de croissance

Le serpent évolue à travers **8 stades** définis dans `SNAKE_STAGES`. À chaque stade correspond une forme géométrique unique (cercle, carré arrondi, triangle, losange, pentagone, hexagone, étoile, cercle avec anneau), une taille, une vitesse et un nombre maximum d'anneaux. L'interface texture est prévue pour remplacer ces formes par des sprites.

| Stade | Rayon r | Max anneaux | maxSpeed | maxForce | Forme |
|:-----:|:-------:|:-----------:|:--------:|:--------:|:-----:|
| 0 (min) | 10 |   8 | 7.0 | 0.50 | Cercle |
| 1       | 14 |  20 | 6.0 | 0.42 | Carré arrondi |
| 2       | 18 |  30 | 5.2 | 0.35 | Triangle |
| 3       | 22 |  44 | 4.5 | 0.28 | Losange |
| 4       | 26 |  60 | 4.0 | 0.22 | Pentagone ★ unlock skill |
| 5       | 30 |  70 | 4.0 | 0.17 | Hexagone |
| 6       | 36 |  80 | 4.0 | 0.12 | Étoile |
| 7 (max) | 44 | 100 | 4.0 | 0.08 | Cercle + anneau |

**Règle de croissance :**
- Manger une nourriture → +1 anneau
- Manger un serpent → `floor(0.25 × (anneaux + stade × max_anneaux))` anneaux (rendement 25 %)
- Quand le max d'anneaux du stade est atteint → passage au stade suivant (rayon et vitesse mis à jour)

---

### Comportements combinés — `SnakeWanderPlus.behave()`

Chaque frame, le serpent IA évalue la situation et choisit **un seul comportement** selon un ordre de priorité strict. Le rayon de détection est de 200 px par défaut (réglable via slider en mode debug).

```
┌─────────────────────────────────────────────────────────────┐
│  Chaque frame, le serpent évalue dans cet ordre :           │
│                                                             │
│  1. PANIC  ──► perte soudaine de segments ?                 │
│       OUI → fuite à vitesse ×2, rayon élargi ×2            │
│       NON ↓                                                 │
│                                                             │
│  2. FLEE   ──► serpent PLUS GRAND dans le rayon ?           │
│       OUI → s'éloigner à vitesse ×1.5                       │
│       NON ↓                                                 │
│                                                             │
│  3. CHASE  ──► serpent PLUS PETIT dans le rayon ?           │
│       OUI → foncer dessus (seek sans freinage)              │
│       NON ↓                                                 │
│                                                             │
│  4. FOOD   ──► nourriture dans le rayon ?                   │
│       OUI → se diriger vers la plus proche                  │
│       NON ↓                                                 │
│                                                             │
│  5. WANDER ──► rien à portée → errance aléatoire            │
└─────────────────────────────────────────────────────────────┘
```

**Pourquoi cette priorité ?**
- La **survie prime** sur la chasse (fuir > chasser). Un serpent ne risque pas sa vie pour de la nourriture.
- La **panique** (perte rapide d'anneaux sous laser) déclenche une fuite immédiate même si aucune menace directe n'est visible — instinct de survie.
- **Chasser un serpent** est prioritaire sur la nourriture : une proie apporte beaucoup plus de croissance (gain ×25 % des segments de la cible).
- **Wander** est le comportement par défaut : le serpent n'est jamais immobile, il explore continuellement.

---

## 🐛 MON EXPERIENCE

### Pourquoi ce jeu ?
J'ai choisi de faire un jeu de type *survival snake* dans un univers cosmique car ce concept permettait d'explorer naturellement de nombreux steering behaviors : un serpent doit chercher, fuir, errer, et interagir avec des entités aux comportements variés. Le thème spatial donnait aussi une liberté visuelle intéressante.

### Comportements choisis et réglage

**`arrive` pour le mouvement du serpent joueur** : j'ai choisi `arrive` plutôt que `seek` pour que la tête ralentisse en approchant de la souris, rendant le contrôle plus fluide. Le corps utilise aussi `arrive` avec un rayon de freinage court (15–20 px) pour suivre l'anneau précédent sans décrocher.

**Vitesse inversement proportionnelle au stade** : j'ai défini 8 stades de croissance avec des valeurs décroissantes de `maxSpeed` (7.0 → 4.0) et `maxForce` (0.50 → 0.08). Cela crée un équilibre naturel : les petits serpents sont agiles mais fragiles, les grands sont puissants mais lents.

**Flocking pour les vaisseaux** : hériter de `Boid` était le choix évident pour obtenir gratuitement le comportement de flotte. J'ai ajouté la fuite et le tir laser par-dessus sans toucher au code de base.

### Difficultés rencontrées

**1. Direction de l'image du serpent**
Après avoir remplacé la tête par un sprite SVG, l'image ne faisait pas face à la bonne direction. La cause : en p5.js, `vel.heading()` donne l'angle par rapport à l'axe X, mais le SVG était orienté vers le haut. **Résolution** : ajouter un offset de `+HALF_PI` à la rotation.

**2. Densité de nourriture insuffisante après l'agrandissement de la carte**
En passant d'une carte fenêtre (~2M px²) à 4000×3000 (12M px²) avec le même nombre de nourritures (200), la densité a chuté de 6×. Le serpent ne pouvait plus atteindre le stade 3 pour débloquer la compétence. **Résolution** : augmenter le nombre initial de nourritures à 600.

**3. Caractères chinois non affichés**
Le texte de l'écran de démarrage écrit en chinois ne s'affichait pas car la police `inconsolata.otf` ne supporte pas les caractères CJK. **Résolution** : réécrire tous les textes en français, entièrement compatibles avec la police chargée.

**4. `snakeWander.js` supprimé mais référencé dans `index.html`**
Après refactoring, `SnakeWanderPlus` hérite directement de `SnakePlus` et n'utilise plus `SnakeWander`. Le fichier avait été supprimé mais le tag `<script>` restait dans le HTML, causant une erreur 404. **Résolution** : retirer la balise script correspondante.

**5. Équilibrage des dégâts laser**
La formule initiale de dégâts (25 % des segments) tuait trop vite les petits serpents et pas assez les grands. **Résolution** : formule `max(1, floor((8 - stade) / 2))` — les petits (stade 0) perdent 4 anneaux, les grands (stade 7) n'en perdent qu'1.

---

## 🛠️ Outils utilisés

- **IDE** : Visual Studio Code
- **Modèle IA** : Claude Sonnet 4.6 (Anthropic) via Claude Code (extension VS Code)
- **Fichier de suivi IA** : `instruction.md` — contient toutes les instructions données à l'assistant, step par step

---

## 🎬 Vidéo de démonstration

> *(lien YouTube à ajouter)*

---

## 📁 Structure du projet

```
├── index.html              — point d'entrée
├── sketch.js               — boucle principale, états du jeu, caméra
├── vehicle.js              — classe de base Vehicle (fourni, non modifié)
├── boids.js                — classe Boid / flocking (fourni, non modifié)
├── snake.js                — classe Snake de base (fourni, non modifié)
├── snakePlus.js            — SnakePlus : stades, croissance, skill, sprites
├── snakeWanderPlus.js      — SnakeWanderPlus : IA autonome (behave)
├── food.js                 — Food : hérite de Vehicle, attraction
├── spaceship.js            — Spaceship : hérite de Boid, lasers, fuite
├── skill.js                — BlackHoleSkill : machine à états
├── bright_snake_monster.svg
├── bright_spaceship.svg
├── instruction.md          — journal de développement (instructions IA)
└── readme.md               — ce fichier
```
