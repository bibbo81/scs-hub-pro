// carrier-performance.js - Route Intelligence & Carrier Performance Analytics - FIXED
// Path: /pages/shipments/carrier-performance.js

// Protection Against Script Duplication
if (window.CarrierPerformanceAnalytics) {
    console.log('⚠️ CarrierPerformanceAnalytics already loaded, skipping...');
} else {

class CarrierPerformanceAnalytics {
    constructor() {
        this.registry = null;
        this.carriers = new Map();
        this.routes = new Map();
        this.performanceMetrics = {};
        this.charts = {};
        
        this.init();
    }
    
    async init() {
        console.log('🚛 Initializing Carrier Performance Analytics...');
        
        // Wait for registry
        if (window.shipmentsRegistry) {
            this.registry = window.shipmentsRegistry;
            this.loadCarrierData();
        } else {
            window.addEventListener('shipmentsRegistryReady', () => {
                this.registry = window.shipmentsRegistry;
                this.loadCarrierData();
            });
        }
        
        // Listen for updates
        window.addEventListener('shipmentsUpdated', () => {
            this.refreshAnalytics();
        });
    }
    
    // DATA LOADING & PROCESSING
    loadCarrierData() {
        if (!this.registry || !this.registry.shipments || this.registry.shipments.length === 0) {
            console.log('No shipments available for carrier analysis');
            // Initialize empty metrics to prevent errors
            this.performanceMetrics = {
                carriers: [],
                routes: [],
                insights: [],
                recommendations: []
            };
            return;
        }
        
        const shipments = this.registry.shipments;
        console.log(`Processing ${shipments.length} shipments for carrier analysis`);
        
        // Reset collections
        this.carriers.clear();
        this.routes.clear();
        
        // Process each shipment
        shipments.forEach(shipment => {
            this.processShipmentForCarrier(shipment);
            this.processShipmentForRoute(shipment);
        });
        
        // Calculate performance metrics
        this.calculateAllMetrics();
    }
    
    processShipmentForCarrier(shipment) {
        const carrierCode = shipment.carrier?.code || 'UNKNOWN';
        
        if (!this.carriers.has(carrierCode)) {
            this.carriers.set(carrierCode, {
                code: carrierCode,
                name: shipment.carrier?.name || 'Unknown Carrier',
                shipments: [],
                routes: new Set(),
                performance: {
                    onTimeDelivery: 0,
                    avgDelay: 0,
                    reliability: 0,
                    costEfficiency: 0,
                    customerSatisfaction: 0
                }
            });
        }
        
        const carrier = this.carriers.get(carrierCode);
        carrier.shipments.push(shipment);
        
        // Track routes served by this carrier
        const route = this.getRouteKey(shipment);
        carrier.routes.add(route);
    }
    
    processShipmentForRoute(shipment) {
        const routeKey = this.getRouteKey(shipment);
        
        if (!this.routes.has(routeKey)) {
            this.routes.set(routeKey, {
                key: routeKey,
                origin: shipment.route?.origin || {},
                destination: shipment.route?.destination || {},
                shipments: [],
                carriers: new Set(),
                performance: {
                    avgTransitTime: 0,
                    avgCost: 0,
                    onTimeRate: 0,
                    utilizationRate: 0,
                    competitionLevel: 0
                }
            });
        }
        
        const route = this.routes.get(routeKey);
        route.shipments.push(shipment);
        
        if (shipment.carrier?.code) {
            route.carriers.add(shipment.carrier.code);
        }
    }
    
    getRouteKey(shipment) {
        const origin = shipment.route?.origin?.port || 'N/A';
        const dest = shipment.route?.destination?.port || 'N/A';
        return `${origin}-${dest}`;
    }
    
    // PERFORMANCE CALCULATIONS
    calculateAllMetrics() {
        // Calculate carrier metrics
        this.carriers.forEach((carrier, code) => {
            carrier.performance = this.calculateCarrierPerformance(carrier);
        });
        
        // Calculate route metrics
        this.routes.forEach((route, key) => {
            route.performance = this.calculateRoutePerformance(route);
        });
        
        // Calculate comparative metrics
        this.performanceMetrics = this.calculateComparativeMetrics();
    }
    
    calculateCarrierPerformance(carrier) {
        const shipments = carrier.shipments;
        const performance = {
            onTimeDelivery: 0,
            avgDelay: 0,
            reliability: 0,
            costEfficiency: 0,
            customerSatisfaction: 0,
            totalShipments: shipments.length,
            activeRoutes: carrier.routes.size
        };
        
        if (shipments.length === 0) return performance;
        
        // On-time delivery calculation
        let onTimeCount = 0;
        let totalDelay = 0;
        let delayedCount = 0;
        let shipmentsWithData = 0;
        
        shipments.forEach(shipment => {
            if (shipment.schedule?.eta && shipment.schedule?.ata) {
                shipmentsWithData++;
                const eta = new Date(shipment.schedule.eta);
                const ata = new Date(shipment.schedule.ata);
                const delayDays = Math.ceil((ata - eta) / (1000 * 60 * 60 * 24));
                
                if (delayDays <= 0) {
                    onTimeCount++;
                } else {
                    delayedCount++;
                    totalDelay += delayDays;
                }
            }
        });
        
        // Calculate metrics
        if (shipmentsWithData > 0) {
            performance.onTimeDelivery = (onTimeCount / shipmentsWithData) * 100;
            performance.avgDelay = delayedCount > 0 ? totalDelay / delayedCount : 0;
        }
        
        // Reliability score (composite metric)
        performance.reliability = this.calculateReliabilityScore(
            performance.onTimeDelivery,
            performance.avgDelay,
            shipments
        );
        
        // Cost efficiency
        performance.costEfficiency = this.calculateCostEfficiency(shipments);
        
        // Customer satisfaction (simulated based on performance)
        performance.customerSatisfaction = this.calculateCustomerSatisfaction(performance);
        
        // Additional metrics
        performance.avgCostPerShipment = this.calculateAvgCost(shipments);
        performance.volumeHandled = this.calculateTotalVolume(shipments);
        performance.routeCoverage = this.calculateRouteCoverage(carrier);
        
        return performance;
    }
    
    calculateRoutePerformance(route) {
        const shipments = route.shipments;
        const performance = {
            avgTransitTime: 0,
            avgCost: 0,
            onTimeRate: 0,
            utilizationRate: 0,
            competitionLevel: route.carriers.size,
            totalShipments: shipments.length
        };
        
        if (shipments.length === 0) return performance;
        
        // Average transit time
        const transitTimes = shipments
            .map(s => s.route?.estimatedTransit)
            .filter(t => t > 0);
        
        if (transitTimes.length > 0) {
            performance.avgTransitTime = transitTimes.reduce((a, b) => a + b, 0) / transitTimes.length;
        }
        
        // Average cost
        const costs = shipments
            .map(s => s.costs?.total)
            .filter(c => c > 0);
        
        if (costs.length > 0) {
            performance.avgCost = costs.reduce((a, b) => a + b, 0) / costs.length;
        }
        
        // On-time rate for route
        let onTimeCount = 0;
        let shipmentsWithData = 0;
        
        shipments.forEach(shipment => {
            if (shipment.schedule?.eta && shipment.schedule?.ata) {
                shipmentsWithData++;
                const eta = new Date(shipment.schedule.eta);
                const ata = new Date(shipment.schedule.ata);
                if (ata <= eta) onTimeCount++;
            }
        });
        
        if (shipmentsWithData > 0) {
            performance.onTimeRate = (onTimeCount / shipmentsWithData) * 100;
        }
        
        // Utilization rate (simulated based on shipment frequency)
        performance.utilizationRate = this.calculateUtilizationRate(shipments);
        
        // Best performing carrier on this route
        performance.bestCarrier = this.findBestCarrierForRoute(route);
        
        // Cost trend
        performance.costTrend = this.calculateCostTrend(shipments);
        
        return performance;
    }
    
    // COMPARATIVE ANALYSIS
    calculateComparativeMetrics() {
        const metrics = {
            carriers: [],
            routes: [],
            insights: [],
            recommendations: []
        };
        
        // Rank carriers
        metrics.carriers = Array.from(this.carriers.values())
            .map(carrier => ({
                code: carrier.code,
                name: carrier.name,
                score: this.calculateOverallScore(carrier.performance),
                performance: carrier.performance
            }))
            .sort((a, b) => b.score - a.score);
        
        // Rank routes
        metrics.routes = Array.from(this.routes.values())
            .map(route => ({
                key: route.key,
                origin: route.origin,
                destination: route.destination,
                efficiency: this.calculateRouteEfficiency(route.performance),
                performance: route.performance
            }))
            .sort((a, b) => b.efficiency - a.efficiency);
        
        // Generate insights
        metrics.insights = this.generateInsights();
        
        // Generate recommendations
        metrics.recommendations = this.generateRecommendations();
        
        return metrics;
    }
    
    // SCORING FUNCTIONS
    calculateReliabilityScore(onTimeRate, avgDelay, shipments) {
        let score = 50; // Base score
        
        // On-time delivery weight (40%)
        score += (onTimeRate / 100) * 40;
        
        // Delay penalty (20%)
        if (avgDelay < 1) score += 20;
        else if (avgDelay < 3) score += 10;
        else if (avgDelay < 5) score += 5;
        
        // Consistency bonus (10%)
        const consistency = this.calculateConsistency(shipments);
        score += consistency * 10;
        
        return Math.min(100, Math.round(score));
    }
    
    calculateCostEfficiency(shipments) {
        // Compare actual costs vs market average
        const avgCost = this.calculateAvgCost(shipments);
        const marketAvg = this.getMarketAverageCost(); // Simulated
        
        if (avgCost === 0 || marketAvg === 0) return 50;
        
        const efficiency = (marketAvg / avgCost) * 100;
        return Math.min(100, Math.max(0, Math.round(efficiency)));
    }
    
    calculateCustomerSatisfaction(performance) {
        // Weighted score based on multiple factors
        let satisfaction = 0;
        
        satisfaction += performance.onTimeDelivery * 0.4;
        satisfaction += (100 - Math.min(performance.avgDelay * 10, 100)) * 0.3;
        satisfaction += performance.reliability * 0.2;
        satisfaction += performance.costEfficiency * 0.1;
        
        return Math.round(satisfaction);
    }
    
    calculateOverallScore(performance) {
        // Comprehensive carrier score
        return (
            performance.reliability * 0.3 +
            performance.costEfficiency * 0.25 +
            performance.customerSatisfaction * 0.25 +
            performance.onTimeDelivery * 0.2
        );
    }
    
    calculateRouteEfficiency(performance) {
        // Route efficiency score
        let efficiency = 50;
        
        // Transit time factor
        if (performance.avgTransitTime < 20) efficiency += 20;
        else if (performance.avgTransitTime < 30) efficiency += 10;
        
        // Cost factor
        if (performance.avgCost < 3000) efficiency += 20;
        else if (performance.avgCost < 4000) efficiency += 10;
        
        // On-time rate
        efficiency += (performance.onTimeRate / 100) * 20;
        
        // Competition bonus
        if (performance.competitionLevel > 2) efficiency += 10;
        
        return Math.min(100, Math.round(efficiency));
    }
    
    // UTILITY FUNCTIONS
    calculateAvgCost(shipments) {
        const costs = shipments
            .map(s => s.costs?.total)
            .filter(c => c > 0);
        
        return costs.length > 0 
            ? costs.reduce((a, b) => a + b, 0) / costs.length 
            : 0;
    }
    
    calculateTotalVolume(shipments) {
        return shipments.reduce((total, shipment) => {
            if (shipment.products) {
                return total + shipment.products.reduce((vol, product) => {
                    return vol + ((product.volume || 0) * (product.quantity || 0));
                }, 0);
            }
            return total;
        }, 0);
    }
    
    calculateConsistency(shipments) {
        // Calculate standard deviation of delays
        const delays = shipments
            .filter(s => s.schedule?.eta && s.schedule?.ata)
            .map(s => {
                const eta = new Date(s.schedule.eta);
                const ata = new Date(s.schedule.ata);
                return Math.max(0, Math.ceil((ata - eta) / (1000 * 60 * 60 * 24)));
            });
        
        if (delays.length < 2) return 0.5;
        
        const avg = delays.reduce((a, b) => a + b, 0) / delays.length;
        const variance = delays.reduce((sum, delay) => {
            return sum + Math.pow(delay - avg, 2);
        }, 0) / delays.length;
        
        const stdDev = Math.sqrt(variance);
        
        // Lower std dev = higher consistency
        if (stdDev < 1) return 1;
        if (stdDev < 2) return 0.8;
        if (stdDev < 3) return 0.6;
        if (stdDev < 5) return 0.4;
        return 0.2;
    }
    
    calculateRouteCoverage(carrier) {
        // Percentage of total routes covered by carrier
        const totalRoutes = this.routes.size;
        const carrierRoutes = carrier.routes.size;
        
        return totalRoutes > 0 
            ? Math.round((carrierRoutes / totalRoutes) * 100) 
            : 0;
    }
    
    calculateUtilizationRate(shipments) {
        // Simulated based on shipment frequency
        const monthlyShipments = this.groupShipmentsByMonth(shipments);
        const avgMonthly = Object.values(monthlyShipments)
            .reduce((sum, count) => sum + count, 0) / Object.keys(monthlyShipments).length;
        
        // Assume capacity of 100 shipments/month as baseline
        return Math.min(100, Math.round((avgMonthly / 100) * 100));
    }
    
    calculateCostTrend(shipments) {
        // Sort by date
        const sorted = shipments
            .filter(s => s.costs?.total && s.createdAt)
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        
        if (sorted.length < 2) return 'stable';
        
        // Compare first half vs second half average
        const midpoint = Math.floor(sorted.length / 2);
        const firstHalf = sorted.slice(0, midpoint);
        const secondHalf = sorted.slice(midpoint);
        
        const avgFirst = this.calculateAvgCost(firstHalf);
        const avgSecond = this.calculateAvgCost(secondHalf);
        
        if (avgFirst === 0) return 'stable';
        
        const change = ((avgSecond - avgFirst) / avgFirst) * 100;
        
        if (change > 5) return 'increasing';
        if (change < -5) return 'decreasing';
        return 'stable';
    }
    
    findBestCarrierForRoute(route) {
        let bestCarrier = null;
        let bestScore = 0;
        
        route.carriers.forEach(carrierCode => {
            const carrier = this.carriers.get(carrierCode);
            if (carrier) {
                const routeShipments = carrier.shipments.filter(s => 
                    this.getRouteKey(s) === route.key
                );
                
                const score = this.calculateCarrierRouteScore(routeShipments);
                if (score > bestScore) {
                    bestScore = score;
                    bestCarrier = {
                        code: carrierCode,
                        name: carrier.name,
                        score: score
                    };
                }
            }
        });
        
        return bestCarrier;
    }
    
    calculateCarrierRouteScore(shipments) {
        if (shipments.length === 0) return 0;
        
        let score = 50;
        
        // On-time performance
        const onTime = shipments.filter(s => {
            if (s.schedule?.eta && s.schedule?.ata) {
                return new Date(s.schedule.ata) <= new Date(s.schedule.eta);
            }
            return false;
        }).length;
        
        score += (onTime / shipments.length) * 30;
        
        // Cost efficiency
        const avgCost = this.calculateAvgCost(shipments);
        const routeAvgCost = this.getRouteAverageCost(shipments[0]);
        
        if (avgCost < routeAvgCost) {
            score += 20;
        } else if (avgCost < routeAvgCost * 1.1) {
            score += 10;
        }
        
        return Math.round(score);
    }
    
    getRouteAverageCost(sampleShipment) {
        const routeKey = this.getRouteKey(sampleShipment);
        const route = this.routes.get(routeKey);
        return route ? route.performance.avgCost : 0;
    }
    
    groupShipmentsByMonth(shipments) {
        const months = {};
        
        shipments.forEach(shipment => {
            const date = new Date(shipment.createdAt);
            const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
            months[key] = (months[key] || 0) + 1;
        });
        
        return months;
    }
    
    getMarketAverageCost() {
        // Simulated market average
        // In production, this would come from external data
        return 3500;
    }
    
    // INSIGHTS GENERATION
    generateInsights() {
        const insights = [];
        
        // Check if we have data
        if (!this.performanceMetrics || !this.performanceMetrics.carriers || this.performanceMetrics.carriers.length === 0) {
            console.log('No carrier data available for insights');
            return insights;
        }
        
        // Top performing carrier
        const topCarrier = this.performanceMetrics.carriers[0];
        if (topCarrier) {
            insights.push({
                type: 'success',
                title: 'Top Performing Carrier',
                message: `${topCarrier.name} leads with ${topCarrier.performance.onTimeDelivery.toFixed(1)}% on-time delivery`,
                impact: 'high'
            });
        }
        
        // Underperforming routes
        const poorRoutes = this.performanceMetrics.routes.filter(r => r.efficiency < 60);
        if (poorRoutes.length > 0) {
            insights.push({
                type: 'warning',
                title: 'Routes Needing Attention',
                message: `${poorRoutes.length} routes operating below 60% efficiency`,
                impact: 'medium'
            });
        }
        
        // Cost trends
        const increasingCostRoutes = Array.from(this.routes.values())
            .filter(r => r.performance.costTrend === 'increasing');
        
        if (increasingCostRoutes.length > 0) {
            insights.push({
                type: 'warning',
                title: 'Rising Costs Detected',
                message: `Costs increasing on ${increasingCostRoutes.length} routes`,
                impact: 'high'
            });
        }
        
        // Carrier competition
        const monopolyRoutes = Array.from(this.routes.values())
            .filter(r => r.carriers.size === 1);
        
        if (monopolyRoutes.length > 0) {
            insights.push({
                type: 'info',
                title: 'Limited Competition',
                message: `${monopolyRoutes.length} routes served by single carrier`,
                impact: 'medium'
            });
        }
        
        return insights;
    }
    
    // RECOMMENDATIONS ENGINE
    generateRecommendations() {
        const recommendations = [];
        
        // Check if we have data
        if (!this.routes || this.routes.size === 0) {
            console.log('No route data available for recommendations');
            return recommendations;
        }
        
        // Carrier diversification
        this.routes.forEach(route => {
            if (route.carriers.size === 1 && route.shipments.length > 10) {
                recommendations.push({
                    type: 'carrier_diversification',
                    priority: 'high',
                    route: route.key,
                    title: `Diversify carriers on ${route.origin.name} → ${route.destination.name}`,
                    description: 'Single carrier dependency detected on high-volume route',
                    potentialSaving: this.estimateDiversificationSaving(route)
                });
            }
        });
        
        // Route optimization
        this.carriers.forEach(carrier => {
            if (carrier.performance.onTimeDelivery < 80) {
                recommendations.push({
                    type: 'performance_improvement',
                    priority: 'medium',
                    carrier: carrier.name,
                    title: `Review SLA with ${carrier.name}`,
                    description: `On-time delivery at ${carrier.performance.onTimeDelivery.toFixed(1)}% - below target`,
                    action: 'Schedule performance review meeting'
                });
            }
        });
        
        // Cost optimization
        if (this.performanceMetrics && this.performanceMetrics.routes) {
            const expensiveRoutes = this.performanceMetrics.routes
                .filter(r => r.performance.avgCost > this.getMarketAverageCost() * 1.2);
            
            expensiveRoutes.forEach(route => {
                recommendations.push({
                    type: 'cost_optimization',
                    priority: 'high',
                    route: route.key,
                    title: `Reduce costs on ${route.origin.name} → ${route.destination.name}`,
                    description: 'Route costs 20% above market average',
                    potentialSaving: Math.round((route.performance.avgCost - this.getMarketAverageCost()) * 0.15)
                });
            });
        }
        
        return recommendations.sort((a, b) => {
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });
    }
    
    estimateDiversificationSaving(route) {
        // Estimate 10-15% saving from competition
        return Math.round(route.performance.avgCost * 0.12);
    }
    
    // CHART GENERATION
    generateCarrierComparisonChart(canvasId) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        
        // Destroy existing chart
        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }
        
        const carriers = this.performanceMetrics.carriers.slice(0, 10);
        
        this.charts[canvasId] = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['On-Time Delivery', 'Cost Efficiency', 'Reliability', 'Customer Satisfaction', 'Coverage'],
                datasets: carriers.slice(0, 3).map((carrier, index) => ({
                    label: carrier.name,
                    data: [
                        carrier.performance.onTimeDelivery,
                        carrier.performance.costEfficiency,
                        carrier.performance.reliability,
                        carrier.performance.customerSatisfaction,
                        carrier.performance.routeCoverage
                    ],
                    borderColor: ['#007AFF', '#5856D6', '#FF9500'][index],
                    backgroundColor: ['rgba(0, 122, 255, 0.1)', 'rgba(88, 86, 214, 0.1)', 'rgba(255, 149, 0, 0.1)'][index]
                }))
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Carrier Performance Comparison'
                    }
                }
            }
        });
    }
    
    generateRouteEfficiencyChart(canvasId) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        
        // Destroy existing chart
        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }
        
        const routes = this.performanceMetrics.routes.slice(0, 15);
        
        this.charts[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: routes.map(r => `${r.origin.port}-${r.destination.port}`),
                datasets: [{
                    label: 'Route Efficiency Score',
                    data: routes.map(r => r.efficiency),
                    backgroundColor: routes.map(r => 
                        r.efficiency >= 80 ? '#4CD964' : 
                        r.efficiency >= 60 ? '#FF9500' : '#FF3B30'
                    )
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                scales: {
                    x: {
                        beginAtZero: true,
                        max: 100
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Route Efficiency Analysis'
                    },
                    tooltip: {
                        callbacks: {
                            afterLabel: (context) => {
                                const route = routes[context.dataIndex];
                                return [
                                    `Shipments: ${route.performance.totalShipments}`,
                                    `Avg Cost: €${route.performance.avgCost.toFixed(0)}`,
                                    `On-Time: ${route.performance.onTimeRate.toFixed(1)}%`
                                ];
                            }
                        }
                    }
                }
            }
        });
    }
    
    // UI RENDERING
    renderCarrierPerformanceCards() {
        const container = document.getElementById('carrierPerformanceCards');
        if (!container) return;
        
        // Check if metrics are ready
        if (!this.performanceMetrics.carriers || this.performanceMetrics.carriers.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--sol-gray-600);">Loading carrier performance data...</p>';
            return;
        }
        
        const topCarriers = this.performanceMetrics.carriers.slice(0, 6);
        
        container.innerHTML = topCarriers.map(carrier => `
            <div class="performance-card">
                <div class="card-header">
                    <h4>${carrier.name}</h4>
                    <span class="score-badge" style="background: ${this.getScoreColor(carrier.score)}">
                        ${carrier.score.toFixed(0)}
                    </span>
                </div>
                <div class="card-metrics">
                    <div class="metric">
                        <i class="fas fa-clock"></i>
                        <span class="metric-value">${carrier.performance.onTimeDelivery.toFixed(1)}%</span>
                        <span class="metric-label">On-Time</span>
                    </div>
                    <div class="metric">
                        <i class="fas fa-dollar-sign"></i>
                        <span class="metric-value">${carrier.performance.costEfficiency}%</span>
                        <span class="metric-label">Cost Eff.</span>
                    </div>
                    <div class="metric">
                        <i class="fas fa-shield-alt"></i>
                        <span class="metric-value">${carrier.performance.reliability}</span>
                        <span class="metric-label">Reliability</span>
                    </div>
                </div>
                <div class="card-footer">
                    <button class="sol-btn sol-btn-sm sol-btn-glass" 
                            onclick="window.carrierPerformance?.showCarrierDetails('${carrier.code}')">
                        <i class="fas fa-chart-line"></i> Dettagli
                    </button>
                    <button class="sol-btn sol-btn-sm sol-btn-glass"
                            onclick="window.carrierPerformance?.compareCarriers('${carrier.code}')">
                        <i class="fas fa-balance-scale"></i> Confronta
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    renderRouteOptimizationTable() {
        const tbody = document.getElementById('routeOptimizationTableBody');
        if (!tbody) return;
        
        // Check if metrics are ready
        if (!this.performanceMetrics.routes || this.performanceMetrics.routes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--sol-gray-600);">Loading route data...</td></tr>';
            return;
        }
        
        const routes = this.performanceMetrics.routes;
        
        tbody.innerHTML = routes.map(route => `
            <tr>
                <td>
                    <strong>${route.origin.name}</strong> → <strong>${route.destination.name}</strong><br>
                    <small class="text-muted">${route.key}</small>
                </td>
                <td>${route.performance.totalShipments}</td>
                <td>${route.performance.avgTransitTime.toFixed(1)} giorni</td>
                <td>€${route.performance.avgCost.toFixed(0)}</td>
                <td>
                    <span class="sol-badge ${route.performance.onTimeRate >= 90 ? 'sol-badge-success' : 'sol-badge-warning'}">
                        ${route.performance.onTimeRate.toFixed(1)}%
                    </span>
                </td>
                <td>
                    <div class="efficiency-bar">
                        <div class="efficiency-fill" style="width: ${route.efficiency}%; background: ${this.getScoreColor(route.efficiency)}"></div>
                        <span class="efficiency-text">${route.efficiency}%</span>
                    </div>
                </td>
                <td>${route.performance.competitionLevel} vettori</td>
                <td>
                    <button class="sol-btn sol-btn-sm sol-btn-glass" 
                            onclick="window.carrierPerformance?.optimizeRoute('${route.key}')">
                        <i class="fas fa-magic"></i> Ottimizza
                    </button>
                </td>
            </tr>
        `).join('');
    }
    
    renderInsightsPanel() {
        const container = document.getElementById('performanceInsights');
        if (!container) return;
        
        // Check if metrics are ready
        if (!this.performanceMetrics.insights || this.performanceMetrics.insights.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--sol-gray-600);">Analyzing performance...</p>';
            return;
        }
        
        const insights = this.performanceMetrics.insights;
        
        container.innerHTML = insights.map(insight => `
            <div class="insight-card ${insight.type}">
                <i class="fas ${this.getInsightIcon(insight.type)}"></i>
                <div class="insight-content">
                    <h5>${insight.title}</h5>
                    <p>${insight.message}</p>
                </div>
                <span class="impact-badge ${insight.impact}">${insight.impact}</span>
            </div>
        `).join('');
    }
    
    renderRecommendationsPanel() {
        const container = document.getElementById('performanceRecommendations');
        if (!container) return;
        
        // Check if metrics are ready
        if (!this.performanceMetrics.recommendations || this.performanceMetrics.recommendations.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--sol-gray-600);">Generating recommendations...</p>';
            return;
        }
        
        const recommendations = this.performanceMetrics.recommendations.slice(0, 5);
        
        container.innerHTML = recommendations.map((rec, index) => `
            <div class="recommendation-card">
                <div class="rec-header">
                    <span class="rec-number">#${index + 1}</span>
                    <span class="priority-badge ${rec.priority}">${rec.priority}</span>
                </div>
                <h5>${rec.title}</h5>
                <p>${rec.description}</p>
                ${rec.potentialSaving ? `
                    <div class="potential-saving">
                        <i class="fas fa-piggy-bank"></i>
                        Risparmio potenziale: €${rec.potentialSaving.toLocaleString('it-IT')}/mese
                    </div>
                ` : ''}
                ${rec.action ? `
                    <button class="sol-btn sol-btn-sm sol-btn-primary" 
                            onclick="window.carrierPerformance?.executeRecommendation('${rec.type}', '${rec.carrier || rec.route}')">
                        ${rec.action}
                    </button>
                ` : ''}
            </div>
        `).join('');
    }
    
    // HELPER FUNCTIONS
    getScoreColor(score) {
        if (score >= 80) return '#4CD964';
        if (score >= 60) return '#FF9500';
        return '#FF3B30';
    }
    
    getInsightIcon(type) {
        const icons = {
            success: 'fa-check-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle',
            danger: 'fa-times-circle'
        };
        return icons[type] || 'fa-info-circle';
    }
    
    formatMonth(monthKey) {
        const [year, month] = monthKey.split('-');
        const date = new Date(year, parseInt(month) - 1);
        return date.toLocaleDateString('it-IT', { month: 'short', year: '2-digit' });
    }
    
    // PUBLIC API
    refreshAnalytics() {
        // Only refresh if we have data
        if (!this.registry || !this.registry.shipments || this.registry.shipments.length === 0) {
            console.log('No shipments to analyze');
            // Show empty state
            this.showEmptyState();
            return;
        }
        
        this.loadCarrierData();
        
        // Delay UI updates to ensure metrics are calculated
        setTimeout(() => {
            this.renderCarrierPerformanceCards();
            this.renderRouteOptimizationTable();
            this.renderInsightsPanel();
            this.renderRecommendationsPanel();
        }, 100);
    }
    
    showEmptyState() {
        // Show empty state for cards
        const cardsContainer = document.getElementById('carrierPerformanceCards');
        if (cardsContainer) {
            cardsContainer.innerHTML = '<p style="text-align: center; color: var(--sol-gray-600); grid-column: 1/-1;">Nessun dato disponibile. Importa o crea spedizioni per vedere le analisi.</p>';
        }
        
        // Show empty state for table
        const tableBody = document.getElementById('routeOptimizationTableBody');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--sol-gray-600);">Nessuna rotta da analizzare</td></tr>';
        }
        
        // Empty insights
        const insightsContainer = document.getElementById('performanceInsights');
        if (insightsContainer) {
            insightsContainer.innerHTML = '<p style="text-align: center; color: var(--sol-gray-600);">Le insights appariranno quando ci saranno dati da analizzare.</p>';
        }
        
        // Empty recommendations
        const recsContainer = document.getElementById('performanceRecommendations');
        if (recsContainer) {
            recsContainer.innerHTML = '<p style="text-align: center; color: var(--sol-gray-600);">Le raccomandazioni appariranno quando ci saranno dati da analizzare.</p>';
        }
    }
    
    showCarrierDetails(carrierCode) {
        const carrier = this.carriers.get(carrierCode);
        if (!carrier) return;
        
        // Show detailed modal
        if (window.ModalSystem) {
            window.ModalSystem.show({
                title: `Performance Details: ${carrier.name}`,
                content: this.generateCarrierDetailsHTML(carrier),
                size: 'xl',
                buttons: [{
                    text: 'Export Report',
                    class: 'sol-btn-primary',
                    onclick: () => this.exportCarrierReport(carrierCode)
                }]
            });
        }
    }
    
    compareCarriers(...carrierCodes) {
        // Implementation for carrier comparison modal
        console.log('Compare carriers:', carrierCodes);
    }
    
    optimizeRoute(routeKey) {
        const route = this.routes.get(routeKey);
        if (!route) return;
        
        // Show route optimization modal
        if (window.ModalSystem) {
            window.ModalSystem.show({
                title: `Route Optimization: ${route.origin.name} → ${route.destination.name}`,
                content: this.generateRouteOptimizationHTML(route),
                size: 'lg'
            });
        }
    }
    
    executeRecommendation(type, target) {
        console.log('Execute recommendation:', type, target);
        // Implementation for recommendation execution
    }
    
    exportCarrierReport(carrierCode) {
        const carrier = this.carriers.get(carrierCode);
        if (!carrier) return;
        
        // Generate CSV report
        const report = this.generateCarrierReportData(carrier);
        const csv = this.convertToCSV(report);
        
        // Download
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `carrier_performance_${carrier.code}_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        
        window.NotificationSystem?.show('Export Completato', 'Report esportato con successo', 'success');
    }
    
    exportRouteAnalysis() {
        if (!this.performanceMetrics || !this.performanceMetrics.routes) {
            window.NotificationSystem?.show('Errore', 'Nessun dato da esportare', 'error');
            return;
        }
        
        const data = this.performanceMetrics.routes.map(route => ({
            'Route': route.key,
            'Origin': route.origin.name,
            'Destination': route.destination.name,
            'Total Shipments': route.performance.totalShipments,
            'Avg Transit Days': route.performance.avgTransitTime.toFixed(1),
            'Avg Cost': route.performance.avgCost.toFixed(0),
            'On-Time Rate': route.performance.onTimeRate.toFixed(1) + '%',
            'Efficiency Score': route.efficiency,
            'Carriers': route.performance.competitionLevel,
            'Cost Trend': route.performance.costTrend
        }));
        
        const csv = this.convertToCSV(data);
        
        // Download
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `route_analysis_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        
        window.NotificationSystem?.show('Export Completato', 'Analisi rotte esportata con successo', 'success');
    }
    
    // HTML GENERATORS
    generateCarrierDetailsHTML(carrier) {
        return `
            <div class="carrier-details">
                <div class="detail-section">
                    <h4>Performance Overview</h4>
                    <div class="metrics-grid">
                        <div class="metric-box">
                            <label>Total Shipments</label>
                            <value>${carrier.performance.totalShipments}</value>
                        </div>
                        <div class="metric-box">
                            <label>Active Routes</label>
                            <value>${carrier.performance.activeRoutes}</value>
                        </div>
                        <div class="metric-box">
                            <label>Volume Handled</label>
                            <value>${carrier.performance.volumeHandled.toFixed(2)} m³</value>
                        </div>
                        <div class="metric-box">
                            <label>Avg Cost/Shipment</label>
                            <value>€${carrier.performance.avgCostPerShipment.toFixed(0)}</value>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    generateRouteOptimizationHTML(route) {
        const recommendations = this.generateRouteRecommendations(route);
        
        return `
            <div class="route-optimization">
                <div class="route-summary">
                    <h4>Current Performance</h4>
                    <div class="metrics-grid">
                        <div class="metric-box">
                            <label>Efficiency Score</label>
                            <value>${route.efficiency}%</value>
                        </div>
                        <div class="metric-box">
                            <label>Avg Transit Time</label>
                            <value>${route.performance.avgTransitTime.toFixed(1)} giorni</value>
                        </div>
                        <div class="metric-box">
                            <label>Avg Cost</label>
                            <value>€${route.performance.avgCost.toFixed(0)}</value>
                        </div>
                        <div class="metric-box">
                            <label>Competition Level</label>
                            <value>${route.performance.competitionLevel} carriers</value>
                        </div>
                    </div>
                </div>
                
                <div class="optimization-recommendations">
                    <h4>Optimization Recommendations</h4>
                    ${recommendations.map(rec => `
                        <div class="optimization-item">
                            <i class="fas ${rec.icon}"></i>
                            <div>
                                <h5>${rec.title}</h5>
                                <p>${rec.description}</p>
                                ${rec.savings ? `<span class="savings">Potential savings: €${rec.savings}/month</span>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    generateRouteRecommendations(route) {
        const recommendations = [];
        
        // Check competition level
        if (route.carriers.size < 2) {
            recommendations.push({
                icon: 'fa-users',
                title: 'Increase Carrier Competition',
                description: 'Add alternative carriers to improve pricing power',
                savings: Math.round(route.performance.avgCost * 0.1)
            });
        }
        
        // Check efficiency
        if (route.efficiency < 70) {
            recommendations.push({
                icon: 'fa-tachometer-alt',
                title: 'Improve Route Efficiency',
                description: 'Review carrier SLAs and optimize scheduling',
                savings: Math.round(route.performance.avgCost * 0.05)
            });
        }
        
        // Check volume
        if (route.performance.utilizationRate < 60) {
            recommendations.push({
                icon: 'fa-box',
                title: 'Consolidate Shipments',
                description: 'Increase shipment consolidation to reduce unit costs',
                savings: Math.round(route.performance.avgCost * 0.08)
            });
        }
        
        return recommendations;
    }
    
    generateCarrierReportData(carrier) {
        return carrier.shipments.map(shipment => ({
            'Shipment Number': shipment.shipment_number,
            'Route': this.getRouteKey(shipment),
            'ETD': shipment.schedule?.etd || '',
            'ETA': shipment.schedule?.eta || '',
            'ATA': shipment.schedule?.ata || '',
            'On Time': shipment.schedule?.eta && shipment.schedule?.ata 
                ? (new Date(shipment.schedule.ata) <= new Date(shipment.schedule.eta) ? 'Yes' : 'No')
                : 'N/A',
            'Cost': shipment.costs?.total || 0,
            'Status': shipment.status
        }));
    }
    
    convertToCSV(data) {
        if (data.length === 0) return '';
        
        const headers = Object.keys(data[0]);
        const csvHeaders = headers.join(',');
        const csvRows = data.map(row => 
            headers.map(header => {
                const value = row[header];
                return typeof value === 'string' && value.includes(',') 
                    ? `"${value}"` 
                    : value;
            }).join(',')
        );
        
        return [csvHeaders, ...csvRows].join('\n');
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.carrierPerformance = new CarrierPerformanceAnalytics();
});

// Export for use in other modules
window.CarrierPerformanceAnalytics = CarrierPerformanceAnalytics;

console.log('[CarrierPerformance] Route Intelligence & Analytics module loaded - v2.0 FIXED');

}