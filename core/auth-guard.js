// core/auth-guard.js - Middleware per proteggere le pagine
import { supabase } from './services/supabase-client.js';

class AuthGuard {
    constructor() {
        this.publicPages = ['/login.html', '/index.html', '/'];
        this.redirectUrl = '/login.html';
        this.initialized = false;
    }

    // Inizializza il guard
    async init() {
        if (this.initialized) return;
        
        console.log('[AuthGuard] Initializing...');
        
        // Ascolta i cambiamenti di stato auth
        supabase.auth.onAuthStateChange((event, session) => {
            console.log('[AuthGuard] Auth state changed:', event);
            
            if (event === 'SIGNED_OUT') {
                // Se l'utente fa logout, redirect al login
                if (!this.isPublicPage()) {
                    window.location.href = this.redirectUrl;
                }
            }
        });
        
        this.initialized = true;
    }

    // Verifica se la pagina corrente è pubblica
    isPublicPage() {
        const currentPath = window.location.pathname;
        return this.publicPages.some(page => 
            currentPath === page || currentPath.endsWith(page)
        );
    }

    // Verifica autenticazione
    async checkAuth() {
        try {
            console.log('[AuthGuard] Checking authentication...');
            
            // Se siamo su una pagina pubblica, non fare nulla
            if (this.isPublicPage()) {
                console.log('[AuthGuard] Public page, skipping auth check');
                return true;
            }
            
            // Ottieni la sessione corrente
            const { data: { session }, error } = await supabase.auth.getSession();
            
            if (error) {
                console.error('[AuthGuard] Error getting session:', error);
                return false;
            }
            
            if (!session) {
                console.log('[AuthGuard] No session found, redirecting to login...');
                
                // Salva la pagina di destinazione per redirect dopo login
                sessionStorage.setItem('redirectAfterLogin', window.location.href);
                
                // Redirect al login
                window.location.href = this.redirectUrl;
                return false;
            }
            
            console.log('[AuthGuard] User authenticated:', session.user.email || 'Anonymous');
            
            // Verifica se l'utente ha completato l'onboarding (opzionale)
            if (session.user && !session.user.email && !this.isOnboardingComplete()) {
                console.log('[AuthGuard] Anonymous user needs onboarding');
                // Potresti voler mostrare un banner o modal per completare la registrazione
                this.showAnonymousUserBanner();
            }
            
            return true;
            
        } catch (error) {
            console.error('[AuthGuard] Unexpected error:', error);
            return false;
        }
    }

    // Verifica se l'onboarding è completo (per utenti anonimi)
    isOnboardingComplete() {
        return localStorage.getItem('onboardingComplete') === 'true';
    }

    // Mostra banner per utenti anonimi
    showAnonymousUserBanner() {
        // Controlla se il banner è già stato dismissato
        if (sessionStorage.getItem('anonymousBannerDismissed')) return;
        
        // Crea il banner solo se non esiste già
        if (document.querySelector('.auth-anonymous-banner')) return;
        
        const banner = document.createElement('div');
        banner.className = 'auth-anonymous-banner';
        banner.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 1rem;
            text-align: center;
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 1rem;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        `;
        
        banner.innerHTML = `
            <i class="fas fa-info-circle"></i>
            <span>Stai usando un account demo. 
                <a href="/login.html" style="color: white; text-decoration: underline; font-weight: bold;">
                    Registrati
                </a> 
                per salvare i tuoi dati permanentemente.
            </span>
            <button onclick="this.closest('.auth-anonymous-banner').remove(); sessionStorage.setItem('anonymousBannerDismissed', 'true')" 
                    style="background: none; border: none; color: white; cursor: pointer; padding: 0.5rem;">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        document.body.prepend(banner);
    }

    // Ottieni info utente corrente
    async getCurrentUser() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            return user;
        } catch (error) {
            console.error('[AuthGuard] Error getting user:', error);
            return null;
        }
    }

    // Logout
    async logout() {
        try {
            console.log('[AuthGuard] Logging out...');
            const { error } = await supabase.auth.signOut();
            
            if (error) throw error;
            
            // Clear local data
            localStorage.removeItem('onboardingComplete');
            sessionStorage.clear();
            
            // Redirect to login
            window.location.href = this.redirectUrl;
            
        } catch (error) {
            console.error('[AuthGuard] Logout error:', error);
            // Force redirect anyway
            window.location.href = this.redirectUrl;
        }
    }

    // Gestisci redirect dopo login
    handlePostLoginRedirect() {
        const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
        if (redirectUrl) {
            sessionStorage.removeItem('redirectAfterLogin');
            window.location.href = redirectUrl;
            return true;
        }
        return false;
    }
}

// Crea istanza singleton
const authGuard = new AuthGuard();

// Auto-inizializza quando il DOM è pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        await authGuard.init();
        await authGuard.checkAuth();
    });
} else {
    // DOM già caricato
    authGuard.init().then(() => authGuard.checkAuth());
}

// Esporta per uso globale
export default authGuard;
window.authGuard = authGuard;