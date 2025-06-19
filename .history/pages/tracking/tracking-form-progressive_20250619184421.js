// /pages/tracking/tracking-form-progressive.js
// Progressive Enhancement del form tracking - NON sostituisce, INTEGRA!

(function() {
    'use strict';
    
    console.log('🟢 PROGRESSIVE FORM: Script started');
    window.PROGRESSIVE_DEBUG = true;

    // Salva riferimento al form originale
    let originalShowAddTrackingForm = null;
    
    // Flag per abilitare/disabilitare enhanced version
    const ENABLE_ENHANCED = localStorage.getItem('enableEnhancedTracking') !== 'false';
    
    // SOLUZIONE: Usa MutationObserver per detectare quando showAddTrackingForm viene definita
    function waitForShowAddTrackingForm() {
        return new Promise((resolve) => {
            // Controlla se è già disponibile
            if (window.showAddTrackingForm) {
                resolve();
                return;
            }
            
            // Altrimenti aspetta che venga definita
            const checkInterval = setInterval(() => {
                if (window.showAddTrackingForm) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 50);
            
            // Timeout di sicurezza (30 secondi)
            setTimeout(() => {
                clearInterval(checkInterval);
                console.warn('⚠️ PROGRESSIVE FORM: Timeout waiting for showAddTrackingForm');
                resolve();
            }, 30000);
        });
    }
    
    // SOLUZIONE: Inizializza solo dopo che TUTTO è pronto
    async function initializeWhenReady() {
        console.log('🟢 PROGRESSIVE FORM: Waiting for dependencies...');
        
        // Aspetta che showAddTrackingForm sia definita
        await waitForShowAddTrackingForm();
        
        // Aspetta che ModalSystem sia pronto
        await new Promise((resolve) => {
            const checkModal = setInterval(() => {
                if (window.ModalSystem) {
                    clearInterval(checkModal);
                    resolve();
                }
            }, 50);
        });
        
        console.log('🟢 PROGRESSIVE FORM: All dependencies ready!');
        initializeProgressiveEnhancement();
    }
    
    // Avvia l'inizializzazione
    initializeWhenReady();
    
    function initializeProgressiveEnhancement() {
        console.log('🟢 PROGRESSIVE FORM: Initializing enhancement');
        console.log('Current showAddTrackingForm:', typeof window.showAddTrackingForm);

        // Controlla se la funzione è davvero disponibile
        if (typeof window.showAddTrackingForm !== 'function') {
            console.error('❌ PROGRESSIVE FORM: showAddTrackingForm is not a function!');
            return;
        }

        // Salva funzione originale
        originalShowAddTrackingForm = window.showAddTrackingForm;
        console.log('✅ PROGRESSIVE FORM: Original function saved');

        // Override con wrapper che decide quale versione usare
        window.showAddTrackingForm = function(options) {
            console.log('🎯 PROGRESSIVE FORM: Wrapper called with enhanced=' + (ENABLE_ENHANCED && isEnhancedReady()));
            
            if (ENABLE_ENHANCED && isEnhancedReady()) {
                showEnhancedTrackingForm(options);
            } else {
                // Fallback al form originale
                console.log('🔄 PROGRESSIVE FORM: Using original form');
                originalShowAddTrackingForm(options);
            }
        };
        
        // Esponi la funzione enhanced per test diretti
        window.showEnhancedTrackingForm = showEnhancedTrackingForm;
        window.originalShowAddTrackingForm = originalShowAddTrackingForm;
        
        // Aggiungi toggle nelle impostazioni
        addEnhancedToggle();
        
        console.log('✅ [Progressive Enhancement] Tracking form wrapper installed successfully');
    }
    
    function isEnhancedReady() {
        const ready = !!(window.trackingService && window.ImportManager);
        console.log('🔍 Enhanced ready check:', {
            trackingService: !!window.trackingService,
            ImportManager: !!window.ImportManager,
            result: ready
        });
        return ready;
    }
    
    // ========================================
    // ENHANCED FORM - VERSIONE SEMPLIFICATA
    // ========================================
    
    function showEnhancedTrackingForm(options = {}) {
        console.log('🚀 PROGRESSIVE FORM: Showing enhanced form');
        
        // Usa il modal system esistente
        window.ModalSystem.show({
            title: '📦 Aggiungi Tracking Enhanced',
            content: renderSimplifiedForm(),
            size: 'large',
            showFooter: false,
            className: 'enhanced-tracking-modal-v2'
        });
        
        // Setup dopo rendering
        setTimeout(() => {
            setupEnhancedInteractions();
            // Se ci sono opzioni (es. dati da pre-riempire)
            if (options && Object.keys(options).length > 0) {
                prefillForm(options);
            }
        }, 100);
    }
    
    function renderSimplifiedForm() {
        return `
            <div class="enhanced-tracking-form">
                <!-- Tab Navigation -->
                <div class="tab-navigation">
                    <button class="tab-btn active" data-target="single">
                        <i class="fas fa-plus"></i> Singolo
                    </button>
                    <button class="tab-btn" data-target="import">
                        <i class="fas fa-upload"></i> Import Multiplo
                    </button>
                </div>
                
                <!-- Single Tab -->
                <div class="tab-content active" data-tab="single">
                    <form id="enhancedSingleForm">
                        <!-- Auto-detection Banner -->
                        <div id="detectionBanner" class="detection-banner" style="display: none;">
                            <div class="detection-spinner">
                                <i class="fas fa-spinner fa-spin"></i>
                                <span>Rilevamento automatico...</span>
                            </div>
                            <div class="detection-result" style="display: none;">
                                <i class="fas fa-check-circle text-success"></i>
                                <span class="detection-text"></span>
                                <button type="button" class="btn btn-sm btn-outline-primary" onclick="applyDetection()">
                                    Applica
                                </button>
                            </div>
                        </div>
                        
                        <!-- Tracking Number -->
                        <div class="form-group">
                            <label>Numero Tracking *</label>
                            <input type="text" 
                                   id="enh_trackingNumber" 
                                   class="form-control form-control-lg" 
                                   placeholder="Es: MSKU1234567, 176-12345678"
                                   required>
                            
                            <!-- Quick Examples -->
                            <div class="quick-examples">
                                <small class="text-muted">Esempi veloci:</small>
                                <button type="button" class="example-btn" data-example="MSKU1234567">Container</button>
                                <button type="button" class="example-btn" data-example="176-12345678">Air Cargo</button>
                                <button type="button" class="example-btn" data-example="GESU1234567">MSC</button>
                            </div>
                        </div>
                        
                        <!-- Type and Carrier -->
                        <div class="form-row">
                            <div class="form-group">
                                <label>Tipo Tracking</label>
                                <select id="enh_trackingType" class="form-control">
                                    <option value="auto">🔍 Auto-detect</option>
                                    <option value="container">🚢 Container</option>
                                    <option value="awb">✈️ Air Waybill</option>
                                    <option value="bl">📄 Bill of Lading</option>
                                    <option value="parcel">📦 Parcel</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label>Vettore</label>
                                <select id="enh_carrier" class="form-control">
                                    <option value="">Seleziona automaticamente</option>
                                </select>
                            </div>
                        </div>
                        
                        <!-- Shipping Details -->
                        <div class="form-row">
                            <div class="form-group">
                                <label>Origine</label>
                                <input type="text" 
                                       id="enh_origin" 
                                       class="form-control" 
                                       placeholder="Porto/Aeroporto origine">
                            </div>
                            
                            <div class="form-group">
                                <label>Destinazione</label>
                                <input type="text" 
                                       id="enh_destination" 
                                       class="form-control" 
                                       placeholder="Porto/Aeroporto destinazione">
                            </div>
                        </div>
                        
                        <!-- Reference and Status -->
                        <div class="form-row">
                            <div class="form-group">
                                <label>Riferimento</label>
                                <input type="text" 
                                       id="enh_reference" 
                                       class="form-control" 
                                       placeholder="Es: PO-2024-001">
                            </div>
                            
                            <div class="form-group">
                                <label>Stato Iniziale</label>
                                <select id="enh_status" class="form-control">
                                    <option value="registered">📝 Registrato</option>
                                    <option value="in_transit">🚛 In Transito</option>
                                    <option value="arrived">📍 Arrivato</option>
                                    <option value="customs_cleared">✅ Sdoganato</option>
                                </select>
                            </div>
                        </div>
                        
                        <!-- API Option -->
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="enh_useApi" checked>
                                <span class="checkmark"></span>
                                🔄 Recupera dati in tempo reale (API ShipsGo)
                            </label>
                            <small class="text-muted">Disattiva per inserimento manuale</small>
                        </div>
                        
                        <!-- Actions -->
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" onclick="window.ModalSystem.closeAll()">
                                Annulla
                            </button>
                            <button type="submit" class="btn btn-primary" id="enhSubmitBtn">
                                <i class="fas fa-plus"></i> Aggiungi Tracking
                            </button>
                        </div>
                    </form>
                </div>
                
                <!-- Import Tab -->
                <div class="tab-content" data-tab="import">
                    <div class="import-zone">
                        <div class="drop-zone" id="enhDropZone">
                            <div class="drop-content">
                                <i class="fas fa-cloud-upload-alt"></i>
                                <h4>Trascina qui il file Excel/CSV</h4>
                                <p>Oppure <a href="#" onclick="document.getElementById('enhFileInput').click()">seleziona file</a></p>
                                <small class="text-muted">Supporta .xlsx, .xls, .csv</small>
                            </div>
                            <input type="file" 
                                   id="enhFileInput" 
                                   accept=".xlsx,.xls,.csv" 
                                   style="display: none;">
                        </div>
                        
                        <div class="import-info">
                            <h5>📋 Import multiplo semplificato</h5>
                            <ul>
                                <li>✅ Auto-detection formato file</li>
                                <li>✅ Mapping automatico colonne</li>
                                <li>✅ Preview prima dell'import</li>
                                <li>✅ Compatibile con sistema esistente</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
            
            <style>
            .enhanced-tracking-form {
                max-width: 800px;
                margin: 0 auto;
            }
            
            .tab-navigation {
                display: flex;
                border-bottom: 2px solid var(--border-color);
                margin-bottom: 1.5rem;
            }
            
            .tab-btn {
                flex: 1;
                padding: 12px 16px;
                border: none;
                background: transparent;
                cursor: pointer;
                font-weight: 500;
                border-bottom: 3px solid transparent;
                transition: all 0.2s;
            }
            
            .tab-btn:hover {
                background: var(--hover-bg);
            }
            
            .tab-btn.active {
                border-bottom-color: var(--primary-color);
                color: var(--primary-color);
            }
            
            .tab-content {
                display: none;
            }
            
            .tab-content.active {
                display: block;
                animation: fadeIn 0.3s ease;
            }
            
            .detection-banner {
                background: var(--bg-secondary);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                padding: 12px 16px;
                margin-bottom: 1rem;
            }
            
            .detection-spinner {
                display: flex;
                align-items: center;
                gap: 8px;
                color: var(--text-muted);
            }
            
            .detection-result {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .quick-examples {
                margin-top: 8px;
                display: flex;
                gap: 8px;
                align-items: center;
                flex-wrap: wrap;
            }
            
            .example-btn {
                background: var(--bg-secondary);
                border: 1px solid var(--border-color);
                border-radius: 4px;
                padding: 4px 8px;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .example-btn:hover {
                background: var(--primary-color);
                color: white;
            }
            
            .form-row {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 1rem;
            }
            
            .checkbox-label {
                display: flex;
                align-items: center;
                gap: 8px;
                cursor: pointer;
                font-weight: 500;
            }
            
            .drop-zone {
                border: 2px dashed var(--border-color);
                border-radius: 8px;
                padding: 2rem;
                text-align: center;
                transition: all 0.2s;
            }
            
            .drop-zone:hover, .drop-zone.dragover {
                border-color: var(--primary-color);
                background: var(--bg-secondary);
            }
            
            .drop-content i {
                font-size: 3rem;
                color: var(--text-muted);
                margin-bottom: 1rem;
            }
            
            .import-info {
                margin-top: 1.5rem;
                padding: 1rem;
                background: var(--bg-secondary);
                border-radius: 8px;
            }
            
            .import-info ul {
                margin: 0.5rem 0 0 0;
                padding-left: 1rem;
            }
            
            .import-info li {
                margin: 0.25rem 0;
            }
            
            .form-actions {
                display: flex;
                gap: 1rem;
                justify-content: flex-end;
                margin-top: 1.5rem;
                padding-top: 1rem;
                border-top: 1px solid var(--border-color);
            }
            
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            @media (max-width: 768px) {
                .form-row {
                    grid-template-columns: 1fr;
                }
                
                .tab-navigation {
                    flex-direction: column;
                }
                
                .form-actions {
                    flex-direction: column;
                }
            }
            </style>
        `;
    }
    
    // Variables per l'import
    let pendingImport = null;
    let detectedData = null;
    
    function setupEnhancedInteractions() {
        console.log('🔧 PROGRESSIVE FORM: Setting up interactions');
        
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const targetTab = this.dataset.target;
                
                // Update buttons
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                
                // Update content
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                document.querySelector(`[data-tab="${targetTab}"]`).classList.add('active');
            });
        });
        
        // Single form
        setupSingleFormInteractions();
        
        // Import interactions
        setupImportInteractions();
    }
    
    function setupSingleFormInteractions() {
        const form = document.getElementById('enhancedSingleForm');
        const trackingInput = document.getElementById('enh_trackingNumber');
        const typeSelect = document.getElementById('enh_trackingType');
        const carrierSelect = document.getElementById('enh_carrier');
        
        // Auto-detection
        let detectionTimeout;
        trackingInput.addEventListener('input', (e) => {
            clearTimeout(detectionTimeout);
            const value = e.target.value.trim();
            
            if (value.length < 3) {
                clearDetection();
                return;
            }
            
            showDetectionSpinner();
            detectionTimeout = setTimeout(() => {
                detectAndUpdateType(value);
            }, 500);
        });
        
        // Type change updates carriers
        typeSelect.addEventListener('change', () => {
            updateCarrierOptions(typeSelect.value);
        });
        
        // Example buttons
        document.querySelectorAll('.example-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                trackingInput.value = btn.dataset.example;
                trackingInput.dispatchEvent(new Event('input'));
            });
        });
        
        // Form submit
        form.addEventListener('submit', handleEnhancedSubmit);
        
        // Initialize carriers
        updateCarrierOptions('auto');
    }
    
    function setupImportInteractions() {
        const dropZone = document.getElementById('enhDropZone');
        const fileInput = document.getElementById('enhFileInput');
        
        // Drag & Drop
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });
        
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });
        
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleFileSelect(files[0]);
            }
        });
        
        // File input
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFileSelect(e.target.files[0]);
            }
        });
    }
    
    // ========================================
    // AUTO-DETECTION LOGIC
    // ========================================
    
    function showDetectionSpinner() {
        const banner = document.getElementById('detectionBanner');
        const spinner = banner.querySelector('.detection-spinner');
        const result = banner.querySelector('.detection-result');
        
        banner.style.display = 'block';
        spinner.style.display = 'flex';
        result.style.display = 'none';
    }
    
    function clearDetection() {
        const banner = document.getElementById('detectionBanner');
        banner.style.display = 'none';
        detectedData = null;
    }
    
    function detectAndUpdateType(trackingNumber) {
        // Simple detection logic
        let type = 'unknown';
        let carrier = '';
        
        if (/^[A-Z]{4}\d{7}/.test(trackingNumber)) {
            type = 'container';
            if (trackingNumber.startsWith('MSKU')) carrier = 'MSK';
            else if (trackingNumber.startsWith('GESU')) carrier = 'MSC';
            else if (trackingNumber.startsWith('HLCU')) carrier = 'HAPAG-LLOYD';
        } else if (/^\d{3}-\d{8}/.test(trackingNumber)) {
            type = 'awb';
            carrier = 'LUFTHANSA';
        } else if (/^[A-Z]{2}\d{6,}/.test(trackingNumber)) {
            type = 'bl';
        }
        
        if (type !== 'unknown') {
            showDetectionResult(type, carrier);
        } else {
            clearDetection();
        }
    }
    
    function showDetectionResult(type, carrier) {
        const banner = document.getElementById('detectionBanner');
        const spinner = banner.querySelector('.detection-spinner');
        const result = banner.querySelector('.detection-result');
        const text = result.querySelector('.detection-text');
        
        detectedData = { type, carrier };
        
        const typeLabels = {
            container: '🚢 Container',
            awb: '✈️ Air Waybill',
            bl: '📄 Bill of Lading'
        };
        
        text.textContent = `Rilevato: ${typeLabels[type]}${carrier ? ` (${carrier})` : ''}`;
        
        spinner.style.display = 'none';
        result.style.display = 'flex';
    }
    
    window.applyDetection = function() {
        if (!detectedData) return;
        
        document.getElementById('enh_trackingType').value = detectedData.type;
        if (detectedData.carrier) {
            updateCarrierOptions(detectedData.type);
            setTimeout(() => {
                document.getElementById('enh_carrier').value = detectedData.carrier;
            }, 100);
        }
        
        clearDetection();
    };
    
    function updateCarrierOptions(type) {
        const select = document.getElementById('enh_carrier');
        select.innerHTML = '<option value="">Seleziona automaticamente</option>';
        
        const carriers = getCarriersByType(type);
        carriers.forEach(carrier => {
            const option = document.createElement('option');
            option.value = carrier.code;
            option.textContent = `${carrier.code} - ${carrier.name}`;
            select.appendChild(option);
        });
    }
    
    function getCarriersByType(type) {
        if (type === 'container') {
            return [
                { code: 'MSK', name: 'Maersk Line' },
                { code: 'MSC', name: 'Mediterranean Shipping Company' },
                { code: 'HAPAG-LLOYD', name: 'Hapag-Lloyd' },
                { code: 'EVERGREEN', name: 'Evergreen Marine' },
                { code: 'COSCO', name: 'COSCO Shipping Lines' }
            ];
        } else if (type === 'awb') {
            return [
                { code: 'LUFTHANSA', name: 'Lufthansa Cargo' },
                { code: 'EMIRATES', name: 'Emirates SkyCargo' },
                { code: 'FEDEX', name: 'FedEx' },
                { code: 'UPS', name: 'UPS' },
                { code: 'DHL', name: 'DHL Express' }
            ];
        }
        return [];
    }
    
    // ========================================
    // FILE IMPORT LOGIC
    // ========================================
    
    function handleFileSelect(file) {
        console.log('📁 File selected:', file.name);
        
        // Validate file type
        const validTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'text/csv'
        ];
        
        if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
            alert('Tipo file non supportato. Usa .xlsx, .xls o .csv');
            return;
        }
        
        // Store for later processing
        pendingImport = { file };
        
        // Show preview/confirmation
        showImportPreview(file);
    }
    
    function showImportPreview(file) {
        // Use existing ImportManager for preview
        if (window.ImportManager && window.ImportManager.showPreview) {
            window.ImportManager.showPreview(file, {
                onConfirm: () => confirmImport(),
                onCancel: () => { pendingImport = null; }
            });
        } else {
            // Fallback to direct import
            confirmImport();
        }
    }
    
    window.confirmImport = async function() {
        if (!pendingImport) return;
        
        // Close modal
        window.ModalSystem.closeAll();
        
        // Use ImportManager to process
        try {
            await window.ImportManager.importFile(pendingImport.file, {
                updateExisting: false,
                shipsgoType: 'auto'
            });
        } catch (error) {
            console.error('Import error:', error);
            if (window.notificationSystem) {
                window.notificationSystem.error('Errore durante l\'import: ' + error.message);
            } else {
                alert('Errore durante l\'import: ' + error.message);
            }
        }
        
        pendingImport = null;
    };
    
    // ========================================
    // FORM SUBMISSION
    // ========================================
    
    async function handleEnhancedSubmit(e) {
        e.preventDefault();
        
        const submitBtn = document.getElementById('enhSubmitBtn');
        const originalText = submitBtn.innerHTML;
        
        // Get form data
        const formData = {
            tracking_number: document.getElementById('enh_trackingNumber').value.trim().toUpperCase(),
            tracking_type: document.getElementById('enh_trackingType').value,
            carrier_code: document.getElementById('enh_carrier').value,
            origin_port: document.getElementById('enh_origin').value.toUpperCase(),
            destination_port: document.getElementById('enh_destination').value.toUpperCase(),
            reference_number: document.getElementById('enh_reference').value,
            status: document.getElementById('enh_status').value,
            use_api: document.getElementById('enh_useApi').checked,
            created_at: new Date().toISOString()
        };
        
        // Validation
        if (!formData.tracking_number) {
            if (window.notificationSystem) {
                window.notificationSystem.error('Inserisci il numero di tracking');
            } else {
                alert('Inserisci il numero di tracking');
            }
            return;
        }
        
        // Check duplicates
        if (window.trackings?.find(t => t.tracking_number === formData.tracking_number)) {
            if (window.notificationSystem) {
                window.notificationSystem.error('Questo tracking è già presente nel sistema');
            } else {
                alert('Questo tracking è già presente nel sistema');
            }
            return;
        }
        
        // Show loading
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Aggiunta in corso...';
        
        try {
            let trackingData = { ...formData };
            
            // Try API if enabled
            if (formData.use_api && window.trackingService?.track) {
                try {
                    const apiResult = await window.trackingService.track(
                        formData.tracking_number,
                        formData.tracking_type === 'auto' ? undefined : formData.tracking_type
                    );
                    
                    if (apiResult.success) {
                        // Merge API data with form data
                        trackingData = {
                            ...trackingData,
                            ...apiResult.data,
                            id: Date.now().toString(),
                            // Preserve user inputs
                            reference_number: formData.reference_number || apiResult.data.reference_number,
                            metadata: {
                                ...apiResult.metadata,
                                source: 'enhanced_form',
                                api_used: true
                            }
                        };
                    }
                } catch (apiError) {
                    console.warn('API call failed, using manual data:', apiError);
                    trackingData.metadata = { 
                        source: 'enhanced_form', 
                        api_used: false,
                        api_error: apiError.message 
                    };
                }
            } else {
                trackingData.id = Date.now().toString();
                trackingData.metadata = { 
                    source: 'enhanced_form', 
                    api_used: false 
                };
            }
            
            // Add to trackings array
            if (!window.trackings) window.trackings = [];
            window.trackings.push(trackingData);
            
            // Save to localStorage
            localStorage.setItem('trackings', JSON.stringify(window.trackings));
            
            // Close modal
            window.ModalSystem.closeAll();
            
            // Show success
            if (window.notificationSystem) {
                window.notificationSystem.success(
                    trackingData.metadata.api_used 
                        ? '✅ Tracking aggiunto con dati real-time!' 
                        : '✅ Tracking aggiunto con successo!'
                );
            } else {
                alert('Tracking aggiunto con successo!');
            }
            
            // Refresh table if available
            if (window.renderTrackingTable) {
                window.renderTrackingTable();
            }
            if (window.updateStats) {
                window.updateStats();
            }
            
        } catch (error) {
            console.error('Submit error:', error);
            if (window.notificationSystem) {
                window.notificationSystem.error('Errore durante l\'aggiunta: ' + error.message);
            } else {
                alert('Errore durante l\'aggiunta: ' + error.message);
            }
        } finally {
            // Restore button
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }
    
    // ========================================
    // UTILITIES
    // ========================================
    
    function prefillForm(data) {
        if (data.tracking_number) {
            document.getElementById('enh_trackingNumber').value = data.tracking_number;
        }
        if (data.tracking_type) {
            document.getElementById('enh_trackingType').value = data.tracking_type;
        }
        if (data.carrier_code) {
            document.getElementById('enh_carrier').value = data.carrier_code;
        }
        if (data.origin_port) {
            document.getElementById('enh_origin').value = data.origin_port;
        }
        if (data.destination_port) {
            document.getElementById('enh_destination').value = data.destination_port;
        }
        if (data.reference_number) {
            document.getElementById('enh_reference').value = data.reference_number;
        }
    }
    
    function addEnhancedToggle() {
        // Aggiungi opzione nelle impostazioni per abilitare/disabilitare
        console.log('✅ Enhanced tracking form toggle can be added to settings');
        
        // Quick toggle for testing (solo in sviluppo)
        if (window.location.hostname === 'localhost' || window.location.search.includes('debug=true')) {
            // Aggiungi toggle temporaneo
            setTimeout(() => {
                if (document.querySelector('.page-actions') && !document.getElementById('enhancedToggle')) {
                    const toggle = document.createElement('button');
                    toggle.id = 'enhancedToggle';
                    toggle.className = 'btn btn-sm btn-outline-secondary';
                    toggle.innerHTML = '🚀 Enhanced: ' + (ENABLE_ENHANCED ? 'ON' : 'OFF');
                    toggle.onclick = () => {
                        const newState = localStorage.getItem('enableEnhancedTracking') !== 'false' ? 'false' : 'true';
                        localStorage.setItem('enableEnhancedTracking', newState);
                        location.reload();
                    };
                    document.querySelector('.page-actions').appendChild(toggle);
                }
            }, 1000);
        }
    }
    
})();