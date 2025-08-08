/**
 * Dashboard V2 - Focus sui Costi di Trasporto
 * Gestione completa metriche trasporti, corrieri e spedizionieri
 */

class TransportCostDashboard {
    constructor() {
        this.data = {
            shipments: [],
            trackings: [],
            carriers: [],
            costs: [],
            routes: []
        };
        
        this.filters = {
            period: 'last_3_months',
            carrier: '',
            transportMode: '',
            route: '',
            status: '',
            startDate: null,
            endDate: null
        };
        
        this.charts = {};
        this.initialize();
    }

    async initialize() {
        console.log('🚀 Initializing Transport Cost Dashboard...');
        
        try {
            // 1. Setup filtri
            this.setupFilters();
            
            // 2. Carica dati
            await this.loadData();
            
            // 3. Calcola metriche
            this.calculateMetrics();
            
            // 4. Renderizza dashboard
            this.renderDashboard();
            
            console.log('✅ Dashboard initialized successfully');
        } catch (error) {
            console.error('❌ Dashboard initialization error:', error);
            this.showError('Errore durante il caricamento della dashboard');
        }
    }

    setupFilters() {
        // Event listener per filtri
        document.getElementById('periodFilter').addEventListener('change', (e) => {
            this.filters.period = e.target.value;
            if (e.target.value === 'custom') {
                document.getElementById('customDateRange').style.display = 'flex';
            } else {
                document.getElementById('customDateRange').style.display = 'none';
            }
        });

        document.getElementById('applyFilters').addEventListener('click', () => {
            this.applyFilters();
        });

        document.getElementById('resetFilters').addEventListener('click', () => {
            this.resetFilters();
        });

        // Altri filtri
        ['carrierFilter', 'transportModeFilter', 'routeFilter', 'statusFilter'].forEach(id => {
            document.getElementById(id).addEventListener('change', (e) => {
                const key = id.replace('Filter', '');
                this.filters[key] = e.target.value;
            });
        });
    }

    async loadData() {
        console.log('📊 Loading transport data...');
        
        try {
            // Carica dati da Supabase
            const [shipments, trackings, carriers] = await Promise.all([
                this.loadShipments(),
                this.loadTrackings(),
                this.loadCarriers()
            ]);

            this.data.shipments = shipments;
            this.data.trackings = trackings;
            this.data.carriers = carriers;

            // Processa e combina dati
            this.processData();
            
            console.log('✅ Data loaded:', {
                shipments: this.data.shipments.length,
                trackings: this.data.trackings.length,
                carriers: this.data.carriers.length
            });
            
        } catch (error) {
            console.error('❌ Error loading data:', error);
            // Usa dati mock per testing
            this.loadMockData();
        }
    }

    async loadShipments() {
        const { data, error } = await window.supabase
            .from('shipments')
            .select('*')
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        return data || [];
    }

    async loadTrackings() {
        const { data, error } = await window.supabase
            .from('trackings')
            .select('*')
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        return data || [];
    }

    async loadCarriers() {
        const { data, error } = await window.supabase
            .from('carriers')
            .select('*');
            
        if (error) throw error;
        return data || [];
    }

    processData() {
        // Combina dati shipments e trackings
        this.data.combined = this.data.shipments.map(shipment => {
            const tracking = this.data.trackings.find(t => 
                t.shipment_id === shipment.id || 
                t.tracking_number === shipment.tracking_number
            );
            
            return {
                ...shipment,
                tracking_data: tracking,
                // Calcola costo totale
                total_cost: (parseFloat(shipment.freight_cost) || 0) + 
                           (parseFloat(shipment.other_costs) || 0) +
                           (parseFloat(shipment.customs_duties) || 0) +
                           (parseFloat(shipment.insurance_cost) || 0),
                // Calcola tempo di transito
                transit_time: this.calculateTransitTime(shipment, tracking)
            };
        });

        // Calcola rotte uniche
        this.calculateRoutes();
        
        // Popola filtri dropdown
        this.populateFilters();
    }

    calculateTransitTime(shipment, tracking) {
        if (!shipment.created_at || !shipment.delivered_at) return null;
        
        const start = new Date(shipment.created_at);
        const end = new Date(shipment.delivered_at);
        const days = Math.floor((end - start) / (1000 * 60 * 60 * 24));
        
        return days;
    }

    calculateRoutes() {
        const routesMap = new Map();
        
        this.data.combined.forEach(item => {
            const route = `${item.origin_country || 'Unknown'} → ${item.destination_country || 'Unknown'}`;
            
            if (!routesMap.has(route)) {
                routesMap.set(route, {
                    route: route,
                    count: 0,
                    totalCost: 0,
                    avgTransitTime: []
                });
            }
            
            const routeData = routesMap.get(route);
            routeData.count++;
            routeData.totalCost += item.total_cost || 0;
            if (item.transit_time) {
                routeData.avgTransitTime.push(item.transit_time);
            }
        });
        
        this.data.routes = Array.from(routesMap.values()).map(route => ({
            ...route,
            avgCost: route.totalCost / route.count,
            avgTransitTime: route.avgTransitTime.length > 0 
                ? route.avgTransitTime.reduce((a, b) => a + b, 0) / route.avgTransitTime.length 
                : 0
        }));
    }

    populateFilters() {
        // Popola carrier filter
        const carrierSelect = document.getElementById('carrierFilter');
        const uniqueCarriers = [...new Set(this.data.combined.map(s => s.carrier_name))].filter(Boolean);
        
        uniqueCarriers.forEach(carrier => {
            const option = document.createElement('option');
            option.value = carrier;
            option.textContent = carrier;
            carrierSelect.appendChild(option);
        });
    }

    calculateMetrics() {
        const filteredData = this.getFilteredData();
        
        // 1. Costo Totale
        const totalCost = filteredData.reduce((sum, item) => sum + (item.total_cost || 0), 0);
        
        // 2. Costo Medio per Spedizione
        const avgCostPerShipment = filteredData.length > 0 ? totalCost / filteredData.length : 0;
        
        // 3. Costo per Kg
        const totalWeight = filteredData.reduce((sum, item) => sum + (parseFloat(item.total_weight_kg) || 0), 0);
        const costPerKg = totalWeight > 0 ? totalCost / totalWeight : 0;
        
        // 4. Tempo Medio di Transito
        const transitTimes = filteredData.map(item => item.transit_time).filter(t => t !== null);
        const avgTransitTime = transitTimes.length > 0 
            ? transitTimes.reduce((a, b) => a + b, 0) / transitTimes.length 
            : 0;
        
        // 5. Totale Spedizioni
        const totalShipments = filteredData.length;
        
        // 6. Puntualità
        const onTimeCount = filteredData.filter(item => item.status === 'delivered' && item.on_time).length;
        const deliveredCount = filteredData.filter(item => item.status === 'delivered').length;
        const onTimePercentage = deliveredCount > 0 ? (onTimeCount / deliveredCount) * 100 : 0;
        
        // Aggiorna KPI nel DOM
        this.updateKPIs({
            totalCost,
            avgCostPerShipment,
            costPerKg,
            avgTransitTime,
            totalShipments,
            onTimePercentage
        });
        
        // Calcola trend
        this.calculateTrends(filteredData);
    }

    getFilteredData() {
        let filtered = [...this.data.combined];
        
        // Applica filtri
        if (this.filters.carrier) {
            filtered = filtered.filter(item => item.carrier_name === this.filters.carrier);
        }
        
        if (this.filters.transportMode) {
            filtered = filtered.filter(item => item.transport_mode === this.filters.transportMode);
        }
        
        if (this.filters.status) {
            filtered = filtered.filter(item => item.status === this.filters.status);
        }
        
        // Filtro periodo
        const { startDate, endDate } = this.getDateRange();
        filtered = filtered.filter(item => {
            const itemDate = new Date(item.created_at);
            return itemDate >= startDate && itemDate <= endDate;
        });
        
        return filtered;
    }

    getDateRange() {
        const now = new Date();
        let startDate = new Date();
        let endDate = new Date();
        
        switch (this.filters.period) {
            case 'current_month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                break;
            case 'last_month':
                startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                endDate = new Date(now.getFullYear(), now.getMonth(), 0);
                break;
            case 'last_3_months':
                startDate = new Date(now.setMonth(now.getMonth() - 3));
                endDate = new Date();
                break;
            case 'last_6_months':
                startDate = new Date(now.setMonth(now.getMonth() - 6));
                endDate = new Date();
                break;
            case 'current_year':
                startDate = new Date(now.getFullYear(), 0, 1);
                endDate = new Date();
                break;
            case 'custom':
                startDate = this.filters.startDate ? new Date(this.filters.startDate) : new Date();
                endDate = this.filters.endDate ? new Date(this.filters.endDate) : new Date();
                break;
        }
        
        return { startDate, endDate };
    }

    updateKPIs(metrics) {
        // Aggiorna valori KPI
        document.getElementById('totalCost').textContent = `€${metrics.totalCost.toFixed(2)}`;
        document.getElementById('avgCostPerShipment').textContent = `€${metrics.avgCostPerShipment.toFixed(2)}`;
        document.getElementById('costPerKg').textContent = `€${metrics.costPerKg.toFixed(2)}`;
        document.getElementById('avgTransitTime').textContent = `${metrics.avgTransitTime.toFixed(1)} gg`;
        document.getElementById('totalShipments').textContent = metrics.totalShipments;
        document.getElementById('onTimeDelivery').textContent = `${metrics.onTimePercentage.toFixed(1)}%`;
    }

    calculateTrends(data) {
        // Implementa calcolo trend rispetto al periodo precedente
        // TODO: Completare logica trend
    }

    renderDashboard() {
        // Renderizza charts
        this.renderCostTrendChart();
        this.renderCostByCarrierChart();
        this.renderCostByModeChart();
        this.renderTransitTimeChart();
        
        // Renderizza analisi
        this.renderTopRoutes();
        this.renderCarrierPerformance();
        this.renderAdditionalCosts();
        this.renderCostAlerts();
    }

    renderCostTrendChart() {
        const ctx = document.getElementById('costTrendChart').getContext('2d');
        const filteredData = this.getFilteredData();
        
        // Raggruppa per periodo
        const groupedData = this.groupByPeriod(filteredData);
        
        this.charts.costTrend = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Object.keys(groupedData),
                datasets: [{
                    label: 'Costi Trasporto',
                    data: Object.values(groupedData).map(items => 
                        items.reduce((sum, item) => sum + item.total_cost, 0)
                    ),
                    borderColor: '#e74c3c',
                    backgroundColor: 'rgba(231, 76, 60, 0.1)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '€' + value.toFixed(0);
                            }
                        }
                    }
                }
            }
        });
    }

    renderCostByCarrierChart() {
        const ctx = document.getElementById('costByCarrierChart').getContext('2d');
        const filteredData = this.getFilteredData();
        
        // Raggruppa per corriere
        const carrierCosts = {};
        filteredData.forEach(item => {
            const carrier = item.carrier_name || 'Unknown';
            if (!carrierCosts[carrier]) {
                carrierCosts[carrier] = 0;
            }
            carrierCosts[carrier] += item.total_cost || 0;
        });
        
        this.charts.costByCarrier = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(carrierCosts),
                datasets: [{
                    label: 'Costi per Corriere',
                    data: Object.values(carrierCosts),
                    backgroundColor: '#3498db'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '€' + value.toFixed(0);
                            }
                        }
                    }
                }
            }
        });
    }

    renderCostByModeChart() {
        const ctx = document.getElementById('costByModeChart').getContext('2d');
        const filteredData = this.getFilteredData();
        
        // Raggruppa per modalità
        const modeCosts = {};
        filteredData.forEach(item => {
            const mode = item.transport_mode || 'Stradale';
            if (!modeCosts[mode]) {
                modeCosts[mode] = 0;
            }
            modeCosts[mode] += item.total_cost || 0;
        });
        
        this.charts.costByMode = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(modeCosts),
                datasets: [{
                    data: Object.values(modeCosts),
                    backgroundColor: [
                        '#e74c3c',
                        '#3498db',
                        '#2ecc71',
                        '#f39c12',
                        '#9b59b6'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    renderTransitTimeChart() {
        const ctx = document.getElementById('transitTimeChart').getContext('2d');
        const filteredData = this.getFilteredData();
        
        // Calcola tempo medio per corriere
        const carrierTimes = {};
        filteredData.forEach(item => {
            if (item.transit_time !== null) {
                const carrier = item.carrier_name || 'Unknown';
                if (!carrierTimes[carrier]) {
                    carrierTimes[carrier] = [];
                }
                carrierTimes[carrier].push(item.transit_time);
            }
        });
        
        const avgTimes = {};
        Object.keys(carrierTimes).forEach(carrier => {
            const times = carrierTimes[carrier];
            avgTimes[carrier] = times.reduce((a, b) => a + b, 0) / times.length;
        });
        
        this.charts.transitTime = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(avgTimes),
                datasets: [{
                    label: 'Tempo Medio di Transito (giorni)',
                    data: Object.values(avgTimes),
                    backgroundColor: '#2ecc71'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return value + ' gg';
                            }
                        }
                    }
                }
            }
        });
    }

    renderTopRoutes() {
        const container = document.getElementById('topRoutesList');
        const topRoutes = this.data.routes
            .sort((a, b) => b.totalCost - a.totalCost)
            .slice(0, 10);
        
        let html = '<div class="route-list">';
        topRoutes.forEach((route, index) => {
            html += `
                <div class="route-item">
                    <span class="route-rank">${index + 1}</span>
                    <span class="route-name">${route.route}</span>
                    <span class="route-cost">€${route.totalCost.toFixed(2)}</span>
                    <span class="route-count">${route.count} spedizioni</span>
                </div>
            `;
        });
        html += '</div>';
        
        container.innerHTML = html;
    }

    renderCarrierPerformance() {
        const container = document.getElementById('carrierPerformanceTable');
        const filteredData = this.getFilteredData();
        
        // Calcola performance per corriere
        const carrierStats = {};
        filteredData.forEach(item => {
            const carrier = item.carrier_name || 'Unknown';
            if (!carrierStats[carrier]) {
                carrierStats[carrier] = {
                    name: carrier,
                    count: 0,
                    totalCost: 0,
                    transitTimes: [],
                    onTime: 0,
                    delivered: 0
                };
            }
            
            const stats = carrierStats[carrier];
            stats.count++;
            stats.totalCost += item.total_cost || 0;
            if (item.transit_time !== null) {
                stats.transitTimes.push(item.transit_time);
            }
            if (item.status === 'delivered') {
                stats.delivered++;
                if (item.on_time) stats.onTime++;
            }
        });
        
        // Calcola metriche finali
        const performanceData = Object.values(carrierStats).map(stats => ({
            ...stats,
            avgCost: stats.totalCost / stats.count,
            avgTransitTime: stats.transitTimes.length > 0 
                ? stats.transitTimes.reduce((a, b) => a + b, 0) / stats.transitTimes.length 
                : 0,
            onTimeRate: stats.delivered > 0 ? (stats.onTime / stats.delivered) * 100 : 0
        }));
        
        // Crea tabella
        let html = `
            <table class="performance-table">
                <thead>
                    <tr>
                        <th>Corriere</th>
                        <th>Spedizioni</th>
                        <th>Costo Medio</th>
                        <th>Tempo Medio</th>
                        <th>Puntualità</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        performanceData.forEach(carrier => {
            html += `
                <tr>
                    <td>${carrier.name}</td>
                    <td>${carrier.count}</td>
                    <td>€${carrier.avgCost.toFixed(2)}</td>
                    <td>${carrier.avgTransitTime.toFixed(1)} gg</td>
                    <td>${carrier.onTimeRate.toFixed(1)}%</td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        container.innerHTML = html;
    }

    renderAdditionalCosts() {
        const container = document.getElementById('additionalCostsList');
        const filteredData = this.getFilteredData();
        
        // Calcola breakdown costi aggiuntivi
        const additionalCosts = {
            'Dazi Doganali': filteredData.reduce((sum, item) => sum + (parseFloat(item.customs_duties) || 0), 0),
            'Assicurazione': filteredData.reduce((sum, item) => sum + (parseFloat(item.insurance_cost) || 0), 0),
            'Altri Costi': filteredData.reduce((sum, item) => sum + (parseFloat(item.other_costs) || 0), 0)
        };
        
        let html = '<div class="cost-breakdown">';
        Object.entries(additionalCosts).forEach(([label, value]) => {
            const percentage = filteredData.length > 0 
                ? (value / filteredData.reduce((sum, item) => sum + item.total_cost, 0)) * 100 
                : 0;
            
            html += `
                <div class="cost-item">
                    <span class="cost-label">${label}</span>
                    <span class="cost-value">€${value.toFixed(2)}</span>
                    <span class="cost-percentage">${percentage.toFixed(1)}%</span>
                </div>
            `;
        });
        html += '</div>';
        
        container.innerHTML = html;
    }

    renderCostAlerts() {
        const container = document.getElementById('costAlertsList');
        const filteredData = this.getFilteredData();
        
        // Calcola media e deviazione standard
        const costs = filteredData.map(item => item.total_cost);
        const avgCost = costs.reduce((a, b) => a + b, 0) / costs.length;
        const stdDev = Math.sqrt(costs.map(x => Math.pow(x - avgCost, 2)).reduce((a, b) => a + b) / costs.length);
        
        // Trova anomalie (costi > 2 deviazioni standard)
        const anomalies = filteredData.filter(item => item.total_cost > avgCost + (2 * stdDev));
        
        let html = '<div class="alert-list">';
        if (anomalies.length === 0) {
            html += '<div class="no-alerts">✅ Nessuna anomalia rilevata</div>';
        } else {
            anomalies.forEach(item => {
                html += `
                    <div class="alert-item">
                        <span class="alert-icon">⚠️</span>
                        <span class="alert-text">
                            Spedizione ${item.shipment_number || 'N/A'} - 
                            Costo anomalo: €${item.total_cost.toFixed(2)} 
                            (Media: €${avgCost.toFixed(2)})
                        </span>
                    </div>
                `;
            });
        }
        html += '</div>';
        
        container.innerHTML = html;
    }

    groupByPeriod(data) {
        const grouped = {};
        const periodType = document.getElementById('costChartPeriod').value;
        
        data.forEach(item => {
            const date = new Date(item.created_at);
            let key;
            
            switch (periodType) {
                case 'daily':
                    key = date.toISOString().split('T')[0];
                    break;
                case 'weekly':
                    const weekNumber = this.getWeekNumber(date);
                    key = `${date.getFullYear()}-W${weekNumber}`;
                    break;
                case 'monthly':
                default:
                    key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                    break;
            }
            
            if (!grouped[key]) {
                grouped[key] = [];
            }
            grouped[key].push(item);
        });
        
        return grouped;
    }

    getWeekNumber(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    }

    applyFilters() {
        console.log('🔄 Applying filters...');
        
        // Se periodo custom, prendi le date
        if (this.filters.period === 'custom') {
            this.filters.startDate = document.getElementById('startDate').value;
            this.filters.endDate = document.getElementById('endDate').value;
        }
        
        // Ricalcola metriche e renderizza
        this.calculateMetrics();
        this.renderDashboard();
        
        console.log('✅ Filters applied');
    }

    resetFilters() {
        console.log('🔄 Resetting filters...');
        
        // Reset tutti i filtri
        this.filters = {
            period: 'last_3_months',
            carrier: '',
            transportMode: '',
            route: '',
            status: '',
            startDate: null,
            endDate: null
        };
        
        // Reset UI
        document.getElementById('periodFilter').value = 'last_3_months';
        document.getElementById('carrierFilter').value = '';
        document.getElementById('transportModeFilter').value = '';
        document.getElementById('routeFilter').value = '';
        document.getElementById('statusFilter').value = '';
        document.getElementById('customDateRange').style.display = 'none';
        
        // Ricarica dashboard
        this.calculateMetrics();
        this.renderDashboard();
        
        console.log('✅ Filters reset');
    }

    loadMockData() {
        console.log('📊 Loading mock data for testing...');
        
        // Dati mock per testing
        this.data.combined = [
            {
                id: 1,
                shipment_number: 'SH001',
                carrier_name: 'DHL Express',
                transport_mode: 'air',
                origin_country: 'Italia',
                destination_country: 'Germania',
                freight_cost: 150,
                other_costs: 25,
                customs_duties: 0,
                insurance_cost: 10,
                total_cost: 185,
                total_weight_kg: 50,
                status: 'delivered',
                on_time: true,
                transit_time: 2,
                created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
                id: 2,
                shipment_number: 'SH002',
                carrier_name: 'TNT Express',
                transport_mode: 'road',
                origin_country: 'Italia',
                destination_country: 'Francia',
                freight_cost: 120,
                other_costs: 15,
                customs_duties: 0,
                insurance_cost: 8,
                total_cost: 143,
                total_weight_kg: 75,
                status: 'in_transit',
                on_time: null,
                transit_time: null,
                created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
                id: 3,
                shipment_number: 'SH003',
                carrier_name: 'UPS',
                transport_mode: 'sea',
                origin_country: 'Italia',
                destination_country: 'USA',
                freight_cost: 250,
                other_costs: 50,
                customs_duties: 75,
                insurance_cost: 20,
                total_cost: 395,
                total_weight_kg: 200,
                status: 'delivered',
                on_time: false,
                transit_time: 15,
                created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
            }
        ];
        
        this.calculateRoutes();
        this.populateFilters();
    }

    showError(message) {
        console.error(message);
        // TODO: Implementa notifica errore UI
    }
}

// Inizializza dashboard quando DOM è pronto
document.addEventListener('DOMContentLoaded', () => {
    window.transportDashboard = new TransportCostDashboard();
});