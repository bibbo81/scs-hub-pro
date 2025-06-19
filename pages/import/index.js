// Enhanced Product Intelligence System - Complete Cost Intelligence Implementation
// Phase 2.5: Advanced Cost Analytics & Business Intelligence

class ProductIntelligenceSystem {
    constructor() {
        this.products = [];
        this.trackings = [];
        this.analytics = {};
        this.recommendations = [];
        this.charts = {};
        this.costAnalytics = null;
        
        // ✅ NEW: Enhanced Cost Intelligence Configuration
        this.costConfig = {
            currencies: {
                'USD': { symbol: '$', rate: 1.0 },
                'EUR': { symbol: '€', rate: 0.85 },
                'GBP': { symbol: '£', rate: 0.73 },
                'CNY': { symbol: '¥', rate: 6.45 }
            },
            costComponents: {
                'oceanFreight': { name: 'Ocean Freight', percentage: 60 },
                'portCharges': { name: 'Port Charges', percentage: 15 },
                'customs': { name: 'Customs & Duties', percentage: 10 },
                'insurance': { name: 'Insurance', percentage: 5 },
                'documentation': { name: 'Documentation', percentage: 5 },
                'handling': { name: 'Handling & Fees', percentage: 5 }
            },
            routes: this.initializeRouteDatabase(),
            seasonalFactors: this.initializeSeasonalFactors()
        };
        
        this.init = this.init.bind(this);
    }
    
    // ✅ NEW: Initialize Route Cost Database
    initializeRouteDatabase() {
        return {
            'Shanghai → Hamburg': {
                averageCost: 2850,
                transitDays: 24,
                fuelSurcharge: 15.2,
                seasonalVariance: 0.18,
                reliability: 0.92
            },
            'Ningbo → Genova': {
                averageCost: 2650,
                transitDays: 26,
                fuelSurcharge: 14.8,
                seasonalVariance: 0.16,
                reliability: 0.89
            },
            'Shenzhen → Los Angeles': {
                averageCost: 3200,
                transitDays: 18,
                fuelSurcharge: 16.5,
                seasonalVariance: 0.22,
                reliability: 0.94
            },
            'Hong Kong → New York': {
                averageCost: 3850,
                transitDays: 21,
                fuelSurcharge: 18.2,
                seasonalVariance: 0.25,
                reliability: 0.91
            },
            'Tianjin → Rotterdam': {
                averageCost: 3100,
                transitDays: 28,
                fuelSurcharge: 16.1,
                seasonalVariance: 0.20,
                reliability: 0.88
            }
        };
    }
    
    // ✅ NEW: Initialize Seasonal Cost Factors
    initializeSeasonalFactors() {
        return {
            'Q1': { factor: 0.95, description: 'Post-holiday low demand' },
            'Q2': { factor: 1.02, description: 'Spring demand increase' },
            'Q3': { factor: 1.15, description: 'Peak season preparation' },
            'Q4': { factor: 1.08, description: 'Holiday season rush' }
        };
    }
    
    async init() {
        console.log('[ProductIntelligence] Initializing Enhanced Cost Intelligence System...');
        
        await this.loadData();
        await this.generateAdvancedAnalytics();
        this.initializeUI();
        this.initializeCostIntelligence();
        
        console.log('[ProductIntelligence] Enhanced System initialized with Cost Intelligence');
    }
    
    // ✅ ENHANCED: Cost Intelligence Engine
    initializeCostIntelligence() {
        this.costAnalytics = {
            realTimePricing: this.initializeRealTimePricing(),
            costPrediction: this.initializeCostPrediction(),
            marginOptimization: this.initializeMarginOptimization(),
            alertSystem: this.initializeAlertSystem()
        };
        
        console.log('💰 Cost Intelligence Engine activated');
    }
    
    // ✅ NEW: Real-Time Pricing Engine
    initializeRealTimePricing() {
        return {
            updateFrequency: 15 * 60 * 1000, // 15 minutes
            priceFeeds: [
                { source: 'Freightos', weight: 0.3 },
                { source: 'ShipsGo', weight: 0.25 },
                { source: 'Searates', weight: 0.25 },
                { source: 'Internal', weight: 0.2 }
            ],
            
            // Calculate real-time cost for a product
            calculateRealTimeCost: (product, route, quantity = 1) => {
                const baseRoute = this.costConfig.routes[route];
                if (!baseRoute) return null;
                
                const currentSeason = this.getCurrentSeason();
                const seasonalFactor = this.costConfig.seasonalFactors[currentSeason].factor;
                
                // Volume discount calculation
                const volumeDiscount = this.calculateVolumeDiscount(quantity);
                
                // Market volatility (simulated)
                const volatility = this.getMarketVolatility();
                
                const realTimeCost = baseRoute.averageCost * 
                                   seasonalFactor * 
                                   (1 - volumeDiscount) * 
                                   (1 + volatility);
                
                return {
                    baseCost: baseRoute.averageCost,
                    seasonalAdjusted: baseRoute.averageCost * seasonalFactor,
                    volumeDiscounted: realTimeCost,
                    breakdown: this.calculateCostBreakdown(realTimeCost),
                    confidence: baseRoute.reliability,
                    lastUpdated: new Date().toISOString()
                };
            }
        };
    }
    
    // ✅ NEW: Cost Prediction Engine
    initializeCostPrediction() {
        return {
            // Predict costs for next 90 days
            predictCosts: (product, route) => {
                const predictions = [];
                const baseRoute = this.costConfig.routes[route];
                if (!baseRoute) return predictions;
                
                for (let days = 1; days <= 90; days++) {
                    const futureDate = new Date();
                    futureDate.setDate(futureDate.getDate() + days);
                    
                    // Trend analysis (simplified linear regression)
                    const trendFactor = this.calculateTrendFactor(days);
                    
                    // Seasonal impact
                    const seasonalFactor = this.getSeasonalFactor(futureDate);
                    
                    // Market events impact (simplified)
                    const eventImpact = this.getEventImpact(futureDate);
                    
                    const predictedCost = baseRoute.averageCost * 
                                        (1 + trendFactor) * 
                                        seasonalFactor * 
                                        (1 + eventImpact);
                    
                    predictions.push({
                        date: futureDate.toISOString().split('T')[0],
                        predictedCost: Math.round(predictedCost),
                        confidence: Math.max(0.5, 0.95 - (days / 90) * 0.4),
                        factors: {
                            trend: trendFactor,
                            seasonal: seasonalFactor,
                            events: eventImpact
                        }
                    });
                }
                
                return predictions;
            }
        };
    }
    
    // ✅ NEW: Margin Optimization Engine
    initializeMarginOptimization() {
        return {
            // Optimize pricing for target margin
            optimizePricing: (product, targetMargin = 0.30) => {
                const analytics = this.analytics[product.id];
                if (!analytics) return null;
                
                const currentCost = product.costTracking.baseCost + analytics.avgShippingCost;
                const currentMargin = (product.specifications.value - currentCost) / product.specifications.value;
                
                const optimizedPrice = currentCost / (1 - targetMargin);
                const priceIncrease = optimizedPrice - product.specifications.value;
                const marginIncrease = targetMargin - currentMargin;
                
                return {
                    currentPrice: product.specifications.value,
                    optimizedPrice: optimizedPrice,
                    priceIncrease: priceIncrease,
                    priceIncreasePercentage: (priceIncrease / product.specifications.value) * 100,
                    currentMargin: currentMargin,
                    targetMargin: targetMargin,
                    marginIncrease: marginIncrease,
                    annualImpact: priceIncrease * analytics.totalUnitsShipped,
                    recommendation: this.getMarginRecommendation(priceIncrease, marginIncrease)
                };
            },
            
            // Find optimal shipping routes for cost reduction
            optimizeShipping: (product) => {
                const analytics = this.analytics[product.id];
                if (!analytics || !analytics.routeComparison) return null;
                
                const routes = Object.entries(analytics.routeComparison)
                    .map(([route, data]) => ({
                        route: route,
                        avgCost: data.avgCost,
                        totalUnits: data.totalUnits,
                        savings: analytics.avgShippingCost - data.avgCost,
                        annualSavings: (analytics.avgShippingCost - data.avgCost) * analytics.totalUnitsShipped
                    }))
                    .filter(r => r.savings > 0)
                    .sort((a, b) => b.annualSavings - a.annualSavings);
                
                return {
                    currentRoute: analytics.worstRoute,
                    recommendedRoute: routes[0]?.route,
                    potentialSavings: routes[0]?.savings || 0,
                    annualSavings: routes[0]?.annualSavings || 0,
                    alternatives: routes.slice(1, 3)
                };
            }
        };
    }
    
    // ✅ NEW: Cost Alert System
    initializeAlertSystem() {
        return {
            thresholds: {
                costIncrease: 0.05, // 5% increase
                marginDrop: 0.02,   // 2% margin drop
                volumeSpike: 0.20   // 20% volume increase
            },
            
            checkAlerts: () => {
                const alerts = [];
                
                this.products.forEach(product => {
                    const analytics = this.analytics[product.id];
                    if (!analytics) return;
                    
                    // Cost increase alert
                    if (analytics.costTrendPercentage > this.costAnalytics.alertSystem.thresholds.costIncrease * 100) {
                        alerts.push({
                            type: 'cost_increase',
                            severity: 'high',
                            productId: product.id,
                            productName: product.name,
                            message: `Shipping costs increased by ${analytics.costTrendPercentage.toFixed(1)}%`,
                            impact: analytics.profitImpact,
                            action: 'Review routes and suppliers'
                        });
                    }
                    
                    // Margin alert
                    const currentMargin = (product.specifications.value - product.costTracking.baseCost - analytics.avgShippingCost) / product.specifications.value;
                    const targetMargin = product.costTracking.targetMargin;
                    
                    if (currentMargin < targetMargin - this.costAnalytics.alertSystem.thresholds.marginDrop) {
                        alerts.push({
                            type: 'margin_drop',
                            severity: 'medium',
                            productId: product.id,
                            productName: product.name,
                            message: `Margin dropped below target (${(currentMargin * 100).toFixed(1)}% vs ${(targetMargin * 100).toFixed(1)}%)`,
                            impact: (targetMargin - currentMargin) * product.specifications.value * analytics.totalUnitsShipped,
                            action: 'Optimize pricing or reduce costs'
                        });
                    }
                });
                
                return alerts.sort((a, b) => {
                    const severityOrder = { high: 3, medium: 2, low: 1 };
                    return severityOrder[b.severity] - severityOrder[a.severity];
                });
            }
        };
    }
    
    // ✅ ENHANCED: Analytics Generation with Cost Intelligence
    async generateAdvancedAnalytics() {
        console.log('[ProductIntelligence] Generating advanced analytics with cost intelligence...');
        
        this.products.forEach(product => {
            this.analytics[product.id] = this.calculateAdvancedProductAnalytics(product);
        });
        
        // Generate cost alerts
        this.costAlerts = this.costAnalytics?.alertSystem.checkAlerts() || [];
        
        // Generate enhanced recommendations
        this.recommendations = this.generateEnhancedRecommendations();
        
        console.log('💰 Advanced cost analytics generated');
    }
    
    // ✅ ENHANCED: Advanced Product Analytics
    calculateAdvancedProductAnalytics(product) {
        const productTrackings = this.trackings.filter(tracking =>
            tracking.products && tracking.products.some(p => p.productId === product.id)
        );
        
        if (productTrackings.length === 0) {
            return this.getEmptyAnalytics();
        }
        
        // ✅ NEW: Enhanced cost calculation with components
        let totalUnits = 0;
        let totalCost = 0;
        let routeCosts = {};
        let costHistory = [];
        let costComponents = {};
        
        productTrackings.forEach(tracking => {
            const productEntry = tracking.products.find(p => p.productId === product.id);
            if (productEntry) {
                totalUnits += productEntry.quantity;
                totalCost += productEntry.totalCost;
                
                // ✅ NEW: Track cost components
                if (productEntry.costBreakdown) {
                    Object.entries(productEntry.costBreakdown).forEach(([component, cost]) => {
                        if (!costComponents[component]) costComponents[component] = 0;
                        costComponents[component] += cost * productEntry.quantity;
                    });
                }
                
                // Route analysis with enhanced metrics
                const route = `${tracking.metadata?.pol || tracking.origin} → ${tracking.metadata?.pod || tracking.destination}`;
                if (!routeCosts[route]) {
                    routeCosts[route] = { 
                        totalCost: 0, 
                        totalUnits: 0, 
                        shipments: 0,
                        reliability: 0,
                        transitTime: 0
                    };
                }
                routeCosts[route].totalCost += productEntry.totalCost;
                routeCosts[route].totalUnits += productEntry.quantity;
                routeCosts[route].shipments += 1;
                
                // Cost history for trend analysis
                costHistory.push({
                    date: tracking.created_at,
                    unitCost: productEntry.unitCost,
                    quantity: productEntry.quantity,
                    route: route,
                    season: this.getSeasonFromDate(tracking.created_at)
                });
            }
        });
        
        // Calculate route averages and metrics
        Object.keys(routeCosts).forEach(route => {
            routeCosts[route].avgCost = routeCosts[route].totalCost / routeCosts[route].totalUnits;
            routeCosts[route].avgTransitTime = this.costConfig.routes[route]?.transitDays || 21;
            routeCosts[route].reliability = this.costConfig.routes[route]?.reliability || 0.85;
        });
        
        // ✅ NEW: Advanced cost trend analysis
        const costTrendAnalysis = this.analyzeAdvancedCostTrends(costHistory);
        
        // ✅ NEW: Route performance analysis
        const routePerformance = this.analyzeRoutePerformance(routeCosts);
        
        // ✅ NEW: Profit impact with cost intelligence
        const profitImpactAnalysis = this.calculateProfitImpactAnalysis(product, {
            totalUnits,
            avgCost: totalCost / totalUnits,
            costHistory,
            routeCosts
        });
        
        return {
            // Basic metrics
            totalShipments: productTrackings.length,
            totalUnitsShipped: totalUnits,
            avgShippingCost: totalCost / totalUnits,
            
            // ✅ Enhanced cost analytics
            costTrend: costTrendAnalysis.trend,
            costTrendPercentage: costTrendAnalysis.percentage,
            costVolatility: costTrendAnalysis.volatility,
            costSeasonality: costTrendAnalysis.seasonality,
            
            // ✅ Enhanced route analytics
            bestRoute: routePerformance.best,
            worstRoute: routePerformance.worst,
            routeComparison: routeCosts,
            routeRecommendations: routePerformance.recommendations,
            
            // ✅ Enhanced profit analytics
            profitImpact: profitImpactAnalysis.totalImpact,
            marginEfficiency: profitImpactAnalysis.marginEfficiency,
            costOptimizationPotential: profitImpactAnalysis.optimizationPotential,
            
            // ✅ Cost component breakdown
            costComponents: costComponents,
            costComponentPercentages: this.calculateComponentPercentages(costComponents, totalCost),
            
            // ✅ Performance metrics
            performance: {
                costEfficiency: this