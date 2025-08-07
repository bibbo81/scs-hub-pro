class Dashboard {
    constructor() {
        this.initialized = false;
        this.currentFilters = {};
        this.data = {};
        
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
        const maxAttempts = 50;
        
        while (attempts < maxAttempts) {
            if (window.dataManager?.initialized && window.headerComponent) {
                // Inizializza header se non già fatto
                if (!window.headerComponent.initialized) {
                    await window.headerComponent.init();
                }
                return;
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        throw new Error('Servizi non disponibili dopo 5 secondi');
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
            // 1. Carica trackings
            const trackings = await window.dataManager.getTrackings();
            
            // 2. Carica shipments
            const shipments = await window.dataManager.getShipments();
            
            // 3. Carica carriers
            const carriers = await window.dataManager.getCarriers();
            
            // 4. Carica additional costs
            const additionalCosts = await this.loadAdditionalCosts();
            
            // 5. Applica filtri
            const filtered = this.applyFilters({ trackings, shipments, carriers, additionalCosts });
            
            // 6. Calcola aggregazioni
            this.data = this.calculateAggregations(filtered);
            
            console.log('✅ Dashboard data loaded successfully');
            
        } catch (error) {
            console.error('❌ Error loading dashboard data:', error);
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

    applyFilters(rawData) {
        let { trackings, shipments, carriers, additionalCosts } = rawData;
        
        // Filtro per periodo
        if (this.currentFilters.period) {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - this.currentFilters.period);
            
            trackings = trackings.filter(t => new Date(t.created_at) >= cutoffDate);
            shipments = shipments.filter(s => new Date(s.created_at) >= cutoffDate);
            additionalCosts = additionalCosts.filter(c => new Date(c.created_at) >= cutoffDate);
        }
        
        // Filtro per carrier
        if (this.currentFilters.carrier) {
            trackings = trackings.filter(t => 
                t.carrier_code === this.currentFilters.carrier || 
                t.carrier_name === this.currentFilters.carrier
            );
            shipments = shipments.filter(s => s.carrier_id === this.currentFilters.carrier);
        }
        
        // Filtro per status
        if (this.currentFilters.status) {
            trackings = trackings.filter(t => 
                t.current_status === this.currentFilters.status || 
                t.status === this.currentFilters.status
            );
            shipments = shipments.filter(s => s.status === this.currentFilters.status);
        }
        
        return { trackings, shipments, carriers, additionalCosts };
    }

    calculateAggregations(data) {
        const { trackings, shipments, carriers, additionalCosts } = data;
        
        // Combina tracking e shipments
        const combinedData = this.combineDataSources(trackings, shipments);
        
        return {
            // Raw data
            trackings,
            shipments: combinedData,
            carriers,
            additionalCosts,
            
            // KPI
            totalShipments: combinedData.length,
            totalRevenue: this.calculateTotalRevenue(combinedData, additionalCosts),
            totalWeight: combinedData.reduce((sum, s) => sum + (s.total_weight_kg || 0), 0),
            totalVolume: combinedData.reduce((sum, s) => sum + (s.total_volume_cbm || 0), 0),
            activeCarriers: new Set(combinedData.map(s => s.carrier_id || s.carrier_code).filter(Boolean)).size,
            
            // Analisi
            trends: this.calculateTrends(combinedData),
            transportModes: this.calculateTransportModes(combinedData),
            carriersPerformance: this.calculateCarriersPerformance(combinedData, carriers),
            topRoutes: this.calculateTopRoutes(combinedData)
        };
    }

    combineDataSources(trackings, shipments) {
        const combined = [];
        const trackingMap = new Map();
        
        // Mappa trackings per lookup veloce
        trackings.forEach(t => trackingMap.set(t.tracking_number, t));
        
        // Combina shipments con trackings
        shipments.forEach(shipment => {
            const tracking = trackingMap.get(shipment.tracking_number);
            
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
        trackings.forEach(tracking => {
            const hasShipment = shipments.some(s => s.tracking_number === tracking.tracking_number);
            if (!hasShipment) {
                combined.push({
                    ...tracking,
                    freight_cost: 0,
                    other_costs: 0,
                    total_cost: 0,
                    is_tracking_only: true
                });
            }
        });
        
        return combined;
    }

    calculateTotalRevenue(shipments, additionalCosts) {
        const shipmentsRevenue = shipments.reduce((total, s) => 
            total + (s.freight_cost || 0) + (s.other_costs || 0), 0);
        
        const additionalRevenue = additionalCosts.reduce((total, c) => 
            total + (c.amount || 0), 0);
        
        return shipmentsRevenue + additionalRevenue;
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
                revenue: 0
            };
        }
        
        // Popola con dati reali
        shipments.forEach(shipment => {
            const date = new Date(shipment.created_at);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            if (trends[monthKey]) {
                trends[monthKey].shipments++;
                trends[monthKey].revenue += (shipment.freight_cost || 0) + (shipment.other_costs || 0);
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
                modes[mode] = { count: 0, revenue: 0 };
            }
            
            modes[mode].count++;
            modes[mode].revenue += (shipment.freight_cost || 0) + (shipment.other_costs || 0);
        });
        
        return Object.entries(modes).map(([name, data]) => ({
            name,
            count: data.count,
            revenue: data.revenue
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
                label: 'Spedizioni Totali',
                value: this.data.totalShipments.toLocaleString(),
                growth: 12.5, // Mock
                icon: 'fas fa-shipping-fast',
                color: '#6366f1'
            },
            {
                label: 'Fatturato Totale',
                value: `€${this.data.totalRevenue.toLocaleString()}`,
                growth: 8.2,
                icon: 'fas fa-euro-sign',
                color: '#10b981'
            },
            {
                label: 'Peso Totale',
                value: `${this.data.totalWeight.toLocaleString()} kg`,
                growth: -3.1,
                icon: 'fas fa-weight-hanging',
                color: '#f59e0b'
            },
            {
                label: 'Volume Totale',
                value: `${this.data.totalVolume.toFixed(1)} m³`,
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
                    `€${(this.data.totalRevenue / this.data.totalShipments).toFixed(2)}` : '€0',
                growth: -2.4,
                icon: 'fas fa-calculator',
                color: '#ef4444'
            }
        ];

        container.innerHTML = kpiCards.map(kpi => `
            <div class="col-xl-2 col-md-4 col-sm-6">
                <div class="kpi-card">
                    <div class="d-flex align-items-center justify-content-between">
                        <div class="flex-grow-1">
                            <div class="kpi-label">${kpi.label}</div>
                            <div class="kpi-value">${kpi.value}</div>
                            <div class="growth-indicator ${kpi.growth >= 0 ? 'growth-positive' : 'growth-negative'}">
                                <i class="fas fa-arrow-${kpi.growth >= 0 ? 'up' : 'down'} me-1"></i>
                                ${Math.abs(kpi.growth).toFixed(1)}%
                            </div>
                        </div>
                        <div class="kpi-icon" style="background-color: ${kpi.color};">
                            <i class="${kpi.icon}"></i>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
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

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.data.trends.map(t => t.month),
                datasets: [{
                    label: 'Spedizioni',
                    data: this.data.trends.map(t => t.shipments),
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    tension: 0.4
                }, {
                    label: 'Fatturato (€)',
                    data: this.data.trends.map(t => t.revenue),
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    yAxisID: 'y1'
                }]
            },
            options: {
                responsive: true,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        grid: {
                            drawOnChartArea: false,
                        },
                    }
                }
            }
        });
    }

    renderTransportModeChart() {
        const ctx = document.getElementById('transportModeChart');
        if (!ctx || !this.data.transportModes) return;

        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: this.data.transportModes.map(t => t.name),
                datasets: [{
                    data: this.data.transportModes.map(t => t.count),
                    backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
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
                    <button class="btn btn-sm btn-outline-primary" onclick="dashboard.viewCarrierDetails('${carrier.id}')">
                        <i class="fas fa-eye"></i>
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
            
            // Reload data
            await this.loadDashboardData();
            
            // Re-render
            await this.renderDashboard();
            
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

    viewCarrierDetails(carrierId) {
        console.log('View carrier details:', carrierId);
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