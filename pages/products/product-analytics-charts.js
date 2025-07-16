// Product Analytics Charts - Cost Intelligence Visualizations
// Complete chart system for Product Intelligence Dashboard

class ProductAnalyticsCharts {
    constructor() {
        this.charts = {};
        this.chartColors = {
            primary: '#6366f1',
            success: '#10b981',
            warning: '#f59e0b',
            danger: '#ef4444',
            info: '#3b82f6',
            gray: '#6b7280'
        };
        
        this.init = this.init.bind(this);
        this.renderCostTrendsChart = this.renderCostTrendsChart.bind(this);
        this.renderCostBreakdownChart = this.renderCostBreakdownChart.bind(this);
        this.renderRouteComparisonTable = this.renderRouteComparisonTable.bind(this);
    }
    
    init() {
        console.log('[ProductAnalyticsCharts] Initializing chart system...');
        
        // Wait for DOM and Chart.js
        if (typeof Chart === 'undefined') {
            console.error('[ProductAnalyticsCharts] Chart.js not loaded');
            return;
        }
        
        // Set Chart.js defaults
        Chart.defaults.font.family = 'system-ui, -apple-system, sans-serif';
        Chart.defaults.color = '#6b7280';
        Chart.defaults.borderColor = '#e5e7eb';
        
        // Initialize charts when tab is shown
        this.initializeTabHandlers();
        
        console.log('[ProductAnalyticsCharts] Chart system initialized');
    }
    
    initializeTabHandlers() {
        // Listen for tab changes
        document.addEventListener('click', (e) => {
            if (e.target.matches('.sol-tab[data-section="cost-analytics"]')) {
                setTimeout(() => this.renderCostAnalyticsCharts(), 100);
            } else if (e.target.matches('.sol-tab[data-section="route-intelligence"]')) {
                setTimeout(() => this.renderRouteIntelligence(), 100);
            } else if (e.target.matches('.sol-tab[data-section="profit-impact"]')) {
                setTimeout(() => this.renderProfitImpactCharts(), 100);
            }
        });
    }
    
    renderCostAnalyticsCharts() {
        this.renderCostTrendsChart();
        this.renderCostBreakdownChart();
        this.renderMarginImpactAnalysis();
    }
    
    renderCostTrendsChart() {
        const canvas = document.getElementById('costTrendsChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');

        // Destroy existing chart
        const existing = Chart.getChart(canvas);
        if (existing) existing.destroy();
        
        // Get product intelligence system
        const productSystem = window.productIntelligenceSystem;
        if (!productSystem) return;
        
        // Prepare data
        const chartData = this.prepareCostTrendsData(productSystem.products, productSystem.analytics);
        
        this.charts.costTrends = new Chart(ctx, {
            type: 'line',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    title: {
                        display: false
                    },
                    legend: {
                        position: 'top',
                        align: 'end'
                    },
                    tooltip: {
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        titleColor: '#1f2937',
                        bodyColor: '#374151',
                        borderColor: '#e5e7eb',
                        borderWidth: 1,
                        displayColors: true,
                        callbacks: {
                            title: function(context) {
                                return 'Period: ' + context[0].label;
                            },
                            label: function(context) {
                                return context.dataset.label + ': $' + context.parsed.y.toFixed(2);
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        display: true,
                        grid: {
                            display: false
                        },
                        title: {
                            display: true,
                            text: 'Time Period'
                        }
                    },
                    y: {
                        display: true,
                        beginAtZero: true,
                        grid: {
                            color: '#f3f4f6'
                        },
                        title: {
                            display: true,
                            text: 'Cost per Unit (USD)'
                        },
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toFixed(2);
                            }
                        }
                    }
                },
                elements: {
                    line: {
                        tension: 0.4
                    },
                    point: {
                        radius: 4,
                        hoverRadius: 6
                    }
                }
            }
        });
    }
    
    prepareCostTrendsData(products, analytics) {
        // Generate sample time series data for the last 6 months
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        const colors = [
            this.chartColors.primary,
            this.chartColors.success,
            this.chartColors.warning,
            this.chartColors.info,
            this.chartColors.danger
        ];
        
        const datasets = products.slice(0, 5).map((product, index) => {
            const productAnalytics = analytics[product.id];
            const baseCost = productAnalytics?.avgShippingCost || 1;
            
            // Generate realistic cost trend data
            const data = months.map((month, monthIndex) => {
                const variation = (Math.random() - 0.5) * 0.4; // ±20% variation
                const trend = productAnalytics?.costTrendPercentage || 0;
                const trendFactor = 1 + (trend / 100) * (monthIndex / months.length);
                return baseCost * trendFactor * (1 + variation);
            });
            
            return {
                label: product.name.length > 20 ? product.name.substring(0, 17) + '...' : product.name,
                data: data,
                borderColor: colors[index % colors.length],
                backgroundColor: colors[index % colors.length] + '20',
                fill: false,
                tension: 0.4
            };
        });
        
        return {
            labels: months,
            datasets: datasets
        };
    }
    
    renderCostBreakdownChart() {
        const canvas = document.getElementById('costBreakdownChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');

        // Destroy existing chart
        const existing = Chart.getChart(canvas);
        if (existing) existing.destroy();
        
        // Sample cost breakdown data
        const breakdownData = {
            labels: ['Ocean Freight', 'Port Charges', 'Customs', 'Insurance', 'Documentation', 'Handling'],
            datasets: [{
                data: [60, 15, 10, 5, 5, 5],
                backgroundColor: [
                    this.chartColors.primary,
                    this.chartColors.info,
                    this.chartColors.warning,
                    this.chartColors.success,
                    this.chartColors.gray,
                    this.chartColors.danger
                ],
                borderWidth: 0,
                hoverBorderWidth: 2,
                hoverBorderColor: '#ffffff'
            }]
        };
        
        this.charts.costBreakdown = new Chart(ctx, {
            type: 'doughnut',
            data: breakdownData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 15,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        titleColor: '#1f2937',
                        bodyColor: '#374151',
                        borderColor: '#e5e7eb',
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                return context.label + ': ' + context.parsed + '%';
                            }
                        }
                    }
                },
                cutout: '60%',
                animation: {
                    animateRotate: true,
                    duration: 1000
                }
            }
        });
    }
    
    renderMarginImpactAnalysis() {
        const container = document.getElementById('marginImpactAnalysis');
        if (!container) return;
        
        const productSystem = window.productIntelligenceSystem;
        if (!productSystem) return;
        
        // Calculate margin impact for top products
        const marginData = productSystem.products.map(product => {
            const analytics = productSystem.analytics[product.id];
            const currentMargin = (product.specifications.value - product.costTracking.baseCost - analytics.avgShippingCost) / product.specifications.value;
            const targetMargin = product.costTracking.targetMargin;
            const marginGap = targetMargin - currentMargin;
            
            return {
                product: product,
                currentMargin: currentMargin,
                targetMargin: targetMargin,
                marginGap: marginGap,
                impact: marginGap * analytics.totalUnitsShipped * product.specifications.value
            };
        }).sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact)).slice(0, 5);
        
        const html = `
            <div class="margin-impact-list">
                ${marginData.map(item => `
                    <div class="margin-impact-item">
                        <div class="impact-product-info">
                            <h5>${item.product.name}</h5>
                            <span class="product-sku">${item.product.sku}</span>
                        </div>
                        <div class="impact-metrics">
                            <div class="impact-metric-row">
                                <span>Current Margin:</span>
                                <span class="${item.currentMargin >= item.targetMargin ? 'positive' : 'negative'}">
                                    ${(item.currentMargin * 100).toFixed(1)}%
                                </span>
                            </div>
                            <div class="impact-metric-row">
                                <span>Target Margin:</span>
                                <span>${(item.targetMargin * 100).toFixed(1)}%</span>
                            </div>
                            <div class="impact-metric-row">
                                <span>Gap Impact:</span>
                                <span class="${item.impact >= 0 ? 'positive' : 'negative'}">
                                    ${item.impact >= 0 ? '+' : ''}$${(item.impact / 1000).toFixed(0)}K
                                </span>
                            </div>
                        </div>
                        <div class="margin-progress">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${Math.min(100, Math.max(0, item.currentMargin / item.targetMargin * 100))}%"></div>
                            </div>
                            <span class="progress-label">${(item.currentMargin / item.targetMargin * 100).toFixed(0)}% of target</span>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <style>
                .margin-impact-list {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }
                
                .margin-impact-item {
                    padding: 1rem;
                    background: var(--sol-gray-50);
                    border-radius: var(--sol-radius-md);
                    border-left: 3px solid var(--sol-primary);
                }
                
                .impact-product-info h5 {
                    margin: 0 0 0.25rem;
                    color: var(--sol-gray-900);
                    font-size: 1rem;
                }
                
                .impact-product-info .product-sku {
                    font-family: var(--sol-font-mono);
                    font-size: 0.75rem;
                    color: var(--sol-gray-600);
                    background: var(--sol-gray-200);
                    padding: 0.125rem 0.5rem;
                    border-radius: var(--sol-radius-sm);
                }
                
                .impact-metrics {
                    margin: 1rem 0;
                }
                
                .impact-metric-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 0.5rem 0;
                    border-bottom: 1px solid var(--sol-gray-200);
                }
                
                .impact-metric-row:last-child {
                    border-bottom: none;
                }
                
                .impact-metric-row span:first-child {
                    color: var(--sol-gray-600);
                    font-weight: 500;
                }
                
                .impact-metric-row span:last-child {
                    font-weight: 600;
                }
                
                .margin-progress {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }
                
                .progress-bar {
                    flex: 1;
                    height: 8px;
                    background: var(--sol-gray-200);
                    border-radius: var(--sol-radius-full);
                    overflow: hidden;
                }
                
                .progress-fill {
                    height: 100%;
                    background: var(--sol-primary);
                    transition: width 0.3s ease;
                }
                
                .progress-label {
                    font-size: 0.75rem;
                    color: var(--sol-gray-600);
                    white-space: nowrap;
                }
                
                .positive {
                    color: var(--sol-success);
                }
                
                .negative {
                    color: var(--sol-danger);
                }
            </style>
        `;
        
        container.innerHTML = html;
    }
    
    renderRouteIntelligence() {
        this.renderRouteComparisonTable();
        this.renderRouteOptimizations();
    }
    
    renderRouteComparisonTable() {
        const container = document.getElementById('routeComparisonTable');
        if (!container) return;
        
        const productSystem = window.productIntelligenceSystem;
        if (!productSystem) return;
        
        // Prepare route comparison data
        const routeData = this.prepareRouteComparisonData(productSystem.products, productSystem.analytics);
        
        const html = `
            <div class="route-comparison-table">
                <table>
                    <thead>
                        <tr>
                            <th>Route</th>
                            <th>Products</th>
                            <th>Total Shipments</th>
                            <th>Avg Cost/Unit</th>
                            <th>Performance</th>
                            <th>Savings Potential</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${routeData.map(route => `
                            <tr>
                                <td>
                                    <strong>${route.route}</strong>
                                    <div style="font-size: 0.75rem; color: var(--sol-gray-600);">
                                        ${route.distance}km • ${route.transitTime} days
                                    </div>
                                </td>
                                <td>${route.productCount}</td>
                                <td>${route.totalShipments}</td>
                                <td>
                                    <span class="route-cost ${route.performance}">
                                        $${route.avgCost.toFixed(2)}
                                    </span>
                                </td>
                                <td>
                                    <span class="route-performance ${route.performance}">
                                        ${route.performance === 'best' ? '🏆 Best' : 
                                          route.performance === 'worst' ? '⚠️ Costly' : '✓ Good'}
                                    </span>
                                </td>
                                <td>
                                    ${route.savingsPotential > 0 ? 
                                        `<span class="savings-potential">$${route.savingsPotential.toFixed(2)}</span>` : 
                                        '-'
                                    }
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        
        container.innerHTML = html;
    }
    
    prepareRouteComparisonData(products, analytics) {
        // Aggregate route data from all products
        const routeStats = {};
        
        products.forEach(product => {
            const productAnalytics = analytics[product.id];
            if (productAnalytics.routeComparison) {
                Object.keys(productAnalytics.routeComparison).forEach(route => {
                    const routeData = productAnalytics.routeComparison[route];
                    
                    if (!routeStats[route]) {
                        routeStats[route] = {
                            route: route,
                            productCount: 0,
                            totalShipments: 0,
                            totalCost: 0,
                            totalUnits: 0,
                            products: new Set()
                        };
                    }
                    
                    routeStats[route].products.add(product.id);
                    routeStats[route].totalShipments += 1;
                    routeStats[route].totalCost += routeData.totalCost;
                    routeStats[route].totalUnits += routeData.totalUnits;
                });
            }
        });
        
        // Convert to array and calculate metrics
        const routeArray = Object.keys(routeStats).map(route => {
            const stats = routeStats[route];
            return {
                route: route,
                productCount: stats.products.size,
                totalShipments: stats.totalShipments,
                avgCost: stats.totalCost / stats.totalUnits,
                distance: Math.floor(Math.random() * 8000) + 2000, // Mock distance
                transitTime: Math.floor(Math.random() * 25) + 10 // Mock transit time
            };
        }).sort((a, b) => a.avgCost - b.avgCost);
        
        // Mark best and worst routes
        if (routeArray.length > 0) {
            routeArray[0].performance = 'best';
            if (routeArray.length > 1) {
                routeArray[routeArray.length - 1].performance = 'worst';
            }
            
            // Calculate savings potential
            const bestCost = routeArray[0].avgCost;
            routeArray.forEach(route => {
                route.savingsPotential = route.avgCost - bestCost;
                if (!route.performance) {
                    route.performance = 'good';
                }
            });
        }
        
        return routeArray;
    }
    
    renderRouteOptimizations() {
        const container = document.getElementById('routeOptimizations');
        if (!container) return;
        
        const productSystem = window.productIntelligenceSystem;
        if (!productSystem) return;
        
        // Get route optimization recommendations
        const routeRecommendations = productSystem.recommendations.filter(r => r.type === 'route_optimization');
        
        if (routeRecommendations.length === 0) {
            container.innerHTML = `
                <div class="optimization-empty">
                    <i class="fas fa-check-circle" style="color: var(--sol-success); font-size: 2rem; margin-bottom: 1rem;"></i>
                    <h4>All Routes Optimized</h4>
                    <p>No route optimization opportunities found. Your shipping routes are performing well!</p>
                </div>
            `;
            return;
        }
        
        const html = `
            <div class="route-optimizations-list">
                ${routeRecommendations.map(rec => `
                    <div class="optimization-card priority-${rec.priority}">
                        <div class="optimization-header">
                            <div class="optimization-info">
                                <h4>${rec.title}</h4>
                                <p>${rec.description}</p>
                            </div>
                            <div class="optimization-savings">
                                <span class="savings-amount">$${rec.potentialSaving.toFixed(2)}</span>
                                <span class="savings-label">per unit</span>
                            </div>
                        </div>
                        <div class="optimization-action">
                            <strong>Recommended Action:</strong> ${rec.action}
                        </div>
                        <div class="optimization-impact">
                            <strong>Annual Impact:</strong> 
                            <span class="impact-value positive">+$${(rec.estimatedImpact / 1000).toFixed(0)}K</span>
                        </div>
                        <div class="optimization-actions">
                            <button class="sol-btn sol-btn-primary sol-btn-sm" onclick="implementOptimization('${rec.id}')">
                                <i class="fas fa-check"></i> Implement
                            </button>
                            <button class="sol-btn sol-btn-secondary sol-btn-sm" onclick="dismissOptimization('${rec.id}')">
                                <i class="fas fa-times"></i> Dismiss
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <style>
                .optimization-empty {
                    text-align: center;
                    padding: 3rem 1rem;
                    color: var(--sol-gray-600);
                }
                
                .optimization-empty h4 {
                    margin: 0 0 0.5rem;
                    color: var(--sol-gray-800);
                }
                
                .route-optimizations-list {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }
                
                .optimization-card {
                    background: white;
                    border-radius: var(--sol-radius-lg);
                    border: 1px solid var(--sol-gray-200);
                    padding: 1.5rem;
                    border-left: 4px solid var(--sol-info);
                }
                
                .optimization-card.priority-high {
                    border-left-color: var(--sol-danger);
                }
                
                .optimization-card.priority-medium {
                    border-left-color: var(--sol-warning);
                }
                
                .optimization-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 1rem;
                }
                
                .optimization-info h4 {
                    margin: 0 0 0.5rem;
                    color: var(--sol-gray-900);
                }
                
                .optimization-info p {
                    margin: 0;
                    color: var(--sol-gray-600);
                    font-size: 0.875rem;
                }
                
                .optimization-savings {
                    text-align: right;
                }
                
                .savings-amount {
                    font-size: 1.25rem;
                    font-weight: 700;
                    color: var(--sol-success);
                    display: block;
                }
                
                .savings-label {
                    font-size: 0.75rem;
                    color: var(--sol-gray-600);
                }
                
                .optimization-action,
                .optimization-impact {
                    margin: 0.75rem 0;
                    font-size: 0.875rem;
                }
                
                .optimization-actions {
                    display: flex;
                    gap: 0.75rem;
                    margin-top: 1rem;
                    padding-top: 1rem;
                    border-top: 1px solid var(--sol-gray-100);
                }
                
                .impact-value.positive {
                    color: var(--sol-success);
                    font-weight: 600;
                }
            </style>
        `;
        
        container.innerHTML = html;
    }
    
    renderProfitImpactCharts() {
        this.renderProfitCalculator();
        this.renderHighImpactProducts();
    }
    
    renderProfitCalculator() {
        // Initialize profit calculator
        const calculateBtn = document.getElementById('calculateImpactBtn');
        if (calculateBtn) {
            calculateBtn.addEventListener('click', this.calculateProfitImpact.bind(this));
        }
        
        // Populate product select
        const productSelect = document.getElementById('profitProductSelect');
        if (productSelect && window.productIntelligenceSystem) {
            const products = window.productIntelligenceSystem.products;
            productSelect.innerHTML = '<option value="">Choose a product...</option>' +
                products.map(p => `<option value="${p.id}">${p.name} (${p.sku})</option>`).join('');
        }
        
        // Populate route filter
        const routeProductFilter = document.getElementById('routeProductFilter');
        if (routeProductFilter && window.productIntelligenceSystem) {
            const products = window.productIntelligenceSystem.products;
            routeProductFilter.innerHTML = '<option value="">All Products</option>' +
                products.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
        }
    }
    
    calculateProfitImpact() {
        const productId = document.getElementById('profitProductSelect')?.value;
        const monthlyVolume = parseInt(document.getElementById('monthlyVolume')?.value) || 0;
        const costScenario = parseInt(document.getElementById('costScenario')?.value) || 0;
        
        if (!productId || monthlyVolume <= 0) {
            window.productIntelligenceSystem?.showStatus('Please select a product and enter volume', 'error');
            return;
        }
        
        const productSystem = window.productIntelligenceSystem;
        const product = productSystem.products.find(p => p.id === productId);
        const analytics = productSystem.analytics[productId];
        
        if (!product || !analytics) return;
        
        // Calculate impact
        const currentShippingCost = analytics.avgShippingCost;
        const newShippingCost = currentShippingCost * (1 + costScenario / 100);
        const costDifference = newShippingCost - currentShippingCost;
        
        const monthlyImpact = costDifference * monthlyVolume;
        const annualImpact = monthlyImpact * 12;
        
        const currentMargin = (product.specifications.value - product.costTracking.baseCost - currentShippingCost) / product.specifications.value;
        const newMargin = (product.specifications.value - product.costTracking.baseCost - newShippingCost) / product.specifications.value;
        const marginChange = newMargin - currentMargin;
        
        // Show results
        const resultsContainer = document.getElementById('profitImpactResults');
        if (resultsContainer) {
            resultsContainer.style.display = 'block';
            resultsContainer.innerHTML = `
                <div class="profit-impact-results">
                    <h4>Impact Analysis for ${product.name}</h4>
                    
                    <div class="impact-metric">
                        <span class="impact-label">Current Shipping Cost:</span>
                        <span class="impact-value">$${currentShippingCost.toFixed(2)} per unit</span>
                    </div>
                    
                    <div class="impact-metric">
                        <span class="impact-label">New Shipping Cost (${costScenario > 0 ? '+' : ''}${costScenario}%):</span>
                        <span class="impact-value">$${newShippingCost.toFixed(2)} per unit</span>
                    </div>
                    
                    <div class="impact-metric">
                        <span class="impact-label">Cost Difference:</span>
                        <span class="impact-value ${costDifference >= 0 ? 'impact-negative' : 'impact-positive'}">
                            ${costDifference >= 0 ? '+' : ''}$${costDifference.toFixed(2)} per unit
                        </span>
                    </div>
                    
                    <div class="impact-metric">
                        <span class="impact-label">Monthly Impact (${monthlyVolume.toLocaleString()} units):</span>
                        <span class="impact-value ${monthlyImpact >= 0 ? 'impact-negative' : 'impact-positive'}">
                            ${monthlyImpact >= 0 ? '+' : ''}$${monthlyImpact.toLocaleString()}
                        </span>
                    </div>
                    
                    <div class="impact-metric">
                        <span class="impact-label">Annual Impact:</span>
                        <span class="impact-value ${annualImpact >= 0 ? 'impact-negative' : 'impact-positive'}">
                            ${annualImpact >= 0 ? '+' : ''}$${annualImpact.toLocaleString()}
                        </span>
                    </div>
                    
                    <div class="impact-metric">
                        <span class="impact-label">Margin Change:</span>
                        <span class="impact-value ${marginChange >= 0 ? 'impact-positive' : 'impact-negative'}">
                            ${marginChange >= 0 ? '+' : ''}${(marginChange * 100).toFixed(2)}%
                        </span>
                    </div>
                    
                    <div class="impact-summary">
                        <strong>Summary:</strong> 
                        ${costScenario > 0 ? 
                            `A ${costScenario}% increase in shipping costs would reduce annual profit by $${Math.abs(annualImpact).toLocaleString()}.` :
                            `A ${Math.abs(costScenario)}% reduction in shipping costs would increase annual profit by $${Math.abs(annualImpact).toLocaleString()}.`
                        }
                    </div>
                </div>
            `;
        }
    }
    
    renderHighImpactProducts() {
        const container = document.getElementById('highImpactProducts');
        if (!container) return;
        
        const productSystem = window.productIntelligenceSystem;
        if (!productSystem) return;
        
        // Calculate sensitivity for each product
        const impactData = productSystem.products.map(product => {
            const analytics = productSystem.analytics[product.id];
            const sensitivity = Math.abs(analytics.profitImpact) / analytics.totalUnitsShipped;
            
            return {
                product: product,
                analytics: analytics,
                sensitivity: sensitivity,
                riskLevel: sensitivity > 5 ? 'high' : sensitivity > 2 ? 'medium' : 'low'
            };
        }).sort((a, b) => b.sensitivity - a.sensitivity).slice(0, 5);
        
        const html = `
            <div class="high-impact-list">
                ${impactData.map(item => `
                    <div class="impact-product-item">
                        <div class="impact-product-info">
                            <h4>${item.product.name}</h4>
                            <p>${item.product.sku} • ${item.analytics.totalUnitsShipped.toLocaleString()} units shipped</p>
                        </div>
                        <div class="impact-sensitivity">
                            <span class="sensitivity-value">$${item.sensitivity.toFixed(2)}</span>
                            <span class="sensitivity-label">cost sensitivity</span>
                            <div class="risk-indicator risk-${item.riskLevel}">
                                ${item.riskLevel.toUpperCase()} RISK
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <style>
                .risk-indicator {
                    font-size: 0.6875rem;
                    font-weight: 600;
                    padding: 0.25rem 0.5rem;
                    border-radius: var(--sol-radius-sm);
                    text-align: center;
                    margin-top: 0.25rem;
                }
                
                .risk-high {
                    background: var(--sol-danger-light);
                    color: var(--sol-danger-dark);
                }
                
                .risk-medium {
                    background: var(--sol-warning-light);
                    color: var(--sol-warning-dark);
                }
                
                .risk-low {
                    background: var(--sol-success-light);
                    color: var(--sol-success-dark);
                }
            </style>
        `;
        
        container.innerHTML = html;
    }
    
    renderRecommendations() {
        const container = document.getElementById('recommendationsGrid');
        if (!container) return;
        
        const productSystem = window.productIntelligenceSystem;
        if (!productSystem) return;
        
        const recommendations = productSystem.recommendations;
        
        if (recommendations.length === 0) {
            container.innerHTML = `
                <div class="recommendations-empty">
                    <i class="fas fa-lightbulb" style="color: var(--sol-success); font-size: 3rem; margin-bottom: 1rem;"></i>
                    <h3>All Optimized!</h3>
                    <p>No recommendations available. Your supply chain is running efficiently!</p>
                </div>
            `;
            return;
        }
        
        const html = recommendations.map(rec => `
            <div class="recommendation-card ${rec.priority}-priority">
                <div class="recommendation-header">
                    <div class="recommendation-title">${rec.title}</div>
                    <div class="recommendation-priority priority-${rec.priority}">
                        ${rec.priority}
                    </div>
                </div>
                <div class="recommendation-content">
                    <div class="recommendation-type">${rec.type.replace('_', ' ')}</div>
                    <div class="recommendation-description">${rec.description}</div>
                    
                    ${rec.potentialSaving > 0 ? `
                        <div class="recommendation-savings">
                            <span class="savings-amount">${rec.potentialSaving.toFixed(2)}</span>
                            <span class="savings-label">potential saving per unit</span>
                        </div>
                    ` : ''}
                    
                    <div class="recommendation-actions">
                        <button class="sol-btn sol-btn-primary" onclick="implementRecommendation('${rec.id}')">
                            <i class="fas fa-check"></i> Implement
                        </button>
                        <button class="sol-btn sol-btn-secondary" onclick="dismissRecommendation('${rec.id}')">
                            <i class="fas fa-times"></i> Dismiss
                        </button>
                        <button class="sol-btn sol-btn-glass" onclick="viewRecommendationDetails('${rec.id}')">
                            <i class="fas fa-info-circle"></i> Details
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
        
        container.innerHTML = html;
        
        // Render actions tracker
        this.renderActionsTracker();
    }
    
    renderActionsTracker() {
        const container = document.getElementById('actionsTracker');
        if (!container) return;
        
        // Get implemented and dismissed recommendations from localStorage
        const implementedActions = JSON.parse(localStorage.getItem('implementedRecommendations') || '[]');
        const dismissedActions = JSON.parse(localStorage.getItem('dismissedRecommendations') || '[]');
        
        const html = `
            <div class="actions-tracker">
                <div class="tracker-stats">
                    <div class="tracker-stat">
                        <span class="stat-value">${implementedActions.length}</span>
                        <span class="stat-label">Implemented</span>
                    </div>
                    <div class="tracker-stat">
                        <span class="stat-value">${dismissedActions.length}</span>
                        <span class="stat-label">Dismissed</span>
                    </div>
                    <div class="tracker-stat">
                        <span class="stat-value">
                            ${implementedActions.reduce((sum, action) => sum + (action.estimatedSavings || 0), 0).toLocaleString()}
                        </span>
                        <span class="stat-label">Est. Annual Savings</span>
                    </div>
                </div>
                
                ${implementedActions.length > 0 ? `
                    <div class="implemented-actions">
                        <h5>Recently Implemented</h5>
                        ${implementedActions.slice(-3).map(action => `
                            <div class="action-item implemented">
                                <div class="action-info">
                                    <span class="action-title">${action.title}</span>
                                    <span class="action-date">${new Date(action.implementedAt).toLocaleDateString()}</span>
                                </div>
                                <span class="action-status success">
                                    <i class="fas fa-check-circle"></i> Implemented
                                </span>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
            
            <style>
                .actions-tracker {
                    padding: 1rem 0;
                }
                
                .tracker-stats {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 1rem;
                    margin-bottom: 2rem;
                    padding: 1rem;
                    background: var(--sol-gray-50);
                    border-radius: var(--sol-radius-md);
                }
                
                .tracker-stat {
                    text-align: center;
                }
                
                .tracker-stat .stat-value {
                    display: block;
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: var(--sol-gray-900);
                }
                
                .tracker-stat .stat-label {
                    font-size: 0.875rem;
                    color: var(--sol-gray-600);
                }
                
                .implemented-actions h5 {
                    margin: 0 0 1rem;
                    color: var(--sol-gray-800);
                }
                
                .action-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 0.75rem;
                    background: white;
                    border-radius: var(--sol-radius-md);
                    border: 1px solid var(--sol-gray-200);
                    margin-bottom: 0.5rem;
                }
                
                .action-info .action-title {
                    display: block;
                    font-weight: 500;
                    color: var(--sol-gray-900);
                }
                
                .action-info .action-date {
                    font-size: 0.75rem;
                    color: var(--sol-gray-600);
                }
                
                .action-status.success {
                    color: var(--sol-success);
                    font-size: 0.875rem;
                    font-weight: 600;
                }
                
                .recommendations-empty {
                    text-align: center;
                    padding: 3rem 1rem;
                    grid-column: 1 / -1;
                }
                
                .recommendations-empty h3 {
                    margin: 0 0 0.5rem;
                    color: var(--sol-gray-800);
                }
                
                .recommendations-empty p {
                    margin: 0;
                    color: var(--sol-gray-600);
                }
            </style>
        `;
        
        container.innerHTML = html;
    }
    
    destroy() {
        // Destroy all charts
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        this.charts = {};
    }
}

// ===== GLOBAL RECOMMENDATION ACTIONS =====

window.implementRecommendation = function(recommendationId) {
    const productSystem = window.productIntelligenceSystem;
    if (!productSystem) return;
    
    const recommendation = productSystem.recommendations.find(r => r.id === recommendationId);
    if (!recommendation) return;
    
    // Add to implemented actions
    const implementedActions = JSON.parse(localStorage.getItem('implementedRecommendations') || '[]');
    implementedActions.push({
        ...recommendation,
        implementedAt: new Date().toISOString(),
        estimatedSavings: recommendation.estimatedImpact || 0
    });
    localStorage.setItem('implementedRecommendations', JSON.stringify(implementedActions));
    
    // Remove from active recommendations
    const index = productSystem.recommendations.findIndex(r => r.id === recommendationId);
    if (index > -1) {
        productSystem.recommendations.splice(index, 1);
    }
    
    // Refresh UI
    if (window.productAnalyticsCharts) {
        window.productAnalyticsCharts.renderRecommendations();
    }
    
    productSystem.showStatus('Recommendation marked as implemented', 'success');
};

window.dismissRecommendation = function(recommendationId) {
    const productSystem = window.productIntelligenceSystem;
    if (!productSystem) return;
    
    const recommendation = productSystem.recommendations.find(r => r.id === recommendationId);
    if (!recommendation) return;
    
    // Add to dismissed actions
    const dismissedActions = JSON.parse(localStorage.getItem('dismissedRecommendations') || '[]');
    dismissedActions.push({
        ...recommendation,
        dismissedAt: new Date().toISOString()
    });
    localStorage.setItem('dismissedRecommendations', JSON.stringify(dismissedActions));
    
    // Remove from active recommendations
    const index = productSystem.recommendations.findIndex(r => r.id === recommendationId);
    if (index > -1) {
        productSystem.recommendations.splice(index, 1);
    }
    
    // Refresh UI
    if (window.productAnalyticsCharts) {
        window.productAnalyticsCharts.renderRecommendations();
    }
    
    productSystem.showStatus('Recommendation dismissed', 'info');
};

window.viewRecommendationDetails = function(recommendationId) {
    const productSystem = window.productIntelligenceSystem;
    if (!productSystem) return;
    
    const recommendation = productSystem.recommendations.find(r => r.id === recommendationId);
    if (!recommendation) return;
    
    if (!window.ModalSystem) {
        console.log('Recommendation details:', recommendation);
        return;
    }
    
    const content = `
        <div class="recommendation-details">
            <div class="detail-section">
                <h4>Recommendation Details</h4>
                <div class="detail-row">
                    <span>Type:</span>
                    <span>${recommendation.type.replace('_', ' ').toUpperCase()}</span>
                </div>
                <div class="detail-row">
                    <span>Priority:</span>
                    <span class="priority-${recommendation.priority}">${recommendation.priority.toUpperCase()}</span>
                </div>
                <div class="detail-row">
                    <span>Product:</span>
                    <span>${recommendation.productName}</span>
                </div>
                <div class="detail-row">
                    <span>Description:</span>
                    <span>${recommendation.description}</span>
                </div>
            </div>
            
            <div class="detail-section">
                <h4>Financial Impact</h4>
                <div class="detail-row">
                    <span>Potential Saving per Unit:</span>
                    <span class="positive">${recommendation.potentialSaving.toFixed(2)}</span>
                </div>
                <div class="detail-row">
                    <span>Estimated Annual Impact:</span>
                    <span class="positive">${(recommendation.estimatedImpact / 1000).toFixed(0)}K</span>
                </div>
            </div>
            
            <div class="detail-section">
                <h4>Recommended Action</h4>
                <p style="background: var(--sol-gray-50); padding: 1rem; border-radius: var(--sol-radius-md); margin: 0;">
                    ${recommendation.action}
                </p>
            </div>
        </div>
        
        <style>
            .recommendation-details {
                padding: 1rem 0;
            }
            
            .detail-section {
                margin-bottom: 2rem;
            }
            
            .detail-section h4 {
                margin: 0 0 1rem;
                color: var(--sol-gray-800);
                border-bottom: 2px solid var(--sol-primary);
                padding-bottom: 0.5rem;
            }
            
            .detail-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0.5rem 0;
                border-bottom: 1px solid var(--sol-gray-100);
            }
            
            .detail-row:last-child {
                border-bottom: none;
            }
            
            .detail-row span:first-child {
                font-weight: 500;
                color: var(--sol-gray-600);
            }
            
            .detail-row span:last-child {
                font-weight: 600;
                color: var(--sol-gray-900);
            }
            
            .positive {
                color: var(--sol-success) !important;
            }
            
            .priority-high {
                color: var(--sol-danger) !important;
            }
            
            .priority-medium {
                color: var(--sol-warning) !important;
            }
            
            .priority-low {
                color: var(--sol-info) !important;
            }
        </style>
    `;
    
    window.ModalSystem.show({
        title: 'Recommendation Details',
        content: content,
        size: 'md',
        actions: [
            {
                label: 'Close',
                class: 'sol-btn-secondary',
                handler: () => true
            },
            {
                label: 'Implement',
                class: 'sol-btn-primary',
                handler: () => {
                    implementRecommendation(recommendationId);
                    return true;
                }
            }
        ]
    });
};

// Similar functions for route optimization
window.implementOptimization = function(optimizationId) {
    console.log('Implementing optimization:', optimizationId);
    window.productIntelligenceSystem?.showStatus('Route optimization implemented', 'success');
};

window.dismissOptimization = function(optimizationId) {
    console.log('Dismissing optimization:', optimizationId);
    window.productIntelligenceSystem?.showStatus('Route optimization dismissed', 'info');
};

// ===== INITIALIZE CHARTS SYSTEM =====

// Create global instance
window.productAnalyticsCharts = new ProductAnalyticsCharts();

// Initialize when DOM is ready and after product system
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.productAnalyticsCharts) {
            window.productAnalyticsCharts.init();
        }
    }, 1500); // Wait for product system to initialize first
});

// Also render recommendations when switching to that tab
document.addEventListener('click', (e) => {
    if (e.target.matches('.sol-tab[data-section="recommendations"]')) {
        setTimeout(() => {
            if (window.productAnalyticsCharts) {
                window.productAnalyticsCharts.renderRecommendations();
            }
        }, 100);
    }
});

console.log('[ProductAnalyticsCharts] Product Analytics Charts system loaded successfully');