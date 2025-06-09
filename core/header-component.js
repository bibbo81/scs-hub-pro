// header-component.js - Header unificato per tutte le pagine ES6
import api from './api-client.js';
import notificationSystem from './notification-system.js';
import { auth, authInit } from './auth-init.js';

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
    }
    
    async init() {
        // Get user info
        this.user = auth?.getCurrentUser();
        
        // Mount header
        this.mount();
        
        // Setup event listeners
        this.attachEventListeners();
        
        // Load notifications count
        this.loadNotifications();
    }
    
    mount(selector = 'body') {
        const container = document.querySelector(selector);
        const headerHtml = this.render();
        
        // Insert at beginning of body
        container.insertAdjacentHTML('afterbegin', headerHtml);
    }
    
    render() {
        return `
            ${this.renderHeader()}
            ${this.renderDropdowns()}
            ${this.renderSidebar()}
            ${this.renderBackdrop()}
        `;
    }
    
    renderHeader() {
        return `
            <header class="sol-header">
                <div class="sol-header-content">
                    ${this.renderLeft()}
                    ${this.renderCenter()}
                    ${this.renderRight()}
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
    
    renderRight() {
        const userInfo = this.getUserInfo();
        
        return `
            <div class="sol-header-right">
                ${this.renderCustomActions()}
                ${this.options.showNotifications ? this.renderNotificationButton() : ''}
                ${this.options.showUser ? this.renderUserButton(userInfo) : ''}
            </div>
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
    
    renderDropdowns() {
        return `
            ${this.renderUserDropdown()}
            ${this.renderNotificationDropdown()}
        `;
    }
    
    renderUserDropdown() {
        const userInfo = this.getUserInfo();
        
        return `
            <div class="sol-dropdown" id="userDropdown">
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
                </div>
                <div class="sol-dropdown-footer">
                    <button class="sol-dropdown-item" id="logoutBtn">
                        <i class="fas fa-sign-out-alt"></i> Esci
                    </button>
                </div>
            </div>
        `;
    }
    
    renderNotificationDropdown() {
        return `
            <div class="sol-dropdown sol-dropdown-notifications" id="notificationDropdown">
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
    
    renderSidebar() {
        const menuItems = [
            { icon: 'fa-chart-line', label: 'Dashboard', href: '/dashboard.html' },
            { icon: 'fa-box', label: 'Spedizioni', href: '/shipments.html' },
            { icon: 'fa-truck', label: 'Corrieri', href: '/carriers.html' },
            { icon: 'fa-map-marker-alt', label: 'Tracking', href: '/tracking.html' },
            { divider: true },
            { icon: 'fa-upload', label: 'Importa Dati', href: '/import.html' },
            { icon: 'fa-file-alt', label: 'Report', href: '/reports.html' },
            { icon: 'fa-coins', label: 'Analisi Costi', href: '/costs.html' },
            { divider: true },
            { icon: 'fa-users', label: 'Team', href: '/team.html' },
            { icon: 'fa-cog', label: 'Impostazioni', href: '/settings.html' }
        ];
        
        return `
            <aside class="sol-sidebar" id="sidebar">
                <nav class="sol-nav">
                    ${menuItems.map(item => {
                        if (item.divider) {
                            return '<div class="sol-nav-divider"></div>';
                        }
                        return `
                            <a href="${item.href}" class="sol-nav-item ${this.isActive(item.href) ? 'active' : ''}">
                                <i class="fas ${item.icon}"></i>
                                <span>${item.label}</span>
                            </a>
                        `;
                    }).join('')}
                </nav>
            </aside>
        `;
    }
    
    renderBackdrop() {
        return '<div class="sol-backdrop" id="backdrop"></div>';
    }
    
    // Utilities
    getUserInfo() {
        if (!this.user) {
            return {
                name: 'Utente',
                email: '',
                initials: 'U'
            };
        }
        
        const name = authInit?.formatUserName(this.user) || 'Utente';
        const initials = authInit?.getUserInitials(name) || 'U';
        
        return {
            name,
            email: this.user.email || '',
            initials
        };
    }
    
    isActive(href) {
        return window.location.pathname === href;
    }
    
    // Event Listeners
    attachEventListeners() {
        // Menu toggle
        document.getElementById('menuToggle')?.addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('active');
            document.getElementById('backdrop').classList.toggle('active');
        });
        
        // Backdrop click
        document.getElementById('backdrop')?.addEventListener('click', () => {
            document.getElementById('sidebar').classList.remove('active');
            document.getElementById('backdrop').classList.remove('active');
        });
        
        // User menu
        document.getElementById('userMenuBtn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleDropdown('userDropdown');
        });
        
        // Notifications
        document.getElementById('notificationBtn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleDropdown('notificationDropdown');
        });
        
        // Logout
        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            if (auth?.logout) {
                auth.logout();
            } else {
                window.location.replace('/login.html');
            }
        });
        
        // Global search
        document.getElementById('globalSearch')?.addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });
        
        // Custom actions
        this.options.customActions.forEach(action => {
            const btn = document.querySelector(`[data-action="${action.id || action.label}"]`);
            if (btn && action.handler) {
                btn.addEventListener('click', action.handler);
            }
        });
        
        // Close dropdowns on outside click
        document.addEventListener('click', () => {
            this.closeAllDropdowns();
        });
        
        // Prevent dropdown close on inside click
        document.querySelectorAll('.sol-dropdown').forEach(dropdown => {
            dropdown.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        });
        
        // Mark all notifications as read
        document.querySelector('.mark-all-read')?.addEventListener('click', () => {
            this.markAllNotificationsRead();
        });
    }
    
    // Dropdown management
    toggleDropdown(id) {
        const dropdown = document.getElementById(id);
        const isOpen = dropdown.style.display === 'block';
        
        this.closeAllDropdowns();
        
        if (!isOpen) {
            dropdown.style.display = 'block';
        }
    }
    
    closeAllDropdowns() {
        document.querySelectorAll('.sol-dropdown').forEach(dropdown => {
            dropdown.style.display = 'none';
        });
    }
    
    // Load notifications
    async loadNotifications() {
        try {
            const data = await api.get('notifications', { silent: true });
            this.renderNotifications(data?.notifications || []);
            this.notificationCount = data?.unread_count || 0;
            this.updateNotificationBadge();
        } catch (error) {
            console.error('Failed to load notifications:', error);
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
    
    async markAllNotificationsRead() {
        try {
            await api.post('notifications/mark-all-read');
            this.notificationCount = 0;
            this.updateNotificationBadge();
            const items = document.querySelectorAll('.notification-item.unread');
            items.forEach(item => item.classList.remove('unread'));
            notificationSystem.success('Tutte le notifiche sono state segnate come lette');
        } catch (error) {
            notificationSystem.error('Errore nel segnare le notifiche come lette');
        }
    }
    
    getNotificationIcon(type) {
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle',
            shipment: 'fa-box',
            tracking: 'fa-map-marker-alt'
        };
        return icons[type] || 'fa-bell';
    }
    
    formatTime(date) {
        // Implementa formattazione relativa del tempo
        const now = new Date();
        const then = new Date(date);
        const diff = now - then;
        
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 60) return `${minutes} minuti fa`;
        if (hours < 24) return `${hours} ore fa`;
        if (days < 7) return `${days} giorni fa`;
        
        return then.toLocaleDateString('it-IT');
    }
    
    // Search handler
    handleSearch(query) {
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        
        this.searchTimeout = setTimeout(() => {
            if (query.length >= 3) {
                // Implementa ricerca globale
                console.log('Global search:', query);
                // Emit search event
                window.dispatchEvent(new CustomEvent('header:search', {
                    detail: { query }
                }));
            }
        }, 300);
    }
}

// Create singleton
const headerComponent = new HeaderComponent();

// Export singleton
export default headerComponent;

// Auto-init on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => headerComponent.init());
} else {
    headerComponent.init();
}