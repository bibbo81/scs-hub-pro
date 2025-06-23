// header-component.js - Header unificato SENZA sistema modal duplicato - FIXED
import api from '/core/api-client.js';
import notificationSystem from '/core/notification-system.js';

export class HeaderComponent {
    constructor(options = {}) {
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
    }
    
    checkDevMode() {
        return window.location.hostname === 'localhost' || 
               localStorage.getItem('debugMode') === 'true' ||
               window.location.search.includes('dev=true');
    }
    
    async init() {
        if (this.initialized) {
            console.log('⚠️ Header already initialized, skipping...');
            return;
        }
        
        console.log('🔧 [HeaderComponent] Starting initialization...');
        
        this.user = window.auth?.getCurrentUser();
        
        try {
            this.mount();
            console.log('✅ [HeaderComponent] Header mounted to DOM');
            
            this.attachEventListeners();
            console.log('✅ [HeaderComponent] Event listeners attached');
            
            this.initialized = true;
            
            if (!this.isDevMode) {
                this.loadNotifications();
            } else {
                console.log('🛠️ Dev mode: Skipping notifications API call');
                this.notificationCount = 0;
                this.updateNotificationBadge();
            }
            
            if (this.isDevMode) {
                console.log('🛠️ Developer Mode enabled - Test System available');
            }
            
            console.log('✅ [HeaderComponent] Initialization complete');
            
        } catch (error) {
            console.error('❌ [HeaderComponent] Initialization failed:', error);
            throw error;
        }
    }
    
    mount(selector = 'body') {
        const container = document.querySelector(selector);
        if (!container) {
            console.error(`❌ [HeaderComponent] Container '${selector}' not found`);
            return;
        }
        
        // Rimuovi header esistente per evitare duplicati
        const existingHeader = document.querySelector('.sol-header');
        if (existingHeader) {
            console.log('🔄 [HeaderComponent] Removing existing header');
            existingHeader.remove();
        }
        
        const headerHtml = this.render();
        container.insertAdjacentHTML('afterbegin', headerHtml);
        
        console.log('✅ [HeaderComponent] Header HTML inserted into DOM');
    }
    
    async render() {
        return `
            ${await this.renderHeader()}
            ${await this.renderDropdowns()}
            ${this.renderSidebar()}
            ${this.renderBackdrop()}
        `;
    }
    
    renderSidebar() {
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
        return '<div class="sol-backdrop" id="backdrop"></div>';
    }
    
    async getUserInfo() {
        // Se hai supabase disponibile
        if (window.supabase) {
            const { data: { user } } = await window.supabase.auth.getUser();
            if (user && user.email) {
                const name = user.email.split('@')[0]; // Usa parte prima di @
                return {
                    name: name.charAt(0).toUpperCase() + name.slice(1),
                    email: user.email,
                    initials: name.substring(0, 2).toUpperCase()
                };
            }
        }
        
        // Fallback
        return {
            name: 'Demo User',
            email: 'demo@example.com',
            initials: 'DU'
        };
    }
    
    isActive(href) {
        return window.location.pathname === href;
    }
    
    attachEventListeners() {
        // Menu toggle
        const menuToggle = document.getElementById('menuToggle');
        if (menuToggle) {
            menuToggle.addEventListener('click', () => {
                const sidebar = document.getElementById('sidebar');
                const backdrop = document.getElementById('backdrop');
                if (sidebar) sidebar.classList.toggle('active');
                if (backdrop) backdrop.classList.toggle('active');
            });
        }
        
        // Backdrop click
        const backdrop = document.getElementById('backdrop');
        if (backdrop) {
            backdrop.addEventListener('click', () => {
                const sidebar = document.getElementById('sidebar');
                sidebar?.classList.remove('active');
                backdrop.classList.remove('active');
            });
        }
        
        // User menu - FIXED: usa ModalSystem globale
        const userMenuBtn = document.getElementById('userMenuBtn');
        if (userMenuBtn) {
            userMenuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.toggleDropdown('userDropdown', 'userMenuBtn');
            });
        }
        
        // Notifications - FIXED: usa ModalSystem globale
        const notificationBtn = document.getElementById('notificationBtn');
        if (notificationBtn) {
            notificationBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.toggleDropdown('notificationDropdown', 'notificationBtn');
            });
        }
        
        // Logout - REMOVED: Now handled by handleLogout function
        
        // Global search
        const globalSearch = document.getElementById('globalSearch');
        if (globalSearch) {
            globalSearch.addEventListener('input', (e) => {
                this.handleSearch(e.target.value);
            });
        }
        
        // Custom actions
        this.options.customActions.forEach(action => {
            const btn = document.querySelector(`[data-action="${action.id || action.label}"]`);
            if (btn && action.handler) {
                btn.addEventListener('click', action.handler);
            }
        });
        
        // Close dropdowns on outside click
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
        
        // Prevent dropdown close when clicking inside
        const userDropdown = document.getElementById('userDropdown');
        if (userDropdown) {
            userDropdown.addEventListener('click', (e) => {
                if (!e.target.closest('a') && !e.target.closest('button')) {
                    e.stopPropagation();
                }
            });
        }
        
        const notificationDropdown = document.getElementById('notificationDropdown');
        if (notificationDropdown) {
            notificationDropdown.addEventListener('click', (e) => {
                if (!e.target.closest('a') && !e.target.closest('button')) {
                    e.stopPropagation();
                }
            });
        }
        
        // Mark all notifications as read
        const markAllRead = document.querySelector('.mark-all-read');
        if (markAllRead) {
            markAllRead.addEventListener('click', () => {
                this.markAllNotificationsRead();
            });
        }
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
    
    // FIXED: Load notifications with proper error handling
    async loadNotifications() {
        try {
            const data = await api.get('notifications', { silent: true });
            this.renderNotifications(data?.notifications || []);
            this.notificationCount = data?.unread_count || 0;
            this.updateNotificationBadge();
        } catch (error) {
            if (error.status === 404) {
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
    
    async renderRight() {
        const userInfo = await this.getUserInfo();
        
        return `
            <div class="sol-header-right">
                ${this.renderCustomActions()}
                ${this.isDevMode ? this.renderDevActions() : ''}
                ${this.options.showNotifications ? this.renderNotificationButton() : ''}
                ${this.options.showUser ? this.renderUserButton(userInfo) : ''}
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
    
    async renderDropdowns() {
        return `
            ${await this.renderUserDropdown()}
            ${this.renderNotificationDropdown()}
        `;
    }
    
    async renderUserDropdown() {
        const userInfo = await this.getUserInfo();
        
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

// ===== AUTO-INITIALIZATION =====
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 [HeaderComponent] DOMContentLoaded - Starting auto-init');
    try {
        await headerComponent.init();
        console.log('✅ [HeaderComponent] Auto-initialization complete');
    } catch (error) {
        console.error('❌ [HeaderComponent] Auto-initialization failed:', error);
    }
});

// Also try immediate init if DOM already loaded
if (document.readyState === 'loading') {
    // Will wait for DOMContentLoaded
} else {
    // DOM already loaded, init immediately
    console.log('🚀 [HeaderComponent] DOM already loaded - Immediate init');
    setTimeout(async () => {
        try {
            await headerComponent.init();
            console.log('✅ [HeaderComponent] Immediate initialization complete');
        } catch (error) {
            console.error('❌ [HeaderComponent] Immediate initialization failed:', error);
        }
    }, 100);
}

// Aggiungi la funzione handleLogout globale
window.handleLogout = async function(event) {
    event.preventDefault();
    
    if (confirm('Vuoi uscire dal tuo account?')) {
        // Check if supabase is available
        if (window.supabase) {
            const { error } = await window.supabase.auth.signOut();
            if (!error) {
                window.location.href = '/login.html';
            } else {
                console.error('Logout error:', error);
                // Fallback logout
                window.location.href = '/login.html';
            }
        } else {
            // Fallback if supabase is not available
            console.log('Supabase not available, using fallback logout');
            // Clear any local storage items
            localStorage.removeItem('sb-access-token');
            localStorage.removeItem('sb-refresh-token');
            window.location.href = '/login.html';
        }
    }
};

export default headerComponent;