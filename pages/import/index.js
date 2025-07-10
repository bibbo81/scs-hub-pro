// pages/products/index.js - Product Intelligence System
// Phase 2: Revolutionary Business Intelligence Platform

// Import organization service
import organizationService, { getActiveOrganizationId, ensureOrganizationSelected } from '/core/services/organization-service.js';
import { importWizard } from '/core/import-wizard.js';
import '/core/supabase-init.js';
import { supabase } from '/core/services/supabase-client.js';
importWizard.setSupabaseClient(supabase);
import { showContextMenu } from '/core/components/context-menu.mjs';

// ===== PRODUCT INTELLIGENCE CORE =====

class ProductIntelligenceSystem {
    constructor() {
        this.products = [];
        this.trackings = [];
        this.analytics = {};
        this.recommendations = [];
        this.organizationId = null; // AGGIUNGI QUESTA RIGA
        this.charts = {};
        this.viewMode = 'grid'; // 'grid' or 'list'
        this.sortColumn = 'name';
        this.sortDirection = 'asc';
        this.activeFilters = {
            category: '',
            costTrend: '',
            search: '',
            minShippingCost: null,
            maxShippingCost: null,
            minUnits: null,
            profitImpact: 'all' // 'all', 'positive', 'negative'
        };
        
        // Bind methods
        this.init = this.init.bind(this);
        this.loadData = this.loadData.bind(this);
        this.generateAnalytics = this.generateAnalytics.bind(this);
    }

async init() {
    console.log('[ProductIntelligence] Initializing system...');
    try {
        // 1. Inizializza i servizi e ottieni l'ID dell'organizzazione
        if (window.organizationService && !window.organizationService.initialized) {
            await window.organizationService.init();
        }
        if (!ensureOrganizationSelected()) {
            this.showStatus('Organization data not available. Cannot load products.', 'warning');
            return;
        }
        this.organizationId = getActiveOrganizationId();
        console.log(`[ProductIntelligence] Using organization: ${this.organizationId}`);

        // 2. Carica i dati e genera le analytics
        await this.loadData();
        await this.generateAnalytics();

        // 3. Associa le funzioni ai bottoni (ora che il DOM è pronto)
        this.initializeEventHandlers(); 

        // 4. Esegui le funzioni di rendering specifiche
        this.renderIntelligenceStats();
        this.renderProducts();
        this.updateFilterBadge();

    } catch (error) {
        console.error('[ProductIntelligence] Initialization failed:', error);
        this.showStatus('System initialization failed. See console for details.', 'error');
    }
}  // ⬅️ LA PARENTESI DEVE ESSERE QUI
    
    async loadData() {
        // Load products from localStorage
        this.products = JSON.parse(localStorage.getItem('products') || '[]');
        
        // If no products exist, create sample data
        if (this.products.length === 0) {
            this.products = this.generateSampleProducts();
            localStorage.setItem('products', JSON.stringify(this.products));
        }
        
        // Load trackings data (from tracking system)
        this.trackings = JSON.parse(localStorage.getItem('mockTrackings') || '[]');
        
        // Generate container-product mappings if needed
        this.generateContainerProductMappings();
    }
    
    generateSampleProducts() {
        return [
            {
                id: 'prod-001',
                sku: 'IP14-128-BL',
                name: 'iPhone 14 128GB Blue',
                category: 'electronics',
                description: 'Latest iPhone model with advanced features',
                specifications: {
                    weight: 0.172, // kg
                    dimensions: { length: 14.7, width: 7.15, height: 0.78 }, // cm
                    volume: 0.000082, // m³
                    value: 899, // USD
                    hsCode: '8517.12.00',
                    fragile: true,
                    hazardous: false
                },
                costTracking: {
                    baseCost: 450, // USD manufacturing
                    targetMargin: 0.35, // 35%
                    shippingBudget: 2.50, // USD per unit
                    currencyCode: 'USD',
                    lastCostUpdate: new Date().toISOString()
                },
                analytics: {
                    totalShipped: 15420,
                    avgShippingCost: 2.85,
                    bestRoute: 'Shanghai → Hamburg',
                    worstRoute: 'Shenzhen → Los Angeles',
                    profitImpact: -5400, // negative impact from higher costs
                    recommendations: []
                },
                createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
                updatedAt: new Date().toISOString(),
                isActive: true,
                tags: ['high-volume', 'premium', 'electronics']
            },
            {
                id: 'prod-002', 
                sku: 'SW-CT-M',
                name: 'Cotton T-Shirt Medium',
                category: 'apparel',
                description: 'Premium cotton t-shirt for retail',
                specifications: {
                    weight: 0.180, // kg
                    dimensions: { length: 30, width: 20, height: 2 }, // cm
                    volume: 0.0012, // m³
                    value: 25, // USD
                    hsCode: '6109.10.00',
                    fragile: false,
                    hazardous: false
                },
                costTracking: {
                    baseCost: 8.50, // USD manufacturing
                    targetMargin: 0.45, // 45%
                    shippingBudget: 0.35, // USD per unit
                    currencyCode: 'USD',
                    lastCostUpdate: new Date().toISOString()
                },
                analytics: {
                    totalShipped: 45600,
                    avgShippingCost: 0.42,
                    bestRoute: 'Chittagong → Rotterdam',
                    worstRoute: 'Ho Chi Minh → Miami',
                    profitImpact: -3200,
                    recommendations: []
                },
                createdAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
                updatedAt: new Date().toISOString(),
                isActive: true,
                tags: ['apparel', 'cotton', 'retail']
            },
            {
                id: 'prod-003',
                sku: 'LED-32-SM',
                name: 'LED TV 32" Smart',
                category: 'electronics',
                description: 'Smart LED Television 32 inch',
                specifications: {
                    weight: 4.2, // kg
                    dimensions: { length: 73, width: 43, height: 8 }, // cm
                    volume: 0.025, // m³
                    value: 299, // USD
                    hsCode: '8528.72.64',
                    fragile: true,
                    hazardous: false
                },
                costTracking: {
                    baseCost: 165, // USD manufacturing
                    targetMargin: 0.30, // 30%
                    shippingBudget: 8.50, // USD per unit
                    currencyCode: 'USD',
                    lastCostUpdate: new Date().toISOString()
                },
                analytics: {
                    totalShipped: 8900,
                    avgShippingCost: 12.30,
                    bestRoute: 'Tianjin → Hamburg',
                    worstRoute: 'Guangzhou → New York',
                    profitImpact: -33800,
                    recommendations: []
                },
                createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
                updatedAt: new Date().toISOString(),
                isActive: true,
                tags: ['electronics', 'tv', 'smart']
            },
            {
                id: 'prod-004',
                sku: 'CF-BL-250',
                name: 'Coffee Beans Premium Blend 250g',
                category: 'food',
                description: 'Premium coffee beans blend',
                specifications: {
                    weight: 0.250, // kg
                    dimensions: { length: 15, width: 8, height: 5 }, // cm
                    volume: 0.0006, // m³
                    value: 18, // USD
                    hsCode: '0901.21.00',
                    fragile: false,
                    hazardous: false
                },
                costTracking: {
                    baseCost: 6.80, // USD manufacturing
                    targetMargin: 0.40, // 40%
                    shippingBudget: 0.25, // USD per unit
                    currencyCode: 'USD',
                    lastCostUpdate: new Date().toISOString()
                },
                analytics: {
                    totalShipped: 28500,
                    avgShippingCost: 0.22,
                    bestRoute: 'Santos → Hamburg',
                    worstRoute: 'Antwerp → Seattle',
                    profitImpact: 855, // positive impact from optimized routes
                    recommendations: []
                },
                createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
                updatedAt: new Date().toISOString(),
                isActive: true,
                tags: ['food', 'coffee', 'premium']
            }
        ];
    }
    
    generateContainerProductMappings() {
        // Create realistic container-product mappings for analytics
        this.trackings.forEach(tracking => {
            if (!tracking.products) {
                // Assign random products to containers for demo
                const numProducts = Math.floor(Math.random() * 3) + 1;
                tracking.products = [];
                
                for (let i = 0; i < numProducts; i++) {
                    const product = this.products[Math.floor(Math.random() * this.products.length)];
                    const quantity = Math.floor(Math.random() * 1000) + 100;
                    const unitCost = (Math.random() * 5) + 0.5;
                    
                    tracking.products.push({
                        productId: product.id,
                        sku: product.sku,
                        quantity: quantity,
                        unitCost: unitCost,
                        totalCost: quantity * unitCost,
                        costBreakdown: {
                            oceanFreight: unitCost * 0.6,
                            portCharges: unitCost * 0.15,
                            customs: unitCost * 0.1,
                            insurance: unitCost * 0.05,
                            documentation: unitCost * 0.05,
                            handling: unitCost * 0.05
                        }
                    });
                }
            }
        });
        
        // Save updated trackings
        localStorage.setItem('mockTrackings', JSON.stringify(this.trackings));
    }
    
    async generateAnalytics() {
        console.log('[ProductIntelligence] Generating analytics...');
        
        // Generate analytics for each product
        this.products.forEach(product => {
            this.analytics[product.id] = this.calculateProductAnalytics(product);
        });
        
        // Generate recommendations
        this.recommendations = this.generateRecommendations();
    }
    
    calculateProductAnalytics(product) {
        // Find all trackings containing this product
        const productTrackings = this.trackings.filter(tracking =>
            tracking.products && tracking.products.some(p => p.productId === product.id)
        );
        
        if (productTrackings.length === 0) {
            return this.getEmptyAnalytics();
        }
        
        // Calculate metrics
        let totalUnits = 0;
        let totalCost = 0;
        let routeCosts = {};
        let costHistory = [];
        
        productTrackings.forEach(tracking => {
            const productEntry = tracking.products.find(p => p.productId === product.id);
            if (productEntry) {
                totalUnits += productEntry.quantity;
                totalCost += productEntry.totalCost;
                
                // Route analysis
                const route = `${tracking.metadata?.pol || tracking.origin} → ${tracking.metadata?.pod || tracking.destination}`;
                if (!routeCosts[route]) {
                    routeCosts[route] = { totalCost: 0, totalUnits: 0 };
                }
                routeCosts[route].totalCost += productEntry.totalCost;
                routeCosts[route].totalUnits += productEntry.quantity;
                
                // Cost history
                costHistory.push({
                    date: tracking.created_at,
                    unitCost: productEntry.unitCost,
                    quantity: productEntry.quantity
                });
            }
        });
        
        // Calculate route averages
        Object.keys(routeCosts).forEach(route => {
            routeCosts[route].avgCost = routeCosts[route].totalCost / routeCosts[route].totalUnits;
        });
        
        // Find best and worst routes
        const routes = Object.keys(routeCosts);
        const bestRoute = routes.reduce((best, route) =>
            routeCosts[route].avgCost < routeCosts[best].avgCost ? route : best
        );
        const worstRoute = routes.reduce((worst, route) =>
            routeCosts[route].avgCost > routeCosts[worst].avgCost ? route : worst
        );
        
        // Calculate cost trend
        costHistory.sort((a, b) => new Date(a.date) - new Date(b.date));
        const recentCosts = costHistory.slice(-3).map(h => h.unitCost);
        const olderCosts = costHistory.slice(-6, -3).map(h => h.unitCost);
        
        const recentAvg = recentCosts.reduce((a, b) => a + b, 0) / recentCosts.length;
        const olderAvg = olderCosts.reduce((a, b) => a + b, 0) / olderCosts.length;
        
        let costTrend = "stable";
        let costTrendPercentage = 0;
        
        if (olderAvg > 0) {
            costTrendPercentage = ((recentAvg - olderAvg) / olderAvg) * 100;
            if (Math.abs(costTrendPercentage) > 2) {
                costTrend = costTrendPercentage > 0 ? "increasing" : "decreasing";
            }
        }
        
        // Calculate profit impact
        const targetCost = product.costTracking.shippingBudget;
        const actualCost = totalCost / totalUnits;
        const profitImpact = (targetCost - actualCost) * totalUnits;
        
        return {
            totalShipments: productTrackings.length,
            totalUnitsShipped: totalUnits,
            avgShippingCost: totalCost / totalUnits,
            costTrend: costTrend,
            costTrendPercentage: costTrendPercentage,
            bestRoute: bestRoute,
            worstRoute: worstRoute,
            routeComparison: routeCosts,
            profitImpact: profitImpact,
            performance: {
                costEfficiency: Math.max(0, Math.min(100, 100 - Math.abs(costTrendPercentage))),
                routeOptimization: routes.length > 1 ? 75 : 50,
                seasonalOptimization: 80
            }
        };
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
            performance: {
                costEfficiency: 0,
                routeOptimization: 0,
                seasonalOptimization: 0
            }
        };
    }
    
    generateRecommendations() {
    const recommendations = [];
    this.products.forEach(product => {
        const analytics = this.analytics[product.id];
        if (!analytics) return; // Sicurezza extra se mancano le analytics

        // --- Logica per le route (già sicura) ---
        if (analytics.bestRoute !== "N/A" && analytics.worstRoute !== "N/A") {
            const bestCost = analytics.routeComparison[analytics.bestRoute]?.avgCost || 0;
            const worstCost = analytics.routeComparison[analytics.worstRoute]?.avgCost || 0;
            const savings = worstCost - bestCost;
            if (savings > 0.1) {
                recommendations.push({ /* ... recommendation object ... */ });
            }
        }

        // --- Logica per il cost trend (già sicura) ---
        if (analytics.costTrend === "increasing" && Math.abs(analytics.costTrendPercentage) > 10) {
            recommendations.push({ /* ... recommendation object ... */ });
        }

        // --- Logica per il margine di profitto (CON LA CORREZIONE) ---
        const value = product.specifications?.value || 0;
        const baseCost = product.costTracking?.baseCost || 0;
        const targetMargin = product.costTracking?.targetMargin || 0;
        const avgShippingCost = analytics.avgShippingCost || 0;

        if (value > 0) { // Evita la divisione per zero
            const currentMargin = (value - baseCost - avgShippingCost) / value;
            if (targetMargin > 0 && currentMargin < targetMargin - 0.05) {
                recommendations.push({
                    id: `margin-${product.id}`,
                    type: "margin_optimization",
                    priority: "medium",
                    productId: product.id,
                    productName: product.name,
                    title: `Improve margins for ${product.name}`,
                    description: `Current margin ${(currentMargin * 100).toFixed(1)}% below target ${(targetMargin * 100).toFixed(1)}%`,
                    potentialSaving: (targetMargin - currentMargin) * value,
                    action: "Optimize costs or adjust pricing",
                    estimatedImpact: (targetMargin - currentMargin) * value * (analytics.totalUnitsShipped || 0),
                    status: "pending"
                });
            }
        }
    });

    return recommendations.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const statusOrder = { urgent: 2, pending: 1 };
        if (priorityOrder[b.priority] !== priorityOrder[a.priority]) {
            return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
        }
        return (statusOrder[b.status] || 0) - (statusOrder[a.status] || 0);
    });
}
    
    initializeUI() {
        this.renderIntelligenceStats();
        this.renderProducts();
        // this.initializeEventHandlers(); 
    }
    
    renderIntelligenceStats() {
        const statsContainer = document.getElementById('intelligenceStats');
        if (!statsContainer) return;
        
        // Calculate overall metrics
        const totalProducts = this.products.length;
        const totalShipments = Object.values(this.analytics).reduce((sum, a) => sum + a.totalShipments, 0);
        const avgCostTrend = Object.values(this.analytics).reduce((sum, a) => sum + a.costTrendPercentage, 0) / totalProducts;
        const totalProfitImpact = Object.values(this.analytics).reduce((sum, a) => sum + a.profitImpact, 0);
        const highPriorityRecommendations = this.recommendations.filter(r => r.priority === "high").length;
        
        statsContainer.innerHTML = `
            <div class="sol-stat-card">
                <div class="sol-stat-icon" style="color: var(--sol-primary);">
                    <i class="fas fa-cubes"></i>
                </div>
                <div class="sol-stat-value">${totalProducts}</div>
                <div class="sol-stat-label">Active Products</div>
            </div>
            
            <div class="sol-stat-card">
                <div class="sol-stat-icon" style="color: var(--sol-info);">
                    <i class="fas fa-ship"></i>
                </div>
                <div class="sol-stat-value">${totalShipments.toLocaleString()}</div>
                <div class="sol-stat-label">Total Shipments</div>
            </div>
            
            <div class="sol-stat-card">
                <div class="sol-stat-icon" style="color: ${avgCostTrend > 0 ? 'var(--sol-danger)' : 'var(--sol-success)'};">
                    <i class="fas fa-chart-line"></i>
                </div>
                <div class="sol-stat-value">${avgCostTrend > 0 ? '+' : ''}${avgCostTrend.toFixed(1)}%</div>
                <div class="sol-stat-label">Avg Cost Trend</div>
            </div>
            
            <div class="sol-stat-card">
                <div class="sol-stat-icon" style="color: ${totalProfitImpact >= 0 ? 'var(--sol-success)' : 'var(--sol-danger)'};">
                    <i class="fas fa-dollar-sign"></i>
                </div>
                <div class="sol-stat-value">${totalProfitImpact >= 0 ? '+' : ''}$${(totalProfitImpact / 1000).toFixed(0)}K</div>
                <div class="sol-stat-label">Profit Impact</div>
            </div>
            
            <div class="sol-stat-card">
                <div class="sol-stat-icon" style="color: var(--sol-warning);">
                    <i class="fas fa-lightbulb"></i>
                </div>
                <div class="sol-stat-value">${highPriorityRecommendations}</div>
                <div class="sol-stat-label">Priority Actions</div>
            </div>
        `;
    }
    
    // Metodo per aprire modal filtri avanzati
    showAdvancedFilters() {
        console.log('[Products] Showing advanced filters modal...');
        
        if (!window.ModalSystem) {
            console.error('[Products] Modal system not available');
            return;
        }
        
        window.ModalSystem.show({
            title: 'Advanced Filters',
            content: `
                <div class="advanced-filters-form">
                    <div class="sol-form-grid">
                        <div class="sol-form-group">
                            <label class="sol-form-label">Min Shipping Cost ($)</label>
                            <input type="number" class="sol-form-input" id="filterMinCost" 
                                   value="${this.activeFilters?.minShippingCost || ''}" 
                                   placeholder="0.00" step="0.01" min="0">
                        </div>
                        
                        <div class="sol-form-group">
                            <label class="sol-form-label">Max Shipping Cost ($)</label>
                            <input type="number" class="sol-form-input" id="filterMaxCost" 
                                   value="${this.activeFilters?.maxShippingCost || ''}" 
                                   placeholder="100.00" step="0.01" min="0">
                        </div>
                        
                        <div class="sol-form-group">
                            <label class="sol-form-label">Min Units Shipped</label>
                            <input type="number" class="sol-form-input" id="filterMinUnits" 
                                   value="${this.activeFilters?.minUnits || ''}" 
                                   placeholder="0" min="0">
                        </div>
                        
                        <div class="sol-form-group">
                            <label class="sol-form-label">Profit Impact</label>
                            <select class="sol-form-select" id="filterProfitImpact">
                                <option value="all" ${this.activeFilters?.profitImpact === 'all' ? 'selected' : ''}>All</option>
                                <option value="positive" ${this.activeFilters?.profitImpact === 'positive' ? 'selected' : ''}>Positive Only</option>
                                <option value="negative" ${this.activeFilters?.profitImpact === 'negative' ? 'selected' : ''}>Negative Only</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="filter-info" style="background: var(--sol-info-light); padding: 0.75rem 1rem; border-radius: var(--sol-radius-md); margin-top: 1rem;">
                        <p style="margin: 0; font-size: 0.875rem; color: var(--sol-info-dark);">
                            <i class="fas fa-info-circle"></i> Filters are applied in combination with the main filters above.
                        </p>
                    </div>
                </div>
            `,
            size: 'md',
            buttons: [
                {
                    text: 'Clear All',
                    class: 'sol-btn-glass',
                    onclick: () => {
                        this.clearFilters();
                        window.ModalSystem.close();
                    }
                },
                {
                    text: 'Apply Filters',
                    class: 'sol-btn-primary',
                    onclick: () => {
                        this.applyAdvancedFilters();
                        window.ModalSystem.close();
                    }
                }
            ]
        });
    }
    
    // Applica filtri avanzati
    applyAdvancedFilters() {
        const minCost = parseFloat(document.getElementById('filterMinCost')?.value) || null;
        const maxCost = parseFloat(document.getElementById('filterMaxCost')?.value) || null;
        const minUnits = parseInt(document.getElementById('filterMinUnits')?.value) || null;
        const profitImpact = document.getElementById('filterProfitImpact')?.value || 'all';
        
        this.activeFilters.minShippingCost = minCost;
        this.activeFilters.maxShippingCost = maxCost;
        this.activeFilters.minUnits = minUnits;
        this.activeFilters.profitImpact = profitImpact;
        
        this.renderProducts();
        this.updateFilterBadge();
    }
    
    // Clear tutti i filtri
    clearFilters() {
        this.activeFilters = {
            category: '',
            costTrend: '',
            search: '',
            minShippingCost: null,
            maxShippingCost: null,
            minUnits: null,
            profitImpact: 'all'
        };
        
        // Reset UI filters
        const categoryFilter = document.getElementById('categoryFilter');
        const costTrendFilter = document.getElementById('costTrendFilter');
        const productSearch = document.getElementById('productSearch');
        
        if (categoryFilter) categoryFilter.value = '';
        if (costTrendFilter) costTrendFilter.value = '';
        if (productSearch) productSearch.value = '';
        
        this.renderProducts();
        this.updateFilterBadge();
    }
    
    // Aggiorna badge filtri attivi
    updateFilterBadge() {
        const activeCount = Object.values(this.activeFilters)
            .filter(v => v !== '' && v !== null && v !== 'all').length;
        
        const badge = document.getElementById('activeFiltersCount');
        if (badge) {
            badge.textContent = activeCount;
            badge.style.display = activeCount > 0 ? 'inline-block' : 'none';
        }
    }
    
    // Metodo per ordinare i prodotti
    sortProducts(column) {
        // Toggle direction if clicking same column
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'asc';
        }
        
        this.renderProducts();
    }
    
    // Metodo per ottenere i prodotti filtrati e ordinati
    getFilteredAndSortedProducts() {
        let filteredProducts = [...this.products];
        
        // Apply filters
        if (this.activeFilters.category) {
            filteredProducts = filteredProducts.filter(p => p.category === this.activeFilters.category);
        }
        
        if (this.activeFilters.search) {
            const searchLower = this.activeFilters.search.toLowerCase();
            filteredProducts = filteredProducts.filter(p => 
                p.name.toLowerCase().includes(searchLower) ||
                p.sku.toLowerCase().includes(searchLower) ||
                p.description?.toLowerCase().includes(searchLower)
            );
        }
        
        if (this.activeFilters.costTrend) {
            filteredProducts = filteredProducts.filter(p => {
                const analytics = this.analytics[p.id];
                return analytics && analytics.costTrend === this.activeFilters.costTrend;
            });
        }
        
        if (this.activeFilters.minShippingCost !== null) {
            filteredProducts = filteredProducts.filter(p => {
                const analytics = this.analytics[p.id];
                return analytics && analytics.avgShippingCost >= this.activeFilters.minShippingCost;
            });
        }
        
        if (this.activeFilters.maxShippingCost !== null) {
            filteredProducts = filteredProducts.filter(p => {
                const analytics = this.analytics[p.id];
                return analytics && analytics.avgShippingCost <= this.activeFilters.maxShippingCost;
            });
        }
        
        if (this.activeFilters.minUnits !== null) {
            filteredProducts = filteredProducts.filter(p => {
                const analytics = this.analytics[p.id];
                return analytics && analytics.totalUnitsShipped >= this.activeFilters.minUnits;
            });
        }
        
        if (this.activeFilters.profitImpact !== 'all') {
            filteredProducts = filteredProducts.filter(p => {
                const analytics = this.analytics[p.id];
                if (!analytics) return false;
                
                if (this.activeFilters.profitImpact === 'positive') {
                    return analytics.profitImpact >= 0;
                } else {
                    return analytics.profitImpact < 0;
                }
            });
        }
        
        // Apply sorting
        filteredProducts.sort((a, b) => {
            let aValue, bValue;
            
            switch (this.sortColumn) {
                case 'sku':
                    aValue = a.sku;
                    bValue = b.sku;
                    break;
                case 'name':
                    aValue = a.name;
                    bValue = b.name;
                    break;
                case 'category':
                    aValue = a.category;
                    bValue = b.category;
                    break;
                case 'shippingCost':
                    aValue = this.analytics[a.id]?.avgShippingCost || 0;
                    bValue = this.analytics[b.id]?.avgShippingCost || 0;
                    break;
                case 'costTrend':
                    aValue = this.analytics[a.id]?.costTrendPercentage || 0;
                    bValue = this.analytics[b.id]?.costTrendPercentage || 0;
                    break;
                case 'unitsShipped':
                    aValue = this.analytics[a.id]?.totalUnitsShipped || 0;
                    bValue = this.analytics[b.id]?.totalUnitsShipped || 0;
                    break;
                case 'profitImpact':
                    aValue = this.analytics[a.id]?.profitImpact || 0;
                    bValue = this.analytics[b.id]?.profitImpact || 0;
                    break;
                default:
                    aValue = a.name;
                    bValue = b.name;
            }
            
            // Handle string vs number comparison
            if (typeof aValue === 'string' && typeof bValue === 'string') {
                return this.sortDirection === 'asc' 
                    ? aValue.localeCompare(bValue)
                    : bValue.localeCompare(aValue);
            } else {
                return this.sortDirection === 'asc' 
                    ? aValue - bValue
                    : bValue - aValue;
            }
        });
        
        return filteredProducts;
    }
    
    // Helper per icone di ordinamento
    getSortIcon(column) {
        if (this.sortColumn !== column) {
            return '<i class="fas fa-sort"></i>';
        }
        return this.sortDirection === 'asc' 
            ? '<i class="fas fa-sort-up"></i>' 
            : '<i class="fas fa-sort-down"></i>';
    }
    
    showStatus(message, type = 'info', duration = 3000) {
        if (window.NotificationSystem) {
            window.NotificationSystem.show(message, type, duration);
        } else {
            console.log(`[ProductIntelligence] ${type}: ${message}`);
        }
    }
    
    initializeEventHandlers() {
        // Add Product Button
        const addProductBtn = document.getElementById('addProductBtn');
        if (addProductBtn) {
            addProductBtn.addEventListener('click', () => this.showAddProductModal());
        }
        
        // Import Products Button
        const importBtn = document.getElementById('importProductsBtn');
        if (importBtn) {
            importBtn.addEventListener('click', () => this.showImportModal());
        }
        
        // Export Analytics Button
        const exportBtn = document.getElementById('exportAnalyticsBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportAnalytics());
        }
        
        // Bulk Cost Update Button
        const bulkUpdateBtn = document.getElementById('bulkCostUpdateBtn');
        if (bulkUpdateBtn) {
            bulkUpdateBtn.addEventListener('click', () => this.showBulkUpdateModal());
        }
        
        // Search and Filters
        const searchInput = document.getElementById('productSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.filterProducts());
        }
        
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => this.filterProducts());
        }
        
        const costTrendFilter = document.getElementById('costTrendFilter');
        if (costTrendFilter) {
            costTrendFilter.addEventListener('change', () => this.filterProducts());
        }
    }
    
    showAddProductModal() {
        if (!window.ModalSystem) {
            console.error('Modal system not available');
            return;
        }
        
        window.ModalSystem.show({
            title: 'Add New Product',
            content: this.getProductFormHTML(),
            size: 'lg',
            actions: [
                {
                    label: 'Cancel',
                    class: 'sol-btn-secondary',
                    handler: () => true
                },
                {
                    label: 'Save Product',
                    class: 'sol-btn-primary',
                    handler: () => this.saveProduct()
                }
            ]
        });
    }
    
    showBulkUpdateModal() {
        if (!window.ModalSystem) {
            console.error('Modal system not available');
            return;
        }
        
        window.ModalSystem.show({
            title: 'Bulk Cost Update',
            content: `
                <div class="bulk-update-form">
                    <p>Update shipping costs for all products based on current market rates.</p>
                    <div class="sol-form-group">
                        <label class="sol-form-label">Cost Adjustment (%)</label>
                        <select class="sol-form-select" id="costAdjustment">
                            <option value="-10">-10% (Cost reduction)</option>
                            <option value="-5">-5% (Minor reduction)</option>
                            <option value="0" selected>No change</option>
                            <option value="5">+5% (Minor increase)</option>
                            <option value="10">+10% (Cost increase)</option>
                            <option value="15">+15% (Major increase)</option>
                        </select>
                    </div>
                    <div class="sol-form-group">
                        <label class="sol-form-label">Apply to Category</label>
                        <select class="sol-form-select" id="bulkCategory">
                            <option value="all">All Products</option>
                            <option value="electronics">Electronics Only</option>
                            <option value="apparel">Apparel Only</option>
                            <option value="home">Home & Garden Only</option>
                            <option value="food">Food & Beverage Only</option>
                        </select>
                    </div>
                </div>
            `,
            size: 'md',
            actions: [
                {
                    label: 'Cancel',
                    class: 'sol-btn-secondary',
                    handler: () => true
                },
                {
                    label: 'Update Costs',
                    class: 'sol-btn-primary',
                    handler: () => this.executeBulkUpdate()
                }
            ]
        });
    }
    
    executeBulkUpdate() {
        const adjustment = parseFloat(document.getElementById('costAdjustment').value);
        const category = document.getElementById('bulkCategory').value;
        
        let updated = 0;
        this.products.forEach(product => {
            if (category === 'all' || product.category === category) {
                // Update analytics with new cost
                if (this.analytics[product.id]) {
                    const currentCost = this.analytics[product.id].avgShippingCost;
                    const newCost = currentCost * (1 + adjustment / 100);
                    this.analytics[product.id].avgShippingCost = newCost;
                    updated++;
                }
            }
        });
        
        // Regenerate analytics
        this.generateAnalytics();
        
        // Refresh UI
        this.renderIntelligenceStats();
        this.renderProducts();
        
        this.showStatus(`Updated costs for ${updated} products`, 'success');
        return true;
    }
    
    async showImportModal() {
    console.log('[ProductIntelligence] Initializing import wizard for products...');
    if (!window.importWizard && !importWizard) {
        this.showStatus('Import wizard module not available.', 'error');
        return;
    }

    const wizard = window.importWizard || importWizard;

    try {
        // Configura il wizard per l'entità 'products'
        await wizard.init({
            entity: 'products',
            endpoint: '/api/v1/products/import', // Sostituisci con il tuo vero endpoint
            targetFields: [
                { name: 'sku', label: 'SKU', required: true, type: 'text' },
                { name: 'name', label: 'Product Name', required: true, type: 'text' },
                { name: 'description', label: 'Description', type: 'text' },
                { name: 'category', label: 'Category', required: true, type: 'text' },
                { name: 'specifications.weight', label: 'Weight (kg)', type: 'number' },
                { name: 'specifications.dimensions.length', label: 'Length (cm)', type: 'number' },
                { name: 'specifications.dimensions.width', label: 'Width (cm)', type: 'number' },
                { name: 'specifications.dimensions.height', label: 'Height (cm)', type: 'number' },
                { name: 'specifications.value', label: 'Unit Value (USD)', type: 'currency' },
                { name: 'costTracking.baseCost', label: 'Base Cost (USD)', type: 'currency' },
                { name: 'costTracking.targetMargin', label: 'Target Margin (%)', type: 'percentage' }
            ]
        });

        // Mostra il wizard
        wizard.show();

        // Ascolta l'evento di completamento per aggiornare i dati
        wizard.events.addEventListener('importComplete', async () => {
            this.showStatus('Import successful! Refreshing data...', 'success');
            await this.loadData();
            this.renderProducts();
            this.renderIntelligenceStats();
        }, { once: true });

    } catch (error) {
        console.error('Failed to initialize import wizard:', error);
        this.showStatus(`Error: ${error.message}`, 'error');
    }
}
    
    executeImport() {
        const fileInput = document.getElementById('csvFile');
        const overwrite = document.getElementById('overwriteExisting').checked;
        
        if (!fileInput.files || fileInput.files.length === 0) {
            this.showStatus('Please select a CSV file', 'error');
            return false;
        }
        
        const file = fileInput.files[0];
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const csv = e.target.result;
                const lines = csv.split('\n');
                const headers = lines[0].split(',').map(h => h.trim());
                
                let imported = 0;
                let errors = 0;
                
                for (let i = 1; i < lines.length; i++) {
                    if (!lines[i].trim()) continue;
                    
                    const values = lines[i].split(',').map(v => v.trim());
                    const row = {};
                    
                    headers.forEach((header, index) => {
                        row[header] = values[index];
                    });
                    
                    try {
                        // Check if product exists
                        const existingIndex = this.products.findIndex(p => p.sku === row.sku);
                        
                        if (existingIndex >= 0 && !overwrite) {
                            errors++;
                            continue;
                        }
                        
                        const productData = {
                            id: existingIndex >= 0 ? this.products[existingIndex].id : `prod-${Date.now()}-${imported}`,
                            sku: row.sku,
                            name: row.name,
                            category: row.category || 'electronics',
                            description: row.description || '',
                            specifications: {
                                weight: parseFloat(row.weight) || 0,
                                dimensions: {
                                    length: parseFloat(row.length) || 0,
                                    width: parseFloat(row.width) || 0,
                                    height: parseFloat(row.height) || 0
                                },
                                value: parseFloat(row.value) || 0,
                                hsCode: row.hsCode || '',
                                fragile: row.fragile === 'true',
                                hazardous: row.hazardous === 'true'
                            },
                            costTracking: {
                                baseCost: parseFloat(row.baseCost) || 0,
                                targetMargin: parseFloat(row.targetMargin) || 0.30,
                                shippingBudget: parseFloat(row.shippingBudget) || 0,
                                currencyCode: 'USD',
                                lastCostUpdate: new Date().toISOString()
                            },
                            analytics: this.getEmptyAnalytics(),
                            createdAt: existingIndex >= 0 ? this.products[existingIndex].createdAt : new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                            isActive: true,
                            tags: []
                        };
                        
                        // Calculate volume
                        const { length, width, height } = productData.specifications.dimensions;
                        productData.specifications.volume = (length * width * height) / 1000000;
                        
                        if (existingIndex >= 0) {
                            this.products[existingIndex] = productData;
                        } else {
                            this.products.push(productData);
                        }
                        
                        imported++;
                    } catch (error) {
                        console.error('Error importing row:', row, error);
                        errors++;
                    }
                }
                
                // Save and refresh
                localStorage.setItem('products', JSON.stringify(this.products));
                this.generateAnalytics();
                this.renderIntelligenceStats();
                this.renderProducts();
                
                this.showStatus(`Imported ${imported} products${errors > 0 ? `, ${errors} errors` : ''}`, 'success');
                
            } catch (error) {
                console.error('Error parsing CSV:', error);
                this.showStatus('Error parsing CSV file', 'error');
            }
        };
        
        reader.readAsText(file);
        return true;
    }
    
    getProductFormHTML(product = null) {
        const isEdit = product !== null;
        const data = product || {
            sku: '',
            name: '',
            category: 'electronics',
            description: '',
            specifications: {
                weight: 0,
                dimensions: { length: 0, width: 0, height: 0 },
                value: 0,
                hsCode: '',
                fragile: false,
                hazardous: false
            },
            costTracking: {
                baseCost: 0,
                targetMargin: 0.30,
                shippingBudget: 0,
                currencyCode: 'USD'
            }
        };
        
        return `
            <form id="productForm" class="sol-form">
                <div class="sol-form-grid">
                    <div class="sol-form-group">
                        <label class="sol-form-label">
                            <i class="fas fa-barcode"></i>
                            SKU *
                        </label>
                        <input type="text" class="sol-form-input" id="productSku" 
                               value="${data.sku}" placeholder="PROD-001" required>
                        <span class="sol-form-hint">Unique product identifier</span>
                    </div>
                    
                    <div class="sol-form-group">
                        <label class="sol-form-label">
                            <i class="fas fa-tag"></i>
                            Product Name *
                        </label>
                        <input type="text" class="sol-form-input" id="productName" 
                               value="${data.name}" placeholder="Product Name" required>
                    </div>
                    
                    <div class="sol-form-group">
                        <label class="sol-form-label">
                            <i class="fas fa-layer-group"></i>
                            Category
                        </label>
                        <select class="sol-form-select" id="productCategory">
                            <option value="electronics" ${data.category === 'electronics' ? 'selected' : ''}>Electronics</option>
                            <option value="apparel" ${data.category === 'apparel' ? 'selected' : ''}>Apparel</option>
                            <option value="home" ${data.category === 'home' ? 'selected' : ''}>Home & Garden</option>
                            <option value="automotive" ${data.category === 'automotive' ? 'selected' : ''}>Automotive</option>
                            <option value="industrial" ${data.category === 'industrial' ? 'selected' : ''}>Industrial</option>
                            <option value="food" ${data.category === 'food' ? 'selected' : ''}>Food & Beverage</option>
                        </select>
                    </div>
                    
                    <div class="sol-form-group">
                        <label class="sol-form-label">
                            <i class="fas fa-weight"></i>
                            Weight (kg) *
                        </label>
                        <input type="number" class="sol-form-input" id="productWeight" 
                               value="${data.specifications.weight}" step="0.001" min="0" required>
                    </div>
                    
                    <div class="sol-form-group">
                        <label class="sol-form-label">
                            <i class="fas fa-ruler"></i>
                            Length (cm) *
                        </label>
                        <input type="number" class="sol-form-input" id="productLength" 
                               value="${data.specifications.dimensions.length}" step="0.1" min="0" required>
                    </div>
                    
                    <div class="sol-form-group">
                        <label class="sol-form-label">
                            <i class="fas fa-ruler"></i>
                            Width (cm) *
                        </label>
                        <input type="number" class="sol-form-input" id="productWidth" 
                               value="${data.specifications.dimensions.width}" step="0.1" min="0" required>
                    </div>
                    
                    <div class="sol-form-group">
                        <label class="sol-form-label">
                            <i class="fas fa-ruler"></i>
                            Height (cm) *
                        </label>
                        <input type="number" class="sol-form-input" id="productHeight" 
                               value="${data.specifications.dimensions.height}" step="0.1" min="0" required>
                    </div>
                    
                    <div class="sol-form-group">
                        <label class="sol-form-label">
                            <i class="fas fa-dollar-sign"></i>
                            Unit Value (USD) *
                        </label>
                        <input type="number" class="sol-form-input" id="productValue" 
                               value="${data.specifications.value}" step="0.01" min="0" required>
                    </div>
                    
                    <div class="sol-form-group">
                        <label class="sol-form-label">
                            <i class="fas fa-file-code"></i>
                            HS Code
                        </label>
                        <input type="text" class="sol-form-input" id="productHsCode" 
                               value="${data.specifications.hsCode}" placeholder="8471.30.01">
                        <span class="sol-form-hint">Harmonized System code for customs</span>
                    </div>
                    
                    <div class="sol-form-group">
                        <label class="sol-form-label">
                            <i class="fas fa-industry"></i>
                            Manufacturing Cost (USD) *
                        </label>
                        <input type="number" class="sol-form-input" id="productBaseCost" 
                               value="${data.costTracking.baseCost}" step="0.01" min="0" required>
                    </div>
                    
                    <div class="sol-form-group">
                        <label class="sol-form-label">
                            <i class="fas fa-percentage"></i>
                            Target Margin (%) *
                        </label>
                        <input type="number" class="sol-form-input" id="productMargin" 
                               value="${(data.costTracking.targetMargin * 100).toFixed(0)}" 
                               step="1" min="0" max="100" required>
                        <span class="sol-form-hint">Target profit margin percentage</span>
                    </div>
                    
                    <div class="sol-form-group">
                        <label class="sol-form-label">
                            <i class="fas fa-ship"></i>
                            Shipping Budget (USD/unit) *
                        </label>
                        <input type="number" class="sol-form-input" id="productShippingBudget" 
                               value="${data.costTracking.shippingBudget}" step="0.01" min="0" required>
                        <span class="sol-form-hint">Target shipping cost per unit</span>
                    </div>
                </div>
                
                <div class="sol-form-group" style="grid-column: 1 / -1;">
                    <label class="sol-form-label">
                        <i class="fas fa-align-left"></i>
                        Description
                    </label>
                    <textarea class="sol-form-input" id="productDescription" rows="3" 
                              placeholder="Product description...">${data.description}</textarea>
                </div>
                
                <div class="sol-form-grid" style="grid-template-columns: repeat(2, 1fr);">
                    <label class="sol-form-label" style="display: flex; align-items: center; gap: 0.5rem;">
                        <input type="checkbox" id="productFragile" ${data.specifications.fragile ? 'checked' : ''}>
                        <i class="fas fa-fragile"></i>
                        Fragile Item
                    </label>
                    
                    <label class="sol-form-label" style="display: flex; align-items: center; gap: 0.5rem;">
                        <input type="checkbox" id="productHazardous" ${data.specifications.hazardous ? 'checked' : ''}>
                        <i class="fas fa-exclamation-triangle"></i>
                        Hazardous Material
                    </label>
                </div>
            </form>
        `;
    }
    
    saveProduct() {
        const form = document.getElementById('productForm');
        if (!form || !form.checkValidity()) {
            this.showStatus('Please fill all required fields', 'error');
            return false;
        }
        
        // Get form data
        const productData = {
            id: `prod-${Date.now()}`,
            sku: document.getElementById('productSku').value.trim(),
            name: document.getElementById('productName').value.trim(),
            category: document.getElementById('productCategory').value,
            description: document.getElementById('productDescription').value.trim(),
            specifications: {
                weight: parseFloat(document.getElementById('productWeight').value),
                dimensions: {
                    length: parseFloat(document.getElementById('productLength').value),
                    width: parseFloat(document.getElementById('productWidth').value),
                    height: parseFloat(document.getElementById('productHeight').value)
                },
                value: parseFloat(document.getElementById('productValue').value),
                hsCode: document.getElementById('productHsCode').value.trim(),
                fragile: document.getElementById('productFragile').checked,
                hazardous: document.getElementById('productHazardous').checked
            },
            costTracking: {
                baseCost: parseFloat(document.getElementById('productBaseCost').value),
                targetMargin: parseFloat(document.getElementById('productMargin').value) / 100,
                shippingBudget: parseFloat(document.getElementById('productShippingBudget').value),
                currencyCode: 'USD',
                lastCostUpdate: new Date().toISOString()
            },
            analytics: this.getEmptyAnalytics(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isActive: true,
            tags: []
        };
        
        // Calculate volume
        const { length, width, height } = productData.specifications.dimensions;
        productData.specifications.volume = (length * width * height) / 1000000; // cm³ to m³
        
        // Check for duplicate SKU
        if (this.products.some(p => p.sku === productData.sku)) {
            this.showStatus('SKU already exists', 'error');
            return false;
        }
        
        // Add to products array
        this.products.push(productData);
        
        // Save to localStorage
        localStorage.setItem('products', JSON.stringify(this.products));
        
        // Regenerate analytics
        this.analytics[productData.id] = this.calculateProductAnalytics(productData);
        
        // Refresh UI
        this.renderIntelligenceStats();
        this.renderProducts();
        
        this.showStatus('Product added successfully', 'success');
        return true;
    }
    
    // Aggiorna filterProducts esistente per usare activeFilters
    filterProducts() {
        this.activeFilters.search = document.getElementById('productSearch')?.value || '';
        this.activeFilters.category = document.getElementById('categoryFilter')?.value || '';
        this.activeFilters.costTrend = document.getElementById('costTrendFilter')?.value || '';
        
        this.renderProducts();
        this.updateFilterBadge();
    }
    
    exportAnalytics() {
        // Prepare analytics data for export
        const exportData = {
            exportDate: new Date().toISOString(),
            summary: {
                totalProducts: this.products.length,
                totalShipments: Object.values(this.analytics).reduce((sum, a) => sum + a.totalShipments, 0),
                totalUnitsShipped: Object.values(this.analytics).reduce((sum, a) => sum + a.totalUnitsShipped, 0),
                totalProfitImpact: Object.values(this.analytics).reduce((sum, a) => sum + a.profitImpact, 0)
            },
            products: this.products.map(product => ({
                ...product,
                analytics: this.analytics[product.id]
            })),
            recommendations: this.recommendations
        };
        
        // Create and download file
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `product-analytics-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showStatus('Analytics exported successfully', 'success');
    }
    
    // Aggiungi questo metodo per toggle tra grid e list view
    toggleViewMode() {
        this.viewMode = this.viewMode === 'grid' ? 'list' : 'grid';
        this.renderProducts();
        
        // Update button states
        const gridBtn = document.getElementById('viewGridBtn');
        const listBtn = document.getElementById('viewListBtn');
        
        if (gridBtn && listBtn) {
            if (this.viewMode === 'grid') {
                gridBtn.classList.add('active');
                listBtn.classList.remove('active');
            } else {
                gridBtn.classList.remove('active');
                listBtn.classList.add('active');
            }
        }
    }
    
    // Modifica il metodo renderProducts() esistente per supportare entrambe le viste:
    renderProducts() {
        const productsGrid = document.getElementById('productsGrid');
        if (!productsGrid) return;
        
        if (this.viewMode === 'grid') {
            productsGrid.className = 'products-intelligence-grid';
            productsGrid.innerHTML = this.renderProductsGrid();
        } else {
            productsGrid.className = 'products-intelligence-list';
            productsGrid.innerHTML = this.renderProductsList();
        }
    }
    
    // Il metodo renderProductsGrid() contiene il codice HTML esistente da renderProducts()
    renderProductsGrid() {
        return this.products.map(product => {
            const analytics = this.analytics[product.id] || this.getEmptyAnalytics();
            const costTrendIcon = analytics.costTrend === 'increasing' ? 'fa-arrow-up' : 
                                 analytics.costTrend === 'decreasing' ? 'fa-arrow-down' : 'fa-minus';
            const costTrendClass = analytics.costTrend === 'increasing' ? 'negative' : 
                                  analytics.costTrend === 'decreasing' ? 'positive' : 'stable';
            
            // Determine intelligence badge
            let badgeClass = '';
            let badgeText = 'TRACKED';
            
            if (Math.abs(analytics.profitImpact) > 10000) {
                badgeClass = 'high-impact';
                badgeText = 'HIGH IMPACT';
            } else if (analytics.performance.costEfficiency > 85) {
                badgeClass = 'optimized';
                badgeText = 'OPTIMIZED';
            }
            
            return `
                <div class="product-intelligence-card" data-product-id="${product.id}">
                    <div class="intelligence-badge ${badgeClass}">${badgeText}</div>
                    
                    <div class="product-card-header">
                        <div class="product-info">
                            <div class="product-sku">${product.sku}</div>
                            <h4 class="product-name">${product.name}</h4>
                            <p class="product-category">${product.category}</p>
                        </div>
                        <div class="cost-indicator">
                            <span class="cost-value">${analytics.avgShippingCost.toFixed(2)}</span>
                            <div class="cost-trend ${costTrendClass}">
                                <i class="fas ${costTrendIcon}"></i>
                                ${Math.abs(analytics.costTrendPercentage).toFixed(1)}%
                            </div>
                        </div>
                    </div>
                    
                    <div class="product-metrics">
                        <div class="metric-item">
                            <span class="metric-label">Units Shipped</span>
                            <span class="metric-value">${analytics.totalUnitsShipped.toLocaleString()}</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">Shipments</span>
                            <span class="metric-value">${analytics.totalShipments}</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">Profit Impact</span>
                            <span class="metric-value ${analytics.profitImpact >= 0 ? 'positive' : 'negative'}">
                                ${analytics.profitImpact >= 0 ? '+' : ''}${(analytics.profitImpact / 1000).toFixed(0)}K
                            </span>
                        </div>
                    </div>
                    
                    <div class="product-actions">
                        <button class="sol-btn sol-btn-secondary" onclick="viewProductDetails('${product.id}')">
                            <i class="fas fa-chart-area"></i> Analytics
                        </button>
                        <button class="sol-btn sol-btn-primary" onclick="editProduct('${product.id}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="sol-btn sol-btn-glass" onclick="showProductMenu('${product.id}', event)">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // Nuovo metodo per la vista lista
    renderProductsList() {
        const products = this.getFilteredAndSortedProducts();
        
        if (products.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-search fa-3x text-muted"></i>
                    <h3>No products found</h3>
                    <p>Try adjusting your filters or search criteria</p>
                    <button class="sol-btn sol-btn-primary" onclick="window.productIntelligenceSystem.clearFilters()">
                        Clear Filters
                    </button>
                </div>
            `;
        }
        
        const tableHTML = `
            <div class="products-list-table">
                <table class="sol-table">
                    <thead>
                        <tr>
                            <th class="sortable" onclick="window.productIntelligenceSystem.sortProducts('sku')">
                                SKU ${this.getSortIcon('sku')}
                            </th>
                            <th class="sortable" onclick="window.productIntelligenceSystem.sortProducts('name')">
                                Product Name ${this.getSortIcon('name')}
                            </th>
                            <th class="sortable" onclick="window.productIntelligenceSystem.sortProducts('category')">
                                Category ${this.getSortIcon('category')}
                            </th>
                            <th class="sortable" onclick="window.productIntelligenceSystem.sortProducts('shippingCost')">
                                Avg Shipping Cost ${this.getSortIcon('shippingCost')}
                            </th>
                            <th class="sortable" onclick="window.productIntelligenceSystem.sortProducts('costTrend')">
                                Cost Trend ${this.getSortIcon('costTrend')}
                            </th>
                            <th class="sortable" onclick="window.productIntelligenceSystem.sortProducts('unitsShipped')">
                                Units Shipped ${this.getSortIcon('unitsShipped')}
                            </th>
                            <th class="sortable" onclick="window.productIntelligenceSystem.sortProducts('profitImpact')">
                                Profit Impact ${this.getSortIcon('profitImpact')}
                            </th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${products.map(product => this.renderProductRow(product)).join('')}
                    </tbody>
                </table>
            </div>
        `;
        
        return tableHTML;
    }
    
    // Metodo per renderizzare una singola riga
    renderProductRow(product) {
        const analytics = this.analytics[product.id] || this.getEmptyAnalytics();
        const costTrendIcon = analytics.costTrend === 'increasing' ? 'fa-arrow-up' : 
                             analytics.costTrend === 'decreasing' ? 'fa-arrow-down' : 'fa-minus';
        const costTrendClass = analytics.costTrend === 'increasing' ? 'negative' : 
                              analytics.costTrend === 'decreasing' ? 'positive' : 'stable';
        
        let statusBadge = 'TRACKED';
        let statusClass = 'sol-badge-secondary';
        
        if (Math.abs(analytics.profitImpact) > 10000) {
            statusBadge = 'HIGH IMPACT';
            statusClass = 'sol-badge-danger';
        } else if (analytics.performance.costEfficiency > 85) {
            statusBadge = 'OPTIMIZED';
            statusClass = 'sol-badge-success';
        }
        
        return `
            <tr data-product-id="${product.id}">
                <td class="font-mono">${product.sku}</td>
                <td>
                    <div class="product-name-cell">
                        <strong>${product.name}</strong>
                        ${product.description ? `<small class="text-muted">${product.description.substring(0, 50)}...</small>` : ''}
                    </div>
                </td>
                <td>
                    <span class="category-badge category-${product.category}">
                        ${product.category}
                    </span>
                </td>
                <td>
                    <strong>${analytics.avgShippingCost.toFixed(2)}</strong>
                </td>
                <td>
                    <div class="cost-trend-cell ${costTrendClass}">
                        <i class="fas ${costTrendIcon}"></i>
                        ${Math.abs(analytics.costTrendPercentage).toFixed(1)}%
                    </div>
                </td>
                <td class="text-right">
                    ${analytics.totalUnitsShipped.toLocaleString()}
                </td>
                <td>
                    <span class="profit-impact ${analytics.profitImpact >= 0 ? 'positive' : 'negative'}">
                        ${analytics.profitImpact >= 0 ? '+' : ''}${(analytics.profitImpact / 1000).toFixed(0)}K
                    </span>
                </td>
                <td>
                    <span class="sol-badge ${statusClass}">${statusBadge}</span>
                </td>
                <td>
                    <div class="table-actions">
                        <button class="sol-btn sol-btn-sm sol-btn-glass" 
                                onclick="viewProductDetails('${product.id}')" 
                                title="View Analytics">
                            <i class="fas fa-chart-area"></i>
                        </button>
                        <button class="sol-btn sol-btn-sm sol-btn-glass" 
                                onclick="editProduct('${product.id}')"
                                title="Edit Product">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="sol-btn sol-btn-sm sol-btn-glass" 
                                onclick="showProductMenu('${product.id}', event)"
                                title="More Options">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }
    
    // Add update method to ProductIntelligenceSystem
    updateProduct(productId) {
        const form = document.getElementById('productForm');
        if (!form || !form.checkValidity()) {
            this.showStatus('Please fill all required fields', 'error');
            return false;
        }
        
        const productIndex = this.products.findIndex(p => p.id === productId);
        if (productIndex === -1) {
            this.showStatus('Product not found', 'error');
            return false;
        }
        
        // Get form data
        const updatedData = {
            sku: document.getElementById('productSku').value.trim(),
            name: document.getElementById('productName').value.trim(),
            category: document.getElementById('productCategory').value,
            description: document.getElementById('productDescription').value.trim(),
            specifications: {
                weight: parseFloat(document.getElementById('productWeight').value),
                dimensions: {
                    length: parseFloat(document.getElementById('productLength').value),
                    width: parseFloat(document.getElementById('productWidth').value),
                    height: parseFloat(document.getElementById('productHeight').value)
                },
                value: parseFloat(document.getElementById('productValue').value),
                hsCode: document.getElementById('productHsCode').value.trim(),
                fragile: document.getElementById('productFragile').checked,
                hazardous: document.getElementById('productHazardous').checked
            },
            costTracking: {
                baseCost: parseFloat(document.getElementById('productBaseCost').value),
                targetMargin: parseFloat(document.getElementById('productMargin').value) / 100,
                shippingBudget: parseFloat(document.getElementById('productShippingBudget').value),
                currencyCode: 'USD',
                lastCostUpdate: new Date().toISOString()
            },
            updatedAt: new Date().toISOString()
        };
        
        // Calculate volume
        const { length, width, height } = updatedData.specifications.dimensions;
        updatedData.specifications.volume = (length * width * height) / 1000000; // cm³ to m³
        
        // Check for duplicate SKU (excluding current product)
        if (this.products.some((p, index) => p.sku === updatedData.sku && index !== productIndex)) {
            this.showStatus('SKU already exists', 'error');
            return false;
        }
        
        // Update product
        this.products[productIndex] = { ...this.products[productIndex], ...updatedData };
        
        // Save to localStorage
        localStorage.setItem('products', JSON.stringify(this.products));
        
        // Regenerate analytics
        this.analytics[productId] = this.calculateProductAnalytics(this.products[productIndex]);
        
        // Refresh UI
        this.renderIntelligenceStats();
        this.renderProducts();
        
        this.showStatus('Product updated successfully', 'success');
        return true;
    }
    
    // Add delete method to ProductIntelligenceSystem
    deleteProduct(productId) {
        const index = this.products.findIndex(p => p.id === productId);
        
        if (index === -1) {
            this.showStatus('Product not found', 'error');
            return;
        }
        
        // Remove from products array
        this.products.splice(index, 1);
        
        // Remove analytics
        delete this.analytics[productId];
        
        // Save to localStorage
        localStorage.setItem('products', JSON.stringify(this.products));
        
        // Refresh UI
        this.renderIntelligenceStats();
        this.renderProducts();
        
        this.showStatus('Product deleted successfully', 'success');
    }
}

// ===== GLOBAL FUNCTIONS FOR UI INTERACTIONS =====

window.productIntelligenceSystem = new ProductIntelligenceSystem();

// ===== GLOBAL FUNCTIONS & INITIALIZATION =====
// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {

    // 1. Creiamo UNA SOLA istanza del nostro sistema principale.
    const productSystem = new ProductIntelligenceSystem();

    // 2. Rendiamo le istanze disponibili a livello globale per l'HTML.
    window.productIntelligenceSystem = productSystem;
    window.importWizard = importWizard; // Usa l'istanza importata in cima al file.
    importWizard.setSupabaseClient(supabase);

    // 3. Avviamo il sistema principale. Non serve più il setTimeout.
    productSystem.init();
});


// Global functions for product actions
window.viewProductDetails = function(productId) {
    const product = window.productIntelligenceSystem.products.find(p => p.id === productId);
    const analytics = window.productIntelligenceSystem.analytics[productId];
    
    if (!product || !analytics) {
        console.error('Product not found:', productId);
        return;
    }
    
    if (!window.ModalSystem) {
        console.error('Modal system not available');
        return;
    }
    
    // Show detailed analytics modal
    const content = `
        <div class="product-details-modal">
            <div class="product-header">
                <h3>${product.name}</h3>
                <span class="product-sku">${product.sku}</span>
            </div>
            
            <div class="analytics-grid">
                <div class="analytics-section">
                    <h4>Shipping Analytics</h4>
                    <div class="metric-row">
                        <span>Total Shipments:</span>
                        <span>${analytics.totalShipments}</span>
                    </div>
                    <div class="metric-row">
                        <span>Units Shipped:</span>
                        <span>${analytics.totalUnitsShipped.toLocaleString()}</span>
                    </div>
                    <div class="metric-row">
                        <span>Avg Shipping Cost:</span>
                        <span>${analytics.avgShippingCost.toFixed(2)}</span>
                    </div>
                    <div class="metric-row">
                        <span>Cost Trend:</span>
                        <span class="${analytics.costTrend}">${analytics.costTrend} (${analytics.costTrendPercentage.toFixed(1)}%)</span>
                    </div>
                </div>
                
                <div class="analytics-section">
                    <h4>Route Intelligence</h4>
                    <div class="metric-row">
                        <span>Best Route:</span>
                        <span>${analytics.bestRoute}</span>
                    </div>
                    <div class="metric-row">
                        <span>Worst Route:</span>
                        <span>${analytics.worstRoute}</span>
                    </div>
                    <div class="metric-row">
                        <span>Profit Impact:</span>
                        <span class="${analytics.profitImpact >= 0 ? 'positive' : 'negative'}">
                            ${analytics.profitImpact >= 0 ? '+' : ''}${(analytics.profitImpact / 1000).toFixed(1)}K
                        </span>
                    </div>
                </div>
                
                <div class="analytics-section">
                    <h4>Performance Metrics</h4>
                    <div class="metric-row">
                        <span>Cost Efficiency:</span>
                        <span>${analytics.performance.costEfficiency.toFixed(0)}%</span>
                    </div>
                    <div class="metric-row">
                        <span>Route Optimization:</span>
                        <span>${analytics.performance.routeOptimization.toFixed(0)}%</span>
                    </div>
                    <div class="metric-row">
                        <span>Seasonal Optimization:</span>
                        <span>${analytics.performance.seasonalOptimization.toFixed(0)}%</span>
                    </div>
                </div>
            </div>
        </div>
        
        <style>
            .product-details-modal {
                padding: 1rem 0;
            }
            
            .product-header {
                text-align: center;
                margin-bottom: 2rem;
                padding-bottom: 1rem;
                border-bottom: 1px solid var(--sol-gray-200);
            }
            
            .product-header h3 {
                margin: 0 0 0.5rem;
                color: var(--sol-gray-900);
            }
            
            .product-sku {
                background: var(--sol-primary-light);
                color: var(--sol-primary-dark);
                padding: 0.25rem 0.75rem;
                border-radius: var(--sol-radius-sm);
                font-family: var(--sol-font-mono);
                font-size: 0.875rem;
            }
            
            .analytics-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 2rem;
            }
            
            .analytics-section h4 {
                margin: 0 0 1rem;
                color: var(--sol-gray-800);
                font-size: 1.125rem;
                border-bottom: 2px solid var(--sol-primary);
                padding-bottom: 0.5rem;
            }
            
            .metric-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0.75rem 0;
                border-bottom: 1px solid var(--sol-gray-100);
            }
            
            .metric-row:last-child {
                border-bottom: none;
            }
            
            .metric-row span:first-child {
                color: var(--sol-gray-600);
                font-weight: 500;
            }
            
            .metric-row span:last-child {
                font-weight: 600;
                color: var(--sol-gray-900);
            }
            
            .positive {
                color: var(--sol-success) !important;
            }
            
            .negative {
                color: var(--sol-danger) !important;
            }
            
            .increasing {
                color: var(--sol-danger) !important;
            }
            
            .decreasing {
                color: var(--sol-success) !important;
            }
            
            .stable {
                color: var(--sol-gray-600) !important;
            }
        </style>
    `;
    
    window.ModalSystem.show({
        title: 'Product Intelligence Details',
        content: content,
        size: 'lg',
        actions: [
            {
                label: 'Close',
                class: 'sol-btn-secondary',
                handler: () => true
            },
            {
                label: 'Edit Product',
                class: 'sol-btn-primary',
                handler: () => {
                    editProduct(productId);
                    return true;
                }
            }
        ]
    });
};

window.editProduct = function(productId) {
    const product = window.productIntelligenceSystem.products.find(p => p.id === productId);
    
    if (!product) {
        console.error('Product not found:', productId);
        return;
    }
    
    if (!window.ModalSystem) {
        console.error('Modal system not available');
        return;
    }
    
    window.ModalSystem.show({
        title: 'Edit Product',
        content: window.productIntelligenceSystem.getProductFormHTML(product),
        size: 'lg',
        actions: [
            {
                label: 'Cancel',
                class: 'sol-btn-secondary',
                handler: () => true
            },
            {
                label: 'Update Product',
                class: 'sol-btn-primary',
                handler: () => window.productIntelligenceSystem.updateProduct(productId)
            }
        ]
    });
};

window.showProductMenu = function(productId, event) {
    event.stopPropagation();

    const actions = [
        { label: 'View Details', handler: () => viewProductDetails(productId) },
        { label: 'Edit Product', handler: () => editProduct(productId) },
        { label: 'View Recommendations', handler: () => showProductRecommendations(productId) },
        { label: 'Export Data', handler: () => exportProductData(productId) },
        { separator: true },
        { label: 'Delete Product', handler: () => deleteProduct(productId), class: 'danger' }
    ];

    showContextMenu(actions, event);
};

window.showProductRecommendations = function(productId) {
    const recommendations = window.productIntelligenceSystem.recommendations.filter(r => r.productId === productId);
    
    if (recommendations.length === 0) {
        window.productIntelligenceSystem.showStatus('No recommendations for this product', 'info');
        return;
    }
    
    console.log('Recommendations for product:', productId, recommendations);
    window.productIntelligenceSystem.showStatus(`${recommendations.length} recommendations available`, 'info');
};

window.exportProductData = function(productId) {
    const product = window.productIntelligenceSystem.products.find(p => p.id === productId);
    const analytics = window.productIntelligenceSystem.analytics[productId];
    
    if (!product) return;
    
    const exportData = {
        product: product,
        analytics: analytics,
        exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `product-${product.sku}-analytics.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    window.productIntelligenceSystem.showStatus('Product data exported', 'success');
};

window.deleteProduct = function(productId) {
    if (!window.ModalSystem) {
        if (confirm('Are you sure you want to delete this product?')) {
            window.productIntelligenceSystem.deleteProduct(productId);
        }
        return;
    }
    
    window.ModalSystem.confirm({
        title: 'Delete Product',
        message: 'Are you sure you want to delete this product? This action cannot be undone.',
        confirmLabel: 'Delete',
        confirmClass: 'sol-btn-danger',
        onConfirm: () => {
            window.productIntelligenceSystem.deleteProduct(productId);
        }
    });
};

console.log('[ProductIntelligence] Product Intelligence System module loaded successfully');