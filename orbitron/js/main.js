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

        this.state = 'menu'; // menu, playing, paused, dead, pvp
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

        // PVP
        this.pvpMode = false;
        this.player2 = null;
        this.pvpTime = 0;
        this.pvpArenaSize = 1600;

        // Mod
        this.modEnabled = false;
        this.godMode = false;

        this.lastTime = 0;
        this.hudUpdateTimer = 0;
        this.minimapTimer = 0;
        this.autoSaveTimer = 0;

        this.ui.showScreen('mainMenu');
        this.loop = this.loop.bind(this);
        requestAnimationFrame(this.loop);
    }

    // ─── Mod Actions ───
    modSetWave(targetWave) {
        if (!this.modEnabled || this.state !== 'playing' || !this.waveSystem) return;
        targetWave = Math.max(1, Math.min(999, parseInt(targetWave) || 1));
        this.waveSystem.wave = targetWave - 1;
        this.waveSystem.timer = 0.1;
        this.waveSystem.betweenWaves = true;
        this.waveSystem.waveActive = false;
        this.enemies = [];
        this.showToast(`⚙️ Skipped to wave ${targetWave}`, '#4ade80', false);
    }

    modSetHP(hp) {
        if (!this.modEnabled || !this.player) return;
        hp = Math.max(1, parseInt(hp) || 1);
        this.player.baseStats.maxHp = hp;
        this.player.hp = hp;
        this.showToast(`⚙️ HP set to ${hp}`, '#4ade80', false);
    }

    modSetRegen(regen) {
        if (!this.modEnabled || !this.player) return;
        regen = Math.max(0, parseFloat(regen) || 0);
        this.player.baseStats.hpRegen = regen;
        this.showToast(`⚙️ Regen set to ${regen.toFixed(1)}/s`, '#4ade80', false);
    }

    modSetSpeed(mult) {
        if (!this.modEnabled || !this.player) return;
        mult = Math.max(0.1, Math.min(10, parseFloat(mult) || 1));
        this.player.statBonuses.speed = mult;
        this.showToast(`⚙️ Speed ×${mult.toFixed(1)}`, '#4ade80', false);
    }

    modToggleGodMode() {
        if (!this.modEnabled) return;
        this.godMode = !this.godMode;
        this.showToast(`⚙️ God mode ${this.godMode ? 'ON' : 'OFF'}`, this.godMode ? '#4ade80' : '#ff4444', false);
    }

    modKillAll() {
        if (!this.modEnabled || this.state !== 'playing') return;
        const count = this.enemies.length;
        for (const e of this.enemies) {
            e.hp = 0;
            e.dead = true;
            this.xpGems.push(new XPGem(e.x, e.y, e.xpReward));
        }
        this.enemies = [];
        this.showToast(`⚙️ Killed ${count} enemies`, '#4ade80', false);
    }

    modAddPetal(type, rarity) {
        if (!this.modEnabled || !this.player) return;
        if (this.player.orbitals.length < this.player.maxSlots) {
            this.player.addOrbital(type, rarity);
        } else {
            this.addToInventory(type, rarity);
        }
        this.showToast(`⚙️ Added ${RARITIES[rarity].name} ${ORBITAL_TYPES[type].name}`, RARITIES[rarity].color, false);
    }

    modGiveStardust(amount) {
        if (!this.modEnabled) return;
        amount = Math.max(0, parseInt(amount) || 0);
        this.saveData.stardust += amount;
        this.saveData.totalStardust += amount;
        this.saveSystem.save(this.saveData);
        this.showToast(`⚙️ +${amount} Stardust`, '#ffaa00', false);
    }

    modSetDamage(mult) {
        if (!this.modEnabled || !this.player) return;
        mult = Math.max(0.1, Math.min(100, parseFloat(mult) || 1));
        this.player.statBonuses.damage = mult;
        this.showToast(`⚙️ Damage ×${mult.toFixed(1)}`, '#4ade80', false);
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

    // ─── PVP Mode ───
    startPVP() {
        this.audio.resume();
        this.state = 'pvp';
        this.pvpMode = true;
        this.paused = false;
        this.enemies = [];
        this.projectiles = [];
        this.xpGems = [];
        this.lootDrops = [];
        this.hazardZones = [];
        this.inventory = [];
        this.pvpTime = 0;

        const arena = this.pvpArenaSize;
        const cx = CONFIG.WORLD_SIZE / 2;
        const cy = CONFIG.WORLD_SIZE / 2;

        // Player 1 (WASD, left side)
        this.player = new Player(this, 1);
        this.player.x = cx - arena * 0.3;
        this.player.y = cy;

        // Player 2 (Arrows, right side)
        this.player2 = new Player(this, 2);
        this.player2.x = cx + arena * 0.3;
        this.player2.y = cy;

        // Scale HP based on best rarity in stash
        const stash = this.saveData.permInventory || [];
        let bestRarityIdx = 0;
        for (const item of stash) {
            const ri = RARITY_ORDER.indexOf(item.rarity);
            if (ri > bestRarityIdx) bestRarityIdx = ri;
        }
        const hpMult = 1 + bestRarityIdx * 0.5;
        const pvpHp = 200 * hpMult;

        // P1 gets stash petals (up to 5 best)
        this.player.baseStats.maxHp = pvpHp;
        this.player.hp = pvpHp;
        this.player.baseStats.hpRegen = pvpHp / 100;

        const sortedStash = [...stash].sort((a, b) => RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity));
        const p1Petals = sortedStash.slice(0, 5);
        if (p1Petals.length > 0) {
            for (const p of p1Petals) this.player.addOrbital(p.type, p.rarity);
        } else {
            for (let i = 0; i < 5; i++) this.player.addOrbital(randomOrbitalType(), 'common');
        }

        // P2 gets same stats but mirrored petals (same stash)
        this.player2.baseStats.maxHp = pvpHp;
        this.player2.hp = pvpHp;
        this.player2.baseStats.hpRegen = pvpHp / 100;

        if (p1Petals.length > 0) {
            for (const p of p1Petals) this.player2.addOrbital(p.type, p.rarity);
        } else {
            for (let i = 0; i < 5; i++) this.player2.addOrbital(randomOrbitalType(), 'common');
        }

        this.camera.x = cx;
        this.camera.y = cy;

        this.ui.hideAllScreens();
        this.ui.showPVPHud();
    }

    endPVP() {
        this.pvpMode = false;
        this.state = 'menu';
        this.player = null;
        this.player2 = null;
        this.enemies = [];
        this.projectiles = [];
    }

    updatePVP(dt) {
        if (!this.player || !this.player2) return;
        this.pvpTime += dt;

        const arena = this.pvpArenaSize;
        const cx = CONFIG.WORLD_SIZE / 2;
        const cy = CONFIG.WORLD_SIZE / 2;
        const halfArena = arena / 2;

        // Update both players
        this.player.update(dt, this.input);
        this.player2.update(dt, this.input);

        // Clamp both to PVP arena
        this.player.x = Math.max(cx - halfArena + this.player.radius, Math.min(cx + halfArena - this.player.radius, this.player.x));
        this.player.y = Math.max(cy - halfArena + this.player.radius, Math.min(cy + halfArena - this.player.radius, this.player.y));
        this.player2.x = Math.max(cx - halfArena + this.player2.radius, Math.min(cx + halfArena - this.player2.radius, this.player2.x));
        this.player2.y = Math.max(cy - halfArena + this.player2.radius, Math.min(cy + halfArena - this.player2.radius, this.player2.y));

        // PVP collision: P1 orbitals damage P2
        for (const o of this.player.orbitals) {
            if (o.dead || o.reloading) continue;
            const opos = o.getWorldPos(this.player);
            const dist = Math.hypot(opos.x - this.player2.x, opos.y - this.player2.y);
            if (dist < this.player2.radius + 10) {
                const dmg = o.getDamage(this.player.damage);
                this.player2.takeDamage(dmg * 0.3); // reduced PVP damage
                o.takePetalDamage(dmg * 0.1, this);
            }
        }

        // PVP collision: P2 orbitals damage P1
        for (const o of this.player2.orbitals) {
            if (o.dead || o.reloading) continue;
            const opos = o.getWorldPos(this.player2);
            const dist = Math.hypot(opos.x - this.player.x, opos.y - this.player.y);
            if (dist < this.player.radius + 10) {
                const dmg = o.getDamage(this.player2.damage);
                this.player.takeDamage(dmg * 0.3); // reduced PVP damage
                o.takePetalDamage(dmg * 0.1, this);
            }
        }

        // Projectile collision with opposing player
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.update(dt, this);
            if (p.dead) { this.projectiles.splice(i, 1); continue; }
            // Check if proj belongs to P1 (hitting P2) or P2 (hitting P1)
            if (p.team === 'player') {
                // Could be from either player — check distance to both
                const d2 = Math.hypot(p.x - this.player2.x, p.y - this.player2.y);
                if (d2 < this.player2.radius + p.size) {
                    this.player2.takeDamage(p.damage * 0.3);
                    p.dead = true;
                }
                const d1 = Math.hypot(p.x - this.player.x, p.y - this.player.y);
                if (d1 < this.player.radius + p.size) {
                    this.player.takeDamage(p.damage * 0.3);
                    p.dead = true;
                }
            }
            if (p.dead) this.projectiles.splice(i, 1);
        }

        // Update camera to midpoint
        const midX = (this.player.x + this.player2.x) / 2;
        const midY = (this.player.y + this.player2.y) / 2;
        this.camera.follow(midX, midY);
        this.camera.update(dt);

        // Particles
        this.particles.update(dt);

        // Update PVP HUD
        this.ui.updatePVPHud(this.player, this.player2);

        // Check for win
        if (this.player.hp <= 0 && this.state === 'pvp') {
            this.state = 'pvp_over';
            this.camera.addShake(0.6);
            this.particles.burst(this.player.x, this.player.y, 40, '#00ccff', 250, 1, 5);
            setTimeout(() => {
                this.ui.showPVPVictory(2, { time: this.pvpTime });
            }, 800);
        }
        if (this.player2.hp <= 0 && this.state === 'pvp') {
            this.state = 'pvp_over';
            this.camera.addShake(0.6);
            this.particles.burst(this.player2.x, this.player2.y, 40, '#ff4444', 250, 1, 5);
            setTimeout(() => {
                this.ui.showPVPVictory(1, { time: this.pvpTime });
            }, 800);
        }
    }

    // ─── Events ───
    onLevelUp() {
        this.audio.play('levelup');
        this.camera.addShake(0.15);
        this.particles.ring(this.player.x, this.player.y, 24, '#00ffcc', 50, 0.5, 4);
        this.runStats.level = this.player.level;

        // Show upgrade choices (side panel, no pause)
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
        if (this.state === 'pvp') {
            this.updatePVP(dt);
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

        if (this.state === 'pvp' || this.state === 'pvp_over') {
            this.renderPVPArena();
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

    renderPVPArena() {
        const cam = this.camera;
        const cx = CONFIG.WORLD_SIZE / 2;
        const cy = CONFIG.WORLD_SIZE / 2;
        const halfArena = this.pvpArenaSize / 2;

        // Background
        ctx.fillStyle = '#080818';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Arena grid
        const gridSize = 60;
        const startX = Math.floor((cx - halfArena) / gridSize) * gridSize;
        const startY = Math.floor((cy - halfArena) / gridSize) * gridSize;
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = startX; x < cx + halfArena; x += gridSize) {
            ctx.moveTo(cam.screenX(x), cam.screenY(cy - halfArena));
            ctx.lineTo(cam.screenX(x), cam.screenY(cy + halfArena));
        }
        for (let y = startY; y < cy + halfArena; y += gridSize) {
            ctx.moveTo(cam.screenX(cx - halfArena), cam.screenY(y));
            ctx.lineTo(cam.screenX(cx + halfArena), cam.screenY(y));
        }
        ctx.stroke();

        // Arena border
        const bx = cam.screenX(cx - halfArena);
        const by = cam.screenY(cy - halfArena);
        const bw = this.pvpArenaSize;
        const bh = this.pvpArenaSize;
        ctx.strokeStyle = 'rgba(255,100,100,0.25)';
        ctx.lineWidth = 2;
        ctx.strokeRect(bx, by, bw, bh);

        // Center line
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.moveTo(cam.screenX(cx), cam.screenY(cy - halfArena));
        ctx.lineTo(cam.screenX(cx), cam.screenY(cy + halfArena));
        ctx.stroke();
        ctx.setLineDash([]);

        // Projectiles
        for (const p of this.projectiles) {
            if (cam.isVisible(p.x, p.y)) p.draw(ctx, cam);
        }

        // Draw both players
        if (this.player) this.player.draw(ctx, cam);
        if (this.player2) this.player2.draw(ctx, cam);

        // Particles
        this.particles.draw(ctx, cam);
    }
}

// ─── Bootstrap ───
window.addEventListener('load', () => {
    window.game = new Game();
    // Initialize ads
    if (window.OrbitronAds) window.OrbitronAds.init();
});

// Prevent context menu on right-click
window.addEventListener('contextmenu', e => e.preventDefault());

// Handle page visibility
document.addEventListener('visibilitychange', () => {
    if (document.hidden && window.game && window.game.state === 'playing') {
        // Could pause here if desired
    }
});
