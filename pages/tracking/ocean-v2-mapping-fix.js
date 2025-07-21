// ocean-v2-mapping-fix.js
// Fix per il mapping delle colonne Ocean v2.0 in tabella
(function() {
    'use strict';
    
    console.log('🌊 OCEAN V2 MAPPING FIX - Starting...');
    
    // ========================================
    // FIX 1: INTERCETTA loadTrackings in index.js
    // ========================================
    function interceptLoadTrackings() {
        // Aspetta che loadTrackings sia disponibile
        const waitForLoadTrackings = setInterval(() => {
            // Cerca in tutti i possibili posti
            const loadTrackingsFn = window.loadTrackings || 
                                   window.trackingDebug?.refresh ||
                                   (window.trackingDebug?.getData ? 
                                    () => window.trackingDebug.getData().loadTrackings?.() : null);
            
            if (loadTrackingsFn) {
                clearInterval(waitForLoadTrackings);
                
                console.log('🔧 Found loadTrackings, intercepting...');
                
                // Salva originale
                const originalLoadTrackings = loadTrackingsFn;
                
                // Override con versione che mappa Ocean v2
                const enhancedLoadTrackings = async function() {
                    console.log('🌊 Loading trackings with Ocean v2 mapping support...');
                    
                    // Chiama originale
                    await originalLoadTrackings.call(this);
                    
                    // Dopo il caricamento, processa i dati Ocean v2
                    setTimeout(() => {
                        processOceanV2Data();
                    }, 100);
                };
                
                // Sostituisci in tutti i posti possibili
                if (window.loadTrackings) window.loadTrackings = enhancedLoadTrackings;
                if (window.trackingDebug?.refresh) window.trackingDebug.refresh = enhancedLoadTrackings;
                
                console.log('✅ loadTrackings intercepted');
            }
        }, 500);
    }
    
    // ========================================
    // FIX 2: PROCESSA DATI OCEAN V2 DOPO CARICAMENTO
    // ========================================
    function processOceanV2Data() {
        console.log('🔄 Processing Ocean v2 data for display...');
        
        // Trova i dati trackings
        const trackings = window.trackings || 
                         window.filteredTrackings || 
                         window.trackingDebug?.getData()?.trackings || 
                         [];
        
        if (!trackings.length) {
            console.warn('No trackings found to process');
            return;
        }
        
        // Processa ogni tracking Ocean v2
        let oceanV2Count = 0;
        trackings.forEach((tracking, index) => {
            if (tracking.metadata?.source === 'shipsgo_v2_ocean') {
                oceanV2Count++;
                
                // Applica mapping direttamente sull'oggetto
                mapOceanV2Fields(tracking);
            }
        });
        
        if (oceanV2Count > 0) {
            console.log(`✅ Processed ${oceanV2Count} Ocean v2 trackings`);
            
            // Forza aggiornamento tabella
            if (window.updateTable) {
                window.updateTable();
            } else if (window.tableManager?.refresh) {
                window.tableManager.refresh();
            }
        }
    }
    
    // ========================================
    // FIX 3: MAPPING DIRETTO DEI CAMPI OCEAN V2
    // ========================================
    function mapOceanV2Fields(tracking) {
        console.log('🗺️ Mapping Ocean v2 fields for:', tracking.tracking_number);
        
        const raw = tracking.metadata?.raw?.shipment || tracking.metadata?.raw || {};
        
        // CARRIER - Assicurati che sia visibile
        if (!tracking.carrier_name || tracking.carrier_name === '-') {
            tracking.carrier_name = tracking.metadata?.mapped?.carrier_name ||
                                  raw.carrier?.name ||
                                  raw.shipping_line?.name ||
                                  tracking.carrier_code ||
                                  'Unknown';
        }
        
        // VESSEL - Estrai dai movements se necessario
        if (!tracking.vessel_name || tracking.vessel_name === '-') {
            if (raw.containers?.[0]?.movements) {
                const movements = raw.containers[0].movements;
                // Trova l'ultimo movimento con vessel
                for (let i = movements.length - 1; i >= 0; i--) {
                    if (movements[i].vessel?.name) {
                        tracking.vessel_name = movements[i].vessel.name;
                        tracking.vessel_imo = movements[i].vessel.imo || tracking.vessel_imo;
                        tracking.voyage_number = movements[i].voyage || tracking.voyage_number;
                        break;
                    }
                }
            }
        }
        
        // CONTAINER DETAILS
        if (!tracking.container_size || tracking.container_size === '-') {
            tracking.container_size = raw.containers?.[0]?.size || '-';
        }
        if (!tracking.container_type || tracking.container_type === '-') {
            tracking.container_type = raw.containers?.[0]?.type || '-';
        }
        
        // PORTS - Assicurati che siano mappati
        if (!tracking.origin_port || tracking.origin_port === '-') {
            tracking.origin_port = tracking.metadata?.mapped?.origin_port ||
                                 raw.route?.port_of_loading?.location?.name ||
                                 raw.route?.origin?.port ||
                                 '-';
        }
        
        if (!tracking.destination_port || tracking.destination_port === '-') {
            tracking.destination_port = tracking.metadata?.mapped?.destination_port ||
                                      raw.route?.port_of_discharge?.location?.name ||
                                      raw.route?.destination?.port ||
                                      '-';
        }
        
        // DATES - Estrai dal movimento LOAD se necessario
        if (!tracking.date_of_loading || tracking.date_of_loading === '-') {
            if (raw.containers?.[0]?.movements) {
                const loadEvent = raw.containers[0].movements.find(m => m.event === 'LOAD');
                if (loadEvent?.timestamp) {
                    tracking.date_of_loading = loadEvent.timestamp;
                }
            }
        }
        
        // METRICS
        if (!tracking.transit_time && raw.route?.transit_time) {
            tracking.transit_time = raw.route.transit_time;
        }
        if (!tracking.co2_emission || tracking.co2_emission === '-') {
            tracking.co2_emission = raw.route?.co2_emission || '-';
        }
        if (!tracking.ts_count) {
            tracking.ts_count = raw.route?.ts_count || 0;
        }
        
        // LAST EVENT
        if ((!tracking.last_event_location || tracking.last_event_location === '-') && 
            raw.containers?.[0]?.movements?.length > 0) {
            const lastMovement = raw.containers[0].movements[raw.containers[0].movements.length - 1];
            tracking.last_event_location = lastMovement.location?.name || '-';
            tracking.last_event_date = lastMovement.timestamp || tracking.last_event_date;
        }
        
        console.log('✅ Mapped Ocean v2 data:', {
            carrier: tracking.carrier_name,
            vessel: tracking.vessel_name,
            size: tracking.container_size,
            ports: `${tracking.origin_port} → ${tracking.destination_port}`
        });
    }
    
    // ========================================
    // FIX 4: OVERRIDE FORMATTER CARRIER_NAME
    // ========================================
    function fixCarrierFormatter() {
        const checkInterval = setInterval(() => {
            if (window.TABLE_COLUMNS) {
                clearInterval(checkInterval);
                
                const carrierCol = window.TABLE_COLUMNS.find(col => col.key === 'carrier_name');
                if (carrierCol) {
                    console.log('🔧 Fixing carrier_name formatter...');
                    
                    const originalFormatter = carrierCol.formatter;
                    
                    carrierCol.formatter = function(value, row) {
                        // Se è Ocean v2, usa il campo mappato
                        if (row.metadata?.source === 'shipsgo_v2_ocean') {
                            return row.carrier_name || 
                                   row.metadata?.mapped?.carrier_name ||
                                   row.carrier_code || 
                                   'Unknown';
                        }
                        
                        // Altrimenti usa formatter originale
                        return originalFormatter ? originalFormatter(value, row) : (value || '-');
                    };
                    
                    console.log('✅ carrier_name formatter fixed');
                }
            }
        }, 500);
    }
    
    // ========================================
    // FIX 5: MONITORA CAMBIO DATI
    // ========================================
    function monitorDataChanges() {
        // Monitora quando i dati vengono aggiornati
        let lastDataLength = 0;
        
        setInterval(() => {
            const currentData = window.trackings || window.filteredTrackings || [];
            
            if (currentData.length !== lastDataLength) {
                console.log('📊 Data changed, checking for Ocean v2...');
                lastDataLength = currentData.length;
                
                // Processa eventuali nuovi dati Ocean v2
                setTimeout(() => processOceanV2Data(), 500);
            }
        }, 2000);
    }
    
    // ========================================
    // DEBUG HELPER
    // ========================================
    window.debugOceanV2Display = function() {
        console.log('🌊 OCEAN V2 DISPLAY DEBUG');
        console.log('=========================');
        
        const trackings = window.trackings || window.filteredTrackings || [];
        const oceanV2 = trackings.filter(t => t.metadata?.source === 'shipsgo_v2_ocean');
        
        console.log(`Found ${oceanV2.length} Ocean v2 trackings`);
        
        oceanV2.forEach(t => {
            console.log(`\n📦 ${t.tracking_number}:`);
            console.log('- carrier_name:', t.carrier_name);
            console.log('- vessel_name:', t.vessel_name);
            console.log('- container_size:', t.container_size);
            console.log('- origin_port:', t.origin_port);
            console.log('- destination_port:', t.destination_port);
            console.log('- transit_time:', t.transit_time);
            console.log('- co2_emission:', t.co2_emission);
        });
        
        // Verifica se il table manager ha i dati corretti
        if (window.tableManager) {
            const tableData = window.tableManager.data;
            const tableOceanV2 = tableData.filter(t => t.metadata?.source === 'shipsgo_v2_ocean');
            console.log(`\n📊 Table has ${tableOceanV2.length} Ocean v2 rows`);
        }
    };
    
    // ========================================
    // INITIALIZATION
    // ========================================
    App.onReady(() => {
        console.log('🚀 Initializing Ocean v2 mapping fix...');
        
        interceptLoadTrackings();
        fixCarrierFormatter();
        monitorDataChanges();
        
        // Processa dati esistenti dopo un delay
        setTimeout(() => {
            processOceanV2Data();
        }, 2000);
        
        console.log('✅ Ocean v2 mapping fix initialized');
    });
    
})();

console.log('✅ Ocean v2 Mapping Fix loaded');