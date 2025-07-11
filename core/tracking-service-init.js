// Inizializzazione del TrackingService
class TrackingService {
    constructor() {
        this.initialized = false;
        this.apiKeys = new Map();
        this.carriers = new Map();
        this.mockMode = window.FORCE_MOCK_API || false;
    }

    async init() {
        try {
            console.log('[TrackingService] Initializing...');
            
            // Aspetta che Supabase sia pronto
            if (window.supabaseReady) {
                await window.supabaseReady;
            }
            
            await this.loadApiKeys();
            await this.loadCarriers();
            
            this.initialized = true;
            console.log('[TrackingService] ✅ Initialized successfully');
            return true;
        } catch (error) {
            console.error('[TrackingService] ❌ Initialization failed:', error);
            this.initialized = false;
            return false;
        }
    }

    async loadApiKeys() {
        try {
            // Placeholder per compatibilità
            this.apiKeys.set('shipsgo', 'test-key');
            this.apiKeys.set('dhl', null);
            this.apiKeys.set('fedex', null);
            this.apiKeys.set('ups', null);
        } catch (error) {
            console.error('[TrackingService] Failed to load API keys:', error);
        }
    }

    async loadCarriers() {
        this.carriers.set('shipsgo', { name: 'ShipsGo', active: true });
        this.carriers.set('dhl', { name: 'DHL', active: false });
        this.carriers.set('fedex', { name: 'FedEx', active: false });
        this.carriers.set('ups', { name: 'UPS', active: false });
    }

    hasApiKeys() {
        if (!this.initialized) {
            console.warn('[TrackingService] Service not initialized');
            return false;
        }
        return Array.from(this.apiKeys.values()).some(key => key !== null);
    }

    getAvailableCarriers() {
        const available = [];
        this.carriers.forEach((carrier, key) => {
            if (carrier.active || this.apiKeys.get(key)) {
                available.push({ id: key, name: carrier.name });
            }
        });
        return available;
    }
}

// Crea il servizio globalmente SOLO se non esiste
if (!window.trackingService) {
    window.trackingService = new TrackingService();
}

// Auto-inizializzazione sicura
const initService = async () => {
    try {
        if (window.trackingService && typeof window.trackingService.init === 'function') {
            const success = await window.trackingService.init();
            if (success) {
                console.log('[TrackingService] ✅ Auto-initialization complete');
            }
        }
    } catch (error) {
        console.error('[TrackingService] Auto-init failed:', error);
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initService);
} else {
    initService();
}

export default window.trackingService;