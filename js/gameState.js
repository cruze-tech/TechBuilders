(function (root) {
    function safeNumber(value, fallback) {
        return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
    }

    function cloneSet(values) {
        return Array.from(new Set(values || []));
    }

    class GameStore {
        constructor(options) {
            this.componentCatalog = options.componentCatalog;
            this.bus = options.bus;
            this.state = this.createInitialState();
        }

        createInitialState() {
            const initial = {
                budgetStart: GAME_CONFIG.initialBudget,
                budget: GAME_CONFIG.initialBudget,
                energy: 0,
                rawEnergy: 0,
                points: 0,
                bestScore: 0,
                components: [],
                selectedComponentId: null,
                isSimulating: false,
                designVersion: 0,
                lastScoredVersion: -1,
                nextComponentId: 0,
                lastObjectiveResults: [],
                activeChallengeId: null,
                campaign: {
                    currentExperimentId: null,
                    unlockedExperiments: ['exp-01'],
                    completedExperiments: {},
                    starsByExperiment: {},
                    badges: [],
                    highestTierUnlocked: 1
                },
                analyticsLog: [],
                sessionStats: {
                    runs: 0,
                    passes: 0,
                    fails: 0,
                    hintsUsed: 0,
                    componentsPlaced: 0
                }
            };

            return this.withComputedMetrics(initial);
        }

        withComputedMetrics(state) {
            const metrics = SystemEvaluator.evaluatePowerNetwork(state.components);
            return {
                ...state,
                energy: metrics.usableNetEnergy,
                rawEnergy: metrics.rawNetEnergy,
                metrics
            };
        }

        getState() {
            return this.state;
        }

        subscribe(listener) {
            return this.bus.on('state:changed', listener);
        }

        emit(reason, payload) {
            this.bus.emit('state:changed', {
                state: this.state,
                reason: reason || 'update',
                payload: payload || null
            });
        }

        resolveTemplate(type) {
            return this.componentCatalog[type] || null;
        }

        cloneComponentFromTemplate(type, x, y, rotation, fixedId) {
            const template = this.resolveTemplate(type);
            if (!template) {
                return null;
            }

            return {
                id: fixedId || `c-${this.state.nextComponentId + 1}`,
                type,
                name: template.name,
                category: template.category,
                roles: Array.isArray(template.roles) ? [...template.roles] : [],
                cost: template.cost,
                energy: template.energy,
                throughput: template.throughput,
                reserve: template.reserve,
                carbonIntensity: template.carbonIntensity,
                color: template.color,
                width: template.width,
                height: template.height,
                x: x - template.width / 2,
                y: y - template.height / 2,
                rotation: rotation || 0
            };
        }

        resetDesignForChallenge(challengeDefinition) {
            const budgetCap = challengeDefinition && challengeDefinition.scenario
                ? safeNumber(challengeDefinition.scenario.budgetCap, GAME_CONFIG.initialBudget)
                : GAME_CONFIG.initialBudget;

            this.state = this.withComputedMetrics({
                ...this.state,
                budgetStart: Math.min(GAME_CONFIG.initialBudget, budgetCap),
                budget: Math.min(GAME_CONFIG.initialBudget, budgetCap),
                components: [],
                selectedComponentId: null,
                isSimulating: false,
                designVersion: 0,
                lastScoredVersion: -1,
                nextComponentId: 0,
                lastObjectiveResults: [],
                activeChallengeId: challengeDefinition ? challengeDefinition.id : this.state.activeChallengeId
            });
            this.emit('design_reset');
        }

        setActiveChallenge(challengeId) {
            this.state = {
                ...this.state,
                activeChallengeId: challengeId,
                campaign: {
                    ...this.state.campaign,
                    currentExperimentId: challengeId
                }
            };
            this.emit('challenge_selected', { challengeId });
        }

        addComponent(type, x, y) {
            const template = this.resolveTemplate(type);
            if (!template) {
                return { ok: false, reason: 'unknown_component' };
            }
            if (this.state.budget < template.cost) {
                return { ok: false, reason: 'budget' };
            }

            const component = this.cloneComponentFromTemplate(type, x, y, 0, null);
            const nextState = {
                ...this.state,
                budget: this.state.budget - template.cost,
                components: [...this.state.components, component],
                selectedComponentId: component.id,
                designVersion: this.state.designVersion + 1,
                nextComponentId: this.state.nextComponentId + 1,
                sessionStats: {
                    ...this.state.sessionStats,
                    componentsPlaced: this.state.sessionStats.componentsPlaced + 1
                }
            };

            this.state = this.withComputedMetrics(nextState);
            this.emit('component_added', { component });
            return { ok: true, component };
        }

        selectComponent(componentId) {
            if (this.state.selectedComponentId === componentId) {
                return;
            }
            this.state = {
                ...this.state,
                selectedComponentId: componentId || null
            };
            this.emit('component_selected', { componentId });
        }

        updateComponentPosition(componentId, x, y, options) {
            const opts = options || {};
            let changed = false;

            const components = this.state.components.map((component) => {
                if (component.id !== componentId) {
                    return component;
                }
                changed = true;
                return { ...component, x, y };
            });

            if (!changed) {
                return;
            }

            this.state = this.withComputedMetrics({
                ...this.state,
                components,
                designVersion: opts.commitVersion ? this.state.designVersion + 1 : this.state.designVersion
            });
            this.emit(opts.commitVersion ? 'component_moved_commit' : 'component_moved_preview', { componentId });
        }

        rotateComponent(componentId, angle) {
            let changed = false;
            const components = this.state.components.map((component) => {
                if (component.id !== componentId) {
                    return component;
                }
                changed = true;
                return {
                    ...component,
                    rotation: (component.rotation + angle) % 360
                };
            });

            if (!changed) {
                return false;
            }

            this.state = this.withComputedMetrics({
                ...this.state,
                components,
                designVersion: this.state.designVersion + 1
            });
            this.emit('component_rotated', { componentId });
            return true;
        }

        removeComponent(componentId) {
            const existing = this.state.components.find((component) => component.id === componentId);
            if (!existing) {
                return false;
            }

            this.state = this.withComputedMetrics({
                ...this.state,
                components: this.state.components.filter((component) => component.id !== componentId),
                budget: this.state.budget + existing.cost,
                selectedComponentId: this.state.selectedComponentId === componentId ? null : this.state.selectedComponentId,
                designVersion: this.state.designVersion + 1
            });
            this.emit('component_removed', { componentId });
            return true;
        }

        clearAll() {
            this.state = this.withComputedMetrics({
                ...this.state,
                components: [],
                selectedComponentId: null,
                budgetStart: GAME_CONFIG.initialBudget,
                budget: GAME_CONFIG.initialBudget,
                designVersion: 0,
                nextComponentId: 0,
                lastScoredVersion: -1,
                lastObjectiveResults: []
            });
            this.emit('cleared');
        }

        setSimulating(isSimulating) {
            if (this.state.isSimulating === isSimulating) {
                return;
            }
            this.state = {
                ...this.state,
                isSimulating
            };
            this.emit('simulation_state_changed', { isSimulating });
        }

        setObjectiveResults(results) {
            this.state = {
                ...this.state,
                lastObjectiveResults: Array.isArray(results) ? results : []
            };
            this.emit('objectives_updated');
        }

        applySimulationScore(score, designVersion) {
            const normalized = Math.max(0, Math.min(100, Math.round(score)));
            const alreadyScored = this.state.lastScoredVersion === designVersion;
            const nextPoints = Math.max(this.state.points, normalized);

            this.state = {
                ...this.state,
                points: nextPoints,
                bestScore: Math.max(this.state.bestScore, normalized),
                lastScoredVersion: alreadyScored ? this.state.lastScoredVersion : designVersion
            };
            this.emit(alreadyScored ? 'score_unchanged' : 'score_applied', { score: normalized });
            return { alreadyScored, score: normalized, points: nextPoints };
        }

        setExperimentProgress(experimentId, payload) {
            const current = this.state.campaign;
            const stars = Math.max(0, Math.min(3, safeNumber(payload.stars, 0)));
            const score = Math.max(0, Math.min(100, safeNumber(payload.score, 0)));

            const completedExperiments = {
                ...current.completedExperiments,
                [experimentId]: {
                    score,
                    passed: Boolean(payload.passed),
                    completedAt: payload.completedAt || new Date().toISOString()
                }
            };

            const starsByExperiment = {
                ...current.starsByExperiment,
                [experimentId]: Math.max(stars, safeNumber(current.starsByExperiment[experimentId], 0))
            };

            const unlockedExperiments = cloneSet([...current.unlockedExperiments, ...(payload.unlocks || [])]);
            const badges = cloneSet([...current.badges, ...(payload.badges || [])]);

            this.state = {
                ...this.state,
                campaign: {
                    ...current,
                    completedExperiments,
                    starsByExperiment,
                    unlockedExperiments,
                    badges,
                    highestTierUnlocked: Math.max(current.highestTierUnlocked, safeNumber(payload.highestTierUnlocked, current.highestTierUnlocked))
                }
            };

            this.emit('campaign_progressed', { experimentId, score, stars });
        }

        addUnlockedExperiments(experimentIds) {
            const existing = this.state.campaign.unlockedExperiments;
            const merged = cloneSet([...existing, ...(experimentIds || [])]);
            this.state = {
                ...this.state,
                campaign: {
                    ...this.state.campaign,
                    unlockedExperiments: merged
                }
            };
            this.emit('experiments_unlocked', { unlocked: merged });
        }

        recordHintUsed() {
            this.state = {
                ...this.state,
                sessionStats: {
                    ...this.state.sessionStats,
                    hintsUsed: this.state.sessionStats.hintsUsed + 1
                }
            };
            this.emit('hint_used');
        }

        recordSimulationRun(passed) {
            this.state = {
                ...this.state,
                sessionStats: {
                    ...this.state.sessionStats,
                    runs: this.state.sessionStats.runs + 1,
                    passes: this.state.sessionStats.passes + (passed ? 1 : 0),
                    fails: this.state.sessionStats.fails + (passed ? 0 : 1)
                }
            };
            this.emit('simulation_recorded', { passed });
        }

        appendAnalyticsEvent(event) {
            this.state = {
                ...this.state,
                analyticsLog: [...this.state.analyticsLog, event]
            };
            this.emit('analytics_event', { event });
        }

        clearAnalyticsLog() {
            this.state = {
                ...this.state,
                analyticsLog: []
            };
            this.emit('analytics_cleared');
        }

        buildSerializableState() {
            return {
                budget: this.state.budget,
                budgetStart: this.state.budgetStart,
                points: this.state.points,
                bestScore: this.state.bestScore,
                designVersion: this.state.designVersion,
                lastScoredVersion: this.state.lastScoredVersion,
                nextComponentId: this.state.nextComponentId,
                activeChallengeId: this.state.activeChallengeId,
                campaign: this.state.campaign,
                analyticsLog: this.state.analyticsLog,
                sessionStats: this.state.sessionStats,
                components: this.state.components.map((component) => ({
                    id: component.id,
                    type: component.type,
                    x: component.x + component.width / 2,
                    y: component.y + component.height / 2,
                    rotation: component.rotation
                }))
            };
        }

        save() {
            try {
                Persistence.saveToLocalStorage(localStorage, this.buildSerializableState(), GAME_CONFIG.campaignSaveKey);
                return { ok: true };
            } catch (error) {
                return { ok: false, error: error.message };
            }
        }

        load() {
            try {
                const result = Persistence.loadFromLocalStorage(localStorage, GAME_CONFIG.campaignSaveKey);
                if (!result.ok) {
                    return { ok: false, error: result.error };
                }

                const data = result.data.state;
                const rebuilt = [];
                let maxId = 0;

                (data.components || []).forEach((saved) => {
                    const component = this.cloneComponentFromTemplate(saved.type, safeNumber(saved.x, 0), safeNumber(saved.y, 0), safeNumber(saved.rotation, 0), saved.id);
                    if (!component) {
                        return;
                    }
                    rebuilt.push(component);
                    const numeric = Number.parseInt(String(component.id).replace(/[^0-9]/g, ''), 10);
                    if (Number.isFinite(numeric) && numeric > maxId) {
                        maxId = numeric;
                    }
                });

                const fallbackCampaign = this.createInitialState().campaign;
                const campaign = data.campaign && typeof data.campaign === 'object'
                    ? {
                          ...fallbackCampaign,
                          ...data.campaign,
                          unlockedExperiments: cloneSet(data.campaign.unlockedExperiments || fallbackCampaign.unlockedExperiments),
                          badges: cloneSet(data.campaign.badges || []),
                          completedExperiments: data.campaign.completedExperiments || {},
                          starsByExperiment: data.campaign.starsByExperiment || {}
                      }
                    : fallbackCampaign;

                this.state = this.withComputedMetrics({
                    ...this.state,
                    budget: safeNumber(data.budget, GAME_CONFIG.initialBudget),
                    budgetStart: safeNumber(data.budgetStart, GAME_CONFIG.initialBudget),
                    points: safeNumber(data.points, 0),
                    bestScore: safeNumber(data.bestScore, safeNumber(data.points, 0)),
                    designVersion: safeNumber(data.designVersion, 0),
                    lastScoredVersion: safeNumber(data.lastScoredVersion, -1),
                    nextComponentId: Math.max(safeNumber(data.nextComponentId, rebuilt.length), maxId),
                    components: rebuilt,
                    selectedComponentId: null,
                    activeChallengeId: typeof data.activeChallengeId === 'string' ? data.activeChallengeId : null,
                    isSimulating: false,
                    campaign,
                    analyticsLog: Array.isArray(data.analyticsLog) ? data.analyticsLog : [],
                    sessionStats: {
                        ...this.state.sessionStats,
                        ...(data.sessionStats || {})
                    }
                });

                this.emit('loaded');
                return { ok: true, usingVersion: result.data.version };
            } catch (error) {
                return { ok: false, error: error.message };
            }
        }
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { GameStore };
    }

    root.GameStore = GameStore;
})(typeof window !== 'undefined' ? window : globalThis);
