class Projectile {
    constructor(x, y, targetX, targetY, damage, speed = 300, type = 'normal') {
        this.pos = new Vector2(x, y);
        this.target = new Vector2(targetX, targetY);
        this.damage = damage;
        this.speed = speed;
        this.type = type;
        this.radius = 4;
        this.alive = true;
        this.distanceTraveled = 0;
        this.maxDistance = 1000;

        const direction = this.target.subtract(this.pos).normalize();
        this.vel = direction.multiply(speed);
    }

    update(deltaTime, enemies = []) {
        this.pos = this.pos.add(this.vel.multiply(deltaTime));
        this.distanceTraveled += this.vel.magnitude() * deltaTime;

        // Check if reached target or too far
        if (this.distanceTraveled > this.maxDistance) {
            this.alive = false;
            return;
        }

        // Check collision with enemies
        for (const enemy of enemies) {
            const dist = this.pos.distance(enemy.pos);
            if (dist < this.radius + enemy.radius) {
                this.hit(enemy);
                break;
            }
        }
    }

    hit(enemy) {
        enemy.takeDamage(this.damage);
        this.alive = false;
    }

    draw(ctx) {
        ctx.fillStyle = this.getColor();
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }

    getColor() {
        switch (this.type) {
            case 'fire': return '#ff6600';
            case 'ice': return '#00ccff';
            case 'lightning': return '#ffff00';
            case 'poison': return '#00ff00';
            case 'laser': return '#ff0000';
            default: return '#ffffff';
        }
    }

    isAlive() {
        return this.alive;
    }
}

class ProjectileManager {
    constructor() {
        this.projectiles = [];
    }

    add(projectile) {
        this.projectiles.push(projectile);
    }

    update(deltaTime, enemies) {
        this.projectiles = this.projectiles.filter(p => {
            p.update(deltaTime, enemies);
            return p.isAlive();
        });
    }

    draw(ctx) {
        this.projectiles.forEach(p => p.draw(ctx));
    }

    clear() {
        this.projectiles = [];
    }

    count() {
        return this.projectiles.length;
    }
}

// Special projectile types
class LaserProjectile extends Projectile {
    constructor(x, y, targetX, targetY, damage, speed = 500) {
        super(x, y, targetX, targetY, damage, speed, 'laser');
        this.radius = 3;
        this.lifetime = 0.15;
        this.elapsed = 0;
    }

    update(deltaTime, enemies = []) {
        this.elapsed += deltaTime;
        if (this.elapsed > this.lifetime) {
            this.alive = false;
            return;
        }

        super.update(deltaTime, enemies);
    }

    draw(ctx) {
        ctx.strokeStyle = this.getColor();
        ctx.lineWidth = 2;
        ctx.beginPath();
        const prevPos = this.pos.subtract(this.vel.multiply(0.016)); // Approximate previous position
        ctx.moveTo(prevPos.x, prevPos.y);
        ctx.lineTo(this.pos.x, this.pos.y);
        ctx.stroke();
    }
}

class ArcProjectile extends Projectile {
    constructor(x, y, targetX, targetY, damage, speed = 200) {
        super(x, y, targetX, targetY, damage, speed, 'lightning');
        this.radius = 5;
        this.arc = 0;
    }

    draw(ctx) {
        ctx.fillStyle = this.getColor();
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Draw arc effect
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.radius * 2, 0, Math.PI * 2);
        ctx.stroke();
    }
}