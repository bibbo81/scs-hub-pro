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
            
            .error-action-btn:hover {background: #0056b3;
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

           /* API Operation Selector Styles */
           .api-operation-selector {
               background: rgba(255,255,255,0.1);
               border-radius: 8px;
               padding: 16px;
               margin-bottom: 16px;
               margin-top: -10px;
           }

           .api-operation-selector h5 {
               font-size: 13px;
               font-weight: 600;
               color: white;
               margin: 0 0 12px 0;
               text-transform: uppercase;
               letter-spacing: 0.5px;
           }

           .operation-radio-group {
               display: flex;
               gap: 12px;
               flex-wrap: wrap;
           }

           .operation-radio {
               position: relative;
               flex: 1;
               min-width: 100px;
           }

           .operation-radio input[type="radio"] {
               position: absolute;
               opacity: 0;
           }

           .operation-radio label {
               display: block;
               padding: 10px 16px;
               background: rgba(255,255,255,0.2);
               border: 2px solid rgba(255,255,255,0.3);
               border-radius: 6px;
               cursor: pointer;
               transition: all 0.3s;
               text-align: center;
               font-size: 12px;
               font-weight: 500;
               color: rgba(255,255,255,0.9);
           }

           .operation-radio input[type="radio"]:checked + label {
               background: rgba(40, 167, 69, 0.3);
               border-color: rgba(40, 167, 69, 0.8);
               color: white;
           }

           .operation-radio label:hover {
               background: rgba(255,255,255,0.3);
               border-color: rgba(255,255,255,0.5);
           }

           .operation-radio label small {
               display: block;
               font-size: 9px;
               opacity: 0.8;
               margin-top: 2px;
           }
           
           /* AWB ID Badge styles */
           .awb-id-badge {
               background: #28a745;
               color: white;
               padding: 4px 12px;
               border-radius: 4px;
               font-size: 12px;
               margin-top: 8px;
               display: inline-block;
           }
           
           /* Aggiungi questo CSS per l'animazione fadeIn */
           @keyframes fadeIn {
               from {
                   opacity: 0;
                   transform: translateY(-5px);
               }
               to {
                   opacity: 1;
                   transform: translateY(0);
               }
           }
           
           .id-usage-info {
               animation: fadeIn 0.3s ease;
           }
           
           /* Stile per il testo strong nell'info */
           .id-usage-info strong {
               color: #28a745;
               font-weight: 600;
               font-size: 13px;
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
       
       // ============================================
       // AGGIUNGI QUI IL VISUAL FEEDBACK PER API OPERATION
       // ============================================
       
       // Listener per i radio button delle operazioni API
       document.querySelectorAll('input[name="api_operation"]').forEach(radio => {
           radio.addEventListener('change', (e) => {
               const operation = e.target.value;
               const trackingType = document.getElementById('enh_trackingType').value;
               
               // Rimuovi info precedente
               const existingInfo = document.querySelector('.id-usage-info');
               if (existingInfo) existingInfo.remove();
               
               // Se è AWB e abbiamo un ID rilevato, mostra info
               if (trackingType === 'awb' && window.detectedAwbId && (operation === 'get' || operation === 'auto')) {
                   const operationSelector = document.querySelector('.api-operation-selector');
                   if (operationSelector) {
                       // Crea elemento info
                       const infoDiv = document.createElement('div');
                       infoDiv.className = 'id-usage-info';
                       infoDiv.style.cssText = `
                           background: rgba(40, 167, 69, 0.2);
                           border: 1px solid rgba(40, 167, 69, 0.5);
                           border-radius: 4px;
                           padding: 8px 12px;
                           margin-top: 8px;
                           font-size: 12px;
                           color: white;
                           display: flex;
                           align-items: center;
                           gap: 8px;
                           animation: fadeIn 0.3s ease;
                       `;
                       infoDiv.innerHTML = `
                           <i class="fas fa-check-circle" style="color: #28a745;"></i>
                           <span>Userò l'ID ShipsGo <strong>${window.detectedAwbId}</strong> per recuperare i dati</span>
                       `;
                       operationSelector.appendChild(infoDiv);
                   }
               }
           });
       });
       
       // Aggiungi anche un listener per quando cambia il tipo di tracking
       typeSelect.addEventListener('change', () => {
           // Rimuovi info se non è più AWB
           if (typeSelect.value !== 'awb') {
               const existingInfo = document.querySelector('.id-usage-info');
               if (existingInfo) existingInfo.remove();
           }
       });
       
       // ============================================
       // FINE VISUAL FEEDBACK
       // ============================================
       
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
   
   // PASSO 2: Aggiungi le nuove funzioni UI dopo showDetectionError()
   function showAWBIdSearching() {
       const statusEl = document.querySelector('.detection-status');
       if (statusEl) {
           statusEl.innerHTML = `
               <i class="fas fa-circle-notch fa-spin status-icon" style="color: #007bff;"></i>
               <span class="status-text">Ricerca ShipsGo ID...</span>
           `;
       }
   }
   
   function showAWBIdFound(shipsgoId) {
       const statusEl = document.querySelector('.detection-status');
       if (statusEl) {
           statusEl.innerHTML = `
               <i class="fas fa-check-circle status-icon" style="color: #28a745;"></i>
               <span class="status-text">✈️ AWB trovato - ID: ${shipsgoId}</span>
           `;
       }
       
       // Aggiungi anche un badge visibile sotto l'input
       const inputWrapper = document.querySelector('.main-input-wrapper');
       const existingBadge = inputWrapper.querySelector('.awb-id-badge');
       if (existingBadge) existingBadge.remove();
       
       const badge = document.createElement('div');
       badge.className = 'awb-id-badge';
       badge.style.cssText = `
           background: #28a745;
           color: white;
           padding: 4px 12px;
           border-radius: 4px;
           font-size: 12px;
           margin-top: 8px;
           display: inline-block;
       `;
       badge.innerHTML = `<i class="fas fa-database"></i> ShipsGo ID: ${shipsgoId}`;
       inputWrapper.appendChild(badge);
   }
   
   function showAWBIdNotFound() {
       const statusEl = document.querySelector('.detection-status');
       if (statusEl) {
           statusEl.innerHTML = `
               <i class="fas fa-info-circle status-icon" style="color: #ffc107;"></i>
               <span class="status-text">✈️ AWB rilevato (nuovo in ShipsGo)</span>
           `;
       }
   }
   
   function showAWBIdError() {
       const statusEl = document.querySelector('.detection-status');
       if (statusEl) {
           statusEl.innerHTML = `
               <i class="fas fa-exclamation-triangle status-icon" style="color: #dc3545;"></i>
               <span class="status-text">Errore ricerca ID</span>
           `;
       }
   }
   
   async function detectAndUpdateType(trackingNumber) {
       // Simple detection logic
       let type = 'unknown';
       let carrier = '';
       
       if (/^[A-Z]{4}\d{7}$/.test(trackingNumber)) {
           type = 'container';
           if (trackingNumber.startsWith('MSKU')) carrier = 'MSK';
           else if (trackingNumber.startsWith('GESU')) carrier = 'MSC';
           else if (trackingNumber.startsWith('HLCU')) carrier = 'HAPAG-LLOYD';
       } else if (/^\d{3}-?\d{8}$/.test(trackingNumber)) {
           type = 'awb';
           
           // AUTO-DETECT AIRLINE DAL PREFISSO!
           const detectedAirline = detectAirlineFromAWB(trackingNumber);
           if (detectedAirline) {
               carrier = detectedAirline.code;
               
               // Mostra info visuale dell'airline rilevata
               showDetectionResult(type, `${detectedAirline.code} - ${detectedAirline.name}`);
           } else {
               showDetectionResult(type, null);
           }
       } else if (/^[A-Z]{2}\d{6,}$/.test(trackingNumber)) {
           type = 'bl';
       }
       
       if (type !== 'unknown') {
           // Auto-update form fields
           document.getElementById('enh_trackingType').value = type;
           await updateCarrierWithShipsGoData(type);
           
           // Auto-select carrier se rilevato
           if (carrier) {
               setTimeout(() => {
                   const select = document.getElementById('enh_carrier');
                   if (select && select.querySelector(`option[value="${carrier}"]`)) {
                       select.value = carrier;
                       console.log('✈️ Airline auto-selezionata:', carrier);
                       
                       // Aggiungi visual feedback
                       select.style.borderColor = '#28a745';
                       setTimeout(() => {
                           select.style.borderColor = '';
                       }, 2000);
                   }
               }, 300);
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
       
       // PASSO 3: NUOVO - Se è un AWB, cerca automaticamente lo shipsgo_id
       if (type === 'awb' && window.trackingService) {
           console.log('🔍 Ricerca automatica ShipsGo ID per AWB:', trackingNumber);
           
           try {
               // Mostra indicatore di caricamento
               showAWBIdSearching();
               
               // Cerca l'AWB nella lista ShipsGo
               const awbList = await window.trackingService.getAirShipmentsList();
               const foundAwb = awbList.find(awb => 
                   awb.awb_number === trackingNumber.toUpperCase() ||
                   awb.awbNumber === trackingNumber.toUpperCase()
               );
               
               if (foundAwb && foundAwb.id) {
                   console.log('✅ AWB trovato con ID:', foundAwb.id);
                   
                   // Salva l'ID in memoria
                   window.detectedAwbId = foundAwb.id;
                   
                   // Mostra l'ID nell'interfaccia
                   showAWBIdFound(foundAwb.id);
                   
                   // Pre-compila altri campi se disponibili
                   if (foundAwb.status) {
                       const statusMap = {
                           'DELIVERED': 'delivered',
                           'IN PROGRESS': 'in_transit',
                           'INPROGRESS': 'in_transit',
                           'REGISTERED': 'registered',
                           'PENDING': 'registered'
                       };
                       const mappedStatus = statusMap[foundAwb.status?.toUpperCase()] || 'registered';
                       document.getElementById('enh_status').value = mappedStatus;
                   }
                   if (foundAwb.route?.origin?.location?.iata) {
                       document.getElementById('enh_origin').value = foundAwb.route.origin.location.iata;
                   }
                   if (foundAwb.route?.destination?.location?.iata) {
                       document.getElementById('enh_destination').value = foundAwb.route.destination.location.iata;
                   }
                   if (foundAwb.reference) {
                       document.getElementById('enh_reference').value = foundAwb.reference;
                   }
               } else {
                   console.log('⚠️ AWB non trovato in ShipsGo');
                   showAWBIdNotFound();
                   window.detectedAwbId = null;
               }
           } catch (error) {
               console.error('❌ Errore nella ricerca AWB ID:', error);
               showAWBIdError();
               window.detectedAwbId = null;
           }
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
   // Gestisci sia oggetti che stringhe
   carriers = result.data.map(line => {
       if (typeof line === 'string') {
           // Se è una stringa, usa la stringa sia come code che come name
           return {
               code: line,
               name: line
           };
       } else {
           // Se è un oggetto, usa i campi appropriati
           return {
               code: line.ShippingLineCode || line.Code || line,
               name: line.ShippingLineName || line.Name || line
           };
       }
   });
}
               } else if (type === 'awb') {
                   // Controlla cache
                   const now = Date.now();
                   if (airlinesCache && (now - airlinesCacheTime) < AIRLINES_CACHE_TTL) {
                       console.log('📋 Usando airlines dalla cache');
                       carriers = airlinesCache;
                   } else {
                       console.log('🔄 Caricamento airlines da API...');
                       
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
                       
                       if (result.success && result.data) {
                           // La struttura è { message, airlines, meta }
                           const airlinesArray = result.data.airlines || result.data;
                           
                           if (Array.isArray(airlinesArray)) {
                               carriers = airlinesArray.map(airline => ({
                                   code: airline.iata,         // IATA code
                                   name: airline.name,          // Nome compagnia
                                   prefixes: airline.prefixes || [], // Prefissi AWB
                                   status: airline.status       // ACTIVE/PASSIVE
                               })).filter(a => a.status === 'ACTIVE'); // Solo airlines attive
                               
                               // Salva in cache
                               airlinesCache = carriers;
                               airlinesCacheTime = now;
                               
                               // Salva in localStorage
                               try {
                                   localStorage.setItem('airlinesCache', JSON.stringify({
                                       data: carriers,
                                       timestamp: now
                                   }));
                               } catch (e) {
                                   console.error('Errore salvataggio cache:', e);
                               }
                               
                               console.log(`✅ Caricate ${carriers.length} airlines attive con prefissi`);
                           }
                       }
                   }
               }
               
               // Riabilita select
               select.disabled = false;
               select.innerHTML = '<option value="">Seleziona vettore...</option>';
               
               // Aggiungi opzioni
               if (carriers.length > 0) {
                   // Ordina alfabeticamente
                   carriers = carriers.filter(c => c && (c.name || c.code));
carriers.sort((a, b) => {
   const nameA = (a.name || a.code || '').toString();
   const nameB = (b.name || b.code || '').toString();
   return nameA.localeCompare(nameB);
});
                   
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
   
   // AGGIUNGI QUESTE FUNZIONI HELPER PRIMA di finalData
   const AIRPORT_TO_COUNTRY = {
       // Cina
       'PEK': { name: 'CHINA', code: 'CN' },
       'PVG': { name: 'CHINA', code: 'CN' },
       'CAN': { name: 'CHINA', code: 'CN' },
       'HKG': { name: 'HONG KONG', code: 'HK' },
       
       // Italia
       'FCO': { name: 'ITALY', code: 'IT' },
       'MXP': { name: 'ITALY', code: 'IT' },
       'VCE': { name: 'ITALY', code: 'IT' },
       'NAP': { name: 'ITALY', code: 'IT' },
       'BGY': { name: 'ITALY', code: 'IT' },
       'LIN': { name: 'ITALY', code: 'IT' },
       
       // USA
       'JFK': { name: 'UNITED STATES', code: 'US' },
       'LAX': { name: 'UNITED STATES', code: 'US' },
       'ORD': { name: 'UNITED STATES', code: 'US' },
       'MIA': { name: 'UNITED STATES', code: 'US' },
       'ATL': { name: 'UNITED STATES', code: 'US' },
       
       // Europa
       'CDG': { name: 'FRANCE', code: 'FR' },
       'ORY': { name: 'FRANCE', code: 'FR' },
       'FRA': { name: 'GERMANY', code: 'DE' },
       'MUC': { name: 'GERMANY', code: 'DE' },
       'LHR': { name: 'UNITED KINGDOM', code: 'GB' },
       'LGW': { name: 'UNITED KINGDOM', code: 'GB' },
       'AMS': { name: 'NETHERLANDS', code: 'NL' },
       'MAD': { name: 'SPAIN', code: 'ES' },
       'BCN': { name: 'SPAIN', code: 'ES' },
       'LUX': { name: 'LUXEMBOURG', code: 'LU' },
       'BRU': { name: 'BELGIUM', code: 'BE' },
       'ZRH': { name: 'SWITZERLAND', code: 'CH' },
       'VIE': { name: 'AUSTRIA', code: 'AT' },
       
       // Asia
       'NRT': { name: 'JAPAN', code: 'JP' },
       'KIX': { name: 'JAPAN', code: 'JP' },
       'ICN': { name: 'SOUTH KOREA', code: 'KR' },
       'SIN': { name: 'SINGAPORE', code: 'SG' },
       'BKK': { name: 'THAILAND', code: 'TH' },
       'KUL': { name: 'MALAYSIA', code: 'MY' },
       'CGK': { name: 'INDONESIA', code: 'ID' },
       'DEL': { name: 'INDIA', code: 'IN' },
       'BOM': { name: 'INDIA', code: 'IN' },
       'DXB': { name: 'UNITED ARAB EMIRATES', code: 'AE' },
       'DOH': { name: 'QATAR', code: 'QA' },
       'IST': { name: 'TURKEY', code: 'TR' },
       
       // Altri
       'SYD': { name: 'AUSTRALIA', code: 'AU' },
       'MEL': { name: 'AUSTRALIA', code: 'AU' },
       'AKL': { name: 'NEW ZEALAND', code: 'NZ' },
       'JNB': { name: 'SOUTH AFRICA', code: 'ZA' },
       'CPT': { name: 'SOUTH AFRICA', code: 'ZA' },
       'CAI': { name: 'EGYPT', code: 'EG' },
       'GRU': { name: 'BRAZIL', code: 'BR' },
       'MEX': { name: 'MEXICO', code: 'MX' },
       'YYZ': { name: 'CANADA', code: 'CA' },
       'YVR': { name: 'CANADA', code: 'CA' }
   };

   function getCountryFromAirport(airportCode) {
       if (!airportCode) return { name: '-', code: '-' };
       return AIRPORT_TO_COUNTRY[airportCode.toUpperCase()] || { name: '-', code: '-' };
   }

   function formatDateDDMMYYYY(dateString) {
       if (!dateString || dateString === '-') return '-';
       try {
           const date = new Date(dateString);
           if (isNaN(date.getTime())) return '-';
           
           const day = date.getDate().toString().padStart(2, '0');
           const month = (date.getMonth() + 1).toString().padStart(2, '0');
           const year = date.getFullYear();
           return `${day}/${month}/${year}`;
       } catch (e) {
           return '-';
       }
   }

// Aggiungi questa funzione PRIMA della sezione "async function processEnhancedTracking(formData)"
// Intorno alla riga 1050, dopo la funzione getCountryFromAirport

function extractCountryCode(portName) {
    if (!portName || portName === '-') return '-';
    
    // Mappa dei principali porti e i loro country codes
    const PORT_TO_COUNTRY = {
        // Italia
        'GENOVA': 'IT',
        'GENOA': 'IT',
        'LA SPEZIA': 'IT',
        'LASPEZIA': 'IT',
        'LIVORNO': 'IT',
        'NAPOLI': 'IT',
        'NAPLES': 'IT',
        'GIOIA TAURO': 'IT',
        'VENEZIA': 'IT',
        'VENICE': 'IT',
        'TRIESTE': 'IT',
        'RAVENNA': 'IT',
        'ANCONA': 'IT',
        'SALERNO': 'IT',
        'CIVITAVECCHIA': 'IT',
        
        // Cina
        'SHANGHAI': 'CN',
        'NINGBO': 'CN',
        'SHENZHEN': 'CN',
        'QINGDAO': 'CN',
        'TIANJIN': 'CN',
        'GUANGZHOU': 'CN',
        'XIAMEN': 'CN',
        'DALIAN': 'CN',
        'YANTIAN': 'CN',
        'HONG KONG': 'HK',
        'HONGKONG': 'HK',
        
        // USA
        'LOS ANGELES': 'US',
        'LOSANGELES': 'US',
        'LONG BEACH': 'US',
        'LONGBEACH': 'US',
        'NEW YORK': 'US',
        'NEWYORK': 'US',
        'NEWARK': 'US',
        'OAKLAND': 'US',
        'SAVANNAH': 'US',
        'HOUSTON': 'US',
        'CHARLESTON': 'US',
        'SEATTLE': 'US',
        'TACOMA': 'US',
        'MIAMI': 'US',
        'NORFOLK': 'US',
        
        // Europa
        'ROTTERDAM': 'NL',
        'ANTWERP': 'BE',
        'ANTWERPEN': 'BE',
        'HAMBURG': 'DE',
        'BREMEN': 'DE',
        'BREMERHAVEN': 'DE',
        'LE HAVRE': 'FR',
        'MARSEILLE': 'FR',
        'FOS': 'FR',
        'BARCELONA': 'ES',
        'VALENCIA': 'ES',
        'ALGECIRAS': 'ES',
        'BILBAO': 'ES',
        'FELIXSTOWE': 'GB',
        'SOUTHAMPTON': 'GB',
        'LONDON': 'GB',
        'LIVERPOOL': 'GB',
        'GDANSK': 'PL',
        'GDYNIA': 'PL',
        'CONSTANTA': 'RO',
        'PIRAEUS': 'GR',
        'LISBON': 'PT',
        'LISBOA': 'PT',
        'SINES': 'PT',
        
        // Asia
        'SINGAPORE': 'SG',
        'BUSAN': 'KR',
        'PUSAN': 'KR',
        'INCHEON': 'KR',
        'TOKYO': 'JP',
        'YOKOHAMA': 'JP',
        'KOBE': 'JP',
        'NAGOYA': 'JP',
        'KAOHSIUNG': 'TW',
        'KEELUNG': 'TW',
        'TAICHUNG': 'TW',
        'BANGKOK': 'TH',
        'LAEM CHABANG': 'TH',
        'PORT KLANG': 'MY',
        'PORTKLANG': 'MY',
        'TANJUNG PELEPAS': 'MY',
        'JAKARTA': 'ID',
        'SURABAYA': 'ID',
        'MANILA': 'PH',
        'HO CHI MINH': 'VN',
        'HOCHIMINH': 'VN',
        'HAI PHONG': 'VN',
        'HAIPHONG': 'VN',
        'MUMBAI': 'IN',
        'NHAVA SHEVA': 'IN',
        'CHENNAI': 'IN',
        'KOLKATA': 'IN',
        'COLOMBO': 'LK',
        
        // Medio Oriente
        'DUBAI': 'AE',
        'JEBEL ALI': 'AE',
        'JEBEL-ALI': 'AE',
        'ABU DHABI': 'AE',
        'SHARJAH': 'AE',
        'JEDDAH': 'SA',
        'DAMMAM': 'SA',
        'KUWAIT': 'KW',
        'DOHA': 'QA',
        'MUSCAT': 'OM',
        'SALALAH': 'OM',
        'HAIFA': 'IL',
        'ASHDOD': 'IL',
        'BEIRUT': 'LB',
        'ALEXANDRIA': 'EG',
        'PORT SAID': 'EG',
        'PORTSAID': 'EG',
        'DAMIETTA': 'EG',
        
        // Africa
        'DURBAN': 'ZA',
        'CAPE TOWN': 'ZA',
        'CAPETOWN': 'ZA',
        'PORT ELIZABETH': 'ZA',
        'MOMBASA': 'KE',
        'DAR ES SALAAM': 'TZ',
        'LAGOS': 'NG',
        'TEMA': 'GH',
        'ABIDJAN': 'CI',
        'CASABLANCA': 'MA',
        'TANGIER': 'MA',
        'TANGER MED': 'MA',
        
        // Sud America
        'SANTOS': 'BR',
        'RIO DE JANEIRO': 'BR',
        'PARANAGUA': 'BR',
        'ITAJAI': 'BR',
        'BUENOS AIRES': 'AR',
        'MONTEVIDEO': 'UY',
        'VALPARAISO': 'CL',
        'SAN ANTONIO': 'CL',
        'CALLAO': 'PE',
        'GUAYAQUIL': 'EC',
        'CARTAGENA': 'CO',
        'BUENAVENTURA': 'CO',
        'VERACRUZ': 'MX',
        'MANZANILLO': 'MX',
        'LAZARO CARDENAS': 'MX',
        
        // Oceania
        'SYDNEY': 'AU',
        'MELBOURNE': 'AU',
        'BRISBANE': 'AU',
        'FREMANTLE': 'AU',
        'ADELAIDE': 'AU',
        'AUCKLAND': 'NZ',
        'TAURANGA': 'NZ',
        'WELLINGTON': 'NZ',
        
        // Altri
        'MONTREAL': 'CA',
        'VANCOUVER': 'CA',
        'HALIFAX': 'CA',
        'PRINCE RUPERT': 'CA',
        'COLON': 'PA',
        'BALBOA': 'PA',
        'KINGSTON': 'JM',
        'FREEPORT': 'BS',
        'CAUCEDO': 'DO',
        'SAN JUAN': 'PR'
    };
    
    // Normalizza il nome del porto
    const normalizedPort = portName.trim().toUpperCase();
    
    // Cerca corrispondenza esatta
    if (PORT_TO_COUNTRY[normalizedPort]) {
        return PORT_TO_COUNTRY[normalizedPort];
    }
    
    // Cerca corrispondenza parziale
    for (const [port, code] of Object.entries(PORT_TO_COUNTRY)) {
        if (normalizedPort.includes(port) || port.includes(normalizedPort)) {
            return code;
        }
    }
    
    // Se non trova nulla, prova a estrarre dal formato "PORTO, PAESE"
    if (portName.includes(',')) {
        const parts = portName.split(',');
        if (parts.length >= 2) {
            const countryPart = parts[parts.length - 1].trim().toUpperCase();
            
            // Mappa dei nomi dei paesi ai codici
            const COUNTRY_NAME_TO_CODE = {
                'ITALY': 'IT',
                'ITALIA': 'IT',
                'CHINA': 'CN',
                'UNITED STATES': 'US',
                'USA': 'US',
                'GERMANY': 'DE',
                'GERMANIA': 'DE',
                'FRANCE': 'FR',
                'FRANCIA': 'FR',
                'SPAIN': 'ES',
                'SPAGNA': 'ES',
                'NETHERLANDS': 'NL',
                'OLANDA': 'NL',
                'BELGIUM': 'BE',
                'BELGIO': 'BE',
                'UNITED KINGDOM': 'GB',
                'UK': 'GB',
                'SINGAPORE': 'SG',
                'JAPAN': 'JP',
                'GIAPPONE': 'JP',
                'SOUTH KOREA': 'KR',
                'KOREA': 'KR',
                'COREA': 'KR',
                'BRAZIL': 'BR',
                'BRASILE': 'BR',
                'INDIA': 'IN',
                'AUSTRALIA': 'AU',
                'CANADA': 'CA',
                'MEXICO': 'MX',
                'MESSICO': 'MX'
            };
            
            if (COUNTRY_NAME_TO_CODE[countryPart]) {
                return COUNTRY_NAME_TO_CODE[countryPart];
            }
        }
    }
    
    // Default
    return '-';
}
   async function processEnhancedTracking(formData) {
       updateWorkflowStep(0, 'completed', 'Validato');
       
       let apiResponse = null; // Initialize apiResponse
       
       // If using API, fetch live data based on operation type
       if (formData.useApi && window.trackingService) {
           updateWorkflowStep(1, 'pending', 'Connessione API...');
           
           try {
               if (formData.apiOperation === 'get' || formData.apiOperation === 'auto') {
                   // Per GET: prima ottieni i dati, poi salvali
                   apiResponse = await window.trackingService.track(
                       formData.trackingNumber,
                       formData.trackingType,
                       { 
                           forceRefresh: true,
                           // NUOVO: Se è un AWB e abbiamo rilevato un ID, passalo
                           ...(formData.trackingType === 'awb' && window.detectedAwbId ? {
                               shipsgoId: window.detectedAwbId
                           } : {})
                       }
                   );
                   
                   // Log per debug
                   if (window.detectedAwbId && formData.trackingType === 'awb') {
                       console.log('🎯 GET con ID rilevato:', window.detectedAwbId);
                   }

                   // AGGIUNGI QUESTI LOG
                   console.log('📡 API Response:', apiResponse);
                   console.log('📡 API Success?', apiResponse?.success);
                   
                   // Dopo la chiamata API (riga ~1120)
                   if (apiResponse && apiResponse.success) {
                       console.log('🌐 API RESPONSE COMPLETA:', apiResponse);
                       console.log('📍 Route info:', apiResponse.route);
                       console.log('📅 Departure info:', {
                           routeOriginDate: apiResponse.route?.origin?.date,
                           departureDate: apiResponse.departureDate,
                           metadata: apiResponse.metadata
                       });
                   }
                   
                   if (apiResponse && apiResponse.success) {
                       console.log('✅ ENTRO nel mapping API');
                       // AGGIUNGI: Estrai departure date dagli eventi
                       // AGGIUNGI: Estrai departure date dagli eventi
let departureDate = '-';
if (apiResponse.events && Array.isArray(apiResponse.events)) {
   // Prima cerca "departed"
   let departureEvent = apiResponse.events.find(event =>
       event.description?.toLowerCase().includes('departed') ||
       event.event_type?.toLowerCase() === 'departure' ||
       event.activity?.toLowerCase().includes('departed')
   );
   
   // Se non trova "departed", usa "loaded on vessel"
   if (!departureEvent) {
       departureEvent = apiResponse.events.find(event =>
           event.description?.toLowerCase().includes('loaded on vessel') ||
           event.type === 'LOADED_ON_VESSEL'
       );
       if (departureEvent) {
           console.log('📦 Usando "loaded on vessel" come departure date');
       }
   }
   
   if (departureEvent) {
       departureDate = departureEvent.date || departureEvent.event_date || '-';
       console.log('📅 Departure date trovata:', departureDate);
   }
}

                       // Mappa i dati GET correttamente
                       const mappedData = {
                           trackingNumber: formData.trackingNumber,
                           trackingType: formData.trackingType || 'container',
                           carrier: apiResponse.carrier?.code || apiResponse.carrier?.name || formData.carrier || 'UNKNOWN', // FIX: era "ccarrier"
                           origin: apiResponse.route?.origin?.port || formData.origin || '-',
                           destination: apiResponse.route?.destination?.port || formData.destination || '-',
                           status: apiResponse.status || formData.status || 'registered',
                           reference: formData.reference || '-',
                           lastUpdate: apiResponse.lastUpdate || new Date().toISOString(),
                           events: apiResponse.events || [],
                           // AGGIUNGI: Salva anche i metadata
                           metadata: apiResponse.metadata || {},
                           vessel: apiResponse.vessel || null,
                           route: apiResponse.route || null,
                           departureDate: apiResponse.departureDate || null, // Aggiungi departureDate dall'API
                           bookingNumber: apiResponse.bookingNumber || null, // Aggiungi bookingNumber dall'API
                           
                           // AGGIUNGI QUESTI:
                           date_of_departure: departureDate,
                           departure_date: departureDate,
                           dateOfDeparture: departureDate,
                       };
                       
                       // Sostituisci formData con i data mappati
                       Object.assign(formData, mappedData);
                       updateWorkflowStep(1, 'completed', 'Dati recuperati');
                   } else if (formData.apiOperation === 'auto') {
                       // Se GET fallisce in modalità auto, prova POST
                       updateWorkflowStep(1, 'pending', 'Registrazione container...');
                       const postResponse = await window.trackingService.postContainer(
                           formData.trackingNumber,
                           formData.trackingType,
                           formData.carrier
                       );
                       
                       if (postResponse.success) {
                           updateWorkflowStep(1, 'completed', 'Container registrato');
                       } else {
                           updateWorkflowStep(1, 'completed', 'Dati manuali');
                       }
                   } else {
                       updateWorkflowStep(1, 'completed', 'Dati manuali');
                   }
               } else if (formData.apiOperation === 'post') {
                   // Solo POST
                   const postResponse = await window.trackingService.postContainer(
                       formData.trackingNumber,
                       formData.trackingType,
                       formData.carrier
                   );
                   
                   if (postResponse.success) {
                       updateWorkflowStep(1, 'completed', 'Container registrato');
                   } else {
                       throw new Error(postResponse.message || 'Errore nella registrazione');
                   }
               }
           } catch (error) {
               console.warn('API operation failed:', error);
               updateWorkflowStep(1, 'warning', 'API fallita, uso dati manuali');
           }
       } else {
           updateWorkflowStep(1, 'completed', 'Dati manuali');
       }
       
       // Save tracking with validated data
       updateWorkflowStep(2, 'pending', 'Salvataggio...');

       // DEBUG: Verifica cosa c'è in formData
       console.log('🔍 DEBUG formData PRIMA di finalData:', {
           date_of_loading: formData.date_of_loading,
           date_of_departure: formData.date_of_departure,
           departure_date: formData.departure_date,
           tutti_i_campi: Object.keys(formData)
       });
       
       // Assicurati che tutti i campi abbiano un valore valido
       const finalData = {
           // PASSO 4: Se è un AWB e abbiamo rilevato un ID, includiamolo nei metadata
           ...(formData.trackingType === 'awb' ? {
               // CAMPI BASE AWB
               airline: formData.carrier || apiResponse?.carrier?.code || 'UNKNOWN',
               awb_number: formData.trackingNumber,
               
               // DATE OF ARRIVAL
               date_of_arrival: (() => {
                   const arrivalDate = apiResponse?.route?.destination?.eta ||
                                       apiResponse?.metadata?.date_of_arrival ||
                                       apiResponse?.metadata?.raw?.route?.destination?.date_of_rcf ||
                                       formData.eta || '-';
                   return formatDateDDMMYYYY(arrivalDate);
               })(),
               
               // TRANSIT TIME (in ore come numero)
               transit_time: (() => {
                   const transitTime = apiResponse?.metadata?.transitTime ||
                                       apiResponse?.metadata?.transit_time ||
                                       apiResponse?.route?.transit_time || '-';
                   
                   // Se è un numero (probabilmente ore), mantienilo come numero
                   if (typeof transitTime === 'number') {
                       return transitTime;
                   }
                   // Se è una stringa con ore, estrai il numero
                   if (typeof transitTime === 'string' && transitTime.includes('hour')) {
                       const hours = parseInt(transitTime);
                       return isNaN(hours) ? '-' : hours;
                   }
                   return transitTime;
               })(),
               
               // ULTIMA POSIZIONE
               ultima_posizione: (() => {
                   // Prima cerca negli eventi
                   if (apiResponse?.events && apiResponse.events.length > 0) {
                       const lastEvent = apiResponse.events[0]; // Gli eventi sono ordinati dal più recente
                       if (lastEvent.location) return lastEvent.location;
                   }
                   
                   // Poi nei metadata
                   if (apiResponse?.metadata?.ultima_posizione) {
                       return apiResponse.metadata.ultima_posizione;
                   }
                   
                   // Poi nei movements raw
                   if (apiResponse?.metadata?.raw?.movements && apiResponse.metadata.raw.movements.length > 0) {
                       const lastMovement = apiResponse.metadata.raw.movements[0];
                       return lastMovement.location?.name || lastMovement.location?.iata || '-';
                   }
                   
                   return '-';
               })(),
               
               // ORIGIN E DESTINATION COUNTRY
               origin_country: (() => {
                   // Prima prova dall'API
                   if (apiResponse?.route?.origin?.country) {
                       return apiResponse.route.origin.country.toUpperCase();
                   }
                   
                   // Poi deriva dall'aeroporto usando la funzione getCountryFromAirport
                   const originPort = formData.origin || apiResponse?.route?.origin?.port || '-';
                   const countryInfo = getCountryFromAirport(originPort);
                   return countryInfo.name;
               })(),
               
               destination_country: (() => {
                   // Prima prova dall'API
                   if (apiResponse?.route?.destination?.country) {
                       return apiResponse.route.destination.country.toUpperCase();
                   }
                   
                   // Poi deriva dall'aeroporto usando la funzione getCountryFromAirport
                   const destPort = formData.destination || apiResponse?.route?.destination?.port || '-';
                   const countryInfo = getCountryFromAirport(destPort);
                   return countryInfo.name;
               })(),
               
               origin_country_code: (() => {
                   const originPort = formData.origin || apiResponse?.route?.origin?.port || '-';
                   const countryInfoAirport = getCountryFromAirport(originPort);
                   if (countryInfoAirport.code !== '-') return countryInfoAirport.code;
                   
                   // Se non trovato con IATA, prova con la nuova extractCountryCode per i porti marittimi
                   return extractCountryCode(originPort);
               })(),
               
               destination_country_code: (() => {
                   const destPort = formData.destination || apiResponse?.route?.destination?.port || '-';
                   const countryInfoAirport = getCountryFromAirport(destPort);
                   if (countryInfoAirport.code !== '-') return countryInfoAirport.code;
                   
                   // Se non trovato con IATA, prova con la nuova extractCountryCode per i porti marittimi
                   return extractCountryCode(destPort);
               })(),
               
               // DATE OF DEPARTURE
               date_of_departure: (() => {
                   // 1. Cerca negli eventi
                   if (apiResponse?.events && apiResponse.events.length > 0) {
                       const depEvent = apiResponse.events.find(e =>
                           e.type === 'DEP' ||
                           e.description?.toLowerCase().includes('departed')
                       );
                       if (depEvent && depEvent.date) {
                           return formatDateDDMMYYYY(depEvent.date);
                       }
                   }
                   
                   // 2. Cerca nella route
                   if (apiResponse?.route?.origin?.date) {
                       return formatDateDDMMYYYY(apiResponse.route.origin.date);
                   }
                   
                   // 3. Cerca nei raw movements
                   if (apiResponse?.metadata?.raw?.movements) {
                       const depMovement = apiResponse.metadata.raw.movements.find(m =>
                           m.event === 'DEP'
                       );
                       if (depMovement && depMovement.date) {
                           return formatDateDDMMYYYY(depMovement.date);
                       }
                   }
                   
                   // 4. Cerca nei metadata
                   if (apiResponse?.metadata?.departure_date) {
                       return formatDateDDMMYYYY(apiResponse.metadata.departure_date);
                   }
                   
                   // 5. Default: usa created date + 1 giorno
                   const createdDate = new Date();
                   createdDate.setDate(createdDate.getDate() - 1);
                   return formatDateDDMMYYYY(createdDate.toISOString());
               })(),
               
               // Campo departure per la tabella (alias di date_of_departure)
               departure: (() => {
                   // Stessa logica di date_of_departure
                   if (apiResponse?.events && apiResponse.events.length > 0) {
                       const depEvent = apiResponse.events.find(e =>
                           e.type === 'DEP' ||
                           e.description?.toLowerCase().includes('departed')
                       );
                       if (depEvent && depEvent.date) {
                           return formatDateDDMMYYYY(depEvent.date);
                       }
                   }
                   
                   if (apiResponse?.route?.origin?.date) {
                       return formatDateDDMMYYYY(apiResponse.route.origin.date);
                   }
                   
                   const createdDate = new Date();
                   createdDate.setDate(createdDate.getDate() - 1);
                   return formatDateDDMMYYYY(createdDate.toISOString());
               })(),
               
               // CONTAINER COUNT (per AWB è il numero di colli/pieces)
               container_count: (() => {
                   // Cerca pieces in vari posti
                   if (apiResponse?.package?.pieces) {
                       return apiResponse.package.pieces.toString();
                   }
                   if (apiResponse?.metadata?.pieces) {
                       return apiResponse.metadata.pieces.toString();
                   }
                   if (apiResponse?.metadata?.raw?.cargo?.pieces) {
                       return apiResponse.metadata.raw.cargo.pieces.toString();
                   }
                   
                   // Cerca negli eventi
                   if (apiResponse?.events && apiResponse.events.length > 0) {
                       const eventWithPieces = apiResponse.events.find(e => e.pieces);
                       if (eventWithPieces) {
                           return eventWithPieces.pieces.toString();
                       }
                   }
                   
                   // Default per AWB
                   return '1';
               })(),
               
               // Altri campi
               tags: formData.tags || '-',
               ts_count: '0', // AWB non hanno transhipment count come i container
               co2_emission: '-', // AWB non hanno CO2 emission
               booking: '-', // AWB non hanno booking come i container
               created_at_shipsgo: formatDateDDMMYYYY(new Date().toISOString()),
               ...(window.detectedAwbId ? {
                   metadata: {
                       ...formData.metadata,
                       shipsgo_id: window.detectedAwbId,
                       shipsgo_id_auto_detected: true
                   }
               } : {}),
           } : {}),
           
           // Prima includi TUTTI i campi mappati dall'API (se esistono)
           ...formData, // Usare formData che ora contiene i mappedData
           
           // Se abbiamo dati mappati nei metadata, estraili al livello principale
           ...(formData.metadata?.mapped || {}),
           
           // Campi critici con fallback
           tracking_number: formData.trackingNumber,
           tracking_type: formData.trackingType|| 'container',
           carrier: formData.carrier || formData.carrier_code || 'UNKNOWN',
           carrier_code: formData.carrier_code || formData.carrier || 'UNKNOWN',
           origin: formData.origin || formData.origin_port || '-',
           origin_port: formData.origin_port || formData.origin || '-',
           destination: formData.destination || formData.destination_port || '-',
           destination_port: formData.destination_port || formData.destination || '-',
           status: formData.status || 'registered',
           current_status: formData.current_status || formData.status || 'registered',
           
           // AGGIUNGI TUTTE LE VARIANTI DEI NOMI
           // Destination Country Code - tutte le varianti
           destination_country_code: extractCountryCode(formData.destination || formData.destination_port) || '-',
           destinationCountryCode: extractCountryCode(formData.destination || formData.destination_port) || '-',
           destination_country: apiResponse?.route?.destination?.country || '-',
           
           // Date of Departure - tutte le varianti
           date_of_departure: formData.date_of_loading || formData.date_of_departure || '-',
           dateOfDeparture: formData.date_of_loading || formData.dateOfDeparture || '-',
           departure_date: formData.date_of_loading || formData.departure_date || '-',

           // IMPORTANTE: Aggiungi questi campi specifici che la tabella cerca
           // La tabella cerca esattamente questi nomi di campo:
           departure: formatDateDDMMYYYY(formData.date_of_loading || formData.date_of_departure || formData.departure_date), // Per DATE OF DEPARTURE
           created_at: formatDateTime(new Date().toISOString()), // Per CREATED AT
           
           // Container Count - tutte le varianti
           container_count: '1', // Default sempre 1
           containerCount: '1',
           containers: '1',
           
           // Riferimento - tutte le varianti
           riferimento: formData.reference || '-',
           reference: formData.reference || '-',
           
           // Booking - tutte le varianti
           booking: apiResponse?.booking ||
                    apiResponse?.bookingNumber || '-',
           bookingNumber: apiResponse?.booking ||
                          apiResponse?.bookingNumber || '-',
           booking_number: apiResponse?.booking ||
                           apiResponse?.bookingNumber || '-',
           
           // Created At - tutte le varianti
           // created_at è già sovrascritto sopra per la tabella
           createdAt: new Date().toISOString(),
           created: new Date().toISOString(),
           
           // TS Count
           ts_count: '0',
           tsCount: '0',
           transhipmentCount: '0',
           
           // Timestamps
           updatedAt: new Date().toISOString(),
           updated_at: new Date().toISOString(),
           
           // Mantieni i dati strutturati
           metadata: formData.metadata || {},
           events: formData.events || [],
           vessel: formData.vessel || null,
           route: formData.route || null,
           lastUpdate: formData.lastUpdate || new Date().toISOString(),
           dataSource: formData.metadata?.source || 'manual',
           
           // ID univoco
           id: Date.now()
       };
       
       // PASSO 5: Pulisci la variabile globale dopo l'uso
       if (window.detectedAwbId) {
           console.log('🧹 Cleanup detectedAwbId:', window.detectedAwbId);
           window.detectedAwbId = null;
       }

       console.log('🔍 finalData includes these fields:', Object.keys(finalData).sort());
       console.log('✅ destination_country_code:', finalData.destination_country_code);
       console.log('✅ date_of_departure:', finalData.date_of_departure);
       console.log('✅ departure (for table):', finalData.departure); // Added for table
       console.log('✅ container_count:', finalData.container_count);
       console.log('✅ booking:', finalData.booking);
       console.log('✅ ts_count:', finalData.ts_count);
       console.log('✅ created_at (for table):', finalData.created_at); // Added for table

       if (!finalData.trackingNumber || finalData.trackingNumber === '-') {
           throw new Error('Tracking number mancante');
       } else {
           // Fallback to localStorage
           const trackings = JSON.parse(localStorage.getItem('trackings') || '[]');
           trackings.push({
               ...finalData,
               id: Date.now()
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
   
   // ESPONI FUNZIONI PER DEBUG
   window.updateCarrierWithShipsGoData = updateCarrierWithShipsGoData;
   window.detectTrackingType = detectTrackingType;
   window.processEnhancedTracking = processEnhancedTracking;
   console.log('✅ PROGRESSIVE FORM: Funzioni di debug esposte');
   console.log('   - window.updateCarrierWithShipsGoData:', typeof window.updateCarrierWithShipsGoData);
   console.log('   - window.detectTrackingType:', typeof window.detectTrackingType);
   
   // FIX 4: Debug helper per verificare l'ultimo tracking salvato
   window.debugLastTracking = function() {
       const trackings = JSON.parse(localStorage.getItem('trackings') || '[]');
       if (trackings.length > 0) {
           const lastTracking = trackings[trackings.length - 1];
           console.log('📦 Ultimo tracking salvato:', JSON.stringify(lastTracking, null, 2));
           console.log('🔍 Campi chiave:');
           console.log('  - carrier:', lastTracking.carrier);
           console.log('  - carrier_code:', lastTracking.carrier_code);
           console.log('  - metadata:', lastTracking.metadata);
           console.log('  - events:', lastTracking.events?.length || 0, 'eventi');
           console.log('  - dataSource:', lastTracking.dataSource);
           return lastTracking;
       } else {
           console.log('❌ Nessun tracking in localStorage');
           return null;
       }
   };

   // Aggiungi questa funzione di debug in tracking-form-progressive.js
   window.debugTableColumns = function() {
       // Recupera l'ultimo tracking
       const trackings = JSON.parse(localStorage.getItem('trackings') || '[]');
       const lastTracking = trackings[trackings.length - 1];
       
       console.log('🔍 DEBUG COLONNE MANCANTI:');
       console.log('=====================================');
       
       // Verifica destination country code
       console.log('📍 DESTINATION COUNTRY CODE:');
       console.log('  - destination_country_code:', lastTracking.destination_country_code);
       console.log('  - destinationCountryCode:', lastTracking.destinationCountryCode);
       console.log('  - destination:', lastTracking.destination);
       console.log('  - destination_port:', lastTracking.destination_port);
       
       // Verifica date of departure
       console.log('\n📅 DATE OF DEPARTURE:');
       console.log('  - date_of_departure:', lastTracking.date_of_departure);
       console.log('  - dateOfDeparture:', lastTracking.dateOfDeparture);
       console.log('  - departure_date:', lastTracking.departure_date);
       console.log('  - departureDate:', lastTracking.departureDate);
       console.log('  - departure (for table):', lastTracking.departure); // Check the new field
       
       // Verifica container count
       console.log('\n📦 CONTAINER COUNT:');
       console.log('  - container_count:', lastTracking.container_count);
       console.log('  - containerCount:', lastTracking.containerCount);
       console.log('  - containers:', lastTracking.containers);
       
       // Verifica riferimento
       console.log('\n📋 RIFERIMENTO:');
       console.log('  - riferimento:', lastTracking.riferimento);
       console.log('  - reference:', lastTracking.reference);
       
       // Verifica booking
       console.log('\n🎫 BOOKING:');
       console.log('  - booking:', lastTracking.booking);
       console.log('  - bookingNumber:', lastTracking.bookingNumber);
       console.log('  - booking_number:', lastTracking.booking_number);
       
       // Verifica created at
       console.log('\n🕐 CREATED AT:');
       console.log('  - created_at:', lastTracking.created_at);
       console.log('  - createdAt:', lastTracking.createdAt);
       console.log('  - created:', lastTracking.created);
       
       // Mostra TUTTI i campi disponibili
       console.log('\n📊 TUTTI I CAMPI DISPONIBILI:');
       console.log(Object.keys(lastTracking).sort());
       
       return lastTracking;
   };
   
   // 6. INIZIALIZZA AL CARICAMENTO
   document.addEventListener('DOMContentLoaded', () => {
       loadAirlinesFromStorage();
   });
})();