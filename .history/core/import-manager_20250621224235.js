// import-manager.js - VERSIONE CON GESTIONE AWB ID
(function() {
    'use strict';
    
    console.log('🔧 Loading COMPLETE Import Manager - WITH AWB ID SUPPORT');
    
    const CONFIG = {
        supportedFormats: ['.csv', '.xls', '.xlsx'],
        maxFileSize: 10 * 1024 * 1024,
        batchSize: 25,
        delayBetweenBatches: 500,
        maxErrors: 50,
        enableEnrichment: true,
        enrichmentTimeout: 30000,
        fallbackOnError: true,
        progressUpdateInterval: 100,
        strictValidation: false,
        autoCorrectData: true,
        fetchAWBIds: true // Nuovo flag per recuperare gli ID AWB
    };
    
    // ===== STATUS MAPPING PERFETTO - FISSO IL PROBLEMA DELIVERED =====
    const STATUS_MAPPING = {
        // In Transit
        'Sailing': 'in_transit',
        'In Transit': 'in_transit',
        'In transito': 'in_transit',
        'Loading': 'in_transit',
        'Loaded': 'in_transit',
        'Gate In': 'in_transit',
        'Transhipment': 'in_transit',
        
        // Arrived/Discharged
        'Arrived': 'arrived',
        'Arrivata': 'arrived', 
        'Discharged': 'arrived',  // ===== FIX: Discharged → arrived, non delivered =====
        'Scaricato': 'arrived',
        'Discharging': 'arrived',
        
        // Out for Delivery
        'On FedEx vehicle for delivery': 'out_for_delivery',
        'In consegna': 'out_for_delivery',
        'Gate Out': 'out_for_delivery',
        
        // Delivered (solo per stati veramente finali)
        'Delivered': 'delivered',  // ===== OK: Delivered → delivered =====
        'Consegnato': 'delivered',
        'Empty': 'delivered',
        'Empty Returned': 'delivered',
        'POD': 'delivered',
        
        // Customs
        'International shipment release - Import': 'customs_cleared',
        'Sdoganata': 'customs_cleared',
        'Customs Cleared': 'customs_cleared',
        
        // Registered
        'Shipment information sent to FedEx': 'registered',
        'Registered': 'registered',
        'Pending': 'registered',
        'Booked': 'registered',
        'Booking Confirmed': 'registered',
        
        // Delayed/Exception
        'Delayed': 'delayed',
        'Exception': 'exception'
    };
    
    const CARRIER_MAPPING = {
        'MAERSK LINE': 'MAERSK',
        'MAERSK': 'MAERSK',
        'MSC': 'MSC',
        'COSCO': 'COSCO',
        'CMA CGM': 'CMA-CGM',
        'HAPAG-LLOYD': 'HAPAG-LLOYD',
        'ONE': 'ONE',
        'EVERGREEN': 'EVERGREEN',
        'YANG MING': 'YANG-MING',
        'ZIM': 'ZIM',
        'HMM': 'HMM',
        'CARGOLUX': 'CV',
        'CATHAY PACIFIC': 'CX',
        'AIR FRANCE KLM': 'AF',
        'LUFTHANSA CARGO': 'LH',
        'EMIRATES': 'EK',
        'QATAR AIRWAYS': 'QR',
        'TURKISH CARGO': 'TK',
        'FEDEX': 'FEDEX',
        'DHL': 'DHL',
        'UPS': 'UPS'
    };
    
    class CompleteImportManager {
        constructor() {
            this.stats = this.initializeStats();
            this.progressCallback = null;
            this.trackingService = null;
            this.initialized = false;
            this.currentProgressModal = null;
            this.modalLock = false;
            this.awbIdMap = new Map(); // Cache locale per AWB -> ID mapping
        }
        
        async initialize() {
            if (this.initialized) return true;
            
            try {
                await this.waitForModalSystem();
                
                if (window.trackingService) {
                    this.trackingService = window.trackingService;
                    if (this.trackingService && typeof this.trackingService.initialize === 'function') {
                        await this.trackingService.initialize();
                        console.log('[CompleteImportManager] 🚀 Tracking Service integrated');
                    } else {
                        console.warn('[CompleteImportManager] ⚠️ Tracking Service not available or not initialized');
                        CONFIG.enableEnrichment = false;
                    }
                } else {
                    console.warn('[CompleteImportManager] ⚠️ Tracking Service non disponibile');
                    CONFIG.enableEnrichment = false;
                }
                
                this.initialized = true;
                return true;
            } catch (error) {
                console.error('[CompleteImportManager] ❌ Initialization failed:', error);
                CONFIG.enableEnrichment = false;
                return false;
            }
        }
        
        initializeStats() {
            return {
                total: 0,
                processed: 0,
                imported: 0,
                updated: 0,
                enriched: 0,
                enrichmentFailed: 0,
                skipped: 0,
                errors: [],
                warnings: [],
                startTime: null,
                endTime: null,
                processingTime: 0,
                awbsWithIds: 0,
                awbsWithoutIds: 0
            };
        }
        
        // ===== MODAL SYSTEM INTEGRATION PERFETTA =====
        
        async waitForModalSystem() {
            let attempts = 0;
            while (!window.ModalSystem && attempts < 50) {
                await this.delay(100);
                attempts++;
            }
            
            if (!window.ModalSystem) {
                console.warn('[CompleteImportManager] ⚠️ ModalSystem not available after waiting');
                return false;
            }
            
            await this.delay(300);
            return true;
        }
        
        async acquireModalLock() {
            let attempts = 0;
            while (this.modalLock && attempts < 50) {
                await this.delay(100);
                attempts++;
            }
            
            if (this.modalLock) {
                throw new Error('Could not acquire modal lock - another import in progress');
            }
            
            this.modalLock = true;
            console.log('[CompleteImportManager] 🔒 Modal lock acquired');
        }
        
        releaseModalLock() {
            this.modalLock = false;
            console.log('[CompleteImportManager] 🔓 Modal lock released');
        }
        
        async createProgressModal() {
            if (!window.ModalSystem || !window.ModalSystem.progress) {
                console.warn('[CompleteImportManager] ⚠️ ModalSystem.progress not available');
                return this.createFallbackProgress();
            }
            
            try {
                const existingProgressModals = document.querySelectorAll('[id^="modal-progress-"]');
                existingProgressModals.forEach(modal => modal.remove());
                
                const modal = window.ModalSystem.progress({
                    title: 'Import in corso',
                    message: 'Inizializzazione...',
                    showPercentage: true,
                    closable: false
                });
                
                console.log('[CompleteImportManager] ✅ Progress modal created successfully');
                return modal;
            } catch (error) {
                console.error('[CompleteImportManager] ❌ Error creating progress modal:', error);
                return this.createFallbackProgress();
            }
        }
        
        createFallbackProgress() {
            return {
                update: (progress, message) => {
                    console.log(`[Progress] ${progress}% - ${message}`);
                    if (window.NotificationSystem) {
                        window.NotificationSystem.info(`${message} (${progress}%)`, { duration: 1000 });
                    }
                },
                close: () => {
                    console.log('[Progress] Closed');
                },
                setStats: (stats) => {
                    console.log('[Progress] Stats:', stats);
                }
            };
        }
        
        async closeProgressModal() {
            if (this.currentProgressModal && this.currentProgressModal.close) {
                try {
                    this.currentProgressModal.close();
                    this.currentProgressModal = null;
                    console.log('[CompleteImportManager] ✅ Progress modal closed cleanly');
                } catch (error) {
                    console.error('[CompleteImportManager] ❌ Error closing progress modal:', error);
                }
            }
            
            await this.delay(100);
            const orphanModals = document.querySelectorAll('[id^="modal-progress-"], .sol-modal-overlay');
            orphanModals.forEach(modal => {
                if (modal.parentNode) {
                    modal.remove();
                }
            });
        }
        
        // ===== MAIN IMPORT METHOD WITH PERFECT STATUS MAPPING =====
        
        async importFile(file, options = {}) {
            await this.initialize();
            
            console.log('[CompleteImportManager] 🔄 Starting COMPLETE import:', file.name);
            
            if (!this.validateFile(file)) {
                throw new Error('Formato file non supportato o file troppo grande');
            }
            
            await this.acquireModalLock();
            
            this.stats = this.initializeStats();
            this.stats.startTime = Date.now();
            
            try {
                const modalReady = await this.waitForModalSystem();
                if (!modalReady) {
                    throw new Error('Modal system not available');
                }
                
                const progressModal = await this.createProgressModal();
                this.currentProgressModal = progressModal;
                
                progressModal.update(5, 'Analisi file...');
                await this.delay(200);
                const rawData = await this.parseFile(file);
                
                progressModal.update(15, 'Normalizzazione dati...');
                await this.delay(200);
                const normalizedData = await this.normalizeImportData(rawData, progressModal);
                
                progressModal.update(25, 'Validazione dati...');
                await this.delay(200);
                const validationResult = await this.validateImportData(normalizedData);
                
                if (validationResult.needsConfirm && !options.skipConfirm) {
                    await this.closeProgressModal();
                    await this.delay(300);
                    
                    const proceed = await this.showValidationDialog(validationResult);
                    if (!proceed) {
                        this.releaseModalLock();
                        return { cancelled: true };
                    }
                    
                    await this.delay(200);
                    this.currentProgressModal = await this.createProgressModal();
                    this.currentProgressModal.update(25, 'Ripresa import...');
                }
                
                const importResult = await this.processImport(normalizedData, this.currentProgressModal, options);
                
                this.stats.endTime = Date.now();
                this.stats.processingTime = this.stats.endTime - this.stats.startTime;
                
                await this.closeProgressModal();
                await this.delay(300);
                await this.showResults(importResult);
                
                this.releaseModalLock();
                return importResult;
                
            } catch (error) {
                await this.closeProgressModal();
                this.releaseModalLock();
                
                console.error('[CompleteImportManager] ❌ Import error:', error);
                
                await this.delay(200);
                if (window.ModalSystem?.alert) {
                    await window.ModalSystem.alert({
                        type: 'error',
                        title: 'Errore Import',
                        message: error.message
                    });
                }
                throw error;
            }
        }
        
        // ===== SHIPSGO PROCESSING CON STATUS MAPPING E AWB ID =====
        
        async processShipsGoData(data, type) {
            console.log('[CompleteImportManager] 🚀 Processing ShipsGo data:', type, data.length);
            
            await this.acquireModalLock();
            
            try {
                await this.waitForModalSystem();
                
                const progressModal = await this.createProgressModal();
                this.currentProgressModal = progressModal;
                
                progressModal.update(10, 'Inizializzazione ShipsGo import...');
                await this.delay(300);
                
                // Se stiamo importando AWB, prima recupera la lista per avere gli ID
                if (type === 'air' && CONFIG.fetchAWBIds && this.trackingService) {
                    progressModal.update(15, 'Recupero ID AWB da ShipsGo...');
                    await this.fetchAWBIds();
                }
                
                const trackings = [];
                const stats = {
                    imported: 0,
                    updated: 0,
                    skipped: 0,
                    errors: 0,
                    statusMapping: {}, // Track status mapping results
                    awbsWithIds: 0,
                    awbsWithoutIds: 0
                };
                
                const batchSize = 5;
                const totalBatches = Math.ceil(data.length / batchSize);
                
                for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
                    const startIdx = batchIndex * batchSize;
                    const endIdx = Math.min(startIdx + batchSize, data.length);
                    const batch = data.slice(startIdx, endIdx);
                    
                    const batchProgress = 15 + ((batchIndex + 1) / totalBatches) * 75;
                    progressModal.update(batchProgress, `Elaborazione batch ${batchIndex + 1}/${totalBatches}...`);
                    
                    for (let i = 0; i < batch.length; i++) {
                        const row = batch[i];
                        
                        try {
                            let tracking = this.mapShipsGoRow(row, type);
                            
                            if (tracking && tracking.tracking_number) {
                                // ===== APPLICA STATUS MAPPING =====
                                const originalStatus = row['Status'] || row['status'];
                                const mappedStatus = this.mapStatus(originalStatus);
                                tracking.status = mappedStatus;
                                
                                // Track status mapping per debugging
                                if (!stats.statusMapping[originalStatus]) {
                                    stats.statusMapping[originalStatus] = mappedStatus;
                                }
                                
                                // Se è un AWB, cerca di assegnare l'ID ShipsGo
                                if (type === 'air' && tracking.tracking_type === 'awb') {
                                    const shipsgoId = this.awbIdMap.get(tracking.tracking_number.toUpperCase());
                                    if (shipsgoId) {
                                        tracking.metadata.shipsgo_id = shipsgoId;
                                        stats.awbsWithIds++;
                                        console.log(`[CompleteImportManager] 🆔 AWB ${tracking.tracking_number} → ID ${shipsgoId}`);
                                    } else {
                                        stats.awbsWithoutIds++;
                                        console.log(`[CompleteImportManager] ⚠️ No ID found for AWB ${tracking.tracking_number}`);
                                    }
                                }
                                
                                trackings.push(tracking);
                                stats.imported++;
                            } else {
                                stats.skipped++;
                            }
                            
                        } catch (error) {
                            console.error('[CompleteImportManager] ❌ Error processing row:', error);
                            stats.errors++;
                        }
                        
                        await this.delay(50);
                    }
                    
                    progressModal.setStats({
                        'Totale': data.length,
                        'Elaborati': endIdx,
                        'Importati': stats.imported,
                        'Saltati': stats.skipped,
                        'Errori': stats.errors,
                        'AWB con ID': stats.awbsWithIds,
                        'AWB senza ID': stats.awbsWithoutIds
                    });
                    
                    await this.delay(150);
                }
                
                progressModal.update(100, `Completato! ${stats.imported} tracking importati`);
                await this.delay(800);
                
                // Log status mapping results
                console.log('[CompleteImportManager] 📊 Status Mapping Results:', stats.statusMapping);
                console.log('[CompleteImportManager] 🆔 AWB ID Stats:', {
                    withIds: stats.awbsWithIds,
                    withoutIds: stats.awbsWithoutIds
                });
                
                await this.closeProgressModal();
                this.releaseModalLock();
                
                if (window.NotificationSystem) {
                    window.NotificationSystem.success(
                        `Import ShipsGo completato: ${stats.imported} tracking importati`,
                        {
                            subtitle: `Errori: ${stats.errors}, Saltati: ${stats.skipped}${type === 'air' ? `, AWB con ID: ${stats.awbsWithIds}` : ''}`,
                            duration: 5000
                        }
                    );
                }
                
                window.dispatchEvent(new CustomEvent('trackingsUpdated', {
                    detail: { 
                        trackings, 
                        source: 'shipsgo_import',
                        stats 
                    }
                }));
                
                console.log('[CompleteImportManager] ✅ ShipsGo processing completed successfully');
                
                return { trackings, stats };
                
            } catch (error) {
                await this.closeProgressModal();
                this.releaseModalLock();
                throw error;
            }
        }
        
        // ===== NUOVO METODO PER RECUPERARE GLI ID AWB =====
        
        async fetchAWBIds() {
            if (!this.trackingService || !this.trackingService.getAirShipmentsList) {
                console.warn('[CompleteImportManager] ⚠️ Cannot fetch AWB IDs - tracking service not available');
                return;
            }
            
            try {
                console.log('[CompleteImportManager] 🔍 Fetching AWB IDs from ShipsGo...');
                
                const awbList = await this.trackingService.getAirShipmentsList();
                
                if (Array.isArray(awbList)) {
                    awbList.forEach(awb => {
                        const awbNumber = (awb.awb_number || awb.awbNumber || '').toUpperCase();
                        const id = awb.id;
                        
                        if (awbNumber && id) {
                            this.awbIdMap.set(awbNumber, id);
                        }
                    });
                    
                    console.log(`[CompleteImportManager] ✅ Loaded ${this.awbIdMap.size} AWB IDs from ShipsGo`);
                    
                    // Sync con la cache del tracking service
                    if (this.trackingService.getAWBIdCache) {
                        const serviceCache = this.trackingService.getAWBIdCache();
                        serviceCache.forEach((id, awb) => {
                            if (!this.awbIdMap.has(awb)) {
                                this.awbIdMap.set(awb, id);
                            }
                        });
                    }
                }
            } catch (error) {
                console.error('[CompleteImportManager] ❌ Error fetching AWB IDs:', error);
            }
        }
        
        // ===== STATUS MAPPING METHOD - FIX APPLICATO =====
        
        mapStatus(originalStatus) {
            if (!originalStatus) return 'registered';
            
            const mapped = STATUS_MAPPING[originalStatus] || 'registered';
            
            console.log(`[StatusMapping] "${originalStatus}" → "${mapped}"`);
            
            return mapped;
        }
        
        // ===== SHIPSGO ROW MAPPING WITH PERFECT STATUS E AWB ID =====
        
        mapShipsGoRow(row, type) {
            if (type === 'air') {
                const awbNumber = row['AWB Number'] || row['awb_number'] || '';
                const shipsgoId = row['id'] || row['Id'] || row['ID'] || null;
                
                return {
                    id: Date.now() + Math.random(),
                    tracking_number: awbNumber,
                    tracking_type: 'awb',
                    carrier_code: row['Airline'] || row['airline'] || '',
                    origin_port: row['Origin'] || row['origin'] || '',
                    origin_name: row['Origin Name'] || row['origin_name'] || '',
                    destination_port: row['Destination'] || row['destination'] || '',
                    destination_name: row['Destination Name'] || row['destination_name'] || '',
                    departure_date: this.parseDate(row['Date Of Departure'] || row['date_of_departure']),
                    eta: this.parseDate(row['Date Of Arrival'] || row['date_of_arrival']),
                    transit_time: row['Transit Time'] || row['transit_time'] || '',
                    t5_count: row['T5 Count'] || row['t5_count'] || '',
                    status: this.mapStatus(row['Status'] || row['status']), // ===== FIX APPLICATO =====
                    created_at: new Date().toISOString(),
                    data_source: 'shipsgo_air_import',
                    metadata: {
                        ...row,
                        import_type: 'shipsgo_air',
                        import_timestamp: new Date().toISOString(),
                        original_status: row['Status'] || row['status'], // Mantieni originale per debug
                        mapped_status: this.mapStatus(row['Status'] || row['status']),
                        shipsgo_id: shipsgoId, // Salva l'ID se presente nel file
                        awb_number: awbNumber // Salva anche il numero AWB
                    }
                };
            } else if (type === 'sea') {
                return {
                    id: Date.now() + Math.random(),
                    tracking_number: row['Container'] || row['container'] || row['Reference'] || row['reference'] || '',
                    tracking_type: row['Container'] ? 'container' : 'reference',
                    carrier_code: row['Carrier'] || row['carrier'] || '',
                    origin_port: row['Port Of Loading'] || row['port_of_loading'] || '',
                    destination_port: row['Port Of Discharge'] || row['port_of_discharge'] || '',
                    departure_date: this.parseDate(row['Date Of Loading'] || row['date_of_loading']),
                    eta: this.parseDate(row['Date Of Discharge'] || row['date_of_discharge']),
                    booking: row['Booking'] || row['booking'] || '',
                    container_count: row['Container Count'] || row['container_count'] || '',
                    status: this.mapStatus(row['Status'] || row['status']), // ===== FIX APPLICATO =====
                    created_at: new Date().toISOString(),
                    data_source: 'shipsgo_sea_import',
                    metadata: {
                        ...row,
                        import_type: 'shipsgo_sea',
                        import_timestamp: new Date().toISOString(),
                        original_status: row['Status'] || row['status'], // Mantieni originale per debug
                        mapped_status: this.mapStatus(row['Status'] || row['status'])
                    }
                };
            }
            
            return null;
        }
        
        parseDate(dateStr) {
            if (!dateStr) return null;
            
            if (typeof dateStr === 'string' && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
                return dateStr;
            }
            
            try {
                const d = new Date(dateStr);
                if (!isNaN(d.getTime())) {
                    return d.toLocaleDateString('it-IT');
                }
            } catch (e) {}
            
            return dateStr || '-';
        }
        
        // ===== FILE PARSING METHODS =====
        
        async parseFile(file) {
            const extension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0];
            
            switch (extension) {
                case '.csv':
                    return await this.parseCSV(file);
                case '.xlsx':
                case '.xls':
                    return await this.parseExcel(file);
                default:
                    throw new Error('Formato file non supportato');
            }
        }
        
        async parseCSV(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                
                reader.onload = (e) => {
                    try {
                        if (window.Papa) {
                            const result = Papa.parse(e.target.result, {
                                header: true,
                                dynamicTyping: true,
                                skipEmptyLines: true,
                                delimitersToGuess: [',', ';', '\t', '|'],
                                transformHeader: (header) => header.trim()
                            });
                            
                            if (result.errors.length > 0) {
                                console.warn('[CompleteImportManager] CSV parsing warnings:', result.errors);
                            }
                            
                            resolve(result.data);
                        } else {
                            throw new Error('PapaParse not available');
                        }
                    } catch (error) {
                        reject(new Error(`Errore parsing CSV: ${error.message}`));
                    }
                };
                
                reader.onerror = () => reject(new Error('Errore lettura file'));
                reader.readAsText(file, 'UTF-8');
            });
        }
        
        async parseExcel(file) {
            return new Promise(async (resolve, reject) => {
                try {
                    if (!window.XLSX) {
                        await this.loadSheetJS();
                    }
                    
                    const reader = new FileReader();
                    
                    reader.onload = (e) => {
                        try {
                            const fileData = new Uint8Array(e.target.result);
                            const workbook = XLSX.read(fileData, { 
                                type: 'array',
                                cellDates: true,
                                cellNF: true,
                                cellText: false
                            });
                            
                            const firstSheetName = workbook.SheetNames[0];
                            const worksheet = workbook.Sheets[firstSheetName];
                            
                            const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                                header: 1,
                                defval: '',
                                blankrows: false,
                                raw: false
                            });
                            
                            if (jsonData.length < 2) {
                                throw new Error('File Excel vuoto o senza dati');
                            }
                            
                            const headers = jsonData[0].map(h => String(h).trim());
                            const excelData = [];
                            
                            for (let i = 1; i < jsonData.length; i++) {
                                const row = {};
                                headers.forEach((header, index) => {
                                    const value = jsonData[i][index];
                                    row[header] = value !== undefined && value !== null ? 
                                        String(value).trim() : '';
                                });
                                
                                if (Object.values(row).some(v => v !== '')) {
                                    excelData.push(row);
                                }
                            }
                            
                            resolve(excelData);
                            
                        } catch (error) {
                            reject(new Error(`Errore parsing Excel: ${error.message}`));
                        }
                    };
                    
                    reader.onerror = () => reject(new Error('Errore lettura file Excel'));
                    reader.readAsArrayBuffer(file);
                    
                } catch (error) {
                    reject(error);
                }
            });
        }
        
        async loadSheetJS() {
            return new Promise((resolve, reject) => {
                if (typeof XLSX !== 'undefined') {
                    resolve();
                    return;
                }
                
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
                script.onload = () => {
                    console.log('[CompleteImportManager] 📚 SheetJS loaded');
                    resolve();
                };
                script.onerror = () => reject(new Error('Impossibile caricare SheetJS'));
                document.head.appendChild(script);
            });
        }
        
        // ===== SIMPLIFIED PROCESSING METHODS CON AWB ID SUPPORT =====
        
        async normalizeImportData(rawData, progressModal) {
            // Prima recupera gli ID AWB se necessario
            const hasAWBs = rawData.some(row => 
                row['AWB Number'] || row['awb_number'] || 
                row.tracking_type === 'awb'
            );
            
            if (hasAWBs && CONFIG.fetchAWBIds && this.trackingService) {
                progressModal.update(20, 'Recupero ID AWB da ShipsGo...');
                await this.fetchAWBIds();
            }
            
            const normalized = rawData.map(row => {
                const trackingNumber = (row.tracking_number || row.Container || row['AWB Number'] || '').toString().trim();
                const trackingType = this.detectTrackingType(row);
                
                const normalizedItem = {
                    tracking_number: trackingNumber,
                    tracking_type: trackingType,
                    carrier_code: (row.carrier_code || row.Carrier || row.Airline || '').toString().trim(),
                    status: this.mapStatus(row['Status'] || row['status']), // ===== FIX APPLICATO =====
                    metadata: { ...row }
                };
                
                // Se è un AWB, cerca di aggiungere l'ID ShipsGo
                if (trackingType === 'awb' && trackingNumber) {
                    const shipsgoId = this.awbIdMap.get(trackingNumber.toUpperCase());
                    if (shipsgoId) {
                        normalizedItem.metadata.shipsgo_id = shipsgoId;
                        console.log(`[CompleteImportManager] 🆔 Normalized AWB ${trackingNumber} with ID ${shipsgoId}`);
                    }
                }
                
                return normalizedItem;
            }).filter(item => item.tracking_number);
            
            return { normalizedData: normalized, format: 'generic', warnings: [] };
        }
        
        detectTrackingType(row) {
            if (row['AWB Number'] || row['Airline']) return 'awb';
            if (row['Container'] || row['Port Of Loading']) return 'container';
            return 'container';
        }
        
        async validateImportData(normalizedResult) {
            return {
                valid: normalizedResult.normalizedData.length,
                invalid: 0,
                duplicates: 0,
                warnings: [],
                errors: [],
                needsConfirm: false
            };
        }
        
        async processImport(normalizedResult, progressModal, options = {}) {
            const { normalizedData } = normalizedResult;
            
            // Prima di salvare ogni tracking
            const processedData = normalizedData.map(tracking => {
                // Assicurati che trackingNumber sia presente
                if (!tracking.tracking_number || tracking.tracking_number === '-') {
                    console.warn('Skipping tracking without number:', tracking);
                    return null;
                }
                
                // Converti carrier a stringa se necessario
                if (tracking.carrier && typeof tracking.carrier === 'object') {
                    tracking.carrier = tracking.carrier.code || tracking.carrier.name || '-';
                }
                
                // Se è un AWB e ha un ID ShipsGo nei metadata, assicurati che sia salvato
                if (tracking.tracking_type === 'awb' && tracking.metadata?.shipsgo_id) {
                    // Enrich con tracking service se disponibile
                    if (this.trackingService && this.trackingService.enrichTrackingWithShipsGoId) {
                        this.trackingService.enrichTrackingWithShipsGoId(tracking);
                    }
                }
                
                return tracking;
            }).filter(Boolean); // Rimuovi i null

            progressModal.update(90, 'Finalizzazione import...');
            await this.delay(500);
            
            const results = {
                imported: processedData.length,
                updated: 0,
                skipped: 0,
                errors: [],
                trackings: processedData,
                awbsWithIds: processedData.filter(t => 
                    t.tracking_type === 'awb' && t.metadata?.shipsgo_id
                ).length
            };
            
            this.saveTrackings(processedData);
            
            return {
                success: true,
                stats: results,
                trackings: processedData
            };
        }
        
        saveTrackings(trackings) {
            try {
                const existing = JSON.parse(localStorage.getItem('trackings') || '[]');
                const combined = [...existing, ...trackings];
                localStorage.setItem('trackings', JSON.stringify(combined));
                
                window.dispatchEvent(new CustomEvent('trackingsUpdated', {
                    detail: { trackings: combined, source: 'import' }
                }));
                
                console.log('[CompleteImportManager] 💾 Saved', trackings.length, 'trackings');
                
                // Log AWB con ID
                const awbsWithIds = trackings.filter(t => 
                    t.tracking_type === 'awb' && t.metadata?.shipsgo_id
                );
                if (awbsWithIds.length > 0) {
                    console.log(`[CompleteImportManager] 🆔 Saved ${awbsWithIds.length} AWBs with ShipsGo IDs`);
                }
            } catch (error) {
                console.error('[CompleteImportManager] ❌ Error saving trackings:', error);
            }
        }
        
        // ===== MODAL DIALOG METHODS =====
        
        async showValidationDialog(validationResult) {
            if (!window.ModalSystem || !window.ModalSystem.confirm) {
                return true;
            }
            
            try {
                return await window.ModalSystem.confirm({
                    title: '⚠️ Risultati Validazione',
                    message: `Trovati ${validationResult.valid} record validi. Continuare con l'import?`,
                    confirmText: 'Continua Import',
                    confirmClass: 'sol-btn-primary'
                });
            } catch (error) {
                console.error('[CompleteImportManager] Error showing validation dialog:', error);
                return true;
            }
        }
        
        async showResults(results) {
            const { stats } = results;
            
            if (!window.ModalSystem || !window.ModalSystem.alert) {
                console.log('[CompleteImportManager] Results:', stats);
                return;
            }
            
            try {
                let message = `Import completato con successo!<br><br><strong>${stats.imported}</strong> tracking importati<br>Errori: ${stats.errors?.length || 0}`;
                
                if (stats.awbsWithIds > 0) {
                    message += `<br>AWB con ID ShipsGo: ${stats.awbsWithIds}`;
                }
                
                await window.ModalSystem.alert({
                    type: 'success',
                    title: '✅ Import Completato',
                    message: message
                });
            } catch (error) {
                console.error('[CompleteImportManager] Error showing results:', error);
            }
        }
        
        // ===== UTILITY METHODS =====
        
        validateFile(file) {
            const extension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0];
            const sizeOk = file.size <= CONFIG.maxFileSize;
            const formatOk = CONFIG.supportedFormats.includes(extension);
            
            return sizeOk && formatOk;
        }
        
        async delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
        
        downloadTemplate(type = 'enhanced') {
            const template = `tracking_number,carrier_code,tracking_type,reference,status,origin_port,destination_port,shipsgo_id
MRKU1234567,MAERSK,container,PO123456,In Transit,SHANGHAI,GENOVA,
176-12345678,CV,awb,AWB789012,In Transit,HKG,MXP,24786`;
            
            const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'tracking_template_with_ids.csv';
            link.click();
            URL.revokeObjectURL(link.href);
        }
    }
    
    // ===== INITIALIZATION =====
    const completeImportManager = new CompleteImportManager();
    
    // Global exposure
    window.ImportManager = {
        importFile: (file, options) => completeImportManager.importFile(file, options),
        setConfig: (newConfig) => Object.assign(CONFIG, newConfig),
        getConfig: () => ({ ...CONFIG }),
        validateFile: (file) => completeImportManager.validateFile(file),
        getStats: () => completeImportManager.stats,
        parseFile: (file) => completeImportManager.parseFile(file),
        downloadTemplate: (type) => completeImportManager.downloadTemplate(type),
        processShipsGoData: (data, type) => completeImportManager.processShipsGoData(data, type),
        mapStatus: (status) => completeImportManager.mapStatus(status), // Expose per debugging
        STATUS_MAPPING: STATUS_MAPPING, // Expose mapping per debugging
        getAWBIdMap: () => new Map(completeImportManager.awbIdMap), // Expose AWB ID map
        fetchAWBIds: () => completeImportManager.fetchAWBIds() // Expose per refresh manuale
    };
    
    document.addEventListener('DOMContentLoaded', async () => {
        console.log('[CompleteImportManager] 🚀 COMPLETE Import Manager loaded - With AWB ID Support!');
        
        // Wait for dependencies
        let attempts = 0;
        const checkInterval = setInterval(async () => {
            attempts++;
            
            if ((window.trackingService || attempts > 50) && window.ModalSystem) {
                clearInterval(checkInterval);
                await completeImportManager.initialize();
                console.log('[CompleteImportManager] ✅ COMPLETE Import Manager initialized with AWB ID management!');
            }
        }, 100);
    });
    
    console.log('🎯 COMPLETE Import Manager loaded - AWB ID Integration Ready');
    
})();