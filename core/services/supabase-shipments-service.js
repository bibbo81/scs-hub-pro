// core/services/supabase-shipments-service.js
import { supabase } from '/core/services/supabase-client.js';
import { getActiveOrganizationId } from '/core/services/organization-service.js';

class SupabaseShipmentsService {
    constructor() {
        this.table = 'shipments';
    }

    async getAllShipments() {
        try {
            const orgId = getActiveOrganizationId();
            if (!orgId) {
                if (typeof window !== 'undefined' && window.NotificationSystem) {
                    window.NotificationSystem.warning('Seleziona un\'organizzazione per visualizzare le spedizioni');
                }
                return [];
            }
            const query = supabase
                .from(this.table)
                .select('*')
                .eq('organization_id', orgId);
            const { data, error } = await query.order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        } catch (e) {
            console.error('❌ SupabaseShipmentsService.getAllShipments:', e);
            return [];
        }
    }

    camelToSnake(key) {
        return key.replace(/([A-Z])/g, '_$1').toLowerCase();
    }

    preparePayload(shipment) {
        const payload = {};
        Object.entries(shipment).forEach(([key, value]) => {
            if (value === undefined) return;
            if (key === 'carrier' && value) {
                payload.carrier_code = value.code;
                payload.carrier_name = value.name;
                payload.carrier_service = value.service;
                return;
            }

            const snake = this.camelToSnake(key);
            payload[snake] = value;
        });
        return payload;
    }

    async createShipment(shipment) {
        try {
            const orgId = getActiveOrganizationId();
            if (!orgId) {
                if (typeof window !== 'undefined' && window.NotificationSystem) {
                    window.NotificationSystem.warning('Seleziona un\'organizzazione prima di creare una spedizione');
                }
                return null;
            }
            const payload = this.preparePayload({ ...shipment, organization_id: orgId });
            const { data, error } = await supabase
                .from(this.table)
                .insert([payload])
                .select()
                .single();
            if (error) throw error;
            return data;
        } catch (e) {
            console.error('❌ SupabaseShipmentsService.createShipment:', e);
            return null;
        }
    }

    async updateShipment(id, updates) {
        try {
            const orgId = getActiveOrganizationId();
            if (!orgId) {
                if (typeof window !== 'undefined' && window.NotificationSystem) {
                    window.NotificationSystem.warning('Seleziona un\'organizzazione prima di aggiornare una spedizione');
                }
                return null;
            }
            const payload = this.preparePayload({
                ...updates,
                organization_id: orgId,
                updatedAt: new Date().toISOString()
            });
            const { data, error } = await supabase
                .from(this.table)
                .update(payload)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data;
        } catch (e) {
            console.error('❌ SupabaseShipmentsService.updateShipment:', e);
            return null;
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
