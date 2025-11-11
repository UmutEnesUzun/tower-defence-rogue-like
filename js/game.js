class GameState {
    constructor() {
        this.reset();
    }

    reset() {
        this.gold = 500;
        this.health = 100;
        this.maxHealth = 100;
        this.score = 0;
        this.wave = 0;
        this.kills = 0;
        this.totalGold = 0;
        this.multiplier = 1.0;
        this.critChance = 0;
        this.mode = 'selecting'; // 'selecting' or 'placing'
        this.gameOver = false;
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();

        this.gameState = new GameState();
        this.isPaused = true;
        this.deltaTime = 0;
        this.lastFrameTime = 0;

        // Game systems
        this.camera = new Camera(this.canvas);
        this.towerManager = new TowerManager(this.gameState);
        this.enemyManager = new EnemyManager(this.gameState);
        this.powerupManager = new PowerUpManager(this.gameState);
        this.projectileManager = new ProjectileManager();
        this.particleEmitter = new ParticleEmitter();
        this.uiManager = new UIManager(this);

        // Game setup
        this.setupGame();
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight - 50; // Account for header
    }

    async setupGame() {
        try {
            await this.towerManager.loadTowerData('data/towers.json');
            await this.enemyManager.loadEnemyData('data/enemies.json');
            await this.powerupManager.loadPowerupData('data/powerups.json');
            console.log('Game data loaded successfully');

            // Setup enemy path
            this.setupEnemyPath();

            this.uiManager.showMainMenu();
        } catch (error) {
            console.error('Failed to setup game:', error);
            alert('Failed to load game data. Check console for details.');
        }
    }

    setupEnemyPath() {
        const width = this.canvas.width;
        const height = this.canvas.height;

        // Create a winding path
        const path = [
            new Vector2(0, height / 2),
            new Vector2(width * 0.25, height * 0.25),
            new Vector2(width * 0.5, height * 0.1),
            new Vector2(width * 0.75, height * 0.25),
            new Vector2(width, height / 2),
            new Vector2(width * 0.75, height * 0.75),
            new Vector2(width * 0.5, height * 0.9),
            new Vector2(width * 0.25, height * 0.75),
            new Vector2(0, height / 2)
        ];

        this.enemyManager.setPath(path);
    }

    startGame() {
        this.gameState.reset();
        this.towerManager.clear();
        this.enemyManager.clear();
        this.projectileManager.clear();
        this.particleEmitter.clear();
        this.powerupManager.clear();

        this.setupEnemyPath();

        this.isPaused = false;
        this.gameState.gameOver = false;
        this.uiManager.updateDisplay();

        this.gameLoop();
    }

    reset() {
        this.isPaused = true;
        this.gameState.gameOver = false;
        this.towerManager.clear();
        this.enemyManager.clear();
        this.projectileManager.clear();
        this.particleEmitter.clear();
        this.powerupManager.clear();
    }

    gameLoop = () => {
        const now = performance.now();
        this.deltaTime = Math.min((now - this.lastFrameTime) / 1000, 0.05); // Cap at 50ms
        this.lastFrameTime = now;

        if (!this.isPaused) {
            this.update(this.deltaTime);
        }

        this.draw();

        requestAnimationFrame(this.gameLoop);
    }

    update(deltaTime) {
        // Update enemy spawning and movement
        this.enemyManager.update(deltaTime, this.canvas.width, this.canvas.height);

        // Update towers
        this.towerManager.update(deltaTime, this.enemyManager.enemies);

        // Update projectiles
        this.projectileManager.update(deltaTime, this.enemyManager.enemies);

        // Update power-ups
        this.powerupManager.update();

        // Update particles
        this.particleEmitter.update(deltaTime);

        // Handle reached enemies
        const reachedEnemies = this.enemyManager.getReachedEnemies();
        reachedEnemies.forEach(enemy => {
            this.gameState.health -= enemy.data.damage || 1;
            this.particleEmitter.emit(enemy.pos.x, enemy.pos.y, 5, 0, 0, 0.3, '#ff0000');
        });

        // Handle dead enemies
        const deadEnemies = this.enemyManager.getDeadEnemies();
        deadEnemies.forEach(enemy => {
            const reward = enemy.bounty * this.gameState.multiplier;
            this.gameState.gold += reward;
            this.gameState.totalGold += reward;
            this.gameState.score += reward;
            this.gameState.kills++;

            // 10% chance for power-up drop
            if (Math.random() < 0.1) {
                this.triggerPowerUpSelection();
            }

            this.particleEmitter.emit(enemy.pos.x, enemy.pos.y, 8, 0, 0, 0.5, '#ffff00');
        });

        // Update UI
        this.uiManager.updateDisplay();

        // Check game over
        if (this.gameState.health <= 0) {
            this.endGame();
        }

        // Update camera to follow center of map
        this.camera.update(
            this.canvas.width / 2,
            this.canvas.height / 2
        );
    }

    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#0a0a0a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Apply camera transform
        this.ctx.save();
        this.camera.applyTransform(this.ctx);

        // Draw game objects
        this.drawPath();
        this.projectileManager.draw(this.ctx);
        this.towerManager.draw(this.ctx);
        this.enemyManager.draw(this.ctx);
        this.particleEmitter.draw(this.ctx);

        // Draw tower preview
        this.ctx.restore();
        this.uiManager.drawTowerPreview(this.ctx);
        this.uiManager.drawCrosshair(this.ctx);

        // Update FPS
        this.uiManager.updateFPS(1 / this.deltaTime);
    }

    drawPath() {
        const path = this.enemyManager.currentPath;
        if (path.length === 0) return;

        this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.2)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(path[0].x, path[0].y);

        for (let i = 1; i < path.length; i++) {
            this.ctx.lineTo(path[i].x, path[i].y);
        }

        this.ctx.stroke();

        // Draw waypoints
        this.ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
        path.forEach(point => {
            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }

    triggerPowerUpSelection() {
        // Wait for current frame to finish, then show power-up selection
        setTimeout(() => {
            this.isPaused = true;
            this.uiManager.showPowerUpSelection();
        }, 100);
    }

    endGame() {
        this.gameState.gameOver = true;
        this.isPaused = true;
        this.uiManager.showGameOver();
    }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    // Game will show main menu initially
});