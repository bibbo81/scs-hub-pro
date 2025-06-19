// ===== MODAL SYSTEM DEFINITIVO - VERSIONE COMPLETA E CORRETTA =====
(function() {
    'use strict';
    
    console.log('🔧 Loading COMPLETE Modal System - All fixes applied');
    
    // ===== FORCE CLEANUP ALL EXISTING MODAL SYSTEMS =====
    function forceCleanupExistingModals() {
        document.querySelectorAll('.sol-modal-overlay, [id^="modal-"], .modal-overlay, .modal').forEach(el => {
            el.remove();
        });
        
        if (window.ModalSystem && window.ModalSystem.confirmResolvers) {
            if (window.ModalSystem.confirmResolvers.clear) {
                window.ModalSystem.confirmResolvers.clear();
            }
        }
        
        if (window.ModalSystem && window.ModalSystem.activeModals) {
            if (window.ModalSystem.activeModals.clear) {
                window.ModalSystem.activeModals.clear();
            }
        }
        
        console.log('🧹 Forced cleanup of existing modal systems');
    }

    // ===== COMPLETE MODAL SYSTEM CLASS =====
    class CompleteModalSystem {
        constructor() {
            this.activeModals = new Map();
            this.confirmResolvers = new Map();
            this.zIndexCounter = 3000;
            this.isInitialized = false;
            this.preventDoubleClick = new Set();
            
            this.init();
        }
        
        init() {
            if (this.isInitialized) {
                console.warn('⚠️ Modal system already initialized, skipping...');
                return;
            }
            
            this.setupStyles();
            this.setupGlobalHandlers();
            this.isInitialized = true;
            
            console.log('✅ COMPLETE Modal System initialized');
        }

        setupStyles() {
            document.querySelectorAll('#unified-modal-styles, #modal-styles, #definitive-modal-styles, #fixed-modal-styles, #complete-modal-styles').forEach(el => {
                el.remove();
            });
            
            const style = document.createElement('style');
            style.id = 'complete-modal-styles';
            style.textContent = `
                .sol-modal-overlay {
                    position: fixed !important;
                    top: 0 !important; left: 0 !important; 
                    right: 0 !important; bottom: 0 !important;
                    background: rgba(0, 0, 0, 0.8) !important;
                    backdrop-filter: blur(12px) !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    z-index: 3000 !important;
                    padding: 20px !important;
                    opacity: 0 !important;
                    visibility: hidden !important;
                    transition: all 0.25s ease !important;
                }

                .sol-modal-overlay.active {
                    opacity: 1 !important;
                    visibility: visible !important;
                }

                .sol-modal-content {
                    background: white !important;
                    border-radius: 16px !important;
                    width: 100% !important;
                    max-width: 600px !important;
                    max-height: 90vh !important;
                    overflow: hidden !important;
                    box-shadow: 0 25px 80px rgba(0, 0, 0, 0.4) !important;
                    transform: scale(0.85) translateY(30px) !important;
                    transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
                    position: relative !important;
                }

                .sol-modal-overlay.active .sol-modal-content {
                    transform: scale(1) translateY(0) !important;
                }

                .sol-modal-header {
                    padding: 24px 24px 16px !important;
                    border-bottom: 1px solid #e5e5e7 !important;
                    display: flex !important;
                    justify-content: space-between !important;
                    align-items: center !important;
                    background: #f8f9fa !important;
                }

                .sol-modal-title {
                    font-size: 20px !important;
                    font-weight: 700 !important;
                    margin: 0 !important;
                    color: #1d1d1f !important;
                }

                .sol-modal-close {
                    background: rgba(255, 255, 255, 0.1) !important;
                    border: 2px solid rgba(0, 0, 0, 0.1) !important;
                    color: #6e6e73 !important;
                    font-size: 18px !important;
                    cursor: pointer !important;
                    padding: 8px !important;
                    border-radius: 8px !important;
                    transition: all 0.2s ease !important;
                    width: 40px !important;
                    height: 40px !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                }

                .sol-modal-close:hover {
                    background: #ff3b30 !important;
                    color: white !important;
                    border-color: #ff3b30 !important;
                    transform: scale(1.1) !important;
                }

                .sol-modal-body {
                    padding: 24px !important;
                    overflow-y: auto !important;
                    max-height: calc(90vh - 180px) !important;
                    line-height: 1.6 !important;
                }

                .sol-modal-footer {
                    padding: 16px 24px 24px !important;
                    border-top: 1px solid #e5e5e7 !important;
                    display: flex !important;
                    gap: 12px !important;
                    justify-content: flex-end !important;
                    background: #f8f9fa !important;
                }

                .sol-btn {
                    padding: 12px 24px !important;
                    border-radius: 10px !important;
                    font-size: 16px !important;
                    font-weight: 600 !important;
                    cursor: pointer !important;
                    transition: all 0.2s ease !important;
                    border: none !important;
                    display: inline-flex !important;
                    align-items: center !important;
                    gap: 8px !important;
                    text-decoration: none !important;
                    justify-content: center !important;
                    white-space: nowrap !important;
                    user-select: none !important;
                }

                .sol-btn-primary {
                    background: linear-gradient(135deg, #007AFF, #0056CC) !important;
                    color: white !important;
                    box-shadow: 0 4px 15px rgba(0, 122, 255, 0.3) !important;
                }

                .sol-btn-primary:hover {
                    background: linear-gradient(135deg, #0056CC, #003f99) !important;
                    transform: translateY(-2px) !important;
                    box-shadow: 0 8px 25px rgba(0, 122, 255, 0.4) !important;
                }

                .sol-btn-glass {
                    background: rgba(255, 255, 255, 0.1) !important;
                    color: #007AFF !important;
                    border: 2px solid #007AFF !important;
                    backdrop-filter: blur(10px) !important;
                }

                .sol-btn-glass:hover {
                    background: #007AFF !important;
                    color: white !important;
                    transform: translateY(-2px) !important;
                }

                .sol-btn-danger {
                    background: linear-gradient(135deg, #FF3B30, #D70015) !important;
                    color: white !important;
                    box-shadow: 0 4px 15px rgba(255, 59, 48, 0.3) !important;
                }

                .sol-btn-danger:hover {
                    background: linear-gradient(135deg, #D70015, #B50012) !important;
                    transform: translateY(-2px) !important;
                }

                /* Progress Modal Styles */
                .sol-progress-wrapper {
                    text-align: center !important;
                    padding: 20px 0 !important;
                }

                .sol-progress-message {
                    margin-bottom: 24px !important;
                    color: #6e6e73 !important;
                    font-size: 16px !important;
                    font-weight: 500 !important;
                }

                .sol-progress-bar {
                    width: 100% !important;
                    height: 12px !important;
                    background: #e5e5e7 !important;
                    border-radius: 6px !important;
                    overflow: hidden !important;
                    margin: 20px 0 !important;
                    box-shadow: inset 0 2px 4px rgba(0,0,0,0.1) !important;
                }

                .sol-progress-fill {
                    height: 100% !important;
                    background: linear-gradient(90deg, #007AFF, #34C759, #007AFF) !important;
                    background-size: 200% 100% !important;
                    transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
                    animation: progressFlow 2s ease-in-out infinite !important;
                    border-radius: 6px !important;
                }

                @keyframes progressFlow {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }

                .sol-progress-percentage {
                    font-size: 2.5rem !important;
                    font-weight: 800 !important;
                    color: #1d1d1f !important;
                    margin-top: 20px !important;
                    background: linear-gradient(135deg, #007AFF, #34C759) !important;
                    -webkit-background-clip: text !important;
                    background-clip: text !important;
                    -webkit-text-fill-color: transparent !important;
                    text-align: center !important;
                }

                /* Confirm Dialog Styles */
                .modal-confirm {
                    text-align: center !important;
                }

                .modal-confirm p {
                    margin-bottom: 24px !important;
                    font-size: 18px !important;
                    line-height: 1.5 !important;
                    color: #1d1d1f !important;
                }

                .modal-confirm .sol-modal-footer {
                    background: transparent !important;
                    border: none !important;
                    justify-content: center !important;
                    padding-top: 8px !important;
                }

                /* Responsive */
                @media (max-width: 768px) {
                    .sol-modal-overlay {
                        padding: 16px !important;
                    }
                    
                    .sol-modal-content {
                        max-width: calc(100vw - 32px) !important;
                        max-height: 95vh !important;
                    }
                    
                    .sol-modal-header, .sol-modal-body, .sol-modal-footer {
                        padding: 16px !important;
                    }
                    
                    .sol-btn {
                        font-size: 14px !important;
                        padding: 10px 20px !important;
                    }
                }

                .sol-modal-overlay * {
                    pointer-events: auto !important;
                }
                
                .sol-modal-overlay {
                    pointer-events: auto !important;
                }
            `;
            document.head.appendChild(style);
        }

        setupGlobalHandlers() {
            document.removeEventListener('keydown', this.globalKeyHandler);
            document.removeEventListener('click', this.globalClickHandler);
            
            this.globalKeyHandler = (e) => {
                if (e.key === 'Escape') {
                    this.closeTopModal();
                }
            };
            document.addEventListener('keydown', this.globalKeyHandler);

            this.globalClickHandler = (e) => {
                const target = e.target;
                const clickId = `${target.tagName}-${target.textContent?.trim().slice(0, 20)}`;
                
                if (this.preventDoubleClick.has(clickId)) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
                
                this.preventDoubleClick.add(clickId);
                setTimeout(() => this.preventDoubleClick.delete(clickId), 500);
                
                // ===== FIX: BOTTONE X FUNZIONANTE =====
                if (target.classList.contains('sol-modal-close') || target.hasAttribute('data-close-modal')) {
                    e.preventDefault();
                    e.stopPropagation();
                    const modal = target.closest('.sol-modal-overlay');
                    if (modal) {
                        this.close(modal.id);
                    }
                    return;
                }

                // Handle confirm buttons
                if (target.hasAttribute('data-confirm-result')) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    const result = target.getAttribute('data-confirm-result') === 'true';
                    const modal = target.closest('.sol-modal-overlay');
                    if (modal) {
                        this.resolveConfirm(modal.id, result);
                    }
                    return;
                }

                // Handle backdrop clicks
                if (target.classList.contains('sol-modal-overlay')) {
                    const modal = target;
                    const modalData = this.activeModals.get(modal.id);
                    if (modalData && modalData.config.closeOnBackdrop !== false) {
                        this.close(modal.id);
                    }
                }
            };
            
            document.addEventListener('click', this.globalClickHandler, true);
        }

        show(options = {}) {
            this.forceCleanupOrphanModals();
            
            if (typeof options === 'string') {
                options = { content: options };
            }

            const modalId = `modal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const config = {
                title: '',
                content: '',
                size: 'md',
                closable: true,
                hideClose: false,
                closeOnBackdrop: true,
                closeOnEsc: true,
                buttons: [],
                onClose: null,
                ...options
            };

            let maxWidth = '600px';
            switch (config.size) {
                case 'sm': maxWidth = '400px'; break;
                case 'lg': maxWidth = '800px'; break;
                case 'xl': maxWidth = '1000px'; break;
                case 'fullscreen': maxWidth = '95vw'; break;
            }

            let footer = '';
            if (config.buttons && config.buttons.length > 0) {
                footer = config.buttons.map((btn, index) => `
                    <button class="sol-btn ${btn.class || 'sol-btn-primary'}" 
                            data-modal-action="button-${index}"
                            data-modal-id="${modalId}">
                        ${btn.text}
                    </button>
                `).join('');
            }

            const modal = document.createElement('div');
            modal.className = 'sol-modal-overlay';
            modal.id = modalId;
            modal.style.zIndex = this.zIndexCounter++;
            modal.innerHTML = `
                <div class="sol-modal-content" style="max-width: ${maxWidth}">
                    ${config.title || !config.hideClose ? `
                        <div class="sol-modal-header">
                            <h2 class="sol-modal-title">${config.title || ''}</h2>
                            ${!config.hideClose ? `
                                <button class="sol-modal-close" data-close-modal="${modalId}" title="Chiudi">
                                    ×
                                </button>
                            ` : ''}
                        </div>
                    ` : ''}
                    <div class="sol-modal-body">
                        ${config.content || ''}
                    </div>
                    ${footer ? `
                        <div class="sol-modal-footer">
                            ${footer}
                        </div>
                    ` : ''}
                </div>
            `;

            document.body.appendChild(modal);

            this.activeModals.set(modalId, {
                element: modal,
                config: config
            });

            this.setupCustomButtonHandlers(modalId, config);

            requestAnimationFrame(() => {
                modal.classList.add('active');
            });

            console.log(`✅ Modal shown: ${modalId}`, { title: config.title, buttons: config.buttons?.length || 0 });

            return { id: modalId, element: modal };
        }

        confirm(options = {}) {
            return new Promise((resolve) => {
                const modalId = `confirm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                
                this.confirmResolvers.set(modalId, resolve);
                
                // ===== FIX: TESTI BOTTONI CORRETTI =====
                const config = {
                    title: 'Conferma',
                    message: 'Sei sicuro?',
                    confirmText: 'Conferma',  // ===== FIX: NON PIU' null =====
                    cancelText: 'Annulla',   // ===== FIX: NON PIU' null =====
                    confirmClass: 'sol-btn-primary',
                    type: 'confirm',
                    ...options
                };
                
                const content = `
                    <div class="modal-confirm">
                        <p>${config.message}</p>
                        <div class="sol-modal-footer">
                            <button class="sol-btn sol-btn-glass" 
                                    data-confirm-result="false" 
                                    data-modal-id="${modalId}">
                                ${config.cancelText}
                            </button>
                            <button class="sol-btn ${config.confirmClass}" 
                                    data-confirm-result="true" 
                                    data-modal-id="${modalId}">
                                ${config.confirmText}
                            </button>
                        </div>
                    </div>
                `;
                
                const modal = this.show({
                    title: config.title,
                    content: content,
                    size: 'sm',
                    hideClose: false,
                    closeOnBackdrop: false,
                    onClose: () => {
                        if (this.confirmResolvers.has(modalId)) {
                            const resolver = this.confirmResolvers.get(modalId);
                            this.confirmResolvers.delete(modalId);
                            resolver(false);
                        }
                    }
                });
                
                modal.element.id = modalId;
                this.activeModals.delete(modal.id);
                this.activeModals.set(modalId, {
                    element: modal.element,
                    config: { ...config, onClose: () => {
                        if (this.confirmResolvers.has(modalId)) {
                            const resolver = this.confirmResolvers.get(modalId);
                            this.confirmResolvers.delete(modalId);
                            resolver(false);
                        }
                    }}
                });
            });
        }

        progress(options = {}) {
            const modalId = `progress-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            
            const config = {
                title: 'Operazione in corso...',
                message: 'Attendere...',
                showPercentage: true,
                closable: false,
                ...options
            };
            
            const content = `
                <div class="sol-progress-wrapper">
                    <p class="sol-progress-message" id="${modalId}-message">
                        ${config.message}
                    </p>
                    <div class="sol-progress-bar">
                        <div class="sol-progress-fill" id="${modalId}-bar" style="width: 0%"></div>
                    </div>
                    ${config.showPercentage ? `
                        <div class="sol-progress-percentage" id="${modalId}-percentage">0%</div>
                    ` : ''}
                </div>
            `;
            
            const modal = this.show({
                title: config.title,
                content: content,
                hideClose: !config.closable,
                closeOnBackdrop: false,
                closeOnEsc: config.closable,
                size: 'md'
            });
            
            return {
                modalId: modal.id,
                
                update: (progress, message) => {
                    const bar = document.getElementById(`${modalId}-bar`);
                    const msg = document.getElementById(`${modalId}-message`);
                    const pct = document.getElementById(`${modalId}-percentage`);
                    
                    if (bar) bar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
                    if (msg && message) msg.textContent = message;
                    if (pct) pct.textContent = `${Math.round(progress)}%`;
                },
                
                close: () => {
                    this.close(modal.id);
                },
                
                setStats: (stats) => {
                    console.log('Progress stats:', stats);
                }
            };
        }

        alert(options = {}) {
            const typeIcons = {
                success: { icon: '✅', color: '#34C759' },
                error: { icon: '❌', color: '#FF3B30' },
                warning: { icon: '⚠️', color: '#FF9500' },
                info: { icon: 'ℹ️', color: '#007AFF' }
            };
            
            const type = typeIcons[options.type] || typeIcons.info;
            
            return this.confirm({
                title: options.title || 'Avviso',
                message: `
                    <div style="text-align: center; padding: 20px 0;">
                        <div style="font-size: 3rem; margin-bottom: 16px;">${type.icon}</div>
                        <p style="font-size: 18px; color: #1d1d1f; margin: 0;">${options.message || ''}</p>
                    </div>
                `,
                confirmText: options.buttonText || 'OK',
                cancelText: null
            });
        }

        close(modalId) {
            if (!modalId) {
                this.closeTopModal();
                return;
            }

            const modalData = this.activeModals.get(modalId);
            if (!modalData) {
                const modal = document.getElementById(modalId);
                if (modal) {
                    this.closeModalElement(modal);
                }
                return;
            }

            const { element, config } = modalData;
            
            if (config.onClose) {
                try {
                    config.onClose();
                } catch (error) {
                    console.error('Error in modal onClose callback:', error);
                }
            }

            this.closeModalElement(element);
            this.activeModals.delete(modalId);
            this.confirmResolvers.delete(modalId);
            
            console.log(`✅ Modal closed: ${modalId}`);
        }

        closeModalElement(element) {
            element.classList.remove('active');
            
            setTimeout(() => {
                if (element.parentNode) {
                    element.remove();
                }
            }, 250);
        }

        closeTopModal() {
            const modalIds = Array.from(this.activeModals.keys());
            if (modalIds.length > 0) {
                const topModalId = modalIds[modalIds.length - 1];
                this.close(topModalId);
            }
        }

        closeAll() {
            const modalIds = Array.from(this.activeModals.keys());
            modalIds.forEach(id => this.close(id));
            
            this.forceCleanupOrphanModals();
            this.confirmResolvers.clear();
            
            console.log('✅ All modals closed and cleaned up');
        }

        forceCleanupOrphanModals() {
            document.querySelectorAll('.sol-modal-overlay').forEach(modal => {
                if (!this.activeModals.has(modal.id)) {
                    modal.remove();
                }
            });
        }

        resolveConfirm(modalId, result) {
            console.log(`🎯 Resolving confirm: ${modalId} = ${result}`);
            
            if (this.confirmResolvers.has(modalId)) {
                const resolver = this.confirmResolvers.get(modalId);
                this.confirmResolvers.delete(modalId);
                this.close(modalId);
                resolver(result);
            } else {
                console.warn(`⚠️ No resolver found for modal: ${modalId}`);
                this.close(modalId);
            }
        }

        setupCustomButtonHandlers(modalId, config) {
            if (!config.buttons) return;
            
            config.buttons.forEach((btn, index) => {
                if (btn.onclick && typeof btn.onclick === 'function') {
                    const btnElement = document.querySelector(`[data-modal-action="button-${index}"][data-modal-id="${modalId}"]`);
                    if (btnElement) {
                        btnElement.addEventListener('click', (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            
                            try {
                                const result = btn.onclick();
                                if (result !== false) {
                                    this.close(modalId);
                                }
                            } catch (error) {
                                console.error('Error in button click handler:', error);
                                this.close(modalId);
                            }
                        });
                    }
                }
            });
        }

        // ===== COMPATIBILITY METHODS =====
        show_confirm(message, title = 'Conferma') {
            return this.confirm({ title, message });
        }

        show_alert(message, title = 'Avviso') {
            return this.alert({ title, message });
        }

        show_progress(title, message) {
            return this.progress({ title, message });
        }

        // ===== DIAGNOSTIC METHODS =====
        getActiveModals() {
            return Array.from(this.activeModals.keys());
        }

        getResolvers() {
            return Array.from(this.confirmResolvers.keys());
        }

        debugInfo() {
            return {
                activeModals: this.getActiveModals(),
                resolvers: this.getResolvers(),
                domModals: document.querySelectorAll('.sol-modal-overlay').length,
                zIndex: this.zIndexCounter
            };
        }
    }

    // ===== INITIALIZATION =====
    function initializeCompleteModalSystem() {
        console.log('🔧 Initializing COMPLETE Modal System...');
        
        forceCleanupExistingModals();
        
        delete window.ModalSystem;
        delete window.modalSystem;
        
        const completeModalSystem = new CompleteModalSystem();
        
        window.ModalSystem = completeModalSystem;
        window.modalSystem = completeModalSystem;
        
        window.debugModals = () => {
            console.log('🐛 Modal System Debug:', completeModalSystem.debugInfo());
        };
        
        window.forceCloseAllModals = () => {
            completeModalSystem.closeAll();
            console.log('🧹 Force closed all modals');
        };
        
        console.log('✅ COMPLETE Modal System ready - All fixes applied!');
        console.log('📊 Debug commands: window.debugModals(), window.forceCloseAllModals()');
        
        return completeModalSystem;
    }

    // ===== AUTO-INITIALIZATION =====
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(initializeCompleteModalSystem, 100);
        });
    } else {
        setTimeout(initializeCompleteModalSystem, 100);
    }

    // ===== EXPORT FOR ES6 MODULES =====
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = CompleteModalSystem;
    }
    
    if (typeof window !== 'undefined' && window.define && window.define.amd) {
        window.define([], () => CompleteModalSystem);
    }

    console.log('🎯 COMPLETE Modal System loaded - All issues resolved!');
    
})();

// ===== ES6 EXPORT FOR MODULES =====
let modalSystemExport = {};
if (typeof window !== 'undefined' && window.ModalSystem) {
    modalSystemExport = window.ModalSystem;
}

export default modalSystemExport;