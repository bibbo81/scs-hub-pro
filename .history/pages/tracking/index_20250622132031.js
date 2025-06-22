// /pages/tracking/index.js - Logica specifica per la pagina tracking
// FIX: Import corretti per i moduli
import TableManager from '../../core/table-manager.js';
// Modal system loads globally, use window reference
const modalSystem = window.ModalSystem;
import notificationSystem from '../../core/notification-system.js';
// Aggiungi all'inizio del file pages/tracking/index.js
import trackingService from '/core/services/tracking-service.js';

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
    'select',  // AGGIUNTO: checkbox come prima colonna
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

// Column definitions - AGGIORNATE CON MAPPING CORRETTO
const availableColumns = [
    // NUOVA COLONNA SELECT
    { 
        key: 'select', 
        label: '', 
        visible: true, 
        order: 0, 
        required: false, 
        isCheckbox: true,
        width: '40px'
    },
    
    // Colonne Base
{ key: 'tracking_number', label: 'Numero Tracking', visible: true, order: 1, required: true },
{ key: 'tracking_type', label: 'Tipo', visible: true, order: 2 },
{ key: 'carrier_code', label: 'Vettore', visible: true, order: 3 },
{ key: 'status', label: 'Stato', visible: true, order: 4 },
{ key: 'origin_port', label: 'Origine', visible: true, order: 5 },
{ key: 'destination_port', label: 'Destinazione', visible: true, order: 6 },
{ key: 'reference_number', label: 'Riferimento', visible: true, order: 7 },

// Colonne ShipsGo Mare
{ key: 'booking', label: 'Booking', visible: false, order: 8 },
{ key: 'container_count', label: 'Container Count', visible: false, order: 9 },
{ key: 'port_of_loading', label: 'Port Of Loading', visible: false, order: 10 },
{ key: 'date_of_loading', label: 'Date Of Loading', visible: false, order: 11 },
{ key: 'pol_country', label: 'POL Country', visible: false, order: 12 },  // ← NASCOSTA
{ key: 'pol_country_code', label: 'POL Country Code', visible: false, order: 13 },  // ← NASCOSTA
{ key: 'port_of_discharge', label: 'Port Of Discharge', visible: false, order: 14 },
{ key: 'date_of_discharge', label: 'Date Of Discharge', visible: false, order: 15 },
{ key: 'pod_country', label: 'POD Country', visible: false, order: 16 },  // ← NASCOSTA
{ key: 'pod_country_code', label: 'POD Country Code', visible: false, order: 17 },  // ← NASCOSTA
{ key: 'co2_emission', label: 'CO₂ Emission (Tons)', visible: false, order: 18 },
{ key: 'tags', label: 'Tags', visible: false, order: 19 },
{ key: 'created_at_shipsgo', label: 'Created At', visible: false, order: 20 },

// Colonne ShipsGo Air  
{ key: 'awb_number', label: 'AWB Number', visible: false, order: 21 },
{ key: 'airline', label: 'Airline', visible: false, order: 22 },
{ key: 'origin', label: 'Origin', visible: false, order: 23 },
{ key: 'origin_name', label: 'Origin Name', visible: false, order: 24 },  // NASCOSTA
{ key: 'date_of_departure', label: 'Date Of Departure', visible: true, order: 25 },
{ key: 'origin_country', label: 'Origin Country', visible: true, order: 26 },  // ← CAMBIA IN TRUE
{ key: 'origin_country_code', label: 'Origin Country Code', visible: true, order: 27 },  // ← CAMBIA IN TRUE
{ key: 'destination', label: 'Destination', visible: false, order: 28 },  // NASCOSTA
{ key: 'destination_name', label: 'Destination Name', visible: false, order: 29 },  // NASCOSTA
{ key: 'date_of_arrival', label: 'Date Of Arrival', visible: true, order: 30 },
{ key: 'destination_country', label: 'Destination Country', visible: true, order: 31 },  // ← CAMBIA IN TRUE
{ key: 'destination_country_code', label: 'Destination Country Code', visible: true, order: 32 },  // ← CAMBIA IN TRUE
{ key: 'transit_time', label: 'Transit Time', visible: false, order: 33 },
{ key: 'ts_count', label: 'TS Count', visible: false, order: 34 },
    
    // Colonne Sistema
    { key: 'last_event_location', label: 'Ultima Posizione', visible: true, order: 35 },
    { key: 'eta', label: 'ETA', visible: true, order: 36 },
    { key: 'created_at', label: 'Data Inserimento', visible: false, order: 37 },
    
    // Actions column
    { key: 'actions', label: 'Azioni', visible: true, order: 38, required: true, isAction: true }
];

// Default columns (saved in localStorage)
const DEFAULT_COLUMNS = ['select', 
    'tracking_number', 
    'tracking_type', 
    'carrier_code', 
    'status', 
    'origin_port', 
    'destination_port',
    'date_of_departure',  // ← AGGIUNTO per vedere la data partenza
    'eta', 
    // 'created_at',        ← RIMOSSO
    'actions'
];

// Esponi le funzioni necessarie
window.refreshTracking = (id) => handleRefreshTracking(id);
window.viewTimeline = (id) => handleViewTimeline(id);
window.deleteTracking = (id) => handleDeleteTracking(id);
window.showColumnManager = showColumnManager;
window.toggleAllColumns = toggleAllColumns;
window.applyColumnChanges = applyColumnChanges;
window.resetDefaultColumns = resetDefaultColumns;
window.updateSelectedCount = updateSelectedCount;
window.toggleSelectAll = toggleSelectAll;
window.getSelectedRows = getSelectedRows;
window.clearSelection = clearSelection;
window.bulkRefreshTrackings = bulkRefreshTrackings;
window.bulkDeleteTrackings = bulkDeleteTrackings;
window.exportSelectedTrackings = exportSelectedTrackings;

// Initialize page
window.trackingInit = async function() {
    console.log('🚀 [Tracking] Initializing page...');
    
    try {
        // NUOVO: Inizializza il tracking service
        if (window.trackingService) {
            await window.trackingService.initialize();
            console.log('✅ [Tracking] Service initialized');
            
            // Mostra stato API
            if (window.trackingService.hasApiKeys()) {
                console.log('🔑 [Tracking] API keys configured');
                notificationSystem.info('API ShipsGo configurate e pronte', { duration: 3000 });
            } else {
                console.log('🚧 [Tracking] Running in mock mode (no API keys)');
                notificationSystem.warning('Sistema in modalità demo. Configura le API in Settings.', { duration: 5000 });
            }
        }
        
        // Riesponi le funzioni per sicurezza
        window.showAddTrackingForm = showAddTrackingForm;
        window.refreshAllTrackings = refreshAllTrackings;
        window.exportToPDF = exportToPDF;
        window.exportToExcel = exportToExcel;
        window.showColumnManager = showColumnManager;
        
        // Load saved columns
        loadSavedColumns();
        
        // ========== FIX 2: ESPONI getColumnFormatter PRIMA di setupTrackingTable ==========
        window.getColumnFormatter = getColumnFormatter;
        console.log('[Tracking] ✅ getColumnFormatter exposed in trackingInit');
        
        // Setup page components - ORDINE IMPORTANTE!
        setupStatsCards();
        setupBulkActions();        // PRIMA della tabella
        setupCheckboxListeners();  // Setup listeners
        setupTrackingTable();      // POI crea la tabella (ora userà il formatter esposto)
        setupEventListeners();
        
        // Load initial data
        await loadTrackings();
        console.log('✅ [Tracking] Initial data loaded');
        
        // Start auto-refresh
        startAutoRefresh();
        console.log('✅ [Tracking] Auto-refresh started');
        
        // Listen for tracking updates from import
        window.addEventListener('trackingsUpdated', async (event) => {
            console.log('[Tracking] Trackings updated from import');
            await loadTrackings();
        });
        
        console.log('✅ [Tracking] Page initialized successfully');
        
    } catch (error) {
        console.error('❌ [Tracking] Initialization failed:', error);
        if (window.NotificationSystem) {
            window.NotificationSystem.error('Errore inizializzazione pagina tracking');
        }
    }
};

// Load saved column preferences
function loadSavedColumns() {
    const saved = localStorage.getItem('trackingColumns');
    if (saved) {
        try {
            currentColumns = JSON.parse(saved);
            // Assicurati che 'select' sia sempre la prima colonna
            if (!currentColumns.includes('select')) {
                currentColumns.unshift('select');
            }
            // AGGIUNGI: Rimuovi sempre created_at
            currentColumns = currentColumns.filter(col => col !== 'created_at');
        } catch (e) {
            currentColumns = [...DEFAULT_COLUMNS];
        }
    } else {
        currentColumns = [...DEFAULT_COLUMNS];
    }
}

// Show column manager modal
function showColumnManager() {
    // Filtra la colonna select dalla lista gestibile
    const manageableColumns = availableColumns.filter(col => col.key !== 'select');
    
    // AGGIUNGI QUESTO: Filtra anche le colonne POL/POD che abbiamo nascosto
    const columnsToHide = ['pol_country', 'pol_country_code', 'pod_country', 'pod_country_code', 'port_of_loading', 'port_of_discharge', 'origin',              // Nascosto: usiamo origin_port unificato
        'origin_name',         // Nascosto: usiamo origin_port unificato
        'destination',         // Nascosto: usiamo destination_port unificato
        'destination_name',
        'date_of_discharge'     // Nascosto: usiamo destination_port unificato
    ];
    console.log('Hiding columns:', columnsToHide); // <-- QUI
    const visibleColumns = manageableColumns.filter(col => !columnsToHide.includes(col.key));
    console.log('Visible columns:', visibleColumns.map(c => c.key)); // <-- E QUI
    const content = `
        <div class="column-manager">
            <div class="column-manager-header">
                <p>Seleziona e riordina le colonne da visualizzare</p>
                <button class="btn btn-sm btn-secondary" onclick="toggleAllColumns()">
                    <i class="icon-check-square"></i> Seleziona/Deseleziona Tutto
                </button>
            </div>
            <div class="column-list" id="columnList">
                ${visibleColumns.map(col => {  // CAMBIA: usa visibleColumns invece di manageableColumns
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
    
    window.ModalSystem.show({
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
    const newOrder = ['select']; // Sempre prima
    
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
    window.ModalSystem.closeAll();
    
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
        
        // AGGIUNGI QUESTA RIGA:
        const noDragColumns = ['select', 'actions']; // Colonne non trascinabili
        
        // Gestione colonna checkbox
        if (colDef.isCheckbox) {
            return {
                key: 'select',
                label: `<input type="checkbox" class="select-all" onchange="toggleSelectAll(this)">`,
                sortable: false,
                className: 'no-drag', // ← AGGIUNGI QUESTA RIGA
                width: colDef.width,
                formatter: (value, row) => `
                    <input type="checkbox" 
                           class="row-select" 
                           data-row-id="${row.id}"
                           onchange="updateSelectedCount()">
                `
            };
        }
        
        if (colDef.isAction) {
            return {
                key: 'actions',
                label: 'Azioni',
                sortable: false,
                className: 'no-drag', // ← AGGIUNGI QUESTA RIGA
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
            sortable: !colDef.isAction && !colDef.isCheckbox,
            className: noDragColumns.includes(colKey) ? 'no-drag' : '', // ← AGGIUNGI QUESTA RIGA
            formatter: formatter
        };
    }).filter(Boolean);
    
    // MODIFICA ANCHE LA CREAZIONE DEL TABLE MANAGER:
    trackingTable = new TableManager('trackingTableContainer', {
        columns: columns,
        emptyMessage: 'Nessun tracking attivo. Aggiungi il tuo primo tracking per iniziare.',
        pageSize: 20,
        enableColumnDrag: true // ← AGGIUNGI QUESTA RIGA
    });
    
    // 🆕 AGGIUNGI QUESTE RIGHE ALLA FINE:
    // Esponi trackingTable globalmente
    window.trackingTable = trackingTable;
    console.log('✅ trackingTable esposto globalmente');
    
    // Aggiungi AdvancedSearch se non presente
    if (window.AdvancedSearch && !trackingTable.advancedSearch) {
        trackingTable.advancedSearch = new window.AdvancedSearch({
            searchInMetadata: true,
            debounceMs: 300
        });
        console.log('✅ AdvancedSearch aggiunto a trackingTable');
    }
}

// === BULK ACTIONS FUNCTIONS ===
function setupBulkActions() {
    // Crea il container per le azioni bulk se non esiste
    const tableContainer = document.querySelector('.sol-card-header');
    if (tableContainer && !document.getElementById('bulkActionsContainer')) {
        const bulkActions = document.createElement('div');
        bulkActions.id = 'bulkActionsContainer';
        bulkActions.style.display = 'none';
        bulkActions.innerHTML = `
            <div class="bulk-actions-bar">
                <span class="selected-count">
                    <i class="fas fa-check-square"></i>
                    <span id="selectedCount">0</span> selezionati
                </span>
                <div class="bulk-actions">
                    <button class="btn btn-sm btn-primary" onclick="bulkRefreshTrackings()">
                        <i class="fas fa-sync-alt"></i> Aggiorna Selezionati
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="bulkDeleteTrackings()">
                        <i class="fas fa-trash"></i> Elimina Selezionati
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="exportSelectedTrackings()">
                        <i class="fas fa-file-export"></i> Esporta Selezionati
                    </button>
                    <button class="btn btn-sm btn-outline" onclick="clearSelection()">
                        <i class="fas fa-times"></i> Deseleziona
                    </button>
                </div>
            </div>
        `;
        tableContainer.appendChild(bulkActions);
    }
}

// Funzione per aggiornare il contatore dei selezionati
function updateSelectedCount() {
    const selected = getSelectedRows();
    const count = selected.length;
    const container = document.getElementById('bulkActionsContainer');
    const countEl = document.getElementById('selectedCount');
    
    if (container) {
        container.style.display = count > 0 ? 'block' : 'none';
        if (countEl) countEl.textContent = count;
    }
}

// Modifica la funzione toggleSelectAll esistente
function toggleSelectAll(checkbox) {
    const checkboxes = document.querySelectorAll('.row-select');
    checkboxes.forEach(cb => {
        cb.checked = checkbox.checked;
        // Trigger change event per aggiornare il contatore
        cb.dispatchEvent(new Event('change'));
    });
    updateSelectedCount();
}

// Aggiungi listener per i checkbox individuali
function setupCheckboxListeners() {
    document.addEventListener('change', (e) => {
        if (e.target.classList.contains('row-select')) {
            updateSelectedCount();
        }
    });
}

// Funzione per ottenere le righe selezionate
function getSelectedRows() {
    const selected = [];
    document.querySelectorAll('.row-select:checked').forEach(checkbox => {
        const rowId = checkbox.dataset.rowId;
        const tracking = trackings.find(t => t.id == rowId);
        if (tracking) selected.push(tracking);
    });
    return selected;
}

// Bulk refresh - MODIFICATA PER USARE trackingService.bulkTrack
async function bulkRefreshTrackings() {
    const selected = getSelectedRows();
    if (selected.length === 0) return;
    
    if (!window.trackingService || !window.trackingService.hasApiKeys()) {
        notificationSystem.warning('API non configurate. Vai in Settings per configurarle.');
        return;
    }
    
    const progressModal = window.ModalSystem.progress({
        title: 'Aggiornamento Multiplo',
        message: 'Aggiornamento in corso...',
        showPercentage: true
    });
    
    try {
        // Prepara tracking per bulk update
        const trackingRequests = selected.map(t => ({
            id: t.id,
            tracking_number: t.tracking_number,
            type: t.tracking_type || 'container'
        }));
        
        // Esegui bulk tracking
        const results = await window.trackingService.bulkTrack(trackingRequests, (progress) => {
            const percentage = Math.round((progress.completed / progress.total) * 100);
            progressModal.update(percentage, `Aggiornati ${progress.completed} di ${progress.total} tracking`);
        });
        
        // Aggiorna trackings con nuovi dati
        let updatedCount = 0;
        results.forEach((result, index) => {
            if (result.success && result.data) {
                const tracking = selected[index];
                const trackingIndex = trackings.findIndex(t => t.id === tracking.id);
                if (trackingIndex !== -1) {
                    trackings[trackingIndex] = {
                        ...tracking,
                        ...result.data,
                        id: tracking.id,
                        created_at: tracking.created_at,
                        updated_at: new Date().toISOString(),
                        metadata: {
                            ...tracking.metadata,
                            ...result.data.metadata,
                            last_bulk_update: new Date().toISOString()
                        }
                    };
                    updatedCount++;
                }
            }
        });
        
        // Salva e aggiorna UI
        localStorage.setItem('trackings', JSON.stringify(trackings));
        await loadTrackings();
        
        progressModal.close();
        clearSelection();
        notificationSystem.success(`Aggiornati ${updatedCount} tracking su ${selected.length}`);
        
    } catch (error) {
        console.error('Error in bulk refresh:', error);
        progressModal.close();
        notificationSystem.error('Errore durante l\'aggiornamento multiplo: ' + error.message);
    }
}

// Bulk delete
async function bulkDeleteTrackings() {
    const selected = getSelectedRows();
    if (selected.length === 0) return;
    
    const confirmed = await window.ModalSystem.confirm({
        title: 'Conferma Eliminazione Multipla',
        message: `Sei sicuro di voler eliminare ${selected.length} tracking?`,
        confirmText: 'Elimina Tutti',
        confirmClass: 'sol-btn-danger'
    });
    
    if (!confirmed) return;
    
    const ids = selected.map(t => t.id);
    trackings = trackings.filter(t => !ids.includes(t.id));
    
    localStorage.setItem('trackings', JSON.stringify(trackings));
    await loadTrackings();
    
    clearSelection();
    notificationSystem.success(`${selected.length} tracking eliminati`);
}

// Export selected - AGGIORNATA PER USARE EXPORT MANAGER
async function exportSelectedTrackings() {
    try {
        const selected = getSelectedRows();
        
        if (selected.length === 0) {
            window.NotificationSystem?.warning('Nessun tracking selezionato');
            return;
        }
        
        // Chiedi formato
        const format = await window.ModalSystem?.confirm({
            title: 'Formato Export',
            message: 'Seleziona il formato di export:',
            confirmText: 'Excel',
            cancelText: 'PDF',
            type: 'info'
        });
        
        if (window.ExportManager) {
            if (format) {
                await window.ExportManager.exportSelected(selected, 'excel', 'selected-trackings');
            } else if (format === false) {
                await window.ExportManager.exportSelected(selected, 'pdf', 'selected-trackings');
            }
        }
        
        clearSelection();
        
    } catch (error) {
        console.error('[Tracking] Export selected error:', error);
        window.NotificationSystem?.error('Errore export: ' + error.message);
    }
}

// Clear selection
function clearSelection() {
    document.querySelectorAll('.row-select').forEach(cb => cb.checked = false);
    const selectAll = document.querySelector('.select-all');
    if (selectAll) selectAll.checked = false;
    updateSelectedCount();
}

// ========== FIX: COLUMN FORMATTERS AGGIORNATI ==========
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
            return `<span class="sol-badge sol-badge-${config.color}"><i class="fas ${config.icon}"></i> ${config.text}</span>`;
        },
        
        // FIX ORIGINE/DESTINAZIONE - Usa i campi corretti per AIR e SEA
        origin_port: (value, row) => {
            // UNIFICATO: Mostra sempre il nome completo invece del codice
        
            // Per AIR: usa Origin Name (nome completo)
            if (row.tracking_type === 'awb') {
                return row.metadata?.['Origin Name'] || 
                       row.metadata?.origin_name ||
                       row.origin_name ||
                       row.metadata?.['Origin'] || 
                       row.metadata?.origin ||
                       row.origin_port ||
                       value || '-';
            }
            
            // Per SEA: usa Port Of Loading
            if (row.tracking_type === 'container' || row.tracking_type === 'bl') {
                return row.metadata?.['Port Of Loading'] || 
                       row.metadata?.port_of_loading ||
                       row.origin_port ||
                       value || '-';
            }
            
            return value || '-';
        },
        
        destination_port: (value, row) => {
    // UNIFICATO: Mostra sempre il nome completo invece del codice
    
    // Per AIR: usa Destination Name (nome completo)
    if (row.tracking_type === 'awb') {
        return row.metadata?.['Destination Name'] || 
               row.metadata?.destination_name ||
               row.destination_name ||
               row.metadata?.['Destination'] || 
               row.metadata?.destination ||
               row.destination_port ||
               value || '-';
    }
            // Per SEA: usa Port Of Discharge
            if (row.tracking_type === 'container' || row.tracking_type === 'bl') {
                return row.metadata?.['Port Of Discharge'] || 
                       row.metadata?.port_of_discharge ||
                       row.destination_port ||
                       value || '-';
            }
            return value || '-';
        },
        
        // ORIGIN NAME - NASCOSTA (non più usata)
origin_name: (value, row) => {
    return '-'; // Nascosta, usiamo origin_port unificato
},

// DESTINATION NAME - NASCOSTA (non più usata)
destination_name: (value, row) => {
    return '-'; // Nascosta, usiamo destination_port unificato
},
        
        // FIX AIRLINE FORMATTER
        airline: (value, row) => {
            // Per AWB, prendi dal campo diretto (salvato da tracking-form-progressive)
            if (row.tracking_type === 'awb') {
                return row.airline || 
                       row.metadata?.airline ||
                       row.carrier_code ||
                       'UNKNOWN';
            }
            // Per altri tipi
            return value || 
                   row.metadata?.['Airline'] || 
                   row.metadata?.airline ||
                   row.carrier_code ||
                   '-';
        },
        
        // FIX TRANSIT TIME - CALCOLO CORRETTO
        transit_time: (value, row) => {
            // Per AIR: converti ore in giorni
            if (row.tracking_type === 'awb') {
                const transitValue = row.transit_time ||  // Campo diretto
                                   row.metadata?.transit_time ||
                                   row.metadata?.['Transit Time'] ||
                                   value;
                
                if (transitValue && transitValue !== '-') {
                    // Se è un numero (ore per voli)
                    if (typeof transitValue === 'number') {
                        // Converti ore in giorni
                        const days = Math.ceil(transitValue / 24);
                        return days.toString();
                    }
                    // Se è già una stringa con "hours"
                    if (typeof transitValue === 'string' && transitValue.includes('hours')) {
                        const hours = parseInt(transitValue);
                        if (!isNaN(hours)) {
                            const days = Math.ceil(hours / 24);
                            return days.toString();
                        }
                    }
                    // Se è già solo un numero come stringa, ritornalo
                    if (!isNaN(parseInt(transitValue))) {
                        return transitValue.toString();
                    }
                }
            }
            // Per SEA: calcola dalle date se disponibili
            if (row.tracking_type === 'container' || row.tracking_type === 'bl') {
                const loadDate = row.metadata?.['Date Of Loading'] || row.metadata?.date_of_loading;
                const dischDate = row.metadata?.['Date Of Discharge'] || row.metadata?.date_of_discharge;
                
                if (loadDate && dischDate) {
                    try {
                        // Parse date formato DD/MM/YYYY
                        const parseItDate = (dateStr) => {
                            if (typeof dateStr === 'string' && dateStr.includes('/')) {
                                const [day, month, year] = dateStr.split(' ')[0].split('/');
                                return new Date(year, month - 1, day);
                            }
                            return new Date(dateStr);
                        };
                        
                        const start = parseItDate(loadDate);
                        const end = parseItDate(dischDate);
                        
                        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                            const diffTime = Math.abs(end - start);
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                            return diffDays.toString();
                        }
                    } catch (e) {
                        console.warn('Error calculating sea transit time:', e);
                    }
                }
            }
            
            return '-';
        },
        
        // FIX TS COUNT (nel file è TS Count, non T5 Count)
        ts_count: (value, row) => {
            return value || 
                   row.metadata?.['TS Count'] || 
                   row.metadata?.ts_count ||
                   row.ts_count ||
                   '-';
        },
        
        // DATE FORMATTERS
        date_of_departure: (value, row) => {
            // UNIFICATO: Per SEA usa Date Of Loading, per AIR usa Date Of Departure
            
            // Per SEA: usa Date Of Loading O departure salvato da tracking-form-progressive
            if (row.tracking_type === 'container' || row.tracking_type === 'bl') {
                const date = row.departure ||                         // Prima cerca departure (salvato dal form)
                             row.date_of_departure ||                   // Poi date_of_departure
                             row.metadata?.['Date Of Loading'] ||      // Poi nei metadata
                             row.metadata?.date_of_loading ||
                             row.metadata?.departure ||
                             row.date_of_loading ||
                             value ||
                             '-';
                return formatDateOnly(date);
            }
            
            // Per AIR: usa Date Of Departure
            const date = row.departure ||                               // Prima cerca departure (salvato dal form)
                         row.date_of_departure ||                        // Poi date_of_departure
                         row.metadata?.['Date Of Departure'] ||
                         row.metadata?.date_of_departure ||
                         row.metadata?.departure ||
                         value ||
                         '-';
            return formatDateOnly(date);
        },
        
       // FIX DATE OF ARRIVAL FORMATTER
       date_of_arrival: (value, row) => {
            // UNIFICATO: Per SEA usa Date Of Discharge, per AIR usa Date Of Arrival
            // Per SEA: usa Date Of Discharge
            if (row.tracking_type === 'container' || row.tracking_type === 'bl') {
                const date = row.metadata?.['Date Of Discharge'] || 
                            row.metadata?.date_of_discharge ||
                            value;
                return formatDateOnly(date);
            }
            // Per AIR: usa il campo diretto salvato dal form
            const date = row.date_of_arrival ||  // Campo diretto salvato
                        value || 
                        row.metadata?.['Date Of Arrival'] || 
                        row.metadata?.date_of_arrival;
            return formatDateOnly(date);
        },
        
        date_of_loading: (value, row) => {
            const date = value || 
                        row.metadata?.['Date Of Loading'] || 
                        row.metadata?.date_of_loading;
            return formatDateOnly(date);
        },
        
        date_of_discharge: (value, row) => {
    // NASCOSTA - usiamo date_of_arrival unificato
    return '-';
},
        
        // MAPPING PER COLONNE SHIPSGO SEA
        port_of_loading: (value, row) => {
            return value || 
                   row.metadata?.['Port Of Loading'] || 
                   row.metadata?.port_of_loading ||
                   row.origin_port ||
                   '-';
        },
        
        port_of_discharge: (value, row) => {
            return value || 
                   row.metadata?.['Port Of Discharge'] || 
                   row.metadata?.port_of_discharge ||
                   row.destination_port ||
                   '-';
        },
        
        container_count: (value, row) => {
            return value || 
                   row.metadata?.['Container Count'] || 
                   row.metadata?.container_count ||
                   '-';
        },
        
        // FIX CO2 EMISSION per AWB (dovrebbe essere vuoto)
        co2_emission: (value, row) => {
            // CO2 emission è solo per container marittimi
            if (row.tracking_type === 'awb') {
                return '-';
            }
            const emission = value || 
                            row.metadata?.['CO₂ Emission (Tons)'] || 
                            row.metadata?.co2_emission;
            if (emission && emission !== '-') {
                return `${emission} tons`;
            }
            return '-';
        },
        
        // ALTRI CAMPI COMUNI
        carrier_code: (value, row) => {
            return value || 
                   row.metadata?.['Carrier'] || 
                   row.metadata?.['Airline'] ||
                   row.metadata?.carrier ||
                   row.metadata?.airline ||
                   '-';
        },
        
        reference_number: (value, row) => {
            const ref = value || 
                       row.metadata?.['Reference'] || 
                       row.metadata?.reference ||
                       row.reference_number;
            return ref ? `<code>${ref}</code>` : '-';
        },
        
        booking: (value, row) => {
            return value || 
                   row.metadata?.['Booking'] || 
                   row.metadata?.booking ||
                   '-';
        },
        
        awb_number: (value, row) => {
            return value || 
                   row.metadata?.['AWB Number'] || 
                   row.metadata?.awb_number ||
                   row.tracking_number ||
                   '-';
        },
        
        origin: (value, row) => {
            return value || 
                   row.metadata?.['Origin'] || 
                   row.metadata?.origin ||
                   row.origin_port ||
                   '-';
        },
        
        destination: (value, row) => {
            return value || 
                   row.metadata?.['Destination'] || 
                   row.metadata?.destination ||
                   row.destination_port ||
                   '-';
        },
        
        // COUNTRY FIELDS - UNIFICATI PER AIR E SEA
        // FIX ORIGIN COUNTRY - Deve essere tutto maiuscolo
        origin_country: (value, row) => {
            let country = '';
            // Per SEA: usa POL Country
            if (row.tracking_type === 'container' || row.tracking_type === 'bl') {
                country = row.metadata?.['POL Country'] || 
                         row.metadata?.pol_country ||
                         value || '-';
            } else {
                // Per AIR: usa Origin Country
                country = row.origin_country ||  // Campo diretto
                         value || 
                         row.metadata?.['Origin Country'] || 
                         row.metadata?.origin_country ||
                         '-';
            }
            // IMPORTANTE: Converti in maiuscolo per consistenza
            return country !== '-' ? country.toUpperCase() : '-';
        },
        
        origin_country_code: (value, row) => {
            // Per SEA: usa POL Country Code
            if (row.tracking_type === 'container' || row.tracking_type === 'bl') {
                return row.metadata?.['POL Country Code'] || 
                       row.metadata?.pol_country_code ||
                       value || '-';
            }
            
            // Per AIR: usa Origin Country Code
            return value || 
                   row.metadata?.['Origin Country Code'] || 
                   row.metadata?.origin_country_code ||
                   '-';
        },
        
        // FIX DESTINATION COUNTRY - Deve essere tutto maiuscolo
        destination_country: (value, row) => {
            let country = '';
            // Per SEA: usa POD Country
            if (row.tracking_type === 'container' || row.tracking_type === 'bl') {
                country = row.metadata?.['POD Country'] || 
                         row.metadata?.pod_country ||
                         value || '-';
            } else {
                // Per AIR: usa Destination Country
                country = row.destination_country ||  // Campo diretto
                         value || 
                         row.metadata?.['Destination Country'] || 
                         row.metadata?.destination_country ||
                         '-';
            }
            // IMPORTANTE: Converti in maiuscolo per consistenza
            return country !== '-' ? country.toUpperCase() : '-';
        },
        
        destination_country_code: (value, row) => {
            // Per SEA: usa POD Country Code
            if (row.tracking_type === 'container' || row.tracking_type === 'bl') {
                return row.metadata?.['POD Country Code'] || 
                       row.metadata?.pod_country_code ||
                       value || '-';
            }
            
            // Per AIR: usa Destination Country Code
            return value || 
                   row.metadata?.['Destination Country Code'] || 
                   row.metadata?.destination_country_code ||
                   '-';
        },
        
        // AGGIUNGI ANCHE IL FIX PER TAGS
        tags: (value, row) => {
            const tags = row.tags ||  // Campo diretto
                        value || 
                        row.metadata?.['Tags'] || 
                        row.metadata?.tags;
            // Se tags è "-" o vuoto, non mostrare nulla
            if (!tags || tags === '-' || tags === '') {
                return '-';
            }
            return `<span class="sol-badge sol-badge-secondary">${tags}</span>`;
        },
        
        // CREATED AT SHIPSGO
        created_at_shipsgo: (value, row) => {
            const date = value || 
                        row.metadata?.['Created At'] || 
                        row.metadata?.created_at_shipsgo;
            
            if (!date || date === '-') return '-';
            
            try {
                // Parse formato ShipsGo: "21/05/2025 11:46:47"
                if (typeof date === 'string' && date.includes('/')) {
                    return date; // Già nel formato corretto
                }
                
                const d = new Date(date);
                if (!isNaN(d.getTime())) {
                    return d.toLocaleString('it-IT');
                }
            } catch (e) {}
            
            return date;
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
            return `<span class="sol-badge sol-badge-${config.class}"><i class="fas ${config.icon}"></i> ${config.text}</span>`;
        },
        
        // FIX ETA MAPPING
        eta: (value, row) => {
            // Per AIR: usa Date Of Arrival
            if (row.tracking_type === 'awb') {
                const arrivalDate = row.metadata?.['Date Of Arrival'] || 
                                   row.metadata?.date_of_arrival ||
                                   value;
                
                if (arrivalDate && arrivalDate !== '-') {
                    const date = formatDateOnly(arrivalDate);
                    
                    try {
                        const etaDate = parseDate(arrivalDate);
                        const isInFuture = etaDate > new Date();
                        
                        return `<span class="${isInFuture ? 'text-primary' : 'text-muted'}">
                            ${date}
                            ${isInFuture ? ' <i class="fas fa-clock"></i>' : ''}
                        </span>`;
                    } catch (e) {
                        return date;
                    }
                }
            }
            
            // Per SEA: usa Date Of Discharge
            if (row.tracking_type === 'container' || row.tracking_type === 'bl') {
                const dischargeDate = row.metadata?.['Date Of Discharge'] || 
                                     row.metadata?.date_of_discharge ||
                                     value;
                
                if (dischargeDate && dischargeDate !== '-') {
                    const date = formatDateOnly(dischargeDate);
                    
                    try {
                        const etaDate = parseDate(dischargeDate);
                        const isInFuture = etaDate > new Date();
                        
                        return `<span class="${isInFuture ? 'text-primary' : 'text-muted'}">
                            ${date}
                            ${isInFuture ? ' <i class="fas fa-clock"></i>' : ''}
                        </span>`;
                    } catch (e) {
                        return date;
                    }
                }
            }
            
            // Fallback al valore diretto
            if (!value) return '-';
            
            const date = formatDateOnly(value);
            if (date === '-') return '-';
            
            try {
                const etaDate = parseDate(value);
                const isInFuture = etaDate > new Date();
                
                return `<span class="${isInFuture ? 'text-primary' : 'text-muted'}">
                    ${date}
                    ${isInFuture ? ' <i class="fas fa-clock"></i>' : ''}
                </span>`;
            } catch (e) {
                return date;
            }
        },
        
        created_at: (value) => {
            if (!value) return '-';
            try {
                const date = new Date(value);
                if (isNaN(date.getTime())) return value;
                
                const day = date.getDate().toString().padStart(2, '0');
                const month = (date.getMonth() + 1).toString().padStart(2, '0');
                const year = date.getFullYear();
                const hours = date.getHours().toString().padStart(2, '0');
                const minutes = date.getMinutes().toString().padStart(2, '0');
                
                return `${day}/${month}/${year} ${hours}:${minutes}`;
            } catch (error) {
                return value;
            }
        },
        
        // FIX ULTIMA POSIZIONE (per la colonna last_event_location)
        last_event_location: (value, row) => {
            // Per AWB usa il campo diretto
            if (row.tracking_type === 'awb') {
                return row.ultima_posizione || 
                       row.metadata?.ultima_posizione ||
                       row.metadata?.last_location ||
                       value ||
                       '-';
            }
            // Per altri tipi
            const location = value || 
                            row.last_event_location || 
                            row.metadata?.last_event_location ||
                            row.metadata?.origin_name ||
                            row.metadata?.['Origin Name'] ||
                            row.origin_name ||
                            row.origin_port ||
                            'In Transit';
            
            return location || '-';
        }
    };
    
    // Return formatter or default
    return formatters[key] || ((value) => value || '-');
}

// Helper function per formattare solo la data (senza orario)
function formatDateOnly(dateStr) {
    if (!dateStr || dateStr === '-') return '-';
    
    // Se è già nel formato DD/MM/YYYY, ritornalo
    if (typeof dateStr === 'string' && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
        return dateStr;
    }
    
    // Se ha anche l'orario (es: "19/05/2025 08:10"), prendi solo la data
    if (typeof dateStr === 'string' && /^\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{1,2}/.test(dateStr)) {
        return dateStr.split(' ')[0];
    }
    
    // Altrimenti prova a parsare come data
    try {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
            return d.toLocaleDateString('it-IT');
        }
    } catch (e) {}
    
    return dateStr;
}

// Helper function per parsare date in vari formati
function parseDate(dateStr) {
    if (!dateStr) return null;
    
    // Formato DD/MM/YYYY
    if (typeof dateStr === 'string' && dateStr.includes('/')) {
        const [day, month, year] = dateStr.split(' ')[0].split('/');
        return new Date(year, month - 1, day);
    }
    
    return new Date(dateStr);
}

// Setup event listeners
function setupEventListeners() {
    console.log('🔗 [Tracking] Setting up event listeners...');
    
    // Helper function to safely add event listener
    const safeAddListener = (selector, event, handler, description) => {
        const element = document.querySelector(selector);
        if (element) {
            element.addEventListener(event, handler);
            console.log(`✅ [Tracking] ${description} listener added`);
            return true;
        } else {
            console.warn(`⚠️ [Tracking] ${description} element not found: ${selector}`);
            return false;
        }
    };
    
    // Page actions
    safeAddListener('#addTrackingBtn', 'click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    if (this.isOpening) return;
    this.isOpening = true;
    setTimeout(() => this.isOpening = false, 1000);
    
    if (window.showEnhancedTrackingForm) {
        window.showEnhancedTrackingForm();
    } else {
        showAddTrackingForm();
    }
}, 'Add Tracking');
    safeAddListener('#refreshAllBtn', 'click', refreshAllTrackings, 'Refresh All');
    safeAddListener('#exportPdfBtn', 'click', exportToPDF, 'Export PDF');
    safeAddListener('#exportExcelBtn', 'click', exportToExcel, 'Export Excel');
    
    // Filters
    safeAddListener('#statusFilter', 'change', applyFilters, 'Status Filter');
    safeAddListener('#typeFilter', 'change', applyFilters, 'Type Filter');
    
    // Count successful attachments
    const buttonsToCheck = [
        '#addTrackingBtn', '#refreshAllBtn', '#exportPdfBtn', 
        '#exportExcelBtn', '#statusFilter', '#typeFilter'
    ];
    
    const attachedCount = buttonsToCheck.reduce((count, selector) => {
        return count + (document.querySelector(selector) ? 1 : 0);
    }, 0);
    
    console.log(`📊 [Tracking] Event listeners: ${attachedCount}/${buttonsToCheck.length} elements found`);
    
    // If some elements are missing, try again after a delay
    if (attachedCount < buttonsToCheck.length) {
        console.log('⏱️ [Tracking] Some elements missing, retrying in 500ms...');
        setTimeout(() => {
            console.log('🔄 [Tracking] Retrying event listener setup...');
            setupEventListeners();
        }, 500);
    }
}

// Helper per CSV
function convertToCSV(data) {
    const headers = ['tracking_number', 'tracking_type', 'carrier_code', 'status', 
                    'origin_port', 'destination_port', 'reference_number', 'eta'];
    
    const rows = data.map(t => headers.map(h => t[h] || '').join(','));
    return [headers.join(','), ...rows].join('\n');
}

function downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// Load trackings from localStorage
async function loadTrackings() {
    console.log('🔄 [Tracking] Loading trackings...');
    
    try {
        if (!trackingTable) {
            console.warn('⚠️ [Tracking] TrackingTable not initialized, calling setupTrackingTable()');
            setupTrackingTable();
        }
        
        trackingTable.loading(true);
        
        // Load from localStorage
        const stored = localStorage.getItem('trackings');
        console.log('📦 [Tracking] LocalStorage data:', stored ? 'Found' : 'Empty');
        
        trackings = stored ? JSON.parse(stored) : generateMockTrackings();
        console.log(`📊 [Tracking] Loaded ${trackings.length} trackings`);
        
        // DEBUG: Verifica i campi data
        if (trackings.length > 0) {
            console.log('🔍 DEBUG - Ultimo tracking:', {
                departure: trackings[trackings.length - 1].departure,
                date_of_departure: trackings[trackings.length - 1].date_of_departure,
                metadata: trackings[trackings.length - 1].metadata
            });
        }
        
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
        console.log('📋 [Tracking] Table data set');
        
        // Update timeline if active
        window.currentTrackings = trackings;
        if (window.timelineView && window.timelineView.isActive()) {
            window.timelineView.refresh();
        }
        
        console.log(`✅ [Tracking] Successfully loaded ${trackings.length} trackings`);
        
    } catch (error) {
        console.error('❌ [Tracking] Error loading trackings:', error);
        if (window.NotificationSystem) {
            window.NotificationSystem.error('Errore nel caricamento dei tracking');
        }
        
        // Fallback: generate mock data
        trackings = generateMockTrackings();
        updateStats();
        if (trackingTable) {
            trackingTable.setData(trackings);
        }
        
    } finally {
        if (trackingTable) {
            trackingTable.loading(false);
        }
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
    window.ModalSystem.show({
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
                        <button type="button" class="btn btn-secondary" onclick="window.ModalSystem.closeAll()">
                            Annulla
                        </button>
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-plus"></i> Aggiungi Tracking
                        </button>
                    </div>
                </form>
            </div>
            
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

// Handle file import - AGGIORNATO PER GESTIRE AIR E SEA SHIPSGO
window.handleFileImport = async function(file) {
    if (!file) return;
    
    try {
        console.log('[Import] Starting file import:', file.name);
        
        // Mostra loading
        notificationSystem.info('Caricamento file in corso...', { duration: 0, id: 'import-loading' });
        
        // Determina il tipo di file ShipsGo dal contenuto
        const fileContent = await readFileContent(file);
        const shipsgoType = detectShipsGoType(fileContent);
        
        console.log('[Import] Detected ShipsGo type:', shipsgoType);
        
        // Use ImportManager for actual import con tipo specifico
        if (window.ImportManager) {
            await window.ImportManager.importFile(file, {
                updateExisting: false,
                shipsgoType: shipsgoType, // Passa il tipo rilevato
                statusMapping: STATUS_MAPPING // Passa il mapping degli stati
            });
        } else {
            throw new Error('ImportManager non disponibile');
        }
        
        notificationSystem.dismiss('import-loading');
        
    } catch (error) {
        console.error('[Tracking] Import error:', error);
        notificationSystem.dismiss('import-loading');
        notificationSystem.error('Errore durante l\'import: ' + error.message);
    }
};

// Funzione per leggere il contenuto del file
async function readFileContent(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsText(file);
    });
}

// Funzione per rilevare il tipo di file ShipsGo
function detectShipsGoType(content) {
    const headers = content.split('\n')[0].toLowerCase();
    
    // Controlla per indicatori specifici AIR
    if (headers.includes('awb number') || 
        headers.includes('airline') || 
        headers.includes('ts count') ||
        headers.includes('transit time')) {
        return 'air';
    }
    
    // Controlla per indicatori specifici SEA
    if (headers.includes('container count') || 
        headers.includes('port of loading') || 
        headers.includes('port of discharge') ||
        headers.includes('co2 emission')) {
        return 'sea';
    }
    
    // Default fallback
    return 'generic';
}

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

// SOSTITUISCI la funzione handleAddTracking con questa versione:
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
        created_at: new Date().toISOString()
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
    
    try {
        // Mostra loading
        notificationSystem.info('Recupero informazioni tracking...', { duration: 0, id: 'tracking-loading' });
        
        // USA IL TRACKING SERVICE
        const trackingResult = await window.trackingService.track(
            formData.tracking_number,
            formData.tracking_type || 'auto'
        );
        
        if (trackingResult.success) {
            // Integra i dati dal service con i dati del form
            const enrichedData = {
                ...formData,
                id: Date.now().toString(),
                
                // Dati dal tracking service
                status: trackingResult.status || formData.status,
                carrier_code: trackingResult.carrier?.code || formData.carrier_code,
                carrier_name: trackingResult.carrier?.name || formData.carrier_code,
                
                // Route info
                origin_port: trackingResult.route?.origin?.port || formData.origin_port,
                origin_name: trackingResult.route?.origin?.name,
                origin_country: trackingResult.route?.origin?.country,
                destination_port: trackingResult.route?.destination?.port || formData.destination_port,
                destination_name: trackingResult.route?.destination?.name,
                destination_country: trackingResult.route?.destination?.country,
                eta: trackingResult.route?.destination?.eta || generateETA(trackingResult.status),
                departure_date: trackingResult.route?.origin?.date,
                
                // Vessel/Flight info
                vessel_name: trackingResult.vessel?.name,
                vessel_voyage: trackingResult.vessel?.voyage,
                vessel_imo: trackingResult.vessel?.imo,
                flight_number: trackingResult.flight?.number,
                flight_date: trackingResult.flight?.date,
                
                // Package info (per AWB)
                pieces: trackingResult.package?.pieces,
                weight: trackingResult.package?.weight,
                weight_unit: trackingResult.package?.weightUnit,
                
                // Eventi e metadata
                events: trackingResult.events || [],
                last_event_date: trackingResult.events?.[0]?.date,
                last_event_location: trackingResult.events?.[0]?.location,
                last_event_status: trackingResult.events?.[0]?.status,
                
                // Metadata completi
                metadata: {
                    ...trackingResult.metadata,
                    source: trackingResult.metadata?.source || 'manual',
                    api_response: trackingResult.mockData ? 'mock' : 'live',
                    booking: trackingResult.metadata?.booking,
                    container_size: trackingResult.metadata?.containerSize,
                    co2_emission: trackingResult.metadata?.co2Emission,
                    ts_count: trackingResult.metadata?.tsCount,
                    transit_time: trackingResult.metadata?.transitTime
                },
                
                // Tracking info
                data_source: trackingResult.mockData ? 'mock' : 'api',
                last_update: trackingResult.lastUpdate || new Date().toISOString()
            };
            
            // Aggiungi ai trackings
            trackings.push(enrichedData);
            
            // Salva in localStorage
            localStorage.setItem('trackings', JSON.stringify(trackings));
            
            // Rimuovi notifica loading
            notificationSystem.dismiss('tracking-loading');
            
            // Notifica successo
            if (trackingResult.mockData) {
                notificationSystem.info('Tracking aggiunto (modalità demo)');
            } else if (trackingResult.fromCache) {
                notificationSystem.success('Tracking aggiunto (da cache)');
            } else {
                notificationSystem.success('Tracking aggiunto con dati live!');
            }
            
            // Se ci sono errori API ma abbiamo fallback
            if (trackingResult.apiError) {
                console.warn('API Error (using fallback):', trackingResult.apiError);
            }
        }
        
    } catch (error) {
        console.error('[Tracking] Service error:', error);
        notificationSystem.dismiss('tracking-loading');
        
        // Fallback: aggiungi manualmente con dati base
        formData.id = Date.now().toString();
        formData.data_source = 'manual';
        formData.metadata = { error: error.message };
        trackings.push(formData);
        localStorage.setItem('trackings', JSON.stringify(trackings));
        
        notificationSystem.warning('Tracking aggiunto manualmente (API non disponibile)');
    }
    
    // Close modal and reload
    window.ModalSystem.closeAll();
    await loadTrackings();
}

// SOSTITUISCI anche handleRefreshTracking:
async function handleRefreshTracking(id) {
    const tracking = trackings.find(t => t.id == id);
    if (!tracking) return;
    
    try {
        notificationSystem.info('Aggiornamento tracking...', { duration: 0, id: 'refresh-loading' });
        
        // Usa il tracking service per refresh con force refresh
        const refreshResult = await window.trackingService.track(
            tracking.tracking_number,
            tracking.tracking_type || 'auto',
            { forceRefresh: true }
        );
        
        if (refreshResult.success) {
            // Aggiorna i dati del tracking
            Object.assign(tracking, {
                status: refreshResult.status || tracking.status,
                last_update: refreshResult.lastUpdate || new Date().toISOString(),
                
                // Aggiorna eventi
                events: refreshResult.events || tracking.events || [],
                last_event_date: refreshResult.events?.[0]?.date,
                last_event_location: refreshResult.events?.[0]?.location,
                
                // Aggiorna route info se disponibile
                eta: refreshResult.route?.destination?.eta || tracking.eta,
                
                // Aggiorna metadata
                metadata: {
                    ...tracking.metadata,
                    ...refreshResult.metadata,
                    last_refresh: new Date().toISOString()
                }
            });
            
            // Salva aggiornamenti
            localStorage.setItem('trackings', JSON.stringify(trackings));
            
            notificationSystem.dismiss('refresh-loading');
            
            if (refreshResult.mockData) {
                notificationSystem.success('Tracking aggiornato (demo)');
            } else if (refreshResult.fromCache) {
                notificationSystem.success('Tracking aggiornato (cache)');
            } else {
                notificationSystem.success('Tracking aggiornato con dati live!');
            }
        }
        
    } catch (error) {
        console.error('[Tracking] Refresh error:', error);
        notificationSystem.dismiss('refresh-loading');
        notificationSystem.error('Errore aggiornamento: ' + error.message);
    }
    
    // Reload tabella
    await loadTrackings();
}

// Handle view timeline
async function handleViewTimeline(id) {
    const tracking = trackings.find(t => t.id == id);
    if (!tracking) return;
    
    window.ModalSystem.show({
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
                        ${event.vessel ? `<div class="fas fa-ship"></i> ${event.vessel}</div>` : ''}
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
            description: `${tracking.metadata?.ts_count || '-'} Pieces`,
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
                description: `${tracking.metadata?.ts_count || '-'} Pieces`,
                location: tracking.metadata?.origin || tracking.origin_port,
                class: 'in_transit',
                eventCode: 'MAN',
                flight: tracking.carrier_code ? `${tracking.carrier_code}${Math.floor(Math.random() * 900) + 100}` : '-'
            });
            
            // DEP - Departed
            events.push({
                date: depDate,
                title: 'DEP - Departed',
                description: `${tracking.metadata?.ts_count || '-'} Pieces`,
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
                description: `${tracking.metadata?.ts_count || '-'} Pieces`,
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
                description: `${tracking.metadata?.ts_count || '-'} Pieces`,
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
    console.log('[Delete] Starting delete for ID:', id);
    
    try {
        const confirmed = await window.ModalSystem.confirm({
            title: 'Conferma Eliminazione',
            message: 'Sei sicuro di voler eliminare questo tracking?',
            confirmText: 'Elimina',
            confirmClass: 'sol-btn-danger',
            cancelText: 'Annulla'
        });
        
        console.log('[Delete] Confirmed:', confirmed);
        
        if (!confirmed) {
            console.log('[Delete] Cancelled by user');
            return;
        }
        
        console.log('[Delete] Proceeding with deletion...');
        console.log('[Delete] Current trackings:', trackings.length);
        
        // Remove from array - prova diversi modi
        const idStr = id.toString();
        const idNum = Number(id);
        
        trackings = trackings.filter(t => {
            const keep = t.id !== id && 
                        t.id !== idStr && 
                        t.id !== idNum &&
                        Number(t.id) !== idNum &&
                        String(t.id) !== idStr;
            if (!keep) {
                console.log('[Delete] Removing tracking:', t);
            }
            return keep;
        });
        
        console.log('[Delete] After filter:', trackings.length);
        
        // Save to localStorage  
        localStorage.setItem('trackings', JSON.stringify(trackings));
        
        // Update global reference
        window.currentTrackings = trackings;
        
        // Force immediate UI update
        updateStats();
        trackingTable.setData(trackings);
        
        // Show success notification
        notificationSystem.success('Tracking eliminato');
        
        // Chiudi esplicitamente tutti i modal dopo un breve ritardo
        setTimeout(() => {
            window.ModalSystem.closeAll();
        }, 100);
        
        // Update timeline if active
        if (window.timelineView && window.timelineView.isActive()) {
            window.timelineView.refresh();
        }
        
        console.log('[Delete] Delete completed');
        
    } catch (error) {
        console.error('[Delete] Error:', error);
        notificationSystem.error('Errore durante l\'eliminazione');
    }
}

// Refresh all trackings - MODIFICATA PER USARE bulkTrack
async function refreshAllTrackings() {
    const activeTrackings = trackings.filter(t => !['delivered', 'exception'].includes(t.status));
    
    if (activeTrackings.length === 0) {
        notificationSystem.info('Nessun tracking attivo da aggiornare');
        return;
    }
    
    if (!window.trackingService || !window.trackingService.hasApiKeys()) {
        notificationSystem.warning('API non configurate. Vai in Settings per configurarle.');
        return;
    }
    
    // Show progress
    const progressModal = window.ModalSystem.progress({
        title: 'Aggiornamento Tracking',
        message: 'Aggiornamento in corso...',
        showPercentage: true
    });
    
    try {
        // Prepara tracking per bulk update
        const trackingRequests = activeTrackings.map(t => ({
            id: t.id,
            tracking_number: t.tracking_number,
            type: t.tracking_type || 'container'
        }));
        
        // Esegui bulk tracking con callback per progresso
        const results = await window.trackingService.bulkTrack(trackingRequests, (progress) => {
            const percentage = Math.round((progress.completed / progress.total) * 100);
            progressModal.update(percentage, `Aggiornati ${progress.completed} di ${progress.total} tracking`);
        });
        
        // Aggiorna trackings con nuovi dati
        let updatedCount = 0;
        results.forEach((result, index) => {
            if (result.success && result.data) {
                const tracking = activeTrackings[index];
                const trackingIndex = trackings.findIndex(t => t.id === tracking.id);
                if (trackingIndex !== -1) {
                    trackings[trackingIndex] = {
                        ...tracking,
                        ...result.data,
                        id: tracking.id,
                        created_at: tracking.created_at,
                        updated_at: new Date().toISOString(),
                        metadata: {
                            ...tracking.metadata,
                            ...result.data.metadata,
                            last_bulk_update: new Date().toISOString()
                        }
                    };
                    updatedCount++;
                }
            }
        });
        
        // Salva e aggiorna UI
        localStorage.setItem('trackings', JSON.stringify(trackings));
        await loadTrackings();
        
        progressModal.close();
        notificationSystem.success(`Aggiornati ${updatedCount} tracking su ${activeTrackings.length}`);
        
    } catch (error) {
        console.error('Error in bulk refresh:', error);
        progressModal.close();
        notificationSystem.error('Errore durante l\'aggiornamento multiplo: ' + error.message);
    }
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

// Export functions - AGGIORNATE PER USARE EXPORT MANAGER
async function exportToPDF() {
    try {
        // Verifica se ci sono tracking
        if (!trackings || trackings.length === 0) {
            window.NotificationSystem?.warning('Nessun tracking da esportare');
            return;
        }
        
        // Usa ExportManager
        if (window.ExportManager) {
            await window.ExportManager.exportToPDF(trackings, 'tracking-export', {
                includeSummary: true
            });
        } else {
            throw new Error('ExportManager non disponibile');
        }
    } catch (error) {
        console.error('[Tracking] Export PDF error:', error);
        window.NotificationSystem?.error('Errore export PDF: ' + error.message);
    }
}

async function exportToExcel() {
    try {
        // Verifica se ci sono tracking
        if (!trackings || trackings.length === 0) {
            window.NotificationSystem?.warning('Nessun tracking da esportare');
            return;
        }
        
        // Usa ExportManager
        if (window.ExportManager) {
            await window.ExportManager.exportToExcel(trackings, 'tracking-export', {
                includeSummary: true,
                includeTimeline: true
            });
        } else {
            throw new Error('ExportManager non disponibile');
        }
    } catch (error) {
        console.error('[Tracking] Export Excel error:', error);
        window.NotificationSystem?.error('Errore export Excel: ' + error.message);
    }
}

// Export con filtri applicati - NUOVA FUNZIONE
async function exportFilteredTrackings() {
    try {
        const statusFilter = document.getElementById('statusFilter')?.value;
        const typeFilter = document.getElementById('typeFilter')?.value;
        
        // Usa i dati filtrati dalla tabella
        const filteredData = trackingTable.filteredData || trackings;
        
        if (filteredData.length === 0) {
            window.NotificationSystem?.warning('Nessun tracking da esportare con i filtri attuali');
            return;
        }
        
        const filters = {
            status: statusFilter || null,
            type: typeFilter || null
        };
        
        if (window.ExportManager) {
            // Chiedi formato
            const format = await window.ModalSystem?.confirm({
                title: 'Export Filtrati',
                message: `Esportare ${filteredData.length} tracking filtrati?`,
                confirmText: 'Excel',
                cancelText: 'PDF',
                type: 'info'
            });
            
            if (format === true) {
                await window.ExportManager.exportFiltered(
                    trackings,
                    filters,
                    'excel'
                );
            } else if (format === false) {
                await window.ExportManager.exportFiltered(
                    trackings,
                    filters,
                    'pdf'
                );
            }
        }
        
    } catch (error) {
        console.error('[Tracking] Export filtered error:', error);
        window.NotificationSystem?.error('Errore export: ' + error.message);
    }
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

// ====================
// HELPER FUNCTIONS MANCANTI
// ====================

// Create progress modal helper
function createProgressModal() {
    const modal = document.createElement('div');
    modal.id = 'progressModal';
    modal.innerHTML = `
        <div class="sol-modal-overlay">
            <div class="sol-modal sol-modal-medium">
                <div class="sol-modal-header">
                    <h3 class="sol-modal-title">Aggiornamento Tracking</h3>
                </div>
                <div class="sol-modal-body">
                    <div class="sol-progress">
                        <div id="progressBar" class="sol-progress-bar" style="width: 0%"></div>
                    </div>
                    <p id="progressText" class="sol-progress-text">Inizializzazione...</p>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    return modal;
}

// Update progress modal helper
function updateProgressModal(progress) {
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    
    if (progressBar && progressText) {
        const percentage = Math.round((progress.completed / progress.total) * 100);
        progressBar.style.width = percentage + '%';
        progressText.textContent = `Aggiornati ${progress.completed} di ${progress.total} tracking`;
    }
}

// Make loadTrackings globally available for import
    window.loadTrackings = loadTrackings;
    window.trackings = trackings; // Make trackings array available for debugging
    // Esponi anche la funzione per i filtri
    window.exportFilteredTrackings = exportFilteredTrackings;
