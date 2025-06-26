// /pages/tracking/index.js - Clean architecture tracking page logic

// State management
let trackings = [];
let filteredTrackings = [];
let tableManager = null;
let selectedTrackingIds = new Set();

// ===== COLUMN MAPPING - MANTENUTO DAL SISTEMA ORIGINALE =====
const COLUMN_MAPPING = {
    // Container/Tracking info
    'Container': 'tracking_number',
    'ContainerNumber': 'tracking_number',
    'Container Number': 'tracking_number',
    'AWB Number': 'tracking_number',
    'Tracking Number': 'tracking_number',
    'tracking_number': 'tracking_number',
    
    // Carrier info
    'Carrier': 'carrier_code',
    'ShippingLine': 'carrier_code',
    'Shipping Line': 'carrier_code',
    'Airline': 'carrier_code',
    'carrier_code': 'carrier_code',
    'CarrierName': 'carrier_name',
    'carrier_name': 'carrier_name',
    
    // Status
    'Status': 'current_status',
    'CurrentStatus': 'current_status',
    'Current Status': 'current_status',
    'status': 'current_status',
    
    // Ports
    'Port Of Loading': 'origin_port',
    'Pol': 'origin_port',
    'POL': 'origin_port',
    'Origin': 'origin_port',
    'origin_port': 'origin_port',
    'Port Of Discharge': 'destination_port',
    'Pod': 'destination_port',
    'POD': 'destination_port',
    'Destination': 'destination_port',
    'destination_port': 'destination_port',
    
    // Countries
    'POL Country': 'origin_country',
    'FromCountry': 'origin_country',
    'POL Country Code': 'origin_country_code',
    'FromCountryCode': 'origin_country_code',
    'POD Country': 'destination_country',
    'ToCountry': 'destination_country',
    'POD Country Code': 'destination_country_code',
    'ToCountryCode': 'destination_country_code',
    
    // Dates
    'Date Of Loading': 'date_of_loading',
    'LoadingDate': 'date_of_loading',
    'Date Of Departure': 'date_of_departure',
    'Date Of Discharge': 'date_of_arrival',
    'Date Of Arrival': 'date_of_arrival',
    'ETA': 'eta',
    'ETD': 'etd',
    
    // References
    'Reference': 'reference',
    'Reference Number': 'reference',
    'Booking': 'booking',
    'Booking Number': 'booking',
    'BL Number': 'bl_number',
    
    // Type
    'Type': 'tracking_type',
    'Tracking Type': 'tracking_type',
    'tracking_type': 'tracking_type'
};

// ===== STATUS MAPPING - MANTENUTO DAL SISTEMA ORIGINALE =====
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
    'Loading': 'in_transit',
    'Loaded': 'in_transit',
    'Gate In': 'in_transit',
    'Transhipment': 'in_transit',
    
    // Arrived/Discharged (nuovo stato)
    'Arrived': 'arrived',
    'Arrivata': 'arrived',
    'Discharged': 'arrived',
    'Scaricato': 'arrived',
    'Discharging': 'arrived',
    
    // Out for Delivery
    'On FedEx vehicle for delivery': 'out_for_delivery',
    'Consegna prevista nel corso della giornata odierna.': 'out_for_delivery',
    'La spedizione è in consegna': 'out_for_delivery',
    'In consegna': 'out_for_delivery',
    'Gate Out': 'out_for_delivery',
    
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
    'Customs Cleared': 'customs_cleared',
    
    // Registered
    'Shipment information sent to FedEx': 'registered',
    'Spedizione creata': 'registered',
    'La spedizione e\' stata creata dal mittente, attendiamo che ci venga affidata per l\'invio a destinazione.': 'registered',
    'Registered': 'registered',
    'Pending': 'registered',
    'Booked': 'registered',
    'Booking Confirmed': 'registered',
    
    // Delayed/Exception
    'Delayed': 'delayed',
    'Exception': 'exception'
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}

async function initialize() {
    console.log('🚀 Initializing tracking page...');
    
    try {
        // Wait for modules to be available
        await waitForModules();
        
        // Initialize components
        await initializeComponents();
        
        // Setup event listeners
        setupEventListeners();
        
        // Load initial data
        await loadTrackings();
        
        console.log('✅ Tracking page initialized');
    } catch (error) {
        console.error('❌ Initialization error:', error);
        showError('Errore durante l\'inizializzazione della pagina');
    }
}

// Wait for required modules with timeout
async function waitForModules() {
    const maxAttempts = 30;
    let attempts = 0;
    
    console.log('Waiting for modules...');
    
    while (attempts < maxAttempts) {
        const modulesReady = window.TableManager && 
                           window.NotificationSystem && 
                           window.supabaseTrackingService;
        
        if (modulesReady) {
            console.log('✅ Core modules ready');
            
            // Log status of optional modules
            console.log('Optional modules status:', {
                ModalSystem: !!window.ModalSystem,
                ExportManager: !!window.ExportManager,
                ImportManager: !!window.ImportManager,
                trackingService: !!window.trackingService,
                TrackingFormProgressive: !!window.TrackingFormProgressive
            });
            
            return;
        }
        
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.warn('⚠️ Some modules not loaded after timeout, continuing anyway...');
}

// Initialize components
async function initializeComponents() {
    try {
        // Initialize header
        if (window.headerComponent && typeof window.headerComponent.init === 'function') {
            window.headerComponent.init();
            console.log('✅ Header initialized');
        } else {
            console.warn('⚠️ Header component not available');
        }
        
        // Initialize tracking service
        if (window.trackingService && typeof window.trackingService.init === 'function') {
            await window.trackingService.init();
            console.log('✅ Tracking service initialized');
        } else {
            console.warn('⚠️ Tracking service not available');
        }
        
        // Initialize table manager if available
        if (window.TableManager) {
            const tableElement = document.getElementById('trackingTable');
            if (tableElement) {
                tableManager = new window.TableManager('trackingTable', {
                    searchable: true,
                    sortable: true,
                    paginated: true,
                    itemsPerPage: 20
                });
                console.log('✅ Table manager initialized');
            }
        } else {
            console.warn('⚠️ TableManager not available');
        }
        
    } catch (error) {
        console.error('❌ Error initializing components:', error);
        // Continue execution even if some components fail
    }
}

// Load trackings from Supabase
async function loadTrackings() {
    try {
        showLoadingState();
        
        // Check if service is available
        if (!window.supabaseTrackingService) {
            console.error('❌ supabaseTrackingService not available');
            
            // Try to load from localStorage as fallback
            const stored = localStorage.getItem('trackings');
            if (stored) {
                trackings = JSON.parse(stored);
                console.log('📦 Loaded from localStorage:', trackings.length);
            } else {
                trackings = [];
            }
        } else {
            // Load from Supabase
            const data = await window.supabaseTrackingService.getAllTrackings();
            trackings = data || [];
            console.log(`✅ Loaded ${trackings.length} trackings from Supabase`);
        }
        
        // Apply filters and render
        applyFilters();
        
    } catch (error) {
        console.error('❌ Error loading trackings:', error);
        
        // Show user-friendly error
        showError('Impossibile caricare i tracking. Riprova più tardi.');
        
        // Try localStorage fallback
        const stored = localStorage.getItem('trackings');
        if (stored) {
            trackings = JSON.parse(stored);
            applyFilters();
        }
    } finally {
        hideLoadingState();
    }
}

// Show error message
function showError(message) {
    const tbody = document.getElementById('trackingTableBody');
    const emptyState = document.getElementById('emptyState');
    const loadingState = document.getElementById('loadingState');
    
    if (loadingState) loadingState.style.display = 'none';
    if (emptyState) emptyState.style.display = 'none';
    
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-5">
                    <div class="alert alert-danger d-inline-block">
                        <i class="fas fa-exclamation-triangle"></i> ${message}
                    </div>
                </td>
            </tr>
        `;
    }
}

// Apply filters - Dynamic options
function applyFilters() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('statusFilter')?.value || '';
    const carrierFilter = document.getElementById('carrierFilter')?.value || '';
    
    // Populate filter dropdowns dynamically on first load
    if (trackings.length > 0) {
        populateFilterOptions();
    }
    
    filteredTrackings = trackings.filter(tracking => {
        // Search filter
        const matchesSearch = !searchTerm || 
            tracking.tracking_number?.toLowerCase().includes(searchTerm) ||
            tracking.carrier_name?.toLowerCase().includes(searchTerm) ||
            tracking.reference?.toLowerCase().includes(searchTerm);
        
        // Status filter
        const trackingStatus = tracking.status || tracking.current_status;
        const matchesStatus = !statusFilter || trackingStatus === statusFilter;
        
        // Carrier filter
        const matchesCarrier = !carrierFilter || tracking.carrier_code === carrierFilter;
        
        return matchesSearch && matchesStatus && matchesCarrier;
    });
    
    renderTable();
}

// Populate filter dropdowns with actual data
function populateFilterOptions() {
    // Get unique statuses
    const statuses = [...new Set(trackings.map(t => t.status || t.current_status).filter(Boolean))];
    const statusSelect = document.getElementById('statusFilter');
    if (statusSelect && statusSelect.options.length <= 1) {
        statuses.forEach(status => {
            const option = new Option(
                status.replace(/_/g, ' ').charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' '),
                status
            );
            statusSelect.add(option);
        });
    }
    
    // Get unique carriers
    const carriers = [...new Set(trackings.map(t => t.carrier_code).filter(Boolean))];
    const carrierSelect = document.getElementById('carrierFilter');
    if (carrierSelect && carrierSelect.options.length <= 1) {
        carriers.forEach(carrier => {
            const option = new Option(
                carrier.toUpperCase(),
                carrier
            );
            carrierSelect.add(option);
        });
    }
}

// Render table
function renderTable() {
    // Fix: cerca prima nel table manager se esiste
    let tbody = document.getElementById('trackingTableBody');
    
    // Se non trova l'elemento, prova a cercarlo nella tabella
    if (!tbody) {
        const table = document.getElementById('trackingTable');
        if (table) {
            tbody = table.querySelector('tbody');
            if (!tbody) {
                // Crea il tbody se non esiste
                tbody = document.createElement('tbody');
                tbody.id = 'trackingTableBody';
                table.appendChild(tbody);
            }
        }
    }
    
    const emptyState = document.getElementById('emptyState');
    
    if (!tbody) {
        console.error('❌ Table body element not found');
        return;
    }
    
    // Hide loading state
    hideLoadingState();
    
    if (filteredTrackings.length === 0) {
        tbody.innerHTML = '';
        tbody.style.display = '';
        if (emptyState) {
            emptyState.style.display = 'block';
        }
        return;
    }
    
    if (emptyState) {
        emptyState.style.display = 'none';
    }
    
    tbody.style.display = '';
    tbody.innerHTML = filteredTrackings.map(tracking => `
        <tr data-id="${tracking.id}">
            <td>
                <input type="checkbox" class="form-check-input row-select" 
                       data-id="${tracking.id}" 
                       ${selectedTrackingIds.has(tracking.id) ? 'checked' : ''}>
            </td>
            <td>
                <div class="tracking-number">
                    <strong>${tracking.tracking_number || '-'}</strong>
                    ${tracking.reference ? `<br><small class="text-muted">${tracking.reference}</small>` : ''}
                </div>
            </td>
            <td>
                <span class="carrier-badge ${tracking.carrier_code || ''}">
                    ${tracking.carrier_name || tracking.carrier_code || '-'}
                </span>
            </td>
            <td>${renderStatus(tracking.status || tracking.current_status)}</td>
            <td>${tracking.origin || tracking.origin_port || '-'}</td>
            <td>${tracking.destination || tracking.destination_port || '-'}</td>
            <td>
                <small>${formatDate(tracking.last_update || tracking.updated_at)}</small>
            </td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="sol-btn sol-btn-sm sol-btn-primary" 
                            onclick="refreshTracking('${tracking.id}')" 
                            title="Aggiorna">
                        <i class="fas fa-sync"></i>
                    </button>
                    <button class="sol-btn sol-btn-sm sol-btn-secondary" 
                            onclick="viewDetails('${tracking.id}')" 
                            title="Dettagli">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="sol-btn sol-btn-sm sol-btn-danger" 
                            onclick="deleteTracking('${tracking.id}')" 
                            title="Elimina">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
    
    // Update selection checkboxes
    updateSelectionUI();
    
    console.log(`✅ Rendered ${filteredTrackings.length} trackings`);
}

// Render status badge - Dynamic classes
function renderStatus(status) {
    if (!status) return '<span class="badge badge-secondary">-</span>';
    
    const statusConfig = {
        delivered: { class: 'badge-success', icon: 'check-circle', text: 'Consegnato' },
        in_transit: { class: 'badge-info', icon: 'truck', text: 'In transito' },
        arrived: { class: 'badge-primary', icon: 'inbox', text: 'Arrivato' },
        out_for_delivery: { class: 'badge-warning', icon: 'truck-loading', text: 'In consegna' },
        exception: { class: 'badge-danger', icon: 'exclamation-triangle', text: 'Eccezione' },
        pending: { class: 'badge-secondary', icon: 'clock', text: 'In attesa' },
        registered: { class: 'badge-secondary', icon: 'file-alt', text: 'Registrato' },
        customs_cleared: { class: 'badge-info', icon: 'passport', text: 'Sdoganato' },
        delayed: { class: 'badge-warning', icon: 'hourglass-half', text: 'In ritardo' }
    };
    
    const config = statusConfig[status] || { 
        class: 'badge-secondary', 
        icon: 'question', 
        text: status.replace(/_/g, ' ').charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ')
    };
    
    return `
        <span class="badge ${config.class}">
            <i class="fas fa-${config.icon}"></i> ${config.text}
        </span>
    `;
}

// Format date
function formatDate(dateString) {
    if (!dateString) return '-';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Ora';
    if (diffMins < 60) return `${diffMins} min fa`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} ore fa`;
    
    return date.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Show/hide loading state
function showLoadingState() {
    const loadingState = document.getElementById('loadingState');
    const tableBody = document.getElementById('trackingTableBody');
    if (loadingState) loadingState.style.display = 'block';
    if (tableBody) tableBody.style.display = 'none';
}

function hideLoadingState() {
    const loadingState = document.getElementById('loadingState');
    const tableBody = document.getElementById('trackingTableBody');
    if (loadingState) loadingState.style.display = 'none';
    if (tableBody) tableBody.style.display = '';
}

// Setup event listeners
function setupEventListeners() {
    // Search and filters
    document.getElementById('searchInput')?.addEventListener('input', debounce(applyFilters, 300));
    document.getElementById('statusFilter')?.addEventListener('change', applyFilters);
    document.getElementById('carrierFilter')?.addEventListener('change', applyFilters);
    document.getElementById('btnResetFilters')?.addEventListener('click', resetFilters);
    
    // Actions
    document.getElementById('btnAddTracking')?.addEventListener('click', showAddTrackingForm);
    document.getElementById('btnImport')?.addEventListener('click', showImportDialog);
    document.getElementById('btnExport')?.addEventListener('click', exportTrackings);
    
    // Selection
    document.getElementById('selectAll')?.addEventListener('change', toggleSelectAll);
    document.addEventListener('change', handleRowSelection);
    
    // Bulk actions
    document.getElementById('btnBulkRefresh')?.addEventListener('click', bulkRefresh);
    document.getElementById('btnBulkExport')?.addEventListener('click', bulkExport);
    document.getElementById('btnBulkDelete')?.addEventListener('click', bulkDelete);
}

// Reset filters
function resetFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('statusFilter').value = '';
    document.getElementById('carrierFilter').value = '';
    applyFilters();
}

// Add tracking form - Clean without hardcoded values
async function showAddTrackingForm() {
    console.log('showAddTrackingForm called, checking available methods...');
    console.log('TrackingFormProgressive:', window.TrackingFormProgressive);
    console.log('Available methods:', Object.keys(window.TrackingFormProgressive || {}));
    
    // Try different methods from TrackingFormProgressive
    if (window.showEnhancedTrackingForm && typeof window.showEnhancedTrackingForm === 'function') {
        console.log('Using global showEnhancedTrackingForm');
        window.showEnhancedTrackingForm();
    } else if (window.TrackingFormProgressive?.showEnhancedTrackingForm) {
        console.log('Using TrackingFormProgressive.showEnhancedTrackingForm');
        window.TrackingFormProgressive.showEnhancedTrackingForm();
    } else if (window.TrackingFormProgressive?.showTrackingForm) {
        console.log('Using TrackingFormProgressive.showTrackingForm');
        window.TrackingFormProgressive.showTrackingForm();
    } else {
        console.log('Using native prompt fallback');
        // Ultimate fallback with native prompt
        const trackingNumber = prompt('Inserisci il tracking number:');
        if (trackingNumber) {
            const carrier = prompt('Carrier (opzionale):') || '';
            const reference = prompt('Riferimento (opzionale):') || '';
            
            await addTracking({ 
                tracking_number: trackingNumber,
                carrier_code: carrier,
                reference: reference
            });
        }
    }
}

// Add tracking with proper status mapping
async function addTracking(data) {
    try {
        // Apply status mapping if status provided
        if (data.status && STATUS_MAPPING[data.status]) {
            data.status = STATUS_MAPPING[data.status];
        } else if (!data.status) {
            data.status = 'pending';
        }
        
        // Apply column mapping for any imported data
        const mappedData = {};
        for (const [key, value] of Object.entries(data)) {
            const mappedKey = COLUMN_MAPPING[key] || key;
            mappedData[mappedKey] = value;
        }
        
        // Ensure required fields
        const tracking = {
            ...mappedData,
            status: mappedData.status || 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            user_id: null, // Will be set by Supabase RLS
            organization_id: null // Will be set based on user's org
        };
        
        const result = await window.supabaseTrackingService.createTracking(tracking);
        
        if (result) {
            window.NotificationSystem?.success('Tracking aggiunto con successo');
            await loadTrackings();
            
            // Auto-refresh new tracking
            setTimeout(() => refreshTracking(result.id), 1000);
        }
    } catch (error) {
        console.error('Error adding tracking:', error);
        window.NotificationSystem?.error('Errore nell\'aggiunta del tracking');
    }
}

// Refresh tracking with status mapping
async function refreshTracking(id) {
    try {
        const tracking = trackings.find(t => t.id === id);
        if (!tracking) return;
        
        // Show loading on button
        const btn = document.querySelector(`button[onclick="refreshTracking('${id}')"]`);
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        }
        
        // Call tracking service to update from API
        const updated = await window.trackingService.updateTrackingStatus(
            tracking.tracking_number, 
            tracking.carrier_code
        );
        
        if (updated) {
            // Apply status mapping to API response
            if (updated.status && STATUS_MAPPING[updated.status]) {
                updated.status = STATUS_MAPPING[updated.status];
            }
            
            // Update in Supabase
            await window.supabaseTrackingService.updateTracking(id, {
                ...updated,
                last_update: new Date().toISOString()
            });
            
            // Reload data
            await loadTrackings();
            
            window.NotificationSystem?.success('Tracking aggiornato');
        }
    } catch (error) {
        console.error('Error refreshing tracking:', error);
        window.NotificationSystem?.error('Errore nell\'aggiornamento');
    } finally {
        // Reset button state
        const btn = document.querySelector(`button[onclick="refreshTracking('${id}')"]`);
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-sync"></i>';
        }
    }
}

// View details
async function viewDetails(id) {
    const tracking = trackings.find(t => t.id === id);
    if (!tracking) return;
    
    // Create detailed view
    const details = `
        <div class="tracking-details">
            <div class="detail-row">
                <strong>Tracking Number:</strong> ${tracking.tracking_number}
            </div>
            <div class="detail-row">
                <strong>Carrier:</strong> ${tracking.carrier_name || tracking.carrier_code}
            </div>
            <div class="detail-row">
                <strong>Stato:</strong> ${renderStatus(tracking.status)}
            </div>
            <div class="detail-row">
                <strong>Origine:</strong> ${tracking.origin || '-'}
            </div>
            <div class="detail-row">
                <strong>Destinazione:</strong> ${tracking.destination || '-'}
            </div>
            <div class="detail-row">
                <strong>Ultimo Aggiornamento:</strong> ${formatDate(tracking.last_update)}
            </div>
            ${tracking.events ? `
                <div class="detail-row">
                    <strong>Eventi:</strong>
                    <div class="events-timeline mt-2">
                        ${tracking.events.map(event => `
                            <div class="event-item">
                                <small class="text-muted">${formatDate(event.date)}</small>
                                <div>${event.description}</div>
                                <small class="text-muted">${event.location || ''}</small>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
    
    window.ModalSystem?.show({
        title: `Dettagli Tracking: ${tracking.tracking_number}`,
        body: details,
        size: 'large'
    });
}

// Delete tracking
async function deleteTracking(id) {
    const confirmed = await window.ModalSystem?.confirm({
        title: 'Conferma Eliminazione',
        message: 'Sei sicuro di voler eliminare questo tracking?',
        confirmText: 'Elimina',
        confirmClass: 'sol-btn-danger'
    });
    
    if (!confirmed) return;
    
    try {
        await window.supabaseTrackingService.deleteTracking(id);
        window.NotificationSystem?.success('Tracking eliminato');
        await loadTrackings();
    } catch (error) {
        console.error('Error deleting tracking:', error);
        window.NotificationSystem?.error('Errore nell\'eliminazione');
    }
}

// Import dialog with enhanced fallback
async function showImportDialog() {
    console.log('Import dialog called, checking ImportManager:', window.ImportManager);
    
    if (window.ImportManager?.showImportDialog) {
        await window.ImportManager.showImportDialog();
        await loadTrackings();
    } else if (window.ImportManager?.importFile) {
        // Use file input as fallback
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv,.xlsx,.xls';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            try {
                window.NotificationSystem?.info('Importazione in corso...');
                
                // Detect ShipsGo file type
                const fileContent = await readFileContent(file);
                const shipsgoType = detectShipsGoType(fileContent);
                
                console.log('[Import] File selected:', file.name);
                console.log('[Import] Detected ShipsGo type:', shipsgoType);
                
                // Import with column and status mapping
                await window.ImportManager.importFile(file, {
                    updateExisting: false,
                    shipsgoType: shipsgoType,
                    statusMapping: STATUS_MAPPING,
                    columnMapping: COLUMN_MAPPING
                });
                
                await loadTrackings();
                window.NotificationSystem?.success('Import completato');
            } catch (error) {
                console.error('Import error:', error);
                window.NotificationSystem?.error('Errore durante l\'import: ' + error.message);
            }
        };
        
        input.click();
    } else {
        // No import manager available
        window.NotificationSystem?.error('Import manager non disponibile. Ricarica la pagina.');
        console.error('ImportManager not found:', window.ImportManager);
    }
}

// Helper to read file content
async function readFileContent(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsText(file);
    });
}

// Detect ShipsGo file type
function detectShipsGoType(content) {
    const headers = content.split('\n')[0].toLowerCase();
    
    // Check for AIR indicators
    if (headers.includes('awb number') || 
        headers.includes('airline') || 
        headers.includes('ts count') ||
        headers.includes('transit time')) {
        return 'air';
    }
    
    // Check for SEA indicators
    if (headers.includes('container count') || 
        headers.includes('port of loading') || 
        headers.includes('port of discharge') ||
        headers.includes('co2 emission')) {
        return 'sea';
    }
    
    // Default fallback
    return 'generic';
}

// Export trackings - Enhanced with debug
async function exportTrackings() {
    console.log('Export called, checking ExportManager:', window.ExportManager);
    
    try {
        if (!window.ExportManager) {
            // Try to create a basic CSV export
            console.log('ExportManager not found, using basic CSV export');
            exportBasicCSV();
            return;
        }
        
        // Use native confirm as fallback
        const useExcel = confirm('Export in Excel?\n(OK = Excel, Annulla = PDF)');
        
        if (useExcel) {
            await window.ExportManager.exportToExcel(filteredTrackings, 'tracking-export');
            window.NotificationSystem?.success('Export Excel completato');
        } else {
            await window.ExportManager.exportToPDF(filteredTrackings, 'tracking-export');
            window.NotificationSystem?.success('Export PDF completato');
        }
    } catch (error) {
        console.error('Error exporting:', error);
        window.NotificationSystem?.error('Errore nell\'export: ' + error.message);
        
        // Fallback to basic CSV
        if (confirm('Export fallito. Vuoi esportare in CSV semplice?')) {
            exportBasicCSV();
        }
    }
}

// Basic CSV export fallback - Clean without hardcoded headers
function exportBasicCSV() {
    try {
        // Get headers dynamically from first tracking object
        const firstTracking = filteredTrackings[0] || {};
        const headers = Object.keys(firstTracking).filter(key => 
            !key.startsWith('_') && // Skip private fields
            key !== 'id' && // Skip internal ID
            firstTracking[key] !== null && 
            firstTracking[key] !== undefined
        );
        
        // If no trackings, use minimal headers
        if (headers.length === 0) {
            window.NotificationSystem?.warning('Nessun dato da esportare');
            return;
        }
        
        // Create CSV data
        const rows = filteredTrackings.map(tracking => 
            headers.map(header => {
                const value = tracking[header] || '';
                // Escape quotes and wrap in quotes if contains comma
                return typeof value === 'string' && value.includes(',') 
                    ? `"${value.replace(/"/g, '""')}"` 
                    : value;
            })
        );
        
        // Build CSV
        let csv = headers.join(',') + '\n';
        rows.forEach(row => {
            csv += row.join(',') + '\n';
        });
        
        // Download
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `tracking-export-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        
        window.NotificationSystem?.success('Export CSV completato');
    } catch (error) {
        console.error('Error in basic CSV export:', error);
        window.NotificationSystem?.error('Errore export CSV: ' + error.message);
    }
}

// Selection handling
function toggleSelectAll(e) {
    const isChecked = e.target.checked;
    
    filteredTrackings.forEach(tracking => {
        if (isChecked) {
            selectedTrackingIds.add(tracking.id);
        } else {
            selectedTrackingIds.delete(tracking.id);
        }
    });
    
    // Update checkboxes
    document.querySelectorAll('.row-select').forEach(checkbox => {
        checkbox.checked = isChecked;
    });
    
    updateSelectionUI();
}

function handleRowSelection(e) {
    if (!e.target.classList.contains('row-select')) return;
    
    const id = e.target.dataset.id;
    
    if (e.target.checked) {
        selectedTrackingIds.add(id);
    } else {
        selectedTrackingIds.delete(id);
    }
    
    updateSelectionUI();
}

function updateSelectionUI() {
    const count = selectedTrackingIds.size;
    const bulkActionsBar = document.getElementById('bulkActionsBar');
    const selectedCount = document.getElementById('selectedCount');
    
    if (count > 0) {
        bulkActionsBar.style.display = 'block';
        selectedCount.textContent = `${count} selezionati`;
    } else {
        bulkActionsBar.style.display = 'none';
    }
    
    // Update select all checkbox
    const selectAll = document.getElementById('selectAll');
    if (selectAll) {
        const totalVisible = filteredTrackings.length;
        selectAll.checked = count === totalVisible && totalVisible > 0;
        selectAll.indeterminate = count > 0 && count < totalVisible;
    }
}

// Bulk operations
async function bulkRefresh() {
    const ids = Array.from(selectedTrackingIds);
    if (ids.length === 0) return;
    
    const progressModal = window.ModalSystem?.progress({
        title: 'Aggiornamento in corso',
        message: `Aggiornamento di ${ids.length} tracking...`,
        progress: 0
    });
    
    let completed = 0;
    
    for (const id of ids) {
        try {
            await refreshTracking(id);
            completed++;
            
            if (progressModal) {
                progressModal.update({
                    progress: (completed / ids.length) * 100,
                    message: `Aggiornati ${completed} di ${ids.length} tracking...`
                });
            }
        } catch (error) {
            console.error(`Error refreshing ${id}:`, error);
        }
    }
    
    progressModal?.close();
    selectedTrackingIds.clear();
    updateSelectionUI();
    
    window.NotificationSystem?.success(`Aggiornati ${completed} tracking`);
}

async function bulkExport() {
    const ids = Array.from(selectedTrackingIds);
    if (ids.length === 0) return;
    
    const selected = trackings.filter(t => ids.includes(t.id));
    
    try {
        if (window.ExportManager) {
            await window.ExportManager.exportToExcel(selected, 'selected-trackings');
        }
    } catch (error) {
        console.error('Error exporting selected:', error);
        window.NotificationSystem?.error('Errore nell\'export');
    }
}

async function bulkDelete() {
    const ids = Array.from(selectedTrackingIds);
    if (ids.length === 0) return;
    
    const confirmed = await window.ModalSystem?.confirm({
        title: 'Conferma Eliminazione Multipla',
        message: `Sei sicuro di voler eliminare ${ids.length} tracking?`,
        confirmText: 'Elimina Tutti',
        confirmClass: 'sol-btn-danger'
    });
    
    if (!confirmed) return;
    
    try {
        for (const id of ids) {
            await window.supabaseTrackingService.deleteTracking(id);
        }
        
        selectedTrackingIds.clear();
        updateSelectionUI();
        
        window.NotificationSystem?.success(`${ids.length} tracking eliminati`);
        await loadTrackings();
    } catch (error) {
        console.error('Error in bulk delete:', error);
        window.NotificationSystem?.error('Errore nell\'eliminazione multipla');
    }
}

// Utility: debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Export functions for global access
window.refreshTracking = refreshTracking;
window.viewDetails = viewDetails;
window.deleteTracking = deleteTracking;
window.loadTrackings = loadTrackings;

// Expose mapping for debugging and external use
window.COLUMN_MAPPING = COLUMN_MAPPING;
window.STATUS_MAPPING = STATUS_MAPPING;