class PowerUp {
    constructor(id, data, gameState) {
        this.id = id;
        this.data = data;
        this.gameState = gameState;
        this.active = true;
        this.startTime = Date.now();
        this.duration = data.duration || Infinity;
    }

    apply() {
        // Override in subclasses
    }

    remove() {
        this.active = false;
    }

    isExpired() {
        if (this.duration === Infinity) return false;
        return (Date.now() - this.startTime) / 1000 > this.duration;
    }

    update() {
        if (this.isExpired()) {
            this.remove();
        }
    }

    serialize() {
        return {
            id: this.id,
            powerupType: this.data.id,
            applied: this.active
        };
    }
}

class TowerDamageBoost extends PowerUp {
    apply() {
        // Apply to all towers
        this.gameState.towerManager.towers.forEach(tower => {
            tower.upgrades.damage += (this.data.value || 1);
        });
    }

    remove() {
        super.remove();
        this.gameState.towerManager.towers.forEach(tower => {
            tower.upgrades.damage -= (this.data.value || 1);
        });
    }
}

class GoldMultiplier extends PowerUp {
    constructor(id, data, gameState) {
        super(id, data, gameState);
        this.originalMultiplier = gameState.multiplier;
    }

    apply() {
        this.gameState.multiplier *= (this.data.value || 1.5);
    }

    remove() {
        super.remove();
        this.gameState.multiplier = this.originalMultiplier;
    }
}

class HealthRestore extends PowerUp {
    apply() {
        this.gameState.health = Math.min(this.gameState.maxHealth, 
            this.gameState.health + (this.data.value || 20));
    }
}

class CriticalStrike extends PowerUp {
    apply() {
        this.gameState.critChance = (this.data.value || 0.2);
    }

    remove() {
        super.remove();
        this.gameState.critChance = 0;
    }
}

class SlowEnemies extends PowerUp {
    constructor(id, data, gameState) {
        super(id, data, gameState);
        this.originalSpeeds = new Map();
    }

    apply() {
        this.gameState.enemyManager.enemies.forEach(enemy => {
            this.originalSpeeds.set(enemy.id, enemy.speed);
            enemy.speed *= (this.data.value || 0.7);
        });
    }

    remove() {
        super.remove();
        this.gameState.enemyManager.enemies.forEach(enemy => {
            const originalSpeed = this.originalSpeeds.get(enemy.id);
            if (originalSpeed) {
                enemy.speed = originalSpeed;
            }
        });
    }
}

class PowerUpManager {
    constructor(gameState) {
        this.gameState = gameState;
        this.activePowerUps = [];
        this.powerupData = {};
        this.powerUpClasses = {
            'tower_damage_boost': TowerDamageBoost,
            'gold_multiplier': GoldMultiplier,
            'health_restore': HealthRestore,
            'critical_strike': CriticalStrike,
            'slow_enemies': SlowEnemies
        };
    }

    async loadPowerupData(url) {
        try {
            const response = await fetch(url);
            const data = await response.json();
            this.powerupData = data.powerups.reduce((acc, powerup) => {
                acc[powerup.id] = powerup;
                return acc;
            }, {});
            return this.powerupData;
        } catch (error) {
            console.error('Failed to load powerup data:', error);
            return {};
        }
    }

    addPowerUp(powerupId) {
        const data = this.powerupData[powerupId];
        if (!data) {
            console.error(`Power-up ${powerupId} not found`);
            return null;
        }

        const PowerUpClass = this.powerUpClasses[powerupId] || PowerUp;
        const powerup = new PowerUpClass(powerupId, data, this.gameState);
        powerup.apply();
        this.activePowerUps.push(powerup);
        return powerup;
    }

    update() {
        this.activePowerUps = this.activePowerUps.filter(pu => {
            pu.update();
            return pu.active;
        });
    }

    getActivePowerups() {
        return this.activePowerUps.filter(pu => pu.active);
    }

    clear() {
        this.activePowerUps.forEach(pu => pu.remove());
        this.activePowerUps = [];
    }

    count() {
        return this.activePowerUps.length;
    }

    getRandomPowerups(count = 3) {
        const powerupIds = Object.keys(this.powerupData);
        const selected = [];
        for (let i = 0; i < count && powerupIds.length > 0; i++) {
            const idx = Math.floor(Math.random() * powerupIds.length);
            selected.push(powerupIds[idx]);
            powerupIds.splice(idx, 1);
        }
        return selected;
    }
}