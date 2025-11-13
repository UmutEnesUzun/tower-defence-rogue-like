// Tower class
class Tower {
    constructor(id, x, y, data, gameState) {
        this.id = id;
        this.pos = new Vector2(x, y);
        this.data = data;
        this.gameState = gameState;

        // Base stats
        this.range = data.range;
        this.damage = data.damage;
        this.attackSpeed = data.attackSpeed;
        this.cost = data.cost;

        // Runtime stats
        this.cooldown = 0;
        this.level = 1;
        this.alive = true;
        this.radius = data.radius || 12;
        this.target = null;

        // Upgrades
        this.upgrades = {
            damage: 0,
            range: 0,
            speed: 0
        };
    }

    update(deltaTime, enemies) {
        this.cooldown = Math.max(0, this.cooldown - deltaTime);

        // Find target
        this.target = this.findTarget(enemies);

        // Shoot if ready and has target
        if (this.target && this.cooldown <= 0) {
            this.shoot();
            this.cooldown = 1 / this.getAttackSpeed();
        }
    }

    findTarget(enemies) {
        let closest = null;
        let closestDistance = this.range;

        for (const enemy of enemies) {
            const dist = this.pos.distance(enemy.pos);
            if (dist < closestDistance && !enemy.dead) {
                closest = enemy;
                closestDistance = dist;
            }
        }

        return closest;
    }

    shoot() {
        if (!this.target || this.target.dead) return;

        const damage = this.getDamage();
        const projectile = new Projectile(
            this.pos.x, this.pos.y,
            this.target.pos.x, this.target.pos.y,
            damage,
            300,
            this.data.projectileType || 'normal'
        );

        this.gameState.projectileManager.add(projectile);
    }

    getDamage() {
        return this.damage + (this.upgrades.damage * this.data.upgradeMultiplier.damage);
    }

    getRange() {
        return this.range + (this.upgrades.range * this.data.upgradeMultiplier.range);
    }

    getAttackSpeed() {
        return this.attackSpeed + (this.upgrades.speed * this.data.upgradeMultiplier.speed);
    }

    upgrade(type) {
        if (type in this.upgrades) {
            this.upgrades[type]++;
            return true;
        }
        return false;
    }

    draw(ctx) {
        // Draw tower
        ctx.fillStyle = this.data.color || '#00ff00';
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Draw range indicator when targeting
        if (this.target) {
            ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(this.pos.x, this.pos.y, this.getRange(), 0, Math.PI * 2);
            ctx.stroke();
        }

        // Draw upgrade indicators
        if (this.upgrades.damage > 0) {
            ctx.fillStyle = '#ff6600';
            ctx.font = 'bold 10px Arial';
            ctx.fillText('D' + this.upgrades.damage, this.pos.x - 8, this.pos.y + 3);
        }
    }

    serialize() {
        return {
            id: this.id,
            towerType: this.data.id,
            x: this.pos.x,
            y: this.pos.y,
            level: this.level,
            upgrades: this.upgrades
        };
    }

    static deserialize(data, gameState, towerData) {
        const tower = new Tower(data.id, data.x, data.y, towerData, gameState);
        tower.level = data.level;
        tower.upgrades = data.upgrades;
        return tower;
    }
}

class TowerManager {
    constructor(gameState) {
        this.gameState = gameState;
        this.towers = [];
        this.nextId = 0;
        this.towerData = {};
    }

    async loadTowerData(url) {
        try {
            const response = await fetch(url);
            const data = await response.json();
            this.towerData = data.towers.reduce((acc, tower) => {
                acc[tower.id] = tower;
                return acc;
            }, {});
            return this.towerData;
        } catch (error) {
            console.error('Failed to load tower data:', error);
            return {};
        }
    }

    addTower(x, y, towerId) {
        if (!this.towerData[towerId]) {
            console.error(`Tower type ${towerId} not found`);
            return null;
        }

        const towerData = this.towerData[towerId];
        const tower = new Tower(this.nextId++, x, y, towerData, this.gameState);
        this.towers.push(tower);
        return tower;
    }

    update(deltaTime, enemies) {
        this.towers.forEach(tower => tower.update(deltaTime, enemies));
    }

    draw(ctx) {
        this.towers.forEach(tower => tower.draw(ctx));
    }

    getTowerAt(pos, radius = 20) {
        return this.towers.find(t => t.pos.distance(pos) < radius);
    }

    removeTower(tower) {
        const index = this.towers.indexOf(tower);
        if (index > -1) {
            this.towers.splice(index, 1);
        }
    }

    clear() {
        this.towers = [];
    }

    count() {
        return this.towers.length;
    }

    getTotalCost() {
        return this.towers.reduce((sum, t) => sum + t.cost, 0);
    }
}