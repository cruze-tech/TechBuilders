(function (root) {
    function getComponentBounds(component) {
        return {
            left: component.x,
            right: component.x + component.width,
            top: component.y,
            bottom: component.y + component.height
        };
    }

    function intersects(boundsA, boundsB, margin) {
        const m = typeof margin === 'number' ? margin : 8;
        return !(
            boundsA.right + m < boundsB.left ||
            boundsB.right + m < boundsA.left ||
            boundsA.bottom + m < boundsB.top ||
            boundsB.bottom + m < boundsA.top
        );
    }

    function canWireConnect(componentA, componentB) {
        return componentA.type === 'wire' || componentB.type === 'wire';
    }

    function createEmptyGraph(components) {
        const graph = new Map();
        components.forEach((component) => {
            graph.set(component.id, new Set());
        });
        return graph;
    }

    function buildWireGraph(components, margin) {
        const graph = createEmptyGraph(components);
        let edgeCount = 0;

        for (let i = 0; i < components.length; i += 1) {
            const a = components[i];
            const boundsA = getComponentBounds(a);
            for (let j = i + 1; j < components.length; j += 1) {
                const b = components[j];
                if (!canWireConnect(a, b)) {
                    continue;
                }

                const boundsB = getComponentBounds(b);
                if (!intersects(boundsA, boundsB, margin)) {
                    continue;
                }

                graph.get(a.id).add(b.id);
                graph.get(b.id).add(a.id);
                edgeCount += 1;
            }
        }

        return { graph, edgeCount };
    }

    function findConnectedGroups(graph) {
        const visited = new Set();
        const groups = [];

        graph.forEach((_, startId) => {
            if (visited.has(startId)) {
                return;
            }

            const queue = [startId];
            const group = [];
            visited.add(startId);

            while (queue.length > 0) {
                const current = queue.shift();
                group.push(current);

                const neighbors = graph.get(current) || new Set();
                neighbors.forEach((neighbor) => {
                    if (visited.has(neighbor)) {
                        return;
                    }
                    visited.add(neighbor);
                    queue.push(neighbor);
                });
            }

            groups.push(group);
        });

        return groups;
    }

    function countByType(components) {
        const counts = {};
        components.forEach((component) => {
            counts[component.type] = (counts[component.type] || 0) + 1;
        });
        return counts;
    }

    function evaluatePowerNetwork(components) {
        const componentList = Array.isArray(components) ? components : [];
        const componentById = new Map(componentList.map((component) => [component.id, component]));
        const { graph, edgeCount } = buildWireGraph(componentList, 10);
        const groups = findConnectedGroups(graph);
        const poweredComponentIds = new Set();

        let rawNetEnergy = 0;
        let usableNetEnergy = 0;

        componentList.forEach((component) => {
            rawNetEnergy += component.energy;
        });

        groups.forEach((groupIds) => {
            const members = groupIds
                .map((id) => componentById.get(id))
                .filter(Boolean);

            const hasProducer = members.some((component) => component.energy > 0 && component.type !== 'wire');
            if (!hasProducer) {
                return;
            }

            let groupEnergy = 0;
            members.forEach((component) => {
                poweredComponentIds.add(component.id);
                groupEnergy += component.energy;
            });
            usableNetEnergy += groupEnergy;
        });

        return {
            graph,
            groups,
            edgeCount,
            rawNetEnergy,
            usableNetEnergy,
            poweredComponentIds,
            componentCounts: countByType(componentList)
        };
    }

    const SystemEvaluator = {
        getComponentBounds,
        intersects,
        buildWireGraph,
        findConnectedGroups,
        evaluatePowerNetwork
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = SystemEvaluator;
    }

    root.SystemEvaluator = SystemEvaluator;
})(typeof window !== 'undefined' ? window : globalThis);
