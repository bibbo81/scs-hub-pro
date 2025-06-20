// API Operation Selector - Integrazione Completa nell'Architettura Esistente
// File: /pages/tracking/api-operation-selector-complete.js
// Integrato perfettamente con tracking-service.js, shipsgo-proxy.js e tracking-form-progressive.js

(function() {
    'use strict';
    
    console.log('🎯 API Operation Selector - Complete Integration starting...');
    
    // Configuration matching del tuo tracking-service.js
    const API_CONFIG = {
        v1: {
            version: 'v1.2',
            name: 'ShipsGo V1.2',
            endpoints: {
                list: '/ContainerService/GetShippingLineList',
                add: '/ContainerService/AddContainer', 
                info: '/ContainerService/GetContainerInfo'
            },
            supports: ['container', 'bl']
        },
        v2: {
            version: 'v2',
            name: 'ShipsGo V2.0', 
            endpoints: {
                list: '/air/airlines',
                add: '/air/shipments',
                info: '/air/shipments'
            },
            supports: ['awb']
        }
    };
    
    // Pattern recognition matching del tuo index.js
    const TRACKING_PATTERNS = {
        container: /^[A-Z]{4}\d{7}$/,
        bl: /^[A-Z]{4}\d{8,12}$/,
        awb: /^\d{3}-\d{8}$/,
        parcel: /^[A-Z0-9]{10,30}$/
    };
    
    // Aspetta che tutti i moduli siano caricati
    const waitForDependencies = setInterval(() => {
        if (window.showEnhancedTrackingForm && 
            window.trackingService && 
            window.ModalSystem) {
            clearInterval(waitForDependencies);
            console.log('✅ All dependencies loaded, integrating API selector...');
            integrateApiSelector();
        }
    }, 100);
    
    function integrateApiSelector() {
        // Hook nel form progressive esistente
        hookIntoProgressiveForm();
        
        // Enhance il submit handler esistente
        enhanceSubmitHandler();
        
        // Aggiungi utilità globali
        exposeGlobalUtilities();
    }
    
    function hookIntoProgressiveForm() {
        // Intercetta quando il modal viene mostrato
        const originalShowEnhanced = window.showEnhancedTrackingForm;
        
        if (originalShowEnhanced) {
            window.showEnhancedTrackingForm = function(...args) {
                const result = originalShowEnhanced.apply(this, args);
                
                // Aspetta che il modal sia renderizzato e aggiungi il selettore
                setTimeout(() => {
                    injectApiSelectorIntoModal();
                }, 300);
                
                return result;
            };
        }
    }
    
    function injectApiSelectorIntoModal() {
        // Cerca la sezione API nel modal (colonna 4)
        const apiCard = document.querySelector('.api-card .card-body, .api-section');
        if (!apiCard) {
            console.warn('⚠️ API section not found, searching alternatives...');
            // Fallback: cerca per l'elemento con toggle API
            const apiToggle = document.querySelector('#enh_useApi, [id*="useApi"]');
            if (apiToggle) {
                const container = apiToggle.closest('.card-body, .form-card, .api-card');
                if (container) {
                    injectSelectorIntoContainer(container);
                }
            }
            return;
        }
        
        injectSelectorIntoContainer(apiCard);
    }
    
    function injectSelectorIntoContainer(container) {
        // Verifica se già presente
        if (container.querySelector('.api-operation-section')) {
            console.log('✅ API selector already present');
            return;
        }
        
        // Trova il punto di inserimento (dopo benefits o toggle)
        const insertPoint = container.querySelector('.api-benefits, .toggle-header, .benefit:last-child') || container;
        
        // Crea il selettore con stile matching del form
        const selectorHTML = createApiSelectorHTML();
        
        if (insertPoint === container) {
            container.insertAdjacentHTML('beforeend', selectorHTML);
        } else {
            insertPoint.insertAdjacentHTML('afterend', selectorHTML);
        }
        
        // Setup event handlers
        setupApiSelectorHandlers();
        
        console.log('✅ API Operation Selector injected successfully');
    }
    
    function createApiSelectorHTML() {
        return `
            <div class="api-operation-section" style="margin-top: 20px;">
                <!-- Header con icona, matching del design esistente -->
                <div class="operation-header" style="display: flex; align-items: center; margin-bottom: 15px;">
                    <h4 style="margin: 0; color: #8d6e63; font-size: 14px; font-weight: 600;">
                        <i class="fas fa-code-branch" style="margin-right: 8px; color: #a1887f;"></i>
                        Operazione API
                    </h4>
                </div>
                
                <p style="margin: 0 0 15px 0; font-size: 12px; color: rgba(255,255,255,0.8); line-height: 1.4;">
                    Seleziona il tipo di operazione da eseguire
                </p>
                
                <!-- Selettore radio con stile del form -->
                <div class="operation-selector" style="display: flex; flex-direction: column; gap: 8px;">
                    
                    <!-- POST Option -->
                    <label class="operation-radio-option post-option" 
                           style="display: flex; align-items: center; padding: 12px; border: 2px solid rgba(255,255,255,0.3); border-radius: 8px; cursor: pointer; transition: all 0.3s ease; background: rgba(255,255,255,0.1);">
                        <input type="radio" name="api_operation" value="post" checked 
                               style="margin-right: 12px; accent-color: #8d6e63; transform: scale(1.3);">
                        <div style="flex: 1;">
                            <div style="font-weight: 600; color: white; font-size: 13px; display: flex; align-items: center;">
                                <span style="margin-right: 8px; font-size: 16px;">📤</span>
                                POST - Inserire Nuova Spedizione
                            </div>
                            <div style="font-size: 11px; color: rgba(255,255,255,0.8); margin-top: 3px; line-height: 1.3;">
                                Crea una nuova spedizione nel sistema ShipsGo
                            </div>
                        </div>
                    </label>
                    
                    <!-- GET Option -->
                    <label class="operation-radio-option get-option" 
                           style="display: flex; align-items: center; padding: 12px; border: 2px solid rgba(255,255,255,0.2); border-radius: 8px; cursor: pointer; transition: all 0.3s ease; background: rgba(255,255,255,0.05);">
                        <input type="radio" name="api_operation" value="get" 
                               style="margin-right: 12px; accent-color: #8d6e63; transform: scale(1.3);">
                        <div style="flex: 1;">
                            <div style="font-weight: 600; color: white; font-size: 13px; display: flex; align-items: center;">
                                <span style="margin-right: 8px; font-size: 16px;">📥</span>
                                GET - Richiamare Spedizione Esistente
                            </div>
                            <div style="font-size: 11px; color: rgba(255,255,255,0.8); margin-top: 3px; line-height: 1.3;">
                                Recupera dati di una spedizione già presente
                            </div>
                        </div>
                    </label>
                    
                    <!-- LIST Option -->
                    <label class="operation-radio-option list-option" 
                           style="display: flex; align-items: center; padding: 12px; border: 2px solid rgba(255,255,255,0.2); border-radius: 8px; cursor: pointer; transition: all 0.3s ease; background: rgba(255,255,255,0.05);">
                        <input type="radio" name="api_operation" value="list" 
                               style="margin-right: 12px; accent-color: #8d6e63; transform: scale(1.3);">
                        <div style="flex: 1;">
                            <div style="font-weight: 600; color: white; font-size: 13px; display: flex; align-items: center;">
                                <span style="margin-right: 8px; font-size: 16px;">📋</span>
                                LIST - Lista Carriers/Airlines
                            </div>
                            <div style="font-size: 11px; color: rgba(255,255,255,0.8); margin-top: 3px; line-height: 1.3;">
                                <span id="list-operation-desc">Recupera lista carriers disponibili</span>
                            </div>
                        </div>
                    </label>
                </div>
                
                <!-- Preview Box con styling matching -->
                <div class="operation-preview-box" id="operationPreviewBox" 
                     style="margin-top: 15px; padding: 12px; background: rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.2); border-radius: 8px; display: none; backdrop-filter: blur(5px);">
                    <div style="display: flex; align-items: center; margin-bottom: 8px;">
                        <i class="fas fa-info-circle" style="color: #fff; margin-right: 8px; font-size: 14px;"></i>
                        <strong style="color: white; font-size: 12px;" id="previewApiTitle">Operazione Selezionata</strong>
                    </div>
                    <div id="previewApiDetails" style="font-size: 11px; color: rgba(255,255,255,0.9); line-height: 1.4;">
                        Dettagli operazione...
                    </div>
                </div>
            </div>
        `;
    }
    
    function setupApiSelectorHandlers() {
        setTimeout(() => {
            const operationRadios = document.querySelectorAll('input[name="api_operation"]');
            const operationOptions = document.querySelectorAll('.operation-radio-option');
            const previewBox = document.getElementById('operationPreviewBox');
            const previewTitle = document.getElementById('previewApiTitle');
            const previewDetails = document.getElementById('previewApiDetails');
            const listDesc = document.getElementById('list-operation-desc');
            
            if (!operationRadios.length) {
                console.warn('⚠️ API operation radios not found');
                return;
            }
            
            console.log('✅ Setting up API operation handlers...');
            
            // Hover effects matching del design
            operationOptions.forEach(option => {
                option.addEventListener('mouseenter', () => {
                    if (!option.querySelector('input').checked) {
                        option.style.background = 'rgba(255,255,255,0.15)';
                        option.style.borderColor = 'rgba(255,255,255,0.5)';
                        option.style.transform = 'translateY(-1px)';
                        option.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
                    }
                });
                
                option.addEventListener('mouseleave', () => {
                    if (!option.querySelector('input').checked) {
                        option.style.background = 'rgba(255,255,255,0.05)';
                        option.style.borderColor = 'rgba(255,255,255,0.2)';
                        option.style.transform = 'translateY(0)';
                        option.style.boxShadow = 'none';
                    }
                });
            });
            
            // Change handlers
            operationRadios.forEach(radio => {
                radio.addEventListener('change', () => {
                    updateOperationStyles();
                    updateOperationPreview();
                    updateListDescription();
                });
            });
            
            // Tracking input handlers per auto-detection
            const trackingInput = document.querySelector('#enh_trackingNumber, [id*="trackingNumber"]');
            if (trackingInput) {
                trackingInput.addEventListener('input', debounce(() => {
                    updateListDescription();
                    updateOperationPreview();
                }, 300));
            }
            
            function updateOperationStyles() {
                operationOptions.forEach(option => {
                    const radio = option.querySelector('input[type="radio"]');
                    if (radio && radio.checked) {
                        option.style.background = 'rgba(255,255,255,0.2)';
                        option.style.borderColor = 'rgba(255,255,255,0.6)';
                        option.style.boxShadow = '0 0 0 2px rgba(255,255,255,0.3)';
                        option.style.transform = 'scale(1.02)';
                    } else {
                        option.style.background = 'rgba(255,255,255,0.05)';
                        option.style.borderColor = 'rgba(255,255,255,0.2)';
                        option.style.boxShadow = 'none';
                        option.style.transform = 'scale(1)';
                    }
                });
            }
            
            function updateOperationPreview() {
                const selectedOperation = document.querySelector('input[name="api_operation"]:checked')?.value;
                const trackingType = detectTrackingTypeFromInput();
                const apiConfig = getApiConfigForType(trackingType);
                
                if (!selectedOperation || !previewBox) return;
                
                let title, details, endpoint;
                
                switch (selectedOperation) {
                    case 'post':
                        title = `📤 POST - Inserimento (${apiConfig.name})`;
                        endpoint = apiConfig.endpoints.add;
                        details = `Endpoint: ${endpoint}\nCreerà una nuova spedizione nel sistema ${apiConfig.name}`;
                        break;
                        
                    case 'get':
                        title = `📥 GET - Recupero (${apiConfig.name})`;
                        endpoint = apiConfig.endpoints.info;
                        details = `Endpoint: ${endpoint}\nRecupererà i dati aggiornati dal sistema ${apiConfig.name}`;
                        break;
                        
                    case 'list':
                        title = `📋 LIST - Lista (${apiConfig.name})`;
                        endpoint = apiConfig.endpoints.list;
                        details = `Endpoint: ${endpoint}\nRecupererà la lista completa ${trackingType === 'awb' ? 'airlines' : 'shipping lines'}`;
                        break;
                }
                
                if (previewTitle) previewTitle.textContent = title;
                if (previewDetails) previewDetails.textContent = details;
                if (previewBox) {
                    previewBox.style.display = 'block';
                    // Animazione di fade in
                    previewBox.style.opacity = '0';
                    setTimeout(() => {
                        previewBox.style.transition = 'opacity 0.3s ease';
                        previewBox.style.opacity = '1';
                    }, 10);
                }
            }
            
            function updateListDescription() {
                if (!listDesc) return;
                
                const trackingType = detectTrackingTypeFromInput();
                const apiConfig = getApiConfigForType(trackingType);
                
                listDesc.textContent = `Recupera lista ${trackingType === 'awb' ? 'airlines' : 'shipping lines'} (${apiConfig.name})`;
            }
            
            function detectTrackingTypeFromInput() {
                const input = document.querySelector('#enh_trackingNumber, [id*="trackingNumber"]');
                if (!input || !input.value) return 'container';
                
                const number = input.value.trim().toUpperCase();
                
                // Use patterns from your index.js
                for (const [type, pattern] of Object.entries(TRACKING_PATTERNS)) {
                    if (pattern.test(number)) {
                        return type === 'awb' ? 'awb' : 'container';
                    }
                }
                
                return 'container';
            }
            
            function getApiConfigForType(trackingType) {
                return trackingType === 'awb' ? API_CONFIG.v2 : API_CONFIG.v1;
            }
            
            // Initialize
            updateOperationStyles();
            updateOperationPreview();
            updateListDescription();
            
        }, 200);
    }
    
    function enhanceSubmitHandler() {
        // Wait for handleEnhancedSubmit to be available
        const waitForSubmitHandler = setInterval(() => {
            if (window.handleEnhancedSubmit) {
                clearInterval(waitForSubmitHandler);
                
                const originalSubmit = window.handleEnhancedSubmit;
                
                window.handleEnhancedSubmit = async function(e) {
                    e.preventDefault();
                    
                    // Raccogli operazione API selezionata
                    const selectedOperation = document.querySelector('input[name="api_operation"]:checked')?.value || 'post';
                    const useApi = document.querySelector('#enh_useApi, [id*="useApi"]')?.checked;
                    
                    // Se API disabilitata, usa comportamento originale
                    if (!useApi) {
                        console.log('🔧 API disabled, using original submit handler');
                        return originalSubmit.call(this, e);
                    }
                    
                    // Collect form data usando i selettori del tuo sistema
                    const formData = collectEnhancedFormData();
                    
                    if (!formData.tracking_number) {
                        alert('Inserisci un numero di tracking');
                        return;
                    }
                    
                    // Auto-detect type usando i tuoi pattern
                    const trackingType = detectTrackingTypeFromNumber(formData.tracking_number);
                    const apiConfig = getApiConfigForType(trackingType);
                    
                    console.group(`🎯 Enhanced API Operation: ${selectedOperation.toUpperCase()}`);
                    console.log('📝 Tracking Number:', formData.tracking_number);
                    console.log('🔧 Detected Type:', trackingType);
                    console.log('🌐 API Version:', apiConfig.name);
                    console.log('⚙️ Operation:', selectedOperation);
                    console.log('🎯 Endpoint:', apiConfig.endpoints[selectedOperation === 'post' ? 'add' : selectedOperation === 'get' ? 'info' : 'list']);
                    
                    try {
                        let apiResult = null;
                        
                        // Esegue l'operazione selezionata usando il tuo shipsgo-proxy
                        switch (selectedOperation) {
                            case 'post':
                                apiResult = await executeApiOperation(apiConfig, 'add', 'POST', formData);
                                break;
                            case 'get':
                                apiResult = await executeApiOperation(apiConfig, 'info', 'GET', formData);
                                break;
                            case 'list':
                                apiResult = await executeApiOperation(apiConfig, 'list', 'GET', {});
                                showListResultInPreview(apiResult, apiConfig.name);
                                console.groupEnd();
                                return; // Non procede con salvataggio per LIST
                        }
                        
                        console.log('✅ API Operation completed successfully');
                        console.log('📊 API Result:', apiResult);
                        console.groupEnd();
                        
                        // Arricchisce formData con risultati API se disponibili
                        if (apiResult && apiResult.success) {
                            enrichFormDataWithApiResult(formData, apiResult);
                        }
                        
                        // Procede con submit originale
                        return originalSubmit.call(this, e);
                        
                    } catch (error) {
                        console.error('❌ API Operation failed:', error);
                        console.groupEnd();
                        
                        // Mostra warning ma procede comunque
                        if (window.notificationSystem) {
                            window.notificationSystem.warning('⚠️ API call failed, proceeding with manual data: ' + error.message);
                        }
                        
                        return originalSubmit.call(this, e);
                    }
                };
                
                console.log('✅ Enhanced submit handler with API operations ready');
            }
        }, 100);
    }
    
    // ========================================
    // API OPERATIONS usando il tuo shipsgo-proxy
    // ========================================
    
    async function executeApiOperation(apiConfig, operation, method, formData) {
        const endpoint = apiConfig.endpoints[operation];
        const version = apiConfig.version;
        
        console.log(`🌐 Calling shipsgo-proxy: ${version} ${method} ${endpoint}`);
        
        let requestData = {
            version,
            endpoint,
            method
        };
        
        // Prepara dati basati su operazione e API version
        if (method === 'POST' && formData.tracking_number) {
            if (version === 'v1.2') {
                requestData.data = {
                    containerNumber: formData.tracking_number,
                    shippingLine: formData.carrier_code || 'MSC'
                };
            } else if (version === 'v2') {
                requestData.data = {
                    awbNumber: formData.tracking_number,
                    airline: formData.carrier_code || 'LH',
                    originAirport: formData.origin_port,
                    destinationAirport: formData.destination_port
                };
            }
        } else if (method === 'GET' && formData.tracking_number) {
            if (version === 'v1.2') {
                requestData.params = {
                    containerNumber: formData.tracking_number
                };
            } else if (version === 'v2') {
                // Per V2 GET, l'ID va nell'endpoint
                requestData.endpoint = `${endpoint}/${formData.tracking_number}`;
            }
        }
        
        console.log('📤 Request data:', requestData);
        
        // Chiama il tuo shipsgo-proxy
        const startTime = performance.now();
        const response = await fetch('/.netlify/functions/shipsgo-proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });
        
        const duration = Math.round(performance.now() - startTime);
        const result = await response.json();
        
        console.log(`📥 Response (${duration}ms):`, result);
        
        if (!result.success) {
            throw new Error(result.error || `API call failed: ${result.status}`);
        }
        
        return result;
    }
    
    function collectEnhancedFormData() {
        // Usa i selettori del tuo form progressive
        return {
            tracking_number: (document.querySelector('#enh_trackingNumber, [id*="trackingNumber"]')?.value || '').trim().toUpperCase(),
            tracking_type: document.querySelector('#enh_trackingType, [id*="trackingType"]')?.value,
            carrier_code: document.querySelector('#enh_carrier, [id*="carrier"]')?.value,
            origin_port: (document.querySelector('#enh_origin, [id*="origin"]')?.value || '').toUpperCase(),
            destination_port: (document.querySelector('#enh_destination, [id*="destination"]')?.value || '').toUpperCase(),
            reference_number: document.querySelector('#enh_reference, [id*="reference"]')?.value,
            use_api: document.querySelector('#enh_useApi, [id*="useApi"]')?.checked
        };
    }
    
    function detectTrackingTypeFromNumber(trackingNumber) {
        // Usa i tuoi pattern da index.js
        for (const [type, pattern] of Object.entries(TRACKING_PATTERNS)) {
            if (pattern.test(trackingNumber)) {
                return type === 'awb' ? 'awb' : 'container';
            }
        }
        return 'container';
    }
    
    function getApiConfigForType(trackingType) {
        return trackingType === 'awb' ? API_CONFIG.v2 : API_CONFIG.v1;
    }
    
    function enrichFormDataWithApiResult(formData, apiResult) {
        // Arricchisce i dati form con risultati API
        if (apiResult && apiResult.data) {
            // Marca che i dati sono stati arricchiti dall'API
            formData._apiEnriched = true;
            formData._apiSource = apiResult.source || 'shipsgo';
            formData._apiTimestamp = new Date().toISOString();
        }
    }
    
    function showListResultInPreview(apiResult, apiName) {
        const previewBox = document.getElementById('operationPreviewBox');
        if (!previewBox || !apiResult.success) return;
        
        let displayData = [];
        
        // Parse risposta basata su struttura API
        if (apiName.includes('V2.0') && apiResult.data?.airlines) {
            displayData = apiResult.data.airlines.slice(0, 8).map(item => ({
                code: item.code || item.iata || item.icao,
                name: item.name || item.airlineName
            }));
        } else if (apiResult.data?.data) {
            displayData = apiResult.data.data.slice(0, 8).map(item => ({
                code: item.shippingLineCode || item.code,
                name: item.shippingLineName || item.name
            }));
        }
        
        previewBox.innerHTML = `
            <div style="max-height: 300px; overflow-y: auto;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                    <div style="display: flex; align-items: center;">
                        <i class="fas fa-list" style="color: #fff; margin-right: 8px; font-size: 14px;"></i>
                        <strong style="color: white; font-size: 13px;">📋 Lista ${apiName}</strong>
                    </div>
                    <span style="font-size: 10px; color: rgba(255,255,255,0.7); background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px;">
                        ${displayData.length} items
                    </span>
                </div>
                
                <div style="display: grid; gap: 6px; font-size: 11px;">
                    ${displayData.length > 0 ? displayData.map(item => 
                        `<div style="padding: 8px 10px; background: rgba(255,255,255,0.1); border-radius: 6px; border-left: 3px solid rgba(255,255,255,0.5); display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <strong style="color: #fff; font-size: 12px;">${item.code}</strong>
                                <div style="color: rgba(255,255,255,0.8); font-size: 10px; margin-top: 1px;">${item.name}</div>
                            </div>
                            <i class="fas fa-check-circle" style="color: #4caf50; font-size: 12px;"></i>
                        </div>`
                    ).join('') : '<div style="color: rgba(255,255,255,0.8); text-align: center; padding: 20px;">Nessun dato disponibile</div>'}
                </div>
                
                ${displayData.length >= 8 ? 
                    '<div style="margin-top: 10px; font-size: 10px; color: rgba(255,255,255,0.7); text-align: center; font-style: italic;">... e altri disponibili</div>' : ''}
            </div>
        `;
        
        previewBox.style.display = 'block';
        
        // Notifica successo
        if (window.notificationSystem) {
            window.notificationSystem.success(`✅ Lista ${apiName} recuperata con successo! (${displayData.length} items)`);
        }
    }
    
    // ========================================
    // GLOBAL UTILITIES
    // ========================================
    
    function exposeGlobalUtilities() {
        // Espone utilità per debugging e test
        window.apiOperationSelector = {
            getSelectedOperation: () => document.querySelector('input[name="api_operation"]:checked')?.value,
            setOperation: (op) => {
                const radio = document.querySelector(`input[name="api_operation"][value="${op}"]`);
                if (radio) {
                    radio.checked = true;
                    radio.dispatchEvent(new Event('change'));
                }
            },
            testApiCall: async (operation, trackingNumber) => {
                const type = detectTrackingTypeFromNumber(trackingNumber);
                const config = getApiConfigForType(type);
                return await executeApiOperation(config, operation, operation === 'list' ? 'GET' : 'POST', {
                    tracking_number: trackingNumber
                });
            },
            showPreview: () => {
                const previewBox = document.getElementById('operationPreviewBox');
                if (previewBox) previewBox.style.display = 'block';
            }
        };
        
        console.log('✅ Global utilities exposed: window.apiOperationSelector');
    }
    
    // ========================================
    // UTILITY FUNCTIONS
    // ========================================
    
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
    
    console.log('🎯 API Operation Selector - Complete Integration loaded!');
    console.log('📊 Available operations: POST (create), GET (retrieve), LIST (browse)');
    console.log('🔧 Compatible with tracking-service.js, shipsgo-proxy.js, and tracking-form-progressive.js');
    
})();