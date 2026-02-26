const assert = require('assert');
const SystemEvaluator = require('../js/systemEvaluator.js');

function component(id, type, energy, x, y, width, height) {
    return {
        id,
        type,
        energy,
        x,
        y,
        width,
        height
    };
}

function runSystemEvaluatorTests() {
    const connected = [
        component('solar-1', 'solarPanel', 100, 0, 0, 120, 80),
        component('wire-1', 'wire', 0, 110, 20, 100, 20),
        component('pump-1', 'waterPump', -80, 200, 0, 100, 90)
    ];

    const connectedMetrics = SystemEvaluator.evaluatePowerNetwork(connected);
    assert.strictEqual(connectedMetrics.usableNetEnergy, 20, 'connected network should produce usable net energy');
    assert.strictEqual(connectedMetrics.poweredComponentIds.has('pump-1'), true, 'pump should be powered via wire network');

    const disconnected = [
        component('solar-2', 'solarPanel', 100, 0, 0, 120, 80),
        component('pump-2', 'waterPump', -80, 210, 0, 100, 90)
    ];

    const disconnectedMetrics = SystemEvaluator.evaluatePowerNetwork(disconnected);
    assert.strictEqual(disconnectedMetrics.poweredComponentIds.has('pump-2'), false, 'pump should remain unpowered without wires');
    assert.strictEqual(disconnectedMetrics.usableNetEnergy, 100, 'only producer group should count as usable energy');

    const chain = [
        component('solar-3', 'solarPanel', 100, 0, 0, 120, 80),
        component('wire-2', 'wire', 0, 100, 10, 100, 20),
        component('wire-3', 'wire', 0, 190, 10, 100, 20),
        component('motor-1', 'motor', -50, 280, 0, 80, 80)
    ];

    const chainMetrics = SystemEvaluator.evaluatePowerNetwork(chain);
    assert.strictEqual(chainMetrics.poweredComponentIds.has('motor-1'), true, 'wire chain should power distant consumer');
    assert.strictEqual(chainMetrics.usableNetEnergy, 50, 'chain network usable energy should include connected consumer load');
}

module.exports = { runSystemEvaluatorTests };
