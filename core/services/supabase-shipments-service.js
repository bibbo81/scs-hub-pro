import { supabase } from '/core/services/supabase-client.js';

class SupabaseShipmentsService {
    constructor() {
        this.table = 'shipments';
    }

    async getAllShipments(orgId) {
        try {
            let query = supabase.from(this.table).select('*').order('created_at', { ascending: false });
            if (orgId) query = query.eq('organization_id', orgId);
            const { data, error } = await query;
            if (error) throw error;
            console.log(`[SupabaseShipmentsService] loaded ${data.length} shipments`);
            return data || [];
        } catch (error) {
            console.error('[SupabaseShipmentsService] getAllShipments error:', error);
            return [];
        }
    }

    async createShipment(shipment) {
        try {
            const { data, error } = await supabase
                .from(this.table)
                .insert([shipment])
                .select()
                .single();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('[SupabaseShipmentsService] createShipment error:', error);
            return null;
        }
    }

    async updateShipment(id, updates) {
        try {
            const { data, error } = await supabase
                .from(this.table)
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('[SupabaseShipmentsService] updateShipment error:', error);
            return null;
        }
    }

    async deleteShipment(id) {
        try {
            const { error } = await supabase
                .from(this.table)
                .delete()
                .eq('id', id);
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('[SupabaseShipmentsService] deleteShipment error:', error);
            return false;
        }
    }
}

const service = new SupabaseShipmentsService();
if (typeof window !== 'undefined') {
    window.supabaseShipmentsService = service;
}
export default service;
