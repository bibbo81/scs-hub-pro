import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// --- Configurazione Supabase ---
let supabaseUrl = typeof process !== 'undefined' ? process.env.SUPABASE_URL : '';
let supabaseKey = typeof process !== 'undefined' ? process.env.SUPABASE_ANON_KEY : '';

if (typeof window !== 'undefined') {
    supabaseUrl = window.SUPABASE_URL || supabaseUrl;
    supabaseKey = window.SUPABASE_ANON_KEY || supabaseKey;
}

async function loadRuntimeConfig() {
    if ((!supabaseUrl || !supabaseKey) && typeof fetch === 'function') {
        try {
            const response = await fetch('/.netlify/functions/get-config');
            if (response.ok) {
                const cfg = await response.json();
                supabaseUrl = supabaseUrl || cfg.supabaseUrl;
                supabaseKey = supabaseKey || cfg.supabaseAnonKey;
            }
        } catch (error) {
            console.warn('get-config failed, trying runtime-config.json', error);
        }
    }

    if ((!supabaseUrl || !supabaseKey) && typeof fetch === 'function') {
        try {
            const response = await fetch('/runtime-config.json');
            if (response.ok) {
                const cfg = await response.json();
                supabaseUrl = supabaseUrl || cfg.supabaseUrl;
                supabaseKey = supabaseKey || cfg.supabaseAnonKey;
            }
        } catch (error) {
            console.error('Failed to load runtime configuration', error);
        }
    }

    if ((!supabaseUrl || !supabaseKey) && typeof fetch === 'function') {
        try {
            const response = await fetch('/runtime-config.example.json');
            if (response.ok) {
                const cfg = await response.json();
                supabaseUrl = supabaseUrl || cfg.supabaseUrl;
                supabaseKey = supabaseKey || cfg.supabaseAnonKey;
            }
        } catch (error) {
            console.error('Failed to load example runtime configuration', error);
        }
    }

    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase configuration missing');
    }
}

await loadRuntimeConfig();

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
supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        console.log('[Auth]', event);
    }
});
