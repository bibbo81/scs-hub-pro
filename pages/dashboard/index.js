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
            this.showLoading('Inizializzazione dashboard...');
            
            // 1. Aspetta che i servizi core siano pronti
            await this.waitForServices();
            
            // 2. Setup event listeners
            this.setupEventListeners();
            
            // 3. Carica dati iniziali
            await this.loadInitialData();
            
            // 4. Render dashboard
            await this.renderDashboard();
            
            this.initialized = true;
            this.hideLoading();
            
            console.log('✅ Dashboard initialized successfully');
            
        } catch (error) {
            console.error('❌ Dashboard initialization error:', error);
            this.showError('Errore durante l\'inizializzazione della dashboard');
            this.hideLoading();
        }
    }

        async waitForServices() {
        let attempts = 0;
        const maxAttempts = 100; // Aumentato
        
        while (attempts < maxAttempts) {
            console.log(`⏳ Attempt ${attempts + 1}: Checking services...`);
            
            // Verifica servizi base
            const hasDataManager = !!window.dataManager;
            const hasHeaderComponent = !!window.headerComponent;
            const hasSupabase = !!window.supabase;
            
            console.log(`📊 Services status:`, {
                dataManager: hasDataManager,
                headerComponent: hasHeaderComponent,
                supabase: hasSupabase
            });
            
            if (hasDataManager && hasHeaderComponent && hasSupabase) {
                // Forza inizializzazione dataManager se necessario
                if (window.dataManager && typeof window.dataManager.init === 'function') {
                    if (!window.dataManager.initialized) {
                        console.log('🔧 Force initializing DataManager...');
                        try {
                            await window.dataManager.init();
                            console.log('✅ DataManager initialized successfully');
                        } catch (error) {
                            console.warn('⚠️ DataManager init failed, but continuing:', error);
                        }
                    }
                }
                
                // Forza inizializzazione headerComponent se necessario
                if (window.headerComponent && typeof window.headerComponent.init === 'function') {
                    if (!window.headerComponent.initialized) {
                        console.log('🔧 Force initializing HeaderComponent...');
                        try {
                            await window.headerComponent.init();
                            console.log('✅ HeaderComponent initialized successfully');
                        } catch (error) {
                            console.warn('⚠️ HeaderComponent init failed, but continuing:', error);
                        }
                    }
                }
                
                console.log('✅ All required services are available!');
                return;
            }
            
            await new Promise(resolve => setTimeout(resolve, 150));
            attempts++;
        }
        
        // Se arriviamo qui, mostra stato dettagliato
        console.warn('⚠️ Services timeout - current state:');
        console.log('- window.dataManager:', window.dataManager);
        console.log('- window.dataManager?.initialized:', window.dataManager?.initialized);
        console.log('- window.headerComponent:', window.headerComponent);
        console.log('- window.headerComponent?.initialized:', window.headerComponent?.initialized);
        console.log('- window.supabase:', !!window.supabase);
        
        // NON lanciare errore, continua in modalità degradata
        console.warn('⚠️ Continuing in degraded mode...');
    }

    setupEventListeners() {
        // Filtri
        document.getElementById('periodFilter')?.addEventListener('change', () => this.applyFilters());
        document.getElementById('carrierFilter')?.addEventListener('change', () => this.applyFilters());
        document.getElementById('statusFilter')?.addEventListener('change', () => this.applyFilters());
        
        // Auto-refresh ogni 5 minuti
        setInterval(() => {
            if (this.initialized) {
                this.refresh(true); // silent refresh
            }
        }, 300000);

        console.log('🎯 Event listeners setup complete');
    }

    async loadInitialData() {
        console.log('📊 Loading initial dashboard data...');
        
        try {
            // Carica dati con filtri di default (ultimi 30 giorni)
            this.currentFilters = {
                period: 30,
                status: '',
                carrier: ''
            };

            // Carica tutti i dati necessari dal DataManager
            await this.loadDashboardData();
            console.log('✅ Initial data loaded:', this.data);
            
        } catch (error) {
            console.error('❌ Error loading initial data:', error);
            throw error;
        }
    }

                async loadDashboardData() {
            console.log('📊 Loading dashboard data...');
            
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
                
                // 2. Applica filtri ai dati (NON alle UI)
                const rawData = { trackings, shipments, carriers, additionalCosts };
                const filtered = this.applyDataFilters(rawData); // ✅ NUOVO NOME
                
                // 3. Calcola aggregazioni
                this.data = this.calculateAggregations(filtered);
                
                console.log('✅ Dashboard data loaded successfully');
                
            } catch (error) {
                console.error('❌ Error loading dashboard data:', error);
                
                // Fallback con dati vuoti
                this.data = {
                    totalShipments: 0,
                    totalCosts: 0,
                    totalWeight: 0,
                    totalVolume: 0,
                    activeCarriers: 0,
                    trends: [],
                    transportModes: [],
                    carriersPerformance: [],
                    carriers: []
                };
                
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
        const filtered = this.applyDataFilters(rawData); // ✅ NUOVO NOME
        
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
            const { data, error } = await window.supabase
                .from('additional_costs')
                .select('*')
                .eq('organization_id', window.dataManager.organizationId);

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error loading additional costs:', error);
            return [];
        }
    }

                applyDataFilters(rawData) { // ✅ CAMBIATO NOME da "applyFilters" a "applyDataFilters"
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
            
            // ✅ CONTROLLI DI SICUREZZA
            const { trackings = [], shipments = [], carriers = [], additionalCosts = [] } = data || {};
            
            console.log('📊 Data counts:', {
                trackings: trackings.length,
                shipments: shipments.length,
                carriers: carriers.length,
                additionalCosts: additionalCosts.length
            });
            
            // Combina tracking e shipments
            const combinedData = this.combineDataSources(trackings, shipments);
            
            console.log('📊 Combined data result:', {
                combinedDataLength: combinedData?.length || 0
            });
            
            // ✅ FALLBACK per dati vuoti
            const safeCombinedData = combinedData || [];
            const safeAdditionalCosts = additionalCosts || [];
            
            const result = {
                // Raw data
                trackings,
                shipments: safeCombinedData,
                carriers,
                additionalCosts: safeAdditionalCosts,
                
                // KPI CORRETTI con controlli di sicurezza
                totalShipments: safeCombinedData.length,
                totalCosts: this.calculateTotalCosts(safeCombinedData, safeAdditionalCosts),
                totalWeight: safeCombinedData.reduce((sum, s) => sum + (s?.total_weight_kg || 0), 0),
                totalVolume: safeCombinedData.reduce((sum, s) => sum + (s?.total_volume_cbm || 0), 0),
                activeCarriers: new Set(safeCombinedData.map(s => s?.carrier_id || s?.carrier_code).filter(Boolean)).size,
                
                // Analisi CORRETTE con controlli di sicurezza
                trends: this.calculateTrends(safeCombinedData),
                transportModes: this.calculateTransportModes(safeCombinedData),
                carriersPerformance: this.calculateCarriersPerformance(safeCombinedData, carriers),
                topRoutes: this.calculateTopRoutes(safeCombinedData)
            };
            
            console.log('📊 Aggregations result:', result);
            return result;
        }

   combineDataSources(trackings, shipments) {
    const combined = [];
    const trackingMap = new Map();
    
    // ✅ CONTROLLI DI SICUREZZA
    const safeTrackings = trackings || [];
    const safeShipments = shipments || [];
    
    console.log('🔄 Combining data sources - DETAILED:', {
        trackingsCount: safeTrackings.length,
        shipmentsCount: safeShipments.length,
        trackingsSample: safeTrackings.slice(0, 2),
        shipmentsSample: safeShipments.slice(0, 2)
    });
    
    // Mappa trackings per lookup veloce
    safeTrackings.forEach((t, index) => {
        if (t && t.tracking_number) {
            trackingMap.set(t.tracking_number, t);
            console.log(`📦 Mapped tracking ${index}:`, t.tracking_number);
        } else {
            console.warn(`⚠️ Invalid tracking at index ${index}:`, t);
        }
    });
    
    console.log('🗺️ Tracking map size:', trackingMap.size);
    
    // Combina shipments con trackings
    safeShipments.forEach((shipment, index) => {
        if (!shipment) {
            console.warn(`⚠️ Invalid shipment at index ${index}`);
            return;
        }
        
        const tracking = trackingMap.get(shipment.tracking_number);
        console.log(`🚢 Processing shipment ${index}:`, {
            tracking_number: shipment.tracking_number,
            hasTracking: !!tracking,
            shipmentKeys: Object.keys(shipment)
        });
        
        combined.push({
            ...shipment,
            // Merge dei dati tracking
            current_status: shipment.status || tracking?.current_status || tracking?.status,
            carrier_name: shipment.carrier_name || tracking?.carrier_name,
            carrier_code: tracking?.carrier_code,
            origin_port: shipment.origin || tracking?.origin_port,
            destination_port: shipment.destination || tracking?.destination_port,
            total_weight_kg: shipment.total_weight_kg || tracking?.total_weight_kg || 0,
            total_volume_cbm: shipment.total_volume_cbm || tracking?.total_volume_cbm || 0,
            tracking_type: tracking?.tracking_type,
            tracking_data: tracking
        });
    });
    
    // Aggiungi tracking senza shipments
    safeTrackings.forEach((tracking, index) => {
        if (!tracking || !tracking.tracking_number) {
            console.warn(`⚠️ Invalid tracking for standalone at index ${index}`);
            return;
        }
        
        const hasShipment = safeShipments.some(s => s && s.tracking_number === tracking.tracking_number);
        if (!hasShipment) {
            console.log(`📦 Adding standalone tracking:`, tracking.tracking_number);
            combined.push({
                ...tracking,
                freight_cost: 0,
                other_costs: 0,
                total_cost: 0,
                is_tracking_only: true
            });
        }
    });
    
    console.log('✅ Combined final result:', {
        count: combined.length,
        firstRecord: combined[0],
        allRecords: combined
    });
    
    return combined;
}

                calculateTotalCosts(shipments, additionalCosts) {
            // ✅ CONTROLLI DI SICUREZZA
            const safeShipments = shipments || [];
            const safeAdditionalCosts = additionalCosts || [];
            
            console.log('💰 Calculating total costs:', {
                shipmentsCount: safeShipments.length,
                additionalCostsCount: safeAdditionalCosts.length
            });
            
            const shipmentsCosts = safeShipments.reduce((total, s) => 
                total + (s?.freight_cost || 0) + (s?.other_costs || 0), 0);
            
            const additionalTotalCosts = safeAdditionalCosts.reduce((total, c) => 
                total + (c?.amount || 0), 0);
            
            const totalCosts = shipmentsCosts + additionalTotalCosts;
            
            console.log('💰 Costs result:', {
                shipmentsCosts,
                additionalTotalCosts,
                totalCosts
            });
            
            return totalCosts;
        }

        calculateTrends(shipments) {
        const trends = {};
        const now = new Date();
        
        // Inizializza ultimi 12 mesi
        for (let i = 11; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            trends[monthKey] = {
                month: date.toLocaleDateString('it-IT', { month: 'short', year: 'numeric' }),
                shipments: 0,
                costs: 0 // ✅ CAMBIATO da "revenue" a "costs"
            };
        }
        
        // Popola con dati reali
        shipments.forEach(shipment => {
            const date = new Date(shipment.created_at);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            if (trends[monthKey]) {
                trends[monthKey].shipments++;
                trends[monthKey].costs += (shipment.freight_cost || 0) + (shipment.other_costs || 0); // ✅ CAMBIATO
            }
        });
        
        return Object.values(trends);
    }

        calculateTransportModes(shipments) {
        const modes = {};
        
        shipments.forEach(shipment => {
            let mode = 'Altro';
            
            if (shipment.tracking_type === 'container' || shipment.tracking_type === 'bl') {
                mode = 'Marittimo';
            } else if (shipment.tracking_type === 'awb') {
                mode = 'Aereo';
            } else if (shipment.tracking_type === 'parcel') {
                mode = 'Corriere';
            }
            
            if (!modes[mode]) {
                modes[mode] = { count: 0, costs: 0 }; // ✅ CAMBIATO da "revenue"
            }
            
            modes[mode].count++;
            modes[mode].costs += (shipment.freight_cost || 0) + (shipment.other_costs || 0); // ✅ CAMBIATO
        });
        
        return Object.entries(modes).map(([name, data]) => ({
            name,
            count: data.count,
            costs: data.costs // ✅ CAMBIATO
        }));
    }

    calculateCarriersPerformance(shipments, carriers) {
        const performance = {};
        
        shipments.forEach(shipment => {
            const carrierId = shipment.carrier_id || shipment.carrier_code;
            const carrierName = shipment.carrier_name;
            
            if (!carrierId && !carrierName) return;
            
            const key = carrierId || carrierName;
            
            if (!performance[key]) {
                performance[key] = {
                    id: carrierId,
                    name: carrierName || carrierId,
                    code: shipment.carrier_code,
                    shipments: 0,
                    revenue: 0,
                    weight: 0,
                    volume: 0,
                    delivered: 0
                };
            }
            
            const carrier = performance[key];
            carrier.shipments++;
            carrier.revenue += (shipment.freight_cost || 0) + (shipment.other_costs || 0);
            carrier.weight += shipment.total_weight_kg || 0;
            carrier.volume += shipment.total_volume_cbm || 0;
            
            if (shipment.current_status === 'delivered') {
                carrier.delivered++;
            }
        });
        
        return Object.values(performance).map(carrier => ({
            ...carrier,
            avgCost: carrier.shipments > 0 ? carrier.revenue / carrier.shipments : 0,
            performance: carrier.shipments > 0 ? (carrier.delivered / carrier.shipments * 100) : 0
        })).sort((a, b) => b.shipments - a.shipments);
    }

    calculateTopRoutes(shipments) {
        const routes = {};
        
        shipments.forEach(shipment => {
            const origin = shipment.origin_port || 'N/A';
            const destination = shipment.destination_port || 'N/A';
            const key = `${origin}-${destination}`;
            
            if (!routes[key]) {
                routes[key] = {
                    origin,
                    destination,
                    shipments: 0,
                    volume: 0,
                    revenue: 0
                };
            }
            
            const route = routes[key];
            route.shipments++;
            route.volume += shipment.total_volume_cbm || 0;
            route.revenue += (shipment.freight_cost || 0) + (shipment.other_costs || 0);
        });
        
        return Object.values(routes)
            .sort((a, b) => b.shipments - a.shipments)
            .slice(0, 10);
    }

    async renderDashboard() {
        console.log('🎨 Rendering dashboard...');
        
        try {
            // 1. Render KPI cards
            this.renderKPICards();
            
            // 2. Populate filters
            this.populateFilters();
            
            // 3. Render charts
            this.renderCharts();
            
            // 4. Render tables
            this.renderTables();
            
            console.log('✅ Dashboard rendered successfully');
            
        } catch (error) {
            console.error('❌ Error rendering dashboard:', error);
            throw error;
        }
    }

                 renderKPICards() {
            const container = document.getElementById('kpiCards');
            if (!container) return;
            
            const kpiCards = [
                {
                    label: 'Spedizioni',
                    value: this.data.totalShipments.toLocaleString(),
                    growth: 12.5,
                    icon: 'fas fa-shipping-fast',
                    color: '#6366f1'
                },
                {
                    label: 'Costi Totali',
                    value: `€${this.data.totalCosts.toLocaleString()}`,
                    growth: 8.2,
                    icon: 'fas fa-euro-sign',
                    color: '#ef4444'
                },
                {
                    label: 'Peso (kg)',
                    value: `${this.data.totalWeight.toLocaleString()}`,
                    growth: -3.1,
                    icon: 'fas fa-weight-hanging',
                    color: '#f59e0b'
                },
                {
                    label: 'Volume (m³)',
                    value: `${this.data.totalVolume.toFixed(1)}`,
                    growth: 5.7,
                    icon: 'fas fa-cube',
                    color: '#8b5cf6'
                },
                {
                    label: 'Spedizionieri',
                    value: this.data.activeCarriers.toString(),
                    growth: 15.3,
                    icon: 'fas fa-truck',
                    color: '#06b6d4'
                },
                {
                    label: 'Costo Medio',
                    value: this.data.totalShipments > 0 ? 
                        `€${(this.data.totalCosts / this.data.totalShipments).toFixed(2)}` : '€0',
                    growth: -2.4,
                    icon: 'fas fa-calculator',
                    color: '#10b981'
                }
            ];
        
            // ✅ LAYOUT GRIGLIA QUADRATA CON WRAPPER
            container.innerHTML = kpiCards.map((kpi, index) => `
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
        
            // ✅ INIZIALIZZA SORTABLE
            this.initializeSortableKPIs();
        }
initializeSortableKPIs() {
    const container = document.getElementById('kpiCards');
    if (!container) return;

    let draggedElement = null;

    // Aggiungi event listeners per drag & drop
    container.addEventListener('dragstart', (e) => {
        if (e.target.closest('.sortable-card')) {
            draggedElement = e.target.closest('.kpi-card-wrapper'); // ✅ CAMBIO QUI
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
        const dropTarget = e.target.closest('.kpi-card-wrapper'); // ✅ CAMBIO QUI
        
        if (dropTarget && draggedElement && dropTarget !== draggedElement) {
            const allCards = Array.from(container.children);
            const draggedIndex = allCards.indexOf(draggedElement);
            const dropIndex = allCards.indexOf(dropTarget);
            
            if (draggedIndex < dropIndex) {
                dropTarget.parentNode.insertBefore(draggedElement, dropTarget.nextSibling);
            } else {
                dropTarget.parentNode.insertBefore(draggedElement, dropTarget);
            }
            
            // Salva l'ordine nel localStorage
            this.saveKPIOrder();
            
            // Mostra notifica
            window.notificationSystem?.success('Ordine KPI aggiornato!');
        }
    });

    // Carica ordine salvato
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
        
        // Riordina secondo l'ordine salvato
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
    populateFilters() {
        const carrierFilter = document.getElementById('carrierFilter');
        if (carrierFilter && this.data.carriers) {
            carrierFilter.innerHTML = '<option value="">Tutti gli spedizionieri</option>' +
                this.data.carriers.map(carrier => 
                    `<option value="${carrier.id}">${carrier.name}</option>`
                ).join('');
        }
    }

    renderCharts() {
        this.renderTrendChart();
        this.renderTransportModeChart();
    }
renderTrendChart() {
    const ctx = document.getElementById('trendChart');
    if (!ctx || !this.data.trends) return;

    // ✅ DISTRUGGI grafico esistente
    if (this.charts.trendChart) {
        this.charts.trendChart.destroy();
    }

    this.charts.trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: this.data.trends.map(t => t.month),
            datasets: [{
                label: 'Spedizioni',
                data: this.data.trends.map(t => t.shipments),
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                tension: 0.4,
                borderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }, {
                label: 'Costi (€)',
                data: this.data.trends.map(t => t.costs),
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                tension: 0.4,
                borderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
                yAxisID: 'y1'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, // ✅ IMPORTANTE per altezza fissa
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 15,
                        font: {
                            size: 12
                        }
                    }
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    grid: {
                        color: 'rgba(0,0,0,0.05)'
                    },
                    ticks: {
                        font: {
                            size: 11
                        }
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
                            size: 11
                        }
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(0,0,0,0.05)'
                    },
                    ticks: {
                        font: {
                            size: 11
                        }
                    }
                }
            }
        }
    });
}
 
renderTransportModeChart() {
    const ctx = document.getElementById('transportModeChart');
    if (!ctx || !this.data.transportModes) return;

    // ✅ DISTRUGGI grafico esistente
    if (this.charts.transportModeChart) {
        this.charts.transportModeChart.destroy();
    }

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
                        padding: 8, /* ✅ RIDOTTO */
                        usePointStyle: true,
                        font: {
                            size: 10 /* ✅ RIDOTTO */
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
            cutout: '55%' /* ✅ RIDOTTO per più spazio */
        }
    });
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
                    <div class="fw-semibold">${carrier.name}</div>
                    <div class="text-muted small">${carrier.code || 'N/A'}</div>
                </td>
                <td class="text-end">${carrier.shipments}</td>
                <td class="text-end">€${carrier.revenue.toLocaleString()}</td>
                <td class="text-end">${carrier.weight.toLocaleString()} kg</td>
                <td class="text-end">${carrier.volume.toFixed(1)} m³</td>
                <td class="text-end">€${carrier.avgCost.toFixed(2)}</td>
                <td class="text-end">
                    <span class="badge ${this.getPerformanceBadgeClass(carrier.performance)} rounded-pill">
                        ${carrier.performance.toFixed(1)}%
                    </span>
                </td>
                <td class="text-center">
<button class="btn btn-sm btn-outline-primary" onclick="dashboard.viewCarrierDetails('${carrier.code || carrier.name || carrier.id}')">                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    getPerformanceBadgeClass(performance) {
        if (performance >= 90) return 'bg-success';
        if (performance >= 70) return 'bg-warning';
        return 'bg-danger';
    }

        async applyFilters() {
        try {
            this.showLoading('Applicazione filtri...');
            
            // Get filter values
            this.currentFilters = {
                period: parseInt(document.getElementById('periodFilter')?.value) || 30,
                carrier: document.getElementById('carrierFilter')?.value || '',
                status: document.getElementById('statusFilter')?.value || ''
            };
            
            console.log('🔽 Applying filters:', this.currentFilters);
            
            // ❌ RIMOSSO: await this.loadDashboardData(); - Causa loop infinito!
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
                this.showLoading('Aggiornamento...');
            }
            
            await this.loadDashboardData();
            await this.renderDashboard();
            
            if (!silent) {
                this.hideLoading();
            }
            
        } catch (error) {
            console.error('❌ Error refreshing:', error);
            if (!silent) {
                this.showError('Errore durante l\'aggiornamento');
                this.hideLoading();
            }
        }
    }

    async exportToExcel() {
        try {
            console.log('📤 Exporting to Excel...', this.data);
            window.NotificationSystem?.success('Export completato!');
        } catch (error) {
            console.error('❌ Export error:', error);
            window.NotificationSystem?.error('Errore durante l\'export');
        }
    }

    showLoading(message = 'Caricamento...') {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.querySelector('h5').textContent = message;
            overlay.classList.remove('d-none');
        }
    }

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.add('d-none');
        }
    }

    showError(message) {
        window.notificationSystem?.error(message) || alert(message);
    }

viewCarrierDetails(carrierCode) {
    console.log('👁️ View carrier details function called:', carrierCode);
    
    try {
        // ✅ TROVA dati del carrier
        const carrierData = this.data.carriersPerformance.find(c => 
            c.carrier_code === carrierCode || 
            c.name === carrierCode ||
            c.id === carrierCode ||
            c.code === carrierCode
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
                
                <div class="col-12">
                    <div class="card">
                        <div class="card-body text-center">
                            <h3 class="text-dark">€${(carrierData.avgCost || 0).toFixed(2)}</h3>
                            <small class="text-muted">Costo Medio per Spedizione</small>
                        </div>
                    </div>
                </div>
                
                <div class="col-12">
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

exportCarrierData(carrierCode) {
    console.log('📊 Exporting data for carrier:', carrierCode);
    window.notificationSystem?.info('Funzione export in sviluppo...');
}
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('🚀 Initializing Dashboard...');
        
        window.dashboard = new Dashboard();
        await window.dashboard.init();
        
        console.log('✅ Dashboard ready!');
        
    } catch (error) {
        console.error('❌ Failed to initialize dashboard:', error);
    }
});

export default Dashboard;