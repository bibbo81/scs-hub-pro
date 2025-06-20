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
    
    // 🎯 BYPASS MODAL SYSTEM - Crea modal custom full-width
    // Sostituisci showEnhancedTrackingForm() in tracking-form-progressive.js
    function showEnhancedTrackingForm(options = {}) {
        console.log('🚀 PROGRESSIVE FORM: Creating custom full-width modal');
        
        // BYPASS COMPLETAMENTE IL MODAL SYSTEM ESISTENTE
        // Creiamo il nostro modal custom che funziona sicuramente
        
        createCustomFullWidthModal();
        
        // Setup dopo rendering
        setTimeout(() => {
            setupEnhancedInteractions();
            setupRealtimePreview();
            if (options && Object.keys(options).length > 0) {
                prefillForm(options);
            }
        }, 100);
    }

    function createCustomFullWidthModal() {
        // Rimuovi modal esistenti per evitare conflitti
        document.querySelectorAll('.custom-fullwidth-modal').forEach(el => el.remove());
        
        // Crea modal custom da zero
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'custom-fullwidth-modal';
        modalOverlay.innerHTML = `
            <div class="custom-modal-backdrop"></div>
            <div class="custom-modal-container">
                <div class="custom-modal-header">
                    <h2>📦 Aggiungi Tracking Enhanced</h2>
                    <button class="custom-modal-close" onclick="closeCustomModal()">×</button>
                </div>
                <div class="custom-modal-content">
                    ${renderFullWidthForm()}
                </div>
            </div>
            
            <!-- CUSTOM MODAL STYLES INLINE -->
            <style>
            .custom-fullwidth-modal {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                z-index: 9999 !important;
                background: rgba(0, 0, 0, 0.8) !important;
                backdrop-filter: blur(8px) !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                opacity: 0 !important;
                transition: opacity 0.3s ease !important;
            }
            
            .custom-fullwidth-modal.active {
                opacity: 1 !important;
            }
            
            .custom-modal-backdrop {
                position: absolute !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                background: transparent !important;
                cursor: pointer !important;
            }
            
            .custom-modal-container {
                position: relative !important;
                width: 98vw !important;
                height: 92vh !important;
                background: white !important;
                border-radius: 12px !important;
                box-shadow: 0 25px 80px rgba(0, 0, 0, 0.4) !important;
                display: flex !important;
                flex-direction: column !important;
                overflow: hidden !important;
                transform: scale(0.9) translateY(30px) !important;
                transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
            }
            
            .custom-fullwidth-modal.active .custom-modal-container {
                transform: scale(1) translateY(0) !important;
            }
            
            .custom-modal-header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
                color: white !important;
                padding: 20px 30px !important;
                display: flex !important;
                justify-content: space-between !important;
                align-items: center !important;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
                flex-shrink: 0 !important;
            }
            
            .custom-modal-header h2 {
                margin: 0 !important;
                font-size: 24px !important;
                font-weight: 600 !important;
                color: white !important;
            }
            
            .custom-modal-close {
                background: rgba(220, 53, 69, 0.2) !important;
                border: 2px solid rgba(220, 53, 69, 0.3) !important;
                color: white !important;
                font-size: 24px !important;
                cursor: pointer !important;
                padding: 8px 12px !important;
                border-radius: 8px !important;
                transition: all 0.3s ease !important;
                width: 44px !important;
                height: 44px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                font-weight: bold !important;
            }
            
            .custom-modal-close:hover {
                background: rgba(255, 59, 48, 0.9) !important;
                border-color: rgba(255, 59, 48, 0.9) !important;
                transform: scale(1.1) !important;
            }
            
            .custom-modal-content {
                flex: 1 !important;
                overflow-y: auto !important;
                overflow-x: hidden !important;
            }
            
            /* Responsive per custom modal */
            @media (max-width: 1200px) {
                .custom-modal-container {
                    width: 98vw !important;
                    height: 95vh !important;
                }
            }
            
            @media (max-width: 768px) {
                .custom-modal-container {
                    width: 100vw !important;
                    height: 100vh !important;
                    border-radius: 0 !important;
                }
                
                .custom-modal-header {
                    padding: 16px 20px !important;
                }
                
                .custom-modal-header h2 {
                    font-size: 20px !important;
                }
            }
            </style>
        `;
        
        // Aggiungi al DOM
        document.body.appendChild(modalOverlay);
        
        // Animazione di apertura
        requestAnimationFrame(() => {
            modalOverlay.classList.add('active');
        });
        
        // Setup click handlers
        const backdrop = modalOverlay.querySelector('.custom-modal-backdrop');
        backdrop.addEventListener('click', closeCustomModal);
        
        // Escape key handler
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                closeCustomModal();
            }
        };
        document.addEventListener('keydown', escapeHandler);
        
        // Store handler for cleanup
        modalOverlay._escapeHandler = escapeHandler;
        
        console.log('✅ Custom full-width modal created successfully');
    }

    // Funzione globale per chiudere il modal custom
    window.closeCustomModal = function() {
        const modal = document.querySelector('.custom-fullwidth-modal');
        if (!modal) return;
        
        modal.classList.remove('active');
        
        // Cleanup escape handler
        if (modal._escapeHandler) {
            document.removeEventListener('keydown', modal._escapeHandler);
        }
        
        setTimeout(() => {
            modal.remove();
            console.log('✅ Custom modal closed and removed');
        }, 300);
    };

    // AGGIORNA ANCHE renderFullWidthForm per ottimizzare per il nuovo container
    function renderFullWidthForm() {
        return `
            <div class="fullwidth-form-wrapper">
                <!-- Tab Navigation Integrata -->
                <div class="integrated-tabs">
                    <button class="integrated-tab active" data-target="single">
                        <i class="fas fa-plus"></i> Tracking Singolo
                    </button>
                    <button class="integrated-tab" data-target="import">
                        <i class="fas fa-upload"></i> Import Multiplo
                    </button>
                </div>
                
                <!-- Single Tab - OTTIMIZZATO PER FULL WIDTH -->
                <div class="tab-content active" data-tab="single">
                    <form id="enhancedSingleForm" class="optimized-fullwidth-form">
                        
                        <!-- Grid ottimizzato per sfruttare tutto lo spazio -->
                        <div class="optimized-grid">
                            
                            <!-- Colonna 1: Input Principale con Examples -->
                            <div class="form-card primary-card">
                                <div class="card-header">
                                    <h3><i class="fas fa-search"></i> Numero Tracking</h3>
                                </div>
                                <div class="card-body">
                                    <div class="main-input-wrapper">
                                        <input type="text" 
                                               id="enh_trackingNumber" 
                                               class="main-tracking-input" 
                                               placeholder="Es: MSKU1234567, 176-12345678"
                                               required>
                                        
                                        <div class="detection-status">
                                            <i class="fas fa-search status-icon"></i>
                                            <span class="status-text">Auto-detection attiva...</span>
                                        </div>
                                    </div>
                                    
                                    <div class="examples-section">
                                        <h4>🚀 Esempi Veloci:</h4>
                                        <div class="examples-list">
                                            <button type="button" class="example-item" data-example="MSKU1234567">
                                                <div class="example-visual">
                                                    <span class="example-icon">🚢</span>
                                                    <div class="example-details">
                                                        <strong>Container Maersk</strong>
                                                        <code>MSKU1234567</code>
                                                    </div>
                                                </div>
                                            </button>
                                            
                                            <button type="button" class="example-item" data-example="176-12345678">
                                                <div class="example-visual">
                                                    <span class="example-icon">✈️</span>
                                                    <div class="example-details">
                                                        <strong>Air Waybill</strong>
                                                        <code>176-12345678</code>
                                                    </div>
                                                </div>
                                            </button>
                                            
                                            <button type="button" class="example-item" data-example="GESU1234567">
                                                <div class="example-visual">
                                                    <span class="example-icon">📦</span>
                                                    <div class="example-details">
                                                        <strong>MSC Container</strong>
                                                        <code>GESU1234567</code>
                                                    </div>
                                                </div>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Colonna 2: Dettagli Completi (Tipo + Geografia) -->
                            <div class="form-card details-card">
                                <div class="card-header">
                                    <h3><i class="fas fa-cog"></i> Dettagli & Geografia</h3>
                                </div>
                                <div class="card-body">
                                    <!-- Sezione Tipo -->
                                    <div class="details-section">
                                        <h5 class="section-title">🏷️ Classificazione</h5>
                                        <div class="field-row">
                                            <div class="field-group half-width">
                                                <label>Tipo Tracking</label>
                                                <select id="enh_trackingType" class="enhanced-select">
                                                    <option value="auto">🔍 Auto-detect</option>
                                                    <option value="container">🚢 Container Marittimo</option>
                                                    <option value="awb">✈️ Air Waybill</option>
                                                    <option value="bl">📄 Bill of Lading</option>
                                                    <option value="parcel">📦 Parcel/Package</option>
                                                </select>
                                            </div>
                                            
                                            <div class="field-group half-width">
                                                <label>Vettore</label>
                                                <select id="enh_carrier" class="enhanced-select">
                                                    <option value="">🔄 Seleziona automaticamente</option>
                                                </select>
                                            </div>
                                        </div>
                                        
                                        <div class="field-group">
                                            <label>Stato Iniziale</label>
                                            <select id="enh_status" class="enhanced-select">
                                                <option value="registered">📝 Registrato</option>
                                                <option value="in_transit">🚛 In Transito</option>
                                                <option value="arrived">📍 Arrivato a destinazione</option>
                                                <option value="customs_cleared">✅ Sdoganato</option>
                                                <option value="delivered">🎯 Consegnato</option>
                                            </select>
                                        </div>
                                    </div>
                                    
                                    <!-- Sezione Geografia -->
                                    <div class="details-section">
                                        <h5 class="section-title">🌍 Geografia</h5>
                                        <div class="field-group">
                                            <label>Porto/Aeroporto Origine</label>
                                            <input type="text" 
                                                   id="enh_origin" 
                                                   class="enhanced-input" 
                                                   placeholder="Es: SHANGHAI, HONG KONG, MXP Milano">
                                        </div>
                                        
                                        <div class="field-group">
                                            <label>Porto/Aeroporto Destinazione</label>
                                            <input type="text" 
                                                   id="enh_destination" 
                                                   class="enhanced-input" 
                                                   placeholder="Es: GENOVA, LA SPEZIA, FCO Roma">
                                        </div>
                                        
                                        <div class="field-group">
                                            <label>Numero Riferimento</label>
                                            <input type="text" 
                                                   id="enh_reference" 
                                                   class="enhanced-input" 
                                                   placeholder="Es: PO-2024-001, REF123456">
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Colonna 3: Preview Live Estesa -->
                            <div class="form-card preview-card">
                                <div class="card-header">
                                    <h3><i class="fas fa-eye"></i> Anteprima Live</h3>
                                </div>
                                <div class="card-body">
                                    <div class="live-preview">
                                        <div class="preview-main">
                                            <div class="preview-number">
                                                <strong id="previewNumber">-</strong>
                                            </div>
                                            <div class="preview-type">
                                                <span id="previewType">Tipo tracking</span>
                                            </div>
                                        </div>
                                        
                                        <div class="preview-details">
                                            <div class="preview-row">
                                                <span class="label">Vettore:</span>
                                                <span class="value" id="previewCarrier">-</span>
                                            </div>
                                            <div class="preview-row">
                                                <span class="label">Rotta:</span>
                                                <span class="value" id="previewRoute">-</span>
                                            </div>
                                            <div class="preview-row">
                                                <span class="label">Stato:</span>
                                                <span class="value" id="previewStatus">-</span>
                                            </div>
                                            <div class="preview-row">
                                                <span class="label">Riferimento:</span>
                                                <span class="value" id="previewReference">-</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Colonna 4: API e Controlli Avanzati -->
                            <div class="form-card api-card">
                                <div class="card-header">
                                    <h3><i class="fas fa-cog"></i> API & Controlli</h3>
                                </div>
                                <div class="card-body">
                                    <div class="api-section">
                                        <div class="api-toggle-section">
                                            <div class="toggle-header">
                                                <h4>🔄 Dati Real-time</h4>
                                                <label class="modern-toggle">
                                                    <input type="checkbox" id="enh_useApi" checked>
                                                    <span class="toggle-track"></span>
                                                </label>
                                            </div>
                                            <p class="api-description">
                                                Recupera automaticamente informazioni aggiornate e stati di tracking in tempo reale tramite API ShipsGo
                                            </p>
                                        </div>
                                        
                                        <!-- NUOVO SELETTORE OPERAZIONI -->
<div class="api-operation-selector">
    <h5>🔧 Tipo Operazione</h5>
    <div class="operation-radio-group">
        <div class="operation-radio">
            <input type="radio" id="op_auto" name="api_operation" value="auto" checked>
            <label for="op_auto">
                <i class="fas fa-magic"></i> Auto
                <small style="display:block;opacity:0.8;margin-top:2px;">POST + GET</small>
            </label>
        </div>
        <div class="operation-radio">
            <input type="radio" id="op_post" name="api_operation" value="post">
            <label for="op_post">
                <i class="fas fa-plus"></i> POST
                <small style="display:block;opacity:0.8;margin-top:2px;">Solo registra</small>
            </label>
        </div>
        <div class="operation-radio">
            <input type="radio" id="op_get" name="api_operation" value="get">
            <label for="op_get">
                <i class="fas fa-download"></i> GET
                <small style="display:block;opacity:0.8;margin-top:2px;">Solo recupera</small>
            </label>
        </div>
    </div>
</div>

<div class="api-benefits">    

                                        <div class="api-benefits">
                                            <div class="benefit">
                                                <i class="fas fa-check-circle"></i>
                                                <span>Dati sempre aggiornati</span>
                                            </div>
                                            <div class="benefit">
                                                <i class="fas fa-check-circle"></i>
                                                <span>Auto-compilazione campi</span>
                                            </div>
                                            <div class="benefit">
                                                <i class="fas fa-check-circle"></i>
                                                <span>Eventi in tempo reale</span>
                                            </div>
                                            <div class="benefit">
                                                <i class="fas fa-check-circle"></i>
                                                <span>Notifiche automatiche</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="system-status">
                                        <div class="status-row">
                                            <i class="fas fa-circle status-dot online"></i>
                                            <span class="status-text">Sistema online e pronto</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Footer Actions Integrato -->
                        <div class="integrated-footer">
                            <div class="footer-info">
                                <i class="fas fa-info-circle"></i>
                                <span>Tutti i campi sono opzionali eccetto il numero tracking</span>
                            </div>
                            <div class="footer-actions">
                                <button type="button" class="action-btn btn-cancel" onclick="closeCustomModal()">
                                    <i class="fas fa-times"></i> Annulla
                                </button>
                                <button type="submit" class="action-btn btn-submit" id="enhSubmitBtn">
                                    <i class="fas fa-plus"></i> Aggiungi Tracking
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
                
                <!-- Import Tab - RIDISEGNATO COME SCREENSHOT -->
                <div class="tab-content" data-tab="import">
                    <div class="import-fullwidth">
                        <div class="import-layout-new">
                            <!-- Drop Zone più compatta a sinistra -->
                            <div class="compact-drop-zone" id="enhDropZone">
                                <div class="drop-content-compact">
                                    <div class="drop-visual">
                                        <div class="drop-icon">📁</div>
                                        <h2>Trascina qui i tuoi file per l'import</h2>
                                        <p>Oppure <button type="button" class="file-btn" onclick="document.getElementById('enhFileInput').click()">seleziona file dal computer</button></p>
                                        <div class="format-badges">
                                            <span class="badge">.XLSX</span>
                                            <span class="badge">.XLS</span>
                                            <span class="badge">.CSV</span>
                                        </div>
                                    </div>
                                </div>
                                <input type="file" id="enhFileInput" accept=".xlsx,.xls,.csv" style="display: none;">
                            </div>
                            
                            <!-- Features a destra - COME SCREENSHOT -->
                            <div class="features-sidebar">
                                <h3>📊 Funzionalità Import Avanzate</h3>
                                <div class="features-list">
                                    <div class="feature-item">
                                        <div class="feature-icon">🔍</div>
                                        <div class="feature-text">
                                            <strong>Auto-detection Formato</strong>
                                            <span>Rilevamento automatico del formato file e della struttura dati</span>
                                        </div>
                                    </div>
                                    
                                    <div class="feature-item">
                                        <div class="feature-icon">🗂️</div>
                                        <div class="feature-text">
                                            <strong>Mapping Intelligente</strong>
                                            <span>Associazione automatica delle colonne con i campi tracking</span>
                                        </div>
                                    </div>
                                    
                                    <div class="feature-item">
                                        <div class="feature-icon">👁️</div>
                                        <div class="feature-text">
                                            <strong>Preview & Validazione</strong>
                                            <span>Anteprima completa dei dati prima dell'import definitivo</span>
                                        </div>
                                    </div>
                                    
                                    <div class="feature-item">
                                        <div class="feature-icon">⚡</div>
                                        <div class="feature-text">
                                            <strong>Import Batch Veloce</strong>
                                            <span>Elaborazione rapida di grandi quantità di tracking</span>
                                        </div>
                                    </div>
                                    
                                    <div class="feature-item">
                                        <div class="feature-icon">🔧</div>
                                        <div class="feature-text">
                                            <strong>Controllo Qualità</strong>
                                            <span>Validazione automatica e segnalazione errori</span>
                                        </div>
                                    </div>
                                    
                                    <div class="feature-item">
                                        <div class="feature-icon">📈</div>
                                        <div class="feature-text">
                                            <strong>Statistiche Dettagliate</strong>
                                            <span>Report completo sull'operazione di import</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- STYLES OTTIMIZZATI PER FULL WIDTH -->
            <style>
            .fullwidth-form-wrapper {
                height: 100%;
                display: flex;
                flex-direction: column;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            }
            
            /* Tab integrati */
            .integrated-tabs {
                background: #f8f9fa;
                border-bottom: 1px solid #e9ecef;
                padding: 0 30px;
                display: flex;
                gap: 2px;
            }
            
            .integrated-tab {
                padding: 16px 24px;
                border: none;
                background: transparent;
                cursor: pointer;
                transition: all 0.3s;
                font-size: 14px;
                font-weight: 600;
                color: #6c757d;
                border-bottom: 3px solid transparent;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .integrated-tab:hover {
                background: rgba(0, 123, 255, 0.05);
                color: #007bff;
            }
            
            .integrated-tab.active {
                color: #007bff;
                border-bottom-color: #007bff;
                background: white;
            }
            
            /* Tab content */
            .tab-content {
                display: none;
                flex: 1;
            }
            
            .tab-content.active {
                display: flex;
                flex-direction: column;
            }
            
            /* Form ottimizzato - PADDING ULTERIORMENTE RIDOTTO */
            .optimized-fullwidth-form {
                flex: 1;
                padding: 15px 30px 0 30px;
                display: flex;
                flex-direction: column;
                height: calc(100% - 60px);
            }
            
            /* Grid ottimizzato per 4 colonne invece di 5 - MARGIN OTTIMIZZATO */
            .optimized-grid {
                display: grid;
                grid-template-columns: 1.2fr 1.1fr 1fr 0.9fr;
                gap: 15px;
                flex: 1;
                margin-bottom: 10px;
            }
            
            /* Cards del form - NIENTE PIÙ SCROLLING */
            .form-card {
                background: white;
                border: 1px solid #e9ecef;
                border-radius: 8px;
                overflow: visible;
                box-shadow: 0 1px 4px rgba(0,0,0,0.08);
                display: flex;
                flex-direction: column;
                transition: all 0.3s;
                height: fit-content;
            }
            
            .form-card:hover {
                box-shadow: 0 2px 8px rgba(0,0,0,0.12);
            }
            
            .primary-card {
                background: linear-gradient(135deg, #6c7b95 0%, #8892b0 100%);
                color: white;
            }
            
            .details-card {
                background: linear-gradient(135deg, #8b95a8 0%, #9ca5b8 100%);
                color: white;
            }
            
            .details-section {
                margin-bottom: 12px;
            }
            
            .details-section:last-child {
                margin-bottom: 0;
            }
            
            .section-title {
                font-size: 11px;
                font-weight: 600;
                color: rgba(255,255,255,0.9);
                margin: 0 0 6px 0;
                padding-bottom: 3px;
                border-bottom: 1px solid rgba(255,255,255,0.2);
                text-transform: uppercase;
                letter-spacing: 0.3px;
            }
            
            .field-row {
                display: flex;
                gap: 8px;
                margin-bottom: 7px;
            }
            
            .half-width {
                flex: 1;
                margin-bottom: 0 !important;
            }
            
            .preview-card {
                background: linear-gradient(135deg, #78a083 0%, #87af92 100%);
                color: white;
            }
            
            .api-card {
                background: linear-gradient(135deg, #a68b78 0%, #b59a87 100%);
                color: white;
            }
            
            .card-header {
                padding: 8px 12px;
                border-bottom: 1px solid rgba(255,255,255,0.2);
                background: rgba(255,255,255,0.1);
                flex-shrink: 0;
            }
            
            .card-header h3 {
                margin: 0;
                font-size: 13px;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 5px;
            }
            
            .card-body {
                flex: 1;
                padding: 12px;
                overflow: visible;
            }
            
            /* Input principale - FONT PIÙ GRANDE */
            .main-tracking-input {
                width: 100%;
                padding: 12px 14px;
                border: 2px solid rgba(255,255,255,0.3);
                border-radius: 6px;
                font-size: 15px;
                font-weight: 500;
                background: rgba(255,255,255,0.9);
                color: #333;
                transition: all 0.3s;
                margin-bottom: 8px;
            }
            
            .main-tracking-input:focus {
                outline: none;
                border-color: rgba(255,255,255,0.8);
                background: white;
                box-shadow: 0 0 0 3px rgba(255,255,255,0.2);
            }
            
            .detection-status {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 11px;
                color: rgba(255,255,255,0.8);
                margin-bottom: 8px;
            }
            
            /* Examples section - FONT MIGLIORATO */
            .examples-section h4 {
                margin: 0 0 6px 0;
                font-size: 12px;
                color: rgba(255,255,255,0.9);
            }
            
            .examples-list {
                display: flex;
                flex-direction: column;
                gap: 3px;
            }
            
            .example-item {
                border: 1px solid rgba(255,255,255,0.3);
                border-radius: 4px;
                background: rgba(255,255,255,0.1);
                cursor: pointer;
                transition: all 0.3s;
                padding: 5px 7px;
                text-align: left;
            }
            
            .example-item:hover {
                background: rgba(255,255,255,0.2);
                transform: translateY(-1px);
            }
            
            .example-visual {
                display: flex;
                align-items: center;
                gap: 6px;
            }
            
            .example-icon {
                font-size: 13px;
            }
            
            .example-details strong {
                display: block;
                font-size: 10px;
                margin-bottom: 1px;
            }
            
            .example-details code {
                font-size: 9px;
                opacity: 0.8;
                font-family: monospace;
            }
            
            /* Field groups - FONT MIGLIORATO */
            .field-group {
                margin-bottom: 7px;
            }
            
            .field-group label {
                display: block;
                font-size: 10px;
                font-weight: 600;
                margin-bottom: 3px;
                text-transform: uppercase;
                letter-spacing: 0.3px;
                color: rgba(255,255,255,0.8);
            }
            
            .enhanced-input, .enhanced-select {
                width: 100%;
                padding: 7px 9px;
                border: 1px solid rgba(255,255,255,0.3);
                border-radius: 4px;
                font-size: 12px;
                transition: all 0.3s;
                background: rgba(255,255,255,0.9);
                color: #333;
            }
            
            .enhanced-input:focus, .enhanced-select:focus {
                outline: none;
                border-color: rgba(255,255,255,0.8);
                background: white;
                box-shadow: 0 0 0 2px rgba(255,255,255,0.2);
            }
            
            /* Live preview - RIDISEGNATA */
            .live-preview {
                background: rgba(255,255,255,0.15);
                border-radius: 8px;
                padding: 14px;
                border: 1px solid rgba(255,255,255,0.2);
            }
            
            .preview-main {
                text-align: center;
                margin-bottom: 14px;
                padding-bottom: 12px;
                border-bottom: 1px solid rgba(255,255,255,0.3);
            }
            
            .preview-number strong {
                font-size: 16px;
                color: white;
                display: block;
                margin-bottom: 4px;
                font-weight: 600;
            }
            
            .preview-type {
                font-size: 12px;
                color: rgba(255,255,255,0.9);
                font-style: italic;
            }
            
            .preview-details {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }
            
            .preview-row {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                font-size: 11px;
                line-height: 1.3;
            }
            
            .preview-row .label {
                color: white;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.3px;
                font-size: 10px;
                flex-shrink: 0;
                min-width: 55px;
            }
            
            .preview-row .value {
                color: rgba(255,255,255,0.95);
                font-weight: 500;
                text-align: right;
                flex: 1;
                margin-left: 8px;
                word-break: break-word;
                font-size: 11px;
            }
            
            /* API section */
            .api-section {
                background: rgba(255,255,255,0.1);
                border-radius: 8px;
                padding: 16px;
                margin-bottom: 16px;
            }
            
            .toggle-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
            }
            
            .toggle-header h4 {
                margin: 0;
                font-size: 14px;
                color: white;
            }
            
            .modern-toggle {
                position: relative;
                width: 48px;
                height: 28px;
            }
            
            .modern-toggle input {
                opacity: 0;
                width: 0;
                height: 0;
            }
            
            .toggle-track {
                position: absolute;
                cursor: pointer;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(255,255,255,0.3);
                transition: .3s;
                border-radius: 28px;
            }
            
            .toggle-track:before {
                position: absolute;
                content: "";
                height: 22px;
                width: 22px;
                left: 3px;
                bottom: 3px;
                background: white;
                transition: .3s;
                border-radius: 50%;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            }
            
            .modern-toggle input:checked + .toggle-track {
                background: rgba(40, 167, 69, 0.8);
            }
            
            .modern-toggle input:checked + .toggle-track:before {
                transform: translateX(20px);
            }
            
            .api-description {
                font-size: 12px;
                color: rgba(255,255,255,0.8);
                line-height: 1.4;
                margin: 0 0 12px 0;
            }
            
            .api-benefits {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }
            
            .benefit {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 12px;
                color: rgba(255,255,255,0.9);
            }
            
            .benefit i {
                color: #28a745;
                font-size: 11px;
            }
            
            /* System status */
            .system-status {
                background: rgba(255,255,255,0.1);
                border-radius: 6px;
                padding: 12px;
            }
            
            .status-row {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .status-dot {
                font-size: 8px;
            }
            
            .status-dot.online {
                color: #28a745;
            }
            
            .status-text {
                font-size: 13px;
                color: rgba(255,255,255,0.9);
            }
            
            /* Footer integrato - PADDING RIDOTTO */
            .integrated-footer {
                background: #f8f9fa;
                border-top: 1px solid #e9ecef;
                padding: 15px 30px;
                margin: 15px -30px 0 -30px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-shrink: 0;
                position: relative;
                z-index: 10;
                box-shadow: 0 -2px 8px rgba(0,0,0,0.1);
            }
            
            .footer-info {
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
            
            .action-btn {
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
            
            background: #dc3545 !important;
    color: white !important;
    border: none !important;
}

.btn-cancel:hover {
    background: #c82333 !important;
    box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3) !important;
}

.btn-submit {
    background: #007bff !important;
    color: white !important;
    opacity: 1 !important;
    font-weight: 600 !important;
}

.btn-submit:hover {
    background: #0056b3 !important;
    box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3) !important;
    transform: translateY(-1px);
}
            
            /* Import section - NUOVO LAYOUT COMPATTO */
            .import-fullwidth {
                flex: 1;
                padding: 30px 30px 0 30px;
                height: calc(100% - 60px);
                overflow-y: auto;
            }
            
            .import-layout-new {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 24px;
                height: auto;
                min-height: 400px;
            }
            
            /* Drop zone più compatta ORIZZONTALMENTE ma più alta VERTICALMENTE */
            .compact-drop-zone {
                border: 3px dashed #007bff;
                border-radius: 12px;
                background: linear-gradient(135deg, #f8f9ff 0%, #e6f3ff 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.3s;
                height: 400px;
                max-height: 400px;
            }
            
            .compact-drop-zone:hover,
            .compact-drop-zone.dragover {
                background: linear-gradient(135deg, #e6f3ff 0%, #cce7ff 100%);
                border-color: #0056b3;
                transform: scale(1.01);
            }
            
            .drop-content-compact {
                text-align: center;
                padding: 30px 20px;
            }
            
            .drop-icon {
                font-size: 48px;
                margin-bottom: 12px;
                color: #007bff;
            }
            
            .drop-content-compact h2 {
                margin: 0 0 6px 0;
                color: #333;
                font-size: 18px;
                font-weight: 600;
            }
            
            .drop-content-compact p {
                margin: 0 0 12px 0;
                color: #6c757d;
                font-size: 13px;
            }
            
            .file-btn {
                background: none;
                border: none;
                color: #007bff;
                text-decoration: underline;
                cursor: pointer;
                font-weight: 500;
                font-size: 13px;
            }
            
            .format-badges {
                display: flex;
                gap: 6px;
                justify-content: center;
            }
            
            .badge {
                background: #007bff;
                color: white;
                padding: 4px 8px;
                border-radius: 3px;
                font-size: 10px;
                font-weight: 500;
            }
            
            /* Features sidebar - COME SCREENSHOT */
            .features-sidebar {
                background: white;
                border: 1px solid #e9ecef;
                border-radius: 8px;
                padding: 20px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                height: fit-content;
            }
            
            .features-sidebar h3 {
                text-align: center;
                margin: 0 0 20px 0;
                color: #333;
                font-size: 18px;
                font-weight: 600;
                padding-bottom: 12px;
                border-bottom: 2px solid #e9ecef;
            }
            
            .features-list {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 10px;
            }
            
            .feature-item {
                display: flex;
                align-items: flex-start;
                gap: 8px;
                padding: 10px;
                background: #f8f9fa;
                border: 1px solid #e9ecef;
                border-radius: 6px;
                transition: all 0.3s;
            }
            
            .feature-item:hover {
                background: #e9ecef;
                transform: translateY(-1px);
            }
            
            .feature-icon {
                font-size: 16px;
                width: 24px;
                text-align: center;
                flex-shrink: 0;
                margin-top: 1px;
            }
            
            .feature-text {
                display: flex;
                flex-direction: column;
            }
            
            .feature-text strong {
                margin: 0 0 2px 0;
                color: #333;
                font-size: 11px;
                font-weight: 600;
                line-height: 1.2;
            }
            
            .feature-text span {
                margin: 0;
                color: #6c757d;
                font-size: 9px;
                line-height: 1.2;
            }
            
            /* Responsive ottimizzato */
            @media (max-width: 1400px) {
                .optimized-grid {
                    grid-template-columns: repeat(4, 1fr);
                }
            }
            
            @media (max-width: 1100px) {
                .optimized-grid {
                    grid-template-columns: repeat(3, 1fr);
                }
                
                .import-layout-new {
                    grid-template-columns: 1fr;
                    gap: 16px;
                }
                
                .compact-drop-zone {
                    height: 350px;
                }
                
                .features-list {
                    grid-template-columns: 1fr;
                    gap: 8px;
                }
            }
            
            @media (max-width: 900px) {
                .optimized-grid {
                    grid-template-columns: repeat(2, 1fr);
                }
                
                .features-sidebar {
                    padding: 16px;
                }
                
                .features-sidebar h3 {
                    font-size: 16px;
                    margin-bottom: 16px;
                }
            }
            
            @media (max-width: 600px) {
                .optimized-grid {
                    grid-template-columns: 1fr;
                }
                
                .integrated-footer {
                    flex-direction: column;
                    gap: 16px;
                    padding: 16px 20px;
                    margin: 16px -20px 0 -20px;
                }
                
                .action-btn {
                    width: 100%;
                    justify-content: center;
                }
                
                .optimized-fullwidth-form {
                    padding: 20px 20px 0 20px;
                }
                
                .import-fullwidth {
                    padding: 16px;
                }
                
                .compact-drop-zone {
                    height: 300px;
                }
                
                .features-list {
                    grid-template-columns: 1fr;
                    gap: 6px;
                }
                
                .feature-item {
                    padding: 6px;
                }
                
                .feature-text strong {
                    font-size: 9px;
                }
                
                .feature-text span {
                    font-size: 7px;
                }
                
                .drop-content-compact {
                    padding: 20px 15px;
                }
                
                .drop-content-compact h2 {
                    font-size: 16px;
                }
                
                .drop-icon {
                    font-size: 36px;
                }
            }
            </style>
            
            <!-- WORKFLOW MODAL STYLES -->
            <style>
            .workflow-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(4px);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transition: opacity 0.3s ease;
            }
            
            .workflow-modal-overlay.active {
                opacity: 1;
            }
            
            .workflow-modal {
                background: white;
                border-radius: 12px;
                padding: 30px;
                max-width: 800px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            }
            
            .workflow-modal h3 {
                margin: 0 0 25px 0;
                color: #333;
                font-size: 24px;
                text-align: center;
            }
            
            .workflow-container {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 30px;
            }
            
            .workflow-step {
                flex: 1;
                text-align: center;
                padding: 20px;
                border-radius: 8px;
                background: #f8f9fa;
                transition: all 0.3s ease;
            }
            
            .workflow-step.completed {
                background: #d4f4dd;
            }
            
            .workflow-step.error {
                background: #ffebee;
            }
            
            .step-icon {
                font-size: 48px;
                margin-bottom: 15px;
                color: #6c757d;
            }
            
            .workflow-step.completed .step-icon {
                color: #28a745;
            }
            
            .workflow-step.error .step-icon {
                color: #dc3545;
            }
            
            .step-content h4 {
                margin: 0 0 8px 0;
                font-size: 16px;
                color: #333;
            }
            
            .step-content p {
                margin: 0 0 12px 0;
                font-size: 14px;
                color: #6c757d;
            }
            
            .step-status {
                font-size: 14px;
                font-weight: 500;
                padding: 6px 12px;
                border-radius: 20px;
                display: inline-block;
            }
            
            .step-status.pending {
                background: #fff3cd;
                color: #856404;
            }
            
            .step-status.waiting {
                background: #e9ecef;
                color: #6c757d;
            }
            
            .step-status.success {
                background: #28a745;
                color: white;
            }
            
            .step-status.error {
                background: #dc3545;
                color: white;
            }
            
            .workflow-arrow {
                font-size: 24px;
                color: #6c757d;
                margin: 0 20px;
            }
            
            .workflow-result {
                background: #f8f9fa;
                border-radius: 8px;
                padding: 20px;
                margin-top: 20px;
            }
            
            .workflow-result h4 {
                margin: 0 0 15px 0;
                color: #333;
            }
            
            .result-success {
                display: flex;
                align-items: center;
                gap: 15px;
                color: #28a745;
            }
            
            .result-success i {
                font-size: 36px;
            }
            
            .result-error {
                display: flex;
                align-items: center;
                gap: 15px;
                color: #dc3545;
            }
            
            .result-error i {
                font-size: 36px;
            }
            
            .workflow-close {
                display: block;
                margin: 20px auto 0;
                padding: 10px 24px;
                background: #007bff;
                color: white;
                border: none;
                border-radius: 6px;
                font-size: 16px;
                cursor: pointer;
                transition: background 0.3s ease;
            }
            
            .workflow-close:hover {
                background: #0056b3;
            }
            
            @media (max-width: 768px) {
                .workflow-container {
                    flex-direction: column;
                }
                
                .workflow-arrow {
                    transform: rotate(90deg);
                    margin: 20px 0;
                }
                
                .workflow-step {
                    width: 100%;
                }
                }
            }
            </style>
            
            <!-- ERROR MODAL STYLES -->
            <style>
            .error-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.6);
                backdrop-filter: blur(4px);
                z-index: 10001;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transition: opacity 0.3s ease;
            }
            
            .error-modal-overlay.active {
                opacity: 1;
            }
            
            .error-modal {
                background: white;
                border-radius: 12px;
                padding: 30px;
                max-width: 500px;
                width: 90%;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                transform: scale(0.9);
                transition: transform 0.3s ease;
            }
            
            .error-modal-overlay.active .error-modal {
                transform: scale(1);
            }
            
            .error-modal.info {
                border-top: 4px solid #3b82f6;
            }
            
            .error-modal.warning {
                border-top: 4px solid #f59e0b;
            }
            
            .error-modal.error {
                border-top: 4px solid #ef4444;
            }
            
            .error-icon {
                text-align: center;
                margin-bottom: 20px;
            }
            
            .error-icon i {
                font-size: 48px;
            }
            
            .error-modal.info .error-icon i {
                color: #3b82f6;
            }
            
            .error-modal.warning .error-icon i {
                color: #f59e0b;
            }
            
            .error-modal.error .error-icon i {
                color: #ef4444;
            }
            
            .error-content h3 {
                margin: 0 0 12px 0;
                font-size: 20px;
                color: #333;
                text-align: center;
            }
            
            .error-content p {
                margin: 0 0 16px 0;
                color: #666;
                text-align: center;
                line-height: 1.5;
            }
            
            .error-details {
                background: #f8f9fa;
                border-radius: 6px;
                padding: 12px;
                margin-top: 12px;
                font-size: 14px;
                color: #666;
                font-family: monospace;
            }
            
            .error-actions {
                display: flex;
                gap: 10px;
                justify-content: center;
                margin-top: 24px;
                flex-wrap: wrap;
            }
            
            .error-action-btn,
            .error-close-btn {
                padding: 10px 20px;
                border: none;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .error-action-btn {
                background: #007bff;
                color: white;
            }
            
            .error-action-btn:hover {
                background: #0056b3;
                transform: translateY(-1px);
            }
            
            .error-close-btn {
                background: #e9ecef;
                color: #495057;
            }
            
            .error-close-btn:hover {
                background: #dee2e6;
            }
            
            .format-examples {
                display: grid;
                gap: 20px;
            }
            
            .format-group h4 {
                margin: 0 0 12px 0;
                color: #333;
            }
            
            .format-group ul {
                list-style: none;
                padding: 0;
                margin: 0;
            }
            
            .format-group li {
                padding: 8px 0;
                border-bottom: 1px solid #e9ecef;
            }
            
            .format-group li:last-child {
                border-bottom: none;
            }
            
            .format-group code {
                background: #f8f9fa;
                padding: 4px 8px;
                border-radius: 4px;
                font-family: monospace;
                color: #e83e8c;
            }
            
            .rate-limit-info ul {
                list-style: disc;
                padding-left: 20px;
                margin: 10px 0;
            }
            
            .current-usage {
                background: #f8f9fa;
                border-radius: 6px;
                padding: 12px;
                margin-top: 16px;
            }
            
            .current-usage h4 {
                margin: 0 0 8px 0;
                color: #333;
                font-size: 14px;
            }
            
            .current-usage p {
                margin: 0;
                color: #666;
            }
            
            /* Quick Actions Styles */
            .quick-actions-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.7);
                backdrop-filter: blur(4px);
                z-index: 10002;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transition: opacity 0.3s ease;
            }
            
            .quick-actions-overlay.active {
                opacity: 1;
            }
            
            .quick-actions-modal {
                background: white;
                border-radius: 12px;
                max-width: 500px;
                width: 90%;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                overflow: hidden;
                transform: scale(0.9);
                transition: transform 0.3s ease;
            }
            
            .quick-actions-overlay.active .quick-actions-modal {
                transform: scale(1);
            }
            
            .quick-actions-header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .quick-actions-header h3 {
                margin: 0;
                font-size: 20px;
            }
            
            .quick-close {
                background: rgba(255, 255, 255, 0.2);
                border: none;
                color: white;
                width: 36px;
                height: 36px;
                border-radius: 50%;
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .quick-close:hover {
                background: rgba(255, 255, 255, 0.3);
                transform: rotate(90deg);
            }
            
            .container-info {
                padding: 20px;
                background: #f8f9fa;
                border-bottom: 1px solid #e9ecef;
            }
            
            .info-main {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 12px;
            }
            
            .container-number {
                font-size: 24px;
                font-weight: 700;
                color: #333;
                font-family: monospace;
            }
            
            .container-status {
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
                text-transform: uppercase;
            }
            
            .container-status.status-in_transit {
                background: #3b82f6;
                color: white;
            }
            
            .container-status.status-arrived {
                background: #10b981;
                color: white;
            }
            
            .container-status.status-delivered {
                background: #059669;
                color: white;
            }
            
            .info-row {
                display: flex;
                justify-content: space-between;
                padding: 8px 0;
                border-bottom: 1px solid #e9ecef;
            }
            
            .info-row:last-child {
                border-bottom: none;
            }
            
            .info-label {
                color: #6c757d;
                font-size: 14px;
            }
            
            .info-value {
                color: #333;
                font-weight: 500;
                font-size: 14px;
            }
            
            .quick-actions {
                padding: 20px;
            }
            
            .quick-actions h4 {
                margin: 0 0 16px 0;
                color: #333;
                font-size: 16px;
            }
            
            .action-buttons-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 12px;
            }
            
            .action-btn {
                background: white;
                border: 2px solid #e9ecef;
                border-radius: 8px;
                padding: 16px;
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 8px;
            }
            
            .action-btn:hover {
                border-color: #007bff;
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0, 123, 255, 0.15);
            }
            
            .action-btn.primary {
                background: #007bff;
                color: white;
                border-color: #007bff;
            }
            
            .action-btn.primary:hover {
                background: #0056b3;
                border-color: #0056b3;
            }
            
            .action-btn i {
                font-size: 24px;
            }
            
            .action-btn span {
                font-size: 14px;
                font-weight: 500;
            }
            
            .last-update {
                padding: 12px 20px;
                background: #f8f9fa;
                text-align: center;
                font-size: 12px;
                color: #6c757d;
                border-top: 1px solid #e9ecef;
            }
            
            /* Field error styles */
            .field-error {
                color: #dc3545;
                font-size: 12px;
                margin-top: 4px;
                display: block;
            }
            
            input.error, select.error {
                border-color: #dc3545 !important;
                box-shadow: 0 0 0 2px rgba(220, 53, 69, 0.2) !important;
            }
            
            @media (max-width: 480px) {
                .action-buttons-grid {
                    grid-template-columns: 1fr;
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
        document.querySelectorAll('.integrated-tab').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const targetTab = this.dataset.target;
                console.log('🔄 Tab clicked:', targetTab);
                
                // Update buttons
                document.querySelectorAll('.integrated-tab').forEach(b => b.classList.remove('active'));
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
            updateCarrierWithShipsGoData(typeSelect.value);
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
        updateCarrierWithShipsGoData('auto');
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
            updateCarrierWithShipsGoData(type);
            
            if (carrier) {
                setTimeout(() => {
                    document.getElementById('enh_carrier').value = carrier;
                }, 100);
            }
        } else {
            showDetectionError();
        }
        
        // Verifica se il container esiste già
        const containerPattern = /^[A-Z]{4}\d{7}$/;
        if (containerPattern.test(trackingNumber.trim().toUpperCase())) {
            // Ritarda un po' per non interferire con la digitazione
            clearTimeout(window.existingCheckTimeout);
            window.existingCheckTimeout = setTimeout(async () => {
                const exists = await QuickContainerActions.checkAndShowActions(trackingNumber.trim().toUpperCase());
                if (exists) {
                    console.log('Container già presente nel sistema');
                }
            }, 1500);
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
    
    // ========================================
    // NUOVE FUNZIONI PER CARRIERS CON SHIPSGO
    // ========================================
    
    async function updateCarrierWithShipsGoData(type) {
        const select = document.getElementById('enh_carrier');
        if (!select) return;
        
        // Clear current options
        select.innerHTML = '<option value="">Seleziona vettore...</option>';
        
        // Se abbiamo il tracking service con API keys, usa i dati live
        if (window.trackingService && window.trackingService.hasApiKeys()) {
            try {
                // Mostra loading
                select.innerHTML = '<option value="">Caricamento vettori...</option>';
                select.disabled = true;
                
                let carriers = [];
                
                if (type === 'container' || type === 'bl') {
                    // Ottieni shipping lines da ShipsGo
                    const response = await fetch('/netlify/functions/shipsgo-proxy', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            version: 'v1.2',
                            endpoint: '/ContainerService/GetShippingLineList',
                            method: 'GET'
                        })
                    });
                    
                    const result = await response.json();
                    if (result.success && Array.isArray(result.data)) {
                        carriers = result.data.map(line => ({
                            code: line.ShippingLineCode || line.Code,
                            name: line.ShippingLineName || line.Name
                        }));
                    }
                } else if (type === 'awb') {
                    // Ottieni airlines da ShipsGo v2
                    const response = await fetch('/netlify/functions/shipsgo-proxy', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            version: 'v2',
                            endpoint: '/air/airlines',
                            method: 'GET'
                        })
                    });
                    
                    const result = await response.json();
                    if (result.success && Array.isArray(result.data)) {
                        carriers = result.data.map(airline => ({
                            code: airline.AirlineCode || airline.Code,
                            name: airline.AirlineName || airline.Name
                        }));
                    }
                }
                
                // Riabilita select
                select.disabled = false;
                select.innerHTML = '<option value="">Seleziona vettore...</option>';
                
                // Aggiungi opzioni
                if (carriers.length > 0) {
                    // Ordina alfabeticamente
                    carriers.sort((a, b) => a.name.localeCompare(b.name));
                    
                    // Crea optgroup per i più comuni
                    const commonCarriers = getCommonCarriers(type);
                    const commonCodes = commonCarriers.map(c => c.code);
                    
                    // Vettori comuni
                    const optgroupCommon = document.createElement('optgroup');
                    optgroupCommon.label = '⭐ Più utilizzati';
                    
                    commonCarriers.forEach(carrier => {
                        const found = carriers.find(c => c.code === carrier.code);
                        if (found) {
                            const option = document.createElement('option');
                            option.value = found.code;
                            option.textContent = found.name;
                            optgroupCommon.appendChild(option);
                        }
                    });
                    
                    if (optgroupCommon.children.length > 0) {
                        select.appendChild(optgroupCommon);
                    }
                    
                    // Altri vettori
                    const optgroupOthers = document.createElement('optgroup');
                    optgroupOthers.label = '📋 Tutti i vettori';
                    
                    carriers.forEach(carrier => {
                        if (!commonCodes.includes(carrier.code)) {
                            const option = document.createElement('option');
                            option.value = carrier.code;
                            option.textContent = carrier.name;
                            optgroupOthers.appendChild(option);
                        }
                    });
                    
                    if (optgroupOthers.children.length > 0) {
                        select.appendChild(optgroupOthers);
                    }
                    
                    console.log(`✅ Caricati ${carriers.length} vettori da ShipsGo`);
                } else {
                    // Fallback ai vettori statici
                    populateStaticCarriers(type);
                }
                
            } catch (error) {
                console.error('Error loading carriers from ShipsGo:', error);
                // Fallback ai vettori statici
                select.disabled = false;
                populateStaticCarriers(type);
            }
        } else {
            // Usa vettori statici se non ci sono API keys
            populateStaticCarriers(type);
        }
    }
    
    function populateStaticCarriers(type) {
        const select = document.getElementById('enh_carrier');
        const carriers = getCarriersByType(type);
        
        if (carriers.length > 0) {
            // Crea optgroup
            const optgroup = document.createElement('optgroup');
            optgroup.label = type === 'container' ? '🚢 Marittimi' : 
                             type === 'awb' ? '✈️ Aerei' : '📦 Express';
            
            carriers.forEach(carrier => {
                const option = document.createElement('option');
                option.value = carrier.code;
                option.textContent = `${carrier.code} - ${carrier.name}`;
                optgroup.appendChild(option);
            });
            
            select.appendChild(optgroup);
        }
    }
    
    function getCommonCarriers(type) {
        if (type === 'container' || type === 'bl') {
            return [
                { code: 'MSK', name: 'Maersk Line' },
                { code: 'MSC', name: 'Mediterranean Shipping Company' },
                { code: 'CMA CGM', name: 'CMA CGM' },
                { code: 'COSCO', name: 'COSCO Shipping Lines' },
                { code: 'HAPAG-LLOYD', name: 'Hapag-Lloyd' }
            ];
        } else if (type === 'awb') {
            return [
                { code: 'CV', name: 'Cargolux' },
                { code: 'LH', name: 'Lufthansa Cargo' },
                { code: 'EK', name: 'Emirates SkyCargo' },
                { code: 'QR', name: 'Qatar Airways Cargo' },
                { code: 'TK', name: 'Turkish Cargo' }
            ];
        }
        return [];
    }
    
    function getCarriersByType(type) {
        const carriers = {
            container: [
                { code: 'MSK', name: 'Maersk Line' },
                { code: 'MSC', name: 'Mediterranean Shipping Company' },
                { code: 'CMA CGM', name: 'CMA CGM' },
                { code: 'COSCO', name: 'COSCO Shipping Lines' },
                { code: 'HAPAG-LLOYD', name: 'Hapag-Lloyd' },
                { code: 'ONE', name: 'Ocean Network Express' },
                { code: 'EVERGREEN', name: 'Evergreen Line' },
                { code: 'YML', name: 'Yang Ming Line' },
                { code: 'ZIM', name: 'ZIM Integrated Shipping' }
            ],
            awb: [
                { code: 'CV', name: 'Cargolux' },
                { code: 'LH', name: 'Lufthansa Cargo' },
                { code: 'EK', name: 'Emirates SkyCargo' },
                { code: 'QR', name: 'Qatar Airways Cargo' },
                { code: 'TK', name: 'Turkish Cargo' },
                { code: 'CX', name: 'Cathay Pacific Cargo' },
                { code: 'SQ', name: 'Singapore Airlines Cargo' },
                { code: 'AF', name: 'Air France Cargo' }
            ],
            bl: [
                { code: 'MSK', name: 'Maersk Line' },
                { code: 'MSC', name: 'Mediterranean Shipping Company' },
                { code: 'CMA CGM', name: 'CMA CGM' }
            ],
            parcel: [
                { code: 'DHL', name: 'DHL Express' },
                { code: 'UPS', name: 'UPS' },
                { code: 'FEDEX', name: 'FedEx' },
                { code: 'TNT', name: 'TNT Express' }
            ]
        };
        
        return carriers[type] || carriers.container;
    }
    
    // ========================================
    // FORM SUBMISSION
    // ========================================
    
    async function handleEnhancedSubmit(e) {
        e.preventDefault();
        
        const btn = document.getElementById('enhSubmitBtn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Elaborazione...';
        btn.disabled = true;
        
        try {
            // Collect form data
            const formData = {
                trackingNumber: document.getElementById('enh_trackingNumber').value,
                trackingType: document.getElementById('enh_trackingType').value,
                carrier: document.getElementById('enh_carrier').value,
                origin: document.getElementById('enh_origin').value,
                destination: document.getElementById('enh_destination').value,
                status: document.getElementById('enh_status').value,
                reference: document.getElementById('enh_reference').value,
                useApi: document.getElementById('enh_useApi').checked
            };
            
            // Show workflow modal
            showWorkflowModal();
            
            // Process tracking
            const result = await processEnhancedTracking(formData);
            
            if (result.success) {
                updateWorkflowStep(2, 'completed', 'Completato');
                showWorkflowResult(true, result.message);
                
                // Close modal after success
                setTimeout(() => {
                    closeAllModals();
                    if (window.refreshTrackingList) {
                        window.refreshTrackingList();
                    }
                }, 2000);
            } else {
                updateWorkflowStep(2, 'error', 'Errore');
                showWorkflowResult(false, result.message);
            }
        } catch (error) {
            console.error('Submit error:', error);
            updateWorkflowStep(2, 'error', 'Errore');
            showWorkflowResult(false, error.message);
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }
    
    async function processEnhancedTracking(formData) {
        updateWorkflowStep(0, 'completed', 'Validato');
        
        // If using API, fetch live data
        if (formData.useApi && window.trackingService) {
            updateWorkflowStep(1, 'pending', 'Recupero dati...');
            
            try {
                const apiData = await window.trackingService.getTrackingInfo(
                    formData.trackingNumber,
                    formData.trackingType
                );
                
                if (apiData.success) {
                    // Merge API data with form data
                    Object.assign(formData, apiData.data);
                    updateWorkflowStep(1, 'completed', 'Dati recuperati');
                } else {
                    updateWorkflowStep(1, 'completed', 'Dati manuali');
                }
            } catch (error) {
                console.warn('API fetch failed, using manual data:', error);
                updateWorkflowStep(1, 'completed', 'Dati manuali');
            }
        } else {
            updateWorkflowStep(1, 'completed', 'Dati manuali');
        }
        
        // Save tracking
        updateWorkflowStep(2, 'pending', 'Salvataggio...');
        
        if (window.trackingManager) {
            return await window.trackingManager.addTracking(formData);
        } else {
            // Fallback to localStorage
            const trackings = JSON.parse(localStorage.getItem('trackings') || '[]');
            trackings.push({
                ...formData,
                id: Date.now(),
                createdAt: new Date().toISOString()
            });
            localStorage.setItem('trackings', JSON.stringify(trackings));
            return { success: true, message: 'Tracking aggiunto con successo!' };
        }
    }
    
    // ========================================
    // FILE IMPORT
    // ========================================
    
    async function handleFileSelect(file) {
        if (!window.ImportManager) {
            showErrorModal(
                'Import non disponibile',
                'Il modulo di import non è ancora caricato. Riprova tra qualche istante.',
                'warning'
            );
            return;
        }
        
        try {
            const result = await window.ImportManager.handleImport(file);
            if (result.success) {
                closeCustomModal();
                if (window.refreshTrackingList) {
                    window.refreshTrackingList();
                }
            }
        } catch (error) {
            console.error('Import error:', error);
            showErrorModal(
                'Errore import',
                error.message,
                'error'
            );
        }
    }
    
    // ========================================
    // UI HELPERS
    // ========================================
    
    function showWorkflowModal() {
        const overlay = document.createElement('div');
        overlay.className = 'workflow-modal-overlay';
        overlay.innerHTML = `
            <div class="workflow-modal">
                <h3>🚀 Elaborazione Tracking</h3>
                <div class="workflow-container">
                    <div class="workflow-step" data-step="0">
                        <div class="step-icon">📋</div>
                        <div class="step-content">
                            <h4>Validazione</h4>
                            <p>Controllo dati inseriti</p>
                            <span class="step-status pending">In corso...</span>
                        </div>
                    </div>
                    
                    <div class="workflow-arrow">→</div>
                    
                    <div class="workflow-step" data-step="1">
                        <div class="step-icon">🔄</div>
                        <div class="step-content">
                            <h4>API Check</h4>
                            <p>Recupero dati live</p>
                            <span class="step-status waiting">In attesa</span>
                        </div>
                    </div>
                    
                    <div class="workflow-arrow">→</div>
                    
                    <div class="workflow-step" data-step="2">
                        <div class="step-icon">💾</div>
                        <div class="step-content">
                            <h4>Salvataggio</h4>
                            <p>Registrazione tracking</p>
                            <span class="step-status waiting">In attesa</span>
                        </div>
                    </div>
                </div>
                
                <div class="workflow-result" style="display: none;">
                    <!-- Result will be injected here -->
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        setTimeout(() => overlay.classList.add('active'), 10);
    }
    
    function updateWorkflowStep(stepIndex, status, statusText) {
        const step = document.querySelector(`[data-step="${stepIndex}"]`);
        if (!step) return;
        
        step.className = `workflow-step ${status}`;
        const statusEl = step.querySelector('.step-status');
        statusEl.className = `step-status ${status === 'completed' ? 'success' : status === 'error' ? 'error' : status}`;
        statusEl.textContent = statusText;
    }
    
    function showWorkflowResult(success, message) {
        const resultDiv = document.querySelector('.workflow-result');
        if (!resultDiv) return;
        
        resultDiv.innerHTML = success ? `
            <div class="result-success">
                <i class="fas fa-check-circle"></i>
                <div>
                    <h4>Operazione completata!</h4>
                    <p>${message}</p>
                </div>
            </div>
        ` : `
            <div class="result-error">
                <i class="fas fa-exclamation-circle"></i>
                <div>
                    <h4>Operazione fallita</h4>
                    <p>${message}</p>
                </div>
            </div>
        `;
        
        resultDiv.style.display = 'block';
        
        // Add close button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'workflow-close';
        closeBtn.textContent = 'Chiudi';
        closeBtn.onclick = closeAllModals;
        resultDiv.appendChild(closeBtn);
    }
    
    function showErrorModal(title, message, type = 'error') {
        const overlay = document.createElement('div');
        overlay.className = 'error-modal-overlay';
        
        const iconMap = {
            info: 'fa-info-circle',
            warning: 'fa-exclamation-triangle',
            error: 'fa-exclamation-circle'
        };
        
        overlay.innerHTML = `
            <div class="error-modal ${type}">
                <div class="error-icon">
                    <i class="fas ${iconMap[type]}"></i>
                </div>
                <div class="error-content">
                    <h3>${title}</h3>
                    <p>${message}</p>
                </div>
                <div class="error-actions">
                    <button class="error-close-btn" onclick="this.closest('.error-modal-overlay').remove()">
                        Chiudi
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        setTimeout(() => overlay.classList.add('active'), 10);
    }
    
    function closeAllModals() {
        document.querySelectorAll('.workflow-modal-overlay, .error-modal-overlay').forEach(el => {
            el.classList.remove('active');
            setTimeout(() => el.remove(), 300);
        });
        closeCustomModal();
    }
    
    // ========================================
    // PREFILL FORM
    // ========================================
    
    function prefillForm(data) {
        if (data.trackingNumber) {
            document.getElementById('enh_trackingNumber').value = data.trackingNumber;
        }
        if (data.trackingType) {
            document.getElementById('enh_trackingType').value = data.trackingType;
            updateCarrierWithShipsGoData(data.trackingType);
        }
        if (data.carrier) {
            setTimeout(() => {
                document.getElementById('enh_carrier').value = data.carrier;
            }, 500);
        }
        if (data.origin) {
            document.getElementById('enh_origin').value = data.origin;
        }
        if (data.destination) {
            document.getElementById('enh_destination').value = data.destination;
        }
        if (data.status) {
            document.getElementById('enh_status').value = data.status;
        }
        if (data.reference) {
            document.getElementById('enh_reference').value = data.reference;
        }
    }
    
    // ========================================
    // SETTINGS TOGGLE
    // ========================================
    
    function addEnhancedToggle() {
        // Add toggle to settings if settings module exists
        if (window.SettingsManager) {
            window.SettingsManager.addSetting({
                id: 'enableEnhancedTracking',
                label: 'Form Tracking Enhanced',
                type: 'toggle',
                defaultValue: true,
                onChange: (value) => {
                    localStorage.setItem('enableEnhancedTracking', value);
                    if (!value) {
                        alert('Ricarica la pagina per tornare al form classico');
                    }
                }
            });
        }
    }
    
    // ========================================
    // QUICK CONTAINER ACTIONS INTEGRATION
    // ========================================
    
    window.QuickContainerActions = {
        async checkAndShowActions(containerNumber) {
            // Verifica se il container esiste già nel sistema
            if (!window.trackingManager) return false;
            
            const existingContainer = await window.trackingManager.findByNumber(containerNumber);
            if (existingContainer) {
                this.showQuickActionsModal(existingContainer);
                return true;
            }
            return false;
        },
        
        showQuickActionsModal(container) {
            const overlay = document.createElement('div');
            overlay.className = 'quick-actions-overlay';
            
            const statusClass = `status-${container.status || 'registered'}`;
            const statusLabels = {
                registered: 'Registrato',
                in_transit: 'In Transito',
                arrived: 'Arrivato',
                customs_cleared: 'Sdoganato',
                delivered: 'Consegnato'
            };
            
            overlay.innerHTML = `
                <div class="quick-actions-modal">
                    <div class="quick-actions-header">
                        <h3>🚢 Container Già Presente</h3>
                        <button class="quick-close" onclick="this.closest('.quick-actions-overlay').remove()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="container-info">
                        <div class="info-main">
                            <span class="container-number">${container.trackingNumber}</span>
                            <span class="container-status ${statusClass}">
                                ${statusLabels[container.status] || container.status}
                            </span>
                        </div>
                        
                        <div class="info-row">
                            <span class="info-label">Vettore:</span>
                            <span class="info-value">${container.carrier || '-'}</span>
                        </div>
                        
                        <div class="info-row">
                            <span class="info-label">Origine:</span>
                            <span class="info-value">${container.origin || '-'}</span>
                        </div>
                        
                        <div class="info-row">
                            <span class="info-label">Destinazione:</span>
                            <span class="info-value">${container.destination || '-'}</span>
                        </div>
                        
                        <div class="info-row">
                            <span class="info-label">Riferimento:</span>
                            <span class="info-value">${container.reference || '-'}</span>
                        </div>
                    </div>
                    
                    <div class="quick-actions">
                        <h4>Azioni Rapide</h4>
                        <div class="action-buttons-grid">
                            <button class="action-btn primary" onclick="QuickContainerActions.viewDetails('${container.id}')">
                                <i class="fas fa-eye"></i>
                                <span>Visualizza Dettagli</span>
                            </button>
                            
                            <button class="action-btn" onclick="QuickContainerActions.updateStatus('${container.id}')">
                                <i class="fas fa-sync"></i>
                                <span>Aggiorna Stato</span>
                            </button>
                            
                            <button class="action-btn" onclick="QuickContainerActions.viewEvents('${container.id}')">
                                <i class="fas fa-history"></i>
                                <span>Timeline Eventi</span>
                            </button>
                            
                            <button class="action-btn" onclick="QuickContainerActions.addNote('${container.id}')">
                                <i class="fas fa-sticky-note"></i>
                                <span>Aggiungi Nota</span>
                            </button>
                        </div>
                    </div>
                    
                    <div class="last-update">
                        Ultimo aggiornamento: ${new Date(container.updatedAt || container.createdAt).toLocaleString('it-IT')}
                    </div>
                </div>
            `;
            
            document.body.appendChild(overlay);
            setTimeout(() => overlay.classList.add('active'), 10);
        },
        
        viewDetails(containerId) {
            // Close modal and navigate to details
            document.querySelector('.quick-actions-overlay').remove();
            closeCustomModal();
            if (window.location.pathname !== '/tracking-details.html') {
                window.location.href = `/tracking-details.html?id=${containerId}`;
            }
        },
        
        updateStatus(containerId) {
            // Trigger status update
            document.querySelector('.quick-actions-overlay').remove();
            if (window.trackingService) {
                window.trackingService.forceUpdate(containerId);
            }
        },
        
        viewEvents(containerId) {
            // Show events timeline
            document.querySelector('.quick-actions-overlay').remove();
            closeCustomModal();
            if (window.EventsViewer) {
                window.EventsViewer.show(containerId);
            }
        },
        
        addNote(containerId) {
            // Show note dialog
            document.querySelector('.quick-actions-overlay').remove();
            if (window.NotesManager) {
                window.NotesManager.showAddNote(containerId);
            }
        }
    };
    
    // ========================================
    // ESPOSIZIONE GLOBALE DELLE FUNZIONI MANCANTI
    // ========================================
    
    // 1. CREA E ESPONI showWorkflowProgress
    window.showWorkflowProgress = function(options = {}) {
        console.log('🚀 showWorkflowProgress called with:', options);
        
        // Se options contiene steps, crea un workflow personalizzato
        if (options.steps) {
            const overlay = document.createElement('div');
            overlay.className = 'workflow-modal-overlay';
            overlay.innerHTML = `
                <div class="workflow-modal">
                    <h3>${options.title || '🚀 Elaborazione in corso'}</h3>
                    <div class="workflow-container">
                        ${options.steps.map((step, index) => `
                            <div class="workflow-step" data-step="${index}">
                                <div class="step-icon">${step.icon || '📋'}</div>
                                <div class="step-content">
                                    <h4>${step.title}</h4>
                                    <p>${step.description || ''}</p>
                                    <span class="step-status ${index === 0 ? 'pending' : 'waiting'}">
                                        ${index === 0 ? 'In corso...' : 'In attesa'}
                                    </span>
                                </div>
                            </div>
                            ${index < options.steps.length - 1 ? '<div class="workflow-arrow">→</div>' : ''}
                        `).join('')}
                    </div>
                    <div class="workflow-result" style="display: none;"></div>
                </div>
            `;
            
            document.body.appendChild(overlay);
            setTimeout(() => overlay.classList.add('active'), 10);
            
            // Ritorna oggetto controller
            return {
                updateStep: (stepIndex, status, statusText) => {
                    updateWorkflowStep(stepIndex, status, statusText);
                },
                showResult: (success, message) => {
                    showWorkflowResult(success, message);
                },
                close: () => {
                    overlay.classList.remove('active');
                    setTimeout(() => overlay.remove(), 300);
                }
            };
        } else {
            // Comportamento default - mostra il workflow standard
            showWorkflowModal();
            return {
                updateStep: updateWorkflowStep,
                showResult: showWorkflowResult,
                close: closeAllModals
            };
        }
    };

    // 2. CREA E ESPONI TrackingErrorHandler
    window.TrackingErrorHandler = class {
        constructor() {
            console.log('✅ TrackingErrorHandler initialized');
        }
        
        static show(error) {
            console.log('🔴 TrackingErrorHandler.show called with:', error);
            
            // Mappa errori comuni
            const errorMapping = {
                'ALREADY_EXISTS': {
                    title: 'Container già presente',
                    message: 'Questo container è già stato registrato nel sistema.',
                    type: 'warning',
                    actions: [
                        { 
                            label: 'Visualizza Container', 
                            action: () => {
                                if (error.containerId) {
                                    window.location.href = `/tracking-details.html?id=${error.containerId}`;
                                }
                            }
                        }
                    ]
                },
                'RATE_LIMIT': {
                    title: 'Limite richieste raggiunto',
                    message: 'Hai raggiunto il limite di richieste API. Riprova tra qualche minuto.',
                    type: 'warning'
                },
                'INVALID_FORMAT': {
                    title: 'Formato non valido',
                    message: error.message || 'Il formato del tracking number non è valido.',
                    type: 'error',
                    details: error.expectedFormat
                },
                'API_ERROR': {
                    title: 'Errore API',
                    message: error.message || 'Si è verificato un errore durante la comunicazione con il server.',
                    type: 'error'
                }
            };
            
            const errorConfig = errorMapping[error.code] || {
                title: error.title || 'Errore',
                message: error.message || 'Si è verificato un errore imprevisto.',
                type: error.type || 'error'
            };
            
            // Crea modal errore
            const overlay = document.createElement('div');
            overlay.className = 'error-modal-overlay';
            
            const iconMap = {
                info: 'fa-info-circle',
                warning: 'fa-exclamation-triangle',
                error: 'fa-exclamation-circle'
            };
            
            overlay.innerHTML = `
                <div class="error-modal ${errorConfig.type}">
                    <div class="error-icon">
                        <i class="fas ${iconMap[errorConfig.type]}"></i>
                    </div>
                    <div class="error-content">
                        <h3>${errorConfig.title}</h3>
                        <p>${errorConfig.message}</p>
                        ${errorConfig.details ? `
                            <div class="error-details">
                                ${errorConfig.details}
                            </div>
                        ` : ''}
                    </div>
                    <div class="error-actions">
                        ${errorConfig.actions ? errorConfig.actions.map(action => `
                            <button class="error-action-btn" data-action="${action.label}">
                                ${action.label}
                            </button>
                        `).join('') : ''}
                        <button class="error-close-btn">Chiudi</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(overlay);
            setTimeout(() => overlay.classList.add('active'), 10);
            
            // Gestisci click sui bottoni
            overlay.querySelector('.error-close-btn').onclick = () => {
                overlay.classList.remove('active');
                setTimeout(() => overlay.remove(), 300);
            };
            
            // Gestisci azioni custom
            if (errorConfig.actions) {
                errorConfig.actions.forEach(action => {
                    const btn = overlay.querySelector(`[data-action="${action.label}"]`);
                    if (btn) {
                        btn.onclick = () => {
                            action.action();
                            overlay.remove();
                        };
                    }
                });
            }
        }
        
        static showValidationError(field, message) {
            console.log('🟡 Validation error:', field, message);
            const input = document.getElementById(field);
            if (input) {
                input.classList.add('error');
                input.focus();
                
                // Mostra messaggio inline
                let errorEl = input.parentElement.querySelector('.field-error');
                if (!errorEl) {
                    errorEl = document.createElement('div');
                    errorEl.className = 'field-error';
                    input.parentElement.appendChild(errorEl);
                }
                errorEl.textContent = message;
                
                // Rimuovi errore dopo 5 secondi
                setTimeout(() => {
                    input.classList.remove('error');
                    errorEl.remove();
                }, 5000);
            }
        }
        
        static clearErrors() {
            document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
            document.querySelectorAll('.field-error').forEach(el => el.remove());
        }
    };

    // 3. LOG di conferma
    console.log('✅ PROGRESSIVE FORM: Funzioni esposte globalmente');
    console.log('   - window.showWorkflowProgress:', typeof window.showWorkflowProgress);
    console.log('   - window.TrackingErrorHandler:', typeof window.TrackingErrorHandler);
    console.log('   - window.QuickContainerActions:', typeof window.QuickContainerActions);
    console.log('   - window.showEnhancedTrackingForm:', typeof window.showEnhancedTrackingForm);
    
})();