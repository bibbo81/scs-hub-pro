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
            console.error('Errore durante l-aggiornamento dei costi:', error);
            throw error;
        }

        return data;
    }

    /**
     * Recupera tutti gli spedizionieri con statistiche aggregate.
     */
    async getCarriersWithStats() {
        const { data: carriers, error } = await supabase
            .from('carriers')
            .select(`
                *,
                shipments (
                    id,
                    total_cost
                )
            `)
            .eq('organization_id', this.organizationId);

        if (error) {
            console.error("Errore nel recuperare spedizionieri con statistiche:", error);
            throw error;
        }

        return carriers.map(carrier => {
            const shipment_count = carrier.shipments.length;
            const total_spent = carrier.shipments.reduce((sum, s) => sum + (s.total_cost || 0), 0);
            const average_cost = shipment_count > 0 ? total_spent / shipment_count : 0;

            delete carrier.shipments;

            return {
                ...carrier,
                shipment_count,
                total_spent,
                average_cost
            };
        });
    }

    /**
     * Recupera i dettagli di un singolo spedizioniere.
     */
    async getCarrierDetails(carrierId) {
        const { data, error } = await supabase
            .from('carriers')
            .select(`
                *,
                shipments (
                    id,
                    shipment_number,
                    status,
                    total_cost,
                    created_at,
                    origin,
                    destination
                )
            `)
            .eq('id', carrierId)
            .eq('organization_id', this.organizationId)
            .single();

        if (error) {
            console.error("Errore nel recuperare i dettagli dello spedizioniere:", error);
            throw error;
        }

        return data;
    }

    async deleteTracking(trackingId) {
        if (!this.initialized) await this.init();

        const { error } = await supabase
            .from('trackings')
            .delete()
            .eq('id', trackingId);

        if (error) {
            console.error('DataManager deleteTracking error:', error);
            throw error;
        }
        
        if (window.notifyDataChange) {
            window.notifyDataChange('trackings');
            window.notifyDataChange('shipments');
        }
        
        return true;
    }

    /**
     * Recupera i dettagli di una singola spedizione, inclusi prodotti e documenti.
     * @param {string} shipmentId - L'ID della spedizione.
     * @returns {Promise<Object>} Dettagli della spedizione.
     */
    async getShipmentDetails(shipmentId) {
         if (!this.initialized) await this.init();
 
         const { data: shipment, error: shipmentError } = await supabase
             .from('shipments')
             .select('*, carrier:carrier_id (*), freight_cost, other_costs')
             .eq('id', shipmentId)
             .eq('organization_id', this.organizationId)
             .single();
 
         if (shipmentError) {
             console.error("Errore nel recuperare i dettagli della spedizione:", shipmentError);
             throw shipmentError;
         }
 
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
 
         const { data: documents, error: documentsError } = await supabase
             .from('shipment_documents')
             .select('*')
             .eq('shipment_id', shipmentId);
 
         if (documentsError) throw documentsError;
 
         return { ...shipment, products: productsWithDetails, documents };
    }

    /**
     * Aggiunge un prodotto a una spedizione.
     * @param {string} shipmentId - L'ID della spedizione.
     * @param {Object} productData - Dati del prodotto da aggiungere.
     * @returns {Promise<Object>} Il prodotto aggiunto.
     */
    async addShipmentItem(shipmentId, productData) {
         if (!this.initialized) await this.init();
 
         const { data: newItem, error } = await supabase
             .from('shipment_items')
             .insert([{
                 shipment_id: shipmentId,
                 organization_id: this.organizationId,
                 product_id: productData.product_id,
                 name: productData.name,
                 sku: productData.sku,
                 quantity: productData.quantity,
                 unit_value: productData.unit_value,
                 weight_kg: productData.weight_kg,
                 volume_cbm: productData.volume_cbm,
                 total_value: (productData.quantity || 0) * (productData.unit_value || 0),
                 total_weight_kg: (productData.weight_kg || 0) * (productData.quantity || 0),
                 total_volume_cbm: (productData.volume_cbm || 0) * (productData.quantity || 0)
             }])
             .select()
             .single();
 
         if (error) {
             console.error("Errore Supabase nell'aggiungere prodotto:", JSON.stringify(error, null, 2));
             throw error;
         }
 
         if (newItem && newItem.product_id) {
             const { data: productDetails, error: productError } = await supabase
                 .from('products')
                 .select('id, name, sku')
                 .eq('id', newItem.product_id)
                 .single();
 
             if (productError) {
                 console.warn(`Could not fetch product details for new item:`, productError);
                 return newItem;
             }
             return { ...newItem, product: productDetails };
         }
         return newItem;
    }

    /**
     * Rimuove un prodotto da una spedizione.
     * @param {string} shipmentItemId - L'ID dell'item da rimuovere.
     * @returns {Promise<boolean>} True se la rimozione ha avuto successo.
     */
    async deleteShipmentItem(shipmentItemId) {
        if (!this.initialized) await this.init();

        const { error } = await supabase
            .from('shipment_items')
            .delete()
            .eq('id', shipmentItemId)
            .eq('organization_id', this.organizationId);

        if (error) {
            console.error("Errore nella rimozione del prodotto:", error);
            throw error;
        }
        return true;
    }

    /**
     * Carica un documento per una spedizione specifica.
     * @param {string} shipmentId - L'ID della spedizione.
     * @param {File} file - Il file da caricare.
     * @param {string} documentType - Il tipo/descrizione del documento (es. "Fattura").
     * @returns {Promise<Object>} I dati del documento salvato nel database.
     */
    async uploadShipmentDocument(shipmentId, file, documentType) {
        if (!this.initialized) await this.init();

        const fileExtension = file.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExtension}`;
        const filePath = `${this.organizationId}/${shipmentId}/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('shipment-documents')
            .upload(filePath, file);

        if (uploadError) {
            console.error('Errore durante l-upload del file:', uploadError);
            throw uploadError;
        }

        const finalFilePath = uploadData.path;

        const documentRecord = {
            shipment_id: shipmentId,
            organization_id: this.organizationId,
            user_id: this.userId,
            document_name: file.name,
            document_type: documentType,
            file_path: finalFilePath,
            file_size: file.size,
        };

        const { data, error } = await supabase.from('shipment_documents').insert(documentRecord).select().single();
        if (error) throw error;
        return data;
    }

    /**
     * Elimina un documento da una spedizione.
     * @param {string} documentId - L'ID del documento da eliminare.
     * @returns {Promise<boolean>} True se l'eliminazione ha avuto successo.
     */
    async deleteShipmentDocument(documentId) {
        if (!this.initialized) await this.init();

        const { data: doc, error: fetchError } = await supabase
            .from('shipment_documents')
            .select('file_path')
            .eq('id', documentId)
            .single();

        if (fetchError) {
            console.error('Errore nel recuperare il documento:', fetchError);
            throw fetchError;
        }

        if (doc.file_path) {
            const { error: storageError } = await supabase.storage
                .from('shipment-documents')
                .remove([doc.file_path]);
            if (storageError) {
                console.error('Errore nell-eliminare il file dallo storage:', storageError);
                throw storageError;
            }
        }

        const { error: dbError } = await supabase
            .from('shipment_documents')
            .delete()
            .eq('id', documentId);

        if (dbError) {
            console.error('Errore nell-eliminare il record dal database:', dbError);
            throw dbError;
        }

        return true;
    }

    /**
     * Sostituisce un documento esistente con un nuovo file.
     * @param {string} documentId - L'ID del documento da aggiornare.
     * @param {File} newFile - Il nuovo file da caricare.
     * @returns {Promise<Object>} Il record del documento aggiornato.
     */
    async replaceShipmentDocument(documentId, newFile) {
        if (!this.initialized) await this.init();

        const { data: oldDoc, error: fetchError } = await supabase
            .from('shipment_documents')
            .select('file_path, shipment_id')
            .eq('id', documentId)
            .single();

        if (fetchError) {
            console.error('Errore nel recuperare il vecchio documento:', fetchError);
            throw fetchError;
        }

        const fileExtension = newFile.name.split('.').pop();
        const newFileName = `${crypto.randomUUID()}.${fileExtension}`;
        const newFilePath = `${this.organizationId}/${oldDoc.shipment_id}/${newFileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('shipment-documents')
            .upload(newFilePath, newFile);

        if (uploadError) {
            console.error('Errore durante il caricamento del nuovo file:', uploadError);
            throw uploadError;
        }

        const { data: updatedDoc, error: updateError } = await supabase
            .from('shipment_documents')
            .update({
                document_name: newFile.name,
                file_path: uploadData.path,
                file_size: newFile.size,
            })
            .eq('id', documentId)
            .select()
            .single();

        if (updateError) {
            console.error('Errore nell-aggiornare il record del documento:', updateError);
            await supabase.storage.from('shipment-documents').remove([uploadData.path]);
            throw updateError;
        }

        if (oldDoc.file_path) {
            await supabase.storage.from('shipment-documents').remove([oldDoc.file_path]);
        }

        return updatedDoc;
    }

    /**
     * Ottiene l'URL firmato per un file nello storage.
     * @param {string} filePath - Il percorso del file nello storage.
     * @returns {Promise<string|null>} L'URL firmato del file o null se il percorso non è valido.
     */
    async getPublicFileUrl(filePath) {
        if (!filePath) return null;

        const { data, error } = await supabase.storage
            .from('shipment-documents')
            .createSignedUrl(filePath, 60); // The URL will be valid for 60 seconds.

        if (error) {
            console.error('Error creating signed URL:', error);
            return null;
        }

        return data.signedUrl;
    }
}

const dataManager = new DataManager();
export default dataManager;