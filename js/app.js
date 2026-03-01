(function () {
    const ROUTE_TO_SCREEN = {
        splash: 'splashScreen',
        mode: 'modeScreen',
        help: 'helpScreen',
        map: 'mapScreen',
        briefing: 'briefingScreen',
        lab: 'labScreen',
        results: 'resultsScreen',
        progress: 'progressScreen',
        about: 'aboutScreen'
    };

    const app = {
        bus: null,
        store: null,
        router: null,
        telemetry: null,
        canvas: null,
        simulation: null,
        progression: null,
        challengePayload: null,
        activeChallenge: null,
        activeChallengeDefinition: null,
        deferredInstallPrompt: null,
        currentComponentFilter: 'all',
        currentHintIndex: 0,
        activeLabPanel: 'objectives',
        lastResult: null,
        aboutInitialized: false,
        evaluatingPreview: false,
        onboardingIndex: 0
    };

    // ─── Utilities ───────────────────────────────────────────────────────────

    function byId(id) { return document.getElementById(id); }

    function sanitizePlayerName(value) {
        const collapsed = String(value || '').replace(/\s+/g, ' ').trim();
        return collapsed ? collapsed.slice(0, 40) : 'Future Builder';
    }

    function getStoredPlayerName() {
        try { return localStorage.getItem('techBuildersPlayerName') || ''; } catch { return ''; }
    }

    function savePlayerName(name) {
        try { localStorage.setItem('techBuildersPlayerName', name); } catch { /* ignore */ }
    }

    function drawRoundedRect(ctx, x, y, width, height, radius) {
        const r = Math.max(0, Math.min(radius, Math.min(width, height) / 2));
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + width - r, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + r);
        ctx.lineTo(x + width, y + height - r);
        ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
        ctx.lineTo(x + r, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    function downloadDataUrl(filename, dataUrl) {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // ─── Screen Management ───────────────────────────────────────────────────

    function showScreen(routeName) {
        const screenId = ROUTE_TO_SCREEN[routeName] || ROUTE_TO_SCREEN.mode;
        document.querySelectorAll('.screen').forEach((screen) => {
            screen.classList.remove('screen-active');
            screen.setAttribute('aria-hidden', 'true');
        });
        const target = byId(screenId);
        if (target) {
            target.classList.add('screen-active');
            target.setAttribute('aria-hidden', 'false');
        }
    }

    // ─── Stats Display with Warning States ───────────────────────────────────

    function updateStatsDisplay(state) {
        const budgetDisplay = byId('budgetDisplay');
        const energyDisplay = byId('energyDisplay');
        const pointsDisplay = byId('pointsDisplay');

        if (budgetDisplay) {
            const budget = Math.max(0, Math.round(state.budget));
            budgetDisplay.textContent = String(budget);
            // Warning when budget is low
            budgetDisplay.closest('.stat-item')?.classList.toggle('stat-warning', budget < 200);
            budgetDisplay.closest('.stat-item')?.classList.toggle('stat-danger', budget < 80);
        }
        if (energyDisplay) {
            const energy = Math.round(state.energy);
            energyDisplay.textContent = String(energy);
            // Warning when energy is negative or zero
            energyDisplay.closest('.stat-item')?.classList.toggle('stat-warning', energy < 0);
            energyDisplay.closest('.stat-item')?.classList.toggle('stat-ok', energy > 0);
        }
        if (pointsDisplay) {
            pointsDisplay.textContent = String(Math.round(state.points));
        }
    }

    // ─── Focus Mode ───────────────────────────────────────────────────────────

    function setFocusMode(enabled) {
        document.body.classList.toggle('focus-mode', enabled);
        const btn = byId('focusToggleBtn');
        if (btn) {
            btn.setAttribute('aria-pressed', enabled ? 'true' : 'false');
            btn.textContent = enabled ? 'Exit Focus' : 'Focus';
        }
    }

    // ─── Panel Toggles ────────────────────────────────────────────────────────

    function toggleSidebar() {
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar) return;
        const isExpanded = sidebar.classList.toggle('expanded');
        const toggle = byId('toggleSidebarBtn');
        if (toggle) {
            toggle.setAttribute('aria-pressed', isExpanded ? 'true' : 'false');
            toggle.textContent = isExpanded ? '◀' : '▶';
        }
    }

    function toggleRightPanel() {
        const panel = document.querySelector('.right-panel');
        if (!panel) return;
        const isExpanded = panel.classList.toggle('expanded');
        const toggle = byId('toggleRightPanelBtn');
        if (toggle) {
            toggle.setAttribute('aria-pressed', isExpanded ? 'true' : 'false');
            toggle.textContent = isExpanded ? '⊖' : '⊕';
        }
    }

    function initToggleButtons() {
        const sidebarToggle = byId('toggleSidebarBtn');
        const rightToggle = byId('toggleRightPanelBtn');
        if (sidebarToggle) sidebarToggle.textContent = '◀';
        if (rightToggle) rightToggle.textContent = '⊖';
    }

    // ─── Component Library ────────────────────────────────────────────────────

    function renderComponentFilters() {
        const container = byId('componentFilters');
        if (!container) return;

        const categories = Array.from(new Set(Object.values(COMPONENTS).map((c) => c.category)));
        const options = ['all', ...categories];

        container.innerHTML = '';
        options.forEach((category) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `filter-chip${app.currentComponentFilter === category ? ' active' : ''}`;
            button.textContent = category === 'all' ? 'All' : category.replace('_', ' ');
            button.addEventListener('click', () => {
                app.currentComponentFilter = category;
                renderComponentFilters();
                renderComponentLibrary();
            });
            container.appendChild(button);
        });
    }

    function renderComponentLibrary() {
        const library = byId('componentLibrary');
        if (!library) return;

        const state = app.store.getState();
        library.innerHTML = '';

        Object.entries(COMPONENTS).forEach(([type, component]) => {
            if (app.currentComponentFilter !== 'all' && component.category !== app.currentComponentFilter) return;

            const card = document.createElement('button');
            card.type = 'button';
            card.className = 'component-item';
            card.disabled = state.isSimulating;
            card.setAttribute('aria-label', `Add ${component.name}`);

            const energyColor = component.energy > 0 ? '#69ffb3' : component.energy < 0 ? '#ff9eb0' : '#aaaaaa';
            const energyLabel = component.energy === 0 ? '—' : `${component.energy > 0 ? '+' : ''}${component.energy}W`;

            card.innerHTML = `
                <span class="component-icon" aria-hidden="true">${getCategoryIcon(component.category)}</span>
                <span class="component-name">${component.name}</span>
                <span class="component-category">${component.category.replace('_', ' ')}</span>
                <span class="component-meta" style="color:${energyColor}">${energyLabel}</span>
                <span class="component-cost">${component.cost} cr</span>
            `;

            card.title = `${component.name} — ${energyLabel} · ${component.cost} credits`;
            card.addEventListener('click', () => {
                const index = app.store.getState().components.length;
                const x = 220 + (index % 5) * 180;
                const y = 160 + Math.floor(index / 5) * 130;
                const result = app.store.addComponent(type, x, y);
                if (!result.ok) {
                    addFeedback(
                        result.reason === 'budget'
                            ? `Not enough credits for ${component.name} (costs ${component.cost}).`
                            : 'Component could not be placed.',
                        'error'
                    );
                    return;
                }
                app.telemetry.track('component_added', {
                    experimentId: app.activeChallengeDefinition ? app.activeChallengeDefinition.id : null,
                    componentType: type
                });
                addFeedback(`${component.name} added. ${component.energy !== 0 ? (component.energy > 0 ? 'Generates power.' : 'Consumes power — connect with a Wire Link.') : ''}`, 'success');
            });

            library.appendChild(card);
        });
    }

    function getCategoryIcon(category) {
        const icons = {
            generation: '⚡',
            storage: '🔋',
            control: '🎛',
            monitoring: '📡',
            treatment: '💧',
            critical_load: '🏗',
            distribution: '〰'
        };
        return icons[category] || '⚙';
    }

    // ─── Simulation Buttons ────────────────────────────────────────────────────

    function updateSimulationButtons(state) {
        const runSimBtn = byId('runSimBtn');
        const stopSimBtn = byId('stopSimBtn');
        const saveBtn = byId('saveBtn');
        const loadBtn = byId('loadBtn');
        const clearBtn = byId('clearBtn');
        const hintBtn = byId('hintBtn');

        if (runSimBtn) runSimBtn.disabled = state.isSimulating || state.components.length === 0 || !app.activeChallenge;
        if (stopSimBtn) stopSimBtn.disabled = !state.isSimulating;
        if (saveBtn) saveBtn.disabled = state.isSimulating;
        if (loadBtn) loadBtn.disabled = state.isSimulating;
        if (clearBtn) clearBtn.disabled = state.isSimulating;
        if (hintBtn) hintBtn.disabled = state.isSimulating || !app.activeChallenge;
    }

    // ─── Lab Panel Management ──────────────────────────────────────────────────

    function setLabPanel(panelName) {
        const panels = {
            objectives: { tabId: 'panelTabObjectives', panelId: 'panelObjectives' },
            scenario: { tabId: 'panelTabScenario', panelId: 'panelScenario' },
            feedback: { tabId: 'panelTabFeedback', panelId: 'panelFeedback' }
        };

        const nextPanel = panels[panelName] ? panelName : 'objectives';
        app.activeLabPanel = nextPanel;

        Object.entries(panels).forEach(([name, ids]) => {
            const tab = byId(ids.tabId);
            const panel = byId(ids.panelId);
            const isActive = name === nextPanel;
            if (tab) {
                tab.classList.toggle('panel-tab-active', isActive);
                tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
            }
            if (panel) {
                panel.classList.toggle('panel-active', isActive);
                panel.hidden = !isActive;
            }
        });
    }

    // ─── Quick Steps ───────────────────────────────────────────────────────────

    function updateQuickSteps(state) {
        const stepBuild = byId('quickStepBuild');
        const stepBalance = byId('quickStepBalance');
        const stepRun = byId('quickStepRun');
        if (!stepBuild || !stepBalance || !stepRun || !state) return;

        const hasComponents = state.components.length > 0;
        const hasPositiveEnergy = state.energy > 0;
        const hasRun = Array.isArray(state.lastObjectiveResults) && state.lastObjectiveResults.length > 0;

        stepBuild.classList.toggle('step-complete', hasComponents);
        stepBalance.classList.toggle('step-complete', hasComponents && hasPositiveEnergy);
        stepRun.classList.toggle('step-complete', hasRun);
    }

    // ─── Map Screen ────────────────────────────────────────────────────────────

    function renderMap() {
        const mapContainer = byId('tierMap');
        if (!mapContainer || !app.progression) return;

        const state = app.store.getState();
        const campaign = state.campaign;
        const tiers = app.progression.getChallengesByTier();

        mapContainer.innerHTML = '';
        [1, 2, 3].forEach((tierNumber) => {
            const row = document.createElement('section');
            row.className = 'tier-row';

            const heading = document.createElement('div');
            heading.className = 'tier-heading';
            const title = document.createElement('h3');

            const tierLabels = { 1: 'Tier 1 — Foundations', 2: 'Tier 2 — Intermediate', 3: 'Tier 3 — Advanced' };
            title.textContent = tierLabels[tierNumber] || `Tier ${tierNumber}`;

            const summary = document.createElement('span');
            const tierChallenges = tiers[tierNumber] || [];
            const completeCount = tierChallenges.filter((c) => campaign.completedExperiments[c.id]?.passed).length;
            summary.textContent = `${completeCount}/${tierChallenges.length} complete`;
            summary.className = completeCount === tierChallenges.length && tierChallenges.length > 0 ? 'tier-badge tier-complete' : 'tier-badge';

            heading.appendChild(title);
            heading.appendChild(summary);
            row.appendChild(heading);

            const nodes = document.createElement('div');
            nodes.className = 'tier-nodes';

            tierChallenges.forEach((challengeDefinition) => {
                const isUnlocked = campaign.unlockedExperiments.includes(challengeDefinition.id);
                const stars = campaign.starsByExperiment[challengeDefinition.id] || 0;
                const challengeState = campaign.completedExperiments[challengeDefinition.id];
                const isPassed = challengeState && challengeState.passed;
                const isActive = campaign.currentExperimentId === challengeDefinition.id;

                const node = document.createElement('button');
                node.type = 'button';
                node.className = [
                    'map-node',
                    !isUnlocked ? 'locked' : '',
                    isPassed ? 'passed' : '',
                    isActive ? 'active-node' : ''
                ].filter(Boolean).join(' ');
                node.disabled = !isUnlocked;

                const starText = '★'.repeat(stars) + '☆'.repeat(3 - stars);
                const statusText = isPassed ? 'Complete' : isUnlocked ? 'Ready' : '🔒 Locked';
                const difficultyColors = { starter: '#69ffb3', intermediate: '#ffd47e', advanced: '#ff9eb0' };
                const diffColor = difficultyColors[challengeDefinition.difficulty] || '#aaa';

                node.innerHTML = `
                    <div class="node-head">
                        <div class="node-title">${challengeDefinition.title}</div>
                        <span class="node-pill" style="background:${diffColor}">${challengeDefinition.estimatedMinutes}m</span>
                    </div>
                    <div class="node-difficulty" style="color:${diffColor}">${challengeDefinition.difficulty}</div>
                    <div class="node-meta">${statusText}</div>
                    <div class="node-stars" aria-label="${stars} stars">${starText}</div>
                    ${isPassed && challengeState.score ? `<div class="node-score">Score: ${Math.round(challengeState.score)}</div>` : ''}
                `;

                node.addEventListener('click', () => {
                    app.router.navigate('briefing', { challengeId: challengeDefinition.id });
                });

                nodes.appendChild(node);
            });

            row.appendChild(nodes);
            mapContainer.appendChild(row);
        });
    }

    // ─── Briefing Screen ───────────────────────────────────────────────────────

    function renderBriefing(challengeId) {
        const definition = app.progression.getChallenge(challengeId);
        if (!definition) { app.router.replace('map'); return; }

        byId('briefTitle').textContent = definition.title;
        byId('briefDescription').textContent = definition.description;
        byId('briefStory').textContent = definition.briefing.story;
        byId('briefTask').textContent = definition.briefing.task;

        const meta = byId('briefMeta');
        meta.innerHTML = '';
        [
            { label: `Tier ${definition.tier}`, color: '#59e7ff' },
            { label: definition.difficulty, color: definition.difficulty === 'starter' ? '#69ffb3' : definition.difficulty === 'intermediate' ? '#ffd47e' : '#ff9eb0' },
            { label: `${definition.estimatedMinutes} min`, color: '' },
            { label: `Pass: ${definition.passScore}pts`, color: '' }
        ].forEach(({ label, color }) => {
            const pill = document.createElement('span');
            pill.className = 'meta-pill';
            if (color) pill.style.borderColor = color;
            pill.textContent = label;
            meta.appendChild(pill);
        });

        const goals = byId('briefLearningGoals');
        goals.innerHTML = '';
        definition.learningGoals.forEach((goal) => {
            const li = document.createElement('li');
            li.textContent = goal;
            goals.appendChild(li);
        });

        const scenario = byId('briefScenario');
        scenario.innerHTML = '';
        const scenarioItems = [
            `🌦 Weather: ${definition.scenario.weather}`,
            `⚡ Demand: ×${definition.scenario.demandSpike}`,
            `🕐 Time: ${definition.scenario.timeOfDay}`,
            `⚠ Outage: ${definition.scenario.outageWindow.enabled ? `${Math.round(definition.scenario.outageWindow.severity * 100)}% severity` : 'None'}`,
            `💰 Budget: ${definition.scenario.budgetCap} credits`
        ];
        scenarioItems.forEach((line) => {
            const li = document.createElement('li');
            li.textContent = line;
            scenario.appendChild(li);
        });

        const hints = byId('briefHints');
        hints.innerHTML = '';
        definition.briefing.hints.forEach((hint) => {
            const li = document.createElement('li');
            li.textContent = hint;
            hints.appendChild(li);
        });

        // Store the challenge id on the button — the event listener in bindButtons() reads this
        byId('briefStartBtn').dataset.challengeId = definition.id;
    }

    // ─── Scenario Panel ────────────────────────────────────────────────────────

    function renderScenarioPanel(challengeDefinition) {
        const panel = byId('scenarioPanel');
        if (!panel || !challengeDefinition) return;
        const s = challengeDefinition.scenario;
        panel.innerHTML = `
            <div class="section-title">Scenario Conditions</div>
            <ul>
                <li>🌦 Weather: <strong>${s.weather}</strong></li>
                <li>⚡ Demand spike: <strong>×${s.demandSpike}</strong></li>
                <li>⚠ Outage: <strong>${s.outageWindow.enabled ? `${Math.round(s.outageWindow.severity * 100)}% severity` : 'None'}</strong></li>
                <li>💰 Budget cap: <strong>${s.budgetCap} credits</strong></li>
                ${s.throughputTarget ? `<li>🎯 Throughput target: <strong>${s.throughputTarget}</strong></li>` : ''}
                ${s.reserveTarget ? `<li>🔋 Reserve target: <strong>${(s.reserveTarget * 100).toFixed(0)}%</strong></li>` : ''}
                ${s.carbonTarget ? `<li>🌱 Carbon target: <strong>≤${s.carbonTarget}</strong></li>` : ''}
            </ul>
        `;
    }

    function renderLabHeader(challengeDefinition) {
        byId('labTitle').textContent = challengeDefinition.title;
        byId('labSubtitle').textContent = challengeDefinition.description;
        renderScenarioPanel(challengeDefinition);
    }

    // ─── Results Screen ────────────────────────────────────────────────────────

    function renderResults(result) {
        if (!result || !app.activeChallengeDefinition) { app.router.replace('map'); return; }

        const def = app.activeChallengeDefinition;
        const passed = result.passed;
        const stars = app.progression.calculateStars(result.score, result.passScore);

        // Set result card state class for pass/fail styling
        const resultCard = document.querySelector('.result-card');
        if (resultCard) {
            resultCard.classList.toggle('result-passed', passed);
            resultCard.classList.toggle('result-failed', !passed);
        }

        byId('resultExperimentTitle').textContent = def.title;

        // Score display with color
        const scoreEl = byId('resultScore');
        scoreEl.textContent = `${Math.round(result.score)}/100`;
        scoreEl.className = `result-score ${passed ? 'score-pass' : 'score-fail'}`;

        // Stars
        const starsEl = byId('resultStars');
        starsEl.innerHTML = '';
        for (let i = 1; i <= 3; i++) {
            const star = document.createElement('span');
            star.className = `result-star ${i <= stars ? 'star-filled' : 'star-empty'}`;
            star.textContent = i <= stars ? '★' : '☆';
            starsEl.appendChild(star);
        }

        // Pass/fail banner
        const bannerEl = byId('resultBanner');
        if (bannerEl) {
            bannerEl.className = `result-banner ${passed ? 'banner-pass' : 'banner-fail'}`;
            bannerEl.textContent = passed ? '✓ Experiment Passed!' : '✗ Not quite — keep building!';
        }

        byId('resultNarrative').textContent = result.successNarrative || (passed ? def.debrief.success : def.debrief.improve);

        // Objective breakdown — rich display
        const feedback = byId('resultFeedback');
        feedback.innerHTML = '';

        // Score breakdown header
        const breakdownHeader = document.createElement('div');
        breakdownHeader.className = 'result-breakdown-header';
        breakdownHeader.textContent = 'Objective Breakdown';
        feedback.appendChild(breakdownHeader);

        result.objectiveResults.forEach((objResult) => {
            const item = document.createElement('div');
            item.className = `result-obj-item ${objResult.complete ? 'obj-pass' : 'obj-fail'}`;

            const pctBar = Math.round((objResult.weight / result.objectiveResults.reduce((s, r) => s + r.weight, 0)) * 100);

            item.innerHTML = `
                <div class="result-obj-row">
                    <span class="result-obj-icon">${objResult.complete ? '✓' : '✗'}</span>
                    <span class="result-obj-text">${objResult.text}</span>
                    <span class="result-obj-pts">${objResult.complete ? '+' : ''}${objResult.complete ? objResult.weight : 0}/${objResult.weight}pts</span>
                </div>
                <div class="result-obj-detail">${objResult.detail}</div>
                <div class="result-obj-bar-wrap">
                    <div class="result-obj-bar ${objResult.complete ? 'bar-pass' : 'bar-fail'}" style="width:${objResult.complete ? pctBar : 0}%"></div>
                </div>
            `;
            feedback.appendChild(item);
        });

        // Unlock info
        if (result.unlocks && result.unlocks.length > 0) {
            const unlockDiv = document.createElement('div');
            unlockDiv.className = 'result-unlocks';
            const unlockNames = result.unlocks.map((id) => {
                const ch = app.progression.getChallenge(id);
                return ch ? ch.title : id;
            });
            unlockDiv.innerHTML = `🔓 Unlocked: <strong>${unlockNames.join(', ')}</strong>`;
            feedback.appendChild(unlockDiv);
        }

        // Badge earned
        if (passed && def.unlockRewards.badge) {
            const badgeDiv = document.createElement('div');
            badgeDiv.className = 'result-badge-earned';
            badgeDiv.innerHTML = `🏅 Badge earned: <strong>${def.unlockRewards.badge}</strong>`;
            feedback.appendChild(badgeDiv);
        }

        // Store next destination on the button — the event listener in bindButtons() reads this
        const nextId = app.progression.getNextChallengeId(def.id);
        const nextBtn = byId('resultNextBtn');
        const candidate = result.unlocks && result.unlocks.length > 0 ? result.unlocks[0] : nextId;
        nextBtn.disabled = !candidate;
        nextBtn.dataset.nextId = candidate || '';
    }

    // ─── Progress Screen ───────────────────────────────────────────────────────

    function renderProgress() {
        const state = app.store.getState();
        const campaign = state.campaign;
        const summary = app.progression.getCampaignSummary(campaign);

        const summaryContainer = byId('progressSummary');
        summaryContainer.innerHTML = '';

        const summaryItems = [
            { label: 'Experiments Completed', value: `${summary.completedExperiments}/${summary.totalExperiments}`, icon: '🧪' },
            { label: 'Stars Earned', value: `${summary.totalStars}/${summary.maxStars}`, icon: '⭐' },
            { label: 'Mastery Score', value: `${Math.round(state.points)}/100`, icon: '📊' },
            { label: 'Simulation Runs', value: state.sessionStats.runs, icon: '▶' },
            { label: 'Pass Rate', value: state.sessionStats.runs > 0 ? `${Math.round((state.sessionStats.passes / state.sessionStats.runs) * 100)}%` : '—', icon: '✓' }
        ];

        summaryItems.forEach(({ label, value, icon }) => {
            const strip = document.createElement('div');
            strip.className = 'progress-strip';
            strip.innerHTML = `<span class="progress-icon">${icon}</span><span class="progress-label">${label}</span><strong class="progress-value">${value}</strong>`;
            summaryContainer.appendChild(strip);
        });

        const tierContainer = byId('tierProgress');
        tierContainer.innerHTML = '';
        app.progression.buildTierProgress(campaign).forEach((tier) => {
            const strip = document.createElement('div');
            strip.className = 'tier-strip';
            const pct = Math.round(tier.progress * 100);
            strip.innerHTML = `
                <div class="tier-strip-label">Tier ${tier.tier}: <strong>${tier.completed}/${tier.total}</strong></div>
                <div class="tier-progress-bar-wrap"><div class="tier-progress-bar" style="width:${pct}%"></div></div>
            `;
            tierContainer.appendChild(strip);
        });

        const badges = byId('badgesPanel');
        badges.innerHTML = '';
        if (!campaign.badges || campaign.badges.length === 0) {
            const none = document.createElement('div');
            none.className = 'badge-item badge-empty';
            none.textContent = 'No badges yet — complete experiments to unlock them!';
            badges.appendChild(none);
        } else {
            campaign.badges.forEach((badge) => {
                const badgeItem = document.createElement('div');
                badgeItem.className = 'badge-item';
                badgeItem.innerHTML = `🏅 <strong>${badge}</strong>`;
                badges.appendChild(badgeItem);
            });
        }

        const playerNameInput = byId('achievementNameInput');
        if (playerNameInput && !playerNameInput.value.trim()) {
            playerNameInput.value = getStoredPlayerName();
        }
    }

    // ─── Achievement PNG ───────────────────────────────────────────────────────

    function exportAchievementPng() {
        const state = app.store.getState();
        const campaign = state.campaign;
        const summary = app.progression.getCampaignSummary(campaign);
        const playerInput = byId('achievementNameInput');
        const playerName = sanitizePlayerName(playerInput ? playerInput.value : '');
        const exportDate = new Date();

        if (playerInput) playerInput.value = playerName;
        savePlayerName(playerName);

        const canvas = document.createElement('canvas');
        canvas.width = 1600;
        canvas.height = 900;
        const ctx = canvas.getContext('2d');
        if (!ctx) { addFeedback('Certificate export unavailable in this browser.', 'error'); return; }

        const bgGradient = ctx.createLinearGradient(0, 0, 1600, 900);
        bgGradient.addColorStop(0, '#0b2648');
        bgGradient.addColorStop(0.55, '#124d80');
        bgGradient.addColorStop(1, '#0d8a7e');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, 1600, 900);

        ctx.globalAlpha = 0.22;
        ctx.fillStyle = '#59e7ff';
        ctx.beginPath();
        ctx.arc(220, 180, 200, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#69ffa9';
        ctx.beginPath();
        ctx.arc(1370, 170, 170, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        drawRoundedRect(ctx, 90, 80, 1420, 740, 34);
        ctx.fillStyle = 'rgba(8, 20, 38, 0.72)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = '#8ef4ff';
        ctx.font = '700 42px "Segoe UI", sans-serif';
        ctx.fillText('Tech Builders Achievement', 140, 172);

        ctx.fillStyle = '#d7ecff';
        ctx.font = '500 28px "Segoe UI", sans-serif';
        ctx.fillText('Presented to', 140, 228);

        ctx.fillStyle = '#ffffff';
        ctx.font = '700 72px "Segoe UI", sans-serif';
        ctx.fillText(playerName, 140, 316);

        ctx.fillStyle = '#b9d9f1';
        ctx.font = '500 26px "Segoe UI", sans-serif';
        ctx.fillText('for outstanding systems-thinking and innovation in the Tech Builders campaign.', 140, 370);

        ctx.fillStyle = '#69ffb3';
        ctx.font = '700 32px "Segoe UI", sans-serif';
        ctx.fillText('Campaign Performance', 140, 446);

        const lines = [
            `Completed: ${summary.completedExperiments}/${summary.totalExperiments} experiments`,
            `Stars: ${summary.totalStars}/${summary.maxStars}`,
            `Mastery: ${Math.round(state.points)}/100`,
            `Runs: ${state.sessionStats.runs}`,
            `Badges: ${campaign.badges.length}`
        ];

        ctx.fillStyle = '#eaf7ff';
        ctx.font = '600 28px "Segoe UI", sans-serif';
        lines.forEach((line, i) => ctx.fillText(line, 140, 500 + i * 48));

        const badgePreview = campaign.badges.slice(0, 3).join(' | ') || 'Keep building to earn your first badge';
        ctx.fillStyle = '#ffd47e';
        ctx.font = '600 24px "Segoe UI", sans-serif';
        ctx.fillText(`Featured Badges: ${badgePreview}`, 140, 748);

        ctx.textAlign = 'right';
        ctx.fillStyle = '#ffffff';
        ctx.font = '700 38px "Segoe UI", sans-serif';
        ctx.fillText('Built by Cruze Tech', 1460, 670);
        ctx.fillStyle = '#d1eaff';
        ctx.font = '500 24px "Segoe UI", sans-serif';
        ctx.fillText('cruze-tech.com', 1460, 712);
        ctx.fillText('games.cruze-tech.com', 1460, 746);
        ctx.fillText(`Issued ${exportDate.toLocaleDateString()}`, 1460, 786);
        ctx.textAlign = 'left';

        const safeName = playerName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        downloadDataUrl(`tech-builders-achievement-${safeName || 'player'}.png`, canvas.toDataURL('image/png'));

        app.telemetry.track('achievement_exported', { playerName, completedExperiments: summary.completedExperiments, stars: summary.totalStars });
        addFeedback('Achievement PNG downloaded.', 'success');
    }

    // ─── About Screen ──────────────────────────────────────────────────────────

    function ensureAboutScreen() {
        if (app.aboutInitialized) return;
        AboutPage.renderAbout(byId('aboutContent'));
        app.aboutInitialized = true;
    }

    // ─── Objective Preview ─────────────────────────────────────────────────────

    function applyPreviewObjectives() {
        if (!app.simulation || !app.activeChallenge || app.evaluatingPreview) return;
        try {
            app.evaluatingPreview = true;
            const state = app.store.getState();
            const preview = app.simulation.previewObjectives();
            if (preview) {
                app.activeChallenge.updateObjectiveUI(preview.objectiveResults, state, preview.metrics);
            }
        } catch (error) {
            console.error('Preview evaluation failed:', error.message);
        } finally {
            app.evaluatingPreview = false;
        }
    }

    // ─── Experiment Flow ───────────────────────────────────────────────────────

    function calculateHighestTierUnlocked(unlockedIds) {
        return unlockedIds.reduce((maxTier, experimentId) => {
            const definition = app.progression.getChallenge(experimentId);
            return definition ? Math.max(maxTier, definition.tier) : maxTier;
        }, 1);
    }

    function applySimulationResult(result) {
        if (!result || !app.activeChallengeDefinition) return;

        const state = app.store.getState();
        const stars = app.progression.calculateStars(result.score, result.passScore);
        const unlocks = app.progression.resolveUnlocks(state.campaign, app.activeChallengeDefinition.id, result.passed);
        const badges = result.passed ? [app.activeChallengeDefinition.unlockRewards.badge] : [];
        const highestTierUnlocked = calculateHighestTierUnlocked([...state.campaign.unlockedExperiments, ...unlocks]);

        app.store.setExperimentProgress(app.activeChallengeDefinition.id, {
            score: result.score,
            passed: result.passed,
            stars,
            unlocks,
            badges,
            highestTierUnlocked,
            completedAt: new Date().toISOString()
        });

        if (unlocks.length > 0) app.store.addUnlockedExperiments(unlocks);

        result.objectiveResults.forEach((objectiveResult) => {
            if (objectiveResult.complete) {
                app.telemetry.track('objective_completed', {
                    experimentId: app.activeChallengeDefinition.id,
                    objectiveId: objectiveResult.id
                });
            }
        });

        app.telemetry.track(result.passed ? 'experiment_passed' : 'experiment_failed', {
            experimentId: app.activeChallengeDefinition.id,
            score: result.score,
            stars
        });

        app.lastResult = { ...result, stars, unlocks };
        app.router.navigate('results', { challengeId: app.activeChallengeDefinition.id });
    }

    function startExperiment(challengeId) {
        const definition = app.progression.getChallenge(challengeId);
        if (!definition) return;

        app.activeChallengeDefinition = definition;
        app.activeChallenge = new Challenge(definition);
        app.simulation.setChallenge(app.activeChallenge);
        app.store.setActiveChallenge(challengeId);
        app.store.resetDesignForChallenge(definition);
        app.activeChallenge.render();
        renderLabHeader(definition);
        renderComponentFilters();
        renderComponentLibrary();
        clearFeedback();
        addFeedback(`🚀 Experiment started: ${definition.title}`, 'info');
        addFeedback(`🎯 Pass score: ${definition.passScore}/100 — check the objectives panel for details.`, 'info');
        applyPreviewObjectives();

        app.currentHintIndex = 0;
        setLabPanel('objectives');
        updateQuickSteps(app.store.getState());
        app.telemetry.track('experiment_started', { experimentId: challengeId, tier: definition.tier });
        app.router.navigate('lab', { challengeId });
    }

    // ─── Simulation Control ────────────────────────────────────────────────────

    function onRunSimulation() {
        if (!app.activeChallengeDefinition) {
            addFeedback('Select an experiment from the map before simulating.', 'warning');
            return;
        }

        app.telemetry.track('simulation_run', {
            experimentId: app.activeChallengeDefinition.id,
            componentCount: app.store.getState().components.length
        });

        app.simulation.start({
            durationMs: GAME_CONFIG.defaultSimulationDurationMs,
            onComplete: (result) => applySimulationResult(result)
        });
    }

    // ─── Hint System ───────────────────────────────────────────────────────────

    function showHint() {
        if (!app.activeChallengeDefinition) return;
        const hints = app.activeChallengeDefinition.briefing.hints || [];
        if (hints.length === 0) { addFeedback('No hints available for this experiment.', 'info'); return; }
        const hint = hints[app.currentHintIndex % hints.length];
        app.currentHintIndex += 1;
        app.store.recordHintUsed();
        app.telemetry.track('hint_used', { experimentId: app.activeChallengeDefinition.id, hintIndex: app.currentHintIndex });
        setLabPanel('feedback');
        addFeedback(`💡 Hint ${app.currentHintIndex}: ${hint}`, 'info');
    }

    // ─── Welcome Panel ─────────────────────────────────────────────────────────

    function showWelcomePanel() {
        const overlay = byId('welcomeOverlay');
        if (overlay) overlay.removeAttribute('hidden');
    }

    function hideWelcomePanel() {
        const overlay = byId('welcomeOverlay');
        if (overlay) overlay.setAttribute('hidden', '');
    }

    // ─── Button Bindings ───────────────────────────────────────────────────────

    function bindButtons() {
        byId('enterModeBtn').addEventListener('click', () => app.router.navigate('mode'));

        byId('startCampaignBtn').addEventListener('click', () => {
            const firstId = app.progression.getFirstChallengeId();
            if (firstId) app.store.addUnlockedExperiments([firstId]);
            app.router.navigate('map');
        });

        byId('continueCampaignBtn').addEventListener('click', () => {
            const loaded = app.store.load();
            if (loaded.ok) {
                addFeedback('Campaign save loaded.', 'success');
                const current = app.store.getState().campaign.currentExperimentId;
                if (current && app.progression.getChallenge(current)) {
                    app.router.navigate('briefing', { challengeId: current });
                } else {
                    app.router.navigate('map');
                }
            } else {
                addFeedback('No save found. Starting fresh.', 'warning');
                app.router.navigate('map');
            }
        });

        byId('howToPlayBtn').addEventListener('click', () => app.router.navigate('help'));
        byId('aboutBtn').addEventListener('click', () => app.router.navigate('about'));
        byId('helpBackBtn').addEventListener('click', () => app.router.back('mode'));
        byId('mapToModeBtn').addEventListener('click', () => app.router.navigate('mode'));
        byId('mapToProgressBtn').addEventListener('click', () => app.router.navigate('progress'));
        byId('mapToAboutBtn').addEventListener('click', () => app.router.navigate('about'));
        byId('briefBackBtn').addEventListener('click', () => app.router.navigate('map'));
        byId('labToMapBtn').addEventListener('click', () => app.router.navigate('map'));
        byId('labToProgressBtn').addEventListener('click', () => app.router.navigate('progress'));
        byId('labToAboutBtn').addEventListener('click', () => app.router.navigate('about'));

        const focusBtn = byId('focusToggleBtn');
        if (focusBtn) focusBtn.addEventListener('click', () => setFocusMode(!document.body.classList.contains('focus-mode')));

        const toggleSidebarBtnEl = byId('toggleSidebarBtn');
        if (toggleSidebarBtnEl) toggleSidebarBtnEl.addEventListener('click', toggleSidebar);

        const toggleRightPanelBtnEl = byId('toggleRightPanelBtn');
        if (toggleRightPanelBtnEl) toggleRightPanelBtnEl.addEventListener('click', toggleRightPanel);

        byId('runSimBtn').addEventListener('click', onRunSimulation);
        byId('stopSimBtn').addEventListener('click', () => app.simulation.stop(true));

        byId('saveBtn').addEventListener('click', () => {
            const result = app.store.save();
            addFeedback(result.ok ? '💾 Campaign saved.' : `Save failed: ${result.error}`, result.ok ? 'success' : 'error');
        });

        byId('loadBtn').addEventListener('click', () => {
            const result = app.store.load();
            if (result.ok) {
                renderComponentFilters();
                renderComponentLibrary();
                addFeedback('Save loaded successfully.', 'success');
                applyPreviewObjectives();
            } else {
                addFeedback('Load failed — no save found.', 'error');
            }
        });

        byId('clearBtn').addEventListener('click', () => {
            if (!confirm('Clear current build? This cannot be undone.')) return;
            app.store.clearAll();
            addFeedback('Build canvas cleared.', 'info');
            applyPreviewObjectives();
        });

        byId('hintBtn').addEventListener('click', showHint);
        byId('panelTabObjectives').addEventListener('click', () => setLabPanel('objectives'));
        byId('panelTabScenario').addEventListener('click', () => setLabPanel('scenario'));
        byId('panelTabFeedback').addEventListener('click', () => setLabPanel('feedback'));

        byId('resultRetryBtn').addEventListener('click', () => {
            if (app.activeChallengeDefinition) startExperiment(app.activeChallengeDefinition.id);
        });

        byId('resultMapBtn').addEventListener('click', () => app.router.navigate('map'));

        byId('progressBackBtn').addEventListener('click', () => app.router.back('map'));
        byId('aboutBackBtn').addEventListener('click', () => app.router.back('mode'));

        byId('exportTelemetryBtn').addEventListener('click', () => {
            downloadJson('techbuilders-pilot-data.json', app.telemetry.exportPayload());
            addFeedback('Pilot data exported.', 'success');
        });

        byId('exportAchievementBtn').addEventListener('click', exportAchievementPng);
        byId('achievementNameInput').addEventListener('change', (event) => {
            savePlayerName(sanitizePlayerName(event.target.value));
        });

        byId('clearTelemetryBtn').addEventListener('click', () => {
            if (!confirm('Clear all pilot analytics? This cannot be undone.')) return;
            app.telemetry.clear();
            app.store.clearAnalyticsLog();
            addFeedback('Pilot data cleared.', 'warning');
            renderProgress();
        });

        // ── WELCOME PANEL BUTTONS ──────────────────────────────────────────────
        const welcomeCloseTopBtn = byId('welcomeCloseTopBtn');
        const welcomeSkipBtn = byId('welcomeSkipBtn');
        const welcomeStartBtn = byId('welcomeStartBtn');
        if (welcomeCloseTopBtn) welcomeCloseTopBtn.addEventListener('click', () => {
            hideWelcomePanel();
            app.router.replace('splash');
        });
        if (welcomeSkipBtn) welcomeSkipBtn.addEventListener('click', () => {
            hideWelcomePanel();
            app.router.replace('splash');
        });
        if (welcomeStartBtn) welcomeStartBtn.addEventListener('click', () => {
            hideWelcomePanel();
            app.router.replace('splash');
        });

        // ── Briefing start: bound once via delegation on the static button ────
        byId('briefStartBtn').addEventListener('click', () => {
            const btn = byId('briefStartBtn');
            const challengeId = btn.dataset.challengeId;
            if (challengeId) startExperiment(challengeId);
        });

        // ── Results next: bound once, reads target from data attribute ─────────
        byId('resultNextBtn').addEventListener('click', () => {
            const btn = byId('resultNextBtn');
            const target = btn.dataset.nextId;
            if (target) app.router.navigate('briefing', { challengeId: target });
            else app.router.navigate('map');
        });
    }

    // ─── Route Handling ────────────────────────────────────────────────────────

    function setupRouteHandling() {
        app.router.onChange((route) => {
            showScreen(route.name);

            if (route.name === 'map') {
                renderMap();
            } else if (route.name === 'briefing') {
                renderBriefing(route.params.challengeId);
            } else if (route.name === 'lab') {
                // Expand both panels by default when entering lab
                const sidebar = document.querySelector('.sidebar');
                const rightPanel = document.querySelector('.right-panel');
                if (sidebar && !sidebar.classList.contains('expanded')) {
                    sidebar.classList.add('expanded');
                    const toggle = byId('toggleSidebarBtn');
                    if (toggle) { toggle.setAttribute('aria-pressed', 'true'); toggle.textContent = '◀'; }
                }
                if (rightPanel && !rightPanel.classList.contains('expanded')) {
                    rightPanel.classList.add('expanded');
                    const toggle = byId('toggleRightPanelBtn');
                    if (toggle) { toggle.setAttribute('aria-pressed', 'true'); toggle.textContent = '⊖'; }
                }
                setLabPanel('objectives');
            } else if (route.name === 'results') {
                renderResults(app.lastResult);
            } else if (route.name === 'progress') {
                renderProgress();
            } else if (route.name === 'about') {
                ensureAboutScreen();
            }
        });
    }

    // ─── Store Bindings ────────────────────────────────────────────────────────

    function setupStoreBindings() {
        app.store.subscribe(({ state, reason }) => {
            updateStatsDisplay(state);
            updateSimulationButtons(state);
            updateQuickSteps(state);
            if (!state.isSimulating) renderComponentLibrary();
            if (app.activeChallenge && !state.isSimulating && reason !== 'simulation_state_changed') {
                applyPreviewObjectives();
            }
        });

        updateStatsDisplay(app.store.getState());
        updateSimulationButtons(app.store.getState());
        updateQuickSteps(app.store.getState());
    }

    // ─── PWA Setup ─────────────────────────────────────────────────────────────

    function setupOfflineBanner() {
        const banner = byId('offlineBanner');
        if (!banner) return;
        function sync() { banner.hidden = navigator.onLine; }
        window.addEventListener('online', () => { sync(); addFeedback('Back online.', 'success'); });
        window.addEventListener('offline', () => { sync(); addFeedback('Offline mode enabled.', 'warning'); });
        sync();
    }

    function setupInstallPrompt() {
        const installBtn = byId('installBtn');
        if (!installBtn) return;
        window.addEventListener('beforeinstallprompt', (event) => {
            event.preventDefault();
            app.deferredInstallPrompt = event;
            installBtn.hidden = false;
        });
        installBtn.addEventListener('click', async () => {
            if (!app.deferredInstallPrompt) return;
            app.deferredInstallPrompt.prompt();
            await app.deferredInstallPrompt.userChoice;
            app.deferredInstallPrompt = null;
            installBtn.hidden = true;
        });
        window.addEventListener('appinstalled', () => {
            installBtn.hidden = true;
            addFeedback('App installed!', 'success');
        });
    }

    async function registerServiceWorker() {
        if (!('serviceWorker' in navigator)) return;
        try { await navigator.serviceWorker.register('sw.js'); } catch { /* ignore */ }
    }

    // ─── Initialize ────────────────────────────────────────────────────────────

    async function initialize() {
        app.bus = new EventBus();
        app.store = new GameStore({ componentCatalog: COMPONENTS, bus: app.bus });
        app.router = new Router('splash');
        app.simulation = new SimulationEngine(app.store);

        app.challengePayload = await ChallengeRepository.load('data/challenges.json');
        app.progression = new ProgressionEngine(app.challengePayload.challenges);
        app.telemetry = new TelemetryTracker({
            store: app.store,
            schemaVersion: GAME_CONFIG.telemetrySchemaVersion,
            storageKey: GAME_CONFIG.telemetrySaveKey
        });

        app.telemetry.track('session_start', { campaign: app.challengePayload.campaignTitle });
        window.addEventListener('beforeunload', () => {
            app.telemetry.track('session_end', { runs: app.store.getState().sessionStats.runs });
        });

        app.canvas = new CanvasManager(byId('buildCanvas'), app.store, app.bus);

        setupRouteHandling();
        setupStoreBindings();
        initToggleButtons();
        bindButtons();
        setupOfflineBanner();
        setupInstallPrompt();

        renderComponentFilters();
        renderComponentLibrary();
        ensureAboutScreen();
        setLabPanel('objectives');

        addFeedback('Welcome to Tech Builders!', 'success');
        addFeedback('Select an experiment from the map to begin.', 'info');

        registerServiceWorker();

        // Always show welcome panel for all users (both new and returning)
        // They can skip it if they want
        showWelcomePanel();
    }

    document.addEventListener('DOMContentLoaded', () => {
        initialize().catch((error) => {
            addFeedback(`Initialization failed: ${error.message}`, 'error');
            console.error('Init error:', error);
        });
    });
})();