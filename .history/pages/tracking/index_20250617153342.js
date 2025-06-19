// ===== TRACKING INDEX - VERSIONE FINALE CORRETTA ===== 
// File: pages/tracking/index.js
// 🔧 FIX COMPLETO FORMATTER SHIPSGO + RISOLUZIONE ERRORI SINTASSI

// ===== IMPORTAZIONI E SETUP INIZIALE =====
let TableManager, modalSystem, notificationSystem, trackingService;

// Wait for dependencies
const waitForDependencies = () => {
    return new Promise((resolve) => {
        const checkDependencies = () => {
            TableManager = window.TableManager;
            modalSystem = window.ModalSystem;
            notificationSystem = window.NotificationSystem;
            trackingService = window.trackingService;
            
            if (TableManager && modalSystem && notificationSystem) {
                resolve();
            } else {
                setTimeout(checkDependencies, 100);
            }
        };
        checkDependencies();
    });
};

console.log('🚀 [Tracking] Inizializzazione Sistema Finale...');

// ===== CONFIGURAZIONE PATTERNS E MAPPINGS =====
const TRACKING_PATTERNS = {
    container: /^[A-Z]{4}\d{7}$/,
    bl: /^[A-Z]{4}\d{8,12}$/,
    awb: /^\d{3}-\d{8}$/,
    parcel: /^[A-Z0-9]{10,30}$/
};

// Status mapping consolidato - PERFETTO PER IMPORT SHIPSGO
const STATUS_MAPPING = {
    // Maritime
    'Sailing': 'In transito',
    'Arrived': 'Arrivata', 
    'Arrivata': 'Arrivata',
    'Delivered': 'Consegnato',
    'Discharged': 'Scaricato',
    'Empty': 'Consegnato',
    'Empty Returned': 'Consegnato',
    'POD': 'Consegnato',
    
    // Express/Air
    'LA spedizione è stata consegnata': 'Consegnato',
    'On FedEx vehicle for delivery': 'In consegna',
    'At local FedEx facility': 'In transito',
    'Departed FedEx hub': 'In transito',
    'On the way': 'In transito',
    'Arrived at FedEx hub': 'In transito',
    'International shipment release - Import': 'Sdoganata',
    'At destination sort facility': 'In transito',
    'Left FedEx origin facility': 'In transito',
    'Picked up': 'In transito',
    'Shipment information sent to FedEx': 'Spedizione creata',
    
    // GLS
    'Consegnata.': 'Consegnato',
    'Consegna prevista nel corso della giornata odierna.': 'In consegna',
    'Arrivata nella Sede GLS locale.': 'In transito',
    'In transito.': 'In transito',
    'Partita dalla sede mittente. In transito.': 'In transito',
    'La spedizione e\' stata creata dal mittente, attendiamo che ci venga affidata per l\'invio a destinazione.': 'Spedizione creata',
    'La spedizione è stata consegnata': 'Consegnato',
    'La spedizione è in consegna': 'In consegna',
    'La spedizione è in transito': 'In transito',
    
    // Status interni
    'registered': 'Spedizione creata',
    'in_transit': 'In transito',
    'arrived': 'Arrivata',
    'customs_cleared': 'Sdoganata',
    'out_for_delivery': 'In consegna',
    'delivered': 'Consegnato',
    'delayed': 'In ritardo',
    'exception': 'Eccezione',
    
    // ShipsGo specifici
    'Booking Confirmed': 'Spedizione creata',
    'Booked': 'Spedizione creata',
    'Pending': 'Spedizione creata',
    'Registered': 'Spedizione creata'
};

// ===== STATO GLOBALE =====
let trackingTable = null;
let trackings = [];
let statsCards = [];

// ===== CONFIGURAZIONE COLONNE =====
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

// Definizione colonne disponibili
const availableColumns = [
    { key: 'select', label: '', visible: true, order: 0, required: false, isCheckbox: true, width: '40px' },
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
    { key: 'actions', label: 'Azioni', visible: true, order: 38, required: true, isAction: true }
];

const DEFAULT_COLUMNS = ['select', 'tracking_number', 'tracking_type', 'carrier_code', 'status', 'origin_port', 'destination_port', 'eta', 'created_at', 'actions'];

// ===== FORMATTER HELPER FUNCTION - INTELLIGENTE =====
function getValue(row, possibleKeys) {
    // Prova prima nel row diretto
    for (const key of possibleKeys) {
        if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
            return row[key];
        }
    }
    
    // Poi nei metadata se esistono
    if (row.metadata) {
        for (const key of possibleKeys) {
            if (row.metadata[key] !== undefined && row.metadata[key] !== null && row.metadata[key] !== '') {
                return row.metadata[key];
            }
        }
    }
    
    return null;
}

// ===== FORMATTERS SHIPSGO COMPLETI =====
function getColumnFormatters() {
    return {
        // ===== HELPER FUNCTION =====
        getValue: getValue,
        
        // ===== BASIC FIELDS =====
        tracking_number: function(value, row) {
            const helpers = this;
            const number = helpers.getValue(row, [
                'tracking_number',
                'NUMERO TRACKING', 
                'Numero Tracking',
                'AWB NUMBER',
                'AWB Number'
            ]) || value || '-';
            
            // Determina il tipo per l'icona
            const type = helpers.getValue(row, [
                'tracking_type',
                'TIPO',
                'Type'
            ]) || (helpers.getValue(row, ['AWB NUMBER', 'AWB Number', 'AIRLINE', 'Airline']) ? 'awb' : 'container');
            
            const typeIcon = type === 'awb' ? '✈️' : (type === 'container' ? '📦' : '🚛');
            return `<span class="tracking-number">${typeIcon} ${number}</span>`;
        },

        tracking_type: function(value, row) {
            const helpers = this;
            // Rileva il tipo dai dati
            let type = value || helpers.getValue(row, [
                'tracking_type',
                'TIPO',
                'Type'
            ]);
            
            // Auto-detection se non specificato
            if (!type) {
                if (helpers.getValue(row, ['AWB NUMBER', 'AWB Number', 'AIRLINE', 'Airline'])) {
                    type = 'awb';
                } else if (helpers.getValue(row, ['CONTAINER COUNT', 'Container Count', 'PORT OF LOADING', 'Port Of Loading'])) {
                    type = 'container';
                } else {
                    type = 'container'; // default
                }
            }
            
            const typeMap = {
                'awb': 'AEREO',
                'container': 'MARE', 
                'bl': 'MARE',
                'parcel': 'CORRIERE',
                'shipsgo_air': 'AEREO',
                'shipsgo_sea': 'MARE'
            };
            
            const label = typeMap[type] || type.toUpperCase();
            const badgeClass = (type === 'awb' || type === 'shipsgo_air') ? 'badge-warning' : 'badge-info';
            
            return `<span class="sol-badge ${badgeClass}" style="display: inline-block; padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; text-transform: uppercase;">${label}</span>`;
        },

        carrier_code: function(value, row) {
            const helpers = this;
            return helpers.getValue(row, [
                'carrier_code',
                'VETTORE',
                'Vettore',
                'Carrier',
                'CARRIER',
                'AIRLINE',
                'Airline'
            ]) || value || '-';
        },

        status: function(value, row) {
            const helpers = this;
            const originalStatus = helpers.getValue(row, [
                'status',
                'STATO',
                'Status',
                'STATUS'
            ]) || value || 'registered';
            
            // Usa il mapping degli status
            const mappedStatus = STATUS_MAPPING[originalStatus] || originalStatus;
            
            // Determina classe CSS basata sul testo mappato
            let badgeClass = 'badge-secondary';
            if (mappedStatus.includes('Consegnato')) badgeClass = 'badge-success';
            else if (mappedStatus.includes('In transito') || mappedStatus.includes('Arrivata')) badgeClass = 'badge-info';
            else if (mappedStatus.includes('In consegna') || mappedStatus.includes('Sdoganata')) badgeClass = 'badge-warning';
            else if (mappedStatus.includes('ritardo') || mappedStatus.includes('Eccezione')) badgeClass = 'badge-danger';
            else if (mappedStatus.includes('creata')) badgeClass = 'badge-secondary';
            
            return `<span class="sol-badge ${badgeClass}" style="display: inline-block; padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: 600;">${mappedStatus}</span>`;
        },

        // ===== ORIGIN/DESTINATION =====
        origin_port: function(value, row) {
            const helpers = this;
            return helpers.getValue(row, [
                'origin_port',
                'ORIGINE',
                'Origine',
                'ORIGIN',
                'Origin',
                'PORT OF LOADING',
                'Port Of Loading'
            ]) || value || '-';
        },

        destination_port: function(value, row) {
            const helpers = this;
            return helpers.getValue(row, [
                'destination_port',
                'DESTINAZIONE',
                'Destinazione',
                'DESTINATION',
                'Destination',
                'PORT OF DISCHARGE',
                'Port Of Discharge'
            ]) || value || '-';
        },

        // ===== AIR SPECIFIC FORMATTERS =====
        awb_number: function(value, row) {
            const helpers = this;
            return helpers.getValue(row, [
                'awb_number',
                'AWB NUMBER',
                'AWB Number',
                'tracking_number'
            ]) || value || '-';
        },

        airline: function(value, row) {
            const helpers = this;
            return helpers.getValue(row, [
                'airline',
                'AIRLINE',
                'Airline',
                'carrier_code',
                'VETTORE'
            ]) || value || '-';
        },

        origin_country: function(value, row) {
            const helpers = this;
            return helpers.getValue(row, [
                'origin_country',
                'ORIGIN COUNTRY',
                'Origin Country',
                'POL COUNTRY',
                'POL Country'
            ]) || value || '-';
        },

        origin_country_code: function(value, row) {
            const helpers = this;
            const code = helpers.getValue(row, [
                'origin_country_code',
                'ORIGIN COUNTRY CODE',
                'Origin Country Code',
                'POL COUNTRY CODE',
                'POL Country Code'
            ]) || value || '';
            return code ? `<span class="country-code" style="background: #f0f0f0; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold;">${code}</span>` : '-';
        },

        destination_country: function(value, row) {
            const helpers = this;
            return helpers.getValue(row, [
                'destination_country',
                'DESTINATION COUNTRY',
                'Destination Country',
                'POD COUNTRY',
                'POD Country'
            ]) || value || '-';
        },

        destination_country_code: function(value, row) {
            const helpers = this;
            const code = helpers.getValue(row, [
                'destination_country_code',
                'DESTINATION COUNTRY CODE',
                'Destination Country Code',
                'POD COUNTRY CODE',
                'POD Country Code'
            ]) || value || '';
            return code ? `<span class="country-code" style="background: #f0f0f0; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold;">${code}</span>` : '-';
        },

        date_of_departure: function(value, row) {
            const helpers = this;
            const date = helpers.getValue(row, [
                'date_of_departure',
                'DATE OF DEPARTURE',
                'Date Of Departure',
                'departure_date'
            ]) || value || '';
            return date ? formatDate(date) : '-';
        },

        date_of_arrival: function(value, row) {
            const helpers = this;
            const date = helpers.getValue(row, [
                'date_of_arrival',
                'DATE OF ARRIVAL',
                'Date Of Arrival',
                'eta'
            ]) || value || '';
            return date ? formatDate(date) : '-';
        },

        transit_time: function(value, row) {
            const helpers = this;
            // Prova a trovare transit time
            let time = helpers.getValue(row, [
                'transit_time',
                'TRANSIT TIME',
                'Transit Time'
            ]) || value || '';
            
            // Calcola transit time se abbiamo le date
            if (!time) {
                const depDate = helpers.getValue(row, ['DATE OF DEPARTURE', 'Date Of Departure']);
                const arrDate = helpers.getValue(row, ['DATE OF ARRIVAL', 'Date Of Arrival']);
                
                if (depDate && arrDate) {
                    try {
                        const departure = new Date(depDate);
                        const arrival = new Date(arrDate);
                        const diffTime = Math.abs(arrival - departure);
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        time = diffDays + ' giorni';
                    } catch (e) {
                        console.warn('Error calculating transit time:', e);
                    }
                }
            }
            
            return time || '-';
        },

        t5_count: function(value, row) {
            const helpers = this;
            return helpers.getValue(row, [
                't5_count',
                'T5 COUNT',
                'T5 Count'
            ]) || value || '-';
        },

        // ===== SEA SPECIFIC FORMATTERS =====
        container_count: function(value, row) {
            const helpers = this;
            const count = helpers.getValue(row, [
                'container_count',
                'CONTAINER COUNT',
                'Container Count'
            ]) || value || '';
            
            // Estrai solo il numero se c'è del testo
            if (typeof count === 'string' && count.includes('container')) {
                return count.replace(/[^0-9]/g, '') || '-';
            }
            return count || '-';
        },

        port_of_loading: function(value, row) {
            const helpers = this;
            return helpers.getValue(row, [
                'port_of_loading',
                'PORT OF LOADING',
                'Port Of Loading',
                'origin_port'
            ]) || value || '-';
        },

        date_of_loading: function(value, row) {
            const helpers = this;
            const date = helpers.getValue(row, [
                'date_of_loading',
                'DATE OF LOADING',
                'Date Of Loading',
                'departure_date'
            ]) || value || '';
            return date ? formatDate(date) : '-';
        },

        port_of_discharge: function(value, row) {
            const helpers = this;
            return helpers.getValue(row, [
                'port_of_discharge',
                'PORT OF DISCHARGE',
                'Port Of Discharge',
                'destination_port'
            ]) || value || '-';
        },

        date_of_discharge: function(value, row) {
            const helpers = this;
            const date = helpers.getValue(row, [
                'date_of_discharge',
                'DATE OF DISCHARGE',
                'Date Of Discharge',
                'eta'
            ]) || value || '';
            return date ? formatDate(date) : '-';
        },

        co2_emission: function(value, row) {
            const helpers = this;
            const emission = helpers.getValue(row, [
                'co2_emission',
                'CO₂ EMISSION (TONS)',
                'CO2 Emission (Tons)'
            ]) || value || '';
            return emission || '-';
        },

        // ===== COMMON FIELDS =====
        eta: function(value, row) {
            const helpers = this;
            const eta = helpers.getValue(row, [
                'eta',
                'ETA',
                'DATE OF ARRIVAL',
                'Date Of Arrival',
                'DATE OF DISCHARGE',
                'Date Of Discharge'
            ]) || value || '';
            return eta ? formatDate(eta) : '-';
        },

        last_event_location: function(value, row) {
            const helpers = this;
            return helpers.getValue(row, [
                'last_event_location',
                'ultima_posizione',
                'last_known_location',
                'destination_port',
                'PORT OF DISCHARGE',
                'DESTINATION'
            ]) || value || '-';
        },

        created_at: function(value, row) {
            const helpers = this;
            const date = helpers.getValue(row, [
                'created_at',
                'CREATED AT',
                'Created At'
            ]) || value || '';
            return date ? formatDate(date) : '-';
        }
    };
}

// ===== HELPER FUNCTION FOR DATE FORMATTING =====
function formatDate(dateString) {
    if (!dateString) return '-';
    
    try {
        // Se è già in formato DD/MM/YYYY, restituiscilo così
        if (typeof dateString === 'string' && dateString.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
            return dateString;
        }
        
        // Se è un timestamp ISO o altro formato, convertilo
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString; // Se non è una data valida, restituisci il valore originale
        
        // Converti in DD/MM/YYYY
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        
        return `${day}/${month}/${year}`;
    } catch (error) {
        console.warn('Error formatting date:', dateString, error);
        return dateString || '-';
    }
}

// ===== FORMATTER DELLE COLONNE - VERSIONE SEMPLIFICATA =====
function getColumnFormatter(key) {
    const formatters = getColumnFormatters();
    
    // Se esiste un formatter specifico, usalo
    if (formatters[key]) {
        return formatters[key];
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

// ===== DEBUG FUNCTION =====
function debugRowData() {
    const row = window.currentTrackings?.[0];
    if (row) {
        console.log('🔍 DEBUG ROW DATA:');
        console.log('Full row:', row);
        console.log('Row keys:', Object.keys(row));
        console.log('Has metadata:', !!row.metadata);
        if (row.metadata) {
            console.log('Metadata keys:', Object.keys(row.metadata));
            console.log('Metadata sample:', row.metadata);
        }
        
        // Test formatters
        const formatters = getColumnFormatters();
        console.log('\n🧪 FORMATTER TESTS:');
        console.log('- container_count:', formatters.container_count(null, row));
        console.log('- transit_time:', formatters.transit_time(null, row));
        console.log('- status:', formatters.status(null, row));
        console.log('- awb_number:', formatters.awb_number(null, row));
        console.log('- tracking_type:', formatters.tracking_type(null, row));
        console.log('- origin_port:', formatters.origin_port(null, row));
    } else {
        console.log('❌ No tracking data found');
    }
}

// ===== INIZIALIZZAZIONE PRINCIPALE =====
window.trackingInit = async function() {
    console.log('🚀 [Tracking] Initializing FINAL system...');
    
    try {
        // Aspetta le dipendenze
        await waitForDependencies();
        console.log('✅ [Tracking] Dependencies loaded');
        
        // Inizializza servizi
        if (trackingService && typeof trackingService.initialize === 'function') {
            await trackingService.initialize();
            console.log('✅ [Tracking] Service initialized');
        }
        
        // Esponi funzioni globali
        window.showAddTrackingForm = showAddTrackingForm;
        window.refreshAllTrackings = refreshAllTrackings;
        window.exportToPDF = exportToPDF;
        window.exportToExcel = exportToExcel;
        window.showColumnManager = showColumnManager;
        window.refreshTracking = (id) => handleRefreshTracking(id);
        window.viewTimeline = (id) => handleViewTimeline(id);
        window.deleteTracking = (id) => handleDeleteTracking(id);
        window.debugRowData = debugRowData;
        
        // Esponi formatter functions
        window.getColumnFormatter = getColumnFormatter;
        window.getColumnFormatters = getColumnFormatters;
        window.formatDate = formatDate;
        console.log('[Tracking] ✅ Column formatters exposed globally');
        
        // Load saved columns
        loadSavedColumns();
        
        // Setup componenti
        setupStatsCards();
        setupBulkActions();
        setupCheckboxListeners();
        setupTrackingTable();      
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
        
        console.log('✅ [Tracking] System initialized successfully');
        
    } catch (error) {
        console.error('❌ [Tracking] Initialization failed:', error);
        if (notificationSystem) {
            notificationSystem.error('Errore inizializzazione pagina tracking');
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
        
        // Setup Sortable se disponibile
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

// ===== SETUP TRACKING TABLE =====
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
        className: 'data-table sol-table'
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

// ===== CHECKBOX MANAGEMENT =====
function setupCheckboxListeners() {
    document.addEventListener('change', (e) => {
        if (e.target.classList.contains('row-select')) {
            updateSelectedCount();
        }
    });
}

window.updateSelectedCount = function() {
    const selected = getSelectedRows();
    const count = selected.length;
    const container = document.getElementById('bulkActionsContainer');
    const countEl = document.getElementById('selectedCount');
    
    if (container) {
        container.style.display = count > 0 ? 'block' : 'none';
        if (countEl) countEl.textContent = count;
    }
};

window.toggleSelectAll = function(checkbox) {
    const checkboxes = document.querySelectorAll('.row-select');
    checkboxes.forEach(cb => {
        cb.checked = checkbox.checked;
        cb.dispatchEvent(new Event('change'));
    });
    updateSelectedCount();
};

function getSelectedRows() {
    const selected = [];
    document.querySelectorAll('.row-select:checked').forEach(checkbox => {
        const rowId = checkbox.dataset.rowId;
        const tracking = trackings.find(t => t.id == rowId);
        if (tracking) selected.push(tracking);
    });
    return selected;
}

window.clearSelection = function() {
    document.querySelectorAll('.row-select').forEach(cb => cb.checked = false);
    const selectAll = document.querySelector('.select-all');
    if (selectAll) selectAll.checked = false;
    updateSelectedCount();
};

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
        
        console.log(`✅ [Tracking] Successfully loaded ${trackings.length} trackings`);
        
    } catch (error) {
        console.error('❌ [Tracking] Error loading trackings:', error);
        if (notificationSystem) {
            notificationSystem.error('Errore nel caricamento dei tracking');
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
    if (!modalSystem) {
        console.error('Modal system not available');
        return;
    }
    
    modalSystem.show({
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
                        <button type="button" class="sol-btn sol-btn-secondary" onclick="window.ModalSystem?.closeAll()">
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

// ===== TRACKING HANDLERS - STUB IMPLEMENTATIONS =====
async function handleRefreshTracking(id) {
    console.log('Refreshing tracking:', id);
    if (notificationSystem) {
        notificationSystem.success('Tracking aggiornato (simulazione)');
    }
}

async function handleViewTimeline(id) {
    const tracking = trackings.find(t => t.id == id);
    if (!tracking || !modalSystem) return;
    
    modalSystem.show({
        title: `Timeline - ${tracking.tracking_number}`,
        size: 'large',
        content: `<div class="timeline-placeholder">Timeline per ${tracking.tracking_number}</div>`
    });
}

async function handleDeleteTracking(id) {
    if (!modalSystem) return;
    
    const confirmed = await modalSystem.confirm({
        title: 'Conferma Eliminazione',
        message: 'Sei sicuro di voler eliminare questo tracking?',
        confirmText: 'Elimina',
        confirmClass: 'sol-btn-danger',
        cancelText: 'Annulla'
    });
    
    if (!confirmed) return;
    
    trackings = trackings.filter(t => t.id != id);
    localStorage.setItem('trackings', JSON.stringify(trackings));
    await loadTrackings();
    
    if (notificationSystem) {
        notificationSystem.success('Tracking eliminato');
    }
}

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
        if (notificationSystem) {
            notificationSystem.error('Compila tutti i campi obbligatori');
        }
        return;
    }
    
    // Check if already exists
    if (trackings.find(t => t.tracking_number === formData.tracking_number)) {
        if (notificationSystem) {
            notificationSystem.error('Tracking già presente nel sistema');
        }
        return;
    }
    
    // Add to trackings
    formData.id = Date.now().toString();
    trackings.push(formData);
    
    // Save to localStorage
    localStorage.setItem('trackings', JSON.stringify(trackings));
    
    // Close modal and reload
    if (modalSystem) {
        modalSystem.closeAll();
    }
    if (notificationSystem) {
        notificationSystem.success('Tracking aggiunto con successo');
    }
    await loadTrackings();
}

// ===== ADDITIONAL FUNCTIONS - STUBS =====
async function refreshAllTrackings() {
    if (notificationSystem) {
        notificationSystem.info('Aggiornamento di tutti i tracking...');
    }
}

async function exportToPDF() {
    if (notificationSystem) {
        notificationSystem.info('Export PDF non ancora implementato');
    }
}

async function exportToExcel() {
    if (notificationSystem) {
        notificationSystem.info('Export Excel non ancora implementato');
    }
}

function showColumnManager() {
    if (notificationSystem) {
        notificationSystem.info('Gestione colonne non ancora implementata');
    }
}

function applyFilters() {
    console.log('Applying filters...');
}

function saveStatsOrder() {
    console.log('Saving stats order...');
}

function restoreStatsOrder() {
    console.log('Restoring stats order...');
}

function startAutoRefresh() {
    setInterval(() => {
        console.log('Auto-refresh...');
    }, 5 * 60 * 1000);
}

// ===== FILE IMPORT HANDLERS =====
window.handleFileImport = async function(file) {
    if (!file) return;
    
    try {
        console.log('[Import] Starting file import:', file.name);
        
        if (notificationSystem) {
            notificationSystem.info('Caricamento file in corso...', { duration: 0, id: 'import-loading' });
        }
        
        if (window.ImportManager) {
            await window.ImportManager.importFile(file, {
                updateExisting: false,
                statusMapping: STATUS_MAPPING
            });
        } else {
            throw new Error('ImportManager non disponibile');
        }
        
        if (notificationSystem) {
            notificationSystem.dismiss('import-loading');
        }
        
    } catch (error) {
        console.error('[Tracking] Import error:', error);
        if (notificationSystem) {
            notificationSystem.dismiss('import-loading');
            notificationSystem.error('Errore durante l\'import: ' + error.message);
        }
    }
};

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
    
    if (notificationSystem) {
        notificationSystem.success('Template scaricato!');
    }
};

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

// ===== GLOBAL EXPORTS =====
window.loadTrackings = loadTrackings;
window.trackings = trackings;
window.getColumnFormatters = getColumnFormatters;
window.formatDate = formatDate;
window.debugRowData = debugRowData;

console.log('✅ [Tracking] JavaScript System loaded - COMPLETE!');