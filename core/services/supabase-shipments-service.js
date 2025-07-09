// core/services/supabase-shipments-service.js
import { supabase } from '/core/services/supabase-client.js';
import organizationService from '/core/services/organization-service.js';

class SupabaseShipmentsService {
    constructor() {
        this.table = 'shipments';
    }

    async getAllShipments() {
        try {
            const orgId = organizationService.getCurrentOrgId();
            let query = supabase.from(this.table).select('*');
            if (orgId) query = query.eq('organization_id', orgId);
            const { data, error } = await query.order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        } catch (e) {
            console.error('❌ SupabaseShipmentsService.getAllShipments:', e);
            return [];
        }
    }

    async createShipment(shipment) {
        try {
            const orgId = organizationService.getCurrentOrgId();
            const payload = { ...shipment, organization_id: orgId };
            // Map camelCase properties to snake_case columns
            if (payload.autoCreated !== undefined) {
                payload.auto_created = payload.autoCreated;
                delete payload.autoCreated;
            }
            if (payload.createdFrom !== undefined) {
                payload.created_from = payload.createdFrom;
                delete payload.createdFrom;
            }
            if (payload.sourceTrackingId !== undefined) {
                payload.source_tracking_id = payload.sourceTrackingId;
                delete payload.sourceTrackingId;
            }
            const { data, error } = await supabase
                .from(this.table)
                .insert([payload])
                .select()
                .single();
            if (error) throw error;
            return data;
        } catch (e) {
            console.error('❌ SupabaseShipmentsService.createShipment:', e);
            throw e;
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
        } catch (e) {
            console.error('❌ SupabaseShipmentsService.updateShipment:', e);
            throw e;
        }
    }

    async deleteShipment(id) {
        try {
            const { error } = await supabase.from(this.table).delete().eq('id', id);
            if (error) throw error;
            return true;
        } catch (e) {
            console.error('❌ SupabaseShipmentsService.deleteShipment:', e);
            throw e;
        }
    }
}

export default new SupabaseShipmentsService();
