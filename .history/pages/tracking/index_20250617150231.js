// ===== TRACKING INDEX - VERSIONE FINALE PERFETTA CON SOLARIUM DESIGN =====
// File: pages/tracking/index.js
// Compatible with Solarium Design System - 100% COMPLETE

import TableManager from '../../core/table-manager.js';
const modalSystem = window.ModalSystem;
import notificationSystem from '../../core/notification-system.js';
import trackingService from '/core/services/tracking-service.js';

console.log('🚀 [Tracking] Inizializzazione Sistema Finale Perfetto...');

// Tracking patterns
const TRACKING_PATTERNS = {
    container: /^[A-Z]{4}\d{7}$/,
    bl: /^[A-Z]{4}\d{8,12}$/,
    awb: /^\d{3}-\d{8}$/,
    parcel: /^[A-Z0-9]{10,30}$/
};

// Status mapping consolidato - PERFETTO PER IMPORT SHIPSGO
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
    
    // Arrived/Discharged
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

// ===== CONFIGURAZIONE COLONNE SOLARIUM DESIGN SYSTEM =====
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

// Column definitions - COMPLETA E PERFETTA
const availableColumns = [
    // Colonna Select (checkbox)
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
    { key: 'pol_country', label: 'POL Country', visible: false, order: 12 },
    { key: 'pol_country_code', label: 'POL Country Code', visible: false, order: 13 },
    { key: 'port_of_discharge', label: 'Port Of Discharge', visible: false, order: 14 },
    { key: 'date_of_discharge', label: 'Date Of Discharge', visible: false, order: 15 },
    { key: 'pod_country', label: 'POD Country', visible: false, order: 16 },
    { key: 'pod_country_code', label: 'POD Country Code', visible: false, order: 17 },
    { key: 'co2_emission', label: 'CO₂ Emission (Tons)', visible: false, order: 18 },
    { key: 'tags', label: 'Tags', visible: false, order: 19 },
    { key: 'created_at_shipsgo', label: 'Created At', visible: false, order: 20 },
    
    // Colonne ShipsGo Air  
    { key: 'awb_number', label: 'AWB Number', visible: false, order: 21 },
    { key: 'airline', label: 'Airline', visible: false, order: 22 },
    { key: 'origin', label: 'Origin', visible: false, order: 23 },
    { key: 'origin_name', label: 'Origin Name', visible: false, order: 24 },
    { key: 'date_of_departure', label: 'Date Of Departure', visible: false, order: 25 },
    { key: 'origin_country', label: 'Origin Country', visible: false, order: 26 },
    { key: 'origin_country_code', label: 'Origin Country Code', visible: false, order: 27 },
    { key: 'destination', label: 'Destination', visible: false, order: 28 },
    { key: 'destination_name', label: 'Destination Name', visible: false, order: 29 },
    { key: 'date_of_arrival', label: 'Date Of Arrival', visible: false, order: 30 },
    { key: 'destination_country', label: 'Destination Country', visible: false, order: 31 },
    { key: 'destination_country_code', label: 'Destination Country Code', visible: false, order: 32 },
    { key: 'transit_time', label: 'Transit Time', visible: false, order: 33 },
    { key: 't5_count', label: 'T5 Count', visible: false, order: 34 },
    
    // Colonne Sistema
    { key: 'last_event_location', label: 'Ultima Posizione', visible: true, order: 35 },
    { key: 'eta', label: 'ETA', visible: true, order: 36 },
    { key: 'created_at', label: 'Data Inserimento', visible: true, order: 37 },
    
    // Actions column
    { key: 'actions', label: 'Azioni', visible: true, order: 38, required: true, isAction: true }
];

// Default columns
const DEFAULT_COLUMNS = ['select', 'tracking_number', 'tracking_type', 'carrier_code', 'status', 'origin_port', 'destination_port', 'eta', 'created_at', 'actions'];

// ===== FORMATTER DELLE COLONNE - VERSIONE SEMPLIFICATA =====
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
        
        // ===== FORMATTER SHIPSGO =====
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
        
        // ===== TRANSIT TIME FIX =====
        transit_time: (value, row) => {
            const depDate = row.metadata?.['Date Of Departure'] || row.metadata?.date_of_departure;
            const arrDate = row.metadata?.['Date Of Arrival'] || row.metadata?.date_of_arrival;
            
            if (depDate && arrDate) {
                try {
                    let dep, arr;
                    
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
                        
                        return `${finalDays}`;
                    }
                } catch (e) {
                    console.warn('Error calculating transit time:', e);
                }
            }
            
            return value || row.metadata?.transit_time || row.metadata?.['Transit Time'] || '-';
        },
        
        // ===== FORMATTER COLONNE SHIPSGO =====
        booking: (value, row) => {
            return value || row.metadata?.booking || row.metadata?.['Booking'] || '-';
        },
        
        container_count: (value, row) => {
            return value || row.metadata?.container_count || row.metadata?.['Container Count'] || '-';
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
        
        created_at: (value) => {
            if (!value) return '-';
            try {
                const date = new Date(value);
                if (isNaN(date.getTime())) return value;
                
                return date.toLocaleDateString('it-IT') + ' ' + 
                       date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
            } catch (error) {
                return value;
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
    console.log('🚀 [Tracking] Initializing FINAL PERFECT system...');
    
    try {
        // Inizializza servizi
        await trackingService.initialize();
        console.log('✅ [Tracking] Service initialized');
        
        // Esponi funzioni
        window.showAddTrackingForm = showAddTrackingForm;
        window.refreshAllTrackings = refreshAllTrackings;
        window.exportToPDF = exportToPDF;
        window.exportToExcel = exportToExcel;
        window.showColumnManager = showColumnManager;
        
        // Load saved columns
        loadSavedColumns();
        
        // ===== ESPONI getColumnFormatter PRIMA della tabella =====
        window.getColumnFormatter = getColumnFormatter;
        console.log('[Tracking] ✅ getColumnFormatter exposed globally');
        
        // Setup componenti - ORDINE IMPORTANTE
        setupStatsCards();
        setupBulkActions();
        setupCheckboxListeners();
        setupTrackingTable();      // Ora userà il formatter esposto
        setupEventListeners();
        
        // Carica dati iniziali
        await loadTrackings();
        console.log('✅ [Tracking] Initial data loaded');
        
        // Auto-refresh
        startAutoRefresh();
        console.log('✅ [Tracking] Auto-refresh started');
        
        // Listen for tracking updates from import
        window.addEventListener('trackingsUpdated', async (event) => {
            console.log('[Tracking] Trackings updated from import');
            await loadTrackings();
        });
        
        console.log('✅ [Tracking] FINAL PERFECT system initialized successfully');
        
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
        
        // Setup Sortable
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

// ===== SETUP TRACKING TABLE - SOLARIUM DESIGN COMPLIANT =====
function setupTrackingTable() {
    const columns = currentColumns.map(colKey => {
        const colDef = availableColumns.find(c => c.key === colKey);
        if (!colDef) return null;
        
        // Gestione colonna checkbox
        if (colDef.isCheckbox) {
            return {
                key: 'select',
                label: `<input type="checkbox" class="select-all sol-form-control" onchange="toggleSelectAll(this)">`,
                sortable: false,
                width: colDef.width,
                formatter: (value, row) => `
                    <input type="checkbox" 
                           class="row-select sol-form-control" 
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
                        <button class="sol-btn-icon" onclick="refreshTracking('${row.id}')" title="Aggiorna">
                            <i class="fas fa-sync-alt"></i>
                        </button>
                        <button class="sol-btn-icon" onclick="viewTimeline('${row.id}')" title="Timeline">
                            <i class="fas fa-history"></i>
                        </button>
                        <button class="sol-btn-icon sol-text-danger" onclick="deleteTracking('${row.id}')" title="Elimina">
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
        pageSize: 20,
        className: 'data-table sol-table' // ===== SOLARIUM DESIGN SYSTEM CLASS =====
    });
}

// ===== BULK ACTIONS SETUP =====
function setupBulkActions() {
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
                    <button class="sol-btn sol-btn-sm sol-btn-primary" onclick="bulkRefreshTrackings()">
                        <i class="fas fa-sync-alt"></i> Aggiorna Selezionati
                    </button>
                    <button class="sol-btn sol-btn-sm sol-btn-danger" onclick="bulkDeleteTrackings()">
                        <i class="fas fa-trash"></i> Elimina Selezionati
                    </button>
                    <button class="sol-btn sol-btn-sm sol-btn-secondary" onclick="exportSelectedTrackings()">
                        <i class="fas fa-file-export"></i> Esporta Selezionati
                    </button>
                    <button class="sol-btn sol-btn-sm sol-btn-outline" onclick="clearSelection()">
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

async function exportSelectedTrackings() {
    try {
        const selected = getSelectedRows();
        
        if (selected.length === 0) {
            window.NotificationSystem?.warning('Nessun tracking selezionato');
            return;
        }
        
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

// ===== COLUMN MANAGER =====
function showColumnManager() {
    const manageableColumns = availableColumns.filter(col => col.key !== 'select');
    
    const content = `
        <div class="column-manager">
            <div class="column-manager-header">
                <p>Seleziona e riordina le colonne da visualizzare</p>
                <button class="sol-btn sol-btn-sm sol-btn-secondary" onclick="toggleAllColumns()">
                    <i class="icon-check-square"></i> Seleziona/Deseleziona Tutto
                </button>
            </div>
            <div class="column-list" id="columnList">
                ${manageableColumns.map(col => {
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
                <button class="sol-btn sol-btn-secondary" onclick="resetDefaultColumns()">
                    <i class="icon-refresh"></i> Ripristina Default
                </button>
                <button class="sol-btn sol-btn-primary" onclick="applyColumnChanges()">
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
    
    setTimeout(() => {
        const columnList = document.getElementById('columnList');
        if (columnList && window.Sortable) {
            new Sortable(columnList, {
                animation: 150,
                handle: '.column-drag-handle',
                ghostClass: 'sortable-ghost',
                onEnd: function(evt) {
                    updateColumnOrder();
                }
            });
        }
    }, 100);
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

function updateColumnOrder() {
    const items = document.querySelectorAll('.column-item');
    const newOrder = ['select'];
    
    items.forEach(item => {
        const column = item.dataset.column;
        const checkbox = item.querySelector('input[type="checkbox"]');
        if (checkbox.checked) {
            newOrder.push(column);
        }
    });
    
    currentColumns = newOrder;
}

function applyColumnChanges() {
    updateColumnOrder();
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
    
    const columnList = document.getElementById('columnList');
    const items = Array.from(columnList.children);
    
    DEFAULT_COLUMNS.forEach(colKey => {
        const item = items.find(el => el.dataset.column === colKey);
        if (item) {
            columnList.appendChild(item);
        }
    });
    
    items.forEach(item => {
        if (!DEFAULT_COLUMNS.includes(item.dataset.column)) {
            columnList.appendChild(item);
        }
    });
}

// ===== LOAD TRACKINGS =====
async function loadTrackings() {
    console.log('🔄 [Tracking] Loading trackings...');
    
    try {
        if (!trackingTable) {
            console.warn('⚠️ [Tracking] TrackingTable not initialized, calling setupTrackingTable()');
            setupTrackingTable();
        }
        
        trackingTable.loading(true);
        
        const stored = localStorage.getItem('trackings');
        console.log('📦 [Tracking] LocalStorage data:', stored ? 'Found' : 'Empty');
        
        trackings = stored ? JSON.parse(stored) : generateMockTrackings();
        console.log(`📊 [Tracking] Loaded ${trackings.length} trackings`);
        
        // Ensure required fields
        trackings = trackings.map(t => ({
            ...t,
            id: t.id || Date.now() + Math.random(),
            created_at: t.created_at || new Date().toISOString(),
            eta: t.eta || generateETA(t.status)
        }));
        
        localStorage.setItem('trackings', JSON.stringify(trackings));
        
        updateStats();
        trackingTable.setData(trackings);
        console.log('📋 [Tracking] Table data set');
        
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

// ===== MOCK DATA GENERATION =====
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

// ===== FORM FUNCTIONS =====
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
        <div class="sol-form">
            <div class="sol-tabs">
                <button class="sol-tab active" data-tab="single" onclick="switchTab('single')">
                    <i class="fas fa-plus"></i> Singolo Tracking
                </button>
                <button class="sol-tab" data-tab="import" onclick="switchTab('import')">
                    <i class="fas fa-file-import"></i> Import Multiplo
                </button>
            </div>
            
            <div class="sol-tab-content active" data-content="single">
                <form id="trackingForm" class="tracking-form">
                    <div class="form-grid">
                        <div class="form-group">
                            <label>Numero Tracking *</label>
                            <input type="text" id="trackingNumber" class="sol-form-control" 
                                   placeholder="Es: MSKU1234567" required
                                   oninput="detectTrackingType(this.value)">
                            <span class="form-hint" id="typeHint"></span>
                        </div>
                        
                        <div class="form-group">
                            <label>Tipo Tracking *</label>
                            <select id="trackingType" class="sol-form-control" required>
                                <option value="">Seleziona tipo</option>
                                <option value="container">Container (Mare)</option>
                                <option value="bl">Bill of Lading (B/L)</option>
                                <option value="awb">Air Waybill (Aereo)</option>
                                <option value="parcel">Parcel/Express</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>Vettore *</label>
                            <select id="carrierCode" class="sol-form-control" required>
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
                            <input type="text" id="referenceNumber" class="sol-form-control" 
                                   placeholder="Es: PO123456">
                        </div>
                        
                        <div class="form-group">
                            <label>Porto Origine</label>
                            <input type="text" id="originPort" class="sol-form-control" 
                                   placeholder="Es: SHANGHAI">
                        </div>
                        
                        <div class="form-group">
                            <label>Porto Destinazione</label>
                            <input type="text" id="destinationPort" class="sol-form-control" 
                                   placeholder="Es: GENOVA">
                        </div>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="sol-btn sol-btn-secondary" onclick="window.ModalSystem.closeAll()">
                            Annulla
                        </button>
                        <button type="submit" class="sol-btn sol-btn-primary">
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
                            <button class="sol-btn sol-btn-primary" onclick="document.getElementById('shipsgoFile').click()">
                                <i class="fas fa-file-excel"></i> Seleziona File ShipsGo
                            </button>
                        </div>
                        
                        <div class="import-divider">
                            <p>Oppure</p>
                        </div>
                        
                        <button class="sol-btn sol-btn-secondary" onclick="downloadTemplate()">
                            <i class="fas fa-download"></i> Scarica Template CSV
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
    document.querySelectorAll('.sol-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    
    document.querySelectorAll('.sol-tab-content').forEach(content => {
        content.classList.toggle('active', content.dataset.content === tabName);
    });
};

// ===== FILE IMPORT - AGGIORNATO PER SHIPSGO =====
window.handleFileImport = async function(file) {
    if (!file) return;
    
    try {
        console.log('[Import] Starting file import:', file.name);
        
        notificationSystem.info('Caricamento file in corso...', { duration: 0, id: 'import-loading' });
        
        const fileContent = await readFileContent(file);
        const shipsgoType = detectShipsGoType(fileContent);
        
        console.log('[Import] Detected ShipsGo type:', shipsgoType);
        
        if (window.ImportManager) {
            await window.ImportManager.importFile(file, {
                updateExisting: false,
                shipsgoType: shipsgoType,
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

// ===== UTILITY FUNCTIONS =====
async function readFileContent(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsText(file);
    });
}

function detectShipsGoType(content) {
    const headers = content.split('\n')[0].toLowerCase();
    
    // Controlla per indicatori specifici AIR
    if (headers.includes('awb number') || 
        headers.includes('airline') || 
        headers.includes('t5 count') ||
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
    
    return 'generic';
}

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

// ===== TRACKING TYPE DETECTION =====
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
        notificationSystem.info('Recupero informazioni tracking...', { duration: 0, id: 'tracking-loading' });
        
        const trackingResult = await trackingService.track(
            formData.tracking_number,
            formData.tracking_type
        );
        
        if (trackingResult.success) {
            // Integra i dati dal service
            formData.status = trackingResult.status || formData.status;
            formData.carrier_code = trackingResult.carrier?.code || formData.carrier_code;
            formData.carrier_name = trackingResult.carrier?.name || formData.carrier_code;
            
            // Route info
            if (trackingResult.route) {
                formData.origin_port = trackingResult.route.origin?.port || formData.origin_port;
                formData.destination_port = trackingResult.route.destination?.port || formData.destination_port;
                formData.eta = trackingResult.route.destination?.eta || formData.eta;
                formData.departure_date = trackingResult.route.origin?.date;
            }
            
            // Vessel info (per container)
            if (trackingResult.vessel) {
                formData.vessel_name = trackingResult.vessel.name;
                formData.voyage_number = trackingResult.vessel.voyage;
                formData.vessel_imo = trackingResult.vessel.imo;
            }
            
            // Flight info (per AWB)
            if (trackingResult.flight) {
                formData.flight_number = trackingResult.flight.number;
                formData.flight_date = trackingResult.flight.date;
            }
            
            // Package info
            if (trackingResult.package) {
                formData.pieces = trackingResult.package.pieces;
                formData.weight = trackingResult.package.weight;
                formData.weight_unit = trackingResult.package.weightUnit;
            }
            
            // Eventi
            if (trackingResult.events && trackingResult.events.length > 0) {
                formData.events = trackingResult.events;
                formData.last_event_date = trackingResult.events[0].date;
                formData.last_event_location = trackingResult.events[0].location;
                formData.last_event_status = trackingResult.events[0].status;
            }
            
            formData.data_source = trackingResult.mockData ? 'mock' : 'api';
            formData.last_update = new Date().toISOString();
            
            notificationSystem.dismiss('tracking-loading');
            
            if (trackingResult.mockData) {
                notificationSystem.info('Dati di esempio caricati (modalità sviluppo)');
            } else {
                notificationSystem.success('Informazioni tracking recuperate con successo!');
            }
        }
        
    } catch (error) {
        console.error('[Tracking] Service error:', error);
        notificationSystem.dismiss('tracking-loading');
        notificationSystem.warning('Impossibile recuperare informazioni. Tracking aggiunto manualmente.');
        formData.data_source = 'manual';
    }
    
    if (!trackingService.mockMode && !trackingService.hasApiKeys()) {
        notificationSystem.info(
            'Configura le API nelle <a href="/settings.html#integrations">impostazioni</a> per il tracking automatico',
            { duration: 5000 }
        );
    }
    
    // Add to trackings
    formData.id = Date.now().toString();
    trackings.push(formData);
    
    // Save to localStorage
    localStorage.setItem('trackings', JSON.stringify(trackings));
    
    // Close modal and reload
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
        
        const refreshResult = await trackingService.refresh(id);
        
        if (refreshResult.success) {
            tracking.status = refreshResult.status || tracking.status;
            tracking.last_update = refreshResult.lastUpdate || new Date().toISOString();
            
            notificationSystem.dismiss('refresh-loading');
            
            if (refreshResult.mockData) {
                notificationSystem.success('Tracking aggiornato (simulazione)');
            } else {
                notificationSystem.success('Tracking aggiornato con successo');
            }
        }
        
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
        content: renderTimeline(tracking)
    });
}

function renderTimeline(tracking) {
    const events = generateTimelineEvents(tracking);
    
    if (tracking.tracking_type === 'awb' || tracking.tracking_type === 'air') {
        return `
            <div class="timeline shipsgo-style">
                <table class="timeline-table sol-table">
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

function generateTimelineEvents(tracking) {
    const events = [];
    const createdDate = new Date(tracking.created_at);
    
    if (tracking.tracking_type === 'awb' || tracking.tracking_type === 'air') {
        // RCS - Received from Shipper
        events.push({
            date: createdDate,
            title: 'RCS - Received From Shipper',
            description: `${tracking.metadata?.t5_count || '-'} Pieces`,
            location: tracking.metadata?.origin || tracking.origin_port,
            class: 'registered',
            eventCode: 'RCS'
        });
        
        if (['in_transit', 'arrived', 'delivered'].includes(tracking.status)) {
            const depDate = tracking.metadata?.departure_date ? 
                new Date(tracking.metadata.departure_date) : 
                new Date(createdDate.getTime() + 1 * 24 * 60 * 60 * 1000);
            
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

// Helper per formattare le date
function formatDate(dateValue) {
    if (!dateValue) return '-';
    
    try {
        // Se già in formato DD/MM/YYYY, mantieni
        if (typeof dateValue === 'string' && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateValue)) {
            return dateValue;
        }
        
        // Se formato esteso con orario, estrai solo la data
        if (typeof dateValue === 'string' && /^\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{1,2}$/.test(dateValue)) {
            return dateValue.split(' ')[0];
        }
        
        // Converti da ISO
        const date = new Date(dateValue);
        if (isNaN(date.getTime())) return dateValue;
        
        return date.toLocaleDateString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch (e) {
        return dateValue;
    }
}

// ===== DELETE TRACKING =====
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
        
        localStorage.setItem('trackings', JSON.stringify(trackings));
        window.currentTrackings = trackings;
        
        updateStats();
        trackingTable.setData(trackings);
        
        notificationSystem.success('Tracking eliminato');
        
        setTimeout(() => {
            window.ModalSystem.closeAll();
        }, 100);
        
        if (window.timelineView && window.timelineView.isActive()) {
            window.timelineView.refresh();
        }
        
        console.log('[Delete] Delete completed');
        
    } catch (error) {
        console.error('[Delete] Error:', error);
        notificationSystem.error('Errore durante l\'eliminazione');
    }
}

// ===== REFRESH ALL TRACKINGS =====
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
            window.NotificationSystem?.warning('Nessun tracking da esportare');
            return;
        }
        
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
        if (!trackings || trackings.length === 0) {
            window.NotificationSystem?.warning('Nessun tracking da esportare');
            return;
        }
        
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

async function exportFilteredTrackings() {
    try {
        const statusFilter = document.getElementById('statusFilter')?.value;
        const typeFilter = document.getElementById('typeFilter')?.value;
        
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
window.exportFilteredTrackings = exportFilteredTrackings;

console.log('✅ [Tracking] FINAL PERFECT JavaScript System loaded - 100% COMPLETE!');
}