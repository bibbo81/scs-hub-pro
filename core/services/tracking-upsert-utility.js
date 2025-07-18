import { supabase } from './supabase-client.js';

/**
 * @typedef {import('../typedefs.d.ts').TrackingLike} TrackingLike
 */

class TrackingUpsertUtility {
    /**
     * Inserisce un nuovo tracking gestendo i duplicati in base a una chiave composita.
     * - Se esiste un record attivo (discarded_at IS NULL), salta l'inserimento.
     * - Se esistono record soft-deleted (discarded_at IS NOT NULL), li elimina prima di inserire il nuovo record.
     * @param {TrackingLike} trackingData - I dati del tracking da inserire. Deve includere organization_id, tracking_number, e carrier_code.
     * @returns {Promise<{inserted: boolean, skipped: boolean, data: TrackingLike|null, existingId: string|null}>} Un oggetto che indica il risultato dell'operazione.
     */
    async insertTrackingReplacingDeleted(trackingData) {
        const { organization_id, tracking_number, carrier_code } = trackingData;

        if (!organization_id || !tracking_number || !carrier_code) {
            throw new Error('organization_id, tracking_number, e carrier_code sono obbligatori per un inserimento sicuro.');
        }

        // 1. Controlla prima se esiste un record attivo per efficienza.
        const { data: existingActive, error: selectError } = await supabase
            .from('trackings')
            .select('id')
            .eq('organization_id', organization_id)
            .eq('tracking_number', tracking_number)
            .eq('carrier_code', carrier_code)
            .is('discarded_at', null)
            .maybeSingle();

        if (selectError) {
            console.error("Errore durante la verifica di tracking attivi esistenti:", selectError);
            throw selectError;
        }

        if (existingActive) {
            console.log(`Tracking attivo già esistente con id: ${existingActive.id}. Inserimento saltato.`);
            return { inserted: false, skipped: true, data: null, existingId: existingActive.id };
        }

        // 2. Se non ci sono record attivi, elimina permanentemente i duplicati in soft-delete.
        const { error: deleteError } = await supabase
            .from('trackings')
            .delete()
            .eq('organization_id', organization_id)
            .eq('tracking_number', tracking_number)
            .eq('carrier_code', carrier_code)
            .not('discarded_at', 'is', null);

        if (deleteError) {
            console.error("Errore durante l'eliminazione dei duplicati in soft-delete:", deleteError);
            throw deleteError;
        }

        // 3. Inserisci il nuovo record di tracking.
        const { data: insertedData, error: insertError } = await supabase.from('trackings').insert(trackingData).select().single();

        if (insertError) {
            console.error("Errore durante l'inserimento del nuovo tracking:", insertError);
            throw insertError;
        }

        console.log(`Nuovo tracking inserito con successo con id: ${insertedData.id}`);
        return { inserted: true, skipped: false, data: insertedData, existingId: null };
    }
}

const trackingUpsertUtility = new TrackingUpsertUtility();
export default trackingUpsertUtility;