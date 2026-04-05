// ──────────────────────────────────────────────────────────────────────────────
// Food : hérite de Vehicle pour bénéficier du moteur de déplacement.
//
// Comportement :
//   - Quand un serpent approche dans attractRadius, la nourriture se déplace
//     vers la tête du serpent le plus proche (seek).
//   - Quand aucun serpent n'est à portée, elle freine progressivement.
//
// Interface : creerFoodAleatoire() dans sketch.js continue de fonctionner
// sans modification (signature identique à l'ancien constructeur).
// ──────────────────────────────────────────────────────────────────────────────
class Food extends Vehicle {

  constructor(x, y, r = 16) {
    super(x, y);
    this.r = r;               // diamètre visuel, utilisé dans circle(x, y, this.r)
    this.attractRadius = 60; // rayon dans lequel la food se déplace vers un serpent
    this.maxSpeed = 5;
    this.maxForce = 0.12;
  }

  // Met à jour la physique de la nourriture chaque frame.
  // snakes : tableau global des serpents (pour détecter le plus proche).
  update(snakes) {
    let nearest = null;

    if (snakes && snakes.length > 0) {
      let bestDist = Infinity;
      for (const snake of snakes) {
        if (!snake.head) continue;
        const d = p5.Vector.dist(this.pos, snake.head.pos);
        if (d < this.attractRadius && d < bestDist) {
          bestDist = d;
          nearest = snake.head;
        }
      }
    }

    if (nearest) {
      // Se diriger vers la tête du serpent le plus proche
      this.applyForce(this.seek(nearest.pos));
      // Rester dans les limites du canvas
      this.applyForce(this.boundaries(0, 0, MAP_W, MAP_H, 50));
    } else {
      // Frein progressif : force opposée à la vitesse courante
      const brake = p5.Vector.mult(this.vel, -this.maxForce / Math.max(this.maxSpeed, 0.01));
      brake.limit(this.maxForce);
      this.applyForce(brake);
    }

    super.update();
  }

  show() {
    push();
    fill(255, 200, 0);
    noStroke();
    circle(this.pos.x, this.pos.y, this.r);

    // Debug : cercle de rayon d'attraction
    if (Vehicle.debug) {
      noFill();
      stroke(255, 200, 0, 80);
      strokeWeight(1);
      circle(this.pos.x, this.pos.y, this.attractRadius * 2);
    }
    pop();
  }
}
