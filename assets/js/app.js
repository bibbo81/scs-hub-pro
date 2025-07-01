// app.js - Global application entry point ES6 - FIXED
import api from '/core/api-client.js';
import notificationSystem from '/core/notification-system.js';
import modalSystem from '/core/modal-system.js';
import { supabase } from './core/services/supabase-client.js';

// Import dinamico per headerComponent con versioning
const V = window.APP_VERSION || 'v47.1';
let headerComponent;

(async () => {
    const module = await import(`/core/header-component.js?v=${V}`);
    headerComponent = module.default;
    window.headerComponent = headerComponent; // Esponi globalmente
})();

class Application {
    constructor() {
        // Core modules
        this.modules = {
            auth: null,
            api: null,
            header: null,
            notifications: null,
            modals: null
        };
        
        // Configuration
        this.config = {
            appName: 'Supply Chain Hub',
            version: '2.0.0',
            debug: window.location.hostname === 'localhost'
        };
        
        // Storage (memory-based for dev)
        this.storage = {
            data: {},
            
            get(key) {
                return this.data[key] || null;
            },
            
            set(key, value) {
                this.data[key] = value;
            },
            
            remove(key) {
                delete this.data[key];
            },
            
            clear() {
                this.data = {};
            }
        };
        
        // Flag per prevenire multiple init
        this.initialized = false;
    }
    
    // Initialize application
    async init() {
        // PREVIENI MULTIPLE INIT
        if (this.initialized) {
            console.log('[App] Already initialized, skipping...');
            return;
        }
        
        try {
            console.log(`[${this.config.appName}] Initializing v${this.config.version}...`);
            
            // 1. Check authentication
            const authenticated = await this.initAuth();
            if (!authenticated) {
                console.log('[App] Not authenticated, redirecting to login');
                return;
            }
            
            // 2. Initialize API client
            this.initApi();
            
            // 3. Initialize UI components
            await this.initUI();
            
            // 4. Setup global handlers
            this.setupGlobalHandlers();
            
            // 5. Page-specific initialization
            await this.initPage();
            
            this.initialized = true;
            console.log('[App] Initialization complete');
            
        } catch (error) {
            console.error('[App] Initialization failed:', error);
            notificationSystem.error('Errore durante l\'inizializzazione dell\'applicazione');
        }
    }
    
    // Initialize authentication
    async initAuth() {
        if (!window.authInit) {
            console.error('[App] Auth module not loaded');
            return false;
        }
        
        const authenticated = await window.authInit.init();
        this.modules.auth = window.auth;
        return authenticated;
    }
    
    // Initialize API client
    initApi() {
        if (!api) {
            console.error('[App] API client not loaded');
            return;
        }
        
        // Add global interceptors
        api.addRequestInterceptor(async (config) => {
            if (this.config.debug) {
                console.log('[API Request]', config);
            }
        });
        
        api.addResponseInterceptor(async (data, response) => {
            if (this.config.debug) {
                console.log('[API Response]', data);
            }
            return data;
        });
        
        api.addErrorInterceptor(async (error) => {
            console.error('[API Error]', error);
        });
        
        this.modules.api = api;
    }
    
    // Initialize UI components - MODIFICATO per attendere headerComponent
    async initUI() {
        // Attendi che headerComponent sia disponibile
        let attempts = 0;
        while (!headerComponent && attempts < 20) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!headerComponent) {
            console.error('[App] headerComponent not loaded after 2 seconds');
            // Prova a usare window.headerComponent se disponibile
            headerComponent = window.headerComponent;
        }
        
        // Store references to UI modules
        this.modules.header = headerComponent;
        this.modules.notifications = notificationSystem;
        this.modules.modals = modalSystem;
        
        // NON chiamare headerComponent.init() qui!
        // È già gestito dal suo auto-init
        console.log('[App] Header component will auto-initialize');
        
        // Add main content padding for fixed header
        this.adjustMainContent();
    }
    
    // Adjust main content for fixed header
    adjustMainContent() {
        const mainContent = document.querySelector('.sol-main-content');
        if (mainContent && !mainContent.style.paddingTop) {
            mainContent.style.paddingTop = '80px'; // Header height + margin
        }
    }
    
    // Setup global event handlers
    setupGlobalHandlers() {
        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Cmd/Ctrl + K for search
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                document.getElementById('globalSearch')?.focus();
            }
            
            // Escape to close modals
            if (e.key === 'Escape') {
                modalSystem.closeAll();
            }
        });
        
        // Handle network status
        window.addEventListener('online', () => {
            notificationSystem.success('Connessione ripristinata');
        });
        
        window.addEventListener('offline', () => {
            notificationSystem.error('Connessione persa');
        });
        
        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            if (this.config.debug) {
                notificationSystem.error(`Errore non gestito: ${event.reason}`);
            }
        });
    }
    
    // Page-specific initialization - FIXED
    async initPage() {
        // Get current page
        const path = window.location.pathname;
        const pageName = path.split('/').pop().replace('.html', '') || 'index';
        
        console.log(`[App] Initializing page: ${pageName}`);
        
        // Per tracking page, aspetta che il modulo sia caricato
        if (pageName === 'tracking') {
            // Attendi un momento per permettere al modulo di caricarsi
            let attempts = 0;
            const maxAttempts = 20;
            const checkInterval = 100; // 100ms
            
            const waitForTrackingInit = setInterval(() => {
                attempts++;
                
                if (window.trackingInit) {
                    clearInterval(waitForTrackingInit);
                    console.log('[App] Found trackingInit, calling it...');
                    window.trackingInit();
                } else if (attempts >= maxAttempts) {
                    clearInterval(waitForTrackingInit);
                    console.error('[App] trackingInit not found after waiting');
                }
            }, checkInterval);
            
            return;
        }
        
        // Check if page has specific init function (per altre pagine)
        if (window[`${pageName}Init`]) {
            await window[`${pageName}Init`]();
        }
        
        // Emit custom event
        window.dispatchEvent(new CustomEvent('app:ready', {
            detail: { page: pageName }
        }));
    }
    
    // Utility methods
    showLoading(message = 'Caricamento...') {
        return notificationSystem.loading(message);
    }
    
    hideLoading(id) {
        if (id) {
            notificationSystem.dismiss(id);
        }
    }
    
    // Navigation helpers
    navigate(path) {
        window.location.href = path;
    }
    
    reload() {
        window.location.reload();
    }
    
    // Data formatting utilities
    formatDate(date, format = 'short') {
        if (!date) return '-';
        
        const d = new Date(date);
        const options = {
            short: { day: '2-digit', month: '2-digit', year: 'numeric' },
            long: { day: 'numeric', month: 'long', year: 'numeric' },
            full: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
            time: { hour: '2-digit', minute: '2-digit' }
        };
        
        return d.toLocaleDateString('it-IT', options[format] || options.short);
    }
    
    formatCurrency(amount, currency = 'EUR') {
        if (amount === null || amount === undefined) return '-';
        
        return new Intl.NumberFormat('it-IT', {
            style: 'currency',
            currency: currency
        }).format(amount);
    }
    
    formatNumber(num, decimals = 0) {
        if (num === null || num === undefined) return '-';
        
        return new Intl.NumberFormat('it-IT', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(num);
    }
}

// Create singleton instance
const app = new Application();
// Organization switching functions
window.toggleOrgDropdown = function(event) {
    event.stopPropagation();
    const dropdown = document.getElementById('orgDropdown');
    if (dropdown) {
        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    }
};

window.switchOrganization = async function(orgId) {
    if (window.organizationService) {
        await window.organizationService.switchOrg(orgId);
    }
};

// Close org dropdown on outside click
document.addEventListener('click', (e) => {
    if (!e.target.closest('.org-selector')) {
        const orgDropdown = document.getElementById('orgDropdown');
        if (orgDropdown) {
            orgDropdown.style.display = 'none';
        }
    }
});

// Export singleton
export default app;

// Auto-initialize when DOM is ready - CON PROTEZIONE
let autoInitDone = false;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (!autoInitDone) {
            autoInitDone = true;
            app.init();
        }
    }, { once: true });
} else {
    // DOM already loaded
    if (!autoInitDone) {
        autoInitDone = true;
        setTimeout(() => app.init(), 100);
    }
}