// /pages/tracking/tracking-form-enhanced.js
// Enhanced tracking form - SEPARATO dal codice esistente
// NON tocca column mapping o status mapping!

(function() {
    'use strict';
    
    // Attendi che tutte le dipendenze siano caricate
    const waitForDependencies = setInterval(() => {
        if (window.ModalSystem && window.trackingService && window.notificationSystem) {
            clearInterval(waitForDependencies);
            initializeEnhancedForm();
        }
    }, 100);
    
    function initializeEnhancedForm() {
        // Esponi la funzione enhanced globalmente
        window.showAddTrackingFormEnhanced = showAddTrackingFormEnhanced;
        console.log('✅ Enhanced tracking form loaded');
    }
    
    // ========================================
    // MAIN ENHANCED FORM FUNCTION
    // ========================================
    
    async function showAddTrackingFormEnhanced() {
        console.log('[Enhanced Form] Opening...');
        
        // Carica carriers se disponibili
        let carriers = { maritime: [], air: [] };
        try {
            if (window.trackingService?.hasApiKeys?.()) {
                const [shippingLines, airlines] = await Promise.all([
                    window.trackingService.getShippingLines?.() || Promise.resolve([]),
                    window.trackingService.getAirlines?.() || Promise.resolve([])
                ]);
                carriers.maritime = shippingLines.slice(0, 20);
                carriers.air = airlines.slice(0, 20);
            }
        } catch (error) {
            console.warn('Could not load carriers:', error);
        }
        
        window.ModalSystem.show({
            title: 'Aggiungi Nuovo Tracking',
            content: renderEnhancedForm(carriers),
            size: 'large',
            showFooter: false,
            className: 'enhanced-tracking-modal'
        });
        
        // Setup interactions dopo che il modal è renderizzato
        setTimeout(setupFormInteractions, 100);
    }
    
    // ========================================
    // RENDER FORM HTML
    // ========================================
    
    function renderEnhancedForm(carriers) {
        return `
            <div class="sol-form enhanced-tracking-form">
                <!-- Progress Steps -->
                <div class="form-progress">
                    <div class="progress-step active" data-step="1">
                        <span class="step-number">1</span>
                        <span class="step-label">Tracking</span>
                    </div>
                    <div class="progress-line"></div>
                    <div class="progress-step" data-step="2">
                        <span class="step-number">2</span>
                        <span class="step-label">Dettagli</span>
                    </div>
                    <div class="progress-line"></div>
                    <div class="progress-step" data-step="3">
                        <span class="step-number">3</span>
                        <span class="step-label">Conferma</span>
                    </div>
                </div>
                
                <form id="enhancedTrackingForm">
                    <!-- Step 1: Tracking Number -->
                    <div class="form-step active" data-step="1">
                        <h4>Inserisci il numero di tracking</h4>
                        
                        <div class="form-group">
                            <label>Numero Tracking *</label>
                            <div class="input-with-detection">
                                <input type="text" 
                                       id="enh_trackingNumber" 
                                       class="form-control form-control-lg" 
                                       placeholder="Es: MSKU1234567, 176-12345678"
                                       required
                                       autocomplete="off">
                                <div class="detection-spinner" id="detectionSpinner">
                                    <i class="fas fa-circle-notch fa-spin"></i>
                                </div>
                            </div>
                            <div class="detection-result" id="detectionResult"></div>
                        </div>
                        
                        <div class="quick-examples">
                            <span class="example-label">Esempi:</span>
                            <button type="button" class="example-btn" onclick="setExampleTracking('MSKU1234567')">
                                Container
                            </button>
                            <button type="button" class="example-btn" onclick="setExampleTracking('176-12345678')">
                                AWB
                            </button>
                            <button type="button" class="example-btn" onclick="setExampleTracking('DHL1234567890')">
                                Express
                            </button>
                        </div>
                    </div>
                    
                    <!-- Step 2: Details -->
                    <div class="form-step" data-step="2">
                        <h4>Dettagli spedizione</h4>
                        
                        <div class="form-grid">
                            <div class="form-group">
                                <label>Tipo Tracking</label>
                                <select id="enh_trackingType" class="form-control">
                                    <option value="auto">Auto-detect</option>
                                    <option value="container">Container</option>
                                    <option value="bl">Bill of Lading</option>
                                    <option value="awb">Air Waybill</option>
                                    <option value="parcel">Express/Parcel</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label>Vettore</label>
                                <select id="enh_carrierCode" class="form-control">
                                    <option value="">Seleziona...</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-grid">
                            <div class="form-group">
                                <label>Origine</label>
                                <input type="text" 
                                       id="enh_originPort" 
                                       class="form-control"
                                       placeholder="Porto/Aeroporto origine">
                            </div>
                            
                            <div class="form-group">
                                <label>Destinazione</label>
                                <input type="text" 
                                       id="enh_destinationPort" 
                                       class="form-control"
                                       placeholder="Porto/Aeroporto destinazione">
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label>Riferimento</label>
                            <input type="text" 
                                   id="enh_reference" 
                                   class="form-control"
                                   placeholder="Riferimento interno (opzionale)">
                        </div>
                        
                        <div class="api-toggle">
                            <label>
                                <input type="checkbox" id="enh_useApi" checked>
                                <span>Usa API ShipsGo per dati real-time</span>
                            </label>
                        </div>
                    </div>
                    
                    <!-- Step 3: Confirm -->
                    <div class="form-step" data-step="3">
                        <h4>Riepilogo e conferma</h4>
                        
                        <div class="summary-box" id="summaryBox">
                            <!-- Populated by JS -->
                        </div>
                        
                        <div class="preview-container" id="previewContainer" style="display: none;">
                            <h5>Anteprima dati tracking</h5>
                            <div class="preview-content" id="previewContent">
                                <i class="fas fa-spinner fa-spin"></i> Caricamento...
                            </div>
                        </div>
                    </div>
                    
                    <!-- Form Actions -->
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" id="prevBtn" style="display: none;">
                            <i class="fas fa-arrow-left"></i> Indietro
                        </button>
                        <button type="button" class="btn btn-primary" id="nextBtn">
                            Avanti <i class="fas fa-arrow-right"></i>
                        </button>
                        <button type="submit" class="btn btn-success" id="submitBtn" style="display: none;">
                            <i class="fas fa-check"></i> Conferma e Aggiungi
                        </button>
                    </div>
                </form>
            </div>
            
            <style>
            .enhanced-tracking-form {
                max-width: 700px;
                margin: 0 auto;
            }
            
            .form-progress {
                display: flex;
                align-items: center;
                justify-content: center;
                margin-bottom: 30px;
                padding: 20px;
            }
            
            .progress-step {
                display: flex;
                flex-direction: column;
                align-items: center;
                position: relative;
            }
            
            .step-number {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: #e0e0e0;
                color: #666;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 600;
                margin-bottom: 8px;
                transition: all 0.3s ease;
            }
            
            .progress-step.active .step-number {
                background: #007AFF;
                color: white;
                transform: scale(1.1);
            }
            
            .progress-step.completed .step-number {
                background: #34C759;
                color: white;
            }
            
            .step-label {
                font-size: 14px;
                color: #666;
            }
            
            .progress-line {
                width: 100px;
                height: 2px;
                background: #e0e0e0;
                margin: 0 20px;
                margin-bottom: 28px;
            }
            
            .form-step {
                display: none;
                animation: fadeIn 0.3s ease;
            }
            
            .form-step.active {
                display: block;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            .input-with-detection {
                position: relative;
            }
            
            .detection-spinner {
                position: absolute;
                right: 12px;
                top: 50%;
                transform: translateY(-50%);
                color: #007AFF;
                display: none;
            }
            
            .detection-spinner.active {
                display: block;
            }
            
            .detection-result {
                margin-top: 10px;
                padding: 12px;
                border-radius: 8px;
                font-size: 14px;
                display: none;
            }
            
            .detection-result.success {
                background: #d4f4dd;
                color: #2e7d32;
                border: 1px solid #4caf50;
                display: block;
            }
            
            .detection-result.error {
                background: #ffebee;
                color: #c62828;
                border: 1px solid #f44336;
                display: block;
            }
            
            .quick-examples {
                margin-top: 15px;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .example-label {
                font-size: 14px;
                color: #666;
            }
            
            .example-btn {
                padding: 6px 12px;
                border: 1px solid #ddd;
                background: white;
                border-radius: 6px;
                font-size: 13px;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .example-btn:hover {
                background: #f5f5f5;
                border-color: #007AFF;
                color: #007AFF;
            }
            
            .form-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 16px;
                margin-bottom: 16px;
            }
            
            .form-control-lg {
                font-size: 18px;
                padding: 12px 16px;
            }
            
            .api-toggle {
                margin-top: 20px;
                padding: 15px;
                background: #f8f9fa;
                border-radius: 8px;
            }
            
            .api-toggle label {
                display: flex;
                align-items: center;
                gap: 10px;
                cursor: pointer;
            }
            
            .api-toggle input[type="checkbox"] {
                width: 18px;
                height: 18px;
                cursor: pointer;
            }
            
            .summary-box {
                background: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
                margin-bottom: 20px;
            }
            
            .summary-item {
                display: flex;
                justify-content: space-between;
                padding: 8px 0;
                border-bottom: 1px solid #e0e0e0;
            }
            
            .summary-item:last-child {
                border-bottom: none;
            }
            
            .summary-label {
                color: #666;
            }
            
            .summary-value {
                font-weight: 600;
                color: #333;
            }
            
            .preview-container {
                margin-top: 20px;
                padding: 20px;
                background: #e3f2fd;
                border-radius: 8px;
                border: 1px solid #2196f3;
            }
            
            .preview-content {
                margin-top: 10px;
            }
            
            .form-actions {
                display: flex;
                justify-content: space-between;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #e0e0e0;
            }
            
            @media (max-width: 768px) {
                .form-grid {
                    grid-template-columns: 1fr;
                }
                
                .progress-line {
                    width: 50px;
                }
                
                .quick-examples {
                    flex-wrap: wrap;
                }
            }
            </style>
        `;
    }
    
    // ========================================
    // FORM INTERACTIONS
    // ========================================
    
    function setupFormInteractions() {
        const form = document.getElementById('enhancedTrackingForm');
        if (!form) return;
        
        // Current step
        let currentStep = 1;
        const totalSteps = 3;
        
        // Elements
        const trackingInput = document.getElementById('enh_trackingNumber');
        const typeSelect = document.getElementById('enh_trackingType');
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const submitBtn = document.getElementById('submitBtn');
        
        // Step navigation
        nextBtn.addEventListener('click', () => {
            if (validateStep(currentStep)) {
                if (currentStep < totalSteps) {
                    goToStep(currentStep + 1);
                }
            }
        });
        
        prevBtn.addEventListener('click', () => {
            if (currentStep > 1) {
                goToStep(currentStep - 1);
            }
        });
        
        // Form submission
        form.addEventListener('submit', handleFormSubmit);
        
        // Tracking input detection
        let detectionTimeout;
        trackingInput.addEventListener('input', (e) => {
            clearTimeout(detectionTimeout);
            const value = e.target.value.trim();
            
            if (value.length < 3) {
                hideDetectionResult();
                return;
            }
            
            showDetectionSpinner();
            detectionTimeout = setTimeout(() => {
                detectTrackingType(value);
            }, 500);
        });
        
        // Type change updates carriers
        typeSelect.addEventListener('change', updateCarrierOptions);
        
        // Step navigation function
        function goToStep(step) {
            // Update current step
            currentStep = step;
            
            // Update progress indicators
            document.querySelectorAll('.progress-step').forEach((el, index) => {
                if (index + 1 < step) {
                    el.classList.add('completed');
                    el.classList.remove('active');
                } else if (index + 1 === step) {
                    el.classList.add('active');
                    el.classList.remove('completed');
                } else {
                    el.classList.remove('active', 'completed');
                }
            });
            
            // Update form steps
            document.querySelectorAll('.form-step').forEach(el => {
                el.classList.remove('active');
            });
            document.querySelector(`[data-step="${step}"]`).classList.add('active');
            
            // Update buttons
            prevBtn.style.display = step === 1 ? 'none' : 'block';
            nextBtn.style.display = step === totalSteps ? 'none' : 'block';
            submitBtn.style.display = step === totalSteps ? 'block' : 'none';
            
            // Special actions for step 3
            if (step === 3) {
                updateSummary();
                if (document.getElementById('enh_useApi').checked) {
                    loadPreview();
                }
            }
        }
        
        // Validate current step
        function validateStep(step) {
            if (step === 1) {
                const trackingNumber = trackingInput.value.trim();
                if (!trackingNumber) {
                    window.notificationSystem.error('Inserisci un numero di tracking');
                    trackingInput.focus();
                    return false;
                }
            }
            return true;
        }
    }
    
    // ========================================
    // TRACKING DETECTION
    // ========================================
    
    function detectTrackingType(value) {
        const cleaned = value.trim().toUpperCase();
        const resultDiv = document.getElementById('detectionResult');
        
        hideDetectionSpinner();
        
        // Container pattern
        if (/^[A-Z]{4}\d{7}$/.test(cleaned)) {
            showDetectionSuccess('Container', 'container');
            updateCarrierOptions('container');
            return;
        }
        
        // AWB pattern
        if (/^\d{3}-?\d{8}$/.test(cleaned)) {
            showDetectionSuccess('Air Waybill', 'awb');
            updateCarrierOptions('awb');
            return;
        }
        
        // Bill of Lading
        if (/^[A-Z]{4}\d{8,12}$/.test(cleaned)) {
            showDetectionSuccess('Bill of Lading', 'bl');
            updateCarrierOptions('bl');
            return;
        }
        
        // Express patterns
        if (/^[0-9]{10,}$/.test(cleaned) || /^[A-Z0-9]{10,}$/.test(cleaned)) {
            showDetectionSuccess('Express/Parcel', 'parcel');
            updateCarrierOptions('parcel');
            return;
        }
        
        // Not recognized
        resultDiv.className = 'detection-result error';
        resultDiv.innerHTML = '<i class="fas fa-exclamation-circle"></i> Formato non riconosciuto';
    }
    
    function showDetectionSuccess(type, value) {
        const resultDiv = document.getElementById('detectionResult');
        const typeSelect = document.getElementById('enh_trackingType');
        
        resultDiv.className = 'detection-result success';
        resultDiv.innerHTML = `<i class="fas fa-check-circle"></i> Rilevato: ${type}`;
        
        if (typeSelect) {
            typeSelect.value = value;
        }
    }
    
    // ========================================
    // CARRIER OPTIONS
    // ========================================
    
    function updateCarrierOptions(type) {
        const carrierSelect = document.getElementById('enh_carrierCode');
        if (!carrierSelect) return;
        
        // Clear options
        carrierSelect.innerHTML = '<option value="">Seleziona vettore...</option>';
        
        // Maritime carriers
        const maritimeCarriers = [
            { code: 'MSC', name: 'MSC' },
            { code: 'MAERSK', name: 'Maersk' },
            { code: 'CMA-CGM', name: 'CMA CGM' },
            { code: 'COSCO', name: 'COSCO' },
            { code: 'HAPAG', name: 'Hapag-Lloyd' },
            { code: 'ONE', name: 'ONE' },
            { code: 'EVERGREEN', name: 'Evergreen' },
            { code: 'YML', name: 'Yang Ming' }
        ];
        
        // Airlines
        const airlines = [
            { code: 'CV', name: 'Cargolux' },
            { code: 'EK', name: 'Emirates SkyCargo' },
            { code: 'LH', name: 'Lufthansa Cargo' },
            { code: 'QR', name: 'Qatar Airways Cargo' },
            { code: 'SQ', name: 'Singapore Airlines Cargo' }
        ];
        
        // Express
        const expressCarriers = [
            { code: 'DHL', name: 'DHL Express' },
            { code: 'FEDEX', name: 'FedEx' },
            { code: 'UPS', name: 'UPS' },
            { code: 'TNT', name: 'TNT' },
            { code: 'GLS', name: 'GLS' }
        ];
        
        let carriers = [];
        if (type === 'container' || type === 'bl') {
            carriers = maritimeCarriers;
        } else if (type === 'awb') {
            carriers = airlines;
        } else if (type === 'parcel') {
            carriers = expressCarriers;
        }
        
        carriers.forEach(carrier => {
            const option = document.createElement('option');
            option.value = carrier.code;
            option.textContent = carrier.name;
            carrierSelect.appendChild(option);
        });
    }
    
    // ========================================
    // SUMMARY & PREVIEW
    // ========================================
    
    function updateSummary() {
        const summaryBox = document.getElementById('summaryBox');
        if (!summaryBox) return;
        
        const data = {
            trackingNumber: document.getElementById('enh_trackingNumber').value,
            type: document.getElementById('enh_trackingType').value,
            carrier: document.getElementById('enh_carrierCode').value,
            origin: document.getElementById('enh_originPort').value,
            destination: document.getElementById('enh_destinationPort').value,
            reference: document.getElementById('enh_reference').value,
            useApi: document.getElementById('enh_useApi').checked
        };
        
        const typeLabels = {
            'container': 'Container',
            'bl': 'Bill of Lading',
            'awb': 'Air Waybill',
            'parcel': 'Express/Parcel',
            'auto': 'Auto-detect'
        };
        
        summaryBox.innerHTML = `
            <div class="summary-item">
                <span class="summary-label">Numero Tracking:</span>
                <span class="summary-value">${data.trackingNumber || '-'}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">Tipo:</span>
                <span class="summary-value">${typeLabels[data.type] || data.type || '-'}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">Vettore:</span>
                <span class="summary-value">${data.carrier || '-'}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">Origine:</span>
                <span class="summary-value">${data.origin || '-'}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">Destinazione:</span>
                <span class="summary-value">${data.destination || '-'}</span>
            </div>
            ${data.reference ? `
            <div class="summary-item">
                <span class="summary-label">Riferimento:</span>
                <span class="summary-value">${data.reference}</span>
            </div>
            ` : ''}
            <div class="summary-item">
                <span class="summary-label">Modalità:</span>
                <span class="summary-value">${data.useApi ? 'API ShipsGo' : 'Manuale'}</span>
            </div>
        `;
    }
    
    async function loadPreview() {
        const container = document.getElementById('previewContainer');
        const content = document.getElementById('previewContent');
        
        if (!container || !content) return;
        
        container.style.display = 'block';
        content.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Caricamento anteprima...';
        
        try {
            const trackingNumber = document.getElementById('enh_trackingNumber').value;
            const trackingType = document.getElementById('enh_trackingType').value;
            
            if (window.trackingService?.track) {
                const result = await window.trackingService.track(trackingNumber, trackingType);
                
                if (result.success) {
                    content.innerHTML = `
                        <div class="preview-data">
                            <strong>Stato:</strong> ${result.status || 'N/A'}<br>
                            <strong>Vettore:</strong> ${result.carrier?.name || 'N/A'}<br>
                            <strong>Ultimo aggiornamento:</strong> ${result.lastUpdate || 'N/A'}
                        </div>
                    `;
                } else {
                    content.innerHTML = '<i class="fas fa-exclamation-circle"></i> Dati non disponibili';
                }
            } else {
                content.innerHTML = '<i class="fas fa-info-circle"></i> API non disponibile';
            }
        } catch (error) {
            content.innerHTML = '<i class="fas fa-exclamation-circle"></i> Errore caricamento preview';
        }
    }
    
    // ========================================
    // FORM SUBMISSION
    // ========================================
    
    async function handleFormSubmit(event) {
        event.preventDefault();
        
        const submitBtn = document.getElementById('submitBtn');
        const originalText = submitBtn.innerHTML;
        
        // Collect form data
        const formData = {
            tracking_number: document.getElementById('enh_trackingNumber').value.trim().toUpperCase(),
            tracking_type: document.getElementById('enh_trackingType').value,
            carrier_code: document.getElementById('enh_carrierCode').value,
            origin_port: document.getElementById('enh_originPort').value.toUpperCase(),
            destination_port: document.getElementById('enh_destinationPort').value.toUpperCase(),
            reference_number: document.getElementById('enh_reference').value,
            use_api: document.getElementById('enh_useApi').checked,
            status: 'registered',
            created_at: new Date().toISOString()
        };
        
        // Check if exists
        if (window.trackings?.find(t => t.tracking_number === formData.tracking_number)) {
            window.notificationSystem.error('Tracking già presente nel sistema');
            return;
        }
        
        // Show loading
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Aggiunta in corso...';
        
        try {
            let enrichedData = { ...formData };
            
            // Try to get data from API if enabled
            if (formData.use_api && window.trackingService?.track) {
                try {
                    const apiResult = await window.trackingService.track(
                        formData.tracking_number,
                        formData.tracking_type === 'auto' ? undefined : formData.tracking_type
                    );
                    
                    if (apiResult.success) {
                        enrichedData = {
                            ...formData,
                            ...apiResult.data,
                            id: Date.now().toString(),
                            reference_number: formData.reference_number, // Preserve user input
                            metadata: {
                                ...apiResult.metadata,
                                source: 'enhanced_form',
                                api_used: true
                            }
                        };
                    }
                } catch (apiError) {
                    console.warn('API call failed, using manual data:', apiError);
                    enrichedData.metadata = { source: 'enhanced_form', api_error: apiError.message };
                }
            } else {
                enrichedData.id = Date.now().toString();
                enrichedData.metadata = { source: 'enhanced_form', api_used: false };
            }
            
            // Add to trackings
            if (!window.trackings) window.trackings = [];
            window.trackings.push(enrichedData);
            
            // Save to localStorage
            localStorage.setItem('trackings', JSON.stringify(window.trackings));
            
            // Close modal
            window.ModalSystem.closeAll();
            
            // Show success
            window.notificationSystem.success(
                formData.use_api ? 'Tracking aggiunto con dati API!' : 'Tracking aggiunto manualmente'
            );
            
            // Reload trackings table
            if (window.loadTrackings) {
                await window.loadTrackings();
            }
            
        } catch (error) {
            console.error('Error adding tracking:', error);
            window.notificationSystem.error('Errore: ' + error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }
    
    // ========================================
    // HELPER FUNCTIONS
    // ========================================
    
    function showDetectionSpinner() {
        const spinner = document.getElementById('detectionSpinner');
        if (spinner) spinner.classList.add('active');
    }
    
    function hideDetectionSpinner() {
        const spinner = document.getElementById('detectionSpinner');
        if (spinner) spinner.classList.remove('active');
    }
    
    function hideDetectionResult() {
        const result = document.getElementById('detectionResult');
        if (result) result.className = 'detection-result';
    }
    
    // Example tracking numbers
    window.setExampleTracking = function(value) {
        const input = document.getElementById('enh_trackingNumber');
        if (input) {
            input.value = value;
            input.dispatchEvent(new Event('input'));
        }
    };
    
})();// Force deploy Gio 19 Giu 2025 16:43:04 CEST
