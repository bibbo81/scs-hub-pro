// modal-system.js - Sistema unificato per gestione modali
(function() {
    'use strict';
    
    window.ModalSystem = {
        // Configurazione default
        defaults: {
            maxWidth: '600px',
            animation: true,
            closeOnBackdrop: true,
            closeOnEsc: true
        },
        
        // Registry delle modali attive
        activeModals: new Map(),
        
        /**
         * Crea una nuova modal
         * @param {Object} options - Opzioni della modal
         * @returns {HTMLElement} Elemento modal creato
         */
        create(options = {}) {
            const config = { ...this.defaults, ...options };
            const modalId = `modal-${Date.now()}`;
            
            // Crea struttura modal
            const modal = document.createElement('div');
            modal.className = 'sol-modal-overlay';
            modal.id = modalId;
            modal.innerHTML = `
                <div class="sol-modal-content" style="max-width: ${config.maxWidth}">
                    ${config.header !== false ? `
                        <div class="sol-modal-header">
                            <h2 class="sol-modal-title">${config.title || ''}</h2>
                            ${config.hideClose ? '' : `
                                <button class="sol-modal-close" onclick="ModalSystem.close('${modalId}')">
                                    <i class="fas fa-times"></i>
                                </button>
                            `}
                        </div>
                    ` : ''}
                    <div class="sol-modal-body">
                        ${config.content || ''}
                    </div>
                    ${config.footer ? `
                        <div class="sol-modal-footer">
                            ${config.footer}
                        </div>
                    ` : ''}
                </div>
            `;
            
            // Aggiungi al DOM
            document.body.appendChild(modal);
            
            // Salva reference
            this.activeModals.set(modalId, {
                element: modal,
                config: config,
                onClose: config.onClose
            });
            
            // Setup event listeners
            this.setupModalEvents(modalId, config);
            
            // Animazione apertura
            if (config.animation) {
                requestAnimationFrame(() => {
                    modal.classList.add('active');
                });
            } else {
                modal.classList.add('active', 'no-animation');
            }
            
            return modal;
        },
        
        /**
         * Modal di conferma
         * @param {Object} options - Opzioni della modal di conferma
         * @returns {Promise} Promise che risolve con true/false
         */
        confirm(options = {}) {
            return new Promise((resolve) => {
                const modal = this.create({
                    title: options.title || 'Conferma',
                    content: options.message || 'Sei sicuro?',
                    maxWidth: options.maxWidth || '500px',
                    footer: `
                        <button class="sol-btn sol-btn-glass" onclick="ModalSystem.resolveConfirm('${modal.id}', false)">
                            ${options.cancelText || 'Annulla'}
                        </button>
                        <button class="sol-btn sol-btn-primary" onclick="ModalSystem.resolveConfirm('${modal.id}', true)">
                            ${options.confirmText || 'Conferma'}
                        </button>
                    `,
                    hideClose: true,
                    closeOnBackdrop: false,
                    closeOnEsc: false,
                    onClose: (result) => resolve(result || false)
                });
                
                // Salva resolver
                const modalData = this.activeModals.get(modal.id);
                modalData.resolver = resolve;
            });
        },
        
        /**
         * Modal di progresso
         * @param {Object} options - Opzioni della modal di progresso
         * @returns {Object} Oggetto con metodi per controllare il progresso
         */
        progress(options = {}) {
            const modalId = `modal-progress-${Date.now()}`;
            
            const modal = this.create({
                title: options.title || 'Operazione in corso...',
                content: `
                    <div class="sol-progress-wrapper">
                        ${options.message ? `
                            <p class="sol-progress-message" id="${modalId}-message">
                                ${options.message}
                            </p>
                        ` : ''}
                        <div class="sol-progress-bar">
                            <div class="sol-progress-fill" id="${modalId}-bar" style="width: 0%"></div>
                        </div>
                        ${options.showPercentage ? `
                            <p class="sol-progress-percentage" id="${modalId}-percentage">0%</p>
                        ` : ''}
                        ${options.showStats ? `
                            <div class="sol-progress-stats" id="${modalId}-stats"></div>
                        ` : ''}
                    </div>
                `,
                hideClose: true,
                closeOnBackdrop: false,
                closeOnEsc: false,
                maxWidth: options.maxWidth || '500px'
            });
            
            // Ritorna controller
            return {
                modalId: modal.id,
                
                update(progress, message) {
                    const bar = document.getElementById(`${modalId}-bar`);
                    const msg = document.getElementById(`${modalId}-message`);
                    const pct = document.getElementById(`${modalId}-percentage`);
                    
                    if (bar) bar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
                    if (msg && message) msg.textContent = message;
                    if (pct) pct.textContent = `${Math.round(progress)}%`;
                },
                
                setStats(stats) {
                    const statsEl = document.getElementById(`${modalId}-stats`);
                    if (statsEl && stats) {
                        statsEl.innerHTML = Object.entries(stats)
                            .map(([key, value]) => `
                                <div class="sol-progress-stat">
                                    <span class="stat-label">${key}:</span>
                                    <span class="stat-value">${value}</span>
                                </div>
                            `).join('');
                    }
                },
                
                close() {
                    ModalSystem.close(modal.id);
                }
            };
        },
        
        /**
         * Modal di notifica/alert
         * @param {Object} options - Opzioni della modal
         */
        alert(options = {}) {
            const typeConfig = {
                success: { icon: 'fa-check-circle', color: '#34C759' },
                error: { icon: 'fa-exclamation-circle', color: '#FF3B30' },
                warning: { icon: 'fa-exclamation-triangle', color: '#FF9500' },
                info: { icon: 'fa-info-circle', color: '#007AFF' }
            };
            
            const type = typeConfig[options.type] || typeConfig.info;
            
            return this.create({
                title: options.title || '',
                content: `
                    <div class="sol-alert-content">
                        <i class="fas ${type.icon}" style="font-size: 3rem; color: ${type.color}; margin-bottom: 1rem;"></i>
                        <p>${options.message || ''}</p>
                    </div>
                `,
                footer: `
                    <button class="sol-btn sol-btn-primary" onclick="ModalSystem.close('${this.id}')">
                        ${options.buttonText || 'OK'}
                    </button>
                `,
                maxWidth: '400px',
                hideClose: options.hideClose
            });
        },
        
        /**
         * Chiudi modal
         * @param {string} modalId - ID della modal da chiudere
         */
        close(modalId) {
            const modalData = this.activeModals.get(modalId);
            if (!modalData) return;
            
            const { element, config, onClose } = modalData;
            
            // Animazione chiusura
            if (config.animation) {
                element.classList.remove('active');
                setTimeout(() => {
                    element.remove();
                    this.activeModals.delete(modalId);
                    if (onClose) onClose();
                }, 300);
            } else {
                element.remove();
                this.activeModals.delete(modalId);
                if (onClose) onClose();
            }
        },
        
        /**
         * Chiudi tutte le modali
         */
        closeAll() {
            this.activeModals.forEach((_, modalId) => {
                this.close(modalId);
            });
        },
        
        /**
         * Setup eventi modal
         */
        setupModalEvents(modalId, config) {
            const modalData = this.activeModals.get(modalId);
            if (!modalData) return;
            
            const { element } = modalData;
            
            // Click su backdrop
            if (config.closeOnBackdrop) {
                element.addEventListener('click', (e) => {
                    if (e.target === element) {
                        this.close(modalId);
                    }
                });
            }
            
            // ESC key
            if (config.closeOnEsc) {
                const escHandler = (e) => {
                    if (e.key === 'Escape') {
                        this.close(modalId);
                        document.removeEventListener('keydown', escHandler);
                    }
                };
                document.addEventListener('keydown', escHandler);
            }
        },
        
        /**
         * Helper per confirm modal
         */
        resolveConfirm(modalId, result) {
            const modalData = this.activeModals.get(modalId);
            if (modalData && modalData.resolver) {
                modalData.onClose = () => modalData.resolver(result);
                this.close(modalId);
            }
        }
    };
})();