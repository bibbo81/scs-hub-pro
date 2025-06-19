// core/tracking-config.js - Configurazione centralizzata per Tracking Service
// Definisce patterns, carrier mapping, status normalization e API endpoints

export const TrackingConfig = {
    // ========================================
    // PATTERN DETECTION
    // ========================================
    
    patterns: {
        // Container patterns (ISO 6346 standard)
        container: [
            /^[A-Z]{4}\d{7}$/,           // Standard: MSKU1234567
            /^[A-Z]{4}\d{6}[A-Z]\d$/     // Alternative: MSKU123456A7
        ],
        
        // Bill of Lading patterns
        bl: [
            /^[A-Z]{4}\d{8,12}$/,        // Standard BL
            /^[A-Z]{2,4}\d{6,10}$/       // Short BL
        ],
        
        // Air Waybill patterns
        awb: [
            /^\d{3}-?\d{8}$/,            // Standard: 176-12345678 or 17612345678
            /^[A-Z]{2}\d{9}$/,           // Airline prefix: CV123456789
            /^\d{11}$/                   // 11 digit format
        ],
        
        // Express/Parcel patterns
        parcel: [
            /^1Z[A-Z0-9]{16}$/,          // UPS: 1Z12345E1234567890
            /^\d{12}$/,                  // FedEx: 123456789012
            /^\d{10}$/,                  // DHL: 1234567890
            /^[A-Z]{2}\d{9}[A-Z]{2}$/,   // TNT: AB123456789CD
            /^[0-9]{13}$/,               // GLS: 1234567890123
            /^[A-Z0-9]{10,30}$/          // Generic long codes
        ]
    },

    // ========================================
    // CARRIER DETECTION
    // ========================================
    
    carriers: {
        // Maritime carriers by container prefix
        maritime: {
            'MSC': {
                patterns: [/^MSCU/, /^MSC/i],
                name: 'Mediterranean Shipping Company',
                type: 'maritime',
                api: 'shipsgo_v1'
            },
            'MAERSK': {
                patterns: [/^MAEU/, /^MSKU/, /^MRKU/, /^MAERSK/i],
                name: 'Maersk Line',
                type: 'maritime',
                api: 'shipsgo_v1'
            },
            'CMA-CGM': {
                patterns: [/^CMAU/, /^CGMU/, /^CMA/i],
                name: 'CMA CGM',
                type: 'maritime',
                api: 'shipsgo_v1'
            },
            'COSCO': {
                patterns: [/^COSU/, /^CSNU/, /^COSCO/i],
                name: 'COSCO Shipping',
                type: 'maritime',
                api: 'shipsgo_v1'
            },
            'HAPAG-LLOYD': {
                patterns: [/^HLCU/, /^HLXU/, /^HAPAG/i],
                name: 'Hapag-Lloyd',
                type: 'maritime',
                api: 'shipsgo_v1'
            },
            'ONE': {
                patterns: [/^ONEY/, /^ONEU/, /^ONE/i],
                name: 'Ocean Network Express',
                type: 'maritime',
                api: 'shipsgo_v1'
            },
            'EVERGREEN': {
                patterns: [/^EGLV/, /^EGHU/, /^EVERGREEN/i],
                name: 'Evergreen Line',
                type: 'maritime',
                api: 'shipsgo_v1'
            },
            'YANG-MING': {
                patterns: [/^YMLU/, /^YANG/i],
                name: 'Yang Ming Marine Transport',
                type: 'maritime',
                api: 'shipsgo_v1'
            },
            'HMM': {
                patterns: [/^HMMU/, /^HMM/i],
                name: 'HMM (Hyundai Merchant Marine)',
                type: 'maritime',
                api: 'shipsgo_v1'
            },
            'ZIM': {
                patterns: [/^ZIMU/, /^ZIM/i],
                name: 'ZIM Integrated Shipping',
                type: 'maritime',
                api: 'shipsgo_v1'
            }
        },
        
        // Air carriers
        air: {
            'CARGOLUX': {
                patterns: [/^176-/, /^CV/, /^CARGOLUX/i],
                name: 'Cargolux',
                type: 'air',
                api: 'shipsgo_v2',
                iata: '176'
            },
            'LUFTHANSA': {
                patterns: [/^020-/, /^LH/, /^LUFTHANSA/i],
                name: 'Lufthansa Cargo',
                type: 'air',
                api: 'shipsgo_v2',
                iata: '020'
            },
            'EMIRATES': {
                patterns: [/^176-/, /^EK/, /^EMIRATES/i],
                name: 'Emirates SkyCargo',
                type: 'air',
                api: 'shipsgo_v2',
                iata: '176'
            },
            'CATHAY': {
                patterns: [/^160-/, /^CX/, /^CATHAY/i],
                name: 'Cathay Pacific Cargo',
                type: 'air',
                api: 'shipsgo_v2',
                iata: '160'
            },
            'AIR_FRANCE': {
                patterns: [/^057-/, /^AF/, /^AIR.FRANCE/i],
                name: 'Air France Cargo',
                type: 'air',
                api: 'shipsgo_v2',
                iata: '057'
            }
        },
        
        // Express carriers
        express: {
            'DHL': {
                patterns: [/^\d{10}$/, /^DHL/i],
                name: 'DHL Express',
                type: 'express',
                api: 'dhl_api'
            },
            'FEDEX': {
                patterns: [/^\d{12}$/, /^FEDEX/i, /^FX/i],
                name: 'FedEx',
                type: 'express',
                api: 'fedex_api'
            },
            'UPS': {
                patterns: [/^1Z/, /^UPS/i],
                name: 'UPS',
                type: 'express',
                api: 'ups_api'
            },
            'TNT': {
                patterns: [/^[A-Z]{2}\d{9}[A-Z]{2}$/, /^TNT/i],
                name: 'TNT',
                type: 'express',
                api: 'tnt_api'
            },
            'GLS': {
                patterns: [/^[0-9]{13}$/, /^GLS/i],
                name: 'GLS',
                type: 'express',
                api: 'gls_api'
            }
        }
    },

    // ========================================
    // STATUS NORMALIZATION
    // ========================================
    
    statusMapping: {
        // Unified internal statuses
        internal: [
            'registered',      // Tracking creato/registrato
            'in_transit',      // In movimento
            'arrived',         // Arrivato a destinazione
            'customs_cleared', // Sdoganato
            'out_for_delivery',// In consegna finale
            'delivered',       // Consegnato
            'delayed',         // In ritardo
            'exception'        // Problema/Eccezione
        ],
        
        // Container status mappings (ShipsGo v1.2)
        container: {
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
            'Booking Confirmed': 'registered',
            'Booked': 'registered'
        },
        
        // AWB status mappings (ShipsGo v2.0)
        awb: {
            'RCS': 'registered',           // Received from Shipper
            'MAN': 'in_transit',           // Manifested
            'DEP': 'in_transit',           // Departed
            'ARR': 'arrived',              // Arrived
            'RCF': 'arrived',              // Received from Flight
            'DLV': 'delivered',            // Delivered
            'NFD': 'exception',            // Notification of Delivery
            'AWD': 'exception'             // Awaiting Delivery
        },
        
        // Express status mappings
        express: {
            // FedEx
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
            
            // DHL
            'Shipment picked up': 'in_transit',
            'Processed at DHL facility': 'in_transit',
            'Departed Facility': 'in_transit',
            'Arrived at Delivery Facility': 'arrived',
            'With delivery courier': 'out_for_delivery',
            'Delivered': 'delivered',
            
            // UPS
            'Order Processed': 'registered',
            'Departed from facility': 'in_transit',
            'Arrived at facility': 'in_transit',
            'Out for delivery': 'out_for_delivery',
            'Delivered': 'delivered',
            
            // Italian carriers
            'Consegnata.': 'delivered',
            'Consegna prevista nel corso della giornata odierna.': 'out_for_delivery',
            'Arrivata nella Sede GLS locale.': 'in_transit',
            'In transito.': 'in_transit',
            'Partita dalla sede mittente. In transito.': 'in_transit',
            'La spedizione e\' stata creata dal mittente, attendiamo che ci venga affidata per l\'invio a destinazione.': 'registered'
        },
        
        // Generic fallback mappings
        generic: {
            'Registered': 'registered',
            'Pending': 'registered',
            'Processing': 'registered',
            'Shipped': 'in_transit',
            'Transit': 'in_transit',
            'Arrived': 'arrived',
            'Delivered': 'delivered',
            'Delayed': 'delayed',
            'Exception': 'exception',
            'Failed': 'exception',
            'Returned': 'exception'
        }
    },

    // ========================================
    // API CONFIGURATIONS
    // ========================================
    
    apis: {
        shipsgo_v1: {
            name: 'ShipsGo v1.2',
            description: 'Container tracking API',
            baseUrl: 'https://shipsgo.com/api/v1.2',
            authType: 'query_param',
            authParam: 'authCode',
            rateLimit: {
                requests: 100,
                window: 60000, // 1 minute
                delay: 100     // ms between requests
            },
            endpoints: {
                add: '/container/add',
                info: '/container/info',
                test: '/test'
            },
            supports: ['container', 'bl']
        },
        
        shipsgo_v2: {
            name: 'ShipsGo v2.0',
            description: 'Air cargo tracking API',
            baseUrl: 'https://api.shipsgo.com/api/v2',
            authType: 'header',
            authHeader: 'X-Shipsgo-User-Token',
            rateLimit: {
                requests: 100,
                window: 60000,
                delay: 100
            },
            endpoints: {
                add: '/airtracking/shipments',
                info: '/airtracking/shipments',
                test: '/test'
            },
            supports: ['awb']
        }
    },

    // ========================================
    // EVENT TYPE MAPPINGS
    // ========================================
    
    eventTypes: {
        // Container events
        container: {
            'GATE_IN': { icon: 'fa-sign-in-alt', color: 'info', description: 'Container entered terminal' },
            'LOADED_ON_VESSEL': { icon: 'fa-ship', color: 'primary', description: 'Loaded on vessel' },
            'VESSEL_DEPARTED': { icon: 'fa-anchor', color: 'warning', description: 'Vessel departed' },
            'TRANSHIPMENT': { icon: 'fa-exchange-alt', color: 'info', description: 'Transhipment' },
            'DISCHARGED_FROM_VESSEL': { icon: 'fa-download', color: 'success', description: 'Discharged from vessel' },
            'GATE_OUT': { icon: 'fa-sign-out-alt', color: 'success', description: 'Container released' }
        },
        
        // AWB events
        awb: {
            'RCS': { icon: 'fa-hand-receiving', color: 'info', description: 'Received from shipper' },
            'MAN': { icon: 'fa-clipboard-list', color: 'info', description: 'Manifested' },
            'DEP': { icon: 'fa-plane-departure', color: 'primary', description: 'Departed' },
            'ARR': { icon: 'fa-plane-arrival', color: 'success', description: 'Arrived' },
            'RCF': { icon: 'fa-download', color: 'success', description: 'Received from flight' },
            'DLV': { icon: 'fa-check-circle', color: 'success', description: 'Delivered' }
        },
        
        // Express events
        express: {
            'PICKUP': { icon: 'fa-hand-paper', color: 'info', description: 'Picked up' },
            'TRANSIT': { icon: 'fa-truck', color: 'primary', description: 'In transit' },
            'SORT': { icon: 'fa-sort', color: 'info', description: 'Sorted at facility' },
            'OUT_FOR_DELIVERY': { icon: 'fa-shipping-fast', color: 'warning', description: 'Out for delivery' },
            'DELIVERED': { icon: 'fa-check-circle', color: 'success', description: 'Delivered' },
            'EXCEPTION': { icon: 'fa-exclamation-triangle', color: 'danger', description: 'Exception occurred' }
        }
    },

    // ========================================
    // CONFIGURATION HELPERS
    // ========================================
    
    helpers: {
        // Detect tracking type by number
        detectType(trackingNumber) {
            for (const [type, patterns] of Object.entries(this.patterns)) {
                for (const pattern of patterns) {
                    if (pattern.test(trackingNumber)) {
                        return type;
                    }
                }
            }
            return 'container'; // Default fallback
        },
        
        // Detect carrier by number and type
        detectCarrier(trackingNumber) {
            const allCarriers = {
                ...this.carriers.maritime,
                ...this.carriers.air,
                ...this.carriers.express
            };
            
            for (const [code, carrier] of Object.entries(allCarriers)) {
                for (const pattern of carrier.patterns) {
                    if (pattern.test(trackingNumber)) {
                        return {
                            code,
                            name: carrier.name,
                            type: carrier.type,
                            api: carrier.api
                        };
                    }
                }
            }
            
            return {
                code: 'UNKNOWN',
                name: 'Unknown Carrier',
                type: 'unknown',
                api: null
            };
        },
        
        // Normalize status by type
        normalizeStatus(status, type = 'generic') {
            if (!status) return 'registered';
            
            const mappings = this.statusMapping[type] || this.statusMapping.generic;
            
            // Direct mapping
            if (mappings[status]) {
                return mappings[status];
            }
            
            // Case-insensitive search
            const lowerStatus = status.toLowerCase();
            for (const [key, value] of Object.entries(mappings)) {
                if (key.toLowerCase() === lowerStatus) {
                    return value;
                }
            }
            
            // Partial match for complex statuses
            for (const [key, value] of Object.entries(mappings)) {
                if (status.includes(key) || key.includes(status)) {
                    return value;
                }
            }
            
            return 'registered'; // Fallback
        },
        
        // Get API config for carrier
        getApiForCarrier(carrierCode) {
            const allCarriers = {
                ...this.carriers.maritime,
                ...this.carriers.air,
                ...this.carriers.express
            };
            
            const carrier = allCarriers[carrierCode];
            if (carrier && carrier.api) {
                return this.apis[carrier.api];
            }
            
            return null;
        },
        
        // Validate tracking number format
        validateTrackingNumber(trackingNumber) {
            if (!trackingNumber || typeof trackingNumber !== 'string') {
                return { valid: false, reason: 'Invalid format' };
            }
            
            const cleaned = trackingNumber.trim().toUpperCase();
            
            if (cleaned.length < 4) {
                return { valid: false, reason: 'Too short' };
            }
            
            if (cleaned.length > 30) {
                return { valid: false, reason: 'Too long' };
            }
            
            // Check against known patterns
            for (const patterns of Object.values(this.patterns)) {
                for (const pattern of patterns) {
                    if (pattern.test(cleaned)) {
                        return { valid: true, cleaned };
                    }
                }
            }
            
            // If no exact match, it might still be valid for generic tracking
            return { valid: true, cleaned, generic: true };
        }
    }
};

// Make helpers accessible at root level
Object.setPrototypeOf(TrackingConfig, TrackingConfig.helpers);

export default TrackingConfig;