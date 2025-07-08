import assert from 'assert';

async function load(fn) {
    const mod = await import(`../netlify/functions/${fn}.js?${Date.now()}`);
    return mod;
}

async function run() {
    const originalUrl = process.env.SUPABASE_URL;
    const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    process.env.SUPABASE_URL = 'http://localhost';
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const functions = [
        ['get-trackings', { httpMethod: 'GET', headers: { authorization: 'Bearer t' } }],
        ['notifications', { httpMethod: 'GET', headers: { authorization: 'Bearer t' } }],
        ['products-import', { httpMethod: 'POST', body: JSON.stringify({ data: [] }) }]
    ];

    for (const [name, event] of functions) {
        const { handler } = await load(name);
        await assert.rejects(() => handler(event, {}), /SUPABASE_SERVICE_ROLE_KEY/);
    }

    if (originalUrl !== undefined) {
        process.env.SUPABASE_URL = originalUrl;
    }
    if (originalKey !== undefined) {
        process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
    }

    console.log('SUPABASE_SERVICE_ROLE_KEY runtime check tests passed');
}

run();
