// pages/products/index.js — Product Intelligence System (NO tracking/spedizioni)

// Import servizi necessari
import organizationService from '/core/services/organization-service.js';
import { importWizard } from '/core/import-wizard.js';
import { supabase } from '/core/services/supabase-client.js';

importWizard.setSupabaseClient(supabase);

class ProductIntelligenceSystem {
    constructor() {
        this.products = [];
        this.analytics = {};
        this.recommendations = [];
        this.organizationId = null;
        this.viewMode = 'grid';
        this.sortColumn = 'name';
        this.sortDirection = 'asc';
        this.activeFilters = {
            category: '',
            costTrend: '',
            search: '',
            minShippingCost: null,
            maxShippingCost: null,
            minUnits: null,
            profitImpact: 'all'
        };
        // Bind methods
        this.init = this.init.bind(this);
        this.loadData = this.loadData.bind(this);
        this.generateAnalytics = this.generateAnalytics.bind(this);
    }
initializeEventHandlers() {
    // Bottone: aggiungi prodotto
    const addProductBtn = document.getElementById('addProductBtn');
    if (addProductBtn) {
        addProductBtn.onclick = () => this.showAddProductModal();
    }

    // Bottone: esporta analytics
    const exportBtn = document.getElementById('exportAnalyticsBtn');
    if (exportBtn) {
        exportBtn.onclick = () => this.exportAnalytics();
    }

    // Bottone: importa prodotti (se presente)
    const importBtn = document.getElementById('importProductsBtn');
    if (importBtn) {
        importBtn.onclick = () => this.showImportModal();
    }

    // Ricerca e filtri base
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

    // Bottone: vista griglia/lista (se presente)
    const gridBtn = document.getElementById('viewGridBtn');
    const listBtn = document.getElementById('viewListBtn');
    if (gridBtn) gridBtn.onclick = () => this.toggleViewMode();
    if (listBtn) listBtn.onclick = () => this.toggleViewMode();
}

showStatus(message, type = 'info', duration = 3000) {
    if (window.NotificationSystem) {
        window.NotificationSystem.show(message, type, duration);
    } else {
        console.log(`[ProductIntelligence] ${type}: ${message}`);
    }
}

    async init() {
        console.log('[ProductIntelligence] Initializing system...');
        try {
            if (window.organizationService && !window.organizationService.initialized) {
                await window.organizationService.init();
            }
            this.organizationId = window.organizationService.getCurrentOrgId();

            if (!this.organizationId) {
                this.showStatus('Organization data not available. Cannot load products.', 'warning');
                return;
            }
            console.log(`[ProductIntelligence] Using organization: ${this.organizationId}`);
            await this.loadData();
            await this.generateAnalytics();
            this.initializeEventHandlers();
            this.renderIntelligenceStats();
            this.renderProducts();
            this.updateFilterBadge();
        } catch (error) {
            console.error('[ProductIntelligence] Initialization failed:', error);
            this.showStatus('System initialization failed. See console for details.', 'error');
        }
    }

    async loadData() {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('organization_id', this.organizationId);
        if (error) {
            console.error('[ProductIntelligence] Failed to fetch products:', error);
            this.showStatus('Failed to load products from server', 'error');
            this.products = [];
            return;
        }
        this.products = data || [];
    }
    // Analytics basilare: calcola margini/profitto su dati prodotto
    async generateAnalytics() {
        this.analytics = {};
        this.products.forEach(product => {
            this.analytics[product.id] = this.calculateProductAnalytics(product);
        });
        this.recommendations = this.generateRecommendations();
    }

    calculateProductAnalytics(product) {
        // Margine attuale vs target (senza tracking)
        const value = product.specifications?.value || 0;
        const baseCost = product.costTracking?.baseCost || 0;
        const targetMargin = product.costTracking?.targetMargin || 0;
        const shippingBudget = product.costTracking?.shippingBudget || 0;

        let currentMargin = 0;
        if (value > 0) {
            currentMargin = (value - baseCost - shippingBudget) / value;
        }
        return {
            currentMargin,
            targetMargin,
            profitImpact: (currentMargin - targetMargin) * value,
            status: currentMargin >= targetMargin ? 'ok' : 'alert'
        };
    }

    generateRecommendations() {
        const recommendations = [];
        this.products.forEach(product => {
            const analytics = this.analytics[product.id];
            if (!analytics) return;
            if (analytics.status === 'alert') {
                recommendations.push({
                    id: `margin-${product.id}`,
                    type: "margin_optimization",
                    priority: "medium",
                    productId: product.id,
                    productName: product.name,
                    title: `Improve margins for ${product.name}`,
                    description: `Current margin ${(analytics.currentMargin * 100).toFixed(1)}% below target ${(analytics.targetMargin * 100).toFixed(1)}%`,
                    action: "Optimize costs or adjust pricing",
                    estimatedImpact: analytics.profitImpact,
                    status: "pending"
                });
            }
        });
        return recommendations;
    }

    // --- FILTRI AVANZATI ---
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
        // Reset UI
        const categoryFilter = document.getElementById('categoryFilter');
        const costTrendFilter = document.getElementById('costTrendFilter');
        const productSearch = document.getElementById('productSearch');
        if (categoryFilter) categoryFilter.value = '';
        if (costTrendFilter) costTrendFilter.value = '';
        if (productSearch) productSearch.value = '';
        this.renderProducts();
        this.updateFilterBadge();
    }

    updateFilterBadge() {
        const activeCount = Object.values(this.activeFilters)
            .filter(v => v !== '' && v !== null && v !== 'all').length;
        const badge = document.getElementById('activeFiltersCount');
        if (badge) {
            badge.textContent = activeCount;
            badge.style.display = activeCount > 0 ? 'inline-block' : 'none';
        }
    }

    // --- ORDINAMENTO & FILTRI ---
    sortProducts(column) {
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'asc';
        }
        this.renderProducts();
    }

    getFilteredAndSortedProducts() {
        let filteredProducts = [...this.products];
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
        // Puoi aggiungere qui eventuali altri filtri interni!
        // Ordinamento
        filteredProducts.sort((a, b) => {
            let aValue, bValue;
            switch (this.sortColumn) {
                case 'sku': aValue = a.sku; bValue = b.sku; break;
                case 'name': aValue = a.name; bValue = b.name; break;
                case 'category': aValue = a.category; bValue = b.category; break;
                case 'margin':
                    aValue = this.analytics[a.id]?.currentMargin || 0;
                    bValue = this.analytics[b.id]?.currentMargin || 0;
                    break;
                default: aValue = a.name; bValue = b.name;
            }
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
    // --- RENDERING ---
    renderIntelligenceStats() {
        const statsContainer = document.getElementById('intelligenceStats');
        if (!statsContainer) return;
        const totalProducts = this.products.length;
        const marginOK = Object.values(this.analytics).filter(a => a.status === 'ok').length;
        const marginAlert = Object.values(this.analytics).filter(a => a.status === 'alert').length;

        statsContainer.innerHTML = `
            <div class="sol-stat-card">
                <div class="sol-stat-icon" style="color: var(--sol-primary);">
                    <i class="fas fa-cubes"></i>
                </div>
                <div class="sol-stat-value">${totalProducts}</div>
                <div class="sol-stat-label">Active Products</div>
            </div>
            <div class="sol-stat-card">
                <div class="sol-stat-icon" style="color: var(--sol-success);">
                    <i class="fas fa-check-circle"></i>
                </div>
                <div class="sol-stat-value">${marginOK}</div>
                <div class="sol-stat-label">Target Margin Met</div>
            </div>
            <div class="sol-stat-card">
                <div class="sol-stat-icon" style="color: var(--sol-danger);">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <div class="sol-stat-value">${marginAlert}</div>
                <div class="sol-stat-label">Below Target Margin</div>
            </div>
        `;
    }

    // RENDERING PRINCIPALE
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

    renderProductsGrid() {
        return this.getFilteredAndSortedProducts().map(product => {
            const analytics = this.analytics[product.id] || {};
            let badgeClass = analytics.status === 'ok' ? 'optimized' : '';
            let badgeText = analytics.status === 'ok' ? 'OPTIMIZED' : 'TRACKED';
            if (analytics.status === 'alert') { badgeClass = 'high-impact'; badgeText = 'LOW MARGIN'; }
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
                            <span class="cost-value">${((analytics.currentMargin || 0) * 100).toFixed(1)}%</span>
                            <span class="cost-label">Margin</span>
                        </div>
                    </div>
                    <div class="product-metrics">
                        <div class="metric-item">
                            <span class="metric-label">Unit Value</span>
                            <span class="metric-value">${product.specifications.value}</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">Base Cost</span>
                            <span class="metric-value">${product.costTracking.baseCost}</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">Shipping</span>
                            <span class="metric-value">${product.costTracking.shippingBudget}</span>
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

    renderProductsList() {
        const products = this.getFilteredAndSortedProducts();
        if (products.length === 0) {
            return `<div class="empty-state"><i class="fas fa-search fa-3x text-muted"></i>
                <h3>No products found</h3>
                <button class="sol-btn sol-btn-primary" onclick="window.productIntelligenceSystem.clearFilters()">Clear Filters</button></div>`;
        }
        const tableHTML = `
            <div class="products-list-table">
                <table class="sol-table">
                    <thead>
                        <tr>
                            <th class="sortable" onclick="window.productIntelligenceSystem.sortProducts('sku')">SKU ${this.getSortIcon('sku')}</th>
                            <th class="sortable" onclick="window.productIntelligenceSystem.sortProducts('name')">Product Name ${this.getSortIcon('name')}</th>
                            <th class="sortable" onclick="window.productIntelligenceSystem.sortProducts('category')">Category ${this.getSortIcon('category')}</th>
                            <th class="sortable" onclick="window.productIntelligenceSystem.sortProducts('margin')">Margin ${this.getSortIcon('margin')}</th>
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

    renderProductRow(product) {
        const analytics = this.analytics[product.id] || {};
        let statusBadge = analytics.status === 'ok' ? 'OPTIMIZED' : 'TRACKED';
        let statusClass = analytics.status === 'ok' ? 'sol-badge-success' : 'sol-badge-secondary';
        if (analytics.status === 'alert') { statusBadge = 'LOW MARGIN'; statusClass = 'sol-badge-danger'; }
        return `
            <tr data-product-id="${product.id}">
                <td class="font-mono">${product.sku}</td>
                <td><div class="product-name-cell"><strong>${product.name}</strong>
                    ${product.description ? `<small class="text-muted">${product.description.substring(0, 50)}...</small>` : ''}
                </div></td>
                <td><span class="category-badge category-${product.category}">${product.category}</span></td>
                <td><strong>${((analytics.currentMargin || 0) * 100).toFixed(1)}%</strong></td>
                <td><span class="sol-badge ${statusClass}">${statusBadge}</span></td>
                <td>
                    <div class="table-actions">
                        <button class="sol-btn sol-btn-sm sol-btn-glass" onclick="viewProductDetails('${product.id}')" title="View Analytics"><i class="fas fa-chart-area"></i></button>
                        <button class="sol-btn sol-btn-sm sol-btn-glass" onclick="editProduct('${product.id}')" title="Edit Product"><i class="fas fa-edit"></i></button>
                        <button class="sol-btn sol-btn-sm sol-btn-glass" onclick="showProductMenu('${product.id}', event)" title="More Options"><i class="fas fa-ellipsis-v"></i></button>
                    </div>
                </td>
            </tr>
        `;
    }

    // --- FORM ---
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
                        <label class="sol-form-label"><i class="fas fa-barcode"></i> SKU *</label>
                        <input type="text" class="sol-form-input" id="productSku" value="${data.sku}" placeholder="PROD-001" required>
                        <span class="sol-form-hint">Unique product identifier</span>
                    </div>
                    <div class="sol-form-group">
                        <label class="sol-form-label"><i class="fas fa-tag"></i> Product Name *</label>
                        <input type="text" class="sol-form-input" id="productName" value="${data.name}" placeholder="Product Name" required>
                    </div>
                    <div class="sol-form-group">
                        <label class="sol-form-label"><i class="fas fa-layer-group"></i> Category</label>
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
                        <label class="sol-form-label"><i class="fas fa-weight"></i> Weight (kg) *</label>
                        <input type="number" class="sol-form-input" id="productWeight" value="${data.specifications.weight}" step="0.001" min="0" required>
                    </div>
                    <div class="sol-form-group">
                        <label class="sol-form-label"><i class="fas fa-ruler"></i> Length (cm) *</label>
                        <input type="number" class="sol-form-input" id="productLength" value="${data.specifications.dimensions.length}" step="0.1" min="0" required>
                    </div>
                    <div class="sol-form-group">
                        <label class="sol-form-label"><i class="fas fa-ruler"></i> Width (cm) *</label>
                        <input type="number" class="sol-form-input" id="productWidth" value="${data.specifications.dimensions.width}" step="0.1" min="0" required>
                    </div>
                    <div class="sol-form-group">
                        <label class="sol-form-label"><i class="fas fa-ruler"></i> Height (cm) *</label>
                        <input type="number" class="sol-form-input" id="productHeight" value="${data.specifications.dimensions.height}" step="0.1" min="0" required>
                    </div>
                    <div class="sol-form-group">
                        <label class="sol-form-label"><i class="fas fa-dollar-sign"></i> Unit Value (USD) *</label>
                        <input type="number" class="sol-form-input" id="productValue" value="${data.specifications.value}" step="0.01" min="0" required>
                    </div>
                    <div class="sol-form-group">
                        <label class="sol-form-label"><i class="fas fa-file-code"></i> HS Code</label>
                        <input type="text" class="sol-form-input" id="productHsCode" value="${data.specifications.hsCode}" placeholder="8471.30.01">
                        <span class="sol-form-hint">Harmonized System code for customs</span>
                    </div>
                    <div class="sol-form-group">
                        <label class="sol-form-label"><i class="fas fa-industry"></i> Manufacturing Cost (USD) *</label>
                        <input type="number" class="sol-form-input" id="productBaseCost" value="${data.costTracking.baseCost}" step="0.01" min="0" required>
                    </div>
                    <div class="sol-form-group">
                        <label class="sol-form-label"><i class="fas fa-percentage"></i> Target Margin (%) *</label>
                        <input type="number" class="sol-form-input" id="productMargin" value="${(data.costTracking.targetMargin * 100).toFixed(0)}" step="1" min="0" max="100" required>
                        <span class="sol-form-hint">Target profit margin percentage</span>
                    </div>
                    <div class="sol-form-group">
                        <label class="sol-form-label"><i class="fas fa-ship"></i> Shipping Budget (USD/unit) *</label>
                        <input type="number" class="sol-form-input" id="productShippingBudget" value="${data.costTracking.shippingBudget}" step="0.01" min="0" required>
                        <span class="sol-form-hint">Target shipping cost per unit</span>
                    </div>
                </div>
                <div class="sol-form-group" style="grid-column: 1 / -1;">
                    <label class="sol-form-label"><i class="fas fa-align-left"></i> Description</label>
                    <textarea class="sol-form-input" id="productDescription" rows="3" placeholder="Product description...">${data.description}</textarea>
                </div>
                <div class="sol-form-grid" style="grid-template-columns: repeat(2, 1fr);">
                    <label class="sol-form-label" style="display: flex; align-items: center; gap: 0.5rem;">
                        <input type="checkbox" id="productFragile" ${data.specifications.fragile ? 'checked' : ''}>
                        <i class="fas fa-fragile"></i> Fragile Item
                    </label>
                    <label class="sol-form-label" style="display: flex; align-items: center; gap: 0.5rem;">
                        <input type="checkbox" id="productHazardous" ${data.specifications.hazardous ? 'checked' : ''}>
                        <i class="fas fa-exclamation-triangle"></i> Hazardous Material
                    </label>
                </div>
            </form>
        `;
    }
    // --- CRUD & MODALS ---

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
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isActive: true,
            tags: []
        };
        // Calculate volume
        const { length, width, height } = productData.specifications.dimensions;
        productData.specifications.volume = (length * width * height) / 1000000;

        // Check for duplicate SKU
        if (this.products.some(p => p.sku === productData.sku)) {
            this.showStatus('SKU already exists', 'error');
            return false;
        }

        // Salva su Supabase
        this.addProduct(productData);
        return true;
    }

    async addProduct(productData) {
        productData.organization_id = this.organizationId;
        const { error } = await supabase.from('products').insert([productData]);
        if (error) {
            this.showStatus('Errore nel salvataggio prodotto', 'error');
            console.error('[ProductIntelligence] Add error:', error);
            return false;
        }
        this.showStatus('Prodotto aggiunto!', 'success');
        await this.loadData();
        return true;
    }

    async updateProduct(productId) {
        // Leggi i dati dal form modale
        const form = document.getElementById('productForm');
        if (!form || !form.checkValidity()) {
            this.showStatus('Please fill all required fields', 'error');
            return false;
        }
        // Prendi solo i valori aggiornati
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
        // Calcola volume
        const { length, width, height } = updatedData.specifications.dimensions;
        updatedData.specifications.volume = (length * width * height) / 1000000;

        const { error } = await supabase.from('products').update(updatedData)
            .eq('id', productId)
            .eq('organization_id', this.organizationId);

        if (error) {
            this.showStatus('Errore nell’aggiornamento', 'error');
            console.error('[ProductIntelligence] Update error:', error);
            return false;
        }
        this.showStatus('Prodotto aggiornato!', 'success');
        await this.loadData();
        return true;
    }

    async deleteProduct(productId) {
        const { error } = await supabase.from('products')
            .delete()
            .eq('id', productId)
            .eq('organization_id', this.organizationId);
        if (error) {
            this.showStatus('Errore nella cancellazione', 'error');
            console.error('[ProductIntelligence] Delete error:', error);
            return false;
        }
        this.showStatus('Prodotto eliminato!', 'success');
        await this.loadData();
        return true;
    }

    // MODALE ANALYTICS/DETAILS
    showProductDetails(productId) {
        const product = this.products.find(p => p.id === productId);
        const analytics = this.analytics[productId] || {};
        if (!product) return;
        if (!window.ModalSystem) {
            console.error('Modal system not available');
            return;
        }
        window.ModalSystem.show({
            title: 'Product Intelligence Details',
            content: `
                <div class="product-details-modal">
                    <div class="product-header">
                        <h3>${product.name}</h3>
                        <span class="product-sku">${product.sku}</span>
                    </div>
                    <div class="analytics-grid">
                        <div class="analytics-section">
                            <h4>Profitability</h4>
                            <div class="metric-row">
                                <span>Unit Value:</span>
                                <span>${product.specifications.value}</span>
                            </div>
                            <div class="metric-row">
                                <span>Base Cost:</span>
                                <span>${product.costTracking.baseCost}</span>
                            </div>
                            <div class="metric-row">
                                <span>Shipping Budget:</span>
                                <span>${product.costTracking.shippingBudget}</span>
                            </div>
                            <div class="metric-row">
                                <span>Target Margin:</span>
                                <span>${(product.costTracking.targetMargin * 100).toFixed(1)}%</span>
                            </div>
                            <div class="metric-row">
                                <span>Current Margin:</span>
                                <span>${((analytics.currentMargin || 0) * 100).toFixed(1)}%</span>
                            </div>
                        </div>
                        <div class="analytics-section">
                            <h4>Specifications</h4>
                            <div class="metric-row">
                                <span>Weight:</span>
                                <span>${product.specifications.weight} kg</span>
                            </div>
                            <div class="metric-row">
                                <span>Size:</span>
                                <span>${product.specifications.dimensions.length} x ${product.specifications.dimensions.width} x ${product.specifications.dimensions.height} cm</span>
                            </div>
                            <div class="metric-row">
                                <span>HS Code:</span>
                                <span>${product.specifications.hsCode}</span>
                            </div>
                            <div class="metric-row">
                                <span>Fragile:</span>
                                <span>${product.specifications.fragile ? 'Yes' : 'No'}</span>
                            </div>
                            <div class="metric-row">
                                <span>Hazardous:</span>
                                <span>${product.specifications.hazardous ? 'Yes' : 'No'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `,
            size: 'lg',
            actions: [
                { label: 'Close', class: 'sol-btn-secondary', handler: () => true },
                { label: 'Edit Product', class: 'sol-btn-primary', handler: () => { window.productIntelligenceSystem.showEditProductModal(productId); return true; } }
            ]
        });
    }

    showEditProductModal(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;
        if (!window.ModalSystem) {
            console.error('Modal system not available');
            return;
        }
        window.ModalSystem.show({
            title: 'Edit Product',
            content: this.getProductFormHTML(product),
            size: 'lg',
            actions: [
                { label: 'Cancel', class: 'sol-btn-secondary', handler: () => true },
                { label: 'Update Product', class: 'sol-btn-primary', handler: () => this.updateProduct(productId) }
            ]
        });
    }

    // CONTEXT MENU/BASIC EXPORT
    showProductMenu(productId, event) {
        event.stopPropagation();
        this.showStatus('Product menu - coming soon!', 'info');
    }

    exportAnalytics() {
        // Export all analytics data as JSON
        const exportData = {
            exportDate: new Date().toISOString(),
            products: this.products.map(product => ({
                ...product,
                analytics: this.analytics[product.id]
            }))
        };
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

} // END CLASS

// ===== GLOBAL FUNCTIONS =====
window.productIntelligenceSystem = new ProductIntelligenceSystem();

document.addEventListener('DOMContentLoaded', () => {
    const productSystem = window.productIntelligenceSystem;
    productSystem.init();
});

// Funzioni globali per bottoni
window.viewProductDetails = function(productId) {
    window.productIntelligenceSystem.showProductDetails(productId);
};
window.editProduct = function(productId) {
    window.productIntelligenceSystem.showEditProductModal(productId);
};
window.showProductMenu = function(productId, event) {
    window.productIntelligenceSystem.showProductMenu(productId, event);
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
        onConfirm: () => window.productIntelligenceSystem.deleteProduct(productId)
    });
};

console.log('[ProductIntelligence] Product Intelligence System module loaded successfully');