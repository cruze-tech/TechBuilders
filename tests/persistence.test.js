const assert = require('assert');
const Persistence = require('../js/persistence.js');

function createMemoryStorage(seed) {
    const memory = new Map(seed || []);
    return {
        getItem(key) {
            return memory.has(key) ? memory.get(key) : null;
        },
        setItem(key, value) {
            memory.set(key, value);
        }
    };
}

function runPersistenceTests() {
    const v1Save = {
        budget: 420,
        points: 60,
        components: [
            { type: 'solarPanel', x: 100, y: 200, rotation: 0 }
        ]
    };

    const migrated = Persistence.migrateSaveData(v1Save);
    assert.strictEqual(migrated.version, Persistence.SAVE_VERSION, 'v1 save should migrate to current version');
    assert.strictEqual(migrated.state.components.length, 1, 'migrated save should keep components');

    const invalidParsed = Persistence.parseSaveText('{bad json');
    assert.strictEqual(invalidParsed, null, 'invalid JSON should return null');

    const storage = createMemoryStorage();
    const sourceState = {
        budget: 370,
        points: 88,
        bestScore: 88,
        designVersion: 4,
        lastScoredVersion: 4,
        nextComponentId: 2,
        components: [
            { id: 'c-1', type: 'solarPanel', x: 200, y: 220, rotation: 45 }
        ]
    };

    Persistence.saveToLocalStorage(storage, sourceState);
    const loaded = Persistence.loadFromLocalStorage(storage);

    assert.strictEqual(loaded.ok, true, 'saved data should load from storage');
    assert.strictEqual(loaded.data.state.points, 88, 'points should round-trip through storage');
    assert.strictEqual(loaded.data.state.components[0].type, 'solarPanel', 'component type should round-trip');
}

module.exports = { runPersistenceTests };
