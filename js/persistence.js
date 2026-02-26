(function (root) {
    const SAVE_KEY = 'techBuildersSave';
    const SAVE_VERSION = 3;

    function safeNumber(value, fallback) {
        return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
    }

    function safeArray(value) {
        return Array.isArray(value) ? value : [];
    }

    function normalizeComponent(component, index) {
        if (!component || typeof component !== 'object' || typeof component.type !== 'string') {
            return null;
        }

        return {
            id: typeof component.id === 'string' ? component.id : `c-${index + 1}`,
            type: component.type,
            x: safeNumber(component.x, 0),
            y: safeNumber(component.y, 0),
            rotation: safeNumber(component.rotation, 0)
        };
    }

    function normalizeCampaign(campaign) {
        const source = campaign && typeof campaign === 'object' ? campaign : {};
        return {
            currentExperimentId: typeof source.currentExperimentId === 'string' ? source.currentExperimentId : null,
            unlockedExperiments: safeArray(source.unlockedExperiments).filter((id) => typeof id === 'string'),
            completedExperiments: source.completedExperiments && typeof source.completedExperiments === 'object' ? source.completedExperiments : {},
            starsByExperiment: source.starsByExperiment && typeof source.starsByExperiment === 'object' ? source.starsByExperiment : {},
            badges: safeArray(source.badges).filter((badge) => typeof badge === 'string'),
            highestTierUnlocked: Math.max(1, safeNumber(source.highestTierUnlocked, 1))
        };
    }

    function normalizeSessionStats(stats) {
        const source = stats && typeof stats === 'object' ? stats : {};
        return {
            runs: Math.max(0, safeNumber(source.runs, 0)),
            passes: Math.max(0, safeNumber(source.passes, 0)),
            fails: Math.max(0, safeNumber(source.fails, 0)),
            hintsUsed: Math.max(0, safeNumber(source.hintsUsed, 0)),
            componentsPlaced: Math.max(0, safeNumber(source.componentsPlaced, 0))
        };
    }

    function normalizeState(sourceState) {
        const state = sourceState && typeof sourceState === 'object' ? sourceState : {};

        return {
            budgetStart: safeNumber(state.budgetStart, safeNumber(state.budget, 500)),
            budget: safeNumber(state.budget, 500),
            points: safeNumber(state.points, 0),
            bestScore: safeNumber(state.bestScore, safeNumber(state.points, 0)),
            designVersion: Math.max(0, safeNumber(state.designVersion, 0)),
            lastScoredVersion: safeNumber(state.lastScoredVersion, -1),
            nextComponentId: Math.max(0, safeNumber(state.nextComponentId, 0)),
            activeChallengeId: typeof state.activeChallengeId === 'string' ? state.activeChallengeId : null,
            components: safeArray(state.components)
                .map(normalizeComponent)
                .filter(Boolean),
            campaign: normalizeCampaign(state.campaign),
            analyticsLog: safeArray(state.analyticsLog)
                .filter((event) => event && typeof event === 'object')
                .map((event) => ({
                    type: typeof event.type === 'string' ? event.type : 'unknown',
                    timestamp: typeof event.timestamp === 'string' ? event.timestamp : new Date().toISOString(),
                    payload: event.payload && typeof event.payload === 'object' ? event.payload : {}
                })),
            sessionStats: normalizeSessionStats(state.sessionStats)
        };
    }

    function migrateV1ToV2(oldData) {
        return {
            version: 2,
            savedAt: new Date().toISOString(),
            state: {
                budgetStart: safeNumber(oldData.budget, 500),
                budget: safeNumber(oldData.budget, 500),
                points: safeNumber(oldData.points, 0),
                bestScore: safeNumber(oldData.points, 0),
                designVersion: 0,
                lastScoredVersion: -1,
                nextComponentId: safeArray(oldData.components).length,
                activeChallengeId: 'exp-01',
                components: safeArray(oldData.components)
                    .map(normalizeComponent)
                    .filter(Boolean),
                campaign: normalizeCampaign({ unlockedExperiments: ['exp-01'] }),
                analyticsLog: [],
                sessionStats: normalizeSessionStats({})
            }
        };
    }

    function migrateV2ToV3(v2Data) {
        return {
            version: SAVE_VERSION,
            savedAt: typeof v2Data.savedAt === 'string' ? v2Data.savedAt : new Date().toISOString(),
            state: normalizeState(v2Data.state)
        };
    }

    function migrateSaveData(rawData) {
        if (!rawData || typeof rawData !== 'object') {
            return null;
        }

        if (rawData.version === 1 || typeof rawData.version !== 'number') {
            return migrateV2ToV3(migrateV1ToV2(rawData));
        }

        if (rawData.version === 2) {
            return migrateV2ToV3(rawData);
        }

        if (rawData.version >= 3) {
            return {
                version: SAVE_VERSION,
                savedAt: typeof rawData.savedAt === 'string' ? rawData.savedAt : new Date().toISOString(),
                state: normalizeState(rawData.state)
            };
        }

        return null;
    }

    function createSaveData(state) {
        return {
            version: SAVE_VERSION,
            savedAt: new Date().toISOString(),
            state: normalizeState(state)
        };
    }

    function parseSaveText(rawText) {
        if (!rawText || typeof rawText !== 'string') {
            return null;
        }
        try {
            return JSON.parse(rawText);
        } catch (error) {
            return null;
        }
    }

    function loadFromLocalStorage(storage, key) {
        const storageKey = key || SAVE_KEY;
        const rawText = storage.getItem(storageKey);
        const parsed = parseSaveText(rawText);
        if (!parsed) {
            return { ok: false, error: 'invalid_or_missing_save' };
        }

        const migrated = migrateSaveData(parsed);
        if (!migrated) {
            return { ok: false, error: 'unsupported_save_format' };
        }

        return { ok: true, data: migrated };
    }

    function saveToLocalStorage(storage, state, key) {
        const storageKey = key || SAVE_KEY;
        const saveData = createSaveData(state);
        storage.setItem(storageKey, JSON.stringify(saveData));
        return saveData;
    }

    const Persistence = {
        SAVE_KEY,
        SAVE_VERSION,
        normalizeState,
        migrateSaveData,
        createSaveData,
        parseSaveText,
        loadFromLocalStorage,
        saveToLocalStorage
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = Persistence;
    }

    root.Persistence = Persistence;
})(typeof window !== 'undefined' ? window : globalThis);
