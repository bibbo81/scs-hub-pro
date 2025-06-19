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
    
    // Attendi che il sistema sia pronto
   const initInterval = setInterval(() => {
    // Rimuovi notificationSystem dal check iniziale
    if (window.showAddTrackingForm && window.ModalSystem) {
        clearInterval(initInterval);
        initializeProgressiveEnhancement();
    }
}, 100);
    
    function initializeProgressiveEnhancement() {
            console.log('🟢 PROGRESSIVE FORM: Initializing enhancement');
            console.log('Current showAddTrackingForm:', window.showAddTrackingForm);

        // Salva funzione originale
        originalShowAddTrackingForm = window.showAddTrackingForm;
            console.log('Saved original:', originalShowAddTrackingForm);

        
        // Override con wrapper che decide quale versione usare
        window.showAddTrackingForm = function(options) {
            if (ENABLE_ENHANCED && isEnhancedReady()) {
                showEnhancedTrackingForm(options);
            } else {
                // Fallback al form originale
                originalShowAddTrackingForm(options);
            }
        };
        
        // Aggiungi toggle nelle impostazioni
        addEnhancedToggle();
        
        console.log('✅ [Progressive Enhancement] Tracking form wrapper installed');
    }
    
    function isEnhancedReady() {
        // Verifica che tutte le dipendenze siano caricate
        return !!(window.trackingService && window.ImportManager);
    }
    
    // ========================================
    // ENHANCED FORM - VERSIONE SEMPLIFICATA
    // ========================================
    
    function showEnhancedTrackingForm(options = {}) {
        // Usa il modal system esistente
        window.ModalSystem.show({
            title: '📦 Aggiungi Tracking',
            content: renderSimplifiedForm(),
            size: 'large',
            showFooter: false,
            className: 'enhanced-tracking-modal-v2'
        });
        
        // Setup dopo rendering
        setTimeout(() => {
            setupEnhancedInteractions();
            // Se ci sono opzioni (es. da import), precompila
            if (options.prefill) {
                prefillForm(options.prefill);
            }
        }, 100);
    }
    
    function renderSimplifiedForm() {
        return `
            <div class="enhanced-form-container">
                <!-- Tab Navigation -->
                <div class="form-tabs">
                    <button class="tab-btn active" data-tab="single">
                        <i class="fas fa-plus"></i> Singolo
                    </button>
                    <button class="tab-btn" data-tab="import">
                        <i class="fas fa-file-import"></i> Import Multiplo
                    </button>
                </div>
                
                <!-- Single Tracking Tab -->
                <div class="tab-content active" data-tab="single">
                    <form id="enhancedSingleForm" class="modern-form">
                        <!-- Smart Input con Auto-detection -->
                        <div class="form-section">
                            <h4>Tracking Information</h4>
                            
                            <div class="smart-input-group">
                                <label>Numero Tracking *</label>
                                <div class="input-with-detection">
                                    <input type="text" 
                                           id="enh_trackingNumber" 
                                           class="form-control" 
                                           placeholder="Es: MSKU1234567, 176-12345678"
                                           autocomplete="off"
                                           required>
                                    <div class="detection-indicator">
                                        <span class="detection-text"></span>
                                        <i class="fas fa-circle-notch fa-spin detection-spinner" style="display:none"></i>
                                    </div>
                                </div>
                                <div class="quick-examples">
                                    <span>Esempi:</span>
                                    <button type="button" class="example-btn" data-example="MSKU1234567">Container</button>
                                    <button type="button" class="example-btn" data-example="176-12345678">AWB</button>
                                </div>
                            </div>
                            
                            <div class="form-grid">
                                <div class="form-group">
                                    <label>Tipo Tracking</label>
                                    <select id="enh_trackingType" class="form-control">
                                        <option value="auto">Auto-detect</option>
                                        <option value="container">Container</option>
                                        <option value="awb">Air Waybill</option>
                                        <option value="bl">Bill of Lading</option>
                                        <option value="parcel">Parcel</option>
                                    </select>
                                </div>
                                
                                <div class="form-group">
                                    <label>Vettore</label>
                                    <select id="enh_carrier" class="form-control">
                                        <option value="">Seleziona...</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Shipping Details -->
                        <div class="form-section">
                            <h4>Dettagli Spedizione</h4>
                            
                            <div class="form-grid">
                                <div class="form-group">
                                    <label>Porto/Aeroporto Origine</label>
                                    <input type="text" 
                                           id="enh_origin" 
                                           class="form-control" 
                                           placeholder="Es: SHANGHAI, MXP">
                                </div>
                                
                                <div class="form-group">
                                    <label>Porto/Aeroporto Destinazione</label>
                                    <input type="text" 
                                           id="enh_destination" 
                                           class="form-control" 
                                           placeholder="Es: GENOVA, JFK">
                                </div>
                                
                                <div class="form-group">
                                    <label>Riferimento</label>
                                    <input type="text" 
                                           id="enh_reference" 
                                           class="form-control" 
                                           placeholder="Es: PO-2024-001">
                                </div>
                                
                                <div class="form-group">
                                    <label>Stato Iniziale</label>
                                    <select id="enh_status" class="form-control">
                                        <option value="registered">Registrato</option>
                                        <option value="in_transit">In Transito</option>
                                        <option value="arrived">Arrivato</option>
                                        <option value="customs_cleared">Sdoganato</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        
                        <!-- API Options -->
                        <div class="form-section api-section">
                            <div class="api-toggle">
                                <label>
                                    <input type="checkbox" id="enh_useApi" checked>
                                    <span>🔄 Recupera dati in tempo reale (API ShipsGo)</span>
                                </label>
                                <small class="text-muted">Disattiva per inserimento manuale</small>
                            </div>
                        </div>
                        
                        <!-- Form Actions -->
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" onclick="window.ModalSystem.closeAll()">
                                Annulla
                            </button>
                            <button type="submit" class="btn btn-primary" id="enhSubmitBtn">
                                <i class="fas fa-plus"></i> Aggiungi Tracking
                            </button>
                        </div>
                    </form>
                </div>
                
                <!-- Import Tab -->
                <div class="tab-content" data-tab="import">
                    <div class="import-container">
                        <div class="drag-drop-area" id="enhDropZone">
                            <i class="fas fa-cloud-upload-alt fa-3x"></i>
                            <h4>Trascina qui il file Excel/CSV</h4>
                            <p>oppure</p>
                            <button type="button" class="btn btn-primary" onclick="document.getElementById('enhFileInput').click()">
                                <i class="fas fa-folder-open"></i> Seleziona File
                            </button>
                            <input type="file" id="enhFileInput" accept=".xlsx,.xls,.csv" style="display:none">
                        </div>
                        
                        <div class="import-info">
                            <p><i class="fas fa-info-circle"></i> Formati supportati: Excel (.xlsx, .xls) e CSV</p>
                            <button type="button" class="btn btn-link" onclick="window.downloadTemplate()">
                                <i class="fas fa-download"></i> Scarica Template
                            </button>
                        </div>
                        
                        <!-- Preview area -->
                        <div id="importPreview" class="import-preview" style="display:none">
                            <h4>Anteprima Import</h4>
                            <div class="preview-stats"></div>
                            <div class="preview-table"></div>
                            <div class="preview-actions">
                                <button type="button" class="btn btn-secondary" onclick="cancelImport()">
                                    Annulla
                                </button>
                                <button type="button" class="btn btn-success" onclick="confirmImport()">
                                    <i class="fas fa-check"></i> Conferma Import
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <style>
            .enhanced-form-container {
                padding: 20px;
            }
            
            .form-tabs {
                display: flex;
                gap: 10px;
                margin-bottom: 30px;
                border-bottom: 2px solid #e0e0e0;
            }
            
            .tab-btn {
                padding: 10px 20px;
                background: none;
                border: none;
                border-bottom: 3px solid transparent;
                color: #666;
                cursor: pointer;
                transition: all 0.3s ease;
                font-size: 16px;
            }
            
            .tab-btn:hover {
                color: #007AFF;
            }
            
            .tab-btn.active {
                color: #007AFF;
                border-bottom-color: #007AFF;
            }
            
            .tab-content {
                display: none;
            }
            
            .tab-content.active {
                display: block;
                animation: fadeIn 0.3s ease;
            }
            
            .modern-form {
                max-width: 100%;
            }
            
            .form-section {
                margin-bottom: 30px;
                padding: 20px;
                background: #f8f9fa;
                border-radius: 8px;
            }
            
            .form-section h4 {
                margin: 0 0 20px;
                color: #333;
                font-size: 18px;
            }
            
            .smart-input-group {
                margin-bottom: 20px;
            }
            
            .input-with-detection {
                position: relative;
            }
            
            .detection-indicator {
                position: absolute;
                right: 10px;
                top: 50%;
                transform: translateY(-50%);
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .detection-text {
                font-size: 12px;
                font-weight: 600;
                color: #34C759;
            }
            
            .quick-examples {
                margin-top: 8px;
                display: flex;
                gap: 10px;
                align-items: center;
                font-size: 14px;
                color: #666;
            }
            
            .example-btn {
                padding: 4px 12px;
                background: #e0e0e0;
                border: none;
                border-radius: 4px;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .example-btn:hover {
                background: #007AFF;
                color: white;
            }
            
            .form-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
            }
            
            .api-section {
                background: #e3f2fd;
                border: 1px solid #2196f3;
            }
            
            .api-toggle label {
                display: flex;
                align-items: center;
                gap: 10px;
                cursor: pointer;
                margin: 0;
            }
            
            .drag-drop-area {
                border: 2px dashed #007AFF;
                border-radius: 8px;
                padding: 40px;
                text-align: center;
                background: #f0f8ff;
                transition: all 0.3s ease;
            }
            
            .drag-drop-area.dragover {
                background: #e3f2fd;
                border-color: #2196f3;
            }
            
            .import-info {
                margin-top: 20px;
                text-align: center;
                color: #666;
            }
            
            .import-preview {
                margin-top: 30px;
                padding: 20px;
                background: #f8f9fa;
                border-radius: 8px;
            }
            
            .preview-stats {
                display: flex;
                gap: 20px;
                margin: 20px 0;
            }
            
            .preview-actions {
                margin-top: 20px;
                display: flex;
                justify-content: flex-end;
                gap: 10px;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            </style>
        `;
    }
    
    // ========================================
    // INTERACTIONS
    // ========================================
    
    function setupEnhancedInteractions() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const targetTab = this.dataset.tab;
                
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
    // DETECTION & VALIDATION
    // ========================================
    
    function detectAndUpdateType(value) {
        const cleaned = value.trim().toUpperCase();
        const detectionText = document.querySelector('.detection-text');
        
        hideDetectionSpinner();
        
        let detected = null;
        
        // Container
        if (/^[A-Z]{4}\d{7}$/.test(cleaned)) {
            detected = { type: 'container', label: 'Container' };
        }
        // AWB
        else if (/^\d{3}-?\d{8}$/.test(cleaned)) {
            detected = { type: 'awb', label: 'Air Waybill' };
        }
        // BL
        else if (/^[A-Z]{4}\d{8,12}$/.test(cleaned)) {
            detected = { type: 'bl', label: 'Bill of Lading' };
        }
        
        if (detected) {
            detectionText.textContent = `✓ ${detected.label}`;
            detectionText.style.color = '#34C759';
            
            // Update type select
            document.getElementById('enh_trackingType').value = detected.type;
            updateCarrierOptions(detected.type);
        } else {
            clearDetection();
        }
    }
    
    function showDetectionSpinner() {
        document.querySelector('.detection-spinner').style.display = 'inline-block';
        document.querySelector('.detection-text').textContent = '';
    }
    
    function hideDetectionSpinner() {
        document.querySelector('.detection-spinner').style.display = 'none';
    }
    
    function clearDetection() {
        hideDetectionSpinner();
        document.querySelector('.detection-text').textContent = '';
    }
    
    // ========================================
    // CARRIER MANAGEMENT
    // ========================================
    
    function updateCarrierOptions(type) {
        const select = document.getElementById('enh_carrier');
        select.innerHTML = '<option value="">Seleziona...</option>';
        
        let carriers = [];
        
        // Get carriers based on type
        switch(type) {
            case 'container':
            case 'bl':
                carriers = getContainerCarriers();
                break;
            case 'awb':
                carriers = getAirCarriers();
                break;
            default:
                // For auto, show all
                carriers = [...getContainerCarriers(), ...getAirCarriers()];
        }
        
        carriers.forEach(carrier => {
            const option = document.createElement('option');
            option.value = carrier.code;
            option.textContent = carrier.name;
            select.appendChild(option);
        });
    }
    
    function getContainerCarriers() {
        // Usa i carrier dal sistema se disponibili
        if (window.trackingService?.shippingLines) {
            return window.trackingService.shippingLines.map(line => ({
                code: line.ShippingLineCode,
                name: line.ShippingLineName
            }));
        }
        
        // Fallback carriers
        return [
            { code: 'MAERSK', name: 'Maersk' },
            { code: 'MSC', name: 'MSC' },
            { code: 'CMA-CGM', name: 'CMA CGM' },
            { code: 'COSCO', name: 'COSCO' },
            { code: 'HAPAG-LLOYD', name: 'Hapag-Lloyd' },
            { code: 'ONE', name: 'Ocean Network Express' },
            { code: 'EVERGREEN', name: 'Evergreen' },
            { code: 'YANG-MING', name: 'Yang Ming' }
        ];
    }
    
    function getAirCarriers() {
        // Usa airlines dal sistema se disponibili
        if (window.trackingService?.airlines) {
            return window.trackingService.airlines.map(airline => ({
                code: airline.AirlinePrefix,
                name: airline.AirlineName
            }));
        }
        
        // Fallback airlines
        return [
            { code: '020', name: 'Lufthansa' },
            { code: '074', name: 'KLM Cargo' },
            { code: '057', name: 'Air France Cargo' },
            { code: '176', name: 'Emirates SkyCargo' },
            { code: '172', name: 'Cargolux' },
            { code: '988', name: 'Asiana Cargo' },
            { code: '180', name: 'Korean Air Cargo' }
        ];
    }
    
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
            }
            
            // Reload table
            if (window.loadTrackings) {
                await window.loadTrackings();
            }
            
        } catch (error) {
            console.error('Error adding tracking:', error);
            if (window.notificationSystem) {
                window.notificationSystem.error('Errore durante l\'aggiunta: ' + error.message);
            } else {
                alert('Errore durante l\'aggiunta: ' + error.message);
            }
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }
    
    // ========================================
    // IMPORT FUNCTIONS
    // ========================================
    
    let pendingImport = null;
    
    async function handleFileSelect(file) {
        if (!file) return;
        
        // Validate file
        const validTypes = ['.xlsx', '.xls', '.csv'];
        const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
        
        if (!validTypes.includes(extension)) {
            if (window.notificationSystem) {
                window.notificationSystem.error('Formato file non supportato. Usa Excel o CSV.');
            } else {
                alert('Formato file non supportato. Usa Excel o CSV.');
            }
            return;
        }
        
        if (file.size > 10 * 1024 * 1024) { // 10MB
            if (window.notificationSystem) {
                window.notificationSystem.error('File troppo grande (max 10MB)');
            } else {
                alert('File troppo grande (max 10MB)');
            }
            return;
        }
        
        // Show loading
        if (window.notificationSystem) {
            window.notificationSystem.show('Analizzando il file...', 'info', 'import-analysis');
        }
        
        try {
            // Parse file using ImportManager
            const result = await window.ImportManager.parseFile(file);
            
            if (!result.success || !result.data || result.data.length === 0) {
                throw new Error(result.error || 'Nessun dato trovato nel file');
            }
            
            // Store for later
            pendingImport = {
                file: file,
                data: result.data,
                columns: result.columns || Object.keys(result.data[0])
            };
            
            // Show preview
            showImportPreview(pendingImport);
            
            if (window.notificationSystem) {
                window.notificationSystem.dismiss('import-analysis');
            }
            
        } catch (error) {
            console.error('File parse error:', error);
            if (window.notificationSystem) {
                window.notificationSystem.dismiss('import-analysis');
                window.notificationSystem.error('Errore nella lettura del file: ' + error.message);
            } else {
                alert('Errore nella lettura del file: ' + error.message);
            }
        }
    }
    
    function showImportPreview(importData) {
        const previewDiv = document.getElementById('importPreview');
        const statsDiv = previewDiv.querySelector('.preview-stats');
        const tableDiv = previewDiv.querySelector('.preview-table');
        
        // Stats
        statsDiv.innerHTML = `
            <div class="stat-item">
                <i class="fas fa-file"></i>
                <strong>${importData.file.name}</strong>
            </div>
            <div class="stat-item">
                <i class="fas fa-list-ol"></i>
                <strong>${importData.data.length}</strong> righe
            </div>
            <div class="stat-item">
                <i class="fas fa-columns"></i>
                <strong>${importData.columns.length}</strong> colonne
            </div>
        `;
        
        // Table preview (first 5 rows)
        const previewData = importData.data.slice(0, 5);
        let tableHtml = '<table class="table table-sm"><thead><tr>';
        
        // Headers
        importData.columns.forEach(col => {
            tableHtml += `<th>${col}</th>`;
        });
        tableHtml += '</tr></thead><tbody>';
        
        // Rows
        previewData.forEach(row => {
            tableHtml += '<tr>';
            importData.columns.forEach(col => {
                tableHtml += `<td>${row[col] || '-'}</td>`;
            });
            tableHtml += '</tr>';
        });
        
        if (importData.data.length > 5) {
            tableHtml += `<tr><td colspan="${importData.columns.length}" class="text-center text-muted">
                ... e altre ${importData.data.length - 5} righe
            </td></tr>`;
        }
        
        tableHtml += '</tbody></table>';
        tableDiv.innerHTML = tableHtml;
        
        // Show preview
        previewDiv.style.display = 'block';
    }
    
    window.cancelImport = function() {
        pendingImport = null;
        document.getElementById('importPreview').style.display = 'none';
        document.getElementById('enhFileInput').value = '';
    };
    
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
        console.log('Enhanced tracking form toggle can be added to settings');
    }
    
})();