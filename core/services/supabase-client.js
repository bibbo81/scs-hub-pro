// core/services/supabase-client.js

// Verifica che Supabase sia disponibile
if (!window.supabase || !window.supabase.createClient) {
    console.error('❌ Supabase non caricato! Assicurati che il CDN sia incluso nella pagina HTML');
    throw new Error('Supabase not loaded');
}

// Usa createClient dalla libreria Supabase globale
const createClient = window.supabase.createClient;

// Configurazione Supabase
const supabaseUrl = 'https://gnlrmnsdmpjzitsysowq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdubHJtbnNkbXBqeml0c3lzb3dxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0NjMxMzQsImV4cCI6MjA2NTAzOTEzNH0.UoJJoDUoDXGbiWnKNN48qb9PVQWOW_X_MXqAfzTHSaA';

// Flag per tracciare lo stato dell'inizializzazione
let isInitializing = false;
let initializationComplete = false;

// Crea client Supabase (una sola volta)
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
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

// Helper per autenticazione richiesta
export const requireAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
        // PRODUCTION: Login anonimo disabilitato per sicurezza
        // Se vuoi abilitarlo, decommenta le righe seguenti:
        /*
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error) {
            throw new Error('Authentication required: ' + error.message);
        }
        return data.user;
        */
        throw new Error('Authentication required');
    }
    
    return user;
};

// Helper per ottenere org corrente
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

// Helper per gestire l'autenticazione
export const auth = {
    async signIn(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        return { data, error };
    },

    async signUp(email, password, metadata = {}) {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: metadata
            }
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
        // PRODUCTION: Disabilitato per sicurezza
        throw new Error('Anonymous sign-in is disabled in production');
        // Per abilitare: return await supabase.auth.signInAnonymously();
    },

    onAuthStateChange(callback) {
        return supabase.auth.onAuthStateChange(callback);
    }
};

// Helper per debug (solo in development)
export const debug = {
    async testConnection() {
        if (window.location.hostname === 'localhost') {
            try {
                const { data, error } = await supabase
                    .from('trackings')
                    .select('count')
                    .limit(1);
                
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

// Esponi globalmente per retrocompatibilità
window.supabaseClient = supabase;
window.supabaseAuth = auth;
window.supabaseInstance = supabase;

// Funzione di inizializzazione con protezione contro multiple chiamate
async function initializeSupabase() {
    if (isInitializing || initializationComplete) {
        return window.supabaseInstance;
    }
    
    isInitializing = true;
    
    try {
        // Controlla se c'è già un utente
        const user = await auth.getUser();
        
        initializationComplete = true;
        
        // Listen to auth changes silently
        supabase.auth.onAuthStateChange((event, session) => {
            // Solo log per eventi importanti
            if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
                console.log('[Auth]', event);
            }
        });
        
        return window.supabaseInstance;
        
    } catch (error) {
        // Silent fail in production
        return window.supabaseInstance;
    } finally {
        isInitializing = false;
    }
}

// Auto-inizializza
initializeSupabase().catch(() => {
    // Silent fail
});

// Export default
export default supabase;

// Esponi globalmente SOLO UNA VOLTA
if (typeof window !== 'undefined' && !window.supabase) {
    window.supabase = supabase;
}