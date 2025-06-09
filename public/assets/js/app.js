// app.js - Global application entry point
(function() {
    'use strict';
    
    window.App = {
        // Core modules
        modules: {
            auth: null,
            api: null,
            header: null,
            notifications: null,
            modals: null
        },
        
        // Configuration
        config: {
            appName: 'Supply Chain Hub',
            version: '2.0.0',
            debug: window.location.hostname === 'localhost'
        },
        
        // Initialize application
        async init() {
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
                
                console.log('[App] Initialization complete');
                
            } catch (error) {
                console.error('[App] Initialization failed:', error);
                window.NotificationSystem?.error('Errore durante l\'inizializzazione dell\'applicazione');
            }
        },
        
        // Initialize authentication
        async initAuth() {
            if (!window.authInit) {
                console.error('[App] Auth module not loaded');
                return false;
            }
            
            const authenticated = await window.authInit.init();
            this.modules.auth = window.auth;
            return authenticated;
        },
        
        // Initialize API client
        initApi() {
            if (!window.api) {
                console.error('[App] API client not loaded');
                return;
            }
            
            // Add global interceptors
            window.api.addRequestInterceptor(async (config) => {
                if (this.config.debug) {
                    console.log('[API Request]', config);
                }
            });
            
            window.api.addResponseInterceptor(async (data, response) => {
                if (this.config.debug) {
                    console.log('[API Response]', data);
                }
                return data;
            });
            
            window.api.addErrorInterceptor(async (error) => {
                console.error('[API Error]', error);
            });
            
            this.modules.api = window.api;
        },
        
        // Initialize UI components
        async initUI() {
            // Header is auto-initialized by header-component.js
            this.modules.header = window.headerComponent;
            
            // Store references to other UI modules
            this.modules.notifications = window.NotificationSystem;
            this.modules.modals = window.ModalSystem;
            
            // Add main content padding for fixed header
            this.adjustMainContent();
        },
        
        // Adjust main content for fixed header
        adjustMainContent() {
            const mainContent = document.querySelector('.sol-main-content');
            if (mainContent && !mainContent.style.paddingTop) {
                mainContent.style.paddingTop = '80px'; // Header height + margin
            }
        },
        
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
                    window.ModalSystem?.closeAll();
                }
            });
            
            // Handle network status
            window.addEventListener('online', () => {
                window.NotificationSystem?.success('Connessione ripristinata');
            });
            
            window.addEventListener('offline', () => {
                window.NotificationSystem?.error('Connessione persa');
            });
            
            // Handle unhandled promise rejections
            window.addEventListener('unhandledrejection', (event) => {
                console.error('Unhandled promise rejection:', event.reason);
                if (this.config.debug) {
                    window.NotificationSystem?.error(`Errore non gestito: ${event.reason}`);
                }
            });
        },
        
        // Page-specific initialization
        async initPage() {
            // Get current page
            const path = window.location.pathname;
            const pageName = path.split('/').pop().replace('.html', '') || 'index';
            
            console.log(`[App] Initializing page: ${pageName}`);
            
            // Check if page has specific init function
            if (window[`${pageName}Init`]) {
                await window[`${pageName}Init`]();
            }
            
            // Emit custom event
            window.dispatchEvent(new CustomEvent('app:ready', {
                detail: { page: pageName }
            }));
        },
        
        // Utility methods
        showLoading(message = 'Caricamento...') {
            return window.NotificationSystem?.loading(message);
        },
        
        hideLoading(id) {
            if (id) {
                window.NotificationSystem?.dismiss(id);
            }
        },
        
        // Navigation helpers
        navigate(path) {
            window.location.href = path;
        },
        
        reload() {
            window.location.reload();
        },
        
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
        },
        
        formatCurrency(amount, currency = 'EUR') {
            if (amount === null || amount === undefined) return '-';
            
            return new Intl.NumberFormat('it-IT', {
                style: 'currency',
                currency: currency
            }).format(amount);
        },
        
        formatNumber(num, decimals = 0) {
            if (num === null || num === undefined) return '-';
            
            return new Intl.NumberFormat('it-IT', {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals
            }).format(num);
        },
        
        // Storage helpers (using memory instead of localStorage in dev)
        storage: {
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
        }
    };
    
    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.App.init();
        });
    } else {
        // DOM already loaded
        window.App.init();
    }
})();