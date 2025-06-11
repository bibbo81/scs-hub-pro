// import-manager.js - Gestione import tracking da CSV/Excel
(function() {
    'use strict';
    
    const config = {
        supportedFormats: ['.csv', '.xls', '.xlsx'],
        maxFileSize: 10 * 1024 * 1024, // 10MB
        batchSize: 50,
        delayBetweenBatches: 100, // ms
        maxErrors: 100
    };
    
    const mappings = {
        // Mapping standard carriers
        carriers: {
            'MSC': 'MSC',
            'MAERSK': 'MAERSK', 
            'CMA CGM': 'CMA-CGM',
            'HAPAG-LLOYD': 'HAPAG-LLOYD',
            'COSCO': 'COSCO',
            'ONE': 'ONE',
            'EVERGREEN': 'EVERGREEN',
            'YANG MING': 'YANG-MING',
            'HMM': 'HMM',
            'ZIM': 'ZIM',
            'CV': 'CV',
            'BA': 'BA',
            'LH': 'LH',
            'DHL': 'DHL',
            'FEDEX': 'FEDEX',
            'UPS': 'UPS'
        },
        
        // Mapping tipi tracking
        types: {
            'CNTR': 'container',
            'BL': 'bl',
            'AWB': 'awb', 
            'PARCEL': 'parcel'
        }
    };
    
    window.ImportManager = {
        config: config,
        mappings: mappings,
        
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
                return this.parseCSV(file);
            } else {
                return this.parseExcel(file);
            }
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
                            console.log('[ImportManager] Parsed CSV:', result.data.length, 'rows');
                            resolve(result.data);
                        } else {
                            // Fallback manuale migliorato per ShipsGo CSV
                            const text = e.target.result;
                            const lines = text.split(/\r?\n/);
                            
                            if (lines.length < 2) {
                                throw new Error('File CSV vuoto o invalido');
                            }
                            
                            // Parse headers - gestisci virgolette
                            const headers = this.parseCSVLine(lines[0]);
                            console.log('[ImportManager] Headers:', headers);
                            
                            const data = [];
                            
                            for (let i = 1; i < lines.length; i++) {
                                if (!lines[i].trim()) continue;
                                
                                const values = this.parseCSVLine(lines[i]);
                                const row = {};
                                
                                headers.forEach((h, idx) => {
                                    row[h] = values[idx] || '';
                                });
                                
                                data.push(row);
                            }
                            
                            console.log('[ImportManager] Parsed CSV manually:', data.length, 'rows');
                            resolve(data);
                        }
                    } catch (error) {
                        console.error('[ImportManager] CSV parse error:', error);
                        reject(error);
                    }
                };
                
                reader.onerror = (error) => {
                    console.error('[ImportManager] File read error:', error);
                    reject(error);
                };
                
                reader.readAsText(file);
            });
        },
        
        /**
         * Parse CSV line handling quotes
         */
        parseCSVLine(line) {
            const values = [];
            let current = '';
            let inQuotes = false;
            
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                const nextChar = line[i + 1];
                
                if (char === '"') {
                    if (inQuotes && nextChar === '"') {
                        // Escaped quote
                        current += '"';
                        i++; // Skip next quote
                    } else {
                        // Toggle quotes
                        inQuotes = !inQuotes;
                    }
                } else if (char === ',' && !inQuotes) {
                    values.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            
            // Don't forget last value
            values.push(current.trim());
            
            return values;
        },
        
        /**
         * Parse Excel
         */
        async parseExcel(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                
                reader.onload = async (e) => {
                    try {
                        // Check if SheetJS is available
                        if (typeof XLSX === 'undefined') {
                            console.warn('[ImportManager] SheetJS not loaded, attempting to load...');
                            
                            // Try to load SheetJS dynamically
                            await this.loadSheetJS();
                        }
                        
                        // Parse the Excel file
                        const data = new Uint8Array(e.target.result);
                        const workbook = XLSX.read(data, { type: 'array' });
                        
                        // Get the first sheet
                        const firstSheetName = workbook.SheetNames[0];
                        const worksheet = workbook.Sheets[firstSheetName];
                        
                        // Convert to JSON with raw values
                        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                            header: 1, // Use first row as headers
                            defval: '', // Default value for empty cells
                            blankrows: false, // Skip blank rows
                            raw: false, // Get formatted strings instead of raw values
                            dateNF: 'dd/mm/yyyy' // Date format
                        });
                        
                        if (jsonData.length < 2) {
                            throw new Error('File Excel vuoto o invalido');
                        }
                        
                        // Convert array format to object format
                        const headers = jsonData[0].map(h => String(h).trim());
                        console.log('[ImportManager] Excel headers:', headers);
                        console.log('[ImportManager] Excel headers details:', headers.join(' | '));
                        
                        const rows = [];
                        
                        for (let i = 1; i < jsonData.length; i++) {
                            const row = {};
                            headers.forEach((header, index) => {
                                const value = jsonData[i][index];
                                // Converti tutto in stringa e pulisci
                                row[header] = value !== undefined && value !== null ? String(value).trim() : '';
                            });
                            rows.push(row);
                        }
                        
                        console.log('[ImportManager] Parsed Excel:', rows.length, 'rows');
                        console.log('[ImportManager] First row data:', rows[0]);
                        resolve(rows);
                        
                    } catch (error) {
                        console.error('[ImportManager] Excel parse error:', error);
                        reject(new Error('Errore nel parsing del file Excel: ' + error.message));
                    }
                };
                
                reader.onerror = (error) => {
                    console.error('[ImportManager] File read error:', error);
                    reject(error);
                };
                
                // Read as ArrayBuffer for Excel files
                reader.readAsArrayBuffer(file);
            });
        },
        
        /**
         * Load SheetJS library dynamically
         */
        async loadSheetJS() {
            return new Promise((resolve, reject) => {
                if (typeof XLSX !== 'undefined') {
                    resolve();
                    return;
                }
                
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
                script.onload = () => {
                    console.log('[ImportManager] SheetJS loaded successfully');
                    resolve();
                };
                script.onerror = () => {
                    reject(new Error('Failed to load SheetJS library'));
                };
                document.head.appendChild(script);
            });
        },
        
        /**
         * Analizza dati
         */
        analyzeData(data) {
            const analysis = {
                total: data.length,
                valid: 0,
                invalid: 0,
                duplicates: 0,
                needsConfirmation: false,
                errors: []
            };
            
            const seen = new Set();
            
            data.forEach((row, index) => {
                try {
                    const trackingNumber = this.extractTrackingNumber(row);
                    
                    if (!trackingNumber) {
                        analysis.invalid++;
                        analysis.errors.push({
                            row: index + 1,
                            error: 'Tracking number mancante'
                        });
                        return;
                    }
                    
                    if (seen.has(trackingNumber)) {
                        analysis.duplicates++;
                    } else {
                        seen.add(trackingNumber);
                        analysis.valid++;
                    }
                    
                } catch (error) {
                    analysis.invalid++;
                    analysis.errors.push({
                        row: index + 1,
                        error: error.message
                    });
                }
            });
            
            // Richiedi conferma se ci sono problemi
            if (analysis.invalid > 0 || analysis.duplicates > 0) {
                analysis.needsConfirmation = true;
            }
            
            return analysis;
        },
        
        /**
         * Estrai tracking number
         */
        extractTrackingNumber(row) {
            return row.tracking_number || 
                   row.Container || 
                   row['Container Number'] ||
                   row['Tracking Number'] || 
                   row['AWB Number'] ||        // Per file aerei ShipsGo
                   row['Awb Number'] ||        // Variante minuscola
                   row.AWB ||                  // Altre possibili varianti
                   row.awb ||
                   '';
        },
        
        /**
         * Conferma import
         */
        async confirmImport(analysis) {
            const message = `
                <div style="margin-bottom: var(--sol-space-lg);">
                    <p>Sono stati rilevati alcuni problemi nei dati:</p>
                    <ul style="margin: var(--sol-space-md) 0;">
                        ${analysis.invalid > 0 ? `<li>${analysis.invalid} righe non valide</li>` : ''}
                        ${analysis.duplicates > 0 ? `<li>${analysis.duplicates} duplicati</li>` : ''}
                    </ul>
                    <p>Vuoi procedere comunque con l'import?</p>
                </div>
                <div style="background: var(--sol-glass-light); padding: var(--sol-space-md); 
                            border-radius: var(--sol-radius-md);">
                    <small>Le righe non valide verranno saltate</small>
                </div>
            `;
            
            return ModalSystem.confirm({
                title: '⚠️ Conferma Import',
                message: message,
                confirmText: 'Procedi',
                confirmClass: 'sol-btn-warning'
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
            
            // Ottieni tracking esistenti da localStorage
            const existingTrackings = JSON.parse(localStorage.getItem('trackings') || '[]');
            const trackingMap = new Map(existingTrackings.map(t => [t.tracking_number, t]));
            
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
                for (const row of batch) {
                    try {
                        const tracking = this.normalizeTrackingData(row);
                        
                        if (!tracking.trackingNumber) {
                            results.errors.push({
                                row: row,
                                error: 'Tracking number mancante'
                            });
                            continue;
                        }
                        
                        // Check if exists
                        if (trackingMap.has(tracking.trackingNumber)) {
                            if (options.updateExisting) {
                                // Update existing
                                const existing = trackingMap.get(tracking.trackingNumber);
                                const updated = {
                                    ...existing,
                                    ...tracking,
                                    id: existing.id,
                                    updated_at: new Date().toISOString()
                                };
                                trackingMap.set(tracking.trackingNumber, updated);
                                results.updated++;
                            } else {
                                results.skipped++;
                            }
                        } else {
                            // Create new tracking
                            const newTracking = {
                                id: Date.now() + Math.random(),
                                tracking_number: tracking.trackingNumber,
                                tracking_type: tracking.trackingType,
                                carrier_code: tracking.carrierCode,
                                carrier_name: tracking.carrierCode,
                                reference_number: tracking.referenceNumber,
                                status: tracking.status || 'registered',
                                created_at: new Date().toISOString(),
                                updated_at: new Date().toISOString(),
                                last_event_date: tracking.metadata?.loading_date || tracking.metadata?.departure_date || new Date().toISOString(),
                                last_event_location: tracking.metadata?.pol || tracking.metadata?.origin_name || tracking.metadata?.origin || 'Import Location',
                                origin_port: tracking.metadata?.pol || tracking.metadata?.origin,
                                destination_port: tracking.metadata?.pod || tracking.metadata?.destination,
                                // Per tracking aerei, usa arrival_date come ETA se disponibile
                                eta: tracking.metadata?.arrival_date || tracking.metadata?.discharge_date || null,
                                // Aggiungi tutti i campi ShipsGo come colonne separate
                                booking: tracking.metadata?.booking,
                                container_count: tracking.metadata?.container_count,
                                port_of_loading: tracking.metadata?.pol,
                                date_of_loading: tracking.metadata?.loading_date,
                                pol_country: tracking.metadata?.pol_country,
                                pol_country_code: tracking.metadata?.pol_country_code,
                                port_of_discharge: tracking.metadata?.pod,
                                date_of_discharge: tracking.metadata?.discharge_date,
                                pod_country: tracking.metadata?.pod_country,
                                pod_country_code: tracking.metadata?.pod_country_code,
                                co2_emission: tracking.metadata?.co2_emission,
                                tags: tracking.metadata?.tags,
                                created_at_shipsgo: tracking.metadata?.created_at_shipsgo,
                                // Campi aerei
                                awb_number: tracking.metadata?.awb_number,
                                airline: tracking.carrierCode,
                                origin: tracking.metadata?.origin,
                                origin_name: tracking.metadata?.origin_name,
                                date_of_departure: tracking.metadata?.departure_date,
                                origin_country: tracking.metadata?.origin_country,
                                origin_country_code: tracking.metadata?.origin_country_code,
                                destination: tracking.metadata?.destination,
                                destination_name: tracking.metadata?.destination_name,
                                date_of_arrival: tracking.metadata?.arrival_date,
                                destination_country: tracking.metadata?.destination_country,
                                destination_country_code: tracking.metadata?.destination_country_code,
                                transit_time: tracking.metadata?.transit_time,
                                t5_count: tracking.metadata?.t5_count,
                                // Mantieni tutti i metadata
                                metadata: tracking.metadata
                            };
                            
                            trackingMap.set(tracking.trackingNumber, newTracking);
                            results.imported++;
                        }
                        
                    } catch (error) {
                        console.error('[ImportManager] Error processing row:', error);
                        results.errors.push({
                            row: row,
                            error: error.message
                        });
                        
                        if (results.errors.length >= this.config.maxErrors) {
                            throw new Error('Troppi errori durante import');
                        }
                    }
                }
                
                // Update stats
                progressModal.setStats({
                    'Totali': results.total,
                    'Importati': results.imported,
                    'Aggiornati': results.updated,
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
            
            // Salva in localStorage
            const allTrackings = Array.from(trackingMap.values());
            localStorage.setItem('trackings', JSON.stringify(allTrackings));
            
            // Trigger evento per aggiornare UI
            window.dispatchEvent(new CustomEvent('trackingsUpdated', {
                detail: { trackings: allTrackings }
            }));
            
            console.log('[ImportManager] Import completed:', results);
            
            return results;
        },
        
        /**
         * Normalizza dati tracking
         */
        normalizeTrackingData(row) {
            console.log('[ImportManager] Normalizing row:', row);
            
            // Estrai tracking number
            const trackingNumber = (
                row.tracking_number || 
                row.Container || 
                row['Container Number'] ||
                row['Tracking Number'] ||
                row['AWB Number'] ||        // Per file aerei
                row['Awb Number'] ||
                row.AWB ||
                row.awb ||
                ''
            ).toString().toUpperCase().trim();
            
            // Rileva tipo
            const trackingType = row.tracking_type || 
                               row.Type || 
                               this.detectTrackingType(trackingNumber);
            
            // Mappa carrier - gestisci sia nome completo che codice
            const carrierInput = (
                row.carrier_code || 
                row.Carrier || 
                row['Shipping Line'] ||
                row.Airline ||              // Per file aerei
                row.carrier || 
                ''
            ).toString().toUpperCase().trim();
            
            // Normalizza carrier name a code
            const carrierCode = this.normalizeCarrierCode(carrierInput);
            
            // Riferimento
            const referenceNumber = row.reference || 
                                  row.Reference || 
                                  row.reference_number || 
                                  null;
            
            // Status mapping per ShipsGo
            const status = this.normalizeStatus(
                row.Status || 
                row.status || 
                'registered'
            );
            
            const normalized = {
                trackingNumber,
                trackingType,
                carrierCode,
                referenceNumber,
                status,
                metadata: this.extractMetadata(row)
            };
            
            console.log('[ImportManager] Normalized:', normalized);
            
            return normalized;
        },
        
        /**
         * Normalizza carrier name a code
         */
        normalizeCarrierCode(carrierInput) {
            // Mapping da nome completo a codice
            const carrierMap = {
                'MAERSK LINE': 'MAERSK',
                'MAERSK': 'MAERSK',
                'MSC': 'MSC',
                'MEDITERRANEAN SHIPPING COMPANY': 'MSC',
                'CMA CGM': 'CMA-CGM',
                'CMA-CGM': 'CMA-CGM',
                'COSCO': 'COSCO',
                'COSCO SHIPPING': 'COSCO',
                'HAPAG-LLOYD': 'HAPAG-LLOYD',
                'HAPAG LLOYD': 'HAPAG-LLOYD',
                'ONE': 'ONE',
                'OCEAN NETWORK EXPRESS': 'ONE',
                'EVERGREEN': 'EVERGREEN',
                'EVERGREEN LINE': 'EVERGREEN',
                'YANG MING': 'YANG-MING',
                'YANG MING LINE': 'YANG-MING',
                'ZIM': 'ZIM',
                'ZIM LINE': 'ZIM',
                'HMM': 'HMM',
                'HYUNDAI': 'HMM'
            };
            
            const upperInput = carrierInput.toUpperCase();
            return carrierMap[upperInput] || upperInput || 'UNKNOWN';
        },
        
        /**
         * Normalizza status
         */
        normalizeStatus(statusInput) {
            if (!statusInput) return 'registered';
            
            const status = statusInput.toString().trim();
            
            // Mapping basato sulla formula Google Sheets
            const statusMap = {
                // Stati marittimi
                'Sailing': 'in_transit',
                'Arrived': 'arrived',
                'Delivered': 'delivered',
                'Discharged': 'delivered',  // CAMBIATO: era 'arrived', ora 'delivered'
                'Gate In': 'in_transit',
                'Gate Out': 'delivered',
                'Loaded': 'in_transit',
                'Loading': 'in_transit',
                'Discharging': 'delivered',  // CAMBIATO: era 'arrived', ora 'delivered'
                'In Transit': 'in_transit',
                'Transhipment': 'in_transit',
                'Empty': 'delivered',
                'Empty Returned': 'delivered',
                
                // Stati FedEx
                'On FedEx vehicle for delivery': 'out_for_delivery',
                'At local FedEx facility': 'in_transit',
                'Departed FedEx hub': 'in_transit',
                'On the way': 'in_transit',
                'Arrived at FedEx hub': 'in_transit',
                'International shipment release - Import': 'customs_cleared',
                'At destination sort facility': 'in_transit',
                'Left FedEx origin facility': 'in_transit',
                'Picked up': 'in_transit',
                'Shipment information sent to FedEx': 'registered',
                
                // Stati GLS
                'Consegnata.': 'delivered',
                'Consegna prevista nel corso della giornata odierna.': 'out_for_delivery',
                'Arrivata nella Sede GLS locale.': 'in_transit',
                'In transito.': 'in_transit',
                'Partita dalla sede mittente. In transito.': 'in_transit',
                'La spedizione e\' stata creata dal mittente, attendiamo che ci venga affidata per l\'invio a destinazione.': 'registered',
                'La spedizione è stata consegnata': 'delivered',
                'LA spedizione è stata consegnata': 'delivered',
                'La spedizione è in consegna': 'out_for_delivery',
                'La spedizione è in transito': 'in_transit',
                
                // Stati generici
                'Registered': 'registered',
                'Pending': 'registered',
                'Booked': 'registered',
                'Booking Confirmed': 'registered',
                'Delayed': 'delayed',
                'Exception': 'exception',
                
                // Stati italiani
                'In transito': 'in_transit',
                'Arrivata': 'arrived',
                'Consegnato': 'delivered',
                'Scaricato': 'arrived',
                'Sdoganata': 'customs_cleared',
                'In consegna': 'out_for_delivery',
                'Spedizione creata': 'registered'
            };
            
            // Prima prova match esatto
            if (statusMap[status]) {
                return statusMap[status];
            }
            
            // Poi prova match case-insensitive
            const statusLower = status.toLowerCase();
            for (const [key, value] of Object.entries(statusMap)) {
                if (key.toLowerCase() === statusLower) {
                    return value;
                }
            }
            
            // Fallback: prova a dedurre dallo status
            if (statusLower.includes('transit') || statusLower.includes('sailing') || statusLower.includes('loaded')) {
                return 'in_transit';
            }
            if (statusLower.includes('delivered') || statusLower.includes('consegna')) {
                return 'delivered';
            }
            if (statusLower.includes('arrived') || statusLower.includes('discharged')) {
                return 'arrived';
            }
            if (statusLower.includes('customs') || statusLower.includes('sdogan')) {
                return 'customs_cleared';
            }
            if (statusLower.includes('delay') || statusLower.includes('ritard')) {
                return 'delayed';
            }
            if (statusLower.includes('exception') || statusLower.includes('error')) {
                return 'exception';
            }
            
            // Default: usa lo status originale se non mappato
            console.warn('[ImportManager] Status non mappato:', status);
            return 'registered';
        },
        
        /**
         * Rileva tipo tracking
         */
        detectTrackingType(trackingNumber) {
            // Container
            if (/^[A-Z]{4}\d{7}$/.test(trackingNumber)) {
                return 'container';
            }
            
            // AWB (air waybill)
            if (/^\d{3}-\d{8}$/.test(trackingNumber)) {
                return 'awb';
            }
            
            // Default
            return 'bl';
        },
        
        /**
         * Estrai metadata
         */
        extractMetadata(row) {
            const metadata = {};
            
            // ShipsGo Mare fields - NOMI ESATTI DAL FILE
            if (row['Port Of Loading']) metadata.pol = row['Port Of Loading'];
            if (row['Port Of Discharge']) metadata.pod = row['Port Of Discharge'];
            if (row['Date Of Loading']) {
                const loadDate = this.parseDate(row['Date Of Loading']);
                if (loadDate) metadata.loading_date = loadDate;
            }
            if (row['Date Of Discharge']) {
                const dischDate = this.parseDate(row['Date Of Discharge']);
                if (dischDate) metadata.discharge_date = dischDate;
            }
            if (row['POL Country']) metadata.pol_country = row['POL Country'];
            if (row['POL Country Code']) metadata.pol_country_code = row['POL Country Code'];
            if (row['POD Country']) metadata.pod_country = row['POD Country'];
            if (row['POD Country Code']) metadata.pod_country_code = row['POD Country Code'];
            if (row['CO₂ Emission (Tons)']) metadata.co2_emission = row['CO₂ Emission (Tons)'];
            if (row['Container Count']) metadata.container_count = row['Container Count'];
            if (row['Tags']) metadata.tags = row['Tags'];
            if (row['Booking']) metadata.booking = row['Booking'];
            if (row['Created At']) {
                // Parse e formatta Created At come DD/MM/YYYY
                const createdAt = this.parseDate(row['Created At']);
                if (createdAt) {
                    metadata.created_at_shipsgo = createdAt;
                }
            }
            
            // Calcola Transit Time per spedizioni marittime se manca
            if (!metadata.transit_time && metadata.loading_date && metadata.discharge_date) {
                // Converti le date DD/MM/YYYY in oggetti Date per il calcolo
                const loadParts = metadata.loading_date.split('/');
                const dischParts = metadata.discharge_date.split('/');
                
                if (loadParts.length === 3 && dischParts.length === 3) {
                    const loadDate = new Date(loadParts[2], loadParts[1] - 1, loadParts[0]);
                    const dischDate = new Date(dischParts[2], dischParts[1] - 1, dischParts[0]);
                    
                    if (!isNaN(loadDate.getTime()) && !isNaN(dischDate.getTime())) {
                        const diffTime = Math.abs(dischDate - loadDate);
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        metadata.transit_time = diffDays.toString();
                        metadata.transit_time_calculated = true;
                        console.log('[ImportManager] Calculated Maritime Transit Time:', diffDays, 'days');
                    }
                }
            }
            
            // ShipsGo Air fields
            if (row['AWB Number']) metadata.awb_number = row['AWB Number'];
            if (row['Origin']) metadata.origin = row['Origin'];
            if (row['Origin Name']) metadata.origin_name = row['Origin Name'];
            if (row['Origin Country']) metadata.origin_country = row['Origin Country'];
            if (row['Origin Country Code']) metadata.origin_country_code = row['Origin Country Code'];
            if (row['Date Of Departure']) {
                const depDate = this.parseDate(row['Date Of Departure']);
                if (depDate) metadata.departure_date = depDate;
            }
            if (row['Destination']) metadata.destination = row['Destination'];
            if (row['Destination Name']) metadata.destination_name = row['Destination Name'];
            if (row['Destination Country']) metadata.destination_country = row['Destination Country'];
            if (row['Destination Country Code']) metadata.destination_country_code = row['Destination Country Code'];
            if (row['Date Of Arrival']) {
                const arrDate = this.parseDate(row['Date Of Arrival']);
                if (arrDate) metadata.arrival_date = arrDate;
            }
            if (row['Transit Time']) {
                // Debug Transit Time
                console.log('[ImportManager] Raw Transit Time value:', row['Transit Time'], 'Type:', typeof row['Transit Time']);
                
                const transitValue = row['Transit Time'];
                metadata.transit_time = String(transitValue).trim();
                
                // Verifica se il valore sembra errato confrontando con le date
                if (metadata.departure_date && metadata.arrival_date) {
                    // Converti le date DD/MM/YYYY in oggetti Date per il calcolo
                    const depParts = metadata.departure_date.split('/');
                    const arrParts = metadata.arrival_date.split('/');
                    
                    if (depParts.length === 3 && arrParts.length === 3) {
                        const depDate = new Date(depParts[2], depParts[1] - 1, depParts[0]);
                        const arrDate = new Date(arrParts[2], arrParts[1] - 1, arrParts[0]);
                        
                        if (!isNaN(depDate.getTime()) && !isNaN(arrDate.getTime())) {
                            const diffTime = Math.abs(arrDate - depDate);
                            const calculatedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                            const savedDays = parseInt(metadata.transit_time);
                            
                            // Se la differenza è troppo grande, usa il valore calcolato
                            if (!isNaN(savedDays) && Math.abs(savedDays - calculatedDays) > 10) {
                                console.log('[ImportManager] Transit Time mismatch - Saved:', savedDays, 'Calculated:', calculatedDays);
                                console.log('[ImportManager] Using calculated value instead');
                                metadata.transit_time = calculatedDays.toString();
                                metadata.transit_time_corrected = true;
                            }
                        }
                    }
                }
                
                console.log('[ImportManager] Final Transit Time:', metadata.transit_time);
            }
            
            // Calcola Transit Time se manca ma abbiamo le date
            if (!metadata.transit_time && metadata.departure_date && metadata.arrival_date) {
                const depDate = new Date(metadata.departure_date);
                const arrDate = new Date(metadata.arrival_date);
                console.log('[ImportManager] Calculating from dates - Dep:', metadata.departure_date, 'Arr:', metadata.arrival_date);
                
                if (!isNaN(depDate.getTime()) && !isNaN(arrDate.getTime())) {
                    const diffTime = Math.abs(arrDate - depDate);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    metadata.transit_time = diffDays.toString();
                    console.log('[ImportManager] Calculated Transit Time:', diffDays, 'days');
                }
            }
            if (row['T5 Count']) metadata.t5_count = row['T5 Count'];
            
            // Altri campi utili - salva TUTTI i campi
            Object.keys(row).forEach(key => {
                if (row[key] && row[key] !== '-') {
                    // Crea una versione snake_case della chiave
                    const snakeKey = key.toLowerCase().replace(/\s+/g, '_').replace(/[^\w_]/g, '');
                    if (!metadata[snakeKey]) {
                        metadata[snakeKey] = row[key];
                    }
                }
            });
            
            console.log('[ImportManager] Extracted metadata:', metadata);
            return metadata;
        },
        
        /**
         * Crea batches
         */
        createBatches(data, batchSize) {
            const batches = [];
            for (let i = 0; i < data.length; i += batchSize) {
                batches.push(data.slice(i, i + batchSize));
            }
            return batches;
        },
        
        /**
         * Controlla se tracking esiste
         */
        checkExists(trackingNumber) {
            const trackings = JSON.parse(localStorage.getItem('trackings') || '[]');
            return trackings.some(t => t.tracking_number === trackingNumber);
        },
        
        /**
         * Mostra risultati import
         */
        async showResults(results) {
            const hasErrors = results.errors.length > 0;
            
            const content = `
                <div style="text-align: center; margin-bottom: var(--sol-space-xl);">
                    <div style="font-size: 3rem; font-weight: bold; color: ${hasErrors ? '#FF9500' : '#34C759'};">
                        ${results.imported + results.updated}
                    </div>
                    <div style="font-size: 1.125rem; color: var(--sol-text-secondary);">
                        tracking importati con successo
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--sol-space-lg);">
                    <div style="background: var(--sol-glass-light); padding: var(--sol-space-lg); 
                                border-radius: var(--sol-radius-md); text-align: center;">
                        <i class="fas fa-check-circle" style="color: #34C759; font-size: 2rem;"></i>
                        <h4>Nuovi</h4>
                        <p style="font-size: 1.5rem; font-weight: bold;">${results.imported}</p>
                    </div>
                    
                    <div style="background: var(--sol-glass-light); padding: var(--sol-space-lg); 
                                border-radius: var(--sol-radius-md); text-align: center;">
                        <i class="fas fa-sync-alt" style="color: #007AFF; font-size: 2rem;"></i>
                        <h4>Aggiornati</h4>
                        <p style="font-size: 1.5rem; font-weight: bold;">${results.updated}</p>
                    </div>
                </div>
                
                ${results.skipped > 0 ? `
                    <div style="margin-top: var(--sol-space-lg); background: rgba(0, 122, 255, 0.1); 
                                border: 1px solid rgba(0, 122, 255, 0.3); padding: var(--sol-space-lg); 
                                border-radius: var(--sol-radius-md);">
                        <h4 style="color: #007AFF;">
                            <i class="fas fa-info-circle"></i> 
                            ${results.skipped} tracking già esistenti saltati
                        </h4>
                    </div>
                ` : ''}
                
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
                                    <strong>${err.row.Container || err.row.tracking_number || 'Unknown'}:</strong> ${err.error}
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
                            onclick="ModalSystem.close(this.closest('.sol-modal-overlay').id); 
                                     if(window.loadTrackings) window.loadTrackings();
                                     else location.reload();">
                        OK
                    </button>
                `,
                maxWidth: '600px'
            });
        },
        
        /**
         * Parse date from DD/MM/YYYY format
         */
        parseDate(dateStr) {
            if (!dateStr) return null;
            
            const dateString = String(dateStr).trim();
            
            // Se è già in formato DD/MM/YYYY, ritornalo così
            if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateString)) {
                return dateString;
            }
            
            // Gestisci formato ISO (2025-05-18T22:00:00.000Z)
            if (dateString.includes('T') || dateString.includes('-')) {
                const date = new Date(dateString);
                if (!isNaN(date.getTime())) {
                    // Usa la data UTC per evitare problemi di fuso orario
                    const day = date.getUTCDate().toString().padStart(2, '0');
                    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
                    const year = date.getUTCFullYear();
                    return `${day}/${month}/${year}`;
                }
            }
            
            // Gestisci formato DD/MM/YYYY HH:mm:ss o DD/MM/YYYY, HH:mm
            if (dateString.includes(' ') || dateString.includes(',')) {
                // Rimuovi tutto dopo spazio o virgola
                const datePart = dateString.split(/[\s,]/)[0];
                if (datePart.includes('/')) {
                    const parts = datePart.split('/');
                    if (parts.length === 3) {
                        const day = parts[0].padStart(2, '0');
                        const month = parts[1].padStart(2, '0');
                        const year = parts[2].split(' ')[0]; // Rimuovi eventuale orario residuo
                        return `${day}/${month}/${year}`;
                    }
                }
            }
            
            console.warn('[ImportManager] Could not parse date:', dateStr);
            return dateString; // Ritorna come stringa se non riesce a parsare
        },
        
        /**
         * Download template
         */
        downloadTemplate(type = 'standard') {
            const templates = {
                standard: {
                    filename: 'tracking_import_template.csv',
                    content: `tracking_number,carrier_code,tracking_type,reference,status
MRKU1234567,MAERSK,container,PO123456,In Transit
MSCU7654321,MSC,container,PO123457,Delivered
176-12345678,CV,awb,AWB789012,In Transit
1234567890,DHL,parcel,DHL456789,In consegna`
                },
                
                shipsgo: {
                    filename: 'shipsgo_import_template.csv',
                    content: `Container,Carrier,Status,Reference,Booking,Port Of Loading,Port Of Discharge,Date Of Loading,Date Of Discharge,CO₂ Emission (Tons),Tags
MRKU1234567,MAERSK LINE,In Transit,PO123456,BKG789,SHANGHAI,ROTTERDAM,15/06/2025,30/06/2025,1.5,Urgent
MSCU7654321,MSC,Loaded,INV456789,-,NINGBO,GENOVA,20/06/2025,15/07/2025,2.1,Regular`
                }
            };
            
            const template = templates[type] || templates.standard;
            const blob = new Blob([template.content], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = template.filename;
            link.click();
        }
    };
    
})();