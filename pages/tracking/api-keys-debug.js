// api-keys-debug.js - Debug e fix per API keys ShipsGo

(function() {
    'use strict';
    
    console.log('🔍 API Keys Debug Starting...');
    
    // Funzione di debug per verificare lo stato delle API keys
    window.debugApiKeys = async function() {
        console.log('🔍 === API KEYS DEBUG ===');
        
        // 1. Controlla organizationApiKeysService
        if (window.organizationApiKeysService) {
            console.log('✅ organizationApiKeysService exists');
            
            // Prova tutti i metodi possibili
            const methods = [
                'getApiKeys',
                'getOrganizationApiKeys',
                'loadApiKeys',
                'getKeys'
            ];
            
            for (const method of methods) {
                if (typeof window.organizationApiKeysService[method] === 'function') {
                    console.log(`📌 Trying method: ${method}`);
                    try {
                        const keys = await window.organizationApiKeysService[method]();
                        console.log(`✅ ${method} result:`, keys);
                        
                        if (keys && keys.length > 0) {
                            console.log('🔑 Found keys:', keys);
                        }
                    } catch (error) {
                        console.error(`❌ ${method} error:`, error);
                    }
                }
            }
        } else {
            console.error('❌ organizationApiKeysService not found');
        }
        
        // 2. Controlla Supabase direttamente
        if (window.supabase) {
            console.log('📊 Checking Supabase directly...');
            
            try {
                // Ottieni user corrente
                const { data: { user } } = await window.supabase.auth.getUser();
                console.log('👤 Current user:', user?.id);
                
                if (user) {
                    // Controlla organization membership
                    const { data: membership } = await window.supabase
                        .from('organization_members')
                        .select('organization_id')
                        .eq('user_id', user.id)
                        .single();
                    
                    console.log('🏢 Organization membership:', membership);
                    
                    if (membership?.organization_id) {
                        // Cerca API keys dell'organizzazione
                        const { data: orgKeys, error } = await window.supabase
                            .from('organization_api_keys')
                            .select('*')
                            .eq('organization_id', membership.organization_id);
                        
                        if (error) {
                            console.error('❌ Error loading org keys:', error);
                        } else {
                            console.log('🔑 Organization API keys:', orgKeys);
                        }
                    }
                    
                    // Controlla anche personal API keys
                    const { data: personalKeys } = await window.supabase
                        .from('organization_api_keys')
                        .select('*')
                        .eq('user_id', user.id);
                    
                    console.log('🔑 Personal API keys:', personalKeys);
                }
            } catch (error) {
                console.error('❌ Supabase error:', error);
            }
        }
        
        // 3. Controlla tracking service
        if (window.trackingService) {
            console.log('🚢 Checking tracking service...');
            console.log('- Initialized:', window.trackingService.initialized);
            console.log('- Mock mode:', window.trackingService.mockMode);
            console.log('- API config:', window.trackingService.apiConfig);
            console.log('- Has API keys:', window.trackingService.hasApiKeys());
        }
        
        // 4. Controlla localStorage
        console.log('💾 Checking localStorage...');
        const localKeys = Object.keys(localStorage).filter(k => 
            k.includes('api') || k.includes('key') || k.includes('shipsgo')
        );
        localKeys.forEach(key => {
            console.log(`- ${key}:`, localStorage.getItem(key));
        });
        
        return {
            hasOrganizationService: !!window.organizationApiKeysService,
            hasTrackingService: !!window.trackingService,
            trackingServiceInitialized: window.trackingService?.initialized,
            mockMode: window.trackingService?.mockMode,
            hasApiKeys: window.trackingService?.hasApiKeys()
        };
    };
    
    // Funzione per salvare API keys manualmente
    window.saveShipsGoApiKeys = async function(authCode) {
        console.log('💾 Saving ShipsGo API keys...');
        
        if (!authCode) {
            authCode = prompt('Inserisci il tuo ShipsGo Auth Code:');
            if (!authCode) return;
        }
        
        try {
            // Ottieni user e organization
            const { data: { user } } = await window.supabase.auth.getUser();
            if (!user) {
                throw new Error('User not authenticated');
            }
            
            // Ottieni organization
            const { data: membership } = await window.supabase
                .from('organization_members')
                .select('organization_id')
                .eq('user_id', user.id)
                .single();
            
            if (!membership?.organization_id) {
                throw new Error('No organization found');
            }
            
            // Salva in organization_api_keys
            const { data, error } = await window.supabase
                .from('organization_api_keys')
                .upsert({
                    organization_id: membership.organization_id,
                    service_name: 'shipsgo',
                    api_key: JSON.stringify({
                        authCode: authCode,
                        v1: { authCode: authCode }
                    }),
                    created_by: user.id,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'organization_id,service_name'
                });
            
            if (error) {
                console.error('❌ Error saving:', error);
                throw error;
            }
            
            console.log('✅ API keys saved:', data);
            
            // Forza reload del tracking service
            if (window.trackingService) {
                window.trackingService.mockMode = false;
                await window.trackingService.initialize();
                console.log('✅ Tracking service reinitialized');
            }
            
            window.NotificationSystem?.success('API Keys salvate con successo!');
            
            // Ricarica la pagina per applicare le modifiche
            setTimeout(() => {
                if (confirm('Ricaricare la pagina per applicare le modifiche?')) {
                    location.reload();
                }
            }, 1000);
            
        } catch (error) {
            console.error('❌ Save error:', error);
            window.NotificationSystem?.error('Errore nel salvataggio: ' + error.message);
        }
    };
    
    // Funzione per testare API con keys salvate
    window.testShipsGoApi = async function(trackingNumber) {
        if (!trackingNumber) {
            trackingNumber = prompt('Inserisci un numero di tracking da testare:');
            if (!trackingNumber) return;
        }
        
        console.log('🧪 Testing ShipsGo API with:', trackingNumber);
        
        try {
            // Prima assicurati che tracking service sia inizializzato
            if (!window.trackingService?.initialized) {
                console.log('🔄 Initializing tracking service...');
                await window.trackingService?.initialize();
            }
            
            // Forza mock mode OFF
            if (window.trackingService) {
                window.trackingService.mockMode = false;
            }
            
            // Prova a trackare
            const result = await window.trackingService.track(trackingNumber, 'container');
            console.log('✅ API Test result:', result);
            
            if (result.status === 'error') {
                console.error('❌ API returned error:', result.message);
            } else {
                window.NotificationSystem?.success('API test completato!');
            }
            
            return result;
            
        } catch (error) {
            console.error('❌ API test error:', error);
            window.NotificationSystem?.error('Test fallito: ' + error.message);
            throw error;
        }
    };
    
    // Auto-debug al caricamento
    setTimeout(async () => {
        console.log('🔍 Running auto-debug...');
        const debugResult = await window.debugApiKeys();
        
        if (!debugResult.hasApiKeys) {
            console.warn('⚠️ No API keys found!');
            console.log('💡 Use window.saveShipsGoApiKeys("YOUR_AUTH_CODE") to save keys');
            console.log('💡 Or use window.configureShipsGoV2() for v2 API');
        }
    }, 2000);
    
    // Aggiungi comando help
    window.apiKeysHelp = function() {
        console.log(`
🔑 === API Keys Help ===

Comandi disponibili:

1. window.debugApiKeys()
   - Mostra stato completo delle API keys

2. window.saveShipsGoApiKeys("YOUR_AUTH_CODE")
   - Salva le API keys ShipsGo nell'organizzazione

3. window.testShipsGoApi("CONTAINER_NUMBER")
   - Testa le API con un tracking reale

4. window.configureShipsGoV2()
   - Configura le nuove API v2.0

Esempio completo:
1. window.saveShipsGoApiKeys("abc123")
2. window.testShipsGoApi("MSCU1234567")

Per ottenere l'auth code ShipsGo:
- Vai su https://shipsgo.com
- Login → Settings → API
- Copia il tuo Auth Code
        `);
    };
    
    console.log('✅ API Keys debug loaded');
    console.log('💡 Type window.apiKeysHelp() for help');
    
})();