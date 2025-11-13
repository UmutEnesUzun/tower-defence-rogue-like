// Utility functions for the tower defense game

class Vector2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    static fromAngle(angle, magnitude = 1) {
        return new Vector2(Math.cos(angle) * magnitude, Math.sin(angle) * magnitude);
    }

    distance(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    normalize() {
        const mag = this.magnitude();
        if (mag === 0) return new Vector2(0, 0);
        return new Vector2(this.x / mag, this.y / mag);
    }

    add(other) {
        return new Vector2(this.x + other.x, this.y + other.y);
    }

    subtract(other) {
        return new Vector2(this.x - other.x, this.y - other.y);
    }

    multiply(scalar) {
        return new Vector2(this.x * scalar, this.y * scalar);
    }

    angle() {
        return Math.atan2(this.y, this.x);
    }

    angleTo(other) {
        const diff = other.subtract(this);
        return diff.angle();
    }

    clone() {
        return new Vector2(this.x, this.y);
    }
}

class Rect {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    contains(point) {
        return point.x >= this.x && point.x <= this.x + this.width &&
               point.y >= this.y && point.y <= this.y + this.height;
    }

    intersects(other) {
        return !(this.x + this.width < other.x || this.x > other.x + other.width ||
                 this.y + this.height < other.y || this.y > other.y + other.height);
    }

    distanceToPoint(point) {
        const dx = Math.max(this.x - point.x, 0, point.x - (this.x + this.width));
        const dy = Math.max(this.y - point.y, 0, point.y - (this.y + this.height));
        return Math.sqrt(dx * dx + dy * dy);
    }

    center() {
        return new Vector2(this.x + this.width / 2, this.y + this.height / 2);
    }
}

class Circle {
    constructor(x, y, radius) {
        this.x = x;
        this.y = y;
        this.radius = radius;
    }

    contains(point) {
        const dx = point.x - this.x;
        const dy = point.y - this.y;
        return dx * dx + dy * dy <= this.radius * this.radius;
    }

    intersects(other) {
        if (other instanceof Circle) {
            const dx = this.x - other.x;
            const dy = this.y - other.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            return distance < this.radius + other.radius;
        }
        return false;
    }

    distanceToPoint(point) {
        const dx = point.x - this.x;
        const dy = point.y - this.y;
        return Math.sqrt(dx * dx + dy * dy) - this.radius;
    }
}

// Asset loader for external images
class AssetLoader {
    constructor() {
        this.assets = new Map();
        this.loadingPromises = new Map();
    }

    async loadImage(url, name) {
        if (this.assets.has(name)) {
            return this.assets.get(name);
        }

        if (this.loadingPromises.has(name)) {
            return this.loadingPromises.get(name);
        }

        const promise = new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                this.assets.set(name, img);
                resolve(img);
            };
            img.onerror = () => {
                console.error(`Failed to load image: ${url}`);
                // Create a placeholder
                const canvas = document.createElement('canvas');
                canvas.width = 40;
                canvas.height = 40;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#ff0000';
                ctx.fillRect(0, 0, 40, 40);
                const img = new Image();
                img.src = canvas.toDataURL();
                this.assets.set(name, img);
                resolve(img);
            };
            img.src = url;
        });

        this.loadingPromises.set(name, promise);
        return promise;
    }

    getImage(name) {
        return this.assets.get(name);
    }

    async loadBatch(urls) {
        return Promise.all(Object.entries(urls).map(([name, url]) => 
            this.loadImage(url, name)
        ));
    }
}

// Animation frame manager
class AnimationManager {
    constructor() {
        this.animations = [];
    }

    add(animation) {
        this.animations.push(animation);
    }

    update(deltaTime) {
        this.animations = this.animations.filter(anim => {
            anim.update(deltaTime);
            return !anim.isFinished();
        });
    }

    draw(ctx) {
        this.animations.forEach(anim => anim.draw(ctx));
    }

    clear() {
        this.animations = [];
    }
}

class Animation {
    constructor(duration, onUpdate, onComplete) {
        this.duration = duration;
        this.elapsed = 0;
        this.onUpdate = onUpdate;
        this.onComplete = onComplete;
        this.finished = false;
    }

    update(deltaTime) {
        this.elapsed += deltaTime;
        if (this.elapsed >= this.duration) {
            this.elapsed = this.duration;
            this.finished = true;
            if (this.onComplete) this.onComplete();
        }
        const progress = this.elapsed / this.duration;
        if (this.onUpdate) this.onUpdate(progress);
    }

    isFinished() {
        return this.finished;
    }

    draw(ctx) {
        // Override in subclasses
    }
}

// Particle system
class Particle {
    constructor(x, y, vx, vy, life, color) {
        this.pos = new Vector2(x, y);
        this.vel = new Vector2(vx, vy);
        this.life = life;
        this.maxLife = life;
        this.color = color;
        this.size = 4;
    }

    update(deltaTime) {
        this.pos = this.pos.add(this.vel.multiply(deltaTime));
        this.life -= deltaTime;
        this.vel = this.vel.multiply(0.95); // Friction
    }

    draw(ctx) {
        const alpha = this.life / this.maxLife;
        ctx.fillStyle = this.color;
        ctx.globalAlpha = alpha;
        ctx.fillRect(this.pos.x - this.size / 2, this.pos.y - this.size / 2, this.size, this.size);
        ctx.globalAlpha = 1;
    }

    isAlive() {
        return this.life > 0;
    }
}

class ParticleEmitter {
    constructor() {
        this.particles = [];
    }

    emit(x, y, count, vxRange, vyRange, life, color) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.random() * Math.PI * 2);
            const speed = Math.random() * 100 + 50;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            this.particles.push(new Particle(x, y, vx, vy, life, color));
        }
    }

    update(deltaTime) {
        this.particles = this.particles.filter(p => {
            p.update(deltaTime);
            return p.isAlive();
        });
    }

    draw(ctx) {
        this.particles.forEach(p => p.draw(ctx));
    }

    clear() {
        this.particles = [];
    }
}

// Random utilities
function randomRange(min, max) {
    return Math.random() * (max - min) + min;
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function randomWeighted(items) {
    const totalWeight = items.reduce((sum, item) => sum + (item.weight || 1), 0);
    let random = Math.random() * totalWeight;
    for (const item of items) {
        random -= (item.weight || 1);
        if (random <= 0) return item.value;
    }
    return items[0].value;
}

// Easing functions
const Easing = {
    linear: (t) => t,
    easeInQuad: (t) => t * t,
    easeOutQuad: (t) => t * (2 - t),
    easeInOutQuad: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    easeInCubic: (t) => t * t * t,
    easeOutCubic: (t) => (--t) * t * t + 1,
    easeInOutCubic: (t) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * (t - 2)) * (2 * (t - 2)) + 1,
};

// Interpolation
function lerp(a, b, t) {
    return a + (b - a) * t;
}

function lerpColor(color1, color2, t) {
    // Simplified color interpolation
    return color1;
}

// Debounce and throttle
function debounce(fn, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
}

function throttle(fn, delay) {
    let lastCall = 0;
    return function(...args) {
        const now = Date.now();
        if (now - lastCall >= delay) {
            lastCall = now;
            fn(...args);
        }
    };
}

// Format currency
function formatCurrency(amount) {
    if (amount >= 1000000) return (amount / 1000000).toFixed(1) + 'M';
    if (amount >= 1000) return (amount / 1000).toFixed(1) + 'K';
    return amount.toString();
}

// Save/Load from localStorage
const Storage = {
    save: (key, data) => {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.error('Storage save failed:', e);
        }
    },
    load: (key, defaultValue = null) => {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (e) {
            console.error('Storage load failed:', e);
            return defaultValue;
        }
    },
    remove: (key) => {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.error('Storage remove failed:', e);
        }
    }
};