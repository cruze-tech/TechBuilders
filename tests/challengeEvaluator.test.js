const assert = require('assert');
require('../js/constants.js');
const { Challenge } = require('../js/challenge.js');
const SystemEvaluator = require('../js/systemEvaluator.js');

function runChallengeEvaluatorTests() {
    const definition = {
        id: 'demo',
        title: 'Demo Challenge',
        description: 'Demo',
        tier: 1,
        difficulty: 'starter',
        estimatedMinutes: 10,
        learningGoals: ['Goal A', 'Goal B'],
        briefing: { story: 'Story', task: 'Task', hints: ['Hint'] },
        debrief: { success: 'Success', improve: 'Improve' },
        scenario: {
            weather: 'Clear',
            demandSpike: 1,
            outageWindow: { enabled: false, severity: 0 },
            timeOfDay: 'day',
            throughputTarget: 80,
            reserveTarget: 0.3,
            efficiencyTarget: 0.4,
            carbonTarget: 0.5,
            criticalLoadTarget: 0.8,
            budgetCap: 700
        },
        unlockRewards: { badge: 'Demo', unlocks: [] },
        passScore: 60,
        objectives: [
            { id: 'o1', type: 'positive_energy', text: 'Energy positive', weight: 25, threshold: 0 },
            { id: 'o2', type: 'throughput_target', text: 'Throughput', weight: 25, target: 80 },
            { id: 'o3', type: 'efficiency_ratio', text: 'Efficiency', weight: 25, target: 0.4 },
            { id: 'o4', type: 'budget_cap', text: 'Budget', weight: 25, maxTarget: 700 }
        ]
    };

    const challenge = new Challenge(definition);

    const state = {
        budget: 620,
        components: [
            {
                id: 'c-1',
                type: 'solarPanel',
                energy: 120,
                throughput: 0,
                reserve: 0,
                carbonIntensity: 0.02,
                roles: ['producer', 'clean'],
                x: 0,
                y: 0,
                width: 120,
                height: 80
            },
            {
                id: 'c-2',
                type: 'wire',
                energy: 0,
                throughput: 0,
                reserve: 0,
                carbonIntensity: 0,
                roles: ['wire'],
                x: 110,
                y: 20,
                width: 110,
                height: 22
            },
            {
                id: 'c-3',
                type: 'evCharger',
                energy: -95,
                throughput: 90,
                reserve: 0,
                carbonIntensity: 0,
                roles: ['critical'],
                x: 200,
                y: 0,
                width: 95,
                height: 85
            }
        ]
    };

    const metrics = SystemEvaluator.evaluateSystem(state.components, definition.scenario);
    const result = challenge.evaluate(state, metrics);

    assert.ok(Array.isArray(result.objectiveResults), 'objective results should be produced');
    assert.strictEqual(result.objectiveResults.length, 4, 'all objectives should be evaluated');
    assert.ok(result.score >= 0 && result.score <= 100, 'score should be normalized');
}

module.exports = { runChallengeEvaluatorTests };
