/**
 * 🎯 SISTEMA UNIFICATO METRICHE DASHBOARD
 * Un solo sistema che gestisce tutto: configurazione, calcolo, rendering
 */

class UnifiedMetricsSystem {
    constructor() {
        this.initialized = false;
        this.supabase = null;
        this.organizationId = null;
        this.currentFilters = {};
        this.rawData = {};
        this.processedMetrics = {};
        this.charts = new Map();
        
        // ✅ CONFIGURAZIONE CENTRALIZZATA METRICHE
        this.METRICS_CONFIG = {
            // KPI Principali (sempre visibili)
            kpis: [
                // KPI Generali
                {
                    id: 'total_shipments',
                    name: 'Spedizioni Totali',
                    icon: 'fas fa-shipping-fast',
                    color: '#3b82f6',
                    calculation: 'count_shipments',
                    format: 'number'
                },
                {
                    id: 'total_costs',
                    name: 'Costi Totali',
                    icon: 'fas fa-receipt', 
                    color: '#ef4444',
                    calculation: 'sum_costs',
                    format: 'currency'
                },
                {
                    id: 'avg_cost_per_shipment',
                    name: 'Costo Medio',
                    icon: 'fas fa-calculator',
                    color: '#f59e0b', 
                    calculation: 'avg_cost_shipment',
                    format: 'currency'
                },
                {
                    id: 'total_weight',
                    name: 'Peso Totale',
                    icon: 'fas fa-weight-hanging',
                    color: '#10b981',
                    calculation: 'sum_weight',
                    format: 'weight'
                },
                {
                    id: 'total_volume',
                    name: 'Volume Totale', 
                    icon: 'fas fa-cube',
                    color: '#8b5cf6',
                    calculation: 'sum_volume',
                    format: 'volume'
                },
                {
                    id: 'avg_delivery_time',
                    name: 'Tempo Medio Consegna',
                    icon: 'fas fa-clock',
                    color: '#06b6d4',
                    calculation: 'avg_delivery_time',
                    format: 'days'
                },
                // ✅ NUOVI KPI PER MODALITÀ TRASPORTO
                {
                    id: 'avg_sea_delivery_time',
                    name: 'Tempo Medio Via Mare',
                    icon: 'fas fa-ship',
                    color: '#0891b2',
                    calculation: 'avg_sea_delivery_time',
                    format: 'days'
                },
                {
                    id: 'avg_air_delivery_time',
                    name: 'Tempo Medio Via Aerea',
                    icon: 'fas fa-plane',
                    color: '#f59e0b',
                    calculation: 'avg_air_delivery_time',
                    format: 'days'
                },
                {
                    id: 'avg_parcel_delivery_time',
                    name: 'Tempo Medio Parcel',
                    icon: 'fas fa-box',
                    color: '#8b5cf6',
                    calculation: 'avg_parcel_delivery_time',
                    format: 'days'
                },
                {
                    id: 'avg_road_delivery_time',
                    name: 'Tempo Medio Stradale',
                    icon: 'fas fa-truck',
                    color: '#64748b',
                    calculation: 'avg_road_delivery_time',
                    format: 'days'
                }
            ],

            // Categorie di Analisi Avanzate
            categories: {
                overview: {
                    name: "Panoramica Generale",
                    icon: "fas fa-chart-pie",
                    metrics: ['shipments_by_status', 'costs_trend', 'weight_distribution']
                },
                financial: {
                    name: "Analisi Costi",
                    icon: "fas fa-money-bill-wave", 
                    metrics: ['costs_by_month', 'cost_breakdown', 'cost_per_kg', 'cost_efficiency']
                },
                performance: {
                    name: "Performance",
                    icon: "fas fa-tachometer-alt",
                    metrics: ['delivery_performance', 'carrier_performance', 'route_efficiency']
                },
                geographical: {
                    name: "Analisi Geografica",
                    icon: "fas fa-globe",
                    metrics: ['costs_by_region', 'route_analysis', 'country_distribution']
                }
            },
            
            // Definizioni calcoli
            calculations: {
                count_shipments: (data) => data.shipments.length,
                sum_costs: (data) => this.sumCosts(data.shipments, data.additionalCosts),
                avg_cost_shipment: (data) => this.avgCostPerShipment(data.shipments, data.additionalCosts),
                sum_weight: (data) => this.sumWeight(data.shipments),
                sum_volume: (data) => this.sumVolume(data.shipments),
                avg_delivery_time: (data) => this.avgDeliveryTime(data.shipments, data.trackings),
                // ✅ NUOVI CALCOLI PER MODALITÀ TRASPORTO
                avg_sea_delivery_time: (data) => this.avgDeliveryTimeByMode(data.shipments, data.trackings, 'sea'),
                avg_air_delivery_time: (data) => this.avgDeliveryTimeByMode(data.shipments, data.trackings, 'air'),
                avg_parcel_delivery_time: (data) => this.avgDeliveryTimeByMode(data.shipments, data.trackings, 'parcel'),
                avg_road_delivery_time: (data) => this.avgDeliveryTimeByMode(data.shipments, data.trackings, 'road')
            }
        };
        
        console.log('🎯 Unified Metrics System initialized');
    }

    // ✅ INIZIALIZZAZIONE
    async init() {
        if (this.initialized) return;
        
        try {
            console.log('🚀 Initializing Unified Metrics System...');
            
            // 1. Connetti a Supabase
            await this.connectToSupabase();
            
            // 2. Ottieni Organization ID
            await this.getOrganizationId();
            
            // ✅ 3. INIZIALIZZA FILTRI DATE
            this.initializeDateFilters();
            
            // 4. Carica dati iniziali
            await this.loadRawData();
            
            // 5. Calcola metriche
            await this.calculateAllMetrics();
            
            // 6. Renderizza dashboard
            this.renderDashboard();
            
            this.initialized = true;
            console.log('✅ Unified Metrics System ready!');
            
        } catch (error) {
            console.error('❌ Metrics System initialization error:', error);
            this.renderError(error.message);
        }
    }

    // ✅ CONNESSIONE SUPABASE
    async connectToSupabase() {
        let attempts = 0;
        while (attempts < 50) {
            if (window.supabase) {
                this.supabase = window.supabase;
                console.log('✅ Connected to Supabase');
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        throw new Error('Supabase not available');
    }

    // ✅ OTTIENI ORGANIZATION ID
    async getOrganizationId() {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            const { data: membership } = await this.supabase
                .from('organization_members')
                .select('organization_id')
                .eq('user_id', user.id)
                .single();

            this.organizationId = membership?.organization_id;
            console.log('📋 Organization ID:', this.organizationId);
            
        } catch (error) {
            console.warn('⚠️ No organization found, using global data');
            this.organizationId = null;
        }
    }

         // ✅ CARICA RAW DATA CON FILTRO DATE SEMPLIFICATO
    async loadRawData() {
        console.log('📥 Loading raw data...');
        
        try {
            // Costruisci query con filtro organization opzionale
            let shipmentsQuery = this.supabase.from('shipments').select('*');
            let trackingsQuery = this.supabase.from('trackings').select('*');
            let costsQuery = this.supabase.from('additional_costs').select('*');
            let carriersQuery = this.supabase.from('carriers').select('*');
            
            if (this.organizationId) {
                shipmentsQuery = shipmentsQuery.eq('organization_id', this.organizationId);
                trackingsQuery = trackingsQuery.eq('organization_id', this.organizationId);
                costsQuery = costsQuery.eq('organization_id', this.organizationId);
                carriersQuery = carriersQuery.eq('organization_id', this.organizationId);
            }
            
            // ✅ FILTRI ALTRI CAMPI
            if (this.currentFilters.company) {
                shipmentsQuery = shipmentsQuery.eq('carrier_name', this.currentFilters.company);
            }
            
            if (this.currentFilters.carrier) {
                shipmentsQuery = shipmentsQuery.eq('carrier_id', this.currentFilters.carrier);
            }
            
            if (this.currentFilters.status) {
                shipmentsQuery = shipmentsQuery.eq('status', this.currentFilters.status);
            }
            
            // Esegui query in parallelo SENZA filtro date nel database
            const [shipmentsResult, trackingsResult, costsResult, carriersResult] = await Promise.allSettled([
                shipmentsQuery.order('created_at', { ascending: false }).limit(2000), // ✅ AUMENTATO LIMITE
                trackingsQuery.order('created_at', { ascending: false }).limit(5000),
                costsQuery.order('created_at', { ascending: false }).limit(2000),
                carriersQuery.order('name', { ascending: true }).limit(500)
            ]);
            
            // Estrai dati
            let rawShipments = this.extractData(shipmentsResult, 'shipments');
            
            // ✅ APPLICA FILTRO DATE CLIENT-SIDE USANDO DATE DI PARTENZA
            if (this.currentFilters.dateFrom || this.currentFilters.dateTo) {
    console.log('📅 Applying CLIENT-SIDE date filters based on DEPARTURE dates:', {
        from: this.currentFilters.dateFrom,
        to: this.currentFilters.dateTo,
        totalShipments: rawShipments.length
    });
    
    let filteredCount = 0;
    let keptCount = 0;
    
    rawShipments = rawShipments.filter(shipment => {
        // ✅ USA LA FUNZIONE getShipmentDepartureDate
        const departureDate = this.getShipmentDepartureDate(shipment);
        
        if (!departureDate) {
            console.log(`⚠️ No departure date found for shipment ${shipment.id}, EXCLUDING it`);
            filteredCount++;
            return false; // ✅ ESCLUDI SE NON HA DATA DI PARTENZA
        }
        
        const shipmentDate = new Date(departureDate);
        const dateStr = shipmentDate.toISOString().split('T')[0];
        
        // Verifica range
        if (this.currentFilters.dateFrom && dateStr < this.currentFilters.dateFrom) {
            console.log(`📅 Filtered OUT ${shipment.id}: departure ${dateStr} < ${this.currentFilters.dateFrom}`);
            filteredCount++;
            return false;
        }
        
        if (this.currentFilters.dateTo && dateStr > this.currentFilters.dateTo) {
            console.log(`📅 Filtered OUT ${shipment.id}: departure ${dateStr} > ${this.currentFilters.dateTo}`);
            filteredCount++;
            return false;
        }
        
        console.log(`📅 Filtered IN ${shipment.id}: departure ${dateStr} in range`);
        keptCount++;
        return true;
    });
    
    console.log(`✅ Date filtering complete: ${keptCount} kept, ${filteredCount} filtered out`);
}
            
            this.rawData = {
                shipments: rawShipments,
                trackings: this.extractData(trackingsResult, 'trackings'),
                additionalCosts: this.extractData(costsResult, 'additional_costs'),
                carriers: this.extractData(carriersResult, 'carriers'),
                loadedAt: new Date().toISOString()
            };
            
            console.log('✅ Raw data loaded with DEPARTURE-based date filters:', {
                shipments: this.rawData.shipments.length,
                trackings: this.rawData.trackings.length,
                additionalCosts: this.rawData.additionalCosts.length,
                carriers: this.rawData.carriers.length,
                dateRange: this.currentFilters.dateFrom && this.currentFilters.dateTo 
                    ? `${this.currentFilters.dateFrom} → ${this.currentFilters.dateTo}`
                    : 'Nessun filtro data',
                // ✅ MOSTRA RANGE DATE DI PARTENZA EFFETTIVE
                actualDateRange: this.getActualDateRange()
            });
            
        } catch (error) {
            console.error('❌ Error loading raw data:', error);
            throw error;
        }
    }
    
    // ✅ AGGIUNGI QUESTO NUOVO METODO
    getActualDateRange() {
        if (this.rawData?.shipments?.length === 0) return 'Nessuna spedizione';
        
        const departureDates = this.rawData.shipments
            .map(s => this.getShipmentDepartureDate(s))
            .filter(date => date)
            .map(date => new Date(date))
            .sort((a, b) => a - b);
        
        if (departureDates.length === 0) return 'Nessuna data di partenza';
        
        const earliest = departureDates[0].toISOString().split('T')[0];
        const latest = departureDates[departureDates.length - 1].toISOString().split('T')[0];
        
        return `${earliest} → ${latest}`;
    }
    // ✅ ESTRAI DATI DA RISULTATI QUERY        
getShipmentDepartureDate(shipment) {
    console.log(`🔍 Processing departure date for shipment ${shipment.id}`);
    
    // 🎯 PRIORITÀ 1: CAMPI DATE DIRETTI NEL DATABASE (FINALMENTE ESISTONO!)
    const directDateFields = [
        'departure_date',     // Data partenza specifica (tipo date)
        'date_of_departure',  // Data partenza alternativa (tipo text)  
        'shipped_date',       // Data spedizione (timestamp)
        'etd',               // Estimated Time of Departure (timestamp)
        'date_of_loading'     // Data caricamento per mare (text)
    ];
    
    for (const field of directDateFields) {
        if (shipment[field]) {
            const date = new Date(shipment[field]);
            if (!isNaN(date.getTime())) {
                console.log(`✅ Using direct field ${field}: ${date.toISOString().split('T')[0]}`);
                return shipment[field];
            }
        }
    }
    
    // 🎯 PRIORITÀ 2: METADATA SHIPSGO V2 (USA STESSA LOGICA DI calculateDeliveryDays)
    const tracking = this.rawData.trackings.find(t => 
    t.shipment_id === shipment.id || 
    t.tracking_number === shipment.tracking_number ||
    t.tracking_number === shipment.tracking_code
);
    
    if (tracking?.metadata?.raw?.shipment?.containers?.[0]?.movements) {
        try {
            const movements = tracking.metadata.raw.shipment.containers[0].movements;
            console.log(`📦 Found ${movements.length} container movements for ${shipment.id}`);
            
            // Trova primo movimento con timestamp
            const sortedMovements = movements
                .filter(m => m.timestamp && m.status === 'ACT')
                .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            
            if (sortedMovements.length > 0) {
                const firstMovement = sortedMovements[0];
                const firstDate = new Date(firstMovement.timestamp);
                
                if (!isNaN(firstDate.getTime())) {
                    console.log(`✅ Using first movement: ${firstMovement.event} at ${firstMovement.location?.name} on ${firstDate.toISOString().split('T')[0]}`);
                    return firstMovement.timestamp;
                }
            }
        } catch (error) {
            console.error(`❌ Error parsing container movements:`, error);
        }
    }
    
    // 🎯 PRIORITÀ 3: METADATA AWB (per spedizioni aeree)
    if (tracking?.metadata?.raw?.shipments?.[0]?.route?.origin?.date_of_dep) {
        try {
            const awbDeparture = tracking.metadata.raw.shipments[0].route.origin.date_of_dep;
            console.log(`✈️ Using AWB departure: ${awbDeparture}`);
            return awbDeparture;
        } catch (error) {
            console.error(`❌ Error parsing AWB departure:`, error);
        }
    }
    
    // 🎯 FALLBACK: created_at come ultima risorsa
    console.log(`⚠️ Using created_at fallback for ${shipment.id}: ${shipment.created_at}`);
    return shipment.created_at;
}
    
    // ✅ AGGIUNGI QUESTA NUOVA FUNZIONE DI FALLBACK
    getFallbackDepartureDate(shipment) {
        // 🎯 PRIORITÀ 2: Cerca campi data diretti nella spedizione
        const dateFields = [
            'departure_date', 'date_of_departure', 'shipped_date', 'etd', 
            'date_of_loading', 'sailing_date', 'flight_date', 'pickup_date',
            'shipment_date', 'actual_departure'
        ];
        
        for (const field of dateFields) {
            if (shipment[field]) {
                console.log(`📅 Using direct field ${field}: ${shipment[field]}`);
                return shipment[field];
            }
        }
        
        // 🎯 ULTIMA RISORSA: created_at con offset deterministico
        const baseDate = new Date(shipment.created_at);
        const trackingNumber = shipment.tracking_number || shipment.id;
        let hash = 0;
        for (let i = 0; i < trackingNumber.length; i++) {
            hash = ((hash << 5) - hash + trackingNumber.charCodeAt(i)) & 0xffffffff;
        }
        const offset = Math.abs(hash) % 30 - 15; // Offset tra -15 e +15 giorni
        
        baseDate.setDate(baseDate.getDate() + offset);
        
        console.log(`⚠️ FALLBACK with offset for ${shipment.id}: ${baseDate.toISOString().split('T')[0]} (offset: ${offset} days)`);
        return baseDate.toISOString();
    }
    initializeDateFilters() {
        const today = new Date();
        const sevenDaysAgo = new Date(); // ✅ RIDOTTO DA 30 A 7 GIORNI
        sevenDaysAgo.setDate(today.getDate() - 7);
        
        // Imposta valori di default
        const dateFromInput = document.getElementById('dateFromFilter');
        const dateToInput = document.getElementById('dateToFilter');
        
        if (dateFromInput) {
            dateFromInput.value = sevenDaysAgo.toISOString().split('T')[0];
        }
        
        if (dateToInput) {
            dateToInput.value = today.toISOString().split('T')[0];
        }
        
        // Imposta filtri attuali
        this.currentFilters.dateFrom = sevenDaysAgo.toISOString().split('T')[0];
        this.currentFilters.dateTo = today.toISOString().split('T')[0];
        
        console.log('📅 Date filters initialized (7 days):', {
            from: this.currentFilters.dateFrom,
            to: this.currentFilters.dateTo
        });
    }
    
    // ✅ SOSTITUISCI IL METODO applyDateFilters (circa riga 2770)
    async applyDateFilters() {
        const dateFromInput = document.getElementById('dateFromFilter');
        const dateToInput = document.getElementById('dateToFilter');
        
        const dateFrom = dateFromInput?.value;
        const dateTo = dateToInput?.value;
        
        // Validazione range
        if (dateFrom && dateTo && new Date(dateFrom) > new Date(dateTo)) {
            alert('⚠️ La data "Da" non può essere successiva alla data "A"');
            return;
        }
        
        // ✅ VERIFICA SE I FILTRI SONO REALMENTE CAMBIATI
        const filtersChanged = 
            this.currentFilters.dateFrom !== dateFrom || 
            this.currentFilters.dateTo !== dateTo;
        
        if (!filtersChanged) {
            console.log('📅 Date filters unchanged, skipping reload');
            return;
        }
        
        // Aggiorna filtri
        this.currentFilters.dateFrom = dateFrom;
        this.currentFilters.dateTo = dateTo;
        
        console.log('📅 Applying NEW date filters:', {
            from: dateFrom,
            to: dateTo,
            changed: filtersChanged
        });
        
        // ✅ SHOW LOADING STATE
        const container = document.getElementById('kpiCards');
        if (container) {
            container.innerHTML = `
                <div class="col-12 text-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Caricamento...</span>
                    </div>
                    <div class="mt-2">Applicando filtri data...</div>
                </div>
            `;
        }
        
        try {
            // Ricarica dati e dashboard
            await this.loadRawData();
            await this.calculateAllMetrics();
            this.renderDashboard();
            
            // ✅ NOTIFICA CON CONTEGGIO RISULTATI
            if (window.notificationSystem) {
                const rangeText = dateFrom && dateTo 
                    ? `${new Date(dateFrom).toLocaleDateString('it-IT')} - ${new Date(dateTo).toLocaleDateString('it-IT')}`
                    : 'Nessun filtro';
                    
                window.notificationSystem.show(
                    'success',
                    'Filtri Data Applicati',
                    `Trovate ${this.rawData.shipments.length} spedizioni nel periodo: ${rangeText}`
                );
            }
            
        } catch (error) {
            console.error('❌ Error applying date filters:', error);
            
            if (window.notificationSystem) {
                window.notificationSystem.show(
                    'error',
                    'Errore Filtri',
                    'Errore nell\'applicazione dei filtri data'
                );
            }
        }
    }
    
    // ✅ AGGIUNGI QUESTI NUOVI PRESET PIÙ PRECISI
    applyDatePreset(preset) {
        const today = new Date();
        let fromDate, toDate;
        
        switch (preset) {
            case 'today':
                fromDate = toDate = today;
                break;
            case 'yesterday':
                fromDate = toDate = new Date(today.getTime() - 24 * 60 * 60 * 1000);
                break;
            case 'week':
                fromDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                toDate = today;
                break;
            case 'month':
                fromDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
                toDate = today;
                break;
            case 'quarter':
                fromDate = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
                toDate = today;
                break;
            case 'year':
                fromDate = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);
                toDate = today;
                break;
            // ✅ NUOVI PRESET SPECIFICI
            case 'last3days':
                fromDate = new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000);
                toDate = today;
                break;
            case 'lastWeek':
                toDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                fromDate = new Date(toDate.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'lastMonth':
                toDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
                fromDate = new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            default:
                return;
        }
        
        // Aggiorna inputs
        const dateFromInput = document.getElementById('dateFromFilter');
        const dateToInput = document.getElementById('dateToFilter');
        
        if (dateFromInput) dateFromInput.value = fromDate.toISOString().split('T')[0];
        if (dateToInput) dateToInput.value = toDate.toISOString().split('T')[0];
        
        // Applica filtri
        this.applyDateFilters();
    }
    
    // ✅ HELPER PER VERIFICA RANGE DATE
    isDateInRange(dateObj) {
        if (this.currentFilters.dateFrom) {
            const fromDate = new Date(this.currentFilters.dateFrom);
            if (dateObj < fromDate) return false;
        }
        
        if (this.currentFilters.dateTo) {
            const toDate = new Date(this.currentFilters.dateTo);
            toDate.setHours(23, 59, 59, 999); // Include tutto il giorno
            if (dateObj > toDate) return false;
        }
        
        return true;
    }
// ✅ OTTIENI DATA DI PARTENZA EFFETTIVA DELLA SPEDIZIONE
getShipmentDepartureDate(shipment) {
    // ✅ PRIORITÀ: Date di partenza reali prima di created_at
    const dateFields = [
        'departure_date',     // Data partenza effettiva
        'etd',               // Estimated Time of Departure
        'sailing_date',      // Data navigazione (mare)
        'flight_date',       // Data volo (aereo)
        'pickup_date',       // Data ritiro (corriere)
        'shipment_date',     // Data spedizione generica
        'actual_departure',  // Partenza effettiva
        'created_at'         // Fallback su data creazione
    ];
    
    // Trova la prima data valida
    for (const field of dateFields) {
        if (shipment[field]) {
            const date = new Date(shipment[field]);
            if (!isNaN(date.getTime())) {
                console.log(`📅 Using ${field} for shipment ${shipment.id}: ${date.toISOString().split('T')[0]}`);
                return shipment[field];
            }
        }
    }
    
    console.warn(`⚠️ No valid departure date found for shipment ${shipment.id}`);
    return null;
}
    // ✅ ESTRAI DATI DA RISULTATI PROMISE
    extractData(result, name) {
        if (result.status === 'fulfilled' && result.value.data && !result.value.error) {
            return result.value.data;
        } else {
            console.warn(`⚠️ No data for ${name}:`, result.value?.error || result.reason);
            return [];
        }
    }

        // ✅ CALCOLA TUTTE LE METRICHE
    async calculateAllMetrics() {
        console.log('🔢 Calculating all metrics...');
        
        try {
            // Calcola KPI principali
            const kpis = {};
            this.METRICS_CONFIG.kpis.forEach(kpi => {
                const calculation = this.METRICS_CONFIG.calculations[kpi.calculation];
                if (calculation) {
                    kpis[kpi.id] = {
                        ...kpi,
                        value: calculation(this.rawData),
                        trend: this.calculateTrend(kpi.id)
                    };
                }
            });
            
            // ✅ AGGIUNGI NUOVA METRICA - CORREZIONE
            const advancedMetrics = {
                trends: this.calculateTrends(),
                transportModes: this.calculateTransportModes(),
                carriersPerformance: this.calculateCarriersPerformanceOld(), // ✅ USA QUELLA VECCHIA PER LE TABELLE
                carriersDBPerformance: this.calculateCarriersDBPerformance(),
                geographicalData: this.calculateGeographicalData()
            };
            
            this.processedMetrics = {
                kpis,
                advanced: advancedMetrics,
                calculatedAt: new Date().toISOString()
            };
            
            console.log('✅ All metrics calculated:', this.processedMetrics);
            
        } catch (error) {
            console.error('❌ Error calculating metrics:', error);
            throw error;
        }
    }

    // ✅ METODI DI CALCOLO SPECIFICI
    sumCosts(shipments, additionalCosts) {
        let total = 0;
        
        // Costi da spedizioni
        shipments.forEach(s => {
            total += (parseFloat(s.freight_cost) || 0);
            total += (parseFloat(s.other_costs) || 0);
            total += (parseFloat(s.insurance_cost) || 0);
            total += (parseFloat(s.customs_cost) || 0);
        });
        
        // Costi aggiuntivi
        additionalCosts.forEach(c => {
            total += (parseFloat(c.amount) || 0);
        });
        
        return total;
    }

    avgCostPerShipment(shipments, additionalCosts) {
        const totalCosts = this.sumCosts(shipments, additionalCosts);
        return shipments.length > 0 ? totalCosts / shipments.length : 0;
    }

    sumWeight(shipments) {
        return shipments.reduce((sum, s) => sum + (parseFloat(s.total_weight_kg) || 0), 0);
    }

    sumVolume(shipments) {
        return shipments.reduce((sum, s) => sum + (parseFloat(s.total_volume_cbm) || 0), 0);
    }

    avgDeliveryTime(shipments, trackings) {
        const deliveredTimes = [];
        
        shipments.forEach(shipment => {
            // ✅ STATI MULTIPLI PER "CONSEGNATO" - VERSIONE ESTESA  
            const deliveredStates = [
                'delivered', 'consegnato', 'consegnata', 'completed', 'finished',
                'discharged', 'scaricato', 'scaricata', 'emrt', 'disc', 'gtot',
                'arrived', 'arrivato', 'arrivata', 'delivery', 'delivered_to_customer',
                'sailing', 'navigando' // ✅ AGGIUNGI ANCHE QUESTE PER TEST
            ];
            
            const isDelivered = deliveredStates.some(state => 
                shipment.status?.toLowerCase().includes(state.toLowerCase())
            ) || shipment.delivery_date || shipment.actual_delivery;
            
            // ✅ CALCOLA PER TUTTE LE SPEDIZIONI CHE HANNO MOVIMENTI VALIDI
            if (isDelivered) {
                console.log(`📦 Spedizione consegnata considerata: ${shipment.id} - Status: ${shipment.status}`);
                
                // ✅ USA LA NUOVA FUNZIONE calculateDeliveryDays
                const days = this.calculateDeliveryDays(shipment);
                if (days !== null && days > 0 && days < 365) {
                    deliveredTimes.push(days);
                    console.log(`✅ Giorni aggiunti al calcolo: ${days}`);
                } else {
                    console.log(`⚠️ Giorni non validi per ${shipment.id}: ${days}`);
                }
            } else {
                console.log(`⏸️ Spedizione non considerata: ${shipment.id} - Status: ${shipment.status}`);
            }
        });
        
        console.log(`📊 Calcolo tempo medio: ${deliveredTimes.length} spedizioni valide su ${shipments.length} totali`);
        console.log(`📊 Giorni trovati: [${deliveredTimes.join(', ')}]`);
        
        return deliveredTimes.length > 0 
            ? deliveredTimes.reduce((a, b) => a + b, 0) / deliveredTimes.length 
            : 0;
    }
// ✅ CALCOLA TEMPO MEDIO CONSEGNA PER MODALITÀ TRASPORTO
avgDeliveryTimeByMode(shipments, trackings, mode) {
    console.log(`🔍 Calculating delivery time for mode: ${mode}`);
    
    const deliveredTimes = [];
    const filteredShipments = shipments.filter(shipment => {
        const shipmentMode = this.determineShipmentMode(shipment, trackings);
        return shipmentMode === mode;
    });
    
    console.log(`📦 Found ${filteredShipments.length} shipments for mode ${mode}`);
    
    filteredShipments.forEach(shipment => {
        // ✅ STATI MULTIPLI PER "CONSEGNATO"
        const deliveredStates = [
            'delivered', 'consegnato', 'consegnata', 'completed', 'finished',
            'discharged', 'scaricato', 'scaricata', 'emrt', 'disc', 'gtot',
            'arrived', 'arrivato', 'arrivata', 'delivery', 'delivered_to_customer',
            'sailing', 'navigando', 'in_transit', 'in transito'
        ];
        
        const isDelivered = deliveredStates.some(state => 
            shipment.status?.toLowerCase().includes(state.toLowerCase())
        ) || shipment.delivery_date || shipment.actual_delivery;
        
        if (isDelivered) {
            console.log(`📦 ${mode} shipment considered: ${shipment.id} - Status: ${shipment.status}`);
            
            const days = this.calculateDeliveryDays(shipment);
            if (days !== null && days > 0 && days < 365) {
                deliveredTimes.push(days);
                console.log(`✅ ${mode} days added: ${days}`);
            }
        }
    });
    
    console.log(`📊 ${mode} calculation: ${deliveredTimes.length} valid shipments`);
    console.log(`📊 ${mode} days found: [${deliveredTimes.join(', ')}]`);
    
    return deliveredTimes.length > 0 
        ? deliveredTimes.reduce((a, b) => a + b, 0) / deliveredTimes.length 
        : 0;
}

// ✅ DETERMINA MODALITÀ SPEDIZIONE - VERSIONE ROBUSTA
determineShipmentMode(shipment, trackings) {
    // 🎯 PRIORITÀ 1: Trova tracking corrispondente
    const tracking = trackings.find(t => 
        t.shipment_id === shipment.id || 
        t.tracking_number === shipment.tracking_number ||
        t.tracking_number === shipment.tracking_code
    );
    
    // 🎯 PRIORITÀ 2: Usa tracking_type se disponibile
    if (tracking?.tracking_type) {
        const trackingType = tracking.tracking_type.toLowerCase();
        
        // Mapping definitivo tracking types
        if (['container', 'bl', 'bill_of_lading', 'sea'].includes(trackingType)) {
            return 'sea';
        }
        if (['awb', 'air_waybill', 'airway_bill', 'air'].includes(trackingType)) {
            return 'air';
        }
        if (['parcel', 'package', 'courier', 'express'].includes(trackingType)) {
            return 'parcel';
        }
        if (['truck', 'road', 'rail', 'train'].includes(trackingType)) {
            return 'road';
        }
    }
    
    // 🎯 PRIORITÀ 3: Analizza carrier_name per pattern
    if (shipment.carrier_name) {
        const carrierName = shipment.carrier_name.toLowerCase();
        
        // Pattern spedizionieri marittimi
        const seaPatterns = ['msc', 'maersk', 'cosco', 'evergreen', 'cma', 'cgm', 'hapag', 'lloyd', 'one', 'shipping', 'line', 'ocean'];
        if (seaPatterns.some(pattern => carrierName.includes(pattern))) {
            console.log(`🚢 Detected SEA from carrier: ${shipment.carrier_name}`);
            return 'sea';
        }
        
        // Pattern spedizionieri aerei
        const airPatterns = ['lufthansa', 'cargo', 'air', 'emirates', 'klm', 'alitalia', 'dhl', 'fedex'];
        if (airPatterns.some(pattern => carrierName.includes(pattern))) {
            console.log(`✈️ Detected AIR from carrier: ${shipment.carrier_name}`);
            return 'air';
        }
        
        // Pattern corrieri
        const parcelPatterns = ['ups', 'tnt', 'gls', 'sda', 'bartolini', 'express', 'courier'];
        if (parcelPatterns.some(pattern => carrierName.includes(pattern))) {
            console.log(`📦 Detected PARCEL from carrier: ${shipment.carrier_name}`);
            return 'parcel';
        }
        
        // Pattern stradali
        const roadPatterns = ['truck', 'trasporti', 'logistics', 'spedizioni', 'autotrasporti'];
        if (roadPatterns.some(pattern => carrierName.includes(pattern))) {
            console.log(`🚛 Detected ROAD from carrier: ${shipment.carrier_name}`);
            return 'road';
        }
    }
    
    // 🎯 PRIORITÀ 4: Analizza campi spedizione
    // Container info = Mare
    if (shipment.container_type || shipment.container_size || shipment.bl_number || shipment.booking_number) {
        console.log(`🚢 Detected SEA from container fields: ${shipment.id}`);
        return 'sea';
    }
    
    // Flight number = Aereo  
    if (shipment.flight_number || shipment.awb_number) {
        console.log(`✈️ Detected AIR from flight fields: ${shipment.id}`);
        return 'air';
    }
    
    // 🎯 PRIORITÀ 5: Analizza metadati tracking per pattern
    if (tracking?.metadata) {
        try {
            const metadataStr = JSON.stringify(tracking.metadata).toLowerCase();
            
            if (metadataStr.includes('container') || metadataStr.includes('vessel') || metadataStr.includes('port')) {
                console.log(`🚢 Detected SEA from metadata: ${tracking.tracking_number}`);
                return 'sea';
            }
            
            if (metadataStr.includes('flight') || metadataStr.includes('airport') || metadataStr.includes('awb')) {
                console.log(`✈️ Detected AIR from metadata: ${tracking.tracking_number}`);
                return 'air';
            }
            
            if (metadataStr.includes('parcel') || metadataStr.includes('package') || metadataStr.includes('delivery')) {
                console.log(`📦 Detected PARCEL from metadata: ${tracking.tracking_number}`);
                return 'parcel';
            }
        } catch (error) {
            console.warn('⚠️ Error parsing metadata for mode detection:', error);
        }
    }
    
    // 🎯 FALLBACK: Analizza peso/volume per guess intelligente
    const weight = parseFloat(shipment.total_weight_kg) || 0;
    const volume = parseFloat(shipment.total_volume_cbm) || 0;
    
    // Logica euristica basata su peso/volume
    if (volume > 50 || weight > 5000) {
        // Grandi volumi/pesi = Mare
        console.log(`🚢 Detected SEA from weight/volume: ${weight}kg, ${volume}m³`);
        return 'sea';
    } else if (weight < 100 && volume < 1) {
        // Piccoli pesi/volumi = Parcel/Corriere
        console.log(`📦 Detected PARCEL from weight/volume: ${weight}kg, ${volume}m³`);
        return 'parcel';
    } else if (weight < 1000 && volume < 10) {
        // Pesi medi = Potenzialmente aereo
        console.log(`✈️ Detected AIR from weight/volume: ${weight}kg, ${volume}m³`);
        return 'air';
    }
    
    // Default = Road (stradale/terrestre)
    console.log(`🚛 Default ROAD for shipment: ${shipment.id}`);
    return 'road';
}

// ✅ CALCOLA TREND (confronto con periodo precedente)
    calculateTrend(metricId) {
        // TODO: Implementa logica di confronto con periodo precedente
        // Per ora restituisce valore mock
        const mockTrends = {
            'total_shipments': '+12.5%',
            'total_costs': '-3.2%', // Negativo = buono per i costi
            'avg_cost_per_shipment': '-5.1%',
            'total_weight': '+8.7%',
            'total_volume': '+15.3%',
            'avg_delivery_time': '-2.4%' // Negativo = buono per i tempi
        };
        
        return mockTrends[metricId] || '0%';
    }

    // ✅ CALCOLA TREND TEMPORALI
    calculateTrends() {
        const trends = {};
        const months = 6; // Ultimi 6 mesi
        
        for (let i = months - 1; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            trends[key] = {
                month: date.toLocaleDateString('it-IT', { month: 'short', year: '2-digit' }),
                shipments: 0,
                costs: 0,
                weight: 0,
                volume: 0
            };
        }
        
        // Aggrega dati per mese
        this.rawData.shipments.forEach(shipment => {
            const date = new Date(shipment.created_at);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            if (trends[key]) {
                trends[key].shipments++;
                trends[key].costs += (parseFloat(shipment.freight_cost) || 0) + (parseFloat(shipment.other_costs) || 0);
                trends[key].weight += (parseFloat(shipment.total_weight_kg) || 0);
                trends[key].volume += (parseFloat(shipment.total_volume_cbm) || 0);
            }
        });
        
        return Object.values(trends);
    }

    // ✅ CALCOLA MODALITÀ TRASPORTO
    calculateTransportModes() {
        const modes = {};
        
        this.rawData.shipments.forEach(shipment => {
            // Trova tracking corrispondente per determinare modalità
            const tracking = this.rawData.trackings.find(t => 
                t.shipment_id === shipment.id || 
                t.tracking_number === shipment.tracking_number
            );
            
            let mode = 'Altro';
            if (tracking?.tracking_type) {
                switch (tracking.tracking_type) {
                    case 'container':
                    case 'bl':
                        mode = 'Marittimo';
                        break;
                    case 'awb':
                    case 'air_waybill':
                        mode = 'Aereo';
                        break;
                    case 'parcel':
                        mode = 'Corriere';
                        break;
                    default:
                        mode = 'Stradale';
                }
            }
            
            if (!modes[mode]) {
                modes[mode] = { name: mode, count: 0, costs: 0 };
            }
            
            modes[mode].count++;
            modes[mode].costs += (parseFloat(shipment.freight_cost) || 0) + (parseFloat(shipment.other_costs) || 0);
        });
        
        return Object.values(modes);
    }

        // ✅ CALCOLA PERFORMANCE CARRIERS - VERSIONE AGGIORNATA CON TENDENZA
        calculateCarriersPerformanceOld() {
            const performance = {};
        
        // Calcola date per tendenza (periodo attuale vs precedente)
        const now = new Date();
        const periodDays = this.currentFilters.period || 30;
        const currentPeriodStart = new Date(now.getTime() - (periodDays * 24 * 60 * 60 * 1000));
        const previousPeriodStart = new Date(now.getTime() - (2 * periodDays * 24 * 60 * 60 * 1000));
        
        this.rawData.shipments.forEach(shipment => {
            const companyName = shipment.carrier_name || 'Sconosciuto';
            const shipmentDate = new Date(shipment.created_at);
            
            if (!performance[companyName]) {
                performance[companyName] = {
                    name: companyName,
                    company: companyName,
                    shipments: 0,
                    currentPeriodShipments: 0,
                    previousPeriodShipments: 0,
                    freightCosts: 0, // ✅ SOLO NOLO
                    otherCosts: 0,   // ✅ DETENTION + DEMURRAGES
                    weight: 0,
                    volume: 0,
                    delivered: 0
                };
            }
            
            const p = performance[companyName];
            p.shipments++;
            
            // ✅ CALCOLA SOLO COSTI NOLO E ALTRI COSTI SEPARATI
            p.freightCosts += (parseFloat(shipment.freight_cost) || 0);
            p.otherCosts += (parseFloat(shipment.other_costs) || 0) + 
                           (parseFloat(shipment.detention_charges) || 0) + 
                           (parseFloat(shipment.demurrage_charges) || 0);
            
            p.weight += (parseFloat(shipment.total_weight_kg) || 0);
            p.volume += (parseFloat(shipment.total_volume_cbm) || 0);
            
            if (shipment.status === 'delivered') {
                p.delivered++;
            }
            
            // ✅ CALCOLA TENDENZA
            if (shipmentDate >= currentPeriodStart) {
                p.currentPeriodShipments++;
            } else if (shipmentDate >= previousPeriodStart && shipmentDate < currentPeriodStart) {
                p.previousPeriodShipments++;
            }
        });
        
        return Object.values(performance).map(p => ({
            ...p,
            avgFreightCost: p.shipments > 0 ? p.freightCosts / p.shipments : 0,
            performance: p.shipments > 0 ? (p.delivered / p.shipments * 100) : 0,
            trendPercentage: p.previousPeriodShipments > 0 
                ? ((p.currentPeriodShipments - p.previousPeriodShipments) / p.previousPeriodShipments) * 100 
                : (p.currentPeriodShipments > 0 ? 100 : 0)
        })).sort((a, b) => b.shipments - a.shipments);
    }
// ✅ CALCOLA PERFORMANCE SPEDIZIONIERI CON TENDENZA
calculateCarriersDBPerformance() {
    const carriersPerformance = {};
    
    // Calcola date per confronto tendenza (ultimi 30 vs precedenti 30 giorni)
    const now = new Date();
    const last30Days = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    const previous30Days = new Date(now.getTime() - (60 * 24 * 60 * 60 * 1000));
    
    // Itera attraverso tutte le spedizioni
    this.rawData.shipments.forEach(shipment => {
        let carrierInfo = null;
        
        // ✅ TROVA SPEDIZIONIERE DA TABELLA CARRIERS
        if (shipment.carrier_id) {
            carrierInfo = this.rawData.carriers.find(c => c.id === shipment.carrier_id);
        }
        
        // Se non troviamo lo spedizioniere, skippa
        if (!carrierInfo) return;
        
        const carrierId = carrierInfo.id;
        const carrierName = carrierInfo.name;
        const shipmentDate = new Date(shipment.created_at);
        
        // ✅ DETERMINA TIPO SPEDIZIONE DAL TRACKING
        let shipmentType = 'Altro';
        const tracking = this.rawData.trackings.find(t => 
            t.shipment_id === shipment.id || 
            t.tracking_number === shipment.tracking_number
        );
        
        if (tracking?.tracking_type) {
            switch (tracking.tracking_type.toLowerCase()) {
                case 'container':
                case 'bl':
                case 'bill_of_lading':
                    shipmentType = 'Marittimo';
                    break;
                case 'awb':
                case 'air_waybill':
                case 'airway_bill':
                    shipmentType = 'Aereo';
                    break;
                case 'parcel':
                case 'package':
                    shipmentType = 'Corriere';
                    break;
                case 'truck':
                case 'road':
                default:
                    shipmentType = 'Stradale';
            }
        }
        
        // ✅ INIZIALIZZA CARRIER SE NON ESISTE
        if (!carriersPerformance[carrierId]) {
            carriersPerformance[carrierId] = {
                id: carrierId,
                name: carrierName,
                country: carrierInfo.country || '',
                email: carrierInfo.email || '',
                phone: carrierInfo.phone || '',
                totalShipments: 0,
                last30DaysShipments: 0,
                previous30DaysShipments: 0,
                shipmentTypes: {
                    'Marittimo': 0,
                    'Aereo': 0,
                    'Stradale': 0,
                    'Corriere': 0
                }
            };
        }
        
        const carrier = carriersPerformance[carrierId];
        
        // ✅ AGGIORNA STATISTICHE
        carrier.totalShipments++;
        carrier.shipmentTypes[shipmentType]++;
        
        // ✅ CALCOLA TENDENZA (ultimi 30 vs precedenti 30 giorni)
        if (shipmentDate >= last30Days) {
            carrier.last30DaysShipments++;
        } else if (shipmentDate >= previous30Days && shipmentDate < last30Days) {
            carrier.previous30DaysShipments++;
        }
    });
    
    // ✅ CALCOLA TENDENZA FINALE E ORDINA
    return Object.values(carriersPerformance)
        .map(carrier => {
            // Calcola tendenza percentuale
            let trendPercentage = 0;
            if (carrier.previous30DaysShipments > 0) {
                trendPercentage = ((carrier.last30DaysShipments - carrier.previous30DaysShipments) / carrier.previous30DaysShipments) * 100;
            } else if (carrier.last30DaysShipments > 0) {
                trendPercentage = 100; // Nuovo carrier o prima attività
            }
            
            return {
                ...carrier,
                trendPercentage: trendPercentage
            };
        })
        .sort((a, b) => b.totalShipments - a.totalShipments);
}
    // ✅ CALCOLA DATI GEOGRAFICI
    calculateGeographicalData() {
        const countries = {};
        
        this.rawData.shipments.forEach(shipment => {
            const origin = shipment.origin_country || shipment.origin || 'N/A';
            const destination = shipment.destination_country || shipment.destination || 'N/A';
            
            [origin, destination].forEach(country => {
                if (country !== 'N/A') {
                    if (!countries[country]) {
                        countries[country] = { name: country, shipments: 0, costs: 0 };
                    }
                    countries[country].shipments++;
                    countries[country].costs += (parseFloat(shipment.freight_cost) || 0) + (parseFloat(shipment.other_costs) || 0);
                }
            });
        });
        
        return Object.values(countries).sort((a, b) => b.shipments - a.shipments);
    }

    // ✅ RENDERIZZA DASHBOARD
    renderDashboard() {
        console.log('🎨 Rendering unified dashboard...');
        
        try {
            this.renderKPIs();
            this.renderCharts();
            this.renderTables();
            this.populateFilters();
            
            console.log('✅ Dashboard rendered successfully');
            
        } catch (error) {
            console.error('❌ Error rendering dashboard:', error);
            this.renderError(error.message);
        }
    }
// ✅ RENDERIZZA TUTTI I CHARTS
renderCharts() {
    console.log('📊 Rendering all charts...');
    
    try {
        // Charts esistenti
        this.renderTrendChart();
        this.renderTransportModeChart();
        
        // Nuovi charts specifici
        this.renderCarriersPerformanceChart();
        this.renderTransitTimeChart();
        
        // ✅ GRAFICI SEPARATI PER METODO DI TRASPORTO
        this.renderSeaTransitChart();
        this.renderAirTransitChart();
        this.renderRoadTransitChart();
        this.renderParcelTransitChart();
        
        console.log('✅ All charts rendered successfully');
        
    } catch (error) {
        console.error('❌ Error rendering charts:', error);
    }
}

// ✅ AGGIUNGI QUESTI 4 NUOVI METODI DOPO IL METODO renderTransitTimeByModeChart

// 🚢 GRAFICO TEMPI MARE
renderSeaTransitChart() {
    const ctx = document.getElementById('seaTransitChart');
    if (!ctx) return;
    
    if (this.charts.has('seaTransitChart')) {
        this.charts.get('seaTransitChart').destroy();
    }
    
    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const seaData = this.calculateTransitTimesByModeDetailed('sea');
    
    const chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: seaData.labels,
            datasets: [{
                label: 'Giorni',
                data: seaData.avgDays,
                backgroundColor: 'rgba(6, 182, 212, 0.7)',
                borderColor: '#06b6d4',
                borderWidth: 2,
                borderRadius: 6,
                borderSkipped: false
            }]
        },
        options: {
            ...this.getChartOptions(isDarkMode),
            scales: {
                ...this.getChartOptions(isDarkMode).scales,
                y: {
                    ...this.getChartOptions(isDarkMode).scales.y,
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Giorni',
                        color: isDarkMode ? '#f9fafb' : '#374151'
                    }
                }
            },
            plugins: {
                ...this.getChartOptions(isDarkMode).plugins,
                legend: { display: false },
                tooltip: {
                    ...this.getChartOptions(isDarkMode).plugins.tooltip,
                    callbacks: {
                        title: function(context) {
                            return `🚢 ${context[0].label}`;
                        },
                        label: function(context) {
                            return `Tempo medio: ${context.parsed.y} giorni`;
                        }
                    }
                }
            }
        }
    });
    
    this.charts.set('seaTransitChart', chart);
    console.log('✅ Sea transit chart rendered');
}

// ✈️ GRAFICO TEMPI AEREO
renderAirTransitChart() {
    const ctx = document.getElementById('airTransitChart');
    if (!ctx) return;
    
    if (this.charts.has('airTransitChart')) {
        this.charts.get('airTransitChart').destroy();
    }
    
    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const airData = this.calculateTransitTimesByModeDetailed('air');
    
    const chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: airData.labels,
            datasets: [{
                label: 'Giorni',
                data: airData.avgDays,
                backgroundColor: 'rgba(245, 158, 11, 0.7)',
                borderColor: '#f59e0b',
                borderWidth: 2,
                borderRadius: 6,
                borderSkipped: false
            }]
        },
        options: {
            ...this.getChartOptions(isDarkMode),
            scales: {
                ...this.getChartOptions(isDarkMode).scales,
                y: {
                    ...this.getChartOptions(isDarkMode).scales.y,
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Giorni',
                        color: isDarkMode ? '#f9fafb' : '#374151'
                    }
                }
            },
            plugins: {
                ...this.getChartOptions(isDarkMode).plugins,
                legend: { display: false },
                tooltip: {
                    ...this.getChartOptions(isDarkMode).plugins.tooltip,
                    callbacks: {
                        title: function(context) {
                            return `✈️ ${context[0].label}`;
                        },
                        label: function(context) {
                            return `Tempo medio: ${context.parsed.y} giorni`;
                        }
                    }
                }
            }
        }
    });
    
    this.charts.set('airTransitChart', chart);
    console.log('✅ Air transit chart rendered');
}

// 🚛 GRAFICO TEMPI STRADALE
renderRoadTransitChart() {
    const ctx = document.getElementById('roadTransitChart');
    if (!ctx) return;
    
    if (this.charts.has('roadTransitChart')) {
        this.charts.get('roadTransitChart').destroy();
    }
    
    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const roadData = this.calculateTransitTimesByModeDetailed('road');
    
    const chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: roadData.labels,
            datasets: [{
                label: 'Giorni',
                data: roadData.avgDays,
                backgroundColor: 'rgba(107, 114, 128, 0.7)',
                borderColor: '#6b7280',
                borderWidth: 2,
                borderRadius: 6,
                borderSkipped: false
            }]
        },
        options: {
            ...this.getChartOptions(isDarkMode),
            scales: {
                ...this.getChartOptions(isDarkMode).scales,
                y: {
                    ...this.getChartOptions(isDarkMode).scales.y,
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Giorni',
                        color: isDarkMode ? '#f9fafb' : '#374151'
                    }
                }
            },
            plugins: {
                ...this.getChartOptions(isDarkMode).plugins,
                legend: { display: false },
                tooltip: {
                    ...this.getChartOptions(isDarkMode).plugins.tooltip,
                    callbacks: {
                        title: function(context) {
                            return `🚛 ${context[0].label}`;
                        },
                        label: function(context) {
                            return `Tempo medio: ${context.parsed.y} giorni`;
                        }
                    }
                }
            }
        }
    });
    
    this.charts.set('roadTransitChart', chart);
    console.log('✅ Road transit chart rendered');
}

// 📦 GRAFICO TEMPI CORRIERE
renderParcelTransitChart() {
    const ctx = document.getElementById('parcelTransitChart');
    if (!ctx) return;
    
    if (this.charts.has('parcelTransitChart')) {
        this.charts.get('parcelTransitChart').destroy();
    }
    
    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const parcelData = this.calculateTransitTimesByModeDetailed('parcel');
    
    const chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: parcelData.labels,
            datasets: [{
                label: 'Giorni',
                data: parcelData.avgDays,
                backgroundColor: 'rgba(139, 92, 246, 0.7)',
                borderColor: '#8b5cf6',
                borderWidth: 2,
                borderRadius: 6,
                borderSkipped: false
            }]
        },
        options: {
            ...this.getChartOptions(isDarkMode),
            scales: {
                ...this.getChartOptions(isDarkMode).scales,
                y: {
                    ...this.getChartOptions(isDarkMode).scales.y,
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Giorni',
                        color: isDarkMode ? '#f9fafb' : '#374151'
                    }
                }
            },
            plugins: {
                ...this.getChartOptions(isDarkMode).plugins,
                legend: { display: false },
                tooltip: {
                    ...this.getChartOptions(isDarkMode).plugins.tooltip,
                    callbacks: {
                        title: function(context) {
                            return `📦 ${context[0].label}`;
                        },
                        label: function(context) {
                            return `Tempo medio: ${context.parsed.y} giorni`;
                        }
                    }
                }
            }
        }
    });
    
    this.charts.set('parcelTransitChart', chart);
    console.log('✅ Parcel transit chart rendered');
}

// ✅ AGGIUNGI QUESTO NUOVO METODO DI SUPPORTO
calculateTransitTimesByModeDetailed(targetMode) {
    const companiesMap = new Map();
    
    this.rawData.shipments.forEach(shipment => {
        const mode = this.determineShipmentMode(shipment, this.rawData.trackings);
        
        // Filtra solo per il metodo richiesto
        if (mode !== targetMode) return;
        
        const companyName = shipment.carrier_name || 'Non specificato';
        const transitDays = this.calculateDeliveryDays(shipment);
        
        if (transitDays > 0 && transitDays < 365) {
            if (!companiesMap.has(companyName)) {
                companiesMap.set(companyName, {
                    name: companyName,
                    totalDays: 0,
                    count: 0
                });
            }
            
            const company = companiesMap.get(companyName);
            company.totalDays += transitDays;
            company.count++;
        }
    });
    
    // Calcola medie e ordina
    const companiesArray = Array.from(companiesMap.values())
        .map(company => ({
            name: company.name,
            avgDays: Math.round(company.totalDays / company.count),
            count: company.count
        }))
        .filter(company => company.avgDays > 0 && company.count >= 2) // Min 2 spedizioni
        .sort((a, b) => a.avgDays - b.avgDays)
        .slice(0, 8); // Top 8
    
    console.log(`📊 ${targetMode} transit times calculated:`, companiesArray);
    
    // Se non ci sono dati, mostra messaggio
    if (companiesArray.length === 0) {
        return {
            labels: ['Nessun dato'],
            avgDays: [0],
            hasData: false
        };
    }
    
    return {
        labels: companiesArray.map(c => c.name),
        avgDays: companiesArray.map(c => c.avgDays),
        hasData: true
    };
}
    // ✅ RENDERIZZA KPI CON SELEZIONE PERSONALIZZATA
    renderKPIs() {
        const container = document.getElementById('kpiCards');
        if (!container || !this.processedMetrics.kpis) return;
        
        // ✅ OTTIENI KPI SELEZIONATI (salva/carica da localStorage)
        const selectedKPIs = this.getSelectedKPIs();
        const filteredKPIs = Object.values(this.processedMetrics.kpis).filter(kpi => 
            selectedKPIs.includes(kpi.id)
        );
        
        // ✅ HEADER CON CONTROLLI - DENTRO IL CONTAINER
        const headerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h5 class="mb-0"><i class="fas fa-chart-pie me-2 text-primary"></i>KPI Dashboard</h5>
                <div class="btn-group">
                    <button class="btn btn-outline-primary btn-sm" onclick="metricsSystem.showKPISelector()">
                        <i class="fas fa-cog me-1"></i>Personalizza KPI
                    </button>
                    <button class="btn btn-outline-secondary btn-sm" onclick="metricsSystem.resetKPISelection()">
                        <i class="fas fa-undo me-1"></i>Reset
                    </button>
                </div>
            </div>
        `;
        
        // ✅ LAYOUT RESPONSIVE BOOTSTRAP (NON CSS GRID!)
        const kpiHTML = filteredKPIs.map((kpi, index) => `
            <div class="col-xl-3 col-lg-4 col-md-6 col-12 mb-3" data-kpi-id="${kpi.id}">
                <div class="kpi-card-modern h-100">
                    <div class="kpi-card-header">
                        <div class="kpi-icon-modern" style="background: linear-gradient(135deg, ${kpi.color}15, ${kpi.color}25);">
                            <i class="${kpi.icon}" style="color: ${kpi.color};"></i>
                        </div>
                        <div class="kpi-trend-badge ${this.getTrendClass(kpi.trend)}">
                            ${this.getTrendIcon(kpi.trend)} ${kpi.trend}
                        </div>
                    </div>
                    <div class="kpi-card-body">
                        <div class="kpi-label-modern">${kpi.name}</div>
                        <div class="kpi-value-modern" style="color: ${kpi.color};">
                            ${this.formatValue(kpi.value, kpi.format)}
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
        
        // ✅ MESSAGE SE NESSUN KPI SELEZIONATO
        const emptyMessage = filteredKPIs.length === 0 ? `
            <div class="col-12">
                <div class="alert alert-info text-center">
                    <i class="fas fa-info-circle me-2"></i>
                    <strong>Nessun KPI selezionato</strong><br>
                    <small>Clicca su "Personalizza KPI" per scegliere quali metriche visualizzare</small>
                    <button class="btn btn-primary btn-sm mt-2 d-block mx-auto" onclick="metricsSystem.showKPISelector()">
                        <i class="fas fa-plus me-1"></i>Aggiungi KPI
                    </button>
                </div>
            </div>
        ` : '';
        
        // ✅ COSTRUISCI HTML COMPLETO CON BOOTSTRAP ROW
        container.innerHTML = headerHTML + '<div class="row g-3">' + kpiHTML + emptyMessage + '</div>';
        
        console.log('✅ KPIs rendered:', filteredKPIs.length, 'of', Object.keys(this.processedMetrics.kpis).length);
    }
    
    // ✅ OTTIENI KPI SELEZIONATI (da localStorage o default)
    getSelectedKPIs() {
        const saved = localStorage.getItem('selectedKPIs');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (error) {
                console.warn('⚠️ Errore parsing selectedKPIs, uso default');
            }
        }
        
        // ✅ DEFAULT: KPI PIÙ IMPORTANTI
        return [
            'total_shipments',
            'total_costs', 
            'avg_cost_per_shipment',
            'avg_delivery_time',
            'avg_sea_delivery_time',
            'avg_air_delivery_time'
        ];
    }
    
    // ✅ SALVA KPI SELEZIONATI
    saveSelectedKPIs(selectedIds) {
        localStorage.setItem('selectedKPIs', JSON.stringify(selectedIds));
        console.log('✅ KPI selection saved:', selectedIds);
    }
    
    // ✅ MOSTRA SELETTORE KPI
    showKPISelector() {
        const allKPIs = this.METRICS_CONFIG.kpis;
        const selectedKPIs = this.getSelectedKPIs();
        
        const modalContent = `
            <div class="kpi-selector">
                <p class="text-muted mb-4">
                    <i class="fas fa-info-circle me-2"></i>
                    Seleziona i KPI che vuoi visualizzare nella dashboard. Puoi scegliere fino a 8 KPI per una visualizzazione ottimale.
                </p>
                
                <div class="row g-3">
                    ${allKPIs.map(kpi => `
                        <div class="col-md-6">
                            <div class="form-check kpi-check-item">
                                <input class="form-check-input" type="checkbox" 
                                       id="kpi_${kpi.id}" value="${kpi.id}"
                                       ${selectedKPIs.includes(kpi.id) ? 'checked' : ''}>
                                <label class="form-check-label w-100" for="kpi_${kpi.id}">
                                    <div class="d-flex align-items-center">
                                        <div class="kpi-mini-icon me-3" style="background: linear-gradient(135deg, ${kpi.color}15, ${kpi.color}25);">
                                            <i class="${kpi.icon}" style="color: ${kpi.color};"></i>
                                        </div>
                                        <div class="flex-grow-1">
                                            <div class="fw-semibold">${kpi.name}</div>
                                            <div class="small text-muted">${this.getKPIDescription(kpi.id)}</div>
                                        </div>
                                    </div>
                                </label>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="mt-4 pt-3 border-top">
                    <div class="row g-2">
                        <div class="col-6">
                            <button class="btn btn-outline-secondary w-100" onclick="metricsSystem.selectKPIPreset('basic')">
                                <i class="fas fa-layer-group me-1"></i>Base (6)
                            </button>
                        </div>
                        <div class="col-6">
                            <button class="btn btn-outline-info w-100" onclick="metricsSystem.selectKPIPreset('advanced')">
                                <i class="fas fa-chart-line me-1"></i>Avanzato (10)
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        if (window.ModalSystem) {
            window.ModalSystem.show({
                title: '⚙️ Personalizza KPI Dashboard',
                content: modalContent,
                size: 'lg',
                customClass: 'kpi-selector-modal',
                onConfirm: () => this.applyKPISelection(),
                confirmText: 'Applica Selezione',
                cancelText: 'Annulla'
            });
        }
    }
    
    // ✅ APPLICA SELEZIONE KPI
    applyKPISelection() {
        const checkboxes = document.querySelectorAll('.kpi-selector input[type="checkbox"]:checked');
        const selectedIds = Array.from(checkboxes).map(cb => cb.value);
        
        if (selectedIds.length === 0) {
            alert('⚠️ Seleziona almeno un KPI');
            return false;
        }
        
        if (selectedIds.length > 8) {
            alert('⚠️ Puoi selezionare massimo 8 KPI per una visualizzazione ottimale');
            return false;
        }
        
        this.saveSelectedKPIs(selectedIds);
        this.renderKPIs(); // Re-renderizza immediatamente
        
        // ✅ NOTIFICA SUCCESSO
        if (window.NotificationSystem) {
            window.NotificationSystem.show({
                type: 'success',
                title: 'KPI Aggiornati',
                message: `Dashboard aggiornata con ${selectedIds.length} KPI selezionati`,
                duration: 3000
            });
        }
        
        return true;
    }
    
    // ✅ PRESET KPI
    selectKPIPreset(presetType) {
        const checkboxes = document.querySelectorAll('.kpi-selector input[type="checkbox"]');
        
        // Deseleziona tutti
        checkboxes.forEach(cb => cb.checked = false);
        
        let presetIds = [];
        
        switch (presetType) {
            case 'basic':
                presetIds = [
                    'total_shipments',
                    'total_costs',
                    'avg_cost_per_shipment',
                    'total_weight',
                    'total_volume',
                    'avg_delivery_time'
                ];
                break;
            case 'advanced':
                presetIds = [
                    'total_shipments',
                    'total_costs',
                    'avg_delivery_time',
                    'avg_sea_delivery_time',
                    'avg_air_delivery_time',
                    'avg_parcel_delivery_time',
                    'avg_road_delivery_time',
                    'total_weight',
                    'total_volume',
                    'avg_cost_per_shipment'
                ];
                break;
        }
        
        // Seleziona preset
        presetIds.forEach(id => {
            const checkbox = document.getElementById(`kpi_${id}`);
            if (checkbox) checkbox.checked = true;
        });
    }
    
    // ✅ RESET SELEZIONE KPI
    resetKPISelection() {
        localStorage.removeItem('selectedKPIs');
        this.renderKPIs();
        
        if (window.NotificationSystem) {
            window.NotificationSystem.show({
                type: 'info',
                title: 'KPI Reset',
                message: 'Selezione KPI ripristinata ai valori predefiniti',
                duration: 3000
            });
        }
    }
    
    // ✅ DESCRIZIONI KPI
    getKPIDescription(kpiId) {
        const descriptions = {
            'total_shipments': 'Numero totale spedizioni nel periodo',
            'total_costs': 'Somma di tutti i costi sostenuti',
            'avg_cost_per_shipment': 'Costo medio per singola spedizione',
            'total_weight': 'Peso totale spedito',
            'total_volume': 'Volume totale spedito',
            'avg_delivery_time': 'Tempo medio di consegna generale',
            'avg_sea_delivery_time': 'Tempo medio consegne marittime',
            'avg_air_delivery_time': 'Tempo medio consegne aeree',
            'avg_parcel_delivery_time': 'Tempo medio consegne corriere',
            'avg_road_delivery_time': 'Tempo medio consegne stradali'
        };
        
        return descriptions[kpiId] || 'Metrica personalizzata';
    }

   // ✅ RENDERIZZA TREND CHART CON DARK MODE
renderTrendChart() {
    const ctx = document.getElementById('trendChart');
    if (!ctx || !this.processedMetrics.advanced.trends) return;
    
    if (this.charts.has('trendChart')) {
        this.charts.get('trendChart').destroy();
    }
    
    // ✅ VERIFICA DARK MODE
    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: this.processedMetrics.advanced.trends.map(t => t.month),
            datasets: [
                {
                    label: 'Spedizioni',
                    data: this.processedMetrics.advanced.trends.map(t => t.shipments),
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    yAxisID: 'y'
                },
                {
                    label: 'Costi (€)',
                    data: this.processedMetrics.advanced.trends.map(t => t.costs),
                    borderColor: '#16a34a',
                    backgroundColor: 'rgba(22, 163, 74, 0.1)',
                    tension: 0.4,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            ...this.getChartOptions(isDarkMode),
            scales: {
                ...this.getChartOptions(isDarkMode).scales,
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    ticks: {
                        color: isDarkMode ? '#f9fafb' : '#374151',
                        font: {
                            size: 11
                        }
                    },
                    grid: {
                        drawOnChartArea: false,
                        color: isDarkMode ? '#4b5563' : '#e5e7eb'
                    }
                }
            }
        }
    });
    
    this.charts.set('trendChart', chart);
    console.log('✅ Trend chart rendered with dark mode:', isDarkMode);
}

// ✅ RENDERIZZA TRANSPORT MODE CHART CON DARK MODE
renderTransportModeChart() {
    const ctx = document.getElementById('transportModeChart');
    if (!ctx || !this.processedMetrics.advanced.transportModes) return;
    
    if (this.charts.has('transportModeChart')) {
        this.charts.get('transportModeChart').destroy();
    }
    
    // ✅ VERIFICA DARK MODE
    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    const chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: this.processedMetrics.advanced.transportModes.map(t => t.name),
            datasets: [{
                data: this.processedMetrics.advanced.transportModes.map(t => t.count),
                backgroundColor: [
                    '#3b82f6', // Blu
                    '#16a34a', // Verde
                    '#f59e0b', // Arancione
                    '#8b5cf6', // Viola
                    '#06b6d4'  // Cyan
                ],
                borderWidth: isDarkMode ? 2 : 1,
                borderColor: isDarkMode ? '#374151' : '#ffffff'
            }]
        },
        options: {
            ...this.getChartOptions(isDarkMode),
            plugins: {
                ...this.getChartOptions(isDarkMode).plugins,
                legend: { 
                    position: 'bottom',
                    labels: {
                        color: isDarkMode ? '#f9fafb' : '#374151',
                        font: {
                            size: 12
                        }
                    }
                }
            }
        }
    });
    
    this.charts.set('transportModeChart', chart);
    console.log('✅ Transport mode chart rendered with dark mode:', isDarkMode);
}
// ✅ RENDERIZZA PERFORMANCE SPEDIZIONIERI (ISTOGRAMMA)
renderCarriersPerformanceChart() {
    const ctx = document.getElementById('carriersPerformanceChart');
    if (!ctx) return;
    
    if (this.charts.has('carriersPerformanceChart')) {
        this.charts.get('carriersPerformanceChart').destroy();
    }
    
    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Calcola performance spedizionieri
    const carriersData = this.calculateCarriersPerformanceChart();    
    const chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: carriersData.labels,
            datasets: [{
                label: 'Numero Spedizioni',
                data: carriersData.shipments,
                backgroundColor: 'rgba(59, 130, 246, 0.7)',
                borderColor: '#3b82f6',
                borderWidth: 2,
                borderRadius: 4,
                borderSkipped: false
            }]
        },
        options: {
            ...this.getChartOptions(isDarkMode),
            indexAxis: 'y', // ✅ GRAFICO ORIZZONTALE
            scales: {
                ...this.getChartOptions(isDarkMode).scales,
                x: {
                    ...this.getChartOptions(isDarkMode).scales.x,
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Numero Spedizioni',
                        color: isDarkMode ? '#f9fafb' : '#374151'
                    }
                },
                y: {
                    ...this.getChartOptions(isDarkMode).scales.y,
                    title: {
                        display: true,
                        text: 'Spedizionieri',
                        color: isDarkMode ? '#f9fafb' : '#374151'
                    }
                }
            },
            plugins: {
                ...this.getChartOptions(isDarkMode).plugins,
                legend: {
                    display: false
                }
            }
        }
    });
    
    this.charts.set('carriersPerformanceChart', chart);
    console.log('✅ Carriers performance chart rendered');
}

// ✅ RENDERIZZA TEMPI DI TRANSITO PER COMPAGNIA
renderTransitTimeChart() {
    const ctx = document.getElementById('transitTimeChart');
    if (!ctx) return;
    
    if (this.charts.has('transitTimeChart')) {
        this.charts.get('transitTimeChart').destroy();
    }
    
    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Calcola tempi di transito per compagnia
    const transitData = this.calculateTransitTimesByCompany();
    
    const chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: transitData.labels,
            datasets: [{
                label: 'Tempo Medio (giorni)',
                data: transitData.avgDays,
                backgroundColor: 'rgba(16, 163, 74, 0.7)',
                borderColor: '#16a34a',
                borderWidth: 2,
                borderRadius: 4,
                borderSkipped: false
            }]
        },
        options: {
            ...this.getChartOptions(isDarkMode),
            scales: {
                ...this.getChartOptions(isDarkMode).scales,
                y: {
                    ...this.getChartOptions(isDarkMode).scales.y,
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Giorni',
                        color: isDarkMode ? '#f9fafb' : '#374151'
                    }
                },
                x: {
                    ...this.getChartOptions(isDarkMode).scales.x,
                    title: {
                        display: true,
                        text: 'Compagnie',
                        color: isDarkMode ? '#f9fafb' : '#374151'
                    }
                }
            },
            plugins: {
                ...this.getChartOptions(isDarkMode).plugins,
                legend: {
                    display: false
                }
            }
        }
    });
    
    this.charts.set('transitTimeChart', chart);
    console.log('✅ Transit time chart rendered');
}

// ✅ RENDERIZZA TEMPI DI TRANSITO PER METODO TRASPORTO
renderTransitTimeByModeChart() {
    const ctx = document.getElementById('transitTimeByModeChart');
    if (!ctx) return;
    
    if (this.charts.has('transitTimeByModeChart')) {
        this.charts.get('transitTimeByModeChart').destroy();
    }
    
    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Calcola tempi per metodo
    const modeData = this.calculateTransitTimesByMode();
    
    const chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: modeData.labels,
            datasets: [{
                label: 'Tempo Medio (giorni)',
                data: modeData.avgDays,
                backgroundColor: [
                    'rgba(59, 130, 246, 0.7)',  // Mare - Blu
                    'rgba(16, 163, 74, 0.7)',   // Aereo - Verde
                    'rgba(245, 158, 11, 0.7)',  // Strada - Arancione
                    'rgba(139, 92, 246, 0.7)'   // Corriere - Viola
                ],
                borderColor: [
                    '#3b82f6',  // Mare
                    '#16a34a',  // Aereo
                    '#f59e0b',  // Strada
                    '#8b5cf6'   // Corriere
                ],
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: {
            ...this.getChartOptions(isDarkMode),
            scales: {
                ...this.getChartOptions(isDarkMode).scales,
                y: {
                    ...this.getChartOptions(isDarkMode).scales.y,
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Giorni Medi',
                        color: isDarkMode ? '#f9fafb' : '#374151'
                    }
                },
                x: {
                    ...this.getChartOptions(isDarkMode).scales.x,
                    title: {
                        display: true,
                        text: 'Metodi di Trasporto',
                        color: isDarkMode ? '#f9fafb' : '#374151'
                    }
                }
            },
            plugins: {
                ...this.getChartOptions(isDarkMode).plugins,
                legend: {
                    display: false
                },
                tooltip: {
                    ...this.getChartOptions(isDarkMode).plugins.tooltip,
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.parsed.y} giorni`;
                        }
                    }
                }
            }
        }
    });
    
    this.charts.set('transitTimeByModeChart', chart);
    console.log('✅ Transit time by mode chart rendered');
}
// ✅ CALCOLA PERFORMANCE SPEDIZIONIERI
calculateCarriersPerformance() {
    const carriersMap = new Map();
    
    // Raggruppa per spedizioniere
    this.rawData.shipments.forEach(shipment => {
        const carrierName = shipment.carrier_name || 'Non specificato';
        
        if (!carriersMap.has(carrierName)) {
            carriersMap.set(carrierName, {
                name: carrierName,
                shipments: 0
            });
        }
        
        carriersMap.get(carrierName).shipments++;
    });
    
    // Converti in array e ordina per numero spedizioni
    const carriersArray = Array.from(carriersMap.values())
        .sort((a, b) => b.shipments - a.shipments)
        .slice(0, 10); // Top 10
    
    return {
        labels: carriersArray.map(c => c.name),
        shipments: carriersArray.map(c => c.shipments)
    };
}

// ✅ CALCOLA TEMPI DI TRANSITO PER COMPAGNIA - VERSIONE CORRETTA
calculateTransitTimesByCompany() {
    const companiesMap = new Map();
    
    this.rawData.shipments.forEach(shipment => {
        const companyName = shipment.carrier_name || 'Non specificato';
        const transitDays = this.calculateDeliveryDays(shipment); // ✅ USA FUNZIONE ESISTENTE
        
        if (transitDays > 0) {
            if (!companiesMap.has(companyName)) {
                companiesMap.set(companyName, {
                    name: companyName,
                    totalDays: 0,
                    count: 0
                });
            }
            
            const company = companiesMap.get(companyName);
            company.totalDays += transitDays;
            company.count++;
        }
    });
    
    // Calcola medie e ordina
    const companiesArray = Array.from(companiesMap.values())
        .map(company => ({
            name: company.name,
            avgDays: Math.round(company.totalDays / company.count)
        }))
        .filter(company => company.avgDays > 0)
        .sort((a, b) => a.avgDays - b.avgDays)
        .slice(0, 8); // Top 8
    
    console.log('📊 Transit times by company calculated:', companiesArray);
    
    return {
        labels: companiesArray.map(c => c.name),
        avgDays: companiesArray.map(c => c.avgDays)
    };
}

// ✅ CALCOLA TEMPI DI TRANSITO PER METODO TRASPORTO - VERSIONE CORRETTA
calculateTransitTimesByMode() {
    const modesMap = new Map([
        ['sea', { name: '🚢 Marittimo', totalDays: 0, count: 0 }],
        ['air', { name: '✈️ Aereo', totalDays: 0, count: 0 }],
        ['road', { name: '🚛 Stradale', totalDays: 0, count: 0 }],
        ['parcel', { name: '📦 Corriere', totalDays: 0, count: 0 }]
    ]);
    
    this.rawData.shipments.forEach(shipment => {
        const mode = this.determineShipmentMode(shipment, this.rawData.trackings); // ✅ PASSA TRACKINGS
        const transitDays = this.calculateDeliveryDays(shipment); // ✅ USA FUNZIONE ESISTENTE
        
        if (transitDays > 0 && modesMap.has(mode)) {
            const modeData = modesMap.get(mode);
            modeData.totalDays += transitDays;
            modeData.count++;
        }
    });
    
    // Calcola medie e filtra
    const modesArray = Array.from(modesMap.values())
        .map(mode => ({
            name: mode.name,
            avgDays: mode.count > 0 ? Math.round(mode.totalDays / mode.count) : 0
        }))
        .filter(mode => mode.avgDays > 0);
    
    console.log('📊 Transit times by mode calculated:', modesArray);
    
    return {
        labels: modesArray.map(m => m.name),
        avgDays: modesArray.map(m => m.avgDays)
    };
}
// ✅ CALCOLA PERFORMANCE SPEDIZIONIERI PER GRAFICI
calculateCarriersPerformanceChart() {
    const carriersMap = new Map();
    
    // Raggruppa per spedizioniere
    this.rawData.shipments.forEach(shipment => {
        const carrierName = shipment.carrier_name || 'Non specificato';
        
        if (!carriersMap.has(carrierName)) {
            carriersMap.set(carrierName, {
                name: carrierName,
                shipments: 0
            });
        }
        
        carriersMap.get(carrierName).shipments++;
    });
    
    // Converti in array e ordina per numero spedizioni
    const carriersArray = Array.from(carriersMap.values())
        .sort((a, b) => b.shipments - a.shipments)
        .slice(0, 10); // Top 10
    
    console.log('📊 Carriers performance for chart calculated:', carriersArray);
    
    return {
        labels: carriersArray.map(c => c.name),
        shipments: carriersArray.map(c => c.shipments)
    };
}
// ✅ CALCOLA GIORNI DI TRANSITO PER SINGOLA SPEDIZIONE
calculateShipmentTransitDays(shipment) {
    const tracking = this.rawData.trackings?.find(t => t.shipment_id === shipment.id);
    
    if (!tracking || !tracking.metadata) return 0;
    
    try {
        const metadata = typeof tracking.metadata === 'string' 
            ? JSON.parse(tracking.metadata) 
            : tracking.metadata;
        
        // Per container (mare/strada)
        if (metadata.container_movements) {
            const movements = Array.isArray(metadata.container_movements) 
                ? metadata.container_movements 
                : [metadata.container_movements];
            
            if (movements.length >= 2) {
                const firstMovement = movements[0];
                const lastMovement = movements[movements.length - 1];
                
                const startDate = new Date(firstMovement.date);
                const endDate = new Date(lastMovement.date);
                
                if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
                    return Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
                }
            }
        }
        
        // Per AWB (aereo/corriere)
        if (metadata.awb_movements) {
            const movements = Array.isArray(metadata.awb_movements) 
                ? metadata.awb_movements 
                : [metadata.awb_movements];
            
            if (movements.length >= 2) {
                const firstMovement = movements[0];
                const lastMovement = movements[movements.length - 1];
                
                const startDate = new Date(firstMovement.date);
                const endDate = new Date(lastMovement.date);
                
                if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
                    return Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
                }
            }
        }
        
    } catch (error) {
        console.warn(`Error calculating transit days for shipment ${shipment.id}:`, error);
    }
    
    return 0;
}
// ✅ AGGIUNGI QUESTA FUNZIONE PER DARK MODE CHARTS
getChartOptions(isDarkMode = false) {
    const textColor = isDarkMode ? '#f9fafb' : '#374151';
    const gridColor = isDarkMode ? '#4b5563' : '#e5e7eb';
    
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: {
                    color: textColor,
                    font: {
                        size: 12
                    }
                }
            },
            tooltip: {
                backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                titleColor: textColor,
                bodyColor: textColor,
                borderColor: gridColor,
                borderWidth: 1
            }
        },
        scales: {
            x: {
                ticks: {
                    color: textColor,
                    font: {
                        size: 11
                    }
                },
                grid: {
                    color: gridColor
                }
            },
            y: {
                ticks: {
                    color: textColor,
                    font: {
                        size: 11
                    }
                },
                grid: {
                    color: gridColor
                }
            }
        }
    };
}
        // ✅ RENDERIZZA TABELLE
    renderTables() {
        this.renderCarriersTable();
        this.renderCarriersDBPerformanceTable(); // ✅ AGGIUNGI QUESTA RIGA
    }

                // ✅ RENDERIZZA TABELLA CARRIERS - NUOVE COLONNE
        renderCarriersTable() {
            const tbody = document.getElementById('carriersDetailBody');
            if (!tbody || !this.processedMetrics.advanced.carriersPerformance) return;
            
            tbody.innerHTML = this.processedMetrics.advanced.carriersPerformance.map(item => `
                <tr>
                    <td>
                        <div class="fw-semibold">${item.company}</div>
                    </td>
                    <td class="text-end">${item.shipments}</td>
                    <td class="text-end">€${item.freightCosts.toLocaleString()}</td>
                    <td class="text-end">€${item.avgFreightCost.toFixed(2)}</td>
                    <td class="text-end">€${item.otherCosts.toLocaleString()}</td>
                    <td class="text-end">
                        ${this.formatTrendPercentage(item.trendPercentage)}
                    </td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-outline-primary" onclick="metricsSystem.viewCompanyAnalytics('${item.company}')" title="Analisi compagnia">
                            <i class="fas fa-chart-line"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        }
        // ✅ VISTA SPEDIZIONI CARRIER CON DETTAGLI ANALITICI
    viewCarrierShipments(carrierId) {
        const carrier = this.processedMetrics.advanced.carriersDBPerformance.find(c => c.id === carrierId);
        if (!carrier) return;
        
        // Filtra spedizioni per questo carrier
        const carrierShipments = this.rawData.shipments.filter(s => s.carrier_id === carrierId);
        
        // Calcola statistiche aggiuntive
        const stats = this.calculateCarrierStats(carrierShipments);
        
        const modalContent = `
            <div class="row g-4">
                <!-- Statistiche Riepilogative -->
                <div class="col-12">
                    <div class="row g-3">
                        <div class="col-md-3">
                            <div class="border rounded p-3 text-center">
                                <div class="h4 mb-1 text-primary">${carrier.totalShipments}</div>
                                <small class="text-muted">Totale Spedizioni</small>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="border rounded p-3 text-center">
                                <div class="h4 mb-1 text-success">€${stats.totalValue.toLocaleString()}</div>
                                <small class="text-muted">Valore Totale</small>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="border rounded p-3 text-center">
                                <div class="h4 mb-1 text-info">${stats.avgDeliveryDays.toFixed(1)} gg</div>
                                <small class="text-muted">Tempo Medio</small>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="border rounded p-3 text-center">
                                <div class="h4 mb-1 text-warning">${stats.deliveryRate.toFixed(1)}%</div>
                                <small class="text-muted">Tasso Consegna</small>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Breakdown Tipi -->
                <div class="col-12">
                    <h6 class="mb-3">🚚 Breakdown per Tipo</h6>
                    <div class="row g-2">
                        ${Object.entries(carrier.shipmentTypes)
                            .filter(([, count]) => count > 0)
                            .map(([type, count]) => `
                                <div class="col-6 col-md-3">
                                    <span class="badge ${this.getShipmentTypeColor(type)} me-2">
                                        ${this.getShipmentTypeIcon(type)} ${type}
                                    </span>
                                    <strong>${count}</strong>
                                    <small class="text-muted">(${((count/carrier.totalShipments)*100).toFixed(1)}%)</small>
                                </div>
                            `).join('')}
                    </div>
                </div>
                
                <!-- Lista Spedizioni -->
                <div class="col-12">
                    <h6 class="mb-3">📦 Spedizioni Recenti</h6>
                    <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
                        <table class="table table-sm table-hover">
                            <thead class="table-light sticky-top">
                                <tr>
                                    <th>Tracking</th>
                                    <th>Origine → Destinazione</th>
                                    <th>Tipo</th>
                                    <th>Stato</th>
                                    <th>Costo</th>
                                    <th>Data</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                ${this.renderCarrierShipmentsRows(carrierShipments)}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                ${carrier.email || carrier.phone ? `
                <div class="col-12">
                    <div class="border-top pt-3">
                        <h6 class="mb-2">📞 Contatti</h6>
                        <div class="row">
                            ${carrier.email ? `<div class="col-md-6"><strong>Email:</strong> <a href="mailto:${carrier.email}">${carrier.email}</a></div>` : ''}
                            ${carrier.phone ? `<div class="col-md-6"><strong>Telefono:</strong> <a href="tel:${carrier.phone}">${carrier.phone}</a></div>` : ''}
                        </div>
                    </div>
                </div>
                ` : ''}
            </div>
        `;
        
        // ✅ PRIMA MODAL CON CLASSE CUSTOM
if (window.ModalSystem) {
    window.ModalSystem.show({
        title: `📊 ${carrier.name} - Analisi Spedizioni`,
        content: modalContent,
        size: 'xl',
        customClass: 'analytics-modal'  // ✅ AGGIUNTO
    });
}
    }
        // ✅ VISTA ANALYTICS COMPAGNIA CON KPI E SPEDIZIONI
    viewCompanyAnalytics(companyName) {
        const company = this.processedMetrics.advanced.carriersPerformance.find(c => c.company === companyName);
        if (!company) return;
        
        // Filtra spedizioni per questa compagnia
        const companyShipments = this.rawData.shipments.filter(s => (s.carrier_name || 'Sconosciuto') === companyName);
        
        // Calcola KPI avanzate
        const analytics = this.calculateCompanyAnalytics(companyShipments);
        
        const modalContent = `
            <div class="row g-4">
                <!-- KPI Cards Dinamiche -->
                <div class="col-12">
                    <div class="row g-3">
                        ${analytics.kpis.map(kpi => `
                            <div class="col-md-3">
                                <div class="border rounded p-3 text-center">
                                    <div class="h4 mb-1 text-${kpi.color}">${kpi.value}</div>
                                    <small class="text-muted">${kpi.label}</small>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <!-- Breakdown Container Types (se presente mare) -->
                ${analytics.containerTypes.length > 0 ? `
                <div class="col-12">
                    <h6 class="mb-3">📦 Container per Tipologia</h6>
                    <div class="row g-2">
                        ${analytics.containerTypes.map(container => `
                            <div class="col-6 col-md-2">
                                <span class="badge bg-info me-2">${container.type}</span>
                                <strong>${container.count}</strong>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
                
                <!-- Lista Spedizioni -->
                <div class="col-12">
                    <h6 class="mb-3">📦 Spedizioni della Compagnia</h6>
                    <div class="table-responsive" style="max-height: calc(100vh - 400px); overflow-y: auto;">
                        <table class="table table-sm table-hover">
                            <thead class="table-light sticky-top">
                                <tr>
                                    <th>N. Spedizione</th>
                                    <th>Origine → Destinazione</th>
                                    <th>Tracking</th>
                                    <th>Tipo</th>
                                    <th>Container</th>
                                    <th>CBM</th>
                                    <th>Peso</th>
                                    <th>Giorni</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                ${this.renderCompanyShipmentsRows(companyShipments)}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        
        if (window.ModalSystem) {
            window.ModalSystem.show({
                title: `📊 ${companyName} - Analytics Avanzata`,
                content: modalContent,
                size: 'xl',
                customClass: 'analytics-modal'
            });
        }
    }
// ✅ RENDERIZZA TABELLA - ICONA AGGIORNATA
renderCarriersDBPerformanceTable() {
    const tbody = document.getElementById('carriersPerformanceBody');
    if (!tbody || !this.processedMetrics.advanced.carriersDBPerformance) return;
    
    tbody.innerHTML = this.processedMetrics.advanced.carriersDBPerformance.map(carrier => `
        <tr>
            <td>
                <div class="fw-semibold">${carrier.name}</div>
            </td>
            <td class="text-end">
                <span class="fw-semibold">${carrier.totalShipments}</span>
            </td>
            <td class="text-end">
                <span class="badge bg-info">${carrier.shipmentTypes.Marittimo}</span>
            </td>
            <td class="text-end">
                <span class="badge bg-warning">${carrier.shipmentTypes.Aereo}</span>
            </td>
            <td class="text-end">
                <span class="badge bg-secondary">${carrier.shipmentTypes.Stradale}</span>
            </td>
            <td class="text-end">
                <span class="badge bg-dark">${carrier.shipmentTypes.Corriere}</span>
            </td>
            <td class="text-end">
                ${this.formatTrendPercentage(carrier.trendPercentage)}
            </td>
            <td class="text-center">
                <button class="btn btn-sm btn-outline-primary" onclick="metricsSystem.viewCarrierShipments('${carrier.id}')" title="Visualizza spedizioni">
                    <i class="fas fa-chart-line"></i>
                </button>
            </td>
        </tr>
    `).join('');
    
    console.log('✅ Carriers DB Performance table rendered');
}
    // ✅ POPOLA FILTRI
        // ✅ POPOLA FILTRI - VERSIONE AGGIORNATA
    populateFilters() {
        this.populateCompanyFilter();
        this.populateCarrierFilter();
    }
    
    // ✅ POPOLA FILTRO COMPAGNIE (da carrier_name delle spedizioni)
    populateCompanyFilter() {
        const companyFilter = document.getElementById('companyFilter');
        if (!companyFilter) return;
        
        // Estrai compagnie uniche dalle spedizioni
        const companies = [...new Set(
            this.rawData.shipments
                .map(s => s.carrier_name)
                .filter(name => name && name.trim() !== '')
        )].sort();
        
        companyFilter.innerHTML = '<option value="">Tutte le compagnie</option>' +
            companies.map(company => 
                `<option value="${company}">${company}</option>`
            ).join('');
        
        console.log('✅ Company filter populated with', companies.length, 'companies');
    }
    
    // ✅ POPOLA FILTRO SPEDIZIONIERI (da tabella carriers)
    populateCarrierFilter() {
        const carrierFilter = document.getElementById('carrierFilter');
        if (!carrierFilter || !this.rawData.carriers) return;
        
        // Usa la tabella carriers da Supabase
        const carriers = this.rawData.carriers
            .filter(carrier => carrier.name && carrier.name.trim() !== '')
            .sort((a, b) => a.name.localeCompare(b.name));
        
        carrierFilter.innerHTML = '<option value="">Tutti gli spedizionieri</option>' +
            carriers.map(carrier => 
                `<option value="${carrier.id}">${carrier.name}${carrier.country ? ` (${carrier.country})` : ''}</option>`
            ).join('');
        
        console.log('✅ Carrier filter populated with', carriers.length, 'carriers from Supabase');
    }

    // ✅ APPLICA FILTRI
    async applyFilters(filters) {
        console.log('🔄 Applying filters:', filters);
        
        this.currentFilters = { ...this.currentFilters, ...filters };
        
        // Ricarica dati con filtri
        await this.loadRawData();
        await this.calculateAllMetrics();
        this.renderDashboard();
        
        console.log('✅ Filters applied successfully');
    }

    // ✅ REFRESH
    async refresh() {
        console.log('🔄 Refreshing metrics system...');
        await this.loadRawData();
        await this.calculateAllMetrics();
        this.renderDashboard();
    }

            // ✅ UTILITY METHODS
        formatValue(value, format) {
            switch (format) {
                case 'currency':
                    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value);
                case 'weight':
                    return value >= 1000 ? `${(value / 1000).toFixed(1)} t` : `${Math.round(value)} kg`;
                case 'volume':
                    return `${value.toFixed(1)} m³`;
                case 'days':
                    return `${value.toFixed(1)} gg`;
                case 'number':
                default:
                    return new Intl.NumberFormat('it-IT').format(Math.round(value));
            }
        }
    
        getTrendClass(trend) {
            return trend.startsWith('+') ? 'growth-positive' : trend.startsWith('-') ? 'growth-negative' : '';
        }
    
        getTrendIcon(trend) {
            return trend.startsWith('+') ? '↗' : trend.startsWith('-') ? '↘' : '→';
        }
    
        renderError(message) {
            const container = document.getElementById('kpiCards');
            if (container) {
                container.innerHTML = `
                    <div class="col-12">
                        <div class="alert alert-danger">
                            <i class="fas fa-exclamation-triangle me-2"></i>
                            <strong>Errore:</strong> ${message}
                            <button class="btn btn-sm btn-outline-danger ms-2" onclick="metricsSystem.refresh()">
                                Riprova
                            </button>
                        </div>
                    </div>
                `;
            }
        }
    
        viewCarrierDetails(carrierName) {
            const carrier = this.processedMetrics.advanced.carriersPerformance.find(c => c.name === carrierName);
            if (carrier && window.ModalSystem) {
                window.ModalSystem.show({
                    title: `Dettagli ${carrierName}`,
                    body: `
                        <div class="row g-3">
                            <div class="col-6"><strong>Spedizioni:</strong> ${carrier.shipments}</div>
                            <div class="col-6"><strong>Costi:</strong> €${carrier.costs.toLocaleString()}</div>
                            <div class="col-6"><strong>Peso:</strong> ${carrier.weight.toLocaleString()} kg</div>
                            <div class="col-6"><strong>Volume:</strong> ${carrier.volume.toFixed(1)} m³</div>
                            <div class="col-6"><strong>Costo Medio:</strong> €${carrier.avgCost.toFixed(2)}</div>
                            <div class="col-6"><strong>Performance:</strong> ${carrier.performance.toFixed(1)}%</div>
                        </div>
                    `,
                    size: 'md'
                });
            }
        }
    
        // ✅ UTILITY: CLASSE BADGE PERFORMANCE
    getPerformanceBadgeClass(performance) {
        if (performance >= 90) return 'bg-success';
        if (performance >= 70) return 'bg-warning';
        if (performance >= 50) return 'bg-orange';
        return 'bg-danger';
    }

    // ✅ UTILITY: ICONA TIPO SPEDIZIONE
    getShipmentTypeIcon(type) {
        switch (type) {
            case 'Marittimo': return '🚢';
            case 'Aereo': return '✈️';
            case 'Stradale': return '🚛';
            case 'Corriere': return '📦';
            default: return '🚚';
        }
    }

    // ✅ UTILITY: COLORE TIPO SPEDIZIONE
    getShipmentTypeColor(type) {
        switch (type) {
            case 'Marittimo': return 'bg-info';
            case 'Aereo': return 'bg-warning';
            case 'Stradale': return 'bg-secondary';
            case 'Corriere': return 'bg-dark';
            default: return 'bg-light';
        }
    }

    // ✅ UTILITY: FORMATTA TENDENZA PERCENTUALE
    formatTrendPercentage(percentage) {
        if (percentage === 0) {
            return '<span class="text-muted">→ 0%</span>';
        } else if (percentage > 0) {
            return `<span class="text-success fw-semibold">↗ +${percentage.toFixed(1)}%</span>`;
        } else {
            return `<span class="text-danger fw-semibold">↘ ${percentage.toFixed(1)}%</span>`;
        }
    }
        // ✅ CALCOLA ANALYTICS COMPAGNIA CON KPI DINAMICHE
    calculateCompanyAnalytics(companyShipments) {
        const analytics = {
            kpis: [],
            containerTypes: []
        };
        
        // Separa spedizioni per tipo
        const seaShipments = companyShipments.filter(s => {
            const tracking = this.rawData.trackings.find(t => 
                t.shipment_id === s.id || t.tracking_number === s.tracking_number
            );
            return tracking && ['container', 'bl', 'bill_of_lading'].includes(tracking.tracking_type?.toLowerCase());
        });
        
        const airShipments = companyShipments.filter(s => {
            const tracking = this.rawData.trackings.find(t => 
                t.shipment_id === s.id || t.tracking_number === s.tracking_number
            );
            return tracking && ['awb', 'air_waybill', 'airway_bill'].includes(tracking.tracking_type?.toLowerCase());
        });
        
        // KPI Mare
        if (seaShipments.length > 0) {
            const avgSeaFreight = seaShipments.reduce((sum, s) => sum + (parseFloat(s.freight_cost) || 0), 0) / seaShipments.length;
            const avgSeaCBM = seaShipments.reduce((sum, s) => sum + (parseFloat(s.total_volume_cbm) || 0), 0) / seaShipments.length;
            const avgSeaTransit = this.calculateAvgTransitTime(seaShipments);
            
            analytics.kpis.push(
                { label: 'Media Costo Nolo Mare', value: `€${avgSeaFreight.toFixed(2)}`, color: 'info' },
                { label: 'Media CBM Mare', value: `${avgSeaCBM.toFixed(1)} m³`, color: 'info' },
                { label: 'Media Transit Time Mare', value: `${avgSeaTransit.toFixed(1)} gg`, color: 'info' }
            );
            
            // Container types
            analytics.containerTypes = this.getContainerTypes(seaShipments);
        }
        
        // KPI Aereo
        if (airShipments.length > 0) {
            const avgAirFreight = airShipments.reduce((sum, s) => sum + (parseFloat(s.freight_cost) || 0), 0) / airShipments.length;
            const avgAirCBM = airShipments.reduce((sum, s) => sum + (parseFloat(s.total_volume_cbm) || 0), 0) / airShipments.length;
            const avgAirWeight = airShipments.reduce((sum, s) => sum + (parseFloat(s.total_weight_kg) || 0), 0) / airShipments.length;
            const avgAirTransit = this.calculateAvgTransitTime(airShipments);
            
            analytics.kpis.push(
                { label: 'Media Costo Nolo Aereo', value: `€${avgAirFreight.toFixed(2)}`, color: 'warning' },
                { label: 'Media CBM Aereo', value: `${avgAirCBM.toFixed(1)} m³`, color: 'warning' },
                { label: 'Media Kg Aereo', value: `${avgAirWeight.toFixed(1)} kg`, color: 'warning' },
                { label: 'Media Transit Time Aereo', value: `${avgAirTransit.toFixed(1)} gg`, color: 'warning' }
            );
        }
        
        return analytics;
    }
    
    // ✅ CALCOLA TEMPO MEDIO DI TRANSITO CON DEBUG TRACKING
        calculateAvgTransitTime(shipments) {
        const transitTimes = [];
        const debugInfo = [];
        
        shipments.forEach(shipment => {
            const days = this.calculateDeliveryDays(shipment);
            if (days !== null && days > 0) {
                transitTimes.push(days);
                debugInfo.push({
                    id: shipment.id,
                    tracking: shipment.tracking_number,
                    days: days
                });
            }
        });
        
        console.log(`📊 Transit times calcolati per ${shipments.length} spedizioni:`, {
            trovati: transitTimes.length,
            media: transitTimes.length > 0 ? (transitTimes.reduce((a, b) => a + b, 0) / transitTimes.length).toFixed(1) : 0,
            dettagli: debugInfo.slice(0, 5) // Prime 5 per debug
        });
        
        return transitTimes.length > 0 
            ? transitTimes.reduce((a, b) => a + b, 0) / transitTimes.length 
            : 0;
    }
    
    // ✅ OTTIENI TIPOLOGIE CONTAINER
    getContainerTypes(seaShipments) {
        const containerTypes = {};
        
        seaShipments.forEach(shipment => {
            // Cerca tipo container (potrebbe essere in diversi campi)
            let containerType = shipment.container_type || shipment.container_size || 'N/A';
            
            // Normalizza i tipi più comuni
            if (containerType.includes('20')) containerType = "20'";
            else if (containerType.includes('40') && containerType.toLowerCase().includes('hc')) containerType = "40'HC";
            else if (containerType.includes('40')) containerType = "40'";
            else if (containerType.includes('45')) containerType = "45'";
            
            containerTypes[containerType] = (containerTypes[containerType] || 0) + 1;
        });
        
        return Object.entries(containerTypes).map(([type, count]) => ({ type, count }));
    }
    
    // ✅ RENDERIZZA RIGHE SPEDIZIONI COMPAGNIA
    renderCompanyShipmentsRows(companyShipments) {
        return companyShipments
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 50)
            .map(shipment => {
                const tracking = this.rawData.trackings.find(t => 
                    t.shipment_id === shipment.id || t.tracking_number === shipment.tracking_number
                );
                
                const shipmentType = this.getShipmentTypeFromTracking(tracking);
                const containerType = shipmentType === 'Marittimo' ? (shipment.container_type || 'N/A') : '-';
                const transitDays = this.calculateDeliveryDays(shipment) || 'N/A';
                
                return `
                    <tr style="cursor: pointer;" onclick="metricsSystem.openShipmentDetails('${shipment.id}')">
                        <td><strong>${shipment.tracking_number || 'N/A'}</strong></td>
                        <td><strong>${this.getOriginDestination(shipment, 'origin')}</strong> → <strong>${this.getOriginDestination(shipment, 'destination')}</strong></td>
                        <td>${shipment.tracking_number || shipment.tracking_code || 'N/A'}</td>
                        <td><span class="badge ${this.getShipmentTypeColor(shipmentType)}">${this.getShipmentTypeIcon(shipmentType)} ${shipmentType}</span></td>
                        <td>${containerType}</td>
                        <td>${(parseFloat(shipment.total_volume_cbm) || 0).toFixed(1)} m³</td>
                        <td>${(parseFloat(shipment.total_weight_kg) || 0).toFixed(1)} kg</td>
                        <td>${transitDays} ${typeof transitDays === 'number' ? 'gg' : ''}</td>
                        <td><i class="fas fa-chevron-right text-muted"></i></td>
                    </tr>
                `;
            }).join('');
    }
    
    // ✅ APRI DETTAGLI SPEDIZIONE (usa shipment-details.js)
    openShipmentDetails(shipmentId) {
        // Reindirizza alla pagina shipment-details
        window.open(`/shipment-details.html?id=${shipmentId}`, '_blank');
    }
        // ✅ CALCOLA STATISTICHE CARRIER
    calculateCarrierStats(shipments) {
        const stats = {
            totalValue: 0,
            deliveredCount: 0,
            avgDeliveryDays: 0,
            deliveryRate: 0
        };
        
        let totalDeliveryDays = 0;
        let deliveredWithDays = 0;
        
        shipments.forEach(shipment => {
            // Calcola valore totale
            stats.totalValue += (parseFloat(shipment.freight_cost) || 0) + 
                               (parseFloat(shipment.other_costs) || 0) + 
                               (parseFloat(shipment.insurance_cost) || 0);
            
            // Conta consegnate
            if (shipment.status === 'delivered') {
                stats.deliveredCount++;
                
                // Calcola giorni di consegna se disponibili
                if (shipment.delivery_date) {
                    const startDate = new Date(shipment.created_at);
                    const endDate = new Date(shipment.delivery_date);
                    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
                    
                    if (days > 0 && days < 365) {
                        totalDeliveryDays += days;
                        deliveredWithDays++;
                    }
                }
            }
        });
        
        stats.deliveryRate = shipments.length > 0 ? (stats.deliveredCount / shipments.length * 100) : 0;
        stats.avgDeliveryDays = deliveredWithDays > 0 ? totalDeliveryDays / deliveredWithDays : 0;
        
        return stats;
    }
    
    // ✅ RENDERIZZA RIGHE SPEDIZIONI CARRIER
    renderCarrierShipmentsRows(shipments) {
        return shipments
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 50) // Limita a 50 spedizioni più recenti
            .map(shipment => {
                const tracking = this.rawData.trackings.find(t => 
                    t.shipment_id === shipment.id || 
                    t.tracking_number === shipment.tracking_number
                );
                
                const shipmentType = this.getShipmentTypeFromTracking(tracking);
                const statusBadge = this.getStatusBadge(shipment.status);
                const totalCost = (parseFloat(shipment.freight_cost) || 0) + 
                                 (parseFloat(shipment.other_costs) || 0);
                
                return `
                    <tr style="cursor: pointer;" onclick="metricsSystem.viewShipmentDetails('${shipment.id}')">
                        <td>
                            <strong>${shipment.tracking_number || 'N/A'}</strong>
                        </td>
                                                <td>
                            <div class="small">
                                <strong>${this.getOriginDestination(shipment, 'origin')}</strong> → <strong>${this.getOriginDestination(shipment, 'destination')}</strong>
                            </div>
                        </td>
                        <td>
                            <span class="badge ${this.getShipmentTypeColor(shipmentType)}">
                                ${this.getShipmentTypeIcon(shipmentType)}
                            </span>
                        </td>
                        <td>${statusBadge}</td>
                        <td><strong>€${totalCost.toFixed(2)}</strong></td>
                        <td class="small">${new Date(shipment.created_at).toLocaleDateString('it-IT')}</td>
                        <td>
                            <i class="fas fa-chevron-right text-muted"></i>
                        </td>
                    </tr>
                `;
            }).join('');
    }
    
    // ✅ DETERMINA TIPO SPEDIZIONE DA TRACKING
    getShipmentTypeFromTracking(tracking) {
        if (!tracking?.tracking_type) return 'Stradale';
        
        switch (tracking.tracking_type.toLowerCase()) {
            case 'container':
            case 'bl':
            case 'bill_of_lading':
                return 'Marittimo';
            case 'awb':
            case 'air_waybill':
            case 'airway_bill':
                return 'Aereo';
            case 'parcel':
            case 'package':
                return 'Corriere';
            default:
                return 'Stradale';
        }
    }
    
   // ✅ BADGE STATO SPEDIZIONE - USANDO MAPPING UNIFICATO
getStatusBadge(status) {
    if (!status) return '<span class="badge bg-light text-dark">❓ Non specificato</span>';
    
    // ✅ USA IL TUO SISTEMA UNIFICATO DI MAPPING
    let normalizedStatus = status;
    
    // Se il mapping unificato è disponibile, usalo
    if (window.TrackingUnifiedMapping) {
        normalizedStatus = window.TrackingUnifiedMapping.mapStatus(status);
    } else {
        // Fallback locale se il mapping non è caricato
        normalizedStatus = this.mapStatusLocal(status);
    }
    
    // ✅ USA LA TUA CONFIGURAZIONE DISPLAY
    const displayConfig = window.TrackingUnifiedMapping?.STATUS_DISPLAY_CONFIG || this.getLocalStatusConfig();
    
    const config = displayConfig[normalizedStatus] || displayConfig['default'] || {
        label: status,
        class: 'secondary',
        icon: 'fa-question-circle'
    };
    
    return `<span class="badge bg-${config.class}" title="Stato originale: ${status}">
        <i class="fas ${config.icon} me-1"></i>${config.label}
    </span>`;
}

// ✅ FALLBACK LOCALE SE MAPPING NON DISPONIBILE
mapStatusLocal(status) {
    const statusStr = status.toString().trim().toLowerCase();
    
    // Mapping essenziale locale
    const localMapping = {
        'delivered': 'delivered',
        'consegnato': 'delivered',
        'consegnata': 'delivered',
        'in_transit': 'in_transit',
        'in transit': 'in_transit',
        'in transito': 'in_transit',
        'sailing': 'in_transit',
        'navigando': 'in_transit',
        'arrived': 'arrived',
        'arrivato': 'arrived',
        'arrivata': 'arrived',
        'discharged': 'arrived',
        'scaricato': 'arrived',
        'pending': 'registered',
        'in attesa': 'registered',
        'registered': 'registered',
        'registrato': 'registered',
        'out_for_delivery': 'out_for_delivery',
        'in consegna': 'out_for_delivery',
        'cancelled': 'cancelled',
        'annullato': 'cancelled'
    };
    
    return localMapping[statusStr] || 'registered';
}

// ✅ CONFIGURAZIONE DISPLAY LOCALE
getLocalStatusConfig() {
    return {
        'in_transit': { label: 'In Transito', class: 'info', icon: 'fa-truck' },
        'delivered': { label: 'Consegnato', class: 'success', icon: 'fa-check-circle' },
        'arrived': { label: 'Arrivato', class: 'primary', icon: 'fa-anchor' },
        'registered': { label: 'Registrato', class: 'secondary', icon: 'fa-clipboard-check' },
        'out_for_delivery': { label: 'In Consegna', class: 'warning', icon: 'fa-shipping-fast' },
        'cancelled': { label: 'Annullato', class: 'secondary', icon: 'fa-times-circle' },
        'default': { label: 'Sconosciuto', class: 'secondary', icon: 'fa-question-circle' }
    };
}
    
        // ✅ DETTAGLI SINGOLA SPEDIZIONE (SECONDO LIVELLO) - VERSIONE COMPLETA
    viewShipmentDetails(shipmentId) {
        const shipment = this.rawData.shipments.find(s => s.id === shipmentId);
        if (!shipment) {
            console.error('❌ Spedizione non trovata:', shipmentId);
            return;
        }
        
        const tracking = this.rawData.trackings.find(t => 
            t.shipment_id === shipment.id || 
            t.tracking_number === shipment.tracking_number
        );
        
        const additionalCosts = this.rawData.additionalCosts?.filter(c => c.shipment_id === shipmentId) || [];
        
        // ✅ CALCOLA DATI AVANZATI
        const shipmentType = this.getShipmentTypeFromTracking(tracking);
        const totalCost = this.calculateShipmentTotal(shipment, additionalCosts);
        const deliveryDays = this.calculateDeliveryDays(shipment);
        
        const detailsHTML = `
            <div class="row g-4">
                <!-- Header Info -->
                <div class="col-12">
                    <div class="alert alert-info d-flex align-items-center">
                        <i class="fas fa-info-circle me-2"></i>
                        <strong>Tracking:</strong> ${shipment.tracking_number || shipment.tracking_code || 'Non disponibile'}
                        <div class="ms-auto">${this.getStatusBadge(shipment.status)}</div>
                    </div>
                </div>
                
                <!-- Metriche Rapide -->
                <div class="col-12">
                    <div class="row g-3 text-center">
                        <div class="col-md-3">
                            <div class="border rounded p-3 bg-light">
                                <div class="h5 mb-1 text-primary">${this.getShipmentTypeIcon(shipmentType)}</div>
                                <small class="text-muted">Tipo Spedizione</small>
                                <div class="fw-semibold">${shipmentType}</div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="border rounded p-3 bg-light">
                                <div class="h5 mb-1 text-success">€${totalCost.toFixed(2)}</div>
                                <small class="text-muted">Costo Totale</small>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="border rounded p-3 bg-light">
                                <div class="h5 mb-1 text-info">${shipment.total_weight_kg || 0} kg</div>
                                <small class="text-muted">Peso</small>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="border rounded p-3 bg-light">
                                <div class="h5 mb-1 text-warning">${deliveryDays ? deliveryDays + ' gg' : 'N/A'}</div>
                                <small class="text-muted">Giorni Consegna</small>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Origine e Destinazione -->
                <div class="col-12">
                    <h6 class="mb-3"><i class="fas fa-route me-2"></i>Rotta</h6>
                    <div class="row g-3">
                        <div class="col-md-6">
                            <div class="border rounded p-3 bg-success bg-opacity-10">
                                <h6 class="text-success mb-2"><i class="fas fa-plane-departure me-2"></i>Origine</h6>
                                <div class="h6 mb-1">${this.getOriginDestination(shipment, 'origin')}</div>
                                <small class="text-muted">${shipment.origin_country || shipment.from_country || ''}</small>
                                ${shipment.origin_address ? `<div class="small mt-1"><i class="fas fa-map-marker-alt me-1"></i>${shipment.origin_address}</div>` : ''}
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="border rounded p-3 bg-danger bg-opacity-10">
                                <h6 class="text-danger mb-2"><i class="fas fa-plane-arrival me-2"></i>Destinazione</h6>
                                <div class="h6 mb-1">${this.getOriginDestination(shipment, 'destination')}</div>
                                <small class="text-muted">${shipment.destination_country || shipment.to_country || ''}</small>
                                ${shipment.destination_address ? `<div class="small mt-1"><i class="fas fa-map-marker-alt me-1"></i>${shipment.destination_address}</div>` : ''}
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Dettagli e Timeline -->
                <div class="col-md-8">
                    <h6 class="mb-3"><i class="fas fa-box me-2"></i>Dettagli Spedizione</h6>
                    <div class="table-responsive">
                        <table class="table table-sm table-bordered">
                            <tr>
                                <th class="bg-light" style="width: 40%;">Peso:</th>
                                <td>${shipment.total_weight_kg || 0} kg</td>
                            </tr>
                            <tr>
                                <th class="bg-light">Volume:</th>
                                <td>${shipment.total_volume_cbm || 0} m³</td>
                            </tr>
                            <tr>
                                <th class="bg-light">Numero Colli:</th>
                                <td>${shipment.total_packages || 'N/A'}</td>
                            </tr>
                            <tr>
                                <th class="bg-light">Tipo Spedizione:</th>
                                <td><span class="badge ${this.getShipmentTypeColor(shipmentType)}">${this.getShipmentTypeIcon(shipmentType)} ${shipmentType}</span></td>
                            </tr>
                            <tr>
                                <th class="bg-light">Data Creazione:</th>
                                <td>${new Date(shipment.created_at).toLocaleString('it-IT')}</td>
                            </tr>
                            ${shipment.delivery_date ? `
                            <tr>
                                <th class="bg-light">Data Consegna:</th>
                                <td>${new Date(shipment.delivery_date).toLocaleString('it-IT')}</td>
                            </tr>
                            ` : ''}
                            ${tracking ? `
                            <tr>
                                <th class="bg-light">Ultimo Aggiornamento:</th>
                                <td>${new Date(tracking.updated_at || tracking.created_at).toLocaleString('it-IT')}</td>
                            </tr>
                            ` : ''}
                        </table>
                    </div>
                    
                    ${tracking?.notes || shipment.notes ? `
                    <div class="mt-3">
                        <h6><i class="fas fa-sticky-note me-2"></i>Note</h6>
                        <div class="bg-light rounded p-3">
                            ${shipment.notes ? `<div class="mb-2"><strong>Spedizione:</strong> ${shipment.notes}</div>` : ''}
                            ${tracking?.notes ? `<div><strong>Tracking:</strong> ${tracking.notes}</div>` : ''}
                        </div>
                    </div>
                    ` : ''}
                </div>
                
                <!-- Breakdown Costi -->
                <div class="col-md-4">
                    <h6 class="mb-3"><i class="fas fa-euro-sign me-2"></i>Breakdown Costi</h6>
                    <div class="table-responsive">
                        <table class="table table-sm table-bordered">
                            <tr>
                                <th class="bg-light">Nolo:</th>
                                <td class="text-end">€${(parseFloat(shipment.freight_cost) || 0).toFixed(2)}</td>
                            </tr>
                            <tr>
                                <th class="bg-light">Altri costi:</th>
                                <td class="text-end">€${(parseFloat(shipment.other_costs) || 0).toFixed(2)}</td>
                            </tr>
                            <tr>
                                <th class="bg-light">Assicurazione:</th>
                                <td class="text-end">€${(parseFloat(shipment.insurance_cost) || 0).toFixed(2)}</td>
                            </tr>
                            <tr>
                                <th class="bg-light">Dogana:</th>
                                <td class="text-end">€${(parseFloat(shipment.customs_cost) || 0).toFixed(2)}</td>
                            </tr>
                            ${additionalCosts.map(cost => 
                                `<tr>
                                    <th class="bg-light">${cost.description}:</th>
                                    <td class="text-end">€${(parseFloat(cost.amount) || 0).toFixed(2)}</td>
                                </tr>`
                            ).join('')}
                            <tr class="table-warning">
                                <th><strong>TOTALE:</strong></th>
                                <td class="text-end"><strong>€${totalCost.toFixed(2)}</strong></td>
                            </tr>
                        </table>
                    </div>
                    
                    <!-- Azioni Spedizione -->
                    <div class="mt-3">
                        <h6><i class="fas fa-tools me-2"></i>Azioni</h6>
                        <div class="d-grid gap-2">
                            ${tracking ? `
                            <button class="btn btn-outline-primary btn-sm" onclick="window.open('/tracking?code=${tracking.tracking_number || shipment.tracking_number}', '_blank')">
                                <i class="fas fa-search me-1"></i>Tracking Completo
                            </button>
                            ` : ''}
                            <button class="btn btn-outline-success btn-sm" onclick="metricsSystem.printShipmentLabel('${shipment.id}')">
                                <i class="fas fa-print me-1"></i>Stampa Etichetta
                            </button>
                            <button class="btn btn-outline-info btn-sm" onclick="metricsSystem.exportShipmentPDF('${shipment.id}')">
                                <i class="fas fa-file-pdf me-1"></i>Esporta PDF
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Informazioni Carrier -->
                ${this.renderCarrierInfo(shipment)}
            </div>
        `;
        
        // ✅ SECONDA MODAL CON CLASSE CUSTOM
if (window.ModalSystem) {
    window.ModalSystem.show({
        title: `🔍 Dettagli Spedizione ${shipment.tracking_number || shipment.id}`,
        content: detailsHTML,
        size: 'xl',
        customClass: 'analytics-modal'  // ✅ AGGIUNTO
    });
}
    }
    
    // ✅ CALCOLA TOTALE SPEDIZIONE
    calculateShipmentTotal(shipment, additionalCosts) {
        let total = (parseFloat(shipment.freight_cost) || 0) +
                    (parseFloat(shipment.other_costs) || 0) +
                    (parseFloat(shipment.insurance_cost) || 0) +
                    (parseFloat(shipment.customs_cost) || 0);
        
        additionalCosts.forEach(cost => {
            total += (parseFloat(cost.amount) || 0);
        });
        
        return total;
    }
    // ✅ CALCOLA GIORNI CONSEGNA - VERSIONE METADATA-BASED
    calculateDeliveryDays(shipment) {
        console.log(`🔍 Calculating delivery days for shipment ${shipment.id}`);
        
        // 🎯 PRIORITÀ 1: Trova il tracking corrispondente
        const tracking = this.rawData.trackings.find(t => 
            t.shipment_id === shipment.id || 
            t.tracking_number === shipment.tracking_number ||
            t.tracking_number === shipment.tracking_code
        );
        
        if (!tracking || !tracking.metadata) {
            console.log(`⚠️ Nessun tracking o metadata trovato per spedizione ${shipment.id}`);
            return null;
        }
        
        try {
            let movements = [];
            let startDate = null;
            let endDate = null;
            
            // ✅ ESTRAI MOVEMENTS DA METADATA - VERSIONE ROBUSTA
            if (tracking.metadata.raw && tracking.metadata.raw.shipment && tracking.metadata.raw.shipment.containers) {
                // Tipo Container: movimenti nei containers
                const container = tracking.metadata.raw.shipment.containers[0];
                if (container && container.movements) {
                    movements = container.movements;
                    console.log(`📦 Container movements trovati: ${movements.length} eventi`);
                }
            } else if (tracking.metadata.raw && tracking.metadata.raw.movements) {
                // Tipo AWB: movimenti diretti
                movements = tracking.metadata.raw.movements;
                console.log(`✈️ AWB movements trovati: ${movements.length} eventi`);
            } else if (tracking.metadata.mapped && tracking.metadata.mapped._raw_api_response && tracking.metadata.mapped._raw_api_response.movements) {
                // Tipo AWB alternativo
                movements = tracking.metadata.mapped._raw_api_response.movements;
                console.log(`✈️ AWB mapped movements trovati: ${movements.length} eventi`);
            }
            
            if (movements.length === 0) {
                console.log(`❌ Nessun movimento trovato nel metadata`);
                return null;
            }
            
            // ✅ TROVA DATE INIZIO E FINE
            const sortedMovements = movements
                .filter(m => m.timestamp || m.date)
                .sort((a, b) => {
                    const dateA = new Date(a.timestamp || a.date);
                    const dateB = new Date(b.timestamp || b.date);
                    return dateA - dateB;
                });
            
            if (sortedMovements.length < 2) {
                console.log(`⚠️ Movimenti insufficienti: ${sortedMovements.length}`);
                return null;
            }
            
            startDate = new Date(sortedMovements[0].timestamp || sortedMovements[0].date);
            endDate = new Date(sortedMovements[sortedMovements.length - 1].timestamp || sortedMovements[sortedMovements.length - 1].date);
            
            // ✅ VERIFICA DATE VALIDE
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                console.log(`❌ Date non valide: ${startDate} → ${endDate}`);
                return null;
            }
            
            const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
            
            // ✅ VERIFICA RAGIONEVOLEZZA
            if (days < 0 || days > 365) {
                console.log(`⚠️ Giorni non ragionevoli: ${days}`);
                return null;
            }
            
            console.log(`✅ Transit time calcolato: ${days} giorni (${startDate.toLocaleDateString()} → ${endDate.toLocaleDateString()})`);
            console.log(`   Primo evento: ${sortedMovements[0].event || 'N/A'} - ${sortedMovements[0].location?.name || sortedMovements[0].location || 'N/A'}`);
            console.log(`   Ultimo evento: ${sortedMovements[sortedMovements.length - 1].event || 'N/A'} - ${sortedMovements[sortedMovements.length - 1].location?.name || sortedMovements[sortedMovements.length - 1].location || 'N/A'}`);
            
            return days;
            
        } catch (error) {
            console.error(`❌ Errore nel parsing metadata per tracking ${tracking.tracking_number}:`, error);
            return null;
        }
    }
        // ✅ DEBUG TRACKING DATA PER VERIFICARE STRUTTURA
    debugTrackingData(limit = 3) {
        console.log('🔍 ANALISI TRACKING DATA:');
        
        const trackingsWithEvents = this.rawData.trackings
            .filter(t => t.events || t.timeline || t.tracking_data)
            .slice(0, limit);
        
        trackingsWithEvents.forEach((tracking, i) => {
            console.log(`\n${i+1}. Tracking: ${tracking.tracking_number}`);
            console.log('   Shipment ID:', tracking.shipment_id);
            console.log('   Ha events:', !!tracking.events);
            console.log('   Ha timeline:', !!tracking.timeline);
            console.log('   Ha tracking_data:', !!tracking.tracking_data);
            
            if (tracking.events) {
                console.log('   Events count:', tracking.events.length);
                console.log('   Primo evento:', tracking.events[0]);
            }
            
            if (tracking.timeline) {
                console.log('   Timeline count:', tracking.timeline.length);
                console.log('   Primo timeline:', tracking.timeline[0]);
            }
            
            if (tracking.tracking_data) {
                try {
                    const data = typeof tracking.tracking_data === 'string' 
                        ? JSON.parse(tracking.tracking_data) 
                        : tracking.tracking_data;
                    console.log('   Tracking data keys:', Object.keys(data));
                    console.log('   Ha events in data:', !!(data.events || data.timeline));
                } catch (e) {
                    console.log('   Tracking data (raw):', typeof tracking.tracking_data);
                }
            }
        });
        
        console.log(`\n📊 Summary: ${trackingsWithEvents.length}/${this.rawData.trackings.length} trackings hanno eventi`);
    }
    // ✅ RENDERIZZA INFO CARRIER
    renderCarrierInfo(shipment) {
        const carrier = this.rawData.carriers?.find(c => c.id === shipment.carrier_id);
        if (!carrier) return '';
        
        return `
            <div class="col-12">
                <div class="border-top pt-3">
                    <h6><i class="fas fa-shipping-fast me-2"></i>Informazioni Spedizioniere</h6>
                    <div class="row g-3">
                        <div class="col-md-6">
                            <div class="bg-light rounded p-3">
                                <div class="fw-semibold">${carrier.name}</div>
                                ${carrier.email ? `<div class="mt-1"><i class="fas fa-envelope me-1"></i><a href="mailto:${carrier.email}">${carrier.email}</a></div>` : ''}
                                ${carrier.phone ? `<div><i class="fas fa-phone me-1"></i><a href="tel:${carrier.phone}">${carrier.phone}</a></div>` : ''}
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="bg-light rounded p-3">
                                <div class="small text-muted">Performance Generale</div>
                                <div class="h6 mb-1">${this.getCarrierPerformance(carrier.id).toFixed(1)}%</div>
                                <div class="progress" style="height: 6px;">
                                    <div class="progress-bar ${this.getPerformanceBadgeClass(this.getCarrierPerformance(carrier.id)).replace('bg-', 'bg-')}" 
                                         style="width: ${this.getCarrierPerformance(carrier.id)}%"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    // ✅ CALCOLA PERFORMANCE CARRIER
    getCarrierPerformance(carrierId) {
        const carrierShipments = this.rawData.shipments.filter(s => s.carrier_id === carrierId);
        if (carrierShipments.length === 0) return 0;
        
        const deliveredCount = carrierShipments.filter(s => s.status === 'delivered' || s.status === 'consegnato').length;
        return (deliveredCount / carrierShipments.length) * 100;
    }
    
    // ✅ PLACEHOLDER FUNZIONI AZIONI
    printShipmentLabel(shipmentId) {
        console.log('🖨️ Print label for shipment:', shipmentId);
        // TODO: Implementare stampa etichetta
        alert('Funzione stampa etichetta in sviluppo');
    }
    
    exportShipmentPDF(shipmentId) {
        console.log('📄 Export PDF for shipment:', shipmentId);
        // TODO: Implementare export PDF
        alert('Funzione export PDF in sviluppo');
    }
          // ✅ UTILITY: MAPPATURA ROBUSTA ORIGINE/DESTINAZIONE - VERSIONE MIGLIORATA
    getOriginDestination(shipment, type) {
        // ✅ USA IL MAPPING UNIFICATO SE DISPONIBILE
        if (window.TrackingUnifiedMapping) {
            // Cerca nei campi mappati
            const mappedFields = Object.values(window.TrackingUnifiedMapping.COLUMN_MAPPING);
            
            if (type === 'origin') {
                const originMapped = ['origin_port', 'origin_name', 'origin'].find(field => 
                    shipment[field] && shipment[field].trim() !== ''
                );
                if (originMapped) return shipment[originMapped];
            } else {
                const destMapped = ['destination_port', 'destination_name', 'destination'].find(field => 
                    shipment[field] && shipment[field].trim() !== ''
                );
                if (destMapped) return shipment[destMapped];
            }
        }
        
        // ✅ FALLBACK AI CAMPI ORIGINALI
        const originFields = [
            'origin', 'origin_port', 'origin_city', 'origin_location', 
            'pickup_location', 'from_port', 'departure_port',
            'origin_address', 'pickup_address', 'from_location'
        ];
        
        const destinationFields = [
            'destination', 'destination_port', 'destination_city', 'destination_location',
            'delivery_location', 'to_port', 'arrival_port',
            'destination_address', 'delivery_address', 'to_location'
        ];
        
        const fields = type === 'origin' ? originFields : destinationFields;
        
        // ✅ CERCA IL PRIMO CAMPO NON VUOTO
        for (const field of fields) {
            if (shipment[field] && shipment[field].trim() !== '') {
                return shipment[field];
            }
        }
        
        return 'Non specificato';
    }
        // ✅ INIZIALIZZA DATE DEFAULT (ULTIMI 30 GIORNI)
    initializeDateFilters() {
        const today = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);
        
        // Imposta valori di default
        const dateFromInput = document.getElementById('dateFromFilter');
        const dateToInput = document.getElementById('dateToFilter');
        
        if (dateFromInput) {
            dateFromInput.value = thirtyDaysAgo.toISOString().split('T')[0];
        }
        
        if (dateToInput) {
            dateToInput.value = today.toISOString().split('T')[0];
        }
        
        // Imposta filtri attuali
        this.currentFilters.dateFrom = thirtyDaysAgo.toISOString().split('T')[0];
        this.currentFilters.dateTo = today.toISOString().split('T')[0];
        
        console.log('📅 Date filters initialized:', {
            from: this.currentFilters.dateFrom,
            to: this.currentFilters.dateTo
        });
    }
    
        // ✅ APPLICA FILTRI DATE
    async applyDateFilters() {
        const dateFromInput = document.getElementById('dateFromFilter');
        const dateToInput = document.getElementById('dateToFilter');
        
        const dateFrom = dateFromInput?.value;
        const dateTo = dateToInput?.value;
        
        // Validazione range
        if (dateFrom && dateTo && new Date(dateFrom) > new Date(dateTo)) {
            alert('⚠️ La data "Da" non può essere successiva alla data "A"');
            return;
        }
        
        // Aggiorna filtri
        this.currentFilters.dateFrom = dateFrom;
        this.currentFilters.dateTo = dateTo;
        
        console.log('📅 Applying new date filters:', {
            from: dateFrom,
            to: dateTo
        });
        
        // Ricarica dati e dashboard
        await this.loadRawData();
        await this.calculateAllMetrics();
        this.renderDashboard();
        
        // ✅ NOTIFICA CORRETTA (STRINGA INVECE DI OGGETTO)
        if (window.notificationSystem) {
            const rangeText = dateFrom && dateTo 
                ? `${new Date(dateFrom).toLocaleDateString('it-IT')} - ${new Date(dateTo).toLocaleDateString('it-IT')}`
                : 'Nessun filtro';
                
            window.notificationSystem.show(
                'success',
                'Filtri Data Applicati',
                `Dashboard aggiornata per il periodo: ${rangeText}`
            );
        }
    }
    
    // ✅ RESET FILTRI DATE
    resetDateFilters() {
        this.initializeDateFilters();
        this.applyDateFilters();
    }
    
    // ✅ PRESET DATE RAPIDI
    applyDatePreset(preset) {
        const today = new Date();
        let fromDate, toDate;
        
        switch (preset) {
            case 'today':
                fromDate = toDate = today;
                break;
            case 'yesterday':
                fromDate = toDate = new Date(today.getTime() - 24 * 60 * 60 * 1000);
                break;
            case 'week':
                fromDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                toDate = today;
                break;
            case 'month':
                fromDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
                toDate = today;
                break;
            case 'quarter':
                fromDate = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
                toDate = today;
                break;
            case 'year':
                fromDate = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);
                toDate = today;
                break;
            default:
                return;
        }
        
        // Aggiorna inputs
        const dateFromInput = document.getElementById('dateFromFilter');
        const dateToInput = document.getElementById('dateToFilter');
        
        if (dateFromInput) dateFromInput.value = fromDate.toISOString().split('T')[0];
        if (dateToInput) dateToInput.value = toDate.toISOString().split('T')[0];
        
        // Applica filtri
        this.applyDateFilters();
    }
// ✅ AGGIUNGI QUESTA FUNZIONE DI DEBUG (alla fine della classe, prima dell'ultima })
debugShipmentDates() {
    console.log('🔍 ANALISI DATE SPEDIZIONI:');
    
    this.rawData.shipments.forEach((shipment, i) => {
        const departureDate = this.getShipmentDepartureDate(shipment);
        const createdDate = shipment.created_at;
        
        console.log(`${i+1}. Shipment ${shipment.id}:`);
        console.log(`   Created: ${new Date(createdDate).toISOString().split('T')[0]}`);
        console.log(`   Departure: ${departureDate ? new Date(departureDate).toISOString().split('T')[0] : 'NONE'}`);
        console.log(`   Same?: ${departureDate && new Date(departureDate).toISOString().split('T')[0] === new Date(createdDate).toISOString().split('T')[0]}`);
        
        // Verifica se ha date specifiche
        const hasSpecificDates = [
            'departure_date', 'etd', 'sailing_date', 'flight_date', 
            'pickup_date', 'shipment_date', 'actual_departure'
        ].some(field => shipment[field]);
        
        console.log(`   Has specific dates: ${hasSpecificDates}`);
        console.log('');
    });
}
}

// ✅ ESPORTA SISTEMA (FUORI DALLA CLASSE!)
export default UnifiedMetricsSystem;