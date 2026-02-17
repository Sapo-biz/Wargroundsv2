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

    // ─── Global PVP Mode ───
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
        this.inventory = [];
        this.pvpTime = 0;
        this.pvpScore = 0;
        this.pvpBots = [];
        this.pvpOrbs = [];
        this.pvpMobTimer = zone.mobSpawnInterval;
        this.pvpOrbTimer = 2;
        this.pvpRegenTimer = PVP_REGEN_DELAY;

        const arena = zone.arenaSize;
        this.pvpArenaSize = arena;
        const cx = CONFIG.WORLD_SIZE / 2;
        const cy = CONFIG.WORLD_SIZE / 2;

        // Create player
        this.player = new Player(this, 0);
        this.player.x = cx + (Math.random() - 0.5) * arena * 0.5;
        this.player.y = cy + (Math.random() - 0.5) * arena * 0.5;

        // Set zone HP & disable normal regen (use PVP regen)
        this.player.baseStats.maxHp = zone.hp;
        this.player.hp = zone.hp;
        this.player.baseStats.hpRegen = 0; // PVP handles regen separately
        this.player._pvpRegenRate = zone.regen;

        // Equip eligible petals from stash
        const stash = this.saveData.permInventory || [];
        const eligible = stash.filter(p => zone.allowedRarities.includes(p.rarity));
        const sorted = [...eligible].sort((a, b) => RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity));
        const petals = sorted.slice(0, 5);
        if (petals.length > 0) {
            for (const p of petals) this.player.addOrbital(p.type, p.rarity);
        } else {
            for (let i = 0; i < 5; i++) this.player.addOrbital(randomOrbitalType(), zone.allowedRarities[0] || 'common');
        }

        // Create bots
        this.pvpLeaderboard = [];
        const botNames = ['Glider', 'Scorch', 'Phantom', 'Blitz', 'Nebula', 'Frostbite', 'Viper', 'Eclipse', 'Shadow', 'Bolt', 'Tempest', 'Nova'];
        const botColors = ['#ff6666', '#66ff66', '#ffaa44', '#ff44cc', '#44ccff', '#ccff44', '#ff8888', '#88ffcc'];
        for (let i = 0; i < zone.botCount; i++) {
            const bot = this._createPVPBot(zone, cx, cy, arena, i, botNames, botColors);
            this.pvpBots.push(bot);
            this.pvpLeaderboard.push({ name: bot.name, score: 0, color: bot.color, alive: true, isBot: true });
        }

        // Add player to leaderboard
        const userName = (this.googleAuth && this.googleAuth.user) ? this.googleAuth.user.name : 'You';
        this.pvpLeaderboard.push({ name: userName, score: 0, color: '#00ccff', alive: true, isBot: false });

        // Spawn initial orbs
        for (let i = 0; i < 15; i++) {
            this._spawnPVPOrb(cx, cy, arena);
        }

        this.camera.x = this.player.x;
        this.camera.y = this.player.y;

        this.ui.hideAllScreens();
        this.ui.showPVPHud();
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
            name: names[idx % names.length] + (idx >= names.length ? (idx + 1) : ''),
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
        if (!this.player) return;
        this.pvpTime += dt;

        const zone = this.pvpZone;
        const arena = this.pvpArenaSize;
        const cx = CONFIG.WORLD_SIZE / 2;
        const cy = CONFIG.WORLD_SIZE / 2;
        const halfArena = arena / 2;

        // Player regen (5s no-damage)
        this.pvpRegenTimer += dt;
        if (this.pvpRegenTimer >= PVP_REGEN_DELAY && this.player.hp < this.player.maxHp) {
            this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player._pvpRegenRate * dt);
        }

        // Update player
        this.player.update(dt, this.input);

        // Clamp player to arena
        this.player.x = Math.max(cx - halfArena + this.player.radius, Math.min(cx + halfArena - this.player.radius, this.player.x));
        this.player.y = Math.max(cy - halfArena + this.player.radius, Math.min(cy + halfArena - this.player.radius, this.player.y));

        // Update bots
        for (const bot of this.pvpBots) {
            if (bot.dead) {
                bot.respawnTimer -= dt;
                if (bot.respawnTimer <= 0) {
                    // Respawn bot
                    bot.dead = false;
                    bot.hp = bot.maxHp;
                    bot.x = cx + (Math.random() - 0.5) * arena * 0.8;
                    bot.y = cy + (Math.random() - 0.5) * arena * 0.8;
                    bot.invulnTimer = 2;
                    // Restore orbitals
                    for (const o of bot.orbitals) { o.respawn(); }
                    const lbEntry = this.pvpLeaderboard.find(e => e.name === bot.name);
                    if (lbEntry) lbEntry.alive = true;
                }
                continue;
            }
            this._updateBotAI(bot, dt);
        }

        // Player orbitals damage bots
        for (const o of this.player.orbitals) {
            if (o.dead || o.reloading) continue;
            const opos = o.getWorldPos(this.player);
            for (const bot of this.pvpBots) {
                if (bot.dead || bot.invulnTimer > 0) continue;
                const dist = Math.hypot(opos.x - bot.x, opos.y - bot.y);
                if (dist < bot.radius + 10) {
                    const dmg = o.getDamage(this.player.damage) * 0.3;
                    this._damageBot(bot, dmg, 'player');
                    o.takePetalDamage(dmg * 0.1, this);
                }
            }
        }

        // Bot orbitals damage player
        for (const bot of this.pvpBots) {
            if (bot.dead) continue;
            for (const o of bot.orbitals) {
                if (o.dead || o.reloading) continue;
                const opos = this._getBotOrbitalPos(bot, o);
                const dist = Math.hypot(opos.x - this.player.x, opos.y - this.player.y);
                if (dist < this.player.radius + 10) {
                    const dmg = o.getDamage(1) * 0.3;
                    this.player.takeDamage(dmg);
                    this.pvpRegenTimer = 0; // reset regen
                    o.takePetalDamage(dmg * 0.1, this);
                }
            }
        }

        // Bot vs bot orbital combat
        for (let i = 0; i < this.pvpBots.length; i++) {
            const botA = this.pvpBots[i];
            if (botA.dead) continue;
            for (let j = i + 1; j < this.pvpBots.length; j++) {
                const botB = this.pvpBots[j];
                if (botB.dead) continue;
                const dist = Math.hypot(botA.x - botB.x, botA.y - botB.y);
                if (dist > 150) continue; // skip distant bots
                // A's orbitals hit B
                for (const o of botA.orbitals) {
                    if (o.dead || o.reloading) continue;
                    const opos = this._getBotOrbitalPos(botA, o);
                    const d = Math.hypot(opos.x - botB.x, opos.y - botB.y);
                    if (d < botB.radius + 10) {
                        const dmg = o.getDamage(1) * 0.25;
                        this._damageBot(botB, dmg, botA);
                        o.takePetalDamage(dmg * 0.1, this);
                    }
                }
                // B's orbitals hit A
                for (const o of botB.orbitals) {
                    if (o.dead || o.reloading) continue;
                    const opos = this._getBotOrbitalPos(botB, o);
                    const d = Math.hypot(opos.x - botA.x, opos.y - botA.y);
                    if (d < botA.radius + 10) {
                        const dmg = o.getDamage(1) * 0.25;
                        this._damageBot(botA, dmg, botB);
                        o.takePetalDamage(dmg * 0.1, this);
                    }
                }
            }
        }

        // Projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.update(dt, this);
            if (p.dead) { this.projectiles.splice(i, 1); continue; }
            // Check hit on bots
            for (const bot of this.pvpBots) {
                if (bot.dead) continue;
                const d = Math.hypot(p.x - bot.x, p.y - bot.y);
                if (d < bot.radius + p.size) {
                    this._damageBot(bot, p.damage * 0.3, 'player');
                    p.dead = true;
                    break;
                }
            }
            if (p.dead) { this.projectiles.splice(i, 1); continue; }
        }

        // Orb collection (player)
        for (const orb of this.pvpOrbs) {
            if (orb.dead) continue;
            const d = Math.hypot(this.player.x - orb.x, this.player.y - orb.y);
            if (d < this.player.radius + orb.radius + 20) {
                orb.dead = true;
                this.pvpScore += PVP_SCORE.ORB;
                this._updatePlayerLeaderboard();
                this.particles.burst(orb.x, orb.y, 6, '#ffff44', 60, 0.3, 2);
                this.audio.play('pickup', 0.3);
            }
        }

        // Orb collection (bots)
        for (const bot of this.pvpBots) {
            if (bot.dead) continue;
            for (const orb of this.pvpOrbs) {
                if (orb.dead) continue;
                const d = Math.hypot(bot.x - orb.x, bot.y - orb.y);
                if (d < bot.radius + orb.radius + 15) {
                    orb.dead = true;
                    bot.score += PVP_SCORE.ORB;
                    const lbEntry = this.pvpLeaderboard.find(e => e.name === bot.name);
                    if (lbEntry) lbEntry.score += PVP_SCORE.ORB;
                    this.particles.burst(orb.x, orb.y, 4, '#ffff44', 40, 0.2, 2);
                }
            }
        }

        // Remove dead orbs and respawn
        this.pvpOrbs = this.pvpOrbs.filter(o => !o.dead);
        this.pvpOrbTimer -= dt;
        if (this.pvpOrbTimer <= 0 && this.pvpOrbs.length < 25) {
            this._spawnPVPOrb(cx, cy, arena);
            this.pvpOrbTimer = 1.5 + Math.random() * 2;
        }

        // Periodic mob spawns (much less than waves)
        this.pvpMobTimer -= dt;
        if (this.pvpMobTimer <= 0 && this.enemies.length < 12) {
            this._spawnPVPMob(cx, cy, arena);
            this.pvpMobTimer = zone.mobSpawnInterval + Math.random() * 3;
        }

        // Update enemies (mobs)
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            this.enemies[i].update(dt, this.player, this);
            if (this.enemies[i].dead) {
                // Mob killed — award player points
                this.pvpScore += PVP_SCORE.KILL;
                this._updatePlayerLeaderboard();
                this.xpGems.push(new XPGem(this.enemies[i].x, this.enemies[i].y, this.enemies[i].xpReward));
                this.enemies.splice(i, 1);
            }
        }

        // XP Gems (auto-pickup in PVP)
        for (let i = this.xpGems.length - 1; i >= 0; i--) {
            const gem = this.xpGems[i];
            gem.update(dt, this.player, this);
            if (gem.dead) this.xpGems.splice(i, 1);
        }

        // Camera follows player
        this.camera.follow(this.player.x, this.player.y);
        this.camera.update(dt);

        // Particles
        this.particles.update(dt);

        // Update PVP HUD
        this.ui.updatePVPHud(this.player, null);

        // Player death
        if (this.player.hp <= 0 && this.state === 'pvp') {
            this.state = 'pvp_over';
            if (this.touch) this.touch.hide();
            this.camera.addShake(0.6);
            this.particles.burst(this.player.x, this.player.y, 40, '#00ccff', 250, 1, 5);
            setTimeout(() => {
                this.ui.showPVPVictory(null, { 
                    time: this.pvpTime, 
                    score: this.pvpScore,
                    zone: this.pvpZone,
                    leaderboard: [...this.pvpLeaderboard].sort((a, b) => b.score - a.score),
                });
            }, 800);
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

        // Danger zone warning near edges
        if (this.player) {
            const edgeDist = Math.min(
                this.player.x - (cx - halfArena),
                (cx + halfArena) - this.player.x,
                this.player.y - (cy - halfArena),
                (cy + halfArena) - this.player.y
            );
            if (edgeDist < 100) {
                const alpha = (1 - edgeDist / 100) * 0.15;
                ctx.fillStyle = `rgba(255, 50, 50, ${alpha})`;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
        }

        // Draw orbs (collectible glowing dots)
        for (const orb of this.pvpOrbs) {
            if (orb.dead) continue;
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
            ctx.arc(sx, sy, orb.radius || 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(sx, sy, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw enemies (mobs)
        for (const e of this.enemies) {
            if (cam.isVisible(e.x, e.y)) e.draw(ctx, cam);
        }

        // Draw XP gems
        for (const gem of this.xpGems) {
            gem.draw(ctx, cam);
        }

        // Projectiles
        for (const p of this.projectiles) {
            if (cam.isVisible(p.x, p.y)) p.draw(ctx, cam);
        }

        // Draw bots
        for (const bot of this.pvpBots) {
            if (bot.dead) continue;
            const bsx = cam.screenX(bot.x);
            const bsy = cam.screenY(bot.y);
            const br = bot.radius;

            // Invuln shimmer
            if (bot.invulnTimer > 0) {
                ctx.globalAlpha = 0.4 + Math.sin(Date.now() * 0.02) * 0.3;
            }

            // Damage flash
            if (bot.damageFlash > 0) {
                ctx.fillStyle = '#ffffff';
            } else {
                ctx.fillStyle = bot.color;
            }

            // Draw bot body (flower shape)
            ctx.beginPath();
            ctx.arc(bsx, bsy, br, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Draw bot orbitals (petals)
            for (const o of bot.orbitals) {
                if (o.dead || o.reloading) continue;
                const opos = this._getBotOrbitalPos(bot, o);
                const osx = cam.screenX(opos.x);
                const osy = cam.screenY(opos.y);
                const cfg = ORBITAL_TYPES[o.type];
                const petalR = cfg.size || 8;
                const rInfo = RARITIES[o.rarity];
                ctx.fillStyle = rInfo ? rInfo.color : cfg.color;
                ctx.beginPath();
                ctx.arc(osx, osy, petalR, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = 'rgba(0,0,0,0.2)';
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            ctx.globalAlpha = 1;

            // Bot name
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 11px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(bot.name, bsx, bsy - br - 8);

            // Bot HP bar
            const hpPct = bot.hp / bot.maxHp;
            const hpW = 40;
            const hpH = 4;
            const hpX = bsx - hpW / 2;
            const hpY = bsy - br - 18;
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(hpX, hpY, hpW, hpH);
            ctx.fillStyle = hpPct > 0.5 ? '#4ade80' : hpPct > 0.25 ? '#facc15' : '#ef4444';
            ctx.fillRect(hpX, hpY, hpW * hpPct, hpH);
        }

        // Draw player
        if (this.player) this.player.draw(ctx, cam);

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
