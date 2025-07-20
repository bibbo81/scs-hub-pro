import { supabase } from './supabase-client.js';

/**
 * @typedef {import('../typedefs.d.ts').TrackingLike} TrackingLike
 */

class TrackingUpsertUtility {
    /**
     * Esegue un upsert intelligente del tracking per evitare di riutilizzare record cancellati.
     * - Se esistono record soft-deleted, li elimina permanentemente.
     * - Se esiste un tracking attivo, lo restituisce (salta inserimento).
     * - Altrimenti, inserisce il nuovo tracking.
     * @param {TrackingLike} trackingData - Dati del tracking da salvare.
     * @returns {Promise<TrackingLike>} Il record attivo.
     */
    async upsertTracking(trackingData) {
        const { organization_id, tracking_number, carrier_code } = trackingData;

        if (!organization_id || !tracking_number || !carrier_code) {
            throw new Error('organization_id, tracking_number, and carrier_code are required for upsert.');
        }

        // 1. Cerca record esistenti (attivi e soft-deleted)
        const { data: existingRecords, error: findError } = await supabase
            .from('trackings')
            .select('id, deleted_at')
            .eq('organization_id', organization_id)
            .eq('tracking_number', tracking_number)
            .eq('carrier_code', carrier_code);

        if (findError) {
            console.error('[TrackingUpsertUtility] Error finding existing trackings:', findError);
            throw findError;
        }

        // 2. Se esistono record soft-deleted, cancellali permanentemente per evitare dati sporchi.
        const deletedIds = existingRecords?.filter(t => t.deleted_at !== null).map(t => t.id);
        if (deletedIds && deletedIds.length > 0) {
            console.log(`[TrackingUpsertUtility] Deleting ${deletedIds.length} soft-deleted duplicates for ${tracking_number}.`);
            const { error: deleteError } = await supabase
                .from('trackings')
                .delete()
                .in('id', deletedIds);

            if (deleteError) {
                console.error('[TrackingUpsertUtility] Error deleting soft-deleted trackings:', deleteError);
            }
        }

        // 3. Se esiste un record ATTIVO, salta l'inserimento e restituiscilo.
        const activeRecord = existingRecords?.find(t => t.deleted_at === null);
        if (activeRecord) {
            console.log(`[TrackingUpsertUtility] Active tracking ${tracking_number} already exists. Fetching full record.`);
            const { data: fullActiveRecord, error: fetchError } = await supabase
                .from('trackings')
                .select('*')
                .eq('id', activeRecord.id)
                .single();
            
            if (fetchError) {
                console.error('[TrackingUpsertUtility] Error fetching full active record:', fetchError);
                throw fetchError;
            }
            return fullActiveRecord;
        }

        // 4. Se non ci sono record attivi, inserisci il nuovo record.
        // **FIX**: Pulisci l'oggetto trackingData per inviare solo le colonne valide.
        const validColumns = [
            'id', 'user_id', 'tracking_number', 'tracking_type', 'carrier_code', 'carrier_name', 
            'reference_number', 'status', 'origin_port', 'origin_country', 'destination_port', 
            'destination_country', 'eta', 'ata', 'last_event_date', 'last_event_location', 
            'last_event_description', 'metadata', 'created_at', 'updated_at', 'organization_id', 
            'vessel_name', 'vessel_imo', 'voyage_number', 'container_size', 'container_type', 
            'container_count', 'date_of_loading', 'date_of_departure', 'date_of_discharge', 
            'booking_number', 'bl_number', 'transit_time', 'co2_emission', 'ts_count', 'carrier', 
            'origin', 'destination', 'estimated_delivery', 'actual_delivery', 'shipped_date', 
            'created_by', 'deleted_at'
        ];

        const cleanData = {};
        for (const col of validColumns) {
            if (trackingData[col] !== undefined && trackingData[col] !== null) {
                cleanData[col] = trackingData[col];
            }
        }
        
        // Assicura che i campi obbligatori (NOT NULL) abbiano un valore.
        if (!cleanData.tracking_type) {
            cleanData.tracking_type = 'container'; // Imposta un default se mancante
        }

        console.log(`[TrackingUpsertUtility] Inserting new tracking for ${tracking_number}.`);
        const { data: newTracking, error: insertError } = await supabase
            .from('trackings')
            .insert(cleanData) // Usa l'oggetto pulito
            .select()
            .single();

        if (insertError) {
            console.error('[TrackingUpsertUtility] Insert error:', insertError);
            throw insertError;
        }

        console.log(`[TrackingUpsertUtility] ✅ New tracking created: ${newTracking.id}`);
        return newTracking;
    }

    /**
     * Upsert multiplo di più tracking usando la logica intelligente.
     * @param {TrackingLike[]} trackings - Array di tracking da salvare.
     * @returns {Promise<TrackingLike[]>} Array dei record attivi.
     */
    async batchUpsertTrackings(trackings) {
        if (!trackings || trackings.length === 0) {
            return [];
        }

        // Esegue gli upsert in parallelo per efficienza, gestendo errori individuali.
        const upsertPromises = trackings.map(tracking => this.upsertTracking(tracking));
        
        const results = await Promise.allSettled(upsertPromises);

        const successfulUpserts = [];
        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                successfulUpserts.push(result.value);
            } else {
                console.error(`[TrackingUpsertUtility] Batch upsert failed for tracking #${index} (${trackings[index].tracking_number}):`, result.reason);
            }
        });

        return successfulUpserts;
    }
}

const trackingUpsertUtility = new TrackingUpsertUtility();
export default trackingUpsertUtility;
