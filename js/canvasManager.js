class CanvasManager {
    constructor(svgElement) {
        this.svg = svgElement;
        this.draggedElement = null;
        this.dragOffset = {x: 0, y: 0};
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.svg.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.svg.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.svg.addEventListener('mouseup', this.handleMouseUp.bind(this));
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Delete' && gameState.selectedComponent && !gameState.isSimulating) {
                this.removeComponent(gameState.selectedComponent);
            }
            if (e.key === 'r' && gameState.selectedComponent && !gameState.isSimulating) {
                this.rotateComponent(gameState.selectedComponent, 45);
            }
        });
    }

    getSVGPoint(event) {
        const rect = this.svg.getBoundingClientRect();
        const viewBox = this.svg.viewBox.baseVal;
        const scaleX = viewBox.width / rect.width;
        const scaleY = viewBox.height / rect.height;
        
        return {
            x: (event.clientX - rect.left) * scaleX,
            y: (event.clientY - rect.top) * scaleY
        };
    }

    handleMouseDown(e) {
        if (gameState.isSimulating) return;
        
        const target = e.target.closest('.placed-component');
        if (target) {
            this.draggedElement = target;
            const point = this.getSVGPoint(e);
            const comp = gameState.placedComponents.find(c => c.element === target);
            if (comp) {
                this.dragOffset.x = point.x - comp.x;
                this.dragOffset.y = point.y - comp.y;
                this.selectComponent(comp);
            }
            e.preventDefault();
        }
    }

    handleMouseMove(e) {
        if (this.draggedElement && !gameState.isSimulating) {
            const point = this.getSVGPoint(e);
            const comp = gameState.placedComponents.find(c => c.element === this.draggedElement);
            if (comp) {
                comp.x = point.x - this.dragOffset.x;
                comp.y = point.y - this.dragOffset.y;
                this.updateComponentTransform(comp);
            }
        }
    }

    handleMouseUp(e) {
        this.draggedElement = null;
    }

    selectComponent(comp) {
        if (gameState.selectedComponent && gameState.selectedComponent.element) {
            gameState.selectedComponent.element.classList.remove('selected');
        }
        gameState.selectedComponent = comp;
        comp.element.classList.add('selected');
    }

    placeComponent(type, x, y, deductCost = true) {
        const template = COMPONENTS[type];
        if (!template) return null;

        const component = {
            type: type,
            ...template,
            id: Date.now(),
            x: x - template.width / 2,
            y: y - template.height / 2,
            rotation: 0,
            element: null
        };

        if (deductCost && !gameState.addComponent(component)) {
            addFeedback('❌ Insufficient budget!', 'error');
            return null;
        }

        if (!deductCost) {
            gameState.placedComponents.push(component);
        }

        this.renderComponent(component);
        addFeedback(`✓ ${component.name} placed`, 'success');
        return component;
    }

    renderComponent(component) {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.classList.add('placed-component');
        g.setAttribute('data-id', component.id);

        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('width', component.width);
        rect.setAttribute('height', component.height);
        rect.setAttribute('fill', component.color);
        rect.setAttribute('stroke', '#00ffff');
        rect.setAttribute('stroke-width', '2');
        rect.setAttribute('rx', '8');
        rect.setAttribute('opacity', '0.85');

        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', component.width / 2);
        text.setAttribute('y', component.height / 2);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'middle');
        text.setAttribute('fill', '#ffffff');
        text.setAttribute('font-size', '14');
        text.setAttribute('font-weight', 'bold');
        text.setAttribute('pointer-events', 'none');
        text.textContent = component.name;

        const energyText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        energyText.setAttribute('x', component.width / 2);
        energyText.setAttribute('y', component.height / 2 + 18);
        energyText.setAttribute('text-anchor', 'middle');
        energyText.setAttribute('fill', component.energy > 0 ? '#00ff88' : '#ff6666');
        energyText.setAttribute('font-size', '11');
        energyText.setAttribute('pointer-events', 'none');
        energyText.textContent = component.energy !== 0 ? `${component.energy > 0 ? '+' : ''}${component.energy}W` : '';

        g.appendChild(rect);
        g.appendChild(text);
        g.appendChild(energyText);

        component.element = g;
        this.updateComponentTransform(component);
        this.svg.appendChild(g);
    }

    updateComponentTransform(component) {
        if (!component.element) return;
        const transform = `translate(${component.x}, ${component.y}) rotate(${component.rotation}, ${component.width/2}, ${component.height/2})`;
        component.element.setAttribute('transform', transform);
    }

    rotateComponent(component, angle) {
        component.rotation = (component.rotation + angle) % 360;
        this.updateComponentTransform(component);
        addFeedback(`Rotated ${component.name}`, 'info');
    }

    removeComponent(component) {
        if (component.element) {
            component.element.remove();
        }
        gameState.removeComponent(component);
        if (gameState.selectedComponent === component) {
            gameState.selectedComponent = null;
        }
        addFeedback(`Removed ${component.name}`, 'info');
    }

    clearCanvas() {
        while (this.svg.firstChild) {
            this.svg.removeChild(this.svg.firstChild);
        }
    }
}
