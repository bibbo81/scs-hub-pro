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
    
    // 🎨 FORM COMPATTO E INTUITIVO - Versione aggiornata
    function renderSimplifiedForm() {
        return `
            <div class="enhanced-form-container">
                <!-- Tab Navigation -->
                <div class="form-tabs">
                    <button class="tab-btn active" data-target="single">
                        <i class="fas fa-plus"></i>
                        <span>Singolo</span>
                    </button>
                    <button class="tab-btn" data-target="import">
                        <i class="fas fa-upload"></i>
                        <span>Import Multiplo</span>
                    </button>
                </div>
                
                <!-- Single Tab Content -->
                <div class="tab-content active" data-tab="single">
                    <form id="enhancedSingleForm" class="compact-form">
                        
                        <!-- All-in-One Layout -->
                        <div class="form-layout">
                            <!-- Left Column: Input -->
                            <div class="input-section">
                                <div class="input-header">
                                    <h3>📦 Nuovo Tracking</h3>
                                    <p>Inserisci il numero e completa i dettagli</p>
                                </div>
                                
                                <!-- Smart Input -->
                                <div class="smart-input-group">
                                    <label>Numero Tracking *</label>
                                    <div class="input-with-status">
                                        <input type="text" 
                                               id="enh_trackingNumber" 
                                               class="smart-input" 
                                               placeholder="Es: MSKU1234567, 176-12345678"
                                               autocomplete="off"
                                               required>
                                        <div class="input-status">
                                            <i class="fas fa-search status-icon"></i>
                                            <span class="status-text">Inizia a digitare...</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Quick Examples - Compatte -->
                                <div class="quick-examples">
                                    <button type="button" class="example-btn" data-example="MSKU1234567">
                                        🚢 Container
                                    </button>
                                    <button type="button" class="example-btn" data-example="176-12345678">
                                        ✈️ Air Cargo
                                    </button>
                                    <button type="button" class="example-btn" data-example="GESU1234567">
                                        🚢 MSC
                                    </button>
                                </div>
                                
                                <!-- Compact Form Grid -->
                                <div class="form-grid">
                                    <div class="form-row">
                                        <select id="enh_trackingType" class="form-input">
                                            <option value="auto">🔍 Auto-detect</option>
                                            <option value="container">🚢 Container</option>
                                            <option value="awb">✈️ Air Waybill</option>
                                            <option value="bl">📄 Bill of Lading</option>
                                        </select>
                                        
                                        <select id="enh_carrier" class="form-input">
                                            <option value="">Vettore (auto)</option>
                                        </select>
                                    </div>
                                    
                                    <div class="form-row">
                                        <input type="text" id="enh_origin" class="form-input" placeholder="Origine">
                                        <input type="text" id="enh_destination" class="form-input" placeholder="Destinazione">
                                    </div>
                                    
                                    <div class="form-row">
                                        <input type="text" id="enh_reference" class="form-input" placeholder="Riferimento (opzionale)">
                                        <select id="enh_status" class="form-input">
                                            <option value="registered">📝 Registrato</option>
                                            <option value="in_transit">🚛 In Transito</option>
                                            <option value="arrived">📍 Arrivato</option>
                                        </select>
                                    </div>
                                </div>
                                
                                <!-- API Toggle - Compatto -->
                                <div class="api-toggle">
                                    <label class="toggle-switch">
                                        <input type="checkbox" id="enh_useApi" checked>
                                        <span class="toggle-slider"></span>
                                        <span class="toggle-label">🔄 Dati real-time (API)</span>
                                    </label>
                                </div>
                            </div>
                            
                            <!-- Right Column: Preview/Status -->
                            <div class="preview-section">
                                <div class="preview-card">
                                    <h4>📋 Anteprima</h4>
                                    <div id="trackingPreview" class="preview-content">
                                        <div class="preview-item">
                                            <span class="preview-label">Numero:</span>
                                            <span class="preview-value" id="previewNumber">-</span>
                                        </div>
                                        <div class="preview-item">
                                            <span class="preview-label">Tipo:</span>
                                            <span class="preview-value" id="previewType">-</span>
                                        </div>
                                        <div class="preview-item">
                                            <span class="preview-label">Vettore:</span>
                                            <span class="preview-value" id="previewCarrier">-</span>
                                        </div>
                                        <div class="preview-item">
                                            <span class="preview-label">Rotta:</span>
                                            <span class="preview-value" id="previewRoute">-</span>
                                        </div>
                                    </div>
                                    
                                    <!-- API Status -->
                                    <div id="apiStatus" class="api-status">
                                        <div class="status-indicator">
                                            <i class="fas fa-circle status-dot"></i>
                                            <span class="status-message">Pronto per l'aggiunta</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Action Bar -->
                        <div class="action-bar">
                            <button type="button" class="btn btn-secondary" onclick="window.ModalSystem.closeAll()">
                                <i class="fas fa-times"></i> Annulla
                            </button>
                            <button type="submit" class="btn btn-primary" id="enhSubmitBtn">
                                <i class="fas fa-plus"></i> Aggiungi Tracking
                            </button>
                        </div>
                    </form>
                </div>
                
                <!-- Import Tab Content -->
                <div class="tab-content" data-tab="import">
                    <div class="import-section">
                        <div class="import-layout">
                            <!-- Drop Zone -->
                            <div class="drop-zone" id="enhDropZone">
                                <div class="drop-content">
                                    <div class="drop-icon">📁</div>
                                    <h3>Trascina qui i file</h3>
                                    <p>Oppure <button type="button" class="link-btn" onclick="document.getElementById('enhFileInput').click()">seleziona file</button></p>
                                    <small>Supporta .xlsx, .xls, .csv</small>
                                </div>
                                <input type="file" id="enhFileInput" accept=".xlsx,.xls,.csv" style="display: none;">
                            </div>
                            
                            <!-- Import Info -->
                            <div class="import-info">
                                <h4>📊 Import Multiplo</h4>
                                <div class="info-list">
                                    <div class="info-item">
                                        <i class="fas fa-check text-success"></i>
                                        <span>Auto-detection formato</span>
                                    </div>
                                    <div class="info-item">
                                        <i class="fas fa-check text-success"></i>
                                        <span>Mapping automatico colonne</span>
                                    </div>
                                    <div class="info-item">
                                        <i class="fas fa-check text-success"></i>
                                        <span>Preview prima dell'import</span>
                                    </div>
                                    <div class="info-item">
                                        <i class="fas fa-check text-success"></i>
                                        <span>Validazione dati</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Compact Styles -->
            <style>
            .enhanced-form-container {
                max-width: 900px;
                margin: 0 auto;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            
            /* Tab Navigation - Compatta */
            .form-tabs {
                display: flex;
                background: #f8f9fa;
                border-radius: 8px;
                padding: 4px;
                margin-bottom: 1.5rem;
                border: 1px solid #e9ecef;
            }
            
            .tab-btn {
                flex: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                padding: 12px 16px;
                border: none;
                background: transparent;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.2s ease;
                font-weight: 500;
                color: #6c757d;
            }
            
            .tab-btn:hover {
                background: rgba(0, 122, 255, 0.1);
                color: #007AFF;
            }
            
            .tab-btn.active {
                background: #007AFF;
                color: white;
                box-shadow: 0 2px 4px rgba(0, 122, 255, 0.3);
            }
            
            /* Tab Content */
            .tab-content {
                display: none;
                animation: fadeIn 0.3s ease;
            }
            
            .tab-content.active {
                display: block;
            }
            
            /* Compact Form Layout */
            .form-layout {
                display: grid;
                grid-template-columns: 1fr 300px;
                gap: 2rem;
                margin-bottom: 1.5rem;
            }
            
            .input-section {
                background: #f8f9fa;
                border-radius: 12px;
                padding: 1.5rem;
            }
            
            .input-header {
                margin-bottom: 1.5rem;
            }
            
            .input-header h3 {
                margin: 0 0 0.5rem 0;
                color: #343a40;
                font-size: 1.25rem;
            }
            
            .input-header p {
                margin: 0;
                color: #6c757d;
                font-size: 0.9rem;
            }
            
            /* Smart Input - Compatto */
            .smart-input-group {
                margin-bottom: 1rem;
            }
            
            .smart-input-group label {
                display: block;
                font-weight: 600;
                color: #343a40;
                margin-bottom: 0.5rem;
                font-size: 0.9rem;
            }
            
            .input-with-status {
                position: relative;
            }
            
            .smart-input {
                width: 100%;
                padding: 12px 16px;
                border: 2px solid #e9ecef;
                border-radius: 8px;
                font-size: 1rem;
                transition: all 0.2s ease;
                background: white;
            }
            
            .smart-input:focus {
                outline: none;
                border-color: #007AFF;
                box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1);
            }
            
            .input-status {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                margin-top: 0.5rem;
                font-size: 0.85rem;
                color: #6c757d;
            }
            
            .status-icon {
                transition: all 0.3s ease;
            }
            
            .status-icon.loading {
                animation: spin 1s linear infinite;
            }
            
            .status-icon.success {
                color: #28a745;
            }
            
            .status-icon.error {
                color: #dc3545;
            }
            
            /* Quick Examples - Compatte */
            .quick-examples {
                display: flex;
                gap: 0.5rem;
                margin-bottom: 1.5rem;
                flex-wrap: wrap;
            }
            
            .example-btn {
                padding: 6px 12px;
                border: 1px solid #e9ecef;
                border-radius: 6px;
                background: white;
                cursor: pointer;
                transition: all 0.2s ease;
                font-size: 0.85rem;
                white-space: nowrap;
            }
            
            .example-btn:hover {
                border-color: #007AFF;
                background: #007AFF;
                color: white;
            }
            
            /* Form Grid - Compatto */
            .form-grid {
                margin-bottom: 1.5rem;
            }
            
            .form-row {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 0.75rem;
                margin-bottom: 0.75rem;
            }
            
            .form-input {
                padding: 10px 12px;
                border: 2px solid #e9ecef;
                border-radius: 6px;
                font-size: 0.9rem;
                transition: all 0.2s ease;
                background: white;
            }
            
            .form-input:focus {
                outline: none;
                border-color: #007AFF;
                box-shadow: 0 0 0 2px rgba(0, 122, 255, 0.1);
            }
            
            /* API Toggle - Compatto */
            .api-toggle {
                padding: 1rem;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 8px;
                color: white;
            }
            
            .toggle-switch {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                cursor: pointer;
                margin: 0;
            }
            
            .toggle-slider {
                position: relative;
                width: 44px;
                height: 24px;
                background: rgba(255,255,255,0.3);
                border-radius: 24px;
                transition: 0.3s;
            }
            
            .toggle-slider:before {
                content: "";
                position: absolute;
                width: 18px;
                height: 18px;
                border-radius: 50%;
                background: white;
                top: 3px;
                left: 3px;
                transition: 0.3s;
            }
            
            .toggle-switch input {
                display: none;
            }
            
            .toggle-switch input:checked + .toggle-slider {
                background: rgba(255,255,255,0.5);
            }
            
            .toggle-switch input:checked + .toggle-slider:before {
                transform: translateX(20px);
            }
            
            .toggle-label {
                font-weight: 500;
                font-size: 0.9rem;
            }
            
            /* Preview Section */
            .preview-section {
                background: white;
                border-radius: 12px;
                border: 1px solid #e9ecef;
                height: fit-content;
                position: sticky;
                top: 1rem;
            }
            
            .preview-card {
                padding: 1.5rem;
            }
            
            .preview-card h4 {
                margin: 0 0 1rem 0;
                color: #343a40;
                font-size: 1.1rem;
            }
            
            .preview-content {
                margin-bottom: 1rem;
            }
            
            .preview-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0.5rem 0;
                border-bottom: 1px solid #f8f9fa;
            }
            
            .preview-item:last-child {
                border-bottom: none;
            }
            
            .preview-label {
                font-size: 0.85rem;
                color: #6c757d;
                font-weight: 500;
            }
            
            .preview-value {
                font-size: 0.9rem;
                color: #343a40;
                font-weight: 600;
            }
            
            /* API Status */
            .api-status {
                padding: 1rem;
                background: #f8f9fa;
                border-radius: 6px;
                margin-top: 1rem;
            }
            
            .status-indicator {
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
            
            .status-dot {
                font-size: 0.5rem;
                color: #28a745;
            }
            
            .status-message {
                font-size: 0.85rem;
                color: #6c757d;
            }
            
            /* Action Bar */
            .action-bar {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 1rem 1.5rem;
                background: white;
                border-top: 1px solid #e9ecef;
                border-radius: 0 0 12px 12px;
                margin: 0 -1.5rem -1.5rem -1.5rem;
            }
            
            .btn {
                padding: 10px 20px;
                border: none;
                border-radius: 6px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                gap: 0.5rem;
                font-size: 0.9rem;
            }
            
            .btn-primary {
                background: #007AFF;
                color: white;
            }
            
            .btn-primary:hover {
                background: #0056b3;
                transform: translateY(-1px);
            }
            
            .btn-secondary {
                background: #6c757d;
                color: white;
            }
            
            /* Import Section */
            .import-section {
                height: 400px;
            }
            
            .import-layout {
                display: grid;
                grid-template-columns: 1fr 300px;
                gap: 2rem;
                height: 100%;
            }
            
            .drop-zone {
                border: 2px dashed #007AFF;
                border-radius: 12px;
                background: #f0f8ff;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease;
                cursor: pointer;
            }
            
            .drop-zone:hover,
            .drop-zone.dragover {
                background: #e3f2fd;
                border-color: #2196f3;
                transform: scale(1.02);
            }
            
            .drop-content {
                text-align: center;
                padding: 2rem;
            }
            
            .drop-icon {
                font-size: 3rem;
                margin-bottom: 1rem;
            }
            
            .drop-content h3 {
                margin: 0 0 0.5rem 0;
                color: #343a40;
            }
            
            .drop-content p {
                margin: 0 0 0.5rem 0;
                color: #6c757d;
            }
            
            .link-btn {
                background: none;
                border: none;
                color: #007AFF;
                cursor: pointer;
                text-decoration: underline;
            }
            
            .import-info {
                background: #f8f9fa;
                border-radius: 12px;
                padding: 1.5rem;
                height: fit-content;
            }
            
            .import-info h4 {
                margin: 0 0 1rem 0;
                color: #343a40;
            }
            
            .info-list {
                display: flex;
                flex-direction: column;
                gap: 0.75rem;
            }
            
            .info-item {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                font-size: 0.9rem;
            }
            
            .text-success {
                color: #28a745;
            }
            
            /* Responsive */
            @media (max-width: 768px) {
                .form-layout,
                .import-layout {
                    grid-template-columns: 1fr;
                    gap: 1rem;
                }
                
                .preview-section {
                    position: static;
                }
                
                .form-row {
                    grid-template-columns: 1fr;
                }
                
                .quick-examples {
                    justify-content: center;
                }
                
                .action-bar {
                    flex-direction: column;
                    gap: 0.75rem;
                }
                
                .btn {
                    width: 100%;
                    justify-content: center;
                }
            }
            
            /* Animations */
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
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
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const targetTab = this.dataset.target;
                console.log('🔄 Tab clicked:', targetTab);
                
                // Update buttons
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
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
        const statusIcon = document.querySelector('.status-icon');
        const statusText = document.querySelector('.status-text');
        
        if (statusIcon && statusText) {
            statusIcon.className = 'fas fa-circle-notch fa-spin status-icon loading';
            statusText.textContent = 'Rilevamento...';
        }
    }
    
    function clearDetection() {
        const statusIcon = document.querySelector('.status-icon');
        const statusText = document.querySelector('.status-text');
        
        if (statusIcon && statusText) {
            statusIcon.className = 'fas fa-search status-icon';
            statusText.textContent = 'Inizia a digitare...';
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
        const statusIcon = document.querySelector('.status-icon');
        const statusText = document.querySelector('.status-text');
        
        detectedData = { type, carrier };
        
        const typeLabels = {
            container: '🚢 Container',
            awb: '✈️ Air Waybill',
            bl: '📄 Bill of Lading'
        };
        
        if (statusIcon && statusText) {
            statusIcon.className = 'fas fa-check-circle status-icon success';
            statusText.textContent = `Rilevato: ${typeLabels[type]}${carrier ? ` (${carrier})` : ''}`;
        }
    }
    
    function showDetectionError() {
        const statusIcon = document.querySelector('.status-icon');
        const statusText = document.querySelector('.status-text');
        
        if (statusIcon && statusText) {
            statusIcon.className = 'fas fa-exclamation-triangle status-icon error';
            statusText.textContent = 'Tipo non riconosciuto';
        }
    }
    
    function updateCarrierOptions(type) {
        const select = document.getElementById('enh_carrier');
        if (!select) return;
        
        select.innerHTML = '<option value="">Vettore (auto)</option>';
        
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