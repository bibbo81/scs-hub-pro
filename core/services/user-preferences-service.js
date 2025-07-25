import { supabase } from './supabase-client.js';

/**
 * Fetches user preferences for a specific page.
 * @param {string} page - The identifier for the page (e.g., 'tracking', 'products').
 * @returns {Promise<object|null>} The preferences object or null if not found or an error occurs.
 */
async function getPreferences(page) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('User not logged in. Cannot fetch preferences.');
      return null;
    }

    const { data, error } = await supabase
      .from('user_preferences')
      .select('preferences')
      .eq('user_id', user.id)
      .eq('page', page)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = 'No rows found', which is not an error here.
      console.error('Error fetching user preferences:', error);
      return null;
    }

    return data ? data.preferences : null;
  } catch (error) {
    console.error('Exception in getPreferences:', error);
    return null;
  }
}

/**
 * Saves or updates user preferences for a specific page.
 * @param {string} page - The identifier for the page.
 * @param {object} preferences - The JSON object containing the preferences to save.
 * @returns {Promise<{success: boolean, error: object|null}>} An object indicating success or failure.
 */
async function savePreferences(page, preferences) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not logged in. Cannot save preferences.');
    }

    const { error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: user.id,
        page: page,
        preferences: preferences,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id, page'
      });

    if (error) {
      console.error('Error saving user preferences:', error);
      return { success: false, error };
    }

    console.log(`Preferences for page '${page}' saved successfully.`);
    return { success: true, error: null };
  } catch (error) {
    console.error('Exception in savePreferences:', error);
    return { success: false, error };
  }
}

const userPreferencesService = {
  getPreferences,
  savePreferences,
};

export default userPreferencesService;