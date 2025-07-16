import assert from 'assert';

const scheduled = [];

// Minimal DOM simulation
const appended = [];
const scriptGlobals = {
    '/phase2-architecture.js': () => {
        global.Phase2Architecture = function() {};
    },
    '/core/shipments-registry.js': () => {
        global.ShipmentsRegistry = function() {
            this.initialized = false;
            this.init = async () => { this.initialized = true; };
        };
    },
    '/pages/shipments/documents-manager.js': () => {
        global.DocumentsManager = function() {
            this.initialized = false;
            this.init = async () => { this.initialized = true; };
        };
    },
    '/pages/shipments/registry-core.js': () => {
        global.RegistryCore = function() {};
    },
    '/pages/shipments/shipments-details.js': () => {
        global.ShipmentDetails = function() {};
    },
    '/core/enhanced-commercial-model.js': () => {
        global.EnhancedCommercialModel = function() {};
    },
    '/pages/shipments/cost-allocation.js': () => {
        global.CostAllocationUI = function() {};
    },
    '/pages/shipments/carrier-performance.js': () => {
        global.CarrierPerformanceAnalytics = function() {};
    },
    '/pages/shipments/executive-bi-dashboard.js': () => {
        global.ExecutiveBIDashboard = function() {};
    }
};

// Stub global objects
global.window = global;
window.dispatchEvent = () => {};
window.addEventListener = () => {};

global.document = {
    readyState: 'complete',
    querySelector() { return null; },
    createElement() { return { setAttribute() {}, onload: null, onerror: null }; },
    head: {
        appendChild(script) {
            appended.push(script.src);
            if (scriptGlobals[script.src]) {
                scriptGlobals[script.src]();
            }
            if (typeof script.onload === 'function') {
                script.onload();
            }
        }
    },
    addEventListener() {}
};

global.CustomEvent = function(name, opts) {
    return { type: name, detail: opts?.detail };
};

const realSetTimeout = setTimeout;
global.setTimeout = (fn, t) => {
    if (t === 1000) {
        scheduled.push(fn);
        return 0;
    }
    return realSetTimeout(fn, 0);
};

assert.strictEqual(appended.length, 0);

await import('../shipments-initialization-fix.js');

assert.strictEqual(appended.length, 0, 'scripts should not load before init');
assert.strictEqual(global.registryCore, undefined);

for (const fn of scheduled) {
    await fn();
}

assert.ok(appended.length > 0, 'scripts loaded after init');
assert.ok(global.registryCore, 'registry core initialized');

console.log('Shipments initialization fix test passed');