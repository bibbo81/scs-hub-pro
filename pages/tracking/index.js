// index.js - Clean tracking page logic with all mappings
import TableManager from '/core/table-manager.js';

// State
let trackings = [];
let filteredTrackings = [];
let tableManager = null;

// Column mapping for import/export compatibility
const COLUMN_MAPPING = {
    'Container': 'tracking_number',
    'ContainerNumber': 'tracking_number',
    'Container Number': 'tracking_number',
    'AWB Number': 'tracking_number',
    'Tracking Number': 'tracking_number',
    'Carrier': 'carrier_code',
    'ShippingLine': 'carrier_code',
    'Shipping Line': 'carrier_code',
    'Airline': 'carrier_code',
    'CarrierName': 'carrier_name',
    'Status': 'current_status',
    'CurrentStatus': 'current_status',
    'Current Status': 'current_status',
    'Port Of Loading': 'origin_port',
    'Pol': 'origin_port',
    'POL': 'origin_port',
    'Origin': 'origin_port',
    'Port Of Discharge': 'destination_port',
    'Pod': 'destination_port',
    'POD': 'destination_port',
    'Destination': 'destination_port',
    'ETA': 'eta',
    'ETD': 'etd',
    'Reference': 'reference',
    'Booking Number': 'booking',
    'Type': 'tracking_type'
};

// Status mapping for display
const STATUS_DISPLAY = {
    'in_transit': { label: 'In Transito', class: 'primary', icon: 'fa-truck' },
    'delivered': { label: 'Consegnato', class: 'success', icon: 'fa-check-circle' },
    'registered': { label: 'Registrato', class: 'info', icon: 'fa-clipboard-check' },
    'customs_cleared': { label: 'Sdoganato', class: 'success', icon: 'fa-stamp' },
    'out_for_delivery': { label: 'In Consegna', class: 'warning', icon: 'fa-truck' },
    'arrived': { label: 'Arrivato', class: 'primary', icon: 'fa-anchor' },
    'delayed': { label: 'In Ritardo', class: 'danger', icon: 'fa-exclamation-triangle' },
    'exception': { label: 'Eccezione', class: 'warning', icon: 'fa-exclamation' },
    'pending': { label: 'In attesa', class: 'warning', icon: 'fa-clock' }
};

// Available columns configuration - LISTA COMPLETA
const AVAILABLE_COLUMNS = [
    // Colonne Base
    { key: 'tracking_number', label: 'Tracking Number', required: true, sortable: true },
    { key: 'tracking_type', label: 'Tipo', sortable: true },
    { key: 'current_status', label: 'Stato', sortable: true },
    { key: 'status', label: 'Status (raw)', sortable: true },
    
    // Carrier - TUTTE LE VARIANTI
    { key: 'carrier', label: 'Carrier', sortable: true },
    { key: 'carrier_code', label: 'Carrier Code', sortable: true },
    { key: 'carrier_name', label: 'Carrier Name', sortable: true },
    { key: 'airline', label: 'Airline', sortable: true },
    
    // Origine - TUTTE LE VARIANTI
    { key: 'origin', label: 'Origine', sortable: true },
    { key: 'origin_port', label: 'Porto/Aeroporto Origine', sortable: true },
    { key: 'origin_name', label: 'Nome Origine', sortable: true },
    { key: 'origin_country', label: 'Paese Origine', sortable: true },
    { key: 'origin_country_code', label: 'Codice Paese Origine', sortable: true },
    { key: 'port_of_loading', label: 'Port of Loading', sortable: true },
    
    // Destinazione - TUTTE LE VARIANTI
    { key: 'destination', label: 'Destinazione', sortable: true },
    { key: 'destination_port', label: 'Porto/Aeroporto Destinazione', sortable: true },
    { key: 'destination_name', label: 'Nome Destinazione', sortable: true },
    { key: 'destination_country', label: 'Paese Destinazione', sortable: true },
    { key: 'destination_country_code', label: 'Codice Paese Destinazione', sortable: true },
    { key: 'port_of_discharge', label: 'Port of Discharge', sortable: true },
    
    // Date - TUTTE LE VARIANTI
    { key: 'date_of_loading', label: 'Data Carico', sortable: true },
    { key: 'date_of_departure', label: 'Data Partenza', sortable: true },
    { key: 'departure', label: 'Partenza', sortable: true },
    { key: 'departure_date', label: 'Departure Date', sortable: true },
    { key: 'eta', label: 'ETA', sortable: true },
    { key: 'ata', label: 'ATA', sortable: true },
    { key: 'date_of_discharge', label: 'Data Scarico', sortable: true },
    { key: 'date_of_arrival', label: 'Data Arrivo', sortable: true },
    { key: 'first_eta', label: 'Prima ETA', sortable: true },
    
    // Vessel/Flight
    { key: 'vessel_name', label: 'Nome Nave', sortable: true },
    { key: 'vessel_imo', label: 'IMO Nave', sortable: true },
    { key: 'vessel', label: 'Vessel (object)', sortable: false },
    { key: 'voyage_number', label: 'Numero Viaggio', sortable: true },
    { key: 'flight_number', label: 'Numero Volo', sortable: true },
    
    // Container/AWB Details
    { key: 'container_number', label: 'Numero Container', sortable: true },
    { key: 'container_size', label: 'Dimensione Container', sortable: true },
    { key: 'container_type', label: 'Tipo Container', sortable: true },
    { key: 'container_count', label: 'Container Count', sortable: true },
    { key: 'awb_number', label: 'AWB Number', sortable: true },
    { key: 'pieces', label: 'Colli', sortable: true },
    { key: 'weight', label: 'Peso', sortable: true },
    { key: 'volume', label: 'Volume', sortable: true },
    { key: 'commodity', label: 'Merce', sortable: true },
    
    // Riferimenti
    { key: 'reference', label: 'Reference', sortable: true },
    { key: 'reference_number', label: 'Numero Riferimento', sortable: true },
    { key: 'booking', label: 'Booking', sortable: true },
    { key: 'booking_number', label: 'Booking Number', sortable: true },
    { key: 'bl_number', label: 'Bill of Lading', sortable: true },
    
    // Eventi
    { key: 'last_event_location', label: 'Ultima Posizione', sortable: true },
    { key: 'last_event_description', label: 'Ultimo Evento', sortable: true },
    { key: 'last_event_date', label: 'Data Ultimo Evento', sortable: true },
    { key: 'ultima_posizione', label: 'Ultima Posizione (it)', sortable: true },
    
    // Metriche
    { key: 'transit_time', label: 'Tempo Transito', sortable: true },
    { key: 'ts_count', label: 'TS Count', sortable: true },
    { key: 'co2_emission', label: 'CO₂ Emission', sortable: true },
    { key: 'transit_percentage', label: 'Transit %', sortable: true },
    
    // Metadata
    { key: 'shipsgo_id', label: 'ShipsGo ID', sortable: true },
    { key: 'ocean_id', label: 'Ocean ID', sortable: true },
    { key: 'created_at_shipsgo', label: 'Created at ShipsGo', sortable: true },
    { key: 'checked_at', label: 'Checked At', sortable: true },
    
    // Extra
    { key: 'tags', label: 'Tags', sortable: true },
    { key: 'notes', label: 'Note', sortable: false },
    { key: 'live_map_url', label: 'Live Map', sortable: false },
    { key: 'dataSource', label: 'Data Source', sortable: true },
    { key: 'import_source', label: 'Import Source', sortable: true },
    
    // Timestamps
    { key: 'created_at', label: 'Data Creazione', sortable: true },
    { key: 'updated_at', label: 'Data Aggiornamento', sortable: true },
    { key: 'last_update', label: 'Ultimo Aggiornamento', sortable: true },
    { key: 'createdAt', label: 'Created At', sortable: true },
    { key: 'updatedAt', label: 'Updated At', sortable: true }
];

const DEFAULT_VISIBLE_COLUMNS = [
    'tracking_number',
    'tracking_type', 
    'current_status',
    'carrier_name',
    'origin_port',
    'destination_port',
    'vessel_name',          // ← Aggiungi
    'voyage_number',        // ← Aggiungi
    'date_of_departure',
    'eta',
    'reference_number',
    'booking',
    'container_size',       // ← Aggiungi
    'container_type',       // ← Aggiungi
    'last_event_location',  // ← Aggiungi
    'transit_time',         // ← Aggiungi
    'co2_emission',         // ← Aggiungi
    'last_update'
];

// Column configuration for table
// Column configuration for table - CON FORMATTER OTTIMIZZATI
const TABLE_COLUMNS = [
    { 
        key: 'tracking_number', 
        label: 'TRACKING NUMBER', 
        sortable: true,
        formatter: (value, row) => {
            const typeIcon = row.tracking_type === 'awb' || row.tracking_type === 'air_waybill' 
                ? 'fa-plane' : 'fa-ship';
            const typeColor = row.tracking_type === 'awb' || row.tracking_type === 'air_waybill'
                ? 'text-info' : 'text-primary';
            return `<i class="fas ${typeIcon} ${typeColor} mr-1"></i> <strong>${value}</strong>`;
        }
    },
    { 
        key: 'tracking_type', 
        label: 'TIPO', 
        sortable: true,
        formatter: (value) => {
            const types = {
                'container': { icon: 'fa-cube', text: 'MARE', color: 'primary' },
                'bl': { icon: 'fa-file-alt', text: 'B/L', color: 'info' },
                'awb': { icon: 'fa-plane', text: 'AEREO', color: 'warning' },
                'air_waybill': { icon: 'fa-plane', text: 'AEREO', color: 'warning' },
                'parcel': { icon: 'fa-box', text: 'PARCEL', color: 'success' }
            };
            const config = types[value] || { icon: 'fa-question', text: value || 'N/A', color: 'secondary' };
            return `<span class="badge badge-${config.color}">
                <i class="fas ${config.icon}"></i> ${config.text}
            </span>`;
        }
    },
    { 
    key: 'current_status', 
    label: 'STATO', 
    sortable: true, 
    formatter: (value, row) => {
        // Prova current_status o status
        const status = value || row.current_status || row.status || 'pending';
        return formatStatus(status);
    }
},
    { 
    key: 'carrier_name', 
    label: 'CARRIER', 
    sortable: true,
    formatter: (value, row) => {
        // CERCA IN TUTTI I CAMPI POSSIBILI
        const carrier = value || 
                       row.carrier_name || 
                       row.metadata?.mapped?.carrier_name ||  // Ocean v2 mette qui
                       row.mapped?.carrier_name ||             // Import mette qui
                       row.carrier || 
                       row.carrier_code || 
                       '-';
        
        // Per AWB usa airline se disponibile
        if ((row.tracking_type === 'awb' || row.tracking_type === 'air_waybill') && row.airline) {
            return row.airline;
        }
        
        return carrier;
    }
},
    { 
        key: 'origin_port', 
        label: 'ORIGINE', 
        sortable: true,
        formatter: (value, row) => {
            // LOGICA UNIFICATA come nel vecchio file
            if (row.tracking_type === 'awb' || row.tracking_type === 'air_waybill') {
                // Per AIR: usa Origin Name (nome completo)
                return row.origin_name || 
                       row.metadata?.origin_name ||
                       row.metadata?.['Origin Name'] ||
                       row.origin_port ||
                       value || '-';
            }
            // Per SEA: usa Port Of Loading
            return row.port_of_loading || 
                   row.metadata?.port_of_loading ||
                   row.metadata?.['Port Of Loading'] ||
                   row.origin_port ||
                   value || '-';
        }
    },
    { 
        key: 'destination_port', 
        label: 'DESTINAZIONE', 
        sortable: true,
        formatter: (value, row) => {
            // LOGICA UNIFICATA come nel vecchio file
            if (row.tracking_type === 'awb' || row.tracking_type === 'air_waybill') {
                // Per AIR: usa Destination Name (nome completo)
                return row.destination_name || 
                       row.metadata?.destination_name ||
                       row.metadata?.['Destination Name'] ||
                       row.destination_port ||
                       value || '-';
            }
            // Per SEA: usa Port Of Discharge
            return row.port_of_discharge || 
                   row.metadata?.port_of_discharge ||
                   row.metadata?.['Port Of Discharge'] ||
                   row.destination_port ||
                   value || '-';
        }
    },
    { 
        key: 'date_of_departure', 
        label: 'PARTENZA', 
        sortable: true,
        formatter: (value, row) => {
            let date;
            
            // UNIFICATO: Per SEA usa Date Of Loading, per AIR usa Date Of Departure
            if (row.tracking_type === 'container' || row.tracking_type === 'bl') {
                date = row.date_of_loading || 
                       row.metadata?.date_of_loading ||
                       row.metadata?.['Date Of Loading'] ||
                       row.departure ||
                       value;
            } else {
                date = row.date_of_departure || 
                       row.metadata?.date_of_departure ||
                       row.metadata?.['Date Of Departure'] ||
                       row.departure ||
                       value;
            }
            
            return formatDateOnly(date);
        }
    },
    { 
        key: 'eta', 
        label: 'ETA', 
        sortable: true,
        formatter: (value, row) => {
            let date;
            
            // Per AIR: usa Date Of Arrival
            if (row.tracking_type === 'awb' || row.tracking_type === 'air_waybill') {
                date = row.date_of_arrival || 
                       row.metadata?.date_of_arrival ||
                       row.metadata?.['Date Of Arrival'] ||
                       row.eta ||
                       value;
            } else {
                // Per SEA: usa Date Of Discharge
                date = row.date_of_discharge || 
                       row.metadata?.date_of_discharge ||
                       row.metadata?.['Date Of Discharge'] ||
                       row.eta ||
                       value;
            }
            
            if (!date) return '-';
            
            const formattedDate = formatDateOnly(date);
            
            // Aggiungi indicatore se è futuro
            try {
                const etaDate = new Date(date);
                const today = new Date();
                const diffDays = Math.ceil((etaDate - today) / (1000 * 60 * 60 * 24));
                
                if (diffDays > 0 && diffDays < 30) {
                    return `${formattedDate} <small class="text-muted">(${diffDays}g)</small>`;
                }
            } catch (e) {}
            
            return formattedDate;
        }
    },
    { 
        key: 'last_update', 
        label: 'ULTIMO AGGIORNAMENTO', 
        sortable: true, 
        formatter: formatDate 
    },
    { 
        key: 'reference_number', 
        label: 'RIFERIMENTO', 
        sortable: true,
        formatter: (value) => value || '-'
    },
    { 
        key: 'booking', 
        label: 'BOOKING', 
        sortable: true,
        formatter: (value, row) => {
            // Mostra solo per container, non per aerei
            if (row.tracking_type === 'awb' || row.tracking_type === 'air_waybill') return '-';
            return value || '-';
        }
    },
    { 
        key: 'transit_time', 
        label: 'TRANSITO', 
        sortable: true,
        formatter: (value) => {
            if (!value) return '-';
            return `<span class="badge badge-secondary">${value}</span>`;
        }
    },
    { 
        key: 'co2_emission', 
        label: 'CO₂', 
        sortable: true,
        formatter: (value) => {
            if (!value) return '-';
            const num = parseFloat(value.toString().replace(/[^0-9.-]/g, ''));
            if (isNaN(num)) return value;
            const color = num > 2 ? 'danger' : num > 1 ? 'warning' : 'success';
            return `<span class="text-${color}"><i class="fas fa-leaf"></i> ${num.toFixed(2)}t</span>`;
        }
    },
    { 
        key: 'container_count', 
        label: 'N°', 
        sortable: true,
        formatter: (value, row) => {
            // Mostra solo per container, non per aerei
            if (row.tracking_type === 'awb' || row.tracking_type === 'air_waybill') return '-';
            return value || '1';
        }
    },
    { 
        key: 'tags', 
        label: 'TAGS', 
        sortable: true,
        formatter: (value) => {
            if (!value || value === '-') return '-';
            return value.split(',').map(tag => 
                `<span class="badge badge-secondary mr-1">${tag.trim()}</span>`
            ).join('');
        }
    },
    { 
        key: 'actions', 
        label: 'AZIONI', 
        sortable: false,
        formatter: (value, row) => `
            <div class="btn-group btn-group-sm">
                <button class="btn btn-primary btn-sm" onclick="refreshTracking('${row.id}')" title="Aggiorna">
                    <i class="fas fa-sync"></i>
                </button>
                <button class="btn btn-info btn-sm" onclick="viewDetails('${row.id}')" title="Dettagli">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-danger btn-sm" onclick="deleteTracking('${row.id}')" title="Elimina">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `
    }
];

// Formatters
function formatStatus(value) {
    const status = STATUS_DISPLAY[value] || { label: value || 'Sconosciuto', class: 'secondary', icon: 'fa-question' };
    return `<span class="badge badge-${status.class}">
        <i class="fas ${status.icon} mr-1"></i>${status.label}
    </span>`;
}

function formatDate(value) {
    if (!value) return '-';
    const date = new Date(value);
    const today = new Date();
    const diffDays = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
    
    const formattedDate = date.toLocaleString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // For ETA dates, show days remaining
    if (diffDays > 0 && diffDays < 30) {
        return `${formattedDate} <small class="text-muted">(${diffDays}g)</small>`;
    }
    
    return formattedDate;
}

// Helper function per formattare solo la data (senza orario)
function formatDateOnly(dateStr) {
    if (!dateStr || dateStr === '-') return '-';
    
    // Se è già nel formato DD/MM/YYYY, ritornalo
    if (typeof dateStr === 'string' && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
        return dateStr;
    }
    
    // Se ha anche l'orario, prendi solo la data
    if (typeof dateStr === 'string' && /^\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{1,2}/.test(dateStr)) {
        return dateStr.split(' ')[0];
    }
    
    // Altrimenti prova a parsare
    try {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
            return d.toLocaleDateString('it-IT');
        }
    } catch (e) {}
    
    return dateStr;
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initializing tracking page...');
    
    try {
        // Hide loading state
        document.getElementById('loadingState').style.display = 'none';
        
        // Create table container
        const tableCard = document.querySelector('.sol-card-body.p-0');
        const tableContainer = document.getElementById('trackingTableContainer');
        
        // Remove old table if exists
        const oldTable = document.getElementById('trackingTable');
        if (oldTable) {
            oldTable.parentElement.style.display = 'none';
        }
        
        // Initialize TableManager
        tableManager = new TableManager('trackingTableContainer', {
            columns: TABLE_COLUMNS,
            selectable: true,
            searchable: false, // We use external search
            paginate: true,
            pageSize: 20,
            enableColumnDrag: true,
            onSelectionChange: handleSelectionChange
        });
        // Rendi tableManager disponibile globalmente
        window.tableManager = tableManager;
        // Register globally
        window.registerTableManager('trackingTableContainer', tableManager);
        
        // Load data
        await loadTrackings();
        
        // Setup event listeners
        setupEventListeners();
        
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
        
        console.log('✅ Tracking page initialized');
/*
// Fix event delegation per checkbox dinamici
document.addEventListener('click', function(e) {
    if (e.target.type === 'checkbox' && e.target.classList.contains('select-row')) {
        e.stopPropagation();
        
        const rowId = e.target.value || e.target.dataset.id;
        const checked = e.target.checked;
        
        // Ignora se rowId è "on" o non valido
        if (!rowId || rowId === 'on') {
            console.warn('Invalid checkbox rowId:', rowId);
            return;
        }
        
        console.log('Checkbox clicked:', rowId, checked);
        
        if (tableManager) {
            tableManager.selectRow(rowId, checked);
        }
    }
});
*/     
        console.log('✅ Checkbox event delegation added');
        
    } catch (error) {
        console.error('❌ Initialization error:', error);
        showError('Errore durante l\'inizializzazione');
    }
});

// Load trackings from Supabase
async function loadTrackings() {
    try {
        if (window.supabaseTrackingService) {
            const data = await window.supabaseTrackingService.getAllTrackings();
            trackings = data || [];
            trackings = trackings.map(t => {
    if (t.metadata?.source === 'shipsgo_v2_ocean') {
        return {
            ...t,
            carrier_name: t.carrier_name || t.metadata?.mapped?.carrier_name || t.carrier || '-',
            vessel_name: t.vessel_name || t.vessel_info?.name || t.original_data?.vessel_name || '-',
            vessel_imo: t.vessel_imo || t.vessel_info?.imo || '-',
            voyage_number: t.voyage_number || t.vessel_info?.voyage || t.original_data?.voyage_number || '-',
            container_size: t.container_size || t.metadata?.raw?.shipment?.containers?.[0]?.size || '-',
            container_type: t.container_type || t.metadata?.raw?.shipment?.containers?.[0]?.type || '-',
            date_of_loading: t.date_of_loading || 
                            t.metadata?.raw?.shipment?.route?.port_of_loading?.date_of_loading || 
                            t.metadata?.raw?.shipment?.containers?.[0]?.movements?.find(m => m.event === 'LOAD')?.timestamp || 
                            '-'
        };
    }
    return t;
});
            // Map data to ensure compatibility
            trackings = trackings.map(mapTrackingData);
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
            ];
        }
        
        filteredTrackings = [...trackings];
        updateTable();
        updateStats();
        
    } catch (error) {
        console.error('Error loading trackings:', error);
        showError('Errore nel caricamento dei tracking');
    }
}

// Map tracking data for compatibility
function mapTrackingData(tracking) {
    return {
        ...tracking,
        // Ensure all required fields exist
        carrier_name: tracking.carrier_name || 
                     tracking.metadata?.mapped?.carrier_name || 
                     tracking.carrier_code || 
                     tracking.carrier || '-',
        current_status: tracking.current_status || tracking.status || 'pending',
        origin_port: tracking.origin_port || tracking.origin_name || '-',
        destination_port: tracking.destination_port || tracking.destination_name || '-',
        tracking_type: tracking.tracking_type || detectTrackingType(tracking.tracking_number),
        
        // FIX OCEAN V2 - ESTRAI DAI SOTTO-OGGETTI
        vessel_name: tracking.vessel_name || 
                    tracking.vessel_info?.name || 
                    tracking.original_data?.vessel_name || '-',
        vessel_imo: tracking.vessel_imo || 
                   tracking.vessel_info?.imo || '-',
        voyage_number: tracking.voyage_number || 
                      tracking.vessel_info?.voyage || 
                      tracking.original_data?.voyage_number || '-',
        container_size: tracking.container_size || 
                       tracking.metadata?.raw?.shipment?.containers?.[0]?.size || '-',
        container_type: tracking.container_type || 
                       tracking.metadata?.raw?.shipment?.containers?.[0]?.type || '-',
        date_of_loading: tracking.date_of_loading || 
                        tracking.metadata?.raw?.shipment?.route?.port_of_loading?.date_of_loading || '-'
    };
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
    const stats = {
        total: trackings.length,
        delivered: trackings.filter(t => t.current_status === 'delivered').length,
        inTransit: trackings.filter(t => t.current_status === 'in_transit').length,
        exception: trackings.filter(t => 
            t.current_status === 'exception' || 
            t.current_status === 'delayed'
        ).length
    };
    
    document.getElementById('totalTrackings').textContent = stats.total;
    document.getElementById('deliveredCount').textContent = stats.delivered;
    document.getElementById('inTransitCount').textContent = stats.inTransit;
    document.getElementById('exceptionCount').textContent = stats.exception;
}

// Handle selection change
function handleSelectionChange(selected) {
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

function showColumnEditor() {
    if (!window.ModalSystem) return;
    
    const currentVisible = tableManager?.options?.columns?.filter(c => !c.hidden).map(c => c.key) || DEFAULT_VISIBLE_COLUMNS;
    
    const content = `
        <div class="column-editor">
            <div class="column-editor-header">
                <p>Seleziona le colonne da visualizzare e trascinale per riordinarle</p>
                <div class="column-actions">
                    <button class="btn btn-sm btn-secondary" onclick="selectAllColumns()">
                        Seleziona Tutto
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="resetDefaultColumns()">
                        Ripristina Default
                    </button>
                </div>
            </div>
            
            <div class="column-list" id="columnEditorList">
                ${AVAILABLE_COLUMNS.map(col => `
                    <div class="column-item ${col.required ? 'required' : ''}" 
                         data-column="${col.key}"
                         draggable="${!col.required}">
                        <div class="column-drag-handle">
                            <i class="fas fa-grip-vertical"></i>
                        </div>
                        <label class="column-checkbox">
                            <input type="checkbox" 
                                   value="${col.key}" 
                                   ${currentVisible.includes(col.key) ? 'checked' : ''}
                                   ${col.required ? 'disabled' : ''}
                                   onchange="updateColumnPreview()">
                            <span class="column-label">${col.label}</span>
                            ${col.required ? '<span class="badge badge-info ml-2">Obbligatorio</span>' : ''}
                        </label>
                    </div>
                `).join('')}
            </div>
            
            <div class="column-preview mt-3">
                <small class="text-muted">
                    <span id="selectedColumnsCount">${currentVisible.length}</span> colonne selezionate
                </small>
            </div>
        </div>
    `;
    
    window.ModalSystem.show({
        title: 'Gestione Colonne',
        content: content,
        size: 'md',
        buttons: [
            {
                text: 'Annulla',
                className: 'btn-secondary',
                action: () => window.ModalSystem.hide()
            },
            {
                text: 'Applica',
                className: 'btn-primary',
                action: () => applyColumnChanges()
            }
        ]
    });
    
    // Enable drag&drop
    setTimeout(() => {
        const list = document.getElementById('columnEditorList');
        if (list && window.Sortable) {
            new Sortable(list, {
                animation: 150,
                handle: '.column-drag-handle',
                filter: '.required',
                onEnd: () => updateColumnPreview()
            });
        }
    }, 100);
}

// Funzioni helper per column editor
window.selectAllColumns = function() {
    document.querySelectorAll('#columnEditorList input[type="checkbox"]:not(:disabled)').forEach(cb => {
        cb.checked = true;
    });
    updateColumnPreview();
};

window.resetDefaultColumns = function() {
    document.querySelectorAll('#columnEditorList input[type="checkbox"]').forEach(cb => {
        cb.checked = DEFAULT_VISIBLE_COLUMNS.includes(cb.value) || cb.disabled;
    });
    updateColumnPreview();
};

window.updateColumnPreview = function() {
    const checked = document.querySelectorAll('#columnEditorList input[type="checkbox"]:checked').length;
    document.getElementById('selectedColumnsCount').textContent = checked;
};

window.applyColumnChanges = function() {
    // Ottieni l'ordine delle colonne
    const columnOrder = [];
    document.querySelectorAll('#columnEditorList .column-item').forEach(item => {
        const key = item.dataset.column;
        const checked = item.querySelector('input[type="checkbox"]').checked;
        if (checked) {
            columnOrder.push(key);
        }
    });
    
    // Ricostruisci TABLE_COLUMNS con il nuovo ordine
    const newColumns = columnOrder.map(key => {
        const availableCol = AVAILABLE_COLUMNS.find(c => c.key === key);
        const existingCol = TABLE_COLUMNS.find(c => c.key === key);
        
        if (existingCol) {
            return existingCol;
        } else {
            // Crea formatter per le nuove colonne
            return {
                key: key,
                label: availableCol.label,
                sortable: availableCol.sortable,
                formatter: getColumnFormatter(key)
            };
        }
    });
    
    // Aggiungi sempre la colonna actions alla fine
    const actionsCol = TABLE_COLUMNS.find(c => c.key === 'actions');
    if (actionsCol) {
        newColumns.push(actionsCol);
    }
    
    // Applica le modifiche
    TABLE_COLUMNS.length = 0;
    TABLE_COLUMNS.push(...newColumns);
    
    // Salva preferenze
    localStorage.setItem('trackingVisibleColumns', JSON.stringify(columnOrder));
    
    // Ricrea table manager con nuove colonne
    if (tableManager) {
        tableManager.options.columns = newColumns;
        updateTable();
    }
    
    window.ModalSystem.hide();
    window.NotificationSystem?.success('Colonne aggiornate');
};

// Aggiungi formatter per le nuove colonne
function getColumnFormatter(key) {
    switch(key) {
        case 'vessel_name':
            return (value, row) => {
                if (!value) return '-';
                const icon = row.tracking_type === 'awb' ? 'fa-plane' : 'fa-ship';
                return `<i class="fas ${icon} text-primary mr-1"></i> ${value}`;
            };
        
        case 'container_size':
            return (value) => value ? `<span class="badge badge-info">${value}</span>` : '-';
        
        case 'last_event_location':
            return (value, row) => {
                if (!value) return '-';
                return `<i class="fas fa-map-marker-alt text-danger mr-1"></i> ${value}`;
            };
        
        case 'co2_emission':
            return (value) => {
                if (!value) return '-';
                const num = parseFloat(value);
                if (isNaN(num)) return value;
                return `<span class="text-success">${num.toFixed(2)} tons</span>`;
            };
        
        case 'transit_time':
            return (value) => {
                if (!value) return '-';
                return `<span class="badge badge-secondary">${value} giorni</span>`;
            };
        
        case 'pieces':
        case 'weight':
            return (value, row) => {
                if (!value) return '-';
                const unit = key === 'weight' ? 'kg' : 'pz';
                return `${value} ${unit}`;
            };
        
        case 'date_of_loading':
        case 'date_of_departure':
        case 'date_of_arrival':
        case 'date_of_discharge':
        case 'ata':
        case 'last_event_date':
            return formatDateOnly;
        
        case 'tags':
            return (value) => {
                if (!value) return '-';
                const tags = value.split(',').map(tag => 
                    `<span class="badge badge-secondary mr-1">${tag.trim()}</span>`
                ).join('');
                return tags;
            };
        
        default:
            return (value) => value || '-';
    }
}

// Aggiungi bottone per editor colonne nell'UI
// Modifica la sezione page-actions in tracking.html per aggiungere:
/*
<button class="btn btn-secondary" onclick="showColumnEditor()">
    <i class="fas fa-columns mr-2"></i>Colonne
</button>
*/

// Carica preferenze colonne all'avvio
document.addEventListener('DOMContentLoaded', () => {
    const savedColumns = localStorage.getItem('trackingVisibleColumns');
    if (savedColumns) {
        try {
            const columnOrder = JSON.parse(savedColumns);
            // Applica l'ordine salvato
            // ... logica per riordinare TABLE_COLUMNS ...
        } catch (e) {
            console.error('Error loading column preferences:', e);
        }
    }
});

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
    console.log('Show add form - using progressive form');
    
    // Prova prima il form enhanced completo
    if (window.showEnhancedTrackingForm) {
        window.showEnhancedTrackingForm();
    } else if (window.showWorkflowProgress) {
        // Fallback al workflow
        window.showWorkflowProgress();
    } else if (window.trackingFormProgressive && window.trackingFormProgressive.show) {
        window.trackingFormProgressive.show();
    } else {
        // Ultimo fallback
        window.NotificationSystem?.info('Caricamento form...');
        setTimeout(() => {
            if (window.showEnhancedTrackingForm) {
                window.showEnhancedTrackingForm();
            } else {
                window.NotificationSystem?.error('Form tracking non disponibile');
            }
        }, 500);
    }
}

function showImportDialog() {
    console.log('Show import dialog - redirecting to progressive form import tab');
    
    // Open the progressive form and switch to import tab
    if (window.showWorkflowProgress) {
        window.showWorkflowProgress();
        
        // After a short delay, switch to import tab
        setTimeout(() => {
            const importTab = document.querySelector('[data-tab="import"]');
            if (importTab) {
                importTab.click();
            }
        }, 300);
    } else {
        // Fallback: try to open form after delay
        window.NotificationSystem?.info('Apertura import...');
        setTimeout(() => {
            if (window.showWorkflowProgress) {
                window.showWorkflowProgress();
                setTimeout(() => {
                    const importTab = document.querySelector('[data-tab="import"]');
                    if (importTab) {
                        importTab.click();
                    }
                }, 300);
            } else {
                window.NotificationSystem?.error('Import non disponibile');
            }
        }, 500);
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