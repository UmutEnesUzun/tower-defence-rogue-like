// UI Management System

class UIManager {
    constructor(game) {
        this.game = game;
        this.selectedTower = null;
        this.selectedPowerups = [];
        this.currentMenu = null;
        this.isMouseDown = false;
        this.mousePos = new Vector2(0, 0);
        this.showFPS = Storage.load('showFPS', true);
        this.fpsCounter = 0;
        this.lastFpsUpdate = Date.now();

        this.setupEventListeners();
        this.setupMenus();
    }

    setupEventListeners() {
        const canvas = this.game.canvas;

        // Mouse events
        canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        canvas.addEventListener('wheel', (e) => this.onMouseWheel(e));
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        // Touch events for mobile
        canvas.addEventListener('touchmove', (e) => this.onTouchMove(e));
        canvas.addEventListener('touchstart', (e) => this.onTouchStart(e));
        canvas.addEventListener('touchend', (e) => this.onTouchEnd(e));

        // Keyboard events
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        document.addEventListener('keyup', (e) => this.onKeyUp(e));

        // Button events
        document.getElementById('pause-btn').addEventListener('click', () => this.showPauseMenu());
        document.getElementById('menu-btn').addEventListener('click', () => this.showMainMenu());
        document.getElementById('resume-btn').addEventListener('click', () => this.closePauseMenu());
        document.getElementById('restart-btn').addEventListener('click', () => this.restartGame());
        document.getElementById('start-game-btn').addEventListener('click', () => this.startNewRun());
        document.getElementById('menu-main-btn').addEventListener('click', () => this.showMainMenu());
        document.getElementById('menu-exit-btn').addEventListener('click', () => this.showMainMenu());

        // Settings
        document.getElementById('settings-btn').addEventListener('click', () => this.showSettings());
        document.getElementById('settings-main-btn').addEventListener('click', () => this.showSettings());
        document.querySelector('.close-settings').addEventListener('click', () => this.closeSettings());

        // Close buttons
        document.querySelectorAll('.close-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.closest('.ui-panel').classList.add('hidden');
            });
        });

        // Settings inputs
        document.getElementById('show-fps').addEventListener('change', (e) => {
            this.showFPS = e.target.checked;
            Storage.save('showFPS', this.showFPS);
        });

        // Resize handler
        window.addEventListener('resize', () => this.onResize());
    }

    setupMenus() {
        this.menus = {
            main: document.getElementById('main-menu'),
            pause: document.getElementById('pause-menu'),
            tower: document.getElementById('tower-panel'),
            powerup: document.getElementById('powerup-panel'),
            settings: document.getElementById('settings-panel'),
            gameover: document.getElementById('gameover-screen')
        };
    }

    onMouseMove(e) {
        const rect = this.game.canvas.getBoundingClientRect();
        this.mousePos = new Vector2(e.clientX - rect.left, e.clientY - rect.top);

        if (this.game.isPaused) return;

        // Show tower preview
        if (this.selectedTower && this.game.gameState.mode === 'placing') {
            this.updateTowerPreview();
        }
    }

    onMouseDown(e) {
        if (this.game.isPaused) return;

        const worldPos = this.game.camera.getWorldPosition(this.mousePos.x, this.mousePos.y);

        if (e.button === 0) { // Left click
            if (this.game.gameState.mode === 'selecting') {
                this.selectTower(worldPos);
            } else if (this.game.gameState.mode === 'placing' && this.selectedTower) {
                this.placeTower(worldPos);
            }
        } else if (e.button === 2) { // Right click
            this.cancelTowerPlacement();
        }
    }

    onMouseUp(e) {
        this.isMouseDown = false;
    }

    onMouseWheel(e) {
        e.preventDefault();
        const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
        this.game.camera.setZoom(this.game.camera.zoom * zoomFactor);
    }

    onTouchMove(e) {
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const rect = this.game.canvas.getBoundingClientRect();
            this.mousePos = new Vector2(touch.clientX - rect.left, touch.clientY - rect.top);
        }
    }

    onTouchStart(e) {
        if (e.touches.length === 1) {
            this.isMouseDown = true;
            this.onMouseDown({
                button: 0,
                clientX: e.touches[0].clientX,
                clientY: e.touches[0].clientY
            });
        }
    }

    onTouchEnd(e) {
        this.isMouseDown = false;
    }

    onKeyDown(e) {
        if (e.code === 'Space') {
            e.preventDefault();
            if (this.game.isPaused) {
                this.closePauseMenu();
            } else {
                this.showPauseMenu();
            }
        }
    }

    onKeyUp(e) {
        // Handle key releases if needed
    }

    onResize() {
        // Handle window resize
    }

    selectTower(pos) {
        const tower = this.game.towerManager.getTowerAt(pos, 25);
        if (tower) {
            this.showTowerInfo(tower);
        } else {
            this.showTowerSelection();
        }
    }

    placeTower(pos) {
        if (!this.selectedTower) return;

        const cost = this.game.towerManager.towerData[this.selectedTower].cost;
        if (this.game.gameState.gold < cost) {
            console.log('Not enough gold');
            return;
        }

        const tower = this.game.towerManager.addTower(pos.x, pos.y, this.selectedTower);
        if (tower) {
            this.game.gameState.gold -= cost;
            this.game.gameState.score += Math.floor(cost * 0.1);
            this.selectedTower = null;
            this.game.gameState.mode = 'selecting';
            this.updateDisplay();
        }
    }

    cancelTowerPlacement() {
        this.selectedTower = null;
        this.game.gameState.mode = 'selecting';
    }

    showTowerSelection() {
        const towerList = document.getElementById('tower-list');
        towerList.innerHTML = '';

        Object.entries(this.game.towerManager.towerData).forEach(([id, data]) => {
            const div = document.createElement('div');
            div.className = 'tower-item';

            const canAfford = this.game.gameState.gold >= data.cost;
            if (!canAfford) div.classList.add('disabled');

            const icon = document.createElement('div');
            icon.className = 'tower-icon';
            icon.style.backgroundColor = data.color || '#00ff00';

            const name = document.createElement('div');
            name.className = 'tower-name';
            name.textContent = data.name;

            const cost = document.createElement('div');
            cost.className = `tower-cost ${!canAfford ? 'unaffordable' : ''}`;
            cost.textContent = `$${data.cost}`;

            div.appendChild(icon);
            div.appendChild(name);
            div.appendChild(cost);

            if (canAfford) {
                div.addEventListener('click', () => {
                    this.selectedTower = id;
                    this.game.gameState.mode = 'placing';
                    this.menus.tower.classList.add('hidden');
                    document.getElementById('ui-overlay').classList.add('hidden');
                });

                div.addEventListener('mouseenter', (e) => {
                    this.showTowerTooltip(data, e.pageX, e.pageY);
                });

                div.addEventListener('mouseleave', () => {
                    this.hideTowerTooltip();
                });
            }

            towerList.appendChild(div);
        });

        this.menus.tower.classList.remove('hidden');
        document.getElementById('ui-overlay').classList.remove('hidden');
    }

    showTowerInfo(tower) {
        // Show info about selected tower
        console.log('Tower selected:', tower);
    }

    showTowerTooltip(data, x, y) {
        const tooltip = document.getElementById('tower-tooltip');
        tooltip.classList.remove('hidden');

        document.getElementById('tooltip-name').textContent = data.name;
        document.getElementById('tooltip-description').textContent = data.description;
        document.getElementById('tooltip-range').textContent = data.range.toFixed(1);
        document.getElementById('tooltip-damage').textContent = data.damage.toFixed(1);
        document.getElementById('tooltip-attackspeed').textContent = data.attackSpeed.toFixed(2);
        document.getElementById('tooltip-cost').textContent = `$${data.cost}`;

        tooltip.style.left = x + 'px';
        tooltip.style.top = y + 'px';
    }

    hideTowerTooltip() {
        document.getElementById('tower-tooltip').classList.add('hidden');
    }

    showPowerUpSelection() {
        const powerupIds = this.game.powerupManager.getRandomPowerups(3);
        const powerupList = document.getElementById('powerup-list');
        powerupList.innerHTML = '';

        powerupIds.forEach(id => {
            const data = this.game.powerupManager.powerupData[id];
            const div = document.createElement('div');
            div.className = 'powerup-item';

            const icon = document.createElement('div');
            icon.className = 'powerup-icon';
            icon.style.backgroundColor = data.color || '#ff00ff';

            const name = document.createElement('div');
            name.className = 'powerup-name';
            name.textContent = data.name;

            const description = document.createElement('div');
            description.className = 'powerup-description';
            description.textContent = data.description;

            const rarity = document.createElement('div');
            rarity.className = 'powerup-rarity';
            rarity.textContent = data.rarity || 'Common';

            div.appendChild(icon);
            div.appendChild(name);
            div.appendChild(description);
            div.appendChild(rarity);

            div.addEventListener('click', () => {
                this.game.powerupManager.addPowerUp(id);
                this.menus.powerup.classList.add('hidden');
                document.getElementById('ui-overlay').classList.add('hidden');
                this.updateActiveEffects();
            });

            powerupList.appendChild(div);
        });

        this.menus.powerup.classList.remove('hidden');
        document.getElementById('ui-overlay').classList.remove('hidden');
    }

    updateActiveEffects() {
        const activePowerupsDiv = document.getElementById('active-powerups');
        const powerups = this.game.powerupManager.getActivePowerups();

        activePowerupsDiv.innerHTML = '';
        powerups.forEach(pu => {
            const div = document.createElement('div');
            div.className = 'active-powerup-item';
            const data = this.game.powerupManager.powerupData[pu.data.id];
            div.textContent = `✓ ${data.name}`;
            activePowerupsDiv.appendChild(div);
        });

        if (powerups.length === 0) {
            document.getElementById('run-info').classList.add('hidden');
        } else {
            document.getElementById('run-info').classList.remove('hidden');
        }
    }

    showPauseMenu() {
        this.game.isPaused = true;
        this.menus.pause.classList.remove('hidden');
        document.getElementById('ui-overlay').classList.remove('hidden');
    }

    closePauseMenu() {
        this.game.isPaused = false;
        this.menus.pause.classList.add('hidden');
        document.getElementById('ui-overlay').classList.add('hidden');
    }

    showMainMenu() {
        this.game.reset();
        this.menus.main.classList.remove('hidden');
        document.getElementById('ui-overlay').classList.remove('hidden');
    }

    startNewRun() {
        this.menus.main.classList.add('hidden');
        document.getElementById('ui-overlay').classList.add('hidden');
        this.game.startGame();
    }

    showGameOver() {
        document.getElementById('final-score').textContent = this.game.gameState.score;
        document.getElementById('final-wave').textContent = this.game.gameState.wave;
        document.getElementById('final-kills').textContent = this.game.gameState.kills;
        document.getElementById('final-gold').textContent = this.game.gameState.totalGold;

        this.menus.gameover.classList.remove('hidden');
        document.getElementById('ui-overlay').classList.remove('hidden');
    }

    showSettings() {
        this.menus.settings.classList.remove('hidden');
        document.getElementById('ui-overlay').classList.remove('hidden');
    }

    closeSettings() {
        this.menus.settings.classList.add('hidden');
        document.getElementById('ui-overlay').classList.add('hidden');
    }

    restartGame() {
        this.menus.gameover.classList.add('hidden');
        document.getElementById('ui-overlay').classList.add('hidden');
        this.game.reset();
        this.game.startGame();
    }

    updateDisplay() {
        document.getElementById('gold-display').textContent = formatCurrency(this.game.gameState.gold);
        document.getElementById('health-display').textContent = this.game.gameState.health;
        document.getElementById('wave-display').textContent = this.game.gameState.wave;
        document.getElementById('score-display').textContent = formatCurrency(this.game.gameState.score);
        document.getElementById('multiplier-display').textContent = this.game.gameState.multiplier.toFixed(1) + 'x';
    }

    updateTowerPreview() {
        // Could draw a preview of where the tower will be placed
    }

    updateFPS(fps) {
        if (!this.showFPS) return;

        let counter = document.getElementById('fps-counter');
        if (!counter) {
            counter = document.createElement('div');
            counter.id = 'fps-counter';
            document.getElementById('game-container').appendChild(counter);
        }

        counter.textContent = `FPS: ${fps.toFixed(0)}`;
    }

    drawCrosshair(ctx) {
        const size = 15;
        const lineWidth = 1;

        ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
        ctx.lineWidth = lineWidth;

        ctx.beginPath();
        ctx.moveTo(this.mousePos.x - size, this.mousePos.y);
        ctx.lineTo(this.mousePos.x + size, this.mousePos.y);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(this.mousePos.x, this.mousePos.y - size);
        ctx.lineTo(this.mousePos.x, this.mousePos.y + size);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(this.mousePos.x, this.mousePos.y, 5, 0, Math.PI * 2);
        ctx.stroke();
    }

    drawTowerPreview(ctx) {
        if (!this.selectedTower || this.game.gameState.mode !== 'placing') return;

        const towerData = this.game.towerManager.towerData[this.selectedTower];
        const worldPos = this.game.camera.getWorldPosition(this.mousePos.x, this.mousePos.y);

        // Draw range
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(worldPos.x, worldPos.y, towerData.range, 0, Math.PI * 2);
        ctx.stroke();

        // Draw tower preview
        ctx.fillStyle = towerData.color || '#00ff00';
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(worldPos.x, worldPos.y, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}