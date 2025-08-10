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
                avg_delivery_time: (data) => this.avgDeliveryTime(data.shipments, data.trackings)
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
            
            // 3. Carica dati iniziali
            await this.loadRawData();
            
            // 4. Calcola metriche
            await this.calculateAllMetrics();
            
            // 5. Renderizza dashboard
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

    // ✅ CARICA RAW DATA
    async loadRawData() {
        console.log('📥 Loading raw data...');
        
        try {
            // Costruisci query con filtro organization opzionale
            let shipmentsQuery = this.supabase.from('shipments').select('*');
            let trackingsQuery = this.supabase.from('trackings').select('*');
            let costsQuery = this.supabase.from('additional_costs').select('*');
            let carriersQuery = this.supabase.from('carriers').select('*'); // ✅ AGGIUNGI QUESTA
            
            if (this.organizationId) {
                shipmentsQuery = shipmentsQuery.eq('organization_id', this.organizationId);
                trackingsQuery = trackingsQuery.eq('organization_id', this.organizationId);
                costsQuery = costsQuery.eq('organization_id', this.organizationId);
                carriersQuery = carriersQuery.eq('organization_id', this.organizationId); // ✅ AGGIUNGI QUESTA
            }
            
            // Applica filtri periodo se specificati
            if (this.currentFilters.period) {
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - this.currentFilters.period);
                const dateFilter = cutoffDate.toISOString();
                
                shipmentsQuery = shipmentsQuery.gte('created_at', dateFilter);
                trackingsQuery = trackingsQuery.gte('created_at', dateFilter);
                costsQuery = costsQuery.gte('created_at', dateFilter);
            }
            
            // ✅ APPLICA FILTRI COMPAGNIA E SPEDIZIONIERE
            if (this.currentFilters.company) {
                shipmentsQuery = shipmentsQuery.eq('carrier_name', this.currentFilters.company);
            }
            
            if (this.currentFilters.carrier) {
                // Cerca nelle spedizioni dove carrier_id corrisponde
                shipmentsQuery = shipmentsQuery.eq('carrier_id', this.currentFilters.carrier);
            }
            
            if (this.currentFilters.status) {
                shipmentsQuery = shipmentsQuery.eq('status', this.currentFilters.status);
            }
            
            // Esegui query in parallelo
            const [shipmentsResult, trackingsResult, costsResult, carriersResult] = await Promise.allSettled([
                shipmentsQuery.order('created_at', { ascending: false }).limit(5000),
                trackingsQuery.order('created_at', { ascending: false }).limit(5000),
                costsQuery.order('created_at', { ascending: false }).limit(2000),
                carriersQuery.order('name', { ascending: true }).limit(500) // ✅ MODIFICA QUERY CARRIERS
            ]);
            
            // Estrai dati
            this.rawData = {
                shipments: this.extractData(shipmentsResult, 'shipments'),
                trackings: this.extractData(trackingsResult, 'trackings'),
                additionalCosts: this.extractData(costsResult, 'additional_costs'),
                carriers: this.extractData(carriersResult, 'carriers'), // ✅ CARRIERS DA SUPABASE
                loadedAt: new Date().toISOString()
            };
            
            console.log('✅ Raw data loaded:', {
                shipments: this.rawData.shipments.length,
                trackings: this.rawData.trackings.length,
                additionalCosts: this.rawData.additionalCosts.length,
                carriers: this.rawData.carriers.length // ✅ LOG CARRIERS
            });
            
        } catch (error) {
            console.error('❌ Error loading raw data:', error);
            throw error;
        }
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
            
            // ✅ AGGIUNGI NUOVA METRICA
            const advancedMetrics = {
                trends: this.calculateTrends(),
                transportModes: this.calculateTransportModes(),
                carriersPerformance: this.calculateCarriersPerformance(),
                carriersDBPerformance: this.calculateCarriersDBPerformance(), // ✅ NUOVA
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
            if (shipment.status === 'delivered') {
                const tracking = trackings.find(t => 
                    t.shipment_id === shipment.id || 
                    t.tracking_number === shipment.tracking_number
                );
                
                const startDate = new Date(shipment.created_at);
                let endDate = null;
                
                if (shipment.delivery_date) {
                    endDate = new Date(shipment.delivery_date);
                } else if (tracking?.delivered_at) {
                    endDate = new Date(tracking.delivered_at);
                }
                
                if (endDate && endDate > startDate) {
                    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
                    if (days > 0 && days < 365) {
                        deliveredTimes.push(days);
                    }
                }
            }
        });
        
        return deliveredTimes.length > 0 
            ? deliveredTimes.reduce((a, b) => a + b, 0) / deliveredTimes.length 
            : 0;
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

        // ✅ CALCOLA PERFORMANCE CARRIERS - VERSIONE AGGIORNATA
    calculateCarriersPerformance() {
        const performance = {};
        
        this.rawData.shipments.forEach(shipment => {
            // ✅ USA CARRIER_NAME PER LE COMPAGNIE (non più per carriers)
            const companyName = shipment.carrier_name || 'Sconosciuto';
            
            // ✅ TROVA CARRIER DA TABELLA CARRIERS SE PRESENTE
            let carrierName = 'Non specificato';
            if (shipment.carrier_id) {
                const carrier = this.rawData.carriers.find(c => c.id === shipment.carrier_id);
                carrierName = carrier ? carrier.name : `Carrier ID: ${shipment.carrier_id}`;
            }
            
            const key = `${companyName} → ${carrierName}`;
            
            if (!performance[key]) {
                performance[key] = {
                    name: key,
                    company: companyName,
                    carrier: carrierName,
                    shipments: 0,
                    costs: 0,
                    weight: 0,
                    volume: 0,
                    delivered: 0
                };
            }
            
            const p = performance[key];
            p.shipments++;
            p.costs += (parseFloat(shipment.freight_cost) || 0) + (parseFloat(shipment.other_costs) || 0);
            p.weight += (parseFloat(shipment.total_weight_kg) || 0);
            p.volume += (parseFloat(shipment.total_volume_cbm) || 0);
            
            if (shipment.status === 'delivered') {
                p.delivered++;
            }
        });
        
        return Object.values(performance).map(p => ({
            ...p,
            avgCost: p.shipments > 0 ? p.costs / p.shipments : 0,
            performance: p.shipments > 0 ? (p.delivered / p.shipments * 100) : 0
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

    // ✅ RENDERIZZA KPI
    renderKPIs() {
        const container = document.getElementById('kpiCards');
        if (!container || !this.processedMetrics.kpis) return;
        
        const kpiHTML = Object.values(this.processedMetrics.kpis).map((kpi, index) => `
            <div class="kpi-card-wrapper" data-kpi-index="${index}">
                <div class="kpi-card">
                    <div class="kpi-icon-small" style="background-color: ${kpi.color};">
                        <i class="${kpi.icon}"></i>
                    </div>
                    <div class="kpi-label-small">${kpi.name}</div>
                    <div class="kpi-value-small">${this.formatValue(kpi.value, kpi.format)}</div>
                    <div class="growth-indicator-small ${this.getTrendClass(kpi.trend)}">
                        ${this.getTrendIcon(kpi.trend)} ${kpi.trend}
                    </div>
                </div>
            </div>
        `).join('');
        
        container.innerHTML = kpiHTML;
        console.log('✅ KPIs rendered');
    }

    // ✅ RENDERIZZA CHARTS
    renderCharts() {
        if (this.processedMetrics.advanced) {
            this.renderTrendChart();
            this.renderTransportModeChart();
        }
    }

    renderTrendChart() {
        const ctx = document.getElementById('trendChart');
        if (!ctx || !this.processedMetrics.advanced.trends) return;
        
        if (this.charts.has('trendChart')) {
            this.charts.get('trendChart').destroy();
        }
        
        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.processedMetrics.advanced.trends.map(t => t.month),
                datasets: [{
                    label: 'Spedizioni',
                    data: this.processedMetrics.advanced.trends.map(t => t.shipments),
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4
                }, {
                    label: 'Costi (€)',
                    data: this.processedMetrics.advanced.trends.map(t => t.costs),
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.4,
                    yAxisID: 'y1'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left'
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        grid: { drawOnChartArea: false }
                    }
                }
            }
        });
        
        this.charts.set('trendChart', chart);
    }

    renderTransportModeChart() {
        const ctx = document.getElementById('transportModeChart');
        if (!ctx || !this.processedMetrics.advanced.transportModes) return;
        
        if (this.charts.has('transportModeChart')) {
            this.charts.get('transportModeChart').destroy();
        }
        
        const chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: this.processedMetrics.advanced.transportModes.map(t => t.name),
                datasets: [{
                    data: this.processedMetrics.advanced.transportModes.map(t => t.count),
                    backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
        
        this.charts.set('transportModeChart', chart);
    }

        // ✅ RENDERIZZA TABELLE
    renderTables() {
        this.renderCarriersTable();
        this.renderCarriersDBPerformanceTable(); // ✅ AGGIUNGI QUESTA RIGA
    }

        // ✅ RENDERIZZA TABELLA CARRIERS - VERSIONE AGGIORNATA
                    renderCarriersTable() {
                    const tbody = document.getElementById('carriersDetailBody');
                    if (!tbody || !this.processedMetrics.advanced.carriersPerformance) return;
                    
                    tbody.innerHTML = this.processedMetrics.advanced.carriersPerformance.map(item => `
                        <tr>
                            <td>
                                <div class="fw-semibold">${item.company}</div>
                            </td>            <td class="text-end">${item.shipments}</td>
                <td class="text-end">€${item.costs.toLocaleString()}</td>
                <td class="text-end">${item.weight.toLocaleString()} kg</td>
                <td class="text-end">${item.volume.toFixed(1)} m³</td>
                <td class="text-end">€${item.avgCost.toFixed(2)}</td>
                <td class="text-end">
                    <span class="badge ${item.performance >= 90 ? 'bg-success' : item.performance >= 70 ? 'bg-warning' : 'bg-danger'}">
                        ${item.performance.toFixed(1)}%
                    </span>
                </td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-primary" onclick="metricsSystem.viewCarrierDetails('${item.name}')">
                        <i class="fas fa-eye"></i>
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
        // ✅ CALCOLA GIORNI DI CONSEGNA
    calculateDeliveryDays(shipment) {
        if (!shipment.delivery_date) return null;
        
        const startDate = new Date(shipment.created_at);
        const endDate = new Date(shipment.delivery_date);
        const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        
        return days > 0 && days < 365 ? days : null;
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
}

// ✅ ESPORTA SISTEMA (FUORI DALLA CLASSE!)
export default UnifiedMetricsSystem;