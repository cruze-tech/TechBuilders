(function (root) {
    class GameStore {
        constructor(options) {
            this.componentCatalog = options.componentCatalog;
            this.bus = options.bus;
            this.state = this.createInitialState();
        }

        createInitialState() {
            const initial = {
                budget: 500,
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
                lastObjectiveResults: []
            };
            return this.withComputedMetrics(initial);
        }

        getState() {
            return this.state;
        }

        subscribe(listener) {
            return this.bus.on('state:changed', listener);
        }

        emit(reason) {
            this.bus.emit('state:changed', {
                state: this.state,
                reason: reason || 'update'
            });
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

        resolveTemplate(type) {
            const template = this.componentCatalog[type];
            if (!template) {
                return null;
            }
            return template;
        }

        cloneComponentFromTemplate(type, x, y, rotation, fixedId) {
            const template = this.resolveTemplate(type);
            if (!template) {
                return null;
            }

            const componentId = fixedId || `c-${this.state.nextComponentId + 1}`;
            return {
                id: componentId,
                type,
                name: template.name,
                cost: template.cost,
                energy: template.energy,
                weight: template.weight,
                color: template.color,
                width: template.width,
                height: template.height,
                x: x - template.width / 2,
                y: y - template.height / 2,
                rotation: rotation || 0
            };
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
                nextComponentId: this.state.nextComponentId + 1
            };

            this.state = this.withComputedMetrics(nextState);
            this.emit('component_added');
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
            this.emit('component_selected');
        }

        updateComponentPosition(componentId, x, y, options) {
            const opts = options || {};
            let changed = false;
            const updatedComponents = this.state.components.map((component) => {
                if (component.id !== componentId) {
                    return component;
                }

                changed = true;
                return {
                    ...component,
                    x,
                    y
                };
            });

            if (!changed) {
                return;
            }

            const nextState = {
                ...this.state,
                components: updatedComponents,
                designVersion: opts.commitVersion ? this.state.designVersion + 1 : this.state.designVersion
            };

            this.state = this.withComputedMetrics(nextState);
            this.emit(opts.commitVersion ? 'component_moved_commit' : 'component_moved_preview');
        }

        rotateComponent(componentId, angle) {
            let changed = false;
            const updatedComponents = this.state.components.map((component) => {
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
                components: updatedComponents,
                designVersion: this.state.designVersion + 1
            });
            this.emit('component_rotated');
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
            this.emit('component_removed');
            return true;
        }

        clearAll() {
            this.state = this.withComputedMetrics({
                ...this.createInitialState(),
                points: this.state.points,
                bestScore: this.state.bestScore,
                nextComponentId: 0,
                lastScoredVersion: -1
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
            this.emit('simulation_state_changed');
        }

        setObjectiveResults(results) {
            this.state = {
                ...this.state,
                lastObjectiveResults: Array.isArray(results) ? results : []
            };
            this.emit('objectives_updated');
        }

        applySimulationScore(score, designVersion) {
            const roundedScore = Math.max(0, Math.min(100, Math.round(score)));
            const alreadyScored = this.state.lastScoredVersion === designVersion;
            const nextPoints = Math.max(this.state.points, roundedScore);

            this.state = {
                ...this.state,
                points: nextPoints,
                bestScore: Math.max(this.state.bestScore, roundedScore),
                lastScoredVersion: alreadyScored ? this.state.lastScoredVersion : designVersion
            };
            this.emit(alreadyScored ? 'score_unchanged' : 'score_applied');
            return { alreadyScored, score: roundedScore, points: nextPoints };
        }

        serializeStateForSave() {
            return {
                budget: this.state.budget,
                points: this.state.points,
                bestScore: this.state.bestScore,
                designVersion: this.state.designVersion,
                lastScoredVersion: this.state.lastScoredVersion,
                nextComponentId: this.state.nextComponentId,
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
                Persistence.saveToLocalStorage(localStorage, this.serializeStateForSave());
                return { ok: true };
            } catch (error) {
                return { ok: false, error: error.message };
            }
        }

        load() {
            try {
                const loaded = Persistence.loadFromLocalStorage(localStorage);
                if (!loaded.ok) {
                    return { ok: false, error: loaded.error };
                }

                const data = loaded.data.state;
                const rebuiltComponents = [];
                let maxComponentId = 0;

                data.components.forEach((savedComponent) => {
                    const template = this.resolveTemplate(savedComponent.type);
                    if (!template) {
                        return;
                    }

                    const rebuilt = this.cloneComponentFromTemplate(
                        savedComponent.type,
                        savedComponent.x,
                        savedComponent.y,
                        savedComponent.rotation,
                        savedComponent.id
                    );

                    if (!rebuilt) {
                        return;
                    }

                    rebuiltComponents.push(rebuilt);
                    const numericPart = Number.parseInt(String(rebuilt.id).replace(/[^0-9]/g, ''), 10);
                    if (Number.isFinite(numericPart) && numericPart > maxComponentId) {
                        maxComponentId = numericPart;
                    }
                });

                this.state = this.withComputedMetrics({
                    ...this.state,
                    budget: data.budget,
                    points: data.points,
                    bestScore: data.bestScore,
                    components: rebuiltComponents,
                    selectedComponentId: null,
                    designVersion: data.designVersion,
                    lastScoredVersion: data.lastScoredVersion,
                    nextComponentId: Math.max(data.nextComponentId, maxComponentId),
                    isSimulating: false
                });

                this.emit('loaded');
                return { ok: true, usingVersion: loaded.data.version };
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
