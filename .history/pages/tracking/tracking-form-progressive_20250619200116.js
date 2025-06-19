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
    // ENHANCED FORM - VERSIONE COMPATTA
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
    
    // 🎨 FORM ULTRA-COMPATTO SENZA SCROLLING
    function renderSimplifiedForm() {
        return `
            <div class="ultra-compact-form">
                <!-- Tab Navigation - Minimale -->
                <div class="mini-tabs">
                    <button class="mini-tab active" data-target="single">
                        <i class="fas fa-plus"></i> Singolo
                    </button>
                    <button class="mini-tab" data-target="import">
                        <i class="fas fa-upload"></i> Multiplo
                    </button>
                </div>
                
                <!-- Single Tab - Layout Orizzontale -->
                <div class="tab-content active" data-tab="single">
                    <form id="enhancedSingleForm" class="horizontal-form">
                        <div class="form-sections">
                            
                            <!-- Sezione Input Principale -->
                            <div class="main-input-section">
                                <div class="input-header">
                                    <h4>📦 Tracking</h4>
                                </div>
                                
                                <div class="input-container">
                                    <input type="text" 
                                           id="enh_trackingNumber" 
                                           class="main-input" 
                                           placeholder="Es: MSKU1234567, 176-12345678"
                                           required>
                                    <div class="input-status">
                                        <i class="fas fa-search"></i>
                                        <span>Auto-detection...</span>
                                    </div>
                                </div>
                                
                                <!-- Examples - Inline -->
                                <div class="inline-examples">
                                    <button type="button" class="mini-example" data-example="MSKU1234567">🚢</button>
                                    <button type="button" class="mini-example" data-example="176-12345678">✈️</button>
                                    <button type="button" class="mini-example" data-example="GESU1234567">📦</button>
                                </div>
                            </div>
                            
                            <!-- Sezione Dettagli -->
                            <div class="details-section">
                                <div class="input-header">
                                    <h4>📋 Dettagli</h4>
                                </div>
                                
                                <div class="compact-grid">
                                    <select id="enh_trackingType" class="compact-input">
                                        <option value="auto">🔍 Auto</option>
                                        <option value="container">🚢 Container</option>
                                        <option value="awb">✈️ Air</option>
                                    </select>
                                    
                                    <select id="enh_carrier" class="compact-input">
                                        <option value="">Vettore</option>
                                    </select>
                                    
                                    <input type="text" id="enh_origin" class="compact-input" placeholder="Origine">
                                    <input type="text" id="enh_destination" class="compact-input" placeholder="Destinazione">
                                    <input type="text" id="enh_reference" class="compact-input" placeholder="Riferimento">
                                    
                                    <select id="enh_status" class="compact-input">
                                        <option value="registered">📝 Registrato</option>
                                        <option value="in_transit">🚛 Transito</option>
                                        <option value="arrived">📍 Arrivato</option>
                                    </select>
                                </div>
                            </div>
                            
                            <!-- Sezione Preview + API -->
                            <div class="preview-section">
                                <div class="input-header">
                                    <h4>👁️ Preview</h4>
                                </div>
                                
                                <div class="mini-preview">
                                    <div class="preview-line">
                                        <strong id="previewNumber">-</strong>
                                    </div>
                                    <div class="preview-line">
                                        <span id="previewType">Tipo</span> • <span id="previewCarrier">Vettore</span>
                                    </div>
                                    <div class="preview-line">
                                        <span id="previewRoute">Rotta</span>
                                    </div>
                                </div>
                                
                                <!-- API Toggle - Minimo -->
                                <div class="api-mini-toggle">
                                    <label class="mini-switch">
                                        <input type="checkbox" id="enh_useApi" checked>
                                        <span class="mini-slider"></span>
                                    </label>
                                    <span class="api-label">🔄 API</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Actions - Inline -->
                        <div class="inline-actions">
                            <button type="button" class="btn-mini btn-cancel" onclick="window.ModalSystem.closeAll()">
                                <i class="fas fa-times"></i> Annulla
                            </button>
                            <button type="submit" class="btn-mini btn-primary" id="enhSubmitBtn">
                                <i class="fas fa-plus"></i> Aggiungi
                            </button>
                        </div>
                    </form>
                </div>
                
                <!-- Import Tab - Ultra Compatto -->
                <div class="tab-content" data-tab="import">
                    <div class="import-compact">
                        <div class="import-main">
                            <!-- Drop Zone Compatta -->
                            <div class="compact-drop-zone" id="enhDropZone">
                                <div class="drop-content">
                                    <div class="drop-icon">📁</div>
                                    <div class="drop-text">
                                        <strong>Trascina file qui</strong>
                                        <p>oppure <button type="button" class="link-btn" onclick="document.getElementById('enhFileInput').click()">seleziona</button></p>
                                        <small>.xlsx, .xls, .csv</small>
                                    </div>
                                </div>
                                <input type="file" id="enhFileInput" accept=".xlsx,.xls,.csv" style="display: none;">
                            </div>
                            
                            <!-- Import Features -->
                            <div class="import-features">
                                <h4>📊 Features</h4>
                                <ul class="feature-list">
                                    <li>✅ Auto-detection formato</li>
                                    <li>✅ Mapping colonne</li>
                                    <li>✅ Preview & validazione</li>
                                    <li>✅ Import batch</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Ultra-Compact Styles -->
            <style>
            .ultra-compact-form {
                width: 100%;
                max-width: 900px;
                margin: 0 auto;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                font-size: 14px;
            }
            
            /* Mini Tabs */
            .mini-tabs {
                display: flex;
                background: #f1f3f4;
                border-radius: 6px;
                padding: 2px;
                margin-bottom: 16px;
            }
            
            .mini-tab {
                flex: 1;
                padding: 8px 12px;
                border: none;
                background: transparent;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s;
                font-size: 13px;
                font-weight: 500;
                color: #5f6368;
            }
            
            .mini-tab:hover {
                background: rgba(26, 115, 232, 0.08);
                color: #1a73e8;
            }
            
            .mini-tab.active {
                background: #1a73e8;
                color: white;
                box-shadow: 0 1px 3px rgba(0,0,0,0.12);
            }
            
            /* Tab Content */
            .tab-content {
                display: none;
            }
            
            .tab-content.active {
                display: block;
            }
            
            /* Horizontal Form Layout */
            .horizontal-form {
                display: flex;
                flex-direction: column;
                gap: 16px;
            }
            
            .form-sections {
                display: grid;
                grid-template-columns: 1fr 1fr 300px;
                gap: 16px;
                align-items: start;
            }
            
            /* Section Headers */
            .input-header {
                margin-bottom: 8px;
            }
            
            .input-header h4 {
                margin: 0;
                font-size: 14px;
                font-weight: 600;
                color: #202124;
            }
            
            /* Main Input Section */
            .main-input-section {
                background: #f8f9fa;
                padding: 16px;
                border-radius: 8px;
            }
            
            .input-container {
                position: relative;
                margin-bottom: 12px;
            }
            
            .main-input {
                width: 100%;
                padding: 12px 14px;
                border: 2px solid #e8eaed;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 500;
                transition: all 0.2s;
                background: white;
            }
            
            .main-input:focus {
                outline: none;
                border-color: #1a73e8;
                box-shadow: 0 0 0 1px #1a73e8;
            }
            
            .input-status {
                display: flex;
                align-items: center;
                gap: 6px;
                margin-top: 6px;
                font-size: 12px;
                color: #5f6368;
            }
            
            /* Inline Examples */
            .inline-examples {
                display: flex;
                gap: 6px;
            }
            
            .mini-example {
                width: 32px;
                height: 32px;
                border: 1px solid #e8eaed;
                border-radius: 6px;
                background: white;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 16px;
            }
            
            .mini-example:hover {
                border-color: #1a73e8;
                background: #e8f0fe;
            }
            
            /* Details Section */
            .details-section {
                background: #f8f9fa;
                padding: 16px;
                border-radius: 8px;
            }
            
            .compact-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 8px;
            }
            
            .compact-input {
                padding: 8px 10px;
                border: 1px solid #e8eaed;
                border-radius: 4px;
                font-size: 13px;
                background: white;
                transition: border-color 0.2s;
            }
            
            .compact-input:focus {
                outline: none;
                border-color: #1a73e8;
            }
            
            /* Preview Section */
            .preview-section {
                background: white;
                border: 1px solid #e8eaed;
                border-radius: 8px;
                padding: 16px;
            }
            
            .mini-preview {
                margin-bottom: 16px;
            }
            
            .preview-line {
                padding: 4px 0;
                font-size: 13px;
                color: #202124;
            }
            
            .preview-line:first-child {
                font-size: 14px;
                color: #1a73e8;
            }
            
            /* API Mini Toggle */
            .api-mini-toggle {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px;
                background: #e8f0fe;
                border-radius: 6px;
            }
            
            .mini-switch {
                position: relative;
                width: 32px;
                height: 18px;
            }
            
            .mini-switch input {
                opacity: 0;
                width: 0;
                height: 0;
            }
            
            .mini-slider {
                position: absolute;
                cursor: pointer;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: #ccc;
                transition: .2s;
                border-radius: 18px;
            }
            
            .mini-slider:before {
                position: absolute;
                content: "";
                height: 14px;
                width: 14px;
                left: 2px;
                bottom: 2px;
                background-color: white;
                transition: .2s;
                border-radius: 50%;
            }
            
            input:checked + .mini-slider {
                background-color: #1a73e8;
            }
            
            input:checked + .mini-slider:before {
                transform: translateX(14px);
            }
            
            .api-label {
                font-size: 12px;
                font-weight: 500;
                color: #1a73e8;
            }
            
            /* Inline Actions */
            .inline-actions {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                background: #f8f9fa;
                border-radius: 6px;
            }
            
            .btn-mini {
                padding: 8px 16px;
                border: none;
                border-radius: 4px;
                font-size: 13px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            
            .btn-cancel {
                background: #f1f3f4;
                color: #5f6368;
            }
            
            .btn-cancel:hover {
                background: #e8eaed;
            }
            
            .btn-primary {
                background: #1a73e8;
                color: white;
            }
            
            .btn-primary:hover {
                background: #1557b0;
                box-shadow: 0 1px 3px rgba(0,0,0,0.12);
            }
            
            /* Import Compact */
            .import-compact {
                height: 300px;
            }
            
            .import-main {
                display: grid;
                grid-template-columns: 1fr 250px;
                gap: 16px;
                height: 100%;
            }
            
            .compact-drop-zone {
                border: 2px dashed #1a73e8;
                border-radius: 8px;
                background: #f8f9ff;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .compact-drop-zone:hover,
            .compact-drop-zone.dragover {
                background: #e8f0fe;
                border-color: #1557b0;
            }
            
            .drop-content {
                text-align: center;
                padding: 24px;
            }
            
            .drop-icon {
                font-size: 48px;
                margin-bottom: 12px;
            }
            
            .drop-text strong {
                display: block;
                margin-bottom: 6px;
                color: #202124;
                font-size: 16px;
            }
            
            .drop-text p {
                margin: 6px 0;
                color: #5f6368;
                font-size: 14px;
            }
            
            .drop-text small {
                color: #80868b;
                font-size: 12px;
            }
            
            .link-btn {
                background: none;
                border: none;
                color: #1a73e8;
                text-decoration: underline;
                cursor: pointer;
                font-size: inherit;
            }
            
            /* Import Features */
            .import-features {
                background: #f8f9fa;
                padding: 16px;
                border-radius: 8px;
            }
            
            .import-features h4 {
                margin: 0 0 12px 0;
                font-size: 14px;
                font-weight: 600;
                color: #202124;
            }
            
            .feature-list {
                list-style: none;
                padding: 0;
                margin: 0;
            }
            
            .feature-list li {
                padding: 4px 0;
                font-size: 13px;
                color: #5f6368;
            }
            
            /* Responsive */
            @media (max-width: 768px) {
                .form-sections {
                    grid-template-columns: 1fr;
                    gap: 12px;
                }
                
                .import-main {
                    grid-template-columns: 1fr;
                    gap: 12px;
                }
                
                .compact-grid {
                    grid-template-columns: 1fr;
                }
                
                .inline-actions {
                    flex-direction: column;
                    gap: 8px;
                }
                
                .btn-mini {
                    width: 100%;
                    justify-content: center;
                }
            }
            
            /* Ensure no overflow */
            * {
                box-sizing: border-box;
            }
            
            .ultra-compact-form {
                overflow: hidden;
            }
            </style>
        `;
    }
    
    // Variables per l'import
    let pendingImport = null;
    let detectedData = null;
    
    // 🔧 FIX TAB SWITCHING - Versione corretta
    function setupEnhancedInteractions() {
        console.log('🔧 PROGRESSIVE FORM: Setting up interactions (FIXED)');
        
        // Tab switching - VERSIONE CORRETTA
        document.querySelectorAll('.mini-tab').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const targetTab = this.dataset.target;
                console.log('🔄 Tab clicked:', targetTab);
                
                // Update buttons
                document.querySelectorAll('.mini-tab').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                
                // Update content - USA IL SELECTOR CORRETTO
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                const targetContent = document.querySelector(`[data-tab="${targetTab}"]`);
                if (targetContent) {
                    targetContent.classList.add('active');
                    console.log('✅ Tab content switched to:', targetTab);
                } else {
                    console.error('❌ Tab content not found for:', targetTab);
                }
            });
        });
        
        // Single form interactions
        setupSingleFormInteractions();
        
        // Import interactions  
        setupImportInteractions();
        
        // Real-time preview updates
        setupRealtimePreview();
    }
    
    // 🔄 REAL-TIME PREVIEW
    function setupRealtimePreview() {
        const inputs = {
            trackingNumber: document.getElementById('enh_trackingNumber'),
            trackingType: document.getElementById('enh_trackingType'),
            carrier: document.getElementById('enh_carrier'),
            origin: document.getElementById('enh_origin'),
            destination: document.getElementById('enh_destination')
        };
        
        const previews = {
            number: document.getElementById('previewNumber'),
            type: document.getElementById('previewType'),
            carrier: document.getElementById('previewCarrier'),
            route: document.getElementById('previewRoute')
        };
        
        function updatePreview() {
            if (inputs.trackingNumber && previews.number) {
                previews.number.textContent = inputs.trackingNumber.value || '-';
            }
            if (inputs.trackingType && previews.type) {
                const typeText = inputs.trackingType.options[inputs.trackingType.selectedIndex]?.text || '-';
                previews.type.textContent = typeText;
            }
            if (inputs.carrier && previews.carrier) {
                const carrierText = inputs.carrier.options[inputs.carrier.selectedIndex]?.text || '-';
                previews.carrier.textContent = carrierText;
            }
            if (inputs.origin && inputs.destination && previews.route) {
                const origin = inputs.origin.value;
                const destination = inputs.destination.value;
                if (origin && destination) {
                    previews.route.textContent = `${origin} → ${destination}`;
                } else if (origin || destination) {
                    previews.route.textContent = origin || destination;
                } else {
                    previews.route.textContent = '-';
                }
            }
        }
        
        // Attach listeners
        Object.values(inputs).forEach(input => {
            if (input) {
                input.addEventListener('input', updatePreview);
                input.addEventListener('change', updatePreview);
            }
        });
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
        document.querySelectorAll('.mini-example').forEach(btn => {
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
        
        if (!dropZone || !fileInput) return;
        
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
        const statusIcon = document.querySelector('.input-status i');
        const statusText = document.querySelector('.input-status span');
        
        if (statusIcon && statusText) {
            statusIcon.className = 'fas fa-circle-notch fa-spin';
            statusText.textContent = 'Rilevamento...';
        }
    }
    
    function clearDetection() {
        const statusIcon = document.querySelector('.input-status i');
        const statusText = document.querySelector('.input-status span');
        
        if (statusIcon && statusText) {
            statusIcon.className = 'fas fa-search';
            statusText.textContent = 'Auto-detection...';
        }
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
            
            // Auto-update form fields
            document.getElementById('enh_trackingType').value = type;
            updateCarrierOptions(type);
            
            if (carrier) {
                setTimeout(() => {
                    document.getElementById('enh_carrier').value = carrier;
                }, 100);
            }
        } else {
            showDetectionError();
        }
    }
    
    function showDetectionResult(type, carrier) {
        const statusIcon = document.querySelector('.input-status i');
        const statusText = document.querySelector('.input-status span');
        
        detectedData = { type, carrier };
        
        const typeLabels = {
            container: '🚢 Container',
            awb: '✈️ Air Waybill',
            bl: '📄 Bill of Lading'
        };
        
        if (statusIcon && statusText) {
            statusIcon.className = 'fas fa-check-circle';
            statusIcon.style.color = '#28a745';
            statusText.textContent = `Rilevato: ${typeLabels[type]}${carrier ? ` (${carrier})` : ''}`;
        }
    }
    
    function showDetectionError() {
        const statusIcon = document.querySelector('.input-status i');
        const statusText = document.querySelector('.input-status span');
        
        if (statusIcon && statusText) {
            statusIcon.className = 'fas fa-exclamation-triangle';
            statusIcon.style.color = '#dc3545';
            statusText.textContent = 'Tipo non riconosciuto';
        }
    }
    
    function updateCarrierOptions(type) {
        const select = document.getElementById('enh_carrier');
        if (!select) return;
        
        select.innerHTML = '<option value="">Vettore</option>';
        
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