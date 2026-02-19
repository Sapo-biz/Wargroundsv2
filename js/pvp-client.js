// ═══════════════════════════════════════════════════════
// ORBITRON — PVP Client (WebSocket)
// ═══════════════════════════════════════════════════════

class PVPClient {
    constructor(game) {
        this.game = game;
        this.ws = null;
        this.connected = false;
        this.playerId = null;
        this.zoneInfo = null;

        // Server state (updated at ~15 fps from server)
        this.serverState = null;
        this.players = [];      // all entities (players + bots)
        this.orbs = [];
        this.mobs = [];
        this.projectiles = [];
        this.leaderboard = [];
        this.myScore = 0;
        this.myHp = 0;
        this.myMaxHp = 0;
        this.serverTime = 0;
        this.myInventory = [];
        this.myMaxSlots = 8;

        // Interpolation
        this.prevPlayers = new Map();  // id → {x, y, ...}
        this.interpFactor = 0;
        this.lastStateTime = 0;
        this.stateInterval = 1000 / 15; // expected: ~67ms between states

        // Input tracking
        this.lastInputDx = 0;
        this.lastInputDy = 0;
        this.lastInputExtend = false;
        this.lastInputRetract = false;
        this.pendingDash = false;

        // Connection state
        this.reconnectAttempts = 0;
        this.maxReconnects = 5;
        this.pingMs = 0;
        this.lastPingTime = 0;

        // Server URL — set this to your Render deployment URL
        this.serverUrl = this._getServerUrl();
    }

    _getServerUrl() {
        // Check for override in localStorage (for development/testing)
        const override = localStorage.getItem('orbitron_pvp_server');
        if (override) return override;

        // Production server URL — UPDATE THIS after deploying to Render
        // For local dev, use: ws://localhost:8080
        // For production: wss://your-app-name.onrender.com
        return 'ws://localhost:8080';
    }

    // ─── Connection ───
    connect(zoneId, playerData) {
        if (this.ws) this.disconnect();

        this.game.showToast('Connecting to PVP server...', '#00ccff', true);

        try {
            this.ws = new WebSocket(this.serverUrl);
        } catch (e) {
            this.game.showToast('Failed to connect to server', '#ff4444', false);
            this.game.exitPVP();
            return;
        }

        this.ws.onopen = () => {
            this.connected = true;
            this.reconnectAttempts = 0;
            console.log('[PVP] Connected to server');

            // Send join request
            this.ws.send(JSON.stringify({
                type: 'join',
                zone: zoneId,
                name: playerData.name,
                inventory: playerData.inventory || [],
                color: playerData.color,
            }));

            // Start ping loop
            this._startPing();
        };

        this.ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                this._handleMessage(msg);
            } catch (e) {
                console.error('[PVP] Message parse error:', e);
            }
        };

        this.ws.onclose = () => {
            this.connected = false;
            console.log('[PVP] Disconnected');

            if (this.game.state === 'pvp') {
                if (this.reconnectAttempts < this.maxReconnects) {
                    this.reconnectAttempts++;
                    this.game.showToast(`Connection lost. Reconnecting (${this.reconnectAttempts}/${this.maxReconnects})...`, '#ffaa00', false);
                    setTimeout(() => this.connect(zoneId, playerData), 2000);
                } else {
                    this.game.showToast('Lost connection to server', '#ff4444', false);
                    this.game.exitPVP();
                }
            }
        };

        this.ws.onerror = (err) => {
            console.error('[PVP] WebSocket error:', err);
        };
    }

    disconnect() {
        this._stopPing();
        if (this.ws) {
            try {
                if (this.ws.readyState === WebSocket.OPEN) {
                    this.ws.send(JSON.stringify({ type: 'leave' }));
                }
                this.ws.close();
            } catch (e) { /* ignore */ }
            this.ws = null;
        }
        this.connected = false;
        this.playerId = null;
        this.serverState = null;
        this.players = [];
        this.orbs = [];
        this.mobs = [];
        this.projectiles = [];
        this.leaderboard = [];
        this.myInventory = [];
        this.myMaxSlots = 8;
    }

    // ─── Message Handling ───
    _handleMessage(msg) {
        switch (msg.type) {
            case 'joined': {
                this.playerId = msg.id;
                this.zoneInfo = msg.zone;
                this.myMaxSlots = msg.zone.maxSlots || 8;
                // Update game's arena size from server
                this.game.pvpArenaSize = msg.zone.arenaSize;
                this.game.showToast(`Joined ${msg.zone.name}!`, msg.zone.color, true);
                console.log('[PVP] Joined as', msg.id, 'in zone', msg.zone.name);
                break;
            }

            case 'state': {
                // Store previous state for interpolation
                this.prevPlayers.clear();
                for (const p of this.players) {
                    this.prevPlayers.set(p.id, { x: p.x, y: p.y });
                }

                this.players = msg.p;
                this.orbs = msg.o;
                this.mobs = msg.m;
                this.projectiles = msg.pr;
                this.leaderboard = msg.lb;
                this.myScore = msg.s;
                this.myHp = msg.hp;
                this.myMaxHp = msg.mhp;
                this.serverTime = msg.t;

                // Sync inventory from server
                if (msg.inv) {
                    this.myInventory = msg.inv;
                    this.game.inventory = msg.inv;
                    this.myMaxSlots = msg.ms || 8;
                }

                // Reset interpolation
                this.interpFactor = 0;
                this.lastStateTime = performance.now();
                break;
            }

            case 'death': {
                this.game.state = 'pvp_over';
                if (this.game.touch) this.game.touch.hide();
                this.game.camera.addShake(0.6);
                this.game.particles.burst(
                    this.game.camera.x, this.game.camera.y,
                    40, '#00ccff', 250, 1, 5
                );
                setTimeout(() => {
                    this.game.ui.showPVPVictory(null, {
                        time: msg.time,
                        score: msg.score,
                        rank: msg.rank,
                        zone: this.game.pvpZone,
                        leaderboard: msg.leaderboard.map(e => ({
                            id: e.id,
                            name: e.name,
                            score: e.score,
                            color: '#aaa',
                            alive: e.alive,
                            isBot: e.isBot,
                        })),
                    });
                }, 800);
                break;
            }

            case 'respawned': {
                this.game.state = 'pvp';
                if (this.game.touch) this.game.touch.show();
                this.game.showToast('Respawned!', '#4ade80', true);
                break;
            }

            case 'toast': {
                this.game.showToast(msg.msg, msg.color, true);
                break;
            }

            case 'equipped': {
                this.game.showToast('Petal equipped!', '#4ade80', false);
                this.game.audio.play('pickup', 0.5);
                break;
            }

            case 'unequipped': {
                this.game.showToast('Petal stored!', '#aaa', false);
                this.game.audio.play('pickup', 0.3);
                break;
            }

            case 'merged': {
                const nr = RARITIES[msg.newRarity];
                const cfg = ORBITAL_TYPES[msg.newType];
                if (nr && cfg) {
                    this.game.showToast(`Merged into ${nr.name} ${cfg.name}!`, nr.color, true);
                    this.game.audio.play('rare', 0.6);
                }
                break;
            }

            case 'pong': {
                this.pingMs = Date.now() - this.lastPingTime;
                break;
            }

            case 'error': {
                this.game.showToast(msg.msg || 'Server error', '#ff4444', false);
                break;
            }
        }
    }

    // ─── Input Sending ───
    sendInput(dx, dy, dash, extend, retract) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        // Only send if input changed
        if (dx === this.lastInputDx && dy === this.lastInputDy && !dash
            && extend === this.lastInputExtend && retract === this.lastInputRetract) return;
        this.lastInputDx = dx;
        this.lastInputDy = dy;
        this.lastInputExtend = extend;
        this.lastInputRetract = retract;

        this.ws.send(JSON.stringify({
            type: 'input',
            dx: +dx.toFixed(3),
            dy: +dy.toFixed(3),
            dash: dash || false,
            extend: extend || false,
            retract: retract || false,
        }));
    }

    sendEquip(invItemId) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        this.ws.send(JSON.stringify({ type: 'equip', invId: invItemId }));
    }

    sendUnequip(orbIndex) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        this.ws.send(JSON.stringify({ type: 'unequip', orbIndex }));
    }

    sendMerge(petalType, rarity) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        this.ws.send(JSON.stringify({ type: 'merge', petalType, rarity }));
    }

    // ─── Getters for Rendering ───
    getMyPlayer() {
        if (!this.playerId) return null;
        return this.players.find(p => p.id === this.playerId);
    }

    getOtherPlayers() {
        if (!this.playerId) return this.players;
        return this.players.filter(p => p.id !== this.playerId);
    }

    // Get interpolated position for smooth rendering
    getInterpolatedPos(entity) {
        const prev = this.prevPlayers.get(entity.id);
        if (!prev) return { x: entity.x, y: entity.y };

        const t = Math.min(1, this.interpFactor);
        return {
            x: prev.x + (entity.x - prev.x) * t,
            y: prev.y + (entity.y - prev.y) * t,
        };
    }

    // ─── Ping ───
    _startPing() {
        this._pingInterval = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.lastPingTime = Date.now();
                this.ws.send(JSON.stringify({ type: 'ping' }));
            }
        }, 3000);
    }

    _stopPing() {
        if (this._pingInterval) {
            clearInterval(this._pingInterval);
            this._pingInterval = null;
        }
    }

    destroy() {
        this._stopPing();
        this.disconnect();
    }
}
