(function (root) {
    function asNumber(value, fallback) {
        return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
    }

    class Challenge {
        constructor(definition) {
            this.definition = definition;
            this.id = definition.id;
            this.title = definition.title;
            this.description = definition.description;
            this.objectives = definition.objectives;
            this.passScore = definition.passScore;
            this.scenario = definition.scenario || {};
            this.learningGoals = definition.learningGoals || [];
            this.briefing = definition.briefing || {};
            this.debrief = definition.debrief || {};
            this.difficulty = definition.difficulty || 'starter';
            this.tier = definition.tier || 1;
            this.estimatedMinutes = definition.estimatedMinutes || 10;
            this.unlockRewards = definition.unlockRewards || { badge: 'Innovator', unlocks: [] };
        }

        renderHeader() {
            const title = document.getElementById('challengeTitle');
            const description = document.getElementById('challengeDesc');
            if (title) title.textContent = this.title;
            if (description) description.textContent = this.description;
        }

        renderObjectives() {
            const objectivesList = document.getElementById('objectivesList');
            if (!objectivesList) return;

            objectivesList.innerHTML = '';

            // Render total weight indicator
            const totalWeight = this.objectives.reduce((sum, o) => sum + o.weight, 0);
            const header = document.createElement('div');
            header.className = 'objectives-header';
            header.innerHTML = `
                <span class="obj-pass-label">Pass score: <strong>${this.passScore}/100</strong></span>
                <span class="obj-total-label">${totalWeight} pts available</span>
            `;
            objectivesList.appendChild(header);

            this.objectives.forEach((objective) => {
                const item = document.createElement('li');
                item.className = 'objective-item';
                item.id = `obj-${objective.id}`;

                item.innerHTML = `
                    <div class="obj-row-top">
                        <span class="objective-status" aria-hidden="true"></span>
                        <span class="objective-text">${objective.text}</span>
                        <span class="obj-weight">${objective.weight}pts</span>
                    </div>
                    <div class="obj-progress-bar-wrap">
                        <div class="obj-progress-bar" data-id="${objective.id}"></div>
                    </div>
                    <div class="obj-detail" data-detail="${objective.id}">Not yet evaluated</div>
                `;

                objectivesList.appendChild(item);
            });
        }

        render() {
            this.renderHeader();
            this.renderObjectives();
        }

        countType(components, type, poweredIds) {
            return components.filter((component) => {
                if (component.type !== type) return false;
                if (!poweredIds) return true;
                return poweredIds.has(component.id);
            }).length;
        }

        hasRoles(components, poweredIds, roles) {
            return roles.every((role) =>
                components.some((component) => {
                    const roleList = Array.isArray(component.roles) ? component.roles : [];
                    return roleList.includes(role) && poweredIds.has(component.id);
                })
            );
        }

        // Returns a 0-1 progress value for visual progress bar
        _objectiveProgress(objective, state, metrics) {
            const components = state.components;
            switch (objective.type) {
                case 'positive_energy': {
                    const threshold = asNumber(objective.threshold, 0);
                    if (metrics.usableNetEnergy <= 0) return 0;
                    return Math.min(1, (metrics.usableNetEnergy - threshold) / Math.max(1, threshold + 50));
                }
                case 'component_presence':
                case 'powered_component': {
                    const required = asNumber(objective.minCount, 1);
                    const count = objective.type === 'powered_component'
                        ? this.countType(components, objective.componentType, metrics.poweredComponentIds)
                        : this.countType(components, objective.componentType);
                    return Math.min(1, count / required);
                }
                case 'throughput_target': {
                    const target = asNumber(objective.target, asNumber(this.scenario.throughputTarget, 0));
                    return target <= 0 ? 1 : Math.min(1, metrics.throughputWithScenario / target);
                }
                case 'runtime_reserve': {
                    const target = asNumber(objective.target, asNumber(this.scenario.reserveTarget, 0));
                    return target <= 0 ? 1 : Math.min(1, metrics.runtimeReserve / target);
                }
                case 'redundancy_required': {
                    const target = asNumber(objective.target, 2);
                    return Math.min(1, metrics.redundancyCount / target);
                }
                case 'critical_load_uptime': {
                    const target = asNumber(objective.target, 0.9);
                    return Math.min(1, metrics.criticalLoadUptime / target);
                }
                case 'efficiency_ratio': {
                    const target = asNumber(objective.target, 0.5);
                    return Math.min(1, metrics.efficiencyRatio / target);
                }
                case 'budget_cap': {
                    const maxTarget = asNumber(objective.maxTarget, asNumber(this.scenario.budgetCap, 900));
                    const budgetStart = asNumber(state.budgetStart, 900);
                    const spent = Math.max(0, budgetStart - state.budget);
                    if (spent === 0) return 1;
                    // Progress goes DOWN as you spend more — full = under budget, 0 = over
                    return spent <= maxTarget ? 1 - (spent / maxTarget) * 0.5 : 0;
                }
                case 'signal_chain_valid': {
                    const roles = Array.isArray(objective.roles) ? objective.roles : ['sensor', 'controller', 'actuator'];
                    const poweredRoles = roles.filter((role) =>
                        components.some((c) => {
                            const rl = Array.isArray(c.roles) ? c.roles : [];
                            return rl.includes(role) && metrics.poweredComponentIds.has(c.id);
                        })
                    );
                    return poweredRoles.length / roles.length;
                }
                case 'carbon_intensity_target': {
                    const maxTarget = asNumber(objective.maxTarget, 0.3);
                    if (metrics.carbonIntensity <= maxTarget) return 1;
                    return Math.max(0, 1 - (metrics.carbonIntensity - maxTarget) / maxTarget);
                }
                default:
                    return 0;
            }
        }

        evaluateObjective(objective, state, metrics) {
            const components = state.components;

            switch (objective.type) {
                case 'positive_energy': {
                    const threshold = asNumber(objective.threshold, 0);
                    const complete = metrics.usableNetEnergy > threshold;
                    return {
                        id: objective.id, complete, weight: objective.weight, text: objective.text,
                        detail: complete
                            ? `Net energy: +${Math.round(metrics.usableNetEnergy)}W ✓`
                            : `Net energy: ${Math.round(metrics.usableNetEnergy)}W — needs to be above ${threshold}W`
                    };
                }
                case 'component_presence': {
                    const required = asNumber(objective.minCount, 1);
                    const count = this.countType(components, objective.componentType);
                    const complete = count >= required;
                    return {
                        id: objective.id, complete, weight: objective.weight, text: objective.text,
                        detail: complete
                            ? `${count} ${objective.componentType} installed ✓`
                            : `${count}/${required} ${objective.componentType} needed`
                    };
                }
                case 'powered_component': {
                    const required = asNumber(objective.minCount, 1);
                    const count = this.countType(components, objective.componentType, metrics.poweredComponentIds);
                    const total = this.countType(components, objective.componentType);
                    const complete = count >= required;
                    return {
                        id: objective.id, complete, weight: objective.weight, text: objective.text,
                        detail: complete
                            ? `${objective.componentType} powered via wire ✓`
                            : total === 0
                                ? `No ${objective.componentType} placed yet`
                                : `${objective.componentType} placed but not connected — add a Wire Link`
                    };
                }
                case 'component_count_range': {
                    const min = asNumber(objective.min, 0);
                    const max = asNumber(objective.max, Number.MAX_SAFE_INTEGER);
                    const count = components.length;
                    const complete = count >= min && count <= max;
                    return {
                        id: objective.id, complete, weight: objective.weight, text: objective.text,
                        detail: complete
                            ? `${count} components — in range ✓`
                            : `${count} components — needs ${min}–${max}`
                    };
                }
                case 'throughput_target': {
                    const target = asNumber(objective.target, asNumber(this.scenario.throughputTarget, 0));
                    const value = metrics.throughputWithScenario;
                    const complete = value >= target;
                    return {
                        id: objective.id, complete, weight: objective.weight, text: objective.text,
                        detail: complete
                            ? `Throughput: ${Math.round(value)} / ${target} ✓`
                            : `Throughput: ${Math.round(value)} / ${target} — add load components with throughput`
                    };
                }
                case 'runtime_reserve': {
                    const target = asNumber(objective.target, asNumber(this.scenario.reserveTarget, 0));
                    const value = metrics.runtimeReserve;
                    const complete = value >= target;
                    return {
                        id: objective.id, complete, weight: objective.weight, text: objective.text,
                        detail: complete
                            ? `Reserve: ${(value * 100).toFixed(0)}% ✓`
                            : `Reserve: ${(value * 100).toFixed(0)}% / ${(target * 100).toFixed(0)}% — add Battery Banks`
                    };
                }
                case 'redundancy_required': {
                    const target = asNumber(objective.target, 2);
                    const value = metrics.redundancyCount;
                    const complete = value >= target;
                    return {
                        id: objective.id, complete, weight: objective.weight, text: objective.text,
                        detail: complete
                            ? `${value} generation sources active ✓`
                            : `${value}/${target} generation sources — add more generators`
                    };
                }
                case 'critical_load_uptime': {
                    const target = asNumber(objective.target, asNumber(this.scenario.criticalLoadTarget, 0.9));
                    const value = metrics.criticalLoadUptime;
                    const complete = value >= target;
                    return {
                        id: objective.id, complete, weight: objective.weight, text: objective.text,
                        detail: complete
                            ? `Uptime: ${(value * 100).toFixed(1)}% ✓`
                            : `Uptime: ${(value * 100).toFixed(1)}% / ${(target * 100).toFixed(1)}% — increase reserve & generation`
                    };
                }
                case 'efficiency_ratio': {
                    const target = asNumber(objective.target, asNumber(this.scenario.efficiencyTarget, 0.5));
                    const value = metrics.efficiencyRatio;
                    const complete = value >= target;
                    return {
                        id: objective.id, complete, weight: objective.weight, text: objective.text,
                        detail: complete
                            ? `Efficiency: ${(value * 100).toFixed(0)}% ✓`
                            : `Efficiency: ${(value * 100).toFixed(0)}% / ${(target * 100).toFixed(0)}% — add throughput components`
                    };
                }
                case 'budget_cap': {
                    const maxTarget = asNumber(objective.maxTarget, asNumber(this.scenario.budgetCap, 900));
                    const budgetStart = asNumber(state.budgetStart, 900);
                    const spent = Math.max(0, budgetStart - state.budget);
                    const complete = spent <= maxTarget;
                    return {
                        id: objective.id, complete, weight: objective.weight, text: objective.text,
                        detail: complete
                            ? `Spent: ${spent} / ${maxTarget} credits ✓`
                            : `Spent: ${spent} credits — over cap by ${spent - maxTarget}`
                    };
                }
                case 'signal_chain_valid': {
                    const roles = Array.isArray(objective.roles) && objective.roles.length > 0
                        ? objective.roles
                        : ['sensor', 'controller', 'actuator'];
                    const complete = this.hasRoles(components, metrics.poweredComponentIds, roles);
                    const presentRoles = roles.filter((role) =>
                        components.some((c) => {
                            const rl = Array.isArray(c.roles) ? c.roles : [];
                            return rl.includes(role) && metrics.poweredComponentIds.has(c.id);
                        })
                    );
                    const missingRoles = roles.filter((r) => !presentRoles.includes(r));
                    return {
                        id: objective.id, complete, weight: objective.weight, text: objective.text,
                        detail: complete
                            ? `Signal chain active: ${roles.join(' → ')} ✓`
                            : `Missing powered roles: ${missingRoles.join(', ')}`
                    };
                }
                case 'carbon_intensity_target': {
                    const maxTarget = asNumber(objective.maxTarget, asNumber(this.scenario.carbonTarget, 0.3));
                    const value = metrics.carbonIntensity;
                    const complete = value <= maxTarget;
                    return {
                        id: objective.id, complete, weight: objective.weight, text: objective.text,
                        detail: complete
                            ? `Carbon: ${value.toFixed(3)} / max ${maxTarget.toFixed(2)} ✓`
                            : `Carbon: ${value.toFixed(3)} — above ${maxTarget.toFixed(2)} limit. Use cleaner generators`
                    };
                }
                default:
                    return {
                        id: objective.id, complete: false, weight: objective.weight, text: objective.text,
                        detail: `Unknown objective type: ${objective.type}`
                    };
            }
        }

        evaluate(state, metrics) {
            const objectiveResults = this.objectives.map((objective) =>
                this.evaluateObjective(objective, state, metrics)
            );
            const score = objectiveResults.reduce((total, result) => total + (result.complete ? result.weight : 0), 0);
            const passed = score >= this.passScore;

            return {
                score,
                passScore: this.passScore,
                passed,
                objectiveResults,
                feedback: objectiveResults.map((result) => ({
                    message: `${result.complete ? '✓' : '✗'} ${result.detail}`,
                    type: result.complete ? 'success' : 'warning',
                    objectiveId: result.id
                })),
                successNarrative: passed ? this.debrief.success : this.debrief.improve
            };
        }

        updateObjectiveUI(objectiveResults, state, metrics) {
            objectiveResults.forEach((result, index) => {
                const item = document.getElementById(`obj-${result.id}`);
                if (!item) return;

                const wasComplete = item.classList.contains('complete');
                item.classList.toggle('complete', result.complete);
                item.classList.toggle('incomplete', !result.complete);

                // Flash animation on state change
                if (result.complete && !wasComplete) {
                    item.classList.add('obj-just-completed');
                    setTimeout(() => item.classList.remove('obj-just-completed'), 800);
                }

                // Update detail text
                const detailEl = item.querySelector(`[data-detail="${result.id}"]`);
                if (detailEl) {
                    detailEl.textContent = result.detail;
                    detailEl.className = `obj-detail ${result.complete ? 'obj-detail-ok' : 'obj-detail-warn'}`;
                }

                // Update progress bar
                const progressBar = item.querySelector(`[data-id="${result.id}"]`);
                if (progressBar && state && metrics) {
                    const objective = this.objectives[index];
                    const progress = objective ? this._objectiveProgress(objective, state, metrics) : (result.complete ? 1 : 0);
                    progressBar.style.width = `${Math.round(progress * 100)}%`;
                    progressBar.className = `obj-progress-bar ${result.complete ? 'bar-complete' : progress > 0.5 ? 'bar-halfway' : 'bar-low'}`;
                } else if (progressBar) {
                    progressBar.style.width = result.complete ? '100%' : '0%';
                    progressBar.className = `obj-progress-bar ${result.complete ? 'bar-complete' : 'bar-low'}`;
                }
            });

            // Update the live score tally
            this._updateScoreTally(objectiveResults);
        }

        _updateScoreTally(objectiveResults) {
            const tallyEl = document.getElementById('liveScoreTally');
            if (!tallyEl) return;
            const earned = objectiveResults.reduce((sum, r) => sum + (r.complete ? r.weight : 0), 0);
            const total = objectiveResults.reduce((sum, r) => sum + r.weight, 0);
            const pct = Math.round((earned / Math.max(1, total)) * 100);
            tallyEl.textContent = `${pct}/100`;
            tallyEl.className = `live-score-tally ${pct >= this.passScore ? 'tally-passing' : pct >= this.passScore * 0.6 ? 'tally-close' : 'tally-failing'}`;

            // Update pass threshold indicator
            const passIndicator = document.getElementById('passThresholdLabel');
            if (passIndicator) {
                passIndicator.className = `pass-threshold-label ${pct >= this.passScore ? 'threshold-met' : ''}`;
            }
        }
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { Challenge };
    }

    root.Challenge = Challenge;
})(typeof window !== 'undefined' ? window : globalThis);