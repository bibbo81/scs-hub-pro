import { supabase } from './supabase-client.js';

/**
 * @typedef {import('../typedefs.d.ts').TrackingLike} TrackingLike
 */

class TrackingUpsertUtility {
    /**
     * Inserisce un nuovo tracking gestendo i duplicati in base a una chiave composita.
     * Se esiste già un record con la stessa chiave, l'inserimento viene saltato.
     * @param {TrackingLike} trackingData - I dati del tracking da inserire. Deve includere organization_id, tracking_number, e carrier_code.
     * @returns {Promise<{inserted: boolean, skipped: boolean, data: TrackingLike|null, existingId: string|null}>}
     */
    async insertTrackingReplacingDeleted(trackingData) {
        const { organization_id, tracking_number, carrier_code } = trackingData;

        if (!organization_id || !tracking_number || !carrier_code) {
            throw new Error('organization_id, tracking_number, e carrier_code sono obbligatori per un inserimento sicuro.');
        }

        // 1. Controlla se esiste già un record con la stessa chiave
        const { data: existingActive, error: selectError } = await supabase
            .from('trackings')
            .select('id')
            .eq('organization_id', organization_id)
            .eq('tracking_number', tracking_number)
            .eq('carrier_code', carrier_code)
            .maybeSingle();

        if (selectError) {
            console.error("Errore durante la verifica di tracking attivi esistenti:", selectError);
            throw selectError;
        }

        if (existingActive) {
            // Esiste già: non inserire nulla!
            console.log(`[TrackingUpsertUtility] Tracking attivo già presente (id: ${existingActive.id}), inserimento saltato.`);
            return { inserted: false, skipped: true, data: null, existingId: existingActive.id };
        }

        // 2. Elimina eventuali duplicati esistenti
        const { error: deleteError } = await supabase
            .from('trackings')
            .delete()
            .eq('organization_id', organization_id)
            .eq('tracking_number', tracking_number)
            .eq('carrier_code', carrier_code);

        if (deleteError) {
            // Nota: se la foreign key su shipments blocca la DELETE, segnala errore.
            if (deleteError.code === '23503') {
                console.error('[TrackingUpsertUtility] Impossibile eliminare i duplicati perché referenziati in altre tabelle (es. shipments):', deleteError);
                throw new Error('Impossibile eliminare i duplicati: record ancora referenziato.');
            } else {
                console.error('[TrackingUpsertUtility] Errore durante eliminazione duplicati:', deleteError);
                throw deleteError;
            }
        }

        // 3. Inserisci il nuovo tracking
        const { data: insertedData, error: insertError } = await supabase
            .from('trackings')
            .insert(trackingData)
            .select()
            .single();

        if (insertError) {
            console.error("[TrackingUpsertUtility] Errore durante l'inserimento del nuovo tracking:", insertError);
            throw insertError;
        }

        console.log(`[TrackingUpsertUtility] Nuovo tracking inserito con successo! id: ${insertedData.id}`);
        return { inserted: true, skipped: false, data: insertedData, existingId: null };
    }
}

const trackingUpsertUtility = new TrackingUpsertUtility();
export default trackingUpsertUtility;
