// core/services/supabase-client.js - Fixed initialization
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

let supabase = null;
let initializationPromise = null;
let initialized = false;

// Configuration fallback
const DEFAULT_CONFIG = {
    supabaseUrl: 'https://gnlrmnsdmpjzitsysowq.supabase.co',
    supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdubHJtbnNkbXBqeml0c3lzb3dxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU5MjkyMDUsImV4cCI6MjA1MTUwNTIwNX0.xKWMC3kz-Vv1n5_4RU3-PXQMKB7gCG9OZ1LZmOXxX-0'
};

// Fetch config from API
async function fetchConfigFromAPI() {
    try {
        const apiUrl = window.location.hostname === 'localhost'
            ? 'http://localhost:8888/api/config'
            : 'https://scs-hub-pro.netlify.app/api/config';
            
        const response = await fetch(apiUrl);
        if (response.ok) {
            return await response.json();
        }
    } catch (error) {
        console.warn('Failed to fetch config from API:', error);
    }
    return null;
}

// Create a singleton initialization
async function initializeSupabase() {
    if (initialized && supabase) {
        return supabase;
    }
    
    if (initializationPromise) {
        return initializationPromise;
    }
    
    initializationPromise = performInitialization();
    return initializationPromise;
}

async function performInitialization() {
    try {
        // Try to get config from API first
        let config = await fetchConfigFromAPI();
        
        // Use default config if API fails
        if (!config || !config.supabaseUrl || !config.supabaseAnonKey) {
            console.warn('Using default Supabase configuration');
            config = DEFAULT_CONFIG;
        }
        
        console.log('Initializing Supabase with URL:', config.supabaseUrl);
        
        supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                storage: window.localStorage,
                detectSessionInUrl: true
            }
        });
        
        initialized = true;
        
        // Set up auth state listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('[Auth]', event);
            if (session) {
                window.currentUser = session.user;
                window.currentSession = session;
            } else {
                window.currentUser = null;
                window.currentSession = null;
            }
        });
        
        // Store subscription for cleanup if needed
        window.authSubscription = subscription;
        
        // Check initial session
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
            console.error('Error getting initial session:', error);
        } else if (session) {
            window.currentUser = session.user;
            window.currentSession = session;
            console.log('User already authenticated:', session.user.email);
        } else {
            console.log('No active session found');
        }
        
        // Make Supabase available globally
        window.supabase = supabase;
        
        return supabase;
    } catch (error) {
        console.error('Failed to initialize Supabase:', error);
        initialized = false;
        initializationPromise = null;
        throw error;
    }
}

// Export functions
export { initializeSupabase };
export function getSupabase() {
    if (!initialized || !supabase) {
        throw new Error('Supabase client not initialized. Call initializeSupabase() first.');
    }
    return supabase;
}

// Safe getter that waits for initialization
export async function getSupabaseAsync() {
    if (!initialized) {
        await initializeSupabase();
    }
    return getSupabase();
}

// Auto-initialize on load
if (typeof window !== 'undefined') {
    window.initializeSupabase = initializeSupabase;
    window.getSupabase = () => {
        if (initialized && supabase) {
            return supabase;
        }
        console.warn('Supabase not yet initialized, initializing now...');
        initializeSupabase().then(() => {
            console.log('Supabase initialized successfully');
        }).catch(err => {
            console.error('Failed to auto-initialize Supabase:', err);
        });
        return null;
    };
    window.getSupabaseAsync = getSupabaseAsync;
    
    // Initialize immediately
    console.log('Starting Supabase auto-initialization...');
    initializeSupabase().catch(err => {
        console.error('Initial Supabase setup failed:', err);
    });
}

// Auth helper functions
export async function requireAuth() {
    const supabase = await getSupabaseAsync();
    
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
            console.error('Auth error:', error);
            throw error;
        }
        
        if (!user) {
            throw new Error('User not authenticated');
        }
        
        console.log('✅ User authenticated:', user.email);
        return user;
    } catch (error) {
        console.error('❌ Authentication check failed:', error);
        // Redirect to login if not on login page
        if (!window.location.pathname.includes('login.html')) {
            console.log('🔄 Redirecting to login...');
            window.location.href = '/login.html';
        }
        throw error;
    }
}

export async function getUser() {
    const supabase = await getSupabaseAsync();
    return await supabase.auth.getUser();
}

// Safe session check that doesn't redirect
export async function checkSession() {
    try {
        const supabase = await getSupabaseAsync();
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
            console.warn('Session check error:', error);
            return null;
        }
        
        return session;
    } catch (error) {
        console.warn('Session check failed:', error);
        return null;
    }
}

// Export Supabase instance for backward compatibility
// TODO: Remove direct supabase export in favor of getSupabase() to ensure proper initialization
export { supabase };