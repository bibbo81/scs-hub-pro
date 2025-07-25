// index.js - Clean tracking page logic with all mappings
import TableManager from '/core/table-manager.js';
import { TABLE_COLUMNS as trackingsColumns, formatDate, formatDateOnly, formatStatus as formatTrackingStatus } from '/pages/tracking/table-columns-legacy.js';
import ModalSystem from '/core/modal-system.js'; // Corrected import for clarity
import { showNotification } from '/core/notification-system.js';
import userPreferencesService from '/core/services/user-preferences-service.js';

// State
let trackings = [];
let filteredTrackings = [];
let tableManager;

const AVAILABLE_COLUMNS = [
    // General
    { key: 'tracking_number', label: 'Tracking Number', required: true, sortable: true },
    { key: 'tracking_type', label: 'Tipo', sortable: true },
    { key: 'current_status', label: 'Stato', sortable: true },
    { key: 'carrier_name', label: 'Carrier', sortable: true },
    { key: 'reference_number', label: 'Riferimento', sortable: true },
    { key: 'tags', label: 'Tags', sortable: true },

    // Route
    { key: 'origin_port', label: 'Origine', sortable: true },
    { key: 'destination_port', label: 'Destinazione', sortable: true },
    { key: 'origin_country', label: 'Paese Origine', sortable: true },
    { key: 'destination_country', label: 'Paese Destinazione', sortable: true },

    // Dates
    { key: 'date_of_departure', label: 'Data Partenza', sortable: true },
    { key: 'eta', label: 'ETA', sortable: true },
    { key: 'date_of_arrival', label: 'Data Arrivo', sortable: true },
    { key: 'transit_time', label: 'Transit Time', sortable: true },
    { key: 'last_update', label: 'Ultimo Aggiornamento', sortable: true },
    { key: 'created_at', label: 'Data Inserimento', sortable: true },

    // Sea/Container Details
    { key: 'bl_number', label: 'B/L Number', sortable: true },
    { key: 'booking', label: 'Booking Number', sortable: true },
    { key: 'vessel_name', label: 'Nave', sortable: true },
    { key: 'voyage_number', label: 'Viaggio', sortable: true },
    { key: 'container_types', label: 'Tipi Container', sortable: true },
    { key: 'total_weight_kg', label: 'Peso Totale (kg)', sortable: true },
    { key: 'total_volume_cbm', label: 'Volume Totale (cbm)', sortable: true },

    // Air Details
    { key: 'flight_number', label: 'N. Volo', sortable: true },
    { key: 'airline', label: 'Compagnia Aerea', sortable: true },
];


/**
 * Processa un singolo record di tracking per calcolare campi derivati.
 * @param {object} tracking - L'oggetto di tracking originale.
 * @returns {object} L'oggetto di tracking processato con i nuovi campi.
 */
function processTrackingData(tracking) {
    const processed = { ...tracking };

    // --- 1. Normalizzazione dati esistenti (se necessario) ---
    if (tracking.metadata?.source === 'shipsgo_v2_ocean' || tracking.metadata?.source === 'shipsgo_v2_air') {
        const raw = tracking.metadata?.raw;
        const mapped = tracking.metadata?.mapped;

        processed.carrier_name = processed.carrier_name || mapped?.carrier_name || raw?.shipment?.carrier?.name || processed.carrier || '-';
        processed.vessel_name = processed.vessel_name || raw?.shipment?.vessel?.name || '-';
        processed.voyage_number = processed.voyage_number || raw?.shipment?.vessel?.voyage || '-';
        processed.flight_number = processed.flight_number || raw?.shipment?.flight_no || '-';
    }

    // --- 2. Calcolo nuovi campi (peso, volume, tipi container) ---
    const containerCounts = { '20': 0, '40': 0, '40hc': 0, '45hc': 0, 'lcl': 0 };
    const typeSummary = {};
    const containers = tracking.metadata?.raw?.shipment?.containers || [];

    if (Array.isArray(containers) && containers.length > 0) {
        containers.forEach(container => {
            const type = (container.type || '').toUpperCase();
            const size = container.size || 0;

            if (type.includes('20') || size === 20) containerCounts['20']++;
            else if (type.includes('40HC') || type.includes('40HQ')) containerCounts['40hc']++;
            else if (type.includes('40') || size === 40) containerCounts['40']++;
            else if (type.includes('45')) containerCounts['45hc']++;
            else if (type.toLowerCase().includes('lcl')) containerCounts['lcl']++;

            const summaryType = container.type || 'N/A';

            typeSummary[summaryType] = (typeSummary[summaryType] || 0) + 1;
        });
    }

    // Assegna i conteggi calcolati
    processed.container_count_20 = containerCounts['20'];
    processed.container_count_40 = containerCounts['40'];
    processed.container_count_40hc = containerCounts['40hc'];
    processed.container_count_45hc = containerCounts['45hc'];
    processed.container_count_lcl = containerCounts['lcl'];

    // Crea una stringa riassuntiva dei tipi di container
    processed.container_types = Object.entries(typeSummary)
        .map(([type, count]) => `${count}x${type}`)
        .join(', ') || (processed.container_count ? `${processed.container_count} container(s)` : '-');

    // Calcola peso e volume totali
    const cargo = tracking.metadata?.raw?.shipment?.cargo;
    let totalWeight = parseFloat(cargo?.weight) || parseFloat(tracking.weight) || 0;
    let totalVolume = parseFloat(cargo?.volume) || parseFloat(tracking.volume) || 0;

    // Se non ci sono dati sul cargo, prova a sommare dai singoli container
    if (totalWeight === 0 && Array.isArray(containers) && containers.length > 0) {
        totalWeight = containers.reduce((sum, c) => sum + (parseFloat(c.weight) || 0), 0);
        totalVolume = containers.reduce((sum, c) => sum + (parseFloat(c.volume) || 0), 0);
    }
    processed.total_weight_kg = totalWeight;
    processed.total_volume_cbm = totalVolume;

    return processed;
}

const TABLE_COLUMNS = trackingsColumns;

// EXPOSE TO GLOBAL SCOPE for column-editor.js
window.AVAILABLE_COLUMNS = AVAILABLE_COLUMNS;
window.TABLE_COLUMNS = TABLE_COLUMNS;

// Formatters provided by table-config.js

// Initialize
/**
 * Initializes the entire tracking page logic.
 */
async function initializeTrackingPage() {
    try {
        console.log('🚀 Initializing tracking page...');

        // FIX: Wait for critical dependencies to be loaded by other scripts.
        // This prevents a race condition where index.js (module) runs before
        // tracking-unified-mapping.js (regular script).
        let retries = 0;
        while (!window.TrackingUnifiedMapping && retries < 50) { // Wait up to 5 seconds
            await new Promise(resolve => setTimeout(resolve, 100));
            retries++;
        }
        if (!window.TrackingUnifiedMapping) {
            console.error('❌ Critical dependency TrackingUnifiedMapping not found!');
            showError('Errore critico: Mappatura stati non trovata.');
            return;
        }

        // Define constants now that dependencies are ready
        const COLUMN_MAPPING = window.TrackingUnifiedMapping?.COLUMN_MAPPING || {};
        const STATUS_DISPLAY = window.TrackingUnifiedMapping?.STATUS_MAPPING || {};

        // 1. Load column preferences robustly
        let savedPreferences = null;
        try {
            savedPreferences = await userPreferencesService.getPreferences('tracking');
        } catch (prefError) {
            console.warn('⚠️ Could not load user column preferences, using defaults.', prefError);
            showNotification('Impossibile caricare le preferenze delle colonne, verranno usate quelle di default.', 'info');
        }

        const defaultVisibleKeys = ['tracking_number', 'current_status', 'carrier_name', 'origin_port', 'destination_port', 'eta', 'last_update'];
        const visibleColumnKeys = savedPreferences?.preferences?.column_keys || defaultVisibleKeys;

        // 2. Build initial columns based on preferences
        const initialColumns = visibleColumnKeys
            .map(key => AVAILABLE_COLUMNS.find(c => c.key === key))
            .filter(Boolean); // Rimuove eventuali colonne non più valide

        // 3. Initialize TableManager with the correct columns
        const tableContainer = document.getElementById('trackingTableContainer');
        if (!tableContainer) {
            console.error('Elemento #trackingTableContainer non trovato!');
            showError('Errore critico: container della tabella non trovato.');
            return;
        }

        // FIX: Wrap TableManager instantiation in a try-catch to prevent page crash
        try {
            tableManager = new TableManager('trackingTableContainer', {
                columns: initialColumns,
                selectable: true,
                searchable: false, // We use external search
                paginate: true,
                pageSize: 20,
                // ROOT CAUSE FIX: This MUST be false to prevent a crash inside the TableManager constructor
                // which tries to access the table header before it's rendered.
                enableColumnDrag: false, 
                onSelectionChange: handleSelectionChange,
            });
        } catch (tmError) {
            console.error('❌ CRITICAL: TableManager failed to initialize!', tmError);
            showError('Errore critico durante l\'inizializzazione della tabella. Controllare la console.');
            return; // Stop execution if the table fails
        }
        window.tableManager = tableManager;

        // FIX STRUTTURALE: Inizializza gli "enhancements" solo DOPO che tableManager è stato creato.
        // Questo risolve la race condition che causava "TableManager not found".
        if (window.TrackingEnhancements && typeof window.TrackingEnhancements.init === 'function') {
            console.log('🚀 Initializing dependent enhancements...');
            window.TrackingEnhancements.init();
        }

        // Load data
        await loadTrackings();
        
        // Setup event listeners
        setupEventListeners();

        // Collega il pulsante per la gestione colonne
        document.getElementById('manageColumnsBtn')?.addEventListener('click', showColumnEditor);
        
        // Initialize tracking service if available
        if (!window.trackingService) {
            // Try to import it
            try {
                const module = await import('/core/services/tracking-service.js');
                window.trackingService = module.default || module.trackingService || module;
                console.log('🔧 Tracking service imported');
            } catch (error) {
                console.warn('⚠️ Could not import tracking service:', error);
            }
        }
        
        if (window.trackingService) {
            console.log('🔧 Initializing tracking service...');
            const initialized = await window.trackingService.initialize();
            if (initialized) {
                console.log('✅ Tracking service initialized with org API keys');
                
                // Debug: check API configuration
                if (window.trackingService.hasApiKeys()) {
                    console.log('✅ ShipsGo API keys loaded from organization');
                } else {
                    console.warn('⚠️ No ShipsGo API keys found');
                }
            }
        } else {
            console.warn('⚠️ Tracking service not available');
        }

        document.getElementById('loadingState').style.display = 'none';
        console.log('✅ Tracking page initialized');
        // Signal that the app is ready
        App.isReady();

    } catch (error) {
        console.error('❌ Initialization error:', error);
        showError('Errore durante l\'inizializzazione');
    }
}

// Wait for the main application to be ready before initializing the page.
// This is the definitive fix for the race condition with TableManager.
if (window.App && typeof window.App.onReady === 'function') {
    window.App.onReady(initializeTrackingPage);
} else {
    document.addEventListener('DOMContentLoaded', initializeTrackingPage);
}

// Load trackings from Supabase
async function loadTrackings() {
    try {
        if (window.supabaseTrackingService) {
            const data = await window.supabaseTrackingService.getAllTrackings();
            trackings = (data || []).map(processTrackingData);
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
            ].map(processTrackingData);
        }
        
        filteredTrackings = [...trackings];
        updateTable();
        updateStats();
        
    } catch (error) {
        console.error('Error loading trackings:', error);
        showError('Errore nel caricamento dei tracking');
    }
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
        updateStats(); // FIX: Ensure stats are updated with the table
        
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
    if (!window.TrackingUnifiedMapping) {
        console.error("Mappatura stati non disponibile, statistiche non aggiornate.");
        return;
    }

    const stats = {
        total: trackings.length,
        arrivedAndDelivered: 0,
        inTransit: 0,
        exception: 0
    };

    trackings.forEach(t => {
        // Use the unified mapping function to get the normalized status
        const normalizedStatus = window.TrackingUnifiedMapping.mapStatus(t.current_status || t.status);

        if (normalizedStatus === 'delivered' || normalizedStatus === 'arrived') {
            stats.arrivedAndDelivered++;
        }
        if (normalizedStatus === 'in_transit') stats.inTransit++;
        if (normalizedStatus === 'exception' || normalizedStatus === 'delayed') stats.exception++;
    });

    document.getElementById('totalTrackings').textContent = stats.total;
    document.getElementById('arrivedCount').textContent = stats.arrivedAndDelivered;
    document.getElementById('inTransitCount').textContent = stats.inTransit;
    document.getElementById('exceptionCount').textContent = stats.exception;
}

// Handle selection change
function handleSelectionChange(selected = []) {
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

    // Listen for custom events
    window.addEventListener('trackingsUpdated', (e) => {
        console.log('Event trackingsUpdated received, reloading trackings...');
        loadTrackings();
    });
    
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



// Aggiungi bottone per editor colonne nell'UI
// Modifica la sezione page-actions in tracking.html per aggiungere:
/*
<button class="btn btn-secondary" onclick="showColumnEditor()">
    <i class="fas fa-columns mr-2"></i>Colonne
</button>
*/

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
    return {
        // MARE - Stati inglesi
        'sailing': 'in_transit',
        'arrived': 'arrived',
        'delivered': 'delivered',
        'discharged': 'arrived',
        
        // CORRIERI - Stati italiani (lowercase)
        'la spedizione è stata consegnata': 'delivered',
        'consegnata.': 'delivered',
        'la spedizione è stata consegnata': 'delivered',
        'consegna prevista nel corso della giornata odierna.': 'out_for_delivery',
        'la spedizione è in consegna': 'out_for_delivery',
        'la spedizione è in transito': 'in_transit',
        'arrivata nella sede gls locale.': 'in_transit',
        'in transito.': 'in_transit',
        'partita dalla sede mittente. in transito.': 'in_transit',
        'la spedizione e\' stata creata dal mittente, attendiamo che ci venga affidata per l\'invio a destinazione.': 'registered',
        
        // FEDEX - Stati inglesi (lowercase)
        'on fedex vehicle for delivery': 'out_for_delivery',
        'at local fedex facility': 'in_transit',
        'departed fedex hub': 'in_transit',
        'on the way': 'in_transit',
        'arrived at fedex hub': 'in_transit',
        'at destination sort facility': 'in_transit',
        'left fedex origin facility': 'in_transit',
        'picked up': 'in_transit',
        'shipment information sent to fedex': 'registered',
        'international shipment release - import': 'customs_cleared',
        
        // Altri stati
        'empty': 'delivered',
        'empty returned': 'delivered',
        'pod': 'delivered',
        'registered': 'registered',
        'pending': 'registered',
        'booked': 'registered',
        'booking confirmed': 'registered',
        
        // Stati italiani semplici
        'in transito': 'in_transit',
        'arrivata': 'arrived',
        'consegnato': 'delivered',
        'scaricato': 'arrived',
        'in consegna': 'out_for_delivery',
        'sdoganata': 'customs_cleared',
        'spedizione creata': 'registered'
    };
}

// Actions
async function refreshTracking(id) {
    console.log('Refresh tracking:', id);
    const tracking = trackings.find(t => t.id === id);
    if (!tracking) return;
    
    window.NotificationSystem?.info('Aggiornamento tracking...');
    
    try {
        // Check if tracking service is available and initialized
        if (!window.trackingService) {
            console.log('Initializing tracking service...');
            // Try to load tracking service
            const script = document.createElement('script');
            script.src = '/core/services/tracking-service.js';
            script.type = 'module';
            document.head.appendChild(script);
            
            // Wait for it to load
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        if (window.trackingService && window.trackingService.track) {
            // Initialize if needed
            if (!window.trackingService.initialized) {
                await window.trackingService.initialize();
            }
            
            // Use tracking service with ShipsGo API
            const result = await window.trackingService.track(
                tracking.tracking_number, 
                tracking.tracking_type || 'container'
            );
            
            console.log('ShipsGo API result:', result);
            console.log('Using Supabase proxy:', window.trackingService.useSupabase);
            console.log('API Config:', {
                hasV1: !!window.trackingService.apiConfig?.v1?.authCode,
                hasV2: !!window.trackingService.apiConfig?.v2?.userToken,
                mockMode: window.trackingService.mockMode
            });
            
            if (result && result.status !== 'error') {
                // Update local data with ShipsGo response
                const updatedTracking = {
                    ...tracking,
                    current_status: result.stato_attuale || tracking.current_status,
                    last_update: new Date().toISOString(),
                    eta: result.eta || tracking.eta,
                    ata: result.ata || tracking.ata,
                    vessel_name: result.nome_nave || tracking.vessel_name,
                    voyage_number: result.viaggio || tracking.voyage_number,
                    last_event_date: result.ultimo_evento?.data || tracking.last_event_date,
                    last_event_location: result.ultimo_evento?.location || tracking.last_event_location,
                    last_event_description: result.ultimo_evento?.descrizione || tracking.last_event_description,
                    origin_port: result.porto_carico || tracking.origin_port,
                    destination_port: result.porto_scarico || tracking.destination_port,
                    metadata: {
                        ...tracking.metadata,
                        shipsgo_last_update: new Date().toISOString(),
                        events: result.eventi || []
                    }
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
                    updateStats();
                }
                
                window.NotificationSystem?.success('Tracking aggiornato con dati ShipsGo');
            } else {
                throw new Error(result?.message || 'Nessun dato ricevuto da ShipsGo');
            }
        } else {
            // Fallback: just update timestamp
            console.warn('Tracking service not available, using fallback');
            if (window.supabaseTrackingService) {
                await window.supabaseTrackingService.updateTracking(id, {
                    last_update: new Date().toISOString()
                });
            }
            window.NotificationSystem?.warning('Aggiornamento senza API ShipsGo');
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
    if (window.showEnhancedTrackingForm) {
        window.showEnhancedTrackingForm();
        return;
    }

    if (!window.ModalSystem) {
        console.error('ModalSystem not available!');
        return;
    }

    const content = `
        <div class="form-group">
            <label for="tracking_number">Tracking Number</label>
            <input type="text" id="tracking_number" class="form-control" required>
        </div>
        <div class="form-group">
            <label for="carrier_name">Carrier</label>
            <input type="text" id="carrier_name" class="form-control">
        </div>
        <div class="form-group">
            <label for="eta">ETA</label>
            <input type="date" id="eta" class="form-control">
        </div>
    `;

    window.ModalSystem.show({
        title: 'Aggiungi Tracking',
        content: content,
        buttons: [
            {
                text: 'Annulla',
                className: 'btn-secondary',
                action: () => window.ModalSystem.hide()
            },
            {
                text: 'Salva',
                className: 'btn-primary',
                action: async () => {
                    const newTracking = {
                        tracking_number: document.getElementById('tracking_number').value,
                        carrier_name: document.getElementById('carrier_name').value,
                        eta: document.getElementById('eta').value,
                        current_status: 'registered' // Default status
                    };

                    if (!newTracking.tracking_number) {
                        window.NotificationSystem.error('Tracking Number is required');
                        return;
                    }

                    try {
                        await window.supabaseTrackingService.createTracking(newTracking);
                        window.ModalSystem.hide();
                        window.NotificationSystem.success('Tracking aggiunto con successo!');
                        await loadTrackings(); // Refresh data
                    } catch (error) {
                        console.error('Error creating tracking:', error);
                        window.NotificationSystem.error('Errore durante la creazione del tracking.');
                    }
                }
            }
        ]
    });
}

function showImportDialog() {
    console.log('Redirecting to ImportManager.showImportDialog...');
    if (window.ImportManager && window.ImportManager.showImportDialog) {
        window.ImportManager.showImportDialog();
    } else {
        console.error('ImportManager not available!');
        window.NotificationSystem?.error('La funzione di import non è disponibile.');
    }
}

// Handle import file
async function handleImportFile(file) {
    console.log('Importing file:', file.name);
    
    // Close modal
    window.ModalSystem?.hide();
    
    // Show progress
    window.NotificationSystem?.info('Caricamento file in corso...');
    
    try {
        // Check available ImportManager methods
        console.log('ImportManager methods:', Object.keys(window.ImportManager || {}));
        
        if (window.ImportManager && window.ImportManager.importFile) {
            // Use importFile method (that's what your ImportManager exposes)
            const result = await window.ImportManager.importFile(file, {
                entity: 'tracking',
                columnMapping: COLUMN_MAPPING,
                statusMapping: getStatusMapping(),
                saveToSupabase: !!window.supabaseTrackingService,
                trackingService: window.trackingService,
                supabaseService: window.supabaseTrackingService
            });
            
            console.log('Import result:', result);
            
            if (result && result.success) {
                // The ImportManager already saves to localStorage/Supabase
                // Just reload the trackings
                await loadTrackings();
                window.NotificationSystem?.success(`Import completato: ${result.stats?.imported || 0} tracking importati`);
                
                if (result.stats?.errors > 0) {
                    window.NotificationSystem?.warning(`${result.stats.errors} record con errori`);
                }
            } else {
                window.NotificationSystem?.error(`Errore import: ${result?.error || 'Errore sconosciuto'}`);
            }
            
        } else {
            // Fallback: manual parsing
            console.warn('ImportManager not available, using fallback');
            
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    let data;
                    
                    if (file.name.endsWith('.csv')) {
                        // Parse CSV with PapaParse if available
                        if (window.Papa) {
                            const result = Papa.parse(e.target.result, {
                                header: true,
                                dynamicTyping: true,
                                skipEmptyLines: true,
                                transformHeader: (header) => {
                                    // Clean headers
                                    return header.trim();
                                }
                            });
                            
                            if (result.errors.length > 0) {
                                console.warn('CSV parsing warnings:', result.errors);
                            }
                            
                            data = result.data;
                        } else {
                            // Fallback CSV parser
                            data = parseCSV(e.target.result);
                        }
                    } else {
                        // Parse Excel
                        if (!window.XLSX) {
                            throw new Error('XLSX library not loaded');
                        }
                        
                        const workbook = XLSX.read(e.target.result, { 
                            type: file.name.endsWith('.xlsx') ? 'binary' : 'array'
                        });
                        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                        data = XLSX.utils.sheet_to_json(firstSheet, {
                            defval: '', // Default value for empty cells
                            raw: false  // Format dates
                        });
                    }
                    
                    console.log('Parsed data:', data);
                    
                    if (!data || data.length === 0) {
                        throw new Error('Nessun dato trovato nel file');
                    }
                    
                    // Map columns using COLUMN_MAPPING
                    const mappedData = data.map((row, index) => {
                        const mapped = {
                            id: crypto.randomUUID ? crypto.randomUUID() : `import-${Date.now()}-${index}`,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        };
                        
                        // Apply column mapping
                        Object.entries(row).forEach(([key, value]) => {
                            const cleanKey = key.trim();
                            const mappedKey = COLUMN_MAPPING[cleanKey] || cleanKey.toLowerCase().replace(/\s+/g, '_');
                            
                            // Clean value
                            const cleanValue = value?.toString().trim() || '';
                            
                            if (cleanValue) {
                                mapped[mappedKey] = cleanValue;
                            }
                        });
                        
                        // Map status if present
                        if (mapped.current_status || mapped.status) {
                            const status = (mapped.current_status || mapped.status || '').toLowerCase();
                            const statusMap = getStatusMapping();
                            mapped.current_status = statusMap[status] || status;
                            delete mapped.status; // Remove duplicate
                        }
                        
                        // Detect tracking type if not specified
                        if (!mapped.tracking_type && mapped.tracking_number) {
                            mapped.tracking_type = detectTrackingType(mapped.tracking_number);
                        }
                        
                        // Ensure required fields
                        if (!mapped.tracking_number) {
                            console.warn(`Row ${index + 1} missing tracking number:`, row);
                            return null;
                        }
                        
                        return mapped;
                    }).filter(Boolean); // Remove null entries
                    
                    console.log('Mapped data:', mappedData);
                    
                    if (mappedData.length === 0) {
                        throw new Error('Nessun tracking valido trovato');
                    }
                    
                    // Save to Supabase if available
                    if (window.supabaseTrackingService) {
                        let imported = 0;
                        let errors = 0;
                        
                        // Show progress
                        window.NotificationSystem?.info(`Importazione di ${mappedData.length} tracking...`);
                        
                        for (const tracking of mappedData) {
                            try {
                                await window.supabaseTrackingService.createTracking(tracking);
                                imported++;
                            } catch (err) {
                                console.error('Error importing tracking:', tracking.tracking_number, err);
                                errors++;
                            }
                        }
                        
                        // Reload trackings
                        await loadTrackings();
                        
                        // Show results
                        if (imported > 0) {
                            window.NotificationSystem?.success(`Importati ${imported} tracking`);
                        }
                        if (errors > 0) {
                            window.NotificationSystem?.warning(`${errors} tracking con errori`);
                        }
                    } else {
                        // Just show what was read
                        window.NotificationSystem?.success(`Letti ${mappedData.length} tracking dal file`);
                        console.log('Trackings ready for import:', mappedData);
                    }
                    
                } catch (error) {
                    console.error('Import parsing error:', error);
                    window.NotificationSystem?.error('Errore nel parsing: ' + error.message);
                }
            };
            
            // Read file based on type
            if (file.name.endsWith('.csv')) {
                reader.readAsText(file);
            } else if (file.name.endsWith('.xlsx')) {
                reader.readAsBinaryString(file);
            } else {
                reader.readAsArrayBuffer(file);
            }
        }
    } catch (error) {
        console.error('Import error:', error);
        window.NotificationSystem?.error('Errore durante l\'import: ' + error.message);
    }
}

// Parse CSV helper
function parseCSV(text) {
    const lines = text.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
            const values = lines[i].split(',');
            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index]?.trim() || '';
            });
            data.push(row);
        }
    }
    
    return data;
}

function exportData(type = 'excel') {
    if (!filteredTrackings || filteredTrackings.length === 0) {
        window.NotificationSystem?.warning('Nessun dato da esportare');
        return;
    }
    
    // Try to use the advanced ExportManager
    if (window.ExportManager && window.ExportManager.exportTrackings) {
        window.ExportManager.exportTrackings(filteredTrackings, type);
    } else if (window.ExportManager && window.ExportManager.exportData) {
        // Prepare data with proper column names
        const exportData = filteredTrackings.map(t => ({
            'Tracking Number': t.tracking_number,
            'Type': t.tracking_type === 'air_waybill' ? 'Air' : 'Sea',
            'Carrier Code': t.carrier_code || t.carrier_name,
            'Carrier': t.carrier_name,
            'Status': STATUS_DISPLAY[t.current_status]?.label || t.current_status,
            'Reference': t.reference_number || '-',
            'Booking': t.booking || '-',
            'Origin Port': t.origin_port || '-',
            'Origin Country': t.origin_country || '-',
            'Destination Port': t.destination_port || '-',
            'Destination Country': t.destination_country || '-',
            'ETA': t.eta ? new Date(t.eta).toLocaleDateString('it-IT') : '-',
            'ATA': t.ata ? new Date(t.ata).toLocaleDateString('it-IT') : '-',
            'Vessel/Flight': t.vessel_name || '-',
            'Voyage': t.voyage_number || '-',
            'Container': t.container_number || '-',
            'Last Event': t.last_event_description || '-',
            'Destination Port': t.destination_port || '-',
            'Destination Country': t.destination_country || '-',
            'ETA': t.eta ? new Date(t.eta).toLocaleDateString('it-IT') : '-',
            'ATA': t.ata ? new Date(t.ata).toLocaleDateString('it-IT') : '-',
            'Vessel/Flight': t.vessel_name || '-',
            'Voyage': t.voyage_number || '-',
            'Container': t.container_number || '-',
            'Last Event': t.last_event_description || '-',
            'Last Update': t.last_update ? new Date(t.last_update).toLocaleString('it-IT') : '-'
        }));
        
        const options = {
            filename: `tracking_export_${new Date().toISOString().split('T')[0]}`,
            type: type,
            sheetName: 'Tracking Data',
            creator: 'Supply Chain Hub',
            title: 'Tracking Export',
            includeHeaders: true,
            autoFilter: true,
            freezePane: { row: 1 }
        };
        
        window.ExportManager.exportData(exportData, options);
    } else if (type === 'csv') {
        // Fallback to basic CSV export
        const csv = convertToCSV(filteredTrackings);
        downloadCSV(csv, `tracking_export_${new Date().toISOString().split('T')[0]}.csv`);
    } else if (type === 'excel' && window.XLSX) {
        // Fallback to basic Excel export
        const ws = XLSX.utils.json_to_sheet(filteredTrackings.map(t => ({
            'Tracking Number': t.tracking_number,
            'Carrier': t.carrier_name,
            'Status': STATUS_DISPLAY[t.current_status]?.label || t.current_status,
            'Origin': t.origin_port,
            'Destination': t.destination_port,
            'ETA': t.eta || '-'
        })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Tracking');
        XLSX.writeFile(wb, `tracking_export_${Date.now()}.xlsx`);
    } else {
        window.NotificationSystem?.error('Export non disponibile per questo formato');
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
window.AVAILABLE_COLUMNS = AVAILABLE_COLUMNS;

/**
 * Opens the column management modal, allowing users to select and reorder columns.
 * The changes are applied to the table for the current session.
 */
function showColumnEditor() {
    // 1. Check for Sortable.js dependency
    if (typeof Sortable === 'undefined') {
        console.warn('Sortable.js not loaded yet.');
        showNotification('Funzionalità di riordino non ancora pronta. Riprova tra un istante.', 'warning');
        return;
    }

    // 2. Check for TableManager dependency
    if (!tableManager) {
        console.error('TableManager is not available yet.');
        showNotification('La tabella non è ancora pronta. Riprova tra un istante.', 'error');
        return;
    }

    ModalSystem.show({
        title: 'Gestisci Colonne',
        content: `
            <p class="text-muted">Seleziona le colonne da visualizzare e trascinale per riordinarle.</p>
            <ul class="list-group" id="column-editor-list"></ul>
        `,
        size: 'large',
        buttons: [
            {
                text: 'Annulla',
                className: 'btn-secondary',
                action: (modal) => modal.hide()
            },
            {
                text: 'Salva',
                className: 'btn-primary',
                action: async (modal) => {
                    try {
                        const list = modal.element.querySelector('#column-editor-list');
                        if (!list) throw new Error("Column list not found in modal.");

                        const newVisibleKeys = Array.from(list.querySelectorAll('li'))
                            .filter(li => li.querySelector('input[type="checkbox"]').checked)
                            .map(li => li.dataset.columnKey);

                        const { success } = await userPreferencesService.savePreferences('tracking', { column_keys: newVisibleKeys });

                        if (success) {
                            const newColumns = newVisibleKeys
                                .map(key => AVAILABLE_COLUMNS.find(c => c.key === key))
                                .filter(Boolean);

                            tableManager.updateColumns(newColumns);
                            modal.hide();
                            showNotification('Preferenze colonne salvate con successo.', 'success');
                        } else {
                            showNotification('Errore durante il salvataggio delle preferenze. Riprova.', 'error');
                        }
                    } catch (error) {
                        console.error("Error saving columns:", error);
                        showNotification('Si è verificato un errore imprevisto durante il salvataggio.', 'error');
                    }
                }
            }
        ],
        onMounted: (modal) => {
            // 3. Add a try-catch inside onMounted for maximum safety
            try {
                const list = modal.element.querySelector('#column-editor-list');
                if (!list) throw new Error("Could not find #column-editor-list in the modal.");

                const currentVisibleKeys = tableManager.getColumns().map(c => c.key);

                AVAILABLE_COLUMNS.forEach(col => {
                    const isVisible = currentVisibleKeys.includes(col.key);
                    const listItem = document.createElement('li');
                    listItem.className = 'list-group-item d-flex justify-content-between align-items-center';
                    listItem.dataset.columnKey = col.key;
                    listItem.innerHTML = `
                        <div>
                            <span class="drag-handle" style="cursor: move; margin-right: 10px;">&#9776;</span>
                            <span>${col.label}</span>
                        </div>
                        <input class="form-check-input" type="checkbox" ${isVisible ? 'checked' : ''}>
                    `;
                    list.appendChild(listItem);
                });

                new Sortable(list, {
                    animation: 150,
                    handle: '.drag-handle',
                    ghostClass: 'bg-light'
                });
            } catch (error) {
                console.error("Error mounting column editor modal content:", error);
                showNotification('Errore durante l\'apertura dell\'editor. Riprova.', 'error');
                modal.hide(); // Close the broken modal
            }
        }
    });
}
