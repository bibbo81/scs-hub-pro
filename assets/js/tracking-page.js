// Tracking page script
import dataManager from '/core/services/data-manager.js';
import notificationSystem from '/core/notification-system.js';
import modalSystem from '/core/modal-systemV2.js';
import { HeaderComponent } from '/core/header-component.js';
import { TableManager } from '/core/table-manager.js';

class TrackingPage {
    constructor() {
        this.tableManager = new TableManager();
        this.filters = {
            status: '',
            carrier: '',
            search: ''
        };
    }

    async init() {
        try {
            // Inizializza header
            const header = new HeaderComponent();
            await header.init();

            // Setup UI
            this.setupEventListeners();
            
            // Carica tracking iniziali
            await this.loadTrackings();

            // Setup real-time updates
            this.setupRealtimeUpdates();

        } catch (error) {
            console.error('Tracking page init error:', error);
            notificationSystem.show('Failed to initialize tracking page', 'error');
        }
    }

    setupEventListeners() {
        // Add tracking button
        const addBtn = document.getElementById('add-tracking-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.showAddTrackingModal());
        }

        // Search
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filters.search = e.target.value;
                this.debounceSearch();
            });
        }

        // Filters
        const statusFilter = document.getElementById('status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.filters.status = e.target.value;
                this.loadTrackings();
            });
        }

        const carrierFilter = document.getElementById('carrier-filter');
        if (carrierFilter) {
            carrierFilter.addEventListener('change', (e) => {
                this.filters.carrier = e.target.value;
                this.loadTrackings();
            });
        }

        // Refresh button
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadTrackings());
        }
    }

    async loadTrackings() {
        try {
            const loadingEl = document.getElementById('loading-indicator');
            if (loadingEl) loadingEl.style.display = 'block';

            const trackings = await dataManager.getTrackings(this.filters);
            console.log(`[DEBUG] Tracking caricati: ${trackings.length}`, trackings);
            this.renderTrackings(trackings);

            // Update stats
            this.updateStats(trackings);

        } catch (error) {
            console.error('Load trackings error:', error);
            notificationSystem.show('Failed to load trackings', 'error');
        } finally {
            const loadingEl = document.getElementById('loading-indicator');
            if (loadingEl) loadingEl.style.display = 'none';
        }
    }

    renderTrackings(trackings) {
        const container = document.getElementById('trackings-container');
        if (!container) return;

        if (trackings.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-box-open fa-3x mb-3"></i>
                    <h3>No trackings found</h3>
                    <p>Add your first tracking to get started</p>
                    <button class="btn btn-primary" onclick="trackingPage.showAddTrackingModal()">
                        <i class="fas fa-plus"></i> Add Tracking
                    </button>
                </div>
            `;
            return;
        }

        // Use table manager for rendering
        const tableConfig = {
            columns: [
                { 
                    key: 'tracking_number', 
                    label: 'Tracking #',
                    render: (value, row) => `
                        <a href="#" onclick="trackingPage.showTrackingDetails('${row.id}')">
                            ${value}
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
                { key: 'origin', label: 'Origin' },
                { key: 'destination', label: 'Destination' },
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
                            ${row.shipment ? `
                                <a href="/shipments.html?id=${row.shipment.id}" 
                                   class="btn btn-sm btn-outline-primary"
                                   title="View Shipment">
                                    <i class="fas fa-ship"></i>
                                </a>
                            ` : ''}
                            <button class="btn btn-sm btn-outline-info" 
                                    onclick="trackingPage.refreshTracking('${row.id}')"
                                    title="Refresh">
                                <i class="fas fa-sync"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" 
                                    onclick="trackingPage.deleteTracking('${row.id}')"
                                    title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    `
                }
            ],
            data: trackings
        };

        this.tableManager.render(container, tableConfig);
    }

    showAddTrackingModal() {
        const modalContent = `
            <form id="add-tracking-form">
                <div class="form-group mb-3">
                    <label>Tracking Number*</label>
                    <input type="text" class="form-control" name="tracking_number" required>
                </div>
                
                <div class="form-group mb-3">
                    <label>Carrier*</label>
                    <select class="form-control" name="carrier" required>
                        <option value="">Select carrier...</option>
                        <option value="fedex">FedEx</option>
                        <option value="ups">UPS</option>
                        <option value="dhl">DHL</option>
                        <option value="maersk">Maersk</option>
                        <option value="msc">MSC</option>
                        <option value="cma-cgm">CMA CGM</option>
                    </select>
                </div>
                
                <div class="form-group mb-3">
                    <label>Reference</label>
                    <input type="text" class="form-control" name="reference">
                </div>
                
                <div class="row">
                    <div class="col-md-6">
                        <div class="form-group mb-3">
                            <label>Origin</label>
                            <input type="text" class="form-control" name="origin">
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="form-group mb-3">
                            <label>Destination</label>
                            <input type="text" class="form-control" name="destination">
                        </div>
                    </div>
                </div>
                
                <div class="form-group mb-3">
                    <label>Notes</label>
                    <textarea class="form-control" name="notes" rows="2"></textarea>
                </div>
            </form>
        `;

        modalSystem.show({
            title: 'Add New Tracking',
            body: modalContent,
            size: 'large',
            buttons: [
                {
                    text: 'Cancel',
                    class: 'btn-secondary',
                    action: () => modalSystem.hide()
                },
                {
                    text: 'Add Tracking',
                    class: 'btn-primary',
                    action: () => this.submitAddTracking()
                }
            ]
        });
    }

    async submitAddTracking() {
        const form = document.getElementById('add-tracking-form');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const formData = new FormData(form);
        const trackingData = Object.fromEntries(formData);

        try {
            modalSystem.showLoading();
            
            const result = await dataManager.addTracking(trackingData);
            
            modalSystem.hide();
            await this.loadTrackings();
            
            // Show success with link to shipment
            if (result.shipment) {
                setTimeout(() => {
                    if (confirm('Tracking added! Would you like to view the shipment?')) {
                        window.location.href = `/shipments.html?id=${result.shipment.id}`;
                    }
                }, 500);
            }
        } catch (error) {
            modalSystem.hideLoading();
            notificationSystem.show('Failed to add tracking', 'error');
        }
    }

    async refreshTracking(id) {
        try {
            const btn = event.target;
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

            // Call refresh API
            const response = await fetch('/.netlify/functions/get-trackings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await dataManager.getAuthToken()}`
                },
                body: JSON.stringify({ trackingId: id, refresh: true })
            });

            if (response.ok) {
                notificationSystem.show('Tracking updated', 'success');
                await this.loadTrackings();
            }
        } catch (error) {
            console.error('Refresh error:', error);
            notificationSystem.show('Failed to refresh tracking', 'error');
        }
    }

    async deleteTracking(id) {
        if (!confirm('Are you sure you want to delete this tracking?')) return;

        try {
            await dataManager.deleteTracking(id);
            await this.loadTrackings();
        } catch (error) {
            console.error('Delete error:', error);
        }
    }

    updateStats(trackings) {
        // Update dashboard stats
        const stats = {
            total: trackings.length,
            pending: trackings.filter(t => t.status === 'pending').length,
            in_transit: trackings.filter(t => t.status === 'in_transit').length,
            delivered: trackings.filter(t => t.status === 'delivered').length
        };

        Object.keys(stats).forEach(key => {
            const el = document.getElementById(`stat-${key}`);
            if (el) el.textContent = stats[key];
        });
    }

    setupRealtimeUpdates() {
        // Listen for tracking updates
        window.addEventListener('trackingAdded', () => this.loadTrackings());
        window.addEventListener('trackingUpdated', () => this.loadTrackings());
        window.addEventListener('trackingDeleted', () => this.loadTrackings());
    }

    debounceSearch = (() => {
        let timeoutId;
        return () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => this.loadTrackings(), 300);
        };
    })();
}

// Initialize when DOM is ready
const trackingPage = new TrackingPage();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => trackingPage.init());
} else {
    trackingPage.init();
}

// Export for global access
window.trackingPage = trackingPage;