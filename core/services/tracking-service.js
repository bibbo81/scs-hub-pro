// core/services/tracking-service.js
// Service layer per il tracking - facile da migrare a backend API

class TrackingService {
    constructor() {
        this.mockMode = true; // Per sviluppo
        this.apiKeys = null;
        this.initialized = false;
    }

    // Inizializza il servizio
    async initialize() {
        try {
            // Carica API keys da localStorage (in futuro da API backend)
            const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
            this.apiKeys = settings.apiKeys || {};
            this.initialized = true;
            
            console.log('[TrackingService] Initialized', this.mockMode ? '(mock mode)' : '');
            return true;
        } catch (error) {
            console.error('[TrackingService] Init error:', error);
            return false;
        }
    }

    // Metodo principale per tracking
    async track(trackingNumber, trackingType) {
        if (!this.initialized) {
            await this.initialize();
        }

        // In sviluppo usa mock data
        if (this.mockMode) {
            return this.getMockTrackingData(trackingNumber, trackingType);
        }

        // In produzione chiamerà il tuo backend API
        // return apiClient.post('/api/tracking/track', { trackingNumber, trackingType });
    }

    // Aggiorna tracking esistente
    async refresh(trackingId) {
        if (this.mockMode) {
            return this.getMockRefreshData(trackingId);
        }

        // In produzione
        // return apiClient.post(`/api/tracking/${trackingId}/refresh`);
    }

    // Mock data per sviluppo
    getMockTrackingData(trackingNumber, trackingType) {
        const mockData = {
            success: true,
            trackingNumber: trackingNumber,
            trackingType: trackingType,
            status: 'in_transit',
            carrier: {
                code: this.detectCarrier(trackingNumber),
                name: this.getCarrierName(this.detectCarrier(trackingNumber))
            },
            route: {
                origin: {
                    port: trackingType === 'awb' ? 'MXP' : 'SHANGHAI',
                    date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
                },
                destination: {
                    port: trackingType === 'awb' ? 'JFK' : 'GENOVA',
                    eta: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
                }
            },
            events: [
                {
                    date: new Date().toISOString(),
                    location: 'In Transit',
                    status: 'in_transit',
                    description: 'Shipment in transit to destination'
                },
                {
                    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                    location: trackingType === 'awb' ? 'MXP Airport' : 'Shanghai Port',
                    status: 'departed',
                    description: 'Shipment departed from origin'
                }
            ],
            mockData: true // Flag per indicare che è mock
        };

        // Aggiungi info specifiche per tipo
        if (trackingType === 'container') {
            mockData.vessel = {
                name: 'MSC OSCAR',
                voyage: 'FE420W',
                imo: '9703318'
            };
        } else if (trackingType === 'awb') {
            mockData.flight = {
                number: 'CX880',
                date: mockData.route.origin.date
            };
            mockData.package = {
                pieces: 5,
                weight: 250,
                weightUnit: 'kg'
            };
        }

        return Promise.resolve(mockData);
    }

    getMockRefreshData(trackingId) {
        // Simula progresso dello stato
        const states = ['registered', 'in_transit', 'arrived', 'customs_cleared', 'delivered'];
        const currentIndex = Math.floor(Math.random() * states.length);
        
        return Promise.resolve({
            success: true,
            status: states[currentIndex],
            lastUpdate: new Date().toISOString(),
            mockData: true
        });
    }

    // Utility methods
    detectCarrier(trackingNumber) {
        const patterns = {
            'MSC': /^MSC/i,
            'MAERSK': /^(MAEU|MSKU|MRKU)/i,
            'CMA': /^(CMAU|CGMU)/i,
            'COSCO': /^(COSU|CSNU)/i,
            'DHL': /^\d{10}$/,
            'FEDEX': /^\d{12}$/,
            'UPS': /^1Z/i
        };

        for (const [carrier, pattern] of Object.entries(patterns)) {
            if (pattern.test(trackingNumber)) {
                return carrier;
            }
        }

        return 'GENERIC';
    }

    getCarrierName(code) {
        const names = {
            'MSC': 'Mediterranean Shipping Company',
            'MAERSK': 'Maersk Line',
            'CMA': 'CMA CGM',
            'COSCO': 'COSCO Shipping',
            'DHL': 'DHL Express',
            'FEDEX': 'FedEx',
            'UPS': 'UPS',
            'GENERIC': 'Generic Carrier'
        };

        return names[code] || code;
    }

    // Configurazione
    setMockMode(enabled) {
        this.mockMode = enabled;
        console.log('[TrackingService] Mock mode:', enabled);
    }

    // Verifica se le API sono configurate
    hasApiKeys() {
        return !!(this.apiKeys?.shipsgo_v1 || this.apiKeys?.shipsgo_v2);
    }
}

// Export singleton
export default new TrackingService();