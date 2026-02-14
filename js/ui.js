// ═══════════════════════════════════════════════════════
// ORBITRON — UI System (HUD, Menus, Toasts)
// ═══════════════════════════════════════════════════════

class UIManager {
    constructor(game) {
        this.game = game;
        this.elements = {
            mainMenu: document.getElementById('mainMenu'),
            upgradeShop: document.getElementById('upgradeShop'),
            achievementScreen: document.getElementById('achievementScreen'),
            levelUpScreen: document.getElementById('levelUpScreen'),
            deathScreen: document.getElementById('deathScreen'),
            permStashScreen: document.getElementById('permStashScreen'),
            preRunScreen: document.getElementById('preRunScreen'),
            hud: document.getElementById('hud'),
            hpBar: document.getElementById('hpBar'),
            hpText: document.getElementById('hpText'),
            xpBar: document.getElementById('xpBar'),
            xpText: document.getElementById('xpText'),
            waveDisplay: document.getElementById('waveDisplay'),
            zoneDisplay: document.getElementById('zoneDisplay'),
            killStreak: document.getElementById('killStreak'),
            timerDisplay: document.getElementById('timerDisplay'),
            statsPanel: document.getElementById('statsPanel'),
            orbitalSlots: document.getElementById('orbitalSlots'),
            menuStats: document.getElementById('menuStats'),
            stardustCount: document.getElementById('stardustCount'),
            shopItems: document.getElementById('shopItems'),
            achievementList: document.getElementById('achievementList'),
            upgradeChoices: document.getElementById('upgradeChoices'),
            deathStats: document.getElementById('deathStats'),
            toastContainer: document.getElementById('toastContainer'),
            inventoryPanel: document.getElementById('inventoryPanel'),
            inventoryGrid: document.getElementById('inventoryGrid'),
            inventoryMerge: document.getElementById('inventoryMerge'),
            inventoryCount: document.getElementById('inventoryCount'),
            petalPickSection: document.getElementById('petalPickSection'),
            petalPickGrid: document.getElementById('petalPickGrid'),
            permStashGrid: document.getElementById('permStashGrid'),
            stashEmpty: document.getElementById('stashEmpty'),
            preRunGrid: document.getElementById('preRunGrid'),
        };
        this.setupButtons();
        this.setupSlotKeys();
    }

    setupButtons() {
        document.getElementById('btnPlay').onclick = () => this.game.tryStartRun();
        document.getElementById('btnUpgrades').onclick = () => this.showScreen('upgradeShop');
        document.getElementById('btnStash').onclick = () => this.showScreen('permStashScreen');
        document.getElementById('btnAchievements').onclick = () => this.showScreen('achievementScreen');
        document.getElementById('btnBackShop').onclick = () => this.showScreen('mainMenu');
        document.getElementById('btnBackStash').onclick = () => this.showScreen('mainMenu');
        document.getElementById('btnBackAch').onclick = () => this.showScreen('mainMenu');
        document.getElementById('btnRestart').onclick = () => this.game.tryStartRun();
        document.getElementById('btnMainMenu').onclick = () => this.showScreen('mainMenu');
        document.getElementById('btnSkipPetal').onclick = () => this.game.startRun(null);
    }

    showScreen(screen) {
        ['mainMenu', 'upgradeShop', 'achievementScreen', 'levelUpScreen', 'deathScreen', 'permStashScreen', 'preRunScreen'].forEach(s => {
            this.elements[s].classList.toggle('hidden', s !== screen);
        });
        this.elements.hud.classList.toggle('hidden', screen !== null && screen !== 'levelUpScreen');

        if (screen === 'mainMenu') this.renderMainMenu();
        if (screen === 'upgradeShop') this.renderShop();
        if (screen === 'achievementScreen') this.renderAchievements();
        if (screen === 'permStashScreen') this.renderPermStash();
        if (screen === 'preRunScreen') this.renderPreRunSelection();
    }

    showHUD() {
        this.hideAllScreens();
        this.elements.hud.classList.remove('hidden');
    }

    hideAllScreens() {
        ['mainMenu', 'upgradeShop', 'achievementScreen', 'levelUpScreen', 'deathScreen', 'permStashScreen', 'preRunScreen'].forEach(s => {
            this.elements[s].classList.add('hidden');
        });
    }

    // ─── Main Menu ───
    renderMainMenu() {
        const save = this.game.saveData;
        let html = '';
        if (save.totalRuns > 0) {
            html += `Best Wave: <strong>${save.bestWave}</strong> | Best Level: <strong>${save.bestLevel}</strong><br>`;
            html += `Total Kills: <strong>${save.totalKills.toLocaleString()}</strong> | Runs: <strong>${save.totalRuns}</strong><br>`;
            html += `Stardust: <strong style="color:#ffaa00">${save.stardust} ✦</strong>`;
            const stashCount = (save.permInventory || []).length;
            if (stashCount > 0) {
                html += `<br>Stash: <strong style="color:#00ffcc">${stashCount} petal${stashCount !== 1 ? 's' : ''}</strong>`;
            }
        }
        this.elements.menuStats.innerHTML = html;
    }

    // ─── Shop ───
    renderShop() {
        const save = this.game.saveData;
        this.elements.stardustCount.textContent = save.stardust;
        let html = '';
        for (const u of PERM_UPGRADES) {
            const level = this.game.saveSystem.getUpgradeLevel(save, u.id);
            const maxed = level >= u.maxLevel;
            const cost = maxed ? 'MAX' : this.game.saveSystem.getUpgradeCost(u, level);
            html += `
                <div class="shop-item ${maxed ? 'maxed' : ''}" data-id="${u.id}">
                    <div class="item-name">${u.icon} ${u.name}</div>
                    <div class="item-level">Level ${level}/${u.maxLevel}</div>
                    <div class="item-effect">${u.desc}</div>
                    <div class="item-cost">${maxed ? '✅ MAXED' : cost + ' ✦'}</div>
                </div>
            `;
        }
        this.elements.shopItems.innerHTML = html;

        // Click handlers
        this.elements.shopItems.querySelectorAll('.shop-item:not(.maxed)').forEach(el => {
            el.onclick = () => {
                const upgrade = PERM_UPGRADES.find(u => u.id === el.dataset.id);
                if (upgrade && this.game.saveSystem.buyUpgrade(save, upgrade)) {
                    this.game.audio.play('pickup', 0.5);
                    this.renderShop();
                }
            };
        });
    }

    // ─── Achievements ───
    renderAchievements() {
        const save = this.game.saveData;
        let html = '';
        for (const a of ACHIEVEMENTS) {
            const unlocked = save.achievements.includes(a.id);
            html += `
                <div class="ach-item ${unlocked ? 'unlocked' : ''}">
                    <div class="ach-name">${unlocked ? '✅' : '🔒'} ${a.name}</div>
                    <div class="ach-desc">${a.desc}</div>
                    <div class="ach-reward">${a.reward}</div>
                </div>
            `;
        }
        this.elements.achievementList.innerHTML = html;
    }

    // ─── Level Up Screen ───
    showLevelUp(choices) {
        this.elements.hud.classList.remove('hidden');
        this.elements.levelUpScreen.classList.remove('hidden');
        let html = '';
        choices.forEach((c, i) => {
            const rarityColor = c.color || '#aaa';
            html += `
                <div class="upgrade-card" data-index="${i}" style="border-color: ${rarityColor}40">
                    <div class="icon">${c.icon}</div>
                    <div class="name" style="color: ${rarityColor}">${c.name}</div>
                    <div class="desc">${c.desc}</div>
                    <span class="rarity-tag" style="background: ${rarityColor}22; color: ${rarityColor}; border: 1px solid ${rarityColor}44">${c.rarityName}</span>
                </div>
            `;
        });
        this.elements.upgradeChoices.innerHTML = html;

        this.elements.upgradeChoices.querySelectorAll('.upgrade-card').forEach(el => {
            el.onclick = () => {
                const idx = parseInt(el.dataset.index);
                this.game.upgradeSystem.applyChoice(choices[idx]);
                this.elements.levelUpScreen.classList.add('hidden');
                this.game.paused = false;
            };
        });
    }

    // ─── Death Screen ───
    showDeath(stats) {
        this.elements.hud.classList.add('hidden');
        this.elements.levelUpScreen.classList.add('hidden');
        this.elements.deathScreen.classList.remove('hidden');
        this.elements.deathScreen.querySelector('.death-container').style.animation = 'none';
        void this.elements.deathScreen.querySelector('.death-container').offsetHeight;
        this.elements.deathScreen.querySelector('.death-container').style.animation = '';

        const stardust = stats.stardustEarned || 0;
        this.elements.deathStats.innerHTML = `
            <div>Wave Reached: <span class="highlight">${stats.wave}</span></div>
            <div>Level: <span class="highlight">${stats.level}</span></div>
            <div>Enemies Killed: <span class="highlight">${stats.kills.toLocaleString()}</span></div>
            <div>Time Survived: <span class="highlight">${this.formatTime(stats.time)}</span></div>
            <div>Best Kill Streak: <span class="highlight">${stats.bestStreak}</span></div>
            <div>Boss Kills: <span class="highlight">${stats.bossKills}</span></div>
            <br>
            <div>Stardust Earned: <span class="stardust">${stardust} ✦</span></div>
        `;

        // Show petal pick section
        this.renderDeathPetalPick();
    }

    // ─── Death Screen Petal Pick ───
    renderDeathPetalPick() {
        const game = this.game;
        const allPetals = game._deathPetals || [];

        if (allPetals.length === 0) {
            this.elements.petalPickSection.style.display = 'none';
            return;
        }

        this.elements.petalPickSection.style.display = '';
        this.elements.petalPickSection.classList.remove('hidden');
        this._petalAlreadySaved = false;

        // Sort by rarity (highest first)
        const sorted = [...allPetals].sort((a, b) => {
            return RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity);
        });

        let html = '';
        sorted.forEach((petal, i) => {
            const r = RARITIES[petal.rarity];
            const cfg = ORBITAL_TYPES[petal.type];
            const rainbow = r.rainbow ? ' rainbow' : '';
            html += `<div class="petal-pick-item${rainbow}" data-pick-idx="${i}"
                style="border-color: ${r.color}60; background: ${r.color}10"
                title="Click to save ${r.name} ${cfg.name} permanently">
                <span class="pick-icon">${cfg.icon}</span>
                <span class="pick-rarity-dot" style="background: ${r.color}"></span>
                <span class="pick-name" style="color: ${r.color}">${r.name}</span>
            </div>`;
        });
        this.elements.petalPickGrid.innerHTML = html;

        // Click a petal = immediately save it
        this.elements.petalPickGrid.querySelectorAll('.petal-pick-item').forEach(el => {
            el.onclick = () => {
                if (this._petalAlreadySaved) return;
                const idx = parseInt(el.dataset.pickIdx);
                const petal = sorted[idx];
                if (!petal) return;

                // Save immediately
                this._petalAlreadySaved = true;
                game.saveData.permInventory.push({ type: petal.type, rarity: petal.rarity });
                game.saveSystem.save(game.saveData);

                // Visual feedback — mark as saved
                this.elements.petalPickGrid.querySelectorAll('.petal-pick-item').forEach(e => {
                    e.classList.add('pick-disabled');
                });
                el.classList.add('pick-saved');

                // Update section title
                const r = RARITIES[petal.rarity];
                const cfg = ORBITAL_TYPES[petal.type];
                this.elements.petalPickSection.querySelector('.petal-pick-title').innerHTML =
                    `✓ SAVED <span style="color:${r.color}">${r.name} ${cfg.name}</span>`;
                this.elements.petalPickSection.querySelector('.petal-pick-subtitle').textContent =
                    'This petal is now in your permanent stash!';

                game.showToast(`Saved ${r.name} ${cfg.name} to stash!`, r.color, true);
            };
        });
    }

    // ─── Permanent Stash Screen ───
    renderPermStash() {
        const stash = this.game.saveData.permInventory || [];
        if (stash.length === 0) {
            this.elements.permStashGrid.innerHTML = '';
            this.elements.stashEmpty.style.display = '';
            return;
        }
        this.elements.stashEmpty.style.display = 'none';

        let html = '';
        stash.forEach((petal, i) => {
            const r = RARITIES[petal.rarity];
            const cfg = ORBITAL_TYPES[petal.type];
            const rainbow = r.rainbow ? ' rainbow' : '';
            html += `<div class="stash-item${rainbow}" data-stash-idx="${i}"
                style="border-color: ${r.color}60; background: ${r.color}08"
                title="${r.name} ${cfg.name}">
                <span class="stash-delete" data-stash-del="${i}">✕</span>
                <span class="stash-icon">${cfg.icon}</span>
                <span class="stash-rarity-dot" style="background: ${r.color}"></span>
                <span class="stash-name" style="color: ${r.color}">${r.name}</span>
            </div>`;
        });
        this.elements.permStashGrid.innerHTML = html;

        // Delete handlers
        this.elements.permStashGrid.querySelectorAll('.stash-delete').forEach(del => {
            del.onclick = (e) => {
                e.stopPropagation();
                const idx = parseInt(del.dataset.stashDel);
                const removed = this.game.saveData.permInventory.splice(idx, 1)[0];
                this.game.saveSystem.save(this.game.saveData);
                if (removed) {
                    this.game.showToast(`Removed ${RARITIES[removed.rarity].name} ${ORBITAL_TYPES[removed.type].name} from stash`, '#ff6666', false);
                }
                this.renderPermStash();
            };
        });
    }

    // ─── Pre-Run Petal Selection ───
    renderPreRunSelection() {
        const stash = this.game.saveData.permInventory || [];
        let html = '';
        stash.forEach((petal, i) => {
            const r = RARITIES[petal.rarity];
            const cfg = ORBITAL_TYPES[petal.type];
            const rainbow = r.rainbow ? ' rainbow' : '';
            html += `<div class="prerun-item${rainbow}" data-prerun-idx="${i}"
                style="border-color: ${r.color}60; background: ${r.color}08"
                title="${r.name} ${cfg.name}">
                <span class="prerun-icon">${cfg.icon}</span>
                <span class="prerun-rarity-dot" style="background: ${r.color}"></span>
                <span class="prerun-name" style="color: ${r.color}">${r.name}</span>
            </div>`;
        });
        this.elements.preRunGrid.innerHTML = html;

        this.elements.preRunGrid.querySelectorAll('.prerun-item').forEach(el => {
            el.onclick = () => {
                const idx = parseInt(el.dataset.prerunIdx);
                const petal = stash[idx];
                if (petal) {
                    this.game.startRun(petal);
                }
            };
        });
    }

    // ─── HUD Update ───
    updateHUD(player, waveSystem, time) {
        const hpPct = Math.max(0, (player.hp / player.maxHp) * 100);
        this.elements.hpBar.style.width = hpPct + '%';
        this.elements.hpText.textContent = `${Math.ceil(player.hp)} / ${Math.ceil(player.maxHp)}`;

        const xpPct = (player.xp / player.xpToNext) * 100;
        this.elements.xpBar.style.width = xpPct + '%';
        this.elements.xpText.textContent = `Lv ${player.level} — ${Math.floor(player.xp)}/${player.xpToNext}`;

        if (waveSystem.betweenWaves) {
            this.elements.waveDisplay.textContent = `Next wave in ${Math.ceil(waveSystem.timer)}s`;
        } else {
            this.elements.waveDisplay.textContent = `Wave ${waveSystem.wave}`;
        }

        const { zone } = getZone(player.x, player.y);
        this.elements.zoneDisplay.textContent = zone.name;
        this.elements.zoneDisplay.style.color = zone.color === '#1a3a1a' ? '#4ade80' : zone.color;

        if (this.game.killStreak > 1) {
            this.elements.killStreak.textContent = `🔥 ${this.game.killStreak}x Streak`;
        } else {
            this.elements.killStreak.textContent = '';
        }

        this.elements.timerDisplay.textContent = this.formatTime(time);

        // Stats panel
        this.elements.statsPanel.innerHTML = `
            DMG: ${(player.damage * 100).toFixed(0)}%<br>
            SPD: ${player.speed.toFixed(0)}<br>
            ARM: ${player.armor.toFixed(0)}<br>
            LCK: ${(player.luck * 100).toFixed(0)}%<br>
            RGN: ${player.hpRegen.toFixed(1)}/s
        `;

        // Orbital slots
        this.renderOrbitalSlots(player);
    }

    renderOrbitalSlots(player) {
        let html = '';
        for (let i = 0; i < player.maxSlots; i++) {
            if (i < player.orbitals.length) {
                const o = player.orbitals[i];
                const cfg = ORBITAL_TYPES[o.type];
                const r = RARITIES[o.rarity];
                html += `<div class="orbital-slot filled" data-slot="${i}" style="border-color: ${r.color}60; box-shadow: 0 0 8px ${r.color}30" title="Press ${i + 1} to store in inventory — ${r.name} ${cfg.name} Lv${o.level}">
                    <span class="slot-number">${i + 1}</span>
                    <span style="font-size: 1.5rem">${cfg.icon}</span>
                    ${o.level > 1 ? `<span class="orbital-level" style="color: ${r.color}">Lv${o.level}</span>` : ''}
                    <span class="orbital-rarity-dot" style="background: ${r.color}"></span>
                </div>`;
            } else {
                html += `<div class="orbital-slot empty" data-slot="${i}"><span style="color: #333; font-size: 1.2rem">+</span></div>`;
            }
        }
        this.elements.orbitalSlots.innerHTML = html;
    }

    // ─── Number keys 1-9 to move loadout slot → inventory ───
    setupSlotKeys() {
        window.addEventListener('keydown', (e) => {
            const game = this.game;
            if (game.state !== 'playing' || game.paused) return;
            const num = parseInt(e.key);
            if (num >= 1 && num <= 9) {
                const player = game.player;
                if (!player) return;
                const idx = num - 1;
                if (idx < player.orbitals.length) {
                    const removed = player.removeOrbital(idx);
                    if (removed) {
                        game.inventory.push({ type: removed.type, rarity: removed.rarity, id: game.nextInvId++ });
                        const cfg = ORBITAL_TYPES[removed.type];
                        const r = RARITIES[removed.rarity];
                        game.showToast(`Stored ${r.name} ${cfg.name} in inventory`, r.color, false);
                        game.audio.play('pickup', 0.3);
                        this.renderOrbitalSlots(player);
                        this.renderInventory();
                    }
                }
            }
        });
    }

    // ─── Inventory Panel ───
    renderInventory() {
        const game = this.game;
        const inv = game.inventory;

        // Update count
        this.elements.inventoryCount.textContent = inv.length;

        // Sort by rarity (highest first)
        const sorted = [...inv].sort((a, b) => {
            return RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity);
        });

        let gridHtml = '';
        for (const item of sorted) {
            const r = RARITIES[item.rarity];
            const cfg = ORBITAL_TYPES[item.type];
            const rainbow = r.rainbow ? ' rainbow' : '';
            gridHtml += `<div class="inv-item${rainbow}" data-inv-id="${item.id}"
                style="border-color: ${r.color}60; background: ${r.color}15"
                title="Click to equip — ${r.name} ${cfg.name}">
                <span class="inv-icon">${cfg.icon}</span>
                <span class="inv-rarity-dot" style="background: ${r.color}"></span>
            </div>`;
        }
        this.elements.inventoryGrid.innerHTML = gridHtml;

        // Merge buttons — 3 of same type + rarity → next rarity of same type
        const typeRarityCounts = {};
        for (const item of inv) {
            const key = `${item.type}|${item.rarity}`;
            typeRarityCounts[key] = (typeRarityCounts[key] || 0) + 1;
        }

        let mergeHtml = '';
        for (const [key, count] of Object.entries(typeRarityCounts)) {
            if (count < 3) continue;
            const [type, rarity] = key.split('|');
            const ri = RARITY_ORDER.indexOf(rarity);
            if (ri < 0 || ri >= RARITY_ORDER.length - 1) continue;
            const nextRarity = RARITY_ORDER[ri + 1];
            const r = RARITIES[rarity];
            const nr = RARITIES[nextRarity];
            const cfg = ORBITAL_TYPES[type];
            mergeHtml += `<button class="merge-btn" data-type="${type}" data-rarity="${rarity}"
                style="border-color: ${nr.color}60; color: ${nr.color}">
                3 ${r.name} ${cfg.name} → ${nr.name} ${cfg.name} (${count})
            </button>`;
        }
        this.elements.inventoryMerge.innerHTML = mergeHtml;

        // Merge click handlers
        this.elements.inventoryMerge.querySelectorAll('.merge-btn').forEach(btn => {
            btn.onclick = () => {
                const type = btn.dataset.type;
                const rarity = btn.dataset.rarity;
                const ri = RARITY_ORDER.indexOf(rarity);
                if (ri < 0 || ri >= RARITY_ORDER.length - 1) return;

                const items = game.inventory.filter(item => item.type === type && item.rarity === rarity);
                if (items.length < 3) return;

                // Remove 3 items
                const toRemove = items.slice(0, 3).map(i => i.id);
                game.inventory = game.inventory.filter(i => !toRemove.includes(i.id));

                // Add 1 of next rarity, same type
                const nextRarity = RARITY_ORDER[ri + 1];
                game.inventory.push({ type: type, rarity: nextRarity, id: game.nextInvId++ });

                this.renderInventory();

                const nr = RARITIES[nextRarity];
                const cfg = ORBITAL_TYPES[type];
                game.showToast(`Merged into ${nr.name} ${cfg.name}!`, nr.color, ri >= 3);
                game.audio.play('rare', 0.6);
                if (game.player) {
                    game.particles.ring(game.player.x, game.player.y, 16, nr.color, 50, 0.5, 4);
                }
            };
        });

        // Setup click-to-equip on inventory items
        this.setupInventoryClicks();
    }

    setupInventoryClicks() {
        const game = this.game;
        const items = this.elements.inventoryGrid.querySelectorAll('.inv-item');

        items.forEach(item => {
            item.addEventListener('click', () => {
                const player = game.player;
                if (!player) return;
                const invId = parseInt(item.dataset.invId);
                const invIdx = game.inventory.findIndex(i => i.id === invId);
                if (invIdx < 0) return;

                if (player.orbitals.length < player.maxSlots) {
                    // Has room — equip directly
                    const invItem = game.inventory.splice(invIdx, 1)[0];
                    player.addOrbital(invItem.type, invItem.rarity);
                    const r = RARITIES[invItem.rarity];
                    const cfg = ORBITAL_TYPES[invItem.type];
                    game.showToast(`Equipped ${r.name} ${cfg.name}!`, r.color, false);
                    game.audio.play('pickup', 0.5);
                    this.renderOrbitalSlots(player);
                    this.renderInventory();
                } else {
                    game.showToast('Loadout full! Press 1-' + player.maxSlots + ' to store a petal first.', '#ff6666', false);
                }
            });
        });
    }

    // ─── Minimap ───
    renderMinimap(player, enemies) {
        const mc = document.getElementById('minimap');
        const mctx = mc.getContext('2d');
        const scale = mc.width / CONFIG.WORLD_SIZE;

        mctx.fillStyle = '#0a0a1a';
        mctx.fillRect(0, 0, mc.width, mc.height);

        // Zone rings
        const cx = CONFIG.WORLD_SIZE / 2 * scale;
        const cy = CONFIG.WORLD_SIZE / 2 * scale;
        for (const z of ZONES) {
            mctx.globalAlpha = 0.15;
            mctx.beginPath();
            mctx.arc(cx, cy, z.maxDist * scale, 0, Math.PI * 2);
            mctx.strokeStyle = z.color;
            mctx.lineWidth = 1;
            mctx.stroke();
        }
        mctx.globalAlpha = 1;

        // Enemies (as dots)
        mctx.fillStyle = '#ff4444';
        for (const e of enemies) {
            const ex = e.x * scale, ey = e.y * scale;
            mctx.fillRect(ex - 0.5, ey - 0.5, 1, 1);
        }

        // Player
        mctx.fillStyle = '#00ccff';
        const px = player.x * scale, py = player.y * scale;
        mctx.beginPath();
        mctx.arc(px, py, 3, 0, Math.PI * 2);
        mctx.fill();

        // Viewport box
        const game = this.game;
        const vx = game.camera.x * scale - (canvas.width * scale) / 2;
        const vy = game.camera.y * scale - (canvas.height * scale) / 2;
        const vw = canvas.width * scale;
        const vh = canvas.height * scale;
        mctx.strokeStyle = 'rgba(255,255,255,0.3)';
        mctx.lineWidth = 1;
        mctx.strokeRect(vx, vy, vw, vh);
    }

    // ─── Toast Notifications ───
    showToast(text, color = '#fff', isRarity = false) {
        const toast = document.createElement('div');
        toast.className = `toast ${isRarity ? 'rarity-toast' : ''}`;
        toast.style.borderColor = color;
        toast.style.color = color;
        toast.textContent = text;
        this.elements.toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    // ─── Helpers ───
    formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    }
}
