# Tech Builders: Innovation Sprint

Tech Builders is a launch-ready educational engineering game for ages 12-18. Players progress through 10 experiments across energy, water, health, transport, and resilience systems.

## Core Experience

- 10 campaign experiments with tiered unlock progression
- Route-driven UI flow: splash, mode, map, briefing, lab, results, progress, about
- Expanded objective engine with advanced scenario metrics
- Rich glassmorphism UI, motion, and responsive mobile layout
- About Tech Builders panel with Cruze Tech links and developer message
- Local pilot analytics with export/clear controls
- PWA-ready offline behavior and install prompt

## Key Architecture

- `js/router.js`: deterministic screen navigation and back behavior
- `js/progressionEngine.js`: stars, unlocks, tier progress, campaign summaries
- `js/telemetry.js`: local event tracking and JSON export
- `js/aboutPage.js`: about content rendering and developer message
- `js/challengeRepository.js`: schema-aligned challenge parsing
- `js/challenge.js`: objective evaluation engine
- `js/systemEvaluator.js`: power + scenario-derived metrics
- `js/gameState.js`: build, campaign, analytics, and save/load state

## Data Model

`data/challenges.json` now contains 10 experiments with:

- `tier`, `difficulty`, `estimatedMinutes`
- `learningGoals`, `briefing`, `debrief`
- `scenario` modifiers (`weather`, `demandSpike`, `outageWindow`, `timeOfDay`, etc.)
- `unlockRewards`
- expanded objective types

## Objective Types

- `positive_energy`
- `component_presence`
- `powered_component`
- `component_count_range`
- `throughput_target`
- `runtime_reserve`
- `redundancy_required`
- `critical_load_uptime`
- `efficiency_ratio`
- `budget_cap`
- `signal_chain_valid`
- `carbon_intensity_target`

## Running Locally

Use a local static server for full PWA behavior:

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080`.

## Tests

Run all tests:

```bash
node tests/run-tests.js
```

Run quality gate:

```bash
node scripts/quality-gate.js
```

## Cruze Tech

- https://cruze-tech.com
- https://games.cruze-tech.com

## License

Educational use only.
