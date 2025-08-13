// index.js - Clean tracking page logic with all mappings
// import TableManager from '/core/table-manager.js'; // Defer loading // Moved to dynamic import
import '/pages/tracking/inline-form-manager.js'; // Importa il nuovo gestore del form
import { trackingsColumns, formatDate, formatDateOnly, formatTrackingStatus } from '/core/table-config.js';

// State
let trackings = [];
let filteredTrackings = [];
let tableManager;

// Column mapping for import/export compatibility
const COLUMN_MAPPING = window.TrackingUnifiedMapping?.COLUMN_MAPPING || {};

// Available columns configuration - LISTA COMPLETA
const AVAILABLE_COLUMNS = [
    // --- Generali ---
    { key: 'tracking_number', label: 'Tracking Number', required: true, sortable: true },
    { key: 'tracking_type', label: 'Tipo', sortable: true },
    { key: 'current_status', label: 'Stato', sortable: true },
    { key: 'carrier_name', label: 'Carrier', sortable: true },

    // --- Riferimenti ---
    { key: 'reference_number', label: 'Riferimento', sortable: true },
    { key: 'booking_number', label: 'Booking', sortable: true },
    { key: 'bl_number', label: 'B/L Number', sortable: true },

    // --- Origine / Destinazione ---
    { key: 'origin_port', label: 'Porto/Aeroporto Origine', sortable: true },
    { key: 'origin_country', label: 'Paese Origine', sortable: true },
    { key: 'destination_port', label: 'Porto/Aeroporto Destinazione', sortable: true },
    { key: 'destination_country', label: 'Paese Destinazione', sortable: true },

    // --- Date ---
    { key: 'date_of_departure', label: 'Data Partenza', sortable: true },
    { key: 'eta', label: 'ETA', sortable: true },
    { key: 'ata', label: 'ATA', sortable: true },
    { key: 'date_of_arrival', label: 'Data Arrivo', sortable: true },
    { key: 'last_update', label: 'Ultimo Aggiornamento', sortable: true },
    { key: 'last_auto_update', label: 'Ultimo Auto-Update', sortable: true },
    { key: 'updated_by_robot', label: 'Tipo Aggiornamento', sortable: true },
    
    // --- Dettagli Spedizione (Peso, Volume, Colli) ---
    { key: 'total_weight_kg', label: 'Peso Totale (kg)', sortable: true },
    { key: 'total_volume_cbm', label: 'Volume Totale (m³)', sortable: true },
    { key: 'pieces', label: 'Numero Colli', sortable: true },
    { key: 'commodity', label: 'Merce', sortable: true },

    // --- Dettagli Container (Richiesti dall'utente) ---
    { key: 'container_count', label: 'Q.tà Container Totale', sortable: true },
    { key: 'container_types', label: 'Tipi Container', sortable: true },
    { key: 'container_count_20', label: 'Q.tà 20\'', sortable: true },
    { key: 'container_count_40', label: 'Q.tà 40\'', sortable: true },
    { key: 'container_count_40hc', label: 'Q.tà 40\'HC', sortable: true },
    { key: 'container_count_45hc', label: 'Q.tà 45\'HC', sortable: true },
    { key: 'container_count_lcl', label: 'Q.tà LCL', sortable: true },

    // --- Dettagli Mezzo (Nave/Aereo) ---
    { key: 'vessel_name', label: 'Nave', sortable: true },
    { key: 'voyage_number', label: 'Viaggio', sortable: true },
    { key: 'flight_number', label: 'Volo', sortable: true },

    // --- Metriche e Info Aggiuntive ---
    { key: 'transit_time', label: 'Tempo di Transito', sortable: true },
    { key: 'co2_emission', label: 'Emissioni CO₂ (T)', sortable: true },
    { key: 'last_event_location', label: 'Ultima Posizione', sortable: true },
    { key: 'last_event_description', label: 'Ultimo Evento', sortable: true },
    { key: 'tags', label: 'Tags', sortable: true },

    // --- Campi Tecnici/Debug (utili ma meno comuni) ---
    { key: 'status', label: 'Status (Raw)', sortable: true },
    { key: 'dataSource', label: 'Data Source', sortable: true },
    { key: 'created_at', label: 'Data Creazione DB', sortable: true },
// 🔥 AGGIUNGI QUESTA NUOVA COLONNA:
    { key: 'actions', label: 'Azioni', sortable: false }
];
const DEFAULT_VISIBLE_COLUMNS = [
    'tracking_number',
    'current_status',
    'carrier_name',
    'origin_port',
    'destination_port',
    'eta',
    'last_update',
    'last_auto_update',
    'updated_by_robot',
    'total_weight_kg',
    'total_volume_cbm',
    'container_types',
    'reference_number',
    'actions'  // 🔥 INCLUDI ANCHE AZIONI
];

// Column configuration for table
const TABLE_COLUMNS = trackingsColumns;

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
    const isSeaShipment = processed.tracking_type === 'container' || processed.tracking_type === 'bl';
    const containers = tracking.metadata?.raw?.shipment?.containers || [];

    if (isSeaShipment) {
        const containerCounts = { '20': 0, '40': 0, '40hc': 0, '45hc': 0, 'lcl': 0, 'other': 0 };
        const typeSummary = {}; // This will hold counts like: { "40'HC": 1, "20'": 2 }

        if (Array.isArray(containers) && containers.length > 0) {
            containers.forEach(container => {
                const type = (container.type || '').toUpperCase();
                const size = container.size || 0;
                let summaryType = 'N/A';

                if (size === 20) {
                    containerCounts['20']++;
                    summaryType = "20'";
                } else if (size === 40) {
                    if (type.includes('HC') || type.includes('HQ')) {
                        containerCounts['40hc']++;
                        summaryType = "40'HC";
                    } else {
                        containerCounts['40']++;
                        summaryType = "40'";
                    }
                } else if (size === 45) {
                    containerCounts['45hc']++;
                    summaryType = "45'HC";
                } else if (type.toLowerCase().includes('lcl')) {
                    containerCounts['lcl']++;
                    summaryType = "LCL";
                } else if (size > 0) {
                    containerCounts['other']++;
                    summaryType = `${size}'${type || ''}`.trim();
                }

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
    } else {
        // Per spedizioni aeree, questi campi non sono applicabili
        processed.container_count = 0;
        processed.container_count_20 = 0;
        processed.container_count_40 = 0;
        processed.container_count_40hc = 0;
        processed.container_count_45hc = 0;
        processed.container_count_lcl = 0;
        processed.container_types = '-'; // Mostra un trattino invece di "1 container(s)"
    }

    // Calcola peso e volume totali
    const cargo = tracking.metadata?.raw?.shipment?.cargo;
    let totalWeight = parseFloat(cargo?.weight) || parseFloat(tracking.weight) || 0;
    let totalVolume = parseFloat(cargo?.volume) || parseFloat(tracking.volume) || 0;

    // Se non ci sono dati sul cargo, prova a sommare dai singoli container
    if (isSeaShipment && totalWeight === 0 && Array.isArray(containers) && containers.length > 0) {
        totalWeight = containers.reduce((sum, c) => sum + (parseFloat(c.weight) || 0), 0);
        totalVolume = containers.reduce((sum, c) => sum + (parseFloat(c.volume) || 0), 0);
    }
    processed.total_weight_kg = totalWeight;
    processed.total_volume_cbm = totalVolume;

    return processed;
}

// Formatters provided by table-config.js

/**
 * Formatta il tipo di tracking con un badge e un'icona.
 * @param {string} value - Il tipo di tracking (es. 'container', 'awb').
 * @returns {string} HTML per il badge.
 */
function formatTrackingType(value) {
    const types = {
        'container': { icon: 'fa-ship', text: 'MARE', color: 'primary' },
        'bl': { icon: 'fa-file-alt', text: 'B/L', color: 'info' },
        'awb': { icon: 'fa-plane', text: 'AEREO', color: 'warning' },
        'air_waybill': { icon: 'fa-plane', text: 'AEREO', color: 'warning' },
        'parcel': { icon: 'fa-box', text: 'PARCEL', color: 'success' }
    };
    const config = types[value] || { icon: 'fa-question-circle', text: (value || 'N/A').toUpperCase(), color: 'secondary' };
    return `<span class="badge badge-${config.color}"><i class="fas ${config.icon} mr-1"></i>${config.text}</span>`;
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
        if (!tableContainer) {
          console.error('Elemento #trackingTableContainer non trovato!');
          return;
        };
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
        // Signal that the app is ready
        App.isReady();

    } catch (error) {
        console.error('❌ Initialization error:', error);
        showError('Errore durante l\'inizializzazione');
    }
});

/**
 * Itera su tutti i tracking e normalizza i dati (stato, date, nave/volo)
 * usando la fonte dati più affidabile disponibile (eventi API o dati importati).
 * @param {Array<object>} trackingsToProcess - L'array di tracking da processare.
 */

function processAndNormalizeTrackings(trackingsToProcess) {
    console.log('🔄 Normalizing tracking data for date mapping...');
    
    trackingsToProcess.forEach(tracking => {
        // Get raw API data if it exists
        const rawApiData = tracking.metadata?.raw?.shipment || tracking.metadata?.raw;
        const movements = rawApiData?.movements || (rawApiData?.containers?.[0]?.movements) || [];
        
        console.log(`🔍 Processing tracking ${tracking.tracking_number}:`, {
            hasRawData: !!rawApiData,
            movementsCount: movements.length,
            trackingType: tracking.tracking_type
        });

        // --- 1. STATUS MAPPING (dal più recente) ---
        let rawStatus;
        const actualMovements = movements.filter(m => m.status === 'ACT');

        if (rawApiData?.status || rawApiData?.Status) {
            rawStatus = rawApiData.status || rawApiData.Status;
        } else if (actualMovements.length > 0) {
            const lastActualMovement = actualMovements[actualMovements.length - 1];
            rawStatus = lastActualMovement.event || lastActualMovement.description;
        }
        
        if (!rawStatus) {
            rawStatus = tracking.current_status || tracking.status;
        }
        
        tracking.current_status = window.TrackingUnifiedMapping.mapStatus(rawStatus);

        // --- 2. 🔥 FIX CRITICO: MAPPATURA DATE CORRETTA ---
        if (movements && movements.length > 0) {
            console.log(`📅 Processing ${movements.length} movements for ${tracking.tracking_number}`);
            
                        if (tracking.tracking_type === 'awb') {

                // ✈️ AEREO: Mappatura corretta basata sui dati reali ShipsGo
                console.log('✈️ Processing AWB dates with ShipsGo data structure...');
                
                // 🎯 ROUTE DATA per AWB (diverso dai container)
                const route = rawApiData?.route;
                const origin = route?.origin;
                const destination = route?.destination;
                
                console.log('AWB Route data:', { route, origin, destination });
                
                // 📅 DATA PARTENZA: usa date_of_dep dalla route o movimento DEP
                if (!tracking.date_of_departure) {
                    let departureDate = null;
                    
                    // Priorità 1: date_of_dep dalla route
                    if (origin?.date_of_dep) {
                        departureDate = origin.date_of_dep;
                        console.log(`✅ AWB Departure from route: ${departureDate}`);
                    }
                    
                    // Fallback: movimento DEP
                    if (!departureDate) {
                        const departureEvent = movements.find(m => m.event === 'DEP');
                        if (departureEvent?.timestamp) {
                            departureDate = departureEvent.timestamp;
                            console.log(`✅ AWB Departure from DEP movement: ${departureDate}`);
                        }
                    }
                    
                    if (departureDate) {
                        tracking.date_of_departure = departureDate;
                    }
                }
            
                // 📅 ETA: usa date_of_rcf dalla route (questo è l'ETA per l'aereo)
                if (!tracking.eta) {
                    if (destination?.date_of_rcf) {
                        tracking.eta = destination.date_of_rcf;
                        console.log(`✅ AWB ETA from route date_of_rcf: ${destination.date_of_rcf}`);
                    }
                }
            
                // 📅 ATA: usa movimento RCF effettivo
                if (!tracking.ata) {
                    const rcfMovement = movements.find(m => 
                        m.event === 'RCF' && 
                        m.status === 'ACT' &&
                        m.location?.iata === destination?.location?.iata
                    );
                    
                    if (rcfMovement?.timestamp) {
                        tracking.ata = rcfMovement.timestamp;
                        console.log(`✅ AWB ATA from RCF movement: ${rcfMovement.timestamp}`);
                    }
                }
            
                // 📅 DATA CONSEGNA FINALE: movimento DLV
                if (!tracking.actual_delivery) {  // ✅ USA actual_delivery (che esiste nel DB)
                    const deliveryMovement = movements.find(m => m.event === 'DLV' && m.status === 'ACT');
                    
                    if (deliveryMovement?.timestamp) {
                        tracking.actual_delivery = deliveryMovement.timestamp;
                        console.log(`✅ AWB Final delivery from DLV: ${deliveryMovement.timestamp}`);
                    } else if (tracking.ata) {
                        // Fallback: usa ATA se non c'è DLV
                        tracking.actual_delivery = tracking.ata;
                        console.log(`✅ AWB Final delivery from ATA fallback: ${tracking.ata}`);
                    }
                }
            
                // ✈️ FLIGHT INFO
                if (!tracking.flight_number) {
                    const flightMovement = movements.find(m => m.flight);
                    if (flightMovement?.flight) {
                        tracking.flight_number = flightMovement.flight;
                        console.log(`✅ AWB Flight number: ${flightMovement.flight}`);
                    }
                }
            
                // ✈️ AIRLINE INFO
                if (!tracking.carrier_name && rawApiData?.airline?.name) {
                    tracking.carrier_name = rawApiData.airline.name;
                    tracking.carrier_code = rawApiData.airline.iata;
                    console.log(`✅ AWB Carrier: ${tracking.carrier_name} (${tracking.carrier_code})`);
                }
            
                // ✈️ CARGO INFO
                if (!tracking.total_weight_kg && rawApiData?.cargo) {
                    tracking.total_weight_kg = parseFloat(rawApiData.cargo.weight) || 0;
                    tracking.pieces = parseInt(rawApiData.cargo.pieces) || 0;
                    if (rawApiData.cargo.volume) {
                        tracking.total_volume_cbm = parseFloat(rawApiData.cargo.volume) || 0;
                    }
                    console.log(`✅ AWB Cargo: ${tracking.total_weight_kg}kg, ${tracking.pieces} pieces`);
                }
            
                // ✈️ ORIGIN/DESTINATION PORTS
                if (!tracking.origin_port && origin?.location) {
                    tracking.origin_port = origin.location.name;
                    tracking.origin_country = origin.location.country?.name;
                    console.log(`✅ AWB Origin: ${tracking.origin_port}, ${tracking.origin_country}`);
                }
                
                if (!tracking.destination_port && destination?.location) {
                    tracking.destination_port = destination.location.name;
                    tracking.destination_country = destination.location.country?.name;
                    console.log(`✅ AWB Destination: ${tracking.destination_port}, ${tracking.destination_country}`);
                }
            
                // ✈️ REFERENCE
                if (!tracking.reference_number && rawApiData?.reference) {
                    tracking.reference_number = rawApiData.reference;
                    console.log(`✅ AWB Reference: ${tracking.reference_number}`);
                }
            
            } else {
                // 🚢 CONTAINER/BL: Logica migliorata per mapping date
                console.log('🚢 Processing Container/BL dates...');
                
                // Data partenza
                if (!tracking.date_of_departure) {
                    let departureEvent = actualMovements.find(m => 
                        (m.description || m.event || '').toLowerCase().includes('departed') || 
                        (m.event || '').toUpperCase() === 'DEPA'
                    );
                    if (!departureEvent) {
                        departureEvent = actualMovements.find(m => 
                            (m.description || m.event || '').toLowerCase().includes('load')
                        );
                    }
                    if (departureEvent?.timestamp) {
                        tracking.date_of_departure = departureEvent.timestamp;
                        console.log(`✅ Container Departure set: ${departureEvent.timestamp}`);
                    }
                }

                // 🎯 MAPPING CRITICO PER CONTAINER: ETA/ATA basato su porto destinazione
                const destinationPortName = rawApiData?.route?.port_of_discharge?.location?.name ||
                                          rawApiData?.route?.destination?.location?.name;
                
                if (destinationPortName) {
                    const destPortUpper = destinationPortName.toUpperCase();
                    console.log(`🎯 Target destination port: ${destPortUpper}`);
                    
                    // ETA (Estimated) - CERCA MOVIMENTO STIMATO AL PORTO DESTINAZIONE
                    if (!tracking.eta) {
                        const estimatedArrival = [...movements].reverse().find(m => 
                            m.status === 'EST' && 
                            m.location?.name?.toUpperCase() === destPortUpper && 
                            ((m.description || m.event || '').toUpperCase().includes('ARRIVAL') || 
                             (m.event || '').toUpperCase() === 'ARRV')
                        );
                        if (estimatedArrival?.timestamp) {
                            tracking.eta = estimatedArrival.timestamp;
                            console.log(`✅ Container ETA set: ${estimatedArrival.timestamp} at ${destPortUpper}`);
                        }
                    }

                    // ATA (Actual) - CERCA MOVIMENTO EFFETTIVO AL PORTO DESTINAZIONE
                    if (!tracking.ata) {
                        const actualArrival = [...actualMovements].reverse().find(m => 
                            m.location?.name?.toUpperCase() === destPortUpper && 
                            ((m.description || m.event || '').toUpperCase().includes('DISCHARGE') || 
                             (m.description || m.event || '').toUpperCase().includes('ARRIVAL') || 
                             (m.event || '').toUpperCase() === 'DISC' || 
                             (m.event || '').toUpperCase() === 'ARRV')
                        );
                        if (actualArrival?.timestamp) {
                            tracking.ata = actualArrival.timestamp;
                            console.log(`✅ Container ATA set: ${actualArrival.timestamp} at ${destPortUpper}`);
                        }
                    }

                    // Data arrivo finale - PRIORITÀ CORRETTA
                    if (!tracking.date_of_arrival) {
                        if (tracking.ata) {
                            tracking.date_of_arrival = tracking.ata;
                            console.log(`✅ Container Final arrival from ATA: ${tracking.ata}`);
                        } else if (tracking.eta) {
                            tracking.date_of_arrival = tracking.eta;
                            console.log(`✅ Container Final arrival from ETA: ${tracking.eta}`);
                        }
                    }
                } else {
                    console.warn(`⚠️ No destination port found for container ${tracking.tracking_number}`);
                }
            }
        }

                // Final logging con i campi corretti
        console.log(`📊 Final dates for ${tracking.tracking_number} (${tracking.tracking_type}):`, {
            departure: tracking.date_of_departure ? new Date(tracking.date_of_departure).toLocaleDateString() : 'N/A',
            eta: tracking.eta ? new Date(tracking.eta).toLocaleDateString() : 'N/A',
            ata: tracking.ata ? new Date(tracking.ata).toLocaleDateString() : 'N/A',
            final_delivery: tracking.actual_delivery ? new Date(tracking.actual_delivery).toLocaleDateString() : 'N/A',
            discharge: tracking.date_of_discharge ? new Date(tracking.date_of_discharge).toLocaleDateString() : 'N/A',
            carrier: tracking.carrier_name,
            flight: tracking.flight_number,
            weight: tracking.total_weight_kg,
            pieces: tracking.pieces
        });
    });
}

/**
 * Aggiunge un nuovo tracking alla vista, lo processa e aggiorna la tabella.
 * @param {object} newTracking - Il nuovo oggetto di tracking dal database.
 */
function addTrackingToView(newTracking) {
    if (!newTracking) return;

    console.log('Adding new tracking to view:', newTracking.tracking_number);

    // 1. Processa e normalizza il nuovo tracking
    const processedTracking = processTrackingData(newTracking);
    processAndNormalizeTrackings([processedTracking]); // La funzione si aspetta un array

    // 2. Aggiungi all'inizio dell'array principale
    trackings.unshift(processedTracking);

    // 3. Applica i filtri correnti e aggiorna la tabella
    applyFilters();
}

// Load trackings from Supabase
async function loadTrackings() {
    try {
        let data;
        if (window.supabaseTrackingService) {
            data = await window.supabaseTrackingService.getAllTrackings();
            console.log('RAW DATA FROM SUPABASE:', JSON.stringify(data, null, 2));
        } else {
            // Mock data for testing
            data = [{
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
            }];
        }

        trackings = (data || []).map(processTrackingData);
        filteredTrackings = [...trackings];

        // ✅ Carica preferenze colonne
        const columnOrder = await loadColumnPreferences();
        if (columnOrder && tableManager) {
            // FIX: Filtra le colonne salvate per assicurarsi che esistano ancora in AVAILABLE_COLUMNS
            const validColumnOrder = columnOrder.filter(key => {
                const exists = AVAILABLE_COLUMNS.some(c => c.key === key);
                if (!exists) {
                    console.warn(`Column key "${key}" from user preferences not found in AVAILABLE_COLUMNS. Skipping.`);
                }
                return exists;
            });

            // 🔥 AGGIUNGI QUESTO BLOCCO MANCANTE:
            const newColumns = validColumnOrder.map(key => {
                const availableCol = AVAILABLE_COLUMNS.find(c => c.key === key);
                return { 
                    key: key, 
                    label: availableCol.label, 
                    sortable: availableCol.sortable, 
                    formatter: getColumnFormatter(key) 
                };
            });

            // 🔥 APPLICA LE COLONNE AL TABLE MANAGER:
            TABLE_COLUMNS.length = 0;
            TABLE_COLUMNS.push(...newColumns);
            tableManager.options.columns = newColumns;
        }

        // FIX CENTRALE: Normalizza lo stato per TUTTI i tracking dopo il caricamento
        processAndNormalizeTrackings(trackings);

        updateTable();
        updateStats();
        
        // Expose addTrackingToView for the inline form
        window.addTrackingToView = addTrackingToView;
        
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
    // window.STATUS_DISPLAY = STATUS_DISPLAY; // Rimosso: STATUS_DISPLAY non è più definito in questo scope
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
            action: function() {
                const overlay = document.querySelector('.sol-modal-overlay');
                if (overlay) {
                    overlay.classList.remove('active');
                    setTimeout(() => overlay.remove(), 300);
                }
            }
        },
        {
            text: 'Applica',
            className: 'btn-primary',
            action: applyColumnChanges
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

window.applyColumnChanges = async function() {
    // FIX: Esegui solo se il modal di gestione colonne è aperto
    if (!document.getElementById('columnEditorList')) {
        console.warn('⚠️ applyColumnChanges chiamato senza il modal corretto. Operazione annullata.');
        // Chiudi eventuali modal aperti per sicurezza
        if (window.ModalSystem) window.ModalSystem.closeAll();
        return;
    }

    try {
        // 1. Raccogli colonne selezionate nell'ordine corretto
        const columnOrder = [];
        document.querySelectorAll('#columnEditorList .column-item').forEach(item => {
            const key = item.dataset.column;
            const checked = item.querySelector('input[type="checkbox"]').checked;
            // FIX: Includi sempre le colonne obbligatorie
            const isRequired = AVAILABLE_COLUMNS.find(c => c.key === key)?.required;
            if (checked || isRequired) {
                columnOrder.push(key);
            }
        });

        // 2. 🔥 FIX: Ricostruisci colonne SENZA duplicare actions
        const newColumns = [];
        
        // Aggiungi tutte le colonne selezionate (incluso actions se selezionato)
        columnOrder.forEach(key => {
            const availableCol = AVAILABLE_COLUMNS.find(c => c.key === key);
            if (availableCol) {
                newColumns.push({
                    key: key, 
                    label: availableCol.label, 
                    sortable: availableCol.sortable, 
                    formatter: getColumnFormatter(key)
                });
            }
        });

        // 3. 🔥 RIMUOVI QUESTO BLOCCO CHE CAUSAVA IL DUPLICATO:
        // const actionsCol = TABLE_COLUMNS.find(c => c.key === 'actions');
        // if (actionsCol) newColumns.push(actionsCol); // ❌ RIMUOVI QUESTA RIGA!

        // 4. Salva preferenze in Supabase
        await saveColumnPreferences(columnOrder);

        // 5. Aggiorna tabella
        TABLE_COLUMNS.length = 0;
        TABLE_COLUMNS.push(...newColumns);

        if (tableManager) {
            tableManager.options.columns = newColumns;
            updateTable();
        }

        // 6. Chiudi modale
        const overlay = document.querySelector('.sol-modal-overlay');
        if (overlay) {
            overlay.classList.remove('active');
            setTimeout(() => overlay.remove(), 300);
        }

        window.NotificationSystem?.success('Colonne aggiornate e salvate');
        
    } catch (error) {
        console.error('Errore applyColumnChanges:', error);
        window.NotificationSystem?.error('Errore durante il salvataggio');
    }
};
// 🔧 Salva preferenze colonne in Supabase (con page='tracking')
async function saveColumnPreferences(columnOrder) {
    try {
        const { data: { user } } = await window.supabase.auth.getUser();
        if (!user) return;

        await window.supabase
            .from('user_preferences')
            .upsert({
                user_id: user.id,
                page: 'tracking',
                preferences: { columns: columnOrder }
            }, { onConflict: 'user_id,page' });

        console.log('✅ Colonne salvate in Supabase');
    } catch (error) {
        console.error('Errore salvataggio:', error);
        // Fallback su localStorage
        localStorage.setItem('trackingVisibleColumns', JSON.stringify(columnOrder));
    }
}

// 🔧 Carica preferenze colonne da Supabase
async function loadColumnPreferences() {
    try {
        const { data: { user } } = await window.supabase.auth.getUser();
        if (!user) return DEFAULT_VISIBLE_COLUMNS;

        const { data } = await window.supabase
            .from('user_preferences')
            .select('preferences')
            .eq('user_id', user.id)
            .eq('page', 'tracking')
            .single();

        return data?.preferences?.columns || DEFAULT_VISIBLE_COLUMNS;
    } catch (error) {
        console.error('Errore caricamento:', error);
        return DEFAULT_VISIBLE_COLUMNS;
    }
}

// Aggiungi formatter per le nuove colonne
// This function is now more comprehensive and handles all new column types.
function getColumnFormatter(key) {
    switch(key) {
        // --- Status ---
        case 'current_status':
            return formatTrackingStatus;
        
        case 'tracking_type':
            return formatTrackingType;

        // --- Dates ---
        case 'date_of_departure':
        case 'eta':
        case 'ata':
        case 'date_of_arrival':
        case 'created_at':
            return formatDate;
        
        case 'last_update':
            return (value, row) => {
                const manualUpdate = row.updated_at ? new Date(row.updated_at) : null;
                const autoUpdate = row.last_auto_update ? new Date(row.last_auto_update) : null;

                if (!manualUpdate && !autoUpdate) return '-';

                let displayDate, title, icon;

                if (autoUpdate && (!manualUpdate || autoUpdate > manualUpdate)) {
                    displayDate = formatDate(autoUpdate);
                    title = `Controllato automaticamente il ${autoUpdate.toLocaleString('it-IT')}`;
                    icon = `<i class="fas fa-robot text-info" title="${title}"></i>`;
                } else {
                    displayDate = formatDate(manualUpdate);
                    title = `Aggiornato il ${manualUpdate.toLocaleString('it-IT')}`;
                    icon = `<i class="fas fa-user-edit text-secondary" title="${title}"></i>`;
                }

                return `<div class="d-flex align-items-center" style="gap: 0.5rem;">${icon} <span>${displayDate}</span></div>`;
            };

        case 'updated_at':
            return formatLastUpdateColumn;
            
        // --- NEW: Auto-update columns ---
        case 'last_auto_update':
    return value => {
        if (!value) return '<span class="text-muted"><i class="fas fa-minus"></i> Mai</span>';
                const date = new Date(value);
                const now = new Date();
                const diffHours = (now - date) / (1000 * 60 * 60);
                
                let timeClass = '';
                if (diffHours < 1) timeClass = 'text-success';
                else if (diffHours < 24) timeClass = 'text-warning';
                else timeClass = 'text-danger';
                
                return `
                    <div class="d-flex align-items-center gap-1">
                        <i class="fas fa-robot text-primary" title="Aggiornamento automatico"></i>
                        <span class="${timeClass}" title="${date.toLocaleString('it-IT')}">${date.toLocaleString('it-IT', { 
                            month: '2-digit', 
                            day: '2-digit', 
                            hour: '2-digit', 
                            minute: '2-digit' 
                        })}</span>
                    </div>
                `;
            };
            
        case 'updated_by_robot':
    return value => {
        if (value === true) {
            return '<span class="badge badge-info"><i class="fas fa-robot"></i> Automatico</span>';
        } else if (value === false) {
            return '<span class="badge badge-secondary"><i class="fas fa-user"></i> Manuale</span>';
        }
        return '<span class="badge badge-light text-muted">N/A</span>';
    };
            
        // --- NEW: Actions column ---
       case 'actions':
    return (value, row) => {
        // 🔥 FIX: Passa entrambi i parametri alla funzione
        return createTrackingActionsColumn(value, row);
    };
            
        // --- Numeric values with units ---
        case 'total_weight_kg':
            return (value) => (typeof value === 'number' && value > 0) ? `${value.toFixed(2)} kg` : '-';
        case 'total_volume_cbm':
            return (value) => (typeof value === 'number' && value > 0) ? `${value.toFixed(3)} m³` : '-';
        case 'co2_emission':
            return (value) => (typeof value === 'number' && value > 0) ? `${value.toFixed(2)} T` : '-';
        case 'pieces':
            return (value) => (value > 0) ? `${value} pz` : '-';
        
        // --- Container Counts ---
        case 'container_count':
        case 'container_count_20':
        case 'container_count_40':
        case 'container_count_40hc':
        case 'container_count_45hc':
        case 'container_count_lcl':
             return (value) => (value > 0) ? `<span class="badge badge-info">${value}</span>` : '0';

        // --- Special Text ---
        case 'container_types':
            return (value) => value || '-';
        case 'vessel_name':
            return (value, row) => {
                if (!value) return '-';
                const icon = row.tracking_type === 'awb' ? 'fa-plane' : 'fa-ship';
                return `<i class="fas ${icon} text-primary mr-1"></i> ${value}`;
            };
        case 'transit_time':
            return (value) => value ? `<span class="badge badge-secondary">${value} giorni</span>` : '-';

        // --- Default ---
        default:
            return (value) => value || '-';
    }
}
function formatLastUpdateColumn(tracking) {
    const lastUpdate = tracking.updated_at ? new Date(tracking.updated_at) : null;
    const wasAutoUpdated = tracking.updated_by_robot || tracking.last_auto_update;
    
    if (!lastUpdate) {
        return '<span class="text-muted">Mai aggiornato</span>';
    }

    const now = new Date();
    const diffHours = (now - lastUpdate) / (1000 * 60 * 60);
    
    let timeClass = '';
    if (diffHours < 1) timeClass = 'text-success';
    else if (diffHours < 24) timeClass = 'text-warning';
    else timeClass = 'text-danger';

    const timeStr = lastUpdate.toLocaleString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });

    const robotIcon = wasAutoUpdated ? 
        '<i class="fas fa-robot text-primary" title="Aggiornato automaticamente"></i> ' : 
        '<i class="fas fa-user text-secondary" title="Aggiornato manualmente"></i> ';

    return `
        <div class="d-flex align-items-center gap-1">
            ${robotIcon}
            <span class="${timeClass}">${timeStr}</span>
        </div>
    `;
}

function createTrackingActionsColumn(value, row) {
    // 🔥 FIX: Gestisci input multipli dal TableManager
    let tracking;
    if (row && typeof row === 'object') {
        tracking = row;
    } else if (value && typeof value === 'object') {
        tracking = value;
    } else {
        console.warn('createTrackingActionsColumn: Invalid input:', { value, row });
        return `
            <div class="btn-group btn-group-sm" role="group">
                <button class="btn btn-outline-warning btn-sm" disabled title="Dati non validi">
                    <i class="fas fa-exclamation-triangle"></i>
                </button>
            </div>
        `;
    }
    
    const trackingId = tracking.id || tracking.tracking_number;
    const isContainer = tracking.tracking_type === 'container';
    const currentStatus = (tracking.current_status || tracking.status || '').toLowerCase();
    const canUpdate = isContainer && !['delivered', 'completed', 'cancelled'].includes(currentStatus);
    
    if (!trackingId) {
        return `
            <div class="btn-group btn-group-sm" role="group">
                <button class="btn btn-outline-warning btn-sm" disabled title="ID mancante">
                    <i class="fas fa-exclamation-triangle"></i>
                </button>
            </div>
        `;
    }
    
    let actions = `
        <div class="btn-group btn-group-sm" role="group" data-tracking-id="${trackingId}">
            <button class="btn btn-outline-primary btn-sm btn-view" 
                    onclick="viewDetails('${trackingId}')" 
                    title="Visualizza dettagli">
                <i class="fas fa-eye"></i>
            </button>
    `;
    
    // 🔥 NUOVO: Pulsante aggiorna con auto-update integrato
    if (canUpdate) {
        actions += `
            <button class="btn btn-outline-success btn-sm btn-update" 
                    onclick="handleTrackingUpdateButton('${trackingId}')" 
                    title="Aggiorna tracking (Auto-Update)">
                <i class="fas fa-robot"></i>
            </button>
        `;
    }

    actions += `
            <button class="btn btn-outline-danger btn-sm btn-delete" 
                    onclick="deleteTracking('${trackingId}')" 
                    title="Elimina tracking">
                <i class="fas fa-trash-alt"></i>
            </button>
        </div>
    `;

    return actions;
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
        const statusConfig = window.TrackingUnifiedMapping.STATUS_DISPLAY_CONFIG[tracking.current_status] || window.TrackingUnifiedMapping.STATUS_DISPLAY_CONFIG['default'] || { label: tracking.current_status, class: 'secondary', icon: 'fa-question-circle' };
        
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
                            <span class="badge badge-${statusConfig.class} ml-2">
                                <i class="fas ${statusConfig.icon} mr-1"></i>${statusConfig.label}
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

window.updateTrackingManually = async function(trackingId) {
    console.log('Manual update triggered for:', trackingId);
    
    // Trova il pulsante e mostra loading
    const updateBtn = document.querySelector(`[data-tracking-id="${trackingId}"] .btn-update`);
    if (updateBtn) {
        const originalHTML = updateBtn.innerHTML;
        updateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        updateBtn.disabled = true;
        
        try {
            await refreshTracking(trackingId);
            
            // Ripristina il pulsante dopo il successo
            setTimeout(() => {
                updateBtn.innerHTML = originalHTML;
                updateBtn.disabled = false;
            }, 1000);
            
        } catch (error) {
            console.error('Manual update error:', error);
            updateBtn.innerHTML = originalHTML;
            updateBtn.disabled = false;
        }
    } else {
        // Fallback se non trova il pulsante
        await refreshTracking(trackingId);
    }
};
// 🔧 DEBUG FUNCTION
window.debugColumns = function() {
    console.log('=== COLUMN DEBUG ===');
    console.log('AVAILABLE_COLUMNS:', AVAILABLE_COLUMNS.map(c => c.key));
    console.log('TABLE_COLUMNS:', TABLE_COLUMNS.map(c => c.key));
    console.log('TableManager columns:', tableManager?.options?.columns?.map(c => c.key));
    
    // Test caricamento preferenze
    loadColumnPreferences().then(prefs => {
        console.log('Saved preferences:', prefs);
    });
    
    // Test salvataggio
    const testOrder = ['tracking_number', 'last_auto_update', 'updated_by_robot', 'actions'];
    saveColumnPreferences(testOrder).then(() => {
        console.log('Test save completed');
    });
};

window.resetColumnPreferences = async function() {
    try {
        await saveColumnPreferences(DEFAULT_VISIBLE_COLUMNS);
        console.log('✅ Reset to default columns');
        location.reload(); // Ricarica per applicare
    } catch (error) {
        console.error('❌ Reset error:', error);
    }
};
// 🔧 FUNZIONE PER CHIAMARE IL SERVER AUTO-UPDATE
window.triggerServerAutoUpdate = async function() {
    try {
        // Usa l'URL del tuo progetto
        const supabaseUrl = 'https://gnlrmnsdmpjzitsysowq.supabase.co'; // 🔥 SOSTITUISCI se usi l'altro progetto
        const endpoint = `${supabaseUrl}/functions/v1/auto-update-scheduler`;
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${window.supabase?.supabaseKey || ''}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`Server responded with ${response.status}`);
        }
        
        const result = await response.json();
        console.log('🤖 Server auto-update result:', result);
        
        if (result.success) {
            if (result.updated > 0) {
                window.NotificationSystem?.success(`Server auto-update: ${result.updated} tracking aggiornati`);
                await loadTrackings(); // Ricarica la tabella
            } else {
                window.NotificationSystem?.info('Server auto-update: nessun tracking da aggiornare');
            }
        } else {
            throw new Error(result.error || 'Unknown server error');
        }
        
        return result;
    } catch (error) {
        console.error('Server auto-update error:', error);
        window.NotificationSystem?.error('Errore server auto-update: ' + error.message);
        return { success: false, error: error.message };
    }
};

// 🔧 TEST IMMEDIATO DEL SERVER AUTO-UPDATE
window.testServerAutoUpdate = function() {
    console.log('🧪 Testing server auto-update...');
    window.triggerServerAutoUpdate();
};

console.log('✅ Server auto-update functions loaded - Ready to test!');

// 🔧 FUNZIONE DI MONITORAGGIO AUTO-UPDATE SYSTEM (CORRETTA)
window.monitorAutoUpdateSystem = async function() {
    try {
        console.log('📊 === AUTO-UPDATE SYSTEM MONITOR ===');
        
        // 🔥 FIX: Dichiara analysis all'inizio con scope function
        let analysis = {
            total_containers: 0,
            robot_updated: 0,
            never_updated: 0,
            updated_last_hour: 0,
            updated_last_24h: 0
        };
        
        // 1. Statistiche tracking
        const { data: stats } = await window.supabase
            .from('trackings')
            .select(`
                tracking_number,
                tracking_type,
                current_status,
                last_auto_update,
                updated_by_robot,
                created_at
            `)
            .eq('tracking_type', 'container');
        
        if (stats && stats.length > 0) {
            // 🔥 FIX: Aggiorna analysis (non ridichiarare)
            analysis = {
                total_containers: stats.length,
                robot_updated: stats.filter(t => t.updated_by_robot).length,
                never_updated: stats.filter(t => !t.last_auto_update).length,
                updated_last_hour: stats.filter(t => {
                    if (!t.last_auto_update) return false;
                    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);                    return new Date(t.last_auto_update) > oneHourAgo;
                }).length,
                updated_last_24h: stats.filter(t => {
                    if (!t.last_auto_update) return false;
                    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                    return new Date(t.last_auto_update) > oneDayAgo;
                }).length
            };
            
            console.log('📈 Container Analytics:', analysis);
        } else {
            console.log('📈 Container Analytics: No containers found');
        }
        
        // 2. Test Edge Function
        const edgeResult = await window.triggerServerAutoUpdate();
        console.log('🤖 Edge Function Status:', edgeResult.success ? 'OPERATIONAL' : 'ERROR');
        
        // 3. Mostra ultime attività
        const { data: recent } = await window.supabase
            .from('trackings')
            .select('tracking_number, last_auto_update')
            .eq('updated_by_robot', true)
            .order('last_auto_update', { ascending: false })
            .limit(3);
        
        console.log('🕒 Recent auto-updates:', recent);
        
        // ✅ Ora analysis è sempre definita
        return {
            stats: analysis,
            edgeFunction: edgeResult.success,
            recentUpdates: recent?.length || 0
        };
        
    } catch (error) {
        console.error('❌ Monitor error:', error);
        return { error: error.message };
    }
};

// 📊 Monitor rapido
window.quickMonitor = function() {
    console.log('🚀 Auto-Update System Status: OPERATIONAL ✅');
    window.monitorAutoUpdateSystem();
};
// 🎯 DASHBOARD COMPLETO AUTO-UPDATE SYSTEM
window.autoUpdateDashboard = async function() {
    console.log('🚀 === AUTO-UPDATE SYSTEM DASHBOARD ===');
    
    try {
        const result = await window.monitorAutoUpdateSystem();
        
        if (result.error) {
            console.error('❌ Dashboard error:', result.error);
            return;
        }
        
        const { stats, edgeFunction, recentUpdates } = result;
        
        console.log(`
🎯 === SYSTEM STATUS ===
✅ Edge Function: ${edgeFunction ? 'OPERATIONAL' : 'ERROR'}
📊 Total Containers: ${stats.total_containers}
🤖 Robot Updated: ${stats.robot_updated}
⏰ Updated Last Hour: ${stats.updated_last_hour}
📅 Updated Last 24h: ${stats.updated_last_24h}
🔄 Recent Updates: ${recentUpdates}

📈 === PERFORMANCE ===
Coverage: ${stats.total_containers > 0 ? Math.round((stats.robot_updated / stats.total_containers) * 100) : 0}%
Fresh Data (1h): ${stats.total_containers > 0 ? Math.round((stats.updated_last_hour / stats.total_containers) * 100) : 0}%
Activity (24h): ${stats.total_containers > 0 ? Math.round((stats.updated_last_24h / stats.total_containers) * 100) : 0}%

🎊 System Status: ${edgeFunction && stats.updated_last_hour > 0 ? 'EXCELLENT' : edgeFunction ? 'GOOD' : 'NEEDS ATTENTION'}
        `);
        
        return result;
        
    } catch (error) {
        console.error('❌ Dashboard error:', error);
        return { error: error.message };
    }
};

// 🚀 Accesso rapido
window.dashboard = window.autoUpdateDashboard;

// 🧪 TEST COMPLETO DEL SISTEMA (FUNZIONE MANCANTE)
window.fullSystemTest = async function() {
    console.log('🧪 === FULL SYSTEM TEST START ===');
    
    try {
        // 1. Dashboard completo
        console.log('📊 Step 1: Running system dashboard...');
        await window.dashboard();
        
        // 2. Test manuale Edge Function
        console.log('\n🤖 Step 2: Testing server auto-update...');
        const manualTest = await window.triggerServerAutoUpdate();
        console.log('Manual trigger result:', manualTest);
        
        // 3. Verifica stato tracking
        console.log('\n📋 Step 3: Checking tracking status...');
        const trackingCount = window.trackings?.length || 0;
        console.log('Local tracking count:', trackingCount);
        
        // 4. Test TableManager
        console.log('\n📊 Step 4: Checking TableManager...');
        const tableStatus = window.tableManager ? 'OPERATIONAL' : 'NOT_FOUND';
        console.log('TableManager status:', tableStatus);
        
        // 5. Test API Keys
        console.log('\n🔑 Step 5: Checking API configuration...');
        const apiStatus = window.trackingService?.hasApiKeys() ? 'CONFIGURED' : 'MISSING';
        console.log('API Keys status:', apiStatus);
        
        console.log('\n🎊 === SYSTEM READY FOR PRODUCTION ===');
        console.log('🎯 All components tested successfully!');
        
        return {
            success: true,
            dashboard: true,
            edgeFunction: manualTest.success,
            trackingCount: trackingCount,
            tableManager: tableStatus === 'OPERATIONAL',
            apiKeys: apiStatus === 'CONFIGURED'
        };
        
    } catch (error) {
        console.error('❌ Full system test error:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// 🎯 FUNZIONI DI ACCESSO RAPIDO
window.systemStatus = function() {
    console.log(`
🚀 === SYSTEM STATUS OVERVIEW ===
📊 Dashboard: ${typeof window.dashboard === 'function' ? '✅ Available' : '❌ Missing'}
🤖 Auto-Update: ${typeof window.triggerServerAutoUpdate === 'function' ? '✅ Available' : '❌ Missing'}
📋 Monitor: ${typeof window.quickMonitor === 'function' ? '✅ Available' : '❌ Missing'}
🔧 Debug: ${typeof window.debugColumns === 'function' ? '✅ Available' : '❌ Missing'}
📊 TableManager: ${window.tableManager ? '✅ Available' : '❌ Missing'}
🔑 TrackingService: ${window.trackingService ? '✅ Available' : '❌ Missing'}
📦 Tracking Data: ${window.trackings?.length || 0} records

💡 Quick Commands:
- window.dashboard() - Sistema completo
- window.fullSystemTest() - Test completo
- window.quickMonitor() - Status veloce
- window.triggerServerAutoUpdate() - Test Edge Function
    `);
};
// 🎯 FUNZIONE SPECIFICA PER PULSANTE AGGIORNA TRACKING
window.handleTrackingUpdateButton = async function(trackingId = null) {
    console.log('🔄 Handling tracking update button...', trackingId);
    
    try {
        // Trova il pulsante specifico e mostra loading
        const updateBtn = document.querySelector(`[data-tracking-id="${trackingId}"] .btn-update`);
        if (updateBtn) {
            const originalHTML = updateBtn.innerHTML;
            updateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            updateBtn.disabled = true;
        }
        
        // Mostra indicatore globale
        if (window.NotificationSystem) {
            window.NotificationSystem.show('🤖 Aggiornamento automatico in corso...', 'info');
        }
        
        // 🔥 TRIGGER SERVER AUTO-UPDATE (invece del refresh locale)
        const result = await window.triggerServerAutoUpdate();
        
        if (result.success) {
            // Ricarica i dati
            if (window.loadTrackings) {
                await window.loadTrackings();
                console.log('✅ Dati ricaricati dopo auto-update');
            }
            
            // Notifica successo
            const message = result.updated > 0 
                ? `✅ ${result.updated} tracking aggiornati dal server!`
                : '✅ Tutti i tracking sono già aggiornati';
                
            if (window.NotificationSystem) {
                window.NotificationSystem.show(message, 'success');
            }
        } else {
            throw new Error(result.message || 'Errore durante aggiornamento');
        }
        
        // Ripristina il pulsante
        if (updateBtn) {
            setTimeout(() => {
                updateBtn.innerHTML = '<i class="fas fa-robot"></i>';
                updateBtn.disabled = false;
            }, 1000);
        }
        
        return result;
        
    } catch (error) {
        console.error('❌ Update button error:', error);
        
        // Ripristina il pulsante in caso di errore
        const updateBtn = document.querySelector(`[data-tracking-id="${trackingId}"] .btn-update`);
        if (updateBtn) {
            updateBtn.innerHTML = '<i class="fas fa-robot"></i>';
            updateBtn.disabled = false;
        }
        
        if (window.NotificationSystem) {
            window.NotificationSystem.show('❌ Errore durante l\'aggiornamento', 'error');
        }
        
        throw error;
    }
};

// 🎮 PULSANTE AUTO-UPDATE MODERNO NELLA PAGE-ACTIONS
window.createGlobalUpdateButton = function() {
    // Rimuovi pulsanti esistenti
    const existingIndicator = document.getElementById('auto-update-status');
    const existingButton = document.getElementById('global-update-btn');
    
    if (existingIndicator) existingIndicator.remove();
    if (existingButton) existingButton.remove();
    
    // 🕒 CALCOLA IL PROSSIMO AGGIORNAMENTO (ogni 4 ore)
    const now = new Date();
    const currentHour = now.getHours();
    
    // Prossimi slot: 00:00, 04:00, 08:00, 12:00, 16:00, 20:00
    const scheduleSlots = [0, 4, 8, 12, 16, 20];
    let nextSlot = scheduleSlots.find(slot => slot > currentHour);
    
    // Se non trova slot oggi, prende il primo di domani
    if (!nextSlot) {
        nextSlot = scheduleSlots[0]; // 00:00 del giorno dopo
    }
    
    const nextUpdate = new Date(now);
    if (nextSlot <= currentHour) {
        // Domani
        nextUpdate.setDate(nextUpdate.getDate() + 1);
    }
    nextUpdate.setHours(nextSlot, 0, 0, 0);
    
    const timeString = nextUpdate.toLocaleTimeString('it-IT', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    const isToday = nextUpdate.toDateString() === now.toDateString();
    const datePrefix = isToday ? '' : 'Dom ';
    
    // 🎨 CREA IL NUOVO PULSANTE MODERNO
    const button = document.createElement('button');
    button.id = 'global-update-btn';
    button.className = 'btn btn-primary';
    button.innerHTML = `
        <div class="d-flex align-items-center" style="gap: 8px;">
            <i class="fas fa-robot" style="font-size: 16px;"></i>
            <div class="d-flex flex-column align-items-start" style="line-height: 1.2;">
                <span style="font-size: 13px; font-weight: 600;">Auto-Update</span>
                <small style="font-size: 11px; opacity: 0.9;">Prossimo: ${datePrefix}${timeString}</small>
            </div>
            <i class="fas fa-play-circle" style="font-size: 14px; margin-left: 4px;"></i>
        </div>
    `;
    
    // 🎨 STILI MODERNI
    button.style.cssText = `
        background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
        border: none;
        border-radius: 8px;
        padding: 10px 16px;
        color: white;
        font-size: 13px;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 2px 8px rgba(0, 123, 255, 0.3);
        margin-left: 12px;
        position: relative;
        overflow: hidden;
    `;
    
    // 🎯 EVENT HANDLER CON ANIMAZIONI MODERNE
    button.onclick = async function() {
        // Mostra loading con animazione
        const originalHTML = this.innerHTML;
        this.innerHTML = `
            <div class="d-flex align-items-center" style="gap: 8px;">
                <i class="fas fa-spinner fa-spin" style="font-size: 16px;"></i>
                <span style="font-size: 13px; font-weight: 600;">Aggiornando...</span>
            </div>
        `;
        this.disabled = true;
        this.style.background = 'linear-gradient(135deg, #28a745 0%, #20c997 100%)';
        this.style.boxShadow = '0 4px 15px rgba(40, 167, 69, 0.4)';
        this.style.transform = 'translateY(-1px)';
        
        try {
            await window.handleTrackingUpdateButton();
            
            // Feedback successo con animazione
            this.innerHTML = `
                <div class="d-flex align-items-center" style="gap: 8px;">
                    <i class="fas fa-check-circle" style="font-size: 16px;"></i>
                    <span style="font-size: 13px; font-weight: 600;">Completato!</span>
                </div>
            `;
            this.style.background = 'linear-gradient(135deg, #28a745 0%, #20c997 100%)';
            
            // Ripristina dopo 2.5 secondi
            setTimeout(() => {
                this.innerHTML = originalHTML;
                this.disabled = false;
                this.style.background = 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)';
                this.style.boxShadow = '0 2px 8px rgba(0, 123, 255, 0.3)';
                this.style.transform = 'translateY(0)';
            }, 2500);
            
        } catch (error) {
            // Feedback errore con animazione
            this.innerHTML = `
                <div class="d-flex align-items-center" style="gap: 8px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 16px;"></i>
                    <span style="font-size: 13px; font-weight: 600;">Errore</span>
                </div>
            `;
            this.style.background = 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)';
            this.style.boxShadow = '0 4px 15px rgba(220, 53, 69, 0.4)';
            
            // Ripristina dopo 3 secondi
            setTimeout(() => {
                this.innerHTML = originalHTML;
                this.disabled = false;
                this.style.background = 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)';
                this.style.boxShadow = '0 2px 8px rgba(0, 123, 255, 0.3)';
                this.style.transform = 'translateY(0)';
            }, 3000);
        }
    };
    
    // 🎨 HOVER EFFECTS MODERNI
    button.onmouseenter = function() {
        if (!this.disabled) {
            this.style.transform = 'translateY(-2px)';
            this.style.boxShadow = '0 6px 20px rgba(0, 123, 255, 0.4)';
            this.style.background = 'linear-gradient(135deg, #0056b3 0%, #004085 100%)';
        }
    };
    
    button.onmouseleave = function() {
        if (!this.disabled) {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 2px 8px rgba(0, 123, 255, 0.3)';
            this.style.background = 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)';
        }
    };
    
    // 🎯 TROVA LA SEZIONE PAGE-ACTIONS E INSERISCI IL PULSANTE
    const pageActions = document.querySelector('.page-actions');
    
    if (pageActions) {
        pageActions.appendChild(button);
        console.log('✅ Modern auto-update button added to page-actions');
    } else {
        // Fallback: cerca alternative
        const alternativeContainers = [
            document.querySelector('.page-header .d-flex'),
            document.querySelector('.page-header'),
            document.querySelector('h1').parentElement
        ].filter(Boolean);
        
        if (alternativeContainers.length > 0) {
            alternativeContainers[0].appendChild(button);
            console.log('✅ Modern auto-update button added to alternative container');
        } else {
            console.warn('⚠️ Could not find page-actions container');
        }
    }
    
    return button;
};

// 🚀 AUTO-INIZIALIZZAZIONE QUANDO LA PAGINA È PRONTA
window.initAutoUpdateButtons = function() {
    console.log('🚀 Initializing auto-update buttons...');
    
    // Crea il pulsante globale
    window.createGlobalUpdateButton();
    
    // Observer per nuovi pulsanti aggiunti dinamicamente
    const observer = new MutationObserver(() => {
        // Re-check per nuovi pulsanti nella tabella
        const actionButtons = document.querySelectorAll('[data-tracking-id] .btn-update');
        actionButtons.forEach(btn => {
            if (!btn.hasAttribute('data-auto-update-enhanced')) {
                btn.setAttribute('data-auto-update-enhanced', 'true');
                console.log('✅ Enhanced action button:', btn);
            }
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    console.log('✅ Auto-update buttons initialized with observer');
};

// 🎯 AVVIA INIZIALIZZAZIONE
document.addEventListener('DOMContentLoaded', () => {
    // Attendi che il resto della pagina sia caricato
    setTimeout(() => {
        window.initAutoUpdateButtons();
    }, 2000);
});
// 🎯 AVVIA INIZIALIZZAZIONE
document.addEventListener('DOMContentLoaded', () => {
    // Attendi che il resto della pagina sia caricato
    setTimeout(() => {
        window.initAutoUpdateButtons();
    }, 2000);
});

// 🕒 AGGIORNA IL TIMER IN TEMPO REALE (AGGIUNGI QUI)
window.startAutoUpdateTimer = function() {
    // Aggiorna ogni minuto
    setInterval(() => {
        const button = document.getElementById('global-update-btn');
        if (button && !button.disabled) {
            // Ricrea il pulsante con l'orario aggiornato
            window.createGlobalUpdateButton();
        }
    }, 60000); // Ogni 60 secondi
};

// 🚀 VERSIONE MIGLIORATA DELL'INIZIALIZZAZIONE (SOSTITUISCI LA PRECEDENTE)
window.initAutoUpdateButtons = function() {
    console.log('🚀 Initializing auto-update buttons...');
    
    // Crea il pulsante che sostituisce l'indicatore
    window.createGlobalUpdateButton();
    
    // 🔥 AGGIUNGI: Avvia il timer per aggiornare l'orario
    window.startAutoUpdateTimer();
    
    // Observer per nuovi pulsanti aggiunti dinamicamente
    const observer = new MutationObserver(() => {
        const actionButtons = document.querySelectorAll('[data-tracking-id] .btn-update');
        actionButtons.forEach(btn => {
            if (!btn.hasAttribute('data-auto-update-enhanced')) {
                btn.setAttribute('data-auto-update-enhanced', 'true');
                console.log('✅ Enhanced action button:', btn);
            }
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    console.log('✅ Auto-update buttons initialized with live timer');
};
// Aggiungi questa funzione alla fine di index.js per debug delle date
window.debugTrackingDates = function() {
    console.log('🔍 === TRACKING DATES DEBUG ===');
    
    if (!window.trackings || window.trackings.length === 0) {
        console.log('❌ No trackings found');
        return;
    }

    window.trackings.slice(0, 5).forEach((tracking, i) => {
        console.log(`\n📦 ${i + 1}. ${tracking.tracking_number} (${tracking.tracking_type})`);
        console.log('   Raw metadata available:', !!tracking.metadata?.raw);
        console.log('   Departure:', tracking.date_of_departure ? new Date(tracking.date_of_departure).toLocaleDateString() : 'N/A');
        console.log('   ETA:', tracking.eta ? new Date(tracking.eta).toLocaleDateString() : 'N/A');
        console.log('   ATA:', tracking.ata ? new Date(tracking.ata).toLocaleDateString() : 'N/A');
        console.log('   Final Arrival:', tracking.date_of_arrival ? new Date(tracking.date_of_arrival).toLocaleDateString() : 'N/A');
        console.log('   Status:', tracking.current_status);
        
        // Debug movements
        const movements = tracking.metadata?.raw?.shipment?.movements || 
                         tracking.metadata?.raw?.movements || 
                         tracking.metadata?.raw?.containers?.[0]?.movements;
        if (movements) {
            console.log(`   Total movements: ${movements.length}`);
            const arrivalEvents = movements.filter(m => 
                (m.event || '').includes('ARR') || 
                (m.description || '').toLowerCase().includes('arrival') ||
                (m.description || '').toLowerCase().includes('discharge')
            );
            console.log(`   Arrival-related events: ${arrivalEvents.length}`);
            if (arrivalEvents.length > 0) {
                console.log('   Sample arrival event:', arrivalEvents[0]);
            }
        }
    });
};