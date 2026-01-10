class SimulationEngine {
    constructor() {
        this.running = false;
        this.animationFrame = null;
    }

    start() {
        if (gameState.placedComponents.length === 0) {
            addFeedback('❌ Please place some components first!', 'error');
            return;
        }

        this.running = true;
        gameState.isSimulating = true;

        gameState.placedComponents.forEach(comp => {
            if (comp.element) {
                comp.element.classList.add('simulating');
            }
        });

        addFeedback('▶️ Simulation running...', 'info');
        document.getElementById('runSimBtn').disabled = true;
        document.getElementById('stopSimBtn').disabled = false;

        setTimeout(() => {
            this.stop();
            this.evaluate();
        }, 3000);
    }

    stop() {
        this.running = false;
        gameState.isSimulating = false;

        gameState.placedComponents.forEach(comp => {
            if (comp.element) {
                comp.element.classList.remove('simulating');
            }
        });

        document.getElementById('runSimBtn').disabled = false;
        document.getElementById('stopSimBtn').disabled = true;
    }

    evaluate() {
        const results = currentChallenge.evaluate();
        
        results.feedback.forEach(fb => {
            addFeedback(fb.message, fb.type);
        });

        const pointsEarned = Math.floor(results.score);
        gameState.points += pointsEarned;
        gameState.updateStats();

        if (results.score >= 70) {
            showSuccessModal(results.score, results.objectivesComplete);
        } else {
            addFeedback(`Score: ${results.score}/100 - Try again!`, 'info');
        }
    }
}
