// /core/services/user-preferences-service.js
import { supabase } from '/core/services/supabase-client.js';
import authGuard from '/core/auth-guard.js';

class UserPreferencesService {
    constructor() {
        this.cache = new Map();
    }

    /**
     * Fetches user preferences for a specific page.
     * @param {string} page - The identifier for the page (e.g., 'tracking').
     * @returns {Promise<object|null>} The preferences object or null if not found.
     */
    async getPreferences(page) {
        const user = await authGuard.getCurrentUser();
        if (!user) return null;

        const cacheKey = `${user.id}-${page}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        const { data, error } = await supabase
            .from('user_preferences')
            .select('preferences')
            .eq('user_id', user.id)
            .eq('page', page)
            .maybeSingle(); // FIX: Use maybeSingle() to prevent 406 error. It returns null if no row is found.

        if (error) {
            console.error('Error fetching user preferences:', error);
            throw error;
        }

        this.cache.set(cacheKey, data);
        return data;
    }

    /**
     * Saves user preferences for a specific page.
     * @param {string} page - The identifier for the page.
     * @param {object} preferences - The JSON object of preferences to save.
     * @returns {Promise<{success: boolean, data: object}>}
     */
    async savePreferences(page, preferences) {
        const user = await authGuard.getCurrentUser();
        if (!user) throw new Error('User not authenticated');

        this.cache.delete(`${user.id}-${page}`); // Invalidate cache

        const { data, error } = await supabase
            .from('user_preferences')
            .upsert({ user_id: user.id, page: page, preferences: preferences }, { onConflict: 'user_id, page' })
            .select().single();

        if (error) throw error;
        return { success: true, data };
    }
}

export default new UserPreferencesService();