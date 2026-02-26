(function (root) {
    const DEFAULT_INITIAL_BUDGET = typeof GAME_CONFIG !== 'undefined' && GAME_CONFIG && typeof GAME_CONFIG.initialBudget === 'number'
        ? GAME_CONFIG.initialBudget
        : 900;
    const VALID_OBJECTIVE_TYPES = new Set([
        'positive_energy',
        'component_presence',
        'powered_component',
        'component_count_range',
        'throughput_target',
        'runtime_reserve',
        'redundancy_required',
        'critical_load_uptime',
        'efficiency_ratio',
        'budget_cap',
        'signal_chain_valid',
        'carbon_intensity_target'
    ]);

    const FALLBACK_PAYLOAD = {
        schemaVersion: 2,
        campaignTitle: 'Tech Builders Innovation Sprint',
        challenges: [
            {
                id: 'exp-01',
                title: 'EXP-01: Solar Irrigation Starter',
                tier: 1,
                difficulty: 'starter',
                estimatedMinutes: 12,
                description: 'Power a rural irrigation line with reliable daytime output.',
                learningGoals: ['Balance generation and demand', 'Use wires to power critical loads'],
                briefing: {
                    story: 'A farming cooperative needs a stable irrigation setup.',
                    task: 'Build a compact solar network that keeps the water pump powered.',
                    hints: ['Connect generation to the pump with wires.', 'Protect your budget.']
                },
                debrief: {
                    success: 'Your system stabilized irrigation.',
                    improve: 'Increase throughput while keeping costs efficient.'
                },
                scenario: {
                    weather: 'Sunny',
                    demandSpike: 1,
                    outageWindow: { enabled: false, severity: 0 },
                    timeOfDay: 'day',
                    throughputTarget: 65,
                    budgetCap: 500
                },
                unlockRewards: {
                    badge: 'Field Starter',
                    unlocks: []
                },
                passScore: 70,
                objectives: [
                    { id: 'energy', type: 'positive_energy', text: 'Keep usable net energy above zero', weight: 30, threshold: 0 },
                    { id: 'pump', type: 'powered_component', text: 'Power at least one water pump', weight: 35, componentType: 'waterPump', minCount: 1 },
                    { id: 'throughput', type: 'throughput_target', text: 'Reach throughput target', weight: 20, target: 65 },
                    { id: 'budget', type: 'budget_cap', text: 'Stay under budget cap', weight: 15, maxTarget: 500 }
                ]
            }
        ]
    };

    function num(value, fallback) {
        return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
    }

    function arr(value) {
        return Array.isArray(value) ? value : [];
    }

    function normalizeObjective(raw, index) {
        if (!raw || typeof raw !== 'object') {
            return null;
        }

        if (typeof raw.id !== 'string' || typeof raw.text !== 'string' || typeof raw.type !== 'string') {
            return null;
        }

        if (!VALID_OBJECTIVE_TYPES.has(raw.type)) {
            return null;
        }

        return {
            id: raw.id,
            type: raw.type,
            text: raw.text,
            weight: Math.max(5, num(raw.weight, 10)),
            componentType: typeof raw.componentType === 'string' ? raw.componentType : null,
            minCount: Math.max(1, num(raw.minCount, 1)),
            threshold: num(raw.threshold, 0),
            min: Math.max(0, num(raw.min, 0)),
            max: Math.max(0, num(raw.max, 0)),
            target: Math.max(0, num(raw.target, 0)),
            maxTarget: Math.max(0, num(raw.maxTarget, 0)),
            roles: arr(raw.roles).filter((entry) => typeof entry === 'string'),
            order: index
        };
    }

    function normalizeChallenge(raw) {
        if (!raw || typeof raw !== 'object') {
            return null;
        }

        if (typeof raw.id !== 'string' || typeof raw.title !== 'string' || typeof raw.description !== 'string') {
            return null;
        }

        const objectives = arr(raw.objectives)
            .map(normalizeObjective)
            .filter(Boolean)
            .sort((a, b) => a.order - b.order);

        if (objectives.length < 4) {
            return null;
        }

        const briefing = raw.briefing || {};
        const debrief = raw.debrief || {};
        const scenario = raw.scenario || {};
        const outageWindow = scenario.outageWindow || {};
        const unlockRewards = raw.unlockRewards || {};

        return {
            id: raw.id,
            title: raw.title,
            tier: Math.min(3, Math.max(1, num(raw.tier, 1))),
            difficulty: typeof raw.difficulty === 'string' ? raw.difficulty : 'starter',
            estimatedMinutes: Math.max(5, num(raw.estimatedMinutes, 10)),
            description: raw.description,
            learningGoals: arr(raw.learningGoals).filter((goal) => typeof goal === 'string'),
            briefing: {
                story: typeof briefing.story === 'string' ? briefing.story : raw.description,
                task: typeof briefing.task === 'string' ? briefing.task : 'Complete all objectives.',
                hints: arr(briefing.hints).filter((hint) => typeof hint === 'string')
            },
            debrief: {
                success: typeof debrief.success === 'string' ? debrief.success : 'Great work.',
                improve: typeof debrief.improve === 'string' ? debrief.improve : 'Try another strategy.'
            },
            scenario: {
                weather: typeof scenario.weather === 'string' ? scenario.weather : 'Clear',
                demandSpike: Math.max(0.5, num(scenario.demandSpike, 1)),
                outageWindow: {
                    enabled: Boolean(outageWindow.enabled),
                    severity: Math.min(1, Math.max(0, num(outageWindow.severity, 0)))
                },
                timeOfDay: typeof scenario.timeOfDay === 'string' ? scenario.timeOfDay : 'day',
                throughputTarget: Math.max(0, num(scenario.throughputTarget, 0)),
                reserveTarget: Math.max(0, num(scenario.reserveTarget, 0)),
                efficiencyTarget: Math.max(0, num(scenario.efficiencyTarget, 0)),
                carbonTarget: Math.max(0, num(scenario.carbonTarget, 1)),
                criticalLoadTarget: Math.max(0, num(scenario.criticalLoadTarget, 0)),
                budgetCap: Math.max(100, num(scenario.budgetCap, DEFAULT_INITIAL_BUDGET))
            },
            unlockRewards: {
                badge: typeof unlockRewards.badge === 'string' ? unlockRewards.badge : 'Innovator',
                unlocks: arr(unlockRewards.unlocks).filter((entry) => typeof entry === 'string')
            },
            passScore: Math.min(100, Math.max(40, num(raw.passScore, 70))),
            objectives
        };
    }

    function normalizePayload(raw) {
        if (!raw || typeof raw !== 'object') {
            return null;
        }

        const challenges = arr(raw.challenges)
            .map(normalizeChallenge)
            .filter(Boolean)
            .sort((a, b) => a.tier - b.tier || a.id.localeCompare(b.id));

        if (challenges.length === 0) {
            return null;
        }

        return {
            schemaVersion: Math.max(2, num(raw.schemaVersion, 2)),
            campaignTitle: typeof raw.campaignTitle === 'string' ? raw.campaignTitle : 'Tech Builders Innovation Sprint',
            challenges
        };
    }

    async function fetchPayload(url) {
        if (typeof fetch !== 'function') {
            throw new Error('fetch_unavailable');
        }

        const response = await fetch(url, { cache: 'no-cache' });
        if (!response.ok) {
            throw new Error(`fetch_failed_${response.status}`);
        }

        return response.json();
    }

    async function load(url) {
        const sourceUrl = url || 'data/challenges.json';

        try {
            const raw = await fetchPayload(sourceUrl);
            const normalized = normalizePayload(raw);
            if (!normalized) {
                throw new Error('invalid_challenge_payload');
            }
            return {
                ...normalized,
                source: sourceUrl,
                usingFallback: false
            };
        } catch (error) {
            const normalized = normalizePayload(FALLBACK_PAYLOAD);
            return {
                ...normalized,
                source: 'fallback',
                usingFallback: true,
                error: error.message
            };
        }
    }

    function findById(payload, challengeId) {
        if (!payload || !Array.isArray(payload.challenges)) {
            return null;
        }
        return payload.challenges.find((challenge) => challenge.id === challengeId) || null;
    }

    function groupByTier(payload) {
        const grouped = { 1: [], 2: [], 3: [] };
        if (!payload || !Array.isArray(payload.challenges)) {
            return grouped;
        }

        payload.challenges.forEach((challenge) => {
            if (!grouped[challenge.tier]) {
                grouped[challenge.tier] = [];
            }
            grouped[challenge.tier].push(challenge);
        });
        return grouped;
    }

    const ChallengeRepository = {
        VALID_OBJECTIVE_TYPES,
        FALLBACK_PAYLOAD,
        normalizePayload,
        load,
        findById,
        groupByTier
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = ChallengeRepository;
    }

    root.ChallengeRepository = ChallengeRepository;
})(typeof window !== 'undefined' ? window : globalThis);
