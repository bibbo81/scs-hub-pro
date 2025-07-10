// shipments-registry.js - Enhanced Shipments Registry with Supabase support
// Path: /core/shipments-registry.js
import supabaseShipmentsService from '/core/services/supabase-shipments-service.js';
import '/core/supabase-init.js';
import { supabase } from '/core/services/supabase-client.js';
import { getActiveOrganizationId, ensureOrganizationSelected } from '/core/services/organization-service.js';

class ShipmentsRegistry {
    constructor() {
        this.shipments = [];
        this.initialized = false;
        this.subscribers = [];
        this.storageKey = 'shipmentsRegistry';
        this.version = '2.0.0';
        
        console.log('🏗️ ShipmentsRegistry constructor called');
    }
    
    async init() {
        if (this.initialized) {
            console.log('✅ ShipmentsRegistry already initialized');
            return true;
        }
        
        console.log('🚀 Initializing ShipmentsRegistry...');
        
        try {
            // Load existing shipments from Supabase
            await this.loadShipments();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Mark as initialized
            this.initialized = true;
            
            console.log(`✅ ShipmentsRegistry initialized with ${this.shipments.length} shipments`);
            
            // Notify subscribers
            this.notifySubscribers('initialized', { shipments: this.shipments });
            
            return true;
            
        } catch (error) {
            console.error('❌ ShipmentsRegistry initialization failed:', error);
            
            // Initialize with empty state on error
            this.shipments = [];
            this.initialized = true;
            
            return false;
        }
    }
    
    async loadShipments() {
        try {
            const data = await supabaseShipmentsService.getAllShipments();
            this.shipments = this.validateShipments(data);
            console.log(`📦 Loaded ${this.shipments.length} shipments from Supabase`);
            return true;

        } catch (error) {
            console.error('❌ Error loading shipments:', error);
            this.shipments = [];
            return false;
        }
    }
    
    validateShipments(shipments) {
        if (!Array.isArray(shipments)) {
            console.warn('⚠️ Invalid shipments data, resetting to empty array');
            return [];
        }
        
        return shipments.filter(shipment => {
            // Basic validation
            if (!shipment || typeof shipment !== 'object') return false;
            if (!shipment.id || !shipment.shipmentNumber) return false;
            
            // Ensure required fields exist
            shipment.createdAt = shipment.createdAt || new Date().toISOString();
            shipment.updatedAt = shipment.updatedAt || new Date().toISOString();
            shipment.status = shipment.status || 'planned';
            shipment.products = shipment.products || [];
            shipment.costs = shipment.costs || { total: 0, currency: 'EUR' };
            
            return true;
        });
    }
    
    migrateData(oldData) {
        console.log('🔄 Migrating shipments data to new version...');
        
        if (!Array.isArray(oldData)) {
            return [];
        }
        
        return oldData.map(shipment => {
            // Add any new fields or update structure
            return {
                ...shipment,
                version: this.version,
                updatedAt: new Date().toISOString(),
                // Add commercial structure if missing
                commercial: shipment.commercial || {
                    purchaseOrder: {},
                    proformaInvoice: {},
                    commercialInvoice: {},
                    transportDocument: {},
                    cargo: {},
                    containers: [],
                    financial: { currency: 'EUR' },
                    compliance: { complianceScore: 0 }
                }
            };
        });
    }
    
    setupEventListeners() {
        // Listen for page unload to save data
        window.addEventListener('beforeunload', () => {
            this.saveShipments();
        });
        
        // Auto-save every 30 seconds
        setInterval(() => {
            if (this.initialized) {
                this.saveShipments();
            }
        }, 30000);
    }
    
    saveShipments() {
        console.log('💾 Shipments are persisted via Supabase');
        return true;
    }
    
    // ===== SHIPMENT OPERATIONS =====
    
    // Create a new shipment and persist it via Supabase
    async createShipment(shipmentData) {
        if (!ensureOrganizationSelected()) {
            throw new Error("Organization ID non trovato! L'utente non ha selezionato alcuna organizzazione.");
        }
        const orgId = getActiveOrganizationId();

        const duplicate = this.shipments.find(s =>
            s.organization_id === orgId &&
            (s.shipmentNumber === shipmentData.shipmentNumber ||
                (shipmentData.trackingNumber && s.trackingNumber === shipmentData.trackingNumber))
        );
        if (duplicate) {
            console.log('[ShipmentsRegistry] Duplicate shipment found', duplicate.id);
            return duplicate;
        }

        const shipment = {
            id: shipmentData.id || this.generateId(),
            shipmentNumber: shipmentData.shipmentNumber || this.generateShipmentNumber(),
            type: shipmentData.type || 'container',
            status: shipmentData.status || 'planned',
            carrier: shipmentData.carrier || null,
            route: shipmentData.route || {},
            schedule: shipmentData.schedule || {},
            products: shipmentData.products || [],
            costs: shipmentData.costs || { total: 0, currency: 'EUR' },
            commercial: shipmentData.commercial || this.createDefaultCommercial(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            organization_id: orgId,
            ...shipmentData
        };
        
        let userId = null;
        try {
            const { data: { user } } = await supabase.auth.getUser();
            userId = user?.id || null;
        } catch (e) {
            console.warn('Failed to get user', e);
        }
        console.log('[ShipmentsRegistry] Creating shipment', {
            organization_id: orgId,
            user_id: userId,
            shipment
        });

        console.log('🚚 Tentativo INSERT shipment su Supabase:');
        console.log('organization_id:', shipment.organization_id);
        console.log('user_id:', userId || (supabase.auth && supabase.auth.user && supabase.auth.user().id));
        console.log('Payload completo:', JSON.stringify(shipment, null, 2));

        try {
            const saved = await supabaseShipmentsService.createShipment(shipment);
            if (saved && saved.id) {
                Object.assign(shipment, saved);
            }
        } catch (e) {
            console.error('❌ Error saving shipment to Supabase:', e);
            console.log('Payload che ha dato errore:', JSON.stringify(shipment, null, 2));
        }

        this.shipments.push(shipment);
        this.notifySubscribers('created', { shipment });

        console.log(`✅ Created shipment: ${shipment.shipmentNumber}`);
        return shipment;
    }
    
    async updateShipment(shipmentId, updates) {
        const index = this.shipments.findIndex(s => s.id === shipmentId);
        
        if (index === -1) {
            throw new Error(`Shipment ${shipmentId} not found`);
        }
        
        if (!ensureOrganizationSelected()) {
            throw new Error("Organization ID non trovato! L'utente non ha selezionato alcuna organizzazione.");
        }
        const orgId = getActiveOrganizationId();
        const oldShipment = { ...this.shipments[index] };
        
        this.shipments[index] = {
            ...this.shipments[index],
            ...updates,
            updatedAt: new Date().toISOString(),
            organization_id: getActiveOrganizationId()
        };

        try {
            await supabaseShipmentsService.updateShipment(shipmentId, this.shipments[index]);
        } catch (e) {
            console.error('❌ Error updating shipment in Supabase:', e);
        }

        this.notifySubscribers('updated', {
            shipment: this.shipments[index],
            oldShipment
        });

        console.log(`✅ Updated shipment: ${this.shipments[index].shipmentNumber}`);
        return this.shipments[index];
    }
    
    async deleteShipment(shipmentId) {
        const index = this.shipments.findIndex(s => s.id === shipmentId);
        
        if (index === -1) {
            throw new Error(`Shipment ${shipmentId} not found`);
        }
        
        const deletedShipment = this.shipments.splice(index, 1)[0];
        try {
            await supabaseShipmentsService.deleteShipment(shipmentId);
        } catch (e) {
            console.error('❌ Error deleting shipment from Supabase:', e);
        }

        this.notifySubscribers('deleted', { shipment: deletedShipment });

        console.log(`✅ Deleted shipment: ${deletedShipment.shipmentNumber}`);
        return deletedShipment;
    }
    
    getShipment(shipmentId) {
        return this.shipments.find(s => s.id === shipmentId);
    }
    
    getShipmentByNumber(shipmentNumber) {
        return this.shipments.find(s => s.shipmentNumber === shipmentNumber);
    }
    
    // ===== PRODUCT LINKING =====
    
    async linkProducts(shipmentId, productIds) {
        const shipment = this.getShipment(shipmentId);
        if (!shipment) {
            throw new Error(`Shipment ${shipmentId} not found`);
        }
        
        if (!ensureOrganizationSelected()) {
            throw new Error("Organization ID non trovato! L'utente non ha selezionato alcuna organizzazione.");
        }
        const orgId = window.getActiveOrganizationId ? window.getActiveOrganizationId() : null;
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .in('id', productIds)
            .eq('organization_id', orgId);

        if (error) {
            console.error('❌ Failed to load products from Supabase:', error);
            return [];
        }

        const linkedProducts = (data || []).map(product => ({
            productId: product.id,
            sku: product.sku,
            productName: product.name,
            quantity: 1,
            weight: product.specifications?.weight || 0,
            volume: product.specifications?.volume || 0,
            value: product.specifications?.value || 0
        }));
        
        // Update shipment with linked products
        await this.updateShipment(shipmentId, {
            products: [...(shipment.products || []), ...linkedProducts]
        });
        
        console.log(`✅ Linked ${linkedProducts.length} products to shipment ${shipment.shipmentNumber}`);
        return linkedProducts;
    }
    
    // ===== COST ALLOCATION =====
    
    async allocateCosts(shipmentId, method = 'hybrid') {
        const shipment = this.getShipment(shipmentId);
        if (!shipment || !shipment.products || shipment.products.length === 0) {
            throw new Error('Shipment not found or has no products');
        }
        
        const totalCost = shipment.costs?.total || 0;
        if (totalCost === 0) {
            throw new Error('Shipment has no costs to allocate');
        }
        
        // Calculate allocation based on method
        const allocations = this.calculateCostAllocations(shipment, method);
        
        // Update products with allocated costs
        const updatedProducts = shipment.products.map((product, index) => ({
            ...product,
            allocatedCost: allocations[index]?.allocatedCost || 0,
            unitCost: allocations[index]?.unitCost || 0
        }));
        
        await this.updateShipment(shipmentId, { products: updatedProducts });
        
        console.log(`✅ Allocated costs for shipment ${shipment.shipmentNumber} using ${method} method`);
        return allocations;
    }
    
    calculateCostAllocations(shipment, method) {
        const products = shipment.products;
        const totalCost = shipment.costs.total;
        
        // Calculate totals for allocation
        const totals = {
            weight: products.reduce((sum, p) => sum + ((p.weight || 0) * (p.quantity || 0)), 0),
            volume: products.reduce((sum, p) => sum + ((p.volume || 0) * (p.quantity || 0)), 0),
            value: products.reduce((sum, p) => sum + ((p.value || 0) * (p.quantity || 0)), 0),
            quantity: products.reduce((sum, p) => sum + (p.quantity || 0), 0)
        };
        
        return products.map(product => {
            let allocationRatio = 0;
            
            const productWeight = (product.weight || 0) * (product.quantity || 0);
            const productVolume = (product.volume || 0) * (product.quantity || 0);
            const productValue = (product.value || 0) * (product.quantity || 0);
            
            switch (method) {
                case 'weight':
                    allocationRatio = totals.weight > 0 ? productWeight / totals.weight : 0;
                    break;
                case 'volume':
                    allocationRatio = totals.volume > 0 ? productVolume / totals.volume : 0;
                    break;
                case 'value':
                    allocationRatio = totals.value > 0 ? productValue / totals.value : 0;
                    break;
                case 'quantity':
                    allocationRatio = totals.quantity > 0 ? product.quantity / totals.quantity : 0;
                    break;
                case 'hybrid':
                default:
                    // 40% value, 30% weight, 30% volume
                    const valueRatio = totals.value > 0 ? productValue / totals.value : 0;
                    const weightRatio = totals.weight > 0 ? productWeight / totals.weight : 0;
                    const volumeRatio = totals.volume > 0 ? productVolume / totals.volume : 0;
                    allocationRatio = (valueRatio * 0.4) + (weightRatio * 0.3) + (volumeRatio * 0.3);
                    break;
            }
            
            const allocatedCost = totalCost * allocationRatio;
            const unitCost = product.quantity > 0 ? allocatedCost / product.quantity : 0;
            
            return {
                sku: product.sku,
                productName: product.productName,
                quantity: product.quantity,
                allocationRatio,
                allocatedCost,
                unitCost
            };
        });
    }
    
    // ===== IMPORT/EXPORT =====
    
    async importShipments(data, options = {}) {
        const { overwrite = false } = options;
        const results = { imported: [], errors: [] };
        const collectedProducts = [];
        
        if (!Array.isArray(data)) {
            throw new Error('Import data must be an array');
        }
        
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            
            try {
                // Convert CSV row to shipment object
                const shipmentData = this.convertImportRowToShipment(row);
                const product = this.extractProductFromRow(row);
                if (product) collectedProducts.push(product);
                
                // Check if shipment already exists
                const existing = this.getShipmentByNumber(shipmentData.shipmentNumber);
                
                if (existing && !overwrite) {
                    results.errors.push({
                        row: row,
                        error: 'Shipment already exists'
                    });
                    continue;
                }
                
                if (existing && overwrite) {
                    await this.updateShipment(existing.id, shipmentData);
                    results.imported.push(existing);
                } else {
                    const newShipment = await this.createShipment(shipmentData);
                    results.imported.push(newShipment);
                }
                
            } catch (error) {
                results.errors.push({
                    row: row,
                    error: error.message
                });
            }
        }
        
        console.log(`📥 Import completed: ${results.imported.length} imported, ${results.errors.length} errors`);
        if (collectedProducts.length > 0 && window.productSync?.mergeProducts) {
            window.productSync.mergeProducts(collectedProducts);
        }
        return results;
    }
    
    convertImportRowToShipment(row) {
        const mapped = {};
        for (const [key, value] of Object.entries(row)) {
            const normalized = window.ShipmentUnifiedMapping.mapColumn(key);
            mapped[normalized] = value;
        }

        const getField = (name, def = null) => {
            return mapped[name] !== undefined && mapped[name] !== null && mapped[name] !== ''
                ? mapped[name]
                : def;
        };

        return {
            shipmentNumber: getField('shipment_number'),
            type: (getField('type', 'container') || 'container').toLowerCase(),
            status: window.ShipmentUnifiedMapping.mapStatus(getField('status', 'planned')),
            carrier: {
                code: getField('carrier_code'),
                name: getField('carrier_name'),
                service: getField('service')
            },
            route: {
                origin: {
                    port: getField('origin_port'),
                    name: getField('origin_name')
                },
                destination: {
                    port: getField('destination_port'),
                    name: getField('destination_name')
                },
                via: getField('via') ? getField('via').split(',').map(s => s.trim()) : [],
                estimatedTransit: parseInt(getField('transit_days')) || 0
            },
            schedule: {
                etd: getField('etd'),
                eta: getField('eta')
            },
            costs: {
                oceanFreight: parseFloat(getField('ocean_freight')) || 0,
                bunkerSurcharge: parseFloat(getField('bunker_surcharge')) || 0,
                portCharges: parseFloat(getField('port_charges')) || 0,
                customs: parseFloat(getField('customs')) || 0,
                insurance: parseFloat(getField('insurance')) || 0,
                total: parseFloat(getField('total_cost')) || 0,
                currency: getField('currency') || 'EUR'
            }
        };
    }

    // Extract product information from a CSV row using mapped keys
    extractProductFromRow(row) {
        const mapped = {};
        for (const [key, value] of Object.entries(row)) {
            const normalize = window.ShipmentUnifiedMapping?.mapColumn
                ? window.ShipmentUnifiedMapping.mapColumn(key)
                : key.toLowerCase().replace(/[^a-z0-9]+/g, '_');
            mapped[normalize] = value;
        }

        const sku = mapped.product_sku || mapped.sku;
        const name = mapped.product_name || mapped.description || mapped.name;
        const quantity = parseFloat(mapped.quantity) || 0;
        const weight = parseFloat(mapped.weight) || 0;
        const volume = parseFloat(mapped.volume) || 0;
        const value = parseFloat(mapped.value) || 0;

        if (!sku && !name) {
            return null;
        }

        return {
            sku,
            name: name || 'Unnamed Product',
            quantity,
            specifications: { weight, volume, value }
        };
    }
    
    exportShipments(format = 'csv') {
        if (format.toLowerCase() === 'csv') {
            return this.exportToCsv();
        } else {
            throw new Error(`Export format ${format} not supported`);
        }
    }
    
    exportToCsv() {
        const headers = [
            'Shipment Number', 'Type', 'Status', 'Carrier Code', 'Carrier Name', 'Service',
            'Origin Port', 'Origin Name', 'Destination Port', 'Destination Name', 'Via',
            'Transit Days', 'ETD', 'ETA', 'Ocean Freight', 'BAF', 'Port Charges',
            'Customs', 'Insurance', 'Total Cost', 'Currency', 'Products Count',
            'Created', 'Updated'
        ];
        
        const rows = this.shipments.map(s => [
            s.shipmentNumber,
            s.type,
            s.status,
            s.carrier?.code || '',
            s.carrier?.name || '',
            s.carrier?.service || '',
            s.route?.origin?.port || '',
            s.route?.origin?.name || '',
            s.route?.destination?.port || '',
            s.route?.destination?.name || '',
            s.route?.via?.join(', ') || '',
            s.route?.estimatedTransit || '',
            s.schedule?.etd || '',
            s.schedule?.eta || '',
            s.costs?.oceanFreight || 0,
            s.costs?.bunkerSurcharge || 0,
            s.costs?.portCharges || 0,
            s.costs?.customs || 0,
            s.costs?.insurance || 0,
            s.costs?.total || 0,
            s.costs?.currency || 'EUR',
            s.products?.length || 0,
            new Date(s.createdAt).toLocaleDateString('it-IT'),
            new Date(s.updatedAt).toLocaleDateString('it-IT')
        ]);
        
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => 
                typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell
            ).join(','))
        ].join('\n');
        
        return csvContent;
    }
    
    // ===== STATISTICS =====
    
    getStatistics() {
        const stats = {
            total: this.shipments.length,
            byStatus: {},
            byType: {},
            byCarrier: {},
            totalCost: 0,
            avgTransitTime: 0,
            avgCost: 0
        };
        
        let totalTransitDays = 0;
        let shipmentsWithTransit = 0;
        let totalCosts = 0;
        let shipmentsWithCosts = 0;
        
        this.shipments.forEach(shipment => {
            // By status
            stats.byStatus[shipment.status] = (stats.byStatus[shipment.status] || 0) + 1;
            
            // By type
            stats.byType[shipment.type] = (stats.byType[shipment.type] || 0) + 1;
            
            // By carrier
            if (shipment.carrier?.name) {
                stats.byCarrier[shipment.carrier.name] = (stats.byCarrier[shipment.carrier.name] || 0) + 1;
            }
            
            // Transit time
            if (shipment.route?.estimatedTransit) {
                totalTransitDays += shipment.route.estimatedTransit;
                shipmentsWithTransit++;
            }
            
            // Costs
            if (shipment.costs?.total) {
                totalCosts += shipment.costs.total;
                shipmentsWithCosts++;
            }
        });
        
        stats.totalCost = totalCosts;
        stats.avgTransitTime = shipmentsWithTransit > 0 ? Math.round(totalTransitDays / shipmentsWithTransit) : 0;
        stats.avgCost = shipmentsWithCosts > 0 ? Math.round(totalCosts / shipmentsWithCosts) : 0;
        
        return stats;
    }
    
    // ===== UTILITY METHODS =====
    
    generateId() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    
    generateShipmentNumber() {
        const prefix = 'SCH';
        const timestamp = Date.now().toString().slice(-8);
        const random = Math.random().toString(36).substr(2, 3).toUpperCase();
        return `${prefix}${timestamp}${random}`;
    }
    
    createDefaultCommercial() {
        return {
            purchaseOrder: {},
            proformaInvoice: {},
            commercialInvoice: {},
            transportDocument: {},
            cargo: {},
            containers: [],
            financial: { currency: 'EUR' },
            compliance: { complianceScore: 0 }
        };
    }
    
    // ===== SUBSCRIPTION SYSTEM =====
    
    subscribe(callback) {
        this.subscribers.push(callback);
        return () => {
            const index = this.subscribers.indexOf(callback);
            if (index > -1) {
                this.subscribers.splice(index, 1);
            }
        };
    }
    
    notifySubscribers(event, data) {
        this.subscribers.forEach(callback => {
            try {
                callback(event, data);
            } catch (error) {
                console.error('Error in subscriber callback:', error);
            }
        });
        
        // Also dispatch global events
        window.dispatchEvent(new CustomEvent('shipmentsUpdated', {
            detail: { event, data }
        }));
    }
}

// ===== GLOBAL REGISTRATION =====
window.ShipmentsRegistry = ShipmentsRegistry;

// Only auto-initialize if not already done by dependency manager
if (!window.shipmentsRegistry || !window.shipmentsRegistry.initialized) {
    console.log('🏗️ Auto-initializing ShipmentsRegistry...');
    
    document.addEventListener('DOMContentLoaded', async () => {
        if (!window.shipmentsRegistry || !window.shipmentsRegistry.initialized) {
            window.shipmentsRegistry = new ShipmentsRegistry();
            await window.shipmentsRegistry.init();
            
            // Dispatch ready event
            window.dispatchEvent(new Event('shipmentsRegistryReady'));
        }
    });
}

console.log('[ShipmentsRegistry] Enhanced registry system loaded - v2.0');