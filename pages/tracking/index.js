// index.js - Clean tracking page logic with all mappings
import TableManager from '/core/table-manager.js';
import { TABLE_COLUMNS, formatStatus } from '/pages/tracking/table-columns.js';
import ModalSystem from '/core/modal-system.js';
import { showNotification } from '/core/notification-system.js';
import userPreferencesService from '/core/services/user-preferences-service.js';

// Stato globale
let allTrackings = []; // Dati grezzi dal servizio
let processedTrackings = []; // Dati normalizzati e pronti per la UI
let tableManager;

// Mappature (verranno popolate all'inizializzazione)
let STATUS_DISPLAY_CONFIG;

// Colonne disponibili per la selezione dell'utente
const AVAILABLE_COLUMNS = [
    // Colonne principali
    { key: 'tracking_number', label: 'Tracking Number', required: true, sortable: true },
    { key: 'current_status', label: 'Stato', sortable: true },
    { key: 'carrier_name', label: 'Carrier', sortable: true },
    { key: 'origin', label: 'Origine', sortable: true },
    { key: 'destination', label: 'Destinazione', sortable: true },
    { key: 'eta', label: 'ETA', sortable: true },
    { key: 'updated_at', label: 'Ultimo Aggiornamento', sortable: true },
    { key: 'actions', label: 'Azioni', sortable: false },
    
    // Colonne aggiuntive
    { key: 'tracking_type', label: 'Tipo', sortable: true },
    { key: 'reference_number', label: 'Riferimento', sortable: true },
    { key: 'tags', label: 'Tags', sortable: true },
    { key: 'date_of_departure', label: 'Data Partenza', sortable: true },
    { key: 'date_of_arrival', label: 'Data Arrivo', sortable: true },
    { key: 'transit_time', label: 'Transit Time', sortable: true },
    { key: 'created_at', label: 'Data Inserimento', sortable: true },

    // Dettagli specifici (Mare)
    { key: 'bl_number', label: 'B/L Number', sortable: true },
    { key: 'booking_number', label: 'Booking Number', sortable: true },
    { key: 'vessel_name', label: 'Nave', sortable: true },
    { key: 'voyage_number', label: 'Viaggio', sortable: true },
    { key: 'container_type', label: 'Tipi Container', sortable: true },
    { key: 'total_weight_kg', label: 'Peso Totale (kg)', sortable: true },
    { key: 'total_volume_cbm', label: 'Volume Totale (cbm)', sortable: true },

    // Dettagli specifici (Aereo)
    { key: 'flight_number', label: 'N. Volo', sortable: true },
];

/**
 * Normalizza un singolo record di tracking da qualsiasi fonte in un formato standard per la UI.
 * Questa è la "Single Source of Truth" per la struttura dei dati di tracking.
 * @param {object} rawTracking - L'oggetto di tracking grezzo (dal DB, da API, ecc.).
 * @returns {object} Un oggetto di tracking normalizzato e arricchito.
 */
function normalizeTrackingData(rawTracking) {
    if (!rawTracking) return null;

    const mapped = { ...rawTracking, ...(rawTracking._raw || {}) };

    const normalizedStatus = window.TrackingUnifiedMapping.mapStatus(mapped.current_status || mapped.status);

    const isAir = mapped.tracking_type === 'air_waybill';
    const origin = isAir ? (mapped.origin_name || mapped.origin_port) : (mapped.origin_port || mapped.origin);
    const destination = isAir ? (mapped.destination_name || mapped.destination_port) : (mapped.destination_port || mapped.destination);

    // Calcola i tipi di container
    const containers = mapped.containers || mapped._raw?.shipment?.containers || [];
    const typeSummary = {};
    if (Array.isArray(containers) && containers.length > 0) {
        containers.forEach(c => {
            const type = c.type || 'N/A';
            typeSummary[type] = (typeSummary[type] || 0) + 1;
        });
    }
    const containerTypes = Object.entries(typeSummary).map(([type, count]) => `${count}x${type}`).join(', ');

    return {
        id: mapped.id,
        tracking_number: mapped.tracking_number || 'N/A',
        tracking_type: mapped.tracking_type,
        current_status: normalizedStatus,
        carrier_name: mapped.carrier_name || mapped.carrier,
        origin: origin || 'N/A',
        destination: destination || 'N/A',
        eta: mapped.eta,
        updated_at: mapped.updated_at,
        created_at: mapped.created_at,
        reference_number: mapped.reference_number,
        bl_number: mapped.bl_number,
        booking_number: mapped.booking_number,
        tags: Array.isArray(mapped.tags) ? mapped.tags.join(', ') : mapped.tags,
        transit_time: mapped.transit_time,
        vessel_name: mapped.vessel_name,
        voyage_number: mapped.voyage_number,
        flight_number: mapped.flight_number,
        container_type: containerTypes || mapped.container_details, // Aggiunto campo calcolato
        date_of_departure: mapped.date_of_departure,
        date_of_arrival: mapped.date_of_arrival,
        total_weight_kg: mapped.total_weight_kg || mapped._raw?.shipment?.cargo?.weight || 0,
        total_volume_cbm: mapped.total_volume_cbm || mapped._raw?.shipment?.cargo?.volume || 0,
        _raw: rawTracking,
    };
}


/**
 * Inizializza l'intera pagina di tracking.
 */
async function initializeTrackingPage() {
    try {
        console.log('🚀 Inizializzazione pagina tracking...');

        await waitForDependencies();

        STATUS_DISPLAY_CONFIG = window.TrackingUnifiedMapping.STATUS_DISPLAY_CONFIG;

        await initializeTableManager();

        await loadAndProcessTrackings();
        
        setupEventListeners();

        document.getElementById('loadingState').style.display = 'none';
        console.log('✅ Pagina tracking inizializzata.');
        App.isReady();

    } catch (error) {
        console.error('❌ Errore inizializzazione:', error);
        showError(error.message || "Errore fatale durante l'inizializzazione");
    }
}

async function waitForDependencies() {
    let retries = 0;
    while (!window.TrackingUnifiedMapping && retries < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        retries++;
    }
    if (!window.TrackingUnifiedMapping) {
        throw new Error('Dipendenza critica non trovata: TrackingUnifiedMapping.');
    }
}

async function initializeTableManager() {
    const tableContainer = document.getElementById('trackingTableContainer');
    if (!tableContainer) throw new Error('Contenitore tabella non trovato.');

    const savedPreferences = await userPreferencesService.getPreferences('tracking');
    const defaultVisibleKeys = ['tracking_number', 'current_status', 'carrier_name', 'origin', 'destination', 'eta', 'updated_at', 'actions'];
    const visibleColumnKeys = savedPreferences?.preferences?.column_keys || defaultVisibleKeys;

    const initialColumns = getFormattedColumns(visibleColumnKeys);

    tableManager = new TableManager('trackingTableContainer', {
        columns: initialColumns,
        selectable: true,
        searchable: false,
        enableColumnManager: false,
        paginate: true,
        pageSize: 25,
        onSelectionChange: handleSelectionChange,
    });

    window.tableManager = tableManager;
    if (window.registerTableManager) {
        window.registerTableManager('trackingTableContainer', tableManager);
    }
}

function getFormattedColumns(visibleKeys) {
    return visibleKeys.map(key => {
        const column = AVAILABLE_COLUMNS.find(c => c.key === key);
        if (column && column.key === 'current_status') {
            return {
                ...column,
                formatter: (value) => formatStatus(value, STATUS_DISPLAY_CONFIG)
            };
        }
        return column;
    }).filter(Boolean);
}

// Attende che l'app sia pronta
window.App.onReady(initializeTrackingPage);

/**
 * Carica i dati grezzi dal servizio, li normalizza e aggiorna la UI.
 */
async function loadAndProcessTrackings() {
    try {
        const rawData = await window.supabaseTrackingService.getAllTrackings();
        allTrackings = rawData || [];
        
        processedTrackings = allTrackings.map(normalizeTrackingData).filter(Boolean);
        
        updateUI();
        
    } catch (error) {
        console.error('Errore caricamento trackings:', error);
        showError('Errore nel caricamento dei tracking.');
    }
}

/**
 * Aggiorna la tabella e le statistiche con i dati processati.
 */
function updateUI(trackingsToRender = processedTrackings) {
    if (tableManager) {
        tableManager.setData(trackingsToRender);
    }
    updateStats(trackingsToRender);
    
    const emptyState = document.getElementById('emptyState');
    const tableContainer = document.getElementById('trackingTableContainer');
    const shouldShowEmpty = trackingsToRender.length === 0;
    
    if (emptyState) emptyState.style.display = shouldShowEmpty ? 'block' : 'none';
    if (tableContainer) tableContainer.style.display = shouldShowEmpty ? 'none' : 'block';
}

/**
 * Aggiorna le card delle statistiche.
 */
function updateStats(currentTrackings) {
    const stats = {
        total: currentTrackings.length,
        delivered: 0,
        in_transit: 0,
        exception: 0
    };

    currentTrackings.forEach(t => {
        if (t.current_status === 'delivered' || t.current_status === 'arrived') {
            stats.delivered++;
        }
        if (t.current_status === 'in_transit') {
            stats.in_transit++;
        }
        if (t.current_status === 'exception' || t.current_status === 'delayed') {
            stats.exception++;
        }
    });

    document.getElementById('totalTrackings').textContent = stats.total;
    document.getElementById('arrivedCount').textContent = stats.delivered;
    document.getElementById('inTransitCount').textContent = stats.in_transit;
    document.getElementById('exceptionCount').textContent = stats.exception;
}

/**
 * Gestisce il cambio di selezione nella tabella.
 */
function handleSelectionChange(selected = []) {
    const bulkBar = document.getElementById('bulkActionsBar');
    const count = document.getElementById('selectedCount');
    if (bulkBar) bulkBar.style.display = selected.length > 0 ? 'block' : 'none';
    if (count) count.textContent = selected.length;
}

/**
 * Imposta tutti gli event listener della pagina.
 */
function setupEventListeners() {
    document.getElementById('searchInput')?.addEventListener('input', applyFiltersAndSearch);
    document.getElementById('statusFilter')?.addEventListener('change', applyFiltersAndSearch);
    document.getElementById('carrierFilter')?.addEventListener('change', applyFiltersAndSearch);
    document.getElementById('manageColumnsBtn')?.addEventListener('click', showColumnEditor);
    document.querySelector('.page-actions .btn-success')?.addEventListener('click', () => console.log("Aggiungi tracking...")); // Placeholder
    document.querySelector('.page-actions .btn-info')?.addEventListener('click', () => window.ImportManager.showImportDialog());
    document.querySelector('.btn-outline-secondary')?.addEventListener('click', resetFilters);

    // Esponi le azioni globali per i bottoni nella tabella
    window.trackingDebug = {
        refreshById: (id) => console.log(`Refresh ${id}`), // Placeholder
        viewDetailsById: viewDetails,
        deleteById: deleteTracking,
        refreshAll: loadAndProcessTrackings,
        getProcessedData: () => processedTrackings,
        getRawData: () => allTrackings,
        getTableManager: () => tableManager,
    };
}

/**
 * Applica i filtri e la ricerca testuale.
 */
function applyFiltersAndSearch() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const status = document.getElementById('statusFilter').value;
    const carrier = document.getElementById('carrierFilter').value;

    const filtered = processedTrackings.filter(t => {
        const matchesStatus = !status || t.current_status === status;
        const matchesCarrier = !carrier || (t.carrier_name && t.carrier_name.toLowerCase().includes(carrier.toLowerCase()));
        const matchesSearch = !searchTerm ||
            t.tracking_number.toLowerCase().includes(searchTerm) ||
            (t.carrier_name && t.carrier_name.toLowerCase().includes(searchTerm)) ||
            (t.origin && t.origin.toLowerCase().includes(searchTerm)) ||
            (t.destination && t.destination.toLowerCase().includes(searchTerm)) ||
            (t.reference_number && t.reference_number.toLowerCase().includes(searchTerm));
            
        return matchesStatus && matchesCarrier && matchesSearch;
    });

    updateUI(filtered);
}

/**
 * Resetta tutti i filtri.
 */
function resetFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('statusFilter').value = '';
    document.getElementById('carrierFilter').value = '';
    updateUI(processedTrackings);
}

/**
 * Mostra i dettagli di un tracking in un modale.
 */
function viewDetails(id) {
    const tracking = processedTrackings.find(t => t.id === id);
    if (!tracking) return;

    const content = `
        <div class="container-fluid">
            <div class="row">
                <div class="col-md-6"><strong>Tracking:</strong> ${tracking.tracking_number}</div>
                <div class="col-md-6"><strong>Carrier:</strong> ${tracking.carrier_name}</div>
            </div>
            <hr>
            <div class="row">
                <div class="col-md-6"><strong>Origine:</strong> ${tracking.origin}</div>
                <div class="col-md-6"><strong>Destinazione:</strong> ${tracking.destination}</div>
            </div>
            <div class="row mt-2">
                <div class="col-md-6"><strong>ETA:</strong> ${tracking.eta ? new Date(tracking.eta).toLocaleDateString('it-IT') : '-'}</div>
                <div class="col-md-6"><strong>Stato:</strong> ${formatStatus(tracking.current_status, STATUS_DISPLAY_CONFIG)}</div>
            </div>
            <hr>
            <h5>Dati Raw</h5>
            <pre style="max-height: 300px; overflow-y: auto; background: #f4f4f4; padding: 10px; border-radius: 4px;">${JSON.stringify(tracking._raw, null, 2)}</pre>
        </div>
    `;

    ModalSystem.show({
        title: 'Dettagli Tracking',
        content: content,
        size: 'large',
        buttons: [{ text: 'Chiudi', className: 'btn-secondary', onclick: () => ModalSystem.close() }]
    });
}

/**
 * Elimina un tracking.
 */
async function deleteTracking(id) {
    if (!confirm('Sei sicuro di voler eliminare questo tracking?')) return;
    try {
        await window.supabaseTrackingService.deleteTracking(id);
        showNotification('Tracking eliminato con successo', 'success');
        await loadAndProcessTrackings(); // Ricarica i dati
    } catch (error) {
        console.error('Errore eliminazione:', error);
        showError("Errore durante l'eliminazione del tracking.");
    }
}

/**
 * Mostra l'editor per la gestione delle colonne.
 */
function showColumnEditor() {
    if (typeof Sortable === 'undefined') {
        return showNotification('Libreria di ordinamento non ancora caricata.', 'warning');
    }
    if (!tableManager) {
        return showNotification('TableManager non è pronto.', 'error');
    }

    const currentVisibleKeys = new Set(tableManager.getColumns().map(c => c.key));
    const listContent = AVAILABLE_COLUMNS.map(col => `
        <li class="list-group-item d-flex justify-content-between align-items-center" data-column-key="${col.key}">
            <div>
                <i class="fas fa-grip-vertical drag-handle" style="cursor: move; margin-right: 10px;"></i>
                ${col.label}
            </div>
            <input class="form-check-input" type="checkbox" ${currentVisibleKeys.has(col.key) ? 'checked' : ''} ${col.required ? 'disabled' : ''}>
        </li>
    `).join('');

    ModalSystem.show({
        title: 'Gestisci Colonne',
        content: `<p class="text-muted">Seleziona e riordina le colonne da visualizzare.</p><ul class="list-group" id="column-editor-list">${listContent}</ul>`,
        size: 'large',
        buttons: [
            { text: 'Annulla', className: 'btn-secondary', onclick: () => ModalSystem.close() },
            {
                text: 'Salva',
                className: 'btn-primary',
                onclick: async () => {
                    const list = document.querySelector('#column-editor-list');
                    if (!list) {
                        showError("Errore interno del modale: lista colonne non trovata.");
                        return;
                    }
                    const newVisibleKeys = Array.from(list.querySelectorAll('li'))
                        .filter(li => li.querySelector('input:checked'))
                        .map(li => li.dataset.columnKey);

                    const { success } = await userPreferencesService.savePreferences('tracking', { column_keys: newVisibleKeys });
                    if (success) {
                        const newColumns = getFormattedColumns(newVisibleKeys);
                        tableManager.updateColumns(newColumns);
                        ModalSystem.close();
                        showNotification('Preferenze colonne salvate.', 'success');
                    } else {
                        showError('Errore nel salvataggio delle preferenze.');
                    }
                }
            }
        ],
        onMounted: (modal) => {
            const list = modal.element.querySelector('#column-editor-list');
            new Sortable(list, { animation: 150, handle: '.drag-handle' });
        }
    });
}

function showError(message) {
    if (window.NotificationSystem) {
        window.NotificationSystem.error(message);
    } else {
        alert(message);
    }
}
