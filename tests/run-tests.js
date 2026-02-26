const { runSystemEvaluatorTests } = require('./systemEvaluator.test.js');
const { runPersistenceTests } = require('./persistence.test.js');

function run(label, testFn) {
    try {
        testFn();
        console.log(`PASS ${label}`);
        return true;
    } catch (error) {
        console.error(`FAIL ${label}`);
        console.error(error.stack || error.message);
        return false;
    }
}

const results = [
    run('SystemEvaluator', runSystemEvaluatorTests),
    run('Persistence', runPersistenceTests)
];

if (results.every(Boolean)) {
    console.log('All tests passed.');
    process.exit(0);
}

process.exit(1);
