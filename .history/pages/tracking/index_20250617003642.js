// ===== TRACKING INDEX - FIX FUNZIONANTE DEFINITIVO =====
// File: pages/tracking/index.js
// FOCUS: Far funzionare tutto senza rompere l'esistente

import TableManager from '../../core/table-manager.js';
const modalSystem = window.ModalSystem;
import notificationSystem from '../../core/notification-system.js';
import trackingService from '/core/services/tracking-service.js';

console.log('🚀 [Tracking] Inizializzazione Fix Funzionante...');

// Tracking patterns
const TRACKING_PATTERNS = {
    container: /^[A-Z]{4}\d{7}$/,
    bl: /^[A-Z]{4}\d{8,12}$/,
    awb: /^\d{3}-\d{8}$/,
    parcel: /^[A-Z0-9]{10,30}$/
};

// Status mapping - TESTATO E FUNZIONANTE
const STATUS_MAPPING = {
    'Sailing': 'in_transit',
    'In Transit': 'in_transit',
    'Arrived': 'arrived',
    'Discharged': 'arrived',
    'On FedEx vehicle for delivery': 'out_for_delivery',
    'Delivered': 'delivered',
    'International shipment release - Import': 'customs_cleared',
    'Shipment information sent to FedEx': 'registered',
    'Registered': 'registered',
    'Pending': 'registered',
    'Booked': 'registered',
    'Booking Confirmed': 'registered'
};

// Global state
let trackingTable = null;
let trackings = [];
let statsCards = [];

// ===== CONFIGURAZIONE COLONNE - SEMPLIFICATA E FUNZIONANTE =====
let currentColumns = [
    'select',
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

// Column definitions - RIDOTTE ALLE ESSENZIALI FUNZIONANTI
const availableColumns = [
    { key: 'select', label: '', visible: true, order: 0, required: false, isCheckbox: true, width: '40px' },
    { key: 'tracking_number', label: 'Numero Tracking', visible: true, order: 1, required: true },
    { key: 'tracking_type', label: 'Tipo', visible: true, order: 2 },
    { key: 'carrier_code', label: 'Vettore', visible: true, order: 3 },
    { key: 'status', label: 'Stato', visible: true, order: 4 },
    { key: 'origin_port', label: 'Origine', visible: true, order: 5 },
    { key: 'destination_port', label: 'Destinazione', visible: true, order: 6 },
    { key: 'reference_number', label: 'Riferimento', visible: true, order: 7 },
    
    // ===== COLONNE SHIPSGO - SOLO QUELLE CHE FUNZIONANO =====
    { key: 'booking', label: 'Booking', visible: false, order: 8 },
    { key: 'container_count', label: 'Container Count', visible: false, order: 9 },
    { key: 'port_of_loading', label: 'Port Of Loading', visible: false, order: 10 },
    { key: 'date_of_loading', label: 'Date Of Loading', visible: false, order: 11 },
    { key: 'awb_number', label: 'AWB Number', visible: false, order: 12 },
    { key: 'origin_country', label: 'Origin Country', visible: false, order: 13 },
    { key: 'destination_country', label: 'Destination Country', visible: false, order: 14 },
    { key: 'transit_time', label: 'Transit Time', visible: false, order: 15 },
    { key: 't5_count', label: 'T5 Count', visible: false, order: 16 },
    
    { key: 'last_event_location', label: 'Ultima Posizione', visible: true, order: 17 },
    { key: 'eta', label: 'ETA', visible: true, order: 18 },
    { key: 'created_at', label: 'Data Inserimento', visible: true, order: 19 },
    { key: 'actions', label: 'Azioni', visible: true, order: 20, required: true, isAction: true }
];

const DEFAULT_COLUMNS = ['select', 'tracking_number', 'tracking_type', 'carrier_code', 'status', 'origin_port', 'destination_port', 'eta', 'created_at', 'actions'];

// ===== FORMATTER DELLE COLONNE - SEMPLIFICATI E FUNZIONANTI =====
function getColumnFormatter(key) {
    const formatters = {
        tracking_type: (value) => {
            const types = {
                'container': { text: 'MARE', class: 'badge badge-info' },
                'bl': { text: 'B/L', class: 'badge badge-info' },
                'awb': { text: 'AEREO', class: 'badge badge-warning' },
                'air': { text: 'AEREO', class: 'badge badge-warning' },
                'parcel': { text: 'PACCO', class: 'badge badge-success' }
            };
            const config = types[value] || { text: value?.toUpperCase() || 'N/A', class: 'badge badge-secondary' };
            return `<span class="${config.class}">${config.text}</span>`;
        },
        
        status: (value) => {
            const statuses = {
                'registered': { class: 'badge badge-secondary', text: 'Registrato' },
                'in_transit': { class: 'badge badge-info', text: 'In Transito' },
                'arrived': { class: 'badge badge-primary', text: 'Arrivato' },
                'customs_cleared': { class: 'badge badge-success', text: 'Sdoganato' },
                'out_for_delivery': { class: 'badge badge-warning', text: 'In Consegna' },
                'delivered': { class: 'badge badge-success', text: 'Consegnato' },
                'delayed': { class: 'badge badge-danger', text: 'In Ritardo' },
                'exception': { class: 'badge badge-danger', text: 'Eccezione' }
            };
            const config = statuses[value] || { class: 'badge badge-secondary', text: value || 'Sconosciuto' };
            return `<span class="${config.class}">${config.text}</span>`;
        },
        
        // ===== FORMATTER SHIPSGO - TESTATI E FUNZIONANTI =====
        origin_port: (value, row) => {
            return value || 
                   row.metadata?.origin || 
                   row.metadata?.['Origin'] ||
                   row.metadata?.origin_port ||
                   '-';
        },
        
        destination_port: (value, row) => {
            return value || 
                   row.metadata?.destination || 
                   row.metadata?.['Destination'] ||
                   row.metadata?.destination_port ||
                   '-';
        },
        
        reference_number: (value, row) => {
            const ref = value || 
                       row.metadata?.reference || 
                       row.metadata?.['Reference'] ||
                       row.metadata?.booking ||
                       row.metadata?.['Booking'];
            return ref ? `<code>${ref}</code>` : '-';
        },
        
        // ===== FORMATTER SPECIFICI SHIPSGO =====
        booking: (value, row) => {
            return value || row.metadata?.booking || row.metadata?.['Booking'] || '-';
        },
        
        container_count: (value, row) => {
            return value || row.metadata?.container_count || row.metadata?.['Container Count'] || '-';
        },
        
        port_of_loading: (value, row) => {
            return value || row.metadata?.port_of_loading || row.metadata?.['Port Of Loading'] || '-';
        },
        
        date_of_loading: (value, row) => {
            const date = value || row.metadata?.date_of_loading || row.metadata?.['Date Of Loading'];
            return formatDateSimple(date);
        },
        
        awb_number: (value, row) => {
            return value || row.metadata?.awb_number || row.metadata?.['AWB Number'] || row.tracking_number || '-';
        },
        
        origin_country: (value, row) => {
            return value || row.metadata?.origin_country || row.metadata?.['Origin Country'] || '-';
        },
        
        destination_country: (value, row) => {
            return value || row.metadata?.destination_country || row.metadata?.['Destination Country'] || '-';
        },
        
        t5_count: (value, row) => {
            return value || row.metadata?.t5_count || row.metadata?.['T5 Count'] || '-';
        },
        
        // ===== TRANSIT TIME FIX DEFINITIVO =====
        transit_time: (value, row) => {
            // Prova a calcolare dalle date ShipsGo
            const depDate = row.metadata?.['Date Of Departure'] || row.metadata?.date_of_departure;
            const arrDate = row.metadata?.['Date Of Arrival'] || row.metadata?.date_of_arrival;
            
            if (depDate && arrDate) {
                try {
                    let dep, arr;
                    
                    // Parse date DD/MM/YYYY
                    if (typeof depDate === 'string' && depDate.includes('/')) {
                        const [day, month, year] = depDate.split(' ')[0].split('/');
                        dep = new Date(year, month - 1, day);
                    } else {
                        dep = new Date(depDate);
                    }
                    
                    if (typeof arrDate === 'string' && arrDate.includes('/')) {
                        const [day, month, year] = arrDate.split(' ')[0].split('/');
                        arr = new Date(year, month - 1, day);
                    } else {
                        arr = new Date(arrDate);
                    }
                    
                    if (!isNaN(dep.getTime()) && !isNaN(arr.getTime())) {
                        const diffTime = Math.abs(arr - dep);
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        const finalDays = diffDays === 0 ? 1 : diffDays;
                        
                        console.log(`[Transit] ${depDate} → ${arrDate} = ${finalDays} giorni`);
                        return `${finalDays}`;
                    }
                } catch (e) {
                    console.warn('Error calculating transit time:', e);
                }
            }
            
            // Fallback al valore salvato
            return value || row.metadata?.transit_time || row.metadata?.['Transit Time'] || '-';
        },
        
        // ===== ETA INTELLIGENTE =====
        eta: (value, row) => {
            let etaValue = value || row.eta;
            
            // Per spedizioni aeree, usa Date Of Arrival
            if ((row.tracking_type === 'awb' || row.tracking_type === 'air') && (!etaValue || etaValue === '-')) {
                etaValue = row.metadata?.['Date Of Arrival'] || row.metadata?.date_of_arrival;
            }
            // Per container, usa Date Of Discharge
            else if ((row.tracking_type === 'container' || row.tracking_type === 'bl') && (!etaValue || etaValue === '-')) {
                etaValue = row.metadata?.['Date Of Discharge'] || row.metadata?.date_of_discharge;
            }
            
            return formatDateSimple(etaValue);
        },
        
        created_at: (value) => {
            return formatDateTimeSimple(value);
        },
        
        last_event_location: (value, row) => {
            if (value && value !== '-') return value;
            
            // Logic intelligente per ultima posizione
            if (row.status === 'delivered' || row.status === 'arrived') {
                return row.destination_port || row.metadata?.destination || 'Destinazione';
            } else if (row.status === 'in_transit') {
                return 'In transito';
            } else {
                return row.origin_port || row.metadata?.origin || 'Origine';
            }
        },
        
        carrier_code: (value) => value || '-'
    };
    
    // Formatter specifico o universale
    const formatter = formatters[key];
    if (formatter) {
        return formatter;
    }
    
    // Formatter universale per campi non specificati
    return (value, row) => {
        if (value !== undefined && value !== null && value !== '') {
            return value;
        }
        
        if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
            return row[key];
        }
        
        if (row.metadata && row.metadata[key]) {
            return row.metadata[key];
        }
        
        const capitalKey = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
        if (row.metadata && row.metadata[capitalKey]) {
            return row.metadata[capitalKey];
        }
        
        return '-';
    };
}

// ===== HELPER FUNZIONI SEMPLIFICATE =====
function formatDateSimple(dateValue) {
    if (!dateValue || dateValue === '-') return '-';
    
    try {
        // Se già in formato DD/MM/YYYY, mantieni
        if (typeof dateValue === 'string' && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateValue)) {
            return dateValue;
        }
        
        // Se formato con orario, estrai solo data
        if (typeof dateValue === 'string' && dateValue.includes(' ')) {
            return dateValue.split(' ')[0];
        }
        
        // Converti da ISO
        const date = new Date(dateValue);
        if (isNaN(date.getTime())) return dateValue;
        
        return date.toLocaleDateString('it-IT');
    } catch (e) {
        return dateValue;
    }
}

function formatDateTimeSimple(value) {
    if (!value) return '-';
    try {
        const date = new Date(value);
        if (isNaN(date.getTime())) return value;
        
        return date.toLocaleDateString('it-IT') + ' ' + 
               date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
        return value;
    }
}

// ===== FUNZIONI GLOBALI ESPOSTE =====
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

// ===== INIZIALIZZAZIONE PRINCIPALE =====
window.trackingInit = async function() {
    console.log('🚀 [Tracking] Initializing WORKING system...');
    
    try {
        await trackingService.initialize();
        console.log('✅ [Tracking] Service initialized');
        
        window.showAddTrackingForm = showAddTrackingForm;
        window.refreshAllTrackings = refreshAllTrackings;
        window.exportToPDF = exportToPDF;
        window.exportToExcel = exportToExcel;
        window.showColumnManager = showColumnManager;
        
        loadSavedColumns();
        
        // ===== ESPONI getColumnFormatter =====
        window.getColumnFormatter = getColumnFormatter;
        console.log('[Tracking] ✅ getColumnFormatter exposed');
        
        setupStatsCards();
        setupBulkActions();
        setupCheckboxListeners();
        setupTrackingTable();
        setupEventListeners();
        
        await loadTrackings();
        console.log('✅ [Tracking] Initial data loaded');
        
        startAutoRefresh();
        
        window.addEventListener('trackingsUpdated', async (event) => {
            console.log('[Tracking] Trackings updated from import');
            await loadTrackings();
        });
        
        console.log('✅ [Tracking] WORKING system initialized successfully');
        
    } catch (error) {
        console.error('❌ [Tracking] Initialization failed:', error);
        if (window.NotificationSystem) {
            window.NotificationSystem.error('Errore inizializzazione pagina tracking');
        }
    }
};

// ===== LOAD SAVED COLUMNS =====
function loadSavedColumns() {
    const saved = localStorage.getItem('trackingColumns');
    if (saved) {
        try {
            currentColumns = JSON.parse(saved);
            if (!currentColumns.includes('select')) {
                currentColumns.unshift('select');
            }
        } catch (e) {
            currentColumns = [...DEFAULT_COLUMNS];
        }
    } else {
        currentColumns = [...DEFAULT_COLUMNS];
    }
}

// ===== SETUP STATS CARDS =====
function setupStatsCards() {
    const statsGrid = document.getElementById('statsGrid');
    
    statsCards = [
        { id: 'activeTrackings', icon: 'fa-box', label: 'Tracking Attivi', value: 0 },
        { id: 'inTransit', icon: 'fa-ship', label: 'In Transito', value: 0 },
        { id: 'arrived', icon: 'fa-anchor', label: 'Arrivati', value: 0 },
        { id: 'delivered', icon: 'fa-check-circle', label: 'Consegnati', value: 0 },
        { id: 'delayed', icon: 'fa-exclamation-triangle', label: 'In Ritardo', value: 0 }
    ];
    
    if (statsGrid) {
        statsGrid.innerHTML = statsCards.map(card => `
            <div class="sol-stat-card" data-id="${card.id}">
                <i class="fas fa-grip-vertical card-drag-handle"></i>
                <i class="fas ${card.icon} sol-stat-icon"></i>
                <div class="sol-stat-value" id="${card.id}">0</div>
                <div class="sol-stat-label">${card.label}</div>
            </div>
        `).join('');
        
        if (window.Sortable) {
            new Sortable(statsGrid, {
                animation: 150,
                ghostClass: 'sortable-ghost',
                handle: '.card-drag-handle',
                onEnd: () => saveStatsOrder()
            });
        }
        
        restoreStatsOrder();
    }
}

// ===== SETUP TRACKING TABLE - USANDO CLASSI ESISTENTI =====
function setupTrackingTable() {
    const columns = currentColumns.map(colKey => {
        const colDef = availableColumns.find(c => c.key === colKey);
        if (!colDef) return null;
        
        // Gestione colonna checkbox
        if (colDef.isCheckbox) {
            return {
                key: 'select',
                label: `<input type="checkbox" class="select-all" onchange="toggleSelectAll(this)">`,
                sortable: false,
                width: colDef.width,
                formatter: (value, row) => `
                    <input type="checkbox" 
                           class="row-select" 
                           data-row-id="${row.id}"
                           onchange="updateSelectedCount()">
                `
            };
        }
        
        // Gestione colonna azioni
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
            sortable: !colDef.isAction && !colDef.isCheckbox,
            formatter: formatter
        };
    }).filter(Boolean);
    
    trackingTable = new TableManager('trackingTableContainer', {
        columns: columns,
        emptyMessage: 'Nessun tracking attivo. Aggiungi il tuo primo tracking per iniziare.',
        pageSize: 20
        // ===== NON SOVRASCRIVIAMO LE CLASSI CSS ESISTENTI =====
    });
}

// ===== BULK ACTIONS SETUP - SEMPLIFICATO =====
function setupBulkActions() {
    const tableContainer = document.querySelector('.card-header');
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
                        <i class="fas fa-sync-alt"></i> Aggiorna
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="bulkDeleteTrackings()">
                        <i class="fas fa-trash"></i> Elimina
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="exportSelectedTrackings()">
                        <i class="fas fa-file-export"></i> Esporta
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

function setupCheckboxListeners() {
    document.addEventListener('change', (e) => {
        if (e.target.classList.contains('row-select')) {
            updateSelectedCount();
        }
    });
}

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

function toggleSelectAll(checkbox) {
    const checkboxes = document.querySelectorAll('.row-select');
    checkboxes.forEach(cb => {
        cb.checked = checkbox.checked;
        cb.dispatchEvent(new Event('change'));
    });
    updateSelectedCount();
}

function getSelectedRows() {
    const selected = [];
    document.querySelectorAll('.row-select:checked').forEach(checkbox => {
        const rowId = checkbox.dataset.rowId;
        const tracking = trackings.find(t => t.id == rowId);
        if (tracking) selected.push(tracking);
    });
    return selected;
}

function clearSelection() {
    document.querySelectorAll('.row-select').forEach(cb => cb.checked = false);
    const selectAll = document.querySelector('.select-all');
    if (selectAll) selectAll.checked = false;
    updateSelectedCount();
}

// ===== BULK OPERATIONS =====
async function bulkRefreshTrackings() {
    const selected = getSelectedRows();
    if (selected.length === 0) return;
    
    const progressModal = window.ModalSystem.progress({
        title: 'Aggiornamento Multiplo',
        message: 'Aggiornamento in corso...',
        showPercentage: true
    });
    
    for (let i = 0; i < selected.length; i++) {
        const progress = ((i + 1) / selected.length) * 100;
        progressModal.update(progress, `Aggiornamento ${i + 1} di ${selected.length}...`);
        
        await handleRefreshTracking(selected[i].id);
        await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    progressModal.close();
    clearSelection();
    notificationSystem.success(`${selected.length} tracking aggiornati`);
}

async function bulkDeleteTrackings() {
    const selected = getSelectedRows();
    if (selected.length === 0) return;
    
    // ===== USA IL MODAL SYSTEM CORRETTO =====
    const confirmed = await window.ModalSystem.confirm({
        title: 'Conferma Eliminazione Multipla',
        message: `Sei sicuro di voler eliminare ${selected.length} tracking?`,
        confirmText: 'Elimina Tutti',
        cancelText: 'Annulla'
    });
    
    if (!confirmed) return;
    
    const ids = selected.map(t => t.id);
    trackings = trackings.filter(t => !ids.includes(t.id));
    
    localStorage.setItem('trackings', JSON.stringify(trackings));
    await loadTrackings();
    
    clearSelection();
    notificationSystem.success(`${selected.length} tracking eliminati`);
}

async function exportSelectedTrackings() {
    try {
        const selected = getSelectedRows();
        
        if (selected.length === 0) {
            notificationSystem.warning('Nessun tracking selezionato');
            return;
        }
        
        // ===== USA IL MODAL SYSTEM CORRETTO =====
        const format = await window.ModalSystem.confirm({
            title: 'Formato Export',
            message: 'Seleziona il formato di export:',
            confirmText: 'Excel',
            cancelText: 'PDF'
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
        notificationSystem.error('Errore export: ' + error.message);
    }
}

// ===== COLUMN MANAGER - SEMPLIFICATO =====
function showColumnManager() {
    const manageableColumns = availableColumns.filter(col => col.key !== 'select');
    
    const content = `
        <div class="column-manager">
            <div class="column-manager-header">
                <p>Seleziona e riordina le colonne da visualizzare</p>
                <button class="btn btn-sm btn-secondary" onclick="toggleAllColumns()">
                    Seleziona/Deseleziona Tutto
                </button>
            </div>
            <div class="column-list" id="columnList">
                ${manageableColumns.map(col => {
                    const isChecked = currentColumns.includes(col.key);
                    const isRequired = col.required;
                    return `
                        <div class="column-item ${isRequired ? 'required' : ''}" data-column="${col.key}">
                            <label class="column-checkbox">
                                <input type="checkbox" 
                                       value="${col.key}" 
                                       ${isChecked ? 'checked' : ''} 
                                       ${isRequired ? 'disabled' : ''}
                                       onchange="updateColumnSelection(this)">
                                <span>${col.label}</span>
                                ${isRequired ? '<small> (obbligatorio)</small>' : ''}
                            </label>
                        </div>
                    `;
                }).join('')}
            </div>
            <div class="column-manager-footer">
                <button class="btn btn-secondary" onclick="resetDefaultColumns()">
                    Ripristina Default
                </button>
                <button class="btn btn-primary" onclick="applyColumnChanges()">
                    Applica
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
}

function toggleAllColumns() {
    const checkboxes = document.querySelectorAll('#columnList input[type="checkbox"]:not(:disabled)');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    
    checkboxes.forEach(cb => {
        cb.checked = !allChecked;
        updateColumnSelection(cb);
    });
}

window.updateColumnSelection = function(checkbox) {
    const column = checkbox.value;
    if (checkbox.checked && !currentColumns.includes(column)) {
        currentColumns.push(column);
    } else if (!checkbox.checked && currentColumns.includes(column)) {
        currentColumns = currentColumns.filter(c => c !== column);
    }
};

function applyColumnChanges() {
    localStorage.setItem('trackingColumns', JSON.stringify(currentColumns));
    setupTrackingTable();
    loadTrackings();
    window.ModalSystem.closeAll();
    notificationSystem.success('Colonne aggiornate con successo');
}

function resetDefaultColumns() {
    currentColumns = [...DEFAULT_COLUMNS];
    
    document.querySelectorAll('#columnList input[type="checkbox"]').forEach(cb => {
        cb.checked = DEFAULT_COLUMNS.includes(cb.value);
    });
}

// ===== LOAD TRACKINGS =====
async function loadTrackings() {
    console.log('🔄 [Tracking] Loading trackings...');
    
    try {
        if (!trackingTable) {
            console.warn('⚠️ [Tracking] TrackingTable not initialized');
            setupTrackingTable();
        }
        
        trackingTable.loading(true);
        
        const stored = localStorage.getItem('trackings');
        trackings = stored ? JSON.parse(stored) : generateMockTrackings();
        console.log(`📊 [Tracking] Loaded ${trackings.length} trackings`);
        
        trackings = trackings.map(t => ({
            ...t,
            id: t.id || Date.now() + Math.random(),
            created_at: t.created_at || new Date().toISOString(),
            eta: t.eta || generateETA(t.status)
        }));
        
        localStorage.setItem('trackings', JSON.stringify(trackings));
        
        updateStats();
        trackingTable.setData(trackings);
        
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

// ===== MOCK DATA =====
function generateETA(status) {
    const now = new Date();
    const eta = new Date(now);
    
    switch(status) {
        case 'in_transit':
            eta.setDate(eta.getDate() + 7);
            break;
        case 'arrived':
            eta.setDate(eta.getDate() + 2);
            break;
        case 'out_for_delivery':
            eta.setDate(eta.getDate() + 1);
            break;
        case 'delivered':
        case 'customs_cleared':
            return null;
        default:
            eta.setDate(eta.getDate() + 14);
    }
    
    return eta.toISOString();
}

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
            tracking_number: '999-33019420',
            tracking_type: 'awb',
            carrier_code: 'AIR CHINA',
            status: 'delivered',
            origin_port: 'PEK',
            destination_port: 'FCO',
            reference_number: 'CAVI FIBRA',
            created_at: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
            eta: null,
            metadata: {
                'AWB Number': '999-33019420',
                'Origin Country': 'China',
                'Destination Country': 'Italy',
                'Date Of Departure': '19/05/2024',
                'Date Of Arrival': '20/05/2024',
                'T5 Count': '2',
                transit_time: '1'
            }
        },
        {
            id: '3',
            tracking_number: 'MRKU2556409',
            tracking_type: 'container',
            carrier_code: 'MAERSK LINE',
            status: 'arrived',
            origin_port: 'NINGBO',
            destination_port: 'ROTTERDAM',
            reference_number: 'HUNAN DONGGYІ',
            created_at: new Date(now - 20 * 24 * 60 * 60 * 1000).toISOString(),
            eta: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            metadata: {
                'Container Count': '1',
                'Port Of Loading': 'NINGBO',
                'Date Of Loading': '27/12/2023'
            }
        }
    ];
}

function updateStats() {
    const stats = {
        total: trackings.length,
        in_transit: trackings.filter(t => t.status === 'in_transit').length,
        arrived: trackings.filter(t => t.status === 'arrived').length,
        delivered: trackings.filter(t => t.status === 'delivered').length,
        delayed: trackings.filter(t => t.status === 'delayed').length
    };
    
    const updateElement = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    };
    
    updateElement('activeTrackings', stats.total);
    updateElement('inTransit', stats.in_transit);
    updateElement('arrived', stats.arrived);
    updateElement('delivered', stats.delivered);
    updateElement('delayed', stats.delayed);
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    console.log('🔗 [Tracking] Setting up event listeners...');
    
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
    
    safeAddListener('#addTrackingBtn', 'click', showAddTrackingForm, 'Add Tracking');
    safeAddListener('#refreshAllBtn', 'click', refreshAllTrackings, 'Refresh All');
    safeAddListener('#exportPdfBtn', 'click', exportToPDF, 'Export PDF');
    safeAddListener('#exportExcelBtn', 'click', exportToExcel, 'Export Excel');
    safeAddListener('#statusFilter', 'change', applyFilters, 'Status Filter');
    safeAddListener('#typeFilter', 'change', applyFilters, 'Type Filter');
}

// ===== FORM FUNCTIONS - SEMPLIFICATE =====
function showAddTrackingForm() {
    window.ModalSystem.show({
        title: 'Aggiungi Tracking',
        content: renderTrackingForm(),
        size: 'large',
        showFooter: false
    });
    
    setupFormInteractions();
}

function renderTrackingForm() {
    return `
        <div class="form-container">
            <div class="tabs">
                <button class="tab-btn active" data-tab="single" onclick="switchTab('single')">
                    Singolo Tracking
                </button>
                <button class="tab-btn" data-tab="import" onclick="switchTab('import')">
                    Import Multiplo
                </button>
            </div>
            
            <div class="tab-content active" data-content="single">
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
                                    <option value="COSCO">COSCO</option>
                                </optgroup>
                                <optgroup label="Aereo">
                                    <option value="CARGOLUX">Cargolux</option>
                                    <option value="AIR CHINA">Air China</option>
                                </optgroup>
                                <optgroup label="Express">
                                    <option value="DHL">DHL</option>
                                    <option value="FEDEX">FedEx</option>
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
                            Aggiungi Tracking
                        </button>
                    </div>
                </form>
            </div>
            
            <div class="tab-content" data-content="import">
                <div class="import-container">
                    <div class="import-shipsgo">
                        <h4>Import File ShipsGo</h4>
                        <p>Carica i file Excel esportati da ShipsGo (Mare o Aereo)</p>
                        <input type="file" id="shipsgoFile" accept=".csv,.xlsx,.xls" style="display:none" 
                               onchange="handleFileImport(this.files[0])">
                        <button class="btn btn-primary" onclick="document.getElementById('shipsgoFile').click()">
                            Seleziona File ShipsGo
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function setupFormInteractions() {
    const form = document.getElementById('trackingForm');
    if (form) {
        form.addEventListener('submit', handleAddTracking);
    }
}

// ===== TAB SWITCHING =====
window.switchTab = function(tabName) {
    document.querySelectorAll('.tab-btn').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.dataset.content === tabName);
    });
};

// ===== FILE IMPORT =====
window.handleFileImport = async function(file) {
    if (!file) return;
    
    try {
        console.log('[Import] Starting file import:', file.name);
        
        notificationSystem.info('Caricamento file in corso...', { duration: 0, id: 'import-loading' });
        
        if (window.ImportManager) {
            await window.ImportManager.importFile(file, {
                updateExisting: false,
                statusMapping: STATUS_MAPPING
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

window.detectTrackingType = function(value) {
    const input = value.trim().toUpperCase();
    const typeSelect = document.getElementById('trackingType');
    const hint = document.getElementById('typeHint');
    
    let detectedType = null;
    
    if (TRACKING_PATTERNS.container.test(input)) {
        detectedType = 'container';
    } else if (TRACKING_PATTERNS.awb.test(input)) {
        detectedType = 'awb';
    } else if (input.length >= 10) {
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

// ===== ADD TRACKING HANDLER =====
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
    
    if (!formData.tracking_number || !formData.tracking_type || !formData.carrier_code) {
        notificationSystem.error('Compila tutti i campi obbligatori');
        return;
    }
    
    if (trackings.find(t => t.tracking_number === formData.tracking_number)) {
        notificationSystem.error('Tracking già presente nel sistema');
        return;
    }
    
    formData.id = Date.now().toString();
    trackings.push(formData);
    
    localStorage.setItem('trackings', JSON.stringify(trackings));
    
    window.ModalSystem.closeAll();
    notificationSystem.success('Tracking aggiunto con successo');
    await loadTrackings();
}

// ===== REFRESH TRACKING =====
async function handleRefreshTracking(id) {
    const tracking = trackings.find(t => t.id == id);
    if (!tracking) return;
    
    try {
        notificationSystem.info('Aggiornamento tracking...', { duration: 0, id: 'refresh-loading' });
        
        // Simulazione aggiornamento
        simulateStatusUpdate(tracking);
        
        notificationSystem.dismiss('refresh-loading');
        
    } catch (error) {
        console.error('[Tracking] Refresh error:', error);
        notificationSystem.dismiss('refresh-loading');
        simulateStatusUpdate(tracking);
    }
    
    localStorage.setItem('trackings', JSON.stringify(trackings));
    await loadTrackings();
}

function simulateStatusUpdate(tracking) {
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
    
    if (newStatus === 'arrived') {
        tracking.last_event_location = tracking.destination_port;
    } else if (newStatus === 'out_for_delivery') {
        tracking.last_event_location = 'Local Delivery Hub';
    }
    
    tracking.eta = generateETA(newStatus);
    
    notificationSystem.success('Tracking aggiornato (simulazione)');
}

// ===== VIEW TIMELINE =====
async function handleViewTimeline(id) {
    const tracking = trackings.find(t => t.id == id);
    if (!tracking) return;
    
    window.ModalSystem.show({
        title: `Timeline - ${tracking.tracking_number}`,
        size: 'large',
        content: `
            <div class="timeline-container">
                <h4>Timeline eventi per ${tracking.tracking_number}</h4>
                <p>Tipo: ${tracking.tracking_type} | Vettore: ${tracking.carrier_code}</p>
                <p>Stato attuale: ${tracking.status}</p>
                <hr>
                <div class="timeline-events">
                    <div class="timeline-event">
                        <strong>Tracking Registrato</strong><br>
                        <small>${formatDateTimeSimple(tracking.created_at)}</small><br>
                        Tracking inserito nel sistema
                    </div>
                    ${tracking.status !== 'registered' ? `
                    <div class="timeline-event">
                        <strong>Stato Aggiornato: ${tracking.status}</strong><br>
                        <small>${formatDateTimeSimple(tracking.last_event_date || new Date().toISOString())}</small><br>
                        Ultimo aggiornamento disponibile
                    </div>
                    ` : ''}
                </div>
            </div>
        `
    });
}

// ===== DELETE TRACKING =====
async function handleDeleteTracking(id) {
    console.log('[Delete] Starting delete for ID:', id);
    
    try {
        // ===== USA IL MODAL SYSTEM CORRETTO =====
        const confirmed = await window.ModalSystem.confirm({
            title: 'Conferma Eliminazione',
            message: 'Sei sicuro di voler eliminare questo tracking?',
            confirmText: 'Elimina',
            cancelText: 'Annulla'
        });
        
        console.log('[Delete] Confirmed:', confirmed);
        
        if (!confirmed) {
            console.log('[Delete] Cancelled by user');
            return;
        }
        
        console.log('[Delete] Proceeding with deletion...');
        
        const idStr = id.toString();
        const idNum = Number(id);
        
        trackings = trackings.filter(t => {
            const keep = t.id !== id && 
                        t.id !== idStr && 
                        t.id !== idNum;
            return keep;
        });
        
        localStorage.setItem('trackings', JSON.stringify(trackings));
        updateStats();
        trackingTable.setData(trackings);
        
        notificationSystem.success('Tracking eliminato');
        
        setTimeout(() => {
            window.ModalSystem.closeAll();
        }, 100);
        
        console.log('[Delete] Delete completed');
        
    } catch (error) {
        console.error('[Delete] Error:', error);
        notificationSystem.error('Errore durante l\'eliminazione');
    }
}

// ===== REFRESH ALL =====
async function refreshAllTrackings() {
    const activeTrackings = trackings.filter(t => !['delivered', 'exception'].includes(t.status));
    
    if (activeTrackings.length === 0) {
        notificationSystem.info('Nessun tracking attivo da aggiornare');
        return;
    }
    
    const progressModal = window.ModalSystem.progress({
        title: 'Aggiornamento Tracking',
        message: 'Aggiornamento in corso...',
        showPercentage: true
    });
    
    for (let i = 0; i < activeTrackings.length; i++) {
        const progress = ((i + 1) / activeTrackings.length) * 100;
        progressModal.update(progress, `Aggiornamento ${i + 1} di ${activeTrackings.length}...`);
        
        await handleRefreshTracking(activeTrackings[i].id);
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    progressModal.close();
    notificationSystem.success('Tutti i tracking sono stati aggiornati');
}

// ===== APPLY FILTERS =====
function applyFilters() {
    const statusFilter = document.getElementById('statusFilter')?.value;
    const typeFilter = document.getElementById('typeFilter')?.value;
    
    let filtered = [...trackings];
    
    if (statusFilter) {
        filtered = filtered.filter(t => t.status === statusFilter);
    }
    
    if (typeFilter) {
        filtered = filtered.filter(t => t.tracking_type === typeFilter);
    }
    
    trackingTable.setData(filtered);
    
    window.currentTrackings = filtered;
    if (window.timelineView && window.timelineView.isActive()) {
        window.timelineView.refresh();
    }
}

// ===== EXPORT FUNCTIONS =====
async function exportToPDF() {
    try {
        if (!trackings || trackings.length === 0) {
            notificationSystem.warning('Nessun tracking da esportare');
            return;
        }
        
        if (window.ExportManager) {
            await window.ExportManager.exportToPDF(trackings, 'tracking-export');
        } else {
            // Fallback export semplice
            const data = trackings.map(t => ({
                Numero: t.tracking_number,
                Tipo: t.tracking_type,
                Vettore: t.carrier_code,
                Stato: t.status,
                Origine: t.origin_port,
                Destinazione: t.destination_port
            }));
            console.log('Export data:', data);
            notificationSystem.success('Export completato (simulazione)');
        }
    } catch (error) {
        console.error('[Tracking] Export PDF error:', error);
        notificationSystem.error('Errore export PDF: ' + error.message);
    }
}

async function exportToExcel() {
    try {
        if (!trackings || trackings.length === 0) {
            notificationSystem.warning('Nessun tracking da esportare');
            return;
        }
        
        if (window.ExportManager) {
            await window.ExportManager.exportToExcel(trackings, 'tracking-export');
        } else {
            // Fallback export semplice
            const data = trackings.map(t => ({
                Numero: t.tracking_number,
                Tipo: t.tracking_type,
                Vettore: t.carrier_code,
                Stato: t.status,
                Origine: t.origin_port,
                Destinazione: t.destination_port
            }));
            console.log('Export data:', data);
            notificationSystem.success('Export completato (simulazione)');
        }
    } catch (error) {
        console.error('[Tracking] Export Excel error:', error);
        notificationSystem.error('Errore export Excel: ' + error.message);
    }
}

// ===== UTILITY FUNCTIONS =====
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
        if (!statsGrid) return;
        
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

function startAutoRefresh() {
    setInterval(() => {
        loadTrackings();
    }, 5 * 60 * 1000);
}

// ===== GLOBAL EXPORTS =====
window.loadTrackings = loadTrackings;
window.trackings = trackings;

console.log('✅ [Tracking] WORKING FIX System loaded - Focus su funzionalità!');