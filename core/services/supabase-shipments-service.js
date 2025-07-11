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
     * @param {Object} shipmentData - Shipment data
     * @returns {Object|null} Inserted shipment or null on failure
     */
    async createShipment(shipmentData) {
        try {
            console.log('📦 Creating shipment with data:', shipmentData);
            
            // IMPORTANTE: Ottieni sempre l'utente corrente
            const { data: { user }, error: userError } = await window.supabaseClient.auth.getUser();
            if (userError || !user) {
                console.error('❌ Auth error:', userError);
                throw new Error('User not authenticated');
            }
            
            console.log('Current user:', user.id, user.email);
            
            // Verifica membership (opzionale ma utile per debug)
            const { data: membership } = await window.supabaseClient
                .from('organization_members')
                .select('role')
                .eq('user_id', user.id)
                .eq('organization_id', shipmentData.organization_id)
                .single();
                
            console.log('User membership:', membership);
            
            // CRITICO: Assicurati che user_id sia SEMPRE presente
            const dataToInsert = {
                ...shipmentData,
                user_id: user.id,  // <-- QUESTO È IL FIX PRINCIPALE
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            
            // Rimuovi campi undefined o null che potrebbero causare problemi
            Object.keys(dataToInsert).forEach(key => {
                if (dataToInsert[key] === undefined) {
                    delete dataToInsert[key];
                }
            });
            
            console.log('Final data to insert:', dataToInsert);
            
            // Inserisci il shipment
            const { data, error } = await window.supabaseClient
                .from('shipments')
                .insert([dataToInsert])
                .select()
                .single();
                
            if (error) {
                console.error('❌ Insert error:', error);
                console.error('Full error details:', JSON.stringify(error, null, 2));
                throw error;
            }
            
            console.log('✅ Shipment created successfully:', data);
            return data;
            
        } catch (error) {
            console.error('❌ SupabaseShipmentsService.createShipment failed:', error);
            throw error;
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