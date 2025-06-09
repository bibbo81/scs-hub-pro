// /public/core/mock-data.js - SOLO PER SVILUPPO - RIMUOVERE IN PRODUZIONE
(function() {
    'use strict';
    
    // Flag per abilitare/disabilitare mock data
    const ENABLE_MOCK_DATA = true; // Cambiare a false per disabilitare
    
    // Mock data generator
    window.MockData = {
        enabled: ENABLE_MOCK_DATA,
        
        // Generate mock trackings
        generateTrackings() {
            const now = new Date();
            
            // Recupera trackings da localStorage
            let localTrackings = [];
            try {
                const stored = localStorage.getItem('mockTrackings');
                if (stored) {
                    localTrackings = JSON.parse(stored);
                    console.log('[MockData] Loaded', localTrackings.length, 'trackings from localStorage');
                }
            } catch (error) {
                console.error('[MockData] Error loading from localStorage:', error);
            }
            
            // Mock trackings di default
            const mockTrackings = [
                {
                    id: 1,
                    tracking_number: 'MSKU1234567',
                    tracking_type: 'container',
                    carrier_code: 'MAERSK',
                    status: 'in_transit',
                    last_event_date: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
                    last_event_location: 'Shanghai, China',
                    eta: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
                    reference_number: 'PO-2024-001',
                    metadata: {
                        vessel_name: 'MAERSK SENTOSA',
                        voyage: 'W42',
                        pol: 'SHANGHAI',
                        pod: 'ROTTERDAM',
                        timeline_events: [
                            {
                                date: new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString(),
                                type: 'GATE_IN',
                                title: 'Gate In',
                                description: 'Container entered terminal',
                                location: 'Shanghai Terminal',
                                details: 'Gate A5'
                            },
                            {
                                date: new Date(now - 8 * 24 * 60 * 60 * 1000).toISOString(),
                                type: 'LOADED_ON_VESSEL',
                                title: 'Loaded on Vessel',
                                description: 'Container loaded on MAERSK SENTOSA',
                                location: 'Shanghai Port',
                                details: 'Bay 24, Row 06, Tier 82'
                            },
                            {
                                date: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(),
                                type: 'VESSEL_DEPARTED',
                                title: 'Vessel Departed',
                                description: 'Vessel departed from port',
                                location: 'Shanghai, China',
                                details: 'On schedule'
                            },
                            {
                                date: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
                                type: 'IN_TRANSIT',
                                title: 'In Transit',
                                description: 'Vessel at sea',
                                location: 'Indian Ocean',
                                details: 'ETA on track'
                            }
                        ]
                    }
                },
                {
                    id: 2,
                    tracking_number: 'MSCU7654321',
                    tracking_type: 'container',
                    carrier_code: 'MSC',
                    status: 'delivered',
                    last_event_date: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(),
                    last_event_location: 'Milan, Italy',
                    eta: null,
                    reference_number: 'PO-2024-002',
                    metadata: {
                        vessel_name: 'MSC OSCAR',
                        voyage: 'AA123W',
                        pol: 'NINGBO',
                        pod: 'GENOVA',
                        timeline_events: [
                            {
                                date: new Date(now - 20 * 24 * 60 * 60 * 1000).toISOString(),
                                type: 'GATE_IN',
                                title: 'Gate In',
                                description: 'Container entered terminal',
                                location: 'Ningbo Terminal'
                            },
                            {
                                date: new Date(now - 18 * 24 * 60 * 60 * 1000).toISOString(),
                                type: 'LOADED_ON_VESSEL',
                                title: 'Loaded on Vessel',
                                description: 'Container loaded on MSC OSCAR',
                                location: 'Ningbo Port'
                            },
                            {
                                date: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
                                type: 'DISCHARGED_FROM_VESSEL',
                                title: 'Discharged from Vessel',
                                description: 'Container unloaded',
                                location: 'Genova Port'
                            },
                            {
                                date: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(),
                                type: 'DELIVERED',
                                title: 'Delivered',
                                description: 'Container delivered to consignee',
                                location: 'Milan, Italy'
                            }
                        ]
                    }
                },
                {
                    id: 3,
                    tracking_number: '176-12345678',
                    tracking_type: 'awb',
                    carrier_code: 'CV',
                    status: 'in_transit',
                    last_event_date: new Date(now - 6 * 60 * 60 * 1000).toISOString(),
                    last_event_location: 'Luxembourg Airport',
                    eta: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString(),
                    reference_number: 'AIR-2024-003',
                    metadata: {
                        flight_number: 'CV7405',
                        origin: 'HKG',
                        destination: 'MXP',
                        timeline_events: [
                            {
                                date: new Date(now - 12 * 60 * 60 * 1000).toISOString(),
                                type: 'RCS',
                                title: 'Received from Shipper',
                                description: 'Cargo received at origin',
                                location: 'Hong Kong Airport'
                            },
                            {
                                date: new Date(now - 8 * 60 * 60 * 1000).toISOString(),
                                type: 'DEP',
                                title: 'Departed',
                                description: 'Flight CV7405 departed',
                                location: 'Hong Kong (HKG)'
                            },
                            {
                                date: new Date(now - 6 * 60 * 60 * 1000).toISOString(),
                                type: 'ARR',
                                title: 'Arrived',
                                description: 'Flight arrived for transit',
                                location: 'Luxembourg Airport'
                            }
                        ]
                    }
                },
                {
                    id: 4,
                    tracking_number: 'COSU6789012',
                    tracking_type: 'container',
                    carrier_code: 'COSCO',
                    status: 'delayed',
                    last_event_date: new Date(now - 4 * 24 * 60 * 60 * 1000).toISOString(),
                    last_event_location: 'Singapore',
                    eta: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString(),
                    reference_number: 'PO-2024-004',
                    metadata: {
                        vessel_name: 'COSCO SHIPPING ARIES',
                        original_eta: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
                        delay_reason: 'Port congestion',
                        timeline_events: [
                            {
                                date: new Date(now - 15 * 24 * 60 * 60 * 1000).toISOString(),
                                type: 'LOADED_ON_VESSEL',
                                title: 'Loaded on Vessel',
                                description: 'Container loaded',
                                location: 'Qingdao Port'
                            },
                            {
                                date: new Date(now - 4 * 24 * 60 * 60 * 1000).toISOString(),
                                type: 'TRANSHIPMENT',
                                title: 'Transhipment',
                                description: 'Container in transhipment - Delayed',
                                location: 'Singapore',
                                details: 'Port congestion causing delays'
                            }
                        ]
                    }
                },
                {
                    id: 5,
                    tracking_number: 'DHL1234567890',
                    tracking_type: 'parcel',
                    carrier_code: 'DHL',
                    status: 'out_for_delivery',
                    last_event_date: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
                    last_event_location: 'Rome Distribution Center',
                    eta: new Date().toISOString(),
                    reference_number: 'EXP-2024-005',
                    metadata: {
                        service_type: 'Express',
                        weight: '2.5 kg',
                        timeline_events: [
                            {
                                date: new Date(now - 48 * 60 * 60 * 1000).toISOString(),
                                type: 'PICKUP',
                                title: 'Picked Up',
                                description: 'Package collected',
                                location: 'Milan'
                            },
                            {
                                date: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
                                type: 'TRANSIT',
                                title: 'In Transit',
                                description: 'Package in transit',
                                location: 'Florence Hub'
                            },
                            {
                                date: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
                                type: 'OUT_FOR_DELIVERY',
                                title: 'Out for Delivery',
                                description: 'Package on delivery vehicle',
                                location: 'Rome Distribution Center',
                                details: 'Expected by end of day'
                            }
                        ]
                    }
                },
                // Additional mock trackings for variety
                {
                    id: 6,
                    tracking_number: 'HLCU1112223',
                    tracking_type: 'container',
                    carrier_code: 'HAPAG-LLOYD',
                    status: 'in_transit',
                    last_event_date: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(),
                    last_event_location: 'Port Said, Egypt',
                    eta: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                    reference_number: 'PO-2024-006'
                },
                {
                    id: 7,
                    tracking_number: 'EGLV2345678',
                    tracking_type: 'container',
                    carrier_code: 'EVERGREEN',
                    status: 'registered',
                    last_event_date: new Date(now - 1 * 60 * 60 * 1000).toISOString(),
                    last_event_location: 'Booking Confirmed',
                    eta: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString(),
                    reference_number: 'PO-2024-007'
                },
                {
                    id: 8,
                    tracking_number: '235-87654321',
                    tracking_type: 'awb',
                    carrier_code: 'FX',
                    status: 'delivered',
                    last_event_date: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
                    last_event_location: 'Paris, France',
                    eta: null,
                    reference_number: 'AIR-2024-008'
                }
            ];
            
            // IMPORTANTE: Combina trackings salvati con mock
            const allTrackings = [...localTrackings, ...mockTrackings];
            
            // Se ci sono trackings salvati, usa SOLO quelli
            const finalTrackings = localTrackings.length > 0 ? localTrackings : mockTrackings;
            
            // Calcola statistiche
            const stats = {
                total: allTrackings.length,
                in_transit: 0,
                out_for_delivery: 0,
                delivered: 0,
                delayed: 0,
                registered: 0
            };
            
            allTrackings.forEach(t => {
                const status = t.status || 'registered';
                switch(status) {
                    case 'in_transit':
                        stats.in_transit++;
                        break;
                    case 'out_for_delivery':
                        stats.out_for_delivery++;
                        break;
                    case 'delivered':
                        stats.delivered++;
                        break;
                    case 'delayed':
                        stats.delayed++;
                        break;
                    case 'registered':
                        stats.registered++;
                        break;
                    default:
                        stats.registered++;
                }
            });
            
            return {
                trackings: allTrackings,
                stats: stats
            };
        },
        
        // Generate mock products
        generateProducts() {
            return {
                products: [
                    {
                        id: 1,
                        sku: 'LAPTOP-001',
                        name: 'Dell XPS 15',
                        category: 'Electronics',
                        price: 1499.99,
                        stock: 25,
                        status: 'active'
                    },
                    {
                        id: 2,
                        sku: 'CHAIR-002',
                        name: 'Herman Miller Aeron',
                        category: 'Furniture',
                        price: 1395.00,
                        stock: 10,
                        status: 'active'
                    }
                ]
            };
        },
        
        // Generate mock dashboard data
        generateDashboardData() {
            return {
                stats: {
                    total_shipments: 156,
                    active_shipments: 45,
                    delayed_shipments: 8,
                    delivered_this_month: 89,
                    total_value: 2456789.50,
                    avg_transit_time: 5.2
                },
                recent_activities: [
                    {
                        id: 1,
                        type: 'shipment_delivered',
                        description: 'Container MSKU1234567 delivered',
                        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
                    },
                    {
                        id: 2,
                        type: 'new_tracking',
                        description: 'New tracking added: DHL1234567890',
                        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
                    }
                ]
            };
        },
        
        // Generate mock notifications
        generateNotifications() {
            return {
                notifications: [
                    {
                        id: 1,
                        type: 'shipment',
                        title: 'Spedizione in arrivo',
                        message: 'Container MSKU1234567 arriverà domani',
                        read: false,
                        created_at: new Date().toISOString()
                    },
                    {
                        id: 2,
                        type: 'warning',
                        title: 'Ritardo spedizione',
                        message: 'BL MSCU7654321 è in ritardo di 2 giorni',
                        read: false,
                        created_at: new Date(Date.now() - 86400000).toISOString()
                    }
                ],
                unread_count: 2,
                total: 2
            };
        },
        
        // Intercept API calls and return mock data
        interceptAPI(endpoint) {
            if (!this.enabled) return null;
            
            // Match endpoints
            if (endpoint.includes('get-trackings') || endpoint.includes('get-tracking')) {
                return this.generateTrackings();
            }
            if (endpoint.includes('get-products')) {
                return this.generateProducts();
            }
            if (endpoint.includes('dashboard-stats')) {
                return this.generateDashboardData();
            }
            if (endpoint.includes('notifications')) {
                return this.generateNotifications();
            }
            
            return null;
        }
    };
    
    // Override window.api if mock data is enabled
    function setupMockInterceptors() {
        if (!window.MockData.enabled) return;
        
        // Wait for api to be available
        const checkInterval = setInterval(() => {
            if (window.api) {
                clearInterval(checkInterval);
                
                const originalGet = window.api.get.bind(window.api);
                const originalPost = window.api.post.bind(window.api);
                
                // Intercept GET requests
                window.api.get = async function(endpoint, options) {
                    const mockData = window.MockData.interceptAPI(endpoint);
                    if (mockData) {
                        console.log('[MockData] Intercepted:', endpoint);
                        // Simulate network delay
                        await new Promise(resolve => setTimeout(resolve, 300));
                        return mockData;
                    }
                    // Fall back to original
                    return originalGet(endpoint, options);
                };
                
                // Intercept POST requests
                window.api.post = async function(endpoint, data, options) {
                    // For mock mode, just simulate success
                    if (window.MockData.enabled) {
                        console.log('[MockData] POST intercepted:', endpoint, data);
                        await new Promise(resolve => setTimeout(resolve, 500));
                        
                        // Se è un add-tracking o import, lascia che ImportManager gestisca il salvataggio
                        if (endpoint.includes('add-tracking') || endpoint.includes('import-tracking')) {
                            return { success: true, message: 'Mock operation completed' };
                        }
                        
                        return { success: true, message: 'Mock operation completed' };
                    }
                    return originalPost(endpoint, data, options);
                };
                
                console.log('[MockData] Mock data ENABLED - Remove mock-data.js for production!');
            }
        }, 100);
    }
    
    // Setup interceptors when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupMockInterceptors);
    } else {
        setupMockInterceptors();
    }
})();