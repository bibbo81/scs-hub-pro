// Data Manager per sincronizzazione Tracking-Shipments con Supabase
/// <reference path="../typedefs.d.ts" />
import { supabase } from './supabase-client.js';
import ShipmentsService from './shipments-service.js';
import trackingUpsertUtility from './tracking-upsert-utility.js';

class DataManager {
    constructor() {
        this.initialized = false;
        this.organizationId = null;
        this.userId = null;
        this.initPromise = null; // Singleton promise per l'inizializzazione
    }

    init() {
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = (async () => {
            try {
                const { data: { user }, error } = await supabase.auth.getUser();
                if (error || !user) {
                    throw new Error('User not authenticated');
                }
                
                this.userId = user.id;
                
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
                
                this.initialized = true;
                console.log('✅ Data Manager initialized with Org ID:', this.organizationId);
                return true;
                
            } catch (error) {
                console.error('❌ Data Manager init error:', error);
                this.initialized = false;
                this.initPromise = null; // Permette di riprovare in caso di fallimento
                throw error;
            }
        })();
        
        return this.initPromise;
    }

    async addTracking(trackingData) {
        if (!this.initialized) await this.init();

        const timestamp = new Date().toISOString();
        
        // Assicura che i campi richiesti da upsertTracking siano presenti.
        const dataForUpsert = {
            ...trackingData,
            organization_id: this.organizationId,
            user_id: this.userId,
            created_at: timestamp,
            updated_at: timestamp,
            // Assicura che carrier_code sia presente se manca
            carrier_code: trackingData.carrier_code || trackingData.carrier
        };

        const tracking = await trackingUpsertUtility.upsertTracking(dataForUpsert);

        // Notifica alla UI che i dati sono cambiati.
        if (window.notifyDataChange) {
            window.notifyDataChange('trackings');
            window.notifyDataChange('shipments');
        }

        console.log('✅ Tracking upserted:', { trackingId: tracking.id });
        return { tracking };
    }

    async getTrackings(filters = {}) {
        if (!this.initialized) await this.init();

        let query = supabase
            .from('trackings')
            .select('*')
            .eq('organization_id', this.organizationId)
            .order('created_at', { ascending: false });

        if (filters.status) {
            query = query.eq('status', filters.status);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }

    async getShipments() {
        if (!this.initialized) await this.init();
        return await ShipmentsService.getShipmentsByOrganization(this.organizationId);
    }

    async deleteTracking(trackingId) {
        if (!this.initialized) await this.init();

        // La policy RLS (Row Level Security) garantisce già che un utente
        // possa cancellare solo i record della propria organizzazione.
        // Rimuovere il filtro esplicito .eq('organization_id', ...) risolve
        // il problema del fallimento silenzioso e si affida alla RLS come unica fonte di verità.
        const { error } = await supabase
            .from('trackings')
            .delete()
            .eq('id', trackingId);

        if (error) {
            console.error('DataManager deleteTracking error:', error);
            throw error;
        }
        
        // Notifica il cambiamento per la sincronizzazione tra tab
        if (window.notifyDataChange) {
            window.notifyDataChange('trackings');
            window.notifyDataChange('shipments');
        }
        
        return true;
    }
}

const dataManager = new DataManager();
export default dataManager;
