# Instructions de développement — Cosmic Snake

## Contraintes obligatoires
1. Les fichiers `snake.js`, `snakeWander.js`, `vehicle.js`, `boids.js` ne doivent **jamais** être modifiés.
2. Pour modifier le comportement d'une classe, créer une **sous-classe** qui hérite de la classe parente.

---

## Step 1 — Classes de base, nourriture, wander

**Types de serpents**
- `SnakePlus` : mange de la nourriture et grandit ; si longueur < 8, ajoute un anneau, sinon augmente le rayon (tête et corps synchronisés). Peut manger les serpents dont la tête est plus petite que la sienne.
- `SnakeWanderPlus` : comportement encapsulé dans `behave(snakes, foods, target, radius)` :
  - Priorité 1 : chercher un serpent plus petit dans le rayon (défaut 200 px) et le chasser.
  - Priorité 2 : si aucun petit serpent, chercher la nourriture la plus proche dans le rayon.
  - Priorité 3 : si rien, exécuter `wander`.
  - En mode debug (`Vehicle.debug=true`) : affiche les étiquettes des cibles (`S<index>`, `F<index>`) et le cercle de détection.

**Nourriture**
- Spawn limité à 50 px des bords : `creerFoodAleatoire()`.
- Mangée quand la distance tête–nourriture ≤ somme des rayons ; remplacée immédiatement.

**Debug wander**
- Dans `vehicle.js`, quand `Vehicle.debug=true` : point rouge (centre du cercle wander), cercle blanc, point vert (cible), ligne jaune.
- Touche `d` pour basculer le mode debug.

**Raccourcis clavier**
- `d` : activer/désactiver le mode debug.
- `a` : générer un `SnakeWanderPlus` aléatoire.

---

## Step 2 — Stades de croissance et vitesses

1. Plus le serpent est grand, plus il est lent (vitesse et force de virage).
2. Chaque stade a une forme géométrique différente pour ses anneaux (interface texture prévue pour les futurs sprites).
3. 8 stades de croissance uniquement.
4. Nombre maximum d'anneaux lié au stade.
5. Les serpents générés aléatoirement respectent les contraintes de chaque stade.

| Stade | Rayon r | Max anneaux | maxSpeed | maxForce |
|:-----:|:-------:|:-----------:|:--------:|:--------:|
| 0 (min) | 10 |   8 | 7.0 | 0.50 |
| 1       | 14 |  20 | 6.0 | 0.42 |
| 2       | 18 |  30 | 5.2 | 0.35 |
| 3       | 22 |  44 | 4.5 | 0.28 |
| 4       | 26 |  60 | 4.0 | 0.22 |
| 5       | 30 |  70 | 4.0 | 0.17 |
| 6       | 36 |  80 | 4.0 | 0.12 |
| 7 (max) | 44 | 100 | 4.0 | 0.08 |

---

## Step 3 — Croissance avancée et fuite

1. **Manger de la nourriture** : +1 anneau.
2. **Manger un serpent** : gain = `floor(0.25 × (nb_anneaux + stade × max_anneaux))` (rendement ~25 % comme dans la nature).
3. **Fuite** : si un serpent plus grand est détecté dans le rayon, fuir en priorité absolue.
4. La vitesse de fuite est supérieure à la vitesse normale.

---

## Step 4 — Classe Food

1. Extraire la classe `Food` dans un fichier dédié `food.js`.
2. Quand un serpent s'approche dans un rayon d'attraction, la nourriture se déplace vers la tête du serpent.
3. `Food` hérite de `Vehicle` pour réutiliser la physique de déplacement (`seek`, `boundaries`, `update`).

---

## Step 5 — Classe Spaceship et lasers

1. Créer `Spaceship` en héritant de `Boid` (flocking de base gratuit).
2. Générer 30 vaisseaux aléatoirement sur la carte.
3. Les vaisseaux tirent des lasers sur la nourriture et les serpents à portée.
4. Un laser qui touche de la nourriture l'absorbe.
5. Un laser qui touche un serpent réduit sa longueur de `floor(0.25 × (nb_anneaux + stade × max_anneaux))`.

---

## Step 6 — Corrections et équilibrage

1. **Dégâts laser améliorés** : les grands serpents résistent mieux. Dégât = `max(1, floor((8 - stade) / 2))`.
2. **Vaisseau comestible** : les serpents peuvent manger les vaisseaux ; les vaisseaux fuient si un serpent s'approche.
3. **Debug** : afficher le rayon d'attraction de la nourriture et les rayons d'attaque/fuite des vaisseaux.
4. **Mort du serpent** : un serpent qui n'a plus que la tête est supprimé.
5. **Panique** : si un serpent perd rapidement plusieurs anneaux, il fuit temporairement à grande vitesse.
6. Toutes les modifications doivent rester compatibles avec un futur remplacement par des sprites.

---

## Step 7 — Compétence Trou Noir (BlackHoleSkill)

1. La tête **et** le corps peuvent être touchés par les lasers.
2. Compétence `BlackHoleSkill` : attire vers la tête toute unité mangeable (nourriture, vaisseau, serpent plus petit) dans un rayon de 250 px, pendant 2 secondes.
3. Barre de chargement au-dessus de la tête pendant 2 secondes avant activation.
4. Durée active : 2 secondes. Le serpent est immobile pendant toute la compétence (casting + actif).
5. Déverrouillé à partir du stade 4 (index 3).
6. Touche `q` pour le serpent joueur ; les `SnakeWanderPlus` l'activent aléatoirement.
7. La logique de compétence est dans une classe dédiée `BlackHoleSkill` (`skill.js`).

---

## Step 8 — Nettoyage et vérification architecture

1. Supprimer le système de score.
2. Vérifier que toutes les classes respectent le principe d'héritage.

**Résultat de l'audit d'héritage :**

| Classe | Parent | Statut |
|:--|:--|:--|
| `Food` | `Vehicle` | ✓ Réutilise seek / boundaries / update |
| `Spaceship` | `Boid` | ✓ Réutilise le flocking |
| `SnakePlus` | `Snake` | ✓ Étend croissance, stades, compétence |
| `SnakeWanderPlus` | `SnakePlus` | ✓ Étend le comportement IA |
| `BlackHoleSkill` | — | ✓ Justifié : machine à états, pas une entité physique |
| `Laser` | — | ✓ Justifié : effet visuel éphémère |

---

## Step 9 — Visualisations debug complètes

En mode debug (`d`) :
- **WANDER** : cercle bleu + étiquette sur la tête.
- **FOOD** : étiquette jaune + ligne vers la nourriture ciblée.
- **CHASE** : étiquette verte + ligne vers le serpent ciblé.
- **FLEE** : étiquette rouge + ligne vers la menace + cercle de détection.
- **PANIC** : étiquette magenta + cercle élargi + ligne vers la cible de fuite.
- **Cercle de collision** (rayon d'ingestion) sur chaque tête.
- **Infos HUD par serpent** : stade, nb anneaux / max, vitesse, état compétence.
- **Rayon d'attraction** des nourritures (cercle jaune transparent).
- **Rayons d'attaque et de fuite** des vaisseaux (cercles cyan/rouge transparents).

---

## Step 10 — Grande carte et caméra

1. Carte agrandie : **4000 × 3000 px** (≈ 3× la fenêtre).
2. Bordure dessinée comme un mur (halo bleu + trait bleu).
3. La caméra suit la tête du serpent joueur (centré à l'écran, clampé aux bords).
4. Coordonnées souris converties en espace monde : `target = mousePos + camera`.
5. Les forces `boundaries()` de tous les objets utilisent les dimensions de la carte.

---

## Step 11 — Sprite tête de serpent

1. Remplacer la forme géométrique de la tête par `bright_snake_monster.svg`.
2. L'image tourne pour suivre la direction du déplacement (`vel.heading() + HALF_PI`).
3. Fallback géométrique si l'image n'est pas chargée.

---

## Step 12 — Sprites et colorisation

1. La tête du serpent reçoit une teinte arc-en-ciel animée (`tint` HSB tournant avec `frameCount`). Chaque serpent a un décalage de teinte aléatoire propre.
2. Remplacer le triangle des vaisseaux par `bright_spaceship.svg` (même logique de rotation).

---

## Step 13 — Logique de jeu et interface

1. **Game over** : le serpent joueur meurt → écran de fin avec bouton rejouer.
2. **Victoire** : stade 7 + anneaux au maximum → écran de victoire.
3. **Écran de démarrage** : cliquer pour lancer la partie.
4. **Sliders debug** (visibles avec `d`) :
   - Vitesse joueur (`maxSpeed`)
   - Force de virage joueur (`maxForce`)
   - Rayon de détection des IA (`wanderDetectRadius`)
   - Rayon du trou noir (`BlackHoleSkill.PULL_RADIUS`)

---

## Step 14 — Initialisation

1. Générer **10 serpents IA** (`SnakeWanderPlus`) au démarrage, de stades et couleurs aléatoires, répartis sur toute la carte.

---

## Step 15 — Écran de démarrage narratif

Réécrire l'écran de démarrage avec le contexte narratif du jeu :
- Tu es un jeune serpent cosmique dans un champ d'astéroïdes.
- Des flottes humaines collectent les météorites — tu peux les dévorer mais leurs lasers t'attaquent.
- Fuis les serpents plus grands, chasse les plus petits.
- Atteins le stade maximum pour gagner.
- La compétence Trou Noir se débloque à partir d'un certain stade.
