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
    
    // Sistema completo per gestione airlines con auto-detection
    // 1. CACHE AIRLINES (all'inizio del file, dopo 'use strict')
    let airlinesCache = null;
    let airlinesCacheTime = 0;
    const AIRLINES_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 ore
    
    // 2. CARICA AIRLINES DA LOCALSTORAGE ALL'AVVIO
    function loadAirlinesFromStorage() {
        try {
            const cached = localStorage.getItem('airlinesCache');
            if (cached) {
                const data = JSON.parse(cached);
                if (data.timestamp && (Date.now() - data.timestamp) < AIRLINES_CACHE_TTL) {
                    airlinesCache = data.data;
                    airlinesCacheTime = data.timestamp;
                    console.log('✅ Airlines caricate da localStorage:', airlinesCache.length);
                }
            }
        } catch (e) {
            console.error('Errore caricamento cache airlines:', e);
        }
    }
    
    // 3. RILEVA AIRLINE DAL PREFISSO AWB
    function detectAirlineFromAWB(awbNumber) {
        // Estrai il prefisso (primi 3 numeri)
        const match = awbNumber.match(/^(\d{3})-?(\d{8})$/);
        if (!match) return null;
        
        const prefix = match[1];
        console.log('🔍 Ricerca airline per prefisso:', prefix);
        
        // Cerca nella cache delle airlines
        if (airlinesCache && airlinesCache.length > 0) {
            const airline = airlinesCache.find(a => 
                a.prefixes && a.prefixes.includes(prefix)
            );
            
            if (airline) {
                console.log('✅ Airline auto-rilevata:', airline.name, '(' + airline.code + ')');
                return {
                    code: airline.code,
                    name: airline.name,
                    confidence: 'high'
                };
            }
        }
        
        console.log('⚠️ Nessuna airline trovata per prefisso:', prefix);
        return null;
    }
    
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
    
    function showEnhancedTrackingForm(options = {}) {
        console.log('🚀 PROGRESSIVE FORM: Creating custom full-width modal');
        
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
                position: relative !important;
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

    function renderFullWidthForm() {
        return `
            <div class="fullwidth-form-wrapper">
                <div class="integrated-tabs">
                    <button class="integrated-tab active" data-target="single">
                        <i class="fas fa-plus"></i> Tracking Singolo
                    </button>
                    <button class="integrated-tab" data-target="import">
                        <i class="fas fa-upload"></i> Import Multiplo
                    </button>
                </div>
                
                <div class="tab-content active" data-tab="single">
                    <form id="enhancedSingleForm" class="optimized-fullwidth-form">
                        
                        <div class="optimized-grid">
                            
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
                            
                            <div class="form-card details-card">
                                <div class="card-header">
                                    <h3><i class="fas fa-cog"></i> Dettagli & Geografia</h3>
                                </div>
                                <div class="card-body">
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
                
                <div class="tab-content" data-tab="import">
                    <div class="import-fullwidth">
                        <div class="import-layout-new">
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
            
            ${getFormStyles()}
        `;
    }

    function getFormStyles() {
        return `
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
                height: 100%;
                overflow: hidden;
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
            
            /* Footer integrato - FIXED POSITION */
            .integrated-footer {
                background: #f8f9fa;
                border-top: 1px solid #e9ecef;
                padding: 15px 30px;
                margin: 15px -30px 0 -30px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-shrink: 0;
                position: sticky;
                bottom: 0;
                z-index: 100;
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
            
            /* WORKFLOW MODAL STYLES */
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
            
            /* ERROR MODAL STYLES */
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