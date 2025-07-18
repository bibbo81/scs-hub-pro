import { supabase } from './supabase-client.js';

/**
 * @typedef {import('../typedefs.d.ts').TrackingLike} TrackingLike
 */

class TrackingUpsertUtility {
    /**
     * Esegue un semplice upsert del tracking.
     * @param {TrackingLike} trackingData - Dati del tracking da salvare.
     * @returns {Promise<TrackingLike>} Il record inserito o aggiornato.
     */
    async upsertTracking(trackingData) {
        const { data, error } = await supabase
            .from('trackings')
            .upsert(trackingData, {
                onConflict: 'organization_id,tracking_number,carrier_code'
            })
            .select()
            .single();

        if (error) {
            console.error('[TrackingUpsertUtility] Upsert error:', error);
            throw error;
        }

        return data;
    }

    /**
     * Upsert multiplo di più tracking.
     * @param {TrackingLike[]} trackings - Array di tracking da salvare.
     * @returns {Promise<TrackingLike[]>} Array dei record inseriti o aggiornati.
     */
    async batchUpsertTrackings(trackings) {
        const { data, error } = await supabase
            .from('trackings')
            .upsert(trackings, {
                onConflict: 'organization_id,tracking_number,carrier_code'
            })
            .select();

        if (error) {
            console.error('[TrackingUpsertUtility] Batch upsert error:', error);
            throw error;
        }

        return data || [];
    }
}

const trackingUpsertUtility = new TrackingUpsertUtility();
export default trackingUpsertUtility;
