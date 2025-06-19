// notification-system.js - VERSIONE CORRETTA - FIX AUTO-HIDE E COMPATIBILITÀ MODAL
export class NotificationSystem {
    constructor() {
        this.container = null;
        this.queue = [];
        this.activeTimeouts = new Map(); // Track timeouts per gestire meglio la pulizia
        this.maxNotifications = 5;
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
                z-index: 5000;
                display: flex;
                flex-direction: column;
                gap: 12px;
                pointer-events: none;
                max-width: 400px;
            `;
            document.body.appendChild(this.container);
        } else {
            this.container = document.getElementById('notification-container');
        }
    }
    
    show(message, type = 'info', duration = 3000, options = {}) {
        // Validazione input
        if (!message || typeof message !== 'string') {
            console.warn('[NotificationSystem] Invalid message:', message);
            return null;
        }
        
        const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const notification = document.createElement('div');
        notification.id = id;
        notification.className = 'sol-notification';
        notification.style.cssText = `
            min-width: 320px;
            max-width: 400px;
            padding: 16px 20px;
            background: var(--sol-glass-heavy, rgba(13, 17, 23, 0.95));
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            display: flex;
            align-items: flex-start;
            gap: 12px;
            opacity: 0;
            transform: translateX(100px);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            pointer-events: all;
            cursor: pointer;
            position: relative;
            overflow: hidden;
            word-wrap: break-word;
        `;
        
        // Icone e colori per tipo
        const config = {
            success: { 
                icon: 'fa-check-circle', 
                color: '#34C759',
                bg: 'linear-gradient(135deg, rgba(52, 199, 89, 0.15), rgba(52, 199, 89, 0.05))',
                border: 'rgba(52, 199, 89, 0.4)'
            },
            error: { 
                icon: 'fa-exclamation-circle', 
                color: '#FF3B30',
                bg: 'linear-gradient(135deg, rgba(255, 59, 48, 0.15), rgba(255, 59, 48, 0.05))',
                border: 'rgba(255, 59, 48, 0.4)'
            },
            warning: { 
                icon: 'fa-exclamation-triangle', 
                color: '#FF9500',
                bg: 'linear-gradient(135deg, rgba(255, 149, 0, 0.15), rgba(255, 149, 0, 0.05))',
                border: 'rgba(255, 149, 0, 0.4)'
            },
            info: { 
                icon: 'fa-info-circle', 
                color: '#007AFF',
                bg: 'linear-gradient(135deg, rgba(0, 122, 255, 0.15), rgba(0, 122, 255, 0.05))',
                border: 'rgba(0, 122, 255, 0.4)'
            }
        };
        
        const typeConfig = config[type] || config.info;
        
        // Aggiungi background colorato
        notification.style.background = typeConfig.bg;
        notification.style.borderColor = typeConfig.border;
        
        // Progress bar per durata (opzionale)
        const showProgressBar = duration > 0 && duration <= 10000; // Solo per durate ragionevoli
        
        // Contenuto
        notification.innerHTML = `
            <i class="fas ${typeConfig.icon}" style="
                color: ${typeConfig.color}; 
                font-size: 20px;
                flex-shrink: 0;
                margin-top: 2px;
            "></i>
            <div style="flex: 1; min-width: 0;">
                <div style="
                    color: var(--sol-text-primary, #fff);
                    font-size: 14px;
                    font-weight: 600;
                    line-height: 1.4;
                    margin-bottom: ${options.subtitle ? '4px' : '0'};
                ">${message}</div>
                ${options.subtitle ? `
                    <div style="
                        color: var(--sol-text-secondary, rgba(255,255,255,0.7));
                        font-size: 12px;
                        line-height: 1.3;
                    ">${options.subtitle}</div>
                ` : ''}
                ${options.actions ? `
                    <div style="
                        display: flex; 
                        gap: 8px; 
                        margin-top: 12px;
                        flex-wrap: wrap;
                    ">
                        ${options.actions.map((action, index) => `
                            <button 
                                data-action="${index}" 
                                data-notification-id="${id}"
                                style="
                                    background: transparent;
                                    border: 1px solid ${typeConfig.color};
                                    color: ${typeConfig.color};
                                    padding: 6px 12px;
                                    border-radius: 6px;
                                    font-size: 12px;
                                    font-weight: 500;
                                    cursor: pointer;
                                    transition: all 0.2s;
                                "
                                onmouseover="this.style.background='${typeConfig.color}'; this.style.color='white';"
                                onmouseout="this.style.background='transparent'; this.style.color='${typeConfig.color}';"
                            >${action.label}</button>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
            <button 
                data-dismiss="${id}" 
                style="
                    background: transparent;
                    border: none;
                    color: var(--sol-text-tertiary, rgba(255,255,255,0.5));
                    padding: 4px;
                    cursor: pointer;
                    transition: all 0.2s;
                    margin-left: 8px;
                    flex-shrink: 0;
                    border-radius: 4px;
                    width: 24px;
                    height: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                "
                onmouseover="this.style.background='rgba(255,255,255,0.1)'; this.style.color='rgba(255,255,255,0.8)';"
                onmouseout="this.style.background='transparent'; this.style.color='rgba(255,255,255,0.5)';"
            >
                <i class="fas fa-times" style="font-size: 12px;"></i>
            </button>
            ${showProgressBar ? `
                <div class="notification-progress" style="
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    height: 3px;
                    background: ${typeConfig.color};
                    width: 100%;
                    transform-origin: left;
                    animation: notificationProgress ${duration}ms linear forwards;
                "></div>
                <style>
                    @keyframes notificationProgress {
                        from { transform: scaleX(1); }
                        to { transform: scaleX(0); }
                    }
                </style>
            ` : ''}
        `;
        
        // Event listeners
        this.setupNotificationEvents(notification, id, options);
        
        // Aggiungi al container
        this.container.appendChild(notification);
        
        // Trigger animazione entrata
        requestAnimationFrame(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        });
        
        // ✅ FIX PRINCIPALE: Auto dismiss con binding corretto
        if (duration > 0) {
            const timeoutId = setTimeout(() => {
                this.dismiss(id); // ✅ CORRETTO: this.dismiss invece di dismiss
            }, duration);
            
            // Salva il timeout per poterlo cancellare se necessario
            this.activeTimeouts.set(id, timeoutId);
        }
        
        // Gestione coda
        this.manageQueue();
        
        console.log(`[NotificationSystem] ✅ Notification created: ${id} (${type})`);
        
        return id;
    }
    
    setupNotificationEvents(notification, id, options) {
        // Click per dismissare o azioni
        notification.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Dismiss button
            if (e.target.matches('[data-dismiss]') || e.target.closest('[data-dismiss]')) {
                this.dismiss(id);
                return;
            }
            
            // Action buttons
            const actionBtn = e.target.closest('[data-action]');
            if (actionBtn && options.actions) {
                const actionIndex = parseInt(actionBtn.dataset.action);
                const action = options.actions[actionIndex];
                
                if (action && typeof action.handler === 'function') {
                    try {
                        action.handler();
                        // Auto-dismiss dopo azione a meno che non specificato diversamente
                        if (action.autoDismiss !== false) {
                            this.dismiss(id);
                        }
                    } catch (error) {
                        console.error('[NotificationSystem] Error in action handler:', error);
                        this.dismiss(id);
                    }
                }
                return;
            }
            
            // Click generale sulla notifica (se non ha azioni)
            if (!options.actions && !options.persistent) {
                this.dismiss(id);
            }
        });
        
        // Hover per pausare auto-dismiss
        if (this.activeTimeouts.has(id)) {
            let pauseTimeout = null;
            
            notification.addEventListener('mouseenter', () => {
                if (this.activeTimeouts.has(id)) {
                    clearTimeout(this.activeTimeouts.get(id));
                    this.activeTimeouts.delete(id);
                    
                    // Pausa progress bar se presente
                    const progressBar = notification.querySelector('.notification-progress');
                    if (progressBar) {
                        progressBar.style.animationPlayState = 'paused';
                    }
                }
            });
            
            notification.addEventListener('mouseleave', () => {
                if (!this.activeTimeouts.has(id)) {
                    // Riprendi auto-dismiss con tempo rimanente (esempio: 2 secondi)
                    pauseTimeout = setTimeout(() => {
                        this.dismiss(id);
                    }, 2000);
                    this.activeTimeouts.set(id, pauseTimeout);
                    
                    // Riprendi progress bar
                    const progressBar = notification.querySelector('.notification-progress');
                    if (progressBar) {
                        progressBar.style.animation = 'notificationProgress 2000ms linear forwards';
                    }
                }
            });
        }
    }
    
    dismiss(id) {
        const notification = document.getElementById(id);
        if (!notification) {
            console.warn(`[NotificationSystem] ⚠️ Notification not found: ${id}`);
            return;
        }
        
        // Cancella eventuali timeout pendenti
        if (this.activeTimeouts.has(id)) {
            clearTimeout(this.activeTimeouts.get(id));
            this.activeTimeouts.delete(id);
        }
        
        // Animazione uscita
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100px) scale(0.95)';
        
        setTimeout(() => {
            if (notification && notification.parentNode) {
                notification.remove();
                console.log(`[NotificationSystem] ✅ Notification dismissed: ${id}`);
            }
            this.manageQueue();
        }, 300);
    }
    
    dismissAll() {
        const notifications = this.container.querySelectorAll('.sol-notification');
        notifications.forEach(n => {
            if (n.id) {
                this.dismiss(n.id);
            }
        });
        
        // Pulisci tutti i timeout
        this.activeTimeouts.forEach((timeoutId) => {
            clearTimeout(timeoutId);
        });
        this.activeTimeouts.clear();
        
        console.log('[NotificationSystem] ✅ All notifications dismissed');
    }
    
    manageQueue() {
        // Limita al numero massimo di notifiche visibili
        const notifications = this.container.querySelectorAll('.sol-notification');
        if (notifications.length > this.maxNotifications) {
            const excess = notifications.length - this.maxNotifications;
            for (let i = 0; i < excess; i++) {
                const oldestNotification = notifications[i];
                if (oldestNotification.id) {
                    this.dismiss(oldestNotification.id);
                }
            }
        }
    }
    
    // ===== METODI CONVENIENCE =====
    
    success(message, options = {}) {
        return this.show(message, 'success', options.duration || 3000, options);
    }
    
    error(message, options = {}) {
        return this.show(message, 'error', options.duration || 5000, options);
    }
    
    warning(message, options = {}) {
        return this.show(message, 'warning', options.duration || 4000, options);
    }
    
    info(message, options = {}) {
        return this.show(message, 'info', options.duration || 3000, options);
    }
    
    // Loading notification (no auto-dismiss by default)
    loading(message, options = {}) {
        return this.show(message, 'info', 0, {
            ...options,
            subtitle: options.subtitle || 'Attendere prego...',
            persistent: true
        });
    }
    
    // Progress notification con aggiornamento
    progress(message, options = {}) {
        const id = this.show(message, 'info', 0, {
            ...options,
            persistent: true,
            subtitle: '0% completato'
        });
        
        return {
            id,
            update: (progress, newMessage) => {
                const notification = document.getElementById(id);
                if (notification) {
                    const subtitle = notification.querySelector('[style*="text-secondary"]');
                    if (subtitle) {
                        subtitle.textContent = `${Math.round(progress)}% completato`;
                    }
                    
                    if (newMessage) {
                        const mainMessage = notification.querySelector('[style*="font-weight: 600"]');
                        if (mainMessage) {
                            mainMessage.textContent = newMessage;
                        }
                    }
                }
            },
            complete: (finalMessage) => {
                if (finalMessage) {
                    this.update(id, finalMessage, 'success', { duration: 2000 });
                } else {
                    this.dismiss(id);
                }
            },
            dismiss: () => this.dismiss(id)
        };
    }
    
    // Metodo per aggiornare una notifica esistente
    update(id, message, type = 'info', options = {}) {
        this.dismiss(id);
        return this.show(message, type, options.duration || 3000, options);
    }
    
    // ===== METODI DI UTILITÀ =====
    
    // Cleanup method per rimuovere riferimenti obsoleti
    cleanup() {
        // Rimuovi notifiche orfane
        const notifications = document.querySelectorAll('.sol-notification');
        notifications.forEach(n => {
            if (!this.container.contains(n)) {
                n.remove();
            }
        });
        
        // Pulisci timeout map
        this.activeTimeouts.forEach((timeoutId, id) => {
            if (!document.getElementById(id)) {
                clearTimeout(timeoutId);
                this.activeTimeouts.delete(id);
            }
        });
    }
    
    // Metodi di controllo
    getActiveNotifications() {
        return Array.from(this.container.querySelectorAll('.sol-notification')).map(n => ({
            id: n.id,
            type: n.dataset.type || 'unknown'
        }));
    }
    
    hasActiveNotifications() {
        return this.container.querySelectorAll('.sol-notification').length > 0;
    }
    
    // Configurazione
    setMaxNotifications(max) {
        this.maxNotifications = Math.max(1, Math.min(10, max));
        this.manageQueue();
    }
    
    // ===== COMPATIBILITÀ CON MODAL SYSTEM =====
    
    // Pausa tutte le notifiche quando un modal è aperto
    pauseAll() {
        this.activeTimeouts.forEach((timeoutId, id) => {
            clearTimeout(timeoutId);
            const notification = document.getElementById(id);
            if (notification) {
                const progressBar = notification.querySelector('.notification-progress');
                if (progressBar) {
                    progressBar.style.animationPlayState = 'paused';
                }
            }
        });
        this.activeTimeouts.clear();
    }
    
    // Riprendi tutte le notifiche quando il modal si chiude
    resumeAll() {
        const notifications = this.container.querySelectorAll('.sol-notification');
        notifications.forEach(notification => {
            const progressBar = notification.querySelector('.notification-progress');
            if (progressBar) {
                progressBar.style.animationPlayState = 'running';
            }
            
            // Aggiungi timeout ridotto per le notifiche pausate
            if (!this.activeTimeouts.has(notification.id)) {
                const timeoutId = setTimeout(() => {
                    this.dismiss(notification.id);
                }, 2000); // Tempo ridotto dopo pausa
                this.activeTimeouts.set(notification.id, timeoutId);
            }
        });
    }
}

// ===== SINGLETON INSTANCE =====
const notificationSystem = new NotificationSystem();

// ===== INTEGRAZIONE CON MODAL SYSTEM =====
// Monitora l'apertura/chiusura dei modal per gestire le notifiche
let modalObserver = null;

function setupModalIntegration() {
    if (modalObserver) return;
    
    modalObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1 && node.classList && node.classList.contains('sol-modal-overlay')) {
                    // Modal aperto - pausa notifiche
                    notificationSystem.pauseAll();
                }
            });
            
            mutation.removedNodes.forEach((node) => {
                if (node.nodeType === 1 && node.classList && node.classList.contains('sol-modal-overlay')) {
                    // Modal chiuso - riprendi notifiche
                    setTimeout(() => {
                        const activeModals = document.querySelectorAll('.sol-modal-overlay');
                        if (activeModals.length === 0) {
                            notificationSystem.resumeAll();
                        }
                    }, 100);
                }
            });
        });
    });
    
    modalObserver.observe(document.body, {
        childList: true,
        subtree: true
    });
}

// ===== SETUP AUTOMATICO =====
document.addEventListener('DOMContentLoaded', () => {
    setupModalIntegration();
});

// Pulizia periodica per evitare memory leaks
setInterval(() => {
    notificationSystem.cleanup();
}, 30000); // ogni 30 secondi

// ===== EXPORT =====
export default notificationSystem;

// Export convenience functions
export function showNotification(message, type, duration, options) {
    return notificationSystem.show(message, type, duration, options);
}

export function dismissNotification(id) {
    return notificationSystem.dismiss(id);
}

export function dismissAllNotifications() {
    return notificationSystem.dismissAll();
}

// ===== GLOBAL ASSIGNMENT PER COMPATIBILITÀ =====
if (typeof window !== 'undefined') {
    window.NotificationSystem = notificationSystem;
    
    // Metodi globali convenience
    window.showNotification = showNotification;
    window.showSuccess = (msg, opts) => notificationSystem.success(msg, opts);
    window.showError = (msg, opts) => notificationSystem.error(msg, opts);
    window.showWarning = (msg, opts) => notificationSystem.warning(msg, opts);
    window.showInfo = (msg, opts) => notificationSystem.info(msg, opts);
}