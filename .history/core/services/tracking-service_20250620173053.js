// core/services/tracking-service.js - VERSIONE MINIMAL FIX
// Service layer con fix endpoint ma senza import TrackingConfig

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
            
            this.initialized = true;
            console.log('[TrackingService] ✅ Optimized service initialized', {
                mockMode: this.mockMode,
                apis: {
                    v1: !!this.apiConfig.v1,
                    v2: !!this.apiConfig.v2
                }
            });
            
            return true;
        } catch (error) {
            console.error('[TrackingService] ❌ Init error:', error);
            return false;
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

// ANCHE: Aggiorna il metodo normalizeContainerResponse per gestire i nomi dei campi corretti
// Cerca normalizeContainerResponse (circa riga 600) e aggiorna questi mapping:

normalizeContainerResponse(data, trackingNumber) {
    const containerData = data.data || data;
    
    return {
        success: true,
        trackingNumber: trackingNumber,
        trackingType: 'container',
        status: this.normalizeStatus(containerData.Status || containerData.status),
        lastUpdate: new Date().toISOString(),
        
        carrier: {
            code: this.normalizeCarrierCode(containerData.ShippingLine || containerData.shippingLine || containerData.carrier),
            name: containerData.ShippingLine || containerData.shippingLine || containerData.carrier
        },
        
        route: {
            origin: {
                port: containerData.Pol || containerData.pol || containerData.portOfLoading,
                country: containerData.FromCountry || containerData.polCountry,
                date: this.parseShipsGoDate(containerData.LoadingDate || containerData.DepartureDate || containerData.etd || containerData.loadingDate)
            },
            destination: {
                port: containerData.Pod || containerData.pod || containerData.portOfDischarge,
                country: containerData.ToCountry || containerData.podCountry,
                eta: this.parseShipsGoDate(containerData.ETA || containerData.eta || containerData.ArrivalDate || containerData.dischargeDate)
            }
        },
        
        // ✅ FIX: Usa 'Vessel' invece di 'vesselName'
        vessel: containerData.Vessel || containerData.VesselName ? {
            name: containerData.Vessel || containerData.VesselName || containerData.vesselName,
            voyage: containerData.VesselVoyage || containerData.voyage,
            imo: containerData.VesselIMO || containerData.vesselIMO
        } : null,
        
        events: this.extractContainerEvents(containerData),
        
        metadata: {
            source: 'shipsgo_v1',
            enriched_at: new Date().toISOString(),
            raw: containerData,
            booking: containerData.ReferenceNo || containerData.bookingNumber,
            containerSize: containerData.ContainerTEU || containerData.containerSize,
            co2Emission: containerData.Co2Emission || containerData.co2Emission,
            transitTime: containerData.FormatedTransitTime,
            dischargeDate: containerData.DischargeDate,
            arrivalDate: containerData.ArrivalDate
        }
    };
}

    // ========================================
    // TRACKING AWB (ShipsGo v2.0) - ENDPOINT CORRETTI
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
            // Step 1: Aggiungi AWB (se non esiste)
            if (!options.skipAdd) {
                await this.addAWBToShipsGo(awbNumber);
            }
            
            // Step 2: Recupera informazioni
            const awbInfo = await this.getAWBInfo(awbNumber);
            
            // Step 3: Normalizza risposta
            const result = this.normalizeAWBResponse(awbInfo, awbNumber);
            
            console.log('[TrackingService] ✅ AWB tracking completed:', result.status);
            return result;
            
        } catch (error) {
            console.error('[TrackingService] ❌ AWB tracking error:', error);
            throw error;
        }
    }

    async addAWBToShipsGo(awbNumber) {
        const proxyUrl = '/netlify/functions/shipsgo-proxy';
        
        const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                version: 'v2',
                endpoint: '/air/shipments',
                method: 'POST',
                data: {
                    awbNumber: awbNumber.toUpperCase(),
                    airline: 'CV'
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

        console.log('[TrackingService] ➕ AWB added to ShipsGo');
        return proxyResponse.data;
    }

    async getAWBInfo(awbNumber) {
        const proxyUrl = '/netlify/functions/shipsgo-proxy';
        
        const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                version: 'v2',
                endpoint: '/air/shipments',
                method: 'GET',
                params: {
                    awbNumber: awbNumber.toUpperCase()
                }
            })
        });

        const proxyResponse = await response.json();
        
        if (!proxyResponse.success) {
            throw new Error(proxyResponse.data?.message || proxyResponse.error || 'Failed to get AWB info');
        }

        return proxyResponse.data;
    }

    // ========================================
    // NORMALIZZAZIONE RISPOSTE (METODI STANDALONE)
    // ========================================

    normalizeContainerResponse(data, trackingNumber) {
        const containerData = data.data || data;
        
        return {
            success: true,
            trackingNumber: trackingNumber,
            trackingType: 'container',
            status: this.normalizeStatus(containerData.status),
            lastUpdate: new Date().toISOString(),
            
            carrier: {
                code: this.normalizeCarrierCode(containerData.shippingLine || containerData.carrier),
                name: containerData.shippingLine || containerData.carrier
            },
            
            route: {
                origin: {
                    port: containerData.pol || containerData.portOfLoading,
                    country: containerData.polCountry,
                    date: this.parseShipsGoDate(containerData.etd || containerData.loadingDate)
                },
                destination: {
                    port: containerData.pod || containerData.portOfDischarge,
                    country: containerData.podCountry,
                    eta: this.parseShipsGoDate(containerData.eta || containerData.dischargeDate)
                }
            },
            
            vessel: containerData.vesselName ? {
                name: containerData.vesselName,
                voyage: containerData.voyage,
                imo: containerData.vesselIMO
            } : null,
            
            events: this.extractContainerEvents(containerData),
            
            metadata: {
                source: 'shipsgo_v1',
                enriched_at: new Date().toISOString(),
                raw: containerData,
                booking: containerData.bookingNumber,
                containerSize: containerData.containerSize,
                co2Emission: containerData.co2Emission
            }
        };
    }

    normalizeAWBResponse(data, awbNumber) {
        const awbData = data.data || data;
        
        return {
            success: true,
            trackingNumber: awbNumber,
            trackingType: 'awb',
            status: this.normalizeStatus(awbData.status),
            lastUpdate: new Date().toISOString(),
            
            carrier: {
                code: this.normalizeCarrierCode(awbData.airline || awbData.carrier),
                name: awbData.airline || awbData.carrier
            },
            
            route: {
                origin: {
                    port: awbData.origin,
                    name: awbData.originName,
                    country: awbData.originCountry,
                    date: this.parseShipsGoDate(awbData.departureDate)
                },
                destination: {
                    port: awbData.destination,
                    name: awbData.destinationName,
                    country: awbData.destinationCountry,
                    eta: this.parseShipsGoDate(awbData.arrivalDate)
                }
            },
            
            flight: awbData.flightNumber ? {
                number: awbData.flightNumber,
                date: awbData.departureDate
            } : null,
            
            package: {
                pieces: awbData.pieces || awbData.t5Count,
                weight: awbData.weight,
                weightUnit: awbData.weightUnit || 'kg'
            },
            
            events: this.extractAWBEvents(awbData),
            
            metadata: {
                source: 'shipsgo_v2',
                enriched_at: new Date().toISOString(),
                raw: awbData,
                transitTime: awbData.transitTime,
                t5Count: awbData.t5Count
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
        if (data.loadingDate) {
            events.push({
                date: this.parseShipsGoDate(data.loadingDate),
                type: 'LOADED_ON_VESSEL',
                status: 'in_transit',
                location: data.pol || data.portOfLoading,
                description: 'Container loaded on vessel',
                vessel: data.vesselName
            });
        }
        
        if (data.dischargeDate) {
            events.push({
                date: this.parseShipsGoDate(data.dischargeDate),
                type: 'DISCHARGED_FROM_VESSEL',
                status: 'arrived',
                location: data.pod || data.portOfDischarge,
                description: 'Container discharged from vessel',
                vessel: data.vesselName
            });
        }
        
        return events.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    extractAWBEvents(data) {
        const events = [];
        
        // Eventi dettagliati se disponibili
        if (data.events && Array.isArray(data.events)) {
            return data.events.map(event => ({
                date: this.parseShipsGoDate(event.date || event.eventDate),
                type: event.eventCode || event.type,
                status: this.normalizeStatus(event.status),
                location: event.location || event.locationName,
                description: event.description || event.event,
                flight: event.flightNumber
            })).sort((a, b) => new Date(b.date) - new Date(a.date));
        }
        
        // Eventi base
        if (data.departureDate) {
            events.push({
                date: this.parseShipsGoDate(data.departureDate),
                type: 'DEP',
                status: 'in_transit',
                location: data.originName || data.origin,
                description: 'Flight departed',
                flight: data.flightNumber
            });
        }
        
        if (data.arrivalDate) {
            events.push({
                date: this.parseShipsGoDate(data.arrivalDate),
                type: 'ARR',
                status: 'arrived',
                location: data.destinationName || data.destination,
                description: 'Flight arrived',
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
            
            // Generic
            'Registered': 'registered',
            'Pending': 'registered',
            'Delayed': 'delayed',
            'Exception': 'exception'
        };
        
        return statusMap[status] || 'registered';
    }

    parseShipsGoDate(dateStr) {
        if (!dateStr) return null;
        
        try {
            // Gestisci diversi formati date ShipsGo
            if (dateStr.includes('/')) {
                // MM/DD/YYYY or DD/MM/YYYY
                const parts = dateStr.split(' ')[0].split('/');
                if (parts.length === 3) {
                    // Assume MM/DD/YYYY (formato US ShipsGo)
                    const date = new Date(parts[2], parts[0] - 1, parts[1]);
                    return date.toISOString();
                }
            }
            
            // ISO format
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
                return date.toISOString();
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
                t5Count: trackingType === 'awb' ? Math.floor(Math.random() * 10) + 1 : null
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
            rateLimits: this.rateLimits
        };
    }

    clearCache() {
        this.cache.clear();
        console.log('[TrackingService] 🗑️ Cache cleared');
    }
}

// Export singleton
export default new TrackingService();