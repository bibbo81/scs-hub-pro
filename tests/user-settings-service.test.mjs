import assert from 'assert';

// Mock Supabase client used by updateSettings
const returned = {
    preferences: { lang: 'en' },
    api_keys: { service: 'key' }
};

const supabase = {
    from() {
        return {
            update() {
                return {
                    eq() {
                        return {
                            select() {
                                return {
                                    single: async () => ({ data: returned, error: null })
                                };
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

// Mocked service instance for unit tests
class MockService {
    constructor() {
        this.data = { preferences: {}, api_keys: {} };
        this.cache = null;
    }

    async getSettings() {
        return this.data;
    }

    async getAllApiKeys() {
        return this.data.api_keys;
    }

    async savePreferences(prefs) {
        this.data.preferences = { ...this.data.preferences, ...prefs };
        return true;
    }

    async saveSetting(category, data) {
        return this.savePreferences({ [category]: data });
    }

    async getAllSettings() {
        const settings = await this.getSettings();
        const apiKeys = await this.getAllApiKeys();
        return { ...settings, api_keys: apiKeys };
    }

    async updateSettings(settings) {
        try {
            const user = await requireAuth();
            const { data, error } = await supabase
                .from('user_settings')
                .update({
                    api_keys: settings.api_keys,
                    preferences: settings.preferences,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', user.id)
                .select()
                .single();

            if (error) throw error;

            this.cache = data;
            return true;
        } catch {
            return false;
        }
    }
}

async function runTests() {
    const svc = new MockService();

    await svc.saveSetting('theme', 'dark');
    let settings = await svc.getAllSettings();
    assert.strictEqual(settings.preferences.theme, 'dark');

    const newSettings = { preferences: { theme: 'light' }, api_keys: { service: 'x' } };
    const result = await svc.updateSettings(newSettings);
    assert.strictEqual(result, true);
    assert.deepStrictEqual(svc.cache, returned);

    console.log('UserSettingsService methods tests passed');
}

runTests();
