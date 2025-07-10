import { supabase, initializeSupabase } from '/core/services/supabase-client.js';

(function() {
    'use strict';

    // Ensure Supabase is ready
    async function ensureSupabaseReady() {
        try {
            return supabase;
        } catch (error) {
            console.log('[auth-supabase] Initializing Supabase client...');
            return await initializeSupabase();
        }
    }

    window.auth = {
        isAuthenticated() {
            const token = localStorage.getItem('sb-access-token') ||
                           sessionStorage.getItem('sb-access-token');
            return !!token;
        },

        async getCurrentUser() {
            const client = await ensureSupabaseReady();
            const { data: { user } } = await client.auth.getUser();
            return user;
        },

        async login(email, password) {
            const client = await ensureSupabaseReady();
            const { data, error } = await client.auth.signInWithPassword({ email, password });
            if (error) throw error;
            if (data.session?.access_token) {
                localStorage.setItem('sb-access-token', data.session.access_token);
            }
            return { user: data.user, session: data.session };
        },

        async logout() {
            const client = await ensureSupabaseReady();
            await client.auth.signOut();
            localStorage.removeItem('sb-access-token');
            sessionStorage.removeItem('sb-access-token');
            window.location.replace('/login.html');
        }
    };

    console.log('[Auth] Supabase auth system loaded');
})();
