// Shipments page script
import dataManager from '/core/services/data-manager.js';
import notificationSystem from '/core/notification-system.js';
import modalSystem from '/core/modal-systemV2.js';
import { HeaderComponent } from '/core/header-component.js';
import { TableManager } from '/core/table-manager.js';
import { ProductLinkingSystem } from '/core/product-linking-system.js';

class ShipmentsPage {
    constructor() {
        this.tableManager = new TableManager();
        this.productLinking = new ProductLinkingSystem();
        this.viewMode = 'grid'; // or 'list'
        this.filters = {
            status: '',
            search: ''
        };
        this.selectedShipment = null;
    }

    async init() {
        try {
            // Inizializza header
            const header = new HeaderComponent();
            await header.init();

            // Check for shipment ID in URL
            const urlParams = new URLSearchParams(window.location.search);
            const shipmentId = urlParams.get('id');
            
            if (shipmentId) {
                // Show specific shipment
                await this.showShipmentDetails(shipmentId);
            }

            // Setup UI
            this.setupEventListeners();
            
            // Carica shipments
            await this.loadShipments();

            // Setup real-time updates
            this.setupRealtimeUpdates();

        } catch (error) {
            console.error('Shipments page init error:', error);
            notificationSystem.show('Failed to initialize shipments page', 'error');
        }
    }

    setupEventListeners() {
        // View mode toggle
        const gridViewBtn = document.getElementById('grid-view-btn');
        const listViewBtn = document.getElementById('list-view-btn');
        
        if (gridViewBtn) {
            gridViewBtn.addEventListener('click', () => {
                this.viewMode = 'grid';
                this.loadShipments();
                gridViewBtn.classList.add('active');
                listViewBtn?.classList.remove('active');
            });
        }
        
        if (listViewBtn) {
            listViewBtn.addEventListener('click', () => {
                this.viewMode = 'list';
                this.loadShipments();
                listViewBtn.classList.add('active');
                gridViewBtn?.classList.remove('active');
            });
        }

        // Search
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filters.search = e.target.value;
                this.debounceSearch();
            });
        }

        // Status filter
        const statusFilter = document.getElementById('status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.filters.status = e.target.value;
                this.loadShipments();
            });
        }

        // Add shipment button
        const addBtn = document.getElementById('add-shipment-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.showAddShipmentModal());
        }
    }

    async loadShipments() {
        try {
            const loadingEl = document.getElementById('loading-indicator');
            if (loadingEl) loadingEl.style.display = 'block';

            const shipments = await dataManager.getShipments(this.filters);
            
            if (this.viewMode === 'grid') {
                this.renderShipmentsGrid(shipments);
            } else {
                this.renderShipmentsList(shipments);
            }

            this.updateStats(shipments);

        } catch (error) {
            console.error('Load shipments error:', error);
            notificationSystem.show('Failed to load shipments', 'error');
        } finally {
            const loadingEl = document.getElementById('loading-indicator');
            if (loadingEl) loadingEl.style.display = 'none';
        }
    }

    renderShipmentsGrid(shipments) {
        const container = document.getElementById('shipments-container');
        if (!container) return;

        if (shipments.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-ship fa-3x mb-3"></i>
                    <h3>No shipments found</h3>
                    <p>Shipments will appear here when you add trackings</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="shipments-grid">
                ${shipments.map(shipment => `
                    <div class="shipment-card ${shipment.auto_created ? 'auto-created' : ''}" 
                         onclick="shipmentsPage.showShipmentDetails('${shipment.id}')">
                        <div class="shipment-card-header">
                            <h4>${shipment.tracking_number || 'No Tracking'}</h4>
                            <span class="status-badge status-${shipment.status}">
                                ${shipment.status.replace('_', ' ')}
                            </span>
                        </div>
                        <div class="shipment-card-body">
                            <div class="shipment-info">
                                <i class="fas fa-plane-departure"></i>
                                <span>${shipment.origin}</span>
                            </div>
                            <div class="shipment-info">
                                <i class="fas fa-plane-arrival"></i>
                                <span>${shipment.destination}</span>
                            </div>
                            <div class="shipment-info">
                                <i class="fas fa-calendar"></i>
                                <span>ETA: ${dataManager.formatDate(shipment.estimated_delivery)}</span>
                            </div>
                            ${shipment.products && shipment.products.length > 0 ? `
                                <div class="shipment-products">
                                    <i class="fas fa-box"></i>
                                    <span>${shipment.products.length} products</span>
                                </div>
                            ` : ''}
                        </div>
                        ${shipment.auto_created ? `
                            <div class="auto-created-badge" title="Auto-created from tracking">
                                <i class="fas fa-magic"></i> Auto
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderShipmentsList(shipments) {
        const container = document.getElementById('shipments-container');
        if (!container) return;

        const tableConfig = {
            columns: [
                { 
                    key: 'tracking_number', 
                    label: 'Tracking #',
                    render: (value, row) => `
                        <a href="#" onclick="shipmentsPage.showShipmentDetails('${row.id}')">
                            ${value || 'N/A'}
                        </a>
                    `
                },
                { key: 'carrier', label: 'Carrier' },
                { 
                    key: 'status', 
                    label: 'Status',
                    render: (value) => `
                        <span class="status-badge status-${value}">
                            ${value.replace('_', ' ')}
                        </span>
                    `
                },
                { key: 'origin', label: 'From' },
                { key: 'destination', label: 'To' },
                { 
                    key: 'products',
                    label: 'Products',
                    render: (value) => value ? value.length : 0
                },
                { 
                    key: 'estimated_delivery', 
                    label: 'ETA',
                    render: (value) => dataManager.formatDate(value)
                },
                {
                    key: 'actions',
                    label: 'Actions',
                    render: (_, row) => `
                        <div class="btn-group">
                            <button class="btn btn-sm btn-outline-primary" 
                                    onclick="shipmentsPage.showShipmentDetails('${row.id}')">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-info" 
                                    onclick="shipmentsPage.editShipment('${row.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            ${!row.auto_created ? `
                                <button class="btn btn-sm btn-outline-danger" 
                                        onclick="shipmentsPage.deleteShipment('${row.id}')">
                                    <i class="fas fa-trash"></i>
                                </button>
                            ` : ''}
                        </div>
                    `
                }
            ],
            data: shipments
        };

        this.tableManager.render(container, tableConfig);
    }

    async showShipmentDetails(shipmentId) {
        try {
            const shipments = await dataManager.getShipments();
            const shipment = shipments.find(s => s.id === shipmentId);
            
            if (!shipment) {
                notificationSystem.show('Shipment not found', 'error');
                return;
            }

            this.selectedShipment = shipment;

            const modalContent = `
                <div class="shipment-details">
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <strong>Tracking Number:</strong><br>
                            ${shipment.tracking_number || 'N/A'}
                        </div>
                        <div class="col-md-6">
                            <strong>Status:</strong><br>
                            <span class="status-badge status-${shipment.status}">
                                ${shipment.status.replace('_', ' ')}
                            </span>
                        </div>
                    </div>
                    
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <strong>Origin:</strong><br>
                            ${shipment.origin}
                        </div>
                        <div class="col-md-6">
                            <strong>Destination:</strong><br>
                            ${shipment.destination}
                        </div>
                    </div>
                    
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <strong>Shipped Date:</strong><br>
                            ${dataManager.formatDate(shipment.shipped_date)}
                        </div>
                        <div class="col-md-6">
                            <strong>ETA:</strong><br>
                            ${dataManager.formatDate(shipment.estimated_delivery)}
                        </div>
                    </div>
                    
                    <hr>
                    
                    <h5>Products</h5>
                    <div id="shipment-products-list">
                        ${this.renderProductsList(shipment.products || [])}
                    </div>
                    
                    <button class="btn btn-sm btn-primary mt-2" 
                            onclick="shipmentsPage.showAddProductModal('${shipment.id}')">
                        <i class="fas fa-plus"></i> Add Product
                    </button>
                    
                    ${shipment.tracking ? `
                        <hr>
                        <h5>Tracking Events</h5>
                        <div class="tracking-timeline">
                            ${this.renderTrackingTimeline(shipment.tracking.events || [])}
                        </div>
                    ` : ''}
                </div>
            `;

            modalSystem.show({
                title: `Shipment Details - ${shipment.tracking_number || shipment.id}`,
                body: modalContent,
                size: 'large',
                buttons: [
                    {
                        text: 'Close',
                        class: 'btn-secondary',
                        action: () => modalSystem.hide()
                    }
                ]
            });

        } catch (error) {
            console.error('Show shipment details error:', error);
            notificationSystem.show('Failed to load shipment details', 'error');
        }
    }

    renderProductsList(products) {
        if (!products || products.length === 0) {
            return '<p class="text-muted">No products linked to this shipment</p>';
        }

        return `
            <div class="products-list">
                ${products.map(item => `
                    <div class="product-item">
                        <span>${item.product.name} (${item.product.sku})</span>
                        <span>Qty: ${item.quantity}</span>
                        <button class="btn btn-sm btn-outline-danger" 
                                onclick="shipmentsPage.removeProduct('${item.product.id}')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderTrackingTimeline(events) {
        if (!events || events.length === 0) {
            return '<p class="text-muted">No tracking events yet</p>';
        }

        return `
            <div class="timeline">
                ${events.map(event => `
                    <div class="timeline-item">
                        <div class="timeline-marker"></div>
                        <div class="timeline-content">
                            <strong>${event.status}</strong>
                            <p>${event.description || ''}</p>
                            <small>${dataManager.formatDate(event.timestamp)}</small>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    async showAddProductModal(shipmentId) {
        // Use existing product linking system
        await this.productLinking.showLinkingModal(shipmentId);
    }

    updateStats(shipments) {
        const stats = {
            total: shipments.length,
            pending: shipments.filter(s => s.status === 'pending').length,
            in_transit: shipments.filter(s => s.status === 'in_transit').length,
            delivered: shipments.filter(s => s.status === 'delivered').length,
            with_products: shipments.filter(s => s.products && s.products.length > 0).length
        };

        Object.keys(stats).forEach(key => {
            const el = document.getElementById(`stat-${key}`);
            if (el) el.textContent = stats[key];
        });
    }

    setupRealtimeUpdates() {
        window.addEventListener('shipmentUpdated', () => this.loadShipments());
        window.addEventListener('trackingAdded', () => this.loadShipments());
    }

    debounceSearch = (() => {
        let timeoutId;
        return () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => this.loadShipments(), 300);
        };
    })();
}

// Initialize when DOM is ready
const shipmentsPage = new ShipmentsPage();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => shipmentsPage.init());
} else {
    shipmentsPage.init();
}

// Export for global access
window.shipmentsPage = shipmentsPage;