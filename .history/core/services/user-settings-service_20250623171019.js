// core/services/user-settings-service.js
import { supabase, requireAuth } from './supabase-client.js';

class UserSettingsService {
    constructor() {
        this.cache = null;
        this.cacheTimeout = 5 * 60 * 1000; // 5 minuti
        this.lastFetch = null;
    }

    async getSettings(forceRefresh = false) {
        // Check cache
        if (!forceRefresh && this.cache && this.lastFetch && 
            (Date.now() - this.lastFetch < this.cacheTimeout)) {
            return this.cache;
        }

        try {
            const user = await requireAuth();
            
            // Fetch settings
            let { data, error } = await supabase
                .from('user_settings')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (error && error.code === 'PGRST116') {
                // No settings found, create them
                const { data: newSettings, error: createError } = await supabase
                    .from('user_settings')
                    .insert([{ 
                        user_id: user.id,
                        api_keys: {},
                        preferences: {}
                    }])
                    .select()
                    .single();

                if (createError) throw createError;
                data = newSettings;
            } else if (error) {
                throw error;
            }

            // Update cache
            this.cache = data;
            this.lastFetch = Date.now();

            return data;
        } catch (error) {
            console.error('Error fetching user settings:', error);
            
            // Fallback to localStorage
            return {
                api_keys: this.getLocalApiKeys(),
                preferences: {}
            };
        }
    }

    async saveApiKey(provider, apiKey) {
        try {
            const user = await requireAuth();
            const settings = await this.getSettings();
            
            // Encrypt the API key (basic encryption - potresti usare una libreria più robusta)
            const encryptedKey = btoa(apiKey); // In produzione usa crypto-js o simile
            
            // Update api_keys
            const updatedApiKeys = {
                ...settings.api_keys,
                [provider]: encryptedKey
            };

            // Save to Supabase
            const { data, error } = await supabase
                .from('user_settings')
                .update({ 
                    api_keys: updatedApiKeys,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', user.id)
                .select()
                .single();

            if (error) throw error;

            // Update cache
            this.cache = data;
            
            // Also save to localStorage as backup
            localStorage.setItem(`${provider}_api_key`, apiKey);

            console.log(`✅ API key for ${provider} saved successfully`);
            return true;

        } catch (error) {
            console.error('Error saving API key:', error);
            
            // Fallback to localStorage
            localStorage.setItem(`${provider}_api_key`, apiKey);
            return false;
        }
    }

    async getApiKey(provider) {
        try {
            const settings = await this.getSettings();
            
            if (settings?.api_keys?.[provider]) {
                // Decrypt the key
                return atob(settings.api_keys[provider]); // In produzione usa crypto-js
            }
            
            // Fallback to localStorage
            return localStorage.getItem(`${provider}_api_key`);
            
        } catch (error) {
            console.error('Error getting API key:', error);
            // Fallback to localStorage
            return localStorage.getItem(`${provider}_api_key`);
        }
    }

    async removeApiKey(provider) {
        try {
            const user = await requireAuth();
            const settings = await this.getSettings();
            
            // Remove from api_keys
            const updatedApiKeys = { ...settings.api_keys };
            delete updatedApiKeys[provider];

            // Save to Supabase
            const { error } = await supabase
                .from('user_settings')
                .update({ 
                    api_keys: updatedApiKeys,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', user.id);

            if (error) throw error;

            // Clear cache
            this.cache = null;
            
            // Also remove from localStorage
            localStorage.removeItem(`${provider}_api_key`);

            console.log(`✅ API key for ${provider} removed`);
            return true;

        } catch (error) {
            console.error('Error removing API key:', error);
            return false;
        }
    }

    // Migrate existing localStorage keys to Supabase
    async migrateLocalApiKeys() {
        const providers = ['shipsgo_v1', 'shipsgo_v2'];
        let migrated = 0;

        for (const provider of providers) {
            const localKey = localStorage.getItem(`${provider}_api_key`);
            if (localKey) {
                const saved = await this.saveApiKey(provider, localKey);
                if (saved) migrated++;
            }
        }

        console.log(`✅ Migrated ${migrated} API keys to Supabase`);
        return migrated;
    }

    // Helper to get all API keys
    async getAllApiKeys() {
        const keys = {};
        const providers = ['shipsgo_v1', 'shipsgo_v2'];

        for (const provider of providers) {
            const key = await this.getApiKey(provider);
            if (key) keys[provider] = key;
        }

        return keys;
    }

    // Get local API keys (fallback)
    getLocalApiKeys() {
    return {
        shipsgo_v1: localStorage.getItem('shipsgo_api_key') || localStorage.getItem('shipsgo_v1_api_key'),
        shipsgo_v2: localStorage.getItem('shipsgo_v2_token') || localStorage.getItem('shipsgo_v2_api_key')
    };
}

    // Check if user has any API keys configured
    async hasApiKeys() {
        const keys = await this.getAllApiKeys();
        return Object.values(keys).some(key => key && key.length > 0);
    }

    // Save preferences
    async savePreferences(preferences) {
        try {
            const user = await requireAuth();
            const settings = await this.getSettings();
            
            const updatedPreferences = {
                ...settings.preferences,
                ...preferences
            };

            const { data, error } = await supabase
                .from('user_settings')
                .update({ 
                    preferences: updatedPreferences,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', user.id)
                .select()
                .single();

            if (error) throw error;

            // Update cache
            this.cache = data;
            
            return true;

        } catch (error) {
            console.error('Error saving preferences:', error);
            return false;
        }
    }

    // Get specific preference
    async getPreference(key, defaultValue = null) {
        try {
            const settings = await this.getSettings();
            return settings?.preferences?.[key] ?? defaultValue;
        } catch (error) {
            console.error('Error getting preference:', error);
            return defaultValue;
        }
    }
}

// Export singleton
const userSettingsService = new UserSettingsService();

// Auto-migrate on load if user is authenticated
(async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && !user.is_anonymous) {
            // Migra API key esistenti
            await userSettingsService.migrateLocalApiKeys();
        }
    } catch (error) {
        console.log('User settings migration skipped:', error.message);
    }
})();

export default userSettingsService;

// Esponi globalmente per debug
window.userSettings = userSettingsService;