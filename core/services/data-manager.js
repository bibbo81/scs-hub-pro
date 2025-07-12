// Data Manager per sincronizzazione Tracking-Shipments con Supabase
import { supabase } from './supabase-client.js';
import { requireAuth } from '../auth-guard.js';
import organizationService from './organization-service.js';
import notificationSystem from '../notification-system.js';
import { trackingService } from './tracking-service.js';

class DataManager {
    constructor() {
        this.initialized = false;
        this.currentOrg = null;
        this.syncInProgress = false;
    }

    async init() {
        if (this.initialized) return;
        
        try {
            await requireAuth();
            this.currentOrg = await organizationService.getCurrentOrganization();
            this.initialized = true;
            
            // Setup real-time listeners
            this.setupRealtimeSync();
        } catch (error) {
            console.error('DataManager init error:', error);
            notificationSystem.show('Failed to initialize data manager', 'error');
            throw error;
        }
    }

    // TRACKING METHODS
    async addTracking(trackingData) {
        await this.init();
        
        try {
            // Aggiungi tracking con dati organizzazione
            const { data: tracking, error } = await supabase
                .from('trackings')
                .insert({
                    ...trackingData,
                    organization_id: this.currentOrg.id,
                    created_by: (await supabase.auth.getUser()).data.user.id,
                    status: 'pending',
                    events: []
                })
                .select()
                .single();

            if (error) throw error;

            // Auto-crea shipment
            const shipment = await this.autoCreateShipment(tracking);
            
            // Notifica con link
            notificationSystem.show(
                `Tracking added! <a href="/shipments.html?id=${shipment.id}" class="notification-link">View Shipment</a>`,
                'success'
            );

            // Emit event per aggiornare UI
            window.dispatchEvent(new CustomEvent('trackingAdded', { 
                detail: { tracking, shipment } 
            }));

            // Inizia tracking con ShipsGo se configurato
            if (tracking.carrier && tracking.tracking_number) {
                this.startShipsGoTracking(tracking);
            }

            return { tracking, shipment };
        } catch (error) {
            console.error('Add tracking error:', error);
            notificationSystem.show('Failed to add tracking', 'error');
            throw error;
        }
    }

    async updateTracking(id, updates) {
        await this.init();
        
        try {
            const { data, error } = await supabase
                .from('trackings')
                .update(updates)
                .eq('id', id)
                .eq('organization_id', this.currentOrg.id)
                .select()
                .single();

            if (error) throw error;

            // Aggiorna anche lo shipment correlato se necessario
            if (updates.status || updates.estimated_delivery) {
                await this.syncShipmentFromTracking(id);
            }

            window.dispatchEvent(new CustomEvent('trackingUpdated', { 
                detail: { tracking: data } 
            }));

            return data;
        } catch (error) {
            console.error('Update tracking error:', error);
            notificationSystem.show('Failed to update tracking', 'error');
            throw error;
        }
    }

    async deleteTracking(id) {
        await this.init();
        
        try {
            // Prima trova lo shipment correlato
            const { data: shipment } = await supabase
                .from('shipments')
                .select('id')
                .eq('tracking_id', id)
                .single();

            // Elimina tracking
            const { error } = await supabase
                .from('trackings')
                .delete()
                .eq('id', id)
                .eq('organization_id', this.currentOrg.id);

            if (error) throw error;

            // Elimina anche lo shipment se esiste
            if (shipment) {
                await supabase
                    .from('shipments')
                    .delete()
                    .eq('id', shipment.id);
            }

            window.dispatchEvent(new CustomEvent('trackingDeleted', { 
                detail: { id } 
            }));

            notificationSystem.show('Tracking deleted', 'success');
        } catch (error) {
            console.error('Delete tracking error:', error);
            notificationSystem.show('Failed to delete tracking', 'error');
            throw error;
        }
    }

    async getTrackings(filters = {}) {
        await this.init();
        
        try {
            let query = supabase
                .from('trackings')
                .select(`
                    *,
                    shipment:shipments!tracking_id(*)
                `)
                .eq('organization_id', this.currentOrg.id)
                .order('created_at', { ascending: false });

            // Applica filtri
            if (filters.status) {
                query = query.eq('status', filters.status);
            }
            if (filters.carrier) {
                query = query.eq('carrier', filters.carrier);
            }
            if (filters.search) {
                query = query.or(`tracking_number.ilike.%${filters.search}%,reference.ilike.%${filters.search}%`);
            }

            const { data, error } = await query;

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Get trackings error:', error);
            notificationSystem.show('Failed to load trackings', 'error');
            return [];
        }
    }

    // SHIPMENT METHODS
    async autoCreateShipment(tracking) {
        try {
            const shipmentData = {
                organization_id: this.currentOrg.id,
                tracking_id: tracking.id,
                tracking_number: tracking.tracking_number,
                carrier: tracking.carrier,
                status: tracking.status || 'pending',
                origin: tracking.origin || 'Unknown',
                destination: tracking.destination || 'Unknown',
                shipped_date: tracking.shipped_date || new Date().toISOString(),
                estimated_delivery: tracking.estimated_delivery,
                actual_delivery: tracking.actual_delivery,
                reference: tracking.reference,
                auto_created: true,
                metadata: {
                    source: 'auto_sync',
                    tracking_data: tracking
                }
            };

            const { data, error } = await supabase
                .from('shipments')
                .insert(shipmentData)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Auto create shipment error:', error);
            throw error;
        }
    }

    async getShipments(filters = {}) {
        await this.init();
        
        try {
            let query = supabase
                .from('shipments')
                .select(`
                    *,
                    tracking:trackings!tracking_id(*),
                    products:product_shipment_links(
                        quantity,
                        product:products(*)
                    )
                `)
                .eq('organization_id', this.currentOrg.id)
                .order('created_at', { ascending: false });

            // Applica filtri
            if (filters.status) {
                query = query.eq('status', filters.status);
            }
            if (filters.search) {
                query = query.or(`tracking_number.ilike.%${filters.search}%,reference.ilike.%${filters.search}%`);
            }

            const { data, error } = await query;

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Get shipments error:', error);
            notificationSystem.show('Failed to load shipments', 'error');
            return [];
        }
    }

    async updateShipment(id, updates) {
        await this.init();
        
        try {
            const { data, error } = await supabase
                .from('shipments')
                .update(updates)
                .eq('id', id)
                .eq('organization_id', this.currentOrg.id)
                .select()
                .single();

            if (error) throw error;

            window.dispatchEvent(new CustomEvent('shipmentUpdated', { 
                detail: { shipment: data } 
            }));

            return data;
        } catch (error) {
            console.error('Update shipment error:', error);
            notificationSystem.show('Failed to update shipment', 'error');
            throw error;
        }
    }

    async linkProductToShipment(shipmentId, productId, quantity) {
        await this.init();
        
        try {
            const { data, error } = await supabase
                .from('product_shipment_links')
                .insert({
                    shipment_id: shipmentId,
                    product_id: productId,
                    quantity: quantity || 1
                })
                .select()
                .single();

            if (error) throw error;

            notificationSystem.show('Product linked to shipment', 'success');
            return data;
        } catch (error) {
            console.error('Link product error:', error);
            notificationSystem.show('Failed to link product', 'error');
            throw error;
        }
    }

    // SYNC METHODS
    async syncShipmentFromTracking(trackingId) {
        try {
            const { data: tracking } = await supabase
                .from('trackings')
                .select('*')
                .eq('id', trackingId)
                .single();

            if (!tracking) return;

            const { data: shipment } = await supabase
                .from('shipments')
                .select('id')
                .eq('tracking_id', trackingId)
                .single();

            if (shipment) {
                // Aggiorna shipment esistente
                await supabase
                    .from('shipments')
                    .update({
                        status: tracking.status,
                        estimated_delivery: tracking.estimated_delivery,
                        actual_delivery: tracking.actual_delivery,
                        last_update: tracking.last_update
                    })
                    .eq('id', shipment.id);
            }
        } catch (error) {
            console.error('Sync error:', error);
        }
    }

    // SHIPSGO INTEGRATION
    async startShipsGoTracking(tracking) {
        try {
            const response = await fetch('/.netlify/functions/shipsgo-proxy', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await this.getAuthToken()}`
                },
                body: JSON.stringify({
                    action: 'track',
                    carrier: tracking.carrier,
                    tracking_number: tracking.tracking_number
                })
            });

            if (!response.ok) throw new Error('ShipsGo tracking failed');
            
            const result = await response.json();
            console.log('ShipsGo tracking started:', result);
        } catch (error) {
            console.error('ShipsGo error:', error);
        }
    }

    // REAL-TIME SYNC
    setupRealtimeSync() {
        // Ascolta cambiamenti sui trackings
        supabase
            .channel('trackings-changes')
            .on('postgres_changes', 
                { 
                    event: '*', 
                    schema: 'public', 
                    table: 'trackings',
                    filter: `organization_id=eq.${this.currentOrg.id}`
                }, 
                (payload) => {
                    console.log('Tracking change:', payload);
                    if (payload.eventType === 'UPDATE') {
                        this.syncShipmentFromTracking(payload.new.id);
                    }
                }
            )
            .subscribe();

        // Ascolta webhook updates
        window.addEventListener('webhookUpdate', async (event) => {
            const { trackingNumber, updates } = event.detail;
            await this.processWebhookUpdate(trackingNumber, updates);
        });
    }

    async processWebhookUpdate(trackingNumber, updates) {
        try {
            const { data: tracking } = await supabase
                .from('trackings')
                .select('*')
                .eq('tracking_number', trackingNumber)
                .single();

            if (tracking) {
                await this.updateTracking(tracking.id, updates);
            }
        } catch (error) {
            console.error('Webhook processing error:', error);
        }
    }

    // UTILITY
    async getAuthToken() {
        const { data: { session } } = await supabase.auth.getSession();
        return session?.access_token;
    }

    getStatusColor(status) {
        const statusColors = {
            'pending': '#ffc107',
            'in_transit': '#17a2b8',
            'delivered': '#28a745',
            'exception': '#dc3545',
            'cancelled': '#6c757d'
        };
        return statusColors[status] || '#6c757d';
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
}

export default new DataManager();