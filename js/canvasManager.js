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
                x: this.svg.viewBox.baseVal.x,
                y: this.svg.viewBox.baseVal.y,
                width: this.svg.viewBox.baseVal.width,
                height: this.svg.viewBox.baseVal.height,
                minWidth: 300,
                maxWidth: 2400
            };

            this._ensureDefs();
            this.setupEventListeners();
            this.store.subscribe(() => this.render());
            this.render();
        }

        _ensureDefs() {
            let defs = this.svg.querySelector('defs');
            if (!defs) {
                defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
                this.svg.insertBefore(defs, this.svg.firstChild);
            }

            // Glow filter for powered components
            if (!defs.querySelector('#glow-powered')) {
                const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
                filter.setAttribute('id', 'glow-powered');
                filter.setAttribute('x', '-30%');
                filter.setAttribute('y', '-30%');
                filter.setAttribute('width', '160%');
                filter.setAttribute('height', '160%');
                const feGaussianBlur = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
                feGaussianBlur.setAttribute('stdDeviation', '3');
                feGaussianBlur.setAttribute('result', 'coloredBlur');
                const feMerge = document.createElementNS('http://www.w3.org/2000/svg', 'feMerge');
                const feMergeNode1 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
                feMergeNode1.setAttribute('in', 'coloredBlur');
                const feMergeNode2 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
                feMergeNode2.setAttribute('in', 'SourceGraphic');
                feMerge.appendChild(feMergeNode1);
                feMerge.appendChild(feMergeNode2);
                filter.appendChild(feGaussianBlur);
                filter.appendChild(feMerge);
                defs.appendChild(filter);
            }

            // Pulse animation for selected
            if (!defs.querySelector('#glow-selected')) {
                const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
                filter.setAttribute('id', 'glow-selected');
                filter.setAttribute('x', '-40%');
                filter.setAttribute('y', '-40%');
                filter.setAttribute('width', '180%');
                filter.setAttribute('height', '180%');
                const feGaussianBlur = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
                feGaussianBlur.setAttribute('stdDeviation', '5');
                feGaussianBlur.setAttribute('result', 'coloredBlur');
                const feMerge = document.createElementNS('http://www.w3.org/2000/svg', 'feMerge');
                const n1 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
                n1.setAttribute('in', 'coloredBlur');
                const n2 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
                n2.setAttribute('in', 'SourceGraphic');
                feMerge.appendChild(n1);
                feMerge.appendChild(n2);
                filter.appendChild(feGaussianBlur);
                filter.appendChild(feMerge);
                defs.appendChild(filter);
            }

            // Gradient for wire connections
            if (!defs.querySelector('#wire-grad')) {
                const grad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
                grad.setAttribute('id', 'wire-grad');
                grad.setAttribute('gradientUnits', 'userSpaceOnUse');
                const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
                stop1.setAttribute('offset', '0%');
                stop1.setAttribute('stop-color', '#37ffaa');
                stop1.setAttribute('stop-opacity', '0.9');
                const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
                stop2.setAttribute('offset', '100%');
                stop2.setAttribute('stop-color', '#59e7ff');
                stop2.setAttribute('stop-opacity', '0.9');
                grad.appendChild(stop1);
                grad.appendChild(stop2);
                defs.appendChild(grad);
            }

            // Gradient for disconnected wire
            if (!defs.querySelector('#wire-grad-off')) {
                const grad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
                grad.setAttribute('id', 'wire-grad-off');
                grad.setAttribute('gradientUnits', 'userSpaceOnUse');
                const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
                stop1.setAttribute('offset', '0%');
                stop1.setAttribute('stop-color', '#888888');
                stop1.setAttribute('stop-opacity', '0.5');
                const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
                stop2.setAttribute('offset', '100%');
                stop2.setAttribute('stop-color', '#aaaaaa');
                stop2.setAttribute('stop-opacity', '0.5');
                grad.appendChild(stop1);
                grad.appendChild(stop2);
                defs.appendChild(grad);
            }
        }

        _getComponentCenter(component) {
            return {
                x: component.x + component.width / 2,
                y: component.y + component.height / 2
            };
        }

        _computeConnections(components, poweredIds) {
            const connections = [];
            const margin = 10;

            for (let i = 0; i < components.length; i++) {
                const a = components[i];
                const boundsA = {
                    left: a.x, right: a.x + a.width,
                    top: a.y, bottom: a.y + a.height
                };

                for (let j = i + 1; j < components.length; j++) {
                    const b = components[j];
                    if (a.type !== 'wire' && b.type !== 'wire') continue;

                    const boundsB = {
                        left: b.x, right: b.x + b.width,
                        top: b.y, bottom: b.y + b.height
                    };

                    const overlaps = !(
                        boundsA.right + margin < boundsB.left ||
                        boundsB.right + margin < boundsA.left ||
                        boundsA.bottom + margin < boundsB.top ||
                        boundsB.bottom + margin < boundsA.top
                    );

                    if (overlaps) {
                        const powered = poweredIds.has(a.id) && poweredIds.has(b.id);
                        connections.push({ from: a, to: b, powered });
                    }
                }
            }
            return connections;
        }

        _renderConnectionLines(components, poweredIds, isSimulating) {
            const connections = this._computeConnections(components, poweredIds);
            const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            group.setAttribute('class', 'connection-lines');

            connections.forEach(({ from, to, powered }) => {
                const fc = this._getComponentCenter(from);
                const tc = this._getComponentCenter(to);

                // Update gradient coordinates to match this specific line
                const gradId = powered ? 'wire-grad' : 'wire-grad-off';
                const grad = this.svg.querySelector(`#${gradId}`);
                if (grad) {
                    grad.setAttribute('x1', fc.x);
                    grad.setAttribute('y1', fc.y);
                    grad.setAttribute('x2', tc.x);
                    grad.setAttribute('y2', tc.y);
                }

                // Outer glow line
                const glowLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                glowLine.setAttribute('x1', fc.x);
                glowLine.setAttribute('y1', fc.y);
                glowLine.setAttribute('x2', tc.x);
                glowLine.setAttribute('y2', tc.y);
                glowLine.setAttribute('stroke', powered ? 'rgba(55,255,170,0.18)' : 'rgba(100,100,100,0.1)');
                glowLine.setAttribute('stroke-width', powered ? '10' : '6');
                glowLine.setAttribute('stroke-linecap', 'round');
                group.appendChild(glowLine);

                // Main connection line
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', fc.x);
                line.setAttribute('y1', fc.y);
                line.setAttribute('x2', tc.x);
                line.setAttribute('y2', tc.y);
                line.setAttribute('stroke', powered ? '#37ffaa' : '#666666');
                line.setAttribute('stroke-width', powered ? '3' : '2');
                line.setAttribute('stroke-linecap', 'round');
                line.setAttribute('stroke-dasharray', powered ? 'none' : '6,4');
                line.setAttribute('opacity', powered ? '0.85' : '0.45');
                if (powered && isSimulating) {
                    line.setAttribute('class', 'connection-active');
                }
                group.appendChild(line);

                // Animated flow dots on powered connections
                if (powered && isSimulating) {
                    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                    dot.setAttribute('r', '4');
                    dot.setAttribute('fill', '#69ffb3');
                    dot.setAttribute('opacity', '0.9');
                    const dist = Math.sqrt(Math.pow(tc.x - fc.x, 2) + Math.pow(tc.y - fc.y, 2));
                    const dur = Math.max(0.6, dist / 200);
                    dot.innerHTML = `
                        <animateMotion dur="${dur}s" repeatCount="indefinite">
                            <mpath href="#path-${from.id}-${to.id}"/>
                        </animateMotion>
                    `;
                    // Define path for motion
                    const motionPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    motionPath.setAttribute('id', `path-${from.id}-${to.id}`);
                    motionPath.setAttribute('d', `M ${fc.x} ${fc.y} L ${tc.x} ${tc.y}`);
                    motionPath.setAttribute('fill', 'none');
                    group.appendChild(motionPath);
                    group.appendChild(dot);
                }

                // Connection node dots at endpoints
                [fc, tc].forEach((point) => {
                    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                    dot.setAttribute('cx', point.x);
                    dot.setAttribute('cy', point.y);
                    dot.setAttribute('r', '4');
                    dot.setAttribute('fill', powered ? '#37ffaa' : '#555555');
                    dot.setAttribute('opacity', powered ? '0.8' : '0.4');
                    group.appendChild(dot);
                });
            });

            return group;
        }

        _renderEmptyState() {
            const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');

            // Central hint text
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', '600');
            text.setAttribute('y', '340');
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('fill', 'rgba(89,231,255,0.25)');
            text.setAttribute('font-size', '18');
            text.setAttribute('font-family', 'Segoe UI, sans-serif');
            text.textContent = '← Add components from the library to begin';
            group.appendChild(text);

            const subText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            subText.setAttribute('x', '600');
            subText.setAttribute('y', '370');
            subText.setAttribute('text-anchor', 'middle');
            subText.setAttribute('fill', 'rgba(89,231,255,0.15)');
            subText.setAttribute('font-size', '14');
            subText.setAttribute('font-family', 'Segoe UI, sans-serif');
            subText.textContent = 'Connect components with Wire Links, then Run Simulation';
            group.appendChild(subText);

            return group;
        }

        setupEventListeners() {
            this.svg.addEventListener('pointerdown', (event) => this.handlePointerDown(event));
            this.svg.addEventListener('pointermove', (event) => this.handlePointerMove(event));
            this.svg.addEventListener('pointerup', (event) => this.handlePointerUp(event));
            this.svg.addEventListener('pointercancel', (event) => this.handlePointerUp(event));
            this.svg.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });

            document.addEventListener('keydown', (event) => {
                const state = this.store.getState();
                if (state.isSimulating) return;

                if ((event.key === 'Delete' || event.key === 'Backspace') && state.selectedComponentId) {
                    const removed = this.store.removeComponent(state.selectedComponentId);
                    if (removed) addFeedback('Component removed.', 'info');
                    event.preventDefault();
                }

                if (event.key.toLowerCase() === 'r' && state.selectedComponentId) {
                    const rotated = this.store.rotateComponent(state.selectedComponentId, 45);
                    if (rotated) addFeedback('Component rotated.', 'info');
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
            return this.store.getState().components.find((c) => c.id === componentId) || null;
        }

        handlePointerDown(event) {
            const state = this.store.getState();
            if (state.isSimulating) return;

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
            if (!component) return;

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
            if (!this.drag.active || this.drag.pointerId !== event.pointerId || state.isSimulating) return;

            if (this.drag.panActive) {
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
            this.store.updateComponentPosition(this.drag.componentId, nextX, nextY, { commitVersion: false });
            this.drag.moved = true;
        }

        handlePointerUp(event) {
            if (!this.drag.active || this.drag.pointerId !== event.pointerId) return;

            if (this.drag.panActive) {
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
                    this.store.updateComponentPosition(component.id, component.x, component.y, { commitVersion: true });
                }
            }

            this.drag.active = false;
            this.drag.pointerId = null;
            this.drag.componentId = null;
            this.drag.moved = false;
        }

        handleWheel(event) {
            event.preventDefault();
            const rect = this.svg.getBoundingClientRect();
            const viewBox = this.svg.viewBox.baseVal;
            const pointerX = (event.clientX - rect.left) * (viewBox.width / rect.width) + viewBox.x;
            const pointerY = (event.clientY - rect.top) * (viewBox.height / rect.height) + viewBox.y;

            const delta = Math.sign(event.deltaY) * 0.08;
            const newWidth = Math.min(Math.max(this.view.width * (1 + delta), this.view.minWidth), this.view.maxWidth);
            const scale = newWidth / this.view.width;

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
            const isPowered = state.metrics && state.metrics.poweredComponentIds
                ? state.metrics.poweredComponentIds.has(component.id)
                : false;
            const isSelected = state.selectedComponentId === component.id;
            const isSimulating = state.isSimulating;
            const isWire = component.type === 'wire';

            const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            group.classList.add('placed-component');
            group.setAttribute('data-id', component.id);

            if (isSelected) group.classList.add('selected');
            if (isSimulating) group.classList.add('simulating');
            if (isPowered) group.classList.add('powered');

            // SVG title tooltip
            const titleEl = document.createElementNS('http://www.w3.org/2000/svg', 'title');
            titleEl.textContent = `${component.name} — ${component.energy >= 0 ? '+' : ''}${component.energy}W${isPowered ? ' ✓ Connected' : ' (not connected)'}`;
            group.appendChild(titleEl);

            // Power status ring (outer glow for powered components)
            if (isPowered && !isWire) {
                const ring = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                ring.setAttribute('width', component.width + 6);
                ring.setAttribute('height', component.height + 6);
                ring.setAttribute('x', -3);
                ring.setAttribute('y', -3);
                ring.setAttribute('rx', '11');
                ring.setAttribute('fill', 'none');
                ring.setAttribute('stroke', '#37ffaa');
                ring.setAttribute('stroke-width', '2');
                ring.setAttribute('opacity', isSimulating ? '1' : '0.55');
                if (isSimulating) {
                    ring.setAttribute('class', 'powered-ring-pulse');
                }
                group.appendChild(ring);
            }

            // Main body rect
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.classList.add('component-shape');
            rect.setAttribute('width', component.width);
            rect.setAttribute('height', component.height);
            rect.setAttribute('fill', component.color);
            rect.setAttribute('rx', '8');

            if (isPowered && !isWire) {
                rect.setAttribute('filter', 'url(#glow-powered)');
                rect.setAttribute('opacity', '0.95');
            } else if (isWire && isPowered) {
                rect.setAttribute('opacity', '0.85');
            } else {
                rect.setAttribute('opacity', '0.65');
            }

            if (isSelected) {
                rect.setAttribute('filter', 'url(#glow-selected)');
            }

            group.appendChild(rect);

            // Power status icon (top-right corner)
            if (!isWire) {
                const statusCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                statusCircle.setAttribute('cx', component.width - 8);
                statusCircle.setAttribute('cy', 8);
                statusCircle.setAttribute('r', '5');
                statusCircle.setAttribute('fill', isPowered ? '#37ffaa' : '#ff6b6b');
                statusCircle.setAttribute('opacity', '0.9');
                group.appendChild(statusCircle);

                // Checkmark or X inside status circle
                const statusText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                statusText.setAttribute('x', component.width - 8);
                statusText.setAttribute('y', 8);
                statusText.setAttribute('text-anchor', 'middle');
                statusText.setAttribute('dominant-baseline', 'central');
                statusText.setAttribute('fill', '#0a1a0a');
                statusText.setAttribute('font-size', '6');
                statusText.setAttribute('font-weight', '900');
                statusText.setAttribute('pointer-events', 'none');
                statusText.textContent = isPowered ? '✓' : '✗';
                group.appendChild(statusText);
            }

            // Component name label
            const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            label.setAttribute('x', component.width / 2);
            label.setAttribute('y', isWire ? component.height / 2 : component.height / 2 - 6);
            label.setAttribute('text-anchor', 'middle');
            label.setAttribute('dominant-baseline', 'middle');
            label.setAttribute('fill', '#ffffff');
            label.setAttribute('font-size', isWire ? '10' : '13');
            label.setAttribute('font-weight', '700');
            label.setAttribute('pointer-events', 'none');
            label.textContent = isWire ? '⚡ Wire' : component.name;
            group.appendChild(label);

            // Energy value label (below name, not on wires)
            if (!isWire) {
                const energyLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                energyLabel.setAttribute('x', component.width / 2);
                energyLabel.setAttribute('y', component.height / 2 + 10);
                energyLabel.setAttribute('text-anchor', 'middle');
                energyLabel.setAttribute('dominant-baseline', 'middle');
                energyLabel.setAttribute('fill', component.energy >= 0 ? '#a4ffd3' : '#ffb6b6');
                energyLabel.setAttribute('font-size', '11');
                energyLabel.setAttribute('pointer-events', 'none');
                energyLabel.textContent = component.energy === 0 ? '0W' : `${component.energy > 0 ? '+' : ''}${component.energy}W`;
                group.appendChild(energyLabel);
            }

            const transform = `translate(${component.x}, ${component.y}) rotate(${component.rotation}, ${component.width / 2}, ${component.height / 2})`;
            group.setAttribute('transform', transform);

            return group;
        }

        render() {
            const state = this.store.getState();
            this.clearCanvas();
            this._ensureDefs();

            if (state.components.length === 0) {
                this.svg.appendChild(this._renderEmptyState());
                return;
            }

            const poweredIds = state.metrics && state.metrics.poweredComponentIds
                ? state.metrics.poweredComponentIds
                : new Set();

            // Draw connection lines FIRST (behind components)
            const connectionLayer = this._renderConnectionLines(state.components, poweredIds, state.isSimulating);
            this.svg.appendChild(connectionLayer);

            // Draw components on top
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