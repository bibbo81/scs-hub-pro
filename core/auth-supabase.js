// core/auth-supabase.js - Bridge Supabase Authentication System
// Unifica l'autenticazione Supabase per tutto il progetto

import { supabase, auth } from '/core/services/supabase-client.js';

class SupabaseAuthBridge {
    constructor() {
        this.initialized = false;
        this.currentUser = null;
        this.authStateListeners = [];
        this.init();
    }

    async init() {
        if (this.initialized) return;

        try {
            console.log('[SupabaseAuth] Initializing bridge...');
            
            // Setup auth state listener
            supabase.auth.onAuthStateChange((event, session) => {
                console.log('[SupabaseAuth] Auth state change:', event, session?.user?.id);
                this.handleAuthStateChange(event, session);
            });

            // Check initial session
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error) {
                console.error('[SupabaseAuth] Error getting initial session:', error);
            } else if (session) {
                this.currentUser = session.user;
                console.log('[SupabaseAuth] Initial session found:', session.user.email || 'Anonymous');
            }

            this.initialized = true;
            console.log('[SupabaseAuth] Bridge initialized successfully');

        } catch (error) {
            console.error('[SupabaseAuth] Initialization error:', error);
        }
    }

    handleAuthStateChange(event, session) {
        this.currentUser = session?.user || null;
        
        // Notify all listeners
        this.authStateListeners.forEach(listener => {
            try {
                listener(event, session);
            } catch (error) {
                console.error('[SupabaseAuth] Listener error:', error);
            }
        });

        // Update UI if header component exists
        if (window.headerComponent && window.headerComponent.invalidateUserCache) {
            window.headerComponent.invalidateUserCache();
        }

        // Dispatch global event for other components
        window.dispatchEvent(new CustomEvent('authStateChange', {
            detail: { event, session, user: session?.user }
        }));
    }

    // Public API methods
    async signIn(email, password) {
        return await auth.signIn(email, password);
    }

    async signUp(email, password, metadata = {}) {
        return await auth.signUp(email, password, metadata);
    }

    async signOut() {
        return await auth.signOut();
    }

    async getUser() {
        return await auth.getUser();
    }

    async getSession() {
        const { data: { session }, error } = await supabase.auth.getSession();
        return { session, error };
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isAuthenticated() {
        return !!this.currentUser;
    }

    onAuthStateChange(callback) {
        this.authStateListeners.push(callback);
        
        // Return unsubscribe function
        return () => {
            const index = this.authStateListeners.indexOf(callback);
            if (index > -1) {
                this.authStateListeners.splice(index, 1);
            }
        };
    }

    // Legacy compatibility methods
    async requireAuth() {
        if (!this.isAuthenticated()) {
            // Try to get fresh session
            const { session, error } = await this.getSession();
            if (error || !session) {
                console.log('[SupabaseAuth] Authentication required, redirecting...');
                window.location.href = '/login.html';
                return false;
            }
            this.currentUser = session.user;
        }
        return true;
    }

    // Mock mode compatibility
    async createMockUser() {
        const mockUser = {
            id: 'mock-' + Date.now(),
            email: 'demo@supplychainhub.it',
            user_metadata: {
                full_name: 'Demo User'
            },
            created_at: new Date().toISOString()
        };
        
        this.currentUser = mockUser;
        this.handleAuthStateChange('SIGNED_IN', { user: mockUser });
        
        return mockUser;
    }

    // Anonymous sign in (for demo purposes)
    async signInAnonymously() {
        try {
            const { data, error } = await supabase.auth.signInAnonymously();
            if (error) {
                console.warn('[SupabaseAuth] Anonymous sign-in failed, creating mock user');
                return { user: await this.createMockUser(), session: null };
            }
            return data;
        } catch (error) {
            console.warn('[SupabaseAuth] Anonymous sign-in not available, creating mock user');
            return { user: await this.createMockUser(), session: null };
        }
    }
}

// Create and export singleton instance
const supabaseAuth = new SupabaseAuthBridge();

// Make it globally available
window.supabaseAuth = supabaseAuth;

// Also expose as legacy auth for backward compatibility
if (!window.auth || window.auth.mockUser) {
    window.auth = {
        isAuthenticated: () => supabaseAuth.isAuthenticated(),
        getCurrentUser: () => supabaseAuth.getCurrentUser(),
        login: (email, password) => supabaseAuth.signIn(email, password),
        logout: () => supabaseAuth.signOut(),
        requireAuth: () => supabaseAuth.requireAuth()
    };
}

export default supabaseAuth;