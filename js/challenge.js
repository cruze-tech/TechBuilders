class Challenge {
    constructor(data) {
        this.title = data.title;
        this.description = data.description;
        this.objectives = data.objectives;
    }

    render() {
        const objectivesList = document.getElementById('objectivesList');
        if (!objectivesList) return;
        
        objectivesList.innerHTML = '';
        
        this.objectives.forEach(obj => {
            const li = document.createElement('li');
            li.className = 'objective-item';
            li.id = `obj-${obj.id}`;
            li.innerHTML = `
                <span class="objective-status"></span>
                <span>${obj.text}</span>
            `;
            objectivesList.appendChild(li);
        });
    }

    evaluate() {
        const results = {
            score: 0,
            objectivesComplete: 0,
            feedback: []
        };

        const netEnergy = gameState.energy;
        if (netEnergy > 0) {
            results.score += 25;
            results.feedback.push({message: '✓ Positive net energy generated!', type: 'success'});
            results.objectivesComplete++;
        } else {
            results.feedback.push({message: '✗ Net energy is negative or zero', type: 'warning'});
        }

        const hasPanel = gameState.placedComponents.some(c => c.type === 'solarPanel');
        const hasPump = gameState.placedComponents.some(c => c.type === 'waterPump');

        if (hasPanel) {
            results.score += 25;
            results.feedback.push({message: '✓ Solar panel installed!', type: 'success'});
            results.objectivesComplete++;
        } else {
            results.feedback.push({message: '✗ Missing solar panel', type: 'warning'});
        }

        if (hasPump) {
            results.score += 25;
            results.feedback.push({message: '✓ Water pump connected!', type: 'success'});
            results.objectivesComplete++;
        } else {
            results.feedback.push({message: '✗ Missing water pump', type: 'warning'});
        }

        const componentCount = gameState.placedComponents.length;
        if (componentCount >= 2 && componentCount <= 6) {
            results.score += 25;
            results.feedback.push({message: '✓ Design is efficiently sized!', type: 'success'});
            results.objectivesComplete++;
        } else {
            results.feedback.push({message: '✗ Design should have 2-6 components', type: 'warning'});
        }

        return results;
    }

    markObjective(id, complete) {
        const element = document.getElementById(`obj-${id}`);
        if (element) {
            const status = element.querySelector('.objective-status');
            if (complete) {
                status.classList.add('complete');
            } else {
                status.classList.remove('complete');
            }
        }
    }
}
