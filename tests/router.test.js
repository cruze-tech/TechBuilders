const assert = require('assert');
const { Router } = require('../js/router.js');

function runRouterTests() {
    const router = new Router('splash');
    const visited = [];
    router.onChange((route) => {
        visited.push(route.name);
    });

    router.navigate('mode');
    router.navigate('map');
    router.navigate('briefing', { challengeId: 'exp-01' });
    router.back('mode');

    assert.strictEqual(router.getCurrent().name, 'map', 'router back should return to previous route');
    assert.strictEqual(visited.includes('briefing'), true, 'router should emit route changes');

    router.replace('lab', { challengeId: 'exp-01' });
    assert.strictEqual(router.getCurrent().name, 'lab', 'router replace should update current route');
}

module.exports = { runRouterTests };
