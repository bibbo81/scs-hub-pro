// core/services/supabase-shipments-service.js
import { supabase } from '/core/services/supabase-client.js';
import organizationService from '/core/services/organization-service.js';

class SupabaseShipmentsService {
    constructor() {
        this.table = 'shipments';
        this.subscription = null;
    }

    // ========================================
    // CRUD OPERATIONS
    // ========================================

    async getAllShipments(orgId) {
        try {
            const organizationId = orgId || organizationService.getCurrentOrgId();
            const { data, error } = await supabase
                .from(this.table)
                .select('*')
                .eq('organization_id', organizationId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('[SupabaseShipmentsService] getAllShipments:', error);
            return [];
        }
    }

    async getShipment(id) {
        try {
            const organizationId = organizationService.getCurrentOrgId();
            const { data, error } = await supabase
                .from(this.table)
                .select('*')
                .eq('id', id)
                .eq('organization_id', organizationId)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('[SupabaseShipmentsService] getShipment:', error);
            return null;
        }
    }

    async createShipment(data) {
        try {
            const organizationId = organizationService.getCurrentOrgId();
            const { data: created, error } = await supabase
                .from(this.table)
                .insert([{ ...data, organization_id: organizationId }])
                .select()
                .single();

            if (error) throw error;
            return created;
        } catch (error) {
            console.error('[SupabaseShipmentsService] createShipment:', error);
            return null;
        }
    }

    async updateShipment(id, updates) {
        try {
            const organizationId = organizationService.getCurrentOrgId();
            const { data, error } = await supabase
                .from(this.table)
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .eq('organization_id', organizationId)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('[SupabaseShipmentsService] updateShipment:', error);
            return null;
        }
    }

    async deleteShipment(id) {
        try {
            const organizationId = organizationService.getCurrentOrgId();
            const { error } = await supabase
                .from(this.table)
                .delete()
                .eq('id', id)
                .eq('organization_id', organizationId);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('[SupabaseShipmentsService] deleteShipment:', error);
            return false;
        }
    }

    // ========================================
    // REALTIME SUBSCRIPTIONS
    // ========================================

    subscribeToChanges(callback) {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }

        const organizationId = organizationService.getCurrentOrgId();
        this.subscription = supabase
            .channel('shipments_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: this.table,
                    filter: `organization_id=eq.${organizationId}`
                },
                (payload) => {
                    callback(payload);
                }
            )
            .subscribe();

        return this.subscription;
    }

    unsubscribe() {
        if (this.subscription) {
            this.subscription.unsubscribe();
            this.subscription = null;
        }
    }
}

export default new SupabaseShipmentsService();
