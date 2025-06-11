// header-component.js - Header unificato per tutte le pagine ES6
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
    }
    
    async init() {
        // Get user info
        this.user = window.auth?.getCurrentUser();
        
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
    
    renderSidebar() {
        const menuItems = [
            { icon: 'fa-chart-line', label: 'Dashboard', href: '/dashboard.html' },
            { icon: 'fa-box', label: 'Tracking', href: '/tracking.html' },
            { icon: 'fa-cubes', label: 'Prodotti', href: '/products.html' },
            { icon: 'fa-ship', label: 'Spedizioni', href: '/shipments.html' },
            { icon: 'fa-truck', label: 'Corrieri', href: '/carriers.html' },
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
                name: 'Demo User',
                email: 'demo@example.com',
                initials: 'DU'
            };
        }
        
        const name = window.authInit?.formatUserName(this.user) || 'Demo User';
        const initials = window.authInit?.getUserInitials(name) || 'DU';
        
        return {
            name,
            email: this.user.email || 'demo@example.com',
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
            e.preventDefault();
            this.toggleDropdown('userDropdown', 'userMenuBtn');
        });
        
        // Notifications
        document.getElementById('notificationBtn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            this.toggleDropdown('notificationDropdown', 'notificationBtn');
        });
        
        // Logout
        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            if (window.auth?.logout) {
                window.auth.logout();
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
        document.getElementById('userDropdown')?.addEventListener('click', (e) => {
            if (!e.target.closest('a') && !e.target.closest('button')) {
                e.stopPropagation();
            }
        });
        
        document.getElementById('notificationDropdown')?.addEventListener('click', (e) => {
            if (!e.target.closest('a') && !e.target.closest('button')) {
                e.stopPropagation();
            }
        });
        
        // Mark all notifications as read
        document.querySelector('.mark-all-read')?.addEventListener('click', () => {
            this.markAllNotificationsRead();
        });
    }
    
    // Dropdown management - SIMPLIFIED VERSION
    toggleDropdown(dropdownId, buttonId) {
        const dropdown = document.getElementById(dropdownId);
        const button = document.getElementById(buttonId);
        const isOpen = dropdown.style.display === 'block';
        
        this.closeAllDropdowns();
        
        if (!isOpen && button) {
            dropdown.style.display = 'block';
            
            // Check if dropdown goes below viewport
            const dropdownRect = dropdown.getBoundingClientRect();
            const windowHeight = window.innerHeight;
            
            if (dropdownRect.bottom > windowHeight - 20) {
                // Add dropup class if not enough space below
                dropdown.classList.add('dropup');
            } else {
                // Remove dropup class if there's space
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
            await api.post('notifications/mark-all-read');
            this.notificationCount = 0;
            this.updateNotificationBadge();
            
            // Update UI
            document.querySelectorAll('.notification-item.unread').forEach(item => {
                item.classList.remove('unread');
            });
        } catch (error) {
            console.error('Failed to mark notifications as read:', error);
        }
    }
    
    // Search functionality
    handleSearch(query) {
        clearTimeout(this.searchTimeout);
        
        if (!query.trim()) return;
        
        this.searchTimeout = setTimeout(() => {
            // Implement global search
            console.log('Searching for:', query);
            // You can redirect to search results or show inline results
        }, 300);
    }
}

// Export singleton instance
const headerComponent = new HeaderComponent();
export default headerComponent;