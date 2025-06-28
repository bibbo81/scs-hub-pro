// api-keys-permanent-fix.js - Fix permanente per le API keys di organization-api-keys-service
// Questo file sistema definitivamente il metodo mancante per caricare le API keys dall'organizzazione

(function() {
    'use strict';
    
    console.log('🔧 [Permanent Fix] Applying organization API keys fix...');
    
    // Aspetta che organizationApiKeysService sia disponibile
    const waitForService = setInterval(() => {
        if (window.organizationApiKeysService) {
            clearInterval(waitForService);
            applyFix();
        }
    }, 100);
    
    function applyFix() {
        // Fix per il metodo getOrganizationApiKeys mancante/non funzionante
        if (!window.organizationApiKeysService.getOrganizationApiKeys || 
            window.organizationApiKeysService.getOrganizationApiKeys.toString().includes('return null')) {
            
            console.log('🔧 [Permanent Fix] Patching getOrganizationApiKeys method...');
            
            window.organizationApiKeysService.getOrganizationApiKeys = async function() {
                try {
                    // Ottieni l'organizzazione corrente
                    const org = await this.getCurrentOrganization();
                    if (!org) {
                        console.log('[Permanent Fix] No organization found');
                        return [];
                    }
                    
                    // Carica le API keys dell'organizzazione
                    const { data: keys, error } = await window.supabase
                        .from('organization_api_keys')
                        .select('*')
                        .eq('organization_id', org.id)
                        .eq('is_active', true);
                    
                    if (error) {
                        console.error('[Permanent Fix] Error loading org keys:', error);
                        return [];
                    }
                    
                    console.log('[Permanent Fix] Found org API keys:', keys?.length || 0);
                    
                    // Mappa le keys nel formato atteso dal tracking service
                    return (keys || []).map(key => {
                        let apiKeyValue = key.api_key;
                        
                        // Decripta Base64 (come fa il service originale)
                        if (apiKeyValue && /^[A-Za-z0-9+/=]+$/.test(apiKeyValue)) {
                            try {
                                apiKeyValue = atob(apiKeyValue);
                            } catch (e) {
                                console.warn('[Permanent Fix] Failed to decode key:', e);
                            }
                        }
                        
                        // Se è JSON, parsalo
                        if (typeof apiKeyValue === 'string' && apiKeyValue.startsWith('{')) {
                            try {
                                apiKeyValue = JSON.parse(apiKeyValue);
                                apiKeyValue = apiKeyValue.authCode || apiKeyValue.userToken || apiKeyValue;
                            } catch (e) {
                                // Non è JSON, usa come stringa
                            }
                        }
                        
                        // Ritorna nel formato che tracking-service si aspetta
                        return {
                            provider: key.provider || key.service_name,
                            api_key: apiKeyValue,
                            service_name: key.service_name,
                            is_active: key.is_active
                        };
                    });
                    
                } catch (error) {
                    console.error('[Permanent Fix] Error in getOrganizationApiKeys:', error);
                    return [];
                }
            };
            
            console.log('✅ [Permanent Fix] getOrganizationApiKeys method patched successfully');
            
            // Se il tracking service è già inizializzato ma in mock mode, prova a reinizializzarlo
            if (window.trackingService && 
                window.trackingService.initialized && 
                window.trackingService.mockMode && 
                !window.trackingService.hasApiKeys()) {
                
                console.log('🔄 [Permanent Fix] Reinitializing tracking service...');
                
                setTimeout(async () => {
                    try {
                        await window.trackingService.reinitialize();
                        
                        if (!window.trackingService.mockMode && window.trackingService.hasApiKeys()) {
                            console.log('✅ [Permanent Fix] Tracking service now has API keys!');
                            
                            // Dispatch evento per notificare che le API keys sono pronte
                            window.dispatchEvent(new CustomEvent('apiKeysReady', {
                                detail: {
                                    hasV1: !!window.trackingService.apiConfig?.v1?.authCode,
                                    hasV2: !!window.trackingService.apiConfig?.v2?.userToken
                                }
                            }));
                        }
                    } catch (error) {
                        console.error('[Permanent Fix] Error reinitializing tracking service:', error);
                    }
                }, 2000); // Aspetta 2 secondi per essere sicuri che tutto sia caricato
            }
        } else {
            console.log('✅ [Permanent Fix] getOrganizationApiKeys already working correctly');
        }
        
        // Aggiungi anche un metodo di utility per verificare lo stato
        window.checkApiKeysStatus = function() {
            const status = {
                organizationService: !!window.organizationApiKeysService,
                hasGetMethod: !!window.organizationApiKeysService?.getOrganizationApiKeys,
                trackingService: !!window.trackingService,
                mockMode: window.trackingService?.mockMode,
                hasApiKeys: window.trackingService?.hasApiKeys(),
                apiConfig: {
                    v1: !!window.trackingService?.apiConfig?.v1?.authCode,
                    v2: !!window.trackingService?.apiConfig?.v2?.userToken
                }
            };
            
            console.table(status);
            return status;
        };
        
        console.log('✅ [Permanent Fix] All fixes applied. Use window.checkApiKeysStatus() to verify.');
    }
    
})();