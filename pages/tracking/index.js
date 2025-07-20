import TableManager from '/core/table-manager.js';
import { trackingsColumns, formatDate, formatDateOnly, formatTrackingStatus } from '/core/table-config.js';
import supabaseTrackingService from '/core/services/supabase-tracking-service.js';
import ModalSystem from '/core/modal-system.js'; // Importa il sistema modale

// State globale del modulo
let tableManager = null;
let trackings = [];
let filteredTrackings = [];
let dataManager = null;

// Funzione di inizializzazione principale per la pagina
async function init(dependencies) {
    console.log('🚀 Initializing tracking page with dependencies...');
    
    // Salva le dipendenze iniettate
    dataManager = dependencies.dataManager;

    // Inizializza il TableManager
    const tableContainer = document.getElementById(dependencies.tableContainerId);
    if (!tableContainer) {
        throw new Error(`Container #${dependencies.tableContainerId} not found`);
    }
    tableManager = new TableManager(dependencies.tableContainerId, {
        columns: trackingsColumns,
        selectable: true,
        // ... altre opzioni ...
    });

    // Carica i dati e imposta gli event listeners
    await loadTrackings();
    setupEventListeners();

    console.log('✅ Tracking page initialized');

    // Restituisce l'oggetto con le azioni per i bottoni
    return {
        showAddTrackingForm,
        showImportDialog,
        showColumnEditor,
        testDataManager,
        deleteTracking,
        refreshTracking,
        viewDetails,
        performBulkAction,
        resetFilters,
        exportData
    };
}

async function loadTrackings() {
    try {
        const data = await supabaseTrackingService.getAllTrackings();
        trackings = data || [];
        filteredTrackings = [...trackings];
        updateTable();
        // ... (updateStats, etc.)
    } catch (error) {
        console.error('Error loading trackings:', error);
    }
}

function updateTable() {
    if (tableManager) {
        tableManager.setData(filteredTrackings);
    }
}

// Funzione per mostrare il modulo di aggiunta tracking
function showAddTrackingForm() {
    if (!ModalSystem) {
        console.error('ModalSystem not available!');
        return;
    }

    ModalSystem.show({
        title: 'Aggiungi Nuovo Tracking',
        content: `
            <div class="form-group">
                <label>Tracking Number *</label>
                <input type="text" id="trackingNumber" class="form-control" required>
            </div>
            <div class="form-group">
                <label>Carrier *</label>
                <input type="text" id="carrier" class="form-control" required placeholder="es. DHL">
            </div>
            <!-- Aggiungi altri campi se necessario -->
        `,
        buttons: [
            { text: 'Annulla', className: 'btn-secondary', action: () => ModalSystem.hide() },
            { 
                text: 'Salva',
                className: 'btn-primary',
                action: async () => {
                    const newData = {
                        tracking_number: document.getElementById('trackingNumber').value,
                        carrier: document.getElementById('carrier').value,
                        carrier_code: document.getElementById('carrier').value, // Semplificato
                        tracking_type: 'container' // Default
                    };

                    if (!newData.tracking_number || !newData.carrier) {
                        window.NotificationSystem.error('Tracking Number e Carrier sono obbligatori.');
                        return;
                    }

                    try {
                        await dataManager.addTracking(newData);
                        ModalSystem.hide();
                        window.NotificationSystem.success('Tracking aggiunto con successo!');
                        loadTrackings(); // Ricarica la tabella
                    } catch (error) {
                        console.error('Failed to add tracking:', error);
                        window.NotificationSystem.error(`Errore: ${error.message}`);
                    }
                }
            }
        ]
    });
}

// --- Altre funzioni (showImportDialog, showColumnEditor, etc.) ---
// (Queste funzioni possono essere implementate in modo simile usando ModalSystem)
function showImportDialog() { window.NotificationSystem.info('Funzione non ancora implementata.'); }
function showColumnEditor() { window.NotificationSystem.info('Funzione non ancora implementata.'); }
function testDataManager() { console.log('Test data manager...'); }
async function deleteTracking(id) { 
    if (!confirm('Sei sicuro?')) return;
    try {
        await dataManager.deleteTracking(id);
        window.NotificationSystem.success('Tracking eliminato!');
        loadTrackings();
    } catch (error) {
        window.NotificationSystem.error('Errore durante la cancellazione.');
    }
}
function refreshTracking(id) { console.log('Refresh', id); }
function viewDetails(id) { console.log('Details', id); }
function performBulkAction(action) { console.log('Bulk', action); }
function resetFilters() { console.log('Reset filters'); }
function exportData() { console.log('Export'); }

function setupEventListeners() {
    // ... (logica per i filtri di ricerca, etc.)
}

// Esporta solo la funzione di inizializzazione
export default { init };