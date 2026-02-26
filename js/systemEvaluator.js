(function (root) {
    function asNumber(value, fallback) {
        return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
    }

    function getComponentBounds(component) {
        return {
            left: component.x,
            right: component.x + component.width,
            top: component.y,
            bottom: component.y + component.height
        };
    }

    function intersects(boundsA, boundsB, margin) {
        const m = asNumber(margin, 8);
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

    function createGraph(components) {
        const graph = new Map();
        components.forEach((component) => {
            graph.set(component.id, new Set());
        });
        return graph;
    }

    function buildWireGraph(components, margin) {
        const graph = createGraph(components);
        let edgeCount = 0;

        for (let i = 0; i < components.length; i += 1) {
            const componentA = components[i];
            const boundsA = getComponentBounds(componentA);

            for (let j = i + 1; j < components.length; j += 1) {
                const componentB = components[j];
                if (!canWireConnect(componentA, componentB)) {
                    continue;
                }

                const boundsB = getComponentBounds(componentB);
                if (!intersects(boundsA, boundsB, margin)) {
                    continue;
                }

                graph.get(componentA.id).add(componentB.id);
                graph.get(componentB.id).add(componentA.id);
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
                (graph.get(current) || new Set()).forEach((neighbor) => {
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

    function countByRole(components) {
        const counts = {};
        components.forEach((component) => {
            const roles = Array.isArray(component.roles) ? component.roles : [];
            roles.forEach((role) => {
                counts[role] = (counts[role] || 0) + 1;
            });
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
            rawNetEnergy += asNumber(component.energy, 0);
        });

        groups.forEach((groupIds) => {
            const members = groupIds.map((id) => componentById.get(id)).filter(Boolean);
            const hasProducer = members.some((component) => asNumber(component.energy, 0) > 0 && component.type !== 'wire');
            if (!hasProducer) {
                return;
            }

            let groupEnergy = 0;
            members.forEach((member) => {
                groupEnergy += asNumber(member.energy, 0);
                poweredComponentIds.add(member.id);
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
            componentCounts: countByType(componentList),
            roleCounts: countByRole(componentList)
        };
    }

    function getPoweredComponents(components, poweredIds) {
        return components.filter((component) => poweredIds.has(component.id));
    }

    function evaluateScenarioMetrics(components, baseMetrics, scenario) {
        const scenarioModel = scenario || {};
        const poweredComponents = getPoweredComponents(components, baseMetrics.poweredComponentIds);
        const demandSpike = Math.max(0.5, asNumber(scenarioModel.demandSpike, 1));
        const outageSeverity = Math.min(1, Math.max(0, asNumber((scenarioModel.outageWindow || {}).severity, 0)));
        const outageEnabled = Boolean((scenarioModel.outageWindow || {}).enabled);

        let generationOutput = 0;
        let consumerLoad = 0;
        let usefulThroughput = 0;
        let storageReserve = 0;
        let carbonWeightedOutput = 0;

        let producerCount = 0;
        let criticalTotal = 0;
        let criticalPowered = 0;
        let cleanProducerCount = 0;

        poweredComponents.forEach((component) => {
            const energy = asNumber(component.energy, 0);
            const throughput = asNumber(component.throughput, 0);
            const reserve = asNumber(component.reserve, 0);
            const carbon = asNumber(component.carbonIntensity, 0);
            const roles = Array.isArray(component.roles) ? component.roles : [];
            const isProducer = energy > 0 && component.type !== 'wire';
            const isConsumer = energy < 0;
            const isCritical = roles.includes('critical');

            if (isProducer) {
                producerCount += 1;
                generationOutput += energy;
                carbonWeightedOutput += energy * carbon;
                if (roles.includes('clean')) {
                    cleanProducerCount += 1;
                }
            }

            if (isConsumer) {
                consumerLoad += Math.abs(energy) * demandSpike;
            }

            if (throughput > 0) {
                usefulThroughput += throughput;
            }

            if (reserve > 0) {
                storageReserve += reserve;
            }

            if (isCritical) {
                criticalTotal += 1;
                criticalPowered += 1;
            }
        });

        const unpoweredCritical = components.filter((component) => {
            const roles = Array.isArray(component.roles) ? component.roles : [];
            return roles.includes('critical') && !baseMetrics.poweredComponentIds.has(component.id);
        }).length;

        criticalTotal += unpoweredCritical;

        const throughputWithScenario = usefulThroughput * Math.max(0.7, 1 - outageSeverity * 0.25);
        const runtimeReserve = storageReserve === 0
            ? 0
            : storageReserve / Math.max(1, consumerLoad / 120);

        const redundancyCount = producerCount;
        const efficiencyRatio = generationOutput <= 0
            ? 0
            : Math.min(1, throughputWithScenario / Math.max(1, generationOutput));

        const carbonIntensity = generationOutput <= 0
            ? 1
            : carbonWeightedOutput / generationOutput;

        let criticalLoadUptime;
        if (criticalTotal === 0) {
            criticalLoadUptime = 1;
        } else {
            const coverage = criticalPowered / criticalTotal;
            const outagePenalty = outageEnabled ? outageSeverity * (1 - Math.min(1, runtimeReserve)) : 0;
            criticalLoadUptime = Math.max(0, Math.min(1, coverage - outagePenalty));
        }

        return {
            demandSpike,
            outageEnabled,
            outageSeverity,
            generationOutput,
            consumerLoad,
            usefulThroughput,
            throughputWithScenario,
            runtimeReserve,
            redundancyCount,
            efficiencyRatio,
            carbonIntensity,
            criticalLoadUptime,
            producerCount,
            cleanProducerCount
        };
    }

    function evaluateSystem(components, scenario) {
        const componentList = Array.isArray(components) ? components : [];
        const baseMetrics = evaluatePowerNetwork(componentList);
        const scenarioMetrics = evaluateScenarioMetrics(componentList, baseMetrics, scenario);

        return {
            ...baseMetrics,
            ...scenarioMetrics
        };
    }

    const SystemEvaluator = {
        getComponentBounds,
        intersects,
        buildWireGraph,
        findConnectedGroups,
        evaluatePowerNetwork,
        evaluateScenarioMetrics,
        evaluateSystem
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = SystemEvaluator;
    }

    root.SystemEvaluator = SystemEvaluator;
})(typeof window !== 'undefined' ? window : globalThis);
