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

// ─── Mobile Detection ───
const isMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (window.innerWidth <= 768);
if (isMobile) document.body.classList.add('is-mobile');

// ─── Input ───
class InputManager {
    constructor() {
        this.keys = {};
        this.mouseX = 0; this.mouseY = 0;
        this.mouseDown = false;
        // Touch joystick direction (from TouchController)
        this.touchDx = 0;
        this.touchDy = 0;

        window.addEventListener('keydown', e => {
            // Allow typing in inputs/selects without triggering game controls
            const inInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT';
            if (inInput) return;
            this.keys[e.key.toLowerCase()] = true; this.keys[e.code] = true;
            if (e.key === ' ' || e.key === 'Shift' || e.key === 'e' || e.key === 'E' || e.key === 'o' || e.key === 'O'
                || e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight'
                || e.key === '/' || e.key === ',' || e.key === '.') e.preventDefault();
        });
        window.addEventListener('keyup', e => { this.keys[e.key.toLowerCase()] = false; this.keys[e.code] = false; });
        window.addEventListener('mousemove', e => { this.mouseX = e.clientX; this.mouseY = e.clientY; });
        window.addEventListener('mousedown', () => this.mouseDown = true);
        window.addEventListener('mouseup', () => this.mouseDown = false);
        // Touch support (for non-joystick touches like menu interaction)
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
        // Mobile: use joystick if active
        if (isMobile && (this.touchDx !== 0 || this.touchDy !== 0)) {
            return { dx: this.touchDx, dy: this.touchDy };
        }
        let dx = 0, dy = 0;
        if (this.keys['w'] || this.keys['arrowup'])    dy -= 1;
        if (this.keys['s'] || this.keys['arrowdown'])  dy += 1;
        if (this.keys['a'] || this.keys['arrowleft'])  dx -= 1;
        if (this.keys['d'] || this.keys['arrowright']) dx += 1;
        const len = Math.hypot(dx, dy);
        if (len > 0) { dx /= len; dy /= len; }
        return { dx, dy };
    }
    getMoveDirWASD() {
        if (isMobile && (this.touchDx !== 0 || this.touchDy !== 0)) {
            return { dx: this.touchDx, dy: this.touchDy };
        }
        let dx = 0, dy = 0;
        if (this.keys['w']) dy -= 1;
        if (this.keys['s']) dy += 1;
        if (this.keys['a']) dx -= 1;
        if (this.keys['d']) dx += 1;
        const len = Math.hypot(dx, dy);
        if (len > 0) { dx /= len; dy /= len; }
        return { dx, dy };
    }
    getMoveDirArrows() {
        if (isMobile && (this.touchDx !== 0 || this.touchDy !== 0)) {
            return { dx: this.touchDx, dy: this.touchDy };
        }
        let dx = 0, dy = 0;
        if (this.keys['arrowup'])    dy -= 1;
        if (this.keys['arrowdown'])  dy += 1;
        if (this.keys['arrowleft'])  dx -= 1;
        if (this.keys['arrowright']) dx += 1;
        const len = Math.hypot(dx, dy);
        if (len > 0) { dx /= len; dy /= len; }
        return { dx, dy };
    }
}

// ─── Touch Controller (Mobile Joystick + Action Buttons) ───
class TouchController {
    constructor(inputManager) {
        this.input = inputManager;
        this.enabled = isMobile;
        this.joystickId = null; // active touch ID for joystick
        this.joystickOriginX = 0;
        this.joystickOriginY = 0;
        this.joystickX = 0;
        this.joystickY = 0;
        this.joystickActive = false;
        this.joystickRadius = 50; // max drag distance

        if (!this.enabled) return;
        this.createUI();
        this.bindEvents();
    }

    createUI() {
        // Container - full screen overlay for touch controls
        this.container = document.createElement('div');
        this.container.id = 'mobileControls';
        this.container.className = 'mobile-controls hidden';
        document.body.appendChild(this.container);

        // Joystick zone (left half)
        this.joystickZone = document.createElement('div');
        this.joystickZone.className = 'joystick-zone';
        this.container.appendChild(this.joystickZone);

        // Joystick base (appears on touch)
        this.joystickBase = document.createElement('div');
        this.joystickBase.className = 'joystick-base';
        this.joystickZone.appendChild(this.joystickBase);

        // Joystick thumb
        this.joystickThumb = document.createElement('div');
        this.joystickThumb.className = 'joystick-thumb';
        this.joystickBase.appendChild(this.joystickThumb);

        // Action buttons (right side)
        this.btnContainer = document.createElement('div');
        this.btnContainer.className = 'mobile-btn-container';
        this.container.appendChild(this.btnContainer);

        // Create action buttons
        const buttons = [
            { id: 'mbtn-extend', label: '⊕', key: ' ', keyCode: 'Space', cls: 'mobile-btn-extend', title: 'EXTEND' },
            { id: 'mbtn-retract', label: '⊖', key: 'shift', keyCode: 'ShiftLeft', cls: 'mobile-btn-retract', title: 'RETRACT' },
            { id: 'mbtn-dash', label: '⚡', key: 'q', keyCode: 'KeyQ', cls: 'mobile-btn-dash', title: 'DASH' },
            { id: 'mbtn-equip', label: 'E', key: 'e', keyCode: 'KeyE', cls: 'mobile-btn-equip', title: 'EQUIP' },
            { id: 'mbtn-store', label: 'O', key: 'o', keyCode: 'KeyO', cls: 'mobile-btn-store', title: 'STORE' },
        ];

        this.actionButtons = [];
        buttons.forEach(b => {
            const btn = document.createElement('div');
            btn.id = b.id;
            btn.className = `mobile-btn ${b.cls}`;
            btn.innerHTML = `<span class="mobile-btn-icon">${b.label}</span><span class="mobile-btn-label">${b.title}</span>`;
            btn.dataset.key = b.key;
            btn.dataset.keyCode = b.keyCode;
            this.btnContainer.appendChild(btn);
            this.actionButtons.push(btn);
        });
    }

    bindEvents() {
        // Joystick touch events
        this.joystickZone.addEventListener('touchstart', e => {
            e.preventDefault();
            const touch = e.changedTouches[0];
            this.joystickId = touch.identifier;
            this.joystickActive = true;
            this.joystickOriginX = touch.clientX;
            this.joystickOriginY = touch.clientY;
            this.joystickX = touch.clientX;
            this.joystickY = touch.clientY;
            // Position the joystick base at touch point
            this.joystickBase.style.left = touch.clientX + 'px';
            this.joystickBase.style.top = touch.clientY + 'px';
            this.joystickBase.classList.add('active');
            this.updateJoystickVisual();
        }, { passive: false });

        this.joystickZone.addEventListener('touchmove', e => {
            e.preventDefault();
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                if (touch.identifier === this.joystickId) {
                    this.joystickX = touch.clientX;
                    this.joystickY = touch.clientY;
                    this.updateJoystickInput();
                    this.updateJoystickVisual();
                }
            }
        }, { passive: false });

        const endJoystick = e => {
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === this.joystickId) {
                    this.joystickActive = false;
                    this.joystickId = null;
                    this.input.touchDx = 0;
                    this.input.touchDy = 0;
                    this.joystickBase.classList.remove('active');
                    this.joystickThumb.style.transform = 'translate(-50%, -50%)';
                }
            }
        };
        this.joystickZone.addEventListener('touchend', endJoystick, { passive: true });
        this.joystickZone.addEventListener('touchcancel', endJoystick, { passive: true });

        // Action button touch events (each button independently tracks presses)
        this.actionButtons.forEach(btn => {
            btn.addEventListener('touchstart', e => {
                e.preventDefault();
                const key = btn.dataset.key;
                const keyCode = btn.dataset.keyCode;
                this.input.keys[key] = true;
                this.input.keys[keyCode] = true;
                btn.classList.add('pressed');
            }, { passive: false });

            btn.addEventListener('touchend', e => {
                e.preventDefault();
                const key = btn.dataset.key;
                const keyCode = btn.dataset.keyCode;
                this.input.keys[key] = false;
                this.input.keys[keyCode] = false;
                btn.classList.remove('pressed');
            }, { passive: false });

            btn.addEventListener('touchcancel', e => {
                const key = btn.dataset.key;
                const keyCode = btn.dataset.keyCode;
                this.input.keys[key] = false;
                this.input.keys[keyCode] = false;
                btn.classList.remove('pressed');
            }, { passive: true });
        });
    }

    updateJoystickInput() {
        const dx = this.joystickX - this.joystickOriginX;
        const dy = this.joystickY - this.joystickOriginY;
        const dist = Math.hypot(dx, dy);
        if (dist > 5) { // dead zone
            const clampedDist = Math.min(dist, this.joystickRadius);
            this.input.touchDx = (dx / dist) * (clampedDist / this.joystickRadius);
            this.input.touchDy = (dy / dist) * (clampedDist / this.joystickRadius);
        } else {
            this.input.touchDx = 0;
            this.input.touchDy = 0;
        }
    }

    updateJoystickVisual() {
        const dx = this.joystickX - this.joystickOriginX;
        const dy = this.joystickY - this.joystickOriginY;
        const dist = Math.hypot(dx, dy);
        const clampedDist = Math.min(dist, this.joystickRadius);
        const angle = Math.atan2(dy, dx);
        const thumbX = dist > 5 ? Math.cos(angle) * clampedDist : 0;
        const thumbY = dist > 5 ? Math.sin(angle) * clampedDist : 0;
        this.joystickThumb.style.transform = `translate(calc(-50% + ${thumbX}px), calc(-50% + ${thumbY}px))`;
    }

    show() { if (this.container) this.container.classList.remove('hidden'); }
    hide() { if (this.container) this.container.classList.add('hidden'); }
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
        case 'pentagon':
            for (let i = 0; i < 5; i++) {
                const a = -Math.PI / 2 + (i * 2 * Math.PI / 5);
                const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
                i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
            }
            ctx.closePath(); break;
        default:
            ctx.arc(x, y, r, 0, Math.PI * 2); break;
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
