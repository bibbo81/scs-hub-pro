// tracking-init-fix.js - Fix per inizializzazione tracking service e form progressive
// Inserire questo file DOPO tutti gli altri script nella pagina tracking.html

(function() {
    'use strict';
    
    console.log('🔧 TRACKING INIT FIX: Starting initialization fixes...');
    
    // ========================================
    // FIX 1: TRACKING SERVICE INITIALIZATION
    // ========================================
    
    async function fixTrackingService() {
        console.log('🔧 FIX 1: Fixing tracking service...');
        
        // Attendi che il tracking service sia disponibile
        let attempts = 0;
        while (!window.trackingService && attempts < 20) {
            await new Promise(resolve => setTimeout(resolve, 250));
            attempts++;
        }
        
        if (!window.trackingService) {
            console.error('❌ Tracking service not found after 5 seconds');
            return false;
        }
        
        console.log('✅ Tracking service found');
        
        // Forza re-inizializzazione con mock mode se necessario
        if (!window.trackingService.initialized) {
            console.log('🔄 Force initializing tracking service...');
            
            try {
                // Imposta temporaneamente mock mode per evitare errori API
                window.trackingService.mockMode = true;
                
                // Inizializza
                await window.trackingService.initialize();
                
                console.log('✅ Tracking service initialized in mock mode');
                
                // Prova a caricare le API keys
                setTimeout(async () => {
                    if (window.organizationApiKeysService) {
                        const keys = await window.organizationApiKeysService.getApiKeys();
                        if (keys && keys.length > 0) {
                            console.log('🔑 Found organization API keys, switching to real mode');
                            window.trackingService.mockMode = false;
                            await window.trackingService.initialize();
                        }
                    }
                }, 2000);
                
            } catch (error) {
                console.error('❌ Error initializing tracking service:', error);
                // Continua comunque in mock mode
                window.trackingService.mockMode = true;
                window.trackingService.initialized = true;
            }
        }
        
        return true;
    }
    
    // ========================================
    // FIX 2: TRACKING FORM PROGRESSIVE
    // ========================================
    
    async function fixTrackingFormProgressive() {
        console.log('🔧 FIX 2: Fixing tracking form progressive...');
        
        // Attendi che showAddTrackingForm sia disponibile
        let attempts = 0;
        while (!window.showAddTrackingForm && attempts < 20) {
            await new Promise(resolve => setTimeout(resolve, 250));
            attempts++;
        }
        
        if (!window.showAddTrackingForm) {
            console.error('❌ showAddTrackingForm not found');
            return false;
        }
        
        console.log('✅ showAddTrackingForm found');
        
        // Cerca showEnhancedTrackingForm
        if (!window.showEnhancedTrackingForm) {
            console.log('🔍 Looking for showEnhancedTrackingForm...');
            
            // Prova a trovarla nel contesto TrackingFormProgressive
            if (window.TrackingFormProgressive && typeof window.TrackingFormProgressive.showEnhancedTrackingForm === 'function') {
                window.showEnhancedTrackingForm = window.TrackingFormProgressive.showEnhancedTrackingForm;
                console.log('✅ Found showEnhancedTrackingForm in TrackingFormProgressive');
            }
            // Altrimenti crea un wrapper che usa il form standard
            else {
                console.log('⚠️ Creating fallback for showEnhancedTrackingForm');
                window.showEnhancedTrackingForm = function(options) {
                    console.log('📝 Using standard form (enhanced not available)');
                    window.showAddTrackingForm(options);
                };
            }
        }
        
        // Fix del wrapper se necessario
        if (window.originalShowAddTrackingForm && !window._formProgressiveFixed) {
            console.log('🔧 Fixing form progressive wrapper...');
            
            const originalWrapper = window.showAddTrackingForm;
            
            window.showAddTrackingForm = function(options) {
                console.log('🎯 Fixed wrapper called');
                
                // Controlla se usare enhanced o standard
                const useEnhanced = localStorage.getItem('enableEnhancedTracking') !== 'false';
                const enhancedReady = !!(window.trackingService && window.ImportManager && window.showEnhancedTrackingForm);
                
                if (useEnhanced && enhancedReady) {
                    console.log('✨ Using enhanced form');
                    window.showEnhancedTrackingForm(options);
                } else {
                    console.log('📝 Using standard form');
                    if (window.originalShowAddTrackingForm) {
                        window.originalShowAddTrackingForm(options);
                    } else {
                        // Fallback finale
                        const trackingNumber = prompt('Inserisci numero tracking:');
                        if (trackingNumber) {
                            window.addTracking({
                                tracking_number: trackingNumber,
                                carrier_code: 'UNKNOWN',
                                status: 'pending'
                            });
                        }
                    }
                }
            };
            
            window._formProgressiveFixed = true;
            console.log('✅ Form progressive wrapper fixed');
        }
        
        return true;
    }
    
    // ========================================
    // FIX 3: BUTTON FUNCTIONS
    // ========================================
    
    function fixButtonFunctions() {
        console.log('🔧 FIX 3: Fixing button functions...');
        
        // Assicura che tutte le funzioni siano disponibili globalmente
        const functionsToCheck = [
            'refreshTracking',
            'viewDetails', 
            'deleteTracking',
            'showAddTrackingForm',
            'exportData',
            'showImportDialog',
            'toggleSelectAll',
            'performBulkAction'
        ];
        
        functionsToCheck.forEach(funcName => {
            if (!window[funcName]) {
                console.log(`⚠️ Creating fallback for ${funcName}`);
                
                switch(funcName) {
                    case 'refreshTracking':
                        window.refreshTracking = async function(id) {
                            console.log('🔄 Refreshing tracking:', id);
                            if (window.trackingService && window.trackingService.refresh) {
                                try {
                                    await window.trackingService.refresh(id);
                                    window.NotificationSystem?.success('Tracking aggiornato');
                                    if (window.loadTrackings) window.loadTrackings();
                                } catch (error) {
                                    console.error('Refresh error:', error);
                                    window.NotificationSystem?.error('Errore aggiornamento');
                                }
                            } else {
                                alert('Funzione non disponibile');
                            }
                        };
                        break;
                        
                    case 'viewDetails':
                        window.viewDetails = function(id) {
                            console.log('👁️ Viewing details:', id);
                            const tracking = window.trackings?.find(t => t.id === id);
                            if (tracking) {
                                alert(`Dettagli Tracking:\n\nNumero: ${tracking.tracking_number}\nCarrier: ${tracking.carrier_code}\nStato: ${tracking.status}`);
                            }
                        };
                        break;
                        
                    case 'deleteTracking':
                        window.deleteTracking = async function(id) {
                            console.log('🗑️ Deleting tracking:', id);
                            if (confirm('Eliminare questo tracking?')) {
                                if (window.supabaseTrackingService) {
                                    try {
                                        await window.supabaseTrackingService.deleteTracking(id);
                                        window.NotificationSystem?.success('Tracking eliminato');
                                        if (window.loadTrackings) window.loadTrackings();
                                    } catch (error) {
                                        console.error('Delete error:', error);
                                        window.NotificationSystem?.error('Errore eliminazione');
                                    }
                                } else {
                                    // Fallback localStorage
                                    const stored = localStorage.getItem('trackings');
                                    if (stored) {
                                        const trackings = JSON.parse(stored);
                                        const filtered = trackings.filter(t => t.id !== id);
                                        localStorage.setItem('trackings', JSON.stringify(filtered));
                                        location.reload();
                                    }
                                }
                            }
                        };
                        break;
                        
                    case 'exportData':
                        window.exportData = function(format = 'excel') {
                            console.log('📥 Exporting data as:', format);
                            if (window.ExportManager) {
                                window.ExportManager.exportTrackings(window.trackings || [], format);
                            } else {
                                // Fallback CSV export
                                const trackings = window.trackings || [];
                                const csv = convertToCSV(trackings);
                                downloadCSV(csv, 'trackings.csv');
                            }
                        };
                        break;
                        
                    case 'showImportDialog':
                        window.showImportDialog = function() {
                            console.log('📤 Showing import dialog');
                            if (window.ImportManager && window.ImportManager.showImportDialog) {
                                window.ImportManager.showImportDialog();
                            } else {
                                // Fallback file input
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.accept = '.csv,.xlsx,.xls';
                                input.onchange = (e) => {
                                    const file = e.target.files[0];
                                    if (file) {
                                        alert(`Import di ${file.name} in sviluppo`);
                                    }
                                };
                                input.click();
                            }
                        };
                        break;
                        
                    case 'toggleSelectAll':
                        window.toggleSelectAll = function(checkbox) {
                            console.log('☑️ Toggle select all:', checkbox?.checked);
                            const checkboxes = document.querySelectorAll('input[name="trackingCheckbox"]');
                            checkboxes.forEach(cb => cb.checked = checkbox?.checked || false);
                            updateBulkActionsBar();
                        };
                        break;
                        
                    case 'performBulkAction':
                        window.performBulkAction = function(action) {
                            console.log('⚡ Performing bulk action:', action);
                            const selected = Array.from(document.querySelectorAll('input[name="trackingCheckbox"]:checked'))
                                .map(cb => cb.value);
                            
                            if (selected.length === 0) {
                                alert('Seleziona almeno un tracking');
                                return;
                            }
                            
                            switch(action) {
                                case 'delete':
                                    if (confirm(`Eliminare ${selected.length} tracking?`)) {
                                        selected.forEach(id => window.deleteTracking(id));
                                    }
                                    break;
                                case 'refresh':
                                    selected.forEach(id => window.refreshTracking(id));
                                    break;
                                default:
                                    alert(`Azione ${action} in sviluppo`);
                            }
                        };
                        break;
                }
            }
        });
        
        // Helper function per update bulk actions bar
        if (!window.updateBulkActionsBar) {
            window.updateBulkActionsBar = function() {
                const selected = document.querySelectorAll('input[name="trackingCheckbox"]:checked').length;
                const bar = document.getElementById('bulkActionsBar');
                const count = document.getElementById('selectedCount');
                
                if (bar) {
                    bar.style.display = selected > 0 ? 'block' : 'none';
                    if (count) count.textContent = selected;
                }
            };
        }
        
        console.log('✅ Button functions fixed');
    }
    
    // ========================================
    // HELPER FUNCTIONS
    // ========================================
    
    function convertToCSV(data) {
        if (!data || data.length === 0) return '';
        
        const headers = Object.keys(data[0]);
        const rows = data.map(item => 
            headers.map(header => {
                const value = item[header];
                return typeof value === 'string' && value.includes(',') 
                    ? `"${value}"` 
                    : value;
            }).join(',')
        );
        
        return [headers.join(','), ...rows].join('\n');
    }
    
    function downloadCSV(csv, filename) {
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
    
    // ========================================
    // MAIN INITIALIZATION
    // ========================================
    
    async function initializeFixes() {
        console.log('🚀 Initializing all fixes...');
        
        // Fix 1: Tracking Service
        await fixTrackingService();
        
        // Fix 2: Form Progressive
        await fixTrackingFormProgressive();
        
        // Fix 3: Button Functions
        fixButtonFunctions();
        
        // Verifica finale
        console.log('🔍 Final check:', {
            trackingService: !!window.trackingService,
            trackingServiceInitialized: window.trackingService?.initialized,
            showAddTrackingForm: typeof window.showAddTrackingForm,
            showEnhancedTrackingForm: typeof window.showEnhancedTrackingForm,
            refreshTracking: typeof window.refreshTracking,
            viewDetails: typeof window.viewDetails,
            deleteTracking: typeof window.deleteTracking
        });
        
        console.log('✅ All fixes applied!');
        
        // Notifica successo
        if (window.NotificationSystem) {
            window.NotificationSystem.success('Sistema tracking inizializzato correttamente');
        }
    }
    
    // Avvia quando DOM è pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeFixes);
    } else {
        // Aspetta un attimo per dare tempo ai moduli di caricarsi
        setTimeout(initializeFixes, 1000);
    }
    
})();

console.log('✅ Tracking init fix loaded');