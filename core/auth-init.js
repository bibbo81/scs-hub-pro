// auth-init.js - Sistema unificato di autenticazione
(function() {
    'use strict';
    
    // Configurazione
    const config = {
        loginUrl: '/login.html',
        checkInterval: 100,
        maxChecks: 50 // Timeout dopo 5 secondi
    };
    
    // Inizializzazione autenticazione
    window.authInit = {
        // Check e redirect se necessario
        async requireAuth() {
            let checks = 0;
            
            while (!window.auth && checks < config.maxChecks) {
                await new Promise(resolve => setTimeout(resolve, config.checkInterval));
                checks++;
            }
            
            if (!window.auth) {
                console.error('[AuthInit] Auth system not loaded');
                window.location.replace(config.loginUrl);
                return false;
            }
            
            if (!window.auth.isAuthenticated()) {
                console.log('[AuthInit] Not authenticated, redirecting...');
                window.location.replace(config.loginUrl);
                return false;
            }
            
            console.log('[AuthInit] User authenticated');
            return true;
        },
        
        // Formatta nome utente
        formatUserName(user) {
            if (!user) return 'Utente';
            
            // Check display_name personalizzato
            if (user.user_metadata?.display_name && user.user_metadata.display_name !== user.email?.split('@')[0]) {
                return user.user_metadata.display_name;
            }
            
            // Cerca in vari campi
            let fullName = user.user_metadata?.full_name || 
                          user.user_metadata?.name || 
                          '';
            
            // NUOVO: Se non trovato, usa email PRIMA del fallback
            if (!fullName && user.email) {
                fullName = user.email.split('@')[0];
            }
            
            // FISSO: Applica sempre la formattazione, anche se fullName viene da metadata
            if (fullName) {
                return fullName
                    .replace(/[._-]/g, ' ')
                    .split(' ')
                    .filter(w => w.length > 0)
                    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                    .join(' ');
            }
            
            // Ultimo fallback
            return user.email?.split('@')[0] || 'Utente';
        },
        
        // Ottieni iniziali
        getUserInitials(name) {
            const words = name.split(' ').filter(w => w.length > 0);
            if (words.length >= 2) {
                return words[0][0].toUpperCase() + words[1][0].toUpperCase();
            }
            return words[0]?.[0]?.toUpperCase() || 'U';
        },
        
        // Aggiorna UI utente
        updateUserUI() {
            const user = window.auth?.getCurrentUser();
            if (!user) return;
            
            const displayName = this.formatUserName(user);
            const initials = this.getUserInitials(displayName);
            
            // Aggiorna elementi DOM
            const elements = {
                userName: displayName,
                userInitial: initials,
                userFullName: displayName,
                userEmail: user.email || ''
            };
            
            Object.entries(elements).forEach(([id, value]) => {
                const el = document.getElementById(id);
                if (el) el.textContent = value;
            });
        },
        
        // Ottieni token corrente
        getToken() {
            return localStorage.getItem('sb-access-token') || 
                   sessionStorage.getItem('sb-access-token');
        },
        
        // Inizializza pagina protetta
        async init() {
            const isAuthenticated = await this.requireAuth();
            if (!isAuthenticated) return;
            
            // Aggiorna UI quando DOM è pronto
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    this.updateUserUI();
                });
            } else {
                this.updateUserUI();
            }
            
            return true;
        }
    };
    
    // Auto-init su pagine protette
    if (!window.location.pathname.includes('login.html')) {
        window.authInit.init();
    }
})();