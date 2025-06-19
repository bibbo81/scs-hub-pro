// phase2-architecture.js
// Architecture foundation for Product + Cost Intelligence System

/**
 * 🏭 PHASE 2: PRODUCT + COST INTELLIGENCE SYSTEM
 * Architecture foundation and data models
 */

// ===== 1. PRODUCT DATA MODEL =====

class ProductModel {
    constructor() {
        this.schema = {
            id: "string",
            sku: "string", 
            name: "string",
            category: "string",
            description: "string",
            
            specifications: {
                weight: "number", // kg per unità
                dimensions: {
                    length: "number", // cm
                    width: "number", // cm
                    height: "number" // cm
                },
                volume: "number", // m³ calcolato automaticamente
                value: "number", // USD per unità
                hsCode: "string",
                fragile: "boolean",
                hazardous: "boolean"
            },
            
            costTracking: {
                baseCost: "number", // USD manufacturing/purchase
                targetMargin: "number", // % margin target
                shippingBudget: "number", // USD budget per unità shipping
                currencyCode: "string",
                lastCostUpdate: "datetime"
            },
            
            analytics: {
                totalShipped: "number",
                avgShippingCost: "number",
                bestRoute: "string",
                worstRoute: "string",
                profitImpact: "number",
                recommendations: "array"
            },
            
            createdAt: "datetime",
            updatedAt: "datetime",
            isActive: "boolean",
            tags: "array"
        };
    }
    
    // Calcola volume automaticamente
    calculateVolume(length, width, height) {
        return (length * width * height) / 1000000; // cm³ to m³
    }
    
    // Calcola peso volumetrico
    calculateVolumetricWeight(volume) {
        return volume * 167; // Standard international air cargo
    }
    
    // Calcola costo target per unità
    calculateTargetCost(baseCost, targetMargin) {
        return baseCost / (1 - targetMargin);
    }
}

// ===== 2. CONTAINER-PRODUCT RELATIONSHIP SYSTEM =====

class ContainerProductMapping {
    constructor() {
        this.schema = {
            id: "string",
            containerId: "string",
            productId: "string",
            quantity: "number",
            
            unitCost: "number",
            totalCost: "number",
            costBreakdown: {
                oceanFreight: "number",
                portCharges: "number", 
                customs: "number",
                insurance: "number",
                documentation: "number",
                handling: "number",
                trucking: "number"
            },
            
            costTrend: "string",
            profitImpact: "number",
            
            createdAt: "datetime",
            updatedAt: "datetime"
        };
    }
}

// ===== 3. COST ALLOCATION ENGINE =====

class CostAllocationEngine {
    constructor() {
        this.allocationMethods = {
            byWeight: "weight",
            byValue: "value", 
            byVolume: "volume",
            byQuantity: "quantity",
            hybrid: "hybrid"
        };
    }
    
    allocateCosts(container, products, method = 'hybrid') {
        const totalShippingCost = container.totalCost || 0;
        const costBreakdown = container.costBreakdown || {};
        
        const totals = this.calculateTotals(products);
        
        return products.map(product => {
            let allocationRatio;
            
            switch (method) {
                case 'weight':
                    allocationRatio = (product.specifications.weight * product.quantity) / totals.totalWeight;
                    break;
                case 'value':
                    allocationRatio = (product.specifications.value * product.quantity) / totals.totalValue;
                    break;
                case 'volume':
                    allocationRatio = (product.specifications.volume * product.quantity) / totals.totalVolume;
                    break;
                case 'quantity':
                    allocationRatio = product.quantity / totals.totalQuantity;
                    break;
                case 'hybrid':
                default:
                    const valueRatio = (product.specifications.value * product.quantity) / totals.totalValue;
                    const weightRatio = (product.specifications.weight * product.quantity) / totals.totalWeight;
                    const volumeRatio = (product.specifications.volume * product.quantity) / totals.totalVolume;
                    allocationRatio = (valueRatio * 0.4) + (weightRatio * 0.3) + (volumeRatio * 0.3);
                    break;
            }
            
            const allocatedCost = totalShippingCost * allocationRatio;
            const unitCost = allocatedCost / product.quantity;
            
            const allocatedBreakdown = {};
            Object.keys(costBreakdown).forEach(costType => {
                allocatedBreakdown[costType] = costBreakdown[costType] * allocationRatio;
            });
            
            return {
                productId: product.id,
                sku: product.sku,
                quantity: product.quantity,
                unitCost: unitCost,
                totalCost: allocatedCost,
                costBreakdown: allocatedBreakdown,
                allocationMethod: method,
                allocationRatio: allocationRatio
            };
        });
    }
    
    calculateTotals(products) {
        return products.reduce((totals, product) => {
            return {
                totalWeight: totals.totalWeight + (product.specifications.weight * product.quantity),
                totalValue: totals.totalValue + (product.specifications.value * product.quantity),
                totalVolume: totals.totalVolume + (product.specifications.volume * product.quantity),
                totalQuantity: totals.totalQuantity + product.quantity
            };
        }, { totalWeight: 0, totalValue: 0, totalVolume: 0, totalQuantity: 0 });
    }
}

// ===== 4. BUSINESS INTELLIGENCE ANALYTICS =====

class ProductAnalyticsEngine {
    constructor() {
        this.metrics = {};
    }
    
    generateProductAnalytics(productId, shipments) {
        const productShipments = shipments.filter(s => 
            s.products && s.products.some(p => p.productId === productId)
        );
        
        if (productShipments.length === 0) {
            return this.getEmptyAnalytics();
        }
        
        const analytics = {
            totalShipments: productShipments.length,
            totalUnitsShipped: this.calculateTotalUnits(productShipments, productId),
            avgShippingCost: this.calculateAvgShippingCost(productShipments, productId),
            
            costTrend: this.calculateCostTrend(productShipments, productId),
            costTrendPercentage: this.calculateCostTrendPercentage(productShipments, productId),
            
            bestRoute: this.findBestRoute(productShipments, productId),
            worstRoute: this.findWorstRoute(productShipments, productId),
            routeComparison: this.compareRoutes(productShipments, productId),
            
            seasonalPattern: this.analyzeSeasonalPatterns(productShipments, productId),
            profitImpact: this.calculateProfitImpact(productShipments, productId),
            
            recommendations: this.generateRecommendations(productShipments, productId),
            
            performance: {
                costEfficiency: this.calculateCostEfficiency(productShipments, productId),
                routeOptimization: this.calculateRouteOptimization(productShipments, productId),
                seasonalOptimization: this.calculateSeasonalOptimization(productShipments, productId)
            }
        };
        
        return analytics;
    }
    
    calculateTotalUnits(shipments, productId) {
        return shipments.reduce((total, shipment) => {
            const product = shipment.products.find(p => p.productId === productId);
            return total + (product ? product.quantity : 0);
        }, 0);
    }
    
    calculateAvgShippingCost(shipments, productId) {
        let totalCost = 0;
        let totalUnits = 0;
        
        shipments.forEach(shipment => {
            const product = shipment.products.find(p => p.productId === productId);
            if (product) {
                totalCost += product.totalCost;
                totalUnits += product.quantity;
            }
        });
        
        return totalUnits > 0 ? totalCost / totalUnits : 0;
    }
    
    calculateCostTrend(shipments, productId) {
        if (shipments.length < 2) return "stable";
        
        const sortedShipments = shipments.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        const recent = sortedShipments.slice(-3);
        const previous = sortedShipments.slice(-6, -3);
        
        const recentAvg = this.calculateAvgCostForPeriod(recent, productId);
        const previousAvg = this.calculateAvgCostForPeriod(previous, productId);
        
        if (previousAvg === 0) return "stable";
        
        const change = ((recentAvg - previousAvg) / previousAvg) * 100;
        
        if (Math.abs(change) < 2) return "stable";
        return change > 0 ? "increasing" : "decreasing";
    }
    
    findBestRoute(shipments, productId) {
        const routeCosts = this.calculateRouteCosts(shipments, productId);
        if (Object.keys(routeCosts).length === 0) return "N/A";
        
        return Object.keys(routeCosts).reduce((best, route) => 
            routeCosts[route].avgCost < routeCosts[best].avgCost ? route : best
        );
    }
    
    findWorstRoute(shipments, productId) {
        const routeCosts = this.calculateRouteCosts(shipments, productId);
        if (Object.keys(routeCosts).length === 0) return "N/A";
        
        return Object.keys(routeCosts).reduce((worst, route) => 
            routeCosts[route].avgCost > routeCosts[worst].avgCost ? route : worst
        );
    }
    
    calculateRouteCosts(shipments, productId) {
        const routeCosts = {};
        
        shipments.forEach(shipment => {
            const route = `${shipment.origin} → ${shipment.destination}`;
            const product = shipment.products.find(p => p.productId === productId);
            
            if (product) {
                if (!routeCosts[route]) {
                    routeCosts[route] = { totalCost: 0, totalUnits: 0, shipments: 0 };
                }
                
                routeCosts[route].totalCost += product.totalCost;
                routeCosts[route].totalUnits += product.quantity;
                routeCosts[route].shipments += 1;
            }
        });
        
        Object.keys(routeCosts).forEach(route => {
            routeCosts[route].avgCost = routeCosts[route].totalCost / routeCosts[route].totalUnits;
        });
        
        return routeCosts;
    }
    
    getEmptyAnalytics() {
        return {
            totalShipments: 0,
            totalUnitsShipped: 0,
            avgShippingCost: 0,
            costTrend: "stable",
            costTrendPercentage: 0,
            bestRoute: "N/A",
            worstRoute: "N/A",
            routeComparison: {},
            profitImpact: 0,
            recommendations: [],
            performance: {
                costEfficiency: 0,
                routeOptimization: 0,
                seasonalOptimization: 0
            }
        };
    }
    
    // Placeholder methods - to be implemented
    calculateCostTrendPercentage(shipments, productId) { return 0; }
    compareRoutes(shipments, productId) { return {}; }
    analyzeSeasonalPatterns(shipments, productId) { return {}; }
    calculateProfitImpact(shipments, productId) { return 0; }
    generateRecommendations(shipments, productId) { return []; }
    calculateCostEfficiency(shipments, productId) { return 75; }
    calculateRouteOptimization(shipments, productId) { return 80; }
    calculateSeasonalOptimization(shipments, productId) { return 70; }
    calculateAvgCostForPeriod(shipments, productId) { return 0; }
}

// ===== 5. UI COMPONENTS ARCHITECTURE =====

class ProductIntelligenceUI {
    constructor() {
        this.components = {
            productDashboard: 'ProductDashboard',
            costAnalytics: 'CostAnalytics', 
            routeComparison: 'RouteComparison',
            profitImpactCalculator: 'ProfitImpactCalculator',
            recommendationsPanel: 'RecommendationsPanel',
            productEditor: 'ProductEditor',
            costAllocationViewer: 'CostAllocationViewer'
        };
    }
    
    renderProductDashboard(products, analytics) {
        return `
            <div class="sol-card">
                <div class="sol-card-header">
                    <h3 class="sol-card-title">
                        <i class="fas fa-cubes" style="color: var(--sol-primary);"></i>
                        Product Intelligence Dashboard
                    </h3>
                </div>
                <div class="sol-card-body">
                    ${this.renderProductGrid(products, analytics)}
                </div>
            </div>
        `;
    }
    
    renderProductGrid(products, analytics) {
        return products.map(product => {
            const productAnalytics = analytics[product.id] || {};
            return `
                <div class="product-card">
                    <h4>${product.name}</h4>
                    <p>SKU: ${product.sku}</p>
                    <p>Cost: $${productAnalytics.avgShippingCost || 0}</p>
                </div>
            `;
        }).join('');
    }
}

// ===== 6. EXPORT ARCHITECTURE =====

window.Phase2Architecture = {
    ProductModel,
    ContainerProductMapping,
    CostAllocationEngine,
    ProductAnalyticsEngine,
    ProductIntelligenceUI,
    
    // Quick setup function
    initialize() {
        console.log('🏭 Phase 2: Product + Cost Intelligence System initialized');
        return {
            productModel: new ProductModel(),
            costEngine: new CostAllocationEngine(),
            analyticsEngine: new ProductAnalyticsEngine(),
            ui: new ProductIntelligenceUI()
        };
    }
};

console.log('[Phase 2 Architecture] System architecture loaded successfully');