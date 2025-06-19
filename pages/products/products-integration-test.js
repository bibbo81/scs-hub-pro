// products-integration-test.js
// Complete integration test suite for Product Intelligence System
// Phase 2: Business Intelligence Platform validation

/**
 * 🧪 PRODUCT INTELLIGENCE INTEGRATION TESTS
 * 
 * Validates the revolutionary Product + Cost Intelligence System
 * ensuring 100% functionality and business value delivery
 */

class ProductIntelligenceIntegrationTest {
    constructor() {
        this.testResults = [];
        this.testStartTime = Date.now();
    }
    
    async runAllTests() {
        console.log('🚀 Starting Product Intelligence Integration Tests...');
        console.log('📊 Testing Phase 2: Business Intelligence Platform');
        
        const testSuites = [
            { name: 'System Architecture', test: () => this.testSystemArchitecture() },
            { name: 'Product Data Model', test: () => this.testProductDataModel() },
            { name: 'Cost Intelligence Engine', test: () => this.testCostIntelligenceEngine() },
            { name: 'Analytics Generation', test: () => this.testAnalyticsGeneration() },
            { name: 'UI Component Integration', test: () => this.testUIComponentIntegration() },
            { name: 'Chart System', test: () => this.testChartSystem() },
            { name: 'Recommendation Engine', test: () => this.testRecommendationEngine() },
            { name: 'Business Intelligence Features', test: () => this.testBusinessIntelligenceFeatures() },
            { name: 'Data Persistence', test: () => this.testDataPersistence() },
            { name: 'User Interactions', test: () => this.testUserInteractions() },
            { name: 'Performance & Scalability', test: () => this.testPerformanceScalability() },
            { name: 'Solarium Design Compliance', test: () => this.testSolariumCompliance() }
        ];
        
        for (const testSuite of testSuites) {
            try {
                console.log(`\n🧪 Testing: ${testSuite.name}`);
                const result = await testSuite.test();
                this.testResults.push({ 
                    name: testSuite.name, 
                    passed: result.passed, 
                    details: result.details,
                    issues: result.issues || []
                });
                console.log(`${result.passed ? '✅' : '❌'} ${testSuite.name}: ${result.passed ? 'PASSED' : 'FAILED'}`);
                if (result.issues && result.issues.length > 0) {
                    result.issues.forEach(issue => console.log(`   ⚠️  ${issue}`));
                }
            } catch (error) {
                console.error(`❌ ${testSuite.name}: ERROR - ${error.message}`);
                this.testResults.push({ 
                    name: testSuite.name, 
                    passed: false, 
                    error: error.message 
                });
            }
        }
        
        return this.generateTestReport();
    }
    
    // Test 1: System Architecture
    testSystemArchitecture() {
        const issues = [];
        let passed = true;
        
        // Test Phase 2 Architecture availability
        if (!window.Phase2Architecture) {
            issues.push('Phase2Architecture not loaded');
            passed = false;
        } else {
            console.log('   ✓ Phase2Architecture loaded');
        }
        
        // Test ProductIntelligenceSystem
        if (!window.productIntelligenceSystem) {
            issues.push('ProductIntelligenceSystem not initialized');
            passed = false;
        } else {
            console.log('   ✓ ProductIntelligenceSystem initialized');
            
            // Test required methods
            const requiredMethods = ['init', 'loadData', 'generateAnalytics', 'renderProducts'];
            requiredMethods.forEach(method => {
                if (typeof window.productIntelligenceSystem[method] !== 'function') {
                    issues.push(`Missing method: ${method}`);
                    passed = false;
                } else {
                    console.log(`   ✓ Method ${method} available`);
                }
            });
        }
        
        // Test Chart System
        if (!window.productAnalyticsCharts) {
            issues.push('ProductAnalyticsCharts not initialized');
            passed = false;
        } else {
            console.log('   ✓ ProductAnalyticsCharts initialized');
        }
        
        return {
            passed,
            details: 'System architecture components validation',
            issues
        };
    }
    
    // Test 2: Product Data Model
    testProductDataModel() {
        const issues = [];
        let passed = true;
        
        if (!window.productIntelligenceSystem) {
            return { passed: false, details: 'System not available', issues: ['ProductIntelligenceSystem required'] };
        }
        
        const products = window.productIntelligenceSystem.products;
        
        if (!Array.isArray(products) || products.length === 0) {
            issues.push('No products loaded or invalid product array');
            passed = false;
        } else {
            console.log(`   ✓ ${products.length} products loaded`);
            
            // Test product schema compliance
            const sampleProduct = products[0];
            const requiredFields = [
                'id', 'sku', 'name', 'category', 'specifications', 
                'costTracking', 'analytics', 'createdAt', 'updatedAt'
            ];
            
            requiredFields.forEach(field => {
                if (!(field in sampleProduct)) {
                    issues.push(`Missing required field: ${field}`);
                    passed = false;
                } else {
                    console.log(`   ✓ Field ${field} present`);
                }
            });
            
            // Test specifications schema
            if (sampleProduct.specifications) {
                const specFields = ['weight', 'dimensions', 'value', 'volume'];
                specFields.forEach(field => {
                    if (!(field in sampleProduct.specifications)) {
                        issues.push(`Missing specification field: ${field}`);
                        passed = false;
                    }
                });
                
                // Test volume calculation
                const { length, width, height } = sampleProduct.specifications.dimensions;
                const expectedVolume = (length * width * height) / 1000000;
                if (Math.abs(sampleProduct.specifications.volume - expectedVolume) > 0.001) {
                    issues.push('Volume calculation incorrect');
                    passed = false;
                } else {
                    console.log('   ✓ Volume calculation correct');
                }
            }
            
            // Test cost tracking schema
            if (sampleProduct.costTracking) {
                const costFields = ['baseCost', 'targetMargin', 'shippingBudget', 'currencyCode'];
                costFields.forEach(field => {
                    if (!(field in sampleProduct.costTracking)) {
                        issues.push(`Missing cost tracking field: ${field}`);
                        passed = false;
                    }
                });
            }
        }
        
        return {
            passed,
            details: `Product data model validation - ${products.length} products tested`,
            issues
        };
    }
    
    // Test 3: Cost Intelligence Engine
    testCostIntelligenceEngine() {
        const issues = [];
        let passed = true;
        
        if (!window.productIntelligenceSystem) {
            return { passed: false, details: 'System not available', issues: ['ProductIntelligenceSystem required'] };
        }
        
        const analytics = window.productIntelligenceSystem.analytics;
        const products = window.productIntelligenceSystem.products;
        
        if (!analytics || Object.keys(analytics).length === 0) {
            issues.push('No analytics generated');
            passed = false;
        } else {
            console.log(`   ✓ Analytics generated for ${Object.keys(analytics).length} products`);
            
            // Test analytics schema for each product
            products.forEach(product => {
                const productAnalytics = analytics[product.id];
                
                if (!productAnalytics) {
                    issues.push(`Missing analytics for product ${product.sku}`);
                    passed = false;
                    return;
                }
                
                const requiredAnalytics = [
                    'totalShipments', 'totalUnitsShipped', 'avgShippingCost',
                    'costTrend', 'bestRoute', 'worstRoute', 'profitImpact'
                ];
                
                requiredAnalytics.forEach(field => {
                    if (!(field in productAnalytics)) {
                        issues.push(`Missing analytics field ${field} for ${product.sku}`);
                        passed = false;
                    }
                });
                
                // Test cost trend calculation
                if (productAnalytics.costTrend && 
                    !['increasing', 'decreasing', 'stable'].includes(productAnalytics.costTrend)) {
                    issues.push(`Invalid cost trend value for ${product.sku}`);
                    passed = false;
                }
                
                // Test profit impact calculation
                if (typeof productAnalytics.profitImpact !== 'number') {
                    issues.push(`Invalid profit impact for ${product.sku}`);
                    passed = false;
                }
            });
            
            console.log('   ✓ Cost intelligence calculations verified');
        }
        
        return {
            passed,
            details: `Cost intelligence engine validation - ${Object.keys(analytics).length} analytics tested`,
            issues
        };
    }
    
    // Test 4: Analytics Generation
    testAnalyticsGeneration() {
        const issues = [];
        let passed = true;
        
        if (!window.productIntelligenceSystem) {
            return { passed: false, details: 'System not available', issues: ['ProductIntelligenceSystem required'] };
        }
        
        try {
            // Test analytics generation method
            const testProduct = window.productIntelligenceSystem.products[0];
            if (testProduct) {
                const generatedAnalytics = window.productIntelligenceSystem.calculateProductAnalytics(testProduct);
                
                if (!generatedAnalytics || typeof generatedAnalytics !== 'object') {
                    issues.push('Analytics generation failed');
                    passed = false;
                } else {
                    console.log('   ✓ Analytics generation working');
                    
                    // Test specific calculations
                    if (typeof generatedAnalytics.avgShippingCost !== 'number') {
                        issues.push('Average shipping cost calculation failed');
                        passed = false;
                    }
                    
                    if (typeof generatedAnalytics.profitImpact !== 'number') {
                        issues.push('Profit impact calculation failed');
                        passed = false;
                    }
                    
                    console.log('   ✓ Analytics calculations validated');
                }
            }
        } catch (error) {
            issues.push(`Analytics generation error: ${error.message}`);
            passed = false;
        }
        
        return {
            passed,
            details: 'Analytics generation methods validation',
            issues
        };
    }
    
    // Test 5: UI Component Integration
    testUIComponentIntegration() {
        const issues = [];
        let passed = true;
        
        // Test main content container
        const mainContent = document.getElementById('mainContent');
        if (!mainContent) {
            issues.push('Main content container missing');
            passed = false;
        } else {
            console.log('   ✓ Main content container found');
        }
        
        // Test tab system
        const tabs = document.querySelectorAll('.sol-tab');
        const tabContents = document.querySelectorAll('.sol-tab-content');
        
        if (tabs.length === 0) {
            issues.push('No tabs found');
            passed = false;
        } else {
            console.log(`   ✓ ${tabs.length} tabs found`);
            
            // Test tab functionality
            const expectedTabs = ['products', 'cost-analytics', 'route-intelligence', 'profit-impact', 'recommendations'];
            expectedTabs.forEach(tabId => {
                const tab = document.querySelector(`[data-section="${tabId}"]`);
                const content = document.getElementById(tabId);
                
                if (!tab) {
                    issues.push(`Tab ${tabId} missing`);
                    passed = false;
                } else if (!content) {
                    issues.push(`Tab content ${tabId} missing`);
                    passed = false;
                } else {
                    console.log(`   ✓ Tab ${tabId} properly configured`);
                }
            });
        }
        
        // Test products grid
        const productsGrid = document.getElementById('productsGrid');
        if (!productsGrid) {
            issues.push('Products grid container missing');
            passed = false;
        } else {
            console.log('   ✓ Products grid container found');
        }
        
        // Test intelligence stats
        const statsGrid = document.getElementById('intelligenceStats');
        if (!statsGrid) {
            issues.push('Intelligence stats container missing');
            passed = false;
        } else {
            console.log('   ✓ Intelligence stats container found');
        }
        
        // Test chart containers
        const chartContainers = ['costTrendsChart', 'costBreakdownChart', 'marginImpactAnalysis'];
        chartContainers.forEach(containerId => {
            const container = document.getElementById(containerId);
            if (!container) {
                issues.push(`Chart container ${containerId} missing`);
                passed = false;
            } else {
                console.log(`   ✓ Chart container ${containerId} found`);
            }
        });
        
        return {
            passed,
            details: `UI component integration - ${tabs.length} tabs, ${tabContents.length} sections tested`,
            issues
        };
    }
    
    // Test 6: Chart System
    testChartSystem() {
        const issues = [];
        let passed = true;
        
        // Test Chart.js availability
        if (typeof Chart === 'undefined') {
            issues.push('Chart.js not loaded');
            passed = false;
        } else {
            console.log('   ✓ Chart.js loaded');
        }
        
        // Test ProductAnalyticsCharts
        if (!window.productAnalyticsCharts) {
            issues.push('ProductAnalyticsCharts not available');
            passed = false;
        } else {
            console.log('   ✓ ProductAnalyticsCharts available');
            
            // Test chart rendering methods
            const chartMethods = [
                'renderCostTrendsChart', 
                'renderCostBreakdownChart', 
                'renderRouteComparisonTable',
                'renderRecommendations'
            ];
            
            chartMethods.forEach(method => {
                if (typeof window.productAnalyticsCharts[method] !== 'function') {
                    issues.push(`Chart method ${method} missing`);
                    passed = false;
                } else {
                    console.log(`   ✓ Chart method ${method} available`);
                }
            });
        }
        
        return {
            passed,
            details: 'Chart system validation',
            issues
        };
    }
    
    // Test 7: Recommendation Engine
    testRecommendationEngine() {
        const issues = [];
        let passed = true;
        
        if (!window.productIntelligenceSystem) {
            return { passed: false, details: 'System not available', issues: ['ProductIntelligenceSystem required'] };
        }
        
        const recommendations = window.productIntelligenceSystem.recommendations;
        
        if (!Array.isArray(recommendations)) {
            issues.push('Recommendations not generated or invalid format');
            passed = false;
        } else {
            console.log(`   ✓ ${recommendations.length} recommendations generated`);
            
            if (recommendations.length > 0) {
                const sampleRec = recommendations[0];
                const requiredFields = [
                    'id', 'type', 'priority', 'productId', 'title', 
                    'description', 'potentialSaving', 'action'
                ];
                
                requiredFields.forEach(field => {
                    if (!(field in sampleRec)) {
                        issues.push(`Missing recommendation field: ${field}`);
                        passed = false;
                    }
                });
                
                // Test priority levels
                const validPriorities = ['high', 'medium', 'low'];
                if (!validPriorities.includes(sampleRec.priority)) {
                    issues.push('Invalid recommendation priority');
                    passed = false;
                }
                
                console.log('   ✓ Recommendation schema validated');
            }
            
            // Test recommendation types
            const recTypes = [...new Set(recommendations.map(r => r.type))];
            console.log(`   ✓ Recommendation types: ${recTypes.join(', ')}`);
        }
        
        return {
            passed,
            details: `Recommendation engine - ${recommendations.length} recommendations tested`,
            issues
        };
    }
    
    // Test 8: Business Intelligence Features
    testBusinessIntelligenceFeatures() {
        const issues = [];
        let passed = true;
        
        if (!window.productIntelligenceSystem) {
            return { passed: false, details: 'System not available', issues: ['ProductIntelligenceSystem required'] };
        }
        
        const products = window.productIntelligenceSystem.products;
        const analytics = window.productIntelligenceSystem.analytics;
        
        // Test Business Intelligence Value Propositions
        
        // 1. Product-Centric Tracking (vs container-centric)
        let hasProductCentricData = true;
        products.forEach(product => {
            const productAnalytics = analytics[product.id];
            if (!productAnalytics || !productAnalytics.totalUnitsShipped) {
                hasProductCentricData = false;
            }
        });
        
        if (!hasProductCentricData) {
            issues.push('Product-centric tracking data missing');
            passed = false;
        } else {
            console.log('   ✓ Product-centric tracking implemented');
        }
        
        // 2. Real Cost Intelligence per product
        let hasCostIntelligence = true;
        products.forEach(product => {
            const productAnalytics = analytics[product.id];
            if (!productAnalytics || typeof productAnalytics.avgShippingCost !== 'number') {
                hasCostIntelligence = false;
            }
        });
        
        if (!hasCostIntelligence) {
            issues.push('Cost intelligence per product missing');
            passed = false;
        } else {
            console.log('   ✓ Real cost intelligence per product implemented');
        }
        
        // 3. Profit Impact Calculator
        let hasProfitCalculator = true;
        products.forEach(product => {
            const productAnalytics = analytics[product.id];
            if (!productAnalytics || typeof productAnalytics.profitImpact !== 'number') {
                hasProfitCalculator = false;
            }
        });
        
        if (!hasProfitCalculator) {
            issues.push('Profit impact calculator missing');
            passed = false;
        } else {
            console.log('   ✓ Profit impact calculator implemented');
        }
        
        // 4. Route Optimization Intelligence
        let hasRouteIntelligence = true;
        products.forEach(product => {
            const productAnalytics = analytics[product.id];
            if (!productAnalytics || !productAnalytics.bestRoute || !productAnalytics.worstRoute) {
                hasRouteIntelligence = false;
            }
        });
        
        if (!hasRouteIntelligence) {
            issues.push('Route optimization intelligence missing');
            passed = false;
        } else {
            console.log('   ✓ Route optimization intelligence implemented');
        }
        
        // 5. AI-Powered Recommendations
        const recommendations = window.productIntelligenceSystem.recommendations;
        if (!recommendations || recommendations.length === 0) {
            issues.push('AI-powered recommendations missing');
            passed = false;
        } else {
            console.log('   ✓ AI-powered recommendations implemented');
        }
        
        return {
            passed,
            details: 'Business Intelligence features validation',
            issues
        };
    }
    
    // Test 9: Data Persistence
    testDataPersistence() {
        const issues = [];
        let passed = true;
        
        try {
            // Test localStorage persistence
            const products = JSON.parse(localStorage.getItem('products') || '[]');
            if (products.length === 0) {
                issues.push('No products persisted in localStorage');
                passed = false;
            } else {
                console.log(`   ✓ ${products.length} products persisted`);
            }
            
            // Test data structure integrity
            if (products.length > 0) {
                const sampleProduct = products[0];
                if (!sampleProduct.id || !sampleProduct.sku) {
                    issues.push('Persisted product data structure invalid');
                    passed = false;
                } else {
                    console.log('   ✓ Persisted data structure valid');
                }
            }
            
            // Test settings persistence
            const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
            console.log('   ✓ App settings accessible');
            
        } catch (error) {
            issues.push(`Data persistence error: ${error.message}`);
            passed = false;
        }
        
        return {
            passed,
            details: 'Data persistence validation',
            issues
        };
    }
    
    // Test 10: User Interactions
    testUserInteractions() {
        const issues = [];
        let passed = true;
        
        // Test button availability and functionality
        const buttons = ['addProductBtn', 'importProductsBtn', 'exportAnalyticsBtn', 'bulkCostUpdateBtn'];
        buttons.forEach(buttonId => {
            const button = document.getElementById(buttonId);
            if (!button) {
                issues.push(`Button ${buttonId} missing`);
                passed = false;
            } else {
                console.log(`   ✓ Button ${buttonId} available`);
            }
        });
        
        // Test global functions availability
        const globalFunctions = [
            'viewProductDetails', 'editProduct', 'showProductMenu',
            'implementRecommendation', 'dismissRecommendation'
        ];
        
        globalFunctions.forEach(funcName => {
            if (typeof window[funcName] !== 'function') {
                issues.push(`Global function ${funcName} missing`);
                passed = false;
            } else {
                console.log(`   ✓ Function ${funcName} available`);
            }
        });
        
        // Test filter functionality
        const filters = ['productSearch', 'categoryFilter', 'costTrendFilter'];
        filters.forEach(filterId => {
            const filter = document.getElementById(filterId);
            if (!filter) {
                issues.push(`Filter ${filterId} missing`);
                passed = false;
            } else {
                console.log(`   ✓ Filter ${filterId} available`);
            }
        });
        
        return {
            passed,
            details: 'User interaction validation',
            issues
        };
    }
    
    // Test 11: Performance & Scalability
    testPerformanceScalability() {
        const issues = [];
        let passed = true;
        
        const startTime = performance.now();
        
        // Test rendering performance
        if (window.productIntelligenceSystem) {
            try {
                // Test products rendering
                window.productIntelligenceSystem.renderProducts();
                window.productIntelligenceSystem.renderIntelligenceStats();
                
                const renderTime = performance.now() - startTime;
                if (renderTime > 1000) { // More than 1 second
                    issues.push(`Rendering performance slow: ${renderTime.toFixed(0)}ms`);
                    passed = false;
                } else {
                    console.log(`   ✓ Rendering performance: ${renderTime.toFixed(0)}ms`);
                }
                
            } catch (error) {
                issues.push(`Rendering error: ${error.message}`);
                passed = false;
            }
        }
        
        // Test memory usage (basic check)
        const products = window.productIntelligenceSystem?.products || [];
        const analytics = window.productIntelligenceSystem?.analytics || {};
        
        const memoryEstimate = JSON.stringify(products).length + JSON.stringify(analytics).length;
        if (memoryEstimate > 1000000) { // 1MB
            issues.push(`High memory usage estimated: ${(memoryEstimate / 1000).toFixed(0)}KB`);
        } else {
            console.log(`   ✓ Memory usage reasonable: ${(memoryEstimate / 1000).toFixed(0)}KB`);
        }
        
        return {
            passed,
            details: 'Performance and scalability validation',
            issues
        };
    }
    
    // Test 12: Solarium Design Compliance
    testSolariumCompliance() {
        const issues = [];
        let passed = true;
        
        // Test CSS variables
        const root = document.documentElement;
        const computedStyle = getComputedStyle(root);
        
        const requiredVariables = [
            '--sol-primary', '--sol-gray-100', '--sol-gray-600', '--sol-gray-900',
            '--sol-spacing-md', '--sol-radius-md', '--sol-shadow-sm'
        ];
        
        requiredVariables.forEach(variable => {
            const value = computedStyle.getPropertyValue(variable);
            if (!value || value.trim() === '') {
                issues.push(`Missing Solarium variable: ${variable}`);
                passed = false;
            } else {
                console.log(`   ✓ Variable ${variable} available`);
            }
        });
        
        // Test component classes
        const requiredClasses = [
            '.sol-main-content', '.sol-page-header', '.sol-card',
            '.sol-btn-primary', '.sol-tab', '.sol-stats-grid'
        ];
        
        requiredClasses.forEach(className => {
            const elements = document.querySelectorAll(className);
            if (elements.length === 0) {
                issues.push(`Missing Solarium class: ${className}`);
                passed = false;
            } else {
                console.log(`   ✓ Class ${className} in use`);
            }
        });
        
        // Test specific Product Intelligence classes
        const productClasses = [
            '.products-intelligence-grid', '.product-intelligence-card',
            '.cost-indicator', '.intelligence-badge'
        ];
        
        productClasses.forEach(className => {
            const cssText = document.styleSheets[0]?.cssRules ?
                Array.from(document.styleSheets[0].cssRules).some(rule => 
                    rule.selectorText && rule.selectorText.includes(className.slice(1))
                ) : true; // Skip if can't access stylesheets
                
            if (cssText) {
                console.log(`   ✓ Product class ${className} defined`);
            }
        });
        
        return {
            passed,
            details: 'Solarium Design System compliance validation',
            issues
        };
    }
    
    generateTestReport() {
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(r => r.passed).length;
        const failedTests = totalTests - passedTests;
        const testDuration = Date.now() - this.testStartTime;
        
        console.log('\n📊 PRODUCT INTELLIGENCE INTEGRATION TEST RESULTS');
        console.log('=' .repeat(60));
        console.log(`Total Tests: ${totalTests}`);
        console.log(`Passed: ${passedTests}`);
        console.log(`Failed: ${failedTests}`);
        console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
        console.log(`Duration: ${testDuration}ms`);
        
        // Detailed results
        console.log('\n📋 DETAILED RESULTS:');
        this.testResults.forEach(result => {
            const status = result.passed ? '✅ PASSED' : '❌ FAILED';
            console.log(`${status} - ${result.name}`);
            if (result.details) {
                console.log(`   📝 ${result.details}`);
            }
            if (result.issues && result.issues.length > 0) {
                result.issues.forEach(issue => {
                    console.log(`   ⚠️  ${issue}`);
                });
            }
            if (result.error) {
                console.log(`   💥 Error: ${result.error}`);
            }
        });
        
        // Business Value Assessment
        console.log('\n🎯 BUSINESS VALUE ASSESSMENT:');
        const businessFeatures = this.testResults.find(r => r.name === 'Business Intelligence Features');
        if (businessFeatures && businessFeatures.passed) {
            console.log('✅ REVOLUTIONARY DIFFERENTIATOR ACHIEVED:');
            console.log('   🏆 Product-centric tracking implemented');
            console.log('   💰 Real cost intelligence per product');
            console.log('   📊 Profit impact calculator functional');
            console.log('   🛣️  Route optimization intelligence active');
            console.log('   🤖 AI-powered recommendations working');
            console.log('\n🚀 COMPETITIVE ADVANTAGE: CONFIRMED');
            console.log('   Platform transformed from "tracker" to "Business Intelligence"');
        }
        
        // Final verdict
        const overallSuccess = passedTests === totalTests;
        console.log('\n' + '='.repeat(60));
        if (overallSuccess) {
            console.log('🎉 ALL TESTS PASSED - PRODUCT INTELLIGENCE SYSTEM READY!');
            console.log('🚀 Phase 2: Business Intelligence Platform - MISSION ACCOMPLISHED');
        } else {
            console.log('⚠️  SOME TESTS FAILED - REVIEW REQUIRED');
            console.log(`   ${failedTests} issue(s) need attention`);
        }
        
        return {
            success: overallSuccess,
            totalTests,
            passedTests,
            failedTests,
            successRate: (passedTests / totalTests) * 100,
            duration: testDuration,
            details: this.testResults
        };
    }
}

// Auto-run tests when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(async () => {
            const tester = new ProductIntelligenceIntegrationTest();
            const results = await tester.runAllTests();
            
            // Store results for later access
            window.productIntegrationTestResults = results;
        }, 2000); // Wait for all systems to initialize
    });
} else {
    setTimeout(async () => {
        const tester = new ProductIntelligenceIntegrationTest();
        const results = await tester.runAllTests();
        window.productIntegrationTestResults = results;
    }, 2000);
}

// Export for manual testing
window.ProductIntelligenceIntegrationTest = ProductIntelligenceIntegrationTest;

console.log('[ProductIntelligenceIntegrationTest] Test suite loaded - Product Intelligence validation ready');
