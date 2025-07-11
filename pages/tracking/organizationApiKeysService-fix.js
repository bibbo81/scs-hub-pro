// organizationApiKeysService-fix.js
// Fix for ES6 module loading timing issue with organizationApiKeysService

(function() {
    'use strict';
    
    console.log('🔧 OrganizationApiKeysService Fix Loading...');
    
    // Maximum wait time for service loading (10 seconds)
    const MAX_WAIT_TIME = 10000;
    const CHECK_INTERVAL = 100;
    
    // Promise-based service waiter
    function waitForService(serviceName, maxWait = MAX_WAIT_TIME) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            function checkService() {
                if (window[serviceName]) {
                    console.log(`✅ ${serviceName} found after ${Date.now() - startTime}ms`);
                    resolve(window[serviceName]);
                    return;
                }
                
                if (Date.now() - startTime >= maxWait) {
                    console.warn(`⚠️ ${serviceName} not found after ${maxWait}ms, providing fallback`);
                    resolve(null);
                    return;
                }
                
                setTimeout(checkService, CHECK_INTERVAL);
            }
            
            checkService();
        });
    }
    
    // Fallback organizationApiKeysService implementation
    class FallbackOrganizationApiKeysService {
        constructor() {
            this.initialized = false;
            this.fallbackMode = true;
            console.log('🔄 Using fallback organizationApiKeysService');
        }
        
        async initialize() {
            try {
                // Try to get user and organization info from Supabase
                if (window.supabase) {
                    const { data: { user } } = await window.supabase.auth.getUser();
                    if (user) {
                        const { data: membership } = await window.supabase
                            .from('organization_members')
                            .select('organization_id')
                            .eq('user_id', user.id)
                            .maybeSingle();
                        
                        this.currentOrganizationId = membership?.organization_id || null;
                        this.initialized = true;
                        console.log('✅ Fallback service initialized with org ID:', this.currentOrganizationId);
                    }
                }
            } catch (error) {
                console.warn('⚠️ Fallback service initialization warning:', error.message);
                this.initialized = true; // Continue anyway
            }
        }
        
        async getApiKeys() {
            if (!this.initialized) {
                await this.initialize();
            }
            
            try {
                if (!window.supabase || !this.currentOrganizationId) {
                    console.log('📋 No organization API keys, returning empty array');
                    return [];
                }
                
                // Try to load organization API keys
                const { data: orgKeys, error } = await window.supabase
                    .from('organization_api_keys')
                    .select('*')
                    .eq('organization_id', this.currentOrganizationId)
                    .eq('is_active', true);
                
                if (error) {
                    console.warn('⚠️ Error loading org API keys:', error.message);
                    return [];
                }
                
                const keys = orgKeys || [];
                console.log(`✅ Loaded ${keys.length} organization API keys`);
                return keys;
                
            } catch (error) {
                console.error('❌ Error in fallback getApiKeys:', error);
                return [];
            }
        }
        
        async getOrganizationApiKeys() {
            return this.getApiKeys();
        }
        
        async loadApiKeys() {
            return this.getApiKeys();
        }
        
        async getKeys() {
            return this.getApiKeys();
        }
    }
    
    // Service initialization and fix
    async function initializeOrganizationApiKeysService() {
        try {
            console.log('🔄 Waiting for organizationApiKeysService...');
            
            // Wait for the original service
            const originalService = await waitForService('organizationApiKeysService', 5000);
            
            if (originalService) {
                console.log('✅ Original organizationApiKeysService found, no fix needed');
                return originalService;
            }
            
            // If not found, create and use fallback
            console.log('🔄 Creating fallback organizationApiKeysService...');
            const fallbackService = new FallbackOrganizationApiKeysService();
            
            // Make it available globally
            window.organizationApiKeysService = fallbackService;
            
            // Initialize it
            await fallbackService.initialize();
            
            console.log('✅ Fallback organizationApiKeysService ready');
            return fallbackService;
            
        } catch (error) {
            console.error('❌ Error initializing organizationApiKeysService fix:', error);
            
            // Last resort: create minimal service
            window.organizationApiKeysService = {
                getApiKeys: async () => [],
                getOrganizationApiKeys: async () => [],
                loadApiKeys: async () => [],
                getKeys: async () => [],
                fallbackMode: true,
                error: error.message
            };
            
            return window.organizationApiKeysService;
        }
    }
    
    // Manual recovery function for debug
    window.recoverOrganizationApiKeysService = async function() {
        console.log('🔧 Manual recovery of organizationApiKeysService...');
        return await initializeOrganizationApiKeysService();
    };
    
    // Debug function to check service status
    window.checkOrganizationApiKeysService = function() {
        const service = window.organizationApiKeysService;
        console.log('🔍 OrganizationApiKeysService Status:', {
            exists: !!service,
            fallbackMode: service?.fallbackMode || false,
            initialized: service?.initialized || false,
            hasGetApiKeys: typeof service?.getApiKeys === 'function',
            hasGetOrganizationApiKeys: typeof service?.getOrganizationApiKeys === 'function',
            error: service?.error || null
        });
        return service;
    };
    
    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeOrganizationApiKeysService);
    } else {
        // DOM already loaded, initialize immediately
        setTimeout(initializeOrganizationApiKeysService, 100);
    }
    
    // Also listen for the ES6 modules loaded event
    window.addEventListener('es6ModulesLoaded', () => {
        console.log('📡 ES6 modules loaded event received, checking organizationApiKeysService...');
        setTimeout(() => {
            if (!window.organizationApiKeysService || window.organizationApiKeysService.fallbackMode) {
                console.log('🔄 Reinitializing after ES6 modules...');
                initializeOrganizationApiKeysService();
            }
        }, 500);
    });
    
    console.log('✅ OrganizationApiKeysService fix loaded');
    
})();