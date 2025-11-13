class Camera {
    constructor(canvas) {
        this.canvas = canvas;
        this.x = 0;
        this.y = 0;
        this.zoom = 1;
        this.minZoom = 0.5;
        this.maxZoom = 3;
        this.width = canvas.width;
        this.height = canvas.height;
    }

    update(targetX, targetY) {
        // Smoothly follow target
        const targetZoom = 1;
        this.x += (targetX - this.width / 2 / this.zoom - this.x) * 0.1;
        this.y += (targetY - this.height / 2 / this.zoom - this.y) * 0.1;
        this.zoom += (targetZoom - this.zoom) * 0.1;
    }

    setZoom(zoom) {
        this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoom));
    }

    pan(dx, dy) {
        this.x -= dx / this.zoom;
        this.y -= dy / this.zoom;
    }

    getWorldPosition(screenX, screenY) {
        return new Vector2(
            this.x + screenX / this.zoom,
            this.y + screenY / this.zoom
        );
    }

    getScreenPosition(worldX, worldY) {
        return new Vector2(
            (worldX - this.x) * this.zoom,
            (worldY - this.y) * this.zoom
        );
    }

    applyTransform(ctx) {
        ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
        ctx.scale(this.zoom, this.zoom);
        ctx.translate(-this.x - this.canvas.width / 2 / this.zoom, -this.y - this.canvas.height / 2 / this.zoom);
    }

    reset() {
        ctx.translate(-this.canvas.width / 2, -this.canvas.height / 2);
        ctx.scale(1 / this.zoom, 1 / this.zoom);
        ctx.translate(this.x + this.canvas.width / 2 / this.zoom, this.y + this.canvas.height / 2 / this.zoom);
    }

    getVisibleBounds() {
        return new Rect(
            this.x - this.width / 2 / this.zoom,
            this.y - this.height / 2 / this.zoom,
            this.width / this.zoom,
            this.height / this.zoom
        );
    }

    isVisible(x, y, size = 0) {
        const bounds = this.getVisibleBounds();
        return !(x + size < bounds.x || x - size > bounds.x + bounds.width ||
                 y + size < bounds.y || y - size > bounds.y + bounds.height);
    }
}