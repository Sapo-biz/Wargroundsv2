// ═══════════════════════════════════════════════════════
// ORBITRON — Engine (Canvas, Camera, Input, Audio)
// ═══════════════════════════════════════════════════════

// ─── Canvas & Camera ───
class Camera {
    constructor() {
        this.x = 0; this.y = 0;
        this.targetX = 0; this.targetY = 0;
        this.smoothing = 8;
        this.shake = 0;
        this.shakeX = 0; this.shakeY = 0;
    }
    follow(x, y) { this.targetX = x; this.targetY = y; }
    update(dt) {
        this.x += (this.targetX - this.x) * this.smoothing * dt;
        this.y += (this.targetY - this.y) * this.smoothing * dt;
        if (this.shake > 0) {
            this.shake -= dt;
            this.shakeX = (Math.random() - 0.5) * this.shake * 30;
            this.shakeY = (Math.random() - 0.5) * this.shake * 30;
        } else {
            this.shakeX = 0; this.shakeY = 0;
        }
    }
    addShake(amount) { this.shake = Math.min(this.shake + amount, 1); }
    screenX(wx) { return wx - this.x + canvas.width / 2 + this.shakeX; }
    screenY(wy) { return wy - this.y + canvas.height / 2 + this.shakeY; }
    worldX(sx) { return sx + this.x - canvas.width / 2; }
    worldY(sy) { return sy + this.y - canvas.height / 2; }
    isVisible(wx, wy, margin = 100) {
        const sx = this.screenX(wx), sy = this.screenY(wy);
        return sx > -margin && sx < canvas.width + margin && sy > -margin && sy < canvas.height + margin;
    }
}

// ─── Input ───
class InputManager {
    constructor() {
        this.keys = {};
        this.mouseX = 0; this.mouseY = 0;
        this.mouseDown = false;
        window.addEventListener('keydown', e => {
            this.keys[e.key.toLowerCase()] = true; this.keys[e.code] = true;
            // Prevent space/shift from scrolling
            if (e.key === ' ' || e.key === 'Shift' || e.key === 'e' || e.key === 'E' || e.key === 'o' || e.key === 'O') e.preventDefault();
        });
        window.addEventListener('keyup', e => { this.keys[e.key.toLowerCase()] = false; this.keys[e.code] = false; });
        window.addEventListener('mousemove', e => { this.mouseX = e.clientX; this.mouseY = e.clientY; });
        window.addEventListener('mousedown', () => this.mouseDown = true);
        window.addEventListener('mouseup', () => this.mouseDown = false);
        // Touch support
        window.addEventListener('touchstart', e => {
            if (e.touches.length) {
                this.mouseX = e.touches[0].clientX;
                this.mouseY = e.touches[0].clientY;
                this.mouseDown = true;
            }
        }, { passive: true });
        window.addEventListener('touchmove', e => {
            if (e.touches.length) {
                this.mouseX = e.touches[0].clientX;
                this.mouseY = e.touches[0].clientY;
            }
        }, { passive: true });
        window.addEventListener('touchend', () => this.mouseDown = false);
    }
    getMoveDir() {
        let dx = 0, dy = 0;
        if (this.keys['w'] || this.keys['arrowup'])    dy -= 1;
        if (this.keys['s'] || this.keys['arrowdown'])  dy += 1;
        if (this.keys['a'] || this.keys['arrowleft'])  dx -= 1;
        if (this.keys['d'] || this.keys['arrowright']) dx += 1;
        const len = Math.hypot(dx, dy);
        if (len > 0) { dx /= len; dy /= len; }
        return { dx, dy };
    }
}

// ─── Audio (Procedural) ───
class AudioManager {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.masterVol = 0.3;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) { this.enabled = false; }
    }
    resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }
    play(type, vol = 0.5) {
        if (!this.enabled || !this.ctx) return;
        this.resume();
        const t = this.ctx.currentTime;
        const g = this.ctx.createGain();
        g.connect(this.ctx.destination);
        g.gain.value = vol * this.masterVol;
        const o = this.ctx.createOscillator();
        o.connect(g);
        switch (type) {
            case 'hit':
                o.type = 'square'; o.frequency.setValueAtTime(200, t);
                o.frequency.exponentialRampToValueAtTime(80, t + 0.1);
                g.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
                o.start(t); o.stop(t + 0.1); break;
            case 'kill':
                o.type = 'sine'; o.frequency.setValueAtTime(400, t);
                o.frequency.exponentialRampToValueAtTime(800, t + 0.08);
                g.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
                o.start(t); o.stop(t + 0.12); break;
            case 'levelup':
                o.type = 'sine'; o.frequency.setValueAtTime(400, t);
                o.frequency.setValueAtTime(500, t + 0.1);
                o.frequency.setValueAtTime(600, t + 0.2);
                o.frequency.setValueAtTime(800, t + 0.3);
                g.gain.setValueAtTime(vol * this.masterVol, t);
                g.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
                o.start(t); o.stop(t + 0.5); break;
            case 'pickup':
                o.type = 'sine'; o.frequency.setValueAtTime(600 + Math.random() * 200, t);
                o.frequency.exponentialRampToValueAtTime(1200, t + 0.05);
                g.gain.exponentialRampToValueAtTime(0.01, t + 0.06);
                o.start(t); o.stop(t + 0.06); break;
            case 'shoot':
                o.type = 'sawtooth'; o.frequency.setValueAtTime(300, t);
                o.frequency.exponentialRampToValueAtTime(100, t + 0.06);
                g.gain.value = vol * this.masterVol * 0.3;
                g.gain.exponentialRampToValueAtTime(0.01, t + 0.06);
                o.start(t); o.stop(t + 0.06); break;
            case 'nova':
                o.type = 'sawtooth'; o.frequency.setValueAtTime(150, t);
                o.frequency.exponentialRampToValueAtTime(50, t + 0.3);
                g.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
                o.start(t); o.stop(t + 0.3); break;
            case 'boss':
                o.type = 'square'; o.frequency.setValueAtTime(60, t);
                o.frequency.setValueAtTime(80, t + 0.2);
                o.frequency.setValueAtTime(60, t + 0.4);
                g.gain.exponentialRampToValueAtTime(0.01, t + 0.6);
                o.start(t); o.stop(t + 0.6); break;
            case 'death':
                o.type = 'sawtooth'; o.frequency.setValueAtTime(300, t);
                o.frequency.exponentialRampToValueAtTime(30, t + 0.8);
                g.gain.exponentialRampToValueAtTime(0.01, t + 1);
                o.start(t); o.stop(t + 1); break;
            case 'rare':
                o.type = 'sine'; o.frequency.setValueAtTime(523, t);
                o.frequency.setValueAtTime(659, t + 0.12);
                o.frequency.setValueAtTime(784, t + 0.24);
                o.frequency.setValueAtTime(1047, t + 0.36);
                g.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
                o.start(t); o.stop(t + 0.5); break;
        }
    }
}

// ─── Rendering Helpers ───
function drawCircle(ctx, x, y, r, color, alpha = 1) {
    ctx.globalAlpha = alpha;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = color; ctx.fill();
    ctx.globalAlpha = 1;
}

function drawGlow(ctx, x, y, r, color, intensity = 1) {
    ctx.save();
    ctx.shadowBlur = r * 2 * intensity;
    ctx.shadowColor = color;
    drawCircle(ctx, x, y, r, color, 0.6 * intensity);
    ctx.restore();
}

function drawShape(ctx, x, y, r, shape, color, alpha = 1) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    switch (shape) {
        case 'circle':
            ctx.arc(x, y, r, 0, Math.PI * 2); break;
        case 'triangle':
            for (let i = 0; i < 3; i++) {
                const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
                const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
                i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
            }
            ctx.closePath(); break;
        case 'square':
            ctx.rect(x - r * 0.8, y - r * 0.8, r * 1.6, r * 1.6); break;
        case 'diamond':
            ctx.moveTo(x, y - r); ctx.lineTo(x + r, y);
            ctx.lineTo(x, y + r); ctx.lineTo(x - r, y);
            ctx.closePath(); break;
    }
    ctx.fill();
    ctx.globalAlpha = 1;
}

function lerpColor(a, b, t) { return a; } // simplified for perf

// Polyfill roundRect for older browsers
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, radii) {
        const r = typeof radii === 'number' ? radii : (radii[0] || 0);
        this.moveTo(x + r, y);
        this.lineTo(x + w - r, y);
        this.quadraticCurveTo(x + w, y, x + w, y + r);
        this.lineTo(x + w, y + h - r);
        this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        this.lineTo(x + r, y + h);
        this.quadraticCurveTo(x, y + h, x, y + h - r);
        this.lineTo(x, y + r);
        this.quadraticCurveTo(x, y, x + r, y);
        this.closePath();
        return this;
    };
}

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();
