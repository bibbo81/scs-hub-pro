// core/services/supabase-shipments-service.js
import '/core/supabase-init.js';
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

    /**
     * Create a new shipment in Supabase
     * @param {Object} shipment - Shipment data
     * @returns {Object|null} Inserted shipment or null on failure
     */
    async createShipment(shipment) {
        try {
            const orgId = getActiveOrganizationId();
            if (!orgId) {
                if (typeof window !== 'undefined' && window.NotificationSystem) {
                    window.NotificationSystem.warning('Seleziona un\'organizzazione prima di creare una spedizione');
                }
                return null;
            }

            const {
                data: { user }
            } = await supabase.auth.getUser();
            const userId = user ? user.id : null;
            const payload = this.preparePayload({ ...shipment, organization_id: orgId });

            console.log('Creating shipment', {
                organization_id: orgId,
                user_id: userId,
                payload
            });

            console.log('🚚 Tentativo INSERT shipment su Supabase:');
            console.log('organization_id:', payload.organization_id);
            console.log('user_id:', userId || (supabase.auth && supabase.auth.user && supabase.auth.user().id));
            console.log('Payload completo:', JSON.stringify(payload, null, 2));

            const filters = [];
            if (shipment.shipmentNumber) {
                filters.push(`shipment_number.eq.${shipment.shipmentNumber}`);
            }
            if (shipment.trackingNumber) {
                filters.push(`tracking_number.eq.${shipment.trackingNumber}`);
            }
            if (filters.length > 0) {
                const { data: existing, error: existErr } = await supabase
                    .from(this.table)
                    .select('id')
                    .eq('organization_id', orgId)
                    .or(filters.join(','));
                if (existErr) throw existErr;
                if (existing && existing.length > 0) {
                    console.warn('Shipment already exists for org', orgId);
                    if (typeof window !== 'undefined' && window.NotificationSystem) {
                        window.NotificationSystem.warning('Spedizione già esistente');
                    }
                    return null;
                }
            }

            const { data, error } = await supabase
                .from(this.table)
                .insert([payload])
                .select()
                .single();
            if (error) {
                console.error('❌ Errore INSERT shipment su Supabase:', error);
                console.log('Payload che ha dato errore:', JSON.stringify(payload, null, 2));
                if (error.status === 403) {
                    console.error('403 error creating shipment', { payload, userId });
                }
                throw error;
            }
            console.log('Spedizione creata con successo', data.id);
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
