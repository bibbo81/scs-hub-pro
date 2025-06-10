// import-manager.js - Sistema unificato per gestione import
(function() {
    'use strict';
    
    window.ImportManager = {
        // Configurazione
        config: {
            batchSize: 50,
            delayBetweenBatches: 500,
            maxErrors: 10,
            supportedFormats: ['.csv', '.xlsx', '.xls']
        },
        
        // Mappature standard
        mappings: {
            carriers: {
                // Maersk variants
                'MAERSK': 'MAERSK',
                'MAERSK LINE': 'MAERSK',
                'MAERSK SEALAND': 'MAERSK',
                // MSC variants
                'MSC': 'MSC',
                'MEDITERRANEAN SHIPPING': 'MSC',
                'MEDITERRANEAN SHIPPING COMPANY': 'MSC',
                // CMA CGM variants
                'CMA CGM': 'CMA-CGM',
                'CMA-CGM': 'CMA-CGM',
                // COSCO variants
                'COSCO': 'COSCO',
                'COSCO SHIPPING': 'COSCO',
                'COSCO SHIPPING LINES': 'COSCO',
                // Hapag-Lloyd variants
                'HAPAG-LLOYD': 'HAPAG-LLOYD',
                'HAPAG LLOYD': 'HAPAG-LLOYD',
                // ONE variants
                'ONE': 'ONE',
                'OCEAN NETWORK EXPRESS': 'ONE',
                // Evergreen variants
                'EVERGREEN': 'EVERGREEN',
                'EVERGREEN LINE': 'EVERGREEN',
                'EVERGREEN MARINE': 'EVERGREEN',
                // Yang Ming variants
                'YANG MING': 'YANG-MING',
                'YANG MING LINE': 'YANG-MING',
                'YANG MING MARINE': 'YANG-MING',
                // Others
                'ZIM': 'ZIM',
                'ZIM LINE': 'ZIM',
                'HMM': 'HMM',
                'HYUNDAI': 'HMM',
                'HYUNDAI MERCHANT MARINE': 'HMM',
                // Air carriers
                'CARGOLUX': 'CV',
                'CV': 'CV',
                'FEDEX': 'FX',
                'FX': 'FX',
                'DHL': 'DHL',
                'UPS': 'UPS',
                'EMIRATES': 'EK',
                'QATAR': 'QR',
                'LUFTHANSA': 'LH',
                'AIR FRANCE': 'AF',
                'KLM': 'KL'
            },
            
            status: {
    // Container statuses
    'Gate In': 'in_transit',
    'Gate Out': 'in_transit',
    'Loaded': 'in_transit',
    'Loaded on Vessel': 'in_transit',
    'Discharged': 'arrived',              // CAMBIATO
    'Discharged from Vessel': 'arrived',  // CAMBIATO
    'In Transit': 'in_transit',
    'Sailing': 'in_transit',
    'Arrived': 'arrived',                 // CAMBIATO
    'Departed': 'in_transit',
    'Transhipment': 'in_transit',
    'In Transshipment': 'in_transit',
    // Delivered statuses
    'Delivered': 'delivered',
    'Empty': 'delivered',
    'Empty Returned': 'delivered',
    'POD': 'delivered',
    // Pending statuses
    'Registered': 'registered',
    'Pending': 'registered',
    'Booked': 'registered',
    'Booking Confirmed': 'registered',
    // Air statuses
    'RCS': 'registered',
    'MAN': 'in_transit',
    'DEP': 'in_transit',
    'ARR': 'arrived',                     // CAMBIATO
    'RCF': 'in_transit',
    'DLV': 'delivered',
    'NFD': 'in_transit',
    'AWD': 'in_transit'
},
            
            types: {
                container: /^[A-Z]{4}\d{7}$/,
                bl: /^[A-Z]{4}\d{8,12}$/,
                awb: /^\d{3}-\d{8}$/,
                parcel: /^[A-Z0-9]{10,30}$/
            }
        },
        
        /**
         * Import file principale
         * @param {File} file - File da importare
         * @param {Object} options - Opzioni di import
         */
        async importFile(file, options = {}) {
            // Validazione
            if (!this.validateFile(file)) {
                throw new Error('Formato file non supportato');
            }
            
            // Mostra progress modal
            const progress = ModalSystem.progress({
                title: 'Import in corso',
                message: 'Analisi file...',
                showPercentage: true,
                showStats: true
            });
            
            try {
                // Parse file
                progress.update(10, 'Lettura file...');
                const data = await this.parseFile(file);
                
                // Analizza dati
                progress.update(20, 'Analisi dati...');
                const analysis = this.analyzeData(data);
                
                // Chiedi conferma se necessario
                if (analysis.needsConfirmation) {
                    progress.close();
                    const proceed = await this.confirmImport(analysis);
                    if (!proceed) return { cancelled: true };
                    
                    // Riapri progress
                    progress = ModalSystem.progress({
                        title: 'Import in corso',
                        message: 'Preparazione import...',
                        showPercentage: true,
                        showStats: true
                    });
                }
                
                // Process data
                const result = await this.processImport(data, progress, options);
                
                // Chiudi progress
                progress.close();
                
                // Mostra risultati
                await this.showResults(result);
                
                return result;
                
            } catch (error) {
                progress.close();
                ModalSystem.alert({
                    type: 'error',
                    title: 'Errore Import',
                    message: error.message
                });
                throw error;
            }
        },
        
        /**
         * Valida file
         */
        validateFile(file) {
            const extension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0];
            return this.config.supportedFormats.includes(extension);
        },
        
        /**
         * Parse file (CSV o Excel)
         */
        async parseFile(file) {
            const extension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0];
            
            if (extension === '.csv') {
                return await this.parseCSV(file);
            } else if (['.xlsx', '.xls'].includes(extension)) {
                return await this.parseExcel(file);
            }
            
            throw new Error('Formato non supportato');
        },
        
        /**
         * Parse CSV
         */
        async parseCSV(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                
                reader.onload = (e) => {
                    try {
                        // Usa Papa Parse se disponibile
                        if (window.Papa) {
                            const result = Papa.parse(e.target.result, {
                                header: true,
                                dynamicTyping: true,
                                skipEmptyLines: true,
                                delimitersToGuess: [',', ';', '\t', '|']
                            });
                            resolve(result.data);
                        } else {
                            // Fallback manuale
                            const lines = e.target.result.split('\n');
                            const headers = lines[0].split(',').map(h => h.trim());
                            const data = [];
                            
                            for (let i = 1; i < lines.length; i++) {
                                if (!lines[i].trim()) continue;
                                const values = lines[i].split(',');
                                const row = {};
                                headers.forEach((h, idx) => {
                                    row[h] = values[idx]?.trim();
                                });
                                data.push(row);
                            }
                            
                            resolve(data);
                        }
                    } catch (error) {
                        reject(error);
                    }
                };
                
                reader.onerror = reject;
                reader.readAsText(file);
            });
        },
        
        /**
         * Parse Excel
         */
        async parseExcel(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                
                reader.onload = (e) => {
                    try {
                        const data = new Uint8Array(e.target.result);
                        const workbook = XLSX.read(data, { type: 'array' });
                        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                        const jsonData = XLSX.utils.sheet_to_json(firstSheet);
                        resolve(jsonData);
                    } catch (error) {
                        reject(error);
                    }
                };
                
                reader.onerror = reject;
                reader.readAsArrayBuffer(file);
            });
        },
        
        /**
         * Analizza dati per identificare tipo import
         */
        analyzeData(data) {
            const sample = data.slice(0, 5);
            const headers = Object.keys(data[0] || {});
            
            // Rileva se è export ShipsGo
            const isShipsGo = headers.some(h => 
                ['Container', 'Carrier', 'Port Of Loading'].includes(h)
            );
            
            // Rileva tipi di tracking
            const types = new Set();
            data.forEach(row => {
                const tracking = row.tracking_number || row.Container || row['Tracking Number'] || row['AWB Number'];
                if (tracking) {
                    const type = this.detectTrackingType(tracking);
                    if (type) types.add(type);
                }
            });
            
            return {
                totalRows: data.length,
                isShipsGo,
                trackingTypes: Array.from(types),
                headers,
                sample,
                needsConfirmation: data.length > 100
            };
        },
        
        /**
         * Conferma import
         */
        async confirmImport(analysis) {
            const message = `
                <div style="margin-bottom: var(--sol-space-lg);">
                    <p><strong>File rilevato:</strong> ${analysis.isShipsGo ? 'Export ShipsGo' : 'CSV Standard'}</p>
                    <p><strong>Righe totali:</strong> ${analysis.totalRows}</p>
                    <p><strong>Tipi tracking:</strong> ${analysis.trackingTypes.join(', ')}</p>
                </div>
                <div style="background: rgba(255, 149, 0, 0.1); border: 1px solid rgba(255, 149, 0, 0.3); 
                            padding: var(--sol-space-md); border-radius: var(--sol-radius-md);">
                    <i class="fas fa-exclamation-triangle" style="color: #FF9500;"></i>
                    Import di molti tracking. Vuoi procedere?
                </div>
            `;
            
            return await ModalSystem.confirm({
                title: 'Conferma Import',
                message: message,
                confirmText: 'Procedi',
                cancelText: 'Annulla'
            });
        },
        
        /**
         * Processa import
         */
        async processImport(data, progressModal, options = {}) {
            const results = {
                imported: 0,
                updated: 0,
                errors: [],
                skipped: 0,
                total: data.length
            };
            
            const token = window.authInit?.getToken() || 
                        localStorage.getItem('sb-access-token');
            
            // Process in batches
            const batches = this.createBatches(data, this.config.batchSize);
            
            for (let i = 0; i < batches.length; i++) {
                const batch = batches[i];
                const batchProgress = ((i + 1) / batches.length) * 100;
                
                progressModal.update(
                    batchProgress,
                    `Importazione batch ${i + 1} di ${batches.length}...`
                );
                
                // Process batch
                await Promise.all(batch.map(async (row) => {
                    try {
                        const tracking = this.normalizeTrackingData(row);
                        
                        if (!tracking || !tracking.trackingNumber) {
                            console.warn('Skipping invalid row:', row);
                            results.skipped++;
                            return;
                        }
                        
                        console.log(`Processing tracking ${tracking.trackingNumber} (${tracking.trackingType})`);
                        
                        // Skip se già esiste e non vogliamo aggiornare
                        if (!options.updateExisting) {
                            const exists = await this.checkExists(tracking.trackingNumber);
                            if (exists) {
                                results.skipped++;
                                return;
                            }
                        }
                        
                        // Crea/aggiorna tracking
                        await this.createTracking(tracking, token);
                        results.imported++;
                        
                    } catch (error) {
                        results.errors.push({
                            row: row,
                            error: error.message
                        });
                        
                        if (results.errors.length >= this.config.maxErrors) {
                            throw new Error('Troppi errori durante import');
                        }
                    }
                }));
                
                // Update stats
                progressModal.setStats({
                    'Totali': results.total,
                    'Importati': results.imported,
                    'Saltati': results.skipped,
                    'Errori': results.errors.length
                });
                
                // Delay tra batch
                if (i < batches.length - 1) {
                    await new Promise(resolve => 
                        setTimeout(resolve, this.config.delayBetweenBatches)
                    );
                }
            }
            
            return results;
        },
        
        /**
         * Normalizza dati tracking
         */
        normalizeTrackingData(row) {
            // Debug: vediamo cosa arriva
            console.log('Raw row data:', row);
            
            // Estrai tracking number - ATTENZIONE ai nomi esatti dei campi
            const trackingNumber = (
                row.tracking_number || 
                row['Tracking Number'] ||
                row.Container ||           // Per ShipsGo Sea
                row['Container'] ||        // Alternativa con spazi
                row['AWB Number'] ||       // Per ShipsGo Air
                row['BL Number'] ||        // Per Bill of Lading
                ''
            ).toString().toUpperCase().trim();
            
            console.log('Extracted tracking number:', trackingNumber);
            
            // Se non c'è tracking number, skip
            if (!trackingNumber || trackingNumber === '') {
                console.warn('No tracking number found in row:', row);
                return null;
            }
            
            // Rileva tipo
            const trackingType = row.tracking_type || 
                                row['Tracking Type'] ||
                                row.Type || 
                                this.detectTrackingType(trackingNumber);
            
            // Mappa carrier - ATTENZIONE: ShipsGo usa "Carrier" con C maiuscola
            const carrierInput = (
                row.carrier_code || 
                row.carrier ||
                row.Carrier ||              // ShipsGo Sea usa questo
                row['Carrier'] ||           // Con spazi
                row.Airline ||              // ShipsGo Air
                row['Airline'] ||
                ''
            ).toString().trim();
            
            console.log('Carrier input:', carrierInput);
            
            // Usa il mapping dictionary per i carrier
            const carrierCode = this.mappings.carriers[carrierInput.toUpperCase()] || 
                               this.getCarrierCode(carrierInput) ||
                               carrierInput.substring(0, 10).toUpperCase();
            
            console.log('Mapped carrier code:', carrierCode);
            
            // Mappa status usando il dictionary
            const statusInput = (row.status || row.Status || row['Status'] || 'registered').toString().trim();
            const status = this.mappings.status[statusInput] || statusInput.toLowerCase().replace(/\s+/g, '_');
            
            console.log('Status mapping:', statusInput, '->', status);
            
            // Estrai riferimento
            const referenceNumber = row.reference || 
                                  row.Reference || 
                                  row['Reference'] ||
                                  row.reference_number || 
                                  row['Reference Number'] ||
                                  null;
            
            // Costruisci oggetto normalizzato
            const normalized = {
                trackingNumber,
                trackingType,
                carrierCode,
                status,
                referenceNumber,
                // Aggiungi campi per la vista tabella
                carrier_code: carrierCode,      // Il table view cerca questo campo
                tracking_number: trackingNumber, // Il table view cerca questo campo  
                tracking_type: trackingType,    // Il table view cerca questo campo
                // Estrai origin e destination dai metadata per la location
                origin_port: row['Port Of Loading'] || row.Origin || row.origin_port || '',
                destination_port: row['Port Of Discharge'] || row.Destination || row.destination_port || '',
                // Metadata completi
                metadata: this.extractMetadata(row)
            };
            
            console.log('Normalized data:', normalized);
            
            return normalized;
        },
        
        /**
         * Helper per estrarre carrier code
         */
        getCarrierCode(carrierName) {
            if (!carrierName) return 'UNKNOWN';
            
            const upper = carrierName.toUpperCase();
            
            // Controlla se contiene keyword comuni
            if (upper.includes('MAERSK')) return 'MAERSK';
            if (upper.includes('MSC')) return 'MSC';
            if (upper.includes('CMA')) return 'CMA-CGM';
            if (upper.includes('COSCO')) return 'COSCO';
            if (upper.includes('HAPAG')) return 'HAPAG-LLOYD';
            if (upper.includes('EVERGREEN')) return 'EVERGREEN';
            if (upper.includes('YANG MING')) return 'YANG-MING';
            if (upper.includes('ONE')) return 'ONE';
            if (upper.includes('ZIM')) return 'ZIM';
            if (upper.includes('HMM') || upper.includes('HYUNDAI')) return 'HMM';
            if (upper.includes('CARGOLUX')) return 'CV';
            if (upper.includes('FEDEX')) return 'FX';
            if (upper.includes('DHL')) return 'DHL';
            if (upper.includes('UPS')) return 'UPS';
            
            // Se non trova match, usa le prime 3-4 lettere
            return upper.replace(/[^A-Z0-9]/g, '').substring(0, 4) || 'UNKNOWN';
        },
        
        /**
         * Rileva tipo tracking
         */
        detectTrackingType(trackingNumber) {
            const num = trackingNumber.toUpperCase();
            
            for (const [type, pattern] of Object.entries(this.mappings.types)) {
                if (pattern.test(num)) return type;
            }
            
            return 'unknown';
        },
        
        /**
         * Estrai metadata aggiuntivi
         */
        extractMetadata(row) {
            const metadata = {};
            
            // ShipsGo Sea specific
            if (row['Port Of Loading'] || row.Container) {
                metadata.pol = row['Port Of Loading'] || '';
                metadata.pod = row['Port Of Discharge'] || '';
                metadata.origin_port = metadata.pol;
                metadata.destination_port = metadata.pod;
                metadata.loading_date = this.parseDate(row['Date Of Loading']);
                metadata.discharge_date = this.parseDate(row['Date Of Discharge']);
                metadata.co2_emissions = parseFloat(row['CO₂ Emission (Tons)']) || null;
                metadata.tags = row.Tags !== '-' ? row.Tags : null;
                metadata.booking = row.Booking || row['Booking'] || null;
                metadata.vessel_name = row['Vessel Name'] || null;
                
                // Aggiungi info paese
                metadata.pol_country = row['POL Country'] || '';
                metadata.pol_country_code = row['POL Country Code'] || '';
                metadata.pod_country = row['POD Country'] || '';
                metadata.pod_country_code = row['POD Country Code'] || '';
            }
            
            // ShipsGo Air specific
            if (row['AWB Number'] || row.Origin) {
                metadata.origin = row.Origin || '';
                metadata.origin_name = row['Origin Name'] || '';
                metadata.destination = row.Destination || '';
                metadata.destination_name = row['Destination Name'] || '';
                metadata.origin_port = metadata.origin_name || metadata.origin;
                metadata.destination_port = metadata.destination_name || metadata.destination;
                metadata.departure_date = this.parseDate(row['Date Of Departure']);
                metadata.arrival_date = this.parseDate(row['Date Of Arrival']);
                metadata.flight_number = row['Flight Number'] || null;
                metadata.transit_time = row['Transit Time'] || null;
                
                // Aggiungi info paese air
                metadata.origin_country = row['Origin Country'] || '';
                metadata.origin_country_code = row['Origin Country Code'] || '';
                metadata.destination_country = row['Destination Country'] || '';
                metadata.destination_country_code = row['Destination Country Code'] || '';
            }
            
            // Common fields
            metadata.created_at = this.parseDate(row['Created At']) || new Date().toISOString();
            metadata.import_date = new Date().toISOString();
            metadata.source = 'shipsgo_import';
            
            // Genera timeline events se è ShipsGo
            if (row['Port Of Loading'] || row['AWB Number']) {
                metadata.timeline_events = this.generateTimelineEvents(row);
            }
            
            return metadata;
        },
        
        /**
         * Genera timeline events per ShipsGo
         */
        generateTimelineEvents(row) {
            const events = [];
            const now = new Date();
            
            if (row.Container) {
                // Sea shipment events
                const loadingDate = this.parseDate(row['Date Of Loading']);
                const dischargeDate = this.parseDate(row['Date Of Discharge']);
                
                if (loadingDate) {
                    events.push({
                        event_date: loadingDate,
                        event_type: 'GATE_IN',
                        description: 'Container entered terminal',
                        location: row['Port Of Loading'] || 'Loading Port'
                    });
                    
                    events.push({
                        event_date: new Date(new Date(loadingDate).getTime() + 24*60*60*1000).toISOString(),
                        event_type: 'LOADED_ON_VESSEL',
                        description: 'Container loaded on vessel',
                        location: row['Port Of Loading'] || 'Loading Port'
                    });
                }
                
                if (dischargeDate && new Date(dischargeDate) <= now) {
                    events.push({
                        event_date: dischargeDate,
                        event_type: 'DISCHARGED_FROM_VESSEL',
                        description: 'Container discharged from vessel',
                        location: row['Port Of Discharge'] || 'Discharge Port'
                    });
                }
                
                if (row.Status === 'Delivered' || row.Status === 'Empty') {
                    events.push({
                        event_date: new Date().toISOString(),
                        event_type: 'DELIVERED',
                        description: 'Container delivered',
                        location: row['Port Of Discharge'] || 'Final Destination'
                    });
                }
            } else if (row['AWB Number']) {
                // Air shipment events
                const departureDate = this.parseDate(row['Date Of Departure']);
                const arrivalDate = this.parseDate(row['Date Of Arrival']);
                
                if (departureDate) {
                    events.push({
                        event_date: departureDate,
                        event_type: 'DEP',
                        description: 'Flight departed',
                        location: row['Origin Name'] || row.Origin || 'Origin'
                    });
                }
                
                if (arrivalDate && new Date(arrivalDate) <= now) {
                    events.push({
                        event_date: arrivalDate,
                        event_type: 'ARR',
                        description: 'Flight arrived',
                        location: row['Destination Name'] || row.Destination || 'Destination'
                    });
                }
            }
            
            // Ordina eventi per data
            return events.sort((a, b) => 
                new Date(a.event_date) - new Date(b.event_date)
            );
        },
        
        /**
         * Parse data formato ShipsGo
         */
        parseDate(dateStr) {
            if (!dateStr || dateStr === '-') return null;
            
            try {
                // Formato DD/MM/YYYY o DD/MM/YYYY HH:MM:SS
                if (dateStr.includes('/')) {
                    const [datePart, timePart] = dateStr.split(' ');
                    const [day, month, year] = datePart.split('/');
                    
                    if (!day || !month || !year) return null;
                    
                    let date = new Date(
                        parseInt(year),
                        parseInt(month) - 1,
                        parseInt(day)
                    );
                    
                    if (timePart) {
                        const [hours, minutes, seconds] = timePart.split(':');
                        date.setHours(parseInt(hours) || 0);
                        date.setMinutes(parseInt(minutes) || 0);
                        date.setSeconds(parseInt(seconds) || 0);
                    }
                    
                    return date.toISOString();
                } else {
                    // Prova formato ISO standard
                    const date = new Date(dateStr);
                    if (!isNaN(date.getTime())) {
                        return date.toISOString();
                    }
                }
            } catch (error) {
                console.error('Error parsing date:', dateStr, error);
            }
            
            return null;
        },
        
        /**
         * Crea batch
         */
        createBatches(data, size) {
            const batches = [];
            for (let i = 0; i < data.length; i += size) {
                batches.push(data.slice(i, i + size));
            }
            return batches;
        },
        
        /**
         * Controlla se tracking esiste
         */
        async checkExists(trackingNumber) {
            try {
                const stored = localStorage.getItem('mockTrackings');
                if (stored) {
                    const trackings = JSON.parse(stored);
                    return trackings.some(t => 
                        t.tracking_number === trackingNumber
                    );
                }
            } catch (error) {
                console.error('Error checking existence:', error);
            }
            return false;
        },
        
        /**
         * Crea tracking via API o localStorage
         */
        async createTracking(trackingData, token) {
            // Prepara l'oggetto tracking completo per il salvataggio
            const tracking = {
                id: Date.now() + Math.random(), // ID unico
                tracking_number: trackingData.trackingNumber || trackingData.tracking_number,
                tracking_type: trackingData.trackingType || trackingData.tracking_type,
                carrier_code: trackingData.carrierCode || trackingData.carrier_code,
                carrier_name: trackingData.carrierCode || trackingData.carrier_code, // Per compatibility
                status: trackingData.status || 'registered',
                reference_number: trackingData.referenceNumber || trackingData.reference_number,
                origin_port: trackingData.origin_port || trackingData.metadata?.origin_port || 'N/A',
                origin_name: trackingData.origin_name || trackingData.metadata?.origin_name || '',
                destination_port: trackingData.destination_port || trackingData.metadata?.destination_port || 'N/A',
                destination_name: trackingData.destination_name || trackingData.metadata?.destination_name || '',
                eta: trackingData.metadata?.discharge_date || trackingData.metadata?.arrival_date || null,
                last_event_date: new Date().toISOString(),
                last_event_location: trackingData.origin_port || trackingData.metadata?.origin_port || 'Import',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                metadata: trackingData.metadata || {}
            };
            
            console.log('Creating tracking:', tracking);
            
            // Salva in localStorage
            try {
                let existingTrackings = [];
                const stored = localStorage.getItem('mockTrackings');
                if (stored) {
                    existingTrackings = JSON.parse(stored);
                }
                
                // Aggiungi il nuovo tracking
                existingTrackings.push(tracking);
                
                // Salva
                localStorage.setItem('mockTrackings', JSON.stringify(existingTrackings));
                console.log('Tracking saved to localStorage. Total trackings:', existingTrackings.length);
                
                return tracking;
            } catch (error) {
                console.error('Error saving tracking:', error);
                throw error;
            }
        },
        
        /**
         * Mostra risultati import
         */
        async showResults(results) {
            const hasErrors = results.errors.length > 0;
            
            const content = `
                <div style="text-align: center; margin-bottom: var(--sol-space-xl);">
                    <div style="font-size: 3rem; font-weight: bold; color: ${hasErrors ? '#FF9500' : '#34C759'};">
                        ${results.imported}
                    </div>
                    <div style="font-size: 1.125rem; color: var(--sol-text-secondary);">
                        tracking importati con successo
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--sol-space-lg);">
                    <div style="background: var(--sol-glass-light); padding: var(--sol-space-lg); 
                                border-radius: var(--sol-radius-md); text-align: center;">
                        <i class="fas fa-check-circle" style="color: #34C759; font-size: 2rem;"></i>
                        <h4>Importati</h4>
                        <p style="font-size: 1.5rem; font-weight: bold;">${results.imported}</p>
                    </div>
                    
                    <div style="background: var(--sol-glass-light); padding: var(--sol-space-lg); 
                                border-radius: var(--sol-radius-md); text-align: center;">
                        <i class="fas fa-forward" style="color: #007AFF; font-size: 2rem;"></i>
                        <h4>Saltati</h4>
                        <p style="font-size: 1.5rem; font-weight: bold;">${results.skipped}</p>
                    </div>
                </div>
                
                ${hasErrors ? `
                    <div style="margin-top: var(--sol-space-xl); background: rgba(255, 59, 48, 0.1); 
                                border: 1px solid rgba(255, 59, 48, 0.3); padding: var(--sol-space-lg); 
                                border-radius: var(--sol-radius-md);">
                        <h4 style="color: #FF3B30;">
                            <i class="fas fa-exclamation-triangle"></i> 
                            ${results.errors.length} Errori durante import
                        </h4>
                        <div style="max-height: 200px; overflow-y: auto; margin-top: var(--sol-space-md);">
                            ${results.errors.slice(0, 10).map(err => `
                                <div style="margin-bottom: var(--sol-space-sm);">
                                    <strong>${err.row.tracking_number || err.row.Container || err.row['AWB Number'] || 'Unknown'}:</strong> ${err.error}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            `;
            
            ModalSystem.create({
                title: '✅ Import Completato',
                content: content,
                footer: `
                    <button class="sol-btn sol-btn-primary" 
                            onclick="ModalSystem.close(this.closest('.sol-modal-overlay').id); location.reload();">
                        OK
                    </button>
                `,
                maxWidth: '600px'
            });
        },
        
        /**
         * Download template
         */
        downloadTemplate(type = 'standard') {
            const templates = {
                standard: {
                    filename: 'tracking_import_template.csv',
                    content: `tracking_number,carrier_code,tracking_type,reference
MRKU1234567,MAERSK,container,PO123456
MSCU7654321,MSC,container,PO123457
176-12345678,CV,awb,AWB789012
1234567890,DHL,parcel,DHL456789`
                },
                
                shipsgo_sea: {
                    filename: 'shipsgo_sea_template.csv',
                    content: `Container,Carrier,Status,Reference,Booking,Port Of Loading,Port Of Discharge,Date Of Loading,Date Of Discharge,CO₂ Emission (Tons),Tags
MRKU1234567,MAERSK LINE,In Transit,PO123456,BKG789,SHANGHAI,ROTTERDAM,15/06/2025,30/06/2025,1.5,Urgent
MSCU7654321,MSC,Loaded,INV456789,-,NINGBO,GENOVA,20/06/2025,15/07/2025,2.1,Regular`
                },
                
                shipsgo_air: {
                    filename: 'shipsgo_air_template.csv',
                    content: `AWB Number,Airline,Status,Origin,Origin Name,Destination,Destination Name,Date Of Departure,Date Of Arrival,Reference,Tags
176-12345678,CARGOLUX,DEP,HKG,Hong Kong,MXP,Milan Malpensa,07/12/2024 14:30:00,08/12/2024 18:45:00,AIR-2024-001,Express
235-87654321,FEDEX,ARR,JFK,New York JFK,FCO,Rome Fiumicino,06/12/2024 22:00:00,07/12/2024 14:30:00,AIR-2024-002,Standard`
                }
            };
            
            const template = templates[type] || templates.standard;
            const blob = new Blob([template.content], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = template.filename;
            link.click();
            
            if (window.showNotification) {
                window.showNotification(`Template ${type} scaricato!`, 'success');
            }
        }
    };
})();