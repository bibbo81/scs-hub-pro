// fix-api-keys-format.js - Fix per il formato delle API keys ShipsGo nel database

(async function() {
    'use strict';
    
    console.log('🔧 API Keys Format Fix Starting...');
    
    // Configurazione
    const CONFIG = {
        organizationId: '3f3c5128-612f-42b1-a4c7-170668df884a',
        shipsgoV1Key: '2dc0c6d92ccb59e7d903825c4ebeb521',
        shipsgoV2Token: '505751c2-2745-4d83-b4e7-d35ccddd0628'
    };
    
    // Funzione principale per sistemare le API keys
    window.fixApiKeysFormat = async function() {
        console.log('🚀 Fixing API keys format in database...');
        
        try {
            // 1. Verifica autenticazione
            const { data: { user } } = await window.supabase.auth.getUser();
            if (!user) {
                throw new Error('User not authenticated');
            }
            console.log('✅ User authenticated:', user.email);
            
            // 2. Verifica membership nell'organizzazione
            const { data: membership } = await window.supabase
                .from('organization_members')
                .select('role')
                .eq('user_id', user.id)
                .eq('organization_id', CONFIG.organizationId)
                .single();
                
            if (!membership) {
                throw new Error('User not member of organization');
            }
            console.log('✅ User role:', membership.role);
            
            // 3. Sistema le API keys usando il formato che organization-api-keys-service si aspetta
            console.log('📝 Updating API keys with correct format...');
            
            // IMPORTANTE: organization-api-keys-service usa btoa per criptare,
            // quindi dobbiamo salvare la chiave RAW, non JSON
            
            // ShipsGo V1 - provider deve essere 'shipsgo_v1' per matching in tracking-service
            const v1Data = {
                organization_id: CONFIG.organizationId,
                provider: 'shipsgo_v1', // IMPORTANTE: deve matchare con tracking-service
                api_key: btoa(CONFIG.shipsgoV1Key), // Cripta come fa il service
                created_by: user.id,
                is_active: true,
                updated_at: new Date().toISOString()
            };
            
            const { data: v1Result, error: v1Error } = await window.supabase
                .from('organization_api_keys')
                .upsert(v1Data, {
                    onConflict: 'organization_id,provider'
                })
                .select();
                
            if (v1Error) {
                console.error('Error updating V1 key:', v1Error);
            } else {
                console.log('✅ V1 key saved:', v1Result);
            }
            
            // ShipsGo V2 - provider deve essere 'shipsgo_v2'
            const v2Data = {
                organization_id: CONFIG.organizationId,
                provider: 'shipsgo_v2', // IMPORTANTE: deve matchare con tracking-service
                api_key: btoa(CONFIG.shipsgoV2Token), // Cripta come fa il service
                created_by: user.id,
                is_active: true,
                updated_at: new Date().toISOString()
            };
            
            const { data: v2Result, error: v2Error } = await window.supabase
                .from('organization_api_keys')
                .upsert(v2Data, {
                    onConflict: 'organization_id,provider'
                })
                .select();
                
            if (v2Error) {
                console.error('Error updating V2 key:', v2Error);
            } else {
                console.log('✅ V2 key saved:', v2Result);
            }
            
            // 4. Elimina entries con service_name invece di provider
            console.log('🗑️ Cleaning up old entries...');
            
            const { data: oldEntries } = await window.supabase
                .from('organization_api_keys')
                .select('*')
                .eq('organization_id', CONFIG.organizationId)
                .not('provider', 'in', '(shipsgo_v1,shipsgo_v2)');
                
            for (const entry of oldEntries || []) {
                if (entry.service_name && (entry.service_name.includes('shipsgo') || entry.api_key.includes('shipsgo'))) {
                    console.log(`Deleting old entry with service_name: ${entry.service_name}`);
                    await window.supabase
                        .from('organization_api_keys')
                        .delete()
                        .eq('id', entry.id);
                }
            }
            
            // 5. Invalida la cache in organizationApiKeysService
            if (window.organizationApiKeysService) {
                console.log('🔄 Clearing organization API keys cache...');
                window.organizationApiKeysService.cache.clear();
            }
            
            // 6. Forza il reload del tracking service
            console.log('🔄 Forcing tracking service reload...');
            
            if (window.trackingService) {
                // Reset lo stato
                window.trackingService.mockMode = true;
                window.trackingService.initialized = false;
                window.trackingService.apiConfig = { v1: null, v2: null };
                
                // Reinizializza
                await window.trackingService.initialize();
                
                console.log('Tracking service state after reload:', {
                    initialized: window.trackingService.initialized,
                    mockMode: window.trackingService.mockMode,
                    hasV1: !!window.trackingService.apiConfig?.v1?.authCode,
                    hasV2: !!window.trackingService.apiConfig?.v2?.userToken,
                    v1Preview: window.trackingService.apiConfig?.v1?.authCode?.substring(0, 8) + '...',
                    v2Preview: window.trackingService.apiConfig?.v2?.userToken?.substring(0, 8) + '...'
                });
            }
            
            // 7. Test finale
            console.log('🧪 Running final test...');
            await testApiKeys();
            
            window.NotificationSystem?.success('✅ API Keys format fixed successfully!');
            
            return {
                success: true,
                v1Saved: !!v1Result,
                v2Saved: !!v2Result,
                trackingServiceReady: window.trackingService?.hasApiKeys()
            };
            
        } catch (error) {
            console.error('❌ Fix error:', error);
            window.NotificationSystem?.error('Errore: ' + error.message);
            return {
                success: false,
                error: error.message
            };
        }
    };
    
    // Funzione per testare le API keys
    window.testApiKeys = async function() {
        console.log('🧪 Testing API keys...');
        
        // 1. Test organization API keys service
        if (window.organizationApiKeysService) {
            try {
                // Test getOrganizationApiKey per provider specifico
                const v1Key = await window.organizationApiKeysService.getOrganizationApiKey('shipsgo_v1');
                const v2Key = await window.organizationApiKeysService.getOrganizationApiKey('shipsgo_v2');
                
                console.log('Organization keys loaded:', {
                    v1: v1Key ? v1Key.substring(0, 8) + '...' : 'NOT FOUND',
                    v2: v2Key ? v2Key.substring(0, 8) + '...' : 'NOT FOUND'
                });
                
                // Test anche getAllApiKeys
                const allKeys = await window.organizationApiKeysService.getAllApiKeys();
                console.log('All API keys:', allKeys);
                
            } catch (error) {
                console.error('Error loading org keys:', error);
            }
        }
        
        // 2. Test tracking service
        if (window.trackingService) {
            console.log('Tracking service status:', {
                initialized: window.trackingService.initialized,
                mockMode: window.trackingService.mockMode,
                hasApiKeys: window.trackingService.hasApiKeys(),
                apiConfig: {
                    v1: !!window.trackingService.apiConfig?.v1,
                    v2: !!window.trackingService.apiConfig?.v2,
                    v1AuthCode: window.trackingService.apiConfig?.v1?.authCode?.substring(0, 8) + '...',
                    v2UserToken: window.trackingService.apiConfig?.v2?.userToken?.substring(0, 8) + '...'
                }
            });
            
            // Prova a fare un test di connessione
            if (window.trackingService.testConnection) {
                const connTest = await window.trackingService.testConnection();
                console.log('Connection test:', connTest);
            }
        }
        
        return true;
    };
    
    // Funzione helper per verificare il formato delle keys nel DB
    window.checkKeysFormat = async function() {
        console.log('📊 Checking current keys format...');
        
        const { data: keys } = await window.supabase
            .from('organization_api_keys')
            .select('*')
            .eq('organization_id', CONFIG.organizationId);
            
        console.log(`Found ${keys?.length || 0} keys for organization`);
            
        for (const key of keys || []) {
            console.log(`\n🔑 Entry #${key.id}`);
            console.log('Provider:', key.provider);
            console.log('Service Name:', key.service_name);
            console.log('Is Active:', key.is_active);
            console.log('Raw api_key length:', key.api_key?.length);
            
            // Controlla se è Base64
            if (key.api_key && /^[A-Za-z0-9+/=]+$/.test(key.api_key)) {
                try {
                    const decoded = atob(key.api_key);
                    console.log('Decoded value:', decoded);
                    
                    // Controlla se il decoded è JSON
                    if (decoded.startsWith('{')) {
                        try {
                            const parsed = JSON.parse(decoded);
                            console.log('Decoded as JSON:', parsed);
                        } catch (e) {
                            console.log('Decoded is not valid JSON');
                        }
                    }
                } catch (e) {
                    console.log('Failed to decode as Base64');
                }
            }
        }
        
        // Verifica anche cosa vede organizationApiKeysService
        if (window.organizationApiKeysService) {
            console.log('\n📦 What organizationApiKeysService sees:');
            const v1 = await window.organizationApiKeysService.getOrganizationApiKey('shipsgo_v1');
            const v2 = await window.organizationApiKeysService.getOrganizationApiKey('shipsgo_v2');
            console.log('V1 key:', v1 ? v1.substring(0, 20) + '...' : 'NOT FOUND');
            console.log('V2 key:', v2 ? v2.substring(0, 20) + '...' : 'NOT FOUND');
        }
    };
    
    // Quick fix per testare una singola API key
    window.quickTestShipsGo = async function(trackingNumber = 'MSCU1234567') {
        console.log('🚀 Quick test ShipsGo API...');
        
        if (!window.trackingService) {
            console.error('Tracking service not available');
            return;
        }
        
        // Forza fuori dal mock mode
        window.trackingService.mockMode = false;
        
        try {
            const result = await window.trackingService.track(trackingNumber, 'container');
            console.log('API Response:', result);
            
            if (result.mockData) {
                console.warn('⚠️ Still getting mock data!');
                console.log('Check if API keys are loaded:', window.trackingService.hasApiKeys());
            } else {
                console.log('✅ Real API data received!');
            }
            
            return result;
        } catch (error) {
            console.error('API Error:', error);
            return null;
        }
    };
    
    // Auto-check al caricamento
    setTimeout(async () => {
        console.log('🔍 Auto-checking API keys status...');
        
        // Controlla il formato corrente
        const { data: keys } = await window.supabase
            .from('organization_api_keys')
            .select('provider, service_name')
            .eq('organization_id', CONFIG.organizationId)
            .eq('is_active', true);
            
        if (keys && keys.length > 0) {
            console.log('Active keys found:', keys.map(k => k.provider || k.service_name));
            
            // Se usa service_name invece di provider, serve il fix
            const needsFix = keys.some(k => k.service_name && !k.provider);
            if (needsFix) {
                console.warn('⚠️ Found keys using service_name instead of provider!');
                console.log('💡 Run window.fixApiKeysFormat() to fix');
            }
        } else {
            console.warn('⚠️ No active API keys found for organization');
        }
        
        // Controlla tracking service
        if (window.trackingService?.mockMode === true) {
            console.warn('⚠️ Tracking service in MOCK MODE');
            
            // Prova a forzare un reload
            if (window.trackingService.hasApiKeys()) {
                console.log('✅ But API keys are loaded, disabling mock mode...');
                window.trackingService.mockMode = false;
            } else {
                console.log('❌ No API keys loaded in tracking service');
                console.log('💡 Run window.fixApiKeysFormat() to fix');
            }
        }
        
    }, 3000);
    
    // Comandi disponibili
    console.log('✅ API Keys Format Fix loaded');
    console.log('Available commands:');
    console.log('- window.checkKeysFormat() : Check current format in DB');
    console.log('- window.fixApiKeysFormat() : Fix keys format and reload service');
    console.log('- window.testApiKeys() : Test if keys are working');
    console.log('- window.quickTestShipsGo() : Quick test API with a container number');
    
})();