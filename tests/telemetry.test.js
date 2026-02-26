const assert = require('assert');
const { TelemetryTracker } = require('../js/telemetry.js');

function createMockStore() {
    return {
        events: [],
        appendAnalyticsEvent(event) {
            this.events.push(event);
        }
    };
}

function runTelemetryTests() {
    const store = createMockStore();
    const tracker = new TelemetryTracker({ store, schemaVersion: 1, storageKey: 'testTelemetry' });

    tracker.clear();
    const event = tracker.track('session_start', { source: 'test' });

    assert.strictEqual(event.type, 'session_start', 'tracker should preserve event type');
    assert.strictEqual(store.events.length >= 1, true, 'tracker should mirror event into store analytics log');

    const exported = tracker.exportPayload();
    assert.strictEqual(Array.isArray(exported.events), true, 'export payload should include events array');
    assert.strictEqual(exported.totalEvents >= 1, true, 'export payload should include total events');
}

module.exports = { runTelemetryTests };
