// File auth.js corretto - SOSTITUISCI COMPLETAMENTE IL CONTENUTO ESISTENTE

// Configurazione
const AUTH_CONFIG = {
    publicPages: ['login.html', 'register.html', 'index.html', ''],
    loginPage: 'login.html',
    defaultPage: 'dashboard.html'
};

// Funzione principale di controllo autenticazione
function checkAuth() {
    const currentPage = window.location.pathname.split('/').pop();
    const isPublicPage = AUTH_CONFIG.publicPages.includes(currentPage);
    const authToken = localStorage.getItem('authToken');
    
    // Se siamo già sulla pagina di login, non fare nulla
    if (currentPage === 'login.html') {
        // Se c'è un token valido, vai alla dashboard
        if (authToken && isTokenValid(authToken)) {
            window.location.replace(AUTH_CONFIG.defaultPage);
        }
        return true;
    }
    
    // Se siamo su una pagina pubblica, permettiamo l'accesso
    if (isPublicPage) {
        return true;
    }
    
    // Per le pagine protette, verifica il token
    if (!authToken || !isTokenValid(authToken)) {
        // Pulisci storage prima del redirect
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        // Usa replace invece di href per evitare loop con history
        window.location.replace(AUTH_CONFIG.loginPage);
        return false;
    }
    
    return true;
}

// Verifica validità token
function isTokenValid(token) {
    if (!token) return false;
    
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return false;
        
        const payload = JSON.parse(atob(parts[1]));
        
        // Se non c'è exp, consideriamo il token valido
        if (!payload.exp) return true;
        
        // Verifica scadenza
        const now = Math.floor(Date.now() / 1000);
        return payload.exp > now;
    } catch (error) {
        console.error('Errore validazione token:', error);
        return false;
    }
}

// Funzione di login
async function login(email, password) {
    try {
        // Simulazione login - sostituisci con la tua API
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        if (!response.ok) {
            throw new Error('Credenziali non valide');
        }
        
        const data = await response.json();
        
        // Salva token e dati utente
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        
        // Redirect alla dashboard
        window.location.replace(AUTH_CONFIG.defaultPage);
        
        return { success: true };
    } catch (error) {
        console.error('Errore login:', error);
        return { success: false, error: error.message };
    }
}

// Funzione di logout
function logout() {
    // Pulisci tutto lo storage
    localStorage.clear();
    sessionStorage.clear();
    
    // Redirect con replace per evitare problemi di history
    window.location.replace(AUTH_CONFIG.loginPage);
}

// Ottieni l'utente corrente
function getCurrentUser() {
    const userStr = localStorage.getItem('currentUser');
    if (!userStr) return null;
    
    try {
        return JSON.parse(userStr);
    } catch (error) {
        return null;
    }
}

// Inizializzazione quando il DOM è pronto
document.addEventListener('DOMContentLoaded', function() {
    // Non eseguire checkAuth se siamo già in processo di redirect
    if (!window.location.href.includes('#redirecting')) {
        checkAuth();
    }
});

// Previeni multiple chiamate durante il caricamento
let authChecked = false;
window.addEventListener('load', function() {
    if (!authChecked) {
        authChecked = true;
        checkAuth();
    }
});