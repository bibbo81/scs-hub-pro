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
        
        // Emit custom event for Supabase ready
        const supabaseReadyEvent = new CustomEvent('supabase-ready', {
            detail: {
                supabase: supabase,
                session: session,
                user: session?.user || null
            }
        });
        window.dispatchEvent(supabaseReadyEvent);
        console.log('✅ Supabase ready event emitted');
        
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
    window.waitForSupabaseReady = waitForSupabaseReady;
    window.waitForValidSession = waitForValidSession;
    
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

// Helper function to wait for Supabase to be ready
export function waitForSupabaseReady() {
    return new Promise((resolve) => {
        if (initialized && supabase) {
            resolve({ supabase, session: window.currentSession, user: window.currentUser });
        } else {
            window.addEventListener('supabase-ready', (event) => {
                resolve(event.detail);
            }, { once: true });
        }
    });
}

// Helper function to wait for valid session
export async function waitForValidSession(timeout = 10000) {
    return new Promise(async (resolve, reject) => {
        const timeoutId = setTimeout(() => {
            reject(new Error('Timeout waiting for valid session'));
        }, timeout);
        
        const checkSession = async () => {
            try {
                const session = await checkSession();
                if (session && session.user) {
                    clearTimeout(timeoutId);
                    resolve(session);
                    return true;
                }
            } catch (error) {
                console.warn('Session check failed:', error);
            }
            return false;
        };
        
        // Check immediately
        if (await checkSession()) return;
        
        // Listen for auth state changes
        const handleSupabaseReady = async () => {
            if (await checkSession()) return;
            
            // Set up auth listener
            const supabase = getSupabase();
            const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
                if (session && session.user) {
                    clearTimeout(timeoutId);
                    subscription.unsubscribe();
                    resolve(session);
                }
            });
        };
        
        if (initialized) {
            handleSupabaseReady();
        } else {
            window.addEventListener('supabase-ready', handleSupabaseReady, { once: true });
        }
    });
}

// Export Supabase instance for backward compatibility
// TODO: Remove direct supabase export in favor of getSupabase() to ensure proper initialization
export { supabase };