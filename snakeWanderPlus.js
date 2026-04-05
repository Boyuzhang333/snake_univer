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
        let forceBoundaries = this.head.boundaries(0, 0, MAP_W, MAP_H, 50);
        
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
        const forceBoundaries = this.head.boundaries(0, 0, MAP_W, MAP_H, 50);

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

    // Fuit la menace (serpent plus grand) avec une vitesse boostée.
    flee(threat, boostFactor = 1.5) {
        const threatPos = (threat.pos) ? threat.pos : threat;
        if (!threatPos || threatPos.x === undefined) return;

        // Force opposée à seek → s'éloigne de la menace
        const forceFlee = this.head.seek(threatPos, false, 0);
        forceFlee.mult(-1);

        const forceBoundaries = this.head.boundaries(0, 0, MAP_W, MAP_H, 50);
        forceBoundaries.mult(this.boundariesWeight);

        // Vitesse et force temporairement boostées pendant la fuite
        const origSpeed = this.head.maxSpeed;
        const origForce = this.head.maxForce;
        this.head.maxSpeed = origSpeed * boostFactor;
        this.head.maxForce = origForce * boostFactor;

        this.head.applyForce(forceFlee);
        this.head.applyForce(forceBoundaries);
        this.head.update();

        this.head.maxSpeed = origSpeed;
        this.head.maxForce = origForce;

        for (let i = 1; i < this.anneaux.length; i++) {
            const anneau = this.anneaux[i];
            const anneauPrecedent = this.anneaux[i - 1];
            anneau.applyForce(anneau.arrive(anneauPrecedent.pos, 15));
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
     * Comportement complet (ordre de priorité) :
     * 0. PANIQUE — perte soudaine de segments → fuite à rayon élargi + boost ×2
     * 1. FUITE   — serpent plus grand dans le rayon → fuir (boost ×1.5)
     * 2. CHASSE  — serpent plus petit dans le rayon → le chasser
     * 3. FOOD    — nourriture dans le rayon → la chasser
     * 4. WANDER  — rien → errer
     */
    behave(snakes, foods, fallbackTarget, detectRadius = 200) {

        // ── 0) Panique : perte soudaine récente → fuite élargie ──────────────
        if (this.panicFrames > 0) {
            this.panicFrames--;
            const panicRadius = detectRadius * 2;
            let panicTarget = null;
            let nearestPanic = Infinity;
            for (let i = 0; i < snakes.length; i++) {
                const other = snakes[i];
                if (other === this || !other.head) continue;
                if (other.head.r <= this.head.r) continue;
                const d = p5.Vector.dist(this.head.pos, other.head.pos);
                if (d < panicRadius && d < nearestPanic) {
                    nearestPanic = d;
                    panicTarget = other.head;
                }
            }
            // Si aucune menace connue, fuir à l'opposé de la vitesse courante
            if (!panicTarget) {
                const escapeVec = p5.Vector.mult(this.head.vel, -50);
                panicTarget = p5.Vector.add(this.head.pos, escapeVec);
            }
            this.flee(panicTarget, 2.0);
            if (Vehicle.debug) {
                push();
                noFill();
                stroke(255, 0, 200);
                strokeWeight(2);
                circle(this.head.pos.x, this.head.pos.y, panicRadius * 2);
                // Ligne vers la cible de fuite
                const pt = (panicTarget.pos) ? panicTarget.pos : panicTarget;
                stroke(255, 0, 200, 130);
                strokeWeight(1);
                line(this.head.pos.x, this.head.pos.y, pt.x, pt.y);
                // Label comportement
                fill(255, 0, 200);
                noStroke();
                textSize(11);
                textAlign(CENTER, BOTTOM);
                text('PANIC', this.head.pos.x, this.head.pos.y - this.r - 5);
                pop();
            }
            return;
        }

        // ── 1) Chercher une menace (plus grand) ──────────────────────────────
        let fleeTarget = null;
        let fleeLabel  = "";
        let nearestThreat = Infinity;
        for (let i = 0; i < snakes.length; i++) {
            const other = snakes[i];
            if (other === this || !other.head) continue;
            if (other.head.r <= this.head.r) continue;
            const d = p5.Vector.dist(this.head.pos, other.head.pos);
            if (d < detectRadius && d < nearestThreat) {
                nearestThreat = d;
                fleeTarget = other.head;
                fleeLabel  = `T${i}`;
            }
        }

        if (fleeTarget) {
            this.flee(fleeTarget);
            if (Vehicle.debug) {
                push();
                noFill();
                stroke(255, 50, 50);
                strokeWeight(2);
                circle(this.head.pos.x, this.head.pos.y, detectRadius * 2);
                fill(255, 120, 0);
                noStroke();
                textSize(12);
                text(fleeLabel, fleeTarget.pos.x + 6, fleeTarget.pos.y - 6);
                // Ligne vers la menace
                stroke(255, 80, 80, 150);
                strokeWeight(1);
                line(this.head.pos.x, this.head.pos.y, fleeTarget.pos.x, fleeTarget.pos.y);
                // Label comportement
                fill(255, 80, 80);
                noStroke();
                textSize(11);
                textAlign(CENTER, BOTTOM);
                text('FLEE', this.head.pos.x, this.head.pos.y - this.r - 5);
                pop();
            }
            return;
        }

        // ── 1) Chercher un petit serpent ─────────────────────────────────────
        let target = null;
        let targetLabel = "";
        let bestDist = Infinity;
        for (let i = 0; i < snakes.length; i++) {
            const other = snakes[i];
            if (other === this || !other.head) continue;
            if (other.head.r >= this.head.r) continue;
            const d = p5.Vector.dist(this.head.pos, other.head.pos);
            if (d < detectRadius && d < bestDist) {
                bestDist = d;
                target = other.head;
                targetLabel = `S${i}`;
            }
        }

        // ── 2) Chercher de la nourriture ─────────────────────────────────────
        if (!target) {
            const food = this.pickFoodInRange(foods, detectRadius);
            if (food) {
                target = food;
                targetLabel = `F${food._idx ?? ""}`;
            }
        }

        if (target) {
            this.chase(target, 0);
            if (Vehicle.debug) {
                push();
                noFill();
                stroke(255, 100, 100);
                strokeWeight(1);
                circle(this.head.pos.x, this.head.pos.y, detectRadius * 2);
                if (target.pos) {
                    fill(255, 255, 0);
                    noStroke();
                    textSize(12);
                    text(targetLabel, target.pos.x + 6, target.pos.y - 6);
                    // Ligne vers la cible
                    stroke(255, 255, 0, 130);
                    strokeWeight(1);
                    line(this.head.pos.x, this.head.pos.y, target.pos.x, target.pos.y);
                }
                // Label comportement
                const isSnakeTarget = targetLabel.startsWith('S');
                fill(isSnakeTarget ? color(100, 255, 100) : color(255, 220, 50));
                noStroke();
                textSize(11);
                textAlign(CENTER, BOTTOM);
                text(isSnakeTarget ? 'CHASE' : 'FOOD', this.head.pos.x, this.head.pos.y - this.r - 5);
                pop();
            }
        } else {
            // ── 3) Wander ────────────────────────────────────────────────────
            this.move(fallbackTarget);
            if (Vehicle.debug) {
                push();
                fill(100, 180, 255);
                noStroke();
                textSize(11);
                textAlign(CENTER, BOTTOM);
                text('WANDER', this.head.pos.x, this.head.pos.y - this.r - 5);
                pop();
            }
        }
    }
}
