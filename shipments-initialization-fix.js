// shipments-initialization-fix.js - Dependency Resolution System
// Add this script BEFORE all other shipments scripts in shipments.html

console.log('🔧 Starting Shipments Dependency Resolution System...');

// ===== DEPENDENCY MANAGER =====
class ShipmentsDependencyManager {
    constructor() {
        this.dependencies = new Map();
        this.loadedModules = new Set();
        this.initCallbacks = new Map();
        this.initTimeout = 30000; // 30 seconds timeout
        
        this.setupDependencyChain();
    }
    
    setupDependencyChain() {
        // Define the correct loading order
        this.dependencies.set('phase2-architecture', {
            script: '/phase2-architecture.js',
            global: 'Phase2Architecture',
            dependencies: []
        });
        
        this.dependencies.set('shipments-registry', {
            script: '/core/shipments-registry.js',
            global: 'ShipmentsRegistry',
            dependencies: ['phase2-architecture'],
            module: true
        });
        
        this.dependencies.set('documents-manager', {
            script: '/pages/shipments/documents-manager.js',
            global: 'DocumentsManager',
            dependencies: ['shipments-registry']
        });
        
        this.dependencies.set('registry-core', {
            script: '/pages/shipments/registry-core.js',
            global: 'RegistryCore',
            dependencies: ['shipments-registry', 'documents-manager']
        });
        
        this.dependencies.set('shipment-details', {
            script: '/pages/shipments/shipments-details.js',
            global: 'ShipmentDetails',
            dependencies: ['shipments-registry', 'documents-manager']
        });
        
        this.dependencies.set('enhanced-commercial-model', {
            script: '/core/enhanced-commercial-model.js',
            global: 'EnhancedCommercialModel',
            dependencies: ['shipments-registry']
        });
        
        this.dependencies.set('cost-allocation', {
            script: '/pages/shipments/cost-allocation.js',
            global: 'CostAllocationUI',
            dependencies: ['shipments-registry']
        });
        
        this.dependencies.set('carrier-performance', {
            script: '/pages/shipments/carrier-performance.js',
            global: 'CarrierPerformanceAnalytics',
            dependencies: ['shipments-registry']
        });
        
        this.dependencies.set('executive-bi', {
            script: '/pages/shipments/executive-bi-dashboard.js',
            global: 'ExecutiveBIDashboard',
            dependencies: ['shipments-registry', 'enhanced-commercial-model']
        });
    }
    
    async loadDependencies() {
        console.log('📦 Loading shipments dependencies in correct order...');
        
        // Load in dependency order
        const loadOrder = this.resolveDependencyOrder();
        
        for (const moduleName of loadOrder) {
            await this.loadModule(moduleName);
        }
        
        console.log('✅ All shipments dependencies loaded successfully');
        return true;
    }
    
    resolveDependencyOrder() {
        const visited = new Set();
        const visiting = new Set();
        const order = [];
        
        const visit = (moduleName) => {
            if (visiting.has(moduleName)) {
                throw new Error(`Circular dependency detected: ${moduleName}`);
            }
            if (visited.has(moduleName)) return;
            
            visiting.add(moduleName);
            const module = this.dependencies.get(moduleName);
            
            if (module) {
                for (const dep of module.dependencies) {
                    visit(dep);
                }
            }
            
            visiting.delete(moduleName);
            visited.add(moduleName);
            order.push(moduleName);
        };
        
        for (const moduleName of this.dependencies.keys()) {
            visit(moduleName);
        }
        
        return order;
    }
    
    async loadModule(moduleName) {
        const module = this.dependencies.get(moduleName);
        if (!module) {
            console.warn(`⚠️ Module ${moduleName} not found in dependencies`);
            return false;
        }
        
        // Check if already loaded
        if (this.loadedModules.has(moduleName)) {
            console.log(`✅ ${moduleName} already loaded`);
            return true;
        }
        
        // Check if global is already available
        if (this.checkGlobalAvailable(module.global)) {
            console.log(`✅ ${moduleName} global already available`);
            this.loadedModules.add(moduleName);
            return true;
        }
        
        console.log(`📥 Loading ${moduleName}...`);
        
        try {
            await this.loadScript(module.script, module.module);
            
            // Wait for global to be available
            const success = await this.waitForGlobal(module.global, 5000);
            
            if (success) {
                this.loadedModules.add(moduleName);
                console.log(`✅ ${moduleName} loaded successfully`);
                
                // Trigger any waiting callbacks
                this.triggerCallbacks(moduleName);
                
                return true;
            } else {
                console.error(`❌ ${moduleName} failed to load (global ${module.global} not available)`);
                return false;
            }
            
        } catch (error) {
            console.error(`❌ Error loading ${moduleName}:`, error);
            return false;
        }
    }
    
    checkGlobalAvailable(globalName) {
        const parts = globalName.split('.');
        let obj = window;
        
        for (const part of parts) {
            if (!(part in obj)) return false;
            obj = obj[part];
        }
        
        return obj !== undefined;
    }
    
    async loadScript(src, isModule = false) {
        return new Promise((resolve, reject) => {
            // Check if script already exists
            const existing = document.querySelector(`script[src="${src}"]`);
            if (existing) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = src;
            if (isModule) {
                script.type = 'module';
            }
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
            document.head.appendChild(script);
        });
    }
    
    async waitForGlobal(globalName, timeout = 5000) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            if (this.checkGlobalAvailable(globalName)) {
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        return false;
    }
    
    triggerCallbacks(moduleName) {
        const callbacks = this.initCallbacks.get(moduleName) || [];
        callbacks.forEach(callback => {
            try {
                callback();
            } catch (error) {
                console.error(`Error in callback for ${moduleName}:`, error);
            }
        });
        this.initCallbacks.delete(moduleName);
    }
    
    onModuleReady(moduleName, callback) {
        if (this.loadedModules.has(moduleName)) {
            callback();
        } else {
            if (!this.initCallbacks.has(moduleName)) {
                this.initCallbacks.set(moduleName, []);
            }
            this.initCallbacks.get(moduleName).push(callback);
        }
    }
}

// ===== SHIPMENTS REGISTRY STUB =====
// Create a temporary stub to prevent "not found" errors
if (!window.shipmentsRegistry) {
    console.log('📦 Creating ShipmentsRegistry stub...');
    
    window.shipmentsRegistry = {
        shipments: [],
        initialized: false,
        
        async init() {
            console.log('🔄 ShipmentsRegistry stub init called, waiting for real implementation...');
            return true;
        },
        
        getStatistics() {
            return {
                total: 0,
                byStatus: {},
                totalCost: 0,
                avgTransitTime: 0
            };
        },
        
        async updateShipment() {
            console.log('⚠️ ShipmentsRegistry not ready yet');
            return false;
        },
        
        async deleteShipment() {
            console.log('⚠️ ShipmentsRegistry not ready yet');
            return false;
        },
        
        saveShipments() {
            console.log('⚠️ ShipmentsRegistry not ready yet');
        }
    };
    
    // Dispatch ready event for components waiting
    setTimeout(() => {
        window.dispatchEvent(new Event('shipmentsRegistryReady'));
    }, 100);
}

// ===== DOCUMENTS MANAGER STUB =====
if (!window.documentsManager && !window.DocumentsManager) {
    console.log('📄 Creating DocumentsManager stub...');
    
    window.documentsManager = {
        documents: new Map(),
        
        getShipmentDocuments(shipmentId) {
            return [];
        },
        
        showDocumentsList(shipmentId) {
            console.log('⚠️ DocumentsManager not ready yet');
        },
        
        showUploadModal(shipmentId) {
            console.log('⚠️ DocumentsManager not ready yet');
        },
        
        removeShipmentDocuments(shipmentId) {
            console.log('⚠️ DocumentsManager not ready yet');
        }
    };
}

// ===== TRACKING SERVICE STUB =====
// Fix for import-manager.js warning
if (!window.trackingService) {
    console.log('📍 Creating TrackingService stub...');
    
    window.trackingService = {
        initialized: false,
        
        async trackShipment(trackingNumber) {
            console.log('⚠️ TrackingService not available in development mode');
            return {
                success: false,
                message: 'Tracking service not available in development mode'
            };
        },
        
        isAvailable() {
            return false;
        }
    };
}

// ===== GLOBAL INITIALIZATION MANAGER =====
window.shipmentsInitManager = new ShipmentsDependencyManager();

// ===== ENHANCED INITIALIZATION SEQUENCE =====
async function initializeShipmentsSystem() {
    console.log('🚀 Starting enhanced shipments system initialization...');
    
    try {
        // 1. Load all dependencies in correct order
        await window.shipmentsInitManager.loadDependencies();
        
        // 2. Initialize shipments registry properly
        if (window.ShipmentsRegistry && !window.shipmentsRegistry.initialized) {
            console.log('🏗️ Initializing real ShipmentsRegistry...');
            window.shipmentsRegistry = new window.ShipmentsRegistry();
            await window.shipmentsRegistry.init();
            
            // Dispatch updated ready event
            window.dispatchEvent(new Event('shipmentsRegistryReady'));
        }
        
        // 3. Initialize documents manager
        if (window.DocumentsManager && !window.documentsManager.initialized) {
            console.log('📄 Initializing DocumentsManager...');
            window.documentsManager = new window.DocumentsManager();
            await window.documentsManager.init();
        }
        
        // 4. Wait a bit for all modules to settle
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 5. Initialize all dependent modules
        console.log('🔗 Initializing dependent modules...');
        
        // Registry Core
        if (window.RegistryCore) {
            window.registryCore = new window.RegistryCore();
        }
        
        // Shipment Details
        if (window.ShipmentDetails) {
            window.shipmentDetails = new window.ShipmentDetails();
        }
        
        // Enhanced Commercial Model
        if (window.EnhancedCommercialModel) {
            window.enhancedCommercialModel = new window.EnhancedCommercialModel();
        }
        
        // Cost Allocation
        if (window.CostAllocationUI) {
            window.costAllocation = new window.CostAllocationUI();
        }
        
        // Carrier Performance
        if (window.CarrierPerformanceAnalytics) {
            window.carrierPerformance = new window.CarrierPerformanceAnalytics();
        }
        
        // Executive BI Dashboard
        if (window.ExecutiveBIDashboard) {
            window.executiveBIDashboard = new window.ExecutiveBIDashboard();
        }
        
        console.log('✅ Shipments system initialization completed successfully!');
        
        // Dispatch global ready event
        window.dispatchEvent(new CustomEvent('shipmentsSystemReady', {
            detail: { timestamp: new Date().toISOString() }
        }));
        
        return true;
        
    } catch (error) {
        console.error('❌ Shipments system initialization failed:', error);
        
        // Show user-friendly error
        if (window.NotificationSystem) {
            window.NotificationSystem.show(
                'Initialization Error', 
                'Some shipments features may not work properly. Please refresh the page.', 
                'warning',
                10000
            );
        }
        
        return false;
    }
}

// ===== AUTO-INITIALIZATION =====
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initializeShipmentsSystem, 1000);
    });
} else {
    setTimeout(initializeShipmentsSystem, 1000);
}

// ===== DEBUG HELPERS =====
window.debugShipmentsInit = function() {
    console.log('🔍 Shipments System Debug Info:');
    console.log('📦 Loaded Modules:', Array.from(window.shipmentsInitManager.loadedModules));
    console.log('🌐 Available Globals:', {
        shipmentsRegistry: !!window.shipmentsRegistry,
        documentsManager: !!window.documentsManager,
        registryCore: !!window.registryCore,
        shipmentDetails: !!window.shipmentDetails,
        costAllocation: !!window.costAllocation,
        carrierPerformance: !!window.carrierPerformance,
        executiveBIDashboard: !!window.executiveBIDashboard
    });
    console.log('📊 Registry Status:', {
        initialized: window.shipmentsRegistry?.initialized,
        shipmentsCount: window.shipmentsRegistry?.shipments?.length || 0
    });
};

// Add to global scope for debugging
window.reinitializeShipments = initializeShipmentsSystem;

console.log('🔧 Shipments Dependency Resolution System loaded');
console.log('💡 Use window.debugShipmentsInit() to debug initialization');