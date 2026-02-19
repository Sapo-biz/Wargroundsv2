// ═══════════════════════════════════════════════════════
// ORBITRON — Main Game Loop
// ═══════════════════════════════════════════════════════

class Game {
    constructor() {
        this.camera = new Camera();
        this.input = new InputManager();
        this.touch = new TouchController(this.input);
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
        this.pvpZone = null;      // current PVP_ZONES entry
        this.pvpBots = [];        // AI bot opponents
        this.pvpOrbs = [];        // collectible orbs
        this.pvpScore = 0;
        this.pvpLeaderboard = []; // {name, score, color, alive}
        this.pvpTime = 0;
        this.pvpArenaSize = 3000;
        this.pvpMobTimer = 0;
        this.pvpOrbTimer = 0;
        this.pvpRegenTimer = 0;   // time since last damage
        this.pvpLastZoneId = null;
        this.pvpClient = new PVPClient(this);

        // Mod
        this.modEnabled = false;
        this.godMode = false;

        this._reviveSnapshot = null;

        // Pet
        this.pet = null;

        this.lastTime = 0;
        this.hudUpdateTimer = 0;
        this.minimapTimer = 0;
        this.autoSaveTimer = 0;

        this.ui.showScreen('mainMenu');
        this.loop = this.loop.bind(this);
        requestAnimationFrame(this.loop);

        // Reset lastTime when tab becomes visible to prevent huge dt jumps
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) this.lastTime = performance.now();
        });

        // Check daily premium bonus on startup
        this.checkDailyPremiumBonus();
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

    // ─── Premium System ───
    isPremium() {
        if (!this.saveData.premium) return false;
        if (this.saveData.premiumExpiry && Date.now() > this.saveData.premiumExpiry) {
            // Subscription expired
            this.saveData.premium = false;
            this.saveSystem.save(this.saveData);
            return false;
        }
        return true;
    }

    buyPremium() {
        if (this.isPremium()) {
            this.showToast('You already have Premium!', '#ffaa00', false);
            return;
        }

        // Redirect to Stripe checkout
        this.initiateStripeCheckout();
    }

    initiateStripeCheckout() {
        // Show loading state
        const btn = document.getElementById('btnBuyPremium');
        const originalText = btn ? btn.textContent : 'SUBSCRIBE NOW';
        if (btn) btn.textContent = 'Loading...';

        // Server endpoint that creates a Stripe checkout session
        // Replace with your backend URL
        const backendUrl = 'https://your-backend.com/create-checkout-session';
        // For demo, use a test endpoint
        const testUrl = `${window.location.origin}/api/create-checkout-session`;

        fetch(testUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                priceId: 'price_orbitron_premium_monthly', // Replace with your Stripe price ID
                successUrl: `${window.location.origin}?premium=success`,
                cancelUrl: window.location.origin
            })
        })
        .then(res => res.json())
        .then(data => {
            if (data.url) {
                // Redirect to Stripe checkout
                window.location.href = data.url;
            } else if (data.sessionId) {
                // Use Stripe.js redirect
                const stripe = Stripe('pk_live_YOUR_PUBLISHABLE_KEY'); // Replace with your key
                stripe.redirectToCheckout({ sessionId: data.sessionId });
            } else {
                this.showToast('Payment setup error. Please contact support.', '#ff4444', false);
                if (btn) btn.textContent = originalText;
            }
        })
        .catch(err => {
            console.error('Stripe checkout error:', err);
            // Fallback to demo mode for development
            this.showToast('Using demo mode (backend not configured)', '#ffaa00', false);
            this.activatePremiumDemo();
            if (btn) btn.textContent = originalText;
        });
    }

    activatePremiumDemo() {
        const confirmed = confirm('Demo Mode: Activate Premium for 30 days?\n\n✓ Unlock ALL skins\n✓ No ads\n✓ 100 daily Stardust');
        if (!confirmed) return;

        this.saveData.premium = true;
        this.saveData.premiumExpiry = Date.now() + (30 * 24 * 60 * 60 * 1000);
        this.unlockPremiumBenefits();
    }

    unlockPremiumBenefits() {
        // Unlock all skins
        for (const skin of PLAYER_SKINS) {
            if (!this.saveData.unlockedSkins.includes(skin.id)) {
                this.saveData.unlockedSkins.push(skin.id);
            }
        }
        // Grant daily stardust
        this.saveData.stardust += 100;
        this.saveData.totalStardust += 100;
        this.saveData.lastDailyLogin = Date.now();
        this.saveSystem.save(this.saveData);

        this.showToast('👑 Premium Activated! All skins unlocked + 100 ✦', '#c084fc', true);
        this.audio.play('rare', 0.8);
        this.ui.hidePremiumOverlay();
        this.ui.renderSkinShop && this.ui.renderSkinShop();
        const btn = document.getElementById('btnPremium');
        if (btn) btn.textContent = '👑 PREMIUM ✓';
    }

    buyUpsellPack() {
        const picks = this.ui._upsellPicks;
        if (!picks || picks.length === 0) {
            // No picks available, just open the shop
            this.ui.hideUpsellOverlay();
            this.ui.showScreen('petalShopScreen');
            return;
        }

        // Calculate bundle price (20% off)
        const totalPrice = picks.reduce((acc, p) => acc + PETAL_SHOP_PRICES[p.rarity], 0);
        const bundlePrice = (totalPrice * 0.8).toFixed(2);

        const itemList = picks.map(p => {
            const cfg = ORBITAL_TYPES[p.type];
            const r = RARITIES[p.rarity];
            return `${r.name} ${cfg.name}`;
        }).join('\n✓ ');

        const confirmed = confirm(`Get this bundle for $${bundlePrice}?\n\n✓ ${itemList}\n\n(This is a demo — items added to your stash)`);
        if (!confirmed) return;

        for (const item of picks) {
            if (ORBITAL_TYPES[item.type]) {
                const alreadyHas = this.saveData.permInventory.some(
                    p => p.type === item.type && p.rarity === item.rarity
                );
                if (!alreadyHas) {
                    this.saveData.permInventory.push({ type: item.type, rarity: item.rarity });
                }
            }
        }
        this.saveSystem.save(this.saveData);
        this.showToast('🎁 Bundle purchased! Check your stash!', '#c084fc', true);
        this.audio.play('rare', 0.8);
        this.ui.hideUpsellOverlay();
    }

    buyPetal(type, rarity) {
        const cfg = ORBITAL_TYPES[type];
        const r = RARITIES[rarity];
        const price = PETAL_SHOP_PRICES[rarity];
        if (!cfg || !price) return;

        const alreadyHas = this.saveData.permInventory.some(
            p => p.type === type && p.rarity === rarity
        );
        if (alreadyHas) {
            this.showToast(`You already own ${r.name} ${cfg.name}!`, '#ffaa00', false);
            return;
        }

        const confirmed = confirm(`Buy ${r.name} ${cfg.name} for $${price.toFixed(2)}?\n\n${cfg.icon} ${cfg.desc}\n\n(This is a demo — item added to your stash)`);
        if (!confirmed) return;

        this.saveData.permInventory.push({ type, rarity });
        this.saveSystem.save(this.saveData);
        this.showToast(`${cfg.icon} ${r.name} ${cfg.name} added to stash!`, r.color, true);
        this.audio.play('rare', 0.8);
        // Re-render shop if it's open
        if (this.ui.elements.petalShopScreen && !this.ui.elements.petalShopScreen.classList.contains('hidden')) {
            this.ui.renderPetalShop();
        }
    }

    // ─── Daily Premium Stardust ───
    checkDailyPremiumBonus() {
        if (!this.isPremium()) return;
        const now = Date.now();
        const lastLogin = this.saveData.lastDailyLogin || 0;
        const oneDay = 24 * 60 * 60 * 1000;
        if (now - lastLogin >= oneDay) {
            this.saveData.stardust += 100;
            this.saveData.totalStardust += 100;
            this.saveData.lastDailyLogin = now;
            this.saveSystem.save(this.saveData);
            this.showToast('👑 Daily Premium Bonus: +100 ✦', '#c084fc', true);
        }
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
        if (this.touch) this.touch.show();
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

        // Create pet companion
        this.pet = new Pet(this, this.player);

        this.ui.showHUD();
        this.ui.renderInventory();
        this.saveData.totalRuns++;
    }

    // ─── Global PVP Mode (Server-Connected) ───
    startPVP(zoneId) {
        const zone = PVP_ZONES.find(z => z.id === zoneId);
        if (!zone) return;

        this.audio.resume();
        this.state = 'pvp';
        if (this.touch) this.touch.show();
        this.pvpMode = true;
        this.pvpZone = zone;
        this.pvpLastZoneId = zoneId;
        this.paused = false;
        this.enemies = [];
        this.projectiles = [];
        this.xpGems = [];
        this.lootDrops = [];
        this.hazardZones = [];
        this.pvpTime = 0;
        this.pvpScore = 0;
        this.pvpBots = [];
        this.pvpOrbs = [];
        this.pvpArenaSize = zone.arenaSize;
        this.pvpMinimapTimer = 0;

        // Load full permanent inventory for PVP (nothing equipped initially)
        const stash = this.saveData.permInventory || [];
        const eligible = stash.filter(p => zone.allowedRarities.includes(p.rarity));
        const inventoryForServer = eligible.map(p => ({ type: p.type, rarity: p.rarity }));
        this.inventory = eligible.map((p, i) => ({ type: p.type, rarity: p.rarity, id: 'inv_' + i }));
        this.nextInvId = eligible.length;

        // Player name
        const userName = this.saveData.username || (this.googleAuth && this.googleAuth.user ? this.googleAuth.user.name : 'Player');

        // Connect to server via WebSocket
        this.pvpClient.connect(zoneId, {
            name: userName,
            inventory: inventoryForServer,
            color: '#00ccff',
        });

        // Set camera to arena center while waiting for server
        const cx = CONFIG.WORLD_SIZE / 2;
        const cy = CONFIG.WORLD_SIZE / 2;
        this.camera.x = cx;
        this.camera.y = cy;

        this.ui.hideAllScreens();
        this.ui.showPVPHud();
        this.ui.renderInventory();
    }

    _createPVPBot(zone, cx, cy, arena, idx, names, colors) {
        const halfArena = arena / 2;
        const x = cx + (Math.random() - 0.5) * arena * 0.8;
        const y = cy + (Math.random() - 0.5) * arena * 0.8;
        const bot = {
            x, y,
            radius: CONFIG.BASE_PLAYER_RADIUS,
            hp: zone.hp,
            maxHp: zone.hp,
            regenRate: zone.regen,
            regenTimer: PVP_REGEN_DELAY,
            speed: CONFIG.BASE_PLAYER_SPEED * (0.7 + Math.random() * 0.5),
            name: names[idx % names.length] + (idx >= names.length ? (idx + 1) : '') + ' BOT',
            color: colors[idx % colors.length],
            orbitals: [],
            orbitDistMult: 1.0,
            targetOrbitDistMult: 1.0,
            score: 0,
            dead: false,
            respawnTimer: 0,
            // AI state
            aiTimer: 0,
            aiTargetX: x,
            aiTargetY: y,
            aiMode: 'wander', // wander, chase, flee
            aiTarget: null,
            dashCooldown: 0,
            dashTimer: 0,
            dashDirX: 0,
            dashDirY: 0,
            damageFlash: 0,
            invulnTimer: 0,
            damage: 10, // base damage for petal calculations
        };

        // Allow Enemy class to call takeDamage on bots
        bot.takeDamage = (dmg) => {
            this._damageBot(bot, dmg, 'mob');
        };

        // Give bot petals matching zone
        const numPetals = 3 + Math.floor(Math.random() * 3); // 3-5
        for (let i = 0; i < numPetals; i++) {
            const rarity = zone.allowedRarities[Math.floor(Math.random() * zone.allowedRarities.length)];
            const type = randomOrbitalType();
            bot.orbitals.push(new Orbital(type, rarity, i));
        }

        return bot;
    }

    _spawnPVPOrb(cx, cy, arena) {
        const halfArena = arena / 2;
        this.pvpOrbs.push({
            x: cx + (Math.random() - 0.5) * arena * 0.8,
            y: cy + (Math.random() - 0.5) * arena * 0.8,
            radius: 8,
            glow: 0,
            dead: false,
        });
    }

    exitPVP() {
        this.pvpClient.disconnect();
        this.pvpMode = false;
        this.state = 'menu';
        if (this.touch) this.touch.hide();
        this.player = null;
        this.pvpBots = [];
        this.pvpOrbs = [];
        this.enemies = [];
        this.projectiles = [];
        this.ui.showScreen('mainMenu');
    }

    endPVP() {
        this.pvpClient.disconnect();
        this.pvpMode = false;
        this.state = 'menu';
        if (this.touch) this.touch.hide();
        this.player = null;
        this.pvpBots = [];
        this.pvpOrbs = [];
        this.enemies = [];
        this.projectiles = [];
    }

    _updateBotAI(bot, dt) {
        if (bot.dead) return;
        const cx = CONFIG.WORLD_SIZE / 2;
        const cy = CONFIG.WORLD_SIZE / 2;
        const halfArena = this.pvpArenaSize / 2;

        bot.aiTimer -= dt;
        bot.dashCooldown = Math.max(0, bot.dashCooldown - dt);
        if (bot.damageFlash > 0) bot.damageFlash -= dt;
        if (bot.invulnTimer > 0) bot.invulnTimer -= dt;

        // Regen logic (5s out of combat)
        bot.regenTimer += dt;
        if (bot.regenTimer >= PVP_REGEN_DELAY && bot.hp < bot.maxHp) {
            bot.hp = Math.min(bot.maxHp, bot.hp + bot.regenRate * dt);
        }

        // Decide new action periodically
        if (bot.aiTimer <= 0) {
            bot.aiTimer = 0.5 + Math.random() * 1.5;
            const hpPct = bot.hp / bot.maxHp;

            // Find nearest threat (player or other bot)
            let nearestDist = Infinity;
            let nearestTarget = null;

            // Check player
            if (this.player && this.player.hp > 0) {
                const d = Math.hypot(this.player.x - bot.x, this.player.y - bot.y);
                if (d < nearestDist) { nearestDist = d; nearestTarget = { x: this.player.x, y: this.player.y, isPlayer: true }; }
            }
            // Check other bots
            for (const other of this.pvpBots) {
                if (other === bot || other.dead) continue;
                const d = Math.hypot(other.x - bot.x, other.y - bot.y);
                if (d < nearestDist) { nearestDist = d; nearestTarget = { x: other.x, y: other.y, isPlayer: false, bot: other }; }
            }

            if (hpPct < 0.3 && nearestDist < 300) {
                bot.aiMode = 'flee';
                bot.aiTarget = nearestTarget;
            } else if (nearestDist < 400 && hpPct > 0.5) {
                bot.aiMode = 'chase';
                bot.aiTarget = nearestTarget;
            } else {
                bot.aiMode = 'wander';
                bot.aiTargetX = cx + (Math.random() - 0.5) * this.pvpArenaSize * 0.7;
                bot.aiTargetY = cy + (Math.random() - 0.5) * this.pvpArenaSize * 0.7;
            }

            // Try to collect nearby orbs
            let nearestOrb = null;
            let nearestOrbDist = 250;
            for (const orb of this.pvpOrbs) {
                if (orb.dead) continue;
                const od = Math.hypot(orb.x - bot.x, orb.y - bot.y);
                if (od < nearestOrbDist) { nearestOrbDist = od; nearestOrb = orb; }
            }
            if (nearestOrb && bot.aiMode === 'wander') {
                bot.aiTargetX = nearestOrb.x;
                bot.aiTargetY = nearestOrb.y;
            }

            // Random petal extend/retract
            if (Math.random() < 0.3) bot.targetOrbitDistMult = 2.5;
            else if (Math.random() < 0.2) bot.targetOrbitDistMult = 0.35;
            else bot.targetOrbitDistMult = 1.0;
        }

        // Move based on mode
        let targetX, targetY;
        if (bot.aiMode === 'chase' && bot.aiTarget) {
            targetX = bot.aiTarget.x;
            targetY = bot.aiTarget.y;
        } else if (bot.aiMode === 'flee' && bot.aiTarget) {
            targetX = bot.x - (bot.aiTarget.x - bot.x);
            targetY = bot.y - (bot.aiTarget.y - bot.y);
        } else {
            targetX = bot.aiTargetX;
            targetY = bot.aiTargetY;
        }

        const dx = targetX - bot.x;
        const dy = targetY - bot.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 10) {
            const ndx = dx / dist;
            const ndy = dy / dist;

            // Dash occasionally when chasing
            if (bot.aiMode === 'chase' && bot.dashCooldown <= 0 && dist < 200 && Math.random() < 0.02) {
                bot.dashTimer = 0.075;
                bot.dashDirX = ndx;
                bot.dashDirY = ndy;
                bot.dashCooldown = 2;
                bot.invulnTimer = 0.1;
            }

            if (bot.dashTimer > 0) {
                bot.dashTimer -= dt;
                bot.x += bot.dashDirX * bot.speed * 4 * dt;
                bot.y += bot.dashDirY * bot.speed * 4 * dt;
            } else {
                bot.x += ndx * bot.speed * dt;
                bot.y += ndy * bot.speed * dt;
            }
        }

        // Clamp to arena
        bot.x = Math.max(cx - halfArena + bot.radius, Math.min(cx + halfArena - bot.radius, bot.x));
        bot.y = Math.max(cy - halfArena + bot.radius, Math.min(cy + halfArena - bot.radius, bot.y));

        // Smooth orbit dist
        bot.orbitDistMult += (bot.targetOrbitDistMult - bot.orbitDistMult) * 10 * dt;

        // Update orbitals
        const orbTime = Date.now() * 0.001;
        for (let i = 0; i < bot.orbitals.length; i++) {
            const o = bot.orbitals[i];
            if (o.reloading) {
                o.reloadTimer -= dt;
                if (o.reloadTimer <= 0) o.respawn();
                continue;
            }
            o.angle += CONFIG.BASE_ORBITAL_SPEED * dt;
        }
    }

    _getBotOrbitalPos(bot, orbital) {
        const cfg = ORBITAL_TYPES[orbital.type];
        const dist = (cfg.orbitDist || 50) * bot.orbitDistMult;
        return {
            x: bot.x + Math.cos(orbital.angle) * dist,
            y: bot.y + Math.sin(orbital.angle) * dist,
        };
    }

    _damageBot(bot, dmg, attacker) {
        if (bot.dead || bot.invulnTimer > 0) return;
        bot.hp -= dmg;
        bot.damageFlash = 0.15;
        bot.regenTimer = 0; // reset regen timer
        this.particles.burst(bot.x, bot.y, 4, '#ff4444', 80, 0.2, 2);
        this.particles.damageNumber(bot.x, bot.y, dmg, '#ff6666');
        if (bot.hp <= 0) {
            bot.hp = 0;
            bot.dead = true;
            bot.respawnTimer = 5;
            this.camera.addShake(0.3);
            this.particles.burst(bot.x, bot.y, 30, bot.color, 200, 0.8, 4);
            // Award kill points to attacker
            if (attacker === 'player') {
                this.pvpScore += PVP_SCORE.KILL;
                this._updatePlayerLeaderboard();
                this.showToast(`💀 Killed ${bot.name}! +${PVP_SCORE.KILL} pts`, '#ff4444', true);
            } else if (attacker && attacker.name) {
                // Bot killed another bot
                const lbEntry = this.pvpLeaderboard.find(e => e.name === attacker.name);
                if (lbEntry) lbEntry.score += PVP_SCORE.KILL;
            }
            // Mark dead on leaderboard
            const lbEntry = this.pvpLeaderboard.find(e => e.name === bot.name);
            if (lbEntry) lbEntry.alive = false;
        }
    }

    _updatePlayerLeaderboard() {
        const entry = this.pvpLeaderboard.find(e => !e.isBot);
        if (entry) entry.score = this.pvpScore;
    }

    updatePVP(dt) {
        const client = this.pvpClient;
        if (!client.connected && !client.ws) return;

        this.pvpTime += dt;

        // Advance interpolation factor
        client.interpFactor += dt / (client.stateInterval / 1000);

        // Read input and send to server (including extend/retract)
        const move = this.input.getMoveDir();
        const wantDash = this.input.keys['q'] || this.input.keys['keyq'] || this.input.keys['/'];
        const wantExtend = this.input.keys[' '] || this.input.keys['Space'] || false;
        const wantRetract = this.input.keys['shift'] || this.input.keys['ShiftLeft'] || this.input.keys['ShiftRight'] || false;
        client.sendInput(move.dx, move.dy, wantDash, wantExtend, wantRetract);

        // Sync server data to game properties for UI compatibility
        this.pvpScore = client.myScore;
        this.pvpLeaderboard = client.leaderboard;

        // Follow our player's server position
        const me = client.getMyPlayer();
        if (me && !me.d) {
            const pos = client.getInterpolatedPos(me);
            this.camera.follow(pos.x, pos.y);
        }
        this.camera.update(dt);

        // Particles
        this.particles.update(dt);

        // Update PVP HUD from server state
        this.ui.updatePVPHud(me ? { hp: client.myHp, maxHp: client.myMaxHp } : null, null);

        // Render orbital slots from server state
        if (me && me.orbs) {
            this.ui.renderPVPOrbitalSlots(me.orbs, client.myMaxSlots);
        }

        // Only re-render inventory when it actually changes (avoid per-frame DOM thrash)
        const invKey = JSON.stringify(this.inventory);
        if (invKey !== this._lastInvKey) {
            this._lastInvKey = invKey;
            this.ui.renderInventory();
        }

        // Minimap
        this.pvpMinimapTimer = (this.pvpMinimapTimer || 0) + dt;
        if (this.pvpMinimapTimer >= 0.5) {
            this.pvpMinimapTimer = 0;
            this.ui.renderPVPMinimap();
        }
    }

    _spawnPVPMob(cx, cy, arena) {
        const halfArena = arena / 2;
        const angle = Math.random() * Math.PI * 2;
        const dist = halfArena * 0.8;
        let x = cx + Math.cos(angle) * dist;
        let y = cy + Math.sin(angle) * dist;

        // Get appropriate mob type
        const mobTypes = Object.keys(ENEMY_TYPES).filter(k => {
            const et = ENEMY_TYPES[k];
            return et.minZone <= (this.pvpZone.id - 1) && et.maxZone >= (this.pvpZone.id - 1);
        });
        const typeKey = mobTypes[Math.floor(Math.random() * mobTypes.length)] || 'blob';
        const scale = 1 + this.pvpZone.id * 0.5;
        this.enemies.push(new Enemy(x, y, typeKey, scale));
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
        if (this.touch) this.touch.hide();
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
        // Sync to cloud on death
        if (this.googleAuth && this.googleAuth.user) {
            this.googleAuth.saveToCloud();
        }

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

        // Pet
        if (this.pet) {
            this.pet.update(dt);
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
            // Sync to cloud if signed in
            if (this.googleAuth && this.googleAuth.user) {
                this.googleAuth.saveToCloud();
            }
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

        // Pet
        if (this.pet) {
            this.pet.draw(ctx, cam);
        }

        // Particles (on top)
        this.particles.draw(ctx, cam);
    }

    renderPVPArena() {
        const cam = this.camera;
        const client = this.pvpClient;
        const cx = CONFIG.WORLD_SIZE / 2;
        const cy = CONFIG.WORLD_SIZE / 2;
        const halfArena = this.pvpArenaSize / 2;
        const zone = this.pvpZone;

        // Background
        ctx.fillStyle = zone ? zone.bgColor : '#080818';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Arena grid
        const gridSize = 60;
        const startX = Math.floor((cx - halfArena) / gridSize) * gridSize;
        const startY = Math.floor((cy - halfArena) / gridSize) * gridSize;
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = startX; x <= cx + halfArena; x += gridSize) {
            const sx = cam.screenX(x);
            ctx.moveTo(sx, cam.screenY(cy - halfArena));
            ctx.lineTo(sx, cam.screenY(cy + halfArena));
        }
        for (let y = startY; y <= cy + halfArena; y += gridSize) {
            const sy = cam.screenY(y);
            ctx.moveTo(cam.screenX(cx - halfArena), sy);
            ctx.lineTo(cam.screenX(cx + halfArena), sy);
        }
        ctx.stroke();

        // Arena border with zone color
        const borderColor = zone ? zone.color : '#ff6464';
        const bx = cam.screenX(cx - halfArena);
        const by = cam.screenY(cy - halfArena);
        const bw = this.pvpArenaSize;
        const bh = this.pvpArenaSize;
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.4;
        ctx.strokeRect(bx, by, bw, bh);
        ctx.globalAlpha = 1;

        // Danger zone warning near edges (use our server position)
        const me = client.getMyPlayer();
        if (me && !me.d) {
            const myPos = client.getInterpolatedPos(me);
            const edgeDist = Math.min(
                myPos.x - (cx - halfArena),
                (cx + halfArena) - myPos.x,
                myPos.y - (cy - halfArena),
                (cy + halfArena) - myPos.y
            );
            if (edgeDist < 100) {
                const alpha = (1 - edgeDist / 100) * 0.15;
                ctx.fillStyle = `rgba(255, 50, 50, ${alpha})`;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
        }

        // Draw orbs from server state
        const orbs = client.orbs || [];
        for (const orb of orbs) {
            const sx = cam.screenX(orb.x);
            const sy = cam.screenY(orb.y);
            const pulse = 1 + Math.sin(Date.now() * 0.005 + orb.x) * 0.3;
            const glowR = 20 * pulse;
            // Glow
            const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, glowR);
            grad.addColorStop(0, 'rgba(255, 255, 80, 0.6)');
            grad.addColorStop(1, 'rgba(255, 255, 80, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(sx, sy, glowR, 0, Math.PI * 2);
            ctx.fill();
            // Core
            ctx.fillStyle = '#ffff55';
            ctx.beginPath();
            ctx.arc(sx, sy, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(sx, sy, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw mobs from server state (matching wave-mode Enemy.draw)
        const mobs = client.mobs || [];
        for (const mob of mobs) {
            const msx = cam.screenX(mob.x);
            const msy = cam.screenY(mob.y);
            const mr = mob.r || 20;
            const etype = ENEMY_TYPES[mob.k];
            const mobColor = etype ? etype.color : '#ff4444';
            const mobShape = mob.s || (etype ? etype.shape : 'circle');
            const isBoss = mr > 30; // heuristic: bosses are large

            // Boss aura glow
            if (isBoss) {
                drawGlow(ctx, msx, msy, mr + 10, mobColor, 0.4);
            }

            // Body using drawShape helper
            drawShape(ctx, msx, msy, mr, mobShape, mobColor);

            // Eyes (for mobs with radius > 10)
            if (mr > 10) {
                const eyeOff = mr * 0.3;
                drawCircle(ctx, msx - eyeOff, msy - eyeOff * 0.5, mr * 0.15, '#000');
                drawCircle(ctx, msx + eyeOff, msy - eyeOff * 0.5, mr * 0.15, '#000');
            }

            // HP bar for bosses or damaged mobs
            if (isBoss || mob.hp < mob.mhp) {
                const hpPct = mob.hp / mob.mhp;
                const hpW = mr * 2;
                const hpH = isBoss ? 6 : 3;
                const hpX = msx - hpW / 2;
                const hpY = msy - mr - 10;
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.fillRect(hpX, hpY, hpW, hpH);
                ctx.fillStyle = hpPct > 0.3 ? '#44ff44' : '#ff4444';
                ctx.fillRect(hpX, hpY, hpW * hpPct, hpH);
            }

            // Boss name
            if (isBoss && etype) {
                ctx.font = 'bold 12px system-ui';
                ctx.fillStyle = mobColor;
                ctx.textAlign = 'center';
                ctx.fillText(etype.name || mob.k, msx, msy - mr - 16);
            }
        }

        // Draw projectiles from server state (with glow)
        const projs = client.projectiles || [];
        for (const p of projs) {
            const psx = cam.screenX(p.x);
            const psy = cam.screenY(p.y);
            drawGlow(ctx, psx, psy, 6, '#ffaa00', 0.4);
            drawCircle(ctx, psx, psy, 4, '#ffaa00');
            drawCircle(ctx, psx, psy, 2, '#ffffff', 0.8);
        }

        // Draw all players/bots from server state (matching wave-mode Player.draw + Orbital.draw)
        const players = client.players || [];
        const myId = client.playerId;
        for (const p of players) {
            if (p.d) continue; // dead
            const isMe = (p.id === myId);
            const pos = client.getInterpolatedPos(p);
            const psx = cam.screenX(pos.x);
            const psy = cam.screenY(pos.y);
            const pr = p.r || CONFIG.BASE_PLAYER_RADIUS;

            // Resolve skin (for local player, use saved skin; others use server color)
            let bodyColor = p.c;
            let glowColor = p.c;
            let highlightCol = '#aaeeff';
            if (isMe) {
                const skinId = this.saveData ? this.saveData.activeSkin : 'default';
                const skin = PLAYER_SKINS.find(s => s.id === skinId) || PLAYER_SKINS[0];
                const isPrism = skin.bodyColor === 'prism';
                bodyColor = isPrism ? `hsl(${(Date.now() * 0.15) % 360}, 85%, 60%)` : skin.bodyColor;
                glowColor = isPrism ? bodyColor : skin.glowColor;
                highlightCol = skin.highlightColor;
            }

            // Invuln override
            if (p.inv) {
                bodyColor = '#ffffff';
                ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.02) * 0.3;
            }

            // Damage flash override
            if (p.df) {
                bodyColor = '#ffffff';
            }

            // Body glow
            drawGlow(ctx, psx, psy, pr + 5, glowColor, 0.4);

            // Body
            const flashAlpha = p.df ? (0.5 + Math.sin(Date.now() * 0.05) * 0.5) : 1;
            drawCircle(ctx, psx, psy, pr, bodyColor, flashAlpha);

            // Inner highlight
            drawCircle(ctx, psx - 4, psy - 4, pr * 0.4, highlightCol, 0.6);

            // Dash cooldown ring (server sends dc = dashCooldown remaining)
            if (p.dc > 0) {
                const pct = 1 - (p.dc / 3); // 3s total cooldown
                ctx.globalAlpha = 0.4;
                ctx.strokeStyle = '#00ffff';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(psx, psy, pr + 8, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2);
                ctx.stroke();
                ctx.globalAlpha = 1;
            } else {
                // Ready pulse indicator
                ctx.globalAlpha = 0.15 + Math.sin(Date.now() * 0.005) * 0.1;
                ctx.strokeStyle = '#00ffff';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(psx, psy, pr + 8, 0, Math.PI * 2);
                ctx.stroke();
                ctx.globalAlpha = 1;
            }

            // Draw orbitals (petals) from server data — matching wave-mode Orbital.draw
            const orbitals = p.orbs || [];
            for (let oi = 0; oi < orbitals.length; oi++) {
                const o = orbitals[oi];
                const cfg = ORBITAL_TYPES[o.t];
                const rInfo = RARITIES[o.ra];
                if (!cfg || !rInfo) continue;
                const petalR = (cfg.size || 8);

                // Calculate orbital world position from angle + orbit distance
                const owx = pos.x + Math.cos(o.a) * o.od;
                const owy = pos.y + Math.sin(o.a) * o.od;
                const osx = cam.screenX(owx);
                const osy = cam.screenY(owy);

                // If reloading, show ghost outline with reload ring
                if (o.rl) {
                    // Ghost circle
                    ctx.globalAlpha = 0.15;
                    drawCircle(ctx, osx, osy, 8, rInfo.color);
                    ctx.globalAlpha = 1;
                    // Reload ring (indeterminate spin since we don't have reload progress)
                    const spin = (Date.now() * 0.003 + oi * 1.5) % (Math.PI * 2);
                    ctx.strokeStyle = rInfo.color;
                    ctx.lineWidth = 2;
                    ctx.globalAlpha = 0.5;
                    ctx.beginPath();
                    ctx.arc(osx, osy, 10, spin, spin + Math.PI * 1.2);
                    ctx.stroke();
                    ctx.globalAlpha = 1;
                    continue;
                }

                // Orbit trail
                ctx.globalAlpha = 0.1;
                ctx.strokeStyle = rInfo.color;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(psx, psy, o.od, 0, Math.PI * 2);
                ctx.stroke();
                ctx.globalAlpha = 1;

                // Glow + body (rainbow for divine/cosmic/eternal)
                if (rInfo.rainbow) {
                    const hue = (Date.now() * 0.2 + oi * 60) % 360;
                    drawGlow(ctx, osx, osy, petalR + 4, `hsl(${hue}, 100%, 60%)`, 0.7);
                    drawCircle(ctx, osx, osy, petalR, `hsl(${hue}, 100%, 60%)`);
                } else {
                    drawGlow(ctx, osx, osy, petalR + 3, rInfo.glow, 0.5);
                    drawCircle(ctx, osx, osy, petalR, rInfo.color);
                }
            }

            ctx.globalAlpha = 1;

            // Name
            ctx.fillStyle = isMe ? '#00f0ff' : '#ffffff';
            ctx.font = isMe ? 'bold 13px monospace' : 'bold 11px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(p.n, psx, psy - pr - 8);

            // HP bar
            const hpPct = p.hp / p.mhp;
            const hpW = isMe ? 50 : 40;
            const hpH = isMe ? 5 : 4;
            const hpX = psx - hpW / 2;
            const hpY = psy - pr - (isMe ? 22 : 18);
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(hpX, hpY, hpW, hpH);
            ctx.fillStyle = hpPct > 0.5 ? '#4ade80' : hpPct > 0.25 ? '#facc15' : '#ef4444';
            ctx.fillRect(hpX, hpY, hpW * hpPct, hpH);

            // Score tag (small under name for non-self)
            if (!isMe && p.s > 0) {
                ctx.fillStyle = '#aaaaaa';
                ctx.font = '9px monospace';
                ctx.fillText(p.s.toLocaleString() + ' pts', psx, psy + pr + 12);
            }
        }

        // Ping indicator (top-right corner)
        if (client.pingMs > 0) {
            ctx.fillStyle = client.pingMs < 80 ? '#4ade80' : client.pingMs < 150 ? '#facc15' : '#ef4444';
            ctx.font = '10px monospace';
            ctx.textAlign = 'right';
            ctx.fillText(`${client.pingMs}ms`, canvas.width - 10, 20);
        }

        // Connection status
        if (!client.connected) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ffaa00';
            ctx.font = 'bold 24px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('Connecting...', canvas.width / 2, canvas.height / 2);
        }

        // Particles
        this.particles.draw(ctx, cam);
    }
}

// ═══════════════════════════════════════════════════════
// Google Authentication & Cloud Save
// ═══════════════════════════════════════════════════════
class GoogleAuth {
    constructor(game) {
        this.game = game;
        this.user = null; // { id, name, email, picture }
        this.CLIENT_ID = '558530822734-rq4adikesst3aem3ndop86eii96ha93f.apps.googleusercontent.com';

        this.elSignedOut = document.getElementById('googleSignedOut');
        this.elSignedIn = document.getElementById('googleSignedIn');
        this.elAvatar = document.getElementById('googleAvatar');
        this.elName = document.getElementById('googleName');

        this.init();
    }

    init() {
        // Restore previous session from localStorage
        const saved = localStorage.getItem('orbitron_google_user');
        if (saved) {
            try {
                this.user = JSON.parse(saved);
                this.showSignedIn();
                this.loadCloudSave();
            } catch (e) {}
        }

        // Google Sign-In button
        const btnLogin = document.getElementById('btnGoogleLogin');
        if (btnLogin) {
            btnLogin.onclick = () => this.signIn();
        }

        // Sign out
        const btnLogout = document.getElementById('btnGoogleLogout');
        if (btnLogout) {
            btnLogout.onclick = () => this.signOut();
        }

        // Initialize GIS when it loads
        this.initGIS();
    }

    initGIS() {
        if (typeof google === 'undefined' || !google.accounts) {
            // GIS not yet loaded, retry
            setTimeout(() => this.initGIS(), 500);
            return;
        }
        // GIS is available
        this.gisReady = true;
    }

    signIn() {
        if (!this.gisReady) {
            this.game.showToast('Google login loading...', '#ffaa00', false);
            return;
        }

        // Use Google One Tap / popup flow
        google.accounts.id.initialize({
            client_id: this.CLIENT_ID,
            callback: (response) => this.handleCredentialResponse(response),
            auto_select: false,
        });

        // Show popup prompt
        google.accounts.id.prompt((notification) => {
            if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                // Fallback: use renderButton approach in a temporary container
                this.showFallbackSignIn();
            }
        });
    }

    showFallbackSignIn() {
        // Create a temporary overlay with Google sign-in button
        const overlay = document.createElement('div');
        overlay.id = 'googleSignInOverlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;flex-direction:column;';

        const card = document.createElement('div');
        card.style.cssText = 'background:rgba(20,20,40,0.95);border:1px solid rgba(0,240,255,0.2);border-radius:16px;padding:32px;text-align:center;backdrop-filter:blur(12px);max-width:350px;';

        const title = document.createElement('h3');
        title.textContent = 'Sign in to Orbitron';
        title.style.cssText = 'color:#fff;margin:0 0 8px;font-size:18px;';
        card.appendChild(title);

        const sub = document.createElement('p');
        sub.textContent = 'Save your progress across devices';
        sub.style.cssText = 'color:#888;margin:0 0 16px;font-size:13px;';
        card.appendChild(sub);

        const btnContainer = document.createElement('div');
        btnContainer.id = 'googleBtnContainer';
        card.appendChild(btnContainer);

        const cancel = document.createElement('button');
        cancel.textContent = 'Cancel';
        cancel.className = 'btn btn-secondary';
        cancel.style.marginTop = '12px';
        cancel.onclick = () => overlay.remove();
        card.appendChild(cancel);

        overlay.appendChild(card);
        document.body.appendChild(overlay);

        // Render Google button in container
        google.accounts.id.renderButton(btnContainer, {
            type: 'standard',
            theme: 'filled_black',
            size: 'large',
            text: 'signin_with',
            shape: 'pill',
            width: 280,
        });
    }

    handleCredentialResponse(response) {
        // Decode JWT token
        const payload = this.decodeJWT(response.credential);
        if (!payload) {
            this.game.showToast('Login failed', '#ff4444', false);
            return;
        }

        this.user = {
            id: payload.sub,
            name: payload.name || payload.email,
            email: payload.email,
            picture: payload.picture || '',
        };

        // Save user info locally
        localStorage.setItem('orbitron_google_user', JSON.stringify(this.user));

        // Remove fallback overlay if present
        const overlay = document.getElementById('googleSignInOverlay');
        if (overlay) overlay.remove();

        this.showSignedIn();
        this.game.showToast(`Signed in as ${this.user.name}`, '#4ade80', false);

        // Try to load cloud save
        this.loadCloudSave();
    }

    decodeJWT(token) {
        try {
            const parts = token.split('.');
            if (parts.length !== 3) return null;
            const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
            return payload;
        } catch (e) {
            return null;
        }
    }

    signOut() {
        // Save current progress to cloud before signing out
        this.saveToCloud();

        this.user = null;
        localStorage.removeItem('orbitron_google_user');
        
        // Reload anonymous/local save (not user-specific)
        // This ensures non-premium status and fresh local data
        this.game.saveData = this.game.saveSystem.load();
        this.game.ui.renderMainMenu();
        
        this.showSignedOut();
        this.game.showToast('Signed out', '#888', false);

        // Revoke Google session
        if (this.gisReady) {
            google.accounts.id.disableAutoSelect();
        }
    }

    showSignedIn() {
        if (!this.user || !this.elSignedIn || !this.elSignedOut) return;
        this.elSignedOut.classList.add('hidden');
        this.elSignedIn.classList.remove('hidden');
        if (this.elAvatar) {
            this.elAvatar.src = this.user.picture || '';
            this.elAvatar.style.display = this.user.picture ? '' : 'none';
        }
        if (this.elName) this.elName.textContent = this.user.name || this.user.email;
    }

    showSignedOut() {
        if (!this.elSignedIn || !this.elSignedOut) return;
        this.elSignedOut.classList.remove('hidden');
        this.elSignedIn.classList.add('hidden');
    }

    // Cloud Save / Load
    // Uses localStorage keyed by Google user ID for cross-device concept
    // In production, this would hit a real backend API
    getCloudKey() {
        return this.user ? `orbitron_cloud_${this.user.id}` : null;
    }

    saveToCloud() {
        if (!this.user) return;
        const key = this.getCloudKey();
        if (!key) return;
        try {
            const data = JSON.stringify(this.game.saveData);
            localStorage.setItem(key, data);

            // Also try to post to backend if available
            this.syncToServer(data);
        } catch (e) {}
    }

    loadCloudSave() {
        if (!this.user) return;
        const key = this.getCloudKey();
        if (!key) return;

        try {
            // Check localStorage cloud save
            const cloudData = localStorage.getItem(key);
            if (cloudData) {
                const parsed = JSON.parse(cloudData);
                const localData = this.game.saveData;

                // Merge strategy: use whichever has more progress
                const cloudProgress = (parsed.totalKills || 0) + (parsed.totalRuns || 0) + (parsed.totalStardust || 0);
                const localProgress = (localData.totalKills || 0) + (localData.totalRuns || 0) + (localData.totalStardust || 0);

                if (cloudProgress > localProgress) {
                    // Cloud has more progress — load it
                    this.game.saveData = { ...this.game.saveSystem.getDefault(), ...parsed };
                    this.game.saveSystem.save(this.game.saveData);
                    this.game.ui.renderMainMenu();
                    this.game.showToast('☁️ Cloud save loaded!', '#00f0ff', false);
                } else if (localProgress > cloudProgress) {
                    // Local has more progress — push to cloud
                    this.saveToCloud();
                    this.game.showToast('☁️ Progress synced to cloud', '#4ade80', false);
                }
            } else {
                // No cloud save yet — push local to cloud
                this.saveToCloud();
            }
        } catch (e) {}

        // Also try backend
        this.syncFromServer();
    }

    async syncToServer(data) {
        try {
            await fetch('/api/cloud-save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: this.user.id, data })
            });
        } catch (e) {
            // Backend unavailable — localStorage cloud save still works
        }
    }

    async syncFromServer() {
        try {
            const res = await fetch(`/api/cloud-load?userId=${this.user.id}`);
            if (res.ok) {
                const { data } = await res.json();
                if (data) {
                    const parsed = JSON.parse(data);
                    const localData = this.game.saveData;
                    const serverProgress = (parsed.totalKills || 0) + (parsed.totalRuns || 0) + (parsed.totalStardust || 0);
                    const localProgress = (localData.totalKills || 0) + (localData.totalRuns || 0) + (localData.totalStardust || 0);
                    if (serverProgress > localProgress) {
                        this.game.saveData = { ...this.game.saveSystem.getDefault(), ...parsed };
                        this.game.saveSystem.save(this.game.saveData);
                        this.game.ui.renderMainMenu();
                        this.game.showToast('☁️ Server save loaded!', '#00f0ff', false);
                    }
                }
            }
        } catch (e) {
            // Server unavailable
        }
    }
}

// ─── Bootstrap ───
window.addEventListener('load', () => {
    window.game = new Game();
    // Initialize Google Auth
    window.game.googleAuth = new GoogleAuth(window.game);
});

// Prevent context menu on right-click
window.addEventListener('contextmenu', e => e.preventDefault());

// Handle page visibility
document.addEventListener('visibilitychange', () => {
    if (document.hidden && window.game && window.game.state === 'playing') {
        // Could pause here if desired
    }
});
