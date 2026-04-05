// ──────────────────────────────────────────────────────────────────────────────
// Laser : rayon laser tiré par un Spaceship. Purement visuel ;
// l'effet (dégât / score) est appliqué immédiatement au moment du tir.
// ──────────────────────────────────────────────────────────────────────────────
class Laser {
  constructor(from, to) {
    this.from = from.copy();
    this.to   = to.copy();
    this.life = 20;
  }

  update() { this.life--; }
  isDead()  { return this.life <= 0; }

  show() {
    push();
    const alpha = map(this.life, 0, 20, 0, 255);
    stroke(0, 255, 255, alpha);
    strokeWeight(2);
    line(this.from.x, this.from.y, this.to.x, this.to.y);
    fill(255, 255, 0, alpha);
    noStroke();
    circle(this.to.x, this.to.y, 8);
    pop();
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Spaceship : hérite de Boid.
// Propriétés « food-like » (pos, r) : les serpents peuvent le manger via checkEat().
// Comportement : flocking + tir laser + fuite si un serpent s'approche.
// ──────────────────────────────────────────────────────────────────────────────
class Spaceship extends Boid {
  // Texture SVG partagée par toutes les instances. Initialisée dans setup().
  static shipTexture = null;

  // Retourne un p5.Image ou null → dessine la forme géométrique par défaut.
  static getTexture() { return Spaceship.shipTexture; }

  constructor(x, y) {
    super(x, y);
    this.r                = 12;   // rayon de collision (aussi utilisé pour checkEat)
    this.maxSpeed         = 3.5;
    this.maxForce         = 0.2;
    this.perceptionRadius = 60;
    this.attackRadius     = 180;  // portée d'attaque laser
    this.fleeRadius       = 150;  // portée de détection des serpents (fuite)
    this.fireCooldownMax  = 90;
    this.fireCooldown     = floor(random(this.fireCooldownMax));
    this.lasers           = [];
  }

  // ── Flocking sans avoid() (pas d'obstacles) ───────────────────────────────
  flock(spaceships) {
    const alignment  = this.align(spaceships);
    const cohesion   = this.cohesion(spaceships);
    const separation = this.separation(spaceships);
    const boundaries = this.boundaries(0, 0, MAP_W, MAP_H, 50);

    alignment .mult(this.alignWeight);
    cohesion  .mult(this.cohesionWeight);
    separation.mult(this.separationWeight);
    boundaries.mult(this.boundariesWeight);

    this.applyForce(alignment);
    this.applyForce(cohesion);
    this.applyForce(separation);
    this.applyForce(boundaries);
  }

  // ── Fuite si un serpent est dans fleeRadius ───────────────────────────────
  // Applique les forces de fuite et retourne true ; retourne false si aucun serpent.
  applyFleeIfThreatened(snakes) {
    let nearestDist   = Infinity;
    let nearestTarget = null;
    for (const snake of snakes) {
      if (!snake.head) continue;
      const d = p5.Vector.dist(this.pos, snake.head.pos);
      if (d < this.fleeRadius && d < nearestDist) {
        nearestDist   = d;
        nearestTarget = snake.head.pos;
      }
    }
    if (!nearestTarget) return false;

    const forceFlee = this.flee(nearestTarget); // Boid.flee() = seek inversé
    forceFlee.mult(2);
    this.applyForce(forceFlee);
    this.applyForce(this.boundaries(0, 0, MAP_W, MAP_H, 50));
    return true;
  }

  // ── Attaque laser ─────────────────────────────────────────────────────────
  // Retourne { type: 'food'|'snake', idx } ou null.
  attack(snakes, foods) {
    if (this.fireCooldown > 0) { this.fireCooldown--; return null; }

    let nearestFoodIdx  = -1, nearestFoodDist  = Infinity;
    for (let i = 0; i < foods.length; i++) {
      const d = p5.Vector.dist(this.pos, foods[i].pos);
      if (d < this.attackRadius && d < nearestFoodDist) { nearestFoodDist = d; nearestFoodIdx = i; }
    }

    // Chercher le serpent dont un segment (tête OU corps) est dans la portée
    let nearestSnakeIdx = -1, nearestSnakeDist = Infinity, nearestSnakeSeg = null;
    for (let i = 0; i < snakes.length; i++) {
      const s = snakes[i];
      const segments = s.anneaux || (s.head ? [s.head] : []);
      for (const seg of segments) {
        const d = p5.Vector.dist(this.pos, seg.pos);
        if (d < this.attackRadius && d < nearestSnakeDist) {
          nearestSnakeDist = d;
          nearestSnakeIdx  = i;
          nearestSnakeSeg  = seg.pos; // position du segment le plus proche
        }
      }
    }

    if (nearestFoodIdx >= 0) {
      this.lasers.push(new Laser(this.pos, foods[nearestFoodIdx].pos));
      this.fireCooldown = this.fireCooldownMax;
      return { type: 'food', idx: nearestFoodIdx };
    }
    if (nearestSnakeIdx >= 0) {
      this.lasers.push(new Laser(this.pos, nearestSnakeSeg));
      this.fireCooldown = this.fireCooldownMax;
      return { type: 'snake', idx: nearestSnakeIdx };
    }
    return null;
  }

  updateLasers() {
    for (let i = this.lasers.length - 1; i >= 0; i--) {
      this.lasers[i].update();
      if (this.lasers[i].isDead()) this.lasers.splice(i, 1);
    }
  }

  show() {
    for (const laser of this.lasers) laser.show();

    // Interface texture : remplacer le triangle par image() quand asset disponible
    const tex = Spaceship.getTexture();
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.vel.heading() + HALF_PI);
    if (tex) {
      imageMode(CENTER);
      image(tex, 0, 0, this.r * 2, this.r * 2);
    } else {
      fill(100, 200, 255);
      stroke(0, 255, 255);
      strokeWeight(1);
      triangle(this.r, 0, -this.r, -this.r * 0.6, -this.r, this.r * 0.6);
    }
    pop();

    // Debug : cercles de portée
    if (Boid.debug) {
      push();
      noFill();
      stroke(0, 255, 255, 60);
      strokeWeight(1);
      circle(this.pos.x, this.pos.y, this.attackRadius * 2);
      stroke(255, 100, 100, 60);
      circle(this.pos.x, this.pos.y, this.fleeRadius * 2);
      pop();
    }
  }
}
