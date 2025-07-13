// product-data-sync.js - Sincronizzazione prodotti con Supabase
class ProductDataSync {
    constructor() {
        this.initialized = false;
        this.supabase = null;
        this.dataManager = null;
    }
    
    async init() {
        if (this.initialized) return;
        
        console.log('🔄 Initializing Product Data Sync...');
        
        // Attendi dipendenze
        await this.waitForDependencies();
        
        this.supabase = window.supabase;
        this.dataManager = window.dataManager;
        
        // Setup real-time subscription
        this.setupRealtimeSync();
        
        this.initialized = true;
        console.log('✅ Product Data Sync initialized');
    }
    
    async waitForDependencies() {
        let attempts = 0;
        while ((!window.supabase || !window.dataManager?.initialized) && attempts < 30) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;
        }
        
        if (!window.supabase || !window.dataManager?.initialized) {
            throw new Error('Dependencies not available');
        }
    }
    
    setupRealtimeSync() {
        // Sottoscrizione real-time ai cambiamenti dei prodotti
        const subscription = this.supabase
            .channel('products-changes')
            .on('postgres_changes', 
                { 
                    event: '*', 
                    schema: 'public', 
                    table: 'products',
                    filter: `organization_id=eq.${this.dataManager.organizationId}`
                }, 
                (payload) => {
                    console.log('🔄 Product change detected:', payload);
                    this.handleProductChange(payload);
                }
            )
            .subscribe();
            
        console.log('✅ Real-time product sync active');
    }
    
    handleProductChange(payload) {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        
        // Emit evento per aggiornare UI
        window.dispatchEvent(new CustomEvent('productDataChanged', {
            detail: {
                type: eventType,
                product: newRecord || oldRecord,
                timestamp: new Date().toISOString()
            }
        }));
        
        // Se sei nella pagina prodotti, ricarica la lista
        if (window.location.pathname.includes('products')) {
            if (window.refreshProductsList) {
                window.refreshProductsList();
            }
        }
    }
    
    // Metodo per ottenere prodotti dal database
    async getProducts() {
        try {
            const { data, error } = await this.supabase
                .from('products')
                .select('*')
                .eq('organization_id', this.dataManager.organizationId)
                .order('created_at', { ascending: false });
                
            if (error) throw error;
            return data || [];
            
        } catch (error) {
            console.error('❌ Error fetching products:', error);
            return [];
        }
    }
    
    // Metodo per sincronizzare con sistemi esterni (se necessario)
    async syncWithExternal(externalProducts) {
        console.log('🔄 Syncing with external system...');
        
        try {
            const results = {
                created: 0,
                updated: 0,
                errors: 0
            };
            
            for (const extProduct of externalProducts) {
                try {
                    // Verifica se esiste già
                    const { data: existing } = await this.supabase
                        .from('products')
                        .select('id')
                        .eq('organization_id', this.dataManager.organizationId)
                        .eq('sku', extProduct.sku)
                        .single();
                        
                    if (existing) {
                        // Aggiorna prodotto esistente
                        await this.supabase
                            .from('products')
                            .update({
                                name: extProduct.name,
                                description: extProduct.description,
                                unit_price: extProduct.price,
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', existing.id);
                            
                        results.updated++;
                    } else {
                        // Crea nuovo prodotto
                        await this.supabase
                            .from('products')
                            .insert({
                                organization_id: this.dataManager.organizationId,
                                sku: extProduct.sku,
                                name: extProduct.name,
                                description: extProduct.description,
                                unit_price: extProduct.price,
                                created_by: this.dataManager.userId
                            });
                            
                        results.created++;
                    }
                } catch (error) {
                    console.error('Error syncing product:', error);
                    results.errors++;
                }
            }
            
            console.log('✅ Sync complete:', results);
            return results;
            
        } catch (error) {
            console.error('❌ Sync failed:', error);
            throw error;
        }
    }
}

// Inizializza solo se necessario
if (window.location.pathname.includes('products')) {
    // Solo per la pagina prodotti per ora
    window.productDataSync = new ProductDataSync();
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.productDataSync.init();
        });
    } else {
        window.productDataSync.init();
    }
}

console.log('✅ Product Data Sync (Supabase) loaded');