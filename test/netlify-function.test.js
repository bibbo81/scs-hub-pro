const assert = require('node:assert');
const test = require('node:test');
const { handler } = require('../netlify/functions/test.js');

test('netlify function returns success', async () => {
    const res = await handler({ path: '/test', queryStringParameters: {} });
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.match(body.message, /Netlify Functions are working/);
});
