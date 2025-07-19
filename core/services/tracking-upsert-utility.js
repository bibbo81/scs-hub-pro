import { supabase } from './supabase-client.js';

/**
 * @typedef {import('../typedefs.d.ts').TrackingLike} TrackingLike
 */

class TrackingUpsertUtility {
    /**
     * Esegue un upsert intelligente del tracking per evitare di riutilizzare record cancellati.
     * - Se esiste un tracking attivo, lo restituisce.
     * - Se esistono duplicati soft-deleted, li elimina permanentemente.
     * - Inserisce il nuovo tracking.
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

        // 2. Se esiste un record ATTIVO, restituiscilo.
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

        // 3. Se esistono record soft-deleted, cancellali permanentemente.
        const deletedIds = existingRecords?.filter(t => t.deleted_at !== null).map(t => t.id);
        if (deletedIds && deletedIds.length > 0) {
            console.log(`[TrackingUpsertUtility] Deleting ${deletedIds.length} soft-deleted duplicates for ${tracking_number}.`);
            const { error: deleteError } = await supabase
                .from('trackings')
                .delete()
                .in('id', deletedIds);

            if (deleteError) {
                // Non bloccare l'inserimento, ma logga l'errore
                console.error('[TrackingUpsertUtility] Error deleting soft-deleted trackings:', deleteError);
            }
        }

        // 4. Inserisci il nuovo record.
        console.log(`[TrackingUpsertUtility] Inserting new tracking for ${tracking_number}.`);
        const { data: newTracking, error: insertError } = await supabase
            .from('trackings')
            .insert(trackingData)
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
