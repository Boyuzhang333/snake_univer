let nbVehicules = 20;
let target;
let vehicle;
let vehicles = [];
let snakes = [];
let foods = [];
// mode = pour changer le comportement de l'application
let mode = "snake";

// Appelée avant de démarrer l'animation
function preload() {
  // en général on charge des images, des fontes de caractères etc.
  font = loadFont('./assets/inconsolata.otf');
}

function setup() {
  createCanvas(windowWidth, windowHeight);

  // on crée un snake
  let snake = new SnakePlus(width / 2, height / 2, 2, 10, 'lime');
  snakes.push(snake);
  let snake2 = new SnakeWanderPlus(width / 2 + 100, height / 2 + 100, 9, 20, 'cyan');
  snakes.push(snake2);

    // nourritures initiales
  for (let i = 0; i < 3; i++) {
    foods.push(creerFoodAleatoire());
  }
  // La cible, ce sera la position de la souris
  target = createVector(random(width), random(height));

  // On creer un tableau de points à partir du texte
  // Texte qu'on affiche avec textToPoint
  // Get the point array.
  // parameters are : text, x, y, fontSize, options. 
  // sampleFactor : 0.01 = gros points, 0.1 = petits points
  // ca représente la densité des points
  points = font.textToPoints('Hello!', 350, 250, 305, { sampleFactor: 0.03 });

  // on cree des vehicules, autant que de points
  // creerVehicules(points.length);

}

function creerVehicules(n) {
  for (let i = 0; i < n; i++) {
    let v = new Vehicle(random(width), random(height));
    vehicles.push(v);
  }
}

// appelée 60 fois par seconde
function draw() {
  // couleur pour effacer l'écran
  background(0);
  // pour effet psychedelique
  //background(0, 0, 0, 10);

  // On dessine les snakes instances de la classe Snake
  for (let i = 0; i < snakes.length; i++) {
  const snake = snakes[i];
  let targetBruitee = target.copy();
  let angleOffset = map(i, 0, snakes.length, -PI / 6, PI / 6);
  let distanceFromTarget = 50;
  let offsetX = cos(angleOffset) * distanceFromTarget;
  let offsetY = sin(angleOffset) * distanceFromTarget;
  targetBruitee.x += offsetX;
  targetBruitee.y += offsetY; 
  // si c'est un SnakeWanderPlus : logique encapsulée dans la classe
  if (snake instanceof SnakeWanderPlus) {
    snake.behave(snakes, foods, targetBruitee, 200);
  } else {
    snake.move(targetBruitee);
  }
  snake.show();

  // nourriture
  foods.forEach((food, idx) => {
    if (snake.checkEat && snake.checkEat(food)) {
      foods[idx] = creerFoodAleatoire();
    }
  });

  // manger d'autres serpents plus petits
  for (let j = snakes.length - 1; j >= 0; j--) {
    if (j === i) continue;
    const other = snakes[j];
    if (snake.checkEatSnake && snake.checkEatSnake(other)) {
      snakes.splice(j, 1);
      if (j < i) { i--; }
    }
  }
}

  // dessinerLesPointsDuTexte();

  // dessiner les foods
  foods.forEach(f => f.show && f.show());

  target.x = mouseX;
  target.y = mouseY;

  // dessin de la cible à la position de la souris
  push();
  fill(255, 0, 0);
  noStroke();
  ellipse(target.x, target.y, 32);
  pop();

  // ancien bloc de véhicules (non utilisé) supprimé
}


function keyPressed() {
  if (key === 'd') {
    Vehicle.debug = !Vehicle.debug;
  } else if (key === 'a') {
    // on crée un nouveau snake
    // taille aléatoire entre 10 et 50
    let taille = floor(random(10, 50));
    // couleur aléatoire
    let couleur = color(random(255), random(255), random(255));
    let snake = new SnakeWanderPlus(random(width), random(height), taille, 20, couleur);
    snakes.push(snake);
  }
  // todo : touche "s" fait le snake, "v" ajoute un véhicule,
  // "t" passe en mode="texte" etc.
}

function creerFoodAleatoire() {
  const margin = 50; // même marge que boundaries pour éviter les bords
  const x = random(margin, width - margin);
  const y = random(margin, height - margin);
  return new Food(x, y, random(12, 20));
}


