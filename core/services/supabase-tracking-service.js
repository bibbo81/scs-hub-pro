// core/services/supabase-tracking-service.js
import { supabase } from '/core/services/supabase-client.js';

class SupabaseTrackingService {
    constructor() {
        this.table = 'trackings';
        this.realtimeSubscription = null;
    }

    // ========================================
    // DATE UTILITIES
    // ========================================
    
    /**
     * Normalize date format to ISO string
     * Handles various date formats: DD/MM/YYYY, DD/MM/YYYY HH:mm:ss, ISO strings, Date objects
     */
    normalizeDateFormat(dateValue) {
        if (!dateValue) return new Date().toISOString();
        
        // Already ISO string
        if (typeof dateValue === 'string' && dateValue.includes('T') && dateValue.includes('Z')) {
            return dateValue;
        }
        
        // Date object
        if (dateValue instanceof Date) {
            return dateValue.toISOString();
        }
        
        // DD/MM/YYYY or DD/MM/YYYY HH:mm:ss format
        if (typeof dateValue === 'string' && dateValue.includes('/')) {
            try {
                const [datePart, timePart] = dateValue.split(' ');
                const [day, month, year] = datePart.split('/');
                
                if (timePart) {
                    const [hours, minutes, seconds = '00'] = timePart.split(':');
                    return new Date(year, month - 1, day, hours, minutes, seconds).toISOString();
                } else {
                    return new Date(year, month - 1, day).toISOString();
                }
            } catch (error) {
                console.warn('[SupabaseTracking] Invalid date format:', dateValue, error);
                return new Date().toISOString();
            }
        }
        
        // Try to parse as regular date string
        try {
            return new Date(dateValue).toISOString();
        } catch (error) {
            console.warn('[SupabaseTracking] Could not parse date:', dateValue, error);
            return new Date().toISOString();
        }
    }

    /**
     * Prepare tracking data for Supabase insertion
     */
    prepareTrackingData(trackingData, userId) {
        // Normalize dates
        const normalizedData = {
            ...trackingData,
            created_at: this.normalizeDateFormat(trackingData.created_at),
            updated_at: this.normalizeDateFormat(trackingData.updated_at),
            user_id: userId
        };

        // Ensure required fields have defaults
        if (!normalizedData.id) {
            normalizedData.id = crypto.randomUUID ? crypto.randomUUID() : `tracking-${Date.now()}`;
        }

        if (!normalizedData.tracking_number) {
            throw new Error('Tracking number is required');
        }

        // Set defaults for optional fields
        normalizedData.current_status = normalizedData.current_status || 'pending';
        normalizedData.carrier_code = normalizedData.carrier_code || 'UNKNOWN';
        normalizedData.tracking_type = normalizedData.tracking_type || 'container';

        // Ensure metadata is an object
        if (typeof normalizedData.metadata === 'string') {
            try {
                normalizedData.metadata = JSON.parse(normalizedData.metadata);
            } catch (e) {
                normalizedData.metadata = { raw: normalizedData.metadata };
            }
        }
        
        normalizedData.metadata = normalizedData.metadata || {};

        return normalizedData;
    }

    // ========================================
    // CRUD OPERATIONS
    // ========================================

    async getAllTrackings() {
        try {
            const user = await this.getCurrentUser();
            if (!user) {
                console.warn('[SupabaseTracking] No authenticated user, returning empty array');
                return [];
            }

            const { data, error } = await supabase
                .from(this.table)
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            console.log(`✅ Loaded ${data.length} trackings from Supabase`);
            
            // Sync to localStorage for offline access
            this.syncToLocalStorage(data);
            
            return data;
        } catch (error) {
            console.error('❌ Error loading trackings:', error);
            // Fallback a localStorage se Supabase fallisce
            return this.getLocalStorageFallback();
        }
    }

    async getTracking(id) {
        try {
            const { data, error } = await supabase
                .from(this.table)
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('❌ Error getting tracking:', error);
            return null;
        }
    }

    async createTracking(trackingData) {
        try {
            // Get authenticated user
            const user = await this.getCurrentUser();
            if (!user) throw new Error('User not authenticated');

            // Prepare and validate data
            const preparedData = this.prepareTrackingData(trackingData, user.id);

            console.log('[SupabaseTracking] Creating tracking:', {
                tracking_number: preparedData.tracking_number,
                user_id: preparedData.user_id,
                carrier_code: preparedData.carrier_code
            });

            const { data, error } = await supabase
                .from(this.table)
                .insert([preparedData])
                .select()
                .single();

            if (error) throw error;

            console.log('✅ Tracking created in Supabase:', data.id);
            
            // Update localStorage for offline access
            this.updateLocalStorage('create', data);
            
            return data;
            
        } catch (error) {
            console.error('❌ Error creating tracking:', error);
            
            // Auth error retry
            if (error.message?.includes('auth') || error.message?.includes('user_id')) {
                console.log('🔄 Retrying with fresh authentication...');
                try {
                    const user = await this.getCurrentUser(true); // Force refresh
                    if (user) {
                        const preparedData = this.prepareTrackingData(trackingData, user.id);
                        const { data, error: retryError } = await supabase
                            .from(this.table)
                            .insert([preparedData])
                            .select()
                            .single();
                        
                        if (!retryError) {
                            console.log('✅ Tracking created on retry:', data.id);
                            this.updateLocalStorage('create', data);
                            return data;
                        }
                    }
                } catch (retryError) {
                    console.error('❌ Retry failed:', retryError);
                }
            }
            
            // Fallback to localStorage
            console.log('📱 Falling back to localStorage storage...');
            return this.saveToLocalStorageFallback(trackingData);
        }
    }

    async updateTracking(id, updates) {
        try {
            // Normalize dates in updates
            const normalizedUpdates = {
                ...updates,
                updated_at: this.normalizeDateFormat(new Date())
            };

            if (normalizedUpdates.created_at) {
                normalizedUpdates.created_at = this.normalizeDateFormat(normalizedUpdates.created_at);
            }

            const { data, error } = await supabase
                .from(this.table)
                .update(normalizedUpdates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            console.log('✅ Tracking updated in Supabase:', id);
            
            // Update localStorage
            this.updateLocalStorage('update', data);
            
            return data;
        } catch (error) {
            console.error('❌ Error updating tracking:', error);
            throw error;
        }
    }

    async deleteTracking(id) {
        try {
            const { error } = await supabase
                .from(this.table)
                .delete()
                .eq('id', id);

            if (error) throw error;

            console.log('✅ Tracking deleted from Supabase:', id);
            
            // Update localStorage
            this.updateLocalStorage('delete', { id });
            
            return true;
        } catch (error) {
            console.error('❌ Error deleting tracking:', error);
            throw error;
        }
    }

    // ========================================
    // USER MANAGEMENT
    // ========================================

    async getCurrentUser(forceRefresh = false) {
        try {
            if (forceRefresh || !this._cachedUser) {
                const { data: { user }, error } = await supabase.auth.getUser();
                if (error) throw error;
                this._cachedUser = user;
            }
            return this._cachedUser;
        } catch (error) {
            console.error('[SupabaseTracking] Error getting current user:', error);
            return null;
        }
    }

    // ========================================
    // LOCALSTORAGE FALLBACK
    // ========================================

    getLocalStorageFallback() {
        try {
            const stored = localStorage.getItem('trackings_backup');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('[SupabaseTracking] localStorage fallback error:', error);
            return [];
        }
    }

    saveToLocalStorageFallback(trackingData) {
        try {
            const existing = this.getLocalStorageFallback();
            const newTracking = {
                ...trackingData,
                id: trackingData.id || `offline-${Date.now()}`,
                created_at: this.normalizeDateFormat(trackingData.created_at),
                updated_at: this.normalizeDateFormat(trackingData.updated_at),
                _offline: true
            };
            
            existing.unshift(newTracking);
            localStorage.setItem('trackings_backup', JSON.stringify(existing));
            
            console.log('📱 Tracking saved to localStorage fallback:', newTracking.id);
            return newTracking;
        } catch (error) {
            console.error('[SupabaseTracking] localStorage save error:', error);
            throw error;
        }
    }

    updateLocalStorage(operation, data) {
        try {
            const existing = this.getLocalStorageFallback();
            
            switch (operation) {
                case 'create':
                    existing.unshift(data);
                    break;
                case 'update':
                    const updateIndex = existing.findIndex(t => t.id === data.id);
                    if (updateIndex > -1) {
                        existing[updateIndex] = data;
                    }
                    break;
                case 'delete':
                    const deleteIndex = existing.findIndex(t => t.id === data.id);
                    if (deleteIndex > -1) {
                        existing.splice(deleteIndex, 1);
                    }
                    break;
            }
            
            localStorage.setItem('trackings_backup', JSON.stringify(existing));
        } catch (error) {
            console.error('[SupabaseTracking] localStorage update error:', error);
        }
    }

    syncToLocalStorage(data) {
        try {
            localStorage.setItem('trackings_backup', JSON.stringify(data));
        } catch (error) {
            console.error('[SupabaseTracking] localStorage sync error:', error);
        }
    }

    // ========================================
    // LEGACY COMPATIBILITY
    // ========================================

    prepareForSupabase(trackingData, userId) {
        return this.prepareTrackingData(trackingData, userId);
    }
}

export default new SupabaseTrackingService();