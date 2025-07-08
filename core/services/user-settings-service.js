// core/services/user-settings-service.js - FIX DEFINITIVO PER MODALITÀ DEMO
import { supabase, requireAuth } from '/core/services/supabase-client.js';

class UserSettingsService {
    constructor() {
        this.cache = null;
        this.cacheTimeout = 5 * 60 * 1000; // 5 minuti
        this.lastFetch = null;
        this.debugMode = window.location.hostname === 'localhost';
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

            if (this.debugMode) {
                console.log('[UserSettingsService] ✅ Settings loaded:', {
                    hasApiKeys: !!(data?.api_keys),
                    keyCount: Object.keys(data?.api_keys || {}).length
                });
            }

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
            
            // 🔥 CRITICO: NON crittare le API keys - salvarle in chiaro
            // La crittografia causava il problema della modalità demo
            
            // Update api_keys
            const updatedApiKeys = {
                ...settings.api_keys,
                [provider]: apiKey // 👈 SALVATO IN CHIARO, NON CRIPTATO
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

            if (this.debugMode) {
                console.log(`✅ API key for ${provider} saved in plain text to Supabase`);
            }

            // 🔥 IMPORTANTE: Dispatch evento per notificare altri servizi
            window.dispatchEvent(new CustomEvent('apiKeysUpdated', {
                detail: { provider, saved: true }
            }));

            return true;

        } catch (error) {
            console.error('Error saving API key:', error);
            
            // Fallback to localStorage
            localStorage.setItem(`${provider}_api_key`, apiKey);
            return false;
        }
    }

    // 🔥 FIX PRINCIPALE: getApiKey NON deve decrittare nulla
    async getApiKey(provider) {
        try {
            const settings = await this.getSettings();
            
            if (settings?.api_keys?.[provider]) {
                // 👈 RESTITUISCE DIRETTAMENTE - NO DECRIPTAZIONE
                const key = settings.api_keys[provider];
                
                if (this.debugMode) {
                    console.log(`[UserSettingsService] 🔑 API key found for ${provider}:`, 
                        key ? `${key.substring(0, 8)}...` : 'null');
                }
                
                return key;
            }
            
            // Fallback to localStorage
            const localKey = localStorage.getItem(`${provider}_api_key`);
            if (localKey && this.debugMode) {
                console.log(`[UserSettingsService] 🔑 Fallback to localStorage for ${provider}`);
            }
            
            return localKey;
            
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

            // Dispatch evento
            window.dispatchEvent(new CustomEvent('apiKeysUpdated', {
                detail: { provider, removed: true }
            }));

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

        if (migrated > 0) {
            console.log(`✅ Migrated ${migrated} API keys to Supabase`);
        }
        return migrated;
    }

    // 🔥 FIX: getAllApiKeys deve restituire le chiavi in chiaro
    async getAllApiKeys() {
        try {
            const settings = await this.getSettings();
            const apiKeys = settings?.api_keys || {};
            
            if (this.debugMode) {
                console.log('[UserSettingsService] 📋 All API keys:', 
                    Object.keys(apiKeys).map(k => `${k}: ${apiKeys[k] ? 'SET' : 'MISSING'}`));
            }
            
            return apiKeys; // 👈 RESTITUISCE DIRETTAMENTE - NO DECRIPTAZIONE
        } catch (error) {
            console.error('Error getting all API keys:', error);
            return this.getLocalApiKeys();
        }
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
        const hasKeys = Object.values(keys).some(key => key && key.length > 0);
        
        if (this.debugMode) {
            console.log('[UserSettingsService] 🔍 Has API keys:', hasKeys);
        }
        
        return hasKeys;
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

    // Get complete settings object including plain API keys
    async getAllSettings(forceRefresh = false) {
        const settings = await this.getSettings(forceRefresh);
        const apiKeys = await this.getAllApiKeys();
        return {
            ...settings,
            api_keys: apiKeys
        };
    }

    // Update entire settings object in Supabase
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
        } catch (error) {
            console.error('Error updating settings:', error);
            return false;
        }
    }

    // Save a single preference category
    async saveSetting(category, data) {
        return this.savePreferences({ [category]: data });
    }

    // Reset preferences and API keys in Supabase
    async resetAllSettings() {
        try {
            const user = await requireAuth();
            const { data, error } = await supabase
                .from('user_settings')
                .update({
                    api_keys: {},
                    preferences: {},
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', user.id)
                .select()
                .single();

            if (error) throw error;

            this.cache = data;
            return true;
        } catch (error) {
            console.error('Error resetting settings:', error);
            return false;
        }
    }

    // Delete user settings record from Supabase
    async deleteAllData() {
        try {
            const user = await requireAuth();
            const { error } = await supabase
                .from('user_settings')
                .delete()
                .eq('user_id', user.id);

            if (error) throw error;

            this.cache = null;
            return true;
        } catch (error) {
            console.error('Error deleting settings:', error);
            return false;
        }
    }

    // 🔥 NUOVO: Metodo di debug per verificare lo stato
    async debugApiKeys() {
        if (!this.debugMode) return;
        
        try {
            const settings = await this.getSettings();
            const apiKeys = settings?.api_keys || {};
            
            console.group('🔍 [UserSettingsService] API Keys Debug');
            console.log('📄 Raw settings:', settings);
            console.log('🔑 API Keys object:', apiKeys);
            console.log('🗝️ Available providers:', Object.keys(apiKeys));
            
            for (const [provider, key] of Object.entries(apiKeys)) {
                console.log(`   ${provider}:`, key ? `${key.substring(0, 8)}...` : 'NOT SET');
            }
            
            console.log('💾 LocalStorage fallback:');
            const localKeys = this.getLocalApiKeys();
            for (const [provider, key] of Object.entries(localKeys)) {
                console.log(`   ${provider}:`, key ? `${key.substring(0, 8)}...` : 'NOT SET');
            }
            
            console.groupEnd();
        } catch (error) {
            console.error('Debug failed:', error);
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
            
            // Debug in development
            if (window.location.hostname === 'localhost') {
                await userSettingsService.debugApiKeys();
            }
        }
    } catch (error) {
        console.log('User settings migration skipped:', error.message);
    }
})();

export default userSettingsService;

// Esponi globalmente per debug
window.userSettings = userSettingsService;
