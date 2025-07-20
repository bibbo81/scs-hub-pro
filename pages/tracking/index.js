import TableManager from '/core/table-manager.js';
import { trackingsColumns } from '/core/table-config.js';
import supabaseTrackingService from '/core/services/supabase-tracking-service.js';
import ModalSystem from '/core/modal-system.js';

// Importa i componenti dell'interfaccia utente
import '/pages/tracking/tracking-form-progressive.js';
import { importWizard } from '/core/import-wizard.js';

// State globale del modulo
let tableManager = null;
let trackings = [];
let filteredTrackings = [];
let dataManager = null;

// Funzione di inizializzazione principale per la pagina
async function init(dependencies) {
    console.log('🚀 Initializing tracking page with dependencies...');
    
    dataManager = dependencies.dataManager;

    const tableContainer = document.getElementById(dependencies.tableContainerId);
    if (!tableContainer) {
        throw new Error(`Container #${dependencies.tableContainerId} not found`);
    }
    tableManager = new TableManager(dependencies.tableContainerId, {
        columns: trackingsColumns,
        selectable: true,
    });

    await loadTrackings();
    setupEventListeners();

    // Inizializza l'import wizard
    await importWizard.init({ entity: 'trackings' });

    console.log('✅ Tracking page initialized');

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
    if (importWizard) {
        console.log('🚀 Opening import wizard...');
        importWizard.show();
    } else {
        console.error('importWizard not found!');
        window.NotificationSystem.error('Il modulo di importazione non è disponibile.');
    }
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