// shipments-analytics.js - Advanced Analytics Engine for Shipments
// Path: /pages/shipments/shipments-analytics.js

class ShipmentsAnalyticsEngine {
    constructor() {
        this.registry = null;
        this.charts = {};
        this.metrics = {
            volume: {},
            costs: {},
            performance: {},
            trends: {}
        };
        
        this.init();
    }
    
    async init() {
        console.log('📊 Initializing Shipments Analytics Engine...');
        
        // Wait for registry
        if (window.shipmentsRegistry) {
            this.registry = window.shipmentsRegistry;
        } else {
            window.addEventListener('shipmentsRegistryReady', () => {
                this.registry = window.shipmentsRegistry;
            });
        }
        
        // Initialize Chart.js defaults
        this.setupChartDefaults();
    }
    
    setupChartDefaults() {
        Chart.defaults.font.family = "'Inter', sans-serif";
        Chart.defaults.color = '#4B5563';
        Chart.defaults.plugins.legend.position = 'bottom';
        Chart.defaults.plugins.legend.labels.padding = 15;
    }
    
    // VOLUME ANALYTICS
    analyzeVolume(shipments, groupBy = 'month') {
        const volumeData = {};
        
        shipments.forEach(shipment => {
            const key = this.getGroupKey(shipment.createdAt, groupBy);
            if (!volumeData[key]) {
                volumeData[key] = {
                    count: 0,
                    weight: 0,
                    volume: 0,
                    containers: 0
                };
            }
            
            volumeData[key].count++;
            
            if (shipment.type === 'container') {
                volumeData[key].containers++;
            }
            
            // Sum product weights and volumes
            if (shipment.products) {
                shipment.products.forEach(product => {
                    volumeData[key].weight += (product.weight * product.quantity) || 0;
                    volumeData[key].volume += (product.volume * product.quantity) || 0;
                });
            }
        });
        
        return volumeData;
    }
    
    // COST ANALYTICS
    analyzeCosts(shipments, breakdown = true) {
        const costAnalysis = {
            total: 0,
            byCarrier: {},
            byRoute: {},
            byType: {},
            avgPerShipment: 0,
            avgPerKg: 0,
            breakdown: {}
        };
        
        let totalWeight = 0;
        
        shipments.forEach(shipment => {
            const cost = shipment.costs?.total || 0;
            costAnalysis.total += cost;
            
            // By carrier
            const carrier = shipment.carrier?.name || 'Unknown';
            costAnalysis.byCarrier[carrier] = (costAnalysis.byCarrier[carrier] || 0) + cost;
            
            // By route
            const route = `${shipment.route?.origin?.port || 'N/A'} → ${shipment.route?.destination?.port || 'N/A'}`;
            if (!costAnalysis.byRoute[route]) {
                costAnalysis.byRoute[route] = { total: 0, count: 0 };
            }
            costAnalysis.byRoute[route].total += cost;
            costAnalysis.byRoute[route].count++;
            
            // By type
            costAnalysis.byType[shipment.type] = (costAnalysis.byType[shipment.type] || 0) + cost;
            
            // Calculate total weight
            if (shipment.products) {
                shipment.products.forEach(product => {
                    totalWeight += (product.weight * product.quantity) || 0;
                });
            }
            
            // Cost breakdown
            if (breakdown && shipment.costs) {
                Object.keys(shipment.costs).forEach(costType => {
                    if (costType !== 'total' && costType !== 'currency') {
                        costAnalysis.breakdown[costType] = 
                            (costAnalysis.breakdown[costType] || 0) + (shipment.costs[costType] || 0);
                    }
                });
            }
        });
        
        // Calculate averages
        costAnalysis.avgPerShipment = shipments.length > 0 ? costAnalysis.total / shipments.length : 0;
        costAnalysis.avgPerKg = totalWeight > 0 ? costAnalysis.total / totalWeight : 0;
        
        // Calculate route averages
        Object.keys(costAnalysis.byRoute).forEach(route => {
            const routeData = costAnalysis.byRoute[route];
            routeData.average = routeData.total / routeData.count;
        });
        
        return costAnalysis;
    }
    
    // PERFORMANCE ANALYTICS
    analyzePerformance(shipments) {
        const performance = {
            onTimeDelivery: 0,
            avgDelayDays: 0,
            byCarrier: {},
            byRoute: {},
            reliabilityScore: 0
        };
        
        let onTimeCount = 0;
        let totalDelay = 0;
        let delayedShipments = 0;
        
        shipments.forEach(shipment => {
            if (shipment.schedule?.eta && shipment.schedule?.ata) {
                const eta = new Date(shipment.schedule.eta);
                const ata = new Date(shipment.schedule.ata);
                const delayDays = Math.ceil((ata - eta) / (1000 * 60 * 60 * 24));
                
                if (delayDays <= 0) {
                    onTimeCount++;
                } else {
                    totalDelay += delayDays;
                    delayedShipments++;
                }
                
                // By carrier performance
                const carrier = shipment.carrier?.name || 'Unknown';
                if (!performance.byCarrier[carrier]) {
                    performance.byCarrier[carrier] = {
                        total: 0,
                        onTime: 0,
                        avgDelay: 0,
                        totalDelay: 0
                    };
                }
                
                performance.byCarrier[carrier].total++;
                if (delayDays <= 0) {
                    performance.byCarrier[carrier].onTime++;
                } else {
                    performance.byCarrier[carrier].totalDelay += delayDays;
                }
            }
        });
        
        // Calculate metrics
        const shipmentsWithData = shipments.filter(s => s.schedule?.eta && s.schedule?.ata).length;
        
        if (shipmentsWithData > 0) {
            performance.onTimeDelivery = (onTimeCount / shipmentsWithData) * 100;
            performance.avgDelayDays = delayedShipments > 0 ? totalDelay / delayedShipments : 0;
            performance.reliabilityScore = Math.max(0, 100 - (performance.avgDelayDays * 5));
        }
        
        // Calculate carrier metrics
        Object.keys(performance.byCarrier).forEach(carrier => {
            const carrierData = performance.byCarrier[carrier];
            carrierData.onTimeRate = (carrierData.onTime / carrierData.total) * 100;
            carrierData.avgDelay = carrierData.total - carrierData.onTime > 0 
                ? carrierData.totalDelay / (carrierData.total - carrierData.onTime) 
                : 0;
        });
        
        return performance;
    }
    
    // TREND ANALYSIS
    analyzeTrends(shipments, periods = 6) {
        const trends = {
            volume: [],
            costs: [],
            performance: [],
            forecast: {}
        };
        
        // Group shipments by month
        const monthlyData = {};
        const now = new Date();
        
        for (let i = periods - 1; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthlyData[key] = [];
        }
        
        shipments.forEach(shipment => {
            const date = new Date(shipment.createdAt);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (monthlyData[key]) {
                monthlyData[key].push(shipment);
            }
        });
        
        // Calculate trends
        Object.keys(monthlyData).sort().forEach(month => {
            const monthShipments = monthlyData[month];
            
            trends.volume.push({
                month,
                count: monthShipments.length,
                label: this.formatMonthLabel(month)
            });
            
            const costAnalysis = this.analyzeCosts(monthShipments, false);
            trends.costs.push({
                month,
                total: costAnalysis.total,
                average: costAnalysis.avgPerShipment,
                label: this.formatMonthLabel(month)
            });
            
            const perfAnalysis = this.analyzePerformance(monthShipments);
            trends.performance.push({
                month,
                onTimeRate: perfAnalysis.onTimeDelivery,
                avgDelay: perfAnalysis.avgDelayDays,
                label: this.formatMonthLabel(month)
            });
        });
        
        // Simple linear forecast
        if (trends.volume.length >= 3) {
            trends.forecast = this.calculateLinearForecast(trends);
        }
        
        return trends;
    }
    
    // COMPARATIVE ANALYSIS
    compareRoutes(shipments) {
        const routeComparison = {};
        
        shipments.forEach(shipment => {
            const route = `${shipment.route?.origin?.port || 'N/A'} → ${shipment.route?.destination?.port || 'N/A'}`;
            
            if (!routeComparison[route]) {
                routeComparison[route] = {
                    count: 0,
                    totalCost: 0,
                    totalTransitTime: 0,
                    carriers: new Set(),
                    onTime: 0,
                    delayed: 0
                };
            }
            
            const routeData = routeComparison[route];
            routeData.count++;
            routeData.totalCost += shipment.costs?.total || 0;
            routeData.totalTransitTime += shipment.route?.estimatedTransit || 0;
            
            if (shipment.carrier?.name) {
                routeData.carriers.add(shipment.carrier.name);
            }
            
            // Check on-time performance
            if (shipment.schedule?.eta && shipment.schedule?.ata) {
                const eta = new Date(shipment.schedule.eta);
                const ata = new Date(shipment.schedule.ata);
                if (ata <= eta) {
                    routeData.onTime++;
                } else {
                    routeData.delayed++;
                }
            }
        });
        
        // Calculate averages and scores
        Object.keys(routeComparison).forEach(route => {
            const data = routeComparison[route];
            data.avgCost = data.totalCost / data.count;
            data.avgTransitTime = data.totalTransitTime / data.count;
            data.carriersCount = data.carriers.size;
            data.onTimeRate = data.count > 0 
                ? ((data.onTime / (data.onTime + data.delayed)) * 100) || 0 
                : 0;
            
            // Calculate efficiency score (0-100)
            data.efficiencyScore = this.calculateRouteEfficiency(data);
        });
        
        return routeComparison;
    }
    
    // CHART GENERATION
    generateVolumeChart(canvasId, shipments) {
        const volumeData = this.analyzeVolume(shipments);
        const labels = Object.keys(volumeData).sort();
        
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        
        // Destroy existing chart
        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }
        
        this.charts[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels.map(l => this.formatMonthLabel(l)),
                datasets: [{
                    label: 'Numero Spedizioni',
                    data: labels.map(l => volumeData[l].count),
                    backgroundColor: 'rgba(0, 122, 255, 0.8)',
                    borderColor: 'rgba(0, 122, 255, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Volume Spedizioni per Mese'
                    }
                }
            }
        });
    }
    
    generateCostBreakdownChart(canvasId, shipments) {
        const costAnalysis = this.analyzeCosts(shipments);
        
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        
        // Destroy existing chart
        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }
        
        const labels = Object.keys(costAnalysis.breakdown);
        const data = labels.map(l => costAnalysis.breakdown[l]);
        
        this.charts[canvasId] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels.map(l => this.formatCostLabel(l)),
                datasets: [{
                    data: data,
                    backgroundColor: [
                        '#007AFF',
                        '#5856D6',
                        '#FF9500',
                        '#FF3B30',
                        '#4CD964',
                        '#009688'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Breakdown Costi Totali'
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const value = context.raw;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${context.label}: €${value.toLocaleString('it-IT')} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    generatePerformanceChart(canvasId, shipments) {
        const trends = this.analyzeTrends(shipments);
        
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        
        // Destroy existing chart
        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }
        
        this.charts[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: trends.performance.map(t => t.label),
                datasets: [
                    {
                        label: 'On-Time Rate (%)',
                        data: trends.performance.map(t => t.onTimeRate),
                        borderColor: '#4CD964',
                        backgroundColor: 'rgba(76, 217, 100, 0.1)',
                        tension: 0.3
                    },
                    {
                        label: 'Ritardo Medio (giorni)',
                        data: trends.performance.map(t => t.avgDelay),
                        borderColor: '#FF9500',
                        backgroundColor: 'rgba(255, 149, 0, 0.1)',
                        tension: 0.3,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        min: 0,
                        max: 100,
                        title: {
                            display: true,
                            text: 'On-Time Rate (%)'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        min: 0,
                        title: {
                            display: true,
                            text: 'Ritardo Medio (giorni)'
                        },
                        grid: {
                            drawOnChartArea: false
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Performance Trend'
                    }
                }
            }
        });
    }
    
    // EXPORT FUNCTIONS
    exportAnalyticsReport(format = 'pdf') {
        const report = {
            generated: new Date().toISOString(),
            period: this.getReportPeriod(),
            metrics: this.metrics,
            summary: this.generateExecutiveSummary()
        };
        
        if (format === 'pdf') {
            this.generatePDFReport(report);
        } else if (format === 'excel') {
            this.generateExcelReport(report);
        }
    }
    
    // UTILITY FUNCTIONS
    getGroupKey(date, groupBy) {
        const d = new Date(date);
        switch (groupBy) {
            case 'day':
                return d.toISOString().split('T')[0];
            case 'week':
                const week = this.getWeekNumber(d);
                return `${d.getFullYear()}-W${week}`;
            case 'month':
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            case 'quarter':
                const quarter = Math.floor(d.getMonth() / 3) + 1;
                return `${d.getFullYear()}-Q${quarter}`;
            case 'year':
                return d.getFullYear().toString();
            default:
                return d.toISOString().split('T')[0];
        }
    }
    
    getWeekNumber(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    }
    
    formatMonthLabel(monthKey) {
        const [year, month] = monthKey.split('-');
        const date = new Date(year, parseInt(month) - 1);
        return date.toLocaleDateString('it-IT', { month: 'short', year: 'numeric' });
    }
    
    formatCostLabel(costType) {
        const labels = {
            oceanFreight: 'Trasporto Marittimo',
            bunkerSurcharge: 'BAF',
            portCharges: 'Costi Portuali',
            customs: 'Dogana',
            insurance: 'Assicurazione',
            documentation: 'Documentazione',
            handling: 'Movimentazione',
            trucking: 'Trasporto Terrestre'
        };
        return labels[costType] || costType;
    }
    
    calculateRouteEfficiency(routeData) {
        // Multi-factor efficiency score
        let score = 100;
        
        // Cost factor (lower is better)
        if (routeData.avgCost > 5000) score -= 20;
        else if (routeData.avgCost > 3000) score -= 10;
        
        // Transit time factor (lower is better)
        if (routeData.avgTransitTime > 30) score -= 15;
        else if (routeData.avgTransitTime > 20) score -= 7;
        
        // On-time rate factor
        score = score * (routeData.onTimeRate / 100);
        
        // Carrier diversity bonus
        if (routeData.carriersCount > 2) score += 5;
        
        return Math.max(0, Math.min(100, Math.round(score)));
    }
    
    calculateLinearForecast(trends) {
        // Simple linear regression for next 3 months
        const n = trends.volume.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        
        trends.volume.forEach((point, index) => {
            sumX += index;
            sumY += point.count;
            sumXY += index * point.count;
            sumX2 += index * index;
        });
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        
        const forecast = [];
        for (let i = 0; i < 3; i++) {
            const x = n + i;
            const y = Math.round(slope * x + intercept);
            forecast.push({
                month: `Forecast ${i + 1}`,
                count: Math.max(0, y)
            });
        }
        
        return forecast;
    }
    
    generateExecutiveSummary() {
        const shipments = this.registry?.shipments || [];
        const costAnalysis = this.analyzeCosts(shipments);
        const performance = this.analyzePerformance(shipments);
        const trends = this.analyzeTrends(shipments);
        
        return {
            totalShipments: shipments.length,
            totalCost: costAnalysis.total,
            avgCostPerShipment: costAnalysis.avgPerShipment,
            onTimeDeliveryRate: performance.onTimeDelivery,
            topRoute: this.findTopRoute(costAnalysis.byRoute),
            topCarrier: this.findTopCarrier(performance.byCarrier),
            costTrend: this.calculateTrend(trends.costs),
            volumeTrend: this.calculateTrend(trends.volume)
        };
    }
    
    findTopRoute(routeData) {
        let topRoute = null;
        let minAvgCost = Infinity;
        
        Object.keys(routeData).forEach(route => {
            if (routeData[route].average < minAvgCost) {
                minAvgCost = routeData[route].average;
                topRoute = route;
            }
        });
        
        return topRoute;
    }
    
    findTopCarrier(carrierData) {
        let topCarrier = null;
        let maxScore = 0;
        
        Object.keys(carrierData).forEach(carrier => {
            const score = carrierData[carrier].onTimeRate;
            if (score > maxScore) {
                maxScore = score;
                topCarrier = carrier;
            }
        });
        
        return topCarrier;
    }
    
    calculateTrend(data) {
        if (data.length < 2) return 'stable';
        
        const recent = data[data.length - 1];
        const previous = data[data.length - 2];
        
        const change = ((recent.total || recent.count) - (previous.total || previous.count)) / 
                      (previous.total || previous.count || 1) * 100;
        
        if (change > 5) return 'increasing';
        if (change < -5) return 'decreasing';
        return 'stable';
    }
    
    // Placeholder for PDF generation
    generatePDFReport(report) {
        console.log('PDF Report generation not yet implemented', report);
        window.NotificationSystem?.show('Info', 'PDF export coming soon', 'info');
    }
    
    // Placeholder for Excel generation
    generateExcelReport(report) {
        console.log('Excel Report generation not yet implemented', report);
        window.NotificationSystem?.show('Info', 'Excel export coming soon', 'info');
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.shipmentsAnalytics = new ShipmentsAnalyticsEngine();
});

// Export for use in other modules
window.ShipmentsAnalyticsEngine = ShipmentsAnalyticsEngine;

console.log('[ShipmentsAnalytics] Advanced analytics engine loaded');