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
    
    // 🎯 MODAL SYSTEM DINAMICO - Modifica showEnhancedTrackingForm()
    function showEnhancedTrackingForm(options = {}) {
        console.log('🚀 PROGRESSIVE FORM: Showing enhanced form');
        
        // MODAL COMPLETAMENTE DINAMICO
        window.ModalSystem.show({
            title: '📦 Aggiungi Tracking Enhanced',
            content: renderDynamicForm(),
            size: 'dynamic', // Nuovo size type
            showFooter: false,
            className: 'dynamic-enhanced-modal',
            // OVERRIDE COMPLETO DEGLI STILI
            customStyles: {
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 'auto',           // AUTO WIDTH
                height: 'auto',          // AUTO HEIGHT
                minWidth: '600px',       // Minimo per usabilità
                maxWidth: '95vw',        // Massimo per responsive
                maxHeight: '95vh',       // Massimo per non uscire dallo schermo
                padding: '0',
                margin: '0',
                overflow: 'visible',     // Per permettere crescita
                background: 'transparent' // Il background lo gestisce il contenuto
            }
        });
        
        // Setup dopo rendering
        setTimeout(() => {
            setupEnhancedInteractions();
            setupRealtimePreview();
            setupDynamicResize(); // NUOVO: Auto-resize
            if (options && Object.keys(options).length > 0) {
                prefillForm(options);
            }
        }, 100);
    }
    
    // 🔄 SETUP AUTO-RESIZE
    function setupDynamicResize() {
        const modal = document.querySelector('.dynamic-enhanced-modal');
        if (!modal) return;
        
        // Observer per cambiamenti di contenuto
        const resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                console.log('📏 Modal content size changed:', entry.contentRect);
                // Il modal si adatta automaticamente grazie agli stili CSS
            }
        });
        
        resizeObserver.observe(modal);
        
        // Cleanup quando il modal si chiude
        const originalClose = window.ModalSystem.closeAll;
        window.ModalSystem.closeAll = function() {
            resizeObserver.disconnect();
            window.ModalSystem.closeAll = originalClose;
            return originalClose.apply(this, arguments);
        };
    }
    
    function renderDynamicForm() {
        return `
            <div class="dynamic-form-container">
                <!-- Tab Navigation che si adatta -->
                <div class="dynamic-tabs">
                    <button class="dynamic-tab active" data-target="single">
                        <i class="fas fa-plus"></i> Tracking Singolo
                    </button>
                    <button class="dynamic-tab" data-target="import">
                        <i class="fas fa-upload"></i> Import Multiplo
                    </button>
                </div>
                
                <!-- Single Tab - LAYOUT DINAMICO -->
                <div class="tab-content active" data-tab="single">
                    <form id="enhancedSingleForm" class="dynamic-form">
                        
                        <!-- Flexible Grid che si adatta -->
                        <div class="flexible-grid">
                            
                            <!-- Input Card -->
                            <div class="flex-card primary-card">
                                <div class="card-header">
                                    <h4><i class="fas fa-search"></i> Numero Tracking</h4>
                                </div>
                                <div class="card-body">
                                    <input type="text" 
                                           id="enh_trackingNumber" 
                                           class="primary-input" 
                                           placeholder="Es: MSKU1234567, 176-12345678"
                                           required>
                                    
                                    <div class="status-indicator">
                                        <i class="fas fa-search status-icon"></i>
                                        <span class="status-text">Auto-detection...</span>
                                    </div>
                                    
                                    <div class="examples-flex">
                                        <button type="button" class="example-btn" data-example="MSKU1234567">
                                            <span class="example-icon">🚢</span>
                                            <span class="example-label">Container</span>
                                        </button>
                                        <button type="button" class="example-btn" data-example="176-12345678">
                                            <span class="example-icon">✈️</span>
                                            <span class="example-label">Air Cargo</span>
                                        </button>
                                        <button type="button" class="example-btn" data-example="GESU1234567">
                                            <span class="example-icon">📦</span>
                                            <span class="example-label">MSC</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Details Card -->
                            <div class="flex-card">
                                <div class="card-header">
                                    <h4><i class="fas fa-tags"></i> Tipo & Vettore</h4>
                                </div>
                                <div class="card-body">
                                    <div class="field-group">
                                        <label>Tipo Tracking</label>
                                        <select id="enh_trackingType" class="dynamic-select">
                                            <option value="auto">🔍 Auto-detect</option>
                                            <option value="container">🚢 Container</option>
                                            <option value="awb">✈️ Air Waybill</option>
                                            <option value="bl">📄 Bill of Lading</option>
                                        </select>
                                    </div>
                                    
                                    <div class="field-group">
                                        <label>Vettore</label>
                                        <select id="enh_carrier" class="dynamic-select">
                                            <option value="">Seleziona automaticamente</option>
                                        </select>
                                    </div>
                                    
                                    <div class="field-group">
                                        <label>Stato Iniziale</label>
                                        <select id="enh_status" class="dynamic-select">
                                            <option value="registered">📝 Registrato</option>
                                            <option value="in_transit">🚛 In Transito</option>
                                            <option value="arrived">📍 Arrivato</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Route Card -->
                            <div class="flex-card">
                                <div class="card-header">
                                    <h4><i class="fas fa-route"></i> Rotta</h4>
                                </div>
                                <div class="card-body">
                                    <div class="field-group">
                                        <label>Origine</label>
                                        <input type="text" id="enh_origin" class="dynamic-input" placeholder="Porto/Aeroporto origine">
                                    </div>
                                    
                                    <div class="field-group">
                                        <label>Destinazione</label>
                                        <input type="text" id="enh_destination" class="dynamic-input" placeholder="Porto/Aeroporto destinazione">
                                    </div>
                                    
                                    <div class="field-group">
                                        <label>Riferimento</label>
                                        <input type="text" id="enh_reference" class="dynamic-input" placeholder="Es: PO-2024-001">
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Preview Card -->
                            <div class="flex-card preview-card">
                                <div class="card-header">
                                    <h4><i class="fas fa-eye"></i> Anteprima Live</h4>
                                </div>
                                <div class="card-body">
                                    <div class="preview-display">
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
                                    
                                    <!-- API Toggle -->
                                    <div class="api-toggle-card">
                                        <div class="api-row">
                                            <div class="api-info">
                                                <span class="api-title">🔄 API Real-time</span>
                                                <span class="api-desc">Dati aggiornati</span>
                                            </div>
                                            <label class="api-switch">
                                                <input type="checkbox" id="enh_useApi" checked>
                                                <span class="switch-track"></span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Action Bar Dinamica -->
                        <div class="dynamic-actions">
                            <div class="action-status">
                                <i class="fas fa-circle status-dot"></i>
                                <span>Pronto per l'aggiunta</span>
                            </div>
                            <div class="action-buttons">
                                <button type="button" class="dynamic-btn btn-cancel" onclick="window.ModalSystem.closeAll()">
                                    <i class="fas fa-times"></i> Annulla
                                </button>
                                <button type="submit" class="dynamic-btn btn-submit" id="enhSubmitBtn">
                                    <i class="fas fa-plus"></i> Aggiungi Tracking
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
                
                <!-- Import Tab - DINAMICO -->
                <div class="tab-content" data-tab="import">
                    <div class="import-dynamic">
                        <div class="import-flex">
                            <!-- Drop Zone Dinamica -->
                            <div class="dynamic-drop-zone" id="enhDropZone">
                                <div class="drop-content-flex">
                                    <div class="drop-visual">
                                        <div class="drop-icon">📁</div>
                                        <h3>Trascina qui i tuoi file</h3>
                                        <p>Oppure <button type="button" class="inline-link" onclick="document.getElementById('enhFileInput').click()">seleziona file</button></p>
                                        <div class="format-tags">
                                            <span class="format-tag">.xlsx</span>
                                            <span class="format-tag">.xls</span>
                                            <span class="format-tag">.csv</span>
                                        </div>
                                    </div>
                                </div>
                                <input type="file" id="enhFileInput" accept=".xlsx,.xls,.csv" style="display: none;">
                            </div>
                            
                            <!-- Features Sidebar -->
                            <div class="features-sidebar">
                                <h3>📊 Funzionalità</h3>
                                <div class="feature-list">
                                    <div class="feature-item">
                                        <div class="feature-icon">🔍</div>
                                        <div class="feature-text">
                                            <strong>Auto-detection</strong>
                                            <span>Formato file automatico</span>
                                        </div>
                                    </div>
                                    <div class="feature-item">
                                        <div class="feature-icon">🗂️</div>
                                        <div class="feature-text">
                                            <strong>Mapping Colonne</strong>
                                            <span>Associazione automatica</span>
                                        </div>
                                    </div>
                                    <div class="feature-item">
                                        <div class="feature-icon">👁️</div>
                                        <div class="feature-text">
                                            <strong>Preview</strong>
                                            <span>Controllo prima import</span>
                                        </div>
                                    </div>
                                    <div class="feature-item">
                                        <div class="feature-icon">✅</div>
                                        <div class="feature-text">
                                            <strong>Validazione</strong>
                                            <span>Controllo qualità dati</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- DYNAMIC STYLES - Auto-sizing -->
            <style>
            /* Container principale dinamico */
            .dynamic-form-container {
                background: white;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
                overflow: hidden;
                max-width: 100%;
                width: max-content; /* SI ADATTA AL CONTENUTO */
                min-width: 600px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            }
            
            /* Tab dinamici */
            .dynamic-tabs {
                display: flex;
                background: #f8f9fa;
                border-bottom: 1px solid #e9ecef;
            }
            
            .dynamic-tab {
                flex: 1;
                padding: 16px 20px;
                border: none;
                background: transparent;
                cursor: pointer;
                transition: all 0.3s;
                font-size: 14px;
                font-weight: 500;
                color: #6c757d;
                border-bottom: 3px solid transparent;
            }
            
            .dynamic-tab:hover {
                background: rgba(0, 123, 255, 0.05);
                color: #007bff;
            }
            
            .dynamic-tab.active {
                color: #007bff;
                border-bottom-color: #007bff;
                background: white;
            }
            
            /* Tab Content */
            .tab-content {
                display: none;
            }
            
            .tab-content.active {
                display: block;
            }
            
            /* Form dinamico */
            .dynamic-form {
                padding: 24px;
            }
            
            /* Grid flessibile */
            .flexible-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                gap: 20px;
                margin-bottom: 24px;
            }
            
            /* Cards flessibili */
            .flex-card {
                background: #f8f9fa;
                border: 1px solid #e9ecef;
                border-radius: 8px;
                overflow: hidden;
                transition: all 0.3s;
                min-height: fit-content;
            }
            
            .flex-card:hover {
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }
            
            .primary-card {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
            }
            
            .primary-card .card-header h4 {
                color: white;
            }
            
            .preview-card {
                background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%);
                color: white;
            }
            
            .preview-card .card-header h4 {
                color: white;
            }
            
            .card-header {
                padding: 16px;
                border-bottom: 1px solid rgba(0, 0, 0, 0.1);
                background: rgba(255, 255, 255, 0.1);
            }
            
            .card-header h4 {
                margin: 0;
                font-size: 14px;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .card-body {
                padding: 20px;
            }
            
            /* Input dinamici */
            .primary-input {
                width: 100%;
                padding: 12px 16px;
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-radius: 6px;
                font-size: 14px;
                background: rgba(255, 255, 255, 0.9);
                color: #333;
                transition: all 0.3s;
                margin-bottom: 12px;
            }
            
            .primary-input:focus {
                outline: none;
                border-color: rgba(255, 255, 255, 0.8);
                background: white;
                box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.2);
            }
            
            .status-indicator {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 16px;
                font-size: 12px;
                color: rgba(255, 255, 255, 0.8);
            }
            
            /* Examples flessibili */
            .examples-flex {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
                gap: 8px;
            }
            
            .example-btn {
                padding: 12px 8px;
                border: 1px solid rgba(255, 255, 255, 0.3);
                border-radius: 6px;
                background: rgba(255, 255, 255, 0.1);
                color: white;
                cursor: pointer;
                transition: all 0.3s;
                text-align: center;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 4px;
            }
            
            .example-btn:hover {
                background: rgba(255, 255, 255, 0.2);
                transform: translateY(-2px);
            }
            
            .example-icon {
                font-size: 16px;
            }
            
            .example-label {
                font-size: 10px;
                font-weight: 500;
            }
            
            /* Field groups */
            .field-group {
                margin-bottom: 16px;
            }
            
            .field-group label {
                display: block;
                font-size: 11px;
                font-weight: 600;
                color: #6c757d;
                margin-bottom: 6px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .dynamic-input, .dynamic-select {
                width: 100%;
                padding: 10px 12px;
                border: 1px solid #e9ecef;
                border-radius: 4px;
                font-size: 13px;
                transition: all 0.3s;
                background: white;
            }
            
            .dynamic-input:focus, .dynamic-select:focus {
                outline: none;
                border-color: #007bff;
                box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.1);
            }
            
            /* Preview */
            .preview-display {
                background: rgba(255, 255, 255, 0.1);
                border-radius: 6px;
                padding: 16px;
                margin-bottom: 16px;
            }
            
            .preview-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 6px 0;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .preview-item:last-child {
                border-bottom: none;
            }
            
            .preview-label {
                font-size: 11px;
                font-weight: 600;
                color: rgba(255, 255, 255, 0.7);
                text-transform: uppercase;
            }
            
            .preview-value {
                font-size: 12px;
                font-weight: 500;
                color: white;
            }
            
            /* API Toggle */
            .api-toggle-card {
                background: rgba(255, 255, 255, 0.1);
                border-radius: 6px;
                padding: 12px;
            }
            
            .api-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .api-info {
                display: flex;
                flex-direction: column;
            }
            
            .api-title {
                font-size: 12px;
                font-weight: 600;
                color: white;
            }
            
            .api-desc {
                font-size: 10px;
                color: rgba(255, 255, 255, 0.7);
            }
            
            .api-switch {
                position: relative;
                width: 44px;
                height: 24px;
            }
            
            .api-switch input {
                opacity: 0;
                width: 0;
                height: 0;
            }
            
            .switch-track {
                position: absolute;
                cursor: pointer;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(255, 255, 255, 0.3);
                transition: .3s;
                border-radius: 24px;
            }
            
            .switch-track:before {
                position: absolute;
                content: "";
                height: 18px;
                width: 18px;
                left: 3px;
                bottom: 3px;
                background: white;
                transition: .3s;
                border-radius: 50%;
            }
            
            input:checked + .switch-track {
                background: rgba(255, 255, 255, 0.5);
            }
            
            input:checked + .switch-track:before {
                transform: translateX(20px);
            }
            
            /* Action Bar Dinamica */
            .dynamic-actions {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px 24px;
                background: #f8f9fa;
                border-top: 1px solid #e9ecef;
                margin: 0 -24px -24px -24px;
            }
            
            .action-status {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 13px;
                color: #6c757d;
            }
            
            .status-dot {
                color: #28a745;
                font-size: 8px;
            }
            
            .action-buttons {
                display: flex;
                gap: 12px;
            }
            
            .dynamic-btn {
                padding: 10px 20px;
                border: none;
                border-radius: 6px;
                font-size: 13px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.3s;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            
            .btn-cancel {
                background: #f8f9fa;
                color: #6c757d;
                border: 1px solid #e9ecef;
            }
            
            .btn-cancel:hover {
                background: #e9ecef;
            }
            
            .btn-submit {
                background: #007bff;
                color: white;
            }
            
            .btn-submit:hover {
                background: #0056b3;
                box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
            }
            
            /* Import Dinamico */
            .import-dynamic {
                padding: 24px;
            }
            
            .import-flex {
                display: grid;
                grid-template-columns: 2fr 1fr;
                gap: 24px;
                min-height: 300px;
            }
            
            .dynamic-drop-zone {
                border: 3px dashed #007bff;
                border-radius: 12px;
                background: linear-gradient(135deg, #f8f9ff 0%, #e6f3ff 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.3s;
            }
            
            .dynamic-drop-zone:hover,
            .dynamic-drop-zone.dragover {
                background: linear-gradient(135deg, #e6f3ff 0%, #cce7ff 100%);
                border-color: #0056b3;
                transform: scale(1.02);
            }
            
            .drop-content-flex {
                text-align: center;
                padding: 32px;
            }
            
            .drop-icon {
                font-size: 48px;
                margin-bottom: 16px;
            }
            
            .drop-content-flex h3 {
                margin: 0 0 8px 0;
                color: #333;
                font-size: 18px;
            }
            
            .drop-content-flex p {
                margin: 0 0 16px 0;
                color: #6c757d;
            }
            
            .inline-link {
                background: none;
                border: none;
                color: #007bff;
                text-decoration: underline;
                cursor: pointer;
                font-weight: 500;
            }
            
            .format-tags {
                display: flex;
                gap: 8px;
                justify-content: center;
            }
            
            .format-tag {
                background: #007bff;
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 11px;
                font-weight: 500;
            }
            
            /* Features Sidebar */
            .features-sidebar {
                background: #f8f9fa;
                border-radius: 8px;
                padding: 20px;
            }
            
            .features-sidebar h3 {
                margin: 0 0 16px 0;
                font-size: 16px;
                color: #333;
            }
            
            .feature-list {
                display: flex;
                flex-direction: column;
                gap: 16px;
            }
            
            .feature-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px;
                background: white;
                border-radius: 6px;
                border: 1px solid #e9ecef;
            }
            
            .feature-icon {
                font-size: 20px;
                width: 32px;
                text-align: center;
            }
            
            .feature-text {
                display: flex;
                flex-direction: column;
            }
            
            .feature-text strong {
                color: #333;
                font-size: 13px;
                margin-bottom: 2px;
            }
            
            .feature-text span {
                color: #6c757d;
                font-size: 11px;
            }
            
            /* Responsive Dinamico */
            @media (max-width: 900px) {
                .flexible-grid {
                    grid-template-columns: 1fr 1fr;
                }
                
                .import-flex {
                    grid-template-columns: 1fr;
                }
            }
            
            @media (max-width: 600px) {
                .dynamic-form-container {
                    min-width: 100%;
                    width: 100%;
                }
                
                .flexible-grid {
                    grid-template-columns: 1fr;
                }
                
                .dynamic-actions {
                    flex-direction: column;
                    gap: 12px;
                }
                
                .dynamic-btn {
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
        document.querySelectorAll('.dynamic-tab').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const targetTab = this.dataset.target;
                console.log('🔄 Tab clicked:', targetTab);
                
                // Update buttons
                document.querySelectorAll('.dynamic-tab').forEach(b => b.classList.remove('active'));
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