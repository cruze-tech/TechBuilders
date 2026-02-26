# Tech Builders: The Innovation Hub

Tech Builders is an educational engineering game where learners design a solar-powered water pumping system and validate whether it is truly powered through a wire network.

## What Is New

- Connection-based simulation logic (wires are required for powered systems)
- Objective engine driven by external challenge JSON
- State store + event bus architecture for maintainable scaling
- Save data versioning and migration support
- Responsive UI for desktop and mobile
- Accessibility upgrades (keyboard controls, focus visibility, live feedback, non-color objective states)
- Progressive Web App support (manifest, service worker, install prompt, offline cache)
- Automated tests and CI quality gate

## Project Structure

```
TechBuilders/
├── index.html
├── styles.css
├── manifest.webmanifest
├── sw.js
├── data/
│   ├── challenges.json
│   └── challenges.schema.json
├── assets/icons/
│   ├── icon-192.svg
│   └── icon-512.svg
├── js/
│   ├── app.js
│   ├── constants.js
│   ├── eventBus.js
│   ├── persistence.js
│   ├── systemEvaluator.js
│   ├── challengeRepository.js
│   ├── utils.js
│   ├── gameState.js
│   ├── canvasManager.js
│   ├── challenge.js
│   └── simulationEngine.js
├── tests/
│   ├── run-tests.js
│   ├── persistence.test.js
│   └── systemEvaluator.test.js
├── scripts/
│   └── quality-gate.js
└── .github/workflows/
    └── ci.yml
```

## Gameplay Model

A successful design must satisfy all key objectives:

1. Positive usable net energy
2. At least one solar panel
3. Water pump powered through a wire-connected generation path
4. Efficient component count (2 to 8)

The score is mastery-based:

- The app keeps your best score for a design quality level.
- Re-running the same unchanged design does not farm points.

## Controls

- Click component cards to place parts
- Drag placed components to move
- `R` rotates selected component
- `Delete` removes selected component

## Running Locally

For full PWA behavior (service worker + install), run from a local web server:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

Direct `file://` opening still works for core gameplay, but challenge loading may use built-in fallback definitions.

## Testing and Quality Gates

Run tests:

```bash
node tests/run-tests.js
```

Run quality gate:

```bash
node scripts/quality-gate.js
```

## Scaling Readiness Notes

The app now supports scalable content and architecture foundations:

- Decoupled modules through a store/event bus
- Data-driven challenges via schema-guided JSON
- Versioned persistence for future migrations
- CI guardrails for regressions in core readiness criteria

## License

Educational use only.
