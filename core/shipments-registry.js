// shipments-registry.js - Enhanced Shipments Registry with Better Initialization
// Path: /core/shipments-registry.js

class ShipmentsRegistry {
    constructor() {
        this.shipments = [];
        this.initialized = false;
        this.subscribers = [];
        this.storageKey = 'shipmentsRegistry';
        this.version = '2.0.0';
        this.supabaseService = null;
        
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
            await this.ensureSupabaseService();
            const orgId = await this.getOrganizationId();
            this.shipments = await this.supabaseService.getAllShipments(orgId);

            this.shipments = this.validateShipments(this.shipments);

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
        window.addEventListener('organizationChanged', async () => {
            await this.reloadForOrganization();
        });
    }
    
    saveShipments() {
        // Persistence handled by Supabase
        return true;
    }
    
    // ===== SHIPMENT OPERATIONS =====
    
    async createShipment(shipmentData) {
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
            ...shipmentData
        };
        
        await this.ensureSupabaseService();
        const orgId = await this.getOrganizationId();
        const saved = await this.supabaseService.createShipment({
            ...shipment,
            organization_id: orgId
        });

        if (saved) {
            this.shipments.push(saved);
            this.notifySubscribers('created', { shipment: saved });
            console.log(`✅ Created shipment: ${saved.shipmentNumber}`);
        }
        return saved;
    }
    
    async updateShipment(shipmentId, updates) {
        await this.ensureSupabaseService();
        const index = this.shipments.findIndex(s => s.id === shipmentId);
        if (index === -1) {
            throw new Error(`Shipment ${shipmentId} not found`);
        }

        const oldShipment = { ...this.shipments[index] };

        const updated = await this.supabaseService.updateShipment(shipmentId, updates);

        if (updated) {
            this.shipments[index] = updated;
            this.notifySubscribers('updated', { shipment: updated, oldShipment });
            console.log(`✅ Updated shipment: ${updated.shipmentNumber}`);
        }

        return updated;
    }
    
    async deleteShipment(shipmentId) {
        await this.ensureSupabaseService();
        const index = this.shipments.findIndex(s => s.id === shipmentId);

        if (index === -1) {
            throw new Error(`Shipment ${shipmentId} not found`);
        }

        const success = await this.supabaseService.deleteShipment(shipmentId);
        let deletedShipment = null;

        if (success) {
            deletedShipment = this.shipments.splice(index, 1)[0];
            this.notifySubscribers('deleted', { shipment: deletedShipment });
            console.log(`✅ Deleted shipment: ${deletedShipment.shipmentNumber}`);
        }

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
        
        // Get products from localStorage (integration with products system)
        const allProducts = JSON.parse(localStorage.getItem('products') || '[]');
        
        const linkedProducts = productIds.map(productId => {
            const product = allProducts.find(p => p.id === productId);
            if (!product) {
                console.warn(`Product ${productId} not found`);
                return null;
            }
            
            return {
                productId: product.id,
                sku: product.sku,
                productName: product.name,
                quantity: 1, // Default quantity
                weight: product.specifications?.weight || 0,
                volume: product.specifications?.volume || 0,
                value: product.specifications?.value || 0
            };
        }).filter(Boolean);
        
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
        
        if (!Array.isArray(data)) {
            throw new Error('Import data must be an array');
        }
        
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            
            try {
                // Convert CSV row to shipment object
                const shipmentData = this.convertImportRowToShipment(row);
                
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
        return results;
    }
    
    convertImportRowToShipment(row) {
        // Handle different possible column names
        const getField = (row, ...names) => {
            for (const name of names) {
                if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
                    return row[name];
                }
            }
            return null;
        };
        
        return {
            shipmentNumber: getField(row, 'Shipment Number', 'shipmentNumber', 'Numero Spedizione'),
            type: (getField(row, 'Type', 'type', 'Tipo') || 'container').toLowerCase(),
            status: (getField(row, 'Status', 'status', 'Stato') || 'planned').toLowerCase(),
            carrier: {
                code: getField(row, 'Carrier Code', 'carrierCode', 'Codice Vettore'),
                name: getField(row, 'Carrier Name', 'carrierName', 'Nome Vettore', 'Carrier'),
                service: getField(row, 'Service', 'service', 'Servizio')
            },
            route: {
                origin: {
                    port: getField(row, 'Origin Port', 'originPort', 'Porto Origine'),
                    name: getField(row, 'Origin Name', 'originName', 'Nome Origine', 'Origin')
                },
                destination: {
                    port: getField(row, 'Destination Port', 'destinationPort', 'Porto Destinazione'),
                    name: getField(row, 'Destination Name', 'destinationName', 'Nome Destinazione', 'Destination')
                },
                via: getField(row, 'Via', 'via', 'Scali') ? 
                    getField(row, 'Via', 'via', 'Scali').split(',').map(s => s.trim()) : [],
                estimatedTransit: parseInt(getField(row, 'Transit Days', 'transitDays', 'Giorni Transito')) || 0
            },
            schedule: {
                etd: getField(row, 'ETD', 'etd', 'Partenza Stimata'),
                eta: getField(row, 'ETA', 'eta', 'Arrivo Stimato')
            },
            costs: {
                oceanFreight: parseFloat(getField(row, 'Ocean Freight', 'oceanFreight', 'Nolo Marittimo')) || 0,
                bunkerSurcharge: parseFloat(getField(row, 'BAF', 'bunkerSurcharge', 'Bunker')) || 0,
                portCharges: parseFloat(getField(row, 'Port Charges', 'portCharges', 'Spese Portuali')) || 0,
                customs: parseFloat(getField(row, 'Customs', 'customs', 'Dogana')) || 0,
                insurance: parseFloat(getField(row, 'Insurance', 'insurance', 'Assicurazione')) || 0,
                total: parseFloat(getField(row, 'Total Cost', 'totalCost', 'Costo Totale')) || 0,
                currency: getField(row, 'Currency', 'currency', 'Valuta') || 'EUR'
            }
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
        return 'SHIP-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
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

    async ensureSupabaseService() {
        if (!this.supabaseService) {
            if (window.supabaseShipmentsService) {
                this.supabaseService = window.supabaseShipmentsService;
            } else {
                const module = await import('/core/services/supabase-shipments-service.js');
                this.supabaseService = module.default;
                window.supabaseShipmentsService = this.supabaseService;
            }
        }
    }

    async getOrganizationId() {
        if (window.organizationService) {
            if (!window.organizationService.initialized) {
                await window.organizationService.init();
            }
            return window.organizationService.getCurrentOrgId();
        }
        return null;
    }

    async reloadForOrganization() {
        await this.loadShipments();
        this.notifySubscribers('reloaded', { shipments: this.shipments });
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