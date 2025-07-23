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

    async getAllProducts() {
        if (!this.initialized) await this.init();

        let query = supabase
            .from('products')
            .select(`
                id,
                name:description,
                sku,
                unit_value:unit_price,
                weight_kg,
                other_description
            `)
            .eq('organization_id', this.organizationId);
        const { data, error } = await query;
        if (error) throw error;

        return data || [];
    }

    // ===== CARRIER MANAGEMENT =====

    async getCarriers() {
        if (!this.initialized) await this.init();
        const { data, error } = await supabase
            .from('carriers')
            .select('*')
            .eq('organization_id', this.organizationId)
            .order('name', { ascending: true });
        if (error) throw error;
        return data || [];
    }

    async getCarrierById(id) {
        if (!this.initialized) await this.init();
        const { data, error } = await supabase
            .from('carriers')
            .select('*')
            .eq('id', id)
            .eq('organization_id', this.organizationId)
            .single();
        if (error) throw error;
        return data;
    }

    async addCarrier(carrierData) {
        if (!this.initialized) await this.init();
        const { data, error } = await supabase
            .from('carriers')
            .insert([{ ...carrierData, organization_id: this.organizationId }])
            .select();
        if (error) throw error;
        return data[0];
    }

    async updateCarrier(id, carrierData) {
        if (!this.initialized) await this.init();
        const { data, error } = await supabase
            .from('carriers')
            .update(carrierData)
            .eq('id', id)
            .eq('organization_id', this.organizationId)
            .select();
        if (error) throw error;
        return data[0];
    }

    async deleteCarrier(id) {
        if (!this.initialized) await this.init();
        const { error } = await supabase
            .from('carriers')
            .delete()
            .eq('id', id)
            .eq('organization_id', this.organizationId);
        if (error) throw error;
        return true;
    }

    async updateShipmentCarrier(shipmentId, carrierId) {
        if (!this.initialized) await this.init();

        const { data, error } = await supabase
            .from('shipments')
            .update({ carrier_id: carrierId })
            .eq('id', shipmentId)
            .eq('organization_id', this.organizationId)
            .select('*, carrier:carrier_id (*)')
            .single();

        if (error) {
            console.error('Errore nell-aggiornare il corriere della spedizione:', error);
            throw error;
        }

        return data;
    }

    /**
     * Recupera tutti gli spedizionieri con statistiche aggregate.
     */
    async getCarriersWithStats() {
        // ... (codice esistente)
    }

    /**
     * Recupera i dettagli di un singolo spedizioniere.
     */
    async getCarrierDetails(carrierId) {
        // ... (codice esistente)
    }

    async deleteTracking(trackingId) {
        // ... (codice esistente)
    }

    /**
     * Recupera i dettagli di una singola spedizione, inclusi prodotti e documenti.
     * @param {string} shipmentId - L'ID della spedizione.
     * @returns {Promise<Object>} Dettagli della spedizione.
     */
    async getShipmentDetails(shipmentId) {
         if (!this.initialized) await this.init();
 
         // 1. Recupera i dati base della spedizione e del carrier
         const { data: shipment, error: shipmentError } = await supabase
             .from('shipments')
             .select('*, carrier:carrier_id (*), freight_cost, other_costs') // Aggiunti nuovi campi
             .eq('id', shipmentId)
             .eq('organization_id', this.organizationId)
             .single();
 
         if (shipmentError) {
             console.error("Errore nel recuperare i dettagli della spedizione:", shipmentError);
             throw shipmentError;
         }
 
         // 2. Recupera gli items della spedizione (senza join)
         const { data: items, error: itemsError } = await supabase
             .from('shipment_items')
             .select('*')
             .eq('shipment_id', shipmentId);
 
         if (itemsError) {
             console.error("Errore nel recuperare gli items della spedizione:", itemsError);
             throw itemsError;
         }
 
         let productsWithDetails = [];
         if (items && items.length > 0) {
             const productIds = items.map(item => item.product_id).filter(id => id);
             if (productIds.length > 0) {
                 const { data: productDetails, error: productDetailsError } = await supabase
                     .from('products')
                     .select('id, name:description, sku')
                     .in('id', productIds);
 
                 if (productDetailsError) throw productDetailsError;
 
                 const productMap = new Map(productDetails.map(p => [p.id, p]));
                 productsWithDetails = items.map(item => ({
                     ...item,
                     product: productMap.get(item.product_id) || null
                 }));
             } else {
                 productsWithDetails = items;
             }
         }
 
         // 7. Recupera i documenti
         const { data: documents, error: documentsError } = await supabase
             .from('shipment_documents')
             .select('*')
             .eq('shipment_id', shipmentId);
 
         if (documentsError) throw documentsError;
 
         // 8. Ritorna l'oggetto completo
         return { ...shipment, products: productsWithDetails, documents };
    }

    /**
     * Aggiorna i costi di una spedizione.
     * @param {string} shipmentId
     * @param {number} freightCost
     * @param {number} otherCosts
     * @returns {Promise<Object>} Dati aggiornati della spedizione.
     */
    async updateShipmentCosts(shipmentId, freightCost, otherCosts) {
        if (!this.initialized) await this.init();

        const totalCost = (freightCost || 0) + (otherCosts || 0);

        const { data, error } = await supabase
            .from('shipments')
            .update({
                freight_cost: freightCost,
                other_costs: otherCosts,
                total_cost: totalCost
            })
            .eq('id', shipmentId)
            .eq('organization_id', this.organizationId)
            .select()
            .single();

        if (error) {
            console.error('Errore nell-aggiornare i costi:', error);
            throw error;
        }
        return data;
    }

    // ... (tutte le altre funzioni esistenti)
}

const dataManager = new DataManager();
export default dataManager;
