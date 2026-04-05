// ──────────────────────────────────────────────────────────────────────────────
// BlackHoleSkill : compétence "trou noir" pour les serpents.
//
// États : 'ready' → 'casting' (2s) → 'active' (2s) → 'cooldown' (5s) → 'ready'
//
// Pendant 'casting' : barre de lecture au-dessus de la tête, serpent immobile.
// Pendant 'active'  : tout ce qui est dans PULL_RADIUS est aspiré vers la tête
//                     (food, vaisseau, serpent plus petit). Le checkEat() habituel
//                     gère la collision et les effets. Serpent toujours immobile.
//
// Déverrouillage    : stageIndex ≥ UNLOCK_STAGE (stage 4 = index 3).
// Touche            : 'q' pour le joueur, activation aléatoire pour les SnakeWanderPlus.
// ──────────────────────────────────────────────────────────────────────────────
class BlackHoleSkill {
  static UNLOCK_STAGE    = 3;   // stage 4, index 0-based
  static CAST_FRAMES     = 120; // 2 s à 60 fps
  static ACTIVE_FRAMES   = 120; // 2 s
  static COOLDOWN_FRAMES = 300; // 5 s de recharge
  static PULL_RADIUS     = 250; // rayon d'aspiration (px)
  static PULL_SPEED      = 7;   // px/frame vers la tête

  constructor(snake) {
    this.snake = snake;
    this.state = 'ready'; // 'ready' | 'casting' | 'active' | 'cooldown'
    this.timer = 0;
  }

  // Peut-on activer ? Stade suffisant et pas en cours.
  canActivate() {
    return this.state === 'ready' &&
           this.snake.stageIndex >= BlackHoleSkill.UNLOCK_STAGE;
  }

  // La compétence bloque-t-elle le mouvement du serpent ?
  isBlocking() {
    return this.state === 'casting' || this.state === 'active';
  }

  // Déclenche la compétence. Retourne true si succès.
  activate() {
    if (!this.canActivate()) return false;
    this.state = 'casting';
    this.timer = BlackHoleSkill.CAST_FRAMES;
    return true;
  }

  // Mise à jour chaque frame.
  // snakes, foods, spaceships : tableaux globaux du sketch.
  update(snakes, foods, spaceships) {
    if (this.state === 'casting') {
      this.timer--;
      if (this.timer <= 0) {
        this.state = 'active';
        this.timer = BlackHoleSkill.ACTIVE_FRAMES;
      }

    } else if (this.state === 'active') {
      this.timer--;
      this._pull(snakes, foods, spaceships);
      if (this.timer <= 0) {
        this.state = 'cooldown';
        this.timer = BlackHoleSkill.COOLDOWN_FRAMES;
      }

    } else if (this.state === 'cooldown') {
      this.timer--;
      if (this.timer <= 0) this.state = 'ready';
    }
  }

  // ── Aspiration ─────────────────────────────────────────────────────────────
  _pull(snakes, foods, spaceships) {
    const head = this.snake.head.pos;
    const r    = BlackHoleSkill.PULL_RADIUS;
    const spd  = BlackHoleSkill.PULL_SPEED;

    const pullToward = (pos) => {
      const d = p5.Vector.dist(head, pos);
      if (d < r && d > 2) {
        const dir = p5.Vector.sub(head, pos);
        dir.setMag(min(spd, d));
        pos.add(dir);
      }
    };

    foods.forEach(f => pullToward(f.pos));
    spaceships.forEach(s => pullToward(s.pos));
    snakes.forEach(s => {
      if (s === this.snake || !s.head) return;
      if (s.head.r >= this.snake.head.r) return; // seulement plus petits
      pullToward(s.head.pos);
    });
  }

  // ── Rendu ──────────────────────────────────────────────────────────────────
  show() {
    const head = this.snake.head.pos;
    const r    = this.snake.r;

    if (this.state === 'casting') {
      const progress = 1 - this.timer / BlackHoleSkill.CAST_FRAMES;
      const barW = 60, barH = 10;
      push();
      // Fond de la barre
      fill(30, 30, 30, 210);
      noStroke();
      rect(head.x - barW / 2, head.y - r - 26, barW, barH, 3);
      // Remplissage violet
      fill(160, 0, 255);
      rect(head.x - barW / 2, head.y - r - 26, barW * progress, barH, 3);
      // Contour
      noFill();
      stroke(210, 120, 255);
      strokeWeight(1);
      rect(head.x - barW / 2, head.y - r - 26, barW, barH, 3);
      pop();

    } else if (this.state === 'active') {
      const t = frameCount * 0.08;
      push();
      // Cercle de rayon d'aspiration
      noFill();
      stroke(140, 0, 255, 90);
      strokeWeight(1.5);
      circle(head.x, head.y, BlackHoleSkill.PULL_RADIUS * 2);

      // Anneaux tourbillonnants
      for (let i = 1; i <= 3; i++) {
        const alpha = map(i, 1, 3, 180, 60);
        const rad   = r * (1.2 + i * 0.6 + sin(t * (4 - i)) * 0.25);
        stroke(140 + i * 20, 0, 255 - i * 30, alpha);
        strokeWeight(3 - i * 0.5);
        circle(head.x, head.y, rad * 2);
      }

      // Noyau sombre
      fill(8, 0, 20, 230);
      noStroke();
      circle(head.x, head.y, r * 2.2);

      // Arc de temps restant
      const arcProg = this.timer / BlackHoleSkill.ACTIVE_FRAMES;
      noFill();
      stroke(210, 120, 255);
      strokeWeight(2);
      arc(head.x, head.y, r * 3.2, r * 3.2, -HALF_PI, -HALF_PI + TWO_PI * arcProg);
      pop();
    }
  }
}
