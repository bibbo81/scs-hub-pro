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
        <div class="enhanced-form-container">
            <!-- Tab Navigation con animazioni -->
            <div class="form-tabs">
                <button class="tab-btn active" data-tab="single">
                    <div class="tab-icon">
                        <i class="fas fa-plus"></i>
                    </div>
                    <div class="tab-content">
                        <span class="tab-title">Singolo</span>
                        <span class="tab-subtitle">Aggiungi un tracking</span>
                    </div>
                </button>
                <button class="tab-btn" data-tab="import">
                    <div class="tab-icon">
                        <i class="fas fa-file-import"></i>
                    </div>
                    <div class="tab-content">
                        <span class="tab-title">Import Multiplo</span>
                        <span class="tab-subtitle">Carica Excel/CSV</span>
                    </div>
                </button>
            </div>
            
            <!-- Single Tracking Tab -->
            <div class="tab-pane active" data-tab="single">
                <form id="enhancedSingleForm" class="modern-form">
                    
                    <!-- Progress Indicator -->
                    <div class="progress-steps">
                        <div class="step active" data-step="1">
                            <div class="step-circle">1</div>
                            <span>Tracking</span>
                        </div>
                        <div class="step-connector"></div>
                        <div class="step" data-step="2">
                            <div class="step-circle">2</div>
                            <span>Dettagli</span>
                        </div>
                        <div class="step-connector"></div>
                        <div class="step" data-step="3">
                            <div class="step-circle">3</div>
                            <span>Conferma</span>
                        </div>
                    </div>
                    
                    <!-- Step 1: Smart Input -->
                    <div class="form-step active" data-step="1">
                        <div class="step-header">
                            <h3>🔍 Inserisci Tracking</h3>
                            <p>Inserisci il numero e lascia che rilevi automaticamente il tipo</p>
                        </div>
                        
                        <div class="smart-input-container">
                            <div class="input-group">
                                <label class="input-label">
                                    <span>Numero Tracking</span>
                                    <span class="required">*</span>
                                </label>
                                
                                <div class="input-wrapper">
                                    <input type="text" 
                                           id="enh_trackingNumber" 
                                           class="smart-input" 
                                           placeholder="Es: MSKU1234567, 176-12345678"
                                           autocomplete="off"
                                           required>
                                    
                                    <!-- Detection Status -->
                                    <div class="detection-status">
                                        <div class="detection-idle">
                                            <i class="fas fa-search"></i>
                                            <span>Inizia a digitare...</span>
                                        </div>
                                        <div class="detection-loading" style="display: none;">
                                            <i class="fas fa-circle-notch fa-spin"></i>
                                            <span>Rilevamento...</span>
                                        </div>
                                        <div class="detection-success" style="display: none;">
                                            <i class="fas fa-check-circle"></i>
                                            <span class="detection-result"></span>
                                        </div>
                                        <div class="detection-error" style="display: none;">
                                            <i class="fas fa-exclamation-triangle"></i>
                                            <span>Tipo non riconosciuto</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Quick Examples con Visual Preview -->
                                <div class="quick-examples">
                                    <span class="examples-label">Esempi veloci:</span>
                                    <div class="examples-grid">
                                        <button type="button" class="example-card" data-example="MSKU1234567" data-type="container">
                                            <div class="example-icon">🚢</div>
                                            <div class="example-info">
                                                <span class="example-title">Container</span>
                                                <span class="example-code">MSKU1234567</span>
                                            </div>
                                        </button>
                                        
                                        <button type="button" class="example-card" data-example="176-12345678" data-type="awb">
                                            <div class="example-icon">✈️</div>
                                            <div class="example-info">
                                                <span class="example-title">Air Cargo</span>
                                                <span class="example-code">176-12345678</span>
                                            </div>
                                        </button>
                                        
                                        <button type="button" class="example-card" data-example="GESU1234567" data-type="container">
                                            <div class="example-icon">🚢</div>
                                            <div class="example-info">
                                                <span class="example-title">MSC</span>
                                                <span class="example-code">GESU1234567</span>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Step Actions -->
                        <div class="step-actions">
                            <button type="button" class="btn btn-primary next-step" data-next="2">
                                Continua <i class="fas fa-arrow-right"></i>
                            </button>
                        </div>
                    </div>
                    
                    <!-- Step 2: Details -->
                    <div class="form-step" data-step="2">
                        <div class="step-header">
                            <h3>📋 Dettagli Spedizione</h3>
                            <p>Completa le informazioni o lascia che l'API le recuperi automaticamente</p>
                        </div>
                        
                        <div class="form-grid">
                            <div class="input-group">
                                <label class="input-label">Tipo Tracking</label>
                                <select id="enh_trackingType" class="form-select">
                                    <option value="auto">🔍 Auto-detect</option>
                                    <option value="container">🚢 Container</option>
                                    <option value="awb">✈️ Air Waybill</option>
                                    <option value="bl">📄 Bill of Lading</option>
                                    <option value="parcel">📦 Parcel</option>
                                </select>
                            </div>
                            
                            <div class="input-group">
                                <label class="input-label">Vettore</label>
                                <select id="enh_carrier" class="form-select">
                                    <option value="">Seleziona automaticamente</option>
                                </select>
                            </div>
                            
                            <div class="input-group">
                                <label class="input-label">Porto/Aeroporto Origine</label>
                                <input type="text" id="enh_origin" class="form-input" placeholder="Es: SHANGHAI, MXP">
                            </div>
                            
                            <div class="input-group">
                                <label class="input-label">Porto/Aeroporto Destinazione</label>
                                <input type="text" id="enh_destination" class="form-input" placeholder="Es: GENOVA, JFK">
                            </div>
                            
                            <div class="input-group">
                                <label class="input-label">Numero Riferimento</label>
                                <input type="text" id="enh_reference" class="form-input" placeholder="Es: PO-2024-001">
                            </div>
                            
                            <div class="input-group">
                                <label class="input-label">Stato Iniziale</label>
                                <select id="enh_status" class="form-select">
                                    <option value="registered">📝 Registrato</option>
                                    <option value="in_transit">🚛 In Transito</option>
                                    <option value="arrived">📍 Arrivato</option>
                                    <option value="customs_cleared">✅ Sdoganato</option>
                                </select>
                            </div>
                        </div>
                        
                        <!-- API Toggle con Enhanced Visual -->
                        <div class="api-toggle-section">
                            <div class="toggle-card">
                                <div class="toggle-header">
                                    <div class="toggle-icon">🔄</div>
                                    <div class="toggle-info">
                                        <h4>Dati in Tempo Reale</h4>
                                        <p>Recupera automaticamente informazioni aggiornate tramite API ShipsGo</p>
                                    </div>
                                    <label class="switch">
                                        <input type="checkbox" id="enh_useApi" checked>
                                        <span class="slider"></span>
                                    </label>
                                </div>
                                <div class="toggle-benefits">
                                    <div class="benefit">
                                        <i class="fas fa-check text-success"></i>
                                        <span>Informazioni sempre aggiornate</span>
                                    </div>
                                    <div class="benefit">
                                        <i class="fas fa-check text-success"></i>
                                        <span>Compilazione automatica campi</span>
                                    </div>
                                    <div class="benefit">
                                        <i class="fas fa-check text-success"></i>
                                        <span>Tracking eventi in tempo reale</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Step Actions -->
                        <div class="step-actions">
                            <button type="button" class="btn btn-secondary prev-step" data-prev="1">
                                <i class="fas fa-arrow-left"></i> Indietro
                            </button>
                            <button type="button" class="btn btn-primary next-step" data-next="3">
                                Continua <i class="fas fa-arrow-right"></i>
                            </button>
                        </div>
                    </div>
                    
                    <!-- Step 3: Confirmation -->
                    <div class="form-step" data-step="3">
                        <div class="step-header">
                            <h3>✅ Conferma e Aggiungi</h3>
                            <p>Verifica i dati prima di aggiungere il tracking</p>
                        </div>
                        
                        <div class="confirmation-summary">
                            <div class="summary-card">
                                <h4>📦 Riepilogo Tracking</h4>
                                <div id="trackingSummary" class="summary-content">
                                    <!-- Populated by JS -->
                                </div>
                            </div>
                            
                            <!-- API Preview -->
                            <div id="apiPreview" class="preview-card" style="display: none;">
                                <h4>🔄 Anteprima Dati API</h4>
                                <div id="apiPreviewContent" class="preview-content">
                                    <!-- Populated by JS -->
                                </div>
                            </div>
                        </div>
                        
                        <!-- Step Actions -->
                        <div class="step-actions">
                            <button type="button" class="btn btn-secondary prev-step" data-prev="2">
                                <i class="fas fa-arrow-left"></i> Indietro
                            </button>
                            <button type="submit" class="btn btn-success submit-btn" id="enhSubmitBtn">
                                <i class="fas fa-plus"></i> Aggiungi Tracking
                            </button>
                        </div>
                    </div>
                </form>
            </div>
            
            <!-- Import Tab (placeholder for now) -->
            <div class="tab-pane" data-tab="import">
                <div class="import-placeholder">
                    <div class="placeholder-content">
                        <div class="placeholder-icon">📁</div>
                        <h3>Import Multiplo</h3>
                        <p>Feature in sviluppo - Step 3</p>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Enhanced Styles -->
        <style>
        .enhanced-form-container {
            max-width: 800px;
            margin: 0 auto;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        /* Tab Navigation */
        .form-tabs {
            display: flex;
            gap: 1px;
            background: #e9ecef;
            border-radius: 12px;
            padding: 4px;
            margin-bottom: 2rem;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .tab-btn {
            flex: 1;
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px 20px;
            border: none;
            background: transparent;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s ease;
            text-align: left;
        }
        
        .tab-btn:hover {
            background: rgba(0, 122, 255, 0.1);
        }
        
        .tab-btn.active {
            background: white;
            color: #007AFF;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
        
        .tab-icon {
            font-size: 1.5rem;
        }
        
        .tab-content {
            display: flex;
            flex-direction: column;
        }
        
        .tab-title {
            font-weight: 600;
            font-size: 1rem;
        }
        
        .tab-subtitle {
            font-size: 0.875rem;
            color: #6c757d;
            margin-top: 2px;
        }
        
        /* Tab Panes */
        .tab-pane {
            display: none;
            animation: fadeInUp 0.4s ease;
        }
        
        .tab-pane.active {
            display: block;
        }
        
        /* Progress Steps */
        .progress-steps {
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 3rem;
            padding: 0 2rem;
        }
        
        .step {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            color: #6c757d;
            transition: all 0.3s ease;
        }
        
        .step.active {
            color: #007AFF;
        }
        
        .step.completed {
            color: #28a745;
        }
        
        .step-circle {
            width: 40px;
            height: 40px;
            border: 2px solid currentColor;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            margin-bottom: 8px;
            background: white;
            transition: all 0.3s ease;
        }
        
        .step.active .step-circle {
            background: #007AFF;
            color: white;
            transform: scale(1.1);
        }
        
        .step.completed .step-circle {
            background: #28a745;
            color: white;
        }
        
        .step-connector {
            flex: 1;
            height: 2px;
            background: #e9ecef;
            margin: 0 1rem;
            position: relative;
            top: -16px;
        }
        
        /* Form Steps */
        .form-step {
            display: none;
            animation: slideInRight 0.4s ease;
        }
        
        .form-step.active {
            display: block;
        }
        
        .step-header {
            text-align: center;
            margin-bottom: 2rem;
        }
        
        .step-header h3 {
            font-size: 1.75rem;
            margin-bottom: 0.5rem;
            color: #343a40;
        }
        
        .step-header p {
            color: #6c757d;
            font-size: 1.1rem;
        }
        
        /* Smart Input */
        .smart-input-container {
            background: #f8f9fa;
            border-radius: 16px;
            padding: 2rem;
            margin-bottom: 2rem;
        }
        
        .input-group {
            margin-bottom: 1.5rem;
        }
        
        .input-label {
            display: flex;
            align-items: center;
            gap: 4px;
            font-weight: 600;
            color: #343a40;
            margin-bottom: 8px;
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .required {
            color: #dc3545;
        }
        
        .input-wrapper {
            position: relative;
        }
        
        .smart-input {
            width: 100%;
            padding: 16px 20px;
            border: 2px solid #e9ecef;
            border-radius: 12px;
            font-size: 1.125rem;
            font-weight: 500;
            transition: all 0.3s ease;
            background: white;
        }
        
        .smart-input:focus {
            outline: none;
            border-color: #007AFF;
            box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1);
            transform: translateY(-1px);
        }
        
        /* Detection Status */
        .detection-status {
            margin-top: 12px;
            padding: 12px 16px;
            border-radius: 8px;
            background: white;
            border: 1px solid #e9ecef;
            transition: all 0.3s ease;
        }
        
        .detection-status > div {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 0.9rem;
        }
        
        .detection-idle {
            color: #6c757d;
        }
        
        .detection-loading {
            color: #007AFF;
        }
        
        .detection-success {
            color: #28a745;
            background: #d4edda;
            margin: -12px -16px;
            padding: 12px 16px;
            border-radius: 8px;
        }
        
        .detection-error {
            color: #dc3545;
        }
        
        /* Quick Examples */
        .quick-examples {
            margin-top: 1.5rem;
        }
        
        .examples-label {
            display: block;
            font-weight: 600;
            color: #6c757d;
            margin-bottom: 1rem;
            font-size: 0.9rem;
        }
        
        .examples-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
        }
        
        .example-card {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 16px;
            border: 2px solid #e9ecef;
            border-radius: 10px;
            background: white;
            cursor: pointer;
            transition: all 0.3s ease;
            text-align: left;
        }
        
        .example-card:hover {
            border-color: #007AFF;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        
        .example-icon {
            font-size: 1.5rem;
        }
        
        .example-info {
            display: flex;
            flex-direction: column;
        }
        
        .example-title {
            font-weight: 600;
            color: #343a40;
        }
        
        .example-code {
            font-family: 'Courier New', monospace;
            font-size: 0.8rem;
            color: #6c757d;
        }
        
        /* Form Grid */
        .form-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }
        
        .form-input, .form-select {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid #e9ecef;
            border-radius: 8px;
            font-size: 1rem;
            transition: all 0.3s ease;
            background: white;
        }
        
        .form-input:focus, .form-select:focus {
            outline: none;
            border-color: #007AFF;
            box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1);
        }
        
        /* API Toggle */
        .api-toggle-section {
            margin-bottom: 2rem;
        }
        
        .toggle-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 16px;
            padding: 1.5rem;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        }
        
        .toggle-header {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin-bottom: 1rem;
        }
        
        .toggle-icon {
            font-size: 2rem;
        }
        
        .toggle-info {
            flex: 1;
        }
        
        .toggle-info h4 {
            margin: 0 0 0.5rem 0;
            font-size: 1.25rem;
        }
        
        .toggle-info p {
            margin: 0;
            opacity: 0.9;
            font-size: 0.9rem;
        }
        
        /* Switch */
        .switch {
            position: relative;
            display: inline-block;
            width: 60px;
            height: 34px;
        }
        
        .switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }
        
        .slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(255,255,255,0.3);
            transition: .4s;
            border-radius: 34px;
        }
        
        .slider:before {
            position: absolute;
            content: "";
            height: 26px;
            width: 26px;
            left: 4px;
            bottom: 4px;
            background-color: white;
            transition: .4s;
            border-radius: 50%;
        }
        
        input:checked + .slider {
            background-color: rgba(255,255,255,0.5);
        }
        
        input:checked + .slider:before {
            transform: translateX(26px);
        }
        
        .toggle-benefits {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 0.5rem;
        }
        
        .benefit {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.9rem;
        }
        
        /* Summary */
        .confirmation-summary {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
            margin-bottom: 2rem;
        }
        
        .summary-card, .preview-card {
            background: #f8f9fa;
            border-radius: 12px;
            padding: 1.5rem;
            border: 1px solid #e9ecef;
        }
        
        .summary-card h4, .preview-card h4 {
            margin: 0 0 1rem 0;
            color: #343a40;
        }
        
        /* Step Actions */
        .step-actions {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 3rem;
            padding-top: 2rem;
            border-top: 1px solid #e9ecef;
        }
        
        .btn {
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 1rem;
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
        
        .btn-success {
            background: #28a745;
            color: white;
        }
        
        .btn-success:hover {
            background: #218838;
            transform: translateY(-1px);
        }
        
        /* Import Placeholder */
        .import-placeholder {
            text-align: center;
            padding: 4rem 2rem;
            color: #6c757d;
        }
        
        .placeholder-icon {
            font-size: 4rem;
            margin-bottom: 1rem;
        }
        
        /* Animations */
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        @keyframes slideInRight {
            from {
                opacity: 0;
                transform: translateX(20px);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }
        
        /* Responsive */
        @media (max-width: 768px) {
            .form-tabs {
                flex-direction: column;
            }
            
            .tab-btn {
                justify-content: center;
                text-align: center;
            }
            
            .progress-steps {
                padding: 0 1rem;
            }
            
            .step span {
                font-size: 0.8rem;
            }
            
            .step-connector {
                margin: 0 0.5rem;
            }
            
            .smart-input-container {
                padding: 1.5rem;
            }
            
            .examples-grid {
                grid-template-columns: 1fr;
            }
            
            .form-grid {
                grid-template-columns: 1fr;
            }
            
            .step-actions {
                flex-direction: column;
                gap: 1rem;
            }
            
            .btn {
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