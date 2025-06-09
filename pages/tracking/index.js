// /pages/tracking/index.js - Logica specifica per la pagina tracking
// FIX: Usa percorsi relativi corretti
import TableManager from '../../core/table-manager.js';
import modalSystem from '../../core/modal-system.js';

// Tracking patterns
const TRACKING_PATTERNS = {
    container: /^[A-Z]{4}\d{7}$/,
    bl: /^[A-Z]{4}\d{8,12}$/,
    awb: /^\d{3}-\d{8}$/,
    parcel: /^[A-Z0-9]{10,30}$/
};

// Global state
let trackingTable = null;
let trackings = [];
let statsCards = [];

// IMPORTANTE: Esponi le funzioni necessarie SUBITO
window.refreshTracking = (id) => handleRefreshTracking(id);
window.viewTimeline = (id) => handleViewTimeline(id);
window.deleteTracking = (id) => handleDeleteTracking(id);

// Show add tracking form - DEFINITA PRIMA DI trackingInit
function showAddTrackingForm() {
    window.ModalSystem.show({
        title: 'Gestione Tracking',
        size: 'large',
        content: renderTrackingForm(),
        actions: [
            {
                label: 'Annulla',
                className: 'sol-btn-glass',
                handler: () => window.ModalSystem.close()
            },
            {
                label: 'Aggiungi Tracking',
                className: 'sol-btn-primary',
                handler: () => handleAddTracking()
            }
        ]
    });
    
    // Setup form interactions
    setupFormInteractions();
}

// Initialize page
window.trackingInit = async function() {
    console.log('[Tracking] Initializing page...');
    
    // Riesponi le funzioni per sicurezza
    window.showAddTrackingForm = showAddTrackingForm;
    window.refreshAllTrackings = refreshAllTrackings;
    window.exportToPDF = exportToPDF;
    window.exportToExcel = exportToExcel;
    
    // Setup page components
    setupStatsCards();
    setupTrackingTable();
    setupEventListeners();
    
    // Load initial data
    await loadTrackings();
    
    // Start auto-refresh
    startAutoRefresh();
    
    console.log('[Tracking] Page initialized successfully');
};

// Setup stats cards with drag & drop
function setupStatsCards() {
    const statsGrid = document.getElementById('statsGrid');
    
    statsCards = [
        { id: 'activeTrackings', icon: 'fa-box', label: 'Tracking Attivi', value: 0 },
        { id: 'inTransit', icon: 'fa-ship', label: 'In Transito', value: 0 },
        { id: 'outForDelivery', icon: 'fa-truck', label: 'In Consegna Oggi', value: 0 },
        { id: 'delivered', icon: 'fa-check-circle', label: 'Consegnati', value: 0 },
        { id: 'delayed', icon: 'fa-exclamation-triangle', label: 'In Ritardo', value: 0 }
    ];
    
    // Render cards
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
    
    // Restore saved order
    restoreStatsOrder();
}

// Setup tracking table
function setupTrackingTable() {
    trackingTable = new TableManager('trackingTableContainer', {
        columns: [
            { key: 'tracking_number', label: 'Tracking Number', sortable: true },
            { key: 'tracking_type', label: 'Tipo', formatter: formatType },
            { key: 'carrier_code', label: 'Carrier', sortable: true },
            { key: 'status', label: 'Stato', formatter: formatStatus },
            { key: 'last_event_date', label: 'Ultimo Aggiornamento', formatter: formatDate },
            { key: 'last_event_location', label: 'Posizione' },
            { key: 'eta', label: 'ETA', formatter: formatDate }
        ],
        actions: [
            { icon: 'fas fa-sync-alt', handler: 'refreshTracking', title: 'Aggiorna' },
            { icon: 'fas fa-history', handler: 'viewTimeline', title: 'Timeline' },
            { icon: 'fas fa-trash', handler: 'deleteTracking', title: 'Elimina' }
        ],
        emptyMessage: 'Nessun tracking attivo. Aggiungi il tuo primo tracking per iniziare.',
        pageSize: 20
    });
}

// Setup event listeners
function setupEventListeners() {
    // Page actions
    document.getElementById('addTrackingBtn')?.addEventListener('click', showAddTrackingForm);
    document.getElementById('refreshAllBtn')?.addEventListener('click', refreshAllTrackings);
    document.getElementById('exportPdfBtn')?.addEventListener('click', exportToPDF);
    document.getElementById('exportExcelBtn')?.addEventListener('click', exportToExcel);
    
    // Filters
    document.getElementById('statusFilter')?.addEventListener('change', applyFilters);
    document.getElementById('typeFilter')?.addEventListener('change', applyFilters);
    
    // Custom header action for sync
    if (window.headerComponent) {
        window.headerComponent.options.customActions = [
            {
                icon: 'fas fa-cloud-download-alt',
                label: 'Sincronizza ShipsGo',
                handler: 'openSyncWizard'
            }
        ];
        window.openSyncWizard = () => showSyncWizard();
    }
}

// Load trackings from API
async function loadTrackings() {
    try {
        trackingTable.loading(true);
        
        const result = await window.api.get('get-trackings', {
            loading: 'Caricamento tracking...'
        });
        
        trackings = result.trackings || [];
        
        // IMPORTANTE: Salva i tracking globalmente per la timeline view
        window.currentTrackings = trackings;
        
        // Update stats
        updateStats(result.stats);
        
        // Update table
        trackingTable.setData(trackings);
        
        // Update timeline if active
        if (window.timelineView && window.timelineView.isActive()) {
            window.timelineView.refresh();
        }
        
    } catch (error) {
        console.error('Error loading trackings:', error);
        window.NotificationSystem.error('Errore nel caricamento dei tracking');
    } finally {
        trackingTable.loading(false);
    }
}

// Update stats cards
function updateStats(stats) {
    if (!stats) return;
    
    document.getElementById('activeTrackings').textContent = stats.total || 0;
    document.getElementById('inTransit').textContent = stats.in_transit || 0;
    document.getElementById('outForDelivery').textContent = stats.out_for_delivery || 0;
    document.getElementById('delivered').textContent = stats.delivered || 0;
    document.getElementById('delayed').textContent = stats.delayed || 0;
}

// Render tracking form
function renderTrackingForm() {
    return `
        <div class="sol-form">
            <!-- Tab Navigation -->
            <div class="sol-tabs">
                <button class="sol-tab active" data-tab="single">
                    <i class="fas fa-plus"></i>
                    Singolo Tracking
                </button>
                <button class="sol-tab" data-tab="import">
                    <i class="fas fa-file-import"></i>
                    Import Multiplo
                </button>
            </div>
            
            <!-- Single Tab -->
            <div class="sol-tab-content active" data-content="single">
                <div class="sol-form-grid">
                    <div class="sol-form-group">
                        <label class="sol-form-label">
                            <i class="fas fa-barcode"></i> Numero Tracking
                        </label>
                        <input type="text" 
                               id="trackingNumber" 
                               class="sol-form-input" 
                               placeholder="Es: MSKU1234567"
                               oninput="detectTrackingType(this.value)">
                        <span class="sol-form-hint" id="typeHint"></span>
                    </div>
                    
                    <div class="sol-form-group">
                        <label class="sol-form-label">
                            <i class="fas fa-box"></i> Tipo Tracking
                        </label>
                        <select id="trackingType" class="sol-form-select">
                            <option value="">Seleziona tipo</option>
                            <option value="container">Container</option>
                            <option value="bl">Bill of Lading (BL)</option>
                            <option value="awb">Air Waybill (AWB)</option>
                            <option value="parcel">Parcel/Express</option>
                        </select>
                    </div>
                    
                    <div class="sol-form-group">
                        <label class="sol-form-label">
                            <i class="fas fa-truck"></i> Carrier
                        </label>
                        <select id="carrierCode" class="sol-form-select">
                            <option value="">Seleziona carrier</option>
                            <optgroup label="Maritime">
                                <option value="MSC">MSC</option>
                                <option value="MAERSK">MAERSK</option>
                                <option value="CMA-CGM">CMA CGM</option>
                                <option value="COSCO">COSCO</option>
                            </optgroup>
                            <optgroup label="Air Cargo">
                                <option value="FX">FedEx</option>
                                <option value="CV">Cargolux</option>
                            </optgroup>
                        </select>
                    </div>
                    
                    <div class="sol-form-group">
                        <label class="sol-form-label">
                            <i class="fas fa-tag"></i> Riferimento (opzionale)
                        </label>
                        <input type="text" 
                               id="referenceNumber" 
                               class="sol-form-input" 
                               placeholder="Es: PO123456">
                    </div>
                </div>
            </div>
            
            <!-- Import Tab -->
            <div class="sol-tab-content" data-content="import">
                <div id="importContainer"></div>
            </div>
        </div>
    `;
}

// Setup form interactions
function setupFormInteractions() {
    // Tab switching
    document.querySelectorAll('.sol-tab').forEach(tab => {
        tab.addEventListener('click', async (e) => {
            const tabName = e.currentTarget.dataset.tab;
            
            // Update tabs
            document.querySelectorAll('.sol-tab').forEach(t => t.classList.remove('active'));
            e.currentTarget.classList.add('active');
            
            // Update content
            document.querySelectorAll('.sol-tab-content').forEach(c => c.classList.remove('active'));
            document.querySelector(`[data-content="${tabName}"]`).classList.add('active');
            
            // Initialize import if needed
            if (tabName === 'import') {
                // Load ShipsGo templates if available
                try {
                    const { shipsGoImport } = await import('../../core/import-wizard-shipsgo.js');
                    shipsGoImport.init();
                } catch (error) {
                    console.log('ShipsGo templates not available');
                }
                
                // Use window.ImportManager instead of ImportManager
                // if (window.ImportManager) {
//     window.ImportManager.renderImportUI('importContainer');
// }
            }
        });
    });
}

// Detect tracking type from number
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
            hint.style.color = '#34C759';
        }
    } else if (hint) {
        hint.textContent = '';
    }
};

// Handle add tracking
async function handleAddTracking() {
    const formData = {
        trackingNumber: document.getElementById('trackingNumber').value.trim().toUpperCase(),
        trackingType: document.getElementById('trackingType').value,
        carrierCode: document.getElementById('carrierCode').value,
        referenceNumber: document.getElementById('referenceNumber').value
    };
    
    // Validate
    if (!formData.trackingNumber || !formData.trackingType || !formData.carrierCode) {
        window.NotificationSystem.error('Compila tutti i campi obbligatori');
        return;
    }
    
    try {
        // Smart tracking strategy
        const result = await smartAddTracking(formData);
        
        if (result.success) {
            window.NotificationSystem.success(result.message);
            window.ModalSystem.close();
            await loadTrackings();
        }
        
    } catch (error) {
        console.error('Error adding tracking:', error);
        window.NotificationSystem.error(error.message);
    }
}

// Smart add tracking (GET first, POST only if needed)
async function smartAddTracking(formData) {
    // Check if already exists locally
    const exists = trackings.find(t => 
        t.tracking_number.toUpperCase() === formData.trackingNumber
    );
    
    if (exists) {
        return {
            success: false,
            message: 'Tracking già presente nel sistema'
        };
    }
    
    // Container: Try GET first from ShipsGo
    if (formData.trackingType === 'container') {
        const containerInfo = await tryGetContainer(formData);
        
        if (containerInfo.found) {
            // Save without consuming credits
            await saveTrackingFromShipsGo(containerInfo.data, formData);
            return {
                success: true,
                message: '✅ Container trovato in ShipsGo (0 crediti)'
            };
        } else {
            // Ask confirmation for POST
            const confirm = await window.ModalSystem.confirm({
                title: 'Container non trovato',
                message: 'Container non trovato in ShipsGo. Vuoi registrarlo? (consuma 1 credito)',
                confirmText: 'Registra',
                confirmClass: 'sol-btn-primary'
            });
            
            if (confirm) {
                await createNewTracking(formData);
                return {
                    success: true,
                    message: '✅ Container registrato (1 credito)'
                };
            }
        }
    } else {
        // Other types: direct creation
        await createNewTracking(formData);
        return {
            success: true,
            message: '✅ Tracking aggiunto con successo'
        };
    }
}

// Try GET container from ShipsGo
async function tryGetContainer(formData) {
    try {
        const result = await window.api.get(
            `shipsgo-container-info?containerNumber=${formData.trackingNumber}&shippingLine=${formData.carrierCode}`,
            { silent: true }
        );
        
        if (result.data && result.data.tracking_number) {
            return { found: true, data: result.data };
        }
    } catch (error) {
        console.log('Container not found in ShipsGo');
    }
    
    return { found: false };
}

// Save tracking from ShipsGo data
async function saveTrackingFromShipsGo(shipsgoData, formData) {
    await window.api.post('add-tracking', {
        ...formData,
        metadata: {
            ...shipsgoData.metadata,
            imported_from_shipsgo: true
        }
    });
}

// Create new tracking
async function createNewTracking(formData) {
    await window.api.post('add-tracking', formData, {
        loading: 'Aggiunta tracking...'
    });
}

// Handle refresh tracking
async function handleRefreshTracking(id) {
    try {
        await window.api.post('update-tracking', { 
            trackingId: id, 
            forceUpdate: true 
        }, {
            loading: 'Aggiornamento tracking...'
        });
        
        window.NotificationSystem.success('Tracking aggiornato');
        await loadTrackings();
        
    } catch (error) {
        console.error('Error refreshing:', error);
        window.NotificationSystem.error('Errore durante aggiornamento');
    }
}

// Handle view timeline (Modal version - existing functionality)
async function handleViewTimeline(id) {
    try {
        // For mock data, find the tracking locally
        const tracking = trackings.find(t => t.id == id);
        
        if (!tracking) {
            throw new Error('Tracking non trovato');
        }
        
        // Try to get events from API, fallback to metadata events
        let events = [];
        try {
            const result = await window.api.get(`get-tracking-events?trackingId=${id}`, {
                loading: 'Caricamento timeline...'
            });
            events = result.events || [];
        } catch (error) {
            // Use metadata events if available
            if (tracking.metadata && tracking.metadata.timeline_events) {
                events = tracking.metadata.timeline_events.map((e, index) => ({
                    id: index + 1,
                    event_date: e.date,
                    event_type: e.type,
                    description: e.description,
                    location_name: e.location,
                    details: e.details
                }));
            }
        }
        
        window.ModalSystem.show({
            title: `Timeline - ${tracking.tracking_number}`,
            size: 'large',
            content: renderTimeline(tracking, events)
        });
        
    } catch (error) {
        console.error('Error loading timeline:', error);
        window.NotificationSystem.error('Errore caricamento timeline');
    }
}

// Render timeline (Modal version)
function renderTimeline(tracking, events) {
    if (events.length === 0) {
        return `
            <div class="sol-empty-state">
                <i class="fas fa-info-circle"></i>
                <p>Nessun evento disponibile per questo tracking.</p>
            </div>
        `;
    }
    
    return `
        <div class="sol-timeline">
            ${events.map(event => `
                <div class="sol-timeline-item">
                    <div class="sol-timeline-marker"></div>
                    <div class="sol-timeline-content">
                        <div class="sol-timeline-date">${formatDate(event.event_date)}</div>
                        <div class="sol-timeline-title">${formatEventType(event.event_type)}</div>
                        <div class="sol-timeline-description">${event.description || ''}</div>
                        ${event.location_name ? `
                            <div class="sol-timeline-location">
                                <i class="fas fa-map-marker-alt"></i> ${event.location_name}
                            </div>
                        ` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Handle delete tracking
async function handleDeleteTracking(id) {
    const confirm = await window.ModalSystem.confirm({
        title: 'Conferma eliminazione',
        message: 'Sei sicuro di voler eliminare questo tracking?',
        confirmText: 'Elimina',
        confirmClass: 'sol-btn-error'
    });
    
    if (!confirm) return;
    
    try {
        await window.api.post('delete-tracking', { trackingId: id }, {
            loading: 'Eliminazione tracking...'
        });
        
        window.NotificationSystem.success('Tracking eliminato');
        await loadTrackings();
        
    } catch (error) {
        console.error('Error deleting:', error);
        window.NotificationSystem.error('Errore durante eliminazione');
    }
}

// Refresh all trackings
async function refreshAllTrackings() {
    const activeTrackings = trackings.filter(t => t.status !== 'delivered');
    
    if (activeTrackings.length === 0) {
        window.NotificationSystem.info('Nessun tracking attivo da aggiornare');
        return;
    }
    
    // Show progress modal
    const progressModal = window.ModalSystem.show({
        title: 'Aggiornamento Tracking',
        content: `
            <div class="sol-progress">
                <p id="progressText">Preparazione...</p>
                <div class="sol-progress-bar">
                    <div class="sol-progress-fill" id="progressBar"></div>
                </div>
                <p class="sol-progress-stats">
                    <span id="progressCount">0</span> / ${activeTrackings.length}
                </p>
            </div>
        `,
        closable: false
    });
    
    let completed = 0;
    let errors = 0;
    
    // Process in batches
    const batchSize = 5;
    for (let i = 0; i < activeTrackings.length; i += batchSize) {
        const batch = activeTrackings.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (tracking) => {
            try {
                await window.api.post('update-tracking', { 
                    trackingId: tracking.id 
                }, { silent: true });
            } catch (error) {
                errors++;
            } finally {
                completed++;
                updateProgress(completed, activeTrackings.length);
            }
        }));
        
        // Rate limiting
        if (i + batchSize < activeTrackings.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    window.ModalSystem.close();
    
    const message = errors > 0 ? 
        `Aggiornamento completato con ${errors} errori` :
        'Tutti i tracking aggiornati con successo';
        
    window.NotificationSystem[errors > 0 ? 'warning' : 'success'](message);
    
    await loadTrackings();
}

// Update progress
function updateProgress(current, total) {
    const percent = (current / total) * 100;
    document.getElementById('progressBar').style.width = `${percent}%`;
    document.getElementById('progressCount').textContent = current;
    document.getElementById('progressText').textContent = `Aggiornamento tracking ${current} di ${total}...`;
}

// Apply filters
function applyFilters() {
    const statusFilter = document.getElementById('statusFilter').value;
    const typeFilter = document.getElementById('typeFilter').value;
    
    let filtered = [...trackings];
    
    if (statusFilter) {
        filtered = filtered.filter(t => t.status === statusFilter);
    }
    
    if (typeFilter) {
        filtered = filtered.filter(t => t.tracking_type === typeFilter);
    }
    
    trackingTable.setData(filtered);
    
    // Update timeline if active
    window.currentTrackings = filtered;
    if (window.timelineView && window.timelineView.isActive()) {
        window.timelineView.refresh();
    }
}

// Export functions
async function exportToPDF() {
    // Implementation depends on jsPDF availability
    window.NotificationSystem.info('Export PDF in sviluppo');
}

async function exportToExcel() {
    // Implementation depends on XLSX availability
    window.NotificationSystem.info('Export Excel in sviluppo');
}

// Show sync wizard
function showSyncWizard() {
    window.ModalSystem.show({
        title: 'Sincronizzazione ShipsGo',
        size: 'large',
        content: renderSyncWizard()
    });
}

// Render sync wizard
function renderSyncWizard() {
    return `
        <div class="sol-sync-wizard">
            <div class="sol-sync-header">
                <i class="fas fa-sync-alt sol-sync-icon"></i>
                <h3>Sincronizza i tuoi tracking da ShipsGo</h3>
                <p>Scarica GRATIS tutti i tracking già presenti nel tuo account</p>
            </div>
            
            <div class="sol-sync-options">
                <div class="sol-sync-card" onclick="syncFromShipsGo('all')">
                    <i class="fas fa-cloud-download-alt"></i>
                    <h4>Import Account</h4>
                    <p>Scarica TUTTI i tracking</p>
                    <span class="sol-badge sol-badge-success">GRATIS</span>
                </div>
                
                <div class="sol-sync-card" onclick="syncFromShipsGo('active')">
                    <i class="fas fa-ship"></i>
                    <h4>Container Attivi</h4>
                    <p>Solo container in transito</p>
                    <span class="sol-badge sol-badge-success">GRATIS</span>
                </div>
                
                <div class="sol-sync-card" onclick="syncFromShipsGo('awb')">
                    <i class="fas fa-plane"></i>
                    <h4>AWB Recenti</h4>
                    <p>Ultimi 30 giorni</p>
                    <span class="sol-badge sol-badge-success">GRATIS</span>
                </div>
            </div>
        </div>
    `;
}

// Sync from ShipsGo
window.syncFromShipsGo = async function(type) {
    window.ModalSystem.close();
    
    try {
        let result;
        
        switch(type) {
            case 'all':
                result = await window.api.post('sync-shipsgo-all', {}, {
                    loading: 'Sincronizzazione completa in corso...'
                });
                break;
            case 'active':
                result = await window.api.post('sync-shipsgo-containers', {
                    onlyActive: true
                }, {
                    loading: 'Sincronizzazione container attivi...'
                });
                break;
            case 'awb':
                result = await window.api.get('shipsgo-air-shipments?take=50&recent=true', {
                    loading: 'Download AWB recenti...'
                });
                break;
        }
        
        window.NotificationSystem.success('Sincronizzazione completata');
        await loadTrackings();
        
    } catch (error) {
        console.error('Sync error:', error);
        window.NotificationSystem.error('Errore durante sincronizzazione');
    }
};

// Format helpers
function formatType(type) {
    const types = {
        container: { icon: 'fa-cube', text: 'Container' },
        bl: { icon: 'fa-file-alt', text: 'B/L' },
        awb: { icon: 'fa-plane', text: 'AWB' },
        parcel: { icon: 'fa-box', text: 'Parcel' }
    };
    const config = types[type] || { icon: 'fa-question', text: type };
    return `<span class="sol-badge sol-badge-info"><i class="fas ${config.icon}"></i> ${config.text}</span>`;
}

function formatStatus(status) {
    const statuses = {
        registered: { class: 'info', text: 'Registrato', icon: 'fa-clock' },
        in_transit: { class: 'warning', text: 'In Transito', icon: 'fa-ship' },
        out_for_delivery: { class: 'primary', text: 'In Consegna', icon: 'fa-truck' },
        delivered: { class: 'success', text: 'Consegnato', icon: 'fa-check-circle' },
        delayed: { class: 'error', text: 'In Ritardo', icon: 'fa-exclamation-triangle' },
        exception: { class: 'error', text: 'Eccezione', icon: 'fa-times-circle' },
        cancelled: { class: 'dark', text: 'Cancellato', icon: 'fa-ban' }
    };
    const config = statuses[status] || { class: 'info', text: status, icon: 'fa-question' };
    return `<span class="sol-badge sol-badge-${config.class}"><i class="fas ${config.icon}"></i> ${config.text}</span>`;
}

function formatDate(date) {
    if (!date) return '-';
    return new Date(date).toLocaleString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatEventType(type) {
    const eventTypes = {
        'REGISTERED': 'Registrato',
        'GATE_IN': 'Ingresso Terminal',
        'GATE_OUT': 'Uscita Terminal',
        'LOADED_ON_VESSEL': 'Caricato su Nave',
        'DISCHARGED_FROM_VESSEL': 'Scaricato da Nave',
        'DELIVERED': 'Consegnato',
        'DEPARTED': 'Partito',
        'ARRIVED': 'Arrivato',
        'VESSEL_DEPARTED': 'Nave Partita',
        'IN_TRANSIT': 'In Transito'
    };
    return eventTypes[type] || type;
}

// Stats order management
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

// Auto refresh
function startAutoRefresh() {
    // Refresh every 5 minutes
    setInterval(() => {
        loadTrackings();
    }, 5 * 60 * 1000);
}