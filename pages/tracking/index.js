// index.js - Complete tracking page logic with all fixes

// Import the fixed TableManager
import TableManager from '/core/table-manager.js';

// State management
let trackings = [];
let filteredTrackings = [];
let tableManager = null;
let selectedTrackingIds = new Set();

// Column configuration
const AVAILABLE_COLUMNS = [
    { key: 'tracking_number', label: 'Tracking Number', required: true },
    { key: 'tracking_type', label: 'Tipo', sortable: true },
    { key: 'current_status', label: 'Stato', sortable: true },
    { key: 'carrier_name', label: 'Carrier', sortable: true },
    { key: 'origin_port', label: 'Origine', sortable: true },
    { key: 'destination_port', label: 'Destinazione', sortable: true },
    { key: 'eta', label: 'ETA', sortable: true },
    { key: 'vessel_name', label: 'Nave/Volo', sortable: true },
    { key: 'container_number', label: 'Container', sortable: true },
    { key: 'reference', label: 'Riferimento', sortable: true },
    { key: 'last_update', label: 'Ultimo Aggiornamento', sortable: true }
];

// Default visible columns
const DEFAULT_VISIBLE_COLUMNS = [
    'tracking_number',
    'tracking_type', 
    'current_status',
    'carrier_name',
    'origin_port',
    'destination_port',
    'eta'
];

// Status mapping for display
const STATUS_DISPLAY = {
    'in_transit': { label: 'In Transito', class: 'primary', icon: 'fa-truck' },
    'delivered': { label: 'Consegnato', class: 'success', icon: 'fa-check-circle' },
    'registered': { label: 'Registrato', class: 'info', icon: 'fa-clipboard-check' },
    'customs_cleared': { label: 'Sdoganato', class: 'success', icon: 'fa-stamp' },
    'delayed': { label: 'In Ritardo', class: 'danger', icon: 'fa-exclamation-triangle' },
    'exception': { label: 'Eccezione', class: 'warning', icon: 'fa-exclamation' }
};

// Column mapping (mantained from original)
const COLUMN_MAPPING = {
    'Container': 'tracking_number',
    'ContainerNumber': 'tracking_number',
    'Container Number': 'tracking_number',
    'AWB Number': 'tracking_number',
    'Tracking Number': 'tracking_number',
    'Carrier': 'carrier_code',
    'ShippingLine': 'carrier_code',
    'Shipping Line': 'carrier_code',
    'Airline': 'carrier_code',
    'CarrierName': 'carrier_name',
    'Status': 'current_status',
    'CurrentStatus': 'current_status',
    'Current Status': 'current_status',
    'Port Of Loading': 'origin_port',
    'Pol': 'origin_port',
    'POL': 'origin_port',
    'Origin': 'origin_port',
    'Port Of Discharge': 'destination_port',
    'Pod': 'destination_port',
    'POD': 'destination_port',
    'Destination': 'destination_port',
    'ETA': 'eta',
    'ETD': 'etd',
    'Reference': 'reference',
    'Booking Number': 'booking',
    'Type': 'tracking_type'
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}

async function initialize() {
    console.log('🚀 Initializing tracking page...');
    
    try {
        await waitForModules();
        await initializeComponents();
        setupEventListeners();
        await loadTrackings();
        console.log('✅ Tracking page initialized');
    } catch (error) {
        console.error('❌ Initialization error:', error);
        showError('Errore durante l\'inizializzazione della pagina');
    }
}

// Wait for required modules
async function waitForModules() {
    const maxAttempts = 30;
    let attempts = 0;
    
    while (attempts < maxAttempts) {
        const modulesReady = window.TableManager || TableManager;
        
        if (modulesReady) {
            // Ensure TableManager is available globally
            if (!window.TableManager) {
                window.TableManager = TableManager;
            }
            console.log('✅ Core modules ready');
            return;
        }
        
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    throw new Error('Required modules not loaded');
}

// Initialize components
async function initializeComponents() {
    try {
        // Initialize header
        if (window.headerComponent?.init) {
            window.headerComponent.init();
        }
        
        // Setup table with all features
        await setupTrackingTable();
        
        // Initialize filters
        setupFilters();
        
        // Initialize bulk actions
        setupBulkActions();
        
    } catch (error) {
        console.error('Error initializing components:', error);
    }
}

// Setup tracking table with TableManager
async function setupTrackingTable() {
    const container = document.getElementById('trackingTable');
    if (!container) {
        console.error('Table container not found');
        return;
    }
    
    // Get saved column preferences
    const savedColumns = getSavedColumnConfig();
    
    // Build columns configuration
    const columns = savedColumns.map(colKey => {
        const colDef = AVAILABLE_COLUMNS.find(c => c.key === colKey);
        if (!colDef) return null;
        
        return {
            key: colDef.key,
            label: colDef.label,
            sortable: colDef.sortable !== false,
            formatter: getColumnFormatter(colDef.key),
            className: colDef.className || ''
        };
    }).filter(Boolean);
    
    // Add actions column
    columns.push({
        key: 'actions',
        label: 'Azioni',
        sortable: false,
        className: 'no-drag',
        formatter: (value, row) => `
            <div class="action-buttons">
                <button class="btn-icon" onclick="viewTrackingDetails('${row.id}')" title="Dettagli">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn-icon" onclick="refreshTracking('${row.id}')" title="Aggiorna">
                    <i class="fas fa-sync-alt"></i>
                </button>
                <button class="btn-icon text-danger" onclick="deleteTracking('${row.id}')" title="Elimina">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `
    });
    
    // Create table instance
    tableManager = new TableManager('trackingTable', {
        columns: columns,
        data: [],
        pageSize: 20,
        pageSizes: [10, 20, 50, 100],
        sortable: true,
        searchable: true,
        selectable: true,
        paginate: true,
        enableColumnDrag: true,
        enableColumnManager: true,
        enableAdvancedSearch: true,
        emptyMessage: 'Nessun tracking trovato. Aggiungi un nuovo tracking per iniziare.',
        onSelectionChange: (selected) => {
            updateBulkActions(selected);
        },
        onColumnReorder: (newColumns) => {
            saveColumnConfig(newColumns.map(c => c.key));
        }
    });
    
    // Register instance globally
    window.registerTableManager('trackingTable', tableManager);
    
    // Make functions globally available
    window.viewTrackingDetails = viewTrackingDetails;
    window.refreshTracking = refreshTracking;
    window.deleteTracking = deleteTracking;
}

// Column formatters
function getColumnFormatter(key) {
    const formatters = {
        current_status: (value) => {
            const status = STATUS_DISPLAY[value] || { label: value, class: 'secondary' };
            return `
                <span class="badge badge-${status.class}">
                    <i class="fas ${status.icon}"></i> ${status.label}
                </span>
            `;
        },
        tracking_type: (value) => {
            const types = {
                'container': { label: 'Container', icon: 'fa-ship', color: 'primary' },
                'air_waybill': { label: 'Aereo', icon: 'fa-plane', color: 'info' }
            };
            const type = types[value] || { label: value, icon: 'fa-box', color: 'secondary' };
            return `
                <span class="text-${type.color}">
                    <i class="fas ${type.icon}"></i> ${type.label}
                </span>
            `;
        },
        eta: (value) => {
            if (!value) return '-';
            const date = new Date(value);
            const today = new Date();
            const diffDays = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
            
            let badgeClass = 'secondary';
            if (diffDays < 0) badgeClass = 'danger';
            else if (diffDays <= 3) badgeClass = 'warning';
            else if (diffDays <= 7) badgeClass = 'info';
            
            return `
                <span class="badge badge-${badgeClass}">
                    ${date.toLocaleDateString('it-IT')}
                    ${diffDays >= 0 ? `(${diffDays}g)` : '(Scaduto)'}
                </span>
            `;
        },
        last_update: (value) => {
            if (!value) return '-';
            const date = new Date(value);
            return `
                <small class="text-muted">
                    ${date.toLocaleDateString('it-IT')} 
                    ${date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                </small>
            `;
        }
    };
    
    return formatters[key];
}

// Load trackings from Supabase
async function loadTrackings() {
    try {
        showLoadingState();
        
        if (window.supabaseTrackingService) {
            const data = await window.supabaseTrackingService.getAllTrackings();
            trackings = data || [];
            console.log(`✅ Loaded ${trackings.length} trackings`);
        } else {
            // Fallback to mock data for testing
            trackings = getMockTrackings();
        }
        
        filteredTrackings = [...trackings];
        updateTable();
        updateStats();
        hideLoadingState();
        
    } catch (error) {
        console.error('Error loading trackings:', error);
        hideLoadingState();
        showError('Impossibile caricare i tracking');
    }
}

// Update table with current data
function updateTable() {
    if (tableManager) {
        tableManager.setData(filteredTrackings);
    }
}

// Update statistics
function updateStats() {
    const stats = {
        total: trackings.length,
        inTransit: trackings.filter(t => t.current_status === 'in_transit').length,
        delivered: trackings.filter(t => t.current_status === 'delivered').length,
        delayed: trackings.filter(t => t.current_status === 'delayed').length
    };
    
    // Update DOM
    updateStatCard('totalTrackings', stats.total);
    updateStatCard('inTransitCount', stats.inTransit);
    updateStatCard('deliveredCount', stats.delivered);
    updateStatCard('delayedCount', stats.delayed);
}

function updateStatCard(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

// Setup filters
function setupFilters() {
    const statusFilter = document.getElementById('statusFilter');
    const typeFilter = document.getElementById('typeFilter');
    const carrierFilter = document.getElementById('carrierFilter');
    
    if (statusFilter) {
        statusFilter.addEventListener('change', applyFilters);
    }
    
    if (typeFilter) {
        typeFilter.addEventListener('change', applyFilters);
    }
    
    if (carrierFilter) {
        // Populate carriers
        const carriers = [...new Set(trackings.map(t => t.carrier_name).filter(Boolean))];
        carrierFilter.innerHTML = '<option value="">Tutti i carrier</option>' +
            carriers.map(c => `<option value="${c}">${c}</option>`).join('');
        
        carrierFilter.addEventListener('change', applyFilters);
    }
}

// Apply filters
function applyFilters() {
    const status = document.getElementById('statusFilter')?.value;
    const type = document.getElementById('typeFilter')?.value;
    const carrier = document.getElementById('carrierFilter')?.value;
    
    filteredTrackings = trackings.filter(tracking => {
        if (status && tracking.current_status !== status) return false;
        if (type && tracking.tracking_type !== type) return false;
        if (carrier && tracking.carrier_name !== carrier) return false;
        return true;
    });
    
    updateTable();
}

// Reset filters
window.resetFilters = function() {
    document.getElementById('statusFilter').value = '';
    document.getElementById('typeFilter').value = '';
    document.getElementById('carrierFilter').value = '';
    filteredTrackings = [...trackings];
    updateTable();
};

// Setup bulk actions
function setupBulkActions() {
    // Select all handler is managed by TableManager
    
    // Bulk refresh
    window.bulkRefresh = async function() {
        const selected = tableManager?.getSelectedRows() || [];
        if (selected.length === 0) return;
        
        try {
            window.NotificationSystem?.info(`Aggiornamento ${selected.length} tracking...`);
            
            // TODO: Implement actual refresh logic
            for (const tracking of selected) {
                await refreshTracking(tracking.id, true);
            }
            
            window.NotificationSystem?.success('Tracking aggiornati');
            tableManager.clearSelection();
            
        } catch (error) {
            console.error('Bulk refresh error:', error);
            window.NotificationSystem?.error('Errore durante l\'aggiornamento');
        }
    };
    
    // Bulk delete
    window.bulkDelete = async function() {
        const selected = tableManager?.getSelectedRows() || [];
        if (selected.length === 0) return;
        
        const confirmed = await window.ModalSystem?.confirm({
            title: 'Conferma Eliminazione',
            message: `Vuoi eliminare ${selected.length} tracking?`,
            confirmText: 'Elimina',
            confirmClass: 'sol-btn-danger'
        });
        
        if (!confirmed) return;
        
        try {
            for (const tracking of selected) {
                await window.supabaseTrackingService?.deleteTracking(tracking.id);
            }
            
            window.NotificationSystem?.success(`${selected.length} tracking eliminati`);
            await loadTrackings();
            
        } catch (error) {
            console.error('Bulk delete error:', error);
            window.NotificationSystem?.error('Errore durante l\'eliminazione');
        }
    };
}

// Update bulk actions UI
function updateBulkActions(selected) {
    const container = document.getElementById('bulkActionsContainer');
    const count = document.getElementById('selectedCount');
    
    if (container) {
        container.style.display = selected.length > 0 ? 'flex' : 'none';
    }
    
    if (count) {
        count.textContent = selected.length;
    }
}

// View tracking details
async function viewTrackingDetails(id) {
    const tracking = trackings.find(t => t.id === id);
    if (!tracking) return;
    
    const details = `
        <div class="tracking-details">
            <div class="detail-section">
                <h4>Informazioni Generali</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>Tracking Number:</label>
                        <strong>${tracking.tracking_number}</strong>
                    </div>
                    <div class="detail-item">
                        <label>Tipo:</label>
                        <span>${getColumnFormatter('tracking_type')(tracking.tracking_type)}</span>
                    </div>
                    <div class="detail-item">
                        <label>Stato:</label>
                        <span>${getColumnFormatter('current_status')(tracking.current_status)}</span>
                    </div>
                    <div class="detail-item">
                        <label>Carrier:</label>
                        <span>${tracking.carrier_name || '-'}</span>
                    </div>
                </div>
            </div>
            
            <div class="detail-section">
                <h4>Percorso</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>Origine:</label>
                        <span>${tracking.origin_port || '-'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Destinazione:</label>
                        <span>${tracking.destination_port || '-'}</span>
                    </div>
                    <div class="detail-item">
                        <label>ETA:</label>
                        <span>${getColumnFormatter('eta')(tracking.eta)}</span>
                    </div>
                    <div class="detail-item">
                        <label>Ultimo Aggiornamento:</label>
                        <span>${getColumnFormatter('last_update')(tracking.last_update)}</span>
                    </div>
                </div>
            </div>
            
            ${tracking.events && tracking.events.length > 0 ? `
                <div class="detail-section">
                    <h4>Timeline Eventi</h4>
                    <div class="events-timeline">
                        ${tracking.events.map(event => `
                            <div class="timeline-event">
                                <div class="timeline-date">
                                    ${new Date(event.date).toLocaleDateString('it-IT')}
                                </div>
                                <div class="timeline-content">
                                    <strong>${event.description}</strong>
                                    ${event.location ? `<br><small class="text-muted">${event.location}</small>` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
    
    window.ModalSystem?.show({
        title: `Dettagli Tracking: ${tracking.tracking_number}`,
        content: details,
        size: 'lg'
    });
}

// Refresh single tracking
async function refreshTracking(id, silent = false) {
    try {
        if (!silent) {
            window.NotificationSystem?.info('Aggiornamento tracking...');
        }
        
        // TODO: Call actual API to refresh
        // For now, simulate with timeout
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (!silent) {
            window.NotificationSystem?.success('Tracking aggiornato');
        }
        
        await loadTrackings();
        
    } catch (error) {
        console.error('Refresh error:', error);
        if (!silent) {
            window.NotificationSystem?.error('Errore durante l\'aggiornamento');
        }
    }
}

// Delete tracking
async function deleteTracking(id) {
    const confirmed = await window.ModalSystem?.confirm({
        title: 'Conferma Eliminazione',
        message: 'Sei sicuro di voler eliminare questo tracking?',
        confirmText: 'Elimina',
        confirmClass: 'sol-btn-danger'
    });
    
    if (!confirmed) return;
    
    try {
        if (window.supabaseTrackingService) {
            await window.supabaseTrackingService.deleteTracking(id);
        } else {
            // Remove from local array
            trackings = trackings.filter(t => t.id !== id);
            filteredTrackings = filteredTrackings.filter(t => t.id !== id);
        }
        
        window.NotificationSystem?.success('Tracking eliminato');
        await loadTrackings();
        
    } catch (error) {
        console.error('Delete error:', error);
        window.NotificationSystem?.error('Errore durante l\'eliminazione');
    }
}

// Setup event listeners
function setupEventListeners() {
    // Add tracking button
    const addBtn = document.getElementById('addTrackingBtn');
    if (addBtn) {
        addBtn.addEventListener('click', showAddTrackingForm);
    }
    
    // Refresh all button
    window.refreshAllTrackings = async function() {
        try {
            window.NotificationSystem?.info('Aggiornamento tutti i tracking...');
            await loadTrackings();
            window.NotificationSystem?.success('Tracking aggiornati');
        } catch (error) {
            console.error('Refresh all error:', error);
            window.NotificationSystem?.error('Errore durante l\'aggiornamento');
        }
    };
    
    // Export handlers
    window.exportToExcel = function() {
        if (tableManager) {
            tableManager.export('excel');
        }
    };
    
    window.exportToPDF = function() {
        if (tableManager) {
            tableManager.export('pdf');
        }
    };
    
    // Import handler
    window.showImportDialog = function() {
        showImportModal();
    };
    
    // Column manager
    window.showColumnManager = function() {
        window.tableManagerShowColumns('trackingTable');
    };
}

// Show add tracking form
function showAddTrackingForm() {
    if (window.showEnhancedTrackingForm) {
        window.showEnhancedTrackingForm();
    } else if (window.TrackingFormProgressive) {
        new window.TrackingFormProgressive().show();
    } else {
        // Fallback simple form
        showSimpleAddForm();
    }
}

// Simple add form fallback
function showSimpleAddForm() {
    const content = `
        <form id="simpleTrackingForm">
            <div class="form-group">
                <label>Tracking Number *</label>
                <input type="text" class="form-control" name="tracking_number" required>
            </div>
            <div class="form-group">
                <label>Tipo *</label>
                <select class="form-control" name="tracking_type" required>
                    <option value="">Seleziona...</option>
                    <option value="container">Container</option>
                    <option value="air_waybill">Aereo</option>
                </select>
            </div>
            <div class="form-group">
                <label>Carrier</label>
                <input type="text" class="form-control" name="carrier_name">
            </div>
        </form>
    `;
    
    window.ModalSystem?.show({
        title: 'Aggiungi Tracking',
        content: content,
        buttons: [
            {
                text: 'Annulla',
                class: 'sol-btn-secondary',
                action: 'close'
            },
            {
                text: 'Aggiungi',
                class: 'sol-btn-primary',
                action: async () => {
                    const form = document.getElementById('simpleTrackingForm');
                    const formData = new FormData(form);
                    const data = Object.fromEntries(formData);
                    
                    try {
                        // Add to Supabase
                        if (window.supabaseTrackingService) {
                            await window.supabaseTrackingService.createTracking(data);
                        }
                        
                        window.NotificationSystem?.success('Tracking aggiunto');
                        window.ModalSystem.close();
                        await loadTrackings();
                        
                    } catch (error) {
                        console.error('Add tracking error:', error);
                        window.NotificationSystem?.error('Errore durante l\'aggiunta');
                    }
                }
            }
        ]
    });
}

// Show import modal
function showImportModal() {
    const content = `
        <div class="import-options">
            <div class="import-option" onclick="selectImportFile('csv')">
                <i class="fas fa-file-csv fa-3x text-success"></i>
                <h4>File CSV</h4>
                <p>Importa da file CSV</p>
            </div>
            <div class="import-option" onclick="selectImportFile('excel')">
                <i class="fas fa-file-excel fa-3x text-primary"></i>
                <h4>File Excel</h4>
                <p>Importa da file Excel</p>
            </div>
            <div class="import-option" onclick="downloadTemplate()">
                <i class="fas fa-download fa-3x text-info"></i>
                <h4>Template</h4>
                <p>Scarica template</p>
            </div>
        </div>
        <input type="file" id="importFile" style="display: none;" accept=".csv,.xlsx,.xls">
    `;
    
    window.ModalSystem?.show({
        title: 'Importa Tracking',
        content: content,
        size: 'lg'
    });
    
    // Make functions available
    window.selectImportFile = function(type) {
        const input = document.getElementById('importFile');
        if (input) {
            input.accept = type === 'csv' ? '.csv' : '.xlsx,.xls';
            input.onchange = async function(e) {
                if (e.target.files.length > 0) {
                    window.ModalSystem.close();
                    await importFile(e.target.files[0]);
                }
            };
            input.click();
        }
    };
    
    window.downloadTemplate = function() {
        const template = [
            ['tracking_number', 'tracking_type', 'carrier_code', 'origin_port', 'destination_port', 'status'],
            ['HLCU1234567', 'container', 'MSC', 'Shanghai', 'Genova', 'in_transit'],
            ['AWB123456789', 'air_waybill', 'DHL', 'Milano', 'New York', 'delivered']
        ];
        
        if (window.XLSX) {
            const ws = XLSX.utils.aoa_to_sheet(template);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Template');
            XLSX.writeFile(wb, 'tracking-template.xlsx');
        } else {
            window.NotificationSystem?.error('XLSX library non disponibile');
        }
    };
}

// Import file
async function importFile(file) {
    try {
        if (!window.ImportManager) {
            window.NotificationSystem?.error('Import manager non disponibile');
            return;
        }
        
        window.NotificationSystem?.info('Importazione in corso...');
        
        const result = await window.ImportManager.importFile(file, {
            columnMapping: COLUMN_MAPPING,
            statusMapping: getStatusMapping()
        });
        
        if (result.success) {
            window.NotificationSystem?.success(`Importati ${result.imported} tracking`);
            await loadTrackings();
        } else {
            window.NotificationSystem?.error('Errore durante l\'importazione');
        }
        
    } catch (error) {
        console.error('Import error:', error);
        window.NotificationSystem?.error('Errore durante l\'importazione: ' + error.message);
    }
}

// Get status mapping for import
function getStatusMapping() {
    // Reverse the display mapping for import
    const mapping = {};
    Object.entries(STATUS_DISPLAY).forEach(([key, value]) => {
        mapping[value.label.toLowerCase()] = key;
    });
    
    // Add additional mappings
    Object.assign(mapping, {
        'sailing': 'in_transit',
        'in transit': 'in_transit',
        'in transito': 'in_transit',
        'delivered': 'delivered',
        'consegnato': 'delivered',
        'consegnata': 'delivered',
        'empty': 'delivered',
        'empty returned': 'delivered',
        'customs cleared': 'customs_cleared',
        'sdoganata': 'customs_cleared',
        'registered': 'registered',
        'pending': 'registered',
        'booked': 'registered',
        'delayed': 'delayed',
        'exception': 'exception'
    });
    
    return mapping;
}

// Column configuration management
function getSavedColumnConfig() {
    try {
        const saved = localStorage.getItem('trackingColumnsConfig');
        if (saved) {
            const config = JSON.parse(saved);
            // Validate columns still exist
            return config.filter(col => AVAILABLE_COLUMNS.some(c => c.key === col));
        }
    } catch (e) {
        console.error('Error loading column config:', e);
    }
    
    return [...DEFAULT_VISIBLE_COLUMNS];
}

function saveColumnConfig(columns) {
    try {
        localStorage.setItem('trackingColumnsConfig', JSON.stringify(columns));
    } catch (e) {
        console.error('Error saving column config:', e);
    }
}

// UI state management
function showLoadingState() {
    const container = document.getElementById('trackingTable');
    if (container) {
        container.innerHTML = `
            <div class="text-center p-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="sr-only">Caricamento...</span>
                </div>
                <p class="mt-3">Caricamento tracking...</p>
            </div>
        `;
    }
}

function hideLoadingState() {
    // Table will be rendered by TableManager
}

function showError(message) {
    if (window.NotificationSystem) {
        window.NotificationSystem.error(message);
    } else {
        alert(message);
    }
}

// Mock data for testing
function getMockTrackings() {
    return [
        {
            id: '1',
            tracking_number: 'HLCU1234567',
            tracking_type: 'container',
            current_status: 'in_transit',
            carrier_code: 'MSC',
            carrier_name: 'MSC',
            origin_port: 'Shanghai',
            destination_port: 'Genova',
            eta: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
            vessel_name: 'MSC Oscar',
            last_update: new Date().toISOString()
        },
        {
            id: '2',
            tracking_number: 'AWB123456789',
            tracking_type: 'air_waybill',
            current_status: 'delivered',
            carrier_code: 'DHL',
            carrier_name: 'DHL Express',
            origin_port: 'Milano',
            destination_port: 'New York',
            eta: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            last_update: new Date().toISOString()
        }
    ];
}

// Export initialization
export default initialize;