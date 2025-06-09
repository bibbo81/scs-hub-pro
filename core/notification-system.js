// notification-system.js - Sistema notifiche toast unificato ES6
export class NotificationSystem {
    constructor() {
        this.container = null;
        this.queue = [];
        this.init();
    }
    
    init() {
        // Crea container se non esiste
        if (!document.getElementById('notification-container')) {
            this.container = document.createElement('div');
            this.container.id = 'notification-container';
            this.container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
                display: flex;
                flex-direction: column;
                gap: 12px;
                pointer-events: none;
            `;
            document.body.appendChild(this.container);
        } else {
            this.container = document.getElementById('notification-container');
        }
    }
    
    show(message, type = 'info', duration = 3000, options = {}) {
        const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const notification = document.createElement('div');
        notification.id = id;
        notification.style.cssText = `
            min-width: 300px;
            max-width: 500px;
            padding: 16px 20px;
            background: var(--sol-glass-heavy, rgba(13, 17, 23, 0.95));
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
            display: flex;
            align-items: center;
            gap: 12px;
            opacity: 0;
            transform: translateX(100px);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            pointer-events: all;
            cursor: pointer;
        `;
        
        // Icone e colori per tipo
        const config = {
            success: { 
                icon: 'fa-check-circle', 
                color: '#34C759',
                bg: 'rgba(52, 199, 89, 0.1)',
                border: 'rgba(52, 199, 89, 0.3)'
            },
            error: { 
                icon: 'fa-exclamation-circle', 
                color: '#FF3B30',
                bg: 'rgba(255, 59, 48, 0.1)',
                border: 'rgba(255, 59, 48, 0.3)'
            },
            warning: { 
                icon: 'fa-exclamation-triangle', 
                color: '#FF9500',
                bg: 'rgba(255, 149, 0, 0.1)',
                border: 'rgba(255, 149, 0, 0.3)'
            },
            info: { 
                icon: 'fa-info-circle', 
                color: '#007AFF',
                bg: 'rgba(0, 122, 255, 0.1)',
                border: 'rgba(0, 122, 255, 0.3)'
            }
        };
        
        const typeConfig = config[type] || config.info;
        
        // Aggiungi background colorato
        notification.style.background = typeConfig.bg;
        notification.style.borderColor = typeConfig.border;
        
        // Contenuto
        notification.innerHTML = `
            <i class="fas ${typeConfig.icon}" style="
                color: ${typeConfig.color}; 
                font-size: 20px;
                flex-shrink: 0;
            "></i>
            <div style="flex: 1;">
                <div style="
                    color: var(--sol-text-primary, #fff);
                    font-size: 14px;
                    font-weight: 500;
                    line-height: 1.4;
                ">${message}</div>
                ${options.subtitle ? `
                    <div style="
                        color: var(--sol-text-secondary, rgba(255,255,255,0.7));
                        font-size: 12px;
                        margin-top: 4px;
                    ">${options.subtitle}</div>
                ` : ''}
            </div>
            ${options.actions ? `
                <div style="display: flex; gap: 8px;">
                    ${options.actions.map(action => `
                        <button onclick="${action.handler}" style="
                            background: transparent;
                            border: 1px solid ${typeConfig.border};
                            color: ${typeConfig.color};
                            padding: 4px 12px;
                            border-radius: 6px;
                            font-size: 12px;
                            cursor: pointer;
                            transition: all 0.2s;
                        ">${action.label}</button>
                    `).join('')}
                </div>
            ` : ''}
            <button data-dismiss="${id}" style="
                background: transparent;
                border: none;
                color: var(--sol-text-tertiary, rgba(255,255,255,0.5));
                padding: 4px;
                cursor: pointer;
                transition: all 0.2s;
                margin-left: 8px;
            ">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Click per dismissare
        notification.addEventListener('click', (e) => {
            if (e.target.matches('[data-dismiss]') || !e.target.closest('button')) {
                this.dismiss(id);
            }
        });
        
        // Aggiungi al container
        this.container.appendChild(notification);
        
        // Trigger animazione entrata
        requestAnimationFrame(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        });
        
        // Auto dismiss
        if (duration > 0) {
            setTimeout(() => this.dismiss(id), duration);
        }
        
        // Gestione coda
        this.manageQueue();
        
        return id;
    }
    
    dismiss(id) {
        const notification = document.getElementById(id);
        if (!notification) return;
        
        // Animazione uscita
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100px)';
        
        setTimeout(() => {
            notification.remove();
            this.manageQueue();
        }, 300);
    }
    
    dismissAll() {
        const notifications = this.container.querySelectorAll('[id^="notification-"]');
        notifications.forEach(n => {
            const id = n.id;
            this.dismiss(id);
        });
    }
    
    manageQueue() {
        // Limita a 5 notifiche visibili
        const notifications = this.container.querySelectorAll('[id^="notification-"]');
        if (notifications.length > 5) {
            const excess = notifications.length - 5;
            for (let i = 0; i < excess; i++) {
                this.dismiss(notifications[i].id);
            }
        }
    }
    
    // Metodi convenience
    success(message, options) {
        return this.show(message, 'success', 3000, options);
    }
    
    error(message, options) {
        return this.show(message, 'error', 5000, options);
    }
    
    warning(message, options) {
        return this.show(message, 'warning', 4000, options);
    }
    
    info(message, options) {
        return this.show(message, 'info', 3000, options);
    }
    
    // Loading notification (no auto-dismiss)
    loading(message, options = {}) {
        return this.show(message, 'info', 0, {
            ...options,
            subtitle: options.subtitle || 'Attendere prego...'
        });
    }
}

// Create singleton instance
const notificationSystem = new NotificationSystem();

// Export singleton
export default notificationSystem;

// Export convenience function
export function showNotification(message, type, duration, options) {
    return notificationSystem.show(message, type, duration, options);
}