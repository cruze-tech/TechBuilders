(function (root) {
    class SimulationEngine {
        constructor(store, challenge) {
            this.store = store;
            this.challenge = challenge;
            this.running = false;
            this.timerId = null;
        }

        start() {
            const state = this.store.getState();
            if (this.running || state.isSimulating) {
                return;
            }

            if (state.components.length === 0) {
                addFeedback('Place at least one component before running a test.', 'error');
                return;
            }

            this.running = true;
            this.store.setSimulating(true);
            addFeedback('Simulation running. Evaluating system integrity...', 'info');

            this.timerId = setTimeout(() => {
                this.timerId = null;
                this.finishRun();
            }, 3000);
        }

        finishRun() {
            if (!this.running) {
                return;
            }

            this.running = false;
            this.store.setSimulating(false);
            this.evaluate(true);
        }

        stop(options) {
            const opts = options || {};
            const manual = opts.manual !== false;

            if (this.timerId) {
                clearTimeout(this.timerId);
                this.timerId = null;
            }

            if (!this.running && !this.store.getState().isSimulating) {
                return;
            }

            this.running = false;
            this.store.setSimulating(false);

            if (manual) {
                addFeedback('Simulation stopped before scoring.', 'warning');
            }
        }

        evaluate(commitScore) {
            const state = this.store.getState();
            const metrics = state.metrics || SystemEvaluator.evaluatePowerNetwork(state.components);
            const result = this.challenge.evaluate(state, metrics);

            this.challenge.updateObjectiveUI(result.objectiveResults);
            this.store.setObjectiveResults(result.objectiveResults);

            if (!commitScore) {
                return result;
            }

            result.feedback.forEach((entry) => {
                addFeedback(entry.message, entry.type);
            });

            const scoreApplication = this.store.applySimulationScore(result.score, state.designVersion);
            if (scoreApplication.alreadyScored) {
                addFeedback('Design unchanged since last scored run. Score was not added again.', 'warning');
            } else {
                addFeedback(`Mastery score updated to ${scoreApplication.points}/100.`, 'success');
            }

            if (result.passed) {
                showSuccessModal(result.score, result.passScore);
            } else {
                addFeedback(`Result: ${result.score}/${result.passScore} required to pass.`, 'info');
            }

            return result;
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
