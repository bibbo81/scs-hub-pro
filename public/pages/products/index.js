// public/pages/products/index.js
import { dataService } from '../../core/data-service.js';
import { tableManager } from '../../core/table-manager.js';
import { modalSystem } from '../../core/modal-system.js';
import { notificationSystem } from '../../core/notification-system.js';
import { importWizard } from '../../core/import-wizard.js';

/**
 * Products Page Controller
 */
class ProductsController {
    constructor() {
        this.currentView = 'table';
        this.currentProduct = null;
        this.filters = {
            search: '',
            category: '',
            status: ''
        };
        this.categories = new Set();
        this.stats = {
            total: 0,
            active: 0,
            categories: 0,
            totalValue: 0
        };
    }

    /**
     * Inizializza pagina products
     */
    async init() {
        console.log('Initializing products page...');
        
        // Setup tabella
        this.setupTable();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Carica dati iniziali
        await this.loadProducts();
        
        // Subscribe a cambiamenti
        this.setupDataSubscriptions();
    }

    /**
     * Setup tabella con TableManager
     */
    setupTable() {
        this.table = tableManager.create({
            tableId: 'productsTable',
            entity: 'products',
            columns: [
                {
                    field: 'cod_art',
                    label: 'Code',
                    sortable: true,
                    formatter: (value) => `<span class="font-mono font-medium">${value}</span>`
                },
                {
                    field: 'descrizione',
                    label: 'Description',
                    sortable: true,
                    formatter: (value, row) => `
                        <div>
                            <div class="font-medium">${value}</div>
                            ${row.descrizione_estesa ? `<div class="text-sm text-muted">${row.descrizione_estesa}</div>` : ''}
                        </div>
                    `
                },
                {
                    field: 'categoria',
                    label: 'Category',
                    sortable: true,
                    formatter: (value) => value ? `<span class="badge badge-secondary">${value}</span>` : '-'
                },
                {
                    field: 'um',
                    label: 'Unit',
                    sortable: true,
                    formatter: (value) => value || 'PZ'
                },
                {
                    field: 'peso_kg',
                    label: 'Weight (kg)',
                    sortable: true,
                    align: 'right',
                    formatter: (value) => value ? parseFloat(value).toFixed(3) : '-'
                },
                {
                    field: 'valore_unitario',
                    label: 'Unit Value',
                    sortable: true,
                    align: 'right',
                    formatter: (value) => value ? this.formatCurrency(value) : '-'
                },
                {
                    field: 'status',
                    label: 'Status',
                    sortable: true,
                    formatter: (value) => {
                        const statusClass = {
                            active: 'success',
                            inactive: 'warning',
                            discontinued: 'danger'
                        }[value] || 'secondary';
                        
                        return `<span class="badge badge-${statusClass}">${this.formatStatus(value)}</span>`;
                    }
                },
                {
                    field: 'updated_at',
                    label: 'Last Update',
                    sortable: true,
                    formatter: (value) => this.formatDate(value)
                },
                {
                    field: 'actions',
                    label: 'Actions',
                    align: 'center',
                    formatter: (_, row) => `
                        <div class="action-buttons">
                            <button class="btn-icon" onclick="products.editProduct('${row.cod_art}')" title="Edit">
                                <i class="icon-edit"></i>
                            </button>
                            <button class="btn-icon" onclick="products.duplicateProduct('${row.cod_art}')" title="Duplicate">
                                <i class="icon-copy"></i>
                            </button>
                            <button class="btn-icon text-danger" onclick="products.deleteProduct('${row.cod_art}')" title="Delete">
                                <i class="icon-trash"></i>
                            </button>
                        </div>
                    `
                }
            ],
            searchable: true,
            pageSize: 20,
            onSort: (column, order) => this.loadProducts(),
            onSearch: (query) => this.handleSearch(query),
            onPageChange: (page) => this.loadProducts()
        });
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Search con debounce
        let searchTimeout;
        document.getElementById('searchInput')?.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.filters.search = e.target.value;
                this.applyFilters();
            }, 300);
        });

        // Category filter
        document.getElementById('categoryFilter')?.addEventListener('change', (e) => {
            this.filters.category = e.target.value;
        });

        // Status filter
        document.getElementById('statusFilter')?.addEventListener('change', (e) => {
            this.filters.status = e.target.value;
        });
    }

    /**
     * Carica prodotti
     */
    async loadProducts() {
        try {
            const options = {
                page: this.table.currentPage,
                limit: this.table.pageSize,
                sort: this.table.sortColumn ? {
                    field: this.table.sortColumn,
                    order: this.table.sortOrder
                } : undefined,
                filters: this.filters,
                search: this.filters.search
            };

            const response = await dataService.get('products', options);
            
            // Aggiorna tabella
            this.table.setData(response.data || response);
            
            // Aggiorna stats
            await this.updateStats();
            
            // Aggiorna categorie per filtro
            this.updateCategories(response.data || response);
            
        } catch (error) {
            console.error('Error loading products:', error);
            notificationSystem.show('Error loading products', 'error');
        }
    }

    /**
     * Aggiorna statistiche
     */
    async updateStats() {
        try {
            const stats = await dataService.getStats('products');
            
            this.stats = {
                total: stats.total || 0,
                active: stats.active || 0,
                categories: stats.categories || 0,
                totalValue: stats.totalValue || 0
            };
            
            // Aggiorna UI
            document.getElementById('totalProducts').textContent = this.formatNumber(this.stats.total);
            document.getElementById('activeProducts').textContent = this.formatNumber(this.stats.active);
            document.getElementById('totalCategories').textContent = this.formatNumber(this.stats.categories);
            document.getElementById('totalValue').textContent = this.formatCurrency(this.stats.totalValue);
            
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    /**
     * Aggiorna lista categorie
     */
    updateCategories(products) {
        products.forEach(product => {
            if (product.categoria) {
                this.categories.add(product.categoria);
            }
        });
        
        // Aggiorna select categorie
        const categorySelect = document.getElementById('categoryFilter');
        if (categorySelect && this.categories.size > 0) {
            const currentValue = categorySelect.value;
            categorySelect.innerHTML = '<option value="">All Categories</option>' +
                Array.from(this.categories)
                    .sort()
                    .map(cat => `<option value="${cat}">${cat}</option>`)
                    .join('');
            categorySelect.value = currentValue;
        }
    }

    /**
     * Mostra modal creazione prodotto
     */
    showCreateModal() {
        this.currentProduct = null;
        this.showProductModal('Create New Product');
    }

    /**
     * Mostra modal modifica prodotto
     */
    async editProduct(codArt) {
        try {
            this.currentProduct = await dataService.getById('products', codArt);
            this.showProductModal('Edit Product');
        } catch (error) {
            notificationSystem.show('Error loading product', 'error');
        }
    }

    /**
     * Duplica prodotto
     */
    async duplicateProduct(codArt) {
        try {
            const product = await dataService.getById('products', codArt);
            
            // Rimuovi ID e modifica codice
            delete product.id;
            delete product.created_at;
            delete product.updated_at;
            product.cod_art = '';
            product.descrizione = `${product.descrizione} (Copy)`;
            
            this.currentProduct = product;
            this.showProductModal('Duplicate Product');
            
        } catch (error) {
            notificationSystem.show('Error duplicating product', 'error');
        }
    }

    /**
     * Mostra modal prodotto
     */
    showProductModal(title) {
        const template = document.getElementById('productFormTemplate');
        const content = template.content.cloneNode(true);
        
        const modal = modalSystem.show({
            title: title,
            content: content,
            size: 'lg',
            showFooter: false
        });
        
        // Popola categorie nel form
        const categorySelect = modal.querySelector('#categoria');
        categorySelect.innerHTML = '<option value="">Select category...</option>' +
            Array.from(this.categories)
                .sort()
                .map(cat => `<option value="${cat}">${cat}</option>`)
                .join('') +
            '<option value="_new">+ Add new category...</option>';
        
        // Gestisci nuova categoria
        categorySelect.addEventListener('change', (e) => {
            if (e.target.value === '_new') {
                const newCategory = prompt('Enter new category name:');
                if (newCategory && newCategory.trim()) {
                    const option = document.createElement('option');
                    option.value = newCategory.trim();
                    option.textContent = newCategory.trim();
                    option.selected = true;
                    categorySelect.insertBefore(option, categorySelect.lastElementChild);
                    this.categories.add(newCategory.trim());
                } else {
                    categorySelect.value = '';
                }
            }
        });
        
        // Popola form se editing
        if (this.currentProduct) {
            const form = modal.querySelector('#productForm');
            Object.keys(this.currentProduct).forEach(key => {
                const field = form.elements[key];
                if (field) {
                    field.value = this.currentProduct[key] || '';
                }
            });
            
            // Disabilita cod_art se editing
            if (this.currentProduct.cod_art) {
                form.elements.cod_art.readOnly = true;
            }
        }
        
        // Setup form submission
        const form = modal.querySelector('#productForm');
        form.addEventListener('submit', (e) => this.handleProductSubmit(e, modal));
    }

    /**
     * Gestisci submit form prodotto
     */
    async handleProductSubmit(event, modal) {
        event.preventDefault();
        
        const form = event.target;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        
        // Validazioni
        if (!data.cod_art || !/^\d{8}$/.test(data.cod_art)) {
            notificationSystem.show('Product code must be 8 digits', 'error');
            return;
        }
        
        // Converti valori numerici
        if (data.peso_kg) data.peso_kg = parseFloat(data.peso_kg) || null;
        if (data.volume_m3) data.volume_m3 = parseFloat(data.volume_m3) || null;
        if (data.valore_unitario) data.valore_unitario = parseFloat(data.valore_unitario) || null;
        
        try {
            if (this.currentProduct && this.currentProduct.cod_art) {
                // Update
                await dataService.update('products', this.currentProduct.cod_art, data);
                notificationSystem.show('Product updated successfully', 'success');
            } else {
                // Create
                await dataService.create('products', data);
                notificationSystem.show('Product created successfully', 'success');
            }
            
            modal.close();
            this.loadProducts();
            
        } catch (error) {
            console.error('Save error:', error);
            notificationSystem.show(error.message || 'Error saving product', 'error');
        }
    }

    /**
     * Elimina prodotto
     */
    async deleteProduct(codArt) {
        const confirmed = await modalSystem.confirm({
            title: 'Delete Product',
            message: `Are you sure you want to delete product ${codArt}?`,
            confirmText: 'Delete',
            confirmClass: 'btn-danger'
        });
        
        if (!confirmed) return;
        
        try {
            await dataService.delete('products', codArt);
            notificationSystem.show('Product deleted successfully', 'success');
            this.loadProducts();
        } catch (error) {
            notificationSystem.show('Error deleting product', 'error');
        }
    }

    /**
     * Mostra Import Wizard
     */
    async showImportWizard() {
        await importWizard.init({
            entity: 'products',
            endpoint: '/api/import-products',
            targetFields: [
                { name: 'cod_art', label: 'Product Code', required: true, type: 'text' },
                { name: 'descrizione', label: 'Description', required: true, type: 'text' },
                { name: 'descrizione_estesa', label: 'Extended Description', type: 'text' },
                { name: 'categoria', label: 'Category', type: 'text' },
                { name: 'um', label: 'Unit of Measure', type: 'text' },
                { name: 'peso_kg', label: 'Weight (kg)', type: 'number' },
                { name: 'volume_m3', label: 'Volume (m³)', type: 'number' },
                { name: 'valore_unitario', label: 'Unit Value', type: 'currency' },
                { name: 'status', label: 'Status', type: 'select' }
            ],
            validationRules: {
                cod_art: (value) => {
                    if (!/^\d{8}$/.test(value)) {
                        return 'Product code must be 8 digits';
                    }
                }
            }
        });
        
        importWizard.show();
        
        // Listen for import complete
        importWizard.events.addEventListener('importComplete', () => {
            this.loadProducts();
        });
    }

    /**
     * Esporta dati
     */
    async exportData() {
        try {
            notificationSystem.show('Preparing export...', 'info');
            
            const format = await modalSystem.prompt({
                title: 'Export Products',
                message: 'Select export format:',
                inputType: 'select',
                inputOptions: [
                    { value: 'csv', label: 'CSV' },
                    { value: 'excel', label: 'Excel' },
                    { value: 'json', label: 'JSON' }
                ]
            });
            
            if (!format) return;
            
            const data = await dataService.export('products', format, this.filters);
            
            // Download file
            const blob = new Blob([data], {
                type: format === 'json' ? 'application/json' : 
                      format === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' :
                      'text/csv'
            });
            
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `products_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : format}`;
            link.click();
            
            notificationSystem.show('Export completed', 'success');
            
        } catch (error) {
            notificationSystem.show('Export failed', 'error');
        }
    }

    /**
     * Applica filtri
     */
    applyFilters() {
        this.table.currentPage = 1;
        this.loadProducts();
    }

    /**
     * Reset filtri
     */
    resetFilters() {
        this.filters = {
            search: '',
            category: '',
            status: ''
        };
        
        document.getElementById('searchInput').value = '';
        document.getElementById('categoryFilter').value = '';
        document.getElementById('statusFilter').value = '';
        
        this.applyFilters();
    }

    /**
     * Cambia vista (table/grid)
     */
    setView(view) {
        this.currentView = view;
        
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.onclick.toString().includes(view));
        });
        
        document.getElementById('tableView').style.display = view === 'table' ? 'block' : 'none';
        document.getElementById('gridView').style.display = view === 'grid' ? 'grid' : 'none';
        
        if (view === 'grid') {
            this.renderGridView();
        }
    }

    /**
     * Renderizza vista griglia
     */
    renderGridView() {
        const grid = document.getElementById('gridView');
        const products = this.table.data || [];
        
        grid.innerHTML = products.map(product => `
            <div class="product-card">
                <div class="product-header">
                    <span class="product-code">${product.cod_art}</span>
                    <span class="badge badge-${this.getStatusClass(product.status)}">
                        ${this.formatStatus(product.status)}
                    </span>
                </div>
                <h3 class="product-name">${product.descrizione}</h3>
                ${product.descrizione_estesa ? `<p class="product-desc">${product.descrizione_estesa}</p>` : ''}
                <div class="product-details">
                    ${product.categoria ? `<div class="detail-item"><i class="icon-tag"></i> ${product.categoria}</div>` : ''}
                    ${product.peso_kg ? `<div class="detail-item"><i class="icon-weight"></i> ${product.peso_kg} kg</div>` : ''}
                    ${product.valore_unitario ? `<div class="detail-item"><i class="icon-euro-sign"></i> ${this.formatCurrency(product.valore_unitario)}</div>` : ''}
                </div>
                <div class="product-actions">
                    <button class="btn btn-sm btn-secondary" onclick="products.editProduct('${product.cod_art}')">
                        <i class="icon-edit"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="products.duplicateProduct('${product.cod_art}')">
                        <i class="icon-copy"></i> Duplicate
                    </button>
                </div>
            </div>
        `).join('');
    }

    /**
     * Setup data subscriptions
     */
    setupDataSubscriptions() {
        dataService.subscribe('products', (change) => {
            console.log('Products changed:', change);
            if (change.action !== 'read') {
                this.loadProducts();
            }
        });
    }

    /**
     * Utility functions
     */
    formatCurrency(value) {
        return new Intl.NumberFormat('it-IT', {
            style: 'currency',
            currency: 'EUR'
        }).format(value || 0);
    }

    formatNumber(value) {
        return new Intl.NumberFormat('it-IT').format(value || 0);
    }

    formatDate(dateStr) {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('it-IT');
    }

    formatStatus(status) {
        const statusMap = {
            active: 'Active',
            inactive: 'Inactive',
            discontinued: 'Discontinued'
        };
        return statusMap[status] || status;
    }

    getStatusClass(status) {
        const classMap = {
            active: 'success',
            inactive: 'warning',
            discontinued: 'danger'
        };
        return classMap[status] || 'secondary';
    }

    handleSearch(query) {
        this.filters.search = query;
        this.loadProducts();
    }
}

// Inizializza controller
const products = new ProductsController();

// Inizializza quando DOM è pronto
window.productsInit = async function() {
    await products.init();
};

// Export per uso globale
window.products = products;