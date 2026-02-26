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

            if (title) {
                title.textContent = this.title;
            }

            if (description) {
                description.textContent = this.description;
            }
        }

        renderObjectives() {
            const objectivesList = document.getElementById('objectivesList');
            if (!objectivesList) {
                return;
            }

            objectivesList.innerHTML = '';
            this.objectives.forEach((objective) => {
                const item = document.createElement('li');
                item.className = 'objective-item';
                item.id = `obj-${objective.id}`;

                const status = document.createElement('span');
                status.className = 'objective-status';
                status.setAttribute('aria-hidden', 'true');

                const text = document.createElement('span');
                text.className = 'objective-text';
                text.textContent = objective.text;

                const stateText = document.createElement('span');
                stateText.className = 'objective-state-text';
                stateText.textContent = 'Pending';

                item.appendChild(status);
                item.appendChild(text);
                item.appendChild(stateText);
                objectivesList.appendChild(item);
            });
        }

        render() {
            this.renderHeader();
            this.renderObjectives();
        }

        countType(components, type, poweredIds) {
            return components.filter((component) => {
                if (component.type !== type) {
                    return false;
                }
                if (!poweredIds) {
                    return true;
                }
                return poweredIds.has(component.id);
            }).length;
        }

        hasRoles(components, poweredIds, roles) {
            return roles.every((role) => components.some((component) => {
                const roleList = Array.isArray(component.roles) ? component.roles : [];
                return roleList.includes(role) && poweredIds.has(component.id);
            }));
        }

        evaluateObjective(objective, state, metrics) {
            const components = state.components;

            switch (objective.type) {
                case 'positive_energy': {
                    const threshold = asNumber(objective.threshold, 0);
                    const complete = metrics.usableNetEnergy > threshold;
                    return {
                        id: objective.id,
                        complete,
                        weight: objective.weight,
                        text: objective.text,
                        detail: complete
                            ? `Usable net energy is ${Math.round(metrics.usableNetEnergy)}W.`
                            : `Usable net energy is ${Math.round(metrics.usableNetEnergy)}W; target is > ${threshold}W.`
                    };
                }

                case 'component_presence': {
                    const required = asNumber(objective.minCount, 1);
                    const count = this.countType(components, objective.componentType);
                    const complete = count >= required;
                    return {
                        id: objective.id,
                        complete,
                        weight: objective.weight,
                        text: objective.text,
                        detail: complete
                            ? `${count} ${objective.componentType} component(s) installed.`
                            : `Need ${required} ${objective.componentType}, found ${count}.`
                    };
                }

                case 'powered_component': {
                    const required = asNumber(objective.minCount, 1);
                    const count = this.countType(components, objective.componentType, metrics.poweredComponentIds);
                    const complete = count >= required;
                    return {
                        id: objective.id,
                        complete,
                        weight: objective.weight,
                        text: objective.text,
                        detail: complete
                            ? `${objective.componentType} is powered through the network.`
                            : `${objective.componentType} is not sufficiently powered yet.`
                    };
                }

                case 'component_count_range': {
                    const min = asNumber(objective.min, 0);
                    const max = asNumber(objective.max, Number.MAX_SAFE_INTEGER);
                    const count = components.length;
                    const complete = count >= min && count <= max;
                    return {
                        id: objective.id,
                        complete,
                        weight: objective.weight,
                        text: objective.text,
                        detail: complete
                            ? `Design uses ${count} components in range ${min}-${max}.`
                            : `Design uses ${count} components; required range is ${min}-${max}.`
                    };
                }

                case 'throughput_target': {
                    const target = asNumber(objective.target, asNumber(this.scenario.throughputTarget, 0));
                    const value = metrics.throughputWithScenario;
                    const complete = value >= target;
                    return {
                        id: objective.id,
                        complete,
                        weight: objective.weight,
                        text: objective.text,
                        detail: complete
                            ? `Throughput reached ${Math.round(value)} (target ${target}).`
                            : `Throughput is ${Math.round(value)}; target is ${target}.`
                    };
                }

                case 'runtime_reserve': {
                    const target = asNumber(objective.target, asNumber(this.scenario.reserveTarget, 0));
                    const value = metrics.runtimeReserve;
                    const complete = value >= target;
                    return {
                        id: objective.id,
                        complete,
                        weight: objective.weight,
                        text: objective.text,
                        detail: complete
                            ? `Reserve is ${value.toFixed(2)} (target ${target.toFixed(2)}).`
                            : `Reserve is ${value.toFixed(2)}; target is ${target.toFixed(2)}.`
                    };
                }

                case 'redundancy_required': {
                    const target = asNumber(objective.target, 2);
                    const value = metrics.redundancyCount;
                    const complete = value >= target;
                    return {
                        id: objective.id,
                        complete,
                        weight: objective.weight,
                        text: objective.text,
                        detail: complete
                            ? `Redundancy achieved with ${value} powered generators.`
                            : `Need ${target} powered generators; currently ${value}.`
                    };
                }

                case 'critical_load_uptime': {
                    const target = asNumber(objective.target, asNumber(this.scenario.criticalLoadTarget, 0.9));
                    const value = metrics.criticalLoadUptime;
                    const complete = value >= target;
                    return {
                        id: objective.id,
                        complete,
                        weight: objective.weight,
                        text: objective.text,
                        detail: complete
                            ? `Critical uptime is ${(value * 100).toFixed(1)}%.`
                            : `Critical uptime is ${(value * 100).toFixed(1)}%; target ${(target * 100).toFixed(1)}%.`
                    };
                }

                case 'efficiency_ratio': {
                    const target = asNumber(objective.target, asNumber(this.scenario.efficiencyTarget, 0.5));
                    const value = metrics.efficiencyRatio;
                    const complete = value >= target;
                    return {
                        id: objective.id,
                        complete,
                        weight: objective.weight,
                        text: objective.text,
                        detail: complete
                            ? `Efficiency is ${(value * 100).toFixed(1)}%.`
                            : `Efficiency is ${(value * 100).toFixed(1)}%; target ${(target * 100).toFixed(1)}%.`
                    };
                }

                case 'budget_cap': {
                    const maxTarget = asNumber(objective.maxTarget, asNumber(this.scenario.budgetCap, GAME_CONFIG.initialBudget));
                    const budgetStart = asNumber(state.budgetStart, GAME_CONFIG.initialBudget);
                    const spent = Math.max(0, budgetStart - state.budget);
                    const complete = spent <= maxTarget;
                    return {
                        id: objective.id,
                        complete,
                        weight: objective.weight,
                        text: objective.text,
                        detail: complete
                            ? `Spent ${spent} credits within cap ${maxTarget}.`
                            : `Spent ${spent} credits; cap is ${maxTarget}.`
                    };
                }

                case 'signal_chain_valid': {
                    const roles = Array.isArray(objective.roles) && objective.roles.length > 0
                        ? objective.roles
                        : ['sensor', 'controller', 'actuator'];
                    const complete = this.hasRoles(components, metrics.poweredComponentIds, roles);
                    return {
                        id: objective.id,
                        complete,
                        weight: objective.weight,
                        text: objective.text,
                        detail: complete
                            ? `Signal chain roles are powered: ${roles.join(' -> ')}.`
                            : `Signal chain incomplete. Ensure powered roles: ${roles.join(', ')}.`
                    };
                }

                case 'carbon_intensity_target': {
                    const maxTarget = asNumber(objective.maxTarget, asNumber(this.scenario.carbonTarget, 0.3));
                    const value = metrics.carbonIntensity;
                    const complete = value <= maxTarget;
                    return {
                        id: objective.id,
                        complete,
                        weight: objective.weight,
                        text: objective.text,
                        detail: complete
                            ? `Carbon intensity is ${value.toFixed(2)}.`
                            : `Carbon intensity is ${value.toFixed(2)}; max allowed ${maxTarget.toFixed(2)}.`
                    };
                }

                default:
                    return {
                        id: objective.id,
                        complete: false,
                        weight: objective.weight,
                        text: objective.text,
                        detail: `Objective type ${objective.type} is unsupported.`
                    };
            }
        }

        evaluate(state, metrics) {
            const objectiveResults = this.objectives.map((objective) => this.evaluateObjective(objective, state, metrics));
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

        updateObjectiveUI(objectiveResults) {
            objectiveResults.forEach((result) => {
                const item = document.getElementById(`obj-${result.id}`);
                if (!item) {
                    return;
                }

                item.classList.toggle('complete', result.complete);
                const stateText = item.querySelector('.objective-state-text');
                if (stateText) {
                    stateText.textContent = result.complete ? 'Complete' : 'Incomplete';
                }
            });
        }
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { Challenge };
    }

    root.Challenge = Challenge;
})(typeof window !== 'undefined' ? window : globalThis);
