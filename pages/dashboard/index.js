import DashboardManager from './dashboard-manager.js';
import ChartsManager from './charts-manager.js';
import KPICalculator from './kpi-calculator.js';
import ExportManager from './export-manager.js';
import FiltersManager from './filters-manager.js';
import CostsDashboard from './costs-dashboard.js';

class Dashboard {
    constructor() {
        this.initialized = false;
        this.currentTab = 'overview';
        this.currentFilters = {};
        this.data = {};
        
        // Inizializza i manager
        this.dashboardManager = new DashboardManager();
        this.chartsManager = new ChartsManager();
        this.kpiCalculator = new KPICalculator();
        this.exportManager = new ExportManager();
        this.filtersManager = new FiltersManager();
        this.costsDashboard = new CostsDashboard();
        
        console.log('🎯 Dashboard Controller initialized');
    }

    async init() {
        if (this.initialized) return;
        
        try {
            this.showLoading('Inizializzazione dashboard...');
            
            // 1. Inizializza i manager
            await this.dashboardManager.init();
            await this.chartsManager.init();
            
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

    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('[data-bs-toggle="tab"]').forEach(tab => {
            tab.addEventListener('shown.bs.tab', (e) => {
                const tabId = e.target.getAttribute('data-bs-target').replace('#', '');
                this.handleTabChange(tabId);
            });
        });

        // Period filters per grafici
        document.querySelectorAll('input[name="chartPeriod"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.handleChartPeriodChange(e.target.id);
            });
        });

        // Auto-refresh ogni 5 minuti
        setInterval(() => {
            if (this.initialized) {
                this.refresh(true); // silent refresh
            }
        }, 300000); // 5 minuti

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

            this.data = await this.dashboardManager.loadDashboardData(this.currentFilters);
            console.log('✅ Initial data loaded:', this.data);
            
        } catch (error) {
            console.error('❌ Error loading initial data:', error);
            throw error;
        }
    }

    async renderDashboard() {
        console.log('🎨 Rendering dashboard...');
        
        try {
            // 1. Render KPI cards
            this.renderKPICards();
            
            // 2. Populate filters
            this.filtersManager.populateFilters(this.data.carriers);
            
            // 3. Render overview tab (default)
            await this.renderOverviewTab();
            
            // 4. Update last update time
            this.updateLastUpdateTime();
            
            console.log('✅ Dashboard rendered successfully');
            
        } catch (error) {
            console.error('❌ Error rendering dashboard:', error);
            throw error;
        }
    }

    renderKPICards() {
        const kpiData = this.kpiCalculator.calculateKPIs(this.data);
        const container = document.getElementById('kpiCards');
        
        const kpiCards = [
            {
                id: 'totalShipments',
                label: 'Spedizioni Totali',
                value: kpiData.totalShipments.toLocaleString(),
                growth: kpiData.shipmentsGrowth,
                icon: 'fas fa-shipping-fast',
                color: 'var(--primary-color)'
            },
            {
                id: 'totalRevenue',
                label: 'Fatturato Totale',
                value: `€${kpiData.totalRevenue.toLocaleString()}`,
                growth: kpiData.revenueGrowth,
                icon: 'fas fa-euro-sign',
                color: 'var(--success-color)'
            },
            {
                id: 'totalWeight',
                label: 'Peso Totale',
                value: `${kpiData.totalWeight.toLocaleString()} kg`,
                growth: kpiData.weightGrowth,
                icon: 'fas fa-weight-hanging',
                color: 'var(--warning-color)'
            },
            {
                id: 'totalVolume',
                label: 'Volume Totale',
                value: `${kpiData.totalVolume.toFixed(1)} m³`,
                growth: kpiData.volumeGrowth,
                icon: 'fas fa-cube',
                color: '#8b5cf6'
            },
            {
                id: 'activeCarriers',
                label: 'Spedizionieri Attivi',
                value: kpiData.activeCarriers.toString(),
                growth: kpiData.carriersGrowth,
                icon: 'fas fa-truck',
                color: '#06b6d4'
            },
            {
                id: 'avgDeliveryTime',
                label: 'Tempo Medio Consegna',
                value: `${kpiData.avgDeliveryTime.toFixed(1)} gg`,
                growth: kpiData.deliveryTimeGrowth,
                icon: 'fas fa-clock',
                color: 'var(--danger-color)'
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

        console.log('✅ KPI cards rendered');
    }

    async renderOverviewTab() {
        console.log('📊 Rendering overview tab...');
        
        try {
            // 1. Trend chart
            await this.chartsManager.renderTrendChart(this.data.trends, 'trendChart');
            
            // 2. Transport mode chart
            await this.chartsManager.renderTransportModeChart(this.data.transportModes, 'transportModeChart');
            
            // 3. Carriers performance chart
            await this.chartsManager.renderCarriersChart(this.data.carriersPerformance, 'carriersChart');
            
            // 4. Top routes table
            this.renderTopRoutesTable();
            
            // 5. Show detail table for overview
            document.getElementById('detailTable').style.display = 'block';
            this.renderCarriersDetailTable();
            
            console.log('✅ Overview tab rendered');
            
        } catch (error) {
            console.error('❌ Error rendering overview tab:', error);
        }
    }

    renderTopRoutesTable() {
        const tbody = document.getElementById('topRoutesTable');
        const routes = this.data.topRoutes.slice(0, 10);
        
        tbody.innerHTML = routes.map((route, index) => `
            <tr>
                <td>
                    <div class="fw-semibold">${route.origin}</div>
                    <div class="text-muted small">→ ${route.destination}</div>
                </td>
                <td class="text-end">${route.shipments}</td>
                <td class="text-end">${route.volume.toFixed(1)} m³</td>
            </tr>
        `).join('');
    }

    renderCarriersDetailTable() {
        const tbody = document.getElementById('carriersDetailBody');
        const carriers = this.data.carriersPerformance;
        
        tbody.innerHTML = carriers.map(carrier => `
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

    async handleTabChange(tabId) {
        console.log(`🎯 Switching to tab: ${tabId}`);
        this.currentTab = tabId;
        
        // Hide detail table for non-overview tabs
        const detailTable = document.getElementById('detailTable');
        detailTable.style.display = tabId === 'overview' ? 'block' : 'none';
        
        switch (tabId) {
            case 'overview':
                await this.renderOverviewTab();
                break;
            case 'costs':
                await this.costsDashboard.render(document.getElementById('costsContent'), this.data);
                break;
            case 'performance':
                await this.renderPerformanceTab();
                break;
            case 'routes':
                await this.renderRoutesTab();
                break;
        }
    }

    async handleChartPeriodChange(periodId) {
        const periodMap = {
            'chart3months': 90,
            'chart6months': 180,
            'chart1year': 365
        };
        
        const days = periodMap[periodId];
        if (days) {
            // Reload trend data with new period
            const trendData = await this.dashboardManager.loadTrendData(days);
            await this.chartsManager.renderTrendChart(trendData, 'trendChart');
        }
    }

    async applyFilters() {
        try {
            this.showLoading('Applicazione filtri...');
            
            // Get filter values
            this.currentFilters = this.filtersManager.getCurrentFilters();
            
            // Reload data with new filters
            this.data = await this.dashboardManager.loadDashboardData(this.currentFilters);
            
            // Re-render current tab
            await this.renderDashboard();
            await this.handleTabChange(this.currentTab);
            
            this.hideLoading();
            console.log('✅ Filters applied successfully');
            
        } catch (error) {
            console.error('❌ Error applying filters:', error);
            this.showError('Errore durante l\'applicazione dei filtri');
            this.hideLoading();
        }
    }

    async refresh(silent = false) {
        try {
            if (!silent) {
                this.showLoading('Aggiornamento dati...');
            }
            
            // Reload data with current filters
            this.data = await this.dashboardManager.loadDashboardData(this.currentFilters);
            
            // Re-render current view
            await this.renderDashboard();
            await this.handleTabChange(this.currentTab);
            
            this.updateLastUpdateTime();
            
            if (!silent) {
                this.hideLoading();
            }
            
            console.log('✅ Dashboard refreshed successfully');
            
        } catch (error) {
            console.error('❌ Error refreshing dashboard:', error);
            if (!silent) {
                this.showError('Errore durante l\'aggiornamento');
                this.hideLoading();
            }
        }
    }

    async renderPerformanceTab() {
        console.log('📈 Rendering performance tab...');
        const content = document.getElementById('performanceContent');
        
        content.innerHTML = `
            <div class="row g-4">
                <div class="col-lg-6">
                    <div class="chart-container">
                        <div class="chart-title">
                            <i class="fas fa-stopwatch text-primary me-2"></i>
                            Tempi di Consegna per Spedizioniere
                        </div>
                        <canvas id="deliveryTimesChart"></canvas>
                    </div>
                </div>
                <div class="col-lg-6">
                    <div class="chart-container">
                        <div class="chart-title">
                            <i class="fas fa-percentage text-success me-2"></i>
                            Tasso di Successo
                        </div>
                        <canvas id="successRateChart"></canvas>
                    </div>
                </div>
            </div>
        `;
        
        // Render performance charts
        await this.chartsManager.renderDeliveryTimesChart(this.data.deliveryTimes, 'deliveryTimesChart');
        await this.chartsManager.renderSuccessRateChart(this.data.successRates, 'successRateChart');
    }

    async renderRoutesTab() {
        console.log('🗺️ Rendering routes tab...');
        const content = document.getElementById('routesContent');
        
        content.innerHTML = `
            <div class="row g-4">
                <div class="col-12">
                    <div class="chart-container">
                        <div class="chart-title">
                            <i class="fas fa-globe text-info me-2"></i>
                            Analisi Geografica delle Rotte
                        </div>
                        <canvas id="routesChart"></canvas>
                    </div>
                </div>
                <div class="col-lg-8">
                    <div class="table-container">
                        <div class="p-3 border-bottom bg-light">
                            <h6 class="mb-0 fw-semibold">Dettaglio Rotte Principali</h6>
                        </div>
                        <div class="table-responsive">
                            <table class="table table-hover mb-0">
                                <thead>
                                    <tr>
                                        <th>Origine</th>
                                        <th>Destinazione</th>
                                        <th class="text-end">Spedizioni</th>
                                        <th class="text-end">Volume</th>
                                        <th class="text-end">Ricavo</th>
                                        <th class="text-end">Tempo Medio</th>
                                    </tr>
                                </thead>
                                <tbody id="routesDetailTable">
                                    <!-- Popolato dinamicamente -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                <div class="col-lg-4">
                    <div class="chart-container">
                        <div class="chart-title">
                            <i class="fas fa-chart-pie text-warning me-2"></i>
                            Top Destinazioni
                        </div>
                        <canvas id="destinationsChart"></canvas>
                    </div>
                </div>
            </div>
        `;
        
        // Render routes analysis
        await this.chartsManager.renderRoutesChart(this.data.routesAnalysis, 'routesChart');
        await this.chartsManager.renderDestinationsChart(this.data.topDestinations, 'destinationsChart');
        this.renderRoutesDetailTable();
    }

    renderRoutesDetailTable() {
        const tbody = document.getElementById('routesDetailTable');
        
        tbody.innerHTML = this.data.topRoutes.map(route => `
            <tr>
                <td class="fw-semibold">${route.origin}</td>
                <td class="fw-semibold">${route.destination}</td>
                <td class="text-end">${route.shipments}</td>
                <td class="text-end">${route.volume.toFixed(1)} m³</td>
                <td class="text-end">€${route.revenue.toLocaleString()}</td>
                <td class="text-end">${route.avgDeliveryTime.toFixed(1)} gg</td>
            </tr>
        `).join('');
    }

    // Export functions
    async exportData() {
        await this.exportManager.exportCurrentView(this.currentTab, this.data);
    }

    async exportToExcel() {
        await this.exportManager.exportToExcel(this.data);
    }

    async printReport() {
        await this.exportManager.printReport(this.currentTab, this.data);
    }

    // Utility functions
    updateLastUpdateTime() {
        const now = new Date();
        document.getElementById('lastUpdate').textContent = 
            now.toLocaleString('it-IT', { 
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric',
                hour: '2-digit', 
                minute: '2-digit' 
            });
    }

    showLoading(message = 'Caricamento...') {
        const overlay = document.getElementById('loadingOverlay');
        overlay.querySelector('h5').textContent = message;
        overlay.classList.remove('d-none');
    }

    hideLoading() {
        document.getElementById('loadingOverlay').classList.add('d-none');
    }

    showError(message) {
        // Implement your notification system here
        console.error('Dashboard Error:', message);
        alert(message); // Temporary fallback
    }

    viewCarrierDetails(carrierId) {
        // Navigate to carrier detail page or show modal
        console.log('View carrier details:', carrierId);
    }
}

// Initialize dashboard when DOM is ready
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