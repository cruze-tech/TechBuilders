const fs = require('fs');
const path = require('path');

function read(filePath) {
    return fs.readFileSync(path.resolve(filePath), 'utf8');
}

function assertRule(rules, label, predicate) {
    try {
        if (predicate()) {
            console.log(`PASS ${label}`);
            return;
        }
        rules.push(`FAIL ${label}`);
        console.error(`FAIL ${label}`);
    } catch (error) {
        rules.push(`FAIL ${label}: ${error.message}`);
        console.error(`FAIL ${label}: ${error.message}`);
    }
}

const failures = [];

const indexHtml = read('index.html');
const stylesCss = read('styles.css');
const appJs = read('js/app.js');
const swJs = read('sw.js');
const manifest = read('manifest.webmanifest');

assertRule(failures, 'Manifest link present', () => /rel="manifest"/.test(indexHtml));
assertRule(failures, 'Theme color meta present', () => /name="theme-color"/.test(indexHtml));
assertRule(failures, 'Feedback region is live', () => /id="feedbackMessages"[^>]*aria-live="polite"/.test(indexHtml));
assertRule(failures, 'Service worker registration present', () => /serviceWorker\.register\('sw\.js'\)/.test(appJs));
assertRule(failures, 'Service worker caches app shell', () => /APP_SHELL_ASSETS/.test(swJs) && /caches\.open/.test(swJs));
assertRule(failures, 'Responsive media queries present', () => /@media \(max-width: 1080px\)/.test(stylesCss) && /@media \(max-width: 760px\)/.test(stylesCss));
assertRule(failures, 'Reduced motion support present', () => /prefers-reduced-motion: reduce/.test(stylesCss));
assertRule(failures, 'Keyboard focus visible style present', () => /:focus-visible/.test(stylesCss));
assertRule(failures, 'Manifest includes icons', () => /"icons"\s*:\s*\[/.test(manifest));

const challengeData = JSON.parse(read('data/challenges.json'));
assertRule(failures, 'Challenge schemaVersion present', () => typeof challengeData.schemaVersion === 'number');
assertRule(failures, 'At least one challenge is configured', () => Array.isArray(challengeData.challenges) && challengeData.challenges.length > 0);

if (failures.length > 0) {
    console.error('\nQuality gate failed with issues:');
    failures.forEach((entry) => console.error(`- ${entry}`));
    process.exit(1);
}

console.log('Quality gate passed.');
