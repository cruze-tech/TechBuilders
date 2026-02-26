(function (root) {
    const FALLBACK_CHALLENGES = {
        schemaVersion: 1,
        challenges: [
            {
                id: 'solar-water-pump',
                title: 'Solar Water Pump',
                description: 'Build a pump system powered through a wire network from at least one generator.',
                passScore: 75,
                objectives: [
                    {
                        id: 'positive-energy',
                        type: 'positive_energy',
                        weight: 25,
                        text: 'System has positive usable net energy'
                    },
                    {
                        id: 'solar-required',
                        type: 'component_presence',
                        componentType: 'solarPanel',
                        minCount: 1,
                        weight: 20,
                        text: 'At least one solar panel is installed'
                    },
                    {
                        id: 'pump-powered',
                        type: 'powered_component',
                        componentType: 'waterPump',
                        minCount: 1,
                        weight: 35,
                        text: 'Water pump is powered through wires'
                    },
                    {
                        id: 'efficient-design',
                        type: 'component_count_range',
                        min: 2,
                        max: 8,
                        weight: 20,
                        text: 'Design stays efficient (2 to 8 components)'
                    }
                ]
            }
        ]
    };

    function normalizeNumber(value, fallback) {
        return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
    }

    function normalizeObjective(objective, index) {
        if (!objective || typeof objective !== 'object') {
            return null;
        }

        if (typeof objective.id !== 'string' || typeof objective.type !== 'string' || typeof objective.text !== 'string') {
            return null;
        }

        const normalized = {
            id: objective.id,
            type: objective.type,
            text: objective.text,
            weight: normalizeNumber(objective.weight, 0)
        };

        if (objective.type === 'component_presence' || objective.type === 'powered_component') {
            if (typeof objective.componentType !== 'string') {
                return null;
            }
            normalized.componentType = objective.componentType;
            normalized.minCount = Math.max(1, normalizeNumber(objective.minCount, 1));
        }

        if (objective.type === 'component_count_range') {
            normalized.min = Math.max(0, normalizeNumber(objective.min, 0));
            normalized.max = Math.max(normalized.min, normalizeNumber(objective.max, normalized.min));
        }

        if (objective.type === 'positive_energy') {
            normalized.threshold = normalizeNumber(objective.threshold, 0);
        }

        normalized.order = index;
        return normalized;
    }

    function normalizeChallenge(challenge) {
        if (!challenge || typeof challenge !== 'object') {
            return null;
        }

        if (typeof challenge.id !== 'string' || typeof challenge.title !== 'string' || typeof challenge.description !== 'string') {
            return null;
        }

        if (!Array.isArray(challenge.objectives) || challenge.objectives.length === 0) {
            return null;
        }

        const objectives = challenge.objectives
            .map(normalizeObjective)
            .filter(Boolean)
            .sort((a, b) => a.order - b.order);

        if (objectives.length === 0) {
            return null;
        }

        return {
            id: challenge.id,
            title: challenge.title,
            description: challenge.description,
            passScore: Math.max(1, normalizeNumber(challenge.passScore, 70)),
            objectives
        };
    }

    function normalizePayload(payload) {
        if (!payload || typeof payload !== 'object') {
            return null;
        }

        const challenges = Array.isArray(payload.challenges) ? payload.challenges : [];
        const normalizedChallenges = challenges.map(normalizeChallenge).filter(Boolean);

        if (normalizedChallenges.length === 0) {
            return null;
        }

        return {
            schemaVersion: normalizeNumber(payload.schemaVersion, 1),
            challenges: normalizedChallenges
        };
    }

    async function fetchChallengePayload(url) {
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
            const payload = await fetchChallengePayload(sourceUrl);
            const normalized = normalizePayload(payload);
            if (!normalized) {
                throw new Error('invalid_schema');
            }
            return {
                ...normalized,
                source: sourceUrl,
                usingFallback: false
            };
        } catch (error) {
            const fallback = normalizePayload(FALLBACK_CHALLENGES);
            return {
                ...fallback,
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

    const ChallengeRepository = {
        FALLBACK_CHALLENGES,
        normalizePayload,
        load,
        findById
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = ChallengeRepository;
    }

    root.ChallengeRepository = ChallengeRepository;
})(typeof window !== 'undefined' ? window : globalThis);
