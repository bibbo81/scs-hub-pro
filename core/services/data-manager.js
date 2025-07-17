// Data Manager per sincronizzazione Tracking-Shipments con Supabase
/// <reference path="../typedefs.d.ts" />
import { supabase } from './supabase-client.js';

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
        
        // Inserisci nel database
        const { data: tracking, error } = await supabase
            .from('trackings')
            .insert([dataWithOrg])
            .select()
            .single();
            
        if (error) throw error;
        
        return { tracking };
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

            // 1. Inserimento del tracking
            const { data: tracking, error: trackErr } = await supabase
                .from('trackings')
                .insert([{ 
                    ...trackingData,
                    organization_id: this.organizationId,
                    user_id: this.userId,
                    created_at: timestamp,
                    updated_at: timestamp
                }])
                .select()
                .single();

            if (trackErr) throw trackErr;

        // 2. Inserimento della spedizione correlata con tracking_number
        const { data: shipment, error: shipErr } = await supabase
            .from('shipments')
            .insert([
                {
                    tracking_id: tracking.id,
                    tracking_number: tracking.tracking_number,
                    status: tracking.status,
                    carrier_name: tracking.carrier_code,
                    auto_created: true,
                    products: null,
                    organization_id: this.organizationId,
                    user_id: this.userId,
                    created_at: timestamp,
                    updated_at: timestamp
                }
            ])
                .select()
                .single();

            if (shipErr) throw shipErr;

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
    
    async getShipments(filters = {}) {
        if (!this.initialized) {
            throw new Error('DataManager not initialized');
        }
        
        let query = supabase
            .from('shipments')
            .select(`
                *,
                tracking:tracking_id (
                    tracking_number,
                    carrier,
                    status,
                    last_event_description
                )
            `)
            .eq('organization_id', this.organizationId) // DINAMICO
            .order('created_at', { ascending: false });
            
        const { data, error } = await query;
        if (error) throw error;
        
        return data || [];
    }
}

// Export
const dataManager = new DataManager();
export default dataManager;