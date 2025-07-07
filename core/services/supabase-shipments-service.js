import { supabase } from '/core/services/supabase-client.js';
import organizationService from '/core/services/organization-service.js';

class SupabaseShipmentsService {
    constructor() {
        this.table = 'shipments';
        this.realtimeSubscription = null;
    }

    // ========================================
    // CRUD OPERATIONS
    // ========================================

    async getAllShipments() {
        const orgId = organizationService.getCurrentOrgId();
        try {
            const { data, error } = await supabase
                .from(this.table)
                .select('*')
                .eq('organization_id', orgId)
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
        const orgId = organizationService.getCurrentOrgId();
        try {
            const { data, error } = await supabase
                .from(this.table)
                .select('*')
                .eq('id', id)
                .eq('organization_id', orgId)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('\u274C Error getting shipment:', error);
            return null;
        }
    }

    async createShipment(shipmentData) {
        const orgId = organizationService.getCurrentOrgId();
        try {
            const { data, error } = await supabase
                .from(this.table)
                .insert([{ ...shipmentData, organization_id: orgId }])
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
        const orgId = organizationService.getCurrentOrgId();
        try {
            const { data, error } = await supabase
                .from(this.table)
                .update(updates)
                .eq('id', id)
                .eq('organization_id', orgId)
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
        const orgId = organizationService.getCurrentOrgId();
        try {
            const { error } = await supabase
                .from(this.table)
                .delete()
                .eq('id', id)
                .eq('organization_id', orgId);

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
