const assert = require('assert');
const { ProgressionEngine } = require('../js/progressionEngine.js');
const payload = require('../data/challenges.json');

function runProgressionEngineTests() {
    const engine = new ProgressionEngine(payload.challenges);
    const firstId = engine.getFirstChallengeId();
    assert.strictEqual(firstId, 'exp-01', 'first challenge should be exp-01');

    const stars = engine.calculateStars(91, 80);
    assert.strictEqual(stars, 2, 'score 91 with pass 80 should earn 2 stars');

    const campaign = {
        unlockedExperiments: ['exp-01'],
        completedExperiments: {
            'exp-01': { passed: true }
        },
        starsByExperiment: { 'exp-01': 2 }
    };

    const unlocks = engine.resolveUnlocks(campaign, 'exp-01', true);
    assert.ok(unlocks.includes('exp-02'), 'passing exp-01 should unlock exp-02');

    const summary = engine.getCampaignSummary({
        completedExperiments: { 'exp-01': { passed: true }, 'exp-02': { passed: true } },
        starsByExperiment: { 'exp-01': 2, 'exp-02': 3 }
    });

    assert.strictEqual(summary.completedExperiments, 2, 'summary should count completed experiments');
    assert.strictEqual(summary.totalStars, 5, 'summary should aggregate stars');
}

module.exports = { runProgressionEngineTests };
