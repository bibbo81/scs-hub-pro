// tracking-complete-fix-v3.js
// Fix completo per tutti i problemi del sistema di tracking
// Versione 3.0 - Include fix drag&drop colonne migliorato

(function() {
    'use strict';
    
    console.log('🚀 TRACKING COMPLETE FIX v3.0 - Starting...');
    
    // ========================================
    // FIX 1: SORTABLE.JS INJECTION (ENHANCED)
    // ========================================
    function injectSortableJS() {
        if (!window.Sortable && !document.querySelector('script[src*="sortablejs"]')) {
            console.log('🔧 Injecting Sortable.js...');
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js';
            script.onload = () => {
                console.log('✅ Sortable.js loaded');
                // Enable drag&drop after loading
                enableColumnDragDrop();
            };
            document.head.appendChild(script);
        } else if (window.Sortable) {
            // If Sortable is already loaded, enable drag&drop directly
            enableColumnDragDrop();
        }
    }
    
    // ========================================
    // UTILITY: DEPENDENCY WAITER
    // ========================================
    function ensureDependencies(deps) {
        return new Promise((resolve) => {
            const check = () => {
                const allReady = deps.every(dep => window[dep]);
                if (allReady) {
                    resolve();
                } else {
                    setTimeout(check, 100);
                }
            };
            check();
        });
    }

    // New function to handle drag&drop functionality
    async function enableColumnDragDrop() {
        console.log('🔧 Enabling column drag&drop...');

        await ensureDependencies(['tableManager', 'Sortable']);
        console.log('✅ Dependencies tableManager and Sortable are ready.');

        const tableManager = window.tableManager;
        const headerRow = tableManager.container.querySelector('thead tr');

        if (!headerRow) {
            console.warn('⚠️ Header row not found.');
            return;
        }

        if (tableManager.columnSortable) {
            tableManager.columnSortable.destroy();
        }

        tableManager.columnSortable = new Sortable(headerRow, {
            animation: 150,
            handle: 'th',
            filter: '.no-drag',
            onEnd: (evt) => {
                tableManager.handleColumnReorder(evt.oldIndex, evt.newIndex);
            }
        });
        console.log('✅ Column drag&drop enabled successfully');
    }

    // ========================================
    // FIX 2: OCEAN API v2.0 IMPLEMENTATION
    // ========================================
    async function implementOceanV2API() {
        await ensureDependencies(['trackingService']);
        console.log('✅ Dependency trackingService is ready.');
        
        // Add preferV2Ocean property
        if (!window.trackingService.hasOwnProperty('preferV2Ocean')) {
            window.trackingService.preferV2Ocean = false;
        }
        
        // Add switching methods
        window.trackingService.switchToV2Ocean = function() {
            this.preferV2Ocean = true;
            console.log('[TrackingService] Switched to v2 for ocean tracking');
        };
        
        window.trackingService.switchToV1Ocean = function() {
            this.preferV2Ocean = false;
            console.log('[TrackingService] Switched to v1 for ocean tracking');
        };
        
        // Override trackContainer to support v2
        const originalTrackContainer = window.trackingService.trackContainer;
        window.trackingService.trackContainer = async function(trackingNumber, options = {}) {
            // Check if we should use v2
            if (this.preferV2Ocean || options.useV2) {
                console.log('[TrackingService] Using Ocean v2.0 API');
                return await this.trackOceanShipmentV2(trackingNumber, options);
            }
            // Otherwise use original v1.2
            return originalTrackContainer.call(this, trackingNumber, options);
        };
        
        // Implement Ocean v2.0 methods
        window.trackingService.trackOceanShipmentV2 = async function(containerNumber, options = {}) {
            if (!this.apiConfig.v2 || !this.apiConfig.v2.enabled) {
                throw new Error('ShipsGo v2.0 API not configured or disabled');
            }
            
            console.log('[TrackingService] 🚢 Tracking Ocean via ShipsGo v2.0:', containerNumber);
            
            try {
                // Step 1: Get ocean shipments list
                const shipmentsList = await this.getOceanShipmentsList();
                
                // Step 2: Find container in list
                let shipsgoId = null;
                const foundShipment = shipmentsList.find(s => 
                    s.container_number === containerNumber.toUpperCase()
                );
                
                if (foundShipment) {
                    shipsgoId = foundShipment.id;
                    console.log('[TrackingService] ✅ Found container in list with ID:', shipsgoId);
                } else {
                    // Step 3: Add container if not found
                    const addResult = await this.addOceanShipmentToShipsGo(containerNumber);
                    
                    // Reload list after adding
                    await this.delay(1000);
                    const updatedList = await this.getOceanShipmentsList();
                    
                    const newShipment = updatedList.find(s => 
                        s.container_number === containerNumber.toUpperCase()
                    );
                    
                    if (newShipment) {
                        shipsgoId = newShipment.id;
                    }
                }
                
                if (!shipsgoId) {
                    throw new Error('Unable to find or create ocean shipment in ShipsGo v2');
                }
                
                // Step 4: Get details by ID
                const shipmentInfo = await this.getOceanShipmentById(shipsgoId);
                
                // Step 5: Normalize response
                return this.normalizeOceanV2Response(shipmentInfo, containerNumber);
                
            } catch (error) {
                console.error('[TrackingService] ❌ Ocean v2 tracking error:', error);
                throw error;
            }
        };
        
        window.trackingService.getOceanShipmentsList = async function() {
            const response = await this.callShipsGoAPI(
                'v2',
                '/ocean/shipments',
                'GET'
            );
            
            if (!response.success) {
                return [];
            }
            
            return response.data?.shipments || [];
        };
        
        window.trackingService.addOceanShipmentToShipsGo = async function(containerNumber) {
            const response = await this.callShipsGoAPI(
                'v2',
                '/ocean/shipments',
                'POST',
                null,
                {
                    containerNumber: containerNumber.toUpperCase(),
                    shippingLine: 'OTHERS'
                }
            );
            
            if (!response.success) {
                throw new Error(response.data?.message || 'Failed to add ocean shipment');
            }
            
            return response.data;
        };
        
        window.trackingService.getOceanShipmentById = async function(shipsgoId) {
            const response = await this.callShipsGoAPI(
                'v2',
                `/ocean/shipments/${shipsgoId}`,
                'GET'
            );
            
            if (!response.success) {
                throw new Error('Failed to get ocean shipment details');
            }
            
            return response.data;
        };
        
        window.trackingService.normalizeOceanV2Response = function(data, containerNumber) {
    console.log('🔍 Normalizing Ocean v2 response:', data);
    
    // Handle both direct response and wrapped response
    const shipmentData = data.shipment || data.data || data;
    
    // Extract carrier info - FIX: Access the correct path
    let carrierCode = 'UNKNOWN';
    let carrierName = 'Unknown Carrier';
    
    // Try different paths for carrier data
    if (shipmentData.carrier) {
        carrierCode = shipmentData.carrier.scac || shipmentData.carrier.code || shipmentData.carrier.name || 'UNKNOWN';
        carrierName = shipmentData.carrier.name || shipmentData.carrier.scac || 'Unknown Carrier';
    } else if (shipmentData.shipping_line) {
        carrierCode = shipmentData.shipping_line.scac || shipmentData.shipping_line.code || 'UNKNOWN';
        carrierName = shipmentData.shipping_line.name || 'Unknown Carrier';
    }
    
    // Extract route info - FIX: Access the correct nested structure
    let originPort = '-';
    let originCountry = '-';
    let destinationPort = '-';
    let destinationCountry = '-';
    let departureDate = null;
    let arrivalDate = null;
    
    if (shipmentData.route) {
        // Origin info
        if (shipmentData.route.port_of_loading) {
            originPort = shipmentData.route.port_of_loading.location?.name || 
                        shipmentData.route.port_of_loading.name || 
                        shipmentData.route.port_of_loading || '-';
            originCountry = shipmentData.route.port_of_loading.location?.country?.name || 
                           shipmentData.route.port_of_loading.country || '-';
        } else if (shipmentData.route.origin) {
            originPort = shipmentData.route.origin.location?.name || 
                        shipmentData.route.origin.port || 
                        shipmentData.route.origin.name || '-';
            originCountry = shipmentData.route.origin.location?.country?.name || 
                           shipmentData.route.origin.country || '-';
        }
        
        // Destination info
        if (shipmentData.route.port_of_discharge) {
            destinationPort = shipmentData.route.port_of_discharge.location?.name || 
                             shipmentData.route.port_of_discharge.name || 
                             shipmentData.route.port_of_discharge || '-';
            destinationCountry = shipmentData.route.port_of_discharge.location?.country?.name || 
                                shipmentData.route.port_of_discharge.country || '-';
        } else if (shipmentData.route.destination) {
            destinationPort = shipmentData.route.destination.location?.name || 
                             shipmentData.route.destination.port || 
                             shipmentData.route.destination.name || '-';
            destinationCountry = shipmentData.route.destination.location?.country?.name || 
                                shipmentData.route.destination.country || '-';
        }
        
        // Dates
        departureDate = shipmentData.route.port_of_loading?.date || 
                       shipmentData.route.origin?.date_of_departure || 
                       shipmentData.route.origin?.date;
                       
        arrivalDate = shipmentData.route.port_of_discharge?.date || 
                     shipmentData.route.destination?.eta || 
                     shipmentData.route.destination?.eta;
    }
    
    // Extract vessel info - FIX: prendi l'ultima nave dai movements
let vesselInfo = null;
let lastVoyage = null;
if (shipmentData.containers && shipmentData.containers[0]?.movements) {
    const movements = shipmentData.containers[0].movements;
    // Trova l'ultimo movimento con vessel
    for (let i = movements.length - 1; i >= 0; i--) {
        if (movements[i].vessel?.name) {
            vesselInfo = {
                name: movements[i].vessel.name,
                imo: movements[i].vessel.imo,
                voyage: movements[i].voyage
            };
            lastVoyage = movements[i].voyage;
            break;
        }
    }
}

// Extract container details
let containerSize = '-';
let containerType = '-';
if (shipmentData.containers && shipmentData.containers[0]) {
    containerSize = shipmentData.containers[0].size || '-';
    containerType = shipmentData.containers[0].type || '-';
}

// Extract date of loading from movements
let actualLoadingDate = null;
if (shipmentData.containers && shipmentData.containers[0]?.movements) {
    const loadEvent = shipmentData.containers[0].movements.find(m => m.event === 'LOAD');
    if (loadEvent) {
        actualLoadingDate = loadEvent.timestamp;
    }
}

// Normalize status - FIX COMPLETO
const status = (() => {
    const rawStatus = (shipmentData.status || 'registered').toUpperCase();
    const statusMap = {
        'SAILING': 'in_transit',
        'IN TRANSIT': 'in_transit',
        'ARRIVED': 'arrived',
        'DELIVERED': 'delivered',
        'DISCHARGED': 'arrived',
        'REGISTERED': 'registered',
        'PENDING': 'registered'
    };
    return statusMap[rawStatus] || 'registered';
})();
    
    // Build normalized response
    const normalized = {
        success: true,
        trackingNumber: containerNumber,
        trackingType: 'container',
        status: status,
        lastUpdate: new Date().toISOString(),
        
        // Carrier info - PROPERLY MAPPED
        carrier: {
            code: carrierCode,
            name: carrierName
        },
        carrier_code: carrierCode,
        carrier_name: carrierName,
        
        // Route info - PROPERLY MAPPED
        route: {
            origin: {
                port: originPort,
                country: originCountry,
                date: departureDate
            },
            destination: {
                port: destinationPort,
                country: destinationCountry,
                eta: arrivalDate
            }
        },
        
        // Direct port mappings for table display
        origin_port: originPort,
        port_of_loading: originPort,
        destination_port: destinationPort,
        port_of_discharge: destinationPort,
        origin_country: originCountry,
        destination_country: destinationCountry,
        
        // Dates
        date_of_loading: departureDate,
        date_of_departure: departureDate,
        eta: arrivalDate,
        ata: shipmentData.ata,
        
        // Vessel info
        vessel: vesselInfo,
        vessel_name: vesselInfo?.name,
        vessel_imo: vesselInfo?.imo,
        voyage_number: vesselInfo?.voyage,
        
        // Events
        events: this.extractOceanV2Events(shipmentData),
        
        // Additional fields
        booking: shipmentData.booking_number || shipmentData.booking,
        bl_number: shipmentData.bl_number,
        container_size: shipmentData.container_size || shipmentData.size,
        container_type: shipmentData.container_type || shipmentData.type,
        
        // Metadata
        metadata: {
            source: 'shipsgo_v2_ocean',
            enriched_at: new Date().toISOString(),
            raw: data,
            shipsgo_id: shipmentData.id,
            mapped: {
                carrier_code: carrierCode,
                carrier_name: carrierName,
                origin_port: originPort,
                destination_port: destinationPort,
                origin_country: originCountry,
                destination_country: destinationCountry
            }
        },
        
        // Additional mapped fields for compatibility
mappedFields: {
    carrier_code: carrierCode,
    carrier_name: carrierName,
    origin_port: originPort,
    destination_port: destinationPort,
    date_of_loading: departureDate,
    eta: arrivalDate,
    container_count: 1,
    transit_time: this.calculateTransitTime(departureDate, arrivalDate),
    // AGGIUNGI TUTTI I CAMPI MANCANTI
    vessel_name: vesselInfo?.name || '-',
    vessel_imo: vesselInfo?.imo || '-',
    voyage_number: vesselInfo?.voyage || '-',
    container_size: shipmentData.container_size || shipmentData.size || '-',
    container_type: shipmentData.container_type || shipmentData.type || '-',
    origin_country: originCountry,
    destination_country: destinationCountry,
    booking: shipmentData.booking_number || shipmentData.booking || '-',
    bl_number: shipmentData.bl_number || '-',
    date_of_departure: departureDate,
    date_of_discharge: arrivalDate,
    last_event_location: (() => {
        const movements = shipmentData.movements || [];
        return movements.length > 0 ? movements[movements.length - 1].location?.name || '-' : '-';
    })(),
    last_event_date: (() => {
        const movements = shipmentData.movements || [];
        return movements.length > 0 ? movements[movements.length - 1].date || '-' : '-';
    })(),
    ts_count: shipmentData.route?.ts_count || 0,
    co2_emission: shipmentData.route?.co2_emission || '-',
    reference_number: '-',
    tags: shipmentData.tags?.join(',') || '-'
}
// FORZA I CAMPI AL LIVELLO PRINCIPALE - AGGIUNGI QUI
    ,carrier_name: carrierName || carrierCode || 'Unknown',
    origin_country: originCountry,
    destination_country: destinationCountry,
    vessel_name: vesselInfo?.name || '-',
    voyage_number: vesselInfo?.voyage || '-',
    container_size: shipmentData.container_size || shipmentData.size || '-',
    container_type: shipmentData.container_type || shipmentData.type || '-',
    date_of_departure: departureDate,
    date_of_discharge: arrivalDate,
    last_event_location: (() => {
        const movements = shipmentData.movements || [];
        return movements.length > 0 ? movements[movements.length - 1].location?.name || '-' : '-';
    })(),
    transit_time: this.calculateTransitTime(departureDate, arrivalDate),
    ts_count: shipmentData.route?.ts_count || 0,
    co2_emission: shipmentData.route?.co2_emission || '-'
    
};    
    console.log('✅ Normalized Ocean v2 response:', {
        carrier: `${carrierCode} - ${carrierName}`,
        route: `${originPort} → ${destinationPort}`,
        dates: {
            departure: departureDate,
            arrival: arrivalDate
        }
    });
    
    return normalized;
};
       window.trackingService.calculateTransitTime = function(departureDate, arrivalDate) {
    if (!departureDate || !arrivalDate) return null;
    
    try {
        const dep = new Date(departureDate);
        const arr = new Date(arrivalDate);
        const diffTime = Math.abs(arr - dep);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    } catch (e) {
        return null;
    }
}; 
        window.trackingService.extractOceanV2Events = function(data) {
            const events = [];
            
            if (data.movements && Array.isArray(data.movements)) {
                return data.movements.map(movement => ({
                    date: movement.date,
                    type: movement.event,
                    status: movement.status,
                    location: movement.location?.name || '-',
                    vessel: movement.vessel?.name,
                    description: movement.description
                })).sort((a, b) => new Date(b.date) - new Date(a.date));
            }
            
            return events;
        };
        
        console.log('✅ Ocean v2.0 API methods implemented');
    }
    
    // ========================================
    // FIX 3: FORM PROGRESSIVE - ADD OCEAN API SELECTOR
    // ========================================
    function addOceanAPISelector() {
        // Wait for DOM
        const checkInterval = setInterval(() => {
            const apiCard = document.querySelector('.api-card');
            const typeSelect = document.getElementById('enh_trackingType');
            
            if (apiCard && typeSelect && !document.getElementById('oceanApiVersionSection')) {
                clearInterval(checkInterval);
                
                console.log('🔧 Adding Ocean API version selector...');
                
                // Find the api-operation-selector
                const apiOperationSelector = apiCard.querySelector('.api-operation-selector');
                if (!apiOperationSelector) {
                    console.warn('api-operation-selector not found');
                    return;
                }
                
                // Create ocean API version selector
                const oceanVersionHTML = `
                    <div class="api-version-selector" id="oceanApiVersionSection" style="display: none;">
                        <h5>🌊 Versione API Ocean</h5>
                        <div class="version-radio-group">
                            <div class="version-radio">
                                <input type="radio" id="api_v12" name="ocean_api_version" value="v1.2" checked>
                                <label for="api_v12">
                                    <i class="fas fa-anchor"></i> v1.2
                                    <small style="display:block;opacity:0.8;margin-top:2px;">Standard (consigliato)</small>
                                </label>
                            </div>
                            <div class="version-radio">
                                <input type="radio" id="api_v20" name="ocean_api_version" value="v2.0">
                                <label for="api_v20">
                                    <i class="fas fa-ship"></i> v2.0
                                    <small style="display:block;opacity:0.8;margin-top:2px;">Nuovo (ID-based)</small>
                                </label>
                            </div>
                        </div>
                    </div>
                `;
                
                // Insert after api-operation-selector
                apiOperationSelector.insertAdjacentHTML('afterend', oceanVersionHTML);
                
                // Add styles
                if (!document.getElementById('ocean-api-selector-styles')) {
                    const styles = document.createElement('style');
                    styles.id = 'ocean-api-selector-styles';
                    styles.textContent = `
                        .api-version-selector {
                            background: rgba(255,255,255,0.1);
                            border-radius: 8px;
                            padding: 16px;
                            margin-bottom: 16px;
                            margin-top: 16px;
                        }
                        
                        .version-radio-group {
                            display: flex;
                            gap: 12px;
                            flex-wrap: wrap;
                        }
                        
                        .version-radio {
                            position: relative;
                            flex: 1;
                            min-width: 120px;
                        }
                        
                        .version-radio input[type="radio"] {
                            position: absolute;
                            opacity: 0;
                        }
                        
                        .version-radio label {
                            display: block;
                            padding: 10px 16px;
                            background: rgba(255,255,255,0.2);
                            border: 2px solid rgba(255,255,255,0.3);
                            border-radius: 6px;
                            cursor: pointer;
                            transition: all 0.3s;
                            text-align: center;
                            font-size: 12px;
                            font-weight: 500;
                            color: rgba(255,255,255,0.9);
                        }
                        
                        .version-radio input[type="radio"]:checked + label {
                            background: rgba(0, 123, 255, 0.3);
                            border-color: rgba(0, 123, 255, 0.8);
                            color: white;
                        }
                    `;
                    document.head.appendChild(styles);
                }
                
                // Show/hide based on tracking type
                const updateOceanVersionVisibility = () => {
                    const oceanVersionSection = document.getElementById('oceanApiVersionSection');
                    if (oceanVersionSection) {
                        oceanVersionSection.style.display = 
                            typeSelect.value === 'container' ? 'block' : 'none';
                    }
                };
                
                // Add event listener
                typeSelect.addEventListener('change', updateOceanVersionVisibility);
                
                // Set initial state
                updateOceanVersionVisibility();
                
                // Override form data collection
                const originalHandleSubmit = window.handleEnhancedSubmit;
                window.handleEnhancedSubmit = async function(e) {
                    // Get ocean API version
                    const oceanApiVersion = document.querySelector('input[name="ocean_api_version"]:checked')?.value || 'v1.2';
                    
                    // Update tracking service preference
                    if (window.trackingService) {
                        if (oceanApiVersion === 'v2.0') {
                            window.trackingService.switchToV2Ocean();
                        } else {
                            window.trackingService.switchToV1Ocean();
                        }
                    }
                    
                    // Call original handler
                    return originalHandleSubmit.call(this, e);
                };
                
                console.log('✅ Ocean API selector added to form');
            }
        }, 500);
    }
    
    // ========================================
    // FIX 4: TABLE MANAGER UUID SUPPORT
    // ========================================
    function fixTableManagerUUID() {
        const checkInterval = setInterval(() => {
            if (window.tableManager) {
                clearInterval(checkInterval);
                
                console.log('🔧 Fixing TableManager UUID support...');
                
                // Override selectRow to handle UUID strings
                const originalSelectRow = window.tableManager.selectRow;
                window.tableManager.selectRow = function(rowId, selected) {
                    // Convert to string, don't use parseInt!
                    const id = String(rowId);
                    
                    if (selected) {
                        this.selectedRows.add(id);
                    } else {
                        this.selectedRows.delete(id);
                    }
                    
                    // Update visual state without full re-render
                    const row = document.querySelector(`tr[data-row-id="${id}"]`);
                    if (row) {
                        if (selected) {
                            row.classList.add('selected');
                        } else {
                            row.classList.remove('selected');
                        }
                    }
                    
                    this.onSelectionChange();
                };
                
                // Override getSelectedRows
                window.tableManager.getSelectedRows = function() {
                    return this.data.filter(row => {
                        const id = String(row.id || this.data.indexOf(row));
                        return this.selectedRows.has(id);
                    });
                };
                
                // Fix getColumns to filter hidden
                const originalGetColumns = window.tableManager.getColumns;
                window.tableManager.getColumns = function() {
                    const allColumns = originalGetColumns.call(this);
                    return allColumns.filter(col => !col.hidden);
                };
                
                console.log('✅ TableManager UUID support fixed');
            }
        }, 500);
    }
    
    // ========================================
    // FIX 5: MODAL SYSTEM BUTTONS
    // ========================================
    function fixModalButtons() {
        if (!window.ModalSystem) {
            setTimeout(fixModalButtons, 500);
            return;
        }
        
        console.log('🔧 Fixing Modal System button handlers...');
        
        // Override setupCustomButtonHandlers
        const originalSetup = window.ModalSystem.setupCustomButtonHandlers;
        window.ModalSystem.setupCustomButtonHandlers = function(modalId, config) {
            if (!config.buttons) return;
            
            config.buttons.forEach((btn, index) => {
                if (btn.onclick && typeof btn.onclick === 'function') {
                    const btnElement = document.querySelector(`[data-modal-action="button-${index}"][data-modal-id="${modalId}"]`);
                    if (btnElement) {
                        btnElement.addEventListener('click', (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            
                            try {
                                const result = btn.onclick();
                                // Only close if onclick doesn't return false
                                if (result !== false && btn.closeOnClick !== false) {
                                    this.close(modalId);
                                }
                            } catch (error) {
                                console.error('Error in button click handler:', error);
                            }
                        });
                    }
                }
            });
        };
        
        console.log('✅ Modal button handlers fixed');
    }
    
    // ========================================
    // FIX 6: COMPLETE COLUMNS LIST
    // ========================================
    function fixCompleteColumns() {
        // Wait for AVAILABLE_COLUMNS to be defined
        const checkInterval = setInterval(() => {
            if (window.AVAILABLE_COLUMNS) {
                clearInterval(checkInterval);
                
                console.log('🔧 Adding complete columns list...');
                
                // Add all missing columns
                const additionalColumns = [
                    // Origin/Destination details
                    { key: 'origin_name', label: 'Nome Origine', sortable: true },
                    { key: 'origin_country', label: 'Paese Origine', sortable: true },
                    { key: 'origin_country_code', label: 'Code Origine', sortable: true },
                    { key: 'destination_name', label: 'Nome Destinazione', sortable: true },
                    { key: 'destination_country', label: 'Paese Destinazione', sortable: true },
                    { key: 'destination_country_code', label: 'Code Destinazione', sortable: true },
                    
                    // Date columns
                    { key: 'date_of_loading', label: 'Data Carico', sortable: true },
                    { key: 'date_of_departure', label: 'Data Partenza', sortable: true },
                    { key: 'date_of_arrival', label: 'Data Arrivo', sortable: true },
                    { key: 'date_of_discharge', label: 'Data Scarico', sortable: true },
                    { key: 'ata', label: 'ATA', sortable: true },
                    { key: 'first_eta', label: 'Prima ETA', sortable: true },
                    
                    // Vessel/Flight
                    { key: 'vessel_name', label: 'Nome Nave', sortable: true },
                    { key: 'vessel_imo', label: 'IMO Nave', sortable: true },
                    { key: 'voyage_number', label: 'Numero Viaggio', sortable: true },
                    { key: 'flight_number', label: 'Numero Volo', sortable: true },
                    { key: 'airline', label: 'Compagnia Aerea', sortable: true },
                    
                    // Container/AWB Details
                    { key: 'container_number', label: 'Numero Container', sortable: true },
                    { key: 'container_size', label: 'Dimensione Container', sortable: true },
                    { key: 'container_type', label: 'Tipo Container', sortable: true },
                    { key: 'pieces', label: 'Colli', sortable: true },
                    { key: 'weight', label: 'Peso', sortable: true },
                    { key: 'volume', label: 'Volume', sortable: true },
                    { key: 'commodity', label: 'Merce', sortable: true },
                    
                    // Events
                    { key: 'last_event_location', label: 'Ultima Posizione', sortable: true },
                    { key: 'last_event_description', label: 'Ultimo Evento', sortable: true },
                    { key: 'last_event_date', label: 'Data Ultimo Evento', sortable: true },
                    
                    // Metrics
                    { key: 'ts_count', label: 'TS Count', sortable: true },
                    { key: 'live_map_url', label: 'Live Map', sortable: false },
                    
                    // Extra
                    { key: 'notes', label: 'Note', sortable: false },
                    { key: 'updated_at', label: 'Data Aggiornamento', sortable: true }
                ];
                
                // Merge with existing, avoiding duplicates
                additionalColumns.forEach(newCol => {
                    if (!window.AVAILABLE_COLUMNS.find(col => col.key === newCol.key)) {
                        window.AVAILABLE_COLUMNS.push(newCol);
                    }
                });
                
                console.log('✅ Complete columns list updated');
            }
        }, 500);
    }
    
    // ========================================
    // FIX 7: REMOVE API SELECTOR FROM TABLE
    // ========================================
    function removeTableAPISelector() {
        // Remove the API version selector from tracking.html filters
        const apiVersionDiv = document.querySelector('.col-md-2:has(#apiVersion)');
        if (apiVersionDiv) {
            apiVersionDiv.remove();
            console.log('✅ Removed API selector from table filters');
        }
        
        // Remove the associated script
        const scripts = document.querySelectorAll('script');
        scripts.forEach(script => {
            if (script.textContent.includes('switchApiVersion')) {
                script.remove();
            }
        });
    }
    
    // ========================================
    // INITIALIZATION
    // ========================================
    App.onReady(() => {
        console.log('🚀 Initializing all fixes...');
        
        // Critical fixes first
        injectSortableJS();
        overrideTableManagerDragMethod();
        fixTableManagerUUID();
        fixModalButtons();
        
        // Feature additions
        implementOceanV2API();
        addOceanAPISelector();
        fixCompleteColumns();
        removeTableAPISelector();
        
        // Debug helper
        window.trackingFixStatus = {
            sortable: !!window.Sortable,
            sortableDragDrop: !!window.tableManager?.columnSortable,
            oceanV2: !!window.trackingService?.trackOceanShipmentV2,
            tableManagerFixed: !!window.tableManager?.selectRow.toString().includes('String'),
            oceanSelectorAdded: !!document.getElementById('oceanApiVersionSection'),
            version: '3.0'
        };
        
        console.log('✅ All fixes initialized. Check window.trackingFixStatus for status.');
    });
    
})();

console.log('✅ Tracking Complete Fix v3.0 loaded');