// /pages/tracking/index.js - Logica specifica per la pagina tracking
// FIX: Import corretti per i moduli
import TableManager from '../../core/table-manager.js';
import modalSystem from '../../core/modal-system.js';
import notificationSystem from '../../core/notification-system.js';

// Tracking patterns
const TRACKING_PATTERNS = {
    container: /^[A-Z]{4}\d{7}$/,
    bl: /^[A-Z]{4}\d{8,12}$/,
    awb: /^\d{3}-\d{8}$/,
    parcel: /^[A-Z0-9]{10,30}$/
};

// Status mapping consolidato basato sui tuoi dati Google Sheets
const STATUS_MAPPING = {
    // In Transit
    'Sailing': 'in_transit',
    'In Transit': 'in_transit',
    'In transito': 'in_transit',
    'At local FedEx facility': 'in_transit',
    'Departed FedEx hub': 'in_transit',
    'On the way': 'in_transit',
    'Arrived at FedEx hub': 'in_transit',
    'At destination sort facility': 'in_transit',
    'Left FedEx origin facility': 'in_transit',
    'Picked up': 'in_transit',
    'Arrivata nella Sede GLS locale.': 'in_transit',
    'In transito.': 'in_transit',
    'Partita dalla sede mittente. In transito.': 'in_transit',
    'La spedizione è in transito': 'in_transit',
    
    // Arrived/Discharged (nuovo stato)
    'Arrived': 'arrived',
    'Arrivata': 'arrived',
    'Discharged': 'arrived',
    'Scaricato': 'arrived',
    
    // Out for Delivery
    'On FedEx vehicle for delivery': 'out_for_delivery',
    'Consegna prevista nel corso della giornata odierna.': 'out_for_delivery',
    'La spedizione è in consegna': 'out_for_delivery',
    'In consegna': 'out_for_delivery',
    
    // Delivered
    'Delivered': 'delivered',
    'Consegnato': 'delivered',
    'LA spedizione è stata consegnata': 'delivered',
    'Consegnata.': 'delivered',
    'La spedizione è stata consegnata': 'delivered',
    'Empty': 'delivered',
    'Empty Returned': 'delivered',
    'POD': 'delivered',
    
    // Customs
    'International shipment release - Import': 'customs_cleared',
    'Sdoganata': 'customs_cleared',
    
    // Registered
    'Shipment information sent to FedEx': 'registered',
    'Spedizione creata': 'registered',
    'La spedizione e\' stata creata dal mittente, attendiamo che ci venga affidata per l\'invio a destinazione.': 'registered',
    'Registered': 'registered',
    'Pending': 'registered',
    'Booked': 'registered',
    'Booking Confirmed': 'registered'
};

// Global state
let trackingTable = null;
let trackings = [];
let statsCards = [];
let currentColumns = [
    'tracking_number',
    'tracking_type',
    'carrier_code',
    'status',
    'origin_port',
    'destination_port',
    'eta',
    'created_at',
    'actions'
];

// Column definitions
const availableColumns = [
    // Colonne Base
    { key: 'tracking_number', label: 'Numero Tracking', visible: true, order: 0, required: true },
    { key: 'tracking_type', label: 'Tipo', visible: true, order: 1 },
    { key: 'carrier_code', label: 'Vettore', visible: true, order: 2 },
    { key: 'status', label: 'Stato', visible: true, order: 3 },
    { key: 'origin_port', label: 'Origine', visible: true, order: 4 },
    { key: 'destination_port', label: 'Destinazione', visible: true, order: 5 },
    { key: 'reference_number', label: 'Riferimento', visible: true, order: 6 },
    
    // Colonne ShipsGo Mare
    { key: 'booking', label: 'Booking', visible: false, order: 7 },
    { key: 'container_count', label: 'Container Count', visible: false, order: 8 },
    { key: 'port_of_loading', label: 'Port Of Loading', visible: false, order: 9 },
    { key: 'date_of_loading', label: 'Date Of Loading', visible: false, order: 10 },
    { key: 'pol_country', label: 'POL Country', visible: false, order: 11 },
    { key: 'pol_country_code', label: 'POL Country Code', visible: false, order: 12 },
    { key: 'port_of_discharge', label: 'Port Of Discharge', visible: false, order: 13 },
    { key: 'date_of_discharge', label: 'Date Of Discharge', visible: false, order: 14 },
    { key: 'pod_country', label: 'POD Country', visible: false, order: 15 },
    { key: 'pod_country_code', label: 'POD Country Code', visible: false, order: 16 },
    { key: 'co2_emission', label: 'CO₂ Emission (Tons)', visible: false, order: 17 },
    { key: 'tags', label: 'Tags', visible: false, order: 18 },
    { key: 'created_at_shipsgo', label: 'Created At', visible: false, order: 19 },
    
    // Colonne ShipsGo Air  
    { key: 'awb_number', label: 'AWB Number', visible: false, order: 20 },
    { key: 'airline', label: 'Airline', visible: false, order: 21 },
    { key: 'origin', label: 'Origin', visible: false, order: 22 },
    { key: 'origin_name', label: 'Origin Name', visible: false, order: 23 },
    { key: 'date_of_departure', label: 'Date Of Departure', visible: false, order: 24 },
    { key: 'origin_country', label: 'Origin Country', visible: false, order: 25 },
    { key: 'origin_country_code', label: 'Origin Country Code', visible: false, order: 26 },
    { key: 'destination', label: 'Destination', visible: false, order: 27 },
    { key: 'destination_name', label: 'Destination Name', visible: false, order: 28 },
    { key: 'date_of_arrival', label: 'Date Of Arrival', visible: false, order: 29 },
    { key: 'destination_country', label: 'Destination Country', visible: false, order: 30 },
    { key: 'destination_country_code', label: 'Destination Country Code', visible: false, order: 31 },
    { key: 'transit_time', label: 'Transit Time', visible: false, order: 32 },
    { key: 't5_count', label: 'T5 Count', visible: false, order: 33 },
    
    // Colonne Sistema
    { key: 'last_event_location', label: 'Ultima Posizione', visible: true, order: 34 },
    { key: 'eta', label: 'ETA', visible: true, order: 35 },
    { key: 'created_at', label: 'Data Inserimento', visible: true, order: 36 },
    
    // Actions column
    { key: 'actions', label: 'Azioni', visible: true, order: 37, required: true, isAction: true }
];

// Default columns (saved in localStorage)
const DEFAULT_COLUMNS = ['tracking_number', 'tracking_type', 'carrier_code', 'status', 'origin_port', 'destination_port', 'eta', 'created_at', 'actions'];

// Esponi le funzioni necessarie
window.refreshTracking = (id) => handleRefreshTracking(id);
window.viewTimeline = (id) => handleViewTimeline(id);
window.deleteTracking = (id) => handleDeleteTracking(id);
window.showColumnManager = showColumnManager;
window.toggleAllColumns = toggleAllColumns;
window.applyColumnChanges = applyColumnChanges;
window.resetDefaultColumns = resetDefaultColumns;

// Initialize page
window.trackingInit = async function() {
    console.log('[Tracking] Initializing page...');
    
    // Riesponi le funzioni per sicurezza
    window.showAddTrackingForm = showAddTrackingForm;
    window.refreshAllTrackings = refreshAllTrackings;
    window.exportToPDF = exportToPDF;
    window.exportToExcel = exportToExcel;
    window.showColumnManager = showColumnManager;
    
    // Load saved columns
    loadSavedColumns();
    
    // Setup page components
    setupStatsCards();
    setupTrackingTable();
    setupEventListeners();
    
    // Load initial data
    await loadTrackings();
    
    // Start auto-refresh
    startAutoRefresh();
    
    // Listen for tracking updates from import
    window.addEventListener('trackingsUpdated', async (event) => {
        console.log('[Tracking] Trackings updated from import');
        await loadTrackings();
    });
    
    console.log('[Tracking] Page initialized successfully');
};

// Load saved column preferences
function loadSavedColumns() {
    const saved = localStorage.getItem('trackingColumns');
    if (saved) {
        try {
            currentColumns = JSON.parse(saved);
        } catch (e) {
            currentColumns = [...DEFAULT_COLUMNS];
        }
    } else {
        currentColumns = [...DEFAULT_COLUMNS];
    }
}

// Show column manager modal
function showColumnManager() {
    const content = `
        <div class="column-manager">
            <div class="column-manager-header">
                <p>Seleziona e riordina le colonne da visualizzare</p>
                <button class="btn btn-sm btn-secondary" onclick="toggleAllColumns()">
                    <i class="icon-check-square"></i> Seleziona/Deseleziona Tutto
                </button>
            </div>
            <div class="column-list" id="columnList">
                ${availableColumns.map(col => {
                    const isChecked = currentColumns.includes(col.key);
                    const isRequired = col.required;
                    return `
                        <div class="column-item ${isRequired ? 'required' : ''}" data-column="${col.key}">
                            <div class="column-drag-handle" ${isRequired ? 'style="visibility:hidden"' : ''}>
                                <i class="fas fa-grip-vertical"></i>
                            </div>
                            <label class="column-checkbox">
                                <input type="checkbox" 
                                       value="${col.key}" 
                                       ${isChecked ? 'checked' : ''} 
                                       ${isRequired ? 'disabled' : ''}
                                       onchange="updateColumnSelection(this)">
                                <span>${col.label}</span>
                                ${isRequired ? '<small class="text-muted"> (obbligatorio)</small>' : ''}
                            </label>
                        </div>
                    `;
                }).join('')}
            </div>
            <div class="column-manager-footer">
                <button class="btn btn-secondary" onclick="resetDefaultColumns()">
                    <i class="icon-refresh"></i> Ripristina Default
                </button>
                <button class="btn btn-primary" onclick="applyColumnChanges()">
                    <i class="icon-check"></i> Applica
                </button>
            </div>
        </div>
    `;
    
    modalSystem.show({
        title: 'Gestione Colonne',
        content: content,
        size: 'medium',
        showFooter: false
    });
    
    // Initialize Sortable dopo che il modal è stato renderizzato
    setTimeout(() => {
        const columnList = document.getElementById('columnList');
        if (columnList && window.Sortable) {
            new Sortable(columnList, {
                animation: 150,
                handle: '.column-drag-handle',
                ghostClass: 'sortable-ghost',
                onEnd: function(evt) {
                    // Update column order
                    updateColumnOrder();
                }
            });
        }
    }, 100);
}

// Toggle all columns
function toggleAllColumns() {
    const checkboxes = document.querySelectorAll('#columnList input[type="checkbox"]:not(:disabled)');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    
    checkboxes.forEach(cb => {
        cb.checked = !allChecked;
        updateColumnSelection(cb);
    });
}

// Update column selection
window.updateColumnSelection = function(checkbox) {
    const column = checkbox.value;
    if (checkbox.checked && !currentColumns.includes(column)) {
        currentColumns.push(column);
    } else if (!checkbox.checked && currentColumns.includes(column)) {
        currentColumns = currentColumns.filter(c => c !== column);
    }
};

// Update column order based on DOM
function updateColumnOrder() {
    const items = document.querySelectorAll('.column-item');
    const newOrder = [];
    
    items.forEach(item => {
        const column = item.dataset.column;
        const checkbox = item.querySelector('input[type="checkbox"]');
        if (checkbox.checked) {
            newOrder.push(column);
        }
    });
    
    currentColumns = newOrder;
}

// Apply column changes
function applyColumnChanges() {
    // Get column order from DOM
    updateColumnOrder();
    
    // Save to localStorage
    localStorage.setItem('trackingColumns', JSON.stringify(currentColumns));
    
    // Rebuild table with new columns
    setupTrackingTable();
    loadTrackings();
    
    // Close modal
    modalSystem.closeAll();
    
    notificationSystem.success('Colonne aggiornate con successo');
}

// Reset to default columns
function resetDefaultColumns() {
    currentColumns = [...DEFAULT_COLUMNS];
    
    // Update checkboxes
    document.querySelectorAll('#columnList input[type="checkbox"]').forEach(cb => {
        cb.checked = DEFAULT_COLUMNS.includes(cb.value);
    });
    
    // Reorder items to match default order
    const columnList = document.getElementById('columnList');
    const items = Array.from(columnList.children);
    
    DEFAULT_COLUMNS.forEach(colKey => {
        const item = items.find(el => el.dataset.column === colKey);
        if (item) {
            columnList.appendChild(item);
        }
    });
    
    // Add remaining unchecked items at the end
    items.forEach(item => {
        if (!DEFAULT_COLUMNS.includes(item.dataset.column)) {
            columnList.appendChild(item);
        }
    });
}

// Setup stats cards with drag & drop
function setupStatsCards() {
    const statsGrid = document.getElementById('statsGrid');
    
    statsCards = [
        { id: 'activeTrackings', icon: 'fa-box', label: 'Tracking Attivi', value: 0 },
        { id: 'inTransit', icon: 'fa-ship', label: 'In Transito', value: 0 },
        { id: 'arrived', icon: 'fa-anchor', label: 'Arrivati', value: 0 },
        { id: 'delivered', icon: 'fa-check-circle', label: 'Consegnati', value: 0 },
        { id: 'delayed', icon: 'fa-exclamation-triangle', label: 'In Ritardo', value: 0 }
    ];
    
    // Render cards
    statsGrid.innerHTML = statsCards.map(card => `
        <div class="sol-stat-card" data-id="${card.id}">
            <i class="fas fa-grip-vertical card-drag-handle"></i>
            <i class="fas ${card.icon} sol-stat-icon"></i>
            <div class="sol-stat-value" id="${card.id}">0</div>
            <div class="sol-stat-label">${card.label}</div>
        </div>
    `).join('');
    
    // Setup Sortable
    if (window.Sortable) {
        new Sortable(statsGrid, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            handle: '.card-drag-handle',
            onEnd: () => saveStatsOrder()
        });
    }
    
    // Restore saved order
    restoreStatsOrder();
}

// Setup tracking table
function setupTrackingTable() {
    const columns = currentColumns.map(colKey => {
        const colDef = availableColumns.find(c => c.key === colKey);
        if (!colDef) return null;
        
        if (colDef.isAction) {
            return {
                key: 'actions',
                label: 'Azioni',
                sortable: false,
                formatter: (value, row) => `
                    <div class="action-buttons">
                        <button class="btn-icon" onclick="refreshTracking('${row.id}')" title="Aggiorna">
                            <i class="fas fa-sync-alt"></i>
                        </button>
                        <button class="btn-icon" onclick="viewTimeline('${row.id}')" title="Timeline">
                            <i class="fas fa-history"></i>
                        </button>
                        <button class="btn-icon text-danger" onclick="deleteTracking('${row.id}')" title="Elimina">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `
            };
        }
        
        const formatter = getColumnFormatter(colKey);
        return {
            key: colKey,
            label: colDef.label,
            sortable: !colDef.isAction,
            formatter: formatter
        };
    }).filter(Boolean);
    
    trackingTable = new TableManager('trackingTableContainer', {
        columns: columns,
        emptyMessage: 'Nessun tracking attivo. Aggiungi il tuo primo tracking per iniziare.',
        pageSize: 20
    });
}

// Column formatters
function getColumnFormatter(key) {
    const formatters = {
        tracking_type: (value) => {
            const types = {
                container: { icon: 'fa-cube', text: 'MARE', color: 'primary' },
                bl: { icon: 'fa-file-alt', text: 'B/L', color: 'info' },
                awb: { icon: 'fa-plane', text: 'AEREO', color: 'warning' },
                parcel: { icon: 'fa-box', text: 'PARCEL', color: 'success' }
            };
            const config = types[value] || { icon: 'fa-question', text: value, color: 'secondary' };
            // FIX: Usa sol-badge invece di badge
            return `<span class="sol-badge sol-badge-${config.color}"><i class="fas ${config.icon}"></i> ${config.text}</span>`;
        },
        status: (value) => {
            const statuses = {
                registered: { class: 'secondary', text: 'Registrato', icon: 'fa-clock' },
                in_transit: { class: 'info', text: 'In Transito', icon: 'fa-ship' },
                arrived: { class: 'primary', text: 'Arrivato', icon: 'fa-anchor' },
                customs_cleared: { class: 'success', text: 'Sdoganato', icon: 'fa-check' },
                out_for_delivery: { class: 'warning', text: 'In Consegna', icon: 'fa-truck' },
                delivered: { class: 'success', text: 'Consegnato', icon: 'fa-check-circle' },
                delayed: { class: 'danger', text: 'In Ritardo', icon: 'fa-exclamation-triangle' },
                exception: { class: 'danger', text: 'Eccezione', icon: 'fa-times-circle' }
            };
            const config = statuses[value] || { class: 'secondary', text: value, icon: 'fa-question' };
            // FIX: Usa sol-badge invece di badge
            return `<span class="sol-badge sol-badge-${config.class}"><i class="fas ${config.icon}"></i> ${config.text}</span>`;
        },
        eta: (value) => {
            if (!value) return '-';
            const date = new Date(value);
            const now = new Date();
            const isInFuture = date > now;
            
            return `<span class="${isInFuture ? 'text-primary' : 'text-muted'}">
                ${date.toLocaleDateString('it-IT')}
                ${isInFuture ? ' <i class="fas fa-clock"></i>' : ''}
            </span>`;
        },
        created_at: (value) => {
            if (!value) return '-';
            return new Date(value).toLocaleDateString('it-IT', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        },
        last_event_location: (value) => value || '-',
        origin_port: (value) => value || '-',
        destination_port: (value) => value || '-',
        reference_number: (value) => value ? `<code>${value}</code>` : '-',
        carrier_code: (value) => value || '-'
    };
    
    return formatters[key] || ((value) => value || '-');
}

// Setup event listeners
function setupEventListeners() {
    // Page actions
    document.getElementById('addTrackingBtn')?.addEventListener('click', showAddTrackingForm);
    document.getElementById('refreshAllBtn')?.addEventListener('click', refreshAllTrackings);
    document.getElementById('exportPdfBtn')?.addEventListener('click', exportToPDF);
    document.getElementById('exportExcelBtn')?.addEventListener('click', exportToExcel);
    
    // Filters
    document.getElementById('statusFilter')?.addEventListener('change', applyFilters);
    document.getElementById('typeFilter')?.addEventListener('change', applyFilters);
}

// Load trackings from localStorage
async function loadTrackings() {
    try {
        trackingTable.loading(true);
        
        // Load from localStorage
        const stored = localStorage.getItem('trackings');
        trackings = stored ? JSON.parse(stored) : generateMockTrackings();
        
        // Ensure all trackings have required fields
        trackings = trackings.map(t => ({
            ...t,
            id: t.id || Date.now() + Math.random(),
            created_at: t.created_at || new Date().toISOString(),
            eta: t.eta || generateETA(t.status)
        }));
        
        // Save back to ensure consistency
        localStorage.setItem('trackings', JSON.stringify(trackings));
        
        // Update stats
        updateStats();
        
        // Update table
        trackingTable.setData(trackings);
        
        // Update timeline if active
        window.currentTrackings = trackings;
        if (window.timelineView && window.timelineView.isActive()) {
            window.timelineView.refresh();
        }
        
    } catch (error) {
        console.error('Error loading trackings:', error);
        notificationSystem.error('Errore nel caricamento dei tracking');
    } finally {
        trackingTable.loading(false);
    }
}

// Generate ETA based on status
function generateETA(status) {
    const now = new Date();
    const eta = new Date(now);
    
    switch(status) {
        case 'in_transit':
            eta.setDate(eta.getDate() + 7); // 7 giorni
            break;
        case 'arrived':
            eta.setDate(eta.getDate() + 2); // 2 giorni
            break;
        case 'out_for_delivery':
            eta.setDate(eta.getDate() + 1); // domani
            break;
        case 'delivered':
        case 'customs_cleared':
            return null; // Già consegnato
        default:
            eta.setDate(eta.getDate() + 14); // 14 giorni default
    }
    
    return eta.toISOString();
}

// Generate mock trackings
function generateMockTrackings() {
    const now = new Date();
    return [
        {
            id: '1',
            tracking_number: 'MSKU1234567',
            tracking_type: 'container',
            carrier_code: 'MAERSK',
            status: 'in_transit',
            last_event_location: 'Shanghai, China',
            origin_port: 'SHANGHAI',
            destination_port: 'GENOVA',
            reference_number: 'PO-2024-001',
            created_at: new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString(),
            eta: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
            id: '2',
            tracking_number: 'MSCU7654321',
            tracking_type: 'container',
            carrier_code: 'MSC',
            status: 'arrived',
            last_event_location: 'Genova, Italy',
            origin_port: 'NINGBO',
            destination_port: 'GENOVA',
            reference_number: 'PO-2024-002',
            created_at: new Date(now - 20 * 24 * 60 * 60 * 1000).toISOString(),
            eta: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
            id: '3',
            tracking_number: '176-12345678',
            tracking_type: 'awb',
            carrier_code: 'CARGOLUX',
            status: 'in_transit',
            last_event_location: 'Luxembourg Airport',
            origin_port: 'HKG',
            destination_port: 'MXP',
            reference_number: 'AIR-2024-003',
            created_at: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
            eta: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
            id: '4',
            tracking_number: 'COSU6789012',
            tracking_type: 'container',
            carrier_code: 'COSCO',
            status: 'delayed',
            last_event_location: 'Singapore',
            origin_port: 'QINGDAO',
            destination_port: 'ROTTERDAM',
            reference_number: 'PO-2024-004',
            created_at: new Date(now - 15 * 24 * 60 * 60 * 1000).toISOString(),
            eta: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
            id: '5',
            tracking_number: 'DHL1234567890',
            tracking_type: 'parcel',
            carrier_code: 'DHL',
            status: 'out_for_delivery',
            last_event_location: 'Milano Hub',
            origin_port: 'MILANO',
            destination_port: 'ROMA',
            reference_number: 'EXP-2024-005',
            created_at: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
            eta: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
            id: '6',
            tracking_number: 'HLCU1112223',
            tracking_type: 'container',
            carrier_code: 'HAPAG-LLOYD',
            status: 'customs_cleared',
            last_event_location: 'Port Said, Egypt',
            origin_port: 'JEBEL ALI',
            destination_port: 'HAMBURG',
            reference_number: 'PO-2024-006',
            created_at: new Date(now - 12 * 24 * 60 * 60 * 1000).toISOString(),
            eta: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
            id: '7',
            tracking_number: 'EGLV2345678',
            tracking_type: 'container',
            carrier_code: 'EVERGREEN',
            status: 'registered',
            last_event_location: 'Booking Confirmed',
            origin_port: 'KAOHSIUNG',
            destination_port: 'LOS ANGELES',
            reference_number: 'PO-2024-007',
            created_at: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(),
            eta: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
            id: '8',
            tracking_number: '235-87654321',
            tracking_type: 'awb',
            carrier_code: 'FEDEX',
            status: 'delivered',
            last_event_location: 'Paris, France',
            origin_port: 'CDG',
            destination_port: 'FCO',
            reference_number: 'AIR-2024-008',
            created_at: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(),
            eta: null
        }
    ];
}

// Update stats cards
function updateStats() {
    const stats = {
        total: trackings.length,
        in_transit: trackings.filter(t => t.status === 'in_transit').length,
        arrived: trackings.filter(t => t.status === 'arrived').length,
        delivered: trackings.filter(t => t.status === 'delivered').length,
        delayed: trackings.filter(t => t.status === 'delayed').length
    };
    
    document.getElementById('activeTrackings').textContent = stats.total;
    document.getElementById('inTransit').textContent = stats.in_transit;
    document.getElementById('arrived').textContent = stats.arrived;
    document.getElementById('delivered').textContent = stats.delivered;
    document.getElementById('delayed').textContent = stats.delayed;
}

// Show add tracking form
function showAddTrackingForm() {
    modalSystem.show({
        title: 'Aggiungi Tracking',
        content: renderTrackingForm(),
        size: 'large',
        showFooter: false
    });
    
    setupFormInteractions();
}

// Render tracking form
function renderTrackingForm() {
    return `
        <div class="sol-form">
            <!-- Tab Navigation -->
            <div class="sol-tabs">
                <button class="sol-tab active" data-tab="single" onclick="switchTab('single')">
                    <i class="fas fa-plus"></i>
                    Singolo Tracking
                </button>
                <button class="sol-tab" data-tab="import" onclick="switchTab('import')">
                    <i class="fas fa-file-import"></i>
                    Import Multiplo
                </button>
            </div>
            
            <!-- Single Tab -->
            <div class="sol-tab-content active" data-content="single">
                <form id="trackingForm" class="tracking-form">
                    <div class="form-grid">
                        <div class="form-group">
                            <label>Numero Tracking *</label>
                            <input type="text" id="trackingNumber" class="form-control" 
                                   placeholder="Es: MSKU1234567" required
                                   oninput="detectTrackingType(this.value)">
                            <span class="form-hint" id="typeHint"></span>
                        </div>
                        
                        <div class="form-group">
                            <label>Tipo Tracking *</label>
                            <select id="trackingType" class="form-control" required>
                                <option value="">Seleziona tipo</option>
                                <option value="container">Container (Mare)</option>
                                <option value="bl">Bill of Lading (B/L)</option>
                                <option value="awb">Air Waybill (Aereo)</option>
                                <option value="parcel">Parcel/Express</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>Vettore *</label>
                            <select id="carrierCode" class="form-control" required>
                                <option value="">Seleziona vettore</option>
                                <optgroup label="Mare">
                                    <option value="MSC">MSC</option>
                                    <option value="MAERSK">MAERSK</option>
                                    <option value="CMA-CGM">CMA CGM</option>
                                    <option value="COSCO">COSCO</option>
                                    <option value="HAPAG-LLOYD">Hapag-Lloyd</option>
                                    <option value="ONE">ONE</option>
                                    <option value="EVERGREEN">Evergreen</option>
                                </optgroup>
                                <optgroup label="Aereo">
                                    <option value="CARGOLUX">Cargolux</option>
                                    <option value="LUFTHANSA">Lufthansa Cargo</option>
                                    <option value="EMIRATES">Emirates SkyCargo</option>
                                </optgroup>
                                <optgroup label="Express">
                                    <option value="DHL">DHL</option>
                                    <option value="FEDEX">FedEx</option>
                                    <option value="UPS">UPS</option>
                                    <option value="TNT">TNT</option>
                                    <option value="GLS">GLS</option>
                                </optgroup>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>Riferimento</label>
                            <input type="text" id="referenceNumber" class="form-control" 
                                   placeholder="Es: PO123456">
                        </div>
                        
                        <div class="form-group">
                            <label>Porto Origine</label>
                            <input type="text" id="originPort" class="form-control" 
                                   placeholder="Es: SHANGHAI">
                        </div>
                        
                        <div class="form-group">
                            <label>Porto Destinazione</label>
                            <input type="text" id="destinationPort" class="form-control" 
                                   placeholder="Es: GENOVA">
                        </div>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="modalSystem.closeAll()">
                            Annulla
                        </button>
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-plus"></i> Aggiungi Tracking
                        </button>
                    </div>
                </form>
            </div>
            
            <!-- Import Tab -->
            <div class="sol-tab-content" data-content="import">
                <div id="importContainer">
                    <div class="import-container">
                        <div class="import-shipsgo">
                            <i class="fas fa-ship fa-3x"></i>
                            <h4>Import File ShipsGo</h4>
                            <p>Carica i file Excel esportati da ShipsGo (Mare o Aereo)</p>
                            <input type="file" id="shipsgoFile" accept=".csv,.xlsx,.xls" style="display:none" 
                                   onchange="handleFileImport(this.files[0])">
                            <button class="btn btn-primary" onclick="document.getElementById('shipsgoFile').click()">
                                <i class="fas fa-file-excel"></i> Seleziona File ShipsGo
                            </button>
                        </div>
                        
                        <div class="import-divider">
                            <p>Oppure</p>
                        </div>
                        
                        <button class="btn btn-secondary" onclick="downloadTemplate()">
                            <i class="fas fa-download"></i> Scarica Template CSV
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Setup form interactions
function setupFormInteractions() {
    const form = document.getElementById('trackingForm');
    form.addEventListener('submit', handleAddTracking);
}

// Switch tab
window.switchTab = function(tabName) {
    // Update tabs
    document.querySelectorAll('.sol-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    
    // Update content
    document.querySelectorAll('.sol-tab-content').forEach(content => {
        content.classList.toggle('active', content.dataset.content === tabName);
    });
};

// Handle file import - MODIFICATO PER USARE IMPORTMANAGER
window.handleFileImport = async function(file) {
    if (!file) return;
    
    try {
        // Use ImportManager for actual import
        if (window.ImportManager) {
            await window.ImportManager.importFile(file, {
                updateExisting: false // Non aggiornare tracking esistenti
            });
        } else {
            throw new Error('ImportManager non disponibile');
        }
    } catch (error) {
        console.error('[Tracking] Import error:', error);
        notificationSystem.error('Errore durante l\'import: ' + error.message);
    }
};

// Download template
window.downloadTemplate = function() {
    const csv = `tracking_number,tracking_type,carrier_code,origin_port,destination_port,reference_number
MSKU1234567,container,MAERSK,SHANGHAI,GENOVA,PO-2024-001
MSCU7654321,container,MSC,NINGBO,GENOVA,PO-2024-002
176-12345678,awb,CARGOLUX,HKG,MXP,AIR-2024-003`;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tracking_template.csv';
    a.click();
    URL.revokeObjectURL(url);
    
    notificationSystem.success('Template scaricato!');
};

// Detect tracking type
window.detectTrackingType = function(value) {
    const input = value.trim().toUpperCase();
    const typeSelect = document.getElementById('trackingType');
    const hint = document.getElementById('typeHint');
    
    let detectedType = null;
    
    if (TRACKING_PATTERNS.container.test(input)) {
        detectedType = 'container';
    } else if (TRACKING_PATTERNS.bl.test(input)) {
        detectedType = 'bl';
    } else if (TRACKING_PATTERNS.awb.test(input)) {
        detectedType = 'awb';
    } else if (input.length >= 10 && TRACKING_PATTERNS.parcel.test(input)) {
        detectedType = 'parcel';
    }
    
    if (detectedType && typeSelect) {
        typeSelect.value = detectedType;
        if (hint) {
            hint.textContent = `Rilevato: ${detectedType.toUpperCase()}`;
            hint.style.color = '#10b981';
        }
    } else if (hint) {
        hint.textContent = '';
    }
};

// Handle add tracking
async function handleAddTracking(event) {
    event.preventDefault();
    
    const formData = {
        tracking_number: document.getElementById('trackingNumber').value.trim().toUpperCase(),
        tracking_type: document.getElementById('trackingType').value,
        carrier_code: document.getElementById('carrierCode').value,
        reference_number: document.getElementById('referenceNumber').value,
        origin_port: document.getElementById('originPort').value.toUpperCase(),
        destination_port: document.getElementById('destinationPort').value.toUpperCase(),
        status: 'registered',
        created_at: new Date().toISOString(),
        eta: generateETA('registered')
    };
    
    // Validate
    if (!formData.tracking_number || !formData.tracking_type || !formData.carrier_code) {
        notificationSystem.error('Compila tutti i campi obbligatori');
        return;
    }
    
    // Check if already exists
    if (trackings.find(t => t.tracking_number === formData.tracking_number)) {
        notificationSystem.error('Tracking già presente nel sistema');
        return;
    }
    
    // Add to trackings
    formData.id = Date.now().toString();
    trackings.push(formData);
    
    // Save to localStorage
    localStorage.setItem('trackings', JSON.stringify(trackings));
    
    // Close modal and reload
    modalSystem.closeAll();
    notificationSystem.success('Tracking aggiunto con successo');
    await loadTrackings();
}

// Handle refresh tracking
async function handleRefreshTracking(id) {
    const tracking = trackings.find(t => t.id === id);
    if (!tracking) return;
    
    // Simulate status progression
    const statusProgression = {
        'registered': 'in_transit',
        'in_transit': 'arrived',
        'arrived': 'customs_cleared',
        'customs_cleared': 'out_for_delivery',
        'out_for_delivery': 'delivered'
    };
    
    const newStatus = statusProgression[tracking.status] || tracking.status;
    tracking.status = newStatus;
    tracking.last_event_date = new Date().toISOString();
    
    // Update location based on status
    if (newStatus === 'arrived') {
        tracking.last_event_location = tracking.destination_port;
    } else if (newStatus === 'out_for_delivery') {
        tracking.last_event_location = 'Local Delivery Hub';
    }
    
    // Update ETA
    tracking.eta = generateETA(newStatus);
    
    // Save
    localStorage.setItem('trackings', JSON.stringify(trackings));
    
    notificationSystem.success('Tracking aggiornato');
    await loadTrackings();
}

// Handle view timeline
async function handleViewTimeline(id) {
    const tracking = trackings.find(t => t.id === id);
    if (!tracking) return;
    
    modalSystem.show({
        title: `Timeline - ${tracking.tracking_number}`,
        size: 'large',
        content: renderTimeline(tracking)
    });
}

// Render timeline
function renderTimeline(tracking) {
    const events = generateTimelineEvents(tracking);
    
    // Different rendering for AWB tracking
    if (tracking.tracking_type === 'awb') {
        return `
            <div class="timeline shipsgo-style">
                <table class="timeline-table">
                    <thead>
                        <tr>
                            <th>Pieces</th>
                            <th>Location</th>
                            <th>Event</th>
                            <th>Date</th>
                            <th>Flight</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${events.map(event => `
                            <tr class="timeline-row ${event.class}">
                                <td>${event.description}</td>
                                <td><strong>${event.location || '-'}</strong></td>
                                <td>
                                    <strong>${event.eventCode || ''}</strong><br>
                                    ${event.title.replace(/^[A-Z]{3} - /, '')}
                                </td>
                                <td>${formatDate(event.date)}</td>
                                <td>${event.flight || '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }
    
    // Standard timeline for other types
    return `
        <div class="timeline">
            ${events.map(event => `
                <div class="timeline-item ${event.class}">
                    <div class="timeline-marker"></div>
                    <div class="timeline-content">
                        <div class="timeline-header">
                            <span class="timeline-title">${event.title}</span>
                            <span class="timeline-date">${formatDate(event.date)}</span>
                        </div>
                        ${event.location ? `<div class="timeline-location"><i class="fas fa-map-marker-alt"></i> ${event.location}</div>` : ''}
                        <div class="timeline-description">${event.description}</div>
                        ${event.vessel ? `<div class="timeline-vessel"><i class="fas fa-ship"></i> ${event.vessel}</div>` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Generate timeline events
function generateTimelineEvents(tracking) {
    const events = [];
    const createdDate = new Date(tracking.created_at);
    
    // For AWB tracking, generate ShipsGo-style events
    if (tracking.tracking_type === 'awb') {
        // RCS - Received from Shipper
        events.push({
            date: createdDate,
            title: 'RCS - Received From Shipper',
            description: `${tracking.metadata?.t5_count || '-'} Pieces`,
            location: tracking.metadata?.origin || tracking.origin_port,
            class: 'registered',
            eventCode: 'RCS'
        });
        
        // If we have departure date, add MAN and DEP events
        if (tracking.metadata?.departure_date || ['in_transit', 'arrived', 'delivered'].includes(tracking.status)) {
            const depDate = tracking.metadata?.departure_date ? 
                new Date(tracking.metadata.departure_date) : 
                new Date(createdDate.getTime() + 1 * 24 * 60 * 60 * 1000);
            
            // MAN - Manifested (1 hour before departure)
            const manDate = new Date(depDate.getTime() - 1 * 60 * 60 * 1000);
            events.push({
                date: manDate,
                title: 'MAN - Manifested',
                description: `${tracking.metadata?.t5_count || '-'} Pieces`,
                location: tracking.metadata?.origin || tracking.origin_port,
                class: 'in_transit',
                eventCode: 'MAN',
                flight: tracking.carrier_code ? `${tracking.carrier_code}${Math.floor(Math.random() * 900) + 100}` : '-'
            });
            
            // DEP - Departed
            events.push({
                date: depDate,
                title: 'DEP - Departed',
                description: `${tracking.metadata?.t5_count || '-'} Pieces`,
                location: tracking.metadata?.origin || tracking.origin_port,
                class: 'departed',
                eventCode: 'DEP',
                flight: tracking.carrier_code ? `${tracking.carrier_code}${Math.floor(Math.random() * 900) + 100}` : '-'
            });
        }
        
        // If arrived or delivered, add RCF event
        if (['arrived', 'delivered'].includes(tracking.status)) {
            const arrDate = tracking.metadata?.arrival_date ? 
                new Date(tracking.metadata.arrival_date) : 
                new Date(createdDate.getTime() + 2 * 24 * 60 * 60 * 1000);
            
            events.push({
                date: arrDate,
                title: 'RCF - Received From Flight',
                description: `${tracking.metadata?.t5_count || '-'} Pieces`,
                location: tracking.metadata?.destination || tracking.destination_port,
                class: 'arrived',
                eventCode: 'RCF',
                flight: tracking.carrier_code ? `${tracking.carrier_code}${Math.floor(Math.random() * 900) + 100}` : '-'
            });
        }
        
        // If delivered, add DLV event
        if (tracking.status === 'delivered') {
            const dlvDate = new Date();
            events.push({
                date: dlvDate,
                title: 'DLV - Delivered',
                description: `${tracking.metadata?.t5_count || '-'} Pieces`,
                location: tracking.metadata?.destination || tracking.destination_port,
                class: 'delivered',
                eventCode: 'DLV'
            });
        }
        
    } else if (tracking.tracking_type === 'container' || tracking.tracking_type === 'bl') {
        // Container/BL events
        events.push({
            date: createdDate,
            title: 'Booking Confirmed',
            description: 'Container registrato nel sistema',
            location: tracking.origin_port,
            class: 'registered'
        });
        
        if (['in_transit', 'arrived', 'delivered'].includes(tracking.status)) {
            const loadDate = tracking.metadata?.loading_date ? 
                new Date(tracking.metadata.loading_date) : 
                new Date(createdDate.getTime() + 2 * 24 * 60 * 60 * 1000);
                
            events.push({
                date: loadDate,
                title: 'Gate In',
                description: 'Container entrato nel terminal',
                location: tracking.origin_port,
                class: 'in_transit'
            });
            
            events.push({
                date: new Date(loadDate.getTime() + 2 * 60 * 60 * 1000),
                title: 'Loaded',
                description: 'Container caricato sulla nave',
                location: tracking.origin_port,
                class: 'departed',
                vessel: tracking.metadata?.vessel_name
            });
        }
        
        if (['arrived', 'delivered'].includes(tracking.status)) {
            const dischDate = tracking.metadata?.discharge_date ? 
                new Date(tracking.metadata.discharge_date) : 
                new Date(createdDate.getTime() + 7 * 24 * 60 * 60 * 1000);
                
            events.push({
                date: dischDate,
                title: 'Discharged',
                description: 'Container scaricato dalla nave',
                location: tracking.destination_port,
                class: 'arrived',
                vessel: tracking.metadata?.vessel_name
            });
        }
        
        if (tracking.status === 'delivered') {
            events.push({
                date: new Date(),
                title: 'Gate Out',
                description: 'Container ritirato dal terminal',
                location: tracking.destination_port,
                class: 'delivered'
            });
        }
    } else {
        // Generic events for other types
        events.push({
            date: createdDate,
            title: 'Tracking Registrato',
            description: 'Tracking inserito nel sistema',
            location: tracking.origin_port,
            class: 'registered'
        });
        
        if (['in_transit', 'arrived', 'delivered'].includes(tracking.status)) {
            events.push({
                date: new Date(createdDate.getTime() + 2 * 24 * 60 * 60 * 1000),
                title: 'Partenza',
                description: 'Spedizione partita dall\'origine',
                location: tracking.origin_port,
                class: 'departed'
            });
        }
        
        if (['arrived', 'delivered'].includes(tracking.status)) {
            events.push({
                date: new Date(createdDate.getTime() + 7 * 24 * 60 * 60 * 1000),
                title: 'Arrivato a Destinazione',
                description: 'Spedizione arrivata alla destinazione',
                location: tracking.destination_port,
                class: 'arrived'
            });
        }
        
        if (tracking.status === 'delivered') {
            events.push({
                date: new Date(),
                title: 'Consegnato',
                description: 'Spedizione consegnata al destinatario',
                location: tracking.destination_port,
                class: 'delivered'
            });
        }
    }
    
    return events.sort((a, b) => b.date - a.date);
}

// Handle delete tracking
async function handleDeleteTracking(id) {
    const confirmed = await modalSystem.confirm({
        title: 'Conferma Eliminazione',
        message: 'Sei sicuro di voler eliminare questo tracking?',
        confirmText: 'Elimina',
        confirmClass: 'sol-btn-danger',
        cancelText: 'Annulla'
    });
    
    if (!confirmed) return;
    
    // Remove from array
    trackings = trackings.filter(t => t.id !== id && t.id !== id.toString());
    
    // Save to localStorage  
    localStorage.setItem('trackings', JSON.stringify(trackings));
    
    // Update global reference
    window.currentTrackings = trackings;
    
    // Close any open modals
    modalSystem.closeAll();
    
    // Update UI immediately
    updateStats();
    trackingTable.setData(trackings);
    
    // Show success notification
    notificationSystem.success('Tracking eliminato');
    
    // Update timeline if active
    if (window.timelineView && window.timelineView.isActive()) {
        window.timelineView.refresh();
    }
}

// Refresh all trackings
async function refreshAllTrackings() {
    const activeTrackings = trackings.filter(t => !['delivered', 'exception'].includes(t.status));
    
    if (activeTrackings.length === 0) {
        notificationSystem.info('Nessun tracking attivo da aggiornare');
        return;
    }
    
    // Show progress
    const progressModal = modalSystem.progress({
        title: 'Aggiornamento Tracking',
        message: 'Aggiornamento in corso...',
        showPercentage: true
    });
    
    // Simulate updates
    for (let i = 0; i < activeTrackings.length; i++) {
        const progress = ((i + 1) / activeTrackings.length) * 100;
        progressModal.update(progress, `Aggiornamento ${i + 1} di ${activeTrackings.length}...`);
        
        // Update tracking
        await handleRefreshTracking(activeTrackings[i].id);
        
        // Small delay for visual effect
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    progressModal.close();
    notificationSystem.success('Tutti i tracking sono stati aggiornati');
}

// Apply filters
function applyFilters() {
    const statusFilter = document.getElementById('statusFilter').value;
    const typeFilter = document.getElementById('typeFilter').value;
    
    let filtered = [...trackings];
    
    if (statusFilter) {
        filtered = filtered.filter(t => t.status === statusFilter);
    }
    
    if (typeFilter) {
        filtered = filtered.filter(t => t.tracking_type === typeFilter);
    }
    
    trackingTable.setData(filtered);
    
    // Update timeline if active
    window.currentTrackings = filtered;
    if (window.timelineView && window.timelineView.isActive()) {
        window.timelineView.refresh();
    }
}

// Export functions
async function exportToPDF() {
    notificationSystem.info('Export PDF in sviluppo');
}

async function exportToExcel() {
    notificationSystem.info('Export Excel in sviluppo');
}

// Format helpers
function formatDate(date) {
    if (!date) return '-';
    return new Date(date).toLocaleString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Stats order management
function saveStatsOrder() {
    const cards = document.querySelectorAll('.sol-stat-card');
    const order = Array.from(cards).map(card => card.dataset.id);
    localStorage.setItem('trackingStatsOrder', JSON.stringify(order));
}

function restoreStatsOrder() {
    const savedOrder = localStorage.getItem('trackingStatsOrder');
    if (!savedOrder) return;
    
    try {
        const order = JSON.parse(savedOrder);
        const statsGrid = document.getElementById('statsGrid');
        const cards = Array.from(statsGrid.querySelectorAll('.sol-stat-card'));
        
        cards.sort((a, b) => {
            const aIndex = order.indexOf(a.dataset.id);
            const bIndex = order.indexOf(b.dataset.id);
            return aIndex - bIndex;
        });
        
        cards.forEach(card => statsGrid.appendChild(card));
    } catch (e) {
        console.error('Error restoring stats order:', e);
    }
}

// Auto refresh
function startAutoRefresh() {
    // Refresh every 5 minutes
    setInterval(() => {
        loadTrackings();
    }, 5 * 60 * 1000);
}

// Make loadTrackings globally available for import
window.loadTrackings = loadTrackings;