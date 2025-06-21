// core/services/tracking-service.js
// Servizio per il tracking di container e spedizioni con integrazione ShipsGo

class TrackingService {
    constructor() {
        console.log('[TrackingService] Initializing optimized service...');
        
        this.config = {
            shipsgo_v1_key: null,
            shipsgo_v1_enabled: false,
            shipsgo_v2_token: null,
            shipsgo_v2_enabled: false,
            force_mock_mode: false
        };
        
        this.loadConfig();
        this.mockMode = false;
        this.checkMockMode();
        
        console.log('[TrackingService] ✅ Optimized service initialized', this.config);
    }

    // ========================================
    // CONFIGURAZIONE
    // ========================================

    loadConfig() {
        try {
            // Carica configurazione da localStorage
            const savedConfig = localStorage.getItem('trackingServiceConfig');
            if (savedConfig) {
                const parsedConfig = JSON.parse(savedConfig);
                this.config = { ...this.config, ...parsedConfig };
            }

            // Legacy support: controlla vecchi formati
            const appSettings = localStorage.getItem('appSettings');
            if (appSettings) {
                const settings = JSON.parse(appSettings);
                if (settings.shipsgo_api_key) {
                    this.config.shipsgo_v1_key = settings.shipsgo_api_key;
                    this.config.shipsgo_v1_enabled = true;
                }
            }

            // Controlla userProfile per token v2
            const userProfile = localStorage.getItem('userProfile');
            if (userProfile) {
                const profile = JSON.parse(userProfile);
                if (profile.api_settings?.shipsgo_v2?.authToken) {
                    this.config.shipsgo_v2_token = profile.api_settings.shipsgo_v2.authToken;
                    this.config.shipsgo_v2_enabled = true;
                }
            }

            // Salva configurazione normalizzata
            this.saveConfig();

            // Configura ShipsGo se abbiamo le chiavi
            if (this.config.shipsgo_v1_key) {
                console.log('[TrackingService] ShipsGo v1.2 configured');
                // La chiave viene passata direttamente alle chiamate API
            }

            if (this.config.shipsgo_v2_token) {
                console.log('[TrackingService] ShipsGo v2.0 configured');
                // Il token viene passato direttamente alle chiamate API
            }

        } catch (error) {
            console.error('[TrackingService] Error loading config:', error);
        }
    }

    saveConfig() {
        try {
            localStorage.setItem('trackingServiceConfig', JSON.stringify(this.config));
        } catch (error) {
            console.error('[TrackingService] Error saving config:', error);
        }
    }

    updateConfig(updates) {
        this.config = { ...this.config, ...updates };
        this.saveConfig();
        console.log('[TrackingService] Config updated:', this.config);
    }

    hasApiKeys() {
        return (this.config.shipsgo_v1_enabled && this.config.shipsgo_v1_key) || 
               (this.config.shipsgo_v2_enabled && this.config.shipsgo_v2_token);
    }

    // ========================================
    // MOCK MODE
    // ========================================

    checkMockMode() {
        // Forza mock mode se richiesto dalla configurazione
        if (this.config.force_mock_mode) {
            this.mockMode = true;
            console.log('[TrackingService] 🎭 Forced mock mode active');
            return;
        }

        // Abilita mock mode se non ci sono API keys
        if (!this.hasApiKeys()) {
            this.mockMode = true;
            console.log('[TrackingService] 🎭 Mock mode active (no API keys)');
        } else {
            this.mockMode = false;
            console.log('[TrackingService] 🔌 Live mode active');
        }
    }

    // ========================================
    // TRACKING PRINCIPALE
    // ========================================

    async track(trackingNumber, trackingType = 'auto', options = {}) {
        console.log(`[TrackingService] 🔍 Tracking: ${trackingNumber} ${trackingType}`);
        
        if (!trackingNumber) {
            return {
                success: false,
                error: 'Tracking number is required'
            };
        }

        // Auto-detect type if needed
        if (trackingType === 'auto') {
            trackingType = this.detectType(trackingNumber);
        }

        // Force refresh bypassa la cache
        const forceRefresh = options.forceRefresh || false;

        try {
            // Se mock mode è attivo, ritorna dati mock
            if (this.mockMode) {
                return this.getMockData(trackingNumber, trackingType);
            }

            // Altrimenti usa le API reali
            switch (trackingType) {
                case 'container':
                case 'bl':
                    return await this.trackContainer(trackingNumber, options);
                    
                case 'awb':
                    return await this.trackAWB(trackingNumber, options);
                    
                default:
                    return this.getMockData(trackingNumber, trackingType);
            }
            
        } catch (error) {
            console.error('[TrackingService] Tracking error:', error);
            
            // Fallback to mock data on error
            if (options.fallbackToMock !== false) {
                console.log('[TrackingService] Falling back to mock data');
                return this.getMockData(trackingNumber, trackingType);
            }
            
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ========================================
    // CONTAINER TRACKING (SHIPSGO V1.2)
    // ========================================

    async trackContainer(containerNumber, options = {}) {
        console.log(`[TrackingService] 🚢 Tracking container via ShipsGo v1.2: ${containerNumber}`);
        
        if (!this.config.shipsgo_v1_enabled || !this.config.shipsgo_v1_key) {
            console.log('[TrackingService] ShipsGo v1.2 not configured, using mock data');
            return this.getMockData(containerNumber, 'container');
        }

        try {
            // Step 1: Add container to ShipsGo (if not already added)
            await this.addContainerToShipsGo(containerNumber);
            
            // Step 2: Get container info
            const containerInfo = await this.getContainerInfo(containerNumber, options);
            
            // Step 3: Normalize response
            const normalized = this.normalizeContainerResponse(containerInfo, containerNumber);
            
            console.log(`[TrackingService] ✅ Container tracking completed: ${normalized.status}`);
            return normalized;
            
        } catch (error) {
            console.error('[TrackingService] Container tracking error:', error);
            throw error;
        }
    }

    async addContainerToShipsGo(containerNumber) {
        console.log(`[TrackingService] ➕ Adding container to ShipsGo: ${containerNumber}`);
        
        const proxyUrl = '/netlify/functions/shipsgo-proxy';
        
        const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                version: 'v1.2',
                endpoint: '/ContainerService/AddContainer',
                method: 'POST',
                data: {
                    ContainerNumber: containerNumber.toUpperCase()
                }
            })
        });

        const proxyResponse = await response.json();
        console.log('[TrackingService] 📥 Add container response:', proxyResponse);
        
        if (!proxyResponse.success) {
            // Non è un errore critico se il container esiste già
            if (proxyResponse.data?.message?.includes('already exists') || 
                proxyResponse.data?.includes('already exists')) {
                console.log('[TrackingService] ℹ️ Container already exists in ShipsGo');
                return;
            }
            
            throw new Error(proxyResponse.data?.message || proxyResponse.error || 'Failed to add container');
        }

        console.log('[TrackingService] ✅ Container added successfully');
    }

    async postContainer(containerNumber, containerType = 'container', carrierCode = null) {
        console.log(`[TrackingService] 📮 POST Container: ${containerNumber}`);
        
        try {
            // Solo aggiunge il container, non recupera info
            await this.addContainerToShipsGo(containerNumber);
            
            return {
                success: true,
                message: 'Container registrato con successo',
                trackingNumber: containerNumber,
                trackingType: containerType,
                carrier: carrierCode
            };
        } catch (error) {
            console.error('[TrackingService] POST Container error:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    async getContainerInfo(containerNumber, options = {}) {
        const proxyUrl = '/netlify/functions/shipsgo-proxy';
        
        // FIX: Usa sempre il containerNumber come requestId
        const params = {
            requestId: containerNumber.toUpperCase()
        };
        
        // Aggiungi mappoint se richiesto (default: true per avere più info)
        params.mapPoint = options.mapPoint !== false ? 'true' : options.mapPoint ? 'true' : 'true';
        
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
    // AWB TRACKING (SHIPSGO V2.0)
    // ========================================

    async trackAWB(awbNumber, options = {}) {
        console.log(`[TrackingService] ✈️ Tracking AWB via ShipsGo v2.0: ${awbNumber}`);
        
        if (!this.config.shipsgo_v2_enabled || !this.config.shipsgo_v2_token) {
            console.log('[TrackingService] ShipsGo v2.0 not configured, using mock data');
            return this.getMockData(awbNumber, 'awb');
        }

        try {
            // Qui implementeremmo la chiamata reale a ShipsGo v2
            // Per ora ritorniamo mock data
            console.log('[TrackingService] AWB tracking not yet implemented, using mock data');
            return this.getMockData(awbNumber, 'awb');
            
        } catch (error) {
            console.error('[TrackingService] AWB tracking error:', error);
            throw error;
        }
    }

    async addAWBToShipsGo(awbNumber, carrierCode) {
        const proxyUrl = '/netlify/functions/shipsgo-proxy';
        
        const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                version: 'v2',
                endpoint: '/air/shipments',
                method: 'POST',
                data: {
                    AwbNumber: awbNumber.toUpperCase(),
                    AirlineCode: carrierCode || 'CV' // Default to Cargolux
                }
            })
        });

        const proxyResponse = await response.json();
        
        if (!proxyResponse.success) {
            throw new Error(proxyResponse.data?.message || proxyResponse.error || 'Failed to add AWB');
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
    // API TO COLUMN MAPPING
    // ========================================

    /**
     * Mappa i campi della risposta API ShipsGo ai nomi delle colonne usate nel sistema
     * Questo garantisce compatibilità con il column mapping esistente per import/export
     */
    mapApiResponseToColumnNames(apiData) {
        // Mapping dei campi API → Column Names del sistema
        const fieldMapping = {
            // API Field → System Column Name
            'ShippingLine': 'carrier_code',
            'ContainerNumber': 'tracking_number',
            'Status': 'current_status',
            'StatusId': 'status_id',
            'FromCountry': 'origin_country',
            'Pol': 'origin_port',  // Port of Loading
            'ToCountry': 'destination_country',
            'Pod': 'destination_port',  // Port of Discharge
            'LoadingDate': 'loading_date',
            'DepartureDate': 'departure_date',
            'ArrivalDate': 'arrival_date',
            'DischargeDate': 'discharge_date',
            'ETA': 'eta',
            'FirstETA': 'first_eta',
            'Vessel': 'vessel_name',
            'VesselIMO': 'vessel_imo',
            'VesselVoyage': 'voyage',
            'ContainerType': 'container_type',
            'ContainerTEU': 'container_size',
            'EmptyToShipperDate': 'empty_to_shipper',
            'GateInDate': 'gate_in',
            'GateOutDate': 'gate_out',
            'EmptyReturnDate': 'empty_return',
            'FormatedTransitTime': 'transit_time',
            'Co2Emission': 'co2_emission',
            
            // Per AWB/Air tracking
            'AirlineCode': 'carrier_code',
            'AirlineName': 'carrier_name',
            'AWBNumber': 'tracking_number',
            'FlightNumber': 'vessel_name',  // Usa vessel_name anche per flight
            'DepartureAirport': 'origin_port',
            'ArrivalAirport': 'destination_port',
            'EstimatedDeparture': 'departure_date',
            'EstimatedArrival': 'arrival_date',
            
            // Campi comuni alternativi
            'carrier': 'carrier_code',
            'shippingLine': 'carrier_code',
            'containerNumber': 'tracking_number',
            'awbNumber': 'tracking_number',
            'status': 'current_status',
            'pol': 'origin_port',
            'pod': 'destination_port',
            'etd': 'departure_date',
            'eta': 'arrival_date',
            'vesselName': 'vessel_name',
            'voyage': 'voyage'
        };
        
        // Crea oggetto con nomi mappati
        const mappedData = {};
        
        // Mappa tutti i campi
        for (const [apiField, systemColumn] of Object.entries(fieldMapping)) {
            if (apiData[apiField] !== undefined && apiData[apiField] !== null) {
                mappedData[systemColumn] = apiData[apiField];
            }
        }
        
        // Gestisci campi speciali che richiedono elaborazione
        if (apiData.LoadingDate || apiData.DepartureDate) {
            const dateObj = apiData.LoadingDate || apiData.DepartureDate;
            if (dateObj && dateObj.Date) {
                mappedData.loading_date = dateObj.Date;
                mappedData.departure_date = dateObj.Date;
                mappedData.is_actual_departure = dateObj.IsActual || false;
            }
        }
        
        if (apiData.ArrivalDate || apiData.DischargeDate) {
            const dateObj = apiData.ArrivalDate || apiData.DischargeDate;
            if (dateObj && dateObj.Date) {
                mappedData.arrival_date = dateObj.Date;
                mappedData.discharge_date = dateObj.Date;
                mappedData.is_actual_arrival = dateObj.IsActual || false;
            }
        }
        
        // Gestisci TS Ports (transshipment ports)
        if (apiData.TSPorts && Array.isArray(apiData.TSPorts)) {
            mappedData.transshipment_ports = apiData.TSPorts.map(port => ({
                port_name: port.Port,
                arrival_date: port.ArrivalDate?.Date,
                departure_date: port.DepartureDate?.Date,
                vessel_name: port.Vessel,
                vessel_imo: port.VesselIMO,
                voyage: port.VesselVoyage
            }));
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
            status: this.normalizeStatus(mappedData.current_status || 'registered'),
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
            
            // Eventi se disponibili
            events: this.normalizeEvents(containerData.events || containerData.trackingEvents || []),
            
            metadata: {
                source: 'shipsgo_v1',
                enriched_at: new Date().toISOString(),
                raw: containerData,
                mapped: mappedData
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
                code: awbData.airlineCode || awbData.carrier,
                name: awbData.airlineName || awbData.carrierName
            },
            
            route: {
                origin: {
                    port: awbData.origin || awbData.departureAirport,
                    country: awbData.originCountry,
                    date: this.parseShipsGoDate(awbData.departureDate)
                },
                destination: {
                    port: awbData.destination || awbData.arrivalAirport,
                    country: awbData.destinationCountry,
                    eta: this.parseShipsGoDate(awbData.arrivalDate)
                }
            },
            
            flight: awbData.flightNumber ? {
                number: awbData.flightNumber,
                date: awbData.flightDate
            } : null,
            
            events: this.normalizeEvents(awbData.events || awbData.trackingEvents || []),
            
            metadata: {
                source: 'shipsgo_v2',
                enriched_at: new Date().toISOString(),
                raw: awbData
            }
        };
    }

    // ========================================
    // UTILITY METHODS
    // ========================================

    detectType(trackingNumber) {
        const patterns = {
            container: /^[A-Z]{4}\d{7}$/,
            bl: /^[A-Z]{4}\d{8,12}$/,
            awb: /^\d{3}-\d{8}$/,
            parcel: /^[A-Z0-9]{10,30}$/
        };

        const cleaned = trackingNumber.trim().toUpperCase();

        for (const [type, pattern] of Object.entries(patterns)) {
            if (pattern.test(cleaned)) {
                return type;
            }
        }

        return 'parcel'; // Default
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

    normalizeStatus(status) {
        if (!status) return 'registered';
        
        const statusMap = {
            // Container/Maritime statuses
            'Sailing': 'in_transit',
            'Arrived': 'arrived',
            'Delivered': 'delivered',
            'Discharged': 'arrived',
            'Gate Out': 'delivered',
            'Empty Return': 'completed',
            
            // AWB/Air statuses
            'Departed': 'in_transit',
            'In Transit': 'in_transit',
            'Arrived at destination': 'arrived',
            'Out for delivery': 'in_transit',
            'Delivered': 'delivered',
            
            // Parcel statuses
            'Picked up': 'registered',
            'In transit': 'in_transit',
            'Out for delivery': 'in_transit',
            'Delivered': 'delivered',
            'Exception': 'exception',
            
            // Italian statuses
            'Consegnata.': 'delivered',
            'In consegna': 'in_transit',
            'La spedizione è in transito': 'in_transit',
            'Hub in entrata': 'in_transit',
            
            // Express carrier statuses
            'Shipment information sent to FedEx': 'registered',
            'In transit': 'in_transit',
            'On FedEx vehicle for delivery': 'in_transit',
            'Delivered': 'delivered',
            
            // Generic
            'Registered': 'registered',
            'Pending': 'registered',
            'Active': 'in_transit',
            'Completed': 'delivered'
        };
        
        // Direct mapping
        if (statusMap[status]) {
            return statusMap[status];
        }
        
        // Case-insensitive search
        const lowerStatus = status.toLowerCase();
        for (const [key, value] of Object.entries(statusMap)) {
            if (key.toLowerCase() === lowerStatus) {
                return value;
            }
        }
        
        // Partial match
        if (lowerStatus.includes('transit')) return 'in_transit';
        if (lowerStatus.includes('delivered') || lowerStatus.includes('consegn')) return 'delivered';
        if (lowerStatus.includes('arrived') || lowerStatus.includes('arriv')) return 'arrived';
        if (lowerStatus.includes('customs') || lowerStatus.includes('dogan')) return 'customs';
        if (lowerStatus.includes('departed') || lowerStatus.includes('partito')) return 'in_transit';
        
        return 'registered'; // Default
    }

    parseShipsGoDate(dateObj) {
        if (!dateObj) return null;
        
        // Handle ShipsGo date format { Date: "2024-01-15", IsActual: true }
        if (dateObj.Date) {
            return dateObj.Date;
        }
        
        // Handle string dates
        if (typeof dateObj === 'string') {
            return dateObj;
        }
        
        return null;
    }

    normalizeEvents(events) {
        if (!Array.isArray(events)) return [];
        
        return events.map(event => ({
            date: this.parseShipsGoDate(event.Date || event.date || event.EventDate),
            location: event.Location || event.location || event.Port || '',
            description: event.Description || event.description || event.Status || '',
            status: this.normalizeStatus(event.Status || event.status),
            isActual: event.IsActual || false
        }));
    }

    // ========================================
    // MOCK DATA
    // ========================================

    getMockData(trackingNumber, trackingType) {
        console.log(`[TrackingService] 🎭 Generating mock data for ${trackingNumber}`);
        
        const mockCarrier = this.detectCarrier(trackingNumber);
        const mockStatus = ['registered', 'in_transit', 'arrived', 'delivered'][Math.floor(Math.random() * 4)];
        
        const mockData = {
            success: true,
            trackingNumber: trackingNumber,
            trackingType: trackingType,
            status: mockStatus,
            lastUpdate: new Date().toISOString(),
            
            carrier: {
                code: mockCarrier,
                name: this.getCarrierName(mockCarrier)
            },
            
            route: {
                origin: {
                    port: 'SHANGHAI',
                    country: 'CN',
                    date: this.getRandomDate(-30)
                },
                destination: {
                    port: 'GENOVA',
                    country: 'IT',
                    eta: this.getRandomDate(10)
                }
            },
            
            vessel: trackingType === 'container' ? {
                name: 'MSC OSCAR',
                imo: '9703318',
                voyage: 'FE2401A'
            } : null,
            
            flight: trackingType === 'awb' ? {
                number: 'CV7734',
                date: this.getRandomDate(-2)
            } : null,
            
            events: this.generateMockEvents(mockStatus),
            
            metadata: {
                source: 'mock',
                enriched_at: new Date().toISOString(),
                mock_reason: this.mockMode ? 'Mock mode active' : 'API fallback'
            },
            
            mockData: true
        };
        
        return mockData;
    }

    generateMockEvents(currentStatus) {
        const events = [];
        const baseDate = new Date();
        
        // Always have a registration event
        events.push({
            date: this.getRandomDate(-20),
            location: 'SHANGHAI, CN',
            description: 'Container registered',
            status: 'registered',
            isActual: true
        });
        
        // Add transit events based on status
        if (['in_transit', 'arrived', 'delivered'].includes(currentStatus)) {
            events.push({
                date: this.getRandomDate(-15),
                location: 'SHANGHAI PORT, CN',
                description: 'Container loaded on vessel',
                status: 'in_transit',
                isActual: true
            });
            
            events.push({
                date: this.getRandomDate(-10),
                location: 'SINGAPORE, SG',
                description: 'Transshipment',
                status: 'in_transit',
                isActual: true
            });
        }
        
        if (['arrived', 'delivered'].includes(currentStatus)) {
            events.push({
                date: this.getRandomDate(-3),
                location: 'GENOVA PORT, IT',
                description: 'Container discharged from vessel',
                status: 'arrived',
                isActual: true
            });
        }
        
        if (currentStatus === 'delivered') {
            events.push({
                date: this.getRandomDate(-1),
                location: 'GENOVA, IT',
                description: 'Container delivered to consignee',
                status: 'delivered',
                isActual: true
            });
        }
        
        return events.reverse(); // Most recent first
    }

    getRandomDate(daysOffset) {
        const date = new Date();
        date.setDate(date.getDate() + daysOffset);
        return date.toISOString().split('T')[0];
    }

    getCarrierName(code) {
        const carriers = {
            'MSC': 'Mediterranean Shipping Company',
            'MAERSK': 'Maersk Line',
            'CMA-CGM': 'CMA CGM',
            'COSCO': 'COSCO Shipping',
            'HAPAG-LLOYD': 'Hapag-Lloyd',
            'ONE': 'Ocean Network Express',
            'EVERGREEN': 'Evergreen Line',
            'DHL': 'DHL Express',
            'FEDEX': 'FedEx',
            'UPS': 'United Parcel Service',
            'CARGOLUX': 'Cargolux Airlines',
            'GENERIC': 'Generic Carrier'
        };
        
        return carriers[code] || code;
    }

    getMockRefreshData(trackingId) {
        const statuses = ['in_transit', 'arrived', 'customs_cleared', 'delivered'];
        const newStatus = statuses[Math.floor(Math.random() * statuses.length)];
        
        return {
            success: true,
            status: newStatus,
            lastUpdate: new Date().toISOString(),
            events: this.generateMockEvents(newStatus),
            metadata: {
                source: 'mock',
                refreshed_at: new Date().toISOString()
            }
        };
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
            console.error('[TrackingService] Refresh error:', error);
            throw error;
        }
    }

    async bulkTrack(trackingNumbers) {
        console.log(`[TrackingService] 📦 Bulk tracking ${trackingNumbers.length} items`);
        
        const results = [];
        const errors = [];
        
        for (const item of trackingNumbers) {
            try {
                const result = await this.track(
                    item.trackingNumber || item.number,
                    item.trackingType || item.type || 'auto'
                );
                results.push(result);
            } catch (error) {
                errors.push({
                    trackingNumber: item.trackingNumber || item.number,
                    error: error.message
                });
            }
            
            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        return {
            success: errors.length === 0,
            results,
            errors,
            summary: {
                total: trackingNumbers.length,
                successful: results.length,
                failed: errors.length
            }
        };
    }
}

// Singleton instance
const trackingService = new TrackingService();

// Export for ES6 modules
export default trackingService;

// Also attach to window for backward compatibility
if (typeof window !== 'undefined') {
    window.trackingService = trackingService;
}