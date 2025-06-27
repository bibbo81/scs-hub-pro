// tracking-fixes.js - Fix temporanei per tracking page
console.log('🔧 Loading tracking fixes...');

// ========== FIX IMMEDIATO PER ORGANIZATION API KEYS ==========
// Applica SUBITO, non aspettare DOMContentLoaded
(function() {
    console.log('🚀 [API Fix] Applying immediate fix...');
    
    // Attendi che il service sia disponibile
    const checkInterval = setInterval(() => {
        if (window.organizationApiKeysService) {
            clearInterval(checkInterval);
            
            if (!window.organizationApiKeysService.getOrganizationApiKeys) {
                console.log('🔧 [API Fix] Adding missing method NOW...');
                
                window.organizationApiKeysService.getOrganizationApiKeys = async function() {
                    try {
                        // Prova tutti i metodi possibili
                        if (this.getApiKeys) {
                            console.log('[API Fix] Using getApiKeys method');
                            return await this.getApiKeys();
                        }
                        
                        if (this.getOrganizationKeys) {
                            console.log('[API Fix] Using getOrganizationKeys method');
                            return await this.getOrganizationKeys();
                        }
                        
                        if (this.getKeys) {
                            console.log('[API Fix] Using getKeys method');
                            return await this.getKeys();
                        }
                        
                        // Fallback diretto a Supabase
                        if (window.supabase) {
    console.log('[API Fix] Using direct Supabase query');
    const { data: { user } } = await window.supabase.auth.getUser();
    if (!user) return null;
    
    // Gestisci MULTIPLE API keys (V1 e V2)
    const { data: apiKeys, error } = await window.supabase
        .from('organization_api_keys')
        .select('*');
        
    if (error) {
        console.error('[API Fix] Supabase error:', error);
        return null;
    }
    
    if (!apiKeys || apiKeys.length === 0) {
        console.log('[API Fix] No API keys found');
        return null;
    }
    
    console.log('[API Fix] Found', apiKeys.length, 'API keys');
    
    // Se tracking service si aspetta array, ritorna array
    // Se si aspetta oggetto singolo, ritorna il primo
    // Per ora ritorniamo tutto l'array
    return apiKeys;
}
                        
                        console.warn('[API Fix] No method available');
                        return null;
                    } catch (error) {
                        console.error('[API Fix] Error:', error);
                        return null;
                    }
                };
                
                console.log('✅ [API Fix] Method added IMMEDIATELY');
            } else {
                console.log('✅ [API Fix] Method already exists');
            }
        }
    }, 10); // Check ogni 10ms
    
    // Timeout dopo 2 secondi
    setTimeout(() => clearInterval(checkInterval), 2000);
})();

// ========== FIX 1: IMPORT EXCEL ==========
window.detectShipsGoType = function(content) {
    // QUESTO RESTA UGUALE - NON MODIFICARE
    const headers = content.split('\n')[0].toLowerCase();
    
    if (headers.includes('awb number') || 
        headers.includes('airline') || 
        headers.includes('ts count') ||
        headers.includes('transit time')) {
        return 'air';
    }
    
    if (headers.includes('container count') || 
        headers.includes('port of loading') || 
        headers.includes('port of discharge') ||
        headers.includes('co2 emission')) {
        return 'sea';
    }
    
    return 'generic';
};

// Fix handleImport per compatibilità con vecchio sistema
window.handleImportFixed = async function(file) {
    if (!file) return;
    
    try {
        console.log('[Import Fix] Starting file import:', file.name);
        
        window.NotificationSystem?.info('Caricamento file in corso...', { duration: 0, id: 'import-loading' });
        
        // Leggi contenuto per tipo
        const fileContent = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
        
        const shipsgoType = window.detectShipsGoType(fileContent);
        console.log('[Import Fix] Detected ShipsGo type:', shipsgoType);
        
        // Status mapping COMPLETO dal Google Sheets
        const STATUS_MAPPING = {
            // MARE - Stati inglesi
            'Sailing': 'in_transit',
            'Arrived': 'arrived',
            'Delivered': 'delivered',
            'Discharged': 'arrived',
            
            // CORRIERI - Stati italiani
            'LA spedizione è stata consegnata': 'delivered',
            'Consegnata.': 'delivered',
            'La spedizione è stata consegnata': 'delivered',
            'Consegna prevista nel corso della giornata odierna.': 'out_for_delivery',
            'La spedizione è in consegna': 'out_for_delivery',
            'La spedizione è in transito': 'in_transit',
            'Arrivata nella Sede GLS locale.': 'in_transit',
            'In transito.': 'in_transit',
            'Partita dalla sede mittente. In transito.': 'in_transit',
            'La spedizione e\' stata creata dal mittente, attendiamo che ci venga affidata per l\'invio a destinazione.': 'registered',
            
            // FEDEX - Stati inglesi
            'On FedEx vehicle for delivery': 'out_for_delivery',
            'At local FedEx facility': 'in_transit',
            'Departed FedEx hub': 'in_transit',
            'On the way': 'in_transit',
            'Arrived at FedEx hub': 'in_transit',
            'At destination sort facility': 'in_transit',
            'Left FedEx origin facility': 'in_transit',
            'Picked up': 'in_transit',
            'Shipment information sent to FedEx': 'registered',
            'International shipment release - Import': 'customs_cleared',
            
            // Altri stati comuni
            'Empty': 'delivered',
            'Empty Returned': 'delivered',
            'POD': 'delivered',
            'Registered': 'registered',
            'Pending': 'registered',
            'Booked': 'registered',
            'Booking Confirmed': 'registered',
            
            // Mapping italiano -> stato sistema
            'In transito': 'in_transit',
            'Arrivata': 'arrived',
            'Consegnato': 'delivered',
            'Scaricato': 'arrived',
            'In consegna': 'out_for_delivery',
            'Sdoganata': 'customs_cleared',
            'Spedizione creata': 'registered'
        };
        
        if (window.ImportManager && window.ImportManager.importFile) {
            const result = await window.ImportManager.importFile(file, {
                updateExisting: false,
                shipsgoType: shipsgoType,
                statusMapping: STATUS_MAPPING
            });
            
            console.log('[Import Fix] Result:', result);
            
            window.NotificationSystem?.dismiss('import-loading');
            
            if (result && result.success) {
                window.NotificationSystem?.success(`Importati ${result.stats?.imported || 0} tracking`);
                
                if (window.trackingDebug?.refresh) {
                    setTimeout(() => window.trackingDebug.refresh(), 500);
                }
                
                // Close modal
                setTimeout(() => {
                    const closeBtn = document.querySelector('.custom-modal-close');
                    if (closeBtn) closeBtn.click();
                }, 1000);
            } else {
                window.NotificationSystem?.error('Errore durante l\'import');
            }
        } else {
            throw new Error('ImportManager non disponibile');
        }
        
    } catch (error) {
        console.error('[Import Fix] Error:', error);
        window.NotificationSystem?.dismiss('import-loading');
        window.NotificationSystem?.error('Errore: ' + error.message);
    }
};

// ========== FIX 3: PROGRESSIVE FORM TIMEOUT ==========
function fixProgressiveFormTimeout() {
    // Override showAddTrackingForm per rimuovere timeout warning
    const originalShow = window.showAddTrackingForm;
    window.showAddTrackingForm = function() {
        console.log('[Form Fix] Opening tracking form...');
        
        if (window.showWorkflowProgress) {
            window.showWorkflowProgress();
        } else if (window.showEnhancedTrackingForm) {
            window.showEnhancedTrackingForm();
        } else if (window.trackingFormProgressive?.show) {
            window.trackingFormProgressive.show();
        } else {
            // No timeout warning, just try again
            setTimeout(() => {
                if (window.showWorkflowProgress) {
                    window.showWorkflowProgress();
                } else {
                    console.error('[Form Fix] Form still not available');
                }
            }, 100);
        }
    };
}

// ========== FIX 4: IMPORT MANAGER INTEGRATION ==========
function fixImportManager() {
    if (window.ImportManager && !window.ImportManager.handleImport) {
        window.ImportManager.handleImport = window.handleImportFixed;
        console.log('✅ [Import Fix] handleImport added to ImportManager');
    }
}

// ========== FIX 5: FILE INPUT INTERCEPTOR ==========
function setupFileInputInterceptor() {
    document.addEventListener('change', async (e) => {
        if (e.target.type === 'file' && e.target.accept?.includes('xlsx')) {
            const file = e.target.files[0];
            if (file && (file.name.includes('shipsgo') || file.name.includes('shipments'))) {
                console.log('📎 [Import Fix] Intercepting ShipsGo file:', file.name);
                e.preventDefault();
                e.stopPropagation();
                e.target.value = ''; // Reset for re-selection
                await window.handleImportFixed(file);
            }
        }
    }, true);
}

// ========== APPLY ALL FIXES ==========
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Applying tracking fixes...');
    
    // Wait a bit for modules to load
    setTimeout(async () => {
        fixProgressiveFormTimeout();
        fixImportManager();
        setupFileInputInterceptor();
        
        console.log('✅ All tracking fixes applied');
    }, 2000);
});

// ========== DEBUG UTILITIES ==========
window.debugExcelFile = async function(file) {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    console.log('📊 Excel Debug:');
    console.log('- File:', file.name);
    console.log('- Size:', file.size, 'bytes');
    console.log('- Sheets:', workbook.SheetNames);
    
    workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        console.log(`\nSheet "${sheetName}":`);
        console.log('- Headers:', data[0]);
        console.log('- Rows:', data.length);
        console.log('- First data row:', data[1]);
    });
};

// Aggiungi questa funzione dopo gli altri fix
function fixProgressiveFormInit() {
    // Forza l'inizializzazione del form se non parte
    if (window.trackingFormProgressive && !window.trackingFormProgressive.initialized) {
        console.log('🔧 [Form Fix] Force initializing progressive form...');
        
        // Simula che showAddTrackingForm sia già presente
        if (!window.showAddTrackingForm) {
            window.showAddTrackingForm = function() {
                console.log('[Form Fix] Dummy showAddTrackingForm');
            };
        }
        
        // Forza init
        if (window.trackingFormProgressive.init) {
            window.trackingFormProgressive.init();
        }
    }
}

// Nel DOMContentLoaded, aggiungi:
setTimeout(() => {
    fixProgressiveFormInit();  // ← AGGIUNGI QUESTA CHIAMATA
}, 3000);

console.log('✅ Tracking fixes loaded. Debug with: debugExcelFile(file)');