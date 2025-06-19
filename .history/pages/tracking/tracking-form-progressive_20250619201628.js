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
    
    // 🎯 MODAL DINAMICO + LAYOUT ALLARGATO
    // Aggiorna showEnhancedTrackingForm() e renderSimplifiedForm()
    function showEnhancedTrackingForm(options = {}) {
        console.log('🚀 PROGRESSIVE FORM: Showing enhanced form');
        
        // MODAL PIÙ LARGO E DINAMICO
        window.ModalSystem.show({
            title: '📦 Aggiungi Tracking Enhanced',
            content: renderSimplifiedForm(),
            size: 'extra-large', // Invece di 'large'
            showFooter: false,
            className: 'enhanced-tracking-modal-v3',
            customStyles: {
                maxWidth: '1100px',    // Più largo
                width: '95vw',         // Responsive
                maxHeight: '90vh',     // Massimo 90% dello schermo
                height: 'auto'         // Auto-sizing
            }
        });
        
        // Setup dopo rendering
        setTimeout(() => {
            setupEnhancedInteractions();
            setupRealtimePreview();
            if (options && Object.keys(options).length > 0) {
                prefillForm(options);
            }
        }, 100);
    }
    
    function renderSimplifiedForm() {
        return `
            <div class="enhanced-form-wide">
                <!-- Tab Navigation -->
                <div class="wide-tabs">
                    <button class="wide-tab active" data-target="single">
                        <i class="fas fa-plus"></i> Tracking Singolo
                    </button>
                    <button class="wide-tab" data-target="import">
                        <i class="fas fa-upload"></i> Import Multiplo
                    </button>
                </div>
                
                <!-- Single Tab - LAYOUT ALLARGATO -->
                <div class="tab-content active" data-tab="single">
                    <form id="enhancedSingleForm" class="wide-form">
                        
                        <!-- 4-Column Layout -->
                        <div class="wide-grid">
                            
                            <!-- Col 1: Input principale -->
                            <div class="input-card">
                                <div class="card-header">
                                    <h4><i class="fas fa-search"></i> Numero Tracking</h4>
                                </div>
                                <div class="card-content">
                                    <input type="text" 
                                           id="enh_trackingNumber" 
                                           class="primary-input" 
                                           placeholder="Es: MSKU1234567, 176-12345678"
                                           required>
                                    
                                    <div class="status-row">
                                        <i class="fas fa-search status-icon"></i>
                                        <span class="status-text">Auto-detection...</span>
                                    </div>
                                    
                                    <div class="examples-grid">
                                        <button type="button" class="example-card" data-example="MSKU1234567">
                                            <span class="example-icon">🚢</span>
                                            <span class="example-text">Container</span>
                                        </button>
                                        <button type="button" class="example-card" data-example="176-12345678">
                                            <span class="example-icon">✈️</span>
                                            <span class="example-text">Air Cargo</span>
                                        </button>
                                        <button type="button" class="example-card" data-example="GESU1234567">
                                            <span class="example-icon">📦</span>
                                            <span class="example-text">MSC</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Col 2: Tipo e Vettore -->
                            <div class="input-card">
                                <div class="card-header">
                                    <h4><i class="fas fa-tags"></i> Tipo & Vettore</h4>
                                </div>
                                <div class="card-content">
                                    <div class="input-group">
                                        <label>Tipo Tracking</label>
                                        <select id="enh_trackingType" class="form-select">
                                            <option value="auto">🔍 Auto-detect</option>
                                            <option value="container">🚢 Container</option>
                                            <option value="awb">✈️ Air Waybill</option>
                                            <option value="bl">📄 Bill of Lading</option>
                                            <option value="parcel">📦 Parcel</option>
                                        </select>
                                    </div>
                                    
                                    <div class="input-group">
                                        <label>Vettore</label>
                                        <select id="enh_carrier" class="form-select">
                                            <option value="">Seleziona automaticamente</option>
                                        </select>
                                    </div>
                                    
                                    <div class="input-group">
                                        <label>Stato Iniziale</label>
                                        <select id="enh_status" class="form-select">
                                            <option value="registered">📝 Registrato</option>
                                            <option value="in_transit">🚛 In Transito</option>
                                            <option value="arrived">📍 Arrivato</option>
                                            <option value="customs_cleared">✅ Sdoganato</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Col 3: Rotta -->
                            <div class="input-card">
                                <div class="card-header">
                                    <h4><i class="fas fa-route"></i> Rotta</h4>
                                </div>
                                <div class="card-content">
                                    <div class="input-group">
                                        <label>Origine</label>
                                        <input type="text" id="enh_origin" class="form-input" placeholder="Porto/Aeroporto origine">
                                    </div>
                                    
                                    <div class="input-group">
                                        <label>Destinazione</label>
                                        <input type="text" id="enh_destination" class="form-input" placeholder="Porto/Aeroporto destinazione">
                                    </div>
                                    
                                    <div class="input-group">
                                        <label>Riferimento</label>
                                        <input type="text" id="enh_reference" class="form-input" placeholder="Es: PO-2024-001">
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Col 4: Preview + API -->
                            <div class="preview-card">
                                <div class="card-header">
                                    <h4><i class="fas fa-eye"></i> Anteprima Live</h4>
                                </div>
                                <div class="card-content">
                                    <div class="preview-display">
                                        <div class="preview-row">
                                            <span class="preview-label">Numero:</span>
                                            <span class="preview-value" id="previewNumber">-</span>
                                        </div>
                                        <div class="preview-row">
                                            <span class="preview-label">Tipo:</span>
                                            <span class="preview-value" id="previewType">-</span>
                                        </div>
                                        <div class="preview-row">
                                            <span class="preview-label">Vettore:</span>
                                            <span class="preview-value" id="previewCarrier">-</span>
                                        </div>
                                        <div class="preview-row">
                                            <span class="preview-label">Rotta:</span>
                                            <span class="preview-value" id="previewRoute">-</span>
                                        </div>
                                        <div class="preview-row">
                                            <span class="preview-label">Stato:</span>
                                            <span class="preview-value" id="previewStatus">-</span>
                                        </div>
                                    </div>
                                    
                                    <!-- API Toggle Card -->
                                    <div class="api-card">
                                        <div class="api-toggle-row">
                                            <div class="api-info">
                                                <span class="api-title">🔄 API Real-time</span>
                                                <span class="api-subtitle">Dati aggiornati</span>
                                            </div>
                                            <label class="modern-switch">
                                                <input type="checkbox" id="enh_useApi" checked>
                                                <span class="switch-slider"></span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Action Bar -->
                        <div class="action-bar-wide">
                            <div class="action-left">
                                <span class="form-status">
                                    <i class="fas fa-circle status-dot"></i>
                                    Pronto per l'aggiunta
                                </span>
                            </div>
                            <div class="action-right">
                                <button type="button" class="btn-wide btn-cancel" onclick="window.ModalSystem.closeAll()">
                                    <i class="fas fa-times"></i> Annulla
                                </button>
                                <button type="submit" class="btn-wide btn-primary" id="enhSubmitBtn">
                                    <i class="fas fa-plus"></i> Aggiungi Tracking
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
                
                <!-- Import Tab - LAYOUT ALLARGATO -->
                <div class="tab-content" data-tab="import">
                    <div class="import-wide">
                        <div class="import-grid">
                            <!-- Drop Zone più grande -->
                            <div class="large-drop-zone" id="enhDropZone">
                                <div class="drop-content-large">
                                    <div class="drop-icon-large">📁</div>
                                    <h3>Trascina qui i tuoi file</h3>
                                    <p>Oppure <button type="button" class="link-btn" onclick="document.getElementById('enhFileInput').click()">seleziona file</button> dal computer</p>
                                    <div class="supported-formats">
                                        <span class="format-badge">.xlsx</span>
                                        <span class="format-badge">.xls</span>
                                        <span class="format-badge">.csv</span>
                                    </div>
                                </div>
                                <input type="file" id="enhFileInput" accept=".xlsx,.xls,.csv" style="display: none;">
                            </div>
                            
                            <!-- Features più dettagliate -->
                            <div class="features-detailed">
                                <h3>📊 Funzionalità Import</h3>
                                
                                <div class="feature-cards">
                                    <div class="feature-card">
                                        <div class="feature-icon">🔍</div>
                                        <div class="feature-info">
                                            <strong>Auto-detection</strong>
                                            <span>Rileva automaticamente il formato del file</span>
                                        </div>
                                    </div>
                                    
                                    <div class="feature-card">
                                        <div class="feature-icon">🗂️</div>
                                        <div class="feature-info">
                                            <strong>Mapping Colonne</strong>
                                            <span>Mapping automatico delle colonne</span>
                                        </div>
                                    </div>
                                    
                                    <div class="feature-card">
                                        <div class="feature-icon">👁️</div>
                                        <div class="feature-info">
                                            <strong>Preview</strong>
                                            <span>Anteprima prima dell'import</span>
                                        </div>
                                    </div>
                                    
                                    <div class="feature-card">
                                        <div class="feature-icon">✅</div>
                                        <div class="feature-info">
                                            <strong>Validazione</strong>
                                            <span>Controllo qualità dei dati</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- WIDE STYLES -->
            <style>
            .enhanced-form-wide {
                width: 100%;
                max-width: 1050px;
                margin: 0 auto;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            }
            
            /* Wide Tabs */
            .wide-tabs {
                display: flex;
                background: #f1f3f4;
                border-radius: 8px;
                padding: 4px;
                margin-bottom: 20px;
            }
            
            .wide-tab {
                flex: 1;
                padding: 12px 20px;
                border: none;
                background: transparent;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.3s;
                font-size: 14px;
                font-weight: 500;
                color: #5f6368;
            }
            
            .wide-tab:hover {
                background: rgba(26, 115, 232, 0.08);
                color: #1a73e8;
            }
            
            .wide-tab.active {
                background: #1a73e8;
                color: white;
                box-shadow: 0 2px 8px rgba(26, 115, 232, 0.3);
            }
            
            /* Tab Content */
            .tab-content {
                display: none;
            }
            
            .tab-content.active {
                display: block;
            }
            
            /* Wide Grid - 4 Columns */
            .wide-grid {
                display: grid;
                grid-template-columns: 280px 260px 260px 280px;
                gap: 20px;
                margin-bottom: 20px;
            }
            
            /* Card Styles */
            .input-card, .preview-card {
                background: white;
                border: 1px solid #e8eaed;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            
            .card-header {
                background: #f8f9fa;
                padding: 12px 16px;
                border-bottom: 1px solid #e8eaed;
            }
            
            .card-header h4 {
                margin: 0;
                font-size: 14px;
                font-weight: 600;
                color: #202124;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .card-content {
                padding: 16px;
            }
            
            /* Primary Input */
            .primary-input {
                width: 100%;
                padding: 12px 14px;
                border: 2px solid #e8eaed;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 500;
                transition: all 0.3s;
                margin-bottom: 10px;
            }
            
            .primary-input:focus {
                outline: none;
                border-color: #1a73e8;
                box-shadow: 0 0 0 3px rgba(26, 115, 232, 0.1);
            }
            
            .status-row {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 16px;
                font-size: 12px;
                color: #5f6368;
            }
            
            /* Examples Grid */
            .examples-grid {
                display: grid;
                grid-template-columns: 1fr 1fr 1fr;
                gap: 8px;
            }
            
            .example-card {
                padding: 8px;
                border: 1px solid #e8eaed;
                border-radius: 6px;
                background: white;
                cursor: pointer;
                transition: all 0.3s;
                text-align: center;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 4px;
            }
            
            .example-card:hover {
                border-color: #1a73e8;
                background: #e8f0fe;
                transform: translateY(-1px);
            }
            
            .example-icon {
                font-size: 16px;
            }
            
            .example-text {
                font-size: 10px;
                font-weight: 500;
                color: #5f6368;
            }
            
            /* Input Groups */
            .input-group {
                margin-bottom: 16px;
            }
            
            .input-group label {
                display: block;
                font-size: 12px;
                font-weight: 600;
                color: #5f6368;
                margin-bottom: 6px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .form-input, .form-select {
                width: 100%;
                padding: 10px 12px;
                border: 1px solid #e8eaed;
                border-radius: 4px;
                font-size: 13px;
                transition: border-color 0.3s;
            }
            
            .form-input:focus, .form-select:focus {
                outline: none;
                border-color: #1a73e8;
                box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.1);
            }
            
            /* Preview Display */
            .preview-display {
                background: #f8f9fa;
                border-radius: 6px;
                padding: 14px;
                margin-bottom: 16px;
            }
            
            .preview-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 6px 0;
                border-bottom: 1px solid #e8eaed;
            }
            
            .preview-row:last-child {
                border-bottom: none;
            }
            
            .preview-label {
                font-size: 11px;
                font-weight: 600;
                color: #5f6368;
                text-transform: uppercase;
            }
            
            .preview-value {
                font-size: 12px;
                font-weight: 500;
                color: #202124;
            }
            
            /* API Card */
            .api-card {
                background: linear-gradient(135deg, #e8f0fe 0%, #f3e5f5 100%);
                border-radius: 6px;
                padding: 12px;
            }
            
            .api-toggle-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            
            .api-info {
                display: flex;
                flex-direction: column;
            }
            
            .api-title {
                font-size: 13px;
                font-weight: 600;
                color: #1a73e8;
            }
            
            .api-subtitle {
                font-size: 11px;
                color: #5f6368;
            }
            
            /* Modern Switch */
            .modern-switch {
                position: relative;
                width: 48px;
                height: 28px;
            }
            
            .modern-switch input {
                opacity: 0;
                width: 0;
                height: 0;
            }
            
            .switch-slider {
                position: absolute;
                cursor: pointer;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: #ccc;
                transition: .3s;
                border-radius: 28px;
            }
            
            .switch-slider:before {
                position: absolute;
                content: "";
                height: 22px;
                width: 22px;
                left: 3px;
                bottom: 3px;
                background-color: white;
                transition: .3s;
                border-radius: 50%;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            }
            
            input:checked + .switch-slider {
                background-color: #1a73e8;
            }
            
            input:checked + .switch-slider:before {
                transform: translateX(20px);
            }
            
            /* Action Bar */
            .action-bar-wide {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 20px;
                background: #f8f9fa;
                border-top: 1px solid #e8eaed;
                border-radius: 0 0 8px 8px;
                margin: 20px -20px -20px -20px;
            }
            
            .action-left {
                display: flex;
                align-items: center;
            }
            
            .form-status {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 13px;
                color: #5f6368;
            }
            
            .status-dot {
                color: #34a853;
                font-size: 8px;
            }
            
            .action-right {
                display: flex;
                gap: 12px;
            }
            
            .btn-wide {
                padding: 12px 24px;
                border: none;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.3s;
                display: flex;
                align-items: center;
                gap: 8px;
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
                box-shadow: 0 2px 8px rgba(26, 115, 232, 0.3);
            }
            
            /* Import Wide */
            .import-wide {
                height: 400px;
            }
            
            .import-grid {
                display: grid;
                grid-template-columns: 2fr 1fr;
                gap: 30px;
                height: 100%;
            }
            
            .large-drop-zone {
                border: 3px dashed #1a73e8;
                border-radius: 12px;
                background: linear-gradient(135deg, #f8f9ff 0%, #e8f0fe 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.3s;
            }
            
            .large-drop-zone:hover,
            .large-drop-zone.dragover {
                background: linear-gradient(135deg, #e8f0fe 0%, #d2e3fc 100%);
                border-color: #1557b0;
                transform: scale(1.02);
            }
            
            .drop-content-large {
                text-align: center;
                padding: 40px;
            }
            
            .drop-icon-large {
                font-size: 64px;
                margin-bottom: 20px;
            }
            
            .drop-content-large h3 {
                margin: 0 0 10px 0;
                color: #202124;
                font-size: 20px;
            }
            
            .drop-content-large p {
                margin: 0 0 20px 0;
                color: #5f6368;
                font-size: 14px;
            }
            
            .supported-formats {
                display: flex;
                gap: 10px;
                justify-content: center;
            }
            
            .format-badge {
                background: #1a73e8;
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: 500;
            }
            
            .link-btn {
                background: none;
                border: none;
                color: #1a73e8;
                text-decoration: underline;
                cursor: pointer;
                font-weight: 500;
            }
            
            /* Features Detailed */
            .features-detailed h3 {
                margin: 0 0 20px 0;
                color: #202124;
                font-size: 18px;
            }
            
            .feature-cards {
                display: flex;
                flex-direction: column;
                gap: 16px;
            }
            
            .feature-card {
                display: flex;
                align-items: center;
                gap: 16px;
                padding: 16px;
                background: white;
                border: 1px solid #e8eaed;
                border-radius: 8px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            
            .feature-icon {
                font-size: 24px;
                width: 40px;
                text-align: center;
            }
            
            .feature-info {
                display: flex;
                flex-direction: column;
            }
            
            .feature-info strong {
                color: #202124;
                font-size: 14px;
                margin-bottom: 4px;
            }
            
            .feature-info span {
                color: #5f6368;
                font-size: 12px;
            }
            
            /* Responsive */
            @media (max-width: 1200px) {
                .wide-grid {
                    grid-template-columns: 1fr 1fr;
                    gap: 16px;
                }
                
                .import-grid {
                    grid-template-columns: 1fr;
                    gap: 20px;
                }
            }
            
            @media (max-width: 768px) {
                .wide-grid {
                    grid-template-columns: 1fr;
                }
                
                .action-bar-wide {
                    flex-direction: column;
                    gap: 12px;
                }
                
                .btn-wide {
                    width: 100%;
                    justify-content: center;
                }
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
        document.querySelectorAll('.wide-tab').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const targetTab = this.dataset.target;
                console.log('🔄 Tab clicked:', targetTab);
                
                // Update buttons
                document.querySelectorAll('.wide-tab').forEach(b => b.classList.remove('active'));
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
    }
    
    // 🔄 REAL-TIME PREVIEW
    function setupRealtimePreview() {
        const inputs = {
            trackingNumber: document.getElementById('enh_trackingNumber'),
            trackingType: document.getElementById('enh_trackingType'),
            carrier: document.getElementById('enh_carrier'),
            origin: document.getElementById('enh_origin'),
            destination: document.getElementById('enh_destination'),
            status: document.getElementById('enh_status')
        };
        
        const previews = {
            number: document.getElementById('previewNumber'),
            type: document.getElementById('previewType'),
            carrier: document.getElementById('previewCarrier'),
            route: document.getElementById('previewRoute'),
            status: document.getElementById('previewStatus')
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
            if (inputs.status && previews.status) {
                const statusText = inputs.status.options[inputs.status.selectedIndex]?.text || '-';
                previews.status.textContent = statusText;
            }
        }
        
        // Attach listeners
        Object.values(inputs).forEach(input => {
            if (input) {
                input.addEventListener('input', updatePreview);
                input.addEventListener('change', updatePreview);
            }
        });
        
        // Initial update
        updatePreview();
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
        document.querySelectorAll('.example-card').forEach(btn => {
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
            statusIcon.className = 'fas fa-circle-notch fa-spin status-icon';
            statusText.textContent = 'Rilevamento...';
        }
    }
    
    function clearDetection() {
        const statusIcon = document.querySelector('.status-icon');
        const statusText = document.querySelector('.status-text');
        
        if (statusIcon && statusText) {
            statusIcon.className = 'fas fa-search status-icon';
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
        const statusIcon = document.querySelector('.status-icon');
        const statusText = document.querySelector('.status-text');
        
        detectedData = { type, carrier };
        
        const typeLabels = {
            container: '🚢 Container',
            awb: '✈️ Air Waybill',
            bl: '📄 Bill of Lading'
        };
        
        if (statusIcon && statusText) {
            statusIcon.className = 'fas fa-check-circle status-icon';
            statusIcon.style.color = '#28a745';
            statusText.textContent = `Rilevato: ${typeLabels[type]}${carrier ? ` (${carrier})` : ''}`;
        }
    }
    
    function showDetectionError() {
        const statusIcon = document.querySelector('.status-icon');
        const statusText = document.querySelector('.status-text');
        
        if (statusIcon && statusText) {
            statusIcon.className = 'fas fa-exclamation-triangle status-icon';
            statusIcon.style.color = '#dc3545';
            statusText.textContent = 'Tipo non riconosciuto';
        }
    }
    
    function updateCarrierOptions(type) {
        const select = document.getElementById('enh_carrier');
        if (!select) return;
        
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