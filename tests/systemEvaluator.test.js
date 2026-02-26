const assert = require('assert');
const SystemEvaluator = require('../js/systemEvaluator.js');
require('../js/constants.js');

function component(id, type, energy, x, y, width, height, extra) {
    return {
        id,
        type,
        energy,
        x,
        y,
        width,
        height,
        roles: extra && extra.roles ? extra.roles : [],
        throughput: extra && extra.throughput ? extra.throughput : 0,
        reserve: extra && extra.reserve ? extra.reserve : 0,
        carbonIntensity: extra && typeof extra.carbonIntensity === 'number' ? extra.carbonIntensity : 0
    };
}

function runSystemEvaluatorTests() {
    const connected = [
        component('solar-1', 'solarPanel', 100, 0, 0, 120, 80, { roles: ['producer', 'clean'], carbonIntensity: 0.02 }),
        component('wire-1', 'wire', 0, 110, 20, 100, 20, { roles: ['wire'] }),
        component('pump-1', 'waterPump', -80, 200, 0, 100, 90, { roles: ['critical'], throughput: 88 })
    ];

    const connectedMetrics = SystemEvaluator.evaluatePowerNetwork(connected);
    assert.strictEqual(connectedMetrics.usableNetEnergy, 20, 'connected network should produce usable net energy');
    assert.strictEqual(connectedMetrics.poweredComponentIds.has('pump-1'), true, 'pump should be powered via wire network');

    const disconnected = [
        component('solar-2', 'solarPanel', 100, 0, 0, 120, 80, { roles: ['producer'] }),
        component('pump-2', 'waterPump', -80, 230, 0, 100, 90, { roles: ['critical'], throughput: 88 })
    ];

    const disconnectedMetrics = SystemEvaluator.evaluatePowerNetwork(disconnected);
    assert.strictEqual(disconnectedMetrics.poweredComponentIds.has('pump-2'), false, 'pump should remain unpowered without wires');

    const scenarioMetrics = SystemEvaluator.evaluateSystem(connected, {
        weather: 'Sunny',
        demandSpike: 1.2,
        outageWindow: { enabled: true, severity: 0.2 },
        timeOfDay: 'day'
    });

    assert.ok(scenarioMetrics.throughputWithScenario > 0, 'scenario throughput should be derived');
    assert.ok(scenarioMetrics.runtimeReserve >= 0, 'runtime reserve should be calculated');
    assert.ok(scenarioMetrics.efficiencyRatio >= 0 && scenarioMetrics.efficiencyRatio <= 1, 'efficiency ratio should be normalized');
    assert.ok(scenarioMetrics.criticalLoadUptime >= 0 && scenarioMetrics.criticalLoadUptime <= 1, 'critical uptime should be normalized');
}

module.exports = { runSystemEvaluatorTests };
