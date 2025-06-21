// core/services/tracking-service.js - VERSIONE CON AWB ID FIX
// Service layer con gestione corretta degli ID numerici ShipsGo per AWB

class TrackingService {
    constructor() {
        this.mockMode = true; // Per sviluppo
        this.apiConfig = {
            v1: null,  // ShipsGo v1.2 config
            v2: null   // ShipsGo v2.0 config
        };
        this.initialized = false;
        this.cache = new Map(); // Cache per evitare chiamate duplicate
        this.rateLimiter = new Map(); // Rate limiting per API
        this.requestQueue = []; // Coda richieste
        this.processing = false;
        this.awbIdCache = new Map(); // Cache AWB -> ID mapping
    }

    // ========================================
    // INIZIALIZZAZIONE E CONFIGURAZIONE
    // ========================================

    async initialize() {
        if (this.initialized) return true;
        
        try {
            console.log('[TrackingService] Initializing optimized service...');
            
            // Carica configurazione API
            await this.loadApiConfiguration();
            
            // Setup rate limiter
            this.setupRateLimiter();
            
            // Avvia processore coda
            this.startQueueProcessor();
            
            // Carica cache AWB IDs da localStorage
            this.loadAWBIdCache();
            
            this.initialized = true;
            console.log('[TrackingService] ✅ Optimized service initialized', {
                mockMode: this.mockMode,
                apis: {
                    v1: !!this.apiConfig.v1,
                    v2: !!this.apiConfig.v2
                },
                awbCacheSize: this.awbIdCache.size
            });
            
            return true;
        } catch (error) {
            console.error('[TrackingService] ❌ Init error:', error);
            return false;
        }
    }

    loadAWBIdCache() {
        try {
            const cached = localStorage.getItem('awbIdCache');
            if (cached) {
                const data = JSON.parse(cached);
                Object.entries(data).forEach(([awb, id]) => {
                    this.awbIdCache.set(awb, id);
                });
                console.log('[TrackingService] 📋 Loaded AWB ID cache:', this.awbIdCache.size, 'entries');
            }
        } catch (error) {
            console.error('[TrackingService] Error loading AWB cache:', error);
        }
    }

    saveAWBIdCache() {
        try {
            const cacheObj = {};
            this.awbIdCache.forEach((id, awb) => {
                cacheObj[awb] = id;
            });
            localStorage.setItem('awbIdCache', JSON.stringify(cacheObj));
        } catch (error) {
            console.error('[TrackingService] Error saving AWB cache:', error);
        }
    }

    async loadApiConfiguration() {
        try {
            // Carica da localStorage (settings.html)
            const settings = JSON.parse(localStorage.getItem('trackingServiceConfig') || '{}');
            
            if (settings.shipsgo_v1_key) {
                this.apiConfig.v1 = {
                    baseUrl: 'https://shipsgo.com/api/v1.2',
                    authCode: settings.shipsgo_v1_key,
                    enabled: settings.shipsgo_v1_enabled !== false
                };
                console.log('[TrackingService] ShipsGo v1.2 configured');
            }
            
            if (settings.shipsgo_v2_token) {
                this.apiConfig.v2 = {
                    baseUrl: 'https://api.shipsgo.com/api/v2',
                    userToken: settings.shipsgo_v2_token,
                    enabled: settings.shipsgo_v2_enabled !== false
                };
                console.log('[TrackingService] ShipsGo v2.0 configured');
            }
            
            // Modalità mock se nessuna API configurata
            this.mockMode = !this.hasApiKeys() || settings.force_mock_mode === true;
            
        } catch (error) {
            console.error('[TrackingService] Error loading API config:', error);
            this.mockMode = true;
        }
    }

    setupRateLimiter() {
        // ShipsGo rate limits: 100 requests/minute
        this.rateLimits = {
            shipsgo_v1: { max: 100, window: 60000, current: 0, resetTime: Date.now() + 60000 },
            shipsgo_v2: { max: 100, window: 60000, current: 0, resetTime: Date.now() + 60000 }
        };
    }

    startQueueProcessor() {
        if (this.processing) return;
        
        this.processing = true;
        this.processQueue();
    }

    async processQueue() {
        while (this.requestQueue.length > 0) {
            const request = this.requestQueue.shift();
            
            try {
                const result = await this.executeRequest(request);
                request.resolve(result);
            } catch (error) {
                request.reject(error);
            }
            
            // Rate limiting delay
            await this.delay(100);
        }
        
        // Continua a processare ogni 5 secondi
        setTimeout(() => this.processQueue(), 5000);
    }

    // ========================================
    // API TRACKING PRINCIPALE
    // ========================================

    async track(trackingNumber, trackingType = 'auto', options = {}) {
        if (!this.initialized) {
            await this.initialize();
        }

        const cacheKey = `${trackingNumber}-${trackingType}`;
        
        // Check cache se non forza refresh
        if (!options.forceRefresh && this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < 300000) { // 5 minuti
                console.log('[TrackingService] 📋 Cache hit:', trackingNumber);
                return { ...cached.data, fromCache: true };
            }
        }

        console.log('[TrackingService] 🔍 Tracking:', trackingNumber, trackingType);

        // Auto-detect tipo se necessario
        if (trackingType === 'auto') {
            trackingType = this.detectTrackingType(trackingNumber);
            console.log('[TrackingService] 🎯 Auto-detected type:', trackingType);
        }

        // Modalità mock in sviluppo
        if (this.mockMode) {
            const result = await this.getMockTrackingData(trackingNumber, trackingType);
            this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
            return result;
        }

        try {
            let result;
            
            // Route alla API appropriata
            switch(trackingType) {
                case 'container':
                case 'bl':
                    result = await this.trackContainer(trackingNumber, options);
                    break;
                case 'awb':
                    result = await this.trackAirShipment(trackingNumber, options);
                    break;
                default:
                    // Prova container prima, poi air
                    try {
                        result = await this.trackContainer(trackingNumber, options);
                    } catch (error) {
                        console.log('[TrackingService] Container failed, trying air...');
                        result = await this.trackAirShipment(trackingNumber, options);
                    }
            }
            
            // Cache risultato
            this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
            
            return result;
            
        } catch (error) {
            console.error('[TrackingService] ❌ API Error:', error);
            
            // Fallback a mock data
            console.log('[TrackingService] 🔄 Falling back to mock data');
            const fallbackResult = await this.getMockTrackingData(trackingNumber, trackingType);
            fallbackResult.apiError = error.message;
            fallbackResult.fallbackMode = true;
            
            return fallbackResult;
        }
    }

    // ========================================
    // TRACKING CONTAINER (ShipsGo v1.2) - ENDPOINT CORRETTI
    // ========================================

    async trackContainer(trackingNumber, options = {}) {
        if (!this.apiConfig.v1 || !this.apiConfig.v1.enabled) {
            throw new Error('ShipsGo v1.2 API not configured or disabled');
        }

        console.log('[TrackingService] 🚢 Tracking container via ShipsGo v1.2:', trackingNumber);

        // Check rate limit
        if (!this.checkRateLimit('shipsgo_v1')) {
            throw new Error('Rate limit exceeded for ShipsGo v1.2');
        }

        try {
            let requestId = trackingNumber;
            
            // Step 1: Aggiungi container (se non esiste) e ottieni requestId
            if (!options.skipAdd) {
                const addResult = await this.addContainerToShipsGo(trackingNumber);
                
                // Se abbiamo ottenuto un requestId, usalo per il GET
                if (addResult.requestId) {
                    requestId = addResult.requestId;
                    console.log('[TrackingService] 📌 Using requestId for GET:', requestId);
                }
            }
            
            // Step 2: Recupera informazioni usando il requestId
            const containerInfo = await this.getContainerInfo(requestId, options);
            
            // Step 3: Normalizza risposta
            const result = this.normalizeContainerResponse(containerInfo, trackingNumber);
            
            console.log('[TrackingService] ✅ Container tracking completed:', result.status);
            return result;
            
        } catch (error) {
            console.error('[TrackingService] ❌ Container tracking error:', error);
            throw error;
        }
    }

    async addContainerToShipsGo(containerNumber) {
        const proxyUrl = '/netlify/functions/shipsgo-proxy';
        
        console.log('[TrackingService] ➕ Adding container to ShipsGo:', containerNumber);
        
        const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                version: 'v1.2',
                endpoint: '/ContainerService/PostContainerInfo',
                method: 'POST',
                contentType: 'application/x-www-form-urlencoded',  // ✅ AGGIUNTO per URL-encoded
                data: {
                    authCode: this.apiConfig.v1?.authCode || '2dc0c6d92ccb59e7d903825c4ebeb521',
                    containerNumber: containerNumber.toUpperCase(),
                    shippingLine: 'OTHERS'  // Potrebbe essere migliorato con auto-detect
                }
            })
        });

        const proxyResponse = await response.json();
        
        console.log('[TrackingService] 📥 Add container response:', proxyResponse);
        
        if (!proxyResponse.success) {
            const data = proxyResponse.data;
            // Handle "already exists" case
            if (data?.message?.includes('already exists')) {
                console.log('[TrackingService] 📦 Container already exists in ShipsGo');
                
                // Try to extract requestId from error message
                const requestIdMatch = data.message.match(/requestId[:\s]+(\w+)/i);
                if (requestIdMatch) {
                    console.log('[TrackingService] 🎯 Extracted requestId:', requestIdMatch[1]);
                    return { 
                        success: true, 
                        exists: true, 
                        requestId: requestIdMatch[1] 
                    };
                }
                
                return { success: true, exists: true };
            }
            
            throw new Error(data?.message || proxyResponse.error || 'Failed to add container to ShipsGo');
        }

        console.log('[TrackingService] ✅ Container added successfully');
        
        // Extract requestId from successful response
        const requestId = proxyResponse.data?.requestId || proxyResponse.data?.RequestId;
        if (requestId) {
            console.log('[TrackingService] 🎯 Got requestId:', requestId);
        }
        
        return {
            success: true,
            requestId: requestId,
            ...proxyResponse.data
        };
    }

    async getContainerInfo(containerNumber, options = {}) {
        const proxyUrl = '/netlify/functions/shipsgo-proxy';
        
        // ✅ FIX: Usa requestId invece di containerNumber
        const params = {
            requestId: containerNumber.toUpperCase()
        };
        
        // ✅ FIX: Usa mappoint (lowercase) invece di mapPoint
        params.mappoint = options.mapPoint !== undefined ? options.mapPoint : 'true';
        
        // Se viene passato un requestId specifico, usalo
        if (options.requestId && options.requestId.trim()) {
            params.requestId = options.requestId.trim();
        }
        
        console.log('[TrackingService] 📦 GetContainerInfo FIXED params:', params);
        
        const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                version: 'v1.2',
                endpoint: '/ContainerService/GetContainerInfo',
                method: 'GET',
                params: params
            })
        });

        const proxyResponse = await response.json();
        
        if (!proxyResponse.success) {
            throw new Error(proxyResponse.data?.message || proxyResponse.error || 'Failed to get container info');
        }

        // ✅ FIX: Gestisci la risposta come array
        let containerData = proxyResponse.data;
        
        // Se la risposta è un array, prendi il primo elemento
        if (Array.isArray(containerData) && containerData.length > 0) {
            containerData = containerData[0];
            console.log('[TrackingService] 📋 Extracted first container from array response');
        }
        
        return containerData;
    }

    // ========================================
    // TRACKING AWB (ShipsGo v2.0) - FIX CON GESTIONE ID
    // ========================================

    async trackAirShipment(awbNumber, options = {}) {
        if (!this.apiConfig.v2 || !this.apiConfig.v2.enabled) {
            throw new Error('ShipsGo v2.0 API not configured or disabled');
        }

        console.log('[TrackingService] ✈️ Tracking AWB via ShipsGo v2.0:', awbNumber);

        // Check rate limit
        if (!this.checkRateLimit('shipsgo_v2')) {
            throw new Error('Rate limit exceeded for ShipsGo v2.0');
        }

        try {
            // Step 0: Check se abbiamo già l'ID in cache
            let shipsgoId = this.awbIdCache.get(awbNumber.toUpperCase());
            
            if (!shipsgoId) {
                console.log('[TrackingService] 🔍 ID not in cache, fetching AWB list...');
                
                // Step 1: Recupera lista AWB per trovare l'ID
                const awbList = await this.getAirShipmentsList();
                
                // Cerca l'AWB nella lista
                const foundAwb = awbList.find(awb => 
                    awb.awb_number === awbNumber.toUpperCase() ||
                    awb.awbNumber === awbNumber.toUpperCase()
                );
                
                if (foundAwb) {
                    shipsgoId = foundAwb.id;
                    console.log('[TrackingService] ✅ Found AWB in list with ID:', shipsgoId);
                    
                    // Salva in cache
                    this.awbIdCache.set(awbNumber.toUpperCase(), shipsgoId);
                    this.saveAWBIdCache();
                } else {
                    console.log('[TrackingService] ⚠️ AWB not found in list, trying to add it...');
                    
                    // Step 2: Se non trovato, prova ad aggiungerlo
                    if (!options.skipAdd) {
                        const addResult = await this.addAWBToShipsGo(awbNumber);
                        
                        // Dopo l'aggiunta, ricarica la lista
                        await this.delay(1000); // Piccolo delay per permettere al sistema di aggiornare
                        const updatedList = await this.getAirShipmentsList();
                        
                        const newAwb = updatedList.find(awb => 
                            awb.awb_number === awbNumber.toUpperCase() ||
                            awb.awbNumber === awbNumber.toUpperCase()
                        );
                        
                        if (newAwb) {
                            shipsgoId = newAwb.id;
                            console.log('[TrackingService] ✅ Found newly added AWB with ID:', shipsgoId);
                            
                            // Salva in cache
                            this.awbIdCache.set(awbNumber.toUpperCase(), shipsgoId);
                            this.saveAWBIdCache();
                        }
                    }
                }
            } else {
                console.log('[TrackingService] 📋 Using cached ID:', shipsgoId);
            }
            
            if (!shipsgoId) {
                throw new Error('Unable to find or create AWB in ShipsGo system');
            }
            
            // Step 3: Recupera informazioni usando l'ID numerico
            const awbInfo = await this.getAWBInfoById(shipsgoId);
            
            // Step 4: Normalizza risposta
            const result = this.normalizeAWBResponse(awbInfo, awbNumber);
            
            // Aggiungi l'ID ai metadata
            result.metadata.shipsgo_id = shipsgoId;
            
            console.log('[TrackingService] ✅ AWB tracking completed:', result.status);
            return result;
            
        } catch (error) {
            console.error('[TrackingService] ❌ AWB tracking error:', error);
            throw error;
        }
    }

    async getAirShipmentsList() {
        const proxyUrl = '/netlify/functions/shipsgo-proxy';
        
        console.log('[TrackingService] 📋 Fetching AWB list from ShipsGo...');
        
        const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                version: 'v2',
                endpoint: '/air/shipments',
                method: 'GET'
            })
        });

        const proxyResponse = await response.json();
        
        if (!proxyResponse.success) {
            console.error('[TrackingService] ❌ Failed to get AWB list:', proxyResponse);
            return [];
        }

        // FIX: La risposta ha la struttura { message: 'SUCCESS', shipments: [...], meta: {...} }
        const shipments = proxyResponse.data?.shipments || 
                         (Array.isArray(proxyResponse.data) ? proxyResponse.data : []);
        console.log('[TrackingService] 📦 Retrieved', shipments.length, 'AWB shipments');
        
        return shipments;
    }

    async addAWBToShipsGo(awbNumber) {
        const proxyUrl = '/netlify/functions/shipsgo-proxy';
        
        console.log('[TrackingService] ➕ Adding AWB to ShipsGo:', awbNumber);
        
        const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                version: 'v2',
                endpoint: '/air/shipments',
                method: 'POST',
                data: {
                    awbNumber: awbNumber.toUpperCase(),
                    airline: 'CV' // Default to Cargolux, potrebbe essere migliorato
                }
            })
        });

        const proxyResponse = await response.json();
        
        if (!proxyResponse.success) {
            const data = proxyResponse.data;
            if (data?.message?.includes('already exists')) {
                console.log('[TrackingService] ✈️ AWB already exists in ShipsGo');
                return { success: true, exists: true };
            }
            throw new Error(data?.message || proxyResponse.error || 'Failed to add AWB to ShipsGo');
        }

        console.log('[TrackingService] ✅ AWB added to ShipsGo');
        return proxyResponse.data;
    }

    async getAWBInfoById(shipsgoId) {
        const proxyUrl = '/netlify/functions/shipsgo-proxy';
        
        console.log('[TrackingService] 🆔 Getting AWB info by ID:', shipsgoId);
        
        const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                version: 'v2',
                endpoint: `/air/shipments/${shipsgoId}`, // Usa l'ID numerico!
                method: 'GET'
            })
        });

        const proxyResponse = await response.json();
        
        if (!proxyResponse.success) {
            throw new Error(proxyResponse.data?.message || proxyResponse.error || 'Failed to get AWB info');
        }

        console.log('[TrackingService] ✅ Got AWB details for ID:', shipsgoId);
        return proxyResponse.data;
    }

    // Metodo legacy per compatibilità
    async getAWBInfo(awbNumber) {
        console.warn('[TrackingService] ⚠️ getAWBInfo is deprecated, use trackAirShipment instead');
        const result = await this.trackAirShipment(awbNumber);
        return result.metadata.raw;
    }

    normalizeAWBResponse(data, awbNumber) {
        const awbData = data.data || data;
        
        // Usa il mapper per convertire i nomi dei campi
        const mappedData = this.mapApiResponseToColumnNames(awbData);
        
        return {
            success: true,
            trackingNumber: awbNumber,
            trackingType: 'awb',
            status: this.normalizeStatus(mappedData.current_status || awbData.status || 'registered'),
            lastUpdate: new Date().toISOString(),
            
            carrier: {
                code: this.normalizeCarrierCode(mappedData.carrier_code || awbData.airline?.iata || 'UNKNOWN'),
                name: mappedData.carrier_name || awbData.airline?.name || awbData.airline?.iata || 'Unknown Carrier'
            },
            
            route: {
                origin: {
                    port: mappedData.origin_port || awbData.route?.origin?.location?.iata || '-',
                    name: awbData.route?.origin?.location?.name || mappedData.origin_name || '-',
                    country: mappedData.origin_country || awbData.route?.origin?.location?.country?.name || '-',
                    date: mappedData.departure_date || this.parseShipsGoDate(awbData.route?.origin?.date_of_dep)
                },
                destination: {
                    port: mappedData.destination_port || awbData.route?.destination?.location?.iata || '-',
                    name: awbData.route?.destination?.location?.name || mappedData.destination_name || '-',
                    country: mappedData.destination_country || awbData.route?.destination?.location?.country?.name || '-',
                    eta: mappedData.arrival_date || this.parseShipsGoDate(awbData.route?.destination?.date_of_rcf)
                }
            },
            
            flight: awbData.flightNumber ? {
                number: awbData.flightNumber,
                date: awbData.departureDate
            } : null,
            
            package: {
                pieces: awbData.cargo?.pieces || awbData.pieces || mappedData.pieces,
                weight: awbData.cargo?.weight || awbData.weight || mappedData.weight,
                weightUnit: awbData.weightUnit || 'kg'
            },
            
            // Includi tutti i campi mappati per uso futuro
            mappedFields: mappedData,
            
            events: this.extractAWBEvents(awbData),
            
            metadata: {
                source: 'shipsgo_v2',
                enriched_at: new Date().toISOString(),
                raw: awbData,
                mapped: mappedData,
                transitTime: awbData.route?.transit_time || awbData.transitTime,
                reference: awbData.reference,
                awb_number: awbData.awb_number || awbNumber,
                shipsgo_id: awbData.id // Importante: salva l'ID!
            }
        };
    }

    // ========================================
    // API TO COLUMN MAPPING
    // ========================================

    /**
     * Mappa i campi della risposta API ShipsGo ai nomi delle colonne usate nel sistema
     * Questo garantisce compatibilità con il column mapping esistente per import/export
     */
    mapApiResponseToColumnNames(apiData) {
        // Import del mapping unificato (in un file reale dovresti importarlo)
        // Per ora lo definiamo inline
        const UNIFIED_MAPPING = {
            // Container/Tracking info
            'Container': 'tracking_number',
            'ContainerNumber': 'tracking_number',
            
            // Carrier info
            'Carrier': 'carrier_code',
            'ShippingLine': 'carrier_code',
            'CarrierName': 'carrier_name',
            
            // Status
            'Status': 'current_status',
            'CurrentStatus': 'current_status',
            
            // Ports
            'Port Of Loading': 'origin_port',
            'Pol': 'origin_port',
            'Port Of Discharge': 'destination_port',
            'Pod': 'destination_port',
            
            // Countries
            'POL Country': 'origin_country',
            'FromCountry': 'origin_country',
            'POL Country Code': 'origin_country_code',
            'FromCountryCode': 'origin_country_code',
            'POD Country': 'destination_country',
            'ToCountry': 'destination_country',
            'POD Country Code': 'destination_country_code',
            'ToCountryCode': 'destination_country_code',
            
            // Dates
            'Date Of Loading': 'date_of_loading',
            'LoadingDate': 'date_of_loading',
            'Date Of Departure': 'date_of_departure',
            'DepartureDate': 'date_of_departure',
            'Date Of Arrival': 'date_of_arrival',
            'ArrivalDate': 'date_of_arrival',
            'Date Of Discharge': 'date_of_arrival',
            'DischargeDate': 'date_of_arrival',
            'ETA': 'eta',
            'FirstETA': 'eta',
            
            // Vessel info
            'Vessel': 'vessel_name',
            'VesselName': 'vessel_name',
            'Voyage': 'voyage',
            'VesselVoyage': 'voyage',
            'VesselIMO': 'vessel_imo',
            
            // Container details
            'Container Type': 'container_type',
            'ContainerType': 'container_type',
            'Container Size': 'container_size',
            'ContainerTEU': 'container_size',
            
            // References
            'Reference': 'reference_number',
            'ReferenceNo': 'reference_number',
            'Booking': 'booking',
            'BLReferenceNo': 'booking',
            
            // Counts and metrics
            'Container Count': 'container_count',
            'BLContainerCount': 'container_count',
            'CO₂ Emission (Tons)': 'co2_emission',
            'Co2Emission': 'co2_emission',
            'Transit Time': 'transit_time',
            'FormatedTransitTime': 'transit_time',
            'TransitTime': 'transit_time',
            
            // Other
            'Tags': 'tags',
            'Created At': 'created_at',
            'Live Map URL': 'live_map_url',
            'LiveMapUrl': 'live_map_url',
            
            // Special mappings for API response structure
            'TSPorts': 'transshipment_ports',
            'BLContainers': 'bl_containers'
        };
        
        const COUNTRY_CODE_MAP = {
            'CHINA': 'CN',
            'UNITED STATES': 'US',
            'UNITED STATES (USA)': 'US',
            'USA': 'US',
            'ITALY': 'IT',
            'SOUTH AFRICA': 'ZA',
            'GERMANY': 'DE',
            'FRANCE': 'FR',
            'SPAIN': 'ES',
            'UNITED KINGDOM': 'GB',
            'UK': 'GB',
            'NETHERLANDS': 'NL',
            'BELGIUM': 'BE',
            'SINGAPORE': 'SG',
            'HONG KONG': 'HK',
            'JAPAN': 'JP',
            'SOUTH KOREA': 'KR',
            'INDIA': 'IN',
            'BRAZIL': 'BR',
            'MEXICO': 'MX',
            'CANADA': 'CA',
            'AUSTRALIA': 'AU',
            'PANAMA': 'PA',
            'BAHAMAS': 'BS'
        };
        
        // Crea oggetto con nomi mappati
        const mappedData = {};
        
        // Mappa tutti i campi usando il mapping unificato
        for (const [apiField, value] of Object.entries(apiData)) {
            if (value !== undefined && value !== null) {
                // Cerca nel mapping unificato
                const systemColumn = UNIFIED_MAPPING[apiField];
                if (systemColumn) {
                    mappedData[systemColumn] = value;
                }
            }
        }
        
        // Gestisci campi speciali che richiedono elaborazione
        
        // Date con formato oggetto ShipsGo
        if (apiData.LoadingDate?.Date) {
            mappedData.date_of_loading = apiData.LoadingDate.Date;
            mappedData.is_actual_loading = apiData.LoadingDate.IsActual || false;
        }
        
        if (apiData.DepartureDate?.Date) {
            mappedData.date_of_departure = apiData.DepartureDate.Date;
            mappedData.is_actual_departure = apiData.DepartureDate.IsActual || false;
        }
        
        if (apiData.ArrivalDate?.Date) {
            mappedData.date_of_arrival = apiData.ArrivalDate.Date;
            mappedData.is_actual_arrival = apiData.ArrivalDate.IsActual || false;
        }
        
        if (apiData.DischargeDate?.Date) {
            // Discharge date va anche in arrival
            mappedData.date_of_arrival = apiData.DischargeDate.Date;
            mappedData.is_actual_arrival = apiData.DischargeDate.IsActual || false;
        }
        
        // ETA handling
        if (apiData.ETA) {
            mappedData.eta = apiData.ETA;
        } else if (apiData.FirstETA) {
            mappedData.eta = apiData.FirstETA;
        }
        
        // Container size formatting
        if (mappedData.container_size && !mappedData.container_size.includes("'")) {
            mappedData.container_size = mappedData.container_size + "'";
        }
        
        // CO2 emission formatting
        if (mappedData.co2_emission && !mappedData.co2_emission.toString().includes('tons')) {
            mappedData.co2_emission = mappedData.co2_emission + ' tons';
        }
        
        // Transit time formatting
        if (apiData.FormatedTransitTime) {
            mappedData.transit_time = apiData.FormatedTransitTime;
        } else if (apiData.TransitTime) {
            mappedData.transit_time = apiData.TransitTime + ' days';
        }
        
        // TS Count (transshipment count)
        if (apiData.TSPorts && Array.isArray(apiData.TSPorts)) {
            mappedData.ts_count = apiData.TSPorts.length;
            mappedData.transshipment_ports = apiData.TSPorts.map(port => ({
                port_name: port.Port,
                arrival_date: port.ArrivalDate?.Date,
                departure_date: port.DepartureDate?.Date,
                vessel_name: port.Vessel,
                vessel_imo: port.VesselIMO,
                voyage: port.VesselVoyage
            }));
        } else {
            mappedData.ts_count = 0;
        }
        
        // Aggiungi country codes se mancanti
        if (mappedData.origin_country && !mappedData.origin_country_code) {
            const upperCountry = mappedData.origin_country.toUpperCase().trim();
            mappedData.origin_country_code = COUNTRY_CODE_MAP[upperCountry] || '-';
        }
        
        if (mappedData.destination_country && !mappedData.destination_country_code) {
            const upperCountry = mappedData.destination_country.toUpperCase().trim();
            mappedData.destination_country_code = COUNTRY_CODE_MAP[upperCountry] || '-';
        }
        
        // Mantieni anche i dati originali per reference
        mappedData._raw_api_response = apiData;
        
        return mappedData;
    }

    // ========================================
    // NORMALIZZAZIONE RISPOSTE (METODI STANDALONE)
    // ========================================

    normalizeContainerResponse(data, trackingNumber) {
        const containerData = data.data || data;
        
        // Usa il mapper per convertire i nomi dei campi
        const mappedData = this.mapApiResponseToColumnNames(containerData);
        
        return {
            success: true,
            trackingNumber: trackingNumber,
            trackingType: 'container',
            // Usa i dati mappati invece di accedere direttamente
            status: this.normalizeStatus(mappedData.current_status || containerData.Status || 'registered'),
            lastUpdate: new Date().toISOString(),
            
            carrier: {
                code: this.normalizeCarrierCode(mappedData.carrier_code || 'UNKNOWN'),
                name: mappedData.carrier_name || mappedData.carrier_code || 'Unknown Carrier'
            },
            
            route: {
                origin: {
                    port: mappedData.origin_port || '-',
                    country: mappedData.origin_country || '-',
                    date: mappedData.departure_date || mappedData.loading_date
                },
                destination: {
                    port: mappedData.destination_port || '-',
                    country: mappedData.destination_country || '-',
                    eta: mappedData.eta || mappedData.arrival_date
                }
            },
            
            vessel: mappedData.vessel_name ? {
                name: mappedData.vessel_name,
                imo: mappedData.vessel_imo,
                voyage: mappedData.voyage
            } : null,
            
            // Includi tutti i campi mappati per uso futuro
            mappedFields: mappedData,
            
            events: this.extractContainerEvents(containerData),
            
            metadata: {
                source: 'shipsgo_v1',
                enriched_at: new Date().toISOString(),
                raw: containerData,
                mapped: mappedData,
                booking: mappedData.reference_number || mappedData.bl_reference,
                containerSize: mappedData.container_size,
                containerType: mappedData.container_type,
                co2Emission: mappedData.co2_emission,
                transitTime: mappedData.transit_time,
                liveMapUrl: mappedData.live_map_url
            }
        };
    }

    // ========================================
    // ESTRAZIONE EVENTI
    // ========================================

    extractContainerEvents(data) {
        const events = [];
        
        // Eventi dettagliati se disponibili
        if (data.events && Array.isArray(data.events)) {
            return data.events.map(event => ({
                date: this.parseShipsGoDate(event.date || event.eventDate),
                type: event.type || event.eventType,
                status: this.normalizeStatus(event.status),
                location: event.location || event.place,
                description: event.description || event.event,
                details: event.details,
                vessel: event.vesselName
            })).sort((a, b) => new Date(b.date) - new Date(a.date));
        }
        
        // Eventi base se non disponibili quelli dettagliati
        if (data.LoadingDate || data.loadingDate) {
            events.push({
                date: this.parseShipsGoDate(data.LoadingDate || data.loadingDate),
                type: 'LOADED_ON_VESSEL',
                status: 'in_transit',
                location: data.Pol || data.pol || data.portOfLoading,
                description: 'Container loaded on vessel',
                vessel: data.Vessel || data.vesselName
            });
        }
        
        if (data.DischargeDate || data.dischargeDate) {
            events.push({
                date: this.parseShipsGoDate(data.DischargeDate || data.dischargeDate),
                type: 'DISCHARGED_FROM_VESSEL',
                status: 'arrived',
                location: data.Pod || data.pod || data.portOfDischarge,
                description: 'Container discharged from vessel',
                vessel: data.Vessel || data.vesselName
            });
        }
        
        return events.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    extractAWBEvents(data) {
        const events = [];
        
        // Eventi dettagliati se disponibili
        if (data.events && Array.isArray(data.events)) {
            return data.events.map(event => ({
                date: this.parseShipsGoDate(event.date || event.eventDate || event.event_date),
                type: event.eventCode || event.type || event.event_type,
                status: this.normalizeStatus(event.status),
                location: event.location || event.locationName || event.airport,
                description: event.description || event.event || event.activity,
                flight: event.flightNumber || event.flight
            })).sort((a, b) => new Date(b.date) - new Date(a.date));
        }
        
        // Eventi base dall'oggetto route
        if (data.route?.origin?.date_of_dep) {
            events.push({
                date: this.parseShipsGoDate(data.route.origin.date_of_dep),
                type: 'DEP',
                status: 'in_transit',
                location: data.route.origin.location?.name || data.route.origin.location?.iata,
                description: 'Flight departed',
                flight: data.flightNumber
            });
        }
        
        if (data.route?.destination?.date_of_rcf) {
            events.push({
                date: this.parseShipsGoDate(data.route.destination.date_of_rcf),
                type: 'RCF',
                status: 'arrived',
                location: data.route.destination.location?.name || data.route.destination.location?.iata,
                description: 'Shipment received',
                flight: data.flightNumber
            });
        }
        
        return events.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    // ========================================
    // UTILITY E HELPERS (STANDALONE)
    // ========================================

    normalizeStatus(status) {
        if (!status) return 'registered';
        
        const statusMap = {
            // Container statuses
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
            'Booked': 'registered',
            
            // AWB statuses
            'RCS': 'registered',
            'MAN': 'in_transit',
            'DEP': 'in_transit',
            'ARR': 'arrived',
            'RCF': 'arrived',
            'DLV': 'delivered',
            'NFD': 'exception',
            'AWD': 'exception',
            'DELIVERED': 'delivered',
            'INPROGRESS': 'in_transit',
            'IN PROGRESS': 'in_transit',
            'PENDING': 'registered',
            'DELAYED': 'delayed',
            'CANCELLED': 'exception',
            
            // Generic
            'Registered': 'registered',
            'Pending': 'registered',
            'Delayed': 'delayed',
            'Exception': 'exception'
        };
        
        const upperStatus = status.toUpperCase();
        return statusMap[upperStatus] || statusMap[status] || 'registered';
    }

    parseShipsGoDate(dateInput) {
        if (!dateInput) return null;
        
        try {
            // Handle ShipsGo date object format { Date: "2024-01-15", IsActual: true }
            if (dateInput && typeof dateInput === 'object' && dateInput.Date) {
                return dateInput.Date;
            }
            
            // Handle string dates
            if (typeof dateInput === 'string') {
                // Check if it's already in ISO format
                if (dateInput.match(/^\d{4}-\d{2}-\d{2}/)) {
                    return dateInput.split('T')[0]; // Return just the date part
                }
                
                // Handle MM/DD/YYYY or DD/MM/YYYY
                if (dateInput.includes('/')) {
                    const parts = dateInput.split(' ')[0].split('/');
                    if (parts.length === 3) {
                        // Assume MM/DD/YYYY (formato US ShipsGo)
                        const date = new Date(parts[2], parts[0] - 1, parts[1]);
                        return date.toISOString().split('T')[0];
                    }
                }
            }
            
            // Try to parse as-is
            const date = new Date(dateInput);
            if (!isNaN(date.getTime())) {
                return date.toISOString().split('T')[0];
            }
            
            return null;
        } catch (error) {
            console.error('[TrackingService] Date parse error:', error);
            return null;
        }
    }

    detectTrackingType(trackingNumber) {
        const patterns = {
            container: /^[A-Z]{4}\d{7}$/,
            bl: /^[A-Z]{4}\d{8,12}$/,
            awb: /^\d{3}-?\d{8}$/,
            parcel: /^[A-Z0-9]{10,30}$/
        };

        for (const [type, pattern] of Object.entries(patterns)) {
            if (pattern.test(trackingNumber)) {
                return type;
            }
        }

        return 'container'; // Default
    }

    detectCarrier(trackingNumber) {
        const patterns = {
            'MSC': /^MSC/i,
            'MAERSK': /^(MAEU|MSKU|MRKU)/i,
            'CMA-CGM': /^(CMAU|CGMU)/i,
            'COSCO': /^(COSU|CSNU)/i,
            'HAPAG-LLOYD': /^(HLCU|HLXU)/i,
            'ONE': /^(ONEY|ONEU)/i,
            'EVERGREEN': /^(EGLV|EGHU)/i,
            'DHL': /^\d{10}$/,
            'FEDEX': /^\d{12}$/,
            'UPS': /^1Z/i,
            'CARGOLUX': /^\d{3}-?\d{8}$/
        };

        for (const [carrier, pattern] of Object.entries(patterns)) {
            if (pattern.test(trackingNumber)) {
                return carrier;
            }
        }

        return 'GENERIC';
    }

    normalizeCarrierCode(carrierInput) {
        if (!carrierInput) return 'UNKNOWN';
        
        const carrierMap = {
            'MAERSK LINE': 'MAERSK',
            'MEDITERRANEAN SHIPPING COMPANY': 'MSC',
            'CMA CGM': 'CMA-CGM',
            'COSCO SHIPPING': 'COSCO',
            'HAPAG LLOYD': 'HAPAG-LLOYD',
            'OCEAN NETWORK EXPRESS': 'ONE',
            'EVERGREEN LINE': 'EVERGREEN'
        };
        
        const upperInput = carrierInput.toUpperCase();
        return carrierMap[upperInput] || upperInput || 'UNKNOWN';
    }

    // ========================================
    // REFRESH E BULK OPERATIONS
    // ========================================

    async refresh(trackingId) {
        console.log('[TrackingService] 🔄 Refreshing tracking:', trackingId);
        
        if (this.mockMode) {
            return this.getMockRefreshData(trackingId);
        }

        try {
            // Recupera tracking corrente (simulato per ora)
            const tracking = { tracking_number: 'MSKU1234567', tracking_type: 'container' };
            
            // Re-track usando il servizio con force refresh
            const refreshedData = await this.track(tracking.tracking_number, tracking.tracking_type, {
                forceRefresh: true
            });
            
            return {
                success: true,
                status: refreshedData.status,
                lastUpdate: refreshedData.lastUpdate,
                events: refreshedData.events,
                metadata: refreshedData.metadata
            };
            
        } catch (error) {
            console.error('[TrackingService] ❌ Refresh error:', error);
            return this.getMockRefreshData(trackingId);
        }
    }

    async bulkTrack(trackings, options = {}) {
        console.log('[TrackingService] 📦 Bulk tracking:', trackings.length, 'items');
        
        const results = [];
        const batchSize = options.batchSize || 5;
        
        for (let i = 0; i < trackings.length; i += batchSize) {
            const batch = trackings.slice(i, i + batchSize);
            
            const batchPromises = batch.map(async (tracking) => {
                try {
                    const result = await this.track(tracking.tracking_number, tracking.tracking_type);
                    return { success: true, tracking: tracking.tracking_number, data: result };
                } catch (error) {
                    return { success: false, tracking: tracking.tracking_number, error: error.message };
                }
            });
            
            const batchResults = await Promise.allSettled(batchPromises);
            results.push(...batchResults.map(r => r.value));
            
            // Delay tra batch per rate limiting
            if (i + batchSize < trackings.length) {
                await this.delay(1000);
            }
        }
        
        return results;
    }

    // ========================================
    // IMPORT MANAGER INTEGRATION
    // ========================================

    async enrichTrackingWithShipsGoId(tracking) {
        // Se è un AWB e non ha shipsgo_id, cerca di recuperarlo
        if (tracking.tracking_type === 'awb' && !tracking.metadata?.shipsgo_id) {
            const shipsgoId = this.awbIdCache.get(tracking.tracking_number.toUpperCase());
            if (shipsgoId) {
                tracking.metadata = tracking.metadata || {};
                tracking.metadata.shipsgo_id = shipsgoId;
                console.log('[TrackingService] 🆔 Enriched AWB with cached ID:', shipsgoId);
            }
        }
        return tracking;
    }

    // ========================================
    // MOCK DATA E FALLBACK
    // ========================================

    async getMockTrackingData(trackingNumber, trackingType) {
        const carrier = this.detectCarrier(trackingNumber);
        const now = new Date();
        
        // Simula network delay
        await this.delay(200 + Math.random() * 300);
        
        const mockData = {
            success: true,
            trackingNumber: trackingNumber,
            trackingType: trackingType || this.detectTrackingType(trackingNumber),
            status: ['registered', 'in_transit', 'arrived', 'delivered'][Math.floor(Math.random() * 4)],
            lastUpdate: new Date().toISOString(),
            
            carrier: {
                code: carrier,
                name: this.getCarrierName(carrier)
            },
            
            route: {
                origin: {
                    port: trackingType === 'awb' ? 'HKG' : 'SHANGHAI',
                    name: trackingType === 'awb' ? 'Hong Kong Intl' : 'Shanghai Port',
                    date: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString()
                },
                destination: {
                    port: trackingType === 'awb' ? 'MXP' : 'GENOVA',
                    name: trackingType === 'awb' ? 'Milan Malpensa' : 'Port of Genova',
                    eta: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString()
                }
            },
            
            events: [
                {
                    date: new Date().toISOString(),
                    type: 'IN_TRANSIT',
                    location: 'Mediterranean Sea',
                    status: 'in_transit',
                    description: 'Shipment in transit to destination'
                },
                {
                    date: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
                    type: 'DEPARTED',
                    location: trackingType === 'awb' ? 'HKG Airport' : 'Shanghai Port',
                    status: 'departed',
                    description: 'Shipment departed from origin'
                }
            ],
            
            metadata: {
                source: 'mock',
                enriched_at: new Date().toISOString(),
                booking: 'BKG' + Math.random().toString().substr(2, 8),
                containerSize: trackingType === 'container' ? '40HC' : null,
                t5Count: trackingType === 'awb' ? Math.floor(Math.random() * 10) + 1 : null,
                shipsgo_id: trackingType === 'awb' ? Math.floor(Math.random() * 100000) : null
            },
            
            mockData: true
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

        return mockData;
    }

    getMockRefreshData(trackingId) {
        const states = ['registered', 'in_transit', 'arrived', 'customs_cleared', 'delivered'];
        const currentIndex = Math.floor(Math.random() * states.length);
        
        return {
            success: true,
            status: states[currentIndex],
            lastUpdate: new Date().toISOString(),
            mockData: true
        };
    }

    getCarrierName(code) {
        const names = {
            'MSC': 'Mediterranean Shipping Company',
            'MAERSK': 'Maersk Line',
            'CMA-CGM': 'CMA CGM',
            'COSCO': 'COSCO Shipping',
            'HAPAG-LLOYD': 'Hapag-Lloyd',
            'ONE': 'Ocean Network Express',
            'EVERGREEN': 'Evergreen Line',
            'DHL': 'DHL Express',
            'FEDEX': 'FedEx',
            'UPS': 'UPS',
            'CARGOLUX': 'Cargolux',
            'GENERIC': 'Generic Carrier'
        };

        return names[code] || code;
    }

    // ========================================
    // RATE LIMITING E UTILITY
    // ========================================

    checkRateLimit(api) {
        const limit = this.rateLimits[api];
        if (!limit) return true;
        
        const now = Date.now();
        
        // Reset counter se window scaduta
        if (now > limit.resetTime) {
            limit.current = 0;
            limit.resetTime = now + limit.window;
        }
        
        if (limit.current >= limit.max) {
            console.warn('[TrackingService] ⚠️ Rate limit exceeded for', api);
            return false;
        }
        
        limit.current++;
        return true;
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async executeRequest(request) {
        // Esegui la richiesta effettiva
        return await request.fn();
    }

    // ========================================
    // CONFIGURAZIONE E MANAGEMENT
    // ========================================

    updateConfiguration(config) {
        try {
            localStorage.setItem('trackingServiceConfig', JSON.stringify(config));
            console.log('[TrackingService] ⚙️ Configuration updated');
            
            // Ricarica configurazione
            this.loadApiConfiguration();
            
            return true;
        } catch (error) {
            console.error('[TrackingService] ❌ Failed to update configuration:', error);
            return false;
        }
    }

    getConfiguration() {
        try {
            return JSON.parse(localStorage.getItem('trackingServiceConfig') || '{}');
        } catch (error) {
            return {};
        }
    }

    async testConnection() {
        const results = {
            v1: null,
            v2: null,
            overall: false
        };

        const proxyUrl = '/netlify/functions/shipsgo-proxy';

        if (this.apiConfig.v1?.enabled) {
            try {
                const response = await fetch(proxyUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        version: 'v1.2',
                        endpoint: '/ContainerService/GetShippingLineList',
                        method: 'GET'
                    })
                });
                const proxyResponse = await response.json();
                
                results.v1 = {
                    success: proxyResponse.success,
                    status: proxyResponse.status,
                    message: proxyResponse.success ? 'Connected successfully' : 'Connection failed'
                };
            } catch (error) {
                results.v1 = {
                    success: false,
                    message: error.message
                };
            }
        }

        if (this.apiConfig.v2?.enabled) {
            try {
                const response = await fetch(proxyUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        version: 'v2',
                        endpoint: '/air/airlines',
                        method: 'GET'
                    })
                });
                const proxyResponse = await response.json();
                
                results.v2 = {
                    success: proxyResponse.success,
                    status: proxyResponse.status,
                    message: proxyResponse.success ? 'Connected successfully' : 'Connection failed'
                };
            } catch (error) {
                results.v2 = {
                    success: false,
                    message: error.message
                };
            }
        }

        results.overall = (results.v1?.success || results.v2?.success) || false;
        
        console.log('[TrackingService] 🔗 Connection test results:', results);
        return results;
    }

    // ========================================
    // PUBLIC API
    // ========================================

    setMockMode(enabled) {
        this.mockMode = enabled;
        console.log('[TrackingService] 🔧 Mock mode:', enabled ? 'ENABLED' : 'DISABLED');
    }

    hasApiKeys() {
        return !!(this.apiConfig.v1?.authCode || this.apiConfig.v2?.userToken);
    }

    getStats() {
        return {
            initialized: this.initialized,
            mockMode: this.mockMode,
            cacheSize: this.cache.size,
            queueSize: this.requestQueue.length,
            apiConfig: {
                v1: !!this.apiConfig.v1,
                v2: !!this.apiConfig.v2
            },
            rateLimits: this.rateLimits,
            awbIdCacheSize: this.awbIdCache.size
        };
    }

    clearCache() {
        this.cache.clear();
        console.log('[TrackingService] 🗑️ Cache cleared');
    }

    // Metodo pubblico per ImportManager
    getAWBIdCache() {
        return new Map(this.awbIdCache);
    }

    // Metodo pubblico per Debug Panel
    async getAirShipmentsList() {
        const proxyUrl = '/netlify/functions/shipsgo-proxy';
        
        console.log('[TrackingService] 📋 Fetching AWB list from ShipsGo...');
        
        const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                version: 'v2',
                endpoint: '/air/shipments',
                method: 'GET'
            })
        });

        const proxyResponse = await response.json();
        
        if (!proxyResponse.success) {
            console.error('[TrackingService] ❌ Failed to get AWB list:', proxyResponse);
            return [];
        }

        const shipments = proxyResponse.data?.shipments || 
                         (Array.isArray(proxyResponse.data) ? proxyResponse.data : []);
        console.log('[TrackingService] 📦 Retrieved', shipments.length, 'AWB shipments');
        
        return shipments;
    }
}

// Export singleton
export default new TrackingService();