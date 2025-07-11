// core/auth-supabase.js
import { initializeSupabase, getSupabase } from '/core/services/supabase-client.js';

// Initialize auth system
async function initAuth() {
    try {
        await initializeSupabase();
        const supabase = getSupabase();
        
        // Set up auth state listener
        supabase.auth.onAuthStateChange((event, session) => {
            console.log('[Auth]', event);
            if (event === 'SIGNED_IN' && session) {
                // Redirect to shipments page after login
                if (window.location.pathname.includes('login.html')) {
                    window.location.href = '/shipments.html';
                }
            } else if (event === 'SIGNED_OUT') {
                // Redirect to login page after logout
                if (!window.location.pathname.includes('login.html')) {
                    window.location.href = '/login.html';
                }
            }
        });
        
        // Check if user is already logged in
        const { data: { session } } = await supabase.auth.getSession();
        if (session && window.location.pathname.includes('login.html')) {
            window.location.href = '/shipments.html';
        } else if (!session && !window.location.pathname.includes('login.html')) {
            window.location.href = '/login.html';
        }
        
    } catch (error) {
        console.error('[Auth] Initialization error:', error);
    }
}

// Export functions for global use
if (typeof window !== 'undefined') {
    window.authSupabase = {
        signIn: async (email, password) => {
            const supabase = getSupabase();
            return await supabase.auth.signInWithPassword({ email, password });
        },
        signOut: async () => {
            const supabase = getSupabase();
            return await supabase.auth.signOut();
        },
        getSession: async () => {
            const supabase = getSupabase();
            return await supabase.auth.getSession();
        },
        getUser: async () => {
            const supabase = getSupabase();
            return await supabase.auth.getUser();
        }
    };
}

// Initialize on load
initAuth();

console.log('[Auth] Supabase auth system loaded');