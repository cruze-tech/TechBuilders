(function (root) {
    class SimulationEngine {
        constructor(store) {
            this.store = store;
            this.challenge = null;
            this.running = false;
            this.timerId = null;
            this.lastResult = null;
        }

        setChallenge(challenge) {
            this.challenge = challenge;
        }

        start(options) {
            const opts = options || {};
            const duration = typeof opts.durationMs === 'number' ? opts.durationMs : GAME_CONFIG.defaultSimulationDurationMs;
            const onComplete = typeof opts.onComplete === 'function' ? opts.onComplete : null;

            if (!this.challenge) {
                addFeedback('Select an experiment before running simulation.', 'warning');
                return false;
            }

            const state = this.store.getState();
            if (this.running || state.isSimulating) {
                return false;
            }

            if (state.components.length === 0) {
                addFeedback('Place at least one component before simulation.', 'error');
                return false;
            }

            this.running = true;
            this.store.setSimulating(true);
            addFeedback('Simulation running. Testing system resilience...', 'info');

            this.timerId = setTimeout(() => {
                this.timerId = null;
                this.finishRun(onComplete);
            }, Math.max(1200, duration));

            return true;
        }

        finishRun(onComplete) {
            if (!this.running) {
                return;
            }

            this.running = false;
            this.store.setSimulating(false);
            const result = this.evaluate(true);
            if (onComplete) {
                onComplete(result);
            }
        }

        stop(manual) {
            if (this.timerId) {
                clearTimeout(this.timerId);
                this.timerId = null;
            }

            if (!this.running && !this.store.getState().isSimulating) {
                return;
            }

            this.running = false;
            this.store.setSimulating(false);

            if (manual !== false) {
                addFeedback('Simulation stopped before scoring.', 'warning');
            }
        }

        evaluate(commitScore) {
            if (!this.challenge) {
                return null;
            }

            const state = this.store.getState();
            const metrics = SystemEvaluator.evaluateSystem(state.components, this.challenge.scenario);
            const result = this.challenge.evaluate(state, metrics);

            this.challenge.updateObjectiveUI(result.objectiveResults);
            this.store.setObjectiveResults(result.objectiveResults);

            if (!commitScore) {
                this.lastResult = result;
                return result;
            }

            this.store.recordSimulationRun(result.passed);
            result.feedback.forEach((entry) => {
                addFeedback(entry.message, entry.type);
            });

            const scoreApplication = this.store.applySimulationScore(result.score, state.designVersion);
            if (scoreApplication.alreadyScored) {
                addFeedback('Unchanged build detected. Improve design to raise mastery.', 'warning');
            } else {
                addFeedback(`Simulation score recorded: ${scoreApplication.score}/100.`, 'success');
            }

            this.lastResult = {
                ...result,
                metrics,
                scoreApplication
            };

            return this.lastResult;
        }

        previewObjectives() {
            return this.evaluate(false);
        }
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { SimulationEngine };
    }

    root.SimulationEngine = SimulationEngine;
})(typeof window !== 'undefined' ? window : globalThis);
