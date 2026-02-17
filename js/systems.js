// ═══════════════════════════════════════════════════════
// ORBITRON — Systems (Waves, Upgrades, Save)
// ═══════════════════════════════════════════════════════

// ─── Wave System ───
class WaveSystem {
    constructor(game) {
        this.game = game;
        this.wave = 0;
        this.timer = 3; // 3s grace period
        this.spawnTimer = 0;
        this.enemiesThisWave = 0;
        this.enemiesToSpawn = 0;
        this.waveActive = false;
        this.betweenWaves = true;
        this.bossSpawned = false;
    }

    getWaveScale() {
        return 1 + this.wave * 0.12;
    }

    getEnemyCount() {
        return Math.floor((8 + this.wave * 4 + Math.pow(this.wave, 1.4)) * 3);
    }

    startNextWave() {
        this.wave++;
        this.waveActive = true;
        this.betweenWaves = false;
        this.enemiesThisWave = 0;
        this.enemiesToSpawn = this.getEnemyCount();
        this.bossSpawned = false;
        this.spawnTimer = 0;
        this.game.runStats.wave = this.wave;
        // Clear loot drops that have survived 1+ waves
        for (let i = this.game.lootDrops.length - 1; i >= 0; i--) {
            if (this.wave - this.game.lootDrops[i].spawnWave >= 2) {
                this.game.lootDrops.splice(i, 1);
            }
        }
    }

    spawnEnemy() {
        const game = this.game;
        const player = game.player;
        if (game.enemies.length >= CONFIG.MAX_ENEMIES) return;

        // Spawn at distance from player
        const angle = Math.random() * Math.PI * 2;
        const dist = 500 + Math.random() * 300;
        let x = player.x + Math.cos(angle) * dist;
        let y = player.y + Math.sin(angle) * dist;
        x = Math.max(50, Math.min(CONFIG.WORLD_SIZE - 50, x));
        y = Math.max(50, Math.min(CONFIG.WORLD_SIZE - 50, y));

        const { zone, index: zoneIndex } = getZone(x, y);
        const types = getEnemyTypesForZone(zoneIndex);
        const typeKey = types[Math.floor(Math.random() * types.length)];
        const et = ENEMY_TYPES[typeKey];
        const scale = this.getWaveScale() * (1 + zoneIndex * 0.3);

        // Swarm type spawns multiples
        const count = et.spawnCount || 1;
        for (let i = 0; i < count; i++) {
            const sx = x + (Math.random() - 0.5) * 40;
            const sy = y + (Math.random() - 0.5) * 40;
            game.enemies.push(new Enemy(sx, sy, typeKey, scale));
        }
        this.enemiesThisWave += count;
    }

    spawnBoss() {
        const game = this.game;
        const player = game.player;
        const bossIndex = Math.min(Math.floor(this.wave / CONFIG.BOSS_EVERY) - 1, BOSS_TYPES.length - 1);
        const bossData = BOSS_TYPES[Math.max(0, bossIndex)];

        const angle = Math.random() * Math.PI * 2;
        const dist = 600;
        let x = player.x + Math.cos(angle) * dist;
        let y = player.y + Math.sin(angle) * dist;
        x = Math.max(100, Math.min(CONFIG.WORLD_SIZE - 100, x));
        y = Math.max(100, Math.min(CONFIG.WORLD_SIZE - 100, y));

        const scale = 1 + (this.wave / CONFIG.BOSS_EVERY - 1) * 0.5;
        const boss = new Enemy(x, y, 'blob', scale, true, {
            ...bossData,
            hp: bossData.hp * scale,
            damage: bossData.damage * scale,
        });
        game.enemies.push(boss);
        this.bossSpawned = true;

        game.showToast(`⚠️ BOSS: ${bossData.name}!`, '#ff4444', true);
        game.audio.play('boss', 0.8);
        game.camera.addShake(0.4);
    }

    update(dt) {
        if (!this.waveActive) {
            this.timer -= dt;
            if (this.timer <= 0) {
                this.startNextWave();
            }
            return;
        }

        // Spawn enemies over time
        if (this.enemiesThisWave < this.enemiesToSpawn) {
            this.spawnTimer -= dt;
            if (this.spawnTimer <= 0) {
                this.spawnEnemy();
                // Faster spawning in later waves (3x base rate)
                this.spawnTimer = Math.max(0.01, (0.2 - this.wave * 0.004) / 3);
            }
        }

        // Boss spawn
        if (this.wave % CONFIG.BOSS_EVERY === 0 && !this.bossSpawned && this.enemiesThisWave >= this.enemiesToSpawn * 0.5) {
            this.spawnBoss();
        }

        // Wave complete when all enemies spawned and cleared
        if (this.enemiesThisWave >= this.enemiesToSpawn && this.game.enemies.length === 0) {
            this.waveActive = false;
            this.betweenWaves = true;
            this.timer = 3; // 3s between waves
        }
    }
}

// ─── Upgrade System ───
class UpgradeSystem {
    constructor(game) {
        this.game = game;
    }

    generateChoices(count = 3) {
        const choices = [];
        const player = this.game.player;

        for (let i = 0; i < count; i++) {
            const roll = Math.random();

            if (roll < 0.35 && player.orbitals.length < player.maxSlots) {
                // New orbital
                const type = randomOrbitalType();
                const currentWave = this.game.waveSystem ? this.game.waveSystem.wave : 1;
                const rarity = rollRarity(player.luck, currentWave);
                const rarityData = RARITIES[rarity];
                const cfg = ORBITAL_TYPES[type];
                choices.push({
                    type: 'orbital',
                    orbitalType: type,
                    rarity: rarity,
                    icon: cfg.icon,
                    name: `${rarityData.name} ${cfg.name}`,
                    desc: cfg.desc,
                    color: rarityData.color,
                    rarityName: rarityData.name,
                });
            } else if (roll < 0.55 && player.orbitals.length > 0) {
                // Upgrade existing orbital
                const upgradeable = player.orbitals.filter(o => o.level < 10);
                if (upgradeable.length > 0) {
                    const o = upgradeable[Math.floor(Math.random() * upgradeable.length)];
                    const cfg = ORBITAL_TYPES[o.type];
                    const rarityData = RARITIES[o.rarity];
                    choices.push({
                        type: 'upgradeOrbital',
                        orbitalIndex: player.orbitals.indexOf(o),
                        icon: '⬆️',
                        name: `Upgrade ${cfg.name}`,
                        desc: `Level ${o.level} → ${o.level + 1}\n+20% damage & effects`,
                        color: rarityData.color,
                        rarityName: rarityData.name,
                    });
                } else {
                    // Fallback to stat
                    choices.push(this.randomStatChoice());
                }
            } else if (roll < 0.75) {
                // Stat upgrade
                choices.push(this.randomStatChoice());
            } else if (roll < 0.85 && player.maxSlots < 10) {
                // Extra slot
                choices.push({
                    type: 'extraSlot',
                    icon: '🔲',
                    name: 'Extra Orbital Slot',
                    desc: `Max orbitals: ${player.maxSlots} → ${player.maxSlots + 1}`,
                    color: '#ffaa00',
                    rarityName: 'Special',
                });
            } else if (roll < 0.93) {
                // Full heal
                choices.push({
                    type: 'heal',
                    icon: '💝',
                    name: 'Full Restoration',
                    desc: 'Fully restore HP',
                    color: '#ff6688',
                    rarityName: 'Special',
                });
            } else {
                // Reroll into stat
                choices.push(this.randomStatChoice());
            }
        }

        // Ensure no exact duplicates
        return choices;
    }

    randomStatChoice() {
        const s = STAT_UPGRADES[Math.floor(Math.random() * STAT_UPGRADES.length)];
        return {
            type: 'stat',
            stat: s.stat,
            amount: s.amount,
            pct: s.pct,
            icon: s.icon,
            name: s.name,
            desc: s.desc,
            color: '#aaddff',
            rarityName: 'Stat',
        };
    }

    applyChoice(choice) {
        const player = this.game.player;
        switch (choice.type) {
            case 'orbital':
                player.addOrbital(choice.orbitalType, choice.rarity);
                const ri = RARITY_ORDER.indexOf(choice.rarity);
                if (ri > (this.game.runStats.bestRarity || 0)) this.game.runStats.bestRarity = ri;
                break;
            case 'upgradeOrbital':
                player.upgradeOrbital(choice.orbitalIndex);
                break;
            case 'stat':
                player.applyStat(choice.stat, choice.amount, choice.pct);
                break;
            case 'extraSlot':
                player.maxSlots++;
                break;
            case 'heal':
                player.hp = player.maxHp;
                break;
        }
        this.game.audio.play('levelup');
        this.game.particles.ring(player.x, player.y, 20, '#00ffcc', 60, 0.5, 4);
    }
}

// ─── Save System ───
class SaveSystem {
    constructor() {
        this.key = 'orbitron_save';
    }

    getDefault() {
        return {
            stardust: 0,
            totalStardust: 0,
            permUpgrades: {},
            achievements: [],
            bestWave: 0,
            bestLevel: 0,
            bestKills: 0,
            totalKills: 0,
            totalRuns: 0,
            prestiges: 0,
            totalPlayTime: 0,
            permInventory: [],
            activeSkin: 'default',
            unlockedSkins: ['default'],
            premium: false,
            premiumExpiry: 0,
            lastDailyLogin: 0,
            starterPackOwned: false,
        };
    }

    load() {
        try {
            const data = localStorage.getItem(this.key);
            if (data) {
                const parsed = { ...this.getDefault(), ...JSON.parse(data) };
                // Deduplicate perm inventory (no two of same type+rarity)
                parsed.permInventory = this.deduplicateInventory(parsed.permInventory);
                return parsed;
            }
        } catch (e) {}
        return this.getDefault();
    }

    deduplicateInventory(inv) {
        if (!inv || !Array.isArray(inv)) return [];
        const seen = new Set();
        return inv.filter(p => {
            const key = `${p.type}|${p.rarity}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    save(data) {
        try {
            localStorage.setItem(this.key, JSON.stringify(data));
        } catch (e) {}
    }

    getUpgradeLevel(data, upgradeId) {
        return data.permUpgrades[upgradeId] || 0;
    }

    getUpgradeCost(upgrade, currentLevel) {
        return Math.floor(upgrade.baseCost * Math.pow(upgrade.costMult, currentLevel));
    }

    buyUpgrade(data, upgrade) {
        const level = this.getUpgradeLevel(data, upgrade.id);
        if (level >= upgrade.maxLevel) return false;
        const cost = this.getUpgradeCost(upgrade, level);
        if (data.stardust < cost) return false;
        data.stardust -= cost;
        data.permUpgrades[upgrade.id] = level + 1;
        this.save(data);
        return true;
    }
}

// ─── Loot Drop System ───
function tryDropLoot(game, enemy) {
    const player = game.player;
    const { zone, index: zoneIndex } = getZone(enemy.x, enemy.y);

    // Drop chance (much rarer - drops are meaningful)
    let dropChance = 0.015 + zoneIndex * 0.005;
    if (enemy.isBoss) dropChance = 0.7; // Bosses usually drop

    // Streak bonus
    const streakBonus = Math.min(game.killStreak * 0.0005, 0.03);
    dropChance += streakBonus;

    if (Math.random() > dropChance) return;

    // Roll rarity (boss gets MUCH better rarity)
    let luckMult = player.luck * zone.dropBonus;
    if (enemy.isBoss) luckMult *= 8; // bosses drop way rarer loot
    const currentWave = game.waveSystem ? game.waveSystem.wave : 1;
    const rarity = rollRarity(luckMult, currentWave);
    const type = randomOrbitalType();

    game.lootDrops.push(new LootDrop(enemy.x, enemy.y, type, rarity));
    // Tag drop with current wave
    game.lootDrops[game.lootDrops.length - 1].spawnWave = game.waveSystem ? game.waveSystem.wave : 0;

    const ri = RARITY_ORDER.indexOf(rarity);
    if (ri >= 3) { // epic+
        game.showToast(`${RARITIES[rarity].name} ${ORBITAL_TYPES[type].name} dropped!`, RARITIES[rarity].color, ri >= 4);
    }
}
