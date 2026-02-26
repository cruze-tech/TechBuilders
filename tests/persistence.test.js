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
        components: [{ type: 'solarPanel', x: 100, y: 200, rotation: 0 }]
    };

    const migrated = Persistence.migrateSaveData(v1Save);
    assert.strictEqual(migrated.version, Persistence.SAVE_VERSION, 'legacy save should migrate to current version');
    assert.strictEqual(Array.isArray(migrated.state.components), true, 'migrated save should include components array');

    const invalidParsed = Persistence.parseSaveText('{bad json');
    assert.strictEqual(invalidParsed, null, 'invalid JSON should return null');

    const storage = createMemoryStorage();
    const sourceState = {
        budget: 370,
        points: 88,
        bestScore: 90,
        designVersion: 4,
        lastScoredVersion: 4,
        nextComponentId: 2,
        activeChallengeId: 'exp-03',
        campaign: {
            currentExperimentId: 'exp-03',
            unlockedExperiments: ['exp-01', 'exp-02', 'exp-03'],
            completedExperiments: { 'exp-02': { score: 78, passed: true } },
            starsByExperiment: { 'exp-02': 2 },
            badges: ['Water Guardian'],
            highestTierUnlocked: 2
        },
        analyticsLog: [{ type: 'session_start', timestamp: new Date().toISOString(), payload: {} }],
        sessionStats: { runs: 5, passes: 3, fails: 2, hintsUsed: 1, componentsPlaced: 12 },
        components: [{ id: 'c-1', type: 'solarPanel', x: 200, y: 220, rotation: 45 }]
    };

    Persistence.saveToLocalStorage(storage, sourceState, 'customSaveKey');
    const loaded = Persistence.loadFromLocalStorage(storage, 'customSaveKey');

    assert.strictEqual(loaded.ok, true, 'saved data should load from storage');
    assert.strictEqual(loaded.data.state.points, 88, 'points should round-trip through storage');
    assert.strictEqual(loaded.data.state.activeChallengeId, 'exp-03', 'active challenge id should persist');
    assert.strictEqual(loaded.data.state.campaign.unlockedExperiments.length, 3, 'campaign unlocks should persist');
}

module.exports = { runPersistenceTests };
