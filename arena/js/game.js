/**
 * WARGROUNDS — Swarm (bees & petals)
 * Client-side game loop: bees, petals, enemies, level-up.
 * URL: wargrounds.online/swarm  or  arena.wargrounds.online
 */

(function () {
  'use strict';

  const MENU = document.getElementById('menu');
  const GAME_SCREEN = document.getElementById('game-screen');
  const BTN_PLAY = document.getElementById('btn-play');
  const CANVAS = document.getElementById('game-canvas');
  const MINIMAP = document.getElementById('minimap');
  const HUD_SCORE = document.getElementById('hud-score-value');
  const HUD_LEVEL = document.getElementById('hud-level-value');
  const HUD_HEALTH = document.getElementById('hud-health-value');
  const HUD_HEALTH_BAR = document.getElementById('hud-health-bar');
  const OVERLAY_RESPAWN = document.getElementById('overlay-respawn');
  const RESPAWN_TIMER_EL = document.getElementById('respawn-timer');
  const OVERLAY_LEVEL_UP = document.getElementById('overlay-level-up');
  const OVERLAY_DAMAGE = document.getElementById('overlay-damage');
  const HUD_XP_NEXT = document.getElementById('hud-xp-next');
  const HUD_XP_BAR = document.getElementById('hud-xp-bar');
  const HUD_TIER_VALUE = document.getElementById('hud-tier-value');
  const HUD_TIER_NEXT = document.getElementById('hud-tier-next');
  const OVERLAY_COMBO = document.getElementById('overlay-combo');
  const OVERLAY_TIER = document.getElementById('overlay-tier');
  const HUD_ZONE = document.getElementById('hud-zone-value');

  // Zones (florr.io style: farm in deeper zones for rarer mobs)
  const ZONE_WIDTH = 1000;
  const ZONE_NAMES = ['SAFE', 'HAZARD', 'ELITE', 'ABYSS'];
  const ZONE_RARITY_WEIGHTS = [
    [70, 20, 8, 2, 0, 0, 0],
    [40, 30, 18, 8, 3, 1, 0],
    [15, 25, 25, 20, 10, 4, 1],
    [0, 5, 15, 25, 25, 20, 10],
  ];
  const RARITY_MULT_ENEMY = [1, 1.25, 1.6, 2.2, 3, 4, 5.5];

  // Slam (E key)
  const SLAM_COOLDOWN_MS = 3200;
  const SLAM_RANGE = 95;
  const SLAM_DAMAGE_BASE = 55;
  const SLAM_EFFECT_MS = 250;

  // Bees (florr.io style): individual health & damage, start with 5, petals change stats
  const BEE_BASE_COUNT = 5;
  const BEE_ORBIT_RADIUS = 88; // larger so they actually hit
  const BEE_RADIUS = 7;
  const BEE_DAMAGE_MULT = 3; // each bee does 3x player bullet damage (scaled by petal)
  const BEE_BASE_HEALTH = 45;
  const BEE_HIT_COOLDOWN_MS = 260;
  const BEE_ORBIT_SPEED = 2.6;
  const BEE_RESPAWN_MS = 8000; // dead bees respawn after this (with same petal)
  const BEE_ENEMY_DAMAGE_TO_BEE = 1; // enemies deal this much to bees per contact

  // Petals (florr.io style): each petal unlocks at a tier and gives bee stat modifiers
  const PETALS = [
    { id: 'basic', name: 'Basic', tier: 0, damageMult: 1, healthMult: 1, speedMult: 1, fill: '#e8c832', stroke: '#c9a227', desc: 'Default bee. Balanced.' },
    { id: 'rose', name: 'Rose', tier: 20, damageMult: 1.4, healthMult: 0.85, speedMult: 1, fill: '#e84a6f', stroke: '#b82e4a', desc: 'High damage, slightly fragile.' },
    { id: 'cactus', name: 'Cactus', tier: 20, damageMult: 1.15, healthMult: 1.5, speedMult: 0.95, fill: '#4a9b4a', stroke: '#2d732d', desc: 'Tanky bee, good sustain.' },
    { id: 'sunflower', name: 'Sunflower', tier: 40, damageMult: 0.9, healthMult: 1.35, speedMult: 1.1, fill: '#f0c030', stroke: '#d4a010', desc: 'Fast orbit, extra health.' },
    { id: 'tulip', name: 'Tulip', tier: 40, damageMult: 1.2, healthMult: 1.1, speedMult: 1, fill: '#b85ab8', stroke: '#8b3a8b', desc: 'Well-rounded upgrade.' },
    { id: 'lily', name: 'Lily', tier: 60, damageMult: 1.35, healthMult: 1, speedMult: 1.05, fill: '#f0f0f0', stroke: '#c0c0c0', desc: 'Pure damage focus.' },
    { id: 'clover', name: 'Clover', tier: 60, damageMult: 1, healthMult: 1.45, speedMult: 1, fill: '#50a050', stroke: '#308030', desc: 'Very tanky, standard damage.' },
    { id: 'ivy', name: 'Ivy', tier: 80, damageMult: 1.25, healthMult: 1.25, speedMult: 0.9, fill: '#2d5a2d', stroke: '#1a3a1a', desc: 'Balanced power and bulk.' },
    { id: 'orchid', name: 'Orchid', tier: 80, damageMult: 1.5, healthMult: 0.75, speedMult: 1.15, fill: '#c060c0', stroke: '#904090', desc: 'Glass cannon bee.' },
  ];
  function getPetal(id) {
    return PETALS.find((p) => p.id === id) || PETALS[0];
  }

  // Bosses
  const BOSS_GUARDIAN_HP = 900;
  const BOSS_GUARDIAN_RADIUS = 45;
  const BOSS_GUARDIAN_SPEED = 0.9;
  const BOSS_GUARDIAN_SHOOT_MS = 2200;
  const BOSS_GUARDIAN_DAMAGE = 12;
  const BOSS_GUARDIAN_XP = 120;
  const BOSS_BEHEMOTH_HP = 2200;
  const BOSS_BEHEMOTH_RADIUS = 65;
  const BOSS_BEHEMOTH_SPEED = 0.6;
  const BOSS_BEHEMOTH_SHOOT_MS = 1800;
  const BOSS_BEHEMOTH_DAMAGE = 18;
  const BOSS_BEHEMOTH_XP = 280;
  const BOSS_SPAWN_INTERVAL_MS = 85000;

  // Barrel helpers: front spread (n barrels in arc), circle (n full 360), back (rear barrels)
  function frontBarrels(n, spread = 0.55) {
    if (n <= 0) return [];
    if (n === 1) return [0];
    const arr = [];
    for (let i = 0; i < n; i++) arr.push((i - (n - 1) / 2) * (spread / Math.max(1, n - 1)));
    return arr;
  }
  function circleBarrels(n) {
    const arr = [];
    for (let i = 0; i < n; i++) arr.push((i / n) * Math.PI * 2);
    return arr;
  }

  // Tank classes: upgrade every 20 levels (20, 40, …, 500). Two tank options per tier + Swarm option.
  // Barrel count scales with tier so lower tiers have fewer barrels.
  const TANK_CLASSES = [
    { id: 'scout', name: 'Scout', tier: 0, barrels: [0] },
    // Tier 20 — 2–3 barrels
    { id: 'dual', name: 'Dual', tier: 20, barrels: [-0.14, 0.14] },
    { id: 'trident', name: 'Trident', tier: 20, barrels: [-0.25, 0, 0.25] },
    // Tier 40 — 4–5 barrels
    { id: 'cross', name: 'Cross', tier: 40, barrels: [0, Math.PI / 2, Math.PI, -Math.PI / 2] },
    { id: 'fan', name: 'Fan', tier: 40, barrels: [-0.45, -0.22, 0, 0.22, 0.45] },
    // Tier 60 — 5–7 barrels
    { id: 'scatter', name: 'Scatter', tier: 60, barrels: [-0.5, -0.25, 0, 0.25, 0.5] },
    { id: 'star', name: 'Star', tier: 60, barrels: [-0.3, -0.15, 0, 0.15, 0.3, 2.7, -2.7] },
    // Tier 80 — 6–8 barrels
    { id: 'hex', name: 'Hex', tier: 80, barrels: [0, Math.PI / 3, (2 * Math.PI) / 3, Math.PI, (-2 * Math.PI) / 3, -Math.PI / 3] },
    { id: 'barrage', name: 'Barrage', tier: 80, barrels: [-0.45, -0.3, -0.15, 0, 0.15, 0.3, 0.45] },
    // Tier 100 — 8–10 barrels
    { id: 'apex', name: 'Apex', tier: 100, barrels: [-0.2, 0, 0.2, Math.PI / 2, -Math.PI / 2, 2.25, -2.25] },
    { id: 'titan', name: 'Titan', tier: 100, barrels: [0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4, Math.PI, (-3 * Math.PI) / 4, -Math.PI / 2, -Math.PI / 4] },
    // Tier 120 — 9–10 barrels
    { id: 'sovereign', name: 'Sovereign', tier: 120, barrels: [-0.25, -0.1, 0, 0.1, 0.25, Math.PI / 2, -Math.PI / 2, 2.6, -2.6] },
    { id: 'nexus', name: 'Nexus', tier: 120, barrels: circleBarrels(10) },
    // Tier 140 — 10–11 barrels
    { id: 'vanguard', name: 'Vanguard', tier: 140, barrels: frontBarrels(7).concat([2.5, -2.5]) },
    { id: 'forge', name: 'Forge', tier: 140, barrels: circleBarrels(11) },
    // Tier 160 — 11–12 barrels
    { id: 'crown', name: 'Crown', tier: 160, barrels: frontBarrels(8).concat([2.4, -2.4, 2.8, -2.8]) },
    { id: 'wraith', name: 'Wraith', tier: 160, barrels: circleBarrels(12) },
    // Tier 180 — 12–13 barrels
    { id: 'striker', name: 'Striker', tier: 180, barrels: frontBarrels(9).concat([2.3, -2.3, 2.7, -2.7]) },
    { id: 'crusher', name: 'Crusher', tier: 180, barrels: circleBarrels(13) },
    // Tier 200 — 13–14 barrels
    { id: 'juggernaut', name: 'Juggernaut', tier: 200, barrels: frontBarrels(10).concat([2.2, -2.2, 2.6, -2.6, 2.9, -2.9]) },
    { id: 'prime', name: 'Prime', tier: 200, barrels: circleBarrels(14) },
    // Tier 220 — 14 barrels
    { id: 'sentinel', name: 'Sentinel', tier: 220, barrels: frontBarrels(11).concat([2.2, -2.2, 2.65, -2.65]) },
    { id: 'phantom', name: 'Phantom', tier: 220, barrels: circleBarrels(14) },
    // Tier 240 — 14–15 barrels
    { id: 'reaper', name: 'Reaper', tier: 240, barrels: frontBarrels(11).concat([2.1, -2.1, 2.55, -2.55, 2.85, -2.85]) },
    { id: 'harbinger', name: 'Harbinger', tier: 240, barrels: circleBarrels(15) },
    // Tier 260 — 15–16 barrels
    { id: 'storm', name: 'Storm', tier: 260, barrels: frontBarrels(12).concat([2.1, -2.1, 2.5, -2.5, 2.8, -2.8]) },
    { id: 'fury', name: 'Fury', tier: 260, barrels: circleBarrels(16) },
    // Tier 280 — 16 barrels
    { id: 'blaze', name: 'Blaze', tier: 280, barrels: frontBarrels(12).concat([2.0, -2.0, 2.45, -2.45, 2.75, -2.75, 2.95, -2.95]) },
    { id: 'frost', name: 'Frost', tier: 280, barrels: circleBarrels(16) },
    // Tier 300 — 16–17 barrels
    { id: 'volt', name: 'Volt', tier: 300, barrels: frontBarrels(13).concat([2.0, -2.0, 2.4, -2.4, 2.7, -2.7, 2.9, -2.9]) },
    { id: 'pulse', name: 'Pulse', tier: 300, barrels: circleBarrels(17) },
    // Tier 320 — 17 barrels
    { id: 'core', name: 'Core', tier: 320, barrels: frontBarrels(13).concat([2.0, -2.0, 2.35, -2.35, 2.65, -2.65, 2.9, -2.9]) },
    { id: 'vertex', name: 'Vertex', tier: 320, barrels: circleBarrels(17) },
    // Tier 340 — 17–18 barrels
    { id: 'zenith', name: 'Zenith', tier: 340, barrels: frontBarrels(14).concat([1.95, -1.95, 2.3, -2.3, 2.6, -2.6, 2.85, -2.85]) },
    { id: 'pinnacle', name: 'Pinnacle', tier: 340, barrels: circleBarrels(18) },
    // Tier 360 — 18 barrels
    { id: 'summit', name: 'Summit', tier: 360, barrels: frontBarrels(14).concat([1.9, -1.9, 2.25, -2.25, 2.55, -2.55, 2.8, -2.8, 2.95, -2.95]) },
    { id: 'eclipse', name: 'Eclipse', tier: 360, barrels: circleBarrels(18) },
    // Tier 380 — 18–19 barrels
    { id: 'nova', name: 'Nova', tier: 380, barrels: frontBarrels(15).concat([1.9, -1.9, 2.2, -2.2, 2.5, -2.5, 2.75, -2.75, 2.92, -2.92]) },
    { id: 'inferno', name: 'Inferno', tier: 380, barrels: circleBarrels(19) },
    // Tier 400 — 19 barrels
    { id: 'tempest', name: 'Tempest', tier: 400, barrels: frontBarrels(15).concat([1.85, -1.85, 2.15, -2.15, 2.45, -2.45, 2.7, -2.7, 2.88, -2.88]) },
    { id: 'vortex', name: 'Vortex', tier: 400, barrels: circleBarrels(19) },
    // Tier 420 — 19–20 barrels
    { id: 'catalyst', name: 'Catalyst', tier: 420, barrels: frontBarrels(16).concat([1.85, -1.85, 2.1, -2.1, 2.4, -2.4, 2.65, -2.65, 2.85, -2.85]) },
    { id: 'dynamo', name: 'Dynamo', tier: 420, barrels: circleBarrels(20) },
    // Tier 440 — 20 barrels
    { id: 'overdrive', name: 'Overdrive', tier: 440, barrels: frontBarrels(16).concat([1.8, -1.8, 2.05, -2.05, 2.35, -2.35, 2.6, -2.6, 2.8, -2.8, 2.95, -2.95]) },
    { id: 'surge', name: 'Surge', tier: 440, barrels: circleBarrels(20) },
    // Tier 460 — 20 barrels
    { id: 'flux', name: 'Flux', tier: 460, barrels: frontBarrels(17).concat([1.8, -1.8, 2.0, -2.0, 2.3, -2.3, 2.55, -2.55, 2.75, -2.75, 2.9, -2.9]) },
    { id: 'prism', name: 'Prism', tier: 460, barrels: circleBarrels(20) },
    // Tier 480 — 20 barrels
    { id: 'spectrum', name: 'Spectrum', tier: 480, barrels: frontBarrels(17).concat([1.75, -1.75, 1.98, -1.98, 2.28, -2.28, 2.52, -2.52, 2.72, -2.72, 2.88, -2.88]) },
    { id: 'apex2', name: 'Apex II', tier: 480, barrels: circleBarrels(20) },
    // Tier 500 — 20 barrels (max)
    { id: 'titan2', name: 'Titan II', tier: 500, barrels: frontBarrels(18).concat([1.75, -1.75, 1.95, -1.95, 2.25, -2.25, 2.5, -2.5, 2.7, -2.7, 2.85, -2.85]) },
    { id: 'omega', name: 'Omega', tier: 500, barrels: circleBarrels(20) },
  ];
  const XP_LEVEL_SCALE = 0.06; // XP scales with level: base * (1 + (level-1) * this)

  const RARITIES = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic', 'Ultra'];
  const RARITY_WEIGHTS = [50, 25, 12, 7, 3, 2, 1];
  const RARITY_XP = [5, 8, 12, 18, 28, 45, 80];
  const RARITY_COLORS = ['#2d7340', '#5a9b6e', '#5a7ab8', '#9b5ab8', '#c9a227', '#b84a5a', '#e8d050'];
  const COMBO_WINDOW_MS = 1800;
  const COMBO_BONUS_PER = 0.15;
  const COMBO_MAX = 8;
  const RESPAWN_LEVEL_PCT = 0.6;

  const ARENA_SIZE = 4000;
  const GRID_CELL = 80;
  const PLAYER_RADIUS_BASE = 18;
  const PLAYER_SPEED_BASE = 4.2;
  const MAX_STAT = 15;
  const PLAYER_RADIUS = PLAYER_RADIUS_BASE;
  const PLAYER_SPEED = PLAYER_SPEED_BASE;
  const VIEW_SMOOTH = 0.08;
  const MARGIN = 250;

  // Shooting
  const BULLET_SPEED = 14;
  const BULLET_RADIUS = 4;
  const BULLET_DAMAGE = 25;
  const FIRE_COOLDOWN_MS = 180;

  // XP collectibles
  const COLLECTIBLE_COUNT = 120;
  const COLLECTIBLE_RADIUS = 10;
  const COLLECTIBLE_XP = 5;
  const RESPAWN_DISTANCE = 600;

  // Enemies: fewer, cracked (high health/damage/XP per mob)
  const ENEMY_COUNT = 6;
  const ENEMY_EXTRA_PER_LEVEL_DIV = 12; // +1 mob every this many levels (fewer total)
  const ENEMY_RADIUS = 26;
  const ENEMY_SPEED = 1.6;
  const ENEMY_HEALTH = 220;
  const ENEMY_DAMAGE = 26;
  const ENEMY_CONTACT_COOLDOWN_MS = 400;
  const ENEMY_XP = 70;
  const MULTI_ENEMY_DAMAGE_MULT = 2;

  // Bots
  const BOT_COUNT = 6;
  const BOT_RADIUS = 18;
  const BOT_SPEED = 3.2;
  const BOT_HEALTH = 80;
  const BOT_FIRE_COOLDOWN_MS = 350;
  const BOT_DAMAGE = 18;
  const BOT_XP = 20;

  // Level-up: score needed for next level (steep curve so 500 is a long grind)
  const XP_PER_LEVEL_BASE = 100;
  const XP_EXPONENT = 1.42; // level 1→2 ≈ 100, level 100→101 ≈ 4.5k, level 500→501 ≈ 180k
  const LEVEL_UP_HEAL = true;
  const LEVEL_UP_MAX_HEALTH = 15;
  const ENEMY_SCALE_RADIUS_PER_LEVEL = 0.22;
  const ENEMY_SCALE_HEALTH_PER_LEVEL = 0.34;
  const ENEMY_SCALE_DAMAGE_PER_LEVEL = 0.24;

  // Respawn
  const RESPAWN_DELAY_MS = 3000;

  let ctx, minimapCtx;
  let width, height;
  let scale = 1;
  let viewX = 0, viewY = 0;
  let targetViewX = 0, targetViewY = 0;
  let mouseWorldX = 0, mouseWorldY = 0;
  let player = {
    x: ARENA_SIZE / 2,
    y: ARENA_SIZE / 2,
    vx: 0,
    vy: 0,
    health: 100,
    maxHealth: 100,
    score: 0,
    level: 1,
    aimAngle: -Math.PI / 2,
    lastFireTime: 0,
    lastEnemyContactTime: 0,
    upgradePoints: 0,
    statMove: 0,
    statDamage: 0,
    statHealth: 0,
    statRegen: 0,
    statPet: 0,
    statReload: 0,
    statRange: 0,
  };
  let petAngle = 0;
  let petLastShot = 0;
  let keys = {};
  let bullets = [];
  let collectibles = [];
  let enemies = [];
  let bosses = [];
  let bots = [];
  let nextBotId = 1;
  let bees = [];
  let nextBeeId = 1;
  let deadBeeRespawnQueue = [];
  let swarmAngle = 0;
  let running = false;
  let lastSlamAt = 0;
  let lastBossSpawnAt = 0;
  let slamEffectAt = 0;
  let pendingTankTier = 0;
  let lastTime = 0;
  let isDead = false;
  let respawnAt = 0;
  let mouseScreenX = 0, mouseScreenY = 0;
  let levelUpShowAt = 0;
  let damageFlashAt = 0;
  let floaters = [];
  let comboCount = 0;
  let lastKillTime = 0;
  let comboShowAt = 0;
  let tierShowAt = 0;
  const FLOATER_DURATION_MS = 900;
  const LEVEL_UP_DURATION_MS = 1600;
  const DAMAGE_FLASH_MS = 120;
  const COMBO_SHOW_MS = 1200;
  const TIER_SHOW_MS = 2200;

  function resize() {
    width = CANVAS.clientWidth;
    height = CANVAS.clientHeight;
    CANVAS.width = width;
    CANVAS.height = height;
    scale = Math.min(width, height) / (ARENA_SIZE * 0.4);
  }

  function worldFromScreen(sx, sy) {
    const camX = viewX - width / scale / 2;
    const camY = viewY - height / scale / 2;
    return {
      x: camX + sx / scale,
      y: camY + sy / scale,
    };
  }

  function randomPosition() {
    return {
      x: MARGIN + Math.random() * (ARENA_SIZE - 2 * MARGIN),
      y: MARGIN + Math.random() * (ARENA_SIZE - 2 * MARGIN),
    };
  }
  function getZone(x) {
    return Math.max(0, Math.min(3, Math.floor(x / ZONE_WIDTH)));
  }
  function rollRarityForZone(zone) {
    const weights = ZONE_RARITY_WEIGHTS[Math.min(zone, 3)] || ZONE_RARITY_WEIGHTS[0];
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r <= 0) return i;
    }
    return 0;
  }
  function randomPositionInZone(zone) {
    const x0 = zone * ZONE_WIDTH + 80;
    const x1 = (zone + 1) * ZONE_WIDTH - 80;
    return {
      x: x0 + Math.random() * (x1 - x0),
      y: MARGIN + Math.random() * (ARENA_SIZE - 2 * MARGIN),
    };
  }

  function getScoreForLevel(level) {
    let total = 0;
    for (let L = 1; L < level; L++) total += XP_PER_LEVEL_BASE * Math.pow(L, XP_EXPONENT);
    return Math.floor(total);
  }

  function getEnemyScale(level) {
    const L = Math.max(1, level - 1);
    return {
      radius: 1 + L * ENEMY_SCALE_RADIUS_PER_LEVEL,
      health: 1 + L * ENEMY_SCALE_HEALTH_PER_LEVEL,
      damage: 1 + L * ENEMY_SCALE_DAMAGE_PER_LEVEL,
    };
  }

  function spawnOneEnemy(level, zone) {
    if (zone == null) zone = getZone(Math.random() * ARENA_SIZE);
    const p = randomPositionInZone(zone);
    const s = getEnemyScale(level);
    const rarity = rollRarityForZone(zone);
    const mult = RARITY_MULT_ENEMY[rarity] || 1;
    return {
      x: p.x,
      y: p.y,
      zone,
      rarity,
      radius: ENEMY_RADIUS * s.radius * Math.sqrt(mult),
      health: ENEMY_HEALTH * s.health * mult,
      maxHealth: ENEMY_HEALTH * s.health * mult,
      damage: (ENEMY_DAMAGE * s.damage * mult),
      vx: 0,
      vy: 0,
      xp: Math.round(ENEMY_XP * (1 + (level - 1) * 0.2) * mult * (1 + rarity * 0.45)),
    };
  }

  function getTankTier() {
    return Math.floor(player.level / 3);
  }
  function getTankRarityName() {
    return RARITIES[Math.min(getTankTier(), RARITIES.length - 1)];
  }
  function getTierBonusDamage() {
    const t = getTankTier();
    return 1 + t * 0.08;
  }
  function getTierBonusRegen() {
    return getTankTier() * 0.4;
  }
  function getPlayerSpeed() {
    return PLAYER_SPEED_BASE + (player.statMove || 0) * 0.4;
  }
  function getPlayerDamage() {
    const base = BULLET_DAMAGE * (1 + (player.statDamage || 0) * 0.25);
    return Math.round(base * getTierBonusDamage());
  }
  function getPlayerMaxHealth() {
    return 100 + (player.level - 1) * LEVEL_UP_MAX_HEALTH + (player.statHealth || 0) * 12;
  }
  function getPlayerRegen() {
    return (player.statRegen || 0) * 0.6 + getTierBonusRegen();
  }
  function getPlayerRadius() {
    return PLAYER_RADIUS_BASE;
  }
  function getPetLevel() {
    return Math.min(MAX_STAT, Math.max(0, player.statPet || 0));
  }
  function getPetDamage() {
    const lvl = getPetLevel();
    return lvl <= 0 ? 0 : Math.round(BULLET_DAMAGE * 0.5 * (1 + lvl * 0.2) * getTierBonusDamage());
  }
  function getPetFireCooldownMs() {
    return Math.max(200, 900 - getPetLevel() * 45);
  }
  function getPetRange() {
    return 380 + getPetLevel() * 25;
  }
  function getPlayerFireCooldown() {
    return Math.max(60, FIRE_COOLDOWN_MS - (player.statReload || 0) * 12);
  }
  function getPlayerBulletSpeed() {
    return BULLET_SPEED;
  }
  function getTankClass() {
    const id = player.tankClass || 'scout';
    return TANK_CLASSES.find((t) => t.id === id) || TANK_CLASSES[0];
  }
  function createBee(petalId) {
    const petal = getPetal(petalId);
    const maxHealth = Math.round(BEE_BASE_HEALTH * petal.healthMult);
    return {
      id: nextBeeId++,
      angle: Math.random() * Math.PI * 2,
      health: maxHealth,
      maxHealth,
      petalId: petal.id,
      lastHit: 0,
    };
  }
  function getBeeDamage(bee) {
    const petal = getPetal(bee.petalId);
    return Math.round(getPlayerDamage() * BEE_DAMAGE_MULT * petal.damageMult);
  }
  function spawnBees(count, petalId) {
    const pid = petalId || (player.unlockedPetals && player.unlockedPetals.length ? player.unlockedPetals[Math.floor(Math.random() * player.unlockedPetals.length)] : 'basic');
    for (let i = 0; i < count; i++) {
      bees.push(createBee(pid));
    }
  }
  // Upgrade every 20 levels: choose +2 Bees or unlock a new petal (florr.io style)
  function getUpgradeOptions(level) {
    const tier = Math.floor(level / 20) * 20;
    if (tier < 20) return [];
    const options = [{ type: 'bees', id: 'bees', name: '+2 Bees' }];
    const unlocked = player.unlockedPetals || ['basic'];
    const petalsForTier = PETALS.filter((p) => p.tier === tier && !unlocked.includes(p.id));
    petalsForTier.slice(0, 2).forEach((p) => options.push({ type: 'petal', id: p.id, name: p.name }));
    return options;
  }
  function getTankOptionsForLevel(level) {
    return getUpgradeOptions(level);
  }
  function scaleXP(base, level) {
    return Math.round(base * (1 + (level - 1) * XP_LEVEL_SCALE));
  }
  function rollRarity() {
    const total = RARITY_WEIGHTS.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < RARITY_WEIGHTS.length; i++) {
      r -= RARITY_WEIGHTS[i];
      if (r <= 0) return i;
    }
    return 0;
  }
  function applyComboBonus(baseXp, now) {
    if (now - lastKillTime > COMBO_WINDOW_MS) comboCount = 0;
    comboCount = Math.min(COMBO_MAX, comboCount + 1);
    lastKillTime = now;
    comboShowAt = now;
    const mult = 1 + (comboCount - 1) * COMBO_BONUS_PER;
    return Math.round(baseXp * mult);
  }

  function spawnOneCollectible() {
    const rarity = rollRarity();
    return {
      x: Math.random() * (ARENA_SIZE - 400) + 200,
      y: Math.random() * (ARENA_SIZE - 400) + 200,
      radius: COLLECTIBLE_RADIUS + rarity * 1.5,
      xp: RARITY_XP[rarity],
      rarity,
    };
  }
  function spawnCollectibles() {
    collectibles = [];
    for (let i = 0; i < COLLECTIBLE_COUNT; i++) {
      collectibles.push(spawnOneCollectible());
    }
  }

  function spawnEnemies() {
    enemies = [];
    const count = ENEMY_COUNT + Math.floor((player.level - 1) / ENEMY_EXTRA_PER_LEVEL_DIV);
    for (let i = 0; i < count; i++) {
      const zone = i % 4;
      enemies.push(spawnOneEnemy(player.level, zone));
    }
  }
  function spawnBoss(zone) {
    if (zone == null) zone = 2 + Math.floor(Math.random() * 2);
    const p = randomPositionInZone(zone);
    const isBehemoth = Math.random() < 0.4;
    if (isBehemoth) {
      bosses.push({
        type: 'behemoth',
        x: p.x,
        y: p.y,
        health: BOSS_BEHEMOTH_HP,
        maxHealth: BOSS_BEHEMOTH_HP,
        radius: BOSS_BEHEMOTH_RADIUS,
        vx: 0,
        vy: 0,
        lastShot: 0,
        shootMs: BOSS_BEHEMOTH_SHOOT_MS,
        damage: BOSS_BEHEMOTH_DAMAGE,
        xp: BOSS_BEHEMOTH_XP,
      });
    } else {
      bosses.push({
        type: 'guardian',
        x: p.x,
        y: p.y,
        health: BOSS_GUARDIAN_HP,
        maxHealth: BOSS_GUARDIAN_HP,
        radius: BOSS_GUARDIAN_RADIUS,
        vx: 0,
        vy: 0,
        lastShot: 0,
        shootMs: BOSS_GUARDIAN_SHOOT_MS,
        damage: BOSS_GUARDIAN_DAMAGE,
        xp: BOSS_GUARDIAN_XP,
      });
    }
  }
  function trySlam(now) {
    if (now - lastSlamAt < SLAM_COOLDOWN_MS) return;
    lastSlamAt = now;
    slamEffectAt = now;
    const damage = Math.round(SLAM_DAMAGE_BASE * getTierBonusDamage() * (1 + (player.statDamage || 0) * 0.15));
    const pr = getPlayerRadius();
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (Math.hypot(player.x - e.x, player.y - e.y) < SLAM_RANGE + e.radius) {
        e.health -= damage;
        if (e.health <= 0) {
          const bonus = applyComboBonus(scaleXP(e.xp, player.level), now);
          player.score += bonus;
          floaters.push({ x: e.x, y: e.y, value: bonus, createdAt: now });
          enemies.splice(i, 1);
          enemies.push(spawnOneEnemy(player.level, getZone(player.x + Math.random() * 400)));
        }
      }
    }
    for (let i = bosses.length - 1; i >= 0; i--) {
      const b = bosses[i];
      if (Math.hypot(player.x - b.x, player.y - b.y) < SLAM_RANGE + b.radius) {
        b.health -= damage;
        if (b.health <= 0) {
          const bonus = applyComboBonus(scaleXP(b.xp, player.level), now);
          player.score += bonus;
          floaters.push({ x: b.x, y: b.y, value: bonus, createdAt: now, isBoss: true });
          bosses.splice(i, 1);
        }
      }
    }
  }

  function spawnBots() {
    bots = [];
    nextBotId = 1;
    for (let i = 0; i < BOT_COUNT; i++) {
      const p = randomPosition();
      bots.push({
        id: nextBotId++,
        x: p.x,
        y: p.y,
        vx: 0,
        vy: 0,
        health: BOT_HEALTH,
        maxHealth: BOT_HEALTH,
        aimAngle: 0,
        lastFireTime: 0,
        radius: BOT_RADIUS,
      });
    }
  }

  function scoreToLevel(score) {
    let level = 1;
    let totalNeeded = 0;
    while (level <= 500) {
      const needForNext = XP_PER_LEVEL_BASE * Math.pow(level, XP_EXPONENT);
      if (score < totalNeeded + needForNext) return level;
      totalNeeded += needForNext;
      level++;
    }
    return 500;
  }

  function doRespawn() {
    isDead = false;
    player.level = 1;
    player.score = 0;
    player.tankClass = 'scout';
    player.swarmLevel = 0;
    player.unlockedPetals = ['basic'];
    player.statMove = 0;
    player.statDamage = 0;
    player.statHealth = 0;
    player.statRegen = 0;
    player.statPet = 0;
    player.statReload = 0;
    player.statRange = 0;
    player.upgradePoints = 0;
    player.maxHealth = getPlayerMaxHealth();
    player.health = player.maxHealth;
    player.lastEnemyContactTime = 0;
    comboCount = 0;
    bullets = [];
    bees = [];
    nextBeeId = 1;
    deadBeeRespawnQueue = [];
    spawnBees(5);
    spawnEnemies();
    bosses = [];
    const rp = randomPosition();
    player.x = rp.x;
    player.y = rp.y;
    OVERLAY_RESPAWN.classList.add('hidden');
  }

  function init() {
    resize();
    window.addEventListener('resize', resize);
    ctx = CANVAS.getContext('2d');
    minimapCtx = MINIMAP.getContext('2d');
    MINIMAP.width = 100;
    MINIMAP.height = 100;

    BTN_PLAY.addEventListener('click', () => startGame(false));
    const LOBBY = document.getElementById('lobby');
    const BTN_LOBBY = document.getElementById('btn-lobby');
    const BTN_CREATE = document.getElementById('btn-create-room');
    const BTN_JOIN = document.getElementById('btn-join-room');
    const ROOM_CODE_INPUT = document.getElementById('room-code-input');
    const LOBBY_ROOM_SECTION = document.getElementById('lobby-room-section');
    const LOBBY_ROOM_CODE = document.getElementById('lobby-room-code');
    const BTN_START_LOBBY = document.getElementById('btn-start-from-lobby');
    const BTN_LOBBY_BACK = document.getElementById('btn-lobby-back');
    if (BTN_LOBBY) BTN_LOBBY.addEventListener('click', () => { MENU.classList.remove('active'); if (LOBBY) LOBBY.classList.add('active'); });
    if (BTN_LOBBY_BACK) BTN_LOBBY_BACK.addEventListener('click', () => { if (LOBBY) LOBBY.classList.remove('active'); MENU.classList.add('active'); });
    if (BTN_CREATE) BTN_CREATE.addEventListener('click', () => {
      const code = Math.random().toString(36).slice(2, 8).toUpperCase();
      if (LOBBY_ROOM_CODE) LOBBY_ROOM_CODE.textContent = code;
      if (LOBBY_ROOM_SECTION) LOBBY_ROOM_SECTION.classList.remove('hidden');
    });
    if (BTN_JOIN && ROOM_CODE_INPUT) BTN_JOIN.addEventListener('click', () => {
      const code = ROOM_CODE_INPUT.value.trim().toUpperCase();
      if (code.length >= 4) startGame(true);
    });
    if (BTN_START_LOBBY) BTN_START_LOBBY.addEventListener('click', () => startGame(true));
    document.getElementById('btn-respawn')?.addEventListener('click', () => {
      if (isDead) doRespawn();
    });
    document.getElementById('btn-return-home')?.addEventListener('click', () => {
      if (isDead) {
        running = false;
        isDead = false;
        OVERLAY_RESPAWN.classList.add('hidden');
        GAME_SCREEN.classList.remove('active');
        MENU.classList.add('active');
      }
    });
    document.getElementById('overlay-tank-pick-options')?.addEventListener('click', (e) => {
      const btn = e.target.closest ? e.target.closest('button.tank-pick-btn') : null;
      if (!btn || !pendingTankTier) return;
      const id = btn.getAttribute('data-tank-id');
      const upgradeType = btn.getAttribute('data-upgrade-type');
      if (upgradeType === 'bees') {
        spawnBees(2);
        pendingTankTier = 0;
        document.getElementById('overlay-tank-pick')?.classList.remove('visible');
      } else if (upgradeType === 'petal' && id) {
        if (!player.unlockedPetals) player.unlockedPetals = ['basic'];
        if (!player.unlockedPetals.includes(id)) player.unlockedPetals.push(id);
        pendingTankTier = 0;
        document.getElementById('overlay-tank-pick')?.classList.remove('visible');
      } else if (id && upgradeType === 'tank') {
        player.tankClass = id;
        pendingTankTier = 0;
        document.getElementById('overlay-tank-pick')?.classList.remove('visible');
      }
    });
    document.addEventListener('keydown', (e) => {
      keys[e.code] = true;
      if (e.code === 'Space') e.preventDefault();
      if (e.code === 'KeyW' || e.code === 'KeyA' || e.code === 'KeyS' || e.code === 'KeyD') e.preventDefault();
      if (running && !isDead && e.code >= 'Digit1' && e.code <= 'Digit7') {
        const statMap = ['move', 'damage', 'health', 'regen', 'pet', 'reload', 'range'];
        const idx = parseInt(e.code.replace('Digit', ''), 10) - 1;
        if (idx >= 0 && statMap[idx]) spendStat(statMap[idx]);
      }
    });
    document.addEventListener('keyup', (e) => { keys[e.code] = false; });
    CANVAS.addEventListener('mousemove', (e) => {
      const rect = CANVAS.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      mouseScreenX = sx;
      mouseScreenY = sy;
      const w = worldFromScreen(sx, sy);
      mouseWorldX = w.x;
      mouseWorldY = w.y;
    });
    CANVAS.addEventListener('click', (e) => {
      if (running && !isDead) tryFire();
    });
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && running && !isDead) {
        e.preventDefault();
        tryFire();
      }
      if (e.code === 'KeyE' && running && !isDead) {
        e.preventDefault();
        trySlam(performance.now());
      }
    });
    document.querySelectorAll('.upgrade-bar').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const stat = btn.getAttribute('data-stat');
        if (stat) spendStat(stat);
      });
    });
  }
  function spendStat(stat) {
    if (!stat || player.upgradePoints <= 0) return;
    const key = 'stat' + stat.charAt(0).toUpperCase() + stat.slice(1);
    if (player[key] >= MAX_STAT) return;
    player[key]++;
    player.upgradePoints--;
    if (stat === 'health') {
      player.maxHealth = getPlayerMaxHealth();
      player.health = Math.min(player.health, player.maxHealth);
    }
  }

  function startGame(fromLobby) {
    MENU.classList.remove('active');
    document.getElementById('lobby')?.classList.remove('active');
    GAME_SCREEN.classList.add('active');
    const startPos = randomPosition();
    player.x = startPos.x;
    player.y = startPos.y;
    player.score = 0;
    player.level = 1;
    player.upgradePoints = 0;
    player.statMove = 0;
    player.statDamage = 0;
    player.statHealth = 0;
    player.statRegen = 0;
    player.statPet = 0;
    player.statReload = 0;
    player.statRange = 0;
    player.tankClass = 'scout';
    player.swarmLevel = 0;
    player.maxHealth = getPlayerMaxHealth();
    player.health = player.maxHealth;
    player.lastFireTime = 0;
    player.lastEnemyContactTime = 0;
    bullets = [];
    bosses = [];
    bees = [];
    nextBeeId = 1;
    deadBeeRespawnQueue = [];
    player.unlockedPetals = ['basic'];
    spawnBees(5);
    lastBossSpawnAt = performance.now();
    lastSlamAt = 0;
    slamEffectAt = 0;
    spawnCollectibles();
    spawnEnemies();
    spawnBoss(2);
    spawnBots();
    targetViewX = player.x;
    targetViewY = player.y;
    viewX = player.x;
    viewY = player.y;
    running = true;
    isDead = false;
    respawnAt = 0;
    levelUpShowAt = 0;
    damageFlashAt = 0;
    comboCount = 0;
    lastKillTime = 0;
    tierShowAt = 0;
    floaters = [];
    OVERLAY_RESPAWN.classList.add('hidden');
    pendingTankTier = 0;
    document.getElementById('overlay-tank-pick')?.classList.remove('visible');
    if (OVERLAY_LEVEL_UP) OVERLAY_LEVEL_UP.classList.remove('visible');
    if (OVERLAY_DAMAGE) OVERLAY_DAMAGE.classList.remove('visible');
    lastTime = performance.now();
    requestAnimationFrame(tick);
  }

  function tryFire() {
    const now = performance.now();
    const cooldown = getPlayerFireCooldown();
    if (now - player.lastFireTime < cooldown) return;
    player.lastFireTime = now;
    const damage = getPlayerDamage();
    const r = getPlayerRadius();
    const speed = getPlayerBulletSpeed();
    const tank = getTankClass();
    for (const offset of tank.barrels) {
      const angle = player.aimAngle + offset;
      bullets.push({
        x: player.x + Math.cos(angle) * (r + 4),
        y: player.y + Math.sin(angle) * (r + 4),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: BULLET_RADIUS,
        damage,
        owner: 'player',
      });
    }
  }

  function tick(now) {
    if (!running) return;
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    // Overlay visibility (level-up, damage flash)
    if (OVERLAY_LEVEL_UP) {
      if (levelUpShowAt > 0 && now - levelUpShowAt < LEVEL_UP_DURATION_MS) {
        OVERLAY_LEVEL_UP.classList.add('visible');
      } else {
        OVERLAY_LEVEL_UP.classList.remove('visible');
      }
    }
    if (OVERLAY_DAMAGE) {
      if (damageFlashAt > 0 && now - damageFlashAt < DAMAGE_FLASH_MS) {
        OVERLAY_DAMAGE.classList.add('visible');
      } else {
        OVERLAY_DAMAGE.classList.remove('visible');
      }
    }
    if (OVERLAY_COMBO) {
      if (comboShowAt > 0 && now - comboShowAt < COMBO_SHOW_MS && comboCount > 1) {
        OVERLAY_COMBO.classList.add('visible');
        OVERLAY_COMBO.textContent = 'x' + comboCount + ' COMBO!';
      } else {
        OVERLAY_COMBO.classList.remove('visible');
      }
    }
    if (OVERLAY_TIER) {
      if (tierShowAt > 0 && now - tierShowAt < TIER_SHOW_MS) {
        OVERLAY_TIER.classList.add('visible');
        OVERLAY_TIER.setAttribute('data-rarity', getTankRarityName().toLowerCase());
        OVERLAY_TIER.textContent = getTankRarityName().toUpperCase() + ' TANK';
      } else {
        OVERLAY_TIER.classList.remove('visible');
      }
    }

    if (isDead) {
      drawArena();
      drawCollectibles();
      drawEnemies();
      drawBosses();
      drawBots();
      drawBullets();
      drawSlamEffect(now);
      drawPlayer();
      drawPet(now);
      drawBees(now);
      drawFloaters(now);
      drawMinimap();
      updateHUD();
      drawCrosshair();
      requestAnimationFrame(tick);
      return;
    }

    if (pendingTankTier > 0) {
      const OVERLAY_TANK = document.getElementById('overlay-tank-pick');
      const TANK_TIER_EL = document.getElementById('overlay-tank-pick-tier');
      const TANK_OPTS_EL = document.getElementById('overlay-tank-pick-options');
      if (OVERLAY_TANK && !OVERLAY_TANK.classList.contains('visible')) {
        OVERLAY_TANK.classList.add('visible');
        if (TANK_TIER_EL) TANK_TIER_EL.textContent = 'LVL ' + pendingTankTier;
        if (TANK_OPTS_EL) {
          TANK_OPTS_EL.innerHTML = '';
          const options = getUpgradeOptions(pendingTankTier);
          for (const opt of options) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'tank-pick-btn';
            btn.setAttribute('data-upgrade-type', opt.type);
            if (opt.id) btn.setAttribute('data-tank-id', opt.id);
            btn.textContent = opt.name.toUpperCase();
            TANK_OPTS_EL.appendChild(btn);
          }
        }
      }
      drawArena();
      drawCollectibles();
      drawEnemies();
      drawBosses();
      drawBots();
      drawBullets();
      drawSlamEffect(now);
      drawPlayer();
      drawPet(now);
      drawBees(now);
      drawFloaters(now);
      drawMinimap();
      updateHUD();
      drawCrosshair();
      requestAnimationFrame(tick);
      return;
    }

    // Aim at mouse
    player.aimAngle = Math.atan2(mouseWorldY - player.y, mouseWorldX - player.x);

    if (keys['Space']) tryFire();
    if (keys['KeyE']) trySlam(now);

    // Regen
    const regen = getPlayerRegen();
    if (regen > 0) {
      player.health = Math.min(player.maxHealth, player.health + regen * dt);
    }

    // Movement
    const speed = getPlayerSpeed();
    const r = getPlayerRadius();
    player.vx = (keys['KeyD'] ? 1 : 0) - (keys['KeyA'] ? 1 : 0);
    player.vy = (keys['KeyS'] ? 1 : 0) - (keys['KeyW'] ? 1 : 0);
    const len = Math.hypot(player.vx, player.vy);
    if (len > 0) {
      player.vx = (player.vx / len) * speed;
      player.vy = (player.vy / len) * speed;
    }
    player.x = Math.max(r, Math.min(ARENA_SIZE - r, player.x + player.vx));
    player.y = Math.max(r, Math.min(ARENA_SIZE - r, player.y + player.vy));

    // Bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.vx;
      b.y += b.vy;
      const offWorld = b.x < -50 || b.x > ARENA_SIZE + 50 || b.y < -50 || b.y > ARENA_SIZE + 50;
      const overRange = b.owner === 'player' && b.maxDist != null && (Math.hypot(b.x - (b.startX || b.x), b.y - (b.startY || b.y)) > b.maxDist);
      if (offWorld || overRange) {
        bullets.splice(i, 1);
        continue;
      }
      let hit = false;
      // Hit player (bot bullets only)
      if (b.owner !== 'player' && !hit) {
        const d = Math.hypot(b.x - player.x, b.y - player.y);
        if (d < getPlayerRadius() + b.radius) {
          player.health -= b.damage;
          damageFlashAt = now;
          bullets.splice(i, 1);
          hit = true;
          if (player.health <= 0) {
            player.health = 0;
            isDead = true;
            OVERLAY_RESPAWN.classList.remove('hidden');
          }
        }
      }
      // Hit bots
      if (!hit) {
        for (let j = bots.length - 1; j >= 0; j--) {
          const bot = bots[j];
          if (Math.hypot(b.x - bot.x, b.y - bot.y) < bot.radius + b.radius) {
            bot.health -= b.damage;
            bullets.splice(i, 1);
            hit = true;
            if (bot.health <= 0) {
              if (b.owner === 'player') {
                const bonus = applyComboBonus(scaleXP(BOT_XP, player.level), now);
                player.score += bonus;
                floaters.push({ x: bot.x, y: bot.y, value: bonus, createdAt: now });
              }
              bots.splice(j, 1);
              const p = randomPosition();
              bots.push({
                id: nextBotId++,
                x: p.x,
                y: p.y,
                vx: 0,
                vy: 0,
                health: BOT_HEALTH,
                maxHealth: BOT_HEALTH,
                aimAngle: 0,
                lastFireTime: now,
                radius: BOT_RADIUS,
              });
            }
            break;
          }
        }
      }
      // Hit enemies
      if (!hit) {
        for (let j = enemies.length - 1; j >= 0; j--) {
          const e = enemies[j];
          const d = Math.hypot(b.x - e.x, b.y - e.y);
          if (d < e.radius + b.radius) {
            e.health -= b.damage;
            bullets.splice(i, 1);
            if (e.health <= 0) {
              if (b.owner === 'player') {
                const bonus = applyComboBonus(scaleXP(e.xp, player.level), now);
                player.score += bonus;
                floaters.push({ x: e.x, y: e.y, value: bonus, createdAt: now });
              }
              enemies.splice(j, 1);
              enemies.push(spawnOneEnemy(player.level, getZone(Math.random() * ARENA_SIZE)));
            }
            break;
          }
        }
      }
      // Hit bosses
      if (!hit) {
        for (let j = bosses.length - 1; j >= 0; j--) {
          const boss = bosses[j];
          if (Math.hypot(b.x - boss.x, b.y - boss.y) < boss.radius + b.radius) {
            boss.health -= b.damage;
            bullets.splice(i, 1);
            hit = true;
            if (boss.health <= 0) {
              if (b.owner === 'player') {
                const bonus = applyComboBonus(scaleXP(boss.xp, player.level), now);
                player.score += bonus;
                floaters.push({ x: boss.x, y: boss.y, value: bonus, createdAt: now, isBoss: true });
              }
              bosses.splice(j, 1);
            }
            break;
          }
        }
      }
    }

    // Collectibles
    const pr = getPlayerRadius();
    for (let i = collectibles.length - 1; i >= 0; i--) {
      const c = collectibles[i];
      const d = Math.hypot(player.x - c.x, player.y - c.y);
      if (d < pr + c.radius) {
        player.score += c.xp;
        floaters.push({ x: c.x, y: c.y, value: c.xp, createdAt: now, rarity: c.rarity });
        collectibles.splice(i, 1);
        const angle = Math.random() * Math.PI * 2;
        const dist = RESPAWN_DISTANCE + Math.random() * 800;
        let nx = player.x + Math.cos(angle) * dist;
        let ny = player.y + Math.sin(angle) * dist;
        nx = Math.max(50, Math.min(ARENA_SIZE - 50, nx));
        ny = Math.max(50, Math.min(ARENA_SIZE - 50, ny));
        const newC = spawnOneCollectible();
        newC.x = nx;
        newC.y = ny;
        collectibles.push(newC);
      }
    }

    // Level-up
    const newLevel = scoreToLevel(player.score);
    if (newLevel > player.level) {
      const oldTier = Math.floor(player.level / 3);
      player.level = newLevel;
      player.maxHealth = getPlayerMaxHealth();
      if (LEVEL_UP_HEAL) player.health = player.maxHealth;
      player.upgradePoints = (player.upgradePoints || 0) + 1;
      levelUpShowAt = now;
      if (Math.floor(player.level / 3) > oldTier) tierShowAt = now;
      const upgradeOpts = getUpgradeOptions(newLevel);
      if (newLevel % 20 === 0 && upgradeOpts.length > 0) pendingTankTier = newLevel;
      for (let i = 0; i < 2; i++) enemies.push(spawnOneEnemy(player.level, getZone(player.x)));
    }

    // Boss spawn timer
    if (now - lastBossSpawnAt > BOSS_SPAWN_INTERVAL_MS && bosses.length < 2) {
      lastBossSpawnAt = now;
      spawnBoss(2 + Math.floor(Math.random() * 2));
    }

    // Boss AI: move toward player, shoot
    for (const boss of bosses) {
      const dx = player.x - boss.x;
      const dy = player.y - boss.y;
      const dist = Math.hypot(dx, dy) || 1;
      const spd = boss.type === 'behemoth' ? BOSS_BEHEMOTH_SPEED : BOSS_GUARDIAN_SPEED;
      boss.vx = (dx / dist) * spd;
      boss.vy = (dy / dist) * spd;
      boss.x = Math.max(boss.radius, Math.min(ARENA_SIZE - boss.radius, boss.x + boss.vx));
      boss.y = Math.max(boss.radius, Math.min(ARENA_SIZE - boss.radius, boss.y + boss.vy));
      if (now - boss.lastShot >= boss.shootMs && dist < 550) {
        boss.lastShot = now;
        const angle = Math.atan2(dy, dx);
        bullets.push({
          x: boss.x + Math.cos(angle) * (boss.radius + 6),
          y: boss.y + Math.sin(angle) * (boss.radius + 6),
          vx: Math.cos(angle) * (BULLET_SPEED * 0.85),
          vy: Math.sin(angle) * (BULLET_SPEED * 0.85),
          radius: BULLET_RADIUS * 1.2,
          damage: boss.damage,
          owner: 'boss',
        });
      }
    }

    // Enemies: move toward player
    for (const e of enemies) {
      const dx = player.x - e.x;
      const dy = player.y - e.y;
      const dist = Math.hypot(dx, dy) || 1;
      e.vx = (dx / dist) * ENEMY_SPEED;
      e.vy = (dy / dist) * ENEMY_SPEED;
      e.x = Math.max(e.radius, Math.min(ARENA_SIZE - e.radius, e.x + e.vx));
      e.y = Math.max(e.radius, Math.min(ARENA_SIZE - e.radius, e.y + e.vy));
    }
    // Contact damage: count enemies touching player, apply once with 2x if multiple
    const playerR = getPlayerRadius();
    let contactCount = 0;
    for (const e of enemies) {
      if (Math.hypot(player.x - e.x, player.y - e.y) < playerR + e.radius) contactCount++;
    }
    if (contactCount > 0 && now - player.lastEnemyContactTime > ENEMY_CONTACT_COOLDOWN_MS) {
      let contactDamage = 0;
      for (const e of enemies) {
        if (Math.hypot(player.x - e.x, player.y - e.y) < playerR + e.radius)
          contactDamage += e.damage != null ? e.damage : ENEMY_DAMAGE;
      }
      for (const boss of bosses) {
        if (Math.hypot(player.x - boss.x, player.y - boss.y) < playerR + boss.radius)
          contactDamage += boss.damage * 0.5;
      }
      if (contactCount >= 2) contactDamage *= MULTI_ENEMY_DAMAGE_MULT;
      player.health -= contactDamage;
      player.lastEnemyContactTime = now;
      damageFlashAt = now;
      if (player.health <= 0) {
        player.health = 0;
        isDead = true;
        OVERLAY_RESPAWN.classList.remove('hidden');
      }
    }

    // Bee respawn from queue
    for (let i = deadBeeRespawnQueue.length - 1; i >= 0; i--) {
      if (now >= deadBeeRespawnQueue[i].spawnAt) {
        bees.push(createBee(deadBeeRespawnQueue[i].petalId));
        deadBeeRespawnQueue.splice(i, 1);
      }
    }
    // Bees: orbit, deal damage, take damage from enemies
    swarmAngle += dt * BEE_ORBIT_SPEED;
    for (let i = bees.length - 1; i >= 0; i--) {
      const bee = bees[i];
      const petal = getPetal(bee.petalId);
      const a = swarmAngle * petal.speedMult + (i / Math.max(1, bees.length)) * Math.PI * 2;
      const bx = player.x + Math.cos(a) * BEE_ORBIT_RADIUS;
      const by = player.y + Math.sin(a) * BEE_ORBIT_RADIUS;
      const beeDmg = getBeeDamage(bee);
      for (let j = enemies.length - 1; j >= 0; j--) {
        const e = enemies[j];
        const dist = Math.hypot(bx - e.x, by - e.y);
        if (dist < BEE_RADIUS + e.radius) {
          bee.health -= (e.damage != null ? e.damage : ENEMY_DAMAGE) * 0.5;
          if (bee.health <= 0) {
            bees.splice(i, 1);
            deadBeeRespawnQueue.push({ petalId: bee.petalId, spawnAt: now + BEE_RESPAWN_MS });
            break;
          }
          if (now - (e.lastSwarmHit || 0) >= BEE_HIT_COOLDOWN_MS) {
            e.lastSwarmHit = now;
            e.health -= beeDmg;
            if (e.health <= 0) {
              const xp = (e.xp != null ? e.xp : ENEMY_XP);
              const bonus = applyComboBonus(scaleXP(xp, player.level), now);
              player.score += bonus;
              floaters.push({ x: e.x, y: e.y, value: bonus, createdAt: now });
              enemies.splice(j, 1);
              enemies.push(spawnOneEnemy(player.level, getZone(player.x + Math.random() * 400)));
            }
            break;
          }
        }
      }
      if (bee.health <= 0) continue;
      for (let j = bosses.length - 1; j >= 0; j--) {
        const b = bosses[j];
        const bDist = Math.hypot(bx - b.x, by - b.y);
        if (bDist < BEE_RADIUS + b.radius) bee.health -= (b.damage || 10) * 0.4;
        if (bee.health <= 0) {
          bees.splice(i, 1);
          deadBeeRespawnQueue.push({ petalId: bee.petalId, spawnAt: now + BEE_RESPAWN_MS });
          break;
        }
        if (bDist >= BEE_RADIUS + b.radius) continue;
        if (now - (b.lastSwarmHit || 0) < BEE_HIT_COOLDOWN_MS) continue;
        b.lastSwarmHit = now;
        b.health -= beeDmg;
        if (b.health <= 0) {
          const xp = (b.xp != null ? b.xp : (b.type === 'behemoth' ? BOSS_BEHEMOTH_XP : BOSS_GUARDIAN_XP));
          const bonus = applyComboBonus(scaleXP(xp, player.level), now);
          player.score += bonus;
          floaters.push({ x: b.x, y: b.y, value: bonus, createdAt: now, isBoss: true });
          bosses.splice(j, 1);
        }
        break;
      }
    }

    // Pet: orbit and shoot at nearest enemy
    const petLvl = getPetLevel();
    if (petLvl > 0) {
      const PET_ORBIT_R = 42;
      const PET_ORBIT_SPEED = 1.6;
      petAngle += dt * PET_ORBIT_SPEED;
      const px = player.x + Math.cos(petAngle) * PET_ORBIT_R;
      const py = player.y + Math.sin(petAngle) * PET_ORBIT_R;
      const petRange = getPetRange();
      let nearest = null;
      let nearestD = petRange + 1;
      for (const e of enemies) {
        const d = Math.hypot(px - e.x, py - e.y);
        if (d < nearestD) { nearestD = d; nearest = e; }
      }
      if (nearest && now - petLastShot >= getPetFireCooldownMs()) {
        petLastShot = now;
        const angle = Math.atan2(nearest.y - py, nearest.x - px);
        const speed = BULLET_SPEED * 0.9;
        bullets.push({
          x: px,
          y: py,
          startX: px,
          startY: py,
          maxDist: petRange,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: BULLET_RADIUS * 0.9,
          damage: getPetDamage(),
          owner: 'player',
        });
      }
    }

    // Bots: AI and shooting
    for (const bot of bots) {
      let tx = player.x, ty = player.y;
      let bestDist = Math.hypot(player.x - bot.x, player.y - bot.y);
      for (const e of enemies) {
        const d = Math.hypot(e.x - bot.x, e.y - bot.y);
        if (d < bestDist) { bestDist = d; tx = e.x; ty = e.y; }
      }
      for (const other of bots) {
        if (other.id === bot.id) continue;
        const d = Math.hypot(other.x - bot.x, other.y - bot.y);
        if (d < bestDist) { bestDist = d; tx = other.x; ty = other.y; }
      }
      bot.aimAngle = Math.atan2(ty - bot.y, tx - bot.x);
      const dx = tx - bot.x;
      const dy = ty - bot.y;
      const dist = Math.hypot(dx, dy) || 1;
      bot.vx = (dx / dist) * BOT_SPEED;
      bot.vy = (dy / dist) * BOT_SPEED;
      bot.x = Math.max(bot.radius, Math.min(ARENA_SIZE - bot.radius, bot.x + bot.vx));
      bot.y = Math.max(bot.radius, Math.min(ARENA_SIZE - bot.radius, bot.y + bot.vy));
      if (now - bot.lastFireTime >= BOT_FIRE_COOLDOWN_MS && bestDist < 500) {
        bot.lastFireTime = now;
        bullets.push({
          x: bot.x + Math.cos(bot.aimAngle) * (BOT_RADIUS + 4),
          y: bot.y + Math.sin(bot.aimAngle) * (BOT_RADIUS + 4),
          vx: Math.cos(bot.aimAngle) * BULLET_SPEED,
          vy: Math.sin(bot.aimAngle) * BULLET_SPEED,
          radius: BULLET_RADIUS,
          damage: BOT_DAMAGE,
          owner: bot.id,
        });
      }
    }

    targetViewX = player.x;
    targetViewY = player.y;
    viewX += (targetViewX - viewX) * VIEW_SMOOTH;
    viewY += (targetViewY - viewY) * VIEW_SMOOTH;

    // Remove expired floaters
    floaters = floaters.filter((f) => now - f.createdAt < FLOATER_DURATION_MS);

    drawArena();
    drawCollectibles();
    drawEnemies();
    drawBosses();
    drawBots();
    drawBullets();
    drawSlamEffect(now);
    drawPlayer();
    drawPet(now);
    drawBees(now);
    drawFloaters(now);
    drawMinimap();
    updateHUD();
    drawCrosshair();
    requestAnimationFrame(tick);
  }

  function drawArena() {
    const camX = viewX - width / scale / 2;
    const camY = viewY - height / scale / 2;

    ctx.save();
    ctx.scale(scale, scale);
    ctx.translate(-camX, -camY);

    ctx.fillStyle = '#0d1218';
    ctx.fillRect(0, 0, ARENA_SIZE, ARENA_SIZE);
    for (let z = 1; z <= 3; z++) {
      const xx = z * ZONE_WIDTH;
      ctx.strokeStyle = 'rgba(201, 162, 39, 0.15)';
      ctx.lineWidth = 2 / scale;
      ctx.beginPath();
      ctx.moveTo(xx, 0);
      ctx.lineTo(xx, ARENA_SIZE);
      ctx.stroke();
    }

    const gridStartX = Math.floor(camX / GRID_CELL) * GRID_CELL;
    const gridStartY = Math.floor(camY / GRID_CELL) * GRID_CELL;
    const gridEndX = camX + width / scale + GRID_CELL;
    const gridEndY = camY + height / scale + GRID_CELL;

    ctx.strokeStyle = 'rgba(45, 58, 77, 0.4)';
    ctx.lineWidth = 1 / scale;
    ctx.beginPath();
    for (let x = gridStartX; x <= gridEndX; x += GRID_CELL) {
      ctx.moveTo(x, gridStartY);
      ctx.lineTo(x, gridEndY);
    }
    for (let y = gridStartY; y <= gridEndY; y += GRID_CELL) {
      ctx.moveTo(gridStartX, y);
      ctx.lineTo(gridEndX, y);
    }
    ctx.stroke();

    ctx.strokeStyle = 'rgba(201, 162, 39, 0.25)';
    ctx.lineWidth = 3 / scale;
    ctx.strokeRect(1, 1, ARENA_SIZE - 2, ARENA_SIZE - 2);
    ctx.strokeStyle = 'rgba(201, 162, 39, 0.5)';
    ctx.lineWidth = 1 / scale;
    ctx.strokeRect(2, 2, ARENA_SIZE - 4, ARENA_SIZE - 4);

    ctx.restore();
  }

  function drawBosses() {
    const camX = viewX - width / scale / 2;
    const camY = viewY - height / scale / 2;
    ctx.save();
    ctx.scale(scale, scale);
    ctx.translate(-camX, -camY);
    for (const boss of bosses) {
      const isBehemoth = boss.type === 'behemoth';
      ctx.beginPath();
      ctx.arc(boss.x, boss.y, boss.radius + 3, 0, Math.PI * 2);
      ctx.strokeStyle = isBehemoth ? 'rgba(155, 90, 184, 0.9)' : 'rgba(184, 61, 61, 0.8)';
      ctx.lineWidth = 3 / scale;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(boss.x, boss.y, boss.radius, 0, Math.PI * 2);
      ctx.fillStyle = isBehemoth ? '#2a1a35' : '#351a1a';
      ctx.fill();
      ctx.strokeStyle = isBehemoth ? 'rgba(155, 90, 184, 0.6)' : 'rgba(184, 61, 61, 0.5)';
      ctx.lineWidth = 2 / scale;
      ctx.stroke();
      const barW = boss.radius * 2.2;
      const barH = 5 / scale;
      ctx.fillStyle = '#0d1218';
      ctx.fillRect(boss.x - boss.radius * 1.1, boss.y - boss.radius - 16, barW, barH);
      ctx.fillStyle = isBehemoth ? '#9b5ab8' : '#8b2e2e';
      ctx.fillRect(boss.x - boss.radius * 1.1, boss.y - boss.radius - 16, barW * (boss.health / boss.maxHealth), barH);
      ctx.font = `${10 / scale}px "Share Tech Mono", monospace`;
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.textAlign = 'center';
      ctx.fillText((isBehemoth ? 'BEHEMOTH' : 'GUARDIAN'), boss.x, boss.y - boss.radius - 22);
    }
    ctx.restore();
  }

  function drawPet(now) {
    if (getPetLevel() <= 0) return;
    const PET_ORBIT_R = 42;
    const camX = viewX - width / scale / 2;
    const camY = viewY - height / scale / 2;
    const px = player.x + Math.cos(petAngle) * PET_ORBIT_R;
    const py = player.y + Math.sin(petAngle) * PET_ORBIT_R;
    ctx.save();
    ctx.scale(scale, scale);
    ctx.translate(-camX, -camY);
    ctx.beginPath();
    ctx.arc(px, py, 10, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(100, 180, 255, 0.9)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(70, 140, 220, 0.95)';
    ctx.lineWidth = 2 / scale;
    ctx.stroke();
    ctx.restore();
  }

  function drawBees(now) {
    if (bees.length <= 0) return;
    const camX = viewX - width / scale / 2;
    const camY = viewY - height / scale / 2;
    ctx.save();
    ctx.scale(scale, scale);
    ctx.translate(-camX, -camY);
    const r = BEE_RADIUS;
    for (let i = 0; i < bees.length; i++) {
      const bee = bees[i];
      const petal = getPetal(bee.petalId);
      const a = swarmAngle * petal.speedMult + (i / bees.length) * Math.PI * 2;
      const bx = player.x + Math.cos(a) * BEE_ORBIT_RADIUS;
      const by = player.y + Math.sin(a) * BEE_ORBIT_RADIUS;
      const healthPct = bee.health / bee.maxHealth;
      ctx.beginPath();
      ctx.arc(bx, by, r + 1, 0, Math.PI * 2);
      ctx.fillStyle = petal.fill + '99';
      ctx.fill();
      ctx.strokeStyle = petal.stroke;
      ctx.lineWidth = 2 / scale;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(bx, by, r, 0, Math.PI * 2);
      ctx.fillStyle = petal.fill;
      ctx.fill();
      ctx.strokeStyle = petal.stroke + 'dd';
      ctx.lineWidth = 1.5 / scale;
      ctx.stroke();
      if (bee.maxHealth > 0 && healthPct < 1) {
        const barW = r * 1.8;
        const barH = 2 / scale;
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(bx - barW / 2, by - r - 6, barW, barH);
        ctx.fillStyle = healthPct > 0.5 ? '#4a9b4a' : healthPct > 0.25 ? '#c9a227' : '#b84a5a';
        ctx.fillRect(bx - barW / 2, by - r - 6, barW * healthPct, barH);
      }
    }
    ctx.restore();
  }

  function drawSlamEffect(now) {
    if (now - slamEffectAt > SLAM_EFFECT_MS) return;
    const t = (now - slamEffectAt) / SLAM_EFFECT_MS;
    const camX = viewX - width / scale / 2;
    const camY = viewY - height / scale / 2;
    ctx.save();
    ctx.scale(scale, scale);
    ctx.translate(-camX, -camY);
    const r = SLAM_RANGE * (0.3 + t * 0.7);
    const alpha = 0.35 * (1 - t);
    ctx.beginPath();
    ctx.arc(player.x, player.y, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(201, 162, 39, ' + alpha + ')';
    ctx.lineWidth = (4 / scale) * (1 - t);
    ctx.stroke();
    ctx.restore();
  }

  function drawCollectibles() {
    const camX = viewX - width / scale / 2;
    const camY = viewY - height / scale / 2;
    ctx.save();
    ctx.scale(scale, scale);
    ctx.translate(-camX, -camY);
    for (const c of collectibles) {
      const r = c.rarity != null ? c.rarity : 0;
      const color = RARITY_COLORS[r] || RARITY_COLORS[0];
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.radius + (r > 2 ? 2 : 0), 0, Math.PI * 2);
      if (r >= 3) {
        ctx.fillStyle = color + '22';
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
      ctx.fillStyle = color + (r > 1 ? 'dd' : '99');
      ctx.fill();
      ctx.strokeStyle = color + 'ff';
      ctx.lineWidth = (r >= 4 ? 2 : 1) / scale;
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawEnemies() {
    const camX = viewX - width / scale / 2;
    const camY = viewY - height / scale / 2;
    ctx.save();
    ctx.scale(scale, scale);
    ctx.translate(-camX, -camY);
    for (const e of enemies) {
      const r = e.rarity != null ? e.rarity : 0;
      const hex = RARITY_COLORS[r] || '#8b2e2e';
      const strokeHex = r >= 3 ? hex : 'rgba(184, 61, 61, 0.7)';
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(Math.atan2(e.vy, e.vx));
      ctx.fillStyle = r >= 3 ? hex + '44' : '#2d1a1a';
      ctx.strokeStyle = strokeHex;
      ctx.lineWidth = (r >= 4 ? 2.5 : 1.5) / scale;
      ctx.fillRect(-e.radius, -e.radius, e.radius * 2, e.radius * 2);
      ctx.strokeRect(-e.radius, -e.radius, e.radius * 2, e.radius * 2);
      ctx.restore();
      const barW = e.radius * 2;
      const barH = 3 / scale;
      ctx.fillStyle = '#1a0d0d';
      ctx.fillRect(e.x - e.radius, e.y - e.radius - 8, barW, barH);
      ctx.fillStyle = r >= 3 ? hex : '#8b2e2e';
      ctx.fillRect(e.x - e.radius, e.y - e.radius - 8, barW * (e.health / e.maxHealth), barH);
    }
    ctx.restore();
  }

  function drawBots() {
    const camX = viewX - width / scale / 2;
    const camY = viewY - height / scale / 2;
    ctx.save();
    ctx.scale(scale, scale);
    ctx.translate(-camX, -camY);
    for (const bot of bots) {
      ctx.beginPath();
      ctx.arc(bot.x, bot.y, bot.radius + 2, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(201, 162, 39, 0.5)';
      ctx.lineWidth = 1.5 / scale;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(bot.x, bot.y, bot.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#1a2332';
      ctx.fill();
      ctx.strokeStyle = '#2d3a4d';
      ctx.lineWidth = 1 / scale;
      ctx.stroke();
      const nx = bot.x + Math.cos(bot.aimAngle) * (bot.radius - 4);
      const ny = bot.y + Math.sin(bot.aimAngle) * (bot.radius - 4);
      ctx.beginPath();
      ctx.moveTo(bot.x, bot.y);
      ctx.lineTo(nx, ny);
      ctx.strokeStyle = 'rgba(201, 162, 39, 0.85)';
      ctx.stroke();
      const barW = bot.radius * 2;
      const barH = 3 / scale;
      ctx.fillStyle = '#0d1218';
      ctx.fillRect(bot.x - bot.radius, bot.y - bot.radius - 8, barW, barH);
      ctx.fillStyle = 'rgba(201, 162, 39, 0.6)';
      ctx.fillRect(bot.x - bot.radius, bot.y - bot.radius - 8, barW * (bot.health / bot.maxHealth), barH);
    }
    ctx.restore();
  }

  function drawBullets() {
    const camX = viewX - width / scale / 2;
    const camY = viewY - height / scale / 2;
    ctx.save();
    ctx.scale(scale, scale);
    ctx.translate(-camX, -camY);
    for (const b of bullets) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(201, 162, 39, 0.95)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(230, 190, 80, 0.9)';
      ctx.lineWidth = 1 / scale;
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawPlayer() {
    const camX = viewX - width / scale / 2;
    const camY = viewY - height / scale / 2;
    const sx = (player.x - camX) * scale;
    const sy = (player.y - camY) * scale;
    const r = getPlayerRadius() * scale;
    const tank = getTankClass();

    ctx.save();

    ctx.beginPath();
    ctx.arc(sx, sy, r + 2, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(201, 162, 39, 0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#1a2332';
    ctx.fill();
    ctx.strokeStyle = '#2d3a4d';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    for (const offset of tank.barrels) {
      const angle = player.aimAngle + offset;
      const nx = sx + Math.cos(angle) * (r - 4);
      const ny = sy + Math.sin(angle) * (r - 4);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(nx, ny);
      ctx.strokeStyle = 'rgba(201, 162, 39, 0.9)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawFloaters(now) {
    const camX = viewX - width / scale / 2;
    const camY = viewY - height / scale / 2;
    ctx.save();
    ctx.scale(scale, scale);
    ctx.translate(-camX, -camY);
    ctx.font = `bold ${14 / scale}px "Share Tech Mono", monospace`;
    ctx.textAlign = 'center';
    for (const f of floaters) {
      const age = now - f.createdAt;
      const t = Math.min(1, age / FLOATER_DURATION_MS);
      const y = f.y - t * 35;
      const alpha = 1 - t * t;
      const r = f.rarity != null ? f.rarity : 0;
      const hex = RARITY_COLORS[r] || '#c9a227';
      const R = parseInt(hex.slice(1, 3), 16);
      const G = parseInt(hex.slice(3, 5), 16);
      const B = parseInt(hex.slice(5, 7), 16);
      ctx.fillStyle = `rgba(${R},${G},${B},${alpha})`;
      ctx.strokeStyle = `rgba(11, 14, 18, ${alpha * 0.8})`;
      ctx.lineWidth = 2 / scale;
      const text = f.isBoss ? 'BOSS +' + f.value : '+' + f.value;
      ctx.strokeText(text, f.x, y);
      ctx.fillText(text, f.x, y);
    }
    ctx.restore();
  }

  function drawCrosshair() {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const x = mouseScreenX;
    const y = mouseScreenY;
    const size = 8;
    const gap = 4;
    ctx.strokeStyle = 'rgba(201, 162, 39, 0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - size - gap, y);
    ctx.lineTo(x - gap, y);
    ctx.moveTo(x + gap, y);
    ctx.lineTo(x + size + gap, y);
    ctx.moveTo(x, y - size - gap);
    ctx.lineTo(x, y - gap);
    ctx.moveTo(x, y + gap);
    ctx.lineTo(x, y + size + gap);
    ctx.stroke();
    ctx.restore();
  }

  function drawMinimap() {
    const m = minimapCtx;
    const w = MINIMAP.width;
    const h = MINIMAP.height;
    const s = Math.min(w, h) / ARENA_SIZE;

    m.fillStyle = '#0d1218';
    m.fillRect(0, 0, w, h);
    m.strokeStyle = 'rgba(201, 162, 39, 0.4)';
    m.lineWidth = 1;
    m.strokeRect(0.5, 0.5, w - 1, h - 1);
    for (const c of collectibles) {
      m.fillStyle = 'rgba(61, 143, 77, 0.6)';
      m.fillRect(c.x * s - 0.5, c.y * s - 0.5, 1, 1);
    }
    for (const e of enemies) {
      const r = e.rarity != null ? e.rarity : 0;
      m.fillStyle = r >= 3 ? (RARITY_COLORS[r] || '#8b2e2e') + 'dd' : 'rgba(184, 61, 61, 0.8)';
      m.fillRect(e.x * s - 1, e.y * s - 1, 2, 2);
    }
    for (const boss of bosses) {
      m.fillStyle = boss.type === 'behemoth' ? 'rgba(155, 90, 184, 0.95)' : 'rgba(184, 61, 61, 0.95)';
      m.beginPath();
      m.arc(boss.x * s, boss.y * s, 4, 0, Math.PI * 2);
      m.fill();
    }
    for (const bot of bots) {
      m.fillStyle = 'rgba(201, 162, 39, 0.7)';
      m.beginPath();
      m.arc(bot.x * s, bot.y * s, 2, 0, Math.PI * 2);
      m.fill();
    }
    m.fillStyle = 'rgba(201, 162, 39, 0.95)';
    m.beginPath();
    m.arc(player.x * s, player.y * s, 3, 0, Math.PI * 2);
    m.fill();
  }

  function updateHUD() {
    HUD_SCORE.textContent = String(player.score);
    HUD_LEVEL.textContent = String(player.level);
    HUD_HEALTH.textContent = `${Math.max(0, Math.round(player.health))} / ${player.maxHealth}`;
    const pct = (player.maxHealth > 0 ? player.health / player.maxHealth : 0) * 100;
    HUD_HEALTH_BAR.style.width = `${Math.max(0, pct)}%`;
    const scoreForCurrent = getScoreForLevel(player.level);
    const scoreForNext = getScoreForLevel(player.level + 1);
    const xpInLevel = player.score - scoreForCurrent;
    const xpNeeded = scoreForNext - scoreForCurrent;
    const xpPct = xpNeeded > 0 ? (xpInLevel / xpNeeded) * 100 : 0;
    if (HUD_XP_NEXT) HUD_XP_NEXT.textContent = `${xpInLevel} / ${xpNeeded}`;
    if (HUD_XP_BAR) HUD_XP_BAR.style.width = `${Math.min(100, xpPct)}%`;
    const tier = getTankTier();
    const tierRarity = getTankRarityName();
    if (HUD_TIER_VALUE) HUD_TIER_VALUE.textContent = tierRarity.toUpperCase();
    const progressInTier = player.level % 3;
    if (HUD_TIER_NEXT) HUD_TIER_NEXT.textContent = progressInTier + '/3 to next';
    const zone = getZone(player.x);
    if (HUD_ZONE) HUD_ZONE.textContent = ZONE_NAMES[zone] || 'SAFE';
    const pts = player.upgradePoints || 0;
    const el = document.getElementById('upgrade-points-value');
    if (el) el.textContent = String(pts);
    ['move', 'damage', 'health', 'regen', 'pet', 'reload', 'range'].forEach((name) => {
      const key = 'stat' + name.charAt(0).toUpperCase() + name.slice(1);
      const val = player[key] || 0;
      const bar = document.getElementById('stat-' + name);
      if (bar) bar.style.width = `${(val / MAX_STAT) * 100}%`;
      const btn = document.querySelector('.upgrade-bar[data-stat="' + name + '"]');
      if (btn) btn.disabled = pts <= 0 || val >= MAX_STAT;
    });
  }

  init();
})();
