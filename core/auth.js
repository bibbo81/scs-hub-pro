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
                return this.mockUser;
            }
            return null;
        },
        
        // Login mock
        async login(email, password) {
            // Simula login
            const mockToken = 'mock-token-' + Date.now();
            localStorage.setItem('sb-access-token', mockToken);
            
            // Aggiorna user mock con email fornita
            this.mockUser.email = email;
            this.mockUser.user_metadata.full_name = email.split('@')[0];
            
            return {
                user: this.mockUser,
                session: { access_token: mockToken }
            };
        },
        
        // Logout
        logout() {
            localStorage.removeItem('sb-access-token');
            sessionStorage.removeItem('sb-access-token');
            window.location.replace('/login.html');
        }
    };
    
    console.log('[Auth] Mock auth system loaded');
})();