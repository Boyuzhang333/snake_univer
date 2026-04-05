// ──────────────────────────────────────────────────────────────────────────────
// 8 étapes de croissance (stage 0 = plus petit/rapide, stage 7 = plus grand/lent)
// r           : rayon visuel (utilisé dans circle/rect/…)
// maxSegments : nombre maximum d'anneaux avant de passer à l'étape suivante
// maxSpeed    : vitesse max de la tête (corps intentionnellement plus rapide pour suivre)
// maxForce    : force de virage max de la tête
// ──────────────────────────────────────────────────────────────────────────────
const SNAKE_STAGES = [
  { r: 10, maxSegments:  8, maxSpeed: 7.0, maxForce: 0.50 }, // stage 0
  { r: 14, maxSegments: 20, maxSpeed: 6.0, maxForce: 0.42 }, // stage 1
  { r: 18, maxSegments: 30, maxSpeed: 5.2, maxForce: 0.35 }, // stage 2
  { r: 22, maxSegments: 44, maxSpeed: 4.5, maxForce: 0.28 }, // stage 3
  { r: 26, maxSegments: 60, maxSpeed: 4.0, maxForce: 0.22 }, // stage 4
  { r: 30, maxSegments: 70, maxSpeed: 4.0, maxForce: 0.17 }, // stage 5
  { r: 36, maxSegments: 80, maxSpeed: 4.0, maxForce: 0.12 }, // stage 6
  { r: 44, maxSegments: 100, maxSpeed: 4.0, maxForce: 0.08 }, // stage 7
];

// ──────────────────────────────────────────────────────────────────────────────
// SnakePlus : héritage de Snake
// Gestion de la nourriture, de la croissance par étapes et du rendu par étape.
// ──────────────────────────────────────────────────────────────────────────────
class SnakePlus extends Snake {

  // ── Interface texture ──────────────────────────────────────────────────────
  // Texture SVG pour la tête (partagée par toutes les instances).
  // Initialisée dans setup() après preload().
  static headTexture = null;

  // Retourne un p5.Image pour l'étape donnée, ou null pour utiliser la forme géométrique.
  static getStageTexture(_stageIndex) {
    return null;
  }

  // Dessine la forme d'une étape centrée en (x, y) avec le diamètre visuel size.
  // Utilise la texture si disponible, sinon la forme géométrique de secours.
  // isHead permet d'adapter la forme pour la tête si besoin à l'avenir.
  static drawSegmentShape(x, y, size, stageIndex, _isHead = false) {
    const tex = SnakePlus.getStageTexture(stageIndex);
    if (tex) {
      imageMode(CENTER);
      image(tex, x, y, size, size);
      return;
    }
    const r = size / 2;
    push();
    translate(x, y);
    switch (stageIndex) {
      case 0: // cercle
        circle(0, 0, size);
        break;
      case 1: // carré arrondi
        rectMode(CENTER);
        rect(0, 0, size * 0.88, size * 0.88, size * 0.2);
        break;
      case 2: // triangle équilatéral
        triangle(0, -r, r * 0.866, r * 0.5, -r * 0.866, r * 0.5);
        break;
      case 3: // losange
        quad(0, -r, r, 0, 0, r, -r, 0);
        break;
      case 4: // pentagone
        beginShape();
        for (let a = 0; a < 5; a++) {
          const ang = TWO_PI * a / 5 - HALF_PI;
          vertex(cos(ang) * r, sin(ang) * r);
        }
        endShape(CLOSE);
        break;
      case 5: // hexagone
        beginShape();
        for (let a = 0; a < 6; a++) {
          const ang = TWO_PI * a / 6;
          vertex(cos(ang) * r, sin(ang) * r);
        }
        endShape(CLOSE);
        break;
      case 6: // étoile à 5 branches
        beginShape();
        for (let a = 0; a < 10; a++) {
          const ang = TWO_PI * a / 10 - HALF_PI;
          const rad = (a % 2 === 0) ? r : r * 0.42;
          vertex(cos(ang) * rad, sin(ang) * rad);
        }
        endShape(CLOSE);
        break;
      case 7: // grand cercle avec anneau intérieur
        circle(0, 0, size);
        push();
        noFill();
        stroke(255, 255, 255, 130);
        strokeWeight(2);
        circle(0, 0, size * 0.58);
        pop();
        break;
    }
    pop();
  }

  // ── Constructeur ───────────────────────────────────────────────────────────
  constructor(x, y, length, taille, couleur) {
    super(x, y, length, taille, couleur);
    // Trouver l'étape la plus proche du taille demandé
    this.stageIndex = SnakePlus._findStageForRadius(taille);
    // Aligner this.r, head.r et les vitesses sur cette étape
    this._applyStage(this.stageIndex);
    // Décalage de teinte pour que chaque serpent ait une couleur différente
    this._hueOffset = random(360);
    // Compteur de panique : >0 = perte soudaine de segments récente
    this.panicFrames = 0;
    // Compétence trou noir (déverrouillée au stage 4)
    this.skill = new BlackHoleSkill(this);
  }

  // Retourne l'indice de l'étape dont le rayon est le plus proche de taille.
  static _findStageForRadius(taille) {
    let best = 0;
    let bestDiff = Infinity;
    for (let i = 0; i < SNAKE_STAGES.length; i++) {
      const diff = Math.abs(SNAKE_STAGES[i].r - taille);
      if (diff < bestDiff) { bestDiff = diff; best = i; }
    }
    return best;
  }

  // Applique atomiquement toutes les valeurs dérivées de l'étape idx :
  // rayon visuel, rayon de collision, vitesse/force de la tête, rayon des anneaux existants.
  _applyStage(idx) {
    const stage = SNAKE_STAGES[idx];
    this.stageIndex = idx;
    this.r = stage.r;
    this.head.r = stage.r;
    this.head.maxSpeed = stage.maxSpeed;
    this.head.maxForce = stage.maxForce;
    // Mise à jour des anneaux existants (corps)
    for (let i = 1; i < this.anneaux.length; i++) {
      this.anneaux[i].r = stage.r * 0.9;
      // Le corps reste rapide pour suivre la tête sans décrocher
      this.anneaux[i].maxSpeed = 10;
      this.anneaux[i].maxForce = 2;
    }
  }

  // ── Vérification collision nourriture ──────────────────────────────────────
  checkEat(food) {
    const d = p5.Vector.dist(this.head.pos, food.pos);
    if (d <= this.head.r / 2 + food.r / 2) {
      this.grow();
      return true;
    }
    return false;
  }

  // ── Vérification collision avec un autre serpent ───────────────────────────
  checkEatSnake(otherSnake) {
    if (!otherSnake || otherSnake === this || !otherSnake.head) return false;
    if (otherSnake.head.r >= this.head.r) return false;
    const d = p5.Vector.dist(this.head.pos, otherSnake.head.pos);
    if (d <= this.head.r / 2 + otherSnake.head.r / 2) {
      // Gain = 25% de (segments + stageIndex × maxSegments de son étape)
      const otherStage = otherSnake.stageIndex ?? 0;
      const otherMaxSegs = SNAKE_STAGES[otherStage].maxSegments;
      const gain = Math.max(1, Math.floor(0.25 * (otherSnake.anneaux.length + otherStage * otherMaxSegs)));
      this.growBy(gain);
      return true;
    }
    return false;
  }

  // ── Croissance ─────────────────────────────────────────────────────────────
  // Cas 1 : anneaux < max de l'étape → ajouter un anneau.
  // Cas 2 : anneaux >= max ET étape < 7 → passer à l'étape suivante.
  // Cas 3 : étape max ET anneaux max → rien.
  growBy(n) {
    for (let i = 0; i < n; i++) this.grow();
  }

  // Retire n anneaux depuis la queue ; conserve au minimum la tête.
  // Si la perte est ≥ 2, déclenche un état de panique (fuite rapide).
  shrinkBy(n) {
    const toRemove = Math.min(n, this.anneaux.length - 1);
    if (toRemove > 0) {
      this.anneaux.splice(this.anneaux.length - toRemove, toRemove);
      if (toRemove >= 2) this.panicFrames = 90; // ~1.5s de fuite paniquée
    }
  }

  grow() {
    const stage = SNAKE_STAGES[this.stageIndex];

    if (this.anneaux.length < stage.maxSegments) {
      // Ajouter un anneau en queue
      const last = this.anneaux[this.anneaux.length - 1];
      const seg = new Vehicle(last.pos.x, last.pos.y);
      seg.r = this.r * 0.9;
      seg.maxSpeed = 10;
      seg.maxForce = 2;
      this.anneaux.push(seg);
    } else if (this.stageIndex < SNAKE_STAGES.length - 1) {
      // Passer à l'étape suivante
      this._applyStage(this.stageIndex + 1);
    }
    // Sinon : étape 7 et segments au maximum → on ne fait rien
  }

  // ── Rendu : forme selon l'étape ────────────────────────────────────────────
  dessineTete() {
    push();
    translate(this.head.pos.x, this.head.pos.y);
    // Rotation vers la direction de déplacement
    if (this.head.vel.mag() > 0.01) rotate(this.head.vel.heading() + HALF_PI);

    if (SnakePlus.headTexture) {
      // Teinte arc-en-ciel qui tourne dans le temps
      push();
      colorMode(HSB, 360, 100, 100, 255);
      tint((frameCount * 1.5 + this._hueOffset) % 360, 70, 100);
      imageMode(CENTER);
      image(SnakePlus.headTexture, 0, 0, this.r * 2, this.r * 2);
      noTint();
      pop();
    } else {
      fill(this.couleur);
      noStroke();
      SnakePlus.drawSegmentShape(0, 0, this.r, this.stageIndex, true);
      // Yeux superposés à la forme (en espace local)
      const eyeOffsetX = this.r / 6;
      const eyeOffsetY = this.r / 6;
      const eyeSize    = this.r / 5;
      fill(255);
      circle(-eyeOffsetX, -eyeOffsetY, eyeSize);
      circle(eyeOffsetX, -eyeOffsetY, eyeSize);
    }
    pop();
  }

  dessineLesAnneaux() {
    this.anneaux.forEach((anneau, index) => {
      if (index === 0) return; // la tête est dessinée séparément
      const inter = map(index, 0, this.anneaux.length - 1, 0, 1);
      const couleurAnneau = lerpColor(color(this.couleur), color(0, 100, 0), inter);
      push();
      fill(couleurAnneau);
      noStroke();
      SnakePlus.drawSegmentShape(anneau.pos.x, anneau.pos.y, this.r * 0.9, this.stageIndex, false);
      pop();
    });
  }

  // ── Debug overlay ──────────────────────────────────────────────────────────
  showDebug() {
    if (!Vehicle.debug) return;
    const hx = this.head.pos.x;
    const hy = this.head.pos.y;
    push();
    // Cercle de collision (rayon d'ingestion)
    noFill();
    stroke(0, 255, 120, 110);
    strokeWeight(1);
    circle(hx, hy, this.head.r);
    // Infos : étape / segments / vitesse
    fill(200, 255, 200);
    noStroke();
    textSize(10);
    textAlign(LEFT, TOP);
    const stage = SNAKE_STAGES[this.stageIndex];
    text(`stage:${this.stageIndex}  seg:${this.anneaux.length}/${stage.maxSegments}  spd:${this.head.maxSpeed.toFixed(1)}`, hx + this.r + 5, hy - 10);
    // État de la compétence
    if (this.skill) {
      fill(180, 120, 255);
      text(`Q[${this.skill.state}]`, hx + this.r + 5, hy + 3);
    }
    pop();
  }
}

// Food est défini dans food.js
