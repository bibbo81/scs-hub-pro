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