class SnakeWanderPlus extends SnakePlus {
    constructor(x, y, length, taille, couleur) {
        super(x, y, length, taille, couleur);

        this.wanderWeight = 0.5;
        this.boundariesWeight = 0.2;

        //this.head.distanceCercle = 300
    }

    move(targetIgnored = null) {
        // La tête erre
        let forceWander = this.head.wander();
        // la tete ne peut sortir de la fenetre, on applique boundaries
        let forceBoundaries = this.head.boundaries(0, 0, width, height, 50);
        
        // On applique des poids aux forces
        forceWander.mult(this.wanderWeight);
        forceBoundaries.mult(this.boundariesWeight);

        // On applique les forces
        this.head.applyForce(forceWander);
        this.head.applyForce(forceBoundaries);

        this.head.update();

        // Chaque anneau suit l'anneau précédent
        for (let i = 1; i < this.anneaux.length; i++) {
            let anneau = this.anneaux[i];
            let anneauPrecedent = this.anneaux[i - 1];
            let forceSuivi = anneau.arrive(anneauPrecedent.pos, 15);
            anneau.applyForce(forceSuivi);
            anneau.update();
        }
    }

    chase(cible, stopDistance = 0) {
        // cible peut être un p5.Vector ou un objet avec pos
        if (!cible) return;
        const targetPos = (cible.pos) ? cible.pos : cible;
        if (!targetPos || targetPos.x === undefined || targetPos.y === undefined) return;

        // Pas de freinage : on fonce plein pot (seek), peut dépasser la cible
        const forceSeek = this.head.seek(targetPos, false, 0);
        const forceBoundaries = this.head.boundaries(0, 0, width, height, 50);

        this.head.applyForce(forceSeek);
        this.head.applyForce(forceBoundaries);
        this.head.update();

        for (let i = 1; i < this.anneaux.length; i++) {
            const anneau = this.anneaux[i];
            const anneauPrecedent = this.anneaux[i - 1];
            const forceSuivi = anneau.arrive(anneauPrecedent.pos, 15);
            anneau.applyForce(forceSuivi);
            anneau.update();
        }
    }

    /**
     * Choisit une cible food dans un rayon donné, sinon retourne null.
     * @param {Array<Food>} foods
     * @param {number} radius
     */
  pickFoodInRange(foods, radius = 200) {
        if (!foods || foods.length === 0) return null;
        let nearest = null;
        let bestDist = Infinity;
        foods.forEach((f, idx) => {
            const d = p5.Vector.dist(this.head.pos, f.pos);
            if (d < radius && d < bestDist) {
                bestDist = d;
                nearest = f;
                nearest._idx = idx; // pour debug
            }
        });
        return nearest;
    }

    /**
     * Comportement complet :
     * - si un petit snake est dans le rayon, on le chasse en priorité
     * - sinon si une food est dans le rayon, on la chasse
     * - sinon wander sur fallbackTarget
     */
    behave(snakes, foods, fallbackTarget, detectRadius = 200) {
        let target = null;
        let targetLabel = "";

        // 1) petit snake le plus proche dans le rayon
        let bestDist = Infinity;
        for (let i = 0; i < snakes.length; i++) {
            const other = snakes[i];
            if (other === this || !other.head) continue;
            if (other.head.r >= this.head.r) continue; // seulement plus petits
            const d = p5.Vector.dist(this.head.pos, other.head.pos);
            if (d < detectRadius && d < bestDist) {
                bestDist = d;
                target = other;
                targetLabel = `S${i}`;
            }
        }

        // 2) si pas de petit snake dans le rayon, chercher food
        if (!target) {
            const food = this.pickFoodInRange(foods, detectRadius);
            if (food) {
                target = food;
                targetLabel = `F${food._idx ?? ""}`;
            }
        }

        if (target) {
            this.chase(target, 0);
            if (Vehicle.debug && target.pos) {
                push();
                fill(255, 255, 0);
                noStroke();
                textSize(12);
                text(targetLabel, target.pos.x + 6, target.pos.y - 6);
                pop();
            }
        } else {
            this.move(fallbackTarget);
        }
    }
}
