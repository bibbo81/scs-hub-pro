// core/services/supabase-client.js

// Verifica che Supabase sia disponibile
if (!window.supabaseCreateClient) {
    console.error('❌ Supabase non caricato! Assicurati che il CDN sia incluso in tracking.html');
    throw new Error('Supabase not loaded');
}

const createClient = window.supabaseCreateClient;

// Configurazione Supabase
const SUPABASE_URL = 'https://gnlrmnsdmpjzitsysowq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdubHJtbnNkbXBqeml0c3lzb3dxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0NjMxMzQsImV4cCI6MjA2NTAzOTEzNH0.UoJJoDUoDXGbiWnKNN48qb9PVQWOW_X_MXqAfzTHSaA';

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

// Helper per gestire l'autenticazione
export const auth = {
    async signIn(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        return { data, error };
    },

    async signUp(email, password) {
        const { data, error } = await supabase.auth.signUp({
            email,
            password
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
    }
};

// Esponi globalmente per debug
window.supabaseClient = supabase;
window.supabaseDebug = debug;

console.log('✅ Supabase client inizializzato');