import TableManager from '/core/table-manager.js';
import { trackingsColumns } from '/core/table-config.js';
import supabaseTrackingService from '/core/services/supabase-tracking-service.js';
import trackingService from '/core/services/tracking-service.js'; // Importa il servizio

// NON CARICARE QUI GLI SCRIPT LEGACY, SONO CARICATI IN tracking.html

// State globale del modulo
let tableManager = null;
let trackings = [];
let filteredTrackings = [];
let dataManager = null;

// Funzione di inizializzazione principale per la pagina
async function init(dependencies) {
    console.log('🚀 Initializing tracking page with dependencies...');
    
    dataManager = dependencies.dataManager;

    // trackingService e ImportManager sono già disponibili globalmente da tracking.html
    // Non è necessario inizializzarli qui di nuovo.

    const tableContainer = document.getElementById(dependencies.tableContainerId);
    if (!tableContainer) {
        throw new Error(`Container #${dependencies.tableContainerId} not found`);
    }
    tableManager = new TableManager(dependencies.tableContainerId, {
        columns: trackingsColumns,
        selectable: true,
    });

    await loadTrackings();
    setupEventListeners(); // Ripristina la chiamata a setupEventListeners

    // Aggiungi listener per l'evento di aggiornamento dei tracking
    window.addEventListener('trackingsUpdated', (event) => {
        console.log('🔄 Trackings updated event received, reloading table...', event.detail);
        loadTrackings();
    });

    console.log('✅ Tracking page initialized');

    return {
        showAddTrackingForm,
        showImportDialog,
        deleteTracking,
        // ... (altre azioni se necessario)
    };
}

async function loadTrackings() {
    try {
        const data = await supabaseTrackingService.getAllTrackings();
        trackings = data || [];
        filteredTrackings = [...trackings];
        updateTable();
    } catch (error) {
        console.error('Error loading trackings:', error);
    }
}

function updateTable() {
    if (tableManager) {
        tableManager.setData(filteredTrackings);
    }
}

// Funzione per mostrare il modulo di aggiunta tracking (ora chiama la versione enhanced)
function showAddTrackingForm() {
    if (window.showEnhancedTrackingForm) {
        console.log('🚀 Opening enhanced tracking form...');
        window.showEnhancedTrackingForm();
    } else {
        console.error('showEnhancedTrackingForm not found!');
        window.NotificationSystem.error('Il modulo di aggiunta avanzato non è disponibile.');
    }
}

// Funzione per mostrare il wizard di importazione
function showImportDialog() {
    // Crea un input file nascosto e lo clicca
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.csv,.xls,.xlsx';
    fileInput.style.display = 'none';

    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file && window.ImportManager) {
            console.log(`🚀 Starting import for file: ${file.name}`);
            window.ImportManager.importFile(file, { entity: 'trackings' });
        }
    };

    document.body.appendChild(fileInput);
    fileInput.click();
    document.body.removeChild(fileInput);
}

// --- Altre funzioni (placeholder) ---
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
    
    // Global functions for HTML onclick attributes
    window.refreshTracking = refreshTracking;
    window.viewDetails = viewDetails;
    window.deleteTracking = deleteTracking;
    window.showAddTrackingForm = showAddTrackingForm;
    window.showImportDialog = showImportDialog;
    window.showColumnEditor = showColumnEditor;
    window.exportData = exportData;
    window.resetFilters = resetFilters;
    window.toggleSelectAll = toggleSelectAll;
    window.performBulkAction = performBulkAction;
    
    // Export mappings for other modules
    window.COLUMN_MAPPING = COLUMN_MAPPING;
    window.STATUS_DISPLAY = STATUS_DISPLAY;
    window.getStatusMapping = getStatusMapping;
    window.updateBulkActionsBar = function() {
        // Delega a handleSelectionChange che già esiste
        if (tableManager) {
            const selected = tableManager.getSelectedRows();
            handleSelectionChange(selected);
        }
    };
}

// Esporta solo la funzione di inizializzazione
export default { init };