import { supabase, initializeSupabase } from '/core/services/supabase-client.js';

(async () => {
    'use strict';

    await initializeSupabase();

    window.auth = {
        isAuthenticated() {
            const token = localStorage.getItem('sb-access-token') ||
                           sessionStorage.getItem('sb-access-token');
            return !!token;
        },

        async getCurrentUser() {
            const { data: { user } } = await supabase.auth.getUser();
            return user;
        },

        async login(email, password) {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            if (data.session?.access_token) {
                localStorage.setItem('sb-access-token', data.session.access_token);
            }
            return { user: data.user, session: data.session };
        },

        async logout() {
            await supabase.auth.signOut();
            localStorage.removeItem('sb-access-token');
            sessionStorage.removeItem('sb-access-token');
            window.location.replace('/login.html');
        }
    };

    console.log('[Auth] Supabase auth system loaded');
})();
