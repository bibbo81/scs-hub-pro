// pages/tracking/api-status-indicator.js - Componente per indicatore stato API

class ApiStatusIndicator {
    constructor() {
        this.container = null;
        this.hasApiKeys = false;
        this.isConfigured = false;
        this.bannerElement = null;
        this.wasConfigured = false; // Track se era già configurato
    }

    // Inizializza l'indicatore
    async init() {
        console.log('[ApiStatusIndicator] Initializing...');
        
        // Trova il container per l'indicatore
        this.findOrCreateContainer();
        
        // Controlla lo stato iniziale
        await this.checkApiStatus();
        
        // Ascolta eventi di aggiornamento API keys
        window.addEventListener('apiKeysUpdated', () => this.checkApiStatus());
        
        // NUOVO: Ascolta evento quando le API keys vengono caricate automaticamente da Supabase
        window.addEventListener('apiKeysAutoLoaded', async (event) => {
            console.log('[ApiStatusIndicator] 🔑 API Keys auto-loaded from Supabase:', event.detail);
            await this.checkApiStatus();
            
            // Rimuovi banner se API configurate
            if (event.detail.hasV1 || event.detail.hasV2) {
                this.removeBanner();
                
                // Notifica successo solo se non era già configurato
                if (!this.wasConfigured && window.NotificationSystem) {
                    window.NotificationSystem.success('API ShipsGo caricate automaticamente', {
                        subtitle: 'Sistema pronto per tracking in tempo reale',
                        duration: 4000
                    });
                }
                this.wasConfigured = true;
            }
        });
        
        // Controlla periodicamente (ogni 30 secondi)
        setInterval(() => this.checkApiStatus(), 30000);
    }

    // Trova o crea il container per l'indicatore
    findOrCreateContainer() {
        // Cerca il container esistente nel header della pagina
        let container = document.querySelector('.api-status-container');
        
        if (!container) {
            // Crea il container nel header della card
            const cardHeader = document.querySelector('.sol-card-header');
            if (cardHeader) {
                container = document.createElement('div');
                container.className = 'api-status-container';
                container.style.cssText = `
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    margin-left: auto;
                    padding: 0.5rem 1rem;
                    border-radius: 0.5rem;
                    font-size: 0.875rem;
                    cursor: pointer;
                    transition: all 0.3s ease;
                `;
                
                // Inserisci prima dei bottoni azione
                const actions = cardHeader.querySelector('.sol-card-actions');
                if (actions) {
                    cardHeader.insertBefore(container, actions);
                } else {
                    cardHeader.appendChild(container);
                }
            }
        }
        
        this.container = container;
        
        // Aggiungi click handler
        if (this.container) {
            this.container.addEventListener('click', () => this.handleClick());
        }
    }

    // Controlla lo stato delle API
    async checkApiStatus() {
        try {
            console.log('[ApiStatusIndicator] Checking API status...');
            
            // Controlla tramite tracking service
            if (window.trackingService) {
                this.hasApiKeys = window.trackingService.hasApiKeys();
                this.isConfigured = !window.trackingService.mockMode;
                
                // Ottieni più dettagli
                const stats = window.trackingService.getStats();
                this.apiV1 = stats.apiConfig.v1;
                this.apiV2 = stats.apiConfig.v2;
                
                console.log('[ApiStatusIndicator] Status from TrackingService:', {
                    hasApiKeys: this.hasApiKeys,
                    isConfigured: this.isConfigured,
                    mockMode: window.trackingService.mockMode,
                    v1: this.apiV1,
                    v2: this.apiV2
                });
            } else {
                // Fallback: controlla userSettingsService
                if (window.userSettingsService) {
                    const keys = await window.userSettingsService.getAllApiKeys();
                    this.hasApiKeys = !!(keys.shipsgo_v1 || keys.shipsgo_v2);
                    this.apiV1 = !!keys.shipsgo_v1;
                    this.apiV2 = !!keys.shipsgo_v2;
                }
            }
            
            // NUOVO: Se API configurate, rimuovi il banner
            if (this.hasApiKeys && this.isConfigured) {
                this.removeBanner();
            }
            
            // Aggiorna UI
            this.updateUI();
            
        } catch (error) {
            console.error('[ApiStatusIndicator] Error checking status:', error);
            this.hasApiKeys = false;
            this.updateUI();
        }
    }

    // Aggiorna l'UI dell'indicatore
    updateUI() {
        console.log('[ApiStatusIndicator] Updating UI:', {
            hasApiKeys: this.hasApiKeys,
            isConfigured: this.isConfigured
        });
        
        if (!this.container) return;
        
        if (this.hasApiKeys && this.isConfigured) {
            // API configurate e funzionanti
            this.container.innerHTML = `
                <i class="fas fa-plug" style="color: #10b981;"></i>
                <span style="color: #10b981; font-weight: 500;">API Configurate</span>
                <i class="fas fa-check-circle" style="color: #10b981; font-size: 0.75rem;"></i>
            `;
            this.container.style.backgroundColor = '#10b98115';
            this.container.style.border = '1px solid #10b98140';
            this.container.title = this.getTooltipText();
            
            // Rimuovi banner se presente
            this.removeBanner();
            
        } else if (this.hasApiKeys && !this.isConfigured) {
            // API salvate ma in modalità mock
            this.container.innerHTML = `
                <i class="fas fa-plug" style="color: #f59e0b;"></i>
                <span style="color: #f59e0b; font-weight: 500;">Modalità Demo</span>
                <i class="fas fa-info-circle" style="color: #f59e0b; font-size: 0.75rem;"></i>
            `;
            this.container.style.backgroundColor = '#f59e0b15';
            this.container.style.border = '1px solid #f59e0b40';
            this.container.title = 'API salvate ma sistema in modalità demo';
            
        } else {
            // Nessuna API configurata
            this.container.innerHTML = `
                <i class="fas fa-plug" style="color: #ef4444;"></i>
                <span style="color: #ef4444; font-weight: 500;">API Non Configurate</span>
                <i class="fas fa-exclamation-circle" style="color: #ef4444; font-size: 0.75rem;"></i>
            `;
            this.container.style.backgroundColor = '#ef444415';
            this.container.style.border = '1px solid #ef444440';
            this.container.title = 'Clicca per configurare le API ShipsGo';
            
            // Mostra banner informativo
            this.showConfigBanner();
        }
        
        // Hover effect
        this.container.onmouseenter = () => {
            this.container.style.transform = 'translateY(-1px)';
            this.container.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        };
        
        this.container.onmouseleave = () => {
            this.container.style.transform = 'translateY(0)';
            this.container.style.boxShadow = 'none';
        };
    }

    // Ottieni testo tooltip dettagliato
    getTooltipText() {
        let text = 'API ShipsGo: ';
        const apis = [];
        
        if (this.apiV1) apis.push('Container/BL (v1.2) ✓');
        if (this.apiV2) apis.push('AWB/Air (v2.0) ✓');
        
        if (apis.length > 0) {
            text += apis.join(', ');
        } else {
            text += 'Nessuna configurata';
        }
        
        text += '\nClicca per gestire le configurazioni';
        return text;
    }

    // NUOVO: Rimuovi banner
    removeBanner() {
        const banner = document.querySelector('.api-config-banner');
        if (banner) {
            console.log('[ApiStatusIndicator] 🗑️ Removing config banner');
            banner.style.animation = 'slideUp 0.3s ease-out';
            setTimeout(() => banner.remove(), 300);
        }
    }

    // Mostra banner informativo se API non configurate
    showConfigBanner() {
        // Controlla se banner già presente
        if (document.querySelector('.api-config-banner')) return;
        
        // Controlla se utente ha dismesso il banner
        if (sessionStorage.getItem('apiConfigBannerDismissed')) return;
        
        // Non mostrare se API già configurate
        if (this.hasApiKeys && this.isConfigured) return;
        
        const banner = document.createElement('div');
        banner.className = 'api-config-banner sol-alert sol-alert-warning';
        banner.style.cssText = `
            margin: 1rem 0;
            display: flex;
            align-items: center;
            justify-content: space-between;
            animation: slideDown 0.3s ease-out;
        `;
        
        banner.innerHTML = `
            <div style="display: flex; align-items: center; gap: 1rem;">
                <i class="fas fa-info-circle" style="font-size: 1.5rem;"></i>
                <div>
                    <strong>Configura le API ShipsGo per il tracking in tempo reale</strong>
                    <p style="margin: 0.25rem 0 0 0; opacity: 0.9; font-size: 0.875rem;">
                        Senza API configurate, il sistema funziona in modalità demo con dati simulati.
                    </p>
                </div>
            </div>
            <div style="display: flex; gap: 0.5rem;">
                <button class="sol-btn sol-btn-sm sol-btn-primary" onclick="window.location.href='/settings.html#integrations'">
                    <i class="fas fa-cog"></i> Configura Ora
                </button>
                <button class="sol-btn sol-btn-sm sol-btn-glass" onclick="this.closest('.api-config-banner').remove(); sessionStorage.setItem('apiConfigBannerDismissed', 'true')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        // Inserisci dopo il page header
        const pageHeader = document.querySelector('.sol-page-header');
        if (pageHeader && pageHeader.nextSibling) {
            pageHeader.parentNode.insertBefore(banner, pageHeader.nextSibling);
        }
        
        // Salva riferimento al banner
        this.bannerElement = banner;
    }

    // Gestisci click sull'indicatore
    handleClick() {
        // Vai alla pagina settings, sezione integrazioni
        window.location.href = '/settings.html#integrations';
    }

    // Metodo statico per inizializzazione facile
    static async init() {
        const indicator = new ApiStatusIndicator();
        await indicator.init();
        return indicator;
    }
}

// CSS per animazioni
const style = document.createElement('style');
style.textContent = `
    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translateY(-10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    @keyframes slideUp {
        from {
            opacity: 1;
            transform: translateY(0);
        }
        to {
            opacity: 0;
            transform: translateY(-10px);
        }
    }
    
    .api-status-container {
        user-select: none;
    }
    
    .api-config-banner {
        position: relative;
    }
`;
document.head.appendChild(style);

// Esporta per uso globale
window.ApiStatusIndicator = ApiStatusIndicator;

// Auto-inizializza quando DOM è pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Inizializza solo se siamo nella pagina tracking
        if (window.location.pathname.includes('tracking')) {
            ApiStatusIndicator.init();
        }
    });
} else {
    // DOM già caricato
    if (window.location.pathname.includes('tracking')) {
        ApiStatusIndicator.init();
    }
}