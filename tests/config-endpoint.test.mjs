import assert from 'assert';

async function testConfigEndpoint() {
    // Store original environment variables
    const originalUrl = process.env.SUPABASE_URL;
    const originalKey = process.env.SUPABASE_ANON_KEY;

    try {
        // Set test environment variables
        process.env.SUPABASE_URL = 'https://test.supabase.co';
        process.env.SUPABASE_ANON_KEY = 'test-anon-key';

        // Import the handler
        const { handler } = await import('../netlify/functions/config.js');

        // Test successful GET request
        const event = {
            httpMethod: 'GET',
            headers: {}
        };
        const context = {};

        const response = await handler(event, context);
        
        assert.strictEqual(response.statusCode, 200);
        assert.strictEqual(response.headers['Content-Type'], 'application/json');
        
        const body = JSON.parse(response.body);
        assert.strictEqual(body.supabaseUrl, 'https://test.supabase.co');
        assert.strictEqual(body.supabaseAnonKey, 'test-anon-key');

        // Test OPTIONS request (CORS preflight)
        const optionsEvent = {
            httpMethod: 'OPTIONS',
            headers: {}
        };

        const optionsResponse = await handler(optionsEvent, context);
        assert.strictEqual(optionsResponse.statusCode, 200);
        assert.strictEqual(optionsResponse.headers['Access-Control-Allow-Origin'], '*');

        // Test invalid method
        const postEvent = {
            httpMethod: 'POST',
            headers: {}
        };

        const postResponse = await handler(postEvent, context);
        assert.strictEqual(postResponse.statusCode, 405);

        // Test missing environment variables
        delete process.env.SUPABASE_URL;
        delete process.env.SUPABASE_ANON_KEY;

        const noEnvResponse = await handler(event, context);
        assert.strictEqual(noEnvResponse.statusCode, 500);

        console.log('Config endpoint tests passed');

    } finally {
        // Restore original environment variables
        if (originalUrl !== undefined) {
            process.env.SUPABASE_URL = originalUrl;
        } else {
            delete process.env.SUPABASE_URL;
        }
        if (originalKey !== undefined) {
            process.env.SUPABASE_ANON_KEY = originalKey;
        } else {
            delete process.env.SUPABASE_ANON_KEY;
        }
    }
}

testConfigEndpoint().catch(console.error);