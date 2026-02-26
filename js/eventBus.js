(function (root) {
    class EventBus {
        constructor() {
            this.listeners = new Map();
        }

        on(eventName, handler) {
            if (!this.listeners.has(eventName)) {
                this.listeners.set(eventName, new Set());
            }
            const handlers = this.listeners.get(eventName);
            handlers.add(handler);
            return () => this.off(eventName, handler);
        }

        off(eventName, handler) {
            const handlers = this.listeners.get(eventName);
            if (!handlers) {
                return;
            }
            handlers.delete(handler);
            if (handlers.size === 0) {
                this.listeners.delete(eventName);
            }
        }

        emit(eventName, payload) {
            const handlers = this.listeners.get(eventName);
            if (!handlers) {
                return;
            }
            handlers.forEach((handler) => {
                try {
                    handler(payload);
                } catch (error) {
                    if (typeof console !== 'undefined' && console.error) {
                        console.error('Event handler failed:', eventName, error);
                    }
                }
            });
        }
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { EventBus };
    }

    root.EventBus = EventBus;
})(typeof window !== 'undefined' ? window : globalThis);
