import { supabase } from '/core/services/supabase-client.js';

class SupabaseShipmentsService {
    constructor() {
        this.table = 'shipments';
        this.realtimeSubscription = null;
    }

    // ========================================
    // CRUD OPERATIONS
    // ========================================

    async getAllShipments() {
        try {
            const { data, error } = await supabase
                .from(this.table)
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            console.log(`\u2705 Loaded ${data.length} shipments from Supabase`);
            return data;
        } catch (error) {
            console.error('\u274C Error loading shipments:', error);
            return [];
        }
    }

    async getShipment(id) {
        try {
            const { data, error } = await supabase
                .from(this.table)
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('\u274C Error getting shipment:', error);
            return null;
        }
    }

    async createShipment(shipmentData) {
        try {
            const { data, error } = await supabase
                .from(this.table)
                .insert([shipmentData])
                .select()
                .single();

            if (error) throw error;

            console.log('\u2705 Shipment created in Supabase:', data.id);
            return data;
        } catch (error) {
            console.error('\u274C Error creating shipment:', error);
            return null;
        }
    }

    async updateShipment(id, updates) {
        try {
            const { data, error } = await supabase
                .from(this.table)
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            console.log('\u2705 Shipment updated in Supabase:', id);
            return data;
        } catch (error) {
            console.error('\u274C Error updating shipment:', error);
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

            console.log('\u2705 Shipment deleted from Supabase:', id);
            return true;
        } catch (error) {
            console.error('\u274C Error deleting shipment:', error);
            return false;
        }
    }
}

export const supabaseShipmentsService = new SupabaseShipmentsService();
export default supabaseShipmentsService;
