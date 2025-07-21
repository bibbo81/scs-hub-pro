// tracking-detect-fix.js - Fix per auto-detect tracking type con ShipsGo integration
(function() {
    'use strict';
    
    console.log('🔧 TRACKING DETECT FIX: Initializing with ShipsGo integration...');
    
    // COSTANTI PER EVITARE LOOP
    const MAX_RETRIES = 10;
    const RETRY_DELAY = 500; // ms
    let enhanceRetryCount = 0;
    
    // Cache per le shipping lines
    let shippingLinesCache = null;
    let cacheTimestamp = 0;
    const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 ore
    
    // Cache per le airlines con i loro prefissi
    let airlinesCache = null;
    let airlinesCacheTimestamp = 0;
    
    // Carica airlines da ShipsGo (hanno i prefissi AWB)
    async function loadAirlines() {
        try {
            // Controlla cache
            if (airlinesCache && (Date.now() - airlinesCacheTimestamp) < CACHE_TTL) {
                console.log('📋 Using cached airlines');
                return airlinesCache;
            }
            
            // Carica da localStorage se disponibile
            const cached = localStorage.getItem('airlinesCache');
            if (cached) {
                const data = JSON.parse(cached);
                if (data.timestamp && (Date.now() - data.timestamp) < CACHE_TTL) {
                    airlinesCache = data.data;
                    airlinesCacheTimestamp = data.timestamp;
                    console.log('✅ Airlines loaded from localStorage');
                    return airlinesCache;
                }
            }
            
            // Se abbiamo il tracking service, carica da API
            if (window.trackingService && window.trackingService.hasApiKeys()) {
                console.log('🔄 Loading airlines from ShipsGo...');
                
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
                
                if (result.success && result.data && result.data.airlines) {
                    // Crea mappa prefix -> airline
                    const prefixMap = {};
                    
                    result.data.airlines.forEach(airline => {
                        if (airline.status === 'ACTIVE' && airline.prefixes) {
                            airline.prefixes.forEach(prefix => {
                                prefixMap[prefix] = {
                                    iata: airline.iata,
                                    name: airline.name
                                };
                            });
                        }
                    });
                    
                    airlinesCache = prefixMap;
                    airlinesCacheTimestamp = Date.now();
                    
                    // Salva in localStorage
                    try {
                        localStorage.setItem('airlinesCache', JSON.stringify({
                            data: prefixMap,
                            timestamp: airlinesCacheTimestamp
                        }));
                    } catch (e) {
                        console.error('Error saving airlines cache:', e);
                    }
                    
                    console.log('✅ Loaded airlines:', Object.keys(prefixMap).length, 'prefixes');
                    return prefixMap;
                }
            }
            
            return null;
        } catch (error) {
            console.error('Error loading airlines:', error);
            return null;
        }
    }
    
    // Mappa COMPLETA prefissi container -> SCAC code
    const CONTAINER_PREFIX_MAP = {
        // APL
        'APLU': { scac: 'APLU', name: 'APL' },
        'APHU': { scac: 'APLU', name: 'APL' },
        'APZU': { scac: 'APLU', name: 'APL' },
        'APRU': { scac: 'APLU', name: 'APL' },
        
        // MAERSK
        'MSKU': { scac: 'MAEU', name: 'MAERSK' },
        'MRKU': { scac: 'MAEU', name: 'MAERSK' },
        'MAGU': { scac: 'MAEU', name: 'MAERSK' },
        'SEJJ': { scac: 'MAEU', name: 'MAERSK' },
        'MCGU': { scac: 'MAEU', name: 'MAERSK' },
        'MVKU': { scac: 'MAEU', name: 'MAERSK' },
        'MMAU': { scac: 'MAEU', name: 'MAERSK' },
        'MSAU': { scac: 'MAEU', name: 'MAERSK' },
        'MAEU': { scac: 'MAEU', name: 'MAERSK' },
        
        // MSC
        'MSCU': { scac: 'MSCU', name: 'MSC' },
        'MEDU': { scac: 'MSCU', name: 'MSC' },
        'MSMU': { scac: 'MSCU', name: 'MSC' },
        'MSNU': { scac: 'MSCU', name: 'MSC' },
        'MSPU': { scac: 'MSCU', name: 'MSC' },
        'MSQU': { scac: 'MSCU', name: 'MSC' },
        'MSWU': { scac: 'MSCU', name: 'MSC' },
        'MSZU': { scac: 'MSCU', name: 'MSC' },
        'MSRU': { scac: 'MSCU', name: 'MSC' },
        'MSDU': { scac: 'MSCU', name: 'MSC' },
        'MSBU': { scac: 'MSCU', name: 'MSC' },
        'MSAU': { scac: 'MSCU', name: 'MSC' },
        
        // CMA CGM
        'CMAU': { scac: 'CMDU', name: 'CMA CGM' },
        'CGMU': { scac: 'CMDU', name: 'CMA CGM' },
        'BMOU': { scac: 'CMDU', name: 'CMA CGM' },
        'CMCU': { scac: 'CMDU', name: 'CMA CGM' },
        'CAIU': { scac: 'CMDU', name: 'CMA CGM' },
        'CGHU': { scac: 'CMDU', name: 'CMA CGM' },
        'CLHU': { scac: 'CMDU', name: 'CMA CGM' },
        'CMBU': { scac: 'CMDU', name: 'CMA CGM' },
        'CMDU': { scac: 'CMDU', name: 'CMA CGM' },
        'CMJU': { scac: 'CMDU', name: 'CMA CGM' },
        'CMNU': { scac: 'CMDU', name: 'CMA CGM' },
        'CMPU': { scac: 'CMDU', name: 'CMA CGM' },
        'CMTU': { scac: 'CMDU', name: 'CMA CGM' },
        'CMVU': { scac: 'CMDU', name: 'CMA CGM' },
        'CMXU': { scac: 'CMDU', name: 'CMA CGM' },
        'FSCU': { scac: 'CMDU', name: 'CMA CGM' },
        'GLDU': { scac: 'CMDU', name: 'CMA CGM' },
        'INKU': { scac: 'CMDU', name: 'CMA CGM' },
        'LARU': { scac: 'CMDU', name: 'CMA CGM' },
        
        // HAPAG-LLOYD
        'HLCU': { scac: 'HLCU', name: 'HAPAG-LLOYD' },
        'HLXU': { scac: 'HLCU', name: 'HAPAG-LLOYD' },
        'HLBU': { scac: 'HLCU', name: 'HAPAG-LLOYD' },
        'HPLU': { scac: 'HLCU', name: 'HAPAG-LLOYD' },
        'HDMU': { scac: 'HLCU', name: 'HAPAG-LLOYD' },
        'HLSU': { scac: 'HLCU', name: 'HAPAG-LLOYD' },
        
        // COSCO
        'COSU': { scac: 'COSU', name: 'COSCO' },
        'CXDU': { scac: 'COSU', name: 'COSCO' },
        'CBHU': { scac: 'COSU', name: 'COSCO' },
        'CCLU': { scac: 'COSU', name: 'COSCO' },
        'CSLU': { scac: 'COSU', name: 'COSCO' },
        'CSNU': { scac: 'COSU', name: 'COSCO' },
        'CSQU': { scac: 'COSU', name: 'COSCO' },
        'CSVU': { scac: 'COSU', name: 'COSCO' },
        'CSXU': { scac: 'COSU', name: 'COSCO' },
        'COHU': { scac: 'COSU', name: 'COSCO' },
        
        // EVERGREEN
        'EISU': { scac: 'EGLV', name: 'EVERGREEN' },
        'EGHU': { scac: 'EGLV', name: 'EVERGREEN' },
        'EGSU': { scac: 'EGLV', name: 'EVERGREEN' },
        'EMCU': { scac: 'EGLV', name: 'EVERGREEN' },
        'EITU': { scac: 'EGLV', name: 'EVERGREEN' },
        'EGMU': { scac: 'EGLV', name: 'EVERGREEN' },
        'EGLU': { scac: 'EGLV', name: 'EVERGREEN' },
        'EGFU': { scac: 'EGLV', name: 'EVERGREEN' },
        'EGDU': { scac: 'EGLV', name: 'EVERGREEN' },
        'EGCU': { scac: 'EGLV', name: 'EVERGREEN' },
        'EGBU': { scac: 'EGLV', name: 'EVERGREEN' },
        'UASU': { scac: 'EGLV', name: 'EVERGREEN' },
        
        // ONE (Ocean Network Express)
        'OOLU': { scac: 'ONEY', name: 'ONE' },
        'OOCU': { scac: 'ONEY', name: 'ONE' },
        'ONEU': { scac: 'ONEY', name: 'ONE' },
        'KAIU': { scac: 'ONEY', name: 'ONE' },
        'KOCU': { scac: 'ONEY', name: 'ONE' },
        'MOAU': { scac: 'ONEY', name: 'ONE' },
        'MOFU': { scac: 'ONEY', name: 'ONE' },
        'MOLU': { scac: 'ONEY', name: 'ONE' },
        'NYKU': { scac: 'ONEY', name: 'ONE' },
        
        // YANG MING
        'YMLU': { scac: 'YMLU', name: 'YANG MING' },
        'YMMU': { scac: 'YMLU', name: 'YANG MING' },
        'YMHU': { scac: 'YMLU', name: 'YANG MING' },
        'YMGU': { scac: 'YMLU', name: 'YANG MING' },
        'YMTU': { scac: 'YMLU', name: 'YANG MING' },
        
        // ZIM
        'ZIMU': { scac: 'ZIMU', name: 'ZIM' },
        'ZCSU': { scac: 'ZIMU', name: 'ZIM' },
        'ZILU': { scac: 'ZIMU', name: 'ZIM' },
        'ZIRU': { scac: 'ZIMU', name: 'ZIM' },
        
        // HMM (Hyundai)
        'HDMU': { scac: 'HDMU', name: 'HMM' },
        'HMMU': { scac: 'HDMU', name: 'HMM' },
        'HJMU': { scac: 'HDMU', name: 'HMM' },
        'HJCU': { scac: 'HDMU', name: 'HMM' },
        'HJLU': { scac: 'HDMU', name: 'HMM' },
        'HASU': { scac: 'HDMU', name: 'HMM' },
        
        // Altri carriers...
        'GESU': { scac: 'TEST', name: 'GENERIC' }
    };
    
    // Definisci detectTrackingType globalmente
    window.detectTrackingType = async function(trackingNumber) {
        if (!trackingNumber) return 'container';
        
        // Rimuovi spazi e converti in maiuscolo
        const cleaned = trackingNumber.trim().toUpperCase();
        
        // Pattern per container (4 lettere + 7 numeri)
        if (/^[A-Z]{4}\d{7}$/.test(cleaned)) {
            const prefix = cleaned.substring(0, 4);
            
            // Cerca nella mappa statica dei prefissi container
            if (CONTAINER_PREFIX_MAP[prefix]) {
                const carrier = CONTAINER_PREFIX_MAP[prefix];
                console.log(`🔍 Container detected: ${cleaned}, Carrier: ${carrier.name} (${carrier.scac})`);
                window._detectedCarrier = carrier.scac;
                window._detectedCarrierName = carrier.name;
            } else {
                console.log(`🔍 Container detected: ${cleaned}, Carrier: Unknown`);
                window._detectedCarrier = null;
                window._detectedCarrierName = null;
            }
            
            return 'container';
        }
        
        // Pattern per AWB (3 numeri + trattino opzionale + 8 numeri)
        if (/^(\d{3})-?(\d{8})$/.test(cleaned)) {
            const match = cleaned.match(/^(\d{3})-?(\d{8})$/);
            const prefix = match[1];
            
            // Carica airlines se non già caricate
            const airlines = await loadAirlines();
            
            if (airlines && airlines[prefix]) {
                const airline = airlines[prefix];
                console.log(`🔍 AWB detected: ${cleaned}, Airline: ${airline.name} (${airline.iata})`);
                window._detectedCarrier = airline.iata;
                window._detectedCarrierName = airline.name;
            } else {
                console.log(`🔍 AWB detected: ${cleaned}, Airline: Unknown`);
                window._detectedCarrier = null;
                window._detectedCarrierName = null;
            }
            
            return 'awb';
        }
        
        // Pattern per Bill of Lading
        if (/^[A-Z]{2,4}\d{6,12}$/.test(cleaned)) {
            return 'bl';
        }
        
        // Default
        return 'container';
    };
    
    // Fix per l'evento di auto-detection nel form progressive
    function enhanceAutoDetection() {
        // CONTROLLO RETRY COUNT
        if (enhanceRetryCount++ >= MAX_RETRIES) {
            console.log('⚠️ Max retries reached for enhanceAutoDetection');
            return;
        }
        
        const trackingInput = document.getElementById('enh_trackingNumber');
        const typeSelect = document.getElementById('enh_trackingType');
        const carrierSelect = document.getElementById('enh_carrier');
        
        if (!trackingInput || !typeSelect || !carrierSelect) {
            console.log(`⏳ Form elements not ready, retry ${enhanceRetryCount}/${MAX_RETRIES}...`);
            setTimeout(enhanceAutoDetection, RETRY_DELAY);
            return;
        }
        
        console.log('✅ Enhancing auto-detection on form elements');
        
        // Reset retry count on success
        enhanceRetryCount = 0;
        
        // Pre-carica airlines
        loadAirlines();
        
        // Aggiungi listener per auto-detection migliorata
        trackingInput.addEventListener('blur', async function() {
            const value = this.value.trim().toUpperCase();
            if (!value) return;
            
            console.log('🔍 Auto-detecting for:', value);
            
            // Rileva tipo (ora è async)
            const type = await window.detectTrackingType(value);
            
            // Se è container e abbiamo rilevato un carrier
            if (type === 'container' && window._detectedCarrier) {
                // Imposta il tipo
                if (typeSelect.value === 'auto') {
                    typeSelect.value = 'container';
                    typeSelect.dispatchEvent(new Event('change'));
                }
                
                // Aspetta che il select dei carrier si popoli
                setTimeout(() => {
                    // Cerca l'opzione del carrier
                    const carrierOption = Array.from(carrierSelect.options).find(opt => 
                        opt.value === window._detectedCarrier
                    );
                    
                    if (carrierOption) {
                        carrierSelect.value = window._detectedCarrier;
                        console.log('✅ Auto-selected carrier:', window._detectedCarrier);
                        
                        // Visual feedback
                        carrierSelect.style.borderColor = '#28a745';
                        setTimeout(() => {
                            carrierSelect.style.borderColor = '';
                        }, 2000);
                    }
                    
                    // Pulisci
                    window._detectedCarrier = null;
                }, 1000);
            }
        });
        
        // Supporta anche l'evento input per feedback immediato
        let detectionTimeout;
        trackingInput.addEventListener('input', function(e) {
            clearTimeout(detectionTimeout);
            const value = e.target.value.trim().toUpperCase();
            
            if (value.length < 11) return; // Container completo = 11 caratteri
            
            detectionTimeout = setTimeout(async () => {
                const type = await window.detectTrackingType(value);
                
                // Aggiorna visual feedback
                const statusEl = document.querySelector('.detection-status');
                if (statusEl) {
                    if (window._detectedCarrier) {
                        const icon = type === 'container' ? '🚢' : '✈️';
                        const carrier = window._detectedCarrierName || window._detectedCarrier;
                        statusEl.innerHTML = `
                            <i class="fas fa-check-circle status-icon" style="color: #28a745;"></i>
                            <span class="status-text">Rilevato: ${icon} ${carrier}</span>
                        `;
                    } else if (type !== 'container' && type !== 'awb') {
                        statusEl.innerHTML = `
                            <i class="fas fa-info-circle status-icon" style="color: #17a2b8;"></i>
                            <span class="status-text">Tipo: ${type === 'bl' ? '📄 Bill of Lading' : type}</span>
                        `;
                    }
                }
            }, 300);
        });
    }
    
    // Carica ocean carriers da ShipsGo v2
    async function loadOceanCarriers() {
        try {
            // Controlla cache
            const cached = localStorage.getItem('oceanCarriersCache');
            if (cached) {
                const data = JSON.parse(cached);
                if (data.timestamp && (Date.now() - data.timestamp) < CACHE_TTL) {
                    console.log('✅ Ocean carriers loaded from cache');
                    return data.carriers;
                }
            }
            
            // Se abbiamo il tracking service, carica da API v2
            if (window.trackingService && window.trackingService.hasApiKeys()) {
                console.log('🔄 Loading ocean carriers from ShipsGo v2...');
                
                const response = await fetch('/netlify/functions/shipsgo-proxy', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        version: 'v2',
                        endpoint: '/ocean/carriers',
                        method: 'GET'
                    })
                });
                
                const result = await response.json();
                
                if (result.success && result.data && result.data.carriers) {
                    const carriers = result.data.carriers;
                    
                    // Salva in cache
                    try {
                        localStorage.setItem('oceanCarriersCache', JSON.stringify({
                            carriers: carriers,
                            timestamp: Date.now()
                        }));
                    } catch (e) {
                        console.error('Error saving carriers cache:', e);
                    }
                    
                    console.log('✅ Loaded ocean carriers:', carriers.length);
                    return carriers;
                }
            }
            
            return [];
        } catch (error) {
            console.error('Error loading ocean carriers:', error);
            return [];
        }
    }
    
    // Pre-carica i dati all'avvio
    window.addEventListener('load', () => {
        enhanceAutoDetection();
        // Pre-carica airlines in background
        loadAirlines().catch(console.error);
        // Pre-carica ocean carriers in background
        loadOceanCarriers().catch(console.error);
    });
    
    // Carica cache da localStorage all'avvio
    try {
        const cached = localStorage.getItem('shippingLinesCache');
        if (cached) {
            const data = JSON.parse(cached);
            if (data.timestamp && (Date.now() - data.timestamp) < CACHE_TTL) {
                shippingLinesCache = data.data;
                cacheTimestamp = data.timestamp;
                console.log('✅ Shipping lines loaded from localStorage');
            }
        }
    } catch (e) {
        console.error('Error loading cache:', e);
    }
    
    // Debug helper
    window.debugDetectFix = function() {
        console.log('🔍 Detect Fix Debug:');
        console.log('- Container prefixes:', Object.keys(CONTAINER_PREFIX_MAP).length);
        console.log('- Airlines cached:', !!airlinesCache);
        console.log('- Airlines entries:', airlinesCache ? Object.keys(airlinesCache).length : 0);
        console.log('- Airlines cache age:', airlinesCacheTimestamp ? `${Math.round((Date.now() - airlinesCacheTimestamp) / 1000 / 60)} minutes` : 'N/A');
        console.log('- Detected carrier:', window._detectedCarrier);
        console.log('- Detected carrier name:', window._detectedCarrierName);
        console.log('- Enhance retry count:', enhanceRetryCount);
        console.log('- Max retries:', MAX_RETRIES);
        
        if (airlinesCache) {
            console.log('Sample airline prefixes:', Object.entries(airlinesCache).slice(0, 5).map(([k,v]) => `${k}: ${v.name}`));
        }
        
        console.log('Sample container prefixes:', Object.entries(CONTAINER_PREFIX_MAP).slice(0, 5).map(([k,v]) => `${k}: ${v.name}`));
        
        return {
            containerPrefixes: CONTAINER_PREFIX_MAP,
            airlinesCache: airlinesCache,
            hasTrackingService: !!window.trackingService,
            retryInfo: {
                current: enhanceRetryCount,
                max: MAX_RETRIES
            }
        };
    };
    
    console.log('✅ TRACKING DETECT FIX: Applied with ShipsGo integration (with retry limits)');
    
})();