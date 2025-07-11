// service-initialization-coordinator.js - Ensure real services are tried first
// This coordinates proper service loading order and prevents premature fallback activation

console.log('🚀 Setting up Service Initialization Coordinator...');

class ServiceInitializationCoordinator {
    constructor() {
        this.services = new Map();
        this.initializationOrder = [];
        this.fallbackServices = new Map();
        this.initializationPromises = new Map();
        this.initialized = false;
        this.debug = window.location.hostname === 'localhost';
        this.setup();
    }
    
    setup() {
        // Define service initialization order (critical services first)
        this.initializationOrder = [
            'supabase-client',
            'auth-system', 
            'tracking-service',
            'organization-service',
            'header-component',
            'notification-system'
        ];
        
        // Register service definitions
        this.registerService('supabase-client', {
            module: () => import('/core/services/supabase-client.js'),
            validator: () => window.supabase !== undefined,
            fallback: () => this.createSupabaseFallback(),
            critical: true,
            timeout: 10000
        });
        
        this.registerService('auth-system', {
            init: () => this.initializeAuth(),
            validator: () => window.currentSession !== undefined || window.location.pathname.includes('login.html'),
            fallback: () => this.createAuthFallback(),
            critical: true,
            timeout: 8000
        });
        
        this.registerService('tracking-service', {
            init: () => this.initializeTrackingService(),
            validator: () => window.trackingService && typeof window.trackingService.hasApiKeys === 'function',
            fallback: () => this.createTrackingServiceFallback(),
            critical: false,
            timeout: 5000
        });
        
        this.registerService('header-component', {
            init: () => this.initializeHeaderComponent(),
            validator: () => document.querySelector('.sol-header') !== null,
            fallback: () => this.createHeaderFallback(),
            critical: false,
            timeout: 3000
        });
    }
    
    registerService(name, config) {
        this.services.set(name, {
            name,
            status: 'pending',
            attempts: 0,
            maxAttempts: 3,
            lastError: null,
            ...config
        });
    }
    
    async initializeAll() {
        if (this.initialized) {
            console.log('🔄 Services already initialized');
            return true;
        }
        
        console.log('🚀 Starting coordinated service initialization...');
        
        try {
            // Initialize services in order
            for (const serviceName of this.initializationOrder) {
                await this.initializeService(serviceName);
            }
            
            this.initialized = true;
            console.log('✅ All services initialized successfully');
            
            // Dispatch ready event
            window.dispatchEvent(new CustomEvent('servicesReady', {
                detail: { services: Array.from(this.services.keys()) }
            }));
            
            return true;
            
        } catch (error) {
            console.error('❌ Service initialization failed:', error);
            this.handleInitializationFailure(error);
            return false;
        }
    }
    
    async initializeService(serviceName) {
        const service = this.services.get(serviceName);
        if (!service) {
            console.warn(`⚠️ Service ${serviceName} not registered`);
            return false;
        }
        
        // Check if already successfully initialized
        if (service.status === 'ready' && service.validator()) {
            console.log(`✅ Service ${serviceName} already ready`);
            return true;
        }
        
        // Check if initialization is already in progress
        if (this.initializationPromises.has(serviceName)) {
            console.log(`⏳ Waiting for ${serviceName} initialization in progress...`);
            return await this.initializationPromises.get(serviceName);
        }
        
        // Start initialization
        const initPromise = this._doInitializeService(service);
        this.initializationPromises.set(serviceName, initPromise);
        
        try {
            const result = await initPromise;
            this.initializationPromises.delete(serviceName);
            return result;
        } catch (error) {
            this.initializationPromises.delete(serviceName);
            throw error;
        }
    }
    
    async _doInitializeService(service) {
        console.log(`🔧 Initializing service: ${service.name}`);
        service.status = 'initializing';
        service.attempts++;
        
        try {
            // Set up timeout
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error(`Service ${service.name} initialization timeout`)), service.timeout);
            });
            
            // Initialize service
            let initPromise;
            if (service.module) {
                const module = await service.module();
                initPromise = module.initialize ? module.initialize() : Promise.resolve();
            } else if (service.init) {
                initPromise = service.init();
            } else {
                initPromise = Promise.resolve();
            }
            
            // Wait for initialization with timeout
            await Promise.race([initPromise, timeoutPromise]);
            
            // Validate service is working
            if (service.validator && !service.validator()) {
                throw new Error(`Service ${service.name} validation failed`);
            }
            
            service.status = 'ready';
            console.log(`✅ Service ${service.name} initialized successfully`);
            return true;
            
        } catch (error) {
            console.error(`❌ Service ${service.name} initialization failed:`, error);
            service.lastError = error;
            
            // Try fallback if available and this is not a critical service failure
            if (service.attempts >= service.maxAttempts && service.fallback && !service.critical) {
                console.log(`🔄 Activating fallback for ${service.name}`);
                try {
                    await service.fallback();
                    service.status = 'fallback';
                    console.log(`✅ Fallback activated for ${service.name}`);
                    return true;
                } catch (fallbackError) {
                    console.error(`❌ Fallback failed for ${service.name}:`, fallbackError);
                }
            }
            
            service.status = 'failed';
            
            // For critical services, don't continue
            if (service.critical) {
                throw error;
            }
            
            return false;
        }
    }
    
    // Service-specific initialization methods
    async initializeAuth() {
        // Wait for Supabase to be ready first
        await window.supabaseReady;
        
        // Load auth modules if not already loaded
        if (!window.authSupabase) {
            await import('/core/auth-supabase.js');
        }
        
        // Wait a bit for auth state to settle
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return true;
    }
    
    async initializeTrackingService() {
        if (!window.trackingService) {
            const module = await import('/core/services/tracking-service.js');
            // Service auto-initializes on import
        }
        
        if (window.trackingService && window.trackingService.initialize) {
            await window.trackingService.initialize();
        }
        
        return true;
    }
    
    async initializeHeaderComponent() {
        if (document.querySelector('.sol-header')) {
            return true; // Already initialized
        }
        
        try {
            const module = await import('/core/header-component.js');
            const headerComponent = new module.HeaderComponent();
            await headerComponent.init();
            return true;
        } catch (error) {
            console.error('Header component initialization failed:', error);
            return false;
        }
    }
    
    // Fallback service implementations
    createSupabaseFallback() {
        console.log('🔄 Creating Supabase fallback...');
        window.supabase = {
            auth: {
                getSession: () => Promise.resolve({ data: { session: null } }),
                onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
            }
        };
        window.supabaseReady = Promise.resolve();
        return Promise.resolve();
    }
    
    createAuthFallback() {
        console.log('🔄 Creating auth fallback...');
        if (!window.location.pathname.includes('login.html')) {
            // Only redirect if not already on login page
            window.location.href = '/login.html';
        }
        return Promise.resolve();
    }
    
    createTrackingServiceFallback() {
        console.log('🔄 Creating tracking service fallback...');
        window.trackingService = {
            hasApiKeys: () => false,
            initialized: false,
            mockMode: true,
            track: () => Promise.resolve({ mockData: true }),
            initialize: () => Promise.resolve(false)
        };
        return Promise.resolve();
    }
    
    createHeaderFallback() {
        console.log('🔄 Creating header fallback...');
        const headerRoot = document.getElementById('header-root');
        if (headerRoot) {
            headerRoot.innerHTML = `
                <header class="sol-header">
                    <div class="sol-header-content">
                        <div class="sol-header-left">
                            <div class="sol-logo">
                                <i class="fas fa-exclamation-triangle text-warning"></i>
                                <span>SCS Hub Pro (Limited Mode)</span>
                            </div>
                        </div>
                    </div>
                </header>
            `;
        }
        return Promise.resolve();
    }
    
    handleInitializationFailure(error) {
        console.error('🚨 Critical service initialization failure:', error);
        
        // Show user-friendly error message
        if (window.enhancedLogging) {
            window.enhancedLogging.showInlineError('Service initialization failed. Some features may not work correctly.');
        }
        
        // Try to provide basic functionality
        this.activateEmergencyMode();
    }
    
    activateEmergencyMode() {
        console.log('🚨 Activating emergency mode...');
        
        // Ensure basic protection
        if (!window.trackingService) {
            this.createTrackingServiceFallback();
        }
        
        // Ensure basic header
        if (!document.querySelector('.sol-header')) {
            this.createHeaderFallback();
        }
        
        // Dispatch emergency mode event
        window.dispatchEvent(new CustomEvent('emergencyModeActivated'));
    }
    
    getServiceStatus() {
        const status = {};
        for (const [name, service] of this.services) {
            status[name] = {
                status: service.status,
                attempts: service.attempts,
                lastError: service.lastError?.message
            };
        }
        return status;
    }
}

// Create global instance
window.serviceCoordinator = new ServiceInitializationCoordinator();

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.serviceCoordinator.initializeAll();
    });
} else {
    // DOM already ready, initialize immediately
    window.serviceCoordinator.initializeAll();
}

console.log('✅ Service Initialization Coordinator ready');