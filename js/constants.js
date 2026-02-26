(function (root) {
    const GAME_CONFIG = {
        initialBudget: 900,
        defaultSimulationDurationMs: 3200,
        telemetrySchemaVersion: 1,
        campaignSaveKey: 'techBuildersSave',
        telemetrySaveKey: 'techBuildersTelemetry'
    };

    const COMPONENTS = {
        solarPanel: {
            name: 'Solar Panel',
            category: 'generation',
            roles: ['producer', 'clean'],
            cost: 90,
            energy: 110,
            throughput: 0,
            reserve: 0,
            carbonIntensity: 0.02,
            color: '#55c1ff',
            width: 120,
            height: 80
        },
        windTurbine: {
            name: 'Wind Turbine',
            category: 'generation',
            roles: ['producer', 'clean'],
            cost: 110,
            energy: 120,
            throughput: 0,
            reserve: 0,
            carbonIntensity: 0.03,
            color: '#7cb6ff',
            width: 120,
            height: 80
        },
        bioReactor: {
            name: 'Bio Reactor',
            category: 'generation',
            roles: ['producer', 'dispatchable'],
            cost: 130,
            energy: 145,
            throughput: 0,
            reserve: 0,
            carbonIntensity: 0.33,
            color: '#78a55a',
            width: 120,
            height: 80
        },
        microHydro: {
            name: 'Micro Hydro',
            category: 'generation',
            roles: ['producer', 'clean'],
            cost: 140,
            energy: 150,
            throughput: 0,
            reserve: 0,
            carbonIntensity: 0.06,
            color: '#4d7dff',
            width: 120,
            height: 80
        },
        battery: {
            name: 'Battery Bank',
            category: 'storage',
            roles: ['storage'],
            cost: 95,
            energy: 55,
            throughput: 0,
            reserve: 0.35,
            carbonIntensity: 0.04,
            color: '#f1d55a',
            width: 90,
            height: 80
        },
        superCap: {
            name: 'Super Capacitor',
            category: 'storage',
            roles: ['storage'],
            cost: 85,
            energy: 45,
            throughput: 0,
            reserve: 0.25,
            carbonIntensity: 0.05,
            color: '#f7b85d',
            width: 90,
            height: 80
        },
        smartController: {
            name: 'Smart Controller',
            category: 'control',
            roles: ['controller'],
            cost: 70,
            energy: -12,
            throughput: 12,
            reserve: 0,
            carbonIntensity: 0,
            color: '#ce7cff',
            width: 95,
            height: 70
        },
        relayNode: {
            name: 'Relay Node',
            category: 'control',
            roles: ['relay'],
            cost: 45,
            energy: -8,
            throughput: 10,
            reserve: 0,
            carbonIntensity: 0,
            color: '#9c84ff',
            width: 90,
            height: 65
        },
        sensorHub: {
            name: 'Sensor Hub',
            category: 'monitoring',
            roles: ['sensor'],
            cost: 60,
            energy: -9,
            throughput: 18,
            reserve: 0,
            carbonIntensity: 0,
            color: '#7de0f9',
            width: 90,
            height: 70
        },
        alertTower: {
            name: 'Alert Tower',
            category: 'monitoring',
            roles: ['alert', 'critical'],
            cost: 75,
            energy: -15,
            throughput: 20,
            reserve: 0,
            carbonIntensity: 0,
            color: '#ff956e',
            width: 90,
            height: 80
        },
        filterUnit: {
            name: 'Filter Unit',
            category: 'treatment',
            roles: ['treatment', 'actuator'],
            cost: 80,
            energy: -42,
            throughput: 72,
            reserve: 0,
            carbonIntensity: 0,
            color: '#3ddac1',
            width: 100,
            height: 80
        },
        waterPump: {
            name: 'Water Pump',
            category: 'critical_load',
            roles: ['critical', 'actuator'],
            cost: 100,
            energy: -80,
            throughput: 88,
            reserve: 0,
            carbonIntensity: 0,
            color: '#00b6dd',
            width: 100,
            height: 90
        },
        streetLight: {
            name: 'Street Light Cluster',
            category: 'critical_load',
            roles: ['critical'],
            cost: 65,
            energy: -35,
            throughput: 30,
            reserve: 0,
            carbonIntensity: 0,
            color: '#ffdf7c',
            width: 95,
            height: 80
        },
        vaccineCooler: {
            name: 'Vaccine Cooler',
            category: 'critical_load',
            roles: ['critical'],
            cost: 95,
            energy: -48,
            throughput: 34,
            reserve: 0,
            carbonIntensity: 0,
            color: '#80cfff',
            width: 95,
            height: 80
        },
        greenhouseFan: {
            name: 'Greenhouse Fan',
            category: 'critical_load',
            roles: ['actuator'],
            cost: 70,
            energy: -38,
            throughput: 45,
            reserve: 0,
            carbonIntensity: 0,
            color: '#7fe87f',
            width: 95,
            height: 80
        },
        classroomBlock: {
            name: 'Classroom Block',
            category: 'critical_load',
            roles: ['critical'],
            cost: 95,
            energy: -55,
            throughput: 50,
            reserve: 0,
            carbonIntensity: 0,
            color: '#f9a57c',
            width: 100,
            height: 85
        },
        labBench: {
            name: 'Lab Bench Grid',
            category: 'critical_load',
            roles: ['critical'],
            cost: 90,
            energy: -50,
            throughput: 55,
            reserve: 0,
            carbonIntensity: 0,
            color: '#f38fe0',
            width: 100,
            height: 85
        },
        evCharger: {
            name: 'EV Charger',
            category: 'critical_load',
            roles: ['critical'],
            cost: 120,
            energy: -95,
            throughput: 90,
            reserve: 0,
            carbonIntensity: 0,
            color: '#a9f06d',
            width: 95,
            height: 85
        },
        wire: {
            name: 'Wire Link',
            category: 'distribution',
            roles: ['wire'],
            cost: 15,
            energy: 0,
            throughput: 0,
            reserve: 0,
            carbonIntensity: 0,
            color: '#37ffaa',
            width: 110,
            height: 22
        }
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { GAME_CONFIG, COMPONENTS };
    }

    root.GAME_CONFIG = GAME_CONFIG;
    root.COMPONENTS = COMPONENTS;
})(typeof window !== 'undefined' ? window : globalThis);
