// Data Manager per sincronizzazione Tracking-Shipments con Supabase
/// <reference path="../typedefs.d.ts" />
import { supabase } from './supabase-client.js';
import ShipmentsService from './shipments-service.js';
import trackingUpsertUtility from './tracking-upsert-utility.js';

class DataManager {
    constructor() {
        this.initialized = false;
        this.organizationId = null; // DINAMICO, non hardcoded
        this.userId = null;
    }

    async init() {
        try {
            // 1. Verifica autenticazione
            const { data: { user }, error } = await supabase.auth.getUser();
            if (error || !user) {
                throw new Error('User not authenticated');
            }
            
            this.userId = user.id;
            console.log('✅ User authenticated:', user.email);
            
            // 2. Recupera DINAMICAMENTE l'organizzazione dell'utente
            const { data: orgMember, error: orgError } = await supabase
                .from('organization_members')
                .select('organization_id, role')
                .eq('user_id', user.id)
                .single();
                
            if (orgError || !orgMember) {
                throw new Error('User not associated with any organization');
            }
            
            this.organizationId = orgMember.organization_id;
            this.userRole = orgMember.role;
            
            console.log('✅ Organization found:', this.organizationId);
            console.log('✅ User role:', this.userRole);
            
            this.initialized = true;
            return true;
            
        } catch (error) {
            console.error('❌ Data Manager init error:', error);
            this.initialized = false;
            throw error;
        }
    }

    // Assicurati che tutti i metodi usino l'organization ID dinamico
    /**
     * Crea un nuovo tracking.
     * @param {TrackingLike} trackingData
     */
    async addTracking(trackingData) {
        if (!this.initialized) {
            throw new Error('DataManager not initialized');
        }
        
        // Aggiungi automaticamente org_id e user_id
        const dataWithOrg = {
            ...trackingData,
            organization_id: this.organizationId, // DINAMICO
            user_id: this.userId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        // Usa l'utility per gestire eventuali duplicati
        const result = await trackingUpsertUtility.insertTrackingReplacingDeleted(dataWithOrg);
        
        if (result.skipped) {
            console.log('⏭️ Tracking creation skipped - active record already exists:', result.existingId);
            // Get the existing record
            const { data: existingTracking, error } = await supabase
                .from('trackings')
                .select('*')
                .eq('id', result.existingId)
                .single();
            
            if (error) throw error;
            return { tracking: existingTracking };
        }

        if (result.inserted) {
            return { tracking: result.data };
        }

        throw new Error('Unexpected result from insertTrackingReplacingDeleted');
    }
    /**
     * Crea tracking e spedizione correlata.
     * @param {TrackingLike} trackingData
     */
    async addTrackingWithShipment(trackingData) {
        if (!this.initialized) {
            throw new Error('DataManager not initialized');
        }

        try {
            const timestamp = new Date().toISOString();

            // 1. Inserimento del tracking usando la nuova utility
            const dataWithOrg = {
                ...trackingData,
                organization_id: this.organizationId,
                user_id: this.userId,
                created_at: timestamp,
                updated_at: timestamp
            };

            const result = await trackingUpsertUtility.insertTrackingReplacingDeleted(dataWithOrg);
            
            let tracking;
            if (result.skipped) {
                console.log('⏭️ Tracking creation skipped - active record already exists:', result.existingId);
                // Get the existing record
                const { data: existingTracking, error } = await supabase
                    .from('trackings')
                    .select('*')
                    .eq('id', result.existingId)
                    .single();
                
                if (error) throw error;
                tracking = existingTracking;
            } else if (result.inserted) {
                tracking = result.data;
            } else {
                throw new Error('Unexpected result from insertTrackingReplacingDeleted');
            }

            // 2. Inserimento della spedizione correlata usando ShipmentsService
            const shipmentPayload = {
                tracking_id: tracking.id,
                tracking_number: tracking.tracking_number,
                status: tracking.status,
                carrier_name: tracking.carrier_name || tracking.carrier_code,
                auto_created: true,
                products: null,
                organization_id: this.organizationId,
                user_id: this.userId,
                created_at: timestamp,
                updated_at: timestamp
            };

            const shipment = await ShipmentsService.createShipment(shipmentPayload);

            console.log('✅ Tracking and shipment created:', { trackingId: tracking.id, shipmentId: shipment.id });

            return { tracking, shipment };
        } catch (error) {
            console.error('❌ addTrackingWithShipment error:', error);
            throw error;
        }
    }

    async getTrackings(filters = {}) {
        if (!this.initialized) {
            throw new Error('DataManager not initialized');
        }

        let query = supabase
            .from('trackings')
            .select('*')
            .eq('organization_id', this.organizationId) // DINAMICO
            .order('created_at', { ascending: false });

        // Applica filtri se presenti
        if (filters.status) {
            query = query.eq('status', filters.status);
        }

        const { data, error } = await query;
        if (error) throw error;

        return data || [];
    }

    async getShipments() {
        if (!this.initialized) {
            throw new Error('DataManager not initialized');
        }
        return await ShipmentsService.getShipmentsByOrganization(this.organizationId);
    }

    /**
     * Elimina un tracking (e la shipment correlata, se esiste)
     * @param {string} trackingId
     */
    async deleteTracking(trackingId) {
        if (!this.initialized) {
            throw new Error('DataManager not initialized');
        }

        const { error } = await supabase
            .from('trackings')
            .delete()
            .eq('id', trackingId)
            .eq('organization_id', this.organizationId); // Sicurezza extra

        if (error) throw error;

        return true;
    }
}

// Export
const dataManager = new DataManager();
export default dataManager;
