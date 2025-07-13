// Data Manager per sincronizzazione Tracking-Shipments con Supabase
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