// tracking-complete-fix-v2.js
// Fix completo per tutti i problemi del sistema di tracking
// Versione 2.0 - Include Ocean API v2 selector e tutti i fix critici

(function() {
    'use strict';
    
    console.log('🚀 TRACKING COMPLETE FIX v2.0 - Starting...');
    
    // ========================================
    // FIX 1: SORTABLE.JS INJECTION
    // ========================================
    function injectSortableJS() {
        if (!window.Sortable && !document.querySelector('script[src*="sortablejs"]')) {
            console.log('🔧 Injecting Sortable.js...');
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js';
            script.onload = () => {
                console.log('✅ Sortable.js loaded');
                // Re-enable column drag if tableManager exists
                if (window.tableManager && window.tableManager.enableColumnDrag) {
                    window.tableManager.enableColumnDrag();
                }
            };
            document.head.appendChild(script);
        }
    }
    
    // ========================================
    // FIX 2: OCEAN API v2.0 IMPLEMENTATION
    // ========================================
    function implementOceanV2API() {
        if (!window.trackingService) {
            console.warn('⏳ Waiting for trackingService...');
            setTimeout(implementOceanV2API, 500);
            return;
        }
        
        console.log('🔧 Implementing Ocean v2.0 API methods...');
        
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
            const shipmentData = data.shipment || data;
            
            return {
                success: true,
                trackingNumber: containerNumber,
                trackingType: 'container',
                status: this.normalizeStatus(shipmentData.status || 'registered'),
                lastUpdate: new Date().toISOString(),
                
                carrier: {
                    code: shipmentData.shipping_line?.scac || 'UNKNOWN',
                    name: shipmentData.shipping_line?.name || 'Unknown Carrier'
                },
                
                route: {
                    origin: {
                        port: shipmentData.route?.origin?.port || '-',
                        country: shipmentData.route?.origin?.country || '-',
                        date: shipmentData.route?.origin?.departure_date
                    },
                    destination: {
                        port: shipmentData.route?.destination?.port || '-',
                        country: shipmentData.route?.destination?.country || '-',
                        eta: shipmentData.route?.destination?.arrival_date
                    }
                },
                
                vessel: shipmentData.vessel ? {
                    name: shipmentData.vessel.name,
                    imo: shipmentData.vessel.imo,
                    voyage: shipmentData.voyage
                } : null,
                
                events: this.extractOceanV2Events(shipmentData),
                
                metadata: {
                    source: 'shipsgo_v2_ocean',
                    enriched_at: new Date().toISOString(),
                    raw: data,
                    shipsgo_id: shipmentData.id
                }
            };
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
    function initializeAllFixes() {
        console.log('🚀 Initializing all fixes...');
        
        // Critical fixes first
        injectSortableJS();
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
            oceanV2: !!window.trackingService?.trackOceanShipmentV2,
            tableManagerFixed: !!window.tableManager?.selectRow.toString().includes('String'),
            oceanSelectorAdded: !!document.getElementById('oceanApiVersionSection'),
            version: '2.0'
        };
        
        console.log('✅ All fixes initialized. Check window.trackingFixStatus for status.');
    }
    
    // Start initialization when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeAllFixes);
    } else {
        initializeAllFixes();
    }
    
})();

console.log('✅ Tracking Complete Fix v2.0 loaded');