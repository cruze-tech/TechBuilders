// Global variables initialized after DOM loads
let gameState;
let canvas;
let simulation;
let currentChallenge;

function initializeComponentLibrary() {
    const library = document.getElementById('componentLibrary');
    if (!library) return;
    
    library.innerHTML = '';

    Object.keys(COMPONENTS).forEach(key => {
        const comp = COMPONENTS[key];
        const item = document.createElement('div');
        item.className = 'component-item';
        item.innerHTML = `
            <div class="component-icon">⚙️</div>
            <div class="component-name">${comp.name}</div>
            <div class="component-cost">💰 ${comp.cost}</div>
        `;
        
        item.addEventListener('click', () => {
            const centerX = 500;
            const centerY = 350;
            canvas.placeComponent(key, centerX, centerY);
        });
        
        library.appendChild(item);
    });
}

function initializeGame() {
    gameState = new GameState();
    canvas = new CanvasManager(document.getElementById('buildCanvas'));
    simulation = new SimulationEngine();

    currentChallenge = new Challenge({
        title: 'Solar Water Pump',
        description: 'Design a solar-powered water pumping system for rural communities.',
        objectives: [
            {id: 'energy', text: 'Generate positive net energy'},
            {id: 'solar', text: 'Use at least one solar panel'},
            {id: 'pump', text: 'Include a water pump'},
            {id: 'efficient', text: 'Keep design efficient (2-6 components)'}
        ]
    });

    initializeComponentLibrary();
    currentChallenge.render();
    gameState.updateStats();

    // Setup event listeners
    const runSimBtn = document.getElementById('runSimBtn');
    const stopSimBtn = document.getElementById('stopSimBtn');
    const saveBtn = document.getElementById('saveBtn');
    const loadBtn = document.getElementById('loadBtn');
    const clearBtn = document.getElementById('clearBtn');

    if (runSimBtn) {
        runSimBtn.addEventListener('click', () => {
            simulation.start();
        });
    }

    if (stopSimBtn) {
        stopSimBtn.addEventListener('click', () => {
            simulation.stop();
        });
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            gameState.save();
        });
    }

    if (loadBtn) {
        loadBtn.addEventListener('click', () => {
            gameState.load();
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (confirm('Clear all components? This cannot be undone.')) {
                canvas.clearCanvas();
                gameState.placedComponents = [];
                gameState.budget = 500;
                gameState.points = 0;
                gameState.selectedComponent = null;
                gameState.updateStats();
                currentChallenge.render();
                addFeedback('Canvas cleared', 'info');
            }
        });
    }

    addFeedback('👋 Welcome to Tech Builders!', 'success');
    addFeedback('Click components on the left to place them', 'info');
    addFeedback('Drag to move, press R to rotate, Delete to remove', 'info');
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initializeGame();
});
