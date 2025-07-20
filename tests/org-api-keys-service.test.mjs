import assert from 'assert';

const encoded = [
    { provider: 'shipsgo_v1', api_key: Buffer.from('key1').toString('base64') },
    { provider: 'shipsgo_v2', api_key: Buffer.from('key2').toString('base64') }
];

let queryCount = 0;

const supabase = {
    from() {
        return {
            select() {
                return {
                    eq() {
                        return {
                            eq: async () => {
                                queryCount++;
                                return { data: encoded, error: null };
                            }
                        };
                    }
                };
            }
        };
    },
    auth: {
        getUser: async () => ({ data: { user: { id: '1' } } })
    }
};

async function requireAuth() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

global.atob = str => Buffer.from(str, 'base64').toString('utf8');

class MockOrgApiKeysService {
    constructor() {
        this.cache = new Map();
    }

    async getCurrentOrganization() {
        await requireAuth();
        return { id: '1' };
    }

    async getOrganizationApiKeys() {
        try {
            const org = await this.getCurrentOrganization();
            if (!org) return [];

            const cacheKey = `list_${org.id}`;
            if (this.cache.has(cacheKey)) {
                return this.cache.get(cacheKey);
            }

            const { data, error } = await supabase
                .from('organization_api_keys')
                .select('provider, api_key')
                .eq('organization_id', org.id)
                .eq('is_active', true);

            if (error || !data) return [];

            const keys = data.map(row => ({
                provider: row.provider,
                api_key: atob(row.api_key)
            }));

            this.cache.set(cacheKey, keys);
            return keys;
        } catch {
            return [];
        }
    }
}

async function runTests() {
    const svc = new MockOrgApiKeysService();
    const keys1 = await svc.getOrganizationApiKeys();
    assert.deepStrictEqual(keys1, [
        { provider: 'shipsgo_v1', api_key: 'key1' },
        { provider: 'shipsgo_v2', api_key: 'key2' }
    ]);
    assert.strictEqual(queryCount, 1);

    const keys2 = await svc.getOrganizationApiKeys();
    assert.deepStrictEqual(keys2, keys1);
    assert.strictEqual(queryCount, 1, 'should use cached result');

    console.log('OrganizationApiKeysService getOrganizationApiKeys tests passed');
}

runTests();

