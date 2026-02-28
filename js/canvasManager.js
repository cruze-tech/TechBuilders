(function (root) {
    class CanvasManager {
        constructor(svgElement, store, bus) {
            this.svg = svgElement;
            this.store = store;
            this.bus = bus;
            this.drag = {
                active: false,
                pointerId: null,
                componentId: null,
                offsetX: 0,
                offsetY: 0,
                moved: false
            };
            this.view = {
                // initial viewBox matches markup: 0 0 1200 760
                x: this.svg.viewBox.baseVal.x,
                y: this.svg.viewBox.baseVal.y,
                width: this.svg.viewBox.baseVal.width,
                height: this.svg.viewBox.baseVal.height,
                minWidth: 300,
                maxWidth: 2400
            };

            this.setupEventListeners();
            this.store.subscribe(() => this.render());
            this.render();
        }

        setupEventListeners() {
            this.svg.addEventListener('pointerdown', (event) => this.handlePointerDown(event));
            this.svg.addEventListener('pointermove', (event) => this.handlePointerMove(event));
            this.svg.addEventListener('pointerup', (event) => this.handlePointerUp(event));
            this.svg.addEventListener('pointercancel', (event) => this.handlePointerUp(event));
            this.svg.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });

            document.addEventListener('keydown', (event) => {
                const state = this.store.getState();
                if (state.isSimulating) {
                    return;
                }

                if ((event.key === 'Delete' || event.key === 'Backspace') && state.selectedComponentId) {
                    const removed = this.store.removeComponent(state.selectedComponentId);
                    if (removed) {
                        addFeedback('Component removed.', 'info');
                    }
                    event.preventDefault();
                }

                if (event.key.toLowerCase() === 'r' && state.selectedComponentId) {
                    const rotated = this.store.rotateComponent(state.selectedComponentId, 45);
                    if (rotated) {
                        addFeedback('Component rotated.', 'info');
                    }
                    event.preventDefault();
                }

                if (event.key === 'Escape') {
                    this.store.selectComponent(null);
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

        getComponentById(componentId) {
            return this.store.getState().components.find((component) => component.id === componentId) || null;
        }

        handlePointerDown(event) {
            const state = this.store.getState();
            if (state.isSimulating) {
                return;
            }

            // Support panning with middle-click or shift+drag
            if (event.button === 1 || event.shiftKey) {
                this.drag.active = true;
                this.drag.panActive = true;
                this.drag.pointerId = event.pointerId;
                this.drag.startClientX = event.clientX;
                this.drag.startClientY = event.clientY;
                this.svg.setPointerCapture(event.pointerId);
                event.preventDefault();
                return;
            }

            const target = event.target.closest('.placed-component');
            if (!target) {
                this.store.selectComponent(null);
                return;
            }

            const componentId = target.getAttribute('data-id');
            const component = this.getComponentById(componentId);
            if (!component) {
                return;
            }

            const point = this.getSVGPoint(event);
            this.drag.active = true;
            this.drag.pointerId = event.pointerId;
            this.drag.componentId = component.id;
            this.drag.offsetX = point.x - component.x;
            this.drag.offsetY = point.y - component.y;
            this.drag.moved = false;

            this.svg.setPointerCapture(event.pointerId);
            this.store.selectComponent(component.id);
            event.preventDefault();
        }

        handlePointerMove(event) {
            const state = this.store.getState();
            if (!this.drag.active || this.drag.pointerId !== event.pointerId || state.isSimulating) {
                return;
            }

            if (this.drag.panActive) {
                // pan view by delta in client space
                const dx = event.clientX - this.drag.startClientX;
                const dy = event.clientY - this.drag.startClientY;
                const rect = this.svg.getBoundingClientRect();
                const viewBox = this.svg.viewBox.baseVal;
                const scaleX = viewBox.width / rect.width;
                const scaleY = viewBox.height / rect.height;

                this.view.x -= dx * scaleX;
                this.view.y -= dy * scaleY;
                this.drag.startClientX = event.clientX;
                this.drag.startClientY = event.clientY;
                this.applyView();
                return;
            }

            const point = this.getSVGPoint(event);
            const nextX = point.x - this.drag.offsetX;
            const nextY = point.y - this.drag.offsetY;

            this.store.updateComponentPosition(this.drag.componentId, nextX, nextY, {
                commitVersion: false
            });
            this.drag.moved = true;
        }

        handlePointerUp(event) {
            if (!this.drag.active || this.drag.pointerId !== event.pointerId) {
                return;
            }
            if (this.drag.panActive) {
                // finish panning
                this.drag.panActive = false;
                this.drag.active = false;
                this.drag.pointerId = null;
                this.applyView();
                return;
            }

            const componentId = this.drag.componentId;
            if (this.drag.moved && componentId) {
                const component = this.getComponentById(componentId);
                if (component) {
                    this.store.updateComponentPosition(component.id, component.x, component.y, {
                        commitVersion: true
                    });
                }
            }

            this.drag.active = false;
            this.drag.pointerId = null;
            this.drag.componentId = null;
            this.drag.moved = false;
        }

        handleWheel(event) {
            // zoom centered on pointer
            event.preventDefault();
            const rect = this.svg.getBoundingClientRect();
            const viewBox = this.svg.viewBox.baseVal;
            const pointerX = (event.clientX - rect.left) * (viewBox.width / rect.width) + viewBox.x;
            const pointerY = (event.clientY - rect.top) * (viewBox.height / rect.height) + viewBox.y;

            const delta = Math.sign(event.deltaY) * 0.08;
            const newWidth = Math.min(Math.max(this.view.width * (1 + delta), this.view.minWidth), this.view.maxWidth);
            const scale = newWidth / this.view.width;

            // adjust x/y to zoom around pointer
            this.view.x = pointerX - (pointerX - this.view.x) * scale;
            this.view.y = pointerY - (pointerY - this.view.y) * scale;
            this.view.width = newWidth;
            this.view.height = this.view.width * (this.svg.viewBox.baseVal.height / this.svg.viewBox.baseVal.width);
            this.applyView();
        }

        applyView() {
            const vb = this.svg.viewBox.baseVal;
            vb.x = this.view.x;
            vb.y = this.view.y;
            vb.width = this.view.width;
            vb.height = this.view.height;
        }

        clearCanvas() {
            while (this.svg.firstChild) {
                this.svg.removeChild(this.svg.firstChild);
            }
        }

        renderComponent(component, state) {
            const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            group.classList.add('placed-component');
            group.setAttribute('data-id', component.id);

            // Add native SVG title for tooltip on hover
            const titleEl = document.createElementNS('http://www.w3.org/2000/svg', 'title');
            titleEl.textContent = `${component.name} — ${component.energy >= 0 ? '+' : ''}${component.energy}W`;
            group.appendChild(titleEl);

            if (state.selectedComponentId === component.id) {
                group.classList.add('selected');
            }

            if (state.isSimulating) {
                group.classList.add('simulating');
            }

            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.classList.add('component-shape');
            rect.setAttribute('width', component.width);
            rect.setAttribute('height', component.height);
            rect.setAttribute('fill', component.color);
            rect.setAttribute('rx', '8');

            const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            label.setAttribute('x', component.width / 2);
            label.setAttribute('y', component.height / 2 - 4);
            label.setAttribute('text-anchor', 'middle');
            label.setAttribute('dominant-baseline', 'middle');
            label.setAttribute('fill', '#ffffff');
            label.setAttribute('font-size', '14');
            label.setAttribute('font-weight', '700');
            label.setAttribute('pointer-events', 'none');
            label.textContent = component.name;

            const energy = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            energy.setAttribute('x', component.width / 2);
            energy.setAttribute('y', component.height / 2 + 14);
            energy.setAttribute('text-anchor', 'middle');
            energy.setAttribute('dominant-baseline', 'middle');
            energy.setAttribute('fill', component.energy >= 0 ? '#a4ffd3' : '#ffb6b6');
            energy.setAttribute('font-size', '11');
            energy.setAttribute('pointer-events', 'none');
            energy.textContent = component.energy === 0 ? '0W' : `${component.energy > 0 ? '+' : ''}${component.energy}W`;

            group.appendChild(rect);
            group.appendChild(label);
            group.appendChild(energy);

            const transform = `translate(${component.x}, ${component.y}) rotate(${component.rotation}, ${component.width / 2}, ${component.height / 2})`;
            group.setAttribute('transform', transform);

            return group;
        }

        render() {
            const state = this.store.getState();
            this.clearCanvas();
            state.components.forEach((component) => {
                const node = this.renderComponent(component, state);
                this.svg.appendChild(node);
            });
        }
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { CanvasManager };
    }

    root.CanvasManager = CanvasManager;
})(typeof window !== 'undefined' ? window : globalThis);
