// auth-guard.js - Sistema di protezione delle pagine migliorato

(function() {
    'use strict';

    // Configurazione
    const config = {
        publicPages: [
            'login.html',
            'register.html',
            'forgot-password.html',
            'index.html'
        ],
        loginPage: '/login.html',
        defaultPage: '/dashboard.html',
        tokenKey: 'authToken',
        userKey: 'currentUser'
    };

    // Funzione per ottenere il nome del file corrente
    function getCurrentFileName() {
        const path = window.location.pathname;
        const parts = path.split('/');
        return parts[parts.length - 1] || 'index.html';
    }

    // Verifica se la pagina corrente è pubblica
    function isPublicPage() {
        const currentFile = getCurrentFileName();
        return config.publicPages.includes(currentFile);
    }

    // Verifica se l'utente è autenticato
    function isAuthenticated() {
        const token = localStorage.getItem(config.tokenKey);
        const user = localStorage.getItem(config.userKey);

        if (token && user) {
            try {
                const parts = token.split('.');
                if (parts.length !== 3) {
                    console.log('Auth: Token format non valido');
                    return false;
                }

                const payload = JSON.parse(atob(parts[1]));
                if (payload.exp && payload.exp * 1000 < Date.now()) {
                    console.log('Auth: Token scaduto');
                    clearAuth();
                    return false;
                }

                return true;
            } catch (e) {
                console.error('Auth: Errore nella verifica del token:', e);
                clearAuth();
                return false;
            }
        }

        return !!(window.currentSession && window.currentUser);
    }

    // Pulisce i dati di autenticazione
    function clearAuth() {
        localStorage.removeItem(config.tokenKey);
        localStorage.removeItem(config.userKey);
        sessionStorage.clear();
    }

    // Funzione di logout
    function logout() {
        clearAuth();
        window.location.href = config.loginPage;
    }

    // Controlla l'accesso alla pagina corrente
    function checkPageAccess() {
        const isPublic = isPublicPage();
        const isAuth = isAuthenticated();
        const currentFile = getCurrentFileName();
        
        console.log('Auth Check:', {
            page: currentFile,
            isPublic: isPublic,
            isAuthenticated: isAuth
        });

        // Se siamo su una pagina pubblica
        if (isPublic) {
            // Se l'utente è autenticato e sta tentando di accedere a login/register
            if (isAuth && (currentFile === 'login.html' || currentFile === 'register.html')) {
                console.log('Auth: Utente autenticato su pagina di login, redirect a dashboard');
                window.location.replace(config.defaultPage);
            }
            return; // Permetti accesso alle pagine pubbliche
        }

        // Se siamo su una pagina protetta e l'utente NON è autenticato
        if (!isAuth) {
            console.log('Auth: Accesso negato, redirect a login');
            // Salva la destinazione per dopo il login
            const currentUrl = window.location.href;
            sessionStorage.setItem('redirectAfterLogin', currentUrl);
            window.location.replace(config.loginPage);
            return;
        }

        // Utente autenticato su pagina protetta - OK
        console.log('Auth: Accesso consentito');
    }

    // Intercetta gli errori 401 nelle chiamate API
    function interceptFetch() {
        const originalFetch = window.fetch;
        if (!originalFetch) return;

        window.fetch = function(...args) {
            return originalFetch.apply(this, args)
                .then(response => {
                    if (response.status === 401) {
                        console.log('Auth: Ricevuto 401, eseguo logout');
                        logout();
                    }
                    return response;
                });
        };
    }

    // Gestisce i cambiamenti di storage (altre tab)
    function handleStorageChange(e) {
        if (e.key === config.tokenKey && !e.newValue) {
            console.log('Auth: Token rimosso da altra tab, eseguo logout');
            window.location.replace(config.loginPage);
        }
    }

    // Inizializzazione
    function init() {
        // Controlla accesso solo se non siamo già in fase di redirect
        if (!window.location.href.includes('#redirecting')) {
            checkPageAccess();
        }

        // Setup intercettori
        interceptFetch();
        
        // Ascolta cambiamenti storage
        window.addEventListener('storage', handleStorageChange);

        // Esponi API globale
        window.AuthGuard = {
            isAuthenticated: isAuthenticated,
            logout: logout,
            checkAuth: checkPageAccess
        };
    }

    // Avvia quando DOM è pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();