import assert from 'assert';

global.window = {
    dataManager: { initialized: false, organizationId: '1' },
    supabase: null,
    ModalSystem: null,
    NotificationSystem: { error(){}, success(){}, info(){}, warning(){} }
};

global.document = {
    readyState: 'loading',
    addEventListener() {},
    getElementById() { return null; },
    createElement() { return {}; },
    head: { appendChild() {} }
};

await import('../core/product-linking-system.js?'+Date.now());

global.window.productLinking.setupEventHandlers = () => {};
global.window.productLinking.fixExistingButtons = () => {};
global.window.productLinking.runSystemTest = () => {};

const initPromise = global.window.productLinking.init();

setTimeout(() => {
    global.window.dataManager.initialized = true;
    global.window.supabase = {};
    global.window.ModalSystem = {};
}, 100);

const result = await initPromise;
assert.strictEqual(result, true);

console.log('ProductLinkingSystem late init test passed');