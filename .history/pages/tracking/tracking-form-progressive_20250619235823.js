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
                height: 85vh !important;
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
                background: rgba(255, 255, 255, 0.2) !important;
                border: 2px solid rgba(255, 255, 255, 0.3) !important;
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
                font-weight: 500;
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
            
            /* Form ottimizzato */
            .optimized-fullwidth-form {
                flex: 1;
                padding: 30px 30px 0 30px;
                display: flex;
                flex-direction: column;
                height: calc(100% - 60px);
            }
            
            /* Grid ottimizzato per 4 colonne invece di 5 */
            .optimized-grid {
                display: grid;
                grid-template-columns: 1.2fr 1.1fr 1fr 0.9fr;
                gap: 20px;
                flex: 1;
                margin-bottom: 24px;
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
            
            /* Footer integrato - SEMPRE VISIBILE */
            .integrated-footer {
                background: #f8f9fa;
                border-top: 1px solid #e9ecef;
                padding: 20px 30px;
                margin: 20px -30px 0 -30px;
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
        closeCustomModal();
        
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
            closeCustomModal();
            
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