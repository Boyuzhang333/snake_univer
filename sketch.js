// ── Carte agrandie ───────────────────────────────────────────────────────────
const MAP_W = 4000;
const MAP_H = 3000;

let target;
let vehicles = [];
let snakes = [];
let foods = [];
let spaceships = [];
let playerSnake = null;

// ── Caméra ───────────────────────────────────────────────────────────────────
let cameraX = 0;
let cameraY = 0;

// ── État du jeu : 'start' | 'playing' | 'gameover' | 'win' ──────────────────
let gameState = 'start';

// ── Rayon de détection (contrôlable via slider) ──────────────────────────────
let wanderDetectRadius = 200;

// ── Sliders debug (créés une fois dans setup) ────────────────────────────────
let sliderSpeed, sliderForce, sliderDetectR, sliderPullR;

// ── Assets ───────────────────────────────────────────────────────────────────
let snakeHeadImg;
let spaceshipImg;
let font;

function preload() {
  font = loadFont('./assets/inconsolata.otf');
  snakeHeadImg = loadImage('bright_snake_monster.svg');
  spaceshipImg = loadImage('bright_spaceship.svg');
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont(font);

  // Textures SVG
  SnakePlus.headTexture = snakeHeadImg;
  Spaceship.shipTexture = spaceshipImg;

  // ── Sliders debug (cachés par défaut) ─────────────────────────────────────
  sliderSpeed = createSlider(1, 10, 7, 0.1);
  sliderForce = createSlider(0.01, 1, 0.5, 0.01);
  sliderDetectR = createSlider(50, 500, 200, 10);
  sliderPullR = createSlider(50, 600, 250, 10);
  [sliderSpeed, sliderForce, sliderDetectR, sliderPullR].forEach(s => {
    s.style('width', '160px');
    s.hide();
  });

  _initGame();
}

// ── Initialise / réinitialise une partie ─────────────────────────────────────
function _initGame() {
  snakes = [];
  foods = [];
  spaceships = [];
  cameraX = 0;
  cameraY = 0;

  playerSnake = new SnakePlus(MAP_W / 2, MAP_H / 2, 2, 10, 'lime');
  snakes.push(playerSnake);

  for (let i = 0; i < 10; i++) {
    const stageIdx = floor(random(SNAKE_STAGES.length));
    const stage = SNAKE_STAGES[stageIdx];
    const length = floor(random(1, stage.maxSegments + 1));
    const couleur = color(random(255), random(255), random(255));
    snakes.push(new SnakeWanderPlus(random(MAP_W), random(MAP_H), length, stage.r, couleur));
  }

  for (let i = 0; i < 600; i++) foods.push(creerFoodAleatoire());
  for (let i = 0; i < 30; i++) spaceships.push(new Spaceship(random(MAP_W), random(MAP_H)));

  target = createVector(MAP_W / 2, MAP_H / 2);
}

// ─────────────────────────────────────────────────────────────────────────────
function draw() {
  if (gameState === 'start') {
    _drawStartScreen();
    return;
  }
  if (gameState === 'gameover') {
    _drawEndScreen('GAME OVER', 'Votre serpent est mort...', color(220, 60, 60));
    return;
  }
  if (gameState === 'win') {
    _drawEndScreen('VICTOIRE !', 'Serpent au niveau maximum !', color(60, 220, 120));
    return;
  }

  // ═══════════════════════ PLAYING ═══════════════════════════════════════════
  background(0);

  // ── Caméra : suit la tête du serpent joueur ──────────────────────────────
  if (playerSnake && playerSnake.head) {
    cameraX = constrain(playerSnake.head.pos.x - width / 2, 0, MAP_W - width);
    cameraY = constrain(playerSnake.head.pos.y - height / 2, 0, MAP_H - height);
  }

  // Coordonnées monde de la souris
  target.x = mouseX + cameraX;
  target.y = mouseY + cameraY;

  push();
  translate(-cameraX, -cameraY);

  // ── Mur / bordure de la carte ────────────────────────────────────────────
  push();
  noFill();
  stroke(40, 80, 180, 60);
  strokeWeight(30);
  rect(0, 0, MAP_W, MAP_H);
  stroke(80, 130, 220);
  strokeWeight(8);
  rect(0, 0, MAP_W, MAP_H);
  pop();

  // ── Serpents ─────────────────────────────────────────────────────────────
  for (let i = 0; i < snakes.length; i++) {
    const snake = snakes[i];
    let targetBruitee = target.copy();
    let angleOffset = map(i, 0, snakes.length, -PI / 6, PI / 6);
    targetBruitee.x += cos(angleOffset) * 50;
    targetBruitee.y += sin(angleOffset) * 50;

    if (snake instanceof SnakeWanderPlus && snake.skill && snake.skill.canActivate() && random() < 0.0008) {
      snake.skill.activate();
    }

    if (!snake.skill || !snake.skill.isBlocking()) {
      if (snake instanceof SnakeWanderPlus) {
        snake.behave(snakes, foods, targetBruitee, wanderDetectRadius);
      } else {
        snake.move(targetBruitee);
      }
    }

    snake.show();
    if (snake.showDebug) snake.showDebug();

    if (snake.skill) {
      snake.skill.update(snakes, foods, spaceships);
      snake.skill.show();
    }

    foods.forEach((food, idx) => {
      if (snake.checkEat && snake.checkEat(food)) foods[idx] = creerFoodAleatoire();
    });

    for (let j = snakes.length - 1; j >= 0; j--) {
      if (j === i) continue;
      if (snake.checkEatSnake && snake.checkEatSnake(snakes[j])) {
        snakes.splice(j, 1);
        if (j < i) i--;
      }
    }

    for (let k = spaceships.length - 1; k >= 0; k--) {
      if (snake.checkEat && snake.checkEat(spaceships[k])) {
        spaceships.splice(k, 1);
        spaceships.push(new Spaceship(random(MAP_W), random(MAP_H)));
      }
    }
  }

  // Supprimer les serpents morts
  for (let i = snakes.length - 1; i >= 0; i--) {
    if (snakes[i].anneaux && snakes[i].anneaux.length <= 1) snakes.splice(i, 1);
  }

  // Physique et rendu des foods
  foods.forEach(f => f.update && f.update(snakes));
  foods.forEach(f => f.show && f.show());

  // ── Vaisseaux spatiaux ───────────────────────────────────────────────────
  for (const ship of spaceships) {
    const isFleeing = ship.applyFleeIfThreatened(snakes);
    if (!isFleeing) ship.flock(spaceships);
    ship.update();
    ship.updateLasers();

    const hit = ship.attack(snakes, foods);
    if (hit) {
      if (hit.type === 'food') {
        foods[hit.idx] = creerFoodAleatoire();
      } else if (hit.type === 'snake' && snakes[hit.idx]) {
        const s = snakes[hit.idx];
        const stageIdx = s.stageIndex ?? 0;
        const damage = Math.max(1, Math.floor((SNAKE_STAGES.length - stageIdx) / 2));
        if (s.shrinkBy) s.shrinkBy(damage);
      }
    }
    ship.show();
  }

  // Cible (souris) en espace monde
  push();
  fill(255, 0, 0);
  noStroke();
  ellipse(target.x, target.y, 32);
  pop();

  pop(); // fin translate caméra

  // ── HUD ──────────────────────────────────────────────────────────────────
  _drawHUD();

  // ── Sliders debug ─────────────────────────────────────────────────────────
  if (Vehicle.debug) {
    _showSliders();
    _applySliders();
    _drawSliderLabels();
  } else {
    _hideSliders();
  }

  // ── Vérifications fin de partie ──────────────────────────────────────────
  if (playerSnake && !snakes.includes(playerSnake)) {
    gameState = 'gameover';
    _hideSliders();
  } else if (playerSnake && _isVictory(playerSnake)) {
    gameState = 'win';
    _hideSliders();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HUD
// ─────────────────────────────────────────────────────────────────────────────
function _drawHUD() {
  if (!playerSnake) return;
  push();
  fill(255);
  noStroke();
  textSize(16);
  textAlign(LEFT, TOP);
  const stage = SNAKE_STAGES[playerSnake.stageIndex];
  text(`Stage ${playerSnake.stageIndex + 1}/8   Segments: ${playerSnake.anneaux.length}/${stage.maxSegments}`, 15, 15);
  pop();
}

// ─────────────────────────────────────────────────────────────────────────────
// Condition de victoire
// ─────────────────────────────────────────────────────────────────────────────
function _isVictory(snake) {
  const lastStage = SNAKE_STAGES[SNAKE_STAGES.length - 1];
  return snake.stageIndex === SNAKE_STAGES.length - 1 &&
         snake.anneaux.length >= lastStage.maxSegments;
}

// ─────────────────────────────────────────────────────────────────────────────
// Écrans (start / gameover / win)
// ─────────────────────────────────────────────────────────────────────────────
function _drawStartScreen() {
  background(0);
  push();
  textAlign(CENTER, CENTER);

  // ── 星空背景点 ────────────────────────────────────────────────────────────
  randomSeed(42);
  fill(255, 255, 255, 120);
  noStroke();
  for (let i = 0; i < 200; i++) {
    const sx = random(width);
    const sy = random(height);
    const sr = random(0.5, 2);
    circle(sx, sy, sr * 2);
  }
  randomSeed(null);

  // ── Titre ─────────────────────────────────────────────────────────────────
  const pulse = sin(frameCount * 0.04) * 8;
  textSize(78 + pulse);
  fill(80, 220, 140);
  noStroke();
  text('COSMIC SNAKE', width / 2, height * 0.16);

  // ── Séparateur ────────────────────────────────────────────────────────────
  stroke(80, 130, 200, 100);
  strokeWeight(1);
  line(width / 2 - 340, height * 0.26, width / 2 + 340, height * 0.26);
  noStroke();

  // ── Histoire ──────────────────────────────────────────────────────────────
  const storyLines = [
    'Tu es un jeune serpent cosmique venant de naitre,',
    'survivant dans un champ d\'asteroides au coeur de l\'univers.',
    '',
    'Des flottes de vaisseaux humains collectent les meteorites ici.',
    'Tu peux les devorer pour grossir, mais leurs lasers t\'attaqueront sans relache.',
    '',
    'D\'autres grands serpents cosmiques rodent dans ce secteur stellaire.',
    'Fuis ceux qui sont plus grands que toi. Chasse ceux qui sont plus petits.',
    '',
    'En grandissant suffisamment, tu debloques le pouvoir du Trou Noir :',
    'attire tout ce que tu peux devorer dans un rayon donne pendant 2 secondes.',
    '',
    'Deviens le plus grand etre de ce secteur pour triompher.',
  ];

  textSize(15);
  fill(210, 220, 230);
  const lineH = 27;
  const storyStartY = height * 0.31;
  for (let i = 0; i < storyLines.length; i++) {
    text(storyLines[i], width / 2, storyStartY + i * lineH);
  }

  // ── Controles ─────────────────────────────────────────────────────────────
  const tipY = storyStartY + storyLines.length * lineH + 20;
  stroke(80, 130, 200, 80);
  strokeWeight(1);
  line(width / 2 - 340, tipY, width / 2 + 340, tipY);
  noStroke();

  textSize(13);
  fill(150, 180, 150);
  text('Souris : diriger   |   Q : trou noir   |   A : serpent IA   |   D : debug', width / 2, tipY + 22);

  // ── Cliquer pour commencer (clignotant) ───────────────────────────────────
  textSize(22);
  fill(255, 255, 255, 160 + sin(frameCount * 0.08) * 95);
  text('CLIQUEZ POUR COMMENCER', width / 2, tipY + 70);

  pop();
}

function _drawEndScreen(title, subtitle, col) {
  background(0, 0, 0, 200);
  push();
  textAlign(CENTER, CENTER);
  // Titre
  fill(col);
  noStroke();
  textSize(72);
  text(title, width / 2, height / 2 - 80);
  // Sous-titre
  textSize(26);
  fill(220, 220, 220);
  text(subtitle, width / 2, height / 2);
  // Relancer
  textSize(20);
  fill(255, 255, 255, 180 + sin(frameCount * 0.07) * 75);
  text('CLIQUEZ POUR REJOUER', width / 2, height / 2 + 80);
  pop();
}

// ─────────────────────────────────────────────────────────────────────────────
// Sliders debug
// ─────────────────────────────────────────────────────────────────────────────
function _showSliders() {
  const baseY = height - 220;
  sliderSpeed.position(200, baseY);
  sliderForce.position(200, baseY + 40);
  sliderDetectR.position(200, baseY + 80);
  sliderPullR.position(200, baseY + 120);
  [sliderSpeed, sliderForce, sliderDetectR, sliderPullR].forEach(s => s.show());
}

function _hideSliders() {
  [sliderSpeed, sliderForce, sliderDetectR, sliderPullR].forEach(s => s.hide());
}

function _applySliders() {
  if (playerSnake && playerSnake.head) {
    playerSnake.head.maxSpeed = sliderSpeed.value();
    playerSnake.head.maxForce = sliderForce.value();
  }
  wanderDetectRadius = sliderDetectR.value();
  BlackHoleSkill.PULL_RADIUS = sliderPullR.value();
}

function _drawSliderLabels() {
  const baseY = height - 210;
  push();
  fill(255);
  noStroke();
  textSize(13);
  textAlign(RIGHT, CENTER);
  text(`Vitesse joueur: ${sliderSpeed.value().toFixed(1)}`,  190, baseY + 9);
  text(`Force virage:   ${sliderForce.value().toFixed(2)}`,  190, baseY + 49);
  text(`Rayon détect.:  ${sliderDetectR.value()}`,           190, baseY + 89);
  text(`Rayon trou noir: ${sliderPullR.value()}`,            190, baseY + 129);
  pop();
}

// ─────────────────────────────────────────────────────────────────────────────
function keyPressed() {
  if (gameState !== 'playing') return;

  if (key === 'd') {
    Vehicle.debug = !Vehicle.debug;
  } else if (key === 'q') {
    for (const snake of snakes) {
      if (!(snake instanceof SnakeWanderPlus) && snake.skill) {
        snake.skill.activate();
        break;
      }
    }
  } else if (key === 'a') {
    const stageIdx = floor(random(SNAKE_STAGES.length));
    const stage = SNAKE_STAGES[stageIdx];
    const length = floor(random(1, stage.maxSegments + 1));
    const couleur = color(random(255), random(255), random(255));
    snakes.push(new SnakeWanderPlus(random(MAP_W), random(MAP_H), length, stage.r, couleur));
  }
}

function mousePressed() {
  if (gameState === 'start' || gameState === 'gameover' || gameState === 'win') {
    _initGame();
    gameState = 'playing';
  }
}

function creerFoodAleatoire() {
  const margin = 50;
  return new Food(random(margin, MAP_W - margin), random(margin, MAP_H - margin), random(12, 20));
}
