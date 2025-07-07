// pages/products/index.js — Product Intelligence System (NO tracking/spedizioni)

// Import servizi necessari
import organizationService from '/core/services/organization-service.js';
import { importWizard } from '/core/import-wizard.js';
import { supabase } from '/core/services/supabase-client.js';
import TableManager from '/core/table-manager.js';
window.supabase = supabase;
importWizard.setSupabaseClient(supabase);
console.log('[DEBUG] Supabase client in wizard:', window.importWizard.supabase);

// Column configuration
export const AVAILABLE_COLUMNS = [
    { key: 'sku', label: 'SKU', sortable: true, required: true },
    { key: 'name', label: 'Product Name', sortable: true, required: true },
    { key: 'category', label: 'Category', sortable: true },
    { key: 'avgShippingCost', label: 'Avg Shipping Cost', sortable: true },
    { key: 'costTrend', label: 'Cost Trend', sortable: true },
    { key: 'totalUnitsShipped', label: 'Units Shipped', sortable: true },
    { key: 'profitImpact', label: 'Profit Impact', sortable: true },
    { key: 'statusBadge', label: 'Status', sortable: false },
    { key: 'actions', label: 'Actions', sortable: false }
];

// Expose available columns to other modules
window.AVAILABLE_COLUMNS = AVAILABLE_COLUMNS;

export const DEFAULT_VISIBLE_COLUMNS = [
    'sku', 'name', 'category', 'avgShippingCost', 'costTrend',
    'totalUnitsShipped', 'profitImpact', 'statusBadge', 'actions'
];

export const TABLE_COLUMNS = [
    {
        key: 'sku',
        label: 'SKU',
        sortable: true,
        formatter: (v) => `<span class="font-mono">${v || ''}</span>`
    },
    {
        key: 'name',
        label: 'PRODUCT NAME',
        sortable: true,
        formatter: (v, row) => {
            const desc = row.description ? `<small class="text-muted">${row.description.substring(0,50)}...</small>` : '';
            return `<div class="product-name-cell"><strong>${v || ''}</strong>${desc}</div>`;
        }
    },
    {
        key: 'category',
        label: 'CATEGORY',
        sortable: true,
        formatter: (v) => `<span class="category-badge category-${v}">${v}</span>`
    },
    {
        key: 'avgShippingCost',
        label: 'SHIPPING COST',
        sortable: true,
        formatter: (v) => `<strong>${(v || 0).toFixed(2)}</strong>`
    },
    {
        key: 'costTrend',
        label: 'COST TREND',
        sortable: true,
        formatter: (v, row) => {
            const icon = v === 'increasing' ? 'fa-arrow-up' : v === 'decreasing' ? 'fa-arrow-down' : 'fa-minus';
            const cls = v === 'increasing' ? 'negative' : v === 'decreasing' ? 'positive' : 'stable';
            const pct = Math.abs(row.costTrendPercentage || 0).toFixed(1);
            return `<div class="cost-trend-cell ${cls}"><i class="fas ${icon}"></i> ${pct}%</div>`;
        }
    },
    {
        key: 'totalUnitsShipped',
        label: 'UNITS SHIPPED',
        sortable: true,
        formatter: (v) => (v || 0).toLocaleString()
    },
    {
        key: 'profitImpact',
        label: 'PROFIT IMPACT',
        sortable: true,
        formatter: (v) => `<span class="profit-impact ${v >= 0 ? 'positive' : 'negative'}">${(v >= 0 ? '+' : '') + (v / 1000).toFixed(0)}K</span>`
    },
    {
        key: 'statusBadge',
        label: 'STATUS',
        sortable: false,
        formatter: (v, row) => `<span class="sol-badge ${row.statusClass}">${v}</span>`
    },
    {
        key: 'actions',
        label: 'ACTIONS',
        sortable: false,
        formatter: (v, row) => {
            return `<div class="table-actions">` +
                   `<button class="sol-btn sol-btn-sm sol-btn-glass" onclick="viewProductDetails('${row.id}')" title="View Analytics"><i class="fas fa-chart-area"></i></button>` +
                   `<button class="sol-btn sol-btn-sm sol-btn-glass" onclick="editProduct('${row.id}')" title="Edit Product"><i class="fas fa-edit"></i></button>` +
                   `<button class="sol-btn sol-btn-sm sol-btn-glass" onclick="showProductMenu('${row.id}', event)" title="More Options"><i class="fas fa-ellipsis-v"></i></button>` +
                   `</div>`;
        }
    }
];

// Provide table column config globally
window.TABLE_COLUMNS = TABLE_COLUMNS;

let tableManager = null;

function loadColumnPreferences() {
    const saved = localStorage.getItem('productVisibleColumns');
    if (saved) {
        try {
            const order = JSON.parse(saved);
            TABLE_COLUMNS.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
        } catch (e) {
            console.error('Error loading column preferences:', e);
        }
    }
}

class ProductIntelligenceSystem {
    constructor() {
    this.products = [];
    this.analytics = {};
    this.recommendations = [];
    this.organizationId = null;
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
    // Bind methods per non perdere il contesto this
    this.init = this.init.bind(this);
    this.loadData = this.loadData.bind(this);
    this.generateAnalytics = this.generateAnalytics.bind(this);
    this.showImportModal = this.showImportModal.bind(this);
    this.showAddProductModal = this.showAddProductModal.bind(this);
    this.showEditProductModal = this.showEditProductModal.bind(this);
    this.showProductMenu = this.showProductMenu.bind(this);
    this.showProductDetails = this.showProductDetails.bind(this);
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

 showImportModal = async () => {
    console.log('[ProductIntelligence] Initializing import wizard for products...');
    if (!window.importWizard) {
        this.showStatus('Import wizard module not available.', 'error');
        return;
    }
    // Passa il Supabase client all’importWizard
    window.importWizard.setSupabaseClient(window.supabase);
    await window.importWizard.init({
        entity: 'products',
        allowCustomFields: true,
        validationRules: {}, // puoi aggiungere validazioni custom qui
    });
    window.importWizard.show();

    window.importWizard.events.addEventListener('importComplete', async () => {
        this.showStatus('Import successful! Refreshing data...', 'success');

        // Add any new headers as optional columns
        try {
            const headers = Array.isArray(window.importWizard.headers)
                ? window.importWizard.headers
                : [];
            if (window.AVAILABLE_COLUMNS && headers.length) {
                headers.forEach(header => {
                    if (!window.AVAILABLE_COLUMNS.find(c => c.key === header)) {
                        window.AVAILABLE_COLUMNS.push({
                            key: header,
                            label: header,
                            sortable: true
                        });
                    }
                });

                // Refresh column editor and table manager if available
                if (typeof window.refreshColumnEditor === 'function') {
                    window.refreshColumnEditor();
                }
                if (window.tableManager) {
                    window.tableManager.options.columns = window.AVAILABLE_COLUMNS;
                    if (typeof window.updateTable === 'function') {
                        window.updateTable();
                    }
                }
            }
        } catch (e) {
            console.error('Error updating columns from import:', e);
        }

        await this.loadData();
        this.renderProducts();
        this.renderIntelligenceStats && this.renderIntelligenceStats();
    }, { once: true });
};


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

    getAnalytics(productId) {
        return this.analytics?.[productId] || this.getEmptyAnalytics();
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

    getSortIcon(column) {
        if (this.sortColumn !== column) {
            return '<i class="fas fa-sort"></i>';
        }
        return this.sortDirection === 'asc'
            ? '<i class="fas fa-sort-up"></i>'
            : '<i class="fas fa-sort-down"></i>';
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
        const container = document.getElementById('productsTableContainer');
        if (!container) return;

        const products = this.getFilteredAndSortedProducts().map(p => {
            const analytics = this.getAnalytics(p.id);

            let statusBadge = 'TRACKED';
            let statusClass = 'sol-badge-secondary';
            if (Math.abs(analytics.profitImpact || 0) > 10000) {
                statusBadge = 'HIGH IMPACT';
                statusClass = 'sol-badge-danger';
            } else if ((analytics.performance?.costEfficiency || 0) > 85) {
                statusBadge = 'OPTIMIZED';
                statusClass = 'sol-badge-success';
            }

            return {
                ...p,
                avgShippingCost: analytics.avgShippingCost,
                costTrend: analytics.costTrend,
                costTrendPercentage: analytics.costTrendPercentage,
                totalUnitsShipped: analytics.totalUnitsShipped,
                profitImpact: analytics.profitImpact,
                statusBadge,
                statusClass
            };
        });

        if (!tableManager) {
            tableManager = new TableManager('productsTableContainer', {
                columns: TABLE_COLUMNS,
                enableColumnDrag: true,
                enableColumnManager: true,
                searchable: false,
                selectable: false,
                paginate: true,
                pageSize: 20
            });
            window.tableManager = tableManager;
            window.registerTableManager('productsTableContainer', tableManager);
        }

        tableManager.setData(products);
    }
    // --- FORM ---
    getProductFormHTML(product = null) {
        const isEdit = product !== null;
        const data = {
            sku: product?.sku ?? '',
            name: product?.name ?? '',
            category: product?.category ?? 'electronics',
            description: product?.description ?? '',
            specifications: {
                weight: product?.specifications?.weight ?? 0,
                dimensions: {
                    length: product?.specifications?.dimensions?.length ?? 0,
                    width: product?.specifications?.dimensions?.width ?? 0,
                    height: product?.specifications?.dimensions?.height ?? 0,
                },
                value: product?.specifications?.value ?? 0,
                hsCode: product?.specifications?.hsCode ?? '',
                fragile: product?.specifications?.fragile ?? false,
                hazardous: product?.specifications?.hazardous ?? false
            },
            costTracking: {
                baseCost: product?.costTracking?.baseCost ?? 0,
                targetMargin: product?.costTracking?.targetMargin ?? 0.30,
                shippingBudget: product?.costTracking?.shippingBudget ?? 0,
                currencyCode: product?.costTracking?.currencyCode ?? 'USD'
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
        this.showStatus('Modal system not available', 'error');
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
        const analytics = this.getAnalytics(productId);

        if (!product) {
            this.showStatus('Product not found', 'error');
            return;
        }
        if (!window.ModalSystem) {
            this.showStatus('Modal system not available', 'error');
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
        `,
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
                    this.showEditProductModal(productId);
                    return true;
                }
            }
        ]
    });
}

    showEditProductModal(productId) {
    const product = this.products.find(p => p.id === productId);
    if (!product) {
        this.showStatus('Product not found', 'error');
        return;
    }
    if (!window.ModalSystem) {
        this.showStatus('Modal system not available', 'error');
        return;
    }

    window.ModalSystem.show({
        title: 'Edit Product',
        content: this.getProductFormHTML(product),
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
                handler: () => this.updateProduct(productId)
            }
        ]
    });
}

    // Show a simple context menu for product actions
    showProductMenu(productId, event) {
        event && event.preventDefault && event.preventDefault();
        event && event.stopPropagation && event.stopPropagation();

        // Remove any existing menu
        const existing = document.getElementById('productContextMenu');
        if (existing) existing.remove();

        const actions = [
            { label: 'View Details', handler: () => this.showProductDetails(productId) },
            { label: 'Edit Product', handler: () => this.showEditProductModal(productId) },
            { separator: true },
            { label: 'Delete Product', handler: () => this.deleteProduct(productId), class: 'danger' }
        ];

        // Basic menu element
        const menu = document.createElement('div');
        menu.id = 'productContextMenu';
        menu.className = 'sol-context-menu';

        const list = document.createElement('ul');
        menu.appendChild(list);

        actions.forEach(item => {
            if (item.separator) {
                const sep = document.createElement('li');
                sep.className = 'separator';
                list.appendChild(sep);
                return;
            }
            const li = document.createElement('li');
            li.textContent = item.label;
            if (item.class) li.classList.add(item.class);
            li.onclick = () => {
                item.handler();
                hideMenu();
            };
            list.appendChild(li);
        });

        // Position menu
        menu.style.position = 'absolute';
        menu.style.top = `${event.clientY}px`;
        menu.style.left = `${event.clientX}px`;
        menu.style.zIndex = 1000;

        document.body.appendChild(menu);

        // Hide handler
        function hideMenu() {
            menu.remove();
            document.removeEventListener('click', hideMenu);
        }
        setTimeout(() => document.addEventListener('click', hideMenu));

        // Inject minimal styles if not present
        if (!document.getElementById('productContextMenuStyle')) {
            const style = document.createElement('style');
            style.id = 'productContextMenuStyle';
            style.textContent = `
                .sol-context-menu { background: #fff; border: 1px solid #ccc; border-radius: 4px; box-shadow: 0 2px 6px rgba(0,0,0,0.15); }
                .sol-context-menu ul { list-style: none; margin: 0; padding: 4px 0; }
                .sol-context-menu li { padding: 6px 12px; cursor: pointer; font-size: 14px; }
                .sol-context-menu li.separator { margin: 4px 0; border-top: 1px solid #eee; pointer-events: none; }
                .sol-context-menu li.danger { color: #d9534f; }
                .sol-context-menu li:hover { background: #f5f5f5; }
            `;
            document.head.appendChild(style);
        }
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
    loadColumnPreferences();
    const productSystem = window.productIntelligenceSystem;
    productSystem.init();
});

// Funzioni globali per bottoni

// Funzioni globali per bottoni/modal prodotti
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
    // PATCH: Bottone import prodotti
    const importBtn = document.getElementById('importBtn');
    if (importBtn) {
    importBtn.onclick = () => {
    importWizard.show({ entity: 'products' }); // O 'shipments', 'containers', ecc.
        };
    }

    window.ModalSystem.confirm({
        title: 'Delete Product',
        message: 'Are you sure you want to delete this product? This action cannot be undone.',
        confirmLabel: 'Delete',
        confirmClass: 'sol-btn-danger',
        onConfirm: () => window.productIntelligenceSystem.deleteProduct(productId)
    });
};

// Column editor helpers
window.showColumnEditor = function() {
    if (!window.ModalSystem) return;

    const currentVisible = tableManager?.options?.columns?.filter(c => !c.hidden).map(c => c.key) || DEFAULT_VISIBLE_COLUMNS;

    const content = `
        <div class="column-editor">
            <div class="column-editor-header">
                <p>Select the columns to display and drag to reorder</p>
                <div class="column-actions">
                    <button class="sol-btn sol-btn-sm sol-btn-glass" onclick="selectAllColumns()">Select All</button>
                    <button class="sol-btn sol-btn-sm sol-btn-glass" onclick="resetDefaultColumns()">Reset Default</button>
                </div>
            </div>
            <div class="column-list" id="columnEditorList">
                ${AVAILABLE_COLUMNS.map(col => `
                    <div class="column-item ${col.required ? 'required' : ''}" data-column="${col.key}" draggable="${!col.required}">
                        <div class="column-drag-handle"><i class="fas fa-grip-vertical"></i></div>
                        <label class="column-checkbox">
                            <input type="checkbox" value="${col.key}" ${currentVisible.includes(col.key) ? 'checked' : ''} ${col.required ? 'disabled' : ''} onchange="updateColumnPreview()">
                            <span class="column-label">${col.label}</span>
                            ${col.required ? '<span class="badge badge-info ml-2">Required</span>' : ''}
                        </label>
                    </div>
                `).join('')}
            </div>
            <div class="column-preview mt-3">
                <small class="text-muted"><span id="selectedColumnsCount">${currentVisible.length}</span> columns selected</small>
            </div>
        </div>
    `;

    window.ModalSystem.show({
        title: 'Column Manager',
        content: content,
        size: 'md',
        buttons: [
            { text: 'Cancel', className: 'sol-btn-secondary', action: () => window.ModalSystem.hide() },
            { text: 'Apply', className: 'sol-btn-primary', action: () => applyColumnChanges() }
        ]
    });

    setTimeout(() => {
        const list = document.getElementById('columnEditorList');
        if (list && window.Sortable) {
            new Sortable(list, { animation: 150, handle: '.column-drag-handle', filter: '.required', onEnd: () => updateColumnPreview() });
        }
    }, 100);
};

window.selectAllColumns = function() {
    document.querySelectorAll('#columnEditorList input[type="checkbox"]:not(:disabled)').forEach(cb => cb.checked = true);
    updateColumnPreview();
};

window.resetDefaultColumns = function() {
    document.querySelectorAll('#columnEditorList input[type="checkbox"]').forEach(cb => {
        cb.checked = DEFAULT_VISIBLE_COLUMNS.includes(cb.value) || cb.disabled;
    });
    updateColumnPreview();
};

window.updateColumnPreview = function() {
    const checked = document.querySelectorAll('#columnEditorList input[type="checkbox"]:checked').length;
    const counter = document.getElementById('selectedColumnsCount');
    if (counter) counter.textContent = checked;
};

window.applyColumnChanges = function() {
    const columnOrder = [];
    document.querySelectorAll('#columnEditorList .column-item').forEach(item => {
        const key = item.dataset.column;
        const checked = item.querySelector('input[type="checkbox"]').checked;
        if (checked) columnOrder.push(key);
    });

    const newColumns = columnOrder.map(key => {
        const existing = TABLE_COLUMNS.find(c => c.key === key);
        const available = AVAILABLE_COLUMNS.find(c => c.key === key);
        return existing || { key, label: available?.label || key, sortable: available?.sortable, formatter: (v) => v || '-' };
    });

    const actionsCol = TABLE_COLUMNS.find(c => c.key === 'actions');
    if (actionsCol) newColumns.push(actionsCol);

    TABLE_COLUMNS.length = 0;
    TABLE_COLUMNS.push(...newColumns);
    localStorage.setItem('productVisibleColumns', JSON.stringify(columnOrder));

    if (tableManager) {
        tableManager.options.columns = newColumns;
        tableManager.render();
    }

    window.ModalSystem.hide();
    window.NotificationSystem?.success('Columns updated');
};

window.refreshColumnEditor = function() {
    if (document.getElementById('columnEditorList')) {
        window.ModalSystem.hide();
        showColumnEditor();
    }
};

window.updateTable = function() {
    if (window.productIntelligenceSystem) {
        window.productIntelligenceSystem.renderProducts();
    }
};

console.log('[ProductIntelligence] Product Intelligence System module loaded successfully');
