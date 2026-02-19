// ═══════════════════════════════════════════════════════
// ORBITRON — UI System (HUD, Menus, Toasts)
// ═══════════════════════════════════════════════════════

const _isMobile = typeof isMobile !== 'undefined' ? isMobile : (('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (window.innerWidth <= 768));

const TUTORIAL_STEPS_DESKTOP = [
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
    { icon: '⚔️', title: 'Global PVP', text: 'Enter PVP arenas and battle other flowers! Choose a zone based on your petal rarity. Collect orbs (+10 pts) and eliminate opponents (+1000 pts). Regen activates after 5 seconds of no damage.' },
    { icon: '�🏆', title: 'Tips', text: 'Check DROP RATES to see what rarities unlock at each wave. Hover over petals to see their damage and HP stats. Good luck, survivor!' },
];

const TUTORIAL_STEPS_MOBILE = [
    { icon: '🎮', title: 'Welcome to Orbitron!', text: 'Survive waves of enemies using orbiting petals. Each run gets harder — collect loot, merge petals, and build your permanent stash to grow stronger over time.' },
    { icon: '🕹️', title: 'Movement', text: 'Use the JOYSTICK on the left side of the screen to move your character. Drag in any direction to move around the arena!' },
    { icon: '🌸', title: 'Petals', text: 'Petals orbit around you automatically. They deal damage to enemies on contact. You start each run with 5 random petals.' },
    { icon: '💫', title: 'Petal Control', text: 'Tap the ⊕ EXTEND button to spread petals outward. Tap ⊖ RETRACT to pull them in. Tap ⚡ DASH to dash through danger!' },
    { icon: '⬆️', title: 'Leveling Up', text: 'Kill enemies to earn XP gems (green diamonds). Level up to choose new petals! Higher rarity petals deal more damage and have more HP.' },
    { icon: '📦', title: 'Loot & Inventory', text: 'Defeated enemies may drop loot. Tap the E button to equip nearby loot, or the O button to store equipped petals to your inventory.' },
    { icon: '🔀', title: 'Merging', text: 'Collect 3 petals of the same type and rarity, then merge them in your inventory panel for a higher rarity petal! This is the main way to get powerful petals.' },
    { icon: '👹', title: 'Bosses', text: 'A boss appears every 5 waves. Bosses are tough but drop great loot. Each boss has unique attack patterns — learn to dodge them!' },
    { icon: '💀', title: 'Death & Stash', text: 'When you die, you can save ONE petal to your permanent stash. Stashed petals persist forever and you can choose one to start your next run with.' },
    { icon: '✦', title: 'Stardust & Upgrades', text: 'Earn Stardust each run based on waves survived. Spend it on permanent upgrades (damage, HP, luck, etc.) that boost every future run.' },
    { icon: '🎨', title: 'Player Skins', text: 'Visit the SKINS shop to spend Stardust on custom player appearances. Unlock skins like Ember, Frost, Shadow, Nebula, and more!' },
    { icon: '🏆', title: 'Tips', text: 'Check DROP RATES to see what rarities unlock at each wave. Tap petals to see their stats. Good luck, survivor!' },
];

const TUTORIAL_STEPS = _isMobile ? TUTORIAL_STEPS_MOBILE : TUTORIAL_STEPS_DESKTOP;

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
            petalShopScreen: document.getElementById('petalShopScreen'),
            petalShopGrid: document.getElementById('petalShopGrid'),
            gameplayUI: document.getElementById('gameplayUI'),
        };
        this._currentShopTab = 'divine';
        this.tutorialStep = 0;
        this.setupButtons();
        this.setupTutorial();
        this.setupSlotKeys();
        this.setupModPanel();
    }

    setupButtons() {
        document.getElementById('btnPlay').onclick = () => this.game.tryStartRun();
        document.getElementById('btnUpgrades').onclick = () => this.showScreen('upgradeShop');
        document.getElementById('btnAchievements').onclick = () => this.showScreen('achievementScreen');
        document.getElementById('btnTutorial').onclick = () => this.showTutorial();
        document.getElementById('btnSkins').onclick = () => this.showScreen('skinScreen');
        document.getElementById('btnPVP').onclick = () => { this.renderPVPZoneSelector(); this.showScreen('pvpScreen'); };
        document.getElementById('btnBackShop').onclick = () => this.showScreen('mainMenu');
        document.getElementById('btnBackStash').onclick = () => this.showScreen('mainMenu');
        document.getElementById('btnBackAch').onclick = () => this.showScreen('mainMenu');
        document.getElementById('btnBackDropRates').onclick = () => this.showScreen('mainMenu');
        document.getElementById('btnBackPetalInfo').onclick = () => this.showScreen('mainMenu');
        document.getElementById('btnBackSkins').onclick = () => this.showScreen('mainMenu');
        document.getElementById('btnBackPVP').onclick = () => this.showScreen('mainMenu');
        document.getElementById('btnPVPRematch').onclick = () => { if (this.game.pvpLastZoneId) this.game.startPVP(this.game.pvpLastZoneId); };
        document.getElementById('btnPVPMenu').onclick = () => { this.game.endPVP(); this.showScreen('mainMenu'); };
        const btnPvpExit = document.getElementById('btnPvpExit');
        if (btnPvpExit) btnPvpExit.onclick = () => { this.game.exitPVP(); };
        document.getElementById('btnRestart').onclick = () => this.game.tryStartRun();
        document.getElementById('btnMainMenu').onclick = () => this.showScreen('mainMenu');
        document.getElementById('btnSkipPetal').onclick = () => this.game.startRun(null);
        document.getElementById('btnPetalShop').onclick = () => this.showScreen('petalShopScreen');
        document.getElementById('btnBackPetalShop').onclick = () => this.showScreen('mainMenu');

        // Username system
        this.setupUsernameUI();

        // Menu sidebar drop rate slider
        const menuSlider = document.getElementById('menuDropRateSlider');
        const menuLabel = document.getElementById('menuDropRateLabel');
        if (menuSlider && menuLabel) {
            menuSlider.oninput = () => {
                menuLabel.textContent = menuSlider.value;
                this.renderMenuDropRates(parseInt(menuSlider.value));
            };
        }

        // Legacy drop rate slider (standalone screen)
        const slider = document.getElementById('dropRateWaveSlider');
        const label = document.getElementById('dropRateWaveLabel');
        if (slider && label) {
            slider.oninput = () => {
                label.textContent = slider.value;
                this.renderDropRateTable(parseInt(slider.value));
            };
        }

        // Secret code
        const codeInput = document.getElementById('secretCodeInput');
        document.getElementById('btnSecretCode').onclick = () => {
            const code = codeInput.value.trim().toLowerCase();
            if (code === 'mod') {
                this.applyModCode();
                codeInput.value = '';
            } else if (code === 'premium') {
                this.applyPremiumCode();
                codeInput.value = '';
            } else {
                this.game.showToast('Invalid code', '#ff4444', false);
            }
        };
        codeInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') document.getElementById('btnSecretCode').click();
        });

        // Premium button (main menu)
        const btnPremium = document.getElementById('btnPremium');
        if (btnPremium) {
            btnPremium.onclick = () => this.showPremiumOverlay();
        }

        // Premium overlay close / buy
        const btnClosePremium = document.getElementById('btnClosePremium');
        if (btnClosePremium) btnClosePremium.onclick = () => this.hidePremiumOverlay();
        const btnBuyPremium = document.getElementById('btnBuyPremium');
        if (btnBuyPremium) btnBuyPremium.onclick = () => this.game.buyPremium();
        const btnTryPremium = document.getElementById('btnTryPremium');
        if (btnTryPremium) btnTryPremium.onclick = () => {
            this.hidePremiumOverlay();
            this.game.activatePremiumDemo();
        };



        // Death upsell overlay
        const btnCloseUpsell = document.getElementById('btnCloseUpsell');
        if (btnCloseUpsell) btnCloseUpsell.onclick = () => this.hideUpsellOverlay();
        const btnSkipUpsell = document.getElementById('btnSkipUpsell');
        if (btnSkipUpsell) btnSkipUpsell.onclick = () => this.hideUpsellOverlay();
        const btnBuyUpsellPack = document.getElementById('btnBuyUpsellPack');
        if (btnBuyUpsellPack) btnBuyUpsellPack.onclick = () => this.game.buyUpsellPack();
        const btnBrowseShop = document.getElementById('btnBrowseShop');
        if (btnBrowseShop) btnBrowseShop.onclick = () => { this.hideUpsellOverlay(); this.showScreen('petalShopScreen'); };
    }

    showScreen(screen) {
        ['mainMenu', 'upgradeShop', 'achievementScreen', 'levelUpScreen', 'deathScreen', 'permStashScreen', 'preRunScreen', 'dropRateScreen', 'petalInfoScreen', 'skinScreen', 'pvpScreen', 'pvpVictoryScreen', 'petalShopScreen'].forEach(s => {
            this.elements[s].classList.toggle('hidden', s !== screen);
        });
        this.elements.hud.classList.toggle('hidden', screen !== null && screen !== 'levelUpScreen');
        this.elements.pvpHud.classList.add('hidden');
        // Hide gameplay UI (inventory/slots/minimap) unless in-game
        if (screen !== null && screen !== 'levelUpScreen') {
            this.elements.gameplayUI.classList.add('hidden');
        }

        if (screen === 'mainMenu') this.renderMainMenu();
        if (screen === 'upgradeShop') this.renderShop();
        if (screen === 'achievementScreen') this.renderAchievements();
        if (screen === 'permStashScreen') this.renderPermStash();
        if (screen === 'preRunScreen') this.renderPreRunSelection();
        if (screen === 'dropRateScreen') this.renderDropRateTable(1);
        if (screen === 'petalInfoScreen') this.renderPetalInfo();
        if (screen === 'skinScreen') this.renderSkinShop();
        if (screen === 'petalShopScreen') this.renderPetalShop();

        // Update premium button text if active
        if (screen === 'mainMenu') {
            const btnPremium = document.getElementById('btnPremium');
            if (btnPremium && this.game.isPremium()) {
                btnPremium.textContent = '👑 PREMIUM ✓';
            }
        }
    }

    applyModCode() {
        const game = this.game;
        game.modEnabled = true;
        // Also add eternals to stash (deduped)
        const stash = game.saveData.permInventory;
        for (const typeKey of ORBITAL_TYPE_KEYS) {
            const exists = stash.some(p => p.type === typeKey && p.rarity === 'eternal');
            if (!exists) stash.push({ type: typeKey, rarity: 'eternal' });
        }
        game.saveSystem.save(game.saveData);
        game.showToast('🌟 MOD MODE ENABLED — All Eternals added!', '#4ade80', true);
        game.audio.play('rare', 0.8);
    }

    applyPremiumCode() {
        const game = this.game;
        if (game.isPremium()) {
            game.showToast('Premium already active!', '#ffaa00', false);
            return;
        }
        // Grant premium for 999 years (effectively permanent)
        game.saveData.premium = true;
        game.saveData.premiumExpiry = Date.now() + (999 * 365 * 24 * 60 * 60 * 1000);
        // Unlock all skins
        for (const skin of PLAYER_SKINS) {
            if (!game.saveData.unlockedSkins.includes(skin.id)) {
                game.saveData.unlockedSkins.push(skin.id);
            }
        }
        // Grant starter pack too
        game.saveData.starterPackOwned = true;
        // Daily stardust
        game.saveData.stardust += 100;
        game.saveData.totalStardust += 100;
        game.saveData.lastDailyLogin = Date.now();
        game.saveSystem.save(game.saveData);

        game.showToast('👑 PREMIUM UNLOCKED — All features activated!', '#c084fc', true);
        game.audio.play('rare', 0.8);
        const btn = document.getElementById('btnPremium');
        if (btn) btn.textContent = '👑 PREMIUM ✓';
    }

    // ─── Mod Panel ───
    setupModPanel() {
        const panel = document.getElementById('modSidebar');
        if (!panel) return;

        // Collapse toggle
        const collapseBtn = document.getElementById('modCollapseBtn');
        const modBody = document.getElementById('modBody');
        const modHeader = document.getElementById('modHeader');
        if (collapseBtn && modBody) {
            const toggleCollapse = () => {
                const collapsed = modBody.style.display === 'none';
                modBody.style.display = collapsed ? '' : 'none';
                collapseBtn.textContent = collapsed ? '▼' : '▶';
                panel.classList.toggle('collapsed', !collapsed);
            };
            collapseBtn.onclick = toggleCollapse;
            if (modHeader) {
                modHeader.onclick = (e) => {
                    if (e.target === collapseBtn) return;
                    toggleCollapse();
                };
            }
        }

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
        this.elements.gameplayUI.classList.remove('hidden');
        this.showModPanel();
    }

    // ─── Premium Overlay ───
    showPremiumOverlay() {
        const overlay = document.getElementById('premiumOverlay');
        if (overlay) overlay.classList.remove('hidden');
        // Update button if already premium
        const btn = document.getElementById('btnBuyPremium');
        if (btn && this.game.isPremium()) {
            btn.textContent = 'ACTIVE ✓';
            btn.disabled = true;
            btn.style.opacity = '0.6';
        }
    }

    hidePremiumOverlay() {
        const overlay = document.getElementById('premiumOverlay');
        if (overlay) overlay.classList.add('hidden');
    }

    // ─── Death Upsell Overlay ───
    showUpsellOverlay() {
        const overlay = document.getElementById('deathUpsellOverlay');
        if (!overlay) return;

        // Pick a random message
        const msg = DEATH_UPSELL_MESSAGES[Math.floor(Math.random() * DEATH_UPSELL_MESSAGES.length)];
        document.getElementById('upsellIcon').textContent = msg.icon;
        document.getElementById('upsellTitle').textContent = msg.title;
        document.getElementById('upsellSlogan').textContent = msg.slogan;

        // Pick 2–3 random divine/cosmic/eternal petals the player doesn't own
        const stash = this.game.saveData.permInventory || [];
        const candidates = [];
        for (const typeKey of ORBITAL_TYPE_KEYS) {
            for (const rarity of ['divine', 'cosmic', 'eternal']) {
                if (!stash.some(p => p.type === typeKey && p.rarity === rarity)) {
                    candidates.push({ type: typeKey, rarity });
                }
            }
        }

        // Shuffle and pick 2–3
        for (let i = candidates.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
        }
        // Prefer at least one divine in the mix
        const divines = candidates.filter(c => c.rarity === 'divine');
        const eternals = candidates.filter(c => c.rarity === 'eternal');
        let picks = [];
        if (divines.length > 0) picks.push(divines[0]);
        if (divines.length > 1) picks.push(divines[1]);
        if (eternals.length > 0) picks.push(eternals[0]);
        if (picks.length === 0) picks = candidates.slice(0, 3);
        picks = picks.slice(0, 3);

        // Store picks for buy handler
        this._upsellPicks = picks;

        // Render items
        const itemsEl = document.getElementById('upsellItems');
        let itemsHtml = '';
        for (const p of picks) {
            const cfg = ORBITAL_TYPES[p.type];
            const r = RARITIES[p.rarity];
            const price = PETAL_SHOP_PRICES[p.rarity];
            itemsHtml += `<div class="upsell-item">
                <span class="upsell-item-icon">${cfg.icon}</span>
                <span style="color:${r.color}">${r.name} ${cfg.name}</span>
                <span class="upsell-item-desc">$${price.toFixed(2)}</span>
            </div>`;
        }
        itemsEl.innerHTML = itemsHtml;

        // Calculate bundle price (20% discount)
        const totalPrice = picks.reduce((acc, p) => acc + PETAL_SHOP_PRICES[p.rarity], 0);
        const bundlePrice = (totalPrice * 0.8).toFixed(2);
        document.getElementById('upsellPrice').innerHTML = `Bundle Deal — <strong>$${bundlePrice}</strong> <span style="text-decoration:line-through;color:#666;font-size:0.8rem">$${totalPrice.toFixed(2)}</span>`;

        const buyBtn = document.getElementById('btnBuyUpsellPack');
        if (buyBtn) buyBtn.textContent = picks.length > 0 ? 'GET THIS PACK' : 'BROWSE SHOP';

        overlay.classList.remove('hidden');
    }

    hideUpsellOverlay() {
        const overlay = document.getElementById('deathUpsellOverlay');
        if (overlay) overlay.classList.add('hidden');
    }

    hideAllScreens() {
        ['mainMenu', 'upgradeShop', 'achievementScreen', 'levelUpScreen', 'deathScreen', 'permStashScreen', 'preRunScreen', 'dropRateScreen', 'petalInfoScreen', 'skinScreen', 'pvpScreen', 'pvpVictoryScreen', 'petalShopScreen'].forEach(s => {
            this.elements[s].classList.add('hidden');
        });
        this.elements.gameplayUI.classList.add('hidden');
        this.hideModPanel();
        this.hideUpsellOverlay();
    }

    // ─── Main Menu ───
    renderMainMenu() {
        const save = this.game.saveData;
        let html = '';
        if (save.totalRuns > 0) {
            html += `Best Wave: <strong>${save.bestWave}</strong> | Best Level: <strong>${save.bestLevel}</strong><br>`;
            html += `Total Kills: <strong>${save.totalKills.toLocaleString()}</strong> | Runs: <strong>${save.totalRuns}</strong><br>`;
            html += `Stardust: <strong style="color:#ffaa00">${save.stardust} ✦</strong>`;
        }
        this.elements.menuStats.innerHTML = html;

        // Update username display
        this.updateUsernameDisplay();

        // Render side panels
        this.renderMenuStash();
        this.renderMenuDropRates(1);
        this.renderMenuPetalStats('all');
        this.renderMenuMobStats('all');
    }

    // ─── Menu Left Panel: Stash ───
    renderMenuStash() {
        const grid = document.getElementById('menuStashGrid');
        const empty = document.getElementById('menuStashEmpty');
        if (!grid) return;

        const stash = this.game.saveData.permInventory || [];
        if (stash.length === 0) {
            grid.innerHTML = '';
            if (empty) empty.style.display = '';
            return;
        }
        if (empty) empty.style.display = 'none';

        // Sort by rarity (highest first)
        const indexed = stash.map((p, i) => ({ ...p, _origIdx: i }));
        indexed.sort((a, b) => RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity));

        let html = '';
        for (const petal of indexed) {
            const r = RARITIES[petal.rarity];
            const cfg = ORBITAL_TYPES[petal.type];
            const rainbow = r.rainbow ? ' rainbow' : '';
            html += `<div class="menu-stash-item${rainbow}" 
                style="border-color: ${r.color}40; background: ${r.color}08"
                title="${r.name} ${cfg.name}\nDMG: ${(cfg.baseDmg * r.mult).toFixed(0)}">
                <span class="stash-icon">${cfg.icon}</span>
                <span class="stash-rarity" style="color:${r.color}">${r.name}</span>
            </div>`;
        }
        grid.innerHTML = html;
    }

    // ─── Menu Right Panel: Drop Rates ───
    renderMenuDropRates(wave) {
        const container = document.getElementById('menuDropRateTable');
        if (!container) return;

        const caps = getWaveRarityCaps(wave);
        let html = '<table><tr><th>Rarity</th><th>Chance</th></tr>';
        RARITY_ORDER.forEach((key, i) => {
            const r = RARITIES[key];
            const pct = caps[i];
            let display;
            if (pct <= 0) display = '<span style="color:#444">—</span>';
            else if (pct >= 100) display = '<span style="color:#4ade80">100%</span>';
            else display = `<span>${pct.toFixed(pct < 1 ? 3 : 1)}%</span>`;
            const bar = Math.min(pct, 100);
            html += `<tr>
                <td style="color:${r.color}; font-weight:700">${r.name}</td>
                <td>
                    <div class="menu-droprate-bar"><div class="menu-droprate-fill" style="width:${bar}%; background:${r.color}"></div></div>
                    ${display}
                </td>
            </tr>`;
        });
        html += '</table>';
        container.innerHTML = html;
    }

    // ─── Menu Left Panel: Petal Stats ───
    renderMenuPetalStats(filter = 'all') {
        const container = document.getElementById('menuPetalStats');
        const tabsEl = document.getElementById('petalStatsTabs');
        if (!container) return;

        // Build tabs
        if (tabsEl) {
            let tabHtml = '<button class="panel-tab' + (filter === 'all' ? ' active' : '') + '" data-petal="all">All</button>';
            for (const key of ORBITAL_TYPE_KEYS) {
                const cfg = ORBITAL_TYPES[key];
                tabHtml += `<button class="panel-tab${filter === key ? ' active' : ''}" data-petal="${key}">${cfg.icon}</button>`;
            }
            tabsEl.innerHTML = tabHtml;
            tabsEl.querySelectorAll('.panel-tab').forEach(btn => {
                btn.onclick = () => this.renderMenuPetalStats(btn.dataset.petal);
            });
        }

        const keys = filter === 'all' ? ORBITAL_TYPE_KEYS : [filter];
        let html = '';

        for (const typeKey of keys) {
            const cfg = ORBITAL_TYPES[typeKey];

            // Collect ability tags
            const abilities = [];
            if (cfg.type === 'melee') abilities.push({ label: 'Melee', cls: 'dmg' });
            if (cfg.type === 'ranged') abilities.push({ label: 'Ranged', cls: 'dmg' });
            if (cfg.type === 'aoe') abilities.push({ label: 'AoE', cls: 'dmg' });
            if (cfg.type === 'chain') abilities.push({ label: 'Chain ×' + cfg.bounces, cls: 'dmg' });
            if (cfg.type === 'laser') abilities.push({ label: 'Piercing Beam', cls: 'dmg' });
            if (cfg.type === 'shield') abilities.push({ label: 'Block ' + Math.round(cfg.blockAmount * 100) + '%', cls: 'def' });
            if (cfg.slow) abilities.push({ label: 'Slow ' + Math.round(cfg.slow * 100) + '%', cls: 'util' });
            if (cfg.lifeSteal) abilities.push({ label: 'Lifesteal ' + Math.round(cfg.lifeSteal * 100) + '%', cls: 'util' });
            if (cfg.burnDmg) abilities.push({ label: 'Burn ' + cfg.burnDmg + '/s', cls: 'dmg' });
            if (cfg.projSpeed) abilities.push({ label: 'Proj ' + cfg.projSpeed, cls: '' });

            // Find max dmg for bar scaling
            const maxMult = RARITIES.eternal.mult;
            const maxDmg = cfg.baseDmg * maxMult;

            html += `<div class="stats-card">
                <div class="stats-card-header">
                    <span class="stats-card-icon">${cfg.icon}</span>
                    <span class="stats-card-name">${cfg.name}</span>
                    <span class="stats-card-type">${cfg.type}</span>
                </div>
                <div class="stats-card-desc">${cfg.desc}</div>`;

            if (abilities.length > 0) {
                html += '<div class="stats-card-abilities">';
                for (const a of abilities) {
                    html += `<span class="stats-ability-tag ${a.cls}">${a.label}</span>`;
                }
                html += '</div>';
            }

            // Rarity breakdown
            html += '<table class="stats-rarity-grid">';
            for (const rKey of RARITY_ORDER) {
                const r = RARITIES[rKey];
                const dmg = (cfg.baseDmg * r.mult).toFixed(1);
                const hp = Math.floor(10 * r.mult);
                const barPct = Math.min((cfg.baseDmg * r.mult) / maxDmg * 100, 100);
                html += `<tr>
                    <td class="sr-name" style="color:${r.color}">${r.name}</td>
                    <td class="sr-bar-cell">
                        <div class="stats-bar"><div class="stats-bar-fill" style="width:${barPct}%; background:${r.color}"></div></div>
                    </td>
                    <td class="sr-val">${dmg} DMG</td>
                    <td class="sr-val">${hp} HP</td>
                </tr>`;
            }
            html += '</table></div>';
        }

        container.innerHTML = html;
    }

    // ─── Menu Right Panel: Mob Stats ───
    renderMenuMobStats(filter = 'all') {
        const container = document.getElementById('menuMobStats');
        const tabsEl = document.getElementById('mobStatsTabs');
        if (!container) return;

        const mobKeys = Object.keys(ENEMY_TYPES);

        // Build tabs
        if (tabsEl) {
            let tabHtml = '<button class="panel-tab' + (filter === 'all' ? ' active' : '') + '" data-mob="all">All</button>';
            for (const key of mobKeys) {
                const m = ENEMY_TYPES[key];
                const shape = m.shape || 'circle';
                tabHtml += `<button class="panel-tab${filter === key ? ' active' : ''}" data-mob="${key}"><span class="mob-shape ${shape}" style="background:${m.color}"></span></button>`;
            }
            tabsEl.innerHTML = tabHtml;
            tabsEl.querySelectorAll('.panel-tab').forEach(btn => {
                btn.onclick = () => this.renderMenuMobStats(btn.dataset.mob);
            });
        }

        const keys = filter === 'all' ? mobKeys : [filter];
        let html = '';

        // Find global max for bar scaling
        const globalMaxHp = Math.max(...mobKeys.map(k => ENEMY_TYPES[k].hp));
        const globalMaxDmg = Math.max(...mobKeys.map(k => ENEMY_TYPES[k].damage));

        for (const key of keys) {
            const m = ENEMY_TYPES[key];

            // Collect ability tags
            const abilities = [];
            if (m.dashInterval) abilities.push({ label: 'Dash', cls: 'mob' });
            if (m.shootInterval) abilities.push({ label: 'Ranged', cls: 'dmg' });
            if (m.splitCount) abilities.push({ label: 'Splits ×' + m.splitCount, cls: 'mob' });
            if (m.spawnCount) abilities.push({ label: 'Swarm ×' + m.spawnCount, cls: 'mob' });
            if (m.spawnerInterval) abilities.push({ label: 'Spawns ' + m.spawnerType, cls: 'mob' });
            if (m.healRange) abilities.push({ label: 'Heals ' + m.healAmount + '/s', cls: 'util' });
            if (m.phaseChance) abilities.push({ label: 'Phase ' + Math.round(m.phaseChance * 100) + '%', cls: 'def' });

            const zoneNames = ZONES.map(z => z.name);
            const zones = zoneNames.slice(m.minZone, m.maxZone + 1).join(', ');

            html += `<div class="stats-card">
                <div class="stats-card-header">
                    <span class="mob-shape ${m.shape || 'circle'}" style="background:${m.color}; width:14px; height:14px;"></span>
                    <span class="stats-card-name">${m.name}</span>
                    <span class="stats-card-type">${m.shape}</span>
                </div>
                <div class="stats-card-desc">Zones: ${zones} · Speed: ${m.speed} · XP: ${m.xp}</div>`;

            if (abilities.length > 0) {
                html += '<div class="stats-card-abilities">';
                for (const a of abilities) {
                    html += `<span class="stats-ability-tag ${a.cls}">${a.label}</span>`;
                }
                html += '</div>';
            }

            // Base stats bar
            const hpPct = (m.hp / globalMaxHp * 100).toFixed(0);
            const dmgPct = (m.damage / globalMaxDmg * 100).toFixed(0);
            html += `<div style="margin-bottom:4px">
                <div class="stats-bar-row">
                    <span class="stats-bar-label">HP</span>
                    <div class="stats-bar" style="flex:1"><div class="stats-bar-fill" style="width:${hpPct}%; background:#4ade80"></div></div>
                    <span class="stats-bar-value">${m.hp}</span>
                </div>
                <div class="stats-bar-row">
                    <span class="stats-bar-label">DMG</span>
                    <div class="stats-bar" style="flex:1"><div class="stats-bar-fill" style="width:${dmgPct}%; background:#ff6666"></div></div>
                    <span class="stats-bar-value">${m.damage}</span>
                </div>
            </div>`;

            // Scale by wave (show wave 1, 10, 25, 50)
            const waves = [1, 10, 25, 50];
            html += '<table class="stats-rarity-grid">';
            html += '<tr><td class="sr-name" style="color:#666; font-size:0.55rem">Wave</td><td style="font-size:0.55rem; color:#666">Effective HP</td><td style="font-size:0.55rem; color:#666">Eff. DMG</td></tr>';
            for (const w of waves) {
                const scale = 1 + w * 0.12;
                const effHp = Math.floor(m.hp * scale);
                const effDmg = Math.floor(m.damage * scale * 0.4);
                const hpBar = Math.min(effHp / (m.hp * (1 + 50 * 0.12)) * 100, 100);
                html += `<tr>
                    <td class="sr-name" style="color:#00f0ff">W${w}</td>
                    <td class="sr-bar-cell">
                        <div class="stats-bar"><div class="stats-bar-fill" style="width:${hpBar}%; background:#4ade80"></div></div>
                    </td>
                    <td class="sr-val" style="color:#4ade80">${effHp}</td>
                    <td class="sr-val" style="color:#ff6666">${effDmg}</td>
                </tr>`;
            }
            html += '</table></div>';
        }

        container.innerHTML = html;
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

        // Death upsell popup (after a short delay, non-premium only)
        if (!this.game.isPremium()) {
            setTimeout(() => {
                if (this.game.state === 'dead') {
                    this.showUpsellOverlay();
                }
            }, 2500);
        }
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

        // Deduplicate petals (no two of same type+rarity in the pick list)
        const seen = new Set();
        const deduped = allPetals.filter(p => {
            const key = `${p.type}|${p.rarity}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        // Sort by rarity (highest first)
        const sorted = [...deduped].sort((a, b) => {
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

        // Pet status
        const petStatus = document.getElementById('petStatus');
        const pet = this.game.pet;
        if (petStatus && pet) {
            const petHpBar = document.getElementById('petHpBar');
            const petHpText = document.getElementById('petHpText');
            if (pet.dead) {
                petStatus.classList.add('pet-dead');
                if (petHpBar) petHpBar.style.width = '0%';
                if (petHpText) petHpText.textContent = `⏱ ${Math.ceil(pet.reviveTimer)}s`;
            } else {
                petStatus.classList.remove('pet-dead');
                const pct = Math.max(0, (pet.hp / pet.maxHp) * 100);
                if (petHpBar) petHpBar.style.width = pct + '%';
                if (petHpText) petHpText.textContent = `${Math.ceil(pet.hp)}`;
            }
        }
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

    // Render orbital slots from server state (PVP mode)
    renderPVPOrbitalSlots(orbitals, maxSlots) {
        let html = '';
        const numSlots = maxSlots || 8;
        for (let i = 0; i < numSlots; i++) {
            if (i < orbitals.length) {
                const o = orbitals[i];
                const cfg = ORBITAL_TYPES[o.t];
                const r = RARITIES[o.ra];
                if (!cfg || !r) continue;
                const reloading = o.rl;
                const opacity = reloading ? '0.3' : '1';
                html += `<div class="orbital-slot filled" data-slot="${i}" style="border-color: ${r.color}60; box-shadow: 0 0 8px ${r.color}30; opacity: ${opacity}" title="[${i + 1}] ${r.name} ${cfg.name}\nPress ${i + 1} to store">
                    <span class="slot-number">${i + 1}</span>
                    <span style="font-size: 1.5rem">${cfg.icon}</span>
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
            const num = parseInt(e.key);
            if (!(num >= 1 && num <= 9)) return;

            // PVP mode — send unequip to server
            if (game.state === 'pvp' && game.pvpClient && game.pvpClient.connected) {
                const idx = num - 1;
                game.pvpClient.sendUnequip(idx);
                return;
            }

            // Wave mode
            if (game.state !== 'playing' || game.paused) return;
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

                // PVP mode — send merge to server
                if (game.state === 'pvp' && game.pvpClient && game.pvpClient.connected) {
                    game.pvpClient.sendMerge(type, rarity);
                    return;
                }

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
                const invId = item.dataset.invId;

                // PVP mode — send equip to server
                if (game.state === 'pvp' && game.pvpClient && game.pvpClient.connected) {
                    game.pvpClient.sendEquip(invId);
                    return;
                }

                // Wave mode
                const player = game.player;
                if (!player) return;
                const numId = parseInt(invId);
                const invIdx = game.inventory.findIndex(i => i.id === numId);
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

    // ─── PVP Minimap ───
    renderPVPMinimap() {
        const game = this.game;
        const client = game.pvpClient;
        if (!client || !client.connected) return;

        const mc = document.getElementById('minimap');
        const mctx = mc.getContext('2d');
        const arenaSize = game.pvpArenaSize || 2000;
        const scale = mc.width / arenaSize;

        // Arena center (server uses CONFIG.WORLD_SIZE/2 as center)
        const wcx = CONFIG.WORLD_SIZE / 2;
        const wcy = CONFIG.WORLD_SIZE / 2;
        const halfArena = arenaSize / 2;

        mctx.fillStyle = '#0a0a1a';
        mctx.fillRect(0, 0, mc.width, mc.height);

        // Arena boundary
        mctx.strokeStyle = game.pvpZone ? game.pvpZone.color + '40' : 'rgba(255,255,255,0.15)';
        mctx.lineWidth = 1;
        mctx.strokeRect(0, 0, mc.width, mc.height);

        // Mobs (yellow dots)
        mctx.fillStyle = '#ffaa00';
        for (const m of client.mobs) {
            const mx = (m.x - wcx + halfArena) * scale;
            const my = (m.y - wcy + halfArena) * scale;
            mctx.fillRect(mx - 1, my - 1, 2, 2);
        }

        // Other players/bots (red dots)
        for (const p of client.players) {
            if (p.id === client.playerId || p.d) continue;
            const px = (p.x - wcx + halfArena) * scale;
            const py = (p.y - wcy + halfArena) * scale;
            mctx.fillStyle = p.b ? '#ff8888' : '#ff4444'; // bots lighter
            mctx.fillRect(px - 1.5, py - 1.5, 3, 3);
        }

        // Orbs (small green dots)
        mctx.fillStyle = '#4ade80';
        for (const o of client.orbs) {
            const ox = (o.x - wcx + halfArena) * scale;
            const oy = (o.y - wcy + halfArena) * scale;
            mctx.fillRect(ox - 0.5, oy - 0.5, 1, 1);
        }

        // My player (cyan dot)
        const me = client.getMyPlayer();
        if (me && !me.d) {
            const px = (me.x - wcx + halfArena) * scale;
            const py = (me.y - wcy + halfArena) * scale;
            mctx.fillStyle = '#00ccff';
            mctx.beginPath();
            mctx.arc(px, py, 3, 0, Math.PI * 2);
            mctx.fill();
        }

        // Viewport box
        const camX = (game.camera.x - wcx + halfArena) * scale;
        const camY = (game.camera.y - wcy + halfArena) * scale;
        const vw = canvas.width * scale;
        const vh = canvas.height * scale;
        mctx.strokeStyle = 'rgba(255,255,255,0.3)';
        mctx.lineWidth = 1;
        mctx.strokeRect(camX - vw / 2, camY - vh / 2, vw, vh);
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

        const isPremium = game.isPremium();

        for (const skin of PLAYER_SKINS) {
            const owned = isPremium || save.unlockedSkins.includes(skin.id);
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

    // ─── Petal Shop ───
    renderPetalShop() {
        const grid = document.getElementById('petalShopGrid');
        if (!grid) return;
        grid.innerHTML = '';

        const rarity = this._currentShopTab || 'divine';
        const r = RARITIES[rarity];
        const price = PETAL_SHOP_PRICES[rarity];
        const stash = this.game.saveData.permInventory || [];

        // Wire tab buttons
        document.querySelectorAll('.petal-shop-tab').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === rarity);
            btn.onclick = () => {
                this._currentShopTab = btn.dataset.tab;
                this.renderPetalShop();
            };
        });

        for (const typeKey of ORBITAL_TYPE_KEYS) {
            const cfg = ORBITAL_TYPES[typeKey];
            const owned = stash.some(p => p.type === typeKey && p.rarity === rarity);
            const dmg = (cfg.baseDmg * r.mult).toFixed(0);

            const card = document.createElement('div');
            card.className = 'petal-shop-card' + (owned ? ' owned' : '');
            card.innerHTML = `
                <div class="petal-shop-icon">${cfg.icon}</div>
                <div class="petal-shop-name" style="color:${r.color}">${cfg.name}</div>
                <div class="petal-shop-rarity" style="color:${r.color}">${r.name}</div>
                <div class="petal-shop-desc">${cfg.desc}</div>
                <div class="petal-shop-stats">DMG: ${dmg}</div>
                <div class="petal-shop-price-tag">${owned ? '✓ OWNED' : '$' + price.toFixed(2)}</div>
            `;
            if (!owned) {
                card.onclick = () => this.game.buyPetal(typeKey, rarity);
            }
            grid.appendChild(card);
        }
    }

    // ─── Username System ───
    setupUsernameUI() {
        const btnChange = document.getElementById('btnChangeUsername');
        const btnConfirm = document.getElementById('btnConfirmUsername');
        const btnCancel = document.getElementById('btnCancelUsername');
        const editDiv = document.getElementById('usernameEdit');
        const input = document.getElementById('usernameInput');

        if (btnChange) {
            btnChange.onclick = () => {
                editDiv.classList.remove('hidden');
                input.value = this.game.saveData.username || '';
                input.focus();
                const changes = this.game.saveData.usernameChanges || 0;
                const costEl = document.getElementById('usernameCost');
                if (changes === 0) {
                    costEl.textContent = 'FREE';
                    costEl.style.color = '#4ade80';
                } else {
                    costEl.textContent = '2000 ✦';
                    costEl.style.color = '#facc15';
                }
            };
        }

        if (btnCancel) {
            btnCancel.onclick = () => {
                editDiv.classList.add('hidden');
            };
        }

        if (btnConfirm) {
            btnConfirm.onclick = () => {
                const name = input.value.trim().replace(/[^a-zA-Z0-9_\-\s]/g, '').substring(0, 16);
                if (!name || name.length < 2) {
                    this.game.showToast('Username must be 2-16 characters', '#ff4444', false);
                    return;
                }
                const save = this.game.saveData;
                const changes = save.usernameChanges || 0;
                if (changes > 0) {
                    if (save.stardust < 2000) {
                        this.game.showToast('Need 2000 ✦ to change username!', '#ff4444', false);
                        return;
                    }
                    save.stardust -= 2000;
                }
                save.username = name;
                save.usernameChanges = changes + 1;
                this.game.saveSystem.save(save);
                editDiv.classList.add('hidden');
                this.updateUsernameDisplay();
                this.game.showToast(`Username set to "${name}"!`, '#4ade80', true);
                this.game.audio.play('pickup', 0.5);
            };
        }

        if (input) {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') btnConfirm.click();
                if (e.key === 'Escape') btnCancel.click();
            });
        }
    }

    updateUsernameDisplay() {
        const el = document.getElementById('usernameValue');
        const save = this.game.saveData;
        if (el) {
            el.textContent = save.username || 'Not set';
            el.style.color = save.username ? '#00ccff' : '#666';
        }
        const btnChange = document.getElementById('btnChangeUsername');
        if (btnChange) {
            const changes = save.usernameChanges || 0;
            btnChange.title = changes === 0 ? 'Set username (FREE)' : 'Change username (2000 ✦)';
        }
    }

    // ─── PVP HUD ───
    showPVPHud() {
        this.hideAllScreens();
        this.elements.hud.classList.add('hidden');
        this.elements.pvpHud.classList.remove('hidden');
        this.elements.gameplayUI.classList.remove('hidden');
        // Set zone label
        const zone = this.game.pvpZone;
        const lbl = document.getElementById('pvpZoneLabel');
        if (lbl && zone) {
            lbl.textContent = `${zone.icon} ${zone.name}`;
            lbl.style.color = zone.color;
        }
    }

    updatePVPHud(p1, p2) {
        // HP bar
        const hp1 = document.getElementById('pvpHpP1');
        const hpText = document.getElementById('pvpHpText');
        if (p1 && hp1) {
            const pct = Math.max(0, (p1.hp / p1.maxHp) * 100);
            hp1.style.width = pct + '%';
            if (pct > 50) hp1.style.background = 'linear-gradient(90deg, #22c55e, #4ade80)';
            else if (pct > 25) hp1.style.background = 'linear-gradient(90deg, #eab308, #facc15)';
            else hp1.style.background = 'linear-gradient(90deg, #dc2626, #ef4444)';
        }
        if (p1 && hpText) {
            hpText.textContent = `${Math.ceil(p1.hp)} / ${p1.maxHp}`;
        }

        // Score
        const scoreEl = document.getElementById('pvpScore');
        if (scoreEl) scoreEl.textContent = this.game.pvpScore.toLocaleString();

        // Leaderboard
        this.updatePVPLeaderboard();
    }

    updatePVPLeaderboard() {
        const list = document.getElementById('pvpLbList');
        if (!list) return;
        const lb = this.game.pvpLeaderboard;
        if (!lb || lb.length === 0) return;

        // Build a color lookup from server players (pvpClient.players has color)
        const colorMap = {};
        const client = this.game.pvpClient;
        if (client && client.players) {
            for (const p of client.players) {
                colorMap[p.id] = p.c;
            }
        }

        // Sort by score descending
        const sorted = [...lb].sort((a, b) => b.score - a.score);
        let html = '';
        const myId = client ? client.playerId : null;
        for (let i = 0; i < Math.min(sorted.length, 10); i++) {
            const entry = sorted[i];
            const isYou = (entry.id === myId);
            const deadClass = !entry.alive ? ' pvp-lb-dead' : '';
            const youClass = isYou ? ' pvp-lb-you' : '';
            const color = colorMap[entry.id] || entry.color || (isYou ? '#00ccff' : '#aaa');
            html += `<div class="pvp-lb-entry${deadClass}${youClass}">
                <span class="pvp-lb-rank">${i + 1}</span>
                <span class="pvp-lb-name" style="color:${color}">${entry.name}</span>
                <span class="pvp-lb-score">${entry.score.toLocaleString()}</span>
            </div>`;
        }
        list.innerHTML = html;
    }

    showPVPVictory(winner, stats) {
        this.elements.pvpHud.classList.add('hidden');
        this.elements.pvpVictoryScreen.classList.remove('hidden');
        const title = document.getElementById('pvpVictoryTitle');
        title.textContent = 'ELIMINATED';
        title.style.color = '#ef4444';
        const statsEl = document.getElementById('pvpVictoryStats');
        const zone = stats.zone;
        const lb = stats.leaderboard || [];
        // Find player rank (look for matching id or fallback to non-bot)
        const myId = this.game.pvpClient ? this.game.pvpClient.playerId : null;
        const playerEntry = myId ? lb.find(e => e.id === myId) : lb.find(e => !e.isBot);
        const rank = stats.rank || (playerEntry ? lb.indexOf(playerEntry) + 1 : '-');

        let lbHtml = '<div class="pvp-final-lb">';
        for (let i = 0; i < Math.min(lb.length, 10); i++) {
            const e = lb[i];
            const isYou = myId ? (e.id === myId) : !e.isBot;
            const color = e.color || (isYou ? '#00ccff' : '#aaa');
            lbHtml += `<div class="pvp-lb-entry${isYou ? ' pvp-lb-you' : ''}">
                <span class="pvp-lb-rank">${i + 1}</span>
                <span class="pvp-lb-name" style="color:${color}">${e.name}</span>
                <span class="pvp-lb-score">${e.score.toLocaleString()}</span>
            </div>`;
        }
        lbHtml += '</div>';

        statsEl.innerHTML = `
            <p>Zone: <span style="color:${zone ? zone.color : '#fff'};font-weight:700">${zone ? zone.name : '—'}</span></p>
            <p>Your Score: <span style="color:#00f0ff;font-weight:700">${(stats.score || 0).toLocaleString()}</span></p>
            <p>Rank: <span style="color:#facc15;font-weight:700">#${rank}</span></p>
            <p>Time: <span style="color:#aaa">${this.formatTime(stats.time)}</span></p>
            ${lbHtml}
        `;
    }

    // ─── PVP Zone Selector ───
    renderPVPZoneSelector() {
        const grid = document.getElementById('pvpZoneGrid');
        if (!grid) return;
        grid.innerHTML = '';

        const save = this.game.saveData;
        const stash = save.permInventory || [];

        // Find player's highest rarity
        let highestIdx = -1;
        for (const p of stash) {
            const idx = RARITY_ORDER.indexOf(p.rarity);
            if (idx > highestIdx) highestIdx = idx;
        }

        for (const zone of PVP_ZONES) {
            const card = document.createElement('div');
            card.className = 'pvp-zone-card';

            // Check if player can access this zone
            let canAccess = false;
            if (zone.id === 1) {
                canAccess = true; // always accessible
            } else {
                // Player needs at least one petal in the zone's allowed rarities
                canAccess = stash.some(p => zone.allowedRarities.includes(p.rarity));
            }

            card.style.borderColor = zone.color;
            if (!canAccess) {
                card.classList.add('pvp-zone-locked');
            }

            card.innerHTML = `
                <div class="pvp-zone-icon">${zone.icon}</div>
                <div class="pvp-zone-name" style="color:${zone.color}">${zone.name}</div>
                <div class="pvp-zone-desc">${zone.desc}</div>
                <div class="pvp-zone-stats">
                    <span>❤️ ${zone.hp.toLocaleString()} HP</span>
                    <span>💚 ${zone.regen}/s regen</span>
                    <span>👥 ${zone.botCount} players</span>
                </div>
                ${!canAccess ? '<div class="pvp-zone-lock">🔒 Need matching petals</div>' : '<div class="pvp-zone-enter">ENTER →</div>'}
            `;

            if (canAccess) {
                card.onclick = () => this.game.startPVP(zone.id);
            }

            grid.appendChild(card);
        }
    }
}
