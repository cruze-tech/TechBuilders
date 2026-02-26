const fs = require('fs');
const path = require('path');

function read(filePath) {
    return fs.readFileSync(path.resolve(filePath), 'utf8');
}

function assertRule(failures, label, predicate) {
    try {
        if (predicate()) {
            console.log(`PASS ${label}`);
            return;
        }
        failures.push(`FAIL ${label}`);
        console.error(`FAIL ${label}`);
    } catch (error) {
        failures.push(`FAIL ${label}: ${error.message}`);
        console.error(`FAIL ${label}: ${error.message}`);
    }
}

const failures = [];

const indexHtml = read('index.html');
const stylesCss = read('styles.css');
const appJs = read('js/app.js');
const swJs = read('sw.js');
const manifest = read('manifest.webmanifest');
const challenges = JSON.parse(read('data/challenges.json'));

assertRule(failures, 'Manifest link present', () => /rel="manifest"/.test(indexHtml));
assertRule(failures, 'Theme color meta present', () => /name="theme-color"/.test(indexHtml));
assertRule(failures, 'About screen exists', () => /id="aboutScreen"/.test(indexHtml));
assertRule(failures, 'Map screen exists', () => /id="mapScreen"/.test(indexHtml));
assertRule(failures, 'Results screen exists', () => /id="resultsScreen"/.test(indexHtml));
assertRule(failures, 'Progress screen exists', () => /id="progressScreen"/.test(indexHtml));
assertRule(failures, 'Cruze links are present', () => /cruze-tech\.com/.test(indexHtml) || /cruze-tech\.com/.test(read('js/aboutPage.js')));

assertRule(failures, 'Service worker registration present', () => /serviceWorker\.register\('sw\.js'\)/.test(appJs));
assertRule(failures, 'Service worker caches new modules', () => /router\.js/.test(swJs) && /progressionEngine\.js/.test(swJs) && /telemetry\.js/.test(swJs));
assertRule(failures, 'Responsive media queries present', () => /@media \(max-width: 1120px\)/.test(stylesCss) && /@media \(max-width: 760px\)/.test(stylesCss));
assertRule(failures, 'Reduced motion support present', () => /prefers-reduced-motion: reduce/.test(stylesCss));
assertRule(failures, 'Focus-visible style present', () => /:focus-visible/.test(stylesCss));
assertRule(failures, 'Manifest includes icons', () => /"icons"\s*:\s*\[/.test(manifest));

assertRule(failures, 'Challenge schema version >= 2', () => Number(challenges.schemaVersion) >= 2);
assertRule(failures, 'Exactly 10 experiments configured', () => Array.isArray(challenges.challenges) && challenges.challenges.length === 10);
assertRule(failures, 'All tiers represented', () => {
    const tiers = new Set(challenges.challenges.map((challenge) => challenge.tier));
    return tiers.has(1) && tiers.has(2) && tiers.has(3);
});

if (failures.length > 0) {
    console.error('\nQuality gate failed:');
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
}

console.log('Quality gate passed.');
