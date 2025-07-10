// core/auth-ui-component.js
import notificationSystem from '/core/notification-system.js';

class AuthUIComponent {
    constructor() {
        this.currentUser = null;
        this.isAnonymous = true;
        this.authStateListeners = [];
        this.initialized = false;
        
        // Determina quale sistema auth usare
        this.useSupabase = !!window.supabaseClient;
        this.authSystem = null;
        
        this.init();
    }
    
    async init() {
        if (this.initialized) return;
        
        // Configura il sistema di autenticazione
        if (this.useSupabase) {
            // Usa Supabase
            const { auth } = await import('/core/services/supabase-client.js');
            this.authSystem = auth;
            
            // Ascolta i cambiamenti di stato auth
            auth.onAuthStateChange((event, session) => {
                console.log('🔐 Auth state changed:', event, session?.user?.id);
                this.handleAuthStateChange(event, session);
            });
            
            // Controlla lo stato iniziale
            const user = await auth.getUser();
            if (user) {
                this.currentUser = user;
                this.isAnonymous = !user.email;
            }
        } else {
            // Usa sistema mock
            this.authSystem = window.auth;
            
            // Controlla lo stato iniziale
            const user = this.authSystem.getCurrentUser();
            if (user) {
                this.currentUser = user;
                this.isAnonymous = false;
            } else {
                // In modalità mock, crea un utente anonimo
                this.currentUser = { id: 'anon-' + Date.now(), email: null };
                this.isAnonymous = true;
            }
        }
        
        this.updateUIState();
        this.initialized = true;
    }
    
    handleAuthStateChange(event, session) {
        this.currentUser = session?.user || null;
        this.isAnonymous = this.currentUser && !this.currentUser.email;
        
        this.updateUIState();
        
        // Notifica i listener
        this.authStateListeners.forEach(listener => listener(event, session));
        
        // Mostra notifiche appropriate
        switch (event) {
            case 'SIGNED_IN':
                if (!this.isAnonymous) {
                    notificationSystem.success('Accesso effettuato con successo!');
                }
                break;
            case 'SIGNED_OUT':
                notificationSystem.info('Disconnesso. Modalità anonima attivata.');
                break;
            case 'USER_UPDATED':
                notificationSystem.success('Profilo aggiornato con successo!');
                break;
        }
    }
    
    updateUIState() {
        // Aggiorna l'indicatore di stato nell'header
        this.updateHeaderAuthIndicator();
        
        // Aggiorna il menu utente
        this.updateUserMenu();
        
        // Mostra/nascondi elementi UI basati sullo stato
        this.toggleAuthElements();
        
        // Aggiorna UI usando authInit se disponibile
        if (window.authInit) {
            window.authInit.updateUserUI();
        }
    }
    
    updateHeaderAuthIndicator() {
        // Trova o crea l'indicatore di stato auth nell'header
        let indicator = document.getElementById('auth-status-indicator');
        
        if (!indicator) {
            const headerRight = document.querySelector('.sol-header-right');
            if (!headerRight) return;
            
            indicator = document.createElement('div');
            indicator.id = 'auth-status-indicator';
            indicator.className = 'auth-status-indicator';
            
            // Inserisci prima del bottone utente
            const userBtn = document.getElementById('userMenuBtn');
            if (userBtn) {
                headerRight.insertBefore(indicator, userBtn);
            } else {
                headerRight.appendChild(indicator);
            }
        }
        
        if (this.isAnonymous) {
            indicator.innerHTML = `
                <button class="sol-btn sol-btn-primary sol-btn-sm" onclick="window.authUI.showLoginModal()">
                    <i class="fas fa-sign-in-alt"></i>
                    <span class="hide-mobile">Accedi</span>
                </button>
            `;
        } else {
           // NUOVO: Usa formatUserName per consistenza
           const displayName = window.authInit ? 
               window.authInit.formatUserName(this.currentUser) :
               (this.currentUser?.user_metadata?.full_name || 
                this.currentUser?.user_metadata?.name ||
                this.currentUser?.email?.split('@')[0] ||
                'Utente');
            
            indicator.innerHTML = `
                <div class="auth-user-info">
                    <i class="fas fa-user-check text-success"></i>
                    <span class="auth-user-email" title="${this.currentUser.email}">${displayName}</span>
                </div>
            `;
        }
    }
    
    updateUserMenu() {
        const userEmail = document.querySelector('.user-email');
        const userName = document.querySelector('.user-name');
        
        if (userEmail) {
            userEmail.textContent = this.isAnonymous ? 'Utente Anonimo' : (this.currentUser.email || 'Utente');
        }
        
        if (userName) {
            if (this.isAnonymous) {
                userName.textContent = 'Modalità Demo';
            } else {
                // NUOVO: Usa formatUserName per consistenza
                const displayName = window.authInit ? 
                    window.authInit.formatUserName(this.currentUser) :
                    (this.currentUser?.user_metadata?.full_name || 
                     this.currentUser?.user_metadata?.name ||
                     this.currentUser?.email?.split('@')[0] || 'Utente');
                userName.textContent = displayName;
            }
        }
        
        // Aggiorna le opzioni del menu
        this.updateUserMenuOptions();
    }
    
    updateUserMenuOptions() {
        const dropdownBody = document.querySelector('#userDropdown .sol-dropdown-body');
        if (!dropdownBody) return;
        
        if (this.isAnonymous) {
            // Aggiungi opzione per registrarsi
            if (!document.getElementById('registerOption')) {
                const registerOption = document.createElement('a');
                registerOption.id = 'registerOption';
                registerOption.href = '#';
                registerOption.className = 'sol-dropdown-item';
                registerOption.innerHTML = '<i class="fas fa-user-plus"></i> Registrati per salvare i dati';
                registerOption.onclick = (e) => {
                    e.preventDefault();
                    this.showRegisterModal();
                };
                
                dropdownBody.insertBefore(registerOption, dropdownBody.firstChild);
            }
        } else {
            // Rimuovi opzione registrazione se presente
            const registerOption = document.getElementById('registerOption');
            if (registerOption) registerOption.remove();
        }
    }
    
    toggleAuthElements() {
        // Mostra/nascondi elementi basati sullo stato auth
        document.querySelectorAll('[data-auth-required]').forEach(el => {
            el.style.display = this.isAnonymous ? 'none' : '';
        });
        
        document.querySelectorAll('[data-anon-only]').forEach(el => {
            el.style.display = this.isAnonymous ? '' : 'none';
        });
    }
    
    // ===== MODAL METHODS =====
    
    showLoginModal() {
        if (!this.useSupabase) {
            // In modalità mock, simula login immediato
            this.mockLogin();
            return;
        }
        
        const modal = window.ModalSystem.show({
            title: 'Accedi al tuo account',
            size: 'sm',
            content: this.renderLoginForm(),
            buttons: []
        });
        
        // Setup form handlers
        this.setupLoginFormHandlers(modal.id);
    }
    
    showRegisterModal() {
        if (!this.useSupabase) {
            // In modalità mock, simula registrazione
            notificationSystem.info('Registrazione disponibile solo con Supabase attivo');
            return;
        }
        
        const modal = window.ModalSystem.show({
            title: 'Crea un nuovo account',
            size: 'sm',
            content: this.renderRegisterForm(),
            buttons: []
        });
        
        // Setup form handlers
        this.setupRegisterFormHandlers(modal.id);
    }
    
    renderLoginForm() {
        return `
            <form id="loginForm" class="auth-form">
                <div class="auth-form-header">
                    <p class="auth-form-subtitle">
                        ${this.useSupabase ? 
                            'Accedi per sincronizzare i tuoi tracking su tutti i dispositivi' :
                            'Modalità Demo - Login simulato'
                        }
                    </p>
                </div>
                
                <div class="sol-form-group">
                    <label class="sol-form-label" for="loginEmail">Email</label>
                    <input 
                        type="email" 
                        id="loginEmail" 
                        class="sol-form-input" 
                        placeholder="mario@esempio.it"
                        value="${!this.useSupabase ? 'demo@supplychainhub.it' : ''}"
                        required
                        autocomplete="email"
                    >
                </div>
                
                <div class="sol-form-group">
                    <label class="sol-form-label" for="loginPassword">Password</label>
                    <input 
                        type="password" 
                        id="loginPassword" 
                        class="sol-form-input" 
                        placeholder="••••••••"
                        value="${!this.useSupabase ? 'demo123' : ''}"
                        required
                        autocomplete="current-password"
                    >
                </div>
                
                <div class="auth-form-actions">
                    <button type="submit" class="sol-btn sol-btn-primary sol-btn-block">
                        <i class="fas fa-sign-in-alt"></i>
                        Accedi
                    </button>
                </div>
                
                ${this.useSupabase ? `
                    <div class="auth-form-footer">
                        <p>Non hai un account? 
                            <a href="#" onclick="window.authUI.switchToRegister(event)">
                                Registrati
                            </a>
                        </p>
                        <p>
                            <a href="#" onclick="window.authUI.showPasswordReset(event)" class="text-muted">
                                Password dimenticata?
                            </a>
                        </p>
                    </div>
                ` : `
                    <div class="auth-form-footer">
                        <p class="text-muted text-sm">
                            <i class="fas fa-info-circle"></i>
                            Modalità Demo - Clicca Accedi per continuare
                        </p>
                    </div>
                `}
            </form>
        `;
    }
    
    renderRegisterForm() {
        const trackingCount = this.getAnonymousTrackingCount();
        
        return `
            <form id="registerForm" class="auth-form">
                <div class="auth-form-header">
                    ${trackingCount > 0 ? `
                        <div class="auth-info-box">
                            <i class="fas fa-info-circle"></i>
                            <p>Hai ${trackingCount} tracking che verranno salvati nel tuo account</p>
                        </div>
                    ` : ''}
                    <p class="auth-form-subtitle">
                        Crea un account per salvare e sincronizzare i tuoi tracking
                    </p>
                </div>
                
                <div class="sol-form-group">
                    <label class="sol-form-label" for="registerEmail">Email</label>
                    <input 
                        type="email" 
                        id="registerEmail" 
                        class="sol-form-input" 
                        placeholder="mario@esempio.it"
                        required
                        autocomplete="email"
                    >
                </div>
                
                <div class="sol-form-group">
                    <label class="sol-form-label" for="registerPassword">Password</label>
                    <input 
                        type="password" 
                        id="registerPassword" 
                        class="sol-form-input" 
                        placeholder="Almeno 6 caratteri"
                        required
                        autocomplete="new-password"
                        minlength="6"
                    >
                    <small class="sol-form-hint">Minimo 6 caratteri</small>
                </div>
                
                <div class="sol-form-group">
                    <label class="sol-form-label" for="registerPasswordConfirm">Conferma Password</label>
                    <input 
                        type="password" 
                        id="registerPasswordConfirm" 
                        class="sol-form-input" 
                        placeholder="••••••••"
                        required
                        autocomplete="new-password"
                    >
                </div>
                
                <div class="auth-form-actions">
                    <button type="submit" class="sol-btn sol-btn-primary sol-btn-block">
                        <i class="fas fa-user-plus"></i>
                        Crea Account
                    </button>
                </div>
                
                <div class="auth-form-footer">
                    <p>Hai già un account? 
                        <a href="#" onclick="window.authUI.switchToLogin(event)">
                            Accedi
                        </a>
                    </p>
                    <p class="text-muted text-sm">
                        Creando un account accetti i nostri 
                        <a href="/terms" target="_blank">Termini di Servizio</a>
                    </p>
                </div>
            </form>
        `;
    }
    
    async mockLogin() {
        const modal = window.ModalSystem.progress({
            title: 'Accesso in corso',
            message: 'Autenticazione...'
        });
        
        // Simula delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Esegui login mock
        const result = await window.auth.login('demo@supplychainhub.it', 'demo123');
        
        this.currentUser = result.user;
        this.isAnonymous = false;
        
        modal.close();
        
        // NUOVO: Forza aggiornamento UI completo
        this.updateUIState();
        
        // NUOVO: Aggiorna anche authInit se disponibile
        if (window.authInit) {
            window.authInit.updateUserUI();
        }
        
        // Trigger stato change
        this.handleAuthStateChange('SIGNED_IN', { user: result.user });
        
        // Ricarica la pagina per aggiornare tutto
        setTimeout(() => {
            window.location.reload();
        }, 500);
    }
    
    setupLoginFormHandlers(modalId) {
        const form = document.getElementById('loginForm');
        if (!form) return;
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            const submitBtn = form.querySelector('button[type="submit"]');
            
            // Disabilita il form
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Accesso in corso...';
            
            try {
                if (this.useSupabase) {
                    const { data, error } = await this.authSystem.signIn(email, password);
                    if (error) throw error;
                } else {
                    // Mock login
                    await this.authSystem.login(email, password);
                }
                
                // Chiudi il modal
                window.ModalSystem.close(modalId);
                
                // Ricarica per aggiornare stato
                setTimeout(() => {
                    window.location.reload();
                }, 500);
                
            } catch (error) {
                console.error('Login error:', error);
                notificationSystem.error(
                    error.message === 'Invalid login credentials' 
                        ? 'Email o password non corretti' 
                        : 'Errore durante l\'accesso: ' + error.message
                );
                
                // Riabilita il form
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Accedi';
            }
        });
    }
    
    setupRegisterFormHandlers(modalId) {
        const form = document.getElementById('registerForm');
        if (!form) return;
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            const passwordConfirm = document.getElementById('registerPasswordConfirm').value;
            const submitBtn = form.querySelector('button[type="submit"]');
            
            // Validazione password
            if (password !== passwordConfirm) {
                notificationSystem.error('Le password non coincidono');
                return;
            }
            
            if (password.length < 6) {
                notificationSystem.error('La password deve essere di almeno 6 caratteri');
                return;
            }
            
            // Disabilita il form
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creazione account...';
            
            try {
                // Solo con Supabase
                const { data, error } = await this.authSystem.signUp(email, password);
                
                if (error) throw error;
                
                // Chiudi il modal
                window.ModalSystem.close(modalId);
                
                notificationSystem.success(
                    'Account creato con successo! Controlla la tua email per confermare la registrazione.',
                    { duration: 6000 }
                );
                
            } catch (error) {
                console.error('Registration error:', error);
                
                let errorMessage = 'Errore durante la registrazione: ';
                if (error.message.includes('already registered')) {
                    errorMessage = 'Questa email è già registrata';
                } else {
                    errorMessage += error.message;
                }
                
                notificationSystem.error(errorMessage);
                
                // Riabilita il form
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-user-plus"></i> Crea Account';
            }
        });
    }
    
    // ===== UTILITY METHODS =====
    
    switchToLogin(event) {
        if (event) event.preventDefault();
        window.ModalSystem.closeAll();
        setTimeout(() => this.showLoginModal(), 100);
    }
    
    switchToRegister(event) {
        if (event) event.preventDefault();
        window.ModalSystem.closeAll();
        setTimeout(() => this.showRegisterModal(), 100);
    }
    
    showPasswordReset(event) {
        if (event) event.preventDefault();
        
        window.ModalSystem.confirm({
            title: 'Reset Password',
            message: 'Funzionalità in arrivo. Per ora contatta il supporto.',
            confirmText: 'OK',
            cancelText: null
        });
    }
    
    getAnonymousTrackingCount() {
        // Conta i tracking salvati
        return window.currentTrackings?.length || 0;
    }
    
    async logout() {
        const confirmed = await window.ModalSystem.confirm({
            title: 'Conferma disconnessione',
            message: this.useSupabase ? 
                'Sei sicuro di voler uscire? Passerai in modalità anonima.' :
                'Sei sicuro di voler uscire?',
            confirmText: 'Disconnetti',
            cancelText: 'Annulla'
        });
        
        if (confirmed) {
            if (this.useSupabase) {
                await this.authSystem.signOut();
            } else {
                window.auth.logout();
            }
        }
    }
    
    // ===== PUBLIC API =====
    
    onAuthStateChange(callback) {
        this.authStateListeners.push(callback);
        return () => {
            this.authStateListeners = this.authStateListeners.filter(l => l !== callback);
        };
    }
    
    isAuthenticated() {
        return this.currentUser && !this.isAnonymous;
    }
    
    getCurrentUser() {
        return this.currentUser;
    }
}

// ===== SINGLETON EXPORT =====
const authUI = new AuthUIComponent();

// Esponi globalmente
window.authUI = authUI;

export default authUI;