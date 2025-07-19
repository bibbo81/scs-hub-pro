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

    /**
     * Crea/aggiorna un tracking. La spedizione correlata è gestita da un trigger.
     * @param {TrackingLike} trackingData
     */
    async addTracking(trackingData) {
        if (!this.initialized) {
            throw new Error('DataManager not initialized');
        }

        try {
            const timestamp = new Date().toISOString();

            // 1. Inserimento/aggiornamento del tracking usando l'utility
            const dataWithOrg = {
                ...trackingData,
                organization_id: this.organizationId,
                user_id: this.userId,
                created_at: timestamp,
                updated_at: timestamp
            };

            const tracking = await trackingUpsertUtility.upsertTracking(dataWithOrg);

            // 2. La creazione della spedizione è gestita da un trigger in Supabase.
            // Non è più necessario creare la spedizione manualmente.

            // Notifica alla UI che i dati sono cambiati.
            notifyDataChange('trackings');
            notifyDataChange('shipments');

            console.log('✅ Tracking upserted:', { trackingId: tracking.id });

            // Restituiamo solo il tracking. La UI si aggiornerà per le spedizioni.
            return { tracking };
        } catch (error) {
            console.error('❌ addTracking error:', error);
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
