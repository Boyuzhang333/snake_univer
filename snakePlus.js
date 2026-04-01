// SnakePlus : héritage de Snake avec gestion de nourriture et croissance.
// - Tant que la longueur est < 8, chaque repas ajoute un nouvel anneau.
// - Au-delà de 8 anneaux, chaque repas augmente la taille (rayon) de la tête et des anneaux.
class SnakePlus extends Snake {
  constructor(x, y, length, taille, couleur) {
    super(x, y, length, taille, couleur);
    this.maxLengthBeforeSizeUp = 8;
    this.growthSizeStep = 2; // pixels de rayon ajoutés après la longueur 8
  }

  /**
   * Vérifie si la tête touche une nourriture.
   * @param {Food} food - objet avec pos (p5.Vector) et r (rayon).
   * @returns {boolean} true si mangé.
   */
  checkEat(food) {
    const d = p5.Vector.dist(this.head.pos, food.pos);
    const headRadius = this.head.r / 2;
    const foodRadius = food.r / 2;
    if (d <= headRadius + foodRadius) {
      this.grow();
      return true;
    }
    return false;
  }

  // Mange un autre serpent plus petit (comparaison sur le rayon de la tÃªte)
  checkEatSnake(otherSnake) {
    if (!otherSnake || otherSnake === this || !otherSnake.head) return false;
    // ne mange que plus petit
    if (otherSnake.head.r >= this.head.r) return false;

    const d = p5.Vector.dist(this.head.pos, otherSnake.head.pos);
    if (d <= (this.head.r / 2 + otherSnake.head.r / 2)) {
      this.grow();
      return true;
    }
    return false;
  }

  // Croissance : d'abord ajouter des anneaux jusqu'à 8, puis grossir.
  grow() {
    if (this.anneaux.length < this.maxLengthBeforeSizeUp) {
      const last = this.anneaux[this.anneaux.length - 1];
      const newSegment = new Vehicle(last.pos.x, last.pos.y, this.couleur);
      newSegment.maxForce = 2;
      newSegment.maxSpeed = 10;
      newSegment.r = this.r * 0.9;
      this.anneaux.push(newSegment);
    } else {
      this.r += this.growthSizeStep;
      this.head.r = this.r;
      for (let i = 1; i < this.anneaux.length; i++) {
        this.anneaux[i].r = this.r * 0.9;
      }
    }
  }
}

// Optionnel : classe Food minimale (si aucune autre n'existe).
// Utilisable comme : const food = new Food(random(width), random(height), 16);
class Food {
  constructor(x, y, r = 16) {
    this.pos = createVector(x, y);
    this.r = r;
  }

  show() {
    push();
    fill(255, 200, 0);
    noStroke();
    circle(this.pos.x, this.pos.y, this.r);
    pop();
  }
}
