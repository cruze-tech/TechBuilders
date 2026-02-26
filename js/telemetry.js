(function (root) {
    class TelemetryTracker {
        constructor(options) {
            this.store = options.store;
            this.schemaVersion = options.schemaVersion || 1;
            this.storageKey = options.storageKey || 'techBuildersTelemetry';
            this.events = [];
            this.sequence = 0;
            this.load();
        }

        now() {
            return new Date().toISOString();
        }

        canUseStorage() {
            return typeof localStorage !== 'undefined' && localStorage;
        }

        load() {
            if (!this.canUseStorage()) {
                return;
            }
            try {
                const raw = localStorage.getItem(this.storageKey);
                if (!raw) {
                    return;
                }
                const parsed = JSON.parse(raw);
                if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.events)) {
                    return;
                }
                this.events = parsed.events;
                this.sequence = this.events.length;
            } catch (error) {
                this.events = [];
                this.sequence = 0;
            }
        }

        save() {
            if (!this.canUseStorage()) {
                return;
            }
            const payload = {
                schemaVersion: this.schemaVersion,
                updatedAt: this.now(),
                events: this.events
            };
            localStorage.setItem(this.storageKey, JSON.stringify(payload));
        }

        track(type, payload) {
            const event = {
                id: `evt-${this.sequence + 1}`,
                timestamp: this.now(),
                type,
                payload: payload && typeof payload === 'object' ? payload : {}
            };

            this.sequence += 1;
            this.events.push(event);
            this.save();

            if (this.store && typeof this.store.appendAnalyticsEvent === 'function') {
                this.store.appendAnalyticsEvent(event);
            }

            return event;
        }

        getEvents() {
            return [...this.events];
        }

        exportPayload() {
            return {
                schemaVersion: this.schemaVersion,
                exportedAt: this.now(),
                totalEvents: this.events.length,
                events: this.getEvents()
            };
        }

        exportAsJson() {
            return JSON.stringify(this.exportPayload(), null, 2);
        }

        clear() {
            this.events = [];
            this.sequence = 0;
            this.save();
        }
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { TelemetryTracker };
    }

    root.TelemetryTracker = TelemetryTracker;
})(typeof window !== 'undefined' ? window : globalThis);
