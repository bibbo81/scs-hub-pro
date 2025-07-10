// core/auth.js - Sistema di autenticazione semplificato per sviluppo
(function() {
    'use strict';
    
    // Mock auth system per sviluppo
    window.auth = {
        // Dati utente mock
        mockUser: {
            id: 'dev-user-123',
            email: 'demo@supplychainhub.it',
            user_metadata: {
                full_name: 'Demo User',
                display_name: 'Demo User'
            }
        },
        
        // Check se autenticato
        isAuthenticated() {
            // In sviluppo, sempre autenticato se c'è il token mock
            const token = localStorage.getItem('sb-access-token') || 
                         sessionStorage.getItem('sb-access-token');
            
            // Se non c'è token, creane uno mock
            if (!token && window.location.pathname !== '/login.html') {
                const mockToken = 'mock-token-' + Date.now();
                localStorage.setItem('sb-access-token', mockToken);
                return true;
            }
            
            return !!token;
        },
        
        // Get current user
        getCurrentUser() {
            if (this.isAuthenticated()) {
                // Check for persisted user data first
                const savedUser = localStorage.getItem('sb-user-data');
                if (savedUser) {
                    try {
                        return JSON.parse(savedUser);
                    } catch (e) {
                        console.warn('[Auth] Invalid saved user data:', e);
                        localStorage.removeItem('sb-user-data');
                    }
                }
                // Fallback to mock user for compatibility
                return this.mockUser;
            }
            return null;
        },
        
        // Login mock
        async login(email, password) {
            // Simula login
            const mockToken = 'mock-token-' + Date.now();
            localStorage.setItem('sb-access-token', mockToken);
            
            // Create new user object instead of modifying global mockUser
            const loggedInUser = {
                id: 'dev-user-' + Date.now(),
                email: email,
                user_metadata: {
                    full_name: email.split('@')[0],
                    display_name: email.split('@')[0]
                }
            };
            
            // Persist user data in localStorage
            localStorage.setItem('sb-user-data', JSON.stringify(loggedInUser));
            
            // NUOVO: Dispatch auth state change event
            window.dispatchEvent(new CustomEvent('mockAuthStateChange', {
                detail: {
                    event: 'SIGNED_IN',
                    session: { user: loggedInUser }
                }
            }));
            
            return {
                user: loggedInUser,
                session: { access_token: mockToken }
            };
        },
        
        // Logout
        logout() {
            localStorage.removeItem('sb-access-token');
            sessionStorage.removeItem('sb-access-token');
            localStorage.removeItem('sb-user-data');
            
            // NUOVO: Dispatch auth state change event
            window.dispatchEvent(new CustomEvent('mockAuthStateChange', {
                detail: {
                    event: 'SIGNED_OUT',
                    session: null
                }
            }));
            
            window.location.replace('/login.html');
        }
    };
    
    console.log('[Auth] Mock auth system loaded');
})();