const { runSystemEvaluatorTests } = require('./systemEvaluator.test.js');
const { runPersistenceTests } = require('./persistence.test.js');
const { runChallengeRepositoryTests } = require('./challengeRepository.test.js');
const { runChallengeEvaluatorTests } = require('./challengeEvaluator.test.js');
const { runProgressionEngineTests } = require('./progressionEngine.test.js');
const { runTelemetryTests } = require('./telemetry.test.js');
const { runRouterTests } = require('./router.test.js');

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
    run('Persistence', runPersistenceTests),
    run('ChallengeRepository', runChallengeRepositoryTests),
    run('ChallengeEvaluator', runChallengeEvaluatorTests),
    run('ProgressionEngine', runProgressionEngineTests),
    run('Telemetry', runTelemetryTests),
    run('Router', runRouterTests)
];

if (results.every(Boolean)) {
    console.log('All tests passed.');
    process.exit(0);
}

process.exit(1);
