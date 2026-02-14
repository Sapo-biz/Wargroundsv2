// ═══════════════════════════════════════════════════════
// ORBITRON — Particle System
// ═══════════════════════════════════════════════════════

class Particle {
    constructor(x, y, vx, vy, life, size, color, alpha = 1, shrink = true) {
        this.x = x; this.y = y;
        this.vx = vx; this.vy = vy;
        this.life = life; this.maxLife = life;
        this.size = size; this.color = color;
        this.alpha = alpha; this.shrink = shrink;
    }
}

class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    add(p) { if (this.particles.length < 2000) this.particles.push(p); }

    burst(x, y, count, color, speed = 150, life = 0.5, size = 4) {
        for (let i = 0; i < count; i++) {
            const a = Math.random() * Math.PI * 2;
            const s = (0.3 + Math.random() * 0.7) * speed;
            this.add(new Particle(x, y, Math.cos(a) * s, Math.sin(a) * s, life * (0.5 + Math.random() * 0.5), size * (0.5 + Math.random()), color));
        }
    }

    ring(x, y, count, color, radius, life = 0.4, size = 3) {
        for (let i = 0; i < count; i++) {
            const a = (i / count) * Math.PI * 2;
            const px = x + Math.cos(a) * radius;
            const py = y + Math.sin(a) * radius;
            this.add(new Particle(px, py, Math.cos(a) * 30, Math.sin(a) * 30, life, size, color));
        }
    }

    trail(x, y, color, size = 3) {
        this.add(new Particle(
            x + (Math.random() - 0.5) * 6,
            y + (Math.random() - 0.5) * 6,
            (Math.random() - 0.5) * 20,
            (Math.random() - 0.5) * 20,
            0.3 + Math.random() * 0.3,
            size * (0.5 + Math.random() * 0.5),
            color, 0.6
        ));
    }

    xpCollect(x, y, targetX, targetY) {
        const a = Math.atan2(targetY - y, targetX - x);
        this.add(new Particle(x, y, Math.cos(a) * 300, Math.sin(a) * 300, 0.3, 3, '#00ffcc', 0.8));
    }

    damageNumber(x, y, dmg, color = '#ff4444') {
        // Create a floating damage particle
        this.add(new DamageNumber(x + (Math.random() - 0.5) * 20, y - 10, dmg, color));
    }

    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx *= 0.97;
            p.vy *= 0.97;
            p.life -= dt;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw(ctx, camera) {
        for (const p of this.particles) {
            const sx = camera.screenX(p.x);
            const sy = camera.screenY(p.y);
            if (sx < -50 || sx > canvas.width + 50 || sy < -50 || sy > canvas.height + 50) continue;

            const lifeRatio = p.life / p.maxLife;

            if (p instanceof DamageNumber) {
                ctx.globalAlpha = lifeRatio;
                ctx.font = `bold ${Math.max(12, p.size)}px system-ui`;
                ctx.fillStyle = p.color;
                ctx.textAlign = 'center';
                ctx.fillText(p.text, sx, sy);
                ctx.globalAlpha = 1;
                continue;
            }

            const size = p.shrink ? p.size * lifeRatio : p.size;
            ctx.globalAlpha = p.alpha * lifeRatio;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(sx, sy, Math.max(0.5, size), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }
}

class DamageNumber extends Particle {
    constructor(x, y, dmg, color) {
        super(x, y, (Math.random() - 0.5) * 40, -80, 0.8, Math.min(22, 12 + dmg / 5), color, 1, false);
        this.text = Math.round(dmg).toString();
    }
}
