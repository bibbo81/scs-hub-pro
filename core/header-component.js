// header-component.js - Header unificato con SINGLETON PATTERN ROBUSTO
import api from '/core/api-client.js';
import notificationSystem from '/core/notification-system.js';
import { supabase, initializeSupabase } from '/core/services/supabase-client.js';
import { getMyOrganizationId } from '/core/services/organization-service.js';

// SINGLETON PATTERN ROBUSTO
let headerInstance = null;
let initializationPromise = null;

export class HeaderComponent {
    constructor(options = {}) {
        // SINGLETON CHECK RIGOROSO
        if (headerInstance) {
            console.warn('[HeaderComponent] Returning existing singleton instance');
            return headerInstance;
        }
        
        this.options = {
            showSearch: true,
            showNotifications: true,
            showUser: true,
            customActions: [],
            ...options
        };
        
        this.user = null;
        this.notificationCount = 0;
        this.searchTimeout = null;
        this.isDevMode = this.checkDevMode();
        this.initialized = false;
        this.userInfoCache = null;
        this.userInfoCacheTime = 0;
        
        // FIX: Aggiungi flag per tracciare lo stato e prevenire notifiche ripetute
        this.lastAuthState = null;
        this.notificationShownAt = 0;
        this.MIN_NOTIFICATION_INTERVAL = 60000; // 1 minuto tra notifiche
        
        // NUOVO: Tracking notifiche per evitare duplicati
        this.lastNotificationTime = 0;
        this.notificationCooldown = 60000; // 1 minuto di cooldown
        this.shownNotifications = new Set(); // Track notifiche già mostrate
        this.isFirstLoad = true; // Flag per prima visualizzazione
        this.tabInBackground = false; // Track se tab è in background
        
        // Set singleton instance
        headerInstance = this;
    }
    
    checkDevMode() {
        return window.location.hostname === 'localhost' || 
               localStorage.getItem('debugMode') === 'true' ||
               window.location.search.includes('dev=true');
    }
    
    async init() {
        // PREVIENI MULTIPLE INIZIALIZZAZIONI
        if (initializationPromise) {
            console.warn('[HeaderComponent] Init already in progress, waiting...');
            return initializationPromise;
        }
        
        if (this.initialized) {
            console.warn('[HeaderComponent] Already initialized');
            return this;
        }
        
        // Crea promise per prevenire race conditions
        initializationPromise = this._performInit();
        
        try {
            await initializationPromise;
            return this;
        } finally {
            initializationPromise = null;
        }
    }
    
    async _performInit() {
        await initializeSupabase();
        console.log('🔧 [HeaderComponent] Starting initialization...');
        
        // CRITICAL: Rimuovi TUTTI gli header esistenti prima di inizializzare
        const existingHeaders = document.querySelectorAll('.sol-header');
        if (existingHeaders.length > 0) {
            console.warn(`[HeaderComponent] Found ${existingHeaders.length} existing headers, removing ALL...`);
            existingHeaders.forEach(header => header.remove());
        }
        
        // PULIZIA HEADER DUPLICATI (per sicurezza extra)
        this._cleanupDuplicateHeaders();
        
        // Inietta stili per mobile checkbox fix
        this._injectMobileStyles();
        
        this._injectOrgSelectorStyles();

        try {
            await this.mount();
            console.log('✅ [HeaderComponent] Header mounted to DOM');
            
            await this.attachEventListeners();
            console.log('✅ [HeaderComponent] Event listeners attached');
            
            this.initialized = true;
            
            if (!this.isDevMode) {
                this.loadNotifications();
            } else {
                console.log('🛠️ Dev mode: Skipping notifications API call');
                this.notificationCount = 0;
                this.updateNotificationBadge();
            }
            
            console.log('✅ [HeaderComponent] Initialization complete');
            
        } catch (error) {
            console.error('❌ [HeaderComponent] Initialization failed:', error);
            throw error;
        }
    }
    
    _cleanupDuplicateHeaders() {
        const headers = document.querySelectorAll('.sol-header');
        if (headers.length > 1) {
            console.warn(`[HeaderComponent] Found ${headers.length} headers, removing duplicates...`);
            // Rimuovi tutti tranne il primo
            for (let i = 1; i < headers.length; i++) {
                headers[i].remove();
            }
        }
    }
    
    _injectMobileStyles() {
        if (!document.getElementById('mobile-checkbox-styles')) {
            const mobileCheckboxStyles = `
            <style id="mobile-checkbox-styles">
            /* Mobile Checkbox Fix */
            @media (max-width: 768px) {
                .tracking-checkbox {
                    width: 32px;
                    height: 32px;
                    cursor: pointer;
                    -webkit-tap-highlight-color: transparent;
                    -webkit-touch-callout: none;
                    -webkit-user-select: none;
                    user-select: none;
                    position: relative;
                    z-index: 100;
                }
                
                /* Aumenta l'area cliccabile */
                .tracking-checkbox::before {
                    content: '';
                    position: absolute;
                    top: -8px;
                    left: -8px;
                    right: -8px;
                    bottom: -8px;
                    z-index: -1;
                }
                
                /* Fix per table cell */
                .sol-table td:first-child {
                    position: relative;
                    z-index: 10;
                    padding: 0.5rem;
                    min-width: 48px;
                }
                
                /* Previeni interferenze con drag */
                .sol-table.sortable-active .tracking-checkbox {
                    pointer-events: auto !important;
                }
            }
            /* Desktop checkbox styling */
            @media (min-width: 769px) {
                .tracking-checkbox {
                    width: 20px;
                    height: 20px;
                    cursor: pointer;
                }
            }
            /* Checkbox hover effect */
            .tracking-checkbox:hover {
                transform: scale(1.1);
                box-shadow: 0 0 0 2px var(--sol-primary-light);
            }
            /* Selected row highlight */
            .sol-table tr:has(.tracking-checkbox:checked) {
                background-color: var(--sol-primary-light);
            }
            </style>
            `;
            document.head.insertAdjacentHTML('beforeend', mobileCheckboxStyles);
        }
    }
    _injectOrgSelectorStyles() {
    if (!document.getElementById('org-selector-styles')) {
        const orgStyles = `
        <style id="org-selector-styles">
        /* Organization Selector */
        .org-selector {
            position: relative;
            margin-right: 1rem;
        }

        .org-selector .sol-dropdown {
            position: absolute;
            top: calc(100% + 8px);
            right: 0;
            min-width: 250px;
            max-width: 300px;
            z-index: 1000;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .org-selector .sol-dropdown-header {
            padding: 12px 16px;
            border-bottom: 1px solid var(--sol-gray-200);
            font-weight: 600;
        }

        .org-selector .sol-dropdown-body {
            max-height: 300px;
            overflow-y: auto;
        }

        .org-selector .sol-dropdown-item {
            padding: 12px 16px;
            cursor: pointer;
            transition: background 0.2s;
            border-bottom: 1px solid var(--sol-gray-100);
        }

        .org-selector .sol-dropdown-item:last-child {
            border-bottom: none;
        }

        .org-selector .sol-dropdown-item:hover {
            background: var(--sol-gray-50);
        }

        .org-selector .org-single {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0 0.75rem;
        }

        .org-selector .sol-dropdown-item.active {
            background: var(--sol-primary-light);
        }

        @media (max-width: 768px) {
            .org-selector {
                margin-right: 0.5rem;
            }
            
            .org-selector .sol-btn span.hide-mobile {
                max-width: 100px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
        }
        </style>
        `;
        document.head.insertAdjacentHTML('beforeend', orgStyles);
    }
}
    async mount(selector = 'body') {
        const container = document.querySelector(selector);
        if (!container) {
            console.error(`❌ [HeaderComponent] Container '${selector}' not found`);
            return;
        }
        
        // CRITICAL FIX: Controlla se header esiste già PRIMA di fare qualsiasi cosa
        const existingHeader = document.querySelector('.sol-header');
        if (existingHeader) {
            console.log('⚠️ [HeaderComponent] Header already exists, reusing it');
            
            // Se l'header esiste già, aggiorna solo i contenuti dinamici se necessario
            const userInfo = await this.getUserInfo();
            this.updateUserDisplay(userInfo);
            
            // Re-attach event listeners nel caso siano stati persi
            await this.attachEventListeners();
            
            return;
        }
        
        // Solo se non esiste un header, creane uno nuovo
        const headerHtml = await this.render();
        container.insertAdjacentHTML('afterbegin', headerHtml);
        
        console.log('✅ [HeaderComponent] New header HTML inserted into DOM');
    }
    
    async render() {
        // CRITICAL FIX: Non renderizzare se esiste già un header
        if (document.querySelector('.sol-header')) {
            console.warn('[HeaderComponent] Header already exists, skipping render');
            return '';
        }
        
        // Inietta CSS anti-flash una sola volta
        if (!document.getElementById('anti-flash-styles')) {
            const style = document.createElement('style');
            style.id = 'anti-flash-styles';
            style.textContent = `
                /* Previeni flash durante cambio tab */
                .sol-notification {
                    will-change: transform, opacity;
                }
                /* Smooth transitions per header updates */
                .user-avatar, #userName, #userInitial {
                    transition: opacity 0.2s ease;
                }
                /* Previeni layout shift */
                .api-status-container {
                    min-width: 150px;
                }
                
                /* Previeni flash del dropdown durante aggiornamenti */
                .sol-dropdown {
                    transition: opacity 0.2s ease;
                }
                
                /* Stabilizza header durante caricamento */
                .sol-header {
                    min-height: 64px;
                }
            `;
            document.head.appendChild(style);
        }
        
        return `
            ${await this.renderHeader()}
            ${await this.renderDropdowns()}
            ${this.renderSidebar()}
            ${this.renderBackdrop()}
        `;
    }
    
    // FIX 4: getUserInfo ASYNC con CACHE e loading state
    async getUserInfo() {
        // Cache per 5 minuti
        const cacheExpiry = 5 * 60 * 1000;
        const now = Date.now();
        
        if (this.userInfoCache && (now - this.userInfoCacheTime) < cacheExpiry) {
            return this.userInfoCache;
        }
        
        // Check if auth UI is still loading
        if (window.authUI && window.authUI.isLoading) {
            return {
                name: '',
                email: '',
                initials: '',
                isAnonymous: true,
                isLoading: true
            };
        }
        
        try {
            await initializeSupabase();
            if (supabase) {
                const { data: { user } } = await supabase.auth.getUser();
                
                if (user) {
                    let userInfo;
                    
                    if (user.email) {
                        const name = window.authInit?.formatUserName(user) ||
                                      user.email.split('@')[0];
                        userInfo = {
                            name,
                            email: user.email,
                            initials: window.authInit?.getUserInitials(name) ||
                                      name.substring(0, 2).toUpperCase(),
                            isAnonymous: false,
                            isLoading: false
                        };
                    } else {
                        userInfo = {
                            name: 'Demo User',
                            email: 'demo@example.com',
                            initials: 'DU',
                            isAnonymous: true,
                            isLoading: false
                        };
                    }
                    
                    // Aggiorna cache
                    this.userInfoCache = userInfo;
                    this.userInfoCacheTime = now;
                    
                    return userInfo;
                }
            }
        } catch (error) {
            console.log('[HeaderComponent] Error getting user:', error);
        }
        
        // Fallback - but only if not loading
        if (window.authUI && !window.authUI.isLoading) {
            const fallback = {
                name: 'Demo User',
                email: 'demo@example.com',
                initials: 'DU',
                isAnonymous: true,
                isLoading: false
            };
            
            this.userInfoCache = fallback;
            this.userInfoCacheTime = now;
            
            return fallback;
        }
        
        // Still loading
        return {
            name: '',
            email: '',
            initials: '',
            isAnonymous: true,
            isLoading: true
        };
    }
    
    // Invalida cache quando cambia l'utente
    invalidateUserCache() {
        this.userInfoCache = null;
        this.userInfoCacheTime = 0;
    }
    
    // FIX 4: renderHeader ASYNC
    async renderHeader() {
        return `
            <header class="sol-header">
                <div class="sol-header-content">
                    ${this.renderLeft()}
                    ${this.renderCenter()}
                    ${await this.renderRight()}
                </div>
            </header>
        `;
    }
    
    // FIX 4: renderRight ASYNC
  async renderRight() {
    const userInfo = await this.getUserInfo();
    
    return `
        <div class="sol-header-right">
            ${await this.renderOrgSelector()}  <!-- Render organization selector -->
            ${this.renderCustomActions()}
            ${this.isDevMode ? this.renderDevActions() : ''}
            ${this.options.showNotifications ? this.renderNotificationButton() : ''}
            ${this.options.showUser ? this.renderUserButton(userInfo) : ''}
        </div>
    `;
}
    // Render the organization selector (no dropdown)
    async renderOrgSelector() {
        try {
            const orgId = await getMyOrganizationId(supabase);
            const { data, error } = await supabase
                .from('organizations')
                .select('name')
                .eq('id', orgId)
                .maybeSingle();
            if (error || !data) {
                return `<div class="org-selector">Nessuna organizzazione trovata. Contatta un amministratore.</div>`;
            }
            return `
                <div class="org-selector" id="orgSelector">
                    <div class="org-single">
                        <i class="fas fa-building"></i>
                        <strong>${data.name}</strong>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('[Header] Error rendering org selector:', error);
            return `<div class="org-selector">Nessuna organizzazione trovata. Contatta un amministratore.</div>`;
        }
    }
    // FIX 4: renderDropdowns ASYNC
    async renderDropdowns() {
        // CRITICAL FIX: Non renderizzare dropdown se esistono già
        if (document.querySelector('#userDropdown') || document.querySelector('#notificationDropdown')) {
            console.warn('[HeaderComponent] Dropdowns already exist, skipping render');
            return '';
        }
        
        return `
            ${await this.renderUserDropdown()}
            ${this.renderNotificationDropdown()}
        `;
    }
    
    // FIX 4: renderUserDropdown ASYNC
    async renderUserDropdown() {
        const userInfo = await this.getUserInfo();
        
        if (userInfo.isLoading) {
            return `
                <div class="sol-dropdown" id="userDropdown" style="display: none;">
                    <div class="sol-dropdown-header">
                        <p class="user-name">
                            <i class="fas fa-spinner fa-spin"></i> Caricamento...
                        </p>
                        <p class="user-email">
                            <i class="fas fa-spinner fa-spin"></i> Autenticazione in corso...
                        </p>
                    </div>
                    <div class="sol-dropdown-body">
                        <div class="loading-state">
                            <i class="fas fa-spinner fa-spin"></i>
                            <span>Caricamento menu...</span>
                        </div>
                    </div>
                </div>
            `;
        }
        
        return `
            <div class="sol-dropdown" id="userDropdown" style="display: none;">
                <div class="sol-dropdown-header">
                    <p class="user-name">${userInfo.name}</p>
                    <p class="user-email">${userInfo.email}</p>
                </div>
                <div class="sol-dropdown-body">
                    <a href="/profile.html" class="sol-dropdown-item">
                        <i class="fas fa-user"></i> Profilo
                    </a>
                    <a href="/settings.html" class="sol-dropdown-item">
                        <i class="fas fa-cog"></i> Impostazioni
                    </a>
                    <a href="/billing.html" class="sol-dropdown-item">
                        <i class="fas fa-credit-card"></i> Fatturazione
                    </a>
                    ${this.isDevMode ? `
                        <div class="sol-dropdown-divider"></div>
                        <a href="/test-integration.html" class="sol-dropdown-item">
                            <i class="fas fa-flask"></i> Integration Tests
                        </a>
                        <button class="sol-dropdown-item" onclick="toggleDebugMode()">
                            <i class="fas fa-bug"></i> Toggle Debug Mode
                        </button>
                        <button class="sol-dropdown-item" onclick="clearSystemData()">
                            <i class="fas fa-trash"></i> Clear System Data
                        </button>
                    ` : ''}
                </div>
                <div class="sol-dropdown-footer">
                    <a href="#" class="sol-dropdown-item" onclick="handleLogout(event)">
                        <i class="fas fa-sign-out-alt"></i>
                        <span>Logout</span>
                    </a>
                </div>
            </div>
        `;
    }
    
    renderSidebar() {
        // CRITICAL FIX: Non renderizzare sidebar se esiste già
        if (document.querySelector('#sidebar')) {
            console.warn('[HeaderComponent] Sidebar already exists, skipping render');
            return '';
        }
        
        const mainMenuItems = [
            { icon: 'fa-chart-line', label: 'Dashboard', href: '/dashboard.html' },
            { icon: 'fa-box', label: 'Tracking', href: '/tracking.html' },
            { icon: 'fa-cubes', label: 'Prodotti', href: '/products.html' },
            { icon: 'fa-ship', label: 'Spedizioni', href: '/shipments.html', badge: 'Phase 3' },
            { icon: 'fa-truck', label: 'Corrieri', href: '/carriers.html' },
            { divider: true },
            { icon: 'fa-upload', label: 'Importa Dati', href: '/import.html' },
            { icon: 'fa-file-alt', label: 'Report', href: '/reports.html' },
            { icon: 'fa-coins', label: 'Analisi Costi', href: '/costs.html' },
            { divider: true },
            { icon: 'fa-users', label: 'Team', href: '/team.html' },
            { icon: 'fa-cog', label: 'Impostazioni', href: '/settings.html' }
        ];

        const devMenuItems = this.isDevMode ? [
            { divider: true },
            { 
                icon: 'fa-flask', 
                label: 'Integration Tests', 
                href: '/test-integration.html',
                dev: true,
                badge: 'DEV'
            },
            { 
                icon: 'fa-code', 
                label: 'System Monitor', 
                href: '/system-monitor.html',
                dev: true,
                disabled: true
            },
            { 
                icon: 'fa-database', 
                label: 'Data Explorer', 
                href: '/data-explorer.html',
                dev: true,
                disabled: true
            }
        ] : [];

        const allMenuItems = [...mainMenuItems, ...devMenuItems];
        
        return `
            <aside class="sol-sidebar" id="sidebar">
                <nav class="sol-nav">
                    ${allMenuItems.map(item => {
                        if (item.divider) {
                            return '<div class="sol-nav-divider"></div>';
                        }
                        
                        const isActive = this.isActive(item.href);
                        const isDisabled = item.disabled;
                        const isDevItem = item.dev;
                        
                        return `
                            <a href="${item.href}" 
                               class="sol-nav-item ${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''} ${isDevItem ? 'dev-item' : ''}"
                               ${isDisabled ? 'onclick="event.preventDefault(); return false;"' : ''}
                               ${isDevItem ? 'title="Developer Tool"' : ''}>
                                <i class="fas ${item.icon}"></i>
                                <span>${item.label}</span>
                                ${item.badge ? `<span class="nav-badge ${item.badge === 'DEV' ? 'dev-badge' : 'phase-badge'}">${item.badge}</span>` : ''}
                            </a>
                        `;
                    }).join('')}
                </nav>
                
                ${this.isDevMode ? this.renderDevStatus() : ''}
            </aside>
        `;
    }
    
    renderDevStatus() {
        return `
            <div class="dev-status-panel">
                <div class="dev-status-header">
                    <i class="fas fa-code"></i>
                    Developer Mode
                </div>
                <div class="dev-status-body">
                    <div class="dev-metric">
                        <span class="dev-label">Phase:</span>
                        <span class="dev-value">2.5 → 3.0</span>
                    </div>
                    <div class="dev-metric">
                        <span class="dev-label">Environment:</span>
                        <span class="dev-value">${window.location.hostname}</span>
                    </div>
                    <div class="dev-actions">
                        <button class="dev-action-btn" onclick="runQuickTest()" title="Quick System Test">
                            <i class="fas fa-bolt"></i>
                        </button>
                        <button class="dev-action-btn" onclick="toggleConsoleLog()" title="Toggle Console Logging">
                            <i class="fas fa-terminal"></i>
                        </button>
                        <button class="dev-action-btn" onclick="exportSystemState()" title="Export System State">
                            <i class="fas fa-download"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderBackdrop() {
        // CRITICAL FIX: Non renderizzare backdrop se esiste già
        if (document.querySelector('#backdrop')) {
            console.warn('[HeaderComponent] Backdrop already exists, skipping render');
            return '';
        }
        
        return '<div class="sol-backdrop" id="backdrop"></div>';
    }
    
    isActive(href) {
        return window.location.pathname === href;
    }
    
    async attachEventListeners() {
        await initializeSupabase();
        // CRITICAL FIX: Previeni attach multipli di event listeners
        // Rimuovi vecchi listener prima di aggiungerne di nuovi
        
        // Menu toggle
        const menuToggle = document.getElementById('menuToggle');
        if (menuToggle && !menuToggle.hasEventListener) {
            menuToggle.addEventListener('click', () => {
                const sidebar = document.getElementById('sidebar');
                const backdrop = document.getElementById('backdrop');
                if (sidebar) sidebar.classList.toggle('active');
                if (backdrop) backdrop.classList.toggle('active');
            });
            menuToggle.hasEventListener = true;
        }
        
        // Backdrop click
        const backdrop = document.getElementById('backdrop');
        if (backdrop && !backdrop.hasEventListener) {
            backdrop.addEventListener('click', () => {
                const sidebar = document.getElementById('sidebar');
                sidebar?.classList.remove('active');
                backdrop.classList.remove('active');
            });
            backdrop.hasEventListener = true;
        }
        
        // User menu
        const userMenuBtn = document.getElementById('userMenuBtn');
        if (userMenuBtn && !userMenuBtn.hasEventListener) {
            userMenuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.toggleDropdown('userDropdown', 'userMenuBtn');
            });
            userMenuBtn.hasEventListener = true;
        }
        
        // Notifications
        const notificationBtn = document.getElementById('notificationBtn');
        if (notificationBtn && !notificationBtn.hasEventListener) {
            notificationBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.toggleDropdown('notificationDropdown', 'notificationBtn');
            });
            notificationBtn.hasEventListener = true;
        }
        
        // Global search
        const globalSearch = document.getElementById('globalSearch');
        if (globalSearch && !globalSearch.hasEventListener) {
            globalSearch.addEventListener('input', (e) => {
                this.handleSearch(e.target.value);
            });
            globalSearch.hasEventListener = true;
        }
        
        // Custom actions
        this.options.customActions.forEach(action => {
            const btn = document.querySelector(`[data-action="${action.id || action.label}"]`);
            if (btn && action.handler && !btn.hasEventListener) {
                btn.addEventListener('click', action.handler);
                btn.hasEventListener = true;
            }
        });
        
        // Close dropdowns on outside click - use once to prevent multiple listeners
        if (!this._outsideClickListenerAttached) {
            document.addEventListener('click', (e) => {
                if (!e.target.closest('#userMenuBtn') && 
                    !e.target.closest('#notificationBtn') && 
                    !e.target.closest('#userDropdown') && 
                    !e.target.closest('#notificationDropdown')) {
                    
                    setTimeout(() => {
                        this.closeAllDropdowns();
                    }, 10);
                }
            });
            this._outsideClickListenerAttached = true;
        }
        
        // Prevent dropdown close when clicking inside
        const userDropdown = document.getElementById('userDropdown');
        if (userDropdown && !userDropdown.hasEventListener) {
            userDropdown.addEventListener('click', (e) => {
                if (!e.target.closest('a') && !e.target.closest('button')) {
                    e.stopPropagation();
                }
            });
            userDropdown.hasEventListener = true;
        }
        
        const notificationDropdown = document.getElementById('notificationDropdown');
        if (notificationDropdown && !notificationDropdown.hasEventListener) {
            notificationDropdown.addEventListener('click', (e) => {
                if (!e.target.closest('a') && !e.target.closest('button')) {
                    e.stopPropagation();
                }
            });
            notificationDropdown.hasEventListener = true;
        }
        
        // Mark all notifications as read
        const markAllRead = document.querySelector('.mark-all-read');
        if (markAllRead && !markAllRead.hasEventListener) {
            markAllRead.addEventListener('click', () => {
                this.markAllNotificationsRead();
            });
            markAllRead.hasEventListener = true;
        }
        
        // FIX: Listen for auth state changes con gestione notifiche migliorata
        if (supabase && !this._authListenerAttached) {
            supabase.auth.onAuthStateChange((event, session) => {
                this.handleAuthStateChange(event, session);
            });
            this._authListenerAttached = true;
        }
        
        // Aggiungi listener per visibility change - use once
        if (!this._visibilityListenerAttached) {
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    // Tab in background - sospendi notifiche
                    this.tabInBackground = true;
                } else {
                    // Tab tornata attiva
                    this.tabInBackground = false;
                }
            });
            this._visibilityListenerAttached = true;
        }
        
        // Fix touch events per mobile - use once
        if (!this._touchListenerAttached) {
            document.addEventListener('touchstart', (e) => {
                const checkbox = e.target.closest('.tracking-checkbox');
                if (checkbox) {
                    e.preventDefault(); // Previeni default touch behavior
                    e.stopPropagation(); // Stop event bubbling
                    
                    // Toggle checkbox
                    checkbox.checked = !checkbox.checked;
                    
                    // Trigger change event
                    const changeEvent = new Event('change', { bubbles: true });
                    checkbox.dispatchEvent(changeEvent);
                    
                    // Visual feedback
                    checkbox.style.transform = 'scale(0.95)';
                    setTimeout(() => {
                        checkbox.style.transform = '';
                    }, 100);
                }
            }, { passive: false });
            this._touchListenerAttached = true;
        }
        
        // Previeni zoom su double tap - use once
        if (!this._touchEndListenerAttached) {
            let lastTouchEnd = 0;
            document.addEventListener('touchend', (e) => {
                const now = Date.now();
                if (now - lastTouchEnd <= 300) {
                    e.preventDefault();
                }
                lastTouchEnd = now;
            }, false);
            this._touchEndListenerAttached = true;
        }
    }
    
    // Modifica il metodo handleAuthStateChange
    async handleAuthStateChange(event, session) {
        console.log('[HeaderComponent] Auth state changed:', event);
        
        this.lastAuthState = event;
        this.invalidateUserCache();
        
        // Update user info immediately on auth change
        if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'SIGNED_OUT') {
            // CRITICAL: Force immediate update of user display
            setTimeout(async () => {
                const userInfo = await this.getUserInfo();
                this.updateUserDisplay(userInfo);
                
                // Aggiorna anche i dropdown se esistono
                const dropdownName = document.querySelector('.user-name');
                const dropdownEmail = document.querySelector('.user-email');
                if (dropdownName && !userInfo.isLoading) dropdownName.textContent = userInfo.name;
                if (dropdownEmail && !userInfo.isLoading) dropdownEmail.textContent = userInfo.email;
            }, 100); // Small delay to ensure auth state is fully updated
        }
        
        // NUOVO: Gestione intelligente notifiche
        if (event === 'SIGNED_IN' && session) {
            const now = Date.now();
            const notificationKey = `signin_${session.user.id}_${Math.floor(now / this.notificationCooldown)}`;
            
            // Mostra notifica solo se:
            // 1. Non è stata già mostrata in questa sessione
            // 2. È passato abbastanza tempo dall'ultima
            // 3. La pagina è visibile (non in background)
            // 4. Non è il primo caricamento (INITIAL_SESSION)
            if (!this.shownNotifications.has(notificationKey) && 
                (now - this.lastNotificationTime > this.notificationCooldown) &&
                !document.hidden &&
                !this.tabInBackground &&
                event !== 'INITIAL_SESSION') {
                
                this.shownNotifications.add(notificationKey);
                this.lastNotificationTime = now;
                
                // Usa il notification system con deduplicazione
                if (window.NotificationSystem) {
                    const userEmail = session.user.email || 'Demo User';
                    window.NotificationSystem.success('Accesso effettuato con successo!', {
                        subtitle: `Bentornato, ${userEmail}`,
                        duration: 3000,
                        dedupe: true, // Abilita deduplicazione
                        dedupeKey: notificationKey
                    });
                }
            }
        }
        
        // Reset delle notifiche mostrate dopo logout
        if (event === 'SIGNED_OUT') {
            this.shownNotifications.clear();
            this.lastNotificationTime = 0;
        }
    }
    
    // Aggiorna display utente senza re-render completo
    updateUserDisplay(userInfo) {
        const userInitial = document.getElementById('userInitial');
        const userName = document.getElementById('userName');
        const dropdownName = document.querySelector('.user-name');
        const dropdownEmail = document.querySelector('.user-email');
        
        if (userInfo.isLoading) {
            if (userInitial) {
                userInitial.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            }
            if (userName) {
                userName.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            }
            if (dropdownName) {
                dropdownName.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Caricamento...';
            }
            if (dropdownEmail) {
                dropdownEmail.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Autenticazione in corso...';
            }
            return;
        }
        
        if (userInitial) userInitial.textContent = userInfo.initials;
        if (userName) userName.textContent = userInfo.name;
        if (dropdownName) dropdownName.textContent = userInfo.name;
        if (dropdownEmail) dropdownEmail.textContent = userInfo.email;
    }
    
    toggleDropdown(dropdownId, buttonId) {
        const dropdown = document.getElementById(dropdownId);
        const button = document.getElementById(buttonId);
        if (!dropdown || !button) return;
        
        const isOpen = dropdown.style.display === 'block';
        
        this.closeAllDropdowns();
        
        if (!isOpen) {
            dropdown.style.display = 'block';
            
            const dropdownRect = dropdown.getBoundingClientRect();
            const windowHeight = window.innerHeight;
            
            if (dropdownRect.bottom > windowHeight - 20) {
                dropdown.classList.add('dropup');
            } else {
                dropdown.classList.remove('dropup');
            }
        }
    }
    
    closeAllDropdowns() {
        document.querySelectorAll('.sol-dropdown').forEach(dropdown => {
            dropdown.style.display = 'none';
            dropdown.classList.remove('dropup');
        });
    }
    
    async loadNotifications() {
        try {
            const data = await api.get('notifications', { silent: true });
            this.renderNotifications(data?.notifications || []);
            this.notificationCount = data?.unread_count || 0;
            this.updateNotificationBadge();
        } catch (error) {
            if (error.status === 404 || error.status === 502) {
                console.log('📣 Notifications API not available (development mode)');
                this.renderNotifications([]);
                this.notificationCount = 0;
                this.updateNotificationBadge();
            } else {
                console.error('Failed to load notifications:', error);
                this.renderNotifications([]);
                this.notificationCount = 0;
                this.updateNotificationBadge();
            }
        }
    }
    
    renderNotifications(notifications) {
        const container = document.getElementById('notificationList');
        if (!container) return;
        
        if (notifications.length === 0) {
            container.innerHTML = '<p class="no-notifications">Nessuna notifica</p>';
            return;
        }
        
        container.innerHTML = notifications.slice(0, 5).map(notif => `
            <div class="notification-item ${notif.read ? '' : 'unread'}">
                <div class="notification-icon ${notif.type}">
                    <i class="fas ${this.getNotificationIcon(notif.type)}"></i>
                </div>
                <div class="notification-content">
                    <p class="notification-title">${notif.title}</p>
                    <p class="notification-message">${notif.message}</p>
                    <p class="notification-time">${this.formatTime(notif.created_at)}</p>
                </div>
            </div>
        `).join('');
    }
    
    updateNotificationBadge() {
        const badge = document.querySelector('.notification-badge');
        if (badge) {
            badge.textContent = this.notificationCount;
            badge.style.display = this.notificationCount > 0 ? 'flex' : 'none';
        }
    }
    
    getNotificationIcon(type) {
        const icons = {
            'shipment': 'fa-ship',
            'delivery': 'fa-truck',
            'warning': 'fa-exclamation-triangle',
            'info': 'fa-info-circle',
            'success': 'fa-check-circle'
        };
        return icons[type] || 'fa-bell';
    }
    
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 1) return 'Ora';
        if (minutes < 60) return `${minutes}m fa`;
        if (hours < 24) return `${hours}h fa`;
        if (days < 7) return `${days}g fa`;
        
        return date.toLocaleDateString('it-IT');
    }
    
    async markAllNotificationsRead() {
        try {
            await api.post('notifications/mark-all-read', {}, { silent: true });
            this.notificationCount = 0;
            this.updateNotificationBadge();
            
            document.querySelectorAll('.notification-item.unread').forEach(item => {
                item.classList.remove('unread');
            });
        } catch (error) {
            if (error.status !== 404) {
                console.error('Failed to mark notifications as read:', error);
            }
        }
    }
    
    handleSearch(query) {
        clearTimeout(this.searchTimeout);
        
        if (!query.trim()) return;
        
        this.searchTimeout = setTimeout(() => {
            console.log('Searching for:', query);
        }, 300);
    }
    
    renderLeft() {
        return `
            <div class="sol-header-left">
                <button class="sol-btn sol-btn-glass" id="menuToggle">
                    <i class="fas fa-bars"></i>
                </button>
                <a href="/dashboard.html" class="sol-logo">
                    <div class="sol-logo-icon">SCH</div>
                    <span class="sol-logo-text">Supply Chain Hub</span>
                </a>
            </div>
        `;
    }
    
    renderCenter() {
        if (!this.options.showSearch) return '<div></div>';
        
        return `
            <div class="sol-header-center">
                <div class="sol-search-wrapper">
                    <input 
                        type="search" 
                        class="sol-search" 
                        placeholder="Cerca tracking, container, spedizioni..."
                        id="globalSearch"
                    >
                    <i class="fas fa-search sol-search-icon"></i>
                </div>
            </div>
        `;
    }
    
    renderDevActions() {
        return `
            <a href="/test-integration.html" class="sol-btn sol-btn-glass" title="Integration Test System">
                <i class="fas fa-flask"></i>
                <span class="hide-mobile">Tests</span>
            </a>
        `;
    }
    
    renderCustomActions() {
        return this.options.customActions.map(action => `
            <button class="sol-btn sol-btn-glass" data-action="${action.id || action.label}">
                <i class="${action.icon}"></i>
                <span class="hide-mobile">${action.label}</span>
            </button>
        `).join('');
    }
    
    renderNotificationButton() {
        return `
            <button class="sol-btn sol-btn-glass" id="notificationBtn">
                <i class="fas fa-bell"></i>
                ${this.notificationCount > 0 ? `
                    <span class="notification-badge">${this.notificationCount}</span>
                ` : ''}
            </button>
        `;
    }
    
    renderUserButton(userInfo) {
        if (userInfo.isLoading) {
            return `
                <button class="sol-btn sol-btn-glass" id="userMenuBtn">
                    <div class="user-avatar loading">
                        <i class="fas fa-spinner fa-spin"></i>
                    </div>
                    <span id="userName" class="hide-mobile">
                        <i class="fas fa-spinner fa-spin"></i>
                    </span>
                    <i class="fas fa-chevron-down hide-mobile"></i>
                </button>
            `;
        }
        
        return `
            <button class="sol-btn sol-btn-glass" id="userMenuBtn">
                <div class="user-avatar">
                    <span id="userInitial">${userInfo.initials}</span>
                </div>
                <span id="userName" class="hide-mobile">${userInfo.name}</span>
                <i class="fas fa-chevron-down hide-mobile"></i>
            </button>
        `;
    }
    
    renderNotificationDropdown() {
        return `
            <div class="sol-dropdown sol-dropdown-notifications" id="notificationDropdown" style="display: none;">
                <div class="sol-dropdown-header">
                    <h3>Notifiche</h3>
                    <button class="mark-all-read">Segna tutte come lette</button>
                </div>
                <div class="sol-dropdown-body" id="notificationList">
                    <!-- Notifications loaded dynamically -->
                </div>
                <div class="sol-dropdown-footer">
                    <a href="/notifications.html">Vedi tutte le notifiche</a>
                </div>
            </div>
        `;
    }
}

// Export singleton instance
const headerComponent = new HeaderComponent();

// FIX 1: PREVIENI AUTO-INIT MULTIPLE con flag più robusto
let autoInitDone = false;
let autoInitPromise = null;

async function autoInitHeader() {
    // Se già fatto, ritorna subito
    if (autoInitDone) {
        console.log('[HeaderComponent] Auto-init already done');
        return autoInitPromise || headerComponent;
    }
    
    // Se in corso, aspetta
    if (autoInitPromise) {
        console.log('[HeaderComponent] Auto-init in progress, waiting...');
        return autoInitPromise;
    }
    
    autoInitDone = true;
    
    // CRITICAL: Controlla se header esiste già PRIMA di inizializzare
    if (document.querySelector('.sol-header')) {
        console.log('[HeaderComponent] Header already exists in DOM, skipping auto-init');
        return headerComponent;
    }
    
    autoInitPromise = (async () => {
        try {
            await headerComponent.init();
            console.log('✅ [HeaderComponent] Auto-initialization complete');
            return headerComponent;
        } catch (error) {
            console.error('❌ [HeaderComponent] Auto-initialization failed:', error);
            throw error;
        }
    })();
    
    return autoInitPromise;
}

// Single event listener con once: true e check preventivo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // CRITICAL: Aspetta che Supabase sia pronto prima di inizializzare
        setTimeout(() => {
            // Double-check: non inizializzare se header già presente
            if (!document.querySelector('.sol-header')) {
                autoInitHeader();
            } else {
                console.log('[HeaderComponent] Header found at DOMContentLoaded, skipping auto-init');
                // Ma assicurati che gli event listener siano attaccati
                headerComponent.attachEventListeners();
            }
        }, 200); // Delay per dare tempo a Supabase di caricare
    }, { once: true });
} else {
    // DOM già caricato - usa setTimeout per evitare race conditions
    setTimeout(() => {
        // Double-check: non inizializzare se header già presente
        if (!document.querySelector('.sol-header')) {
            autoInitHeader();
        } else {
            console.log('[HeaderComponent] Header found after load, skipping auto-init');
            // Ma assicurati che gli event listener siano attaccati
            headerComponent.attachEventListeners();
        }
    }, 200); // Delay per dare tempo a Supabase di caricare
}

// FIX 2: handleLogout MIGLIORATO per Demo User
window.handleLogout = async function(event) {
    event.preventDefault();
    
    if (!confirm('Vuoi uscire dal tuo account?')) {
        return;
    }
    
    try {
        // Check if we have Supabase
        if (window.supabase || supabase) {
            const sb = window.supabase || supabase;
            const { data: { user } } = await sb.auth.getUser();
            
            // Check if it's an anonymous user
            if (user && !user.email) {
                console.log('[Logout] Anonymous user detected, clearing local data');
                // Clear all local data for anonymous users
                localStorage.clear();
                sessionStorage.clear();
                
                // Clear cookies (Supabase auth cookies)
                document.cookie.split(";").forEach(function(c) { 
                    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
                });
            }
            
            // Try to sign out regardless
            try {
                await sb.auth.signOut();
            } catch (signOutError) {
                console.warn('[Logout] SignOut error (expected for anonymous):', signOutError);
            }
        }
        
        // Always redirect to login
        window.location.href = '/login.html';
        
    } catch (error) {
        console.error('[Logout] Error:', error);
        // Fallback: clear everything and redirect
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/login.html';
    }
};

// Helper functions globali
window.runQuickTest = function() {
    console.log('[Dev] Running quick test...');
    if (window.NotificationSystem) {
        window.NotificationSystem.success('Quick test completed!');
    }
};

window.toggleDebugMode = function() {
    const current = localStorage.getItem('debugMode') === 'true';
    localStorage.setItem('debugMode', !current);
    window.location.reload();
};

window.clearSystemData = function() {
    if (confirm('Clear all system data? This cannot be undone.')) {
        localStorage.clear();
        sessionStorage.clear();
        window.location.reload();
    }
};

window.exportSystemState = function() {
    const state = {
        localStorage: { ...localStorage },
        sessionStorage: { ...sessionStorage },
        timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `system-state-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
};

// CRITICAL: Aggiungi metodo di debug per verificare lo stato
window.debugHeaderState = function() {
    console.log('🔍 Header Component Debug:');
    console.log('- Singleton instance:', !!headerInstance);
    console.log('- Initialized:', headerComponent.initialized);
    console.log('- Auto-init done:', autoInitDone);
    console.log('- Headers in DOM:', document.querySelectorAll('.sol-header').length);
    console.log('- Sidebars in DOM:', document.querySelectorAll('#sidebar').length);
    console.log('- User dropdowns:', document.querySelectorAll('#userDropdown').length);
    console.log('- Notification dropdowns:', document.querySelectorAll('#notificationDropdown').length);
    console.log('- Backdrops:', document.querySelectorAll('#backdrop').length);
    
    return {
        singleton: !!headerInstance,
        initialized: headerComponent.initialized,
        autoInitDone,
        headersCount: document.querySelectorAll('.sol-header').length,
        elements: {
            headers: document.querySelectorAll('.sol-header').length,
            sidebars: document.querySelectorAll('#sidebar').length,
            userDropdowns: document.querySelectorAll('#userDropdown').length,
            notificationDropdowns: document.querySelectorAll('#notificationDropdown').length,
            backdrops: document.querySelectorAll('#backdrop').length
        }
    };
};

export default headerComponent;