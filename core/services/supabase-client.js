// core/services/supabase-client.js

// Verifica che Supabase sia disponibile
if (!window.supabase || !window.supabase.createClient) {
    console.error('❌ Supabase non caricato! Assicurati che il CDN sia incluso nella pagina HTML');
    throw new Error('Supabase not loaded');
}

// Usa createClient dalla libreria Supabase globale
const createClient = window.supabase.createClient;

// Configurazione Supabase
const SUPABASE_URL = 'https://gnlrmnsdmpjzitsysowq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdubHJtbnNkbXBqeml0c3lzb3dxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0NjMxMzQsImV4cCI6MjA2NTAzOTEzNH0.UoJJoDUoDXGbiWnKNN48qb9PVQWOW_X_MXqAfzTHSaA';

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
        console.log('🔐 Nessun utente, tentativo login anonimo...');
        
        // Tenta login anonimo
        const { data, error } = await supabase.auth.signInAnonymously();
        
        if (error) {
            console.error('❌ Login anonimo fallito:', error);
            throw new Error('Authentication required: ' + error.message);
        }
        
        console.log('✅ Login anonimo riuscito:', data.user.id);
        return data.user;
    }
    
    console.log('👤 Utente già autenticato:', user.id);
    return user;
};

// Helper per ottenere org corrente (per futuro)
export const getCurrentOrg = async () => {
    const user = await requireAuth();
    
    // Per ora ritorna org default
    const { data, error } = await supabase
        .from('organization_members')
        .select('organization_id, organizations(*)')
        .eq('user_id', user.id)
        .single();
    
    if (error) {
        console.log('📦 Nessuna organizzazione trovata (normale per utenti anonimi)');
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
        const { data, error } = await supabase.auth.signInAnonymously();
        return { data, error };
    },

    onAuthStateChange(callback) {
        return supabase.auth.onAuthStateChange(callback);
    }
};

// Helper per debug
export const debug = {
    async testConnection() {
        try {
            const { data, error } = await supabase
                .from('trackings')
                .select('count')
                .limit(1);
            
            if (error) throw error;
            
            console.log('✅ Supabase connection successful');
            return true;
        } catch (error) {
            console.error('❌ Supabase connection failed:', error);
            return false;
        }
    },
    
    async testAuth() {
        try {
            const user = await requireAuth();
            console.log('✅ Auth test successful:', {
                id: user.id,
                email: user.email || 'Anonymous',
                role: user.role
            });
            return true;
        } catch (error) {
            console.error('❌ Auth test failed:', error);
            return false;
        }
    }
};

// Esponi globalmente per debug e retrocompatibilità
window.supabaseClient = supabase;
window.supabaseDebug = debug;
window.supabaseRequireAuth = requireAuth;
window.supabaseGetCurrentOrg = getCurrentOrg;
window.supabaseAuth = auth;
window.supabaseInstance = supabase; // Aggiungi riferimento per initializeSupabase

console.log('✅ Supabase client inizializzato correttamente');

// Funzione di inizializzazione con protezione contro multiple chiamate
async function initializeSupabase() {
    // Previeni inizializzazioni multiple
    if (isInitializing || initializationComplete) {
        console.log('[Supabase] Already initialized or initializing');
        return window.supabaseInstance;
    }
    
    isInitializing = true;
    
    try {
        // Controlla se c'è già un utente
        const user = await auth.getUser();
        if (!user) {
            console.log('🔐 Nessun utente trovato, inizializzazione auth anonima...');
            await requireAuth();
        }
        
        initializationComplete = true;
        
        // Notifica solo per veri eventi di login, non per token refresh
        supabase.auth.onAuthStateChange((event, session) => {
            console.log('[Supabase] Auth event:', event);
            
            // Solo log, niente notifiche qui - lascia che sia header-component a gestirle
            if (event === 'TOKEN_REFRESHED') {
                console.log('[Supabase] Token refreshed silently');
            }
        });
        
        console.log('[Supabase] Initialization complete');
        return window.supabaseInstance;
        
    } catch (error) {
        console.error('[Supabase] Initialization error:', error);
        throw error;
    } finally {
        isInitializing = false;
    }
}

// Auto-inizializza usando la nuova funzione protetta
initializeSupabase().catch(error => {
    console.log('⚠️ Auto-init auth skipped:', error.message);
});

// Export per ES6 modules
export { supabase };

// NUOVO: Esponi globalmente per compatibilità e debug
if (typeof window !== 'undefined') {
    window.supabase = supabase;
    console.log('[Supabase Client] ✅ Exposed globally as window.supabase');
    
    // Verifica disponibilità
    if (window.supabase && window.supabase.auth) {
        console.log('[Supabase Client] ✅ Auth module available');
    }
}

// Export default per retrocompatibilità
export default supabase;