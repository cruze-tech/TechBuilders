(function (root) {
    const SAVE_KEY = 'techBuildersSave';
    const SAVE_VERSION = 2;

    function safeNumber(value, fallback) {
        return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
    }

    function normalizeComponentRecord(record) {
        if (!record || typeof record !== 'object') {
            return null;
        }

        if (typeof record.type !== 'string') {
            return null;
        }

        return {
            id: typeof record.id === 'string' ? record.id : null,
            type: record.type,
            x: safeNumber(record.x, 0),
            y: safeNumber(record.y, 0),
            rotation: safeNumber(record.rotation, 0)
        };
    }

    function migrateV1ToV2(data) {
        const components = Array.isArray(data.components) ? data.components : [];
        return {
            version: SAVE_VERSION,
            savedAt: new Date().toISOString(),
            state: {
                budget: safeNumber(data.budget, 500),
                points: safeNumber(data.points, 0),
                bestScore: safeNumber(data.points, 0),
                designVersion: components.length > 0 ? 1 : 0,
                lastScoredVersion: components.length > 0 ? 1 : -1,
                nextComponentId: components.length,
                components: components
                    .map(normalizeComponentRecord)
                    .filter(Boolean)
                    .map((component, index) => ({
                        id: `c-${index + 1}`,
                        type: component.type,
                        x: component.x,
                        y: component.y,
                        rotation: component.rotation
                    }))
            }
        };
    }

    function normalizeV2(data) {
        if (!data || typeof data !== 'object' || typeof data.state !== 'object') {
            return null;
        }

        const rawState = data.state;
        const components = Array.isArray(rawState.components) ? rawState.components : [];
        const normalizedComponents = [];

        components.forEach((component, index) => {
            const normalized = normalizeComponentRecord(component);
            if (!normalized) {
                return;
            }
            normalizedComponents.push({
                id: normalized.id || `c-${index + 1}`,
                type: normalized.type,
                x: normalized.x,
                y: normalized.y,
                rotation: normalized.rotation
            });
        });

        return {
            version: SAVE_VERSION,
            savedAt: typeof data.savedAt === 'string' ? data.savedAt : new Date().toISOString(),
            state: {
                budget: safeNumber(rawState.budget, 500),
                points: safeNumber(rawState.points, 0),
                bestScore: safeNumber(rawState.bestScore, safeNumber(rawState.points, 0)),
                designVersion: Math.max(0, safeNumber(rawState.designVersion, normalizedComponents.length > 0 ? 1 : 0)),
                lastScoredVersion: safeNumber(rawState.lastScoredVersion, -1),
                nextComponentId: Math.max(safeNumber(rawState.nextComponentId, normalizedComponents.length), normalizedComponents.length),
                components: normalizedComponents
            }
        };
    }

    function migrateSaveData(rawData) {
        if (!rawData || typeof rawData !== 'object') {
            return null;
        }

        if (typeof rawData.version === 'number' && rawData.version >= 2) {
            return normalizeV2(rawData);
        }

        return migrateV1ToV2(rawData);
    }

    function createSaveData(state) {
        return {
            version: SAVE_VERSION,
            savedAt: new Date().toISOString(),
            state: {
                budget: safeNumber(state.budget, 500),
                points: safeNumber(state.points, 0),
                bestScore: safeNumber(state.bestScore, safeNumber(state.points, 0)),
                designVersion: Math.max(0, safeNumber(state.designVersion, 0)),
                lastScoredVersion: safeNumber(state.lastScoredVersion, -1),
                nextComponentId: Math.max(0, safeNumber(state.nextComponentId, 0)),
                components: Array.isArray(state.components)
                    ? state.components.map((component) => ({
                          id: typeof component.id === 'string' ? component.id : null,
                          type: component.type,
                          x: safeNumber(component.x, 0),
                          y: safeNumber(component.y, 0),
                          rotation: safeNumber(component.rotation, 0)
                      }))
                    : []
            }
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
