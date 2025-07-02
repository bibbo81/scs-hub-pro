// core/services/supabase-tracking-service.js
import { supabase, requireAuth } from '/core/services/supabase-client.js';

class SupabaseTrackingService {
    constructor() {
        this.table = 'trackings';
        this.realtimeSubscription = null;
    }

    // ========================================
    // CRUD OPERATIONS
    // ========================================

    async getAllTrackings() {
        try {
            // SEMPRE richiedi autenticazione
            const user = await requireAuth();
            
            const { data, error } = await supabase
                .from(this.table)
                .select('*')
                .eq('user_id', user.id) // Solo trackings dell'utente
                .order('created_at', { ascending: false });

            if (error) throw error;

            console.log(`✅ Loaded ${data.length} trackings for user ${user.id}`);
            return data;
            
        } catch (error) {
            console.error('❌ Error loading trackings:', error);
            // Fallback a localStorage se Supabase fallisce
            return this.getLocalStorageFallback();
        }
    }

    async getTracking(id) {
        try {
            const user = await requireAuth();
            
            const { data, error } = await supabase
                .from(this.table)
                .select('*')
                .eq('id', id)
                .eq('user_id', user.id) // Sicurezza: solo trackings dell'utente
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
            // SEMPRE richiedi autenticazione
            const user = await requireAuth();
            
            // Prepara i dati per Supabase
            const supabaseData = {
                ...this.prepareForSupabase(trackingData, user.id),
                user_id: user.id, // Assicurati che user_id sia sempre presente
                organization_id: null // Per ora null, in futuro sarà l'org corrente
            };

            console.log('📝 Creating tracking with data:', {
                tracking_number: supabaseData.tracking_number,
                user_id: supabaseData.user_id,
                carrier_code: supabaseData.carrier_code
            });

            const { data, error } = await supabase
                .from(this.table)
                .insert([supabaseData])
                .select()
                .single();

            if (error) throw error;

            console.log('✅ Tracking created with auth:', data.id);
            
            // Aggiorna anche localStorage per backward compatibility
            this.updateLocalStorage('create', data);
            
            return data;
            
        } catch (error) {
            console.error('❌ Error creating tracking:', error);
            
            // Se è un errore di auth, riprova
            if (error.message?.includes('auth') || error.message?.includes('user_id')) {
                console.log('🔄 Retrying with fresh auth...');
                try {
                    await requireAuth();
                    return this.createTracking(trackingData);
                } catch (retryError) {
                    console.error('❌ Retry failed:', retryError);
                }
            }
            
            // Fallback: salva solo in localStorage
            return this.saveToLocalStorageFallback(trackingData);
        }
    }

    async updateTracking(id, updates) {
        try {
            const user = await requireAuth();
            
            const { data, error } = await supabase
                .from(this.table)
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .eq('user_id', user.id) // Sicurezza: solo trackings dell'utente
                .select()
                .single();

            if (error) throw error;

            console.log('✅ Tracking updated in Supabase:', id);
            
            // Aggiorna anche localStorage
            this.updateLocalStorage('update', data);
            
            return data;
        } catch (error) {
            console.error('❌ Error updating tracking:', error);
            return null;
        }
    }

    async deleteTracking(id) {
        try {
            const user = await requireAuth();
            
            const { error } = await supabase
                .from(this.table)
                .delete()
                .eq('id', id)
                .eq('user_id', user.id); // Sicurezza: solo trackings dell'utente

            if (error) throw error;

            console.log('✅ Tracking deleted from Supabase:', id);
            
            // Rimuovi anche da localStorage
            this.updateLocalStorage('delete', { id });
            
            return true;
        } catch (error) {
            console.error('❌ Error deleting tracking:', error);
            return false;
        }
    }

    // ========================================
    // DATA PREPARATION
    // ========================================

    prepareForSupabase(trackingData, userId) {
        // Mappa i campi dal formato localStorage al formato Supabase
        const prepared = {
            user_id: userId,
            tracking_number: trackingData.tracking_number || trackingData.trackingNumber,
            tracking_type: trackingData.tracking_type || trackingData.trackingType || 'container',
            carrier_code: trackingData.carrier_code || trackingData.carrier || null,
            carrier_name: trackingData.carrier_name || trackingData.carrier_code || null,
            reference_number: trackingData.reference_number || trackingData.reference || null,
            status: trackingData.status || 'registered',
            
            // Campi geografici
            origin_port: trackingData.origin_port || trackingData.origin || null,
            origin_country: trackingData.origin_country || this.extractCountry(trackingData.origin) || null,
            destination_port: trackingData.destination_port || trackingData.destination || null,
            destination_country: trackingData.destination_country || this.extractCountry(trackingData.destination) || null,
            
            // Date
            eta: this.parseDate(trackingData.eta),
            ata: this.parseDate(trackingData.ata),
            
            // Eventi
            last_event_date: this.parseDate(trackingData.last_event_date),
            last_event_location: trackingData.last_event_location || trackingData.ultima_posizione || null,
            last_event_description: trackingData.last_event_description || null,
            
            // Metadata - salva tutto il resto
            metadata: {
                ...trackingData.metadata,
                // Aggiungi tutti i campi extra non mappati
                original_data: trackingData,
                import_source: trackingData.dataSource || 'manual',
                shipsgo_id: trackingData.metadata?.shipsgo_id,
                vessel_info: trackingData.vessel,
                route_info: trackingData.route,
                events: trackingData.events || [],
                
                // Campi specifici ShipsGo
                booking: trackingData.booking,
                container_count: trackingData.container_count,
                co2_emission: trackingData.co2_emission,
                transit_time: trackingData.transit_time,
                ts_count: trackingData.ts_count,
                airline: trackingData.airline,
                awb_number: trackingData.awb_number,
                date_of_loading: trackingData.date_of_loading,
                date_of_departure: trackingData.date_of_departure,
                date_of_arrival: trackingData.date_of_arrival,
                date_of_discharge: trackingData.date_of_discharge
            },
            
            // Timestamps
            created_at: trackingData.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        // Rimuovi campi undefined/null per evitare errori
        Object.keys(prepared).forEach(key => {
            if (prepared[key] === undefined) {
                delete prepared[key];
            }
        });

        return prepared;
    }

    parseDate(dateValue) {
        if (!dateValue || dateValue === '-') return null;
        
        try {
            // Se è già una data ISO valida
            if (typeof dateValue === 'string' && dateValue.match(/^\d{4}-\d{2}-\d{2}/)) {
                return new Date(dateValue).toISOString();
            }
            
            // Se è formato italiano DD/MM/YYYY
            if (typeof dateValue === 'string' && dateValue.match(/^\d{2}\/\d{2}\/\d{4}/)) {
                const [day, month, year] = dateValue.split('/');
                return new Date(year, month - 1, day).toISOString();
            }
            
            // Prova parsing generico
            const parsed = new Date(dateValue);
            if (!isNaN(parsed.getTime())) {
                return parsed.toISOString();
            }
        } catch (e) {
            console.warn('Date parse error:', dateValue, e);
        }
        
        return null;
    }

    extractCountry(location) {
        // Estrai il paese dal nome del porto/aeroporto
        if (!location) return null;
        
        // Mappa dei principali porti/aeroporti ai paesi
        const locationToCountry = {
            'SHANGHAI': 'China',
            'GENOVA': 'Italy',
            'GENOA': 'Italy',
            'HKG': 'Hong Kong',
            'MXP': 'Italy',
            'FCO': 'Italy',
            // ... aggiungi altri mapping
        };
        
        return locationToCountry[location.toUpperCase()] || null;
    }

    // ========================================
    // REALTIME SUBSCRIPTIONS
    // ========================================

    subscribeToChanges(callback) {
        // Cancella subscription esistente
        if (this.realtimeSubscription) {
            this.realtimeSubscription.unsubscribe();
        }

        this.realtimeSubscription = supabase
            .channel('trackings_changes')
            .on('postgres_changes', 
                { 
                    event: '*', 
                    schema: 'public', 
                    table: this.table,
                    filter: `user_id=eq.${supabase.auth.user()?.id}` // Solo cambiamenti dell'utente
                },
                (payload) => {
                    console.log('🔄 Realtime update:', payload.eventType);
                    callback(payload);
                }
            )
            .subscribe();

        return this.realtimeSubscription;
    }

    unsubscribe() {
        if (this.realtimeSubscription) {
            this.realtimeSubscription.unsubscribe();
            this.realtimeSubscription = null;
        }
    }

    // ========================================
    // UTILITIES
    // ========================================

    async getCurrentUser() {
        return await requireAuth();
    }

    // Backward compatibility con localStorage
    updateLocalStorage(operation, data) {
        try {
            let trackings = JSON.parse(localStorage.getItem('trackings') || '[]');
            
            switch(operation) {
                case 'create':
                    trackings.push(this.convertFromSupabase(data));
                    break;
                case 'update':
                    const index = trackings.findIndex(t => t.id === data.id);
                    if (index !== -1) {
                        trackings[index] = this.convertFromSupabase(data);
                    }
                    break;
                case 'delete':
                    trackings = trackings.filter(t => t.id !== data.id);
                    break;
            }
            
            localStorage.setItem('trackings', JSON.stringify(trackings));
        } catch (e) {
            console.warn('localStorage update failed:', e);
        }
    }

    convertFromSupabase(supabaseData) {
        // Converti dal formato Supabase al formato localStorage
        return {
            id: supabaseData.id,
            tracking_number: supabaseData.tracking_number,
            tracking_type: supabaseData.tracking_type,
            carrier_code: supabaseData.carrier_code,
            carrier: supabaseData.carrier_code,
            status: supabaseData.status,
            origin_port: supabaseData.origin_port,
            destination_port: supabaseData.destination_port,
            reference_number: supabaseData.reference_number,
            eta: supabaseData.eta,
            created_at: supabaseData.created_at,
            updated_at: supabaseData.updated_at,
            
            // Estrai metadata
            ...(supabaseData.metadata || {}),
            
            // Mantieni metadata originale
            metadata: supabaseData.metadata
        };
    }

    getLocalStorageFallback() {
        try {
            const stored = localStorage.getItem('trackings');
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            return [];
        }
    }

    async saveToLocalStorageFallback(trackingData) {
        try {
            const trackings = this.getLocalStorageFallback();
            const newTracking = {
                ...trackingData,
                id: Date.now().toString(),
                created_at: new Date().toISOString()
            };
            trackings.push(newTracking);
            localStorage.setItem('trackings', JSON.stringify(trackings));
            return newTracking;
        } catch (e) {
            console.error('Fallback save failed:', e);
            return null;
        }
    }

    // ========================================
    // MIGRAZIONE DATI
    // ========================================

    async migrateFromLocalStorage() {
        console.log('🔄 Starting migration from localStorage to Supabase...');
        
        try {
            const user = await requireAuth();

            const localTrackings = this.getLocalStorageFallback();
            if (localTrackings.length === 0) {
                console.log('✅ No trackings to migrate');
                return { success: true, migrated: 0 };
            }

            console.log(`📦 Found ${localTrackings.length} trackings to migrate`);

            // Prepara tutti i tracking per l'inserimento batch
            const supabaseData = localTrackings.map(tracking => 
                this.prepareForSupabase(tracking, user.id)
            );

            // Inserisci in batch
            const { data, error } = await supabase
                .from(this.table)
                .insert(supabaseData)
                .select();

            if (error) throw error;

            console.log(`✅ Successfully migrated ${data.length} trackings`);

            // Opzionale: pulisci localStorage dopo migrazione riuscita
            // localStorage.removeItem('trackings');

            return { 
                success: true, 
                migrated: data.length,
                data: data
            };

        } catch (error) {
            console.error('❌ Migration failed:', error);
            return { 
                success: false, 
                error: error.message 
            };
        }
    }
}

// Export singleton
export default new SupabaseTrackingService();