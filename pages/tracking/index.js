import TableManager from '/core/table-manager.js';
import { trackingsColumns } from '/core/table-config.js';
import supabaseTrackingService from '/core/services/supabase-tracking-service.js';
import trackingService from '/core/services/tracking-service.js'; // Importa il servizio

// Carica gli script legacy che si aspettano variabili globali
import '/core/import-manager.js';
import '/pages/tracking/tracking-form-progressive.js';

// State globale del modulo
let tableManager = null;
let trackings = [];
let filteredTrackings = [];
let dataManager = null;

// Funzione di inizializzazione principale per la pagina
async function init(dependencies) {
    console.log('🚀 Initializing tracking page with dependencies...');
    
    dataManager = dependencies.dataManager;

    // Inizializza i servizi e rendili disponibili globalmente per gli script legacy
    window.trackingService = await trackingService.initialize();
    // ImportManager è già disponibile globalmente dal suo script

    const tableContainer = document.getElementById(dependencies.tableContainerId);
    if (!tableContainer) {
        throw new Error(`Container #${dependencies.tableContainerId} not found`);
    }
    tableManager = new TableManager(dependencies.tableContainerId, {
        columns: trackingsColumns,
        selectable: true,
    });

    await loadTrackings();

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
    // ... (logica per i filtri di ricerca, etc.)
}

// Esporta solo la funzione di inizializzazione
export default { init };