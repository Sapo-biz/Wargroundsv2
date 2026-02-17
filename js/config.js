// ═══════════════════════════════════════════════════════
// ORBITRON — Config & Game Data
// ═══════════════════════════════════════════════════════

const CONFIG = {
    WORLD_SIZE: 12000,
    TILE_SIZE: 80,
    BASE_PLAYER_RADIUS: 18,
    BASE_PLAYER_SPEED: 220,
    BASE_PLAYER_HP: 200,
    BASE_HP_REGEN: 0.5,
    BASE_PICKUP_RANGE: 80,
    BASE_ORBITAL_SPEED: 2.5,
    MAX_ENEMIES: 600,
    WAVE_DURATION: 20,        // seconds between waves
    BOSS_EVERY: 5,            // boss every N waves
    XP_CURVE_BASE: 30,
    XP_CURVE_MULT: 1.18,
    INVULN_TIME: 0.5,
    STREAK_TIMEOUT: 3,
    
    // Prestige
    STARDUST_PER_WAVE: 2,
    STARDUST_PER_LEVEL: 1,
    STARDUST_BOSS_BONUS: 15,
};

// ─── Rarity System ───
const RARITIES = {
    common:    { name: 'Common',    color: '#b0b0b0', glow: '#888888', mult: 1.0,  dropWeight: 45, bgAlpha: 0.15 },
    uncommon:  { name: 'Uncommon',  color: '#4ade80', glow: '#22c55e', mult: 1.5,  dropWeight: 25, bgAlpha: 0.18 },
    rare:      { name: 'Rare',      color: '#60a5fa', glow: '#3b82f6', mult: 2.2,  dropWeight: 15, bgAlpha: 0.20 },
    epic:      { name: 'Epic',      color: '#c084fc', glow: '#a855f7', mult: 3.2,  dropWeight: 8,  bgAlpha: 0.22 },
    legendary: { name: 'Legendary', color: '#fb923c', glow: '#f97316', mult: 4.5,  dropWeight: 4,  bgAlpha: 0.25 },
    mythic:    { name: 'Mythic',    color: '#f43f5e', glow: '#e11d48', mult: 6.5,  dropWeight: 2,  bgAlpha: 0.28 },
    divine:    { name: 'Divine',    color: '#facc15', glow: '#eab308', mult: 9.0,  dropWeight: 0.8, bgAlpha: 0.32, rainbow: true },
    cosmic:    { name: 'Cosmic',    color: '#ff00ff', glow: '#ff44ff', mult: 14.0, dropWeight: 0.2, bgAlpha: 0.38, rainbow: true, prismatic: true },
    eternal:   { name: 'Eternal',   color: '#00ffcc', glow: '#00ddaa', mult: 20.0, dropWeight: 0.05, bgAlpha: 0.42, rainbow: true, prismatic: true },
};
const RARITY_ORDER = Object.keys(RARITIES);

// Wave-based rarity caps — percentage chance each rarity CAN appear
// Interpolated smoothly between defined wave breakpoints
const WAVE_RARITY_TABLE = [
    // wave: [common, uncommon, rare, epic, legendary, mythic, divine, cosmic, eternal]
    // Bosses spawn every 5 waves — rarity gates tied to boss progression
    { wave: 1,   rates: [100,  80,   50,   10,    1,    0,     0,     0,     0] },
    { wave: 5,   rates: [100, 99.6, 92.7, 41.1,  4.5,  0.3, 0.001,    0,    0] },
    { wave: 10,  rates: [100,  100, 94.8, 72.2, 14.7,  0.9,  0.02,    0,    0] },
    { wave: 15,  rates: [100,  100, 99.9, 95.5, 47.7,  3.1,   0.1,    0,    0] },
    { wave: 20,  rates: [100,  100,  100,  100, 79.2, 17.7,   1.9, 0.03, 0.003] },
    { wave: 25,  rates: [100,  100,  100,  100, 99.8, 41.9,   7.6,  0.3,  0.02] },
    { wave: 30,  rates: [100,  100,  100,  100,  100, 82.7,  21.6,  1.5,  0.08] },
    { wave: 35,  rates: [100,  100,  100,  100,  100, 99.8,  44.1,  3.5,  0.15] },
    { wave: 40,  rates: [100,  100,  100,  100,  100,  100,  67.6,  8.0,  0.4] },
    { wave: 50,  rates: [100,  100,  100,  100,  100,  100,  90.0, 20.0,  1.5] },
    { wave: 60,  rates: [100,  100,  100,  100,  100,  100,  100,  40.0,  4.0] },
    { wave: 75,  rates: [100,  100,  100,  100,  100,  100,  100,  65.0, 10.0] },
    { wave: 100, rates: [100,  100,  100,  100,  100,  100,  100,  100,  25.0] },
];

function getWaveRarityCaps(wave) {
    const t = WAVE_RARITY_TABLE;
    if (wave <= t[0].wave) return t[0].rates;
    if (wave >= t[t.length - 1].wave) return t[t.length - 1].rates;
    for (let i = 0; i < t.length - 1; i++) {
        if (wave >= t[i].wave && wave <= t[i + 1].wave) {
            const frac = (wave - t[i].wave) / (t[i + 1].wave - t[i].wave);
            return t[i].rates.map((v, j) => v + (t[i + 1].rates[j] - v) * frac);
        }
    }
    return t[t.length - 1].rates;
}

function rollRarity(luckMult = 1, wave = 20) {
    const caps = getWaveRarityCaps(wave);
    const weights = [];
    let total = 0;
    for (let i = 0; i < RARITY_ORDER.length; i++) {
        const key = RARITY_ORDER[i];
        // If this rarity has 0% cap at this wave, skip it
        if (caps[i] <= 0) { weights.push(0); continue; }
        let w = RARITIES[key].dropWeight;
        // Luck increases weight of rarer items (epic+)
        if (i >= 3) w *= luckMult;
        // Scale weight by wave cap percentage
        w *= (caps[i] / 100);
        weights.push(w);
        total += w;
    }
    let r = Math.random() * total;
    for (let i = 0; i < weights.length; i++) {
        r -= weights[i];
        if (r <= 0) return RARITY_ORDER[i];
    }
    return 'common';
}

// ─── Orbital Types ───
const ORBITAL_TYPES = {
    blade: {
        name: 'Blade',
        icon: '⚔️',
        desc: 'Spinning blade that slashes nearby enemies',
        baseDmg: 15,
        range: 55,
        attackSpeed: 0,  // contact damage per tick
        orbitDist: 50,
        color: '#ff6666',
        type: 'melee',
    },
    shooter: {
        name: 'Shooter',
        icon: '🔫',
        desc: 'Fires projectiles at the nearest enemy',
        baseDmg: 10,
        range: 250,
        attackSpeed: 1.2,
        orbitDist: 40,
        color: '#66bbff',
        type: 'ranged',
        projSpeed: 400,
        projSize: 4,
    },
    nova: {
        name: 'Nova',
        icon: '💥',
        desc: 'Periodically explodes dealing AoE damage',
        baseDmg: 25,
        range: 120,
        attackSpeed: 3,
        orbitDist: 35,
        color: '#ffaa44',
        type: 'aoe',
    },
    frost: {
        name: 'Frost',
        icon: '❄️',
        desc: 'Slows enemies on contact',
        baseDmg: 8,
        range: 60,
        attackSpeed: 0,
        orbitDist: 55,
        color: '#88ddff',
        type: 'melee',
        slow: 0.5,
    },
    leech: {
        name: 'Leech',
        icon: '💚',
        desc: 'Steals life from enemies',
        baseDmg: 7,
        range: 70,
        attackSpeed: 0,
        orbitDist: 45,
        color: '#66ff88',
        type: 'melee',
        lifeSteal: 0.3,
    },
    chain: {
        name: 'Chain Lightning',
        icon: '⚡',
        desc: 'Lightning that bounces between enemies',
        baseDmg: 12,
        range: 200,
        attackSpeed: 1.5,
        orbitDist: 40,
        color: '#ffff44',
        type: 'chain',
        bounces: 3,
        bounceRange: 150,
    },
    shield: {
        name: 'Shield',
        icon: '🛡️',
        desc: 'Blocks incoming damage',
        baseDmg: 5,
        range: 45,
        attackSpeed: 0,
        orbitDist: 60,
        color: '#8888ff',
        type: 'shield',
        blockAmount: 0.15,
    },
    fire: {
        name: 'Inferno',
        icon: '🔥',
        desc: 'Ignites enemies, dealing damage over time',
        baseDmg: 6,
        range: 65,
        attackSpeed: 0,
        orbitDist: 50,
        color: '#ff4400',
        type: 'melee',
        burnDmg: 5,
        burnDuration: 3,
    },
    laser: {
        name: 'Laser',
        icon: '🔴',
        desc: 'Fires a continuous piercing beam that damages all enemies in a line',
        baseDmg: 18,
        range: 400,
        attackSpeed: 0.08,
        orbitDist: 35,
        color: '#ff0044',
        type: 'laser',
        beamWidth: 4,
    },
};
const ORBITAL_TYPE_KEYS = Object.keys(ORBITAL_TYPES);

function randomOrbitalType() {
    return ORBITAL_TYPE_KEYS[Math.floor(Math.random() * ORBITAL_TYPE_KEYS.length)];
}

// ─── Petal Shop Prices (USD) ───
const PETAL_SHOP_PRICES = {
    divine: 2.99,
    cosmic: 5.99,
    eternal: 9.99,
};

// ─── Death Upsell Messages ───
const DEATH_UPSELL_MESSAGES = [
    { icon: '💀⚔️', title: 'SKILL ISSUE?', slogan: "Tired of nobbing? Maybe it's your petals, not your aim." },
    { icon: '🪦😭', title: 'RIP BOZO', slogan: "That was embarrassing. These petals would've saved you." },
    { icon: '😤🔥', title: 'NOT LIKE THIS', slogan: "You were SO close. Imagine if you had these though..." },
    { icon: '💔🌸', title: 'YOUR PETALS SUCK', slogan: "Common petals in wave 15? You need an upgrade, chief." },
    { icon: '🤡🎪', title: 'CLOWN MOMENT', slogan: "Dying to that enemy? Couldn't be us (if we had these)." },
    { icon: '😵💫', title: 'WASTED', slogan: "Wave over. Dreams over. Unless you gear up for next time..." },
    { icon: '🦴🪦', title: 'REST IN PETALS', slogan: "Gone but not forgotten. Come back stronger with divine gear." },
    { icon: '🐣🔰', title: "NOOB ARC?", slogan: "Everyone starts somewhere. Start with better petals, maybe?" },
    { icon: '😎⚡', title: "MAIN CHARACTER ENERGY", slogan: "The protagonist always has the best gear. Just saying." },
    { icon: '🧊❄️', title: "COLD. DEAD. DONE.", slogan: "Frozen in shame. Thaw out with these OP petals." },
    { icon: '🫠🔥', title: "MELTED", slogan: "That wave melted you faster than ice cream in July." },
    { icon: '💸🎯', title: "INVEST IN YOURSELF", slogan: "You spent time dying. Spend a little on winning instead." },
    { icon: '🪜📈', title: "CLIMB FASTER", slogan: "Why grind 50 waves when you can start with the best?" },
    { icon: '🎭😈', title: "PLOT TWIST", slogan: "The real boss was your loadout all along." },
    { icon: '🐢🏃', title: "TOO SLOW", slogan: "They were faster. You were weaker. Fix that." },
    { icon: '💀🍕', title: "DELIVERED", slogan: "You just got absolutely delivered. Want a glow-up?" },
    { icon: '🎲🍀', title: "BETTER LUCK?", slogan: "Or you could skip luck and just buy the good stuff." },
    { icon: '🧠💡', title: "BIG BRAIN MOVE", slogan: "Smart players buy smart petals. Just saying..." },
    { icon: '🤢🗑️', title: "THAT WAS ROUGH", slogan: "Let's never speak of this run again. Start fresh with divine gear." },
    { icon: '👻🌀', title: "GHOSTED", slogan: "You got ghosted by wave enemies. Haunt them back with these." },
];

// ─── Zones ───
const ZONES = [
    { name: 'Meadow',   maxDist: 1500,  color: '#1a3a1a', bgColor: '#0d1f0d', enemyLevel: 1, dropBonus: 1.0 },
    { name: 'Forest',   maxDist: 3000,  color: '#0f2f1a', bgColor: '#081a0f', enemyLevel: 2, dropBonus: 1.3 },
    { name: 'Desert',   maxDist: 5000,  color: '#3a3018', bgColor: '#1f1a0d', enemyLevel: 3, dropBonus: 1.7 },
    { name: 'Tundra',   maxDist: 7500,  color: '#1a2a3a', bgColor: '#0d1520', enemyLevel: 4, dropBonus: 2.2 },
    { name: 'Volcanic', maxDist: 10000, color: '#3a1010', bgColor: '#200808', enemyLevel: 5, dropBonus: 3.0 },
    { name: 'Void',     maxDist: 99999, color: '#1a0a2a', bgColor: '#0d0518', enemyLevel: 6, dropBonus: 4.5 },
];

function getZone(x, y) {
    const cx = CONFIG.WORLD_SIZE / 2;
    const cy = CONFIG.WORLD_SIZE / 2;
    const dist = Math.hypot(x - cx, y - cy);
    for (let i = 0; i < ZONES.length; i++) {
        if (dist < ZONES[i].maxDist) return { zone: ZONES[i], index: i };
    }
    return { zone: ZONES[ZONES.length - 1], index: ZONES.length - 1 };
}

// ─── Enemy Types ───
const ENEMY_TYPES = {
    blob: {
        name: 'Blob', color: '#44cc44', radius: 14, hp: 15, damage: 14, speed: 65,
        xp: 10, minZone: 0, maxZone: 2, shape: 'circle',
    },
    dasher: {
        name: 'Dasher', color: '#ff8844', radius: 11, hp: 11, damage: 20, speed: 170,
        xp: 15, minZone: 0, maxZone: 3, shape: 'triangle', dashInterval: 2.2, dashSpeed: 500,
    },
    charger: {
        name: 'Charger', color: '#ff2200', radius: 16, hp: 22, damage: 30, speed: 50,
        xp: 20, minZone: 0, maxZone: 4, shape: 'triangle', dashInterval: 1.8, dashSpeed: 700,
    },
    tank: {
        name: 'Tank', color: '#888888', radius: 22, hp: 55, damage: 22, speed: 45,
        xp: 25, minZone: 1, maxZone: 4, shape: 'square',
    },
    swarm: {
        name: 'Swarmer', color: '#cccc44', radius: 7, hp: 6, damage: 10, speed: 130,
        xp: 5, minZone: 1, maxZone: 5, shape: 'circle', spawnCount: 5,
    },
    bomber: {
        name: 'Bomber', color: '#ff6622', radius: 13, hp: 12, damage: 35, speed: 80,
        xp: 18, minZone: 1, maxZone: 4, shape: 'diamond', shootInterval: 2.0, shootRange: 250, projSpeed: 260,
    },
    sniper: {
        name: 'Sniper', color: '#ff4488', radius: 12, hp: 18, damage: 28, speed: 55,
        xp: 20, minZone: 2, maxZone: 5, shape: 'diamond', shootInterval: 2.0, shootRange: 400, projSpeed: 350,
    },
    splitter: {
        name: 'Splitter', color: '#44cccc', radius: 18, hp: 32, damage: 16, speed: 75,
        xp: 30, minZone: 2, maxZone: 5, shape: 'square', splitCount: 4,
    },
    necromancer: {
        name: 'Necromancer', color: '#884488', radius: 14, hp: 28, damage: 12, speed: 45,
        xp: 35, minZone: 2, maxZone: 5, shape: 'diamond', healRange: 200, healAmount: 8, healInterval: 1.5,
    },
    healer: {
        name: 'Healer', color: '#66ff66', radius: 13, hp: 22, damage: 10, speed: 55,
        xp: 25, minZone: 3, maxZone: 5, shape: 'diamond', healRange: 180, healAmount: 8, healInterval: 1.5,
    },
    juggernaut: {
        name: 'Juggernaut', color: '#cc6600', radius: 26, hp: 100, damage: 30, speed: 35,
        xp: 50, minZone: 3, maxZone: 5, shape: 'square',
    },
    assassin: {
        name: 'Assassin', color: '#ff00aa', radius: 10, hp: 15, damage: 40, speed: 200,
        xp: 35, minZone: 3, maxZone: 5, shape: 'triangle', dashInterval: 1.5, dashSpeed: 650,
        phaseInterval: 3, phaseChance: 0.4,
    },
    wraith: {
        name: 'Wraith', color: '#aa44ff', radius: 15, hp: 45, damage: 28, speed: 110,
        xp: 40, minZone: 4, maxZone: 5, shape: 'circle', phaseInterval: 3, phaseChance: 0.3,
    },
    spawner: {
        name: 'Hive Mother', color: '#aaff00', radius: 20, hp: 40, damage: 8, speed: 35,
        xp: 40, minZone: 0, maxZone: 5, shape: 'diamond',
        spawnerInterval: 3, spawnerType: 'blob', spawnerCount: 3,
    },
    megaSpawner: {
        name: 'Brood Queen', color: '#88ff44', radius: 25, hp: 75, damage: 12, speed: 30,
        xp: 60, minZone: 2, maxZone: 5, shape: 'diamond',
        spawnerInterval: 2, spawnerType: 'swarm', spawnerCount: 2,
    },
    parasite: {
        name: 'Parasite', color: '#99ff33', radius: 6, hp: 4, damage: 15, speed: 180,
        xp: 3, minZone: 0, maxZone: 5, shape: 'circle', spawnCount: 6,
    },
    crawler: {
        name: 'Crawler', color: '#cc8844', radius: 9, hp: 9, damage: 18, speed: 140,
        xp: 8, minZone: 0, maxZone: 3, shape: 'triangle',
    },
    golem: {
        name: 'Golem', color: '#886644', radius: 30, hp: 150, damage: 35, speed: 25,
        xp: 70, minZone: 3, maxZone: 5, shape: 'square',
    },
    voidling: {
        name: 'Voidling', color: '#6600cc', radius: 8, hp: 8, damage: 22, speed: 160,
        xp: 12, minZone: 4, maxZone: 5, shape: 'circle', phaseInterval: 2, phaseChance: 0.5,
    },
};

function getEnemyTypesForZone(zoneIndex) {
    const types = [];
    for (const [key, et] of Object.entries(ENEMY_TYPES)) {
        if (zoneIndex >= et.minZone && zoneIndex <= et.maxZone) {
            types.push(key);
        }
    }
    return types.length > 0 ? types : ['blob'];
}

// ─── Boss Types ───
const BOSS_TYPES = [
    { name: 'King Blob', color: '#22ff22', radius: 55, hp: 450, damage: 12, speed: 70, xp: 300, shape: 'circle',
      dashInterval: 2.5, dashSpeed: 400, shootInterval: 1.2, shootRange: 350, projSpeed: 280,
      spawnerInterval: 4, spawnerType: 'blob', spawnerCount: 5,
      spiralShot: true, spiralInterval: 3, spiralCount: 8, spiralSpeed: 200,
      burstShot: true, burstInterval: 5, burstCount: 12, burstSpeed: 250 },
    { name: 'Mega Tank', color: '#aaaaaa', radius: 60, hp: 840, damage: 15, speed: 50, xp: 500, shape: 'square',
      shootInterval: 0.6, shootRange: 400, projSpeed: 300, dashInterval: 4, dashSpeed: 350,
      healRange: 250, healAmount: 20, healInterval: 2.5,
      shieldPhase: true, shieldInterval: 8, shieldDuration: 3,
      spiralShot: true, spiralInterval: 4, spiralCount: 12, spiralSpeed: 180,
      spawnerInterval: 6, spawnerType: 'tank', spawnerCount: 2 },
    { name: 'Storm Lord', color: '#ffff00', radius: 50, hp: 660, damage: 18, speed: 100, xp: 600, shape: 'diamond',
      shootInterval: 0.3, shootRange: 500, projSpeed: 450, dashInterval: 1.5, dashSpeed: 600,
      phaseInterval: 3, phaseChance: 0.4,
      spiralShot: true, spiralInterval: 2, spiralCount: 16, spiralSpeed: 300,
      burstShot: true, burstInterval: 3, burstCount: 20, burstSpeed: 350,
      teleport: true, teleportInterval: 6, teleportRange: 300 },
    { name: 'Void Titan', color: '#cc44ff', radius: 65, hp: 450, damage: 20, speed: 65, xp: 900, shape: 'square',
      phaseInterval: 2.5, phaseChance: 0.5, shootInterval: 0.5, shootRange: 450, projSpeed: 350,
      dashInterval: 3, dashSpeed: 450, spawnerInterval: 4, spawnerType: 'voidling', spawnerCount: 4,
      spiralShot: true, spiralInterval: 3, spiralCount: 20, spiralSpeed: 250,
      shieldPhase: true, shieldInterval: 10, shieldDuration: 4,
      burstShot: true, burstInterval: 4, burstCount: 16, burstSpeed: 300,
      healRange: 300, healAmount: 15, healInterval: 3 },
    { name: 'Infernal Dragon', color: '#ff4400', radius: 60, hp: 540, damage: 22, speed: 90, xp: 1200, shape: 'triangle',
      dashInterval: 1.2, dashSpeed: 700, shootInterval: 0.4, shootRange: 500, projSpeed: 500,
      phaseInterval: 4, phaseChance: 0.3, spawnerInterval: 3, spawnerType: 'crawler', spawnerCount: 6,
      spiralShot: true, spiralInterval: 2, spiralCount: 24, spiralSpeed: 350,
      burstShot: true, burstInterval: 3, burstCount: 24, burstSpeed: 400,
      teleport: true, teleportInterval: 5, teleportRange: 350,
      areaDenial: true, areaInterval: 4, areaCount: 5, areaRadius: 40, areaDuration: 3, areaDmg: 8 },
    { name: 'Necro Overlord', color: '#884488', radius: 55, hp: 400, damage: 14, speed: 60, xp: 1000, shape: 'diamond',
      healRange: 400, healAmount: 50, healInterval: 1.2, shootInterval: 0.6, shootRange: 450, projSpeed: 350,
      dashInterval: 3, dashSpeed: 400, spawnerInterval: 2.5, spawnerType: 'swarm', spawnerCount: 4,
      phaseInterval: 4, phaseChance: 0.3,
      spiralShot: true, spiralInterval: 3, spiralCount: 16, spiralSpeed: 250,
      burstShot: true, burstInterval: 5, burstCount: 20, burstSpeed: 280,
      shieldPhase: true, shieldInterval: 12, shieldDuration: 3 },
    { name: 'Cosmic Entity', color: '#ff00ff', radius: 70, hp: 900, damage: 25, speed: 80, xp: 2000, shape: 'circle',
      dashInterval: 1.5, dashSpeed: 600, shootInterval: 0.25, shootRange: 550, projSpeed: 500,
      phaseInterval: 2.5, phaseChance: 0.5, spawnerInterval: 3, spawnerType: 'assassin', spawnerCount: 3,
      healRange: 350, healAmount: 30, healInterval: 2,
      spiralShot: true, spiralInterval: 1.5, spiralCount: 24, spiralSpeed: 350,
      burstShot: true, burstInterval: 2.5, burstCount: 30, burstSpeed: 400,
      teleport: true, teleportInterval: 4, teleportRange: 400,
      shieldPhase: true, shieldInterval: 10, shieldDuration: 4,
      areaDenial: true, areaInterval: 3, areaCount: 6, areaRadius: 50, areaDuration: 4, areaDmg: 10 },
    { name: 'The Void', color: '#000000', radius: 80, hp: 1800, damage: 30, speed: 70, xp: 5000, shape: 'diamond',
      dashInterval: 1, dashSpeed: 750, shootInterval: 0.15, shootRange: 600, projSpeed: 550,
      phaseInterval: 1.5, phaseChance: 0.6, spawnerInterval: 2, spawnerType: 'wraith', spawnerCount: 4,
      healRange: 500, healAmount: 80, healInterval: 1.5,
      spiralShot: true, spiralInterval: 1, spiralCount: 32, spiralSpeed: 400,
      burstShot: true, burstInterval: 2, burstCount: 36, burstSpeed: 450,
      teleport: true, teleportInterval: 3, teleportRange: 500,
      shieldPhase: true, shieldInterval: 8, shieldDuration: 5,
      areaDenial: true, areaInterval: 2.5, areaCount: 8, areaRadius: 60, areaDuration: 5, areaDmg: 12 },
    { name: 'Abyssal Leviathan', color: '#003366', radius: 85, hp: 2400, damage: 32, speed: 60, xp: 7000, shape: 'circle',
      dashInterval: 2, dashSpeed: 600, shootInterval: 0.2, shootRange: 550, projSpeed: 500,
      phaseInterval: 3, phaseChance: 0.4, spawnerInterval: 2.5, spawnerType: 'golem', spawnerCount: 3,
      healRange: 400, healAmount: 60, healInterval: 2,
      spiralShot: true, spiralInterval: 1.5, spiralCount: 28, spiralSpeed: 350,
      burstShot: true, burstInterval: 2.5, burstCount: 32, burstSpeed: 400,
      teleport: true, teleportInterval: 5, teleportRange: 400,
      shieldPhase: true, shieldInterval: 9, shieldDuration: 4,
      areaDenial: true, areaInterval: 2, areaCount: 10, areaRadius: 55, areaDuration: 4, areaDmg: 10 },
    { name: 'Eternal Warden', color: '#00ffcc', radius: 75, hp: 3000, damage: 35, speed: 85, xp: 10000, shape: 'diamond',
      dashInterval: 0.8, dashSpeed: 800, shootInterval: 0.12, shootRange: 600, projSpeed: 600,
      phaseInterval: 2, phaseChance: 0.5, spawnerInterval: 2, spawnerType: 'assassin', spawnerCount: 4,
      healRange: 450, healAmount: 40, healInterval: 1.5,
      spiralShot: true, spiralInterval: 1, spiralCount: 36, spiralSpeed: 400,
      burstShot: true, burstInterval: 2, burstCount: 40, burstSpeed: 450,
      teleport: true, teleportInterval: 3, teleportRange: 450,
      shieldPhase: true, shieldInterval: 7, shieldDuration: 4,
      areaDenial: true, areaInterval: 2, areaCount: 8, areaRadius: 65, areaDuration: 4, areaDmg: 12 },
    { name: 'The Singularity', color: '#ffffff', radius: 90, hp: 4000, damage: 40, speed: 75, xp: 15000, shape: 'circle',
      dashInterval: 0.6, dashSpeed: 900, shootInterval: 0.1, shootRange: 650, projSpeed: 650,
      phaseInterval: 1.5, phaseChance: 0.6, spawnerInterval: 1.5, spawnerType: 'wraith', spawnerCount: 5,
      healRange: 500, healAmount: 50, healInterval: 1.2,
      spiralShot: true, spiralInterval: 0.8, spiralCount: 40, spiralSpeed: 450,
      burstShot: true, burstInterval: 1.5, burstCount: 48, burstSpeed: 500,
      teleport: true, teleportInterval: 2.5, teleportRange: 500,
      shieldPhase: true, shieldInterval: 6, shieldDuration: 5,
      areaDenial: true, areaInterval: 1.5, areaCount: 12, areaRadius: 70, areaDuration: 5, areaDmg: 15 },
];

// ─── Permanent Upgrades (Prestige Store) ───
const PERM_UPGRADES = [
    { id: 'pMaxHp',       name: 'Fortitude',    icon: '❤️', maxLevel: 20, baseCost: 10, costMult: 1.5, effect: 0.05, desc: '+5% Max HP per level' },
    { id: 'pDamage',      name: 'Might',        icon: '⚔️', maxLevel: 20, baseCost: 10, costMult: 1.5, effect: 0.05, desc: '+5% Damage per level' },
    { id: 'pSpeed',       name: 'Swiftness',    icon: '💨', maxLevel: 15, baseCost: 12, costMult: 1.5, effect: 0.03, desc: '+3% Speed per level' },
    { id: 'pLuck',        name: 'Fortune',      icon: '🍀', maxLevel: 20, baseCost: 15, costMult: 1.6, effect: 0.05, desc: '+5% Luck per level' },
    { id: 'pRegen',       name: 'Vitality',     icon: '💖', maxLevel: 15, baseCost: 12, costMult: 1.5, effect: 0.08, desc: '+8% HP Regen per level' },
    { id: 'pXpGain',      name: 'Wisdom',       icon: '📚', maxLevel: 15, baseCost: 15, costMult: 1.6, effect: 0.05, desc: '+5% XP Gain per level' },
    { id: 'pPickup',      name: 'Magnetism',    icon: '🧲', maxLevel: 10, baseCost: 8,  costMult: 1.4, effect: 0.08, desc: '+8% Pickup Range per level' },
    { id: 'pOrbitalSpd',  name: 'Orbit Speed',  icon: '🌀', maxLevel: 10, baseCost: 12, costMult: 1.5, effect: 0.04, desc: '+4% Orbital Speed per level' },
    { id: 'pStartLevel',  name: 'Head Start',   icon: '⭐', maxLevel: 5,  baseCost: 50, costMult: 2.0, effect: 1,    desc: 'Start +1 level per level' },
    { id: 'pExtraSlot',   name: 'Extra Slot',   icon: '🔲', maxLevel: 4,  baseCost: 80, costMult: 2.5, effect: 1,    desc: '+1 Orbital slot per level' },
];

// ─── Achievements ───
const ACHIEVEMENTS = [
    { id: 'kill100',    name: 'Hundred Club',      desc: 'Kill 100 enemies in one run',         check: s => s.kills >= 100,    reward: '🍀 +2% Luck' },
    { id: 'kill500',    name: 'Slayer',             desc: 'Kill 500 enemies in one run',         check: s => s.kills >= 500,    reward: '⚔️ +3% Damage' },
    { id: 'kill2000',   name: 'Annihilator',        desc: 'Kill 2000 enemies in one run',        check: s => s.kills >= 2000,   reward: '⚔️ +5% Damage' },
    { id: 'wave10',     name: 'Survivor',           desc: 'Reach wave 10',                       check: s => s.wave >= 10,      reward: '❤️ +3% Max HP' },
    { id: 'wave25',     name: 'Hardened',           desc: 'Reach wave 25',                       check: s => s.wave >= 25,      reward: '❤️ +5% Max HP' },
    { id: 'wave50',     name: 'Unstoppable',        desc: 'Reach wave 50',                       check: s => s.wave >= 50,      reward: '⚔️ +8% Damage' },
    { id: 'level20',    name: 'Growing Strong',     desc: 'Reach level 20',                      check: s => s.level >= 20,     reward: '📚 +3% XP' },
    { id: 'level50',    name: 'Ascended',           desc: 'Reach level 50',                      check: s => s.level >= 50,     reward: '📚 +5% XP' },
    { id: 'legendary',  name: 'Legendary Find',     desc: 'Obtain a Legendary orbital',          check: s => s.bestRarity >= 4, reward: '🍀 +5% Luck' },
    { id: 'mythic',     name: 'Mythic Discovery',   desc: 'Obtain a Mythic orbital',             check: s => s.bestRarity >= 5, reward: '🍀 +8% Luck' },
    { id: 'divine',     name: 'Divine Blessing',    desc: 'Obtain a Divine orbital',             check: s => s.bestRarity >= 6, reward: '🍀 +10% Luck' },
    { id: 'cosmic',     name: 'Cosmic Convergence', desc: 'Obtain a Cosmic orbital',             check: s => s.bestRarity >= 7, reward: '✦ +50 Stardust' },
    { id: 'streak20',   name: 'On Fire',            desc: 'Reach a 20 kill streak',              check: s => s.bestStreak >= 20, reward: '💨 +2% Speed' },
    { id: 'streak50',   name: 'Rampage',            desc: 'Reach a 50 kill streak',              check: s => s.bestStreak >= 50, reward: '💨 +4% Speed' },
    { id: 'boss1',      name: 'Boss Hunter',        desc: 'Defeat your first boss',              check: s => s.bossKills >= 1,  reward: '⚔️ +3% Damage' },
    { id: 'boss10',     name: 'Boss Slayer',        desc: 'Defeat 10 bosses in one run',         check: s => s.bossKills >= 10, reward: '⚔️ +5% Damage' },
    { id: 'zone3',      name: 'Explorer',           desc: 'Reach the Desert zone',               check: s => s.bestZone >= 2,   reward: '💨 +3% Speed' },
    { id: 'zone5',      name: 'Voidwalker',         desc: 'Reach the Void zone',                 check: s => s.bestZone >= 5,   reward: '🍀 +10% Luck' },
    { id: 'prestige1',  name: 'Reborn',             desc: 'Prestige for the first time',         check: s => s.prestiges >= 1,  reward: '✦ +20 Stardust' },
    { id: 'time10',     name: 'Survivor Pro',       desc: 'Survive for 10 minutes',              check: s => s.time >= 600,     reward: '💖 +5% Regen' },
];

// ─── Stat Upgrade Choices for Level Up ───
const STAT_UPGRADES = [
    { stat: 'maxHp',       name: 'Max HP',      icon: '❤️', amount: 15,   desc: '+15 Max HP',         pct: false },
    { stat: 'hpRegen',     name: 'HP Regen',     icon: '💖', amount: 0.3,  desc: '+0.3 HP/s',          pct: false },
    { stat: 'speed',       name: 'Speed',        icon: '💨', amount: 0.08, desc: '+8% Speed',          pct: true },
    { stat: 'damage',      name: 'Damage',       icon: '⚔️', amount: 0.10, desc: '+10% Damage',        pct: true },
    { stat: 'armor',       name: 'Armor',        icon: '🛡️', amount: 3,    desc: '+3 Armor',           pct: false },
    { stat: 'luck',        name: 'Luck',         icon: '🍀', amount: 0.08, desc: '+8% Drop Luck',      pct: true },
    { stat: 'xpGain',      name: 'XP Gain',      icon: '📚', amount: 0.10, desc: '+10% XP Gain',       pct: true },
    { stat: 'pickupRange', name: 'Pickup Range', icon: '🧲', amount: 0.12, desc: '+12% Pickup Range',  pct: true },
    { stat: 'orbitalSpeed',name: 'Orbit Speed',  icon: '🌀', amount: 0.08, desc: '+8% Orbital Speed',  pct: true },
];

// ─── Player Skins ───
const PLAYER_SKINS = [
    { id: 'default',  name: 'Default',  cost: 0,    bodyColor: '#00ccff', glowColor: '#00aaff', highlightColor: '#aaeeff', trailColor: '#00bbff', icon: '🔵' },
    { id: 'ember',    name: 'Ember',    cost: 50,   bodyColor: '#ff6622', glowColor: '#ff4400', highlightColor: '#ffaa66', trailColor: '#ff4400', icon: '🔥' },
    { id: 'frost',    name: 'Frost',    cost: 100,  bodyColor: '#aaddff', glowColor: '#6699ff', highlightColor: '#eeffff', trailColor: '#88bbff', icon: '❄️' },
    { id: 'shadow',   name: 'Shadow',   cost: 150,  bodyColor: '#8844cc', glowColor: '#6622aa', highlightColor: '#bb88ee', trailColor: '#6622aa', icon: '🌑' },
    { id: 'gilded',   name: 'Gilded',   cost: 200,  bodyColor: '#ffcc00', glowColor: '#cc9900', highlightColor: '#ffee88', trailColor: '#ccaa00', icon: '✨' },
    { id: 'neon',     name: 'Neon',     cost: 300,  bodyColor: '#00ff66', glowColor: '#00cc44', highlightColor: '#88ffbb', trailColor: '#00ee55', icon: '💚' },
    { id: 'nebula',   name: 'Nebula',   cost: 500,  bodyColor: '#ff44cc', glowColor: '#cc22aa', highlightColor: '#ffaaee', trailColor: '#ff22bb', icon: '🌌' },
    { id: 'crimson',  name: 'Crimson',  cost: 750,  bodyColor: '#cc2222', glowColor: '#990000', highlightColor: '#ff6666', trailColor: '#aa1111', icon: '🩸' },
    { id: 'prism',    name: 'Prism',    cost: 1000, bodyColor: 'prism',   glowColor: 'prism',   highlightColor: '#ffffff', trailColor: 'prism',   icon: '🌈', rainbow: true },
];

// ─── Global PVP Zones ───
const PVP_ZONES = [
    {
        id: 1, name: 'Starter Arena', color: '#4ade80', bgColor: '#0d1f0d',
        hp: 1000, regen: 10, // 1% of 1000
        maxRarity: 'rare', // no inventory or up to rare
        allowedRarities: ['common', 'uncommon', 'rare'],
        arenaSize: 3000, botCount: 5, mobSpawnInterval: 8,
        desc: 'Common – Rare petals only',
        icon: '🌱',
    },
    {
        id: 2, name: 'Epic Grounds', color: '#c084fc', bgColor: '#150d20',
        hp: 2000, regen: 20,
        maxRarity: 'legendary',
        allowedRarities: ['epic', 'legendary'],
        arenaSize: 4000, botCount: 6, mobSpawnInterval: 7,
        desc: 'Epic – Legendary petals',
        icon: '⚔️',
    },
    {
        id: 3, name: 'Mythic Warzone', color: '#f43f5e', bgColor: '#200810',
        hp: 4000, regen: 40,
        maxRarity: 'divine',
        allowedRarities: ['mythic', 'divine'],
        arenaSize: 5000, botCount: 7, mobSpawnInterval: 6,
        desc: 'Mythic – Divine petals',
        icon: '🔥',
    },
    {
        id: 4, name: 'Eternal Abyss', color: '#00ffcc', bgColor: '#050d18',
        hp: 8000, regen: 80,
        maxRarity: 'eternal',
        allowedRarities: ['cosmic', 'eternal'],
        arenaSize: 6000, botCount: 8, mobSpawnInterval: 5,
        desc: 'Cosmic – Eternal petals',
        icon: '🌌',
    },
];

const PVP_SCORE = {
    ORB: 10,
    KILL: 1000,
};

const PVP_REGEN_DELAY = 5; // seconds without damage before regen activates
