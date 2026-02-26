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
        lastResult: null,
        aboutInitialized: false
    };

    function byId(id) {
        return document.getElementById(id);
    }

    function showScreen(routeName) {
        const screenId = ROUTE_TO_SCREEN[routeName] || ROUTE_TO_SCREEN.mode;
        document.querySelectorAll('.screen').forEach((screen) => {
            screen.classList.remove('screen-active');
        });
        const target = byId(screenId);
        if (target) {
            target.classList.add('screen-active');
        }
    }

    function renderComponentFilters() {
        const container = byId('componentFilters');
        if (!container) {
            return;
        }

        const categories = Array.from(new Set(Object.values(COMPONENTS).map((component) => component.category)));
        const options = ['all', ...categories];

        container.innerHTML = '';
        options.forEach((category) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `filter-chip${app.currentComponentFilter === category ? ' active' : ''}`;
            button.textContent = category === 'all' ? 'all' : category;
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
        if (!library) {
            return;
        }

        const state = app.store.getState();
        library.innerHTML = '';

        Object.entries(COMPONENTS).forEach(([type, component]) => {
            if (app.currentComponentFilter !== 'all' && component.category !== app.currentComponentFilter) {
                return;
            }

            const card = document.createElement('button');
            card.type = 'button';
            card.className = 'component-item';
            card.disabled = state.isSimulating;
            card.setAttribute('aria-label', `Add ${component.name}`);

            card.innerHTML = `
                <span class="component-icon" aria-hidden="true">⚙</span>
                <span class="component-name">${component.name}</span>
                <span class="component-category">${component.category}</span>
                <span class="component-energy">${component.energy > 0 ? '+' : ''}${component.energy}W</span>
                <span class="component-cost">${component.cost} credits</span>
            `;

            card.addEventListener('click', () => {
                const index = app.store.getState().components.length;
                const x = 220 + (index % 5) * 170;
                const y = 160 + Math.floor(index / 5) * 120;
                const result = app.store.addComponent(type, x, y);
                if (!result.ok) {
                    addFeedback(result.reason === 'budget' ? 'Not enough credits for this component.' : 'Component could not be placed.', 'error');
                    return;
                }

                app.telemetry.track('component_added', {
                    experimentId: app.activeChallengeDefinition ? app.activeChallengeDefinition.id : null,
                    componentType: type
                });
                addFeedback(`${component.name} added to design.`, 'success');
            });

            library.appendChild(card);
        });
    }

    function updateStatsDisplay(state) {
        const budgetDisplay = byId('budgetDisplay');
        const energyDisplay = byId('energyDisplay');
        const pointsDisplay = byId('pointsDisplay');

        if (budgetDisplay) {
            budgetDisplay.textContent = String(Math.max(0, Math.round(state.budget)));
        }
        if (energyDisplay) {
            energyDisplay.textContent = String(Math.round(state.energy));
        }
        if (pointsDisplay) {
            pointsDisplay.textContent = String(Math.round(state.points));
        }
    }

    function updateSimulationButtons(state) {
        const runSimBtn = byId('runSimBtn');
        const stopSimBtn = byId('stopSimBtn');
        const saveBtn = byId('saveBtn');
        const loadBtn = byId('loadBtn');
        const clearBtn = byId('clearBtn');
        const hintBtn = byId('hintBtn');

        if (runSimBtn) {
            runSimBtn.disabled = state.isSimulating || state.components.length === 0 || !app.activeChallenge;
        }
        if (stopSimBtn) {
            stopSimBtn.disabled = !state.isSimulating;
        }
        if (saveBtn) {
            saveBtn.disabled = state.isSimulating;
        }
        if (loadBtn) {
            loadBtn.disabled = state.isSimulating;
        }
        if (clearBtn) {
            clearBtn.disabled = state.isSimulating;
        }
        if (hintBtn) {
            hintBtn.disabled = state.isSimulating || !app.activeChallenge;
        }
    }

    function renderMap() {
        const mapContainer = byId('tierMap');
        if (!mapContainer || !app.progression) {
            return;
        }

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
            title.textContent = `Tier ${tierNumber}`;
            const summary = document.createElement('span');

            const tierChallenges = tiers[tierNumber] || [];
            const completeCount = tierChallenges.filter((challenge) => campaign.completedExperiments[challenge.id] && campaign.completedExperiments[challenge.id].passed).length;
            summary.textContent = `${completeCount}/${tierChallenges.length} complete`;

            heading.appendChild(title);
            heading.appendChild(summary);
            row.appendChild(heading);

            const nodes = document.createElement('div');
            nodes.className = 'tier-nodes';

            tierChallenges.forEach((challengeDefinition) => {
                const isUnlocked = campaign.unlockedExperiments.includes(challengeDefinition.id);
                const stars = campaign.starsByExperiment[challengeDefinition.id] || 0;
                const challengeState = campaign.completedExperiments[challengeDefinition.id];

                const node = document.createElement('button');
                node.type = 'button';
                node.className = `map-node${isUnlocked ? '' : ' locked'}`;
                node.disabled = !isUnlocked;

                const starText = stars > 0 ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : '☆☆☆';
                node.innerHTML = `
                    <div class="node-title">${challengeDefinition.title}</div>
                    <div class="node-meta">${challengeDefinition.difficulty} · ${challengeDefinition.estimatedMinutes} mins</div>
                    <div class="node-meta">${challengeState && challengeState.passed ? 'Passed' : isUnlocked ? 'Unlocked' : 'Locked'}</div>
                    <div class="node-stars">${starText}</div>
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

    function renderBriefing(challengeId) {
        const definition = app.progression.getChallenge(challengeId);
        if (!definition) {
            app.router.replace('map');
            return;
        }

        byId('briefTitle').textContent = definition.title;
        byId('briefDescription').textContent = definition.description;
        byId('briefStory').textContent = definition.briefing.story;
        byId('briefTask').textContent = definition.briefing.task;

        const meta = byId('briefMeta');
        meta.innerHTML = '';
        [
            `Tier ${definition.tier}`,
            definition.difficulty,
            `${definition.estimatedMinutes} mins`,
            `Pass score ${definition.passScore}`
        ].forEach((entry) => {
            const pill = document.createElement('span');
            pill.className = 'meta-pill';
            pill.textContent = entry;
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
            `Weather: ${definition.scenario.weather}`,
            `Demand spike: x${definition.scenario.demandSpike}`,
            `Time of day: ${definition.scenario.timeOfDay}`,
            `Outage: ${definition.scenario.outageWindow.enabled ? `enabled (${Math.round(definition.scenario.outageWindow.severity * 100)}% severity)` : 'none'}`,
            `Budget cap: ${definition.scenario.budgetCap} credits`
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

        const startButton = byId('briefStartBtn');
        startButton.onclick = () => {
            startExperiment(definition.id);
        };
    }

    function renderScenarioPanel(challengeDefinition) {
        const panel = byId('scenarioPanel');
        if (!panel || !challengeDefinition) {
            return;
        }

        const scenario = challengeDefinition.scenario;
        panel.innerHTML = `
            <div class="section-title">Scenario Status</div>
            <ul>
                <li>Weather: ${scenario.weather}</li>
                <li>Demand Multiplier: x${scenario.demandSpike}</li>
                <li>Outage: ${scenario.outageWindow.enabled ? `${Math.round(scenario.outageWindow.severity * 100)}% severity` : 'No outage event'}</li>
                <li>Target Budget: ${scenario.budgetCap} credits</li>
            </ul>
        `;
    }

    function renderLabHeader(challengeDefinition) {
        byId('labTitle').textContent = challengeDefinition.title;
        byId('labSubtitle').textContent = challengeDefinition.description;
        renderScenarioPanel(challengeDefinition);
    }

    function renderResults(result) {
        if (!result || !app.activeChallengeDefinition) {
            app.router.replace('map');
            return;
        }

        byId('resultExperimentTitle').textContent = app.activeChallengeDefinition.title;
        byId('resultScore').textContent = `${Math.round(result.score)}/100`;
        byId('resultNarrative').textContent = result.successNarrative || (result.passed ? 'Great build.' : 'Try a better design.');

        const stars = app.progression.calculateStars(result.score, result.passScore);
        byId('resultStars').textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);

        const feedback = byId('resultFeedback');
        feedback.innerHTML = '';
        result.feedback.forEach((entry) => {
            const item = document.createElement('div');
            item.className = 'result-feedback-item';
            item.textContent = entry.message;
            feedback.appendChild(item);
        });

        const nextId = app.progression.getNextChallengeId(app.activeChallengeDefinition.id);
        const nextBtn = byId('resultNextBtn');
        nextBtn.disabled = !nextId;
        nextBtn.onclick = () => {
            const candidate = result.unlocks && result.unlocks.length > 0 ? result.unlocks[0] : nextId;
            if (candidate) {
                app.router.navigate('briefing', { challengeId: candidate });
            } else {
                app.router.navigate('map');
            }
        };
    }

    function renderProgress() {
        const state = app.store.getState();
        const campaign = state.campaign;

        const summary = app.progression.getCampaignSummary(campaign);
        const summaryContainer = byId('progressSummary');
        summaryContainer.innerHTML = '';

        const summaryItems = [
            `Completed experiments: ${summary.completedExperiments}/${summary.totalExperiments}`,
            `Stars: ${summary.totalStars}/${summary.maxStars}`,
            `Mastery score: ${Math.round(state.points)}/100`,
            `Simulation runs: ${state.sessionStats.runs}`,
            `Passes: ${state.sessionStats.passes} · Fails: ${state.sessionStats.fails}`
        ];

        summaryItems.forEach((entry) => {
            const strip = document.createElement('div');
            strip.className = 'progress-strip';
            strip.textContent = entry;
            summaryContainer.appendChild(strip);
        });

        const tierContainer = byId('tierProgress');
        tierContainer.innerHTML = '';
        app.progression.buildTierProgress(campaign).forEach((tier) => {
            const strip = document.createElement('div');
            strip.className = 'tier-strip';
            strip.textContent = `Tier ${tier.tier}: ${tier.completed}/${tier.total} complete (${Math.round(tier.progress * 100)}%)`;
            tierContainer.appendChild(strip);
        });

        const badges = byId('badgesPanel');
        badges.innerHTML = '';
        if (!campaign.badges || campaign.badges.length === 0) {
            const none = document.createElement('div');
            none.className = 'badge-item';
            none.textContent = 'No badges earned yet. Complete experiments to unlock rewards.';
            badges.appendChild(none);
        } else {
            campaign.badges.forEach((badge) => {
                const badgeItem = document.createElement('div');
                badgeItem.className = 'badge-item';
                badgeItem.textContent = `🏅 ${badge}`;
                badges.appendChild(badgeItem);
            });
        }
    }

    function ensureAboutScreen() {
        if (app.aboutInitialized) {
            return;
        }
        AboutPage.renderAbout(byId('aboutContent'));
        app.aboutInitialized = true;
    }

    function applyPreviewObjectives() {
        if (!app.simulation || !app.activeChallenge) {
            return;
        }
        const preview = app.simulation.previewObjectives();
        app.activeChallenge.updateObjectiveUI(preview.objectiveResults);
    }

    function calculateHighestTierUnlocked(unlockedIds) {
        return unlockedIds.reduce((maxTier, experimentId) => {
            const definition = app.progression.getChallenge(experimentId);
            if (!definition) {
                return maxTier;
            }
            return Math.max(maxTier, definition.tier);
        }, 1);
    }

    function applySimulationResult(result) {
        if (!result || !app.activeChallengeDefinition) {
            return;
        }

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

        if (unlocks.length > 0) {
            app.store.addUnlockedExperiments(unlocks);
        }

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

        app.lastResult = {
            ...result,
            stars,
            unlocks
        };

        app.router.navigate('results', { challengeId: app.activeChallengeDefinition.id });
    }

    function startExperiment(challengeId) {
        const definition = app.progression.getChallenge(challengeId);
        if (!definition) {
            return;
        }

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
        addFeedback(`Experiment started: ${definition.title}`, 'info');
        applyPreviewObjectives();

        app.currentHintIndex = 0;
        app.telemetry.track('experiment_started', { experimentId: challengeId, tier: definition.tier });

        app.router.navigate('lab', { challengeId });
    }

    function onRunSimulation() {
        if (!app.activeChallengeDefinition) {
            addFeedback('Select an experiment before simulation.', 'warning');
            return;
        }

        app.telemetry.track('simulation_run', {
            experimentId: app.activeChallengeDefinition.id,
            componentCount: app.store.getState().components.length
        });

        app.simulation.start({
            durationMs: GAME_CONFIG.defaultSimulationDurationMs,
            onComplete: (result) => {
                applySimulationResult(result);
            }
        });
    }

    function showHint() {
        if (!app.activeChallengeDefinition) {
            return;
        }

        const hints = app.activeChallengeDefinition.briefing.hints || [];
        if (hints.length === 0) {
            addFeedback('No hints available for this experiment.', 'info');
            return;
        }

        const hint = hints[app.currentHintIndex % hints.length];
        app.currentHintIndex += 1;
        app.store.recordHintUsed();
        app.telemetry.track('hint_used', {
            experimentId: app.activeChallengeDefinition.id,
            hintIndex: app.currentHintIndex
        });
        addFeedback(`Hint: ${hint}`, 'info');
    }

    function bindButtons() {
        byId('enterModeBtn').addEventListener('click', () => app.router.navigate('mode'));

        byId('startCampaignBtn').addEventListener('click', () => {
            const firstId = app.progression.getFirstChallengeId();
            if (firstId) {
                app.store.addUnlockedExperiments([firstId]);
            }
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
                addFeedback('No valid save found. Starting from map.', 'warning');
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

        byId('runSimBtn').addEventListener('click', onRunSimulation);
        byId('stopSimBtn').addEventListener('click', () => app.simulation.stop(true));

        byId('saveBtn').addEventListener('click', () => {
            const result = app.store.save();
            if (result.ok) {
                addFeedback('Campaign saved locally.', 'success');
            } else {
                addFeedback(`Save failed: ${result.error}`, 'error');
            }
        });

        byId('loadBtn').addEventListener('click', () => {
            const result = app.store.load();
            if (result.ok) {
                renderComponentFilters();
                renderComponentLibrary();
                addFeedback('Save loaded successfully.', 'success');
                applyPreviewObjectives();
            } else {
                addFeedback('Load failed.', 'error');
            }
        });

        byId('clearBtn').addEventListener('click', () => {
            if (!confirm('Clear current build?')) {
                return;
            }
            app.store.clearAll();
            addFeedback('Build canvas cleared.', 'info');
            applyPreviewObjectives();
        });

        byId('hintBtn').addEventListener('click', showHint);

        byId('resultRetryBtn').addEventListener('click', () => {
            if (app.activeChallengeDefinition) {
                startExperiment(app.activeChallengeDefinition.id);
            }
        });

        byId('resultMapBtn').addEventListener('click', () => app.router.navigate('map'));

        byId('progressBackBtn').addEventListener('click', () => app.router.back('map'));
        byId('aboutBackBtn').addEventListener('click', () => app.router.back('mode'));

        byId('exportTelemetryBtn').addEventListener('click', () => {
            downloadJson('techbuilders-pilot-data.json', app.telemetry.exportPayload());
            addFeedback('Pilot analytics exported.', 'success');
        });

        byId('clearTelemetryBtn').addEventListener('click', () => {
            if (!confirm('Clear all local pilot analytics?')) {
                return;
            }
            app.telemetry.clear();
            app.store.clearAnalyticsLog();
            addFeedback('Pilot analytics cleared.', 'warning');
            renderProgress();
        });
    }

    function setupRouteHandling() {
        app.router.onChange((route) => {
            showScreen(route.name);

            if (route.name === 'map') {
                renderMap();
            } else if (route.name === 'briefing') {
                renderBriefing(route.params.challengeId);
            } else if (route.name === 'lab') {
                renderComponentFilters();
                renderComponentLibrary();
            } else if (route.name === 'results') {
                renderResults(app.lastResult);
            } else if (route.name === 'progress') {
                renderProgress();
            } else if (route.name === 'about') {
                ensureAboutScreen();
            }
        });
    }

    function setupStoreBindings() {
        app.store.subscribe(({ state, reason }) => {
            updateStatsDisplay(state);
            updateSimulationButtons(state);
            if (!state.isSimulating) {
                renderComponentLibrary();
            }
            if (app.activeChallenge && !state.isSimulating && reason !== 'simulation_state_changed') {
                applyPreviewObjectives();
            }
        });

        updateStatsDisplay(app.store.getState());
        updateSimulationButtons(app.store.getState());
    }

    function setupOfflineBanner() {
        const banner = byId('offlineBanner');
        if (!banner) {
            return;
        }

        function sync() {
            banner.hidden = navigator.onLine;
        }

        window.addEventListener('online', () => {
            sync();
            addFeedback('Back online.', 'success');
        });

        window.addEventListener('offline', () => {
            sync();
            addFeedback('Offline mode enabled.', 'warning');
        });

        sync();
    }

    function setupInstallPrompt() {
        const installBtn = byId('installBtn');
        if (!installBtn) {
            return;
        }

        window.addEventListener('beforeinstallprompt', (event) => {
            event.preventDefault();
            app.deferredInstallPrompt = event;
            installBtn.hidden = false;
        });

        installBtn.addEventListener('click', async () => {
            if (!app.deferredInstallPrompt) {
                return;
            }

            app.deferredInstallPrompt.prompt();
            await app.deferredInstallPrompt.userChoice;
            app.deferredInstallPrompt = null;
            installBtn.hidden = true;
        });

        window.addEventListener('appinstalled', () => {
            installBtn.hidden = true;
            addFeedback('App installed successfully.', 'success');
        });
    }

    async function registerServiceWorker() {
        if (!('serviceWorker' in navigator)) {
            return;
        }

        try {
            await navigator.serviceWorker.register('sw.js');
        } catch (error) {
            addFeedback('Service worker registration failed.', 'warning');
        }
    }

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
        bindButtons();
        setupOfflineBanner();
        setupInstallPrompt();

        renderComponentFilters();
        renderComponentLibrary();
        ensureAboutScreen();

        addFeedback('Welcome to Tech Builders V2.', 'success');
        addFeedback('Complete experiments to unlock higher tiers.', 'info');

        registerServiceWorker();
        app.router.replace('splash');
    }

    document.addEventListener('DOMContentLoaded', () => {
        initialize().catch((error) => {
            addFeedback(`Initialization failed: ${error.message}`, 'error');
        });
    });
})();
