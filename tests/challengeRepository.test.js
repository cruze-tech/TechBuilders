const assert = require('assert');
require('../js/constants.js');
const ChallengeRepository = require('../js/challengeRepository.js');

function runChallengeRepositoryTests() {
    const payload = require('../data/challenges.json');
    const normalized = ChallengeRepository.normalizePayload(payload);

    assert.ok(normalized, 'normalized payload should be returned');
    assert.strictEqual(normalized.challenges.length, 10, 'should normalize all 10 experiments');

    const tiers = new Set(normalized.challenges.map((challenge) => challenge.tier));
    assert.ok(tiers.has(1) && tiers.has(2) && tiers.has(3), 'all three tiers should be present');

    const advanced = normalized.challenges.find((challenge) => challenge.id === 'exp-10');
    assert.ok(advanced, 'final challenge should exist');
    assert.ok(advanced.objectives.some((objective) => objective.type === 'carbon_intensity_target'), 'advanced challenge should include carbon objective');
}

module.exports = { runChallengeRepositoryTests };
