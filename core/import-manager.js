// import-manager.js - Sistema unificato per gestione import
(function() {
    'use strict';
    
    // Configurazione
    const config = {
        batchSize: 50,
        delayBetweenBatches: 500,
        maxErrors: 10,
        supportedFormats: ['.csv', '.xlsx', '.xls']
    };
    
    // Sistema stati completo
    const SYSTEM_STATUSES = {
        spedizione_creata: { class: 'info', text: 'Spedizione Creata', icon: 'fa-file-alt' },
        registered: { class: 'info', text: 'Registrato', icon: 'fa-clock' },
        in_transit: { class: 'warning', text: 'In Transito', icon: 'fa-ship' },
        in_consegna: { class: 'primary', text: 'In Consegna', icon: 'fa-truck' },
        sdoganata: { class: 'info', text: 'Sdoganata', icon: 'fa-stamp' },
        arrivata: { class: 'success', text: 'Arrivata', icon: 'fa-map-marker-alt' },
        scaricato: { class: 'success', text: 'Scaricato', icon: 'fa-download' },
        consegnato: { class: 'success', text: 'Consegnato', icon: 'fa-check-circle' },
        ritardo: { class: 'danger', text: 'In Ritardo', icon: 'fa-exclamation-triangle' },
        eccezione: { class: 'danger', text: 'Eccezione', icon: 'fa-times-circle' }
    };
    
    // Mapping completo stati
    const COMPLETE_STATUS_MAPPING = {
        // ===== STATI MARITTIMI (Container) =====
        'Registered': 'registered',
        'Pending': 'registered',
        'Booked': 'registered',
        'Booking Confirmed': 'registered',
        'Gate In': 'in_transit',
        'Gate Out': 'in_transit',
        'Loaded': 'in_transit',
        'Loaded on Vessel': 'in_transit',
        'In Transit': 'in_transit',
        'Sailing': 'in_transit',
        'Departed': 'in_transit',
        'Transhipment': 'in_transit',
        'In Transshipment': 'in_transit',
        'Arrived': 'arrivata',
        'Discharged': 'scaricato',
        'Discharged from Vessel': 'scaricato',
        'POD': 'arrivata',
        'Delivered': 'consegnato',
        'Empty': 'consegnato',
        'Empty Returned': 'consegnato',
        
        // ===== STATI AEREI (AWB) =====
        'RCS': 'registered',
        'MAN': 'in_transit',
        'DEP': 'in_transit',
        'ARR': 'arrivata',
        'RCF': 'in_transit',
        'DLV': 'consegnato',
        'NFD': 'eccezione',
        'DIS': 'eccezione',
        
        // ===== STATI FEDEX =====
        'Shipment information sent to FedEx': 'spedizione_creata',
        'Picked up': 'in_transit',
        'Left FedEx origin facility': 'in_transit',
        'At destination sort facility': 'in_transit',
        'International shipment release - Import': 'sdoganata',
        'Arrived at FedEx hub': 'in_transit',
        'On the way': 'in_transit',
        'Departed FedEx hub': 'in_transit',
        'At local FedEx facility': 'in_transit',
        'On FedEx vehicle for delivery': 'in_consegna',
        'LA spedizione è stata consegnata': 'consegnato',
        
        // ===== STATI GLS =====
        "La spedizione e' stata creata dal mittente, attendiamo che ci venga affidata per l'invio a destinazione.": 'spedizione_creata',
        'Partita dalla sede mittente. In transito.': 'in_transit',
        'In transito.': 'in_transit',
        'Arrivata nella Sede GLS locale.': 'in_transit',
        'Consegna prevista nel corso della giornata odierna.': 'in_consegna',
        'Consegnata.': 'consegnato',
        
        // ===== STATI GENERICI ITALIANI =====
        'La spedizione è stata consegnata': 'consegnato',
        'La spedizione è in consegna': 'in_consegna',
        'La spedizione è in transito': 'in_transit',
        'Spedizione creata': 'spedizione_creata',
        
        // ===== STATI PROBLEMATICI =====
        'Delayed': 'ritardo',
        'Hold': 'ritardo',
        'Customs Hold': 'ritardo',
        'Exception': 'eccezione',
        'Cancelled': 'eccezione',
        'Refused': 'eccezione',
        'Returned': 'eccezione'
    };
    
    // Mappature standard
    const mappings = {
        carriers: {
            'MAERSK LINE': 'MAERSK',
            'MSC': 'MSC',
            'CMA CGM': 'CMA-CGM',
            'COSCO': 'COSCO',
            'HAPAG-LLOYD': 'HAPAG-LLOYD',
            'ONE': 'ONE',
            'EVERGREEN': 'EVERGREEN',
            'YANG MING': 'YANG-MING',
            'ZIM': 'ZIM',
            'HMM': 'HMM',
            'CARGOLUX': 'CV',
            'FEDEX': 'FX',
            'DHL': 'DHL',
            'UPS': 'UPS',
            'GLS': 'GLS'
        },
        
        status: COMPLETE_STATUS_MAPPING,
        
        types: {
            container: /^[A-Z]{4}\d{7}$/,
            bl: /^[A-Z]{4}\d{8,12}$/,
            awb: /^\d{3}-\d{8}$/,
            parcel: /^[A-Z0-9]{10,30}$/
        }
    };
    
    // Funzione di normalizzazione status
    function normalizeStatus(statusInput) {
        // Prima prova il mapping diretto
        let status = COMPLETE_STATUS_MAPPING[statusInput];
        
        if (!status) {
            // Prova con trim e case insensitive
            const cleanStatus = statusInput.trim();
            status = COMPLETE_STATUS_MAPPING[cleanStatus];
        }
        
        if (!status) {
            // Prova a dedurre dallo status con pattern matching
            const statusLower = statusInput.toLowerCase();
            
            if (statusLower.includes('consegnat') || statusLower.includes('delivered') || statusLower.includes('empty')) {
                status = 'consegnato';
            }
            else if (statusLower.includes('in consegna') || statusLower.includes('for delivery') || statusLower.includes('out for delivery')) {
                status = 'in_consegna';
            }
            else if (statusLower.includes('arrived') || statusLower.includes('arrivat')) {
                status = 'arrivata';
            }
            else if (statusLower.includes('discharged') || statusLower.includes('scaricat')) {
                status = 'scaricato';
            }
            else if (statusLower.includes('sdogan') || statusLower.includes('customs') || statusLower.includes('import')) {
                status = 'sdoganata';
            }
            else if (statusLower.includes('transit') || statusLower.includes('sailing') || statusLower.includes('loaded') || statusLower.includes('on the way')) {
                status = 'in_transit';
            }
            else if (statusLower.includes('creata') || statusLower.includes('created') || statusLower.includes('information sent')) {
                status = 'spedizione_creata';
            }
            else if (statusLower.includes('delay') || statusLower.includes('ritard') || statusLower.includes('hold')) {
                status = 'ritardo';
            }
            else if (statusLower.includes('exception') || statusLower.includes('error') || statusLower.includes('refused') || statusLower.includes('returned')) {
                status = 'eccezione';
            }
            else {
                status = 'registered';
            }
        }
        
        return status;
    }
    
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
                ['Container', 'Carrier', 'Port Of Loading'].includes(h) ||
                ['AWB Number', 'Airline', 'Origin'].includes(h)
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
            // Estrai tracking number
            const trackingNumber = (
                row.tracking_number || 
                row.Container || 
                row['Tracking Number'] || 
                row['AWB Number'] ||
                ''
            ).toUpperCase().trim();
            
            // Rileva tipo
            const trackingType = row.tracking_type || 
                               row.Type || 
                               this.detectTrackingType(trackingNumber);
            
            // Mappa carrier
            const carrierInput = row.carrier_code || 
                               row.Carrier || 
                               row.Airline ||
                               row.carrier || 
                               '';
            const carrierCode = this.mappings.carriers[carrierInput] || 
                              carrierInput;
            
            // Mappa status usando la funzione di normalizzazione
            const statusInput = row.Status || row.status || 'registered';
            const status = normalizeStatus(statusInput);
            
            // Riferimento
            const referenceNumber = row.reference || 
                                  row.Reference || 
                                  row.reference_number || 
                                  null;
            
            return {
                trackingNumber,
                trackingType,
                carrierCode,
                referenceNumber,
                status,
                metadata: this.extractMetadata(row)
            };
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
         * Estrai metadata aggiuntivi con ETA
         */
        extractMetadata(row) {
            const metadata = {};
            const now = new Date();
            
            // ShipsGo Sea specific
            if (row['Port Of Loading']) {
                metadata.pol = row['Port Of Loading'];
                metadata.pod = row['Port Of Discharge'];
                metadata.loading_date = this.parseDate(row['Date Of Loading']);
                metadata.discharge_date = this.parseDate(row['Date Of Discharge']);
                metadata.co2_emissions = parseFloat(row['CO₂ Emission (Tons)']) || null;
                metadata.tags = row.Tags !== '-' ? row.Tags : null;
                
                // Calcola ETA basato su discharge date
                const dischargeDate = this.parseDate(row['Date Of Discharge']);
                const loadingDate = this.parseDate(row['Date Of Loading']);
                
                if (dischargeDate) {
                    const discharge = new Date(dischargeDate);
                    
                    // Se la data di scarico è futura, usa quella come ETA
                    if (discharge > now) {
                        metadata.eta = dischargeDate;
                    } else {
                        // Se lo status è "in_transit", calcola ETA futuro
                        const status = normalizeStatus(row.Status);
                        if (status === 'in_transit' || status === 'registered') {
                            // Aggiungi 7-14 giorni dalla data corrente
                            const futureETA = new Date();
                            futureETA.setDate(futureETA.getDate() + Math.floor(Math.random() * 7) + 7);
                            metadata.eta = futureETA.toISOString();
                        }
                    }
                } else if (loadingDate) {
                    // Se abbiamo solo loading date, stima ETA a 30 giorni
                    const loading = new Date(loadingDate);
                    const estimatedETA = new Date(loading);
                    estimatedETA.setDate(estimatedETA.getDate() + 30);
                    if (estimatedETA > now) {
                        metadata.eta = estimatedETA.toISOString();
                    }
                }
            }
            
            // ShipsGo Air specific
            if (row['AWB Number'] || row['Date Of Arrival']) {
                metadata.origin = row['Origin'];
                metadata.destination = row['Destination'];
                metadata.origin_name = row['Origin Name'];
                metadata.destination_name = row['Destination Name'];
                
                const arrivalDate = this.parseDate(row['Date Of Arrival']);
                const departureDate = this.parseDate(row['Date Of Departure']);
                
                if (arrivalDate) {
                    const arrival = new Date(arrivalDate);
                    
                    // Se la data di arrivo è futura, usa quella come ETA
                    if (arrival > now) {
                        metadata.eta = arrivalDate;
                    } else {
                        // Per voli già arrivati, nessun ETA a meno che non sia in_transit
                        const status = normalizeStatus(row.Status);
                        if (status === 'in_transit') {
                            // Stima ETA per voli in transito
                            const futureETA = new Date();
                            futureETA.setDate(futureETA.getDate() + 2); // 2 giorni per air
                            metadata.eta = futureETA.toISOString();
                        }
                    }
                }
            }
            
            return metadata;
        },
        
        /**
         * Parse data formato ShipsGo
         */
        parseDate(dateStr) {
            if (!dateStr || dateStr === '-') return null;
            
            // Formato DD/MM/YYYY
            const [day, month, year] = dateStr.split(' ')[0].split('/');
            if (!day || !month || !year) return null;
            
            return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`).toISOString();
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
            // Controlla in localStorage
            const savedTrackings = JSON.parse(localStorage.getItem('importedTrackings') || '[]');
            return savedTrackings.some(t => t.tracking_number === trackingNumber);
        },
        
        /**
         * Crea tracking via API
         */
        async createTracking(trackingData, token) {
            // Per sviluppo, salva direttamente in localStorage
            const savedTrackings = JSON.parse(localStorage.getItem('importedTrackings') || '[]');
            
            // Crea oggetto tracking completo
            const newTracking = {
                id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                tracking_number: trackingData.trackingNumber,
                tracking_type: trackingData.trackingType,
                carrier_code: trackingData.carrierCode,
                carrier_name: trackingData.carrierCode,
                reference_number: trackingData.referenceNumber,
                status: trackingData.status,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                metadata: trackingData.metadata || {},
                last_event_date: trackingData.metadata?.loading_date || new Date().toISOString(),
                last_event_location: trackingData.metadata?.pol || 'N/A',
                eta: trackingData.metadata?.eta || null,
                origin_port: trackingData.metadata?.pol || null,
                destination_port: trackingData.metadata?.pod || null
            };
            
            savedTrackings.push(newTracking);
            localStorage.setItem('importedTrackings', JSON.stringify(savedTrackings));
            
            return newTracking;
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
                                    <strong>${err.row.tracking_number || 'Unknown'}:</strong> ${err.error}
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
            
            if (window.showNotification) {
                window.showNotification(`Template ${type} scaricato!`, 'success');
            }
        },
        
        /**
         * Render import UI per modal
         */
        renderImportUI(containerId) {
            const container = document.getElementById(containerId);
            if (!container) return;
            
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <div style="background: #e3f2fd; border-radius: 12px; padding: 2rem; display: inline-block;">
                        <i class="fas fa-ship fa-3x" style="color: #1976d2; margin-bottom: 1rem; display: block;"></i>
                        <h4>Import File ShipsGo</h4>
                        <p>Carica i file Excel esportati da ShipsGo (Mare o Aereo)</p>
                        <input type="file" id="shipsgoFile" accept=".csv,.xlsx,.xls" style="display:none" 
                               onchange="if(this.files[0]) { window.ImportManager.importFile(this.files[0], {type:'shipsgo'}); window.ModalSystem.close(); }">
                        <button class="sol-btn sol-btn-primary" onclick="document.getElementById('shipsgoFile').click()">
                            <i class="fas fa-file-excel"></i> Seleziona File ShipsGo
                        </button>
                    </div>
                </div>
            `;
        }
    };
})();