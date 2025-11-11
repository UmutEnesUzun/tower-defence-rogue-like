class Enemy {
    constructor(id, x, y, data, path) {
        this.id = id;
        this.pos = new Vector2(x, y);
        this.data = data;
        this.path = path;
        this.pathIndex = 0;

        // Stats
        this.maxHealth = data.health;
        this.health = data.health;
        this.speed = data.speed;
        this.radius = data.radius || 8;
        this.armor = data.armor || 0;
        this.bounty = data.bounty;
        this.value = data.value || 1;

        // State
        this.dead = false;
        this.reached = false;
        this.velocity = new Vector2(0, 0);

        // Visual
        this.healthBarWidth = 24;
        this.rotation = 0;
    }

    update(deltaTime) {
        if (this.dead || this.reached) return;

        // Move along path
        if (this.pathIndex < this.path.length) {
            const targetPoint = this.path[this.pathIndex];
            const direction = targetPoint.subtract(this.pos).normalize();
            this.velocity = direction.multiply(this.speed);
            this.pos = this.pos.add(this.velocity.multiply(deltaTime));
            this.rotation = Math.atan2(direction.y, direction.x);

            // Check if reached waypoint
            if (this.pos.distance(targetPoint) < this.speed * deltaTime) {
                this.pathIndex++;
                if (this.pathIndex >= this.path.length) {
                    this.reached = true;
                }
            }
        }
    }

    takeDamage(damage) {
        const actualDamage = Math.max(1, damage - this.armor);
        this.health -= actualDamage;

        if (this.health <= 0) {
            this.die();
        }
    }

    die() {
        this.dead = true;
    }

    draw(ctx) {
        if (this.dead) return;

        // Draw enemy
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(this.rotation);

        ctx.fillStyle = this.data.color || '#ff0000';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Draw inner circle for detail
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Draw health bar
        const healthPercent = this.health / this.maxHealth;
        const healthBarColor = this.getHealthBarColor(healthPercent);

        ctx.fillStyle = '#333';
        ctx.fillRect(this.pos.x - this.healthBarWidth / 2, this.pos.y - this.radius - 6, this.healthBarWidth, 3);

        ctx.fillStyle = healthBarColor;
        ctx.fillRect(this.pos.x - this.healthBarWidth / 2, this.pos.y - this.radius - 6, this.healthBarWidth * healthPercent, 3);

        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.pos.x - this.healthBarWidth / 2, this.pos.y - this.radius - 6, this.healthBarWidth, 3);
    }

    getHealthBarColor(healthPercent) {
        if (healthPercent > 0.66) return '#00ff00';
        if (healthPercent > 0.33) return '#ffff00';
        return '#ff0000';
    }

    isAlive() {
        return !this.dead && !this.reached;
    }

    serialize() {
        return {
            id: this.id,
            enemyType: this.data.id,
            pathIndex: this.pathIndex,
            health: this.health
        };
    }
}

class EnemyManager {
    constructor(gameState) {
        this.gameState = gameState;
        this.enemies = [];
        this.nextId = 0;
        this.enemyData = {};
        this.spawnTimer = 0;
        this.lastWaveTime = 0;
        this.currentPath = [];
    }

    async loadEnemyData(url) {
        try {
            const response = await fetch(url);
            const data = await response.json();
            this.enemyData = data.enemies.reduce((acc, enemy) => {
                acc[enemy.id] = enemy;
                return acc;
            }, {});
            return this.enemyData;
        } catch (error) {
            console.error('Failed to load enemy data:', error);
            return {};
        }
    }

    setPath(path) {
        this.currentPath = path;
    }

    update(deltaTime, mapWidth, mapHeight) {
        // Update existing enemies
        this.enemies = this.enemies.filter(e => {
            e.update(deltaTime);
            return e.isAlive();
        });

        // Continuous spawning
        this.spawnTimer += deltaTime;
        const spawnRate = Math.max(0.5, 3 - (this.gameState.score / 1000) * 0.5);
        
        if (this.spawnTimer >= spawnRate && this.currentPath.length > 0) {
            this.spawnEnemy();
            this.spawnTimer = 0;
        }
    }

    spawnEnemy() {
        const enemyTypes = Object.keys(this.enemyData);
        if (enemyTypes.length === 0) return;

        // Weighted spawn based on difficulty
        const weights = enemyTypes.map(id => {
            const enemy = this.enemyData[id];
            return {
                value: id,
                weight: 1 / (enemy.value || 1) // Higher value = lower weight
            };
        });

        const enemyId = randomWeighted(weights);
        const enemyData = this.enemyData[enemyId];
        const startPoint = this.currentPath[0];

        const enemy = new Enemy(this.nextId++, startPoint.x, startPoint.y, enemyData, this.currentPath);
        this.enemies.push(enemy);

        this.gameState.wave++;
    }

    draw(ctx) {
        this.enemies.forEach(e => e.draw(ctx));
    }

    getAliveEnemies() {
        return this.enemies.filter(e => !e.dead && !e.reached);
    }

    getReachedEnemies() {
        return this.enemies.filter(e => e.reached);
    }

    getDeadEnemies() {
        return this.enemies.filter(e => e.dead);
    }

    clear() {
        this.enemies = [];
    }

    count() {
        return this.enemies.length;
    }
}