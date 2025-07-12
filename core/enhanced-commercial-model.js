// enhanced-commercial-model.js - V15.0 COMMERCIAL DATA INTEGRATION
// Path: /core/enhanced-commercial-model.js

/**
 * 🏢 ENHANCED COMMERCIAL DATA MODEL V15.0
 * Extended shipment model with full commercial data fields (PO, PI, CI, BL, CBM, weights)
 * Integrated with Executive BI Dashboard for comprehensive business analytics
 */

class EnhancedCommercialModel {
    constructor() {
        this.commercialTemplates = this.loadCommercialTemplates();
        this.validationRules = this.initializeValidationRules();
        this.crossReferenceIndex = new Map();
        this.documentWorkflows = this.initializeDocumentWorkflows();
        
        // Integration with Executive BI
        this.biMetrics = {
            commercialKPIs: {},
            complianceMetrics: {},
            profitabilityAnalysis: {},
            riskAssessment: {}
        };
        
        this.init();
    }

    async init() {
        console.log('🏢 Inizializzazione Enhanced Commercial Data Model V15.0...');
        
        // Load existing data and upgrade structure
        await this.upgradeExistingShipments();
        
        // Initialize cross-reference system
        this.buildCrossReferenceIndex();
        
        // Setup BI integration
        this.setupBIIntegration();
        
        console.log('✅ Enhanced Commercial Data Model V15.0 initialized');
    }

    // ===== EXTENDED SHIPMENT DATA MODEL =====
    
    getExtendedShipmentSchema() {
        return {
            // Existing fields...
            id: { type: 'string', required: true, immutable: true },
            shipment_number: { type: 'string', required: true, unique: true },
            type: { type: 'enum', values: ['container', 'awb', 'bl', 'lcl'], required: true },
            status: { type: 'enum', values: ['planned', 'departed', 'in_transit', 'arrived', 'delivered'] },
            
            // ===== NEW: COMMERCIAL DATA FIELDS =====
            commercial: {
                // Purchase Order Information
                purchaseOrder: {
                    poNumber: { type: 'string', required: false, searchable: true },
                    poDate: { type: 'date', required: false },
                    poValue: { type: 'currency', required: false, currency: 'EUR' },
                    poStatus: { type: 'enum', values: ['draft', 'confirmed', 'partial', 'completed', 'cancelled'] },
                    supplier: {
                        code: { type: 'string', required: false },
                        name: { type: 'string', required: false, searchable: true },
                        address: { type: 'object', required: false },
                        contact: { type: 'object', required: false },
                        taxId: { type: 'string', required: false },
                        paymentTerms: { type: 'string', required: false }
                    },
                    buyer: {
                        code: { type: 'string', required: false },
                        name: { type: 'string', required: false },
                        address: { type: 'object', required: false },
                        contact: { type: 'object', required: false }
                    }
                },
                
                // Proforma Invoice Information
                proformaInvoice: {
                    piNumber: { type: 'string', required: false, searchable: true },
                    piDate: { type: 'date', required: false },
                    piValue: { type: 'currency', required: false, currency: 'EUR' },
                    piStatus: { type: 'enum', values: ['draft', 'sent', 'approved', 'revised', 'cancelled'] },
                    paymentTerms: { type: 'string', required: false },
                    validityDate: { type: 'date', required: false },
                    currency: { type: 'string', default: 'EUR' },
                    exchangeRate: { type: 'number', required: false }
                },
                
                // Commercial Invoice Information
                commercialInvoice: {
                    ciNumber: { type: 'string', required: false, searchable: true },
                    ciDate: { type: 'date', required: false },
                    ciValue: { type: 'currency', required: false, currency: 'EUR' },
                    ciStatus: { type: 'enum', values: ['draft', 'issued', 'sent', 'paid', 'overdue'] },
                    paymentStatus: { type: 'enum', values: ['pending', 'partial', 'paid', 'overdue'] },
                    dueDate: { type: 'date', required: false },
                    paymentDate: { type: 'date', required: false },
                    discountTerms: { type: 'string', required: false }
                },
                
                // Bill of Lading / Airway Bill Information
                transportDocument: {
                    blNumber: { type: 'string', required: false, searchable: true, unique: true },
                    blDate: { type: 'date', required: false },
                    blType: { type: 'enum', values: ['original', 'copy', 'telex_release', 'express_release'] },
                    freightTerms: { type: 'enum', values: ['prepaid', 'collect', 'third_party'] },
                    numberOfOriginals: { type: 'number', min: 1, max: 5, default: 3 },
                    consignee: { type: 'object', required: false },
                    notifyParty: { type: 'object', required: false },
                    placeOfReceipt: { type: 'string', required: false },
                    portOfLoading: { type: 'string', required: false },
                    portOfDischarge: { type: 'string', required: false },
                    placeOfDelivery: { type: 'string', required: false }
                },
                
                // Cargo Information
                cargo: {
                    totalWeight: { type: 'number', required: false, unit: 'kg' },
                    netWeight: { type: 'number', required: false, unit: 'kg' },
                    grossWeight: { type: 'number', required: false, unit: 'kg' },
                    totalVolume: { type: 'number', required: false, unit: 'm3' },
                    cbm: { type: 'number', required: false, unit: 'm3' }, // Cubic Meters
                    packageCount: { type: 'number', required: false },
                    packageType: { type: 'enum', values: ['cartons', 'pallets', 'crates', 'bags', 'drums', 'other'] },
                    packingList: { type: 'array', items: 'object' },
                    commodityCode: { type: 'string', required: false }, // HS Code
                    commodityDescription: { type: 'string', required: false, searchable: true },
                    dangerousGoods: { type: 'boolean', default: false },
                    dgClass: { type: 'string', required: false }, // Dangerous Goods Class
                    temperature: {
                        controlled: { type: 'boolean', default: false },
                        min: { type: 'number', unit: '°C' },
                        max: { type: 'number', unit: '°C' },
                        type: { type: 'enum', values: ['frozen', 'chilled', 'ambient'] }
                    }
                },
                
                // Container Information (for container shipments)
                containers: {
                    type: 'array',
                    items: {
                        containerNumber: { type: 'string', required: true },
                        sealNumber: { type: 'string', required: false },
                        containerType: { type: 'enum', values: ['20GP', '40GP', '40HC', '45HC', '20RF', '40RF'] },
                        tareWeight: { type: 'number', unit: 'kg' },
                        maxGrossWeight: { type: 'number', unit: 'kg' },
                        cargoWeight: { type: 'number', unit: 'kg' },
                        cbm: { type: 'number', unit: 'm3' },
                        loadingDate: { type: 'date' },
                        inspectionDate: { type: 'date' },
                        condition: { type: 'enum', values: ['excellent', 'good', 'fair', 'poor'] },
                        remarks: { type: 'string' }
                    }
                },
                
                // Financial Information
                financial: {
                    totalValue: { type: 'currency', required: false, currency: 'EUR' },
                    currency: { type: 'string', default: 'EUR' },
                    exchangeRate: { type: 'number', required: false },
                    incoterms: { type: 'enum', values: ['EXW', 'FCA', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP', 'FAS', 'FOB', 'CFR', 'CIF'] },
                    paymentMethod: { type: 'enum', values: ['T/T', 'L/C', 'D/P', 'D/A', 'Cash', 'Open_Account'] },
                    creditTerms: { type: 'string' },
                    profitMargin: { type: 'percentage' },
                    markup: { type: 'percentage' },
                    landedCost: { type: 'currency', currency: 'EUR' }
                },
                
                // Compliance & Documentation
                compliance: {
                    customsStatus: { type: 'enum', values: ['pending', 'declared', 'examined', 'released', 'seized'] },
                    customsReference: { type: 'string' },
                    dutyPaid: { type: 'boolean', default: false },
                    dutyAmount: { type: 'currency', currency: 'EUR' },
                    vatAmount: { type: 'currency', currency: 'EUR' },
                    certificatesRequired: { type: 'array', items: 'string' },
                    certificatesReceived: { type: 'array', items: 'string' },
                    inspectionRequired: { type: 'boolean', default: false },
                    inspectionStatus: { type: 'enum', values: ['not_required', 'scheduled', 'completed', 'failed'] },
                    complianceScore: { type: 'number', min: 0, max: 100 }
                }
            },
            
            // ===== ENHANCED EXISTING FIELDS =====
            products: {
                type: 'array',
                items: {
                    // Existing product fields
                    productId: { type: 'string', required: true },
                    sku: { type: 'string', required: true, searchable: true },
                    productName: { type: 'string', required: true, searchable: true },
                    quantity: { type: 'number', required: true, min: 0 },
                    
                    // Enhanced commercial fields
                    unitPrice: { type: 'currency', currency: 'EUR' },
                    totalValue: { type: 'currency', currency: 'EUR' },
                    weight: { type: 'number', unit: 'kg' },
                    volume: { type: 'number', unit: 'm3' },
                    dimensions: {
                        length: { type: 'number', unit: 'cm' },
                        width: { type: 'number', unit: 'cm' },
                        height: { type: 'number', unit: 'cm' }
                    },
                    hsCode: { type: 'string' },
                    countryOfOrigin: { type: 'string' },
                    manufacturerName: { type: 'string' },
                    brandName: { type: 'string' },
                    model: { type: 'string' },
                    serialNumbers: { type: 'array', items: 'string' },
                    batchNumber: { type: 'string' },
                    expiryDate: { type: 'date' },
                    packagingType: { type: 'string' },
                    packingMethod: { type: 'string' },
                    specialHandling: { type: 'array', items: 'string' }
                }
            },
            
            // Enhanced costs with detailed breakdown
            costs: {
                // Transportation costs
                freight: { type: 'currency', currency: 'EUR' },
                bunkerSurcharge: { type: 'currency', currency: 'EUR' },
                currencyAdjustment: { type: 'currency', currency: 'EUR' },
                
                // Port and handling costs
                portCharges: { type: 'currency', currency: 'EUR' },
                terminalHandling: { type: 'currency', currency: 'EUR' },
                documentation: { type: 'currency', currency: 'EUR' },
                
                // Customs and compliance
                customsDuty: { type: 'currency', currency: 'EUR' },
                vat: { type: 'currency', currency: 'EUR' },
                customsBrokerage: { type: 'currency', currency: 'EUR' },
                
                // Insurance and financial
                insurance: { type: 'currency', currency: 'EUR' },
                bankCharges: { type: 'currency', currency: 'EUR' },
                
                // Additional services
                inspection: { type: 'currency', currency: 'EUR' },
                storage: { type: 'currency', currency: 'EUR' },
                delivery: { type: 'currency', currency: 'EUR' },
                
                // Totals
                subtotal: { type: 'currency', currency: 'EUR' },
                total: { type: 'currency', currency: 'EUR' },
                currency: { type: 'string', default: 'EUR' },
                
                // Cost analysis
                costPerKg: { type: 'currency', currency: 'EUR' },
                costPerCbm: { type: 'currency', currency: 'EUR' },
                costPerUnit: { type: 'currency', currency: 'EUR' },
                marginAmount: { type: 'currency', currency: 'EUR' },
                marginPercentage: { type: 'percentage' }
            },
            
            // Audit trail and metadata
            metadata: {
                createdAt: { type: 'datetime', required: true },
                updatedAt: { type: 'datetime', required: true },
                createdBy: { type: 'string', required: true },
                updatedBy: { type: 'string', required: true },
                version: { type: 'number', default: 1 },
                dataSource: { type: 'enum', values: ['manual', 'import', 'api', 'integration'] },
                validated: { type: 'boolean', default: false },
                validatedAt: { type: 'datetime' },
                validatedBy: { type: 'string' },
                tags: { type: 'array', items: 'string' },
                notes: { type: 'array', items: 'object' }
            }
        };
    }

    // ===== SMART FORMS FOR COMMERCIAL DATA ENTRY =====
    
    createSmartCommercialForm(shipmentType = 'container') {
        const formConfig = {
            title: 'Dati Commerciali Spedizione',
            sections: [
                {
                    id: 'purchase_order',
                    title: 'Purchase Order (PO)',
                    icon: 'fas fa-file-contract',
                    fields: [
                        {
                            name: 'commercial.purchaseOrder.poNumber',
                            label: 'Numero PO',
                            type: 'text',
                            placeholder: 'PO-2024-XXXX',
                            validation: { pattern: /^PO-\d{4}-\w+$/ },
                            required: false,
                            searchable: true
                        },
                        {
                            name: 'commercial.purchaseOrder.poDate',
                            label: 'Data PO',
                            type: 'date',
                            required: false
                        },
                        {
                            name: 'commercial.purchaseOrder.poValue',
                            label: 'Valore PO',
                            type: 'currency',
                            currency: 'EUR',
                            required: false,
                            validation: { min: 0 }
                        },
                        {
                            name: 'commercial.purchaseOrder.poStatus',
                            label: 'Stato PO',
                            type: 'select',
                            options: [
                                { value: 'draft', label: 'Bozza' },
                                { value: 'confirmed', label: 'Confermato' },
                                { value: 'partial', label: 'Parziale' },
                                { value: 'completed', label: 'Completato' },
                                { value: 'cancelled', label: 'Annullato' }
                            ],
                            default: 'draft'
                        },
                        {
                            name: 'commercial.purchaseOrder.supplier',
                            label: 'Fornitore',
                            type: 'supplier_selector',
                            required: false,
                            autocomplete: true
                        }
                    ]
                },
                
                {
                    id: 'proforma_invoice',
                    title: 'Proforma Invoice (PI)',
                    icon: 'fas fa-file-invoice',
                    fields: [
                        {
                            name: 'commercial.proformaInvoice.piNumber',
                            label: 'Numero PI',
                            type: 'text',
                            placeholder: 'PI-2024-XXXX',
                            validation: { pattern: /^PI-\d{4}-\w+$/ },
                            searchable: true
                        },
                        {
                            name: 'commercial.proformaInvoice.piDate',
                            label: 'Data PI',
                            type: 'date'
                        },
                        {
                            name: 'commercial.proformaInvoice.piValue',
                            label: 'Valore PI',
                            type: 'currency',
                            currency: 'EUR',
                            validation: { min: 0 }
                        },
                        {
                            name: 'commercial.proformaInvoice.paymentTerms',
                            label: 'Termini Pagamento',
                            type: 'select',
                            options: [
                                { value: '30_days', label: '30 giorni' },
                                { value: '60_days', label: '60 giorni' },
                                { value: '90_days', label: '90 giorni' },
                                { value: 'advance', label: 'Anticipo' },
                                { value: 'cod', label: 'Contrassegno' },
                                { value: 'custom', label: 'Personalizzato' }
                            ]
                        }
                    ]
                },
                
                {
                    id: 'commercial_invoice',
                    title: 'Commercial Invoice (CI)',
                    icon: 'fas fa-receipt',
                    fields: [
                        {
                            name: 'commercial.commercialInvoice.ciNumber',
                            label: 'Numero CI',
                            type: 'text',
                            placeholder: 'CI-2024-XXXX',
                            validation: { pattern: /^CI-\d{4}-\w+$/ },
                            searchable: true
                        },
                        {
                            name: 'commercial.commercialInvoice.ciDate',
                            label: 'Data CI',
                            type: 'date'
                        },
                        {
                            name: 'commercial.commercialInvoice.ciValue',
                            label: 'Valore CI',
                            type: 'currency',
                            currency: 'EUR',
                            validation: { min: 0 }
                        },
                        {
                            name: 'commercial.commercialInvoice.paymentStatus',
                            label: 'Stato Pagamento',
                            type: 'select',
                            options: [
                                { value: 'pending', label: 'In Attesa' },
                                { value: 'partial', label: 'Parziale' },
                                { value: 'paid', label: 'Pagato' },
                                { value: 'overdue', label: 'Scaduto' }
                            ],
                            default: 'pending'
                        }
                    ]
                },
                
                {
                    id: 'transport_document',
                    title: 'Bill of Lading (BL)',
                    icon: 'fas fa-ship',
                    fields: [
                        {
                            name: 'commercial.transportDocument.blNumber',
                            label: 'Numero BL',
                            type: 'text',
                            placeholder: 'MAEU123456789',
                            required: shipmentType === 'container',
                            validation: { 
                                pattern: shipmentType === 'container' ? /^[A-Z]{4}\d{9}$/ : null 
                            },
                            searchable: true,
                            unique: true
                        },
                        {
                            name: 'commercial.transportDocument.blDate',
                            label: 'Data BL',
                            type: 'date',
                            required: shipmentType === 'container'
                        },
                        {
                            name: 'commercial.transportDocument.freightTerms',
                            label: 'Termini Trasporto',
                            type: 'select',
                            options: [
                                { value: 'prepaid', label: 'Prepagato' },
                                { value: 'collect', label: 'Da Riscuotere' },
                                { value: 'third_party', label: 'Terza Parte' }
                            ],
                            default: 'prepaid'
                        },
                        {
                            name: 'commercial.transportDocument.numberOfOriginals',
                            label: 'Numero Originali',
                            type: 'number',
                            min: 1,
                            max: 5,
                            default: 3
                        }
                    ]
                },
                
                {
                    id: 'cargo_details',
                    title: 'Dettagli Carico',
                    icon: 'fas fa-boxes',
                    fields: [
                        {
                            name: 'commercial.cargo.totalWeight',
                            label: 'Peso Totale (kg)',
                            type: 'number',
                            min: 0,
                            step: 0.1,
                            unit: 'kg',
                            required: true
                        },
                        {
                            name: 'commercial.cargo.netWeight',
                            label: 'Peso Netto (kg)',
                            type: 'number',
                            min: 0,
                            step: 0.1,
                            unit: 'kg'
                        },
                        {
                            name: 'commercial.cargo.cbm',
                            label: 'Volume CBM (m³)',
                            type: 'number',
                            min: 0,
                            step: 0.001,
                            unit: 'm³',
                            required: true,
                            help: 'Cubic Meters - Volume totale del carico'
                        },
                        {
                            name: 'commercial.cargo.packageCount',
                            label: 'Numero Colli',
                            type: 'number',
                            min: 1,
                            required: true
                        },
                        {
                            name: 'commercial.cargo.packageType',
                            label: 'Tipo Imballo',
                            type: 'select',
                            options: [
                                { value: 'cartons', label: 'Cartoni' },
                                { value: 'pallets', label: 'Pallet' },
                                { value: 'crates', label: 'Casse' },
                                { value: 'bags', label: 'Sacchi' },
                                { value: 'drums', label: 'Fusti' },
                                { value: 'other', label: 'Altro' }
                            ]
                        },
                        {
                            name: 'commercial.cargo.commodityCode',
                            label: 'Codice HS',
                            type: 'text',
                            placeholder: '8471.30.00',
                            validation: { pattern: /^\d{4}\.\d{2}\.\d{2}$/ },
                            help: 'Harmonized System Code'
                        },
                        {
                            name: 'commercial.cargo.commodityDescription',
                            label: 'Descrizione Merce',
                            type: 'textarea',
                            rows: 3,
                            required: true,
                            searchable: true
                        }
                    ]
                },
                
                {
                    id: 'financial_terms',
                    title: 'Termini Finanziari',
                    icon: 'fas fa-euro-sign',
                    fields: [
                        {
                            name: 'commercial.financial.totalValue',
                            label: 'Valore Totale',
                            type: 'currency',
                            currency: 'EUR',
                            required: true,
                            validation: { min: 0 }
                        },
                        {
                            name: 'commercial.financial.incoterms',
                            label: 'Incoterms',
                            type: 'select',
                            options: [
                                { value: 'EXW', label: 'EXW - Ex Works' },
                                { value: 'FCA', label: 'FCA - Free Carrier' },
                                { value: 'FOB', label: 'FOB - Free On Board' },
                                { value: 'CFR', label: 'CFR - Cost and Freight' },
                                { value: 'CIF', label: 'CIF - Cost Insurance Freight' },
                                { value: 'DAP', label: 'DAP - Delivered At Place' },
                                { value: 'DDP', label: 'DDP - Delivered Duty Paid' }
                            ],
                            required: true
                        },
                        {
                            name: 'commercial.financial.paymentMethod',
                            label: 'Metodo Pagamento',
                            type: 'select',
                            options: [
                                { value: 'T/T', label: 'T/T - Bonifico' },
                                { value: 'L/C', label: 'L/C - Lettera di Credito' },
                                { value: 'D/P', label: 'D/P - Documents against Payment' },
                                { value: 'D/A', label: 'D/A - Documents against Acceptance' },
                                { value: 'Cash', label: 'Contanti' },
                                { value: 'Open_Account', label: 'Conto Aperto' }
                            ]
                        }
                    ]
                }
            ],
            
            // Form behavior and validation
            behavior: {
                autosave: true,
                autosaveInterval: 30000, // 30 seconds
                validation: 'realtime',
                crossFieldValidation: true,
                progressIndicator: true,
                smartDefaults: true
            },
            
            // Integration settings
            integration: {
                updateBI: true,
                triggerWorkflows: true,
                updateCrossReferences: true,
                validateCompliance: true
            }
        };
        
        return formConfig;
    }

    // ===== CROSS-REFERENCE SYSTEM PO→PI→CI→BL =====
    
    buildCrossReferenceIndex() {
        console.log('🔗 Building cross-reference index...');
        
        this.crossReferenceIndex.clear();
        
        if (!window.shipmentsRegistry?.shipments) return;
        
        window.shipmentsRegistry.shipments.forEach(shipment => {
            if (shipment.commercial) {
                // Index by PO Number
                if (shipment.commercial.purchaseOrder?.poNumber) {
                    this.addCrossReference('po', shipment.commercial.purchaseOrder.poNumber, shipment.id);
                }
                
                // Index by PI Number
                if (shipment.commercial.proformaInvoice?.piNumber) {
                    this.addCrossReference('pi', shipment.commercial.proformaInvoice.piNumber, shipment.id);
                }
                
                // Index by CI Number
                if (shipment.commercial.commercialInvoice?.ciNumber) {
                    this.addCrossReference('ci', shipment.commercial.commercialInvoice.ciNumber, shipment.id);
                }
                
                // Index by BL Number
                if (shipment.commercial.transportDocument?.blNumber) {
                    this.addCrossReference('bl', shipment.commercial.transportDocument.blNumber, shipment.id);
                }
                
                // Index by Supplier
                if (shipment.commercial.purchaseOrder?.supplier?.code) {
                    this.addCrossReference('supplier', shipment.commercial.purchaseOrder.supplier.code, shipment.id);
                }
            }
        });
        
        console.log(`✅ Cross-reference index built with ${this.crossReferenceIndex.size} entries`);
    }
    
    addCrossReference(type, reference, shipmentId) {
        const key = `${type}:${reference}`;
        
        if (!this.crossReferenceIndex.has(key)) {
            this.crossReferenceIndex.set(key, {
                type,
                reference,
                shipments: [],
                createdAt: new Date().toISOString()
            });
        }
        
        const entry = this.crossReferenceIndex.get(key);
        if (!entry.shipments.includes(shipmentId)) {
            entry.shipments.push(shipmentId);
            entry.updatedAt = new Date().toISOString();
        }
    }
    
    findCrossReferences(type, reference) {
        const key = `${type}:${reference}`;
        const entry = this.crossReferenceIndex.get(key);
        
        if (!entry) return [];
        
        return entry.shipments.map(shipmentId => 
            window.shipmentsRegistry.shipments.find(s => s.id === shipmentId)
        ).filter(Boolean);
    }
    
    getWorkflowProgress(shipmentId) {
        const shipment = window.shipmentsRegistry.shipments.find(s => s.id === shipmentId);
        if (!shipment?.commercial) return null;
        
        const workflow = {
            steps: [
                {
                    id: 'po',
                    name: 'Purchase Order',
                    completed: !!shipment.commercial.purchaseOrder?.poNumber,
                    date: shipment.commercial.purchaseOrder?.poDate,
                    status: shipment.commercial.purchaseOrder?.poStatus
                },
                {
                    id: 'pi',
                    name: 'Proforma Invoice',
                    completed: !!shipment.commercial.proformaInvoice?.piNumber,
                    date: shipment.commercial.proformaInvoice?.piDate,
                    status: shipment.commercial.proformaInvoice?.piStatus
                },
                {
                    id: 'ci',
                    name: 'Commercial Invoice',
                    completed: !!shipment.commercial.commercialInvoice?.ciNumber,
                    date: shipment.commercial.commercialInvoice?.ciDate,
                    status: shipment.commercial.commercialInvoice?.ciStatus
                },
                {
                    id: 'bl',
                    name: 'Bill of Lading',
                    completed: !!shipment.commercial.transportDocument?.blNumber,
                    date: shipment.commercial.transportDocument?.blDate,
                    status: shipment.commercial.transportDocument?.blType
                }
            ]
        };
        
        workflow.completionRate = workflow.steps.filter(s => s.completed).length / workflow.steps.length;
        workflow.currentStep = workflow.steps.find(s => !s.completed)?.id || 'completed';
        
        return workflow;
    }

    // ===== COMMERCIAL ANALYTICS INTEGRATION =====
    
    setupBIIntegration() {
        console.log('📊 Setting up BI integration for commercial data...');
        
        // Listen for Executive BI Dashboard events
        window.addEventListener('executiveBIRequest', (e) => {
            const { metric, filters } = e.detail;
            this.provideBIMetrics(metric, filters);
        });
        
        // Extend Executive BI with commercial metrics
        if (window.executiveBIDashboard) {
            this.extendExecutiveBI();
        } else {
            window.addEventListener('executiveBIDashboardReady', () => {
                this.extendExecutiveBI();
            });
        }
    }
    
    extendExecutiveBI() {
        console.log('🔗 Extending Executive BI with commercial metrics...');
        
        // Add commercial KPIs to Executive BI
        const originalCalculateMetrics = window.executiveBIDashboard.calculateExecutiveMetrics;
        
        window.executiveBIDashboard.calculateExecutiveMetrics = async function(shipments) {
            const baseMetrics = await originalCalculateMetrics.call(this, shipments);
            
            // Add commercial metrics
            const commercialMetrics = window.enhancedCommercialModel.calculateCommercialMetrics(shipments);
            
            return {
                ...baseMetrics,
                commercial: commercialMetrics
            };
        };
        
        // Add commercial insights
        const originalGenerateInsights = window.executiveBIDashboard.generateBusinessInsights;
        
        window.executiveBIDashboard.generateBusinessInsights = function(shipments, metrics) {
            const baseInsights = originalGenerateInsights.call(this, shipments, metrics);
            const commercialInsights = window.enhancedCommercialModel.generateCommercialInsights(shipments, metrics);
            
            return [...baseInsights, ...commercialInsights];
        };
        
        // Add commercial recommendations
        const originalGenerateRecommendations = window.executiveBIDashboard.generateExecutiveRecommendations;
        
        window.executiveBIDashboard.generateExecutiveRecommendations = function(shipments, metrics) {
            const baseRecommendations = originalGenerateRecommendations.call(this, shipments, metrics);
            const commercialRecommendations = window.enhancedCommercialModel.generateCommercialRecommendations(shipments, metrics);
            
            return [...baseRecommendations, ...commercialRecommendations];
        };
        
        console.log('✅ Executive BI extended with commercial capabilities');
    }
    
    calculateCommercialMetrics(shipments) {
        const commercialShipments = shipments.filter(s => s.commercial);
        
        if (commercialShipments.length === 0) {
            return this.getDefaultCommercialMetrics();
        }
        
        return {
            // Document Completion Metrics
            documentCompletion: {
                poCompletion: this.calculateCompletionRate(commercialShipments, 'purchaseOrder'),
                piCompletion: this.calculateCompletionRate(commercialShipments, 'proformaInvoice'),
                ciCompletion: this.calculateCompletionRate(commercialShipments, 'commercialInvoice'),
                blCompletion: this.calculateCompletionRate(commercialShipments, 'transportDocument'),
                overall: this.calculateOverallCompletion(commercialShipments)
            },
            
            // Financial Performance
            financial: {
                totalCommercialValue: this.calculateTotalCommercialValue(commercialShipments),
                averageShipmentValue: this.calculateAverageShipmentValue(commercialShipments),
                paymentDelays: this.calculatePaymentDelays(commercialShipments),
                cashFlow: this.calculateCashFlow(commercialShipments),
                profitMargins: this.calculateProfitMargins(commercialShipments),
                currencyExposure: this.calculateCurrencyExposure(commercialShipments)
            },
            
            // Operational Efficiency
            operational: {
                documentsPerShipment: this.calculateDocumentsPerShipment(commercialShipments),
                processingTime: this.calculateProcessingTime(commercialShipments),
                errorRate: this.calculateErrorRate(commercialShipments),
                automationRate: this.calculateAutomationRate(commercialShipments),
                complianceScore: this.calculateComplianceScore(commercialShipments)
            },
            
            // Supply Chain Intelligence
            supplyChain: {
                supplierPerformance: this.calculateSupplierPerformance(commercialShipments),
                routeProfitability: this.calculateRouteProfitability(commercialShipments),
                seasonalityImpact: this.calculateSeasonalityImpact(commercialShipments),
                riskExposure: this.calculateRiskExposure(commercialShipments)
            },
            
            // Cargo Analytics
            cargo: {
                weightUtilization: this.calculateWeightUtilization(commercialShipments),
                volumeUtilization: this.calculateVolumeUtilization(commercialShipments),
                packagingEfficiency: this.calculatePackagingEfficiency(commercialShipments),
                cargoValueDensity: this.calculateCargoValueDensity(commercialShipments)
            }
        };
    }
    
    generateCommercialInsights(shipments, metrics) {
        const insights = [];
        
        if (!metrics.commercial) return insights;
        
        const cm = metrics.commercial;
        
        // Document completion insights
        if (cm.documentCompletion.overall < 80) {
            insights.push({
                type: 'compliance',
                priority: 'high',
                title: 'Completamento Documentale Critico',
                description: `Solo ${cm.documentCompletion.overall.toFixed(1)}% delle spedizioni ha documentazione completa`,
                impact: 'negative',
                value: cm.documentCompletion.overall,
                recommendation: 'Implementa workflow automatizzati per completamento documenti'
            });
        }
        
        // Financial performance insights
        if (cm.financial.paymentDelays > 7) {
            insights.push({
                type: 'financial',
                priority: 'high',
                title: 'Ritardi Pagamenti Critici',
                description: `Ritardo medio pagamenti: ${cm.financial.paymentDelays.toFixed(1)} giorni`,
                impact: 'negative',
                value: cm.financial.paymentDelays,
                recommendation: 'Rivedi termini di pagamento e processo di sollecito'
            });
        }
        
        // Operational efficiency insights
        if (cm.operational.automationRate < 60) {
            insights.push({
                type: 'efficiency',
                priority: 'medium',
                title: 'Opportunità Automazione Processi',
                description: `Solo ${cm.operational.automationRate.toFixed(1)}% dei processi è automatizzato`,
                impact: 'opportunity',
                value: cm.operational.automationRate,
                recommendation: 'Implementa automazione per data entry e validazione documenti'
            });
        }
        
        // Cargo optimization insights
        if (cm.cargo.volumeUtilization < 85) {
            insights.push({
                type: 'optimization',
                priority: 'medium',
                title: 'Sottoutilizzo Volume Carico',
                description: `Utilizzo volume medio: ${cm.cargo.volumeUtilization.toFixed(1)}%`,
                impact: 'opportunity',
                value: cm.cargo.volumeUtilization,
                recommendation: 'Ottimizza consolidamento carichi per migliorare fill rate'
            });
        }
        
        return insights;
    }
    
    generateCommercialRecommendations(shipments, metrics) {
        const recommendations = [];
        
        if (!metrics.commercial) return recommendations;
        
        const cm = metrics.commercial;
        
        // Document automation recommendation
        if (cm.operational.automationRate < 70) {
            recommendations.push({
                id: 'commercial-automation-1',
                priority: 'high',
                category: 'automation',
                title: 'Automazione Gestione Documenti Commerciali',
                description: 'Implementa sistema OCR e AI per automazione completa gestione documenti PO→PI→CI→BL',
                expectedSavings: Math.round(shipments.length * 25 * 12), // €25 per shipment per month
                timeline: '3-4 mesi',
                effort: 'medium',
                confidence: 0.88,
                actions: [
                    'Configura OCR engine per riconoscimento automatico documenti',
                    'Implementa validazione automatica cross-references PO-PI-CI-BL',
                    'Attiva workflow automatici per completamento documentale',
                    'Setup monitoraggio real-time compliance e completeness'
                ]
            });
        }
        
        // Financial optimization recommendation
        if (cm.financial.paymentDelays > 5) {
            recommendations.push({
                id: 'commercial-finance-1',
                priority: 'high',
                category: 'financial',
                title: 'Ottimizzazione Cash Flow e Payment Terms',
                description: 'Migliora gestione cash flow con termini pagamento ottimizzati e automazione solleciti',
                expectedSavings: Math.round(cm.financial.totalCommercialValue * 0.02), // 2% improvement
                timeline: '2-3 mesi',
                effort: 'low',
                confidence: 0.92,
                actions: [
                    'Negozia termini di pagamento più favorevoli con fornitori chiave',
                    'Implementa sistema automatico solleciti e reminder',
                    'Attiva early payment discounts per accelerare incassi',
                    'Setup dashboard real-time per monitoraggio cash flow'
                ]
            });
        }
        
        // Supply chain intelligence recommendation
        recommendations.push({
            id: 'commercial-intelligence-1',
            priority: 'medium',
            category: 'intelligence',
            title: 'Advanced Supply Chain Intelligence',
            description: 'Implementa analytics predittive per ottimizzazione supplier performance e route profitability',
            expectedSavings: Math.round(cm.financial.totalCommercialValue * 0.05), // 5% optimization
            timeline: '4-6 mesi',
            effort: 'high',
            confidence: 0.78,
            actions: [
                'Configura supplier scoring automatico basato su performance',
                'Implementa route profitability analysis con real-time updates',
                'Attiva predictive analytics per demand forecasting',
                'Setup risk assessment automatico per supply chain disruptions'
            ]
        });
        
        return recommendations;
    }

    // ===== DATA VALIDATION RULES =====
    
    initializeValidationRules() {
        return {
            // Cross-field validation rules
            crossField: [
                {
                    name: 'pi_value_vs_po_value',
                    description: 'PI value should match PO value within 5%',
                    validator: (shipment) => {
                        const poValue = shipment.commercial?.purchaseOrder?.poValue;
                        const piValue = shipment.commercial?.proformaInvoice?.piValue;
                        
                        if (!poValue || !piValue) return true; // Skip if not both present
                        
                        const variance = Math.abs(poValue - piValue) / poValue;
                        return variance <= 0.05; // 5% tolerance
                    },
                    severity: 'warning'
                },
                
                {
                    name: 'cargo_weight_vs_cbm_ratio',
                    description: 'Weight to CBM ratio should be realistic',
                    validator: (shipment) => {
                        const weight = shipment.commercial?.cargo?.totalWeight;
                        const cbm = shipment.commercial?.cargo?.cbm;
                        
                        if (!weight || !cbm) return true;
                        
                        const ratio = weight / cbm; // kg per m³
                        return ratio >= 50 && ratio <= 1000; // Realistic range
                    },
                    severity: 'error'
                },
                
                {
                    name: 'container_capacity_check',
                    description: 'Cargo should fit in declared containers',
                    validator: (shipment) => {
                        if (shipment.type !== 'container') return true;
                        
                        const containers = shipment.commercial?.containers || [];
                        const totalCbm = shipment.commercial?.cargo?.cbm;
                        
                        if (!totalCbm || containers.length === 0) return true;
                        
                        const containerCapacity = containers.reduce((sum, container) => {
                            const capacity = this.getContainerCapacity(container.containerType);
                            return sum + capacity.cbm;
                        }, 0);
                        
                        return totalCbm <= containerCapacity * 1.1; // 10% tolerance
                    },
                    severity: 'error'
                }
            ],
            
            // Compliance validation rules
            compliance: [
                {
                    name: 'hs_code_format',
                    description: 'HS Code must be in correct format',
                    validator: (shipment) => {
                        const hsCode = shipment.commercial?.cargo?.commodityCode;
                        if (!hsCode) return true;
                        
                        return /^\d{4}\.\d{2}\.\d{2}$/.test(hsCode);
                    },
                    severity: 'error'
                },
                
                {
                    name: 'dangerous_goods_declaration',
                    description: 'Dangerous goods must have proper classification',
                    validator: (shipment) => {
                        const isDangerous = shipment.commercial?.cargo?.dangerousGoods;
                        const dgClass = shipment.commercial?.cargo?.dgClass;
                        
                        if (isDangerous && !dgClass) return false;
                        if (!isDangerous && dgClass) return false;
                        
                        return true;
                    },
                    severity: 'error'
                }
            ],
            
            // Business logic validation
            business: [
                {
                    name: 'incoterms_consistency',
                    description: 'Incoterms should be consistent with freight terms',
                    validator: (shipment) => {
                        const incoterms = shipment.commercial?.financial?.incoterms;
                        const freightTerms = shipment.commercial?.transportDocument?.freightTerms;
                        
                        if (!incoterms || !freightTerms) return true;
                        
                        // Basic consistency check
                        const prepaidIncoterms = ['CIF', 'CFR', 'CPT', 'CIP', 'DDP', 'DAP'];
                        const collectIncoterms = ['FOB', 'FCA', 'EXW'];
                        
                        if (prepaidIncoterms.includes(incoterms) && freightTerms === 'collect') return false;
                        if (collectIncoterms.includes(incoterms) && freightTerms === 'prepaid') return false;
                        
                        return true;
                    },
                    severity: 'warning'
                }
            ]
        };
    }
    
    validateShipment(shipment) {
        const results = {
            valid: true,
            errors: [],
            warnings: [],
            score: 100
        };
        
        // Run all validation rules
        ['crossField', 'compliance', 'business'].forEach(category => {
            this.validationRules[category].forEach(rule => {
                try {
                    const isValid = rule.validator(shipment);
                    
                    if (!isValid) {
                        const issue = {
                            rule: rule.name,
                            description: rule.description,
                            severity: rule.severity,
                            category
                        };
                        
                        if (rule.severity === 'error') {
                            results.errors.push(issue);
                            results.valid = false;
                            results.score -= 20;
                        } else {
                            results.warnings.push(issue);
                            results.score -= 5;
                        }
                    }
                } catch (error) {
                    console.error(`Validation rule ${rule.name} failed:`, error);
                }
            });
        });
        
        results.score = Math.max(0, results.score);
        
        return results;
    }

    // ===== UTILITY METHODS =====
    
    loadCommercialTemplates() {
        return {
            container: {
                name: 'Container Shipment',
                fields: ['purchaseOrder', 'proformaInvoice', 'commercialInvoice', 'transportDocument', 'cargo', 'containers', 'financial']
            },
            awb: {
                name: 'Air Waybill',
                fields: ['purchaseOrder', 'proformaInvoice', 'commercialInvoice', 'transportDocument', 'cargo', 'financial']
            },
            lcl: {
                name: 'LCL Shipment',
                fields: ['purchaseOrder', 'proformaInvoice', 'commercialInvoice', 'transportDocument', 'cargo', 'financial']
            }
        };
    }
    
    initializeDocumentWorkflows() {
        return {
            standard: {
                name: 'Standard Commercial Workflow',
                steps: [
                    { id: 'po', name: 'Purchase Order', required: false },
                    { id: 'pi', name: 'Proforma Invoice', required: false },
                    { id: 'ci', name: 'Commercial Invoice', required: true },
                    { id: 'bl', name: 'Bill of Lading', required: true }
                ]
            },
            express: {
                name: 'Express Workflow',
                steps: [
                    { id: 'ci', name: 'Commercial Invoice', required: true },
                    { id: 'bl', name: 'Bill of Lading', required: true }
                ]
            }
        };
    }
    
    getContainerCapacity(containerType) {
        const capacities = {
            '20GP': { cbm: 33.0, maxWeight: 28230 },
            '40GP': { cbm: 67.5, maxWeight: 28750 },
            '40HC': { cbm: 76.0, maxWeight: 28750 },
            '45HC': { cbm: 86.0, maxWeight: 29500 },
            '20RF': { cbm: 28.0, maxWeight: 27700 },
            '40RF': { cbm: 59.0, maxWeight: 27400 }
        };
        
        return capacities[containerType] || { cbm: 0, maxWeight: 0 };
    }
    
    async upgradeExistingShipments() {
        console.log('🔄 Upgrading existing shipments with commercial structure...');
        
        if (!window.shipmentsRegistry?.shipments) return;
        
        let upgraded = 0;
        
        window.shipmentsRegistry.shipments.forEach(shipment => {
            if (!shipment.commercial) {
                shipment.commercial = this.createDefaultCommercialStructure();
                shipment.metadata = shipment.metadata || this.createDefaultMetadata();
                upgraded++;
            }
        });
        
        if (upgraded > 0) {
            console.log(`✅ Upgraded ${upgraded} shipments with commercial structure`);
            
            // Save upgraded data
            if (window.shipmentsRegistry.saveShipments) {
                window.shipmentsRegistry.saveShipments();
            }
        }
    }
    
    createDefaultCommercialStructure() {
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
    
    createDefaultMetadata() {
        return {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: 'system',
            updatedBy: 'system',
            version: 1,
            dataSource: 'upgrade',
            validated: false,
            tags: [],
            notes: []
        };
    }

    // ===== METRIC CALCULATION METHODS =====
    
    calculateCompletionRate(shipments, documentType) {
        const total = shipments.length;
        const completed = shipments.filter(s => {
            const doc = s.commercial[documentType];
            return doc && Object.keys(doc).length > 0 && this.isDocumentComplete(doc, documentType);
        }).length;
        
        return total > 0 ? (completed / total) * 100 : 0;
    }
    
    isDocumentComplete(doc, type) {
        const requiredFields = {
            purchaseOrder: ['poNumber', 'poDate'],
            proformaInvoice: ['piNumber', 'piDate', 'piValue'],
            commercialInvoice: ['ciNumber', 'ciDate', 'ciValue'],
            transportDocument: ['blNumber', 'blDate']
        };
        
        const required = requiredFields[type] || [];
        return required.every(field => doc[field]);
    }
    
    calculateOverallCompletion(shipments) {
        const docTypes = ['purchaseOrder', 'proformaInvoice', 'commercialInvoice', 'transportDocument'];
        const totalCompletions = docTypes.reduce((sum, type) => sum + this.calculateCompletionRate(shipments, type), 0);
        return totalCompletions / docTypes.length;
    }
    
    calculateTotalCommercialValue(shipments) {
        return shipments.reduce((sum, s) => {
            return sum + (s.commercial?.financial?.totalValue || s.costs?.total || 0);
        }, 0);
    }
    
    calculateAverageShipmentValue(shipments) {
        const total = this.calculateTotalCommercialValue(shipments);
        return shipments.length > 0 ? total / shipments.length : 0;
    }
    
    calculatePaymentDelays(shipments) {
        const paidInvoices = shipments.filter(s => 
            s.commercial?.commercialInvoice?.paymentDate && s.commercial?.commercialInvoice?.dueDate
        );
        
        if (paidInvoices.length === 0) return 0;
        
        const totalDelays = paidInvoices.reduce((sum, s) => {
            const due = new Date(s.commercial.commercialInvoice.dueDate);
            const paid = new Date(s.commercial.commercialInvoice.paymentDate);
            const delay = Math.max(0, Math.floor((paid - due) / (1000 * 60 * 60 * 24)));
            return sum + delay;
        }, 0);
        
        return totalDelays / paidInvoices.length;
    }
    
    calculateCashFlow(shipments) {
        const now = new Date();
        const periods = ['current', 'next30', 'next60', 'next90'];
        
        return periods.reduce((flow, period) => {
            const [start, end] = this.getPeriodDates(period, now);
            
            flow[period] = shipments.reduce((sum, s) => {
                const dueDate = s.commercial?.commercialInvoice?.dueDate;
                if (!dueDate) return sum;
                
                const due = new Date(dueDate);
                if (due >= start && due < end) {
                    return sum + (s.commercial?.commercialInvoice?.ciValue || 0);
                }
                return sum;
            }, 0);
            
            return flow;
        }, {});
    }
    
    calculateProfitMargins(shipments) {
        const withMargins = shipments.filter(s => s.commercial?.financial?.profitMargin);
        
        if (withMargins.length === 0) return { average: 0, trend: 0 };
        
        const margins = withMargins.map(s => s.commercial.financial.profitMargin);
        const average = margins.reduce((sum, m) => sum + m, 0) / margins.length;
        
        // Calculate trend (simplified)
        const recent = margins.slice(-Math.ceil(margins.length / 3));
        const earlier = margins.slice(0, Math.floor(margins.length / 3));
        
        const recentAvg = recent.reduce((sum, m) => sum + m, 0) / recent.length;
        const earlierAvg = earlier.reduce((sum, m) => sum + m, 0) / earlier.length;
        
        const trend = recentAvg - earlierAvg;
        
        return { average, trend };
    }
    
    calculateCurrencyExposure(shipments) {
        const currencies = {};
        let totalValue = 0;
        
        shipments.forEach(s => {
            const currency = s.commercial?.financial?.currency || 'EUR';
            const value = s.commercial?.financial?.totalValue || 0;
            
            currencies[currency] = (currencies[currency] || 0) + value;
            totalValue += value;
        });
        
        const exposure = {};
        Object.keys(currencies).forEach(currency => {
            exposure[currency] = totalValue > 0 ? (currencies[currency] / totalValue) * 100 : 0;
        });
        
        return exposure;
    }
    
    // Placeholder methods for remaining calculations
    calculateDocumentsPerShipment() { return 3.5; }
    calculateProcessingTime() { return 2.3; }
    calculateErrorRate() { return 5.2; }
    calculateAutomationRate() { return 45; }
    calculateComplianceScore() { return 87; }
    calculateSupplierPerformance() { return { average: 82, top: 'Supplier A', worst: 'Supplier C' }; }
    calculateRouteProfitability() { return { bestRoute: 'SHA-GOA', worstRoute: 'HKG-MXP' }; }
    calculateSeasonalityImpact() { return { peak: 'Q4', low: 'Q2', variance: 25 }; }
    calculateRiskExposure() { return { level: 'medium', score: 65 }; }
    calculateWeightUtilization() { return 78; }
    calculateVolumeUtilization() { return 82; }
    calculatePackagingEfficiency() { return 88; }
    calculateCargoValueDensity() { return 1250; }
    
    getDefaultCommercialMetrics() {
        return {
            documentCompletion: { overall: 0, poCompletion: 0, piCompletion: 0, ciCompletion: 0, blCompletion: 0 },
            financial: { totalCommercialValue: 0, averageShipmentValue: 0, paymentDelays: 0, cashFlow: {}, profitMargins: { average: 0, trend: 0 }, currencyExposure: {} },
            operational: { documentsPerShipment: 0, processingTime: 0, errorRate: 0, automationRate: 0, complianceScore: 0 },
            supplyChain: { supplierPerformance: {}, routeProfitability: {}, seasonalityImpact: {}, riskExposure: {} },
            cargo: { weightUtilization: 0, volumeUtilization: 0, packagingEfficiency: 0, cargoValueDensity: 0 }
        };
    }
    
    getPeriodDates(period, baseDate) {
        const start = new Date(baseDate);
        const end = new Date(baseDate);
        
        switch (period) {
            case 'current':
                start.setDate(1);
                end.setMonth(end.getMonth() + 1, 0);
                break;
            case 'next30':
                end.setDate(end.getDate() + 30);
                break;
            case 'next60':
                start.setDate(start.getDate() + 30);
                end.setDate(end.getDate() + 60);
                break;
            case 'next90':
                start.setDate(start.getDate() + 60);
                end.setDate(end.getDate() + 90);
                break;
        }
        
        return [start, end];
    }
}

// Expose global EnhancedCommercialModel
window.EnhancedCommercialModel = EnhancedCommercialModel;

// Initialize Enhanced Commercial Model
document.addEventListener('DOMContentLoaded', () => {
    window.enhancedCommercialModel = new EnhancedCommercialModel();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnhancedCommercialModel;
}

console.log('[EnhancedCommercialModel] Enhanced Commercial Data Model V15.0 loaded');