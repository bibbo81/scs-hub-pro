import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// --- Configurazione Supabase ---
const supabaseUrl =
    (typeof process !== 'undefined' && process.env.SUPABASE_URL) ||
    (typeof Deno !== 'undefined' && typeof Deno.env?.get === 'function' && Deno.env.get('SUPABASE_URL')) ||
    (typeof window !== 'undefined' && window.SUPABASE_URL) ||
    '';

const supabaseKey =
    (typeof process !== 'undefined' && process.env.SUPABASE_ANON_KEY) ||
    (typeof Deno !== 'undefined' && typeof Deno.env?.get === 'function' && Deno.env.get('SUPABASE_ANON_KEY')) ||
    (typeof window !== 'undefined' && window.SUPABASE_ANON_KEY) ||
    '';

// --- Creazione del Client (una sola volta) ---
export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    },
    realtime: {
        params: {
            eventsPerSecond: 10
        }
    }
});

// --- Helper e Funzioni di Supporto (Il tuo codice originale, mantenuto) ---

export const requireAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error('Authentication required');
    }
    return user;
};

export const getCurrentOrg = async () => {
    const user = await requireAuth();
    const { data, error } = await supabase
        .from('organization_members')
        .select('organization_id, organizations(*)')
        .eq('user_id', user.id)
        .single();
    if (error) {
        return null;
    }
    return data?.organizations || null;
};

export const auth = {
    async signIn(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        return { data, error };
    },

    async signUp(email, password, metadata = {}) {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: metadata }
        });
        return { data, error };
    },

    async signOut() {
        const { error } = await supabase.auth.signOut();
        return { error };
    },

    async getUser() {
        const { data: { user } } = await supabase.auth.getUser();
        return user;
    },

    async signInAnonymously() {
        throw new Error('Anonymous sign-in is disabled in production');
    },

    onAuthStateChange(callback) {
        return supabase.auth.onAuthStateChange(callback);
    }
};

export const debug = {
    async testConnection() {
        if (window.location.hostname === 'localhost') {
            try {
                const { data, error } = await supabase.from('trackings').select('count').limit(1);
                if (error) throw error;
                return true;
            } catch (error) {
                console.error('Supabase connection failed:', error);
                return false;
            }
        }
        return null;
    }
};

// Listener per lo stato di autenticazione
export const getAccessToken = () => {
    return localStorage.getItem('sb-access-token') ||
           sessionStorage.getItem('sb-access-token');
};

// Listener per lo stato di autenticazione
supabase.auth.onAuthStateChange((event, session) => {
    if (session?.access_token) {
        localStorage.setItem('sb-access-token', session.access_token);
        sessionStorage.setItem('sb-access-token', session.access_token);
    }

    if (event === 'SIGNED_OUT') {
        localStorage.removeItem('sb-access-token');
        sessionStorage.removeItem('sb-access-token');
    }

    if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        console.log('[Auth]', event);
    }
});
