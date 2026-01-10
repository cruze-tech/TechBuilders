class GameState {
    constructor() {
        this.budget = 500;
        this.energy = 0;
        this.points = 0;
        this.placedComponents = [];
        this.isSimulating = false;
        this.selectedComponent = null;
    }

    addComponent(component) {
        if (this.budget >= component.cost) {
            this.budget -= component.cost;
            this.placedComponents.push(component);
            this.updateStats();
            return true;
        }
        return false;
    }

    removeComponent(component) {
        const index = this.placedComponents.indexOf(component);
        if (index > -1) {
            this.budget += component.cost;
            this.placedComponents.splice(index, 1);
            this.updateStats();
        }
    }

    calculateEnergy() {
        this.energy = this.placedComponents.reduce((sum, comp) => sum + comp.energy, 0);
    }

    updateStats() {
        this.calculateEnergy();
        const budgetDisplay = document.getElementById('budgetDisplay');
        const energyDisplay = document.getElementById('energyDisplay');
        const pointsDisplay = document.getElementById('pointsDisplay');
        
        if (budgetDisplay) budgetDisplay.textContent = this.budget;
        if (energyDisplay) energyDisplay.textContent = this.energy;
        if (pointsDisplay) pointsDisplay.textContent = this.points;
    }

    save() {
        const saveData = {
            budget: this.budget,
            points: this.points,
            components: this.placedComponents.map(c => ({
                type: c.type,
                x: c.x,
                y: c.y,
                rotation: c.rotation
            }))
        };
        localStorage.setItem('techBuildersSave', JSON.stringify(saveData));
        addFeedback('✓ Game saved successfully!', 'success');
    }

    load() {
        const saveData = localStorage.getItem('techBuildersSave');
        if (saveData) {
            const data = JSON.parse(saveData);
            this.budget = data.budget;
            this.points = data.points;
            
            this.placedComponents = [];
            canvas.clearCanvas();
            
            data.components.forEach(comp => {
                canvas.placeComponent(comp.type, comp.x, comp.y, false);
                const placed = this.placedComponents[this.placedComponents.length - 1];
                if (placed) {
                    placed.rotation = comp.rotation;
                    canvas.updateComponentTransform(placed);
                }
            });
            
            this.updateStats();
            addFeedback('✓ Game loaded successfully!', 'success');
        } else {
            addFeedback('No saved game found', 'warning');
        }
    }
}
