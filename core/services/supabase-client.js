import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// --- Configurazione Supabase ---
const getSupabaseConfig = () => {
    // Try environment variables first
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

    return { supabaseUrl, supabaseKey };
};

// --- Async function to fetch config from API if needed ---
const fetchConfigFromAPI = async () => {
    try {
        const response = await fetch('/api/config');
        if (!response.ok) {
            throw new Error(`Failed to fetch config: ${response.status}`);
        }
        const config = await response.json();
        return {
            supabaseUrl: config.supabaseUrl,
            supabaseKey: config.supabaseAnonKey
        };
    } catch (error) {
        console.error('Failed to fetch Supabase config from API:', error);
        throw error;
    }
};

// --- Initialize Supabase client ---
let supabaseClient = null;
let supabaseInitPromise = null;

const initializeSupabase = async () => {
    if (supabaseClient) {
        return supabaseClient;
    }

    const { supabaseUrl, supabaseKey } = getSupabaseConfig();

    // If we have env vars, use them directly
    if (supabaseUrl && supabaseKey) {
        supabaseClient = createClient(supabaseUrl, supabaseKey, {
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
        return supabaseClient;
    }

    // If no env vars and we're in browser, try to fetch from API
    if (typeof window !== 'undefined') {
        try {
            const config = await fetchConfigFromAPI();
            supabaseClient = createClient(config.supabaseUrl, config.supabaseKey, {
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
            return supabaseClient;
        } catch (error) {
            console.error('Failed to initialize Supabase client:', error);
            throw new Error('Supabase configuration is required');
        }
    }

    throw new Error('Supabase configuration is required');
};

// Initialize the client synchronously if possible, otherwise require async initialization
try {
    const { supabaseUrl, supabaseKey } = getSupabaseConfig();
    if (supabaseUrl && supabaseKey) {
        supabaseClient = createClient(supabaseUrl, supabaseKey, {
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
    } else if (typeof window !== 'undefined') {
        // In browser without env vars - will need async initialization
        supabaseInitPromise = initializeSupabase();
    }
} catch (error) {
    // Error during sync initialization
    if (typeof window !== 'undefined') {
        supabaseInitPromise = initializeSupabase();
    }
}

// Export a direct reference to the client for cases where it's immediately available
// For cases where async initialization is needed, use initializeSupabase() first
export const supabase = supabaseClient || new Proxy({}, {
    get(target, prop) {
        if (supabaseClient) {
            return supabaseClient[prop];
        }
        throw new Error('Supabase client not initialized. Call initializeSupabase() first.');
    }
});

export { initializeSupabase };

// --- Helper e Funzioni di Supporto (Il tuo codice originale, mantenuto) ---

export const requireAuth = async () => {
    await ensureSupabaseInitialized();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error('Authentication required');
    }
    return user;
};

export const getCurrentOrg = async () => {
    await ensureSupabaseInitialized();
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

// Helper to ensure Supabase is initialized
const ensureSupabaseInitialized = async () => {
    if (!supabaseClient && supabaseInitPromise) {
        await supabaseInitPromise;
    }
    if (!supabaseClient) {
        throw new Error('Supabase client failed to initialize');
    }
};

export const auth = {
    async signIn(email, password) {
        await ensureSupabaseInitialized();
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        return { data, error };
    },

    async signUp(email, password, metadata = {}) {
        await ensureSupabaseInitialized();
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: metadata }
        });
        return { data, error };
    },

    async signOut() {
        await ensureSupabaseInitialized();
        const { error } = await supabase.auth.signOut();
        return { error };
    },

    async getUser() {
        await ensureSupabaseInitialized();
        const { data: { user } } = await supabase.auth.getUser();
        return user;
    },

    async signInAnonymously() {
        throw new Error('Anonymous sign-in is disabled in production');
    },

    onAuthStateChange(callback) {
        if (supabaseClient) {
            return supabase.auth.onAuthStateChange(callback);
        }
        // If not initialized yet, wait for initialization
        if (supabaseInitPromise) {
            supabaseInitPromise.then(() => {
                return supabase.auth.onAuthStateChange(callback);
            });
        }
        return { data: { subscription: null }, error: new Error('Supabase not initialized') };
    }
};

export const debug = {
    async testConnection() {
        if (window.location.hostname === 'localhost') {
            try {
                await ensureSupabaseInitialized();
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

// Setup auth state listener when client is available
const setupAuthListener = () => {
    if (supabaseClient) {
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
    }
};

// Setup listener immediately if client is available, otherwise wait for initialization
if (supabaseClient) {
    setupAuthListener();
} else if (supabaseInitPromise) {
    supabaseInitPromise.then(setupAuthListener);
}
