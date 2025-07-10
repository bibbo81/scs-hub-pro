import assert from 'assert';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const cachePath = require.resolve('@supabase/supabase-js');

function mockSupabase(returnValue) {
    const fake = {
        createClient() {
            return {
                auth: {
                    async getUser() { return returnValue; }
                }
            };
        }
    };
    require.cache[cachePath] = { exports: fake };
}

function clearMock() {
    delete require.cache[cachePath];
}

async function load() {
    const mod = await import(`../netlify/functions/get-config.js?${Date.now()}`);
    return mod;
}

async function run() {
    const originalUrl = process.env.SUPABASE_URL;
    const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    process.env.SUPABASE_URL = 'http://localhost';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'sv-123';

    // Missing authorization header
    mockSupabase({ data: { user: null }, error: new Error('Invalid') });
    let { handler } = await load();
    let res = await handler({ headers: {} }, {});
    assert.strictEqual(res.statusCode, 401);
    clearMock();

    // Invalid token
    mockSupabase({ data: { user: null }, error: new Error('Invalid') });
    ;({ handler } = await load());
    res = await handler({ headers: { authorization: 'Bearer bad' } }, {});
    assert.strictEqual(res.statusCode, 401);
    clearMock();

    if (originalUrl !== undefined) {
        process.env.SUPABASE_URL = originalUrl;
    }
    if (originalKey !== undefined) {
        process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
    }

    console.log('get-config auth tests passed');
}

run();