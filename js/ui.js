// ═══════════════════════════════════════════════════════
// ORBITRON — UI System (HUD, Menus, Toasts)
// ═══════════════════════════════════════════════════════

const TUTORIAL_STEPS = [
    { icon: '🎮', title: 'Welcome to Orbitron!', text: 'Survive waves of enemies using orbiting petals. Each run gets harder — collect loot, merge petals, and build your permanent stash to grow stronger over time.' },
    { icon: '🕹️', title: 'Movement', text: 'Use WASD or Arrow Keys to move your character around the arena. Stay mobile to dodge enemy attacks and projectiles!' },
    { icon: '🌸', title: 'Petals', text: 'Petals orbit around you automatically. They deal damage to enemies on contact. You start each run with 5 random petals.' },
    { icon: '💫', title: 'Petal Control', text: 'Press SPACE to extend your petals outward for wider reach. Press SHIFT to retract them closer for tighter defense. Use Q to dash through danger!' },
    { icon: '⬆️', title: 'Leveling Up', text: 'Kill enemies to earn XP gems (green diamonds). Level up to choose new petals! Higher rarity petals deal more damage and have more HP.' },
    { icon: '📦', title: 'Loot & Inventory', text: 'Defeated enemies may drop loot. Press E to pick up nearby loot, or O to store your currently equipped petals into your inventory. Press 1-9 to store specific petal slots.' },
    { icon: '🔀', title: 'Merging', text: 'Collect 3 petals of the same type and rarity, then merge them in your inventory panel for a higher rarity petal! This is the main way to get powerful petals.' },
    { icon: '👹', title: 'Bosses', text: 'A boss appears every 5 waves. Bosses are tough but drop great loot. Each boss has unique attack patterns — learn to dodge them!' },
    { icon: '💀', title: 'Death & Stash', text: 'When you die, you can save ONE petal to your permanent stash. Stashed petals persist forever and you can choose one to start your next run with.' },
    { icon: '✦', title: 'Stardust & Upgrades', text: 'Earn Stardust each run based on waves survived. Spend it on permanent upgrades (damage, HP, luck, etc.) that boost every future run.' },
    { icon: '�', title: 'Player Skins', text: 'Visit the SKINS shop to spend Stardust on custom player appearances. Unlock skins like Ember, Frost, Shadow, Nebula, and more — even the dazzling rainbow Prism skin!' },
    { icon: '⚔️', title: 'Local PVP', text: 'Challenge a friend in LOCAL PVP mode! Player 1 uses WASD + Space/Shift/Q. Player 2 uses Arrow Keys + Period/Comma/Slash. Both players share the same stash petals. Last one standing wins!' },
    { icon: '�🏆', title: 'Tips', text: 'Check DROP RATES to see what rarities unlock at each wave. Hover over petals to see their damage and HP stats. Good luck, survivor!' },
];

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
            dropRateScreen: document.getElementById('dropRateScreen'),
            dropRateTable: document.getElementById('dropRateTable'),
            petalInfoScreen: document.getElementById('petalInfoScreen'),
            petalInfoTable: document.getElementById('petalInfoTable'),
            tutorialOverlay: document.getElementById('tutorialOverlay'),
            skinScreen: document.getElementById('skinScreen'),
            skinGrid: document.getElementById('skinGrid'),
            pvpScreen: document.getElementById('pvpScreen'),
            pvpVictoryScreen: document.getElementById('pvpVictoryScreen'),
            pvpHud: document.getElementById('pvpHud'),
        };
        this.tutorialStep = 0;
        this.setupButtons();
        this.setupTutorial();
        this.setupSlotKeys();
        this.setupModPanel();
    }

    setupButtons() {
        document.getElementById('btnPlay').onclick = () => this.game.tryStartRun();
        document.getElementById('btnUpgrades').onclick = () => this.showScreen('upgradeShop');
        document.getElementById('btnStash').onclick = () => this.showScreen('permStashScreen');
        document.getElementById('btnAchievements').onclick = () => this.showScreen('achievementScreen');
        document.getElementById('btnDropRates').onclick = () => this.showScreen('dropRateScreen');
        document.getElementById('btnPetalInfo').onclick = () => this.showScreen('petalInfoScreen');
        document.getElementById('btnTutorial').onclick = () => this.showTutorial();
        document.getElementById('btnSkins').onclick = () => this.showScreen('skinScreen');
        document.getElementById('btnPVP').onclick = () => this.showScreen('pvpScreen');
        document.getElementById('btnBackShop').onclick = () => this.showScreen('mainMenu');
        document.getElementById('btnBackStash').onclick = () => this.showScreen('mainMenu');
        document.getElementById('btnBackAch').onclick = () => this.showScreen('mainMenu');
        document.getElementById('btnBackDropRates').onclick = () => this.showScreen('mainMenu');
        document.getElementById('btnBackPetalInfo').onclick = () => this.showScreen('mainMenu');
        document.getElementById('btnBackSkins').onclick = () => this.showScreen('mainMenu');
        document.getElementById('btnBackPVP').onclick = () => this.showScreen('mainMenu');
        document.getElementById('btnStartPVP').onclick = () => this.game.startPVP();
        document.getElementById('btnPVPRematch').onclick = () => this.game.startPVP();
        document.getElementById('btnPVPMenu').onclick = () => { this.game.endPVP(); this.showScreen('mainMenu'); };
        document.getElementById('btnRestart').onclick = () => this.game.tryStartRun();
        document.getElementById('btnMainMenu').onclick = () => this.showScreen('mainMenu');
        document.getElementById('btnSkipPetal').onclick = () => this.game.startRun(null);

        // Drop rate slider
        const slider = document.getElementById('dropRateWaveSlider');
        const label = document.getElementById('dropRateWaveLabel');
        slider.oninput = () => {
            label.textContent = slider.value;
            this.renderDropRateTable(parseInt(slider.value));
        };

        // Secret code
        const codeInput = document.getElementById('secretCodeInput');
        document.getElementById('btnSecretCode').onclick = () => {
            const code = codeInput.value.trim().toLowerCase();
            if (code === 'mod') {
                this.applyModCode();
                codeInput.value = '';
            } else {
                this.game.showToast('Invalid code', '#ff4444', false);
            }
        };
        codeInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') document.getElementById('btnSecretCode').click();
        });
    }

    showScreen(screen) {
        ['mainMenu', 'upgradeShop', 'achievementScreen', 'levelUpScreen', 'deathScreen', 'permStashScreen', 'preRunScreen', 'dropRateScreen', 'petalInfoScreen', 'skinScreen', 'pvpScreen', 'pvpVictoryScreen'].forEach(s => {
            this.elements[s].classList.toggle('hidden', s !== screen);
        });
        this.elements.hud.classList.toggle('hidden', screen !== null && screen !== 'levelUpScreen');
        this.elements.pvpHud.classList.add('hidden');

        if (screen === 'mainMenu') this.renderMainMenu();
        if (screen === 'upgradeShop') this.renderShop();
        if (screen === 'achievementScreen') this.renderAchievements();
        if (screen === 'permStashScreen') this.renderPermStash();
        if (screen === 'preRunScreen') this.renderPreRunSelection();
        if (screen === 'dropRateScreen') this.renderDropRateTable(1);
        if (screen === 'petalInfoScreen') this.renderPetalInfo();
        if (screen === 'skinScreen') this.renderSkinShop();

        // Ad visibility — show on menu/death screens, hide during gameplay
        if (window.OrbitronAds) {
            if (screen === 'mainMenu' || screen === 'deathScreen') {
                window.OrbitronAds.showMenuAds();
            }
        }
    }

    applyModCode() {
        const game = this.game;
        game.modEnabled = true;
        // Also add eternals to stash
        const stash = game.saveData.permInventory;
        for (const typeKey of ORBITAL_TYPE_KEYS) {
            stash.push({ type: typeKey, rarity: 'eternal' });
        }
        game.saveSystem.save(game.saveData);
        game.showToast('🌟 MOD MODE ENABLED — All Eternals added!', '#4ade80', true);
        game.audio.play('rare', 0.8);
    }

    // ─── Mod Panel ───
    setupModPanel() {
        const panel = document.getElementById('modSidebar');
        if (!panel) return;

        // Wave
        document.getElementById('modBtnWave').onclick = () => {
            this.game.modSetWave(document.getElementById('modWaveInput').value);
        };
        // HP
        document.getElementById('modBtnHP').onclick = () => {
            this.game.modSetHP(document.getElementById('modHPInput').value);
        };
        // Regen
        document.getElementById('modBtnRegen').onclick = () => {
            this.game.modSetRegen(document.getElementById('modRegenInput').value);
        };
        // Speed
        document.getElementById('modBtnSpeed').onclick = () => {
            this.game.modSetSpeed(document.getElementById('modSpeedInput').value);
        };
        // Damage
        document.getElementById('modBtnDamage').onclick = () => {
            this.game.modSetDamage(document.getElementById('modDamageInput').value);
        };
        // God Mode
        document.getElementById('modBtnGod').onclick = () => {
            this.game.modToggleGodMode();
            this.updateModPanel();
        };
        // Kill All
        document.getElementById('modBtnKillAll').onclick = () => {
            this.game.modKillAll();
        };
        // Add Petal
        document.getElementById('modBtnAddPetal').onclick = () => {
            const type = document.getElementById('modPetalType').value;
            const rarity = document.getElementById('modPetalRarity').value;
            this.game.modAddPetal(type, rarity);
        };
        // Stardust
        document.getElementById('modBtnStardust').onclick = () => {
            this.game.modGiveStardust(document.getElementById('modStardustInput').value);
        };

        // Populate dropdowns
        const typeSelect = document.getElementById('modPetalType');
        for (const key of ORBITAL_TYPE_KEYS) {
            const opt = document.createElement('option');
            opt.value = key;
            opt.textContent = `${ORBITAL_TYPES[key].icon} ${ORBITAL_TYPES[key].name}`;
            typeSelect.appendChild(opt);
        }
        const raritySelect = document.getElementById('modPetalRarity');
        for (const key of RARITY_ORDER) {
            const opt = document.createElement('option');
            opt.value = key;
            opt.textContent = RARITIES[key].name;
            raritySelect.appendChild(opt);
        }
    }

    showModPanel() {
        const panel = document.getElementById('modSidebar');
        if (panel && this.game.modEnabled) panel.classList.remove('hidden');
    }

    hideModPanel() {
        const panel = document.getElementById('modSidebar');
        if (panel) panel.classList.add('hidden');
    }

    updateModPanel() {
        const godBtn = document.getElementById('modBtnGod');
        if (godBtn) {
            godBtn.textContent = this.game.godMode ? '🛡️ GOD MODE: ON' : '🛡️ GOD MODE: OFF';
            godBtn.style.background = this.game.godMode ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.05)';
        }
    }

    // ─── Tutorial ───
    setupTutorial() {
        document.getElementById('btnTutNext').onclick = () => {
            if (this.tutorialStep < TUTORIAL_STEPS.length - 1) {
                this.tutorialStep++;
                this.renderTutorialStep();
            } else {
                this.hideTutorial();
            }
        };
        document.getElementById('btnTutPrev').onclick = () => {
            if (this.tutorialStep > 0) {
                this.tutorialStep--;
                this.renderTutorialStep();
            }
        };

        // Show tutorial automatically on first visit
        if (!localStorage.getItem('orbitron_tutorial_seen')) {
            this.showTutorial();
            localStorage.setItem('orbitron_tutorial_seen', '1');
        }
    }

    showTutorial() {
        this.tutorialStep = 0;
        this.elements.tutorialOverlay.classList.remove('hidden');
        this.renderTutorialStep();
    }

    hideTutorial() {
        this.elements.tutorialOverlay.classList.add('hidden');
    }

    renderTutorialStep() {
        const step = TUTORIAL_STEPS[this.tutorialStep];
        const total = TUTORIAL_STEPS.length;
        document.getElementById('tutorialIcon').textContent = step.icon;
        document.getElementById('tutorialTitle').textContent = step.title;
        document.getElementById('tutorialText').textContent = step.text;

        // Step dots
        let dots = '';
        for (let i = 0; i < total; i++) {
            dots += `<span class="tut-dot${i === this.tutorialStep ? ' active' : ''}"></span>`;
        }
        document.getElementById('tutorialStepIndicator').innerHTML = dots;

        // Button states
        document.getElementById('btnTutPrev').style.visibility = this.tutorialStep > 0 ? 'visible' : 'hidden';
        document.getElementById('btnTutNext').textContent = this.tutorialStep < total - 1 ? 'NEXT' : 'GOT IT!';
    }

    showHUD() {
        this.hideAllScreens();
        this.elements.hud.classList.remove('hidden');
        this.showModPanel();
        // Hide sidebar ads during gameplay
        if (window.OrbitronAds) window.OrbitronAds.hideGameplayAds();
    }

    hideAllScreens() {
        ['mainMenu', 'upgradeShop', 'achievementScreen', 'levelUpScreen', 'deathScreen', 'permStashScreen', 'preRunScreen', 'dropRateScreen', 'petalInfoScreen', 'skinScreen', 'pvpScreen', 'pvpVictoryScreen'].forEach(s => {
            this.elements[s].classList.add('hidden');
        });
        this.hideModPanel();
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

        const stash = game.saveData.permInventory || [];

        let html = '';
        sorted.forEach((petal, i) => {
            const r = RARITIES[petal.rarity];
            const cfg = ORBITAL_TYPES[petal.type];
            const rainbow = r.rainbow ? ' rainbow' : '';
            const inStash = stash.some(s => s.type === petal.type && s.rarity === petal.rarity);
            const dupClass = inStash ? ' pick-in-stash' : '';
            html += `<div class="petal-pick-item${rainbow}${dupClass}" data-pick-idx="${i}"
                style="border-color: ${r.color}60; background: ${r.color}10"
                title="${inStash ? '(Already in stash) ' : 'Click to save '}${r.name} ${cfg.name}">
                <span class="pick-icon">${cfg.icon}</span>
                <span class="pick-rarity-dot" style="background: ${r.color}"></span>
                <span class="pick-name" style="color: ${r.color}">${r.name}${inStash ? ' ✓' : ''}</span>
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

                // Check if this exact type+rarity is already in stash
                const stash = game.saveData.permInventory || [];
                const isDuplicate = stash.some(s => s.type === petal.type && s.rarity === petal.rarity);
                if (isDuplicate) {
                    game.showToast(`Already have ${RARITIES[petal.rarity].name} ${ORBITAL_TYPES[petal.type].name} in stash!`, '#ff8800', false);
                    return;
                }

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

        // Sort by rarity (highest first)
        const indexed = stash.map((p, i) => ({ ...p, _origIdx: i }));
        indexed.sort((a, b) => RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity));

        let html = '';
        indexed.forEach((petal) => {
            const r = RARITIES[petal.rarity];
            const cfg = ORBITAL_TYPES[petal.type];
            const rainbow = r.rainbow ? ' rainbow' : '';
            html += `<div class="stash-item${rainbow}" data-stash-idx="${petal._origIdx}"
                style="border-color: ${r.color}60; background: ${r.color}08"
                title="${r.name} ${cfg.name}">
                <span class="stash-delete" data-stash-del="${petal._origIdx}">✕</span>
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

    // ─── Drop Rate Table ───
    renderDropRateTable(wave) {
        const caps = getWaveRarityCaps(wave);
        let html = '<table class="droprate-grid">';
        html += '<tr><th>Rarity</th><th>Chance</th></tr>';
        RARITY_ORDER.forEach((key, i) => {
            const r = RARITIES[key];
            const pct = caps[i];
            let display;
            if (pct <= 0) display = '<span style="color:#555">—</span>';
            else if (pct >= 100) display = '<span style="color:#4ade80">100%</span>';
            else display = `<span>${pct.toFixed(2)}%</span>`;
            const bar = Math.min(pct, 100);
            html += `<tr>
                <td style="color:${r.color}; font-weight:700">${r.name}</td>
                <td>
                    <div class="droprate-bar-bg">
                        <div class="droprate-bar-fill" style="width:${bar}%; background:${r.color}"></div>
                    </div>
                    ${display}
                </td>
            </tr>`;
        });
        html += '</table>';
        this.elements.dropRateTable.innerHTML = html;
        // Reset slider to match
        document.getElementById('dropRateWaveSlider').value = wave;
        document.getElementById('dropRateWaveLabel').textContent = wave;
    }

    // ─── Petal Encyclopedia ───
    renderPetalInfo() {
        let html = '';
        for (const typeKey of ORBITAL_TYPE_KEYS) {
            const cfg = ORBITAL_TYPES[typeKey];
            html += `<div class="petal-info-section">`;
            html += `<h3 class="petal-info-type">${cfg.icon} ${cfg.name}</h3>`;
            html += `<p class="petal-info-desc">${cfg.desc}</p>`;
            html += `<table class="petal-info-grid"><tr><th>Rarity</th><th>DMG</th><th>HP</th></tr>`;
            for (const rKey of RARITY_ORDER) {
                const r = RARITIES[rKey];
                const dmg = (cfg.baseDmg * r.mult).toFixed(1);
                const hp = Math.floor(10 * r.mult);
                html += `<tr>
                    <td style="color:${r.color}; font-weight:700">${r.name}</td>
                    <td>${dmg}</td>
                    <td>${hp}</td>
                </tr>`;
            }
            html += `</table></div>`;
        }
        this.elements.petalInfoTable.innerHTML = html;
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
                const dmg = o.getDamage(player.damage).toFixed(1);
                const hp = Math.ceil(o.maxHp);
                html += `<div class="orbital-slot filled" data-slot="${i}" style="border-color: ${r.color}60; box-shadow: 0 0 8px ${r.color}30" title="[${i + 1}] ${r.name} ${cfg.name} Lv${o.level}\nDMG: ${dmg}  HP: ${hp}\nPress ${i + 1} to store">
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
            const baseDmg = (cfg.baseDmg * r.mult).toFixed(1);
            const baseHp = Math.floor(10 * r.mult);
            gridHtml += `<div class="inv-item${rainbow}" data-inv-id="${item.id}"
                style="border-color: ${r.color}60; background: ${r.color}15"
                title="${r.name} ${cfg.name}\nDMG: ${baseDmg}  HP: ${baseHp}\nClick to equip">
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

    // ─── Skin Shop ───
    renderSkinShop() {
        const game = this.game;
        const save = game.saveData;
        document.getElementById('skinStardustCount').textContent = save.stardust;

        const grid = this.elements.skinGrid;
        grid.innerHTML = '';

        for (const skin of PLAYER_SKINS) {
            const owned = save.unlockedSkins.includes(skin.id);
            const active = save.activeSkin === skin.id;
            const canAfford = save.stardust >= skin.cost;

            const el = document.createElement('div');
            el.className = `skin-item${active ? ' skin-active' : ''}${!owned ? ' skin-locked' : ''}`;
            el.innerHTML = `
                <div class="skin-icon">${skin.icon}</div>
                <div class="skin-name">${skin.name}</div>
                ${active ? '<div class="skin-equipped">EQUIPPED</div>' :
                  owned ? '<div class="skin-owned">OWNED</div>' :
                  `<div class="skin-cost">${skin.cost} ✦</div>`}
            `;

            el.onclick = () => {
                if (active) return;
                if (owned) {
                    save.activeSkin = skin.id;
                    game.saveSystem.save(save);
                    game.showToast(`Equipped ${skin.name} skin!`, '#00ccff', false);
                    this.renderSkinShop();
                } else if (canAfford) {
                    save.stardust -= skin.cost;
                    save.unlockedSkins.push(skin.id);
                    save.activeSkin = skin.id;
                    game.saveSystem.save(save);
                    game.showToast(`Unlocked ${skin.name} skin!`, '#c084fc', true);
                    game.audio.play('rare', 0.6);
                    this.renderSkinShop();
                } else {
                    game.showToast(`Need ${skin.cost - save.stardust} more Stardust!`, '#ff4444', false);
                }
            };

            grid.appendChild(el);
        }

        // Render skin preview
        this.renderSkinPreview();
    }

    renderSkinPreview() {
        const save = this.game.saveData;
        const pc = document.getElementById('skinPreviewCanvas');
        const pctx = pc.getContext('2d');
        pctx.clearRect(0, 0, 120, 120);
        const skin = PLAYER_SKINS.find(s => s.id === save.activeSkin) || PLAYER_SKINS[0];
        const cx = 60, cy = 60, r = 28;
        const bodyColor = skin.bodyColor === 'prism' ? `hsl(${(Date.now() * 0.1) % 360}, 80%, 60%)` : skin.bodyColor;
        const glowColor = skin.glowColor === 'prism' ? bodyColor : skin.glowColor;
        // Glow
        pctx.save();
        pctx.shadowBlur = 30;
        pctx.shadowColor = glowColor;
        pctx.globalAlpha = 0.5;
        pctx.beginPath(); pctx.arc(cx, cy, r + 5, 0, Math.PI * 2);
        pctx.fillStyle = glowColor; pctx.fill();
        pctx.restore();
        // Body
        pctx.beginPath(); pctx.arc(cx, cy, r, 0, Math.PI * 2);
        pctx.fillStyle = bodyColor; pctx.fill();
        // Highlight
        pctx.globalAlpha = 0.6;
        pctx.beginPath(); pctx.arc(cx - 6, cy - 6, r * 0.4, 0, Math.PI * 2);
        pctx.fillStyle = skin.highlightColor; pctx.fill();
        pctx.globalAlpha = 1;
        // Animate prism
        if (skin.rainbow) requestAnimationFrame(() => this.renderSkinPreview());
    }

    // ─── PVP HUD ───
    showPVPHud() {
        this.hideAllScreens();
        this.elements.hud.classList.add('hidden');
        this.elements.pvpHud.classList.remove('hidden');
    }

    updatePVPHud(p1, p2) {
        const hp1 = document.getElementById('pvpHpP1');
        const hp2 = document.getElementById('pvpHpP2');
        if (p1) hp1.style.width = Math.max(0, (p1.hp / p1.maxHp) * 100) + '%';
        if (p2) hp2.style.width = Math.max(0, (p2.hp / p2.maxHp) * 100) + '%';
    }

    showPVPVictory(winner, stats) {
        this.elements.pvpHud.classList.add('hidden');
        this.elements.pvpVictoryScreen.classList.remove('hidden');
        const title = document.getElementById('pvpVictoryTitle');
        title.textContent = `PLAYER ${winner} WINS!`;
        title.style.color = winner === 1 ? '#00ccff' : '#ff4444';
        const statsEl = document.getElementById('pvpVictoryStats');
        statsEl.innerHTML = `<p>Match duration: <span style="color:#00f0ff;font-weight:700">${this.formatTime(stats.time)}</span></p>`;
    }
}
