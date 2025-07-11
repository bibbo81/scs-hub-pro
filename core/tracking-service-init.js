// Inizializzazione del TrackingService
class TrackingService {
    constructor() {
        this.initialized = false;
        this.apiKeys = new Map();
        this.carriers = new Map();
    }

    async init() {
        try {
            console.log('[TrackingService] Initializing...');
            
            // Simula caricamento API keys (sostituisci con logica reale)
            await this.loadApiKeys();
            await this.loadCarriers();
            
            this.initialized = true;
            console.log('[TrackingService] ✅ Initialized successfully');
        } catch (error) {
            console.error('[TrackingService] ❌ Initialization failed:', error);
            this.initialized = false;
        }
    }

    async loadApiKeys() {
        // Placeholder - sostituisci con caricamento reale da database
        this.apiKeys.set('dhl', null);
        this.apiKeys.set('fedex', null);
        this.apiKeys.set('ups', null);
        this.apiKeys.set('shipsgo', process.env.SHIPSGO_API_KEY || null);
    }

    async loadCarriers() {
        // Carica lista carriers disponibili
        this.carriers.set('dhl', { name: 'DHL', active: false });
        this.carriers.set('fedex', { name: 'FedEx', active: false });
        this.carriers.set('ups', { name: 'UPS', active: false });
        this.carriers.set('shipsgo', { name: 'ShipsGo', active: true });
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
            if (carrier.active) {
                available.push({ id: key, name: carrier.name });
            }
        });
        return available;
    }

    // Metodo placeholder per compatibilità
    async trackShipment(trackingNumber, carrier) {
        console.log(`[TrackingService] Tracking ${trackingNumber} via ${carrier}`);
        return { status: 'pending', message: 'Tracking service not fully implemented' };
    }
}

// Inizializza il servizio globalmente
if (!window.trackingService) {
    window.trackingService = new TrackingService();
}

// Auto-inizializzazione
const initService = async () => {
    if (!window.trackingService.initialized) {
        await window.trackingService.init();
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initService);
} else {
    initService();
}

export default window.trackingService;