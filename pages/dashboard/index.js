class Dashboard {
    constructor() {
        this.initialized = false;
        this.currentFilters = {};
        this.data = {};
        this.charts = {}; // ✅ AGGIUNGI per tenere traccia dei grafici
        window.dashboard = this;

        console.log('🎯 Dashboard Controller initialized');
    }

    async init() {
        if (this.initialized) return;

        try {
            console.log('🚀 Initializing Dashboard...');
            
            // 1. Attendi che i servizi siano pronti
            await this.waitForServices();
            
            // 2. Setup event listeners
            this.setupEventListeners();
            
            // 3. Carica dati iniziali
            console.log('📊 Loading initial dashboard data...');
            await this.loadInitialData();
            
            this.initialized = true;
            console.log('✅ Dashboard initialized successfully');
            
        } catch (error) {
            console.error('❌ Dashboard initialization error:', error);
            this.showError('Errore durante l\'inizializzazione del dashboard');
        }
    }

    async waitForServices(maxAttempts = 10) {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            console.log(`⏳ Attempt ${attempt}: Checking services...`);
            
            const status = {
                dataManager: !!window.dataManager,
                notificationSystem: !!window.notificationSystem,
                headerComponent: !!window.headerComponent,
                supabase: !!window.supabase
            };
            
            console.log('📊 Services status:', status);
            
            if (Object.values(status).every(Boolean)) {
                console.log('✅ All required services are available!');
                return true;
            }
            
            if (attempt === 5) {
                console.log('🔧 Force initializing DataManager...');
                try {
                    if (!window.dataManager) {
                        const { default: dataManager } = await import('/core/services/data-manager.js');
                        window.dataManager = dataManager;
                        console.log('✅ DataManager initialized successfully');
                    }
                } catch (error) {
                    console.error('❌ Error force initializing DataManager:', error);
                }
            }
            
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        throw new Error('Required services not available after maximum attempts');
    }

    setupEventListeners() {
        // Filter events
        const periodFilter = document.getElementById('periodFilter');
        const carrierFilter = document.getElementById('carrierFilter');
        const statusFilter = document.getElementById('statusFilter');
        
        if (periodFilter) {
            periodFilter.addEventListener('change', () => {
                this.currentFilters.period = parseInt(periodFilter.value);
            });
        }
        
        if (carrierFilter) {
            carrierFilter.addEventListener('change', () => {
                this.currentFilters.carrier = carrierFilter.value;
            });
        }
        
        if (statusFilter) {
            statusFilter.addEventListener('change', () => {
                this.currentFilters.status = statusFilter.value;
            });
        }
        
        console.log('🎯 Event listeners setup complete');
    }

    async loadInitialData() {
        console.log('📊 Loading initial dashboard data...');
        await this.loadDashboardData();
        await this.renderDashboard();
        console.log('✅ Initial data loaded:', this.data);
    }

    async loadDashboardData() {
        try {
            console.log('📊 Loading dashboard data...');
            
            // 1. Carica dati raw
            const trackings = await window.dataManager.getTrackings() || [];
            const shipments = await window.dataManager.getShipments() || [];
            const carriers = await window.dataManager.getCarriers() || [];
            const additionalCosts = await this.loadAdditionalCosts() || [];
            
            console.log('📊 Raw data loaded:', {
                trackings: trackings.length,
                shipments: shipments.length,
                carriers: carriers.length,
                additionalCosts: additionalCosts.length
            });
            
            // 2. Applica filtri ai dati (NON alle UI)
            const rawData = { trackings, shipments, carriers, additionalCosts };
            const filtered = this.applyDataFilters(rawData);
            
            // 3. Calcola aggregazioni
            this.data = this.calculateAggregations(filtered);
            
            console.log('✅ Dashboard data loaded successfully');
            
        } catch (error) {
            console.error('❌ Error loading dashboard data:', error);
            throw error;
        }
    }

    async refreshWithFilters() {
        console.log('🔄 Refreshing with filters...');
        
        try {
            // 1. Carica dati raw
            const trackings = await window.dataManager.getTrackings() || [];
            const shipments = await window.dataManager.getShipments() || [];
            const carriers = await window.dataManager.getCarriers() || [];
            const additionalCosts = await this.loadAdditionalCosts() || [];
            
            console.log('📊 Raw data loaded:', {
                trackings: trackings.length,
                shipments: shipments.length,
                carriers: carriers.length,
                additionalCosts: additionalCosts.length
            });
            
            // 2. Applica filtri
            const rawData = { trackings, shipments, carriers, additionalCosts };
            const filtered = this.applyDataFilters(rawData);
            
            // 3. Calcola aggregazioni
            this.data = this.calculateAggregations(filtered);
            
            // 4. Re-render
            await this.renderDashboard();
            
            console.log('✅ Refresh with filters complete');
            
        } catch (error) {
            console.error('❌ Error refreshing with filters:', error);
            throw error;
        }
    }

    async loadAdditionalCosts() {
        try {
            return await window.dataManager.getAdditionalCosts() || [];
        } catch (error) {
            console.warn('⚠️ Could not load additional costs:', error);
            return [];
        }
    }

    applyDataFilters(rawData) {
        // ✅ CONTROLLI DI SICUREZZA
        let { trackings = [], shipments = [], carriers = [], additionalCosts = [] } = rawData || {};
        
        console.log('🔽 Applying data filters to:', {
            trackings: trackings.length,
            shipments: shipments.length,
            carriers: carriers.length,
            additionalCosts: additionalCosts.length,
            filters: this.currentFilters
        });
        
        // Filtro per periodo
        if (this.currentFilters.period) {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - this.currentFilters.period);
            
            trackings = trackings.filter(t => t && new Date(t.created_at) >= cutoffDate);
            shipments = shipments.filter(s => s && new Date(s.created_at) >= cutoffDate);
            additionalCosts = additionalCosts.filter(c => c && new Date(c.created_at) >= cutoffDate);
        }
        
        // Filtro per carrier
        if (this.currentFilters.carrier) {
            trackings = trackings.filter(t => 
                t && (t.carrier_code === this.currentFilters.carrier || t.carrier_name === this.currentFilters.carrier)
            );
            shipments = shipments.filter(s => s && s.carrier_id === this.currentFilters.carrier);
        }
        
        // Filtro per status
        if (this.currentFilters.status) {
            trackings = trackings.filter(t => 
                t && (t.current_status === this.currentFilters.status || t.status === this.currentFilters.status)
            );
            shipments = shipments.filter(s => s && s.status === this.currentFilters.status);
        }
        
        const result = { trackings, shipments, carriers, additionalCosts };
        console.log('✅ Data filters applied, result:', {
            trackings: result.trackings.length,
            shipments: result.shipments.length,
            carriers: result.carriers.length,
            additionalCosts: result.additionalCosts.length
        });
        
        return result;
    }
        
        calculateAggregations(data) {
            console.log('📊 Starting calculateAggregations with:', data);
            
            const { trackings = [], shipments = [], carriers = [], additionalCosts = [] } = data;
            
            console.log('📊 Data counts:', {
                trackings: trackings.length,
                shipments: shipments.length,
                carriers: carriers.length,
                additionalCosts: additionalCosts.length
            });
        
            // Combina dati
            const combined = this.combineTrackingsAndShipments(trackings, shipments);
            console.log('📊 Combined data result:', combined);
        
            // Calcola costi
            const costs = this.calculateTotalCosts(combined, additionalCosts);
            console.log('📊 Costs result:', costs);
        
            // FIX: Calcola totali corretti
            const totalWeight = combined.reduce((sum, item) => sum + (item.weight || 0), 0);
            const totalVolume = combined.reduce((sum, item) => sum + (item.volume || 0), 0);
            
            // FIX: Conta carrier unici reali
            const uniqueCarriers = new Set();
            combined.forEach(item => {
                if (item.carrier_code && item.carrier_code !== 'UNKNOWN') {
                    uniqueCarriers.add(item.carrier_code);
                } else if (item.carrier_name && item.carrier_name !== 'N/A') {
                    uniqueCarriers.add(item.carrier_name);
                }
            });
        
            const result = {
                totalShipments: combined.length || 0,
                totalCosts: costs.total || 0,
                totalWeight: totalWeight || 0,
                totalVolume: totalVolume || 0,
                activeCarriers: uniqueCarriers.size || 0,
                
                // Trend e altre metriche
                trends: this.calculateTrends(combined) || [],
                transportModes: this.calculateTransportModes(combined) || [],
                carriersPerformance: this.calculateCarriersPerformance(combined, carriers) || []
            };
        
            console.log('📊 Aggregations result:', result);
            return result;
        }
        
    
    combineTrackingsAndShipments(trackings, shipments) {
        console.log('🔄 Combining data sources - DETAILED:', { 
            trackings: trackings.length, 
            shipments: shipments.length 
        });
    
        const combined = [];
        const trackingMap = new Map();
        
        // Mappa tracking per lookup veloce
        trackings.forEach((tracking, index) => {
            console.log(`📦 Mapped tracking ${index}:`, tracking.tracking_number);
            trackingMap.set(tracking.tracking_number, tracking);
            if (tracking.tracking_id) {
                trackingMap.set(tracking.tracking_id, tracking);
            }
        });
        
        console.log('🗺️ Tracking map size:', trackingMap.size);
    
        // Combina shipments con tracking
        shipments.forEach((shipment, index) => {
            console.log(`🚢 Processing shipment ${index}:`, shipment);
            
            // Cerca tracking by tracking_number o tracking_id
            let tracking = null;
            if (shipment.tracking_number) {
                tracking = trackingMap.get(shipment.tracking_number);
            }
            if (!tracking && shipment.tracking_id) {
                tracking = trackingMap.get(shipment.tracking_id);
            }
    
            // FIX: Usa dati reali dai campi corretti
            const item = {
                id: shipment.id,
                shipment_number: shipment.shipment_number,
                tracking_number: shipment.tracking_number || tracking?.tracking_number,
                
                // COSTI: usa i campi corretti dalla spedizione
                freight_cost: parseFloat(shipment.freight_cost) || 0,
                other_costs: parseFloat(shipment.other_costs) || 0,
                cost: (parseFloat(shipment.freight_cost) || 0) + (parseFloat(shipment.other_costs) || 0),
                
                // PESO E VOLUME: prioritizza spedizione poi tracking
                weight: parseFloat(shipment.total_weight_kg) || 
                        parseFloat(tracking?.total_weight_kg) || 0,
                volume: parseFloat(shipment.total_volume_cbm) || 
                        parseFloat(tracking?.total_volume_cbm) || 0,
                        
                // STATUS: usa il più recente
                status: shipment.status || tracking?.current_status || tracking?.status || 'registered',
                
                // CARRIER: usa dati dalla spedizione o tracking
                carrier_name: shipment.carrier_name || tracking?.carrier_name || 'N/A',
                carrier_code: tracking?.carrier_code || 'UNKNOWN',
                
                // DATE
                created_at: shipment.created_at,
                eta: shipment.eta || tracking?.eta,
                
                // RAW DATA per debug
                shipment_data: shipment,
                tracking_data: tracking
            };
            
            combined.push(item);
        });
    
        // Aggiungi tracking senza spedizioni (se presenti)
        trackings.forEach(tracking => {
            const hasShipment = shipments.some(s => 
                s.tracking_number === tracking.tracking_number || 
                s.tracking_id === tracking.id
            );
            
            if (!hasShipment) {
                combined.push({
                    id: tracking.id,
                    tracking_number: tracking.tracking_number,
                    cost: 0, // Tracking senza spedizioni = costo 0
                    freight_cost: 0,
                    other_costs: 0,
                    weight: parseFloat(tracking.total_weight_kg) || 0,
                    volume: parseFloat(tracking.total_volume_cbm) || 0,
                    status: tracking.current_status || tracking.status || 'registered',
                    carrier_name: tracking.carrier_name || 'N/A',
                    carrier_code: tracking.carrier_code || 'UNKNOWN',
                    created_at: tracking.created_at,
                    eta: tracking.eta,
                    is_tracking_only: true,
                    tracking_data: tracking
                });
            }
        });
    
        console.log('✅ Combined final result:', combined);
        return combined;
    }
    
    calculateTotalCosts(combined, additionalCosts) {
        console.log('💰 Calculating total costs:', { 
            combined: combined.length, 
            additionalCosts: additionalCosts.length 
        });
    
        // Calcola costi dalle spedizioni
        let shipmentsTotal = 0;
        combined.forEach(item => {
            const itemCost = item.cost || 0;
            shipmentsTotal += itemCost;
            
            if (itemCost > 0) {
                console.log(`💰 Item ${item.shipment_number || item.tracking_number}: €${itemCost}`);
            }
        });
    
        // Calcola costi aggiuntivi
        const additionalTotal = additionalCosts.reduce((sum, cost) => {
            return sum + (parseFloat(cost.amount) || 0);
        }, 0);
    
        const result = {
            shipments: shipmentsTotal,
            additional: additionalTotal,
            total: shipmentsTotal + additionalTotal
        };
    
        console.log('💰 Costs result:', result);
        return result;
    }
    
        calculateTrends(combined) {
        console.log('📈 Calculating trends for:', combined.length, 'items');
        
        // ✅ Inizializza ultimi 12 mesi
        const now = new Date();
        const trends = {};
        
        // Crea struttura per ultimi 12 mesi
        for (let i = 11; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            trends[key] = {
                month: key,
                monthName: date.toLocaleDateString('it-IT', { month: 'short', year: '2-digit' }),
                shipments: 0,
                costs: 0,
                weight: 0,
                volume: 0
            };
        }
        
        console.log('📈 Initialized trends structure:', Object.keys(trends));
        
        // ✅ Aggrega dati per mese
        combined.forEach((item, index) => {
            try {
                if (!item.created_at) {
                    console.warn(`⚠️ Item ${index} missing created_at:`, item);
                    return;
                }
                
                const date = new Date(item.created_at);
                
                // ✅ CONTROLLO VALIDITÀ DATA
                if (isNaN(date.getTime())) {
                    console.warn(`⚠️ Invalid date for item ${index}:`, item.created_at);
                    return;
                }
                
                const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                
                if (trends[key]) {
                    trends[key].shipments++;
                    trends[key].costs += parseFloat(item.cost) || 0;
                    trends[key].weight += parseFloat(item.weight) || 0;
                    trends[key].volume += parseFloat(item.volume) || 0;
                    
                    console.log(`📈 Added to ${key}:`, {
                        shipments: trends[key].shipments,
                        costs: trends[key].costs
                    });
                } else {
                    console.log(`📈 Month ${key} not in range, skipping`);
                }
                
            } catch (error) {
                console.warn(`⚠️ Error processing item ${index}:`, error, item);
            }
        });
        
        // ✅ Filtra solo mesi con dati + ultimi 6 mesi sempre
        const result = Object.values(trends)
            .slice(-6) // Prendi sempre ultimi 6 mesi
            .map(trend => ({
                ...trend,
                label: trend.monthName
            }));
        
        console.log('📈 Final trends result:', result);
        return result;
    }
    
    calculateTransportModes(combined) {
        console.log('🚚 Calculating transport modes for:', combined.length, 'items');
        
        const modes = {};
        
        combined.forEach(item => {
            // FIX: Determina modalità dal tracking_type se disponibile
            let mode = 'Stradale'; // Default
            
            const trackingData = item.tracking_data;
            if (trackingData?.tracking_type) {
                switch (trackingData.tracking_type) {
                    case 'container':
                    case 'bl':
                        mode = 'Marittimo';
                        break;
                    case 'awb':
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
                modes[mode] = { name: mode, count: 0, revenue: 0 };
            }
            
            modes[mode].count++;
            modes[mode].revenue += item.cost || 0;
        });
        
        const result = Object.values(modes);
        console.log('🚚 Transport modes calculated:', result);
        return result;
    }
    
    calculateCarriersPerformance(combined, carriers) {
        // ✅ Raggruppa per carrier
        const carrierStats = {};
        
        combined.forEach(item => {
            const carrierCode = item.carrier_code || 'UNKNOWN';
            
            if (!carrierStats[carrierCode]) {
                carrierStats[carrierCode] = {
                    code: carrierCode,
                    name: item.carrier_name || carrierCode,
                    shipments: 0,
                    revenue: 0,
                    weight: 0,
                    volume: 0,
                    delivered: 0
                };
            }
            
            const stats = carrierStats[carrierCode];
            stats.shipments++;
            stats.revenue += parseFloat(item.cost) || 0;
            stats.weight += parseFloat(item.weight) || 0;
            stats.volume += parseFloat(item.volume) || 0;
            
            if (item.status === 'delivered' || item.status === 'consegnato') {
                stats.delivered++;
            }
        });

        // ✅ Calcola metriche aggiuntive
        return Object.values(carrierStats).map(carrier => ({
            ...carrier,
            avgCost: carrier.shipments > 0 ? carrier.revenue / carrier.shipments : 0,
            performance: carrier.shipments > 0 ? (carrier.delivered / carrier.shipments) * 100 : 0
        }));
    }

        async renderDashboard() {
        try {
            console.log('🎨 Rendering dashboard...');
            
            // ✅ Renderizza tutti i componenti
            console.log('🎯 Calling renderKPICards...');
            this.renderKPICards();
            
            console.log('🎯 Calling renderCharts...');
            this.renderCharts();
            
            console.log('🎯 Calling renderTables...');
            this.renderTables();
            
            console.log('🎯 Calling populateFilterDropdowns...');
            this.populateFilterDropdowns();
            
            console.log('✅ Dashboard rendered successfully');
            
        } catch (error) {
            console.error('❌ Error rendering dashboard:', error);
            throw error;
        }
    }

        renderKPICards() {
        console.log('🎯 Starting renderKPICards...');
        console.log('🎯 Data object:', this.data);
        console.log('🎯 Data properties:', Object.keys(this.data));
        
        const container = document.getElementById('kpiCards');
        if (!container) {
            console.error('❌ KPI container not found!');
            return;
        }
        
        console.log('🎯 KPI container found:', container);
        
        // ✅ VERIFICA CHE I DATI ESISTANO
        const totalShipments = this.data.totalShipments || 0;
        const totalCosts = this.data.totalCosts || 0;
        const totalWeight = this.data.totalWeight || 0;
        const totalVolume = this.data.totalVolume || 0;
        const activeCarriers = this.data.activeCarriers || 0;
        
        console.log('🎯 KPI Values:', {
            totalShipments,
            totalCosts,
            totalWeight,
            totalVolume,
            activeCarriers
        });
        
        const kpiCards = [
            {
                label: 'Spedizioni',
                value: totalShipments.toLocaleString(),
                growth: 12.5,
                icon: 'fas fa-shipping-fast',
                color: '#6366f1'
            },
            {
                label: 'Costi Totali',
                value: `€${totalCosts.toLocaleString()}`,
                growth: 8.2,
                icon: 'fas fa-euro-sign',
                color: '#ef4444'
            },
            {
                label: 'Peso (kg)',
                value: `${totalWeight.toLocaleString()}`,
                growth: -3.1,
                icon: 'fas fa-weight-hanging',
                color: '#f59e0b'
            },
            {
                label: 'Volume (m³)',
                value: `${totalVolume.toFixed(1)}`,
                growth: 5.7,
                icon: 'fas fa-cube',
                color: '#8b5cf6'
            },
            {
                label: 'Spedizionieri',
                value: activeCarriers.toString(),
                growth: 15.3,
                icon: 'fas fa-truck',
                color: '#06b6d4'
            },
            {
                label: 'Costo Medio',
                value: totalShipments > 0 ? 
                    `€${(totalCosts / totalShipments).toFixed(2)}` : '€0',
                growth: -2.4,
                icon: 'fas fa-calculator',
                color: '#10b981'
            }
        ];
    
        console.log('🎯 KPI Cards data:', kpiCards);
    
        // ✅ LAYOUT GRIGLIA QUADRATA CON WRAPPER
        const html = kpiCards.map((kpi, index) => `
            <div class="kpi-card-wrapper" data-kpi-index="${index}">
                <div class="kpi-card sortable-card" draggable="true">
                    <div class="drag-handle">
                        <i class="fas fa-grip-vertical"></i>
                    </div>
                    <div class="kpi-icon-small" style="background-color: ${kpi.color};">
                        <i class="${kpi.icon}"></i>
                    </div>
                    <div class="kpi-label-small">${kpi.label}</div>
                    <div class="kpi-value-small">${kpi.value}</div>
                    <div class="growth-indicator-small ${kpi.growth >= 0 ? 'growth-positive' : 'growth-negative'}">
                        <i class="fas fa-arrow-${kpi.growth >= 0 ? 'up' : 'down'} me-1"></i>
                        ${Math.abs(kpi.growth).toFixed(1)}%
                    </div>
                </div>
            </div>
        `).join('');
    
        console.log('🎯 Generated HTML:', html.substring(0, 200) + '...');
        
        container.innerHTML = html;
        
        console.log('✅ KPI Cards rendered successfully');
    
        // ✅ INIZIALIZZA SORTABLE
        this.initializeSortableKPIs();
    }

        renderCharts() {
        console.log('📊 Starting to render charts...');
        console.log('📊 Trends data:', this.data.trends);
        console.log('📊 Transport modes data:', this.data.transportModes);
        
        this.renderTrendChart();
        this.renderTransportModeChart();
        
        console.log('📊 Charts rendering complete');
    }

                renderTrendChart() {
            const ctx = document.getElementById('trendChart');
            if (!ctx) {
                console.error('❌ Trend chart canvas not found');
                return;
            }
            
            if (!this.data.trends || this.data.trends.length === 0) {
                console.error('❌ No trends data available');
                return;
            }
            
            console.log('📊 Rendering trend chart with data:', this.data.trends);
        
            // ✅ DISTRUGGI grafico esistente
            if (this.charts.trendChart) {
                this.charts.trendChart.destroy();
            }
        
            try {
                this.charts.trendChart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: this.data.trends.map(t => t.label || t.month), // ✅ USA LABEL MIGLIORATI
                        datasets: [{
                            label: 'Spedizioni',
                            data: this.data.trends.map(t => t.shipments),
                            borderColor: '#6366f1',
                            backgroundColor: 'rgba(99, 102, 241, 0.1)',
                            tension: 0.4,
                            borderWidth: 3, // ✅ AUMENTATO
                            pointRadius: 5, // ✅ AUMENTATO
                            pointHoverRadius: 8,
                            pointBackgroundColor: '#6366f1',
                            pointBorderColor: '#ffffff',
                            pointBorderWidth: 2,
                            fill: true
                        }, {
                            label: 'Costi (€)',
                            data: this.data.trends.map(t => t.costs),
                            borderColor: '#ef4444',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            tension: 0.4,
                            borderWidth: 3, // ✅ AUMENTATO
                            pointRadius: 5, // ✅ AUMENTATO
                            pointHoverRadius: 8,
                            pointBackgroundColor: '#ef4444',
                            pointBorderColor: '#ffffff',
                            pointBorderWidth: 2,
                            yAxisID: 'y1',
                            fill: true
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        interaction: {
                            mode: 'index',
                            intersect: false,
                        },
                        plugins: {
                            legend: {
                                position: 'top',
                                labels: {
                                    usePointStyle: true,
                                    padding: 20,
                                    font: {
                                        size: 13, // ✅ AUMENTATO
                                        weight: '500'
                                    }
                                }
                            },
                            tooltip: {
                                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                titleFont: {
                                    size: 14
                                },
                                bodyFont: {
                                    size: 13
                                },
                                padding: 12,
                                cornerRadius: 8
                            }
                        },
                        scales: {
                            y: {
                                type: 'linear',
                                display: true,
                                position: 'left',
                                grid: {
                                    color: 'rgba(0,0,0,0.05)',
                                    lineWidth: 1
                                },
                                ticks: {
                                    font: {
                                        size: 12
                                    },
                                    color: '#64748b'
                                },
                                title: {
                                    display: true,
                                    text: 'Spedizioni',
                                    font: {
                                        size: 12,
                                        weight: '600'
                                    },
                                    color: '#6366f1'
                                }
                            },
                            y1: {
                                type: 'linear',
                                display: true,
                                position: 'right',
                                grid: {
                                    drawOnChartArea: false,
                                },
                                ticks: {
                                    font: {
                                        size: 12
                                    },
                                    color: '#64748b',
                                    callback: function(value) {
                                        return '€' + value.toLocaleString();
                                    }
                                },
                                title: {
                                    display: true,
                                    text: 'Costi (€)',
                                    font: {
                                        size: 12,
                                        weight: '600'
                                    },
                                    color: '#ef4444'
                                }
                            },
                            x: {
                                grid: {
                                    color: 'rgba(0,0,0,0.05)',
                                    lineWidth: 1
                                },
                                ticks: {
                                    font: {
                                        size: 12
                                    },
                                    color: '#64748b'
                                }
                            }
                        }
                    }
                });
                
                console.log('✅ Trend chart rendered successfully');
                
            } catch (error) {
                console.error('❌ Error rendering trend chart:', error);
            }
        }

        renderTransportModeChart() {
        const ctx = document.getElementById('transportModeChart');
        if (!ctx) {
            console.error('❌ Transport mode chart canvas not found');
            return;
        }
        
        if (!this.data.transportModes || this.data.transportModes.length === 0) {
            console.error('❌ No transport modes data available');
            return;
        }
        
        console.log('📊 Rendering transport mode chart with data:', this.data.transportModes);
    
        // ✅ DISTRUGGI grafico esistente
        if (this.charts.transportModeChart) {
            this.charts.transportModeChart.destroy();
        }
    
        try {
            this.charts.transportModeChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: this.data.transportModes.map(t => t.name),
                    datasets: [{
                        data: this.data.transportModes.map(t => t.count),
                        backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
                        borderWidth: 2,
                        borderColor: '#fff',
                        hoverBorderWidth: 3
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    layout: {
                        padding: {
                            top: 10,
                            bottom: 10,
                            left: 10,
                            right: 10
                        }
                    },
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 8,
                                usePointStyle: true,
                                font: {
                                    size: 10
                                },
                                boxWidth: 12,
                                boxHeight: 12
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = ((context.parsed / total) * 100).toFixed(1);
                                    return `${context.label}: ${context.parsed} (${percentage}%)`;
                                }
                            }
                        }
                    },
                    cutout: '55%'
                }
            });
            
            console.log('✅ Transport mode chart rendered successfully');
            
        } catch (error) {
            console.error('❌ Error rendering transport mode chart:', error);
        }
    }

    renderTables() {
        this.renderCarriersDetailTable();
    }

    renderCarriersDetailTable() {
        const tbody = document.getElementById('carriersDetailBody');
        if (!tbody || !this.data.carriersPerformance) return;

        tbody.innerHTML = this.data.carriersPerformance.map(carrier => `
            <tr>
                <td>
                    <div class="d-flex align-items-center">
                        <i class="fas fa-truck text-primary me-2"></i>
                        <div>
                            <div class="fw-semibold">${carrier.name}</div>
                            <small class="text-muted">${carrier.code}</small>
                        </div>
                    </div>
                </td>
                <td class="text-end">${carrier.shipments.toLocaleString()}</td>
                <td class="text-end">€${carrier.revenue.toLocaleString()}</td>
                <td class="text-end">${carrier.weight.toLocaleString()}</td>
                <td class="text-end">${carrier.volume.toFixed(2)}</td>
                <td class="text-end">€${carrier.avgCost.toFixed(2)}</td>
                <td class="text-end">
                    <span class="badge ${this.getPerformanceBadgeClass(carrier.performance)}">
                        ${carrier.performance.toFixed(1)}%
                    </span>
                </td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-primary" onclick="dashboard.viewCarrierDetails('${carrier.code}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    getPerformanceBadgeClass(performance) {
        if (performance >= 95) return 'bg-success';
        if (performance >= 85) return 'bg-warning';
        return 'bg-danger';
    }

    populateFilterDropdowns() {
        // Popola dropdown carriers
        const carrierFilter = document.getElementById('carrierFilter');
        if (carrierFilter && this.data.carriersPerformance) {
            const carrierOptions = this.data.carriersPerformance.map(carrier => 
                `<option value="${carrier.code}">${carrier.name}</option>`
            ).join('');
            
            carrierFilter.innerHTML = '<option value="">Tutti gli spedizionieri</option>' + carrierOptions;
        }
    }

    viewCarrierDetails(carrierCode) {
        console.log('👁️ View carrier details function called:', carrierCode);
        
        try {
            // ✅ TROVA dati del carrier
            const carrierData = this.data.carriersPerformance.find(c => 
                c.code === carrierCode || 
                c.name === carrierCode ||
                c.id === carrierCode
            );
            
            console.log('📊 Carrier data found:', carrierData);
            
            if (!carrierData) {
                window.notificationSystem?.warning(`Nessun dato trovato per ${carrierCode}`);
                return;
            }
            
            // ✅ CREA CONTENUTO MODALE CON PROPRIETÀ CORRETTE
            const modalContent = `
                <div class="row g-3">
                    <div class="col-12">
                        <h5 class="mb-3">
                            <i class="fas fa-truck me-2"></i>
                            Dettagli ${carrierData.name || carrierCode}
                        </h5>
                    </div>
                    
                    <div class="col-md-6">
                        <div class="card">
                            <div class="card-body text-center">
                                <h3 class="text-primary">${carrierData.shipments || 0}</h3>
                                <small class="text-muted">Spedizioni Totali</small>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-6">
                        <div class="card">
                            <div class="card-body text-center">
                                <h3 class="text-success">€${(carrierData.revenue || 0).toLocaleString()}</h3>
                                <small class="text-muted">Fatturato Totale</small>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-6">
                        <div class="card">
                            <div class="card-body text-center">
                                <h3 class="text-warning">${(carrierData.weight || 0).toLocaleString()} kg</h3>
                                <small class="text-muted">Peso Totale</small>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-6">
                        <div class="card">
                            <div class="card-body text-center">
                                <h3 class="text-info">${(carrierData.volume || 0).toFixed(2)} m³</h3>
                                <small class="text-muted">Volume Totale</small>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-6">
                        <div class="card">
                            <div class="card-body text-center">
                                <h3 class="text-dark">€${(carrierData.avgCost || 0).toFixed(2)}</h3>
                                <small class="text-muted">Costo Medio per Spedizione</small>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-6">
                        <div class="card">
                            <div class="card-body text-center">
                                <h3 class="text-success">${(carrierData.performance || 0).toFixed(1)}%</h3>
                                <small class="text-muted">Performance Consegne</small>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // ✅ CONTROLLA se ModalSystem è disponibile
            if (window.ModalSystem) {
                window.ModalSystem.show({
                    title: `Dettagli Spedizioniere`,
                    body: modalContent,
                    size: 'lg',
                    buttons: [
                        {
                            text: 'Chiudi',
                            class: 'btn-secondary',
                            action: 'close'
                        }
                    ]
                });
            } else {
                // ✅ FALLBACK con alert
                alert(`Dettagli ${carrierData.name}:\nSpedizioni: ${carrierData.shipments}\nFatturato: €${(carrierData.revenue || 0).toLocaleString()}`);
            }
            
        } catch (error) {
            console.error('❌ Error viewing carrier details:', error);
            window.notificationSystem?.error('Errore durante il caricamento dei dettagli');
        }
    }

    initializeSortableKPIs() {
        const container = document.getElementById('kpiCards');
        if (!container) return;

        let draggedElement = null;

        container.addEventListener('dragstart', (e) => {
            if (e.target.closest('.sortable-card')) {
                draggedElement = e.target.closest('.kpi-card-wrapper');
                draggedElement.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            }
        });

        container.addEventListener('dragend', (e) => {
            if (draggedElement) {
                draggedElement.classList.remove('dragging');
                draggedElement = null;
            }
        });

        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });

        container.addEventListener('drop', (e) => {
            e.preventDefault();
            const dropTarget = e.target.closest('.kpi-card-wrapper');
            
            if (dropTarget && draggedElement && dropTarget !== draggedElement) {
                const allCards = Array.from(container.children);
                const draggedIndex = allCards.indexOf(draggedElement);
                const dropIndex = allCards.indexOf(dropTarget);
                
                if (draggedIndex < dropIndex) {
                    dropTarget.parentNode.insertBefore(draggedElement, dropTarget.nextSibling);
                } else {
                    dropTarget.parentNode.insertBefore(draggedElement, dropTarget);
                }
                
                this.saveKPIOrder();
                window.notificationSystem?.success('Ordine KPI aggiornato!');
            }
        });

        this.loadKPIOrder();
    }

    saveKPIOrder() {
        const container = document.getElementById('kpiCards');
        if (!container) return;
        
        const order = Array.from(container.children).map(card => 
            card.getAttribute('data-kpi-index')
        );
        
        localStorage.setItem('dashboard-kpi-order', JSON.stringify(order));
    }

    loadKPIOrder() {
        const savedOrder = localStorage.getItem('dashboard-kpi-order');
        if (!savedOrder) return;
        
        try {
            const order = JSON.parse(savedOrder);
            const container = document.getElementById('kpiCards');
            if (!container) return;
            
            const cards = Array.from(container.children);
            
            order.forEach((index, position) => {
                const card = cards.find(c => c.getAttribute('data-kpi-index') === index);
                if (card) {
                    container.appendChild(card);
                }
            });
        } catch (error) {
            console.warn('Error loading KPI order:', error);
        }
    }

    async applyFilters() {
        try {
            this.showLoading('Applicando filtri...');
            
            // Invece, ricarica solo i dati con i nuovi filtri
            await this.refreshWithFilters();
            
            this.hideLoading();
            
        } catch (error) {
            console.error('❌ Error applying filters:', error);
            this.showError('Errore durante l\'applicazione dei filtri');
            this.hideLoading();
        }
    }

    async refresh(silent = false) {
        try {
            if (!silent) {
                this.showLoading('Aggiornamento in corso...');
            }
            
            await this.loadDashboardData();
            await this.renderDashboard();
            
            if (!silent) {
                this.hideLoading();
                window.notificationSystem?.success('Dashboard aggiornata!');
            }
            
        } catch (error) {
            console.error('❌ Error refreshing dashboard:', error);
            this.showError('Errore durante l\'aggiornamento');
            this.hideLoading();
        }
    }

    async exportToExcel() {
        try {
            window.notificationSystem?.info('Funzione di export in sviluppo...');
        } catch (error) {
            console.error('❌ Error exporting:', error);
            this.showError('Errore durante l\'export');
        }
    }

    showLoading(message = 'Caricamento...') {
        const overlay = document.getElementById('loadingOverlay');
        const messageEl = document.getElementById('loadingMessage');
        
        if (overlay) {
            overlay.classList.remove('d-none');
            if (messageEl) messageEl.textContent = message;
        }
    }

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.add('d-none');
        }
    }

    showError(message) {
        if (window.notificationSystem) {
            window.notificationSystem.error(message);
        } else {
            console.error(message);
        }
    }
}

// ✅ Auto-inizializzazione
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const dashboard = new Dashboard();
        await dashboard.init();
        console.log('✅ Dashboard ready!');
    } catch (error) {
        console.error('❌ Failed to initialize dashboard:', error);
    }
});