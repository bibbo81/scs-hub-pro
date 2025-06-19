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
    // ENHANCED FORM - VERSIONE FULL-WIDTH
    // ========================================
    
    // 🖥️ MODAL FULL-WIDTH - Sostituisci showEnhancedTrackingForm() e renderSimplifiedForm()
    function showEnhancedTrackingForm(options = {}) {
        console.log('🚀 PROGRESSIVE FORM: Showing full-width enhanced form');
        
        // MODAL FULL-WIDTH CHE SFRUTTA TUTTA LA LARGHEZZA
        window.ModalSystem.show({
            title: '📦 Aggiungi Tracking Enhanced',
            content: renderFullWidthForm(),
            size: 'fullscreen', // Nuovo size type
            showFooter: false,
            className: 'fullwidth-enhanced-modal',
            // OVERRIDE COMPLETO - USA QUASI TUTTA LA LARGHEZZA
            customStyles: {
                position: 'fixed',
                top: '5vh',                  // 5% dall'alto
                left: '2.5vw',              // 2.5% da sinistra  
                right: '2.5vw',             // 2.5% da destra
                bottom: '5vh',              // 5% dal basso
                width: '95vw',              // 95% della larghezza
                height: '90vh',             // 90% dell'altezza
                maxWidth: 'none',           // Nessun limite
                maxHeight: 'none',          // Nessun limite
                margin: '0',
                padding: '0',
                overflow: 'hidden',         // Controllo interno
                background: 'transparent',  // Il contenuto gestisce lo sfondo
                transform: 'none'           // No centering transform
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
    
    function renderFullWidthForm() {
        return `
            <div class="fullwidth-container">
                <!-- Header con Tab -->
                <div class="fullwidth-header">
                    <div class="header-title">
                        <h2>📦 Aggiungi Tracking Enhanced</h2>
                        <p>Gestione tracking con interfaccia allargata per massima usabilità</p>
                    </div>
                    <div class="header-tabs">
                        <button class="header-tab active" data-target="single">
                            <i class="fas fa-plus"></i> Tracking Singolo
                        </button>
                        <button class="header-tab" data-target="import">
                            <i class="fas fa-upload"></i> Import Multiplo
                        </button>
                    </div>
                </div>
                
                <!-- Content Area Full Width -->
                <div class="fullwidth-content">
                    
                    <!-- Single Tab - LAYOUT ORIZZONTALE COMPLETO -->
                    <div class="tab-content active" data-tab="single">
                        <form id="enhancedSingleForm" class="fullwidth-form">
                            
                            <!-- 5-Column Layout che sfrutta tutta la larghezza -->
                            <div class="fullwidth-grid">
                                
                                <!-- Colonna 1: Input Principale -->
                                <div class="form-column primary-column">
                                    <div class="column-header">
                                        <h3><i class="fas fa-search"></i> Numero Tracking</h3>
                                    </div>
                                    <div class="column-content">
                                        <div class="main-input-section">
                                            <input type="text" 
                                                   id="enh_trackingNumber" 
                                                   class="fullwidth-input primary" 
                                                   placeholder="Es: MSKU1234567, 176-12345678"
                                                   required>
                                            
                                            <div class="input-status">
                                                <i class="fas fa-search status-icon"></i>
                                                <span class="status-text">Auto-detection attiva...</span>
                                            </div>
                                        </div>
                                        
                                        <div class="examples-section">
                                            <h4>Esempi Veloci:</h4>
                                            <div class="examples-grid">
                                                <button type="button" class="example-item" data-example="MSKU1234567">
                                                    <div class="example-icon">🚢</div>
                                                    <div class="example-info">
                                                        <strong>Container</strong>
                                                        <span>MSKU1234567</span>
                                                    </div>
                                                </button>
                                                <button type="button" class="example-item" data-example="176-12345678">
                                                    <div class="example-icon">✈️</div>
                                                    <div class="example-info">
                                                        <strong>Air Cargo</strong>
                                                        <span>176-12345678</span>
                                                    </div>
                                                </button>
                                                <button type="button" class="example-item" data-example="GESU1234567">
                                                    <div class="example-icon">📦</div>
                                                    <div class="example-info">
                                                        <strong>MSC</strong>
                                                        <span>GESU1234567</span>
                                                    </div>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Colonna 2: Tipo e Classificazione -->
                                <div class="form-column">
                                    <div class="column-header">
                                        <h3><i class="fas fa-tags"></i> Tipo & Classificazione</h3>
                                    </div>
                                    <div class="column-content">
                                        <div class="field-section">
                                            <label>Tipo Tracking</label>
                                            <select id="enh_trackingType" class="fullwidth-select">
                                                <option value="auto">🔍 Auto-detect</option>
                                                <option value="container">🚢 Container Marittime</option>
                                                <option value="awb">✈️ Air Waybill</option>
                                                <option value="bl">📄 Bill of Lading</option>
                                                <option value="parcel">📦 Parcel/Package</option>
                                            </select>
                                        </div>
                                        
                                        <div class="field-section">
                                            <label>Vettore</label>
                                            <select id="enh_carrier" class="fullwidth-select">
                                                <option value="">Seleziona automaticamente</option>
                                            </select>
                                        </div>
                                        
                                        <div class="field-section">
                                            <label>Stato Iniziale</label>
                                            <select id="enh_status" class="fullwidth-select">
                                                <option value="registered">📝 Registrato</option>
                                                <option value="in_transit">🚛 In Transito</option>
                                                <option value="arrived">📍 Arrivato a destinazione</option>
                                                <option value="customs_cleared">✅ Sdoganato</option>
                                                <option value="delivered">🎯 Consegnato</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Colonna 3: Rotta e Geografia -->
                                <div class="form-column">
                                    <div class="column-header">
                                        <h3><i class="fas fa-route"></i> Rotta & Geografia</h3>
                                    </div>
                                    <div class="column-content">
                                        <div class="field-section">
                                            <label>Porto/Aeroporto Origine</label>
                                            <input type="text" id="enh_origin" class="fullwidth-input" 
                                                   placeholder="Es: SHANGHAI, HONG KONG, MXP">
                                        </div>
                                        
                                        <div class="field-section">
                                            <label>Porto/Aeroporto Destinazione</label>
                                            <input type="text" id="enh_destination" class="fullwidth-input" 
                                                   placeholder="Es: GENOVA, LA SPEZIA, FCO">
                                        </div>
                                        
                                        <div class="field-section">
                                            <label>Numero Riferimento</label>
                                            <input type="text" id="enh_reference" class="fullwidth-input" 
                                                   placeholder="Es: PO-2024-001, REF123456">
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Colonna 4: Anteprima Live -->
                                <div class="form-column preview-column">
                                    <div class="column-header">
                                        <h3><i class="fas fa-eye"></i> Anteprima Live</h3>
                                    </div>
                                    <div class="column-content">
                                        <div class="preview-card">
                                            <div class="preview-section">
                                                <h4>📋 Riepilogo Tracking</h4>
                                                <div class="preview-grid">
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
                                                    <div class="preview-row">
                                                        <span class="preview-label">Riferimento:</span>
                                                        <span class="preview-value" id="previewReference">-</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Colonna 5: API e Controlli -->
                                <div class="form-column api-column">
                                    <div class="column-header">
                                        <h3><i class="fas fa-cog"></i> API & Controlli</h3>
                                    </div>
                                    <div class="column-content">
                                        <div class="api-card">
                                            <div class="api-header">
                                                <h4>🔄 Dati Real-time</h4>
                                            </div>
                                            <div class="api-body">
                                                <div class="api-toggle-section">
                                                    <label class="api-switch-container">
                                                        <input type="checkbox" id="enh_useApi" checked>
                                                        <span class="api-switch"></span>
                                                        <span class="api-label">Abilita API ShipsGo</span>
                                                    </label>
                                                    <p class="api-description">
                                                        Recupera automaticamente informazioni aggiornate 
                                                        e stati di tracking in tempo reale
                                                    </p>
                                                </div>
                                                
                                                <div class="api-benefits">
                                                    <div class="benefit-item">
                                                        <i class="fas fa-check-circle"></i>
                                                        <span>Dati sempre aggiornati</span>
                                                    </div>
                                                    <div class="benefit-item">
                                                        <i class="fas fa-check-circle"></i>
                                                        <span>Auto-compilazione campi</span>
                                                    </div>
                                                    <div class="benefit-item">
                                                        <i class="fas fa-check-circle"></i>
                                                        <span>Eventi in tempo reale</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div class="status-card">
                                            <div class="system-status">
                                                <i class="fas fa-circle status-indicator"></i>
                                                <span class="status-message">Sistema pronto</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                    
                    <!-- Import Tab - LAYOUT ALLARGATO -->
                    <div class="tab-content" data-tab="import">
                        <div class="import-fullwidth">
                            <div class="import-layout">
                                <!-- Drop Zone Allargata -->
                                <div class="import-main">
                                    <div class="large-drop-zone" id="enhDropZone">
                                        <div class="drop-content">
                                            <div class="drop-visual">
                                                <div class="drop-icon">📁</div>
                                                <h2>Trascina qui i tuoi file per l'import</h2>
                                                <p>Oppure <button type="button" class="file-select-btn" onclick="document.getElementById('enhFileInput').click()">seleziona file dal computer</button></p>
                                                <div class="format-support">
                                                    <span class="format-item">.xlsx</span>
                                                    <span class="format-item">.xls</span>
                                                    <span class="format-item">.csv</span>
                                                </div>
                                            </div>
                                        </div>
                                        <input type="file" id="enhFileInput" accept=".xlsx,.xls,.csv" style="display: none;">
                                    </div>
                                </div>
                                
                                <!-- Features Panel -->
                                <div class="import-sidebar">
                                    <div class="features-panel">
                                        <h3>📊 Funzionalità Import Avanzate</h3>
                                        
                                        <div class="feature-grid">
                                            <div class="feature-card">
                                                <div class="feature-icon">🔍</div>
                                                <div class="feature-content">
                                                    <h4>Auto-detection Formato</h4>
                                                    <p>Rilevamento automatico del formato file e della struttura dati</p>
                                                </div>
                                            </div>
                                            
                                            <div class="feature-card">
                                                <div class="feature-icon">🗂️</div>
                                                <div class="feature-content">
                                                    <h4>Mapping Intelligente</h4>
                                                    <p>Associazione automatica delle colonne con i campi tracking</p>
                                                </div>
                                            </div>
                                            
                                            <div class="feature-card">
                                                <div class="feature-icon">👁️</div>
                                                <div class="feature-content">
                                                    <h4>Preview & Validazione</h4>
                                                    <p>Anteprima completa dei dati prima dell'import definitivo</p>
                                                </div>
                                            </div>
                                            
                                            <div class="feature-card">
                                                <div class="feature-icon">⚡</div>
                                                <div class="feature-content">
                                                    <h4>Import Batch</h4>
                                                    <p>Elaborazione rapida di grandi quantità di tracking</p>
                                                </div>
                                            </div>
                                            
                                            <div class="feature-card">
                                                <div class="feature-icon">🔧</div>
                                                <div class="feature-content">
                                                    <h4>Controllo Qualità</h4>
                                                    <p>Validazione automatica e segnalazione errori</p>
                                                </div>
                                            </div>
                                            
                                            <div class="feature-card">
                                                <div class="feature-icon">📈</div>
                                                <div class="feature-content">
                                                    <h4>Statistiche Import</h4>
                                                    <p>Report dettagliato sull'operazione di import</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Footer Actions Full Width -->
                <div class="fullwidth-footer">
                    <div class="footer-status">
                        <div class="status-info">
                            <i class="fas fa-info-circle"></i>
                            <span>Tutti i campi sono opzionali eccetto il numero tracking</span>
                        </div>
                    </div>
                    <div class="footer-actions">
                        <button type="button" class="footer-btn btn-cancel" onclick="window.ModalSystem.closeAll()">
                            <i class="fas fa-times"></i> Annulla
                        </button>
                        <button type="submit" class="footer-btn btn-primary" id="enhSubmitBtn" form="enhancedSingleForm">
                            <i class="fas fa-plus"></i> Aggiungi Tracking
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- FULLWIDTH STYLES -->
            <style>
            /* Container principale full-width */
            .fullwidth-container {
                background: white;
                border-radius: 12px;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
                height: 100%;
                display: flex;
                flex-direction: column;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                overflow: hidden;
            }
            
            /* Header con tab */
            .fullwidth-header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 20px 30px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .header-title h2 {
                margin: 0 0 5px 0;
                font-size: 24px;
                font-weight: 600;
            }
            
            .header-title p {
                margin: 0;
                font-size: 14px;
                opacity: 0.9;
            }
            
            .header-tabs {
                display: flex;
                gap: 10px;
            }
            
            .header-tab {
                padding: 12px 20px;
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-radius: 8px;
                background: rgba(255, 255, 255, 0.1);
                color: white;
                cursor: pointer;
                transition: all 0.3s;
                font-size: 14px;
                font-weight: 500;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .header-tab:hover {
                background: rgba(255, 255, 255, 0.2);
            }
            
            .header-tab.active {
                background: white;
                color: #667eea;
                border-color: white;
            }
            
            /* Content area */
            .fullwidth-content {
                flex: 1;
                overflow-y: auto;
                padding: 0;
            }
            
            .tab-content {
                display: none;
                height: 100%;
            }
            
            .tab-content.active {
                display: block;
            }
            
            /* Form full-width */
            .fullwidth-form {
                height: 100%;
                padding: 30px;
            }
            
            /* Grid 5 colonne che sfrutta tutta la larghezza */
            .fullwidth-grid {
                display: grid;
                grid-template-columns: repeat(5, 1fr);
                gap: 20px;
                height: 100%;
            }
            
            /* Colonne del form */
            .form-column {
                background: #f8f9fa;
                border: 1px solid #e9ecef;
                border-radius: 10px;
                overflow: hidden;
                display: flex;
                flex-direction: column;
            }
            
            .primary-column {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
            }
            
            .preview-column {
                background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%);
                color: white;
            }
            
            .api-column {
                background: linear-gradient(135deg, #fd79a8 0%, #e84393 100%);
                color: white;
            }
            
            .column-header {
                padding: 16px 20px;
                border-bottom: 1px solid rgba(0, 0, 0, 0.1);
                background: rgba(255, 255, 255, 0.1);
            }
            
            .column-header h3 {
                margin: 0;
                font-size: 14px;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .column-content {
                flex: 1;
                padding: 20px;
                overflow-y: auto;
            }
            
            /* Input principale */
            .main-input-section {
                margin-bottom: 20px;
            }
            
            .fullwidth-input.primary {
                width: 100%;
                padding: 14px 16px;
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-radius: 8px;
                font-size: 16px;
                font-weight: 500;
                background: rgba(255, 255, 255, 0.9);
                color: #333;
                transition: all 0.3s;
                margin-bottom: 10px;
            }
            
            .fullwidth-input.primary:focus {
                outline: none;
                border-color: rgba(255, 255, 255, 0.8);
                background: white;
                box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.2);
            }
            
            .input-status {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 13px;
                color: rgba(255, 255, 255, 0.8);
            }
            
            /* Examples section */
            .examples-section h4 {
                margin: 0 0 12px 0;
                font-size: 13px;
                color: rgba(255, 255, 255, 0.9);
            }
            
            .examples-grid {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            
            .example-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px;
                border: 1px solid rgba(255, 255, 255, 0.3);
                border-radius: 6px;
                background: rgba(255, 255, 255, 0.1);
                color: white;
                cursor: pointer;
                transition: all 0.3s;
                text-align: left;
            }
            
            .example-item:hover {
                background: rgba(255, 255, 255, 0.2);
                transform: translateY(-1px);
            }
            
            .example-icon {
                font-size: 20px;
            }
            
            .example-info strong {
                display: block;
                font-size: 12px;
                margin-bottom: 2px;
            }
            
            .example-info span {
                font-size: 11px;
                opacity: 0.8;
                font-family: monospace;
            }
            
            /* Field sections */
            .field-section {
                margin-bottom: 20px;
            }
            
            .field-section label {
                display: block;
                font-size: 11px;
                font-weight: 600;
                color: #6c757d;
                margin-bottom: 6px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .form-column:not(.primary-column):not(.preview-column):not(.api-column) .field-section label {
                color: #6c757d;
            }
            
            .primary-column .field-section label,
            .preview-column .field-section label,
            .api-column .field-section label {
                color: rgba(255, 255, 255, 0.8);
            }
            
            .fullwidth-input, .fullwidth-select {
                width: 100%;
                padding: 10px 12px;
                border: 1px solid #e9ecef;
                border-radius: 6px;
                font-size: 13px;
                transition: all 0.3s;
                background: white;
            }
            
            .fullwidth-input:focus, .fullwidth-select:focus {
                outline: none;
                border-color: #007bff;
                box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.1);
            }
            
            /* Preview card */
            .preview-card {
                background: rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                padding: 16px;
            }
            
            .preview-section h4 {
                margin: 0 0 12px 0;
                font-size: 13px;
                color: rgba(255, 255, 255, 0.9);
            }
            
            .preview-grid {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            
            .preview-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 6px 0;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .preview-row:last-child {
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
            
            /* API card */
            .api-card {
                background: rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                padding: 16px;
                margin-bottom: 16px;
            }
            
            .api-header h4 {
                margin: 0 0 12px 0;
                font-size: 13px;
                color: rgba(255, 255, 255, 0.9);
            }
            
            .api-switch-container {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 12px;
                cursor: pointer;
            }
            
            .api-switch {
                position: relative;
                width: 48px;
                height: 28px;
                background: rgba(255, 255, 255, 0.3);
                border-radius: 28px;
                transition: 0.3s;
            }
            
            .api-switch:before {
                content: "";
                position: absolute;
                width: 22px;
                height: 22px;
                border-radius: 50%;
                background: white;
                top: 3px;
                left: 3px;
                transition: 0.3s;
            }
            
            .api-switch-container input {
                display: none;
            }
            
            .api-switch-container input:checked + .api-switch {
                background: rgba(255, 255, 255, 0.5);
            }
            
            .api-switch-container input:checked + .api-switch:before {
                transform: translateX(20px);
            }
            
            .api-label {
                font-size: 13px;
                font-weight: 500;
                color: white;
            }
            
            .api-description {
                font-size: 11px;
                color: rgba(255, 255, 255, 0.8);
                line-height: 1.4;
                margin: 0 0 12px 0;
            }
            
            .api-benefits {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }
            
            .benefit-item {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 11px;
                color: rgba(255, 255, 255, 0.9);
            }
            
            .benefit-item i {
                color: #28a745;
                font-size: 10px;
            }
            
            /* Status card */
            .status-card {
                background: rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                padding: 12px 16px;
            }
            
            .system-status {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .status-indicator {
                color: #28a745;
                font-size: 8px;
            }
            
            .status-message {
                font-size: 12px;
                color: rgba(255, 255, 255, 0.9);
            }
            
            /* Import full-width */
            .import-fullwidth {
                height: 100%;
                padding: 30px;
            }
            
            .import-layout {
                display: grid;
                grid-template-columns: 2fr 1fr;
                gap: 30px;
                height: 100%;
            }
            
            .large-drop-zone {
                border: 3px dashed #007bff;
                border-radius: 12px;
                background: linear-gradient(135deg, #f8f9ff 0%, #e6f3ff 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.3s;
            }
            
            .large-drop-zone:hover,
            .large-drop-zone.dragover {
                background: linear-gradient(135deg, #e6f3ff 0%, #cce7ff 100%);
                border-color: #0056b3;
                transform: scale(1.01);
            }
            
            .drop-content {
                text-align: center;
                padding: 60px 40px;
            }
            
            .drop-icon {
                font-size: 80px;
                margin-bottom: 20px;
                color: #007bff;
            }
            
            .drop-content h2 {
                margin: 0 0 10px 0;
                color: #333;
                font-size: 24px;
            }
            
            .drop-content p {
                margin: 0 0 20px 0;
                color: #6c757d;
                font-size: 16px;
            }
            
            .file-select-btn {
                background: none;
                border: none;
                color: #007bff;
                text-decoration: underline;
                cursor: pointer;
                font-weight: 500;
                font-size: 16px;
            }
            
            .format-support {
                display: flex;
                gap: 12px;
                justify-content: center;
            }
            
            .format-item {
                background: #007bff;
                color: white;
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 500;
            }
            
            /* Features panel */
            .features-panel h3 {
                margin: 0 0 20px 0;
                color: #333;
                font-size: 20px;
            }
            
            .feature-grid {
                display: grid;
                grid-template-columns: 1fr;
                gap: 16px;
            }
            
            .feature-card {
                display: flex;
                align-items: flex-start;
                gap: 16px;
                padding: 20px;
                background: white;
                border: 1px solid #e9ecef;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .feature-icon {
                font-size: 24px;
                width: 40px;
                text-align: center;
                flex-shrink: 0;
            }
            
            .feature-content h4 {
                margin: 0 0 6px 0;
                color: #333;
                font-size: 14px;
            }
            
            .feature-content p {
                margin: 0;
                color: #6c757d;
                font-size: 12px;
                line-height: 1.4;
            }
            
            /* Footer full-width */
            .fullwidth-footer {
                background: #f8f9fa;
                border-top: 1px solid #e9ecef;
                padding: 20px 30px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .footer-status {
                display: flex;
                align-items: center;
            }
            
            .status-info {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 13px;
                color: #6c757d;
            }
            
            .footer-actions {
                display: flex;
                gap: 12px;
            }
            
            .footer-btn {
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
                background: #f8f9fa;
                color: #6c757d;
                border: 1px solid #e9ecef;
            }
            
            .btn-cancel:hover {
                background: #e9ecef;
            }
            
            .btn-primary {
                background: #007bff;
                color: white;
            }
            
            .btn-primary:hover {
                background: #0056b3;
                box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
            }
            
            /* Responsive */
            @media (max-width: 1400px) {
                .fullwidth-grid {
                    grid-template-columns: repeat(4, 1fr);
                }
                
                .api-column {
                    grid-column: span 1;
                }
            }
            
            @media (max-width: 1100px) {
                .fullwidth-grid {
                    grid-template-columns: repeat(3, 1fr);
                }
            }
            
            @media (max-width: 900px) {
                .fullwidth-grid {
                    grid-template-columns: repeat(2, 1fr);
                }
                
                .import-layout {
                    grid-template-columns: 1fr;
                }
            }
            
            @media (max-width: 600px) {
                .fullwidth-grid {
                    grid-template-columns: 1fr;
                }
                
                .fullwidth-header {
                    flex-direction: column;
                    gap: 16px;
                    text-align: center;
                }
                
                .header-tabs {
                    justify-content: center;
                }
                
                .fullwidth-footer {
                    flex-direction: column;
                    gap: 16px;
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
        document.querySelectorAll('.header-tab').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const targetTab = this.dataset.target;
                console.log('🔄 Tab clicked:', targetTab);
                
                // Update buttons
                document.querySelectorAll('.header-tab').forEach(b => b.classList.remove('active'));
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
            status: document.getElementById('enh_status'),
            reference: document.getElementById('enh_reference')
        };
        
        const previews = {
            number: document.getElementById('previewNumber'),
            type: document.getElementById('previewType'),
            carrier: document.getElementById('previewCarrier'),
            route: document.getElementById('previewRoute'),
            status: document.getElementById('previewStatus'),
            reference: document.getElementById('previewReference')
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
            if (inputs.reference && previews.reference) {
                previews.reference.textContent = inputs.reference.value || '-';
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
        document.querySelectorAll('.example-item').forEach(btn => {
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
            statusText.textContent = 'Auto-detection attiva...';
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