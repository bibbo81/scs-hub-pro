// core/config/tracking-config.js
// Configurazione per il tracking service

export const TRACKING_CONFIG = {
    // ShipsGo API endpoints
    SHIPSGO: {
        V1: {
            BASE_URL: 'https://shipsgo.com/api/v1.2',
            ENDPOINTS: {
                ADD_CONTAINER: '/container/add',
                CONTAINER_INFO: '/container/info',
                TEST: '/test'
            }
        },
        V2: {
            BASE_URL: 'https://api.shipsgo.com/api/v2',
            ENDPOINTS: {
                ADD_AWB: '/airtracking/shipments',
                AWB_INFO: '/airtracking/shipments',
                TEST: '/test'
            }
        }
    },

    // Patterns per riconoscimento tipo tracking
    TRACKING_PATTERNS: {
        container: /^[A-Z]{4}\d{7}$/,
        bl: /^[A-Z]{4}\d{8,12}$/,
        awb: /^\d{3}-\d{8}$/,
        parcel: /^[A-Z0-9]{10,30}$/,
        express: /^(1Z|T\d{10}|\d{12})$/
    },

    // Patterns per riconoscimento carrier
    CARRIER_PATTERNS: {
        'MSC': /^MSC/i,
        'MAERSK': /^(MAEU|MSKU|MRKU)/i,
        'CMA-CGM': /^(CMAU|CGMU)/i,
        'COSCO': /^(COSU|CSNU)/i,
        'HAPAG-LLOYD': /^(HLCU|HLXU)/i,
        'ONE': /^(ONEY|ONEU)/i,
        'EVERGREEN': /^(EGLV|EGHU)/i,
        'YANG-MING': /^(YMLU|YMLV)/i,
        'ZIM': /^(ZIMU|ZIMV)/i,
        'CARGOLUX': /^\d{3}-\d{8}$/,
        'DHL': /^\d{10}$/,
        'FEDEX': /^\d{12}$/,
        'UPS': /^1Z/i,
        'TNT': /^T\d{10}$/i
    },

    // Mapping nomi carrier
    CARRIER_NAMES: {
        'MSC': 'Mediterranean Shipping Company',
        'MAERSK': 'Maersk Line',
        'CMA-CGM': 'CMA CGM',
        'COSCO': 'COSCO Shipping',
        'HAPAG-LLOYD': 'Hapag-Lloyd',
        'ONE': 'Ocean Network Express',
        'EVERGREEN': 'Evergreen Line',
        'YANG-MING': 'Yang Ming Marine Transport',
        'ZIM': 'ZIM Integrated Shipping',
        'CARGOLUX': 'Cargolux Airlines International',
        'DHL': 'DHL Express',
        'FEDEX': 'FedEx Corporation',
        'UPS': 'United Parcel Service',
        'TNT': 'TNT Express'
    },

    // Mapping status standard
    STATUS_MAPPING: {
        // Container/Maritime
        'Sailing': 'in_transit',
        'Arrived': 'arrived',
        'Delivered': 'delivered',
        'Discharged': 'arrived',
        'Gate In': 'in_transit',
        'Gate Out': 'delivered',
        'Loaded': 'in_transit',
        'Loading': 'in_transit',
        'Discharging': 'arrived',
        'In Transit': 'in_transit',
        'Transhipment': 'in_transit',
        'Empty': 'delivered',
        'Empty Returned': 'delivered',
        
        // Air/AWB
        'RCS': 'registered',
        'MAN': 'in_transit',
        'DEP': 'in_transit',
        'ARR': 'arrived',
        'RCF': 'arrived',
        'DLV': 'delivered',
        
        // Express
        'On FedEx vehicle for delivery': 'out_for_delivery',
        'At local FedEx facility': 'in_transit',
        'Departed FedEx hub': 'in_transit',
        'On the way': 'in_transit',
        'Arrived at FedEx hub': 'in_transit',
        'International shipment release - Import': 'customs_cleared',
        'At destination sort facility': 'in_transit',
        'Left FedEx origin facility': 'in_transit',
        'Picked up': 'in_transit',
        'Shipment information sent to FedEx': 'registered',
        
        // Italian Express (GLS, etc.)
        'Consegnata.': 'delivered',
        'Consegna prevista nel corso della giornata odierna.': 'out_for_delivery',
        'Arrivata nella Sede GLS locale.': 'in_transit',
        'In transito.': 'in_transit',
        'Partita dalla sede mittente. In transito.': 'in_transit',
        'La spedizione e\' stata creata dal mittente, attendiamo che ci venga affidata per l\'invio a destinazione.': 'registered',
        'La spedizione è stata consegnata': 'delivered',
        'LA spedizione è stata consegnata': 'delivered',
        'La spedizione è in consegna': 'out_for_delivery',
        'La spedizione è in transito': 'in_transit',
        
        // Generic
        'Registered': 'registered',
        'Pending': 'registered',
        'Booked': 'registered',
        'Booking Confirmed': 'registered',
        'Delayed': 'delayed',
        'Exception': 'exception'
    },

    // Configurazione timeout e retry
    API_CONFIG: {
        TIMEOUT: 30000, // 30 secondi
        RETRY_ATTEMPTS: 3,
        RETRY_DELAY: 1000, // 1 secondo
        BATCH_SIZE: 10, // Per operazioni batch
        RATE_LIMIT_DELAY: 100 // ms tra chiamate consecutive
    },

    // Mock data configuration
    MOCK_CONFIG: {
        ENABLED: true, // Cambia a false per disabilitare mock
        SIMULATE_DELAY: true,
        MIN_DELAY: 500,
        MAX_DELAY: 2000,
        ERROR_RATE: 0.05 // 5% di probabilità di errore simulato
    },

    // Cache configuration
    CACHE_CONFIG: {
        TTL: 5 * 60 * 1000, // 5 minuti
        MAX_SIZE: 1000, // Massimo 1000 entries
        CLEANUP_INTERVAL: 10 * 60 * 1000 // Cleanup ogni 10 minuti
    }
};

// Export default
export default TRACKING_CONFIG;