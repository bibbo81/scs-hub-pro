// core/services/supabase-shipments-service.js
import '/core/supabase-init.js';
import { getSupabase } from '/core/services/supabase-client.js';
import { getMyOrganizationId } from '/core/services/organization-service.js';

class SupabaseShipmentsService {
    constructor() {
        this.table = 'shipments';
        this.initialized = false;
        this.initPromise = null;
    }

    async ensureInitialized() {
        if (this.initialized) return true;
        
        if (this.initPromise) {
            return this.initPromise;
        }
        
        this.initPromise = this._initialize();
        return this.initPromise;
    }
    
    async _initialize() {
        try {
            // Wait for Supabase to be ready
            let attempts = 0;
            const maxAttempts = 10;
            
            while (attempts < maxAttempts) {
                try {
                    const supabase = getSupabase();
                    if (supabase) {
                        // Test if we can get organization
                        const orgId = await getMyOrganizationId(supabase);
                        if (orgId || attempts > 5) { // Allow proceeding without org after some attempts
                            this.initialized = true;
                            return true;
                        }
                    }
                } catch (e) {
                    console.log(`Waiting for initialization... attempt ${attempts + 1}/${maxAttempts}`);
                }
                
                await new Promise(resolve => setTimeout(resolve, 1000));
                attempts++;
            }
            
            console.warn('Initialization completed with warnings');
            this.initialized = true;
            return true;
        } catch (error) {
            console.error('Failed to initialize SupabaseShipmentsService:', error);
            this.initialized = false;
            throw error;
        }
    }

    async getAllShipments() {
        try {
            await this.ensureInitialized();
            
            const supabase = getSupabase();
            if (!supabase) {
                return [];
            }
            let orgId;
            try {
                orgId = await getMyOrganizationId(supabase);
            } catch (e) {
                console.error('Organization ID not found', e);
                return [];
            }
            
            if (!orgId) {
                console.warn('No organization ID, returning empty shipments');
                return [];
            }
            
            const query = supabase
                .from(this.table)
                .select('*')
                .eq('organization_id', orgId);
            const { data, error } = await query.order('created_at', { ascending: false });
            if (error) throw error;
            
            console.log(`✅ Loaded ${data?.length || 0} shipments from Supabase`);
            return data || [];
        } catch (e) {
            console.error('❌ SupabaseShipmentsService.getAllShipments:', e.message);
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
        let orgId = null;
        let userId = null;
        try {
            await this.ensureInitialized();
            
            const supabase = getSupabase();
            if (!supabase) {
                return null;
            }
            try {
                orgId = await getMyOrganizationId(supabase);
            } catch (e) {
                console.error('Organization ID not found', e);
                return null;
            }

            const {
                data: { user }
            } = await supabase.auth.getUser();
            userId = user ? user.id : null;

            console.log('[DEBUG] Utente attivo:', userId);
            console.log('[DEBUG] Organization ID:', orgId);
            console.log('[DEBUG] shipmentData:', shipment);
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
                if (error.code === '42501') {
                    if (typeof window !== 'undefined' && window.NotificationSystem) {
                        window.NotificationSystem.error('Non sei autorizzato a creare una spedizione per questa organizzazione');
                    }
                    console.error(`Verifica che l'utente sia presente nella tabella organization_members per organization_id=${orgId}`);
                    console.error(
                        `SELECT * FROM organization_members WHERE user_id = '${userId}' AND organization_id = '${orgId}';`
                    );
                    console.info("Se manca il record, aggiungi l'utente alla tabella organization_members tramite SQL o dall'interfaccia Supabase.");
                    console.info('Se l\'errore persiste ma l\'utente è presente, verifica che il token di sessione sia aggiornato e non scaduto.');
                }
                throw error;
            }
            console.log('Spedizione creata con successo', data.id);
            return data;
        } catch (e) {
            console.error('[DEBUG] user_id:', userId);
            console.error('[DEBUG] organization_id:', orgId);
            console.error('[DEBUG] errore ricevuto:', e);
            console.error('❌ SupabaseShipmentsService.createShipment:', e);
            return null;
        }
    }

    async updateShipment(id, updates) {
        try {
            await this.ensureInitialized();
            
            const supabase = getSupabase();
            if (!supabase) {
                return null;
            }
            let orgId;
            try {
                orgId = await getMyOrganizationId(supabase);
            } catch (e) {
                console.error('Organization ID not found', e);
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
            await this.ensureInitialized();
            
            const supabase = getSupabase();
            if (!supabase) {
                throw new Error('Supabase client non disponibile');
            }
            const { error } = await supabase.from(this.table).delete().eq('id', id);
            if (error) throw error;
            return true;
        } catch (e) {
            console.error('❌ SupabaseShipmentsService.deleteShipment:', e);
            throw e;
        }
    }
}

// Export as singleton
const shipmentsService = new SupabaseShipmentsService();

// Make available globally
if (typeof window !== 'undefined') {
    window.SupabaseShipmentsService = shipmentsService;
}

export default shipmentsService;