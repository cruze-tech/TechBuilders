(function () {
    const DEFAULT_CHALLENGE_ID = 'solar-water-pump';
    let deferredInstallPrompt = null;

    const app = {
        bus: null,
        store: null,
        canvas: null,
        simulation: null,
        challenge: null,
        hasPreviewReady: false
    };

    function spawnPointForIndex(index) {
        const columns = 4;
        const spacingX = 170;
        const spacingY = 110;
        const startX = 220;
        const startY = 140;

        const column = index % columns;
        const row = Math.floor(index / columns) % 4;
        return {
            x: startX + column * spacingX,
            y: startY + row * spacingY
        };
    }

    function updateStatsDisplay(state) {
        const budgetDisplay = document.getElementById('budgetDisplay');
        const energyDisplay = document.getElementById('energyDisplay');
        const pointsDisplay = document.getElementById('pointsDisplay');

        if (budgetDisplay) {
            budgetDisplay.textContent = String(state.budget);
        }

        if (energyDisplay) {
            energyDisplay.textContent = String(state.energy);
        }

        if (pointsDisplay) {
            pointsDisplay.textContent = String(state.points);
        }
    }

    function updateSimulationButtons(state) {
        const runSimBtn = document.getElementById('runSimBtn');
        const stopSimBtn = document.getElementById('stopSimBtn');
        const saveBtn = document.getElementById('saveBtn');
        const loadBtn = document.getElementById('loadBtn');
        const clearBtn = document.getElementById('clearBtn');

        if (runSimBtn) {
            runSimBtn.disabled = state.isSimulating || state.components.length === 0;
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

        document.querySelectorAll('.component-item').forEach((button) => {
            button.disabled = state.isSimulating;
        });
    }

    function renderComponentLibrary() {
        const library = document.getElementById('componentLibrary');
        if (!library) {
            return;
        }

        library.innerHTML = '';
        Object.entries(COMPONENTS).forEach(([type, component]) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'component-item';
            button.setAttribute('aria-label', `Add ${component.name}`);
            button.innerHTML = `
                <span class="component-icon" aria-hidden="true">⚙</span>
                <span class="component-name">${component.name}</span>
                <span class="component-energy">${component.energy > 0 ? '+' : ''}${component.energy}W</span>
                <span class="component-cost">${component.cost} credits</span>
            `;

            button.addEventListener('click', () => {
                const state = app.store.getState();
                const spawn = spawnPointForIndex(state.components.length);
                const result = app.store.addComponent(type, spawn.x, spawn.y);

                if (!result.ok) {
                    if (result.reason === 'budget') {
                        addFeedback('Insufficient budget for this component.', 'error');
                    } else {
                        addFeedback('Could not place component.', 'error');
                    }
                    return;
                }

                addFeedback(`${component.name} placed on canvas.`, 'success');
            });

            library.appendChild(button);
        });
    }

    function applyPreviewObjectives() {
        if (!app.simulation || !app.challenge) {
            return;
        }

        const preview = app.simulation.previewObjectives();
        app.challenge.updateObjectiveUI(preview.objectiveResults);
    }

    function bindStoreToUI() {
        app.store.subscribe(({ state, reason }) => {
            updateStatsDisplay(state);
            updateSimulationButtons(state);

            if (!state.isSimulating && reason !== 'objectives_updated') {
                applyPreviewObjectives();
                app.hasPreviewReady = true;
            }
        });

        const initialState = app.store.getState();
        updateStatsDisplay(initialState);
        updateSimulationButtons(initialState);
    }

    function setupGameControls() {
        const runSimBtn = document.getElementById('runSimBtn');
        const stopSimBtn = document.getElementById('stopSimBtn');
        const saveBtn = document.getElementById('saveBtn');
        const loadBtn = document.getElementById('loadBtn');
        const clearBtn = document.getElementById('clearBtn');
        const closeModalBtn = document.getElementById('closeModalBtn');
        const menuBtn = document.getElementById('menuBtn');

        if (runSimBtn) {
            runSimBtn.addEventListener('click', () => {
                app.simulation.start();
            });
        }

        if (stopSimBtn) {
            stopSimBtn.addEventListener('click', () => {
                app.simulation.stop({ manual: true });
            });
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                const result = app.store.save();
                if (result.ok) {
                    addFeedback('Progress saved locally.', 'success');
                } else {
                    addFeedback(`Save failed: ${result.error}`, 'error');
                }
            });
        }

        if (loadBtn) {
            loadBtn.addEventListener('click', () => {
                const result = app.store.load();
                if (result.ok) {
                    addFeedback(`Save loaded (schema v${result.usingVersion}).`, 'success');
                    applyPreviewObjectives();
                } else {
                    addFeedback('Could not load save data. Start a new build.', 'warning');
                }
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (!confirm('Clear all components? This cannot be undone.')) {
                    return;
                }
                app.store.clearAll();
                addFeedback('Canvas cleared. Mastery score retained.', 'info');
                applyPreviewObjectives();
            });
        }

        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => {
                closeModal();
            });
        }

        if (menuBtn) {
            menuBtn.addEventListener('click', () => {
                if (confirm('Return to menu? Current unsaved edits may be lost.')) {
                    showMenuScreen();
                }
            });
        }
    }

    function setupMenuAndHelp() {
        const startGameBtn = document.getElementById('startGameBtn');
        const menuHelpBtn = document.getElementById('menuHelpBtn');
        const helpBackBtn = document.getElementById('helpBackBtn');
        const helpStartBtn = document.getElementById('helpStartBtn');

        if (startGameBtn) {
            startGameBtn.addEventListener('click', () => {
                hideMenuScreen();
            });
        }

        if (menuHelpBtn) {
            menuHelpBtn.addEventListener('click', () => {
                showHelpScreen();
            });
        }

        if (helpBackBtn) {
            helpBackBtn.addEventListener('click', () => {
                hideHelpScreen();
            });
        }

        if (helpStartBtn) {
            helpStartBtn.addEventListener('click', () => {
                hideHelpScreen();
                hideMenuScreen();
            });
        }
    }

    function setupConnectionFeedback() {
        app.bus.on('state:changed', ({ state, reason }) => {
            if (reason !== 'component_added' && reason !== 'component_moved_commit' && reason !== 'component_removed') {
                return;
            }

            const metrics = state.metrics;
            if (!metrics) {
                return;
            }

            const pumpPoweredCount = state.components.filter(
                (component) => component.type === 'waterPump' && metrics.poweredComponentIds.has(component.id)
            ).length;

            if (pumpPoweredCount === 0 && state.components.some((component) => component.type === 'waterPump')) {
                addFeedback('Water pump detected but not powered through wires yet.', 'warning');
            }
        });
    }

    function setupOfflineBanner() {
        const banner = document.getElementById('offlineBanner');
        if (!banner) {
            return;
        }

        function updateBanner() {
            banner.hidden = navigator.onLine;
        }

        window.addEventListener('online', () => {
            updateBanner();
            addFeedback('You are back online.', 'success');
        });

        window.addEventListener('offline', () => {
            updateBanner();
            addFeedback('You are offline. Cached mode is active.', 'warning');
        });

        updateBanner();
    }

    function setupInstallPrompt() {
        const installBtn = document.getElementById('installBtn');
        if (!installBtn) {
            return;
        }

        window.addEventListener('beforeinstallprompt', (event) => {
            event.preventDefault();
            deferredInstallPrompt = event;
            installBtn.hidden = false;
        });

        installBtn.addEventListener('click', async () => {
            if (!deferredInstallPrompt) {
                return;
            }

            deferredInstallPrompt.prompt();
            await deferredInstallPrompt.userChoice;
            deferredInstallPrompt = null;
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

    async function loadChallengeDefinition() {
        const payload = await ChallengeRepository.load('data/challenges.json');
        if (payload.usingFallback) {
            addFeedback('Using built-in challenge definition (fallback mode).', 'warning');
        }

        const challengeDefinition = ChallengeRepository.findById(payload, DEFAULT_CHALLENGE_ID) || payload.challenges[0];
        return new Challenge(challengeDefinition);
    }

    async function initializeGame() {
        app.bus = new EventBus();
        app.store = new GameStore({
            componentCatalog: COMPONENTS,
            bus: app.bus
        });

        app.challenge = await loadChallengeDefinition();
        app.challenge.render();

        app.canvas = new CanvasManager(document.getElementById('buildCanvas'), app.store, app.bus);
        app.simulation = new SimulationEngine(app.store, app.challenge);

        renderComponentLibrary();
        bindStoreToUI();
        setupGameControls();
        setupMenuAndHelp();
        setupConnectionFeedback();
        setupOfflineBanner();
        setupInstallPrompt();

        applyPreviewObjectives();

        addFeedback('Welcome to Tech Builders.', 'success');
        addFeedback('Build wire-linked power paths before running tests.', 'info');
        addFeedback('Drag components, press R to rotate, Delete to remove.', 'info');

        registerServiceWorker();
    }

    document.addEventListener('DOMContentLoaded', () => {
        initializeGame().catch((error) => {
            addFeedback(`Initialization failed: ${error.message}`, 'error');
        });
    });
})();
