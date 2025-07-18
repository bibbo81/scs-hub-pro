// tracking-upsert-utility.js - Utility for handling tracking upserts with soft-delete logic
import { supabase } from './supabase-client.js';

/**
 * Utility class for handling tracking upserts with proper soft-delete record handling
 */
class TrackingUpsertUtility {
    constructor() {
        this.table = 'trackings';
    }

    /**
     * Insert a tracking record, properly handling soft-deleted duplicates
     * @param {Object} trackingData - The tracking data to insert
     * @returns {Promise<Object>} The inserted tracking record or null if skipped
     */
    async insertTrackingReplacingDeleted(trackingData) {
        try {
            // Validate required fields
            if (!trackingData.user_id || !trackingData.tracking_number || !trackingData.carrier_code) {
                throw new Error('Missing required fields: user_id, tracking_number, carrier_code');
            }

            const { user_id, tracking_number, carrier_code } = trackingData;

            console.log(`🔄 Processing tracking insert: ${tracking_number} (${carrier_code}) for user ${user_id}`);

            // Step 1: Delete any soft-deleted duplicates before insert
            const { error: deleteError } = await supabase
                .from(this.table)
                .delete()
                .eq('user_id', user_id)
                .eq('tracking_number', tracking_number)
                .eq('carrier_code', carrier_code)
                .not('discarded_at', 'is', null);

            if (deleteError) {
                console.warn('⚠️ Error deleting soft-deleted duplicates:', deleteError);
                // Continue anyway - this is not critical
            } else {
                console.log('✅ Cleaned up any soft-deleted duplicates');
            }

            // Step 2: Check for active record
            const { data: existing, error: checkError } = await supabase
                .from(this.table)
                .select('id')
                .eq('user_id', user_id)
                .eq('tracking_number', tracking_number)
                .eq('carrier_code', carrier_code)
                .is('discarded_at', null)
                .maybeSingle();

            if (checkError) {
                throw new Error(`Error checking for existing record: ${checkError.message}`);
            }

            if (existing) {
                console.log(`⏭️ Skipping insert - active record already exists: ${existing.id}`);
                return { skipped: true, existingId: existing.id };
            }

            // Step 3: Safe to insert
            const { data: inserted, error: insertError } = await supabase
                .from(this.table)
                .insert([trackingData])
                .select()
                .single();

            if (insertError) {
                throw new Error(`Error inserting tracking: ${insertError.message}`);
            }

            console.log(`✅ Successfully inserted tracking: ${inserted.id}`);
            return { inserted: true, data: inserted };

        } catch (error) {
            console.error('❌ Error in insertTrackingReplacingDeleted:', error);
            throw error;
        }
    }

    /**
     * Batch insert multiple tracking records with soft-delete handling
     * @param {Array} trackingsData - Array of tracking data objects
     * @returns {Promise<Object>} Results summary
     */
    async batchInsertTrackingsReplacingDeleted(trackingsData) {
        const results = {
            inserted: 0,
            skipped: 0,
            errors: 0,
            details: []
        };

        console.log(`🔄 Starting batch insert of ${trackingsData.length} trackings`);

        for (let i = 0; i < trackingsData.length; i++) {
            const trackingData = trackingsData[i];
            
            try {
                const result = await this.insertTrackingReplacingDeleted(trackingData);
                
                if (result.inserted) {
                    results.inserted++;
                    results.details.push({
                        index: i,
                        tracking_number: trackingData.tracking_number,
                        status: 'inserted',
                        id: result.data.id
                    });
                } else if (result.skipped) {
                    results.skipped++;
                    results.details.push({
                        index: i,
                        tracking_number: trackingData.tracking_number,
                        status: 'skipped',
                        existingId: result.existingId
                    });
                }

            } catch (error) {
                results.errors++;
                results.details.push({
                    index: i,
                    tracking_number: trackingData.tracking_number || 'unknown',
                    status: 'error',
                    error: error.message
                });
                console.error(`❌ Error processing tracking ${i}:`, error);
            }

            // Small delay to prevent overwhelming the database
            if (i > 0 && i % 10 === 0) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        console.log(`✅ Batch insert completed: ${results.inserted} inserted, ${results.skipped} skipped, ${results.errors} errors`);
        return results;
    }

    /**
     * Update an existing tracking record (only active records)
     * @param {string} trackingId - The ID of the tracking to update
     * @param {Object} updates - The updates to apply
     * @returns {Promise<Object>} The updated tracking record
     */
    async updateActiveTracking(trackingId, updates) {
        try {
            const { data, error } = await supabase
                .from(this.table)
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', trackingId)
                .is('discarded_at', null) // Only update active records
                .select()
                .single();

            if (error) {
                throw new Error(`Error updating tracking: ${error.message}`);
            }

            console.log(`✅ Successfully updated tracking: ${trackingId}`);
            return data;

        } catch (error) {
            console.error('❌ Error in updateActiveTracking:', error);
            throw error;
        }
    }

    /**
     * Soft delete a tracking record
     * @param {string} trackingId - The ID of the tracking to delete
     * @returns {Promise<boolean>} Success status
     */
    async softDeleteTracking(trackingId) {
        try {
            const { error } = await supabase
                .from(this.table)
                .update({ discarded_at: new Date().toISOString() })
                .eq('id', trackingId);

            if (error) {
                throw new Error(`Error soft deleting tracking: ${error.message}`);
            }

            console.log(`✅ Successfully soft deleted tracking: ${trackingId}`);
            return true;

        } catch (error) {
            console.error('❌ Error in softDeleteTracking:', error);
            throw error;
        }
    }

    /**
     * Get all active trackings for a user
     * @param {string} userId - The user ID
     * @returns {Promise<Array>} Array of active tracking records
     */
    async getActiveTrackings(userId) {
        try {
            const { data, error } = await supabase
                .from(this.table)
                .select('*')
                .eq('user_id', userId)
                .is('discarded_at', null)
                .order('created_at', { ascending: false });

            if (error) {
                throw new Error(`Error fetching active trackings: ${error.message}`);
            }

            return data || [];

        } catch (error) {
            console.error('❌ Error in getActiveTrackings:', error);
            throw error;
        }
    }

    /**
     * Check if an active tracking exists for the given key
     * @param {string} userId - The user ID
     * @param {string} trackingNumber - The tracking number
     * @param {string} carrierCode - The carrier code
     * @returns {Promise<Object|null>} The existing tracking record or null
     */
    async findActiveTracking(userId, trackingNumber, carrierCode) {
        try {
            const { data, error } = await supabase
                .from(this.table)
                .select('*')
                .eq('user_id', userId)
                .eq('tracking_number', trackingNumber)
                .eq('carrier_code', carrierCode)
                .is('discarded_at', null)
                .maybeSingle();

            if (error) {
                throw new Error(`Error finding active tracking: ${error.message}`);
            }

            return data;

        } catch (error) {
            console.error('❌ Error in findActiveTracking:', error);
            throw error;
        }
    }
}

// Export singleton instance
export default new TrackingUpsertUtility();
