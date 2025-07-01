// core/services/supabase-products-service.js
import { supabase } from './supabase-client.js';

class SupabaseProductsService {
    constructor() {
        this.table = 'products';
    }

    async upsertProducts(products, organizationId) {
        if (!organizationId) throw new Error('organizationId richiesto');
        const productsWithOrg = products.map(p => ({
            ...p,
            organization_id: organizationId
        }));
        const { data, error } = await supabase
            .from(this.table)
            .upsert(productsWithOrg, { onConflict: 'organization_id,sku' })
            .select();
        if (error) throw error;
        return data;
    }

    // ...altri metodi se vuoi
}

export default new SupabaseProductsService();
