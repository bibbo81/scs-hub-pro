// ocean-v2-autodetection-fix.js
// Fix per implementare l'auto-detection Ocean ID quando si usa v2.0

(function() {
    'use strict';
    
    console.log('🌊 OCEAN v2.0 AUTO-DETECTION FIX - Starting...');
    
    // ========================================
    // STEP 1: Aggiungi funzioni helper per Ocean v2
    // ========================================
    
    // Funzione per cercare Ocean ID
    window.searchOceanId = async function(containerNumber) {
        console.log('🔍 Searching Ocean ID for:', containerNumber);
        
        if (!window.trackingService) {
            console.error('TrackingService not available');
            return null;
        }
        
        try {
            // Assicurati di usare v2
            window.trackingService.preferV2Ocean = true;
            
            const shipments = await window.trackingService.getOceanShipmentsList();
            const found = shipments.find(s => 
                s.container_number === containerNumber.toUpperCase()
            );
            
            if (found) {
                console.log('✅ Ocean ID found:', found.id);
                // Salva l'ID trovato
                window.detectedOceanId = found.id;
                return found;
            } else {
                console.log('⚠️ Container not found in Ocean shipments');
                window.detectedOceanId = null;
                return null;
            }
        } catch (error) {
            console.error('❌ Error searching Ocean ID:', error);
            window.detectedOceanId = null;
            return null;
        }
    };
    
    // Funzioni UI per mostrare lo stato della ricerca Ocean
    window.showOceanIdSearching = function() {
        const statusEl = document.querySelector('.detection-status');
        if (statusEl) {
            statusEl.innerHTML = `
                <i class="fas fa-circle-notch fa-spin status-icon" style="color: #007bff;"></i>
                <span class="status-text">Ricerca Ocean ID...</span>
            `;
        }
    };
    
    window.showOceanIdFound = function(oceanId) {
        const statusEl = document.querySelector('.detection-status');
        if (statusEl) {
            statusEl.innerHTML = `
                <i class="fas fa-check-circle status-icon" style="color: #28a745;"></i>
                <span class="status-text">🚢 Container trovato - Ocean ID: ${oceanId}</span>
            `;
        }
        
        // Aggiungi badge visibile
        const inputWrapper = document.querySelector('.main-input-wrapper');
        const existingBadge = inputWrapper.querySelector('.ocean-id-badge');
        if (existingBadge) existingBadge.remove();
        
        const badge = document.createElement('div');
        badge.className = 'ocean-id-badge';
        badge.style.cssText = `
            background: #007bff;
            color: white;
            padding: 4px 12px;
            border-radius: 4px;
            font-size: 12px;
            margin-top: 8px;
            display: inline-block;
        `;
        badge.innerHTML = `<i class="fas fa-anchor"></i> Ocean ID: ${oceanId}`;
        inputWrapper.appendChild(badge);
    };
    
    window.showOceanIdNotFound = function() {
        const statusEl = document.querySelector('.detection-status');
        if (statusEl) {
            statusEl.innerHTML = `
                <i class="fas fa-info-circle status-icon" style="color: #ffc107;"></i>
                <span class="status-text">🚢 Container non trovato in Ocean (verrà registrato)</span>
            `;
        }
    };
    
    // ========================================
    // STEP 2: Modifica detectAndUpdateType per supportare Ocean v2
    // ========================================
    
    // Salva la versione originale
    const originalDetectAndUpdateType = window.detectAndUpdateType;
    
    // Override con versione che supporta Ocean v2
    window.detectAndUpdateType = async function(trackingNumber) {
        console.log('🔍 detectAndUpdateType called for:', trackingNumber);
        
        // Chiama prima la versione originale
        if (originalDetectAndUpdateType) {
            await originalDetectAndUpdateType.call(this, trackingNumber);
        }
        
        // Verifica se è un container
        const containerPattern = /^[A-Z]{4}\d{7}$/;
        if (containerPattern.test(trackingNumber.trim().toUpperCase())) {
            console.log('📦 Container detected:', trackingNumber);
            
            // Verifica se Ocean v2.0 è selezionato
            const oceanV2Selected = document.querySelector('input[name="ocean_api_version"]:checked');
            if (oceanV2Selected && oceanV2Selected.value === 'v2.0') {
                console.log('🌊 Ocean v2.0 is selected - searching for ID...');
                
                // Mostra indicatore di caricamento
                showOceanIdSearching();
                
                try {
                    // Cerca l'Ocean ID
                    const oceanShipment = await searchOceanId(trackingNumber);
                    
                    if (oceanShipment && oceanShipment.id) {
                        // ID trovato!
                        showOceanIdFound(oceanShipment.id);
                        
                        // Pre-compila altri campi se disponibili
                        if (oceanShipment.status) {
                            const statusMap = {
                                'DELIVERED': 'delivered',
                                'IN TRANSIT': 'in_transit',
                                'IN_TRANSIT': 'in_transit',
                                'ARRIVED': 'arrived',
                                'REGISTERED': 'registered'
                            };
                            const mappedStatus = statusMap[oceanShipment.status?.toUpperCase()] || 'registered';
                            const statusSelect = document.getElementById('enh_status');
                            if (statusSelect) {
                                statusSelect.value = mappedStatus;
                            }
                        }
                        
                        // Se ci sono informazioni sulla rotta
                        if (oceanShipment.route) {
                            if (oceanShipment.route.origin) {
                                const originInput = document.getElementById('enh_origin');
                                if (originInput && oceanShipment.route.origin.port) {
                                    originInput.value = oceanShipment.route.origin.port;
                                }
                            }
                            if (oceanShipment.route.destination) {
                                const destInput = document.getElementById('enh_destination');
                                if (destInput && oceanShipment.route.destination.port) {
                                    destInput.value = oceanShipment.route.destination.port;
                                }
                            }
                        }
                    } else {
                        // Container non trovato
                        showOceanIdNotFound();
                        window.detectedOceanId = null;
                    }
                } catch (error) {
                    console.error('❌ Error searching Ocean ID:', error);
                    // Non mostrare errore all'utente, continua normalmente
                    const statusEl = document.querySelector('.detection-status');
                    if (statusEl) {
                        statusEl.innerHTML = `
                            <i class="fas fa-check-circle status-icon" style="color: #28a745;"></i>
                            <span class="status-text">🚢 Container rilevato</span>
                        `;
                    }
                }
            }
        }
    };
    
    // ========================================
    // STEP 3: Aggiungi listener per Ocean version change
    // ========================================
    
    function setupOceanVersionListener() {
        const checkInterval = setInterval(() => {
            const oceanRadios = document.querySelectorAll('input[name="ocean_api_version"]');
            if (oceanRadios.length > 0) {
                clearInterval(checkInterval);
                
                console.log('🎯 Setting up Ocean version listeners...');
                
                oceanRadios.forEach(radio => {
                    radio.addEventListener('change', async (e) => {
                        console.log('🔄 Ocean version changed to:', e.target.value);
                        
                        const input = document.getElementById('enh_trackingNumber');
                        if (input?.value) {
                            const trackingNumber = input.value.trim().toUpperCase();
                            const containerPattern = /^[A-Z]{4}\d{7}$/;
                            
                            // Se è v2.0 e abbiamo un container valido
                            if (e.target.value === 'v2.0' && containerPattern.test(trackingNumber)) {
                                console.log('🌊 Triggering Ocean v2 detection for:', trackingNumber);
                                
                                // Reset stato precedente
                                window.detectedOceanId = null;
                                const existingBadge = document.querySelector('.ocean-id-badge');
                                if (existingBadge) existingBadge.remove();
                                
                                // Trigger detection
                                await detectAndUpdateType(trackingNumber);
                            } else if (e.target.value === 'v1.2') {
                                // Se torniamo a v1.2, rimuovi badge Ocean ID
                                window.detectedOceanId = null;
                                const existingBadge = document.querySelector('.ocean-id-badge');
                                if (existingBadge) existingBadge.remove();
                                
                                // Reset status
                                const statusEl = document.querySelector('.detection-status');
                                if (statusEl) {
                                    statusEl.innerHTML = `
                                        <i class="fas fa-check-circle status-icon" style="color: #28a745;"></i>
                                        <span class="status-text">🚢 Container rilevato</span>
                                    `;
                                }
                            }
                        }
                    });
                });
                
                console.log('✅ Ocean version listeners set up');
            }
        }, 500);
    }
    
    // ========================================
    // STEP 4: Modifica handleEnhancedSubmit per usare Ocean ID
    // ========================================
    
    // Intercetta la submission del form
    function interceptFormSubmission() {
        const checkInterval = setInterval(() => {
            if (window.handleEnhancedSubmit) {
                clearInterval(checkInterval);
                
                console.log('🎯 Intercepting form submission...');
                
                const originalSubmit = window.handleEnhancedSubmit;
                window.handleEnhancedSubmit = async function(e) {
                    console.log('📤 Enhanced submit intercepted');
                    
                    // Se abbiamo un Ocean ID rilevato e stiamo usando v2.0
                    const oceanV2Selected = document.querySelector('input[name="ocean_api_version"]:checked');
                    if (window.detectedOceanId && oceanV2Selected?.value === 'v2.0') {
                        console.log('🌊 Using detected Ocean ID:', window.detectedOceanId);
                        
                        // Assicurati che trackingService usi v2
                        if (window.trackingService) {
                            window.trackingService.preferV2Ocean = true;
                        }
                    }
                    
                    // Chiama la versione originale
                    return originalSubmit.call(this, e);
                };
                
                console.log('✅ Form submission intercepted');
            }
        }, 500);
    }
    
    // ========================================
    // STEP 5: Modifica processEnhancedTracking per Ocean v2
    // ========================================
    
    function interceptProcessTracking() {
        const checkInterval = setInterval(() => {
            if (window.processEnhancedTracking) {
                clearInterval(checkInterval);
                
                console.log('🎯 Intercepting processEnhancedTracking...');
                
                const originalProcess = window.processEnhancedTracking;
                window.processEnhancedTracking = async function(formData) {
                    console.log('📤 Process tracking intercepted');
                    
                    // Se abbiamo un Ocean ID e stiamo tracciando un container
                    if (window.detectedOceanId && formData.trackingType === 'container') {
                        console.log('🌊 Adding Ocean ID to formData:', window.detectedOceanId);
                        
                        // Aggiungi l'Ocean ID ai dati del form
                        formData.shipsgoId = window.detectedOceanId;
                        formData.oceanId = window.detectedOceanId;
                        formData.useOceanV2 = true;
                        
                        // Passa l'ID nelle opzioni della track call
                        if (!formData.trackOptions) {
                            formData.trackOptions = {};
                        }
                        formData.trackOptions.shipsgoId = window.detectedOceanId;
                        formData.trackOptions.useV2 = true;
                    }
                    
                    // Chiama la versione originale
                    const result = await originalProcess.call(this, formData);
                    
                    // Cleanup dopo il submit
                    if (window.detectedOceanId) {
                        console.log('🧹 Cleanup Ocean ID after submit');
                        window.detectedOceanId = null;
                    }
                    
                    return result;
                };
                
                console.log('✅ Process tracking intercepted');
            }
        }, 500);
    }
    
    // ========================================
    // INITIALIZATION
    // ========================================
    App.onReady(() => {
        console.log('🌊 Initializing Ocean v2.0 auto-detection...');
        
        // Setup listeners
        setupOceanVersionListener();
        interceptFormSubmission();
        interceptProcessTracking();
        
        // Add CSS for Ocean badge
        if (!document.getElementById('ocean-badge-styles')) {
            const styles = document.createElement('style');
            styles.id = 'ocean-badge-styles';
            styles.textContent = `
                .ocean-id-badge {
                    background: #007bff;
                    color: white;
                    padding: 4px 12px;
                    border-radius: 4px;
                    font-size: 12px;
                    margin-top: 8px;
                    display: inline-block;
                    animation: fadeIn 0.3s ease;
                }
                
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
            `;
            document.head.appendChild(styles);
        }
        
        console.log('✅ Ocean v2.0 auto-detection initialized');
    });
    
})();

console.log('✅ Ocean v2.0 Auto-detection Fix loaded');