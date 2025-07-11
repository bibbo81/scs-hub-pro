// core/services/supabase-client.js - Fixed initialization
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

let supabase = null;
let initializationPromise = null;
let initialized = false;
let supabaseReadyPromise = null;
let supabaseReadyResolve = null;
let supabaseReadyReject = null;
let sessionReady = false;

// Create the global supabaseReady Promise immediately
supabaseReadyPromise = new Promise((resolve, reject) => {
    supabaseReadyResolve = (value) => {
        clearTimeout(initializationTimeout);
        resolve(value);
    };
    supabaseReadyReject = (error) => {
        clearTimeout(initializationTimeout);
        reject(error);
    };
});

// Timeout to avoid hanging forever on initialization
const initializationTimeout = setTimeout(() => {
    if (!window.supabaseReadyResolved && supabaseReadyReject) {
        supabaseReadyReject(new Error('Supabase initialization timeout'));
    }
}, 5000);

// Make it available globally
if (typeof window !== 'undefined') {
    window.supabaseReady = supabaseReadyPromise;
}

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
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('[Auth State Change]', event, session?.user?.email || 'No user');
            
            if (session) {
                window.currentUser = session.user;
                window.currentSession = session;
                sessionReady = true;
                
                // Resolve the global Promise when both Supabase is initialized AND session is valid
                if (initialized && !window.supabaseReadyResolved) {
                    console.log('✅ Supabase and session are ready!');
                    supabaseReadyResolve({
                        supabase,
                        session,
                        user: session.user,
                        timestamp: new Date().toISOString()
                    });
                    window.supabaseReadyResolved = true;
                }
            } else {
                window.currentUser = null;
                window.currentSession = null;
                sessionReady = false;
                
                // If user logs out, redirect to login (unless already on login page)
                if (event === 'SIGNED_OUT' && !window.location.pathname.includes('login.html')) {
                    console.log('🔄 User signed out, redirecting to login...');
                    setTimeout(() => {
                        window.location.href = '/login.html';
                    }, 1000);
                }
            }
        });
        
        // Store subscription for cleanup if needed
        window.authSubscription = subscription;
        
        // Check initial session
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
            console.error('❌ Error getting initial session:', error);
            // If on a protected page and no session, redirect to login
            if (!window.location.pathname.includes('login.html')) {
                console.log('🔄 Redirecting to login due to session error...');
                setTimeout(() => {
                    window.location.href = '/login.html';
                }, 1000);
            }
        } else if (session) {
            window.currentUser = session.user;
            window.currentSession = session;
            sessionReady = true;
            console.log('✅ User already authenticated:', session.user.email);
            
            // Resolve the global Promise immediately if we have a valid session
            if (!window.supabaseReadyResolved) {
                console.log('✅ Supabase and session are ready (initial check)!');
                supabaseReadyResolve({
                    supabase,
                    session,
                    user: session.user,
                    timestamp: new Date().toISOString()
                });
                window.supabaseReadyResolved = true;
            }
        } else {
            console.log('⚠️ No active session found');
            sessionReady = false;
            // If on a protected page and no session, redirect to login
            if (!window.location.pathname.includes('login.html')) {
                console.log('🔄 Redirecting to login - no session found...');
                setTimeout(() => {
                    window.location.href = '/login.html';
                }, 1000);
            }
        }
        
        // Make Supabase available globally
        window.supabase = supabase;

        // Note: We don't emit custom events here anymore since we use the Promise pattern
        console.log('✅ Supabase client initialized');

        return supabase;
    } catch (error) {
        console.error('Failed to initialize Supabase:', error);
        initialized = false;
        initializationPromise = null;
        if (supabaseReadyReject) {
            supabaseReadyReject(error);
        }
        throw error;
    }
}

// Export functions
export { initializeSupabase };

export function getSupabase() {
    if (!initialized || !supabase) {
        console.warn('⚠️ Supabase client not initialized. Use getSupabaseAsync() or wait for window.supabaseReady');
        return null;
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

// Safe getter that waits for both initialization AND valid session
export async function getSupabaseWithSession() {
    // Wait for the global Promise that resolves when both Supabase and session are ready
    await window.supabaseReady;
    return getSupabase();
}

// Helper to check if session is ready
export function isSessionReady() {
    return sessionReady && window.currentSession && window.currentUser;
}

// Helper to wait for session (throws if not available after timeout)
export async function waitForSession(timeoutMs = 10000) {
    if (isSessionReady()) {
        return window.currentSession;
    }
    
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error('Session timeout: No valid session found after ' + timeoutMs + 'ms'));
        }, timeoutMs);
        
        // Listen for session changes
        const checkSession = () => {
            if (isSessionReady()) {
                clearTimeout(timeout);
                resolve(window.currentSession);
            }
        };
        
        // Check periodically
        const interval = setInterval(() => {
            checkSession();
        }, 100);
        
        // Cleanup interval when resolved
        const originalResolve = resolve;
        resolve = (value) => {
            clearInterval(interval);
            originalResolve(value);
        };
        
        // Check immediately
        checkSession();
    });
}

// Auto-initialize on load
if (typeof window !== 'undefined') {
    window.initializeSupabase = initializeSupabase;
    window.getSupabase = getSupabase;
    window.getSupabaseAsync = getSupabaseAsync;
    window.getSupabaseWithSession = getSupabaseWithSession;
    window.isSessionReady = isSessionReady;
    window.waitForSession = waitForSession;
    
    // Initialize immediately
    console.log('🚀 Starting Supabase auto-initialization...');
    initializeSupabase().catch(err => {
        console.error('❌ Initial Supabase setup failed:', err);
    });
}

// Auth helper functions with better error handling
export async function requireAuth() {
    try {
        // Wait for Supabase to be ready with a valid session
        await window.supabaseReady;
        
        if (!window.currentUser || !window.currentSession) {
            throw new Error('User not authenticated');
        }
        
        console.log('✅ User authenticated:', window.currentUser.email);
        return window.currentUser;
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
    try {
        await window.supabaseReady;
        return { data: { user: window.currentUser }, error: null };
    } catch (error) {
        return { data: { user: null }, error };
    }
}

// Safe session check that doesn't redirect
export async function checkSession() {
    try {
        // Wait for Supabase to be ready (this will throw if no session)
        await window.supabaseReady;
        return window.currentSession;
    } catch (error) {
        console.warn('⚠️ No valid session available:', error.message);
        return null;
    }
}