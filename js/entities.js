// ═══════════════════════════════════════════════════════
// ORBITRON — Entities (Player, Enemy, Orbital, Projectile, XPGem)
// ═══════════════════════════════════════════════════════

// ─── Player ───
class Player {
    constructor(game, controlScheme = 0) {
        this.game = game;
        this.controlScheme = controlScheme; // 0 = normal, 1 = WASD only (PVP P1), 2 = Arrows only (PVP P2)
        this.x = CONFIG.WORLD_SIZE / 2;
        this.y = CONFIG.WORLD_SIZE / 2;
        this.radius = CONFIG.BASE_PLAYER_RADIUS;
        this.baseStats = {
            maxHp: CONFIG.BASE_PLAYER_HP,
            hpRegen: CONFIG.BASE_HP_REGEN,
            speed: CONFIG.BASE_PLAYER_SPEED,
            damage: 1,       // multiplier
            armor: 0,
            luck: 1,         // multiplier
            xpGain: 1,       // multiplier
            pickupRange: CONFIG.BASE_PICKUP_RANGE,
            orbitalSpeed: CONFIG.BASE_ORBITAL_SPEED,
        };
        this.statBonuses = { maxHp: 0, hpRegen: 0, speed: 1, damage: 1, armor: 0, luck: 1, xpGain: 1, pickupRange: 1, orbitalSpeed: 1 };
        this.hp = CONFIG.BASE_PLAYER_HP;
        this.level = 1;
        this.xp = 0;
        this.xpToNext = CONFIG.XP_CURVE_BASE;
        this.orbitals = [];
        this.maxSlots = 5;
        this.invulnTimer = 0;
        this.damageFlash = 0;
        // Trail
        this.trailTimer = 0;
        // Petal extend/retract (Space = extend, Shift = retract)
        this.orbitDistMult = 1.0;
        this.targetOrbitDistMult = 1.0;
        // Dash
        this.dashCooldown = 0;
        this.dashTimer = 0;
        this.dashDirX = 0;
        this.dashDirY = 0;
    }

    get maxHp() {
        const levelMult = 1 + (this.level - 1) * 0.03; // +3% per level
        return (this.baseStats.maxHp + this.statBonuses.maxHp) * levelMult * (1 + this.game.permBonus('pMaxHp'));
    }
    get hpRegen() {
        // 1/100th of max HP per second, plus perm bonus
        return (this.maxHp / 100) * (1 + this.game.permBonus('pRegen'));
    }
    get speed() {
        return this.baseStats.speed * this.statBonuses.speed * (1 + this.game.permBonus('pSpeed'));
    }
    get damage() {
        return this.baseStats.damage * this.statBonuses.damage * (1 + this.game.permBonus('pDamage'));
    }
    get armor() {
        return this.baseStats.armor + this.statBonuses.armor;
    }
    get luck() {
        return this.baseStats.luck * this.statBonuses.luck * (1 + this.game.permBonus('pLuck'));
    }
    get xpGain() {
        return this.baseStats.xpGain * this.statBonuses.xpGain * (1 + this.game.permBonus('pXpGain'));
    }
    get pickupRange() {
        return this.baseStats.pickupRange * this.statBonuses.pickupRange * (1 + this.game.permBonus('pPickup'));
    }
    get orbitalSpeed() {
        return this.baseStats.orbitalSpeed * this.statBonuses.orbitalSpeed * (1 + this.game.permBonus('pOrbitalSpd'));
    }

    getShieldBlock() {
        let block = 0;
        for (const o of this.orbitals) {
            if (ORBITAL_TYPES[o.type].type === 'shield') {
                block += ORBITAL_TYPES[o.type].blockAmount * RARITIES[o.rarity].mult * (1 + (o.level - 1) * 0.15);
            }
        }
        return Math.min(block, 0.75); // cap at 75% block
    }

    applyStat(stat, amount, pct) {
        if (pct) {
            this.statBonuses[stat] *= (1 + amount);
        } else {
            this.statBonuses[stat] += amount;
        }
        // Heal proportionally when maxHp changes
        if (stat === 'maxHp') {
            this.hp = Math.min(this.hp + amount, this.maxHp);
        }
    }

    addXp(amount) {
        this.xp += amount * this.xpGain;
        while (this.xp >= this.xpToNext) {
            this.xp -= this.xpToNext;
            this.level++;
            this.xpToNext = Math.floor(CONFIG.XP_CURVE_BASE * Math.pow(CONFIG.XP_CURVE_MULT, this.level - 1));
            this.hp = this.maxHp; // full heal on level up
            // Upgrade choice every 5 levels
            if (this.level % 5 === 0) {
                this.game.onLevelUp();
            } else {
                this.game.onLevelUpMinor();
            }
        }
    }

    takeDamage(dmg) {
        // God mode check
        if (this.game.godMode && this.controlScheme !== 2) return;
        // Apply armor
        dmg = Math.max(1, dmg - this.armor);
        // Apply shield
        dmg *= (1 - this.getShieldBlock());
        this.hp -= dmg;
        this.damageFlash = 0.15;
        this.game.audio.play('hit');
        this.game.particles.burst(this.x, this.y, 6, '#ff4444', 100, 0.3, 3);
        this.game.particles.damageNumber(this.x, this.y, dmg, '#ff6666');
        if (this.hp <= 0) {
            this.hp = 0;
            if (!this.game.pvpMode) {
                this.game.onDeath();
            }
        }
    }

    addOrbital(type, rarity) {
        if (this.orbitals.length >= this.maxSlots) return false;
        this.orbitals.push(new Orbital(type, rarity, this.orbitals.length));
        const ri = RARITY_ORDER.indexOf(rarity);
        if (ri >= 4) { // legendary+
            this.game.audio.play('rare', 0.7);
        }
        return true;
    }

    removeOrbital(index) {
        if (index >= 0 && index < this.orbitals.length) {
            const removed = this.orbitals.splice(index, 1)[0];
            // Re-index remaining orbitals
            this.orbitals.forEach((o, i) => o.index = i);
            return removed;
        }
        return null;
    }

    upgradeOrbital(index) {
        if (index >= 0 && index < this.orbitals.length) {
            this.orbitals[index].level = Math.min(this.orbitals[index].level + 1, 10);
        }
    }

    update(dt, input) {
        // Movement - control scheme determines keys
        let move, wantExtend, wantRetract, wantDash;
        if (this.controlScheme === 2) {
            move = input.getMoveDirArrows();
            wantExtend = input.keys['.'] || input.keys['Period'];
            wantRetract = input.keys[','] || input.keys['Comma'];
            wantDash = input.keys['/'] || input.keys['Slash'];
        } else if (this.game.pvpMode) {
            move = input.getMoveDirWASD();
            wantExtend = input.keys[' '] || input.keys['Space'];
            wantRetract = input.keys['shift'] || input.keys['ShiftLeft'] || input.keys['ShiftRight'];
            wantDash = input.keys['q'] || input.keys['KeyQ'];
        } else {
            move = input.getMoveDir();
            wantExtend = input.keys[' '] || input.keys['Space'];
            wantRetract = input.keys['shift'] || input.keys['ShiftLeft'] || input.keys['ShiftRight'];
            wantDash = input.keys['q'] || input.keys['KeyQ'];
        }
        let moveSpeed = this.speed;

        // Petal control
        if (wantExtend) {
            this.targetOrbitDistMult = 2.5;
        } else if (wantRetract) {
            this.targetOrbitDistMult = 0.35;
        } else {
            this.targetOrbitDistMult = 1.0;
        }
        // Smooth lerp orbit distance
        this.orbitDistMult += (this.targetOrbitDistMult - this.orbitDistMult) * 10 * dt;

        // Dash ability
        if (this.dashCooldown > 0) this.dashCooldown -= dt;
        if (wantDash && this.dashCooldown <= 0 && (move.dx !== 0 || move.dy !== 0)) {
            this.dashTimer = 0.075;
            this.dashDirX = move.dx;
            this.dashDirY = move.dy;
            this.dashCooldown = 0.3;
            this.invulnTimer = 0.1;
            this.game.audio.play('shoot', 0.4);
            this.game.particles.burst(this.x, this.y, 8, '#00ffff', 200, 0.3, 4);
        }

        if (this.dashTimer > 0) {
            this.dashTimer -= dt;
            const dashSpeed = this.speed * 4;
            this.x += this.dashDirX * dashSpeed * dt;
            this.y += this.dashDirY * dashSpeed * dt;
            this.game.particles.trail(this.x, this.y, '#00ffff', 5);
        } else {
            this.x += move.dx * moveSpeed * dt;
            this.y += move.dy * moveSpeed * dt;
        }

        // Clamp to world
        this.x = Math.max(this.radius, Math.min(CONFIG.WORLD_SIZE - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(CONFIG.WORLD_SIZE - this.radius, this.y));
        // Regen
        this.hp = Math.min(this.maxHp, this.hp + this.hpRegen * dt);
        // Invuln
        if (this.invulnTimer > 0) this.invulnTimer -= dt;
        if (this.damageFlash > 0) this.damageFlash -= dt;
        // Trail
        this.trailTimer -= dt;
        if (this.trailTimer <= 0 && (move.dx !== 0 || move.dy !== 0)) {
            this.trailTimer = 0.05;
            const skinId = this.game.saveData ? this.game.saveData.activeSkin : 'default';
            const skin = PLAYER_SKINS.find(s => s.id === skinId) || PLAYER_SKINS[0];
            const trailCol = this.controlScheme === 2 ? '#ff4444' : (skin.trailColor === 'prism' ? `hsl(${(Date.now() * 0.15) % 360}, 85%, 60%)` : skin.trailColor);
            this.game.particles.trail(this.x, this.y, trailCol, 3);
        }
        // Update orbitals
        for (const o of this.orbitals) {
            if (o.reloading) {
                o.reloadTimer -= dt;
                if (o.reloadTimer <= 0) {
                    o.respawn();
                }
                continue; // skip normal update while reloading
            }
            o.update(dt, this);
        }
        // Remove only permanently dead orbitals (from discard)
        for (let i = this.orbitals.length - 1; i >= 0; i--) {
            if (this.orbitals[i].dead) {
                this.orbitals.splice(i, 1);
            }
        }
        // Re-index remaining orbitals
        this.orbitals.forEach((o, i) => o.index = i);
    }

    draw(ctx, camera) {
        const sx = camera.screenX(this.x);
        const sy = camera.screenY(this.y);

        // Resolve skin
        const skinId = this.game.saveData ? this.game.saveData.activeSkin : 'default';
        const skin = PLAYER_SKINS.find(s => s.id === skinId) || PLAYER_SKINS[0];
        const isPrism = skin.bodyColor === 'prism';
        const bodyColorBase = isPrism ? `hsl(${(Date.now() * 0.15) % 360}, 85%, 60%)` : skin.bodyColor;
        const glowColorBase = isPrism ? bodyColorBase : skin.glowColor;
        const highlightCol = skin.highlightColor;

        // Override for P2 in PVP
        const isP2 = this.controlScheme === 2;
        const bodyColor = isP2 ? '#ff5555' : (this.invulnTimer > 0 ? '#ffffff' : bodyColorBase);
        const glowColor = isP2 ? '#cc3333' : glowColorBase;

        // Pickup range indicator
        ctx.globalAlpha = 0.05;
        ctx.beginPath(); ctx.arc(sx, sy, this.pickupRange, 0, Math.PI * 2);
        ctx.fillStyle = '#00ffcc'; ctx.fill();
        ctx.globalAlpha = 1;

        // Body glow
        drawGlow(ctx, sx, sy, this.radius + 5, glowColor, 0.4);

        // Body
        const flashAlpha = this.damageFlash > 0 ? 0.5 + Math.sin(Date.now() * 0.05) * 0.5 : 1;
        drawCircle(ctx, sx, sy, this.radius, bodyColor, flashAlpha);

        // Inner highlight
        drawCircle(ctx, sx - 4, sy - 4, this.radius * 0.4, isP2 ? '#ffaaaa' : highlightCol, 0.6);

        // Dash cooldown ring
        if (this.dashCooldown > 0) {
            const pct = 1 - (this.dashCooldown / 0.3);
            ctx.globalAlpha = 0.4;
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(sx, sy, this.radius + 8, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
        } else {
            // Ready indicator
            ctx.globalAlpha = 0.15 + Math.sin(Date.now() * 0.005) * 0.1;
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(sx, sy, this.radius + 8, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        // Draw orbitals
        for (const o of this.orbitals) {
            o.draw(ctx, camera, this);
        }
    }
}

// ─── Orbital ───
class Orbital {
    constructor(type, rarity, index) {
        this.type = type;
        this.rarity = rarity;
        this.level = 1;
        this.index = index;
        this.angle = (index / 8) * Math.PI * 2;
        this.attackTimer = 0;
        this.novaTimer = 0;
        this.animScale = 0;
        this.dead = false;
        this.reloading = false;
        this.reloadTimer = 0;
        this.reloadTime = 0.75; // seconds to respawn
        // HP system - rarity determines max HP
        const basePetalHp = 10;
        this.maxHp = Math.floor(basePetalHp * RARITIES[rarity].mult * (1 + (this.level - 1) * 0.3));
        this.hp = this.maxHp;
        this.hitFlash = 0;
    }

    get config() { return ORBITAL_TYPES[this.type]; }
    get rarityData() { return RARITIES[this.rarity]; }

    getDamage(playerDmg) {
        return this.config.baseDmg * this.rarityData.mult * (1 + (this.level - 1) * 0.2) * playerDmg;
    }

    takePetalDamage(amount, game) {
        this.hp -= amount;
        this.hitFlash = 0.1;
        if (this.hp <= 0) {
            // Start reloading instead of permanent death
            this.reloading = true;
            this.reloadTimer = this.reloadTime;
            this.hp = 0;
            // Death particles
            const pos = this.lastPos || { x: 0, y: 0 };
            game.particles.burst(pos.x, pos.y, 8, this.rarityData.color, 80, 0.3, 3);
        }
    }

    respawn() {
        this.reloading = false;
        this.reloadTimer = 0;
        this.hp = this.maxHp;
        this.animScale = 0; // plays pop-in animation
        this.attackTimer = 0.5; // brief grace period
    }

    getOrbitDist(player) {
        return (this.config.orbitDist + player.radius) * (player.orbitDistMult || 1.0);
    }

    getWorldPos(player) {
        const dist = this.getOrbitDist(player);
        return {
            x: player.x + Math.cos(this.angle) * dist,
            y: player.y + Math.sin(this.angle) * dist,
        };
    }

    update(dt, player) {
        // Orbit - evenly space orbitals
        const totalOrbitals = player.orbitals.length;
        const idx = player.orbitals.indexOf(this);
        const baseAngleOffset = (idx / Math.max(totalOrbitals, 1)) * Math.PI * 2;
        this.angle = baseAngleOffset + player.orbitalSpeed * (Date.now() / 1000);
        this.attackTimer -= dt;
        this.animScale = Math.min(1, this.animScale + dt * 4);

        const cfg = this.config;
        const pos = this.getWorldPos(player);
        const game = player.game;

        // Track position for death particles
        this.lastPos = { x: pos.x, y: pos.y };
        if (this.hitFlash > 0) this.hitFlash -= dt;

        // Melee damage (blade, frost, leech, fire) - petals take damage on contact!
        if (cfg.type === 'melee' || cfg.type === 'shield') {
            for (const e of game.enemies) {
                const dist = Math.hypot(e.x - pos.x, e.y - pos.y);
                if (dist < cfg.range) {
                    if (this.attackTimer <= 0) {
                        const dmg = this.getDamage(player.damage);
                        e.takeDamage(dmg, game);
                        this.attackTimer = 0.3; // contact dps tick
                        // Petal takes damage from enemy on contact
                        this.takePetalDamage(e.damage * 0.15, game);
                        // Frost slow
                        if (cfg.slow) e.slowTimer = Math.max(e.slowTimer || 0, 1.5);
                        // Leech
                        if (cfg.lifeSteal) player.hp = Math.min(player.maxHp, player.hp + dmg * cfg.lifeSteal);
                        // Fire
                        if (cfg.burnDmg) { e.burnTimer = cfg.burnDuration; e.burnDmg = cfg.burnDmg * this.rarityData.mult; }
                        break;
                    }
                }
            }
        }

        // Ranged (shooter)
        if (cfg.type === 'ranged' && this.attackTimer <= 0) {
            let nearest = null, nearDist = cfg.range;
            if (game.pvpMode) {
                // In PVP, target the opposing player
                const target = player.controlScheme === 1 ? game.player2 : game.player;
                if (target && target.hp > 0) {
                    const d = Math.hypot(target.x - pos.x, target.y - pos.y);
                    if (d < cfg.range) { nearest = target; nearDist = d; }
                }
            } else {
                for (const e of game.enemies) {
                    const d = Math.hypot(e.x - pos.x, e.y - pos.y);
                    if (d < nearDist) { nearDist = d; nearest = e; }
                }
            }
            if (nearest) {
                const angle = Math.atan2(nearest.y - pos.y, nearest.x - pos.x);
                game.projectiles.push(new Projectile(
                    pos.x, pos.y, angle, cfg.projSpeed, this.getDamage(player.damage),
                    cfg.projSize * (1 + (this.level - 1) * 0.1), this.rarityData.color, 'player', cfg.range * 1.5
                ));
                this.attackTimer = cfg.attackSpeed / (1 + (this.level - 1) * 0.1);
                game.audio.play('shoot', 0.2);
            }
        }

        // AoE (nova)
        if (cfg.type === 'aoe') {
            this.novaTimer += dt;
            const interval = cfg.attackSpeed / (1 + (this.level - 1) * 0.1);
            if (this.novaTimer >= interval) {
                this.novaTimer = 0;
                const range = cfg.range * (1 + (this.level - 1) * 0.08);
                const dmg = this.getDamage(player.damage);
                for (const e of game.enemies) {
                    if (Math.hypot(e.x - pos.x, e.y - pos.y) < range) {
                        e.takeDamage(dmg, game);
                    }
                }
                game.particles.ring(pos.x, pos.y, 16, this.rarityData.color, range, 0.4, 3);
                game.audio.play('nova', 0.3);
            }
        }

        // Laser beam
        if (cfg.type === 'laser') {
            this.attackTimer -= dt;
            if (this.attackTimer <= 0) {
                this.attackTimer = cfg.attackSpeed / (1 + (this.level - 1) * 0.1);
                const dmg = this.getDamage(player.damage) * 0.05;
                const range = cfg.range * (1 + (this.level - 1) * 0.05);
                // Find nearest enemy to aim at
                let nearest = null, nearDist = range;
                for (const e of game.enemies) {
                    const d = Math.hypot(e.x - pos.x, e.y - pos.y);
                    if (d < nearDist) { nearDist = d; nearest = e; }
                }
                if (nearest) {
                    const angle = Math.atan2(nearest.y - pos.y, nearest.x - pos.x);
                    this._laserAngle = angle;
                    this._laserActive = 0.08;
                    // Pierce through all enemies in the line
                    const beamW = (cfg.beamWidth || 4) * (1 + (this.level - 1) * 0.1);
                    for (const e of game.enemies) {
                        if (e.dead) continue;
                        // Point-to-line distance check
                        const ex = e.x - pos.x, ey = e.y - pos.y;
                        const proj = ex * Math.cos(angle) + ey * Math.sin(angle);
                        if (proj < 0 || proj > range) continue;
                        const perpDist = Math.abs(ex * Math.sin(angle) - ey * Math.cos(angle));
                        if (perpDist < e.radius + beamW) {
                            e.takeDamage(dmg, game);
                        }
                    }
                }
            }
            if (this._laserActive > 0) this._laserActive -= dt;
        }

        // Chain lightning
        if (cfg.type === 'chain' && this.attackTimer <= 0) {
            let nearest = null, nearDist = cfg.range;
            for (const e of game.enemies) {
                const d = Math.hypot(e.x - pos.x, e.y - pos.y);
                if (d < nearDist) { nearDist = d; nearest = e; }
            }
            if (nearest) {
                const dmg = this.getDamage(player.damage) * 0.2;
                const bounces = cfg.bounces + Math.floor(this.level / 3);
                let current = nearest;
                let hits = new Set();
                hits.add(current);
                current.takeDamage(dmg, game);
                let prev = pos;

                for (let b = 0; b < bounces && current; b++) {
                    game.particles.add(new Particle(
                        (prev.x + current.x) / 2, (prev.y + current.y) / 2,
                        0, 0, 0.2, 2, '#ffff44', 0.8
                    ));
                    prev = { x: current.x, y: current.y };
                    let next = null, nd = cfg.bounceRange;
                    for (const e of game.enemies) {
                        if (hits.has(e)) continue;
                        const d = Math.hypot(e.x - current.x, e.y - current.y);
                        if (d < nd) { nd = d; next = e; }
                    }
                    current = next;
                    if (current) {
                        hits.add(current);
                        current.takeDamage(dmg * 0.3, game);
                    }
                }
                this.attackTimer = cfg.attackSpeed / (1 + (this.level - 1) * 0.1);
                game.audio.play('shoot', 0.3);
            }
        }
    }

    draw(ctx, camera, player) {
        const pos = this.getWorldPos(player);
        const sx = camera.screenX(pos.x);
        const sy = camera.screenY(pos.y);
        const r = 8 * this.animScale * (1 + (this.level - 1) * 0.08);
        const cfg = this.config;
        const rarity = this.rarityData;

        // If reloading, show ghost outline with reload ring
        if (this.reloading) {
            const pct = 1 - (this.reloadTimer / this.reloadTime);
            // Ghost circle
            ctx.globalAlpha = 0.15;
            drawCircle(ctx, sx, sy, 8, rarity.color);
            ctx.globalAlpha = 1;
            // Reload ring
            ctx.strokeStyle = rarity.color;
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            ctx.arc(sx, sy, 10, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
            return;
        }

        // Orbit trail
        const trailAlpha = 0.1;
        ctx.globalAlpha = trailAlpha;
        ctx.strokeStyle = rarity.color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(camera.screenX(player.x), camera.screenY(player.y), this.getOrbitDist(player), 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Glow
        const flashActive = this.hitFlash > 0;
        if (rarity.rainbow) {
            const hue = (Date.now() * 0.2 + this.index * 60) % 360;
            drawGlow(ctx, sx, sy, r + 4, `hsl(${hue}, 100%, 60%)`, 0.7);
            drawCircle(ctx, sx, sy, r, flashActive ? '#ffffff' : `hsl(${hue}, 100%, 60%)`);
        } else {
            drawGlow(ctx, sx, sy, r + 3, rarity.glow, 0.5);
            drawCircle(ctx, sx, sy, r, flashActive ? '#ffffff' : rarity.color);
        }

        // HP bar under petal
        if (this.hp < this.maxHp) {
            const barW = r * 2.5;
            const barH = 2;
            const barX = sx - barW / 2;
            const barY = sy + r + 4;
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(barX, barY, barW, barH);
            const hpPct = Math.max(0, this.hp / this.maxHp);
            ctx.fillStyle = hpPct > 0.3 ? rarity.color : '#ff4444';
            ctx.fillRect(barX, barY, barW * hpPct, barH);
        }

        // Level indicator
        if (this.level > 1) {
            ctx.font = 'bold 8px system-ui';
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.fillText(this.level.toString(), sx, sy + 3);
        }

        // Nova charge indicator
        if (cfg.type === 'aoe') {
            const interval = cfg.attackSpeed / (1 + (this.level - 1) * 0.1);
            const pct = this.novaTimer / interval;
            ctx.globalAlpha = 0.3;
            ctx.strokeStyle = rarity.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(sx, sy, r + 6, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        // Laser beam visual
        if (cfg.type === 'laser' && this._laserActive > 0 && this._laserAngle !== undefined) {
            const range = cfg.range * (1 + (this.level - 1) * 0.05);
            const beamW = (cfg.beamWidth || 4) * (1 + (this.level - 1) * 0.1);
            const endX = pos.x + Math.cos(this._laserAngle) * range;
            const endY = pos.y + Math.sin(this._laserAngle) * range;
            const esx = camera.screenX(endX);
            const esy = camera.screenY(endY);

            // Outer glow
            ctx.save();
            ctx.globalAlpha = 0.3 * (this._laserActive / 0.08);
            ctx.strokeStyle = rarity.color;
            ctx.lineWidth = beamW * 4;
            ctx.shadowBlur = 20;
            ctx.shadowColor = rarity.color;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(esx, esy);
            ctx.stroke();

            // Core beam
            ctx.globalAlpha = 0.8 * (this._laserActive / 0.08);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = beamW;
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(esx, esy);
            ctx.stroke();
            ctx.restore();
        }
    }
}

// ─── Enemy ───
class Enemy {
    constructor(x, y, typeKey, waveScale = 1, isBoss = false, bossData = null) {
        this.x = x; this.y = y;
        this.typeKey = typeKey;
        this.isBoss = isBoss;

        const base = isBoss ? bossData : ENEMY_TYPES[typeKey];
        this.name = base.name;
        this.radius = base.radius * (isBoss ? 1 : 1);
        this.maxHp = base.hp * waveScale * (isBoss ? 1 : 1);
        this.hp = this.maxHp;
        this.damage = base.damage * waveScale * 0.4;
        this.baseSpeed = base.speed;
        this.speed = base.speed;
        this.xpReward = base.xp * waveScale;
        this.color = base.color;
        this.shape = base.shape || 'circle';
        this.contactTimer = 0;

        // Special behaviors
        this.dashTimer = base.dashInterval || 0;
        this.dashInterval = base.dashInterval || 0;
        this.dashSpeed = base.dashSpeed || 0;
        this.isDashing = false;

        this.shootTimer = base.shootInterval || 0;
        this.shootInterval = base.shootInterval || 0;
        this.shootRange = base.shootRange || 0;
        this.projSpeed = base.projSpeed || 0;

        this.splitCount = base.splitCount || 0;
        this.spawnCount = base.spawnCount || 0;

        // Spawner behavior
        this.spawnerInterval = base.spawnerInterval || 0;
        this.spawnerTimer = base.spawnerInterval || 0;
        this.spawnerType = base.spawnerType || 'blob';
        this.spawnerCount = base.spawnerCount || 0;

        this.healTimer = base.healInterval || 0;
        this.healInterval = base.healInterval || 0;
        this.healRange = base.healRange || 0;
        this.healAmount = base.healAmount || 0;

        this.phaseInterval = base.phaseInterval || 0;
        this.phaseTimer = base.phaseInterval || 0;
        this.isPhased = false;

        // Boss-specific abilities
        this.spiralShot = base.spiralShot || false;
        this.spiralInterval = base.spiralInterval || 3;
        this.spiralTimer = this.spiralInterval;
        this.spiralCount = base.spiralCount || 8;
        this.spiralSpeed = base.spiralSpeed || 200;
        this.spiralAngle = 0;

        this.burstShot = base.burstShot || false;
        this.burstInterval = base.burstInterval || 5;
        this.burstTimer = this.burstInterval;
        this.burstCount = base.burstCount || 12;
        this.burstSpeed = base.burstSpeed || 250;

        this.teleport = base.teleport || false;
        this.teleportInterval = base.teleportInterval || 6;
        this.teleportTimer = this.teleportInterval;
        this.teleportRange = base.teleportRange || 300;

        this.shieldPhase = base.shieldPhase || false;
        this.shieldInterval = base.shieldInterval || 10;
        this.shieldTimer = this.shieldInterval;
        this.shieldDuration = base.shieldDuration || 3;
        this.shielded = false;
        this.shieldActiveTimer = 0;

        this.areaDenial = base.areaDenial || false;
        this.areaInterval = base.areaInterval || 4;
        this.areaTimer = this.areaInterval;
        this.areaCount = base.areaCount || 5;
        this.areaRadius = base.areaRadius || 40;
        this.areaDuration = base.areaDuration || 3;
        this.areaDmg = base.areaDmg || 8;

        // Status effects
        this.slowTimer = 0;
        this.burnTimer = 0;
        this.burnDmg = 0;

        this.hitFlash = 0;
        this.dead = false;
    }

    takeDamage(dmg, game) {
        if (this.isPhased) return;
        if (this.shielded) {
            dmg *= 0.15; // Shield absorbs 85% damage
            game.particles.burst(this.x, this.y, 3, '#88ccff', 60, 0.2, 2);
        }
        this.hp -= dmg;
        this.hitFlash = 0.1;
        game.particles.damageNumber(this.x, this.y - this.radius, dmg, '#ffcc44');
        if (this.hp <= 0) {
            this.die(game);
        }
    }

    die(game) {
        this.dead = true;
        game.onEnemyKill(this);
        // Particles
        game.particles.burst(this.x, this.y, 10 + (this.isBoss ? 30 : 0), this.color, 200, 0.5, this.radius * 0.3);
        game.audio.play('kill');
        if (this.isBoss) {
            game.camera.addShake(0.5);
            game.particles.ring(this.x, this.y, 30, this.color, this.radius * 3, 0.6, 5);
            game.audio.play('boss');
        }
    }

    update(dt, player, game) {
        if (this.dead) return;

        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.hypot(dx, dy);
        const nx = dist > 0 ? dx / dist : 0;
        const ny = dist > 0 ? dy / dist : 0;

        // Speed modifiers
        let spd = this.baseSpeed;
        if (this.slowTimer > 0) { spd *= 0.4; this.slowTimer -= dt; }

        // Burn
        if (this.burnTimer > 0) {
            this.burnTimer -= dt;
            this.hp -= this.burnDmg * dt;
            if (Math.random() < 0.3) game.particles.trail(this.x, this.y, '#ff4400', 2);
            if (this.hp <= 0) this.die(game);
        }

        this.hitFlash -= dt;

        // Phasing
        if (this.phaseInterval > 0) {
            this.phaseTimer -= dt;
            if (this.phaseTimer <= 0) {
                this.isPhased = !this.isPhased;
                this.phaseTimer = this.isPhased ? 1.5 : this.phaseInterval;
            }
        }
        if (this.isPhased) return; // don't move or attack when phased

        // Dasher
        if (this.dashInterval > 0) {
            this.dashTimer -= dt;
            if (this.dashTimer <= 0 && !this.isDashing) {
                this.isDashing = true;
                this.dashDir = { x: nx, y: ny };
                this.dashDuration = 0.3;
            }
            if (this.isDashing) {
                this.x += this.dashDir.x * this.dashSpeed * dt;
                this.y += this.dashDir.y * this.dashSpeed * dt;
                this.dashDuration -= dt;
                if (this.dashDuration <= 0) {
                    this.isDashing = false;
                    this.dashTimer = this.dashInterval;
                }
                game.particles.trail(this.x, this.y, this.color, 2);
            } else {
                this.x += nx * spd * 0.3 * dt;
                this.y += ny * spd * 0.3 * dt;
            }
        } else {
            // Normal movement
            this.x += nx * spd * dt;
            this.y += ny * spd * dt;
        }

        // Ranged attack
        if (this.shootInterval > 0) {
            this.shootTimer -= dt;
            if (this.shootTimer <= 0 && dist < this.shootRange) {
                const angle = Math.atan2(dy * -1, dx * -1); // shoot at player, reversed
                const shootAngle = Math.atan2(player.y - this.y, player.x - this.x);
                const projSize = this.isBoss ? 14 + this.radius * 0.15 : 5;
                const projDmg = this.isBoss ? this.damage * 0.8 : this.damage * 0.5;
                game.projectiles.push(new Projectile(
                    this.x, this.y, shootAngle, this.projSpeed, projDmg,
                    projSize, this.color, 'enemy', this.shootRange * 1.2
                ));
                this.shootTimer = this.shootInterval;
            }
        }

        // Spawner — periodically vomits out more enemies
        if (this.spawnerInterval > 0) {
            this.spawnerTimer -= dt;
            if (this.spawnerTimer <= 0 && game.enemies.length < CONFIG.MAX_ENEMIES) {
                this.spawnerTimer = this.spawnerInterval;
                const waveScale = game.waveSystem ? game.waveSystem.getWaveScale() : 1;
                for (let i = 0; i < this.spawnerCount; i++) {
                    const a = Math.random() * Math.PI * 2;
                    const d = this.radius + 15 + Math.random() * 20;
                    const sx = this.x + Math.cos(a) * d;
                    const sy = this.y + Math.sin(a) * d;
                    const child = new Enemy(sx, sy, this.spawnerType, waveScale * 0.6);
                    game.enemies.push(child);
                }
                game.particles.ring(this.x, this.y, 10, this.color, this.radius + 20, 0.3, 3);
            }
        }

        // Healer
        if (this.healInterval > 0) {
            this.healTimer -= dt;
            if (this.healTimer <= 0) {
                for (const e of game.enemies) {
                    if (e === this || e.dead) continue;
                    if (Math.hypot(e.x - this.x, e.y - this.y) < this.healRange) {
                        e.hp = Math.min(e.maxHp, e.hp + this.healAmount);
                        game.particles.add(new Particle(e.x, e.y - e.radius, 0, -30, 0.5, 3, '#66ff66'));
                    }
                }
                this.healTimer = this.healInterval;
            }
        }

        // Spiral shot — rotating ring of projectiles
        if (this.spiralShot && this.isBoss) {
            this.spiralTimer -= dt;
            this.spiralAngle += dt * 1.5;
            if (this.spiralTimer <= 0) {
                const projSize = 10 + this.radius * 0.1;
                const projDmg = this.damage * 0.4;
                for (let i = 0; i < this.spiralCount; i++) {
                    const a = this.spiralAngle + (i / this.spiralCount) * Math.PI * 2;
                    game.projectiles.push(new Projectile(
                        this.x, this.y, a, this.spiralSpeed, projDmg,
                        projSize, this.color, 'enemy', this.shootRange * 1.5
                    ));
                }
                this.spiralTimer = this.spiralInterval;
                game.particles.ring(this.x, this.y, 8, this.color, this.radius + 10, 0.3, 2);
            }
        }

        // Burst shot — shotgun burst toward player
        if (this.burstShot && this.isBoss) {
            this.burstTimer -= dt;
            if (this.burstTimer <= 0 && dist < this.shootRange * 1.5) {
                const baseAngle = Math.atan2(player.y - this.y, player.x - this.x);
                const spread = Math.PI * 0.6;
                const projSize = 8 + this.radius * 0.08;
                const projDmg = this.damage * 0.3;
                for (let i = 0; i < this.burstCount; i++) {
                    const a = baseAngle - spread / 2 + (i / (this.burstCount - 1)) * spread;
                    const spd = this.burstSpeed * (0.8 + Math.random() * 0.4);
                    game.projectiles.push(new Projectile(
                        this.x, this.y, a, spd, projDmg,
                        projSize, this.color, 'enemy', this.shootRange * 1.2
                    ));
                }
                this.burstTimer = this.burstInterval;
                game.audio.play('shoot', 0.3);
            }
        }

        // Teleport — blink near the player
        if (this.teleport && this.isBoss) {
            this.teleportTimer -= dt;
            if (this.teleportTimer <= 0) {
                const tAngle = Math.random() * Math.PI * 2;
                const tDist = 150 + Math.random() * this.teleportRange;
                const newX = player.x + Math.cos(tAngle) * tDist;
                const newY = player.y + Math.sin(tAngle) * tDist;
                game.particles.burst(this.x, this.y, 12, '#aa44ff', 120, 0.4, 3);
                this.x = Math.max(this.radius, Math.min(CONFIG.WORLD_SIZE - this.radius, newX));
                this.y = Math.max(this.radius, Math.min(CONFIG.WORLD_SIZE - this.radius, newY));
                game.particles.burst(this.x, this.y, 12, '#aa44ff', 120, 0.4, 3);
                this.teleportTimer = this.teleportInterval;
            }
        }

        // Shield phase — temporary damage reduction
        if (this.shieldPhase && this.isBoss) {
            if (this.shielded) {
                this.shieldActiveTimer -= dt;
                if (this.shieldActiveTimer <= 0) {
                    this.shielded = false;
                    this.shieldTimer = this.shieldInterval;
                }
            } else {
                this.shieldTimer -= dt;
                if (this.shieldTimer <= 0) {
                    this.shielded = true;
                    this.shieldActiveTimer = this.shieldDuration;
                    game.particles.ring(this.x, this.y, 16, '#88ccff', this.radius + 30, 0.4, 4);
                }
            }
        }

        // Area denial — drops lingering hazard zones
        if (this.areaDenial && this.isBoss) {
            this.areaTimer -= dt;
            if (this.areaTimer <= 0) {
                for (let i = 0; i < this.areaCount; i++) {
                    const a = Math.random() * Math.PI * 2;
                    const d = 60 + Math.random() * 200;
                    const hx = this.x + Math.cos(a) * d;
                    const hy = this.y + Math.sin(a) * d;
                    if (!game.hazardZones) game.hazardZones = [];
                    game.hazardZones.push({
                        x: hx, y: hy, radius: this.areaRadius,
                        duration: this.areaDuration, timer: this.areaDuration,
                        dmg: this.areaDmg, color: this.color
                    });
                }
                this.areaTimer = this.areaInterval;
                game.particles.ring(this.x, this.y, 6, '#ff4400', this.radius + 15, 0.3, 2);
            }
        }

        // Contact damage to player
        if (dist < this.radius + player.radius) {
            this.contactTimer -= dt;
            if (this.contactTimer <= 0) {
                player.takeDamage(this.damage);
                this.contactTimer = 0.5;
            }
        } else {
            this.contactTimer = 0;
        }

        // Contact damage to petals — enemies touching orbitals damage them
        for (const o of player.orbitals) {
            if (o.dead || o.reloading) continue;
            const opos = o.getWorldPos(player);
            const oDist = Math.hypot(opos.x - this.x, opos.y - this.y);
            if (oDist < this.radius + 10) {
                // Enemy takes damage from petal contact
                const dmg = o.getDamage(player.damage);
                this.takeDamage(dmg, game);
                // Petal takes damage from enemy
                o.takePetalDamage(this.damage * 0.2, game);
                break; // only one petal collision per tick per enemy
            }
        }

        // Clamp to world
        this.x = Math.max(this.radius, Math.min(CONFIG.WORLD_SIZE - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(CONFIG.WORLD_SIZE - this.radius, this.y));
    }

    draw(ctx, camera) {
        const sx = camera.screenX(this.x);
        const sy = camera.screenY(this.y);

        const flashColor = this.hitFlash > 0 ? '#ffffff' : this.color;
        const alpha = this.isPhased ? 0.3 : 1;

        // Boss aura
        if (this.isBoss) {
            drawGlow(ctx, sx, sy, this.radius + 10, this.color, 0.4);
        }

        drawShape(ctx, sx, sy, this.radius, this.shape, flashColor, alpha);

        // Eyes
        if (this.radius > 10) {
            const eyeOff = this.radius * 0.3;
            drawCircle(ctx, sx - eyeOff, sy - eyeOff * 0.5, this.radius * 0.15, '#000');
            drawCircle(ctx, sx + eyeOff, sy - eyeOff * 0.5, this.radius * 0.15, '#000');
        }

        // HP bar for bosses or damaged enemies
        if (this.isBoss || this.hp < this.maxHp) {
            const barW = this.radius * 2;
            const barH = this.isBoss ? 6 : 3;
            const barY = sy - this.radius - 10;
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(sx - barW / 2, barY, barW, barH);
            ctx.fillStyle = this.hp > this.maxHp * 0.3 ? '#44ff44' : '#ff4444';
            ctx.fillRect(sx - barW / 2, barY, barW * (this.hp / this.maxHp), barH);
        }

        // Boss name
        if (this.isBoss) {
            ctx.font = 'bold 12px system-ui';
            ctx.fillStyle = this.color;
            ctx.textAlign = 'center';
            ctx.fillText(this.name, sx, sy - this.radius - 16);
        }

        // Shield indicator
        if (this.shielded) {
            ctx.save();
            ctx.globalAlpha = 0.35 + Math.sin(Date.now() * 0.005) * 0.15;
            ctx.strokeStyle = '#88ccff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(sx, sy, this.radius + 8, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 0.12;
            ctx.fillStyle = '#88ccff';
            ctx.fill();
            ctx.restore();
        }

        // Slow indicator
        if (this.slowTimer > 0) {
            drawCircle(ctx, sx, sy, this.radius + 3, '#88ddff', 0.2);
        }
        // Burn indicator
        if (this.burnTimer > 0) {
            drawCircle(ctx, sx, sy, this.radius + 2, '#ff4400', 0.2);
        }
    }
}

// ─── Projectile ───
class Projectile {
    constructor(x, y, angle, speed, damage, size, color, owner, maxDist) {
        this.x = x; this.y = y;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.speed = speed;
        this.damage = damage;
        this.hp = damage; // projectile HP = its damage
        this.maxHp = damage;
        this.size = size;
        this.baseSize = size;
        this.color = color;
        this.owner = owner; // 'player' or 'enemy'
        this.traveled = 0;
        this.maxDist = maxDist;
        this.dead = false;
    }

    // Reduce projectile HP; if it survives, it bounces off
    absorbDamage(amount, game) {
        this.hp -= amount;
        if (this.hp <= 0) {
            this.dead = true;
            game.particles.burst(this.x, this.y, 4, this.color, 60, 0.2, 2);
        } else {
            // Bounce: reverse direction + random scatter
            const scatter = (Math.random() - 0.5) * 0.8;
            const angle = Math.atan2(this.vy, this.vx) + Math.PI + scatter;
            this.vx = Math.cos(angle) * this.speed * 0.7;
            this.vy = Math.sin(angle) * this.speed * 0.7;
            this.speed *= 0.7;
            // Shrink proportionally to remaining HP
            this.size = this.baseSize * (this.hp / this.maxHp);
            this.size = Math.max(2, this.size);
            // Update damage to match remaining HP
            this.damage = this.hp;
            game.particles.burst(this.x, this.y, 3, '#ffffff', 40, 0.15, 1.5);
        }
    }

    update(dt, game) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.traveled += Math.hypot(this.vx, this.vy) * dt;

        if (this.traveled > this.maxDist) { this.dead = true; return; }
        if (this.x < 0 || this.x > CONFIG.WORLD_SIZE || this.y < 0 || this.y > CONFIG.WORLD_SIZE) { this.dead = true; return; }

        if (this.owner === 'player') {
            for (const e of game.enemies) {
                if (e.dead) continue;
                if (Math.hypot(e.x - this.x, e.y - this.y) < e.radius + this.size) {
                    e.takeDamage(this.damage, game);
                    // Projectile HP reduced by enemy's remaining HP ratio
                    const absorbed = Math.min(this.hp, this.damage);
                    this.absorbDamage(absorbed, game);
                    return;
                }
            }
        } else {
            // Enemy projectiles can be blocked by petals!
            const player = game.player;
            for (const o of player.orbitals) {
                if (o.dead || o.reloading) continue;
                const opos = o.getWorldPos(player);
                if (Math.hypot(opos.x - this.x, opos.y - this.y) < 12 + this.size) {
                    // Petal and projectile fight: both take damage
                    // Petal takes damage from projectile
                    o.takePetalDamage(this.damage, game);
                    // Projectile takes damage from petal's counterattack
                    const petalDmg = o.getDamage(player.damage);
                    this.absorbDamage(petalDmg, game);
                    return;
                }
            }

            // If not blocked by petal, hit player directly
            if (Math.hypot(player.x - this.x, player.y - this.y) < player.radius + this.size) {
                player.takeDamage(this.damage);
                this.dead = true;
                return;
            }

            // Hit pet
            if (game.pet && !game.pet.dead) {
                if (Math.hypot(game.pet.x - this.x, game.pet.y - this.y) < game.pet.radius + this.size) {
                    game.pet.takeDamage(this.damage);
                    this.dead = true;
                    return;
                }
            }
        }
    }

    draw(ctx, camera) {
        const sx = camera.screenX(this.x);
        const sy = camera.screenY(this.y);
        drawGlow(ctx, sx, sy, this.size, this.color, 0.5);
        drawCircle(ctx, sx, sy, this.size, this.color);
        // HP bar for projectiles with partial HP
        if (this.hp < this.maxHp && this.hp > 0) {
            const barW = this.size * 2;
            const barH = 2;
            const barX = sx - barW / 2;
            const barY = sy - this.size - 4;
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(barX, barY, barW, barH);
            ctx.fillStyle = this.color;
            ctx.fillRect(barX, barY, barW * (this.hp / this.maxHp), barH);
        }
    }
}

// ─── XP Gem ───
class XPGem {
    constructor(x, y, amount) {
        this.x = x + (Math.random() - 0.5) * 30;
        this.y = y + (Math.random() - 0.5) * 30;
        this.amount = amount;
        this.radius = Math.min(8, 3 + amount / 20);
        this.dead = false;
        this.magnetized = false;
        this.color = amount > 50 ? '#ff44ff' : amount > 20 ? '#44aaff' : '#00ffaa';
        this.bobPhase = Math.random() * Math.PI * 2;
    }

    update(dt, player, game) {
        this.bobPhase += dt * 3;
        const dist = Math.hypot(player.x - this.x, player.y - this.y);

        // Magnetize
        if (dist < player.pickupRange || this.magnetized) {
            this.magnetized = true;
            const speed = 600;
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const d = Math.hypot(dx, dy);
            if (d > 0) {
                this.x += (dx / d) * speed * dt;
                this.y += (dy / d) * speed * dt;
            }
        }

        // Collect
        if (dist < player.radius + 5) {
            player.addXp(this.amount);
            this.dead = true;
            game.audio.play('pickup', 0.15);
        }
    }

    draw(ctx, camera) {
        const sx = camera.screenX(this.x);
        const sy = camera.screenY(this.y) + Math.sin(this.bobPhase) * 3;
        drawGlow(ctx, sx, sy, this.radius + 2, this.color, 0.3);
        drawCircle(ctx, sx, sy, this.radius, this.color, 0.9);
    }
}

// ─── Loot Drop (Orbital Item) ───
class LootDrop {
    constructor(x, y, orbitalType, rarity) {
        this.x = x + (Math.random() - 0.5) * 20;
        this.y = y + (Math.random() - 0.5) * 20;
        this.orbitalType = orbitalType;
        this.rarity = rarity;
        this.radius = 10;
        this.dead = false;
        this.bobPhase = Math.random() * Math.PI * 2;
        this.lifetime = 9999; // managed by wave system
        this.spawnAnim = 0;
        this.inRange = false; // is player close enough to pick up?
        this.level = 1; // orbitals start at level 1
        this.spawnWave = 0; // set by the game when created
    }

    update(dt, player, game) {
        this.bobPhase += dt * 2;
        this.spawnAnim = Math.min(1, this.spawnAnim + dt * 3);
        this.lifetime -= dt;
        if (this.lifetime <= 0) { this.dead = true; return; }

        const dist = Math.hypot(player.x - this.x, player.y - this.y);
        const pickupRadius = 60;
        this.inRange = dist < pickupRadius;
        
        // Set as nearest drop for tooltip display
        if (this.inRange) {
            if (!game.nearestLoot || dist < Math.hypot(player.x - game.nearestLoot.x, player.y - game.nearestLoot.y)) {
                game.nearestLoot = this;
            }
        }
        
        // E key to pick up when in range
        if (this.inRange && (game.input.keys['e'] || game.input.keys['KeyE'])) {
            // Pick up: add to empty slot, or player must have space
            if (player.orbitals.length < player.maxSlots) {
                player.addOrbital(this.orbitalType, this.rarity);
                this.dead = true;
                const ri = RARITY_ORDER.indexOf(this.rarity);
                const rarityData = RARITIES[this.rarity];
                game.showToast(`Equipped ${rarityData.name} ${ORBITAL_TYPES[this.orbitalType].name}!`, rarityData.color, ri >= 3);
                game.particles.burst(this.x, this.y, 15, rarityData.color, 150, 0.5, 4);
                if (ri >= 4) game.camera.addShake(0.3);
                if (ri > (game.runStats.bestRarity || 0)) game.runStats.bestRarity = ri;
                game.audio.play('pickup', 0.5);
            } else {
                // Slots full - show which slot to replace prompt
                game.showToast('Slots full! Drag a petal out of loadout to discard first.', '#ff6666', false);
            }
            // Debounce E key
            game.input.keys['e'] = false;
            game.input.keys['KeyE'] = false;
        }

        // O key to store in inventory when in range
        if (this.inRange && (game.input.keys['o'] || game.input.keys['KeyO'])) {
            game.addToInventory(this.orbitalType, this.rarity);
            this.dead = true;
            const ri = RARITY_ORDER.indexOf(this.rarity);
            const rarityData = RARITIES[this.rarity];
            game.showToast(`Stored ${rarityData.name} ${ORBITAL_TYPES[this.orbitalType].name} in inventory!`, rarityData.color, ri >= 3);
            game.particles.burst(this.x, this.y, 10, rarityData.color, 120, 0.4, 3);
            if (ri > (game.runStats.bestRarity || 0)) game.runStats.bestRarity = ri;
            game.audio.play('pickup', 0.4);
            // Debounce O key
            game.input.keys['o'] = false;
            game.input.keys['KeyO'] = false;
        }
    }

    draw(ctx, camera) {
        const sx = camera.screenX(this.x);
        const sy = camera.screenY(this.y) + Math.sin(this.bobPhase) * 5;
        const rarityData = RARITIES[this.rarity];
        const ri = RARITY_ORDER.indexOf(this.rarity);
        const r = this.radius * this.spawnAnim;

        // Pickup range ring when player is close
        if (this.inRange) {
            ctx.save();
            ctx.strokeStyle = rarityData.color;
            ctx.globalAlpha = 0.3 + Math.sin(Date.now() * 0.005) * 0.15;
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.arc(sx, sy, r + 18, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        }

        // Rarity glow
        if (rarityData.rainbow) {
            const hue = (Date.now() * 0.3) % 360;
            drawGlow(ctx, sx, sy, r + 8, `hsl(${hue}, 100%, 60%)`, 0.6);
        } else {
            drawGlow(ctx, sx, sy, r + 5 + ri * 2, rarityData.glow, 0.3 + ri * 0.08);
        }

        // Body
        if (rarityData.rainbow) {
            const hue = (Date.now() * 0.3 + 180) % 360;
            drawCircle(ctx, sx, sy, r, `hsl(${hue}, 100%, 65%)`);
        } else {
            drawCircle(ctx, sx, sy, r, rarityData.color);
        }

        // Icon
        ctx.font = `${12 * this.spawnAnim}px system-ui`;
        ctx.textAlign = 'center';
        ctx.fillText(ORBITAL_TYPES[this.orbitalType].icon, sx, sy + 4);

        // Tooltip when in range
        if (this.inRange) {
            const cfg = ORBITAL_TYPES[this.orbitalType];
            const tooltipY = sy - r - 24;
            
            // Background
            ctx.fillStyle = 'rgba(10, 10, 30, 0.9)';
            const name = `${rarityData.name} ${cfg.name}`;
            ctx.font = 'bold 11px system-ui';
            const nameW = ctx.measureText(name).width;
            const desc = cfg.desc;
            ctx.font = '9px system-ui';
            const descW = ctx.measureText(desc).width;
            const boxW = Math.max(nameW, descW) + 20;
            const boxH = 38;
            const boxX = sx - boxW / 2;
            const boxY = tooltipY - boxH;
            
            // Tooltip box
            ctx.beginPath();
            ctx.roundRect(boxX, boxY, boxW, boxH, 6);
            ctx.fill();
            ctx.strokeStyle = rarityData.color + '80';
            ctx.lineWidth = 1;
            ctx.stroke();
            
            // Name
            ctx.font = 'bold 11px system-ui';
            ctx.fillStyle = rarityData.color;
            ctx.textAlign = 'center';
            ctx.fillText(name, sx, boxY + 14);
            
            // Desc
            ctx.font = '9px system-ui';
            ctx.fillStyle = '#aaa';
            ctx.fillText(desc, sx, boxY + 27);
            
            // Key prompts
            ctx.font = 'bold 10px system-ui';
            ctx.fillStyle = '#00f0ff';
            ctx.fillText('[E] Equip   [O] Inventory', sx, sy + r + 18);
        }

        // Blinking if about to expire
        if (this.lifetime < 5 && Math.sin(Date.now() * 0.01) > 0) {
            ctx.globalAlpha = 0.5;
            drawCircle(ctx, sx, sy, r + 3, '#ffffff', 0.3);
            ctx.globalAlpha = 1;
        }
    }
}

// ─── Pet (Healing Companion) ───
class Pet {
    constructor(game, player) {
        this.game = game;
        this.player = player;
        this.x = player.x + 40;
        this.y = player.y;
        this.radius = 10;
        this.hp = this.maxHp;
        this.dead = false;
        this.reviveTimer = 0;
        this.healTimer = 0;
        this.healInterval = 1.5;       // shoot healing pellet every 1.5s
        this.healAmount = 0;           // set dynamically based on player
        this.bobPhase = Math.random() * Math.PI * 2;
        this.targetAngle = 0;          // angle offset from player
        this.angle = 0;                // current smooth angle
        this.damageFlash = 0;
        this.spawnAnim = 0;
        this._pellets = [];            // active healing pellets
    }

    get maxHp() {
        return this.player ? this.player.maxHp * 0.5 : 100;
    }

    get healPerShot() {
        // heals ~5% of player max HP per pellet, scaling with level
        return this.player ? this.player.maxHp * 0.05 * (1 + (this.player.level - 1) * 0.02) : 5;
    }

    takeDamage(dmg) {
        if (this.dead) return;
        dmg = Math.max(1, dmg);
        this.hp -= dmg;
        this.damageFlash = 0.15;
        this.game.particles.burst(this.x, this.y, 4, '#88ddff', 60, 0.2, 2);
        if (this.hp <= 0) {
            this.hp = 0;
            this.dead = true;
            this.reviveTimer = 5;
            this.game.particles.burst(this.x, this.y, 15, '#88ddff', 120, 0.5, 4);
            this.game.showToast('🐾 Pet down! Reviving in 5s...', '#88ddff', false);
        }
    }

    update(dt) {
        const player = this.player;
        if (!player) return;

        // Dead — revive countdown
        if (this.dead) {
            this.reviveTimer -= dt;
            if (this.reviveTimer <= 0) {
                this.dead = false;
                this.hp = this.maxHp;
                this.x = player.x + 40;
                this.y = player.y;
                this.spawnAnim = 0;
                this.game.particles.ring(this.x, this.y, 12, '#88ddff', 60, 0.4, 3);
                this.game.showToast('🐾 Pet revived!', '#4ade80', false);
            }
            return;
        }

        this.spawnAnim = Math.min(1, this.spawnAnim + dt * 3);
        this.bobPhase += dt * 3;

        // Refresh HP cap (player may level up)
        if (this.hp > this.maxHp) this.hp = this.maxHp;

        // Regen slowly (1% of max per second)
        this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.01 * dt);

        // Follow player — orbit within petal radius but not too close
        const orbitDist = player.orbitals.length > 0
            ? player.orbitals[0].getOrbitDist(player) * 0.7
            : 55;
        const targetDist = Math.max(35, Math.min(orbitDist, 80));

        // Calculate desired position (opposite side from avg enemy direction)
        let safeAngle = this.targetAngle;
        if (this.game.enemies.length > 0) {
            // Find average enemy direction from player
            let avgDx = 0, avgDy = 0, count = 0;
            for (const e of this.game.enemies) {
                const d = Math.hypot(e.x - player.x, e.y - player.y);
                if (d < 400) {
                    avgDx += (e.x - player.x) / d;
                    avgDy += (e.y - player.y) / d;
                    count++;
                }
            }
            if (count > 0) {
                // Move to opposite side of enemies
                safeAngle = Math.atan2(-avgDy, -avgDx);
            }
        }
        // Slowly rotate target angle
        let angleDiff = safeAngle - this.angle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        this.angle += angleDiff * 3 * dt;
        this.targetAngle = safeAngle;

        const targetX = player.x + Math.cos(this.angle) * targetDist;
        const targetY = player.y + Math.sin(this.angle) * targetDist;

        // Smooth following with speed
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const dist = Math.hypot(dx, dy);
        const followSpeed = Math.max(player.speed * 1.2, 300);

        if (dist > 2) {
            const moveAmt = Math.min(followSpeed * dt, dist);
            this.x += (dx / dist) * moveAmt;
            this.y += (dy / dist) * moveAmt;
        }

        // If too far from player (lagging behind), snap closer
        const playerDist = Math.hypot(this.x - player.x, this.y - player.y);
        if (playerDist > 200) {
            this.x = player.x + (this.x - player.x) / playerDist * 120;
            this.y = player.y + (this.y - player.y) / playerDist * 120;
        }

        // Clamp to world
        this.x = Math.max(this.radius, Math.min(CONFIG.WORLD_SIZE - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(CONFIG.WORLD_SIZE - this.radius, this.y));

        // Damage flash
        if (this.damageFlash > 0) this.damageFlash -= dt;

        // Take damage from nearby enemies
        for (const e of this.game.enemies) {
            if (e.dead) continue;
            const d = Math.hypot(e.x - this.x, e.y - this.y);
            if (d < e.radius + this.radius) {
                this.takeDamage(e.damage * 0.3 * dt);
            }
        }

        // Shoot healing pellets at player
        this.healTimer -= dt;
        if (this.healTimer <= 0 && player.hp < player.maxHp) {
            this.healTimer = this.healInterval;
            const angle = Math.atan2(player.y - this.y, player.x - this.x);
            this._pellets.push({
                x: this.x,
                y: this.y,
                vx: Math.cos(angle) * 350,
                vy: Math.sin(angle) * 350,
                heal: this.healPerShot,
                size: 4,
                life: 2,
                alpha: 1,
            });
            this.game.audio.play('pickup', 0.1);
        }

        // Update healing pellets
        for (let i = this._pellets.length - 1; i >= 0; i--) {
            const p = this._pellets[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;

            // Re-aim pellet toward player (gentle homing)
            const toDx = player.x - p.x;
            const toDy = player.y - p.y;
            const toD = Math.hypot(toDx, toDy);
            if (toD > 0) {
                const desiredAngle = Math.atan2(toDy, toDx);
                const curAngle = Math.atan2(p.vy, p.vx);
                let turn = desiredAngle - curAngle;
                while (turn > Math.PI) turn -= Math.PI * 2;
                while (turn < -Math.PI) turn += Math.PI * 2;
                const newAngle = curAngle + turn * 5 * dt;
                const speed = 350;
                p.vx = Math.cos(newAngle) * speed;
                p.vy = Math.sin(newAngle) * speed;
            }

            // Hit player
            const d = Math.hypot(p.x - player.x, p.y - player.y);
            if (d < player.radius + p.size) {
                player.hp = Math.min(player.maxHp, player.hp + p.heal);
                this.game.particles.burst(player.x, player.y, 6, '#4ade80', 60, 0.3, 2);
                this.game.particles.damageNumber(player.x, player.y, p.heal, '#4ade80');
                this._pellets.splice(i, 1);
                continue;
            }

            if (p.life <= 0) {
                this._pellets.splice(i, 1);
            }
        }
    }

    draw(ctx, camera) {
        // Draw healing pellets first (behind pet)
        for (const p of this._pellets) {
            const px = camera.screenX(p.x);
            const py = camera.screenY(p.y);
            const glowR = p.size + 3;
            ctx.save();
            ctx.globalAlpha = 0.5;
            ctx.shadowBlur = 8;
            ctx.shadowColor = '#4ade80';
            ctx.beginPath();
            ctx.arc(px, py, glowR, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(74, 222, 128, 0.3)';
            ctx.fill();
            ctx.restore();
            drawCircle(ctx, px, py, p.size, '#4ade80', 0.9);
            // Plus icon
            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = 0.8;
            ctx.fillRect(px - 1.5, py - 4, 3, 8);
            ctx.fillRect(px - 4, py - 1.5, 8, 3);
            ctx.globalAlpha = 1;
        }

        if (this.dead) return;

        const sx = camera.screenX(this.x);
        const sy = camera.screenY(this.y) + Math.sin(this.bobPhase) * 2;
        const scale = this.spawnAnim;
        const r = this.radius * scale;

        if (r < 1) return;

        // Glow
        const flashAlpha = this.damageFlash > 0 ? 0.5 + Math.sin(Date.now() * 0.05) * 0.5 : 1;
        drawGlow(ctx, sx, sy, r + 4, '#88ddff', 0.3 * flashAlpha);

        // Body
        const bodyColor = this.damageFlash > 0 ? '#ffffff' : '#88ddff';
        drawCircle(ctx, sx, sy, r, bodyColor, 0.9 * flashAlpha);

        // Inner highlight
        drawCircle(ctx, sx - 2, sy - 2, r * 0.4, '#ccf0ff', 0.6);

        // Face — cute eyes
        const eyeOff = r * 0.25;
        drawCircle(ctx, sx - eyeOff, sy - eyeOff * 0.5, 2.5 * scale, '#ffffff', 0.9);
        drawCircle(ctx, sx + eyeOff, sy - eyeOff * 0.5, 2.5 * scale, '#ffffff', 0.9);
        drawCircle(ctx, sx - eyeOff, sy - eyeOff * 0.5, 1.2 * scale, '#224455', 0.9);
        drawCircle(ctx, sx + eyeOff, sy - eyeOff * 0.5, 1.2 * scale, '#224455', 0.9);

        // Healing cross icon
        ctx.fillStyle = '#4ade80';
        ctx.globalAlpha = 0.6 + Math.sin(Date.now() * 0.004) * 0.2;
        const crossSize = 3 * scale;
        ctx.fillRect(sx - crossSize / 2, sy + r * 0.3 - crossSize, crossSize, crossSize * 2);
        ctx.fillRect(sx - crossSize, sy + r * 0.3 - crossSize / 2, crossSize * 2, crossSize);
        ctx.globalAlpha = 1;

        // HP bar
        if (this.hp < this.maxHp) {
            const barW = r * 3;
            const barH = 3;
            const barX = sx - barW / 2;
            const barY = sy - r - 8;
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(barX, barY, barW, barH);
            ctx.fillStyle = '#4ade80';
            ctx.fillRect(barX, barY, barW * (this.hp / this.maxHp), barH);
        }

        // Revive indicator
        if (this.dead) {
            ctx.font = 'bold 10px system-ui';
            ctx.fillStyle = '#88ddff';
            ctx.textAlign = 'center';
            ctx.fillText(`⏱ ${Math.ceil(this.reviveTimer)}s`, sx, sy - r - 12);
        }
    }
}
