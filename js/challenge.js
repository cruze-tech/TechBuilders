(function (root) {
    class Challenge {
        constructor(definition) {
            this.id = definition.id;
            this.title = definition.title;
            this.description = definition.description;
            this.objectives = definition.objectives;
            this.passScore = definition.passScore;
        }

        render() {
            const title = document.getElementById('challengeTitle');
            const description = document.getElementById('challengeDesc');
            const objectivesList = document.getElementById('objectivesList');

            if (title) {
                title.textContent = this.title;
            }

            if (description) {
                description.textContent = this.description;
            }

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

        countComponentsOfType(components, componentType) {
            return components.filter((component) => component.type === componentType).length;
        }

        countPoweredComponentsOfType(components, poweredComponentIds, componentType) {
            return components.filter((component) => component.type === componentType && poweredComponentIds.has(component.id)).length;
        }

        evaluateObjective(objective, state, metrics) {
            const components = state.components;
            const counts = metrics.componentCounts;

            switch (objective.type) {
                case 'positive_energy': {
                    const threshold = typeof objective.threshold === 'number' ? objective.threshold : 0;
                    const complete = metrics.usableNetEnergy > threshold;
                    return {
                        id: objective.id,
                        text: objective.text,
                        weight: objective.weight,
                        complete,
                        detail: complete
                            ? `Usable net energy is ${metrics.usableNetEnergy}W.`
                            : `Usable net energy is ${metrics.usableNetEnergy}W; it must be above ${threshold}W.`
                    };
                }

                case 'component_presence': {
                    const actualCount = counts[objective.componentType] || 0;
                    const requiredCount = objective.minCount || 1;
                    const complete = actualCount >= requiredCount;
                    return {
                        id: objective.id,
                        text: objective.text,
                        weight: objective.weight,
                        complete,
                        detail: complete
                            ? `${actualCount} ${objective.componentType} component(s) installed.`
                            : `Need ${requiredCount} ${objective.componentType}; found ${actualCount}.`
                    };
                }

                case 'powered_component': {
                    const requiredCount = objective.minCount || 1;
                    const poweredCount = this.countPoweredComponentsOfType(
                        components,
                        metrics.poweredComponentIds,
                        objective.componentType
                    );
                    const complete = poweredCount >= requiredCount;
                    return {
                        id: objective.id,
                        text: objective.text,
                        weight: objective.weight,
                        complete,
                        detail: complete
                            ? `${objective.componentType} is powered through wire-connected generation.`
                            : `${objective.componentType} is not powered through a wire network yet.`
                    };
                }

                case 'component_count_range': {
                    const componentCount = components.length;
                    const min = objective.min || 0;
                    const max = typeof objective.max === 'number' ? objective.max : componentCount;
                    const complete = componentCount >= min && componentCount <= max;
                    return {
                        id: objective.id,
                        text: objective.text,
                        weight: objective.weight,
                        complete,
                        detail: complete
                            ? `Design uses ${componentCount} components.`
                            : `Design uses ${componentCount} components; target range is ${min} to ${max}.`
                    };
                }

                default:
                    return {
                        id: objective.id,
                        text: objective.text,
                        weight: objective.weight,
                        complete: false,
                        detail: `Objective type ${objective.type} is not supported.`
                    };
            }
        }

        evaluate(state, metrics) {
            const objectiveResults = this.objectives.map((objective) => this.evaluateObjective(objective, state, metrics));
            const score = objectiveResults.reduce((sum, result) => sum + (result.complete ? result.weight : 0), 0);
            const passed = score >= this.passScore;

            return {
                score,
                passScore: this.passScore,
                passed,
                objectiveResults,
                feedback: objectiveResults.map((result) => ({
                    message: `${result.complete ? '✓' : '✗'} ${result.detail}`,
                    type: result.complete ? 'success' : 'warning'
                }))
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
