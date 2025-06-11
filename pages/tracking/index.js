// Tracking page main script
import { TrackingTable } from '/components/tables/tracking-table.js';
import app from '/core/app.js';

// Globals
let trackingTable = null;
let trackings = [];
const { modalSystem, notificationSystem } = app;

// Initialize page
export async function init() {
    console.log('[Tracking] Initializing page...');
    
    try {
        // Initialize table
        initTable();
        
        // Setup event handlers
        setupEventHandlers();
        
        // Load initial data
        await loadTrackings();
        
        // Setup auto-refresh
        setupAutoRefresh();
        
        console.log('[Tracking] Page initialized successfully');
    } catch (error) {
        console.error('[Tracking] Init error:', error);
        notificationSystem.error('Errore inizializzazione pagina');
    }
}

// Initialize table
function initTable() {
    const tableContainer = document.getElementById('trackingTable');
    if (!tableContainer) {
        throw new Error('Table container not found');
    }
    
    trackingTable = new TrackingTable(tableContainer, {
        height: 'calc(100vh - 320px)',
        layout: 'fitColumns',
        responsiveLayout: 'collapse',
        placeholder: 'Nessun tracking disponibile',
        
        columns: [
            {
                formatter: 'rowSelection',
                titleFormatter: 'rowSelection',
                hozAlign: 'center',
                headerSort: false,
                width: 40
            },
            {
                title: 'Tracking Number',
                field: 'tracking_number',
                headerFilter: 'input',
                formatter: (cell) => {
                    const data = cell.getData();
                    return `
                        <div class="tracking-number-cell">
                            <span class="tracking-number">${data.tracking_number}</span>
                            <span class="tracking-type badge badge-${data.tracking_type}">
                                ${data.tracking_type?.toUpperCase() || 'N/A'}
                            </span>
                        </div>
                    `;
                }
            },
            {
                title: 'Carrier',
                field: 'carrier_code',
                headerFilter: 'select',
                headerFilterParams: {
                    values: true
                },
                formatter: (cell) => {
                    const carrier = cell.getValue();
                    return `<div class="carrier-badge carrier-${carrier?.toLowerCase()}">${carrier || '-'}</div>`;
                }
            },
            {
                title: 'Status',
                field: 'status',
                headerFilter: 'select',
                headerFilterParams: {
                    values: {
                        '': 'Tutti',
                        'registered': 'Registrato',
                        'in_transit': 'In Transito',
                        'arrived': 'Arrivato',
                        'customs_cleared': 'Sdoganato',
                        'out_for_delivery': 'In Consegna',
                        'delivered': 'Consegnato',
                        'delayed': 'In Ritardo',
                        'exception': 'Eccezione'
                    }
                },
                formatter: (cell) => {
                    const status = cell.getValue();
                    const statusText = app.utils.getStatusText(status);
                    const statusClass = app.utils.getStatusClass(status);
                    return `<span class="status-badge ${statusClass}">${statusText}</span>`;
                }
            },
            {
                title: 'Origine → Destinazione',
                field: 'route',
                formatter: (cell) => {
                    const data = cell.getData();
                    return `
                        <div class="route-cell">
                            <span class="port">${data.origin_port || '-'}</span>
                            <i class="fas fa-arrow-right"></i>
                            <span class="port">${data.destination_port || '-'}</span>
                        </div>
                    `;
                }
            },
            {
                title: 'Reference',
                field: 'reference_number',
                headerFilter: 'input'
            },
            {
                title: 'ETA',
                field: 'eta',
                sorter: 'datetime',
                formatter: (cell) => {
                    const value = cell.getValue();
                    if (!value) return '-';
                    
                    // Se è già in formato DD/MM/YYYY, ritornalo così
                    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value)) {
                        return value;
                    }
                    
                    // Altrimenti formatta da ISO
                    return app.formatDate(value);
                }
            },
            {
                title: 'Ultimo Aggiornamento',
                field: 'last_event_date',
                sorter: 'datetime',
                formatter: (cell) => {
                    const value = cell.getValue();
                    if (!value) return '-';
                    
                    // Se è già in formato DD/MM/YYYY, ritornalo così
                    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value)) {
                        return value;
                    }
                    
                    // Altrimenti formatta da ISO
                    return app.formatDate(value);
                }
            },
            {
                title: 'Azioni',
                formatter: () => {
                    return `
                        <div class="action-buttons">
                            <button class="btn-icon btn-sm" title="Aggiorna" onclick="handleRefreshTracking(this)">
                                <i class="fas fa-sync-alt"></i>
                            </button>
                            <button class="btn-icon btn-sm" title="Timeline" onclick="handleViewTimeline(this)">
                                <i class="fas fa-history"></i>
                            </button>
                            <button class="btn-icon btn-sm btn-danger" title="Elimina" onclick="handleDeleteTracking(this)">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    `;
                },
                width: 120,
                hozAlign: 'center',
                headerSort: false
            }
        ],
        
        rowClick: (e, row) => {
            // Click on row shows details
            if (!e.target.closest('.action-buttons')) {
                showTrackingDetails(row.getData());
            }
        }
    });
}

// Setup event handlers
function setupEventHandlers() {
    // Add tracking button
    const addBtn = document.getElementById('addTrackingBtn');
    if (addBtn) {
        addBtn.addEventListener('click', showAddTrackingModal);
    }
    
    // Refresh all button
    const refreshBtn = document.getElementById('refreshAllBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshAllTrackings);
    }
    
    // Export button
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportTrackings);
    }
    
    // Listen for tracking updates
    window.addEventListener('trackingsUpdated', (e) => {
        console.log('[Tracking] Received update event:', e.detail);
        loadTrackings();
    });
}

// Setup auto-refresh
function setupAutoRefresh() {
    // Refresh every 5 minutes
    setInterval(() => {
        if (document.visibilityState === 'visible') {
            loadTrackings();
        }
    }, 5 * 60 * 1000);
}

// Load trackings
async function loadTrackings() {
    console.log('[Tracking] Loading trackings...');
    trackingTable.loading(true);
    
    try {
        // Get from localStorage
        const stored = localStorage.getItem('trackings');
        trackings = stored ? JSON.parse(stored) : generateMockTrackings();
        
        // Ensure all trackings have required fields
        trackings = trackings.map(t => ({
            ...t,
            id: t.id || Date.now() + Math.random(),
            created_at: t.created_at || new Date().toISOString(),
            eta: t.eta || (t.status === 'delivered' ? null : generateETA(t.status))
        }));
        
        // Save back to ensure consistency
        localStorage.setItem('trackings', JSON.stringify(trackings));
        
        // Update stats
        updateStats();
        
        // Update table
        trackingTable.setData(trackings);
        
        // Update timeline if active
        window.currentTrackings = trackings;
        if (window.timelineView && window.timelineView.isActive()) {
            window.timelineView.refresh();
        }
        
    } catch (error) {
        console.error('Error loading trackings:', error);
        notificationSystem.error('Errore nel caricamento dei tracking');
    } finally {
        trackingTable.loading(false);
    }
}

// Format ETA properly
function formatETA(eta) {
    if (!eta) return '-';
    
    // Se è già in formato DD/MM/YYYY, ritornalo così
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(eta)) {
        return eta;
    }
    
    // Altrimenti formatta da ISO
    return app.formatDate(eta);
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
}

// Show tracking details
function showTrackingDetails(tracking) {
    modalSystem.show({
        title: `Dettagli Tracking - ${tracking.tracking_number}`,
        size: 'large',
        content: `
            <div class="tracking-details">
                <div class="detail-grid">
                    <div class="detail-section">
                        <h4>Informazioni Spedizione</h4>
                        <div class="detail-row">
                            <span class="label">Tracking Number:</span>
                            <span class="value">${tracking.tracking_number}</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">Tipo:</span>
                            <span class="value">${tracking.tracking_type?.toUpperCase() || 'N/A'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">Carrier:</span>
                            <span class="value">${tracking.carrier_code || '-'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">Reference:</span>
                            <span class="value">${tracking.reference_number || '-'}</span>
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h4>Stato Attuale</h4>
                        <div class="detail-row">
                            <span class="label">Status:</span>
                            <span class="value">
                                <span class="status-badge ${app.utils.getStatusClass(tracking.status)}">
                                    ${app.utils.getStatusText(tracking.status)}
                                </span>
                            </span>
                        </div>
                        <div class="detail-row">
                            <span class="label">Ultima Posizione:</span>
                            <span class="value">${tracking.last_event_location || '-'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">Ultimo Aggiornamento:</span>
                            <span class="value">${app.formatDate(tracking.last_event_date)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">ETA:</span>
                            <span class="value">${formatETA(tracking.eta)}</span>
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h4>Rotta</h4>
                        <div class="detail-row">
                            <span class="label">Origine:</span>
                            <span class="value">${tracking.origin_port || '-'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">Destinazione:</span>
                            <span class="value">${tracking.destination_port || '-'}</span>
                        </div>
                    </div>
                </div>
                
                ${tracking.metadata ? `
                    <div class="metadata-section">
                        <h4>Dati Aggiuntivi</h4>
                        <pre>${JSON.stringify(tracking.metadata, null, 2)}</pre>
                    </div>
                ` : ''}
            </div>
        `,
        buttons: [
            {
                text: 'Visualizza Timeline',
                class: 'sol-btn-primary',
                action: () => {
                    modalSystem.closeAll();
                    handleViewTimeline(tracking.id);
                }
            },
            {
                text: 'Chiudi',
                class: 'sol-btn-secondary',
                action: 'close'
            }
        ]
    });
}

// Show add tracking modal
function showAddTrackingModal() {
    modalSystem.show({
        title: 'Aggiungi Tracking',
        size: 'medium',
        content: getAddTrackingForm(),
        onShow: () => {
            setupFormInteractions();
        }
    });
}

// Get add tracking form
function getAddTrackingForm() {
    return `
        <div class="sol-form-container">
            <ul class="sol-tabs mb-4">
                <li class="sol-tab active" data-tab="manual" onclick="switchTab('manual')">
                    <i class="fas fa-keyboard"></i> Inserimento Manuale
                </li>
                <li class="sol-tab" data-tab="import" onclick="switchTab('import')">
                    <i class="fas fa-file-import"></i> Import Multiplo
                </li>
            </ul>
            
            <div class="sol-tab-content active" data-content="manual">
                <form id="trackingForm" class="sol-form">
                    <div class="sol-form-row">
                        <div class="sol-form-group">
                            <label for="tracking_number">Tracking Number *</label>
                            <input type="text" id="tracking_number" name="tracking_number" 
                                   required class="sol-input" placeholder="es. MSKU1234567">
                        </div>
                        <div class="sol-form-group">
                            <label for="tracking_type">Tipo</label>
                            <select id="tracking_type" name="tracking_type" class="sol-select">
                                <option value="container">Container</option>
                                <option value="awb">AWB</option>
                                <option value="bl">B/L</option>
                                <option value="parcel">Parcel</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="sol-form-row">
                        <div class="sol-form-group">
                            <label for="carrier_code">Carrier</label>
                            <select id="carrier_code" name="carrier_code" class="sol-select">
                                <option value="">Seleziona carrier...</option>
                                <option value="MAERSK">Maersk</option>
                                <option value="MSC">MSC</option>
                                <option value="CMA-CGM">CMA CGM</option>
                                <option value="HAPAG-LLOYD">Hapag-Lloyd</option>
                                <option value="COSCO">COSCO</option>
                                <option value="ONE">ONE</option>
                                <option value="EVERGREEN">Evergreen</option>
                                <option value="YANG-MING">Yang Ming</option>
                                <option value="HMM">HMM</option>
                                <option value="ZIM">ZIM</option>
                                <option value="CV">Cargolux</option>
                                <option value="DHL">DHL</option>
                                <option value="FEDEX">FedEx</option>
                                <option value="UPS">UPS</option>
                            </select>
                        </div>
                        <div class="sol-form-group">
                            <label for="reference_number">Reference Number</label>
                            <input type="text" id="reference_number" name="reference_number" 
                                   class="sol-input" placeholder="es. PO-2024-001">
                        </div>
                    </div>
                    
                    <div class="sol-form-row">
                        <div class="sol-form-group">
                            <label for="origin_port">Porto Origine</label>
                            <input type="text" id="origin_port" name="origin_port" 
                                   class="sol-input" placeholder="es. SHANGHAI">
                        </div>
                        <div class="sol-form-group">
                            <label for="destination_port">Porto Destinazione</label>
                            <input type="text" id="destination_port" name="destination_port" 
                                   class="sol-input" placeholder="es. GENOVA">
                        </div>
                    </div>
                    
                    <div class="sol-form-actions">
                        <button type="submit" class="sol-btn sol-btn-primary">
                            <i class="fas fa-plus"></i> Aggiungi Tracking
                        </button>
                        <button type="button" class="sol-btn sol-btn-secondary" onclick="modalSystem.closeAll()">
                            Annulla
                        </button>
                    </div>
                </form>
            </div>
            
            <div class="sol-tab-content" data-content="import">
                <div class="import-section">
                    <div class="file-upload-area" ondrop="handleDrop(event)" ondragover="handleDragOver(event)">
                        <i class="fas fa-cloud-upload-alt fa-3x mb-3"></i>
                        <p>Trascina qui il file CSV/Excel o</p>
                        <input type="file" id="importFile" accept=".csv,.xlsx,.xls" 
                               onchange="handleFileImport(this.files[0])" style="display: none;">
                        <button class="sol-btn sol-btn-primary" 
                                onclick="document.getElementById('importFile').click()">
                            Seleziona File
                        </button>
                    </div>
                    
                    <div class="import-info mt-4">
                        <h5>Formato supportato:</h5>
                        <p>CSV o Excel con colonne: tracking_number, carrier_code, tracking_type, origin_port, destination_port, reference_number</p>
                        <p class="text-muted">Supporta anche formato ShipsGo con riconoscimento automatico colonne</p>
                        
                        <div class="mt-3">
                            <button class="sol-btn sol-btn-secondary" onclick="downloadTemplate()">
                                <i class="fas fa-download"></i> Scarica Template
                            </button>
                        </div>
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

// Handle file import - MODIFICATO PER USARE IMPORTMANAGER
window.handleFileImport = async function(file) {
    if (!file) return;
    
    try {
        // Use ImportManager for actual import
        if (window.ImportManager) {
            await window.ImportManager.importFile(file, {
                updateExisting: false // Non aggiornare tracking esistenti
            });
        } else {
            throw new Error('ImportManager non disponibile');
        }
    } catch (error) {
        console.error('[Tracking] Import error:', error);
        notificationSystem.error('Errore durante l\'import: ' + error.message);
    }
};

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

// Handle drag over
window.handleDragOver = function(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
};

// Handle drop
window.handleDrop = function(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFileImport(files[0]);
    }
};

// Handle add tracking
async function handleAddTracking(e) {
    e.preventDefault();
    
    const formData = {
        tracking_number: document.getElementById('tracking_number').value.trim(),
        tracking_type: document.getElementById('tracking_type').value,
        carrier_code: document.getElementById('carrier_code').value,
        origin_port: document.getElementById('origin_port').value.trim().toUpperCase(),
        destination_port: document.getElementById('destination_port').value.trim().toUpperCase(),
        reference_number: document.getElementById('reference_number').value.trim(),
        status: 'registered',
        created_at: new Date().toISOString(),
        last_event_date: new Date().toISOString(),
        last_event_location: 'Booking Confirmed'
    };
    
    // Check duplicates
    if (trackings.some(t => t.tracking_number === formData.tracking_number)) {
        notificationSystem.error('Tracking già presente nel sistema');
        return;
    }
    
    // Add to trackings
    formData.id = Date.now().toString();
    trackings.push(formData);
    
    // Save to localStorage
    localStorage.setItem('trackings', JSON.stringify(trackings));
    
    // Close modal and reload
    modalSystem.closeAll();
    notificationSystem.success('Tracking aggiunto con successo');
    await loadTrackings();
}

// Handle refresh tracking
async function handleRefreshTracking(id) {
    const tracking = trackings.find(t => t.id === id);
    if (!tracking) return;
    
    // Simulate status progression
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
    
    // Update location based on status
    if (newStatus === 'arrived') {
        tracking.last_event_location = tracking.destination_port;
    } else if (newStatus === 'out_for_delivery') {
        tracking.last_event_location = 'Local Delivery Hub';
    }
    
    // Update ETA
    tracking.eta = generateETA(newStatus);
    
    // Save
    localStorage.setItem('trackings', JSON.stringify(trackings));
    
    notificationSystem.success('Tracking aggiornato');
    await loadTrackings();
}

// Handle view timeline
async function handleViewTimeline(id) {
    const tracking = trackings.find(t => t.id === id);
    if (!tracking) return;
    
    modalSystem.show({
        title: `Timeline - ${tracking.tracking_number}`,
        size: 'large',
        content: renderTimeline(tracking)
    });
}

// Render timeline
function renderTimeline(tracking) {
    const events = generateTimelineEvents(tracking);
    
    return `
        <div class="timeline-container">
            <div class="timeline-header">
                <div class="tracking-info">
                    <h4>${tracking.tracking_number}</h4>
                    <span class="tracking-type badge badge-${tracking.tracking_type}">
                        ${tracking.tracking_type?.toUpperCase()}
                    </span>
                    <span class="carrier-badge carrier-${tracking.carrier_code?.toLowerCase()}">
                        ${tracking.carrier_code}
                    </span>
                </div>
                <div class="route-info">
                    <span class="port">${tracking.origin_port}</span>
                    <i class="fas fa-arrow-right mx-2"></i>
                    <span class="port">${tracking.destination_port}</span>
                </div>
                ${tracking.reference_number ? `
                    <div class="reference-info">
                        <i class="fas fa-tag"></i> ${tracking.reference_number}
                    </div>
                ` : ''}
            </div>
            
            <!-- Status attuale -->
            <div class="current-status-card ${app.utils.getStatusClass(tracking.status)}">
                <div class="status-icon">
                    <i class="fas ${app.utils.getStatusIcon(tracking.status)}"></i>
                </div>
                <div class="status-info">
                    <h5>Stato Attuale: ${app.utils.getStatusText(tracking.status)}</h5>
                    <p><i class="fas fa-map-marker-alt"></i> ${tracking.last_event_location || 'N/A'}</p>
                    <p><i class="fas fa-clock"></i> ${app.formatDate(tracking.last_event_date, 'full')}</p>
                </div>
                ${tracking.eta ? `
                    <div class="tracking-eta">
                        <i class="fas fa-calendar-check"></i>
                        <div class="meta-info">
                            <span class="meta-label">ETA</span>
                            <span class="meta-value">${formatETA(tracking.eta)}</span>
                        </div>
                    </div>` : ''}
            </div>
            
            <!-- Timeline eventi -->
            <div class="timeline">
                ${events.map((event, index) => `
                    <div class="timeline-item ${index === 0 ? 'latest' : ''}">
                        <div class="timeline-marker ${event.completed ? 'completed' : 'pending'}">
                            <i class="fas ${event.icon}"></i>
                        </div>
                        <div class="timeline-content">
                            <div class="timeline-header">
                                <h6>${event.title}</h6>
                                <span class="timeline-date">${app.formatDate(event.date, 'full')}</span>
                            </div>
                            <p class="timeline-description">${event.description}</p>
                            ${event.location ? `
                                <p class="timeline-location">
                                    <i class="fas fa-map-marker-alt"></i> ${event.location}
                                </p>
                            ` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <!-- Metadata aggiuntivi -->
            ${tracking.metadata && Object.keys(tracking.metadata).length > 0 ? `
                <div class="metadata-panel">
                    <h5>Informazioni Aggiuntive</h5>
                    <div class="metadata-grid">
                        ${Object.entries(tracking.metadata).map(([key, value]) => {
                            if (!value) return '';
                            
                            // Formatta le chiavi in modo leggibile
                            const label = key.replace(/_/g, ' ')
                                .replace(/\b\w/g, l => l.toUpperCase());
                            
                            // Formatta i valori speciali
                            let displayValue = value;
                            if (key.includes('date') && value) {
                                displayValue = formatETA(value);
                            } else if (key === 'co2_emission') {
                                displayValue = `${value} tons`;
                            } else if (key === 'transit_time') {
                                displayValue = `${value} giorni`;
                            }
                            
                            return `
                                <div class="metadata-item">
                                    <span class="metadata-label">${label}:</span>
                                    <span class="metadata-value">${displayValue}</span>
                                </div>
                            `;
                        }).filter(html => html).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

// Generate timeline events based on tracking type and metadata
function generateTimelineEvents(tracking) {
    const events = [];
    const now = new Date();
    
    // Se abbiamo eventi salvati nei metadata, usali
    if (tracking.metadata?.timeline_events) {
        return tracking.metadata.timeline_events.map(event => ({
            ...event,
            completed: new Date(event.date) <= now
        }));
    }
    
    // Altrimenti genera eventi basati sul tipo di tracking
    if (tracking.tracking_type === 'awb') {
        // Eventi per spedizioni aeree (stile ShipsGo)
        events.push({
            date: tracking.created_at,
            title: 'Booking Confirmed',
            description: 'Prenotazione confermata',
            icon: 'fa-check-circle',
            completed: true,
            type: 'BKD'
        });
        
        // RCS - Received from Shipper
        if (tracking.metadata?.departure_date) {
            const rcsDate = new Date(tracking.metadata.departure_date);
            rcsDate.setHours(rcsDate.getHours() - 4);
            events.push({
                date: rcsDate.toISOString(),
                title: 'Received from Shipper',
                description: 'Merce ricevuta dal mittente',
                icon: 'fa-warehouse',
                location: tracking.origin_port,
                completed: rcsDate <= now,
                type: 'RCS'
            });
        }
        
        // MAN - Manifested
        if (tracking.metadata?.departure_date) {
            const manDate = new Date(tracking.metadata.departure_date);
            manDate.setHours(manDate.getHours() - 2);
            events.push({
                date: manDate.toISOString(),
                title: 'Manifested',
                description: 'Inserito nel manifesto di volo',
                icon: 'fa-clipboard-list',
                location: tracking.origin_port,
                completed: manDate <= now,
                type: 'MAN'
            });
        }
        
        // DEP - Departed
        if (tracking.metadata?.departure_date) {
            events.push({
                date: tracking.metadata.departure_date,
                title: 'Departed',
                description: `Partito da ${tracking.origin_port}`,
                icon: 'fa-plane-departure',
                location: tracking.origin_port,
                completed: new Date(tracking.metadata.departure_date) <= now,
                type: 'DEP'
            });
        }
        
        // ARR - Arrived
        if (tracking.metadata?.arrival_date) {
            events.push({
                date: tracking.metadata.arrival_date,
                title: 'Arrived',
                description: `Arrivato a ${tracking.destination_port}`,
                icon: 'fa-plane-arrival',
                location: tracking.destination_port,
                completed: new Date(tracking.metadata.arrival_date) <= now,
                type: 'ARR'
            });
        }
        
        // RCF - Received from Flight
        if (tracking.metadata?.arrival_date) {
            const rcfDate = new Date(tracking.metadata.arrival_date);
            rcfDate.setHours(rcfDate.getHours() + 2);
            events.push({
                date: rcfDate.toISOString(),
                title: 'Received from Flight',
                description: 'Scaricato dal volo',
                icon: 'fa-dolly',
                location: tracking.destination_port,
                completed: rcfDate <= now,
                type: 'RCF'
            });
        }
        
        // DLV - Delivered
        if (tracking.status === 'delivered') {
            events.push({
                date: tracking.last_event_date,
                title: 'Delivered',
                description: 'Consegnato al destinatario',
                icon: 'fa-check-double',
                location: tracking.last_event_location,
                completed: true,
                type: 'DLV'
            });
        }
        
    } else if (tracking.tracking_type === 'container') {
        // Eventi per spedizioni marittime
        events.push({
            date: tracking.created_at,
            title: 'Booking Confirmed',
            description: 'Prenotazione container confermata',
            icon: 'fa-check-circle',
            completed: true
        });
        
        // Gate In
        if (tracking.metadata?.loading_date) {
            const gateInDate = new Date(tracking.metadata.loading_date);
            gateInDate.setDate(gateInDate.getDate() - 2);
            events.push({
                date: gateInDate.toISOString(),
                title: 'Gate In',
                description: 'Container entrato al terminal',
                icon: 'fa-sign-in-alt',
                location: tracking.origin_port,
                completed: gateInDate <= now
            });
        }
        
        // Loaded on Vessel
        if (tracking.metadata?.loading_date) {
            events.push({
                date: tracking.metadata.loading_date,
                title: 'Loaded on Vessel',
                description: `Caricato sulla nave${tracking.metadata?.vessel_name ? ' ' + tracking.metadata.vessel_name : ''}`,
                icon: 'fa-ship',
                location: tracking.origin_port,
                completed: new Date(tracking.metadata.loading_date) <= now
            });
        }
        
        // In Transit
        if (tracking.status === 'in_transit' || tracking.status === 'arrived' || tracking.status === 'delivered') {
            const transitDate = tracking.metadata?.loading_date ? 
                new Date(new Date(tracking.metadata.loading_date).getTime() + 24 * 60 * 60 * 1000) : 
                new Date(tracking.created_at);
            events.push({
                date: transitDate.toISOString(),
                title: 'In Transit',
                description: 'In navigazione',
                icon: 'fa-water',
                completed: transitDate <= now
            });
        }
        
        // Discharged
        if (tracking.metadata?.discharge_date) {
            events.push({
                date: tracking.metadata.discharge_date,
                title: 'Discharged from Vessel',
                description: 'Scaricato dalla nave',
                icon: 'fa-anchor',
                location: tracking.destination_port,
                completed: new Date(tracking.metadata.discharge_date) <= now
            });
        }
        
        // Gate Out
        if (tracking.status === 'delivered') {
            const gateOutDate = tracking.metadata?.discharge_date ? 
                new Date(new Date(tracking.metadata.discharge_date).getTime() + 2 * 24 * 60 * 60 * 1000) :
                new Date(tracking.last_event_date);
            events.push({
                date: gateOutDate.toISOString(),
                title: 'Gate Out',
                description: 'Container ritirato dal terminal',
                icon: 'fa-sign-out-alt',
                location: tracking.destination_port,
                completed: true
            });
        }
        
    } else {
        // Eventi generici per altri tipi
        events.push({
            date: tracking.created_at,
            title: 'Tracking Registrato',
            description: 'Spedizione registrata nel sistema',
            icon: 'fa-plus-circle',
            completed: true
        });
        
        if (tracking.last_event_date && tracking.last_event_location) {
            events.push({
                date: tracking.last_event_date,
                title: app.utils.getStatusText(tracking.status),
                description: 'Ultimo aggiornamento ricevuto',
                icon: app.utils.getStatusIcon(tracking.status),
                location: tracking.last_event_location,
                completed: true
            });
        }
    }
    
    // Ordina eventi per data decrescente (più recenti prima)
    events.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    return events;
}

// Refresh all trackings
async function refreshAllTrackings() {
    notificationSystem.info('Aggiornamento tracking in corso...');
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Update some random trackings
    const toUpdate = Math.floor(Math.random() * 3) + 1;
    let updated = 0;
    
    for (let i = 0; i < toUpdate && i < trackings.length; i++) {
        const tracking = trackings[Math.floor(Math.random() * trackings.length)];
        if (tracking.status !== 'delivered') {
            await handleRefreshTracking(tracking.id);
            updated++;
        }
    }
    
    notificationSystem.success(`${updated} tracking aggiornati`);
}

// Export trackings
function exportTrackings() {
    const selected = trackingTable.getSelectedData();
    const toExport = selected.length > 0 ? selected : trackings;
    
    modalSystem.show({
        title: 'Esporta Tracking',
        size: 'small',
        content: `
            <div class="export-options">
                <p>Esporta ${toExport.length} tracking selezionati</p>
                <div class="format-options">
                    <button class="sol-btn sol-btn-primary" onclick="exportAsCSV()">
                        <i class="fas fa-file-csv"></i> Esporta CSV
                    </button>
                    <button class="sol-btn sol-btn-primary" onclick="exportAsExcel()">
                        <i class="fas fa-file-excel"></i> Esporta Excel
                    </button>
                    <button class="sol-btn sol-btn-primary" onclick="exportAsPDF()">
                        <i class="fas fa-file-pdf"></i> Esporta PDF
                    </button>
                </div>
            </div>
        `
    });
}

// Export as CSV
window.exportAsCSV = function() {
    const selected = trackingTable.getSelectedData();
    const toExport = selected.length > 0 ? selected : trackings;
    
    // Create CSV content
    const headers = ['tracking_number', 'tracking_type', 'carrier_code', 'status', 
                    'origin_port', 'destination_port', 'reference_number', 'eta', 
                    'last_event_date', 'last_event_location'];
    
    const rows = toExport.map(t => headers.map(h => t[h] || '').join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tracking_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    modalSystem.closeAll();
    notificationSystem.success('Export CSV completato');
};

// Export as Excel (placeholder)
window.exportAsExcel = function() {
    modalSystem.closeAll();
    notificationSystem.info('Export Excel in sviluppo...');
};

// Export as PDF (placeholder)
window.exportAsPDF = function() {
    modalSystem.closeAll();
    notificationSystem.info('Export PDF in sviluppo...');
};

// Make functions available globally for onclick handlers
window.handleRefreshTracking = function(btn) {
    const row = btn.closest('tr');
    const id = trackingTable.getRow(row).getData().id;
    handleRefreshTracking(id);
};

window.handleViewTimeline = function(btn) {
    const row = btn.closest('tr');
    const id = trackingTable.getRow(row).getData().id;
    handleViewTimeline(id);
};

window.handleDeleteTracking = async function(btn) {
    const row = btn.closest('tr');
    const data = trackingTable.getRow(row).getData();
    
    const confirmed = await modalSystem.confirm({
        title: 'Conferma Eliminazione',
        message: `Sei sicuro di voler eliminare il tracking ${data.tracking_number}?`,
        confirmText: 'Elimina',
        confirmClass: 'sol-btn-danger'
    });
    
    if (confirmed) {
        // Remove from array
        trackings = trackings.filter(t => t.id !== data.id);
        
        // Save to localStorage
        localStorage.setItem('trackings', JSON.stringify(trackings));
        
        // Reload table
        await loadTrackings();
        
        notificationSystem.success('Tracking eliminato');
    }
};

// Expose loadTrackings globally for ImportManager
window.loadTrackings = loadTrackings;

// Import manager normalize function
window.ImportManager = window.ImportManager || {};
window.ImportManager.normalizeTrackingData = function(row) {
    console.log('[ImportManager] Normalizing row:', row);
    
    // Estrai tracking number
    const trackingNumber = (
        row.tracking_number || 
        row.Container || 
        row['Container Number'] ||
        row['AWB Number'] ||
        row['Tracking Number'] ||
        ''
    ).toString().trim();
    
    if (!trackingNumber) {
        throw new Error('Tracking number mancante');
    }
    
    // Normalizza carrier
    const rawCarrier = (
        row.carrier_code || 
        row.Carrier || 
        row.Airline || 
        row['Carrier Name'] || 
        ''
    ).toString().trim().toUpperCase();
    
    const carrierCode = this.normalizeCarrier(rawCarrier);
    
    // Normalizza stato  
    const rawStatus = (
        row.status || 
        row.Status || 
        row['Shipment Status'] || 
        'Registered'
    ).toString().trim();
    
    const normalizedStatus = this.normalizeStatus(rawStatus);
    
    // Rileva tipo
    const trackingType = row.tracking_type || 
        row['Tracking Type'] || 
        this.detectTrackingType(trackingNumber);
    
    // Estrai porti/aeroporti
    const originPort = (
        row.origin_port || 
        row['Port Of Loading'] || 
        row['Origin'] ||
        row['Origin Port'] ||
        ''
    ).toString().trim().toUpperCase();
    
    const destinationPort = (
        row.destination_port || 
        row['Port Of Discharge'] || 
        row['Destination'] ||
        row['Destination Port'] ||
        ''
    ).toString().trim().toUpperCase();
    
    // Reference
    const referenceNumber = (
        row.reference_number || 
        row.Reference || 
        row['Reference Number'] ||
        row['Customer Reference'] ||
        ''
    ).toString().trim();
    
    // Last event
    const lastEventLocation = row.last_event_location || 
        row['Last Location'] || 
        row['Current Location'] ||
        originPort;
    
    const lastEventDate = row.last_event_date || 
        row['Last Update'] || 
        row['Updated At'] ||
        new Date().toISOString();
    
    // Estrai ETA
    let eta = null;
    
    // ShipsGo Sea
    if (row['Date Of Discharge'] || row['ETA'] || row['Estimated Arrival']) {
        eta = this.parseDate(row['Date Of Discharge'] || row['ETA'] || row['Estimated Arrival']);
    }
    
    // ShipsGo Air
    if (!eta && (row['Date Of Arrival'] || row['Estimated Delivery'])) {
        eta = this.parseDate(row['Date Of Arrival'] || row['Estimated Delivery']);
    }
    
    // Genera ETA se non presente e lo stato non è delivered
    if (!eta && normalizedStatus !== 'delivered') {
        eta = generateETA(normalizedStatus);
    }
    
    // Metadati
    const metadata = this.extractMetadata(row);
    
    return {
        trackingNumber,
        tracking_number: trackingNumber,
        tracking_type: trackingType,
        carrier_code: carrierCode,
        status: normalizedStatus,
        origin_port: originPort,
        destination_port: destinationPort,
        reference_number: referenceNumber,
        last_event_location: lastEventLocation,
        last_event_date: lastEventDate,
        eta: eta,
        metadata: metadata
    };
};

// Auto-init on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}