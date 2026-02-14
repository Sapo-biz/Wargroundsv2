// ═══════════════════════════════════════════════════════
// ORBITRON — Main Game Loop
// ═══════════════════════════════════════════════════════

class Game {
    constructor() {
        this.camera = new Camera();
        this.input = new InputManager();
        this.audio = new AudioManager();
        this.particles = new ParticleSystem();
        this.saveSystem = new SaveSystem();
        this.saveData = this.saveSystem.load();
        this.ui = new UIManager(this);
        this.upgradeSystem = new UpgradeSystem(this);

        this.state = 'menu'; // menu, playing, paused, dead
        this.paused = false;
        this.player = null;
        this.enemies = [];
        this.projectiles = [];
        this.xpGems = [];
        this.lootDrops = [];
        this.hazardZones = [];
        this.inventory = [];
        this.nextInvId = 0;
        this.waveSystem = null;
        this.runTime = 0;
        this.killStreak = 0;
        this.streakTimer = 0;
        this.runStats = {};

        this.lastTime = 0;
        this.hudUpdateTimer = 0;
        this.minimapTimer = 0;
        this.autoSaveTimer = 0;

        this.ui.showScreen('mainMenu');
        this.loop = this.loop.bind(this);
        requestAnimationFrame(this.loop);
    }

    // ─── Permanent Bonus ───
    permBonus(id) {
        const upgrade = PERM_UPGRADES.find(u => u.id === id);
        if (!upgrade) return 0;
        const level = this.saveSystem.getUpgradeLevel(this.saveData, id);
        return level * upgrade.effect;
    }

    // ─── Achievement Bonus ───
    achievementBonus() {
        let bonuses = { damage: 0, maxHp: 0, speed: 0, luck: 0, xpGain: 0, regen: 0 };
        for (const achId of this.saveData.achievements) {
            const ach = ACHIEVEMENTS.find(a => a.id === achId);
            if (!ach) continue;
            const r = ach.reward;
            if (r.includes('Damage')) bonuses.damage += parseFloat(r.match(/(\d+)/)[1]) / 100;
            if (r.includes('Max HP')) bonuses.maxHp += parseFloat(r.match(/(\d+)/)[1]) / 100;
            if (r.includes('Speed')) bonuses.speed += parseFloat(r.match(/(\d+)/)[1]) / 100;
            if (r.includes('Luck')) bonuses.luck += parseFloat(r.match(/(\d+)/)[1]) / 100;
            if (r.includes('XP')) bonuses.xpGain += parseFloat(r.match(/(\d+)/)[1]) / 100;
            if (r.includes('Regen')) bonuses.regen += parseFloat(r.match(/(\d+)/)[1]) / 100;
        }
        return bonuses;
    }

    // ─── Try Start Run (check for stash petals) ───
    tryStartRun() {
        const stash = this.saveData.permInventory || [];
        if (stash.length > 0) {
            // Show pre-run petal selection
            this.ui.showScreen('preRunScreen');
        } else {
            this.startRun(null);
        }
    }

    // ─── Start Run ───
    startRun(startingPetal) {
        this.audio.resume();
        this.state = 'playing';
        this.paused = false;
        this.player = new Player(this);
        this.enemies = [];
        this.projectiles = [];
        this.xpGems = [];
        this.lootDrops = [];
        this.hazardZones = [];
        this.inventory = [];
        this.nextInvId = 0;
        this._deathPetals = null;
        this.waveSystem = new WaveSystem(this);
        this.runTime = 0;
        this.killStreak = 0;
        this.streakTimer = 0;
        this.runStats = { kills: 0, wave: 0, level: 1, time: 0, bestStreak: 0, bestRarity: 0, bossKills: 0, bestZone: 0, prestiges: this.saveData.prestiges };

        // Apply achievement bonuses
        const achBonus = this.achievementBonus();
        if (achBonus.damage > 0) this.player.statBonuses.damage *= (1 + achBonus.damage);
        if (achBonus.maxHp > 0) this.player.statBonuses.maxHp += this.player.baseStats.maxHp * achBonus.maxHp;
        if (achBonus.speed > 0) this.player.statBonuses.speed *= (1 + achBonus.speed);
        if (achBonus.luck > 0) this.player.statBonuses.luck *= (1 + achBonus.luck);
        if (achBonus.xpGain > 0) this.player.statBonuses.xpGain *= (1 + achBonus.xpGain);
        if (achBonus.regen > 0) this.player.statBonuses.hpRegen += this.player.baseStats.hpRegen * achBonus.regen;

        // Head start levels
        const headStart = Math.floor(this.permBonus('pStartLevel'));
        for (let i = 0; i < headStart; i++) {
            this.player.level++;
            this.player.xpToNext = Math.floor(CONFIG.XP_CURVE_BASE * Math.pow(CONFIG.XP_CURVE_MULT, this.player.level - 1));
        }

        // Extra slots from perma
        this.player.maxSlots += Math.floor(this.permBonus('pExtraSlot'));

        // Refresh HP
        this.player.hp = this.player.maxHp;

        // Start with 5 orbitals (one from stash if selected)
        const startCount = 5;
        if (startingPetal) {
            this.player.addOrbital(startingPetal.type, startingPetal.rarity);
            for (let i = 1; i < startCount; i++) {
                this.player.addOrbital(randomOrbitalType(), rollRarity(this.player.luck));
            }
        } else {
            for (let i = 0; i < startCount; i++) {
                this.player.addOrbital(randomOrbitalType(), rollRarity(this.player.luck));
            }
        }

        this.camera.x = this.player.x;
        this.camera.y = this.player.y;

        this.ui.showHUD();
        this.ui.renderInventory();
        this.saveData.totalRuns++;
    }

    // ─── Events ───
    onLevelUp() {
        this.audio.play('levelup');
        this.camera.addShake(0.15);
        this.particles.ring(this.player.x, this.player.y, 24, '#00ffcc', 50, 0.5, 4);
        this.runStats.level = this.player.level;

        // Show upgrade choices
        this.paused = true;
        const choices = this.upgradeSystem.generateChoices(3);
        this.ui.showLevelUp(choices);
    }

    onLevelUpMinor() {
        // Minor level up (no upgrade choice) - just effects
        this.particles.ring(this.player.x, this.player.y, 12, '#00ffcc', 30, 0.3, 2);
        this.runStats.level = this.player.level;
    }

    onEnemyKill(enemy) {
        // XP
        this.xpGems.push(new XPGem(enemy.x, enemy.y, enemy.xpReward));

        // Loot
        tryDropLoot(this, enemy);

        // Stats
        this.runStats.kills++;
        this.killStreak++;
        this.streakTimer = CONFIG.STREAK_TIMEOUT;
        if (this.killStreak > this.runStats.bestStreak) this.runStats.bestStreak = this.killStreak;

        if (enemy.isBoss) {
            this.runStats.bossKills++;
        }

        // Zone tracking
        const { index: zoneIndex } = getZone(this.player.x, this.player.y);
        if (zoneIndex > this.runStats.bestZone) this.runStats.bestZone = zoneIndex;

        // Splitter
        if (enemy.splitCount > 0 && !enemy.isBoss) {
            for (let i = 0; i < enemy.splitCount; i++) {
                const a = (i / enemy.splitCount) * Math.PI * 2;
                const sx = enemy.x + Math.cos(a) * 30;
                const sy = enemy.y + Math.sin(a) * 30;
                const child = new Enemy(sx, sy, 'blob', this.waveSystem.getWaveScale() * 0.5);
                child.radius = enemy.radius * 0.5;
                child.maxHp = enemy.maxHp * 0.3;
                child.hp = child.maxHp;
                child.xpReward = enemy.xpReward * 0.3;
                child.color = enemy.color;
                this.enemies.push(child);
            }
        }

        // Check achievements
        this.checkAchievements();
    }

    onDeath() {
        this.state = 'dead';
        this.audio.play('death');
        this.camera.addShake(0.8);
        this.particles.burst(this.player.x, this.player.y, 50, '#00bbff', 300, 1, 6);
        this.particles.ring(this.player.x, this.player.y, 30, '#ff4444', 80, 0.8, 4);

        // Snapshot petals NOW before any cleanup — loadout + inventory
        this._deathPetals = [];
        if (this.player) {
            for (const o of this.player.orbitals) {
                this._deathPetals.push({ type: o.type, rarity: o.rarity });
            }
        }
        for (const item of this.inventory) {
            this._deathPetals.push({ type: item.type, rarity: item.rarity });
        }

        // Calculate stardust earned
        const wave = this.waveSystem.wave;
        const stardustEarned = Math.floor(
            wave * CONFIG.STARDUST_PER_WAVE +
            this.player.level * CONFIG.STARDUST_PER_LEVEL +
            this.runStats.bossKills * CONFIG.STARDUST_BOSS_BONUS
        );
        this.runStats.stardustEarned = stardustEarned;
        this.runStats.wave = wave;
        this.runStats.time = this.runTime;

        // Update save data
        this.saveData.stardust += stardustEarned;
        this.saveData.totalStardust += stardustEarned;
        this.saveData.totalKills += this.runStats.kills;
        if (wave > this.saveData.bestWave) this.saveData.bestWave = wave;
        if (this.player.level > this.saveData.bestLevel) this.saveData.bestLevel = this.player.level;
        if (this.runStats.kills > this.saveData.bestKills) this.saveData.bestKills = this.runStats.kills;
        this.saveData.totalPlayTime += this.runTime;
        this.saveData.prestiges++;
        this.saveSystem.save(this.saveData);

        // Show death screen (slight delay for effect)
        setTimeout(() => {
            this.ui.showDeath(this.runStats);
        }, 1000);
    }

    checkAchievements() {
        for (const ach of ACHIEVEMENTS) {
            if (this.saveData.achievements.includes(ach.id)) continue;
            if (ach.check(this.runStats)) {
                this.saveData.achievements.push(ach.id);
                this.showToast(`🏆 Achievement: ${ach.name}`, '#ffaa00', true);
                this.audio.play('rare', 0.6);
                // Check for stardust reward
                if (ach.reward.includes('Stardust')) {
                    const amount = parseInt(ach.reward.match(/(\d+)/)[1]);
                    this.saveData.stardust += amount;
                }
                this.saveSystem.save(this.saveData);
            }
        }
    }

    showToast(text, color, isRarity) {
        this.ui.showToast(text, color, isRarity);
    }

    addToInventory(type, rarity) {
        this.inventory.push({ type, rarity, id: this.nextInvId++ });
        if (this.ui) this.ui.renderInventory();
    }

    removeFromInventory(id) {
        const idx = this.inventory.findIndex(item => item.id === id);
        if (idx >= 0) {
            const item = this.inventory.splice(idx, 1)[0];
            if (this.ui) this.ui.renderInventory();
            return item;
        }
        return null;
    }

    // ─── Game Loop ───
    loop(timestamp) {
        const dt = Math.min(0.05, (timestamp - this.lastTime) / 1000);
        this.lastTime = timestamp;

        if (this.state === 'playing' && !this.paused) {
            this.update(dt);
        }
        this.render();

        requestAnimationFrame(this.loop);
    }

    update(dt) {
        const player = this.player;
        this.runTime += dt;
        this.runStats.time = this.runTime;

        // Player
        player.update(dt, this.input);
        this.camera.follow(player.x, player.y);
        this.camera.update(dt);

        // Waves
        this.waveSystem.update(dt);

        // Kill streak timer
        if (this.killStreak > 0) {
            this.streakTimer -= dt;
            if (this.streakTimer <= 0) this.killStreak = 0;
        }

        // Enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            this.enemies[i].update(dt, player, this);
            if (this.enemies[i].dead) this.enemies.splice(i, 1);
        }

        // Projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            this.projectiles[i].update(dt, this);
            if (this.projectiles[i].dead) this.projectiles.splice(i, 1);
        }

        // Hazard zones (boss area denial)
        if (this.hazardZones) {
            for (let i = this.hazardZones.length - 1; i >= 0; i--) {
                const hz = this.hazardZones[i];
                hz.timer -= dt;
                if (hz.timer <= 0) {
                    this.hazardZones.splice(i, 1);
                    continue;
                }
                // Damage player if inside
                if (this.player) {
                    const d = Math.hypot(this.player.x - hz.x, this.player.y - hz.y);
                    if (d < hz.radius + this.player.radius) {
                        this.player.takeDamage(hz.dmg * dt);
                    }
                }
            }
        }

        // XP Gems
        for (let i = this.xpGems.length - 1; i >= 0; i--) {
            this.xpGems[i].update(dt, player, this);
            if (this.xpGems[i].dead) this.xpGems.splice(i, 1);
        }

        // Loot drops
        this.nearestLoot = null; // reset each frame
        for (let i = this.lootDrops.length - 1; i >= 0; i--) {
            this.lootDrops[i].update(dt, player, this);
            if (this.lootDrops[i].dead) this.lootDrops.splice(i, 1);
        }

        // Particles
        this.particles.update(dt);

        // HUD throttle
        this.hudUpdateTimer -= dt;
        if (this.hudUpdateTimer <= 0) {
            this.hudUpdateTimer = 0.1;
            this.ui.updateHUD(player, this.waveSystem, this.runTime);
        }

        // Minimap throttle
        this.minimapTimer -= dt;
        if (this.minimapTimer <= 0) {
            this.minimapTimer = 0.5;
            this.ui.renderMinimap(player, this.enemies);
        }

        // Auto-save
        this.autoSaveTimer -= dt;
        if (this.autoSaveTimer <= 0) {
            this.autoSaveTimer = 30;
            this.saveSystem.save(this.saveData);
        }
    }

    // ─── Rendering ───
    render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (this.state === 'menu') {
            this.renderBackground();
            return;
        }

        if (this.state === 'playing' || this.state === 'dead') {
            this.renderWorld();
            this.renderEntities();
        }
    }

    renderBackground() {
        // Animated background for menu
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Random stars
        const time = Date.now() * 0.001;
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        for (let i = 0; i < 60; i++) {
            const x = ((Math.sin(i * 7.3 + time * 0.1) + 1) / 2) * canvas.width;
            const y = ((Math.cos(i * 13.7 + time * 0.05) + 1) / 2) * canvas.height;
            const s = 1 + Math.sin(i * 3.1 + time) * 0.5;
            ctx.fillRect(x, y, s, s);
        }
    }

    renderWorld() {
        const cam = this.camera;
        const player = this.player;
        if (!player) return;

        // Background
        const { zone } = getZone(player.x, player.y);
        ctx.fillStyle = zone.bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Grid
        const gridSize = CONFIG.TILE_SIZE;
        const startX = Math.floor(cam.worldX(0) / gridSize) * gridSize;
        const startY = Math.floor(cam.worldY(0) / gridSize) * gridSize;
        const endX = cam.worldX(canvas.width) + gridSize;
        const endY = cam.worldY(canvas.height) + gridSize;

        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = startX; x < endX; x += gridSize) {
            const sx = cam.screenX(x);
            ctx.moveTo(sx, 0); ctx.lineTo(sx, canvas.height);
        }
        for (let y = startY; y < endY; y += gridSize) {
            const sy = cam.screenY(y);
            ctx.moveTo(0, sy); ctx.lineTo(canvas.width, sy);
        }
        ctx.stroke();

        // Zone boundary indicators
        const cx = CONFIG.WORLD_SIZE / 2;
        const cy = CONFIG.WORLD_SIZE / 2;
        for (const z of ZONES) {
            if (z.maxDist > 15000) continue;
            const screenCx = cam.screenX(cx);
            const screenCy = cam.screenY(cy);
            const r = z.maxDist;
            // Only draw if visible
            const playerDist = Math.hypot(player.x - cx, player.y - cy);
            if (Math.abs(playerDist - z.maxDist) < 800) {
                ctx.globalAlpha = 0.08;
                ctx.strokeStyle = z.color;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(screenCx, screenCy, r, 0, Math.PI * 2);
                ctx.stroke();
                ctx.globalAlpha = 1;
            }
        }

        // World boundaries
        const bx1 = cam.screenX(0), by1 = cam.screenY(0);
        const bx2 = cam.screenX(CONFIG.WORLD_SIZE), by2 = cam.screenY(CONFIG.WORLD_SIZE);
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
        ctx.lineWidth = 3;
        ctx.strokeRect(bx1, by1, bx2 - bx1, by2 - by1);
    }

    renderEntities() {
        const cam = this.camera;

        // XP gems (below everything)
        for (const gem of this.xpGems) {
            if (cam.isVisible(gem.x, gem.y)) gem.draw(ctx, cam);
        }

        // Loot drops
        for (const loot of this.lootDrops) {
            if (cam.isVisible(loot.x, loot.y)) loot.draw(ctx, cam);
        }

        // Enemies
        for (const e of this.enemies) {
            if (cam.isVisible(e.x, e.y, e.radius + 30)) e.draw(ctx, cam);
        }

        // Hazard zones (draw under projectiles)
        if (this.hazardZones) {
            for (const hz of this.hazardZones) {
                if (!cam.isVisible(hz.x, hz.y, hz.radius)) continue;
                const hsx = cam.screenX(hz.x);
                const hsy = cam.screenY(hz.y);
                const alpha = 0.2 + 0.1 * Math.sin(Date.now() * 0.004);
                const fadeAlpha = Math.min(1, hz.timer / 0.5); // fade out in last 0.5s
                ctx.save();
                ctx.globalAlpha = alpha * fadeAlpha;
                ctx.fillStyle = hz.color || '#ff4400';
                ctx.beginPath();
                ctx.arc(hsx, hsy, hz.radius * cam.zoom, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 0.4 * fadeAlpha;
                ctx.strokeStyle = hz.color || '#ff4400';
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.restore();
            }
        }

        // Projectiles
        for (const p of this.projectiles) {
            if (cam.isVisible(p.x, p.y)) p.draw(ctx, cam);
        }

        // Player
        if (this.player) {
            this.player.draw(ctx, cam);
        }

        // Particles (on top)
        this.particles.draw(ctx, cam);
    }
}

// ─── Bootstrap ───
window.addEventListener('load', () => {
    window.game = new Game();
});

// Prevent context menu on right-click
window.addEventListener('contextmenu', e => e.preventDefault());

// Handle page visibility
document.addEventListener('visibilitychange', () => {
    if (document.hidden && window.game && window.game.state === 'playing') {
        // Could pause here if desired
    }
});
