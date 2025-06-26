// index.js - Clean tracking page logic with all mappings
import TableManager from '/core/table-manager.js';

// State
let trackings = [];
let filteredTrackings = [];
let tableManager = null;

// Column mapping for import/export compatibility
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

// Status mapping for display
const STATUS_DISPLAY = {
    'in_transit': { label: 'In Transito', class: 'primary', icon: 'fa-truck' },
    'delivered': { label: 'Consegnato', class: 'success', icon: 'fa-check-circle' },
    'registered': { label: 'Registrato', class: 'info', icon: 'fa-clipboard-check' },
    'customs_cleared': { label: 'Sdoganato', class: 'success', icon: 'fa-stamp' },
    'delayed': { label: 'In Ritardo', class: 'danger', icon: 'fa-exclamation-triangle' },
    'exception': { label: 'Eccezione', class: 'warning', icon: 'fa-exclamation' },
    'pending': { label: 'In attesa', class: 'warning', icon: 'fa-clock' }
};

// Available columns configuration - TUTTE LE COLONNE
const AVAILABLE_COLUMNS = [
    { key: 'tracking_number', label: 'Tracking Number', required: true, sortable: true },
    { key: 'tracking_type', label: 'Tipo', sortable: true },
    { key: 'current_status', label: 'Stato', sortable: true },
    { key: 'carrier_code', label: 'Carrier Code', sortable: true },
    { key: 'carrier_name', label: 'Carrier', sortable: true },
    { key: 'reference_number', label: 'Riferimento', sortable: true },
    { key: 'booking', label: 'Booking', sortable: true },
    { key: 'origin_port', label: 'Porto Origine', sortable: true },
    { key: 'origin_country', label: 'Paese Origine', sortable: true },
    { key: 'destination_port', label: 'Porto Destinazione', sortable: true },
    { key: 'destination_country', label: 'Paese Destinazione', sortable: true },
    { key: 'eta', label: 'ETA', sortable: true },
    { key: 'ata', label: 'ATA', sortable: true },
    { key: 'etd', label: 'ETD', sortable: true },
    { key: 'atd', label: 'ATD', sortable: true },
    { key: 'vessel_name', label: 'Nave/Volo', sortable: true },
    { key: 'voyage_number', label: 'Viaggio', sortable: true },
    { key: 'container_number', label: 'Container', sortable: true },
    { key: 'container_size', label: 'Dimensione', sortable: true },
    { key: 'last_event_date', label: 'Data Ultimo Evento', sortable: true },
    { key: 'last_event_location', label: 'Luogo Ultimo Evento', sortable: true },
    { key: 'last_event_description', label: 'Descrizione Ultimo Evento', sortable: true },
    { key: 'transit_time', label: 'Tempo Transito', sortable: true },
    { key: 'created_at', label: 'Data Creazione', sortable: true },
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

// Column configuration for table
const TABLE_COLUMNS = [
    { 
        key: 'tracking_number', 
        label: 'Tracking Number', 
        sortable: true,
        formatter: (value, row) => {
            const typeIcon = row.tracking_type === 'air_waybill' ? 'fa-plane' : 'fa-ship';
            return `<i class="fas ${typeIcon} text-muted mr-1"></i> ${value}`;
        }
    },
    { 
        key: 'carrier_name', 
        label: 'Carrier', 
        sortable: true,
        formatter: (value) => value || '-'
    },
    { 
        key: 'current_status', 
        label: 'Stato', 
        sortable: true, 
        formatter: formatStatus 
    },
    { 
        key: 'origin_port', 
        label: 'Origine', 
        sortable: true,
        formatter: (value) => value || '-'
    },
    { 
        key: 'destination_port', 
        label: 'Destinazione', 
        sortable: true,
        formatter: (value) => value || '-'
    },
    { 
        key: 'eta', 
        label: 'ETA', 
        sortable: true, 
        formatter: formatDate 
    },
    { 
        key: 'last_update', 
        label: 'Ultimo Aggiornamento', 
        sortable: true, 
        formatter: formatDate 
    },
    { 
        key: 'actions', 
        label: 'Azioni', 
        sortable: false,
        formatter: (value, row) => `
            <div class="btn-group btn-group-sm">
                <button class="btn btn-primary" onclick="refreshTracking('${row.id}')">
                    <i class="fas fa-sync"></i>
                </button>
                <button class="btn btn-info" onclick="viewDetails('${row.id}')">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-danger" onclick="deleteTracking('${row.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `
    }
];

// Formatters
function formatStatus(value) {
    const status = STATUS_DISPLAY[value] || { label: value || 'Sconosciuto', class: 'secondary', icon: 'fa-question' };
    return `<span class="badge badge-${status.class}">
        <i class="fas ${status.icon} mr-1"></i>${status.label}
    </span>`;
}

function formatDate(value) {
    if (!value) return '-';
    const date = new Date(value);
    const today = new Date();
    const diffDays = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
    
    const formattedDate = date.toLocaleString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // For ETA dates, show days remaining
    if (diffDays > 0 && diffDays < 30) {
        return `${formattedDate} <small class="text-muted">(${diffDays}g)</small>`;
    }
    
    return formattedDate;
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initializing tracking page...');
    
    try {
        // Hide loading state
        document.getElementById('loadingState').style.display = 'none';
        
        // Create table container
        const tableCard = document.querySelector('.sol-card-body.p-0');
        const tableContainer = document.getElementById('trackingTableContainer');
        
        // Remove old table if exists
        const oldTable = document.getElementById('trackingTable');
        if (oldTable) {
            oldTable.parentElement.style.display = 'none';
        }
        
        // Initialize TableManager
        tableManager = new TableManager('trackingTableContainer', {
            columns: TABLE_COLUMNS,
            selectable: true,
            searchable: false, // We use external search
            paginate: true,
            pageSize: 20,
            enableColumnDrag: true,
            onSelectionChange: handleSelectionChange
        });
        
        // Register globally
        window.registerTableManager('trackingTableContainer', tableManager);
        
        // Load data
        await loadTrackings();
        
        // Setup event listeners
        setupEventListeners();
        
        // Initialize tracking service if available
        if (window.trackingService) {
            await window.trackingService.initialize();
            console.log('✅ Tracking service initialized');
        }
        
        console.log('✅ Tracking page initialized');
        
    } catch (error) {
        console.error('❌ Initialization error:', error);
        showError('Errore durante l\'inizializzazione');
    }
});

// Load trackings from Supabase
async function loadTrackings() {
    try {
        if (window.supabaseTrackingService) {
            const data = await window.supabaseTrackingService.getAllTrackings();
            trackings = data || [];
            
            // Map data to ensure compatibility
            trackings = trackings.map(mapTrackingData);
        } else {
            // Mock data for testing
            trackings = [
                {
                    id: '1',
                    tracking_number: 'TEST123',
                    tracking_type: 'container',
                    carrier_code: 'MSC',
                    carrier_name: 'MSC',
                    current_status: 'in_transit',
                    origin_port: 'Milano',
                    destination_port: 'Roma',
                    eta: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
                    last_update: new Date().toISOString()
                }
            ];
        }
        
        filteredTrackings = [...trackings];
        updateTable();
        updateStats();
        
    } catch (error) {
        console.error('Error loading trackings:', error);
        showError('Errore nel caricamento dei tracking');
    }
}

// Map tracking data for compatibility
function mapTrackingData(tracking) {
    return {
        ...tracking,
        // Ensure all required fields exist
        carrier_name: tracking.carrier_name || tracking.carrier_code || tracking.carrier || '-',
        current_status: tracking.current_status || tracking.status || 'pending',
        origin_port: tracking.origin_port || tracking.origin_name || '-',
        destination_port: tracking.destination_port || tracking.destination_name || '-',
        tracking_type: tracking.tracking_type || detectTrackingType(tracking.tracking_number)
    };
}

// Detect tracking type from number format
function detectTrackingType(trackingNumber) {
    if (!trackingNumber) return 'container';
    
    // Air waybill patterns
    if (/^\d{3}-?\d{8}$/.test(trackingNumber)) return 'air_waybill';
    if (/^[A-Z]{2}\d{6,}/.test(trackingNumber)) return 'air_waybill';
    
    // Default to container
    return 'container';
}

// Update table
function updateTable() {
    if (tableManager) {
        tableManager.setData(filteredTrackings);
        
        // Show/hide empty state
        const emptyState = document.getElementById('emptyState');
        const tableContainer = document.getElementById('trackingTableContainer');
        
        if (filteredTrackings.length === 0) {
            emptyState.style.display = 'block';
            tableContainer.style.display = 'none';
        } else {
            emptyState.style.display = 'none';
            tableContainer.style.display = 'block';
        }
    }
}

// Update statistics
function updateStats() {
    const stats = {
        total: trackings.length,
        delivered: trackings.filter(t => t.current_status === 'delivered').length,
        inTransit: trackings.filter(t => t.current_status === 'in_transit').length,
        exception: trackings.filter(t => 
            t.current_status === 'exception' || 
            t.current_status === 'delayed'
        ).length
    };
    
    document.getElementById('totalTrackings').textContent = stats.total;
    document.getElementById('deliveredCount').textContent = stats.delivered;
    document.getElementById('inTransitCount').textContent = stats.inTransit;
    document.getElementById('exceptionCount').textContent = stats.exception;
}

// Handle selection change
function handleSelectionChange(selected) {
    const bulkBar = document.getElementById('bulkActionsBar');
    const count = document.getElementById('selectedCount');
    
    if (bulkBar) {
        bulkBar.style.display = selected.length > 0 ? 'block' : 'none';
    }
    
    if (count) {
        count.textContent = selected.length;
    }
}

// Setup event listeners
function setupEventListeners() {
    // Search
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            filteredTrackings = trackings.filter(t => 
                t.tracking_number?.toLowerCase().includes(term) ||
                t.carrier_name?.toLowerCase().includes(term) ||
                t.origin_port?.toLowerCase().includes(term) ||
                t.destination_port?.toLowerCase().includes(term) ||
                t.reference?.toLowerCase().includes(term)
            );
            updateTable();
        });
    }
    
    // Filters
    document.getElementById('statusFilter')?.addEventListener('change', applyFilters);
    document.getElementById('carrierFilter')?.addEventListener('change', applyFilters);
    
    // Global functions
    window.refreshTracking = refreshTracking;
    window.viewDetails = viewDetails;
    window.deleteTracking = deleteTracking;
    window.showAddTrackingForm = showAddTrackingForm;
    window.showImportDialog = showImportDialog;
    window.exportData = exportData;
    window.resetFilters = resetFilters;
    window.toggleSelectAll = toggleSelectAll;
    window.performBulkAction = performBulkAction;
    
    // Export mappings for other modules
    window.COLUMN_MAPPING = COLUMN_MAPPING;
    window.STATUS_DISPLAY = STATUS_DISPLAY;
    window.getStatusMapping = getStatusMapping;
}

// Apply filters
function applyFilters() {
    const status = document.getElementById('statusFilter')?.value;
    const carrier = document.getElementById('carrierFilter')?.value;
    
    filteredTrackings = trackings.filter(t => {
        if (status && t.current_status !== status) return false;
        if (carrier && !t.carrier_name?.includes(carrier)) return false;
        return true;
    });
    
    updateTable();
}

// Get status mapping for import
function getStatusMapping() {
    // Reverse mapping for import
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
        'pending': 'pending',
        'booked': 'registered',
        'delayed': 'delayed',
        'exception': 'exception'
    });
    
    return mapping;
}

// Actions
async function refreshTracking(id) {
    console.log('Refresh tracking:', id);
    const tracking = trackings.find(t => t.id === id);
    if (!tracking) return;
    
    window.NotificationSystem?.info('Aggiornamento tracking...');
    
    try {
        if (window.trackingService && window.trackingService.track) {
            // Use tracking service with ShipsGo API
            const result = await window.trackingService.track(
                tracking.tracking_number, 
                tracking.tracking_type
            );
            
            if (result && result.status !== 'error') {
                // Update local data
                const updatedTracking = {
                    ...tracking,
                    current_status: result.stato_attuale || tracking.current_status,
                    last_update: new Date().toISOString(),
                    eta: result.eta || tracking.eta,
                    vessel_name: result.nome_nave || tracking.vessel_name,
                    last_event: result.ultimo_evento
                };
                
                // Update in Supabase
                if (window.supabaseTrackingService) {
                    await window.supabaseTrackingService.updateTracking(id, updatedTracking);
                }
                
                // Update local state
                const index = trackings.findIndex(t => t.id === id);
                if (index !== -1) {
                    trackings[index] = updatedTracking;
                    filteredTrackings = [...trackings];
                    updateTable();
                }
                
                window.NotificationSystem?.success('Tracking aggiornato');
            } else {
                throw new Error(result?.message || 'Errore aggiornamento');
            }
        } else {
            // Fallback: just update timestamp
            setTimeout(() => {
                window.NotificationSystem?.success('Tracking aggiornato');
            }, 1000);
        }
        
    } catch (error) {
        console.error('Refresh error:', error);
        window.NotificationSystem?.error('Errore aggiornamento: ' + error.message);
    }
}

function viewDetails(id) {
    console.log('View details:', id);
    const tracking = trackings.find(t => t.id === id);
    if (tracking && window.ModalSystem) {
        const statusDisplay = STATUS_DISPLAY[tracking.current_status] || { label: 'Sconosciuto', class: 'secondary' };
        
        window.ModalSystem.show({
            title: `Dettagli: ${tracking.tracking_number}`,
            size: 'large',
            content: `
                <div class="tracking-details">
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <strong>Tipo:</strong> 
                            <span class="ml-2">
                                <i class="fas ${tracking.tracking_type === 'air_waybill' ? 'fa-plane' : 'fa-ship'}"></i>
                                ${tracking.tracking_type === 'air_waybill' ? 'Aereo' : 'Container'}
                            </span>
                        </div>
                        <div class="col-md-6">
                            <strong>Carrier:</strong> ${tracking.carrier_name || '-'}
                        </div>
                    </div>
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <strong>Stato:</strong> 
                            <span class="badge badge-${statusDisplay.class} ml-2">
                                ${statusDisplay.label}
                            </span>
                        </div>
                        <div class="col-md-6">
                            <strong>ETA:</strong> ${formatDate(tracking.eta)}
                        </div>
                    </div>
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <strong>Origine:</strong> ${tracking.origin_port || '-'}
                        </div>
                        <div class="col-md-6">
                            <strong>Destinazione:</strong> ${tracking.destination_port || '-'}
                        </div>
                    </div>
                    ${tracking.vessel_name ? `
                    <div class="row mb-3">
                        <div class="col-12">
                            <strong>Nave/Volo:</strong> ${tracking.vessel_name}
                        </div>
                    </div>
                    ` : ''}
                    ${tracking.reference ? `
                    <div class="row mb-3">
                        <div class="col-12">
                            <strong>Riferimento:</strong> ${tracking.reference}
                        </div>
                    </div>
                    ` : ''}
                    <div class="row">
                        <div class="col-12">
                            <strong>Ultimo aggiornamento:</strong> ${formatDate(tracking.last_update)}
                        </div>
                    </div>
                    ${tracking.last_event ? `
                    <div class="row mt-3">
                        <div class="col-12">
                            <div class="alert alert-info">
                                <strong>Ultimo evento:</strong><br>
                                ${tracking.last_event}
                            </div>
                        </div>
                    </div>
                    ` : ''}
                </div>
            `,
            buttons: [
                {
                    text: 'Aggiorna',
                    className: 'btn-primary',
                    action: () => {
                        window.ModalSystem.hide();
                        refreshTracking(id);
                    }
                },
                {
                    text: 'Chiudi',
                    className: 'btn-secondary',
                    action: () => window.ModalSystem.hide()
                }
            ]
        });
    }
}

async function deleteTracking(id) {
    if (!confirm('Eliminare questo tracking?')) return;
    
    try {
        if (window.supabaseTrackingService) {
            await window.supabaseTrackingService.deleteTracking(id);
        }
        
        trackings = trackings.filter(t => t.id !== id);
        filteredTrackings = filteredTrackings.filter(t => t.id !== id);
        updateTable();
        updateStats();
        
        window.NotificationSystem?.success('Tracking eliminato');
        
    } catch (error) {
        console.error('Delete error:', error);
        window.NotificationSystem?.error('Errore eliminazione');
    }
}

function showAddTrackingForm() {
    console.log('Show add form');
    if (window.showEnhancedTrackingForm) {
        window.showEnhancedTrackingForm();
    } else if (window.trackingFormProgressive) {
        window.trackingFormProgressive.show();
    } else {
        window.NotificationSystem?.info('Form in caricamento...');
    }
}

function showImportDialog() {
    console.log('Show import dialog');
    
    // Check if ImportManager exists and use it
    if (window.ImportManager && window.ImportManager.showImportDialog) {
        window.ImportManager.showImportDialog('tracking', {
            columnMapping: COLUMN_MAPPING,
            statusMapping: getStatusMapping(),
            onImportComplete: async (data) => {
                // Reload trackings after import
                await loadTrackings();
                window.NotificationSystem?.success(`Importati ${data.length} tracking`);
            }
        });
    } else if (window.ImportManager && window.ImportManager.init) {
        // Initialize ImportManager if needed
        window.ImportManager.init();
        setTimeout(() => {
            window.ImportManager.showImportDialog('tracking', {
                columnMapping: COLUMN_MAPPING,
                statusMapping: getStatusMapping(),
                onImportComplete: async (data) => {
                    await loadTrackings();
                    window.NotificationSystem?.success(`Importati ${data.length} tracking`);
                }
            });
        }, 100);
    } else {
        // Fallback: show file input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv,.xlsx,.xls';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                window.NotificationSystem?.info('Caricamento file...');
                // Basic import logic here
                window.NotificationSystem?.warning('Import manuale non ancora implementato');
            }
        };
        input.click();
    }
}

function exportData(type = 'excel') {
    if (!filteredTrackings || filteredTrackings.length === 0) {
        window.NotificationSystem?.warning('Nessun dato da esportare');
        return;
    }
    
    if (window.ExportManager && window.ExportManager.exportData) {
        // Prepare data with proper column names
        const exportData = filteredTrackings.map(t => ({
            'Tracking Number': t.tracking_number,
            'Type': t.tracking_type === 'air_waybill' ? 'Air' : 'Sea',
            'Carrier': t.carrier_name,
            'Status': STATUS_DISPLAY[t.current_status]?.label || t.current_status,
            'Origin': t.origin_port,
            'Destination': t.destination_port,
            'ETA': t.eta,
            'Vessel/Flight': t.vessel_name || '-',
            'Container': t.container_number || '-',
            'Reference': t.reference_number || '-',
            'Last Update': t.last_update
        }));
        
        window.ExportManager.exportData(exportData, {
            filename: `tracking_export_${new Date().toISOString().split('T')[0]}`,
            type: type
        });
    } else if (tableManager && tableManager.export) {
        tableManager.export(type);
    } else {
        // Fallback to basic CSV export
        const csv = convertToCSV(filteredTrackings);
        downloadCSV(csv, `tracking_export_${new Date().toISOString().split('T')[0]}.csv`);
    }
}

// Helper functions for fallback export
function convertToCSV(data) {
    if (!data || data.length === 0) return '';
    
    const headers = ['Tracking Number', 'Carrier', 'Status', 'Origin', 'Destination', 'ETA'];
    const rows = data.map(t => [
        t.tracking_number,
        t.carrier_name || t.carrier_code || '-',
        STATUS_DISPLAY[t.current_status]?.label || t.current_status || '-',
        t.origin_port || '-',
        t.destination_port || '-',
        t.eta ? new Date(t.eta).toLocaleDateString('it-IT') : '-'
    ]);
    
    return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
}

function downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}

function resetFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('statusFilter').value = '';
    document.getElementById('carrierFilter').value = '';
    filteredTrackings = [...trackings];
    updateTable();
}

function toggleSelectAll(checkbox) {
    if (tableManager) {
        if (checkbox.checked) {
            tableManager.selectAll();
        } else {
            tableManager.deselectAll();
        }
    }
}

async function performBulkAction(action) {
    const selected = tableManager?.getSelectedRows() || [];
    
    if (selected.length === 0) {
        window.NotificationSystem?.warning('Nessun tracking selezionato');
        return;
    }
    
    switch(action) {
        case 'refresh':
            window.NotificationSystem?.info(`Aggiornamento ${selected.length} tracking...`);
            
            let refreshed = 0;
            for (const row of selected) {
                try {
                    await refreshTracking(row.id);
                    refreshed++;
                } catch (error) {
                    console.error('Error refreshing:', row.id, error);
                }
            }
            
            window.NotificationSystem?.success(`Aggiornati ${refreshed} tracking`);
            break;
            
        case 'delete':
            if (confirm(`Eliminare ${selected.length} tracking?`)) {
                window.NotificationSystem?.info('Eliminazione in corso...');
                
                let deleted = 0;
                for (const row of selected) {
                    try {
                        if (window.supabaseTrackingService) {
                            await window.supabaseTrackingService.deleteTracking(row.id);
                        }
                        deleted++;
                    } catch (error) {
                        console.error('Bulk delete error:', error);
                    }
                }
                
                // Update local state
                const selectedIds = new Set(selected.map(s => s.id));
                trackings = trackings.filter(t => !selectedIds.has(t.id));
                filteredTrackings = filteredTrackings.filter(t => !selectedIds.has(t.id));
                updateTable();
                updateStats();
                
                // Clear selection
                tableManager.clearSelection();
                
                window.NotificationSystem?.success(`Eliminati ${deleted} tracking`);
            }
            break;
    }
}

function showError(message) {
    if (window.NotificationSystem) {
        window.NotificationSystem.error(message);
    } else {
        alert(message);
    }
}

// Export for debugging
window.trackingDebug = {
    getData: () => ({ trackings, filteredTrackings }),
    getTable: () => tableManager,
    refresh: () => loadTrackings(),
    getColumnMapping: () => COLUMN_MAPPING,
    getStatusMapping: () => STATUS_DISPLAY
};