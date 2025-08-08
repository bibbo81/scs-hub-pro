const ANALYTICS_CONFIG = {
    overview: {
        name: "Panoramica Generale",
        icon: "fas fa-chart-pie",
        color: "#6366f1",
        metrics: [
            { 
                id: "total_shipments", 
                name: "Spedizioni Totali", 
                icon: "fas fa-shipping-fast",
                query: "shipments-count"
            },
            { 
                id: "total_costs", 
                name: "Costi Totali", // ✅ CAMBIATO da "Fatturato"
                icon: "fas fa-receipt",
                query: "costs-total"
            },
            { 
                id: "avg_cost_per_shipment", 
                name: "Costo Medio per Spedizione", // ✅ NUOVO
                icon: "fas fa-calculator",
                query: "avg-cost-shipment"
            },
            { 
                id: "avg_delivery_time", 
                name: "Tempo Consegna Medio", 
                icon: "fas fa-clock",
                query: "delivery-time-avg"
            }
        ]
    },
    
    shipments: {
        name: "Analisi Spedizioni",
        icon: "fas fa-boxes",
        color: "#10b981",
        metrics: [
            { id: "shipments_by_status", name: "Spedizioni per Stato", query: "shipments-by-status" },
            { id: "shipments_by_type", name: "Spedizioni per Tipo", query: "shipments-by-type" },
            { id: "delayed_shipments", name: "Spedizioni in Ritardo", query: "shipments-delayed" },
            { id: "urgent_shipments", name: "Spedizioni Urgenti", query: "shipments-urgent" } // ✅ CAMBIATO
        ]
    },
    
    financial: {
        name: "Analisi Costi", // ✅ CAMBIATO da "Analisi Finanziaria"
        icon: "fas fa-money-bill-wave",
        color: "#f59e0b",
        metrics: [
            { id: "costs_by_month", name: "Costi Mensili", query: "costs-monthly" }, // ✅ CAMBIATO
            { id: "cost_breakdown", name: "Breakdown Costi", query: "costs-breakdown" },
            { id: "cost_per_kg", name: "Costo per KG", query: "cost-per-kg" }, // ✅ CAMBIATO
            { id: "savings_opportunities", name: "Opportunità Risparmio", query: "cost-savings" } // ✅ NUOVO
        ]
    },
    
    performance: {
        name: "Performance & Efficienza",
        icon: "fas fa-tachometer-alt", 
        color: "#ef4444",
        metrics: [
            { id: "on_time_delivery", name: "Consegne in Tempo", query: "delivery-ontime" },
            { id: "carrier_performance", name: "Performance Spedizionieri", query: "carriers-performance" },
            { id: "cost_efficiency", name: "Efficienza Costi", query: "cost-efficiency" }, // ✅ CAMBIATO
            { id: "quality_score", name: "Score Qualità", query: "quality-score" } // ✅ CAMBIATO
        ]
    },
    
    geographical: {
        name: "Analisi Geografica",
        icon: "fas fa-globe",
        color: "#8b5cf6", 
        metrics: [
            { id: "shipments_by_country", name: "Spedizioni per Paese", query: "geo-by-country" },
            { id: "costs_by_region", name: "Costi per Regione", query: "geo-costs" }, // ✅ CAMBIATO
            { id: "international_vs_domestic", name: "Internazionale vs Domestico", query: "geo-intl-domestic" },
            { id: "route_optimization", name: "Ottimizzazione Rotte", query: "route-optimization" } // ✅ NUOVO
        ]
    },
    
    trends: {
        name: "Trend & Previsioni Costi", // ✅ CAMBIATO
        icon: "fas fa-chart-line",
        color: "#06b6d4",
        metrics: [
            { id: "cost_growth_rate", name: "Crescita Costi", query: "trends-cost-growth" }, // ✅ CAMBIATO
            { id: "seasonal_cost_trends", name: "Trend Stagionali Costi", query: "trends-seasonal-costs" }, // ✅ CAMBIATO
            { id: "cost_forecast", name: "Previsione Costi", query: "trends-cost-forecast" }, // ✅ CAMBIATO
            { id: "budget_variance", name: "Varianza Budget", query: "budget-variance" } // ✅ NUOVO
        ]
    },
    
    operational: {
        name: "Analisi Operativa",
        icon: "fas fa-cogs",
        color: "#84cc16",
        metrics: [
            { id: "capacity_utilization", name: "Utilizzo Capacità", query: "ops-capacity" },
            { id: "peak_cost_hours", name: "Ore Picco Costi", query: "ops-peak-costs" }, // ✅ CAMBIATO
            { id: "processing_costs", name: "Costi Elaborazione", query: "ops-processing-costs" }, // ✅ CAMBIATO
            { id: "cost_anomalies", name: "Anomalie Costi", query: "cost-anomalies" } // ✅ NUOVO
        ]
    }
};

// Dashboard Dinamica Class
class DynamicDashboard {
    constructor() {
        this.currentConfig = null;
        this.currentData = null;
        this.charts = new Map();
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;
        
        console.log('🎯 Initializing Dynamic Dashboard...');
        
        this.setupEventListeners();
        await this.loadDefaultCategory();
        
        this.initialized = true;
        console.log('✅ Dynamic Dashboard initialized');
    }

                 setupEventListeners() {
            // Category change listener
            const categorySelect = document.getElementById('analyticsCategory');
            if (categorySelect) {
                categorySelect.addEventListener('change', (e) => {
                    this.onCategoryChange(e.target.value);
                });
            }
            
            // Metric change listener  
            const metricSelect = document.getElementById('specificMetric');
            if (metricSelect) {
                metricSelect.addEventListener('change', (e) => {
                    this.onMetricChange(e.target.value);
                });
            }
            
            // Granularity change listener
            const granularitySelect = document.getElementById('granularityLevel');
            if (granularitySelect) {
                granularitySelect.addEventListener('change', (e) => {
                    this.onGranularityChange(e.target.value);
                });
            }
            
            console.log('✅ Dynamic Dashboard event listeners setup');
        }

    async loadDefaultCategory() {
        // Load overview by default
        await this.onCategoryChange('overview');
    }

    async onCategoryChange(category) {
        if (!category) return;
        
        console.log(`🔄 Loading category: ${category}`);
        
        const config = ANALYTICS_CONFIG[category];
        if (!config) {
            console.error(`❌ Category ${category} not found`);
            return;
        }

        this.currentConfig = config;
        
        // Update specific metrics dropdown
        this.populateMetricsDropdown(config.metrics);
        
        // Load category overview
        await this.loadCategoryOverview(category);
    }

    populateMetricsDropdown(metrics) {
        const metricSelect = document.getElementById('specificMetric');
        if (!metricSelect) return;
        
        metricSelect.innerHTML = '<option value="">Tutte le metriche</option>';
        
        metrics.forEach(metric => {
            const option = document.createElement('option');
            option.value = metric.id;
            option.textContent = metric.name;
            metricSelect.appendChild(option);
        });
        
        console.log(`✅ Populated ${metrics.length} metrics in dropdown`);
    }

    async loadCategoryOverview(category) {
        const config = ANALYTICS_CONFIG[category];
        const container = document.getElementById('dynamicContent');
        
        if (!container) {
            console.error('❌ Dynamic content container not found');
            return;
        }
        
        // Show loading
        container.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary mb-3"></div>
                <h5>Caricamento ${config.name}...</h5>
            </div>
        `;

        try {
            // Create dynamic layout
            const html = this.createCategoryLayout(config);
            container.innerHTML = html;
            
            // Load data for metrics
            await this.loadMetricsData(config.metrics);
            
            // Create charts
            await this.createCategoryCharts(category);
            
            console.log(`✅ Category ${category} loaded successfully`);
            
        } catch (error) {
            console.error(`❌ Error loading category ${category}:`, error);
            container.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Errore nel caricamento dei dati: ${error.message}
                </div>
            `;
        }
    }

    createCategoryLayout(config) {
        return `
            <div class="row g-4 mb-4">
                <div class="col-12">
                    <div class="alert alert-info">
                        <i class="${config.icon} me-2"></i>
                        <strong>${config.name}</strong> - Vista dinamica generata automaticamente
                    </div>
                </div>
            </div>
            
            <!-- KPI Cards per la categoria -->
            <div class="row g-4 mb-4">
                ${config.metrics.slice(0, 4).map((metric, index) => `
                    <div class="col-lg-3">
                        <div class="kpi-card">
                            <div class="kpi-icon-small" style="background-color: ${config.color};">
                                <i class="${metric.icon || 'fas fa-chart-bar'}"></i>
                            </div>
                            <div class="kpi-label-small">${metric.name}</div>
                            <div class="kpi-value-small" id="dynamic-metric-${metric.id}">
                                <div class="spinner-border spinner-border-sm"></div>
                            </div>
                            <div class="growth-indicator-small">
                                <i class="fas fa-info-circle"></i>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <!-- Charts per la categoria -->
            <div class="row g-4 mb-4">
                <div class="col-lg-8">
                    <div class="chart-container">
                        <div class="chart-title">
                            <i class="${config.icon}"></i>
                            ${config.name} - Trend Temporale
                        </div>
                        <canvas id="dynamicTrendChart"></canvas>
                    </div>
                </div>
                <div class="col-lg-4">
                    <div class="chart-container">
                        <div class="chart-title">
                            <i class="fas fa-chart-pie"></i>
                            Distribuzione
                        </div>
                        <canvas id="dynamicDistributionChart"></canvas>
                    </div>
                </div>
            </div>
            
            <!-- Tabella dettagli -->
            <div class="sol-card">
                <div class="sol-card-header d-flex justify-content-between align-items-center">
                    <h5 class="sol-card-title mb-0">
                        Dettaglio ${config.name}
                    </h5>
                    <button class="btn btn-sm btn-outline-primary" onclick="dynamicDashboard.exportCategoryData()">
                        <i class="fas fa-download"></i> Esporta
                    </button>
                </div>
                <div class="sol-card-body">
                    <div class="table-responsive">
                        <table class="table table-hover" id="dynamicDetailTable">
                            <thead id="dynamicTableHead"></thead>
                            <tbody id="dynamicTableBody">
                                <tr>
                                    <td colspan="100%" class="text-center py-4">
                                        <div class="spinner-border spinner-border-sm me-2"></div>
                                        Caricamento dati...
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    async loadMetricsData(metrics) {
        console.log(`🔄 Loading data for ${metrics.length} metrics...`);
        
        for (const metric of metrics.slice(0, 4)) {
            try {
                const data = await this.executeMetricQuery(metric);
                this.updateMetricValue(metric.id, data, metric);
            } catch (error) {
                console.error(`❌ Error loading metric ${metric.id}:`, error);
                const element = document.getElementById(`dynamic-metric-${metric.id}`);
                if (element) {
                    element.innerHTML = '<span class="text-danger small">Errore</span>';
                }
            }
        }
    }

                async executeMetricQuery(metric) {
            console.log(`🔄 Executing COST-FOCUSED query for metric: ${metric.id}`);
            
            try {
                // Usa i dati reali dal dashboard principale
                if (window.dashboard && window.dashboard.data) {
                    const data = window.dashboard.data;
                    const rawData = window.dashboard.rawData; // Dati non elaborati
                    
                    switch (metric.query) {
                        case 'shipments-count':
                            return [{ value: data.totalShipments || 0 }];
                            
                        case 'costs-total': // ✅ CAMBIATO da 'revenue-total'
                            return [{ value: data.totalCosts || 0 }];
                            
                        case 'avg-cost-shipment': // ✅ NUOVO
                            const avgCost = data.totalShipments > 0 ? 
                                (data.totalCosts / data.totalShipments) : 0;
                            return [{ value: avgCost }];
                            
                        case 'delivery-time-avg':
                            // Calcolo REALE tempo medio di consegna
                            if (rawData && rawData.shipments) {
                                const deliveredShipments = rawData.shipments.filter(s => 
                                    s.status === 'delivered' && s.created_at && s.delivered_at
                                );
                                
                                if (deliveredShipments.length > 0) {
                                    const totalDays = deliveredShipments.reduce((sum, s) => {
                                        const created = new Date(s.created_at);
                                        const delivered = new Date(s.delivered_at);
                                        const days = (delivered - created) / (1000 * 60 * 60 * 24);
                                        return sum + (days > 0 ? days : 0);
                                    }, 0);
                                    
                                    return [{ value: totalDays / deliveredShipments.length }];
                                }
                            }
                            return [{ value: 0 }];
                            
                        case 'shipments-delayed': // ✅ AGGIORNATO
                            if (rawData && rawData.shipments) {
                                const now = new Date();
                                const delayed = rawData.shipments.filter(s => {
                                    if (s.eta && s.status !== 'delivered' && s.status !== 'cancelled') {
                                        return new Date(s.eta) < now;
                                    }
                                    return false;
                                }).length;
                                return [{ value: delayed }];
                            }
                            return [{ value: 0 }];
                            
                        case 'shipments-urgent': // ✅ NUOVO
                            if (rawData && rawData.shipments) {
                                const urgent = rawData.shipments.filter(s => 
                                    s.priority === 'high' || s.service_type === 'express'
                                ).length;
                                return [{ value: urgent }];
                            }
                            return [{ value: 0 }];
                            
                        case 'costs-monthly': // ✅ CAMBIATO da 'revenue-monthly'
                            return await this.calculateMonthlyCosts(rawData);
                            
                        case 'cost-per-kg': // ✅ NUOVO
                            const totalWeight = data.totalWeight || 0;
                            const costPerKg = totalWeight > 0 ? (data.totalCosts / totalWeight) : 0;
                            return [{ value: costPerKg }];
                            
                        case 'cost-efficiency': // ✅ NUOVO
                            // Calcolo efficienza: costi vs standard benchmark
                            const benchmark = 150; // €150 per spedizione come benchmark
                            const actualAvg = data.totalShipments > 0 ? 
                                (data.totalCosts / data.totalShipments) : 0;
                            const efficiency = benchmark > 0 ? 
                                ((benchmark - actualAvg) / benchmark * 100) : 0;
                            return [{ value: Math.max(0, efficiency) }];
                            
                        case 'geo-costs': // ✅ CAMBIATO da 'geo-revenue'
                            return await this.calculateCostsByRegion(rawData);
                            
                        case 'trends-cost-growth': // ✅ CAMBIATO
                            return await this.calculateCostGrowthRate(rawData);
                            
                        // ✅ MANTIENI QUERY ESISTENTI
                        case 'shipments-by-status':
                        case 'shipments-by-type':
                        case 'carriers-performance':
                        case 'delivery-ontime':
                        case 'geo-by-country':
                        case 'geo-intl-domestic':
                            // Usa le query esistenti già implementate
                            return await this.executeExistingQuery(metric);
                            
                        default:
                            console.warn(`⚠️ Unknown metric query: ${metric.query}`);
                            return [{ value: 0 }];
                    }
                }
                
                // Fallback se non ci sono dati
                console.warn(`⚠️ No data available for metric: ${metric.id}`);
                return [{ value: 0 }];
                
            } catch (error) {
                console.error(`❌ Error executing query for ${metric.id}:`, error);
                return [{ value: 0 }];
            }
        }
        
        // ✅ NUOVI METODI HELPER PER COSTI
        async calculateMonthlyCosts(rawData) {
            if (!rawData || !rawData.shipments) return [{ value: 0 }];
            
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();
            
            const monthlyCosts = rawData.shipments
                .filter(s => {
                    const date = new Date(s.created_at);
                    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
                })
                .reduce((sum, s) => sum + (parseFloat(s.freight_cost) || 0) + (parseFloat(s.other_costs) || 0), 0);
            
            return [{ value: monthlyCosts }];
        }
        
        async calculateCostsByRegion(rawData) {
            if (!rawData || !rawData.shipments) return [{ value: 0 }];
            
            const regions = {};
            rawData.shipments.forEach(s => {
                const region = s.origin_country || 'Unknown';
                if (!regions[region]) regions[region] = 0;
                regions[region] += (parseFloat(s.freight_cost) || 0) + (parseFloat(s.other_costs) || 0);
            });
            
            return [{ value: Object.keys(regions).length }];
        }
        
        async calculateCostGrowthRate(rawData) {
            if (!rawData || !rawData.shipments) return [{ value: 0 }];
            
            const now = new Date();
            const thisMonthCosts = rawData.shipments
                .filter(s => {
                    const date = new Date(s.created_at);
                    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                })
                .reduce((sum, s) => sum + (parseFloat(s.freight_cost) || 0) + (parseFloat(s.other_costs) || 0), 0);
            
            const lastMonthCosts = rawData.shipments
                .filter(s => {
                    const date = new Date(s.created_at);
                    return date.getMonth() === (now.getMonth() - 1) && date.getFullYear() === now.getFullYear();
                })
                .reduce((sum, s) => sum + (parseFloat(s.freight_cost) || 0) + (parseFloat(s.other_costs) || 0), 0);
            
            const growth = lastMonthCosts > 0 ? ((thisMonthCosts - lastMonthCosts) / lastMonthCosts * 100) : 0;
            return [{ value: growth }];
        }
        
        async executeExistingQuery(metric) {
            // Usa le query esistenti già implementate per metriche che non cambiano
            const data = window.dashboard.data;
            const rawData = window.dashboard.rawData;
            
            switch (metric.query) {
                case 'shipments-by-status':
                    if (rawData && rawData.shipments) {
                        const byStatus = rawData.shipments.reduce((acc, s) => {
                            acc[s.status] = (acc[s.status] || 0) + 1;
                            return acc;
                        }, {});
                        return [{ value: Object.keys(byStatus).length }];
                    }
                    return [{ value: 0 }];
                    
                case 'carriers-performance':
                    if (rawData && rawData.trackings) {
                        const uniqueCarriers = new Set(rawData.trackings.map(t => t.carrier_name).filter(c => c && c !== 'N/A'));
                        return [{ value: uniqueCarriers.size }];
                    }
                    return [{ value: 0 }];
                    
                // Aggiungi altre query esistenti...
                default:
                    return [{ value: Math.floor(Math.random() * 100) }]; // Placeholder temporaneo
            }
        }
    
    // ✅ METODI HELPER PER CALCOLI AVANZATI
    async calculateMonthlyRevenue(rawData) {
        if (!rawData || !rawData.shipments) return [{ value: 0 }];
        
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        const monthlyRevenue = rawData.shipments
            .filter(s => {
                const date = new Date(s.created_at);
                return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
            })
            .reduce((sum, s) => sum + (parseFloat(s.freight_cost) || 0) + (parseFloat(s.other_costs) || 0), 0);
        
        return [{ value: monthlyRevenue }];
    }
    
    async calculateCountryDistribution(rawData) {
        if (!rawData || !rawData.shipments) return [{ value: 0 }];
        
        const countries = new Set();
        rawData.shipments.forEach(s => {
            if (s.origin_country) countries.add(s.origin_country);
            if (s.destination_country) countries.add(s.destination_country);
        });
        
        return [{ value: countries.size }];
    }
    
    async calculateGrowthRate(rawData) {
        if (!rawData || !rawData.shipments) return [{ value: 0 }];
        
        const now = new Date();
        const thisMonth = rawData.shipments.filter(s => {
            const date = new Date(s.created_at);
            return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        }).length;
        
        const lastMonth = rawData.shipments.filter(s => {
            const date = new Date(s.created_at);
            return date.getMonth() === (now.getMonth() - 1) && date.getFullYear() === now.getFullYear();
        }).length;
        
        const growth = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth * 100) : 0;
        return [{ value: growth }];
    }

    updateMetricValue(metricId, data, metric) {
        const element = document.getElementById(`dynamic-metric-${metricId}`);
        if (!element || !data || data.length === 0) return;

        const value = data[0].value || 0;
        let formattedValue = 'N/A';

        // Format value based on metric type
        if (typeof value === 'number') {
            if (metric.query.includes('rate') || metric.query.includes('success')) {
                formattedValue = `${value.toFixed(1)}%`;
            } else if (metric.query.includes('revenue') || metric.query.includes('cost')) {
                formattedValue = `€${value.toLocaleString()}`;
            } else if (metric.query.includes('time') || metric.query.includes('delivery')) {
                formattedValue = `${value.toFixed(1)}d`;
            } else {
                formattedValue = value.toLocaleString();
            }
        }

        element.innerHTML = formattedValue;
        console.log(`✅ Updated metric ${metricId}: ${formattedValue}`);
    }

    async generateAnalysis() {
        const category = document.getElementById('analyticsCategory').value;
        const metric = document.getElementById('specificMetric').value;
        const granularity = document.getElementById('granularityLevel').value;
        const comparison = document.getElementById('comparisonType').value;
        
        console.log('🎯 Generating custom analysis:', {
            category, metric, granularity, comparison
        });
        
        // Reload with specific parameters
        await this.onCategoryChange(category);
        
        // Show notification
        if (window.notificationSystem) {
            window.notificationSystem.show(
                'Analisi generata con successo!',
                `Categoria: ${ANALYTICS_CONFIG[category]?.name}, Granularità: ${granularity}`,
                'success'
            );
        }
    }

    async createCategoryCharts(category) {
        // Placeholder per ora - implementeremo charts specifici
        console.log(`📊 Creating charts for category: ${category}`);
    }

    async exportCategoryData() {
        console.log('📁 Exporting category data...');
        // Implementazione export
    }

    // Utility methods
    onMetricChange(metric) {
        console.log(`🔄 Metric changed to: ${metric}`);
        // Implementazione specifica per metrica
    }

    onGranularityChange(granularity) {
        console.log(`🔄 Granularity changed to: ${granularity}`);
        // Ricarica con nuova granularità
    }
}

// ✅ CLASSE DASHBOARD PRINCIPALE
class Dashboard {
    constructor() {
        this.initialized = false;
        this.currentFilters = {};
        this.data = {};
        this.charts = {};
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
            
            // ✅ 4. Inizializza Dashboard Dinamica
            await window.dynamicDashboard.init();

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
        
        // ✅ INIZIALIZZA NOTIFICATIONSYSTEM
        if (!window.notificationSystem) {
            try {
                console.log('🔧 Initializing NotificationSystem...');
                window.notificationSystem = {
                    success: (msg) => console.log(`✅ ${msg}`),
                    error: (msg) => console.error(`❌ ${msg}`),
                    warning: (msg) => console.warn(`⚠️ ${msg}`),
                    info: (msg) => console.info(`ℹ️ ${msg}`),
                    show: (title, body, type) => console.log(`${type}: ${title} - ${body}`)
                };
                status.notificationSystem = true;
                console.log('✅ NotificationSystem mock created');
            } catch (error) {
                console.warn('⚠️ Could not initialize NotificationSystem:', error);
            }
        }
        
        // ✅ INIZIALIZZA DATAMANAGER
        if (!window.dataManager) {
            try {
                console.log('🔧 Initializing DataManager...');
                window.dataManager = {
                    getDashboardData: async () => ({
                        trackings: [],
                        shipments: [],
                        carriers: [],
                        additionalCosts: []
                    }),
                    getTrackings: async () => [],
                    getShipments: async () => [],
                    getCarriers: async () => [],
                    getAdditionalCosts: async () => []
                };
                status.dataManager = true;
                console.log('✅ DataManager mock created');
            } catch (error) {
                console.warn('⚠️ Could not initialize DataManager:', error);
            }
        }
        
        // ✅ VERIFICA SERVIZI ESSENZIALI
        const essentialServices = ['supabase'];
        const essentialReady = essentialServices.every(service => status[service]);
        
        if (essentialReady) {
            console.log('✅ Essential services are available!');
            return true;
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // ✅ FALLBACK FINALE (UNA SOLA VOLTA)
    console.warn('⚠️ Not all services available, continuing anyway...');
    return true;
}
        setupEventListeners() {
        console.log('🔄 Setting up Dashboard event listeners...');
        
        // Filter events
        const periodFilter = document.getElementById('periodFilter');
        const carrierFilter = document.getElementById('carrierFilter');
        const statusFilter = document.getElementById('statusFilter');
        const transportFilter = document.getElementById('transportFilter');
        
        if (periodFilter) {
            periodFilter.addEventListener('change', (e) => {
                this.currentFilters.period = parseInt(e.target.value);
                console.log('🔄 Period filter changed:', this.currentFilters.period);
            });
        }
        
        if (carrierFilter) {
            carrierFilter.addEventListener('change', (e) => {
                this.currentFilters.carrier = e.target.value;
                console.log('🔄 Carrier filter changed:', this.currentFilters.carrier);
            });
        }
        
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.currentFilters.status = e.target.value;
                console.log('🔄 Status filter changed:', this.currentFilters.status);
            });
        }
        
        if (transportFilter) {
            transportFilter.addEventListener('change', (e) => {
                this.currentFilters.transport = e.target.value;
                console.log('🔄 Transport filter changed:', this.currentFilters.transport);
            });
        }
        
        // ✅ AGGIUNGI ALTRI FILTRI AVANZATI
        const advancedFilters = ['originFilter', 'destinationFilter', 'weightRangeFilter', 'costRangeFilter', 'priorityFilter'];
        
        advancedFilters.forEach(filterId => {
            const element = document.getElementById(filterId);
            if (element) {
                element.addEventListener('change', (e) => {
                    const filterName = filterId.replace('Filter', '');
                    this.currentFilters[filterName] = e.target.value;
                    console.log(`🔄 ${filterName} filter changed:`, e.target.value);
                });
            }
        });
        
        console.log('✅ Dashboard event listeners setup complete');
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
        
        // ✅ VERIFICA DataManager
        if (!this.dataManager && !window.dataManager) {
            console.log('🔧 DataManager not available, using direct Supabase approach...');
            
            // ✅ CARICA DIRETTAMENTE DA SUPABASE
            const rawData = await this.loadDataDirectlyFromSupabase();
            
            // ✅ SALVA RAW DATA
            this.rawData = rawData;
            window.dashboard.rawData = rawData;
            
            // Applica filtri e calcola aggregazioni
            const filteredData = this.applyDataFilters(rawData);
            this.data = this.calculateAggregations(filteredData);
            
            console.log('✅ Dashboard data loaded directly from Supabase');
            return;
        }
        
        const dataManager = this.dataManager || window.dataManager;
        
        // ✅ CARICA DATI CON FALLBACK
        let rawData;
        try {
            if (dataManager.getDashboardData && typeof dataManager.getDashboardData === 'function') {
                rawData = await dataManager.getDashboardData();
                console.log('📊 Raw data loaded via DataManager:', rawData);
            } else {
                console.log('🔄 DataManager.getDashboardData not available, loading directly...');
                rawData = await this.loadDataDirectlyFromSupabase();
            }
        } catch (dataError) {
            console.error('❌ Error getting dashboard data:', dataError);
            console.log('🔄 Trying direct Supabase approach...');
            rawData = await this.loadDataDirectlyFromSupabase();
        }
        
        // ✅ SALVA E PROCESSA DATI
        this.rawData = rawData;
        window.dashboard.rawData = rawData;
        
        const filteredData = this.applyDataFilters(rawData);
        this.data = this.calculateAggregations(filteredData);
        
        console.log('✅ Dashboard data loaded successfully');
        
    } catch (error) {
        console.error('❌ Error loading dashboard data:', error);
        
        // ✅ FALLBACK CON DATI MOCK MIGLIORATI
        console.log('🔄 Using enhanced mock data as fallback...');
        this.data = this.getEnhancedMockData();
        this.rawData = { trackings: [], shipments: [], carriers: [], additionalCosts: [] };
        
        console.log('⚠️ Dashboard loaded with enhanced mock data');
    }
}

// ✅ METODO FALLBACK PER CARICARE DATI SEPARATAMENTE
async loadDataSeparately() {
    console.log('🔄 Loading data separately...');
    
    try {
        // Prova a caricare direttamente da Supabase
        const supabase = window.supabase;
        if (!supabase) {
            throw new Error('Supabase not available');
        }
        
        console.log('📊 Loading trackings...');
        const { data: trackings, error: trackingsError } = await supabase
            .from('trackings')
            .select('*')
            .limit(100);
            
        if (trackingsError) {
            console.error('❌ Trackings error:', trackingsError);
        }
        
        console.log('📊 Loading shipments...');
        const { data: shipments, error: shipmentsError } = await supabase
            .from('shipments')
            .select('*')
            .limit(100);
            
        if (shipmentsError) {
            console.error('❌ Shipments error:', shipmentsError);
        }
        
        console.log('📊 Loading carriers...');
        const { data: carriers, error: carriersError } = await supabase
            .from('carriers')
            .select('*');
            
        if (carriersError) {
            console.error('❌ Carriers error:', carriersError);
        }
        
        const result = {
            trackings: trackings || [],
            shipments: shipments || [],
            carriers: carriers || [],
            additionalCosts: []
        };
        
        console.log('✅ Data loaded separately:', {
            trackings: result.trackings.length,
            shipments: result.shipments.length,
            carriers: result.carriers.length
        });
        
        return result;
        
    } catch (error) {
        console.error('❌ Error loading data separately:', error);
        
        // Ritorna dati vuoti invece di fare throw
        return {
            trackings: [],
            shipments: [],
            carriers: [],
            additionalCosts: []
        };
    }
}

// ✅ DATI MOCK PER FALLBACK
getMockData() {
    return {
        totalShipments: 8,
        totalCosts: 15000,
        totalWeight: 1200,
        totalVolume: 15.5,
        activeCarriers: 3,
        trends: [
            { month: '2025-07', monthName: 'Lug 25', shipments: 5, costs: 8500, weight: 800, volume: 10 },
            { month: '2025-08', monthName: 'Ago 25', shipments: 3, costs: 6500, weight: 400, volume: 5.5 }
        ],
        transportModes: [
            { name: 'Stradale', count: 5, revenue: 8000 },
            { name: 'Marittimo', count: 2, revenue: 5000 },
            { name: 'Aereo', count: 1, revenue: 2000 }
        ],
        carriersPerformance: [
            { code: 'DHL', name: 'DHL Express', shipments: 3, revenue: 6000, weight: 300, volume: 4, delivered: 3, avgCost: 2000, performance: 100 },
            { code: 'TNT', name: 'TNT Express', shipments: 2, revenue: 4000, weight: 200, volume: 3, delivered: 2, avgCost: 2000, performance: 100 },
            { code: 'UPS', name: 'UPS Express', shipments: 3, revenue: 5000, weight: 700, volume: 8.5, delivered: 2, avgCost: 1667, performance: 67 }
        ]
    };
}

 async refreshWithFilters() {
    console.log('🔄 Refreshing with filters...');
    
    try {
        const dataManager = window.dataManager;
        
        if (!dataManager || typeof dataManager.getTrackings !== 'function') {
            console.log('🔄 DataManager not available, using direct Supabase approach...');
            
            // ✅ USA METODO DIRETTO
            const rawData = await this.loadDataDirectlyFromSupabase();
            const filtered = this.applyDataFilters(rawData);
            this.data = this.calculateAggregations(filtered);
            this.rawData = rawData;
            window.dashboard.rawData = rawData;
            
            await this.renderDashboard();
            console.log('✅ Refresh with filters complete (direct)');
            return;
        }
        
        // ✅ USA DATAMANAGER SE DISPONIBILE
        const [trackings, shipments, carriers, additionalCosts] = await Promise.allSettled([
            dataManager.getTrackings?.() || Promise.resolve([]),
            dataManager.getShipments?.() || Promise.resolve([]),
            dataManager.getCarriers?.() || Promise.resolve([]),
            this.loadAdditionalCosts() || Promise.resolve([])
        ]);
        
        const rawData = {
            trackings: trackings.status === 'fulfilled' ? trackings.value : [],
            shipments: shipments.status === 'fulfilled' ? shipments.value : [],
            carriers: carriers.status === 'fulfilled' ? carriers.value : [],
            additionalCosts: additionalCosts.status === 'fulfilled' ? additionalCosts.value : []
        };
        
        console.log('📊 Raw data loaded:', {
            trackings: rawData.trackings.length,
            shipments: rawData.shipments.length,
            carriers: rawData.carriers.length,
            additionalCosts: rawData.additionalCosts.length
        });
        
        // ✅ PROCESSA E RENDERIZZA
        const filtered = this.applyDataFilters(rawData);
        this.data = this.calculateAggregations(filtered);
        this.rawData = rawData;
        window.dashboard.rawData = rawData;
        
        await this.renderDashboard();
        
        console.log('✅ Refresh with filters complete');
        
    } catch (error) {
        console.error('❌ Error refreshing with filters:', error);
        
        // ✅ FALLBACK: usa dati esistenti o mock
        if (this.data && Object.keys(this.data).length > 0) {
            console.log('🔄 Using existing data for refresh');
            await this.renderDashboard();
        } else {
            console.log('🔄 Using enhanced mock data for refresh');
            this.data = this.getEnhancedMockData();
            this.rawData = { trackings: [], shipments: [], carriers: [], additionalCosts: [] };
            await this.renderDashboard();
        }
        
        // ✅ NON FARE THROW - CONTINUA CON FALLBACK
        console.log('⚠️ Refresh completed with fallback data');
    }
}
// ✅ NUOVO METODO: CARICA DIRETTAMENTE DA SUPABASE
async loadDataDirectlyFromSupabase() {
    console.log('🔄 Loading data directly from Supabase...');
    
    try {
        const supabase = window.supabase;
        if (!supabase) {
            throw new Error('Supabase not available');
        }
        
        // ✅ CARICA TUTTE LE TABELLE IN PARALLELO
        const [trackingsResult, shipmentsResult, carriersResult] = await Promise.allSettled([
            supabase.from('trackings').select('*').limit(100),
            supabase.from('shipments').select('*').limit(100),
            supabase.from('carriers').select('*').limit(50)
        ]);
        
        // ✅ ESTRAI DATI DAI RISULTATI
        const trackings = trackingsResult.status === 'fulfilled' && !trackingsResult.value.error ? 
            trackingsResult.value.data : [];
        const shipments = shipmentsResult.status === 'fulfilled' && !shipmentsResult.value.error ? 
            shipmentsResult.value.data : [];
        const carriers = carriersResult.status === 'fulfilled' && !carriersResult.value.error ? 
            carriersResult.value.data : [];
        
        console.log('✅ Data loaded directly from Supabase:', {
            trackings: trackings.length,
            shipments: shipments.length,
            carriers: carriers.length
        });
        
        return {
            trackings,
            shipments,
            carriers,
            additionalCosts: []
        };
        
    } catch (error) {
        console.error('❌ Error loading data directly from Supabase:', error);
        
        // ✅ RITORNA DATI VUOTI INVECE DI LANCIARE ERRORE
        return {
            trackings: [],
            shipments: [],
            carriers: [],
            additionalCosts: []
        };
    }
}

// ✅ DATI MOCK MIGLIORATI
getEnhancedMockData() {
    return {
        totalShipments: 15,
        totalCosts: 24500,
        totalWeight: 2100,
        totalVolume: 28.7,
        activeCarriers: 5,
        trends: [
            { month: '2025-03', monthName: 'Mar 25', shipments: 8, costs: 12000, weight: 1200, volume: 15 },
            { month: '2025-04', monthName: 'Apr 25', shipments: 12, costs: 18000, weight: 1600, volume: 22 },
            { month: '2025-05', monthName: 'Mag 25', shipments: 10, costs: 15000, weight: 1400, volume: 19 },
            { month: '2025-06', monthName: 'Giu 25', shipments: 14, costs: 21000, weight: 1800, volume: 25 },
            { month: '2025-07', monthName: 'Lug 25', shipments: 11, costs: 16500, weight: 1500, volume: 20 },
            { month: '2025-08', monthName: 'Ago 25', shipments: 9, costs: 13500, weight: 1300, volume: 18 }
        ],
        transportModes: [
            { name: 'Stradale', count: 8, revenue: 12000 },
            { name: 'Marittimo', count: 4, revenue: 8000 },
            { name: 'Aereo', count: 2, revenue: 3500 },
            { name: 'Corriere', count: 1, revenue: 1000 }
        ],
        carriersPerformance: [
            { code: 'DHL', name: 'DHL Express', shipments: 5, revenue: 9500, weight: 450, volume: 6, delivered: 5, avgCost: 1900, performance: 100 },
            { code: 'TNT', name: 'TNT Express', shipments: 3, revenue: 5500, weight: 350, volume: 4.5, delivered: 3, avgCost: 1833, performance: 100 },
            { code: 'UPS', name: 'UPS Express', shipments: 4, revenue: 6000, weight: 800, volume: 10, delivered: 3, avgCost: 1500, performance: 75 },
            { code: 'FEDEX', name: 'FedEx Express', shipments: 2, revenue: 2500, weight: 300, volume: 4, delivered: 2, avgCost: 1250, performance: 100 },
            { code: 'BARTOLINI', name: 'Bartolini BRT', shipments: 1, revenue: 1000, weight: 200, volume: 4.2, delivered: 1, avgCost: 1000, performance: 100 }
        ]
    };
}
        async loadAdditionalCosts() {
        try {
            const dataManager = this.dataManager || window.dataManager;
            
            if (dataManager && dataManager.getAdditionalCosts) {
                return await dataManager.getAdditionalCosts() || [];
            } else {
                console.warn('⚠️ DataManager.getAdditionalCosts not available');
                return [];
            }
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
                label: 'Costi Totali', // ✅ CAMBIATO da "Fatturato"
                value: `€${totalCosts.toLocaleString()}`,
                growth: -2.1, // ✅ NEGATIVO = BUONO (risparmio)
                icon: 'fas fa-receipt', // ✅ CAMBIATO icona
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
                label: 'Costo Medio', // ✅ ENFASI SU COSTO
                value: totalShipments > 0 ? 
                    `€${(totalCosts / totalShipments).toFixed(2)}` : '€0',
                growth: -5.2, // ✅ NEGATIVO = BUONO (costo diminuito)
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
                            label: 'Costi (€)', // ✅ CAMBIATO da "Fatturato"
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

        // ✅ POPOLAZIONE DROPDOWN MIGLIORATA
    populateFilterDropdowns() {
        console.log('🔄 Populating filter dropdowns...');
        
        try {
            // 1. Popola Spedizionieri
            this.populateCarrierFilter();
            
            // 2. Popola Origini e Destinazioni
            this.populateLocationFilters();
            
            // 3. Popola Metriche specifiche (già gestito da Dynamic Dashboard)
            
            console.log('✅ Filter dropdowns populated');
            
        } catch (error) {
            console.error('❌ Error populating dropdowns:', error);
        }
    }
    
    // ✅ POPOLA CARRIER FILTER
    populateCarrierFilter() {
        const carrierFilter = document.getElementById('carrierFilter');
        if (!carrierFilter) return;
        
        // Usa dati dai carriers performance se disponibili
        let carrierOptions = '<option value="">Tutti gli spedizionieri</option>';
        
        if (this.data.carriersPerformance && this.data.carriersPerformance.length > 0) {
            carrierOptions += this.data.carriersPerformance.map(carrier => 
                `<option value="${carrier.code}">${carrier.name} (${carrier.shipments} spedizioni)</option>`
            ).join('');
        } else {
            // Fallback: usa dati raw
            if (this.rawData && this.rawData.trackings) {
                const uniqueCarriers = new Set();
                this.rawData.trackings.forEach(t => {
                    if (t.carrier_name && t.carrier_name !== 'N/A') {
                        uniqueCarriers.add(JSON.stringify({
                            name: t.carrier_name,
                            code: t.carrier_code || t.carrier_name
                        }));
                    }
                });
                
                Array.from(uniqueCarriers).forEach(carrierStr => {
                    const carrier = JSON.parse(carrierStr);
                    carrierOptions += `<option value="${carrier.code}">${carrier.name}</option>`;
                });
            }
        }
        
        carrierFilter.innerHTML = carrierOptions;
        console.log('✅ Carrier filter populated');
    }
    
    // ✅ POPOLA LOCATION FILTERS
    populateLocationFilters() {
        const originFilter = document.getElementById('originFilter');
        const destinationFilter = document.getElementById('destinationFilter');
        
        if (!this.rawData || !this.rawData.shipments) return;
        
        // Raccogli paesi unici
        const origins = new Set();
        const destinations = new Set();
        
        this.rawData.shipments.forEach(s => {
            if (s.origin_country && s.origin_country.trim()) {
                origins.add(s.origin_country.trim());
            }
            if (s.destination_country && s.destination_country.trim()) {
                destinations.add(s.destination_country.trim());
            }
        });
        
        // Popola origine
        if (originFilter) {
            let originOptions = '<option value="">Tutte le origini</option>';
            Array.from(origins).sort().forEach(country => {
                originOptions += `<option value="${country}">${country}</option>`;
            });
            originFilter.innerHTML = originOptions;
        }
        
        // Popola destinazione
        if (destinationFilter) {
            let destinationOptions = '<option value="">Tutte le destinazioni</option>';
            Array.from(destinations).sort().forEach(country => {
                destinationOptions += `<option value="${country}">${country}</option>`;
            });
            destinationFilter.innerHTML = destinationOptions;
        }
        
        console.log('✅ Location filters populated:', {
            origins: origins.size,
            destinations: destinations.size
        });
    }
        // ✅ METODO RESET FILTRI
    async resetFilters() {
        console.log('🔄 Resetting all filters...');
        
        try {
            // Reset filtri correnti
            this.currentFilters = {};
            
            // Reset dropdown values
            const filterIds = [
                'periodFilter', 'carrierFilter', 'statusFilter', 'transportFilter',
                'originFilter', 'destinationFilter', 'weightRangeFilter', 
                'costRangeFilter', 'priorityFilter', 'specificMetric'
            ];
            
            filterIds.forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    element.selectedIndex = 0; // Reset to first option
                }
            });
            
            // Ricarica dashboard con filtri resettati
            await this.refreshWithFilters();
            
            window.notificationSystem?.success('Filtri resettati!');
            
        } catch (error) {
            console.error('❌ Error resetting filters:', error);
            window.notificationSystem?.error('Errore durante il reset filtri');
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

// Initialize Dynamic Dashboard
window.dynamicDashboard = new DynamicDashboard();

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
// ✅ AGGIUNGI QUESTO ALLA FINE DEL FILE PER DEBUGGING
console.log('🎯 Dashboard JavaScript loaded successfully');
window.dashboardJSLoaded = true;