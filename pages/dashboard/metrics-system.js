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
                        trend: this.calculateTrend(kpi.id) // Calcolo trend separato
                    };
                }
            });
            
            // Calcola metriche avanzate
            const advancedMetrics = {
                trends: this.calculateTrends(),
                transportModes: this.calculateTransportModes(),
                carriersPerformance: this.calculateCarriersPerformance(),
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
    }

        // ✅ RENDERIZZA TABELLA CARRIERS - VERSIONE AGGIORNATA
    renderCarriersTable() {
        const tbody = document.getElementById('carriersDetailBody');
        if (!tbody || !this.processedMetrics.advanced.carriersPerformance) return;
        
        tbody.innerHTML = this.processedMetrics.advanced.carriersPerformance.map(item => `
            <tr>
                <td>
                    <div class="fw-semibold">${item.company}</div>
                    <small class="text-muted">${item.carrier}</small>
                </td>
                <td class="text-end">${item.shipments}</td>
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
}

// ✅ ESPORTA SISTEMA
export default UnifiedMetricsSystem;