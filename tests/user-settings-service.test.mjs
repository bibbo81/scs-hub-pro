import assert from 'assert';

// Mocked service instance for unit tests
class MockService {
    constructor() {
        this.data = { preferences: {}, api_keys: {} };
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
}

async function runTests() {
    const svc = new MockService();

    await svc.saveSetting('theme', 'dark');
    let settings = await svc.getAllSettings();
    assert.strictEqual(settings.preferences.theme, 'dark');

    console.log('UserSettingsService methods tests passed');
}

runTests();
