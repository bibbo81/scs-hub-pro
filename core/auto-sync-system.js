// auto-sync-system.js - Event-driven synchronization between Tracking and Shipments
class AutoSyncSystem {
    constructor() {
        this.initialized = false;
        this.syncQueue = [];
        this.processing = false;
        this.syncRules = this.initializeSyncRules();
        this.eventListeners = new Map();
        this.debugMode = true;
    }

    async initialize() {
        if (this.initialized) return;
        
        console.log('🔄 Initializing Auto-Sync System...');
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Initial sync check
        await this.performInitialSync();
        
        this.initialized = true;
        console.log('✅ Auto-Sync System initialized successfully');
        
        // Dispatch ready event
        window.dispatchEvent(new CustomEvent('autoSyncReady'));
    }

    initializeSyncRules() {
        return {
            // Tracking → Shipments mapping rules
            trackingToShipment: {
                trackingNumber: 'shipmentNumber',
                tracking_type: (value) => {
                    const typeMapping = {
                        'container': 'container',
                        'bl': 'bl', 
                        'awb': 'awb',
                        'parcel': 'lcl'
                    };
                    return typeMapping[value] || 'container';
                },
                carrier_code: (value, data) => ({
                    name: this.getCarrierName(value),
                    code: value,
                    service: data.metadata?.service || 'Standard'
                }),
                status: (value) => {
                    const statusMapping = {
                        'registered': 'planned',
                        'in_transit': 'in_transit',
                        'arrived': 'arrived',
                        'delivered': 'delivered',
                        'delayed': 'in_transit',
                        'exception': 'in_transit'
                    };
                    return statusMapping[value] || 'planned';
                },
                origin_port: (value, data) => ({
                    port: value,
                    name: data.metadata?.origin_name || value,
                    country: data.metadata?.origin_country || 'Unknown'
                }),
                destination_port: (value, data) => ({
                    port: value,
                    name: data.metadata?.destination_name || value,
                    country: data.metadata?.destination_country || 'Unknown'
                }),
                eta: 'eta',
                reference_number: 'referenceNumber'
            },

            // Fields that should trigger auto-sync
            syncTriggerFields: [
                'status',
                'eta',
                'last_event_location',
                'carrier_code',
                'reference_number'
            ],

            // Shipment creation rules
            createShipmentRules: {
                requireFields: ['tracking_number', 'tracking_type'],
                defaultValues: {
                    costs: {
                        oceanFreight: 0,
                        bunkerSurcharge: 0,
                        portCharges: 0,
                        customs: 0,
                        insurance: 0,
                        total: 0,
                        currency: 'EUR'
                    },
                    products: [],
                    documents: []
                }
            }
        };
    }

    setupEventListeners() {
        // Listen for tracking updates
        this.addEventListener('trackingsUpdated', (event) => {
            console.log('🔄 Trackings updated event detected');
            this.handleTrackingUpdates(event.detail);
        });

        // Listen for new tracking additions
        this.addEventListener('trackingAdded', (event) => {
            console.log('🔄 New tracking added');
            this.handleNewTracking(event.detail);
        });

        // Listen for tracking imports
        this.addEventListener('trackingImported', (event) => {
            console.log('🔄 Tracking import detected');
            this.handleTrackingImport(event.detail);
        });

        // Listen for shipment updates (reverse sync)
        this.addEventListener('shipmentsUpdated', (event) => {
            console.log('🔄 Shipments updated event detected');
            this.handleShipmentUpdates(event.detail);
        });

        // Storage changes
        this.addEventListener('storage', (event) => {
            if (event.key === 'trackings' || event.key === 'mockTrackings') {
                console.log('🔄 Tracking storage changed');
                this.queueSync('trackingStorageChange', event);
            }
        });

        console.log('✅ Auto-sync event listeners setup completed');
    }

    addEventListener(eventName, handler) {
        if (eventName === 'storage') {
            window.addEventListener(eventName, handler);
        } else {
            window.addEventListener(eventName, handler);
        }
        
        // Store reference for cleanup
        this.eventListeners.set(eventName, handler);
    }

    async performInitialSync() {
        console.log('🔄 Performing initial sync check...');
        
        try {
            const trackings = this.getTrackings();
            const shipments = this.getShipments();
            
            console.log(`📊 Found ${trackings.length} trackings and ${shipments.length} shipments`);
            
            // Find trackings without corresponding shipments
            const orphanedTrackings = trackings.filter(tracking => {
                return !shipments.some(shipment => 
                    shipment.shipmentNumber === tracking.tracking_number ||
                    shipment.trackingNumber === tracking.tracking_number
                );
            });

            if (orphanedTrackings.length > 0) {
                console.log(`🔄 Found ${orphanedTrackings.length} trackings without shipments`);
                
                // Show notification for user confirmation
                if (window.NotificationSystem) {
                    const notificationId = window.NotificationSystem.show(
                        `Trovati ${orphanedTrackings.length} tracking senza spedizioni corrispondenti`,
                        'info',
                        0, // No auto-dismiss
                        {
                            actions: [
                                {
                                    label: 'Crea Automaticamente',
                                    handler: () => {
                                        this.createShipmentsFromTrackings(orphanedTrackings);
                                        window.NotificationSystem.dismiss(notificationId);
                                    }
                                },
                                {
                                    label: 'Ignora',
                                    handler: () => {
                                        window.NotificationSystem.dismiss(notificationId);
                                    }
                                }
                            ]
                        }
                    );
                }
            }

            console.log('✅ Initial sync check completed');
            
        } catch (error) {
            console.error('❌ Error in initial sync:', error);
        }
    }

    async handleTrackingUpdates(details) {
        const { trackings, source } = details;
        
        console.log(`🔄 Processing tracking updates from ${source}`);
        
        if (!trackings || !Array.isArray(trackings)) {
            console.warn('⚠️ Invalid trackings data received');
            return;
        }

        // Process each tracking for sync
        for (const tracking of trackings) {
            await this.syncTrackingToShipment(tracking, 'update');
        }
    }

    async handleNewTracking(trackingData) {
        console.log('🔄 Processing new tracking:', trackingData.tracking_number);
        
        // Check if shipment already exists
        const existingShipment = this.findShipmentByTracking(trackingData.tracking_number);
        
        if (!existingShipment) {
            await this.createShipmentFromTracking(trackingData);
        } else {
            await this.syncTrackingToShipment(trackingData, 'update');
        }
    }

    async handleTrackingImport(details) {
        const { imported, updated } = details;
        const allTrackings = [...(imported || []), ...(updated || [])];
        
        console.log(`🔄 Processing tracking import: ${allTrackings.length} items`);
        
        // Batch process for performance
        const batchSize = 10;
        for (let i = 0; i < allTrackings.length; i += batchSize) {
            const batch = allTrackings.slice(i, i + batchSize);
            
            await Promise.all(batch.map(tracking => 
                this.syncTrackingToShipment(tracking, 'import')
            ));
            
            // Small delay to prevent UI blocking
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Show completion notification
        if (window.NotificationSystem) {
            window.NotificationSystem.success(
                `Auto-sync completato: ${allTrackings.length} tracking processati`
            );
        }
    }

    async syncTrackingToShipment(trackingData, action = 'update') {
        try {
            if (!this.validateTrackingData(trackingData)) {
                console.warn('⚠️ Invalid tracking data for sync:', trackingData);
                return false;
            }

            const existingShipment = this.findShipmentByTracking(trackingData.tracking_number);
            
            if (existingShipment) {
                // Update existing shipment
                return await this.updateShipmentFromTracking(existingShipment, trackingData);
            } else {
                // Create new shipment
                return await this.createShipmentFromTracking(trackingData);
            }
            
        } catch (error) {
            console.error('❌ Error syncing tracking to shipment:', error);
            return false;
        }
    }

    async createShipmentFromTracking(trackingData) {
        console.log('🏗️ Creating shipment from tracking:', trackingData.tracking_number);
        
        const shipmentData = this.mapTrackingToShipment(trackingData);
        
        // Add to shipments registry
        if (window.shipmentsRegistry) {
            try {
                const newShipment = {
                    id: `AUTO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    ...shipmentData,
                    organization_id: window.organizationService?.getCurrentOrgId() || null,
                    autoCreated: true,
                    createdFrom: 'tracking',
                    sourceTrackingId: trackingData.id,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                window.shipmentsRegistry.shipments.push(newShipment);
                window.shipmentsRegistry.saveShipments();
                
                console.log('✅ Shipment created successfully:', newShipment.id);
                
                // Trigger update event
                window.dispatchEvent(new CustomEvent('shipmentsUpdated', {
                    detail: {
                        action: 'created',
                        shipment: newShipment,
                        source: 'autoSync'
                    }
                }));

                return newShipment;
                
            } catch (error) {
                console.error('❌ Error creating shipment:', error);
                return null;
            }
        }
        
        console.warn('⚠️ Shipments registry not available');
        return null;
    }

    async updateShipmentFromTracking(shipment, trackingData) {
        console.log('🔄 Updating shipment from tracking:', trackingData.tracking_number);
        
        const updates = {};
        let hasChanges = false;

        // Check each sync rule for changes
        Object.entries(this.syncRules.trackingToShipment).forEach(([trackingField, shipmentFieldOrMapper]) => {
            if (trackingField === 'status' || trackingField === 'eta' || trackingField === 'reference_number') {
                const trackingValue = trackingData[trackingField];
                const currentShipmentValue = this.getShipmentFieldValue(shipment, shipmentFieldOrMapper);
                
                let newValue;
                if (typeof shipmentFieldOrMapper === 'function') {
                    newValue = shipmentFieldOrMapper(trackingValue, trackingData);
                } else {
                    newValue = trackingValue;
                }
                
                if (this.hasValueChanged(currentShipmentValue, newValue)) {
                    updates[shipmentFieldOrMapper] = newValue;
                    hasChanges = true;
                }
            }
        });

        // Update last sync timestamp
        updates.lastSyncAt = new Date().toISOString();
        updates.updatedAt = new Date().toISOString();

        if (hasChanges && window.shipmentsRegistry) {
            try {
                // Apply updates
                Object.assign(shipment, updates);
                window.shipmentsRegistry.saveShipments();
                
                console.log('✅ Shipment updated successfully:', shipment.id);
                
                // Trigger update event
                window.dispatchEvent(new CustomEvent('shipmentsUpdated', {
                    detail: {
                        action: 'updated',
                        shipment: shipment,
                        source: 'autoSync',
                        changes: updates
                    }
                }));

                return true;
                
            } catch (error) {
                console.error('❌ Error updating shipment:', error);
                return false;
            }
        }

        return hasChanges;
    }

    mapTrackingToShipment(trackingData) {
        const mapped = {
            shipmentNumber: trackingData.tracking_number,
            trackingNumber: trackingData.tracking_number,
            type: this.syncRules.trackingToShipment.tracking_type(trackingData.tracking_type),
            status: this.syncRules.trackingToShipment.status(trackingData.status),
            carrier: this.syncRules.trackingToShipment.carrier_code(trackingData.carrier_code, trackingData),
            route: {
                origin: this.syncRules.trackingToShipment.origin_port(trackingData.origin_port, trackingData),
                destination: this.syncRules.trackingToShipment.destination_port(trackingData.destination_port, trackingData),
                via: [],
                distance: this.estimateDistance(trackingData.origin_port, trackingData.destination_port),
                estimatedTransit: this.estimateTransitTime(trackingData.tracking_type, trackingData.origin_port, trackingData.destination_port)
            },
            schedule: {
                etd: trackingData.departure_date || trackingData.date_of_loading || trackingData.created_at,
                eta: trackingData.eta || trackingData.arrival_date || trackingData.date_of_discharge,
                atd: trackingData.departure_date || null,
                ata: trackingData.arrival_date || null
            },
            referenceNumber: trackingData.reference_number,
            ...this.syncRules.createShipmentRules.defaultValues
        };

        // Add metadata from tracking
        if (trackingData.metadata) {
            mapped.metadata = {
                ...trackingData.metadata,
                originalTrackingData: {
                    tracking_type: trackingData.tracking_type,
                    carrier_code: trackingData.carrier_code,
                    created_at: trackingData.created_at
                }
            };
        }

        return mapped;
    }

    // Reverse sync: Handle shipment updates → tracking
    async handleShipmentUpdates(details) {
        if (!details.shipment || details.source === 'autoSync') {
            return; // Avoid circular sync
        }

        const { shipment, action } = details;
        
        if (shipment.trackingNumber || shipment.sourceTrackingId) {
            await this.syncShipmentToTracking(shipment);
        }
    }

    async syncShipmentToTracking(shipmentData) {
        const trackingNumber = shipmentData.trackingNumber || shipmentData.shipmentNumber;
        const tracking = this.findTrackingByNumber(trackingNumber);
        
        if (!tracking) return;

        const updates = {};
        let hasChanges = false;

        // Sync status
        if (shipmentData.status !== tracking.status) {
            const trackingStatus = this.mapShipmentStatusToTracking(shipmentData.status);
            if (trackingStatus) {
                updates.status = trackingStatus;
                hasChanges = true;
            }
        }

        // Sync ETA
        if (shipmentData.schedule?.eta && shipmentData.schedule.eta !== tracking.eta) {
            updates.eta = shipmentData.schedule.eta;
            hasChanges = true;
        }

        if (hasChanges) {
            Object.assign(tracking, updates);
            this.saveTrackings();
            
            console.log('✅ Tracking updated from shipment:', trackingNumber);
        }
    }

    // Utility methods
    validateTrackingData(trackingData) {
        const required = this.syncRules.createShipmentRules.requireFields;
        return required.every(field => trackingData[field]);
    }

    findShipmentByTracking(trackingNumber) {
        const shipments = this.getShipments();
        return shipments.find(s => 
            s.shipmentNumber === trackingNumber ||
            s.trackingNumber === trackingNumber
        );
    }

    findTrackingByNumber(trackingNumber) {
        const trackings = this.getTrackings();
        return trackings.find(t => t.tracking_number === trackingNumber);
    }

    getTrackings() {
        try {
            // Try multiple sources
            const sources = [
                () => JSON.parse(localStorage.getItem('trackings') || '[]'),
                () => JSON.parse(localStorage.getItem('mockTrackings') || '[]'),
                () => window.currentTrackings || []
            ];

            for (const getSource of sources) {
                try {
                    const data = getSource();
                    if (Array.isArray(data) && data.length > 0) {
                        return data;
                    }
                } catch (e) {
                    continue;
                }
            }
            
            return [];
        } catch (error) {
            console.error('❌ Error getting trackings:', error);
            return [];
        }
    }

    getShipments() {
        try {
            if (window.shipmentsRegistry?.shipments) {
                return window.shipmentsRegistry.shipments;
            }
            
            const stored = localStorage.getItem('shipmentsRegistry');
            if (stored) {
                const parsed = JSON.parse(stored);
                return Array.isArray(parsed) ? parsed : parsed.shipments || [];
            }
            
            return [];
        } catch (error) {
            console.error('❌ Error getting shipments:', error);
            return [];
        }
    }

    saveTrackings() {
        try {
            const trackings = this.getTrackings();
            localStorage.setItem('trackings', JSON.stringify(trackings));
        } catch (error) {
            console.error('❌ Error saving trackings:', error);
        }
    }

    getCarrierName(carrierCode) {
        const carrierNames = {
            'MAERSK': 'Maersk Line',
            'MSC': 'MSC',
            'CMA-CGM': 'CMA CGM',
            'COSCO': 'COSCO Shipping',
            'HAPAG-LLOYD': 'Hapag-Lloyd',
            'ONE': 'Ocean Network Express',
            'EVERGREEN': 'Evergreen Line',
            'CV': 'Cargolux',
            'LH': 'Lufthansa Cargo',
            'EK': 'Emirates SkyCargo',
            'DHL': 'DHL Express',
            'FEDEX': 'FedEx',
            'UPS': 'UPS'
        };
        return carrierNames[carrierCode] || carrierCode;
    }

    estimateDistance(origin, destination) {
        // Simple distance estimation - could be enhanced with real data
        const distances = {
            'SHANGHAI-GENOVA': 18500,
            'NINGBO-GENOVA': 18200,
            'HKG-MXP': 9200,
            'QINGDAO-ROTTERDAM': 19800
        };
        
        const key = `${origin}-${destination}`;
        return distances[key] || 15000;
    }

    estimateTransitTime(type, origin, destination) {
        if (type === 'awb') return 2; // Air freight
        if (type === 'parcel') return 5; // Express parcel
        
        // Maritime estimates
        const routes = {
            'SHANGHAI-GENOVA': 28,
            'NINGBO-GENOVA': 30,
            'QINGDAO-ROTTERDAM': 35
        };
        
        const key = `${origin}-${destination}`;
        return routes[key] || 25;
    }

    mapShipmentStatusToTracking(shipmentStatus) {
        const mapping = {
            'planned': 'registered',
            'departed': 'in_transit',
            'in_transit': 'in_transit',
            'arrived': 'arrived',
            'delivered': 'delivered'
        };
        return mapping[shipmentStatus];
    }

    hasValueChanged(current, newValue) {
        if (typeof current === 'object' && typeof newValue === 'object') {
            return JSON.stringify(current) !== JSON.stringify(newValue);
        }
        return current !== newValue;
    }

    getShipmentFieldValue(shipment, fieldPath) {
        if (typeof fieldPath === 'string') {
            return shipment[fieldPath];
        }
        // Handle nested field paths if needed
        return null;
    }

    queueSync(type, data) {
        this.syncQueue.push({ type, data, timestamp: Date.now() });
        
        if (!this.processing) {
            this.processSyncQueue();
        }
    }

    async processSyncQueue() {
        if (this.processing || this.syncQueue.length === 0) return;
        
        this.processing = true;
        
        while (this.syncQueue.length > 0) {
            const syncItem = this.syncQueue.shift();
            
            try {
                await this.processSyncItem(syncItem);
            } catch (error) {
                console.error('❌ Error processing sync item:', error);
            }
            
            // Small delay between processing
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        this.processing = false;
    }

    async processSyncItem(syncItem) {
        const { type, data } = syncItem;
        
        switch (type) {
            case 'trackingStorageChange':
                await this.handleTrackingStorageChange();
                break;
            default:
                console.warn('⚠️ Unknown sync item type:', type);
        }
    }

    async handleTrackingStorageChange() {
        // Debounced storage change handler
        await new Promise(resolve => setTimeout(resolve, 500));
        await this.performInitialSync();
    }

    async createShipmentsFromTrackings(trackings) {
        if (!Array.isArray(trackings) || trackings.length === 0) return;
        
        console.log(`🏗️ Creating ${trackings.length} shipments from trackings...`);
        
        const results = {
            created: 0,
            errors: []
        };

        for (const tracking of trackings) {
            try {
                const shipment = await this.createShipmentFromTracking(tracking);
                if (shipment) {
                    results.created++;
                }
            } catch (error) {
                console.error('❌ Error creating shipment from tracking:', error);
                results.errors.push({
                    tracking: tracking.tracking_number,
                    error: error.message
                });
            }
        }

        // Show results notification
        if (window.NotificationSystem) {
            if (results.created > 0) {
                window.NotificationSystem.success(
                    `${results.created} spedizioni create automaticamente`
                );
            }
            
            if (results.errors.length > 0) {
                window.NotificationSystem.warning(
                    `${results.errors.length} errori durante la creazione`
                );
            }
        }

        return results;
    }

    // Debug and status methods
    getStatus() {
        return {
            initialized: this.initialized,
            queueLength: this.syncQueue.length,
            processing: this.processing,
            trackingsCount: this.getTrackings().length,
            shipmentsCount: this.getShipments().length,
            eventListeners: this.eventListeners.size
        };
    }

    destroy() {
        // Cleanup event listeners
        this.eventListeners.forEach((handler, eventName) => {
            if (eventName === 'storage') {
                window.removeEventListener(eventName, handler);
            } else {
                window.removeEventListener(eventName, handler);
            }
        });
        
        this.eventListeners.clear();
        this.syncQueue = [];
        this.initialized = false;
        
        console.log('🧹 Auto-sync system destroyed');
    }
}

// Create global instance
window.autoSyncSystem = new AutoSyncSystem();

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        await window.autoSyncSystem.initialize();
    });
} else {
    setTimeout(async () => {
        await window.autoSyncSystem.initialize();
    }, 1000);
}

// Debug helper
window.debugAutoSync = function() {
    console.log('🔍 Auto-Sync System Status:', window.autoSyncSystem.getStatus());
    console.log('🔍 Current Trackings:', window.autoSyncSystem.getTrackings().length);
    console.log('🔍 Current Shipments:', window.autoSyncSystem.getShipments().length);
};

// ===== NOTIFICATION SYSTEM FIX =====
// Fix for persistent notifications bug

class NotificationSystemFix {
    constructor() {
        this.fixApplied = false;
        this.notificationCleanupInterval = null;
    }

    apply() {
        if (this.fixApplied) return;
        
        console.log('🔔 Applying notification system fix...');
        
        // Wait for NotificationSystem to be available
        const applyFix = () => {
            if (window.NotificationSystem) {
                this.fixNotificationSystem();
                this.startPeriodicCleanup();
                this.fixApplied = true;
                console.log('✅ Notification system fix applied');
            } else {
                setTimeout(applyFix, 500);
            }
        };
        
        applyFix();
    }

    fixNotificationSystem() {
        const originalShow = window.NotificationSystem.show;
        const originalDismiss = window.NotificationSystem.dismiss;
        
        // Enhanced show method with better tracking
        window.NotificationSystem.show = function(message, type = 'info', duration = 3000, options = {}) {
            // Prevent duplicate "Executive BI Dashboard" notifications
            if (message.includes('Executive BI Dashboard') || 
                message.includes('Advanced analytics disponibili')) {
                
                // Check if similar notification already exists
                const existing = document.querySelectorAll('[id^="notification-"]');
                for (const notification of existing) {
                    const text = notification.textContent || '';
                    if (text.includes('Executive BI Dashboard') || 
                        text.includes('Advanced analytics')) {
                        console.log('🔔 Prevented duplicate BI notification');
                        return notification.id;
                    }
                }
            }
            
            const result = originalShow.call(this, message, type, duration, options);
            
            // Enhanced auto-dismiss with better cleanup
            if (duration > 0) {
                setTimeout(() => {
                    this.dismiss(result);
                }, duration);
            }
            
            return result;
        };

        // Enhanced dismiss method
        window.NotificationSystem.dismiss = function(id) {
            try {
                // Clear any pending timeouts first
                if (this.activeTimeouts && this.activeTimeouts.has(id)) {
                    clearTimeout(this.activeTimeouts.get(id));
                    this.activeTimeouts.delete(id);
                }
                
                const result = originalDismiss.call(this, id);
                
                // Force cleanup if notification still exists
                setTimeout(() => {
                    const notification = document.getElementById(id);
                    if (notification) {
                        console.log('🔔 Force removing persistent notification:', id);
                        notification.remove();
                    }
                }, 500);
                
                return result;
            } catch (error) {
                console.error('🔔 Error dismissing notification:', error);
                
                // Fallback: try to remove element directly
                const notification = document.getElementById(id);
                if (notification) {
                    notification.remove();
                }
            }
        };

        // Enhanced dismissAll method
        window.NotificationSystem.dismissAll = function() {
            try {
                // Clear all timeouts
                if (this.activeTimeouts) {
                    this.activeTimeouts.forEach((timeoutId) => {
                        clearTimeout(timeoutId);
                    });
                    this.activeTimeouts.clear();
                }
                
                // Remove all notifications
                const notifications = document.querySelectorAll('[id^="notification-"]');
                notifications.forEach(notification => {
                    notification.remove();
                });
                
                console.log('🔔 All notifications dismissed');
            } catch (error) {
                console.error('🔔 Error dismissing all notifications:', error);
            }
        };
    }

    startPeriodicCleanup() {
        // Cleanup orphaned notifications every 30 seconds
        this.notificationCleanupInterval = setInterval(() => {
            this.cleanupOrphanedNotifications();
        }, 30000);
    }

    cleanupOrphanedNotifications() {
        try {
            const notifications = document.querySelectorAll('[id^="notification-"]');
            const container = document.getElementById('notification-container');
            
            notifications.forEach(notification => {
                // Remove notifications not in container
                if (container && !container.contains(notification)) {
                    console.log('🔔 Removing orphaned notification');
                    notification.remove();
                }
                
                // Remove notifications older than 10 minutes
                const createdTime = notification.dataset.created;
                if (createdTime) {
                    const age = Date.now() - parseInt(createdTime);
                    if (age > 10 * 60 * 1000) { // 10 minutes
                        console.log('🔔 Removing old notification');
                        notification.remove();
                    }
                }
            });
            
            // Limit total notifications to 5
            const activeNotifications = container ? 
                container.querySelectorAll('[id^="notification-"]') : [];
            
            if (activeNotifications.length > 5) {
                // Remove oldest notifications
                const oldest = Array.from(activeNotifications)
                    .slice(0, activeNotifications.length - 5);
                oldest.forEach(notification => notification.remove());
                
                console.log(`🔔 Removed ${oldest.length} excess notifications`);
            }
            
        } catch (error) {
            console.error('🔔 Error in cleanup:', error);
        }
    }

    destroy() {
        if (this.notificationCleanupInterval) {
            clearInterval(this.notificationCleanupInterval);
        }
    }
}

// Apply notification fix
const notificationFix = new NotificationSystemFix();
notificationFix.apply();

// Export for cleanup
window.notificationSystemFix = notificationFix;

console.log('[AutoSync] Event-driven synchronization system loaded');
console.log('[NotificationFix] Persistent notifications fix loaded');
