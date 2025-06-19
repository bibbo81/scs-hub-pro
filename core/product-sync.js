// product-sync.js - Sincronizzazione automatica prodotti tra sistemi
class ProductSync {
    constructor() {
        this.initialized = false;
        this.syncInterval = null;
    }
    
    init() {
        if (this.initialized) return;
        
        console.log('🔄 Initializing Product Sync System...');
        
        // Sincronizza immediatamente
        this.syncProducts();
        
        // Ascolta eventi di aggiornamento prodotti
        this.setupEventListeners();
        
        // Sync periodico ogni 30 secondi (opzionale)
        this.syncInterval = setInterval(() => {
            this.syncProducts();
        }, 30000);
        
        this.initialized = true;
        console.log('✅ Product Sync System initialized');
    }
    
    setupEventListeners() {
        // Ascolta eventi dal Product Intelligence System
        window.addEventListener('productsUpdated', () => {
            console.log('📦 Products updated event detected, syncing...');
            this.syncProducts();
        });
        
        // Ascolta eventi dal Phase2 Architecture
        window.addEventListener('phase2ProductsChanged', () => {
            this.syncProducts();
        });
        
        // Ascolta storage events (quando products.html salva prodotti)
        window.addEventListener('storage', (e) => {
            if (e.key && (e.key.includes('Product') || e.key.includes('SCH_'))) {
                console.log('📦 Storage change detected:', e.key);
                setTimeout(() => this.syncProducts(), 100);
            }
        });
    }
    
    syncProducts() {
        try {
            let products = [];
            
            // Priorità 1: Product Intelligence System
            if (window.productIntelligence?.products) {
                products = window.productIntelligence.products;
                console.log('📦 Syncing from productIntelligence:', products.length);
            }
            
            // Priorità 2: Phase2 Architecture
            else if (window.Phase2Architecture?.productSystem?.products) {
                products = window.Phase2Architecture.productSystem.products;
                console.log('📦 Syncing from Phase2Architecture:', products.length);
            }
            
            // Priorità 3: Cerca in localStorage
            else {
                const possibleKeys = [
                    'SCH_ProductIntelligence',
                    'products',
                    'productsList',
                    'SCH_Products'
                ];
                
                for (const key of possibleKeys) {
                    try {
                        const data = localStorage.getItem(key);
                        if (data) {
                            const parsed = JSON.parse(data);
                            if (Array.isArray(parsed) && parsed.length > 0) {
                                products = parsed;
                                console.log(`📦 Syncing from localStorage key "${key}":`, products.length);
                                break;
                            } else if (parsed.products && Array.isArray(parsed.products)) {
                                products = parsed.products;
                                console.log(`📦 Syncing from localStorage key "${key}":`, products.length);
                                break;
                            }
                        }
                    } catch (e) {
                        // Skip invalid JSON
                    }
                }
            }
            
            // Se abbiamo trovato prodotti, sincronizzali
            if (products.length > 0) {
                // Normalizza la struttura dei prodotti
                const normalizedProducts = products.map(p => ({
                    id: p.id || `PROD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    sku: p.sku || p.code || 'N/A',
                    name: p.name || p.productName || 'Unnamed Product',
                    category: p.category || 'uncategorized',
                    brand: p.brand || 'Generic',
                    specifications: {
                        weight: p.specifications?.weight || p.weight || 0,
                        dimensions: p.specifications?.dimensions || p.dimensions || '',
                        volume: p.specifications?.volume || p.volume || 0,
                        value: p.specifications?.value || p.value || p.price || 0,
                        hsCode: p.specifications?.hsCode || p.hsCode || '',
                        countryOfOrigin: p.specifications?.countryOfOrigin || p.origin || ''
                    },
                    status: p.status || 'active',
                    createdAt: p.createdAt || new Date().toISOString(),
                    updatedAt: p.updatedAt || new Date().toISOString()
                }));
                
                // Salva nella chiave standard 'products'
                localStorage.setItem('products', JSON.stringify(normalizedProducts));
                
                // Dispatch evento per notificare altri sistemi
                window.dispatchEvent(new CustomEvent('productsSynced', {
                    detail: {
                        count: normalizedProducts.length,
                        source: 'ProductSync'
                    }
                }));
                
                console.log(`✅ Synced ${normalizedProducts.length} products to standard location`);
                
                return normalizedProducts;
            } else {
                console.log('⚠️ No products found to sync');
                return [];
            }
            
        } catch (error) {
            console.error('❌ Error syncing products:', error);
            return [];
        }
    }
    
    // Metodo helper per ottenere prodotti sincronizzati
    getProducts() {
        try {
            return JSON.parse(localStorage.getItem('products') || '[]');
        } catch (e) {
            return [];
        }
    }
    
    // Cleanup
    destroy() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        this.initialized = false;
    }
}

// Crea istanza globale
window.productSync = new ProductSync();

// Auto-inizializza quando il DOM è pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.productSync.init();
    });
} else {
    window.productSync.init();
}

console.log('[ProductSync] Product synchronization system loaded');